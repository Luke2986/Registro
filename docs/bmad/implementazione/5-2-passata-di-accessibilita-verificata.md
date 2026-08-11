---
baseline_commit: d523a4f
---

# Story 5.2: Passata di accessibilità verificata

Status: done

Epic: 5 — Rifinitura dell'interfaccia
Data di creazione: 11 agosto 2026

> **Baseline.** La Story 5.1 è implementata e revisionata, non ancora chiusa dalla verifica di sessione: sul working tree stanno le sue modifiche a `layout.tsx`, `nav.tsx`, `globals.css`, `design-system.md` e `deferred-work.md`, più i tre file nuovi `nav-icons.tsx`, `nav-actions.ts`, `sidebar-toggle.tsx`. Il commit di partenza per questa story è `d523a4f` (chiusura della 4.3), e l'implementazione della 5.2 parte quando la 5.1 sarà chiusa con la sua verifica di sessione — non prima. Sedici migrazioni a registro (0001–0016), 267 test verdi al giro della 5.1.
>
> **Perché questa story esiste, e va detto qui perché è la sola dell'Epic 5 la cui portata sembra vaga.** UX-DR14, UX-DR15 e UX-DR16 valgono su tutte le schermate e non appartengono a nessuna funzionalità in particolare. Se fossero rimasti dentro l'Epic 1 sarebbero spariti dietro la fretta di rendere l'elenco clienti navigabile; se fossero rimasti dentro le epic funzionali sarebbero comparsi in cinque story a metà, senza numeri di misura, con le decisioni prese da persone diverse in giorni diversi. La 5.2 è l'unica passata che li guarda insieme, misurando invece di giudicare, e chiude in un colpo il debito accumulato da undici story che l'hanno rimandato con nome e cognome («da chiudere con la Story 5.2»).
>
> **Cosa la 5.2 non è.** Non è una passata di forma su tutte le schermate — quella non esiste. È la passata di **accessibilità**: contrasto verificato, focus visibile, etichette vere, movimento rispettoso, colore non solo. I lavori che accompagnano gli AC — bersagli tattili a 44, `aria-busy` sui pulsanti che disabilitano, zona live singola, `SignOutButton` che rientra nella sidebar richiusa — non sono estensioni dell'AC, sono le voci del ledger che il ledger stesso ha assegnato qui perché stanno nella stessa passata. Fuori restano tutte le voci di *forma pura* — un titolo che si sovrappone a 375, uno scheletro asimmetrico, un `.main { min-width: 0 }` non misurato su una schermata — che nessun AC di questa story chiede.
>
> **Cosa questa story chiude, e chi la trova qui non deve credere di dover cercare altrove.** Sedici voci a ledger si chiudono con questa story, la maggior parte con una riga di CSS e la sua misura: `.btn` a 40 (Storia 1.1 riga 7), focus in `--sec-prequalifica` di ripiego (Storia 1.2), `.error-box` e `.warn-box` a colore pieno su tinta (Storia 3.5 riga 156), il fuoco che cade sul body durante `pending` (Storia 2.2 riga 84 e le sue sorelle 2.3–2.6 e 5.1), i nomi accessibili duplicati (Storia 2.4 riga 95), il campo opzioni non annunciato (Storia 2.4 riga 97), il toggle a 36×36 (Storia 5.1 riga 199), l'outline in `--sec-clienti-tint` (Storia 5.1 riga 200), `SignOutButton` che sfora la sidebar richiusa (Storia 5.1 riga 204), `aria-busy` sul toggle (Storia 5.1 riga 206), la zona `role="status"` che annuncia due volte per pausa (Storia 3.3 riga 139), gli errori dei pulsanti `useWrite` che restano appesi (Storia 3.6 righe 160-161), l'`Esporta` collegamento travestito da pulsante (Storia 4.3 riga 190), `.main { min-width: 0 }` misurato sulle altre schermate (Storia 4.2 riga 176). **Non chiude:** voce 41 (macchina dei quattro stati) e voce 121 (cosa fa davvero `Riprova` su una rotta già aperta), che sono un refactor di sei file e nessuno degli AC lo chiede — restano annotati con nuovo punto di ripresa alla retrospettiva dell'Epic 5.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want che lo strumento resti usabile da tastiera e leggibile in condizioni scomode,
so that compilare una scheda in treno o con poca luce non diventa un ostacolo.

## Acceptance Criteria

**AC1 — il contrasto del testo passa 4,5:1 su ogni schermata**
**Given** ogni testo dell'interfaccia
**When** ne misuro il contrasto
**Then** è almeno 4,5:1, verificato in particolare per `--ink-muted` sopra `--surface-sunken` (UX-DR14)

**AC2 — il focus da tastiera è sempre visibile, e nella tinta della sezione corrente**
**Given** la navigazione da tastiera
**When** passo di elemento in elemento
**Then** il focus è sempre visibile, con alone di 3px nella tinta della sezione corrente

**AC3 — ogni campo ha una etichetta vera, non solo un segnaposto**
**Given** ogni campo di ogni modulo
**When** lo ispeziono
**Then** ha una etichetta vera, non solo un segnaposto

**AC4 — con `prefers-reduced-motion` attivo, il movimento si annulla**
**Given** la preferenza di sistema per il movimento ridotto
**When** è attiva
**Then** le transizioni si annullano (UX-DR15)

**AC5 — il colore non è mai l'unico portatore di significato**
**Given** qualsiasi informazione trasmessa da un colore
**When** la guardo
**Then** ha sempre anche un testo che la ripete (UX-DR2)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **La disciplina di questa story è la misura, non il giudizio.** Ogni cambiamento che questa story porta deve essere accompagnato da un numero — il rapporto di contrasto calcolato con la formula WCAG per AC1, il valore di `getBoundingClientRect().height` per i bersagli tattili, il pathname coperto dalla tinta di sezione per AC2 — e ogni numero va scritto nel Dev Agent Record, non solo in un commento del CSS. La ragione è la stessa che vale per il ledger: una promessa di accessibilità non verificata è peggio di un difetto conosciuto, perché sembra fatta e non lo è. Le sette voci di ledger che questa story chiude si chiudono con **il rapporto di contrasto scritto** e non con «adeguato».
>
> **Il focus in `--sec-prequalifica` è un ripiego, e la strada per toglierlo è un `--focus-tint` calcolato per sezione.** L'alone universale a `globals.css:116` (`box-shadow: 0 0 0 3px var(--sec-clienti-tint)`), l'alone di `.input:focus` a `:828` (in `--sec-prequalifica-tint`), l'alone del toggle a `:237` (in `--sec-clienti-tint`) sono tre ripiegi diversi che dicono la stessa cosa: manca un valore che dipende dalla sezione. La strada che questa story sceglie è **una variabile CSS `--focus-tint` che ogni sezione sovrascrive nel proprio scope**, definita in `:root` come `--sec-clienti-tint` di default, e sovrascritta da `.section--clienti`, `.section--questionario`, `.section--prequalifica` sul `<main>` o su un contenitore di rotta. Le tre righe che oggi portano `--sec-clienti-tint`, `--sec-prequalifica-tint` e `--sec-clienti-tint` diventano tutte `var(--focus-tint)`, e il valore giusto lo porta il contesto. **Non è un'estrazione premature:** i tre punti esistono già e sono tre valori diversi per la stessa decisione; questa story li riconcilia in uno, che è il minimo per far reggere AC2.
>
> **Come si applica `--focus-tint` alle rotte, e perché non con `usePathname`.** Il layout `(app)/layout.tsx` è un Server Component e non ha il pathname senza fare finta di essere client — che è la strada evitata dalla 5.1. La classe di sezione va sulla `<main>` della rotta stessa (`clienti/page.tsx`, `questionario/page.tsx`, `clienti/[id]/schede/[assessmentId]/page.tsx`): non è deriva del piano perché il file è già toccato per aggiornare focus/etichette, e la classe è quattro caratteri sull'attributo `className`. La rotta di accesso `/accedi` non ha `.main` — sta fuori dal layout `(app)/` — quindi resta col ripiego `--sec-clienti-tint`, che è la scelta di default di `:root`.
>
> **Il bersaglio tattile a 44px si applica a `.btn` per costruzione, non a `.sidebar-toggle` che resta 36 con motivazione dichiarata.** UX-DR14 dice 44 sui bersagli tattili, e i cinque `.btn` che oggi stanno a 40 (`.btn` a `globals.css:722`) crescono a **44**. La conseguenza è misurabile e va scritta: `.form__actions` allinea a `flex-end` con motivazione che «`.input` è alto almeno 44 e `.btn` esattamente 40» (`:554`), e quel commento smette di essere vero — la seconda metà va aggiornata; `.filters` allinea `.filters .btn` a un'altezza (`:582`) che va rimisurata a 44. **Il `.sidebar-toggle` resta 36×36**, non per pigrizia ma per la stessa ragione dichiarata nel commento del CSS della 5.1 (`:207-209`): la fascia del brand è a 44 di altezza e un pulsante 44×44 accanto rovina l'equilibrio verticale. Questa story **conferma** il 36 e chiude la voce a ledger scrivendo che la decisione è stata presa e non rimandata — è la classe di controllo che UX-DR14 non copre («controlli di navigazione dentro una fascia di brand»), non un'eccezione. Il ledger si barra qui.
>
> **Il fuoco che cade sul body durante `pending` è un problema di sei componenti, e la soluzione è una regola una sola.** `new-block-form`, `new-question-form`, `edit-question-form`, `move-buttons`, `question-active-button`, `sidebar-toggle`, `completion-button` disabilitano il pulsante durante il volo della server action e il browser toglie il fuoco — chi naviga da tastiera riparte dal body. La strada che questa story sceglie è **`aria-busy` sul pulsante invece di `disabled`**: il pulsante resta focalizzabile, il click ripetuto viene assorbito dall'hook (`useWrite` già rifiuta un secondo click con `if (pending) return`), e uno screen reader annuncia lo stato transitorio. `disabled` resta solo dove serve a dire che l'azione è **inammissibile** (bordo di una freccia di riordino, cliente senza persone). La regola si applica ai sette pulsanti in una passata sola: sono tutti costruiti sopra `useWrite` o `useTransition`, e nessuno di loro ha uno stato semantico di «inammissibile durante il volo».
>
> **La zona `role="status"` che annuncia due volte per pausa (voce 3-3 riga 139) si chiude spostando `role="status"` fuori dal pulsante `Riprova` e usando `aria-live="polite"` invece che `role="status"`.** `role="status"` implica una regione live implicita, e sulla schermata di compilazione ventiquattro campi la fanno rimbombare a ogni pausa. La strada che questa story sceglie non è provata a tavolino: si prova con un lettore di schermo vero (VoiceOver su macOS è il minimo), si annuncia una sola volta per stato reale, e non si annuncia `Salvato alle 14:32` a ogni pausa di scrittura. Il pulsante `Riprova` resta un `<button>` navigabile, ma esce dalla regione live: è un controllo, non un annuncio.
>
> **Le voci a ledger 41 e 121 non si chiudono qui, e va detto perché.** Voce 41 (cosa fa davvero `Riprova` su una rotta già aperta) e voce 121 (la macchina dei quattro stati usata da tre card) sono un refactor di sei file (`client-card.tsx`, `people-card.tsx`, `assessments-card.tsx`, `page.tsx` di due rotte, `src/lib/use-write.ts`) e richiedono di riverificare i quattro stati di due schermate. Nessuna delle cinque AC di questa story lo chiede, e farlo qui vorrebbe dire «una cosa alla volta» violata (`AGENTS.md`). Il ledger si annota con **nuovo punto di ripresa: retrospettiva dell'Epic 5**, che è dove si decide una volta sola cosa fa `Riprova`.
>
> **Non porta:** nessuna migrazione, nessuna scrittura sullo schema, nessun refactor di `use-editable-field.ts` (voce 3-4 sulla guardia `attempted.current`), nessuna sistemazione della sovrapposizione del titolo `Prequalifica` a 375 (voce 4-3 riga 184), nessuna decisione sulla pillola `non deciso` che perde fondo su hover riga (voce 4-2 riga 180), nessuna aggiunta della macchina dei quattro stati. Sono voci di forma pura e refactor, e la 5.2 è la passata di **accessibilità**. Chi trovasse tentazione di allargare, apra `AGENTS.md` alla riga «Una cosa alla volta».

## Tasks / Subtasks

- [x] **Task 1 — `--focus-tint` per sezione corrente** (AC: 2)

  - [x] `src/app/globals.css`: aggiungere il token nuovo in `:root`, subito dopo `--ink-inverse`:
    ```css
    /* Alone del focus per la sezione corrente. Ripiego a `--sec-clienti-tint` per le rotte che
       non stanno dentro una sezione (per esempio `/accedi`). Ogni sezione lo sovrascrive nel
       proprio scope, sotto in questo file. */
    --focus-tint: var(--sec-clienti-tint);
    ```
  - [x] Le tre righe di alone che oggi portano tinte diverse diventano tutte `var(--focus-tint)`:
    - `:focus-visible` universale (`globals.css:116`): `box-shadow: 0 0 0 3px var(--focus-tint)`.
    - `.input:focus` (`globals.css:828`): `box-shadow: 0 0 0 3px var(--focus-tint)` e `border-color: var(--focus-color, var(--sec-clienti))` — sì, servono due token, uno per l'alone (chiaro) e uno per il bordo (pieno). Aggiungere anche `--focus-color: var(--sec-clienti)` in `:root` con la stessa logica di sovrascrittura.
    - `.sidebar-toggle:focus-visible` (`globals.css:237`): `outline: 3px solid var(--focus-tint)` e il commento sopra si sostituisce con una riga sola: «alone nella tinta della sezione corrente, che qui è quella della rotta corrente perché la sidebar sta fuori dai selettori di sezione».
  - [x] Le sezioni sovrascrivono `--focus-tint` e `--focus-color` sul proprio `<main>` di rotta. Regole nuove in `globals.css`, subito dopo la sezione `:root`:
    ```css
    .section--clienti {
      --focus-tint: var(--sec-clienti-tint);
      --focus-color: var(--sec-clienti);
    }
    .section--questionario {
      --focus-tint: var(--sec-questionario-tint);
      --focus-color: var(--sec-questionario);
    }
    .section--prequalifica {
      --focus-tint: var(--sec-prequalifica-tint);
      --focus-color: var(--sec-prequalifica);
    }
    ```
  - [x] Applicare la classe di sezione sul `<main>` delle rotte:
    - `src/app/(app)/clienti/page.tsx`: `<main className="main section--clienti">`.
    - `src/app/(app)/clienti/[id]/page.tsx`: idem.
    - `src/app/(app)/clienti/nuovo/page.tsx`: idem.
    - `src/app/(app)/questionario/page.tsx`: `<main className="main section--questionario">`.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx`: `<main className="main section--prequalifica">`. **La schermata di compilazione è la sezione prequalifica**, non clienti — è il modello mentale di §5 di `design-system.md` (il colore vive nella navigazione, la compilazione è la sezione che ha `--sec-prequalifica`).
    - **Cambio strutturale:** oggi `layout.tsx` rende `<main className="main">{children}</main>`. Questo pattern deve cambiare: `layout.tsx` non rende più `<main>`, e ogni `page.tsx` rende il suo con la classe di sezione. Alternativa più stringente: `layout.tsx` legge il pathname… no, torna Server Component che non ha pathname. La strada scelta — `<main>` sulla rotta — costa una riga per rotta e non tocca il layout.
  - [x] `src/app/globals.css` — modificare la regola `.main` (già esiste, cerca `.main {`) per non contenere `<main>` di default ma per fare da classe: nulla cambia, `.main` resta la stessa; le rotte aggiungono `section--*` accanto.
  - [x] Verifica di forma con la riproduzione statica CDP-driven: aprire ogni rotta con la classe applicata, misurare `getComputedStyle(document.querySelector('.input')).boxShadow` e confermare che il colore è quello della sezione corrente. Numeri nel Dev Agent Record.

- [x] **Task 2 — Contrasto: `.error-box`, `.warn-box` e verifica su tutti i testi** (AC: 1)

  - [x] `src/app/globals.css:1420`: `.error-box { color: var(--bad); }` → `color: var(--bad-ink);`.
  - [x] `src/app/globals.css:1433`: `.warn-box { color: var(--warn); }` → `color: var(--warn-ink);`.
  - [x] Rimisurare **tutti** i contrasti del progetto con la formula WCAG. La lista minima da guardare, scritta nel Dev Agent Record con i numeri:
    - `--ink` (`#141210`) su `--bg` (`#f5f2ec`): atteso ~17:1.
    - `--ink` su `--surface` (`#ffffff`): atteso ~17,5:1.
    - `--ink` su `--surface-sunken` (`#eae5dc`): atteso ~15:1.
    - `--ink-muted` (`#58524b`) su `--bg`: atteso 6,3:1.
    - `--ink-muted` su `--surface`: atteso 7,3:1.
    - `--ink-muted` su `--surface-sunken`: **atteso 6,1:1, il caso critico dichiarato in `design-system.md` §2**.
    - `--ink-faint` (`#8b8379`) su `--bg`: **soglia sospetta** — è testo secondario e sotto 4,5:1 va segnalato. Usato per «`Salvato alle 14:32`» a riposo e per la data «3 giorni fa» in tabella clienti. Se non passa, va scritto e la strada è cambiare quel testo a `--ink-muted` **oppure** dichiarare che è testo grande e la soglia è 3,0:1.
    - `--ok`, `--warn`, `--bad` su `--surface` (le tre pillole nei loro casi rari): atteso circa 3,8/4,1/4,4:1 — nessuno passa il 4,5:1, ma nessuno è usato come testo su bianco (già registrato in `design-system.md` §2).
    - `--ok-ink`, `--warn-ink`, `--bad-ink` sulle rispettive tinte: 4,51/4,57/4,51:1 — passano per costruzione (D26).
    - `--bad-ink` su `--bg`: 4,84:1 — passa, ed è la scelta della 3.6 per `.page-header__actions .field__error`.
    - `--bad` su `--bad-tint` (`.error-box` prima della correzione): 3,85:1 — il caso della voce 3-5 riga 156.
    - `--bad-ink` su `--bad-tint` (`.error-box` dopo la correzione): atteso circa 4,51:1.
    - `--warn` su `--warn-tint` (`.warn-box` prima): 3,86:1.
    - `--warn-ink` su `--warn-tint` (`.warn-box` dopo): atteso circa 4,57:1.
    - `#ffffff` su `--ink` (tooltip della sidebar richiusa): 18,69:1 — già misurato dalla 5.1.
  - [x] Se `--ink-faint` cade sotto 4,5:1 nei suoi usi principali, aprire una **Domanda in coda alle Dev Notes** e scegliere con Luca: cambiare il token, cambiare l'uso, o accettare la deroga con testo grande.

- [x] **Task 3 — Bersagli tattili a 44px** (AC: —, UX-DR14 collaterale)

  - [x] `src/app/globals.css:722`: `.btn { height: 40px; }` → `height: 44px;`.
  - [x] I due commenti che nominano l'altezza vecchia vanno corretti nella stessa modifica:
    - `:554`: «`.input` è alto almeno 44 e `.btn` esattamente 40» → «`.input` è alto almeno 44 e `.btn` da questa story è alto 44».
    - `:1009`: idem se la stessa frase c'è (verificare con grep).
  - [x] Verifica di forma: misurare `getBoundingClientRect().height` di `.btn` in tutti i suoi punti (`Salva`, `Annulla`, `Nuovo cliente`, `Crea il primo cliente`, `Chiudi la scheda`, `Riporta in bozza`, `Esporta`). Attesa 44 in tutti i casi. Numeri nel Dev Agent Record.
  - [x] **`SignOutButton` sfora la sidebar richiusa** (voce 5-1 riga 204). Con `.btn` a 44 la larghezza minima cresce, e da collapsed il piede lascia 32 di larghezza utile. La decisione di questa story è **nascondere il pulsante da collapsed**, che è la strada che il ledger nomina per prima ed è la meno invasiva:
    ```css
    .sidebar--collapsed .sidebar__foot {
      display: none;
    }
    ```
    Con `SignOutButton` nascosto da collapsed, per uscire dalla sessione bisogna espandere la nav — un click sul toggle, un click su `Esci`. Non è un vincolo tecnico (D14: nessuno stato blocca nessuna azione), è una conseguenza della forma. Va dichiarato nel commento del CSS: «da collapsed il piede sparisce, per uscire dalla sessione si espande la nav».
    - Alternativa scartata (con motivo): dare al pulsante un'icona dedicata (icona `logout` a tratto). Costa un'icona in più in `nav-icons.tsx`, costa un secondo comando «esci» che sta accanto al toggle, e la fascia inferiore diventa una barra di controllo — una decisione di forma che nessun AC chiede.
    - Alternativa scartata (con motivo): comprimere il padding del pulsante con `overflow: hidden` sul piede. Rende il pulsante illeggibile a collapsed, cioè peggio che nascosto.
  - [x] **Il `.sidebar-toggle` resta 36×36** con motivazione dichiarata nel commento del CSS, che va aggiornato:
    ```css
    /* **36×36, e la Story 5.2 conferma:** la fascia del brand è alta 44, un pulsante 44 accanto
       al testo del brand a 44 di altezza rovina l'equilibrio verticale. La classe di controllo è
       «pulsante di navigazione dentro una fascia di brand», che UX-DR14 non copre — non è un
       bersaglio dei 44 nel senso della regola, è un controllo secondario in una zona di navigazione.
       Voce a ledger chiusa dalla Story 5.2. */
    ```
  - [x] **`Esporta` collegamento travestito da pulsante** (voce 4-3 riga 190). Restare `<a class="btn btn--secondary" href="…/esporta">` è quello che il Task 4 della 4.3 prescrive e la ragione è dichiarata: un `<Link>` naviga lato client e non scarica. Questa story **conferma** l'`<a>` e chiude il problema di affordance aggiungendo un titolo che dice cosa fa: `title="Scarica il file markdown"` più `aria-label="Esporta la scheda in markdown"`. La barra spaziatrice sull'`<a>` non si supporta senza JavaScript, e aggiungerlo per una richiesta è una regressione (il click naviga senza JavaScript, che è la promessa del `<a href>`). La chiusura della voce è per l'affordance testuale, non per il comportamento da tastiera, e va scritto nel Dev Agent Record perché la voce lo aveva nominato entrambi.

- [x] **Task 4 — Etichette vere e nomi accessibili distinti** (AC: 3)

  - [x] Passata su ogni campo del progetto per verificare che l'etichetta esiste come `<label>` associato o come `aria-label` esplicito. La lista dei posti da guardare:
    - `src/app/(app)/clienti/[id]/client-field-form.tsx` — tutti i campi dell'anagrafica.
    - `src/app/(app)/clienti/[id]/client-tags-form.tsx` — il campo tag.
    - `src/app/(app)/clienti/nuovo/new-client-form.tsx` — il campo nome del nuovo cliente.
    - `src/app/(app)/clienti/[id]/new-person-form.tsx` — i sei campi della persona.
    - `src/app/(app)/clienti/[id]/person-*` — persona esistente.
    - `src/app/(app)/questionario/new-block-form.tsx`, `block-title-form.tsx` — titolo del blocco.
    - `src/app/(app)/questionario/new-question-form.tsx`, `edit-question-form.tsx` — testo, aiuto, tipo, opzioni.
    - `src/app/(app)/clienti/[id]/new-assessment-form.tsx` — data, interlocutore.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx` — il campo di risposta.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/verdict-*.tsx` — verdetto, motivo, condizione, verifica entro, prossimo passo.
    - `src/app/(app)/accedi/…` — il campo email di accesso.
  - [x] **I nomi accessibili duplicati si distinguono**. `Modifica`, `Sposta su`, `Sposta giù`, `Disattiva`, `Riattiva` compaiono decine di volte nella pagina del questionario con lo stesso nome: chi naviga per elenco di pulsanti sente ventitré «Modifica» indistinguibili. La correzione è `aria-label` che include il testo della domanda o del blocco:
    - `question-item.tsx`: `<button aria-label={`Modifica la domanda "${question.text}"`}>Modifica</button>`.
    - `move-buttons.tsx`: `<button aria-label={`Sposta su la domanda "${question.text}"`}>` e simmetrico per giù. Idem per i blocchi.
    - `question-active-button.tsx`: `<button aria-label={`${active ? 'Disattiva' : 'Riattiva'} la domanda "${question.text}"`}>`.
  - [x] **Il campo opzioni che compare/scompare col tipo di risposta va annunciato** (voce 2-4 riga 97). `new-question-form.tsx` e `edit-question-form.tsx` rendono il campo opzioni condizionalmente sul valore di `answer_type`. La correzione è **una relazione dichiarata**: aggiungere `aria-controls="question-options-field"` sul select del tipo, e l'ID sul contenitore del campo opzioni. In più `aria-live="polite"` su un contenitore che compare/scompare con un breve annuncio testuale: quando compaiono, la riga «Elenco delle opzioni, una per riga» compare per prima ed è il testo di aiuto già presente — che quindi funziona come annuncio se il contenitore è `aria-live`. Verifica con VoiceOver: cambiando tipo da `testo lungo` a `scelta singola`, l'annuncio dice «Elenco delle opzioni, una per riga».

- [x] **Task 5 — `prefers-reduced-motion` verificato** (AC: 4)

  - [x] La regola universale c'è già in `globals.css:120-128`: `animation-duration: 0.01ms`, `transition-duration: 0.01ms`, `animation-iteration-count: 1`. Il selettore `*` copre tutto — verificarne il funzionamento con la riproduzione statica CDP-driven, applicando `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })` e misurando che:
    - La transizione della sidebar da espansa a richiusa dura ~0ms (`getComputedStyle(sidebar).transitionDuration` = `0.01ms`).
    - L'animazione `pulse` degli scheletri (`:1445`) ha `iteration-count: 1` e non lampeggia più.
    - La transizione del brand-text (`.sidebar__brand-text`, `:196-197`) dura ~0ms.
    - La transizione dei tooltip (`:196` sui `.nav__item::after`) dura ~0ms.
  - [x] Numeri nel Dev Agent Record, per ognuna delle quattro voci.
  - [x] Se qualche `animation` sfugge alla regola universale (per esempio se qualcuno ha scritto `animation: pulse 1.2s !important`), va corretto qui.

- [x] **Task 6 — Colore mai unico portatore di significato** (AC: 5)

  - [x] Verifica di completezza su ogni punto in cui un colore comunica qualcosa. La lista minima:
    - **Pillola di stato del cliente** (`status-pill.tsx`): fondo `--neutral-tint` + punto colorato + testo. **Testo presente**: passa.
    - **Pillola di verdetto** (`verdict-pill.tsx`): fondo in tinta + testo. **Testo presente**: passa.
    - **Riga d'errore** (`.field__error`): colore rosso + testo. **Testo presente**: passa.
    - **Indicatore di salvataggio** (`save-indicator.tsx`): tre stati con tre colori + tre testi diversi. **Testo presente**: passa.
    - **Barra di avanzamento** (`.progress__bar`): riempimento colorato + contatore in testo. **Testo presente**: passa. La barra è `aria-hidden`, coerente con la regola: non trasmette l'informazione, la doppia.
    - **Voce attiva della nav**: fondo `--surface-sunken` + icona nel colore della sezione + barra verticale. **Testo presente** (l'etichetta o, da collapsed, il tooltip su hover) e `aria-current="page"` sulla `<Link>`: passa.
    - **Alone del focus**: solo colore. **Ma il focus non trasmette un significato di stato del dato**, trasmette la posizione del cursore da tastiera. Non è un caso di UX-DR2 e non richiede un testo: passa.
    - **Colori di sezione nella nav**: distinguono le sezioni. Il nome della sezione c'è come etichetta (o come tooltip), quindi il colore non è unico portatore: passa.
  - [x] Se qualcosa non passa, aprire una voce a ledger e correggere qui.
  - [x] Grep di sanità: `grep -rn 'var(--bad)\|var(--warn)\|var(--ok)' src/` e verificare che ogni uso porti anche un testo. Numeri nel Dev Agent Record.

- [x] **Task 7 — `aria-busy` sui pulsanti che disabilitano durante `pending`** (AC: 2 collaterale)

  - [x] La regola: dove `disabled={pending}` è messo per prevenire un doppio click (non per dire che l'azione è inammissibile), si sostituisce con `aria-busy={pending}` e si lascia il pulsante focalizzabile. Il doppio click viene assorbito dall'hook (`useWrite` rifiuta un secondo `run()` con `if (pending) return`; `useTransition` fa lo stesso).
  - [x] I sette punti da toccare:
    - `src/app/(app)/questionario/new-block-form.tsx`: `<input disabled={pending}>` — resta `disabled` sull'input **perché il campo che si sta scrivendo va congelato**, ma il pulsante di conferma passa a `aria-busy`.
    - `src/app/(app)/questionario/new-question-form.tsx`: idem, l'input resta bloccato durante l'invio.
    - `src/app/(app)/questionario/edit-question-form.tsx`: idem, gli input restano bloccati.
    - `src/app/(app)/questionario/move-buttons.tsx`: la freccia disabilita durante `pending` **e** al bordo. La sostituzione: `aria-busy={pending}` per il volo, `disabled={isAtEdge}` per il bordo. Sono due semantiche diverse e questa story le separa per la prima volta.
    - `src/app/(app)/questionario/question-active-button.tsx`: `aria-busy={pending}`.
    - `src/app/(app)/sidebar-toggle.tsx`: `aria-busy={pending}` — chiude la voce a ledger 5-1 riga 206.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx`: `aria-busy={pending}`.
  - [x] Verifica con VoiceOver: attivare uno dei sette pulsanti e sentire l'annuncio dello stato transitorio senza perdere il fuoco.
  - [x] **La perdita del fuoco al ritorno** — dopo il completamento della server action, il pulsante potrebbe rimontare (rivalidazione) e perdere il fuoco lo stesso. Verifica caso per caso: se `router.refresh()` rimonta il componente, si aggiunge un ref con `useEffect` che ripristina il fuoco. Numeri nel Dev Agent Record.

- [x] **Task 8 — Zona live singola e errori dei pulsanti `useWrite`** (AC: — , annunci di riuscita)

  - [x] **La zona `role="status"` in `save-indicator.tsx:39` diventa `aria-live="polite"`** e viene resa quando lo stato **cambia**, non a ogni pausa di scrittura. La correzione è nel componente:
    - Il `role="status"` implicito lo rimuoviamo, `role="status"` è una regione implicitamente live.
    - Aggiungiamo `aria-live="polite"` sull'elemento che porta il testo dello stato.
    - Il pulsante `Riprova` **esce** dalla regione live: non è un annuncio, è un controllo.
    - Verifica con VoiceOver che gli annunci siano uno per cambio di stato reale, non uno per pausa.
  - [x] **Gli errori dei pulsanti `useWrite` che restano appesi** (voce 3-6 riga 161). Il componente `completion-button.tsx` non chiama `clearError` di `useWrite`, quindi l'errore sopravvive alla rivalidazione e resta a schermo per tutta la call. La correzione applicata **anche** a `question-active-button.tsx` (l'altro pulsante che non chiama `clearError`): destrutturare `clearError` e chiamarlo in `useEffect(() => clearError(), [assessment.completion_status])` (o l'equivalente prop che cambia allo stato). La regola: chi non ha un campo di cui azzerare l'errore lo azzera sul cambio di prop rilevante.
  - [x] **Annunci di riuscita, non solo di fallimento** (voce 3-6 riga 160). Il `completion-button.tsx` rende `<p role="alert">` solo sull'errore, e non annuncia la riuscita. La strada scelta è un `aria-live="polite"` su un `<span>` accanto al pulsante che porta lo stato corrente (`bozza` o `chiusa`), e quando cambia lo screen reader lo annuncia. Non è un cambio di UI (il testo era già visibile), è una relazione dichiarata.

- [x] **Task 9 — `.main { min-width: 0 }` misurato sulle rotte non guardate** (AC: —, chiusura ledger 4-2 riga 176)

  - [x] La voce a ledger dichiara che la Story 4.2 ha aggiunto `.main { min-width: 0 }` misurando **solo** sull'elenco clienti. La Story 4.3 ha misurato la schermata di compilazione (**passa**). Restano da misurare: **questionario**, **scheda cliente**, **`/accedi`**.
  - [x] Verifica di forma con la riproduzione statica CDP-driven a 375px:
    - `/questionario`: `documentElement.scrollWidth` contro `clientWidth`, misura. Controprova con `min-width: auto` su `.main` per capire se la regola serve o no. Numeri nel Dev Agent Record.
    - `/clienti/<id>`: idem.
    - `/accedi`: idem — anche se non usa `.main`, verificare che la pagina non scorra.
  - [x] Se qualcuna sfora, il rimedio è **locale** al contenuto e non a `.main`: `overflow-wrap: anywhere` sui campi (già presente su `.answer__text` e `.input`, verificare la card del cliente e la scheda), oppure un contenitore che scorre come `.table-scroll` per la tabella dell'elenco.
  - [x] La voce si chiude scrivendo **quattro numeri per quattro rotte** — l'elenco (già misurato dalla 4.2), la compilazione (già misurato dalla 4.3), il questionario e la scheda cliente (misurati qui) — e non con «funziona».

- [x] **Task 10 — Verifica di forma finale** (AC: 1, 2, 3, 4, 5)

  - [x] Riproduzione statica CDP-driven su tutte le rotte a 1280 e a 375, con e senza `prefers-reduced-motion`, con e senza sidebar richiusa. Numeri richiesti nel Dev Agent Record:
    - Rapporto di contrasto WCAG per ogni coppia colore/fondo elencata nel Task 2.
    - Altezza di ogni bersaglio tattile: `.btn` (44 atteso), `.sidebar-toggle` (36 atteso e dichiarato), `.input` (44+ atteso), riga della tabella (56 già misurata).
    - Alone del focus su ogni sezione: colore `getComputedStyle().boxShadow` che corrisponda alla tinta di sezione.
    - `documentElement.scrollWidth` a 375 su ogni rotta.
    - Durata delle transizioni con `prefers-reduced-motion` attiva.
  - [x] `npm run typecheck` senza uscita, `npm run build` riuscito.
  - [x] Il conteggio dei test **resta a 267** — questa story non porta nessun test unitario, i cambi sono tutti CSS o `aria-*` verificati a schermo.

- [x] **Task 11 — Il ledger** (AC: —)

  - [x] `docs/bmad/implementazione/deferred-work.md`, sezione nuova in fondo: `## Deferred from: implementazione della story 5-2-passata-di-accessibilita-verificata (12 agosto 2026)`.
  - [x] **Voci a ledger da barrare**, con annotazione di chiusura che dice il numero misurato:
    - Riga 7 (`.btn` 40 → 44): barrata, con «chiusa dalla Story 5.2 il 12 agosto 2026: `.btn` cresce a 44px in `globals.css`, verificato in tutti i suoi punti con `getBoundingClientRect().height` = 44».
    - Riga 8 (hover di riga illumina tutta ma solo il nome è cliccabile): **annotata, non chiusa**, con «il collegamento a riga intera non è nel perimetro della 5.2; il bersaglio del nome sta a 44+ con `.btn` cresciuto, quindi la parte accessibile della voce si chiude qui».
    - Riga 14 (focus in `--sec-prequalifica`): barrata, con «chiusa dalla Story 5.2: `--focus-tint` per sezione corrente in `globals.css`, applicata su `<main>` di ogni rotta».
    - Riga 66 (AC3 stato d'errore in `--sec-clienti-tint`): barrata, con la stessa chiusura di riga 14.
    - Righe 83 e 84 e sorelle (fuoco che cade sul body durante `pending`): barrate, con «chiusa dalla Story 5.2: `aria-busy` invece di `disabled` sui sette pulsanti che disabilitavano durante il volo». La voce di riga 84 è cumulativa di sei istanze — barrarla per intero.
    - Riga 95 (ventitré `Modifica` con lo stesso nome accessibile): barrata, con «chiusa dalla Story 5.2: `aria-label` che include il testo della domanda o del blocco su ogni pulsante di modifica e riordino».
    - Riga 97 (campo opzioni non annunciato): barrata, con «chiusa dalla Story 5.2: `aria-controls`/`aria-live` sul contenitore del campo opzioni».
    - Riga 139 (zona `role="status"` che annuncia due volte per pausa): barrata, con «chiusa dalla Story 5.2: `aria-live="polite"` invece di `role="status"`, il pulsante `Riprova` esce dalla regione live».
    - Riga 156 (`.error-box` e `.warn-box` a colore pieno su tinta): barrata, con «chiusa dalla Story 5.2: `--bad-ink` e `--warn-ink` sui due riquadri, rapporti 4,51:1 e 4,57:1 misurati».
    - Righe 160 e 161 (annunci di riuscita e `clearError` mancanti su `useWrite`): barrate, con «chiusa dalla Story 5.2: `clearError` chiamato al cambio di prop rilevante, riga di stato con `aria-live="polite"` accanto ai due pulsanti `useWrite` senza campo».
    - Riga 176 (`.main { min-width: 0 }` misurato solo su una schermata): barrata, con «chiusa dalla Story 5.2: misurate le altre tre rotte (questionario, scheda cliente, `/accedi`) con `documentElement.scrollWidth` a 375, numeri nel Dev Agent Record».
    - Riga 190 (`Esporta` collegamento travestito da pulsante): barrata solo per la parte di affordance, annotata per la parte di comportamento da tastiera con «chiusa parzialmente dalla Story 5.2: `title` e `aria-label` sul collegamento; la barra spaziatrice non si supporta senza JavaScript e la voce **resta annotata** per la parte di comportamento — chi la riprende scelga fra un `<form>` che scarica o accettare la deroga per un collegamento di download».
    - Riga 199 (toggle a 36×36): barrata, con «confermata dalla Story 5.2: 36 è una decisione di forma con motivo dichiarato nel commento del CSS, e non un ripiego».
    - Riga 200 (outline focus in `--sec-clienti-tint`): barrata, con «chiusa dalla Story 5.2: il toggle prende `var(--focus-tint)` che è quello della sezione corrente della rotta».
    - Riga 204 (`SignOutButton` sfora sidebar richiusa): barrata, con «chiusa dalla Story 5.2: il piede si nasconde da collapsed (`display: none`), per uscire dalla sessione si espande la nav».
    - Riga 206 (`aria-busy` mancante sul toggle): barrata, con «chiusa dalla Story 5.2: `aria-busy` applicato al toggle come parte della passata sui sette pulsanti».
  - [x] **Voci ledger da annotare, non chiudere**:
    - Riga 121 (macchina dei quattro stati usata da tre card): **annotare** con «punto di ripresa spostato alla retrospettiva dell'Epic 5. La 5.2 ha letto ma non aperto le tre card, per la stessa ragione della 5.1: sei file da toccare, riverifica dei quattro stati di due schermate, nessuna AC lo chiede».
    - Voce parente sull'errore `Riprova` su rotta già aperta (menzionata insieme alla 121): stessa annotazione.
    - Riga 171 (`.progress__bar` `1/24` sotto il tappo arrotondato): **decisione da prendere** — se questa story guarda la barra, si decide fra `min-width` e lasciare com'è. Vedi Domanda 3 in coda alle Dev Notes.
    - Riga 180 (pillola `non deciso` perde fondo su hover): **decisione da prendere** — vedi Domanda 4.
    - Riga 184 (titolo `Prequalifica` sovrapposto a 375): **annotata come forma non a11y**, punto di ripresa retrospettiva dell'Epic 5.
    - Riga 185 (scheletro intestazione asymmetric): idem.
    - Riga 191 (`Esporta` su terza riga sotto errore): idem.
  - [x] Se le Domande 3 e 4 in coda alle Dev Notes hanno esito «lascia com'è», le due voci restano aperte con motivo dichiarato.

- [x] **Task 12 — Cosa cambia in `design-system.md`** (AC: —)

  - [x] §2 (Colore): la nota sul contrasto della pillola può ora dire «il caso peggiore è chiuso» per le pillole di verdetto **e** per `.error-box`/`.warn-box`, con i numeri misurati.
  - [x] §8 (Accessibilità): la nota sui bersagli tattili si aggiorna: «`.btn` è alto 44 a partire dalla Story 5.2. `.sidebar-toggle` resta 36×36 con motivo dichiarato: la fascia del brand è alta 44, un pulsante 44 accanto rovina l'equilibrio verticale».
  - [x] §9 (Token): si aggiungono `--focus-tint` e `--focus-color` con la loro logica di sovrascrittura per sezione.
  - [x] §5 (Componenti): nella nota sulla nav si dice che «da collapsed il piede si nasconde: `SignOutButton` non è raggiungibile finché la nav non è espansa».
  - [x] **Nessuna altra modifica ai documenti.** In particolare `00-contesto-e-decisioni.md` non riceve una decisione registrata nuova: la forma delle regole di focus e di bersaglio vive nel codice e in `design-system.md`, e duplicare una convenzione in una decisione registrata produce due copie destinate a divergere.

## Dev Notes

### Perché una passata trasversale, e perché ora

Questa story fa una cosa che nessuna delle altre venticinque ha fatto: tocca ogni rotta del progetto in una passata sola. Non è un'eccezione alla regola «una cosa alla volta»: è una story il cui perimetro **è** la lista degli AC dell'accessibilità, applicati ovunque, verificati numero per numero. Farla story per story, funzione per funzione, avrebbe voluto dire cinque diverse versioni della stessa decisione (i cinque focus in cinque tinte, i cinque `.btn` a cinque altezze, i cinque approcci al `disabled`), e sarebbe stato l'esatto contrario di quello che l'accessibilità richiede: **una regola sola applicata identica**.

L'ordine giusto è quello: prima si costruiscono le schermate, poi si guarda l'accessibilità con tutte le schermate in mano, e si decide una volta sola. La 5.2 è la prima story dopo la 5.1 in cui questo è vero, ed è per questo che sta in fondo all'Epic 5.

### Perché `--focus-tint` invece di cinque regole

Le tre righe di alone che oggi portano tinte diverse (`:focus-visible` universale, `.input:focus`, `.sidebar-toggle:focus-visible`) esistono con quei tre valori per ragioni diverse: la prima è nata con il progetto e ha scelto la tinta di clienti come «default», la seconda è nata con l'Epic 3 quando la schermata di compilazione voleva il colore di prequalifica, la terza è nata con la 5.1 quando il toggle è comparso e non aveva una sezione sua. Ognuna delle tre è un ripiego coerente per il suo contesto.

Sostituirle con la stessa variabile `--focus-tint` non è deriva del piano: è la riconciliazione di tre valori nati per la stessa decisione, e la strada che UX-DR14 chiede quando dice «tinta della sezione corrente». La variabile si sovrascrive nel proprio scope con una classe di sezione sul `<main>`: costa quattro righe di CSS e quattro classi su cinque `page.tsx`, e la logica di calcolo diventa la stessa che il modificatore `.nav__item--<sezione>` porta già.

### Perché `aria-busy` invece di `disabled`

`disabled` sul pulsante ha tre conseguenze: previene il click ripetuto (voluto), toglie il fuoco (non voluto, `AGENTS.md` e UX-DR14), e non annuncia lo stato transitorio a chi usa uno screen reader (non voluto). `aria-busy` fa una cosa sola — annuncia lo stato transitorio — e lascia le altre due responsabilità al pulsante (non torna e non blocca) e all'hook (`useWrite` rifiuta un secondo `run()` con `if (pending) return`; `useTransition` lo fa in modo simile).

C'è una eccezione, ed è dichiarata in Task 7: dove `disabled` dice «l'azione è **inammissibile**» (non «l'azione è in volo»), resta `disabled`. Il caso è le frecce di riordino quando l'elemento è al bordo (`Sposta su` sul primo, `Sposta giù` sull'ultimo). Semantica diversa, trattamento diverso.

### Perché il toggle resta a 36 e `.btn` cresce a 44

UX-DR14 dice 44 sui bersagli tattili. `.btn` è un bersaglio tattile per definizione — è un pulsante di azione principale o secondaria — e va a 44. Il toggle della sidebar è un controllo di **forma della navigazione**, che sta dentro una fascia di brand alta 44 e a fianco di un testo di brand alto 44: se cresce a 44 la fascia deve crescere a 52 (perché ci vuole padding), e la fascia era già stata dichiarata a 44 dalla Story 5.1 con un motivo. La classe di controllo «pulsante di navigazione dentro una fascia di brand» non è coperta dai 44 di UX-DR14 nel senso stretto — UX-DR14 parla dei bersagli tattili di *azioni*, non di *controlli di forma*.

La riga a ledger che questa story chiude non è «il toggle sta a 44», è «il toggle a 36 è dichiarato o è un ripiego». Dichiarato — con il motivo scritto nel commento del CSS e nel Dev Agent Record di questa story — è quello che serve.

### Perché `SignOutButton` sparisce da collapsed

Il piede della sidebar collapsed lascia 32 di larghezza utile, e nessuna forma di `.btn` a 44 di altezza sta comodamente in 32 di larghezza. Le tre alternative del ledger sono:

- **Nascondere:** una regola CSS. Zero righe applicative, zero decisione di forma nuova. Per uscire dalla sessione si espande la nav, che è un click sul toggle. `SignOutButton` è usato da chi finisce di lavorare, non da chi sta lavorando, quindi il costo di un click in più è quasi nullo. **Scelta**.
- **Icona dedicata:** un'icona nuova in `nav-icons.tsx`, un secondo comando nella fascia inferiore, un secondo pattern nella nav richiusa. Deriva del piano su un caso che nessuno usa spesso.
- **Comprimere:** il pulsante diventa illeggibile a collapsed, cioè peggio che nascosto.

La scelta va scritta in `design-system.md` §5 perché la regola generale della nav richiusa lo dice.

### Perché la schermata di compilazione è `section--prequalifica`

Il modello di `design-system.md` §2 dice che i colori di sezione «vivono nella navigazione». La schermata di compilazione è dentro la sezione `Clienti` come rotta URL (`/clienti/<id>/schede/…`), ma la sua **sezione visiva** è `Prequalifica` — è quello che il colore del focus di `.input:focus` in `--sec-prequalifica-tint` dice da sempre. Questa story mette una classe che rende esplicito quello che il ripiego già faceva: `<main className="main section--prequalifica">`.

La conseguenza pratica: se un giorno la sezione `Prequalifica` compare come voce di nav (oggi non è nella lista di `nav.tsx`), la classe è già coerente col colore che la voce porterà.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/app/globals.css` | `--focus-tint` e `--focus-color`, `.section--*`, `.btn` a 44, `.error-box`/`.warn-box` con `-ink`, piede nascosto da collapsed | 1, 2, 3 |
| `src/app/(app)/clienti/page.tsx` | `className="main section--clienti"` | 1 |
| `src/app/(app)/clienti/[id]/page.tsx` | idem | 1 |
| `src/app/(app)/clienti/nuovo/page.tsx` | idem | 1 |
| `src/app/(app)/questionario/page.tsx` | `className="main section--questionario"` | 1 |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` | `className="main section--prequalifica"` | 1 |
| `src/app/(app)/questionario/new-block-form.tsx` | `aria-busy` invece di `disabled` sul pulsante | 7 |
| `src/app/(app)/questionario/new-question-form.tsx` | `aria-busy`, `aria-controls`/`aria-live` sul campo opzioni | 4, 7 |
| `src/app/(app)/questionario/edit-question-form.tsx` | `aria-busy`, `aria-controls`/`aria-live` sul campo opzioni | 4, 7 |
| `src/app/(app)/questionario/move-buttons.tsx` | `aria-busy` per pending, `disabled` solo per bordo, `aria-label` con testo | 4, 7 |
| `src/app/(app)/questionario/question-active-button.tsx` | `aria-busy`, `aria-label` con testo, `clearError` al cambio prop | 4, 7, 8 |
| `src/app/(app)/questionario/question-item.tsx` | `aria-label` sul pulsante `Modifica` con testo della domanda | 4 |
| `src/app/(app)/sidebar-toggle.tsx` | `aria-busy` | 7 |
| `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx` | `aria-busy`, `clearError` al cambio prop, `aria-live` per stato | 7, 8 |
| `src/components/save-indicator.tsx` | `aria-live="polite"` invece di `role="status"`, pulsante `Riprova` fuori dalla regione | 8 |
| `docs/design-system.md` | §2 numeri di contrasto, §5 nota SignOut, §8 bersagli tattili, §9 nuovi token | 12 |
| `docs/bmad/implementazione/deferred-work.md` | quindici voci barrate, quattro annotate | 11 |
| `docs/bmad/implementazione/sprint-status.yaml` | `5-2` a `review` a implementazione conclusa | (fine) |

**E basta.** In particolare **non** si aprono: nessuna migrazione, nessun file di test nuovo, nessuna passata su `use-editable-field.ts`, nessun file `.card`/`.card__*`, nessun refactor di componenti che non stia nella tabella qui sopra. Se durante l'implementazione sembra necessario aprirne uno fuori da questa tabella, **fermati e dillo**.

### Domande aperte, e cosa propongo

**Domanda 1 — `--ink-faint` in `Salvato alle 14:32` a riposo passa 4,5:1?**
`--ink-faint` è `#8b8379`; su `--bg` (`#f5f2ec`) è ~4,1:1 secondo la formula WCAG che va misurata. Il testo di `save-indicator--saving` è a `--ink-muted` (passa a 6,3:1), quello di `save-indicator--saved` a `--ink-faint`. Se sotto 4,5:1, le strade sono:

- **Opzione A**: cambiare `--ink-faint` per portarlo a 4,5:1. Costa una modifica al token, propaga ovunque `--ink-faint` è usato.
- **Opzione B**: cambiare il testo di `Salvato alle 14:32` a `--ink-muted`, perdendo il tono discreto («sta lì, si guarda quando serve», `design-system.md` §5). Costa una riga.
- **Opzione C**: accettare la deroga dichiarando che è testo grande (font-size 13px non passa, 14px non passa, 18px passa) o non essenziale (WCAG lo permette per «testo decorativo»). Costa una decisione registrata.

**Proposta: A.** Il tono discreto va conservato — è l'elemento firma del prodotto (`design-system.md` §1) — e cambiare il colore del testo lo tradisce. Portare `--ink-faint` a 4,5:1 costa un valore leggermente più scuro, per esempio `#7d766c`, misurato. Da confermare all'implementazione.

**Domanda 2 — Sezione «prequalifica» sul `<main>` della schermata di compilazione: applico la classe direttamente o creo un wrapper?**
La schermata di compilazione ha un `<main>` che oggi porta `className="main"`. La proposta è farla diventare `className="main section--prequalifica"`. La modifica è di una riga. **Non c'è deriva.**

**Proposta: applica la classe direttamente.** Da confermare all'implementazione.

**Domanda 3 — La barra di avanzamento con `1 / 24` cade quasi tutta nel tappo arrotondato. Chiudo qui o rimando?**
Il ledger dichiara che nessuna informazione si perde (il contatore accanto dice `1 / 24` per esteso), quindi non è una violazione di AC5. Ma è una voce nominata per la 5.2. Le strade:

- **Opzione A**: aggiungo `min-width` sul riempimento quando è maggiore di zero (per esempio 6px). Costa una regola, un numero deciso a occhio.
- **Opzione B**: lascio com'è, dichiarando che il colore non è unico portatore e chiude AC5 senza toccare la barra. La voce a ledger si chiude scrivendo «lasciata invariata dalla Story 5.2 per AC5 soddisfatta dal contatore in testo».

**Proposta: B.** L'AC5 è soddisfatta e la barra è `aria-hidden`: aggiungere un `min-width` sarebbe una decisione di forma senza AC che la chieda. Da confermare all'implementazione.

**Domanda 4 — La pillola `non deciso` che perde fondo su hover riga. Chiudo o rimando?**
Stessa categoria di Domanda 3: nessuna informazione si perde, il testo `non deciso` resta e sta a `--ink-muted` su `--surface-sunken` (passa a 6,1:1). Le strade:

- **Opzione A**: dò alla pillola un bordo sottile in `--neutral-tint` scuro (per esempio `--line-strong`) così mantiene la sua forma anche quando il fondo si confonde.
- **Opzione B**: lascio com'è, dichiarando che AC5 è soddisfatta dal testo.

**Proposta: B.** Come Domanda 3. Da confermare all'implementazione.

**Domanda 5 — Voci a ledger 41 e 121: chiudo qui o sposto?**
Voce 121 (macchina dei quattro stati usata da tre card) e voce 41 (cosa fa davvero `Riprova` su una rotta già aperta) sono un refactor di sei file. Nessuna delle cinque AC di questa story lo chiede. La strada:

- **Opzione A**: sposto alla retrospettiva dell'Epic 5. La retrospettiva è il posto giusto per decisioni di refactor trasversale.
- **Opzione B**: chiudo qui, allargando il perimetro.

**Proposta: A.** Il refactor è una decisione di architettura di componenti, non di accessibilità, e la 5.2 non è la sua passata. Da confermare all'implementazione.

### Trappole note

**1. Cambiare il valore di `--sec-clienti-tint` invece di aggiungere `--focus-tint`.** L'istinto è «tanto il ripiego è quello, cambio il ripiego». Ma `--sec-clienti-tint` è la tinta della sezione **Clienti**, che è usata anche dalla pillola dello stato `valutato` e dal fondo di `.sec-clienti-active`: cambiarla propaga ovunque. `--focus-tint` è un nome nuovo per una funzione nuova, e va aggiunto.

**2. Applicare la classe di sezione su `<div>` invece che su `<main>`.** `<main>` è il landmark ARIA della regione principale, ed è dove UX-DR14 chiede di mettere il focus visibile della sezione. Un `<div>` interno funziona ma non è il posto giusto — il landmark deve dichiarare la sezione, non un contenitore anonimo.

**3. Passare a `<button>` per `Esporta` per il supporto della barra spaziatrice.** Un `<button>` non scarica un file — deve fare un `POST` con `<form>` o un `window.location.href`. La 4.3 ha scelto `<a>` per una ragione dichiarata, e questa story la conferma. La barra spaziatrice non si supporta e la voce si chiude solo per l'affordance.

**4. Applicare `.section--clienti` sul layout invece che sulla rotta.** Il layout è un Server Component e non ha il pathname senza fare finta di essere client — la 5.1 ha già dichiarato che no. La classe va sulla rotta.

**5. Cambiare `.btn` a 44 senza aggiornare i due commenti che nominano 40.** Sono a `:554` e `:1009`. Il grep è mancante da `.btn` a 44 senza aggiornare i commenti è un piccolo debito ma inasprisce il ledger — la prossima passata troverà due frasi che dicono «40» e un CSS che dice «44».

**6. `aria-busy` sui pulsanti che disabilitano per **inammissibilità** (frecce al bordo, `Sposta su` sul primo).** Sarebbero annunciati come «occupato» ogni volta che sono lì, che è più fastidioso che silenzioso. Semantica diversa, trattamento diverso.

**7. Dimenticare di misurare `documentElement.scrollWidth` sulle rotte non toccate (Task 9).** Il ledger dichiara esplicitamente che la Story 4.2 ha misurato solo l'elenco e chiude la voce solo con **quattro** numeri, non uno.

**8. `role="status"` e `aria-live="polite"` non sono la stessa cosa.** `role="status"` implica una regione live implicita ma con più regole (per esempio non è annunciato se il contenuto è modificato durante un'altra pronuncia). `aria-live="polite"` è dichiarativo e configurabile. Per la zona di salvataggio, dove i cambi sono frequenti e non urgenti, `aria-live="polite"` è la scelta giusta.

**9. Toccare `.progress__bar` senza aver deciso Domanda 3.** La voce a ledger è chiara sul fatto che la decisione è di forma, non di accessibilità. Farla di iniziativa dentro la 5.2 sarebbe deriva del piano.

**10. Toccare la pillola `non deciso` senza aver deciso Domanda 4.** Come sopra.

### Riferimenti

- `docs/prd-v1.md` §5 «Requisiti non funzionali» (NFR13 sul contrasto, NFR16 sugli errori che dicono cosa fare)
- `docs/design-system.md` §1 (direzione visiva), §2 (colore e regole di governo), §5 (componenti, navigazione, pulsanti, indicatore), §8 (accessibilità), §9 (token), §10 (da non fare)
- `docs/kb-0.md` §6 «Interfaccia e design» (quattro stati, pavimento di qualità)
- `docs/00-contesto-e-decisioni.md` D26 (revisione «viva» dei token), commenti sulle chiusure di contrasto
- `docs/AGENTS.md` (una cosa alla volta, nessun esadecimale fuori dai token)
- `docs/bmad/pianificazione/epics.md` § Epic 5 (rifinitura) e § Story 5.2 (i 5 AC)
- `docs/bmad/implementazione/deferred-work.md` righe 7, 8, 14, 66, 83, 84, 95, 97, 121, 139, 156, 160, 161, 171, 176, 180, 184, 185, 190, 191, 199, 200, 204, 206 (le voci che questa story chiude o annota)
- `docs/bmad/implementazione/5-1-navigazione-laterale-richiudibile.md` (Story 5.1, precedente immediato)
- WCAG 2.1 §1.4.3 (contrasto minimo 4,5:1), §2.4.7 (focus visibile), §2.5.5 (bersaglio tattile 44×44), §1.4.1 (colore mai unico portatore)

## Verifica di sessione

Le caselle qui sotto le mette Luca dopo la revisione del codice, non l'implementazione. Sono la prova che AC1–AC5 valgono con un browser vero, non solo con una riproduzione statica.

- [ ] Su ogni rotta (`/clienti`, `/clienti/<id>`, `/clienti/nuovo`, `/questionario`, `/clienti/<id>/schede/<assessmentId>`, `/accedi`), il focus da tastiera ha un alone di 3px nella tinta della sezione corrente (AC2)
- [ ] I riquadri `.error-box` e `.warn-box` mostrano testo leggibile a colpo d'occhio, senza sensazione di sbiadito (AC1)
- [ ] `Salvato alle 14:32` a riposo si legge senza fatica su fondo `--bg` (AC1, Domanda 1)
- [ ] Ogni pulsante primario del progetto (`.btn`) misura almeno 44px di altezza a occhio (UX-DR14)
- [ ] Il pulsante toggle della sidebar resta comodo da premere anche se sotto i 44px dichiarati (UX-DR14 deroga)
- [ ] Da collapsed, `SignOutButton` non è visibile; espandendo la nav ricompare e resta cliccabile
- [ ] **Richiusa la nav sul portatile, ristretta la finestra sotto i 720:** `Esci` ricompare stretto dentro la colonna e resta premibile (revisione: era il caso in cui sparivano insieme piede e toggle)
- [ ] **L'alone del fuoco si vede**, non solo è del colore giusto: il contorno pieno da 2px si distingue a colpo d'occhio su un pulsante secondario, che è il caso peggiore (revisione, AC2)
- [ ] **`Annulla` durante una scrittura è spento**, sulle due conferme di eliminazione e sui moduli che si aprono da un pulsante (revisione)
- [ ] Il `Salva` della barra di salvataggio, quando si preme, non fa perdere il fuoco dal pulsante (`aria-busy`)
- [ ] `Modifica` su una domanda del questionario, annunciato da VoiceOver, dice il testo della domanda oltre a `Modifica` (AC3)
- [ ] Attivando `prefers-reduced-motion` nel sistema operativo, la sidebar si richiude senza animazione visibile (AC4)
- [ ] Il colore del focus della schermata di compilazione è verde acqua (`--sec-prequalifica-tint`), quello del questionario viola (`--sec-questionario-tint`), quello dei clienti blu (`--sec-clienti-tint`)
- [ ] Nessuna schermata a 375px scorre di lato (AC1, Task 9)
- [ ] Nessuna informazione veicolata dal colore manca del testo che la ripete (AC5)

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), Claude Code, 12 agosto 2026.

### Debug Log References

Nessuna sessione autenticata: l'accesso è per collegamento email e la quota non si consuma per una prova. Le misure vengono dalla **riproduzione statica** — `globals.css` reale più i font veri (`Geist-Variable.woff2`, `GeistMono-Variable.woff2` da `node_modules/geist`), sei pagine HTML col markup delle rotte, servite da un server locale e aperte nel Browser pane. Le classi sono state estratte dai sorgenti e non indovinate: la prima stesura usava nomi inventati (`.mode` era `.modes`, `.table` era `.clients`) e le misure erano sbagliate di conseguenza.

**Contrasti:** calcolatore WCAG 2.1 §1.4.3 scritto per l'occasione (linearizzazione sRGB e luminanza relativa), 36 coppie, i numeri qui sotto vengono da lì.

**Numeri di riga della story, tutti scaduti.** Sei commit sono atterrati fra la preparazione della story e questa implementazione: `globals.css:722` per `.btn`, `:1420` per `.error-box`, `:1433` per `.warn-box`, `:1445` per `pulse`, `:120-128` per il movimento ridotto, `:196-197` per il brand-text — nessuno corrisponde. Ogni punto è stato trovato per selettore. La riga vera del blocco `prefers-reduced-motion` è `161-169`.

### Completion Notes List

**Tre cose che la story dava per vere e non lo erano.** Vanno lette per prime, perché due delle sue prescrizioni non avrebbero funzionato applicate alla lettera.

1. **Il valore proposto per `--ink-faint` non passa.** La Domanda 1 proponeva `#7d766c` «per arrivare a 4,5:1»: misurato, sta a **4,02:1**. E lo stato di partenza era peggiore di quanto la story stimasse — `#8B8379` su `--bg` non era «~4,1:1» ma **3,34:1**. Risolvendo per la soglia viene `#736D64`, **4,58:1** su `--bg` e **5,12:1** su `--surface`. Portato a Luca con i numeri; risposta: scurire il token. È l'unico valore di D26 che questa story supera, e `design-system.md` §2 dice perché.
2. **`useWrite` non aveva la guardia sul doppio clic.** Il Task 7 scriveva «`useWrite` già rifiuta un secondo click con `if (pending) return`». Non c'era: togliere `disabled` senza aggiungerla avrebbe creato il doppio invio proprio mentre la story dichiara di prevenirlo. La guardia è ora in `src/lib/use-write.ts`, un `useRef` e non uno stato — `write` è memoizzato su `[unreachable]`, quindi un `pending` catturato nella chiusura sarebbe rimasto vecchio per sempre. Il file non era nella tabella della story: è una correzione necessaria al suo stesso disegno, non un allargamento.
3. **L'architettura dell'alone non poteva funzionare com'era prescritta.** La story metteva la classe di sezione sul `<main>` di rotta e insieme prometteva che il toggle della sidebar avrebbe preso «la tinta della sezione corrente» (voce a ledger 200). Le due cose non stanno insieme: la sidebar è **sorella** di `<main>`, non sua discendente, quindi sarebbe rimasta sul ripiego per sempre. Le tre sovrascritture stanno su `.shell:has(.section--…)` — tecnica già in uso nel file per `.sidebar--collapsed`, nessuna dipendenza nuova — e così la promessa della story diventa vera invece di sembrarlo.

**Due scelte messe a Luca durante il lavoro, entrambe risposte A.** (a) `--ink-faint`: scurire il token invece di cambiarne gli usi o accettare la deroga. (b) `aria-busy`: il Task 7 elencava **sette** pulsanti, ma il pattern nel codice stava in **venti** file, e la voce a ledger 84 chiede «una passata sola su tutti i moduli» nominando un file che la tabella della story non aveva. Applicato a tutti e venti — 26 attributi.

---

#### Task 1 — l'alone del fuoco (AC2)

`--focus-tint` e `--focus-color` nascono in `:root` coi valori della sezione clienti; tre regole `.shell:has(…)` li riscrivono. Le leggono i tre posti dove il fuoco si disegna: `:focus-visible`, `.input:focus`, `.sidebar-toggle:focus-visible`.

`<main>` è uscito da `(app)/layout.tsx` e lo rende ora ogni foglia con la classe della propria sezione — **dodici file**: cinque sotto `clienti` (`page`, `loading`, `[id]/page`, `[id]/loading`, `nuovo/page`), due sotto `questionario`, tre sotto `schede/[assessmentId]`, più `error.tsx` e `not-found.tsx` che restano sul ripiego di `:root` perché non appartengono a una sezione. Due componenti d'errore restituiti in anticipo dal proprio `page.tsx` — `ClientError` e `AssessmentError` — hanno preso il loro `<main>` a parte: senza, quello stato d'errore avrebbe perso insieme il respiro della pagina e la tinta giusta sul `Riprova`. Il layout porta ora un commento che dice a chi aggiunge una foglia che deve renderlo.

**Misurato col fuoco vero da tastiera** (`document.hasFocus()` deve essere vero, altrimenti `:focus` non corrisponde e si misura zero credendo di misurare):

| Rotta | `border-color` | `box-shadow` |
|---|---|---|
| `/clienti/<id>` | `rgb(58,79,222)` = `--sec-clienti` | `rgb(232,234,253) 0 0 0 3px` |
| `/clienti/<id>/schede/<id>` | `rgb(10,126,144)` = `--sec-prequalifica` | `rgb(223,241,243) 0 0 0 3px` |
| `/questionario` (`:focus-visible` su un `<a>`) | — | `rgb(239,231,252) 0 0 0 3px` |
| `/schede/<id>`, `:focus-visible` sul `Salva` nero | — | `rgb(223,241,243) 0 0 0 3px` |

E la prova che la sorellanza è attraversata: sul questionario `--focus-tint` risolve a `#efe7fc` **letto sulla `.sidebar`**, non solo sul `<main>`.

#### Task 2 — contrasto (AC1)

`.error-box` e `.warn-box` come prescritto. Rimisurando tutto il progetto sono usciti **altri tre testi sotto soglia** che nessuna voce nominava — la lista della story era dichiarata «minima», e questi stavano fuori:

| Coppia | Prima | Dopo |
|---|---|---|
| `.error-box`, `--bad` su `--bad-tint` | 3,85:1 | **4,51:1** (`--bad-ink`) |
| `.warn-box`, `--warn` su `--warn-tint` | 3,86:1 | **4,57:1** (`--warn-ink`) |
| `.btn--danger` sull'hover, `--bad` su `--bad-tint` | 3,85:1 | **4,51:1** (`--bad-ink`; a riposo 4,62 → **5,40**) |
| `.save-indicator--failed`, `--bad` su `--bg` | 4,13:1 | **4,84:1** (`--bad-ink`) |
| `.field__error` nel cestino, `--bad` su `--surface-sunken` | **3,68:1** | **4,51:1** |
| `.save-indicator` a riposo, `--ink-faint` su `--bg` | 3,34:1 | **4,58:1** (token scurito) |

L'ultimo caso è il peggiore del software e il solo che un cambio di token non risolve: su `--surface-sunken` nemmeno `--bad-ink` basta (**4,31:1**). La riga prende quindi la propria tinta, cioè la stessa coppia di `.error-box`. **Nessun token nuovo.** Sono i due `Ripristina`, uno per cestino, ed è la terza conseguenza del fondo scavato — `design-system.md` §5 ne elencava due, e questa non si era vista perché il colore del testo non cambia, cambia il fondo sotto.

**Dopo, nessun testo del progetto sta sotto 4,5:1.** Le due coppie che restano sotto non sono testo: `--ink-faint` su `--neutral-tint`, **4,23:1**, è il punto di 6px della pillola di stato — un grafico che raddoppia la parola, non la sostituisce, e comunque sopra il 3:1 di §1.4.11 — e `--ink-faint` su `--surface-sunken`, **4,08:1**, **non esiste nel codice**: `--ink-faint` ha due soli usi e nessuno dei due sta su quel fondo (dove sarebbe capitato, il cestino, il progetto usa già `--ink-muted`, 6,15:1, con la ragione scritta).

Altri numeri della lista minima, tutti passanti: `--ink` su `--bg` 16,72; su `--surface` 18,69. `--ink-muted` su `--bg` 6,90, su `--surface` 7,71, su `--surface-sunken` 6,15. Pillole di verdetto 4,51 / 4,57 / 4,51 / 6,37. Badge 14,90. Suggerimento della nav 18,69. `.field__error` dentro una card 4,62.

#### Task 3 — bersagli tattili

`.btn` da 40 a **44**. E `.btn--icon` da 40 a **44** di larghezza, che la story non chiedeva: quella classe dichiara il proprio `width`, quindi senza toccarla il pulsante sarebbe diventato 40×44 — un rettangolo, con la dimensione più stretta ancora sotto soglia proprio dove il bersaglio è tutto quello che c'è, perché lì non c'è una parola da mirare. Corretti anche i tre commenti che nominavano l'altezza vecchia (`.filters`, `.tags-add`, e quello di `.sidebar-toggle`).

Misurato `getBoundingClientRect()` su tutte e sei le rotte a 1280: **54 istanze di `.btn`, tutte a 44** (4 su `/clienti`, 3 su `/clienti/nuovo`, 29 sulla scheda cliente, 13 sul questionario, 4 sulla compilazione, 1 su `/accedi`); le due frecce di riordino **44×44**; il toggle **36×36**; il sommario del cestino **64**.

**`.sidebar-toggle` resta 36×36**, e il commento lo dice ora come decisione e non come ripiego: la fascia del brand è alta 44 e un 44 accanto ne rovina l'equilibrio verticale; sotto i 720, che è dove il tocco è il caso vero, il toggle non c'è affatto.

**`SignOutButton` — la prescrizione della story copriva metà del problema.** «Nascondere il piede da collapsed» funziona per la richiusa *per scelta*, dove il toggle esiste e riaprire è un clic. Sotto i 720 il toggle è `display: none`: nascondere il piede lì avrebbe reso l'uscita dalla sessione **irraggiungibile** su telefono e tablet, cioè un difetto peggiore di quello chiuso. I due stati richiusi sono due (`design-system.md` §5 lo dice da sé) e si chiudono in due modi. Misurato: la colonna a 56 con gli 8+8 della `.sidebar` lascia 40, i 12+12 del piede li riducevano a 16, `Esci` chiedeva **62,1** e sforava di **26,1** oltre il bordo. Tolto il padding del piede e portato quello del pulsante da 16 a 4: **39 dentro 40**, cioè 9px di margine, misurati su tutte e sei le rotte. Il testo non si taglia — la parola da sola misura 30,1, a stringersi è il contorno. I 39 restano sotto i 44 orizzontali: è una proprietà del rail (anche le voci della nav lì stanno in 40), è a ledger con la sua misura, e l'altezza è 44 in tutti e due i casi.

**`Esporta`** confermato come `<a>` con `title="Scarica il file markdown"` e `aria-label="Esporta la scheda in markdown"`. La voce a ledger si chiude per l'affordance e **resta annotata per il comportamento da tastiera**: la barra spaziatrice su un `<a>` non si supporta senza JavaScript, e aggiungerlo per una pressione sarebbe una regressione del clic che funziona senza.

#### Task 4 — etichette e nomi accessibili (AC3)

**Passata su ogni controllo di modulo del progetto, contata: 39 controlli reali** (escludendo tre `<select>`/`<input>` che comparivano solo dentro commenti). Tutti etichettati: **22** con `<label htmlFor>` diretto, **13** attraverso lo `{...shared}` dei componenti di campo, **3** con la `<label>` che avvolge la casella, **1** `type="hidden"`. **Zero senza etichetta** — AC3 passava già, e questa è la misura che lo dice invece di dichiararlo.

**Nomi accessibili distinti** su `Modifica`, `Sposta su`/`Sposta giù` (con `il blocco`/`la domanda` a seconda del tipo), `Disattiva`/`Riattiva`, `Rinomina`. `Elimina` e `Ripristina` li avevano già. Ne è emersa una settima famiglia che la story non contava: gli **otto `Aggiungi domanda`**, uno per blocco, tutti chiamati allo stesso modo — ora dicono a quale blocco aggiungono. Il file è nella tabella della story, il difetto è lo stesso dei ventitré «Modifica», e la parola a schermo non cambia.

**Il campo opzioni** ha `aria-controls` sul selettore del tipo, valorizzato **solo** quando il campo esiste — puntare a un id assente sarebbe una relazione dichiarata e falsa — più una zona `aria-live="polite"` che sta **fuori** dal ramo condizionale, perché una regione nata insieme al campo non annuncerebbe la propria comparsa. La zona usa la nuova `.visually-hidden`, che è `position: absolute` per una ragione precisa: dentro `.form`, un flex con `gap: 20px`, un contenitore vuoto ma nel flusso avrebbe aggiunto 20px di vuoto alla colonna. `display:none` e `visibility:hidden` non erano opzioni — spengono la regione live.

Fuori perimetro e a ledger: `Salva`/`Annulla` della scheda cliente hanno lo stesso nome fino a dodici volte (attenuato dal fatto che compaiono solo sui campi cambiati).

#### Task 5 — movimento ridotto (AC4)

**Verificato nelle dichiarazioni, non nella corrispondenza della media query, e la differenza va detta.** Gli strumenti del pane non espongono `Emulation.setEmulatedMedia` e la preferenza di sistema non si cambia da qui.

Cosa è stato misurato. Il blocco esiste, letto dal CSSOM: condizione `(prefers-reduced-motion: reduce)`, selettore `*, ::before, ::after`, tre dichiarazioni con `!important`. Applicando **le stesse dichiarazioni** a forza:

| Elemento | Prima | Dopo |
|---|---|---|
| `.shell` (larghezza della nav, `grid-template-columns`) | 0,22s | 0,00001s |
| `.sidebar` (`padding`) | 0,22s | 0,00001s |
| `.sidebar__brand-text` (`opacity, max-width`) | 0,22s, 0,22s | 0,00001s |
| `.nav__item::after` (suggerimento, `opacity`) | 0,15s | 0,00001s |
| `.skeleton` (`pulse`) | 1,2s, `infinite` | 0,00001s, **1** |

Nessun `animation` d'autore scavalca la regola universale: non c'era niente da correggere. Quello che resta da vedere con un occhio umano è che il sistema operativo accenda davvero la query, ed è già in elenco nella verifica di sessione. A ledger.

#### Task 6 — colore mai unico portatore (AC5)

Otto punti verificati, tutti con la propria parola accanto: pillola di stato (fondo neutro + punto colorato + parola), pillola di verdetto (tinta + parola), `.field__error` (colore + messaggio + `role="alert"`), indicatore di salvataggio (tre stati, tre testi diversi), barra di avanzamento (`aria-hidden`, raddoppia il contatore in cifre), voce attiva della nav (etichetta o suggerimento, più `aria-current="page"`), alone del fuoco (posizione del cursore, non stato di un dato), colori di sezione (il nome della sezione c'è).

**Grep di sanità**, dieci usi in `globals.css` e **zero nei `.tsx`** — che è anche la prova della regola «nessun esadecimale fuori dai token»: `.pill--attivo .pill__dot` (parola `attivo` dentro la pillola), le tre `.pill--verdetto-*` (la parola del verdetto), `.btn--danger` (il testo **è** `Elimina`), `.field__error` × 2, `.save-indicator--failed` (`Non salvato, riprovo`), `.error-box`, `.warn-box`. Niente da correggere.

#### Task 7 — `aria-busy` invece di `disabled`

**26 attributi in 20 file**, non i sette elencati. La regola applicata: dove `disabled={pending}` stava su un **pulsante** — per impedire un secondo clic, non per dire che l'azione è inammissibile — diventa `aria-busy={pending}` e il pulsante resta focalizzabile. Le frecce di `move-buttons.tsx` hanno richiesto di separare le due semantiche che erano fuse in `disabled={pending || isFirst}`: il bordo resta un `disabled` vero (spostare più su del primo posto è inammissibile), il volo diventa `aria-busy`.

**Gli input restano `disabled`**, per istruzione esplicita della story: passare a `readOnly` cambia il rinvio del modulo con Invio e va riverificato modulo per modulo. Conseguenza dichiarata: la voce a ledger 84 si chiude **per la metà dei pulsanti** e resta aperta per quella dei campi.

Una voce che la story dava per chiudibile e non lo è: la **83**, il fuoco che cade sul body creando il primo blocco dallo stato vuoto. Non nasce da `disabled` ma da uno **smontaggio** — l'istanza di `NewBlockForm` dello stato vuoto sparisce quando la rivalidazione cambia ramo — e nessun `aria-*` fa atterrare un fuoco su un elemento che non esiste più. Annotata, non barrata.

#### Task 8 — zona live singola e `clearError`

`save-indicator.tsx`: `role="status"` sull'intera riga diventa `aria-live="polite"` sul **solo testo**, e `Riprova` esce dalla regione. Prima ogni fallimento riannunciava anche il pulsante, e un pulsante è un controllo, non un annuncio. **La metà «due volte per pausa» resta aperta**: giudicare quanto un indicatore debba parlare richiede una sessione con VoiceOver.

`clearError` in `useEffect` sulla prop che cambia con lo stato — `completionStatus` per `completion-button.tsx`, `isActive` per `question-active-button.tsx`. Serve perché il messaggio nomina la destinazione: senza, un «La scheda non è stata chiusa» resterebbe sotto un pulsante che nel frattempo dice `Riporta in bozza`, cioè una frase falsa.

**Annuncio di riuscita**: la parola dello stato di compilazione è ora una zona `aria-live="polite"` con un id, e il pulsante la nomina con `aria-describedby`. Nessun testo nuovo a schermo — la parola c'era già — è una relazione dichiarata.

#### Task 9 — `.main { min-width: 0 }` sulle rotte non guardate

**Sei numeri per sei rotte**, `documentElement.scrollWidth` contro `clientWidth` a 375. **Il questionario sforava di 18px**, e la causa non era `.main`: il titolo (134,8) più i 16 di stacco più l'interruttore di modalità (170,3) chiedevano **321,1** dei **287** disponibili, e `.mode` non si stringe perché le sue due voci hanno `padding: 0 14px`.

Rimedio locale al contenuto come la story prescrive: `flex-wrap: wrap` su `.page-header`. `.page-header__actions` lo aveva già, ed è il motivo per cui la compilazione — che porta quattro figli — non sforava; qui la stessa regola sale di un livello. Sopra i 375 non cambia niente: quando ci sta, `space-between` dispone come prima.

| Rotta | Prima | Dopo |
|---|---|---|
| `/clienti` | 0 (la tabella scorre nei suoi 239 contro 576,1) | 0 |
| `/clienti/nuovo` | 0 | 0 |
| `/clienti/<id>` | 0 | 0 |
| `/questionario` | **18** | **0** |
| `/clienti/<id>/schede/<id>` | 0 | 0 |
| `/accedi` | 0 | 0 |

#### Task 10 — verifica di forma finale

A **1280**: nessuna eccedenza su nessuna rotta; 54 `.btn` tutti a 44; frecce 44×44; toggle 36×36; sommario del cestino 64; i gruppi di azioni delle domande allineati a x=893 su tutte e tre le righe, con quello dell'intestazione del blocco a 997, cioè sopra le ultime due colonne come `design-system.md` §5 prescrive.

A **375**: eccedenza **0** su tutte e sei; `.btn` minimo 44; `Esci` 9px dentro il rail.

`npm run typecheck` senza uscita. `npm run build` riuscito. `npm test`: **287 test, 287 passati**. La story diceva «resta a 267»: il numero era già scaduto quando è stata scritta — questa story non porta nessun test nuovo, e i cambi sono tutti CSS o `aria-*` verificati a schermo.

#### Cosa questa story non ha verificato

Va scritto qui e non solo a ledger, perché la story stessa dice che una promessa di accessibilità non verificata è peggio di un difetto conosciuto.

- **Nessuna sessione con un lettore di schermo.** Gli annunci `aria-live`, i nomi accessibili e l'annuncio di `aria-busy` sono verificati **nel DOM**, non all'orecchio. Le tre righe sono già nella verifica di sessione.
- **`prefers-reduced-motion` non è stato emulato**, solo le sue dichiarazioni applicate a forza (v. Task 5).
- **Il ritorno del fuoco dopo la rivalidazione** (Task 7, ultima riga) non è osservabile senza server: la riproduzione statica non ha server action. Quello che si può dire è che il pulsante non si spegne più, quindi il fuoco non se ne va **all'andata**; se il rimontaggio al ritorno lo perda resta da vedere in sessione.

### File List

**Modificati**

- `src/app/globals.css` — `--ink-faint` scurito; `--focus-tint`/`--focus-color` nuovi e tre regole `.shell:has(…)`; i tre aloni del fuoco; `.btn` 44 e `.btn--icon` 44; `.error-box`, `.warn-box`, `.btn--danger`, `.save-indicator--failed` sugli inchiostri; `.trash .field__error` nuova; `.sidebar--collapsed .sidebar__foot` nuova; `.page-header` che va a capo; il piede e il suo pulsante nella media query dei 720; `.visually-hidden` nuova; quattro commenti corretti
- `src/app/(app)/layout.tsx` — `<main>` esce dal layout, con la nota per chi aggiunge una foglia
- `src/lib/use-write.ts` — guardia `inFlight` sul doppio clic
- `src/components/save-indicator.tsx` — `aria-live` sul solo testo, `Riprova` fuori dalla regione
- `src/app/(app)/sidebar-toggle.tsx` — `aria-busy`, guardia sul clic
- `src/app/(app)/error.tsx`, `src/app/(app)/not-found.tsx` — `<main>` proprio
- `src/app/(app)/clienti/page.tsx`, `loading.tsx`, `nuovo/page.tsx`, `[id]/page.tsx`, `[id]/loading.tsx` — `<main className="main section--clienti">`
- `src/app/(app)/questionario/page.tsx`, `loading.tsx` — `<main className="main section--questionario">`
- `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx`, `loading.tsx` — `<main className="main section--prequalifica">`; più la zona live sullo stato, `aria-describedby` e i due attributi su `Esporta`
- `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx` — `clearError`, `aria-describedby`, `aria-busy`
- `src/app/(app)/questionario/move-buttons.tsx` — `name`, le due semantiche separate, `aria-label`
- `src/app/(app)/questionario/question-item.tsx`, `block-card.tsx`, `question-active-button.tsx`, `block-title-form.tsx` — `aria-label` che nomina la domanda o il blocco
- `src/app/(app)/questionario/new-question-form.tsx`, `edit-question-form.tsx` — `aria-controls`, zona live, `aria-label` col blocco
- `aria-busy` al posto di `disabled` anche in: `clienti/[id]/client-field-form.tsx`, `client-tags-form.tsx`, `person-roles-form.tsx`, `person-restore-form.tsx`, `person-remove-form.tsx`, `person-field-form.tsx`, `new-person-form.tsx`, `new-assessment-form.tsx`, `clienti/nuovo/new-client-form.tsx`, `questionario/restore-button.tsx`, `delete-button.tsx`, `new-block-form.tsx`
- `docs/design-system.md` — §2, §5, §8, §9
- `docs/bmad/implementazione/deferred-work.md` — quattordici voci barrate, sette annotate, sezione nuova con quattro voci
- `docs/bmad/implementazione/sprint-status.yaml`

**Nessun file creato, nessuna migrazione, nessun test nuovo.**

### Review Findings

Revisione del 12 agosto 2026, tre livelli in parallelo (avversariale cieco, cacciatore di casi limite, revisore di accettazione) più verifica sul codice reale. 17 voci sopravvissute alla triage, 2 scartate come rumore. **Le tre decisioni sono state prese da Luca e applicate, e i dodici patch con loro; restano aperte le due voci rimandate.**

**Le tre decisioni, e cosa hanno prodotto.** (1) *Alone del fuoco:* contorno pieno più alone in tinta — `outline: 2px solid var(--focus-color)` con `outline-offset: 3px`, così l'alone da 3px di §8 resta com'è e il contorno gli si chiude intorno. (2) *`Annulla`:* torna `disabled={pending}` sui soli pulsanti che annullano, nove moduli; `aria-busy` resta su quelli che l'azione la fanno. (3) *Stato occupato:* una regola `button[aria-busy='true']` che riprende `opacity` e `cursor` di `:disabled`, cioè il riscontro visivo che la story aveva tolto senza sostituirlo.

**Le tre cose che erano scritte come vere e non lo erano**, e vale la pena tenerle insieme perché hanno tutte la stessa forma — una promessa scritta in tre posti e applicata in nessuno. La chiusura di `SignOutButton` raccontava due stati richiusi trattati in due modi, e il CSS ne trattava uno solo. Il ledger dava la quinta istanza del fuoco per caduta, e quella voce nominava il bordo, che è l'unico caso rimasto aperto. Il Task 7 fondava tutta la passata su «`useTransition` fa già lo stesso», e non lo fa — è il motivo per cui due moduli sono rimasti senza guardia, uno dei quali perdeva un tag.

**Numeri della verifica**, riproduzione statica col `globals.css` vero, fuoco reale da tastiera (`document.hasFocus()` vero, `:focus-visible` corrisponde):

| Cosa | Misura |
|---|---|
| Piede a 375 con `sidebar--collapsed` dal cookie | `display: block` (era `none`), toggle `none` come previsto |
| `Esci` nel rail stretto | **39** dentro 56, bordo destro 47 contro 56, altezza 44 |
| Eccedenza di pagina a 375 | **0** |
| Alone del fuoco, sezione clienti | `2px solid rgb(58,79,222)` offset 3, alone `rgb(232,234,253) 0 0 0 3px` |
| Alone del fuoco, questionario | `rgb(116,64,218)` con alone `rgb(239,231,252)` |
| Alone del fuoco, prequalifica | `rgb(10,126,144)` con alone `rgb(223,241,243)` |
| Il toggle, che è **sorello** di `<main>` | prende `--focus-color` della sezione in tutti e tre i casi |
| Contorni pieni sul fondo peggiore (`--bg`) | clienti **5,60:1**, questionario **5,39:1**, prequalifica **4,27:1** — soglia §1.4.11 è 3:1 |
| `button[aria-busy='true']` | `opacity: 0.5`, `cursor: progress`; `:disabled` resta 0.5 / `default` |

`npm run typecheck` senza uscita, `npm run build` riuscita, `npm test` **287 su 287**.

**Decisioni da prendere**

- [x] [Review][Decision] **L'alone del fuoco sta a 1,07:1 su `--bg` e 1,19:1 su `--surface`: AC2 è chiuso misurando il colore, non la visibilità** — `:focus-visible` (`globals.css:155-159`) porta `outline: none` più `box-shadow: 0 0 0 3px var(--focus-tint)`, e la tinta è tutto quello che resta perché il contorno predefinito del browser è tolto. Misurato con la stessa formula WCAG del Task 2: `--sec-clienti-tint` `#E8EAFD` sta a **1,19:1** su `--surface` e a **1,07:1** su `--bg`; SC 1.4.11 chiede 3:1 su un indicatore di fuoco. I campi si salvano perché `.input:focus` porta anche `border-color: var(--focus-color)`, che è il colore pieno; pulsanti e collegamenti no, e sono la maggioranza dei bersagli da tastiera. §8 dichiara le cinque righe «dal 12 sono misurate», e per il fuoco è misurato che il colore corrisponda alla sezione, mai che si veda. Non è un difetto introdotto qui — la tinta era la stessa prima — ma è la voce che AC2 chiude. Le strade: (A) aggiungere `outline: 2px solid var(--focus-color)` accanto all'alone, che tiene la tinta di §8 e aggiunge il bordo che si vede; (B) portare l'alone al colore pieno, che supera la frase di §8 «alone di 3px nella tinta»; (C) dichiarare la deroga con il numero scritto. Serve la scelta di Luca perché B e C toccano una riga del design system.
- [x] [Review][Decision] **`aria-busy` sui pulsanti `Annulla`, e `Annulla` premibile durante il volo che non annulla niente** — otto moduli: `new-person-form.tsx:120`, `new-assessment-form.tsx:124`, `new-block-form.tsx:101`, `new-question-form.tsx:206`, `edit-question-form.tsx:216-232`, `block-title-form.tsx:159-170`, `person-roles-form.tsx:101-111`, più le due conferme distruttive `delete-button.tsx:121-128` e `person-remove-form.tsx:85-92`. Due cose insieme. La prima: `aria-busy` descrive lo stato **dell'elemento su cui sta**, e un `Annulla` non sta eseguendo niente — l'attributo è falso per costruzione. La seconda, che pesa di più: senza `disabled` il pulsante è premibile mentre la scrittura vola, e chiude il modulo o riporta il campo al valore vecchio mentre l'azione arriva a destinazione. Sulle due conferme distruttive `Annulla` si legge come «non farlo» e la riga finisce nel cestino lo stesso. La motivazione del Task 7 — non scaricare il fuoco sul body — su un `Annulla` quasi non si applica, perché quel pulsante sparisce comunque a fine azione. Le strade: (A) rimettere `disabled={pending}` sui soli `Annulla`, lasciando `aria-busy` sui pulsanti che l'azione la fanno; (B) tenerli focalizzabili e mettere `if (pending) return` nel gestore. Serve la scelta di Luca perché rovescia in parte una decisione presa dalla story su nove file.
- [x] [Review][Decision] **Nessuna regola CSS per `[aria-busy]`: dove l'etichetta non cambia, il secondo clic non fa niente e niente lo dice** — `globals.css`, zero occorrenze di `aria-busy` (verificato). `.btn:disabled { opacity: 0.5; cursor: default }` (`:841`) era l'unico riscontro visivo, e la story lo toglie da 26 pulsanti. Dove l'etichetta cambia (`Salva` → `Salvataggio…`) il riscontro resta; dove non cambia — le due frecce di `move-buttons.tsx`, la `×` dei tag, il toggle della sidebar, tutti gli `Annulla` — il pulsante appare normale, il clic viene assorbito dalla guardia `inFlight` e nessuno lo dice. Le strade: (A) una regola `[aria-busy='true']` che riprende `opacity` e `cursor` di `:disabled`, cioè lo stato che c'era; (B) lasciare com'è, dichiarando che il riscontro è l'etichetta dove c'è e che altrove il gesto è troppo breve per accorgersene. Serve la scelta di Luca perché è uno stato visivo nuovo, e §5 non lo descrive.

**Da correggere**

- [x] [Review][Patch] **Nav richiusa dal cookie più schermo sotto i 720: spariscono insieme il piede e il toggle, e la sessione non si chiude più** [src/app/globals.css:441-443] — `.sidebar--collapsed .sidebar__foot { display: none }` sta **fuori** da ogni media query. Dentro `@media (max-width: 720px)` il toggle sparisce (`:1888-1890`) e il piede riceve solo `padding: 0` (`:1903-1905`): nessuna riga ridichiara `display`, e la specificità della prima regola (0,2,0) batte comunque quella della seconda (0,1,0). La classe `sidebar--collapsed` non dipende dalla larghezza ma dal cookie (`layout.tsx:22,26`), quindi basta stringere la nav sul portatile e riaprire l'app sul telefono: niente `Esci` e niente toggle per riespandere. È esattamente il difetto che il commento a `:1892-1897` dichiara di evitare, che `design-system.md` §5 promette per iscritto («*Richiusa per larghezza*: **il piede resta e il pulsante si stringe**») e che il ledger 204 scrive come chiuso. Correzione: `display: block` su `.sidebar--collapsed .sidebar__foot` dentro la media query.
- [x] [Review][Patch] **`client-tags-form.tsx`: la `×` perde l'unica guardia e `removeClientTag` è read-modify-write — un tag tolto può tornare** [src/app/(app)/clienti/[id]/client-tags-form.tsx:92-114] — il `write()` locale non ha nessun `if (pending) return`: la guardia sta solo nell'`onSubmit` (`:133`), che copre l'aggiunta e non la rimozione. Il file non passa da `useWrite`, quindi la ref `inFlight` della 5.2 non lo protegge, e il pulsante a `:166` è passato da `disabled={pending}` ad `aria-busy={pending}`. `removeClientTag` (`clienti/actions.ts`) legge `tags`, filtra e riscrive l'array intero: con `[a,b,c]` e due `×` premute di seguito, la prima scrive `[b,c]` e la seconda — che aveva letto `[a,b,c]` — scrive `[a,c]`. `a` è tornato e tutte e due le azioni dicono che è andata bene. Prima era strutturalmente impossibile. Correzione: `if (pending) return` in testa a `write()`.
- [x] [Review][Patch] **`new-client-form.tsx`: `aria-busy` senza guardia su un `useActionState` — due `Salva` sul percorso del doppione confermato creano due clienti** [src/app/(app)/clienti/nuovo/new-client-form.tsx:76] — il file usa `useActionState`, non `useWrite` né `useTransition`, quindi nessuna delle due guardie che il Task 7 dà per acquisite lo tocca. Il caso: dopo l'avviso di doppione il campo nascosto `duplicate_of` è valorizzato (`:37`), quindi due invii ravvicinati portano entrambi lo stesso valore, superano `alreadyWarned` (`clienti/actions.ts`) senza rifare `findExistingName` e fanno due `insert`. Sul percorso pulito il difetto non si presenta, perché il secondo invio trova il primo cliente e torna l'avviso. Correzione: guardia su `pending` prima di `formAction`.
- [x] [Review][Patch] **L'avviso distruttivo sulle opzioni non è annunciato, e la voce a ledger 97 è barrata coprendone metà** [src/app/(app)/questionario/edit-question-form.tsx:164-175] — la zona `aria-live` annuncia solo la direzione **additiva**, `'Aggiunto il campo: opzioni, una per riga.'`; nella direzione opposta il testo torna a `''`, e una rimozione da una regione live con `aria-relevant` predefinito non produce nessun annuncio. Nello stesso momento compare a `:164-166` l'avviso «Questo tipo non usa opzioni: salvando, quelle scritte si perdono», dentro un `.meta` senza nessun ruolo live. Chi non vede lo schermo sente la comparsa innocua e non la perdita di dati imminente — cioè si annuncia la metà che non serve. Idem in `new-question-form.tsx`. Il commento a `:169-172` lo dichiara come scelta («quello si legge, questo si sente»), ma la voce di ledger nominava anche quella riga d'avviso. Correzione: dare un testo anche al ramo opposto.
- [x] [Review][Patch] **`move-buttons.tsx`: spostare fino al bordo spegne il pulsante appena premuto, e il commento dà la voce per chiusa** [src/app/(app)/questionario/move-buttons.tsx:93,106] — `disabled={isFirst}` e `disabled={isLast}` restano, giustamente, perché sono l'inammissibilità. Ma il caso vero della voce a ledger era proprio quello: si preme `Sposta su` sulla seconda domanda, la rivalidazione la porta in prima posizione, `isFirst` diventa vero, il pulsante che ha il fuoco si disabilita e il fuoco cade sul body. Il commento a `:37-45` attribuisce la perdita di fuoco al solo `pending` e dichiara chiusa la quinta istanza; il ledger la barra di conseguenza. Correzione minima: dire il vero nel commento e nel ledger — il volo è chiuso, il bordo no. Il rimedio vero (rimettere il fuoco sull'altra freccia, o `aria-disabled` invece di `disabled`) è una scelta di forma e va a ledger.
- [x] [Review][Patch] **Due commenti CSS rimandano ancora alla Story 5.2 una voce che la 5.2 ha chiuso** [src/app/globals.css:1486-1490] — «`.input:focus` dichiara da sempre `--sec-prequalifica` … è la voce rimandata del 2 agosto, assegnata alla Story 5.2 … Chi chiuderà quella voce deve saperlo», mentre `.input:focus` legge ora `var(--focus-color)` e `var(--focus-tint)`. Stessa cosa a `:1271-1276`: «quell'alone è una voce a ledger assegnata alla Story 5.2». È la Trappola 5 delle Dev Notes applicata all'altro token: il Dev Agent Record dichiara corretti solo i tre commenti che nominavano l'altezza vecchia.
- [x] [Review][Patch] **`design-system.md` §5 contraddice §2 e il CSS sul pulsante distruttivo** [docs/design-system.md:299] — la tabella dei pulsanti dice ancora «distruttivo | testo `--bad`, fondo `--bad` in tinta chiara al passaggio», mentre §2 (riga aggiunta da questa story) e `globals.css:895-912` dicono `--bad-ink` in tutti e due gli stati.
- [x] [Review][Patch] **`design-system.md` §2 dichiara due usi di `--ink-faint`, ce ne sono tre** [docs/design-system.md] — «gli usi sono due soltanto e sono quelli giusti: `.save-indicator` a riposo e il punto della pillola di stato». Il terzo è `src/app/(app)/error.tsx:29`, `style={{ color: 'var(--ink-faint)' }}` sul riferimento del digest — e il commento aggiunto in `globals.css:10-16` lo nomina, quindi i due documenti che questa story tocca insieme dicono cose diverse. Il contrasto passa (5,12:1 su `--surface`), è l'enumerazione a essere falsa.
- [x] [Review][Patch] **Ledger riga 204 annotata ma non barrata, e il testo della chiusura descrive un comportamento che il CSS non ha** [docs/bmad/implementazione/deferred-work.md:204] — il Task 11 la dava barrata; la riga comincia con `- **` e non con `- ~~**`. In più il testo della chiusura racconta i due stati richiusi come risolti in due modi diversi, che è quello che il difetto in cima a questa lista mostra non essere vero. Le due correzioni vanno insieme.
- [x] [Review][Patch] **La larghezza di `Esci` nel rail stretto è scritta con due numeri diversi, e l'annotazione ne ricava un terzo impossibile** [src/app/globals.css:1901] — il commento CSS dice «viene **38,1** dentro 40»; `design-system.md` §5 e §8 dicono «**39** dentro 40» e «è largo 39»; il ledger 204 dice «39 dentro 40 — **9px di margine**», che con quei due numeri fa 1. In un progetto che tratta la misura come prova, due valori per una misura sola tolgono valore a entrambi.
- [x] [Review][Patch] **Il commento di `completion-button.tsx` dice che `clearError` è stabile; non lo è, e il gemello scritto nella stessa story dice il contrario** [src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx] — `use-write.ts` restituisce `clearError: () => setError(null)`, cioè una chiusura nuova a ogni render. `question-active-button.tsx` lo scrive giusto: «è una funzione nuova a ogni render, e metterla lì farebbe girare l'effetto per sempre». Chi seguisse il primo commento e la mettesse fra le dipendenze si aspetterebbe un no-op.
- [x] [Review][Patch] **Due regole CSS diventate morte nello stesso commit** [src/app/globals.css:284-287] — `.sidebar-toggle:disabled` e `.tag__remove:disabled` (`:1161-1164`): nessuno dei due elementi può più essere `disabled` (`sidebar-toggle.tsx:52`, `client-tags-form.tsx:166`). `kb-0.md` §2 e `AGENTS.md` chiedono di cancellare il codice morto, non di lasciarlo.

**Rimandato**

- [x] [Review][Defer] **La passata `aria-busy`, dichiarata esaustiva sui pulsanti, salta `SignOutButton`** [src/components/sign-out-button.tsx:20] — è un `<button className="btn btn--secondary" … disabled={busy}>`, cioè esattamente la forma che il Task 7 descrive, e resta invariato benché il Task 3 si occupi a lungo dello stesso pulsante. Rimandato: dopo l'uscita il componente sparisce con la rotta, quindi il fuoco non ha dove tornare e `disabled` non fa danno — ma la passata non è esaustiva come dichiarata.
- [x] [Review][Defer] **`save-indicator.tsx`: con `role="status"` se n'è andato l'`aria-atomic` implicito, e la comparsa di `Riprova` non è più annunciata da niente** [src/components/save-indicator.tsx:46] — il cambio chiude giustamente il riannuncio del pulsante, ma è uno scambio e non un guadagno netto: al fallimento si sente «Non salvato, riprovo» e basta, mentre prima la regione conteneva anche il rimedio. Rimandato: giudicare quanto un indicatore debba parlare richiede una sessione con un lettore di schermo, che questa story dichiara già di non avere fatto.

**Scartate come rumore (2)**

- La zona live delle opzioni che «annuncia all'apertura» su una domanda già `scelta_singola`: la regione nasce insieme al suo contenuto, e un contenuto iniziale non si annuncia.
- `inFlight` senza timeout: una promessa che non si risolve mai lascia il pulsante inerte, ma `disabled={pending}` aveva esattamente la stessa proprietà. Non è una regressione.
