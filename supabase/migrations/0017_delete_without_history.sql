-- 0017 cancellare una domanda o un blocco quando non c'è storia da perdere
-- Reversibile: sì.
-- Come si annulla: drop function delete_question(uuid);
--   drop function delete_block(uuid);
-- Cosa si perde: niente di dati. Torna la sola disattivazione, quindi si annulla insieme
--   al codice che le chiama (kb-0.md §10).
--
-- `prd-v1.md` §4 dice «nessuna cancellazione fisica: si disattiva», e la regola esiste per
-- proteggere le schede vecchie: cancellare una domanda che una scheda contiene toglierebbe la
-- domanda a cui una risposta risponde. Una domanda che nessuna scheda ha mai contenuto non ha
-- niente da proteggere, e restava in un questionario che si legge tutte le volte. Da qui la
-- regola di queste due funzioni: si cancella solo dove la storia non c'è.
--
-- Perché due funzioni e non due delete da PostgREST, che sarebbero due righe: il database non
-- può rifiutare da solo né l'una né l'altra cancellazione, e un controllo letto prima e
-- cancellato dopo lascia in mezzo una finestra.
--   * `questions.block_id references question_blocks on delete cascade`: un delete sul blocco
--     si porta via le sue domande in silenzio, e una domanda creata nella finestra sparirebbe.
--   * `answers.question_id ... on delete set null`: un delete sulla domanda usata non fallisce,
--     scioglie il legame e basta.
-- È la stessa classe di problema della 0011 — PostgREST non offre transazioni — quindi stessa
-- risposta e stessa forma: security invoker, così le policy della 0007 filtrano dentro come
-- fuori; search_path vuoto e nomi qualificati; lock consultivo sul questionario, lo stesso
-- della 0012, così una cancellazione e un riordino in volo si mettono in coda.
--
-- Tre esiti e non un booleano: `in_use` non è un guasto e non è «non trovato», è la risposta
-- che l'interfaccia deve saper dire con parole sue.

-- `in_use` guarda `answers`, non `answers` con contenuto: una scheda aperta e mai compilata ha
-- comunque congelato la domanda nel proprio elenco, e quello è già storia.
--
-- Sopravvive una finestra, e la sua conseguenza è dichiarata invece che chiusa: una scheda
-- aperta fra il controllo e il delete inserisce la sua riga in `answers`, il delete si mette in
-- coda sul lock di chiave della riga nuova, e al commit la porta a `question_id` null. La
-- risposta resta leggibile con la sua copia del testo, che è lo stato che `database.md` §3
-- descrive già come previsto. `open_assessment` non prende il lock consultivo (0014), quindi
-- non è chiudibile da qui.
create function delete_question(p_question_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_questionnaire_id uuid;
begin
  select b.questionnaire_id into v_questionnaire_id
  from public.questions q
  join public.question_blocks b on b.id = q.block_id
  where q.id = p_question_id;

  -- Non mia o sparita: con la RLS sono la stessa cosa, zero righe.
  if not found then
    return 'gone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  if exists (select 1 from public.answers where question_id = p_question_id) then
    return 'in_use';
  end if;

  delete from public.questions where id = p_question_id;

  if not found then
    return 'gone';
  end if;

  -- Il numero d'intervista lascerebbe un buco: 1..N torna consecutivo (database.md §8).
  perform public.renumber_questions(v_questionnaire_id);

  return 'deleted';
end $$;

-- `in_use` per il blocco è «ha ancora domande», attive o spente: il blocco non porta dati suoi,
-- porta le domande, e svuotarlo è il passo che si fa prima. Niente `renumber_questions`: un
-- blocco cancellabile è vuoto per definizione, e togliere zero domande non muove nessun numero
-- d'intervista. Le posizioni dei blocchi invece sì, e si riscrivono qui con lo stesso ordine
-- della 0011 — position, created_at, id — toccando solo le righe che cambiano.
create function delete_block(p_block_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_questionnaire_id uuid;
begin
  select questionnaire_id into v_questionnaire_id
  from public.question_blocks
  where id = p_block_id;

  if not found then
    return 'gone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  if exists (select 1 from public.questions where block_id = p_block_id) then
    return 'in_use';
  end if;

  delete from public.question_blocks where id = p_block_id;

  if not found then
    return 'gone';
  end if;

  update public.question_blocks b
  set position = o.rn
  from (
    select id,
           row_number() over (order by position, created_at, id) as rn
    from public.question_blocks
    where questionnaire_id = v_questionnaire_id
  ) o
  where b.id = o.id and b.position <> o.rn;

  return 'deleted';
end $$;

-- Come per le tre della 0011: un punto d'ingresso che non serve a nessuno non si lascia aperto.
revoke execute on function delete_question(uuid) from public, anon;
revoke execute on function delete_block(uuid) from public, anon;

grant execute on function delete_question(uuid) to authenticated;
grant execute on function delete_block(uuid) to authenticated;
