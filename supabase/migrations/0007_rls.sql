-- 0007 sicurezza a livello di riga
-- Attiva su tutte le tabelle dal primo giorno, anche con un solo utente (D9).
-- Il giorno che arrivano i collaboratori cambia solo la condizione delle policy,
-- non lo schema.
--
-- (select auth.uid()) invece di auth.uid() nudo: la forma con sottoquery viene valutata
-- una volta per query invece che riga per riga.

alter table clients         enable row level security;
alter table people          enable row level security;
alter table questionnaires  enable row level security;
alter table question_blocks enable row level security;
alter table questions       enable row level security;
alter table assessments     enable row level security;
alter table answers         enable row level security;

create policy clients_owner_all on clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy people_owner_all on people
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy questionnaires_owner_all on questionnaires
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy assessments_owner_all on assessments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy answers_owner_all on answers
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- question_blocks e questions non hanno owner_id proprio: la policy risale al questionario.

create policy question_blocks_owner_all on question_blocks
  for all to authenticated
  using (exists (
    select 1 from questionnaires q
    where q.id = question_blocks.questionnaire_id
      and q.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from questionnaires q
    where q.id = question_blocks.questionnaire_id
      and q.owner_id = (select auth.uid())
  ));

create policy questions_owner_all on questions
  for all to authenticated
  using (exists (
    select 1 from question_blocks b
    join questionnaires q on q.id = b.questionnaire_id
    where b.id = questions.block_id and q.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from question_blocks b
    join questionnaires q on q.id = b.questionnaire_id
    where b.id = questions.block_id and q.owner_id = (select auth.uid())
  ));
