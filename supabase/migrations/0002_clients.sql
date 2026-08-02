-- 0002 clienti
-- name è l'unico campo obbligatorio (D13). Tutto il resto resta vuoto finché non si sa,
-- e null non va mai mostrato come zero.
-- status è descrittivo, non blocca nessuna azione (D14).

create table clients (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  status          text not null default 'potenziale'
                    check (status in ('potenziale','valutato','attivo','chiuso','perso')),
  sector          text,
  website         text,
  city            text,
  province        text,
  address         text,
  source_channel  text,
  revenue         text,           -- testo: "circa due milioni" è una risposta reale
  employees       integer check (employees is null or employees >= 0),
  business_goals  text,
  tags            text[] not null default '{}',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index clients_owner_updated_idx on clients (owner_id, updated_at desc);
create index clients_tags_idx on clients using gin (tags);
create index clients_name_trgm_idx on clients using gin (name extensions.gin_trgm_ops);
