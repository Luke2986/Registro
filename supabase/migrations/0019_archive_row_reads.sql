-- 0019 le tre letture di riga intera della 0018, scritte nella forma che funziona
-- Reversibile: sì.
-- Come si annulla: rieseguire le tre `create function` della 0018_archive.sql, che contiene
--   i corpi precedenti per esteso. Le funzioni tornano a fallire come descritto qui sotto.
-- Cosa si perde: niente. Nessun dato, nessuna struttura: cambiano tre corpi di funzione.
--
-- La 0018 leggeva la riga da archiviare con `select q into v_row … from questions q`. Sbagliato,
-- e in un modo che nessuna lettura del codice avrebbe fermato: con una variabile di tipo tabella
-- plpgsql pretende che la lista del select abbia **una colonna per campo**, quindi la riga composta
-- finiva tutta nel primo campo e usciva `invalid input syntax for type uuid`. La forma giusta è
-- `select * into v_row`, cioè quella di sempre.
--
-- Vale la pena scrivere anche l'errore precedente, perché le due forme sbagliate si somigliano e
-- chi correggesse la seconda rischia di tornare sulla prima: `select b.questionnaire_id, q.owner_id,
-- q.* into scalare, scalare, v_row` risponde «"v_row" is not a scalar variable», perché un `into`
-- con più bersagli li vuole tutti scalari. Da lì le due letture separate della 0018, che restano:
-- l'errore non era dividerle, era come si leggeva la riga.
--
-- Solo i corpi: tabella, indice e policy della 0018 sono corretti e non si toccano.

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
  select * into v_row from public.questions where id = p_question_id;

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
  select * into v_row from public.question_blocks where id = p_block_id;

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

create or replace function restore_row(p_archive_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_archive public.archived_rows;
  v_questionnaire_id uuid;
begin
  select * into v_archive from public.archived_rows where id = p_archive_id;

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

-- `create or replace` conserva proprietario e permessi: il revoke/grant della 0018 su
-- `restore_row` resta e non si ripete.
