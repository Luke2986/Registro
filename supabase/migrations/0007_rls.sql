-- 0007 sicurezza a livello di riga
-- Reversibile: sì per il database, no per le regole del progetto.
-- Come si annulla: drop policy clients_owner_all on clients;
--   drop policy people_owner_all on people;
--   drop policy questionnaires_owner_all on questionnaires;
--   drop policy question_blocks_owner_all on question_blocks;
--   drop policy questions_owner_all on questions;
--   drop policy assessments_owner_all on assessments;
--   drop policy answers_owner_all on answers;
--   alter table clients         disable row level security;
--   alter table people          disable row level security;
--   alter table questionnaires  disable row level security;
--   alter table question_blocks disable row level security;
--   alter table questions       disable row level security;
--   alter table assessments     disable row level security;
--   alter table answers         disable row level security;
--   In quest'ordine, e non al contrario: senza policy la sicurezza a livello di riga ancora
--   attiva nega tutto, mentre disattivarla per prima aprirebbe le tabelle per il tempo che
--   resta. Il database accetta entrambe le strade.
-- Cosa si perde: niente di dati. Si perde la protezione delle righe, che AGENTS.md e
--   kb-0.md §3 vietano di disattivare senza eccezioni temporanee. Queste istruzioni
--   stanno scritte perché la domanda «si può tornare indietro» abbia una risposta,
--   non perché siano una strada percorribile.
--
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
