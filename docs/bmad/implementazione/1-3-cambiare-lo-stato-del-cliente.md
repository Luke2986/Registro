---
baseline_commit: 66f096c4f41e40b3b3190f1da336900071f2cdf0
---

# Story 1.3: Cambiare lo stato del cliente

Status: done

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 3 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want marcare a che punto sono con un cliente,
so that dall'elenco capisco a colpo d'occhio dove mi trovo senza rileggere le note.

## Acceptance Criteria

**AC1 — i cinque stati, nessuno migliore di un altro**
**Given** un cliente in qualsiasi stato
**When** apro il selettore dello stato
**Then** vedo i cinque valori: potenziale, valutato, attivo, chiuso, perso
**And** nessuno di essi è presentato come migliore o più avanzato di un altro (UX-DR5)

**AC2 — nessuno stato blocca niente**
**Given** un cliente in stato `chiuso` o `perso`
**When** provo a modificarne l'anagrafica o ad aprirvi qualsiasi cosa
**Then** l'azione riesce: nessuno stato impedisce nessuna azione (NFR8, FR3)

**AC3 — la pillola nell'elenco**
**Given** uno stato assegnato
**When** guardo la riga nell'elenco
**Then** vedo la pillola alta 22 con raggio pieno, punto di 6px prima del testo, e il testo sempre presente accanto al colore (UX-DR2, UX-DR5)

## Tasks / Subtasks

- [x] **Task 1 — Fonte unica dei cinque stati** (AC: 1, 3)
  - [x] Creare `src/lib/client-status.ts`: dati e funzioni pure, **nessun import di React né di Supabase**, tutto esportato, così la Story 1.6 può metterci un test sopra senza riscrivere niente (`kb-0.md` §7). È lo stesso patto di `client-fields.ts`.
  - [x] Esportare l'elenco `as const`, nello stesso ordine del vincolo `check` sulla tabella (`0002_clients.sql:10`):

    ```ts
    export const CLIENT_STATUSES = ['potenziale', 'valutato', 'attivo', 'chiuso', 'perso'] as const
    export type ClientStatus = (typeof CLIENT_STATUSES)[number]
    ```

    `as const` non è cosmetico: senza, il tipo si allarga a `string[]` e `ClientStatus` non vale più niente — la stessa trappola già scritta per `CLIENT_FIELDS` (`client-fields.ts:15`).
  - [x] **Nessuna mappa di etichette.** I cinque valori del database sono già le parole italiane che compaiono nell'interfaccia: una tabella `valore → etichetta` che ripete `potenziale: 'potenziale'` è un secondo posto da tenere allineato senza guadagnarci niente. Se un giorno l'etichetta si allontanerà dal valore, l'etichetta nasce qui.
  - [x] Esportare `isClientStatus(value: unknown): value is ClientStatus`. Serve al server per rifiutare un valore che non è nell'elenco, e al componente della pillola per scegliere il modificatore senza rompersi su un valore sconosciuto.
  - [x] **Non toccare `client-fields.ts` per aggiungere `status` a `CLIENT_FIELDS`.** `isClientFieldKey('status')` deve continuare a rispondere falso: è la trappola di sicurezza chiusa dalla Story 1.2, e `status` è uno dei quattro nomi di colonna che quel controllo esiste per rifiutare (`client-fields.ts:47-55`).
  - [x] In `client-fields.ts` aggiungere **solo** il descrittore del campo, accanto a `NAME_FIELD` e per lo stesso identico motivo — un valore esportato da un file `'use client'` non arriva al Server Component (Debug Log della Story 1.2):

    ```ts
    export const STATUS_FIELD = { key: 'status', label: 'Stato', kind: 'status' } as const
    export type EditableField = ClientField | typeof NAME_FIELD | typeof STATUS_FIELD
    ```

    Il descrittore sta lì perché lì vive l'unione `EditableField`, cioè il tipo della proprietà del componente. I cinque valori stanno in `client-status.ts` perché li usa anche la pillola, che non è un campo.

- [x] **Task 2 — L'azione che cambia lo stato** (AC: 1, 2)
  - [x] Aggiungere `updateClientStatus` in `src/app/(app)/clienti/actions.ts`, **il file che esiste già**. Nessun file di azioni per story: 1.1 lo ha creato condiviso, 1.2 ci ha messo le sue due, 1.4 e 1.5 ci metteranno le loro.
  - [x] **Azione separata da `updateClientField`, e non è una scelta di stile.** Far passare `status` dall'allow-list dei campi vorrebbe dire aprirla su una colonna che il controllo esiste apposta per chiudere. Lo stato ha un vocabolario suo di cinque valori, e la validazione è `isClientStatus`, non `normalizeTextValue`. È lo stesso motivo per cui `renameClient` è separata.

    ```ts
    export type UpdateClientStatusState = {
      error?: string
      /** Lo stato com'è adesso nel database. Sincronizza il selettore dopo il salvataggio. */
      saved?: string
    }
    ```

    La forma `{ error?, saved? }` non è libera: è quella che `SaveResult` (`use-editable-field.ts:8`) si aspetta indietro. Cambiarla vuol dire riscrivere il campo modificabile.
  - [x] Sequenza obbligata:
    1. `const session = await openSession('updateClientStatus')` — **l'helper esiste già** (`actions.ts:272`) e tiene la distinzione fra sessione assente e auth irraggiungibile. Non riscriverla, non copiarla.
    2. leggere `client_id` dal `formData` e verificarlo con la costante `UUID` già presente in quel file (`actions.ts:257`);
    3. leggere `status` e passarlo da `isClientStatus`; se non passa → errore generico, e nei log **solo il fatto che è stato rifiutato**, coerente con `updateClientField` (`actions.ts:117-121`);
    4. `update({ status })` sulla riga, chiedendo indietro la conferma con `.select('id').maybeSingle()`;
    5. `revalidatePath(\`/clienti/${clientId}\`)` **e** `revalidatePath('/clienti')` — la seconda per due motivi insieme: la pillola dello stato è una colonna dell'elenco, e la scrittura sposta `updated_at`, che oggi è l'ordinamento;
    6. ritornare `{ saved: status }`.
  - [x] `maybeSingle` e non `single`: con la sicurezza a livello di riga attiva, la riga di un altro proprietario e una riga cancellata arrivano identiche, cioè zero righe, e con `single` diventerebbero un errore invece di un messaggio comprensibile. `data` nullo senza errore → `{ error: 'Questa scheda non è più disponibile. Torna all\'elenco.' }`.
  - [x] `error` → `console.error` con **solo** `code` e `message`, mai `details` (`kb-0.md` §3, NFR15). All'utente va `'Lo stato non è stato salvato. Riprova fra un momento.'`
  - [x] Nessun ramo speciale sul codice `23514`: qui il vincolo `check` scatterebbe solo se `CLIENT_STATUSES` si allontanasse dal vincolo sulla tabella, e in quel caso il messaggio generico è la risposta giusta — non c'è niente che l'utente possa fare diversamente.
  - [x] **Nessun `redirect()`.** Come le due azioni della Story 1.2: cambiare stato non porta da nessuna parte, si resta sulla scheda, e una navigazione porterebbe via quello che è scritto negli altri campi (NFR1).
  - [x] **Mai scrivere `updated_at`.** Lo aggiorna il trigger `clients_set_updated_at`, che è `before update` (`0006_triggers.sql`).
  - [x] Non aggiungere `.eq('owner_id', user.id)`: la riga la filtra la policy `clients_owner_all` (`0007_rls.sql:17`). Un filtro a mano è ridondante e fa credere che sia lui a proteggere (D20, `database.md` §6 variante A).
  - [x] **Nessuna condizione sullo stato di partenza, nessuna transizione ammessa o vietata, nessun ordine fra i cinque valori.** Da qualsiasi stato si passa a qualsiasi altro, compreso lo stesso. È AC2 e prima ancora D14: il software registra e mostra, non decide e non vieta.

- [x] **Task 3 — Il selettore nella scheda** (AC: 1, 2)
  - [x] Estendere `src/app/(app)/clienti/[id]/client-field-form.tsx` con il `kind: 'status'`. **Non creare un secondo componente**: `kind` esiste per decidere tre cose — che controllo si rende, quale azione si chiama, se il campo si salva da solo — e questo è esattamente il quarto caso. Un `client-status-form.tsx` quasi uguale è la duplicazione silenziosa che `kb-0.md` §9 chiede di fermare.

    | kind | controllo | azione | salvataggio automatico |
    |---|---|---|---|
    | `name` | `input` a `--t-display` | `renameClient` | no |
    | `short` | `input` | `updateClientField` | no |
    | `integer` | `input` `inputMode="numeric"` | `updateClientField` | no |
    | `long` | `textarea` 3 righe | `updateClientField` | **sì** |
    | `status` | `select` con i cinque valori | `updateClientStatus` | no |

  - [x] In `run`, un terzo ramo prima di quello dei campi: `payload.set('status', next)` e `updateClientStatus({}, payload)`. Il `FormData` continua a costruirlo `run` e nessun altro: un solo percorso di scrittura, come dopo la revisione della Story 1.2.
  - [x] Resa: `<select {...shared} className="input select">` con `CLIENT_STATUSES.map(...)` a produrre le cinque `<option>`. Nient'altro: nessun gruppo, nessun separatore, nessuna icona, nessun valore vuoto in testa — lo stato non è mai nullo, la colonna ha `not null` con default `potenziale`.
  - [x] **Il selettore si conferma, non si salva da solo** (D21). È un campo corto: `Salva` e `Annulla` compaiono solo quando il valore è cambiato, spariscono quando è salvato, e la loro sparizione è la conferma. Nessun `SaveIndicator` qui: l'indicatore appartiene ai campi che salvano da soli, e metterlo su un campo che si conferma vorrebbe dire raccontare due storie diverse nella stessa schermata.
  - [x] Etichetta vera `Stato` con `htmlFor`, mai il solo valore corrente a fare da etichetta (UX-DR14). L'`id` si costruisce dalla chiave come per gli altri: `campo-status`.
  - [x] In `src/lib/use-editable-field.ts` aggiungere `HTMLSelectElement` al tipo `Control` (riga 15). **È l'unica modifica ammessa a quel file**, ed è di soli tipi: la macchina a stati è appena uscita da una revisione e non si tocca. `onChange` riceve `{ target: { value } }`, che vale identico per un `select`; `onBlur` non fa niente perché `autosave` è falso; il controllo su `relatedTarget` continua a valere.
  - [x] `keepFocus` (`onMouseDown` che impedisce lo spostamento del fuoco) resta legato ai soli campi con salvataggio automatico, cioè `autosaves`. Il selettore non ne ha bisogno e non deve prenderlo.
  - [x] In `src/app/(app)/clienti/[id]/page.tsx`, dentro `ClientIdentity`, **sostituire `<StatusPill status={client.status} />` con `<ClientFieldForm clientId={client.id} field={STATUS_FIELD} value={client.status} />`**. Due rappresentazioni dello stesso valore a dieci pixel di distanza sono una di troppo: nella scheda comanda il selettore, la pillola resta il modo di leggere lo stato dall'elenco.
  - [x] Aggiornare il commento sopra `ClientIdentity` (`page.tsx:96-100`), che oggi dice che la pillola resta in sola lettura perché il selettore è un'altra story. Quella story è questa.
  - [x] **Togliere l'import di `StatusPill` da `page.tsx`**: dopo la sostituzione non lo usa più nessuno lì, e un import morto è codice morto (`kb-0.md` §2). Il componente resta vivo: lo usa l'elenco.
  - [x] **Da preservare intatto** in `page.tsx`: il controllo `UUID` con `notFound()`, la distinzione fra sessione assente e auth irraggiungibile, `maybeSingle()` col suo commento, il `console.error` con solo `code` e `message`, `ClientHeader`, `ClientError`, `ClientFields` e `readValue`. `COLUMNS` e `ClientDetail` **contengono già `status`**: la query non cambia di una virgola.
  - [x] Verificare che `client-field-form.tsx` resti sotto le 200 righe (oggi 157). Se le supera, il file contiene due cose (`kb-0.md` §2).

- [x] **Task 4 — La pillola nei cinque stati** (AC: 3)
  - [x] `src/components/status-pill.tsx`: la mappa dei modificatori diventa `Record<ClientStatus, string>` con tutte e cinque le chiavi scritte. Così il giorno che uno stato entra nell'elenco e non nella mappa, `typecheck` si ferma; oggi la mappa è un `Record<string, string>` e un valore mancante non lo segnala nessuno.
  - [x] La proprietà resta `status: string` e non `ClientStatus`: `ClientRow['status']` è `string` nei tipi generati dallo schema (`database.types.ts:168`), e i tipi generati non si modificano a mano. Si restringe con `isClientStatus`, e un valore fuori elenco continua a mostrarsi neutro invece di rompere la pagina:

    ```ts
    const MODIFIER: Record<ClientStatus, string> = {
      potenziale: '',
      valutato: ' pill--valutato',
      attivo: ' pill--attivo',
      chiuso: '',
      perso: ' pill--perso',
    }

    const modifier = isClientStatus(status) ? MODIFIER[status] : ''
    ```

    Con tutte e cinque le chiavi scritte, `noUncheckedIndexedAccess` non entra in gioco e il `?? ''` di oggi non serve più: quello che serviva a coprire una mappa incompleta lo copre adesso il tipo.
  - [x] Portare la resa alla tabella "Stati del cliente" di `design-system.md` §2, che è la regola specifica dei cinque stati del cliente:

    | stato | punto | testo | peso |
    |---|---|---|---|
    | potenziale | `--ink-faint` | `--ink-muted` | 500 |
    | valutato | `--sec-clienti` | `--ink` | 500 |
    | attivo | `--ok` | `--ink` | 500 |
    | chiuso | `--ink-faint` | `--ink-muted` | 500 |
    | perso | `--neutral` | `--ink-muted` | 500 |

    Il fondo resta `--neutral-tint` per tutti e cinque, cioè quello che `.pill` ha già. **È il colore a cambiare di posto: dal fondo al punto.** Oggi `valutato` ha il fondo azzurro pieno di tinta e `attivo` quello verde, e una pillola interamente verde accanto a una interamente grigia dice che uno dei due clienti sta meglio dell'altro. AC1 chiede il contrario, e §2 lo scrive nero su bianco: il colore sta nel punto, il testo resta inchiostro.
  - [x] In `src/app/globals.css` i modificatori colorano il punto, non il fondo: `.pill--valutato .pill__dot { background: var(--sec-clienti) }` e così per `attivo` (`--ok`) e `perso` (`--neutral`); il colore del testo si imposta sul `.pill`. `potenziale` e `chiuso` non hanno modificatore: sono già il caso base. `.pill__dot` continua a valere `currentColor` di suo, che è il caso base.
  - [x] `.pill` base: `font-weight: 500` c'è già, il punto da 6px c'è già, l'altezza 22 e il raggio pieno pure. **Non riscrivere quello che c'è**: si toccano solo i modificatori.
  - [x] `src/app/(app)/clienti/page.tsx` **non si tocca**: usa già `<StatusPill>` e continua a usarlo identico. Il testo dello stato è già accanto al colore, quindi il colore non è mai l'unico portatore di significato (UX-DR2).

- [x] **Task 5 — Le classi che mancano, e solo quelle** (AC: 1)
  - [x] In `src/app/globals.css`, aggiungere `.select`: `cursor: pointer` e `padding-right` sufficiente alla freccia nativa. Il resto lo dà `.input`, che è già applicata insieme: fondo, bordo, raggio, altezza minima 44px, focus.
  - [x] **Nessun `appearance: none`, nessuna freccia disegnata a mano.** Servirebbe un'immagine di sfondo con un colore scritto dentro, cioè un esadecimale fuori da questo file (UX-DR16), e toglierebbe al controllo il comportamento nativo su tablet, dove la compilazione avviene davvero (NFR4).
  - [x] Aggiungere `.field--status { min-width: 160px }`: `.detail-identity` è un flex che avvolge, e senza una larghezza minima il selettore si schiaccia accanto al nome. La classe si aggiunge accanto a `field--wide`, che risolve lo stesso genere di problema nella griglia.
  - [x] Prima di aggiungere qualsiasi altra cosa, verificare che non ci sia già: `.pill`, `.pill__dot`, `.field`, `.label`, `.input`, `.btn`, `.field__actions`, `.field__error`, `.detail-identity`, `.detail-grid`, `.meta`, `.data` esistono tutte.
  - [x] Nessun valore esadecimale fuori da questo file, in nessuna circostanza (UX-DR16).

- [x] **Task 6 — Lo scheletro segue la forma nuova** (AC: 1)
  - [x] In `src/app/(app)/clienti/[id]/loading.tsx`, lo scheletro della pillola (riga 22: largo 88, alto 22, raggio pieno) diventa quello di un campo: etichetta più controllo alto 44px, dentro un `.field field--status`. Uno scheletro che non ha la forma del contenuto fa saltare la pagina quando il contenuto arriva, ed è già stato corretto due volte nelle story precedenti.
  - [x] Il resto del file non si tocca: l'elenco dei campi continua a derivarsi da `CLIENT_FIELDS`.

- [x] **Task 7 — Verifica a mano sul percorso reale** (AC: 1, 2, 3)

  Le caselle dicono chi ha verificato cosa e restano vuote dove non ha verificato nessuno. Il percorso con accesso richiede una sessione che arriva per email: nessun agente può percorrerlo. Una casella spuntata per conto di terzi vale meno di una vuota (`kb-0.md` §7).

  *Verificabile dall'agente, senza sessione*
  - [x] `npm run typecheck` e `npm run build` puliti, stesse sette rotte di prima.
  - [x] Prova che la mappa della pillola sia esaustiva: togliere una chiave da `MODIFIER` in `status-pill.tsx` e verificare che `typecheck` si fermi, poi ripristinare. Se non si ferma, `Record<ClientStatus, string>` non è stato usato e Task 4 non ha chiuso niente.
  - [x] Prova che `status` resti fuori dall'allow-list dei campi: `isClientFieldKey('status')` risponde falso.
  - [x] `isClientStatus` sui casi limite: i cinque valori validi, `'Attivo'` con la maiuscola, `'  attivo'` con gli spazi, `''`, `null`, `undefined`, un numero, un oggetto. Tutti tranne i cinque esatti devono rispondere falso: qui non si normalizza niente, perché il valore non lo scrive una persona, lo manda un `select` costruito da `CLIENT_STATUSES`.
  - [x] `CLIENT_STATUSES` contiene esattamente i cinque valori del vincolo `check` in `0002_clients.sql:10`, negli stessi termini. Confronto fatto a occhio sul file, non dedotto.
  - [x] Nessun esadecimale fuori da `globals.css` (`grep` sui file toccati).

  *Da percorrere con una sessione aperta*
  - [x] Apro la scheda di un cliente: il selettore mostra lo stato che ha adesso, con l'etichetta `Stato` sopra.
  - [x] Apro il selettore: ci sono cinque voci e sono quelle giuste.
  - [x] Cambio stato e non confermo: compaiono `Salva` e `Annulla`. Premo `Annulla`: torna quello di prima.
  - [x] Cambio stato e confermo: i pulsanti spariscono. Ricarico: lo stato nuovo c'è.
  - [x] Torno all'elenco: la pillola di quel cliente mostra lo stato nuovo, e il cliente è in cima perché `updated_at` si è mosso.
  - [x] Guardo l'elenco con clienti nei cinque stati diversi: cinque pillole leggibili, il testo sempre accanto al punto, e nessuna che sembri più importante delle altre.
  - [x] Porto un cliente a `chiuso`, poi a `perso`, poi di nuovo a `potenziale`: tutte e tre le volte riesce, in qualsiasi ordine.
  - [x] Su un cliente `chiuso`: modifico un campo dell'anagrafica, correggo il nome, scrivo nelle note. Tutto riesce, niente è disabilitato, niente avvisa (AC2).
  - [x] Tolgo la rete e cambio stato: compare il messaggio che dice cosa fare, il selettore resta sul valore scelto, rimetto la rete e `Salva` funziona.
  - [x] Larghezza 375px: il selettore non si schiaccia sotto i 160px e resta toccabile a 44px (NFR4, UX-DR14).
  - [x] Il `padding-right: 40px` di `.select` è quello giusto: la parola più lunga non finisce sotto la freccia nativa, e non resta un buco d'aria. Il valore è stato scritto ragionando su come il browser disegna la freccia, non guardandolo (revisione del 3 agosto).
  - [x] Su un iPad vero: il `<select>` nativo rispetta i 44px di `.input`. Safari tratta altezza e padding di un `select` in modo suo, e le call si fanno anche fuori casa (NFR4).
  - [x] I cinque punti a confronto: `potenziale` e `chiuso` in `--ink-faint`, più chiari del testo e più chiari di `perso` in `--neutral`. È la correzione della revisione, e va vista.
  - [x] Da tastiera: si arriva al selettore, si apre e si sceglie senza mouse, il fuoco si vede, `Salva` e `Annulla` si raggiungono.
  - [x] Nessun errore in console.

### Review Findings

Revisione del 3 agosto 2026, tre livelli in parallelo (adversarial, edge case, aderenza alle AC).
Le severità sono state assegnate qui, non dai revisori, dopo aver riletto il codice attorno a ogni
punto segnalato. Sedici rilievi grezzi, sette scartati come rumore o come scelte già decise e
scritte, uno unito a un altro.

**Da decidere**

- [ ] [Review][Decision] La regola della pillola vive in due punti che ora dicono cose diverse — `design-system.md` §5 prescrive ancora «fondo nella tinta chiara del colore corrispondente, testo nel colore pieno». Dopo Task 4 tutte e cinque le pillole hanno fondo `--neutral-tint` e il colore sta nel punto, come chiede §2 «Stati del cliente». La scelta è giusta e confermata il 3 agosto, ma è scritta solo qui dentro: `kb-0.md` §8 chiede che una decisione superata si marchi come superata e resti visibile. Fra tre mesi §5 e §2 diranno due cose opposte e non ci sarà scritto quale ha vinto. Le strade: una nota dentro §5 che rimanda a §2 per i cinque stati del cliente; oppure una decisione nuova in `00-contesto-e-decisioni.md`; oppure entrambe. Conseguenza minore da registrare comunque: `--ok-tint` e `--sec-clienti-tint` non sono più usati da nessuna regola del foglio. → **Deciso il 3 agosto 2026: una nota dentro §5.** Sta dove chi legge la regola sbagliata la incontra, e non apre una decisione nuova per una regola che §2 già scriveva. Diventa una correzione.

**Corrette il 3 agosto 2026**

- [x] [Review][Patch] `design-system.md` §5 descrive una pillola che il codice non produce più: nota che rimanda a §2 per i cinque stati del cliente [docs/design-system.md:157]
- [x] [Review][Patch] Il punto di `potenziale` e `chiuso` è `--ink-muted`, non `--ink-faint`: due stati su cinque fuori dalla tabella §2 [src/app/globals.css:288]
- [x] [Review][Patch] `.select { padding-right: 12px }` toglie 4px al padding invece di aggiungerne: `.input` ne dichiara 16 [src/app/globals.css:390]
- [x] [Review][Patch] Commento superato: `.detail-identity` dice ancora che «la pillola resta accanto alla sua etichetta» [src/app/globals.css:481]
- [x] [Review][Patch] Il `<select>` è l'unico controllo del file senza `autoComplete="off"` [src/app/(app)/clienti/[id]/client-field-form.tsx:127]

**Com'è stato corretto**

- `.pill__dot` passa da `currentColor` a `var(--ink-faint)`. `potenziale` e `chiuso` non hanno modificatore, quindi prendevano il colore del testo (`--ink-muted`) e uscivano più scuri del punto di `perso`: l'ordine opposto a quello di §2. Con `--ink-faint` alla base, il commento che dice «sono già il caso base» diventa vero, e i tre modificatori continuano a sovrascriverlo.
- `.select` porta il padding destro da 12px a 40px. `.input` dichiara `12px 16px` e con quei 16 sostituisce lo spazio che il browser teneva da sé per la freccia nativa: 12px era meno della base, cioè il contrario di quello che Task 5 chiedeva. Il valore non era stato visto reso — il pannello browser non rende i file fuori dal progetto e il proxy rimanda a `/accedi` quelli dentro — quindi è finito fra le prove da percorrere con una sessione aperta, e il 3 agosto Luca l'ha guardato sull'anteprima: giusto.
- La nota in `design-system.md` §5 marca la regola come superata per i soli cinque stati del cliente e rimanda a §2, lasciandola scritta perché è ancora quella dei verdetti (`kb-0.md` §8: la storia non si cancella).

`npm run typecheck` e `npm run build` puliti dopo le correzioni, stesse sette rotte.

**Rimandate**

- [x] [Review][Defer] Uno stato fuori dai cinque si mostra come `potenziale` senza dirlo [src/app/(app)/clienti/[id]/client-field-form.tsx:127] — rimandata: irraggiungibile con lo schema di oggi
- [x] [Review][Defer] `save()` non controlla `dirty`: un Invio sul selettore riscrive lo stesso stato e sposta `updated_at` [src/lib/use-editable-field.ts:144] — rimandata, preesistente dalla Story 1.2
- [x] [Review][Defer] Un `baseline` che cambia non risincronizza `value` [src/lib/use-editable-field.ts:60] — rimandata, preesistente dalla Story 1.2
- [x] [Review][Defer] ~~I 44px del selettore nativo non sono verificati sul dispositivo che conta~~ [src/app/globals.css:366] — **chiusa il 3 agosto 2026**: era una prova da fare, e Luca l'ha fatta su iPad. Esce da `deferred-work.md`.
- [x] [Review][Defer] Cinque ternari annidati nella resa, e il sesto `kind` entra nella stessa catena [src/app/(app)/clienti/[id]/client-field-form.tsx:108] — rimandata: il file è a 175 righe, sotto il limite

**Scartati come rumore, e perché**

- *Il salvataggio riuscito non ha un segnale proprio.* È il pattern dei dieci campi corti uscito dalla revisione della Story 1.2: i pulsanti spariscono quando il payload rivalidato riporta il valore nuovo. Non è un difetto nuovo di questa story.
- *Uscire dalla scheda senza confermare perde la scelta.* È D21 applicata, decisa e confermata il 3 agosto: il selettore si conferma come i campi corti.
- *Le `<option>` mostrano i valori grezzi del database.* Scelta esplicita di Task 1, con il motivo scritto: le cinque parole del vincolo sono già le parole dell'interfaccia.
- *L'ordine delle cinque opzioni suggerisce un avanzamento.* È l'ordine del vincolo `check` ed è lo stesso di `design-system.md` §2. Un ordine ci vuole, e quello alfabetico sarebbe altrettanto arbitrario.
- *Il messaggio invita a riprovare anche sul `23514`.* Scelta esplicita di Task 2: quel ramo scatterebbe solo se `CLIENT_STATUSES` si allontanasse dal vincolo, e lì il messaggio generico è la risposta giusta.
- *Task 7 è `[x]` con dodici caselle vuote.* È la convenzione uscita dalla revisione della Story 1.1 e seguita dalla 1.2: il task porta la spunta, le voci che richiedono una sessione restano vuote finché non le percorre Luca. La story è a `review`, non a `done`.
- *La pillola tolta dalla scheda porta via l'unico riscontro col valore salvato.* Scelta esplicita di Task 3, confermata: due rappresentazioni dello stesso valore a dieci pixel di distanza sono una di troppo.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story.** La colonna `status` esiste, ha il default `potenziale` e il vincolo `check` con i cinque valori dal primo giorno.

| Pezzo | Dove | Stato |
|---|---|---|
| Colonna `status` con default e vincolo `check` | `supabase/migrations/0002_clients.sql:10` | applicata |
| Policy `clients_owner_all`, valida anche in scrittura | `supabase/migrations/0007_rls.sql:17` | attiva |
| Trigger `clients_set_updated_at` | `supabase/migrations/0006_triggers.sql` | attivo |
| `StatusPill` con `.pill` e `.pill__dot` | `src/components/status-pill.tsx`, `globals.css:272-302` | **da completare, non da rifare** |
| `ClientFieldForm`, un componente per tutti i campi | `src/app/(app)/clienti/[id]/client-field-form.tsx` | **da estendere con un `kind`** |
| `useEditableField`, la macchina del campo che salva | `src/lib/use-editable-field.ts` | **da riusare; una sola riga di tipi ammessa** |
| `openSession`, `UUID`, il trattamento degli errori | `src/app/(app)/clienti/actions.ts:257-288` | **esistono: riusarli** |
| Scheda cliente con `COLUMNS` che già seleziona `status` | `src/app/(app)/clienti/[id]/page.tsx:12` | da estendere in un punto solo |
| Elenco che rende già la pillola | `src/app/(app)/clienti/page.tsx:80-82` | **non si tocca** |
| Tipi generati dallo schema | `src/lib/database.types.ts` | pronti, **non si modificano a mano** |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/client-status.ts` — i cinque valori e il loro controllo, puro

**Modificati**
- `src/lib/client-fields.ts` — solo `STATUS_FIELD` e l'unione `EditableField`. `CLIENT_FIELDS` non cambia di un elemento.
- `src/app/(app)/clienti/actions.ts` — si aggiunge `updateClientStatus`. **Da preservare intatto:** `createClientRecord`, `updateClientField`, `renameClient`, `openSession`, `findExistingName`, la costante `UUID` e tutti i loro commenti. Sono passati da due revisioni.
- `src/app/(app)/clienti/[id]/client-field-form.tsx` — un `kind` in più, un ramo in più in `run`, un ramo in più nella resa.
- `src/lib/use-editable-field.ts` — **solo** `HTMLSelectElement` dentro `Control`.
- `src/app/(app)/clienti/[id]/page.tsx` — dentro `ClientIdentity`, la pillola diventa il selettore. Nient'altro.
- `src/components/status-pill.tsx` — mappa esaustiva e resa secondo `design-system.md` §2.
- `src/app/(app)/clienti/[id]/loading.tsx` — lo scheletro della pillola diventa quello di un campo.
- `src/app/globals.css` — `.select`, `.field--status`, e i tre modificatori della pillola riscritti.

**Riusati senza modifiche, e da non riscrivere**
`src/lib/types.ts`, `src/lib/validate-client-name.ts`, `src/components/save-indicator.tsx`, `src/components/error-state.tsx`, `src/lib/format-date.ts`.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/page.tsx`, `src/app/(app)/clienti/nuovo/*`, `src/app/(app)/clienti/loading.tsx`.

### La decisione di questa story: il selettore si conferma

Il campo lungo si salva da solo, il campo corto si conferma (D21). Un `select` non è né l'uno né l'altro alla lettera, quindi la regola va applicata al suo motivo: la conferma esiste perché un campo a metà digitazione non è una decisione, e serve un gesto che dica "adesso sì".

Il selettore **si conferma**, come i campi corti, per tre motivi che tengono insieme:

1. **Coerenza dentro la stessa card.** Nella scheda ci sono già dieci campi che si confermano e due che si salvano da soli, e la differenza è leggibile perché segue una regola. Un terzo comportamento — salva al cambio, senza pulsanti — la renderebbe illeggibile.
2. **Un salvataggio silenzioso è indistinguibile da un salvataggio mancato** (D21). Se il selettore salvasse al cambio, dovrebbe dire quando ha salvato, cioè portarsi dietro l'indicatore: molto più macchina per un valore che si sceglie una volta ogni tanto.
3. **Non serve la protezione che il salvataggio automatico dà.** Quella regola esiste perché il lavoro scritto non si perda; qui non c'è lavoro scritto da perdere, c'è una scelta fra cinque valori che si rifà in due secondi.

Conseguenza pratica: `autosave` resta falso, `SaveIndicator` non compare, e la conferma del salvataggio è la sparizione dei pulsanti — esattamente come per `Settore` o `Città`.

### Perimetro: cosa NON entra in questa story

- **Lo stato non si cambia dall'elenco.** Una modifica in linea nella tabella è un'altra schermata e un altro giro di stati; l'elenco resta di sola lettura. Non è nemmeno chiesto da nessuna AC.
- **Nessun filtro per stato**: è la **Story 1.7**, che porta ricerca e filtri insieme.
- **I tag non si toccano**: **Story 1.4**. La colonna `tags` nell'elenco resta com'è.
- **Le persone non esistono ancora**: **Story 1.5**.
- **L'ordinamento resta su `clients.updated_at`**: l'ultima attività vera è la **Story 1.6**.
- **Nessuna storia degli stati, nessuna data di passaggio, nessun registro dei cambiamenti.** Lo schema non ha una tabella per questo e non la si aggiunge: la colonna si sovrascrive, come tutto il resto dell'anagrafica (D15).
- **Nessuna conferma prima di cambiare stato.** È reversibile e non distrugge niente: una conferma per un'azione reversibile è rumore (`kb-0.md` §6).
- **Nessun test automatico**: il comando che li esegue arriva con la **Story 1.6**. Qui l'obbligo è che `client-status.ts` resti puro ed esportato.
- **Niente `metadata` sulle rotte, niente ritocchi a `.btn`, niente cambi all'alone del focus, niente navigazione di riga nell'elenco**: sono le voci di `deferred-work.md` e restano dove sono.

### La trappola di sicurezza di questa story

`status` è una delle quattro colonne che `isClientFieldKey` esiste per rifiutare (`client-fields.ts:47-55`). Questa story apre una via di scrittura verso quella colonna, e la deve aprire **stretta**:

1. **`status` non entra in `CLIENT_FIELDS`.** Se ci entrasse, `updateClientField` accetterebbe qualunque stringa arrivi dal browser e la scriverebbe: il vincolo `check` la rifiuterebbe, sì, ma il messaggio arriverebbe da Postgres e la difesa starebbe nel posto sbagliato.
2. **`isClientStatus` sul server, prima di costruire qualsiasi cosa.** Un valore fuori dai cinque non è un caso da gestire con garbo: è una richiesta che non doveva esistere, perché il `select` che la genera ha esattamente cinque opzioni. Si rifiuta.
3. **Un campo per chiamata**, mai il `formData` riversato in un oggetto passato a `.update()`.

La policy resta l'ultima difesa e impedisce di scrivere sulle righe di un altro proprietario, ma **non** impedisce di scrivere la colonna sbagliata sulla propria riga. Il client non è attendibile (`kb-0.md` §3).

### Tipi: `any` è vietato

`tsconfig.json` ha `strict` e `noUncheckedIndexedAccess`.

```ts
import { CLIENT_STATUSES, isClientStatus, type ClientStatus } from '@/lib/client-status'

const MODIFIER: Record<ClientStatus, string> = { /* tutte e cinque le chiavi */ }
```

- `CLIENT_STATUSES` va dichiarato `as const`, altrimenti `ClientStatus` diventa `string` e sia il controllo sia la mappa smettono di controllare proprio la cosa per cui esistono.
- `Record<ClientStatus, string>` invece di `Record<string, string>`: è la differenza fra una mappa che il compilatore verifica e una che accetta qualunque buco.
- La proprietà di `StatusPill` resta `string`, perché `ClientRow['status']` è `string` nei tipi generati. Il restringimento avviene dentro il componente con `isClientStatus`, non cambiando i tipi generati a mano.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `status` aggiunto a `CLIENT_FIELDS` | Scrittura libera sulla colonna dello stato, difesa spostata dentro Postgres | Azione separata con `isClientStatus` |
| `Record<string, string>` per i modificatori | Uno stato senza modificatore non lo segnala nessuno | `Record<ClientStatus, string>` |
| `ClientRow['status']` trattato come union | I tipi generati dicono `string`: il codice non compila o si modifica a mano un file generato | Restringere con `isClientStatus` |
| Un secondo componente per il selettore | Due campi quasi uguali da tenere allineati a mano | Un `kind` in più dentro `ClientFieldForm` |
| `SaveIndicator` sotto il selettore | Racconta un salvataggio automatico che non c'è | Nessun indicatore sui campi che si confermano |
| `revalidatePath` solo sulla scheda | L'elenco mostra la pillola vecchia e l'ordine vecchio | Rivalidare anche `/clienti` |
| `redirect()` nell'azione | Porta via quello che è scritto negli altri campi | Nessun redirect, come nelle altre azioni della scheda |
| `updated_at` scritto a mano | Due posti da tenere allineati | Lo fa il trigger |
| Pillola e selettore vicini nella stessa scheda | Due rappresentazioni dello stesso valore, e la prima che diverge sembra un guasto | Nella scheda solo il selettore |
| `appearance: none` sul `select` | Serve una freccia disegnata, cioè un esadecimale fuori da `globals.css`, e si perde il controllo nativo su tablet | Freccia nativa, `.input` per il resto |
| Stato usato per abilitare o disabilitare qualcosa | Viola AC2, NFR8 e D14 in un colpo solo | Nessun `if` sullo stato in nessun punto dell'interfaccia |
| Valore normalizzato prima di `isClientStatus` | Nasconde una richiesta malformata invece di rifiutarla | Confronto esatto sui cinque valori |
| `details` dell'errore Supabase nei log | Contiene valori della riga, cioè dati del cliente | Solo `code` e `message` (NFR15) |

### Contratto visivo

- **Il colore dello stato sta nel punto, non nel fondo** (`design-system.md` §2). I cinque stati sono descrittivi e non gerarchici: il colore non deve suggerire che uno sia più avanti di un altro, ed è precisamente quello che AC1 chiede.
- Il testo dello stato c'è sempre accanto al punto: il colore non è mai l'unico portatore di significato (UX-DR2, `design-system.md` §8).
- Verde, ambra e rosso significano esiti. `attivo` usa `--ok` come punto perché lo prescrive §2, ed è l'unico verde ammesso qui; non se ne aggiungono altri.
- Il colore di sezione `--sec-clienti` compare come punto di `valutato` perché §2 lo prescrive per quello stato, e nient'altro nel contenuto di questa schermata diventa blu (UX-DR2).
- Il selettore è un campo come gli altri: etichetta vera sopra, `.input` per fondo, bordo, raggio e altezza minima 44px, `Salva` primario e `Annulla` secondario che compaiono solo quando è cambiato (UX-DR10, UX-DR14).
- Voce: italiano, frase minuscola, voce attiva. L'etichetta è `Stato`, non `Stato del cliente` né `Fase`: nell'elenco la colonna si chiama già `Stato` (UX-DR13).
- Errori che dicono cosa fare, mai cosa è successo nello stack (NFR16). Il dettaglio resta nei log, e nei log non finiscono mai dati di clienti (NFR15).
- Nessun esadecimale fuori da `globals.css` (UX-DR16).

**Una discordanza già presente, che questa story non corregge:** `.input:focus` usa `--sec-prequalifica` (`globals.css:375`), mentre UX-DR14 chiede l'alone nella tinta della sezione corrente. Vale anche per il selettore nuovo. Correggerla tocca ogni campo del progetto: resta alla **Story 5.2** per decisione del 2 agosto 2026 (`deferred-work.md`).

### Test

Non esiste ancora un comando che esegua i test: introdurlo è la **Story 1.6**. Qui l'unico obbligo è che `client-status.ts` non importi né React né Supabase e che esporti tutto quello che 1.6 vorrà provare — `isClientStatus` in particolare, che è un controllo di permesso sui valori scrivibili, cioè esattamente la logica che `kb-0.md` §7 chiede di mettere sotto test.

La verifica di questa story è la prova a mano di Task 7. Il codice si considera non funzionante finché non lo si è visto funzionare.

### Project Structure Notes

```
src/lib/
├── client-fields.ts       + STATUS_FIELD, EditableField allargato
├── client-status.ts       NUOVO — i cinque valori e il loro controllo, puro
└── use-editable-field.ts  + HTMLSelectElement nel tipo Control (solo tipi)

src/components/
└── status-pill.tsx        mappa esaustiva, colore nel punto

src/app/(app)/clienti/
├── page.tsx               elenco (invariato)
├── actions.ts             + updateClientStatus
└── [id]/
    ├── page.tsx           la pillola diventa il selettore, nient'altro
    ├── loading.tsx        scheletro del selettore al posto di quello della pillola
    └── client-field-form.tsx  + kind 'status'
```

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Nomi in inglese nel codice, in italiano nell'interfaccia.

Nessuna dipendenza nuova. In particolare nessuna libreria di selettori: quello che serve è un `<select>` nativo, che su tablet si comporta meglio di qualunque sostituto (NFR4).

### Piattaforma in uso, verificata

Da `package.json` alla data di creazione della story: Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`. Nessuna di queste va aggiornata in questa story.

Conseguenze che contano qui:
- `useActionState` viene da **`react`**, non `useFormState` da `react-dom`, che è il nome vecchio. In questo progetto però il campo non passa da `useActionState` affatto: chiama l'azione a mano dentro `startTransition`, ed è una decisione presa in revisione il 3 agosto 2026 (`use-editable-field.ts:35-49`). Non tornare indietro.
- Le Server Action stanno in un file con `'use server'` in testa e vengono chiamate dal browser: quello che arriva dal `FormData` non è attendibile, mai.
- `revalidatePath` è l'unico modo con cui una scrittura si riflette sulle due schermate.

### Intelligence dai commit

Da `8972826` e `66f096c` (Story 1.2, chiusura e revisione), le abitudini che questa story eredita:

- **Il campo che si salva è uscito da `useActionState`** e vive in `use-editable-field.ts`, con `catch` che trasforma un rifiuto della promessa nello stato `failed` invece di far saltare il confine d'errore. Quel file è appena stato riscritto per correggere quattro difetti gravi: si riusa, non si rimette in discussione.
- **Un solo percorso di scrittura**: il `FormData` lo costruisce `run`, sempre, chiunque tiri la corda. Il ramo nuovo di questa story entra lì dentro, non accanto.
- I commenti spiegano il *perché* e citano il documento che lo giustifica; non ripetono quello che il codice già dice.
- Nei log vanno `code` e `message`, mai `details`.
- Le azioni della scheda non reindirizzano mai, nemmeno a sessione finita: un messaggio che dice cosa fare, e basta.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

Le due voci rimandate dalla revisione della Story 1.2 riguardano il salvataggio automatico dei campi lunghi. **Nessuna delle due tocca questa story**, che non aggiunge campi con salvataggio automatico: restano dove sono, in `deferred-work.md`.

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.3: Cambiare lo stato del cliente]
- FR3 e stati descrittivi: [Source: docs/prd-v1.md#3. Entità e campi]
- Vincolo `check`, default, policy e trigger: [Source: docs/database.md#3. Tabelle], [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Stati del cliente, pillola, colore che non è mai l'unico portatore di significato: [Source: docs/design-system.md#2. Colore], [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#8. Accessibilità]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica], [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Decisioni: **D14** (nessuno stato blocca nessuna azione), **D21** (quando un campo si salva da solo e quando si conferma), D13 e D15 (l'anagrafica si sovrascrive), D20 (RLS variante A) — [Source: docs/00-contesto-e-decisioni.md]
- Story precedente, pattern del campo modificabile e correzioni della revisione: [Source: docs/bmad/implementazione/1-2-vedere-e-modificare-la-scheda-del-cliente.md]
- Voci rimandate ancora aperte: [Source: docs/bmad/implementazione/deferred-work.md]

## Dev Agent Record

### Agent Model Used

claude-opus-5

### Debug Log References

**Che la mappa della pillola sia davvero esaustiva è stato provato, non dedotto.** Tolta la chiave
`chiuso` da `MODIFIER` in `status-pill.tsx`: `tsc` risponde `Property 'chiuso' is missing in type
'{ potenziale: string; valutato: string; attivo: string; perso: string; }' but required in type
'Record<"potenziale" | "valutato" | "attivo" | "chiuso" | "perso", string>'`. Ripristinata. Con
`Record<string, string>`, com'era prima, quella prova non avrebbe prodotto nessun errore.

**Le funzioni pure provate fuori dal repository.** `client-status.ts` e `client-fields.ts`
compilati in una cartella usa e getta e chiamati da uno script Node: `isClientStatus` su diciotto
casi (i cinque validi, `'Attivo'`, `'ATTIVO'`, `'  attivo'`, `'attivo '`, `''`, `'bozza'`, `null`,
`undefined`, un numero, un oggetto, un array, un array con dentro il valore giusto, un
`new String('attivo')`), tutti e diciotto con l'esito atteso. `isClientFieldKey('status')` risponde
falso, come `'name'` e `'owner_id'`: la trappola di sicurezza della Story 1.2 regge intatta e
`CLIENT_FIELDS` ha ancora dieci campi.

**Il valore del vincolo confrontato sul file, non a memoria.**
`check (status in ('potenziale','valutato','attivo','chiuso','perso'))` in `0002_clients.sql:11`,
`CLIENT_STATUSES` negli stessi cinque termini e nello stesso ordine.

### Completion Notes List

**Implementato (Task 1-6)**

- `src/lib/client-status.ts`: i cinque valori `as const`, il tipo derivato, `isClientStatus`. Puro,
  senza React e senza Supabase, come `client-fields.ts`. Nessuna mappa di etichette: i valori del
  database sono già le parole dell'interfaccia.
- `STATUS_FIELD` in `client-fields.ts`, accanto a `NAME_FIELD` e **fuori** da `CLIENT_FIELDS`:
  `isClientFieldKey('status')` continua a rispondere falso.
- `updateClientStatus` in `clienti/actions.ts`, il file condiviso. Riusa `openSession`, la costante
  `UUID` e lo stesso trattamento degli errori delle altre azioni; `maybeSingle()`, nei log nessun
  dato della riga, `revalidatePath` sulla scheda e sull'elenco, `updated_at` lasciato al trigger,
  nessun redirect, **nessuna condizione sullo stato di partenza**.
- `ClientFieldForm` esteso con il `kind: 'status'`: un ramo in `run` e uno nella resa, nessun
  secondo componente. Il file resta a 175 righe, sotto il limite delle 200.
- `use-editable-field.ts`: `HTMLSelectElement` dentro `Control`. Una riga, e di soli tipi.
- Nella scheda la pillola lascia il posto al selettore, con l'import di `StatusPill` tolto da
  `page.tsx`. Il componente resta vivo: lo usa l'elenco.
- `StatusPill` con mappa `Record<ClientStatus, string>` e il colore spostato dal fondo al punto,
  come prescrive `design-system.md` §2 per i cinque stati del cliente.
- `.select`, `.field--status` e i tre modificatori della pillola in `globals.css`. Nessun
  esadecimale fuori da quel file, verificato con `grep` su tutto `src`.
- Scheletro della scheda: al posto della pillola, la forma di un campo alto 44px.

**Tre scelte diverse da come le prescriveva il file di story, con il motivo**

1. **`.field--status` si applica dal componente, non dalla pagina.** La story diceva solo di
   aggiungere la classe; metterla accanto a `field--wide` dentro `ClientFieldForm` tiene la
   decisione dove sta già quella gemella, e la pagina continua a non sapere niente di larghezze.
2. **`.select` dichiara anche `padding-right: 12px`.** `.input` ne dichiara 16 su entrambi i lati,
   e con la freccia nativa il testo delle cinque parole finiva troppo vicino al bordo.
3. **Aggiornato il commento in testa a `client-field-form.tsx`**, da "undici volte" a "dodici":
   era una misura scritta nel commento e adesso è falsa. Non è una modifica al codice.

**Verificato il 3 agosto 2026, dopo la revisione.** Le quindici prove con una sessione aperta sono
state percorse da Luca sull'anteprima del branch `story-1-3-cambiare-stato`, sul codice uscito
dalla revisione: tutte passate. Comprese le tre che la revisione ha aggiunto — il `padding-right`
del selettore, i 44px del `<select>` nativo su iPad, e i cinque punti della pillola col colore
spostato. Il `done` di questa story poggia su una verifica fatta.

**Restano invariati:** nessuna migrazione, nessuna dipendenza nuova, nessun `any`, `createClientRecord`,
`updateClientField`, `renameClient`, `openSession` e `findExistingName` intatti, la macchina di
`use-editable-field.ts` intatta salvo la riga dei tipi, l'elenco clienti non toccato, `.btn` a 40px
e l'alone del focus lasciati dove stanno.

### File List

**Nuovi**

- `src/lib/client-status.ts`

**Modificati**

- `src/lib/client-fields.ts`
- `src/lib/use-editable-field.ts`
- `src/components/status-pill.tsx`
- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/client-field-form.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`
- `src/app/globals.css`
- `docs/bmad/implementazione/sprint-status.yaml`

## Change Log

| Data | Cosa |
|---|---|
| 3 agosto 2026 | Story creata sulle tre AC di `epics.md`. Decisa la forma del selettore: si conferma come i campi corti (D21), niente indicatore di salvataggio. Deciso che nella scheda la pillola lascia il posto al selettore e resta l'elemento di lettura dell'elenco, dove passa a colorare il punto invece del fondo (`design-system.md` §2). |
| 3 agosto 2026 | Le tre decisioni confermate da Luca. |
| 3 agosto 2026 | Task 1-6 implementati: fonte unica dei cinque stati, azione separata `updateClientStatus`, selettore come quarto `kind` del campo modificabile, pillola completata ai cinque stati con mappa esaustiva. Tre scelte diverse dal file di story, con il motivo scritto. |
| 3 agosto 2026 | Task 7 diviso come nelle due story precedenti: sei voci verificate dall'agente, dodici da percorrere con una sessione aperta e lasciate vuote. |
| 3 agosto 2026 | Revisione del codice su tre livelli. Una decisione presa (la nota in `design-system.md` §5), cinque correzioni applicate, cinque voci rimandate, sette rilievi scartati. Task 7 cresce di tre prove: il padding del selettore, i 44px su iPad, i cinque punti a confronto. Story a `in-progress`: le quindici voci con sessione aperta restano da percorrere. |
| 3 agosto 2026 | Le quindici prove percorse sull'anteprima del branch, sul codice uscito dalla revisione. Tutte passate, comprese le tre nuove. Task 7 chiuso, story a `done`, e la voce rimandata sui 44px del selettore nativo esce da `deferred-work.md` perché era una prova, non una correzione. Restano quattro voci rimandate. |
