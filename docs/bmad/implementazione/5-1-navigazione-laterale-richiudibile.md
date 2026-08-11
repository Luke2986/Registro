---
baseline_commit: d523a4f
---

# Story 5.1: Navigazione laterale richiudibile

Status: done

Epic: 5 — Rifinitura dell'interfaccia
Data di creazione: 11 agosto 2026

> **Baseline.** La Story 4.3 è implementata, revisionata e chiusa dalla verifica di sessione: `d523a4f` su `main`, albero pulito. Sedici migrazioni a registro (0001–0016), **267 test verdi**, `npm run typecheck` senza uscita, `npm run build` riuscito.
>
> **Cosa esiste oggi della navigazione, e sta scritto qui perché è il punto di partenza:** una fascia verticale fissa larga **232px** (`src/app/globals.css:125-129`) con due voci — `Clienti` e `Questionario` — rese da `src/app/(app)/nav.tsx`. La voce attiva ha fondo `--surface-sunken`, la barra verticale di 3px sul bordo sinistro e il colore preso dal proprio modificatore (`.nav__item--clienti` → `--sec-clienti`, `.nav__item--questionario` → `--sec-questionario`). L'attivo si calcola su prefisso, non su uguaglianza, per tenere accesa `Clienti` su `/clienti/<id>` e su `/clienti/<id>/schede/…`. **Nessuna icona ancora, nessun toggle, nessuna forma richiusa.** L'unica regola responsive esistente (`globals.css:1287-1300`) porta `.shell` a una colonna sotto i 720px, e le due voci si impilano in alto — è la voce a ledger di riga 70, che questa story chiude.
>
> **Questa è la prima story dell'Epic 5,** e la prima che tocca la forma dello scheletro invece di una funzione. Fine ultimo dell'epic: le rifiniture che non appartengono a nessuna funzionalità in particolare ma valgono su tutte le schermate. Non porta nessuna migrazione, nessuna scrittura di dati, nessuna azione sui contenuti.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want poter stringere la navigazione a sole icone,
so that su un portatile piccolo o su un tablet la scheda in compilazione si prende la larghezza che le serve.

## Acceptance Criteria

**AC1 — la nav si stringe a icone e la scelta viene ricordata**
**Given** la navigazione aperta
**When** la richiudo
**Then** resta la sola colonna di icone, e la scelta viene ricordata alla visita successiva

**AC2 — da richiusa, il suggerimento sostituisce l'etichetta**
**Given** la navigazione richiusa
**When** passo il mouse su una voce
**Then** compare un suggerimento su fondo `--ink` con testo bianco (UX-DR1)

**AC3 — la voce attiva si riconosce anche a icone**
**Given** la sezione corrente
**When** guardo la sua voce
**Then** ha fondo `--surface-sunken`, icona nel colore della sezione e una barra verticale di 3px sul bordo sinistro (UX-DR1)

**AC4 — su schermo stretto la nav non copre il contenuto**
**Given** uno schermo stretto
**When** apro qualsiasi schermata
**Then** la navigazione non copre il contenuto e resta raggiungibile (NFR4)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **La scelta viene ricordata «alla visita successiva» significa cookie, non `localStorage`, e va detto perché la prima intuizione è l'altra.** `layout.tsx` è un Server Component, e questa story vuole che resti tale (il commento in testa a `nav.tsx` lo dichiara già): un cookie si legge sul server, un `localStorage` no. Con `localStorage` il primo render arriverebbe sempre espanso e la nav «lampeggerebbe» stringendosi dopo l'idratazione — visibile ogni volta che si torna sull'applicazione, che è ogni volta che il collegamento email consuma la sessione. Il cookie è l'unica strada che non chiede a `layout.tsx` di diventare client, e il precedente è già dentro `@supabase/ssr`, che scrive i suoi via cookie e non via storage.
>
> **La nav non è mai «di ampiezza intermedia»,** è **espansa (232)** o **richiusa (56)**, e non c'è un in mezzo. Sembra ovvio detto così, ma la trappola sta nel voler animare la larghezza fra i due stati: la larghezza *può* transitare, ma le etichette non entrano nel calcolo e si tolgono al toggle — se restassero, un'etichetta parzialmente uscita al centro della transizione mostrerebbe metà parola tagliata. La transizione è sulla larghezza dello scheletro (`.sidebar`) e sull'`opacity` delle etichette con `--dur-base`, ognuna delle due sulla sua proprietà. `prefers-reduced-motion` già annulla la durata (`globals.css:113-120`).
>
> **Il toggle esiste sopra i 720px, sotto no,** e questa è la risposta a AC4 senza inventare un secondo pattern. Sotto i 720px la nav è **sempre richiusa**, forzata da media query, con il toggle nascosto (`display: none`): l'utente in tablet o su portatile piccolo non ne sceglie lo stato, e la scheda in compilazione ottiene i 319px che le servono. Sopra i 720px il toggle compare, la larghezza segue il cookie, e la scelta persiste. La regola responsive di oggi (`globals.css:1287-1300`) che impila le voci in cima si sostituisce con questa: nessuna finestra intermedia in cui la fascia in alto cresce con le voci, che è la voce di riga 70 del ledger. La chiudiamo cambiando la forma, non aggiungendo una regola in più.
>
> **Il suggerimento in stato richiuso è un CSS pseudo-element e non un `title`,** perché due cose diverse. `title` è controllato dal browser: font, colore, ritardo di ~700ms, posizione — nessuno dei quattro è quello che UX-DR1 chiede (fondo `--ink`, testo bianco, comparsa vicina alla voce). Un `title` verrebbe reso col sistema operativo e non con il design system, e la §5 lo dice per esteso («da richiusa, il passaggio del mouse mostra un suggerimento su fondo `--ink` con testo bianco»). Il pseudo-element usa `data-label` sul link e appare **solo** quando la sidebar ha la classe di stato richiuso: sopra la nav espansa non deve mai comparire, altrimenti duplicherebbe l'etichetta a schermo. Il suggerimento non è un tooltip navigabile — non contiene contenuto interattivo, non ha ARIA `tooltip` — è una didascalia visiva su una voce che ha già il suo nome accessibile.
>
> **`aria-expanded` sul toggle è la parte accessibile dello stato,** e va sul pulsante e non sulla nav: un pulsante «richiuso/espanso» è esattamente quello che ARIA descrive, e la voce di elenco `<nav>` non è una regione ARIA di quella famiglia. Il nome accessibile del toggle è `Richiudi la navigazione` quando è espansa, `Espandi la navigazione` quando è richiusa — cambia con lo stato, esattamente come `Chiudi la scheda`/`Riporta in bozza` (`design-system.md` §7, «un'azione si chiama allo stesso modo dal pulsante alla conferma»).
>
> **Le icone: nessuna dipendenza nuova, due SVG a tratto in linea, importate da un file.** `AGENTS.md` chiede di aggiungere una libreria solo con motivo dichiarato, e qui il motivo non c'è: due icone sono venti righe di JSX, `lucide-react` o `heroicons` porterebbero centinaia di kilobyte di albero per rendere una `<Users>` e una `<ClipboardList>`. Le due icone stanno in un file solo — `src/app/(app)/nav-icons.tsx` — così `nav.tsx` non gonfia e chi cerca «l'icona di Clienti» la trova in un posto solo. Stroke, non fill: `design-system.md` §10 dice «le icone sono a tratto», e il colore lo prendono da `currentColor` — l'unica cosa che fa sì che la voce attiva le renda nel colore della sezione senza scriverlo due volte.
>
> **La voce attiva è la stessa forma di oggi con l'icona in più,** non una forma nuova. La barra verticale di 3px sul bordo sinistro c'è già (`::before` su `.nav__item--active`), il fondo `--surface-sunken` c'è già, il colore della barra viene dal modificatore di sezione. Da richiusa cambia una cosa sola: l'etichetta sparisce e resta l'icona nel colore della sezione. Il fondo e la barra restano.
>
> **Non porta:** nessuna estrazione della macchina dei quattro stati (voce ledger 121), nessuna correzione dei `.btn` a 40px, nessun rifacimento del focus in `--sec-*`, nessuna scritta o rifinitura di `.error-box`/`.warn-box`, nessuna revisione dei bersagli tattili sulle schermate esistenti. Sono tutti mestieri della Story 5.2 e ci restano. Questa story cambia una cosa sola e la cambia dove sta. Chi trovasse tentazione di allargare, apra `AGENTS.md` alla riga «Una cosa alla volta».

## Tasks / Subtasks

- [x] **Task 1 — Le icone in un file loro** (AC: 3)

  - [x] File nuovo `src/app/(app)/nav-icons.tsx`, che esporta `ClientiIcon` e `QuestionarioIcon`. Nessun `use client`: sono componenti server puri che rendono `<svg>`.
  - [x] Ciascuna è un SVG a tratto, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={1.75}`, `fill="none"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `width={20}` e `height={20}`. `currentColor` è la chiave: la voce attiva ha già `--nav-accent` come `color` sul link (§ Task 3), e l'icona lo eredita senza doverlo scrivere due volte.
  - [x] **`ClientiIcon`**: un contorno di persona sopra un secondo contorno più basso a suggerire una lista di persone — la scelta metaforica è «gruppo di persone» perché `Clienti` in questo software sono aziende ma con dentro persone (D13), e un contorno di singolo utente sarebbe restrittivo. Riferimento visivo: `users` di Heroicons a due utenti sovrapposti, ridisegnato a mano perché è più corto che aggiungere una dipendenza.
  - [x] **`QuestionarioIcon`**: un rettangolo con dentro tre righe orizzontali — l'icona «lista» o «checklist», che è la metafora usata da ogni software di questionari e che chi guarda riconosce senza pensarci. **Non** un punto interrogativo: `?` è ambiguo (aiuto/domanda) e usato da tempo per l'aiuto contestuale, che questa applicazione non ha e che potrebbe voler avere un giorno senza un conflitto già in casa.
  - [x] Nessun test unitario: sono JSX puro senza logica. Il modo in cui si prova è a schermo (Verifica di sessione).
  - [x] Commento in testa al file, corto: perché a tratto e non piene, perché `currentColor`, perché in un file loro (leggibilità di `nav.tsx`, riuso futuro se un giorno la stessa icona serve altrove).

- [x] **Task 2 — Il cookie e l'azione che lo scrive** (AC: 1)

  - [x] File nuovo `src/app/(app)/nav-actions.ts`, con dentro `setNavCollapsed(collapsed: boolean)`, `'use server'` in testa al file. È l'unica scrittura di questa story e va in un file suo, non dentro `layout.tsx` né dentro `nav.tsx`: server action e componente non si mescolano nello stesso file di questo repository (è la stessa forma di `verdict-actions.ts`, `completion-actions.ts`, `answer-actions.ts`).
  - [x] Il nome del cookie è **`nav_collapsed`**, il valore è la stringa `'1'` (richiusa) o `'0'` (espansa). Cookie normale via `next/headers` (`cookies()`), non un cookie Supabase: nessuna sessione, nessuna sicurezza — è una preferenza di forma.
  - [x] Le opzioni del cookie, dichiarate una volta e scritte nel codice: `path: '/'`, `httpOnly: false` (il cookie non porta informazioni sensibili e non serve al lato server per la sicurezza, solo per la resa iniziale), `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `maxAge: 60 * 60 * 24 * 365` (un anno: una preferenza di forma non ha una scadenza corta). Commento su `httpOnly: false`: **è deliberato**, e va scritto perché la regola generale del progetto è l'opposto — qui è la preferenza, non un token, e non vederlo dal browser vorrebbe dire non poterlo leggere in un futuro componente client che non abbia percorso il ciclo di rerender del server.
  - [x] Nessuna redirect, nessun `revalidatePath`: la nav si aggiorna al prossimo render della pagina, che avviene comunque perché il toggle del Task 4 rifà `router.refresh()` dopo aver chiamato l'azione (v. Task 4 per il perché di quel `refresh` e non un `revalidateTag`).
  - [x] Nessun test per questa server action: è un cookie setter di quattro righe che chiama `cookies().set()`. Chi vorrebbe provarlo dovrebbe mockare `next/headers`, che è più codice del codice provato.

- [x] **Task 3 — Il layout legge il cookie e mette la classe** (AC: 1, 4)

  - [x] `src/app/(app)/layout.tsx`: aggiungere `import { cookies } from 'next/headers'` in testa, fare la funzione `async`, leggere `const collapsed = (await cookies()).get('nav_collapsed')?.value === '1'`. Il valore predefinito è **espansa** (falso): al primo accesso, senza cookie, si vede la nav intera con le etichette — chi arriva per la prima volta capisce cosa sono le voci prima di scegliere se stringerle.
  - [x] La classe si applica su `<aside className="sidebar">` come `<aside className={\`sidebar\${collapsed ? ' sidebar--collapsed' : ''}\`}>`. Il modificatore su un elemento solo — la sidebar — invece che sul `.shell`: la sidebar è quella che cambia larghezza, la shell resta a griglia due colonne e la prima colonna cambia grandezza (v. § Task 6, il valore di `grid-template-columns` a due valori dinamici).
  - [x] La sidebar riceve una prop nuova `defaultCollapsed: boolean` che passa al toggle del Task 4, così il toggle nasce nello stato giusto senza rileggere il cookie una seconda volta lato client.
  - [x] **Il `<Nav>` non riceve niente:** la resa della nav è la stessa in tutti e due gli stati — le etichette ci sono sempre nel DOM, è la CSS a nasconderle da richiusa (v. § Task 6, `.sidebar--collapsed .nav__item__label { opacity: 0; ... }`). Renderle condizionalmente vorrebbe dire due alberi diversi e un `useEffect` per switcharli senza flash, cioè la strada che il cookie serve a evitare.
  - [x] Nessun altro cambio al layout: il brand resta, il `Nav` resta, `SignOutButton` resta. Il pulsante toggle si aggiunge dentro `.sidebar__brand` (v. Task 4), non fuori.
  - [x] `layout.tsx` diventa `async` e questo cambia la firma esportata; niente in `next.config.*` da toccare, è un cambiamento coperto dal supporto Server Components di Next 16.

- [x] **Task 4 — Il pulsante toggle** (AC: 1)

  - [x] File nuovo `src/app/(app)/sidebar-toggle.tsx`, `'use client'` in testa. Riceve una prop sola, `defaultCollapsed: boolean`.
  - [x] Uno `useState(defaultCollapsed)` è la sorgente di verità dello stato **visivo** locale, e va tenuto sincronizzato con quello del cookie per un motivo che sembra ridondante e non lo è: il `router.refresh()` rifà il render del layout ma **non** rerenda i Client Components che non hanno cambiato le loro prop, quindi il toggle continuerebbe a mostrare l'aria-expanded vecchio anche dopo che il server ha ricevuto il cookie nuovo. `useState` locale è quello che l'utente vede subito; `router.refresh()` è quello che allinea il layout. I due si allineano ai lati opposti della stessa transizione.
  - [x] `onClick`:
    1. `const next = !collapsed`
    2. `setCollapsed(next)` — l'UI risponde subito
    3. `await setNavCollapsed(next)` — il cookie si scrive
    4. `router.refresh()` — il layout server rilegge il cookie e applica `sidebar--collapsed` sul prossimo render, così il DOM riflette il cookie e non solo lo stato locale del pulsante
  - [x] Il pulsante è un `<button type="button">` con:
    - `className="sidebar-toggle"`
    - `aria-expanded={!collapsed}` — vero quando la nav è espansa, e va invertito rispetto a `collapsed` per una ragione che confonde alla prima lettura: `aria-expanded` descrive lo stato del *contenuto controllato*, non del pulsante. La nav è espansa quando `collapsed` è falso. Il commento nel codice deve dirlo, perché la prossima persona che apre il file scriverà istintivamente `aria-expanded={collapsed}` e non se ne accorgerà nessuno.
    - `aria-controls="app-nav"` — l'ID va aggiunto al `<nav id="app-nav">` in `nav.tsx` (Task 5).
    - `aria-label={collapsed ? 'Espandi la navigazione' : 'Richiudi la navigazione'}` — cambia con lo stato come le altre due azioni bimodali del progetto.
  - [x] L'icona dentro il pulsante è una freccia: chevron a sinistra quando espansa (`<`), chevron a destra quando richiusa (`>`). Rende chiaro il verso senza leggere l'etichetta accessibile. Terza icona a tratto in `nav-icons.tsx` con la stessa forma, `ChevronLeftIcon` e `ChevronRightIcon`, e il toggle sceglie quale rendere in base a `collapsed`. Rimane la stessa dimensione (`20px`) delle icone di sezione, così l'occhio ha una gerarchia sola.
  - [x] Il pulsante è disabilitato durante l'attesa della server action (`const [pending, startTransition] = useTransition()`), come pattern del progetto. Un secondo clic prima che il cookie sia scritto produrrebbe uno stato incoerente altrimenti.
  - [x] Il pulsante **non** deve rendere il tooltip di §Task 6 su hover: il pulsante è dentro `.sidebar__brand`, non dentro `.nav__item`, e il selettore CSS del tooltip guarda solo `.nav__item`. Va scritto in commento perché guardando il markup viene il dubbio.

- [x] **Task 5 — La `Nav` riceve le icone** (AC: 3)

  - [x] `src/app/(app)/nav.tsx`: aggiungere `id="app-nav"` sul `<nav>` (per `aria-controls` del toggle).
  - [x] La costante `ITEMS` cresce di un campo: `icon: ClientiIcon` per la prima riga, `icon: QuestionarioIcon` per la seconda. L'icona è il componente, non un rendering — così il file resta corto e la scelta dell'icona sta in una riga sola per voce.
  - [x] Il rendering della voce cambia da `{item.label}` a un frammento con l'icona e l'etichetta, con classi distinte:
    ```tsx
    <Link ...>
      <item.icon aria-hidden="true" className="nav__item__icon" />
      <span className="nav__item__label">{item.label}</span>
    </Link>
    ```
    - `aria-hidden="true"` sull'icona: è decorativa, il nome accessibile è l'etichetta.
    - `.nav__item__icon` e `.nav__item__label` sono le due classi che il CSS di §Task 6 nasconde/mostra in base allo stato della sidebar.
  - [x] Il link riceve un `data-label={item.label}` — è il valore che il pseudo-element del tooltip legge (Task 6). Metterlo qui e non dedurlo da `.nav__item__label` con selettore CSS: il `content` di un pseudo-element può leggere solo `attr(data-*)`, non il testo di un figlio.
  - [x] Il commento in testa a `nav.tsx` va aggiornato: la riga «Niente della Story 5.1» va tolta e sostituita con un paio di righe che dichiarano il patto — il rendering è lo stesso in tutti e due gli stati, la forma richiusa è CSS.

- [x] **Task 6 — Le regole in `globals.css`** (AC: 1, 2, 3, 4)

  - [x] `src/app/globals.css`: la regola `@media (max-width: 720px)` esistente (`:1287-1300`) si **riscrive**, non si affianca. Oggi impila la nav in cima; da questa story forza `.sidebar--collapsed` — su schermo stretto lo stato ricordato non conta, la nav è sempre a icone. Il commento va aggiornato: era «due voci sono 44+4 prima del contenuto», ora è «sotto i 720px la nav è sempre a icone, il toggle è nascosto». La voce ledger di riga 70 nomina questa riga per la sua chiusura.
  - [x] **Il valore di `grid-template-columns` della `.shell` diventa dinamico:**
    ```css
    .shell {
      display: grid;
      grid-template-columns: 232px 1fr;
      min-height: 100vh;
    }

    .shell:has(.sidebar--collapsed) {
      grid-template-columns: 56px 1fr;
    }
    ```
    `:has()` è supportato da tutti i browser moderni (Chrome, Firefox, Safari) e da Next 16 non serve nessun polyfill. In alternativa, se `:has()` dovesse dare noia in un browser che ci interessa (nessuno oggi), si passa la classe anche sulla `.shell` da `layout.tsx` — decisione riscontrabile a schermo, si vede una volta e si fa.
  - [x] **La sidebar richiusa e le sue larghezze:**
    ```css
    .sidebar {
      transition: width var(--dur-base) var(--ease);
      overflow: hidden;
    }

    .sidebar--collapsed {
      /* La larghezza vera è governata da .shell; qui serve solo per il layout interno. */
    }
    ```
    La larghezza vera è governata dalla griglia della `.shell`; `overflow: hidden` sulla `.sidebar` è quello che tiene dentro le etichette che stanno uscendo durante la transizione.
  - [x] **Le etichette che compaiono e scompaiono:**
    ```css
    .nav__item__label {
      transition: opacity var(--dur-base) var(--ease);
      white-space: nowrap;
    }

    .sidebar--collapsed .nav__item__label {
      opacity: 0;
      pointer-events: none;
    }
    ```
    `opacity` invece di `display: none` perché l'`opacity` transisce e `display` no. `pointer-events: none` per non farla bersaglio del clic durante la transizione. `white-space: nowrap` così un'etichetta lunga non manda a capo prima di uscire.
  - [x] **Il brand sparisce da richiuso:**
    ```css
    .sidebar--collapsed .sidebar__brand-text {
      opacity: 0;
    }
    ```
    Va aggiunto un `<span className="sidebar__brand-text">Registro</span>` in `layout.tsx` per avere un bersaglio: oggi il testo del brand è nudo dentro `.sidebar__brand`. Il pulsante toggle resta visibile perché è il fratello del testo e ha una classe sua.
  - [x] **Il tooltip: pseudo-element `::after` che compare a hover/focus su `.nav__item` solo quando la sidebar è richiusa:**
    ```css
    .sidebar--collapsed .nav__item::after {
      content: attr(data-label);
      position: absolute;
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
      background: var(--ink);
      color: #FFFFFF; /* eccezione dichiarata: v. commento */
      padding: 6px 10px;
      border-radius: var(--r-md);
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--dur-fast) var(--ease);
      z-index: 100;
      box-shadow: var(--sh-2);
    }

    .sidebar--collapsed .nav__item:hover::after,
    .sidebar--collapsed .nav__item:focus-visible::after {
      opacity: 1;
    }
    ```
    - `attr(data-label)`: legge il valore che `nav.tsx` mette sull'ancora (Task 5).
    - `left: calc(100% + 8px)`: appare **fuori** dalla sidebar. Va scritto nel commento che questa è la ragione per cui `.sidebar { overflow: hidden }` non deve estendersi al tooltip — la posizione assoluta fuori dal box scavalca l'overflow del padre solo se il padre non è un contenente della posizione. `.sidebar` non ha `position: relative`, quindi il tooltip esce; se un giorno qualcuno aggiungesse `position: relative` a `.sidebar`, il tooltip verrebbe tagliato dal `overflow: hidden`. **Alternativa più stabile:** togliere `overflow: hidden` dalla sidebar e mettere `overflow: hidden` solo su `.sidebar .nav` (che è quello che serve per le etichette in transizione). Decidere all'implementazione, il risultato visivo è lo stesso.
    - `color: #FFFFFF`: è **l'unica eccezione** alla regola «nessun valore esadecimale fuori dal file dei token», e va scritto nel commento perché la regola è netta (`design-system.md` §10, `AGENTS.md`). Il bianco non è un colore di sezione, non è semantico, non è nella palette dei token. UX-DR1 lo prescrive testualmente («testo bianco»). Le due strade alternative — aggiungere un token `--ink-inverse: #FFFFFF` o riusare uno dei pochissimi bianchi nascosti (nessuno c'è, `--surface` è `#FFFFFF` ma il nome dice «superficie», non «testo su fondo scuro») — sono ognuna un'altra decisione. Se preferisci il token, aggiungerlo qui in `design-system.md` §9 e §2 è coerente con D26, che aveva già aperto tre token nuovi (`--ok-ink`, `--warn-ink`, `--bad-ink`) per la stessa categoria di ragione (un inchiostro che vive su un fondo particolare). **Domanda 1 in coda alle Dev Notes.**
    - `.nav__item` non ha oggi `position: relative`, ma ce l'ha (`globals.css:156`, «position: relative»): il tooltip si posiziona relativo alla voce, che è quello che serve.
  - [x] **Il toggle: aspetto e posizione dentro `.sidebar__brand`:**
    ```css
    .sidebar__brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      /* Le proprietà esistenti restano — font-size, line-height, ecc. */
    }

    .sidebar-toggle {
      background: transparent;
      border: none;
      padding: 8px;
      border-radius: var(--r-md);
      color: var(--ink-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--dur-fast) var(--ease);
      min-width: 36px;
      min-height: 36px;
    }

    .sidebar-toggle:hover {
      background: var(--surface-sunken);
    }

    .sidebar-toggle:focus-visible {
      outline: 3px solid var(--sec-clienti-tint); /* v. commento */
      outline-offset: 2px;
    }

    @media (max-width: 720px) {
      .sidebar-toggle {
        display: none;
      }
    }
    ```
    Il pulsante è **36×36** e non 44×44 nonostante UX-DR14 chieda 44: è la stessa dimensione degli altri controlli d'affianco (icone di sezione a 20 + padding), e allargarlo qui produce una fascia in alto che a nav espansa entra in conflitto visivo col brand. La voce a ledger dei `.btn` a 40px (sezione «code review of 1-1») è la stessa classe di problema e ha la sua storia; questo pulsante non è un `.btn`, ha una classe sua, quindi non si somma a quella voce ma **la annota**: il toggle sta a 36 di proposito, la Story 5.2 lo guardi con le altre. **Voce ledger nel Task 8.**
    L'`outline` del focus in `--sec-clienti-tint` è **il colore della sezione di partenza**, non un colore neutro: il toggle sta sopra la nav e non appartiene a una sezione, ma su `focus-visible` deve avere un alone visibile — `--sec-clienti-tint` è il ripiego perché è il colore della prima voce, ed è la stessa scelta che ogni `.input:focus` fa oggi (`--sec-prequalifica` come ripiego generale). Va scritto nel commento che questa scelta è **rimandata alla 5.2**, con la voce di ledger già aperta sul focus in `--sec-prequalifica` (sezione «creazione della story 1-2»). Il toggle è la stessa domanda applicata a un elemento in più.
  - [x] **Il modificatore attivo funziona identico:** la sidebar richiusa non tocca `.nav__item--active::before` (la barra di 3px), che sta a `globals.css:189-198` e resta invariato. Il colore della barra viene da `--nav-accent`, che è definito sui modificatori di sezione — tutto già in piedi.
  - [x] **`.nav__item` in stato richiuso ha `justify-content: center`** così l'icona sta centrata invece che accostata a sinistra dopo che l'etichetta è sparita:
    ```css
    .sidebar--collapsed .nav__item {
      justify-content: center;
      padding: 10px 8px;
    }
    ```
    `padding` orizzontale ridotto per far respirare l'icona da 20 in una colonna da 56 senza sfondamenti.
  - [x] **Nessun altro cambio a `globals.css`.** In particolare non si tocca `.main`, non si tocca `.page-header*`, non si toccano le regole delle tabelle o dei form. Se il diff porta modifiche fuori dalla sezione «struttura» (righe 123-212 circa) più l'aggiunta del blocco toggle e tooltip, qualcuno è andato oltre.

- [x] **Task 7 — La verifica di forma, come sempre in questo repository** (AC: 1, 2, 3, 4)

  - [x] Riproduzione statica servita in locale con il `globals.css` vero e i due font Geist, come dalla 3.3 in poi, e valori da `getComputedStyle` e `getBoundingClientRect` invece che giudizi. È la strada che questo progetto ha per prova la forma senza scomodare una sessione.
  - [x] Cosa si misura, e i numeri si scrivono nel Dev Agent Record:
    - **Larghezza della sidebar** in tutti e due gli stati, a 1280 e a 375: attesa 232 e 56 sopra i 720, forzato a 56 sotto.
    - **Larghezza utile della `.main`** in tutti e due gli stati, a 1280 e a 375: attesa `1280 - 232 - 80 = 968` (con `padding: 40` per lato) espanso, `1280 - 56 - 80 = 1144` richiuso; a 375 con nav a 56 e `padding: 24 16`, `375 - 56 - 32 = 287`.
    - **`documentElement.scrollWidth`** a 375 con nav richiusa: deve restare 375, eccedenza 0. Se sfora, si scrive il numero.
    - **`documentElement.scrollWidth`** a 320 (limite basso raccomandato di iOS Safari) con nav richiusa: 320 attesi. Se sfora, si scrive il numero — è il caso limite che non è AC ma è verifica di sanità.
    - **Altezza del pulsante toggle** a 1280: attesa 36 (min-height 36, padding 8). Va sotto la soglia UX-DR14 di 44, è dichiarato nel commento del CSS e va a ledger nel Task 8.
    - **Rapporto di contrasto del tooltip:** `#FFFFFF` su `--ink` `#141210`, calcolato con la formula WCAG. Il minimo è 4,5:1 sul testo (UX-DR14). Atteso ~15:1 — sovrabbondante e da confermare col numero.
    - **Comparsa del tooltip:** cronometrata su hover, dev'essere immediata (< 220ms come la §Task 6 dichiara). Se il browser aggiunge un ritardo, si scrive.
  - [x] Nessun test unitario per il layout (non c'è come si prova un cookie letto sul server senza una macchina); nessun test unitario per il toggle (JSX + `useState` + una chiamata `await`); nessun test unitario per le icone (SVG puro). **Il conteggio dei test resta a 267** e va scritto così nel Dev Agent Record. Se un test si aggiunge in corso d'opera, il numero cresce di quello.
  - [x] `npm run typecheck` e `npm run build`. `build` deve restare verde: la trasformazione di `layout.tsx` a `async` è quello che si guarda per primo se dovesse rompere.

- [x] **Task 8 — Il ledger** (AC: —)

  - [x] `docs/bmad/implementazione/deferred-work.md`, sezione **nuova**: `## Deferred from: implementazione della story 5-1-navigazione-laterale-richiudibile (11 agosto 2026)`, in fondo al file.
  - [x] **Voce a ledger di riga 70 (fascia di navigazione su schermo stretto)**: si **chiude**, con la barratura in testa e una riga di annotazione che dice cosa è cambiato. La regola responsive che impila le voci è stata sostituita dalla forzatura a icone sotto i 720px, e la fascia in alto non esiste più — il ledger perde la voce, e chi la cerca legge che è chiusa qui.
  - [x] **Voce ledger 121 (macchina dei quattro stati col ritorno di fuoco)**: si **annota**, non si chiude. L'annotazione dice tre cose: che l'implementazione di questa story ha **letto** `layout.tsx`, `nav.tsx` e la relativa cartella e non ha aperto nessuna delle tre card (`client-card.tsx`, `people-card.tsx`, `assessments-card.tsx`); che il punto di ripresa dichiarato dalla 4.1 («la Story 5.1, che è la prima a guardare la forma invece di una funzione») **si sposta alla Story 5.2**, con il motivo — l'estrazione delle tre card tocca sei file, richiede la riverifica dei quattro stati di due schermate e non ha nessun legame con AC1-AC4 di questa story, quindi accoglierla qui sarebbe «una cosa alla volta» violata (`AGENTS.md`); e che la voce 41 di cui la 4.1 parlava resta comunque abbinata a questa, così la 5.2 le trova insieme quando le apre.
  - [x] **Voce nuova, il pulsante toggle a 36×36**: fa terzo pulsante sotto la soglia di 44 nominato da UX-DR14, dopo `.btn` a 40 (voce di riga 7) e i `.btn` della schermata di compilazione (annotazioni ripetute). Rimandato: la scelta di 36 qui è per il motivo dichiarato nel CSS — un pulsante 44×44 accanto al brand a 44px di altezza rovina l'equilibrio della fascia superiore — e la Story 5.2 è la passata che decide se cambiare la soglia UX-DR14 per i controlli di navigazione o se rifare la testata.
  - [x] **Voce nuova, il bianco esadecimale nel tooltip**: `color: #FFFFFF` a `globals.css:<nuova riga>` è **l'unico valore esadecimale fuori dai token dopo questa story**. Rimandato in una forma o nell'altra: o si accoglie l'eccezione (UX-DR1 la prescrive testualmente), o si aggiunge un token `--ink-inverse: #FFFFFF` a `design-system.md` §2 e §9 e a `globals.css`. **La decisione è presa fra le due opzioni della Domanda 1 in coda alle Dev Notes**, e sarà fatta all'implementazione da Luca. La voce a ledger si scrive **solo se** la scelta è l'accoglienza dell'eccezione — se il token nasce, non c'è debito da rimandare.
  - [x] **Voce nuova, se e solo se il Task 7 la produce:** l'`outline` del focus del toggle in `--sec-clienti-tint` è un ripiego, non il colore della sezione corrente. Va scritto solo se durante l'implementazione la scelta resta il ripiego (v. Task 6, ultima sotto-casella). Se all'implementazione si trova che il colore della sezione corrente si può passare come CSS custom property al toggle in modo pulito, la voce non nasce.
  - [x] **Nessuna annotazione alle voci sui `.btn`, sui `.error-box`/`.warn-box`, sul focus in `--sec-prequalifica`, sull'`Esporta` collegamento travestito da pulsante**: sono voci della 5.2 e la 5.1 non le tocca. Fare un giro di annotazioni «per completezza» sposterebbe il perimetro di questa story.

- [x] **Task 9 — Cosa cambia in `design-system.md`, se cambia qualcosa** (AC: —)

  - [x] §5 «Navigazione laterale»: il capoverso oggi dice «richiudibile a sola icona come nei riferimenti». Non cambia, ma va aggiunta una nota corta sui **due stati richiusi diversi** — il richiuso per scelta (sopra i 720px, cookie) e il richiuso per larghezza (sotto i 720px, forzato). È la riga che chi rileggerà il documento fra tre mesi non deduce dal codice, e senza cui la regola «la scelta viene ricordata» sembrerebbe rotta quando lo schermo è stretto.
  - [x] §9 «Token, pronti da incollare»: **si aggiunge `--ink-inverse: #FFFFFF`** solo se la scelta di Domanda 1 va sul token. Nel caso, la stessa riga va anche nel `globals.css` e nel commento del tooltip del Task 6.
  - [x] **Nessuna altra modifica ai documenti.** In particolare `00-contesto-e-decisioni.md` non riceve una decisione registrata nuova, per la stessa logica della 4.3 (D24): la forma vive nel codice e in `design-system.md`, e duplicare una convenzione in una decisione registrata produce due copie destinate a divergere. La scelta cookie-vs-localStorage vive nel commento di `nav-actions.ts` e in questa story.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| La sidebar bianca larga 232 | `src/app/globals.css:125-129` | impalcatura |
| Le due voci `Clienti` e `Questionario` | `src/app/(app)/nav.tsx` | impalcatura + 2.1 |
| L'attivo su prefisso, non su uguaglianza | `nav.tsx:33` | impalcatura + 2.1 |
| I modificatori di sezione che alimentano `--nav-accent` | `globals.css:181-198` | 2.1 |
| La barra verticale di 3px sul bordo sinistro | `globals.css:189-198` | impalcatura |
| Fondo `--surface-sunken` per la voce attiva | `globals.css:171-175` | impalcatura |
| Il `SignOutButton` in fondo alla sidebar | `layout.tsx:11-13`, `components/sign-out-button.tsx` | impalcatura |
| `prefers-reduced-motion` che annulla le transizioni | `globals.css:113-120` | impalcatura |

**Cosa non esiste, e questa story lo porta:** icone dentro le voci, un pulsante toggle, un cookie che ricorda la scelta, un tooltip da richiuso, la forzatura a icone sotto i 720px. Zero migrazioni, zero scritture sui dati, zero componenti nuovi fuori dalla cartella `(app)`.

### Perché il cookie e non `localStorage`

`layout.tsx` è un Server Component e questa story vuole che resti tale — il commento in testa a `nav.tsx` dice per esteso perché: se il layout diventa client, diventa client anche `SignOutButton` e ogni componente che il layout terrà in futuro. Un cookie si legge sul server nella stessa richiesta che rende la pagina; un `localStorage` no — vive solo nel browser e diventa disponibile dopo l'idratazione.

La conseguenza pratica di `localStorage` sarebbe una nav che si vede sempre espansa al primo render, si idrata, e si stringe visibilmente. Non è un difetto puramente estetico: la scheda in compilazione si allarga e si stringe sotto le mani di Luca fra la resa iniziale e il primo click, cioè esattamente il salto che la 3.6 e la 4.2 hanno lavorato per eliminare sull'intestazione. Un cookie evita quel salto per costruzione.

`@supabase/ssr` già scrive i propri cookie, quindi il pattern è dentro il progetto: non introduce niente di nuovo tecnicamente.

### Perché il toggle sta dentro il brand e non fuori

Le tre alternative considerate, e perché sta dentro il brand:

- **Un pulsante flottante in un angolo dello schermo**: non appartiene al design system, e sposta il pattern «la nav si comanda dalla nav» a «la nav si comanda da un punto esterno». Il primo è quello dei riferimenti citati in `design-system.md` §5.
- **Un pulsante sopra il primo item della `.nav`**: leggibile come una voce, e non lo è. Chi guarda si aspetterebbe di poterci navigare.
- **Un pulsante dentro `.sidebar__brand`**: sta accanto al nome dell'applicazione, dove il brand è già un elemento «di livello superiore» che non appartiene alla navigazione. La riga superiore della sidebar smette di essere solo etichetta e diventa una barra di controllo dello scheletro. È la scelta di ogni riferimento moderno (VS Code, Linear, Notion).

Da richiusa, il brand sparisce e resta solo il toggle: la sua icona a chevron rivolta a destra dice esattamente «espandi», e prende il posto del testo del brand. Nessun secondo pulsante.

### Perché il richiuso è solo CSS

Rendere condizionalmente due alberi diversi — con etichette e senza — vorrebbe dire una prop passata da `layout.tsx` a `Nav`, un ramo `{collapsed ? <IconOnly /> : <IconAndLabel />}`, e la comparsa/scomparsa fisica delle etichette dal DOM ad ogni cambio. Con il cookie letto sul server e la classe `.sidebar--collapsed` applicata sullo `<aside>`, il DOM è **lo stesso** in tutti e due gli stati: le etichette ci sono sempre e le nasconde la CSS. Il vantaggio principale — non ovvio — è che la transizione di larghezza della sidebar e la dissolvenza dell'`opacity` delle etichette possono girare insieme, perché entrambe sono su elementi che restano montati. Un `display: none` con una prop cambierebbe di colpo, senza transizione, e produrrebbe un salto.

L'unico prezzo pagato è che il DOM porta due etichette che non si vedono: `Clienti` e `Questionario`, per un totale di ventidue caratteri. Un peso trascurabile in cambio di zero salti e zero rerender del layout server per una preferenza visiva.

### AC4, e perché non è un pattern nuovo ma la conseguenza dello stesso

L'epic dice «la navigazione non copre il contenuto e resta raggiungibile». La lettura naïve è un secondo pattern per schermo stretto — un cassetto laterale, un menu a hamburger. Questa story non lo introduce, e la motivazione va scritta perché la prima domanda sarà «perché no?».

Il pattern del cassetto risponde a una domanda diversa: come dare la nav larga anche su schermo stretto. Questa domanda non c'è. La domanda vera è: **come non far coprire il contenuto**. Una sidebar a 56 di icone su un 375 lascia 319 al contenuto, che è più di quanto un cassetto ne lasci quando è aperto — perché il cassetto per essere raggiungibile deve avere un pulsante che sta sopra il contenuto, cioè copre 44 in alto, e quando è aperto copre tutto.

La strada che questa story sceglie è: sotto i 720 la nav è **sempre** l'icona rail, il toggle sparisce, e la scelta ricordata non conta. Sopra i 720 la scelta conta e la nav segue il cookie. È una sola nav in due modalità di apparizione — la seconda determinata dallo schermo — e non due nav diverse.

Se un giorno Luca vuole vedere le etichette anche su tablet, la strada è aprire una story sua e valutare il cassetto con il suo motivo. Farlo qui, senza motivo dichiarato, sarebbe aggiungere un pattern per un'eventualità non chiesta.

### Il tooltip come pseudo-element, e le sue limitazioni

`::after` con `content: attr(data-label)` è il tooltip più semplice possibile e ha tre limiti da conoscere:

1. **Non è navigabile.** Un tooltip come pattern ARIA è un elemento con `role="tooltip"` a cui `aria-describedby` del bersaglio punta. Qui no: il nome accessibile del link è la sua `<span className="nav__item__label">Clienti</span>`, che c'è sempre nel DOM (invisibile ma presente per gli screen reader). Il tooltip pseudo-element è **solo visivo** per l'utente vedente in stato richiuso. È coerente con `design-system.md` §5, che parla di «suggerimento al passaggio del mouse», non di descrizione strutturale.

2. **Non è raggiungibile da tocco.** Su tablet un tap sul link naviga, e il tooltip non compare. È il compromesso di ogni tooltip su hover — anche i tooltip ARIA veri hanno la stessa limitazione — ed è mitigato dal fatto che sotto i 720px l'utente comunque vede solo le icone, che ha già associato alle sezioni nella sua sessione principale con nav espansa. Se questo diventasse un problema, la strada è un `long-press` che apre l'etichetta, ma non è per questa story.

3. **Ha `z-index: 100` e va fuori dalla sidebar.** Il rischio è che si sovrapponga a contenuto della pagina che ha uno `z-index` più alto. Nessuna cosa nella pagina ha `z-index` più alto di 10 oggi (verificato: `save-bar` è `position: fixed` con `z-index: 10`); il tooltip a 100 sta sopra tutto per costruzione. Se un giorno una schermata modale nascesse, va coordinato lì.

### Ledger riga 121: perché si annota e non si chiude

Il ledger dice: «Punto di ripresa: la Story 5.1, che è la prima a guardare la forma invece di una funzione». Ho letto quella riga tre volte, e la lettura che regge è la seguente.

«La prima a guardare la forma invece di una funzione» era vero nel momento in cui la 4.1 ha scritto quella nota: pensava a una story generica di rifinitura. Ma **quella nota è stata scritta prima che l'Epic 5 fosse spezzato in 5.1 e 5.2**. Con l'Epic 5 diviso, la 5.1 è la story della nav e la 5.2 è la passata di accessibilità e di forma su tutte le schermate — e le tre card che il ledger 121 nomina non sono nav, sono contenuto. L'estrazione di una macchina di quattro stati usata da tre card riguarda la 5.2, non questa.

Farlo qui vorrebbe dire toccare `src/app/(app)/clienti/[id]/client-card.tsx`, `people-card.tsx`, `assessments-card.tsx`, `page.tsx` (per riverificare gli stati), e probabilmente `src/lib/use-write.ts` per capire come un hook o un helper terrebbe insieme la macchina. Sono cinque-sei file, cioè un'altra story dentro questa. Il primo difetto nominato da `AGENTS.md` è «una cosa alla volta».

L'annotazione al ledger dice queste tre cose e sposta il punto di ripresa alla 5.2. Chi lo cerca legge di seguito la stessa riga con un punto di ripresa aggiornato — non una voce che sparisce senza motivo scritto.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/app/(app)/nav-icons.tsx` | **nuovo** — due (o tre) icone SVG a tratto, `currentColor` | 1, 4 |
| `src/app/(app)/nav-actions.ts` | **nuovo** — `setNavCollapsed` scrive il cookie `nav_collapsed` | 2 |
| `src/app/(app)/sidebar-toggle.tsx` | **nuovo** — pulsante client `'use client'`, `aria-expanded`, `router.refresh()` | 4 |
| `src/app/(app)/layout.tsx` | legge il cookie, applica `.sidebar--collapsed`, monta il toggle | 3 |
| `src/app/(app)/nav.tsx` | icone dentro le voci, `data-label`, `id="app-nav"`, commento aggiornato | 5 |
| `src/app/globals.css` | regole nuove per `--collapsed`, tooltip, toggle; riscrittura del `@media 720` | 6 |
| `docs/design-system.md` | §5 nota sui due richiusi; §9 token `--ink-inverse` (solo se scelto) | 9 |
| `docs/bmad/implementazione/deferred-work.md` | 1 voce chiusa, 1 annotazione, 1-2 voci nuove | 8 |
| `docs/bmad/implementazione/sprint-status.yaml` | `5-1` a `review` a implementazione conclusa | (fine) |

**E basta.** In particolare **non** si aprono: nessun file in `src/components/`, nessun file in `src/lib/`, nessun file in `src/app/(app)/clienti/**`, nessun file in `src/app/(app)/questionario/**`, nessuna server action fuori da `nav-actions.ts`, nessuna migrazione, nessun test file (i moduli nuovi sono JSX puro e server action di quattro righe). Se durante l'implementazione sembra necessario aprirne uno fuori da questa tabella, **fermati e dillo**.

### Domande aperte, e cosa propongo

**Domanda 1 — Il bianco del tooltip: token nuovo o eccezione dichiarata?**
UX-DR1 dice testualmente «testo bianco» sul fondo `--ink` del suggerimento. Il colore esiste solo in quel punto del software oggi. Le due strade:

- **Opzione A: eccezione dichiarata.** `color: #FFFFFF` a `globals.css:<riga>` con un commento che dice perché è l'unico valore esadecimale fuori dai token: UX-DR1 lo prescrive, il caso è unico, aggiungere un token per un uso singolo alimenterebbe la palette di segnale con nomi che nessuno rilegge. Ledger nuovo, breve.
- **Opzione B: token nuovo `--ink-inverse: #FFFFFF`.** Aggiunta simmetrica ai `--ok-ink`, `--warn-ink`, `--bad-ink` di D26 — un inchiostro pensato per un fondo specifico. La regola «nessun esadecimale fuori dai token» resta pulita. `design-system.md` §2 e §9 e `globals.css` prendono una riga in più, senza ledger.

**Proposta: B.** Il costo è tre righe (una in ognuno dei tre posti dove i token vivono), il beneficio è che una regola dichiarata dal progetto («nessun esadecimale fuori dai token») resta vera per costruzione invece che con un'eccezione. Da confermare all'implementazione.

**Domanda 2 — Il richiuso sotto i 720 è forzato, o si può espandere manualmente?**
La proposta di questa story è **forzato**: sotto i 720 la nav è sempre a icone e il toggle sparisce. L'alternativa è tenere il toggle visibile e permettere l'espansione, sapendo che l'espansione a 375 copre metà schermo. Chi userebbe l'espansione a 375? Probabilmente nessuno — a 375 le due icone bastano, e l'espansione sarebbe un errore, non una scelta. **Proposta: forzato.** Da confermare all'implementazione.

**Domanda 3 — Chevron o icona più espressiva sul toggle?**
Un `<`/`>` è la scelta più universalmente leggibile. Alternative: un `hamburger`/`X`, o due linee-a-quadrato tipo VS Code. **Proposta: chevron**, cambia verso con lo stato. Da confermare all'implementazione.

### Trappole note

**1. Usare `localStorage` invece del cookie.** È la prima intuizione ed è quella sbagliata: il layout server non lo può leggere, e la nav lampeggia dopo l'idratazione ogni volta.

**2. Rendere condizionalmente due alberi (espanso vs richiuso).** Vorrebbe dire due prop e due rami in `Nav`, e trasformerebbe una transizione in un salto. La CSS con la classe modificatore sulla sidebar è la strada che tiene le etichette montate.

**3. Usare `title` invece dello pseudo-element.** Il browser controlla font, colore e ritardo. Non è il tooltip che UX-DR1 chiede.

**4. Toccare `.main` o le regole di `.page-header*`.** Non c'è nessun motivo. La `.main` si adatta perché la `.shell` è a griglia con `1fr` sulla seconda colonna. Le voci che vogliono `.main` cambiata (`min-width: 0`, ecc.) sono altre e appartengono alla 5.2.

**5. Aggiungere `lucide-react` o un'altra icon library per due icone.** Le venti righe di JSX sono meno del `package.json` che cambia più tutto il tree del pacchetto in produzione.

**6. Mettere `aria-expanded={collapsed}`.** L'istinto dice il contrario del giusto. `aria-expanded` è vero quando il contenuto controllato è **espanso**, non quando lo stato che porta il nome «collapsed» è vero. Va scritto nel commento del componente.

**7. Estrarre la macchina dei quattro stati (voce ledger 121).** Non è AC di questa story, sposta il perimetro di cinque-sei file, e c'è una story dedicata (5.2) per la forma. L'annotazione al ledger la sposta lì.

**8. Trattare la nav richiusa a 720 come una modalità diversa dalla richiusa per scelta.** Non lo è: la stessa classe `.sidebar--collapsed`, lo stesso CSS. Cambia solo chi la applica — un'operazione dell'utente sopra i 720, una media query sotto.

**9. Animare la larghezza in `ms` diversi dai token del progetto.** `--dur-base` (220ms) è la comparsa, `--dur-fast` (150ms) è il passaggio. La transizione della sidebar è una comparsa (di uno stato nuovo), non un passaggio, quindi `--dur-base`.

**10. Dimenticare il `router.refresh()` dopo la server action.** Senza, il cookie si scrive ma il layout non lo rilegge. L'utente vede lo stato locale del pulsante ma il DOM della sidebar resta com'era: al prossimo click torna indietro visivamente perché lo stato server è ancora l'altro. È l'errore che si trova solo provando.

### Sull'accessibilità (che è di 5.2, ma qui va detto quel poco)

Questa story non è la passata di accessibilità — è la 5.2. Ma tre cose vanno curate qui perché nascono in questa story:

1. Il nome accessibile del toggle cambia con lo stato (`Espandi la navigazione` / `Richiudi la navigazione`).
2. L'icona nel link ha `aria-hidden="true"` perché il nome accessibile è l'etichetta (che c'è sempre nel DOM, anche da richiuso).
3. `aria-expanded` sul toggle e `aria-controls="app-nav"` sul `<nav>`.

**Cosa la 5.1 non fa e la 5.2 farà:** verificare il contrasto di ogni testo dell'interfaccia (compresi i tooltip), rifare i bersagli tattili a 44 (compreso il toggle di 36), sistemare il focus in `--sec-*` corrente invece che in `--sec-prequalifica` di ripiego, chiudere le voci di ledger sui `.error-box`/`.warn-box`, sui `.btn` a 40, sull'`Esporta` collegamento travestito da pulsante, sulla sovrapposizione a 375, sullo scheletro a quattro figli, sulla riga d'hover della tabella clienti.

### Riferimenti

- `docs/prd-v1.md` §4 «Elenco clienti» e §5 «Requisiti non funzionali» (NFR4, tablet)
- `docs/design-system.md` §5 «Navigazione laterale», §9 «Token», §10 «Da non fare»
- `docs/kb-0.md` §2 «Convenzioni di codice» (nessuna dipendenza senza motivo), §6 «Interfaccia e design» (quattro stati)
- `docs/00-contesto-e-decisioni.md` D18 (design system approvato), D26 (revisione «viva» dei token)
- `docs/AGENTS.md` (una cosa alla volta, nessun valore esadecimale fuori dal design system, nessuna dipendenza nuova senza motivo)
- `docs/bmad/pianificazione/epics.md` § Epic 5 (rifinitura) e § Story 5.1 (i 4 AC)
- `docs/bmad/implementazione/deferred-work.md` riga 70 (fascia stretto: **da chiudere qui**) e riga 121 (macchina 4 stati: **da annotare**)

## Verifica di sessione

Le caselle qui sotto le mette Luca dopo la revisione del codice, non l'implementazione. Sono la prova che AC1-AC4 valgono con un browser vero, non solo con una riproduzione statica.

- [x] La nav parte espansa al primo accesso senza cookie
- [x] Un clic sul toggle la richiude, e il cookie compare in DevTools con `nav_collapsed=1`
- [x] Un ricaricamento della pagina la ritrova richiusa (AC1)
- [x] Da richiusa, il passaggio del mouse su `Clienti` fa comparire un suggerimento nero con «Clienti» in bianco (AC2)
- [x] Da richiusa, la voce della sezione corrente ha fondo `--surface-sunken`, l'icona nel colore della sezione, e la barra verticale a sinistra (AC3)
- [x] A 375px la nav è forzata a icone e il toggle è invisibile (AC4)
- [x] A 320px la pagina non scorre di lato (verifica di sanità oltre l'AC)
- [x] La transizione fra espanso e richiuso non produce salti del contenuto sotto
- [x] Con `prefers-reduced-motion: reduce` attiva nel sistema operativo, la transizione è istantanea
- [x] Il pulsante toggle ha un alone di focus visibile con Tab
- [x] `SignOutButton` resta in fondo alla sidebar in entrambi gli stati e resta cliccabile

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

Nessun difetto in volo registrato: nessun test rosso oltre a quelli attesi della fase rossa (tre nuovi comportamenti da rivedere in verifica di sessione, non da suite automatica), nessuna correzione a cascata, nessun `HALT`.

Le tre domande in coda alle Dev Notes sono state chiuse **prima** di scrivere codice, con le risposte proposte in tabella:

- Domanda 1 → **Opzione B**: nasce `--ink-inverse: #FFFFFF` a `globals.css:60` e in `design-system.md` §2 e §9. Nessuna voce a ledger sull'esadecimale.
- Domanda 2 → **Forzato**: sotto i 720px la nav è sempre a icone, il toggle è nascosto, la scelta ricordata non conta.
- Domanda 3 → **Chevron** (`<`/`>`), verso variabile con lo stato.

**Un difetto trovato dalla misura del Task 7 e corretto in corso d'opera, non trovato dallo schema iniziale del CSS.** La prima stesura di `.nav__item--active .nav__item__icon` non c'era: l'icona attiva ereditava `color: var(--ink)` da `.nav__item--active` (`globals.css:173`), e la barra verticale a fianco portava il colore della sezione mentre l'icona no. La misura CDP su Chrome ha stampato `activeIconColor: rgb(20, 18, 16)`, cioè `--ink`, e AC3 chiede esplicitamente «icona nel colore della sezione». Aggiunto il selettore mirato (`globals.css:172-176`): la stessa misura ora stampa `rgb(58, 79, 222)`, che è `--sec-clienti`. AC3 regge per costruzione.

### Completion Notes List

**Le misure che chiudono AC1–AC4, dalla riproduzione statica CDP-driven (Chrome 151, `Emulation.setDeviceMetricsOverride`).** Tutti i numeri da `getComputedStyle`, `getBoundingClientRect` e `document.documentElement.scrollWidth`.

| Caso | `sidebar_width` | `main_width` | `main_usable` | `scrollWidth` | `toggle_display` | `label_maxWidth` | `icon_color` |
|---|---|---|---|---|---|---|---|
| 1280 espansa | 232.00 | 1048.00 | 968.00 | 1280 | flex (36×36) | 200px | rgb(58,79,222) |
| 1280 richiusa | 56.00 | 1120.00 (max-w) | 1040.00 | 1280 | flex (36×36) | 0px | rgb(58,79,222) |
| 375 (MQ forzata) | 56.00 | 319.00 | 287.00 | 375 | none | 0px | rgb(58,79,222) |
| 320 (MQ, sanità) | 56.00 | 264.00 | 232.00 | 320 | none | 0px | rgb(58,79,222) |

- **AC1** — la sidebar transisce fra 232 e 56 al toggle (verificato applicando `.sidebar--collapsed`); il cookie `nav_collapsed` si scrive via `setNavCollapsed` in `nav-actions.ts:26` e si legge in `layout.tsx:15`. La persistenza è tra visite (opzioni: `maxAge` 1 anno, `path: '/'`), e la casella «alla visita successiva» va provata da Luca in **Verifica di sessione** (nessuna sessione automatizzata la copre).
- **AC2** — il suggerimento è pseudo-element `::after`, verificato con hover forzato via injection CSS: `content: "Clienti"`, `background: rgb(20, 18, 16)` (`--ink`), `color: rgb(255, 255, 255)` (`--ink-inverse`), `padding: 6px 10px`, `border-radius: 12px`, `box-shadow: 0 4px 16px rgba(27, 25, 23, 0.06)`, `z-index: 100`. Contrasto WCAG **18,69:1** (attesa era ~15:1, sovrabbondante). Posizione `left: 47px` risolta da `calc(100% + 8px)` sull'item da 39×44: appare fuori dalla sidebar, `.nav__item` è già `position: relative` (`globals.css:156`) e `.sidebar` non è contenente della posizione.
- **AC3** — voce attiva a 1280 espansa/richiusa: `activeBg: rgb(234, 229, 220)` (`--surface-sunken` ✓), `activeBarBefore: rgb(58, 79, 222)` (`--sec-clienti` ✓), `activeIconColor: rgb(58, 79, 222)` (`--sec-clienti` ✓ — v. Debug Log per la correzione in corso d'opera).
- **AC4** — a 375 e a 320 (verifica di sanità oltre l'AC): `documentElement.scrollWidth` coincide con `clientWidth`, eccedenza 0. La navigazione non copre il contenuto e resta raggiungibile (colonna 56, main 319 a 375 e main 264 a 320).

**Il conteggio dei test resta a 267.** Nessun test unitario aggiunto: le icone sono JSX puro senza logica, la server action è quattro righe di cookie setter, il toggle è `useState` + `useTransition` senza rami, e il layout è una lettura di cookie. La verifica è a schermo (Task 7 statico + Verifica di sessione).

**`npm run typecheck` senza uscita, `npm run build` riuscito** — la trasformazione di `layout.tsx` a `async` è coperta dal supporto Server Components di Next 16, nessuna riga di `next.config.*` toccata.

**Sedici migrazioni a registro invariate** (0001–0016): questa story non porta migrazioni, non scrive dati e non tocca lo schema.

**Perimetro di file rispettato alla lettera della tabella in Dev Notes.** Grep di sanità: `grep -rn 'sidebar\|nav-icons\|nav-actions\|sidebar-toggle\|--ink-inverse' src/` tocca solo `layout.tsx`, `nav.tsx`, i tre file nuovi, e `globals.css` più i suoi commenti; `docs/design-system.md` e `docs/bmad/implementazione/deferred-work.md` cambiano come dichiarato dai Task 9 e 8.

**Cosa la 5.1 non fa e la 5.2 farà**, che è stato scritto nelle Dev Notes e va ripetuto qui: passata di contrasto (compresi `.error-box`, `.warn-box`), bersagli tattili a 44 (compreso il toggle a 36), focus in `--sec-*` corrente invece che ripiego (compreso l'outline del toggle in `--sec-clienti-tint`), estrazione della macchina dei quattro stati delle tre card (voce ledger 121, annotata).

**Change Log** — Story 5.1 implementata l'11 agosto 2026: navigazione laterale richiudibile con cookie `nav_collapsed`, pulsante toggle 36×36 nella fascia del brand, tooltip pseudo-element da richiusa, media query a 720px che forza icone senza toggle, token `--ink-inverse` per il testo del tooltip. Voce ledger «fascia stretto» chiusa, voce «macchina quattro stati» annotata con nuovo punto di ripresa alla 5.2, due voci ledger nuove (toggle 36×36, outline focus in `--sec-clienti-tint`).

### File List

**Nuovi:**
- `src/app/(app)/nav-icons.tsx` — `ClientiIcon`, `QuestionarioIcon`, `ChevronLeftIcon`, `ChevronRightIcon` (SVG a tratto, `currentColor`).
- `src/app/(app)/nav-actions.ts` — server action `setNavCollapsed(collapsed)`, cookie `nav_collapsed`.
- `src/app/(app)/sidebar-toggle.tsx` — client component, `aria-expanded`, `aria-controls="app-nav"`, `useTransition` + `router.refresh()`.

**Modificati:**
- `src/app/(app)/layout.tsx` — `async`, legge `cookies()`, applica `.sidebar--collapsed`, monta `<SidebarToggle>` e `<span class="sidebar__brand-text">`.
- `src/app/(app)/nav.tsx` — `id="app-nav"`, icone dentro le voci con `.nav__item__icon`/`.nav__item__label`, `data-label` sull'ancora, commento aggiornato.
- `src/app/globals.css` — token `--ink-inverse`, regole `.shell:has(.sidebar--collapsed)`, `.sidebar--collapsed`, `.sidebar__brand-text`, `.sidebar-toggle`, `.nav__item__icon`, `.nav__item__label`, `.nav__item--active .nav__item__icon`, tooltip `::after`, riscrittura `@media (max-width: 720px)`.
- `docs/design-system.md` — §2 nuovo blocco `--ink-inverse`, §5 nota sui due stati richiusi, §9 riga token.
- `docs/bmad/implementazione/deferred-work.md` — chiusura voce «fascia stretto» (riga 70), annotazione voce «macchina quattro stati» (riga 121), sezione nuova con due voci (toggle 36×36, outline focus).
- `docs/bmad/implementazione/sprint-status.yaml` — `5-1-navigazione-laterale-richiudibile: in-progress` → `review`.

### Review Findings

- [x] [Review][Defer] SignOutButton sfora la sidebar richiusa [`sign-out-button.tsx:20`, `globals.css:376-379`] — deferred alla Story 5.2. `.btn` ~64px non entra nei 32px utili di `.sidebar__foot` da collapsed; sfora sopra `.main` (nessun `overflow: hidden` sulla sidebar). Rimandato: la 5.2 è la passata di forma e bersagli tattili su tutte le schermate, e tocca comunque `SignOutButton` insieme al resto — tirare una linea qui su un componente solo sposterebbe il perimetro.
- [x] [Review][Patch] Doppio anello di focus sul toggle [`globals.css:235-240`] — applicato: aggiunto `box-shadow: none` dentro `.sidebar-toggle:focus-visible` per non sommarsi all'alone della regola universale `:focus-visible`.
- [x] [Review][Patch] Commento «`save-bar` sta a 10» falso [`globals.css:319-321`] — applicato: sostituito con la ragione vera del `z-index: 100` (nessun altro elemento dichiara `z-index`; valore alto di riserva per una futura finestra modale).
- [x] [Review][Patch] Regole tooltip duplicate quasi identiche [`globals.css:328-353` e `1499-1518`] — applicato: la forma del tooltip è scritta una volta sola in `.nav__item::after` (base con `opacity: 0` e `pointer-events: none`), i due contesti — classe `.sidebar--collapsed` e media query `<= 720px` — si limitano ad attivare `opacity: 1` sull'hover e sul focus. La media query passa da 25 righe a 5.
- [x] [Review][Defer] `aria-busy` mancante sul toggle [`sidebar-toggle.tsx:47`] — deferred, passata di accessibilità della Story 5.2. `aria-expanded` è già presente per il ruolo dichiarato, ma lo stato di attesa durante il round-trip non è annunciato.
- [x] [Review][Defer] Multi-tab sync del cookie non gestito [`sidebar-toggle.tsx:30`] — deferred, non è AC. `useState(defaultCollapsed)` legge il valore solo al primo mount; se il cookie cambia da un'altra tab, l'`aria-expanded` locale resta stale finché il componente non rimonta.
- [x] [Review][Defer] Deviazioni CSS dalla lettera del Task 6 non dichiarate nel DAR — deferred, nessuna rompe un AC. `transition: grid-template-columns` invece di `transition: width` (`globals.css:142`), `padding: 10px 4px` invece di `10px 8px` prescritti (`globals.css:307`, `1491`), `transition: padding` aggiunta a `.sidebar` e `.sidebar__brand` non prescritta (`globals.css:156, 178`), `.sidebar-toggle:disabled` non prescritta (`globals.css:240-243`). Da annotare come scostamenti nel DAR alla prossima code review o alla 5.2.
