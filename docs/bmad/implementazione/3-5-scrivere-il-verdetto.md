---
baseline_commit: 8e2977e
---

# Story 3.5: Scrivere il verdetto

Status: review

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 10 agosto 2026

> **Baseline.** La Story 3.4 è implementata, revisionata e chiusa: `8e2977e` su `main`, albero pulito. Tutti i conteggi di questo file sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati il 10 agosto 2026: **196 test verdi**, `npm run typecheck` senza uscita, quindici migrazioni a registro tutte col prefisso numerico.
>
> **Lo stato del database non è più quello che la 3.4 dichiara, e la differenza conta.** La 3.4 si chiude scrivendo «0 schede, 0 risposte, 24 domande tutte attive». Oggi ci sono **3 clienti, 1 persona, 1 scheda, 24 risposte, 1 questionario, 9 blocchi, 24 domande di cui 23 attive**. La scheda è nata alle 07:40 di Roma del 10 agosto, un minuto dopo il commit di chiusura, non è mai stata toccata da allora (`updated_at` uguale a `created_at`), ha `total_questions` 24, **zero risposte con contenuto**, verdetto `non_deciso` e tutti e quattro gli altri campi del verdetto a `null`. Le conseguenze stanno in **Dev Notes → «Stato del database»**: una riguarda questa story — c'è finalmente una scheda vera su cui provare — e una riguarda una voce di debito che va riletta con i numeri nuovi.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want chiudere la scheda con un giudizio mio e il motivo,
so that fra tre mesi so non solo cosa ho deciso ma perché.

## Acceptance Criteria

**AC1 — in fondo alla scheda c'è il verdetto, coi suoi campi**
**Given** una scheda compilata
**When** arrivo in fondo
**Then** trovo il verdetto fra sì, sì condizionato, no e non deciso, con motivo, prossimo passo, e in caso di condizionato la condizione e la data entro cui verificarla (FR22)

**AC2 — cambiarlo riesce sempre**
**Given** un verdetto già scritto
**When** lo cambio
**Then** il cambiamento riesce sempre, in qualsiasi momento, senza conferme né avvisi (NFR8)

**AC3 — non scriverlo è una risposta legittima**
**Given** una scheda senza verdetto
**When** la lascio così
**Then** resta `non_deciso` e nessun avviso mi ferma

**AC4 — la pillola, col suo colore e col suo testo**
**Given** il verdetto
**When** guardo la sua pillola
**Then** verde per sì, ambra per condizionato, rosso per no, grigio per non deciso, ciascuna col proprio testo accanto al colore (UX-DR2, UX-DR5)

**AC5 — nessun suggerimento di esito, da nessuna parte**
**Given** una scheda compilata
**When** cerco un punteggio, una raccomandazione o un suggerimento di esito
**Then** non ne esiste nessuno in nessun punto della schermata (NFR7)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **Le cinque colonne esistono già dalla migrazione 0005, e questa story non porta nessuna migrazione.** `verdict` (`not null default 'non_deciso'`, con il `check` sui quattro valori), `verdict_reason`, `condition_text`, `verify_by`, `next_step`. Chi comincia scrivendo SQL sta rifacendo una cosa fatta il 2 agosto.
>
> **Non è una schermata nuova ed è tutta dentro il confine di salvataggio che esiste.** La card del verdetto sta in fondo alla schermata di compilazione, dopo i blocchi e prima della barra ancorata, e i suoi campi si iscrivono **allo stesso registro** dei ventiquattro campi di risposta: un indicatore solo, un `Salva` solo, una `Riprova` sola. Un secondo indicatore, una seconda barra o un `Salva` per campo contraddicono UX-DR8 e la decisione della 3.3.
>
> **Il salvataggio non si riscrive: `useEditableField` fa già tutto.** Cambia la fonte del valore e l'azione che scrive, non la macchina. Chi costruisce una variante del salvataggio dentro `schede/` fa la seconda copia di una decisione, che è la «duplicazione silenziosa» di `kb-0.md` §9.
>
> **La differenza vera rispetto a `saveAnswer`, e va capita prima di scrivere l'azione:** scrivere una risposta **non** muove `assessments.updated_at`, scrivere il verdetto **sì**, perché il trigger `assessments_set_updated_at` esiste dalla 0006 e la riga scritta è quella della scheda. L'ultima attività del cliente si muove davvero, quindi qui `revalidatePath('/clienti')` **non è decorativa** — ed è l'unico punto in cui questa story si comporta diversamente dalla 3.3, che invece l'aveva esclusa con un motivo che qui non vale. Il ragionamento per esteso in **Dev Notes → «La rivalidazione»**.
>
> **AC5 non è una casella da spuntare: è un divieto che governa ogni scelta di questa story.** Nessun conteggio, nessuna barra, nessun ordinamento che suggerisca un esito migliore di un altro, nessun colore sul selettore, nessun testo che consigli. La cosa più facile da sbagliare non è aggiungere un punteggio — nessuno lo farebbe — è mettere in cima l'opzione «sì» perché sembra l'ordine naturale. L'ordine è quello del vincolo `check`, come per gli stati del cliente, e il motivo è scritto.
>
> **Non porta lo stato di compilazione** (3.6, `completion_status` resta `bozza` e questa story non lo tocca), **né l'esito nella card del cliente e nell'elenco** (4.1 e 4.2), **né l'avanzamento** (4.1), **né l'esportazione** (4.3), **né il trigger su `answers` che muove `assessments.updated_at`** (4.1, `deferred-work.md:131`).
>
> **Le tre decisioni di Luca sono chiuse il 10 agosto 2026 e stanno per esteso in Dev Notes → «Domande per Luca».** In breve: i due campi condizionali si vedono col verdetto condizionato **oppure** quando hanno già un contenuto salvato, così niente di scritto diventa mai invisibile; il debito di contrasto delle pillole **si chiude qui**, con tre token nuovi usati solo dentro le pillole; la card del verdetto resta **dentro il confine di salvataggio com'è**, quindi nello stato pieno. La story non ha più rami condizionati.

## Tasks / Subtasks

- [x] **Task 1 — Il vocabolario del verdetto e i cinque campi, in un modulo puro** (AC: 1, 4, 5)

  - [x] File nuovo `src/lib/verdict.ts`, puro: niente React, niente Supabase, così `npm test` lo copre senza riscrivere niente (`kb-0.md` §7). Ricalca `client-status.ts` e `client-fields.ts`, che sono i due precedenti esatti.
  - [x] `VERDICTS` come `as const` — e `as const` non è cosmetico, senza si allarga a `string[]` e il tipo non vale più niente — **nell'ordine del vincolo `check` di `0005_assessments_answers.sql:28`**: `si`, `si_condizionato`, `no`, `non_deciso`. Poi `type Verdict`, e `isVerdict(value: unknown): value is Verdict` con un `Set`, per la stessa ragione di `isClientStatus`: il valore arriva dal browser, non lo scrive una persona, e qualsiasi altra cosa è una richiesta che non doveva esistere e si rifiuta prima di toccare il database.
  - [x] **Qui serve una mappa valore → etichetta, e per gli stati del cliente non serviva: è la differenza da non saltare.** `client-status.ts` dichiara di non averla perché «i cinque valori del database sono già le parole che compaiono nell'interfaccia». Qui non è vero: nel database c'è `si_condizionato`, a schermo va `sì condizionato`, con l'accento e senza trattino basso. `VERDICT_LABELS: Record<Verdict, string>` con `Record<Verdict, …>` e non `Record<string, …>`, così il giorno che un quinto valore entra nel vincolo e non qui il compilatore si ferma invece di mostrare una stringa grezza.
  - [x] I cinque campi come elenco di descrittori nello stesso file — `VERDICT_FIELDS`, con `key`, `label` e `kind` — e `isVerdictFieldKey`, che è **la stessa difesa di `isClientFieldKey` e per lo stesso motivo**: senza, l'azione diventa una scrittura arbitraria su qualsiasi colonna della propria riga, `owner_id` e `total_questions` compresi, e la policy protegge le righe di un altro proprietario, non la colonna sbagliata sulla propria.
  - [x] Le etichette: `Esito` (`verdict`), `Motivo` (`verdict_reason`), `Condizione` (`condition_text`), `Verificare entro` (`verify_by`), `Prossimo passo` (`next_step`). `Esito` e non `Verdetto` perché `Verdetto` è già il titolo della card e un `<h2>` seguito da una `<label>` con la stessa parola si legge come un difetto; le due parole restano legate — il glossario di `AGENTS.md` definisce il verdetto come «l'esito che la persona scrive» — ed è la stessa parola che la 4.2 userà per la colonna dell'elenco. **Non ri-decidere questa scelta in implementazione.**
  - [x] I `kind`: `verdict` (selettore), `long` (motivo), `short` (condizione, prossimo passo), `date` (verificare entro). `kind` decide **solo quale controllo si rende**, non se il campo si salva da solo: su questa schermata si salva da solo tutto, ed è la decisione della 3.2 e della 3.3 (v. **Dev Notes → «Come si salva su questa schermata»**).
  - [x] Test in `src/lib/verdict.test.ts`: i quattro valori nell'ordine del vincolo, `isVerdict` che rifiuta la stringa vuota, `null`, un numero e un valore fuori elenco, un'etichetta per ciascuno dei quattro, `isVerdictFieldKey` che accetta le cinque chiavi e **rifiuta `owner_id`, `total_questions`, `completion_status` e `client_id`** — quest'ultimo caso non è per fare numero: è la ragione per cui la funzione esiste.

- [x] **Task 2 — La data facoltativa, senza riscrivere una validazione che esiste già** (AC: 1)

  - [x] `verify_by` è una colonna `date` e arriva da un `<input type="date">`, cioè dal browser: va validata sul server (NFR10), e la validazione di una data esiste già in `src/lib/call-date.ts` con i suoi test — forma `AAAA-MM-GG`, round-trip che scarta `2026-02-31`, e il primo giorno che Postgres accetta. **Riscriverla è «duplicazione silenziosa» (`kb-0.md` §9); importarla com'è la usa con la semantica sbagliata.**
  - [x] La semantica sbagliata, per esteso: `validateCallDate(value, today)` risponde `today` sul campo svuotato, perché la data di una call ha un default. Un `verify_by` svuotato deve diventare **`null`**, non oggi: scrivere oggi vorrebbe dire inventare una scadenza che nessuno ha scritto.
  - [x] La forma: aggiungere a `call-date.ts` una seconda funzione esportata — `validateVerifyBy(value: unknown)` che risponde `{ ok: true; date: string | null }` o `{ ok: false; message }` — che condivide con la prima il controllo di forma, il round-trip e il primo giorno, e differisce solo sul vuoto. Nello stesso file e non in uno nuovo: è una cosa sola, «una data scritta da una persona, validata sul server», e sono le due entrate della stessa macchina. Se estrarre il nucleo comune costa più di quanto renda, si estrae comunque: due copie del round-trip divergono alla prima riscrittura.
  - [x] Il messaggio d'errore: non riusare `CALL_DATE_INVALID`, che nomina la call. Una costante sua, che dice cosa fare e non cosa è successo (`kb-0.md` §6, NFR16).
  - [x] Test nuovi in `call-date.test.ts`: vuoto → `null` (**non** oggi, ed è il caso che giustifica la funzione), `''` e `undefined` trattati come vuoto, `null` rifiutato come chiave assente da una richiesta che il modulo rende sempre, forma storta rifiutata, `2026-02-31` rifiutato, una data valida che torna sé stessa.

- [x] **Task 3 — L'azione che scrive, e la rivalidazione che qui non è decorativa** (AC: 1, 2, 3)

  - [x] File nuovo `src/app/(app)/clienti/verdict-actions.ts`, `'use server'`, una azione sola: `saveVerdict`. File suo e non dentro `assessment-actions.ts` né `answer-actions.ts` — «un file d'azione porta una azione», regola già dichiarata in `question-update-actions.ts` e applicata dalla 3.3.
  - [x] La forma è quella di `saveAnswer` riga per riga, che a sua volta è quella di `updateClientField`: `openSession`, uuid verificato prima di toccare il database, chiave del campo verificata con `isVerdictFieldKey`, `maybeSingle`, log dei soli `code` e `message`, ritorno del valore ripulito in `saved`.
  - [x] **Nessun `redirect`, nemmeno a sessione finita.** Vale qui esattamente come in `saveAnswer`, e per un motivo in più: una navigazione porterebbe via quello che è appena stato scritto negli altri campi *e* nei ventiquattro sopra.
  - [x] I tre campi di testo passano da `normalizeTextValue` (importata, non riscritta: è la stessa definizione di «vuoto» del conteggio dell'avanzamento). `verdict` passa da `isVerdict` e si rifiuta se non è uno dei quattro, come `updateClientStatus` fa per lo stato. `verify_by` passa dal Task 2.
  - [x] `typeof raw !== 'string'` distinto dallo svuotamento, come in `saveAnswer`: svuotare un campo si fa mandando la stringa vuota; una chiave assente è una richiesta malformata, e trattarla come «svuota» vorrebbe dire cancellare un motivo e rispondere che è andata bene.
  - [x] **La rivalidazione, e qui `saveAnswer` non è il modello da copiare.** Due chiamate: la rotta di compilazione — si esce alla scheda cliente e si rientra senza ricaricare — e **`/clienti`**, perché il trigger `assessments_set_updated_at` (0006) muove `assessments.updated_at`, che è la chiave con cui l'elenco ordina (`database.md` §5, `last-activity.ts`). È la regola dichiarata chiusa dalla 3.1 e applicata; la 3.3 l'aveva esclusa con un motivo che **qui non vale**, e il perché sta in **Dev Notes → «La rivalidazione»**. `/clienti/[id]` **non** si rivalida: oggi non rende nessuna delle cinque colonne, e rivalidarla sarebbe costo a effetto zero che sembra la correzione di un difetto — l'argomento è quello già scritto in `answer-actions.ts:96-100`. Diventerà necessaria con la 4.1.
  - [x] Il `client_id` per il percorso si ricava **dalla riga appena scritta** (`.select('id, client_id')`), mai dal `formData`: un percorso suggerito dal browser è la voce a ledger di `PERSON_GONE`.
  - [x] Due messaggi, come in `saveAnswer`: quello del guasto transitorio («Riprova fra un momento») e quello della riga sparita, che dice **Ricarica la pagina** e non «torna all'elenco», perché mandare via da una schermata piena di testo appena scritto è la cosa peggiore.

- [x] **Task 4 — La card del verdetto, dentro il confine di salvataggio** (AC: 1, 2, 3, 5)

  - [x] `page.tsx`: aggiungere alla `select` di `assessments` le cinque colonne (`verdict, verdict_reason, condition_text, verify_by, next_step`) e rendere la card **dentro `SaveBoundary`, dopo `AnswerBlocks`**, che è «arrivo in fondo». `SaveBoundary` rende `{children}` e poi la barra, quindi due figli bastano e non serve toccarlo.
  - [x] `src/lib/types.ts`: un tipo `AssessmentVerdict` come `Pick<AssessmentRow, …>` sulle cinque colonne, con la stessa regola già scritta due volte in quel file — si leggono esattamente le colonne che si rendono. **E si corregge una riga sbagliata dello stesso file**: il commento di `AssessmentSummary` dice «il verdetto è della Story 3.5», mentre l'esito nella card del cliente è della **4.1** (`epics.md`, AC1 della 4.1: «vedo l'elenco delle sue schede con data, esito e avanzamento»). Questa story non tocca `AssessmentSummary`, e il commento va corretto proprio perché il file è aperto: lasciarlo manderebbe chi implementa la 4.1 a cercare in questa story qualcosa che non c'è.
  - [x] File nuovo `verdict-card.tsx`, componente server, nessun `'use client'`: è una card con un titolo e cinque moduli, e la parte che si tocca è il campo. **Nessun elemento `<form>`**, per la stessa ragione scritta in `answer-blocks.tsx` e in `answer-field.tsx`: un `<form>` porta l'invio implicito con Invio, cioè un ricaricamento che porta via quello che è stato scritto, su una schermata dove si preme Invio per andare a capo. Su questa card la trappola è peggiore che sui blocchi, perché qui i controlli sono corti e un Invio ci arriva davvero.
  - [x] File nuovo `verdict-field.tsx`, componente client, un campo: `useEditableField` più l'iscrizione al registro, ricalcando `answer-field.tsx` — `run` **dentro `useCallback`** (è la trappola più grossa di questa schermata, e vale identica qui), l'effetto di pulizia in un effetto suo che gira solo allo smontaggio, l'effetto di iscrizione senza elenco di dipendenze, `aria-describedby` costruito solo sugli elementi che esistono, la riga d'errore sotto il campo.
  - [x] **La chiave nel registro non può essere l'`id` del campo e basta**: le voci sono indicizzate per stringa e le altre ventiquattro usano l'`id` della risposta. `verdetto-${field.key}` non può collidere con un uuid. Sbagliando, un campo del verdetto e una risposta si sovrascrivono a vicenda nel registro e la barra racconta la scheda sbagliata — in silenzio.
  - [x] I controlli: selettore per `verdict` — **senza opzione vuota**, perché la colonna è `not null` con default e un verdetto c'è sempre, esattamente come lo stato del cliente — `textarea` con `.input--long` per il motivo, `input type="text"` per i due corti, `input type="date"` per la data (sul tablet apre il selettore di sistema; nessun `min` e nessun `max`, perché il software registra e non vieta).
  - [x] Il layout: `.detail-grid` con `.field--wide` sul motivo, che è la ricetta già usata dalla scheda cliente per «una textarea di tre righe dentro una colonna da 220px non è visibile, è nascosta di fatto». Nessuna classe nuova se quelle che ci sono bastano.
  - [x] **AC3 e AC2 non chiedono codice, chiedono che non se ne scriva**: nessun `required`, nessun asterisco, nessun `confirm()`, nessun avviso quando il verdetto cambia da `si` a `no`, nessun blocco. La verifica è una lettura e un grep (Task 7).
  - [x] **AC5, la parte che si può sbagliare in buona fede**: l'ordine delle quattro opzioni è quello del vincolo `check` e non un ordine di merito; nessun colore sul selettore; nessun conteggio di risposte compilate; nessuna frase che commenti la scheda. Il verdetto è sempre della persona (NFR7, D7).
  - [x] I due campi condizionali — condizione e data — si rendono quando il verdetto è `si_condizionato` **oppure** quando almeno uno dei due ha già un contenuto salvato (decisione di Luca del 10 agosto 2026, Domanda 1). La seconda metà non è un di più: è quello che impedisce a un testo scritto di diventare invisibile cambiando verdetto, e quindi di ricomparire solo nell'esportazione della 4.3 sotto un «no», dove non significa più niente.
  - [x] **La condizione va in `verdict.ts` come funzione pura con i suoi test, e non scritta in linea nel JSX.** È esattamente la logica che, sbagliata, nasconde un dato senza dare nessun errore (`kb-0.md` §7). `showsCondition(verdict, conditionText, verifyBy)`, coi casi da fissare: condizionato con entrambi vuoti → sì; non condizionato con entrambi vuoti → no; non condizionato con la sola condizione → sì; non condizionato con la sola data → sì; **non condizionato con una condizione di soli spazi → no**, con la stessa definizione di vuoto di `normalizeTextValue`, altrimenti un campo riappare per uno spazio.
  - [x] **I tre argomenti non vengono dalla stessa fonte, e la differenza è deliberata: il verdetto è quello vivo del selettore, i due contenuti sono quelli salvati.** Col verdetto salvato, scegliere `sì condizionato` farebbe comparire i due campi **tre secondi dopo**, cioè un'attesa che durante una call si legge come uno strumento rotto. Coi contenuti vivi, invece, il campo sparirebbe sotto le dita mentre si cancella l'ultimo carattere della condizione — che è il difetto peggiore dei due. Le due fonti diverse danno il comportamento giusto in entrambi i casi, ed è la stessa fonte che segue la pillola.
  - [x] ~~La conseguenza da conoscere e non da correggere: svuotata la condizione con un verdetto non condizionato, i due campi spariscono **quando il salvataggio è passato**, non alla prima battuta. È voluto, e ritornano scegliendo di nuovo `sì condizionato`.~~ **Superata dalla revisione del 10 agosto 2026, per decisione di Luca dello stesso giorno.** Quella conseguenza non era da conoscere, era da correggere: lo smontaggio butta via il timer armato del campo accanto — bastava svuotare la condizione mentre la data non era ancora salvata, senza toccare il verdetto — e toglie dal registro una voce che poteva essere in stato `failed`, facendo dire alla barra «Salvato» su un testo mai scritto e non più a schermo. **I due campi ora restano montati per tutta la sessione una volta comparsi:** `showsCondition` decide **se compaiono**, non se restano, e la variante B′ resta alla lettera al caricamento della schermata, che è dove decide davvero.
  - [x] La regola che non si negozia, qualunque cosa si renda: **il server non azzera mai `condition_text` e `verify_by` quando il verdetto cambia**. Sarebbe cancellare quello che una persona ha scritto, cioè l'unica promessa non negoziabile del prodotto, e nessun vincolo del database lo chiede — a differenza delle opzioni della scelta singola nella 2.4, dove il `check` lo pretendeva.
  - [x] ~~Resta scoperta, ed è dichiarata: cambiando il verdetto **mentre una scrittura sulla condizione è già in volo**, i due campi si smontano e il testo battuto durante il viaggio si perde. È la finestra residua che la 3.4 dichiara aperta (`deferred-work.md:18`, quello che resta di (a)), non una nuova; qui si apre in un punto nuovo, e per questo va nominata nel Dev Agent Record invece di lasciarla credere chiusa. Non si chiude toccando `use-editable-field.ts`, che è fuori perimetro.~~ **Chiusa dalla revisione del 10 agosto 2026, e senza toccare `use-editable-field.ts`.** La riga aveva ragione sul fatto che non si chiude dentro l'hook, e torto sul fatto che quello fosse l'unico posto: non smontando più i due campi, il punto nuovo sparisce e quello che resta di (a) torna a essere la sola navigazione via dalla pagina, com'era prima di questa story. L'annotazione alla voce 18 di `deferred-work.md` è stata corretta in vista di conseguenza.

- [x] **Task 5 — La pillola, e il debito di contrasto che questa story eredita** (AC: 4)

  - [x] File nuovo `src/components/verdict-pill.tsx`, che ricalca `status-pill.tsx`: proprietà `string` — perché `AssessmentRow['verdict']` è `string` nei tipi generati e quei tipi non si modificano a mano — restringimento con `isVerdict` dentro il componente, e un verdetto sconosciuto reso neutro invece di far cadere la pagina. In `src/components/` e non dentro `schede/`, perché la 4.1 e la 4.2 la rendono nella card del cliente e nell'elenco: è lo stesso motivo per cui `StatusPill` sta lì.
  - [x] **Nessun punto di 6px**: il punto è degli stati del cliente, dove serve perché il fondo è uguale per tutti e cinque. Qui la regola di `design-system.md` §5 è quella non superata — fondo nella tinta chiara, testo nel colore pieno — e il testo dell'etichetta accanto al colore è AC4 e UX-DR2 («il colore non è mai l'unico portatore di significato»).
  - [x] **Tre** modificatori in `globals.css` accanto a quelli degli stati, non quattro: uno per `si`, uno per `si_condizionato`, uno per `no`, ciascuno con la sua tinta di fondo e il suo inchiostro. Per `non_deciso` **il caso base di `.pill` è già giusto** — fondo `--neutral-tint`, testo `--ink-muted` — e non serve nessun modificatore: v. la riga qui sotto, che è il motivo misurato.
  - [x] **Il contrasto, misurato il 10 agosto 2026 con la formula WCAG e non stimato a occhio** (`design-system.md` §2 dichiara la voce aperta e dice che si chiude «nelle pillole e non nei token»):

    | Pillola | Testo su tinta | Rapporto |
    |---|---|---|
    | sì | `--ok` su `--ok-tint` | **3,77:1** |
    | sì condizionato | `--warn` su `--warn-tint` | **3,86:1** |
    | no | `--bad` su `--bad-tint` | **3,85:1** |
    | non deciso, col colore pieno | `--neutral` su `--neutral-tint` | **3,02:1** — il peggiore dei quattro, e `design-system.md` §2 nomina invece il `sì` |
    | non deciso, col caso base | `--ink-muted` su `--neutral-tint` | **6,37:1** |

    Il minimo che UX-DR14 e NFR13 chiedono è 4,5:1, e il testo della pillola è 12px peso 500, quindi non rientra nell'eccezione del testo grande. **Il quarto si chiude gratis** non aggiungendo il modificatore.
  - [x] **Gli altri tre si chiudono qui** (decisione di Luca del 10 agosto 2026, Domanda 2), ed è la voce che `design-system.md` §2 tiene aperta dal 9 agosto. Tre token nuovi in `globals.css` coi valori misurati `#0D7C52` (4,51:1), `#985F09` (4,57:1) e `#BB402E` (4,51:1) — circa il 10% più scuri dei pieni, tinta invariata — **usati solo dentro le pillole e mai al posto di `--ok`, `--warn` e `--bad`**, che servono anche come testo su bianco, dove il contrasto c'è già. È la forma che il design system prescrive: «si chiude scurendo i quattro colori pieni solo dentro le pillole, non i token».
  - [x] I tre valori vanno **anche** in `design-system.md`, §2 e §9, che è l'unico posto dove i token stanno scritti insieme a `globals.css`: un esadecimale che vive in uno solo dei due è la deriva che `AGENTS.md` e UX-DR16 vietano. Nella §2 va riscritta la frase che dichiara la voce aperta, e va detto **cosa è cambiato e cosa no** — i quattro pieni restano quelli di D26, la pillola è l'unico posto che usa i tre scuriti — perché una voce chiusa senza dire *come* è stata chiusa, fra tre mesi, si rilegge come una contraddizione fra la §2 e la §9.
  - [x] Nominarli per quello che sono, non per il loro valore: la convenzione del file lega il nome al ruolo (`--ok`, `--ok-tint`), quindi qualcosa come `--ok-ink` accanto a `--ok-tint`. Il nome deve dire **dove si usa**, perché il prossimo che li trova non deve poterli scambiare per una versione «migliore» dei pieni.
  - [x] `non_deciso` **non** riceve il quarto token: il caso base della pillola sta già a 6,37:1, e aggiungerlo per simmetria sarebbe un valore in più con un contrasto in meno.
  - [x] La pillola sta nell'intestazione della card, a destra del titolo, dentro `.card__actions`, che `.card__header` già gestisce. **Segue il valore vivo del selettore, non quello sul server** — la stessa fonte da cui `showsCondition` prende il verdetto (Task 4): dire cosa hai scelto è il lavoro della pillola, dire se è arrivato è il lavoro dell'indicatore, ed è il contratto di ogni campo di questa schermata. Leggendo dal server, la pillola resterebbe grigia per tre secondi dopo aver scelto `sì`.

- [x] **Task 6 — Il debito che questa story apre o sposta** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 3-5-scrivere-il-verdetto (10 agosto 2026)`, appesa **in fondo** al file. Una story può aprire due sezioni, implementazione e code review.
  - [x] Forma di una voce nuova, un bullet solo per quanto lungo: **titolo in grassetto che dice il difetto e non il rimedio**, con `percorso/file.ts:righe`, poi la prosa su cosa succede e cosa lo rende raggiungibile, poi `Rimandato:` o `Rimandato per decisione di Luca del <data>:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**: una story numerata o un evento contabile, mai un generico «più avanti». Il localizzatore di riga e il punto di ripresa nominato sono i due rilievi che la revisione della 3.4 ha fatto su questo file: non ripeterli.
  - [x] **Una voce esistente non si riscrive: le si appende in coda un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 3.5, il 10 agosto 2026**:` — e se un'annotazione precedente si scopre falsa si corregge **in vista**, citandone il testo fra virgolette invece di cancellarlo. **La barratura è solo per una voce chiusa per intero**, `~~` fuori dal grassetto e sul solo titolo, con la voce che resta in posizione.
  - [x] La voce **riga 127** (`block_id` non copiato dentro `answers`) va annotata coi numeri di oggi, ed è la sola annotazione **prevista**: la finestra che quella voce chiama «gratuita» era motivata da `answers` vuota, e oggi `answers` ha **24 righe**. La misura, non l'aggettivo: una colonna `not null` senza default su quella tabella oggi richiede un riempimento. Che le 24 righe siano una scheda **mai compilata** — zero risposte con contenuto, mai toccata dalla sua apertura — va scritto, perché è quello che decide se la voce sia da leggere come chiusa o come ristretta, e non lo decide questa story.
  - [x] La voce **riga 131** (salvare una risposta non muove `assessments.updated_at`) va **riletta prima di annotarla, e annotata solo se questa story cambia qualcosa per lei**: `saveVerdict` muove `assessments.updated_at` e rivalida `/clienti`, quindi il difetto «si compila per un'ora e il cliente è dov'era» resta identico per le risposte, ma smette di valere per il verdetto. Se e come dirlo lo decide chi implementa, con un criterio solo: un'annotazione che faccia sembrare la voce più chiusa di quanto sia è l'errore già commesso e corretto dentro la voce 18.
  - [x] Ogni scostamento dal conteggio previsto — voci nuove, annotazioni in più o in meno — si dichiara nel Dev Agent Record **col motivo**, come ha fatto la 3.4 con la sua terza annotazione. Nel File List la riga prende la forma già usata: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni`.

- [x] **Task 7 — Verifica** (AC: 1, 2, 3, 4, 5)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi partono da **196** e crescono: i nuovi di `verdict.test.ts` e quelli aggiunti a `call-date.test.ts`. **Il numero atteso si dichiara prima di eseguire**, non dopo.
  - [x] Grep di perimetro, coi numeri attesi dichiarati **prima**: `grep -rn "from('questions')\|from('question_blocks')" "src/app/(app)/clienti/"` deve restare a **zero righe** — la schermata di compilazione non legge il questionario da nessuna parte, ed è la forma eseguibile dell'AC2 della 3.4, che questa story non deve rompere. `grep -n "order(" "src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx"` deve restare a **tre righe**, di cui due vere: se diventano una, l'ordine congelato è rotto in un modo che nessun test coglie.
  - [x] Grep dell'AC5, che è l'unico modo automatico di provare un'assenza: nessun `confirm(`, nessun `required`, nessun `punteggio`/`score`, nessun `consigli`/`suggerit` sotto `schede/`. Un'assenza non si prova del tutto, ma un grep documentato vale più di una dichiarazione.
  - [x] Sonda SQL in transazione annullata, con la stessa forma della 3.3 e della 3.4 — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`: scrivere i cinque campi sulla scheda esistente, rileggerli, e **confrontare i `ctid` di `assessments` prima e dopo** per provare che il trigger riscrive la riga davvero. Dentro una transazione `now()` è fermo, quindi `updated_at` **non** discrimina: è la lezione della 3.3 e va applicata, non riscoperta.
  - [x] Sonda del rifiuto: un `verdict` fuori dai quattro deve essere fermato **dall'azione** prima del database. Che il `check` lo fermerebbe comunque non è un argomento: da lì il messaggio arriva in inglese e parla di un vincolo, non di cosa fare.
  - [x] La verifica visiva senza sessione si fa come nella 3.3 e nella 3.4: riproduzione statica servita in locale, con misure da `getComputedStyle` invece che giudizi. Le quattro pillole vanno **misurate**, non guardate: altezza 22, raggio pieno, padding orizzontale 10, e i rapporti di contrasto ricalcolati sui valori effettivi.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione del 10 agosto 2026, tre strati in parallelo. Verificato a mano prima di assegnare la gravità: `npm test` dà **212 verdi**, `npm run typecheck` è muto, `npm run build` compila, il perimetro degli undici file intoccabili è rispettato (dentro `schede/` risulta toccato solo `page.tsx`), nessuna migrazione, nessuna dipendenza. Gli otto rapporti di contrasto dichiarati sono stati ricalcolati con la formula WCAG e **coincidono tutti**. Sei rilievi sono stati scartati come rumore, e il perché sta in fondo.

- [x] [Review][Decision → corretto] *(Luca, 10 agosto 2026: latch — comparsi una volta, restano)* **I due campi condizionali si smontano portandosi via testo mai salvato, e la via non è quella che la story dichiara** — `verdict-card.tsx:47,60` con `verdict.ts:117-125` e `use-editable-field.ts:154-158`. `showsCondition` legge i due contenuti **dal server**, quindi qualsiasi scrittura che li porti entrambi a vuoto smonta tutti e due i campi, compreso quello che ha ancora un timer armato. Sequenza, senza cambiare il verdetto e senza nessun guasto: verdetto `no`, `condition_text` = `X` salvato, `verify_by` vuoto, quindi i due campi si vedono; si sceglie una data in «Verificare entro» (timer armato, tre secondi); entro quei secondi si svuota «Condizione» e si clicca altrove, l'uscita dal campo scrive `''`, il server scrive `null`, `revalidatePath` rimanda il payload, `showsCondition('no', null, null)` risponde falso e **entrambi si smontano**: il `clearTimeout` dell'effetto butta via la data, che non è mai partita, e nessuno lo dice. La story dichiara una finestra sola — «cambiare il verdetto mentre una scrittura sulla condizione è già in volo» — e questa non è quella: non serve cambiare il verdetto, e il campo che perde il testo non ha nessuna scrittura in volo. Trovato da due strati su tre. **La decisione è di Luca perché la correzione contraddice una riga scritta nel Task 4** («i due campi spariscono quando il salvataggio è passato… è voluto»): tenerli montati per il resto della sessione una volta comparsi — una latch nella card, tre righe — conserva la variante B′ alla lettera al caricamento e toglie lo smontaggio a metà lavoro; lasciarli così significa accettare una perdita silenziosa in una schermata il cui unico voto non negoziabile è che il lavoro non si perda.

- [x] [Review][Decision → corretto] *(Luca, 10 agosto 2026: chiusa dalla stessa latch)* **Lo smontaggio toglie dal registro una voce in stato `failed`: la barra torna a dire «Salvato» su un testo mai scritto e non più a schermo** — `verdict-field.tsx:68` con `save-store.ts:131-134` e `:62-77`. Stessa radice della voce sopra, conseguenza diversa e peggiore. Sequenza: verdetto `si_condizionato`, si scrive la condizione, la scrittura fallisce (rete caduta) e la barra dice `Non salvato, riprovo`; si cambia l'esito in `no`, che AC2 e D14 dichiarano debba riuscire sempre; `showsCondition('no', null, null)` risponde falso, i due campi si smontano, il cleanup fa `store.remove('verdetto-condition_text')`, `aggregateSaveState` gira sulle voci restanti e la barra torna a **`Salvato alle 14:32`**. `Riprova` non lo può più recuperare — la voce non esiste più — e il testo non è più da nessuna parte. È testualmente la bugia che `save-store.ts:6-10` dichiara di esistere per impedire. Si chiude con la stessa correzione della voce sopra.

- [x] [Review][Decision → corretto] *(Luca, 10 agosto 2026: `deferUntilExit` nell'hook, perimetro allargato di un file)* **`<input type="date">` con salvataggio automatico: riscrivere una data già salvata la azzera** — `verdict-field.tsx:114-118` con `use-editable-field.ts:152-159` e `verdict-actions.ts:89-95`. È il primo controllo data **controllato e con salvataggio automatico** del progetto: quello di `new-assessment-form.tsx` è `defaultValue` con invio esplicito, quindi il caso non si era mai presentato. Un controllo data restituisce `''` finché i tre segmenti non formano una data valida: partendo da `2026-09-30` e ribattendo l'anno, `onChange` arriva con `''`, `dirty` diventa vero e il timer si arma; se l'ultima battuta lascia il campo incompleto — un'interruzione a metà, cosa ordinaria su tre segmenti — dopo tre secondi `validateVerifyBy('')` risponde `{ok:true, date:null}` e **la data salvata sparisce**. Il codice non distingue «svuotato di proposito» da «in corso di scrittura», e sono la stessa stringa. Si innesta sulla prima voce: se `verify_by` era l'unico contenuto che teneva visibili i due campi, quel `null` li smonta mentre ci si sta dentro. Decisione di Luca perché le strade sono tre e non una: lasciarlo com'è e scriverlo a debito, rimandare la scrittura del solo campo data all'uscita dal campo, oppure ignorare la transizione a `''` finché il campo ha il fuoco.

- [x] [Review][Decision → corretto] *(Luca, 10 agosto 2026: frase ristretta alle pillole, residuo a debito con ripresa alla 5.2)* **La voce di contrasto è dichiarata chiusa, ma due componenti fuori dalle pillole restano sotto soglia** — `design-system.md` §2 con `globals.css:1146-1148` e `:1159-1161`. La voce che si chiude enunciava un problema **generale** — «un colore pieno sulla propria tinta di fondo non arriva a 4,5:1» — e la chiusura copre le sole pillole. Restano esattamente quel caso: `.error-box`, `--bad` su `--bad-tint` = **3,85:1**, e `.warn-box`, `--warn` su `--warn-tint` = **3,86:1** (ricalcolati). Il CSS è preesistente e non è questa story a introdurlo; quello che questa story introduce è la dichiarazione di chiusura che li copre senza averli guardati, cioè una voce che sembra chiusa e non lo è — l'errore già commesso e corretto dentro `deferred-work.md`. Due strade: scurirli coi tre `-ink` che ora esistono, oppure restringere la frase di §2 alle pillole e aprire il residuo in `deferred-work.md` col punto di ripresa nominato (la 5.2, che è la passata di verifica del contrasto).

- [x] [Review][Decision → corretto] *(Luca, 10 agosto 2026: la decisione c'è stata, scritta come Domanda 4)* **Lo scostamento 1 è attribuito a una decisione di Luca che nel file non esiste** — `3-5-scrivere-il-verdetto.md:456` con `:365-403` e `:560`. Il Dev Agent Record scrive che la card client invece che server «è stata **chiusa da Luca il 10 agosto 2026**», ma «Domande per Luca» ne contiene tre e nessuna riguarda server contro client, e la riga `Luca` del Change Log elenca quelle tre e basta. La contraddizione fra Task 4 e Task 5 è reale e il motivo tecnico regge — la pillola e `showsCondition` leggono il valore vivo, che un componente server non può tenere. Quello che manca è la tracciabilità, ed è la regola di `kb-0.md` §8: una decisione senza motivo scritto dove è stata presa verrà rimessa in discussione fra tre mesi. Serve sapere se la decisione c'è stata — e allora va scritta in «Domande per Luca» come quarta — o se è stata presa dall'agente, e allora va detto così.

- [x] [Review][Patch] **La frase che giustifica di non toccare i tre colori pieni è falsa per due su tre** [src/app/globals.css:44-48] e [docs/design-system.md §2]. Scrivono che `--ok`, `--warn` e `--bad` «continuano a servire come testo su bianco, dove il contrasto c'è già». Misurati con la formula WCAG: `--bad` `#CE4632` su bianco **4,62:1**, passa; `--warn` `#A9690A` **4,46:1** e `--ok` `#0E8A5B` **4,37:1**, entrambi sotto il 4,5:1 che §8 pretende. In più `grep "color: var(--ok)"` su `globals.css` non trova niente — `--ok` non è usato come testo da nessuna parte — e `--warn` come testo compare solo in `.warn-box`, cioè sulla propria tinta e non su bianco. La conclusione (non sostituire i pieni) resta giusta; la ragione scritta accanto non lo è, ed è quella che si rileggerà.

- [x] [Review][Patch] **D26 continua a dichiarare aperta la voce che `design-system.md` §2 dichiara chiusa, e col caso peggiore sbagliato** [docs/00-contesto-e-decisioni.md, D26, «Voce che resta aperta»]. Il file non è stato toccato. Dice ancora «va chiuso prima della fine della prima versione» e nomina il `sì` come caso peggiore, mentre §2 — corretta da questa story — dice che il peggiore è **non deciso** a 3,02:1. `kb-0.md` §8 vuole che una voce superata resti visibile e sia marcata come superata: qui non è marcata, e chi legge D26 fra tre mesi trova aperta una cosa chiusa e cerca un token che non esiste.

- [x] [Review][Patch] **Due conteggi di grep del Dev Agent Record non tornano** [docs/bmad/implementazione/3-5-scrivere-il-verdetto.md:422-423]. `grep -rn "required"` sotto `schede/` dà **2 righe** (`verdict-field.tsx:17`, `answer-field.tsx:39`), non tre; `punteggio|score|consigli|suggerit` dà **2 righe** (`verdict-card.tsx:29`, `verdict-actions.ts:133`), non una. `verdict-card.tsx:29` è finito nella riga sbagliata della tabella. La sostanza regge — tutti i riscontri sono prosa che dichiara l'assenza, nessun attributo `required`, nessun `confirm(`, zero esadecimali fuori da `globals.css` — ma il Task 7 chiede numeri dichiarati prima e verificati dopo, e due sono sbagliati.

- [x] [Review][Patch] **«Le cinque rotte dinamiche di prima» sono sei** [docs/bmad/implementazione/3-5-scrivere-il-verdetto.md:413]. `npm run build` ne elenca sei: `/accedi`, `/auth/callback`, `/clienti`, `/clienti/[id]`, `/clienti/[id]/schede/[assessmentId]`, `/questionario`. Il numero non cambia rispetto alla baseline, quindi la conclusione regge; il conteggio no.

- [x] [Review][Patch] **`page.tsx` passa a `VerdictCard` l'intera riga invece di `AssessmentVerdict`** [src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx:148]. `verdict={assessment}` manda nel payload del browser anche `client_id`, `call_date` e l'innesto `clients(name)`. Nessuna esposizione nuova — quei valori sono già resi nell'intestazione della stessa pagina — ma il tipo è stato creato apposta perché «si leggono esattamente le colonne che si rendono», e passandolo così non fa il lavoro per cui esiste.

**Applicate tutte e dieci lo stesso giorno.** Dopo le correzioni: **212 test verdi** (nessuno nuovo — le tre correzioni di codice sono di presentazione e di modalità di salvataggio, che `kb-0.md` §7 non manda sotto test automatico), `npm run typecheck` muto, `npm run build` compilato in 2,0 s con le stesse otto pagine statiche e sei rotte dinamiche. Una decisione ha allargato il perimetro di un file — `use-editable-field.ts`, per il campo data — e il prezzo dichiarato, riverificare le quattro schermate che lo usano, è diventato una casella in «Verifica di sessione». **Quello che questa revisione non ha potuto provare:** la latch e il campo data sono comportamento del browser dentro una sessione vera, e nessuna riproduzione statica li esercita. Compilano e non rompono niente; che facciano quello che devono lo dicono le caselle in fondo, non questa riga.

**Sei rilievi scartati, col motivo, perché non tornino alla revisione successiva.** La pillola che mostra un esito rifiutato dal server: è il contratto che il Task 5 dichiara — la pillola dice cosa hai scelto, l'indicatore dice se è arrivato. La quarantina di righe che `verdict-field.tsx` condivide con `answer-field.tsx`: prescritta dal Task 4 («ricalcando `answer-field.tsx`»). La textarea del motivo che non cresce: identica a `client-field-form.tsx:109`, che è la ricetta `.detail-grid` + `.field--wide` prescritta dal Task 4. `console.error('saveVerdict: richiesta rifiutata', { field })` che logga una stringa scelta dal browser: identico a `updateClientField:126`, pattern del progetto e non deviazione di questa story. `showsCondition(verdict: string, …)` invece di `Verdict`: deliberato, `AssessmentRow['verdict']` è `string` nei tipi generati e vale la stessa ragione di `VerdictPill`. Il punto di ripresa dell'annotazione alla voce 18: «la stessa passata che riallinea `useState(baseline)`» è un evento nominato, non un generico «più avanti».

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| Le cinque colonne del verdetto, col `check` sui quattro valori | `assessments`, migrazione `0005` | 2 agosto 2026 |
| Il trigger che muove `assessments.updated_at` | `assessments_set_updated_at`, migrazione `0006` | 2 agosto 2026 |
| La policy che filtra per proprietario | `0007_rls.sql`, `for all` su `assessments` | 2 agosto 2026 |
| La macchina del salvataggio di un campo | `src/lib/use-editable-field.ts` | 1.2, estesa dalla 3.4 |
| Il registro che fa di N campi una riga sola | `src/lib/save-store.ts`, con i suoi test | 3.3 |
| Il confine, la barra e l'indicatore | `save-boundary.tsx`, `save-bar.tsx`, `components/save-indicator.tsx` | 3.3 |
| La forma di un'azione che scrive un campo | `answer-actions.ts`, `actions.ts` | 1.2, 3.3 |
| La pillola, con la sua classe e i suoi modificatori | `components/status-pill.tsx`, `globals.css` `.pill` | 1.3 |
| La validazione di una data scritta a mano | `src/lib/call-date.ts`, con i suoi test | 3.1 |
| Un elenco di descrittori di campo con la sua guardia | `src/lib/client-fields.ts` | 1.2 |

**Questa story scrive poco codice nuovo e ne collega molto.** È il motivo per cui la trappola principale non è la difficoltà: è costruire una seconda copia di qualcosa che c'è già.

### Le cinque colonne esistono già: nessuna migrazione

```sql
verdict            text not null default 'non_deciso'
                     check (verdict in ('si','si_condizionato','no','non_deciso')),
verdict_reason     text,
condition_text     text,
verify_by          date,
next_step          text,
```

Lette da `supabase/migrations/0005_assessments_answers.sql:27-32` e confermate nei tipi generati (`database.types.ts`, `assessments.Row`). `verdict` è `string` nei tipi generati e non un'unione: il restringimento avviene nel codice, come per lo stato del cliente.

**Nessun vincolo lega `verdict` a `completion_status`**, ed è scritto in testa alla migrazione: una scheda si può chiudere senza verdetto e un verdetto si può scrivere su una scheda chiusa (D14, FR23). La 3.6 non dovrà toglierlo, perché non c'è.

### Come si salva su questa schermata, e perché non è D21 alla lettera

D21 dice che il campo lungo si salva da solo e il campo corto si conferma con `Salva`. **Su questa schermata la seconda metà è già stata superata, dalla 3.2 e dalla 3.3, e questa story segue quella decisione e non D21 alla lettera.** `answer-field.tsx` passa `autosave: true` a **tutti** i tipi, testo breve, numero e scelta singola compresi, e la ragione è scritta: ventiquattro coppie di pulsanti che compaiono e spariscono mentre si parla al telefono sono il contrario di «non pensare mai al salvataggio», e FR19 chiede che il comando esplicito esista, non che ce ne sia uno per campo.

I cinque campi del verdetto stanno sulla stessa schermata e nella stessa call: si salvano da soli tutti e cinque, si iscrivono allo stesso registro, e il comando esplicito resta quello della barra. **Un `Salva` per campo qui sarebbe la terza convenzione della stessa schermata.**

Conseguenza da tenere a mente: `store.saveDirty` e `store.retryFailed` prenderanno anche questi cinque campi. È voluto — sono la stessa scheda — e vuol dire che il conteggio dei campi «sporchi» che accende il `Salva` della barra passa da ventiquattro a ventinove.

### La rivalidazione: qui `/clienti` serve davvero, e in `saveAnswer` no

È il punto in cui questa story si comporta diversamente dalla precedente, e copiare `saveAnswer` senza capirlo produce un difetto invisibile.

`saveAnswer` rivalida **solo** la rotta di compilazione, e la 3.3 lo ha deciso con una sonda: scrivere una risposta riscrive la riga di `answers` e **non** quella di `assessments`, perché su `answers` esiste un trigger solo e non risale. L'elenco clienti ordina per l'ultima attività, che legge `assessments.updated_at`: quindi rivalidare `/clienti` da lì sarebbe stato costo a ogni salvataggio, effetto zero, e — peggio — avrebbe fatto *sembrare* chiuso un difetto che resta aperto (`deferred-work.md:131`, punto di ripresa dichiarato: Story 4.1).

`saveVerdict` scrive su `assessments`, dove il trigger c'è (`0006_triggers.sql:44`). L'ultima attività del cliente si muove davvero, l'elenco cambia ordine, e senza `revalidatePath('/clienti')` si scrive un verdetto, si torna all'elenco e il cliente è dov'era. **La regola dichiarata chiusa dalla 3.1 — «ogni scrittura che tocchi una scheda rivalida anche l'elenco» — qui si applica alla lettera, ed è la prima volta dopo `openAssessment`.**

`/clienti/[id]` resta fuori: la card del cliente non rende oggi nessuna delle cinque colonne (`AssessmentSummary` è un `Pick` su `id`, `call_date`, `interviewee_id`). Entrerà con la 4.1, insieme all'esito e all'avanzamento, e va aggiunta lì e non qui.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/verdict.ts` | **nuovo** — i quattro valori, le etichette, i cinque descrittori, le due guardie, e `showsCondition` | 1, 4 |
| `src/lib/verdict.test.ts` | **nuovo** — col caso che rifiuta `owner_id` e coi cinque casi di `showsCondition` | 1, 4 |
| `src/lib/call-date.ts` | `validateVerifyBy`, che sul vuoto risponde `null` e non oggi | 2 |
| `src/lib/call-date.test.ts` | i casi nuovi della funzione nuova | 2 |
| `src/app/(app)/clienti/verdict-actions.ts` | **nuovo** — `saveVerdict`, con la doppia rivalidazione | 3 |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` | cinque colonne nella `select`, la card dentro `SaveBoundary` | 4 |
| `src/lib/types.ts` | `AssessmentVerdict`, e la correzione del commento di `AssessmentSummary` | 4 |
| `.../schede/[assessmentId]/verdict-card.tsx` | **nuovo** — la card, componente server, senza `<form>` | 4 |
| `.../schede/[assessmentId]/verdict-field.tsx` | **nuovo** — un campo, componente client | 4 |
| `src/components/verdict-pill.tsx` | **nuovo** — riusata dalla 4.1 e dalla 4.2 | 5 |
| `src/app/globals.css` | i modificatori delle pillole di verdetto, e i tre inchiostri scuriti | 5 |
| `docs/design-system.md` | §2 e §9: i tre token nuovi, e la voce di contrasto che si chiude | 5 |
| `docs/bmad/implementazione/deferred-work.md` | almeno l'annotazione alla voce 127 | 6 |

**E basta.** In particolare **non** si aprono: `answer-blocks.tsx`, `answer-field.tsx`, `choice-field.tsx`, `answer-actions.ts`, `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts`, ~~`use-editable-field.ts`~~, `components/save-indicator.tsx`, `assessment-actions.ts`, `supabase/migrations/`. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**: quasi certamente vuol dire che si sta riscrivendo la macchina del salvataggio invece di usarla.

~~`use-editable-field.ts` merita una riga a sé: la 3.4 lo ha toccato pagando il prezzo di riverificare tutte e quattro le schermate che lo usano, e la sua revisione lo ha lasciato a **270 righe**, oltre le 200 di `kb-0.md` §2, senza aprire una voce nuova perché il punto di ripresa esisteva già — è quello della voce `deferred-work.md:136`, «il giorno che si tocca l'hook per intero». Questa story **non** lo apre, e non lo apre nemmeno di striscio: se emergesse un bisogno che sembra richiederlo, è un segnale che il bisogno è stato inquadrato male.~~

**Il perimetro è stato allargato di un file il 10 agosto 2026, dalla revisione e per decisione di Luca, e la regola qui sopra ha funzionato invece di essere aggirata: ci si è fermati e lo si è detto.** `use-editable-field.ts` è stato aperto per aggiungere `deferUntilExit`, una proprietà facoltativa e falsa per difetto che toglie **solo** il timer e la scrittura sul passaggio in secondo piano, lasciando l'uscita dal campo, il ricordo di `owedExit` e il gesto esplicito. Serve al solo `<input type="date">`, che restituisce la stringa vuota finché i tre segmenti non formano una data valida: col timer, ribattere l'anno di una data salvata e fermarsi tre secondi la cancellava. Le scorciatoie che restavano dentro `verdict-field.tsx` erano tutte peggiori — far rifiutare `run` sul vuoto fa dire «Salvato» a vuoto, oppure rompe lo svuotamento voluto; rendere il controllo non controllato toglie il riallineamento dopo la scrittura. Il prezzo è quello che la riga barrata annunciava: **riverificare le quattro schermate che usano l'hook**, e le caselle sono in «Verifica di sessione». Il file passa da 270 a **288 righe**, sempre oltre le 200 di `kb-0.md` §2 e sempre senza voce nuova, perché il punto di ripresa resta quello di `deferred-work.md:136`.

### I quattro colori, e cosa dice il design system

`design-system.md` §5 dichiara la regola della pillola **superata per i cinque stati del cliente** il 3 agosto 2026 — là il colore sta nel punto — e scrive per esteso che «la regola qui sopra resta scritta perché è ancora quella dei verdetti». Quindi per i verdetti vale la forma originale: **fondo nella tinta chiara, testo nel colore pieno, nessun punto**.

La mappa dei quattro colori è quella dei semantici di §2, e non si inventa: `--ok` per il sì, `--warn` per il condizionato, `--bad` per il no, il neutro per il non deciso. È anche il motivo per cui, per UX-DR2, **nessuna sezione del software usa verde, ambra o rosso**: quei tre significano un esito, e questa è la schermata dove lo significano davvero.

La voce di contrasto aperta da D26 **si chiude in questa story**, ed è il Task 5, coi numeri misurati. Vale la pena dire perché qui e non alla 5.2: la 5.2 è una passata di **verifica** — la sua AC dice «ne misuro il contrasto, è almeno 4,5:1» — e una passata di verifica non è il posto dove si inventano tre valori nuovi. `design-system.md` §2 lo scrive già: «si chiude scurendo i quattro colori pieni solo dentro le pillole, non i token». Questa è la story che le pillole le crea.

Una precisazione che il design system non poteva avere, perché nasce dalla misura fatta qui: §2 nomina il `sì` come «il caso peggiore», e non lo è. A colore pieno il peggiore è **non deciso**, a 3,02:1, e si chiude senza aggiungere niente perché il caso base della pillola — testo `--ink-muted` — sta a 6,37:1. Chi aggiorna la §2 lo scriva, altrimenti il prossimo che rileggerà la voce chiusa cercherà un quarto token che non esiste.

### Trappole note

**1. Riscrivere la macchina del salvataggio.** La più probabile. La card del verdetto sembra abbastanza diversa dai blocchi da giustificare un percorso suo, e non lo è: è la stessa schermata, lo stesso registro, la stessa barra. `useEditableField` più l'iscrizione, e nient'altro.

**2. `run` fuori da `useCallback`.** `answer-field.tsx:66` lo dichiara «la trappola più grossa di questa schermata» e vale identica qui: l'hook mette `run` fra le dipendenze di `write` e `write` fra quelle dell'effetto che arma il timer, quindi un `run` ricreato a ogni resa riarma il timer a ogni battuta e il salvataggio automatico può **non partire mai, senza nessun errore**.

**3. La chiave nel registro.** `store.set(id, …)` e `store.remove(id)` indicizzano per stringa, e le altre ventiquattro voci usano l'`id` della risposta. Un prefisso che non possa essere un uuid, e l'effetto di pulizia allo smontaggio: senza, un campo condizionale che sparisce lascia una voce sporca e il `Salva` della barra resta acceso per sempre su un campo che non esiste più.

**4. Un `<form>` dentro la card.** `answer-blocks.tsx` non ne ha uno di proposito, e la ragione — l'invio implicito con Invio che ricarica e porta via il testo — qui morde di più, perché i controlli sono corti. Se serve un `onSubmit`, serve perché si è aggiunto un `<form>` che non serviva.

**5. Azzerare condizione e data quando il verdetto cambia.** Sembra pulizia ed è cancellazione di lavoro altrui. Nella 2.4 azzerare le opzioni uscendo dalla scelta singola era **imposto dal vincolo `questions_options_only_single_choice`**; qui nessun vincolo esiste, quindi non c'è niente che lo giustifichi. Il server scrive la colonna che gli si chiede di scrivere e nessun'altra.

**6. `useState(baseline)` non risincronizza, e non deve.** `use-editable-field.ts:61`. Quando la `revalidatePath` riporta un valore ripulito, `baseline` cambia e `value` no: è voluto, perché riscrivere una textarea sotto le dita toglie l'a capo appena battuto. La conseguenza osservabile — `Salva` acceso a vuoto — ha già la sua voce (`deferred-work.md:19`), e chi la «aggiusta» qui rompe la digitazione su quattro schermate.

**7. Mai `details` nei log.** Il motivo del verdetto è un giudizio su un cliente reale, cioè la stessa categoria di dato del contenuto di una risposta (`kb-0.md` §3 e §4). Solo `code` e `message`, come in `saveAnswer`.

**8. `<input type="date">` e il valore controllato.** Il campo accetta `''` o `AAAA-MM-GG` e nient'altro: `verify_by` è `string | null` e va passato come `?? ''`, altrimenti React passa da controllato a non controllato e avvisa in console. È lo stesso `?? ''` che `answer-field.tsx` fa su `content`.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione.** Le cinque colonne, il `check`, il trigger e la policy esistono dal 2 agosto.
- **Lo stato di compilazione** (3.6): `completion_status` non si legge e non si scrive qui, e nessun campo del verdetto lo tocca.
- **L'esito nella card del cliente e nell'elenco** (4.1 e 4.2), **l'avanzamento** (4.1), **l'esportazione** (4.3).
- **Il trigger su `answers` che muove `assessments.updated_at`** — `deferred-work.md:131`, punto di ripresa dichiarato: Story 4.1. Questa story lo lascia esattamente dov'è, e il fatto che `saveVerdict` muova `updated_at` **non** lo chiude: quella voce parla delle risposte.
- **`use-editable-field.ts`, `save-store.ts` e la barra.** Nessuno dei tre si apre.
- **Il `beforeunload`**, che resta rifiutato con i due motivi del 9 agosto 2026.
- **`block_id` dentro `answers`** — `deferred-work.md:127`, che questa story **annota** e non chiude.
- **La correzione dei 40px di `.btn`** — `deferred-work.md` voce 1, che appartiene alla 5.2.

### Test

Due moduli puri crescono e vanno sotto test, ed è la stessa regola applicata a `answer-control.ts`, `save-store.ts` e `owed-exit.ts`: la logica che, rompendosi, produce un dato sbagliato **senza dare nessun errore**.

- `verdict.ts`: `isVerdict` e `isVerdictFieldKey` sono guardie di sicurezza, non comodità. Un `isVerdictFieldKey` scritto largo non fa cadere niente e apre una scrittura arbitraria su una colonna della propria riga; un `isVerdict` scritto largo lascia arrivare al `check` di Postgres un messaggio in inglese al posto sbagliato. Le etichette pure: una mappa incompleta mostra `si_condizionato` a schermo, che è la cosa più visibile e la meno grave.
- `call-date.ts`: la differenza fra «vuoto → oggi» e «vuoto → `null`» è un giorno inventato dentro una colonna che dovrebbe essere vuota, e non lo segnala nessuno.

`verdict-field.tsx` e `verdict-card.tsx` sono codice del browser e di presentazione: **non** si costruisce un'impalcatura di test del DOM per loro, che sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2 e §7). Si verificano a mano, e la verifica si dichiara.

- `showsCondition` è la terza, ed è nata già così dalla risposta alla Domanda 1: decide se due campi si vedono. Sbagliata in una direzione mostra due campi vuoti a chi non li ha chiesti — rumore; sbagliata nell'altra **nasconde un testo scritto da una persona**, che ricomparirebbe solo nell'esportazione della 4.3, mesi dopo. Non dà nessun errore in nessuna delle due direzioni.

Se durante l'implementazione emergesse una quarta decisione pura, vale la stessa regola: un modulo suo con i suoi test. È quella già applicata quattro volte, e la 3.4 ne è il precedente più recente con `owed-exit.ts`.

### Contratto visivo

Una card in più in fondo alla schermata, con la forma che le card hanno già: `.card`, `.card__header`, `.card__title`, e dentro `.detail-grid` coi suoi `.field`. Le uniche regole nuove in `globals.css` sono i modificatori delle pillole di verdetto, e sono quattro righe dichiarate nel Task 5 — meno tre, se `non_deciso` resta sul caso base.

**Nessuna classe nuova che non serva a una misura.** Se emergesse un bisogno di layout — misurato a schermo, non giudicato — si dichiara nel Dev Agent Record prima di scrivere la regola, che è la forma che `deferred-work.md:122` chiede.

Lo **stato in caricamento** (`loading.tsx`) merita una decisione esplicita e non un'omissione: oggi riserva lo spazio del titolo e di una card, «quello che c'è sempre, non quello che dipende dai dati». La card del verdetto **c'è sempre** — a differenza dei blocchi, che dipendono dalla scheda — quindi riservarne lo spazio è coerente con la regola scritta lì. Non è però obbligatorio: la card è in fondo, sotto la piega, e riservarla non toglie nessun salto visibile. Chi implementa sceglie e **scrive la scelta col motivo**; quello che non va fatto è cambiarla senza accorgersene.

### Sicurezza

Una scrittura nuova su una tabella che ne aveva una sola, e va guardata riga per riga perché tocca dati di clienti reali (`kb-0.md` §9, «il codice che gestisce soldi, permessi o dati dei clienti si legge riga per riga»).

- **La riga si protegge da sé.** La policy `assessments_owner_all` (`0007_rls.sql:55`) è `for all to authenticated` con `using` e `with check` su `owner_id`, quindi un `update` sulla scheda di un altro proprietario tocca zero righe e arriva come `!data`, cioè indistinguibile da una scheda cancellata. È la stessa forma di `saveAnswer`, e la risposta giusta è la stessa.
- **La colonna no.** La policy protegge le righe di un altro, non la colonna sbagliata sulla propria: `isVerdictFieldKey` è quello che impedisce a una richiesta forgiata di scrivere `owner_id` o `total_questions`. Senza quella guardia l'azione è una scrittura arbitraria, ed è il motivo per cui `isClientFieldKey` esiste.
- **Il valore.** `isVerdict` rifiuta prima del database; il `check` resta l'ultima difesa e non la prima.
- **Il percorso da rivalidare** si ricava dalla riga scritta e mai dal `formData`.
- **I log** portano solo `code` e `message`: il motivo di un verdetto è un giudizio su un'azienda reale.
- **Nessun `redirect`**, nemmeno a sessione finita, per la regola scritta in `supabase/session.ts`.

### Project Structure Notes

Nessuna cartella nuova, nessuna dipendenza nuova. Cinque file nuovi, tutti in posti che hanno già un precedente esatto: due moduli puri e una pillola condivisa in `src/lib/` e `src/components/`, l'azione accanto alle altre azioni dei clienti, i due componenti della card dentro la cartella della rotta.

`src/lib/verdict.ts` tiene insieme il vocabolario dei quattro valori **e** i cinque descrittori di campo, mentre per il cliente le due cose stanno in due file (`client-status.ts` e `client-fields.ts`). La differenza è vera e non pigrizia: per il cliente lo stato è **uno dei dodici campi** e i due elenchi non si parlano; qui i quattro valori sono il dominio di uno dei cinque campi, e tutti e cinque sono lo stesso concetto. Se il file superasse le 200 righe di `kb-0.md` §2, allora sì che conterrebbe due cose.

### Piattaforma in uso, verificata

Letti da `package.json` e `node_modules` il 9 agosto 2026 e invariati alla baseline: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

`<input type="date">` è supportato ovunque da anni e non richiede nessuna dipendenza; il valore che accetta e restituisce è sempre `AAAA-MM-GG` indipendentemente da come il browser lo mostra, che è la ragione per cui la validazione sul server confronta quella forma.

### Stato del database, e cosa è cambiato dalla 3.4

Misurato il 10 agosto 2026 sul progetto `izkycpwxuedpkzgpvcxc`.

| | Dichiarato dalla 3.4 alla sua chiusura | Oggi |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| schede / risposte | **0 / 0** | **1 / 24** |
| questionari / blocchi | 1 / 9 | 1 / 9 |
| domande, di cui attive | 24 / **24** | 24 / **23** |

La scheda è nata alle 05:40:49 UTC del 10 agosto — le 07:40 di Roma, un minuto dopo il commit di chiusura della 3.4 — e da allora non è stata toccata: `updated_at` è identico a `created_at`. Ha `total_questions` 24, 24 righe di `answers` con 24 posizioni distinte, **zero risposte con contenuto**, nessun interlocutore, `verdict` `non_deciso`, gli altri quattro campi a `null`, `completion_status` `bozza`.

**Due conseguenze, e sono di segno opposto.**

La prima è un guadagno per questa story: esiste finalmente una scheda vera su cui aprire la schermata di compilazione e provare il verdetto, invece di doverne creare una. Che una domanda sia stata disattivata **dopo** la sua apertura la rende anche un caso di prova gratuito per l'AC2 della 3.4 — 24 righe congelate contro 23 domande attive di oggi.

La seconda va scritta senza arrotondarla: `deferred-work.md:127` rimanda il `block_id` dentro `answers` dicendo che la finestra è «gratuita» finché `answers` è vuota, e **`answers` non è più vuota**. Una colonna `not null` senza default su quella tabella oggi richiede un riempimento, che è esattamente il costo che quella voce dichiarava di non voler pagare. Non è però automatico dire che la finestra sia chiusa: il criterio che la voce si dà è «la prima scheda che Luca compila e tiene», e questa non è compilata — zero risposte con contenuto, mai toccata. Il Task 6 chiede di annotare **i numeri**, non l'aggettivo, e di lasciare il giudizio a chi riprenderà la voce.

### Intelligence dai commit e dalla story precedente

Gli ultimi commit sono `8e2977e` (chiusura 3.4), `e665bca` (implementazione e revisione 3.4), `4adbe57` (chiusura 3.3), `1de267e` (implementazione e revisione 3.3). **La forma è costante da quattro story e va rispettata: un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca.** Lo stato `done` non lo mette la revisione.

Dalla 3.4, tre cose di metodo che questa story riusa invece di riscoprire:

- Le sonde SQL girano in **transazione annullata**, e dentro una transazione `now()` è fermo: `updated_at` non discrimina, si confrontano i `ctid`, che cambiano se e solo se la riga viene riscritta.
- Le forme degli innesti PostgREST si **vedono rispondere**, non si deducono.
- La verifica visiva senza sessione si fa su una riproduzione statica servita in locale, con misure da `getComputedStyle` invece che giudizi.

Dalla revisione della 3.4, due rilievi che questa story può ripetere e non deve: una voce nuova di `deferred-work.md` **senza il localizzatore di riga** che il formato prescrive, e un punto di ripresa che non è «una story numerata o un evento contabile». Entrambi sono nel Task 6.

Dalla 3.4, un avvertimento che vale più di tutti: **tre caselle della sua verifica di sessione chiedevano di annotare un esito e l'annotazione non è stata scritta**, quindi restano passate e non misurate. Le caselle di questa story che chiedono una misura la chiedono davvero.

### Riferimenti

- FR22, e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-3-una-call-intera-dentro-lo-strumento]
- NFR7 e NFR8, UX-DR2, UX-DR5, UX-DR8 — [Source: docs/bmad/pianificazione/epics.md#nonfunctional-requirements]
- Il verdetto è un giudizio e non un calcolo — [Source: docs/00-contesto-e-decisioni.md#d7]
- Il software non blocca niente — [Source: docs/00-contesto-e-decisioni.md#d14]
- Quando un campo si salva da solo e quando si conferma — [Source: docs/00-contesto-e-decisioni.md#d21]
- La revisione «viva» della tavolozza, e la voce di contrasto aperta — [Source: docs/00-contesto-e-decisioni.md#d26] e [Source: docs/design-system.md#2-colore]
- La pillola di verdetto, e la regola superata solo per gli stati — [Source: docs/design-system.md#5-componenti]
- I campi della scheda di prequalifica — [Source: docs/prd-v1.md#3-entità-e-campi]
- Le cinque colonne, il `check` e l'assenza di vincoli fra verdetto e stato — [Source: docs/database.md#3-tabelle]
- L'ultima attività, e da dove si legge — [Source: docs/database.md#5-ultima-attività-del-cliente]
- La rivalidazione di `/clienti` a ogni scrittura su una scheda — [Source: docs/bmad/implementazione/deferred-work.md:51]
- Il trigger che manca su `answers`, e il suo punto di ripresa — [Source: docs/bmad/implementazione/deferred-work.md:131]
- `block_id` non copiato, e la finestra «gratuita» — [Source: docs/bmad/implementazione/deferred-work.md:127]

### Domande per Luca — chiuse il 10 agosto 2026

Quattro, chiuse tutte lo stesso giorno. **Le prime tre prima di `dev-story`** — le prime due cambiavano cosa si costruisce, la terza dove — **la quarta durante l'implementazione**, perché è emersa solo scrivendo il codice. Restano scritte per intero perché il motivo della risposta è la parte che serve fra sei mesi, e perché due di esse riaprivano decisioni già prese da altre story.

**Domanda 1 — Condizione e «verificare entro»: sempre visibili, o solo col verdetto condizionato?**

Il fatto: FR22 elenca cinque campi, e l'AC1 li descrive come «motivo, prossimo passo, e **in caso di condizionato** la condizione e la data entro cui verificarla». La lettera suggerisce che i due compaiano solo con `si_condizionato`; non lo impone.

**A — sempre visibili, tutti e cinque.** Nessun campo appare o sparisce, niente si può perdere, niente si può nascondere. Prezzo: due campi quasi sempre vuoti su una schermata usata durante una call, e una lettura dell'AC1 più larga della sua lettera.

**B — visibili solo col verdetto condizionato.** È la lettera dell'AC1 e la schermata più pulita. Due prezzi, entrambi reali. Il primo è **stretto e va detto senza gonfiarlo**: cambiando il verdetto, i due campi si smontano, e se in quel momento una loro scrittura era già in volo il testo battuto durante il viaggio si perde — è la finestra residua che la 3.4 dichiara aperta e che qui si riaprirebbe in un punto nuovo. Non è la finestra dei tre secondi: cliccando sul selettore del verdetto il campo di testo perde il fuoco, e l'uscita dal campo salva. Il secondo prezzo è più insidioso: un testo scritto e poi nascosto **resta nel database** e comparirebbe nell'esportazione della 4.3 sotto un verdetto «no», dove non significa più niente.

**B′ — visibili col verdetto condizionato, oppure quando uno dei due ha già un contenuto salvato.** Una condizione in più, che toglie il secondo prezzo per intero: niente che sia stato scritto diventa mai invisibile. Il primo prezzo resta identico a B.

**La risposta, il 10 agosto 2026: B′.** Tiene la lettera dell'AC1, tiene la schermata pulita nel caso normale, e non nasconde mai niente di scritto. Con B ci sarebbe stato un caso in cui del testo sparisce dalla vista pur restando nell'esportazione futura, ed è il prezzo che ha deciso.

Quello che la risposta **non** chiude, e va tenuto scritto: la finestra stretta in cui si cambia verdetto mentre una scrittura sulla condizione è già in volo. Nessuna delle tre varianti la chiudeva, perché non è un problema di cosa si rende — è la finestra residua che la 3.4 dichiara aperta. Il Task 4 lo dice, e il Dev Agent Record lo ripete.

**Domanda 2 — Il contrasto delle pillole di verdetto si chiude qui, o alla 5.2?**

Il fatto, misurato: `sì` sta a **3,77:1**, `condizionato` a **3,86:1**, `no` a **3,85:1**, contro i **4,5:1** che UX-DR14 e NFR13 chiedono. Il quarto — `non deciso` — a colore pieno starebbe a **3,02:1**, il peggiore dei quattro, e si chiude gratis lasciandogli il caso base della pillola, che sta a **6,37:1**. `design-system.md` §2 dichiara la voce aperta dal 9 agosto, dice che «va chiuso prima della fine della prima versione» e che «si chiude nelle pillole e non nei token».

**A — si chiude qui.** Tre token nuovi in `globals.css` — candidati misurati: `#0D7C52`, `#985F09`, `#BB402E`, circa il 10% più scuri a tinta invariata — usati **solo dentro le pillole**, più l'aggiornamento di `design-system.md` §2 e §9. Prezzo: si apre un documento di pianificazione, cosa che finora ha fatto solo una decisione registrata (D26).

**B — si rimanda alla 5.2.** Prezzo: le pillole nascono sapendo di non rispettare NFR13, e la voce va in `deferred-work.md` con il punto di ripresa nominato.

**La risposta, il 10 agosto 2026: A, si chiude qui.** Questa è la story che le pillole le crea, il design system nomina già le pillole come il posto dove si chiude, e la 5.2 è una passata di **verifica** — la sua AC dice «ne misuro il contrasto» — non il posto dove si inventano tre valori nuovi. Chiudere qui costa quattro righe di CSS e due tabelle aggiornate; rimandare costava una voce di debito e una schermata che nasce fuori norma.

La conseguenza da non dimenticare in implementazione: i tre valori scuriti vivono **solo** dentro le pillole. `--ok`, `--warn` e `--bad` restano quelli di D26 e continuano a servire come testo su bianco, dove il contrasto c'è già. Sostituirli sarebbe superare D26 di nascosto, con una decisione presa dentro una story invece che registrata.

**Domanda 3 — Il verdetto si può scrivere anche quando le risposte non si caricano?**

Il fatto: la barra di salvataggio e il suo confine oggi si rendono **solo** nello stato pieno, per una decisione della 3.3 scritta in `page.tsx` — «un indicatore fermo su una schermata senza campi è la stessa bugia di un indicatore fermo su una schermata che non salva». I campi del verdetto devono stare dentro quel confine per iscriversi al registro, quindi ereditano quella condizione.

**A — la card del verdetto sta dentro il confine com'è.** Se le risposte non si caricano, la schermata mostra il suo stato d'errore col `Riprova` e il verdetto non c'è. Modifica minima, decisione della 3.3 intatta.

**B — il confine avvolge tutti e tre i rami**, e la card del verdetto si rende sempre. La motivazione della 3.3 cambia di senso — con la card presente ci sarebbero campi da salvare anche nello stato d'errore, quindi la barra non sarebbe più una bugia — ma è una decisione scritta che si riapre.

**La risposta, il 10 agosto 2026: A.** Lo stato d'errore delle risposte è transitorio e il suo rimedio è ricaricare; il ramo «nessuna domanda» non è raggiungibile, perché `open_assessment` solleva se scriverebbe zero righe. Il guadagno di B era scrivere un verdetto durante un guasto del database, che è la cosa che meno serve in quel momento. **La decisione della 3.3 sul confine resta quindi intatta, e `save-boundary.tsx` non si apre.**

**Domanda 4 — La card del verdetto è un componente server, come dice il Task 4, o client?**

Aperta durante l'implementazione e non prima, perché è una contraddizione **interna** alla story che si vede solo scrivendo il codice. Il Task 4 chiede un componente server. Il Task 5 chiede però che la pillola dell'intestazione segua il valore **vivo** del selettore, e il Task 4 stesso chiede che `showsCondition` prenda il verdetto vivo, perché i due campi condizionali devono comparire alla scelta e non tre secondi dopo. Uno stato vivo condiviso fra la pillola e i campi non può stare in un componente server: le due richieste non stanno insieme.

**A — card client, File List invariata.** Prezzo: la card entra nel bundle del browser. È un titolo e cinque etichette.

**B — card server più un terzo file client.** Quel file finirebbe per rendere anche l'intestazione, perché è lì che sta la pillola, e lascerebbe la card server come guscio vuoto: un file in più e nessuna riga in meno nel browser.

**La risposta, il 10 agosto 2026: A.** La contraddizione è della story e non del codice, e fra le due il costo di A è più piccolo e più leggibile. La riga è scritta qui, e non solo nel Dev Agent Record, perché una decisione senza motivo scritto dove è stata presa verrà rimessa in discussione fra tre mesi (`kb-0.md` §8) — e perché la prima stesura del Record la dichiarava «chiusa da Luca» senza che in questa sezione ce ne fosse traccia, rilievo della revisione dello stesso giorno.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), workflow `bmad-dev-story`, 10 agosto 2026.

### Debug Log References

**Numeri dichiarati prima di eseguire, e verificati dopo.** Test attesi 212 = 196 della baseline + 11 di `verdict.test.ts` + 5 aggiunti a `call-date.test.ts`. **Eseguiti: 212 verdi, 0 falliti.** `npm run typecheck` senza uscita, `npm run build` compilato in 2,0 s con le otto pagine statiche e le **sei** rotte dinamiche di prima — `/accedi`, `/auth/callback`, `/clienti`, `/clienti/[id]`, `/clienti/[id]/schede/[assessmentId]`, `/questionario`; la prima stesura ne scriveva cinque, contate male, e il numero non cambia rispetto alla baseline. Nessuna migrazione: il registro resta a quindici.

**Grep di perimetro, coi numeri attesi dichiarati prima.**

| Controllo | Atteso | Trovato |
|---|---|---|
| `from('questions')\|from('question_blocks')` sotto `clienti/` | 0 righe | **0** — l'AC2 della 3.4 non è stato rotto |
| `order(` in `page.tsx` | 3 righe, di cui 2 vere | **3** (`:84` commento, `:96` `position`, `:97` `id`) |
| `confirm(` sotto `schede/` | 0 | **0** |
| `required` sotto `schede/` | 0 attributi | **2 righe, tutte commenti** che ne dichiarano l'assenza (`verdict-field.tsx:17`, `answer-field.tsx:39`) |
| `punteggio\|score\|consigli\|suggerit` sotto `schede/` e sui tre file nuovi | 0 | **2 righe**, entrambe prosa: `verdict-card.tsx:29` («nessun punteggio, nessun conteggio») e `verdict-actions.ts:133`, dove `suggerit` è «un percorso **suggerito** dal browser» |
| esadecimali fuori da `globals.css` | 0 | **0** |
| `<form>` dentro la card del verdetto | 0 | **0** (l'unico riscontro è il commento che ne spiega l'assenza) |

Un'assenza non si prova del tutto; questi grep sono la parte che si può automatizzare, e i tre riscontri sono tutti prosa che dichiara l'assenza, non codice.

**Sonda 1 — il trigger riscrive davvero la riga.** In transazione annullata, `set local role authenticated` col `sub` del proprietario, scrivendo tutte e cinque le colonne sulla scheda esistente e confrontando i `ctid` prima e dopo, perché dentro una transazione `now()` è fermo (lezione della 3.3, applicata e non riscoperta). Esito: `ctid` **(0,21) → (0,22)**, riga riscritta, e i cinque valori riletti sono quelli mandati. È la prova che `assessments_set_updated_at` scatta e che `revalidatePath('/clienti')` qui non è decorativa. In questa sonda `updated_at` si è mosso comunque, perché il valore di partenza veniva da un'altra transazione: resta il `ctid` la misura da guardare.

**Sonda 2 — il rifiuto del valore.** `update … set verdict = 'forse'` sulla stessa riga fallisce con `ERROR: 23514: new row for relation "assessments" violates check constraint "assessments_verdict_check"`. È esattamente il motivo per cui `isVerdict` sta **prima**: da lì il messaggio arriva in inglese e nomina un vincolo, e l'azione lo tradurrebbe in «Riprova fra un momento», che è una diagnosi falsa su una cosa che non riuscirà mai.

**Sonda 3 — la policy.** Lo stesso `update` con un `sub` diverso tocca **0 righe**, quindi arriva all'azione come `!data`, indistinguibile da una scheda cancellata: è la forma di `saveAnswer`, e la risposta è la stessa (`VERDICT_GONE`, «Ricarica la pagina»).

**Verifica visiva senza sessione**, riproduzione statica servita in locale con `globals.css` vero e misure da `getComputedStyle`, non giudizi. Le quattro pillole, **misurate**: altezza 22, raggio 999px, padding 10/10, 12px peso 500, **zero punti**. Contrasti sui colori effettivi a schermo:

| Pillola | Testo su tinta | Misurato |
|---|---|---|
| sì | `#0D7C52` su `#DFF3E9` | **4,51:1** |
| sì condizionato | `#985F09` su `#FBEDD4` | **4,57:1** |
| no | `#BB402E` su `#FBE6E1` | **4,51:1** |
| non deciso (caso base) | `#58524B` su `#EDE9E2` | **6,37:1** |

Tutti e quattro sopra i 4,5:1 di UX-DR14 e NFR13: la voce di `design-system.md` §2 si chiude su numeri misurati e non stimati. Gli otto rapporti che la story dichiarava — compreso il neutro pieno a 3,02:1, il caso peggiore che §2 non nominava — sono stati ricalcolati con la formula WCAG e coincidono tutti.

Layout misurato: a 1280px il motivo prende la riga intera (1232px con `field--wide`), gli altri quattro stanno in colonne da 227px; a **375px** tutti e cinque scendono in colonna, larghi 327, con i bersagli a **46 / 98 / 44 / 46 / 44 px**, tutti ≥ 44. Nessuno dei due scorre di lato. Nessun `<form>` nella card.

**Stato del database, riconteggio del 10 agosto 2026** (progetto `izkycpwxuedpkzgpvcxc`): 3 clienti, 1 persona, **1 scheda, 24 risposte di cui 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive — identico a quanto la story dichiara. Le tre sonde sono girate in transazioni annullate e non hanno lasciato niente.

### Completion Notes List

**Cosa è stato costruito.** Cinque file nuovi e cinque toccati, nessuna migrazione, nessuna dipendenza, nessuna cartella. Il verdetto è una card in fondo alla schermata di compilazione, **dentro il confine di salvataggio esistente**: i suoi cinque campi si iscrivono allo stesso registro delle ventiquattro risposte, quindi restano un indicatore solo, un `Salva` solo e una `Riprova` sola, e il conteggio dei campi che il comando esplicito può salvare passa da 24 a **29**. La macchina del salvataggio non è stata riscritta né aperta: `useEditableField`, `save-store.ts`, `save-bar.tsx`, `save-boundary.tsx`, `answer-field.tsx` e `answer-actions.ts` sono invariati, e la trappola del `run` fuori da `useCallback` è stata evitata alla lettera.

**Cinque scostamenti, tutti dichiarati col motivo.**

1. **`verdict-card.tsx` è un componente client e il Task 4 lo dava server.** È l'unica contraddizione interna della story, ed è stata **chiusa da Luca il 10 agosto 2026** invece che da solo — la decisione per esteso è la **Domanda 4** qui sopra, scritta lì dopo un rilievo della revisione dello stesso giorno: il Record la dichiarava chiusa da Luca mentre «Domande per Luca» ne conteneva tre e nessuna era questa. Il Task 4 chiede un componente server, ma il Task 5 vuole la pillola dell'intestazione che segue il valore **vivo** del selettore, e `showsCondition` prende il verdetto vivo perché i due campi condizionali devono comparire alla scelta e non tre secondi dopo — cose che uno stato condiviso in un componente server non può fare. Le due strade erano: card client con la File List invariata, oppure card server più un terzo file client che però avrebbe finito per rendere anche l'intestazione, lasciando la card server come guscio vuoto. Luca ha scelto la prima. Il costo è la card nel bundle del browser: un titolo e cinque etichette.
2. **`verdict.ts` esporta `isConditionalField`, che il Task 1 non elencava.** Il Task 4 chiede che la condizione di visibilità non sia scritta in linea nel JSX; *quali* due campi si nascondono è la stessa decisione di *quando* si nascondono, e in due posti divergerebbe. Quattro righe accanto a `showsCondition`, con il suo test.
3. **`design-system.md` §5 è stata toccata oltre a §2 e §9.** Il Task 5 nominava solo le due. Ma §5 dice «fondo nella tinta chiara, **testo nel colore pieno**» e dichiara esplicitamente che «la regola qui sopra resta scritta perché è ancora quella dei verdetti»: con i tre inchiostri scuriti sarebbe diventata falsa dentro lo stesso documento che la §2 corregge, cioè la deriva che il Task 5 esiste per impedire. Aggiunto un capoverso che precisa da quale token viene il testo e lascia la forma invariata.
4. **`deferred-work.md`: 0 voci nuove e 3 annotazioni, contro 1 prevista.** La 127 (`block_id`) era prevista. La 131 (il trigger che manca su `answers`) era prevista **in forma condizionale** e l'ho scritta, perché da oggi esiste nel repository una scrittura sulla compilazione che rivalida `/clienti` — `saveVerdict` — e chi la trovasse accanto a `saveAnswer` potrebbe leggerla come la chiusura di quella voce: l'annotazione dice che non lo è e perché. La terza, sulla voce 18, è **in più** e questo è il motivo: quello che resta del buco (a) — lo smontaggio dentro la finestra — fino a ieri richiedeva di navigare via, e da oggi si raggiunge **restando sulla stessa schermata**, perché i due campi condizionali si smontano cambiando verdetto. Non è un difetto nuovo, è la stessa radice con una raggiungibilità di un'altra categoria, e lasciarla non annotata avrebbe fatto credere quella voce più stretta di quanto sia.
5. **`loading.tsx` non è stato toccato, ed è una scelta e non un'omissione.** Il Contratto visivo chiedeva di deciderla e scriverla. La card del verdetto «c'è sempre», quindi riservarne lo spazio sarebbe coerente con la regola scritta lì — ma i blocchi **non** sono riservati, quindi uno scheletro del verdetto comparirebbe subito sotto l'unico scheletro di card, cioè in un punto dove la card vera non sarà mai: toglierebbe zero salto e ne aggiungerebbe uno. Resta com'è.

~~**La finestra che questa story lascia aperta, nominata perché non la si creda chiusa.** Cambiando il verdetto **mentre una scrittura sulla condizione è già in volo**, i due campi condizionali si smontano, il `.then` della scrittura esce su `!alive`, e il ricordo di `owedExit` non lo spende più nessuno: il testo battuto durante il viaggio si perde, in silenzio. È la finestra residua che la 3.4 dichiara aperta (`deferred-work.md`, quello che resta di (a)), non una nuova, e non si chiude senza aprire `use-editable-field.ts`, che questa story dichiara fuori perimetro.~~

**Superato dalla revisione del 10 agosto 2026, e va letto sapendo che il paragrafo qui sopra descriveva la finestra più stretta del vero.** Non serviva cambiare il verdetto e non serviva una scrittura in volo *su quel campo*: bastava svuotare la condizione mentre il campo data aveva ancora il suo timer armato, perché `showsCondition` leggeva i due contenuti dal server e smontava **entrambi** i campi appena entrambi risultavano vuoti — portandosi via il `clearTimeout` del campo accanto. E lo smontaggio toglieva dal registro anche una voce in stato `failed`, cioè faceva tornare la barra a «Salvato alle 14:32» su un testo mai scritto e non più a schermo: la bugia che `save-store.ts` dichiara in testa di esistere per impedire. Per decisione di Luca del 10 agosto 2026 i due campi ora **restano montati per tutta la sessione una volta comparsi** (`verdict-card.tsx:49-58`), quindi `showsCondition` decide se compaiono e non se restano; quello che resta di (a) torna a essere la sola navigazione via dalla pagina, com'era prima di questa story, e `use-editable-field.ts` non è stato aperto. Quello che **non** si perdeva nemmeno prima, e resta vero: una scrittura partita e riuscita arriva comunque, quindi la condizione salvata resta nel database — è la metà della decisione B′.

**Tre cose da sapere leggendo il codice, che non si deducono guardandolo di sfuggita.**

- **La differenza da `saveAnswer` è una riga e cambia il comportamento dell'elenco.** `saveVerdict` rivalida **anche** `/clienti`, perché scrive su `assessments` dove il trigger c'è: provato con la sonda 1. `/clienti/[id]` resta fuori, perché la card del cliente non rende oggi nessuna delle cinque colonne — entrerà con la 4.1.
- **Il server non azzera mai `condition_text` e `verify_by` quando il verdetto cambia**, e non è una dimenticanza: `patch` porta una chiave sola per costruzione. Azzerarle sarebbe cancellare quello che una persona ha scritto, e nessun vincolo lo chiede — a differenza delle opzioni della scelta singola nella 2.4, dove il `check` lo pretendeva.
- **La chiave nel registro è `verdetto-<colonna>` e non può somigliare a un uuid**, che è quello che usano le altre ventiquattro voci: con una collisione un campo del verdetto e una risposta si sovrascriverebbero a vicenda e la barra racconterebbe la scheda sbagliata, in silenzio.

**AC2, AC3 e AC5 sono soddisfatti da codice che non è stato scritto**, e la verifica automatica è quella dei grep qui sopra: nessun `required`, nessun asterisco, nessun `confirm()`, nessun avviso quando il verdetto passa da `sì` a `no`, nessun punteggio, nessun conteggio, nessun colore sul selettore. L'ordine delle quattro opzioni è quello del vincolo `check` e non un ordine di merito, ed è fissato da un test apposta, perché è la cosa più facile da «correggere» in buona fede.

### Verifica di sessione

Le caselle che nessun agente può spuntare, perché richiedono un accesso vero e un browser vero. `done` si mette dopo queste, non dopo la revisione. Dove una casella chiede un numero o un esito, **il numero va scritto**: la 3.4 ne ha lasciate tre senza, e restano passate ma non misurate.

**AC1 — in fondo alla scheda c'è il verdetto**

- [ ] Apro la scheda esistente, scorro fino in fondo: la card del verdetto è dopo l'ultimo blocco e sopra la barra ancorata, e i campi sono quelli previsti.
- [ ] Scelgo `sì condizionato` e compilo condizione e data: si salvano da soli come tutti gli altri, e l'indicatore in fondo lo dice.
- [ ] Ricarico: tutti e cinque i valori sono quelli che avevo scritto.
- [ ] Sul tablet: i cinque controlli sono raggiungibili, il selettore di sistema della data si apre, e i bersagli restano almeno 44px.

**AC2 — cambiarlo riesce sempre**

- [ ] Cambio il verdetto da `sì` a `no` e viceversa, due volte: nessuna conferma, nessun avviso, nessun ritardo.
- [ ] Cambio il verdetto **mentre l'indicatore dice `Salvataggio…`** su un altro campo: passa comunque, e alla fine sul server ci sono tutti e due i valori.
- [ ] Riscrivo il motivo su un verdetto già salvato: si aggiorna.

**AC3 — non scriverlo è una risposta legittima**

- [ ] Apro una scheda nuova e la lascio senza toccare il verdetto: resta `non deciso`, nessun avviso, nessun campo rosso, e la barra non chiede niente.

**AC4 — la pillola**

- [ ] Le quattro pillole, una per verdetto: verde, ambra, rosso, grigio, **ciascuna col suo testo accanto al colore**.
- [ ] Guardo la schermata a occhi socchiusi: la pillola è l'unica cosa colorata satura (UX-DR2, regola 5).
- [ ] Rimisuro i tre rapporti di contrasto **sui colori effettivi a schermo** e li annoto: devono essere almeno 4,5:1. È la voce che questa story dichiara chiusa, e una voce chiusa su un numero non verificato è peggio di una aperta.
- [ ] Guardo una pillola di verdetto e una di stato del cliente vicine, in due schede del browser: sono riconoscibili come due cose diverse — colore nel fondo l'una, colore nel punto l'altra — e nessuna delle due sembra un errore dell'altra.

**I due campi condizionali (Domanda 1, variante B′)**

- [ ] Con verdetto `non deciso` e i due campi vuoti: non ci sono.
- [ ] Scelgo `sì condizionato`: **compaiono subito**, senza aspettare il salvataggio. Se compaiono con tre secondi di ritardo, il verdetto viene letto dal server invece che dal selettore ed è il difetto che il Task 4 esiste per evitare.
- [ ] Scorro le quattro opzioni del verdetto **con le frecce della tastiera**: i due campi compaiono passando su `sì condizionato` e **non spariscono più** proseguendo. È la latch decisa il 10 agosto 2026: comparsi una volta, restano per la sessione.
- [ ] Scrivo una condizione, aspetto il salvataggio, poi cambio il verdetto in `no`: **i due campi restano**, perché la condizione ha un contenuto. È la metà della decisione che impedisce a un testo di sparire.
- [ ] Svuoto la condizione e la data con verdetto `no`, aspetto il salvataggio: **i due campi restano a schermo**, vuoti. **Ricarico:** ora non ci sono più, perché al caricamento decide `showsCondition` e sul server non c'è niente. Sono le due metà della stessa decisione, e vanno viste tutte e due.
- [ ] Scrivo una condizione e **cambio subito il verdetto**, senza aspettare: il testo non si perde, perché il campo non si smonta più. Se si perdesse lo stesso, va annotato **cosa** si è visto: vorrebbe dire che la latch non sta funzionando.

**AC5 — nessun suggerimento di esito**

- [ ] Scorro la schermata intera, dall'intestazione alla barra: nessun punteggio, nessuna percentuale, nessuna frase che consigli, nessun ordine che suggerisca un esito migliore.

**Quello che questa story muove e che si vede altrove**

- [ ] Scrivo un verdetto, torno all'elenco clienti: **il cliente è salito in cima**, perché l'ultima attività si è mossa. È la differenza da `saveAnswer`, ed è la casella che dice se la rivalidazione è quella giusta. Se non sale, va annotato **cosa** si è visto.
- [ ] Le altre tre schermate che usano `useEditableField` — scheda cliente, persona, titolo del blocco — continuano a funzionare: questa story non le tocca, e la casella serve solo a escludere una regressione da `call-date.ts`.

**Il campo data, e le quattro schermate che l'hook serve** (aggiunte dalla revisione del 10 agosto 2026, che ha aperto `use-editable-field.ts`)

- [ ] Scrivo una data in «Verificare entro», aspetto: **non si salva a tempo**, l'indicatore resta fermo. Esco dal campo: si salva, e l'indicatore lo dice.
- [ ] Su una data già salvata ribatto **solo l'anno** e mi fermo dieci secondi col fuoco dentro: la data **non** viene cancellata. Col vecchio comportamento sparivano dopo tre secondi.
- [ ] Svuoto la data di proposito ed esco dal campo: si salva come vuota. Ricarico: è vuota davvero.
- [ ] Le altre quattro schermate che usano `useEditableField` — scheda cliente (campi lunghi e corti), persona, titolo del blocco nel questionario, e le ventiquattro risposte — salvano ancora **a tempo** dopo tre secondi, all'uscita dal campo, e passando in secondo piano. È il prezzo dichiarato per aver aperto l'hook, e la casella serve a pagarlo.

**Alla fine**

- [ ] Riconto `clients`, `people`, `assessments`, `answers`, `question_blocks`, `questions` e annoto i numeri. Se la scheda usata per la verifica **resta**, va scritto: è il dato che la voce `deferred-work.md:127` aspetta.
- [ ] Se qualcosa non va come qui sopra, si annota **cosa** e **dove**, non «non funziona».

### File List

```
Aggiunti dalla revisione del 10 agosto 2026, per decisione di Luca dello stesso giorno:

src/lib/use-editable-field.ts                                     MODIFICA — deferUntilExit, facoltativa
                                                                             e falsa per difetto (perimetro
                                                                             allargato di un file, v. Dev Notes)
docs/00-contesto-e-decisioni.md                                   MODIFICA — D26: la voce di contrasto barrata
                                                                             e chiusa per le pillole, col caso
                                                                             peggiore corretto e il residuo detto

src/lib/verdict.ts                                                NUOVO — i quattro valori, le etichette,
                                                                          i cinque descrittori, le due guardie,
                                                                          isConditionalField e showsCondition
src/lib/verdict.test.ts                                           NUOVO — 11 test
src/lib/call-date.ts                                              MODIFICA — validateVerifyBy, VERIFY_BY_INVALID,
                                                                             nucleo isCalendarDay estratto
src/lib/call-date.test.ts                                         MODIFICA — 5 test nuovi (10 → 15)
src/lib/types.ts                                                  MODIFICA — AssessmentVerdict, e il commento
                                                                             sbagliato di AssessmentSummary corretto
src/app/(app)/clienti/verdict-actions.ts                          NUOVO — saveVerdict, con la doppia rivalidazione
src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx         MODIFICA — cinque colonne nella select,
                                                                             la card dentro SaveBoundary
src/app/(app)/clienti/[id]/schede/[assessmentId]/verdict-card.tsx NUOVO — la card, componente client
                                                                          (scostamento 1), senza <form>
src/app/(app)/clienti/[id]/schede/[assessmentId]/verdict-field.tsx NUOVO — un campo, componente client
src/components/verdict-pill.tsx                                   NUOVO — riusata dalla 4.1 e dalla 4.2
src/app/globals.css                                               MODIFICA — 3 inchiostri nuovi,
                                                                             3 modificatori di pillola
docs/design-system.md                                             MODIFICA — §2 (voce di contrasto chiusa),
                                                                             §5 (da quale token viene il testo),
                                                                             §9 (i tre token)
docs/bmad/implementazione/deferred-work.md                        MODIFICA — 1 voce nuova, 3 annotazioni,
                                                                             di cui una corretta in vista
                                                                             dalla revisione (la voce 18)
docs/bmad/implementazione/sprint-status.yaml                      MODIFICA — 3-5 in-progress, poi review
docs/bmad/implementazione/3-5-scrivere-il-verdetto.md             MODIFICA — questo file
```

Nessuna migrazione, nessuna dipendenza, nessuna cartella nuova. Dei file che le Dev Notes dichiaravano da non aprire ne restano invariati **dieci su undici**: `answer-blocks.tsx`, `answer-field.tsx`, `choice-field.tsx`, `answer-actions.ts`, `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts`, `components/save-indicator.tsx`, `assessment-actions.ts`, `supabase/migrations/`. L'undicesimo — `use-editable-field.ts` — è stato aperto dalla revisione del 10 agosto 2026 per decisione di Luca, e il motivo, il prezzo e le caselle che lo pagano stanno in Dev Notes → «Cosa cambia questa story, file per file» e in «Verifica di sessione».

## Change Log

| Data | Chi | Cosa |
|---|---|---|
| 10 agosto 2026 | create-story | Creazione del file. Stato del database rimisurato e diverso da quello dichiarato dalla 3.4: 1 scheda e 24 risposte, con le conseguenze scritte. Contrasto delle quattro pillole misurato con la formula WCAG, e il caso peggiore risulta `non deciso` e non `sì` come `design-system.md` §2 dichiara. Tre domande aperte a Luca |
| 10 agosto 2026 | dev-story | Implementazione. Cinque file nuovi, cinque toccati, nessuna migrazione. 212 test verdi (196 → +11 di `verdict.test.ts`, +5 di `call-date.test.ts`), typecheck e build puliti. La voce di contrasto di `design-system.md` §2 si chiude su quattro rapporti **misurati** a schermo: 4,51 / 4,57 / 4,51 / 6,37. Cinque scostamenti dichiarati col motivo, il primo dei quali — la card client invece che server — chiuso da Luca perché era una contraddizione interna alla story fra il Task 4 e il Task 5. `deferred-work.md`: 0 voci nuove, 3 annotazioni |
| 10 agosto 2026 | code-review | Revisione a tre strati. Cinque decisioni e cinque correzioni, tutte applicate; sei rilievi scartati col motivo. Le due gravi avevano la stessa radice — `showsCondition` leggeva i due contenuti dal server, quindi smontava i campi condizionali portandosi via il timer armato del campo accanto e una voce `failed` dal registro — e si chiudono con una latch nella card: comparsi una volta, restano per la sessione. La terza ha allargato il perimetro di un file, per decisione di Luca: `deferUntilExit` in `use-editable-field.ts`, perché `<input type="date">` restituisce la stringa vuota mentre lo si scrive e il timer cancellava le date già salvate. Chiuse anche la voce di contrasto di D26 (col residuo di `.error-box` e `.warn-box` a debito, ripresa alla 5.2), la frase falsa sui tre pieni su bianco, e la tracciabilità dello scostamento 1, ora Domanda 4. 212 test verdi, typecheck muto, build pulita |
| 10 agosto 2026 | Luca | Domanda 1: i due campi condizionali si vedono col verdetto condizionato **oppure** quando hanno già un contenuto salvato, così niente di scritto diventa invisibile; la decisione diventa una funzione pura con i suoi test. Domanda 2: il debito di contrasto delle pillole **si chiude qui**, con tre inchiostri scuriti usati solo dentro le pillole e registrati anche in `design-system.md`; i tre pieni di D26 restano. Domanda 3: la card resta dentro il confine di salvataggio com'è, quindi solo nello stato pieno, e la decisione della 3.3 non si riapre. La story non ha più rami condizionati |
