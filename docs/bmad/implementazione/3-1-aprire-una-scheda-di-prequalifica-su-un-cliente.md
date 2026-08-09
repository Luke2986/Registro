---
baseline_commit: 52f6f5c
---

# Story 3.1: Aprire una scheda di prequalifica su un cliente

Status: done

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 9 agosto 2026

> **Baseline.** La Story 2.6 è implementata e revisionata: `52f6f5c` su `main`. Tutti i conteggi di questo file (righe, test, grep, stato del database) sono presi da quel commit e dal progetto Supabase, verificati il 9 agosto 2026.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want aprire una scheda su un cliente indicando data e interlocutore,
so that comincio a scrivere entro dieci secondi dall'inizio della call.

## Acceptance Criteria

**AC1 — nessuno stato del cliente blocca l'apertura**
**Given** un cliente in qualsiasi stato, anche chiuso o perso
**When** apro una scheda nuova
**Then** l'apertura riesce, perché nessuno stato blocca nessuna azione (NFR8, FR15)

**AC2 — il totale si congela e le risposte nascono tutte, con le loro copie**
**Given** l'apertura di una scheda
**When** la scheda viene creata
**Then** `total_questions` viene scritto una volta sola col numero di domande attive in quel momento, e non verrà mai più aggiornato (FR16)
**And** vengono create tutte le righe di `answers`, una per domanda attiva, con `content` a `null`, ciascuna con la copia del testo della domanda, del titolo del blocco e della posizione (FR17)

**AC3 — data e interlocutore**
**Given** l'apertura di una scheda
**When** scelgo l'interlocutore
**Then** posso sceglierlo fra le persone di quel cliente, oppure lasciarlo vuoto
**And** la data proposta è oggi ed è modificabile

**AC4 — un cliente senza persone si apre lo stesso**
**Given** un cliente senza nessuna persona registrata
**When** apro una scheda
**Then** l'apertura riesce lo stesso, con interlocutore vuoto

> **Questa story è la prima scrittura su `assessments` e su `answers`.** Le due tabelle esistono dalla 0005 e sono **vuote**: nessuna riga è mai stata scritta, e nessun codice le ha mai lette né scritte (grep: zero occorrenze sotto `src/`, solo commenti). Tutto quello che l'Epic 2 ha rimandato «alla 3.1» arriva qui, e sono tre cose precise, tutte già scritte altrove: il filtro sulle domande attive (`questionario/page.tsx:25-27`), il conteggio delle attive come denominatore (`questionario/page.tsx:94-99`), e la copia di `1` in `assessments.questionnaire_version` (D25).

> **Questa story non compila niente.** Nessun campo di risposta, nessun salvataggio automatico, nessun indicatore, nessun verdetto, nessuna pagina di compilazione: sono le Story 3.2-3.6. Qui si crea la scheda, si vede che esiste, e si verifica che le due invarianti di AC2 siano vere nel database — che è dove un errore si scoprirebbe mesi dopo.

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0013: `open_assessment`, una transazione** (AC: 1, 2, 3, 4)
  - [x] File nuovo `supabase/migrations/0013_open_assessment.sql`. **La creazione vive nel database e non nel TypeScript, per la stessa ragione della 0011**: PostgREST non offre transazioni, e qui le scritture sono due — la riga di `assessments` e le N righe di `answers`. Due chiamate separate con la rete che cade in mezzo lasciano una scheda con `total_questions` a 23 e zero risposte, cioè una scheda **irreparabile**: `total_questions` non si aggiorna mai (FR16) e le copie del testo andrebbero ricostruite da un questionario che intanto può essere cambiato. Una funzione plpgsql è una transazione: o la scheda nasce intera, o non nasce.
  - [x] Dichiarazione D24 in testa, tre chiavi nell'ordine di `database.md` §7, **senza `cascade`**:
    ```sql
    -- 0013 apertura di una scheda di prequalifica
    -- Reversibile: sì.
    -- Come si annulla: drop function open_assessment(uuid, date, uuid);
    -- Cosa si perde: niente di dati: le schede già aperte e le loro risposte restano.
    --   Sparisce l'apertura di una scheda dall'interfaccia: si annulla insieme al codice
    --   che la chiama (kb-0.md §10).
    ```
  - [x] Firma: `open_assessment(p_client_id uuid, p_call_date date, p_interviewee_id uuid) returns uuid`. `language plpgsql`, `security invoker`, `set search_path = ''`, nomi qualificati — identica alla 0011, e per lo stesso motivo: le policy della 0007 filtrano dentro la funzione come in una query diretta, quindi un `id` altrui indovinato non trova niente.
  - [x] Corpo, nell'ordine:
    1. `v_owner := (select auth.uid())` — serve perché `owner_id` è `not null` senza default su tutte e due le tabelle, ed è la stessa condizione che le policy verificano in `with check`.
    2. Cliente visibile? `if not exists (select 1 from public.clients c where c.id = p_client_id) then return null; end if.` Non è ridondante con la policy: distingue «non mio o sparito» da un successo, e con la RLS i due casi arrivano identici.
    3. Interlocutore: se `p_interviewee_id is not null` e non esiste una `people` con quell'`id` **e** `client_id = p_client_id`, `return null`. È correttezza, non sicurezza (lo stesso `.eq('client_id', id)` di `[id]/page.tsx:90-93`): il selettore offre solo le persone di quel cliente, e una scheda che dichiara come interlocutore la persona di un altro cliente è un dato falso che nessuna schermata potrebbe più smentire.
    4. Questionario attivo: `select q.id, q.version into v_questionnaire_id, v_version from public.questionnaires q where q.is_active order by q.created_at, q.id limit 1`. **La terna dev'essere la stessa di `questionario/page.tsx:67-69`**, e il motivo va scritto nel file: se le due scelgono un questionario diverso, la scheda congela le domande di uno e la schermata del questionario mostra l'altro, e nessun errore lo dice. `if v_questionnaire_id is null then return null; end if.`
    5. `v_total`: `count(*)` delle `questions` con `is_active` vere, risalendo a `question_blocks.questionnaire_id = v_questionnaire_id`. `if v_total = 0 then return null; end if` — v. domanda 2.
    6. `insert into public.assessments (owner_id, client_id, questionnaire_id, questionnaire_version, call_date, interviewee_id, total_questions) values (…, coalesce(p_call_date, current_date), …) returning id into v_assessment_id`. **Sette colonne e basta**: `verdict` (`non_deciso`), `completion_status` (`bozza`), `id`, `created_at`, `updated_at` hanno i loro default e il loro trigger — scriverli vorrebbe dire tenere due posti allineati a mano, come il commento di `question-actions.ts:125`.
    7. `insert into public.answers (owner_id, assessment_id, question_id, question_text, block_title, position) select …` dalle sole domande attive di quel questionario, con `qq.text`, `b.title`, `qq.position`. **Nessun `content`**: il default è `null`, ed è quello che AC2 chiede. Nessun `order by`: l'ordine di una scheda lo porta `position`, non l'ordine d'inserimento, e tutte le righe nascono nella stessa transazione, quindi con lo stesso `created_at`.
    8. `return v_assessment_id`.
  - [x] **`position` si copia verbatim, buchi compresi.** Una domanda disattivata conserva la sua posizione (decisione 3 della Story 2.6), quindi le posizioni delle sole attive possono essere `1, 2, 4, …`. Non è un difetto e non si «chiude»: `answers.position` serve a **ordinare** la scheda, il conteggio è `total_questions`. Rinumerare qui produrrebbe una scheda i cui numeri non corrispondono più a nessuna domanda del questionario.
  - [x] **`questionnaire_version` copia la colonna, non un letterale `1`.** Oggi vale 1 e nessuna scrittura la muove (D25), ma copiare la colonna è vero anche il giorno che qualcuno la muovesse; un `1` scritto a mano sarebbe una bugia con la data di scadenza.
  - [x] `revoke execute on function open_assessment(uuid, date, uuid) from public, anon;` e `grant … to authenticated;`, con la stessa motivazione già scritta in fondo alla 0011 (un rifiuto esplicito `42501` è leggibile, un no-op silenzioso no).
  - [x] Applicare con `apply_migration` passando il nome **con il prefisso** (`0013_open_assessment`), poi verificare con `list_migrations` che le righe siano **tredici** e tutte col prefisso (`database.md` §7). Se un nome entra spoglio, allineare il registro con l'`update` documentato e dichiararlo nel Dev Agent Record.
  - [x] Nessuna altra modifica di schema: nessuna colonna, nessun vincolo, nessun indice. `answers_assessment_question_idx` (0005) è già la garanzia di database che AC2 chiede — una risposta per domanda, mai due.

- [x] **Task 2 — Le due funzioni pure di data, con i loro test** (AC: 3)
  - [x] `src/lib/format-date.ts`: si aggiunge **`todayIsoDate(now: Date = new Date()): string`**, che risponde `AAAA-MM-GG` **nel fuso dichiarato**. Sta qui e non altrove perché questo file possiede `TIME_ZONE`, e la costante non si esporta per non farla comparire in due posti. Si costruisce con `absoluteFormat.formatToParts` come già fa `civilDay`, non con un secondo `Intl.DateTimeFormat`: due formattatori con le stesse opzioni sono due `resolvedOptions()` destinate a divergere (kb-0.md §9, e il commento è già scritto in testa al file).
  - [x] Perché serve: la data proposta è «oggi», e oggi a Roma non è oggi in UTC. Il valore predefinito del campo si calcola **sul server** e arriva al modulo come prop: calcolarlo nel browser darebbe due valori diversi a server e client, e l'idratazione se ne lamenterebbe (è la ragione già scritta per `formatClockTime`). Su Vercel il fuso è UTC (D23): senza questa funzione, una scheda aperta alle 00:30 nascerebbe con la data di ieri.
  - [x] `src/lib/format-date.test.ts`: almeno il caso che dimostra il fuso — un istante come `2026-08-09T22:30:00Z` deve rispondere `2026-08-10`, perché a Roma è già il giorno dopo. I test girano con `TZ=UTC`, quindi un `timeZone` dimenticato fallisce qui invece che in produzione.
  - [x] `src/lib/call-date.ts` **nuovo**, file puro senza React e senza Supabase: `validateCallDate(value: unknown, today: string)` che risponde `{ ok: true; date: string } | { ok: false; message: string }`. Regole: valore assente o stringa vuota → **`today`**, non un errore (chi svuota il campo non ha sbagliato niente, e la colonna ha comunque un default); stringa nella forma `^\d{4}-\d{2}-\d{2}$` che corrisponde a un giorno reale del calendario → si accetta; qualsiasi altra cosa → `CALL_DATE_INVALID` = `'La data della call non è valida.'`. Il controllo del giorno reale si fa con `new Date(`${value}T00:00:00Z`)` e confronto del round-trip su `toISOString().slice(0, 10)`: `2026-02-31` diventa `2026-03-03` e si rifiuta. **`Z` e non l'ora locale**, altrimenti il round-trip dipende dal fuso della macchina — che è esattamente la classe di difetto che D23 esiste per fermare.
  - [x] **Nessun limite di data**: né passato né futuro. Una call di domani si prepara oggi, una di tre mesi fa si registra adesso, e il software non decide (D14). L'unica cosa che si rifiuta è una stringa che non è una data.
  - [x] `src/lib/call-date.test.ts` **nuovo**: forma valida, vuoto → oggi, `null`/numero/oggetto → messaggio, `2026-02-31` → messaggio, `2026-2-3` → messaggio (la forma corta non è quella che manda `<input type="date">`), anno bisestile `2028-02-29` → valido. È esattamente la logica che «rompendosi produce dati sbagliati» (kb-0.md §7): una data sbagliata dentro una scheda non produce nessun errore, produce un archivio che mente.

- [x] **Task 3 — L'azione: `openAssessment`** (AC: 1, 2, 3, 4)
  - [x] File nuovo `src/app/(app)/clienti/assessment-actions.ts`, con `'use server'` in testa e **una azione**. Sorella di `people-actions.ts` e `person-edit-actions.ts`, non dentro `actions.ts` (177 righe): le schede sono un'altra entità, e la regola «un file d'azione porta una azione» è già dichiarata in `question-update-actions.ts`.
  - [x] Costanti, una copia per file: `ASSESSMENT_NOT_OPENED = 'La scheda non è stata aperta. Riprova fra un momento.'` e `ASSESSMENT_PRECONDITION = 'La scheda non è stata aperta: il questionario o il cliente non sono più disponibili. Ricarica la pagina.'`
  - [x] Corpo: `openSession('openAssessment')`; `client_id` e — se presente e non vuoto — `interviewee_id` verificati con `isUuid` (un `interviewee_id` presente ma non uuid è una richiesta forgiata: log e `ASSESSMENT_NOT_OPENED`, mai un `as`); `call_date` da `validateCallDate(formData.get('call_date'), todayIsoDate())`, e se non va, il suo messaggio.
  - [x] Una sola chiamata: `session.supabase.rpc('open_assessment', { p_client_id, p_call_date, p_interviewee_id })`. Nessuna pre-lettura del questionario: la duplicherebbe fra TypeScript e SQL, e le due divergerebbero alla prima modifica.
  - [x] Tre rami, la forma di `moveBlock` e di `setQuestionActive`: `error` → log di **soli `code` e `message`** (mai `details`: la riga contiene il testo delle domande, cioè testo scritto da una persona — kb-0.md §3) e `ASSESSMENT_NOT_OPENED`; `data` nullo → `ASSESSMENT_PRECONDITION`; successo → rivalidazione e `return {}`.
  - [x] **Due `revalidatePath`, e il secondo non è un di più**: `revalidatePath(`/clienti/${clientId}`)` per far comparire la scheda nella card, e **`revalidatePath('/clienti')`** perché dalla Story 1.6 l'ordine dell'elenco dipende anche da `assessments.updated_at` (`last-activity.ts`, `database.md` §5). È la voce a ledger della revisione 1.6 — «il giorno in cui una scrittura tocca una scheda, quella scrittura deve rivalidare anche l'elenco» — e questa è la prima scrittura di quel giorno: senza, si apre una scheda e il cliente resta dov'era nell'elenco.
  - [x] Tipo di ritorno `OpenAssessmentState = { error?: string }`. **Nessun `redirect`**: la scheda compare nella card, e la pagina di compilazione non esiste ancora (v. domanda 1). Un `redirect` verso una rotta inesistente sarebbe un 404 al termine di un'azione riuscita.
  - [x] Il file sta in ~90 righe.

- [x] **Task 4 — La card delle schede e il modulo di apertura** (AC: 1, 2, 3, 4)
  - [x] `src/app/(app)/clienti/[id]/page.tsx`: una lettura in più, dopo quella delle persone —
    `.from('assessments').select('id, call_date, interviewee_id').eq('client_id', id).order('call_date', { ascending: false }).order('created_at', { ascending: false }).order('id')`. `.eq('client_id', id)` è correttezza e non sicurezza, come per le persone. I criteri dopo `call_date` non sono decorativi: `call_date` è una **data** e due schede dello stesso giorno pareggerebbero, e `created_at` da solo non è unico per costruzione — `id` chiude, arbitrario ma stabile (è la stessa argomentazione di `questionario/page.tsx:42-54`). Un errore qui **non** fa cadere la pagina: si logga `code` e `message`, `assessments` resta `null`, e la card va in errore da sola come già fa quella delle persone.
  - [x] `src/app/(app)/clienti/[id]/assessments-card.tsx` **nuovo**, `'use client'`, `AssessmentsCard`. Props: `{ clientId, assessments: AssessmentSummary[] | null, people: PersonDetail[] | null, today: string }`. È la forma di `PeopleCard` riga per riga, ritorno di fuoco sul titolo compreso, con la stessa motivazione già scritta lì (i due pulsanti — intestazione e stato vuoto — non sono mai montati insieme).
  - [x] I quattro stati (NFR9, UX-DR11): `assessments === null` → `ErrorState` con `retryHref={`/clienti/${clientId}`}`; elenco vuoto e modulo chiuso → `«Nessuna scheda ancora.»` più il pulsante che la crea; elenco pieno → le righe; lo scheletro sta in `loading.tsx` (Task 5). Badge numerico `.badge data` solo con almeno una scheda, come le persone (UX-DR6).
  - [x] La riga di una scheda: **data in monospaziato** (`.data`, UX-DR12) e nome dell'interlocutore, risolto **in memoria** dall'elenco `people` già letto dalla pagina — nessuna seconda query e nessun innesto — con `personDisplayName` da `@/lib/person-fields`, che esiste già. Interlocutore assente o non risolvibile: la riga porta la sola data, mai un trattino e mai «nessuno» (un valore non rilevato si mostra vuoto, D13). **Niente collegamento** (v. domanda 1), **nessuna pillola di verdetto** (Story 3.5 e 4.2), **nessun contatore e nessuna barra** (Story 4.1), **nessuno stato di compilazione**: oggi vale `bozza` per tutte e un dato che non varia non informa — è lo stesso ragionamento del conteggio assente in `questionario/page.tsx:94-99`.
  - [x] La data si rende con `formatLastActivity`? **No.** Quella funzione legge un istante e dice «3 giorni fa»; `call_date` è un giorno civile già scritto come `AAAA-MM-GG` e va reso come giorno, non come distanza. Si rende con una formattazione assoluta `gg/mm/aaaa` — e siccome la stringa non porta nessun fuso, si compone dalle sue tre parti senza passare da `new Date`, che la interpreterebbe in UTC e potrebbe togliere un giorno. Se serve una funzione, sta in `format-date.ts` accanto alle altre e ha il suo test.
  - [x] `src/app/(app)/clienti/[id]/new-assessment-form.tsx` **nuovo**, `'use client'`, `NewAssessmentForm`. Props: `{ clientId, people, today, onOpened, onCancel }`. Struttura di `NewPersonForm`: `useWrite` con il suo `UNREACHABLE`, `onSubmit` che legge `event.currentTarget` **prima** di ogni `await`, `formData.set('client_id', clientId)`, `element.reset()` solo dopo il successo, campi disabilitati durante `pending`.
  - [x] Due campi soltanto:
    - **Data** — `<input type="date" name="call_date" className="input">` con `defaultValue={today}` e la sua `<label className="label">` vera, mai un solo segnaposto (UX-DR14). `type="date"` e non un campo di testo: sul tablet apre il selettore di sistema, e le call si fanno fuori casa (NFR4).
    - **Interlocutore** — `<select name="interviewee_id" className="input">` con una prima opzione di valore `''` etichettata `Nessuno`, poi una per persona con `personDisplayName`. **Se il cliente non ha nessuna persona il selettore non si rende affatto**, e al suo posto va una riga `.meta`: `«Nessuna persona registrata: la scheda si apre senza interlocutore.»` Un selettore con una sola opzione è un controllo che finge di far scegliere. È AC4 reso visibile.
  - [x] Le etichette nominano le cose come le riconosce chi le usa (UX-DR13): `Data della call`, `Interlocutore`. Il pulsante dice cosa succede premendolo: **`Apri scheda`**, `btn btn--primary` perché dentro il modulo è l'unica azione, accanto ad `Annulla` `btn btn--secondary`. Il pulsante che scopre il modulo si chiama **`Nuova scheda`**, `btn btn--secondary` come `Aggiungi persona`: l'azione primaria della schermata resta il `Salva` dei campi (design-system.md §5).
  - [x] L'errore di `useWrite` è la solita `<p className="field__error" role="alert">`, dentro il modulo, prima dei pulsanti.
  - [x] `page.tsx` monta `<AssessmentsCard … today={todayIsoDate()} />` **dopo** `<PeopleCard>`: le persone si registrano prima della call, le schede dopo, e l'ordine della pagina è quello del lavoro.
  - [x] **Nessun CSS nuovo, e se serve si dichiara.** `.card`, `.card__header`, `.card__title`, `.badge`, `.empty`, `.field`, `.label`, `.input`, `.form__actions`, `.field__error`, `.meta`, `.data` esistono tutte. L'elenco delle schede riusa la forma di `.people` se combacia; se a schermo emerge un bisogno reale (verifica a 375px, Task 7), si dichiara nel Dev Agent Record invece di anticiparlo.

- [x] **Task 5 — Lo scheletro** (AC: nessuna, NFR9)
  - [x] `src/app/(app)/clienti/[id]/loading.tsx`: una terza card con il solo titolo, esattamente come quella delle persone (`:66-70`), con la stessa motivazione già scritta lì — si riserva lo spazio di quello che c'è **sempre**, non di quello che dipende dai dati. Il badge e `Nuova scheda` compaiono solo con almeno una scheda, e le righe nemmeno: riservarli farebbe saltare la pagina su ogni cliente che non ne ha, cioè spostare il salto invece di toglierlo.

- [x] **Task 6 — I documenti**
  - [x] `docs/database.md` §7, l'elenco dei file di migrazione: si aggiunge `0013_open_assessment.sql -- l'apertura di una scheda, in transazione`.
  - [x] `docs/database.md` §3, tabella `assessments`: il paragrafo su `total_questions` dice già che si scrive una volta sola; si aggiunge **dove si cerca** chi lo scrive — la funzione della 0013 — con la ragione per cui la scrittura sta nel database e non nel codice (nessuna transazione in PostgREST, stessa riga della 0011). Una frase, non un secondo racconto: la duplicazione fra documenti è il difetto che la revisione della 2.6 ha già corretto una volta.
  - [x] `docs/bmad/implementazione/deferred-work.md`, annotazioni su voci esistenti, **nessuna voce nuova salvo quelle che questa story apre davvero**:
    - la voce della revisione 1.6 su **`revalidatePath('/clienti')` mancante quando cambia una scheda** si chiude ~~barrata~~: la prima scrittura su `assessments` esiste e rivalida anche l'elenco (Task 3).
    - la voce della revisione 1.6 su **innesto e clienti senza `.limit()`** si annota: le schede adesso esistono, quindi il caso che non era verificabile su una tabella vuota diventa verificabile. Il rimando resta, il punto di ripresa no: da oggi si può misurare.
    - la voce della revisione 1.5/1.1 su **lo stato d'errore senza modo di creare** si estende con la card delle schede, che ha la stessa forma.
    - se la verifica a 375px o quella da tastiera facessero emergere un caso nuovo, entra qui e non si corregge dentro questa story.

- [x] **Task 7 — La verifica** (AC: 1, 2, 3, 4)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa — il file `'use server'` nuovo esporta solo funzioni asincrone.
  - [x] `npm test` passa e il totale **cresce**: 131 oggi, **+4** dai controlli che `migrations.test.ts` esegue su ogni file (le tre chiavi, nessuna vuota, sì/no, niente `cascade`), più i casi di `call-date.test.ts` e quelli nuovi di `format-date.test.ts`. Il numero esatto lo scrive il Dev Agent Record. **Se resta 131, la migrazione non c'è.**
  - [x] `list_migrations` risponde **tredici** righe, tutte col prefisso, `0013_open_assessment` in fondo.
  - [x] **La prova di AC2, in una transazione che si annulla** (`begin; … rollback;` in una sola chiamata `execute_sql`, come le sonde della 2.5 e della 2.6 — eseguita come proprietario esercita la *meccanica*, non le policy): si disattiva una domanda, si chiama `open_assessment` su un cliente vero, e si verifica che **`total_questions` valga 22 e non 23**, che le righe di `answers` siano **22**, che **tutte** abbiano `content` nullo, che `question_text` e `block_title` corrispondano riga per riga a `questions.text` e `question_blocks.title`, che le `position` siano quelle delle domande copiate **con il buco** dove stava la disattivata, e che `questionnaire_version` valga 1. Dopo il `rollback`, riconteggio identico alla partenza: 0 schede, 0 risposte, 23 domande attive.
  - [x] **La prova che il totale non si muove**: dentro la stessa transazione, dopo l'apertura si riattiva la domanda e si rilegge `total_questions` — resta 22. È FR16 in forma verificabile.
  - [x] **La sonda senza sessione** (pattern consolidato): `POST …/rest/v1/rpc/open_assessment` con la sola chiave pubblicabile risponde **`42501`** (execute negato ad `anon`), non un no-op silenzioso. E `GET …/rest/v1/assessments` con la stessa chiave risponde `[]`.
  - [x] Il grep del perimetro: `.from('assessments')` passa da **zero a uno** (la lettura della pagina); `.from('answers')` resta **zero** in TypeScript — le risposte le scrive solo la funzione; `.rpc(` passa da **tre a quattro**; nessun `.delete(` nuovo; nessuna scrittura su `total_questions` né su `position` in TypeScript.
  - [x] Tutti i file toccati sotto le 200 righe. `[id]/page.tsx` cresce di ~20 righe: se superasse il limite si dichiara e si divide, non si sfora in silenzio.
  - [x] Sotto `clienti/` nessun esadecimale e nessun `--sec-prequalifica` (UX-DR2: il colore di sezione della prequalifica non entra nel contenuto della sezione clienti).
  - [x] I file toccati sono quelli di «Cosa cambia questa story», più le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`) e **quattro file sorgente fuori da quell'elenco, ognuno con la sua dichiarazione**: `globals.css` e `client-card.tsx` (scostamenti 3 e 2), `database.types.ts` (rigenerato, come la riga «Non si aprono» prevedeva) e `src/lib/types.ts`, che porta `AssessmentRow` e `AssessmentSummary` — la spec li nomina senza dire dove vivono, e vivono lì come tutti gli altri tipi di riga. In più `supabase/migrations/0014_open_assessment_total.sql`, dalla revisione. Tutti nel File List. *La riga diceva «e nessun altro» ed era falsa: corretta nella revisione del 9 agosto 2026, che è la sola ragione per cui questa casella può restare spuntata.*

  Richiede una sessione, la fa Luca — è la condizione per `done`. **Avvertenza: questa verifica scrive dati veri e permanenti.** Una scheda aperta non si cancella dall'interfaccia (niente si cancella davvero, masterplan §5), quindi conviene aprirla su un cliente di prova, oppure accettare che resti: sarà la prima scheda vera dell'archivio.
  - [x] Apro un cliente **chiuso o perso**: `Nuova scheda` c'è e funziona (AC1). Nessuno stato la nasconde e nessun avviso mi ferma.
  - [x] `Nuova scheda` scopre il modulo: la data proposta è **oggi** ed è modificabile; il selettore offre le persone di **quel** cliente e `Nessuno` (AC3).
  - [x] Apro con l'interlocutore vuoto: riesce, e la riga porta la sola data.
  - [x] Apro su un cliente **senza nessuna persona**: il selettore non c'è, al suo posto la riga che lo dice, e l'apertura riesce (AC4).
  - [x] Cambio la data a ieri e apro: la riga porta ieri, non oggi.
  - [x] Svuoto il campo data e apro: riesce, con oggi.
  - [x] Torno su `/clienti`: il cliente su cui ho appena aperto una scheda è **in cima** all'elenco (la rivalidazione dell'elenco, Task 3).
  - [x] Ricarico la scheda cliente: le schede sono ancora lì, nell'ordine per data decrescente.
  - [x] Da tastiera: Tab raggiunge `Nuova scheda`, Invio apre il modulo, il fuoco entra nel modulo, Invio sul pulsante apre la scheda, e alla chiusura il fuoco torna sul titolo della card.
  - [x] Larghezza 375px: il modulo con i suoi due campi e i due pulsanti non trabocca e non fa scorrere la pagina di lato; i bersagli restano da 44px (NFR4, UX-DR14).
  - [x] Nessun errore in console, nessun avviso di idratazione — **in particolare sulla data**: se il valore predefinito comparisse diverso fra server e browser, è lì che si vede.
  - [x] **Il rifiuto, non solo il successo** (aggiunta dalla revisione): disattivo tutte le domande dal questionario, torno su un cliente e premo `Apri scheda`. Deve comparire il messaggio di precondizione, che adesso nomina anche il questionario — **non** un modulo che si azzera e si chiude come se avesse funzionato. Poi riattivo una domanda. È l'unico ramo dell'azione che nessuna sonda esercita attraverso PostgREST: `if (data === null)` è ciò che separa un rifiuto da un finto successo, e finora era stato provato solo dentro il database.

### Review Findings

Revisione del 9 agosto 2026 (skill `bmad-code-review`): tre layer in parallelo — adversarial generico, cacciatore di edge case, auditor dei criteri di accettazione — ognuno senza il contesto degli altri, e ogni finding riletto sul codice vero prima di assegnargli la gravità. Sedici finding unici dopo la deduplicazione, uno scartato come rumore.

**Le quattro AC reggono.** Le due invarianti di AC2 sono state riprovate dal vivo su `open_assessment`, in una transazione che non può committare: con una domanda disattivata `total_questions` vale 22 e non 23, le righe di `answers` sono 22 e hanno tutte `content` nullo, `question_text`/`block_title`/`position` corrispondono riga per riga alla domanda viva, le posizioni portano il buco, `questionnaire_version` è copiato dalla colonna. La terna di scelta del questionario combacia davvero con `questionario/page.tsx`. Le due `revalidatePath` ci sono, nessun `redirect`, il log porta solo `code` e `message`, il selettore non si rende senza persone, nessuna pillola e nessun contatore, la dichiarazione D24 è nelle tre chiavi esatte e senza `cascade`, tutti i file sotto le 200 righe, 150 test verdi. **Nessun layer ha trovato un difetto che rompa un criterio di accettazione.**

Quello che resta è una corsa nel database, quattro scelte da confermare, e del lavoro documentale.

- [x] **[Review][Decision] `total_questions` si conta in un'istruzione e le risposte si scrivono in un'altra: la transazione non protegge il numero** [supabase/migrations/0013_open_assessment.sql:84-88 contro :121-127] — trovato indipendentemente da due layer. Una funzione plpgsql gira nella transazione del chiamante, che è in *read committed*: ogni istruzione al suo interno prende uno snapshot nuovo, quindi il `count(*)` e l'`insert … select` possono vedere due insiemi diversi di `questions`. Se `/questionario` è aperta in una seconda scheda e qualcuno preme `Disattiva` fra le due — pulsante che esiste dalla 2.6 — la scheda nasce con `total_questions` a 23 e **22** righe di risposte; nella direzione opposta 23 con 24 righe. È letteralmente lo stato che l'intestazione del file dichiara di esistere per impedire: la transazione chiude il buco della rete che cade, non questo. Il danno è permanente perché `total_questions` non si aggiorna mai (FR16) e nessuna schermata cancella una scheda: l'avanzamento della 4.1 leggerà `22 / 23` per sempre. Il lock consultivo della 0012 **non** basterebbe, perché `setQuestionActive` è un update PostgREST diretto e non lo prende; la strada è ricavare il totale da quello che è stato scritto davvero (`get diagnostics … row_count` e valorizzazione nella stessa transazione). La decisione è di perimetro, non di tecnica: la 0013 è già applicata e non si modifica in luogo, quindi correggere vuol dire una migrazione **0014** dentro una story che dichiara «nessuna altra modifica di schema». **Risolta da Luca il 9 agosto 2026: si fa la 0014 adesso**, e nella stessa `create or replace` si chiude anche il `coalesce(p_call_date, current_date)` che risolveva «oggi» in UTC. Il perimetro della story cresce di un file di migrazione, dichiarato qui e nel File List.
- [x] **[Review][Decision] `ASSESSMENT_PRECONDITION` prescrive un'azione che in un caso su quattro non può funzionare** [src/app/(app)/clienti/assessment-actions.ts:30-31, :89] — trovato da due layer. La funzione risponde `null` per quattro cause distinte (cliente sparito o non mio, interlocutore di un altro cliente, nessun questionario attivo, nessuna domanda attiva) e l'azione le collassa in una frase sola che dice «**Ricarica la pagina**». Disattivate tutte le domande da `/questionario` — percorso che l'interfaccia offre — il messaggio compare e ricomparirà a ogni ricarica, per sempre: lo stato è persistente e il rimedio offerto è transitorio, mentre `kb-0.md` §6 chiede che l'errore dica cosa è successo **e cosa fare**. Nel caso dell'interlocutore la frase nomina anche la cosa sbagliata, perché parla di questionario e cliente. Le strade sono tre: riscrivere il messaggio in TypeScript perché copra anche il questionario (nessuna migrazione), distinguere le cause nella funzione (migrazione 0014, si chiude insieme alla voce sopra), o accettarlo com'è. **Risolta da Luca il 9 agosto 2026: si riscrive il testo**, solo TypeScript e nessuna migrazione. Il messaggio resta uno per quattro cause, ma smette di indicare un rimedio che in un caso non funziona.
- [x] **[Review][Decision] `people === null` diventa «nessuna persona» nel modulo e «nessun interlocutore» nelle righe** [src/app/(app)/clienti/[id]/new-assessment-form.tsx:79, :101 e src/app/(app)/clienti/[id]/assessments-card.tsx:48, :103] — trovato da tutti e tre i layer. Nel modulo le due condizioni chiedono entrambe `people !== null`, quindi con la lettura delle persone fallita non compare né il selettore né la riga che ne spiega l'assenza: chi apre una scheda in quel momento registra «nessun interlocutore» per sempre — nessuna story prima della 3.6 rimette in gioco `interviewee_id`, e niente si cancella (masterplan §5) — per un guasto transitorio di una query *sorella*, senza che il modulo dica niente. Nelle righe, `new Map((people ?? []) …)` collassa «lettura fallita» in «elenco vuoto», e ogni scheda che *ha* un interlocutore si rende senza: il commento giustifica il vuoto con D13 («un valore non rilevato si mostra vuoto»), ma qui il valore è stato rilevato e non si è caricato, che è il caso opposto. Le Completion Notes dichiarano la scelta e la motivano («la card sopra sta già dicendo che le persone non si sono caricate»): la decisione è se quella motivazione regge, visto che le due card sono separate e la conseguenza nel modulo è permanente. **Risolta da Luca il 9 agosto 2026: si correggono tutti e due i punti** — il terzo ramo nel modulo con la sua riga, e nelle righe della card la distinzione fra «non caricato» e «nessun interlocutore».
- [x] **[Review][Decision] `validateCallDate` scioglie una contraddizione interna del Task 2 scegliendo, dove la regola del progetto è chiedere** [src/lib/call-date.ts:24] — il Task 2 dice «valore assente o stringa vuota → `today`, non un errore» nella prosa e «`null` → messaggio» nell'elenco dei casi. Le Completion Notes dichiarano lo scostamento e la motivazione è solida (`formData.get` risponde `null` solo se la chiave manca, e il modulo rende sempre il campo, quindi `null` è una richiesta che non doveva esistere). Nessuna AC ne soffre. Ma questa story ha una sezione «Domande per Luca» e tre domande chiuse prima di implementare: la quarta non è stata posta, e `AGENTS.md` dice di chiedere invece di inventare. Serve solo una conferma. **Risolta da Luca il 9 agosto 2026: il rifiuto è confermato**, il codice resta com'è. `undefined` e stringa vuota continuano a valere `today`.

- [x] **[Review][Patch] La 0014: il totale si ricava dalle righe scritte, e «oggi» smette di essere UTC** [supabase/migrations/0014_open_assessment_total.sql] — dalla decisione 1. `create or replace function open_assessment` con due sole differenze rispetto alla 0013: `total_questions` non viene più dal `count(*)` letto prima, ma dalle righe che l'`insert into answers` ha scritto davvero, e il ripiego della data smette di essere `current_date`. Il `count(*)` resta dove sta, perché serve alla precondizione «nessuna domanda attiva» che rifiuta l'apertura. La dichiarazione D24 in testa come tutte le altre, e `list_migrations` deve rispondere **quattordici** righe col prefisso.
- [x] **[Review][Patch] Il messaggio di precondizione nomina anche il questionario** [src/app/(app)/clienti/assessment-actions.ts:30-31] — dalla decisione 2.
- [x] **[Review][Patch] Il terzo ramo di `people === null`, nel modulo e nelle righe** [src/app/(app)/clienti/[id]/new-assessment-form.tsx:79, :101 e assessments-card.tsx:48, :103] — dalla decisione 3.
- [x] **[Review][Patch] `validateCallDate` accetta l'anno `0000`, che Postgres rifiuta: il messaggio che ne esce è quello sbagliato** [src/lib/call-date.ts:23-31] — `^\d{4}-\d{2}-\d{2}$` accetta `0000-01-01`, JavaScript ha un anno zero e il round-trip torna identico, quindi il validatore dice `ok`. Postgres no: `'0000-01-01'::date` risponde `22008`. L'azione cade nel ramo `error` e risponde «Riprova fra un momento», cioè invita a ripetere una cosa che non riuscirà mai, dal modulo il cui compito dichiarato è «l'unica cosa che si rifiuta è una stringa che non è una data». Gli altri estremi sono chiusi bene (`12026-01-01`, `2026-08-9`, spazi, `2026-02-31` rifiutati; `0001-01-01`, `9999-12-31` e `2028-02-29` accettati). Una riga e il suo test, in una funzione pura.
- [x] **[Review][Patch] La casella di perimetro del Task 7 è spuntata e afferma il falso** [docs/bmad/implementazione/3-1-aprire-una-scheda-di-prequalifica-su-un-cliente.md:138] — la casella dice «i file toccati sono quelli di *Cosa cambia questa story* e nessun altro, a parte le scritture di metodo». Quattro file sorgente fuori da quell'elenco sono stati toccati: `globals.css` e `client-card.tsx` (scostamenti 2 e 3, dichiarati), `database.types.ts` (pre-autorizzato dalla riga «Non si aprono» *se dichiarato*, e dichiarato) e **`src/lib/types.ts`, che non lo è**: compare solo nel File List, la spec nomina `AssessmentSummary` senza dire dove vive, e non è una scrittura di metodo. La sostanza è dichiarata ovunque; la casella, come è scritta, no — e in questo progetto le caselle non si spuntano se non sono vere.
- [x] **[Review][Patch] `database.md` §3: «una frase» sono tre, e due ripetono materiale già scritto altrove** [docs/database.md:197] — il Task 6 chiedeva «una frase, non un secondo racconto: la duplicazione fra documenti è il difetto che la revisione della 2.6 ha già corretto una volta». Il capoverso ne ha tre: la seconda ripete la motivazione già in testa a `0013_open_assessment.sql`, la terza ripete D25 e la regola delle posizioni coi buchi, già in D25 e nella decisione 2 di questa story.
- [x] **[Review][Patch] `ClientDetail` è esportato e non lo importa nessuno** [src/app/(app)/clienti/[id]/client-card.tsx:16] — `grep -rn ClientDetail src/` risponde solo con le tre occorrenze dentro quel file. La garanzia descritta nel commento — un campo che entra in `CLIENT_FIELDS` senza entrare in `COLUMNS` ferma il controllo dei tipi — la dà da sola l'annotazione sulla prop; l'`export` aggiunge superficie pubblica che nessuno consuma (`kb-0.md` §2).
- [x] **[Review][Patch] Nessuna verifica esercita il ramo di rifiuto attraverso PostgREST** [src/app/(app)/clienti/assessment-actions.ts:89, Task 7] — le sonde del Dev Agent Record esercitano i quattro `return null` con `execute_sql`, cioè *dentro* il database; le undici caselle della sessione sono tutte di percorso felice. `if (data === null)` è l'unica cosa che separa un rifiuto da un **finto successo** — se lo scalare NULL non arrivasse come `null`, il modulo si azzererebbe e si chiuderebbe su un'apertura che non è avvenuta — e non è mai stato eseguito sul trasporto vero. Una casella in più nel Task 7: spegnere tutte le domande, tentare l'apertura, aspettarsi il messaggio a schermo.

- [x] ~~**[Review][Defer] `coalesce(p_call_date, current_date)` risolve «oggi» in UTC, non nel fuso dichiarato**~~ [supabase/migrations/0013_open_assessment.sql:106] — **non più rimandato**: sale nella 0014 insieme alla decisione 1, perché è lo stesso file e la stessa `create or replace`. Rimandarlo avrebbe voluto dire riaprire la funzione due volte.
- [x] **[Review][Defer] La prop `today` invecchia a cavallo della mezzanotte, e il modulo registra ieri** [src/app/(app)/clienti/[id]/page.tsx:132] — rimandato. Vedi `deferred-work.md`.
- [x] **[Review][Defer] Una `position` duplicata verrebbe congelata per sempre dentro `answers.position`** [supabase/migrations/0013_open_assessment.sql:121-127] — rimandato, a valle di una corsa pre-esistente. Vedi `deferred-work.md`.
- [x] **[Review][Defer] La macchina dei quattro stati col ritorno di fuoco è ora scritta tre volte** [src/app/(app)/clienti/[id]/assessments-card.tsx:39-95] — rimandato, prescritto dalla spec. Vedi `deferred-work.md`.
- [x] **[Review][Defer] La riga di registro della prima applicazione è stata cancellata, non aggiornata** [supabase/migrations/0013_open_assessment.sql] — rimandato, già a ledger. Vedi `deferred-work.md`.
- [x] **[Review][Defer] `globals.css` è stato aperto su un giudizio di progetto, non sul bisogno che il perimetro autorizzava** [src/app/globals.css:773-795] — rimandato alla verifica a 375px della sessione. Vedi `deferred-work.md`.

**Scartato come rumore (1).** La radice del modulo che apre una *scheda* porta `className="person"` mentre lo scostamento 3 argomenta che riusare `.people`/`.person` per le schede sarebbe «un nome che mente». L'osservazione è esatta e l'incoerenza è solo nell'argomentazione: `.person` è la colonna di gruppi di campi che `NewPersonForm` usa allo stesso modo, e l'unica correzione sarebbe una classe CSS nuova che duplica quella — cioè più CSS per togliere una parola, in una story che il CSS voleva non aprire. Nessuna conseguenza per chi usa il software.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository (`52f6f5c`) e sul progetto Supabase il 9 agosto 2026.

**Lo stato del database, contato il 9 agosto 2026:** 1 questionario attivo a `version` 1, 8 blocchi, **23 domande tutte attive** con posizioni 1..23 consecutive e distinte, **2 clienti**, **1 persona**, `assessments` e `answers` **vuote**. Dodici migrazioni a registro, tutte col prefisso. **131 test verdi.**

**Le due tabelle sono complete e non serve nessuna colonna.** `assessments` e `answers` (0005) hanno già tutto quello che le Story 3.1-3.6 e 4.1-4.3 useranno: `total_questions`, `questionnaire_version`, `verdict` con il suo `check`, `completion_status` con il suo, e in `answers` le tre copie (`question_text`, `block_title`, `position`) che sono la scelta centrale dello schema. Il trigger `updated_at` (0006) copre tutte e due. Le policy `assessments_owner_all` e `answers_owner_all` (0007) sono `for all to authenticated` su `owner_id = auth.uid()`: **nessuna policy nuova**. L'indice unico `answers_assessment_question_idx` è già la difesa di database contro una risposta duplicata.

**Il precedente della funzione in transazione esiste, ed è recente.** La 0011 ha messo il riordino nel database con la motivazione scritta per esteso in testa al file: «PostgREST non offre transazioni: N update in fila da un'azione lasciano posizioni incoerenti a ogni rete caduta a metà». Qui il caso è più grave, perché le due scritture non sono due update sulla stessa tabella ma la nascita di un'entità e delle sue N righe figlie, e lo stato incoerente non è temporaneo: `total_questions` non si aggiorna mai. La 0011 porta anche la forma da copiare — `security invoker`, `search_path` vuoto, nomi qualificati, `revoke`/`grant` in fondo.

**Le macchine dell'interfaccia ci sono tutte.** `PeopleCard` è la card sorella con i suoi quattro stati e il ritorno di fuoco sul titolo; `NewPersonForm` è il modulo «un pulsante scopre un modulo, un solo Salva»; `useWrite` chiama un'azione da un controllo che non è un campo di testo; `openSession`, `isUuid`, `personDisplayName`, `ErrorState`, `.badge data`, `.empty`, `.form__actions` esistono. **Nessun componente di disegno nuovo**: questa story monta pezzi già provati in una card in più.

**La lettura delle persone è già nella pagina** (`[id]/page.tsx:94-99`) e serve a due cose adesso: il selettore dell'interlocutore e la risoluzione del nome nella riga della scheda. Nessuna query in più per il nome, nessun innesto.

**Il commento di `questionario/page.tsx:25-27` è la specifica di questa story**: «Nessun `.eq('is_active', true)` sulle domande, e non è una dimenticanza… È il contrario di quello che farà la schermata di compilazione». Quel contrario si scrive qui, dentro la funzione.

### Cosa cambia questa story, file per file

```
supabase/migrations/0013_open_assessment.sql          NUOVO — la funzione in transazione (~90 righe)
src/lib/call-date.ts                                  NUOVO — validateCallDate (~45 righe)
src/lib/call-date.test.ts                             NUOVO — i casi della data
src/lib/format-date.ts                                MODIFICA — todayIsoDate e la resa del giorno civile
src/lib/format-date.test.ts                           MODIFICA — il caso del fuso a cavallo di mezzanotte
src/app/(app)/clienti/assessment-actions.ts           NUOVO — 'use server', openAssessment (~90 righe)
src/app/(app)/clienti/[id]/assessments-card.tsx       NUOVO — 'use client', i quattro stati (~110 righe)
src/app/(app)/clienti/[id]/new-assessment-form.tsx    NUOVO — 'use client', data e interlocutore (~85 righe)
src/app/(app)/clienti/[id]/page.tsx                   MODIFICA — una lettura e un montaggio (~205 righe → v. nota)
src/app/(app)/clienti/[id]/loading.tsx                MODIFICA — la terza card dello scheletro
docs/database.md                                      MODIFICA — §7 l'elenco, §3 chi scrive total_questions
docs/bmad/implementazione/deferred-work.md            MODIFICA — una chiusura, tre annotazioni
```

**Nota sul limite delle 200 righe.** `[id]/page.tsx` è a 186 righe e con la lettura nuova e il montaggio arriva intorno a 205. Il limite di `kb-0.md` §2 è «quasi sempre due cose», e questo file è già cinque letture e quattro componenti di presentazione. La strada, se il conto sfora, è **estrarre i tre componenti di presentazione in fondo al file** (`ClientHeader`, `ClientError`, `ClientIdentity`, `ClientFields`) o la sola lettura; **non** si sfora in silenzio e **non** si comprime il codice per stare sotto. Va deciso guardando il numero vero, e dichiarato nel Dev Agent Record.

**Non si aprono:** tutto `questionario/`, `people-actions.ts`, `person-edit-actions.ts`, `actions.ts`, `client-field-form.tsx`, `client-tags-form.tsx`, `people-card.tsx`, `person-block.tsx`, `use-write.ts`, `use-editable-field.ts`, `last-activity.ts`, `globals.css` (salvo bisogno dichiarato a schermo), `database.types.ts` (lo schema non cambia: la 0013 aggiunge una funzione, e le funzioni non entrano nei tipi delle tabelle — se `rpc('open_assessment')` non fosse tipato, si rigenerano i tipi e lo si dichiara), `seed.sql`. Nessuna dipendenza nuova.

### Le tre decisioni di questa story

**1. La creazione è una funzione di database, non due chiamate dal TypeScript.** È la decisione che regge tutto il resto, e il motivo non è l'eleganza: è che lo stato incoerente qui non si sana. Il precedente della 2.2 — `createBlock` che legge e inserisce in due istruzioni — è stato accettato perché il suo danno era una posizione duplicata che la prima rinumerazione avrebbe sanato. Qui il danno è una scheda che dichiara 23 domande e non ne ha nessuna, per sempre, perché `total_questions` non si aggiorna mai (FR16) e le copie del testo non si possono più ricostruire fedelmente. **Un annullamento che fallisce è migliore di uno che riesce a metà** (D24), e vale identico per una creazione.

**2. `position` si copia con i buchi, e non si rinumera.** La decisione 3 della Story 2.6 lo aveva già scritto guardando avanti a questa story: «una scheda futura (3.1) che copia le posizioni delle sole domande attive avrà numeri con dei buchi (1, 2, 4, …). Non è un difetto: `answers.position` serve a *ordinare* la scheda, non a contarla — il conteggio è `total_questions`». Rinumerare qui vorrebbe dire che la domanda numero 3 della scheda non è la domanda numero 3 del questionario, e nessuna delle due numerazioni sarebbe più affidabile.

**3. L'apertura non porta da nessuna parte, per ora.** La scheda nasce e compare nella card del cliente; non c'è nessun collegamento e nessuna rotta di compilazione, perché la schermata di compilazione è la Story 3.2. Un `redirect` verso una rotta inesistente sarebbe un 404 al termine di un'azione riuscita, e costruire qui una pagina di sola lettura vorrebbe dire scrivere una resa che la 3.2 riscrive il giorno dopo. La verifica di AC2 non ne soffre: sta nel database, ed è lì che si guarda (Task 7). È la domanda 1.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Creare la scheda e le risposte con due chiamate PostgREST | Scheda con `total_questions` a 23 e zero risposte, irreparabile | Tutto dentro `open_assessment`, che è una transazione |
| Scrivere `total_questions` contando **tutte** le domande | Il denominatore conta anche le disattivate: AC2 violata | `count(*)` con `is_active` vero, dentro la funzione |
| Aggiornare `total_questions` dopo l'apertura | Le schede chiuse ieri tornano incomplete (FR16) | Si scrive nell'insert e mai più: nessun update in nessun punto |
| Rinumerare le `position` copiate «per chiudere i buchi» | I numeri della scheda non corrispondono più a nessuna domanda | Si copia `questions.position` verbatim (decisione 2) |
| Scrivere `1` come letterale in `questionnaire_version` | Bugia con data di scadenza il giorno che `version` si muove | Si copia la colonna `questionnaires.version` |
| Scegliere il questionario con un ordinamento diverso da `page.tsx` | Scheda e schermata mostrano due questionari diversi, senza errore | Stessa terna: `is_active`, `order by created_at, id, limit 1` |
| Calcolare «oggi» nel browser | Idratazione discordante, e su Vercel il fuso è UTC (D23) | `todayIsoDate()` sul server, passata come prop |
| Usare `new Date(callDate)` per rendere la data | La stringa senza fuso si legge in UTC: a Roma può togliere un giorno | Si compone dalle tre parti, senza `new Date` |
| Rifiutare le date passate o future | Il software deciderebbe al posto della persona (D14) | Si valida solo la forma e il giorno reale |
| Dimenticare `revalidatePath('/clienti')` | Si apre una scheda e l'elenco non riordina (voce a ledger della 1.6) | Due rivalidazioni, e la seconda ha il suo commento |
| Un `redirect` dopo l'apertura | 404 al termine di un'azione riuscita: la rotta è della 3.2 | L'azione ritorna `{}`, la card mostra la riga |
| Mostrare la pillola di verdetto o la barra di avanzamento | Lavoro delle Story 3.5, 4.1 e 4.2 anticipato e da riscrivere | La riga porta data e interlocutore, e basta |
| Un selettore dell'interlocutore con la sola opzione `Nessuno` | Un controllo che finge di far scegliere; AC4 resta invisibile | Senza persone il selettore non si rende: una riga lo dice |
| Accettare un `interviewee_id` di un altro cliente | Una scheda dichiara un interlocutore che non c'entra, e niente lo smentisce | La funzione verifica `people.client_id = p_client_id` |
| Loggare `details` dell'errore | Contiene la riga intera, cioè il testo delle domande | Solo `code` e `message` (kb-0.md §3) |
| `as` sul valore di `interviewee_id` o della data | Vietato (kb-0.md §2) | `isUuid` e `validateCallDate`, che restringono il tipo |
| Far cadere la pagina se la lettura delle schede fallisce | L'anagrafica e le persone diventano irraggiungibili per un errore altrui | `assessments` a `null` → in errore va solo la card |
| Una migrazione senza la dichiarazione D24 | `migrations.test.ts` diventa rosso, ed è il difetto che esiste per trovare | Tre chiavi in testa, nell'ordine, senza `cascade` |

### Contratto visivo

- **Nessun componente di disegno nuovo e, salvo bisogno dichiarato, nessun CSS nuovo.** La card delle schede è la card delle persone con altri contenuti: stesse classi, stesso badge, stesso stato vuoto con il suo pulsante, stesso `ErrorState`.
- **La sezione è ancora Clienti.** `--sec-prequalifica` non entra qui: i colori di sezione vivono nella navigazione (UX-DR2), e questa card sta dentro la scheda cliente. Il tinta della prequalifica arriverà con la schermata di compilazione, che è una schermata sua.
- **La data in monospaziato** (`.data`, UX-DR12): è un dato, e in colonna si legge a colpo d'occhio. In forma assoluta `gg/mm/aaaa` e non relativa: `call_date` è il giorno della call, non «quanto tempo fa» — la forma relativa di `design-system.md` §5 riguarda l'ultima attività nell'elenco.
- **Le parole nuove a schermo sono cinque**: `Schede`, `Nuova scheda`, `Apri scheda`, `Data della call`, `Interlocutore`, più `«Nessuna scheda ancora.»` e la riga sull'assenza di persone. Ognuna dice cosa succede o cosa manca (UX-DR13), in italiano, frase minuscola, senza punti esclamativi.
- **Nessuna animazione, nessuna conferma.** Aprire una scheda non è distruttivo e non chiede conferme (kb-0.md §6). Non è nemmeno annullabile dall'interfaccia, ed è coerente: niente si cancella davvero (masterplan §5).

### Perimetro: cosa NON entra in questa story

- **Nessuna schermata di compilazione e nessuna rotta nuova**: Story 3.2. Nessun campo di risposta, nessun testo di aiuto reso, nessun blocco in sequenza verticale.
- **Nessun salvataggio automatico e nessun indicatore di salvataggio**: Story 3.3. L'indicatore è l'elemento firma e nasce lì, con i suoi tre stati esatti.
- **Nessun verdetto, nessuna pillola di verdetto, nessuno stato di compilazione modificabile**: Story 3.5 e 3.6.
- **Nessun contatore e nessuna barra di avanzamento**: Story 4.1, che li aggiungerà alle righe che questa story crea.
- **Nessuna colonna esito nell'elenco clienti**: Story 4.2.
- **Nessuna esportazione**: Story 4.3.
- **Nessuna cancellazione di una scheda**, nemmeno «di prova»: non esiste e non entra.
- **Nessuna modifica alle tabelle**: la 0013 aggiunge una funzione e nient'altro. Nessuna colonna, nessun vincolo, nessun indice, nessuna policy.
- **Nessuna correzione ai quirk del fuoco** (ledger, Story 5.2): se ne emerge uno nuovo si annota.

### Test

Cosa entra, e perché **stavolta entra qualcosa**: le due funzioni di data sono esattamente la logica che «rompendosi produce dati sbagliati» (kb-0.md §7). Una data storta dentro una scheda non produce nessun errore e nessuno se ne accorge: produce un archivio che, fra tre mesi, dice che la call è avvenuta il giorno prima. Il caso del fuso a cavallo di mezzanotte è la stessa trappola di D23, e va provato con `TZ=UTC`, che è come lo script `test` già esegue.

Cosa **non** entra: nessun test che finga Supabase. L'azione è la mappatura di tre rami e i componenti sono presentazione — un test con un client finto verificherebbe il finto. Le due invarianti di AC2 si provano dove vivono, nel database, con la transazione annullata del Task 7: è il pattern consolidato dalla 2.5 e dalla 2.6, ed è l'unico modo di provare che una funzione plpgsql fa quello che dice.

`migrations.test.ts` legge da sé il file nuovo e aggiunge i suoi quattro controlli: non va toccato.

### Project Structure Notes

```
supabase/migrations/
└── 0013_open_assessment.sql            NUOVO — la funzione, con la dichiarazione D24

src/lib/
├── call-date.ts                        NUOVO — validateCallDate, file puro
├── call-date.test.ts                   NUOVO
├── format-date.ts                      MODIFICA — todayIsoDate e la resa del giorno civile
└── format-date.test.ts                 MODIFICA

src/app/(app)/clienti/
├── assessment-actions.ts               NUOVO — 'use server', una azione
└── [id]/
    ├── assessments-card.tsx            NUOVO — 'use client', quattro stati
    ├── new-assessment-form.tsx         NUOVO — 'use client', due campi
    ├── page.tsx                        MODIFICA — una lettura, un montaggio
    ├── loading.tsx                     MODIFICA — la terza card
    └── tutto il resto                  INVARIATO

src/app/(app)/questionario/             INVARIATO — non si apre niente
src/app/globals.css                     INVARIATO (salvo bisogno dichiarato a schermo)
```

Convenzioni vincolanti (kb-0.md §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, un componente per file, nessun file sopra le 200 righe — l'unica eccezione dichiarata resta `edit-question-form.tsx` a 228, e questa story non la apre; se `[id]/page.tsx` sfora, si divide e si dichiara.

### Piattaforma in uso, verificata

Ricontata il 9 agosto 2026 su `52f6f5c`: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. **Nessuna dipendenza entra o si aggiorna**: la validazione della data si fa in venti righe, e una libreria di date per un confronto di stringhe sarebbe la dipendenza senza motivo che `AGENTS.md` vieta.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, dodici migrazioni registrate col prefisso.

Due cose da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `rpc('open_assessment', …)` sia tipato senza rigenerare `database.types.ts`.** I tipi generati contengono una sezione `Functions`; le tre della 0011 ci sono perché i tipi sono stati rigenerati allora, o perché `rpc` accetta comunque la chiamata. Se il controllo dei tipi si ferma, si rigenerano i tipi con `generate_typescript_types` e lo si dichiara — è una rigenerazione, non una modifica a mano.
- **Che `<input type="date">` mandi `AAAA-MM-GG`** anche con la lingua italiana del browser. È il comportamento dichiarato dallo standard e il motivo per cui `validateCallDate` cerca quella forma; va visto, perché se non fosse così tutte le aperture fallirebbero con il messaggio della data.

### Intelligence dai commit e dalla story precedente

Da `52f6f5c` (2.6) e dai commit dell'Epic 2, le abitudini che questa story eredita:

- **La verifica è divisa in due**: parte agente (typecheck, build, test, sonde SQL, grep di perimetro) e sessione di Luca, che è la condizione per `done`.
- **Le sonde hanno un pattern consolidato**: transazione annullata per la meccanica, richiesta con la sola chiave pubblicabile per la RLS, e la dichiarazione esplicita di quale metà resta alla sessione.
- **Le caselle non si spuntano se non sono vere.** Qui però **tutte e quattro le AC sono verificabili oggi**, per la prima volta da tre story: le tabelle si riempiono davvero.
- **L'esito delle decisioni strutturali si scrive dove si cerca**, non solo nel file della story: `database.md` §3 e §7 (Task 6).
- **Le domande si chiudono prima di implementare**: le tre in fondo hanno il default già dentro i task; se Luca conferma, non cambia niente.
- **Il perimetro si dichiara file per file e si verifica col grep**, comprese le assenze (`.from('answers')` deve restare zero).
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 3.1: Aprire una scheda di prequalifica su un cliente]
- FR15, FR16, FR17, NFR8, NFR9: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- Le due tabelle, i loro default e la ragione delle copie: [Source: docs/database.md#3. Tabelle] e [Source: supabase/migrations/0005_assessments_answers.sql]
- Le policy `for all to authenticated` su `owner_id`: [Source: supabase/migrations/0007_rls.sql]
- La transazione nel database perché PostgREST non ne offre, con `security invoker` e `revoke`/`grant`: [Source: supabase/migrations/0011_reorder_functions.sql]
- Il formato della dichiarazione di reversibilità e il passo su `list_migrations`: [Source: docs/database.md#7. Migrazioni] e [Source: docs/00-contesto-e-decisioni.md#D24]
- `questionnaire_version` copia `1`, e perché: [Source: docs/00-contesto-e-decisioni.md#D25] e [Source: docs/database.md#3. Tabelle]
- Le posizioni con i buchi, decise guardando a questa story: [Source: docs/bmad/implementazione/2-6-disattivare-una-domanda-invece-di-cancellarla.md#Le tre decisioni di questa story]
- Il filtro sulle attive e il conteggio, rimandati a questa story: [Source: src/app/(app)/questionario/page.tsx:25-27,94-99]
- L'ultima attività che dipende anche dalle schede, e la rivalidazione mancante: [Source: docs/database.md#5. Ultima attività del cliente] e [Source: docs/bmad/implementazione/deferred-work.md#Deferred from: code review of 1-6-ordinare-l-elenco-per-ultima-attivita-vera]
- Il fuso dichiarato nel codice e il motivo: [Source: docs/00-contesto-e-decisioni.md#D23] e [Source: src/lib/format-date.ts]
- La card con i suoi quattro stati e il ritorno di fuoco: [Source: src/app/(app)/clienti/[id]/people-card.tsx]
- Il modulo «un pulsante lo scopre, un solo Salva»: [Source: src/app/(app)/clienti/[id]/new-person-form.tsx]
- I tre rami di un'azione e il log senza `details`: [Source: src/app/(app)/questionario/question-active-actions.ts] e [Source: docs/kb-0.md#3. Sicurezza]
- Nessuno stato blocca nessuna azione: [Source: docs/00-contesto-e-decisioni.md#D14]
- I quattro stati di ogni schermata e la voce dell'interfaccia: [Source: docs/design-system.md#6. I quattro stati di ogni schermata] e [Source: docs/design-system.md#7. Voce dell'interfaccia]
- Story precedente, con le sue macchine e le sue lezioni: [Source: docs/bmad/implementazione/2-6-disattivare-una-domanda-invece-di-cancellarla.md]

### Domande per Luca, da chiudere prima di dev-story

Tre, tutte con un default già applicato nei task: se la risposta è «sì al default» non cambia niente. La prima decide il perimetro della story, la seconda tocca il comportamento in un caso limite, la terza è una divisione di lavoro fra questa story e la 4.1.

1. **L'apertura resta sulla scheda cliente, senza portare alla compilazione?**
   La schermata di compilazione è la Story 3.2 e non esiste. Le alternative sono tre: (a) l'azione non reindirizza e la scheda compare nella card, (b) l'azione reindirizza a una rotta che questa story costruisce in sola lettura — che la 3.2 riscriverebbe il giorno dopo —, (c) l'azione reindirizza a una rotta che non c'è, cioè un 404.
   **Default: (a).** La scheda nasce, si vede nella card, e le due invarianti di AC2 si provano nel database col Task 7. Se la risposta è (b), la story cresce di una rotta, di una pagina e del suo scheletro, e una parte di quel lavoro va rifatta con la 3.2.

2. **Un questionario senza domande attive rifiuta l'apertura?**
   Oggi le 23 domande sono tutte attive e il caso si raggiunge solo disattivandole tutte a mano. Ma `total_questions` non si aggiorna **mai** (FR16): una scheda aperta in quel momento resterebbe a `0` per sempre, e nessuna schermata potrebbe più ripararla.
   **Default: sì, la funzione rifiuta** (`return null`) e l'azione risponde `«La scheda non è stata aperta: il questionario o il cliente non sono più disponibili. Ricarica la pagina.»` Non è il software che decide al posto della persona (D14, che parla degli stati del cliente): è il software che dice la verità su una precondizione che non c'è, come già fa lo stato vuoto del questionario, che non offre nessun pulsante perché non esiste un `questionnaire_id` a cui agganciare un blocco. Se la risposta è no, la scheda si apre con `total_questions` a 0 e la funzione perde due `return null`.

3. **L'elenco delle schede nella card è di questa story o della 4.1?**
   La 4.1 dice «vedo l'elenco delle sue schede con data, esito e **avanzamento**», e i suoi criteri parlano tutti del contatore e della barra. Senza un elenco qui, però, una scheda aperta è invisibile e la story non si può verificare a schermo — e la Story 3.4, che chiede di **riprendere** una scheda interrotta, arriva prima della 4.1.
   **Default: l'elenco nudo è di questa story** — data e interlocutore, niente altro — **e la 4.1 aggiunge esito e avanzamento alle stesse righe.** Se la risposta è no, questa story non ha nessun modo di mostrare quello che ha creato, e la verifica resta solo nel database.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 9 agosto 2026.

### Debug Log References

**Le tre domande sono state chiuse prima di implementare**, e Luca ha confermato tutti e tre i default: l'apertura non reindirizza, un questionario senza domande attive rifiuta l'apertura, l'elenco nudo delle schede è di questa story. I task non sono cambiati.

**`npm test`: da 131 a 150.** I diciannove nuovi sono +4 dai controlli che `migrations.test.ts` esegue da sé sulla 0013, +9 in `call-date.test.ts`, +6 in `format-date.test.ts`.

**`list_migrations`: tredici righe, tutte col prefisso, `0013_open_assessment` in fondo.** Il nome è stato passato con il prefisso e lo ha conservato, come già la 0009.

**Sonde SQL, in transazione annullata** (`begin; … rollback;` in una sola chiamata, eseguite come proprietario con `request.jwt.claims` e `role` impostati a mano: esercitano la *meccanica*, non le policy). Disattivata una domanda in posizione 3 e aperta una scheda su un cliente vero:

- `total_questions` = **22**, non 23; `questionnaire_version` = 1; `verdict` = `non_deciso`; `completion_status` = `bozza`; `owner_id` corretto.
- righe di `answers` = **22**, tutte con `content` nullo, **zero** discordanze fra `question_text`/`block_title`/`position` e la domanda viva.
- posizioni copiate: `1,2,4,5,…,23` — **col buco dove stava la disattivata**, come la decisione 2 prescrive.
- riattivata la domanda, `total_questions` **resta 22**: è FR16 in forma verificabile.
- `call_date` nullo → `current_date`; `call_date` esplicito → copiato verbatim; interlocutore del cliente → accettato.
- cliente inesistente, interlocutore di un altro cliente, questionario senza nessuna domanda attiva → **`NULL` (rifiutato)** in tutti e tre i casi.
- dopo il `rollback`: 0 schede, 0 risposte, 23 domande attive. Il database è alla baseline.

**Sonda senza sessione**, con la sola chiave pubblicabile: `POST …/rest/v1/rpc/open_assessment` risponde `{"code":"42501","message":"permission denied for function open_assessment"}` — rifiuto esplicito e non no-op silenzioso; `GET …/rest/v1/assessments` e `GET …/rest/v1/answers` rispondono `[]`.

**Grep di perimetro:** `.from('assessments')` **1** (era 0), `.from('answers')` **0**, `.rpc(` **4** (erano 3), `.delete(` **1** (invariato, è quello delle persone), `total_questions` in TypeScript **0 scritture** (due sole occorrenze, entrambe dentro commenti), nessun `as`/`any` nuovo (l'unico del progetto resta quello di `last-activity.test.ts`, non toccato), zero esadecimali e zero `--sec-prequalifica` sotto `clienti/`.

**Verifica a schermo del CSS nuovo**, con una riproduzione statica servita in locale (non ho una sessione per la pagina vera, che è la verifica di Luca): a 1280 e a 375 la card rende i quattro stati e il modulo senza scorrimento laterale (`scrollWidth` 375 = `clientWidth`), le righe vanno a capo invece di traboccare, la prima riga non porta la linea di separazione, i campi vengono 46px. I pulsanti restano 40px, che è la voce già a ledger dalla 1.1 e appartiene alla 5.2.

**La verifica di sessione, 9 agosto 2026: tutte e dodici le caselle del Task 7, tutte passate.** Comprese le sei che scrivono dati permanenti e la dodicesima aggiunta dalla revisione — disattivare tutte le domande, tentare l'apertura, vedere il messaggio di precondizione e non un modulo che si azzera come se avesse funzionato.

**Le schede di prova sono state tolte dalla dashboard Supabase dopo la verifica**, e va scritto qui perché altrimenti due cose di questo file si leggono come false. La prima è l'avvertenza del Task 7 («sarà la prima scheda vera dell'archivio»): non lo è stata, l'archivio è tornato vuoto. La seconda è che chi ricontasse lo stato del database troverebbe `assessments` e `answers` a zero e ne dedurrebbe che la verifica non è stata fatta — è successo durante la revisione stessa, ed è il motivo per cui questa riga esiste. Non è una modifica dalla dashboard nel senso vietato da `kb-0.md` §5 e da `AGENTS.md`, che parlano di **schema**: qui sono righe di dati di prova, cioè la stessa categoria del seed. E non contraddice «niente si cancella davvero» (masterplan §5), che è una promessa del software a chi lo usa, non un vincolo su chi amministra il database.

### Completion Notes List

**Tre scostamenti dai task, tutti dichiarati.**

**1. La firma della 0013 ha preso `default null` sui due parametri facoltativi, e la migrazione è stata riapplicata.** Il Task 1 prescriveva `open_assessment(p_client_id uuid, p_call_date date, p_interviewee_id uuid)`. Applicata così, i tipi generati da Supabase rendono **obbligatorio e non nullo** ogni argomento privo di default: passare «nessun interlocutore» avrebbe richiesto un `as`, vietato da `kb-0.md` §2. La correzione è `p_call_date date default null, p_interviewee_id uuid default null` — che è anche la firma vera, perché il corpo già fa `coalesce(p_call_date, current_date)` e già tratta l'interlocutore assente come AC4 chiede. La sequenza è stata: eseguire l'annullamento che il file stesso dichiara (`drop function open_assessment(uuid, date, uuid);`), cancellare la riga di registro della prima applicazione — metadato dello strumento, non schema applicativo (`database.md` §7) — e riapplicare il file corretto, così che un file corrisponda a una riga e il contenuto registrato sia quello sul disco. `list_migrations` risponde tredici. I tipi dell'argomento non cambiano, quindi la riga `Come si annulla:` resta esatta com'era. La regola generale che questo caso scopre — un parametro nullabile deve avere `default null`, altrimenti il tipo generato mente — è a ledger, da scrivere in `database.md` quando ci sarà un secondo caso invece di uno solo.

**2. `[id]/page.tsx` avrebbe sforato le 200 righe, quindi è stato diviso.** Con la lettura e il montaggio arrivava a **219**. Il Task 4 e la nota sul limite prescrivevano di dichiararlo e dividere invece di sforare in silenzio: i due componenti di presentazione dell'anagrafica sono ora `[id]/client-card.tsx` (`ClientCard`, 64 righe), che porta con sé `ClientDetail` e `readValue`. `page.tsx` è a **158**. La scelta fra i candidati indicati dalla story è caduta su questi due perché sono la metà che si stacca senza toccare nessuna query, e perché uniti fanno **un** componente per file (`kb-0.md` §2) invece di quattro. Il controllo che teneva allineate `COLUMNS` e `CLIENT_FIELDS` non si è perso: adesso scatta dove la pagina passa la riga a `ClientCard`.

**3. Tre regole CSS nuove, dichiarate come il Task 4 chiede.** `.assessments` (azzeramento della lista), `.assessment` (la riga) e il suo `:first-child`. `.people`/`.person` non si riusano: il loro respiro — 24px di stacco, 20px fra i figli — è quello di una griglia di campi, mentre qui la riga è una data e un nome, e riusare `.people` per le schede sarebbe anche un nome che mente. Nessun esadecimale, solo `var(--line)` e la scala di spaziatura.

**Quello che è andato come previsto.** La funzione in transazione ha la forma della 0011 riga per riga (`security invoker`, `search_path` vuoto, nomi qualificati, `revoke`/`grant` in fondo). L'azione ha i tre rami di `setQuestionActive`, il log dei soli `code` e `message`, e le **due** `revalidatePath` — la seconda su `/clienti` chiude la voce a ledger della revisione 1.6, che aspettava esattamente questa scrittura. La card è `PeopleCard` riga per riga, ritorno di fuoco sul titolo compreso. Nessun `redirect`, nessun collegamento, nessuna pillola di verdetto, nessun contatore: sono le Story 3.2, 3.5, 4.1 e 4.2.

**Una cosa che il Task 4 non prevedeva e che è stata risolta in tre rami invece di due.** Il modulo distingue `people === null` (lettura fallita) da `people === []` (nessuna persona): nel primo caso non rende né il selettore né la riga «Nessuna persona registrata», perché la card sopra sta già dicendo che le persone non si sono caricate, e le due frasi si smentirebbero a dieci pixel di distanza.

**`validateCallDate` rifiuta `null`, e non lo tratta come «oggi».** Il testo del Task 2 diceva «valore assente o stringa vuota → `today`», l'elenco dei casi diceva «`null` → messaggio». Prevale l'elenco dei casi, che è quello che diventa un test: `formData.get` risponde `null` solo quando la chiave non c'è, e il modulo rende sempre il campo — quindi `null` è una richiesta che non doveva esistere, e la risposta giusta è il rifiuto, non un valore inventato. `undefined` (l'argomento non passato) e `''` (il campo svuotato) valgono `today`.

**La verifica di sessione resta a Luca ed è la condizione per `done`.** Sono le undici caselle non spuntate del Task 7. Avvertenza confermata: aprire una scheda scrive dati veri e permanenti, e non esiste nessun modo di cancellarla dall'interfaccia (niente si cancella davvero, masterplan §5).

### File List

```
supabase/migrations/0014_open_assessment_total.sql    NUOVO   dalla revisione: il totale dalle righe
                                                              scritte, e «oggi» nel fuso dichiarato
supabase/migrations/0013_open_assessment.sql          NUOVO   la funzione in transazione (137 righe)
src/lib/call-date.ts                                  NUOVO   validateCallDate (40)
src/lib/call-date.test.ts                             NUOVO   nove casi
src/lib/format-date.ts                                MODIF.  todayIsoDate, formatCallDate, civilParts estratta (138)
src/lib/format-date.test.ts                           MODIF.  sei casi nuovi
src/lib/types.ts                                      MODIF.  AssessmentRow e AssessmentSummary
src/lib/database.types.ts                             MODIF.  rigenerato: la sezione Functions conosce open_assessment
src/app/(app)/clienti/assessment-actions.ts           NUOVO   'use server', openAssessment (100)
src/app/(app)/clienti/[id]/assessments-card.tsx       NUOVO   'use client', i quattro stati (128)
src/app/(app)/clienti/[id]/new-assessment-form.tsx    NUOVO   'use client', due campi (124)
src/app/(app)/clienti/[id]/client-card.tsx            NUOVO   l'anagrafica estratta da page.tsx (64) — v. scostamento 2
src/app/(app)/clienti/[id]/page.tsx                   MODIF.  una lettura, un montaggio, la divisione (219 → 158)
src/app/(app)/clienti/[id]/loading.tsx                MODIF.  la terza card dello scheletro
src/app/globals.css                                   MODIF.  .assessments e .assessment — v. scostamento 3
docs/database.md                                      MODIF.  §3 chi scrive total_questions, §7 l'elenco dei file
docs/bmad/implementazione/deferred-work.md            MODIF.  una chiusura, due annotazioni, due voci nuove
docs/bmad/implementazione/sprint-status.yaml          MODIF.  scrittura di metodo
docs/bmad/implementazione/3-1-…-su-un-cliente.md      MODIF.  questo file
```

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 9 agosto 2026 | 0.1 | Story creata | Claude Opus 5, skill `bmad-create-story` |
| 9 agosto 2026 | 0.2 | Story implementata: migrazione 0013, `openAssessment`, card e modulo, due funzioni di data con i loro test. Tre scostamenti dichiarati (default nella firma SQL, divisione di `page.tsx`, tre regole CSS). Test da 131 a 150. Pronta per la revisione. | Claude Opus 5, skill `bmad-dev-story` |
| 9 agosto 2026 | 0.3 | Revisione applicata: sedici finding, quattro decisioni chiuse da Luca, otto patch. Migrazione **0014** — `total_questions` dalle righe scritte davvero invece che da un conteggio a parte, e il ripiego della data nel fuso dichiarato invece che in UTC. Messaggio di precondizione riscritto, terzo ramo di `people === null` nel modulo e nelle righe, `validateCallDate` rifiuta l'anno zero, `ClientDetail` senza `export`, tre correzioni documentali. Test da 150 a 155 (+4 dai controlli su `0014`, +1 dall'anno zero). Cinque voci a ledger. | Claude Opus 5, skill `bmad-code-review` |
| 9 agosto 2026 | 1.0 | Verifica di sessione completata da Luca: dodici caselle su dodici, comprese le sei che scrivono dati permanenti e quella nuova sul ramo di rifiuto. Schede di prova rimosse dalla dashboard dopo la verifica. Story chiusa. | Luca |
