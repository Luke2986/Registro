---
baseline_commit: 628c7bf
---

# Story 3.6: Lasciare in bozza o chiudere

Status: done

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 10 agosto 2026

> **Baseline.** La Story 3.5 è implementata, revisionata e chiusa: `628c7bf` su `main`, albero pulito. Tutti i conteggi di questo file sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati il 10 agosto 2026: **212 test verdi**, `npm run typecheck` senza uscita, quindici migrazioni a registro.
>
> **Lo stato del database è identico a quello che la 3.5 dichiara alla propria chiusura**, ed è la prima volta in quattro story che non cambia: 3 clienti, 1 persona, **1 scheda, 24 risposte di cui 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. La scheda è quella nata alle 07:40:49 di Roma del 10 agosto, `updated_at` ancora uguale a `created_at`, `verdict` `non_deciso`, e — quello che conta qui — **`completion_status` `bozza`**, che è il valore di default che nessun codice ha mai scritto. È la scheda su cui questa story si prova.
>
> **Questa è l'ultima story dell'Epic 3.** Chiusa lei, la call intera sta dentro lo strumento: si apre (3.1), si compila (3.2), si salva da sola (3.3), si riprende (3.4), si conclude col verdetto (3.5) e si marca come finita (3.6).

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want marcare una scheda come finita quando lo è,
so that dall'elenco distinguo quelle da riprendere da quelle chiuse.

## Acceptance Criteria

**AC1 — chiudere riesce, e non chiude niente**
**Given** una scheda in bozza
**When** la chiudo
**Then** passa a `chiusa` e resta comunque modificabile (NFR8, FR23)

**AC2 — il verdetto non è una condizione**
**Given** una scheda senza verdetto
**When** provo a chiuderla
**Then** la chiusura riesce: nessun vincolo lega lo stato di compilazione al verdetto (FR23)

**AC3 — e nemmeno al contrario**
**Given** una scheda chiusa
**When** la riapro il giorno dopo e scrivo il verdetto
**Then** l'operazione riesce (criterio di accettazione 6 del PRD)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **La colonna esiste dalla migrazione 0005 e questa story non porta nessuna migrazione.** `completion_status text not null default 'bozza' check (completion_status in ('bozza','chiusa'))`, righe 33-34 di `0005_assessments_answers.sql`. Chi comincia scrivendo SQL sta rifacendo una cosa fatta il 2 agosto.
>
> **Le tre AC chiedono, tutte e tre, che qualcosa non esista.** AC1 chiede che chiudere non blocchi la modifica, AC2 che il verdetto non sia una condizione della chiusura, AC3 che la chiusura non sia una condizione del verdetto. Nessuna delle tre si soddisfa scrivendo codice: si soddisfano **non scrivendolo**, e si verificano con una lettura e un grep (Task 6). Il vincolo che le renderebbe false non esiste nel database, ed è scritto in testa alla 0005 e in `database.md` §3 — la trappola non è aggiungerlo, è aggiungere in `page.tsx` o nella card un `disabled` che lo simuli.
>
> **Il precedente esatto è la Story 2.6, non la 3.5.** Un pulsante solo che alterna due etichette, lo stato di destinazione mandato esplicito dal browser, nessuna conferma perché l'azione è reversibile, `useWrite` per le meccaniche, la rivalidazione che fa girare l'etichetta. `question-active-actions.ts` e `question-active-button.tsx` si leggono per intero prima di scrivere: quello che serve qui è la stessa forma con altri sostantivi. **Non** è la forma della 3.5: questo non è un campo, non si salva da solo, non si iscrive al registro e non entra nella barra.
>
> **La rivalidazione è quella di `saveVerdict` e non quella di `saveAnswer`.** La scrittura tocca `assessments`, dove il trigger `assessments_set_updated_at` esiste (0006), quindi `updated_at` si muove e l'elenco clienti cambia ordine: `revalidatePath('/clienti')` qui non è decorativa. Se la risposta alla **Domanda 1** è A, si aggiunge `/clienti/[id]`, ed è la prima volta che diventa necessaria — il perché sta in **Dev Notes → «La rivalidazione»**.
>
> **`chiuso` e `chiusa` non sono la stessa parola, e stanno in due colonne diverse.** `clients.status` ammette `chiuso`, `assessments.completion_status` ammette `chiusa`. Sono a una lettera di distanza, vivono nello stesso pezzo di software e la seconda è quella di questa story. Un `isClientStatus` importato per sbaglio, o un `chiuso` battuto al posto di `chiusa`, compilano tutti e due: il primo passa la guardia e viene rifiutato dal `check` in inglese, il secondo viene rifiutato dalla guardia con un messaggio giusto per la ragione sbagliata. C'è un test apposta (Task 1), e non è per fare numero.
>
> **Due decisioni sono aperte e stanno in Dev Notes → «Domande per Luca».** La prima — se lo stato si veda nell'elenco delle schede dentro la scheda cliente — cambia **cosa** si costruisce: tre file in più o in meno, e una rivalidazione in più. La seconda — dove sta il comando sulla schermata di compilazione — cambia **dove**, e una delle due strade costa due righe di CSS dichiarate. Vanno chiuse **prima** di `dev-story`: i Task le nominano dove mordono, e nessun Task va eseguito indovinando.
>
> **Non porta l'avanzamento** (4.1), **né l'esito nella card del cliente e nell'elenco** (4.1 e 4.2), **né l'esportazione** (4.3), **né il trigger su `answers` che muove `assessments.updated_at`** (4.1, `deferred-work.md:131`), **né nessun filtro per stato di compilazione**, che nessuna AC chiede e nessun documento nomina.

## Tasks / Subtasks

- [x] **Task 1 — I due valori, in un modulo puro** (AC: 1)

  - [x] File nuovo `src/lib/completion-status.ts`, puro: niente React, niente Supabase, così `npm test` lo copre senza riscrivere niente (`kb-0.md` §7). Il precedente esatto è `client-status.ts`, che è lo stesso identico problema — un `check` con pochi valori e una guardia — e va ricalcato, commenti compresi nella loro sostanza.
  - [x] `COMPLETION_STATUSES` come `as const`, **nell'ordine del vincolo `check` di `0005_assessments_answers.sql:34`**: `bozza`, `chiusa`. Poi `type CompletionStatus` e `isCompletionStatus(value: unknown): value is CompletionStatus` con un `Set`, per la stessa ragione di `isClientStatus`: il valore arriva dal browser e qualsiasi altra cosa è una richiesta che non doveva esistere, che si rifiuta prima del database.
  - [x] **Nessuna mappa valore → etichetta, e qui la differenza dalla 3.5 va capita invece di copiata.** `verdict.ts` ha `VERDICT_LABELS` perché nel database c'è `si_condizionato` e a schermo va `sì condizionato`. Qui i due valori del database — `bozza` e `chiusa` — **sono già le parole che compaiono nell'interfaccia**, esattamente come i cinque stati del cliente, e una tabella che ripete `bozza: 'bozza'` sarebbe un secondo posto da tenere allineato senza guadagnarci niente. È scritto in testa a `client-status.ts` e vale identico.
  - [x] Nessun elenco di descrittori di campo e nessun `isCompletionFieldKey`: la colonna scritta è **una sola** e il suo nome non arriva dal browser. La guardia di `verdict.ts` esiste perché là le colonne sono cinque e la chiave viaggia nel `formData`; qui non viaggia niente, e aggiungerla sarebbe una difesa per un ingresso che non c'è.
  - [x] Test in `src/lib/completion-status.test.ts`: i due valori nell'ordine del vincolo; `isCompletionStatus` accetta `bozza` e `chiusa`; rifiuta la stringa vuota, `null`, `undefined` e un numero; **e rifiuta `chiuso`**, che è lo stato del *cliente* e non della scheda. L'ultimo caso è quello che giustifica il file: le due parole si somigliano, vivono nello stesso software, e senza quel test il primo che le scambia lo scopre dal `check` di Postgres in inglese.

- [x] **Task 2 — L'azione che scrive, e la rivalidazione che qui non è decorativa** (AC: 1, 2)

  - [x] File nuovo `src/app/(app)/clienti/completion-actions.ts`, `'use server'`, una azione sola: `setCompletionStatus`. File suo e non dentro `verdict-actions.ts` né `assessment-actions.ts` — «un file d'azione porta una azione», regola dichiarata in `question-update-actions.ts` e applicata da tutte le story dell'Epic 3. E qui il motivo è più forte del solito: metterla accanto al verdetto è la prima mossa verso il legame che AC2 nega.
  - [x] La forma è quella di `setQuestionActive` riga per riga: `openSession`, uuid verificato prima di toccare il database, **stato di destinazione esplicito** dal browser e mai invertito sul server, `maybeSingle` sull'`update` stesso senza pre-lettura, log dei soli `code` e `message`.
  - [x] **Lo stato di destinazione arriva esplicito e non si inverte sul server**, ed è la stessa scelta della 2.6 con lo stesso motivo: un «toggle» che legge e inverte costerebbe una pre-lettura e renderebbe due schede aperte capaci di annullarsi a vicenda — bozza, chiusa, bozza — senza che nessuna delle due veda un errore. Col valore esplicito le stesse due scritture chiedono la stessa cosa e la ottengono entrambe.
  - [x] `isCompletionStatus` sul valore ricevuto, e nient'altro: nessun `trim`, nessuna minuscola. Il `check` di Postgres resta l'ultima difesa e non la prima, perché da lì il messaggio arriva in inglese e parla di un vincolo invece di dire cosa fare (NFR16).
  - [x] **Nessun `redirect`, nemmeno a sessione finita**, per la regola di `supabase/session.ts` e con il motivo in più della 3.5: se il comando sta sulla schermata di compilazione, una navigazione porterebbe via tutto quello che è appena stato scritto nei ventinove campi.
  - [x] Due messaggi, per direzione, come in `setQuestionActive`: `La scheda non è stata chiusa. Riprova fra un momento.` e `La scheda non è stata riportata in bozza. Riprova fra un momento.` — l'azione si chiama allo stesso modo dal pulsante al messaggio (`kb-0.md` §6, UX-DR13). Con un campo forgiato la destinazione non si conosce: si usa la prima, scelta fissa, perché il caso non è raggiungibile dall'interfaccia. Più quello della riga sparita, che dice **Ricarica la pagina** e non «torna all'elenco», per la ragione già scritta in `verdict-actions.ts:30-34`.
  - [x] Il `client_id` per il percorso si ricava **dalla riga appena scritta** (`.select('id, client_id')`), mai dal `formData`: un percorso suggerito dal browser è la voce a ledger di `PERSON_GONE`.
  - [x] La rivalidazione: la rotta di compilazione **e `/clienti`**, con il commento che dice perché la seconda non è decorativa qui e lo era in `saveAnswer` (v. **Dev Notes → «La rivalidazione»**). `/clienti/[id]` **solo se la Domanda 1 è A**, e in quel caso con il proprio commento: là la card del cliente rende davvero lo stato, quindi senza la chiamata si chiude una scheda, si torna al cliente e la riga dice ancora `bozza`.

- [x] **Task 3 — Il comando, dove la Domanda 2 lo mette** (AC: 1, 2, 3)

  - [x] File nuovo `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx`, componente client, che ricalca `question-active-button.tsx`: `useWrite` con il messaggio della direzione corrente, un `FormData` con `assessment_id` e lo stato di destinazione, la riga d'errore sotto il pulsante con `role="alert"`.
  - [x] **Il componente importa lui l'azione**, come `MoveButtons` e `QuestionActiveButton`: un callback costruito nel componente server non sarebbe serializzabile.
  - [x] **Niente `onSuccess` e niente stato ottimistico**: la rivalidazione fa girare la parola e l'etichetta del pulsante, e non c'è nessun campo da riallineare. Il costo noto — durante il volo il pulsante si spegne e il fuoco cade sul body — è la famiglia di difetti già rimandata alla Story 5.2, e non si corregge qui.
  - [x] Le parole, e **non si ri-decidono in implementazione**: il pulsante dice `Chiudi la scheda` quando è in bozza e `Riporta in bozza` quando è chiusa. Non `Riapri`: in questo progetto «riaprire una scheda» vuol già dire tornarci sopra col browser — è la lingua della Story 3.4 e delle sue AC — e la stessa parola per due cose diverse sulla stessa schermata è un difetto che si scopre tardi. Entrambe le etichette nominano lo **stato di destinazione**, che è quello che UX-DR13 chiede.
  - [x] Accanto al pulsante, la parola dello stato corrente: `bozza` o `chiusa`, in `.meta`, **sempre e non solo quando è chiusa**. È la stessa scelta di `question-item.tsx:88-94` col suo motivo: una parola che compare solo nel caso negativo non dice niente a chi non l'ha mai vista comparire, e il pulsante da solo nomina la destinazione, non lo stato. Nessun colore e nessuna pillola: lo stato di compilazione non è un esito, e su questa schermata l'unica cosa colorata satura è già la pillola del verdetto (UX-DR2, regola 5).
  - [x] **Nessuna conferma prima di chiudere**, e nessuna prima di riportare in bozza: l'azione opposta la annulla identica, e `kb-0.md` §6 è esplicito — nessuna conferma per azioni reversibili. Una conferma protegge da una perdita, e qui non si perde niente per costruzione.
  - [x] `btn--secondary` e non `btn--primary`: l'unica azione primaria di questa schermata è il `Salva` della barra (UX-DR10), e non si diventa in due.
  - [x] **Dove va, lo decide la Domanda 2**, e le due strade non sono intercambiabili:
    - **Variante A, l'intestazione della pagina** (raccomandata): `AssessmentHeader` in `page.tsx` riceve `completionStatus` e rende parola e pulsante dentro `.page-header__actions`, accanto alla data. Costo dichiarato: quel contenitore non ha `flex-wrap` e non ha la regola che manda a capo la riga d'errore, che `.card__actions` ha (`globals.css:284-295`). Servono due righe in `globals.css`, e **si scrivono solo se la misura a 375px le chiede** (Task 6), non prima.
    - **Variante B, una card sua in fondo**, dentro `SaveBoundary` e dopo `VerdictCard`: `.card`, `.card__header`, `.card__title`, `.card__actions`, zero CSS nuovo perché la riga d'errore è già gestita. Conseguenza da accettare consapevolmente: vive **solo nello stato pieno**, come la card del verdetto, quindi se le risposte non si caricano la scheda non si può chiudere.
  - [x] `page.tsx`: aggiungere `completion_status` alla `select` di `assessments`. Una colonna sola, e si legge perché si rende: è la regola già scritta tre volte in `types.ts`.
  - [x] **AC1 e AC3 non chiedono codice, chiedono che non se ne scriva.** Nessun `disabled` e nessun `readOnly` su nessuno dei ventinove campi quando la scheda è `chiusa`, nessun avviso, nessuna pillola d'allarme, nessun ramo che cambi la resa oltre alla parola e all'etichetta del pulsante. La verifica è una lettura e un grep (Task 6).

- [x] **Task 4 — Lo stato nell'elenco delle schede, se la Domanda 1 è A** (AC: —, ma è la ragione per cui la story esiste)

  > Task condizionato. Se la Domanda 1 è **B**, questo Task non si esegue e lo si dichiara nel Dev Agent Record; in quel caso `types.ts`, `clienti/[id]/page.tsx` e `assessments-card.tsx` restano invariati e `/clienti/[id]` **non** si rivalida.

  - [x] `src/lib/types.ts`: `AssessmentSummary` cresce di `'completion_status'`. **E il suo commento va corretto, non lasciato**: oggi dice che «l'esito e l'avanzamento sono della 4.1» e che «un dato letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio». La prima metà resta vera, la seconda va tenuta vera aggiungendo la colonna **e** rendendola nello stesso commit.
  - [x] `src/app/(app)/clienti/[id]/page.tsx:101`: `completion_status` nella `select` delle schede.
  - [x] `assessments-card.tsx`: la parola dopo la data e l'interlocutore, in `.meta`, con la stessa forma di `question-item.tsx`. Nessuna classe nuova: `.assessment` è già `flex-wrap` con `gap: 4px 12px` e regge un terzo figlio (`globals.css:843-850`).
  - [x] **Il commento in testa alla card va riscritto, ed è il punto di questo Task.** Oggi dice, righe 25-26: «nessuno stato di compilazione: oggi vale `bozza` per tutte, e un dato che non varia non informa». Da questa story varia, quindi la frase è scaduta e va sostituita da quella vera — cosa la riga porta adesso e cosa arriva ancora con la 4.1 (esito, contatore, barra). Lasciarla è peggio che non aver scritto niente: manda chi implementa la 4.1 a costruire una cosa che c'è.
  - [x] Nessun pulsante nella card del cliente: il comando è **uno solo** e sta sulla schermata di compilazione. Un secondo posto da cui chiudere una scheda è una seconda convenzione per la stessa azione, ed è il momento in cui il perimetro comincia a scorrere.

- [x] **Task 5 — Il debito che questa story apre o sposta** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 3-6-lasciare-in-bozza-o-chiudere (10 agosto 2026)`, appesa **in fondo** al file.
  - [x] Forma di una voce nuova, un bullet solo per quanto lungo: **titolo in grassetto che dice il difetto e non il rimedio**, con `percorso/file.ts:righe`, poi la prosa su cosa succede e cosa lo rende raggiungibile, poi `Rimandato:` o `Rimandato per decisione di Luca del <data>:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**: una story numerata o un evento contabile, mai un generico «più avanti».
  - [x] **Una voce esistente non si riscrive: le si appende in coda un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 3.6, il 10 agosto 2026**:` — e se un'annotazione precedente si scopre falsa si corregge **in vista**, citandone il testo fra virgolette invece di cancellarlo. **La barratura è solo per una voce chiusa per intero.**
  - [x] La voce **riga 131** (salvare una risposta non muove `assessments.updated_at`) va **riletta prima di annotarla**. Questa story aggiunge la seconda scrittura che rivalida `/clienti` e — se la Domanda 1 è A — la **prima** che rivalida `/clienti/[id]`, che è testualmente ciò che quella voce assegna alla 4.1. Il difetto resta identico per le risposte e il trigger non è stato scritto: l'annotazione serve a dirlo, perché chi trovasse `/clienti/[id]` già rivalidata potrebbe leggerla come la chiusura della voce. Il criterio è quello che quella voce si è già data: **un'annotazione che faccia sembrare la voce più chiusa di quanto sia è l'errore già commesso e corretto dentro la voce 18.**
  - [x] La voce **riga 127** (`block_id` non copiato dentro `answers`) va annotata **solo se i numeri cambiano**. Alla creazione di questa story sono identici a quelli che la 3.5 ha già scritto — 1 scheda, 24 risposte, 0 con contenuto — quindi non c'è niente di nuovo da dire. Se la verifica di sessione lascia risposte **con contenuto**, quella è la misura che quella voce aspetta da quattro story, e va scritta col numero.
  - [x] La voce **riga 7** (`.btn` alto 40px) va riletta: questa story aggiunge un secondo `.btn` alla schermata di compilazione, che è quella usata su tablet. Non è un difetto nuovo e la voce non si muove; se annotarlo valga la riga lo decide chi implementa, e la decisione si dichiara comunque nel Dev Agent Record.
  - [x] Ogni scostamento dal conteggio previsto — voci nuove, annotazioni in più o in meno — si dichiara nel Dev Agent Record **col motivo**. Nel File List la riga prende la forma già usata: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni`.

- [x] **Task 6 — Verifica** (AC: 1, 2, 3)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi partono da **212** e crescono di quelli di `completion-status.test.ts`. **Il numero atteso si dichiara prima di eseguire**, non dopo.
  - [x] Grep di perimetro, coi numeri attesi dichiarati **prima**: `grep -rn "from('questions')\|from('question_blocks')" "src/app/(app)/clienti/"` deve restare a **zero righe** — la schermata di compilazione non legge il questionario da nessuna parte, ed è la forma eseguibile dell'AC2 della 3.4. `grep -n "order(" "src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx"` deve restare a **tre righe**, di cui due vere: se diventano una, l'ordine congelato è rotto in un modo che nessun test coglie.
  - [x] Grep delle tre AC, che è l'unico modo automatico di provare un'assenza: sotto `schede/` e sui file nuovi, nessun `disabled=` che dipenda dallo stato di compilazione, nessun `readOnly`, nessun `confirm(`, e `grep -rn "completion_status" src/` deve toccare, **oltre ai file che questa story dichiara, solo righe preesistenti**. Un'assenza non si prova del tutto, ma un grep documentato vale più di una dichiarazione. *(Riscritto dalla code review del 10 agosto 2026: la condizione diceva «solo i file che questa story dichiara» e non si poteva superare — il grep tocca anche `src/lib/verdict.test.ts:56` e `src/lib/database.types.ts:87,105,123`, tutti preesistenti e nessuno modificabile. La casella era spuntata su una verifica impossibile. Con la condizione vera l'esito è **10 file, di cui 2 preesistenti** — `verdict.test.ts` e `database.types.ts` — e passa. Contati, non stimati: `grep -rln "completion_status" src/ | wc -l`.)*
  - [x] Grep del vocabolario, che è la trappola nominata in testa: `grep -rn "'chiuso'" src/lib/completion-status.ts src/app/\(app\)/clienti/completion-actions.ts` deve dare **zero righe**. `chiuso` è lo stato del cliente.
  - [x] Sonda SQL in transazione annullata, con la stessa forma della 3.3, della 3.4 e della 3.5 — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`: scrivere `chiusa` sulla scheda esistente, rileggerla, e **confrontare i `ctid` di `assessments` prima e dopo** per provare che il trigger riscrive la riga davvero. Dentro una transazione `now()` è fermo, quindi `updated_at` **non** discrimina: è la lezione della 3.3, si applica e non si riscopre.
  - [x] **Sonda di AC2 e AC3, che sono l'unica cosa che una sonda può provare meglio di una lettura.** Sulla stessa scheda, dentro la stessa transazione annullata: scrivere `completion_status = 'chiusa'` con `verdict` fermo a `non_deciso`, e poi scrivere `verdict = 'si'` con `completion_status` fermo a `chiusa`. Devono riuscire tutte e due, e la ragione per cui riescono è che **non esiste nessun vincolo fra le due colonne** — provarlo a database vuol dire provare che nessuno l'ha aggiunto per errore.
  - [x] Sonda del rifiuto: un `completion_status` fuori dai due deve essere fermato **dall'azione** prima del database. Che il `check` lo fermerebbe comunque non è un argomento: da lì il messaggio arriva in inglese e parla di un vincolo.
  - [x] Sonda della policy: lo stesso `update` con un `sub` diverso deve toccare **zero righe**, quindi arrivare all'azione come `!data`, indistinguibile da una scheda cancellata — è la forma di `saveVerdict` e la risposta è la stessa.
  - [x] La verifica visiva senza sessione si fa come nella 3.3, nella 3.4 e nella 3.5: riproduzione statica servita in locale con `globals.css` vero, e misure da `getComputedStyle` invece che giudizi. **Se la Domanda 2 è A, la misura a 375px è quella che decide se le due righe di CSS servono**: si guarda se `.page-header` va in overflow con data, parola e pulsante, e il risultato si scrive col numero. È la forma che `deferred-work.md:122` chiede — una regola nuova nasce da una misura e non da un giudizio.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione del 10 agosto 2026, tre strati in parallelo: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Sei reperti scartati come rumore.

**Le tre AC sono soddisfatte, e la prova regge.** Nessun `disabled`, `readOnly`, guardia, avviso o ramo di resa dipende dallo stato di compilazione; l'unico ramo che lo legge decide l'etichetta del pulsante e il valore mandato al server. Nessuna migrazione, nessun vincolo aggiunto. Il perimetro è rispettato alla lettera: i quindici file vietati non sono stati aperti e `git status` elenca esattamente i dodici del File List.

**Quasi tutti i numeri dichiarati reggono al ricalcolo**, ed è la differenza dalla 3.5: 215 test verdi, typecheck muto, build che compila, i tre grep di perimetro a 0/3/0, i due `disabled=` e lo zero di `readOnly`, i contatori del database, le altezze dell'intestazione, la non-regressione di `/clienti` e dello scheletro. **Uno non regge**, ed è il primo `[Patch]` qui sotto.

- [x] [Review][Patch] **Il primo `.field__error` su `--bg` sta a 4,13:1** — le due righe di CSS fanno spazio a una riga d'errore nell'intestazione, che sta su `--bg` e non dentro una card: `--bad` su `--bg` è **4,13:1**, sotto i 4,5 di `design-system.md` §8. Gli altri sedici `.field__error` del repository sono tutti dentro `.card`, cioè su `--surface`, dove lo stesso token dà 4,62:1 e passa. È un'occorrenza **nuova**, introdotta da questa story. **Decisione di Luca del 10 agosto 2026: si corregge ora**, con `color: var(--bad-ink)` sul solo `.page-header__actions .field__error`, che misura **4,84:1** su `--bg`. Conseguenza da portare fino in fondo e non da lasciare implicita: `--bad-ink` era dichiarato il giorno prima come token delle **sole** pillole di verdetto, in `design-system.md` §2 e §9 e in D26. Quel «solo» diventa falso nel momento in cui la regola si scrive, quindi la patch tocca anche quei tre punti — una decisione registrata si supera in vista, non si contraddice in silenzio (`kb-0.md` §8).
- [x] [Review][Patch] **Nessun test copre la logica che inverte lo stato** [`completion-button.tsx:46-64`] — tre ternari sullo stesso booleano `closed`, in tre punti del file, **due orientati all'opposto del terzo**: il payload manda `closed ? 'bozza' : 'chiusa'`, l'etichetta e il messaggio mandano l'altro verso. Invertirne uno solo non fa fallire nessuno dei 215 test e non ferma il typecheck; il caso peggiore chiude una scheda quando si preme `Riporta in bozza`. È esattamente «la logica che, se si rompe, produce dati sbagliati» di `kb-0.md` §7, e i tre test scritti coprono invece `isCompletionStatus`, che è la parte che non può sbagliarsi. La story aveva concluso che «non c'è una seconda decisione pura da estrarre»: **decisione di Luca del 10 agosto 2026, quella conclusione si supera** — `nextCompletionStatus(current)` esce in `completion-status.ts` col suo test, che è la regola già applicata cinque volte, e il pulsante smette di battere i due letterali a mano. Chiude anche, per la parte del payload, il difetto del commento qui sotto.
- [x] [Review][Patch] **La misura a 375px non si riproduce, e la causa attribuita è sbagliata** [`src/app/globals.css:232-237`] — il commento nel CSS e il Dev Agent Record dichiarano `documentElement.scrollWidth` **419 contro 375**, cioè 44px. Una riproduzione statica indipendente, con i font Geist veri e il guscio completo, ne misura **95** (470 contro 375), stabile al variare del nome del cliente. Il 419 dichiarato è **esattamente la larghezza del pannello** che il Dev Agent Record nomina due parole prima («iframe di 375, perché il pannello del browser rende a 419»): il numero sembra la larghezza del contenitore esterno, non un'eccedenza. Più grave del numero è la causa: «senza la riga d'errore non c'era nessuna eccedenza, la causa è precisamente lei» è **falsa** — tolta la riga d'errore e lasciato `nowrap`, l'eccedenza resta di **25px**, perché sono la data, la parola e il pulsante insieme a non entrare. `flex-wrap: wrap` serve al pulsante prima che all'errore. **La decisione resta giusta, le due righe servono davvero**: sbagliati sono il numero e il perché, e viaggiano dentro il codice. Da rimisurare una volta e riscrivere, in `globals.css` e nel Dev Agent Record.
- [x] [Review][Patch] **Lo scheletro di caricamento non riserva più la forma vera: la data salta di ~210px** [`src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx:23-26`] — `.page-header__actions` riserva un solo scheletro largo 80, la data. Da questa story quel contenitore porta **sempre** tre figli (data, parola, pulsante alto 40), perché `completion_status` è `not null default 'bozza'`. Con `justify-content: space-between` il blocco è ancorato a destra, quindi all'arrivo dei dati la data scivola a sinistra di circa 210px, e la riga passa da 16px a 40px di altezza. Il file dichiara nella sua intestazione la regola che così viola: «si riserva lo spazio di quello che c'è sempre». Il Dev Agent Record ha misurato l'**altezza** e concluso «lo scheletro già riserva»: la dimensione che si muove è l'altra. Due scheletri in più — ~40 per la parola, ~150×40 con `borderRadius: var(--r-md)` per il pulsante — e la ragione scritta accanto.
- [x] [Review][Patch] **Il ledger dichiara «per la prima volta nel repository» una rivalidazione che esiste in sedici punti** [`docs/bmad/implementazione/deferred-work.md:131`] — `grep -rn 'revalidatePath(\`/clienti/${' src/` dà **diciotto** righe, due delle quali sono di questa story: le altre sedici la precedono, fra cui `assessment-actions.ts:99`, dove la chiamata è necessaria eccome. La sostanza dell'annotazione è giusta e utile — il trigger su `answers` non è stato scritto, la voce resta aperta — ma la costruisce su una premessa che il primo grep smentisce, e il valore di quel ledger è di essere verificabile. Stesso sovraclaim, più attenuato, in `completion-actions.ts:106-107` («è la prima scrittura per cui questa chiamata è necessaria»). Da riformulare in tutti e due i posti: è la prima **delle tre scritture della schermata di compilazione**, che è la cosa vera e quella che serviva dire.
- [x] [Review][Patch] **Il commento di `completion-status.ts` dichiara un legame col pulsante che non esiste** [`src/lib/completion-status.ts:30`] — «lo manda un pulsante costruito su questo stesso elenco»: il pulsante confronta e manda letterali scritti a mano (`'chiusa'`, `'bozza'`), e `grep` conferma che `COMPLETION_STATUSES` non è usato fuori dal proprio modulo e dal proprio test, mentre il gemello `CLIENT_STATUSES` è consumato davvero da `filters-form.tsx`. Conseguenza reale: il giorno che una migrazione cambia il vocabolario del `check`, si aggiornano il modulo e il test, entrambi passano, e il pulsante resta falso in silenzio — il compilatore non aiuta, perché `completion_status` è `string` nei tipi generati. Da correggere il commento, che oggi promette una garanzia che il codice non dà.
- [x] [Review][Patch] **Una casella del Task 6 è spuntata su una condizione irrealizzabile** — «`grep -rn "completion_status" src/` deve toccare **solo** i file che questa story dichiara»: il grep tocca anche `src/lib/verdict.test.ts:56` e `src/lib/database.types.ts:87,105,123`, tutti preesistenti e nessuno modificabile. Nessun numero falso nel Dev Agent Record, che quel grep non lo dichiara: una casella spuntata su una verifica che non si poteva superare. Da riscrivere la condizione con l'esito vero.
- [x] [Review][Defer] **Il comando non è annunciato né etichettato per chi usa un lettore di schermo** [`completion-button.tsx:63-70`, `page.tsx:221`] — il ramo d'errore ha `role="alert"`, quello di riuscita non ha niente: `disabled={pending}` toglie il fuoco al pulsante appena premuto, e al ritorno l'unico segnale del nuovo stato è lo `<span className="meta">`, che non è una zona live. La parola inoltre è resa nuda, senza niente che la leghi al pulsante che la cambia. **Rimandato: stessa famiglia della perdita di fuoco che la story dichiara già rimandata alla 5.2**, e si chiude con lei o con niente.
- [x] [Review][Defer] **L'errore resta appeso finché non si ripreme** [`completion-button.tsx:48`] — `useWrite` espone `clearError` e il componente non lo destruttura; l'errore si azzera solo all'inizio della pressione successiva. Una sessione scaduta per un istante lascia quindi un `role="alert"` rosso nell'intestazione fissa per tutta la durata della call, e l'unico modo di congedarlo è rieseguire l'azione. **Rimandato perché il difetto è del precedente e non di questa story**: `question-active-button.tsx` — il modello che il Task 3 prescrive di ricalcare — fa esattamente lo stesso. Qui pesa di più perché sta nell'intestazione di una schermata su cui si passa un'ora, invece che in una riga di un elenco di ventitré.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| La colonna `completion_status`, col `check` sui due valori | `assessments`, migrazione `0005` | 2 agosto 2026 |
| L'assenza di qualsiasi vincolo fra verdetto e stato di compilazione | `0005`, dichiarata in testa al file | 2 agosto 2026 |
| Il trigger che muove `assessments.updated_at` | `assessments_set_updated_at`, migrazione `0006` | 2 agosto 2026 |
| La policy che filtra per proprietario | `0007_rls.sql`, `for all` su `assessments` | 2 agosto 2026 |
| Le meccaniche di un pulsante che chiama un'azione | `src/lib/use-write.ts` | 1.5 |
| La forma esatta di un interruttore a due stati | `question-active-actions.ts`, `question-active-button.tsx` | 2.6 |
| Un vocabolario chiuso senza mappa di etichette | `src/lib/client-status.ts` | 1.3 |
| La forma di un'azione che scrive su `assessments` e rivalida l'elenco | `verdict-actions.ts` | 3.5 |
| La riga dell'elenco schede, coi suoi quattro stati | `assessments-card.tsx` | 3.1 |

**Questa story scrive pochissimo codice nuovo.** Due file piccoli, un terzo se la Domanda 1 è A, e qualche riga in tre file esistenti. La trappola non è la difficoltà: è costruire una macchina — un campo che si salva da solo, un registro, una conferma — per una colonna che ha due valori.

### La colonna esiste già: nessuna migrazione

```sql
completion_status     text not null default 'bozza'
                        check (completion_status in ('bozza','chiusa')),
```

Letta da `supabase/migrations/0005_assessments_answers.sql:33-34` e confermata nei tipi generati (`database.types.ts`, `assessments.Row`, dove è `string`). Il restringimento avviene nel codice, come per lo stato del cliente e per il verdetto.

**Nessun vincolo lega `completion_status` a `verdict`**, ed è scritto in due posti: in testa alla migrazione («una scheda si può chiudere senza verdetto, perché decide la persona») e in `database.md` §3. AC2 e AC3 sono quindi già vere a database, e restano vere finché nessuno aggiunge niente. **La 3.5 lo aveva già verificato e scritto**: «La 3.6 non dovrà toglierlo, perché non c'è.»

### Perché il precedente è la 2.6 e non la 3.5

Le due story dell'Epic 3 che precedono questa scrivono **campi**: testo che una persona batte, che si salva da solo dopo tre secondi, che si iscrive a un registro perché ventinove campi devono raccontarsi con una riga sola. Questa story scrive un **interruttore**: due valori, un gesto, nessuna digitazione.

La differenza non è estetica, ed è il punto in cui questa story si sbaglia più facilmente:

- **Non usa `useEditableField`.** Non c'è niente da digitare, niente da attendere tre secondi, niente da riallineare dopo che il server ha ripulito.
- **Non si iscrive al registro** (`save-store.ts`). Il registro esiste per rispondere alla domanda «quanti campi hanno testo non ancora salvato»: un interruttore non ha mai testo non salvato, e iscriverlo vorrebbe dire un `Salva` della barra acceso su una cosa che non si salva a mano.
- **Non tocca la barra.** Il conteggio resta ventinove, e `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts` e `save-indicator.tsx` non si aprono.
- **Usa `useWrite`**, che è esattamente l'attrezzo scritto per questo: «chiamare un'azione da un controllo che non è un campo di testo: una casella, un interruttore, un pulsante» (`use-write.ts:13-17`).

`question-active-button.tsx` è cinquantanove righe, commenti compresi, e le fa tutte. Si legge, si ricalca, e la sola cosa che cambia sono i sostantivi e il fatto che qui la rivalidazione tocca due o tre percorsi invece di uno.

### La rivalidazione: quali percorsi, e perché ognuno

Tre chiamate possibili, e ciascuna va giustificata o omessa consapevolmente. È il punto in cui questa story si comporta diversamente sia da `saveAnswer` sia da `saveVerdict`.

**La rotta di compilazione**, sempre: è dove sta il pulsante, ed è la rivalidazione che fa girare la parola e l'etichetta. Senza, il pulsante resta a dire `Chiudi la scheda` su una scheda appena chiusa.

**`/clienti`**, sempre: la scrittura tocca `assessments`, dove il trigger `assessments_set_updated_at` esiste (`0006_triggers.sql:44`), quindi `updated_at` si muove davvero e l'elenco ordina per quello (`database.md` §5, `last-activity.ts`). È la stessa riga e lo stesso motivo di `saveVerdict`, e resta diverso da `saveAnswer`, che scrive su `answers` dove niente risale alla scheda.

**`/clienti/[id]`**, solo se la Domanda 1 è A. La 3.5 l'ha esclusa scrivendo il motivo: «la card del cliente non rende oggi nessuna delle cinque colonne, e rivalidarla sarebbe costo a effetto zero che sembra la correzione di un difetto». Se la card rende `completion_status`, quel motivo scade: non rivalidarla vuol dire chiudere una scheda, tornare al cliente, e leggere `bozza` su una riga che è `chiusa`. **Ed è la prima volta che diventa necessaria**, cioè un pezzo di quello che `deferred-work.md:131` assegna alla 4.1 — che va annotato (Task 5) e non lasciato credere una chiusura.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/completion-status.ts` | **nuovo** — i due valori e la guardia | 1 |
| `src/lib/completion-status.test.ts` | **nuovo** — col caso che rifiuta `chiuso` | 1 |
| `src/app/(app)/clienti/completion-actions.ts` | **nuovo** — `setCompletionStatus` | 2 |
| `.../schede/[assessmentId]/completion-button.tsx` | **nuovo** — il pulsante, componente client | 3 |
| `.../schede/[assessmentId]/page.tsx` | `completion_status` nella `select`, e il comando dove la Domanda 2 lo mette | 3 |
| `src/app/globals.css` | **solo variante A della Domanda 2, e solo se la misura a 375px lo chiede** | 3, 6 |
| `src/lib/types.ts` | **solo Domanda 1 = A** — `AssessmentSummary` cresce, e il commento si corregge | 4 |
| `src/app/(app)/clienti/[id]/page.tsx` | **solo Domanda 1 = A** — una colonna nella `select` | 4 |
| `.../clienti/[id]/assessments-card.tsx` | **solo Domanda 1 = A** — la parola, e il commento scaduto riscritto | 4 |
| `docs/bmad/implementazione/deferred-work.md` | almeno l'annotazione alla voce 131 | 5 |

**E basta.** In particolare **non** si aprono: `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts`, `components/save-indicator.tsx`, `use-editable-field.ts`, `verdict-card.tsx`, `verdict-field.tsx`, `verdict-actions.ts`, `verdict.ts`, `answer-blocks.tsx`, `answer-field.tsx`, `choice-field.tsx`, `answer-actions.ts`, `assessment-actions.ts`, `supabase/migrations/`. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**: quasi certamente vuol dire che si sta costruendo un campo dove serve un interruttore.

`use-editable-field.ts` merita una riga a sé, perché è stato aperto due volte in due story — dalla 3.4 e dalla revisione della 3.5 — e ogni volta al prezzo dichiarato di riverificare le quattro schermate che lo usano. Sta a **288 righe**, oltre le 200 di `kb-0.md` §2, e il suo punto di ripresa è quello di `deferred-work.md:136`. **Questa story non lo apre e non ne ha nessun bisogno**: un interruttore non passa da lì.

### Trappole note

**1. Costruire un campo dove serve un interruttore.** La più probabile, e la ragione per cui la sezione «Perché il precedente è la 2.6» sta prima dei Task. Il segnale che si sta sbagliando: importare `useEditableField`, o `useAnswerSave`, o toccare `save-store.ts`.

**2. `chiuso` invece di `chiusa`.** Due colonne diverse, due parole a una lettera di distanza, e il compilatore non aiuta perché nei tipi generati sono tutte e due `string`. Il test del Task 1 esiste per questo.

**3. Invertire lo stato sul server.** `update … set completion_status = case when … end` sembra più elegante e costa una pre-lettura, oltre a rendere due schede aperte capaci di annullarsi a vicenda senza errore. Lo stato di destinazione arriva esplicito, come in `setQuestionActive` e come nelle direzioni di `move_*`.

**4. Aggiungere un vincolo, o simularlo in resa.** «Una scheda chiusa non si modifica» sembra la cosa giusta e contraddice AC1 e AC3 alla lettera, oltre a NFR8 e D14. Nessun `disabled`, nessun `readOnly`, nessun avviso: il software registra e mostra, non decide e non vieta.

**5. Chiedere una conferma.** Un `confirm()` prima di chiudere sembra prudenza e non lo è: l'azione opposta annulla, `kb-0.md` §6 vuole la conferma solo per le azioni distruttive, `design-system.md` §5 dice «nessun avviso a comparsa», e la 2.6 ha già chiuso lo stesso punto per la disattivazione di una domanda.

**6. Mettere il comando dentro la card del verdetto.** Zero CSS nuovo e sembra comodo. Ma la posizione comunica un legame, e il legame fra verdetto e stato di compilazione è esattamente quello che AC2 e AC3 negano e che il database si è rifiutato di scrivere. Se la Domanda 2 sceglie il fondo, è una **card sua**, non l'intestazione di quella del verdetto.

**7. Mai `details` nei log.** La riga di `assessments` contiene `verdict_reason`, `condition_text` e `next_step`, cioè un giudizio su un'azienda reale (`kb-0.md` §3 e §4). Solo `code` e `message`, come in `saveVerdict` e in `setQuestionActive`.

**8. Rivalidare `/clienti/[id]` «per sicurezza» se la Domanda 1 è B.** Sarebbe costo a effetto zero che sembra la correzione di un difetto, ed è l'argomento già scritto in `answer-actions.ts:97-100` e ripetuto in `verdict-actions.ts:143-145`. Una chiamata si mette quando qualcosa cambia a schermo.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione.** La colonna, il `check`, il trigger e la policy esistono dal 2 agosto.
- **L'avanzamento** (4.1), **l'esito nella card del cliente e nell'elenco** (4.1 e 4.2), **l'esportazione** (4.3).
- **Il trigger su `answers` che muove `assessments.updated_at`** — `deferred-work.md:131`, punto di ripresa dichiarato: Story 4.1. Questa story lo lascia dov'è, e il fatto che `setCompletionStatus` muova `updated_at` **non** lo chiude: quella voce parla delle risposte.
- **Qualsiasi filtro o ordinamento per stato di compilazione**, nell'elenco clienti o altrove: nessuna AC lo chiede e nessun documento lo nomina.
- **La macchina del salvataggio per intero.** Cinque file, elencati sopra, e nessuno si apre.
- **Il `beforeunload`**, che resta rifiutato con i due motivi del 9 agosto 2026.
- **La correzione dei 40px di `.btn`** — `deferred-work.md` voce 1, che appartiene alla 5.2.
- **Lo stato di compilazione dentro l'esportazione**, che è della 4.3 e che deciderà lei se dirlo.

### Test

Un modulo puro nasce e va sotto test, ed è la stessa regola applicata a `client-status.ts`, `answer-control.ts`, `save-store.ts`, `owed-exit.ts` e `verdict.ts`: la logica che, rompendosi, produce un dato sbagliato **senza dare nessun errore**.

- `completion-status.ts`: `isCompletionStatus` è una guardia di sicurezza e non una comodità. Scritta larga, lascia arrivare al `check` di Postgres un messaggio in inglese al posto sbagliato; scritta stretta, rifiuta un valore legittimo e la scheda non si chiude più. Il caso di `chiuso` è quello che vale davvero, perché è l'errore che una persona commette e nessun tipo intercetta.

`completion-button.tsx` è codice del browser e di presentazione: **non** si costruisce un'impalcatura di test del DOM per lui, che sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2 e §7). Si verifica a mano, e la verifica si dichiara.

**Non c'è una seconda decisione pura da estrarre**, e vale la pena dirlo perché la 3.5 ne aveva tre: qui non esiste nessun `showsCondition`, nessuna regola di visibilità, nessuna validazione. Se durante l'implementazione ne emergesse una, vale la regola già applicata cinque volte: un modulo suo con i suoi test.

### Contratto visivo

Nessuna forma nuova. Il pulsante è `btn btn--secondary`, la parola è `.meta`, e — nella variante B della Domanda 2 — la card è `.card` con `.card__header`, `.card__title` e `.card__actions`, tutte esistenti.

**L'unico CSS che questa story può portare sono due righe**, e solo nella variante A: `flex-wrap: wrap` su `.page-header__actions` e la regola `flex-basis: 100%` per la sua `.field__error`, che sono esattamente quelle che `.card__actions` ha già (`globals.css:284-295`). **Si scrivono se e solo se la misura a 375px le chiede**, e la misura si scrive col numero: è la forma che `deferred-work.md:122` chiede dopo il rilievo della 3.1, dove `globals.css` fu aperto su un giudizio di progetto invece che su un bisogno misurato.

Lo **stato in caricamento** (`loading.tsx` della rotta di compilazione) non si tocca, e va detto perché è una scelta e non un'omissione: oggi riserva lo spazio del titolo e di una card, cioè «quello che c'è sempre». Nella variante A il comando sta nell'intestazione, che lo scheletro già riserva; nella variante B sta in una card in fondo, sotto la piega, dove riservarla non toglie nessun salto visibile — che è la stessa conclusione a cui la 3.5 è arrivata per la card del verdetto. Se chi implementa la cambia, la scrive col motivo.

### Sicurezza

Una scrittura nuova su `assessments`, la terza dopo `openAssessment` e `saveVerdict`, e va guardata riga per riga perché tocca dati di clienti reali (`kb-0.md` §9).

- **La riga si protegge da sé.** La policy `assessments_owner_all` (`0007_rls.sql:55`) è `for all to authenticated` con `using` e `with check` su `owner_id`, quindi un `update` sulla scheda di un altro proprietario tocca zero righe e arriva come `!data`, indistinguibile da una scheda cancellata. È la forma di `saveVerdict`, e la risposta è la stessa.
- **La colonna non è un ingresso.** A differenza di `saveVerdict`, qui il nome della colonna **non arriva dal browser**: è una sola e sta scritta nel codice. È il motivo per cui non serve nessun `isCompletionFieldKey`, ed è la ragione per cui aggiungerlo sarebbe una difesa per una porta che non c'è.
- **Il valore sì.** `isCompletionStatus` rifiuta prima del database; il `check` resta l'ultima difesa e non la prima.
- **Il percorso da rivalidare** si ricava dalla riga scritta e mai dal `formData`.
- **I log** portano solo `code` e `message`: la riga di `assessments` contiene il motivo del verdetto.
- **Nessun `redirect`**, nemmeno a sessione finita, per la regola scritta in `supabase/session.ts`.

### Project Structure Notes

Nessuna cartella nuova, nessuna dipendenza nuova. Due file nuovi nella variante minima, tre nella massima, tutti in posti che hanno un precedente esatto: il modulo puro accanto a `client-status.ts` e `verdict.ts`, l'azione accanto alle altre azioni dei clienti, il componente dentro la cartella della rotta che lo rende.

`completion-status.ts` sta **fuori** da `verdict.ts` e non dentro, e la ragione non è la lunghezza: `verdict.ts` tiene insieme i quattro valori e i cinque campi perché «tutti e cinque sono lo stesso concetto», e lo stato di compilazione **non è quel concetto** — è la proprietà che AC2 e AC3 dichiarano indipendente dal verdetto. Metterli nello stesso file sarebbe la prima delle scelte che, una alla volta, ricostruiscono il legame che il database si è rifiutato di scrivere.

Il componente sta dentro `schede/[assessmentId]/` e non in `src/components/`, a differenza di `VerdictPill`: quella è finita là perché la 4.1 e la 4.2 la rendono altrove, mentre qui il comando è **uno solo e in un posto solo**, per decisione del Task 4. Se un giorno lo stato si dovesse cambiare anche dalla card del cliente, quel giorno il file si sposta — e sarà una decisione, non una previsione.

### Piattaforma in uso, verificata

Letti da `package.json` e `node_modules` il 9 agosto 2026 e invariati alla baseline: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

Niente di quello che questa story usa è nuovo: `useWrite` esiste dalla 1.5, `revalidatePath` da sempre, e non serve nessuna API che non sia già in uso in almeno tre file.

### Stato del database, e cosa NON è cambiato dalla 3.5

Misurato il 10 agosto 2026 sul progetto `izkycpwxuedpkzgpvcxc`.

| | Dichiarato dalla 3.5 alla sua chiusura | Oggi |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| schede / risposte | 1 / 24 | 1 / 24 |
| risposte con contenuto | 0 | **0** |
| questionari / blocchi | 1 / 9 | 1 / 9 |
| domande, di cui attive | 24 / 23 | 24 / 23 |

**È la prima volta in quattro story che i numeri non si muovono**, e la ragione è dichiarata: la verifica di sessione della 3.5 è stata fatta fuori da questo progetto Supabase. La scheda del 10 agosto è ancora intatta — `updated_at` uguale a `created_at` alle 07:40:49 di Roma, `verdict` `non_deciso`, `completion_status` **`bozza`**, `total_questions` 24 — e nessuna scrittura l'ha mai toccata.

**Due conseguenze per questa story.**

La prima è comoda: c'è una scheda vera, in bozza, con un valore di default che nessun codice ha mai scritto, su cui provare la prima transizione a `chiusa`. La sonda del Task 6 gira su quella, in transazione annullata.

La seconda riguarda `deferred-work.md:127`, e va detta senza arrotondarla: i numeri sono identici a quelli che la 3.5 ha già annotato, quindi **non c'è niente di nuovo da scrivere** — la voce si annota solo se la verifica di sessione di questa story lascia risposte **con contenuto**, che è la misura che quella voce aspetta da quattro story e che non è mai arrivata. Il criterio che la voce si è data è «la prima scheda che Luca compila e tiene perché gli serve», e chi la riprende deve contare le righe, non leggere le date.

### Intelligence dai commit e dalla story precedente

Gli ultimi commit sono `628c7bf` (chiusura 3.5), `1cc5e25` (implementazione e revisione 3.5), `8e2977e` (chiusura 3.4), `e665bca` (implementazione e revisione 3.4). **La forma è costante da cinque story e va rispettata: un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca.** Lo stato `done` non lo mette la revisione.

Dalla 3.5, quattro cose di metodo che questa story riusa invece di riscoprire:

- Le sonde SQL girano in **transazione annullata**, e dentro una transazione `now()` è fermo: `updated_at` non discrimina, si confrontano i `ctid`.
- La verifica visiva senza sessione si fa su una riproduzione statica servita in locale, con misure da `getComputedStyle` invece che giudizi.
- Una decisione presa durante l'implementazione si scrive in **«Domande per Luca»** e non solo nel Dev Agent Record: la revisione della 3.5 ha dovuto correggere esattamente quello.
- I numeri dichiarati nel Dev Agent Record vanno **verificati dopo**: la 3.5 ne ha dichiarati tre sbagliati — due conteggi di grep e il numero delle rotte dinamiche — e la revisione li ha corretti uno per uno. I rapporti di contrasto invece hanno retto tutti e otto al ricalcolo, ed è la differenza fra un numero misurato e un numero contato di fretta.

Dalla verifica di sessione della 3.5, un avvertimento che vale più di tutti: **cinque caselle chiedevano un'annotazione e non l'hanno ricevuta**, quindi restano passate e non misurate. Era già successo con la 3.4, che ne aveva lasciate tre. Le caselle di questa story che chiedono una misura la chiedono davvero, e sono poche apposta.

### Riferimenti

- FR23, e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-3-una-call-intera-dentro-lo-strumento]
- NFR8, UX-DR2, UX-DR10, UX-DR13 — [Source: docs/bmad/pianificazione/epics.md#nonfunctional-requirements]
- Il software non blocca niente, e gli stati sono etichette — [Source: docs/00-contesto-e-decisioni.md#d14]
- Il verdetto è un giudizio e non un calcolo — [Source: docs/00-contesto-e-decisioni.md#d7]
- Lo stato di compilazione fra i campi della scheda — [Source: docs/prd-v1.md#3-entità-e-campi]
- Il criterio di accettazione 6: bozza oggi, chiusa domani — [Source: docs/prd-v1.md#6-criteri-di-accettazione]
- La colonna, il suo `check` e l'assenza di vincoli col verdetto — [Source: docs/database.md#3-tabelle]
- L'ultima attività, e da dove si legge — [Source: docs/database.md#5-ultima-attività-del-cliente]
- Nessuna conferma per le azioni reversibili — [Source: docs/kb-0.md#6-interfaccia-e-design]
- La rivalidazione di `/clienti` a ogni scrittura su una scheda — [Source: docs/bmad/implementazione/deferred-work.md:51]
- Il trigger che manca su `answers`, e il suo punto di ripresa — [Source: docs/bmad/implementazione/deferred-work.md:131]
- `globals.css` si apre su una misura e non su un giudizio — [Source: docs/bmad/implementazione/deferred-work.md:122]

### Domande per Luca — da chiudere prima di `dev-story`

Due, e cambiano tutte e due il lavoro. La prima cambia **cosa** si costruisce, la seconda **dove**. Nessun Task va eseguito indovinando: se restano aperte, l'implementazione si ferma e lo dice.

**Domanda 1 — Lo stato di compilazione si vede nell'elenco delle schede dentro la scheda cliente, in questa story o alla 4.1?**

Il fatto: la frase che dà il senso a questa story è «so that **dall'elenco** distinguo quelle da riprendere da quelle chiuse», ma nessuna delle tre AC nomina l'elenco. E `assessments-card.tsx:24-26` porta una promessa scritta: «nessuno stato di compilazione: oggi vale `bozza` per tutte, e un dato che non varia non informa». Da questa story varia.

**A — sì, in questa story.** Tre file in più — `types.ts`, `clienti/[id]/page.tsx`, `assessments-card.tsx` — una colonna nella `select`, una parola nella riga, il commento scaduto riscritto, e `revalidatePath('/clienti/[id]')` nell'azione. Prezzo: la story tocca la scheda cliente, che è la schermata che la 4.1 aprirà comunque per l'esito e l'avanzamento, quindi quella riga viene toccata due volte a distanza di poco.

**B — no, la porta la 4.1.** La story resta dentro la schermata di compilazione: due file nuovi e una `select` allargata di una colonna. Prezzo, e va detto per intero: si costruisce un interruttore il cui effetto **non si vede da nessuna parte se non premendolo di nuovo**, cioè la story consegna metà della frase che la giustifica. E il commento della card resta scritto in un modo che è diventato falso.

**Il default proposto è A**, per due ragioni. La prima è che la frase «so that» non è decorazione: è il criterio con cui si sa se la story è finita, e con B non lo è. La seconda è che il commento della card è una promessa fatta da un'altra story a questa — «un dato che non varia non informa» dice, in trasparenza, «quando varierà, mettetelo» — e lasciarla scaduta è il difetto che `kb-0.md` §8 chiede di non produrre.

**Domanda 2 — Dove sta il comando sulla schermata di compilazione?**

Il fatto: la schermata ha già la sua unica azione primaria (il `Salva` della barra), la sua intestazione con la data della call, i suoi blocchi e la card del verdetto in fondo. Il comando è secondario ovunque lo si metta; cambia cosa comunica la posizione, e in un caso cambia il CSS.

**A — nell'intestazione della pagina**, accanto alla data della call, con la parola dello stato. Si vede **arrivando**, senza scorrere, che è quello che serve riaprendo una scheda a mesi di distanza; e sta accanto alle altre due cose che dicono *quale* scheda è (il cliente e la data), che è ciò che lo stato di compilazione è. Continua a funzionare anche quando le risposte non si caricano, perché la riga della scheda è stata letta lo stesso — coerente con D14. Prezzo: `.page-header__actions` non ha `flex-wrap` e non ha la regola che manda a capo la riga d'errore, che `.card__actions` ha; servono **due righe di CSS**, e solo se la misura a 375px le chiede.

**B — una card sua in fondo**, dentro `SaveBoundary` e dopo quella del verdetto. Segue il flusso della call: si compila, si scrive il verdetto, si chiude. Zero CSS nuovo, perché `.card__header` e `.card__actions` gestiscono già pulsante e riga d'errore. Due prezzi: lo stato **non si vede arrivando**, e la card vive solo nello stato pieno — se le risposte non si caricano, la scheda non si può chiudere, che è la stessa conseguenza che la 3.5 ha accettato consapevolmente per il verdetto.

**Il default proposto è A.** Il ragionamento: il comando si preme una volta per scheda, lo stato si **legge** ogni volta che la si apre, e fra i due è il secondo a decidere dove va la coppia. Un pulsante in fondo che si preme una volta costa uno scorrimento; una parola in fondo che si dovrebbe leggere all'arrivo costa uno scorrimento **ogni volta**, e quasi sempre non lo si fa.

Quello che nessuna delle due varianti cambia: la parola c'è sempre, il pulsante nomina lo stato di destinazione, non c'è nessuna conferma, e nessun campo si blocca.

---

### Risposte di Luca, 10 agosto 2026, prima di `dev-story`

**Domanda 1 → A.** Lo stato di compilazione si vede nell'elenco delle schede dentro la scheda cliente, **in questa story**. Task 4 eseguito per intero: `types.ts`, `clienti/[id]/page.tsx` e `assessments-card.tsx` toccati, il commento scaduto della card riscritto, e `revalidatePath('/clienti/[id]')` dentro `setCompletionStatus`. Conseguenza da tenere presente alla 4.1: la riga della scheda è già a tre figli, e l'esito, il contatore e la barra saranno il quarto, il quinto e il sesto — non i primi tre.

**Domanda 2 → A.** Il comando sta **nell'intestazione della pagina**, accanto alla data della call, dentro `.page-header__actions`. Le due righe di CSS che la variante A metteva in conto **sono servite**, e non per scelta: a 375px l'intestazione mandava la pagina in scorrimento laterale di ~~44px~~ **95px**, e ne restavano **25** anche togliendo la riga d'errore. *(Il 44 era la larghezza del pannello scambiata per un'eccedenza, e la causa era attribuita alla sola riga d'errore: rimisurato e corretto dalla code review del 10 agosto 2026, tabella e meccanismo in Dev Agent Record.)* Il motivo è scritto accanto alle due righe in `globals.css`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 10 agosto 2026.

### Debug Log References

Nessun ramo di debug e nessun `console.log` lasciato. Le sonde SQL sono girate tutte in transazione annullata sul progetto `izkycpwxuedpkzgpvcxc`, e i contatori dopo sono identici a quelli prima (v. sotto). La verifica visiva è una riproduzione statica servita in locale con il `globals.css` vero, come nella 3.3, nella 3.4 e nella 3.5.

### Completion Notes List

**Le due domande sono state chiuse da Luca prima di scrivere codice: Domanda 1 = A, Domanda 2 = A.** Entrambi i default proposti. Il perimetro è quindi quello pieno — Task 4 eseguito, `/clienti/[id]` rivalidata, comando nell'intestazione della pagina — e le due risposte sono scritte anche in fondo a «Domande per Luca», dove chi rilegge fra sei mesi va a cercarle.

**Numeri dichiarati prima di eseguire, e verificati dopo.** Test attesi 212 + 3 = **215**: eseguiti **215, tutti verdi**. `npm run typecheck` senza uscita. `npm run build` compila. I tre grep di perimetro erano attesi a 0, 3 e 0 e sono usciti **0, 3 e 0**. *(Ricontati dalla code review del 10 agosto 2026 e confermati tutti e quattro. Il conteggio dei test è poi salito a **216** con il test di `nextCompletionStatus` che la revisione ha aggiunto.)*

**Le tre AC si soddisfano non scrivendo, e la prova è un grep più una sonda.** Nessun `disabled` e nessun `readOnly` dipendono dallo stato di compilazione: sotto `schede/` i soli `disabled=` sono due — `save-bar.tsx:41` su `summary.dirty === 0`, preesistente, e `completion-button.tsx:63` su `pending`, che è il volo della richiesta e non lo stato della scheda. `readOnly` in tutto `src` è a **0**. `confirm(` in tutto `src` è a **1**, ed è `edit-question-form.tsx:215` della Story 2.4, fuori da `schede/`: sotto `schede/` è **0**.

**La sonda di AC2 e AC3 le prova a database, che è l'unico posto dove «non esiste nessun vincolo» si può dimostrare.** In una sola transazione annullata, sulla scheda vera `9f99f61f`: `completion_status` a `chiusa` con `verdict` fermo a `non_deciso` — **riesce**; poi `verdict` a `si` con `completion_status` fermo a `chiusa` — **riesce**; poi ritorno a `bozza` col verdetto scritto che **resta**. Il `ctid` della riga passa da `(0,21)` a `(0,23)`, quindi il trigger `assessments_set_updated_at` riscrive la riga davvero: è il confronto che la 3.3 ha insegnato a fare, perché dentro una transazione `now()` è fermo. (Qui `updated_at` si sarebbe visto muovere lo stesso, perché `created_at` è di stamattina e non di questa transazione — ma il `ctid` è la prova che non dipende da quella coincidenza.)

**Sonda del rifiuto, e la ragione per cui la guardia sta prima del database.** `completion_status = 'chiuso'` — lo stato del *cliente* — e la stringa vuota vengono fermati dal `check` con `sqlstate 23514` e il messaggio `new row for relation "assessments" violates check constraint "assessments_completion_status_check"`. È letteralmente la frase che `isCompletionStatus` esiste per non far mai arrivare a schermo (NFR16).

**Sonda della policy.** Lo stesso `update` con `sub` `00000000-…` tocca **0 righe**, quindi arriva all'azione come `!data`, indistinguibile da una scheda cancellata: la risposta è `ASSESSMENT_GONE`, come in `saveVerdict`.

~~**Le due righe di CSS servono, e il numero lo dice.** Misura a 375px esatti (iframe di 375, perché il pannello del browser rende a 419), riproduzione statica col `globals.css` vero. Senza le due righe, l'intestazione che porta la riga d'errore manda la pagina in scorrimento laterale: `documentElement.scrollWidth` **419 contro 375**, cioè **44px di eccedenza**, e la riga d'errore resta in colonna larga 60px e alta 96. Con `flex-wrap: wrap` e `flex-basis: 100%` l'eccedenza è **0** e l'errore va a capo a piena larghezza (237,6 × 32). Senza la riga d'errore non c'era nessuna eccedenza: la causa è precisamente lei. È la forma che `deferred-work.md:122` chiede — una regola nuova nasce da una misura e non da un giudizio.~~

**Corretto dalla code review del 10 agosto 2026: la conclusione reggeva, il numero e la causa no.** Rimisurato due volte da due riproduzioni indipendenti, col `globals.css` vero e i font Geist veri, e stavolta **senza iframe** — la finestra del browser portata a 375 esatti, così `documentElement.scrollWidth` non può raccogliere la larghezza di un contenitore esterno:

| | `scrollWidth` | eccedenza su 375 |
|---|---|---|
| con le due righe, con la riga d'errore | 375 | **0** |
| senza le due righe, con la riga d'errore | 470 | **95** |
| senza le due righe, senza la riga d'errore | 400 | **25** |
| con le due righe, senza la riga d'errore | 375 | **0** |

Stabile al variare del nome del cliente (`Bar`, `Rossi Costruzioni`, `Consorzio Metalmeccanico Valdarno`: 95, 95, 95) e 99 con la scheda chiusa, dove l'etichetta è più lunga. **I 419 dichiarati erano la larghezza del pannello**, che la riga barrata qui sopra nomina due parole prima di usarla come misura: il numero vero è 95, non 44.

**E la causa era sbagliata, che conta più del numero perché finiva dentro il codice.** «Senza la riga d'errore non c'era nessuna eccedenza» è falso: senza di lei e senza `wrap` restano **25px**. Lo spazio utile a 375 è 343 (375 meno i 16+16 di `.main` sotto i 720); data 78, parola 32,7 e pulsante fanno 245,4 **col pulsante già compresso al minimo** — 102,7 invece dei suoi 146,6 — e sommati al min-content di `Prequalifica` (106,9) più il gap danno 368,3. `flex-wrap` serve quindi **al pulsante prima che all'errore**, e `flex-basis: 100%` chiude i 95 che restano. La conseguenza pratica è scritta accanto alle due righe in `globals.css`: chi togliesse la riga d'errore da questa intestazione non può togliere anche il `wrap`.

**`.page-header__actions` è una classe condivisa, quindi la modifica è stata misurata anche altrove.** Gli altri due usi sono `/clienti` (contatore + `Nuovo cliente`) e lo scheletro di `schede/[assessmentId]/loading.tsx`. Misurati a 375 con e senza le due righe: **identici** — intestazione di `/clienti` alta 40 e figli nelle stesse posizioni, scheletro alto 48. Nessuna regressione.

~~**Lo scheletro non è stato toccato, e qui ci sono i numeri invece della previsione.** A 1280 l'intestazione a caricamento finito è alta **76 con o senza il pulsante** — l'altezza la detta la colonna di sinistra, non le azioni — quindi il salto scheletro→pieno resta quello preesistente, 48→76. A 375 l'intestazione passa da 76-82 a **79 (nome lungo) / 87 (nome corto)**, cioè il comando aggiunge 5-11px al salto già esistente. Non abbastanza per aprire una voce, ma la story diceva «lo scheletro già riserva» e a 375 è vero solo in approssimazione: è scritto qui perché sia contato e non dedotto.~~

**Corretto dalla code review del 10 agosto 2026: le altezze erano giuste, ma la dimensione che si muove è l'altra.** `.page-header` è `justify-content: space-between`, quindi `.page-header__actions` è ancorato a destra e cresce **verso sinistra**: misurare l'altezza non poteva vedere il difetto. Lo scheletro riservava 80 (la sola data) contro i 289,4 del blocco vero, e la data scivolava a sinistra di **209,4px a 1280** e **147,9px a 375** nell'istante in cui i dati arrivavano — il salto esatto che `loading.tsx` dichiara nella sua intestazione di esistere per togliere. `loading.tsx` **è quindi stato toccato**, con la ragione scritta accanto: tre scheletri invece di uno, larghezze misurate (data 80, parola 36, pulsante 146 × 40 col raggio `--r-md`). Dopo la patch lo scostamento è **4,6px a 1280** e **1px a 375**, cioè il solo arrotondamento in eccesso di chi non sa quale delle due parole arriverà.

**Task 5, e ogni scostamento dichiarato col motivo.**
- **Voce `deferred-work.md:131`** (il trigger che manca su `answers`) — **annotata, come il Task chiede.** L'annotazione dice la cosa che si sbaglierebbe: `/clienti/[id]` è ora rivalidata per la prima volta, ed è testualmente quello che la voce assegna alla 4.1, ma è rivalidata per un altro motivo (la card rende lo stato di compilazione) e **il trigger non è stato scritto**. Compilare ventiquattro risposte continua a non muovere `assessments.updated_at`.
- **Voce `deferred-work.md:127`** (`block_id` non copiato dentro `answers`) — **non annotata, ed è una decisione.** Il Task la chiede «solo se i numeri cambiano»: sono identici a quelli che la 3.5 ha già scritto — 1 scheda, 24 risposte, **0 con contenuto** — perché tutte le sonde sono girate in transazione annullata. Non c'è niente di nuovo da dire, e un'annotazione che ripete i numeri di ieri fa sembrare la voce più viva di quanto sia.
- **Voce `deferred-work.md:7`** (`.btn` alto 40px) — **non annotata, ed è la decisione che il Task lascia a chi implementa.** Il pulsante nuovo è misurato a **40px**, quindi sotto i 44 di `design-system.md` §8. La voce però registra già dalla 3.3 che la schermata di compilazione porta un `.btn` a 40 nel suo stato pieno: una seconda istanza sulla stessa schermata aggiunge un conteggio, non un'informazione, e chi chiuderà la voce alla 5.2 non deciderà niente di diverso sapendolo. Il numero resta scritto qui.
- **Una annotazione in più rispetto alle previste, e il motivo.** La voce **`deferred-work.md:137`** — «una rivalidazione che cade sul ramo d'errore smonta `SaveBoundary`, e arriva dal percorso di successo» — è stata annotata perché questa story ne cambia il danno atteso: i percorsi di successo che rivalidano la rotta di compilazione passano da due a **tre**, e il terzo non parte da un campo che si sta scrivendo ma da un pulsante che si preme **quando si ha finito**, cioè nel momento di massima probabilità che i ventinove campi contengano testo non ancora salvato. La probabilità non cambia, la strada nemmeno, il danno sì. La voce nominava un innesco solo.
- **Nessuna voce nuova**, quindi **nessuna sezione nuova in fondo al file**: la formula `## Deferred from: …` non è stata scritta perché non avrebbe avuto niente sotto.

**Perimetro rispettato.** Nessuna migrazione. Non sono stati aperti `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts`, `components/save-indicator.tsx`, `use-editable-field.ts`, `verdict-card.tsx`, `verdict-field.tsx`, `verdict-actions.ts`, `verdict.ts`, `answer-blocks.tsx`, `answer-field.tsx`, `choice-field.tsx`, `answer-actions.ts`, `assessment-actions.ts`, `supabase/migrations/`. `loading.tsx` non è stato toccato (v. sopra, coi numeri).

**Stato del database alla fine, ricontato.** 3 clienti, 1 persona, 1 scheda, 24 risposte di cui **0 con contenuto**, 9 blocchi, 24 domande. La scheda `9f99f61f` è ancora `bozza`, `non_deciso`, con `updated_at` uguale a `created_at`: **mai toccata da nessuna scrittura**, esattamente come l'ha trovata la story. Il primo `chiusa` scritto per davvero lo scriverà Luca dalla verifica di sessione.

### File List

| File | Cosa |
|---|---|
| `src/lib/completion-status.ts` | **NUOVO** — i due valori nell'ordine del `check`, il tipo e `isCompletionStatus` |
| `src/lib/completion-status.test.ts` | **NUOVO** — 3 test, incluso quello che rifiuta `chiuso` |
| `src/app/(app)/clienti/completion-actions.ts` | **NUOVO** — `setCompletionStatus`, e le tre rivalidazioni |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx` | **NUOVO** — il pulsante, componente client |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` | MODIFICA — `completion_status` nella `select`, parola e pulsante in `AssessmentHeader` |
| `src/app/globals.css` | MODIFICA — le due righe su `.page-header__actions`, nate dalla misura a 375px |
| `src/lib/types.ts` | MODIFICA — `AssessmentSummary` cresce di `completion_status`, e il commento è tenuto vero |
| `src/app/(app)/clienti/[id]/page.tsx` | MODIFICA — una colonna nella `select` delle schede |
| `src/app/(app)/clienti/[id]/assessments-card.tsx` | MODIFICA — la parola nella riga, e il commento scaduto riscritto |
| `docs/bmad/implementazione/deferred-work.md` | MODIFICA — 0 voci nuove, 2 annotazioni |
| `docs/bmad/implementazione/sprint-status.yaml` | MODIFICA — stato della story |
| `docs/bmad/implementazione/3-6-lasciare-in-bozza-o-chiudere.md` | MODIFICA — caselle, Dev Agent Record, Change Log, risposte alle due domande |

**Aggiunte dalla code review del 10 agosto 2026**, con le sette patch applicate:

| File | Cosa |
|---|---|
| `src/lib/completion-status.ts` | `COMPLETION_DRAFT` e `COMPLETION_CLOSED` nominati, `nextCompletionStatus`, e il commento che prometteva un legame col pulsante corretto |
| `src/lib/completion-status.test.ts` | il quarto test, su `nextCompletionStatus`: **216 test** in tutto |
| `.../schede/[assessmentId]/completion-button.tsx` | i due letterali via, un verso solo: `next` dal modulo puro, etichetta e messaggio che lo nominano |
| `.../schede/[assessmentId]/loading.tsx` | MODIFICA — **non prevista dalla story**, e col motivo: tre scheletri invece di uno, perché la data scivolava di 209,4px a 1280 e 147,9 a 375 |
| `src/app/globals.css` | il commento riscritto con la misura vera (95 e 25, non 44) e la causa vera, più `color: var(--bad-ink)` sulla riga d'errore dell'intestazione |
| `src/app/(app)/clienti/completion-actions.ts` | la «prima scrittura per cui la chiamata è necessaria» ridotta a quello che è vero |
| `docs/design-system.md` | §2 e §9 — il «solo dentro le pillole» di `--bad-ink` superato in vista |
| `docs/00-contesto-e-decisioni.md` | D26 — stessa cosa, dove la restrizione era registrata |
| `docs/bmad/implementazione/deferred-work.md` | **2 voci nuove** (i due `defer` della revisione), **1 annotazione** alla voce del contrasto della 3.5, e la riformulazione della «prima volta nel repository» dentro la voce 131 |

## Verifica di sessione

Le caselle che nessun agente può spuntare, perché richiedono un accesso vero e un browser vero. `done` si mette dopo queste, non dopo la revisione. Dove una casella chiede un numero o un esito, **il numero va scritto**: la 3.4 ne ha lasciate tre senza e la 3.5 cinque, e restano passate ma non misurate.

**AC1 — chiudere riesce, e non chiude niente**

- [x] Apro la scheda esistente, che è in bozza, e la chiudo: la parola passa a `chiusa` e il pulsante passa a `Riporta in bozza`. Nessuna conferma, nessun avviso.
- [x] Sulla stessa scheda **chiusa**, scrivo in un campo di risposta qualsiasi: si salva come prima, e l'indicatore in fondo lo dice. Se qualcosa fosse bloccato o spento, va annotato **cosa**.
- [x] La riporto in bozza e la richiudo, due volte di fila: passa sempre, senza ritardi e senza errori.

**AC2 — il verdetto non è una condizione**

- [x] Chiudo una scheda con verdetto `non deciso` e tutti i campi del verdetto vuoti: riesce, e niente chiede di compilare niente.

**AC3 — e nemmeno al contrario**

- [x] Sulla scheda **chiusa**, scrivo il verdetto e il motivo: si salvano come su una in bozza. È il criterio di accettazione 6 del PRD, ed è la casella che dice se le due colonne sono davvero indipendenti a schermo e non solo a database.

**Dove si vede** *(solo se la Domanda 1 è A)*

- [x] Chiudo una scheda, torno alla scheda cliente: nella riga di quella scheda la parola è `chiusa`, e sulle altre è `bozza`. Se resta `bozza` su quella appena chiusa, la rivalidazione di `/clienti/[id]` non c'è o non funziona, e va annotato **cosa** si è visto.
- [x] Con due schede sullo stesso cliente, una chiusa e una no: le due righe si distinguono a colpo d'occhio, e nessuna delle due sembra un errore dell'altra.

**Quello che questa story muove e che si vede altrove**

- [x] Chiudo una scheda, torno all'elenco clienti: **il cliente è salito in cima**, perché l'ultima attività si è mossa. È la casella che dice se `revalidatePath('/clienti')` è quella giusta. Se non sale, va annotato **cosa** si è visto.

**Forma e misura**

- [x] Sul tablet: il pulsante è raggiungibile e il bersaglio è almeno 44px. **Il numero va scritto**, perché `.btn` è a 40 e la voce di `deferred-work.md` lo dice da otto story.
- [x] A 375px: l'intestazione (variante A) o la card (variante B) non manda niente in overflow e non fa scorrere la pagina di lato. **Se la variante è A, è questa la misura che decide se le due righe di CSS servono**, e va scritta col numero.
- [x] Guardo la schermata a occhi socchiusi: l'unica cosa colorata satura resta la pillola del verdetto (UX-DR2, regola 5). La parola dello stato di compilazione non compete con lei.

**Alla fine**

- [x] Riconto `clients`, `people`, `assessments`, `answers`, `question_blocks`, `questions` e annoto i numeri. Se restano risposte **con contenuto**, va scritto: è la misura che `deferred-work.md:127` aspetta da quattro story.
- [x] Se qualcosa non va come qui sopra, si annota **cosa** e **dove**, non «non funziona».

### Esito della verifica di sessione

**Passata da Luca il 10 agosto 2026**, tutte e tredici le caselle. Niente da annotare: nessuna si è comportata diversamente da come è scritta qui sopra.

**Il riconto delle tabelle, misurato e non spuntato**, sul progetto `izkycpwxuedpkzgpvcxc`:

| | alla creazione della story | adesso |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| schede / risposte | 1 / 24 | 1 / 24 |
| risposte con contenuto | 0 | **0** |
| schede chiuse / con verdetto | 0 / 0 | **0 / 0** |
| blocchi / domande, di cui attive | 9 / 24 / 23 | 9 / 24 / 23 |

**`deferred-work.md:127` non riceve niente nemmeno stavolta**, ed è la quinta story di fila: quella voce aspetta risposte **con contenuto** e ne trova zero. Il criterio che si è data — «la prima scheda che Luca compila e tiene perché gli serve» — non è ancora arrivato, e chi la riprende deve continuare a contare le righe invece di leggere le date.

**La scheda `9f99f61f` è intatta anche dopo la verifica**: `completion_status` `bozza`, `verdict` `non_deciso`, `updated_at` ancora uguale a `created_at` alle 07:40:49 di Roma, quindi **nessuna scrittura ha mai toccato quella riga**. Va scritto per non farne dedurre la cosa sbagliata: è lo stesso schema della 3.5, la cui verifica è stata fatta fuori da questo progetto Supabase. Il primo `chiusa` scritto per davvero **su questo progetto** non è ancora stato scritto.

**Le caselle che chiedevano un numero e non l'hanno ricevuto sono due**, ed è meno delle tre della 3.4 e delle cinque della 3.5, ma non è zero: il bersaglio del pulsante sul tablet — che `.btn` tenga i 44px di `design-system.md` §8, dove il codice dice 40 — e l'eccedenza a 375px, che la code review ha però misurato per conto suo (95 senza le due righe, 0 con). Restano passate e non misurate, ed è scritto qui perché si conti invece di dedurlo.

## Change Log

| Data | Chi | Cosa |
|---|---|---|
| 10 agosto 2026 | Luca | Verifica di sessione passata, tutte e tredici le caselle, niente da annotare. Story a **`done`**, e con lei si chiude l'**Epic 3**: la call intera sta dentro lo strumento — si apre (3.1), si compila (3.2), si salva da sola (3.3), si riprende (3.4), si conclude col verdetto (3.5) e si marca come finita (3.6). Riconto delle tabelle misurato e non dedotto: invariato su tutte le righe, **0 risposte con contenuto**, quindi `deferred-work.md:127` resta senza la sua misura per la quinta story di fila. La scheda `9f99f61f` su questo progetto Supabase è ancora intatta, `updated_at` uguale a `created_at`: la verifica è stata fatta altrove, come per la 3.5. Due caselle chiedevano un numero e non l'hanno ricevuto, contro le tre della 3.4 e le cinque della 3.5 |
| 10 agosto 2026 | code-review | Revisione a tre strati (Blind Hunter, Edge Case Hunter, Acceptance Auditor). **Le tre AC passano** e il perimetro regge: nessun `disabled`, `readOnly`, guardia o ramo di resa dipende dallo stato di compilazione, nessuna migrazione, i quindici file vietati non aperti. Quasi tutti i numeri dichiarati reggono al ricalcolo — test, grep, contatori del database, altezze, non-regressione di `/clienti` — **tranne la misura a 375px**, che era 95px e non 44 e la cui causa non era la riga d'errore ma il pulsante: rimisurata senza iframe, tabella completa in Dev Agent Record. Sette patch applicate, due delle quali su decisione di Luca: `nextCompletionStatus` estratto e messo sotto test (**216 test verdi**), e `--bad-ink` sulla riga d'errore dell'intestazione, che è l'unico `.field__error` fuori da una card e stava a 4,13:1 — col «solo dentro le pillole» superato in vista in `design-system.md` §2 e §9 e in D26. Toccato `loading.tsx`, che la story dichiarava di non toccare, e col motivo misurato: lo scheletro riservava 80 contro 289,4, e la data scivolava di 209,4px. Due voci rimandate alla Story 5.2, entrambe della famiglia del fuoco e del lettore di schermo. Sei reperti scartati come rumore |
| 10 agosto 2026 | dev-story | Implementazione. Domanda 1 = A e Domanda 2 = A, chiuse da Luca prima di scrivere codice, quindi perimetro pieno. Quattro file nuovi — il modulo puro coi suoi 3 test, l'azione, il pulsante — e cinque modificati. **215 test verdi** (212 + 3, numero dichiarato prima), typecheck muto, build che compila. Nessuna migrazione. Le due righe di CSS su `.page-header__actions` **sono servite**, e per una misura: senza, a 375px la riga d'errore manda la pagina in scorrimento laterale di ~~**44px**~~ *(95px, e non per la sola riga d'errore: corretto dalla code review dello stesso giorno)*; con, l'eccedenza è 0. AC2 e AC3 provate a database in transazione annullata — si chiude senza verdetto e si scrive il verdetto su una chiusa — col `ctid` che passa da `(0,21)` a `(0,23)`. `deferred-work.md`: 0 voci nuove, **2 annotazioni** (la voce del trigger mancante e quella della rivalidazione che smonta `SaveBoundary`), e due non-annotazioni dichiarate col motivo. Contatori del database invariati: la scheda è ancora `bozza` e mai toccata |
| 10 agosto 2026 | create-story | Creazione del file. Baseline `628c7bf`: 212 test verdi, typecheck muto, quindici migrazioni. Stato del database rimisurato e **identico** a quello dichiarato dalla 3.5, per la prima volta in quattro story: 1 scheda con `completion_status` `bozza` mai scritta da nessun codice. Nessuna migrazione: la colonna e il suo `check` esistono dalla 0005, e nessun vincolo la lega al verdetto. Il precedente identificato è la Story 2.6 e non la 3.5. Due domande aperte a Luca, entrambe da chiudere prima di `dev-story` |
