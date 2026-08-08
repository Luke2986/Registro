---
baseline_commit: 55c6434
---

# Story 2.4: Riscrivere una domanda

Status: done

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 7 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want correggere il testo di una domanda e il suo testo di aiuto,
so that posso migliorare l'intervista dopo ogni call senza aspettare un rilascio.

## Acceptance Criteria

**AC1 — la modifica vale da adesso in poi**
**Given** una domanda esistente
**When** ne riscrivo il testo o il testo di aiuto
**Then** la modifica vale per le schede aperte da adesso in poi

**AC2 — le schede vecchie leggono la domanda com'era**
**Given** una domanda modificata
**When** riapro una scheda compilata prima della modifica
**Then** vi leggo la domanda com'era quel giorno, non quella di oggi (FR13, criterio di accettazione 4 del PRD)

**AC3 — le risposte date non si toccano**
**Given** una domanda di tipo scelta singola
**When** ne modifico le opzioni
**Then** le risposte già date restano quelle scritte, anche se l'opzione scelta non esiste più

> Questa story **scrive su una tabella sola**, `questions`, con un solo `update` di quattro colonne: `text`, `help_text`, `answer_type`, `options`. Non tocca `position` (Story 2.5), non tocca `is_active` (Story 2.6), non tocca `block_id` (spostare una domanda fra blocchi non è di nessuna story). Se alla fine esiste un `insert` su `questions`, o una scrittura verso `question_blocks`, `questionnaires`, `answers` o `assessments`, la story è stata sbagliata.

> **AC2 e AC3 si soddisfano non facendo niente.** Ogni risposta porta la propria copia di `question_text` e `block_title`, e `answers.content` è testo scritto, non un riferimento a un'opzione (`database.md` §3): riscrivere una domanda non può toccare una scheda esistente perché non esiste nessun collegamento da aggiornare. Oggi, in più, `answers` e `assessments` sono vuote — la Story 3.1 non esiste — quindi le due metà **non sono verificabili** e non si dichiarano verificate: si onorano non scrivendo niente, come la seconda metà di AC3 della Story 2.3.

> **`questionnaires.version` non cresce nemmeno qui.** Riscrivere una domanda è la tentazione più forte di tutte — sembra la modifica «strutturale» per definizione — ma la decisione registrata in `deferred-work.md` e in `database.md` §3 vale finché non esistono tutte e cinque le scritture dell'Epic 2, e si decide una volta sola alla fine. Questa è la quarta.

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0010: le opzioni valgono solo per la scelta singola** (AC: 1, 3)
  - [x] `supabase/migrations/0010_question_options_check.sql`, file nuovo. È la metà lasciata aperta di proposito dalla 0009 — *«quella metà appartiene alla Story 2.4, che decide cosa succede riscrivendo il tipo»* (`database.md` §3, `0009_question_checks.sql`) — e la decisione è questa: riscrivendo il tipo via dalla scelta singola, le opzioni si azzerano, e il database lo pretende. È l'esito della domanda 2, default sì:

    ```sql
    alter table questions
      add constraint questions_options_only_single_choice
      check (answer_type = 'scelta_singola' or options is null);
    ```

  - [x] **La dichiarazione di reversibilità è obbligatoria e ha un formato esatto** (D24, `database.md` §7). Tre chiavi, in quest'ordine, subito sotto la riga del titolo; una continuazione va su una riga `--` con **almeno due spazi** dopo i trattini (`migrations.test.ts:23`); niente `cascade`:

    ```sql
    -- 0010 vincolo sulle opzioni fuori dalla scelta singola
    -- Reversibile: sì.
    -- Come si annulla: alter table questions drop constraint questions_options_only_single_choice;
    -- Cosa si perde: niente. Il vincolo sparisce, le righe restano: né l'aggiunta né
    --   l'annullamento toccano un dato.
    ```

  - [x] **`questions_single_choice_has_options` non si tocca.** La sua debolezza nota — `array['']` passa, il check conta gli elementi e non la sostanza — resta rimandata (`deferred-work.md`, revisione 2.3): questa story riusa `parseOptions`, che stringhe vuote non ne emette mai, quindi il motivo del rimando non è scaduto. Riscrivere un vincolo esistente sarebbe una seconda migrazione dentro la stessa, per un caso non provocabile dall'interfaccia.
  - [x] Prima di applicare, verificare che nessuna riga violi il vincolo nuovo. Contato il 7 agosto 2026: 23 domande, 0 con `options` valorizzato su un tipo diverso da `scelta_singola` (l'unica `scelta_singola` ha 4 opzioni, le altre 22 hanno `null`). Rifare il conteggio prima di applicare.
  - [x] **Applicare con `apply_migration` passando il nome con il prefisso** (`0010_question_options_check`), mai dalla dashboard. Poi `list_migrations` deve rispondere **dieci** righe con `0010_question_options_check` in fondo, prefisso compreso. Il passo è quello dichiarato in `database.md` §7 dalla Story 2.3; il rimedio, se il nome entra spoglio, è l'`update` su `supabase_migrations.schema_migrations`, dichiarato nel Dev Agent Record.

- [x] **Task 2 — `checkViolationMessage` trasloca nel modulo puro** (AC: 1)
  - [x] La funzione oggi vive in `question-actions.ts:30-42` e serve anche all'azione nuova, ma **un file `'use server'` non può esportare una funzione sincrona**: Next pretende che ogni export sia una Server Action asincrona, quindi condividerla fra i due file d'azione richiede un modulo non-server. Non è una scelta di stile: è l'unico modo che compila. L'alternativa — duplicarla — sono venti righe di logica che divergono alla prima riscrittura, non le tre righe di costanti del precedente 2.3.
  - [x] Si sposta in `src/lib/question-fields.ts`, esportata, con la firma `checkViolationMessage(pgMessage: string, fallback: string): string`: il fallback arriva dal chiamante, così le costanti dei messaggi restano dove sono, una copia per file d'azione (precedente della 2.3). Il corpo resta identico: `questions_text_not_blank` → il messaggio di `validateQuestionText('')`, `questions_single_choice_has_options` → il messaggio di `parseOptions('')`, tutto il resto → il fallback. La casa è giusta: il modulo contiene già i due validatori che la funzione chiama, e resta puro — nessun React, nessun Supabase.
  - [x] **Il vincolo nuovo della 0010 non riceve un messaggio dedicato**, di proposito: dall'interfaccia non è raggiungibile, perché il server azzera `options` prima di scrivere (Task 3). Se scatta, arriva da SQL o da una richiesta forgiata, e il fallback generico è la risposta giusta.
  - [x] `question-actions.ts` perde la definizione locale e importa da `@/lib/question-fields`, passando `QUESTION_NOT_SAVED` come fallback. Il file scende intorno alle 150 righe; nessun altro cambiamento lì dentro.

- [x] **Task 3 — La Server Action `updateQuestion`, in un file suo** (AC: 1, 3)
  - [x] File nuovo `src/app/(app)/questionario/question-update-actions.ts`, con `'use server'` in testa, **una azione sola**: `updateQuestion`. Non dentro `question-actions.ts`: quel file, anche alleggerito dal Task 2, supererebbe le 200 righe (`kb-0.md` §2), e il precedente dichiarato dalla 2.3 è «un file d'azione, una azione»: ogni export di un file `'use server'` è un punto d'ingresso raggiungibile dal browser. Le costanti si ridefiniscono qui: `QUESTION_NOT_SAVED` (stessa frase della 2.3) e `QUESTION_GONE` = `'Questa domanda non è più disponibile. Ricarica la pagina.'` — tre righe simili valgono più di un modulo condiviso per due stringhe.
  - [x] Comincia con `openSession('updateQuestion')` da `@/lib/supabase/session`; `question_id` si verifica con `isUuid` da `@/lib/uuid`. Nei log **solo `code` e `message`**, mai `details` — su un `update` rifiutato `details` contiene la riga intera, cioè il testo della domanda (`kb-0.md` §3).
  - [x] L'ordine delle validazioni è quello di `createQuestion`, e riusa lo stesso modulo — è la ragione per cui `question-fields.ts` esiste così com'è (dichiarato nella 2.3): `validateQuestionText`, poi `isAnswerType` (un valore fuori dai quattro arriva solo da una richiesta forgiata: log e messaggio generico), poi `validateHelpText`, poi `parseOptions` **solo se il tipo è `scelta_singola`**.
  - [x] **Per i tipi diversi da `scelta_singola`, `options` si scrive `null`**, qualunque cosa arrivi dal modulo. È la stessa regola di `createQuestion`, e da questa story non è più solo disciplina applicativa: la 0010 la pretende, e un `update` che dimentica l'azzeramento cade con `23514`. È anche il ramo che pulisce: una domanda che passa da `scelta_singola` a `numero` esce dall'update senza opzioni, che è esattamente il dato che `block-card.tsx:59-63` si difende dal mostrare.
  - [x] **Una query sola, nessuna pre-lettura.** `createQuestion` legge il blocco per distinguere i casi e per il `questionnaire_id` che serve alla posizione: qui non serve né l'uno né l'altro — la posizione non si tocca e il pattern è quello di `renameBlock` (`actions.ts:155-170`), già in produzione dalla 2.2:

    ```ts
    const { data, error } = await session.supabase
      .from('questions')
      .update({ text: text.text, help_text: help.helpText, answer_type: answerType, options })
      .eq('id', questionId)
      .select('id')
      .maybeSingle()
    ```

    `maybeSingle` e non `single`: con la sicurezza a livello di riga, la domanda di un altro proprietario e una domanda cancellata arrivano identiche, cioè zero righe, e con `single` diventerebbero un errore invece di un messaggio. `!data` → `QUESTION_GONE`. La riga la filtra `questions_owner_all`, che risale al questionario (`0007_rls.sql:80`).
  - [x] **Quattro colonne e basta.** Niente `position`, niente `is_active`, niente `block_id`, niente `updated_at`: quest'ultimo lo muove il trigger della 0006 (`questions` ce l'ha, a differenza di `question_blocks`), quindi una domanda riscritta sa dire da sé quando — D10 soddisfatta gratis, senza scrivere niente.
  - [x] I codici che si distinguono: **solo `23514`**, mappato con `checkViolationMessage(error.message, QUESTION_NOT_SAVED)`. Qui i vincoli possibili sono quattro — i due della 0009, `questions_answer_type_check` della 0004 e la 0010 nuova — e la funzione già li copre: i due della 0009 col loro messaggio, gli altri due col fallback. **Nessun ramo `23503`**: l'update non scrive nessuna chiave esterna, e quel ramo sarebbe codice morto copiato da `createQuestion`.
  - [x] Chiude con `revalidatePath('/questionario')` e **solo quello**: le domande non compaiono nell'elenco clienti e questa scrittura non muove `clients.updated_at`.
  - [x] Tipo di ritorno `UpdateQuestionState = { error?: string }`. Niente `saved`: il modulo si smonta al successo e la rivalidazione porta i valori nuovi — il `saved` di `renameBlock` serve a `useEditableField`, che qui non c'è.

- [x] **Task 4 — La domanda diventa un componente con il suo `Modifica`** (AC: 1)
  - [x] File nuovo `src/app/(app)/questionario/question-item.tsx`, con `'use client'`, componente `QuestionItem`. Riceve `question: QuestionnaireQuestion` (import **solo di tipo** da `./block-card`, che resta il proprietario del tipo). Il contenuto del `<li>` di `block-card.tsx:39-77` si **sposta** qui, commenti compresi — spostato, non duplicato: `block-card` mappa `<QuestionItem key={question.id} question={question} />` dentro la sua `<ul className="questions">` e **resta un Server Component** (~55 righe). Lo stato `editing` sta nel componente foglia, come `renaming` sta in `BlockTitleForm` e non nella card.
  - [x] A riposo, il `<li className={question--inactive quando serve}>` rende: una riga d'intestazione nuova — `.question__header`, Task con il CSS sotto — con `question__text` a sinistra e il pulsante `Modifica` (`btn btn--quiet`, `ref` per il ritorno di fuoco) a destra; poi aiuto, riga dei metadati e opzioni, identici a oggi. **`Modifica` c'è anche sulle domande non attive**: nessuno stato blocca nessuna azione (D14, NFR8).
  - [x] In modifica, il display **sparisce e al suo posto c'è il modulo**: tenere il testo vecchio sopra il campo vorrebbe dire la stessa domanda scritta due volte, di cui una vecchia — è l'argomento esatto di `BlockTitleForm` sull'h2. Alla chiusura — da `Annulla` o dopo un successo — il fuoco torna su `Modifica` con il meccanismo `returning` (`new-block-form.tsx:29-34`, `block-title-form.tsx:51-56`), uguale.
  - [x] File nuovo `src/app/(app)/questionario/edit-question-form.tsx`, con `'use client'`, componente `EditQuestionForm`. Riceve `question` e `onClose`. Un componente per file (`kb-0.md` §2). I campi sono **gli stessi quattro della creazione, con le stesse etichette** — `Testo della domanda`, `Cosa serve capire`, `Tipo di risposta`, `Opzioni, una per riga` — ed è duplicazione dichiarata, non silenziosa (esito della domanda 3, default applicato): generalizzare `new-question-form.tsx` vorrebbe dire una macchina di props (id, default, etichetta del submit, semantica del reset) su un file a 194 righe appena uscito da una revisione. `new-question-form.tsx` **non si apre**.
  - [x] Il prefill, campo per campo:
    - **testo** e **aiuto**: `defaultValue={question.text}` e `defaultValue={question.help_text ?? ''}` — non controllati, come nella creazione. `autoFocus` sul testo: il pulsante che ha aperto il modulo non c'è più.
    - **tipo**: controllato, perché pilota il campo delle opzioni. `question.answer_type` è `string` nei tipi generati, **non** `AnswerType`: l'inizializzazione passa dalla guardia — `isAnswerType(question.answer_type) ? question.answer_type : 'testo_lungo'` — mai da un `as`, che è vietato quanto `any` (kb-0 §2; è la stessa strada di `answerTypeLabel`, che accetta `string` per lo stesso motivo).
    - **opzioni**: controllate, inizializzate a `(question.options ?? []).join('\n')`. Il campo compare solo su `scelta_singola` e il valore sopravvive al giro compare/scompare, identico alla creazione (revisione 2.3, decisione di Luca).
  - [x] Gli `id` dei campi portano il `question.id` (`domanda-${question.id}-testo`, …): il modulo può esistere in più istanze sulla stessa pagina e gli `id` non si possono ripetere. Il `blockId` non serve a niente, qui: l'azione riceve solo `question_id`.
  - [x] Il modulo passa da `useWrite` (`@/lib/use-write`), submit che legge `event.currentTarget` **durante l'evento**, `formData.set('question_id', question.id)`, e al successo chiama `onClose` e basta: **niente `element.reset()`** — nel modulo di creazione serviva a ripulire per il giro dopo, qui il componente si smonta e un `reset()` chiamato male ripristinerebbe il prefill sopra quello che c'era scritto. `clearError()` alla chiusura e nell'`onChange` del select (revisione 2.3: l'errore può parlare di un campo che col tipo nuovo non esiste più).
  - [x] L'errore del server è uno solo, `<p className="field__error" role="alert">` sopra le azioni (modello `new-person-form`/`new-question-form`: con quattro campi non c'è un input solo per `aria-describedby`). `Salva` è `btn--primary` (nel modulo è l'unica azione), `Annulla` è `btn--secondary`; tutti e due e i campi `disabled={pending}` — il quirk del fuoco che cade sul body è noto, rimandato alla 5.2, e **non si corregge qui** (sarebbe la quarta istanza: si annota nella voce esistente).
  - [x] **Nessun `maxLength`** su nessun campo: il limite lo dice il server (voce rimandata del 3 agosto, non se ne aggiunge un'istanza).
  - [x] Il CSS: una classe nuova `.question__header` in `globals.css` — `display: flex`, `justify-content: space-between`, `gap: 12px`, ed eventuale allineamento verificato a schermo — valori dalla scala di 4, nessun esadecimale. Nient'altro senza averne verificato il bisogno su una riproduzione, come lo stacco della 2.3.
  - [x] Le parole nuove a schermo: **solo `Modifica`**. Tutto il resto — etichette, messaggi, `Salva`, `Annulla` — esiste già e si riusa tale e quale (UX-DR13: italiano, frase minuscola, l'azione si chiama allo stesso modo dall'inizio alla fine).

- [x] **Task 5 — Il test, e i documenti da allineare** (AC: 1)
  - [x] `src/lib/question-fields.test.ts` cresce con i casi di `checkViolationMessage`: il messaggio che contiene `questions_text_not_blank` risponde la frase di `validateQuestionText('')`; `questions_single_choice_has_options` risponde la frase di `parseOptions('')`; `questions_options_only_single_choice` risponde il **fallback** (documenta l'intenzione del Task 2); un messaggio qualunque risponde il fallback; il fallback passato è davvero quello ritornato, non una costante interna.
  - [x] **Un test che non è stato visto fallire quando doveva non è un test** (`kb-0.md` §7): rompere di proposito almeno il riconoscimento di un nome di vincolo e il fallback, verificare i rossi, ripristinare con `git diff` a zero. Tabella delle rotture nel Dev Agent Record.
  - [x] `supabase/migrations.test.ts` **non si modifica**: la 0010 entra da sé con i suoi quattro controlli. Il totale cresce di 4 anche senza scrivere una riga; se non cresce, la migrazione non è dov'è attesa.
  - [x] **`docs/database.md` §3**: il blocco `create table questions` prende il vincolo della 0010, e il commento *«Una direzione sola, di proposito … quella metà appartiene alla Story 2.4»* si riscrive: le direzioni ora sono due, e la seconda è arrivata con la decisione di questa story su cosa succede riscrivendo il tipo. Uno schema descritto senza un vincolo che esiste è una bugia documentale.
  - [x] **`docs/database.md` §7**: l'elenco dei file aggiunge `0010_question_options_check.sql`, una riga.
  - [x] **`deferred-work.md`**, due annotazioni su voci esistenti, nessuna voce nuova:
    - la voce della revisione 2.3 su `array['']` (*«Da riprendere se una scrittura futura di opzioni passa da un percorso diverso da parseOptions — la 2.4 compresa»*) si annota: la 2.4 riusa `parseOptions`, il motivo del rimando regge, e la 0010 di proposito non tocca quel vincolo.
    - la voce della revisione 2.2 sul questionario con `is_active = false` (già estesa a `createQuestion`) si estende a `updateQuestion`: l'azione aggiorna per solo `id` e non guarda il questionario, quindi una richiesta forgiata modificherebbe una domanda di un questionario che la pagina non mostra. Stessa classe, stesso rimando.
  - [x] Niente in `00-contesto-e-decisioni.md`, salvo esito diverso dai default delle domande 1 e 2, che sono le due strutturali.

- [x] **Task 6 — La verifica** (AC: 1, 2, 3)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa — è anche la prova che nessun file `'use server'` esporta funzioni sincrone.
  - [x] `npm test` passa e il totale **cresce** rispetto ai 115 della Story 2.3: quattro dalla migrazione nuova, più i casi di `checkViolationMessage`. Un test che sparisce non è rosso, è assente.
  - [x] `list_migrations` risponde **dieci** righe, con `0010_question_options_check` in fondo, **con il prefisso**.
  - [x] Il conteggio prima di applicare: 0 righe con `options` su un tipo diverso da `scelta_singola` (contate il 7 agosto: 0 su 23; ricontare).
  - [x] Il vincolo rifiuta davvero: un `update` di prova che mette `options` su una domanda `testo_lungo` cade con `23514` (blocco `do $$` con `exception when check_violation`, come la 2.3), e **nessuna riga resta modificata**; riconteggio dichiarato nel Dev Agent Record.
  - [x] Il grep delle scritture: `.from('questions')` sotto `questionario/` compare **tre volte** — le due di `question-actions.ts` più l'update di `question-update-actions.ts`; `update` su `questions` compare **una volta sola**, in `question-update-actions.ts`; zero `.from('answers')`, zero `.from('assessments')`; `.from('questionnaires')` resta a **due** e `.from('question_blocks')` a **quattro**, tutte pre-esistenti.
  - [x] `checkViolationMessage` è definita **una volta sola**, in `question-fields.ts`; `question-actions.ts` la importa e non la contiene più; `question-fields.ts` resta senza React e senza Supabase, import con estensione `.ts`.
  - [x] Tutti i file toccati restano sotto le 200 righe; `new-question-form.tsx` **non è stato toccato** e resta a 194; `actions.ts` intatto a 177; `page.tsx` e `loading.tsx` intatti.
  - [x] Sotto `src/app/(app)/questionario/` nessun `--sec-questionario` e nessun valore esadecimale (UX-DR2); in `globals.css` solo `.question__header`, valori dalla scala di 4.
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`), dichiarate nel File List.

  Richiede una sessione, la fa Luca — è la condizione per `done`. Avvertenza: le modifiche sono su domande vere del questionario e non hanno un annulla — provare su una domanda di prova (aggiunta con `Aggiungi domanda`) o riportare a mano i valori com'erano:
  - [x] Apro `/questionario`: ogni domanda ha il suo `Modifica` discreto accanto al testo, e la pagina si legge come prima.
  - [x] Modifico il testo di una domanda: il display si aggiorna al posto giusto, il fuoco torna su `Modifica` (AC1).
  - [x] Ricarico: la modifica è ancora lì.
  - [x] Svuoto «Cosa serve capire» e salvo: la domanda resta senza contenitore vuoto sotto il testo (`null`, non stringa vuota).
  - [x] Sulla domanda `scelta singola`: cambio una riga delle opzioni, salvo, e le opzioni nuove si leggono sotto la domanda (AC3, la metà visibile).
  - [x] Porto una domanda `testo lungo` a `scelta singola` senza opzioni: rifiutata con il messaggio, e quello che avevo scritto resta dov'è. Con due opzioni: salvata, opzioni visibili.
  - [x] Porto la domanda appena cambiata di nuovo a `testo breve`: salvata, e le opzioni spariscono dalla resa (il server le ha azzerate).
  - [x] Dentro lo stesso modulo aperto: scrivo opzioni, cambio tipo e torno su `scelta singola` — il testo delle opzioni è ancora lì.
  - [x] Provo un testo vuoto e uno di soli spazi: rifiutati con il messaggio sotto il modulo.
  - [x] `Annulla` chiude il modulo, la domanda si legge com'era, il fuoco torna su `Modifica`.
  - [x] Una domanda con l'aiuto già vuoto: il modulo si apre con il campo vuoto, non con `null` scritto dentro.
  - [x] Larghezza 375px: la riga con `Modifica` non scorre di lato, il modulo si usa, i bersagli si toccano.
  - [x] Da tastiera: Tab arriva su `Modifica`, Invio apre il modulo, il fuoco entra nel testo, `Annulla` lo riporta su `Modifica`.
  - [x] Nessun errore in console, nessun avviso di idratazione.

### Review Findings

Revisione dell'8 agosto 2026, tre livelli (avversariale, casi limite, audit degli AC). 14 rilievi unici, 3 scartati come rumore.

- [x] [Review][Decision] Salvare dopo un cambio di tipo cancella le opzioni senza avviso — l'azzeramento sul server è la decisione 1 della story, confermata; il silenzio no. **Decisione di Luca: avviso nel modulo.** Quando il tipo lascia la scelta singola con opzioni scritte, una riga sotto il select dice che salvando si perdono (`edit-question-form.tsx:156-163`). Informa e non blocca (D14).
- [x] [Review][Decision] `Annulla` scarta il digitato non salvato senza conferma, e il commento motiva il caso sbagliato. **Decisione di Luca: conferma solo a modulo modificato.** `isDirty` confronta i campi col prefill (`edit-question-form.tsx:46-61`); su un modulo intonso `Annulla` chiude e basta, su uno riscritto chiede con la conferma nativa (`:201-224`). Il commento sbagliato è sostituito.
- [x] [Review][Decision] Aggiornamento perso: `updateQuestion` scrive per solo `id`, senza guardia di concorrenza. **Decisione di Luca: accettazione registrata nel ledger.** Voce in `deferred-work.md` sotto la revisione 2.4, con le ragioni delle corse sorelle (un utente solo, D9) e il richiamo alla differenza di classe: questa cancella contenuto, non duplica un numero.
- [x] [Review][Patch] Il JSDoc di `parseOptions` è rimasto orfano sopra `checkViolationMessage` [src/lib/question-fields.ts] — `checkViolationMessage` col suo JSDoc è traslocata in fondo al file, dopo `parseOptions`, che ritrova la sua documentazione agganciata; l'intestazione del modulo ora dichiara anche il messaggio per i 23514.
- [x] [Review][Patch] Due commenti indicano ancora `block-card.tsx` come sede della difesa in resa [question-update-actions.ts:69, 0010_question_options_check.sql:11] — entrambi ora dicono `question-item.tsx`. Il commento della migrazione è documentazione: lo schema applicato non cambia.
- [x] [Review][Patch] Ledger: il campo opzioni che compare e scompare non è annunciato nemmeno nel modulo di modifica — voce estesa in `deferred-work.md` con la seconda istanza (`edit-question-form.tsx:169-185`) e con la riga d'avviso nuova, anch'essa non annunciata.
- [x] [Review][Patch] Ledger: ventitré «Modifica» con lo stesso nome accessibile, e il modulo aperto non nomina la domanda — voce nuova in `deferred-work.md`, classe accessibilità della Story 5.2.
- [x] [Review][Patch] Ledger: il giro prefill → `parseOptions` non è fedele per opzioni di forma producibile solo da SQL — voce nuova in `deferred-work.md`, accanto alle sorelle «solo da SQL».
- [x] [Review][Patch] La voce «quarta istanza» è l'unica senza riferimento di riga — aggiunti i sei riferimenti (`:107`–`:208`).
- [x] [Review][Patch] Due test del fallback si sovrappongono [src/lib/question-fields.test.ts] — il caso sussunto è rimosso, il superstite prende un titolo che copre entrambe le intenzioni. 123 test verdi (−1 di proposito).
- [x] [Review][Patch] Il File List dichiara `question-fields.test.ts` a 202 righe, il file ne ha 194 — File List riallineato ai conteggi reali dopo la revisione.

Da vedere a schermo nella prossima sessione (i due comportamenti nuovi non sono verificabili senza sessione, come da pattern della story):

- [x] Sulla `scelta_singola`: cambio tipo → sotto il select compare «Questo tipo non usa opzioni: salvando, quelle scritte si perdono»; torno su scelta singola → la riga sparisce. Verificato da Luca l'8 agosto 2026, nella sessione di verifica della 2.5.
- [x] `Annulla` su modulo intonso chiude senza chiedere; su modulo riscritto chiede, e rifiutando la conferma il digitato è ancora lì. Verificato da Luca l'8 agosto 2026, nella sessione di verifica della 2.5.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository e sul progetto Supabase il 7 agosto 2026, baseline `55c6434`.

**Lo stato del database, contato il 7 agosto 2026:** 23 domande (le prove della sessione 2.3 sono state tolte), 1 sola `scelta_singola` con 4 opzioni, 0 righe con `options` su un tipo che non le usa, 0 testi vuoti, 0 domande non attive, testo più lungo 119 caratteri, aiuto più lungo 166, posizione massima 23; 8 blocchi, 1 questionario attivo a `version` 1; `answers` e `assessments` **vuote**. Nove migrazioni a registro, tutte col prefisso (il quirk della 0008 è stato allineato e non si è ripresentato con la 0009). 115 test verdi.

**I validatori esistono e sono stati scritti per questa story.** `question-fields.ts` dichiara in testa: *«validazioni e limiti in un posto solo, perché la Story 2.4 riuserà queste stesse funzioni per la riscrittura»*. `validateQuestionText`, `validateHelpText`, `parseOptions` — con limiti 300/300/80, tetto di 20 opzioni, normalizzazione del whitespace interno e nessuna deduplicazione — si importano e **non si riscrivono**. Idem `ANSWER_TYPES`, `isAnswerType`, `answerTypeLabel` da `answer-types.ts`.

**Il pattern dell'update esiste già in produzione.** `renameBlock` (`actions.ts:155-170`) è l'unico `update` del questionario: `.update().eq('id').select('id').maybeSingle()`, `!data` → messaggio «non più disponibile», 23514 mappato col messaggio del validatore. `updateQuestion` è la stessa forma su un'altra tabella, con quattro colonne invece di una.

**Le macchine dell'interfaccia ci sono tutte.** `useWrite` (`use-write.ts`), il pattern «un pulsante scopre un modulo che sostituisce il display» con ritorno di fuoco (`block-title-form.tsx`), il modulo multi-campo con errore unico e opzioni controllate (`new-question-form.tsx` — che qui però **non si tocca**: si imita). Le classi CSS dei campi e delle domande esistono tutte; manca solo `.question__header`.

**La policy copre già l'update.** `questions_owner_all` (`0007_rls.sql:80`) è `for all` e risale al questionario: l'update su una domanda altrui torna zero righe, non un errore. La lettura di controllo di `createQuestion` serviva alla posizione, non alla protezione — e qui la posizione non serve.

**`questions` ha `updated_at` e il trigger** (`0006_triggers.sql:40-41`): la riscrittura muove il timestamp da sé. Non va scritto a mano, e non serve nessuna colonna nuova per sapere quando una domanda è cambiata (D10).

### Cosa cambia questa story, file per file

```
supabase/migrations/0010_question_options_check.sql   NUOVO — il vincolo inverso, con la dichiarazione D24
src/lib/question-fields.ts                            MODIFICA — riceve checkViolationMessage (esportata, con fallback)
src/lib/question-fields.test.ts                       MODIFICA — i casi di checkViolationMessage
src/app/(app)/questionario/question-actions.ts        MODIFICA — perde la funzione, la importa
src/app/(app)/questionario/question-update-actions.ts NUOVO — 'use server', updateQuestion
src/app/(app)/questionario/question-item.tsx          NUOVO — 'use client', display + Modifica + stato editing
src/app/(app)/questionario/edit-question-form.tsx     NUOVO — 'use client', il modulo prefillato
src/app/(app)/questionario/block-card.tsx             MODIFICA — il <li> diventa <QuestionItem/>, resta server
src/app/globals.css                                   MODIFICA — .question__header, valori dalla scala
docs/database.md                                      MODIFICA — §3 il vincolo e il commento, §7 il file
docs/bmad/implementazione/deferred-work.md            MODIFICA — due annotazioni su voci esistenti
```

`page.tsx`, `actions.ts`, `new-question-form.tsx`, `new-block-form.tsx`, `block-title-form.tsx`, `loading.tsx`, `answer-types.ts`, `block-title.ts`, `use-write.ts` **non si aprono**. Niente sotto `clienti/`, nessuna dipendenza nuova.

### Le cinque decisioni di questa story

**1. Il tipo di risposta si riscrive, e riscriverlo governa le opzioni.** È la decisione che la 2.3 ha assegnato per nome a questa story (*«la 2.4, che decide cosa succede riscrivendo il tipo»*). Il questionario è dati modificabili dall'interfaccia (D19) e il software non vieta (D14): un tipo bloccato costringerebbe a disattivare e ricreare la domanda per correggere una scelta sbagliata, perdendo la posizione. La semantica: via dalla `scelta_singola` le opzioni si azzerano sul server (`null`, non array vuoto — D13), verso la `scelta_singola` le opzioni diventano obbligatorie (`parseOptions`, come in creazione). È la domanda 1.

**2. La 0010 chiude la metà lasciata aperta dalla 0009.** `kb-0.md` §5 vuole il vincolo nel database, non solo nel codice, e con questa story il codice comincia davvero a riscrivere tipi: `questions_options_only_single_choice` è l'ultima difesa che rende impossibile il dato sporco da cui `block-card` già si difende. La debolezza `array['']` dell'altro vincolo resta rimandata: `parseOptions` è ancora l'unico percorso di scrittura delle opzioni. È la domanda 2.

**3. Il modulo di modifica duplica i campi della creazione, dichiaratamente.** Generalizzare `new-question-form.tsx` in un componente condiviso vorrebbe dire una macchina di props — id, default, etichetta del submit, semantica del reset, destinazione dell'autoFocus — dentro un file a 194 righe appena stabilizzato da una revisione. La duplicazione dichiarata di un modulo di quattro campi costa meno di quell'astrazione, e `kb-0.md` §9 condanna la duplicazione *silenziosa* e la riscrittura non concordata, non la copia consapevole. Se fra tre story i moduli sono tre, l'astrazione si fa lì, sapendo cosa deve servire. È la domanda 3.

**4. `checkViolationMessage` trasloca in `question-fields.ts` perché non può fare altrimenti.** Un file `'use server'` non esporta funzioni sincrone — ogni export dev'essere una Server Action — quindi condividere la mappatura vincolo → messaggio fra due file d'azione impone un modulo neutro. Il fallback diventa un parametro, così le costanti dei messaggi restano una copia per file (precedente 2.3). L'alternativa era duplicare venti righe di logica che divergono alla prima riscrittura. È la domanda 4.

**5. Una query sola, senza pre-lettura.** `createQuestion` legge due volte perché deve calcolare la posizione e distinguere i casi del blocco; `updateQuestion` non calcola niente e il caso «domanda non mia o sparita» lo dà gratis il `maybeSingle` sull'update stesso, come già fa `renameBlock`. Copiare le due letture della creazione sarebbe cargo cult: latenza doppia per informazioni che non servono.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Copiare le due letture di `createQuestion` | Due round trip per dati che l'update non usa | Una query: `.update().eq().select('id').maybeSingle()` (pattern `renameBlock`) |
| Scrivere `position`, `is_active` o `block_id` | Anticipa la 2.5 o la 2.6, o sposta la domanda di blocco | Quattro colonne: `text`, `help_text`, `answer_type`, `options` |
| Esportare `checkViolationMessage` da un file `'use server'` | La build si ferma: ogni export dev'essere un'azione asincrona | La funzione vive in `question-fields.ts` |
| Dimenticare `options = null` cambiando tipo | La 0010 rifiuta con `23514` e messaggio generico | Il server azzera sempre, come in `createQuestion` |
| Un ramo `23503` nell'update | Codice morto: l'update non scrive chiavi esterne | Solo `23514`, mappato |
| `as AnswerType` sul prefill del select | `answer_type` è `string` nei tipi generati; `as` è vietato | Guardia `isAnswerType`, ripiego `testo_lungo` |
| `element.reset()` nel modulo di modifica | Ripristinerebbe il prefill sopra quello che c'è scritto | Non serve: al successo il componente si smonta |
| Toccare `new-question-form.tsx` | 194 righe, appena uscito da revisione, fuori perimetro | Si imita, non si apre |
| `useEditableField` per il modulo | È per il campo singolo con baseline; qui i campi sono quattro | `useWrite`, modello `new-question-form` |
| Incrementare `questionnaires.version` | Contraddice la decisione registrata: si decide a fine Epic 2 | Nessuna scrittura su `questionnaires` |
| Scrivere `updated_at` a mano | Il trigger della 0006 lo fa già | Non si scrive |
| `id` dei campi senza `question.id` | Più moduli sulla stessa pagina, `id` duplicati | `domanda-${question.id}-…` |
| `'use client'` su `block-card.tsx` | Al browser la resa dell'intera card | Client solo `question-item` e il modulo |
| Tenere il testo vecchio sopra il modulo aperto | La stessa domanda due volte, di cui una vecchia | Il modulo sostituisce il display (argomento di `BlockTitleForm`) |
| `maxLength` sugli input | L'incolla si tronca in silenzio | Il limite lo dice il server |
| `cascade` nell'annullamento della 0010 | Vietato: D24, `database.md` §7 | `drop constraint` semplice |
| Applicare la migrazione dalla dashboard | Vietato senza eccezioni (`AGENTS.md`) | `apply_migration` col prefisso, poi `list_migrations` dice dieci |
| `--sec-questionario` dentro la pagina | UX-DR2: i colori di sezione vivono nella navigazione | Nessun token di sezione sotto `questionario/` |
| Messaggio dedicato per il vincolo della 0010 | Frase per un caso irraggiungibile dall'interfaccia | Fallback generico, di proposito |

### Contratto visivo

- Nessuna card nuova e nessun componente di disegno nuovo: il modulo vive dentro il `<li>` della domanda, coi campi di sempre (`.input`, `.input--long`, `.select`).
- `Modifica` è `btn--quiet`: azione terziaria, fino a ventitré istanze sulla pagina — stesso argomento di `Rinomina` e `Aggiungi domanda`. `Salva` dentro il modulo è `btn--primary` perché lì è l'unica azione; `Annulla` è `btn--secondary`.
- `.question__header` allinea testo e pulsante come `.card__header` allinea titolo e `Rinomina`: la domanda è il «titolo» della sua voce.
- L'errore è una riga `.field__error` in `--bad` con `role="alert"` — legittimo perché è un errore vero.
- Nessun colore di sezione nel contenuto (UX-DR2), nessun esadecimale, nessun numero fuori dalla scala di 4 (`design-system.md` §10, §4). Il select resta nativo.
- La voce: italiano, frase minuscola; l'unica parola nuova è `Modifica` (UX-DR13).

### Perimetro: cosa NON entra in questa story

- **Nessun riordino e nessuna rinumerazione**: `position` non si legge e non si scrive (Story 2.5).
- **Nessuna disattivazione e nessuna cancellazione**: `is_active` non si tocca (Story 2.6), e cancellare non esiste mai.
- **Nessuno spostamento di una domanda fra blocchi**: `block_id` non si scrive; non è di nessuna story, e se servisse è una decisione da prendere, non un campo da aggiungere.
- **Nessuna scrittura su `question_blocks`, `questionnaires`, `answers`, `assessments`**. In particolare `version` resta `1` (decisione registrata, fine Epic 2).
- **Nessun ritocco a `questions_single_choice_has_options`**: la debolezza `array['']` resta rimandata con il suo motivo.
- **Nessuna astrazione condivisa fra modulo di creazione e di modifica**: duplicazione dichiarata (decisione 3).
- **Nessuna correzione ai quirk del fuoco su input disabilitato né a `use-write.ts`**: voci della 5.2; la quarta istanza del quirk si annota nella voce esistente.
- **Nessun `maxLength`**, nessuna dipendenza nuova, nessun validatore esterno.
- **Nessun test oltre quelli di `question-fields.test.ts`**: azione e componenti sono integrazione e presentazione, la loro prova è Task 6 (`kb-0.md` §7).

### Test

Cosa entra: i casi di `checkViolationMessage` in `question-fields.test.ts`. È l'unica logica nuova che decide cosa arriva a schermo su un rifiuto del database — sbagliarla non produce un errore, produce un messaggio inglese di Postgres o una frase sbagliata al momento peggiore. I validatori riusati hanno già i loro 16+ casi e non si ritoccano; la 0010 riceve gratis i quattro controlli di `migrations.test.ts`.

Cosa **non** entra: `updateQuestion`, `question-item.tsx`, `edit-question-form.tsx`, `block-card.tsx`. L'azione sarebbe verificabile solo con un database, e un test che finge Supabase verifica il finto (stessa riga delle story precedenti).

### Project Structure Notes

```
supabase/
├── migrations/
│   └── 0010_question_options_check.sql   NUOVO — con la dichiarazione D24
└── migrations.test.ts                    INVARIATO — legge la cartella da sé

src/lib/
├── question-fields.ts                    MODIFICA — +checkViolationMessage (~130 righe)
├── question-fields.test.ts               MODIFICA — +casi (~180 righe)
└── answer-types.ts                       INVARIATO — si importa

src/app/(app)/questionario/
├── question-update-actions.ts            NUOVO — 'use server', una azione (~110 righe)
├── question-item.tsx                     NUOVO — 'use client' (~120 righe)
├── edit-question-form.tsx                NUOVO — 'use client' (~185 righe: sorvegliare il limite)
├── question-actions.ts                   MODIFICA — perde la funzione (~150 righe)
├── block-card.tsx                        MODIFICA — si accorcia (~55 righe)
├── actions.ts                            INVARIATO — 177 righe
├── new-question-form.tsx                 INVARIATO — 194 righe
└── page.tsx, loading.tsx, …              INVARIATI

src/app/globals.css                       MODIFICA — .question__header
docs/database.md                          MODIFICA — §3, §7
docs/bmad/implementazione/deferred-work.md  MODIFICA — due annotazioni
```

Convenzioni vincolanti (`kb-0.md` §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, un componente per file, nessun file sopra le 200 righe. `edit-question-form.tsx` è quello che rischia il limite: se lo supera, si asciugano i commenti ripetuti, non si spezza il componente in due.

### Piattaforma in uso, verificata

Identica alla 2.3, il 7 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`. Nessuna dipendenza entra o si aggiorna.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, nove migrazioni registrate col prefisso.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `.update().eq('id').select('id').maybeSingle()` su `questions` risponda la riga aggiornata, e zero righe su un id inesistente.** È il pattern di `renameBlock` su un'altra tabella: rischio basso, ma la 2.1 e la 2.3 hanno insegnato a non fidarsi di una forma PostgREST senza averla vista rispondere sul progetto vero.
- **Che l'`alter table` della 0010 passi su tutte le righe esistenti.** Contate il 7 agosto: 0 violazioni su 23. Da ricontare prima di applicare.
- **Che il vincolo rifiuti davvero** (`23514` su un update che mette opzioni a un `testo_lungo`), senza righe modificate residue.
- **Che il prefill sopravviva al giro del tipo**: opzioni scritte, tipo cambiato e ritornato, testo ancora lì — e che una domanda con aiuto `null` apra il campo vuoto, non con la parola `null` dentro.

### Intelligence dai commit e dalla story precedente

Da `55c6434`, `57c92eb` (Story 2.3), `9ecf54d`, `70272c7` (2.2), le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere**: AC2 e AC3 non sono verificabili oggi e si dichiarano onorate non scrivendo niente, non «verificate».
- **Un test si vede fallire prima di crederci**, con la tabella delle rotture nel Dev Agent Record e il ripristino verificato con `git diff`.
- **Il task di verifica è diviso in due**: parte agente e sessione di Luca; la seconda è la condizione per `done`.
- **Le domande si chiudono prima di implementare**: le quattro in fondo hanno il default già dentro i task; se Luca conferma, non cambia niente.
- **`apply_migration` col nome prefissato** conserva il prefisso (verificato con la 0009); la verifica con `list_migrations` è comunque un passo dichiarato (`database.md` §7).
- **Le revisioni delle story 2.x premiano**: campi controllati che sopravvivono ai cambi di tipo, `clearError` sul cambio del select, messaggi che nominano la riga — tutto già dentro i validatori e i pattern che questa story riusa senza riscriverli.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.4: Riscrivere una domanda]
- Le story vicine che questa non deve anticipare (2.5 riordina, 2.6 disattiva): [Source: docs/bmad/pianificazione/epics.md#Epic 2: Questionario che si cambia senza un rilascio]
- FR12, FR13, FR14; NFR10 (validazione sul server); NFR16: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- UX-DR2 (governo del colore), UX-DR10 (pulsanti), UX-DR13 (voce), UX-DR14 (etichette vere): [Source: docs/bmad/pianificazione/epics.md#UX Design Requirements]
- La copia del testo dentro la risposta, che rende AC2 e AC3 gratuite: [Source: docs/database.md#3. Tabelle] e [Source: docs/prd-v1.md#3. Entità e campi]
- La metà del vincolo assegnata alla 2.4: [Source: supabase/migrations/0009_question_checks.sql] e [Source: docs/database.md#3. Tabelle]
- Il formato della dichiarazione di reversibilità e il divieto di `cascade`: [Source: docs/database.md#7. Migrazioni] e [Source: docs/00-contesto-e-decisioni.md#D24]
- La policy che risale al questionario: [Source: supabase/migrations/0007_rls.sql:80]
- Il pattern dell'update con `maybeSingle`: [Source: src/app/(app)/questionario/actions.ts:155-170]
- I validatori scritti per il riuso di questa story: [Source: src/lib/question-fields.ts]
- Il software registra e mostra, non decide, e nessuno stato blocca: [Source: docs/00-contesto-e-decisioni.md#D14]
- Un valore non rilevato non si rappresenta come valore vuoto: [Source: docs/00-contesto-e-decisioni.md#D13]
- Il questionario è dati, non codice: [Source: docs/00-contesto-e-decisioni.md#D19]
- Story precedente, con le sue macchine e le sue lezioni: [Source: docs/bmad/implementazione/2-3-aggiungere-una-domanda-scegliendo-il-tipo-di-risposta.md]
- Le voci rimandate che questa story annota: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima di dev-story

**Chiuse da Luca il 7 agosto 2026: tutti e quattro i default confermati.** Nessun task cambia. Resta a dev-story scrivere l'esito delle domande 1 e 2 dove si cerca, in `database.md` §3 (Task 5), che era dovuto con qualunque esito.

Quattro, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. Le prime due sono strutturali e il loro esito va scritto in `database.md` §3.

1. **Il tipo di risposta si riscrive dal modulo di modifica?**
   È la decisione che la 2.3 ha assegnato per nome a questa story. Senza, per correggere un tipo sbagliato bisognerebbe disattivare la domanda e ricrearla, perdendo la posizione fino alla 2.5. Il default: sì, stesso select della creazione; via dalla scelta singola il server azzera le opzioni, verso la scelta singola le opzioni diventano obbligatorie.
   **Default: sì, il tipo si riscrive.** Se la risposta è no, il modulo perde il select, il campo opzioni compare solo sulle domande già `scelta_singola`, e la 0010 resta valida comunque.

2. **La 0010 col vincolo inverso entra?**
   `kb-0.md` §5 vuole il vincolo nel database, e questa è la story in cui il codice comincia a riscrivere tipi: senza vincolo, un bug nell'azzeramento produrrebbe il dato sporco da cui `block-card` si difende. La debolezza `array['']` dell'altro vincolo resta fuori di proposito.
   **Default: sì, `questions_options_only_single_choice` nella 0010.** Se la risposta è no, resta la sola disciplina applicativa e la metà della 0009 resta aperta in `deferred-work.md`.

3. **Il modulo di modifica duplica i campi della creazione, senza astrazione condivisa?**
   L'alternativa è generalizzare `new-question-form.tsx` (194 righe, appena revisionato) in un componente parametrico. La duplicazione è dichiarata e locale; l'astrazione si fa quando i moduli saranno tre, sapendo cosa deve servire.
   **Default: sì, duplicazione dichiarata, `new-question-form.tsx` non si apre.**

4. **`checkViolationMessage` trasloca in `question-fields.ts` con il fallback come parametro?**
   Condividerla è obbligato dal fatto che un file `'use server'` non esporta funzioni sincrone; la scelta vera è fra il trasloco nel modulo puro (testabile, una copia sola) e la duplicazione nel file nuovo.
   **Default: sì, trasloco con fallback, e i suoi casi entrano nel test.**

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (`claude-fable-5`), skill `bmad-dev-story`, 7 agosto 2026.

### Debug Log References

- **Riconteggio prima della 0010**: 23 domande, 0 con `options` su un tipo diverso da `scelta_singola`, 1 sola `scelta_singola` — identico al conteggio del 7 agosto in fase di creazione della story.
- **`apply_migration` col nome prefissato** (`0010_question_options_check`): il prefisso è stato conservato. `list_migrations` risponde **dieci** righe, `0010_question_options_check` in fondo, prefisso compreso. Nessun allineamento del registro necessario.
- **Il vincolo rifiuta davvero**: blocco `do $$` con `update` che mette `options` su una domanda `testo_lungo` → intercettato da `exception when check_violation` (che è per definizione SQLSTATE `23514`); il `raise exception` di guardia dentro il blocco non è scattato, quindi il ramo attraversato è quello del rifiuto. Riconteggio dopo la prova: 0 violazioni su 23, nessuna riga modificata residua.
- **La forma `.update().eq('id').select('id').maybeSingle()` su `questions`, verificata a metà**: sonda PostgREST senza sessione (pattern delle story precedenti): `PATCH …/questions?id=eq.<uuid inesistente>&select=id` risponde `200` con array vuoto — è lo «zero righe» che `maybeSingle` traduce in `QUESTION_GONE`; una colonna inventata nel payload risponde `PGRST204`, quindi le colonne scritte sono verificate contro lo schema. La metà «risponde la riga aggiornata» non è provabile senza una sessione autenticata (la RLS filtra tutto): è la stessa forma di `renameBlock`, in produzione dalla 2.2, e la conferma finale sta nella sessione di Luca.
- **Tabella delle rotture dei test** (`kb-0.md` §7 — visti fallire, poi ripristinati con `git diff` pulito):

| Rottura deliberata | Rossi attesi | Esito |
|---|---|---|
| Nome del vincolo storpiato (`questions_text_not_blankXX`) nel riconoscimento | 1 | 1 rosso: il caso del riconoscimento di `questions_text_not_blank` |
| `return fallback` sostituito con una costante interna | 3 | 3 rossi: vincolo 0010 → fallback, messaggio qualunque → fallback, fallback passato davvero |

  Prima dei rossi, il rosso strutturale: i cinque casi scritti prima dell'implementazione sono falliti con `SyntaxError: … does not provide an export named 'checkViolationMessage'`.
- **Verifica visiva di `.question__header`**: tentata con una riproduzione statica servita in locale (pattern in memoria), bloccata dai permessi del browser di sessione su localhost. La regola è minima — `flex`, `space-between`, `flex-start`, `gap: 12px`, tutti dalla scala di 4 — e ricalca `.card__header` (che usa gli stessi 12px); `flex-start` e non `center` perché il testo della domanda va a capo e il pulsante deve restare in alto. La conferma a schermo, 375px compresi, sta nella sessione di Luca, che la story già prevede.

### Completion Notes List

- **Task 1**: `0010_question_options_check.sql` con la dichiarazione D24 (reversibile sì, annullamento senza `cascade`). `questions_single_choice_has_options` non toccato: la debolezza `array['']` resta rimandata col suo motivo, annotato in `deferred-work.md`.
- **Task 2**: `checkViolationMessage` traslocata in `src/lib/question-fields.ts`, esportata, firma `(pgMessage, fallback)`; `question-actions.ts` la importa e passa `QUESTION_NOT_SAVED` (154 righe). Nessun messaggio dedicato per il vincolo della 0010, di proposito.
- **Task 3**: `updateQuestion` in `question-update-actions.ts` (113 righe), una azione sola, una query sola col pattern `renameBlock`, quattro colonne, `options = null` fuori dalla scelta singola, solo `23514` mappato, `revalidatePath('/questionario')` e basta, `UpdateQuestionState = { error?: string }` senza `saved`.
- **Task 4**: `question-item.tsx` (94 righe, il `<li>` spostato da `block-card` con i suoi commenti; quello sulle opzioni aggiornato perché citava l'assenza del vincolo che la 0010 ora porta) e `edit-question-form.tsx` (180 righe, duplicazione dichiarata della creazione, prefill con guardia `isAnswerType`, niente `reset()`, `clearError` su chiusura e cambio tipo). `block-card.tsx` a 56 righe, resta Server Component. `.question__header` in `globals.css`. Parola nuova a schermo: solo `Modifica`.
- **Task 5**: 5 casi nuovi per `checkViolationMessage` (124 test totali, +9 sui 115 della 2.3: 4 dalla migrazione, 5 dai casi); `migrations.test.ts` non toccato. `database.md` §3 (vincolo nel blocco `create table`, commento riscritto a due direzioni) e §7 (riga 0010). `deferred-work.md`: tre annotazioni su voci esistenti, nessuna voce nuova — `array['']` (motivo del rimando confermato), `is_active = false` estesa a `updateQuestion`, quarta istanza del quirk del fuoco su `edit-question-form.tsx` (quest'ultima dovuta dal Task 4). Niente in `00-contesto-e-decisioni.md`: le domande 1 e 2 sono chiuse coi default e l'esito sta in `database.md` §3, dove si cerca.
- **Task 6, parte agente**: `typecheck` e `build` passano (nessun export sincrono da file `'use server'`); 124 test verdi; dieci migrazioni a registro col prefisso; vincolo provato in rifiuto; grep del perimetro esatti (3 `.from('questions')`, 1 solo `update` su `questions`, 0 `answers`/`assessments`, 2 `questionnaires`, 4 `question_blocks`, tutte pre-esistenti); tutti i file sotto le 200 righe; `new-question-form.tsx` (194), `actions.ts` (177), `page.tsx`, `loading.tsx` non toccati; zero esadecimali e zero `--sec-questionario` sotto `questionario/`.
- **AC2 e AC3 si onorano non scrivendo niente**, e non si dichiarano verificate: `answers` e `assessments` sono vuote (Story 3.1 non esiste), nessuna scrittura le tocca — lo dice il grep — e la copia `question_text`/`block_title` nelle risposte è il meccanismo che le renderà vere senza codice.
- **Verifica di sessione completata da Luca l'8 agosto 2026**: tutte e 14 le caselle confermate, «funziona tutto». Con la sessione si chiudono anche le due conferme che la sonda senza sessione non copriva: la riga aggiornata risponde davvero (il display si aggiorna e la modifica sopravvive alla ricarica) e il prefill sopravvive al giro del tipo. La story passa a `done`.

### File List

- `supabase/migrations/0010_question_options_check.sql` — nuovo
- `src/lib/question-fields.ts` — modificato (+`checkViolationMessage`, 137 righe; la revisione la trasloca in fondo al file)
- `src/lib/question-fields.test.ts` — modificato (+5 casi, poi −1 sussunto dalla revisione: 190 righe)
- `src/app/(app)/questionario/question-actions.ts` — modificato (perde la funzione, la importa; 154 righe)
- `src/app/(app)/questionario/question-update-actions.ts` — nuovo (113 righe)
- `src/app/(app)/questionario/question-item.tsx` — nuovo (94 righe)
- `src/app/(app)/questionario/edit-question-form.tsx` — nuovo (180 righe; 228 dopo la revisione — sopra la soglia indicativa di kb-0.md §2, ma resta un componente solo: crescono i commenti portanti, l'avviso sulle opzioni e la conferma su `Annulla`)
- `src/app/(app)/questionario/block-card.tsx` — modificato (56 righe, resta server)
- `src/app/globals.css` — modificato (+`.question__header`)
- `docs/database.md` — modificato (§3, §7)
- `docs/bmad/implementazione/deferred-work.md` — modificato (tre annotazioni su voci esistenti; la revisione aggiunge la sezione 2.4 con tre voci, estende quella sul campo non annunciato e completa i riferimenti della quarta istanza)
- `docs/bmad/implementazione/sprint-status.yaml` — scrittura di metodo (stato della story)
- `docs/bmad/implementazione/2-4-riscrivere-una-domanda.md` — scrittura di metodo (questo file)

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 7 agosto 2026 | 0.1 | Story creata | Claude Fable 5, skill `bmad-create-story` |
| 7 agosto 2026 | 0.2 | Le quattro domande chiuse da Luca: default confermati, nessun task cambiato | Claude Fable 5, skill `bmad-create-story` |
| 7 agosto 2026 | 0.3 | Story implementata: migrazione 0010, `updateQuestion`, `Modifica` sulla domanda, 124 test verdi. Status → review; resta la sessione di Luca | Claude Fable 5, skill `bmad-dev-story` |
| 8 agosto 2026 | 0.4 | Verifica di sessione completata da Luca: 14 caselle confermate. Status → done | Claude Fable 5, skill `bmad-dev-story` |
| 8 agosto 2026 | 0.5 | Revisione del codice a tre livelli: 14 rilievi, 3 scartati, 3 decisioni di Luca (avviso perdita opzioni, conferma su `Annulla` a modulo modificato, corsa accettata nel ledger), 11 patch applicate. 123 test verdi, typecheck pulito. Due caselle di sessione nuove | Claude Fable 5, skill `bmad-code-review` |
