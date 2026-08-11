-- 0018 il cestino: quello che si cancella si archivia, e si può ripristinare
-- Reversibile: sì nella struttura, no nei dati.
-- Come si annulla: drop function restore_row(uuid);
--   drop table archived_rows;
--   poi rieseguire le due `create function` della 0017_delete_without_history.sql, che
--   contiene i corpi precedenti per esteso.
-- Cosa si perde: tutto quello che sta nel cestino al momento dell'annullamento, cioè le
--   righe cancellate e non ancora ripristinate. Quelle vive non si toccano.
--
-- La 0017 cancellava per davvero dove non c'era storia da perdere. Regola giusta e insufficiente:
-- «non c'è storia» vale per il database, non per chi ha appena premuto il pulsante sbagliato.
-- `masterplan.md` §5 lo dice come principio — «niente si cancella davvero» — e questa migrazione
-- lo applica al solo posto del software che cancellava.
--
-- Una tabella sola con un `jsonb` invece di due tabelle gemelle di `questions` e
-- `question_blocks`: due copie di uno schema divergono alla prima colonna aggiunta, e una colonna
-- aggiunta a `questions` e dimenticata nella sua copia sarebbe un dato perso proprio nel punto che
-- esiste per non perdere niente. Il `jsonb` è `to_jsonb(riga)`, quindi si adegua da solo.
--
-- **Le due funzioni della 0017 restano com'erano nella sostanza**, `in_use` compreso: una domanda
-- già dentro una scheda continua a non potersi cancellare, e non perché sia irrecuperabile ma
-- perché ripristinarla non ricucirebbe il legame — `answers.question_id` cade in `set null` alla
-- cancellazione, e nessun ripristino sa quali righe rimettere a posto. Il cestino è la rete per
-- l'errore di chi scrive il questionario, non un permesso di toccare le schede dei clienti.

create table archived_rows (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null,
  source_table  text not null check (source_table in ('questions', 'question_blocks')),
  row_id        uuid not null,
  -- Come si riconosce nel cestino: il testo della domanda o il titolo del blocco. Copiato e non
  -- letto dal payload, così l'elenco si rende senza aprire il jsonb riga per riga.
  label         text not null,
  -- Dove torna: il blocco per una domanda, il questionario per un blocco. Se non esiste più, il
  -- ripristino lo dice invece di fallire con una violazione di chiave esterna.
  parent_id     uuid not null,
  payload       jsonb not null,
  archived_at   timestamptz not null default now()
);

create index archived_rows_owner_idx on archived_rows (owner_id, archived_at desc);

alter table archived_rows enable row level security;

create policy archived_rows_owner_all on archived_rows
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- `owner_id` proprio e non risalito al questionario come per `questions`: la riga di origine può
-- non esistere più — è il punto della tabella — quindi il proprietario va scritto qui, o dopo la
-- cancellazione la policy non avrebbe più niente da cui risalire.

create or replace function delete_question(p_question_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_questionnaire_id uuid;
  v_owner_id uuid;
  v_row public.questions;
begin
  -- Due letture e non una: in plpgsql un `into` con più bersagli li vuole tutti scalari, quindi
  -- la riga intera dev'essere l'unico bersaglio del suo. `q` e non `q.*` per la stessa ragione,
  -- dall'altro lato — il solo nome rende la riga come valore composto.
  select q into v_row from public.questions q where q.id = p_question_id;

  if not found then
    return 'gone';
  end if;

  select b.questionnaire_id, qn.owner_id
  into v_questionnaire_id, v_owner_id
  from public.question_blocks b
  join public.questionnaires qn on qn.id = b.questionnaire_id
  where b.id = v_row.block_id;

  if not found then
    return 'gone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  if exists (select 1 from public.answers where question_id = p_question_id) then
    return 'in_use';
  end if;

  insert into public.archived_rows (owner_id, source_table, row_id, label, parent_id, payload)
  values (v_owner_id, 'questions', v_row.id, v_row.text, v_row.block_id, pg_catalog.to_jsonb(v_row));

  delete from public.questions where id = p_question_id;

  if not found then
    return 'gone';
  end if;

  perform public.renumber_questions(v_questionnaire_id);

  return 'deleted';
end $$;

create or replace function delete_block(p_block_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_questionnaire_id uuid;
  v_owner_id uuid;
  v_row public.question_blocks;
begin
  select b into v_row from public.question_blocks b where b.id = p_block_id;

  if not found then
    return 'gone';
  end if;

  v_questionnaire_id := v_row.questionnaire_id;

  select owner_id into v_owner_id
  from public.questionnaires
  where id = v_questionnaire_id;

  if not found then
    return 'gone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  if exists (select 1 from public.questions where block_id = p_block_id) then
    return 'in_use';
  end if;

  insert into public.archived_rows (owner_id, source_table, row_id, label, parent_id, payload)
  values (v_owner_id, 'question_blocks', v_row.id, v_row.title, v_row.questionnaire_id, pg_catalog.to_jsonb(v_row));

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

-- Il ritorno: la riga si rimette dov'era, con il suo id. Lo stesso id e non uno nuovo perché è
-- l'unica forma in cui un ripristino è un ritorno e non una copia — e perché `answers.question_id`
-- di una scheda futura punterebbe comunque a quello.
--
-- `parent_gone` è il caso che il cestino non può risolvere da solo: una domanda il cui blocco è
-- stato cancellato dopo di lei. Si ripristina prima il blocco, e la frase dell'interfaccia lo
-- dice. Senza questo ramo sarebbe una violazione di chiave esterna, cioè un errore illeggibile.
create function restore_row(p_archive_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_archive public.archived_rows;
  v_questionnaire_id uuid;
begin
  select a into v_archive from public.archived_rows a where a.id = p_archive_id;

  if not found then
    return 'gone';
  end if;

  if v_archive.source_table = 'questions' then
    select b.questionnaire_id into v_questionnaire_id
    from public.question_blocks b
    where b.id = v_archive.parent_id;

    if not found then
      return 'parent_gone';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

    insert into public.questions
    select * from pg_catalog.jsonb_populate_record(null::public.questions, v_archive.payload);

    delete from public.archived_rows where id = p_archive_id;

    perform public.renumber_questions(v_questionnaire_id);

    return 'restored';
  end if;

  if not exists (select 1 from public.questionnaires where id = v_archive.parent_id) then
    return 'parent_gone';
  end if;

  v_questionnaire_id := v_archive.parent_id;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_questionnaire_id::text, 0));

  insert into public.question_blocks
  select * from pg_catalog.jsonb_populate_record(null::public.question_blocks, v_archive.payload);

  delete from public.archived_rows where id = p_archive_id;

  -- Il blocco torna in fondo se la sua posizione è già occupata: la rinumerazione la sistema,
  -- e `Sposta su` lo rimette dove serve. Rimetterlo esattamente dov'era vorrebbe dire spingere
  -- giù tutti gli altri, che è una decisione che il ripristino non ha titolo di prendere.
  update public.question_blocks b
  set position = o.rn
  from (
    select id,
           row_number() over (order by position, created_at, id) as rn
    from public.question_blocks
    where questionnaire_id = v_questionnaire_id
  ) o
  where b.id = o.id and b.position <> o.rn;

  return 'restored';
end $$;

revoke execute on function restore_row(uuid) from public, anon;
grant execute on function restore_row(uuid) to authenticated;
