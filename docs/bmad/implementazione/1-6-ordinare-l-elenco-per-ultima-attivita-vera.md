---
baseline_commit: cee425a6942b78485197b890080bc3188d25fa69
---

# Story 1.6: Ordinare l'elenco per ultima attività vera

Status: review

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 4 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want vedere in cima all'elenco i clienti su cui ho lavorato per ultimo,
so that riapro lo strumento e riprendo da dove ero, invece di cercare.

## Acceptance Criteria

**AC1 — l'ultima attività comprende le schede, non solo il cliente**
**Given** un cliente modificato ieri e un cliente la cui scheda di prequalifica è stata modificata oggi
**When** apro l'elenco
**Then** il secondo sta sopra il primo, perché l'ultima attività è il maggiore fra `clients.updated_at` e l'ultima modifica delle sue schede (`database.md` §5, FR11)

**AC2 — un cliente senza schede non sparisce e non finisce in fondo**
**Given** un cliente senza nessuna scheda
**When** calcolo la sua ultima attività
**Then** vale il suo `updated_at`, senza righe perse dal join

**AC3 — la data si legge come la legge un umano**
**Given** una data di ultima attività
**When** la mostro in tabella
**Then** appare in monospaziato, in forma relativa entro la settimana e assoluta oltre (UX-DR4, UX-DR12)

**AC4 — esiste un modo di eseguire i test, e due cose ne hanno uno**
**Given** il progetto senza test
**When** questa storia viene chiusa
**Then** esiste un comando che esegue i test e almeno la formattazione della data e il calcolo dell'ultima attività ne hanno uno, perché sono la logica che rompendosi produce dati sbagliati (`kb-0.md` §7)

## Tasks / Subtasks

- [x] **Task 1 — Il modulo puro dell'ultima attività** (AC: 1, 2)
  - [x] Creare `src/lib/last-activity.ts`. **Nessun import di React né di Supabase**, tutto esportato: è il patto già in piedi con `client-fields.ts`, `client-status.ts`, `client-tags.ts`, `person-fields.ts`, `decision-roles.ts`, ed è la condizione per cui Task 5 può metterci un test sopra senza riscrivere niente.
  - [x] La forma minima, che non chiede la riga intera. Un modulo puro non si lega allo schema: chiede le due cose che gli servono, come `personDisplayName` e `collectTagSuggestions`.

    ```ts
    export type ActivityRow = {
      updated_at: string
      assessments: readonly { updated_at: string }[]
    }
    ```

  - [x] `lastActivityAt(row: ActivityRow): string` — restituisce **la stringa ISO vincente**, non un numero: chi la riceve la passa a `formatLastActivity`, che prende una stringa. Regola: il maggiore fra `row.updated_at` e ognuno degli `assessments[].updated_at`.
  - [x] **Il confronto passa da `Date.parse`, mai dal confronto fra stringhe.** `timestamptz` arriva da PostgREST come `2026-08-04T10:00:00.123456+00:00`: due valori con precisione o scostamento diversi si ordinano male alfabeticamente e giusto come numeri. È esattamente il difetto che «rompendosi produce dati sbagliati» e che questa story mette sotto test.
  - [x] Una data che non si legge (`Date.parse` risponde `NaN`) **perde contro qualsiasi data valida** e non fa cadere la pagina. Se nessuna è valida vince `row.updated_at`, che nello schema è `not null` e quindi c'è sempre.
  - [x] `byLastActivityDesc<T extends ActivityRow & { name: string }>(a: T, b: T): number` — il comparatore. Più recente prima; **a parità esatta ordina per nome**, con `Intl.Collator('it')` a livello di modulo come i formattatori di `format-date.ts`. Senza il secondo criterio due clienti con lo stesso istante cambiano posto a ogni ricarica, e un elenco che si muove da solo è indistinguibile da un difetto.
  - [x] `Array.prototype.sort` è stabile dal 2019, ma la stabilità dipende dall'ordine di partenza, cioè da quello che decide il database: il criterio sul nome sta scritto qui perché la stabilità che serve deve essere **dichiarata**, non dedotta.
  - [x] Il file resta sotto le cinquanta righe. Se cresce, dentro c'è più di una cosa (`kb-0.md` §2).

- [x] **Task 2 — L'elenco legge anche le schede** (AC: 1, 2)
  - [x] `src/app/(app)/clienti/page.tsx`, unica query da toccare. La `select` prende in più le schede del cliente, tramite la chiave esterna `assessments_client_id_fkey` che PostgREST già conosce:

    ```ts
    .from('clients')
    .select('id, name, status, tags, updated_at, assessments(updated_at)')
    .order('updated_at', { ascending: false })
    ```

  - [x] **Mai `assessments!inner(...)`.** L'innesto con `!inner` diventa un join interno e **fa sparire dall'elenco ogni cliente senza schede**, che oggi sono tutti. È il modo esatto in cui AC2 fallisce, ed è invisibile finché non esiste almeno una scheda: la forma predefinita è un join esterno e restituisce `assessments: []`.
  - [x] La sicurezza a livello di riga vale anche sulle righe innestate: `assessments_owner_all` (`0007_rls.sql:32`) filtra le schede altrui dentro la stessa richiesta. Nessun controllo da riscrivere lato applicazione.
  - [x] **Facoltativo, e da provare prima di tenerlo:** limitare le schede innestate alla più recente con `.order('updated_at', { referencedTable: 'assessments', ascending: false })` e `.limit(1, { referencedTable: 'assessments' })`. Se la coppia di opzioni non si comporta come documentato in `@supabase/supabase-js ^2.111.0`, **si toglie e non succede niente**: `lastActivityAt` calcola il massimo su un elenco di qualsiasi lunghezza proprio per non dipendere da questo. Quello che si sceglie va scritto nel Dev Agent Record. Non si dà per verificato quello che non si è visto (`kb-0.md` §1).
  - [x] L'ordinamento finale è in memoria: `const rows = [...data].sort(byLastActivityDesc)`. `.order('updated_at')` sul database **resta** e non è ridondante: dà un ordine di partenza determinato e tiene l'elenco sensato anche nel caso in cui il calcolo non trovi niente da correggere.
  - [x] **La cella mostra l'ultima attività, non `updated_at`.** `page.tsx:85` oggi rende `formatLastActivity(row.updated_at)` e diventa `formatLastActivity(lastActivityAt(row))`. Senza questa riga l'elenco si ordinerebbe per una data e ne mostrerebbe un'altra, che è peggio di prima: due clienti nell'ordine giusto con accanto due date che dicono il contrario.
  - [x] `ClientListRow` si allarga con `assessments`. Il tipo si continua a derivare da `ClientRow` per le colonne del cliente: nessun elenco di campi riscritto a mano.
  - [x] `data` non si muta: `.sort()` ordina sul posto, e ordinare sul posto un array che arriva da un client di rete è il tipo di effetto che si scopre due schermate più in là.

- [x] **Task 3 — La data dice il giorno giusto** (AC: 3)
  - [x] La colonna esiste già ed è già in monospaziato: `page.tsx:84-86` rende `formatLastActivity` dentro `<td className="data">`, e `.data` porta `--font-data` (`globals.css:260`). **La forma visiva di AC3 è in piedi dalla Story 1.1 e non si rifà.** Quello che manca è che il valore sia giusto.
  - [x] **Difetto 1, il giorno civile.** `format-date.ts:19` divide una differenza in millisecondi per 86.400.000: conta periodi di 24 ore, non giorni. Una modifica delle 23:00 di ieri, guardata alle 08:00 di stamattina, produce `days = 0` e si mostra come `oggi`. Va sostituito con la differenza fra **giorni civili**, che è quello che una persona intende quando legge `ieri`.
  - [x] **Difetto 2, il fuso.** `absoluteFormat` non dichiara `timeZone`, e questa funzione gira **sul server**: su Vercel il fuso è UTC, in casa è Roma. Una modifica delle 00:30 di Roma si rende come il giorno prima. Si dichiara un fuso unico nel modulo:

    ```ts
    const TIME_ZONE = 'Europe/Rome'
    ```

    Un identificativo di fuso non è un colore: la regola «nessun valore fuori dai token» riguarda `design-system.md`, non questo. Sta in una costante sola perché lo usano due formattatori.
  - [x] Il giorno civile si ricava dalle parti formattate nel fuso dichiarato, non da `getDate()`, che risponde nel fuso della macchina:

    ```ts
    const dayFormat = new Intl.DateTimeFormat('it-IT', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    })
    ```

    Da `formatToParts` si compone `Date.UTC(anno, mese - 1, giorno) / MS_PER_DAY`: due istanti dello stesso giorno a Roma danno lo stesso numero, e la differenza fra due numeri è la differenza in giorni. Con `noUncheckedIndexedAccess` attivo, `parts.find(...)` è `| undefined` e va gestito con un controllo, **mai con un `as`**.
  - [x] Le soglie restano quelle di oggi e quelle di `design-system.md` §5: `0 → oggi`, `1 → ieri`, `2..6 → «N giorni fa»`, `>= 7 → data assoluta`. Una data nel futuro (differenza negativa) si legge `oggi`, come adesso.
  - [x] `absoluteFormat` prende `timeZone: TIME_ZONE`. **`clockFormat` no**, e non è una dimenticanza: `formatClockTime` gira solo nel browser, dentro `SaveIndicator`, e il commento in testa al file spiega perché. Imporgli un fuso fisso sarebbe una risposta a un problema che non ha.
  - [x] La firma `formatLastActivity(iso: string, now: Date = new Date())` **non cambia**: il secondo parametro esiste già ed è quello che rende la funzione verificabile senza toccare l'orologio della macchina.

- [x] **Task 4 — Il comando che esegue i test** (AC: 4)
  - [x] **Nessuna dipendenza nuova.** Node 24 esegue i test e legge TypeScript da solo: `node --test` scopre i file, toglie i tipi e li manda. Una libreria di test qui aggiungerebbe un albero di dipendenze per sostituire una riga di `package.json` (`kb-0.md` §2, `AGENTS.md`).
  - [x] In `package.json`, accanto agli altri quattro:

    ```json
    "test": "node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON 'src/**/*.test.ts'"
    ```

    Il modello di file è esplicito e **non si toglie**: senza, la scoperta parte dalla radice e attraversa anche `.next`. `--disable-warning` spegne l'avviso sul tipo di modulo mancante; l'alternativa sarebbe `"type": "module"` in `package.json`, che romperebbe `__dirname` in `next.config.ts`. Non si fa.
  - [x] In `tsconfig.json`, accanto a `strict`:

    ```json
    "allowImportingTsExtensions": true
    ```

    Serve perché Node, per risolvere un modulo TypeScript, vuole il nome vero del file: un test scrive `from './format-date.ts'` e senza questa opzione `npm run typecheck` risponde `TS5097`. L'opzione richiede `noEmit`, che è già attivo. **Verificato il 4 agosto 2026** sul progetto: con l'opzione, `npx tsc --noEmit` e `node --test` passano entrambi.
  - [x] I test stanno **accanto al modulo che provano**, `src/lib/<nome>.test.ts`, e non in una cartella separata. `tsconfig.json` include già `**/*.ts`, quindi entrano nel controllo dei tipi senza toccare `include`.
  - [x] In `AGENTS.md`, sezione Comandi, la riga `# test: non ancora` diventa `# test: npm test`. È l'unica modifica a quel file, ed è dovuta: da qui in poi la riga sarebbe falsa.
  - [x] Verificare che `npm run build` continui a passare: i file di test non sono importati da nessuna rotta, quindi non entrano nel pacchetto, ma il controllo dei tipi della build li vede.

- [x] **Task 5 — I due test** (AC: 4)
  - [x] `src/lib/last-activity.test.ts`. Il calcolo dell'ultima attività è il motivo per cui questa story esiste, quindi si prova per intero:
    - cliente senza schede → vince il suo `updated_at` (**è AC2**, e va scritto come tale)
    - cliente con una scheda più recente → vince la scheda (**è AC1**)
    - cliente con una scheda più vecchia → vince il cliente
    - più schede → vince la più recente, e non l'ultima dell'array
    - due formati di `timestamptz` che ordinano male come stringhe e bene come date: è il difetto che il test esiste per impedire
    - una data illeggibile fra le schede → non vince e non fa cadere niente
    - il comparatore: a parità esatta di istante, ordina per nome
  - [x] `src/lib/format-date.test.ts`, con `now` passato a mano — mai `new Date()` dentro un test:
    - stesso giorno civile → `oggi`
    - **23:00 di ieri guardate alle 08:00 di oggi → `ieri`**: è il difetto che Task 3 chiude, e questo è il test che impedisce di riaprirlo
    - due giorni → `2 giorni fa`
    - sei giorni → `6 giorni fa`
    - sette giorni → forma assoluta `gg/mm/aaaa`
    - un istante che a Roma è già il giorno dopo rispetto a UTC → si rende il giorno di Roma
    - una data futura → `oggi`
  - [x] Forma dei test: `node:test` e `node:assert/strict`, import con estensione `.ts`. Niente impalcature, niente aiutanti condivisi: due file che si leggono dall'alto in basso.

    ```ts
    import { test } from 'node:test'
    import assert from 'node:assert/strict'

    import { lastActivityAt } from './last-activity.ts'
    ```

  - [x] `npm test` passa. Un test che non è stato visto fallire quando doveva non è un test: prima di chiudere, rompere di proposito una riga del calcolo e verificare che il test se ne accorga.

- [x] **Task 6 — La verifica a mano** (AC: 1, 2, 3, 4)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as` aggiunto.
  - [x] `npm run build` passa.
  - [x] `npm test` passa, e i due file di test esistono dove dice Task 4.
  - [x] `last-activity.ts` non importa né React né Supabase.
  - [x] `page.tsx` resta sotto le 200 righe; `format-date.ts` e `last-activity.ts` pure.
  - [x] La `select` **non** contiene `!inner`.
  - [x] Nessun file fuori dall'elenco di «Cosa cambia questa story» è stato aperto.

  Richiede una sessione, la fa Luca:
  - [ ] Con l'elenco pieno: l'ordine è quello di prima, perché senza schede l'ultima attività è `clients.updated_at` e il calcolo non cambia niente. **Nessun cliente è sparito** (AC2).
  - [ ] Modifico un campo di un cliente in fondo all'elenco: sale in cima. È il comportamento di oggi e non deve regredire.
  - [ ] Aggiungo una persona a un cliente: **non** sale in cima. È voluto — le persone non entrano nella definizione di ultima attività (`database.md` §5, e le Dev Notes della Story 1.5).
  - [ ] La colonna `Ultima attività` è in monospaziato, allineata in colonna, e dice `oggi` per quello appena toccato.
  - [ ] I quattro stati dell'elenco reggono ancora: pieno, vuoto (nessun cliente), in caricamento (gli scheletri di `loading.tsx`), in errore (il riquadro con `Riprova`).
  - [ ] Larghezza 375px: la tabella resta leggibile e non scorre di lato.
  - [ ] Nessun errore in console, e nessun avviso di idratazione sulla colonna delle date.

  Rimandato all'Epic 3, quando le schede esisteranno davvero (da scrivere nel Dev Agent Record, non da spuntare oggi):
  - [ ] Una scheda modificata oggi su un cliente fermo da un mese lo porta in cima (AC1 provato sui dati veri).

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story.** Lo schema che serve è applicato dal primo giorno, e l'Epic 1 dichiara di non portarne (`epics.md`, Implementation Notes dell'Epic 1).

| Pezzo | Dove | Stato |
|---|---|---|
| Tabella `assessments` con `client_id` e `updated_at` | `supabase/migrations/0005_assessments_answers.sql:12` | applicata, **oggi vuota** |
| Chiave esterna `assessments_client_id_fkey` | `0005_assessments_answers.sql:15` | è quella che rende possibile l'innesto |
| Policy `assessments_owner_all` | `0007_rls.sql:32` | attiva, vale anche sulle righe innestate |
| Trigger `assessments_set_updated_at` | `0006_triggers.sql` | attivo |
| Tipi generati, `assessments` e le sue relazioni | `src/lib/database.types.ts:74`, `:131` | pronti, **non si modificano a mano** |
| `formatLastActivity`, con `now` già iniettabile | `src/lib/format-date.ts:17` | **si corregge, non si riscrive** |
| Colonna `Ultima attività` in monospaziato | `page.tsx:84-86` con `.data` in `globals.css:260` | **AC3 visivamente già in piedi** |
| Tabella senza griglia, righe a 56, hover | `globals.css:268-292` | pronta |
| `ErrorState`, stato vuoto, scheletri di `loading.tsx` | `components/error-state.tsx`, `clienti/loading.tsx` | pronti, **non si toccano** |
| `openSession` | `src/lib/supabase/session.ts` | non serve qui: la pagina apre il client da sé |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/last-activity.ts` — il calcolo e il comparatore. Puro.
- `src/lib/last-activity.test.ts` — il test del calcolo.
- `src/lib/format-date.test.ts` — il test della formattazione.

**Modificati**
- `src/app/(app)/clienti/page.tsx` — la `select`, il tipo di riga, l'ordinamento in memoria, e la stringa passata a `formatLastActivity`. **Nient'altro**: intestazione, card, stati, colonne e markup restano identici.
- `src/lib/format-date.ts` — il fuso dichiarato, il giorno civile, `timeZone` su `absoluteFormat`. `formatClockTime` invariata.
- `package.json` — una riga negli script.
- `tsconfig.json` — una riga nelle opzioni.
- `AGENTS.md` — la riga del comando dei test.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/loading.tsx`, `src/app/(app)/clienti/nuovo/*`, tutto `src/app/(app)/clienti/[id]/*`, `actions.ts`, `people-actions.ts`, `person-edit-actions.ts`, `src/components/*`, `src/lib/use-editable-field.ts`, `src/lib/use-write.ts`.

**In particolare `globals.css` non si apre.** La tabella, la colonna in monospaziato e l'altezza di riga esistono e sono già quelle che AC3 e UX-DR4 chiedono.

### Le tre decisioni di questa story

**1. L'ordinamento si calcola in memoria, e non arriva una migrazione.**

`database.md` §5 scrive la query giusta in SQL, con `greatest` e una sottoquery. PostgREST non sa ordinare un elenco per un valore aggregato delle righe innestate: per farlo in SQL servirebbe una vista o una colonna materializzata, cioè una migrazione, cioè esattamente quello che l'Epic 1 dichiara di non portare.

La strada è quella che `database.md` §5 stesso indica come sufficiente: *«Se l'elenco diventasse lento, si materializza in una colonna aggiornata da trigger. Con qualche centinaio di clienti non serve.»* Con qualche centinaio di clienti e nessuna scheda, l'ordinamento in memoria è il costo minore.

**Quando questa scelta smette di valere, e come ci si accorge:** il giorno in cui l'elenco viene paginato, o in cui i clienti superano il migliaio. Ordinare in memoria significa leggere tutte le righe, quindi il momento in cui serve la paginazione è lo stesso in cui serve la vista. Va scritto qui perché è una conseguenza da riconoscere, non un difetto da correggere adesso.

**2. Il calcolo sta in un modulo puro, non dentro la pagina.**

Cinque righe dentro `page.tsx` funzionerebbero identiche. Ma AC4 chiede un test sul calcolo dell'ultima attività, e una funzione dentro un componente server che apre una connessione a Supabase non si prova senza costruirci intorno un'impalcatura. Il modulo puro è il modo di scrivere zero righe di impalcatura, ed è il patto già in piedi con gli altri cinque moduli di `src/lib`.

**3. La formattazione della data si corregge adesso, insieme al suo test.**

I due difetti di Task 3 non li ha segnalati nessuna AC, ed è per questo che vanno detti chiaramente: AC3 chiede che la data si mostri «in forma relativa entro la settimana», AC4 chiede che quella formattazione abbia un test. Scrivere un test sopra un calcolo che dice `oggi` per qualcosa successo ieri sera vorrebbe dire mettere sotto vetro il difetto. La correzione è dentro il perimetro perché **è il test a costringerci a decidere qual è il comportamento giusto**, e la risposta è quella che una persona si aspetta leggendo la parola `ieri`.

Le due domande relative sono la 1 e la 2 in fondo alle Dev Notes: se la risposta è diversa, cambia il comportamento e cambia il test, non il perimetro.

### Perché AC1 oggi non si può provare, e cosa si fa

`assessments` è vuota: l'Epic 3 non esiste. Quindi l'unica prova possibile di AC1 con i dati veri è che **l'elenco non cambi** — che è la prova di AC2, non di AC1.

Non si crea nessun dato finto in produzione per vederlo: `kb-0.md` §5 lo vieta e non servirebbe comunque. AC1 si prova dove è provabile davvero, cioè nel test di Task 5, con le righe costruite a mano. È il caso esemplare di quello che `kb-0.md` §7 chiede di mettere sotto test: la logica che, rompendosi, produce dati sbagliati e non un errore.

La casella «una scheda modificata oggi porta il cliente in cima» resta scritta in Task 6, non spuntata, e si chiude quando l'Epic 3 avrà creato la prima scheda vera.

### Una conseguenza che arriva con l'Epic 3

Da oggi l'ordine dell'elenco dipende anche da `assessments.updated_at`, ma **nessuna azione lo rivalida**: `revalidatePath('/clienti')` sta solo nelle azioni del cliente (`actions.ts`), e le schede non esistono ancora.

Il giorno in cui l'Epic 3 scrive una risposta o cambia un verdetto, quella scrittura deve rivalidare **anche `/clienti`**, non solo la schermata di compilazione. Altrimenti si lavora un'ora su una scheda, si torna all'elenco e il cliente è dov'era.

Non si costruisce niente adesso — sarebbe la macchina prima del problema (`kb-0.md` §9) — ma è la riga da guardare quando si scrive la Story 3.3, che è quella che salva di continuo.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `assessments!inner(updated_at)` | Tutti i clienti senza schede spariscono dall'elenco: **oggi tutti** | Innesto normale, che è un join esterno (AC2) |
| Confronto fra stringhe ISO invece di `Date.parse` | Due `timestamptz` con precisione o scostamento diversi si ordinano al contrario | Confronto fra numeri, e un test apposta |
| `.sort()` chiamato su `data` | L'array che arriva dal client di rete viene mutato sul posto | `[...data].sort(...)` |
| Nessun criterio a parità di istante | Due clienti si scambiano di posto a ogni ricarica | Secondo criterio sul nome, dichiarato |
| `getDate()` per il giorno civile | Risponde nel fuso della macchina: giusto in casa, sbagliato su Vercel | Le parti di `Intl.DateTimeFormat` con `timeZone` |
| Differenza in millisecondi divisa per 86.400.000 | Conta periodi di 24 ore: ieri sera diventa `oggi` | Differenza fra giorni civili |
| `timeZone` messo anche su `clockFormat` | Impone un fuso fisso a un'ora che nasce nel browser | Solo su `absoluteFormat` e sul giorno civile |
| Nuova `Date()` dentro un test | Un test che passa oggi e fallisce il primo del mese | `now` passato a mano, sempre |
| `node --test` senza il modello dei file | La scoperta attraversa `.next` | `'src/**/*.test.ts'` fra apici, nello script |
| `"type": "module"` per spegnere l'avviso | `__dirname` in `next.config.ts` smette di esistere | `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` |
| Import senza `.ts` nei test | Node non risolve il modulo | Estensione esplicita + `allowImportingTsExtensions` |
| `as` per far passare `parts.find(...)` | `noUncheckedIndexedAccess` aggirato invece che rispettato | Un controllo esplicito sul risultato |
| Colonne o markup della tabella cambiati | Il lavoro della Story 1.7, fatto due volte e in disaccordo | Si tocca solo il valore, non la tabella |

### Contratto visivo

Non cambia niente, e il fatto che non cambi è la verifica.

- La colonna `Ultima attività` resta la quarta, in monospaziato, `--ink-muted`, con l'altezza di riga a 56 e nessuna griglia (UX-DR4, UX-DR12).
- La forma relativa entro la settimana e assoluta oltre è quella di `design-system.md` §5: `oggi`, `ieri`, `3 giorni fa`, poi `04/08/2026`. Frase minuscola, nessuna maiuscola di cortesia (UX-DR13).
- Nessun colore nuovo, nessuna icona, nessun indicatore di «recente»: la posizione nell'elenco **è già** l'informazione, e ripeterla con un colore sarebbe la seconda cosa satura della schermata (UX-DR2).
- I quattro stati dell'elenco restano quelli della Story 1.1 e non si riprogettano (NFR9, UX-DR11).

Le due discordanze note che questa story **non** corregge, perché appartengono alla Story 5.2: `.btn` alto 40px invece di 44, e `.input:focus` che illumina in `--sec-prequalifica` invece della tinta della sezione corrente (`deferred-work.md`).

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione**, nessuna vista, nessuna colonna materializzata, nessun trigger nuovo.
- **Nessuna ricerca e nessun filtro**: sono la Story 1.7, che tocca la stessa pagina. Qui non si aggiunge nessun controllo sopra la tabella.
- **Nessuna colonna `Esito`**: è la Story 4.2, e ha bisogno di schede che non esistono.
- **Nessuna paginazione**, nessun caricamento progressivo, nessun ordinamento cliccabile sulle intestazioni.
- **Nessun conteggio di schede o persone** nell'elenco.
- **Nessun cambiamento a `globals.css`**, alle colonne, all'altezza di riga o agli scheletri di `loading.tsx`.
- **Nessuna delle voci di `deferred-work.md` viene chiusa.** In particolare resta aperta *«`save()` non controlla `dirty`: un Invio sul selettore riscrive lo stesso stato»* (`use-editable-field.ts:144`), che è imparentata con questa story — muove `updated_at` e quindi l'ordine — ma si chiude in una passata sola su tutti i campi, non qui.
- **Nessuna suite di test oltre i due file chiesti.** Il comando nasce ora: riempirlo di test sui componenti di presentazione è esattamente quello che `kb-0.md` §7 dice di non fare.
- **Nessuna configurazione di test in un file a sé** (nessun `vitest.config`, nessun `jest.config`, nessuna cartella `__tests__`): una riga di script e una di `tsconfig`.

### Test

Il comando nasce qui, ed è il primo del progetto. Due file, entrambi su moduli puri, entrambi senza impalcatura.

Cosa entra sotto test, e perché sono questi due e non altri: `lastActivityAt` è **un calcolo** e `formatLastActivity` è **una trasformazione**, cioè le due categorie che `kb-0.md` §7 nomina insieme ai permessi. Nessuna delle due, rompendosi, produce un errore: producono un elenco nell'ordine sbagliato e una data che dice il giorno sbagliato, cioè difetti che si scoprono mesi dopo o mai.

Cosa **non** entra: la pagina, la query, il markup della tabella, `StatusPill`, `ErrorState`. Sono presentazione, e la loro verifica è Task 6 sull'anteprima.

Restano fuori per ora, ma sono i candidati naturali quando il comando esisterà: `parseDecisionRoles` e `personDisplayName` (Story 1.5), `normalizeTag` e `collectTagSuggestions` (Story 1.4), `normalizeClientName` (Story 1.1). Non si aggiungono adesso — sarebbero lavoro non chiesto — ma la riga esiste perché il giorno che qualcuno cerca «cosa manca di provare», la risposta è scritta.

### Project Structure Notes

```
src/lib/
├── format-date.ts          fuso dichiarato, giorno civile. formatClockTime invariata.
├── format-date.test.ts     NUOVO
├── last-activity.ts        NUOVO — il calcolo e il comparatore. Puro.
├── last-activity.test.ts   NUOVO
└── (tutto il resto)        invariato

src/app/(app)/clienti/
├── page.tsx                select con l'innesto, tipo di riga, ordinamento in memoria
├── loading.tsx             invariato
└── (tutto il resto)        invariato

package.json                + script "test"
tsconfig.json               + allowImportingTsExtensions
AGENTS.md                   la riga del comando dei test
```

Convenzioni vincolanti (`kb-0.md` §2): file in `kebab-case`, funzioni in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`, nomi in inglese nel codice e in italiano nell'interfaccia, oltre 200 righe un file quasi sempre contiene due cose. Il test sta accanto al modulo che prova e ne porta il nome più `.test`.

Nessuna dipendenza nuova. In particolare nessun corridore di test, nessuna libreria di asserzioni, nessun trasformatore: Node 24 fa entrambe le cose da solo.

### Piattaforma in uso, verificata

Da `package.json` e dalla macchina, il 4 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata, nessuna entra.

Verificato eseguendolo, non dedotto:

- `node --test` **scopre da solo** i file `*.test.ts`, ne toglie i tipi ed esegue. Nessun flag sperimentale su Node 24.
- Un file `.ts` con `import` in un progetto senza `"type": "module"` viene riletto come modulo ES e funziona, con un avviso — quello che `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` spegne.
- Il modello `'src/**/*.test.ts'` come argomento posizionale funziona.
- Senza `allowImportingTsExtensions`, `npx tsc --noEmit` risponde `TS5097` sull'import con estensione. Con l'opzione, controllo dei tipi e test passano entrambi.

Da verificare in sviluppo, e da scrivere nel Dev Agent Record:

- `.order(colonna, { referencedTable: 'assessments' })` e `.limit(1, { referencedTable: 'assessments' })` in questa versione di `supabase-js`. È il pezzo **facoltativo** di Task 2: se non si comporta come documentato, si toglie e il risultato non cambia.
- Che l'innesto `assessments(updated_at)` restituisca `[]` e non `null` per un cliente senza schede. Il tipo generato lo dice, ma è la riga su cui poggia AC2 e va vista.

### Intelligence dai commit

Da `cee425a` (Story 1.5) e `34a6a2e` (Story 1.4), le abitudini che questa story eredita:

- **Le funzioni pure di `src/lib` non importano né React né Supabase.** È stato scritto in ogni story dalla 1.4 in poi «così la Story 1.6 può metterci un test sopra»: questa è la story che riscuote quella promessa. Se un modulo non fosse davvero puro, si scoprirebbe adesso.
- **Task 6 si divide in due**: quello che l'agente verifica e quello che richiede una sessione. Le seconde restano vuote finché non le percorre Luca, e la story non va a `done` prima.
- **Quello che riguarda la resa si prova sull'anteprima, non si deduce.** La 1.4 ha sbagliato tre volte su dettagli visivi non visti resi.
- **Nei log `code` e `message`, mai `details`.** Qui non si aggiungono log: la pagina ha già il suo ramo d'errore.
- **`revalidatePath('/clienti')` sta solo nelle azioni del cliente**, e resta com'è. Le azioni delle persone non lo chiamano di proposito (Story 1.5, «Quello che non si rivalida, e perché»), e **questa story non lo cambia**: `database.md` §5 non mette le persone nell'ultima attività. Chi lo trovasse strano non sta guardando un difetto: è la definizione.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.6: Ordinare l'elenco per ultima attività vera]
- FR11 e l'ordinamento predefinito dell'elenco: [Source: docs/prd-v1.md#4. Schermate]
- **La definizione di ultima attività, con la query in SQL e la nota sulla materializzazione**: [Source: docs/database.md#5. Ultima attività del cliente]
- Tabella `assessments`, chiave esterna e trigger: [Source: docs/database.md#3. Tabelle], [Source: docs/database.md#4. Aggiornamento automatico di updated_at]
- Policy sulle righe innestate: [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Date in monospaziato, forma relativa entro la settimana, tabella senza griglia: [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#3. Tipografia]
- I quattro stati: [Source: docs/design-system.md#6. I quattro stati di ogni schermata]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#5. Database], [Source: docs/kb-0.md#7. Verifica], [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Il debito che questa story chiude: [Source: docs/bmad/pianificazione/epics.md#Additional Requirements] — *«l'elenco clienti ordina per `clients.updated_at`, mentre `database.md` §5 definisce l'ultima attività come il maggiore fra quella e l'ultima modifica delle schede»*
- Story precedente, pattern e misure: [Source: docs/bmad/implementazione/1-5-registrare-le-persone-e-chi-decide.md]
- Voci rimandate ancora aperte: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima o durante lo sviluppo

Ognuna ha già la sua risposta di default dentro i task: se non rispondi, si fa quella.

1. **`ieri` deve voler dire il giorno civile prima, non ventiquattro ore fa.** Oggi una modifica delle 23:00 di ieri, guardata stamattina, si legge `oggi`. Default: si passa al giorno civile, e il test lo fissa. Confermi?
2. **Il fuso si dichiara fisso a `Europe/Rome` dentro `format-date.ts`.** Serve perché la data si compone sul server, che su Vercel sta a UTC. L'alternativa sarebbe una variabile d'ambiente su Vercel, invisibile nel codice e non verificabile da un test. Default: costante nel modulo, insieme a `it-IT` che è già lì. Confermi?
3. **L'ordinamento si fa in memoria e non arriva una migrazione**, perché PostgREST non ordina per un aggregato delle righe innestate e l'Epic 1 dichiara di non portare migrazioni. Default: in memoria, con la nota su quando smetterà di bastare. Preferisci invece una vista adesso, sapendo che è una migrazione fuori dal perimetro dichiarato dell'epica?
4. **I test si eseguono con `node --test`, senza nessuna dipendenza nuova.** L'alternativa è Vitest, che dà osservazione continua e copertura ma porta un albero di dipendenze per un progetto che oggi ha due funzioni da provare. Default: `node --test`. Confermi?
5. **A parità esatta di istante l'ordine è per nome.** Serve perché due clienti con lo stesso `updated_at` altrimenti si scambiano di posto a ogni ricarica. Default: nome, con collazione italiana. Va bene, o preferisci il più recente per creazione?
6. **`AGENTS.md` cambia di una riga**, quella che oggi dice `# test: non ancora`. È un file di istruzioni, quindi lo segnalo invece di modificarlo di nascosto. Confermi?

## Dev Agent Record

### Agent Model Used

Claude Code, `claude-opus-5`. Sviluppo del 4 agosto 2026.

### Le sei domande, e la risposta applicata

Nessuna è stata rimandata: la richiesta era «procedi», quindi vale il default scritto nella domanda.

| # | Risposta applicata |
|---|---|
| 1 | `ieri` è il giorno civile precedente, non ventiquattro ore fa. Fissato dal test |
| 2 | `TIME_ZONE = 'Europe/Rome'` come costante di `format-date.ts` |
| 3 | Ordinamento in memoria, nessuna migrazione |
| 4 | `node --test`, nessuna dipendenza nuova |
| 5 | A parità esatta di istante, ordine per nome con `Intl.Collator('it')` |
| 6 | `AGENTS.md`: la sola riga `# test: non ancora` → `# test: npm test` |

### Debug Log References

**I test sono stati visti fallire quando dovevano** (Task 5, `kb-0.md` §7). Quattro difetti introdotti di proposito, uno alla volta, e poi ripristinati:

| Difetto introdotto | Test che se ne è accorto |
|---|---|
| `assessment.updated_at > winner` al posto del confronto fra numeri | *due timestamptz che come stringhe ordinano al contrario* |
| `return 0` al posto del criterio sul nome | *a parità esatta di istante il comparatore ordina per nome* |
| `Math.floor((now - date) / MS_PER_DAY)` al posto del giorno civile | *le 23:00 di ieri, guardate alle 08:00 di oggi → ieri* |
| `timeZone: TIME_ZONE` tolto a `dayFormat` | *un istante che a Roma è già il giorno dopo…* — **ma solo con `TZ=UTC`** |

L'ultima riga è la sola con un asterisco, e va letta: su una macchina già a `Europe/Rome` quel test passa anche con il fuso tolto, perché `Intl` senza `timeZone` cade sul fuso di sistema. Il difetto che quel test guarda esiste su Vercel, che sta a UTC, e lì il test lo prende. Verificato eseguendo `TZ=Europe/Rome npm test` (16/16, difetto invisibile) e `TZ=UTC npm test` (15/16, difetto preso). Con il codice giusto passano tutti e 16 in entrambi i fusi.

Se un giorno si vuole che quel guardiano funzioni anche sulla macchina di casa, la mossa è `TZ=UTC` davanti allo script `test`. Non è stata fatta: la riga dello script è scritta parola per parola in Task 4, e cambiarla è una decisione, non un'iniziativa.

### Completion Notes List

**Il pezzo facoltativo di Task 2 non è stato tenuto.** `.order(..., { referencedTable: 'assessments' })` e `.limit(1, { referencedTable: 'assessments' })` non sono entrati nella query. Il motivo non è che non funzionino: è che non li ho potuti vedere funzionare. `assessments` è vuota e la verifica richiede una sessione autenticata, che si apre solo con il collegamento via email. Tenere un'ottimizzazione non osservata sarebbe stato darla per verificata (`kb-0.md` §1). `lastActivityAt` calcola il massimo su un elenco di qualsiasi lunghezza proprio perché il risultato non dipenda da questo, quindi toglierlo non cambia niente. Resta la mossa da provare il giorno che le schede esistono e l'elenco pesa.

**Che l'innesto restituisca `[]` e non `null` è verificato dai tipi, non dai dati.** `ClientListRow` dichiara `assessments: { updated_at: string }[]` non nullabile, e `npm run typecheck` passa: l'inferenza di `@supabase/supabase-js ^2.111.0` sulla `select` concorda. Se rispondesse `null` il tipo non reggerebbe. Vederlo sui dati veri resta nella verifica di Luca — ed è una riga che, se fosse sbagliata, si vedrebbe subito e rumorosamente, non in silenzio.

**Verifica sull'anteprima, fin dove arriva senza sessione.** Server di sviluppo avviato, `/clienti` chiesto: il proxy reindirizza a `/accedi` come deve, nessun errore in console, nessun errore nei log del server. Non ho chiesto il collegamento via email: è a uso singolo ed è di Luca. Tutta la parte «Richiede una sessione» di Task 6 resta com'era, non spuntata.

**`last-activity.ts` è 51 righe, non «sotto le cinquanta».** Il codice è 23 righe, il resto sono i commenti sul perché del confronto fra numeri e del secondo criterio d'ordine. La regola dietro la soglia — se cresce, dentro c'è più di una cosa — è rispettata: un tipo e due funzioni che fanno la stessa cosa. Segnalato invece di limato via, perché limare via un commento per far tornare un numero è il modo sbagliato di rispettare una regola.

**Rimandato all'Epic 3, e sono due cose.** La prima è la casella non spuntata in fondo a Task 6: AC1 provato sui dati veri, che oggi si può provare solo nel test perché `assessments` è vuota. La seconda sta nelle Dev Notes e vale la pena ripeterla qui, perché è la riga che si dimentica: **da oggi l'ordine dell'elenco dipende anche da `assessments.updated_at`, ma nessuna azione rivalida `/clienti` quando una scheda cambia.** Il giorno in cui la Story 3.3 salva una risposta, quella scrittura deve rivalidare anche `/clienti`, altrimenti si lavora un'ora su una scheda, si torna all'elenco e il cliente è dov'era.

**Perimetro rispettato.** Nessun file fuori dall'elenco di «Cosa cambia questa story» è stato aperto in scrittura. `globals.css` non toccato, colonne e markup della tabella identici, nessuna migrazione, nessuna dipendenza nuova, nessun `any` e nessun `as` aggiunto. `npm run typecheck`, `npm run build` e `npm test` passano tutti e tre.

### File List

**Nuovi**
- `src/lib/last-activity.ts`
- `src/lib/last-activity.test.ts`
- `src/lib/format-date.test.ts`

**Modificati**
- `src/app/(app)/clienti/page.tsx`
- `src/lib/format-date.ts`
- `package.json`
- `tsconfig.json`
- `AGENTS.md`
- `docs/bmad/implementazione/sprint-status.yaml`
- `docs/bmad/implementazione/1-6-ordinare-l-elenco-per-ultima-attivita-vera.md`

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 4 agosto 2026 | 0.1 | Creazione della story | Claude Code (create-story) |
| 4 agosto 2026 | 0.2 | Implementazione: modulo puro dell'ultima attività, innesto delle schede nell'elenco, giorno civile e fuso dichiarato nella formattazione, comando di test e i primi due file di test. 16 test, tutti verdi | Claude Code (dev-story) |
