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
  -- Le due direzioni sono arrivate in due tempi. La 0009 rifiuta la scelta singola senza
  -- opzioni; il coalesce perché array_length su un array vuoto risponde null. La 0010 rifiuta
  -- le opzioni su un tipo che non le usa, ed è la decisione della Story 2.4 (7 agosto 2026) su
  -- cosa succede riscrivendo il tipo: via dalla scelta singola le opzioni si azzerano sul
  -- server, e il database lo pretende. `options is null` e non array_length: null è come il
  -- server scrive «niente opzioni» (D13).
  constraint questions_single_choice_has_options
    check (answer_type <> 'scelta_singola' or coalesce(array_length(options, 1), 0) > 0),
  -- 0010, con la riscrittura delle domande
  constraint questions_options_only_single_choice
    check (answer_type = 'scelta_singola' or options is null)
);

create index questions_block_position_idx on questions (block_id, position);
```

~~`version` cresce quando si modifica la struttura, ed è informativo: non serve a ricostruire nulla, perché la ricostruzione avviene tramite le copie salvate nelle risposte.~~

**Superata l'8 agosto 2026, con la decisione D25.** La frase qui sopra resta scritta perché la colonna esiste ancora, ma la prima metà non è più vera. Con la Story 2.6 l'Epic 2 è chiusa e le cinque scritture del questionario esistono tutte — blocchi (2.2), domande nuove (2.3), riscrittura (2.4), riordino (2.5), disattivazione (2.6) — e **nessuna fa crescere `version`**, che resta `1` finché nessuno la legge. La seconda metà invece regge, ed è il motivo: la ricostruzione delle schede vecchie passa dalle copie dentro `answers` (`question_text`, `block_title`, `position`), mai da qui. La colonna non si toglie, perché le esportazioni future potrebbero volerla, e la Story 3.1 vi copierà `1`. Le alternative valutate e scartate, e la strada da prendere il giorno che «modifica strutturale» avesse una definizione operativa, stanno in D25.

Le domande non si cancellano, si disattivano: una domanda disattivata sparisce dalle schede nuove e resta in quelle vecchie.

**Precisato l'11 agosto 2026, con la 0017.** La frase resta vera dove conta e non lo era abbastanza dove non conta: la regola esiste per proteggere le schede vecchie, e una domanda che nessuna scheda ha mai contenuto non ha niente da proteggere — restava però in un questionario che si rilegge a ogni call. `delete_question` la cancella se e solo se nessuna riga di `answers` la nomina; `delete_block` cancella un blocco se e solo se non ha più domande, attive o spente. Rispondono `deleted`, `gone` o `in_use`, e `in_use` non è un guasto: è la frase che l'interfaccia deve saper dire.

Sono funzioni e non due `delete` da PostgREST perché **il database non sa rifiutare da solo nessuna delle due**, ed è la cosa meno ovvia di questa riga: `questions.block_id` cade in `cascade`, quindi cancellare un blocco si porta via le sue domande in silenzio; `answers.question_id` cade in `set null`, quindi cancellare una domanda usata riesce e slega le risposte. Un controllo letto prima e cancellato dopo lascia in mezzo una finestra, e la risposta del progetto a questa classe di problema è già scritta nella 0011: una funzione plpgsql è una transazione. Stessa forma — `security invoker`, `search_path` vuoto, lock consultivo sul questionario, `execute` negato ad `anon` — e `renumber_questions` dopo la cancellazione di una domanda, perché il numero d'intervista lascerebbe un buco.

Una finestra sopravvive ed è dichiarata invece che chiusa, in testa alla migrazione: una scheda aperta fra il controllo e il `delete` porta la propria riga a `question_id` null. La risposta resta leggibile con la sua copia del testo, che è lo stato che questa sezione descrive da sempre come previsto.

**Corretto l'11 agosto 2026, con la 0018: non si cancella affatto, si archivia.** La regola della 0017 era giusta e insufficiente — «non c'è storia da perdere» vale per il database, non per chi ha appena premuto il pulsante sbagliato — e `masterplan.md` §5 lo diceva già come principio: «niente si cancella davvero». Le due funzioni scrivono ora la riga in `archived_rows` prima di toglierla, e `restore_row` la rimette dov'era **con il suo id**, che è l'unica forma in cui un ripristino è un ritorno e non una copia.

Il guardiano `in_use` **resta**, e va detto perché ora sembra ridondante: non protegge dall'irrecuperabilità, protegge il legame. `answers.question_id` cade in `set null` alla cancellazione, e nessun ripristino sa quali righe rimettere a posto — quindi una domanda che una scheda contiene continua a non potersi togliere, e la via resta `Disattiva`.

### archived_rows

```sql
create table archived_rows (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,  -- 0020
  source_table  text not null check (source_table in ('questions','question_blocks','people')),  -- 0021
  row_id        uuid not null,
  label         text not null,   -- come si riconosce nel cestino, senza aprire il payload
  parent_id     uuid not null,   -- il blocco per una domanda, il questionario per un blocco,
                                 -- il cliente per una persona
  payload       jsonb not null,  -- to_jsonb(riga), più `interviewee_of` per una persona
  archived_at   timestamptz not null default now()
);
```

Tre scelte che non si deducono guardandola:

- **Una tabella sola con un `jsonb`, non due gemelle di `questions` e `question_blocks`.** Due copie di uno schema divergono alla prima colonna aggiunta, e una colonna dimenticata nella copia sarebbe un dato perso proprio nella tabella che esiste per non perderne. `to_jsonb(riga)` si adegua da solo, ed è il motivo per cui la 0021 ha potuto aggiungere una terza sorgente cambiando un `check` e nient'altro.
- **`owner_id` proprio, non risalito al questionario** come fanno `question_blocks` e `questions` nella §6. Qui la riga di origine può non esistere più — è il punto della tabella — quindi non c'è niente da cui risalire, e il proprietario si scrive.
- **Nessuna chiave esterna verso le tabelle del questionario**, per la stessa ragione. Conseguenza sull'applicazione: `archived_rows` non è innestabile in una select di `questionnaires`, quindi la pagina del questionario la legge in una query sua. Verso `auth.users` invece il vincolo c'è, ed è arrivato tardi — la 0018 l'aveva scordato e la 0020 lo aggiunge: la policy della §6 impedisce di scrivere un proprietario *altrui*, il vincolo impedisce di scriverne uno che non esiste affatto, e il `cascade` fa sparire il cestino insieme all'utente come già succede alle altre cinque tabelle con un `owner_id` proprio.

`parent_id` è il solo caso che il cestino non risolve da solo: una domanda il cui blocco è stato cancellato dopo di lei risponde `parent_gone`, e l'interfaccia dice di ripristinare prima il blocco. Senza quel ramo sarebbe una violazione di chiave esterna, cioè un errore illeggibile. Per una persona il genitore è il cliente, che con `on delete cascade` porta via anche le sue persone: `parent_gone` lì vuol dire che il cliente non c'è più, e non c'è niente da ripristinare prima.

~~**Cosa il cestino non copre, ed è l'unico posto che resta:** `deletePerson` cancella una persona per davvero.~~ **Chiuso l'11 agosto 2026 con la 0021: il cestino copre anche le persone**, e con loro non resta nessuna cancellazione irreversibile nel software. `deletePerson` non contiene più nessun `delete`: chiama `delete_person`, che archivia e cancella nella stessa transazione.

Due cose che la 0021 fa e le due funzioni del questionario no:

- **Non c'è nessun `in_use`.** Una domanda dentro una scheda si rifiuta perché ha una via d'uscita migliore, `Disattiva`. Una persona non ne ha nessuna: rifiutare vorrebbe dire che una persona sbagliata, una volta usata come interlocutore, resta lì per sempre.
- **Il legame si ricuce al ritorno**, ed è quello che rende il punto qui sopra sostenibile. `assessments.interviewee_id` cade in `set null` come `answers.question_id`, ma qui **si sa quali righe rimettere a posto**: prima di cancellare, `delete_person` legge le schede di cui la persona era interlocutore e ne scrive gli id dentro `payload`, sotto la chiave `interviewee_of` — che non è una colonna di `people`, e regge perché `jsonb_populate_record` scarta le chiavi che non trovano una colonna. `restore_row` le rimette, ma **solo dove `interviewee_id` è ancora nullo**: se nel frattempo la scheda ne ha ricevuto un altro, quella è una scelta più recente e il ripristino non la rovescia. Per la stessa ragione una persona che era `is_primary` torna senza contrassegno se nel frattempo un altro ha preso il posto, invece di far fallire il ripristino contro `people_one_primary_per_client_idx`.

`label` per una persona è nome e cognome, e resta **vuota** quando non ce n'è nessuno dei due: nessun campo di `people` è obbligatorio (D13), e «Persona senza nome» è una parola dell'interfaccia — sta in `personDisplayName`, non nel database.

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

**Chi lo scrive: `open_assessment` della 0013, riscritta dalla 0014, dalla Story 3.1 (9 agosto 2026), e nessun altro** — il perché sta in testa ai due file, e il numero che finisce qui è quello delle righe di `answers` scritte davvero, non un conteggio letto un istante prima.

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
  -- 0015, con la schermata di compilazione
  answer_type           text not null,   -- copia del tipo: senza default e senza check, perché copia
  options               text[],          -- copia delle opzioni della scelta singola
  help_text             text,            -- copia del «cosa serve capire»
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index answers_assessment_question_idx
  on answers (assessment_id, question_id) where question_id is not null;
create index answers_assessment_position_idx on answers (assessment_id, position);
```

**Le tre colonne della 0015 sono copie per la stessa ragione delle prime tre, e chiudono la promessa che era applicata a metà** (Story 3.2, 9 agosto 2026): risalire a `questions` per il tipo renderebbe una scheda vecchia con il questionario di oggi, e una `scelta_singola` diventata `numero` mostrerebbe per sempre una risposta scritta a parole dentro un campo numerico. Applicate con `answers` vuota, quindi `not null` senza default e senza riempimento.

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

**Come è calcolato davvero, dalla Story 4.1 (10 agosto 2026).** Il SQL qui sopra resta la definizione, ma non è quello che gira, ed è la stessa situazione della §5 con l'ultima attività. L'applicazione legge le risposte come righe innestate (`select('… , answers(content)')`, innesto normale e mai `!inner`) e conta in memoria, in `src/lib/assessment-progress.ts`, importando `normalizeTextValue` invece di riscrivere `coalesce(trim(content), '') <> ''`: le due definizioni di «vuoto» sono così la stessa funzione letta da due punti, e non due regole destinate a divergere.

Il motivo è quello di D23: PostgREST non calcola l'aggregato sulle righe innestate in un modo che qui convenga, e ottenerlo dal database vorrebbe dire una vista o una colonna materializzata, cioè una migrazione per rendere due cifre a schermo. **Il denominatore invece non si calcola affatto:** è `total_questions` della riga, letto e mai contato — è quello che rende AC4 vera per costruzione.

**Quando questa scelta smette di valere:** il giorno in cui un cliente ha decine di schede, perché contare in memoria significa trasferire il contenuto di tutte le risposte di tutte le sue schede. Le due strade sono l'aggregato di PostgREST sull'innesto oppure una colonna `answered` mantenuta dal trigger della 0016, e la prima **cambia la definizione di «vuoto»**, perché un filtro PostgREST sa dire `content is not null` ma non `trim(content) <> ''`. Per la stessa ragione l'elenco clienti non può copiare questa soluzione: dalla Story 4.2 (11 agosto 2026) l'innesto porta cinque colonne — `updated_at`, che alimenta l'ultima attività della §5 dalla 1.6, più `verdict` e le tre chiavi che scelgono la scheda, `call_date`, `created_at` e `id` — e **non legge `answers`, in nessuna forma**, che è la parte che regge e il motivo per cui questa riga esiste. Il confine è il contenuto delle risposte, non il numero delle colonne: chi ne aggiungesse una sesta lo misura contro quello.

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

**Un settimo trigger, e non è di questa famiglia: `answers_touch_assessment`, migrazione 0016, dalla Story 4.1 (10 agosto 2026).** Gli altri sei toccano la *propria* riga; questo risale: `after update of content on answers` scrive `assessments.updated_at` sulla scheda a cui la risposta appartiene. Serve alla §5, l'ultima attività del cliente — senza, si compila una scheda per un'ora, si torna all'elenco e il cliente è dov'era, perché `answers_set_updated_at` tocca la riga della risposta e niente risale alla scheda. È `security invoker` come gli altri, quindi le policy della §6 filtrano dentro come fuori. `update of content` e non `insert or update` di proposito: `open_assessment` scrive le righe di `answers` nella stessa transazione della scheda, quindi un trigger sull'`insert` riscriverebbe ventiquattro volte la stessa riga per non cambiare niente. Il valore che scrive è irrilevante — `assessments_set_updated_at` lo riscrive comunque — e il motivo per cui è `now()` lo stesso sta in testa al file della migrazione.

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
  0010_question_options_check.sql
  0011_reorder_functions.sql
  0012_reorder_guards.sql
  0013_open_assessment.sql   -- l'apertura di una scheda, in transazione
  0014_open_assessment_total.sql -- il totale dalle righe scritte, e «oggi» nel fuso dichiarato
  0015_answer_question_copy.sql  -- la risposta copia anche tipo, opzioni e aiuto
  0016_answers_touch_assessment.sql -- salvare una risposta sveglia la sua scheda
  0017_delete_without_history.sql -- si cancella solo dove non c'è storia da perdere
  0018_archive.sql          -- il cestino: si archivia invece di cancellare, e si ripristina
  0019_archive_row_reads.sql -- le tre letture di riga intera della 0018, nella forma che funziona
  0020_archived_rows_owner_fk.sql -- il vincolo verso auth.users che la 0018 aveva scordato
  0021_archive_people.sql   -- il cestino copre anche le persone, e il ritorno ricuce l'interlocutore
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

**`position` è il numero della domanda nel questionario intero, non dentro il blocco.** Il blocco `Contesto` ha le posizioni 1-3, `Obiettivo` le 4-6, e così via fino a 21-23 nell'ottavo. È la stessa numerazione che `answers.position` copia per tenere l'ordine di una scheda. Ordinare le domande per `position` dentro il loro blocco dà l'ordine giusto in entrambe le convenzioni, perché le posizioni sono comunque crescenti dentro ogni blocco.

**Chi scrive `position`: le tre funzioni della 0011, dalla Story 2.5 (8 agosto 2026).** La Story 2.3 aveva sospeso la semantica — una domanda nuova nasceva al massimo globale + 1, quindi aggiungerne una al blocco 2 le dava la posizione 24, non la 7 — perché rinumerare a ogni aggiunta sarebbe stata una scrittura su molte righe senza transazione, che PostgREST non offre. La 2.5 chiude la sospensione mettendo la scrittura dove la transazione esiste: `renumber_questions(questionnaire_id)` riassegna 1..N nell'ordine d'intervista (blocchi per posizione, domande dentro il blocco, pareggi su `created_at, id` come l'ordinamento della pagina), toccando solo le righe che cambiano; `move_block(id, direction)` e `move_question(id, direction)` spostano di un passo — la domanda mai fuori dal suo blocco — e chiudono con la stessa rinumerazione. Anche `createQuestion` rinumera subito dopo l'insert: il massimo globale + 1 resta solo come valore di nascita, ricollocato nella stessa azione. Insert e rinumerazione sono però due chiamate separate: se la seconda fallisce, la creazione non fallisce con lei (solo log) e il valore di nascita resta finché una scrittura successiva non rinumera — una scheda aperta in quella finestra, dalla 3.1 in poi, copierebbe quel numero. Finestra stretta e danno contenuto, ma è una promessa condizionata, non un «mai». Le funzioni sono `security invoker` — le policy della §6 filtrano dentro come fuori — con execute negato ad `anon`; dalla revisione della 2.5 (0012) la direzione si valida con `is distinct from` (anche `null` è un valore non valido) e ogni scrittura di posizione prende un lock consultivo di transazione sul questionario, così due riordini in volo si mettono in coda invece di mescolarsi. Dopo ogni scrittura le posizioni sono consecutive e senza duplicati per costruzione: un duplicato nato dalla corsa nota sull'insert (due istruzioni senza transazione, accettata dalla 2.2) si sana alla prima rinumerazione.

---

## 9. Cosa cambia nella seconda versione

Da tenere presente adesso per non doversi contorcere dopo, senza costruirlo ora:

- `audits` e `audit_entries`, con la provenienza su ogni voce (D5).
- `documents`, con riferimento al file nello storage e collegamento al cliente (D12).
- Nessuna di queste tabelle modifica quelle esistenti: si agganciano a `clients` e basta.

---

## 10. Copia di sicurezza

Il progetto sta sul **piano free di Supabase, che non fa nessun backup**: né automatico né scaricabile. Non è una dimenticanza da correggere in fretta, è la condizione in cui il software gira, e finché resta così l'unica copia è quella che si prende a mano. Il cestino della §3 protegge da un `Elimina` premuto per sbaglio; questa sezione protegge da tutto il resto, che è la parte più grande.

`npm run backup` esegue `scripts/backup.sh` e scrive un `registro-AAAA-MM-GG-hhmm.sql` in `~/Documents/Registro-backup`, **fuori dal repository**: il file contiene dati veri di clienti, e una cartella dentro il repo sarebbe a un `git add -f` di distanza da GitHub. La stringa di connessione sta in `.env.backup.local`, coperto dalla regola `.env*.local` del `.gitignore`, e lo script non la stampa mai — contiene la password del database.

Tre cose che non si deducono guardandolo:

- **La porta 6543 non funziona.** È il transaction pooler, e `pg_dump` non ci lavora. Serve il session pooler sulla 5432, oppure la connessione diretta se la linea ha IPv6.
- **`pg_dump` non è nel PATH**, su questa macchina non c'è affatto e non c'è nemmeno Homebrew per installarlo in un comando. Lo script lo cerca dove sta di solito su macOS — dentro Postgres.app, dentro `libpq` di Homebrew che è keg-only — e se non lo trova dice come procurarselo invece di fallire e basta.
- **Il dump copre `public` e non `auth`.** Ripristinare sullo *stesso* progetto funziona, perché l'utente è ancora lì. Su un progetto *nuovo* va prima ricreato l'utente con lo stesso `id`, altrimenti i sei vincoli `owner_id → auth.users(id)` rifiutano ogni riga: sono su `clients`, `people`, `questionnaires`, `assessments`, `answers` e `archived_rows`. Vale la pena saperlo prima, perché è il momento in cui si scopre è il peggiore.

Il giorno che il progetto passasse a Pro, i backup giornalieri arrivano da soli e questo script diventa la copia in più invece dell'unica.
