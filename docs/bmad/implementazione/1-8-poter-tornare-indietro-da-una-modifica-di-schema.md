---
baseline_commit: 4d2ef1d
---

# Story 1.8: Poter tornare indietro da una modifica di schema

Status: done

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 5 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want che ogni migrazione dica come si annulla, o perché non si può,
so that il giorno che una modifica va storta so se posso tornare indietro prima di eseguirla, non dopo.

## Acceptance Criteria

**AC1 — le sette migrazioni già applicate dichiarano la propria reversibilità**
**Given** le sette migrazioni già applicate
**When** le apro
**Then** ognuna dichiara in testa se è reversibile e con quale operazione, oppure perché non lo è (`kb-0.md` §5)

**AC2 — la regola vale anche per quelle che verranno**
**Given** una migrazione nuova
**When** viene scritta
**Then** la stessa dichiarazione è presente, e la sua assenza è un difetto come lo sarebbe una policy mancante

**AC3 — la dichiarazione sta dentro il file che descrive**
**Given** la dichiarazione di reversibilità
**When** la leggo
**Then** è una nota nel file di migrazione e non un file separato, perché una nota lontana dal codice che descrive invecchia da sola

> Questa story **non modifica lo schema**. Non aggiunge tabelle, colonne, indici, trigger o policy, non esegue SQL contro nessun database, e non applica niente. Aggiunge commenti a sette file già applicati, scrive dove sta la regola, e mette un controllo che se ne accorga quando manca. Se alla fine `list_migrations` restituisce otto righe invece di sette, la story è stata sbagliata.

## Tasks / Subtasks

- [x] **Task 1 — Fissare il formato della dichiarazione** (AC: 1, 3)
  - [x] Tre righe, sempre queste tre chiavi, sempre in quest'ordine, subito **sotto la riga del titolo** (`-- 000N nome`) e **sopra** qualsiasi altra prosa già presente nel file:

    ```sql
    -- Reversibile: <sì | sì nella struttura, no nei dati | no>
    -- Come si annulla: <le istruzioni esatte, oppure «non si può, perché …»>
    -- Cosa si perde: <che cosa sparisce eseguendola, oppure «niente»>
    ```

  - [x] Le tre chiavi sono fisse e si scrivono così, lettera per lettera. Non è pedanteria: sono quello che il controllo di Task 4 cerca, e una dichiarazione scritta con parole diverse è una dichiarazione che nessuno trova.
  - [x] `Reversibile:` **comincia con `sì` o con `no`**, e il resto della riga è libero per la sfumatura. Il vincolo sta all'inizio perché è lì che si legge la risposta; la sfumatura serve perché nessuna delle sette è un sì secco (vedi la domanda 5).
  - [x] Quando la reversibilità cambia fra struttura e dati, la formula è **`sì nella struttura, no nei dati`**. È il centro della story: una `create table` si annulla sempre, e sempre portandosi via quello che c'era dentro. Chiamarla «reversibile» e basta è la bugia che questa story esiste per togliere.
  - [x] `Come si annulla:` porta **SQL eseguibile**, non una descrizione. Se occupa più di una riga, si continua con `--` allineato.
  - [x] **Le istruzioni di annullamento si scrivono senza `cascade`.** Un `drop table clients cascade` eseguito nell'ordine sbagliato non fallisce: toglie i vincoli di chiave esterna di `people` e `assessments` e lascia righe che puntano a un cliente che non esiste più, senza dire niente. La forma senza `cascade` invece rifiuta, e il rifiuto è l'informazione: vuol dire che c'è una migrazione più recente da annullare prima. Un annullamento che fallisce rumorosamente è migliore di uno che riesce e danneggia.
  - [x] **Si annulla in ordine inverso di numero.** 0007 prima di 0006, 0006 prima di 0005, e così via. Vale per l'intero insieme e non si ripete in ogni file: si scrive una volta in `database.md` §7 (Task 3).
  - [x] Nessun file `.down.sql`, nessun `ROLLBACK.md`, nessuna cartella nuova, nessuna sezione in un documento a parte. AC3 lo vieta, e il motivo è scritto nella AC stessa.

- [x] **Task 2 — Le sette dichiarazioni** (AC: 1)
  - [x] **Si toccano solo i commenti.** Nessuna riga di SQL delle sette migrazioni cambia: né una parola, né uno spazio dentro un'istruzione. Il perché sta in Dev Notes, «Perché modificare un file già applicato è sicuro, e a quale condizione»: la condizione è esattamente questa.
  - [x] Sotto, la dichiarazione proposta per ognuna. È il risultato dell'analisi delle dipendenze fatta leggendo i vincoli nei file, riportata qui perché è la parte della story dove sbagliare costa di più. **Va verificata, non copiata a occhi chiusi**: Task 5 dice come, con letture che non cambiano niente.

  - [x] **`0001_extensions.sql`**

    ```sql
    -- Reversibile: sì, ma solo dopo 0002.
    -- Come si annulla: drop extension pg_trgm;
    --   Fallisce finché esiste clients_name_trgm_idx, che usa extensions.gin_trgm_ops.
    --   Mai con cascade: toglierebbe quell'indice in silenzio.
    -- Cosa si perde: niente di dati. La ricerca per nome tornerebbe a leggere la tabella
    --   invece dell'indice: più lenta, mai sbagliata.
    ```

    Nota per chi scrive: `create extension if not exists` vuol dire che questa migrazione **potrebbe non aver creato niente**, se l'estensione fosse già stata presente. Sul progetto vero non è andata così — verificato il 5 agosto 2026, `pg_trgm` risulta installata alla 1.6 nello schema `extensions` e non è fra quelle che Supabase attiva da sé — ma la riga `Cosa si perde` non promette niente che dipenda da quel controllo, e va bene così.

  - [x] **`0002_clients.sql`**

    ```sql
    -- Reversibile: sì nella struttura, no nei dati.
    -- Come si annulla: drop table clients;
    --   I tre indici cadono con la tabella. Fallisce finché esistono people o assessments,
    --   che riferiscono clients(id): si annullano prima 0005 e 0003.
    -- Cosa si perde: tutti i clienti. Non si ricostruiscono da nessun'altra tabella.
    ```

  - [x] **`0003_people.sql`**

    ```sql
    -- Reversibile: sì nella struttura, no nei dati.
    -- Come si annulla: drop table people;
    --   Fallisce finché esiste assessments, che riferisce people(id) con interviewee_id:
    --   si annulla prima 0005.
    -- Cosa si perde: tutte le persone e i loro ruoli rispetto alla decisione.
    ```

  - [x] **`0004_questionnaire.sql`**

    ```sql
    -- Reversibile: sì nella struttura, no nei dati.
    -- Come si annulla: drop table questions;
    --   drop table question_blocks;
    --   drop table questionnaires;
    --   In quest'ordine. Il primo fallisce finché esiste answers, che riferisce questions(id);
    --   l'ultimo finché esiste assessments. Si annulla prima 0005.
    -- Cosa si perde: il questionario, i suoi blocchi e le sue domande. È l'unica delle
    --   sette il cui contenuto si rimette rieseguendo seed.sql — ma il seed rimette le
    --   23 domande approvate, non quelle riscritte o disattivate dall'interfaccia.
    ```

    Nota per chi scrive: la precisione dell'ultima riga conta da quando esiste l'Epic 2, che è tutta lì per cambiare le domande dall'interfaccia. Scrivere «il seed lo rimette com'era» sarebbe vero oggi e falso alla prima domanda riscritta.

  - [x] **`0005_assessments_answers.sql`**

    ```sql
    -- Reversibile: sì nella struttura, no nei dati.
    -- Come si annulla: drop table answers;
    --   drop table assessments;
    --   In quest'ordine: answers riferisce assessments(id).
    -- Cosa si perde: tutte le schede di prequalifica e tutte le risposte, cioè il lavoro
    --   delle call. Nessuna copia di questi dati esiste altrove nello schema.
    ```

  - [x] **`0006_triggers.sql`**

    ```sql
    -- Reversibile: i sei trigger sì, la funzione non del tutto.
    -- Come si annulla: drop trigger clients_set_updated_at on clients;
    --   e gli altri cinque, su people, questionnaires, questions, assessments, answers;
    --   poi drop function set_updated_at();
    --   La funzione è stata creata con create or replace: se una con lo stesso nome fosse
    --   esistita prima, la sua definizione non sta in questo file e non si ricostruisce da qui.
    -- Cosa si perde: niente di dati. updated_at smette di aggiornarsi da solo, quindi
    --   l'ordinamento dell'elenco per ultima attività resta fermo all'ultimo valore scritto.
    ```

    **Non copiare questo blocco: la riga `Reversibile` qui sopra fallisce il controllo di Task 4**, perché non comincia con `sì` né con `no`. Nel file c'è la versione conforme, `sì per i sei trigger, non del tutto per la funzione.` — stesso significato, stessa sfumatura. Il motivo per esteso sta nel Debug Log.

  - [x] **`0007_rls.sql`**

    ```sql
    -- Reversibile: sì per il database, no per le regole del progetto.
    -- Come si annulla: drop policy clients_owner_all on clients;
    --   e le altre sei; poi alter table clients disable row level security;
    --   e le altre sei. Il database lo accetta.
    -- Cosa si perde: niente di dati. Si perde la protezione delle righe, che AGENTS.md e
    --   kb-0.md §3 vietano di disattivare senza eccezioni temporanee. Queste istruzioni
    --   stanno scritte perché la domanda «si può tornare indietro» abbia una risposta,
    --   non perché siano una strada percorribile.
    ```

  - [x] Ogni file conserva la prosa che ha già. Le tre righe si aggiungono, non sostituiscono niente: i commenti attuali spiegano *perché* lo schema è fatto così, la dichiarazione dice *come si torna indietro*, e sono due cose diverse.

- [x] **Task 3 — Dove sta la regola per le migrazioni future, e dove la decisione** (AC: 2)
  - [x] Il formato esatto va in **`docs/database.md` §7 (Migrazioni)**, che è dove le convenzioni sulle migrazioni vivono già. Il precedente esiste: la revisione della Story 1.6 ha aggiunto a §5 la nota su come l'ultima attività è calcolata davvero.
  - [x] Cosa scrivere in §7, in prosa e non a elenco puntato di regole: le tre chiavi e il loro ordine, la posizione nel file, il divieto di `cascade` con il suo motivo, l'ordine inverso di annullamento, e che una dichiarazione mancante è un difetto.
  - [x] Una sola riga va in **`AGENTS.md`**, nell'elenco delle regole non negoziabili, accanto a quella che c'è già sulle migrazioni versionate. È lì che va perché è lì che sta la regola sulla sicurezza a livello di riga, e AC2 chiede esattamente la stessa gravità: *«la sua assenza è un difetto come lo sarebbe una policy mancante»*. Metterla in un posto meno grave sarebbe dire il contrario di quello che l'AC dice.
  - [x] La riga rimanda a `database.md` per il formato e non lo ripete: `AGENTS.md` chiude dicendo di non farlo crescere, e quello che cresce va in `docs/` e si richiama con `@`.
  - [x] `AGENTS.md` è un file di Luca. La Story 1.6 ci ha già aggiunto la riga del comando dei test, e la domanda 3 ha confermato il 5 agosto 2026: la riga si scrive.
  - [x] **`00-contesto-e-decisioni.md` guadagna `D24`.** Deciso da Luca il 5 agosto 2026, domanda 4, che ribalta il default scritto nella story: la decisione va registrata dove stanno le altre, non solo qui.
  - [x] Cosa copre D24: **come si dichiara la reversibilità di una migrazione**, cioè le tre chiavi come nota dentro il file invece di una migrazione inversa o di un documento a parte, *e* la regola che le istruzioni di annullamento si scrivono senza `cascade`. Sono una decisione sola e vanno insieme: la seconda è il motivo per cui la prima è utile invece di decorativa.
  - [x] Il motivo per cui la decisione esiste va scritto per esteso, perché è quello che fra tre mesi la difende: **un annullamento che fallisce è migliore di uno che riesce a metà**, e `drop table clients cascade` è il caso concreto — non porta via `people` e `assessments`, porta via i loro vincoli e lascia righe orfane senza dire niente.
  - [x] D24 **non ripete il formato**: rimanda a `database.md` §7, dove il formato sta per esteso. Una decisione che duplica una convenzione produce due copie che divergono alla prima riscrittura.
  - [x] Va aggiornata anche l'intestazione del file, che oggi dice `Ultimo aggiornamento: 4 agosto 2026, D23`.
  - [x] **Non si tocca `kb-0.md`.** La regola generale c'è già, §5: *«Ogni migrazione è reversibile o dichiara esplicitamente perché non lo è.»* Questa story non la aggiunge, la rende eseguibile. `kb-0.md` vale per ogni progetto e il formato delle tre chiavi vale per questo.

- [x] **Task 4 — Il controllo che rende l'assenza un difetto visibile** (AC: 2)
  - [x] Il motivo per cui esiste: AC2 parla di **una migrazione nuova**, e in questo momento non ce n'è nessuna da scrivere — l'Epic 1 dichiara di non portarne. AC2 quindi non si può verificare scrivendone una: si verifica solo avendo qualcosa che se ne accorga quando arriverà. Senza, AC2 è una frase che nessuno applica.
  - [x] **Un file solo.** Legge ogni `supabase/migrations/*.sql`, e per ognuno pretende le tre chiavi, nell'ordine, subito dopo la riga del titolo, ognuna con un valore non vuoto. Niente altro: non controlla che l'SQL di annullamento sia giusto, perché nessun programma può saperlo.
  - [x] Il valore di `Reversibile:` deve **cominciare con `sì` o con `no`**, non essere un testo qualsiasi. Serve almeno questo: una chiave presente con dentro una frase inventata passerebbe una verifica che guardi solo la presenza. Il resto della riga resta libero, perché le sette dichiarazioni vere hanno tutte una sfumatura (domanda 5).
  - [x] Nessuna dipendenza nuova: `node:test`, `node:assert/strict`, `node:fs` e `node:path`. Node 24 fa tutto da sé, come dalla Story 1.6.
  - [x] **Dove sta il file.** Deciso da Luca il 5 agosto 2026, domanda 2: il test sta **accanto al suo soggetto**, cioè `supabase/migrations.test.ts`, e lo script `test` di `package.json` guadagna **un secondo modello come argomento separato**, conservando tutto il resto della riga:

    ```
    TZ=UTC node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON 'src/**/*.test.ts' 'supabase/**/*.test.ts'
    ```

    Due argomenti e non un modello con le graffe, che dipenderebbe da come Node le espande — e questo progetto non deduce, verifica. `TZ=UTC` e il silenziamento dell'avviso restano: sono della Story 1.6 e non c'entrano con questa.
  - [x] La convenzione di `kb-0.md` §2 — il test accanto al modulo che prova, col suo nome più `.test` — qui non si applica come è scritta, perché **non c'è nessun modulo sotto**: il soggetto è una cartella di file `.sql`. La funzione che legge la testata sta dentro il file di test. Creare un modulo in `src/lib` che solo il proprio test importa sarebbe codice che l'applicazione non raggiunge, cioè peggio del problema che risolve.
  - [x] **Va visto fallire.** Si crea un `supabase/migrations/0008_prova.sql` senza dichiarazione, si esegue `npm test`, si vede il rosso, si cancella il file, si torna al verde. Poi si ripete togliendo **una sola** delle tre chiavi da una migrazione vera, e si ripristina con `git diff` che torna a zero. Un test che non è stato visto fallire quando doveva non è un test (`kb-0.md` §7), ed è la regola che la Story 1.7 ha applicato con una tabella nel Dev Agent Record.
  - [x] Il file di prova va cancellato prima del commit. Se `git status` lo mostra ancora, il commit è sbagliato.

- [x] **Task 5 — Verifica che esegue l'agente**
  - [x] `npm test`, `npm run typecheck`, `npm run build`. Tutti e tre verdi. Il terzo conta anche qui: Task 4 mette un `.ts` sotto `supabase/`, e quel file entra in `tsconfig.json`, il cui `include` è `**/*.ts`.
  - [x] `git diff supabase/migrations/` e leggere **ogni riga**. Devono comparire solo righe che cominciano con `--`. Una riga di diff che non è un commento vuol dire che l'SQL è cambiato, ed è un difetto grave: quel file è già stato applicato, quindi il file e il database direbbero due cose diverse.
  - [x] Verificare che il database non sia cambiato: `list_migrations` sul progetto `Registro` (`izkycpwxuedpkzgpvcxc`) deve restituire **le stesse sette righe di prima**, con le stesse versioni. Se ne compare un'ottava, qualcosa è stato applicato e non doveva.
  - [x] **Facoltativo, e solo in lettura.** Le dipendenze dichiarate in Task 2 si possono confermare contro il database vero con una `select` su `information_schema.table_constraints` e `constraint_column_usage`, che non cambia niente. Se si fa, il risultato va nel Dev Agent Record. Se non si fa, si dice che non si è fatto: le dichiarazioni restano verificate leggendo i vincoli nei file, che è comunque la fonte.
  - [x] **Vietato:** eseguire una qualsiasi delle istruzioni di annullamento, anche dentro una transazione con `rollback`, anche sull'altro progetto Supabase. L'ipotesi è stata considerata e scartata: prenderebbe lock su tabelle di un database vero per confermare un commento, e `AGENTS.md` vieta le modifiche di schema fuori da una migrazione. La prova che il `drop` fallisce nell'ordine sbagliato sta nei vincoli, che sono scritti nei file e si leggono.

- [ ] **Task 6 — Verifica che richiede Luca**
  - [ ] Questa story non ha niente da vedere reso: non tocca nessuna schermata, nessun componente, nessuno stile. Le verifiche di sessione delle Story 1.6 e 1.7 qui non hanno oggetto, e la loro assenza è voluta, non dimenticata.
  - [ ] Quello che richiede una persona è l'unica cosa che conta davvero: **leggere le sette dichiarazioni e dire se sono vere.** Una dichiarazione sbagliata è peggio di una assente, perché è una promessa sulla sicurezza dei dati su cui qualcuno si fiderà nel momento peggiore.
  - [ ] Finché questo non è fatto, la story non va a `done`.

  **Chiusa da Luca il 5 agosto 2026**, dopo la revisione. Le quattro caselle restano vuote perché nessuno può spuntarle al posto suo: la story va a `done` per sua decisione, non perché la lettura sia registrata qui.

### Review Findings

*Code review del 5 agosto 2026. Tre livelli in parallelo (adversarial, edge case, acceptance). Nessuna violazione delle tre AC: le sette dichiarazioni ci sono, stanno sotto la riga del titolo, nessuna riga di SQL è cambiata (verificato: zero righe non-commento aggiunte, zero rimosse), nessuna usa `cascade`, e le dipendenze dichiarate coincidono con i vincoli scritti nei file. Quello che segue sta tutto sotto quella soglia.*

**Le tre decisioni, chiuse da Luca il 5 agosto 2026.**

- [x] [Review][Decision] **Il divieto di `cascade` è la sola regola di D24 che un programma può verificare, e non è verificata** — Il controllo guarda presenza, ordine, posizione e prefisso. La regola che D24 chiama «la parte meno ovvia e la più utile» non ha nessun presidio. Il caso è scomodo per costruzione: `0001` contiene già la parola nella testata (`Mai con cascade`), quindi un controllo ingenuo darebbe un falso positivo; la forma che funziona è cercare `drop … cascade` e non la parola isolata. Contro: Task 4 dice «Niente altro», e `AGENTS.md` vieta le funzionalità non richieste. → **Risolta: il controllo si aggiunge**, perché è un buco della regola che la story scrive e non una funzionalità in più. Diventa un patch.
- [x] [Review][Decision] **`0007` dichiara `Reversibile: sì per il database` e scrive la ricetta per disattivare la RLS** — Per la logica di D24 stessa («un annullamento che fallisce è migliore di uno che riesce a metà») qui è l'annullamento che *riesce* a essere il disastro, e la risposta coerente sarebbe `no`, col motivo. La story ha scelto consapevolmente il contrario e lo scrive nel file («non perché siano una strada percorribile»). → **Risolta: la dichiarazione resta com'è.** La riga `Cosa si perde` dice già che disattivare la RLS è vietato da `AGENTS.md` e da `kb-0.md` §3, quindi la risposta alla domanda «si può tornare indietro» esiste senza diventare un invito. Nessuna modifica.
- [x] [Review][Decision] **La casella `[x]` di Task 2 su `0006` sta accanto a uno snippet che il controllo rifiuta** — Il testo proposto (`i sei trigger sì, la funzione non del tutto`) viola la regola della story stessa; il file contiene la versione corretta e la deviazione è documentata nel Debug Log, dieci sezioni più giù. Chi fra sei mesi ricopia da Task 2 prende il blocco sbagliato. → **Risolta: una riga di avvertenza va accanto allo snippet**, dove la trova chi copia. Diventa un patch.

- [x] [Review][Patch] **Il controllo del prefisso è lasco in un verso e stretto nell'altro** [supabase/migrations.test.ts:71-78] — Verificato eseguendo: `non si sa, da verificare` passa e `nota: da rivedere` passa, perché `startsWith('no')` accetta qualsiasi parola che comincia per «no» — cioè entra proprio il «non lo so» che D24 dichiara peggiore di una dichiarazione assente. Nell'altro verso `Sì nella struttura` viene rifiutato, e `database.md` §7 non dice da nessuna parte che il valore va in minuscolo: chi legge il documento e non il test inciampa, con un messaggio che non nomina la maiuscola come causa. Nello stesso punto, `.normalize('NFC')` è applicata al valore ma non a `ALLOWED_PREFIXES`: mezzo rimedio, che il giorno che è il file di test a essere salvato in NFD rifiuta dichiarazioni corrette.
- [x] [Review][Patch] **Il test promette «le tre chiavi, subito sotto il titolo» e ancora solo la prima** [supabase/migrations.test.ts:52-63] — `parseDeclaration` fa `continue` su ogni riga di commento non riconosciuta, e l'unica asserzione di posizione è su `entries[0].line`. Le altre due chiavi possono stare trenta righe più giù, separate da prosa arbitraria, e restare verdi. La rottura di proposito registrata nel Debug Log («dichiarazione spostata sotto una riga di prosa → 1 rosso») è vera solo perché a essere spostata era la *prima* chiave.
- [x] [Review][Patch] **`0006` e `0007`: «e le altre sei» non è SQL eseguibile** [supabase/migrations/0006_triggers.sql:3-5, supabase/migrations/0007_rls.sql:3-5] — Viola il vincolo che questa story stessa scrive in Task 1 e in `database.md` §7: *«`Come si annulla:` porta SQL eseguibile, non una descrizione»*. In totale 11 istruzioni su 13 restano da ricostruire a mano, e i nomi sono nel file ma vanno cercati. È la stessa auto-contraddizione già intercettata sul prefisso di `0006`; qui non lo è stata.
- [x] [Review][Patch] **`0001`: «Reversibile: sì, ma solo dopo 0002» si legge al contrario** [supabase/migrations/0001_extensions.sql:2] — «dopo 0002» si intende naturalmente come «dopo che 0002 è stata applicata», cioè l'opposto del significato voluto. Manca la parola che disambigua: «dopo aver **annullato** 0002». È la prima riga che si legge quando si decide se procedere.
- [x] [Review][Patch] **«senza dire niente» è falso: `drop … cascade` emette una NOTICE** [docs/00-contesto-e-decisioni.md D24, docs/database.md §7] — Postgres stampa `NOTICE: drop cascades to constraint people_client_id_fkey on table people`. La sostanza regge (una NOTICE non ferma niente e si perde in un log), il dettaglio no, e sta in due testi scritti apposta per essere creduti nel momento peggiore. D24 dice di suo che una dichiarazione sbagliata è peggio di una assente: chi verifica questa frase e la trova falsa smette di fidarsi anche del resto.
- [x] [Review][Patch] **L'albero di `database.md` §7 non elenca `migrations.test.ts`** [docs/database.md §7] — La prosa poco sotto lo nomina come il controllo di riferimento, l'elenco dei file no. Nello stesso blocco, `seed.sql` è mostrato non indentato, cioè alla radice del repository, mentre sta in `supabase/seed.sql`: pre-esistente, ma è una riga accanto a quella da aggiungere.
- [x] [Review][Patch] **Il controllo non presidia il divieto di `cascade`** [supabase/migrations.test.ts] — Dalla decisione 1 qui sopra. Si cerca la forma `drop … cascade` dentro il valore di `Come si annulla` e le sue righe di continuazione, non la parola isolata, che darebbe un falso positivo su `0001` (`Mai con cascade`).
- [x] [Review][Patch] **Task 2, snippet di `0006`: manca la riga che avverte chi copia** — Dalla decisione 3 qui sopra. Una riga sotto il blocco, che rimanda al Debug Log.
- [x] [Review][Patch] **Dev Agent Record: «Le tre rotture di proposito» seguito da una tabella di quattro** — E «ognuna su un'assertion diversa» non è esatto: le prime due cadono entrambe su `assert.deepEqual` delle chiavi. Errore in direzione conservativa (è stato fatto più di quanto dichiarato), ma resta un'affermazione non vera in un registro di verifica.

- [x] [Review][Defer] **`database.md` §8 contraddice il commento nuovo di `0004`** [docs/database.md §8] — §8 dice che il seed crea il questionario vuoto e le domande si inseriscono dall'interfaccia; il commento aggiunto a `0004` dice che il seed rimette le 23 domande approvate. `seed.sql` ne contiene davvero 23: il commento nuovo ha ragione, §8 è stantia. Rimandato: il perimetro della story limitava `database.md` alla §7.
- [x] [Review][Defer] **Nessuna versione di Node dichiarata** [package.json] — Il file nuovo usa `import.meta.dirname` (Node ≥ 20.11) e l'esecuzione diretta di `.ts` da `node --test` (≥ 22.6). Nessun campo `engines`, nessun `.nvmrc`: la versione verificata (`v24.13.0`) è scritta solo dentro il file della story, che nessuno strumento legge. Rimandato: pre-esistente dalla Story 1.6, che ha introdotto l'esecuzione dei test in TypeScript.
- [x] [Review][Defer] **`readdirSync` non è ricorsivo e filtra `.sql` minuscolo** [supabase/migrations.test.ts:39-41] — Una migrazione in sottocartella, o chiamata `.SQL`, non viene mai letta e non produce nessun rosso. Nessuna istanza oggi e la story vieta strutture nuove; rimandato al giorno che la cartella smette di essere piatta.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Le sette migrazioni sono in `supabase/migrations/`, numerate `0001` … `0007`, e sono **già applicate** al progetto Supabase `Registro`. Nessuna va riscritta, rieseguita, rinumerata o divisa.

Ognuna ha già una testata in prosa che spiega perché lo schema è fatto così, con i rimandi alle decisioni (`D9`, `D13`, `D14`, `D16`). Quella prosa **resta**. La dichiarazione di reversibilità è una cosa diversa e si aggiunge sopra: l'una dice perché la tabella è così, l'altra come si torna indietro.

Cosa c'è già anche fuori dai file:

- `kb-0.md` §5: *«Ogni migrazione è reversibile o dichiara esplicitamente perché non lo è.»* La regola esiste, il formato no, e nei sette file non è applicata. È tutto il debito che questa story chiude.
- `database.md` §7 elenca i sette file e l'ordine obbligato, e rimanda a `kb-0.md` §5.
- `AGENTS.md`, regole non negoziabili: *«Ogni modifica allo schema è un file di migrazione versionato. Mai dalla dashboard.»*
- Il comando dei test esiste dalla Story 1.6: `TZ=UTC node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON 'src/**/*.test.ts'`, tre file sotto `src/lib`.

### Come sono state applicate davvero, e perché cambia le cose

Verificato il 5 agosto 2026, ed è il fatto che governa metà delle scelte di questa story.

**Non c'è nessuna CLI Supabase in questo progetto.** Niente `supabase/config.toml`, niente `supabase` eseguibile sulla macchina, e i nomi dei file non seguono la convenzione della CLI, che vuole `<timestamp>_nome.sql`. Le sette migrazioni risultano registrate sul progetto con versioni a timestamp e nomi uguali ai nomi dei file:

```
20260802153907  0001_extensions
20260802153917  0002_clients
20260802153924  0003_people
20260802153933  0004_questionnaire
20260802153942  0005_assessments_answers
20260802153950  0006_triggers
20260802154000  0007_rls
```

Cioè sono state applicate una per una tramite lo strumento `apply_migration`, che genera da sé la versione e riceve il nome. Le conseguenze:

- **Il numero nel nome del file non è la chiave.** La corrispondenza fra `0002_clients.sql` e la versione `20260802153917` passa solo dal nome. Rinominare un file la romperebbe in silenzio: non si rinomina niente.
- **Non esiste nessun `db push` che rilegga i file.** Il database conserva la propria copia delle istruzioni da quando sono state eseguite. I file nel repository sono il registro di chi legge, non la sorgente da cui il database si aggiorna.
- **Non esiste nessun controllo di impronta** che confronti il file con quello che è stato eseguito. Nessuno si accorgerà mai di una divergenza, il che è precisamente il motivo per cui Task 5 chiede di leggere ogni riga del diff a mano.
- **Non esiste nessun meccanismo `down`.** Non c'è un posto dove una migrazione inversa verrebbe eseguita da sola, e questo conferma AC3 da un'altra direzione: la dichiarazione non può che essere una nota, perché non c'è nessuna macchina che la eseguirebbe.

Esiste anche un secondo progetto Supabase attivo, `Registro Replit` (`itzcjrekvawlclazqihq`), residuo della scelta di piattaforma chiusa da D20. **Non è quello di questo repository e non si tocca.**

### Perché modificare un file già applicato è sicuro, e a quale condizione

La domanda giusta da farsi prima di aprire i sette file: cambiare una migrazione dopo che è stata eseguita non è normalmente una cosa che si fa.

Qui è sicuro per il motivo detto sopra — niente rilegge quei file, niente ne confronta l'impronta, niente li rieseguirà — **a una condizione sola: si toccano solo i commenti.** Finché il diff è fatto di sole righe che cominciano con `--`, il file e lo schema applicato continuano a dire la stessa cosa. Il giorno in cui una riga di SQL cambiasse, il repository descriverebbe un database che non esiste, e nessuno strumento lo segnalerebbe: lo scoprirebbe chi ricostruisce lo schema da zero, mesi dopo, trovandosi un risultato diverso da quello in produzione.

È per questo che Task 5 non chiede «controlla il diff» ma «leggi ogni riga del diff».

### Le quattro decisioni di questa story

1. **La dichiarazione è tre chiavi fisse, non prosa libera.** Prosa libera soddisfa AC1 e non AC2: quando la scrive qualcun altro fra sei mesi, sceglie parole sue, e non c'è più niente da cercare. Tre chiavi fisse sono leggibili da un umano e trovabili da un controllo, e il costo è zero.
2. **Struttura e dati si dichiarano separati.** Ogni `create table` è annullabile con un `drop`, quindi rispondere «sì» sarebbe formalmente esatto e praticamente una bugia: quello che non torna indietro sono le righe. La formula `sì nella struttura, no nei dati` è la sola che risponde alla domanda che uno si fa davvero prima di eseguire.
3. **Le istruzioni di annullamento si scrivono senza `cascade`.** È la decisione meno ovvia e la più utile. `drop table clients cascade` **non** cancella `people` e `assessments`: cancella i loro vincoli di chiave esterna e lascia le righe orfane, senza errore. La forma senza `cascade` invece rifiuta finché qualcosa dipende dalla tabella, e quel rifiuto dice l'unica cosa che serve sapere — c'è una migrazione più recente da annullare prima. Si preferisce un annullamento che fallisce a uno che riesce a metà.
4. **La regola sta in tre posti, e nessuno dei tre è nuovo.** Il formato in `database.md` §7, dove stanno già le convenzioni sulle migrazioni; una riga in `AGENTS.md`, accanto alla regola sulla sicurezza a livello di riga, perché AC2 chiede quella gravità; e `D24` in `00-contesto-e-decisioni.md`, perché `kb-0.md` §8 vuole che una decisione strutturale sia scritta col suo motivo, o fra tre mesi la si rimette in discussione. Nessun documento nuovo: un file di convenzioni in più è esattamente la nota lontana dal codice che AC3 rifiuta.

### La reversibilità delle sette, in una tabella

Il riassunto di quello che Task 2 scrive per esteso. Serve a vedere in un colpo d'occhio dove sta il rischio vero.

| File | Reversibile | Cosa si perde davvero |
|---|---|---|
| 0001 estensioni | sì, dopo 0002 | niente. La ricerca diventa più lenta |
| 0002 clienti | struttura sì, dati no | tutti i clienti |
| 0003 persone | struttura sì, dati no | tutte le persone |
| 0004 questionario | struttura sì, dati no | il questionario. `seed.sql` rimette le 23 approvate, non le riscritte |
| 0005 schede e risposte | struttura sì, dati no | **il lavoro delle call. Nessuna copia altrove** |
| 0006 trigger | trigger sì, funzione non del tutto | niente di dati. `updated_at` si ferma |
| 0007 sicurezza | sì per il database, no per le regole | la protezione delle righe |

Le due righe che contano: **0005** è l'unica i cui dati non si ricostruiscono da nessuna parte, e **0007** è l'unica il cui annullamento è tecnicamente possibile e vietato dalle regole del progetto. Se la story finisse dicendo queste due cose e nient'altro, avrebbe già pagato.

### Trappole note

- **Il `cascade` che sembra pulito.** Già detto due volte, e vale una terza: `drop table clients cascade` lascia in piedi `people` e `assessments` con le righe dentro e senza vincoli. Chi lo scrive pensando «così mi porta via tutto» sta scrivendo una dichiarazione falsa nel file che serve a evitare i disastri.
- **`create or replace` non è reversibile per definizione.** In 0006 la funzione `set_updated_at` è creata così: `drop function` la toglie, ma se una funzione con quel nome fosse esistita prima, la sua definizione è stata sovrascritta e non sta da nessuna parte. La dichiarazione lo dice invece di far finta di niente.
- **`if not exists` in 0001.** La migrazione potrebbe non aver creato l'estensione, e allora `drop extension` toglierebbe qualcosa che non ha messo lei. Sul progetto vero non è il caso, ma la dichiarazione non deve promettere cose che dipendono da quel controllo.
- **L'ordine di annullamento non è simmetrico dentro un file.** In 0004 le tre tabelle si tolgono `questions`, `question_blocks`, `questionnaires`, cioè al contrario di come sono create. Chi copia l'ordine di creazione scrive tre `drop` di cui il primo fallisce.
- **Il file di prova di Task 4.** Un `0008_prova.sql` dimenticato nella cartella è, per chiunque lo legga dopo, una migrazione mai applicata. Si cancella, e `git status` lo conferma.
- **La riga del titolo.** Le tre chiavi vanno **sotto** `-- 000N nome` e non sopra: la prima riga di ogni file è il suo titolo e resta tale. Il controllo di Task 4 cerca lì, e se le trovasse altrove sarebbe rosso su un file corretto — cioè il modo più veloce di far disattivare un controllo.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione nuova**, nessuna tabella, colonna, indice, vincolo, trigger o policy. Nessun `apply_migration`, nessun `execute_sql` che scriva. Le sole letture ammesse sono quelle di Task 5.
- **Nessun file `.down.sql`**, nessuna cartella `rollback/`, nessun `ROLLBACK.md`, nessuno strumento che generi o applichi migrazioni inverse. AC3 chiude la questione.
- **Nessuna installazione della CLI Supabase**, nessun `supabase init`, nessun `config.toml`. Sarebbe un cambio di infrastruttura, che `kb-0.md` §9 vieta senza una decisione scritta. La story vive benissimo senza.
- **Nessuna rinumerazione, nessuna rinominazione, nessuna unione o divisione** dei sette file. Il nome è la chiave verso la versione registrata.
- **Nessuna modifica a `kb-0.md`**: la regola generale c'è già.
- **Una sola decisione nuova in `00-contesto-e-decisioni.md`, `D24`**, e nient'altro in quel file oltre alla riga dell'intestazione. Nessuna decisione esistente si riapre, si riscrive o si marca superata.
- **Nessuna dipendenza nuova**, nessun linter, nessun `husky`, nessun workflow di CI. La voce di `deferred-work.md` sul fatto che `npm test` non sia attraversato da nessun cancello **resta aperta**: questa story aggiunge un controllo, non il cancello che lo esegue, e dire il contrario sarebbe chiudere una voce che non è chiusa.
- **Nessuna chiusura delle altre voci rimandate.** Nessuna viene sfiorata: questa story non tocca `src/app`, non tocca `src/lib` salvo forse un file di test, e non tocca nessuna query.
- **`seed.sql` non è una migrazione** e non riceve la dichiarazione. Contiene dati, non schema, ed è rieseguibile per sua natura. Se in Task 3 sembra utile dirlo in `database.md` §7, si dice in mezza riga.

### Test

Un file solo, ed è tutto quello che questa story mette sotto test.

Cosa entra, e perché rientra in `kb-0.md` §7 anche se non somiglia agli altri: leggere una testata e dire se è conforme è **una trasformazione** da testo a verdetto, cioè la stessa categoria di `parseClientFilters`. E come le altre, rompendosi non produce un errore: produce un verde su una migrazione senza dichiarazione, cioè il difetto esatto che il controllo esiste per trovare.

Cosa **non** entra: la correttezza dell'SQL di annullamento. Nessun programma può decidere se `drop table people;` è la cosa giusta da scrivere in quel file — quello lo verifica Luca in Task 6, ed è il motivo per cui Task 6 esiste.

Restano fuori, come dalle Story 1.6 e 1.7, i candidati naturali già elencati là: `parseDecisionRoles`, `personDisplayName`, `normalizeTag`, `collectTagSuggestions`, `normalizeClientName`. Non si aggiungono adesso, sarebbero lavoro non chiesto.

### Project Structure Notes

```
supabase/migrations/
├── 0001_extensions.sql          + 3 righe di commento in testa. SQL invariato.
├── 0002_clients.sql             idem
├── 0003_people.sql              idem
├── 0004_questionnaire.sql       idem
├── 0005_assessments_answers.sql idem
├── 0006_triggers.sql            idem
└── 0007_rls.sql                 idem

supabase/migrations.test.ts      NUOVO — il controllo delle testate
package.json                     + il secondo modello nello script test
docs/database.md                 §7, il formato e le sue regole
docs/00-contesto-e-decisioni.md  + D24, e la data nell'intestazione
AGENTS.md                        una riga fra le regole non negoziabili
```

Niente sotto `src/` cambia: è la prima story dell'epica che non tocca l'applicazione.

Convenzioni vincolanti (`kb-0.md` §2): file in `kebab-case`, funzioni in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`, nomi in inglese nel codice e in italiano in quello che si legge. Le tre chiavi della dichiarazione sono in italiano perché sono testo che si legge, come le rotte e i parametri dei filtri.

Nessun file supera le 200 righe, e il file di test resta ben sotto: se cresce, dentro c'è più di una cosa.

### Piattaforma in uso, verificata

Da `package.json` e dalla macchina, il 5 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata, nessuna entra.

Dal progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), regione `eu-west-1`, PostgreSQL 17.6, il 5 agosto 2026: le sette migrazioni registrate con le versioni riportate sopra, e `pg_trgm` installata alla `1.6` nello schema `extensions`.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `node --test` accetti due modelli come argomenti separati.** È quello che Task 4 chiede e non si dà per buono: si esegue `npm test` e si guarda che i test dei tre file sotto `src/lib` continuino a girare *e* che il nuovo giri. Se un modello ne escludesse l'altro, il segnale è che i tre test vecchi sono spariti dal conteggio — un test che sparisce non è rosso, è assente, ed è il modo in cui una suite si svuota senza che nessuno se ne accorga.
- **Che un `.ts` sotto `supabase/` non disturbi `next build`.** `tsconfig.json` include `**/*.ts`, quindi quel file viene controllato dai tipi; non sta nel grafo dell'applicazione, quindi non dovrebbe entrare nel bundle. «Non dovrebbe» non basta: `npm run build` lo dice.
- **Che `git diff` sulle sette migrazioni contenga solo righe di commento.** Non è una deduzione, è un controllo, e Task 5 lo chiede riga per riga.

### Intelligence dai commit

Da `4d2ef1d`, `f407faa` e `3352e51` (Story 1.7), da `4ac1646` e `0cc87f5` (Story 1.6), le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere.** La revisione della 1.6 ne ha rimesse vuote tre, e la 1.6 ha lasciato vuota quella sul limite di righe scrivendo accanto perché. Una casella spuntata su un compito non finito è un segnale di completamento falso.
- **Task di verifica diviso in due**: quello che l'agente esegue e quello che richiede Luca. Qui la seconda parte non è una sessione del browser ma una lettura, e resta comunque la condizione per andare a `done`.
- **Quello che non si è visto non si dichiara verificato.** La 1.7 ha scritto nel Dev Agent Record che la barra non è stata vista resa, invece di spuntare la casella.
- **Un test si vede fallire prima di crederci.** La 1.7 ha una tabella delle rotture di proposito nel Dev Agent Record: 7 rossi su 21, poi ripristinato con `git diff` a zero. Task 4 chiede la stessa cosa.
- **Le decisioni strutturali si scrivono dove sono state prese** (`kb-0.md` §8). La revisione della 1.6 ha dovuto aggiungere D23 e una nota a `database.md` §5 perché due scelte vivevano solo nel file della story. La domanda 4 chiede se qui serva lo stesso.
- **Fuori dal perimetro si chiede prima.** La 1.7 si è fermata davanti a un `ERR_MODULE_NOT_FOUND` che richiedeva un file non suo, e ha chiesto invece di decidere.
- **Nei log `code` e `message`, mai `details`.** Qui non si scrive nessun log, ma vale se ne servisse uno.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.8: Poter tornare indietro da una modifica di schema]
- Il debito dichiarato dall'epica, «la reversibilità non dichiarata nelle sette migrazioni»: [Source: docs/bmad/pianificazione/epics.md#Epic 1: Clienti, persone, elenco che si ritrova]
- La regola generale che questa story rende eseguibile, e la reversibilità come requisito: [Source: docs/kb-0.md#5. Database]
- Migrazioni prima del codice, e la domanda «esiste un modo di tornare indietro»: [Source: docs/kb-0.md#10. Rilascio]
- Cosa entra sotto test e cosa no: [Source: docs/kb-0.md#7. Verifica]
- Nessun cambio di infrastruttura senza decisione scritta: [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- I sette file, l'ordine obbligato, il divieto della dashboard: [Source: docs/database.md#7. Migrazioni]
- I vincoli e le chiavi esterne da cui esce l'ordine di annullamento: [Source: docs/database.md#3. Tabelle]
- Le policy e la sicurezza a livello di riga di 0007: [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- La scelta della piattaforma e la regione europea: [Source: docs/00-contesto-e-decisioni.md#D20. Piattaforma: Next.js, Supabase, Vercel]
- Regione europea e cancellazione vera dei dati personali: [Source: docs/kb-0.md#4. Dati personali]
- Migrazioni versionate, mai dalla dashboard, e la dashboard che serve a guardare: [Source: docs/guide-for-vercel-supabase.md#4. Regole sul database]
- Story precedente, comando dei test, pattern di verifica: [Source: docs/bmad/implementazione/1-7-cercare-e-filtrare-l-elenco.md]
- Nascita del comando dei test e criterio di cosa entra sotto test: [Source: docs/bmad/implementazione/1-6-ordinare-l-elenco-per-ultima-attivita-vera.md]
- La voce sul fatto che `npm test` non è attraversato da nessun cancello, che resta aperta: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, e le risposte applicate

**Chiuse tutte e cinque da Luca il 5 agosto 2026: sì a tutte.** Le risposte sono già dentro i task, quindi qui non resta niente da decidere: questa sezione serve a chi fra tre mesi si chiede perché la story è fatta così.

Le prime tre e la quinta confermano il default già scritto. **La quarta lo ribalta**: `00-contesto-e-decisioni.md` riceve `D24`, e il lavoro corrispondente sta in Task 3. È la differenza rispetto alla Story 1.7, dove la stessa domanda aveva avuto risposta contraria e la decisione era rimasta nel file della story.

1. *Confermata: il controllo si fa.* **Il controllo di Task 4 si fa?** Le tre AC, lette alla lettera, chiedono sette blocchi di commento e una regola scritta: un controllo automatico è una cosa in più. L'argomento per farlo è che AC2 parla di *una migrazione nuova*, che oggi non esiste, quindi senza qualcosa che se ne accorga quel criterio non è verificabile né oggi né mai — resta una frase. L'argomento contro è che `AGENTS.md` vieta le funzionalità non richieste, e che `deferred-work.md` ricorda che oggi nessun cancello esegue `npm test`, quindi il controllo protegge solo chi si ricorda di lanciarlo. Default: **si fa**, perché un controllo che qualcuno lancerà è comunque più di una frase che nessuno applica. Confermi?
2. *Confermata: `supabase/migrations.test.ts`, con il secondo modello in `package.json`.* **Se il controllo si fa, va in `supabase/migrations.test.ts` con un secondo modello in `package.json`, o in `src/lib/migrations.test.ts` senza toccare niente?** La prima mette il test accanto al suo soggetto ma tocca `package.json`; la seconda lascia `package.json` in pace ma mette in `src/lib` un test che non prova nessun modulo di `src/lib`. Default: **la prima**. Confermi?
3. *Confermata: la riga si scrive.* **La riga in `AGENTS.md` si scrive?** Il formato va comunque in `database.md` §7; la domanda è solo se una riga vada anche fra le regole non negoziabili. L'argomento per farlo è testuale: AC2 dice *«un difetto come lo sarebbe una policy mancante»*, e la regola sulle policy sta proprio lì. Il precedente c'è, la Story 1.6 ci ha aggiunto la riga del comando dei test. Default: **si scrive**, una riga sola, che rimanda a `database.md` per il formato. Confermi?
4. ***Ribaltata: D24 ci va.*** Il default scritto qui sotto era il contrario, e non vale più: il lavoro è in Task 3, e D24 copre la nota-nel-file insieme al divieto di `cascade`, perché sono una decisione sola. **Va registrata una decisione D24 in `00-contesto-e-decisioni.md`?** Il candidato sarebbe la decisione 3, «le istruzioni di annullamento si scrivono senza `cascade`, perché un annullamento che fallisce è meglio di uno che riesce a metà»: è il tipo di scelta che qualcuno rimetterà in discussione fra tre mesi trovandola scomoda. Nella Story 1.7 la stessa domanda ha avuto risposta negativa e la decisione è rimasta nel file della story. Quel file è tuo, quindi lo segnalo invece di modificarlo. Default: **non lo tocco**, la decisione resta scritta qui e il suo motivo in `database.md` §7. Preferisci che ci vada?
5. *Confermata: il valore comincia con `sì` o con `no`, il resto della riga è libero.* **Le tre formule di `Reversibile:` sono queste tre?** `sì`, `sì nella struttura, no nei dati`, `no`. Le sette migrazioni attuali però usano tutte e tre in forme sfumate — 0001 è «sì, ma solo dopo 0002», 0006 «i trigger sì, la funzione non del tutto», 0007 «sì per il database, no per le regole del progetto» — quindi o le formule ammesse diventano quattro o cinque, o il controllo accetta un prefisso fra i tre e poi testo libero. Default: **il controllo pretende che il valore cominci con `sì` o con `no`** e lascia libero il resto della riga, così le sfumature restano leggibili e il controllo resta utile. Confermi, o preferisci tre formule esatte e sfumature spostate in `Cosa si perde`?

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 5 agosto 2026.

### Debug Log References

**Una contraddizione dentro la story, trovata dal controllo che la story chiede di scrivere.** Al primo `npm test` con le sette dichiarazioni in posto: 68 verdi, 1 rosso.

```
✖ 0006_triggers.sql risponde sì o no in «Reversibile»
  AssertionError: «Reversibile» deve cominciare con sì o con no,
  non con «i sei trigger sì, la funzione non del tutto.»
```

Il testo proposto da Task 2 per `0006` viola la regola scritta da Task 1 e confermata alla domanda 5, che vuole il valore che *comincia* con `sì` o con `no`. Le due parti della story non possono valere insieme. **Ha vinto la regola**, per tre motivi: è quella confermata da Luca in una domanda esplicita, è quella su cui si regge il controllo di Task 4, e Task 2 dice di suo che le dichiarazioni proposte vanno verificate e non copiate a occhi chiusi.

La riga di `0006` è quindi diventata `-- Reversibile: sì per i sei trigger, non del tutto per la funzione.` — stesso significato, stessa sfumatura, prefisso conforme. Il testo di Task 2 nella story **non è stato riscritto**: le sezioni modificabili non lo comprendono, e la deviazione sta qui dove si legge accanto al suo motivo.

**Le quattro rotture di proposito** (`kb-0.md` §7: un test che non si è visto fallire non è un test). Una per volta, tutte con ripristino verificato. Le prime due cadono sulla stessa assertion — quella sull'elenco delle chiavi — per due strade diverse:

| Rottura | Dove | Test rossi | Messaggio |
|---|---|---|---|
| Migrazione senza dichiarazione | `0008_prova.sql`, creato apposta | 2 su 72 | «la dichiarazione di reversibilità manca o è incompleta» |
| Tolta la chiave `Come si annulla` | `0005`, quella di mezzo | 1 su 69 | come sopra: l'ordine atteso non torna |
| Dichiarazione spostata sotto una riga di prosa | `0005` | 1 su 69 | «la dichiarazione va sotto la riga del titolo, non altrove» |
| Svuotato il valore di `Reversibile` | `0005` | 2 su 69 | «è presente ma vuota» + «deve cominciare con sì o con no» |

`0008_prova.sql` cancellato e `git status` lo conferma assente. `0005` ripristinato da una copia fuori dal repository: impronta `md5` identica prima e dopo (`55eda68…f2c92`), `diff` vuoto. Suite di nuovo a 69 verdi su 69.

**Le due cose da confermare eseguendo, dette da Dev Notes, sono confermate.**

- `node --test` accetta i due modelli come argomenti separati, e nessuno esclude l'altro: `src/**/*.test.ts` da solo dà 47 test, `supabase/**/*.test.ts` da solo ne dà 22, insieme 69. I tre file sotto `src/lib` continuano a girare — il conteggio è la prova, perché un test che sparisce non è rosso, è assente.
- Un `.ts` sotto `supabase/` non disturba `next build`: `npm run typecheck` e `npm run build` verdi, sette rotte generate come prima. Il file è controllato dai tipi e non entra nel bundle.

**Le dipendenze dichiarate, confermate anche contro il database vero** (Task 5, parte facoltativa, due `select` in sola lettura su `information_schema` e sul catalogo — nessuna scrittura, nessun `drop`, nemmeno in transazione).

Le chiavi esterne che esistono davvero in `public`:

| Chi riferisce | Colonna | Tabella riferita | Conferma la dichiarazione di |
|---|---|---|---|
| `people` | `client_id` | `clients` | 0002 |
| `assessments` | `client_id` | `clients` | 0002 |
| `assessments` | `interviewee_id` | `people` | 0003 |
| `assessments` | `questionnaire_id` | `questionnaires` | 0004 |
| `question_blocks` | `questionnaire_id` | `questionnaires` | 0004, ordine interno |
| `questions` | `block_id` | `question_blocks` | 0004, ordine interno |
| `answers` | `question_id` | `questions` | 0004, primo `drop` |
| `answers` | `assessment_id` | `assessments` | 0005 |

E la sola dipendenza di `0001` che le chiavi esterne non coprono: `clients_name_trgm_idx` usa la classe di operatori `gin_trgm_ops`, che appartiene all'estensione `pg_trgm` nello schema `extensions`. È esattamente il motivo per cui `drop extension pg_trgm` fallisce finché quell'indice esiste.

Nessuna dichiarazione ha dovuto essere corretta dopo questa lettura: coincidono tutte con quello che i vincoli nei file già dicevano.

**Il database non è cambiato.** `list_migrations` sul progetto `Registro` (`izkycpwxuedpkzgpvcxc`) restituisce le stesse sette righe, con le stesse versioni a timestamp riportate in Dev Notes. Nessuna ottava riga.

### Completion Notes List

**Le quattro caselle di Task 6 restano vuote di proposito.** Task 6 è la verifica che richiede Luca, e la cosa che chiede — *leggere le sette dichiarazioni e dire se sono vere* — non è delegabile: nessun programma sa se `drop table people;` è la cosa giusta da scrivere in quel file. Spuntarle sarebbe un segnale di completamento falso, ed è la ragione per cui la story va a `review` e non a `done`.

Quello che Luca deve leggere sono sette blocchi di sei-dieci righe, in testa ai sette file di `supabase/migrations/`. Le due righe su cui conviene fermarsi:

- **`0005`** è l'unica migrazione i cui dati non si ricostruiscono da nessuna parte: schede di prequalifica e risposte, cioè il lavoro delle call.
- **`0007`** è l'unica il cui annullamento è tecnicamente possibile e vietato dalle regole del progetto. Le istruzioni sono scritte perché la domanda «si può tornare indietro» abbia una risposta, non perché siano una strada percorribile.

**Quello che è stato fatto e verificato:**

- Sette dichiarazioni aggiunte, **solo commenti**. Il diff su `supabase/migrations/` è 53 righe aggiunte e **zero rimosse**, tutte comincianti con `--`, lette una per una. Nessuna riga di SQL è cambiata: è la condizione a cui modificare un file già applicato è sicuro, e senza quella il repository descriverebbe un database che non esiste, senza che nessuno strumento lo segnali.
- La prosa che ogni file aveva è intatta e resta sotto la dichiarazione, separata da una riga `--`. In `0005` la riga di separazione c'era già e non è stata duplicata.
- Il formato sta in `docs/database.md` §7 come sottosezione nuova, in prosa: le tre chiavi e il loro ordine, la posizione nel file, il divieto di `cascade` col motivo, l'ordine inverso di annullamento, il fatto che una dichiarazione mancante è un difetto, dove sta il controllo e cosa **non** verifica, e mezza riga su `seed.sql`, che non è una migrazione e non riceve la dichiarazione.
- Una riga sola in `AGENTS.md`, subito sotto quella sulle migrazioni versionate, che rimanda a `database.md` §7 senza ripeterne il formato.
- `D24` in `00-contesto-e-decisioni.md`, con l'intestazione portata a `5 agosto 2026, D24`. Copre la nota-dentro-il-file e il divieto di `cascade` come una decisione sola, col motivo per esteso, e rimanda a `database.md` §7 per il formato invece di duplicarlo.
- `supabase/migrations.test.ts`, 79 righe, nessuna dipendenza nuova: `node:test`, `node:assert/strict`, `node:fs`, `node:path`. Ventidue test, tre per file più uno che verifica che la cartella non sia vuota — senza quello, un percorso sbagliato passerebbe in silenzio, e zero file da controllare non è zero difetti.
- `package.json` guadagna il secondo modello come argomento separato. Il resto della riga è identico: `TZ=UTC` e il silenziamento dell'avviso sono della Story 1.6 e non c'entrano con questa.

**Il perimetro è stato rispettato.** Nessuna migrazione nuova, nessun `apply_migration`, nessun `execute_sql` che scriva, nessuna istruzione di annullamento eseguita nemmeno in transazione. `kb-0.md` non è stato toccato — la regola generale c'era già e questa story la rende eseguibile. Niente sotto `src/`. Nessuna rinumerazione né rinominazione: il nome del file è la chiave verso la versione registrata. La voce di `deferred-work.md` sul fatto che `npm test` non sia attraversato da nessun cancello **resta aperta**: questa story aggiunge un controllo, non il cancello che lo esegue.

### Note della revisione, 5 agosto 2026

La code review non ha trovato violazioni delle tre AC: le sette dichiarazioni ci sono, stanno sotto la riga del titolo, nessuna riga di SQL è cambiata (riverificato: zero righe non-commento aggiunte, zero rimosse), nessuna usa `cascade`, e le dipendenze dichiarate coincidono con i vincoli scritti nei file. Le nove correzioni applicate stanno tutte sotto quella soglia.

**Le tre decisioni chiuse da Luca** stanno in Review Findings, sopra. Due sono diventate lavoro: il controllo del `cascade`, e l'avvertenza accanto allo snippet di `0006` in Task 2. La terza — se `0007` debba dichiarare `no` invece di `sì per il database` — è stata risolta lasciando la dichiarazione com'è: la riga `Cosa si perde` dice già che disattivare la sicurezza a livello di riga è vietato da `AGENTS.md` e da `kb-0.md` §3, quindi la domanda «si può tornare indietro» ha una risposta senza che diventi un invito.

**Il controllo è cresciuto da 22 a 28 test**, quattro per file invece di tre, e da 79 a 104 righe. Tre buchi chiusi:

- **Il prefisso era lasco in un verso e stretto nell'altro.** `startsWith('no')` accettava `non si sa, da verificare` e `nota: da rivedere` — cioè entrava proprio il «non lo so» che la dichiarazione esiste per escludere — e rifiutava `Sì` maiuscolo, che è l'ortografia naturale di chi legge `database.md` §7 e non il test. Ora il confronto pretende la parola intera (`(?!\p{L})`) ed è in minuscolo e in NFC su **entrambi** i lati: la `normalize('NFC')` era applicata solo al valore, cioè era mezzo rimedio.
- **La contiguità non era verificata.** Il nome del test prometteva «le tre chiavi, subito sotto il titolo» e l'unica asserzione di posizione era su `entries[0].line`: le altre due potevano stare trenta righe più giù, separate da prosa arbitraria, e restare verdi. Ora `parseDeclaration` si ferma alla prima riga che non è né una chiave né una continuazione (`--` con due spazi in più della prosa), quindi una dichiarazione interrotta produce un elenco di chiavi incompleto e il rosso arriva da solo. L'asserzione separata sulla posizione è stata tolta perché con questa forma non è più raggiungibile: il ciclo parte da `FIRST_DECLARATION_LINE` e si ferma subito se lì non c'è una chiave.
- **Il divieto di `cascade` non aveva nessun presidio**, pur essendo la sola regola di D24 che un programma possa verificare. Cerca `drop … cascade` e non la parola isolata: il `[^;]*` è ciò che impedisce di leggere come violazione il `Mai con cascade` che `0001` scrive dentro la propria dichiarazione.

**Le quattro rotture di proposito della revisione**, su un `0008_prova.sql` usa e getta — così nessun file vero è stato toccato, che è più sicuro del ripristino da copia usato in prima stesura:

| Rottura | Atteso | Esito |
|---|---|---|
| `drop table prova cascade;` | rosso | ✖ «non annulla con cascade», 1 su 80 |
| `Reversibile: non si sa, da verificare` | rosso | ✖ «risponde sì o no», 1 su 80 |
| `Reversibile: Sì nella struttura, no nei dati.` | **verde** | 80 su 80 — la maiuscola ora passa |
| Riga di prosa fra `Come si annulla` e `Cosa si perde` | rosso | ✖ «le tre chiavi, di seguito», 1 su 80 |

`0008_prova.sql` cancellato, `git status` lo conferma assente. Suite di nuovo a 76 su 76 (47 sotto `src`, 28 sotto `supabase`, più quello sulla cartella non vuota). `npm run typecheck` e `npm run build` verdi, sette rotte come prima.

**Le due testate riscritte perché non erano SQL eseguibile.** `0006` e `0007` scrivevano «e gli altri cinque» e «e le altre sei», lasciando 11 istruzioni su 13 da ricostruire a mano: viola il vincolo che questa story stessa scrive in Task 1 e in `database.md` §7, ed è la stessa auto-contraddizione già intercettata sul prefisso di `0006`. Ora ci sono tutte, per nome. In `0007` è stata aggiunta la riga che dice perché l'ordine conta: togliere prima le policy lascia la sicurezza a livello di riga attiva e quindi un rifiuto di tutto, mentre disattivarla per prima aprirebbe le tabelle per il tempo che resta.

**Una correzione di merito su `0001`:** «Reversibile: sì, ma solo dopo 0002» si legge naturalmente come «dopo che 0002 è stata applicata», cioè il contrario del significato. Ora dice «dopo aver annullato 0002».

**Due correzioni di fatto nei documenti.** `drop … cascade` non è muto: emette una `notice` che elenca i vincoli caduti. La sostanza regge — una `notice` non è un errore, non ferma niente e finisce in un registro che nessuno rilegge — ma «senza dire niente» era falso in `D24` e in `database.md` §7, cioè in due testi scritti apposta per essere creduti nel momento peggiore. E l'albero dei file di §7 ora elenca `supabase/migrations.test.ts`, che la prosa poco sotto nomina come il controllo di riferimento; nello stesso blocco `seed.sql` era mostrato alla radice del repository invece che sotto `supabase/`.

### File List

| File | Cosa |
|---|---|
| `supabase/migrations/0001_extensions.sql` | + 7 righe di commento. SQL invariato |
| `supabase/migrations/0002_clients.sql` | + 6 righe di commento. SQL invariato |
| `supabase/migrations/0003_people.sql` | + 6 righe di commento. SQL invariato |
| `supabase/migrations/0004_questionnaire.sql` | + 10 righe di commento. SQL invariato |
| `supabase/migrations/0005_assessments_answers.sql` | + 6 righe di commento. SQL invariato |
| `supabase/migrations/0006_triggers.sql` | + 13 righe di commento. SQL invariato |
| `supabase/migrations/0007_rls.sql` | + 23 righe di commento. SQL invariato |
| `supabase/migrations.test.ts` | **nuovo** — il controllo delle testate, 104 righe, 28 test |
| `package.json` | secondo modello nello script `test` |
| `docs/database.md` | §7, la sottosezione sul formato della dichiarazione |
| `docs/00-contesto-e-decisioni.md` | `D24` e la data nell'intestazione |
| `AGENTS.md` | una riga fra le regole non negoziabili |
| `docs/bmad/implementazione/deferred-work.md` | tre voci rimandate dalla revisione |
| `docs/bmad/implementazione/sprint-status.yaml` | stato della story |
| `docs/bmad/implementazione/1-8-poter-tornare-indietro-da-una-modifica-di-schema.md` | caselle, Dev Agent Record, stato |

## Change Log

| Data | Chi | Cosa |
|---|---|---|
| 5 agosto 2026 | create-story | Prima stesura, con lo stato reale delle sette migrazioni verificato sul progetto Supabase |
| 5 agosto 2026 | Luca | Sì a tutte e cinque le domande. Le prime tre e la quinta confermano il default; la quarta lo ribalta e porta `D24` dentro Task 3 |
| 5 agosto 2026 | dev-story | Task 1-5 eseguiti. Sette dichiarazioni aggiunte come soli commenti, formato in `database.md` §7, riga in `AGENTS.md`, `D24` registrata, controllo in `supabase/migrations.test.ts` visto fallire su tre rotture diverse. Il testo proposto per `0006` è stato corretto perché violava la regola della story stessa. Task 6 resta a Luca |
| 5 agosto 2026 | code-review | Nessuna violazione delle tre AC. Tre decisioni chiuse da Luca e nove correzioni applicate: tre buchi del controllo (prefisso lasco su «non» e stretto su «Sì», contiguità non verificata, `cascade` non presidiato), le testate di `0006` e `0007` rese SQL eseguibile, la riga `Reversibile` di `0001` disambiguata, due correzioni di fatto in `D24` e `database.md` §7. Tre voci rimandate |
| 5 agosto 2026 | Luca | Story chiusa a `done`. Le caselle di Task 6 restano vuote: la lettura delle sette dichiarazioni è sua e non si registra al posto suo |
