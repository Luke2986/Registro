-- 0003 persone
-- L'azienda è il contenitore, le persone sono voci sotto, anche quando ce n'è una sola (D13).
-- decision_roles è multiplo perché in una piccola impresa la stessa persona è tutte le cose
-- insieme. Il check con <@ verifica l'appartenenza all'insieme ammesso senza usare un enum.

create table people (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  client_id       uuid not null references clients (id) on delete cascade,
  first_name      text,
  last_name       text,
  job_title       text,
  decision_roles  text[] not null default '{}'
                    check (decision_roles <@ array['ha_il_problema','decide','puo_bloccare','referente_operativo','interlocutore']::text[]),
  email           text,
  phone           text,
  is_primary      boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index people_client_idx on people (client_id);

-- Un solo contatto principale per cliente: quando se ne segna un altro,
-- l'applicazione toglie prima il precedente.
create unique index people_one_primary_per_client_idx
  on people (client_id) where is_primary;
