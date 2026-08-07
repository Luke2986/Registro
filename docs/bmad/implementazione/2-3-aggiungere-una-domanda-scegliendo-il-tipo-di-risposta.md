---
baseline_commit: 9ecf54d
---

# Story 2.3: Aggiungere una domanda scegliendo il tipo di risposta

Status: done

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 7 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want aggiungere una domanda dentro un blocco e dire che tipo di risposta mi aspetto,
so that il campo che mi trovo davanti in call è già quello giusto.

## Acceptance Criteria

**AC1 — la domanda nasce in fondo al blocco, attiva**
**Given** un blocco
**When** aggiungo una domanda con testo e testo di aiuto
**Then** viene creata in fondo al blocco, attiva, con posizione successiva all'ultima

**AC2 — quattro tipi, e la scelta singola vuole le opzioni**
**Given** la creazione di una domanda
**When** scelgo il tipo di risposta
**Then** posso scegliere fra testo lungo, testo breve, numero e scelta singola (FR14)
**And** se scelgo scelta singola posso elencare le opzioni, e senza almeno una opzione il salvataggio viene rifiutato

**AC3 — le schede già aperte restano com'erano**
**Given** una domanda appena creata
**When** apro una scheda nuova
**Then** la domanda c'è; le schede già aperte restano com'erano

> Questa story **scrive su una tabella sola**, `questions`, con un solo `insert`. Legge `question_blocks` e legge `questions`, ma non aggiorna niente: riscrivere una domanda è la 2.4, riordinare la 2.5, disattivare la 2.6. Se alla fine esiste un `update`, o una scrittura verso `question_blocks`, `questionnaires`, `answers` o `assessments`, la story è stata sbagliata.

> **La seconda metà di AC3 si soddisfa non facendo niente**, come la seconda metà di AC2 della Story 2.2. Le schede congelano `total_questions` all'apertura e ogni risposta porta la propria copia di testo e blocco (`database.md` §3): una domanda nuova non può toccare una scheda esistente perché non esiste nessun collegamento da aggiornare. Oggi, in più, `assessments` e `answers` sono vuote — la Story 3.1 non esiste — quindi questa metà **non è verificabile** e non si dichiara verificata: si onora non scrivendo niente.

> **`questionnaires.version` non cresce.** È la decisione registrata in `deferred-work.md` e in `database.md` §3 il 7 agosto 2026: nessuna scrittura dell'Epic 2 la fa crescere finché non esistono tutte e cinque, e si decide una volta sola alla fine dell'epic. Aggiungere una domanda è la modifica più «strutturale» di tutte, e la tentazione di incrementare qui sarà forte: si resiste, il motivo sta scritto là.

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0009: il testo non può essere vuoto, la scelta singola non può essere senza opzioni** (AC: 2)
  - [x] `supabase/migrations/0009_question_checks.sql`, file nuovo. È la seconda metà della voce rimandata dalla revisione della Story 2.1 — *«Da chiudere nella story che introduce la scrittura — … 2.3 e 2.4 per il testo — perché è lì che la validazione lato server va scritta comunque»* — e la scrittura la introduce questa story, quindi il vincolo entra qui, non nella 2.4.
  - [x] Due vincoli, con nomi espliciti perché l'annullamento deve poterli nominare (la seconda è l'esito della domanda 2, default sì):

    ```sql
    alter table questions
      add constraint questions_text_not_blank check (length(trim(text)) > 0);

    alter table questions
      add constraint questions_single_choice_has_options
      check (answer_type <> 'scelta_singola' or coalesce(array_length(options, 1), 0) > 0);
    ```

  - [x] Il secondo vincolo copre **una direzione sola**, ed è voluto: rifiuta la scelta singola senza opzioni (AC2), non le opzioni su un tipo che non le usa. `block-card.tsx:59-63` documenta già che lo schema non lega le due colonne in quel verso, e legarle adesso vorrebbe dire decidere per la Story 2.4 cosa succede riscrivendo il tipo di una domanda che ha opzioni. `coalesce(array_length(options, 1), 0)`: `array_length` su un array vuoto risponde `null`, non `0`, e senza il `coalesce` un `'{}'` passerebbe.
  - [x] **La dichiarazione di reversibilità è obbligatoria e ha un formato esatto** (D24, `database.md` §7). Tre chiavi, in quest'ordine, subito sotto la riga del titolo; una continuazione va su una riga `--` con **almeno due spazi** dopo i trattini (`migrations.test.ts:23`); si annulla in ordine inverso di aggiunta:

    ```sql
    -- 0009 vincoli sulle domande
    -- Reversibile: sì.
    -- Come si annulla: alter table questions drop constraint questions_single_choice_has_options;
    --   alter table questions drop constraint questions_text_not_blank;
    -- Cosa si perde: niente. I vincoli spariscono, le righe restano: né l'aggiunta né
    --   l'annullamento toccano un dato.
    ```

  - [x] Nessun `cascade` nell'annullamento; il controllo lo verifica comunque (`migrations.test.ts:33`).
  - [x] Prima di applicare, verificare che nessuna riga esistente violi i vincoli, altrimenti l'`alter table` fallisce a metà. Contato il 7 agosto 2026: 23 domande, 0 testi vuoti, 1 `scelta_singola` con 4 opzioni (`seed.sql:89-96`). Rifare il conteggio prima di applicare.
  - [x] **Applicare con `apply_migration` prima del codice che la usa**, mai dalla dashboard. Poi `list_migrations` deve rispondere **nove** righe con `0009_question_checks` in fondo. Quirk noto dalla 0008 (`deferred-work.md`, revisione 2.2): lo strumento registra il nome **senza il prefisso numerico**; se succede, allineare il registro con un `update` su `supabase_migrations.schema_migrations` (metadato dello strumento, non schema) e dichiararlo nel Dev Agent Record. Task 5 scrive questo passo in `database.md` §7, che è la chiusura che quella voce chiede.

- [x] **Task 2 — La validazione dei campi della domanda, modulo puro** (AC: 1, 2)
  - [x] File nuovo `src/lib/question-fields.ts`, sul modello di `src/lib/block-title.ts`: nessun React, nessun Supabase, così ci si mette un test sopra senza impalcatura (`kb-0.md` §7). La Story 2.4 riuserà questo modulo per la riscrittura: i limiti e i messaggi vivono in un posto solo.
  - [x] `INVISIBLE` si importa da `./validate-client-name.ts` e **non si riscrive** (`kb-0.md` §9). **L'import porta l'estensione `.ts`**: modulo raggiunto da un test, la catena si legge in `client-tags.ts:1`. `validate-client-name.ts` non importa niente, quindi la catena finisce lì. **Niente import da `./answer-types.ts`**: `isAnswerType` serve all'azione, non a questo modulo, e tenerlo fuori tiene corta la catena.
  - [x] Le costanti (esiti della domanda 3, default applicati): `QUESTION_TEXT_MAX_LENGTH = 300` (la più lunga del seed è 119 caratteri, e una domanda si legge ad alta voce in call), `QUESTION_HELP_MAX_LENGTH = 300` (la più lunga è 166), `QUESTION_OPTION_MAX_LENGTH = 80` (la più lunga è 25; un'opzione è una voce di un elenco, non una frase).
  - [x] `validateQuestionText(raw: unknown): { ok: true; text: string } | { ok: false; message: string }` — la stessa forma di `validateBlockTitle`, invisibili via e poi `trim()`, **ritorna il testo già ripulito** così il valore validato e il valore scritto sono lo stesso.
  - [x] `validateHelpText(raw: unknown): { ok: true; helpText: string | null } | { ok: false; message: string }` — il testo di aiuto è **facoltativo**: due domande su ventitré del seed non ce l'hanno, e la colonna è `null`-abile. Vuoto o soli invisibili → `{ ok: true, helpText: null }`, **`null` e non stringa vuota**: un valore non rilevato non si rappresenta come un valore vuoto (D13, stessa regola di `normalizeTextValue` in `people-actions.ts`).
  - [x] `parseOptions(raw: unknown): { ok: true; options: string[] } | { ok: false; message: string }` — divide per riga (`\n`, tollerando `\r\n`), su ogni riga toglie invisibili e fa `trim()`, scarta le righe vuote, rifiuta se una riga supera `QUESTION_OPTION_MAX_LENGTH`, rifiuta se non resta **almeno una** opzione (AC2). **Nessuna deduplicazione e nessun avviso di doppione**: due opzioni identiche sono un contenuto strano, non un errore — è la stessa lettura già scritta in `block-card.tsx:68-72`, e il software registra e mostra, non decide (D14).
  - [x] I messaggi in italiano, minuscoli, voce attiva, dicono cosa fare (UX-DR13, NFR16). Sul testo vuoto qualcosa come *«Scrivi il testo della domanda: senza, in call non c'è niente da chiedere.»* Sulle opzioni mancanti: *«Elenca almeno una opzione, una per riga: una scelta singola senza opzioni non si può compilare.»* Sui limiti: la forma di `validateBlockTitle`, che nomina il numero.

- [x] **Task 3 — La Server Action, in un file suo** (AC: 1, 2)
  - [x] File nuovo `src/app/(app)/questionario/question-actions.ts`, con `'use server'` in testa, **una azione sola**: `createQuestion`. Non dentro `actions.ts`: quel file è a 177 righe e l'azione nuova lo porterebbe oltre le 200 (`kb-0.md` §2). Il precedente è `clienti/actions.ts` con `people-actions.ts` accanto: le azioni dei blocchi e quelle delle domande sono due cose. Le costanti dei messaggi (`QUESTION_NOT_SAVED`, `BLOCK_GONE`) si ridefiniscono qui: tre righe simili valgono più di un modulo condiviso per quattro stringhe.
  - [x] Comincia con `openSession('createQuestion')` da `@/lib/supabase/session`; `block_id` si verifica con `isUuid` da `@/lib/uuid`. Nei log **solo `code` e `message`**, mai `details` — su un `insert` rifiutato `details` contiene la riga intera, cioè il testo della domanda, che è testo scritto da una persona (`kb-0.md` §3). Il `message` di un `23514` nomina solo il vincolo, e si può loggare.
  - [x] L'ordine delle validazioni: `validateQuestionText`, poi `isAnswerType` sul tipo (da `@/lib/answer-types`; un valore fuori dai quattro arriva solo da una richiesta forgiata: log e messaggio generico, non un messaggio dedicato), poi `validateHelpText`, poi `parseOptions` **solo se il tipo è `scelta_singola`**.
  - [x] **Per i tipi diversi da `scelta_singola`, `options` si scrive `null`**, qualunque cosa arrivi dal modulo: lo schema non lega le due colonne (`0004_questionnaire.sql:43`), e un array salvato su un `numero` sarebbe il dato sporco che `block-card.tsx:59-63` si difende dal mostrare. `null`, **non array vuoto**: la colonna è `null`-abile e il seed usa `null`.
  - [x] **Due letture, in quest'ordine.** La prima è il blocco, e non è ridondante rispetto alla policy: distingue «blocco non mio o sparito» da «blocco senza domande» (stesso ragionamento di `createBlock`, `actions.ts:58-75`) **e** consegna il `questionnaire_id` che serve alla seconda:

    ```ts
    // 1. esiste ed è mio: la riga la filtra la policy che risale al questionario
    const block = await session.supabase
      .from('question_blocks')
      .select('id, questionnaire_id')
      .eq('id', blockId)
      .maybeSingle()

    // 2. l'ultima posizione fra le domande DEL QUESTIONARIO, non del blocco: le posizioni
    //    delle domande sono globali (database.md §8), e il massimo del blocco + 1
    //    colliderebbe con la prima domanda del blocco successivo.
    const last = await session.supabase
      .from('questions')
      .select('position, question_blocks!inner(questionnaire_id)')
      .eq('question_blocks.questionnaire_id', block.data.questionnaire_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    ```

  - [x] La posizione nuova è `(last.data?.position ?? 0) + 1` — è l'esito della domanda 1, default applicato: **il massimo globale del questionario, più uno**. Non `Math.max(...positions)` su un array letto per intero (con zero domande risponde `-Infinity`), e **non il massimo del blocco più uno**: il blocco `Dove si rompe` ha le posizioni 10-11, e una domanda nuova a 12 sarebbe un duplicato della prima di `Conoscenza e misura`. Con il massimo globale la domanda nasce comunque **in fondo al suo blocco**, perché dentro ogni blocco le posizioni restano crescenti e `page.tsx:73-75` ordina le domande per `position` dentro il blocco. Quello che si sospende è la promessa che `position` sia l'ordine dell'intervista attraverso i blocchi: la rinumerazione è della Story 2.5, e Task 5 scrive questa sospensione dove si cerca, in `database.md` §8.
  - [x] `question_blocks!inner` **non è decorativo**: senza `!inner` il filtro sull'innesto svuota l'innesto invece di filtrare le domande, e il massimo diventerebbe quello di tutti i questionari del proprietario. Oggi il questionario è uno e il risultato sarebbe identico; il filtro è quello che tiene vera l'affermazione il giorno che sono due (stessa disciplina di `createBlock`, `actions.ts:79-82`). La forma va **verificata sul progetto** prima di fidarsi, come la 2.1 ha fatto con `referencedTable`: vedi «Da confermare eseguendo».
  - [x] L'`insert` scrive **sei colonne e basta**: `block_id`, `text`, `help_text`, `answer_type`, `options`, `position`. **Niente `is_active`**: il default dello schema è `true`, ed è esattamente l'«attiva» di AC1 — scriverlo vorrebbe dire tenere due posti allineati a mano. Niente `id`, `created_at`, `updated_at`: hanno i loro default e il loro trigger.
  - [x] I codici di errore che si distinguono: `23503` (chiave esterna verso `question_blocks`) vuol dire che il blocco è sparito fra la lettura e la scrittura — non un guasto passeggero, messaggio «non più disponibile, ricarica», mai «riprova». `23514` è un vincolo `check`, e qui **possono essere tre**: i due della 0009 più `questions_answer_type_check` della 0004. Si distinguono dal nome del vincolo dentro `error.message` — i nomi sono nostri e stabili: `questions_text_not_blank` → il messaggio di `validateQuestionText('')`, `questions_single_choice_has_options` → il messaggio di `parseOptions('')`, tutto il resto → il generico. È l'ultima difesa e non dovrebbe scattare mai, perché la validazione rifiuta prima; se scatta, il messaggio resta il nostro e non quello di Postgres.
  - [x] Chiude con `revalidatePath('/questionario')` e **solo quello**: le domande non compaiono nell'elenco clienti e questa scrittura non muove `clients.updated_at`.

- [x] **Task 4 — Il modulo a schermo, dentro ogni card di blocco** (AC: 1, 2)
  - [x] File nuovo `src/app/(app)/questionario/new-question-form.tsx`, con `'use client'`. Riceve `blockId` e nient'altro. Un componente per file (`kb-0.md` §2).
  - [x] **Si monta in `block-card.tsx`, in fondo alla card**, dopo l'elenco delle domande o dopo il messaggio «Nessuna domanda in questo blocco» — un solo punto di montaggio che serve tutti e due i rami, dove la domanda nuova nascerà (stessa regola del pulsante unico della 2.2). `block-card.tsx` **resta un Server Component**: monta il modulo e non prende `'use client'` — lo stato `adding` sta dentro `NewQuestionForm`, che rende sia il pulsante sia il modulo (identico al rapporto fra `block-card` e `BlockTitleForm`). `page.tsx` **non si tocca**.
  - [x] **Il pulsante `Aggiungi domanda` è `btn btn--quiet`**, non `btn--secondary`: sono otto istanze, una per card, e otto pulsanti bordati uno sotto l'altro pesano quanto il contenuto — è lo stesso motivo per cui `Rinomina` è quiet mentre `Aggiungi blocco`, che è uno solo, è secondary (Story 2.2, Task 4).
  - [x] Aperto, il modulo è un `<form className="form">` (`globals.css:524`: colonna, gap 20, max 480) con questi campi, ciascuno `.field` con `<label className="label">` vera — mai solo un segnaposto (UX-DR14):
    - **`Testo della domanda`** — `<textarea className="input input--long">`, `autoFocus` (il pulsante che ha aperto il modulo non c'è più). Una domanda arriva a 119 caratteri già oggi: un campo a una riga la nasconderebbe.
    - **`Cosa serve capire`** — `<textarea className="input input--long">`, facoltativo. L'etichetta è questa e non «testo di aiuto»: è il nome con cui la cosa esiste nel metodo (D7, D19, e il commento della colonna in `0004_questionnaire.sql`), e le etichette nominano le cose come le riconosce chi le usa (UX-DR13).
    - **`Tipo di risposta`** — `<select className="input select">` con le quattro `<option>` generate da `ANSWER_TYPES` con `answerTypeLabel` (`@/lib/answer-types`): la mappa valore → etichetta esiste e **non si riscrive**. Preselezionato `testo_lungo`, che è il default dello schema e il tipo di 22 domande su 23.
    - **`Opzioni, una per riga`** — `<textarea className="input input--long">`, **resa solo quando il select vale `scelta_singola`** (esito della domanda 4, default applicato): un `useState` sul valore del select, il campo compare e scompare con il tipo. Quando è nascosto non si manda niente al server, e comunque il server ignora `options` per gli altri tipi (Task 3).
  - [x] Gli `id` dei campi portano il `blockId` (`nuova-domanda-${blockId}-testo`, …): il modulo esiste in otto istanze sulla stessa pagina e gli `id` non si possono ripetere.
  - [x] Il modulo si chiama con `useWrite` da `@/lib/use-write`, non con `useActionState`: un rifiuto della promessa risalirebbe al confine d'errore, che sostituisce l'intera schermata (`use-write.ts:19-22`). `element.reset()` **solo dopo un successo**, così una domanda rifiutata resta dov'è insieme al suo errore; `clearError()` alla chiusura. È il pattern esatto di `new-block-form.tsx:51-70`.
  - [x] L'errore del server è uno solo e si rende in un unico `<p className="field__error" role="alert">` sopra le azioni, come `new-person-form.tsx:110`: con quattro campi non c'è un input solo a cui agganciare `aria-describedby`, e il modello multi-campo è quello delle persone, non quello del titolo.
  - [x] `Salva` è `btn--primary` (dentro il modulo è l'unica azione), `Annulla` è `btn--secondary`; tutti e due `disabled={pending}`, e anche i campi, come `new-block-form.tsx:85` — il quirk del fuoco che cade sul body a input disabilitato è noto, rimandato alla 5.2, e **non si corregge qui**.
  - [x] Alla chiusura — da `Annulla` o dopo un successo — il fuoco torna sul pulsante `Aggiungi domanda`, che ricompare nello stesso posto: il meccanismo `returning` di `new-block-form.tsx:29-34`, uguale.
  - [x] **Nessun `maxLength` su nessun campo**: il limite lo dice il server con il messaggio che spiega cosa fare (voce rimandata del 3 agosto, non se ne aggiunge un'istanza nuova).
  - [x] Le parole nuove a schermo: `Aggiungi domanda` (pulsante e nome dell'azione ovunque), `Testo della domanda`, `Cosa serve capire`, `Tipo di risposta`, `Opzioni, una per riga`, più i messaggi di Task 2 e quelli d'errore dell'azione. Italiano, frase minuscola, niente punti esclamativi (UX-DR13).
  - [x] Se serve una misura di stacco fra l'elenco delle domande e il pulsante, è **una classe nuova con una proprietà sola** in `globals.css`, valore dalla scala di 4, come `.block-rename` della 2.2. Probabilmente non serve niente: verificare prima di aggiungere.

- [x] **Task 5 — Il test, e i tre documenti da allineare** (AC: 1, 2)
  - [x] `src/lib/question-fields.test.ts`, accanto al modulo, con `node:test` e `node:assert/strict`, import con estensione `.ts`. I casi:
    - `validateQuestionText`: un testo normale torna `ok` e ripulito; soli spazi rifiutato; soli invisibili rifiutato (il caso che `trim()` da solo non copre); invisibili in mezzo spariscono senza far cadere il testo; `undefined`, `null` e un numero rifiutati; 300 caratteri passano e 301 no.
    - `validateHelpText`: vuoto, soli spazi e `undefined` tornano `ok` con `null`; un testo torna ripulito; 301 caratteri rifiutati.
    - `parseOptions`: una riga valida torna `[opzione]`; più righe tornano nell'ordine scritto; righe vuote e di soli spazi scartate; `\r\n` tollerato; soli spazi in tutto il campo → rifiutato perché resta zero; un'opzione di 80 passa e una di 81 no; **due opzioni identiche restano due**, perché la deduplicazione qui sarebbe una decisione, non una pulizia.
  - [x] **Un test che non è stato visto fallire quando doveva non è un test** (`kb-0.md` §7): rompere di proposito il controllo del vuoto, quello del limite e quello dello «almeno una», verificare i rossi, ripristinare con `git diff` a zero. Tabella delle rotture nel Dev Agent Record, come le Story da 1.6 in poi.
  - [x] `supabase/migrations.test.ts` **non si modifica**: la 0009 entra da sé con i suoi quattro controlli. Il totale cresce di 4 anche senza scrivere una riga; se non cresce, la migrazione non è dov'è attesa.
  - [x] **`docs/database.md` §3**: il blocco `create table questions` prende i due vincoli nuovi, come §3 ha già preso quello della 0008 — uno schema descritto senza un vincolo che esiste è una bugia documentale.
  - [x] **`docs/database.md` §7**: l'elenco dei file aggiunge `0009_question_checks.sql`, una riga. E un capoverso operativo nuovo, breve: `apply_migration` registra il nome senza il prefisso numerico, quindi dopo ogni migrazione si verifica `list_migrations` e si allinea il registro se serve. È la chiusura che la voce della revisione 2.2 chiede («la verifica entra … come passo dichiarato, con l'allineamento del registro come rimedio noto»), scritta dove si cercano le migrazioni.
  - [x] **`docs/database.md` §8**: il capoverso sulle posizioni globali si aggiorna con l'esito della domanda 1 — le domande nuove nascono al massimo globale + 1, quindi da questa story `position` ordina dentro il blocco ma smette di essere il numero d'ordine dell'intervista attraverso i blocchi, finché la Story 2.5 non rinumera. Scritto **dove si cerca**, che è la lezione esplicita della 2.1 e della 2.2 sulle decisioni rimandate.
  - [x] **`deferred-work.md`**, due voci:
    - la voce della revisione 2.1 sul `check` mancante si chiude **del tutto**: la 2.2 ha protetto `question_blocks.title`, questa protegge `questions.text`. Si barra con la nota di chiusura, come le altre voci chiuse in quel file.
    - la voce della revisione 2.2 sul quirk di `apply_migration` si chiude se il capoverso di §7 entra davvero; la chiusura si scrive per esteso, con il riferimento a §7.
  - [x] Nessun'altra voce si tocca. Se ne emergono di nuove, si aggiungono sotto un'intestazione della revisione, non di questa story. Niente in `00-contesto-e-decisioni.md`, salvo esito diverso dai default delle domande 1 e 2, che sono le due strutturali.

- [x] **Task 6 — La verifica** (AC: 1, 2, 3)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa.
  - [x] `npm test` passa e il totale **cresce** rispetto ai 91 della Story 2.2: quattro dalla migrazione nuova, più quelli di `question-fields.test.ts`. Un test che sparisce non è rosso, è assente. *(111: 91 + 4 + 16)*
  - [x] `list_migrations` risponde **nove** righe, con `0009_question_checks` in fondo, **con il prefisso**.
  - [x] I vincoli esistono davvero: un `insert` di prova con `text = '   '` rifiutato con `23514`, un `insert` di prova `scelta_singola` senza `options` rifiutato con `23514`, e **nessuna riga di prova resta** nel database (l'istruzione fallita non scrive per definizione; ricontare comunque, e dichiararlo nel Dev Agent Record). *(Ricontato: 23 righe, 0 a posizione di prova.)*
  - [x] La lettura con `question_blocks!inner` risponde la posizione massima giusta sul progetto vero — vedi «Da confermare eseguendo». *(Prova equivalente alla 2.1, dettagli nel Dev Agent Record: il filtro raggiunge il join generato, e il massimo in SQL è 23 con tutte e due le forme.)*
  - [x] `question-fields.ts` non importa né React né Supabase, e il suo unico import porta l'estensione `.ts`.
  - [x] Tutti i file toccati restano sotto le 200 righe; `actions.ts` **non è stato toccato** e resta a 177.
  - [x] Sotto `src/app/(app)/questionario/` nessun `--sec-questionario` e nessun valore esadecimale (UX-DR2); se `globals.css` è cambiato, solo la classe eventuale di Task 4, senza esadecimali e con valori della scala di 4. *(`.block-add-question`, una proprietà, 20px.)*
  - [x] Il grep delle scritture: nessun `update` in `question-actions.ts`; `.from('questions')` sotto `questionario/` compare **due volte, tutte e due in `question-actions.ts`** (la lettura della posizione e l'`insert`) — la stringa `questions(` dentro la `select` di `page.tsx` è un innesto, non un `.from`, e non si conta; `.from('question_blocks')` compare **quattro volte**: le tre pre-esistenti di `actions.ts` (lettura della posizione, insert, update della rinomina) più la lettura di controllo nuova; `.from('questionnaires')` resta a **due**, entrambe letture pre-esistenti (`actions.ts:61`, `page.tsx:56`); zero `.from('answers')`, zero `.from('assessments')`.
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`), dichiarate nel File List.

  Richiede una sessione, la fa Luca — **fatta il 7 agosto 2026, dopo le patch di revisione**:
  - [x] Apro `/questionario`: in fondo a ogni card di blocco c'è `Aggiungi domanda`, discreto, e la pagina si legge come prima.
  - [x] Aggiungo una domanda `testo lungo` con testo e «cosa serve capire» a un blocco in mezzo alla pagina: compare **in fondo a quel blocco**, marcata `attiva`, con il badge `testo lungo` (AC1).
  - [x] Ricarico: la domanda è ancora lì, in fondo al suo blocco, non altrove.
  - [x] Ne aggiungo una seconda allo stesso blocco: va dopo la prima.
  - [x] Aggiungo una domanda al blocco senza domande creato durante la verifica della 2.2: il messaggio «Nessuna domanda in questo blocco» sparisce e la domanda c'è.
  - [x] Scelgo `scelta singola`: compare il campo delle opzioni. Salvo senza opzioni: rifiutato con il messaggio, e quello che avevo scritto resta dov'è (AC2). Aggiungo due opzioni su due righe: salvata, e le opzioni si leggono sotto la domanda.
  - [x] Torno su `testo breve` dopo aver scritto opzioni: il campo sparisce, salvo, e la domanda non ha nessuna opzione.
  - [x] Provo un testo vuoto e uno di soli spazi: rifiutati con il messaggio sotto il modulo.
  - [x] `Annulla` chiude il modulo, quello che avevo scritto non viene salvato, il fuoco torna su `Aggiungi domanda`.
  - [x] Il testo di aiuto lasciato vuoto: la domanda si salva e sotto il testo non c'è nessun contenitore vuoto.
  - [x] Larghezza 375px: il modulo non scorre di lato, il select si usa, i bersagli si toccano.
  - [x] Da tastiera: Tab arriva a `Aggiungi domanda`, Invio apre il modulo, il fuoco entra nel primo campo, `Annulla` lo riporta sul pulsante.
  - [x] Nessun errore in console, nessun avviso di idratazione.
  - [x] Le domande di prova aggiunte durante la verifica: decisione presa in sessione. **Se si tolgono, si tolgono da SQL** — l'interfaccia non cancella domande, ed è voluto (Story 2.6: si disattiva, non si cancella).

### Review Findings

Revisione del 7 agosto 2026 (`bmad-code-review`, tre livelli: revisione cinica, caccia ai casi limite, audit degli AC). L'audit degli AC non ha trovato violazioni: tutte le affermazioni verificabili del Dev Agent Record risultano vere. Ventuno rilievi grezzi, quindici unici, tre scartati come rumore.

- [x] [Review][Decision] **Le opzioni scritte si perdono cambiando tipo nel select** — la textarea delle opzioni era non controllata e veniva smontata quando il tipo lascia `scelta_singola`: un tocco accidentale sul select cancellava quello che c'era scritto. Conflitto fra la lettera della story («il campo compare e scompare col tipo», protetti solo «gli altri campi») e `kb-0.md` §6 (il lavoro non si perde). **Deciso da Luca il 7 agosto 2026: campo controllato.** Il valore vive in uno `useState`, il campo si smonta col tipo ma il testo sopravvive e ricompare; il server già scrive `null` per gli altri tipi, quindi nessun dato sporco. Applicato. [src/app/(app)/questionario/new-question-form.tsx]
- [x] [Review][Decision] **Nessun tetto al numero di opzioni** — `parseOptions` limitava la singola riga (80) ma non il conteggio: un incolla di mille righe corte diventava mille opzioni valide, non correggibili dall'interfaccia prima della 2.4. **Deciso da Luca il 7 agosto 2026: tetto a 20** (`QUESTION_OPTIONS_MAX_COUNT`), con messaggio nello stile degli altri limiti e test al confine esatto. Applicato. [src/lib/question-fields.ts]
- [x] [Review][Decision] **I newline interni a testo e aiuto si salvano ma non si vedono** — le textarea accettano invii, i validatori li conservavano, la card li collassa in spazi: salvato e mostrato divergevano, e la 3.1 avrebbe copiato la divergenza nelle risposte. **Deciso da Luca il 7 agosto 2026: normalizzazione al salvataggio.** Ogni sequenza di whitespace interno collassa in uno spazio in `validateQuestionText` e `validateHelpText`; le opzioni non cambiano, lì il newline è il separatore. Applicato. [src/lib/question-fields.ts]

- [x] [Review][Patch] Copertura test asimmetrica sui non-string: aggiunti `null` e numero a `validateHelpText` (valgono come assente → `null`) e a `parseOptions` (rifiutati) [src/lib/question-fields.test.ts]
- [x] [Review][Patch] L'errore sulle opzioni restava a schermo dopo che il campo era sparito cambiando tipo: `clearError()` ora anche nell'`onChange` del select [src/app/(app)/questionario/new-question-form.tsx]
- [x] [Review][Patch] Il messaggio sul limite di un'opzione ora nomina la riga che sfora («La riga 2 supera il limite di 80 caratteri…») [src/lib/question-fields.ts]

Dopo le patch: typecheck e build puliti, **115 test verdi** (111 + 4 nuovi); i tre controlli nuovi visti fallire con rotture mirate e ripristinati (tetto oltrepassato non rifiutato → 1 rosso; normalizzazione tolta → 2 rossi; numero di riga sbagliato nel messaggio → 1 rosso). File tutti sotto le 200 righe (`question-fields.ts` 108, il suo test 145, `new-question-form.tsx` 194). Il comportamento nuovo del modulo — opzioni che sopravvivono al cambio tipo — entra nella sessione di verifica di Luca, che resta la condizione per `done`.

- [x] [Review][Defer] La corsa lettura-scrittura sulla posizione vale anche per `createQuestion`, e più larga: il massimo è globale, due aggiunte simultanee collidono anche su blocchi diversi [src/app/(app)/questionario/question-actions.ts:122-147] — deferred, annotata nella voce esistente di `deferred-work.md` come la story prescrive
- [x] [Review][Defer] `createQuestion` accetta un blocco di un questionario con `is_active = false`, gemella della voce di `createBlock` [src/app/(app)/questionario/question-actions.ts:96-110] — deferred, pre-esistente come classe, voce estesa
- [x] [Review][Defer] I campi disabilitati durante `pending` scaricano il fuoco sul body anche in questo modulo [src/app/(app)/questionario/new-question-form.tsx:102] — deferred, pattern noto della Story 5.2, voce estesa
- [x] [Review][Defer] `questions_single_choice_has_options` accetta elementi vuoti: `array['']` passa, il check conta gli elementi e non la sostanza [supabase/migrations/0009_question_checks.sql:24-25] — deferred, raggiungibile solo da SQL, correggerlo ora sarebbe una migrazione per un caso non provocabile
- [x] [Review][Defer] Gli invisibili fuori dall'insieme `INVISIBLE` (U+200E/U+200F, U+00AD, …) passano validatore e vincolo [src/lib/question-fields.ts:2] — deferred, classe pre-esistente ereditata da `validate-client-name.ts`, vale anche per nomi cliente e titoli di blocco
- [x] [Review][Defer] Il campo opzioni che compare e scompare col tipo non è annunciato agli screen reader [src/app/(app)/questionario/new-question-form.tsx:145-153] — deferred, classe accessibilità della Story 5.2

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository il 7 agosto 2026, baseline `9ecf54d`.

**La schermata c'è e ha già le sue scritture.** `questionario/page.tsx` legge il questionario attivo con blocchi e domande innestati, ordinati dal database su `position, created_at, id` a tutti e due i livelli; `block-card.tsx` rende una card per blocco, con la resa delle domande completa di badge del tipo, stato attiva/non attiva e opzioni; `actions.ts` ha `createBlock` e `renameBlock`. Non si riscrive niente: si aggiunge.

**Lo stato del database, contato il 7 agosto 2026:** 1 questionario, 8 blocchi (`position` 1-8 per questionario), 23 domande (`position` **1-23 globali**), 1 sola `scelta_singola` con 4 opzioni, 22 `testo_lungo`, 0 testi vuoti; testo più lungo 119 caratteri, aiuto più lungo 166, opzione più lunga 25. Otto migrazioni registrate. `questions` **ha** `updated_at` e il trigger (`0006_triggers.sql:40-41`), a differenza di `question_blocks`: un insert però non lo muove, scrive solo il default.

**Le macchine di scrittura ci sono tutte.** `openSession`, `isUuid`, `useWrite` (`use-write.ts`), il pattern «un pulsante scopre un modulo» con fuoco di ritorno (`new-block-form.tsx`), il modulo multi-campo con errore unico (`new-person-form.tsx`). E soprattutto **`answer-types.ts` esiste dalla 2.1**: `ANSWER_TYPES`, `isAnswerType`, `answerTypeLabel` — il select dei tipi e la validazione del tipo non scrivono una mappa nuova.

**Le classi che servono esistono tutte:** `.form`, `.field`, `.label`, `.input`, `.input--long`, `.select`, `.field__actions`, `.field__error`, `.btn--primary`, `.btn--secondary`, `.btn--quiet`. Al più manca uno stacco sotto l'elenco delle domande, da verificare prima di aggiungere.

**La policy copre già le domande.** `questions_owner_all` risale al questionario (`0007_rls.sql:80`): l'`insert` su un blocco altrui viene rifiutato dal database anche senza la lettura di controllo, che serve a distinguere i casi, non a proteggere.

### Cosa cambia questa story, file per file

```
supabase/migrations/0009_question_checks.sql       NUOVO — i due check, con la dichiarazione D24
src/lib/question-fields.ts                         NUOVO — validazioni e limiti, modulo puro
src/lib/question-fields.test.ts                    NUOVO — il suo test
src/app/(app)/questionario/question-actions.ts     NUOVO — 'use server', createQuestion
src/app/(app)/questionario/new-question-form.tsx   NUOVO — 'use client', il pulsante e il modulo
src/app/(app)/questionario/block-card.tsx          MODIFICA — monta NewQuestionForm, resta server
src/app/globals.css                                MODIFICA — solo se serve lo stacco, una proprietà
docs/database.md                                   MODIFICA — §3 i vincoli, §7 il file e il passo operativo, §8 la posizione
docs/bmad/implementazione/deferred-work.md         MODIFICA — due voci chiuse
```

`page.tsx`, `actions.ts`, `block-title-form.tsx`, `new-block-form.tsx`, `loading.tsx`, `answer-types.ts`, `block-title.ts` **non si aprono**. Niente sotto `clienti/`, nessuna dipendenza nuova.

### Le cinque decisioni di questa story

**1. La posizione è il massimo globale del questionario, più uno.** È il punto che la 2.2 ha lasciato scritto come «l'ambiguità che la Story 2.3 dovrà chiudere»: le domande sono numerate 1-23 attraverso il questionario intero, i blocchi 1-8 per questionario (`database.md` §8). Le tre strade: il massimo del blocco + 1 produce duplicati fra blocchi (il blocco 4 finisce a 11, il 5 comincia a 12: una domanda nuova nel 4 a 12 è un duplicato); rinumerare tutto a ogni aggiunta è una scrittura su molte righe senza transazione — PostgREST non ne offre una — cioè la Story 2.5 costruita male in anticipo; il massimo globale + 1 non produce duplicati, mette la domanda in fondo al suo blocco (le posizioni dentro ogni blocco restano crescenti, e la pagina ordina per `position` dentro il blocco), e lascia intera alla 2.5 la decisione su cosa voglia dire rinumerare. Il costo: `position` smette di essere il numero d'ordine dell'intervista attraverso i blocchi finché la 2.5 non passa. Il costo è accettabile perché oggi nessuno legge quella semantica — `answers.position` la copierà la Story 3.1, che nell'ordine dello sprint viene **dopo** la 2.5. È la domanda 1, e va scritta in `database.md` §8 se il default regge.

**2. La migrazione 0009 entra, ed entra qui, con due vincoli.** La voce rimandata della revisione 2.1 assegna il `check` su `questions.text` alla story che introduce la scrittura, e la scrittura la introduce questa (la 2.4 riscrive, non crea). Il vincolo sulle opzioni è la stessa logica applicata ad AC2: `kb-0.md` §5 vuole il vincolo nel database e non solo nel codice, e il database è «l'ultima difesa contro i dati incoerenti». Una direzione sola, però: la 0009 rifiuta la scelta singola senza opzioni, non le opzioni sugli altri tipi — quella metà appartiene alla 2.4, che deciderà cosa succede riscrivendo il tipo.

**3. L'azione sta in un file suo.** `actions.ts` è a 177 righe: con `createQuestion` dentro supererebbe le 200, e a quel punto conterrebbe due cose (`kb-0.md` §2). `question-actions.ts` segue il precedente di `people-actions.ts`, e il nome dice cosa contiene.

**4. Le opzioni si scrivono in una textarea, una per riga.** L'alternativa — campi ripetibili con aggiungi/togli riga — è più codice, più gestione del fuoco, più stati, per un campo che nella vita reale porta tre o quattro voci corte. La textarea è il compromesso del progetto: venti righe invece di una libreria (`kb-0.md` §2). Il parsing sta nel modulo puro ed è testato. È la domanda 4.

**5. `options` è `null` per i tipi che non le usano, sempre.** Il modulo può mandare opzioni scritte e poi il tipo cambia prima del salvataggio: il server non si fida della coerenza del client (`kb-0.md` §3) e azzera lui. L'alternativa — salvare quello che arriva — produrrebbe il dato sporco che `block-card.tsx` già si difende dal mostrare.

### Una corsa nota, e perché si accetta

Due aggiunte in volo insieme — anche su **blocchi diversi**, perché il massimo è globale — leggono la stessa «ultima posizione» e nascono con la stessa `position`. È la stessa corsa di `createBlock`, già registrata in `deferred-work.md` (revisione 2.2) e accettata con lo stesso ragionamento della corsa sui tag (decisione di Luca del 3 agosto 2026): richiede due schede aperte nello stesso secondo con un utente solo (D9), l'ordine a schermo resta stabile perché la pagina ordina su `position, created_at, id`, e l'alternativa è una funzione nel database, cioè un'altra migrazione per una corsa che non si riesce a provocare. La revisione annota l'estensione alle domande nella voce esistente, non in una voce nuova.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Massimo del blocco + 1 | Duplica la posizione della prima domanda del blocco dopo | Massimo globale del questionario, domanda 1 |
| Filtro sull'innesto senza `!inner` | L'innesto si svuota, le domande restano tutte: massimo di tutti i questionari | `question_blocks!inner` + verifica sul progetto |
| `Math.max(...positions)` | Con zero domande dà `-Infinity + 1` | `.order(desc).limit(1).maybeSingle()`, poi `?? 0` |
| Incrementare `questionnaires.version` | Contraddice la decisione registrata: si decide a fine Epic 2 | Nessuna scrittura su `questionnaires` |
| Scrivere `is_active: true` nell'insert | Due posti da tenere allineati a mano | Il default dello schema è già l'«attiva» di AC1 |
| Salvare `options` su un tipo non `scelta_singola` | Il dato sporco che `block-card` si difende dal mostrare | Il server azzera: `null`, non array vuoto |
| Array vuoto invece di `null` | Un «nessun valore» rappresentato come valore | `null`, come nel seed |
| `createQuestion` dentro `actions.ts` | Il file supera le 200 righe e contiene due cose | File nuovo `question-actions.ts` |
| Una mappa nuova tipo → etichetta | `answerTypeLabel` esiste dalla 2.1 | Si importa, non si riscrive |
| `'use client'` su `block-card.tsx` | Va al browser la resa di 23+ domande di testo fermo | Client solo il modulo nuovo |
| `useActionState` sul modulo | Una rete caduta porta via la schermata | `useWrite`, che esiste per questo |
| `maxLength` sugli input | L'incolla si tronca in silenzio, il messaggio muore invisibile | Il limite lo dice il server |
| Un solo `aria-describedby` su quattro campi | Aggancio arbitrario e fuorviante | Errore unico `role="alert"`, modello `new-person-form` |
| `id` dei campi senza `blockId` | Otto istanze, `id` duplicati nella pagina | `nuova-domanda-${blockId}-…` |
| Import senza estensione nella catena del test | `ERR_MODULE_NOT_FOUND` da un file non toccato | `.ts` su tutta la catena |
| `details` dell'errore nei log | Contiene la riga intera, cioè il testo della domanda | Solo `code` e `message` |
| Dedup o avviso di doppione sulle opzioni | Una decisione travestita da pulizia | Si registra e si mostra (D14) |
| Applicare la migrazione dalla dashboard | Vietato senza eccezioni (`AGENTS.md`) | `apply_migration`, poi `list_migrations` dice nove |
| Fidarsi del nome registrato da `apply_migration` | La 0008 è stata registrata senza prefisso | Verifica dichiarata + allineamento del registro |
| `--sec-questionario` dentro la pagina | UX-DR2: i colori di sezione vivono nella navigazione | Nessun token di sezione sotto `questionario/` |
| `any` o `as` per far tacere il compilatore | Vietato (`kb-0.md` §2) | Tipi derivati da `database.types.ts` |

### Contratto visivo

- Nessuna card nuova e nessun componente di disegno nuovo: il modulo vive dentro la card del blocco, coi campi di sempre (`.input`, `.input--long`, `.select` — fondo `--surface`, bordo `--line`, raggio `--r-md`, min 44px).
- `Aggiungi domanda` è `btn--quiet` (otto istanze, azione terziaria — UX-DR10 come il progetto la applica); `Salva` dentro il modulo è `btn--primary` perché lì è l'unica azione; `Annulla` è `btn--secondary`.
- L'errore è una riga `.field__error` in `--bad` — legittimo perché è un errore vero — con `role="alert"`.
- **Nessun colore di sezione dentro il contenuto** (UX-DR2), nessun valore esadecimale, nessun numero fuori dalla scala di 4 (`design-system.md` §10, §4).
- Il select resta nativo: `.select` non ha `appearance: none` di proposito (`globals.css:503-508`), e sul tablet il controllo nativo si comporta meglio di qualunque sostituto.
- La voce: italiano, frase minuscola, l'azione si chiama `Aggiungi domanda` dal pulsante alla fine (UX-DR13).

### Perimetro: cosa NON entra in questa story

- **Nessun `update` su `questions`.** Riscrivere testo, aiuto, tipo o opzioni di una domanda esistente è la Story 2.4.
- **Nessun riordino e nessuna rinumerazione.** La posizione la calcola il server e non si mostra né si chiede; «posizioni consecutive» è la Story 2.5. La sospensione della semantica globale (decisione 1) si scrive in `database.md` §8 e si chiude là.
- **Nessuna disattivazione e nessuna cancellazione.** La 2.6, e comunque mai una cancellazione fisica.
- **Nessuna scrittura su `question_blocks`, `questionnaires`, `answers`, `assessments`.** In particolare: `version` resta `1` (decisione registrata, fine Epic 2).
- **Nessun vincolo su `options` per i tipi che non le usano**: quella direzione appartiene alla 2.4.
- **Nessun contatore di domande accanto al titolo della pagina**: il motivo della 2.1 non è scaduto (`page.tsx:94-99`).
- **Nessuna correzione a `use-write.ts` né ai quirk del fuoco su input disabilitato**: voci rimandate alla 5.2, valgono per tutti i moduli insieme.
- **Nessun `maxLength`**, nessuna dipendenza nuova, nessun validatore di schema esterno: tutto sta in un modulo puro da poche decine di righe.
- **Nessun test oltre quello di `question-fields.ts`**: l'azione, il modulo a schermo e `block-card` sono integrazione e presentazione, e la loro prova è Task 6 (`kb-0.md` §7).

### Test

Un file, un modulo puro, nessuna impalcatura — più i quattro controlli che la 0009 riceve gratis da `migrations.test.ts`.

Cosa entra: `validateQuestionText`, `validateHelpText`, `parseOptions`. Sono la coppia validazione + trasformazione che decide cosa finisce nelle colonne, e rompendosi non producono un errore: producono una domanda vuota in una card, un aiuto salvato come stringa vuota invece che `null`, o una scelta singola che in call non ha scelte — difetti che si scoprono al momento peggiore, cioè durante una call. `parseOptions` in particolare è l'unico parsing non banale della story (righe, invisibili, vuoti, limite) ed è esattamente la logica che `kb-0.md` §7 vuole sotto test.

Cosa **non** entra: `createQuestion`, `new-question-form.tsx`, `block-card.tsx`. L'azione sarebbe verificabile solo con un database, e un test che finge Supabase verifica il finto. Restano fuori anche i candidati storici (`parseDecisionRoles`, `normalizeTag`, …): sarebbero lavoro non chiesto.

### Project Structure Notes

```
supabase/
├── migrations/
│   └── 0009_question_checks.sql        NUOVO — con la dichiarazione D24
└── migrations.test.ts                  INVARIATO — legge la cartella da sé

src/lib/
├── question-fields.ts                  NUOVO — importa INVISIBLE con estensione .ts
├── question-fields.test.ts             NUOVO
└── answer-types.ts                     INVARIATO — si importa dall'azione e dal modulo

src/app/(app)/questionario/
├── question-actions.ts                 NUOVO — 'use server', una azione
├── new-question-form.tsx               NUOVO — 'use client'
├── block-card.tsx                      MODIFICA — monta NewQuestionForm, resta Server Component
├── actions.ts                          INVARIATO — resta a 177 righe
├── page.tsx                            INVARIATO
└── loading.tsx                         INVARIATO

src/app/globals.css                     MODIFICA solo se serve — una classe, una proprietà
docs/database.md                        MODIFICA — §3, §7, §8
docs/bmad/implementazione/deferred-work.md   MODIFICA — due voci chiuse
```

Convenzioni vincolanti (`kb-0.md` §2): `kebab-case` per file e cartelle, `PascalCase` per i componenti, `camelCase` per funzioni e variabili, `SCREAMING_SNAKE_CASE` per le costanti, nomi in inglese nel codice e in italiano a schermo. Un componente per file, nessun file sopra le 200 righe. Un file `'use server'` espone ogni export come punto d'ingresso raggiungibile dal browser: `question-actions.ts` contiene una azione e nient'altro.

### Piattaforma in uso, verificata

Da `package.json` e dal progetto, il 7 agosto 2026, identica alla 2.2: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna dipendenza va aggiornata, nessuna entra: la story non introduce niente che richieda una verifica di versione nuova.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, otto migrazioni registrate.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che il filtro sull'innesto con `!inner` filtri davvero le righe madri e che l'ordinamento per `position` con `limit(1)` risponda il massimo del questionario.** È l'unica forma PostgREST nuova della story. La 2.1 ha verificato `referencedTable` provocando gli errori (`PGRST108`, `42703`): qui la prova equivalente è leggere il massimo con la query vera e confrontarlo con `select max(position)` in SQL.
- **Che `alter table … add constraint` passi su tutte le righe esistenti.** Contate il 7 agosto: 0 violazioni su 23. Da ricontare prima di applicare.
- **Che i due vincoli rifiutino davvero** (`23514` su testo di soli spazi e su scelta singola senza opzioni), senza righe residue.
- **Che il campo opzioni compaia e scompaia col tipo** senza perdere quello che c'è scritto negli altri campi.

### Intelligence dai commit

Da `9ecf54d`, `70272c7` (Story 2.2), `b7a5b2a`, `8263220` (2.1), le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere**, e quello che non si è visto non si dichiara verificato: la seconda metà di AC3 non è verificabile oggi, e si scrive così.
- **Un test si vede fallire prima di crederci**, con la tabella delle rotture nel Dev Agent Record e il ripristino verificato da `git diff`.
- **Task di verifica diviso in due**: parte agente e sessione di Luca; la seconda resta la condizione per `done`.
- **Le domande si chiudono prima di implementare, non durante** (lezione della 2.1, applicata dalla 2.2): le quattro domande in fondo hanno un default già dentro i task, e se Luca conferma i default non cambia niente.
- **Il quirk di `apply_migration`** (registrazione senza prefisso) è già capitato alla 0008 e il rimedio è noto: `update` sul registro, dichiarato.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.3: Aggiungere una domanda scegliendo il tipo di risposta]
- Le story vicine che questa non deve anticipare (2.4 riscrive, 2.5 riordina, 2.6 disattiva): [Source: docs/bmad/pianificazione/epics.md#Epic 2: Questionario che si cambia senza un rilascio]
- FR12, FR14, NFR10 (validazione sul server), NFR16 (errori che dicono cosa fare): [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- UX-DR2 (governo del colore), UX-DR10 (pulsanti), UX-DR13 (voce), UX-DR14 (etichette vere): [Source: docs/bmad/pianificazione/epics.md#UX Design Requirements]
- La tabella `questions`, il `check` sui quattro tipi, `options` slegata: [Source: supabase/migrations/0004_questionnaire.sql:36-52] e [Source: docs/database.md#3. Tabelle]
- Le posizioni globali 1-23 e l'ambiguità lasciata aperta: [Source: docs/database.md#8. Dati iniziali]
- Il formato della dichiarazione di reversibilità e il divieto di `cascade`: [Source: docs/database.md#7. Migrazioni] e [Source: docs/00-contesto-e-decisioni.md#D24]
- La policy che risale al questionario: [Source: supabase/migrations/0007_rls.sql:80]
- Il vincolo nel database e non solo nel codice: [Source: docs/kb-0.md#5. Database]
- Niente dati personali nei log: [Source: docs/kb-0.md#3. Sicurezza]
- Cosa entra sotto test: [Source: docs/kb-0.md#7. Verifica]
- Il software registra e mostra, non decide: [Source: docs/00-contesto-e-decisioni.md#D14]
- Un valore non rilevato non si mostra come zero (né si salva come vuoto): [Source: docs/00-contesto-e-decisioni.md#D13]
- Il questionario è dati, non codice, e le domande restano modificabili: [Source: docs/00-contesto-e-decisioni.md#D19]
- Story precedente, con le sue macchine e le sue lezioni: [Source: docs/bmad/implementazione/2-2-aggiungere-e-rinominare-un-blocco.md]
- Le voci rimandate che questa story chiude o estende: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima di dev-story

**Chiuse da Luca il 7 agosto 2026: tutti e quattro i default confermati.** Nessun task cambia. Resta a dev-story scrivere l'esito della domanda 1 dove si cerca, in `database.md` §8 (Task 5), che era dovuto con qualunque esito.

Quattro, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. La prima è strutturale e, qualunque sia l'esito, va scritta in `database.md` §8.

1. **La posizione della domanda nuova è il massimo globale del questionario + 1?**
   È l'ambiguità che la 2.2 ha assegnato per nome a questa story. Il massimo del blocco + 1 produrrebbe duplicati fra blocchi; rinumerare tutto a ogni aggiunta è la 2.5 costruita in anticipo, senza transazione. Il default mette la domanda in fondo al suo blocco (che è quello che AC1 mostra) e sospende la semantica «numero d'ordine dell'intervista» fino alla 2.5, che nell'ordine dello sprint viene prima della 3.1, cioè prima che qualcuno copi le posizioni nelle risposte.
   **Default: sì, massimo globale + 1**, scritto in `database.md` §8.

2. **Il vincolo sulle opzioni entra nella 0009 insieme a quello sul testo?**
   AC2 chiede il rifiuto sul server, e `kb-0.md` §5 vuole il vincolo nel database, non solo nel codice: è la stessa strada della 0008. Una direzione sola — scelta singola senza opzioni — perché l'altra (opzioni su un tipo che non le usa) è una decisione della 2.4.
   **Default: sì, due vincoli nella stessa migrazione.** Se la risposta è no, resta la sola validazione applicativa e la voce di `deferred-work.md` si chiude a metà invece che del tutto.

3. **I limiti: testo 300, aiuto 300, opzione 80, senza `maxLength` sugli input?**
   I massimi del seed sono 119, 166 e 25: i default lasciano spazio senza diventare posti dove si scrive un paragrafo. Senza `maxLength` per lo stesso motivo della 2.2: con l'attributo il limite non si supera mai dall'interfaccia e il messaggio muore invisibile, mentre l'incolla si tronca in silenzio.
   **Default: 300 / 300 / 80, nessun `maxLength`.**

4. **Le opzioni si scrivono in una textarea, una per riga?**
   L'alternativa sono campi ripetibili con aggiungi/togli, più fedeli ma molto più codice per un campo che porta tre o quattro voci corte. La textarea più il parsing testato è il compromesso di `kb-0.md` §2 (venti righe invece di una macchina).
   **Default: textarea, una opzione per riga.**

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (`claude-fable-5`), skill `bmad-dev-story`, 7 agosto 2026.

### Debug Log References

- **Riconteggio prima della 0009**: 23 domande, 0 testi vuoti, 0 `scelta_singola` senza opzioni. L'`alter table` è passato al primo colpo.
- **`apply_migration` col prefisso nel nome**: passando `0009_question_checks` allo strumento, il registro l'ha conservato per intero — `list_migrations` risponde nove righe con `0009_question_checks` in fondo, prefisso compreso. Il quirk della 0008 (nome registrato spoglio) non si è ripresentato e nessun allineamento del registro è servito. È la prima delle due strade della voce di `deferred-work.md`, ed è quella che chiude; il passo di verifica è ora dichiarato in `database.md` §7.
- **I vincoli rifiutano davvero**: un blocco `do $$` con due `insert` di prova (testo `'   '`, e `scelta_singola` senza opzioni) su un `block_id` vero — tutti e due caduti in `exception when check_violation` (che è il 23514). Riconteggio dopo: 23 righe, 0 alla posizione di prova. Nessun residuo.
- **La forma `question_blocks!inner` col filtro sull'innesto, prova equivalente alla 2.1** (una sessione autenticata non è disponibile all'agente: l'accesso è per collegamento email, e la quota non si consuma per una prova). Tre gambe:
  1. la query esatta dell'azione, eseguita con la chiave pubblicabile, è accettata senza errore;
  2. la stessa query con una colonna inventata nel percorso del filtro (`question_blocks.questionnaire_idz`) risponde `42703: column question_blocks_1.questionnaire_idz does not exist` — l'alias `question_blocks_1` mostra che PostgREST genera il join e vi applica il filtro, quindi il parametro non è ignorato in silenzio; un innesto inventato (`question_blockz!inner`) risponde `PGRST200`;
  3. in SQL, `max(position)` e la forma `order … desc limit 1` sul join rispondono tutte e due **23** per il questionario vero.
  Quello che le tre gambe non coprono — la lettura autenticata end-to-end — lo copre la sessione di Luca: la seconda domanda aggiunta allo stesso blocco che finisce dopo la prima è esattamente quel percorso.
- **Le tre rotture del test, viste rosse e ripristinate** (ripristino verificato: 16/16 verdi):

  | Rottura | Rosso atteso e visto |
  |---|---|
  | `text.length === 0` → `< 0` (il vuoto passa) | 3 rossi: soli spazi, soli invisibili, non-stringa |
  | limite testo `>` MAX → `> MAX + 1` (301 passa) | 1 rosso: limite esatto |
  | `options.length === 0` → `< 0` (zero opzioni passa) | 1 rosso: rifiuta quando non resta nessuna |

- **Lo stacco di Task 4 serviva**: verificato su una riproduzione statica della card con `globals.css` vero — lista e paragrafi hanno margine zero, il pulsante nasceva attaccato alla riga dei metadati dell'ultima domanda, e il modulo aperto idem. Da qui `.block-add-question`, una proprietà, 20px dalla scala.

### Completion Notes List

- Task 1: la 0009 porta `questions_text_not_blank` e `questions_single_choice_has_options` (una direzione sola, quella di AC2), con la dichiarazione D24 e l'annullamento senza `cascade`. Applicata con `apply_migration` prima del codice; nove migrazioni a registro, col prefisso.
- Task 2: `question-fields.ts` — `validateQuestionText`, `validateHelpText` (vuoto → `null`, mai stringa vuota), `parseOptions` (una per riga, `\r\n` tollerato, nessuna deduplicazione). Limiti 300/300/80. Unico import: `INVISIBLE` da `validate-client-name.ts`, con estensione.
- Task 3: `createQuestion` in `question-actions.ts`, file suo. Validazioni in ordine, due letture (blocco per distinguere «sparito» da «vuoto» e per il `questionnaire_id`; massimo globale con `!inner`), insert di sei colonne, `options` a `null` per i tipi che non le usano, 23503/23514 distinti col messaggio nostro, `revalidatePath('/questionario')` e basta. Nessun `update`, niente su `questionnaires`: `version` resta 1.
- Task 4: `new-question-form.tsx` — pulsante `Aggiungi domanda` quiet, modulo `.form` con quattro campi, opzioni rese solo su `scelta_singola`, `id` col `blockId`, `useWrite`, errore unico `role="alert"`, fuoco di ritorno col meccanismo `returning`. Montato in fondo a `block-card.tsx`, che resta Server Component. `page.tsx` e `actions.ts` non toccati.
- Task 5: test visto fallire e tornare verde (tabella sopra); `database.md` §3 (i due vincoli), §7 (0009 in elenco + passo operativo su `apply_migration`/`list_migrations`), §8 (posizione = massimo globale + 1, semantica dell'ordine d'intervista sospesa fino alla 2.5); `deferred-work.md`: chiusa del tutto la voce del check mancante (revisione 2.1) e chiusa la voce del quirk di `apply_migration` (revisione 2.2).
- Task 6, parte agente: typecheck e build puliti, 111 test verdi (91 + 4 + 16), grep delle scritture tutti nei conti attesi, nessun esadecimale né colore di sezione sotto `questionario/`, file tutti sotto le 200 righe, `actions.ts` intatto a 177.
- **La seconda metà di AC3 non è verificata e non si dichiara verificata**: `assessments` e `answers` sono vuote, non esiste nessun collegamento da aggiornare, e la story la onora non scrivendo niente — come dichiarato nel testo della story.
- **Resta aperta la sessione di Luca** (Task 6, seconda parte): è la condizione per `done`.

### File List

Nuovi:
- `supabase/migrations/0009_question_checks.sql`
- `src/lib/question-fields.ts`
- `src/lib/question-fields.test.ts`
- `src/app/(app)/questionario/question-actions.ts`
- `src/app/(app)/questionario/new-question-form.tsx`

Modificati:
- `src/app/(app)/questionario/block-card.tsx` (monta `NewQuestionForm`, resta Server Component)
- `src/app/globals.css` (solo `.block-add-question`, una proprietà)
- `docs/database.md` (§3, §7, §8)
- `docs/bmad/implementazione/deferred-work.md` (due voci chiuse)
- `docs/bmad/implementazione/sprint-status.yaml` (stato della story)
- `docs/bmad/implementazione/2-3-aggiungere-una-domanda-scegliendo-il-tipo-di-risposta.md` (questo file)

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 7 agosto 2026 | 0.1 | Story creata | Claude Fable 5, skill `bmad-create-story` |
| 7 agosto 2026 | 0.2 | Le quattro domande chiuse da Luca: default confermati, nessun task cambiato | Claude Fable 5, skill `bmad-create-story` |
| 7 agosto 2026 | 0.3 | Story implementata: migrazione 0009, modulo puro con test, azione `createQuestion`, modulo a schermo nelle card. Verifica agente completa, resta la sessione di Luca | Claude Fable 5, skill `bmad-dev-story` |
| 7 agosto 2026 | 0.4 | Code review a tre livelli: audit AC senza violazioni; tre decisioni chiuse da Luca (opzioni controllate, tetto a 20, normalizzazione del whitespace) e applicate insieme a tre patch; sei rimandi annotati in `deferred-work.md`. 115 test verdi | Claude Fable 5, skill `bmad-code-review` |
| 7 agosto 2026 | 0.5 | Sessione di verifica fatta da Luca sulla pagina vera, dopo le patch: le quattordici prove spuntate. Story done | Claude Fable 5, skill `bmad-code-review` |
