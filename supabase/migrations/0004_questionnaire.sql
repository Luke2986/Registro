-- 0004 questionario
-- Le domande sono dati, non codice: si modificano dall'interfaccia e non richiedono un rilascio.
-- version cresce quando cambia la struttura ed è informativo: la ricostruzione di una scheda
-- vecchia avviene tramite le copie salvate nelle risposte, non da qui.
-- Le domande non si cancellano, si disattivano: una domanda disattivata sparisce dalle schede
-- nuove e resta in quelle vecchie.

create table questionnaires (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Prequalifica',
  version     integer not null default 1,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table question_blocks (
  id                uuid primary key default gen_random_uuid(),
  questionnaire_id  uuid not null references questionnaires (id) on delete cascade,
  title             text not null,
  position          integer not null,
  created_at        timestamptz not null default now()
);

create table questions (
  id           uuid primary key default gen_random_uuid(),
  block_id     uuid not null references question_blocks (id) on delete cascade,
  text         text not null,
  help_text    text,                       -- il "cosa serve capire"
  answer_type  text not null default 'testo_lungo'
                 check (answer_type in ('testo_lungo','testo_breve','numero','scelta_singola')),
  options      text[],                     -- valorizzato solo per scelta_singola
  position     integer not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index question_blocks_questionnaire_position_idx
  on question_blocks (questionnaire_id, position);
create index questions_block_position_idx on questions (block_id, position);
