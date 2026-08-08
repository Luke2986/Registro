-- 0011 funzioni di riordino e rinumerazione
-- Reversibile: sì.
-- Come si annulla: drop function move_question(uuid, text);
--   drop function move_block(uuid, text);
--   drop function renumber_questions(uuid);
-- Cosa si perde: niente di dati: le posizioni riscritte restano come sono. Spariscono le
--   tre funzioni, quindi il riordino dall'interfaccia e la rinumerazione dopo la creazione
--   smettono di funzionare: si annulla insieme al codice che le chiama (kb-0.md §10).
--
-- Il riordino vive qui e non nel TypeScript perché PostgREST non offre transazioni: N update
-- in fila da un'azione lasciano posizioni incoerenti a ogni rete caduta a metà, e una funzione
-- plpgsql è una transazione — o il riordino intero riesce, o non succede niente. È il debito
-- dichiarato dalla revisione della 2.2 («la Story 2.5 dovrà riscrivere le posizioni in blocco»).
--
-- security invoker, di proposito: le policy della 0007 filtrano dentro la funzione come in una
-- query diretta, quindi un id altrui indovinato risponde `not found` e nessuna riga si muove.
-- search_path vuoto e nomi qualificati: la funzione non dipende da chi la chiama.
--
-- Lo scambio si fa sull'array ordinato, mai sui valori di position: due righe con la stessa
-- posizione (corsa nota della 2.2/2.3, accettata) scambiate per valore sarebbero un no-op che
-- sembra riuscito. L'ordinamento è la stessa terna della pagina — position, created_at, id —
-- perché la rinumerazione deve fotografare l'ordine che l'utente vede, pareggi compresi.

-- La rinumerazione globale: position torna il numero della domanda nell'intervista intera
-- (database.md §8), 1..N attraverso i blocchi. La chiamano le due move_* e createQuestion
-- dopo l'insert. Riscrive solo le righe la cui posizione cambia: il trigger updated_at della
-- 0006 scatta solo su chi si è mosso davvero.
create function renumber_questions(p_questionnaire_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
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

-- Sposta un blocco di un passo. false = blocco non visibile (non mio o sparito: con la RLS
-- sono la stessa cosa, zero righe); true al bordo senza scrivere niente — il primo in su non
-- è un errore, è un niente-da-fare, e il pulsante spento nell'interfaccia è la prima difesa.
create function move_block(p_block_id uuid, p_direction text)
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
  -- L'interfaccia manda solo questi due valori: altro arriva da SQL o richiesta forgiata.
  if p_direction not in ('up', 'down') then
    raise exception 'move_block: direzione non valida';
  end if;

  select questionnaire_id into v_questionnaire_id
  from public.question_blocks
  where id = p_block_id;

  if not found then
    return false;
  end if;

  select array_agg(id order by position, created_at, id) into v_ids
  from public.question_blocks
  where questionnaire_id = v_questionnaire_id;

  v_index := array_position(v_ids, p_block_id);
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

-- Sposta una domanda di un passo dentro il suo blocco. Il vicino si cerca nell'array del solo
-- blocco: il bordo del blocco è un muro, la prima domanda spostata in su non scavalca mai nel
-- blocco precedente. Le posizioni provvisorie (gli ordinali di blocco) duplicano quelle di
-- altri blocchi per la durata della transazione: invisibile da fuori, nessun vincolo unico
-- esiste (di proposito, dalla 2.2), e updated_at resta coerente perché now() è il timestamp
-- di transazione — due scritture, un solo istante.
create function move_question(p_question_id uuid, p_direction text)
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
  if p_direction not in ('up', 'down') then
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

  select array_agg(id order by position, created_at, id) into v_ids
  from public.questions
  where block_id = v_block_id;

  v_index := array_position(v_ids, p_question_id);
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

-- Supabase concede execute anche ad anon per default: un punto d'ingresso che non serve a
-- nessuno non si lascia aperto. La RLS renderebbe comunque le chiamate anonime dei no-op,
-- ma il rifiuto esplicito (42501) è leggibile, il no-op silenzioso no.
revoke execute on function renumber_questions(uuid) from public, anon;
revoke execute on function move_block(uuid, text) from public, anon;
revoke execute on function move_question(uuid, text) from public, anon;

grant execute on function renumber_questions(uuid) to authenticated;
grant execute on function move_block(uuid, text) to authenticated;
grant execute on function move_question(uuid, text) to authenticated;
