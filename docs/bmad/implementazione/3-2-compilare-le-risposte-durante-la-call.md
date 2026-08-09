---
baseline_commit: 918880f
---

# Story 3.2: Compilare le risposte durante la call

Status: in-progress

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 9 agosto 2026

> **Baseline.** La Story 3.1 è implementata, revisionata e chiusa: `918880f` su `main`. Tutti i conteggi di questo file (righe, test, grep, stato del database) sono presi da quel commit e dal progetto Supabase, verificati il 9 agosto 2026. L'unica modifica non committata nel repository è una riga tolta a mano da `docs/kb-0.md` §10, che non riguarda questa story.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want scorrere i blocchi dall'alto e scrivere dove serve, saltando quello che non serve,
so that la scheda segue la conversazione invece di imporle un percorso.

## Acceptance Criteria

**AC1 — i blocchi in sequenza verticale, senza passaggi obbligati**
**Given** una scheda aperta
**When** la guardo
**Then** vedo i blocchi in sequenza verticale, ciascuno coi suoi campi, senza passaggi obbligati fra un blocco e l'altro (FR18)

**AC2 — la domanda sopra, l'aiuto sotto**
**Given** una domanda
**When** la guardo
**Then** il testo sta sopra il campo a `--t-heading` e il testo di aiuto sotto a `--t-meta` in `--ink-muted` (UX-DR7)

**AC3 — il campo lungo cresce, e il fuoco è nella tinta della sezione**
**Given** un campo di risposta di tipo testo lungo
**When** ci scrivo dentro
**Then** cresce in altezza col contenuto, con un minimo di tre righe
**And** al focus ha bordo `--sec-prequalifica` e alone di 3px nella sua tinta, mai l'anello predefinito del browser (UX-DR7)

**AC4 — la scelta singola offre le sue opzioni**
**Given** una domanda di tipo scelta singola
**When** la compilo
**Then** scelgo fra le opzioni salvate nella copia della domanda

**AC5 — niente è obbligatorio**
**Given** una scheda intera
**When** la lascio completamente vuota
**Then** nessun campo è obbligatorio e nessun avviso mi ferma (FR18)

**AC6 — usabile su tablet**
**Given** un tablet
**When** compilo la scheda
**Then** i bersagli toccabili sono almeno 44px e la schermata resta usabile (NFR4, UX-DR14)

> **Questa story costruisce la schermata su cui si passerà più tempo di tutte.** È la prima rotta nuova da tre story, la prima lettura di `answers`, e la prima volta che una domanda compare con un campo sotto invece che con un pulsante `Modifica` accanto.

> **Questa story non salva niente** (v. domanda 2, il cui default è già applicato in tutti i task). Nessuna azione di scrittura, nessun salvataggio automatico, nessun indicatore, nessun pulsante `Salva`: sono la Story 3.3. Qui si legge la scheda, si rende, e si scrive nei campi — ma quello che si scrive **si perde alla ricarica**. È il perimetro che l'epica dichiara, ed è anche l'unica riga di questa story che vale la pena rileggere prima di implementare.

> **E non porta il verdetto** (3.5), **né lo stato di compilazione** (3.6), **né il contatore e la barra** (4.1), **né l'esportazione** (4.3).

## Tasks / Subtasks

- [x] **Task 1 — La migrazione 0015: `answers` porta anche il tipo, le opzioni e l'aiuto** (AC: 2, 3, 4)

  Confermato da Luca il 9 agosto 2026: si fa la migrazione, non l'innesto (domanda 1).

  - [x] File nuovo `supabase/migrations/0015_answer_question_copy.sql`. **Il problema che chiude:** `answers` copia oggi `question_text`, `block_title` e `position`, e nient'altro (`0005_assessments_answers.sql`, `database.md` §3). Il tipo di risposta, le opzioni della scelta singola e il testo di aiuto **non sono copiati**, ma servono tutti e tre per rendere questa schermata: senza il tipo non si sa che controllo disegnare, senza le opzioni AC4 non ha niente da offrire, senza l'aiuto AC2 non ha niente da mostrare sotto la domanda. L'AC4 dice, alla lettera, «le opzioni salvate **nella copia** della domanda»: oggi quella copia non esiste.
  - [x] **Perché copiare invece di innestare.** Senza le copie, la schermata deve risalire a `questions` da `question_id`, e allora una domanda riscritta cambia la scheda vecchia sotto gli occhi: una `scelta_singola` diventata `numero` rende una risposta «sì, ma solo il primo anno» dentro un campo numerico, cioè un contenuto che non si legge e non si corregge più. È esattamente la categoria di guasto che `database.md` §3 chiama «la scelta centrale dello schema» — la risposta resta leggibile anche se la domanda cambia o sparisce — applicata a metà. E `answers.question_id` è `on delete set null`: il giorno che quella colonna è nulla, l'innesto non porta più niente.
  - [x] **Adesso costa zero.** `answers` è **vuota**, contata il 9 agosto 2026: nessun backfill, nessun default da inventare, e `not null` si può dichiarare senza trucchi. Fra una scheda e mille la stessa migrazione richiederebbe un default o un riempimento, e un default su una colonna copiata è un valore inventato che nessuno saprà più distinguere da uno vero.
  - [x] Dichiarazione D24 in testa, tre chiavi nell'ordine di `database.md` §7, **senza `cascade`**:
    ```sql
    -- 0015 la risposta copia anche il tipo, le opzioni e l'aiuto
    -- Reversibile: sì nella struttura, no nei dati.
    -- Come si annulla: alter table public.answers drop column help_text;
    --   alter table public.answers drop column options;
    --   alter table public.answers drop column answer_type;
    --   poi si riesegue per intero 0014_open_assessment_total.sql, che è già una
    --   `create or replace` e ricrea la funzione senza le tre colonne.
    -- Cosa si perde: le tre copie di ogni risposta già scritta. Le schede restano, e con loro
    --   il testo della domanda, il blocco, la posizione e il contenuto; sparisce il modo di
    --   sapere con che controllo quella risposta era stata raccolta.
    ```
  - [x] Le tre colonne, in un `alter table` solo:
    - `answer_type text not null` — **senza default e senza `check`**. Senza default perché l'unica scrittura è `open_assessment` e un default la lascerebbe sbagliare in silenzio; il `not null` passa solo perché la tabella è vuota, e il file deve dirlo. Senza `check` perché questa colonna **copia** e non valida: il valore ha già superato il vincolo su `questions`, e ripeterlo qui vuol dire due insiemi da tenere allineati a mano — il giorno che divergono, il rifiuto arriva dentro `open_assessment`, cioè una scheda che non si apre durante una call per una parola. Una copia che rifiuta la storia è peggio di una copia che la registra.
    - `options text[]` — nullabile, copiata verbatim, nessun vincolo che la leghi al tipo. La 0010 lega le due cose su `questions`, che è dove si scrive; qui si riceve.
    - `help_text text` — nullabile. Due domande su ventiquattro ce l'hanno vuoto, quindi il caso è vivo.
  - [x] Nella stessa migrazione, `create or replace function open_assessment(...)`: **stesso corpo della 0014 con tre colonne in più nell'`insert into public.answers`** e nella sua `select`, cioè `qq.answer_type`, `qq.options`, `qq.help_text`. Niente altro cambia: stessa firma coi due `default null`, stessa terna di scelta del questionario, stesso `get diagnostics`, stesso fuso `Europe/Rome` scritto a mano. **Si copia il file 0014 e si aggiungono tre nomi**, non si riscrive: ogni riga che cambia oltre quelle è una regressione su una funzione già revisionata.
  - [x] La `create or replace` conserva i privilegi (è già scritto in fondo alla 0014): nessun `revoke`/`grant` da ripetere.
  - [x] Applicare con `apply_migration` passando il nome **con il prefisso** (`0015_answer_question_copy`), poi verificare con `list_migrations` che le righe siano **quindici** e tutte col prefisso (`database.md` §7). Se un nome entra spoglio, allineare il registro con l'`update` documentato e dichiararlo nel Dev Agent Record.
  - [x] Rigenerare `src/lib/database.types.ts` con `generate_typescript_types`: la `Row` di `answers` guadagna tre campi e senza rigenerare la lettura del Task 3 non compila. È una rigenerazione, non una modifica a mano.

- [x] **Task 2 — Il raggruppamento per blocco, funzione pura con il suo test** (AC: 1)
  - [x] `src/lib/answer-groups.ts` **nuovo**, file puro senza React e senza Supabase. Una funzione: `groupAnswersByBlock(answers)` che prende le risposte **già ordinate** e risponde `{ title: string; answers: T[] }[]`.
  - [x] **Si raggruppa per corse consecutive, non con una mappa per titolo.** Due blocchi possono avere lo stesso titolo — niente lo vieta, `question_blocks` non ha nessun indice unico su `title` — e una mappa li fonderebbe in uno, spostando le domande del secondo dentro il primo e cambiando l'ordine dell'intervista. Una corsa consecutiva rispetta l'ordine e lascia due gruppi omonimi dove erano. È la ragione per cui questa funzione esiste invece di tre righe dentro la pagina, ed è anche la ragione per cui ha un test.
  - [x] Generica sul tipo delle righe (`<T extends { block_title: string }>`), così il test non ha bisogno di costruire una riga intera di `answers`. Nessun `any`, nessun `as`.
  - [x] `src/lib/answer-groups.test.ts` **nuovo**: elenco vuoto → nessun gruppo; un blocco solo; tre blocchi in fila; **due blocchi omonimi non adiacenti → due gruppi e non uno**, che è il caso per cui la funzione non è una mappa; l'ordine dentro il gruppo è quello ricevuto e non si riordina.
  - [x] Estensione `.ts` sugli import interni, se ne servono: è la regola già scritta su `client-tags.ts:1` (un modulo di `src/lib` raggiunto da un test la vuole su tutta la catena).

- [x] **Task 3 — La rotta e la lettura** (AC: 1, 5)
  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` **nuovo**. La rotta è annidata sotto il cliente (v. domanda 3): il ritorno indietro ha già il suo bersaglio senza nessuna lettura in più, l'appartenenza della scheda al cliente diventa una condizione verificabile invece che una speranza, e la voce `Clienti` della navigazione resta accesa da sola, perché `nav.tsx:33` accende sul prefisso. Una rotta di primo livello lascerebbe la navigazione **senza nessuna voce accesa**, che a schermo si legge come un difetto.
  - [x] I due parametri si controllano con `isUuid` prima di qualsiasi query, e se uno non lo è si chiama `notFound()`: è la stessa riga e la stessa ragione di `[id]/page.tsx:27` — un indirizzo storpiato è una scheda che non c'è, non un guasto con il suo `Riprova` che ricarica un indirizzo impossibile.
  - [x] Sessione: `supabase.auth.getUser()`, e il ramo «servizio irraggiungibile contro sessione assente» è quello già scritto in `[id]/page.tsx:38-43`, copiato riga per riga. Non si semplifica: mandare a `/accedi` per un guasto transitorio è una bugia.
  - [x] Prima lettura, la scheda: `.from('assessments').select('id, client_id, call_date, clients(name)').eq('id', assessmentId).eq('client_id', clientId).maybeSingle()`. `maybeSingle` e non `single`, per la ragione già scritta a `[id]/page.tsx:45-46`. **`.eq('client_id', clientId)` è correttezza e non sicurezza** — la policy filtra comunque — ma è quello che rende un indirizzo cucito a mano, con la scheda di un cliente sotto un altro cliente, un 404 invece di una pagina che mente sul contesto. Riga assente → `notFound()`.
  - [x] L'innesto `clients(name)` e non una seconda lettura: `assessments.client_id` è una chiave esterna sola verso `clients`, quindi il percorso non è ambiguo. Serve al ritorno indietro, che deve dire **su chi** si torna. **Se il tipo generato desse l'innesto come elenco invece che come oggetto**, si legge secondo il tipo che arriva e non si forza con un `as`, che è vietato (kb-0.md §2): il caso va visto, non dedotto, e va dichiarato nel Dev Agent Record.
  - [x] Seconda lettura, le risposte: `.from('answers').select('id, block_title, question_text, help_text, answer_type, options, content').eq('assessment_id', assessmentId).order('position').order('id')`. Otto colonne, e sono **esattamente** quelle che la schermata rende — `block_title` per il raggruppamento, `position` solo come chiave d'ordine e mai a schermo. Un dato letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio: è l'argomento già scritto su `AssessmentSummary`, e il tipo `AnswerDetail` in `src/lib/types.ts` è il `Pick` che tiene onesto l'elenco.
  - [x] `.eq('assessment_id', assessmentId)` è **correttezza e non sicurezza**, come lo `.eq('client_id', id)` delle persone: la policy filtra comunque per proprietario, ma senza questo filtro arriverebbero le risposte di tutte le schede.
  - [x] `.order('id')` dopo `position`: `answers.position` **non è unico** (`answers_assessment_position_idx` è un indice normale) e un `order by` su una colonna sola non definisce nessun ordine a parità di valore. `created_at` non servirebbe a niente qui, perché tutte le righe di una scheda nascono nella stessa transazione e quindi con lo stesso valore — è la stessa scoperta già scritta su `questionario/page.tsx:46-54` per il seed.
  - [x] Nessun innesto su `questions` e nessuna seconda lettura del questionario: **tutto quello che serve sta dentro `answers`**, ed è il punto del Task 1. Se in questo file compare `.from('questions')`, il Task 1 non è stato applicato.
  - [x] Errore sulla seconda lettura: non fa cadere la pagina. Si logga `code` e `message` — **mai `details`**, che conterrebbe il testo delle domande e delle risposte, cioè testo scritto da persone (kb-0.md §3) — e la schermata va nel suo stato d'errore con `ErrorState` e `retryHref` verso la rotta corrente.
  - [x] I quattro stati (NFR9, UX-DR11): **pieno** i blocchi coi loro campi; **errore** `ErrorState` dentro una `.card`; **vuoto** una scheda che non ha nessuna risposta — non raggiungibile dall'interfaccia, perché la 0014 solleva un'eccezione se scriverebbe zero righe, ma il ramo esiste lo stesso e dice `«Questa scheda non ha nessuna domanda.»` **senza nessun pulsante**, con la stessa ragione dello stato vuoto del questionario: non c'è niente che l'interfaccia possa fare per ripararla; **in caricamento** in `loading.tsx` (Task 5).
  - [x] L'intestazione: `<Link href={/clienti/{clientId}} className="meta back-link">← {nome cliente}</Link>`, poi `<h1 className="page-title">Prequalifica</h1>`, e accanto la data della call con `formatCallDate` in `.data` dentro `.page-header__actions`. Tre classi che esistono tutte. **Niente interlocutore nell'intestazione**: nessuna AC lo chiede, costerebbe una terza lettura o un innesto ambiguo, e la riga della card del cliente lo dice già.
  - [x] `page.tsx` sotto le 200 righe. Se ci si avvicina, la parte di resa esce **prima** e non dopo, nel file del Task 4: è già successo alla 3.1, dove `[id]/page.tsx` è arrivato a 219 e si è dovuto dividere a implementazione fatta.

- [x] **Task 4 — La resa: i blocchi e il campo di risposta** (AC: 1, 2, 3, 4, 5, 6)
  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-blocks.tsx` **nuovo**, **Server Component** (nessun `'use client'`): prende i gruppi del Task 2 e rende una `.card` per blocco, con `.card__header` + `.card__title` = il titolo del blocco, e dentro un `<ol className="answers">` con un `<li className="answer">` per risposta. Una card per blocco è la stessa forma della schermata del questionario, ed è «i blocchi in sequenza verticale» (AC1) senza inventare niente.
  - [x] **La `key` del blocco è l'`id` della sua prima risposta, non il titolo.** Due blocchi omonimi sono possibili — è la stessa ragione per cui il Task 2 raggruppa per corse — e due `key` uguali fanno rendere a React un solo blocco dei due, in silenzio.
  - [x] **Nessun elemento `<form>` su questa schermata**, e non è una dimenticanza: senza salvataggio non c'è niente da inviare, e un `<form>` porterebbe l'invio implicito con Invio, cioè un ricaricamento della pagina che porta via quello che è stato scritto. La Story 3.3 deciderà se i campi diventano moduli come sulla scheda cliente.
  - [x] Nessun passaggio obbligato, nessuna numerazione di blocco, nessun «blocco 2 di 8», nessun collasso e nessuna scheda a linguette: AC1 chiede il contrario, e una schermata che si scorre è quella che segue una conversazione.
  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx` **nuovo**, `'use client'`, `AnswerField`. Props: `{ answerId, questionText, helpText, answerType, options, content }`.
  - [x] **Lo stato è locale e non si salva** (v. domanda 2): `useState(content ?? '')` e basta. Nessuna azione, nessun `useEditableField`, nessun `SaveIndicator`, nessun timer. La Story 3.3 sostituirà quel `useState` con `useEditableField`, che è un diff di poche righe **se lo stato vive qui e non nella pagina**: è il motivo per cui il campo è un componente per conto suo, come `ClientFieldForm` è un modulo per campo.
  - [x] **Il testo della domanda è una `<label>` vera**, non un `<p>`: `<label className="answer__text" htmlFor={id}>`. È l'unica cosa a schermo che nomini quel campo, e kb-0.md §6 chiede che ogni campo abbia un'etichetta vera e non solo un segnaposto. Così AC2 e l'accessibilità sono la stessa riga invece di due.
  - [x] L'aiuto sotto la domanda e **sopra** il campo, `<p className="meta" id={aiutoId}>`, collegato con `aria-describedby`. «Sotto» vuol dire sotto la domanda: lo dicono il PRD §4 («testo di aiuto visibile sotto la domanda») e `design-system.md` §5 («sopra il campo la domanda, sotto il testo di aiuto»), ed è come la schermata del questionario già lo rende (`question-item.tsx:84`). Aiuto vuoto → **nessun contenitore reso**: un `<p>` vuoto lascia un buco che sembra un difetto (è la ragione già scritta lì).
  - [x] I quattro controlli, per `answerType`:
    - `testo_lungo` → `<textarea className="input input--long" rows={3}>` dentro l'involucro che lo fa crescere (sotto).
    - `testo_breve` → `<input className="input" type="text" autoComplete="off">`.
    - `numero` → `<input className="input" type="text" inputMode="numeric" autoComplete="off">`. **`type="text"` e non `type="number"`**, con la motivazione già scritta a `client-field-form.tsx:111-113`: con `type="number"` il browser restituisce stringa vuota per un contenuto non numerico, e quello che è stato battuto sparisce prima di arrivare al server. `inputMode` dà comunque il tastierino sul tablet.
    - `scelta_singola` **con almeno un'opzione** → `<select className="input select">` con una prima opzione di valore `''` etichettata `Nessuna risposta`, poi una per opzione. Il selettore nativo, che sul tablet si comporta meglio di qualunque sostituto disegnato a mano (è la ragione già scritta su `.select` e sul selettore di stato), e nessun `appearance: none` che porterebbe un colore fuori da `globals.css`.
      **Un `content` che non è fra le opzioni non si perde**: React su un `value` che non corrisponde a nessuna `<option>` seleziona la prima e cambia il significato della risposta senza dire niente — è la voce già a ledger sul selettore di stato del cliente (revisione 1.3), e qui il danno sarebbe una risposta riscritta da sola. Se `content` non è vuoto e non è fra le opzioni, si rende **in più** un'opzione con quel valore, in coda: il contenuto resta scelto e visibile. Con le copie della 0015 il caso è raro per costruzione, ma «raro» e «impossibile» non sono la stessa cosa, e questa è una riga.
    - **Ripieghi, due, e non sono difensivi per abitudine.** `scelta_singola` **senza opzioni** → campo di testo breve: è la stessa difesa in resa già scritta a `question-item.tsx:97-100`, e senza di essa la domanda non avrebbe nessun controllo. Tipo **fuori dai quattro** → campo di testo lungo, che è il più permissivo e mostra per intero quello che c'è: è il precedente di `answerTypeLabel` e di `StatusPill`, che rendono grezzo invece di sparire o di far cadere la pagina.
  - [x] **Nessun `required`, nessun asterisco, nessun `pattern`, nessun `min`/`max`, nessun conteggio di caratteri, nessun messaggio.** È AC5, e si verifica col grep del Task 6.
  - [x] **Il campo lungo cresce col contenuto** (AC3). L'involucro è una griglia con una copia invisibile del testo:
    ```css
    .answer__grow { display: grid; }
    .answer__grow > textarea,
    .answer__grow::after { grid-area: 1 / 1; }
    .answer__grow::after {
      content: attr(data-replica) ' ';
      white-space: pre-wrap;
      visibility: hidden;
    }
    ```
    La copia e il `textarea` devono avere **la stessa scatola**: stesso `font`, stesso `padding` (12px 16px), stesso `line-height` (24px), stesso bordo di 1px (trasparente sulla copia), stesso `min-height` (98px) e `overflow-wrap: anywhere`. Sul `textarea`, `resize: none` e `overflow: hidden`: la maniglia di ridimensionamento a mano di `.input--long` qui litigherebbe con la crescita automatica, e va tolta invece di lasciata a metà. Lo spazio dopo `attr()` non è un refuso: senza, l'ultima riga vuota non conta e il campo non cresce quando si va a capo.
    L'involucro è reso da `AnswerField` con `data-replica={value}` — lo **stesso** stato che alimenta il `textarea`, non una lettura del DOM e nessun `ref`: se le due sorgenti fossero due, il campo crescerebbe con un carattere di ritardo.
    **`.input--long` non si tocca**: è quella dei due campi lunghi della scheda cliente, fuori perimetro, e cambiarla vorrebbe dire cambiare un'altra schermata.
    - [x] `field-sizing: content` farebbe la stessa cosa in una riga. **Non si adotta senza averlo verificato** sui browser che Luca usa davvero (kb-0.md §1: dichiara l'incertezza e verifica): se la verifica del Task 6 dice che è supportato ovunque serve, si dichiara nel Dev Agent Record e si sostituisce l'involucro; altrimenti resta la griglia, che funziona ovunque.
  - [x] **Il fuoco è già giusto e non si scrive niente** (AC3, seconda metà): `.input:focus` dichiara da sempre `border-color: var(--sec-prequalifica)` e `box-shadow: 0 0 0 3px var(--sec-prequalifica-tint)`, con `outline: none` (`globals.css:538-542`). Su ogni altra schermata quella tinta è quella sbagliata — è la voce a ledger del 2 agosto, assegnata alla 5.2 — e **questa è la sola schermata del progetto dove è quella giusta**. Va scritto nel commento del CSS nuovo, altrimenti chi chiuderà quella voce toglierà anche questo.
  - [x] **I 44px** (AC6): `.input` dichiara già `min-height: 44px`, e su questa schermata non c'è nessun pulsante — non l'azione primaria, che non esiste finché non si salva, non le frecce, non `Modifica`. Il solo bersaglio oltre ai campi è il ritorno indietro, che è un collegamento di testo. AC6 si soddisfa quindi **senza toccare `.btn`**, che resta a 40px ed è la voce a ledger della 1.1 assegnata alla 5.2: va detto, perché altrimenti sembra dimenticata.
  - [x] **CSS nuovo, e si dichiara.** Servono `.answers` (azzeramento dell'elenco), `.answer` (la voce, con la riga di separazione e il `:first-child` senza, come `.question` e `.person`), `.answer__text` e `.answer__grow`. Nessun esadecimale, solo i token e la scala di spaziatura (4, 8, 12, 16, 20, 24…).
  - [x] **`.answer__text` è nuova e non riusa `.question__text`**, che oggi porta gli stessi quattro valori. Le due schermate divergeranno — là la domanda sta in una riga flex accanto a quattro pulsanti, qui è l'etichetta di un campo — e una classe condivisa fra due sezioni è il modo in cui una modifica a una schermata ne rompe un'altra senza che nessuno se ne accorga. Il commento della regola nomina l'altra e dice che oggi sono gemelle: è quello che serve a chi un giorno vorrà unirle.
  - [x] **Nessuna tinta di sezione dentro il contenuto** oltre all'alone del fuoco, che `design-system.md` §5 assegna esplicitamente al campo di risposta. Nessun titolo colorato, nessun bordo colorato, nessuna icona colorata (UX-DR2).

- [x] **Task 5 — Lo scheletro e il collegamento che porta qui** (AC: 1)
  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx` **nuovo**: l'intestazione (una barra stretta per il ritorno, una per il titolo) e **una sola card col solo titolo**. Si riserva lo spazio di quello che c'è **sempre**, non di quello che dipende dai dati: quanti blocchi ci siano, quanto sia lunga una domanda e se il campo sia alto 44 o 98 dipendono dalla scheda, e riservarli farebbe saltare la pagina invece di togliere il salto. È la stessa regola già applicata due volte in `[id]/loading.tsx:61-78`.
  - [x] `src/app/(app)/clienti/[id]/assessments-card.tsx` **modifica, e solo questa**: la data della riga diventa un `<Link href={/clienti/{clientId}/schede/{assessment.id}} className="data">`. Senza, la schermata di questa story non è raggiungibile e la story non si verifica. Il commento in testa al file dice «Nessun collegamento: la schermata di compilazione è la Story 3.2 e non esiste ancora»: va corretto, non lasciato a mentire.
  - [x] Il collegamento è **sulla data** e non su tutta la riga: la riga porta anche il nome dell'interlocutore, che non è un bersaglio, e l'alone del fuoco su una riga intera è un'altra decisione. La voce a ledger della 1.1 — «l'hover illumina tutta la riga ma solo il nome è cliccabile» — parla della tabella dei clienti e resta dov'è; qui non si introduce nessun hover di riga.
  - [x] Il nome accessibile del collegamento è la data. Con più schede su un cliente sono più collegamenti che si distinguono solo per la data: è l'informazione che le distingue davvero, ma se emerge qualcosa a schermo va in `deferred-work.md` insieme alle voci di accessibilità della 5.2, non corretto qui.
  - [x] **Nient'altro in quel file**: nessuna pillola, nessun contatore, nessuna barra, nessuno stato di compilazione. Sono le Story 3.5, 3.6, 4.1 e 4.2.

- [x] **Task 6 — I documenti**
  - [x] `docs/database.md` §7, l'elenco dei file: si aggiunge `0015_answer_question_copy.sql -- la risposta copia anche tipo, opzioni e aiuto`.
  - [x] `docs/database.md` §3, il blocco `answers`: le tre colonne dentro il `create table` mostrato, con **una** frase sul perché sono copie e non un innesto. Una frase, non un secondo racconto: la motivazione per esteso sta in testa alla migrazione, e la revisione della 3.1 ha già corretto una volta lo stesso eccesso in questo stesso paragrafo.
  - [x] `docs/prd-v1.md` §3, la tabella **Risposta**: le tre righe nuove. Il PRD elencava cinque campi e adesso ne elenca otto; il capoverso in grassetto sotto la tabella («salvare insieme alla risposta una copia del testo della domanda evita tutta la macchina del versionamento relazionale») resta vero e si estende di mezza riga. Il documento **non si riscrive**: si aggiungono le righe e si data la modifica, come si è fatto per la riga superata di `versione`.
  - [x] `docs/bmad/implementazione/deferred-work.md`, annotazioni su voci esistenti e nessuna voce nuova salvo quelle che questa story apre davvero:
    - la voce della revisione 3.1 su **la prop `today` che invecchia a cavallo della mezzanotte** dichiara come punto di ripresa «se la Story 3.2 rende la finestra frequente». Va annotata con quello che è successo: questa schermata **si tiene aperta per ore**, ma non porta nessun campo data e non chiama `open_assessment`, quindi la finestra non si allarga. Il rimando resta, con il motivo aggiornato.
    - la voce della revisione 1.2 su **i campi lunghi che salvano insieme e fanno tornare indietro `baseline`** dichiara come punto di ripresa «se la Story 3.3 rende il caso frequente». Questa story mette ventiquattro campi sulla stessa schermata **senza** salvataggio: la voce non si muove, ma si annota che il conteggio dei campi è ora noto — è l'informazione che serve a chi la riprenderà con la 3.3.
    - la voce della revisione 3.1 su **`globals.css` aperto senza il bisogno misurato a schermo** si chiude o si conferma con la verifica a 375px del Task 7, che qui c'è di nuovo.
    - la voce della 1.1 su **`.btn` a 40px** si annota: AC6 di questa story è soddisfatta senza toccarla, perché la schermata non ha pulsanti. È l'unica schermata del progetto di cui questo sia vero, e vale la pena che chi chiuderà la voce lo sappia.
    - se la verifica a 375px, quella da tastiera o quella del `field-sizing` facessero emergere un caso nuovo, entra qui e non si corregge dentro questa story.

- [ ] **Task 7 — La verifica** (AC: 1, 2, 3, 4, 5, 6)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as`.
  - [x] `npm run build` passa.
  - [x] `npm test` passa e il totale **cresce**: 155 oggi, **+4** dai controlli che `migrations.test.ts` esegue da sé su ogni file di migrazione (le tre chiavi, nessuna vuota, sì/no, niente `cascade`), più i casi di `answer-groups.test.ts`. Il numero esatto lo scrive il Dev Agent Record. **Se resta 155, la migrazione non c'è.**
  - [x] `list_migrations` risponde **quindici** righe, tutte col prefisso, `0015_answer_question_copy` in fondo.
  - [x] **La prova che le copie arrivano, in una transazione che si annulla** (`begin; … rollback;` in una sola chiamata `execute_sql`, come le sonde della 2.5, della 2.6 e della 3.1 — eseguita come proprietario esercita la *meccanica*, non le policy): si chiama `open_assessment` su un cliente vero e si verifica riga per riga che `answer_type`, `options` e `help_text` di ogni risposta **corrispondano alla domanda viva**, comprese le due domande con l'aiuto nullo e l'unica `scelta_singola`, che deve portare le sue **quattro** opzioni nello stesso ordine. Dopo il `rollback`, riconteggio identico alla partenza: 0 schede, 0 risposte.
  - [x] **Che le invarianti della 3.1 non si siano rotte**, nella stessa transazione: `total_questions` uguale al numero di righe di `answers` scritte, `content` nullo su tutte, `position` copiata verbatim, `questionnaire_version` a 1. La 0015 riscrive `open_assessment`, quindi tutto quello che la 3.1 aveva verificato va riverificato qui: una `create or replace` che riscrive una funzione revisionata è il posto in cui una regressione entra senza rumore.
  - [x] **La sonda senza sessione**: `GET …/rest/v1/answers` con la sola chiave pubblicabile risponde `[]`, e `POST …/rest/v1/rpc/open_assessment` risponde **`42501`** — cioè la `create or replace` ha davvero conservato i privilegi, che il commento della 0014 afferma e nessuno ha ancora provato.
  - [x] Il grep del perimetro: `.from('answers')` passa da **zero a uno** (la lettura della pagina); `.from('questions')` sotto `clienti/` resta **zero**; nessun `.insert(`, nessun `.update(`, nessun `.upsert(`, nessun `.rpc(` nuovo, nessun `'use server'` nuovo — **questa story non scrive niente**; nessun `required` e nessun `aria-required` nei file nuovi (AC5).
  - [x] Tutti i file toccati sotto le 200 righe.
  - [x] Nessun esadecimale nei file nuovi. `--sec-prequalifica` compare **solo** dentro `globals.css` e solo nella regola del fuoco che esiste già: nei file nuovi zero occorrenze.
  - [x] I file toccati sono quelli di «Cosa cambia questa story», più le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`, `prd-v1.md`). Ogni file fuori da quell'elenco si dichiara **uno per uno** nelle Completion Notes: la casella corrispondente della 3.1 è stata spuntata dicendo il falso, ed è finita in revisione.

  Richiede una sessione, la fa Luca — è la condizione per `done`. **Avvertenza, e non è una formalità: quello che si scrive nei campi non si salva.** Non c'è nessun `Salva` e nessun indicatore perché non c'è nessun salvataggio: la ricarica riporta la scheda com'era. Non compilare qui una scheda vera; il salvataggio arriva con la Story 3.3.
  - [ ] Apro un cliente, apro una scheda nuova (o uso una già aperta), e dalla riga della card **arrivo alla schermata di compilazione** (Task 5).
  - [ ] Vedo i blocchi uno sotto l'altro, nell'ordine dell'intervista, ciascuno con le sue domande, e scorro dall'alto in basso senza che niente mi fermi (AC1).
  - [ ] Sopra ogni campo c'è la domanda, sotto c'è l'aiuto, e le **due domande senza aiuto** non lasciano nessun buco (AC2).
  - [ ] Scrivo in un campo lungo un testo di dieci righe: **il campo cresce** e non compare nessuna barra di scorrimento interna; a campo vuoto è alto tre righe (AC3).
  - [ ] Entro nel campo: bordo e alone sono nella tinta della prequalifica, e non compare l'anello predefinito del browser (AC3).
  - [ ] La domanda di tipo **scelta singola** offre le sue quattro opzioni più `Nessuna risposta`, e si può lasciare su `Nessuna risposta` (AC4).
  - [ ] Il campo di tipo **testo breve** è una riga sola, e ci si scrive dentro.
  - [ ] **Il tipo `numero` non esiste nel questionario di oggi** (contati il 9 agosto 2026: venti `testo_lungo`, tre `testo_breve`, una `scelta_singola`). Per verificarlo: aggiungo dal `/questionario` una domanda di tipo numero, apro una scheda **nuova** su un cliente di prova, guardo che il campo dia il tastierino numerico sul tablet e accetti quello che scrivo, poi la disattivo. Le schede già aperte non cambiano, ed è FR16.
  - [ ] Scorro fino in fondo senza scrivere niente: nessun asterisco, nessun avviso, nessun campo che si colora, nessun messaggio (AC5).
  - [ ] Ricarico la pagina: **quello che avevo scritto non c'è più**, ed è quello che questa story dichiara. Se ci fosse, qualcosa scrive senza che nessun task lo abbia chiesto.
  - [ ] Da tastiera: Tab attraversa i campi nell'ordine visivo, il fuoco si vede su ognuno, il ritorno indietro è raggiungibile.
  - [ ] Larghezza 375px: nessuno scorrimento laterale, i campi restano da almeno 44px, le domande lunghe vanno a capo, il titolo del blocco più lungo — «Solo sopra le 50 persone, o quando l'interlocutore non è il titolare», 67 caratteri — non trabocca (AC6, NFR4).
  - [ ] Un indirizzo cucito a mano con la scheda di un cliente sotto **un altro** cliente risponde 404 e non una pagina che mostra il contesto sbagliato.
  - [ ] Nessun errore in console e nessun avviso di idratazione.

  Aggiunte dalla revisione del 9 agosto 2026, e sono la verifica dei patch applicati:
  - [ ] In cima alla schermata leggo **«Qui ancora non si salva: quello che scrivi resta finché non ricarichi la pagina.»**, in tinta d'avviso e non d'errore, e non mi impedisce niente. Non compare quando la scheda non si carica, dove il messaggio giusto è già un altro.
  - [ ] Nella card delle schede il **collegamento sulla data** si riconosce come tale — si sottolinea al passaggio, e il fuoco da tastiera si vede — ed è alto almeno 44px. Da guardare anche l'effetto sull'altezza delle righe: la voce ora è più alta di prima, e se in elenco stona è qui che si vede.
  - [ ] Il campo lungo cresce ancora senza barra di scorrimento interna, adesso che porta `overflow: auto` invece di `hidden`: se una barra comparisse a campo pieno, la copia invisibile e il campo non hanno più la stessa scatola, ed è esattamente l'informazione che `hidden` nascondeva.
  - [ ] Un aiuto lungo o con un token senza spazi va a capo dentro la card e non fa scorrere la pagina di lato a 375px.

### Review Findings

Revisione del 9 agosto 2026 (skill `bmad-code-review`): tre layer in parallelo — adversarial generico, cacciatore di edge case, auditor dei criteri di accettazione — ognuno senza il contesto degli altri, e ogni finding riletto sul codice vero prima di assegnargli la gravità. Ventisette rilievi grezzi, ventidue unici dopo la deduplicazione, otto scartati come rumore.

**Le sei AC reggono nel codice.** L'auditor ha riverificato riga per riga: la 0015 è davvero il testo della 0014 con tre nomi in due punti e nient'altro, la dichiarazione D24 è nelle tre chiavi esatte e senza `cascade`, `list_migrations` risponde quindici col prefisso, la File List è fedele riga per riga (183/44/61/40/179/51/146/37/145 verificati con `wc -l`), `git status` corrisponde all'elenco, e **tutti i grep di perimetro sono veri** — un solo `.from('answers')`, zero `.from('questions')` sotto `clienti/`, nessuna scrittura, nessun `required`, zero esadecimali, zero `any`/`as`, `--sec-prequalifica` solo dentro `globals.css`. Nessun layer ha trovato un difetto che rompa un criterio di accettazione.

Quello che resta è una domanda di perimetro che vale più di tutte le altre messe insieme, due scelte da guardare a schermo, e del lavoro di rifinitura.

- [ ] **[Review][Decision] La schermata si compila, non salva niente, e a schermo non lo dice — mentre lo stesso diff apre il collegamento che ci porta dentro** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx:34 con assessments-card.tsx:121] — è la decisione 4 e la domanda 2, che Luca ha chiuso il 9 agosto («non salva»), ma la domanda chiusa era *se* salvare, non *se dirlo*. L'unico posto dove sta scritto «quello che si scrive si perde alla ricarica» è questo file, che si legge quando si esegue il Task 7 e mai più. In produzione la card del cliente ora porta un collegamento vivo verso una schermata che accetta ventiquattro campi e li getta a ogni ricarica, con un'interfaccia indistinguibile da quella della scheda cliente, che invece salva da sola. `AGENTS.md` e `kb-0.md` §6 mettono «il lavoro dell'utente non si perde mai» fra le regole non negoziabili, e `globals.css` ha già `.warn-box` («avviso, non errore… non impedisce niente»), che è esattamente il componente per dirlo. Le strade: **(a)** una `.warn-box` in cima alla schermata che dice che qui ancora non si salva — poche righe, nessuna macchina nuova, e sparisce con la 3.3; **(b)** non rilasciare il collegamento della card finché la 3.3 non salva, cioè togliere l'unica riga di `assessments-card.tsx` e riverificare la schermata da un indirizzo scritto a mano; **(c)** accettare com'è, perché la 3.3 è la prossima e la finestra dura una story. **Risolta da Luca il 9 agosto 2026: l'avviso a schermo (a).** La schermata dice da sé che ancora non salva, con `.warn-box`, e la riga sparisce con la 3.3.
- [x] **[Review][Decision] `answers` copia il titolo del blocco e non la sua identità: due blocchi omonimi **adiacenti** diventano una card sola, per sempre** [src/lib/answer-groups.ts:30-44 con supabase/migrations/0015_answer_question_copy.sql] — trovato da due layer. La 0015 aggiunge tre copie e **non** `block_id`, quindi l'unica identità che una risposta ha del suo blocco è il titolo. `groupAnswersByBlock` raggruppa per corse: due blocchi *diversi* con lo stesso titolo e adiacenti nell'ordine di `position` si fondono in un gruppo solo, che è esattamente il guasto che la funzione esiste per impedire, chiuso solo nel caso non adiacente — e il test copre solo quello. Il sintomo inverso arriva dalla stessa radice: una domanda nata dentro la finestra di rinumerazione fallita (`database.md` §8) congela una `position` fuori posto e apre in coda un **secondo** gruppo con lo stesso titolo. Niente lo segnala e niente rinumera mai una scheda: la deriva è definitiva. Le strade: **(a)** una 0016 che aggiunge `block_id` copiato e un raggruppamento per identità invece che per titolo — costa zero adesso, `answers` è ancora vuota, ed è la stessa finestra che ha reso la 0015 gratuita; **(b)** lasciare com'è, perché richiede che Luca scriva due volte lo stesso titolo su due blocchi vicini e il danno è cosmetico — le domande restano tutte, nel loro ordine, col loro testo; **(c)** lasciare com'è e annotarlo in `deferred-work.md` con il suo punto di ripresa. **Risolta da Luca il 9 agosto 2026: si rimanda (c).** Motivo: `kb-0.md` §4 vieta i campi «utili un giorno», e `block_id` non serve a niente che si renda oggi; il danno è cosmetico e richiede due blocchi vicini con lo stesso titolo. Vedi `deferred-work.md`.
- [x] **[Review][Decision] `.page-header__lead` allinea la data al ritorno indietro, non al titolo: lo scostamento 1 è dichiarato a metà** [src/app/globals.css:207-216 con schede/[assessmentId]/page.tsx:152-162] — `.page-header` è `align-items: baseline`, e la linea di base di un contenitore flex in colonna è quella del suo **primo** figlio, cioè `← nome cliente`. Misurato sulla riproduzione statica dall'auditor: `back.top = 33`, `date.top = 32`, `title.top = 85` — la data sta sulla riga del ritorno indietro, mentre il Task 3 dice «`<h1>Prequalifica</h1>`, **e accanto** la data della call». Lo scostamento 1 delle Completion Notes racconta solo il titolo tornato a filo sinistro e non nomina l'effetto sulla data. Non è un difetto in sé — la data in alto a destra è un modo normale di disporla — ed è una cosa che si decide guardandola: **(a)** va bene così e lo scostamento si riscrive per intero; **(b)** la data torna accanto al titolo, che è una riga di CSS in più. **Risolta da Luca il 9 agosto 2026: va bene così (a).** Il CSS non si tocca; si riscrive lo scostamento 1 perché racconti anche l'effetto sulla data.

- [x] **[Review][Patch] La schermata dice da sé che ancora non salva** [src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx] — dalla decisione 1. Una `.warn-box` in cima al contenuto, sopra il primo blocco, con la stessa voce dell'interfaccia: nessun punto esclamativo, nessuna scusa, e dice cosa succede invece di cosa è successo. È un avviso e non un errore, quindi non usa `--bad` e non impedisce niente (`design-system.md` §2 e `kb-0.md` §6). Non si rende nello stato d'errore, dove il messaggio giusto è già un altro. La riga sparisce con la Story 3.3, insieme all'arrivo del salvataggio: va scritto nel commento, altrimenti resterà anche quando sarà una bugia.
- [x] **[Review][Patch] Lo scostamento 1 si riscrive: `.page-header__lead` sposta anche la data** [docs/bmad/implementazione/3-2-compilare-le-risposte-durante-la-call.md] — dalla decisione 3. Il testo attuale racconta solo il titolo tornato a filo sinistro; va detto che la linea di base del contenitore in colonna è quella del **primo** figlio, quindi la data si allinea al ritorno indietro e non al titolo, e che è stato guardato e accettato.
- [x] **[Review][Patch] Il collegamento nuovo sulla data è un bersaglio da 18px e non sembra un collegamento** [src/app/(app)/clienti/[id]/assessments-card.tsx:121] — trovato da due layer. `.data` è 13/18 senza padding né `min-height`, `a` porta `color: inherit; text-decoration: none`, e `.assessment` non ha nessun `:hover`: il `<Link>` è visivamente identico allo `<span>` che ha sostituito ed è alto meno della metà dei 44px di `design-system.md` §8. È l'**unica** via d'accesso alla schermata di questa story, e su tablet — il caso che NFR4 e AC6 nominano — non c'è nemmeno il cursore a rivelarlo. Il progetto ha già la ricetta esatta per lo stesso problema: `.back-link { display: inline-flex; align-items: center; min-height: 44px }`, scritta con lo stesso motivo. L'annotazione a `deferred-work.md` su `.btn` copre la schermata di compilazione, non il bersaglio sotto-soglia che questo diff introduce sulla card del cliente. La misura è meccanica e precedentata; se serva anche un'affordance visiva (sottolineatura, colore, hover di riga) è una domanda in più da guardare a schermo.
- [x] **[Review][Patch] Le istruzioni di annullamento della 0015 riescono a metà invece di fallire, che è il contrario di quello che D24 pretende** [supabase/migrations/0015_answer_question_copy.sql:3-7] — l'ordine dichiarato è «tre `drop column`, poi si riesegue la 0014». Ma un `drop column` su una colonna citata **solo dentro un corpo plpgsql** non fallisce: i corpi delle funzioni non sono tracciati come dipendenze. Ci si può quindi fermare dopo il primo passo — per un'interruzione, o perché il primo non ha protestato e il secondo sembra facoltativo — e restare con lo schema tornato indietro e `open_assessment` ancora lì che compila: il primo `Apri scheda` durante una call fallisce con `column "answer_type" of relation "answers" does not exist`. `database.md` §7 dice alla lettera «si preferisce un annullamento che fallisce rumorosamente a uno che riesce e danneggia», ed è il motivo per cui la stessa sezione vieta `cascade`. L'ordine sicuro è l'inverso: prima la `create or replace` della 0014, poi i tre `drop`. Nota nella stessa riga: «poi si riesegue per intero 0014_open_assessment_total.sql» è una descrizione, e §7 chiede SQL eseguibile — `migrations.test.ts` verifica che la chiave non sia vuota, non che sia eseguibile.
- [x] **[Review][Patch] L'annotazione a `deferred-work.md` su `.btn` afferma il falso: negli stati d'errore la schermata **ha** un pulsante** [docs/bmad/implementazione/deferred-work.md:7] — l'annotazione dice «quella schermata non ha nessun pulsante — nessuna azione primaria, nessuna freccia, nessun `Modifica`. **È l'unica schermata del progetto di cui questo sia vero**». Ma `page.tsx` rende `ErrorState` in due rami (riga 41 e riga 111) e `components/error-state.tsx:11` rende `<Link className="btn btn--secondary">Riprova</Link>`, cioè un `.btn` a 40px. L'affermazione è vera nello stato pieno e in quello vuoto, falsa negli altri due — ed è scritta nel documento che esiste apposta per chi chiuderà la voce dei 40px. In questo progetto le caselle non si spuntano se non sono vere, e vale anche per le annotazioni.
- [x] **[Review][Patch] `control` calcola un valore `'scelta'` che la resa non legge mai: due sorgenti per la stessa decisione** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx:58-65 contro :85-101] — la derivazione produce `'numero' | 'scelta' | 'breve' | 'lungo'`, ma il JSX testa `control === 'breve'`, poi `control === 'numero'`, e poi **ri-deriva** con `choices !== null`. Il ramo `'scelta'` è irraggiungibile e le due decisioni restano allineate solo per l'ordine dei ternari. Il giorno che si aggiunge un tipo — la 3.3, o un `data` domani — `control` dice una cosa e la resa ne disegna un'altra, `tsc` non ha niente da dire e nessun test tocca questo file. La forma attuale serve al restringimento di tipo su `choices`, quindi la correzione non è scambiare i due rami: è togliere `'scelta'` dall'unione, che nessuno legge.
- [x] **[Review][Patch] `ChoiceField` sta nello stesso file di `AnswerField` e ridichiara a mano la forma di `shared`** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx:39-46 e :110-124] — due difetti con la stessa correzione. **Un componente per file** è `kb-0.md` §2 e le Project Structure Notes di questa story, e verificato su tutti i `.tsx` tracciati: nessun altro file di componente del progetto ne contiene due — il precedente esiste solo dentro i `page.tsx`, che è un caso diverso. E le quattro chiavi di `shared` sono scritte due volte: `shared` è una variabile, quindi TypeScript non controlla le proprietà in eccesso e le due forme possono divergere in silenzio. Il giorno che la 3.3 aggiunge `onBlur` per il salvataggio all'uscita, il tipo di `ChoiceField` resta indietro e il salvataggio sparisce **solo** dalle domande a scelta singola — una su ventiquattro, cioè il difetto più difficile da vedere. `choice-field.tsx` con un tipo esportato chiude tutti e due.
- [x] **[Review][Patch] `overflow: hidden` più `resize: none` rendono irrecuperabile qualsiasi cedimento della crescita automatica** [src/app/globals.css:1017-1020] — l'altezza della cella la detta la copia in `::after`; il `textarea` non ha nessuna altezza legata al proprio contenuto. Se le due scatole si disallineano — un `letter-spacing` ereditato introdotto altrove, uno zoom del testo, un ripiego di font con metriche diverse su una sola delle due — il campo taglia il testo **senza barra di scorrimento e senza maniglia**: quello che è stato scritto esiste nel `value` e non è né leggibile né raggiungibile, e niente lo dice. Il commento sopra rifiuta `field-sizing: content` proprio perché «senza quella verifica AC3 cadrebbe in silenzio»: il meccanismo scelto cade in silenzio pure lui, e peggio. `overflow: auto` costa una parola, non cambia niente quando la misura è giusta — misurata: `scrollHeight === clientHeight` — e degrada verso lo scorrimento invece che verso la perdita. Da rimisurare dopo il cambio.
- [x] **[Review][Patch] `.meta` non ha `overflow-wrap`: un token lunghissimo nell'aiuto fa scorrere la pagina di lato a 375px** [src/app/globals.css:297-302 con schede/[assessmentId]/answer-field.tsx:79-82] — `.answer__text` porta `overflow-wrap: anywhere` con il commento che dice esattamente perché («a 375px un token senza spazi più largo dello spazio dentro la card farebbe scorrere la pagina di lato»), e il fratello sottostante non ce l'ha. `validateHelpText` collassa gli spazi e taglia a 300 caratteri ma non spezza un token unico, e `answers.help_text` è una copia senza nessun controllo: un URL o un codice lungo dentro un «cosa serve capire» esce dalla card. `.card` non ha `overflow: hidden`. È la stessa AC6 e lo stesso NFR4 dell'altra riga. `.meta` è una classe globale, quindi la correzione va nell'ambito di `.answer` e non su `.meta`.
- [x] **[Review][Patch] La logica che decide con quale controllo si rende una risposta storica non ha nessun test** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx:50-65 e :130] — la story ha estratto in un file puro il raggruppamento, con cinque casi, e ha lasciato dentro un componente client le due decisioni che rompendosi producono un **dato sbagliato**: la mappatura `answer_type → controllo`, coi suoi due ripieghi (scelta singola senza opzioni → testo breve, tipo ignoto → testo lungo), e l'opzione orfana, che esiste per ammissione del suo commento perché senza «React seleziona la prima e cambia il significato della risposta senza dire niente». `kb-0.md` §7 assegna i test automatici esattamente a «la logica che, se si rompe, produce dati sbagliati». Riordinando la scala dei ternari una `scelta_singola` comincerebbe a rendersi come campo libero e `npm test` resterebbe verde su 164. Le due funzioni sono pure e stanno in `src/lib/` come `answer-groups.ts`; non è un test sui componenti, che la story esclude a ragione.
- [x] **[Review][Patch] `loading.tsx` scosta dal Task 5 e lo scostamento non è dichiarato** [src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx:19-27] — il Task 5 chiede «una barra stretta per il ritorno, **una per il titolo**, e una sola card col solo titolo». Il file rende il titolo **vero** (`<h1>Prequalifica</h1>`) e aggiunge un **terzo** scheletro per la data dentro `.page-header__actions`, che il task non elencava. La scelta è difendibile e ha due precedenti nel progetto — `clienti/loading.tsx` e `questionario/loading.tsx` rendono il titolo vero quando è noto prima della lettura — ma le Completion Notes dicono «due scostamenti dai task, **entrambi dichiarati**», e questo è il terzo. Si dichiara, non si cambia.
- [x] **[Review][Patch] La voce a ledger sul `metadata` non nomina la rotta nuova** [docs/bmad/implementazione/deferred-work.md:10] — la voce elenca `clienti/[id]/page.tsx` e `clienti/nuovo/page.tsx`; la rotta di questa story non c'è. Il perimetro dichiara «nessun `metadata` sulle rotte: è la voce a ledger della 1.1, che vale per tutte», e va bene — ma chi chiuderà la voce leggerà l'elenco, non il perimetro. È la schermata su cui si passa più tempo di tutte, quindi quella che finisce in una scheda del browser lasciata aperta: due schede dello stesso cliente danno due titoli «Registro». Cinque parole nell'elenco.

- [x] **[Review][Defer] `answers` copia il titolo del blocco e non la sua identità** [src/lib/answer-groups.ts:30-44] — rimandato per decisione di Luca del 9 agosto 2026. Motivo in una riga: `kb-0.md` §4 vieta i campi «utili un giorno», e `block_id` non serve a niente che si renda oggi. Vedi `deferred-work.md`.
- [x] **[Review][Defer] Un `content` degenere nella scelta singola: soli spazi genera un'opzione invisibile, una stringa vuota fra le opzioni duplica «Nessuna risposta»** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx:130, :136-141] — rimandato alla Story 3.3. Vedi `deferred-work.md`.

**Scartato come rumore (8).**

1. **Lo scheletro riserva una sola card vuota per una pagina che ne rende nove.** L'osservazione è giusta in astratto — `design-system.md` §6 chiede «scheletri della forma reale del contenuto» — ma la story la affronta di petto e decide il contrario con un motivo che regge: quanti blocchi ci siano, quanto sia lunga una domanda e se il campo sia alto 44 o 98 dipendono dai dati, e riservarli farebbe *saltare* la pagina invece di togliere il salto. È la stessa regola già applicata due volte in `clienti/[id]/loading.tsx`. Disaccordo di design su una scelta dichiarata e precedentata, non un difetto.
2. **`add column … not null` senza default fallisce dove `answers` non è vuota.** Segnalato da due layer. È la decisione centrale del Task 1, dichiarata nel file di migrazione, nella story e in `database.md`: la migrazione è già applicata, e la finestra in cui costava zero era esattamente questa.
3. **`assessment.clients` letto senza guardia.** Irraggiungibile oggi: `client_id` è `not null`, il tipo generato dà l'innesto non nullabile, e la story ha *provato* la forma con una sonda `never` prima di togliere il ripiego. Rimettere un `?.` significherebbe rimettere il ramo morto che la revisione della 3.1 aveva insegnato a togliere. Il caso arriverebbe solo con proprietari diversi fra scheda e cliente, cioè con D9, che non esiste.
4. **`block_title` vuoto → intestazione di card bianca.** `question_blocks.title` ha il `check` non-vuoto dalla 0008 e `answers` copia da lì: nessun blocco vivo può portarlo. Il ripiego servirebbe solo a una riga scritta a mano in SQL.
5. **`database.md` §8 dice «8 blocchi e 23 domande» mentre il database ne ha 9 e 24.** §8 descrive quello che crea `seed.sql`, non lo stato vivo, e il seed crea davvero 8 e 23. Il nono blocco è il residuo `prova` della sessione della 3.1, che la story dichiara in testa e decide di non ripulire. Il numero non è stantio: descrive un'altra cosa.
6. **Le annotazioni in `deferred-work.md` sono cinque e non quattro.** La quinta — la correzione alla voce sulla `position` duplicata — è corretta nel merito e la File List la dichiara come «cinque annotazioni». Non è uno scostamento sostanziale.
7. **La casella «tutti i file toccati sotto le 200 righe» è spuntata mentre `globals.css` è a 1117.** La File List lo dichiara esplicitamente e nella riga giusta: «tutti i file **di codice**… `globals.css` è il foglio unico del progetto ed era già oltre prima di questa story».
8. **`database.md` §3 riceve due periodi dove il task ne chiedeva uno.** Il capoverso aggiunto è un blocco solo e non ripete materiale scritto altrove, che era il difetto vero corretto nella revisione della 3.1. Contare i punti fermi non è la stessa cosa che contare i racconti.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository (`918880f`) e sul progetto Supabase il 9 agosto 2026.

**Lo stato del database, contato il 9 agosto 2026:** 1 questionario attivo a `version` 1, **9 blocchi**, **24 domande tutte attive** con posizioni 1..24, **3 clienti**, **1 persona**, `assessments` e `answers` **vuote**. Quattordici migrazioni a registro, tutte col prefisso. **155 test verdi.**

I numeri sono cambiati dalla 3.1 perché la verifica di sessione ha lasciato dietro di sé un blocco `prova` con una domanda dentro (posizione 24, testo di quattro caratteri) e un cliente in più, mentre le schede di prova sono state tolte. Non è un problema di questa story e **non si ripulisce da qui**: si scrive perché chi ricontasse troverebbe 24 e non 23 e penserebbe che uno dei due conti è sbagliato.

**I quattro tipi di risposta, contati:** venti `testo_lungo`, tre `testo_breve`, una `scelta_singola` con quattro opzioni (posizione 10, blocco «Dove si rompe»), **zero `numero`**. Due domande hanno l'aiuto vuoto (posizioni 22 e 23). La schermata va quindi provata su tre tipi su quattro con i dati veri, e il quarto si provoca aggiungendo una domanda dall'interfaccia — cosa che l'Epic 2 rende possibile senza un rilascio, ed è il primo momento in cui quella capacità serve davvero.

**`answers` è vuota, ed è la finestra in cui la 0015 costa zero.** Con righe dentro, `alter table … add column answer_type text not null` fallirebbe e servirebbe un default, cioè un valore inventato indistinguibile da uno vero.

**La funzione `open_assessment` è già stata scritta due volte e revisionata una.** La 0013 la crea, la 0014 la riscrive per la corsa su `total_questions` e per il fuso. La 0015 la riscrive una terza volta: si parte **dal testo della 0014**, si aggiungono tre nomi in due punti, e non si tocca nient'altro. Il commento in testa alla 0014 spiega perché ogni riga è com'è, e vale ancora.

**Le macchine dell'interfaccia ci sono quasi tutte.** `.input`, `.input--long`, `.select`, `.input:focus`, `.card`, `.card__header`, `.card__title`, `.meta`, `.data`, `.back-link`, `.page-header`, `.page-title`, `.page-header__actions`, `.empty`, `.error-box`, `.skeleton` esistono; `ErrorState` esiste; `formatCallDate` esiste; `isUuid` esiste. **Quello che manca è l'elenco delle risposte e la crescita del campo lungo**, e sono le quattro regole del Task 4.

**Quello che esiste e qui non si usa.** `useEditableField` e `SaveIndicator` sono già scritti, provati e in uso sulla scheda cliente: sono la Story 3.3, e montarli qui vorrebbe dire farla adesso. `useWrite` è per i controlli che non sono campi di testo, e qui non c'è niente da scrivere.

**Il commento di `questionario/page.tsx:25-27` è ancora la specifica di questa story**, per la seconda volta: «È il contrario di quello che farà la schermata di compilazione». Il filtro sulle attive lo fa la 0014 quando la scheda nasce; qui non c'è nessun filtro da scrivere, perché `answers` contiene già solo quello che era attivo quel giorno.

### Cosa cambia questa story, file per file

```
supabase/migrations/0015_answer_question_copy.sql                  NUOVO — tre colonne e la funzione (~70)
src/lib/answer-groups.ts                                          NUOVO — groupAnswersByBlock (~35)
src/lib/answer-groups.test.ts                                     NUOVO — i cinque casi
src/lib/types.ts                                                  MODIFICA — AnswerRow e AnswerDetail
src/lib/database.types.ts                                         MODIFICA — rigenerato: answers ha tre colonne
src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx         NUOVO — due letture, quattro stati (~150)
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-blocks.tsx NUOVO — una card per blocco (~50)
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx NUOVO — 'use client', i quattro controlli (~110)
src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx      NUOVO — lo scheletro (~25)
src/app/(app)/clienti/[id]/assessments-card.tsx                   MODIFICA — la data diventa un collegamento
src/app/globals.css                                               MODIFICA — .answers, .answer, .answer__text, .answer__grow
docs/database.md                                                  MODIFICA — §3 le tre colonne, §7 l'elenco
docs/prd-v1.md                                                    MODIFICA — §3 la tabella Risposta
docs/bmad/implementazione/deferred-work.md                        MODIFICA — quattro annotazioni
```

**Non si aprono:** tutto `questionario/`, `assessment-actions.ts`, `people-card.tsx`, `new-assessment-form.tsx`, `client-card.tsx`, `client-field-form.tsx`, `client-tags-form.tsx`, `actions.ts`, `people-actions.ts`, `person-edit-actions.ts`, `use-write.ts`, `use-editable-field.ts`, `save-indicator.tsx`, `format-date.ts`, `last-activity.ts`, `nav.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`, `seed.sql`, le migrazioni 0001-0014. Nessuna dipendenza nuova.

**`src/lib/types.ts` si apre**, e stavolta è dichiarato in anticipo: `AnswerRow` e il `Pick` che la schermata legge stanno lì come tutti gli altri tipi di riga. Alla 3.1 quel file è stato toccato senza essere nominato, ed è finito in revisione.

### Le quattro decisioni di questa story

**1. Le copie dentro `answers`, non l'innesto su `questions`.** È la decisione che regge tutto il resto ed è la domanda 1. Il motivo non è la comodità di una lettura sola: è che senza le copie una scheda vecchia si rende con il questionario di oggi, e una domanda che ha cambiato tipo rende illeggibile e non più correggibile la risposta che aveva raccolto. `database.md` §3 chiama «la scelta centrale dello schema» il fatto che la risposta conservi una copia della domanda; questa story scopre che la copia era a metà, e la completa nell'unico momento in cui completarla non costa niente — con la tabella vuota.

**2. La rotta è annidata sotto il cliente.** `/clienti/[id]/schede/[assessmentId]`, non `/schede/[id]`. Tre ragioni, in ordine di peso: la navigazione accende `Clienti` da sola sul prefisso (`nav.tsx:33`) e una rotta di primo livello lascerebbe la barra senza nessuna voce accesa, cosa che a schermo si legge come un difetto; l'appartenenza della scheda al cliente diventa un `.eq` verificabile, quindi un indirizzo cucito a mano dà 404 invece di una pagina che mostra il contesto sbagliato; e il ritorno indietro ha il suo bersaglio nel parametro, senza nessuna lettura in più. Il prezzo è un indirizzo più lungo, che su una schermata dove si sta un'ora non conta niente.

**3. Il tipo di controllo si sceglie dalla copia, e per un tipo ignoto si ripiega sul testo lungo.** Non si fa cadere la pagina e non si nasconde il campo: un tipo fuori dai quattro è un dato strano, non un guasto, e il campo di testo lungo mostra per intero quello che c'è e lascia correggerlo. È il precedente già scritto due volte nel progetto — `answerTypeLabel` rende grezzo, `StatusPill` gestisce lo stato ignoto — e vale ancora di più su una copia storica, che per definizione può portare un vocabolario che il presente non conosce più.

**4. La schermata non salva, e non lo finge.** Nessun indicatore, nessun `Salva`, nessuna spia: se non si salva, non c'è niente da dire, e mostrare un indicatore fermo su «Salvato» sarebbe la bugia peggiore che questo prodotto possa raccontare. Il costo è che la story consegna una schermata su cui non si può lavorare per davvero, e la finestra dura una story. È la domanda 2, ed è l'unica cosa di questo file che potrebbe cambiare il perimetro in modo sostanziale.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Raggruppare i blocchi con una mappa `titolo → risposte` | Due blocchi omonimi si fondono e l'ordine dell'intervista cambia | Corse consecutive, in `groupAnswersByBlock`, col suo test |
| Usare il titolo del blocco come `key` di React | Due blocchi omonimi diventano uno solo, senza nessun errore | La `key` è l'`id` della prima risposta del gruppo |
| Un `<select>` il cui `value` non è fra le `<option>` | React seleziona la prima: la risposta si riscrive da sola | Un `content` fuori elenco si rende come opzione in coda |
| Ordinare le risposte per la sola `position` | `position` non è unica in `answers`: ordine indefinito a parità | `.order('position').order('id')` |
| Risalire a `questions` per tipo, opzioni o aiuto | Una scheda vecchia si rende col questionario di oggi | Le tre copie dentro `answers` (0015) |
| `alter table … add column … not null` dopo che esistono schede | La migrazione fallisce, oppure serve un default inventato | Si applica adesso, con `answers` vuota, e il file lo dichiara |
| Riscrivere `open_assessment` da capo invece di partire dalla 0014 | Regressione silenziosa su una funzione già revisionata | Si copia il testo della 0014 e si aggiungono tre nomi |
| Aggiungere un `check` su `answers.answer_type` | Due insiemi da allineare a mano: al primo scarto la scheda non si apre | La copia registra, non valida |
| `type="number"` sul campo numerico | Un contenuto non numerico sparisce prima di arrivare al server | `type="text"` con `inputMode="numeric"` |
| Toccare `.input--long` per farlo crescere | Cambia anche la scheda cliente, che è fuori perimetro | Un involucro nuovo, `.answer__grow` |
| Lasciare `resize: vertical` sul campo che cresce da solo | La maniglia a mano e la crescita automatica si contendono l'altezza | `resize: none` e `overflow: hidden` dentro l'involucro |
| Dimenticare lo spazio dentro `content: attr(data-replica) ' '` | L'ultima riga vuota non conta: il campo non cresce quando si va a capo | Lo spazio c'è, e il commento dice perché |
| Riusare `.question__text` | Due sezioni legate da una classe: una modifica di là rompe di qua | `.answer__text`, con il commento che nomina la gemella |
| Scrivere il campo come `<p>` con un `aria-label` sul controllo | La domanda è l'unica etichetta che quel campo ha | `<label htmlFor>`: AC2 e l'accessibilità nella stessa riga |
| Rendere un `<p>` vuoto quando l'aiuto manca | Un buco sotto la domanda che sembra un difetto | Aiuto assente → nessun elemento |
| Mettere un `required` «tanto è ovvio che si compila» | AC5 è il contrario, e FR18 pure | Nessuna validazione a schermo, verificata col grep |
| Montare `useEditableField` «già che c'era» | La Story 3.3 fatta dentro la 3.2, senza il suo indicatore ancorato | `useState` locale, e basta |
| Mostrare un indicatore di salvataggio fermo | La bugia peggiore che questo prodotto possa dire | Nessun indicatore finché non si salva |
| Loggare `details` dell'errore di lettura | Contiene il testo delle domande e delle risposte | Solo `code` e `message` (kb-0.md §3) |
| Non verificare l'appartenenza della scheda al cliente | Un indirizzo cucito a mano mostra un contesto che non è quello | `.eq('client_id', clientId)` e `notFound()` |
| Adottare `field-sizing: content` senza provarlo | Sui browser che non lo supportano il campo non cresce: AC3 cade in silenzio | Involucro a griglia, e la sostituzione solo dopo verifica |
| Una migrazione senza la dichiarazione D24 | `migrations.test.ts` diventa rosso, ed è il difetto che esiste per trovare | Tre chiavi in testa, nell'ordine, senza `cascade` |

### Contratto visivo

- **Una card per blocco**, in sequenza verticale, con il titolo del blocco a `--t-heading` (`.card__title`) e le domande dentro. È la forma della schermata del questionario, che Luca conosce già: la stessa cosa si dispone allo stesso modo.
- **La domanda a `--t-heading`, l'aiuto a `--t-meta` in `--ink-muted`**, in quest'ordine, sopra il campo. La domanda si legge da lontano, l'aiuto solo se lo si cerca (`design-system.md` §3).
- **Il campo di risposta è l'elemento più curato della schermata** (`design-system.md` §5): fondo `--surface`, bordo `--line`, raggio `--r-md`, padding 12/16, minimo tre righe, e al fuoco bordo `--sec-prequalifica` con alone di 3px nella sua tinta. Tutto questo `.input` e `.input:focus` lo fanno già.
- **Nessun pulsante su questa schermata.** Non c'è azione primaria, perché non c'è azione: il nero resta libero, e UX-DR10 è soddisfatta per assenza.
- **Nessun colore dentro il contenuto** oltre all'alone del fuoco: niente pillole, niente badge, niente verde/ambra/rosso — quei tre significano un esito, e qui non c'è nessun esito (UX-DR2).
- **Le parole nuove a schermo sono poche**: `Prequalifica`, `Nessuna risposta`, `Questa scheda non ha nessuna domanda.`, il messaggio d'errore, e il ritorno `← <nome cliente>`. Tutto il resto della schermata è testo che Luca ha scritto nel questionario. Italiano, frase minuscola, nessun punto esclamativo.
- **Niente animazioni**, niente comparse, niente transizioni fra blocchi. La schermata sta ferma mentre si parla al telefono.

### Perimetro: cosa NON entra in questa story

- **Nessun salvataggio, in nessuna forma**: né automatico, né a comando, né a chiusura di campo. Nessuna Server Action nuova, nessun `revalidatePath`. Story 3.3.
- **Nessun indicatore di salvataggio**: esiste già in `components/`, e resta dov'è. Story 3.3.
- **Nessuna ripresa esplicita né conferma di ripristino**: Story 3.4. Che i campi si rendano col loro `content` è solo lettura, e non è la ripresa che quella story chiede.
- **Nessun verdetto, motivo, condizione, data di verifica, prossimo passo**: Story 3.5. La schermata finisce con l'ultimo blocco.
- **Nessuno stato di compilazione, nessun `Chiudi la scheda`**: Story 3.6.
- **Nessun contatore, nessuna barra di avanzamento**, né qui né nella card del cliente: Story 4.1.
- **Nessuna colonna esito nell'elenco, nessuna pillola di verdetto**: Story 4.2.
- **Nessuna esportazione**: Story 4.3.
- **Nessuna voce nuova nella navigazione**: non esiste un elenco delle schede da raggiungere, e la 5.1 è la story della navigazione.
- **Nessuna cancellazione di una scheda o di una risposta**: non esiste e non entra.
- **Nessun `metadata` sulle rotte**: è la voce a ledger della 1.1, che vale per tutte.
- **Nessuna correzione ai quirk del fuoco** (ledger, Story 5.2): se ne emerge uno nuovo si annota.
- **Nessuna ripulitura dei dati di prova** rimasti dalla sessione della 3.1: il blocco `prova` e la sua domanda restano finché Luca non decide.

### Test

Cosa entra: `groupAnswersByBlock`. Non è presentazione — è una trasformazione che, sbagliata, produce una scheda in cui le domande stanno sotto il blocco sbagliato, e il caso che la rompe (due blocchi omonimi) non compare nei dati di oggi e comparirebbe il giorno che Luca scrive due volte lo stesso titolo. È esattamente la logica che kb-0.md §7 chiede di coprire: quella che, rompendosi, non dà nessun errore.

Cosa **non** entra: nessun test che finga Supabase, nessun test sui componenti. Le letture e la resa si provano dove vivono — le prime con le sonde in transazione annullata del Task 7, la seconda a schermo. Un test con un client finto verificherebbe il finto.

`migrations.test.ts` legge da sé il file nuovo e aggiunge i suoi quattro controlli: non va toccato.

### Project Structure Notes

```
supabase/migrations/
└── 0015_answer_question_copy.sql       NUOVO — tre colonne e la funzione riscritta

src/lib/
├── answer-groups.ts                    NUOVO — funzione pura
├── answer-groups.test.ts               NUOVO
├── types.ts                            MODIFICA — AnswerRow, AnswerDetail
└── database.types.ts                   MODIFICA — rigenerato

src/app/(app)/clienti/[id]/
├── assessments-card.tsx                MODIFICA — la data diventa un collegamento
└── schede/[assessmentId]/              NUOVA CARTELLA
    ├── page.tsx                        NUOVO — due letture, quattro stati
    ├── answer-blocks.tsx               NUOVO — Server Component, una card per blocco
    ├── answer-field.tsx                NUOVO — 'use client', i quattro controlli
    └── loading.tsx                     NUOVO — lo scheletro

src/app/globals.css                     MODIFICA — quattro regole nuove
src/app/(app)/questionario/             INVARIATO — non si apre niente
```

Convenzioni vincolanti (kb-0.md §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, un componente per file, nessun file sopra le 200 righe — l'unica eccezione dichiarata resta `edit-question-form.tsx` a 228, e questa story non la apre. I due parametri della rotta hanno nomi **diversi** (`id` e `assessmentId`): due segmenti dinamici con lo stesso nome nella stessa rotta sono un errore di Next, non una scelta di stile.

### Piattaforma in uso, verificata

Ricontata il 9 agosto 2026 su `918880f`: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. **Nessuna dipendenza entra o si aggiorna**: la crescita del campo si fa in dieci righe di CSS, e una libreria per un `textarea` che si allunga sarebbe la dipendenza senza motivo che `AGENTS.md` vieta.

Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, quattordici migrazioni registrate col prefisso.

Due cose da verificare eseguendo, e da scrivere nel Dev Agent Record:

- **Il supporto di `field-sizing: content`** sui browser che Luca usa davvero, se si vuole sostituire l'involucro a griglia con una riga. Non si adotta sulla fiducia: se non è supportato dove serve, AC3 cade senza nessun errore e senza che niente lo dica.
- **Che l'innesto `clients(name)` dentro la `select` su `assessments` risolva senza ambiguità.** `assessments` ha una sola chiave esterna verso `clients`, quindi dovrebbe bastare il nome della tabella; se PostgREST chiedesse il nome del vincolo, si passa a `clients!assessments_client_id_fkey(name)` e lo si dichiara. La forma va vista rispondere, non dedotta.

### Intelligence dai commit e dalla story precedente

Da `918880f` (3.1) e dalla sua revisione, le abitudini che questa story eredita:

- **La verifica è divisa in due**: parte agente (typecheck, build, test, sonde SQL in transazione annullata, sonda senza sessione, grep di perimetro) e sessione di Luca, che è la condizione per `done`.
- **Le caselle non si spuntano se non sono vere.** La revisione della 3.1 ha trovato una casella di perimetro spuntata che affermava il falso: qui la casella corrispondente chiede di dichiarare i file fuori elenco **uno per uno**.
- **Un parametro di funzione nullabile vuole `default null`**, altrimenti i tipi generati mentono. Vale se la 0015 toccasse la firma — non la tocca, ma la regola è a ledger e va ricordata.
- **Una `create or replace` su una funzione già revisionata richiede di riverificare quello che era stato verificato prima.** La 0014 è nata da una revisione; la 0015 la riscrive, e le sonde della 3.1 vanno rieseguite, non date per buone.
- **L'esito delle decisioni strutturali si scrive dove si cerca**, non solo nel file della story: `database.md` §3 e §7, `prd-v1.md` §3.
- **Le domande si chiudono prima di implementare**, e il default è già dentro i task: se Luca conferma, non cambia niente.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 3.2: Compilare le risposte durante la call]
- FR18, NFR4, NFR9, UX-DR7, UX-DR11, UX-DR14: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- Le colonne di `answers` e la ragione delle copie: [Source: docs/database.md#3. Tabelle] e [Source: supabase/migrations/0005_assessments_answers.sql]
- La funzione da cui si parte, con il commento che spiega ogni riga: [Source: supabase/migrations/0014_open_assessment_total.sql]
- Il formato della dichiarazione di reversibilità e il passo su `list_migrations`: [Source: docs/database.md#7. Migrazioni] e [Source: docs/00-contesto-e-decisioni.md#D24]
- La tabella `Risposta` del PRD, da estendere: [Source: docs/prd-v1.md#3. Entità e campi]
- La schermata di compilazione com'era stata descritta: [Source: docs/prd-v1.md#4. Schermate]
- Il campo di risposta, il fuoco e i quattro stati: [Source: docs/design-system.md#5. Componenti] e [Source: docs/design-system.md#6. I quattro stati di ogni schermata]
- La voce dell'interfaccia e il divieto di colore nel contenuto: [Source: docs/design-system.md#7. Voce dell'interfaccia] e [Source: docs/design-system.md#2. Colore]
- Il ripiego su un valore ignoto invece della caduta: [Source: src/lib/answer-types.ts] e [Source: src/components/status-pill.tsx]
- `type="text"` e non `type="number"`, con il suo motivo: [Source: src/app/(app)/clienti/[id]/client-field-form.tsx:111-113]
- L'aiuto reso solo quando c'è: [Source: src/app/(app)/questionario/question-item.tsx:82-84]
- La difesa in resa sulla scelta singola senza opzioni: [Source: src/app/(app)/questionario/question-item.tsx:97-100]
- I criteri d'ordine oltre il primo, e perché `created_at` non basta: [Source: src/app/(app)/questionario/page.tsx:42-54]
- `notFound()` su un parametro che non è un uuid, e i due rami dell'autenticazione: [Source: src/app/(app)/clienti/[id]/page.tsx:23-43]
- Lo scheletro riserva quello che c'è sempre: [Source: src/app/(app)/clienti/[id]/loading.tsx:61-78]
- La riga della scheda senza collegamento, da correggere: [Source: src/app/(app)/clienti/[id]/assessments-card.tsx:23-26]
- Il salvataggio automatico e il suo indicatore, che qui non si montano: [Source: src/lib/use-editable-field.ts] e [Source: src/components/save-indicator.tsx]
- Quando un campo si salva da solo e quando si conferma: [Source: docs/00-contesto-e-decisioni.md#D21]
- Nessuno stato blocca nessuna azione: [Source: docs/00-contesto-e-decisioni.md#D14]
- Story precedente, con le sue lezioni e il suo ledger: [Source: docs/bmad/implementazione/3-1-aprire-una-scheda-di-prequalifica-su-un-cliente.md]
- Le voci rimandate che questa story annota: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca — chiuse il 9 agosto 2026

Quattro, tutte con un default già applicato nei task. **Luca ha confermato tutti e quattro i default il 9 agosto 2026, prima di implementare: i task non cambiano.** Restano scritte con le loro alternative, perché il motivo per cui una strada è stata scartata è la parte che serve fra sei mesi.

1. **Le tre copie dentro `answers`, con una migrazione, o l'innesto su `questions`?** — *risolta: la migrazione.*
   `answers` copia oggi solo testo, blocco e posizione. Per rendere questa schermata servono anche il tipo di risposta, le opzioni e il testo di aiuto, e l'AC4 dice alla lettera «le opzioni salvate **nella copia** della domanda» — una copia che non esiste.
   **Default: la migrazione 0015**, tre colonne su `answers` e `open_assessment` che le riempie. Costa zero adesso, perché la tabella è vuota, e chiude per davvero la promessa di `database.md` §3: una scheda resta leggibile com'era anche se la domanda cambia o sparisce. Senza, una `scelta_singola` diventata `numero` rende una risposta scritta a parole dentro un campo numerico, per sempre.
   Se la risposta è **l'innesto**, il Task 1 cade, i Task 3 e 4 leggono `answers` con `questions(answer_type, options, help_text)` innestato, `question_id` nullo diventa un caso da rendere (campo di testo lungo senza aiuto), e la voce va in `deferred-work.md` con il suo punto di ripresa. La story diventa più corta di un file e la scheda smette di essere autosufficiente.

2. **La schermata di compilazione non salva niente, in questa story?** — *risolta: non salva.*
   Le AC della 3.2 parlano solo di come la schermata è fatta; il salvataggio, l'indicatore e il comando esplicito sono tutte AC della 3.3. Ma `AGENTS.md` dichiara non negoziabile che «il lavoro dell'utente non si perde mai», e questa story consegna una schermata dove si può scrivere e la ricarica porta via tutto.
   **Default: non salva.** Un compito alla volta, e il perimetro è quello che l'epica ha scritto. Il rischio è dichiarato in testa al Task 7: non compilare qui una scheda vera, la finestra dura una story.
   Se la risposta è **che deve salvare**, la 3.2 prende il salvataggio automatico e per campo (`useEditableField` e `SaveIndicator`, già scritti e provati) più l'azione `saveAnswer` con la sua `revalidatePath('/clienti')` — che è la regola lasciata dalla 1.6 e confermata dalla 3.1 —, e alla 3.3 restano **l'indicatore unico ancorato in fondo**, che è una macchina nuova perché oggi l'indicatore è per campo, il comando esplicito e lo stato di errore con `Riprova`. È una divisione legittima quanto l'altra, e va scelta adesso: farla dopo vuol dire scrivere due volte lo stesso componente.

3. **La rotta è `/clienti/[id]/schede/[assessmentId]`?** — *risolta: sì, annidata.*
   **Default: sì, annidata.** La navigazione tiene accesa `Clienti` da sola, l'appartenenza della scheda al cliente diventa verificabile, e il ritorno indietro non costa una lettura. L'alternativa `/schede/[id]` è più corta ma lascia la barra di navigazione senza nessuna voce accesa, perché in questa versione non esiste una sezione «Prequalifica» da raggiungere.

4. **La scelta singola è un `<select>` o un gruppo di scelte?** — *risolta: `<select>`.*
   **Default: `<select>`,** con una prima opzione `Nessuna risposta`. Riusa `.input.select`, che esiste, ed è il controllo nativo che sul tablet si comporta meglio — la stessa ragione già scritta per lo stato del cliente. Un gruppo di scelte si scorrerebbe più in fretta con l'occhio durante una call, ma vuole CSS nuovo, il suo stato di fuoco e i suoi bersagli da 44px, cioè una decisione di design system dentro una story che non ne chiede.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 9 agosto 2026.

### Debug Log References

**Dopo la revisione del 9 agosto 2026: `npm test` da 164 a 171**, +7 dai casi di `answer-control.test.ts`; typecheck e build verdi, la rotta compare nel manifesto. Perimetro rigrepato dopo i patch e invariato: `.from('answers')` **1**, `.from('questions')` sotto `clienti/` **0**, nessun `.insert(`/`.update(`/`.upsert(`/`.rpc(`, `required` **una** volta e dentro il commento che dice che non c'è, zero esadecimali, zero `any`/`as`, `--sec-prequalifica` **0** occorrenze fuori da `globals.css`. Righe: `page.tsx` 193, `answer-field.tsx` 109, `choice-field.tsx` 42, `assessments-card.tsx` 148 — tutti sotto le 200. **La migrazione non è stata riapplicata**: il patch sulla 0015 tocca solo la dichiarazione di reversibilità in testa, che è un commento, e lo schema resta quello già a registro.

**`npm test`: da 155 a 164.** I nove nuovi sono +4 dai controlli che `migrations.test.ts` esegue da sé sulla 0015 (le tre chiavi di seguito, nessuna vuota, sì/no, niente `cascade`) e +5 dai casi di `answer-groups.test.ts`. `npm run typecheck` e `npm run build` passano.

**`list_migrations`: quindici righe, tutte col prefisso, `0015_answer_question_copy` in fondo.** Il nome è stato passato con il prefisso e lo ha conservato, come già la 0009 e la 0013.

**La prova che le tre copie arrivano, in una transazione annullata** (`begin; … rollback;` in una sola chiamata `execute_sql`, eseguita come proprietario con `role` e `request.jwt.claims` impostati a mano: esercita la *meccanica*, non le policy). Chiamata `open_assessment` su un cliente vero, 24 risposte scritte:

- `answer_type` **0 discordanze** con la domanda viva, `options` **0**, `help_text` **0** — comprese le due domande con l'aiuto nullo, che restano nulle invece di diventare stringa vuota, e l'unica `scelta_singola`, che porta le sue **quattro** opzioni nello stesso ordine.
- Le invarianti della 3.1 riverificate nella stessa transazione, perché la 0015 riscrive `open_assessment` per la terza volta: `total_questions` = **24** = numero di righe di `answers` scritte, `content` nullo su **tutte**, `position` copiata verbatim (**0** discordanze), `questionnaire_version` = **1**, `call_date` = oggi nel fuso dichiarato.
- Dopo il `rollback`, riconteggio identico alla partenza: **0 schede, 0 risposte, 24 domande attive, 3 clienti**.

**Sonda senza sessione**, con la sola chiave pubblicabile: `GET …/rest/v1/answers` risponde `[]`; `POST …/rest/v1/rpc/open_assessment` risponde `42501, permission denied for function open_assessment`. È la prova che mancava: la `create or replace` conserva davvero i privilegi, cosa che il commento della 0014 afferma e che nessuno aveva ancora provato.

**Grep di perimetro:** `.from('answers')` **1** (era 0), `.from('questions')` sotto `clienti/` **0**, nessun `.insert(`/`.update(`/`.upsert(`/`.rpc(`, nessun `'use server'`, nessun `revalidatePath` nei file nuovi — **questa story non scrive niente**. `required` compare **una** volta e sta dentro un commento che dice che non c'è (`answer-field.tsx:16`); nessun `aria-required`. Zero esadecimali e zero `any`/`as` nei file nuovi; `--sec-prequalifica` **0 occorrenze** fuori da `globals.css`.

**Misure a schermo, con una riproduzione statica servita in locale** (non ho una sessione per la pagina vera, che è la verifica di Luca):

- **La crescita del campo lungo:** vuoto 98px (tre righe), a dieci righe 266px, **nessuna barra di scorrimento interna**. Tre righe di testo = 98px, le stesse tre più un a capo finale = 122px, identico a quattro righe: è la prova che lo spazio dopo `attr()` porta lavoro e non è un refuso.
- **Il fuoco:** con un clic vero — `element.focus()` da JavaScript non fa corrispondere `:focus` e legge `box-shadow: none`, quindi la prima misura era falsa — bordo `--sec-prequalifica` e alone di 3px nella sua tinta, `outline: none`.
- **A 375px:** nessuno scorrimento laterale (`scrollWidth` = `clientWidth`), niente trabocca, bersagli 44/44/46/98px, il titolo di blocco più lungo va a capo.

**Due file di servizio toccati e rimessi a posto**, e si dichiarano perché sono stati toccati: `.claude/launch.json` ha ospitato per qualche minuto una configurazione `prova-statica` (`git diff` ora vuoto), e una cartella `public/` è stata creata e poi rimossa. La riproduzione statica è finita servita con `sh -c "cd DIR && exec python3 -m http.server"`, perché `file://` rende una fotografia senza CSS, `public/` viene intercettata dal proxy e reindirizzata su `/accedi`, e `python3 -m http.server --directory` fallisce con `PermissionError` su `os.getcwd()`.

**Un difetto mio, trovato rileggendo prima di chiudere e corretto.** La catena dei controlli mandava `scelta_singola` **senza opzioni** al campo di testo **lungo**, mentre il Task 4 prescrive il testo **breve** — e il commento che avevo scritto sotto affermava il contrario di quello che il codice faceva, che è la forma peggiore in cui un difetto può presentarsi. Adesso i due ripieghi passano da una costante `control` che li rende leggibili in un punto solo. Il caso è irraggiungibile coi dati veri, perché `questions_single_choice_has_options` lo vieta su `questions` e `answers` copia da lì; resta la difesa che il task chiede, per una copia storica che potrebbe portare un vocabolario che il presente non conosce più.

### Completion Notes List

**Tre scostamenti dai task. I primi due erano dichiarati; il terzo l'ha trovato la revisione, ed era scritto «due scostamenti, entrambi dichiarati».**

**1. Una regola CSS in più delle quattro dichiarate: `.page-header__lead`, e il bisogno è stato misurato a schermo.** Il Task 4 nomina `.answers`, `.answer`, `.answer__text` e `.answer__grow` (più il `:first-child` e la coppia `> textarea`/`::after`, che il task stesso scrive nel suo frammento). La quinta è nata da un difetto visto a schermo e non previsto: `.page-header` è un `flex` con `justify-content: space-between`, e con **tre** figli diretti — ritorno indietro, titolo, data — il titolo `Prequalifica` finiva centrato, mentre su ogni altra pagina del software è allineato a sinistra sotto il ritorno indietro. `.page-header__lead` raggruppa i primi due in colonna e ripristina la forma comune, in `page.tsx` e in `loading.tsx`. Nessun esadecimale, solo la scala di spaziatura. È esattamente il caso che la voce a ledger della revisione 3.1 chiedeva — `globals.css` si apre **con** il bisogno misurato a schermo, non per abitudine — e la voce è annotata di conseguenza.

**La revisione ha aggiunto la metà che mancava a questo scostamento: `.page-header__lead` sposta anche la data.** `.page-header` è `align-items: baseline`, e la linea di base di un contenitore flex in colonna è quella del suo **primo** figlio, cioè il ritorno indietro: la data si allinea quindi a `← nome cliente` e non a `Prequalifica`, mentre il Task 3 dice «`<h1>Prequalifica</h1>`, **e accanto** la data della call». Misurato sulla riproduzione statica: `back.top = 33`, `date.top = 32`, `title.top = 85`. **Luca l'ha guardato e accettato il 9 agosto 2026**: la data in alto a destra sulla riga del ritorno indietro è una disposizione normale, il CSS non si tocca, e questo capoverso esiste perché lo scostamento fosse raccontato per intero invece che a metà.

**3. `loading.tsx` rende il titolo vero e uno scheletro in più per la data, che il Task 5 non elencava.** Trovato dalla revisione, non dichiarato quando andava dichiarato. Il task chiede «una barra stretta per il ritorno, **una per il titolo**, e una sola card col solo titolo»; il file rende `<h1>Prequalifica</h1>` per intero — si sa prima di aver letto qualsiasi cosa, quindi uno scheletro sopra di lui sarebbe un'attesa finta — e aggiunge un terzo scheletro dentro `.page-header__actions` per la data della call, che invece non si sa. La forma ha due precedenti nel progetto, `clienti/loading.tsx` e `questionario/loading.tsx`, che rendono entrambi il titolo vero quando è noto. Lo scostamento resta com'è: quello che cambia è che adesso è scritto.

**2. `field-sizing: content` non si adotta, e la griglia resta.** Il Task 4 chiede di sostituire l'involucro **solo se** la verifica dice che è supportato ovunque serve. Non l'ho verificato: ho a disposizione un solo motore di resa, e i browser che Luca usa davvero non li ho provati. Dichiarare «supportato» sulla base di un browser solo sarebbe un'ipotesi travestita da verifica (kb-0.md §1). La griglia con la copia invisibile funziona ovunque ed è misurata sopra; la sostituzione resta possibile il giorno che la verifica esista.

**Nessun file fuori dall'elenco di «Cosa cambia questa story».** L'unica differenza fra `git status` e quell'elenco è `docs/kb-0.md`, che risulta modificato ma **non da questa story**: è la riga tolta a mano da §10, già dichiarata nella nota di baseline in testa a questo file. Non l'ho aperta.

**La forma dell'innesto è stata provata, non dedotta.** Su `.select('id, client_id, call_date, clients(name)')` avevo scritto `assessment.clients?.name ?? null` per abitudine. Il tipo generato dice altro: una sonda con `const clientName: never = assessment.clients` risponde `Type '{ name: string; }' is not assignable to type 'never'`, cioè l'innesto su una chiave esterna `not null` non è nullabile. Tolti l'incatenamento opzionale e il ripiego morto; la prop è `string` e non `string | null`. Il ripiego `'Cliente'` resta **solo** nello stato d'errore, dove la lettura non è arrivata e un nome non c'è davvero.

**Il raggruppamento è per corse consecutive e non per mappa**, con i suoi cinque casi: due blocchi omonimi non attigui restano **due** gruppi, l'elenco vuoto dà zero gruppi, e l'ordine ricevuto non si riordina mai. È la prima trappola della tabella, ed è l'unica logica di questa story che, rompendosi, produrrebbe una scheda che si legge male senza sembrare rotta.

**Quello che è andato come previsto.** La 0015 parte dal testo della 0014 e aggiunge **tre nomi in due punti**, l'elenco delle colonne dell'`insert` e il suo `select`; nient'altro cambia, e i due commenti in testa alla 0014 valgono ancora. La pagina ha i quattro stati, i due `isUuid` prima di ogni lettura, il ramo di autenticazione copiato da `[id]/page.tsx`, il log dei soli `code` e `message`, e l'`.eq('client_id', id)` che fa rispondere 404 a un indirizzo cucito a mano. Nessun `<form>`, per la ragione scritta nel task: l'invio implicito con Invio ricaricherebbe la pagina e porterebbe via quello che è stato scritto. AC6 è soddisfatta **senza toccare `.btn`**, perché questa schermata non ha nessun pulsante — è l'unica del progetto di cui sia vero, ed è annotato a ledger.

**La verifica di sessione resta a Luca ed è la condizione per `done`.** Sono le quattordici caselle non spuntate del Task 7. **Avvertenza confermata: quello che si scrive nei campi non si salva**, non c'è nessun `Salva` e nessun indicatore perché non c'è nessun salvataggio, e la ricarica riporta la scheda com'era. Non compilare qui una scheda vera: il salvataggio arriva con la Story 3.3.

### File List

```
supabase/migrations/0015_answer_question_copy.sql              NUOVO   tre colonne e open_assessment
                                                                      riscritta dal testo della 0014 (196
                                                                      dopo la revisione: l'ordine di
                                                                      annullamento e il suo perché)
src/lib/answer-groups.ts                                      NUOVO   groupAnswersByBlock, per corse (44)
src/lib/answer-groups.test.ts                                 NUOVO   cinque casi (61)
src/lib/answer-control.ts                                     NUOVO   dalla revisione: answerControl e
                                                                      orphanOption, puri (53)
src/lib/answer-control.test.ts                                NUOVO   dalla revisione: sette casi (53)
src/lib/types.ts                                              MODIF.  AnswerRow e AnswerDetail (40)
src/lib/database.types.ts                                     MODIF.  rigenerato: answers ha tre colonne
src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx     NUOVO   due letture, quattro stati, e
                                                                      dalla revisione l'avviso che qui
                                                                      ancora non si salva (193)
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-blocks.tsx
                                                              NUOVO   una card per blocco (51)
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx
                                                              NUOVO   'use client', i quattro controlli;
                                                                      dalla revisione il controllo si
                                                                      sceglie in src/lib (109)
src/app/(app)/clienti/[id]/schede/[assessmentId]/choice-field.tsx
                                                              NUOVO   dalla revisione: un componente per
                                                                      file, kb-0.md §2 (42)
src/app/(app)/clienti/[id]/schede/[assessmentId]/loading.tsx  NUOVO   lo scheletro (37)
src/app/(app)/clienti/[id]/assessments-card.tsx               MODIF.  la data diventa un collegamento;
                                                                      dalla revisione, da 44px (148)
src/app/globals.css                                           MODIF.  .answers, .answer, .answer__text,
                                                                      .answer__grow — più .page-header__lead,
                                                                      v. scostamento 1; dalla revisione
                                                                      .assessment__link, .answer__help e
                                                                      `overflow: auto` (1015 → 1117 → 1155,
                                                                      dove l'ultimo salto comprende anche
                                                                      la revisione dei token D26, che è
                                                                      lavoro di Luca e non di questa story)
docs/database.md                                              MODIF.  §3 le tre colonne, §7 l'elenco
docs/prd-v1.md                                                MODIF.  §3 la tabella Risposta
docs/bmad/implementazione/deferred-work.md                    MODIF.  cinque annotazioni, nessuna voce nuova
docs/bmad/implementazione/sprint-status.yaml                  MODIF.  scrittura di metodo
docs/bmad/implementazione/3-2-…-durante-la-call.md            MODIF.  questo file
```

Tutti i file di codice toccati stanno sotto le 200 righe; il più lungo è `page.tsx` a 179. `globals.css` è il foglio unico del progetto ed era già oltre prima di questa story.

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 9 agosto 2026 | 0.1 | Story creata | Claude Opus 5, skill `bmad-create-story` |
| 9 agosto 2026 | 0.2 | Le quattro domande chiuse prima di implementare: Luca conferma tutti e quattro i default — la migrazione invece dell'innesto, nessun salvataggio in questa story, rotta annidata, `<select>` per la scelta singola. I task non cambiano. | Luca |
| 9 agosto 2026 | 1.1 | Revisione applicata (skill `bmad-code-review`). Tre decisioni chiuse da Luca: l'avviso a schermo che qui ancora non si salva, `block_id` rimandato con il suo motivo, la data allineata al ritorno indietro accettata. Dodici patch applicati: bersaglio da 44px sul collegamento della data, ordine di annullamento della 0015 invertito, `answer-control.ts` estratto coi suoi sette test, `ChoiceField` in un file proprio, `overflow: auto` sul campo che cresce, `.answer__help`, e quattro correzioni documentali. `npm test` da 164 a **171**, typecheck e build verdi. Restano le quattordici caselle di sessione del Task 7, più due voci nuove. Status → in-progress. | Claude Opus 5, skill `bmad-code-review` |
| 9 agosto 2026 | 1.0 | Story implementata. Migrazione 0015 applicata (quindici a registro, tutte col prefisso), le tre copie provate in transazione annullata, `npm test` da 155 a 164, typecheck e build verdi. Due scostamenti dichiarati: `.page-header__lead` in più, misurata a schermo; `field-sizing: content` non adottato per verifica mancante. Restano le quattordici caselle di sessione del Task 7. Status → review. | Claude Opus 5, skill `bmad-dev-story` |
