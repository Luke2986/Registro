-- 0012 guardie di riordino: direzione null, lock consultivo, riga sparita
-- Reversibile: sì.
-- Come si annulla: eseguire di nuovo le tre `create or replace function` della
--   0011_reorder_functions.sql, che contiene i corpi precedenti per esteso.
-- Cosa si perde: niente di dati. Tornano i tre difetti chiusi qui: la direzione null
--   che sposta in giù senza eccezione, due riordini in volo che si mescolano, e
--   l'eccezione da subscript null quando una riga sparisce fra le due letture.
--
-- Tre correzioni dalla revisione della Story 2.5, stessa forma e stesse garanzie
-- della 0011 (security invoker, search_path vuoto, scambio sull'array):
--
-- 1. `not in ('up','down')` con null vale null e l'eccezione non scatta: una rpc
--    forgiata con p_direction null spostava in giù, in silenzio. `is distinct from`
--    tratta null come qualsiasi altro valore non valido.
-- 2. Nessun lock: due riordini in volo sullo stesso questionario leggevano lo stesso
--    stato e scrivevano permutazioni fuse — mossa persa o posizioni duplicate, e per
--    i blocchi nessuna rinumerazione d'ufficio le avrebbe sanate. Il lock consultivo
--    di transazione sul questionario serializza ogni scrittura di posizione: è
--    rientrante (move_* e la renumber chiamata dentro lo prendono due volte senza
--    danno) e si rilascia da solo al commit o al rollback. Sta anche in
--    renumber_questions perché createQuestion la chiama da sola, fuori dalle move_*.
-- 3. Se la riga sparisce fra la select e l'array_agg (solo da SQL: nessun percorso
--    di cancellazione esiste), array_position risponde null, il confine di bordo con
--    null non scatta e v_ids[null] alza «array subscript must not be null». Ora
--    `v_index is null` è lo stesso false di «non mio o sparito».
--
-- `create or replace` conserva proprietario e permessi: il revoke/grant della 0011
-- (execute negato a public e anon, concesso ad authenticated) resta e non si ripete.

create or replace function renumber_questions(p_questionnaire_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Serializza con le move_*: anche la rinumerazione chiamata da sola (createQuestion)
  -- si mette in coda invece di intrecciarsi con uno spostamento in volo.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_questionnaire_id::text, 0));

  update public.questions q
  set position = o.rn
  from (
    select q2.id,
           row_number() over (
             order by b.position, b.created_at, b.id,
                      q2.position, q2.created_at, q2.id
           ) as rn
    from public.questions q2
    join public.question_blocks b on b.id = q2.block_id
    where b.questionnaire_id = p_questionnaire_id
  ) o
  where q.id = o.id and q.position <> o.rn;
end $$;

create or replace function move_block(p_block_id uuid, p_direction text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_questionnaire_id uuid;
  v_ids uuid[];
  v_index integer;
  v_neighbor integer;
begin
  -- is distinct from: anche null è «altro», e l'eccezione scatta (correzione 1).
  if p_direction is distinct from 'up' and p_direction is distinct from 'down' then
    raise exception 'move_block: direzione non valida';
  end if;

  select questionnaire_id into v_questionnaire_id
  from public.question_blocks
  where id = p_block_id;

  if not found then
    return false;
  end if;

  -- Prima di leggere l'array: da qui al commit nessun altro riordino dello stesso
  -- questionario legge o scrive (correzione 2).
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  select array_agg(id order by position, created_at, id) into v_ids
  from public.question_blocks
  where questionnaire_id = v_questionnaire_id;

  v_index := array_position(v_ids, p_block_id);

  -- Riga sparita fra le due letture: come «non mio o sparito» (correzione 3).
  if v_index is null then
    return false;
  end if;

  v_neighbor := v_index + case when p_direction = 'up' then -1 else 1 end;

  if v_neighbor < 1 or v_neighbor > array_length(v_ids, 1) then
    return true;
  end if;

  v_ids[v_index] := v_ids[v_neighbor];
  v_ids[v_neighbor] := p_block_id;

  update public.question_blocks b
  set position = t.ord
  from unnest(v_ids) with ordinality as t(id, ord)
  where b.id = t.id and b.position <> t.ord;

  -- Spostare un blocco sposta i numeri d'intervista delle sue domande.
  perform public.renumber_questions(v_questionnaire_id);

  return true;
end $$;

create or replace function move_question(p_question_id uuid, p_direction text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_block_id uuid;
  v_questionnaire_id uuid;
  v_ids uuid[];
  v_index integer;
  v_neighbor integer;
begin
  if p_direction is distinct from 'up' and p_direction is distinct from 'down' then
    raise exception 'move_question: direzione non valida';
  end if;

  select q.block_id, b.questionnaire_id
  into v_block_id, v_questionnaire_id
  from public.questions q
  join public.question_blocks b on b.id = q.block_id
  where q.id = p_question_id;

  if not found then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  select array_agg(id order by position, created_at, id) into v_ids
  from public.questions
  where block_id = v_block_id;

  v_index := array_position(v_ids, p_question_id);

  if v_index is null then
    return false;
  end if;

  v_neighbor := v_index + case when p_direction = 'up' then -1 else 1 end;

  if v_neighbor < 1 or v_neighbor > array_length(v_ids, 1) then
    return true;
  end if;

  v_ids[v_index] := v_ids[v_neighbor];
  v_ids[v_neighbor] := p_question_id;

  update public.questions q
  set position = t.ord
  from unnest(v_ids) with ordinality as t(id, ord)
  where q.id = t.id and q.position <> t.ord;

  perform public.renumber_questions(v_questionnaire_id);

  return true;
end $$;
