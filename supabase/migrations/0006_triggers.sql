-- 0006 aggiornamento automatico di updated_at
-- Reversibile: sì per i sei trigger, non del tutto per la funzione.
-- Come si annulla: drop trigger clients_set_updated_at on clients;
--   drop trigger people_set_updated_at on people;
--   drop trigger questionnaires_set_updated_at on questionnaires;
--   drop trigger questions_set_updated_at on questions;
--   drop trigger assessments_set_updated_at on assessments;
--   drop trigger answers_set_updated_at on answers;
--   drop function set_updated_at();
--   La funzione è stata creata con create or replace: se una con lo stesso nome fosse
--   esistita prima, la sua definizione non sta in questo file e non si ricostruisce da qui.
-- Cosa si perde: niente di dati. updated_at smette di aggiornarsi da solo, quindi
--   l'ordinamento dell'elenco per ultima attività resta fermo all'ultimo valore scritto.
--
-- Serve anche alle esportazioni future: senza un updated_at affidabile, una sincronizzazione
-- in uscita non sa cosa mandare (D10).

create or replace function set_updated_at() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

create trigger questionnaires_set_updated_at
  before update on questionnaires
  for each row execute function set_updated_at();

create trigger questions_set_updated_at
  before update on questions
  for each row execute function set_updated_at();

create trigger assessments_set_updated_at
  before update on assessments
  for each row execute function set_updated_at();

create trigger answers_set_updated_at
  before update on answers
  for each row execute function set_updated_at();
