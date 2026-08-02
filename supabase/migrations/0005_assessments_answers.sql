-- 0005 schede di prequalifica e risposte
--
-- total_questions è il denominatore dell'avanzamento (D16) e si scrive una volta sola,
-- alla creazione della scheda: contiene il numero di domande attive in quel momento.
-- Non si aggiorna mai, altrimenti aggiungere una domanda oggi farebbe tornare incomplete
-- le schede chiuse ieri.
--
-- verdict parte da non_deciso e si può cambiare sempre. Nessun vincolo lo lega a
-- completion_status: una scheda si può chiudere senza verdetto, perché decide la persona
-- e il software non blocca (D14).

create table assessments (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users (id) on delete cascade,
  client_id             uuid not null references clients (id) on delete cascade,
  questionnaire_id      uuid references questionnaires (id) on delete set null,
  questionnaire_version integer,
  call_date             date not null default current_date,
  interviewee_id        uuid references people (id) on delete set null,
  total_questions       integer not null default 0,
  verdict               text not null default 'non_deciso'
                          check (verdict in ('si','si_condizionato','no','non_deciso')),
  verdict_reason        text,
  condition_text        text,
  verify_by             date,
  next_step             text,
  completion_status     text not null default 'bozza'
                          check (completion_status in ('bozza','chiusa')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index assessments_client_date_idx on assessments (client_id, call_date desc);

-- question_text e block_title sono copie, non riferimenti: è la scelta centrale dello schema.
-- Costano una colonna di testo per riga ed eliminano un'intera categoria di problemi -
-- nessuna migrazione quando il questionario cambia, nessuna risposta orfana, nessun sistema
-- di versioni da mantenere. question_id resta come collegamento finché la domanda esiste e
-- diventa null se viene eliminata, senza portarsi via la risposta.
create table answers (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users (id) on delete cascade,
  assessment_id         uuid not null references assessments (id) on delete cascade,
  question_id           uuid references questions (id) on delete set null,
  question_text         text not null,
  block_title           text not null,
  position              integer not null,
  content               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index answers_assessment_question_idx
  on answers (assessment_id, question_id) where question_id is not null;
create index answers_assessment_position_idx on answers (assessment_id, position);
