---
baseline_commit: b7a5b2a
---

# Story 2.2: Aggiungere e rinominare un blocco

Status: done

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 6 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want creare un blocco nuovo e correggere il titolo di uno esistente,
so that posso riorganizzare l'intervista quando cambio il modo di condurla.

## Acceptance Criteria

**AC1 — un blocco nuovo compare in fondo**
**Given** la schermata del questionario
**When** aggiungo un blocco con un titolo
**Then** compare in fondo, con la posizione successiva all'ultima esistente

**AC2 — il titolo si corregge, e le risposte già date non si muovono**
**Given** un blocco esistente
**When** ne cambio il titolo
**Then** il nuovo titolo vale per le schede aperte da adesso in poi
**And** le risposte già date conservano il titolo del blocco com'era quel giorno, perché ne hanno una copia propria (FR17)

**AC3 — un titolo vuoto lo rifiuta il server**
**Given** un titolo vuoto
**When** provo a salvare
**Then** il salvataggio viene rifiutato sul server, non solo nel form (NFR10)

> Questa story **scrive su una tabella sola**, `question_blocks`, e su due colonne: `title` e `position`. Non tocca `questions`, non tocca `answers`, non tocca `questionnaires`. Se alla fine esiste un `update` o un `insert` verso una qualsiasi delle altre tre, la story è stata sbagliata.

> Questa story **non cancella niente**. Un blocco eliminato porterebbe via le sue domande — `questions.block_id` è `on delete cascade` (`0004_questionnaire.sql:38`) — e con loro il collegamento delle risposte già date. Nessuna AC lo chiede e nessun comando lo fa.

> **La seconda metà di AC2 si soddisfa non facendo niente**, ed è il punto in cui è più facile sbagliare. `answers.block_title` è una copia scritta all'apertura della scheda (`database.md` §3), quindi rinominare un blocco *non può* toccare una risposta già data: non esiste nessun collegamento da aggiornare. Chi implementa deve resistere alla tentazione di «propagare» il titolo o di «tenere allineate» le copie: quella propagazione è esattamente il difetto che lo schema esiste per rendere impossibile.

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0008: il titolo non può essere vuoto** (AC: 3)
  - [x] `supabase/migrations/0008_block_title_check.sql`, file nuovo. È la prima migrazione dopo le sette applicate il 2 agosto, ed è quella che la voce rimandata dalla revisione della Story 2.1 assegna a questa story alla lettera: *«Da chiudere nella story che introduce la scrittura — 2.2 per il titolo … perché è lì che la validazione lato server va scritta comunque, e `kb-0.md` §5 vuole il vincolo nel database e non solo nel codice»*.
  - [x] Il contenuto è un vincolo solo, con un nome esplicito perché l'annullamento deve poterlo nominare:

    ```sql
    alter table question_blocks
      add constraint question_blocks_title_not_blank check (length(trim(title)) > 0);
    ```

  - [x] **Solo `question_blocks.title`.** `questions.text` ha lo stesso buco e la stessa voce rimandata, ma le sue story sono la 2.3 e la 2.4: metterlo qui vorrebbe dire scrivere un vincolo su una colonna che in questa story nessuno scrive, cioè deriva del piano (`kb-0.md` §9). La voce di `deferred-work.md` si chiude a metà, non del tutto, e Task 6 dice come si scrive una chiusura parziale.
  - [x] **La dichiarazione di reversibilità è obbligatoria e ha un formato esatto** (D24, `database.md` §7). Tre chiavi, in quest'ordine, subito sotto la riga del titolo, prima di qualsiasi altra prosa:

    ```sql
    -- 0008 titolo del blocco non vuoto
    -- Reversibile: sì.
    -- Come si annulla: alter table question_blocks drop constraint question_blocks_title_not_blank;
    -- Cosa si perde: niente. Il vincolo sparisce, le righe restano: né l'aggiunta né
    --   l'annullamento toccano un dato.
    ```

  - [x] Le tre chiavi si scrivono lettera per lettera così come stanno: sono quello che `supabase/migrations.test.ts` cerca, e una scritta con parole diverse è una dichiarazione che nessuno trova. Una continuazione va su una riga `--` con **almeno due spazi** dopo i trattini (`migrations.test.ts:23`), altrimenti il controllo la legge come prosa e considera la chiave finita.
  - [x] Nessun `cascade` nell'annullamento, e qui non ce ne sarebbe motivo: `drop constraint` non ha dipendenti. Il controllo lo verifica lo stesso (`migrations.test.ts:33`).
  - [x] **Il vincolo va applicato al progetto prima del codice che lo usa** (`AGENTS.md`, `guide-for-vercel-supabase.md` §6), con `apply_migration` come le sette precedenti, mai dalla dashboard. Dopo, `list_migrations` deve rispondere **otto** righe.
  - [x] Prima di applicarlo, verificare che nessuna riga esistente lo violi, altrimenti l'`alter table` fallisce a metà. Verificato il 6 agosto 2026: 8 blocchi, 0 titoli vuoti, titolo più lungo 68 caratteri. Rifare il conteggio prima di applicare, perché fra oggi e l'implementazione qualcosa può essere cambiato.

- [x] **Task 2 — La validazione del titolo, modulo puro** (AC: 3)
  - [x] File nuovo `src/lib/block-title.ts`, sul modello esatto di `src/lib/validate-client-name.ts`: nessun React, nessun Supabase, così ci si può mettere un test sopra senza impalcatura (`kb-0.md` §7).
  - [x] Due export: `BLOCK_TITLE_MAX_LENGTH` e `validateBlockTitle(raw: unknown): { ok: true; title: string } | { ok: false; message: string }`. La stessa forma di `validateClientName`, incluso il fatto che **ritorna il titolo già ripulito**, così il valore validato e il valore scritto sono lo stesso.
  - [x] Toglie gli invisibili e poi fa `trim()`, in quest'ordine: `INVISIBLE` si importa da `./validate-client-name.ts` e **non si riscrive**. Una seconda copia di quell'espressione si allontanerebbe dalla prima alla prima riscrittura (`kb-0.md` §9), ed è il motivo per cui `normalizeTag` la importa già invece di ricopiarla.
  - [x] **L'import porta l'estensione `.ts`.** È il vincolo tecnico ereditato dalla Story 1.7 e scritto in testa a `client-tags.ts:1`: un modulo di `src/lib` raggiunto da un test deve usare `.ts` su tutta la propria catena, altrimenti il test muore con `ERR_MODULE_NOT_FOUND` da un file che chi lo scrive non ha toccato, e né `tsc --noEmit` né `next build` se ne accorgono. `validate-client-name.ts` non importa niente, quindi la catena finisce lì.
  - [x] `BLOCK_TITLE_MAX_LENGTH` vale **120**. Il titolo più lungo del seed è 68 caratteri (`Solo sopra le 50 persone, o quando l'interlocutore non è il titolare`), quindi 120 lascia spazio a un blocco condizionale più esplicito senza diventare un posto dove si scrive un paragrafo. Il database non pone nessun massimo: senza un limite qui, un incolla accidentale diventa il titolo di una card. Vedi la domanda 4.
  - [x] I due messaggi sono in italiano, minuscoli, in voce attiva, e dicono cosa fare e non cosa è successo (UX-DR13, NFR16). Sul vuoto: qualcosa come *«Scrivi il titolo del blocco: senza, la card resta senza intestazione.»* Sul limite: la stessa forma di `validateClientName`, che nomina il numero.
  - [x] **Nessun controllo dei doppioni.** Due blocchi con lo stesso titolo non sono un errore e non ricevono nessun avviso: vedi il perimetro.

- [x] **Task 3 — Le due Server Action** (AC: 1, 2, 3)
  - [x] File nuovo `src/app/(app)/questionario/actions.ts`, con `'use server'` in testa. È il primo file di scrittura dell'Epic 2. Due azioni e nient'altro: `createBlock` e `renameBlock`.
  - [x] Tutte e due cominciano con `openSession('createBlock')` / `openSession('renameBlock')` da `@/lib/supabase/session`, che esiste e non si riscrive: verifica la sessione, distingue «sessione finita» da «servizio non raggiungibile» e **non manda mai a `/accedi`**, perché una navigazione porterebbe via quello che è appena stato scritto (NFR1).
  - [x] Gli identificativi che arrivano dal browser si verificano con `isUuid` da `@/lib/uuid`. Non `UUID.test(...)` a mano: la funzione esiste dalla Story 1.5 apposta.
  - [x] Nei log **solo `code` e `message`**, mai `details`, e mai il titolo rifiutato: un titolo è testo scritto da una persona (`kb-0.md` §3). La forma è quella di `clienti/actions.ts:85`.

  **`createBlock`** (AC1)
  - [x] Riceve `questionnaire_id` e `title`. Il `questionnaire_id` arriva dal browser perché è il questionario che si sta guardando, e non si ricava di nuovo dal server: rifare qui la scelta del «questionario attivo» vorrebbe dire una seconda copia dell'ordinamento di `page.tsx:66-68`, e due copie divergono.
  - [x] **Due letture, in quest'ordine, e la prima non è ridondante.** La policy `question_blocks_owner_all` verifica già in `with check` che il questionario sia del proprietario (`0007_rls.sql:67-78`), quindi un `insert` su un questionario altrui verrebbe rifiutato lo stesso. La prima lettura serve a un'altra cosa: **a distinguere «questionario non mio o sparito» da «questionario senza blocchi»**, che dalla seconda lettura tornano identici, cioè zero righe. Senza, il primo blocco di un questionario vuoto e un questionario inesistente prenderebbero la stessa strada.

    ```ts
    // 1. esiste ed è mio: la riga la filtra questionnaires_owner_all
    const owner = await session.supabase
      .from('questionnaires').select('id').eq('id', questionnaireId).maybeSingle()

    // 2. l'ultima posizione fra i blocchi di quel questionario
    const last = await session.supabase
      .from('question_blocks').select('position')
      .eq('questionnaire_id', questionnaireId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    ```

  - [x] La posizione nuova è `(last.data?.position ?? 0) + 1`. **Non `Math.max(...positions) + 1` su un array letto per intero**: con nessun blocco `Math.max()` risponde `-Infinity`, e il primo blocco di un questionario vuoto nascerebbe alla posizione `-Infinity + 1`. Facendolo ordinare al database il caso non esiste, e non c'è nessun array da leggere.
  - [x] **Le posizioni dei blocchi sono per questionario e oggi sono 1-8 consecutive.** Non hanno la stessa convenzione delle domande, che sono numerate 1-23 attraverso tutto il questionario (`seed.sql:10`, `database.md` §8): quella è l'ambiguità che la Story 2.3 dovrà chiudere, e qui **non** c'è. `.eq('questionnaire_id', …)` sulla lettura non è prudenza, è quello che rende vera l'affermazione precedente il giorno che i questionari sono due.
  - [x] L'`insert` scrive **tre colonne e basta**: `questionnaire_id`, `title`, `position`. `id` e `created_at` hanno il loro default nello schema, e scriverli qui vorrebbe dire tenere due posti allineati a mano (`clienti/actions.ts:33-34`).
  - [x] I due codici di errore che si distinguono: `23503` (chiave esterna) vuol dire che il questionario è sparito fra la lettura e la scrittura, e invitare a riprovare manderebbe a insistere su una cosa che non riuscirà mai più — è la lezione già scritta in `people-actions.ts:73-76`. `23514` è il vincolo di Task 1: è l'ultima difesa e non dovrebbe scattare mai, perché `validateBlockTitle` rifiuta prima; se scatta, il messaggio resta il nostro e non quello di Postgres, che risponde in inglese e parla di un vincolo invece che di cosa fare.

  **`renameBlock`** (AC2, AC3)
  - [x] Riceve `block_id` e `title`. **Nessun `questionnaire_id` dal browser**: non serve a niente, perché la rivalidazione è su una rotta sola.
  - [x] Un `update` di **una colonna sola**, `title`, con `.select('id').maybeSingle()`. `maybeSingle` e non `single`: con la sicurezza a livello di riga attiva, il blocco di un altro proprietario e un blocco cancellato arrivano identici — zero righe — e con `single` diventerebbero un errore invece di un messaggio comprensibile (`clienti/actions.ts:163-165`).
  - [x] **`question_blocks` non ha `updated_at` e non ha un trigger** (`0004_questionnaire.sql:28-34`, `0006_triggers.sql`): questa scrittura non muove nessun timestamp e non ha nessun effetto collaterale sull'ordine di niente. È l'opposto della scheda cliente, dove ogni scrittura sposta `clients.updated_at` e riordina l'elenco. Va scritto nel codice, perché chi arriva da `clienti/actions.ts` si aspetta il contrario. Vedi la domanda 1.
  - [x] Ritorna `{ saved: title }` con il titolo ripulito, che è quello che `useEditableField` usa per riallineare il campo: senza, uno spazio in coda lascerebbe `Salva` acceso su un campo già salvato (`use-editable-field.ts:106-109`).
  - [x] **Non tocca `questions` e non tocca `answers`.** È la seconda metà di AC2 e si onora non scrivendo niente.

  - [x] Tutte e due chiudono con `revalidatePath('/questionario')` e **solo quello**. Non `/clienti`: i blocchi non compaiono nell'elenco, e nessuna di queste due scritture muove `clients.updated_at`, che è il suo ordinamento.

- [x] **Task 4 — La rinomina a schermo** (AC: 2, 3)
  - [x] File nuovo `src/app/(app)/questionario/block-title-form.tsx`, con `'use client'`. Un componente per file (`kb-0.md` §2).
  - [x] `block-card.tsx` **resta un Server Component**: monta `<BlockTitleForm>` e non prende `'use client'`. Renderla client vorrebbe dire mandare al browser anche la resa delle domande, che è testo fermo.

    Attenzione: la card è quella che decide *se* mostrare il modulo, quindi lo stato `renaming` sta dentro `BlockTitleForm`, che rende sia il pulsante `Rinomina` sia il modulo. Un `useState` in `block-card.tsx` la renderebbe client.
  - [x] **Il titolo si corregge da un `Rinomina` che apre il modulo, non da un campo sempre acceso.** Otto campi di testo accesi in permanenza farebbero leggere come un modulo una schermata che la Story 2.1 ha costruito per leggere («prima di una call so cosa sto per chiedere e in che sequenza»), e toglierebbero gli otto `<h2>` che oggi danno la struttura alla pagina. È il pattern già in piedi in `people-card.tsx:64-68`, dove un pulsante scopre un modulo. Vedi la domanda 3.
  - [x] A riposo: `<div className="card__header">` con l'`<h2 className="card__title">` e il pulsante. `card__header .btn { margin-left: auto }` esiste già (`globals.css:237`) e lo manda a destra da solo.
  - [x] **Il pulsante è `btn btn--quiet`, non `btn--secondary`.** Otto pulsanti bordati uno sotto l'altro pesano quanto il contenuto; rinominare un blocco è un'azione terziaria (UX-DR10) e `.btn--quiet` è la variante senza fondo che esiste per quello (`globals.css:444`).
  - [x] Aperto: il modulo **sostituisce l'intestazione**, non le si aggiunge sotto. Tenere l'`<h2>` e mettere il campo sotto vorrebbe dire lo stesso titolo scritto due volte, di cui uno vecchio.
  - [x] Il modulo è un `<form className="field …">` con `<label className="label">` — `Titolo del blocco` — l'input, e `.field__actions` con `Salva` e `Annulla`. Ogni campo ha una etichetta vera e non solo un segnaposto (UX-DR14). Le classi esistono tutte; serve solo un margine sotto per stare al posto dei 20 di `.card__header`: **una classe nuova con una proprietà sola**, valore preso dalla scala di 4.
  - [x] Il campo si pilota con `useEditableField` da `@/lib/use-editable-field`, con **`autosave: false`**: il titolo di un blocco è un campo corto, e un campo corto si conferma (D21). Niente `SaveIndicator`, che è la seconda metà della regola del campo *lungo*. Riscrivere a mano `pending`, `dirty` e la gestione della rete caduta sarebbe la reinvenzione che `kb-0.md` §9 chiede di fermare — quel modulo esiste apposta e regge già dodici campi.
  - [x] `autoFocus` sull'input all'apertura: il pulsante che lo ha aperto non c'è più, e chi usa la tastiera resterebbe con il fuoco sul corpo della pagina.
  - [x] Alla chiusura — da `Annulla`, o dopo un salvataggio riuscito — il fuoco torna sul pulsante `Rinomina`, che ricompare **nello stesso posto**. È più semplice del caso di `people-card.tsx:25-32`, dove il fuoco va sul titolo perché i due pulsanti si scambiano; qui non si scambia niente.
  - [x] `Annulla` chiude e riporta il campo a com'era: `cancel()` fa la seconda cosa e la chiusura la fa il componente. Nessuna conferma: riportare un campo al valore di prima è reversibile (`kb-0.md` §6).
  - [x] L'errore si rende sotto il campo con `.field__error` e `role="alert"`, collegato all'input con `aria-describedby` e `aria-invalid`: è la forma di `client-field-form.tsx:138-142`. **Non** un `ErrorState`, che è il riquadro di una schermata intera.
  - [x] **Nessun `maxLength` sull'input.** Con `maxLength` il limite non si supera mai dall'interfaccia, quindi il messaggio che spiega cosa fare diventa codice che nessuno vedrà, e quello che si vede è un incolla tagliato senza avviso: è la voce rimandata del 3 agosto, e questa è l'occasione di non aggiungerne una quarta istanza. Il limite lo dice il server. Vedi la domanda 4.
  - [x] Nessuna conseguenza dal difetto noto *«`save()` non controlla `dirty`»* (voce rimandata del 3 agosto): un Invio a campo non modificato riscrive lo stesso titolo, e siccome `question_blocks` non ha `updated_at` non muove niente — nessun riordino, nessun salto nell'elenco. Si lascia com'è e non si corregge qui: quella voce vale per dodici campi e si chiude in una passata sola.

- [x] **Task 5 — L'aggiunta a schermo, e i due posti in cui compare** (AC: 1)
  - [x] File nuovo `src/app/(app)/questionario/new-block-form.tsx`, con `'use client'`. Rende il pulsante `Aggiungi blocco` e, quando è premuto, il modulo al suo posto. Riceve `questionnaireId` e nient'altro.
  - [x] Un solo campo, `Titolo del blocco`, più `Salva` e `Annulla`. **La posizione non si chiede e non si mostra**: la calcola il server (Task 3), e un campo per la posizione sarebbe la Story 2.5 costruita in anticipo e lasciata a metà.
  - [x] `Salva` qui è **primario**, perché dentro il modulo è l'unica azione: è la stessa scelta già scritta in `new-person-form.tsx:115`. Il pulsante che apre il modulo è invece `btn btn--secondary`, come `Aggiungi persona`.
  - [x] Il modulo si chiama con `useWrite` da `@/lib/use-write`, non con `useActionState`: un rifiuto della promessa risalirebbe al confine d'errore, che sostituisce l'intera schermata (`use-write.ts:20-24`). È il pattern di `new-person-form.tsx:47-58`, con `element.reset()` **solo dopo un successo**, così un titolo rifiutato resta dov'è insieme al suo errore.
  - [x] **Due punti di montaggio, mai tutti e due insieme**, ed è la parte che va letta due volte:
    - `question_blocks.length === 0` → dentro lo stato vuoto che la Story 2.1 ha lasciato senza pulsante. UX-DR11 chiede uno stato vuoto che dica cosa manca *e offra il pulsante che lo crea*; la 2.1 ha onorato solo la prima metà e ha scritto perché («creare blocchi è la Story 2.2, e metterlo qui sarebbe costruire in anticipo la story dopo»). **Questa è quella story, e chiude la seconda metà.**
    - `question_blocks.length > 0` → in una `.card` in fondo alla pagina, dopo l'ultima card di blocco. `.card + .card` dà da sé i 24 di stacco (`globals.css:224`), quindi non serve nessuna misura nuova.
  - [x] Il pulsante non si mette **anche** nell'intestazione della pagina. Con lo stato vuoto ce ne sarebbero due identici a poca distanza — l'errore che `people-card.tsx:78-80` documenta ed evita — e con i blocchi presenti l'azione starebbe lontana dal punto in cui il suo risultato compare. Un solo pulsante, dove il blocco nuovo nascerà.
  - [x] Lo stato vuoto **del questionario che non c'è** resta senza pulsante e senza modulo: senza un questionario non c'è nessun `questionnaire_id` a cui agganciare un blocco, e la frase che dice di eseguire `seed.sql` resta l'informazione giusta. Le due frasi restano due (`page.tsx:110-129`).
  - [x] Le parole: `Aggiungi blocco` sul pulsante in tutti e due i punti di montaggio, e `Aggiungi blocco` è anche il nome dell'azione ovunque compaia (UX-DR13: un'azione si chiama allo stesso modo dal pulsante alla conferma). `Rinomina` per l'altra. Nient'altro di nuovo, salvo i due messaggi di Task 2 e quelli d'errore delle azioni.
  - [x] `page.tsx` cambia di poco: passa `questionnaire.id` a `<NewBlockForm>` nei due rami. Resta sotto le 200 righe (oggi 135).
  - [x] **`loading.tsx` non si tocca.** Gli scheletri sono la forma del contenuto in arrivo, e durante il caricamento non si sa ancora se un questionario esista: uno scheletro di pulsante prometterebbe un'azione che potrebbe non esserci. Il pulsante non è dato in arrivo, è una conseguenza del dato.

- [x] **Task 6 — Il test, e i due documenti da allineare** (AC: 3)
  - [x] `src/lib/block-title.test.ts`, accanto al modulo che prova, con `node:test` e `node:assert/strict`, import con estensione `.ts`. Il comando esiste dalla Story 1.6 e non si tocca.
  - [x] Perché questo entra sotto test e i componenti no (`kb-0.md` §7): `validateBlockTitle` è **una validazione più una trasformazione**, la stessa categoria di `parseClientFilters`, e rompendosi non produce un errore — produce un titolo vuoto o storpiato dentro una card, e da domani dentro la copia che ogni risposta si porta dietro. È un difetto che si scopre riaprendo una scheda mesi dopo.
  - [x] I casi: un titolo normale torna `ok` e ripulito; una stringa di soli spazi è rifiutata; una stringa di soli caratteri invisibili è rifiutata, ed è il caso che `trim()` da solo non copre; gli invisibili in mezzo a un titolo valido spariscono senza far cadere il titolo; `undefined`, `null` e un numero sono rifiutati; un titolo di `BLOCK_TITLE_MAX_LENGTH` caratteri passa e uno di uno in più no, perché è lì che il limite si sposta di uno senza che nessuno se ne accorga.
  - [x] **Un test che non è stato visto fallire quando doveva non è un test** (`kb-0.md` §7). Prima di chiudere: rompere di proposito il controllo del vuoto e quello del limite, verificare che i test se ne accorgano, ripristinare con `git diff` a zero. Da scrivere nel Dev Agent Record in una tabella, come hanno fatto le Story 1.6, 1.7, 1.8 e 2.1.
  - [x] `supabase/migrations.test.ts` **non si modifica**: prende i file da `readdirSync` e la migrazione nuova entra da sé, con i suoi quattro controlli. Il totale dei test cresce di quattro anche senza scrivere una riga di test. Se non cresce, la migrazione non è dov'è attesa.
  - [x] **`docs/database.md` §3**, il blocco `create table question_blocks`, va allineato al vincolo nuovo: quel paragrafo è la descrizione dello schema, e uno schema descritto senza un vincolo che esiste è la stessa categoria di bugia che la Story 2.1 ha appena corretto in §8.
  - [x] **`docs/database.md` §7**, l'elenco dei file dentro `supabase/migrations/`, aggiunge `0008_block_title_check.sql`. Una riga.
  - [x] **`deferred-work.md`, la voce del 6 agosto** *«`questions.text` e `question_blocks.title` non hanno il `check (length(trim(…)) > 0)` che `clients.name` ha»*: si chiude **a metà**, e la mezza chiusura si scrive per esteso invece di barrare la voce. La forma: la voce resta aperta con una riga aggiunta che dice cosa è stato chiuso, da quale story, e cosa resta — sul modello della riga *«La Story 1.7 non la chiude, e la allarga»* già in quel file. Barrarla direbbe che `questions.text` è protetto, e non lo è.
  - [x] Nessun'altra voce di `deferred-work.md` viene toccata. Se ne emergono di nuove, si aggiungono sotto una intestazione della revisione, non di questa story.
  - [x] Niente in `00-contesto-e-decisioni.md`, salvo l'esito delle domande 1 e 2: quelle due, se rispondono `sì`, sono decisioni strutturali e si scrivono dove sono state prese (`kb-0.md` §8).

- [x] **Task 7 — La verifica** (AC: 1, 2, 3)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa.
  - [x] `npm test` passa, e il totale **cresce** rispetto agli 81 della Story 2.1: quattro dalla migrazione nuova, più quelli di `block-title.test.ts`. Un test che sparisce non è rosso, è assente.
  - [x] `list_migrations` sul progetto risponde **otto** righe, con `0008_block_title_check` in fondo.
  - [x] Il vincolo esiste davvero: un `insert` di prova con `title = '   '` viene rifiutato con `23514`, e la riga di prova **non resta** nel database. Da fare in una transazione annullata o cancellando subito quello che si è scritto, e da dichiarare nel Dev Agent Record.
  - [x] `block-title.ts` non importa né React né Supabase, e il suo unico import porta l'estensione `.ts`.
  - [x] Tutti i file toccati restano sotto le 200 righe (`kb-0.md` §2).
  - [x] Sotto `src/app/(app)/questionario/` non compare **nessun** `--sec-questionario` e nessun valore esadecimale: i colori di sezione vivono nella navigazione (UX-DR2), e questa story aggiunge contenuto a quella schermata senza cambiare quella regola.
  - [x] `globals.css` non contiene nessun valore esadecimale nuovo e nessun numero fuori dalla scala di 4.
  - [x] Nessuna scrittura verso `questions`, `answers` o `questionnaires` in tutto il codice della story: `grep` su `.from('questions')`, `.from('answers')` e `.from('questionnaires')` sotto `questionario/` deve trovare **due sole** occorrenze di `questionnaires`, tutte e due letture — la `select` di controllo di `createBlock` e la lettura di `page.tsx` pre-esistente dalla Story 2.1, che la prima stesura di questa riga non contava. Corretta in revisione il 7 agosto 2026: la condizione originale diceva «una sola» ed era letteralmente falsa.
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`), che vanno dichiarate nel File List.

  Richiede una sessione, la fa Luca — **fatta il 7 agosto 2026, dopo i patch di revisione**:
  - [x] Apro `/questionario`: sotto l'ottava card c'è una card con `Aggiungi blocco`.
  - [x] Aggiungo un blocco con un titolo: compare **in fondo**, dopo `Solo sopra le 50 persone…`, e dentro dice che non ha ancora nessuna domanda (AC1).
  - [x] Ricarico: il blocco nuovo è ancora in fondo, non altrove. Se salta di posto, la posizione non è quella che credeva.
  - [x] Ne aggiungo un secondo: va dopo il primo, non prima.
  - [x] Provo a salvare un titolo vuoto, e poi uno di soli spazi: tutti e due rifiutati, con un messaggio sotto il campo, e quello che avevo scritto resta dov'è (AC3).
  - [x] Rinomino un blocco esistente: il titolo cambia, le sue domande non si muovono e non cambiano (AC2).
  - [x] Rinomino con un titolo vuoto: rifiutato allo stesso modo (AC3).
  - [x] `Annulla` sulla rinomina riporta il titolo di prima e chiude il modulo.
  - [x] Larghezza 375px: la card del modulo non scorre di lato, il campo si usa, i pulsanti si toccano.
  - [x] Da tastiera: Tab arriva a `Rinomina` e ad `Aggiungi blocco`, il fuoco si vede, Invio apre il modulo, il fuoco entra nel campo, `Annulla` lo riporta sul pulsante.
  - [x] Nessun errore in console, nessun avviso di idratazione.
  - [x] I blocchi di prova aggiunti durante la verifica: decisione presa in sessione. **Se si tolgono, si tolgono da SQL** — l'interfaccia non cancella blocchi, ed è voluto.

### Review Findings

Revisione del 7 agosto 2026 (tre layer: avversario, casi limite, audit delle AC). Nessuna violazione delle tre AC, nessuna scrittura vietata. Tutti i rilievi a gravità bassa.

- [x] [Review][Decision] La chiusura del modulo di rinomina non governa il salvataggio in volo — due sintomi dalla stessa radice: (a) salvando con Invio il riallineamento al titolo ripulito finisce in `waiting` e non si applica mai, così la riapertura mostra il testo grezzo con `Salva` acceso su un campo già salvato (`block-title-form.tsx:60-65` + `use-editable-field.ts:110-115`); (b) l'input non è disabilitato durante `pending` (a differenza di `new-block-form.tsx:85`), quindi digitando durante il salvataggio il modulo si chiude sotto le dita. **Deciso da Luca il 7 agosto 2026: `disabled={pending}` come nel modulo gemello.** Applicato; il comportamento blur-alla-disabilitazione che libera il riallineamento va confermato nella sessione di Task 7.
- [x] [Review][Patch] `renameBlock` non mappa `23514`: risponde il generico «Riprova» a un rifiuto che riproverebbe invano, mentre `createBlock` recupera `blankTitleMessage` [src/app/(app)/questionario/actions.ts:162-164] — applicato
- [x] [Review][Patch] La corsa accettata sulle posizioni non è in `deferred-work.md` — la story lo prescrive alla revisione («Va scritta in `deferred-work.md` nella revisione, non nascosta qui») [docs/bmad/implementazione/deferred-work.md] — scritta
- [x] [Review][Patch] Il quirk di `apply_migration` (registrazione senza prefisso `0008_`, registro corretto a mano) capiterà identico dalla 0009 e vive solo nel Dev Agent Record [docs/bmad/implementazione/deferred-work.md] — scritta
- [x] [Review][Patch] Casella di Task 7 spuntata su una condizione letteralmente falsa: il grep su `questionnaires` trova due occorrenze, non «una sola» — la spec non contava `page.tsx:56` pre-esistente; la sostanza (nessuna scrittura) regge [docs/bmad/implementazione/2-2-aggiungere-e-rinominare-un-blocco.md:174] — condizione corretta nella casella
- [x] [Review][Patch] Commento ormai falso nello stato vuoto del questionario: «creare blocchi è la Story 2.2 e qui non esiste ancora niente che lo faccia» — il motivo vero è l'assenza di un `questionnaire_id` [src/app/(app)/questionario/page.tsx:114-116] — riscritto
- [x] [Review][Patch] Il commento «stessa condizione del vincolo» è impreciso: il `trim()` JS toglie tutto il whitespace Unicode, quello di Postgres solo spazi — la validazione è più severa, non uguale [src/lib/block-title.ts:14] — riscritto
- [x] [Review][Patch] Nello stato vuoto dei blocchi il modulo aperto collassa alla larghezza intrinseca dell'input: `.empty` è flex column con `align-items: flex-start`, nella card in fondo lo stesso modulo si stende a tutta larghezza [src/app/globals.css:870-876] — `.empty .field { align-self: stretch }`
- [x] [Review][Defer] Creando il primo blocco dallo stato vuoto il fuoco cade sul body: la rivalidazione cambia ramo e smonta l'istanza di `NewBlockForm` che tiene il `ref` [src/app/(app)/questionario/page.tsx:123-147] — deferred, il rimedio toccherebbe i due punti di montaggio prescritti dalla story
- [x] [Review][Defer] Input disabilitato durante `pending`: su un rifiuto il fuoco resta sul body [src/app/(app)/questionario/new-block-form.tsx:85] — deferred, pre-existing (ereditato da `new-person-form.tsx:77-87`)
- [x] [Review][Defer] `createBlock` accetta un questionario proprio ma con `is_active = false`: successo silenzioso su un contenitore che la pagina non mostra [src/app/(app)/questionario/actions.ts:61-65] — deferred, oggi irraggiungibile (nessun codice scrive `questionnaires`)

Scartati come rumore (4): la corsa sulle posizioni in sé (decisione registrata nella story); il `baseline` che non risincronizza (voce già rimandata dalla 1.3); la precondizione della migrazione 0008 (già applicata con conteggio verificato); il limite 120 che conta unità UTF-16 (convenzione identica a `validateClientName`).

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository e sul progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`, `eu-west-1`) il 6 agosto 2026.

**La schermata c'è.** `questionario/page.tsx` legge il questionario attivo con blocchi e domande innestati, ordinati dal database su `position, created_at, id` a tutti e due i livelli, e ha i suoi quattro stati. `block-card.tsx` rende una card per blocco. Non si riscrive niente di questo: si aggiunge.

**Lo stato del database, contato il 6 agosto 2026:** 1 questionario, 8 blocchi con `position` **1-8 consecutive e per questionario**, 23 domande con `position` **1-23 globali**, 0 titoli vuoti, titolo più lungo 68 caratteri. Sette migrazioni registrate.

**Le macchine di scrittura ci sono tutte, e sono quattro.** `openSession` (`lib/supabase/session.ts`), `isUuid` (`lib/uuid.ts`), `useEditableField` (campo che si conferma o si salva da solo), `useWrite` (un controllo che chiama un'azione). Questa story non ne scrive nessuna nuova: le usa.

**Il pattern «un pulsante scopre un modulo» esiste** in `people-card.tsx` con `new-person-form.tsx`, focus di ritorno compreso. È il modello di Task 4 e Task 5.

**Le classi che servono esistono quasi tutte:** `.card`, `.card + .card`, `.card__header`, `.card__header .btn`, `.card__title`, `.field`, `.label`, `.input`, `.field__actions`, `.field__error`, `.btn--primary`, `.btn--secondary`, `.btn--quiet`, `.empty`. Manca solo il margine sotto il modulo di rinomina.

**Il controllo delle dichiarazioni di reversibilità esiste** (`supabase/migrations.test.ts`, Story 1.8) e prende i file nuovi da sé.

### Cosa cambia questa story, file per file

```
supabase/migrations/0008_block_title_check.sql    NUOVO — il check sul titolo, con la sua dichiarazione
src/lib/block-title.ts                            NUOVO — validazione e limite, modulo puro
src/lib/block-title.test.ts                       NUOVO — il suo test
src/app/(app)/questionario/actions.ts             NUOVO — createBlock, renameBlock
src/app/(app)/questionario/block-title-form.tsx   NUOVO — 'use client', il Rinomina e il suo modulo
src/app/(app)/questionario/new-block-form.tsx     NUOVO — 'use client', l'Aggiungi blocco e il suo modulo
src/app/(app)/questionario/block-card.tsx         MODIFICA — monta BlockTitleForm, resta server
src/app/(app)/questionario/page.tsx               MODIFICA — monta NewBlockForm nei due rami
src/app/globals.css                               MODIFICA — una classe, una proprietà
docs/database.md                                  MODIFICA — §3 il vincolo, §7 il file nuovo
docs/bmad/implementazione/deferred-work.md        MODIFICA — una voce chiusa a metà
```

Niente sotto `src/app/(app)/clienti/`, niente in `src/lib/` oltre ai due file elencati, nessuna dipendenza nuova, nessun file di test toccato oltre a quello nuovo. `loading.tsx`, `nav.tsx`, `layout.tsx` e `proxy.ts` non si aprono.

### Le quattro decisioni di questa story

**1. La migrazione entra, ed entra qui.** `kb-0.md` §5 vuole il vincolo nel database e non solo nel codice, e la voce rimandata dalla revisione della Story 2.1 assegna il titolo del blocco proprio a questa story, con il motivo: *«è lì che la validazione lato server va scritta comunque»*. Una validazione applicativa senza il vincolo sotto è una difesa sola, e `database.md` dichiara il database «l'ultima difesa contro i dati incoerenti». Solo `title`, però: `questions.text` ha le sue story.

**2. La posizione la calcola il server, letta dal database, non contata in memoria.** `(ultima ?? 0) + 1` da una `select` ordinata al contrario: nessun array da leggere per intero, nessun `Math.max` su un elenco vuoto, e il caso «primo blocco» non è un caso particolare. La corsa fra due aggiunte simultanee resta e si accetta — vedi «Una corsa nota».

**3. Il titolo si corregge da un pulsante, non da un campo sempre acceso.** La schermata del questionario è fatta per leggere: la Story 2.1 l'ha costruita così e l'ha scritto. Otto campi accesi la trasformerebbero in un modulo e toglierebbero gli otto `<h2>` che le danno struttura. Il pattern «un pulsante scopre un modulo» è già in piedi per le persone.

**4. Nessun avviso di doppione sul titolo.** `renameClient` ne ha uno perché il nome del cliente è l'identificativo dell'elenco e due righe che si leggono uguali sono due clienti che si confondono (D22). Un blocco non è identificato dal titolo: sta dentro un questionario, in una posizione, e due blocchi chiamati `Obiettivo` sono un contenuto strano, non un dato ambiguo. Costruire qui la macchina del doppione — la lettura di controllo, il `duplicate_of` di ritorno, il secondo `Salva` — vorrebbe dire tre pezzi di codice per un caso che nessuna AC nomina.

### Una corsa nota, e perché si accetta

Due aggiunte in volo insieme leggono la stessa «ultima posizione» e nascono tutte e due alla posizione successiva: due blocchi con la stessa `position`. Nessun indice unico lo impedisce, e nemmeno lo impedirà — `question_blocks_questionnaire_position_idx` non è `unique` di proposito, perché la Story 2.5 dovrà riscrivere le posizioni in blocco e un vincolo unico non differibile la bloccherebbe a metà riordino.

Cosa succede davvero, se capita: l'ordine a schermo **resta stabile**, perché `page.tsx` ordina su `position, created_at, id` e le altre due colonne rompono il pareggio. Quello che si perde è solo la promessa che le posizioni siano consecutive, che è un problema della Story 2.5.

Perché si accetta: richiede due schede aperte sulla stessa pagina nello stesso secondo, con un utente solo (D9). È lo stesso ragionamento con cui è stata accettata la corsa sull'array dei tag, decisa da Luca il 3 agosto 2026, e l'alternativa è la stessa: una funzione nel database che faccia il calcolo e l'inserimento in una istruzione sola, cioè una migrazione in più per una corsa che non si riesce a provocare. **Va scritta in `deferred-work.md`** nella revisione, non nascosta qui.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Aggiornare `answers.block_title` alla rinomina | Distrugge la seconda metà di AC2 e riscrive la storia delle schede | La rinomina tocca `question_blocks` e basta |
| `Math.max(...positions) + 1` | Con nessun blocco dà `-Infinity + 1` | `.order('position', desc).limit(1)`, poi `?? 0` |
| `max(position)` senza `.eq('questionnaire_id', …)` | Oggi funziona per caso, con due questionari no | Il filtro c'è sempre |
| Copiare la convenzione delle posizioni dalle domande | Le domande sono 1-23 globali, i blocchi 1-8 per questionario | I blocchi non hanno l'ambiguità della 2.3 |
| Una lettura sola in `createBlock` | «Questionario non mio» e «questionario senza blocchi» tornano identici: zero righe | Due letture, la prima è il controllo di esistenza |
| `single()` invece di `maybeSingle()` | Un blocco cancellato diventa un errore invece di un messaggio | `maybeSingle` ovunque |
| `useActionState` sui moduli | Una rete caduta risale al confine d'errore e porta via la schermata | `useEditableField` e `useWrite`, che esistono per questo |
| `SaveIndicator` sul titolo del blocco | È la regola del campo *lungo*: qui il campo è corto e si conferma (D21) | `autosave: false`, nessun indicatore |
| `maxLength` sull'input | Il messaggio del limite diventa codice che nessuno vedrà, e l'incolla si tronca in silenzio | Il limite lo dice il server |
| `'use client'` su `block-card.tsx` | Va al browser anche la resa di ventitré domande di testo fermo | Client solo i due moduli |
| Un pulsante `Aggiungi blocco` anche nell'intestazione | Nello stato vuoto ne compaiono due identici vicini | Uno solo, dove il blocco nascerà |
| Un pulsante nello stato vuoto del questionario che non c'è | Non esiste nessun `questionnaire_id` a cui agganciarlo | Quel vuoto resta una frase |
| Riscrivere `INVISIBLE` in `block-title.ts` | Due copie che divergono alla prima riscrittura | Si importa, con estensione `.ts` |
| Import senza estensione nella catena di un modulo sotto test | `ERR_MODULE_NOT_FOUND` da un file non toccato, invisibile a `typecheck` e `build` | `.ts` su tutta la catena |
| `details` dell'errore Supabase nei log, o il titolo rifiutato | Sono dati scritti da una persona (`kb-0.md` §3) | Solo `code` e `message` |
| Barrare la voce di `deferred-work.md` | Direbbe che `questions.text` è protetto, e non lo è | Chiusura a metà, scritta |
| Applicare la migrazione dalla dashboard | Vietato senza eccezioni (`AGENTS.md`) | `apply_migration`, e poi `list_migrations` dice otto |
| `--sec-questionario` dentro la pagina | UX-DR2: i colori di sezione vivono nella navigazione | Nessun token di sezione sotto `questionario/` |
| `any` o un `as` per far tacere il compilatore | Vietato senza eccezioni (`kb-0.md` §2) | Tipi derivati da `database.types.ts` |

### `question_blocks` è diversa dalle altre sei tabelle, e conta saperlo

Non ha `updated_at` e non ha un trigger. È l'unica delle sette in questa condizione (`database.md` §4 elenca le sei che il trigger copre, e `question_blocks` non c'è).

Conseguenza pratica, questa story: rinominare un blocco non muove nessun timestamp, quindi non riordina niente e non ha nessun effetto collaterale. Chi arriva da `clienti/actions.ts` — dove ogni scrittura sposta `clients.updated_at` e obbliga a rivalidare anche `/clienti` — si aspetta il contrario, e va scritto nel codice.

Conseguenza da tenere per dopo: D10 dice che *«ogni record porta la data dell'ultima modifica, altrimenti una sincronizzazione in uscita non sa cosa mandare»*. Da questa story in avanti esiste un blocco che può essere modificato e che non sa dire quando. Se la domanda 1 risponde `no`, questo diventa una voce di `deferred-work.md` invece che una colonna.

### Contratto visivo

- Nessuna card nuova nel disegno: le card sono quelle di sempre (fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24, nessun bordo — UX-DR3), e quella dell'aggiunta in fondo è una di loro, con `.card + .card` a dare i 24 di stacco.
- Il pulsante `Rinomina` è `btn--quiet`: nessun fondo, testo `--ink-muted`, allineato a destra nell'intestazione dal `margin-left: auto` che `.card__header .btn` ha già.
- Il pulsante `Aggiungi blocco` è `btn--secondary`, come `Aggiungi persona`. Il `Salva` dentro un modulo è `btn--primary`, perché lì è l'unica azione (UX-DR10 letta come il progetto la applica già).
- Il campo è `.input`: fondo `--surface`, bordo 1px `--line`, raggio `--r-md`, padding 12/16, `min-height: 44` (UX-DR14). L'alone del focus resta quello di tutto il progetto e **non si tocca**: è la voce già rimandata alla Story 5.2, vale per ogni campo del software.
- L'errore sotto il campo è `.field__error`: una riga in `--bad`, non un riquadro. `--bad` qui è legittimo perché è un errore vero — a differenza della domanda disattivata, dove sarebbe una bugia.
- **Nessun colore di sezione dentro il contenuto**, nemmeno sui pulsanti nuovi (UX-DR2). Il primario è nero, così il colore resta libero di significare la sezione o l'esito (`design-system.md` §5).
- **Nessun valore esadecimale, nessun numero fuori dalla scala di 4** (`design-system.md` §10, §4). L'unica riga nuova di `globals.css` è un margine, e vale 20.
- Le parole nuove a schermo: `Aggiungi blocco`, `Rinomina`, `Titolo del blocco`, più i messaggi di rifiuto. Italiano, frase minuscola, voce attiva, niente punti esclamativi, niente emoji (UX-DR13).

### Perimetro: cosa NON entra in questa story

- **Nessuna cancellazione di blocco.** `questions.block_id` è `on delete cascade`: eliminare un blocco porterebbe via le sue domande e, con loro, il `question_id` delle risposte già date. Nessuna AC lo chiede.
- **Nessuna scrittura su `questions`.** Aggiungere, riscrivere e disattivare una domanda sono le Story 2.3, 2.4 e 2.6.
- **Nessuna scrittura su `answers`.** Ci arriva la Story 3.2, e la copia del titolo la scrive la 3.1 all'apertura della scheda.
- **Nessun riordino.** Spostare un blocco su e giù è la Story 2.5, e con lei arriva la decisione su cosa voglia dire «posizioni consecutive». Qui si aggiunge in fondo e basta.
- **Nessun `is_active` sui blocchi.** La colonna non esiste su `question_blocks` e non si aggiunge: disattivare riguarda le domande (FR13, Story 2.6).
- **Nessuna `version` a schermo e nessuna `version` scritta**, salvo esito della domanda 2. La Story 2.1 l'ha esclusa dal disegno con il motivo scritto, e quel motivo non è ancora scaduto.
- **Nessun avviso di doppione** sul titolo, per il motivo della decisione 4.
- **Nessun `updated_at` su `question_blocks`**, salvo esito della domanda 1.
- **Nessun vincolo su `questions.text`**: stessa voce rimandata, story diversa.
- **Nessuna modifica a `seed.sql`.** Il contenuto del questionario è la decisione D19.
- **Nessuna correzione a `use-editable-field.ts` né a `use-write.ts`.** Le tre voci rimandate che li riguardano — `save()` che non controlla `dirty`, il `baseline` che non risincronizza, il limite di attesa che manca — valgono per dodici campi e si chiudono in una passata sola.
- **Nessun `metadata` sulla rotta**, `:focus-visible` invariato, niente della Story 5.1 e niente della 5.2. Voci rimandate che restano rimandate.
- **Nessuna dipendenza nuova.** Nessuna libreria di moduli, nessun validatore di schema: `validateBlockTitle` sta in venti righe (`kb-0.md` §2).
- **Nessun test oltre quello di `block-title.ts`.** I componenti, le azioni e i due moduli sono presentazione e integrazione, e la loro verifica è Task 7 (`kb-0.md` §7).

### Test

Un file, un modulo puro, nessuna impalcatura — più i quattro controlli che la migrazione nuova riceve gratis da `supabase/migrations.test.ts`.

Cosa entra: `validateBlockTitle`. Rientra in `kb-0.md` §7 perché è la coppia validazione + trasformazione che decide che cosa finisce in una colonna, e rompendosi non produce nessun errore: produce un titolo vuoto in una card e, da domani, dentro la copia che ogni risposta si porta dietro per sempre. È esattamente il difetto che si scopre riaprendo una scheda mesi dopo, cioè quello che il prodotto esiste per impedire.

Cosa **non** entra: le due azioni, i due moduli, `block-card.tsx`, `page.tsx`. Le azioni sarebbero verificabili solo con un database, e un test che finge Supabase verifica il finto. La loro prova è Task 7 e la sessione di Luca.

Restano fuori, come dalle Story 1.6, 1.7, 1.8 e 2.1, i candidati naturali già elencati là: `parseDecisionRoles`, `personDisplayName`, `normalizeTag`, `collectTagSuggestions`, `normalizeClientName`. Non si aggiungono adesso, sarebbero lavoro non chiesto.

### Project Structure Notes

```
supabase/
├── migrations/
│   └── 0008_block_title_check.sql   NUOVO — con la dichiarazione D24
└── migrations.test.ts               INVARIATO — legge la cartella da sé

src/lib/
├── block-title.ts                   NUOVO — importa INVISIBLE con estensione .ts
└── block-title.test.ts              NUOVO

src/app/(app)/questionario/
├── page.tsx                         MODIFICA — monta NewBlockForm nei due rami
├── block-card.tsx                   MODIFICA — monta BlockTitleForm, resta Server Component
├── block-title-form.tsx             NUOVO — 'use client'
├── new-block-form.tsx               NUOVO — 'use client'
├── actions.ts                       NUOVO — 'use server'
└── loading.tsx                      INVARIATO

src/app/globals.css                  MODIFICA — una classe, una proprietà
docs/database.md                     MODIFICA — §3 e §7
docs/bmad/implementazione/deferred-work.md   MODIFICA — una voce chiusa a metà
```

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni e variabili in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`, nomi in inglese nel codice e in italiano in quello che si legge. Un componente per file. Nessun file supera le 200 righe.

Le azioni stanno in `questionario/actions.ts` e non dentro `clienti/actions.ts`, che è già a 533 righe e contiene già due cose (`kb-0.md` §2). Un file `'use server'` espone ogni suo export come punto d'ingresso raggiungibile dal browser: è la ragione per cui `openSession` sta in un file suo (`session.ts:22-26`), e vale identica qui.

### Piattaforma in uso, verificata

Da `package.json` e dal progetto, il 6 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata, nessuna entra.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, sette migrazioni registrate.

`noUncheckedIndexedAccess` è attivo: qualsiasi accesso per indice ha tipo `T | undefined`. Con `.maybeSingle()` il problema non si pone, perché `data` è già `T | null`.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `alter table … add constraint` passi su tutte le righe esistenti.** Contate il 6 agosto: 0 titoli vuoti su 8. Da ricontare prima di applicare.
- **Che il vincolo rifiuti davvero uno spazio.** Un `insert` di prova con `title = '   '` deve rispondere `23514`, e la riga di prova non deve restare.
- **Che `useEditableField` con `autosave: false` non renda nessun indicatore e non faccia partire nessun timer.** È il primo uso fuori da `client-field-form.tsx`, e il ramo senza salvataggio automatico è quello meno esercitato.

### Intelligence dai commit

Da `b7a5b2a` e `8263220` (Story 2.1), `20afc72` (1.8), `4d2ef1d` e `3352e51` (1.7), le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere.** La revisione della 1.6 ne ha rimesse vuote tre; la 2.1 ne ha corrette due che erano spuntate su affermazioni false.
- **Quello che non si è visto non si dichiara verificato.** La 2.1 ha scritto che la pagina vera non era mai stata aperta, invece di spuntare le caselle. Qui vale per tutta la seconda metà di Task 7, e per la seconda metà di AC2, che non è verificabile perché `answers` è vuota e la Story 3.1 non esiste.
- **Un test si vede fallire prima di crederci**, con la tabella delle rotture nel Dev Agent Record e il ripristino verificato da `git diff`.
- **Task di verifica diviso in due**: quello che l'agente esegue e quello che richiede una sessione. La seconda parte resta la condizione per andare a `done`.
- **Fuori dal perimetro si chiede prima.** La 1.7 si è fermata davanti a un `ERR_MODULE_NOT_FOUND` che richiedeva un file non suo, e ha chiesto invece di decidere.
- **Quando una regola di stile e un criterio di accettazione si contraddicono, si chiede — non si sceglie la regola di stile perché è scritta due volte.** È la lezione esplicita della revisione della 2.1, ed è la ragione per cui le quattro domande qui sotto vanno chiuse prima di implementare e non durante.
- **Un difetto che non produce un errore è il difetto peggiore.** In questa story sono due: la posizione calcolata male, che si vedrebbe solo come un ordine plausibile e sbagliato, e una propagazione del titolo verso `answers`, che si vedrebbe solo riaprendo una scheda fra tre mesi.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.2: Aggiungere e rinominare un blocco]
- Le quattro story che vengono dopo, e che questa non deve anticipare: [Source: docs/bmad/pianificazione/epics.md#Epic 2: Questionario che si cambia senza un rilascio]
- FR12 (blocchi e domande modificabili), FR17 (la copia dentro la risposta), NFR10 (validazione sul server): [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- UX-DR2 (governo del colore), UX-DR3 (card), UX-DR10 (pulsanti), UX-DR11 (i quattro stati e il pulsante nello stato vuoto), UX-DR13 (voce), UX-DR14 (accessibilità), UX-DR16 (nessun esadecimale): [Source: docs/bmad/pianificazione/epics.md#UX Design Requirements]
- Le tre tabelle del questionario, i vincoli e la colonna `version`: [Source: docs/database.md#3. Tabelle]
- Le sei tabelle che il trigger `updated_at` copre, e la settima che non c'è: [Source: docs/database.md#4. Aggiornamento automatico di updated_at]
- Le policy che risalgono al questionario per `question_blocks`: [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Il formato della dichiarazione di reversibilità, e il divieto di `cascade`: [Source: docs/database.md#7. Migrazioni]
- Le posizioni globali del seed, e perché i blocchi sono un caso diverso: [Source: docs/database.md#8. Dati iniziali]
- La copia del testo dentro la risposta, e perché costa una colonna e risolve una categoria di problemi: [Source: docs/prd-v1.md#3. Entità e campi]
- Card, badge, pulsanti, i quattro stati, voce dell'interfaccia: [Source: docs/design-system.md#5. Componenti]
- Il vincolo nel database e non solo nel codice, e la migrazione reversibile: [Source: docs/kb-0.md#5. Database]
- Ogni input si valida sul server, errori muti verso l'esterno, niente dati personali nei log: [Source: docs/kb-0.md#3. Sicurezza]
- Cosa entra sotto test e cosa no: [Source: docs/kb-0.md#7. Verifica]
- Duplicazione silenziosa e deriva del piano: [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Il campo corto che si conferma e il campo lungo che si salva da solo: [Source: docs/00-contesto-e-decisioni.md#D21. Quando un campo si salva da solo e quando si conferma]
- Il software registra e mostra, non decide e non vieta: [Source: docs/00-contesto-e-decisioni.md#D14. Il software non blocca niente]
- L'avviso di doppione sul nome del cliente, e perché è un avviso: [Source: docs/00-contesto-e-decisioni.md#D22. L'anagrafica si corregge tutta, nome compreso]
- Ogni record porta la data dell'ultima modifica: [Source: docs/00-contesto-e-decisioni.md#D10. Il software è la fonte di verità]
- La dichiarazione di reversibilità e il divieto di `cascade`: [Source: docs/00-contesto-e-decisioni.md#D24. La reversibilità di una migrazione si dichiara dentro il file]
- Story precedente, la schermata su cui questa scrive, e la lezione su specifica contro criterio di accettazione: [Source: docs/bmad/implementazione/2-1-vedere-il-questionario-com-e-oggi.md]
- La voce sul `check` mancante, quella sul `maxLength` che tronca, quella sulla corsa accettata: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima di dev-story

Quattro, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. Le prime due valgono la pena perché sono decisioni strutturali e, se si risponde `sì`, vanno registrate in `00-contesto-e-decisioni.md`.

1. **`question_blocks` prende `updated_at` e il suo trigger, nella stessa migrazione 0008?**
   È l'unica delle sette tabelle senza. Finché nessuno modificava un blocco non si notava; da questa story in poi un blocco rinominato non sa dire quando. D10 dice che *«ogni record porta la data dell'ultima modifica, altrimenti una sincronizzazione in uscita non sa cosa mandare»*.
   **Default: non si aggiunge.** Motivo: oggi nessuno la leggerebbe, e un blocco non è un'entità che esce da sé — nell'esportazione compare come `answers.block_title`, che è una copia con il suo `updated_at`. Aggiungere una colonna e un trigger che nessuno legge è la definizione di campo «utile un giorno» che `kb-0.md` §4 chiede di non aggiungere. Se il default regge, la cosa va in `deferred-work.md`, perché fuori da qui nessuno la troverebbe.
   Se invece la risposta è `sì`: entra nella stessa migrazione (colonna + trigger), `database.md` §3 e §4 si allineano, e diventa una decisione registrata.

2. **`questionnaires.version` cresce quando si aggiunge un blocco?**
   `database.md` §3 dice che *«`version` cresce quando si modifica la struttura ed è informativo»*, e `prd-v1.md` dice *«cresce a ogni modifica strutturale»*. Aggiungere un blocco è una modifica strutturale; rinominarlo probabilmente no. Se nessuno la fa crescere, `version` resta `1` per sempre e la colonna `assessments.questionnaire_version` che la Story 3.1 scriverà registrerà sempre lo stesso numero.
   **Default: non si tocca**, e si registra in `deferred-work.md` con il punto di chiusura dichiarato — la fine dell'Epic 2, quando esistono tutte e cinque le scritture e si può decidere *una volta sola* che cosa conta come modifica strutturale. Motivo: farla crescere qui vuol dire una seconda scrittura, su una seconda tabella, senza transazione — PostgREST non ne offre una — quindi un blocco creato con la versione non incrementata è uno stato raggiungibile, e sarebbe un dato incoerente per un numero che oggi nessuno legge.
   **Attenzione:** questa è la seconda volta che una story dell'Epic 2 rimanda una decisione sul questionario senza chiuderla — la prima è quella sulle posizioni globali, che la 2.1 ha lasciato alla 2.5 scrivendo *«se la Story 2.5 non scrive la decisione dove si cerca, il posto giusto non esisterà mai»*. Se il default regge, va scritto **dove si cerca**, non solo qui.

3. **Il titolo si corregge da un `Rinomina` che apre il modulo, o da un campo sempre acceso come nella scheda cliente?**
   **Default: il pulsante.** Motivo in Task 4: la schermata del questionario è fatta per leggere, otto campi accesi la trasformerebbero in un modulo e toglierebbero gli otto `<h2>` che le danno struttura. L'alternativa — otto campi come i dodici della scheda cliente — è più coerente con l'unica altra schermata modificabile del software, e questa è la ragione per cui la domanda esiste invece di essere decisa da sola.

4. **`BLOCK_TITLE_MAX_LENGTH` vale 120, e l'input non porta `maxLength`?**
   **Default: 120, senza `maxLength`.** 120 perché il titolo più lungo del seed è 68 e un titolo è un'intestazione, non un paragrafo. Senza `maxLength` perché con l'attributo il limite non si supera mai dall'interfaccia, quindi il messaggio che spiega cosa fare è codice che nessuno vedrà, e quello che si vede è un incolla tagliato senza avviso — è la voce rimandata del 3 agosto, e questa è l'occasione di non aggiungere una quarta istanza del problema invece di doverne poi sistemare quattro. Il costo: questo campo si comporta diversamente dagli altri tre finché quella passata non arriva.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (`claude-fable-5`), skill `bmad-dev-story`, 7 agosto 2026.

### Debug Log References

- **Le quattro domande chiuse prima di implementare**, come la story chiede: Luca ha confermato tutti e quattro i default il 7 agosto 2026. Nessun task è cambiato; gli esiti delle domande 1 e 2 (entrambe `no`) sono registrati in `deferred-work.md` sotto l'intestazione di questa story, e la 2 anche «dove si cerca», in `database.md` §3. Niente in `00-contesto-e-decisioni.md`, perché nessuna delle due ha risposto `sì`.
- **Conteggio pre-migrazione rifatto il 7 agosto 2026**: 8 blocchi, 0 titoli vuoti, titolo più lungo 68 caratteri — identico al 6 agosto. L'`alter table` è passato al primo colpo.
- **Prova del vincolo sul progetto**: `insert` con `title = '   '` rifiutato con `23514` (`violates check constraint "question_blocks_title_not_blank"`); ricontato subito dopo, 8 blocchi e 0 righe con `position = 999` — la riga di prova non è rimasta (l'istruzione fallita non scrive per definizione).
- **`apply_migration` ha registrato la migrazione come `block_title_check`**, senza il prefisso `0008_` che le sette precedenti portano. Allineato il registro con un `update` su `supabase_migrations.schema_migrations` (metadati dello strumento, non schema): `list_migrations` risponde otto righe con `0008_block_title_check` in fondo.
- **Rosso-verde**: il test scritto prima del modulo, visto fallire con modulo assente (85/86), poi 91/91 dopo l'implementazione. 91 = 81 della 2.1 + 4 della migrazione nuova (entrata da sé in `migrations.test.ts`) + 6 di `block-title.test.ts`.

Tabella delle rotture deliberate (kb-0.md §7):

| Rottura | Attesa | Esito |
|---|---|---|
| Controllo del vuoto: `title.length === 0` → `< 0` | i casi del vuoto cadono | 3 test rossi: soli spazi, soli invisibili, `undefined`/`null`/numero |
| Controllo del limite: `> BLOCK_TITLE_MAX_LENGTH` → `> … + 1` | il confine di uno cade | 1 test rosso: 121 caratteri passava |

Ripristino verificato dopo ogni rottura: `git diff` a zero su `block-title.ts`, 91/91 verdi.

### Completion Notes List

- **Task 1** — `0008_block_title_check.sql` con la dichiarazione D24 nelle tre chiavi esatte, applicata con `apply_migration`. I quattro controlli di `migrations.test.ts` la coprono senza una riga scritta.
- **Task 2** — `block-title.ts` sul modello esatto di `validate-client-name.ts`: `INVISIBLE` importata con estensione `.ts`, limite 120, i due messaggi in italiano che dicono cosa fare. Due export come da story; il messaggio del vuoto per il ramo `23514` si riprende chiamando `validateBlockTitle('')` invece di esportare una terza costante o duplicare la stringa.
- **Task 3** — `createBlock` e `renameBlock` in `questionario/actions.ts`: `openSession`, `isUuid`, due letture in `createBlock` (esistenza, poi ultima posizione ordinata dal database), insert di tre colonne, `23503` e `23514` distinti, `maybeSingle` ovunque, solo `code` e `message` nei log, `revalidatePath('/questionario')` e solo quello. `renameBlock` scrive una colonna sola e **non tocca né `questions` né `answers`**: la seconda metà di AC2 è onorata non scrivendo niente.
- **Task 4** — `BlockTitleForm` rende intestazione a riposo (h2 + `Rinomina` in `btn--quiet`) o il modulo che la sostituisce; `block-card.tsx` resta Server Component. `useEditableField` con `autosave: false`, nessun `SaveIndicator`, nessun `maxLength`, `autoFocus` all'apertura, fuoco di ritorno su `Rinomina`, errore in `.field__error` con `role="alert"`, `aria-invalid` e `aria-describedby`. Il modulo si chiude da sé dopo un `saved`. Classe nuova `.block-rename`, una proprietà, valore 20.
- **Task 5** — `NewBlockForm` riceve solo `questionnaireId`; un campo, `Salva` primario, `Annulla`; `useWrite` con `element.reset()` solo dopo il successo e `clearError()` alla chiusura. Due punti di montaggio in `page.tsx`, mai insieme: lo stato vuoto dei blocchi (che chiude la seconda metà di UX-DR11 lasciata aperta dalla 2.1) e una card in fondo dopo l'ultima. Lo stato vuoto del questionario che non c'è resta una frase, senza pulsante. `loading.tsx` non toccato. `page.tsx` a 150 righe.
- **Task 6** — test con i sette casi chiesti, tabella delle rotture qui sopra. `database.md` §3 (vincolo + nota su `version`) e §7 (file nuovo) allineati. La voce di `deferred-work.md` del 6 agosto chiusa **a metà**, per esteso: `question_blocks.title` protetto, `questions.text` resta aperto. Le due voci nuove (esiti delle domande 1 e 2) stanno sotto un'intestazione propria di questa story, come gli esiti delle domande prescrivevano.
- **Task 7, parte agente** — `typecheck`, `build`, `npm test` 91/91 (cresciuto da 81), `list_migrations` otto righe con `0008` in fondo, vincolo provato con `23514` senza riga residua, `block-title.ts` puro con un solo import `.ts`, tutti i file sotto le 200 righe, nessun `--sec-questionario` né esadecimale sotto `questionario/`, `globals.css` senza esadecimali nuovi e con il solo 20 della scala.
- **Precisazione sul grep di Task 7**: `.from('questionnaires')` sotto `questionario/` compare **due** volte, non una — `actions.ts:62`, che è la select di controllo prevista, e `page.tsx:56`, che è la lettura della Story 2.1 pre-esistente a questa story e che il conteggio della story non considerava. Zero occorrenze di `.from('questions')` e `.from('answers')`; nessuna scrittura verso le tre tabelle, che è la sostanza del controllo.
- **Cosa non è stato visto funzionare** (e non si dichiara verificato): la pagina vera non è stata aperta — l'accesso passa dal collegamento email e la verifica di sessione è la seconda metà di Task 7, che resta a Luca. In particolare: il primo uso di `useEditableField` con `autosave: false` fuori da `client-field-form.tsx` è verificato per lettura (il timer esce subito su `!autosave`, `use-editable-field.ts:129`; `saveState` non si muove; nessun indicatore montato), non per esecuzione. La seconda metà di AC2 non è verificabile oggi: `answers` è vuota e la copia del titolo la scriverà la Story 3.1.
- **La corsa nota sulle posizioni** (due aggiunte simultanee, stessa `position`) resta accettata come da Dev Notes: la voce per `deferred-work.md` spetta alla revisione, non a questa implementazione.

### File List

Nuovi:
- `supabase/migrations/0008_block_title_check.sql`
- `src/lib/block-title.ts`
- `src/lib/block-title.test.ts`
- `src/app/(app)/questionario/actions.ts`
- `src/app/(app)/questionario/block-title-form.tsx`
- `src/app/(app)/questionario/new-block-form.tsx`

Modificati:
- `src/app/(app)/questionario/block-card.tsx` — monta `BlockTitleForm`, resta Server Component
- `src/app/(app)/questionario/page.tsx` — monta `NewBlockForm` nei due rami
- `src/app/globals.css` — la classe `.block-rename`, una proprietà
- `docs/database.md` — §3 il vincolo e la nota su `version`, §7 il file nuovo

Scritture di metodo:
- `docs/bmad/implementazione/deferred-work.md` — una voce chiusa a metà, due voci nuove dagli esiti delle domande
- `docs/bmad/implementazione/sprint-status.yaml` — stato della story
- `docs/bmad/implementazione/2-2-aggiungere-e-rinominare-un-blocco.md` — questo file

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 6 agosto 2026 | 0.1 | Story creata | Claude Opus 5, skill `bmad-create-story` |
| 7 agosto 2026 | 0.2 | Story implementata: migrazione 0008 applicata, validazione del titolo, due Server Action, i due moduli a schermo, documenti allineati. Quattro domande chiuse da Luca con i default. Status a review | Claude Fable 5, skill `bmad-dev-story` |
| 7 agosto 2026 | 0.3 | Revisione a tre layer applicata: 8 patch (fra cui `disabled={pending}` sulla rinomina, deciso da Luca, e `23514` mappato in `renameBlock`), 3 voci rimandate, 4 rilievi scartati. Verifiche rieseguite: typecheck, build, 91/91. Status a in-progress: resta la sessione di Task 7 | Claude Fable 5, skill `bmad-code-review` |
| 7 agosto 2026 | 0.4 | Verifica di sessione fatta da Luca sulla pagina vera: le dodici prove di Task 7 spuntate. Status a done | Claude Fable 5, skill `bmad-code-review` |
