---
baseline_commit: d523a4f
---

# Story 5.2: Passata di accessibilità verificata

Status: ready-for-dev

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

- [ ] **Task 1 — `--focus-tint` per sezione corrente** (AC: 2)

  - [ ] `src/app/globals.css`: aggiungere il token nuovo in `:root`, subito dopo `--ink-inverse`:
    ```css
    /* Alone del focus per la sezione corrente. Ripiego a `--sec-clienti-tint` per le rotte che
       non stanno dentro una sezione (per esempio `/accedi`). Ogni sezione lo sovrascrive nel
       proprio scope, sotto in questo file. */
    --focus-tint: var(--sec-clienti-tint);
    ```
  - [ ] Le tre righe di alone che oggi portano tinte diverse diventano tutte `var(--focus-tint)`:
    - `:focus-visible` universale (`globals.css:116`): `box-shadow: 0 0 0 3px var(--focus-tint)`.
    - `.input:focus` (`globals.css:828`): `box-shadow: 0 0 0 3px var(--focus-tint)` e `border-color: var(--focus-color, var(--sec-clienti))` — sì, servono due token, uno per l'alone (chiaro) e uno per il bordo (pieno). Aggiungere anche `--focus-color: var(--sec-clienti)` in `:root` con la stessa logica di sovrascrittura.
    - `.sidebar-toggle:focus-visible` (`globals.css:237`): `outline: 3px solid var(--focus-tint)` e il commento sopra si sostituisce con una riga sola: «alone nella tinta della sezione corrente, che qui è quella della rotta corrente perché la sidebar sta fuori dai selettori di sezione».
  - [ ] Le sezioni sovrascrivono `--focus-tint` e `--focus-color` sul proprio `<main>` di rotta. Regole nuove in `globals.css`, subito dopo la sezione `:root`:
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
  - [ ] Applicare la classe di sezione sul `<main>` delle rotte:
    - `src/app/(app)/clienti/page.tsx`: `<main className="main section--clienti">`.
    - `src/app/(app)/clienti/[id]/page.tsx`: idem.
    - `src/app/(app)/clienti/nuovo/page.tsx`: idem.
    - `src/app/(app)/questionario/page.tsx`: `<main className="main section--questionario">`.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx`: `<main className="main section--prequalifica">`. **La schermata di compilazione è la sezione prequalifica**, non clienti — è il modello mentale di §5 di `design-system.md` (il colore vive nella navigazione, la compilazione è la sezione che ha `--sec-prequalifica`).
    - **Cambio strutturale:** oggi `layout.tsx` rende `<main className="main">{children}</main>`. Questo pattern deve cambiare: `layout.tsx` non rende più `<main>`, e ogni `page.tsx` rende il suo con la classe di sezione. Alternativa più stringente: `layout.tsx` legge il pathname… no, torna Server Component che non ha pathname. La strada scelta — `<main>` sulla rotta — costa una riga per rotta e non tocca il layout.
  - [ ] `src/app/globals.css` — modificare la regola `.main` (già esiste, cerca `.main {`) per non contenere `<main>` di default ma per fare da classe: nulla cambia, `.main` resta la stessa; le rotte aggiungono `section--*` accanto.
  - [ ] Verifica di forma con la riproduzione statica CDP-driven: aprire ogni rotta con la classe applicata, misurare `getComputedStyle(document.querySelector('.input')).boxShadow` e confermare che il colore è quello della sezione corrente. Numeri nel Dev Agent Record.

- [ ] **Task 2 — Contrasto: `.error-box`, `.warn-box` e verifica su tutti i testi** (AC: 1)

  - [ ] `src/app/globals.css:1420`: `.error-box { color: var(--bad); }` → `color: var(--bad-ink);`.
  - [ ] `src/app/globals.css:1433`: `.warn-box { color: var(--warn); }` → `color: var(--warn-ink);`.
  - [ ] Rimisurare **tutti** i contrasti del progetto con la formula WCAG. La lista minima da guardare, scritta nel Dev Agent Record con i numeri:
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
  - [ ] Se `--ink-faint` cade sotto 4,5:1 nei suoi usi principali, aprire una **Domanda in coda alle Dev Notes** e scegliere con Luca: cambiare il token, cambiare l'uso, o accettare la deroga con testo grande.

- [ ] **Task 3 — Bersagli tattili a 44px** (AC: —, UX-DR14 collaterale)

  - [ ] `src/app/globals.css:722`: `.btn { height: 40px; }` → `height: 44px;`.
  - [ ] I due commenti che nominano l'altezza vecchia vanno corretti nella stessa modifica:
    - `:554`: «`.input` è alto almeno 44 e `.btn` esattamente 40» → «`.input` è alto almeno 44 e `.btn` da questa story è alto 44».
    - `:1009`: idem se la stessa frase c'è (verificare con grep).
  - [ ] Verifica di forma: misurare `getBoundingClientRect().height` di `.btn` in tutti i suoi punti (`Salva`, `Annulla`, `Nuovo cliente`, `Crea il primo cliente`, `Chiudi la scheda`, `Riporta in bozza`, `Esporta`). Attesa 44 in tutti i casi. Numeri nel Dev Agent Record.
  - [ ] **`SignOutButton` sfora la sidebar richiusa** (voce 5-1 riga 204). Con `.btn` a 44 la larghezza minima cresce, e da collapsed il piede lascia 32 di larghezza utile. La decisione di questa story è **nascondere il pulsante da collapsed**, che è la strada che il ledger nomina per prima ed è la meno invasiva:
    ```css
    .sidebar--collapsed .sidebar__foot {
      display: none;
    }
    ```
    Con `SignOutButton` nascosto da collapsed, per uscire dalla sessione bisogna espandere la nav — un click sul toggle, un click su `Esci`. Non è un vincolo tecnico (D14: nessuno stato blocca nessuna azione), è una conseguenza della forma. Va dichiarato nel commento del CSS: «da collapsed il piede sparisce, per uscire dalla sessione si espande la nav».
    - Alternativa scartata (con motivo): dare al pulsante un'icona dedicata (icona `logout` a tratto). Costa un'icona in più in `nav-icons.tsx`, costa un secondo comando «esci» che sta accanto al toggle, e la fascia inferiore diventa una barra di controllo — una decisione di forma che nessun AC chiede.
    - Alternativa scartata (con motivo): comprimere il padding del pulsante con `overflow: hidden` sul piede. Rende il pulsante illeggibile a collapsed, cioè peggio che nascosto.
  - [ ] **Il `.sidebar-toggle` resta 36×36** con motivazione dichiarata nel commento del CSS, che va aggiornato:
    ```css
    /* **36×36, e la Story 5.2 conferma:** la fascia del brand è alta 44, un pulsante 44 accanto
       al testo del brand a 44 di altezza rovina l'equilibrio verticale. La classe di controllo è
       «pulsante di navigazione dentro una fascia di brand», che UX-DR14 non copre — non è un
       bersaglio dei 44 nel senso della regola, è un controllo secondario in una zona di navigazione.
       Voce a ledger chiusa dalla Story 5.2. */
    ```
  - [ ] **`Esporta` collegamento travestito da pulsante** (voce 4-3 riga 190). Restare `<a class="btn btn--secondary" href="…/esporta">` è quello che il Task 4 della 4.3 prescrive e la ragione è dichiarata: un `<Link>` naviga lato client e non scarica. Questa story **conferma** l'`<a>` e chiude il problema di affordance aggiungendo un titolo che dice cosa fa: `title="Scarica il file markdown"` più `aria-label="Esporta la scheda in markdown"`. La barra spaziatrice sull'`<a>` non si supporta senza JavaScript, e aggiungerlo per una richiesta è una regressione (il click naviga senza JavaScript, che è la promessa del `<a href>`). La chiusura della voce è per l'affordance testuale, non per il comportamento da tastiera, e va scritto nel Dev Agent Record perché la voce lo aveva nominato entrambi.

- [ ] **Task 4 — Etichette vere e nomi accessibili distinti** (AC: 3)

  - [ ] Passata su ogni campo del progetto per verificare che l'etichetta esiste come `<label>` associato o come `aria-label` esplicito. La lista dei posti da guardare:
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
  - [ ] **I nomi accessibili duplicati si distinguono**. `Modifica`, `Sposta su`, `Sposta giù`, `Disattiva`, `Riattiva` compaiono decine di volte nella pagina del questionario con lo stesso nome: chi naviga per elenco di pulsanti sente ventitré «Modifica» indistinguibili. La correzione è `aria-label` che include il testo della domanda o del blocco:
    - `question-item.tsx`: `<button aria-label={`Modifica la domanda "${question.text}"`}>Modifica</button>`.
    - `move-buttons.tsx`: `<button aria-label={`Sposta su la domanda "${question.text}"`}>` e simmetrico per giù. Idem per i blocchi.
    - `question-active-button.tsx`: `<button aria-label={`${active ? 'Disattiva' : 'Riattiva'} la domanda "${question.text}"`}>`.
  - [ ] **Il campo opzioni che compare/scompare col tipo di risposta va annunciato** (voce 2-4 riga 97). `new-question-form.tsx` e `edit-question-form.tsx` rendono il campo opzioni condizionalmente sul valore di `answer_type`. La correzione è **una relazione dichiarata**: aggiungere `aria-controls="question-options-field"` sul select del tipo, e l'ID sul contenitore del campo opzioni. In più `aria-live="polite"` su un contenitore che compare/scompare con un breve annuncio testuale: quando compaiono, la riga «Elenco delle opzioni, una per riga» compare per prima ed è il testo di aiuto già presente — che quindi funziona come annuncio se il contenitore è `aria-live`. Verifica con VoiceOver: cambiando tipo da `testo lungo` a `scelta singola`, l'annuncio dice «Elenco delle opzioni, una per riga».

- [ ] **Task 5 — `prefers-reduced-motion` verificato** (AC: 4)

  - [ ] La regola universale c'è già in `globals.css:120-128`: `animation-duration: 0.01ms`, `transition-duration: 0.01ms`, `animation-iteration-count: 1`. Il selettore `*` copre tutto — verificarne il funzionamento con la riproduzione statica CDP-driven, applicando `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })` e misurando che:
    - La transizione della sidebar da espansa a richiusa dura ~0ms (`getComputedStyle(sidebar).transitionDuration` = `0.01ms`).
    - L'animazione `pulse` degli scheletri (`:1445`) ha `iteration-count: 1` e non lampeggia più.
    - La transizione del brand-text (`.sidebar__brand-text`, `:196-197`) dura ~0ms.
    - La transizione dei tooltip (`:196` sui `.nav__item::after`) dura ~0ms.
  - [ ] Numeri nel Dev Agent Record, per ognuna delle quattro voci.
  - [ ] Se qualche `animation` sfugge alla regola universale (per esempio se qualcuno ha scritto `animation: pulse 1.2s !important`), va corretto qui.

- [ ] **Task 6 — Colore mai unico portatore di significato** (AC: 5)

  - [ ] Verifica di completezza su ogni punto in cui un colore comunica qualcosa. La lista minima:
    - **Pillola di stato del cliente** (`status-pill.tsx`): fondo `--neutral-tint` + punto colorato + testo. **Testo presente**: passa.
    - **Pillola di verdetto** (`verdict-pill.tsx`): fondo in tinta + testo. **Testo presente**: passa.
    - **Riga d'errore** (`.field__error`): colore rosso + testo. **Testo presente**: passa.
    - **Indicatore di salvataggio** (`save-indicator.tsx`): tre stati con tre colori + tre testi diversi. **Testo presente**: passa.
    - **Barra di avanzamento** (`.progress__bar`): riempimento colorato + contatore in testo. **Testo presente**: passa. La barra è `aria-hidden`, coerente con la regola: non trasmette l'informazione, la doppia.
    - **Voce attiva della nav**: fondo `--surface-sunken` + icona nel colore della sezione + barra verticale. **Testo presente** (l'etichetta o, da collapsed, il tooltip su hover) e `aria-current="page"` sulla `<Link>`: passa.
    - **Alone del focus**: solo colore. **Ma il focus non trasmette un significato di stato del dato**, trasmette la posizione del cursore da tastiera. Non è un caso di UX-DR2 e non richiede un testo: passa.
    - **Colori di sezione nella nav**: distinguono le sezioni. Il nome della sezione c'è come etichetta (o come tooltip), quindi il colore non è unico portatore: passa.
  - [ ] Se qualcosa non passa, aprire una voce a ledger e correggere qui.
  - [ ] Grep di sanità: `grep -rn 'var(--bad)\|var(--warn)\|var(--ok)' src/` e verificare che ogni uso porti anche un testo. Numeri nel Dev Agent Record.

- [ ] **Task 7 — `aria-busy` sui pulsanti che disabilitano durante `pending`** (AC: 2 collaterale)

  - [ ] La regola: dove `disabled={pending}` è messo per prevenire un doppio click (non per dire che l'azione è inammissibile), si sostituisce con `aria-busy={pending}` e si lascia il pulsante focalizzabile. Il doppio click viene assorbito dall'hook (`useWrite` rifiuta un secondo `run()` con `if (pending) return`; `useTransition` fa lo stesso).
  - [ ] I sette punti da toccare:
    - `src/app/(app)/questionario/new-block-form.tsx`: `<input disabled={pending}>` — resta `disabled` sull'input **perché il campo che si sta scrivendo va congelato**, ma il pulsante di conferma passa a `aria-busy`.
    - `src/app/(app)/questionario/new-question-form.tsx`: idem, l'input resta bloccato durante l'invio.
    - `src/app/(app)/questionario/edit-question-form.tsx`: idem, gli input restano bloccati.
    - `src/app/(app)/questionario/move-buttons.tsx`: la freccia disabilita durante `pending` **e** al bordo. La sostituzione: `aria-busy={pending}` per il volo, `disabled={isAtEdge}` per il bordo. Sono due semantiche diverse e questa story le separa per la prima volta.
    - `src/app/(app)/questionario/question-active-button.tsx`: `aria-busy={pending}`.
    - `src/app/(app)/sidebar-toggle.tsx`: `aria-busy={pending}` — chiude la voce a ledger 5-1 riga 206.
    - `src/app/(app)/clienti/[id]/schede/[assessmentId]/completion-button.tsx`: `aria-busy={pending}`.
  - [ ] Verifica con VoiceOver: attivare uno dei sette pulsanti e sentire l'annuncio dello stato transitorio senza perdere il fuoco.
  - [ ] **La perdita del fuoco al ritorno** — dopo il completamento della server action, il pulsante potrebbe rimontare (rivalidazione) e perdere il fuoco lo stesso. Verifica caso per caso: se `router.refresh()` rimonta il componente, si aggiunge un ref con `useEffect` che ripristina il fuoco. Numeri nel Dev Agent Record.

- [ ] **Task 8 — Zona live singola e errori dei pulsanti `useWrite`** (AC: — , annunci di riuscita)

  - [ ] **La zona `role="status"` in `save-indicator.tsx:39` diventa `aria-live="polite"`** e viene resa quando lo stato **cambia**, non a ogni pausa di scrittura. La correzione è nel componente:
    - Il `role="status"` implicito lo rimuoviamo, `role="status"` è una regione implicitamente live.
    - Aggiungiamo `aria-live="polite"` sull'elemento che porta il testo dello stato.
    - Il pulsante `Riprova` **esce** dalla regione live: non è un annuncio, è un controllo.
    - Verifica con VoiceOver che gli annunci siano uno per cambio di stato reale, non uno per pausa.
  - [ ] **Gli errori dei pulsanti `useWrite` che restano appesi** (voce 3-6 riga 161). Il componente `completion-button.tsx` non chiama `clearError` di `useWrite`, quindi l'errore sopravvive alla rivalidazione e resta a schermo per tutta la call. La correzione applicata **anche** a `question-active-button.tsx` (l'altro pulsante che non chiama `clearError`): destrutturare `clearError` e chiamarlo in `useEffect(() => clearError(), [assessment.completion_status])` (o l'equivalente prop che cambia allo stato). La regola: chi non ha un campo di cui azzerare l'errore lo azzera sul cambio di prop rilevante.
  - [ ] **Annunci di riuscita, non solo di fallimento** (voce 3-6 riga 160). Il `completion-button.tsx` rende `<p role="alert">` solo sull'errore, e non annuncia la riuscita. La strada scelta è un `aria-live="polite"` su un `<span>` accanto al pulsante che porta lo stato corrente (`bozza` o `chiusa`), e quando cambia lo screen reader lo annuncia. Non è un cambio di UI (il testo era già visibile), è una relazione dichiarata.

- [ ] **Task 9 — `.main { min-width: 0 }` misurato sulle rotte non guardate** (AC: —, chiusura ledger 4-2 riga 176)

  - [ ] La voce a ledger dichiara che la Story 4.2 ha aggiunto `.main { min-width: 0 }` misurando **solo** sull'elenco clienti. La Story 4.3 ha misurato la schermata di compilazione (**passa**). Restano da misurare: **questionario**, **scheda cliente**, **`/accedi`**.
  - [ ] Verifica di forma con la riproduzione statica CDP-driven a 375px:
    - `/questionario`: `documentElement.scrollWidth` contro `clientWidth`, misura. Controprova con `min-width: auto` su `.main` per capire se la regola serve o no. Numeri nel Dev Agent Record.
    - `/clienti/<id>`: idem.
    - `/accedi`: idem — anche se non usa `.main`, verificare che la pagina non scorra.
  - [ ] Se qualcuna sfora, il rimedio è **locale** al contenuto e non a `.main`: `overflow-wrap: anywhere` sui campi (già presente su `.answer__text` e `.input`, verificare la card del cliente e la scheda), oppure un contenitore che scorre come `.table-scroll` per la tabella dell'elenco.
  - [ ] La voce si chiude scrivendo **quattro numeri per quattro rotte** — l'elenco (già misurato dalla 4.2), la compilazione (già misurato dalla 4.3), il questionario e la scheda cliente (misurati qui) — e non con «funziona».

- [ ] **Task 10 — Verifica di forma finale** (AC: 1, 2, 3, 4, 5)

  - [ ] Riproduzione statica CDP-driven su tutte le rotte a 1280 e a 375, con e senza `prefers-reduced-motion`, con e senza sidebar richiusa. Numeri richiesti nel Dev Agent Record:
    - Rapporto di contrasto WCAG per ogni coppia colore/fondo elencata nel Task 2.
    - Altezza di ogni bersaglio tattile: `.btn` (44 atteso), `.sidebar-toggle` (36 atteso e dichiarato), `.input` (44+ atteso), riga della tabella (56 già misurata).
    - Alone del focus su ogni sezione: colore `getComputedStyle().boxShadow` che corrisponda alla tinta di sezione.
    - `documentElement.scrollWidth` a 375 su ogni rotta.
    - Durata delle transizioni con `prefers-reduced-motion` attiva.
  - [ ] `npm run typecheck` senza uscita, `npm run build` riuscito.
  - [ ] Il conteggio dei test **resta a 267** — questa story non porta nessun test unitario, i cambi sono tutti CSS o `aria-*` verificati a schermo.

- [ ] **Task 11 — Il ledger** (AC: —)

  - [ ] `docs/bmad/implementazione/deferred-work.md`, sezione nuova in fondo: `## Deferred from: implementazione della story 5-2-passata-di-accessibilita-verificata (12 agosto 2026)`.
  - [ ] **Voci a ledger da barrare**, con annotazione di chiusura che dice il numero misurato:
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
  - [ ] **Voci ledger da annotare, non chiudere**:
    - Riga 121 (macchina dei quattro stati usata da tre card): **annotare** con «punto di ripresa spostato alla retrospettiva dell'Epic 5. La 5.2 ha letto ma non aperto le tre card, per la stessa ragione della 5.1: sei file da toccare, riverifica dei quattro stati di due schermate, nessuna AC lo chiede».
    - Voce parente sull'errore `Riprova` su rotta già aperta (menzionata insieme alla 121): stessa annotazione.
    - Riga 171 (`.progress__bar` `1/24` sotto il tappo arrotondato): **decisione da prendere** — se questa story guarda la barra, si decide fra `min-width` e lasciare com'è. Vedi Domanda 3 in coda alle Dev Notes.
    - Riga 180 (pillola `non deciso` perde fondo su hover): **decisione da prendere** — vedi Domanda 4.
    - Riga 184 (titolo `Prequalifica` sovrapposto a 375): **annotata come forma non a11y**, punto di ripresa retrospettiva dell'Epic 5.
    - Riga 185 (scheletro intestazione asymmetric): idem.
    - Riga 191 (`Esporta` su terza riga sotto errore): idem.
  - [ ] Se le Domande 3 e 4 in coda alle Dev Notes hanno esito «lascia com'è», le due voci restano aperte con motivo dichiarato.

- [ ] **Task 12 — Cosa cambia in `design-system.md`** (AC: —)

  - [ ] §2 (Colore): la nota sul contrasto della pillola può ora dire «il caso peggiore è chiuso» per le pillole di verdetto **e** per `.error-box`/`.warn-box`, con i numeri misurati.
  - [ ] §8 (Accessibilità): la nota sui bersagli tattili si aggiorna: «`.btn` è alto 44 a partire dalla Story 5.2. `.sidebar-toggle` resta 36×36 con motivo dichiarato: la fascia del brand è alta 44, un pulsante 44 accanto rovina l'equilibrio verticale».
  - [ ] §9 (Token): si aggiungono `--focus-tint` e `--focus-color` con la loro logica di sovrascrittura per sezione.
  - [ ] §5 (Componenti): nella nota sulla nav si dice che «da collapsed il piede si nasconde: `SignOutButton` non è raggiungibile finché la nav non è espansa».
  - [ ] **Nessuna altra modifica ai documenti.** In particolare `00-contesto-e-decisioni.md` non riceve una decisione registrata nuova: la forma delle regole di focus e di bersaglio vive nel codice e in `design-system.md`, e duplicare una convenzione in una decisione registrata produce due copie destinate a divergere.

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
- [ ] Il `Salva` della barra di salvataggio, quando si preme, non fa perdere il fuoco dal pulsante (`aria-busy`)
- [ ] `Modifica` su una domanda del questionario, annunciato da VoiceOver, dice il testo della domanda oltre a `Modifica` (AC3)
- [ ] Attivando `prefers-reduced-motion` nel sistema operativo, la sidebar si richiude senza animazione visibile (AC4)
- [ ] Il colore del focus della schermata di compilazione è verde acqua (`--sec-prequalifica-tint`), quello del questionario viola (`--sec-questionario-tint`), quello dei clienti blu (`--sec-clienti-tint`)
- [ ] Nessuna schermata a 375px scorre di lato (AC1, Task 9)
- [ ] Nessuna informazione veicolata dal colore manca del testo che la ripete (AC5)

## Dev Agent Record

### Agent Model Used

_(da compilare all'implementazione)_

### Debug Log References

_(da compilare all'implementazione)_

### Completion Notes List

_(da compilare all'implementazione)_

### File List

_(da compilare all'implementazione)_

### Review Findings

_(da compilare in revisione)_
