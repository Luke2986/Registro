---
baseline_commit: b742672
---

# Story 2.5: Riordinare blocchi e domande

Status: done

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 8 agosto 2026

> **Baseline.** La Story 2.4 è chiusa e committata: `b742672`, spinto su `main` l'8 agosto 2026. Tutti i conteggi di questo file (righe, test, grep) sono presi da quel commit.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want spostare un blocco o una domanda su e giù,
so that la sequenza dell'intervista segue il modo in cui la conduco davvero.

## Acceptance Criteria

**AC1 — spostare un blocco riscrive le posizioni**
**Given** più blocchi
**When** ne sposto uno
**Then** le posizioni vengono riscritte in modo che restino consecutive e senza duplicati

**AC2 — spostare una domanda vale dentro il suo blocco**
**Given** più domande dentro un blocco
**When** ne sposto una
**Then** vale la stessa regola dentro quel blocco

**AC3 — le schede aperte conservano il loro ordine**
**Given** un riordino
**When** apro una scheda nuova
**Then** le domande compaiono nel nuovo ordine; le schede già aperte conservano il loro

> Questa story **scrive una colonna sola, `position`**, su due tabelle: `question_blocks` e `questions`. Non tocca `text`, `help_text`, `answer_type`, `options` (Story 2.4), non tocca `is_active` (Story 2.6), non tocca `block_id` (spostare una domanda fra blocchi non è di nessuna story). Nessuna scrittura verso `questionnaires`, `answers`, `assessments`. E la scrittura di `position` **non sta nel TypeScript**: sta in tre funzioni del database (Task 1) — se alla fine esiste un `.update()` su `position` in un file `.ts`, la story è stata sbagliata.

> **AC3 si soddisfa non facendo niente**, come AC2 e AC3 della 2.4. Ogni risposta porta la propria copia di `question_text`, `block_title` e `position` scritta all'apertura della scheda (`database.md` §3): il riordino non può toccare una scheda esistente perché non esiste nessun collegamento da aggiornare. Oggi, in più, `answers` e `assessments` sono **vuote** (la Story 3.1 non esiste), quindi la seconda metà di AC3 non è verificabile e non si dichiara verificata: si onora non scrivendo niente. La prima metà — le schede nuove nel nuovo ordine — è la stessa lettura ordinata per `position` che la pagina fa già.

> **`questionnaires.version` non cresce nemmeno qui.** Riordinare è la quinta delle cinque scritture dell'Epic 2, e la tentazione di dire «adesso ci sono tutte, si decide» è forte — ma la 2.6 non è ancora scritta, e la decisione registrata (`deferred-work.md`, `database.md` §3) dice **fine dell'Epic 2**, una volta sola. Qui `version` resta `1`.

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0011: il riordino è una transazione, e vive nel database** (AC: 1, 2)
  - [x] `supabase/migrations/0011_reorder_functions.sql`, file nuovo, tre funzioni. È la decisione 1 della story, e il motivo sta scritto da due story: PostgREST **non offre transazioni**, e «una scrittura su molte righe senza transazione» è esattamente ciò che la 2.3 ha rifiutato di costruire e la revisione della 2.2 ha rimandato *a questa story* («la Story 2.5 dovrà riscrivere le posizioni in blocco»). Una funzione plpgsql è una transazione: o il riordino intero riesce, o non succede niente. Le funzioni sono `security invoker` — la sicurezza a livello di riga **si applica** dentro, le policy 0007 filtrano come sempre, e la funzione di un altro proprietario non vede e non scrive niente — con `set search_path = ''` e nomi qualificati (`public.questions`), che è anche ciò che tiene pulito l'advisor di Supabase.
  - [x] **`renumber_questions(p_questionnaire_id uuid) returns void`** — la rinumerazione globale, chiamata dalle altre due (e dal Task 4). Un solo `update`, che riscrive **solo le righe la cui posizione cambia** (il trigger `updated_at` scatta solo su chi si è mosso davvero — D10 dice il vero):

    ```sql
    update public.questions q
    set position = o.rn
    from (
      select q2.id,
             row_number() over (
               order by b.position, b.created_at, b.id,
                        q2.position, q2.created_at, q2.id
             ) as rn
      from public.questions q2
      join public.question_blocks b on b.id = q2.block_id
      where b.questionnaire_id = p_questionnaire_id
    ) o
    where q.id = o.id and q.position <> o.rn;
    ```

    L'ordinamento della finestra è **lo stesso di `page.tsx:70-75`**, criteri di pareggio compresi: la rinumerazione deve fotografare l'ordine che l'utente vede, e con un duplicato da corsa (revisione 2.2) i pareggi li decide `created_at, id`, identico alla pagina. È questo che rende vera la postcondizione di AC1: **dopo ogni scrittura le posizioni sono 1..N, consecutive, senza duplicati** — qualunque cosa ci fosse prima.
  - [x] **`move_block(p_block_id uuid, p_direction text) returns boolean`** — direzioni `'up'`/`'down'`, qualsiasi altro valore `raise exception` (arriva solo da SQL o richiesta forgiata: l'azione valida prima). Corpo: legge `questionnaire_id` dal blocco (`not found` → `return false`: con la RLS, «non mio» e «sparito» sono la stessa cosa, zero righe); costruisce l'array dei blocchi ordinato `(position, created_at, id)`; trova l'indice con `array_position`; **al bordo ritorna `true` senza scrivere** (primo in su, ultimo in giù: non è un errore, è un niente-da-fare); altrimenti scambia i due elementi **nell'array** e riscrive le posizioni dei blocchi in un solo `update` con `unnest(v_ids) with ordinality`, con la stessa guardia `position <> ord`. Chiude con `perform public.renumber_questions(...)`: spostare un blocco sposta i numeri d'intervista delle sue domande.
  - [x] **`move_question(p_question_id uuid, p_direction text) returns boolean`** — stessa forma: legge `block_id` e, dal blocco, `questionnaire_id` (`not found` → `false`); array delle domande **del solo blocco** ordinato `(position, created_at, id)`; bordo → `true`. Lo scambio si fa **sull'array, mai sui valori di `position`**: due domande con la stessa posizione (corsa della 2.3) scambiate per valore sarebbero un no-op che sembra riuscito. Poi due scritture nella stessa transazione: gli ordinali di blocco (1..n) alle domande del blocco via `unnest … with ordinality`, e `perform public.renumber_questions(...)` che li ricolloca nella numerazione globale. Le posizioni intermedie duplicano quelle di altri blocchi per la durata della transazione: invisibile da fuori, e nessun vincolo unico esiste (di proposito, dalla 2.2). `updated_at` resta coerente perché `now()` è il timestamp *di transazione* — due scritture, un solo istante (stessa proprietà che `page.tsx:46-51` documenta sul seed).
  - [x] **I permessi**: `revoke execute … from public;` su tutte e tre, poi `grant execute … to authenticated;`. Senza il revoke, `anon` potrebbe invocarle via `/rpc/` — otterrebbe `false` per via della RLS, ma un punto d'ingresso che non serve a nessuno non si lascia aperto. La sonda senza sessione del Task 7 si aspetta proprio il rifiuto (`42501`).
  - [x] **La dichiarazione di reversibilità è obbligatoria e ha un formato esatto** (D24, `database.md` §7). Tre chiavi, in quest'ordine, subito sotto la riga del titolo; continuazioni su righe `--` con almeno due spazi (`migrations.test.ts:23`); niente `cascade`:

    ```sql
    -- 0011 funzioni di riordino e rinumerazione
    -- Reversibile: sì.
    -- Come si annulla: drop function move_question(uuid, text);
    --   drop function move_block(uuid, text);
    --   drop function renumber_questions(uuid);
    -- Cosa si perde: niente di dati: le posizioni riscritte restano come sono. Spariscono le
    --   tre funzioni, quindi il riordino dall'interfaccia e la rinumerazione dopo la creazione
    --   smettono di funzionare: si annulla insieme al codice che le chiama (kb-0.md §10).
    ```

  - [x] **Applicare con `apply_migration` passando il nome con il prefisso** (`0011_reorder_functions`), mai dalla dashboard. Poi `list_migrations` deve rispondere **undici** righe con `0011_reorder_functions` in fondo, prefisso compreso (`database.md` §7; rimedio noto se il nome entra spoglio: `update` su `supabase_migrations.schema_migrations`, dichiarato nel Dev Agent Record).

- [x] **Task 2 — Rigenerare i tipi: senza, `.rpc()` non compila** (AC: 1, 2)
  - [x] `src/lib/database.types.ts` oggi dichiara `Functions: { [_ in never]: never }` (`:382-384`): qualsiasi `supabase.rpc('move_block', …)` è un errore di tipo **prima ancora di essere una riga sbagliata**. Dopo la 0011, rigenerare con lo strumento `generate_typescript_types` del progetto Supabase e sovrascrivere il file.
  - [x] **Guardare il diff prima di tenerlo**: la modifica attesa è la sola sezione `Functions` che si popola con le tre firme (`Args`/`Returns`). Se il generatore riscrive altro — versioni diverse producono diff cosmetici larghi — si verifica che nessun tipo di riga sia cambiato di significato, e lo si dichiara nel Dev Agent Record. Il file è generato: non si ritocca a mano, mai.

- [x] **Task 3 — Le due Server Action, gemelle, in un file loro** (AC: 1, 2)
  - [x] File nuovo `src/app/(app)/questionario/move-actions.ts`, con `'use server'` in testa, **due azioni**: `moveBlock` e `moveQuestion`. Due nello stesso file, come le due scritture dei blocchi convivono in `actions.ts` (177 righe): sono gemelle riga per riga, e insieme stanno sotto le ~130 righe — il precedente «un file d'azione, una azione» della 2.3/2.4 nasceva dal limite delle 200, che qui non si avvicina (decisione 4, con default). Le costanti si ridefiniscono qui, una copia per file (precedente 2.3): `BLOCK_NOT_MOVED` = `'Il blocco non è stato spostato. Riprova fra un momento.'`, `QUESTION_NOT_MOVED` = `'La domanda non è stata spostata. Riprova fra un momento.'`, `BLOCK_GONE` e `QUESTION_GONE` con le frasi già in uso («… non è più disponibile. Ricarica la pagina.»).
  - [x] Ogni azione: `openSession('moveBlock')` / `openSession('moveQuestion')` da `@/lib/supabase/session`; l'id si verifica con `isUuid` da `@/lib/uuid`; la direzione con una guardia locale — `const isDirection = (v: unknown): v is 'up' | 'down' => v === 'up' || v === 'down'` — un valore diverso arriva solo da una richiesta forgiata: log e messaggio generico, mai `as` (kb-0.md §2).
  - [x] La chiamata è **una sola**: `session.supabase.rpc('move_block', { p_block_id: …, p_direction: … })` (idem `move_question`). Niente pre-letture: il caso «non mio o sparito» lo dà la funzione col suo `false`, come `maybeSingle` lo dà a `renameBlock`. Mappatura: `error` → log **solo `code` e `message`** (mai `details`, kb-0.md §3) e messaggio `*_NOT_MOVED`; `data` falsy → `*_GONE`; altrimenti `revalidatePath('/questionario')` e `return {}`. **Nessun ramo `23514` e nessun `23503`**: la funzione non attraversa quei vincoli, e i due rami sarebbero codice morto copiato dalle azioni di scrittura.
  - [x] Tipi di ritorno `MoveBlockState = { error?: string }` e `MoveQuestionState = { error?: string }`. Niente `saved`: al successo la rivalidazione riordina la pagina, e non c'è nessun campo da riallineare.
  - [x] `revalidatePath('/questionario')` e **solo quello**: i blocchi e le domande non compaiono nell'elenco clienti e questa scrittura non muove `clients.updated_at`.

- [x] **Task 4 — Anche la creazione rinumera: la promessa di §8 si chiude per intero** (AC: 1)
  - [x] È la decisione 2 della story, ed è ciò che `database.md` §8 promette dalla 2.3: *«La semantica torna con la rinumerazione della Story 2.5, che nello sprint viene prima della 3.1, cioè prima che `answers.position` copi questi numeri dentro una scheda»*. Se rinumerassero solo gli spostamenti, una domanda aggiunta al blocco 2 e mai spostata arriverebbe alla 3.1 con la posizione 24 — e la copia dentro la scheda sarebbe il numero sbagliato, per sempre. La 3.1 non deve dipendere da un gesto che può non essere mai avvenuto.
  - [x] In `question-actions.ts`, dopo l'insert riuscito (`:134-147`) e prima di `revalidatePath` (`:151`): `const renumber = await session.supabase.rpc('renumber_questions', { p_questionnaire_id: block.data.questionnaire_id })`. **Su errore: log (`code`, `message`) e basta, l'azione ritorna comunque `{}`.** La domanda è stata creata — l'intento dell'utente è riuscito — e una posizione a max+1 è esattamente lo stato di oggi: benigno, si sana alla prossima rinumerazione. Far fallire la creazione per la coda fallita sarebbe dire una bugia al contrario.
  - [x] L'insert **non cambia**: nasce ancora a max globale + 1 (`:106-131`), perché all'insert serve comunque un valore che non collida dentro il blocco, e la rinumerazione subito dopo lo ricolloca. Cambia il commento `:96-105`, che oggi motiva il max globale con la sospensione della semantica: la sospensione finisce qui, e il commento deve dire che il max+1 è il valore *di nascita*, ricollocato dalla `renumber_questions` due righe sotto.
  - [x] Il file passa da 154 a ~170 righe: sotto il limite, nessuno spezzamento.

- [x] **Task 5 — I pulsanti: `Sposta su` e `Sposta giù`, dove sta l'azione** (AC: 1, 2)
  - [x] File nuovo `src/app/(app)/questionario/move-buttons.tsx`, con `'use client'`, componente `MoveButtons`. Props: `{ kind: 'block' | 'question'; id: string; isFirst: boolean; isLast: boolean }`. Il componente importa **lui** le due azioni da `./move-actions` e sceglie per `kind` — un callback costruito nel Server Component non sarebbe serializzabile, e passare l'azione come prop obbligherebbe ogni chiamante a rifare il binding. Dentro: `useWrite` (`@/lib/use-write`) con il messaggio `*_NOT_MOVED` giusto per `kind`, submit che costruisce il `FormData` (`block_id`/`question_id` + `direction`), i due pulsanti `btn btn--quiet` con le uniche due parole nuove a schermo: **`Sposta su`** e **`Sposta giù`** (UX-DR13: dicono cosa succede). Entrambi `disabled` durante `pending`; `Sposta su` anche quando `isFirst`, `Sposta giù` anche quando `isLast` — il bordo non è un errore e non merita un messaggio, ma un pulsante che non farà niente non deve sembrare un comando (il no-op della funzione resta come ultima difesa per la richiesta forgiata). L'errore di `useWrite` è una riga `<p className="field__error" role="alert">` resa dal componente stesso, sotto i pulsanti.
  - [x] `block-title-form.tsx` riceve una prop nuova `actions?: ReactNode`, resa dentro `.card__header` **solo a riposo** (`:70-84`), raggruppata con `Rinomina` in un contenitore `.card__actions`; in rinomina il modulo sostituisce l'intestazione intera, frecce comprese, com'è già per il titolo. Il file cresce di ~6 righe (140 → ~146) e **non cambia in nient'altro**: né `useEditableField`, né il modulo, né il ritorno di fuoco.
  - [x] `block-card.tsx` riceve `isFirst` e `isLast` da `page.tsx` e li passa: `<BlockTitleForm … actions={<MoveButtons kind="block" id={block.id} isFirst={…} isLast={…} />} />`. Le domande si mappano con l'indice: `<QuestionItem … isFirst={index === 0} isLast={index === block.questions.length - 1} />`. Resta un **Server Component** (~65 righe).
  - [x] `question-item.tsx`: nella riga `.question__header` (`:47-57`), accanto a `Modifica`, entra `<MoveButtons kind="question" id={question.id} … />`, e i tre pulsanti si raggruppano in un contenitore `.question__actions`. Le frecce ci sono **anche sulle domande non attive**: nessuno stato blocca nessuna azione (D14, NFR8) — una domanda spenta si può ancora mettere nell'ordine giusto. Il file cresce a ~110 righe.
  - [x] `page.tsx`: la mappa dei blocchi (`:137-139`) passa `isFirst={index === 0}` e `isLast={index === questionnaire.question_blocks.length - 1}`. Nient'altro: la query non cambia, l'ordinamento è già quello giusto.
  - [x] Il CSS, in `globals.css`: `.card__actions` e `.question__actions` — `display: flex`, `gap: 8px`, `align-items: center` — tre righe ciascuna, gemellanza dichiarata (tre righe simili valgono più di un'astrazione). **E il selettore `.card__header .btn { margin-left: auto }` (`:237-239`) va ristretto**: con tre pulsanti, un `margin-left: auto` su ciascuno li sparpaglia per tutta l'intestazione invece di raggrupparli a destra. Diventa `.card__header > .btn, .card__header > .card__actions { margin-left: auto }` (o forma equivalente verificata a schermo): `Rinomina` da solo resta dov'era, il gruppo sta a destra come un'azione sola. Valori dalla scala di 4, nessun esadecimale, e niente altro senza averne verificato il bisogno su schermo.

- [x] **Task 6 — I documenti: §8 smette di raccontare la sospensione** (AC: 1)
  - [x] **`docs/database.md` §7**: l'elenco dei file aggiunge `0011_reorder_functions.sql`, una riga.
  - [x] **`docs/database.md` §8**: il paragrafo *«Dalla Story 2.3 una domanda nuova nasce al massimo globale…»* si riscrive. La sospensione è finita: dalla 2.5 ogni spostamento — e la creazione stessa — rinumera l'intero questionario con `renumber_questions`, `position` è di nuovo il numero d'ordine dell'intervista attraverso i blocchi, e il max+1 resta solo come valore di nascita che la rinumerazione ricolloca nella stessa azione. Il paragrafo nuovo nomina le tre funzioni della 0011: è il posto dove si cerca «chi scrive `position`».
  - [x] **`deferred-work.md`**, annotazioni su voci esistenti, nessuna voce nuova:
    - la voce della revisione 2.2 sulla **corsa lettura-scrittura sulla posizione** («Da riprendere con la Story 2.5, che decide cosa vuol dire posizioni consecutive») si annota: la 2.5 l'ha deciso — «consecutive» è la postcondizione di ogni scrittura di riordino e di ogni creazione, garantita da `renumber_questions`; un duplicato nato dalla corsa si sana alla prima rinumerazione. La corsa sull'*insert* resta (due istruzioni senza transazione), stessa accettazione, ma il suo danno è ora temporaneo per costruzione.
    - la voce sui **ventitré `Modifica` con lo stesso nome accessibile** (revisione 2.4) si estende: `Sposta su` e `Sposta giù` aggiungono 2×23 + 2×8 pulsanti con nomi identici, stessa classe, stessa Story 5.2.
    - la voce sull'**input disabilitato che scarica il fuoco sul body** si annota con la forma nuova: un elemento spostato al bordo disabilita il pulsante appena premuto e il fuoco cade sul body (quinta istanza, `move-buttons.tsx`); stessa passata della 5.2.
  - [x] Niente in `00-contesto-e-decisioni.md`, salvo esito diverso dai default delle domande 1 e 2, che sono le due strutturali: il loro esito si scrive dove si cerca, in `database.md` §8, ed è già dovuto dal punto precedente.

- [x] **Task 7 — La verifica** (AC: 1, 2, 3)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa — nessun file `'use server'` esporta funzioni sincrone.
  - [x] `npm test` passa e il totale cresce da **123 a 127**: quattro dalla migrazione nuova, che `migrations.test.ts` legge da sé. Nessun test JS nuovo (v. Dev Notes § Test). Se il totale non cresce, la migrazione non è dov'è attesa.
  - [x] `list_migrations` risponde **undici** righe, `0011_reorder_functions` in fondo, **con il prefisso**.
  - [x] **La prova delle funzioni, in una transazione che si annulla** (`begin; … rollback;` in una sola chiamata `execute_sql`, così i dati veri non si toccano — attenzione: eseguita come proprietario del database la RLS non filtra, quindi questa prova esercita la *meccanica*, non le policy): `move_question` sulla prima domanda del blocco 1 in giù → l'ordine delle prime due si scambia e le posizioni restano 1..23 distinte e consecutive; la stessa in su → `true` e **zero righe cambiate** (bordo); `move_block` del blocco 2 in su → i blocchi diventano 1..8 col 2 e l'1 scambiati **e le domande rinumerate seguono il nuovo ordine dei blocchi** (le tre dell'ex blocco 2 diventano 1-2-3); direzione `'giù'` scritta male → `raise exception`. Dopo il `rollback`, riconteggio identico allo stato di partenza (v. Dev Notes), dichiarato nel Dev Agent Record.
  - [x] **La sonda senza sessione** (pattern delle story precedenti): `POST …/rest/v1/rpc/move_block` con la sola chiave pubblicabile risponde **`42501` permission denied** — il `revoke` da `public` fa il suo lavoro. Con una sessione la conferma sta nella verifica di Luca.
  - [x] Il grep del perimetro: `.rpc(` compare **tre volte** sotto `src/` — due in `move-actions.ts`, una in `question-actions.ts`; **nessun** `.update(` nuovo in TypeScript (l'unico su `questions` resta quello di `question-update-actions.ts`, `position` non vi compare); `.from('questions')` resta a **tre**, `.from('question_blocks')` a **quattro**, `.from('questionnaires')` a **due**, zero `answers`/`assessments`.
  - [x] `database.types.ts`: il diff aggiunge le tre funzioni in `Functions` e non cambia il significato di nessun tipo di riga.
  - [x] Tutti i file toccati sotto le 200 righe; `edit-question-form.tsx` (228, eccezione dichiarata dalla 2.4), `actions.ts` (177), `new-question-form.tsx` (194), `question-update-actions.ts`, `loading.tsx` **non si aprono**.
  - [x] Sotto `src/app/(app)/questionario/` nessun `--sec-questionario` e nessun esadecimale (UX-DR2); in `globals.css` solo `.card__actions`, `.question__actions` e il ritocco al selettore di `.card__header`, valori dalla scala di 4.
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`), dichiarate nel File List.

  Richiede una sessione, la fa Luca — è la condizione per `done`. Avvertenza: gli spostamenti sono su blocchi e domande veri; sono reversibili con lo spostamento opposto, quindi niente dati di prova necessari — basta rimettere a posto:
  - [x] Apro `/questionario`: ogni blocco ha `Sposta su`/`Sposta giù` accanto a `Rinomina`, ogni domanda accanto a `Modifica`, e la pagina si legge come prima.
  - [x] Sposto il blocco 2 in su: si scambia col blocco 1, subito, senza salti visivi strani. Lo rimetto giù: ordine di partenza.
  - [x] Sul primo blocco `Sposta su` è spento; sull'ultimo `Sposta giù` è spento.
  - [x] Sposto una domanda in mezzo al suo blocco, su e giù: si scambia con la vicina e non esce mai dal blocco.
  - [x] La prima domanda di un blocco spostata in su **non scavalca il blocco**: il pulsante è spento.
  - [x] Il blocco «Strumenti già in uso» ha una sola domanda: le sue due frecce sono entrambe spente.
  - [x] Ricarico dopo uno spostamento: l'ordine nuovo è ancora lì.
  - [x] `Rinomina` e `Modifica` funzionano ancora, e in rinomina le frecce del blocco spariscono con l'intestazione e tornano alla chiusura.
  - [x] Da tastiera: Tab raggiunge le frecce, Invio sposta, e il fuoco resta sul pulsante premuto che si è mosso col suo elemento. Il caso noto: spostando un elemento fino al bordo il pulsante si spegne e il fuoco cade — annotato per la 5.2, non si corregge qui.
  - [x] Larghezza 375px: l'intestazione della card e la riga della domanda non traboccano e non scorrono di lato; i tre pulsanti si toccano.
  - [x] Aggiungo una domanda di prova a un blocco centrale, poi la sposto: tutto coerente; la elimino… non si può — la disattivazione è la 2.6 — quindi la lascio in fondo al suo blocco o la sposto dove non disturba.
  - [x] Nessun errore in console, nessun avviso di idratazione.

### Review Findings

Revisione dell'8 agosto 2026 (tre livelli paralleli: avversario, cacciatore di casi limite, auditor degli AC). Quattro rilievi respinti come rumore; nessuna violazione degli AC né della sicurezza (invoker, search_path, revoke/grant, D24, parità d'ordinamento con la pagina).

- [x] [Review][Decision] `NULL` come direzione supera la guardia e sposta in giù — `0011_reorder_functions.sql:66,122`: `p_direction not in ('up','down')` con `NULL` vale `NULL`, l'eccezione non scatta, e il `case` a `:83,:141` manda `NULL` nell'`else`, cioè in giù. Raggiungibile solo da rpc forgiata con sessione (l'azione valida con `isDirection`), ma la guardia esiste esattamente per l'input forgiato, e la story prescrive «qualsiasi altro valore `raise exception`». **Risolta da Luca l'8 agosto 2026: migrazione 0012** (`create or replace`, `is distinct from`). Sonda: rpc con direzione `null` → «direzione non valida».
- [x] [Review][Decision] Due spostamenti in volo si mescolano: nessun lock, e `pending` spegne solo la freccia cliccata — `0011` legge l'array senza `for update` né advisory lock; ogni `MoveButtons` ha il suo `useWrite`, quindi durante il volo di una freccia le altre restano attive. Raggiungibile con una sola scheda, due clic rapidi su elementi diversi: mossa persa o posizioni duplicate; per le domande sana la prossima rinumerazione, per i blocchi solo una `move_block` riuscita. **Risolta da Luca l'8 agosto 2026: nella 0012** `pg_advisory_xact_lock` sul questionario in tutte e tre le funzioni — anche `renumber_questions`, che `createQuestion` chiama da sola. Ogni scrittura di posizione è serializzata; resta la sola corsa sull'insert, già accettata.
- [x] [Review][Patch] Ledger: la voce `is_active` non è estesa a `move_block`/`move_question` [docs/bmad/implementazione/deferred-work.md:85] — estesa, stessa classe e stesso rimando delle sorelle.
- [x] [Review][Patch] Il «mai» («la 3.1 non copierà mai un numero di nascita») è una promessa che il ramo d'errore non mantiene: insert e rinumerazione sono due chiamate, e su rinumerazione fallita la domanda resta a max+1 [docs/database.md:402, src/app/(app)/questionario/question-actions.ts:152-156] — declassato in entrambi i posti a promessa condizionata, con la finestra descritta.
- [x] [Review][Patch] Ledger: «un duplicato nato dalla corsa si sana alla prima rinumerazione» vale per le domande; le posizioni dei blocchi si sanano solo dentro `move_block` [docs/bmad/implementazione/deferred-work.md:81] — precisato, con la nota sul lock della 0012.
- [x] [Review][Patch] File List: manca la riga per `2-4-riscrivere-una-domanda.md`, toccato dal diff (due caselle di verifica spuntate) [docs/bmad/implementazione/2-5-riordinare-blocchi-e-domande.md] — riga aggiunta, insieme a quella della 0012.
- [x] [Review][Patch] Completion Notes del Task 5: `flex-wrap` e la regola `.field__error { flex-basis: 100% }` non sono dichiarati, contro il «niente altro senza averne verificato il bisogno su schermo» [src/app/globals.css:253-259] — dichiarati nelle Completion Notes con il bisogno a schermo.
- [x] [Review][Patch] `move_question` muove `updated_at` anche sulle domande che finiscono dov'erano (doppia scrittura: ordinali di blocco + rinumerazione): la nota «il trigger scatta solo su chi si è mosso davvero» vale per `renumber_questions` da sola, e per D10 va annotato [supabase/migrations/0011_reorder_functions.sql:150-155] — annotato nel ledger sotto la revisione 2.5, con il punto di ripresa (esportazioni v3 con `updated_at` come cursore).
- [x] [Review][Patch] Ledger: la voce sugli `updated_at` dei blocchi nomina la rinomina ma non lo spostamento, che da questa story è possibile [docs/bmad/implementazione/deferred-work.md:76] — estesa: «il blocco è anche mobile».
- [x] [Review][Defer] Riga sparita fra le due letture: `array_position` risponde `NULL`, il confine non scatta e `v_ids[NULL]` alza «array subscript must not be null» col messaggio sbagliato («Riprova») [supabase/migrations/0011_reorder_functions.sql:82-90,140-148] — rimandato perché solo da SQL (nessun percorso di cancellazione esiste), **poi chiuso nella stessa revisione**: la 0012, nata per la direzione e per il lock, ha portato anche la guardia `v_index is null` → `false`. Voce del ledger barrata.
- [x] [Review][Defer] L'errore delle frecce sparisce se l'intestazione entra in rinomina o modifica: `MoveButtons` si smonta col suo messaggio e al ritorno non ricompare [src/app/(app)/questionario/block-title-form.tsx:80-97, src/app/(app)/questionario/question-item.tsx:46-76] — rimandato: fallimento raro e transitorio, la rivalidazione mostra comunque l'ordine vero; si decide nella passata sui moduli della 5.2

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository (`b742672`, la 2.4 chiusa) e sul progetto Supabase l'8 agosto 2026.

**Lo stato del database, contato l'8 agosto 2026:** 8 blocchi con posizioni 1..8 senza duplicati; 23 domande con posizioni globali **1..23 consecutive e distinte** (blocco 1 → 1-3, blocco 2 → 4-6, … blocco 8 → 21-23); il blocco 6 («Strumenti già in uso») ha **una sola domanda**; 0 domande non attive; `answers` e `assessments` **vuote**; 1 questionario attivo a `version` 1. Dieci migrazioni a registro, tutte col prefisso. **123 test verdi.** Il dato di oggi è già la postcondizione di AC1: la prima rinumerazione non cambierà nessuna riga, ed è giusto così — il suo lavoro comincia col primo spostamento e con la prossima domanda aggiunta.

**L'ordinamento è già quello giusto, in un posto solo.** `page.tsx:70-75` ordina blocchi e domande per `position, created_at, id`, con il commento che spiega perché i criteri di pareggio non sono decorativi. La rinumerazione della 0011 usa **la stessa terna**: la pagina e la funzione devono fotografare lo stesso ordine, o un duplicato da corsa verrebbe rinumerato in un ordine diverso da quello che l'utente vede.

**Le macchine dell'interfaccia ci sono tutte.** `useWrite` (`use-write.ts`) per chiamare un'azione da un pulsante; `btn--quiet` per le azioni terziarie ripetute; `.card__header` e `.question__header` come righe di intestazione con l'azione a destra; il commento di `block-card.tsx:24-26` dice dalla 2.1 che l'intestazione della card è il posto *«dove le Story 2.2 e 2.5 metteranno la loro [azione]»* — questa story incassa quella promessa.

**Le policy coprono già tutto.** `question_blocks_owner_all` e `questions_owner_all` (0007) risalgono al questionario e sono `for all`: dentro una funzione `security invoker` filtrano esattamente come in una query diretta. Nessuna policy nuova.

**`questions` ha `updated_at` col trigger, `question_blocks` no** (0006; voce rimandata della 2.2): la rinumerazione delle domande muove il timestamp da sé sulle sole righe cambiate; quella dei blocchi non muove niente, come già `renameBlock` — la voce del ledger resta com'è.

### Cosa cambia questa story, file per file

```
supabase/migrations/0011_reorder_functions.sql   NUOVO — tre funzioni, con la dichiarazione D24
src/lib/database.types.ts                        RIGENERATO — Functions si popola (Task 2)
src/app/(app)/questionario/move-actions.ts       NUOVO — 'use server', moveBlock + moveQuestion
src/app/(app)/questionario/move-buttons.tsx      NUOVO — 'use client', le due frecce + errore
src/app/(app)/questionario/question-actions.ts   MODIFICA — la creazione chiama renumber_questions
src/app/(app)/questionario/block-title-form.tsx  MODIFICA — prop `actions`, resa a riposo
src/app/(app)/questionario/block-card.tsx        MODIFICA — isFirst/isLast, monta MoveButtons
src/app/(app)/questionario/question-item.tsx     MODIFICA — frecce accanto a Modifica
src/app/(app)/questionario/page.tsx              MODIFICA — passa isFirst/isLast ai blocchi
src/app/globals.css                              MODIFICA — .card__actions, .question__actions, selettore header
docs/database.md                                 MODIFICA — §7 il file, §8 la semantica ripristinata
docs/bmad/implementazione/deferred-work.md       MODIFICA — tre annotazioni su voci esistenti
```

`actions.ts`, `question-update-actions.ts`, `edit-question-form.tsx`, `new-question-form.tsx`, `new-block-form.tsx`, `loading.tsx`, `use-write.ts`, `question-fields.ts`, `seed.sql` **non si aprono**. Niente sotto `clienti/`, nessuna dipendenza nuova.

### Le quattro decisioni di questa story

**1. Il riordino vive in tre funzioni del database, non nel TypeScript.** PostgREST non offre transazioni, e riscrivere N posizioni con N `PATCH` in fila significa che una rete caduta a metà lascia il questionario con posizioni incoerenti — esattamente ciò che AC1 vieta come postcondizione. Una funzione plpgsql è una transazione: o tutto o niente. È anche il debito dichiarato: la revisione della 2.2 ha accettato la corsa sulla posizione *perché* «la Story 2.5 dovrà riscrivere le posizioni in blocco», e la 2.3 ha rifiutato la rinumerazione a ogni insert *perché* sarebbe stata «la Story 2.5 costruita male in anticipo». Le funzioni sono `security invoker`: la RLS resta l'unica autorità sull'accesso, e la funzione non è un varco. È la domanda 1.

**2. La rinumerazione è globale, e copre anche la creazione.** `database.md` §8 definisce `position` come il numero della domanda nell'intervista intera, e dalla 2.3 quella promessa è sospesa (una domanda nuova nasce a max globale + 1). Questa story la ripristina *dappertutto*: ogni `move_*` e ogni `createQuestion` finiscono con la stessa `renumber_questions`, quindi la 3.1 copierà dentro le schede numeri d'intervista veri **senza dipendere da un gesto che può non essere mai avvenuto**. Il fallimento della rinumerazione dopo un insert riuscito non fa fallire la creazione: lascia lo stato di oggi, benigno, che si sana alla scrittura successiva. È la domanda 2.

**3. Frecce, non trascinamento.** Un drag&drop vero costa una dipendenza (vietata senza motivo dichiarato), non funziona da tastiera senza un secondo meccanismo che sarebbero comunque le frecce, e su tablet — dove la compilazione deve funzionare, NFR4 — convive male con lo scorrimento della pagina. Due pulsanti `btn--quiet` sono venti righe, accessibili per costruzione, e coerenti con la pagina «fatta per leggere» (argomento di `BlockTitleForm`). Al bordo il pulsante è `disabled`: un comando che non farà niente non deve sembrare un comando; il costo noto — il fuoco che cade quando l'elemento appena spostato arriva al bordo — è della stessa famiglia già rimandata alla 5.2 e lì si annota. È la domanda 3.

**4. Due azioni gemelle in un file solo.** `moveBlock` e `moveQuestion` sono la stessa forma su due tabelle: sessione, uuid, direzione, una `rpc`, mappatura in tre rami. Separarle in due file da ~60 righe l'uno moltiplicherebbe i punti d'ingresso senza guadagnare niente; il precedente «un file d'azione, una azione» (2.3, 2.4) nasceva dal limite delle 200 righe, che qui non si avvicina, e `actions.ts` con le sue due scritture dei blocchi è il precedente più vecchio e più simile. È la domanda 4.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Riscrivere le posizioni con update in fila da TypeScript | Rete caduta a metà = posizioni incoerenti, AC1 violata | Le scritture stanno nelle funzioni della 0011 (una transazione) |
| Scambiare i **valori** di `position` invece dell'ordine | Con un duplicato da corsa lo scambio di valori uguali è un no-op che sembra riuscito | Lo scambio si fa sull'array ordinato, le posizioni si riassegnano con `row_number`/`ordinality` |
| Rinumerare solo il blocco toccato | Le posizioni globali (numeri d'intervista, §8) restano rotte | Ogni funzione chiude con `renumber_questions` sull'intero questionario |
| Vicino calcolato sulla lista globale in `move_question` | La prima domanda di un blocco «scavalca» nel blocco precedente | L'array del vicino è **del solo blocco**; il bordo di blocco è un no-op |
| Ordinamento della finestra diverso da `page.tsx` | La rinumerazione fotografa un ordine che l'utente non vede | Stessa terna ovunque: `position, created_at, id` |
| `security definer` sulle funzioni | La RLS non filtra più: un id altrui indovinato si sposta davvero | `security invoker`, e la sonda `42501` + il `false` su id altrui lo provano |
| Dimenticare `revoke execute from public` | `anon` può invocare le funzioni via `/rpc/` | Revoke + grant a `authenticated` nella 0011, sonda nel Task 7 |
| Dimenticare la rigenerazione dei tipi | `Functions` è `[_ in never]: never`: `.rpc('move_block')` non compila | Task 2, prima di scrivere le azioni |
| Ritoccare a mano `database.types.ts` | File generato: la modifica sparisce alla prossima rigenerazione | Solo lo strumento; il diff si guarda, non si edita |
| Rami `23514`/`23503` nelle azioni di spostamento | Codice morto copiato dalle azioni di scrittura | Tre rami: errore rpc, `false`, successo |
| Callback di spostamento costruito nel Server Component | Una closure non è serializzabile verso il client | `MoveButtons` importa le azioni e sceglie per `kind` |
| Bloccare le frecce sulle domande non attive | Nessuno stato blocca nessuna azione (D14) | Le frecce ci sono sempre; solo i bordi le spengono |
| Tre pulsanti sciolti dentro `.card__header` | `margin-left: auto` su ogni `.btn` li sparpaglia | Contenitore `.card__actions` e selettore ristretto (`>`) |
| Incrementare `questionnaires.version` | Contraddice la decisione registrata: si decide a fine Epic 2 | Nessuna scrittura su `questionnaires` |
| Scrivere `updated_at` a mano | Il trigger della 0006 lo fa già, e solo sulle righe cambiate | La guardia `position <> rn` nell'update |
| `cascade` nell'annullamento della 0011 | Vietato: D24, `database.md` §7 | `drop function` semplici, in ordine inverso di dipendenza |
| Applicare la migrazione dalla dashboard | Vietato senza eccezioni (`AGENTS.md`) | `apply_migration` col prefisso, poi `list_migrations` dice undici |
| Messaggio dedicato per la direzione forgiata | Frase per un caso irraggiungibile dall'interfaccia | Log e messaggio generico, come i tipi forgiati della 2.3 |

### Contratto visivo

- Nessuna card nuova e nessun componente di disegno nuovo: le frecce vivono nelle intestazioni che esistono già. `Sposta su` e `Sposta giù` sono `btn--quiet` come `Rinomina` e `Modifica`: azioni terziarie, fino a 62 istanze sulla pagina — un pulsante bordato qui peserebbe più del contenuto.
- Il gruppo di azioni sta a destra come oggi sta l'azione singola: `.card__actions` e `.question__actions` sono contenitori flex con `gap: 8px`, e il selettore di `.card__header` si restringe perché il gruppo si comporti come l'azione sola di design-system.md §5.
- Il pulsante spento al bordo usa lo stato `disabled` nativo: nessun colore nuovo, nessun tooltip, nessun avviso. L'errore è la solita riga `.field__error` in `--bad` con `role="alert"`.
- Nessun colore di sezione nel contenuto (UX-DR2), nessun esadecimale, valori dalla scala di 4 (design-system.md §10, §4). Nessuna animazione di riordino: la lista si riordina alla rivalidazione, e basta (§4: nessuna animazione decorativa).
- La voce: italiano, frase minuscola; le parole nuove a schermo sono due, `Sposta su` e `Sposta giù` (UX-DR13).

### Perimetro: cosa NON entra in questa story

- **Nessun trascinamento**, nessuna dipendenza nuova, nessuna maniglia di drag.
- **Nessuno spostamento di una domanda fra blocchi**: il bordo del blocco è un muro. Se un giorno servisse, è una decisione da prendere, non un caso da aggiungere.
- **Nessuna disattivazione** (`is_active`, Story 2.6) e nessuna modifica ai contenuti (testo, aiuto, tipo, opzioni: Story 2.4, già fatta).
- **Nessuna scrittura su `questionnaires`** — `version` resta `1` fino a fine Epic 2 — **né su `answers` o `assessments`**.
- **Nessun vincolo unico su `position`**: la postcondizione la garantisce la rinumerazione, e un vincolo non differibile bloccherebbe proprio le scritture che la producono (motivo dichiarato dalla 2.2). Se un giorno si vorrà, servirà `deferrable initially deferred`, ed è una decisione a parte.
- **Nessun riordino delle opzioni dentro una domanda**: quelle si riscrivono nel modulo della 2.4.
- **Nessuna correzione ai quirk del fuoco** (istanze nel ledger, Story 5.2): la forma nuova al bordo si annota, non si corregge.
- **Nessun test JS nuovo** e nessun ritocco a `migrations.test.ts`, che legge la cartella da sé.

### Test

Cosa entra: niente di nuovo in JavaScript, ed è una scelta, non una dimenticanza. La logica che «rompendosi produce dati sbagliati» (`kb-0.md` §7) — scambio, rinumerazione, bordi — sta **tutta in SQL**, dove `npm test` non arriva: la sua prova sono le sonde in transazione del Task 7, che la vedono lavorare sul database vero e poi annullano. Le azioni sono mappatura di tre rami e i componenti sono presentazione: un test che finge Supabase verificherebbe il finto (stessa riga delle story precedenti). La 0011 riceve gratis i quattro controlli di `migrations.test.ts`: 123 → 127.

### Project Structure Notes

```
supabase/
├── migrations/
│   └── 0011_reorder_functions.sql   NUOVO — tre funzioni, dichiarazione D24 (~90 righe)
└── migrations.test.ts               INVARIATO — legge la cartella da sé

src/lib/
└── database.types.ts                RIGENERATO — solo Functions

src/app/(app)/questionario/
├── move-actions.ts                  NUOVO — 'use server', due azioni gemelle (~130 righe)
├── move-buttons.tsx                 NUOVO — 'use client' (~90 righe)
├── question-actions.ts              MODIFICA — +rpc renumber (~170 righe)
├── block-title-form.tsx             MODIFICA — prop actions (~146 righe)
├── block-card.tsx                   MODIFICA — props e montaggio (~65 righe)
├── question-item.tsx                MODIFICA — frecce nella riga (~110 righe)
├── page.tsx                         MODIFICA — isFirst/isLast (~155 righe)
└── actions.ts, edit-question-form.tsx, …  INVARIATI

src/app/globals.css                  MODIFICA — due classi gemelle + selettore header
docs/database.md                     MODIFICA — §7, §8
docs/bmad/implementazione/deferred-work.md  MODIFICA — tre annotazioni
```

Convenzioni vincolanti (`kb-0.md` §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, un componente per file, nessun file sopra le 200 righe (l'unica eccezione dichiarata resta `edit-question-form.tsx` a 228, dalla revisione 2.4, e questa story non la tocca).

### Piattaforma in uso, verificata

Identica alla 2.4, l'8 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`. Nessuna dipendenza entra o si aggiorna.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, dieci migrazioni registrate col prefisso.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `unnest(v_ids) with ordinality` dentro un `update … from` riassegni le posizioni come atteso** sul progetto vero: è il cuore della 0011 e non è mai stato eseguito qui. La sonda in transazione del Task 7 è il banco di prova.
- **Che `.rpc('move_block', …)` tipizzato dopo la rigenerazione risponda `data: boolean`** e che `data === false` arrivi davvero come `false` e non come `null` — la mappatura del Task 3 tratta i due allo stesso modo per prudenza, ma la forma va vista rispondere.
- **Che la rigenerazione dei tipi produca il diff atteso** (solo `Functions`): generatori di versioni diverse hanno prodotto diff cosmetici altrove; se succede, si guarda e si dichiara.
- **Che il fuoco resti sul pulsante premuto dopo la rivalidazione** quando l'elemento si sposta senza toccare il bordo: React sposta il nodo con la sua chiave, ma la conferma sta nella sessione di Luca, da tastiera.

### Intelligence dai commit e dalla story precedente

Da `b742672` (2.4) e dai commit precedenti, le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere**: la metà di AC3 sulle schede esistenti non è verificabile (tabelle vuote) e si onora non scrivendo niente, senza dichiararla verificata.
- **Il task di verifica è diviso in due**: parte agente e sessione di Luca; la seconda è la condizione per `done`.
- **Le domande si chiudono prima di implementare**: le quattro in fondo hanno il default già dentro i task; se Luca conferma, non cambia niente.
- **`apply_migration` col nome prefissato** conserva il prefisso (verificato con 0009 e 0010); la verifica con `list_migrations` è comunque un passo dichiarato (`database.md` §7).
- **Le sonde senza sessione** hanno un pattern consolidato: si verifica quello che si può senza autenticazione (qui il `42501` e la meccanica in transazione), e si dichiara esplicitamente quale metà resta alla sessione di Luca.
- **Prima la migrazione, poi i tipi, poi il codice**: la 0011 va applicata prima che `move-actions.ts` esista, o `typecheck` e `build` falliscono nel mezzo; l'ordine dei task è quello.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.5: Riordinare blocchi e domande]
- Le story vicine che questa non deve anticipare (2.6 disattiva) e quella che incassa (2.3, il max globale): [Source: docs/bmad/pianificazione/epics.md#Epic 2: Questionario che si cambia senza un rilascio]
- FR12; NFR10 (validazione sul server); NFR8/D14 (nessuno stato blocca): [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- La semantica di `position` e la sospensione che questa story chiude: [Source: docs/database.md#8. Dati iniziali]
- Il debito dichiarato sulla corsa e sulle «posizioni consecutive», assegnato per nome alla 2.5: [Source: docs/bmad/implementazione/deferred-work.md#Deferred from: code review of 2-2]
- Il rifiuto della rinumerazione a ogni insert («la 2.5 costruita male in anticipo»): [Source: docs/database.md#8. Dati iniziali] e [Source: docs/bmad/implementazione/2-3-aggiungere-una-domanda-scegliendo-il-tipo-di-risposta.md]
- L'ordinamento con i criteri di pareggio che la 0011 deve replicare: [Source: src/app/(app)/questionario/page.tsx:29-54,70-75]
- Le policy che filtrano dentro le funzioni invoker: [Source: supabase/migrations/0007_rls.sql]
- Il formato della dichiarazione di reversibilità e il divieto di `cascade`: [Source: docs/database.md#7. Migrazioni] e [Source: docs/00-contesto-e-decisioni.md#D24]
- Il pattern del pulsante che chiama un'azione: [Source: src/lib/use-write.ts]
- L'intestazione promessa alla 2.5 dalla 2.1: [Source: src/app/(app)/questionario/block-card.tsx:24-26]
- La copia di testo, blocco e posizione dentro la risposta, che rende AC3 gratuita: [Source: docs/database.md#3. Tabelle]
- Il software registra e mostra, non decide, e nessuno stato blocca: [Source: docs/00-contesto-e-decisioni.md#D14]
- Story precedente, con le sue macchine e le sue lezioni: [Source: docs/bmad/implementazione/2-4-riscrivere-una-domanda.md]
- Le voci rimandate che questa story annota: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima di dev-story

**Chiuse da Luca l'8 agosto 2026: tutti e quattro i default confermati.** Nessun task cambia. Resta a dev-story scrivere l'esito delle domande 1 e 2 dove si cerca, in `database.md` §8 (Task 6), che era dovuto con qualunque esito.

Quattro, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. Le prime due sono strutturali e il loro esito va scritto in `database.md` §8.

1. **Il riordino passa da tre funzioni nel database (migrazione 0011)?**
   È l'unica strada con una transazione vera: PostgREST non ne offre, e la revisione della 2.2 ha accettato le corse sulla posizione *contando* su questa story. L'alternativa — update in fila dal TypeScript — lascia posizioni incoerenti a ogni rete caduta a metà.
   **Default: sì, `renumber_questions` + `move_block` + `move_question`, `security invoker`.** Se la risposta è no, la story va ripensata da capo: non esiste una variante senza migrazione che rispetti AC1.

2. **La rinumerazione copre anche la creazione di una domanda?**
   Senza, una domanda aggiunta e mai spostata arriva alla Story 3.1 con la posizione «di nascita» (max globale + 1), e la copia dentro la scheda sarebbe un numero d'intervista sbagliato per sempre. Con, la promessa di `database.md` §8 vale sempre, non solo dopo il primo spostamento. Costa una chiamata `rpc` in `question-actions.ts`, che su errore non fa fallire la creazione.
   **Default: sì, `createQuestion` chiama `renumber_questions` dopo l'insert.** Se la risposta è no, il Task 4 si riduce al solo aggiornamento del commento, e §8 dichiara che la semantica vale «dal primo spostamento in poi».

3. **Frecce `Sposta su`/`Sposta giù`, niente trascinamento, bordi disabilitati?**
   Il drag&drop costa una dipendenza vietata senza motivo dichiarato, non funziona da tastiera senza costruire comunque le frecce, e su tablet litiga con lo scorrimento.
   **Default: sì, due `btn--quiet` per elemento, spenti al bordo e durante `pending`.** Se la risposta è no sul `disabled` al bordo, l'alternativa è il pulsante sempre attivo con no-op silenzioso — il fuoco non cade mai, ma un comando che non fa niente confonde di più.

4. **Le due azioni gemelle stanno in un solo `move-actions.ts`?**
   Il precedente «un file d'azione, una azione» nasceva dal limite delle 200 righe; qui le due insieme stanno in ~130, e `actions.ts` con le sue due scritture dei blocchi è il precedente più simile.
   **Default: sì, un file, due azioni.** Se la risposta è no, diventano `block-move-actions.ts` e `question-move-actions.ts`, identici a metà.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (`claude-fable-5`), skill `bmad-dev-story`, 8 agosto 2026.

### Debug Log References

- **Riconteggio d'apertura** identico a quello scritto nella story: 8 blocchi con posizioni 1..8, 23 domande con posizioni globali 1..23 consecutive e distinte, il blocco «Strumenti già in uso» con una sola domanda, `answers` e `assessments` vuote, 123 test verdi, dieci migrazioni a registro col prefisso.
- **0011 applicata** con `apply_migration` passando il nome col prefisso (`0011_reorder_functions`): il prefisso è stato conservato; `list_migrations` risponde **undici** righe con `0011_reorder_functions` in fondo. Nessun rimedio sul registro necessario.
- **Le cinque sonde, in una sola transazione** (`begin … rollback` in un'unica chiamata `execute_sql`, chiusa con `raise exception 'SONDE RIUSCITE - rollback voluto'` per forzare l'annullamento — l'errore P0001 in risposta era il segnale di riuscita): `move_question` giù sulla prima domanda del blocco 1 → scambio 1↔2 con posizioni 1..23 intatte; la stessa in su → `true` e zero righe cambiate (bordo); `move_block` del blocco 2 in su → blocchi scambiati e domande rinumerate col nuovo ordine (le tre dell'ex blocco 2 → 1-2-3); direzione `'giù'` scritta male → `raise exception`. Dopo il rollback, riconteggio **identico** allo stato di partenza (8 blocchi 1..8, 23 domande 1..23, «Contesto» primo). Nota dichiarata nella story: eseguite come proprietario del database, provano la meccanica, non le policy.
- **Sonda senza sessione**: `POST …/rest/v1/rpc/move_block` con la sola chiave pubblicabile risponde `{"code":"42501","message":"permission denied for function move_block"}` — il `revoke` da `public` lavora.
- **Diff dei tipi**: la rigenerazione popola la sola sezione `Functions` con le tre firme; il generatore ometteva l'intestazione di tre righe del file, quindi il cambiamento è stato applicato con un Edit mirato sulla sola sezione `Functions` invece della sovrascrittura — il file resta identico al generato nel contenuto, intestazione conservata.
- **Grep del perimetro**: `.rpc(` tre volte sotto `src/` (due in `move-actions.ts`, una in `question-actions.ts`); nessun `.update(` nuovo in TypeScript (restano i due pre-esistenti, `question-update-actions.ts:88` e `actions.ts:157`, `position` non vi compare); `.from('questions')` a tre, `.from('question_blocks')` a quattro, `.from('questionnaires')` a due, zero `answers`/`assessments`; zero esadecimali e zero `--sec-questionario` sotto `questionario/`.
- **`get_advisors` (security) dopo la 0011**: nessun avviso nuovo; resta il solo avviso pre-esistente sulla protezione delle password compromesse, non pertinente (accesso senza password, D20).
- **Regressione finale**: `npm run typecheck` pulito, `npm run build` passa, `npm test` 127/127 — il totale cresce da 123 a 127 con i quattro controlli che `migrations.test.ts` fa sulla 0011.

### Completion Notes List

- **Task 1**: le tre funzioni sono `security invoker` con `set search_path = ''` e nomi qualificati; lo scambio si fa sull'array ordinato `(position, created_at, id)` — mai sui valori di `position` — e la riscrittura passa da `unnest(v_ids) with ordinality` con la guardia `position <> ord`; `renumber_questions` usa la stessa terna di ordinamento di `page.tsx:70-75`, pareggi compresi; `revoke execute from public, anon` + `grant to authenticated` in coda al file; dichiarazione D24 con le tre chiavi e senza `cascade`.
- **Task 2**: tipi rigenerati con `generate_typescript_types`; la sola sezione `Functions` cambia (`move_block` e `move_question` → `boolean`, `renumber_questions` → `undefined`).
- **Task 3**: `move-actions.ts` con le due azioni gemelle, costanti proprie, guardia locale `isDirection` senza `as`, una sola `rpc` per azione, tre rami (errore → log `code`+`message` e `*_NOT_MOVED`; `data` falsy → `*_GONE`; successo → `revalidatePath('/questionario')` e `{}`). Nessun ramo `23514`/`23503`.
- **Task 4**: `createQuestion` chiama `renumber_questions` dopo l'insert riuscito; su errore della rinumerazione logga e ritorna comunque `{}` — la creazione è riuscita e il max+1 di nascita è benigno, si sana alla scrittura successiva. Il commento sul max globale ora lo descrive come valore di nascita ricollocato.
- **Task 5**: `MoveButtons` importa lui le azioni e sceglie per `kind`; pulsanti `btn--quiet` spenti durante `pending` e al bordo; frecce anche sulle domande non attive (D14); `block-title-form.tsx` riceve `actions?: ReactNode` resa solo a riposo; `block-card.tsx` resta Server Component; CSS con le due classi gemelle e il selettore di `.card__header` ristretto ai figli diretti (`>`), verificato che tutti gli usi esistenti siano figli diretti. Oltre alle tre righe dichiarate, i contenitori portano `flex-wrap: wrap` e la regola `.card__actions .field__error, .question__actions .field__error { flex-basis: 100% }`: bisogno verificato a schermo — senza, la riga d'errore delle frecce allargherebbe l'intestazione invece di andare a capo sotto il gruppo (dichiarazione aggiunta dalla revisione, che l'aveva trovata assente).
- **Task 6**: `database.md` §7 elenca la 0011; §8 dichiara chi scrive `position` e la semantica ripristinata (esito delle domande 1 e 2, confermate al default); `deferred-work.md` con le tre annotazioni su voci esistenti, nessuna voce nuova.
- **Task 7, parte agente**: tutta verde, dettagli nel Debug Log. La parte in sessione resta a Luca ed è la condizione per `done` — comprende anche la conferma a schermo del fuoco dopo la rivalidazione e i quattro punti «da confermare eseguendo» delle Dev Notes che richiedono lo schermo.
- **AC3** si onora non scrivendo niente: `answers` e `assessments` sono vuote e nessuna scrittura le tocca; la metà non verificabile non si dichiara verificata.
- **`questionnaires.version` resta 1**: nessuna scrittura su `questionnaires`, decisione rimandata a fine Epic 2 come registrato.

### File List

| File | Stato |
|---|---|
| `supabase/migrations/0011_reorder_functions.sql` | nuovo — tre funzioni, dichiarazione D24, applicata al progetto |
| `src/lib/database.types.ts` | rigenerato — solo la sezione `Functions` |
| `src/app/(app)/questionario/move-actions.ts` | nuovo — 108 righe |
| `src/app/(app)/questionario/move-buttons.tsx` | nuovo — 80 righe |
| `src/app/(app)/questionario/question-actions.ts` | modificato — 173 righe |
| `src/app/(app)/questionario/block-title-form.tsx` | modificato — 154 righe |
| `src/app/(app)/questionario/block-card.tsx` | modificato — 76 righe |
| `src/app/(app)/questionario/question-item.tsx` | modificato — 113 righe |
| `src/app/(app)/questionario/page.tsx` | modificato — 156 righe |
| `src/app/globals.css` | modificato — due classi gemelle + selettore header |
| `docs/database.md` | modificato — §7 e §8 |
| `docs/bmad/implementazione/deferred-work.md` | modificato — tre annotazioni su voci esistenti |
| `docs/bmad/implementazione/sprint-status.yaml` | scrittura di metodo |
| `docs/bmad/implementazione/2-5-riordinare-blocchi-e-domande.md` | scrittura di metodo (questo file) |
| `docs/bmad/implementazione/2-4-riscrivere-una-domanda.md` | scrittura di metodo — due caselle di sessione spuntate (riga aggiunta dalla revisione) |
| `supabase/migrations/0012_reorder_guards.sql` | nuovo dalla revisione — direzione null, lock consultivo, riga sparita; applicata al progetto |

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 8 agosto 2026 | 0.1 | Story creata | Claude Fable 5, skill `bmad-create-story` |
| 8 agosto 2026 | 0.2 | Le quattro domande chiuse da Luca: default confermati, nessun task cambiato | Claude Fable 5, skill `bmad-create-story` |
| 8 agosto 2026 | 0.3 | Story implementata: 0011 applicata, azioni e frecce, rinumerazione anche alla creazione; verifica agente verde; stato a review | Claude Fable 5, skill `bmad-dev-story` |
| 8 agosto 2026 | 0.4 | Verifica di sessione completata da Luca (dodici punti, più i due residui della revisione 2.4): story chiusa | Claude Fable 5, skill `bmad-dev-story` |
| 8 agosto 2026 | 0.5 | Revisione applicata: migrazione 0012 (direzione null con `is distinct from`, lock consultivo sul questionario, guardia sulla riga sparita) applicata e sondata; «mai» di §8 declassato; ledger esteso in quattro punti; File List e Completion Notes riallineati. 131 test verdi | Claude Fable 5, skill `bmad-code-review` |
