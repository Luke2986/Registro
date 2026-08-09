---
baseline_commit: a444030
---

# Story 2.6: Disattivare una domanda invece di cancellarla

Status: review

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 8 agosto 2026

> **Baseline.** La Story 2.5 è chiusa e committata: `a444030`, spinto su `main` l'8 agosto 2026. Tutti i conteggi di questo file (righe, test, grep, stato del database) sono presi da quel commit e dal progetto Supabase, verificati l'8 agosto 2026.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want togliere dal giro una domanda senza perdere le risposte che ha già raccolto,
so that non devo scegliere fra un questionario pulito e la storia dei clienti passati.

## Acceptance Criteria

**AC1 — disattivare scrive `is_active`, mai una cancellazione**
**Given** una domanda attiva
**When** la disattivo
**Then** resta nella tabella con `is_active` a falso e non viene mai cancellata fisicamente (FR13)

**AC2 — una domanda disattivata non entra nelle schede nuove**
**Given** una domanda disattivata
**When** apro una scheda nuova
**Then** quella domanda non compare e non entra nel totale congelato

**AC3 — le schede aperte prima non perdono niente**
**Given** una domanda disattivata
**When** riapro una scheda aperta prima della disattivazione
**Then** la domanda e la sua risposta ci sono ancora, leggibili

**AC4 — nessun comando cancella una domanda**
**Given** la schermata del questionario
**When** la guardo
**Then** non esiste nessun comando che cancella una domanda

> Questa story **scrive una colonna sola, `is_active`, su una tabella sola, `questions`**. Non tocca `text`, `help_text`, `answer_type`, `options` (Story 2.4), non tocca `position` (Story 2.5, e la disattivazione **non rinumera** — v. decisione 3), non tocca `block_id`. Nessuna scrittura verso `questionnaires` (salvo l'esito della domanda 2, che nel default non scrive niente), `answers`, `assessments`, `question_blocks`. **Nessuna migrazione**: `is_active` esiste dalla 0004, `boolean not null default true`, e nessun vincolo nuovo serve — un booleano `not null` è già tutto il vincolo possibile. È la prima story dell'Epic 2 senza un file in `supabase/migrations/`, e il totale dei test **resta 131** proprio per questo.

> **AC2 e AC3 si onorano scrivendo bene `is_active`, e nient'altro.** Le schede non esistono: `answers` e `assessments` sono vuote e nessuna interfaccia le crea (Story 3.1). AC2 sarà fatto valere dalla 3.1, che filtra le domande attive all'apertura e scrive `total_questions` contando quelle — `page.tsx:25-27` lo promette già («è il contrario di quello che farà la schermata di compilazione»). AC3 è garantito dal disegno dello schema: ogni risposta porta la propria copia di `question_text`, `block_title` e `position` (`database.md` §3), quindi una domanda spenta — o persino cancellata da SQL — non può portarsi via niente. Come l'AC3 della 2.5: la metà non verificabile oggi non si dichiara verificata, si onora non scrivendo niente che possa contraddirla.

> **AC4 si soddisfa con un'assenza, e l'assenza si verifica.** Nessun `.delete()` esiste sotto `src/app/(app)/questionario/` (l'unico del progetto è `people-actions.ts:113`, le persone, un'altra storia) e nessuno entra con questa story. Il grep del Task 5 lo conta, la sessione di Luca lo guarda.

> **Questa story chiude l'Epic 2, e con lei si chiude la decisione rimandata su `questionnaires.version`.** La voce del ledger (7 agosto 2026) dichiara il punto di chiusura: «la fine dell'Epic 2, quando esistono tutte e cinque le scritture e si decide una volta sola che cosa conta come modifica strutturale». Le cinque scritture con questa esistono tutte: blocchi (2.2), domande nuove (2.3), riscrittura (2.4), riordino (2.5), disattivazione (2.6). La decisione è il Task 3 e la domanda 2.

## Tasks / Subtasks

- [x] **Task 1 — L'azione: `setQuestionActive`, una colonna, tre rami** (AC: 1)
  - [x] File nuovo `src/app/(app)/questionario/question-active-actions.ts`, con `'use server'` in testa, **una azione**: `setQuestionActive`. File suo e non dentro `question-update-actions.ts` (113 righe, ci starebbe): quel file dichiara in testa «un file d'azione porta una azione» e le due scritture non sono gemelle — una valida quattro campi con tre validatori, l'altra scrive un booleano. Il precedente delle gemelle conviventi (2.5) vale per forme identiche riga per riga; qui non lo sono. È la domanda 3, con default.
  - [x] Le costanti, una copia per file (precedente 2.3): `QUESTION_NOT_DEACTIVATED` = `'La domanda non è stata disattivata. Riprova fra un momento.'`, `QUESTION_NOT_REACTIVATED` = `'La domanda non è stata riattivata. Riprova fra un momento.'` — due frasi perché l'azione si chiama come il pulsante che la lancia, in tutto il percorso (UX-DR13) — e `QUESTION_GONE` = `'Questa domanda non è più disponibile. Ricarica la pagina.'`, la frase già in uso.
  - [x] Corpo: `openSession('setQuestionActive')` da `@/lib/supabase/session`; `question_id` verificato con `isUuid` da `@/lib/uuid`; il campo `active` con una guardia locale — `const isActiveValue = (v: unknown): v is 'true' | 'false' => v === 'true' || v === 'false'` — un valore diverso arriva solo da una richiesta forgiata: log e messaggio generico — `QUESTION_NOT_DEACTIVATED`, scelta fissa perché con un campo forgiato la destinazione non si conosce e il caso non è raggiungibile dall'interfaccia — mai `as` (kb-0.md §2). **Lo stato di destinazione arriva esplicito dal client e non si inverte sul server**: è la decisione 2, e il motivo sta lì.
  - [x] Una query sola, nessuna pre-lettura: `.from('questions').update({ is_active: active === 'true' }).eq('id', questionId).select('id').maybeSingle()` — `maybeSingle` e non `single`, per la stessa ragione scritta in `question-update-actions.ts:80-85`: con la RLS, «non mia» e «sparita» arrivano identiche, zero righe, e devono diventare un messaggio, non un errore. La riga la filtra `questions_owner_all` (0007), che risale al questionario.
  - [x] Mappatura in tre rami, la forma di `moveBlock`: `error` → log **solo `code` e `message`** (mai `details`: contiene la riga intera, cioè il testo della domanda — kb-0.md §3) e messaggio `QUESTION_NOT_DEACTIVATED`/`QUESTION_NOT_REACTIVATED` secondo la destinazione; `!data` → `QUESTION_GONE`; successo → `revalidatePath('/questionario')` e `return {}`. **Nessun ramo `23514` e nessun `23503`**: la scrittura di un booleano `not null` non attraversa nessun vincolo `check` né nessuna chiave esterna — i due rami sarebbero codice morto copiato da `updateQuestion`.
  - [x] Tipo di ritorno `SetQuestionActiveState = { error?: string }`. Niente `saved`: al successo la rivalidazione fa girare la parola `attiva`/`non attiva` e l'etichetta del pulsante, e non c'è nessun campo da riallineare.
  - [x] `revalidatePath('/questionario')` e **solo quello**: le domande non compaiono nell'elenco clienti e questa scrittura non muove `clients.updated_at`.
  - [x] `updated_at` non si scrive: lo muove il trigger della 0006, come sempre. Il file sta in ~85 righe.

- [x] **Task 2 — Il pulsante: `Disattiva` e `Riattiva`, accanto a `Modifica`** (AC: 1, 4)
  - [x] File nuovo `src/app/(app)/questionario/question-active-button.tsx`, con `'use client'`, componente `QuestionActiveButton`. Props: `{ questionId: string; isActive: boolean }`. Il componente importa **lui** l'azione da `./question-active-actions` — stessa ragione di `MoveButtons`: un callback costruito nel Server Component non sarebbe serializzabile.
  - [x] Dentro: `useWrite` (`@/lib/use-write`) col messaggio scelto dalla destinazione (`isActive ? QUESTION_NOT_DEACTIVATED : QUESTION_NOT_REACTIVATED`, costanti ridefinite qui, una copia per file); submit che costruisce il `FormData` (`question_id` + `active` con il valore **opposto** a `isActive`, come stringa `'true'`/`'false'`); **un pulsante solo** `btn btn--quiet` la cui etichetta è l'unica parola nuova a schermo: **`Disattiva`** quando la domanda è attiva, **`Riattiva`** quando non lo è (UX-DR13: dice cosa succede premendo). `disabled` durante `pending` e mai per altro: nessun bordo esiste qui. L'errore di `useWrite` è la solita riga `<p className="field__error" role="alert">` resa dal componente, dopo il pulsante — dentro `.question__actions` va a capo da sola per la regola `flex-basis: 100%` già scritta dalla 2.5.
  - [x] **Nessuna conferma prima di disattivare.** Non è un'azione distruttiva: `Riattiva` la annulla identica, e kb-0.md §6 è esplicito — «nessuna azione distruttiva senza conferma; **nessuna conferma per azioni reversibili**». La conferma esiste per proteggere da una perdita; qui non si perde niente per costruzione (AC1, AC3). È la decisione 1: la reversibilità dall'interfaccia è ciò che *rende* l'azione non distruttiva.
  - [x] `question-item.tsx`: dentro `.question__actions` (`:60-75`), dopo `Modifica`, entra `<QuestionActiveButton questionId={question.id} isActive={question.is_active} />`. Il pulsante c'è **anche in questo caso** su tutte le domande — su quelle spente dice `Riattiva` — e `Modifica` e le frecce restano anche sulle spente, com'è già: nessuno stato blocca nessuna azione (D14, NFR8). Il file cresce di ~5 righe (113 → ~118) e non cambia in nient'altro: né lo stato `editing`, né il ritorno di fuoco, né la resa del display. In modifica il modulo sostituisce l'intestazione intera e il pulsante sparisce con le frecce, com'è già per loro.
  - [x] **Nessun CSS nuovo.** `.question__actions` è già il contenitore flex con `wrap` e la regola per la riga d'errore; `.question--inactive` con la sua motivazione (`globals.css:886-903`) esiste dalla 2.1 e fa già tutto: la parola `attiva`/`non attiva` di `question__meta` gira da sola alla rivalidazione. Se a schermo emergesse un bisogno reale (verifica a 375px, Task 5), si dichiara nel Dev Agent Record — non si aggiunge d'anticipo.

- [x] **Task 3 — La decisione di fine Epic 2: `questionnaires.version` resta 1, e lo si dichiara** (decisione rimandata dalla 2.2, punto di chiusura dichiarato: questa story)
  - [x] È la domanda 2, con default. Il default: **`version` resta `1` e nessuna scrittura la fa crescere, finché nessuno la legge.** Il motivo, da scrivere dove si cerca: la ricostruzione delle schede vecchie non passa e non passerà mai da `version` — passa dalle copie dentro `answers` (`question_text`, `block_title`, `position`), che è la scelta centrale dello schema (`database.md` §3, PRD §3 «Scelta tecnica»). Farla crescere costerebbe o una seconda scrittura senza transazione da ogni azione (lo stato incoerente già rifiutato due volte), o un trigger di database che conta *ogni* scrittura — e un contatore di scritture non è una «versione strutturale», è rumore col nome sbagliato. La colonna resta com'è, senza migrazione: toglierla sarebbe una migrazione per cancellare un'informazione che le esportazioni future potrebbero volere, e la 3.1 copierà `1` in `assessments.questionnaire_version` — vero oggi, e pronto a diventare significativo il giorno che una definizione operativa di «modifica strutturale» esistesse davvero.
  - [x] Se Luca conferma il default, l'esito si scrive in tre posti (Task 4): `database.md` §3 (il paragrafo della sospensione si riscrive con l'esito), `00-contesto-e-decisioni.md` (voce **D25**, perché l'esito supera la lettera del PRD §3, che diceva «cresce a ogni modifica strutturale» — una decisione che supera un documento si registra con data e motivo, kb-0.md §8), e la voce del ledger si chiude.
  - [x] Se Luca risponde diversamente — la vuole far crescere — la strada è un trigger di database, cioè una migrazione con la sua dichiarazione D24, e **non entra in questa story**: si apre come lavoro a sé, perché richiede prima la definizione di quali scritture contano. In quel caso il Task 4 registra la definizione scelta e il rimando.

- [x] **Task 4 — I documenti: la sospensione di §3 finisce, il ledger si aggiorna**
  - [x] **`docs/database.md` §3**: il capoverso «Dalla Story 2.2 (7 agosto 2026) esistono le prime scritture sui blocchi, e nessuna fa crescere `version` […]» si riscrive con l'esito della domanda 2. Con il default: l'Epic 2 è chiusa, le cinque scritture esistono, e la decisione presa (D25, 8 agosto 2026) è che `version` resta `1` — nessuna scrittura la muove, la ricostruzione sta nelle copie di `answers`, e la colonna resta per le esportazioni future. La voce cita D25 ed è il posto dove si cerca «perché version non cresce».
  - [x] **`docs/00-contesto-e-decisioni.md`**: voce **D25** con data e motivo, se il default è confermato (formato delle voci esistenti; «Ultimo aggiornamento» in testa al file si aggiorna). Se l'esito è diverso, la voce registra quello.
  - [x] **`docs/bmad/implementazione/deferred-work.md`**, annotazioni su voci esistenti, nessuna voce nuova:
    - la voce su **`questionnaires.version` resta 1** (implementazione 2.2, riga «Rimandato per decisione di Luca del 7 agosto 2026, con il punto di chiusura dichiarato: la fine dell'Epic 2») si chiude ~~barrata~~ con l'esito e la data, come le sorelle già chiuse.
    - la voce sui **nomi accessibili identici** (revisione 2.4, estesa dalla 2.5) si estende ancora: `Disattiva`/`Riattiva` aggiunge un pulsante per domanda — fino a 23 con lo stesso nome (l'etichetta varia con lo stato, non con la domanda) — e il modulo resta senza nome accessibile. Stessa classe, stessa Story 5.2.
    - la voce sull'**input disabilitato durante `pending` che scarica il fuoco sul body** si annota con la sesta istanza: `question-active-button.tsx` spegne il pulsante durante il volo; al successo il pulsante si riaccende con l'etichetta girata, ma il fuoco intanto è caduto. Stessa passata della 5.2.
    - la voce sul **questionario con `is_active = false` mostrato come «non ancora caricato»** (revisione 2.1) si annota: l'Epic 2 si chiude senza che nessun codice scriva `questionnaires.is_active` — il punto di ripresa resta «appena qualcosa scrive `questionnaires`», invariato. L'annotazione esiste perché chi rileggesse «da riprendere appena l'Epic 2 tocca…» a epica chiusa deve trovare l'esito, non dedurlo.
  - [x] In `database.md` §3, tabella `questions`: nessuna modifica allo schema documentato — la riga «Le domande non si cancellano, si disattivano» c'è già e da questa story è vera anche dall'interfaccia. Non serve scrivere altro.

- [ ] **Task 5 — La verifica** (AC: 1, 2, 3, 4)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa — il file `'use server'` nuovo esporta solo funzioni asincrone.
  - [x] `npm test` passa e il totale **resta 131**: nessuna migrazione nuova, quindi nessun controllo nuovo da `migrations.test.ts`. Se il totale cresce, è entrata una migrazione che questa story dichiara di non portare.
  - [x] `list_migrations` risponde ancora **dodici** righe, tutte col prefisso, `0012_reorder_guards` in fondo: il registro non si muove.
  - [x] **La prova della scrittura, in una transazione che si annulla** (`begin; … rollback;` in una sola chiamata `execute_sql`, come le sonde della 2.5 — eseguita come proprietario del database esercita la *meccanica*, non le policy): `update questions set is_active = false where position = 2` → la riga resta (`select count(*) from questions` risponde 23), `is_active` è falso, `updated_at` si è mosso da solo (trigger 0006), `position` non è cambiata a nessuna delle 23. Dopo il `rollback`, riconteggio identico allo stato di partenza: 23 domande, 0 non attive.
  - [x] **La sonda senza sessione** (pattern consolidato): `PATCH …/rest/v1/questions?id=eq.<uuid>` con la sola chiave pubblicabile e `{"is_active": false}` nel corpo **non tocca nessuna riga** — `questions_owner_all` non dà ad `anon` nessuna riga da aggiornare. Con una sessione la conferma sta nella verifica di Luca.
  - [x] Il grep del perimetro: `.delete(` **zero** sotto `src/app/(app)/questionario/` (l'unico sotto `src/` resta `people-actions.ts:113`) — è AC4 in forma verificabile; `.from('questions')` passa da **tre a quattro** (il nuovo update); `.update(` sotto `questionario/` da **due a tre**; `.rpc(` resta **tre**; `.from('question_blocks')` resta quattro, `.from('questionnaires')` due; zero `answers`/`assessments`; **nessuna scrittura su `position`** in TypeScript, come dalla 2.5.
  - [x] Tutti i file toccati sotto le 200 righe; `edit-question-form.tsx` (228, eccezione dichiarata dalla 2.4) **non si apre** — il comando non sta nel modulo di modifica.
  - [x] Sotto `src/app/(app)/questionario/` nessun `--sec-questionario` e nessun esadecimale (UX-DR2); `globals.css` **non si tocca** (o, se un bisogno emerge a schermo, si dichiara).
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`, `00-contesto-e-decisioni.md`), dichiarate nel File List.

  Richiede una sessione, la fa Luca — è la condizione per `done`. Avvertenza: la disattivazione è su domande vere, ed è reversibile con `Riattiva`, quindi niente dati di prova necessari — basta rimettere a posto:
  - [ ] Apro `/questionario`: ogni domanda ha `Disattiva` dopo `Modifica`, e la pagina si legge come prima.
  - [ ] Disattivo una domanda in mezzo a un blocco: la parola diventa `non attiva`, il testo si spegne su `--ink-muted` (la resa che esiste dalla 2.1, mai vista con un dato vero), il pulsante ora dice `Riattiva`. Nessuna conferma chiesta, nessun avviso.
  - [ ] Ricarico: la domanda è ancora lì, ancora spenta, **allo stesso posto** — disattivare non sposta niente.
  - [ ] `Riattiva`: la domanda torna attiva, identica, dov'era.
  - [ ] Su una domanda spenta, `Modifica` funziona e `Sposta su`/`Sposta giù` funzionano: nessuno stato blocca nessuna azione (D14).
  - [ ] Cerco in tutta la schermata un comando che cancelli una domanda: non esiste (AC4).
  - [ ] Da tastiera: Tab raggiunge il pulsante, Invio disattiva, l'etichetta gira. Il caso noto: durante il volo il pulsante si spegne e il fuoco cade sul body — annotato per la 5.2, non si corregge qui.
  - [ ] Larghezza 375px: la riga delle azioni della domanda — quattro pulsanti ora — non trabocca e non fa scorrere la pagina di lato; se serve, va a capo.
  - [ ] Nessun errore in console, nessun avviso di idratazione.

### Review Findings

Revisione del 9 agosto 2026 (skill `bmad-code-review`): tre layer in parallelo — adversarial generico, cacciatore di edge case, auditor dei criteri di accettazione — poi ogni finding verificato da uno scettico che leggeva il codice vero, più un critico di completezza. Quattordici verifiche: sette finding confutati, sei confermati o parziali, quattro angoli morti nuovi. **Nessun difetto nel codice dell'azione o del pulsante**: gli AC reggono, i grep del Dev Agent Record sono stati riprodotti e tornano, i 131 test passano. Quello che resta è documentale, e in questo progetto i documenti sono il meccanismo con cui i difetti rimandati vengono ritrovati.

- [x] **[Review][Decision] `prd-v1.md:62` continua ad affermare il contrario di D25 e non è marcato come superato** — la riga «`versione` | numero | cresce a ogni modifica strutturale, a scopo informativo» era rimasta intatta, mentre D25 dichiara esplicitamente di superarne la lettera. `kb-0.md` §8 chiede che la decisione superata si marchi e resti visibile. **Risolta da Luca il 9 agosto 2026: marcare adesso**, allargando il File List di un file. La riga resta scritta — la colonna esiste ancora — e sotto la tabella di §3 c'è ora la nota di supersessione con la data, il motivo e il rimando a D25 e a `database.md` §3, nella forma già in uso a `design-system.md:159` e `database.md:394`.

- [x] **[Review][Patch] `database.md` afferma ancora che `version` cresce, due righe sopra il capoverso che dice il contrario** [docs/database.md:162] — la frase è ora barrata e resta visibile, con sotto la nota di supersessione datata che cita D25. Prima del diff la frase si leggeva come intenzione non ancora attuata, perché il capoverso vicino la inquadrava come decisione rimandata; la 2.6 l'ha resa falsa senza marcarla.
- [x] **[Review][Patch] Il capoverso di §3 ricopia D25 quasi alla lettera invece del riassunto che il Task 4 prescriveva** [docs/database.md:164] — misurato al 46% di frammenti identici. Riscritto come riassunto (Epic 2 chiusa, cinque scritture, `version` resta `1`, la ricostruzione sta nelle copie di `answers`, la colonna resta per le esportazioni future) con il rimando a D25 per le alternative scartate. La terza presunta copia, quella del ledger, era già un rimando e non è stata toccata.
- [x] **[Review][Patch] La voce del ledger sulle scritture «per solo `id`» non è estesa a `setQuestionActive`** [docs/bmad/implementazione/deferred-work.md:85] — estesa con la sesta e ultima istanza dell'Epic 2. Senza, il giorno della sanatura l'inventario avrebbe elencato `createBlock`, `createQuestion`, `updateQuestion`, `move_block` e `move_question`, e `setQuestionActive` sarebbe rimasta l'unica fuori.
- [x] **[Review][Patch] La voce del ledger sull'errore che sparisce entrando in modifica non è estesa a `QuestionActiveButton`** [docs/bmad/implementazione/deferred-work.md:103] — estesa. È la voce che rende legittimamente rimandato il caso «premo `Disattiva`, apro `Modifica`, il rifiuto non lo vedo mai»: senza l'estensione il caso era rimandato in teoria e invisibile in pratica.
- [x] **[Review][Patch] Il commento sui vincoli descrive una meccanica di Postgres che non esiste** [src/app/(app)/questionario/question-active-actions.ts:65-67] — riscritto in «`is_active` non compare in nessun vincolo check e non è una chiave esterna, quindi nessuno dei due può fallire». La conclusione operativa era giusta — i rami `23514` e `23503` sarebbero codice morto — ma «non attraversa» era falso: Postgres rivaluta tutti i `check` di riga a ogni update. **Il gemello in `move-actions.ts:52-53` porta lo stesso idioma impreciso e non è stato toccato**: il file appartiene alla Story 2.5, chiusa, e correggerlo allargherebbe il perimetro una seconda volta. Da chiudere alla prima story che apre quel file.

- [x] **[Review][Defer] Le etichette del modulo di modifica ereditano `--ink-muted` dentro una domanda spenta** [src/app/globals.css:891-897] — rimandato, pre-esistente: la resa resta dentro il design system, ma il commento della regola è diventato falso
- [x] **[Review][Defer] Due `btn--primary` possono stare a schermo insieme, contro UX-DR10** [src/app/(app)/questionario/new-question-form.tsx:185] — rimandato, pre-esistente dalle Story 2.2-2.4
- [x] **[Review][Defer] Lo scheletro di caricamento non conosce la riga delle azioni, ora quattro pulsanti** [src/app/(app)/questionario/loading.tsx:40-45] — rimandato, pre-esistente, si chiude con la voce già a ledger sugli scheletri

Confutati e scartati, con la ragione, perché non tornino a ogni revisione: l'esito perso smontando il display durante il volo (già a ledger, e lo schermo non mente comunque); il `updated_at` mosso da un no-op (classe già accettata dalla 2.5, e `questions.updated_at` non è letto da nessuna parte); il log della guardia senza dettagli (convenzione in quattordici punti dall'Epic 1, e il ramo d'errore vero i dettagli li porta); il contratto `'true'`/`'false'` slegato (fallirebbe chiuso e rumoroso al primo clic, precedente identico in `move-buttons`); i messaggi duplicati fra file (server e client portano due messaggi per due eventi diversi, e nel progetto divergono di proposito in quattro punti); il terzo commento su D14 (dice un perché, che `kb-0.md` §2 ammette, e il precedente accettato sta in `clienti/actions.ts:71,233`); la guardia scritta come `function` invece che come const arrow (otto guardie su otto nel repository sono così, e la spec stessa cita `isDirection` come modello). Scartato anche il messaggio fisso sulla richiesta forgiata: può nominare la direzione sbagliata, ma è comportamento prescritto dal Task 1 con la sua ragione scritta, e lo legge soltanto chi forgia la richiesta contro sé stesso.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository (`a444030`, la 2.5 chiusa) e sul progetto Supabase l'8 agosto 2026.

**Lo stato del database, contato l'8 agosto 2026:** 8 blocchi, 23 domande con posizioni globali 1..23 consecutive e distinte, **0 domande non attive** — questa story accenderà il primo dato vero di quella colonna —, `answers` e `assessments` **vuote**, 1 questionario attivo a `version` 1. Dodici migrazioni a registro, tutte col prefisso. **131 test verdi.**

**La colonna c'è dal primo giorno.** `questions.is_active boolean not null default true` (0004). Nessun vincolo manca: un booleano `not null` non ha casi degeneri da vietare. Il trigger `updated_at` (0006) copre `questions`. La policy `questions_owner_all` (0007) è `for all` e risale al questionario: copre anche questo update, nessuna policy nuova.

**La resa della domanda spenta esiste già, non provata su dati veri.** La 2.1 ha costruito tutto il lato lettura di questa story: la parola `attiva`/`non attiva` sempre presente (`question-item.tsx:82-91`, col commento che spiega perché la parola c'è anche sulle attive), la classe `.question--inactive` con la scelta di `--ink-muted` per non scendere sotto il contrasto 4.5:1 (`globals.css:886-903`), e la query della pagina che **non filtra** le spente, di proposito (`page.tsx:25-27`: «AC2 chiede di vedere *se* una domanda è attiva»). Questa story scrive il dato; la resa lo aspetta da tre story.

**Le macchine dell'interfaccia ci sono tutte.** `useWrite` (`use-write.ts`) per chiamare un'azione da un pulsante; `btn--quiet` per le azioni terziarie ripetute; `.question__actions` con `flex-wrap` e la regola che manda la riga d'errore a capo (`flex-basis: 100%`, dalla 2.5); `openSession`, `isUuid`, il pattern dei tre rami di `moveBlock`. Il componente nuovo è la forma di `MoveButtons` con un pulsante solo e senza bordi.

**Il commento di `question-actions.ts:125` va lasciato com'è**: «Niente `is_active`: il default dello schema è true» — resta vero, la creazione continua a non scriverlo.

### Cosa cambia questa story, file per file

```
src/app/(app)/questionario/question-active-actions.ts   NUOVO — 'use server', setQuestionActive (~85 righe)
src/app/(app)/questionario/question-active-button.tsx   NUOVO — 'use client', Disattiva/Riattiva (~70 righe)
src/app/(app)/questionario/question-item.tsx            MODIFICA — montaggio del pulsante (~118 righe)
docs/database.md                                        MODIFICA — §3, l'esito su version
docs/00-contesto-e-decisioni.md                         MODIFICA — D25 (se default confermato)
docs/bmad/implementazione/deferred-work.md              MODIFICA — una chiusura e tre annotazioni
```

`page.tsx`, `block-card.tsx`, `block-title-form.tsx`, `move-actions.ts`, `move-buttons.tsx`, `question-actions.ts`, `question-update-actions.ts`, `edit-question-form.tsx`, `new-question-form.tsx`, `new-block-form.tsx`, `actions.ts`, `loading.tsx`, `use-write.ts`, `question-fields.ts`, `answer-types.ts`, `globals.css`, `database.types.ts`, `seed.sql` **non si aprono**. Nessuna migrazione. Niente sotto `clienti/`, nessuna dipendenza nuova.

### Le tre decisioni di questa story

**1. `Riattiva` esiste, e per questo `Disattiva` non chiede conferma.** L'AC parla solo di disattivare, ma senza il gesto inverso la disattivazione sarebbe l'unica azione dell'intero software irreversibile dall'interfaccia — su uno strumento la cui promessa è che niente si perde. kb-0.md §6 chiude il cerchio: le azioni distruttive vogliono una conferma, le reversibili no. Con `Riattiva` a un clic, `Disattiva` è reversibile per costruzione e la conferma sarebbe solo attrito dentro una schermata di lavoro. Il PRD lo prevede già: il campo del questionario è «attiva sì/no», non «attiva finché». È la domanda 1.

**2. Lo stato di destinazione arriva esplicito dal client, non si inverte sul server.** Un'azione «toggle» dovrebbe leggere il valore corrente e invertirlo: una pre-lettura in più e una corsa in meno di senso — due schede che premono insieme si annullerebbero a vicenda (falso-vero-falso), e nessuna delle due vedrebbe un errore. Col valore esplicito (`active: 'false'`) le stesse due scritture sono idempotenti: chiedono la stessa cosa, la ottengono entrambe, nessuna pre-lettura serve. È la stessa ragione per cui `move_*` riceve la direzione e non «la prossima posizione»: il client dichiara l'intento, il server lo applica.

**3. Disattivare non rinumera, e non deve.** `renumber_questions` (0011) rinumera **tutte** le domande del questionario, attive e no, e questa story non la chiama: una domanda spenta conserva la sua `position`, così `Riattiva` la rimette esattamente dov'era — spegnere e riaccendere è un no-op pieno, come dev'essere. La conseguenza da capire per non «correggerla» per sbaglio: una scheda futura (3.1) che copia le posizioni delle sole domande attive avrà numeri con dei buchi (1, 2, 4, …). Non è un difetto: `answers.position` serve a *ordinare* la scheda, non a contarla — il conteggio è `total_questions`, che conta le attive. Rinumerare alla disattivazione «per chiudere i buchi» distruggerebbe il posto della domanda e trasformerebbe ogni toggle in una riscrittura di massa.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Cancellare la riga invece di scrivere `is_active` | AC1 violata, risposte future orfane | L'unica scrittura è un update sulla colonna; nessun `.delete()` esiste né entra |
| Chiedere conferma prima di disattivare | Attrito su un'azione reversibile, contro kb-0.md §6 | `Riattiva` è l'annullamento; nessuna finestra di conferma |
| Azione «toggle» che legge e inverte sul server | Due schede si annullano a vicenda senza errore | Lo stato di destinazione arriva esplicito dal client (decisione 2) |
| Chiamare `renumber_questions` alla disattivazione | La domanda perde il posto; `Riattiva` non la rimette dov'era | La disattivazione non tocca `position` (decisione 3) |
| Filtrare le domande spente dalla pagina del questionario | Metà del criterio della 2.1 sparisce; il filtro è della 3.1 | La query di `page.tsx` non si tocca |
| Aggiungere il conteggio delle attive accanto al titolo | Il commento di `page.tsx:94-99` spiega perché arriva con la 3.1 | Niente conteggi in questa story |
| Colori d'allarme sulla domanda spenta | Una scelta non è un errore: niente `--bad`, niente `--warn` | `.question--inactive` esiste già e non si tocca |
| Rami `23514`/`23503` nell'azione | Un booleano `not null` non attraversa quei vincoli: codice morto | Tre rami: errore dell'update, `!data`, successo |
| Mettere il comando dentro `edit-question-form.tsx` | Il file è a 228 righe, eccezione dichiarata che non si riapre | Il pulsante sta nella riga delle azioni di `question-item` |
| Bloccare `Modifica` o le frecce sulle domande spente | Nessuno stato blocca nessuna azione (D14, NFR8) | Tutti i comandi restano, su tutte le domande |
| Far crescere `questionnaires.version` «già che siamo alla fine» | La decisione è il Task 3 e ha un esito scritto, non un riflesso | Nessuna scrittura su `questionnaires` (col default) |
| Una migrazione «di sicurezza» (vincolo, indice) | Niente da vincolare: `boolean not null` è già tutto | Nessun file nuovo in `supabase/migrations/` |
| Scrivere `updated_at` a mano | Il trigger della 0006 lo fa già | L'update tocca la sola `is_active` |
| `as` sul valore del campo `active` | Vietato (kb-0.md §2) | Guardia locale `isActiveValue`, come `isDirection` |
| Loggare `details` dell'errore | Contiene la riga intera, cioè testo scritto da una persona | Solo `code` e `message` (kb-0.md §3) |

### Contratto visivo

- Nessun componente di disegno nuovo e nessun CSS nuovo: il pulsante vive nella riga `.question__actions` che esiste dalla 2.5, con le sue regole di wrap e d'errore.
- `Disattiva` e `Riattiva` sono `btn--quiet` come `Modifica` e le frecce: azioni terziarie, fino a 23 istanze. Le parole nuove a schermo sono due, e ognuna dice cosa succede premendo (UX-DR13). L'azione si chiama allo stesso modo dal pulsante al messaggio d'errore («non è stata disattivata»).
- La domanda spenta si presenta come la 2.1 ha deciso: testo su `--ink-muted` (contrasto 4.5:1 conservato), la parola `non attiva` accanto al tipo — la parola c'è sempre, perché il colore non è mai l'unico portatore di significato (UX-DR2). Niente rosso, niente ambra: una domanda disattivata è una scelta, non un esito.
- Nessuna animazione: l'etichetta e la parola girano alla rivalidazione, e basta.

### Perimetro: cosa NON entra in questa story

- **Nessuna cancellazione fisica di niente**, nemmeno come «pulizia»: le domande si disattivano (masterplan §5: niente si cancella davvero).
- **Nessun filtro `is_active` sulla pagina del questionario** e **nessun conteggio delle attive**: entrambi appartengono alla 3.1, e la pagina lo dichiara nei commenti.
- **Nessuna disattivazione di blocchi**: `question_blocks` non ha `is_active`, e aggiungerlo sarebbe schema nuovo per una funzione che nessun requisito chiede.
- **Nessuna scrittura su `questionnaires.is_active`**: la voce del ledger sul questionario spento resta aperta col suo punto di ripresa (annotata, Task 4).
- **Nessuna migrazione**: prima story dell'Epic 2 senza; il totale dei test resta 131 apposta.
- **Nessuna correzione ai quirk del fuoco** (ledger, Story 5.2): la sesta istanza si annota, non si corregge.
- **Nessun test JS nuovo**: l'azione è la mappatura di tre rami e il componente è presentazione — un test che finge Supabase verificherebbe il finto (stessa riga di tutte le story dell'Epic 2).

### Test

Cosa entra: niente di nuovo, ed è una scelta, non una dimenticanza. La logica che «rompendosi produce dati sbagliati» (kb-0.md §7) qui è una sola scrittura booleana protetta da RLS e trigger già esistenti e già sotto sonda; la sua prova sono la transazione annullata e la sonda senza sessione del Task 5. Non essendoci migrazioni, `migrations.test.ts` non ha niente di nuovo da leggere: **131 → 131**, ed è la prima volta nell'Epic 2 che il numero fermo è la verifica giusta.

### Project Structure Notes

```
src/app/(app)/questionario/
├── question-active-actions.ts   NUOVO — 'use server', una azione (~85 righe)
├── question-active-button.tsx   NUOVO — 'use client', un pulsante (~70 righe)
├── question-item.tsx            MODIFICA — un import e un montaggio (~118 righe)
└── tutto il resto               INVARIATO

supabase/                        INVARIATO — nessuna migrazione, seed compreso
src/app/globals.css              INVARIATO (salvo bisogno dichiarato a schermo)
docs/database.md                 MODIFICA — §3
docs/00-contesto-e-decisioni.md  MODIFICA — D25
docs/bmad/implementazione/deferred-work.md  MODIFICA — una chiusura, tre annotazioni
```

Convenzioni vincolanti (kb-0.md §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, un componente per file, nessun file sopra le 200 righe (l'unica eccezione dichiarata resta `edit-question-form.tsx` a 228, e questa story non la apre).

### Piattaforma in uso, verificata

Identica alla 2.5, ricontata l'8 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`. Nessuna dipendenza entra o si aggiorna. Nessuna rigenerazione dei tipi: lo schema non cambia.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, dodici migrazioni registrate col prefisso.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che la resa della domanda spenta regga su un dato vero**: `.question--inactive` esiste dalla 2.1 e nessuna domanda è mai stata `is_active = false` in produzione — la verifica a schermo di Luca è la prima.
- **Che quattro pulsanti in `.question__actions` stiano a 375px** senza traboccare: il wrap c'è dalla 2.5, ma il quarto pulsante non è mai esistito.

### Intelligence dai commit e dalla story precedente

Da `a444030` (2.5) e dai commit precedenti, le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere**: AC2 e AC3 non sono verificabili oggi (tabelle vuote, Story 3.1 inesistente) e si onorano scrivendo bene `is_active` — senza dichiararle verificate.
- **Il task di verifica è diviso in due**: parte agente e sessione di Luca; la seconda è la condizione per `done`.
- **Le domande si chiudono prima di implementare**: le tre in fondo hanno il default già dentro i task; se Luca conferma, non cambia niente.
- **Le sonde hanno un pattern consolidato**: transazione annullata per la meccanica, richiesta con la sola chiave pubblicabile per la RLS, e la dichiarazione esplicita di quale metà resta alla sessione.
- **L'esito delle decisioni strutturali si scrive dove si cerca**: per la 2.5 fu `database.md` §8; qui è §3 più la voce D25 — il file della story non basta, perché fra tre mesi nessuno lo riapre.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.6: Disattivare una domanda invece di cancellarla]
- FR13 (disattivare, non cancellare); FR16 (il totale congelato che AC2 nomina); NFR8/D14: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- «Nessuna cancellazione fisica: si disattiva» e il campo «attiva sì/no»: [Source: docs/prd-v1.md#4. Schermate] e [Source: docs/prd-v1.md#3. Entità e campi]
- Criterio di accettazione 5 del PRD (sparisce dalle nuove, resta nelle vecchie): [Source: docs/prd-v1.md#6. Criteri di accettazione]
- La colonna, il default e il principio «niente cancellazioni dove c'è storia»: [Source: docs/database.md#3. Tabelle] e [Source: supabase/migrations/0004_questionnaire.sql]
- La copia dentro la risposta che rende AC3 gratuito: [Source: docs/database.md#3. Tabelle]
- La decisione rimandata su `version` col punto di chiusura a fine Epic 2: [Source: docs/bmad/implementazione/deferred-work.md#Deferred from: implementazione della story 2-2] e [Source: docs/database.md#3. Tabelle]
- La pagina che non filtra le spente e il conteggio che aspetta la 3.1: [Source: src/app/(app)/questionario/page.tsx:25-27,94-99]
- La resa della domanda spenta, pronta dalla 2.1: [Source: src/app/(app)/questionario/question-item.tsx:82-91] e [Source: src/app/globals.css:886-903]
- Il pattern dei tre rami e del pulsante che chiama un'azione: [Source: src/app/(app)/questionario/move-actions.ts] e [Source: src/app/(app)/questionario/move-buttons.tsx]
- `maybeSingle` e il log senza `details`: [Source: src/app/(app)/questionario/question-update-actions.ts:80-104]
- Conferme solo per azioni distruttive, mai per le reversibili: [Source: docs/kb-0.md#6. Interfaccia e design]
- Nessuno stato blocca nessuna azione: [Source: docs/00-contesto-e-decisioni.md#D14]
- Story precedente, con le sue macchine e le sue lezioni: [Source: docs/bmad/implementazione/2-5-riordinare-blocchi-e-domande.md]

### Domande per Luca, da chiudere prima di dev-story

**Chiuse da Luca l'8 agosto 2026: tutti e tre i default confermati.** Nessun task cambia. Resta a dev-story scrivere l'esito della domanda 2 dove si cerca — `database.md` §3 e la voce D25 in `00-contesto-e-decisioni.md` (Task 3 e 4) — che era dovuto con qualunque esito.

Tre, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. La seconda è strutturale e chiude l'Epic 2; il suo esito va scritto in `database.md` §3 e in `00-contesto-e-decisioni.md`.

1. **`Riattiva` fa parte della story?**
   L'AC parla solo di disattivare, ma senza l'inverso la disattivazione sarebbe l'unica azione irreversibile dall'interfaccia, e per kb-0.md §6 dovrebbe allora chiedere conferma — attrito in più per proteggere da una perdita che con `Riattiva` non esiste. Il PRD definisce il campo come «attiva sì/no».
   **Default: sì, un pulsante solo che alterna `Disattiva`/`Riattiva`, senza conferme.** Se la risposta è no, il pulsante c'è solo sulle attive, `Disattiva` chiede conferma (è diventata distruttiva), e riattivare resta possibile solo da SQL.

2. **`questionnaires.version` resta 1, dichiarato con D25?**
   È la decisione rimandata dalla 2.2 col punto di chiusura «fine dell'Epic 2», cioè adesso. La ricostruzione delle schede vecchie passa dalle copie dentro `answers`, mai da `version`; farla crescere costerebbe una seconda scrittura senza transazione o un trigger che conta ogni scrittura, per un numero che oggi nessuno legge. La colonna resta, e la 3.1 vi copierà `1`.
   **Default: sì, `version` resta 1 e nessuna scrittura la muove; D25 lo registra, `database.md` §3 lo dice dove si cerca.** Se la risposta è no, serve prima una definizione di «modifica strutturale» e poi una migrazione con trigger: si apre come lavoro a sé, non entra in questa story.

3. **L'azione sta in un file nuovo, `question-active-actions.ts`?**
   `question-update-actions.ts` (113 righe) la conterrebbe restando sotto le 200, ma dichiara in testa «un file d'azione porta una azione», e le due scritture non sono gemelle: una valida quattro campi, l'altra scrive un booleano. Il precedente delle gemelle conviventi (2.5) vale per forme identiche riga per riga.
   **Default: sì, file nuovo, una azione.** Se la risposta è no, l'azione entra in `question-update-actions.ts` (~173 righe) e il commento di testa si riscrive.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5), skill `bmad-dev-story`, 8 agosto 2026.

### Debug Log References

Nessun ostacolo. Implementazione lineare sui pattern esistenti (`move-actions.ts`, `move-buttons.tsx`, `useWrite`).

### Completion Notes List

- **Task 1** — `question-active-actions.ts` (89 righe): `setQuestionActive`, un solo update su `is_active`, tre rami come `moveBlock`. Stato di destinazione esplicito dal client (decisione 2), guardia `isActiveValue` senza `as`, `maybeSingle` per «non mia o sparita», log con soli `code` e `message`, messaggio scelto per destinazione (`QUESTION_NOT_DEACTIVATED`/`QUESTION_NOT_REACTIVATED`), `revalidatePath('/questionario')` e nient'altro. Nessun ramo `23514`/`23503`.
- **Task 2** — `question-active-button.tsx` (59 righe): un pulsante `btn--quiet` che alterna `Disattiva`/`Riattiva`, `useWrite` col messaggio per destinazione, errore in `field__error` con `role="alert"`, nessuna conferma (azione reversibile, kb-0.md §6). Montato in `question-item.tsx` dopo `Modifica` (117 righe), presente anche sulle domande spente (D14). Nessun CSS nuovo: `globals.css` non toccato.
- **Task 3** — Default confermato da Luca (8 agosto 2026): `questionnaires.version` resta `1`, nessuna scrittura la muove. Registrato come **D25**.
- **Task 4** — `database.md` §3 riscritto con l'esito (Epic 2 chiusa, cinque scritture, D25); `00-contesto-e-decisioni.md` con la voce D25 e «Ultimo aggiornamento» aggiornato; `deferred-work.md`: chiusa (barrata) la voce su `version`, estesa la voce sui nomi accessibili identici (`Disattiva`/`Riattiva`, fino a 23), annotata la sesta istanza del fuoco perso durante `pending`, annotato l'esito a epica chiusa sulla voce del questionario con `is_active = false`.
- **Task 5, metà agente** — `npm run typecheck` ✓; `npm run build` ✓; `npm test` **131/131**, numero fermo come previsto (nessuna migrazione); `list_migrations` risponde **dodici** righe col prefisso, `0012_reorder_guards` in fondo. Sonda di scrittura in transazione annullata: 23 righe restano, 1 non attiva in posizione 2, `updated_at` mosso dal trigger, **23 posizioni distinte** (nessuna rinumerazione), dopo il `rollback` 23/0 identico alla partenza. Sonda senza sessione: `PATCH /rest/v1/questions` con la sola chiave pubblicabile risponde `[]` — zero righe toccate, `questions_owner_all` regge; riconteggio post-sonda 23/0. Grep di perimetro: `.delete(` zero sotto `questionario/` (unico in `src/` resta `people-actions.ts:113`); `.from('questions')` **4**; `.update(` sotto `questionario/` **3**; `.rpc(` **3**; `question_blocks` 4, `questionnaires` 2; zero `answers`/`assessments` (solo commenti); nessuna scrittura su `position` (restano i due valori di nascita di 2.2/2.3, dichiarati); nessun esadecimale né `--sec-questionario`; tutti i file toccati sotto le 200 righe; `edit-question-form.tsx` non aperto.
- **Task 5, sessione** — resta a Luca, condizione per `done`: caselle lasciate vuote perché non verificate. Da guardare in particolare la resa di `.question--inactive` su un dato vero (prima volta) e i quattro pulsanti a 375px.
- AC2 e AC3 onorati senza dichiararli verificati: tabelle `answers`/`assessments` vuote, il filtro delle attive è della 3.1; nessuna scrittura di questa story può contraddirli (le risposte portano copie).

### File List

- `src/app/(app)/questionario/question-active-actions.ts` — nuovo
- `src/app/(app)/questionario/question-active-button.tsx` — nuovo
- `src/app/(app)/questionario/question-item.tsx` — modificato (import e montaggio del pulsante)
- `docs/database.md` — modificato (§3, esito su `version`, D25)
- `docs/00-contesto-e-decisioni.md` — modificato (voce D25, «Ultimo aggiornamento»)
- `docs/prd-v1.md` — modificato dalla revisione del 9 agosto 2026 (nota di supersessione sulla riga `versione` di §3, decisione di Luca: perimetro allargato di un file)
- `docs/bmad/implementazione/deferred-work.md` — modificato (una chiusura, tre annotazioni)
- `docs/bmad/implementazione/sprint-status.yaml` — modificato (stato della story)
- `docs/bmad/implementazione/2-6-disattivare-una-domanda-invece-di-cancellarla.md` — questo file

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 8 agosto 2026 | 0.1 | Story creata | Claude Fable 5, skill `bmad-create-story` |
| 8 agosto 2026 | 0.2 | Le tre domande chiuse da Luca: default confermati, nessun task cambiato | Claude Fable 5, skill `bmad-create-story` |
| 8 agosto 2026 | 0.3 | Implementazione completa: azione e pulsante Disattiva/Riattiva, D25 registrata, documenti aggiornati, verifica agente passata. Status a review; la sessione di Luca resta la condizione per done | Claude Fable 5, skill `bmad-dev-story` |
| 9 agosto 2026 | 0.4 | Revisione applicata: nessun difetto nel codice, cinque correzioni documentali, `prd-v1.md` marcato come superato da D25 (perimetro allargato di un file, decisione di Luca), tre voci rimandate a ledger. Status resta review: la sessione di Luca è ancora la condizione per done | Claude Opus 5, skill `bmad-code-review` |
