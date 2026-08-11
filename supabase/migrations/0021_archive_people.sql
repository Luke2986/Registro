-- 0021 il cestino copre anche le persone, che erano l'ultima cancellazione senza ritorno
-- Reversibile: sì nella struttura, no nei dati.
-- Come si annulla: drop function delete_person(uuid);
--   rieseguire la `create or replace function restore_row` della 0019_archive_row_reads.sql,
--   che contiene il corpo precedente per esteso;
--   delete from archived_rows where source_table = 'people';
--   alter table archived_rows drop constraint archived_rows_source_table_check;
--   alter table archived_rows add constraint archived_rows_source_table_check
--     check (source_table in ('questions', 'question_blocks'));
-- Cosa si perde: le persone che stanno nel cestino al momento dell'annullamento, che il
--   `delete` qui sopra toglie — senza, il vincolo rifiuterebbe di tornare stretto. Le persone
--   vive non si toccano.
--
-- La 0018 ha coperto il questionario e ha lasciato fuori `deletePerson`, che era e resta l'unica
-- cancellazione irreversibile del software. `people` è anche la tabella con i dati personali di
-- persone fisiche, quindi è quella in cui un `Elimina` premuto per sbaglio costa di più.
--
-- **Perché qui non c'è `in_use`, e per la domanda sì.** Una domanda dentro una scheda si rifiuta
-- di cancellare perché ha una via d'uscita migliore, `Disattiva`, e perché il ripristino non
-- ricucirebbe `answers.question_id`. Una persona non ha nessun `Disattiva`: rifiutare vorrebbe
-- dire che una persona sbagliata, una volta usata come interlocutore, resta lì per sempre. Quindi
-- si archivia e si cancella, e il legame che `assessments.interviewee_id` perde in `set null` si
-- ricuce al ritorno — perché qui, a differenza delle risposte, **si sa quali righe rimettere a
-- posto**: sono poche, sono quelle di quel cliente, e si scrivono nel cestino insieme alla riga.
--
-- Dove si scrivono: dentro `payload`, sotto la chiave `interviewee_of`, che non è una colonna di
-- `people`. Regge perché `jsonb_populate_record` scarta le chiavi che non trovano una colonna —
-- comportamento documentato di Postgres, verificato su questo database prima di scriverlo qui —
-- quindi il ripristino continua a leggere il payload come se fosse solo `to_jsonb(riga)`.
-- Una colonna in più su `archived_rows` sarebbe stata l'alternativa, nulla per due sorgenti su
-- tre; questa tiene la tabella com'è e costa una riga di documentazione, che è §3 di database.md.

alter table archived_rows drop constraint archived_rows_source_table_check;

alter table archived_rows
  add constraint archived_rows_source_table_check
  check (source_table in ('questions', 'question_blocks', 'people'));

-- `label` è il nome della persona, e può venire vuoto: nessun campo di `people` è obbligatorio
-- tranne il cliente (D13). Resta vuoto invece di ricevere qui un «Persona senza nome»: quella è
-- una parola dell'interfaccia, e nel database sarebbe l'unica riga italiana rivolta a chi legge
-- lo schermo. Il ripiego lo mette la pagina, dove sta già per l'elenco delle persone.
create function delete_person(p_person_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.people;
  v_interviewee_of uuid[];
begin
  select * into v_row from public.people where id = p_person_id;

  if not found then
    return 'gone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_row.client_id::text, 0));

  -- Prima della cancellazione, o non c'è più niente da leggere: la chiave esterna cade in
  -- `set null` e le schede dimenticano chi hanno intervistato nello stesso istante.
  select pg_catalog.array_agg(id)
  into v_interviewee_of
  from public.assessments
  where interviewee_id = p_person_id;

  insert into public.archived_rows (owner_id, source_table, row_id, label, parent_id, payload)
  values (
    v_row.owner_id,
    'people',
    v_row.id,
    pg_catalog.btrim(pg_catalog.concat_ws(' ', v_row.first_name, v_row.last_name)),
    v_row.client_id,
    pg_catalog.to_jsonb(v_row)
      || pg_catalog.jsonb_build_object(
           'interviewee_of',
           pg_catalog.to_jsonb(coalesce(v_interviewee_of, '{}'::uuid[]))
         )
  );

  delete from public.people where id = p_person_id;

  if not found then
    return 'gone';
  end if;

  return 'deleted';
end $$;

-- Il terzo ramo del ritorno. I due del questionario non si toccano: sono qui perché
-- `create or replace` riscrive la funzione intera.
create or replace function restore_row(p_archive_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_archive public.archived_rows;
  v_questionnaire_id uuid;
  v_person public.people;
  v_interviewee_of uuid[];
begin
  select * into v_archive from public.archived_rows where id = p_archive_id;

  if not found then
    return 'gone';
  end if;

  if v_archive.source_table = 'people' then
    if not exists (select 1 from public.clients where id = v_archive.parent_id) then
      return 'parent_gone';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_archive.parent_id::text, 0));

    v_person := pg_catalog.jsonb_populate_record(null::public.people, v_archive.payload);

    -- `people_one_primary_per_client_idx` ammette un solo contatto principale per cliente: se nel
    -- frattempo ne è stato segnato un altro, la persona torna senza il contrassegno invece di far
    -- fallire il ripristino con una violazione di indice unico, che a schermo sarebbe illeggibile.
    -- È la stessa scelta del blocco che torna in fondo quando la sua posizione è occupata: il
    -- ritorno non ha titolo di disfare quello che è stato deciso mentre la riga non c'era.
    if v_person.is_primary and exists (
      select 1 from public.people where client_id = v_archive.parent_id and is_primary
    ) then
      v_person.is_primary := false;
    end if;

    insert into public.people select (v_person).*;

    -- Solo le schede rimaste senza interlocutore: se una ne ha ricevuto un altro mentre questa
    -- persona era nel cestino, quella è una scelta più recente e il ripristino non la rovescia.
    select pg_catalog.array_agg(value::uuid)
    into v_interviewee_of
    from pg_catalog.jsonb_array_elements_text(
      coalesce(v_archive.payload -> 'interviewee_of', '[]'::jsonb)
    ) as t(value);

    if v_interviewee_of is not null then
      update public.assessments
      set interviewee_id = v_person.id
      where id = any(v_interviewee_of) and interviewee_id is null;
    end if;

    delete from public.archived_rows where id = p_archive_id;

    return 'restored';
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

revoke execute on function delete_person(uuid) from public, anon;
grant execute on function delete_person(uuid) to authenticated;

-- `create or replace` conserva proprietario e permessi: il revoke/grant della 0018 su
-- `restore_row` resta e non si ripete.
