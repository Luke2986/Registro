-- 0006 aggiornamento automatico di updated_at
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
