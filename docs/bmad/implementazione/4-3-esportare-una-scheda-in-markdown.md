---
baseline_commit: b9225cc
---

# Story 4.3: Esportare una scheda in markdown

Status: review

Epic: 4 — Ritrovare a mesi di distanza e portare fuori
Data di creazione: 11 agosto 2026

> **Baseline.** La Story 4.2 è implementata, revisionata e chiusa dalla verifica di sessione: `b9225cc` su `main`, albero pulito. Tutti i conteggi di questo file sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati l'11 agosto 2026: **237 test verdi**, `npm run typecheck` senza uscita, **sedici migrazioni** a registro, tutte col prefisso numerico da `0001_extensions` a `0016_answers_touch_assessment`.
>
> **Lo stato del database è invariato dalla 3.5, per la quinta story di fila:** 3 clienti, 1 persona, **1 scheda, 24 risposte di cui 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. La scheda ha `verdict` `non_deciso`, `call_date` `2026-08-10`, `completion_status` `bozza`, `total_questions` 24, `questionnaire_version` 1.
>
> **Due numeri contano più degli altri, e tutti e due dicono che questa story non si verifica sui dati di oggi.** Il primo: **0 risposte su 24 hanno un contenuto**, quindi esportare la scheda che esiste produce un documento con ventiquattro domande e nessuna risposta — il caso di AC3 al cento per cento, e AC1 mai. Il secondo: **`interviewee_id` è `null` sull'unica scheda**, e nessuna delle tre persone… anzi, **l'unica persona** del database è interlocutore di niente, quindi la riga «Interlocutore» dell'intestazione non è osservabile senza scrivere. È la prima story dell'Epic 4 in cui la verifica di sessione **deve** scrivere, e la conseguenza sul ledger sta nel Task 7.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want portare fuori una scheda in un file leggibile,
so that posso passarla a un commerciale o tenerla fuori dal sistema senza copiarla a mano.

## Acceptance Criteria

**AC1 — il file dice cliente, data, interlocutore, le risposte per blocco e il verdetto**
**Given** una scheda compilata
**When** la esporto
**Then** ottengo un file markdown con intestazione (cliente, data, interlocutore), le risposte **raggruppate per blocco** con il testo della domanda a cui rispondono, e il **verdetto per esteso** (FR25, criterio di accettazione 7 del PRD)

**AC2 — il nome del file è prevedibile**
**Given** l'esportazione
**When** guardo il nome del file
**Then** è prevedibile, nella forma `cliente-data-prequalifica.md`

**AC3 — una domanda saltata resta una domanda fatta**
**Given** una scheda con domande saltate
**When** la esporto
**Then** le domande senza risposta compaiono comunque, con la risposta vuota, perché una domanda non fatta e una domanda senza risposta non sono la stessa cosa

**AC4 — il file racconta il questionario di quel giorno, non quello di oggi**
**Given** una scheda che contiene domande poi modificate o disattivate
**When** la esporto
**Then** il markdown riporta le domande com'erano quel giorno (FR17)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **AC4 è già vera per costruzione, e l'unico modo di romperla è aggiungere codice.** `answers` porta la copia di `question_text`, `block_title`, `position`, `answer_type`, `options` e `help_text` dalla 0015: leggere quelle colonne *è* AC4. Chi innestasse `questions(...)` per «prendere il testo aggiornato», o unisse le due fonti «per sicurezza», renderebbe una scheda vecchia col questionario di oggi. **Nessun `questions`, nessun `question_blocks`, nessun `questionnaires` in questa story, in nessuna forma.** Il grep del Task 9 lo verifica, perché una dichiarazione non basta.
>
> **AC2 è la riga di sicurezza di questa story, e non sembra una riga di sicurezza.** Il nome del cliente è testo libero fino a 200 caratteri, e `validateClientName` toglie gli invisibili e fa `trim()` ma **non** toglie i ritorni a capo interni (`validate-client-name.ts:27`). Quel valore finisce in un'intestazione HTTP, `Content-Disposition`, dove un `"` cambia il nome del file e un `\r\n` inietta un'intestazione. La difesa non è togliere i caratteri cattivi: è **costruire lo slug da una lista di caratteri ammessi**, `[a-z0-9-]` e nient'altro, così quello che non è previsto non passa perché non è previsto. Il test che lo prova è una espressione regolare sull'uscita, non un elenco di ingressi cattivi.
>
> **Il markdown è un formato, quindi il testo di una persona può cambiarne la struttura.** Una domanda con un ritorno a capo dentro spezza il proprio titolo in due; un `block_title` con un ritorno a capo fa lo stesso. La regola è una sola e va applicata dove serve e **solo** dove serve: **quello che diventa un titolo si porta su una riga sola**, quello che diventa un blocco di testo si scrive com'è. Una risposta che comincia con `#` resta com'è battuta, perché è il testo di Luca e non un'iniezione: quello che non deve succedere è che il *documento* menta sulla propria struttura.
>
> **Il raggruppamento per blocco esiste già e non si riscrive.** `groupAnswersByBlock` (`src/lib/answer-groups.ts`) è generica su `{ block_title: string }` ed è nata con la 3.2 con il motivo scritto sopra: raggruppa **per corse consecutive** e non con una mappa `titolo → risposte`, perché due blocchi possono avere lo stesso titolo e una mappa li fonderebbe spostando le domande del secondo dentro il primo. Chi ne scrive una seconda qui produce un secondo bug di cui esiste già la cura.
>
> **Nessun elenco di etichette si riscrive.** I quattro esiti stanno in `VERDICT_LABELS` e i cinque campi in `VERDICT_FIELDS` (`src/lib/verdict.ts`), la data si formatta con `formatCallDate` (`src/lib/format-date.ts`), il nome di una persona con `personDisplayName` (`src/lib/person-fields.ts`), il vuoto si giudica con `normalizeTextValue` (`src/lib/client-fields.ts`). Cinque importazioni, zero copie: è la stessa regola che la 4.2 ha applicato alla pillola.
>
> **Il comando non è un `<Link>`, ed è la trappola più facile da cadere.** Ogni navigazione di questo software passa da `next/link`, e qui `next/link` **non funziona**: un `<Link>` fa una navigazione lato client e non scarica niente. Serve un `<a href>` normale verso un Route Handler che risponde con `Content-Disposition: attachment`.
>
> **Le due domande sono chiuse, l'11 agosto 2026, tutte e due sul default proposto.** La data nel nome del file è **ISO** (`pino-2026-08-10-prequalifica.md`); la domanda saltata **compare col titolo e sotto niente**, i campi del verdetto vuoti **si omettono**, l'`Esito` compare sempre. Le due voci in fondo alle Dev Notes restano scritte per intero perché portano il *perché*, che i Task non ripetono.
>
> **Non porta:** nessuna esportazione del cliente intero, nessun PDF, nessuna esportazione multipla, nessuna migrazione, nessuna scrittura di nessun tipo. Questa story **legge e basta**.

## Tasks / Subtasks

- [x] **Task 1 — Il nome del file, in un modulo puro** (AC: 2)

  - [x] File nuovo `src/lib/export-filename.ts`, puro: niente React, niente Supabase, così `npm test` lo copre senza riscrivere niente (`kb-0.md` §7). È la stessa forma di `last-activity.ts`, `assessment-progress.ts` e `latest-verdict.ts`.
  - [x] Firma: `assessmentFileName(clientName: string, callDate: string): string`. Due parametri e non la riga della scheda: chiedere la riga intera legherebbe un modulo puro allo schema, ed è l'argomento già scritto su `ActivityRow` (`last-activity.ts:8-12`), su `AnsweredRow` e su `VerdictRow`.
  - [x] **Lo slug si costruisce con una lista di caratteri ammessi, mai togliendo quelli vietati.** Nell'ordine: `normalize('NFD')` e via i segni diacritici combinanti (`[̀-ͯ]`), minuscolo, poi **ogni corsa di caratteri fuori da `[a-z0-9]` diventa un solo `-`**, poi via i `-` a inizio e fine. `Società Rossi & C.` dà `societa-rossi-c`.
  - [x] Il commento deve dire **perché** la lista è di ammessi e non di vietati, e nominare le due cose che questo impedisce: un `"` che chiude anticipatamente il valore di `Content-Disposition`, e un `\r\n` che vi inietta una seconda intestazione. Deve dire anche che `INVISIBLE` di `validate-client-name.ts` **non serve qui** e non si importa: un invisibile non è in `[a-z0-9]`, quindi cade da sé — che è il punto di una lista di ammessi.
  - [x] **Uno slug vuoto ha il suo ripiego, e non è un caso di scuola.** Un nome fatto di soli caratteri non latini o di sola punteggiatura riduce a stringa vuota, e senza ripiego il file si chiamerebbe `-2026-08-10-prequalifica.md`. Il ripiego è `cliente`, dichiarato nel codice.
  - [x] **La data è quella della colonna, in forma ISO: `pino-2026-08-10-prequalifica.md`** (Domanda 1, chiusa l'11 agosto 2026). `call_date` è un `date` e PostgREST la rende già `AAAA-MM-GG`, quindi non si riformatta niente. Il motivo va nel commento, perché la scelta ha un prezzo visibile: **dentro il documento la stessa data si legge `10/08/2026`** e nel nome no. Si accetta perché il nome di un file esiste per essere ritrovato in un elenco, e l'ISO è l'unica forma che rende un elenco alfabetico un elenco cronologico.
  - [x] Il suffisso è `-prequalifica.md`, letterale: è la parola dell'AC e del PRD §4, ed è quella che rende il nome riconoscibile in una cartella di file di altra provenienza.
  - [x] **Nessun troncamento**, e va scritto perché sembrerà una dimenticanza: 200 caratteri di nome più il separatore, la data e il suffisso fanno al massimo **227**, sotto i 255 di ogni filesystem in uso; e troncare farebbe collidere in una cartella due clienti che differiscono in coda, cioè un danno peggiore di un nome lungo.
  - [x] Test in `src/lib/export-filename.test.ts`. **La prova che vale più di tutte è un'invariante e non un elenco:** l'uscita corrisponde sempre a `/^[a-z0-9-]+\.md$/`, verificata su ogni caso del file, virgolette e ritorni a capo compresi. Poi: accenti (`Società` → `societa`), spazi, `/` e `\` (che sarebbero un attraversamento di percorso), maiuscole, corse di punteggiatura che collassano in un solo `-`, un nome che riduce a vuoto → `cliente`, un nome di 200 caratteri che non viene troncato, e una `callDate` di altra forma che non fa esplodere niente.

- [x] **Task 2 — Il documento, in un modulo puro** (AC: 1, 3, 4)

  - [x] File nuovo `src/lib/assessment-markdown.ts`, puro come sopra. È il file dove sta **tutta** la forma del documento: il Route Handler del Task 3 legge e consegna, non compone.
  - [x] Il tipo d'ingresso è un oggetto solo, con dentro esattamente quello che il documento rende — nome del cliente, data della call, nome dell'interlocutore o `null`, le righe di risposta, i cinque campi del verdetto. Nessun `AssessmentRow`, nessun `AnswerRow`.

    ```ts
    export type MarkdownAnswer = { block_title: string; question_text: string; content: string | null }
    ```

  - [x] **`groupAnswersByBlock` si importa e non si riscrive** (v. il riquadro sopra i Task). Il tipo qui sopra soddisfa già il suo vincolo `T extends { block_title: string }` senza toccarla.
  - [x] **Le risposte arrivano già ordinate e qui non si riordina niente**, che è la stessa riga scritta su `groupAnswersByBlock`: l'ordine è quello che il database ha dato (`position` poi `id`), e ricalcolarlo qui darebbe due sorgenti d'ordine destinate a divergere.
  - [x] **La forma del documento, e si scrive questa e non una che le somiglia:**

    ```markdown
    # Prequalifica — <cliente>

    **Cliente:** <cliente>
    **Data:** 10/08/2026
    **Interlocutore:** <nome cognome>

    ## <titolo del blocco>

    ### <testo della domanda>

    <contenuto della risposta, com'è battuto>

    ### <testo della domanda successiva>

    ## <titolo del blocco successivo>

    ## Verdetto

    ### Esito

    sì condizionato

    ### Motivo

    <contenuto>
    ```

  - [x] **Il cliente compare due volte di proposito.** L'`# H1` è il titolo del documento — quello che un lettore di markdown mostra e quello che un estratto incollato si porta dietro — e le tre righe sotto sono l'intestazione che AC1 chiede alla lettera. Non è una ridondanza da togliere, ed è scritta qui perché la prima revisione la leggerà come tale.
  - [x] **`## Verdetto` usa `###` per ognuno dei cinque campi, come le domande, e non righe con l'etichetta in grassetto.** È l'unica forma che non si rompe su nessun contenuto: `verdict_reason` è un campo lungo, e un contenuto su più righe dentro una riga di elenco o dopo un'etichetta in linea spezza la riga e cambia il documento. L'uniformità con le domande non è estetica: è il motivo per cui la regola vale.
  - [x] **Il vuoto, deciso l'11 agosto 2026 (Domanda 2), e sono due regole diverse di proposito.** Una **domanda saltata** porta il suo `###` e sotto non c'è niente — è la lettera di AC3, e la presenza del titolo *è* il record della call. Un **campo del verdetto vuoto si omette**, titolo compreso: non è una cosa che è stata chiesta, è una casella di un modulo. L'`Esito` fa eccezione e compare sempre, perché `verdict` è `not null` e un documento senza esito non direbbe il vero. Il vuoto lo giudica `normalizeTextValue`, importato: uno spazio non è un contenuto.
  - [x] Le etichette dei cinque campi vengono da `VERDICT_FIELDS` (`Esito`, `Motivo`, `Condizione`, `Verificare entro`, `Prossimo passo`) e l'esito da `VERDICT_LABELS` — `sì condizionato`, con l'accento e senza trattino basso, che è cosa vuol dire «per esteso» in AC1. Nessun secondo elenco.
  - [x] Un `verdict` fuori dai quattro **passa attraverso com'è**, senza etichetta e senza rompere niente: è la stessa decisione già presa in `VerdictPill` (`verdict-pill.tsx:33-34`), dove un valore sconosciuto si mostra neutro invece di far cadere la pagina.
  - [x] `verify_by` è una colonna `date` e si formatta con **`formatCallDate`**, che è già «un giorno civile reso `gg/mm/aaaa`». Il nome della funzione dice `call` e il campo non è una call: **si annota, non si sposta e non se ne scrive una seconda** — è esattamente il patto già scritto per `normalizeTextValue`, che vive in `client-fields.ts` e serve anche alle persone (`person-fields.ts:10-12`).
  - [x] **La regola della riga sola, e dove si applica.** Un helper interno porta su una riga sola tutto ciò che diventa un titolo o una riga d'intestazione — nome del cliente, nome dell'interlocutore, `block_title`, `question_text` — collassando ogni corsa di spazi, tabulazioni e ritorni a capo in un solo spazio, con `trim`. **Non si applica ai contenuti**: risposte e campi del verdetto si scrivono come sono battuti, perché sono il testo di Luca e non un formato da sanare.
  - [x] Quello che il documento **non** porta, e va scritto nel commento perché sono tutte colonne a una riga di distanza: `help_text` (il «cosa serve capire» è l'appunto di Luca a sé stesso, non il verbale della call), `options` e `answer_type` (dicono com'era fatto il *controllo*, non cosa è stato detto), `completion_status`, `total_questions` e l'avanzamento. Si compone esattamente quello che AC1 elenca.
  - [x] Interlocutore assente: la riga **non compare affatto**, e non compare come `Interlocutore: —` o `nessuno`. È la stessa scelta della riga nella card del cliente (`assessments-card.tsx:123-125`) e di D13: un valore non rilevato si mostra vuoto, mai come zero. È anche l'unico caso osservabile sui dati di oggi.
  - [x] Il documento finisce con **un solo** ritorno a capo e non ne accumula di doppi in coda: un file che finisce con tre righe vuote si nota subito e non si spiega.
  - [x] Test in `src/lib/assessment-markdown.test.ts`, e i casi che valgono più degli altri: **due blocchi omonimi adiacenti restano due gruppi** (è la ragione per cui `groupAnswersByBlock` esiste, e questa story è il suo secondo consumatore); una domanda con `content` a `null` compare col suo titolo (AC3); una con soli spazi conta come vuota, giudicata da `normalizeTextValue` importato e non riscritto; un `question_text` con un ritorno a capo **non** produce due righe dopo il `###`; un `block_title` con un ritorno a capo idem; un contenuto che comincia con `#` resta com'è; l'intestazione senza interlocutore non porta la riga; un `Motivo` vuoto **non lascia il suo titolo**, mentre l'`Esito` c'è anche a `non_deciso`; l'esito si legge `sì condizionato` e mai `si_condizionato`; una scheda con zero risposte produce un documento che ha intestazione e verdetto e nessun blocco, senza lanciare.

- [x] **Task 3 — Il Route Handler** (AC: 1, 2, 4)

  - [x] File nuovo `src/app/(app)/clienti/[id]/schede/[assessmentId]/esporta/route.ts`. **In una cartella sua e non accanto a `page.tsx`**: un `route.ts` e un `page.tsx` non possono stare sullo stesso segmento. Il precedente di forma è `src/app/auth/callback/route.ts`.
  - [x] **Un Route Handler e non una server action**, e il commento in testa lo deve dire: AC2 chiede un *nome di file*, e il nome di un file scaricato lo decide `Content-Disposition`, che solo una risposta HTTP può portare. La strada alternativa — un'azione che restituisce la stringa e un componente `'use client'` che costruisce un `Blob` e un `URL.createObjectURL` — farebbe passare l'intero documento dal payload RSC per poi riscriverlo nel browser, e sarebbe più codice per fare meno.
  - [x] Firma `export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; assessmentId: string }> })`. `params` è una `Promise` come nelle pagine di questa cartella.
  - [x] `isUuid` sui due parametri prima di qualsiasi query, con la stessa ragione già scritta due volte in questa cartella: una colonna `uuid` fa rifiutare la query da Postgres su una stringa di altra forma, e un indirizzo storpiato è una scheda che non c'è. Risposta **404**.
  - [x] La sessione si apre come nelle due pagine sorelle: `createClient()`, `auth.getUser()`, e la distinzione fra «sessione assente» e «servizio irraggiungibile» — solo il primo caso vuol dire «sei fuori». Nessun `redirect('/accedi')`: chi non ha sessione lo ferma il proxy prima di arrivare qui (`proxy.ts:42-47`), e questo ramo risponde **401** in testo semplice.
  - [x] La lettura della scheda, con i due innesti sulla **stessa** richiesta:

    ```ts
    .select('call_date, verdict, verdict_reason, condition_text, verify_by, next_step, clients(name), people(first_name, last_name)')
    .eq('id', assessmentId)
    .eq('client_id', id)
    .maybeSingle()
    ```

    `.eq('client_id', id)` è correttezza e non sicurezza — la policy filtra comunque per proprietario — ma è quello che rende un indirizzo cucito a mano un 404 invece di un file che mente sul contesto. `maybeSingle` e non `single`, per il motivo già scritto due volte: «non esiste» e «non si è caricato» chiedono due risposte diverse. Scheda assente → **404**.
  - [x] **`people(...)` è un innesto nuovo di questo progetto e la sua forma va verificata, non dedotta** — è il tipo di cosa che né `build` né `typecheck` vedono, ed è la casella che la 2.1, la 4.1 e la 4.2 hanno pagato per imparare. Due cose da provare con una sonda PostgREST (Task 9): che il percorso **non sia ambiguo** — `assessments` ha una sola chiave esterna verso `people`, `assessments_interviewee_id_fkey` (`database.types.ts:146-152`), e se lo fosse la forma disambiguata è `people!assessments_interviewee_id_fkey(...)` — e che con `interviewee_id` a `null` l'innesto risponda `null` e non un oggetto vuoto o un elenco.
  - [x] La lettura delle risposte, con **le sole tre colonne che il documento rende**:

    ```ts
    .select('block_title, question_text, content')
    .eq('assessment_id', assessmentId)
    .order('position')
    .order('id')
    ```

    I due `.order` sono gli stessi della schermata di compilazione (`page.tsx:97-98`) e **devono restare gli stessi**: `answers.position` non è unica, quindi un `order by` su una colonna sola non definisce nessun ordine a parità di valore, e due ordinamenti diversi darebbero un file che elenca le domande in un ordine e uno schermo che le elenca in un altro. Il commento lo deve dire.
  - [x] Tre colonne e non sette: si leggono esattamente le colonne che si rendono, che è la regola già scritta tre volte in `src/lib/types.ts` — «un dato letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio».
  - [x] Le intestazioni della risposta riuscita, tutte e tre:
    - `Content-Type: text/markdown; charset=utf-8` — il `charset` non è decorativo, il documento è pieno di accenti.
    - `Content-Disposition: attachment; filename="<nome>"` — con il nome del Task 1, che per costruzione è `[a-z0-9-]` e `.md`, quindi non serve né `filename*=UTF-8''` né nessuna forma di codifica: il commento deve dire che la semplicità è **una conseguenza dello slug**, non una scorciatoia.
    - `Cache-Control: no-store` — il documento porta il testo scritto dai clienti, che è la categoria più sensibile del sistema (`kb-0.md` §4), e non deve restare in nessuna cache intermedia.
  - [x] **Un errore sulla lettura delle risposte è un 500 e non un file con meno domande dentro, ed è l'unico punto in cui questa rotta si comporta diversamente dalla pagina sorella.** `page.tsx:100-105` **registra** l'errore delle risposte e rende la schermata con l'elenco vuoto, perché a schermo il resto della pagina serve comunque e l'utente vede che manca qualcosa. Qui no: un file consegnato con dentro l'intestazione, il verdetto e zero domande **non dice** di essere incompleto, si salva in una cartella e a tre mesi di distanza è indistinguibile da una scheda in cui nessuno aveva risposto — cioè esattamente il caso di AC3. I due rami sono due decisioni diverse per una ragione sola, e il commento la deve portare: **una schermata può essere parziale, un documento no**.
  - [x] **Nessun `export const dynamic` e nessun `revalidate`.** La rotta legge i cookie tramite `createClient()`, quindi Next la tratta già come dinamica: aggiungere `force-dynamic` sarebbe una riga che non cambia niente e che il prossimo lettore prenderebbe per necessaria. Il `no-store` qui sopra riguarda le cache **fuori** dall'applicazione ed è un'altra cosa.
  - [x] **Gli errori rispondono `text/plain; charset=utf-8` in italiano, e la scelta si dichiara.** Un Route Handler non è una schermata e non ha i quattro stati: quello che si può fare è che il corpo dica cosa fare invece di mostrare una traccia (`kb-0.md` §3, NFR16). Un errore di lettura risponde **500** con «L'esportazione non è riuscita. Riprova fra un momento.»; scheda assente **404**; sessione assente **401**. Nessun `Content-Disposition` sui rami d'errore, o il browser scaricherebbe un file che contiene un messaggio d'errore.
  - [x] I log portano solo `code` e `message` e **mai** il documento né `details`: `details` conterrebbe i valori delle righe, cioè il testo delle risposte (`kb-0.md` §3 e §15). È la stessa riga già scritta in tutte e tre le pagine di questa cartella.
  - [x] **Nessun `revalidatePath`, nessuna scrittura, nessun `'use server'`.** Questa story legge.

- [x] **Task 4 — Il comando sulla schermata** (AC: 1, 2)

  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx`, dentro `AssessmentHeader`: il comando entra in `.page-header__actions`, **accanto** a `CompletionButton` e dopo di lui.
  - [x] **Un `<a href>` normale e mai `<Link>`.** Va scritto nel commento perché ogni altra navigazione di questo software passa da `next/link` e l'abitudine è più forte della differenza: `<Link>` fa una navigazione lato client e non scarica niente. Nessun attributo `download`: con `Content-Disposition: attachment` è il server a dire il nome, e un `download` senza valore lo prenderebbe comunque da lì — ma nel ramo d'errore trasformerebbe un messaggio in un file scaricato.
  - [x] Etichetta `Esporta`, `btn btn--secondary`. Non `btn--primary`: l'unica azione primaria di questa schermata è il `Salva` della barra ancorata (UX-DR10), ed è la stessa riga già scritta su `CompletionButton` (`completion-button.tsx:20-21`).
  - [x] **`.btn` su un'ancora funziona già e non serve nessuna regola nuova in `globals.css`**: la classe è `display: inline-flex` senza niente che presupponga un `<button>`, ed è già portata da cinque `<Link>` — `not-found.tsx:17`, `clienti/page.tsx:138`, `163`, `170`, `filters-form.tsx:117`. Va scritto qui perché è la domanda che viene in mente guardando il comando, e la risposta sbagliata è aggiungere CSS.
  - [x] Il comando sta **dentro** il ramo condizionale che già governa `.page-header__actions`, cioè quello in cui la scheda si è letta (`page.tsx:210`). Nello stato d'errore non c'è: non si esporta una scheda che non si è riusciti a leggere, e un comando che porta a un 500 è peggio di un comando che non c'è.
  - [x] **Una conseguenza va scritta nel commento invece di essere scoperta:** nel ramo d'errore del Route Handler il browser **naviga via** dalla schermata di compilazione, che è la schermata con ventiquattro timer di salvataggio automatico potenzialmente armati. Non è una perdita nuova né peggiore delle altre — l'ascoltatore `visibilitychange` della 3.4 (`use-editable-field.ts`) fa partire la scrittura quando la pagina passa a `hidden`, che è quello che succede navigando via — ma è un percorso in più verso quella finestra, e il ledger lo riceve (Task 7). Nel ramo riuscito la navigazione **non** avviene: `attachment` scarica e lascia la pagina dov'è.
  - [x] `AssessmentHeader` riceve già `assessmentId` e `clientId`: l'indirizzo si compone da quelli, senza nessuna prop nuova.

- [x] **Task 5 — Lo scheletro conta i comandi** (AC: —, ma è NFR9 e UX-DR11)

  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx`: `.page-header__actions` riserva oggi **tre** scheletri — 80, 36, 146×40 — e da questa story i figli diventano quattro. Senza il quarto, il blocco è ancorato a destra e cresce verso sinistra, quindi la data scivola all'arrivo dei dati: è esattamente il salto che la code review della 3.6 ha **misurato** su questo file, 209,4px a 1280 e 147,9px a 375 con 80 riservati contro 289,4 reali.
  - [x] La larghezza del quarto scheletro si prende **dal pulsante vero e non a occhio**, con la stessa forma con cui sono stati scelti gli altri tre: si misura `Esporta` come `btn btn--secondary` nella riproduzione statica del Task 6 e si riserva quel numero arrotondato in eccesso. Altezza 40 e `borderRadius: var(--r-md)`, come lo scheletro del pulsante che c'è già.
  - [x] Il numero misurato si scrive nel commento accanto agli altri, e lo scarto residuo si dichiara: è la forma che quel commento ha già.

- [x] **Task 6 — L'intestazione a 375px, e cosa cede** (AC: —, ma è NFR4)

  - [x] **L'ordine dei tre Task dell'intestazione è 4, 6, 5 e non è l'ordine dei numeri:** il Task 4 scrive il comando, il Task 6 lo misura, il Task 5 riserva il numero misurato. Misurare prima di scrivere il markup vorrebbe dire misurare un pulsante immaginato, che è quello che questa story chiede di non fare.
  - [x] Riproduzione statica servita in locale con il `globals.css` vero e i due font Geist, come nella 3.3, 3.4, 3.5, 3.6, 4.1 e 4.2, e valori da `getComputedStyle` e `getBoundingClientRect` invece che giudizi.
  - [x] **I numeri di partenza sono già scritti e non vanno riscoperti** (`globals.css:236-253`, `loading.tsx`): a 375px lo spazio utile di `.page-header__actions` è **343** — 375 meno i 16+16 di `.main` sotto i 720 — e i tre figli di oggi misurano data **78**, parola **32,7** (`bozza`) o **35,7** (`chiusa`), pulsante **146,6 × 40**, cioè **289,4** coi gap. Con `flex-wrap` la pagina misurava `documentElement.scrollWidth` **375** su `clientWidth` 375, eccedenza **0**.
  - [x] Cosa si misura, e i numeri si scrivono: `documentElement.scrollWidth` a 375 e a 1280, con i **quattro** figli e con la parola più lunga (`chiusa`); l'altezza dell'intestazione prima e dopo, perché il quarto figlio quasi certamente manda qualcosa a capo e una riga in più sposta tutto il contenuto sotto; e la stessa coppia sul solo `loading.tsx`, che è un secondo blocco con le stesse regole.
  - [x] **`flex-wrap: wrap` è già sulla regola e non si tocca**, ed è probabile che basti: la riga di commento sopra `.page-header__actions .field__error` dice per esteso che «`flex-wrap` serve al pulsante prima che all'errore» e che chi togliesse la riga d'errore non può togliere anche il `wrap`. Se la misura è pulita, si scrive il numero e **non si tocca `globals.css`**.
  - [x] **Se la misura rompe** — cioè se la pagina scorre di lato a 375 — non si inventa niente e non si tocca `.main`: si scrive il numero, ci si ferma e lo si dice. La riga di `.main` è quella che la 4.2 ha misurato su una schermata sola e che il ledger assegna alla 5.2, e questa è una delle schermate non misurate: allargare qui la decisione di quella story sarebbe deriva del piano.
  - [x] Si misura anche **il bersaglio tattile** del comando nuovo, perché è un dato e non un giudizio: `.btn` è alto **40** e la soglia di UX-DR14 è 44. Non si corregge qui — è la voce a ledger numero uno, assegnata alla 5.2 — ma il quarto pulsante sotto soglia su questa schermata si **conta**, perché la voce elenca i pulsanti che governa.

- [x] **Task 7 — Il ledger** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 4-3-esportare-una-scheda-in-markdown (11 agosto 2026)`, appesa **in fondo** al file. Una voce nuova è un bullet solo per quanto lungo: titolo in grassetto che dice **il difetto e non il rimedio**, con `percorso/file.ts:righe`, poi la prosa, poi `Rimandato:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**.
  - [x] **Una voce esistente non si riscrive: le si appende un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 4.3, l'11 agosto 2026**:` — e la barratura è solo per una voce chiusa per intero. Ogni riferimento a riga che l'annotazione scrive va **verificato dopo** le modifiche di questa story e non prima: è il difetto che la revisione della 4.2 ha trovato quattro volte in un Task il cui scopo dichiarato era correggerne altri.
  - [x] **Voce del `block_id` non copiato dentro `answers`** (sezione «code review of 3-2»): **si annota, ed è l'annotazione obbligatoria di questa story.** Quella voce chiude dicendo, testualmente, «chi la riprende alla 4.2 o alla 4.3 cominci chiedendo **su quale progetto** si verifica, prima di chiedere quante righe ci sono», e osserva che «questa voce non sta aspettando un numero, lo sta perdendo». L'annotazione deve fare tre cose e in quest'ordine: **dichiarare il progetto** su cui si è verificato; **scrivere i due numeri** — righe di `answers` e quante hanno contenuto — misurati **dopo** la verifica di sessione; e dire se il criterio che la voce si è data è soddisfatto o no. Questa è la prima story in cui una verifica onesta **non può** evitare di scrivere risposte, perché AC1 chiede una scheda compilata e AC3 una con domande saltate: le due cose insieme sono, letteralmente, una scheda con alcune risposte piene e altre no.
  - [x] **Voce «Nessuna normalizzazione Unicode»** (sezione «code review of 1-4»): **si annota.** Quella voce dice che `normalizeTag` e `normalizeClientName` non normalizzano le forme Unicode e che «si chiude aggiungendo `.normalize('NFC')` in un posto solo». Questa story aggiunge un **terzo** punto di normalizzazione, e in forma **diversa**: `assessmentFileName` usa `NFD` di proposito, perché per togliere i diacritici bisogna prima separarli. Non è una contraddizione — sono due lavori diversi, la forma di confronto e la forma del nome di file — ma sono tre punti dove la stessa parola può prendere tre forme, e chi chiuderà la voce deve saperlo prima di scrivere «in un posto solo».
  - [x] **Voce dei `.btn` a 40px** (sezione «code review of 1-1»): **si annota solo con il numero**, cioè quanti pulsanti sotto soglia ha ora questa schermata dopo il Task 6. Niente prosa nuova: la voce è già lunghissima e il suo punto di ripresa (5.2) non cambia.
  - [x] **Voce `.main { min-width: 0 }`** (sezione «implementazione della story 4-2»): **si annota se e solo se il Task 6 produce la misura.** Quella voce dice che la riga vale per ogni schermata e ne è stata misurata una, e nomina **la compilazione come quella da guardare per prima**, «perché è la schermata che si usa su tablet (NFR4) ed è l'unica con ventiquattro campi in colonna». Il Task 6 misura quella schermata a 375px con la stessa forma di misura che la voce prescrive: se il numero c'è, si scrive, anche se è buono. Un numero che conferma vale quanto uno che smentisce, e questa voce ne aspetta uno.
  - [x] **Voce nuova, se e solo se il Task 4 la produce:** il percorso d'errore dell'esportazione che porta via dalla schermata di compilazione. Si scrive **solo** se durante l'implementazione risulta che l'ascoltatore `visibilitychange` della 3.4 non copre quella navigazione; se la copre, non nasce nessuna voce e lo si dichiara nel Dev Agent Record. Una voce che descrive un difetto che non c'è è peggio di una voce che manca.
  - [x] Ogni scostamento dal conteggio previsto — voci nuove, annotazioni in più o in meno — si dichiara nel Dev Agent Record **col motivo**. Nel File List la riga prende la forma già usata: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni, <k> chiuse`.

- [x] **Task 8 — La forma del file, scritta dove si cerca** (AC: 1, 2)

  - [x] `docs/prd-v1.md` §4, blocco `### Esportazione`: oggi dice «un file markdown con intestazione (cliente, data, interlocutore), le risposte raggruppate per blocco con il testo della domanda, e il verdetto per esteso. Nome file prevedibile: `cliente-data-prequalifica.md`». È vero e resta, ma «prevedibile» è una promessa senza una definizione, e questa story la definisce.
  - [x] Si aggiunge **quello che il documento non dice a chi non ha letto il codice**, e sono tre cose: i livelli dei titoli (`#` il documento, `##` il blocco e il verdetto, `###` la domanda e il campo del verdetto), la forma esatta della data nel nome del file (**ISO**, `pino-2026-08-10-prequalifica.md`), e cosa **non** entra nel file — `help_text`, opzioni, tipo di risposta, stato di compilazione e avanzamento. **Poche righe, non un paragrafo**, e con la data della decisione, come ogni altra correzione di questo repository (`kb-0.md` §8).
  - [x] **Nessun altro documento cambia, e va detto perché**, o la prima revisione lo cercherà: `database.md` non si tocca perché questa story non tocca lo schema e non cambia nessuna definizione di calcolo; `design-system.md` non si tocca perché il comando è un `btn--secondary` esistente in un contenitore esistente e nessuna forma nuova nasce; `00-contesto-e-decisioni.md` non riceve una decisione nuova — deciso l'11 agosto 2026 insieme alle due domande — perché la forma della data vive nel commento di `export-filename.ts` e nella riga del PRD, che sono i due posti dove la si cerca, e una decisione registrata che duplica una convenzione produce due copie destinate a divergere (è l'argomento di D24).

- [x] **Task 9 — Verifica** (AC: 1, 2, 3, 4)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi partono da **237** e crescono dei soli test dei due moduli nuovi: **nessuna migrazione**, quindi `migrations.test.ts` non cresce. **Il numero atteso si dichiara prima di eseguire**, non dopo.
  - [x] **Grep di AC4, che è l'unico modo automatico di provare un'assenza**: `grep -rn "questions\|question_blocks\|questionnaires" src/lib/assessment-markdown.ts src/lib/export-filename.ts "src/app/(app)/clienti/[id]/schede/[assessmentId]/esporta/route.ts"` deve restare a **zero righe fuori dai commenti**. Prova la cosa che AC4 chiede e che si rompe scrivendo una riga in più, non togliendone una.
  - [x] **Grep del perimetro sulle etichette**: `grep -rn "VERDICT_LABELS\|VERDICT_FIELDS" src/` deve toccare solo `verdict.ts`, `verdict.test.ts`, `verdict-pill.tsx`, `verdict-field.tsx` e **i due file nuovi di questa story**, cioè nessun elenco nuovo. Se compare una mappa di etichette dentro `assessment-markdown.ts`, qualcuno ha copiato invece di importare.
  - [x] Grep di perimetro coi numeri attesi dichiarati **prima**, e la condizione da provare è «solo righe preesistenti» e **non** «solo i file dichiarati»: è la patch che la 4.1 ha pagato in revisione e che la 4.2 ha ripetuto.
  - [x] **AC2 provata sull'uscita vera e non solo sui test:** si esegue la richiesta e si legge l'intestazione `Content-Disposition` **grezza**, byte per byte, verificando che il nome corrisponda a `/^[a-z0-9-]+\.md$/`. Poi la prova che conta: si ripete con un nome di cliente che contiene una virgoletta doppia e un `\r\n`, scritto **in transazione annullata**, e si verifica che l'intestazione non ne porti traccia. È la sola prova che la lista di ammessi fa quello che dice.
  - [x] **AC1, AC3 e AC4 provate sul documento vero**, non sul modulo: si esporta una scheda con alcune risposte piene e altre vuote e si legge il file. Si verifica che i blocchi siano nell'ordine dell'intervista, che ogni domanda ci sia — **il conteggio dei `###` deve essere il numero di righe di `answers` più i campi del verdetto resi** — e che l'intestazione porti le tre righe.
  - [x] **AC4 provata nel modo che la rende falsa se è falsa:** si riscrive dall'interfaccia il testo di una domanda che quella scheda contiene (funzione della 2.4) e se ne disattiva un'altra (funzione della 2.6), poi si riesporta. Il file deve riportare **il testo vecchio** e contenere ancora la domanda disattivata. Fatto in transazione annullata a database, o fatto e poi disfatto, e dichiarato quale delle due.
  - [x] Sonda SQL in transazione annullata, con la stessa forma delle sei story precedenti — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`. Serve a due cose che l'interfaccia non produce da sola: **una scheda con un interlocutore** (oggi `interviewee_id` è `null` sull'unica scheda) e **una scheda con contenuti di ogni forma** — un testo su più righe, uno che comincia con `#`, uno di soli spazi.
  - [x] **La forma PostgREST dei due innesti**, che né `build` né `typecheck` verificano: provata con la chiave pubblicabile e senza sessione, come nella 2.1, 4.1 e 4.2. La `select` vera deve rispondere **200** con `[]` (la sicurezza a livello di riga filtra tutto, che è la risposta giusta), e una colonna inventata dentro `people(...)` deve dare **`42703`** con l'alias che PostgREST assegna all'innesto, che è la prova che il join viene generato davvero invece di essere ignorato. **Se l'innesto risultasse ambiguo, si passa alla forma con il nome della chiave esterna e lo si dichiara**, invece di aggirarlo con una seconda query.
  - [x] Le tre risposte d'errore si provano: **404** su un `assessmentId` che non esiste, **404** su una scheda che esiste ma sotto un altro cliente, e il corpo in italiano senza `Content-Disposition`.
  - [x] Le misure del Task 6 stanno nel Dev Agent Record coi numeri, non con aggettivi.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione dell'11 agosto 2026, tre strati in parallelo: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Quattro reperti sono stati portati a Luca come decisioni e chiusi lo stesso giorno — due a ledger, due da correggere. Sette scartati come rumore.

**Le quattro AC sono soddisfatte, e per la prima volta in tre story tutti i numeri del Dev Agent Record che si possono ricalcolare tornano.** 267 test verdi (13 + 17 nuovi sui 237 della baseline), `typecheck` senza uscita, `build` riuscito con la rotta come `ƒ /clienti/[id]/schede/[assessmentId]/esporta`, cioè dinamica senza `force-dynamic` come dichiarato. Il grep di AC4 dà due sole righe, tutte e due dentro commenti. Il grep del perimetro sulle etichette tocca i sei file della baseline più `assessment-markdown.ts`. Il File List coincide con `git status` file per file, e i riferimenti di riga delle annotazioni al ledger sono stati verificati **dopo** le modifiche di questa story, che era la casella che la 4.2 aveva pagato.

**AC2, la riga di sicurezza, regge nella forma in cui doveva reggere.** L'invariante `/^[a-z0-9-]+\.md$/` è stata provata dall'Acceptance Auditor su trecentomila ingressi casuali costruiti con virgolette, `\r`, `\n`, separatori di percorso, surrogati spaiati, zero-width e caratteri non latini: nessuna eccezione, compreso il caso non ovvio in cui `toLowerCase()` di `İ` reintroduce un combinante **dopo** la rimozione dei combinanti — la lista di ammessi lo cattura comunque, che è esattamente il punto di una lista di ammessi. Il test sulla forma decomposta non è vacuo: `od -c` mostra due sequenze di byte davvero diverse.

**I quattro reperti che restano aperti stanno tutti fuori dal perimetro che la story si era data, e nessuno dei quattro si chiude senza una tua decisione.** Due riguardano il markdown come formato — il contenuto di una risposta può riscrivere la struttura del documento, e un interlocutore senza nome fa scrivere al software una frase dentro il tuo documento — uno riguarda il momento in cui si preme il comando, e uno lo slug su lettere che NFD non decompone.

- [x] [Review][Defer] **Il contenuto di una risposta può riscrivere la struttura del documento e contraddire il verdetto** — `src/lib/assessment-markdown.ts:103`. Il contenuto entra grezzo, senza escape e senza delimitatore, mentre i titoli usano `#`/`##`/`###`. Sonda eseguita: una risposta che contiene un'agenda incollata con dentro `## Verdetto`, `### Esito` e `sì` produce un file con **due** sezioni `## Verdetto`, la prima delle quali dichiara `sì` mentre il verdetto vero, più sotto, è `no`. La decisione «il contenuto si scrive com'è battuto» è esplicita e motivata (Task 2, Trappola 5), ma la motivazione che la regge è «quello che non deve succedere è che il *documento* menta sulla propria struttura» — e questo è il caso in cui ci mente. Le tre strade: lasciare così e dichiarare il caso; far scendere di un livello i titoli del documento non risolve (il contenuto può portare qualsiasi livello); l'unica che chiude davvero è aggiungere uno spazio unificatore davanti alle righe del contenuto che cominciano con `#`, che è un carattere in più su una riga rara e conserva il testo alla lettura. **Deciso l'11 agosto 2026: voce a ledger**, perché la decisione del Task 2 è esplicita e il caso richiede letteralmente `## Verdetto` dentro una risposta. Il file resta il testo esatto.
- [x] [Review][Defer] **`Esporta` non svuota i salvataggi in sospeso: il file può nascere senza l'ultima risposta battuta** — `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx:230` contro `src/lib/use-editable-field.ts:256,280`. Il clic sull'`<a>` fa il `blur` del campo e la GET parte in parallelo alla server action di scrittura: nessun ordine è garantito. Il caso deterministico è peggiore della corsa — se una scrittura è già `pending`, `onBlur` non scrive e mette il testo in `owedExit.current`, onorato **dopo** che la GET è già partita. Si scrive per un'ora, si preme `Esporta` mentre l'indicatore dice `Salvataggio…`, e il file esce con quella domanda vuota, senza nessun segnale. Il lavoro non si perde (resta a database e una riesportazione lo prende), ma il documento consegnato è incompleto in silenzio. Il rimedio costa un componente client che attende lo svuotamento prima di seguire il collegamento, cioè una forma che nessuna AC di questa story chiede. **Deciso l'11 agosto 2026: voce a ledger.**
- [x] [Review][Patch] **Un interlocutore senza nome fa scrivere al software `Persona senza nome` dentro il documento** — `src/app/(app)/clienti/[id]/schede/[assessmentId]/esporta/route.ts:102` con `src/lib/person-fields.ts:68`. `first_name` e `last_name` sono tutti e due nullabili e la creazione di una persona non impone nessuno dei due: se l'interlocutore è una di quelle righe, l'innesto **non** è `null`, la guardia non scatta e l'intestazione diventa `**Interlocutore:** Persona senza nome`. È lo stesso tipo di frase che questa story rifiuta per la domanda saltata — «sarebbe il software che scrive una frase dentro un documento che porta la firma di Luca» (NFR6, NFR7) — e collide con D13, dove un valore non rilevato si mostra vuoto. Il ripiego di `personDisplayName` è nato per l'etichetta accessibile di un pulsante, non per un documento consegnabile. Il Task 2 imponeva però quell'importazione: il comportamento è ereditato, non inventato qui. Lo stesso rimedio chiude anche il caso in cui `intervieweeName` è una stringa che `oneLine` svuota (`assessment-markdown.ts:87`), oggi irraggiungibile ma affidato al chiamante e non al modulo. **Deciso l'11 agosto 2026: la riga `Interlocutore` si omette** quando la persona non ha né nome né cognome, come già succede quando l'interlocutore non c'è (D13).
- [x] [Review][Patch] **Lo slug non toglie i diacritici, scarta la lettera intera su tutto ciò che NFD non decompone** — `src/lib/export-filename.ts:12,22`, contro il commento a `:11` che promette «toglie i diacritici invece di scartare la lettera». Verificato eseguendo lo slug: `Ørsted` → `rsted`, `Bjørn Larsen` → `bj-rn-larsen`, `Łukasz` → `ukasz`, `Straße GmbH` → `stra-e-gmbh`, `Ærø AS` → `r-as`. `Ø`, `Ł`, `ß`, `Æ` e `Þ` non hanno decomposizione canonica, quindi cadono come cadrebbe una virgola — e `NFKD` non cambia niente per loro (provato). I test guardano solo `à`, cioè l'unico caso a cui ha pensato chi ha scritto il codice: è esattamente l'errore che il commento in testa a `export-filename.test.ts` dichiara di voler evitare. Il minimo è correggere il commento, che oggi promette una cosa falsa; la chiusura vera è una mappa di traslitterazione di sei righe (`Ø→o`, `Ł→l`, `ß→ss`, `Æ→ae`, `Ð→d`, `Þ→th`) prima del passaggio a NFD. L'invariante di sicurezza regge in tutti e due i casi. **Deciso l'11 agosto 2026: la mappa e il commento corretto**, perché `kb-0.md` §2 vuole le venti righe invece della dipendenza e il commento oggi promette una cosa falsa.
- [x] [Review][Patch] **I commenti nel codice nuovo sono blocchi di prosa con dentro le misure, contro la regola che hai dato l'11 agosto** [`src/lib/assessment-markdown.ts:1-13,44-49,54-63,76-88`; `src/lib/export-filename.ts:1-9,26-35`; `src/app/(app)/clienti/[id]/schede/[assessmentId]/esporta/route.ts:11-19`; `loading.tsx:39-43`; `page.tsx:223-229`] — le misure, i numeri e il ragionamento per esteso vanno nel Dev Agent Record, che li ha già tutti. Due cose ci sono finite dentro e sono sbagliate, il che è il motivo per cui la regola esiste: `loading.tsx:40` cita «0,6px a 375 e 3,9px a 1280» e tre righe sotto dice «somiglia a `bozza`», ma 0,6 e 3,9 sono i valori con la scheda **`chiusa`** — con `bozza` sono 0,8 e 5,1, e la voce a ledger li scrive correttamente entrambi; `export-filename.ts:8` afferma che uno zero-width «cade da sé», mentre il test a `:69` prova che diventa **un trattino** (`pi​no` → `pi-no`), cioè due nomi visivamente identici danno due file diversi. Da tenere: il perché non ovvio, una o due righe — l'`<a>` invece del `<Link>`, la lista di ammessi invece della lista di vietati, il 500 sulle risposte invece del file parziale, i due `.order` che devono restare gli stessi.
- [x] [Review][Patch] **Il nome di un test afferma il contrario di un difetto ancora aperto a ledger** [`src/lib/assessment-markdown.test.ts:62`] — si chiama «lascia due gruppi a due blocchi omonimi **adiacenti**», ma la fixture è `Dati / Altro / Dati`, cioè due corse **non** adiacenti. Con due blocchi davvero adiacenti `groupAnswersByBlock` (`answer-groups.ts:35-40`) produce **un gruppo solo**, che è testualmente la voce aperta in `deferred-work.md` sezione «code review of 3-2»: «due blocchi omonimi adiacenti diventano una card sola, per sempre». Il test è giusto per ciò che esercita — è il caso che una mappa fonderebbe — ed è il nome a essere falso, ripetendo la formulazione sbagliata del Task 2. Chi riprenderà quella voce può leggere questo test come prova che il difetto non c'è.
- [x] [Review][Patch] **`COMBINING` è scritta con i caratteri combinanti letterali** [`src/lib/export-filename.ts:12`] — `const COMBINING = /[̀-ͯ]/g`. A livello di code point è davvero `[U+0300-U+036F]`, ma nell'editor i due estremi si attaccano graficamente alle parentesi quadre e la riga è illeggibile in revisione. Qualunque strumento che normalizzi il file, o un copia-incolla che riordini le marche combinanti, cambia l'intervallo in silenzio, e il fallimento sarebbe un nome di file diverso invece di un errore. Va scritta con le sequenze di escape: `/[\u0300-\u036F]/g`.
- [x] [Review][Patch] **I rami d'errore non portano `Cache-Control: no-store`** [`.../esporta/route.ts:25-27`] — il ramo riuscito lo mette a `:121` con la sua ragione; `plain()` no. Un 404 o un 401 su questo indirizzo può restare in una cache intermedia e rispondere al posto del file quando il guasto è passato: chi riprova legge lo stesso messaggio e conclude che l'esportazione è rotta. Costa una riga dentro `plain`.
- [x] [Review][Patch] **Due asserzioni dei test passano anche su un documento rotto** [`src/lib/assessment-markdown.test.ts:57,143`] — `assert.equal(doc.indexOf('## Contesto') < doc.indexOf('## Obiettivo'), true)`: se `## Contesto` sparisse dal documento, `indexOf` risponde `-1`, `-1 < 50` è vero, e il test resta verde su un documento che ha perso un blocco intero. Va verificata prima l'esistenza di entrambi. Stessa forma a `:143`, `!doc.includes(...) || ...`, che è un'asserzione a due rami dove ne serve uno.
- [x] [Review][Patch] **Una misura che il Task 6 chiede per nome non è stata presa** [Task 6, terza sotto-casella; Dev Agent Record, tabella delle misure] — «e la stessa coppia sul solo `loading.tsx`, che è un secondo blocco con le stesse regole», dove la coppia è `documentElement.scrollWidth`/`clientWidth`. Il record riporta l'**altezza** dello scheletro (72/60 → 128/60) ma non la sua eccedenza orizzontale. I quattro scheletri riservano 80+36+146+87 = 349 più 48 di gap = 397 contro i 343 utili: che vadano a capo senza far scorrere la pagina è una previsione, e questa è la story che vieta le previsioni non misurate (Trappola 10). Nessuna casella della «Verifica di sessione» chiede lo scorrimento laterale sullo stato di caricamento: o si misura, o la casella si aggiunge.
- [x] [Review][Patch] **Refuso** [`src/lib/export-filename.ts:30-31`] — «l'ISO è l'unica forma che rende quel / l'ordine cronologico» → «quell'ordine».
- [x] [Review][Defer] **Due schede dello stesso cliente nello stesso giorno danno lo stesso nome di file** [`src/lib/export-filename.ts:37-39`] — non c'è nessun discriminante della scheda, e il software permette più schede per cliente e per giorno. La seconda esportazione non si distingue dalla prima: il browser la rinomina in `… (1).md` o la sovrascrive. Dalla stessa radice, ma più raro, `Rossi & Figli` e `Rossi Figli` collidono, e così ogni coppia di nomi non latini che riducono al ripiego `cliente`. Il commento a `:33-34` rifiuta il troncamento proprio per non far collidere due clienti, e la collisione entra dalla normalizzazione. **Rimandato: aggiungere un discriminante contraddice la lettera di AC2**, che prescrive la forma `cliente-data-prequalifica.md`, e cambiarla è una decisione sull'AC e non una correzione. Da riprendere il giorno che una seconda scheda nello stesso giorno succede davvero.
- [x] [Review][Defer] **`Esporta` è un collegamento travestito da pulsante e non risponde come tale** [`page.tsx:230`] — accanto a `Chiudi la scheda`, che è un `<button>`, l'`<a class="btn btn--secondary">` è indistinguibile a vista, ma da tastiera si attiva solo con Invio: chi lo raggiunge con Tab e preme la barra spaziatrice fa scorrere la pagina e conclude che il comando è rotto. Manca anche qualunque indicazione, testuale o `aria`, che l'azione scarichi un file invece di aprire una schermata. **Rimandato: l'`<a>` è prescritto dal Task 4** e per una ragione che resta valida — un `<Link>` non scarica niente — quindi il rimedio non è cambiare elemento ma aggiungere l'affordance. **Da riprendere con la Story 5.2**, la passata di accessibilità, insieme alle altre tre voci che guardano questa stessa intestazione.
- [x] [Review][Defer] **Nello stato d'errore della chiusura scheda, `Esporta` finisce da solo su una terza riga sotto l'errore** [`page.tsx:230` con `src/app/globals.css:254`] — `CompletionButton` emette, quando la scrittura fallisce, un `<p className="field__error">` con `flex-basis: 100%`, che sta fra il pulsante e `Esporta`: l'intestazione diventa riga 1 data + parola + pulsante, riga 2 il messaggio a piena larghezza, riga 3 `Esporta` da solo, visivamente agganciato a un errore che non lo riguarda. **Rimandato: il Task 4 prescrive l'ordine** («accanto a `CompletionButton` e **dopo** di lui») e le Completion Notes lo dichiarano già; spostare l'`<a>` prima chiuderebbe il caso in una riga ma contraddice la casella. **Da riprendere con la Story 5.2**, che guarda comunque questa intestazione.
- [x] [Review][Defer] **A sessione scaduta il comando non dà un errore, porta via la schermata di compilazione** [`page.tsx:230` con `src/proxy.ts:42-47`] — la rotta non è in `PUBLIC_PATHS` e il matcher la copre, quindi il proxy intercetta la GET **prima** del Route Handler e risponde con un redirect a `/accedi`. Essendo un `<a href>` di primo livello, il browser lo segue e la pagina di compilazione viene sostituita a metà call. Il ramo `401` di `route.ts:53` è quindi quasi irraggiungibile da un browser, e il Dev Agent Record lo ha misurato da sé (307 su tutte e due le prove). **Rimandato: è la finestra che la 3.4 ha già dichiarato e accettato** — l'ascoltatore `visibilitychange` «restringe la finestra, non la chiude» (`use-editable-field.ts:188`) — e questa story vi aggiunge un percorso, non un difetto nuovo. Le Completion Notes decidono per questo motivo di non aprire una voce, ed è la decisione giusta; qui resta scritto perché il *caso della sessione scaduta* non era stato guardato, e il rimedio se un giorno servisse è `target="_blank"` sull'`<a>`, che non smonta mai il documento corrente.
- [x] [Review][Defer] **Un 429 o un altro 4xx di `getUser()` viene riportato come «Non sei più collegato»** [`.../esporta/route.ts:48-53`] — `429` non è `undefined` e non è `>= 500`, quindi il primo ramo non scatta e si cade su `if (!user)` con `NO_SESSION`. L'utente è collegato benissimo e gli si dice di riautenticarsi per un guasto passeggero — e questo progetto la quota la incontra davvero, sull'invio dell'email di accesso. **Rimandato: la condizione è copiata identica dalle due pagine sorelle** (`schede/[assessmentId]/page.tsx:42`, `clienti/[id]/page.tsx:39`), quindi non nasce qui e correggerla solo qui creerebbe tre punti con due comportamenti. Da chiudere nei tre insieme, restringendo il ramo di sessione assente allo `AuthSessionMissingError` invece che al complemento del 5xx.

**I sette reperti scartati, perché la lista serve a chi rileggerà.** L'innesto `clients` che risponde `null` e fa cadere la rotta con un `TypeError`: non è raggiungibile, perché `open_assessment` scrive `owner_id` e `client_id` nella stessa transazione e l'`exists` sui clienti gira già sotto le policy. Uno slug della data che si svuota e fa sparire la data dal nome: `call_date` è `date not null` e PostgREST la rende sempre `AAAA-MM-GG`. Un `verify_by` che `formatCallDate` non sa leggere e che fa sparire il campo col suo titolo: ci arriva solo il valore `infinity`, che l'interfaccia non produce. Un `### Esito` che sparisce su un verdetto vuoto: il vincolo `check` lo rende impossibile. Il parametro `request` dichiarato e mai usato: è posizionale e non si può togliere. L'osservazione che `MarkdownAnswer` «conosce lo schema» benché il commento dica di no: è vera come stile e sparisce con la potatura dei commenti. E il fatto che i contenuti passino da `normalizeTextValue`, quindi con gli spazi ai bordi tolti, contro la lettera del Task 2 («si scrivono come sono battuti»): lo scostamento è necessario — senza, il documento accumula righe vuote e la regola del ritorno a capo finale cade — ed è già dichiarato in commento.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| Il raggruppamento per blocco, generico e con la corsa consecutiva | `src/lib/answer-groups.ts` | 3.2 |
| Le copie della domanda dentro la risposta — testo, blocco, posizione | `answers`, migrazione `0005` | 1.x |
| Le copie del tipo, delle opzioni e dell'aiuto | `answers`, migrazione `0015` | 3.2 |
| Le etichette dei quattro esiti e i cinque campi del verdetto | `VERDICT_LABELS`, `VERDICT_FIELDS`, `src/lib/verdict.ts` | 3.5 |
| Il giorno civile reso `gg/mm/aaaa` | `formatCallDate`, `src/lib/format-date.ts` | 3.1 |
| Il nome da dire di una persona | `personDisplayName`, `src/lib/person-fields.ts` | 1.5 |
| La definizione di «vuoto» condivisa fra tutti i lati | `normalizeTextValue`, `src/lib/client-fields.ts` | 1.2 |
| L'ordine delle risposte dentro una scheda, `position` poi `id` | `schede/[assessmentId]/page.tsx:97-98` | 3.2 |
| Un Route Handler come precedente di forma | `src/app/auth/callback/route.ts` | impalcatura |
| L'intestazione con i suoi tre figli e il suo `flex-wrap` misurato | `globals.css:229-253`, `schede/[assessmentId]/loading.tsx` | 3.6 |

**Questa story scrive più file della 4.2 e ha meno da decidere.** Quattro AC su quattro sono già rappresentabili con quello che il database contiene: AC4 è vera perché `answers` porta le copie, AC1 e AC3 sono la lettura di tre colonne, AC2 è una stringa. La parte difficile è altrove — sta in due punti dove sbagliare non produce nessun errore, e sono l'iniezione nell'intestazione HTTP e la struttura del markdown che il testo di una persona può cambiare.

### Il meccanismo: un Route Handler, e perché non un'azione

AC2 chiede un *nome di file*. Un file scaricato prende il nome da `Content-Disposition`, che è un'intestazione HTTP: solo una risposta HTTP può portarla, e in App Router quella risposta la produce un Route Handler.

Le due alternative, e perché nessuna delle due:

- **Una server action che restituisce la stringa, e un componente `'use client'` che costruisce un `Blob`.** Farebbe passare l'intero documento nel payload RSC per riscriverlo nel browser, richiederebbe un componente client dove oggi c'è un componente server, e per dire il nome del file userebbe l'attributo `download` di un `<a>` costruito al volo — cioè ricostruirebbe a mano quello che un'intestazione dice in una riga.
- **Una pagina che rende il markdown a schermo.** Non produce nessun file e quindi non soddisfa AC2 in nessuna forma.

Il precedente di forma è `src/app/auth/callback/route.ts`, che esiste per la stessa categoria di ragione: «un Route Handler può scrivere i cookie, un Server Component no».

**Il Route Handler sta dentro il gruppo `(app)`**, quindi il proxy lo protegge come ogni altra rotta: il `matcher` di `proxy.ts:60` esclude solo gli asset statici. La protezione vera resta comunque la sicurezza a livello di riga, che vale anche per una richiesta che non passasse mai di lì — è la riga che `proxy.ts:9-11` porta scritta.

### Il nome del file, e perché è la riga di sicurezza di questa story

`assessments` non ha niente di pericoloso. `clients.name` sì, e non perché contenga qualcosa di strano oggi: perché è testo libero fino a 200 caratteri che finisce dentro il valore di un'intestazione HTTP.

Cosa passa oggi attraverso `validateClientName` (`validate-client-name.ts:27`): via gli invisibili dell'espressione `INVISIBLE`, via gli spazi in testa e in coda, e **basta**. Una virgoletta doppia resta. Un `/` resta. Un ritorno a capo **interno** resta, perché `trim()` toglie solo quelli ai bordi. Dall'interfaccia non arriverebbe — il campo è un `<input>` a una riga — ma il valore lo riceve una server action da un `FormData`, e `kb-0.md` §3 è esplicito: il client non è attendibile.

Cosa succederebbe interpolandolo:

- `Content-Disposition: attachment; filename="pino"cattivo.md"` — il nome del file non è più quello, e AC2 diventa falsa in un modo che nessun test scritto sui casi normali vedrebbe.
- `Content-Disposition: attachment; filename="pino\r\nX-Qualcosa: valore.md"` — una seconda intestazione nella risposta.
- `filename="../../pino.md"` — un nome che alcuni client interpretano come percorso.

**La difesa è una lista di ammessi e non una di vietati**, ed è tutta la differenza: una lista di vietati protegge dai casi a cui chi la scrive ha pensato, una lista di ammessi da tutti gli altri. Lo slug produce `[a-z0-9-]` e il file finisce in `.md`: l'invariante si scrive come espressione regolare e si verifica su ogni caso del test, compresi quelli cattivi.

**È anche il motivo per cui non serve `filename*=UTF-8''`.** La forma estesa di RFC 5987 esiste per i nomi non ASCII; qui il nome è ASCII **per costruzione**, quindi la forma semplice basta — e questo va scritto nel commento, o alla prima rilettura sembrerà una semplificazione presa per pigrizia invece che una conseguenza.

**`INVISIBLE` non si importa qui**, ed è la prova che la lista di ammessi funziona: uno zero-width non appartiene a `[a-z0-9]`, quindi cade come cade una virgola, senza che nessuno debba averlo previsto.

### La forma del markdown, e le due regole che la tengono in piedi

Il markdown è un formato, e il testo di una persona è dentro il formato. Due cose diverse vanno trattate in due modi diversi, e confonderle produce i due difetti opposti.

**Prima regola: quello che diventa un titolo si porta su una riga sola.** Un `question_text` con un ritorno a capo dentro, messo dopo un `###`, produce un titolo e poi una riga di testo sciolto: il documento *dice* che quella domanda finisce dove non finisce. Vale per il titolo del blocco, per il testo della domanda, per il nome del cliente e per quello dell'interlocutore, cioè per tutto ciò che sta su una riga per costruzione. L'operazione è collassare ogni corsa di spazi bianchi in un solo spazio, e non è una sanificazione: è la stessa cosa che un titolo su una riga sola vuol dire.

**Seconda regola: quello che diventa un blocco si scrive com'è.** Una risposta che comincia con `#`, che contiene un elenco o un blocco di codice, è il testo che Luca ha battuto durante la call, ed è esattamente quello che il file deve portare fuori. Scappare quei caratteri renderebbe il file più «sicuro» e meno vero, e non c'è nessuna sicurezza da guadagnare: il file lo apre Luca, non un browser.

**Il livello dei titoli è la conseguenza delle due regole, non un gusto.** `#` per il documento, `##` per il blocco e per il verdetto, `###` per la domanda e per il campo del verdetto. Con questa scala, ogni contenuto sta nel proprio blocco e nessun contenuto può spezzare il proprio contenitore.

Ed è il motivo per cui **anche i cinque campi del verdetto prendono un `###`** invece di righe con l'etichetta in grassetto: `verdict_reason` è un campo lungo, e un testo su più righe dopo `**Motivo:**` spezza la riga e cambia il documento. La forma uniforme è l'unica che regge su ogni contenuto, e la 3.5 ha già pagato una volta il prezzo di una forma che reggeva solo sui casi normali.

### AC3, e perché non è la stessa domanda della cella vuota della 4.2

La 4.2 ha deciso che la cella vuota dell'elenco è **vuota davvero**: nessun trattino, nessun `—`, nessun segnaposto, perché ogni segnaposto sarebbe un'affermazione su una scheda che non c'è.

Qui la domanda somiglia e non è la stessa, e la differenza va guardata prima di rispondere. In una tabella il vuoto si legge: la colonna ha un'intestazione, le altre righe sono piene, e l'assenza si vede perché ha un contorno. In un documento letto dall'alto in basso il vuoto non ha contorno — fra due `###` consecutivi non c'è niente che dica se la domanda è stata saltata o se qualcosa si è perso nell'esportazione.

Solo che qui, a differenza della 4.2, **l'AC risponde da sé**: dice «compaiono comunque, **con la risposta vuota**», e si motiva nella stessa riga — «una domanda non fatta e una domanda senza risposta non sono la stessa cosa». La presenza del titolo *è* il record della call, e scrivere sotto `_(nessuna risposta)_` sarebbe il software che scrive una frase dentro un documento che porta la firma di Luca (NFR6, NFR7).

Quello che restava aperto non era quindi la domanda saltata: era **il campo del verdetto vuoto**, su cui nessun AC dice niente. Chiuso l'11 agosto 2026 (Domanda 2) e **si omette**, titolo compreso: la domanda è stata fatta e va scritta, la casella del modulo no. L'`Esito` è l'unica eccezione, perché `verdict` è `not null` e un documento senza esito non direbbe il vero.

### AC4 è già vera, e l'unico modo di romperla è aggiungere

La scelta centrale dello schema (`database.md` §3) è che `answers` porta **copie** e non riferimenti: `question_text`, `block_title` e `position` dalla 0005, `answer_type`, `options` e `help_text` dalla 0015. Il motivo è scritto per esteso in testa a quel file e nel PRD §3: il giorno che riscrivi o cancelli una domanda, le schede vecchie restano leggibili così com'erano.

Quindi AC4 non richiede nessun lavoro: richiede che nessuno **aggiunga** il lavoro sbagliato. Le due forme che la romperebbero sono entrambe plausibili e nascono dalle buone intenzioni:

1. Innestare `questions(text)` «per avere il testo aggiornato». Renderebbe la scheda di agosto col questionario di ottobre.
2. Filtrare le domande disattivate. `is_active` non esiste dentro `answers` — bisognerebbe risalire a `questions` per averlo, cioè fare la cosa 1 per poter fare la cosa 2.

Il grep del Task 9 verifica che nessuna delle due parole compaia nei tre file nuovi.

### Cosa il documento non porta, e perché sono tutte colonne a una riga di distanza

`answers` porta sei copie e il documento ne rende **due**. Va scritto, perché le altre quattro sono nella stessa riga di `select` e aggiungerle sembra generosità:

- **`help_text`**, il «cosa serve capire»: è l'appunto che Luca scrive a sé stesso per condurre la call, non il verbale della call. In un file che va a un commerciale è rumore, e in un file d'archivio è la domanda che non è stata fatta.
- **`answer_type` e `options`**: dicono com'era fatto il *controllo* a schermo, non cosa è stato detto. In un documento la risposta è testo, sempre — anche quando a schermo era un menu.
- **`completion_status`, `total_questions` e l'avanzamento**: nessuno dei tre è in AC1.

Su `completion_status` va detto l'argomento contrario, perché è l'unico che tiene: una scheda in **bozza**, esportata e passata a un commerciale, non porta con sé il fatto di essere una bozza. È un'osservazione vera e questa story **non** la accoglie, perché AC1 elenca cosa il file contiene e la bozza non c'è, e perché il file porta già la data — che è quello che dice a distanza di mesi quanto ci si può fidare. Se Luca la vuole, è una riga e una AC in più, e si decide come si è deciso tutto il resto.

### L'intestazione della schermata a 375px

`.page-header__actions` ha oggi tre figli e sta **esattamente** al limite: a 375px lo spazio utile è 343, i tre figli con i gap fanno 289,4, e la pagina misura `scrollWidth` 375 su `clientWidth` 375, eccedenza 0 (`globals.css:236-253`, misurato dalla code review della 3.6). Il quarto figlio non ci sta, e la cosa è già stata prevista: `flex-wrap: wrap` sta su quella regola da allora, con scritto sopra che «serve al pulsante prima che all'errore».

Quindi la previsione è che il comando vada a capo e la pagina resti 375. **È una previsione e si misura**, con la stessa forma delle sei story precedenti — e la 4.2 ha appena mostrato cosa succede quando una premessa non misurata entra in una domanda: due su due erano false.

**Se rompesse, non si tocca `.main`.** Quella riga esiste dalla 4.2, è misurata su una schermata sola, e il ledger la assegna alla 5.2 nominando *questa* schermata come la prima da guardare. Allargare qui quella decisione sarebbe deriva del piano su una riga che nessuna AC di questa story chiede: si scrive il numero, ci si ferma e lo si dice.

**Lo scheletro conta i figli, e non è un dettaglio.** La code review della 3.6 ha misurato su questo file che riservare uno spazio più stretto del reale fa scivolare la data di 209,4px a 1280 e 147,9px a 375 all'arrivo dei dati. Tre scheletri per quattro figli riproducono quel difetto in scala ridotta, e la 4.2 ha già dovuto imparare la stessa cosa sulla quinta colonna della tabella.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/export-filename.ts` | **nuovo** — lo slug con la lista di ammessi, e il nome del file | 1 |
| `src/lib/export-filename.test.ts` | **nuovo** — l'invariante `[a-z0-9-]`, gli accenti, il ripiego | 1 |
| `src/lib/assessment-markdown.ts` | **nuovo** — la forma del documento, e le due regole | 2 |
| `src/lib/assessment-markdown.test.ts` | **nuovo** — i blocchi omonimi, la domanda saltata, i titoli su una riga | 2 |
| `.../schede/[assessmentId]/esporta/route.ts` | **nuovo** — le due letture, le tre intestazioni, i tre errori | 3 |
| `.../schede/[assessmentId]/page.tsx` | il comando `Esporta` dentro `AssessmentHeader` | 4 |
| `.../schede/[assessmentId]/loading.tsx` | il quarto scheletro, con la larghezza misurata | 5 |
| `docs/prd-v1.md` | §4, la forma esatta del file e cosa non ci entra | 8 |
| `docs/bmad/implementazione/deferred-work.md` | quattro annotazioni, zero o una voce nuova | 7 |
| `docs/bmad/implementazione/sprint-status.yaml` | `4-3` a `review` | 9 |

**E basta.** In particolare **non** si aprono: `src/lib/answer-groups.ts`, `src/lib/verdict.ts`, `src/lib/format-date.ts`, `src/lib/person-fields.ts`, `src/lib/client-fields.ts` — tutti e cinque si **importano** — né `src/components/`, né `src/app/globals.css` (salvo il caso dichiarato del Task 6, dove comunque ci si ferma prima), né nessun file di `src/app/(app)/clienti/[id]/` fuori dalla cartella `schede/`, né `clients-table.tsx`, né nessuna server action, né nessuna migrazione. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**.

### Trappole note

**1. Usare `<Link>`.** Ogni navigazione di questo software passa da `next/link` e l'abitudine è più forte della differenza. Un `<Link>` fa una navigazione lato client e non scarica niente: il comando sembrerebbe rotto senza dare nessun errore.

**2. Interpolare il nome del cliente nell'intestazione.** È la riga di sicurezza di questa story ed è l'unica che, sbagliata, non produce un difetto ma una vulnerabilità. La difesa è la lista di ammessi, non il togliere i caratteri cattivi.

**3. Innestare `questions` per «avere il testo aggiornato».** Rompe AC4 e sembra un miglioramento. Il grep lo intercetta.

**4. Riscrivere il raggruppamento per blocco.** `groupAnswersByBlock` esiste dalla 3.2, è generica, e raggruppa per corse consecutive con un motivo scritto sopra che una riscrittura non riprodurrebbe. Questa story è il suo secondo consumatore.

**5. Scappare il markdown dentro le risposte.** Renderebbe il file più «sicuro» e meno vero. La regola giusta è più stretta: **una riga sola per i titoli, tutto il resto com'è**.

**6. Mettere le etichette del verdetto in linea e in grassetto.** Regge sui campi corti e si rompe sul `Motivo`, che è lungo per progetto. La forma uniforme con `###` è l'unica che regge su ogni contenuto.

**7. Dimenticare il quarto scheletro.** È la stessa cosa che la 4.2 ha dovuto fare sulla quinta colonna, e la 3.6 l'ha già misurata su questo stesso file: senza, la data scivola all'arrivo dei dati.

**8. Mandare `Content-Disposition` anche sui rami d'errore.** Il browser scaricherebbe un file che contiene un messaggio d'errore, cioè trasformerebbe un guasto in un artefatto che finisce in una cartella.

**9. Aggiungere il conteggio delle risposte, o l'avanzamento, o lo stato di compilazione al documento.** Nessuno dei tre è in AC1, e per il terzo l'argomento contrario è scritto sopra apposta perché non venga riscoperto come un'idea nuova.

**10. Misurare a occhio.** Le misure di questa story sono di CSS e di intestazioni HTTP: si prendono da `getComputedStyle`, da `documentElement.scrollWidth` e dai byte veri della risposta. La 3.6 ha pagato due patch di revisione per due numeri dichiarati e non misurati, la 4.1 tre e la 4.2 due.

### Perimetro: cosa NON entra in questa story

- **L'esportazione del cliente intero**, con anagrafica, persone e tutte le sue schede: è NFR14 e D10, e nessuna AC di questa story la chiede.
- **Qualsiasi formato che non sia markdown**: nessun PDF, nessun CSV, nessun JSON.
- **L'esportazione di più schede insieme**, e qualsiasi comando fuori dalla schermata della scheda — la riga della card del cliente non riceve nessun collegamento di esportazione.
- **Qualsiasi scrittura**: nessuna server action, nessuna migrazione, nessun `revalidatePath`.
- **Il tetto di lunghezza su `answers.content`** — voce del ledger della 1.5 estesa dalla 3.3, che vale anche qui perché un contenuto senza limite diventa un file senza limite: non si chiude in una story che legge.
- **La correzione dei 40px di `.btn`** — voce a ledger numero uno, che appartiene alla 5.2. Questa story vi aggiunge il quarto pulsante di questa schermata e lo **conta**, non lo corregge.
- **`.main { min-width: 0 }` sulle schermate non misurate** — voce della 4.2, che appartiene alla 5.2. Questa story ne **misura** una e le passa il numero.
- **I due riquadri `.error-box` e `.warn-box` sotto 4,5:1** — voce della 3.5, che appartiene alla 5.2.
- **L'alone del fuoco in `--sec-prequalifica` fuori dalla compilazione** — voce del 2 agosto, che appartiene alla 5.2.
- **Il `metadata` sulle rotte** — voce della 1.1: un Route Handler non ha un titolo di pagina, quindi la rotta nuova non allarga quella voce.

### Test

Due moduli puri nascono e vanno sotto test, ed è la stessa regola applicata a `client-status.ts`, `answer-control.ts`, `save-store.ts`, `owed-exit.ts`, `verdict.ts`, `completion-status.ts`, `last-activity.ts`, `assessment-progress.ts`, `answer-groups.ts` e `latest-verdict.ts`: la logica che, rompendosi, produce un dato sbagliato **senza dare nessun errore**.

Tutti e due lo sono, e in due modi diversi.

`export-filename.ts` è il caso raro in cui il test **non** deve essere un elenco di ingressi: gli ingressi cattivi sono infiniti e chi scrive il test pensa agli stessi a cui ha pensato scrivendo il codice. La prova che vale è **un'invariante sull'uscita** — `/^[a-z0-9-]+\.md$/` su ogni caso del file — perché è la stessa cosa che la lista di ammessi promette, e se la promessa cade cade su un ingresso che nessuno aveva previsto.

`assessment-markdown.ts` ha invece due casi che passerebbero qualsiasi test scritto sui dati normali: i **due blocchi omonimi adiacenti**, che restano due gruppi solo perché `groupAnswersByBlock` conta le corse (ed è la ragione per cui quella funzione esiste), e il **titolo su una riga sola**, che si vede solo passando un `question_text` con un ritorno a capo dentro — cosa che i dati di oggi non contengono e che nessuna prova a schermo produrrebbe.

Il Route Handler **non** riceve un'impalcatura di test HTTP: sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2 e §7), e tutto ciò che ha di suo — le due `select`, le tre intestazioni, i tre codici — si verifica con le sonde e con le richieste vere del Task 9. È la stessa decisione già presa per `clients-table.tsx` nella 4.2.

### Contratto visivo

**Nessuna forma nuova.** Il comando è un `btn btn--secondary` dentro `.page-header__actions`, che è la coppia già usata da `CompletionButton` sulla stessa riga. Nessun colore, nessuna icona, nessun token nuovo, nessun valore esadecimale.

**`Esporta` e non `Scarica` né `Esporta in markdown`.** La voce dell'interfaccia vuole che un pulsante dica cosa succede premendolo, con la parola che chi lo usa riconosce (UX-DR13); `Esporta` è la parola del PRD §4 e dell'epic, e l'azione mantiene lo stesso nome dal pulsante al messaggio d'errore — «L'esportazione non è riuscita».

**UX-DR10 non viene toccata.** L'unica azione primaria di questa schermata resta il `Salva` della barra ancorata, e i due pulsanti dell'intestazione sono entrambi secondari — che è la riga già scritta su `CompletionButton`.

Il documento markdown **non ha un contratto visivo**: non è una schermata, non ha token e non ha stati. Quello che ha è una struttura, e sta nel Task 2.

### Sicurezza

Nessuna scrittura. Una rotta nuova che legge, e due cose che vanno guardate perché sono nuove per questo progetto.

- **Il nome del cliente entra in un'intestazione HTTP.** È la sola superficie d'iniezione che questo repository abbia mai avuto, e si chiude con la lista di ammessi del Task 1 — per costruzione e non per rimozione.
- **La rotta la protegge la sicurezza a livello di riga, come tutto il resto.** `assessments_owner_all` e `answers_owner_all` (`0007_rls.sql`) filtrano dentro la stessa richiesta: una scheda di un altro proprietario arriva qui identica a una inesistente, e la risposta giusta è la stessa, 404. Il `.eq('client_id', id)` è in più ed è correttezza, non sicurezza.
- **Il documento è la categoria di dato più sensibile del sistema** (`kb-0.md` §4): è il testo integrale delle risposte dei clienti. Non finisce in nessun log — né il documento, né `details`, né i contenuti — e la risposta porta `Cache-Control: no-store` perché non resti in nessuna cache intermedia.
- **Nessun parametro della richiesta entra in una query se non i due `uuid`**, verificati con `isUuid` prima di toccare il database. Nessuna stringa di query, nessun corpo, nessun campo scelto dal chiamante.
- **Nessuna chiamata a servizi esterni** e nessuna dipendenza nuova: lo slug e il markdown si scrivono in poche decine di righe, che è il criterio di `kb-0.md` §2.

### Project Structure Notes

Nessuna dipendenza nuova. Una cartella nuova, `esporta/`, dentro la rotta della scheda: serve perché un `route.ts` e un `page.tsx` non possono stare sullo stesso segmento, e il segmento in più è anche l'indirizzo che compare nella barra quando qualcosa va storto — `/clienti/<id>/schede/<id>/esporta` si legge.

I due moduli puri stanno in `src/lib` accanto agli altri dieci, ed è lo stesso posto e lo stesso motivo.

**Sono due file e non uno**, benché li consumi solo il Route Handler. È la stessa scelta e lo stesso argomento che la 4.1 e la 4.2 hanno già scritto per `assessment-progress.ts` e `latest-verdict.ts`: rispondono a due domande diverse — «cosa dice il file» e «come si chiama il file» — hanno due insiemi di prove che non si somigliano, e uno dei due porta la riga di sicurezza di questa story, che in un file misto sarebbe più difficile da trovare. Un file solo crescerebbe nella direzione sbagliata al primo che gli aggiunge una funzione.

**Nessun componente nuovo in `src/components/`:** il comando è un `<a>` con due classi dentro un'intestazione che esiste.

### Piattaforma in uso, verificata

Letti da `package.json` e invariati alla baseline: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

Tre cose non sono ancora in uso in questo repository e vanno trattate come tali, cioè verificate e non dedotte:

- **Un Route Handler dentro il gruppo `(app)` e con parametri dinamici.** Quello che esiste, `auth/callback/route.ts`, non ha né l'uno né gli altri. `params` è una `Promise` come nelle pagine di Next 16.
- **L'innesto `people(...)` da `assessments`.** La chiave esterna è una sola (`assessments_interviewee_id_fkey`, `database.types.ts:146-152`), quindi il percorso non dovrebbe essere ambiguo — ma «non dovrebbe» non è una verifica, ed è la categoria di cosa che né `build` né `typecheck` guardano. La sonda del Task 9 la misura.
- **Il tipo generato per un innesto su una chiave esterna nullabile.** `clients(name)` è tipizzato `{ name: string }` — verificato il 9 agosto 2026 e scritto in `page.tsx:109-111` — ma `client_id` è `not null` mentre `interviewee_id` non lo è. Il tipo atteso è quindi nullabile, e va **letto** e non supposto: se arrivasse un elenco invece di un oggetto, la riduzione cambia forma, e un `as` per farlo tornare sarebbe vietato (`kb-0.md` §2).

`Content-Disposition` non è una novità della piattaforma: è HTTP, e il valore lo compone il codice di questa story.

### Stato del database, e cosa vuol dire per la verifica

Misurato l'11 agosto 2026 sul progetto `izkycpwxuedpkzgpvcxc`. **Nominare il progetto non è cerimonia**: la voce del `block_id` a ledger chiude chiedendo esattamente questo a chi la riprende alla 4.3, dopo sei giri in cui il numero atteso si è perso.

| | Dichiarato dalla 4.2 alla sua chiusura | Oggi |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| clienti senza nessuna scheda | 2 | 2 |
| schede / risposte | 1 / 24 | 1 / 24 |
| **risposte con contenuto** | 0 | **0** |
| **schede con interlocutore** | — | **0** |
| questionari / blocchi | 1 / 9 | 1 / 9 |
| domande, di cui attive | 24 / 23 | 24 / 23 |

L'unica scheda: `call_date` **2026-08-10**, `verdict` **`non_deciso`**, `completion_status` `bozza`, `total_questions` 24, `questionnaire_version` 1, cliente `pino`. Sedici migrazioni a registro. Questa story non ne aggiunge nessuna.

**Quattro conseguenze per la verifica, e sono più delle solite perché questa è la prima story che non si verifica coi dati che ci sono.**

**AC3 è l'unica cosa osservabile senza scrivere niente:** ventiquattro domande e zero risposte danno un documento in cui *tutte* le domande sono saltate. È il caso limite di AC3 e va guardato per primo, perché è gratis.

**AC1 non è osservabile senza scrivere.** «Una scheda compilata» vuol dire risposte con contenuto, e ce ne sono zero. La verifica di sessione **deve** compilarne alcune e lasciarne altre vuote — che è anche l'unico modo di provare AC1 e AC3 nello stesso file, come le due AC chiedono insieme.

**La riga «Interlocutore» non è osservabile senza scrivere.** `interviewee_id` è `null` sull'unica scheda, e l'unica persona del database non è interlocutore di niente. Il caso *assente* — la riga che non compare — è quello che i dati danno oggi; il caso *presente* va costruito, aprendo una scheda nuova con l'interlocutore scelto (funzione della 3.1).

**AC4 non è osservabile senza toccare il questionario.** Serve riscrivere una domanda (2.4) o disattivarne una (2.6) **dopo** che la scheda esiste, e riesportare. È l'unica prova che distingue «legge le copie» da «legge le copie ma nessuno l'ha mai messo alla prova».

**Conseguenza sul ledger, ed è la ragione per cui il Task 7 ha una casella obbligatoria:** questa è la prima story in cui una verifica onesta non può ripulire dietro di sé senza distruggere quello che ha appena provato. La voce del `block_id` aspetta quel numero da sei giri e ogni volta l'ha perso. Chi verifica scriva i due numeri — righe di `answers` e quante hanno contenuto — **dopo**, e sul progetto nominato, invece di riprometterli.

### Intelligence dai commit e dalla story precedente

Gli ultimi commit sono `b9225cc` (chiusura 4.2 con la verifica di sessione), `e0cda02` (implementazione 4.2 con la revisione già applicata), `6fbe291` (chiusura 4.1). **La forma è costante da otto story e va rispettata: un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca.** Lo stato `done` non lo mette la revisione.

Dalla 4.2 e dalla sua revisione, cinque cose di metodo che questa story riusa invece di riscoprire:

- **Un rilevatore che non può rilevare è peggio di nessun rilevatore.** La 4.2 prescriveva di misurare `offsetHeight` della pillola per scoprire un testo che va a capo, e `offsetHeight` non poteva vederlo perché l'altezza era fissa. Qui l'equivalente è il nome del file: guardare che «funzioni» non prova niente, e l'unica misura che prova qualcosa è l'espressione regolare sull'uscita e i byte veri dell'intestazione.
- **Le premesse di una domanda vanno misurate prima di eseguirla.** Delle due premesse della Domanda 1 della 4.2, due su due erano false. Le premesse di questa story sui 375px sono **citate coi loro numeri e con la loro fonte** (Task 6), proprio perché siano confutabili.
- **Un Task che corregge i riferimenti morti ne scrive di nuovi.** La revisione della 4.2 ne ha trovati quattro, e uno era stato ucciso dalle righe che quella stessa story aveva aggiunto sopra la regola citata. Il Task 7 di questa story lo dice come casella: i riferimenti si verificano **dopo** le proprie modifiche.
- **Una difesa scritta una volta va portata su tutti i consumatori della stessa forma.** Qui la forma condivisa è `groupAnswersByBlock`, e questa story ne è il secondo consumatore: quello che vale per la schermata deve valere per il file, ordine compreso.
- **I numeri del Dev Agent Record vengono ricalcolati in revisione.** La 4.1 ne ha dichiarati tre che il diff ha smentito, la 4.2 due. Le misure di questa story sono CSS e byte: si prendono, non si stimano.

Dalla verifica di sessione della 4.2, l'avvertimento che vale più di tutti: **due caselle su nove hanno dovuto dichiarare che i dati di prova erano stati cancellati**, e una terza ha registrato che i due verdetti provati non erano stati annotati sul momento e non si ricostruivano più. Le caselle di questa story che chiedono un numero sono contrassegnate, e chi le passa lo scrive **mentre** lo vede.

### Riferimenti

- L'AC1, l'AC2, l'AC3, l'AC4 e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-4-ritrovare-a-mesi-di-distanza-e-portare-fuori]
- FR25, l'esportazione con l'intestazione, le risposte per blocco e il nome file prevedibile — [Source: docs/bmad/pianificazione/epics.md#functional-requirements]
- FR17, la copia del testo di domanda e blocco dentro la risposta — [Source: docs/bmad/pianificazione/epics.md#functional-requirements]
- NFR14, l'esportazione possibile senza scrivere codice nuovo; NFR15, nessun dato personale nei log; NFR16, gli errori dicono cosa fare — [Source: docs/bmad/pianificazione/epics.md#nonfunctional-requirements]
- UX-DR10, le quattro varianti di pulsante e l'azione primaria unica; UX-DR13, la voce dell'interfaccia; UX-DR11, i quattro stati — [Source: docs/bmad/pianificazione/epics.md#ux-design-requirements]
- Il criterio di accettazione 7 e la descrizione dell'esportazione — [Source: docs/prd-v1.md#4-schermate]
- Le sei copie dentro `answers` e perché sono la scelta centrale dello schema — [Source: docs/database.md#3-tabelle]
- Il software è la fonte di verità e tutto ciò che entra dev'essere in grado di uscire — [Source: docs/00-contesto-e-decisioni.md#d10]
- Un valore non rilevato non si mostra come zero — [Source: docs/00-contesto-e-decisioni.md#d13]
- Il client non è attendibile e ogni input si valida sul server — [Source: docs/kb-0.md#3-sicurezza]
- I documenti dei clienti sono la categoria più sensibile del sistema — [Source: docs/kb-0.md#4-dati-personali]
- I test si scrivono per la logica che, rompendosi, produce dati sbagliati — [Source: docs/kb-0.md#7-verifica]
- Il `block_id` non copiato dentro `answers`, e il numero perso da sei story — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 3-2»]
- La normalizzazione Unicode mancante in due punti — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 1-4»]
- I `.btn` a 40px sotto la soglia dei 44 — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 1-1»]
- `.main { min-width: 0 }` misurato su una schermata sola, con la compilazione da guardare per prima — [Source: docs/bmad/implementazione/deferred-work.md, sezione «implementazione della story 4-2»]

### Domande per Luca — da chiudere prima di `dev-story`

Due. La prima fissa una convenzione di nomi che resterà su disco per sempre; la seconda decide cosa si vede in un documento dove non c'è niente. Nessun Task va eseguito indovinando: se restano aperte, l'implementazione si ferma e lo dice.

**Domanda 1 — Nel nome del file, la data è `2026-08-10` o `10-08-2026`?**

Il fatto: AC2 chiede `cliente-data-prequalifica.md` e non dice quale forma abbia la data. Le due candidate sono la forma della colonna (`call_date` è un `date`, e PostgREST la rende `2026-08-10`) e la forma che si legge a schermo (`formatCallDate` dà `10/08/2026`, che in un nome di file diventa `10-08-2026`).

**A — `pino-2026-08-10-prequalifica.md`.** Prezzo: nel documento la data si legge `10/08/2026` e nel nome del file no, cioè due forme della stessa data nello stesso oggetto. Guadagno: una cartella di esportazioni **si ordina per nome e viene ordinata per data**, che con un archivio che cresce è la differenza fra trovare e cercare. Ed è la forma che non si presta a essere letta al contrario da chi la guarda fra un anno.

**B — `pino-10-08-2026-prequalifica.md`.** Prezzo: la stessa cartella si ordina in un ordine che non significa niente, e `10-08-2026` e `08-10-2026` non si distinguono guardandoli. Guadagno: il nome del file dice la data nella stessa forma in cui la dice tutto il resto del software.

**Il default proposto è A**, per un motivo solo che vale più della coerenza: il nome di un file esiste per essere ritrovato in un elenco, e l'unica forma di data che rende un elenco alfabetico un elenco cronologico è quella. La differenza fra le due forme dentro lo stesso oggetto è reale e si dichiara nel commento invece di essere nascosta — nel documento si legge, nel nome si ordina.

**Domanda 2 — Cosa si vede dove non c'è niente: la domanda saltata e il campo del verdetto vuoto.**

Il fatto: sono due assenze diverse nello stesso documento. Una **domanda saltata** è una domanda che è stata fatta e a cui non si è risposto, e AC3 impone che compaia. Un **campo del verdetto vuoto** — un `Motivo` non scritto, una `Condizione` che non c'entra perché il verdetto è `no` — non è qualcosa che è stato chiesto: è una casella di un modulo. Sullo schermo il software le tratta già in modo diverso, perché `showsCondition` nasconde i due campi condizionali quando non servono (`verdict.ts:117-125`).

**A — asimmetrico: la domanda saltata compare con la risposta vuota, il campo del verdetto vuoto si omette.** L'`Esito` compare sempre, perché è `not null`. Prezzo: due regole invece di una, e vanno spiegate a chi legge il codice. Guadagno: ognuna delle due dice il vero — la domanda c'è perché è stata fatta, il campo non c'è perché non è stato compilato — e nessuna delle due scrive una parola che Luca non ha scritto.

**B — simmetrico e vuoto: compare tutto, campi del verdetto vuoti compresi.** Prezzo: un `## Verdetto` con quattro titoli e niente sotto, in ogni scheda dove il verdetto è `non deciso`, che è la maggioranza delle schede durante il lavoro. Guadagno: una regola sola, e il documento ha sempre la stessa forma.

**C — la domanda saltata riceve una riga che lo dice** (`_(nessuna risposta)_` o simile), i campi del verdetto vuoti si omettono. Prezzo: **contraddice la lettera di AC3**, che dice «compaiono comunque, **con la risposta vuota**», e in più fa scrivere al software una frase dentro un documento che porta la firma di Luca. Guadagno: in un documento letto dall'alto in basso l'assenza non ha contorno, e due `###` consecutivi non dicono se la domanda è stata saltata o se qualcosa si è perso nell'esportazione.

**Il default proposto è A**, e per la metà che riguarda le domande **non è una preferenza ma la lettura dell'AC**: AC3 scrive «con la risposta vuota» e motiva da sé — «una domanda non fatta e una domanda senza risposta non sono la stessa cosa» — cioè la presenza del titolo *è* già il record. La parte davvero aperta è quindi solo la seconda: cosa fanno i campi del verdetto vuoti, dove nessun AC dice niente. **C resta scritta perché ha un argomento vero che la cella della tabella della 4.2 non aveva** — una tabella dà al vuoto un contorno, un documento no — ma sceglierla vuol dire scostarsi dall'AC, quindi si sceglie a occhi aperti e non di passaggio: chi implementa non può prenderla come una variante di stile.

### Risposte di Luca

_(11 agosto 2026, prima di `dev-story`. Le due voci qui sopra restano scritte per intero: portano il perché, e i Task non lo ripetono.)_

**Domanda 1 → A.** La data nel nome del file è **ISO**: `pino-2026-08-10-prequalifica.md`. Vince l'ordinamento di una cartella sulla coerenza con la data mostrata a schermo. Il prezzo — `2026-08-10` nel nome, `10/08/2026` dentro il documento — si dichiara nel commento di `export-filename.ts` e nella riga del PRD, invece di essere nascosto.

**Domanda 2 → A.** Asimmetrico, e le due metà hanno due ragioni diverse. La **domanda saltata compare col titolo e sotto niente**, che è la lettera di AC3 e non una preferenza. Il **campo del verdetto vuoto si omette**, titolo compreso, perché non è una cosa che è stata chiesta. L'`Esito` è l'eccezione e compare sempre.

**Nessuna delle due diventa una decisione in `00-contesto-e-decisioni.md`:** vivono nel commento del modulo e nella riga del PRD, che sono i due posti dove si cercano. Il Task 8 resta com'è scritto.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), 11 agosto 2026.

### Debug Log References

**Conteggi dichiarati prima di eseguire, e verificati dopo.** Test attesi 237 + i soli test dei due moduli nuovi; scritti 13 (`export-filename`) e 17 (`assessment-markdown`), quindi **267** attesi. Eseguiti: **267 passati, 0 falliti**. `npm run typecheck` senza uscita, `npm run build` riuscito — e la rotta nuova compare come `ƒ /clienti/[id]/schede/[assessmentId]/esporta`, cioè dinamica per costruzione, che è la prova che il `force-dynamic` non scritto non serviva. Nessuna migrazione, quindi `migrations.test.ts` non è cresciuta.

**Grep di AC4.** `grep -rn "questions\|question_blocks\|questionnaires"` sui tre file nuovi dà **due righe, tutte e due dentro commenti** di `assessment-markdown.ts`: la riga 11, che dichiara l'assenza, e la riga 79, dove la parola compare dentro `total_questions` in un elenco di cose che il documento non porta. **Zero righe di codice.**

**Grep del perimetro sulle etichette, con la condizione provata nella forma giusta** — «solo righe preesistenti» e non «solo i file dichiarati». Alla baseline `b9225cc`, `VERDICT_LABELS|VERDICT_FIELDS` toccava sei file: `verdict.ts`, `verdict.test.ts`, `verdict-pill.tsx`, `verdict-field.tsx`, `verdict-card.tsx`, `types.ts`. Oggi tocca gli stessi sei **più `assessment-markdown.ts`**, e nessun altro. Gli ultimi due — `verdict-card.tsx` e `types.ts` — non erano nell'elenco che il Task 9 si aspettava, e la ragione è che erano già lì: il confronto con `git grep` sulla baseline è quello che lo dimostra invece di dedurlo. Nei tre file nuovi zero occorrenze di `next/link`, `revalidatePath`, `'use server'`, `export const dynamic` e `export const revalidate`.

**Il tipo generato per i due innesti, letto e non supposto.** Sonda con un errore deliberato di assegnazione, poi cancellata: `people(first_name, last_name)` è `{ first_name: string | null; last_name: string | null } | null` — oggetto, nullabile, **non** un elenco — e `clients(name)` è `{ name: string }`, non nullabile. La forma a run-time con `interviewee_id` a `null` è stata verificata a parte, perché la sonda senza sessione non vede righe: replicando la costruzione che PostgREST genera per un innesto a uno (un laterale che produce **una** colonna json, estesa a `NULL` dal left join) sull'unica scheda vera, la colonna risponde `null` e non un oggetto di campi nulli. È la differenza che conta: con l'oggetto di nulli l'esportazione avrebbe scritto `Interlocutore: Persona senza nome` su una scheda che non ne ha uno.

**Le forme PostgREST, provate con la chiave pubblicabile e senza sessione** (la tecnica della 2.1, 4.1 e 4.2). La `select` vera della rotta, coi due innesti sulla stessa richiesta, risponde **200** con `[]` — la sicurezza a livello di riga filtra tutto, che è la risposta giusta — e **non** dà `PGRST201`, quindi il percorso verso `people` non è ambiguo e la forma disambiguata `people!assessments_interviewee_id_fkey(...)` non serve. Le due controprove che rendono la sonda capace di distinguere: una colonna inventata dentro `people(...)` dà **`42703`** con `column people_1.non_esiste does not exist`, cioè con l'alias che PostgREST assegna all'innesto, prova che il join viene generato davvero; un innesto inventato dà **`PGRST200`**. La `select` delle risposte con `order=position.asc,id.asc` risponde 200.

**AC1, AC2, AC3 e AC4 provate su dati veri, tutte in transazioni annullate** sul progetto `izkycpwxuedpkzgpvcxc`, con `set local role authenticated` e le claim del proprietario. Scritta una scheda con `open_assessment` (23 righe, le domande attive), un interlocutore, e contenuti di ogni forma: un testo su due paragrafi, uno che comincia con `#`, uno di soli spazi, venti lasciati vuoti; verdetto `si_condizionato` con `Motivo` su due righe, `Condizione` vuota, `verify_by` e `Prossimo passo` scritti. I dati sono poi stati letti con le **due select esatte della rotta** e passati ai due moduli veri.

- **AC2, sull'uscita e non sui test.** Il nome del cliente era `Società "Rossi" & C.\r\nX-Iniettata: valore`, cioè virgoletta doppia e ritorno a capo insieme. L'intestazione composta è `attachment; filename="societa-rossi-c-x-iniettata-valore-2026-08-11-prequalifica.md"`: **0 byte non ASCII**, **nessun CR né LF**, **due sole virgolette** che sono le delimitatrici, e corrisponde a `/^attachment; filename="[a-z0-9-]+\.md"$/`. Nessuna traccia dei caratteri ostili, e non perché siano stati tolti: perché non erano ammessi.
- **AC1 e AC3, sul documento.** `###` contati nel file: **27**, cioè le 23 righe di `answers` più i 4 campi del verdetto resi — l'`Esito`, il `Motivo`, il `Verificare entro` e il `Prossimo passo`, mentre la `Condizione` vuota **non lascia il suo titolo**. `##` contati: **9**, cioè gli 8 blocchi dell'intervista più `Verdetto`. L'intestazione porta le tre righe, i blocchi sono nell'ordine dell'intervista, l'esito si legge `sì condizionato`. Il contenuto di soli spazi conta come vuoto e lascia la domanda col solo titolo, come le altre saltate. Il `# non è un titolo` resta com'è battuto; il `\r\n` dentro il nome del cliente diventa uno spazio nell'`# H1` e nella riga `Cliente`, quindi il documento non mente sulla propria struttura. Finisce con un solo ritorno a capo.
- **AC4, nel modo che la renderebbe falsa se lo fosse.** Aperta una scheda, poi **riscritto** il testo di una delle sue domande (funzione della 2.4) e **disattivata** un'altra (funzione della 2.6). Rilette le righe: nel questionario la domanda ora si chiama `TESTO RISCRITTO DOPO LA SCHEDA`, in `answers.question_text` si chiama ancora `Quante persone siete e come vi dividete il lavoro?`; la domanda disattivata è ancora lì, e il totale resta 23. La rotta legge `answers`, quindi il file porta il testo vecchio e la domanda disattivata.

Riconteggio subito dopo i `rollback`: 3 clienti, 1 persona, 1 scheda, 24 risposte, 0 con contenuto, 23 domande attive, **0 residui** della prova di AC4. Niente è rimasto.

**I tre codici d'errore non sono raggiungibili senza sessione, e la prova è quella.** Con il server di sviluppo in piedi, `/clienti/<uuid>/schede/<uuid>/esporta` e la stessa rotta con due `uuid` storpiati rispondono tutte e due **307** verso `/accedi`: è il proxy che ferma la richiesta prima del Route Handler, che è esattamente quello che il commento in testa alla rotta dichiara. Su nessuna delle due risposte c'è `Content-Disposition`. I rami 401, 404 e 500 restano quindi alla verifica di sessione, e la casella che li prova c'è.

**Le misure del Task 6**, riproduzione statica servita in locale col `globals.css` vero e i due font Geist, valori da `getBoundingClientRect` e `getComputedStyle`, mai a occhio, e mai dentro un iframe.

| | tre comandi | quattro comandi |
|---|---|---|
| `scrollWidth` / `clientWidth` a 375 | 375 / 375 | **375 / 375**, eccedenza 0 |
| `scrollWidth` / `clientWidth` a 1280 | 1280 / 1280 | **1280 / 1280**, eccedenza 0 |
| altezza intestazione a 375, `bozza` | 86,5 | **142,5** (tre righe) |
| altezza intestazione a 375, `chiusa` | 86,5 | **86,5** (due righe) |
| altezza intestazione a 1280 | 76 | **76** (una riga) |
| altezza dello scheletro a 375 / 1280 | 72 / 60 | **128 / 60** |
| salto della data a 375, `chiusa` / `bozza` | 1,1 / — | **0,6 / 0,8** |
| salto della data a 1280, `chiusa` / `bozza` | 3,4 / 4,7 | **3,9 / 5,1** |

`Esporta` come `btn btn--secondary` misura **86,5 × 40**: da lì il quarto scheletro riserva **87**, arrotondato in eccesso come gli altri tre. Le larghezze di contorno, misurate insieme e coerenti con quelle che `loading.tsx` dichiarava già: data **78**, parola **35,7** (`chiusa`) o **32,7** (`bozza`), pulsante **144,9** (`Riporta in bozza`) o **146,6** (`Chiudi la scheda`) — il 146,6 della 3.6 era quindi il caso `bozza`, e i due numeri di questa tabella si riconciliano con quelli.

**Schermata di compilazione intera a 375**, con due card di risposte, la card del verdetto e la barra ancorata: `documentElement.scrollWidth` **375** su `clientWidth` **375**, nessun elemento oltre il bordo destro. Forzando `min-width: auto` su `.main` il numero **non cambia**, perché `.answer__text` e `.input` portano già `overflow-wrap: anywhere` — provato con un token di sessanta caratteri senza spazi dentro una domanda e dentro una risposta. È il numero che la voce a ledger della 4.2 aspettava, ed è un numero che conferma.

**Bersaglio tattile:** `Esporta` è alto **40**, la soglia di UX-DR14 è 44. Non si corregge qui, si conta: nello stato pieno di questa schermata i `.btn` sotto soglia passano da due a **tre**.

### Completion Notes List

**Cosa è stato costruito.** Due moduli puri — `export-filename.ts`, che compone il nome del file, e `assessment-markdown.ts`, che compone il documento — un Route Handler che li mette insieme leggendo due volte il database, e un `<a>` nell'intestazione della schermata. Nessuna migrazione, nessuna scrittura, nessuna dipendenza nuova.

**Le cinque importazioni invece delle cinque copie, come il perimetro chiedeva:** `groupAnswersByBlock`, `normalizeTextValue`, `formatCallDate`, `VERDICT_FIELDS`/`VERDICT_LABELS`/`isVerdict`, `personDisplayName`. Nessuno dei cinque file è stato aperto.

**AC4 è stata soddisfatta non scrivendo niente**, che era il punto: il grep lo prova nella sola forma in cui un'assenza si può provare, e la prova su dati veri lo conferma dal lato opposto.

**Nessuna voce nuova a ledger per il percorso d'errore dell'esportazione, e il motivo va scritto perché il Task 7 lo chiedeva come alternativa.** L'ascoltatore `visibilitychange` di `use-editable-field.ts:192-209` **copre** quella navigazione: scatta su `document.visibilityState === 'hidden'`, che è quello che il browser produce navigando via da una pagina, esattamente come chiudendo la scheda o passando a un'altra applicazione sul tablet. La garanzia è la stessa che la 3.4 aveva già dichiarato e accettato — «restringe la finestra, non la chiude», perché una richiesta partita può non uscire prima che il processo si chiuda — e non è né nuova né peggiore. Una voce che descrivesse un difetto già descritto sarebbe un doppione, e una che lo descrivesse come nuovo sarebbe falsa.

**Due voci nuove a ledger che il Task 7 non prevedeva, e il motivo.** Le ha prodotte il Task 6, che chiedeva di misurare l'altezza dell'intestazione «perché il quarto figlio quasi certamente manda qualcosa a capo e una riga in più sposta tutto il contenuto sotto». Ha mandato a capo, e ha prodotto due difetti misurati e distinti: il titolo `Prequalifica` che a 375 finisce sotto i comandi — difetto **preesistente**, 11px con tre comandi, **30px** con quattro — e lo scheletro dell'intestazione che a 375 non può somigliare a tutte e due le schede, perché `bozza` porta l'etichetta più lunga e va a tre righe (142,5) mentre `chiusa` resta a due (86,5), contro i 128 riservati. Nessuno dei due si chiude senza toccare `globals.css`, che il Task 6 vieta per nome; tutti e due vanno alla 5.2 con i numeri già presi. Il conteggio del ledger è quindi **due voci nuove e quattro annotazioni**, contro le «zero o una voce nuova» previste.

**Una scelta di forma che vale la pena dichiarare invece di lasciarla scoprire.** Le tre righe dell'intestazione del documento — `**Cliente:**`, `**Data:**`, `**Interlocutore:**` — sono scritte come il Task 2 le disegna, cioè su tre righe adiacenti senza riga vuota fra loro. In markdown stretto tre righe adiacenti sono **un paragrafo solo**, quindi un lettore che *renderizza* il file le mostra di seguito sulla stessa riga, mentre chi lo apre come testo vede tre righe. Il file resta corretto e leggibile in tutti e due i modi e nessuna AC dice quale dei due conta; la forma è quella che la story prescrive e non è stata cambiata di iniziativa. Se la resa conta, si chiude con due spazi in coda alle prime due righe, ed è una riga di codice.

**Il comando sta dopo `CompletionButton` come il Task 4 chiede, e questo ha una conseguenza nello stato d'errore:** `CompletionButton` rende, quando la scrittura fallisce, una riga d'errore con `flex-basis: 100%`, che sta fra il pulsante e `Esporta`. In quel solo stato il comando finisce quindi su una terza riga, sotto l'errore. Non è una perdita — il comando resta visibile e raggiungibile — ed è lo stato di un guasto già in corso.

### File List

| File | Cosa |
|---|---|
| `src/lib/export-filename.ts` | **nuovo** — lo slug a lista di ammessi, il ripiego `cliente`, la data ISO |
| `src/lib/export-filename.test.ts` | **nuovo** — 13 test, con l'invariante `/^[a-z0-9-]+\.md$/` verificata su ogni caso |
| `src/lib/assessment-markdown.ts` | **nuovo** — la forma del documento e le due regole opposte sul testo |
| `src/lib/assessment-markdown.test.ts` | **nuovo** — 17 test, blocchi omonimi e titoli su una riga compresi |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/esporta/route.ts` | **nuovo** — le due letture, le tre intestazioni, i tre codici d'errore |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` | MODIFICA — il comando `Esporta` dentro `AssessmentHeader` (`:230-232`) |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx` | MODIFICA — il quarto scheletro, 87 misurati (`:44`) |
| `docs/prd-v1.md` | MODIFICA — §4 `### Esportazione`, la definizione di «prevedibile» |
| `docs/bmad/implementazione/deferred-work.md` | MODIFICA — 2 voci nuove, 4 annotazioni, 0 chiuse |
| `docs/bmad/implementazione/sprint-status.yaml` | MODIFICA — `4-3` a `review` |

## Verifica di sessione

_(le caselle che richiedono una sessione vera; le passa Luca, e sono quelle che portano la story a `done`)_

- [ ] Apro una scheda, **compilo alcune risposte e ne lascio altre vuote**, poi premo `Esporta`: il file si scarica senza che la pagina se ne vada.
- [ ] Apro il file: ha l'intestazione con cliente e data, i blocchi nell'ordine dell'intervista, ogni domanda col suo testo, e il verdetto in fondo con l'esito scritto per esteso (AC1).
- [ ] Nello stesso file, le domande che ho saltato **ci sono**, col loro titolo, e sotto non c'è niente (AC3). Un `Motivo` che non ho scritto invece **non lascia il suo titolo**, e l'`Esito` c'è anche se è `non deciso`.
- [ ] Guardo il nome del file: `<cliente>-<data>-prequalifica.md`, tutto minuscolo, senza accenti e senza spazi (AC2). *Scrivere qui il nome vero.*
- [ ] Apro una scheda nuova **scegliendo un interlocutore** (oggi nessuna scheda ne ha uno) ed esporto: l'intestazione porta la riga `Interlocutore` col nome della persona (AC1).
- [ ] Riscrivo dal questionario il testo di una domanda che quella scheda contiene, e ne disattivo un'altra. Riesporto: il file porta **il testo vecchio** e contiene ancora la domanda disattivata (AC4).
- [ ] Guardo l'intestazione della schermata su schermo stretto (telefono o finestra a 375px) con la scheda `chiusa`: i quattro comandi ci stanno, la pagina non scorre di lato, e il comando `Esporta` è raggiungibile.
- [ ] Guardo la schermata mentre carica (rete lenta o ricarica dura): l'intestazione ha **quattro** scheletri e all'arrivo dei dati la data non scivola.
- [ ] **Guardo la stessa schermata mentre carica a 375px: la pagina non scorre di lato.** È la misura che il Task 6 chiedeva sul solo `loading.tsx` e che non è stata presa — i quattro scheletri riservano 349 più 48 di gap contro i 343 utili, quindi vanno a capo, ma che la pagina resti dentro i 375 è una previsione e non un numero.
- [ ] Cucio a mano un indirizzo di esportazione con un `assessmentId` che non esiste: leggo un messaggio in italiano e non una traccia, e non mi si scarica nessun file.
- [ ] **Conteggio di `answers` a verifica finita, sul progetto `izkycpwxuedpkzgpvcxc`: quante righe e quante con contenuto.** *Scrivere qui i due numeri, e dire se i dati di prova sono stati tolti.* È il numero che la voce del `block_id` a ledger aspetta da sei story, e questa è la prima verifica che non può passarlo senza scriverlo.

## Change Log

| Data | Cosa |
|---|---|
| 11 agosto 2026 | Story creata, `ready-for-dev`. |
| 11 agosto 2026 | Chiuse le due domande, tutte e due sul default: data ISO nel nome del file, vuoto asimmetrico fra domanda saltata e campo del verdetto. Task 1 e Task 2 aggiornati col valore deciso. |
| 11 agosto 2026 | Story implementata. Due moduli puri nuovi con 30 test, un Route Handler, il comando nell'intestazione, il quarto scheletro a 87 misurati. 267 test verdi, `typecheck` e `build` puliti. AC1, AC2, AC3 e AC4 provate su dati veri in transazioni annullate; il database è tornato ai suoi 24/0. Ledger: 2 voci nuove — la sovrapposizione del titolo a 375 e lo scheletro che non può somigliare a tutte e due le schede — e 4 annotazioni. `docs/prd-v1.md` §4 definisce ora cosa vuol dire «prevedibile». Stato a `review`. |
| 11 agosto 2026 | Code review, tre strati in parallelo. 4 decisioni chiuse da Luca lo stesso giorno — due a ledger (contenuto grezzo nel markdown, salvataggi in sospeso non svuotati), due diventate correzioni. 9 patch applicati: commenti potati, mappa di traslitterazione per `Ø Ł ß Æ Ð Þ`, riga `Interlocutore` omessa per una persona senza nome, `no-store` sui rami d'errore, due asserzioni di test rinforzate, un nome di test falso corretto, una casella in più nella verifica di sessione. 7 voci a ledger. 267 test verdi, `typecheck` e `build` puliti. Stato **`review`**: `done` lo mette Luca dopo la verifica di sessione. |
