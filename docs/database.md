# Schema dati, prima versione

**Riferimenti:** `prd-v1.md`, `masterplan.md`, `00-contesto-e-decisioni.md`
**Database:** PostgreSQL. Vale per tutte e tre le strade (Supabase, Lovable Cloud, Postgres di Replit servito da Neon).
**Versione del documento:** 1, 2 agosto 2026

Le tabelle, i vincoli e le relazioni sono identici ovunque. Cambia solo il modo di proteggere l'accesso alle righe: la sezione 6 contiene le due varianti.

---

## 1. Principi dello schema

- **Chiavi `uuid`**, mai interi progressivi: servono anche a rendere stabili gli identificatori verso l'esterno quando arriveranno le esportazioni (D10).
- **`owner_id` su ogni tabella** dal primo giorno, anche con un solo utente (D9). È la colonna che rende l'aggiunta di collaboratori una migrazione da un pomeriggio invece che una riscrittura.
- **Nessun tipo `enum` di Postgres**: valori vincolati con `check`. Gli enum nativi sono scomodi da modificare, e qui i valori cambieranno.
- **`timestamptz` sempre**, mai `timestamp` senza fuso.
- **Niente cancellazioni fisiche dove c'è storia**: le domande si disattivano, non si eliminano.
- **Nessun vincolo che blocchi un'azione dell'utente** (D14): lo schema non impedisce di aprire una scheda, cambiare un verdetto o saltare tutte le domande.

---

## 2. Diagramma delle relazioni

```
clients ──┬── people
          ├── assessments ── answers ──┐
          └── (tags: array sulla riga)  │
                                        │
questionnaires ── question_blocks ── questions
                                        │
                    (answers.question_id, cancellabile senza perdere la risposta)
```

Il legame fra `answers` e `questions` è debole di proposito: la risposta conserva una copia del testo della domanda, quindi resta leggibile anche se la domanda cambia o sparisce.

---

## 3. Tabelle

### clients

```sql
create table clients (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
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
create index clients_name_trgm_idx on clients using gin (name gin_trgm_ops);
```

`name` è l'unico campo obbligatorio (D13). Tutto il resto resta vuoto finché non si sa, e `null` non va mai mostrato come zero.

**Sui tag:** array di testo invece di due tabelle collegate. Il compromesso è consapevole: si perde la possibilità di rinominare un tag ovunque con una sola operazione, si guadagna metà della complessità. Con un utente solo conviene. I suggerimenti dell'interfaccia si ricavano così:

```sql
select distinct unnest(tags) as tag from clients where owner_id = $1 order by 1;
```

La normalizzazione in minuscolo si fa prima di scrivere, lato applicazione.

**Estensioni richieste:** `pgcrypto` o `pg_catalog` per `gen_random_uuid()` (già attive su Supabase), e `pg_trgm` per la ricerca sul nome. Se `pg_trgm` non è disponibile, si toglie quell'indice e la ricerca usa `ilike`.

### people

```sql
create table people (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  client_id       uuid not null references clients(id) on delete cascade,
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
create unique index people_one_primary_per_client_idx
  on people (client_id) where is_primary;
```

`decision_roles` è multiplo perché in una piccola impresa la stessa persona è tutte le cose insieme (D13). Il `check` con `<@` verifica che ogni valore appartenga all'insieme ammesso, senza usare un tipo enum.

L'indice unico parziale garantisce un solo contatto principale per cliente: quando se ne segna un altro, l'applicazione toglie prima il precedente.

### questionnaires, question_blocks, questions

```sql
create table questionnaires (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  name        text not null default 'Prequalifica',
  version     integer not null default 1,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table question_blocks (
  id                uuid primary key default gen_random_uuid(),
  questionnaire_id  uuid not null references questionnaires(id) on delete cascade,
  title             text not null check (length(trim(title)) > 0),  -- 0008, con la scrittura dei blocchi
  position          integer not null,
  created_at        timestamptz not null default now()
);

create table questions (
  id           uuid primary key default gen_random_uuid(),
  block_id     uuid not null references question_blocks(id) on delete cascade,
  text         text not null,
  help_text    text,                       -- il "cosa serve capire"
  answer_type  text not null default 'testo_lungo'
                 check (answer_type in ('testo_lungo','testo_breve','numero','scelta_singola')),
  options      text[],                     -- valorizzato solo per scelta_singola
  position     integer not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- 0009, con la scrittura delle domande
  constraint questions_text_not_blank check (length(trim(text)) > 0),
  -- Una direzione sola, di proposito: rifiuta la scelta singola senza opzioni, non le opzioni
  -- su un tipo che non le usa — quella metà appartiene alla Story 2.4, che decide cosa succede
  -- riscrivendo il tipo. Il coalesce perché array_length su un array vuoto risponde null.
  constraint questions_single_choice_has_options
    check (answer_type <> 'scelta_singola' or coalesce(array_length(options, 1), 0) > 0)
);

create index questions_block_position_idx on questions (block_id, position);
```

`version` cresce quando si modifica la struttura, ed è informativo: non serve a ricostruire nulla, perché la ricostruzione avviene tramite le copie salvate nelle risposte.

Dalla Story 2.2 (7 agosto 2026) esistono le prime scritture sui blocchi, e **nessuna fa crescere `version`**: la decisione su che cosa conti come modifica strutturale è rimandata alla fine dell'Epic 2, quando esistono tutte e cinque le scritture e si decide una volta sola. Farla crescere a ogni story sarebbe una seconda scrittura su una seconda tabella senza transazione, cioè uno stato incoerente raggiungibile per un numero che oggi nessuno legge. La voce sta anche in `deferred-work.md`.

Le domande non si cancellano, si disattivano: una domanda disattivata sparisce dalle schede nuove e resta in quelle vecchie.

### assessments

```sql
create table assessments (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null,
  client_id             uuid not null references clients(id) on delete cascade,
  questionnaire_id      uuid references questionnaires(id) on delete set null,
  questionnaire_version integer,
  call_date             date not null default current_date,
  interviewee_id        uuid references people(id) on delete set null,
  total_questions       integer not null default 0,   -- fotografia del totale al momento dell'apertura
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
```

`total_questions` è il denominatore dell'avanzamento (D16) e si scrive una volta sola, quando la scheda viene creata: contiene il numero di domande attive in quel momento. Non si aggiorna mai, altrimenti aggiungere una domanda oggi farebbe tornare incomplete le schede chiuse ieri.

`verdict` parte da `non_deciso` e si può cambiare sempre. Nessun vincolo lo lega a `completion_status`: una scheda si può chiudere senza verdetto, perché è Luca a decidere e il software non blocca (D14).

### answers

```sql
create table answers (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null,
  assessment_id         uuid not null references assessments(id) on delete cascade,
  question_id           uuid references questions(id) on delete set null,
  question_text         text not null,   -- copia del testo al momento della domanda
  block_title           text not null,   -- copia del blocco
  position              integer not null,
  content               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index answers_assessment_question_idx
  on answers (assessment_id, question_id) where question_id is not null;
create index answers_assessment_position_idx on answers (assessment_id, position);
```

**È la scelta centrale dello schema.** `question_text` e `block_title` sono copie, non riferimenti. Costano una colonna di testo per riga ed eliminano un'intera categoria di problemi: nessuna migrazione quando il questionario cambia, nessuna risposta orfana, nessun sistema di versioni da mantenere. `question_id` resta come collegamento utile finché la domanda esiste, e diventa `null` se viene eliminata, senza portarsi via la risposta.

Le righe di `answers` si creano tutte insieme all'apertura della scheda, con `content` a `null`: così l'ordine è fissato e l'avanzamento si calcola contando quelle con contenuto.

### Avanzamento

```sql
select
  a.id,
  a.total_questions,
  count(ans.id) filter (where coalesce(trim(ans.content), '') <> '') as answered
from assessments a
left join answers ans on ans.assessment_id = a.id
where a.client_id = $1
group by a.id;
```

---

## 4. Aggiornamento automatico di `updated_at`

```sql
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- da ripetere per: clients, people, questionnaires, questions, assessments, answers
create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();
```

Serve anche alle esportazioni future: senza `updated_at` affidabile, una sincronizzazione in uscita non sa cosa mandare (D10).

---

## 5. Ultima attività del cliente

L'elenco ordina per ultima attività, che non è `clients.updated_at` (quello cambia anche solo correggendo un indirizzo). Si calcola:

```sql
select c.*,
       greatest(
         c.updated_at,
         coalesce((select max(a.updated_at) from assessments a where a.client_id = c.id), c.updated_at)
       ) as last_activity
from clients c
where c.owner_id = $1
order by last_activity desc;
```

Se l'elenco diventasse lento, si materializza in una colonna aggiornata da trigger. Con qualche centinaio di clienti non serve.

**Come è calcolata davvero, dalla Story 1.6 (4 agosto 2026).** Il SQL qui sopra resta la definizione, ma non è quello che gira. L'applicazione legge le schede come righe innestate (`select('… , assessments(updated_at)')`, innesto normale e mai `!inner`, che farebbe sparire i clienti senza schede) e calcola il massimo in memoria, in `src/lib/last-activity.ts`.

Il motivo: PostgREST non sa ordinare un elenco per un valore aggregato delle righe innestate. Per farlo in SQL servirebbe una vista o una colonna materializzata, cioè una migrazione, che l'Epic 1 dichiara di non portare.

**Quando questa scelta smette di valere, e come ci si accorge:** il giorno in cui l'elenco viene paginato, o in cui i clienti superano il migliaio, cioè il tetto di righe di PostgREST. Sono lo stesso momento: ordinare in memoria significa leggere tutte le righe, e al tetto la finestra viene scelta ordinando per `clients.updated_at` mentre la chiave d'ordine vera è l'ultima attività — un cliente recente solo per una scheda verrebbe tagliato prima di essere ordinato. Da lì in avanti serve la colonna materializzata di cui sopra.

---

## 6. Protezione degli accessi, due varianti

### Variante A: Supabase (Lovable Cloud, Lovable con Supabase, Vercel + Supabase)

`owner_id` fa riferimento a `auth.users(id)` e la protezione sta nel database.

```sql
alter table clients        enable row level security;
alter table people         enable row level security;
alter table questionnaires enable row level security;
alter table question_blocks enable row level security;
alter table questions      enable row level security;
alter table assessments    enable row level security;
alter table answers        enable row level security;

-- da ripetere per ogni tabella con owner_id
create policy clients_owner_all on clients
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
```

Per `question_blocks` e `questions`, che non hanno `owner_id` proprio, la policy risale al questionario:

```sql
create policy questions_owner_all on questions
  for all
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
```

`(select auth.uid())` invece di `auth.uid()` nudo: la forma con sottoquery viene valutata una volta per query invece che riga per riga.

Il giorno che arrivano i collaboratori, cambia solo la condizione delle policy, non lo schema.

### Variante B: Postgres di Replit, senza livello di autenticazione integrato

La RLS esiste come funzione di Postgres, ma senza un `auth.uid()` che la alimenti la protezione va scritta nel codice. Regole vincolanti:

- Un solo modulo accede al database. Nessuna query SQL sparsa fra i componenti.
- Ogni funzione di lettura e scrittura riceve `owner_id` come primo parametro e lo applica nella clausola `where`. Nessuna eccezione.
- L'`owner_id` viene dalla sessione verificata sul server, mai da un parametro della richiesta.
- Una revisione periodica cerca query senza filtro sul proprietario: sono difetti di sicurezza, non sviste.

È una protezione più debole, ed è la ragione principale per preferire Supabase se il software conterrà dati di clienti reali.

---

## 7. Migrazioni

File numerati dentro il repository, mai modifiche manuali dalla dashboard (`kb-0.md`, sezione 5).

```
supabase/migrations/
  0001_extensions.sql
  0002_clients.sql
  0003_people.sql
  0004_questionnaire.sql
  0005_assessments_answers.sql
  0006_triggers.sql
  0007_rls.sql          -- solo variante A
  0008_block_title_check.sql
  0009_question_checks.sql
supabase/migrations.test.ts   -- il controllo delle dichiarazioni, gira con npm test
supabase/seed.sql             -- questionario iniziale, mai in produzione con dati finti
```

Ordine obbligato: estensioni, tabelle senza dipendenze, tabelle dipendenti, trigger, policy.

**Dopo ogni `apply_migration` si verifica il registro con `list_migrations`.** Lo strumento può registrare il nome senza il prefisso numerico — è successo alla 0008, registrata come `block_title_check` — e un registro senza prefisso non corrisponde più ai file di questa cartella. Il rimedio in due passi: passare allo strumento il nome **con** il prefisso (`0009_question_checks`), che così lo conserva — verificato con la 0009 il 7 agosto 2026 — e, se un nome è comunque entrato spoglio, allineare il registro con un `update` su `supabase_migrations.schema_migrations`, che è metadato dello strumento e non schema applicativo, dichiarandolo nel Dev Agent Record della story.

### Come si dichiara la reversibilità (D24)

`kb-0.md` §5 chiede che ogni migrazione sia reversibile o dichiari perché non lo è. Qui c'è il formato con cui lo dice, ed è vincolante: una migrazione senza dichiarazione è un difetto, della stessa gravità di una policy mancante.

La dichiarazione è una nota dentro il file di migrazione, non un file `.down.sql` e non un documento a parte: una nota lontana dal codice che descrive invecchia da sola. Sta subito sotto la riga del titolo (`-- 000N nome`) e sopra la prosa che già spiega perché lo schema è fatto così, e sono tre chiavi fisse, sempre queste tre e sempre in quest'ordine:

```sql
-- Reversibile: <sì | sì nella struttura, no nei dati | no>
-- Come si annulla: <le istruzioni esatte, oppure «non si può, perché …»>
-- Cosa si perde: <che cosa sparisce eseguendola, oppure «niente»>
```

`Reversibile:` comincia con `sì` o con `no` e il resto della riga è libero per la sfumatura, perché quasi nessuna migrazione è un sì secco. Quando struttura e dati si comportano diversamente la formula è `sì nella struttura, no nei dati`: una `create table` si annulla sempre, e sempre portandosi via quello che c'era dentro, quindi chiamarla «reversibile» e basta sarebbe formalmente esatto e praticamente una bugia. `Come si annulla:` porta SQL eseguibile, non una descrizione; se occupa più di una riga si continua con `--` allineato. Le tre chiavi si scrivono lettera per lettera così come stanno qui: sono quello che il controllo cerca, e una dichiarazione scritta con parole diverse è una dichiarazione che nessuno trova.

**Le istruzioni di annullamento si scrivono senza `cascade`.** Un `drop table clients cascade` eseguito nell'ordine sbagliato non fallisce: toglie i vincoli di chiave esterna di `people` e `assessments` e lascia righe che puntano a un cliente che non esiste più. Non tace del tutto — emette una `notice` che elenca i vincoli caduti — ma una `notice` non ferma niente e finisce in un registro che nessuno rilegge. La forma senza `cascade` invece rifiuta finché qualcosa dipende dalla tabella, e quel rifiuto è l'informazione: vuol dire che c'è una migrazione più recente da annullare prima. Si preferisce un annullamento che fallisce rumorosamente a uno che riesce e danneggia.

**Si annulla in ordine inverso di numero:** 0007 prima di 0006, 0006 prima di 0005, e così via. Vale per l'intero insieme, quindi sta scritto qui una volta e non si ripete in ogni file.

Il controllo che se ne accorge quando la dichiarazione manca è `supabase/migrations.test.ts`, e gira con `npm test`. Verifica la presenza, l'ordine e il prefisso, non la correttezza dell'SQL di annullamento: quella la verifica una persona, perché nessun programma può sapere se `drop table people;` è la cosa giusta da scrivere in quel file.

`seed.sql` non è una migrazione e non riceve la dichiarazione: contiene dati, non schema, ed è rieseguibile per sua natura.

---

## 8. Dati iniziali

`supabase/seed.sql` crea il questionario di prequalifica per intero: un questionario attivo `Prequalifica` alla versione 1, **8 blocchi e 23 domande**, che sono quelle approvate con D19. Non crea nessun cliente e nessun dato finto.

Il paragrafo diceva fino al 5 agosto 2026 che il seed crea il questionario *vuoto* e che le domande si inseriscono dall'interfaccia. Era vero quando le domande non erano ancora state riviste, e non lo è più: la revisione è la decisione D19, e il seed le porta tutte e ventitré. Restano comunque modificabili dall'interfaccia, che è il punto dell'Epic 2 — solo che il punto di partenza non è il vuoto.

Due cose del seed che non si deducono guardandolo di sfuggita:

- **Si esegue dopo il primo accesso**, non prima: `questionnaires.owner_id` fa riferimento a `auth.users`, e senza un utente il file esce con una `notice` senza scrivere niente. Le altre due tabelle non hanno un `owner_id` proprio — la loro protezione risale al questionario con un `exists`, §6 — quindi il proprietario si scrive una volta sola, sulla riga del questionario.
- **È rieseguibile.** Se un questionario esiste già per quell'utente, non tocca niente. Per questo non è una migrazione e non riceve la dichiarazione di reversibilità della §7: contiene dati, non schema.

**`position` è il numero della domanda nel questionario intero, non dentro il blocco.** Il blocco `Contesto` ha le posizioni 1-3, `Obiettivo` le 4-6, e così via fino a 21-23 nell'ottavo. È la stessa numerazione che `answers.position` copia per tenere l'ordine di una scheda. Ordinare le domande per `position` dentro il loro blocco dà l'ordine giusto in entrambe le convenzioni, perché le posizioni sono comunque crescenti dentro ogni blocco; la differenza conta il giorno che una domanda si aggiunge o si sposta, ed è la Story 2.5 a doverla chiudere.

**Dalla Story 2.3 (7 agosto 2026) una domanda nuova nasce al massimo globale del questionario, più uno**, qualunque sia il suo blocco. Le alternative perdevano di più: il massimo del blocco + 1 duplicherebbe la posizione della prima domanda del blocco successivo, e rinumerare tutto a ogni aggiunta sarebbe una scrittura su molte righe senza transazione — PostgREST non ne offre una — cioè la Story 2.5 costruita male in anticipo. La domanda nasce comunque in fondo al suo blocco, perché dentro ogni blocco le posizioni restano crescenti e la pagina ordina per `position` dentro il blocco. Quello che si sospende è la promessa che `position` sia il numero d'ordine dell'intervista attraverso i blocchi: aggiungere una domanda al blocco 2 oggi le dà la posizione 24, non la 7. La semantica torna con la rinumerazione della Story 2.5, che nell'ordine dello sprint viene prima della 3.1, cioè prima che `answers.position` copi questi numeri dentro una scheda.

---

## 9. Cosa cambia nella seconda versione

Da tenere presente adesso per non doversi contorcere dopo, senza costruirlo ora:

- `audits` e `audit_entries`, con la provenienza su ogni voce (D5).
- `documents`, con riferimento al file nello storage e collegamento al cliente (D12).
- Nessuna di queste tabelle modifica quelle esistenti: si agganciano a `clients` e basta.
