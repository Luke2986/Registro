---
baseline_commit: b3693f584a6c2f8f0690ff890e8f3f679ed28aae
---

# Story 1.2: Vedere e modificare la scheda del cliente

Status: done

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 2 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want aprire la scheda di un cliente e correggere i suoi dati dove sono, senza passare da un modulo separato,
so that quando scopro qualcosa a metà di una call lo scrivo subito.

## Acceptance Criteria

**AC1 — la scheda mostra tutto, con i suoi quattro stati**
**Given** un cliente esistente
**When** apro la sua scheda
**Then** vedo il nome a `--t-display`, e sotto settore, sito web, città, provincia, indirizzo, canale di arrivo, fatturato, dipendenti, obiettivi di business e note
**And** la schermata ha i suoi quattro stati: pieno, vuoto, in caricamento con scheletri della forma reale, in errore con l'azione di riprova (NFR9, UX-DR11)

**AC2 — modifica in linea che si conferma**
**Given** la scheda aperta
**When** modifico un campo e confermo
**Then** il valore viene salvato e `updated_at` si aggiorna da solo tramite il trigger già esistente
**And** un valore cancellato torna vuoto, non diventa zero né stringa vuota mostrata come dato

**AC3 — dipendenti negativo rifiutato con parole nostre**
**Given** il campo dipendenti
**When** scrivo un numero negativo
**Then** il salvataggio viene rifiutato dal vincolo già presente sulla tabella e l'errore dice cosa fare, non cosa è successo nello stack (NFR16)

**AC4 — note sempre in vista**
**Given** le note libere
**When** le compilo
**Then** restano sempre visibili nella scheda, senza doverle aprire (FR26)

Le due che seguono non stanno in `epics.md`: sono decisioni di Luca del 2 agosto 2026, prese alla consegna di questa story. `epics.md` continua a riportare le quattro di sopra, ed è questo file a fare fede per l'implementazione.

**AC5 — il nome si corregge (deciso il 2 agosto 2026)**
**Given** un cliente col nome scritto male
**When** correggo il nome dalla sua scheda e confermo
**Then** il nuovo nome vale ovunque, elenco compreso
**And** un nome vuoto o di soli spazi viene rifiutato sul server, con lo stesso messaggio e lo stesso limite di caratteri della creazione (NFR10)
**And** se il nome nuovo appartiene già a un altro cliente compare l'avviso non bloccante, e il secondo Salva rinomina lo stesso (D14)

**AC6 — i campi lunghi si salvano da soli (deciso il 2 agosto 2026)**
**Given** obiettivi di business o note
**When** smetto di digitare per tre secondi, oppure esco dal campo
**Then** il contenuto viene salvato senza che io faccia niente, e il campo dice quando ha salvato (`AGENTS.md`, `kb-0.md` §6)
**And** il salvataggio a mano resta disponibile e salva subito
**And** se il salvataggio fallisce il testo resta nel campo e l'indicatore lo dice, con l'azione di riprova accanto (NFR1)

## Tasks / Subtasks

- [x] **Task 1 — Fonte unica dei campi del cliente** (AC: 1, 2, 3)
  - [x] Creare `src/lib/client-fields.ts`: funzioni e dati puri, nessun import di React né di Supabase, tutto esportato perché la Story 1.6 possa metterci un test sopra senza riscrivere niente.
  - [x] Esportare `CLIENT_FIELDS` come `const ... as const`: un elemento per campo modificabile, nell'ordine in cui compare nella scheda, con `key` (nome della colonna), `label` (etichetta italiana già usata oggi) e `kind` (`'short' | 'long' | 'integer'`).

    | key | label | kind |
    |---|---|---|
    | `sector` | Settore | short |
    | `website` | Sito web | short |
    | `city` | Città | short |
    | `province` | Provincia | short |
    | `address` | Indirizzo | short |
    | `source_channel` | Come è arrivato | short |
    | `revenue` | Fatturato | short |
    | `employees` | Dipendenti | integer |
    | `business_goals` | Obiettivi | long |
    | `notes` | Note | long |

  - [x] Esportare i tipi derivati: `type ClientFieldKey = (typeof CLIENT_FIELDS)[number]['key']` e `type ClientField = (typeof CLIENT_FIELDS)[number]`. Da qui in poi **nessun elenco di campi si riscrive a mano da nessuna parte**: è il debito che la revisione della Story 1.1 ha rimandato qui (`deferred-work.md`, seconda voce).
  - [x] **`name` non entra in `CLIENT_FIELDS`, e non è una dimenticanza.** Ha una validazione sua che esiste già (`validateClientName`: limite di 200 caratteri, caratteri invisibili tolti, avviso di doppione). Se entrasse nell'elenco passerebbe da `normalizeTextValue` e quelle tre regole sparirebbero senza che nessun compilatore se ne accorga. La rinomina è Task 3.
  - [x] Esportare `isClientFieldKey(value: unknown): value is ClientFieldKey`: serve al server per rifiutare una chiave che non è nell'elenco. Senza questo controllo l'azione diventa una scrittura arbitraria su qualsiasi colonna, `owner_id`, `status` e `name` compresi.
  - [x] Esportare `normalizeTextValue(raw: unknown): string | null`: `trim()`, e stringa vuota → `null`. Mai `''` nel database: AC2 chiede che un valore cancellato torni vuoto, e `''` è un dato che si mostra come dato.
  - [x] Esportare `parseEmployees(raw: unknown): { ok: true; value: number | null } | { ok: false; message: string }`. Regole, in quest'ordine:
    1. non stringa → trattala come vuota;
    2. `trim()` vuoto → `{ ok: true, value: null }`, cioè il campo si può svuotare;
    3. non corrisponde a `/^-?\d+$/` → `{ ok: false, message: 'Scrivi il numero di dipendenti in cifre, senza altri caratteri.' }`;
    4. negativo → `{ ok: false, message: 'Il numero di dipendenti non può essere negativo. Lascia il campo vuoto se non lo sai.' }`;
    5. sopra `2147483647` → `{ ok: false, message: 'Il numero è troppo grande.' }` — è il massimo di un `integer` di Postgres, e senza questo controllo l'errore arriva dal database in inglese;
    6. altrimenti `{ ok: true, value: Number(trimmed) }`.
  - [x] Nessuna libreria di validazione: sono trenta righe, quindi si fanno trenta righe (`kb-0.md` §2).

- [x] **Task 2 — Server Action di aggiornamento** (AC: 2, 3)
  - [x] Aggiungere `updateClientField` in `src/app/(app)/clienti/actions.ts`, **il file che esiste già**. Non creare un file di azioni per story: la Story 1.1 lo ha creato apposta condiviso, e 1.3 e 1.4 aggiungeranno le loro lì.
  - [x] Firma per `useActionState`: `(previous: UpdateClientFieldState, formData: FormData) => Promise<UpdateClientFieldState>`, con

    ```ts
    export type UpdateClientFieldState = {
      error?: string
      /** Il valore com'è adesso nel database, reso stringa. Sincronizza il campo dopo il salvataggio. */
      saved?: string
    }
    ```

  - [x] Sequenza obbligata, la stessa di `createClientRecord` per le prime due voci:
    1. `const supabase = await createClient()`;
    2. `getUser()`, con la distinzione già scritta in `actions.ts:38`: `authError` con `status` assente o ≥ 500 non vuol dire "sei fuori", vuol dire "riprova" — e mandare a `/accedi` porterebbe via quello che l'utente ha appena scritto;
    3. leggere `client_id` e `field` dal `formData`; se `client_id` non è un uuid o `isClientFieldKey(field)` è falso → ritornare un errore generico e **scrivere nei log solo la chiave rifiutata, mai il valore**;
    4. costruire la modifica: `employees` passa da `parseEmployees` (se `ok` è falso si ritorna il suo `message`), tutti gli altri da `normalizeTextValue`;
    5. `update` sulla riga, chiedendo indietro la conferma;
    6. `revalidatePath(\`/clienti/${clientId}\`)` **e** `revalidatePath('/clienti')` — la seconda perché la modifica sposta `updated_at`, che è l'ordinamento dell'elenco;
    7. ritornare `{ saved }`.
  - [x] **Nessun `redirect()` in questa azione.** La modifica in linea non porta da nessuna parte: si resta sulla scheda. È l'unica azione del progetto che non finisce con un redirect, ed è giusto così.
  - [x] **Mai scrivere `updated_at`.** Ci pensa il trigger `clients_set_updated_at` (`0006_triggers.sql:15`), che è `before update`. Scriverlo a mano vorrebbe dire tenere due posti allineati a mano e AC2 chiede esplicitamente il trigger.
  - [x] **Mai costruire la modifica riversando il `formData`.** Un solo campo per chiamata, la chiave passata dal controllo di Task 1. La forma corretta, senza `as`:

    ```ts
    type ClientPatch = Partial<Pick<ClientRow, ClientFieldKey>>
    const patch: ClientPatch = {}
    if (field === 'employees') patch.employees = parsed.value
    else patch[field] = normalizeTextValue(formData.get('value'))
    ```

    `employees` va isolato perché è l'unico non testuale: separandolo, il resto della union ha tutto lo stesso tipo `string | null` e l'assegnazione con chiave variabile compila senza forzature.
  - [x] L'update chiede indietro la riga per distinguere "salvato" da "nessuna riga toccata":

    ```ts
    const { data, error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', clientId)
      .select('id')
      .maybeSingle()
    ```

    `maybeSingle` e non `single`: con la sicurezza a livello di riga attiva, la scheda di un altro proprietario e una scheda cancellata arrivano identiche, cioè zero righe, e con `single` diventerebbero un errore invece di un messaggio comprensibile.
  - [x] `data` nullo senza errore → `{ error: 'Questa scheda non è più disponibile. Torna all\'elenco.' }`.
  - [x] `error` → `console.error` con **solo** `code` e `message`; mai `details`, che conterrebbe il valore rifiutato, cioè un dato del cliente (`kb-0.md` §3, NFR15). All'utente va `'Il campo non è stato salvato. Riprova fra un momento.'`
  - [x] **Eccezione, ed è AC3:** se `error.code` è `23514` il vincolo `employees >= 0` ha rifiutato la scrittura. È la difesa ultima e non dovrebbe mai scattare, perché Task 1 rifiuta prima; se scatta, il messaggio resta quello nostro sui dipendenti, mai il testo di Postgres.
  - [x] Non aggiungere `.eq('owner_id', user.id)`: la riga la filtra la policy `clients_owner_all` (`0007_rls.sql:17`). Un filtro a mano è ridondante e fa credere che sia lui a proteggere (D20, `database.md` §6 variante A).

- [x] **Task 3 — Rinomina del cliente** (AC: 5)
  - [x] Aggiungere `renameClient` in `src/app/(app)/clienti/actions.ts`. **Azione separata da `updateClientField`, non un undicesimo campo.** Il nome ha tre regole che gli altri non hanno: limite di 200 caratteri, caratteri invisibili tolti, avviso di doppione. Farlo passare dall'allow-list vorrebbe dire perderle tutte e tre.
  - [x] Riusare `validateClientName` da `@/lib/validate-client-name`. **Non riscriverla, non copiarne le regole:** è già pura, esportata e passata da una revisione.
  - [x] Riusare `findExistingName` e il giro dell'avviso già scritto in `createClientRecord:49-62`: campo nascosto `duplicate_of`, primo Salva che avvisa, secondo Salva che scrive lo stesso (D14, il software registra e mostra, non vieta).
  - [x] **`findExistingName` va estesa, ed è l'unica modifica a codice già revisionato:** oggi legge `select('name')` e confronterebbe il cliente con se stesso, quindi rinominare `acme` in `Acme` avviserebbe di un doppione che è il cliente stesso. Passa a `select('id, name')` e aggiungi un parametro `exceptId?: string` che salta quella riga. `createClientRecord` la chiama senza il parametro e non cambia comportamento.
  - [x] `revalidatePath` sulla scheda **e** su `/clienti`: il nome è la prima colonna dell'elenco.
  - [x] Stesso trattamento degli errori di `updateClientField`: `code` e `message` nei log, mai `details`; messaggio all'utente che dice cosa fare.
  - [x] **Il nome non si salva da solo.** Ha l'avviso di doppione, che richiede una seconda conferma consapevole: un salvataggio automatico creerebbe il doppione mentre Luca sta ancora scrivendo il nome nuovo.

- [x] **Task 4 — Indicatore di salvataggio riusabile** (AC: 6)
  - [x] Creare `src/components/save-indicator.tsx`: componente di sola presentazione, nessuna chiamata, nessun timer dentro. Chi lo usa gli passa lo stato.
  - [x] **Si costruisce qui una volta sola, con i tre stati esatti di UX-DR8, perché la Story 3.3 lo riuserà ancorato in fondo alla schermata di compilazione.** Costruirne qui una versione provvisoria e una vera dopo è la duplicazione silenziosa che `kb-0.md` §9 chiede di fermare. Cambia dove sta e chi lo pilota, non come è fatto.

    | stato | testo | colore |
    |---|---|---|
    | a riposo | `Salvato alle 14:32` | `--ink-faint` |
    | in corso | `Salvataggio…` | `--ink-muted` |
    | fallito | `Non salvato, riprovo` + pulsante `Riprova` | `--bad` |

  - [x] Prima del primo salvataggio non mostra niente: non c'è un'ora da dire.
  - [x] Monospaziato a `--t-data`, cioè la classe `.data` che esiste già. Nessuna spunta, nessuna animazione, nessun avviso a comparsa (UX-DR8). Il tono è quello di un orologio.
  - [x] Proprietà come union discriminata, mai tre booleani che possono essere veri insieme:

    ```ts
    export type SaveState =
      | { kind: 'idle' }
      | { kind: 'saving' }
      | { kind: 'saved'; at: Date }
      | { kind: 'failed' }
    ```

  - [x] Aggiungere `formatClockTime(date: Date): string` a `src/lib/format-date.ts`, dove sta già `formatLastActivity`: la formattazione delle date vive in un file solo, ed è pura, quindi la Story 1.6 può metterci un test sopra. Forma `14:32`, `it-IT`, ore a due cifre.
  - [x] **Mai calcolare l'ora durante la resa sul server.** L'ora nasce nel browser al momento del salvataggio riuscito, altrimenti server e client rendono due orari diversi e l'idratazione si lamenta.

- [x] **Task 5 — Il campo modificabile** (AC: 2, 3, 4, 5, 6)
  - [x] Creare `src/app/(app)/clienti/[id]/client-field-form.tsx` con `'use client'`: **un solo componente**, usato undici volte con parametri diversi — dieci campi più il nome. Non undici componenti, non un componente per tipo.
  - [x] Proprietà: `clientId: string`, `field: ClientField`, `value: string | null`. Il nome si passa con un descrittore suo, di forma identica, con `kind: 'name'`: il componente sa già distinguere i `kind`, e un secondo componente quasi uguale sarebbe la duplicazione che questa story esiste per togliere.
  - [x] `kind` decide tre cose e nient'altro: che controllo si rende, quale azione si chiama, se il campo si salva da solo.

    | kind | controllo | azione | salvataggio automatico |
    |---|---|---|---|
    | `name` | `input` a `--t-display` | `renameClient` | no |
    | `short` | `input` | `updateClientField` | no |
    | `integer` | `input` `inputMode="numeric"` | `updateClientField` | no |
    | `long` | `textarea` 3 righe | `updateClientField` | **sì** |

  - [x] Ogni campo è un `<form>` a sé, con la sua `useActionState`: un salvataggio che fallisce riguarda un campo solo e non porta via quello che c'è scritto negli altri (`kb-0.md` §6, NFR1). Gli undici form sono fratelli dentro la card, mai annidati: un form dentro un form non è HTML valido.
  - [x] `useActionState` importato da **`react`**, non `useFormState` da `react-dom`: è il nome vecchio (React 19.2).
  - [x] Campo controllato con `useState`, inizializzato da `value ?? ''`. È la stessa scelta di `new-client-form.tsx:20` e per lo stesso motivo: con un form action React ripulisce i campi non controllati a fine invio, e un valore rifiutato sparirebbe insieme all'errore.
  - [x] `<label className="label" htmlFor={...}>` con `id` costruito dalla chiave del campo, per esempio `campo-sector`: undici campi nella stessa pagina, gli identificatori devono essere unici. Etichetta vera, mai un segnaposto al suo posto (UX-DR14).
  - [x] Resa secondo `kind`: `short` e `integer` → `<input className="input">`, `long` → `<textarea className="input input--long">` con `rows={3}`, `name` → `<input className="input input--display">`.
  - [x] **`integer` si rende con `type="text"` e `inputMode="numeric"`, non con `type="number"`.** Con `type="number"` il browser restituisce stringa vuota quando il contenuto non è un numero: quello che l'utente ha battuto sparirebbe prima di arrivare al server, e AC3 chiede un messaggio su quello che ha scritto. `inputMode="numeric"` dà comunque il tastierino sul tablet (NFR4).
  - [x] Campi nascosti `client_id` e `field`, come `new-client-form.tsx:37` fa già con `duplicate_of`. Il server li ricontrolla comunque: quello che arriva dal browser non è attendibile (`kb-0.md` §3).
  - [x] `Salva` e `Annulla` compaiono **solo quando il campo è cambiato**: `const dirty = value !== (props.value ?? '')`. A riposo la scheda si legge, non si compila.
  - [x] `Annulla` riporta il campo al valore della proprietà. È reversibile, quindi nessuna conferma (`kb-0.md` §6).
  - [x] Dopo un salvataggio riuscito, allineare il campo a `state.saved`: il server salva il valore ripulito, e senza questo allineamento uno spazio in coda lascerebbe `Salva` acceso per sempre su un campo già salvato.
  - [x] Errore del campo: `<p className="field__error" role="alert" id={...}>` sotto il campo, legato con `aria-describedby`, più `aria-invalid` sul controllo. Non riusare `.error-box`: è il riquadro di una schermata intera, qui basta una riga.
  - [x] Sui campi `short`, `integer` e `name` la conferma del salvataggio è che i pulsanti spariscono. Nessun indicatore, nessuna spunta: chi ha appena premuto `Salva` non ha bisogno che glielo si dica.

  **Salvataggio automatico, solo sui campi `long` (AC6)**

  - [x] Tre secondi dopo l'ultima digitazione il contenuto si salva da solo. Stesso intervallo che FR19 fissa per la compilazione: lo strumento si comporta allo stesso modo dovunque, e un secondo numero da ricordare non serve a nessuno.
  - [x] **Si salva anche all'uscita dal campo**, se il contenuto è cambiato. Senza questo, chi scrive e clicca via entro tre secondi perde quello che ha scritto — cioè esattamente l'unica promessa non negoziabile del prodotto (NFR1).
  - [x] `Salva` resta e salva subito, annullando il timer in attesa. Il salvataggio a mano è un requisito, non una comodità: AC6 lo chiede.
  - [x] Un solo percorso di scrittura per entrambi i modi: si costruisce il `FormData` e si chiama la stessa azione di `useActionState`. Due percorsi vorrebbero dire due comportamenti da tenere allineati, e il secondo si scopre rotto mesi dopo.
  - [x] Il timer parte da `setTimeout`, quindi non da un gestore di evento: la chiamata all'azione va dentro `startTransition` importato da `react`, altrimenti React avvisa e il `pending` non si comporta.
  - [x] Il timer si azzera a ogni battuta e **si cancella allo smontaggio del componente**: senza la pulizia, un salvataggio parte su un componente che non c'è più.
  - [x] Niente salvataggio automatico se il contenuto non è cambiato, e niente mentre un salvataggio è in corso: in quel caso il timer si riarma.
  - [x] `<SaveIndicator>` sotto il campo, pilotato così: `pending` → `saving`; azione riuscita → `saved` con l'ora presa in quel momento; azione fallita → `failed`, e `Riprova` rilancia la stessa azione col contenuto che è nel campo adesso.
  - [x] **In caso di fallimento il testo resta nel campo, sempre.** Non si svuota, non si ripristina, non si sostituisce con quello del server: è scritto in AC6 ed è la ragione per cui il campo è controllato.

- [x] **Task 6 — Scheda riscritta sulla fonte unica** (AC: 1, 2, 4, 5)
  - [x] Riscrivere `src/app/(app)/clienti/[id]/page.tsx` intorno a `CLIENT_FIELDS`. Resta un Server Component: il controllo dell'uuid, `getUser()`, la query, `notFound()` e lo stato d'errore **restano com'erano**, sono già passati da una revisione.
  - [x] L'identità in cima alla card diventa: una riga con l'etichetta `Nome del cliente` a sinistra e la pillola di stato a destra, e sotto il campo del nome a `--t-display`. La pillola resta in sola lettura, riusando `<StatusPill />`: il selettore dei cinque stati è la Story 1.3.
  - [x] Il campo del nome è un `<ClientFieldForm>` come gli altri, col suo descrittore `kind: 'name'`. L'etichetta è vera e visibile, non un segnaposto dentro un titolo (UX-DR14): il nome resta grande e leggibile come titolo, ma è un campo e lo dichiara.
  - [x] `COLUMNS` resta una stringa letterale, ma il tipo della scheda si deriva:

    ```ts
    type ClientDetail = Pick<ClientRow, 'id' | 'name' | 'status' | ClientFieldKey>
    ```

    Così i tre elenchi diventano due, e il secondo lo controlla il compilatore: se un campo entra in `CLIENT_FIELDS` senza entrare in `COLUMNS`, la riga tornata dalla query non soddisfa più `ClientDetail` e `npm run typecheck` si ferma. È esattamente quello che oggi non succede.
  - [x] La griglia si genera con `CLIENT_FIELDS.map(...)`, un `<ClientFieldForm>` per elemento. Nessun array `fields` scritto a mano nel file.
  - [x] `dl`, `dt` e `dd` **spariscono, e non è un passo indietro**: la revisione della Story 1.1 li aveva introdotti perché un campo vuoto in sola lettura lasciava un'etichetta senza valore associato. Con un controllo di modulo vero il legame lo fa `<label htmlFor>`, che è più forte e non ha bisogno della lista di definizione.
  - [x] I due campi `long` prendono tutta la larghezza: classe `field--wide` sulla loro cella. Le note sono uno dei due, e AC4 chiede che restino visibili senza aprire niente: una `textarea` a tre righe dentro una colonna da 220px non è "visibile", è nascosta di fatto.
  - [x] **Stato vuoto (AC1):** se tutti e dieci i campi sono `null`, sopra la griglia compare una riga in `.meta`: `Di questo cliente sai solo il nome. I campi si compilano quando li scopri.` Nessun pulsante: i campi sono già lì e sono già l'azione, e un pulsante primario in più violerebbe UX-DR10. È la deviazione consapevole da UX-DR11, che chiede "il pulsante che lo crea".
  - [x] Aggiornare `src/app/(app)/clienti/[id]/loading.tsx` alla forma nuova: lo scheletro del nome in cima, poi uno scheletro per elemento di `CLIENT_FIELDS`, con i due `long` a tutta larghezza e più alti. Anche qui l'elenco si deriva, non si conta a mano: oggi il file tiene un array `[1..10]` scritto a mano, ed è lo stesso genere di disallineamento che Task 1 esiste per chiudere. Uno scheletro che non ha la forma del contenuto fa saltare la pagina quando il contenuto arriva, ed è già stato corretto una volta nella revisione della Story 1.1.
  - [x] Se `page.tsx` supera le 200 righe, estrarre la griglia in `client-fields-grid.tsx`: oltre quella soglia un file quasi sempre contiene due cose (`kb-0.md` §2).

- [x] **Task 7 — Le classi che mancano, e solo quelle** (AC: 1, 4, 5, 6)
  - [x] In `src/app/globals.css`, aggiungere: `.input--long` (`min-height` da tre righe, `resize: vertical`, `font-family: inherit`), `.input--display` (la tipografia di `.display-title`: 32/38, peso 600, spaziatura -0.02em), `.field--wide` (`grid-column: 1 / -1`), `.field__actions` (flex, `gap: 8px`), `.field__error` (`--bad`, dimensione di `.meta`, `margin: 0`), `.save-indicator--failed` (`--bad`) e `.save-indicator--saving` (`--ink-muted`); il colore a riposo è `--ink-faint`.
  - [x] `.display-title` resta: la usa `loading.tsx` per lo scheletro e resterà la misura di riferimento. `.input--display` ne riprende la tipografia, non la sostituisce.
  - [x] Prima di aggiungere qualsiasi altra cosa, verificare che non ci sia già: `.card`, `.page-header`, `.page-title`, `.field`, `.label`, `.input`, `.btn`, `.btn--primary`, `.btn--secondary`, `.empty`, `.error-box`, `.warn-box`, `.skeleton`, `.pill`, `.meta`, `.data`, `.display-title`, `.detail-identity`, `.detail-grid`, `.back-link` esistono tutte.
  - [x] `.detail__value` non serve più a niente quando la griglia diventa di campi modificabili: si cancella. Codice morto si cancella, non si commenta (`kb-0.md` §2).
  - [x] Nessun valore esadecimale fuori da questo file, in nessuna circostanza (UX-DR16).

- [ ] **Task 8 — Verifica a mano sul percorso reale** (AC: 1, 2, 3, 4, 5, 6)

  Come nella Story 1.1, le caselle dicono chi ha verificato cosa e restano vuote dove non ha
  verificato nessuno. Il percorso con accesso richiede una sessione che arriva per email: nessun
  agente può percorrerlo. Una casella spuntata per conto di terzi vale meno di una vuota
  (`kb-0.md` §7).

  *Verificabile dall'agente, senza sessione*
  - [x] `npm run typecheck` e `npm run build` puliti.
  - [x] Prova che il tipo della query non sia degradato ad `any`: introdurre di proposito un campo inesistente sulla riga letta, verificare che `tsc` lo rifiuti, poi ripristinare. È il controllo che la Story 1.1 ha dovuto inventarsi, e vale ancora.
  - [x] Prova che la fonte unica tenga: togliere un campo da `COLUMNS` lasciandolo in `CLIENT_FIELDS`, verificare che `typecheck` si fermi, poi ripristinare. Se non si ferma, Task 6 non ha chiuso il debito che doveva chiudere.
  - [x] `parseEmployees` sui casi limite: vuoto, spazi, `0`, `-1`, `1.5`, `1e3`, `2147483647`, `2147483648`, `007`, `abc`, valori non stringa.
  - [x] `normalizeTextValue`: stringa vuota, soli spazi, spazi ai bordi, valori non stringa.
  - [x] `formatClockTime`: mezzanotte, mezzogiorno, `09:05` con lo zero davanti.
  - [x] `findExistingName` con `exceptId`: la riga esclusa non si conta come doppione di se stessa, e `createClientRecord` che la chiama senza parametro si comporta come prima.

  *Da percorrere con una sessione aperta*
  - [ ] Modifico un campo, confermo, ricarico: il valore c'è.
  - [ ] Svuoto un campo compilato e confermo: torna vuoto, non mostra zero né una stringa vuota travestita da dato.
  - [ ] Svuoto `Dipendenti`: torna vuoto. Ci scrivo `0`: resta `0`, che è un dato vero e diverso da "non lo so".
  - [ ] `Dipendenti` a `-3`: rifiutato con il messaggio nostro, e quello che ho scritto resta nel campo.
  - [ ] `Dipendenti` a `tre`: stesso trattamento.
  - [ ] Modifico due campi senza confermare, ne salvo uno: l'altro conserva quello che ho scritto.
  - [ ] Modifico un campo e premo `Annulla`: torna al valore di prima.
  - [ ] Scrivo in un campo e ci lascio uno spazio in coda: dopo il salvataggio i pulsanti spariscono e non restano accesi.
  - [ ] Note e obiettivi: sono visibili senza aprire niente, e ci sta dentro un testo di dieci righe.
  - [ ] Nelle note scrivo e non tocco più niente: dopo tre secondi l'indicatore dice `Salvataggio…` e poi `Salvato alle` con l'ora giusta. Ricarico: il testo c'è.
  - [ ] Nelle note scrivo e clicco subito fuori, prima dei tre secondi: si salva lo stesso.
  - [ ] Nelle note scrivo e premo `Salva`: si salva subito, e tre secondi dopo non parte un secondo salvataggio.
  - [ ] Nelle note scrivo, tolgo la rete, aspetto: l'indicatore dice `Non salvato, riprovo` in rosso, **il testo resta nel campo**, rimetto la rete e `Riprova` lo salva.
  - [ ] Scrivo nelle note e cambio pagina entro tre secondi: quello che ho scritto non si perde.
  - [ ] Correggo il nome e confermo: cambia nella scheda e nell'elenco.
  - [ ] Svuoto il nome e confermo: rifiutato, con lo stesso messaggio della creazione.
  - [ ] Rinomino un cliente col nome di un altro: compare l'avviso, il secondo Salva rinomina lo stesso.
  - [ ] Rinomino un cliente cambiando solo le maiuscole del suo stesso nome: **nessun avviso di doppione**, perché il cliente non è il doppione di se stesso.
  - [ ] Cliente appena creato: compare la riga dello stato vuoto, e sparisce appena compilo il primo campo.
  - [ ] Torno all'elenco: il cliente modificato è in cima, perché `updated_at` si è mosso.
  - [ ] Larghezza 375px: la scheda resta usabile, i campi non escono, i bersagli restano toccabili (NFR4).
  - [ ] Da tastiera: si arriva a ogni campo, il focus si vede, `Salva` e `Annulla` si raggiungono senza mouse.
  - [ ] Un valore lunghissimo senza spazi non fa scorrere la pagina di lato.

### Review Findings

Revisione del 3 agosto 2026, tre livelli in parallelo (adversarial, edge case, aderenza alle AC).
Le severità sono state assegnate qui, non dai revisori, dopo aver riletto il codice attorno a ogni
punto segnalato.

**Le tre decisioni di Luca, prese in revisione il 3 agosto 2026**

1. **L'autosave esce da `useActionState`.** I campi lunghi chiamano l'azione dentro un `try/catch` proprio e gestiscono `pending` ed errore a mano, così un rifiuto della promessa diventa lo stato `failed` che AC6 chiede invece di far saltare l'error boundary. Costa la riscrittura della macchina a stati, che la Story 3.3 eredita già giusta. Diventa una correzione.
2. **La finestra dei tre secondi resta scoperta.** Nessun `beforeunload`, nessuna beacon: la perdita richiede di chiudere la scheda entro tre secondi con il fuoco ancora dentro, e il salvataggio all'uscita dal campo copre già ogni navigazione dentro l'applicazione. Diventa una voce rimandata.
3. **`.display-title` si cancella.** Il presupposto di Task 7 è caduto quando Task 6 ha riscritto lo scheletro: `kb-0.md` §2 vale identico, e la misura resta dichiarata da `.input--display`. Diventa una correzione, e la voce esce da `deferred-work.md`.

**Corrette il 3 agosto 2026**

- [x] [Review][Patch] L'autosave esce da `useActionState`: un rifiuto dell'azione deve diventare lo stato `failed`, non far smontare la scheda dall'error boundary [src/lib/use-editable-field.ts]
- [x] [Review][Patch] Cancellare `.display-title`, ora che nessun file la nomina [src/app/globals.css:195]
- [x] [Review][Patch] Il blur precede il click: `Annulla` salva il testo da scartare, `Salva` scrive due volte [src/lib/use-editable-field.ts:168]
- [x] [Review][Patch] L'autosave riallinea la textarea al valore ripulito mentre si scrive: l'a-capo appena battuto sparisce e il cursore salta in fondo [src/lib/use-editable-field.ts:110]
- [x] [Review][Patch] Un autosave fallito si riarma ogni tre secondi all'infinito, senza contatore né freno [src/lib/use-editable-field.ts:126]
- [x] [Review][Patch] `duplicate_of` sopravvive ad `Annulla`: al tentativo successivo l'avviso di doppione non compare e il primo `Salva` rinomina [src/app/(app)/clienti/[id]/client-field-form.tsx:36]
- [x] [Review][Patch] Un `value` mancante o non stringa svuota la colonna e risponde "salvato" [src/app/(app)/clienti/actions.ts:123]
- [x] [Review][Patch] `saveState` non torna mai a `idle`: dopo `Annulla` l'indicatore dichiara un lavoro non salvato che non esiste, e `Riprova` riscrive il valore ripristinato [src/lib/use-editable-field.ts:143]
- [x] [Review][Patch] L'errore e l'avviso restano a schermo mentre si corregge il campo, `aria-invalid` compreso [src/lib/use-editable-field.ts:155]
- [x] [Review][Patch] Codice morto: il ramo `name` di `submit()`, il ref `duplicateOf` e l'effetto che lo tiene aggiornato non sono raggiungibili [src/app/(app)/clienti/[id]/client-field-form.tsx:40]
- [x] [Review][Patch] `-0` passa il controllo sui negativi e viene scritto come `0` invece di essere rifiutato [src/lib/client-fields.ts:99]
- [x] [Review][Patch] Scheletri fuori forma: i campi corti erano 50px contro i 44px reali [src/app/(app)/clienti/[id]/loading.tsx:28]
- [x] [Review][Patch] La riga dell'indicatore salta di 26px quando un salvataggio fallisce: `min-height` 18px contro i 44px del pulsante `Riprova` [src/app/globals.css:414]
- [x] [Review][Patch] `client-field-form.tsx` è 221 righe, sopra il limite che la story dichiara vincolante: la macchina a stati dell'autosave è la seconda cosa [src/app/(app)/clienti/[id]/client-field-form.tsx:1]

**Com'è stato corretto**

`src/lib/use-editable-field.ts` è nuovo e tiene tutto il campo che si salva: il valore, se è
cambiato, l'esito dell'ultima scrittura, i tre stati dell'indicatore e il timer. È il file che la
Story 3.3 riuserà, e nasce già senza i difetti che questa revisione ha trovato. `client-field-form.tsx`
resta un componente solo per undici campi e torna a 157 righe: disegna, non governa.

Le quattro correzioni che contano, e come stanno in piedi:

- **`useActionState` non c'è più.** L'azione si chiama a mano dentro `startTransition`, con un
  `catch` che trasforma un rifiuto della promessa nello stato `failed`. Il confine d'errore non
  vede più niente, e nessun guasto di rete può portare via la scheda. Cade con esso anche l'invio
  nativo del modulo: il `FormData` lo costruisce sempre `run`, quindi il percorso di scrittura è
  uno solo davvero, non uno solo a parole.
- **Il blur non salva più quando il fuoco resta nel modulo.** Due difese insieme: `onMouseDown`
  che impedisce lo spostamento del fuoco col mouse, e il controllo su `relatedTarget` per la
  tastiera. Serve la coppia perché Safari, cliccando, non dà il fuoco ai pulsanti e
  `relatedTarget` arriverebbe vuoto.
- **Un solo tentativo automatico per testo.** `attempted` ricorda l'ultimo valore mandato e il
  timer non riparte finché quel testo non cambia. Chiude in un colpo il ciclo infinito dopo un
  fallimento e quello, più silenzioso, di un testo che il server ripulisce e che si rimanderebbe
  da sé per sempre. `Riprova` resta il modo di insistere.
- **L'allineamento aspetta.** Il valore ripulito entra nel campo solo quando il campo non ha il
  fuoco; se il salvataggio finisce mentre si scrive, l'allineamento si mette in attesa e si
  applica all'uscita. Nessuna textarea riscritta sotto le dita.

**Non corretto, e va detto:** lo scheletro non può sapere se il cliente è ancora vuoto, quindi la
riga `Di questo cliente sai solo il nome…` continua a comparire dopo il caricamento e a spostare
la griglia in giù, ma solo al primo caricamento di un cliente appena creato. Riservarle lo spazio
sempre vorrebbe dire un buco fisso sopra la griglia di ogni cliente compilato, che è peggio del
salto che eviterebbe. Restano corrette le altezze dei campi, che erano il grosso del disallineamento.

**Verificato:** `npm run typecheck` e `npm run build` puliti, stesse sette rotte. `parseEmployees`
riprovata sui diciotto casi limite più `-0`, che adesso è rifiutato mentre `0` resta un dato vero.
`normalizeTextValue` invariata. `.display-title` non compare più da nessuna parte, `grep` compreso.
**Non verificato:** tutto il percorso con una sessione aperta. Il salvataggio è stato riscritto e
nessuno lo ha ancora visto funzionare.

**Rimandate**

- [x] [Review][Defer] I due campi lunghi che salvano insieme possono far tornare indietro `baseline` e far ripartire un salvataggio già fatto [src/app/(app)/clienti/[id]/client-field-form.tsx:38] — rimandata, dipende dall'ordine di consegna dei payload RSC e non è stata riprodotta
- [x] [Review][Defer] Fra l'ultima battuta e i tre secondi non c'è protezione: chiudere la scheda o ricaricare col fuoco ancora nella textarea perde il testo [src/app/(app)/clienti/[id]/client-field-form.tsx:124] — rimandata per decisione di Luca del 3 agosto 2026: la finestra è di tre secondi e solo col fuoco dentro, e il salvataggio all'uscita dal campo copre già ogni navigazione dentro l'applicazione

**Scartata come rumore:** `.input--long` non dichiara `font-family: inherit` come Task 7 elencava. Nessuna conseguenza: `.input` lo dichiara già ed è sempre applicata insieme.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story: lo schema che serve esiste tutto, `clients` compresa di tutti e dieci i campi.**

| Pezzo | Dove | Stato |
|---|---|---|
| Next.js 16.2 App Router + TypeScript strict | `package.json`, `tsconfig.json` | pronto |
| Tabella `clients` con vincoli e trigger `updated_at` | `supabase/migrations/0002`, `0006` | applicate |
| Policy `clients_owner_all` (lettura e scrittura) | `supabase/migrations/0007_rls.sql:17` | attiva |
| Tipi generati dallo schema | `src/lib/database.types.ts` | pronti, **non si modificano a mano** |
| `ClientRow` | `src/lib/types.ts` | pronto, **da riusare** |
| Helper Supabase server | `src/lib/supabase/server.ts` | pronto |
| Scheda cliente in sola lettura, con uuid, `notFound()`, stato d'errore | `src/app/(app)/clienti/[id]/page.tsx` | **da estendere, non da rifare** |
| Scheletri della scheda | `src/app/(app)/clienti/[id]/loading.tsx` | da aggiornare alla forma nuova |
| Azioni server condivise | `src/app/(app)/clienti/actions.ts` | **esiste: aggiungere lì** |
| Schema del form client con `useActionState` | `src/app/(app)/clienti/nuovo/new-client-form.tsx` | **il modello da seguire** |
| `StatusPill`, `ErrorState` | `src/components/` | pronti, da riusare |
| Token e classi del design system | `src/app/globals.css` | pronti, unico posto con esadecimali |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/client-fields.ts` — la fonte unica dei campi e la loro pulizia
- `src/app/(app)/clienti/[id]/client-field-form.tsx` — il campo modificabile, uno per tutti
- `src/components/save-indicator.tsx` — i tre stati di UX-DR8, costruiti qui e riusati dalla Story 3.3

**Modificati**
- `src/app/(app)/clienti/actions.ts` — si aggiungono `updateClientField` e `renameClient`. **Da preservare intatto:** `createClientRecord`, `CreateClientState`, e di `findExistingName` la logica di confronto e i suoi commenti. La Story 1.1 li ha chiusi dopo una revisione. L'unica modifica ammessa a codice già revisionato è il parametro `exceptId` di `findExistingName`, che Task 3 motiva.
- `src/app/(app)/clienti/[id]/page.tsx` — la griglia diventa modificabile e si deriva da `CLIENT_FIELDS`. **Da preservare intatto:** il controllo `UUID` con `notFound()` (righe 17, 41), la distinzione fra sessione assente e auth irraggiungibile (righe 50-55), `maybeSingle()` col suo commento (righe 59-61), il `console.error` con solo `code` e `message` (riga 65), `ClientHeader` e `ClientError`. Cambia solo l'identità in cima, dove il nome diventa un campo.
- `src/app/(app)/clienti/[id]/loading.tsx` — scheletri della forma nuova
- `src/lib/format-date.ts` — si aggiunge `formatClockTime`. `formatLastActivity` non si tocca: la usa l'elenco.
- `src/app/globals.css` — sei classi in più, una in meno

**Riusati senza modifiche, e da non riscrivere**
`src/lib/validate-client-name.ts` (`validateClientName`, `CLIENT_NAME_MAX_LENGTH`, `normalizeClientName`), `src/lib/types.ts` (`ClientRow`), `src/components/status-pill.tsx`, `src/components/error-state.tsx`.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/page.tsx`, `src/app/(app)/clienti/nuovo/*`.

### Le tre decisioni del 2 agosto 2026

Prese da Luca alla consegna di questa story, dopo le domande aperte lasciate dall'analisi. Sono la ragione per cui questo file contiene più di quello che `epics.md` chiede. Le prime due valgono oltre questa story e sono registrate come **D22** e **D21** in `00-contesto-e-decisioni.md`; la terza è un rinvio e sta in `deferred-work.md`.

1. **Il nome si corregge da qui** (AC5, D22). `epics.md` lo lasciava fuori perché FR2 elenca dieci campi e il nome non c'è, ma il nome è l'unico campo obbligatorio: un refuso lì resterebbe per sempre, ed è anche l'identificativo nell'elenco. Entra, con la validazione e l'avviso di doppione che esistono già.
2. **I campi lunghi si salvano da soli, e il salvataggio a mano resta** (AC6, D21). `AGENTS.md` e `kb-0.md` §6 lo chiedono senza eccezioni: qualsiasi campo lungo salva da solo e dice quando ha salvato. `epics.md` diceva solo "modifico un campo e confermo", che per obiettivi e note non basta.
3. **L'alone del focus resta com'è.** `.input:focus` usa `--sec-prequalifica` su tutte le schermate, mentre UX-DR14 chiede la tinta della sezione corrente. La correzione tocca ogni campo del progetto, `/accedi` compreso, e resta alla **Story 5.2**. Non si corregge qui nemmeno di striscio.

### Perimetro: cosa NON entra in questa story

- **Lo stato non si modifica**: il selettore dei cinque stati è la **Story 1.3**. Qui la pillola resta in sola lettura, com'è adesso.
- **I tag non si modificano**: il campo con i suggerimenti è la **Story 1.4**.
- **Le persone non esistono ancora** in questa schermata: **Story 1.5**.
- **L'indicatore di salvataggio non si ancora in fondo alla schermata e non copre l'intera scheda.** Qui sta sotto i due campi che si salvano da soli, ed è tutto. Il salvataggio automatico dell'intera compilazione, con l'indicatore ancorato e sempre visibile, resta la **Story 3.3**: qui si costruisce il componente, lì gli si dà quel posto.
- **I campi corti non si salvano da soli.** La regola parla di campi lunghi, e un campo corto è a una battuta dalla fine: la conferma costa niente e rende la scrittura intenzionale. Non "armonizzare" i due comportamenti.
- **Nessun test automatico**: il comando che li esegue arriva con la **Story 1.6**. Qui l'obbligo è solo che `client-fields.ts` e `format-date.ts` restino puri ed esportati, così 1.6 possa metterci un test sopra senza riscriverli.
- **L'ordinamento dell'elenco resta su `clients.updated_at`**: correggerlo in ultima attività vera è la **Story 1.6**.
- **Niente `metadata` sulle rotte**, niente ritocchi a `.btn`, niente cambi alla navigazione di riga nell'elenco, niente ritocchi all'alone del focus: sono le voci rimandate in `deferred-work.md` più la decisione 3, e stanno dove sono.

### Il debito che questa story chiude

`deferred-work.md`, seconda voce: oggi `COLUMNS`, il `Pick<ClientRow, ...>` e l'array `fields` ripetono gli stessi dieci nomi in tre punti di `page.tsx`, e togliere un campo da `fields` non produce nessun errore di compilazione — il campo sparisce dalla scheda in silenzio.

Task 1 e Task 6 lo chiudono così: **un elenco solo (`CLIENT_FIELDS`), due usi derivati (il tipo e la resa), e una stringa letterale (`COLUMNS`) che il compilatore confronta col tipo.** La verifica che sia davvero chiuso è nella prima parte di Task 8: togliere un campo da `COLUMNS` deve fermare `typecheck`. Se non lo ferma, il debito è ancora aperto e la story non è finita.

Quando la voce è chiusa, va tolta da `deferred-work.md`: quel file si cancella solo quando le voci sono chiuse davvero.

### Vincoli dello schema che governano questa story

Da `supabase/migrations/0002_clients.sql`:

```sql
name      text not null check (length(trim(name)) > 0),
employees integer check (employees is null or employees >= 0),
-- sector, website, city, province, address, source_channel, revenue,
-- business_goals, notes: text, tutti nullable, nessun vincolo
```

- **`employees` è l'unico campo con un vincolo**, ed è l'unico numerico: è dove sta AC3 e dove sta il rischio.
- I nove campi testuali non hanno lunghezza massima. Non se ne aggiunge una in questa story: il limite di 200 caratteri della Story 1.1 esiste perché il nome è l'identificativo nell'elenco, e obiettivi e note sono esattamente i posti dove un testo lungo è legittimo.
- `revenue` è testo di proposito: "circa due milioni" è una risposta reale (D15). Non trasformarlo in un numero, non validarlo.
- Il trigger `clients_set_updated_at` è `before update`: `updated_at` si aggiorna da solo a ogni scrittura, ed è la metà di AC2.

Policy attiva (`0007_rls.sql:17-20`), valida anche in scrittura:

```sql
create policy clients_owner_all on clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
```

La protezione sta nel database (D20, `database.md` §6 variante A). L'update di una riga non propria non fallisce con un errore: non tocca nessuna riga. Per questo Task 2 chiede indietro la riga con `.select('id').maybeSingle()`.

### La decisione tecnica di questa story: dove sta la modifica

**Un form per campo, con conferma esplicita.** Il valore sta sempre in un controllo vero, con la sua etichetta; `Salva` e `Annulla` compaiono solo quando il campo è cambiato.

Le due alternative e perché non si prendono:

- *Un modulo unico per tutta la scheda, con un solo Salva in fondo.* La story dice "senza passare da un modulo separato" e "quando scopro qualcosa a metà di una call lo scrivo subito": un salvataggio unico obbliga a rileggere dieci campi per confermarne uno, e se fallisce mette in dubbio tutti e dieci.
- *Clicca per modificare, il valore diventa campo solo dopo il clic.* Più elegante da guardare, ma raddoppia gli stati di ogni campo e va costruita apposta da tastiera, dove un testo non cliccabile non ha modo di dire che è modificabile. Con un utente solo, una scheda densa e diretta vale più di una che sembra un documento (`kb-0.md` §6, "restare specifici").

Conseguenza da tenere presente: **la scheda somiglia a un modulo**, e va bene. Ogni campo è indipendente, quindi un errore su uno non tocca gli altri, e quello che è scritto negli altri non si perde (NFR1).

**Sopra questa struttura, due modi di salvare e un solo percorso di scrittura.** Il campo corto si conferma, il campo lungo si salva da solo dopo tre secondi o all'uscita dal campo, e il suo `Salva` continua a funzionare. Ma l'azione chiamata è la stessa, costruita allo stesso modo, sia che la lanci un clic sia che la lanci un timer: la differenza sta in chi tira la corda, non in cosa succede dopo. Due percorsi di scrittura vorrebbero dire due comportamenti da tenere allineati a mano, ed è esattamente il genere di disallineamento che questa story esiste per chiudere altrove.

Il campo lungo che si salva da solo **deve dire quando ha salvato**: è la seconda metà della regola, non un abbellimento. Un salvataggio silenzioso è indistinguibile da un salvataggio mancato, e chi sta scrivendo non ha modo di sapere quale dei due è.

### La trappola di sicurezza di questa story

L'azione riceve dal browser il nome della colonna da scrivere. Se lo usa senza controllarlo, chiunque apra gli strumenti di sviluppo può scrivere `owner_id`, `status`, `created_at` o `name` passando dalla stessa azione.

Due difese, entrambe obbligatorie:

1. `isClientFieldKey()` sul server, prima di costruire qualsiasi cosa. La chiave non nell'elenco non è un caso da gestire con garbo: è una richiesta che non doveva esistere, e si rifiuta.
2. Un campo per chiamata, mai il `formData` riversato in un oggetto. `Object.fromEntries(formData)` passato a `.update()` è precisamente il difetto che questa nota esiste per impedire.

La policy resta l'ultima difesa e impedisce di scrivere sulle righe di un altro proprietario, ma **non** impedisce di scrivere la colonna sbagliata sulla propria riga. Il client non è attendibile (`kb-0.md` §3).

### Tipi: `any` è vietato

`tsconfig.json` ha `strict` e `noUncheckedIndexedAccess`.

```ts
import type { ClientRow } from '@/lib/types'           // già esistente, non riscriverlo
import { CLIENT_FIELDS, type ClientFieldKey } from '@/lib/client-fields'

type ClientDetail = Pick<ClientRow, 'id' | 'name' | 'status' | ClientFieldKey>
type ClientPatch  = Partial<Pick<ClientRow, ClientFieldKey>>
```

Lo stato dell'indicatore è una union discriminata, non tre booleani: con tre booleani esistono otto combinazioni di cui cinque impossibili, e prima o poi il codice ne rende una.

`CLIENT_FIELDS` va dichiarato `as const`, altrimenti `key` si allarga a `string` e `ClientFieldKey` non vale più niente: il compilatore smette di controllare proprio la cosa per cui esiste.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `Object.fromEntries(formData)` dentro `.update()` | Scrittura arbitraria su qualsiasi colonna | Un campo per chiamata, chiave passata da `isClientFieldKey` |
| Stringa vuota scritta al posto di `null` | AC2 violata: un campo svuotato resta un dato vuoto invece che vuoto | `normalizeTextValue` ritorna `null` |
| `Number(raw)` su `employees` | `Number('')` è `0`: svuotare il campo scriverebbe zero dipendenti | `parseEmployees`, che distingue vuoto da zero |
| `type="number"` su `employees` | Il browser restituisce `''` per un contenuto non numerico: quello che l'utente ha scritto sparisce prima del server | `type="text"` con `inputMode="numeric"` |
| `updated_at` scritto a mano | Due posti da tenere allineati, e AC2 chiede il trigger | Non scriverlo |
| `single()` invece di `maybeSingle()` | Una riga non propria diventa un errore invece di un messaggio | `maybeSingle()` |
| `redirect()` in `updateClientField` | La modifica in linea non porta da nessuna parte | Nessun redirect in questa azione |
| Campo non controllato | React ripulisce i campi non controllati a fine invio: un valore rifiutato sparisce insieme all'errore | `useState`, come in `new-client-form.tsx` |
| `useFormState` da `react-dom` | Nome vecchio | `useActionState` da `react` |
| `revalidatePath` solo sulla scheda | L'elenco resta con l'ordine di prima, perché `updated_at` si è mosso | Rivalidare anche `/clienti` |
| Confronto "modificato" fatto sul valore grezzo | Uno spazio in coda lascia `Salva` acceso su un campo già salvato | Allineare il campo a `state.saved` dopo il salvataggio |
| Identificatori `htmlFor` uguali | Dieci campi nella stessa pagina: l'etichetta punta al campo sbagliato | `id` costruito dalla chiave del campo |
| `<form>` dentro `<form>` | HTML non valido, l'invio si comporta a caso | Dieci form fratelli dentro la card |
| `details` dell'errore Supabase nei log | Contiene il valore rifiutato, cioè un dato del cliente | Solo `code` e `message` (NFR15) |
| `name` messo dentro `CLIENT_FIELDS` | Limite di 200 caratteri, caratteri invisibili e avviso di doppione saltati in silenzio | Azione `renameClient` separata |
| `findExistingName` senza `exceptId` sulla rinomina | Il cliente risulta doppione di se stesso: cambiare una maiuscola richiede due Salva | Escludere la riga che si sta rinominando |
| Azione chiamata dal timer fuori da `startTransition` | React avvisa e `pending` non si comporta | `startTransition` importato da `react` |
| Timer del salvataggio automatico non pulito allo smontaggio | Un salvataggio parte su un componente che non c'è più | Pulizia nel ritorno dell'effetto |
| Salvataggio automatico senza il salvataggio all'uscita dal campo | Scrivere e cliccare via entro tre secondi perde il testo: è l'unica promessa non negoziabile | Salvare anche su `blur`, se cambiato |
| Testo ripristinato dopo un salvataggio fallito | Si perde quello che l'utente ha scritto proprio nel momento in cui contava | Il campo resta com'è, l'indicatore dice che non è salvato |
| Ora del salvataggio calcolata durante la resa sul server | Server e client rendono due orari diversi, l'idratazione si lamenta | L'ora nasce nel browser, dopo il salvataggio |

### Contratto visivo

- Card unica, `--r-xl`, ombra `--sh-1`, padding 24, nessun bordo (UX-DR3). La scheda resta una card sola, non una per campo.
- Nome a `--t-display` con `.display-title`, già in `globals.css:196`.
- Colore di sezione `--sec-clienti`: vive **solo** nella navigazione, mai nel contenuto (UX-DR2). Nessuna parte di questa scheda diventa blu.
- Pulsanti: `Salva` primario su `--ink`, `Annulla` secondario. Compaiono un campo per volta, quindi non c'è mai più di un primario visibile per campo; la regola dell'unica azione primaria per schermata (UX-DR10) regge perché a riposo non ce n'è nessuna.
- Voce: italiano, frase minuscola, voce attiva. `Salva` e `Annulla`, come nel modulo di creazione: la stessa azione si chiama allo stesso modo dovunque (UX-DR13).
- Errori che dicono cosa fare, mai cosa è successo nello stack (NFR16). Il dettaglio resta nei log del server, e nei log non finiscono mai dati di clienti (NFR15).
- I quattro stati della schermata sono un requisito, non una rifinitura (NFR9, UX-DR11).
- Nessun esadecimale fuori da `globals.css` (UX-DR16).

- L'indicatore di salvataggio è in monospaziato e non si muove: nessuna spunta animata, nessun avviso a comparsa, nessun incoraggiamento. Sta lì, lo si guarda quando serve (UX-DR8).
- Il rosso dell'indicatore è l'unico rosso ammesso in questa schermata, e solo quando un salvataggio è davvero fallito. Non si usa il rosso per attirare l'attenzione su cose che non sono errori (`design-system.md` §10).

**Una discordanza già presente, che questa story non corregge:** `.input:focus` usa `--sec-prequalifica` (`globals.css:371`), mentre UX-DR14 chiede l'alone nella tinta della sezione corrente, che qui è `--sec-clienti`. Con undici campi in una schermata di clienti la cosa diventa visibile ovunque. Correggerla tocca ogni campo del progetto, compresi quelli di `/accedi`. Decisione 3 del 2 agosto 2026: resta com'è e appartiene alla Story 5.2, la passata di accessibilità verificata.

### Test

Non esiste ancora un comando che esegua i test: introdurlo è la **Story 1.6**. Qui l'unico obbligo è che `client-fields.ts` non importi né React né Supabase e che insieme a `format-date.ts` esporti tutto quello che 1.6 vorrà provare — `parseEmployees` in particolare, che è la logica che rompendosi produce dati sbagliati, e `formatClockTime`, che è una trasformazione (`kb-0.md` §7).

La verifica di questa story è la prova a mano di Task 8. Il codice si considera non funzionante finché non lo si è visto funzionare.

### Project Structure Notes

```
src/lib/
├── types.ts               ClientRow (invariato)
├── validate-client-name.ts (invariato, riusato dalla rinomina)
├── format-date.ts         + formatClockTime
└── client-fields.ts       NUOVO — fonte unica dei campi, puro

src/components/
├── status-pill.tsx        (invariato)
├── error-state.tsx        (invariato)
└── save-indicator.tsx     NUOVO — i tre stati di UX-DR8, riusato dalla Story 3.3

src/app/(app)/clienti/
├── page.tsx               elenco (invariato)
├── actions.ts             + updateClientField, + renameClient, findExistingName con exceptId
└── [id]/
    ├── page.tsx           riscritta sulla fonte unica
    ├── loading.tsx        scheletri della forma nuova
    └── client-field-form.tsx  NUOVO — il campo modificabile
```

`save-indicator.tsx` sta in `src/components/` e non dentro `[id]/` proprio perché la Story 3.3 lo prenderà da lì: un componente che due schermate condividono non vive dentro la cartella di una delle due.

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Nomi in inglese nel codice, in italiano nell'interfaccia.

Nessuna dipendenza nuova. In particolare niente libreria di form e niente libreria di validazione: quello che serve sono trenta righe.

### Intelligence dai commit

Da `2573eb1` e `4395781` (Story 1.1, prima e dopo la revisione), le abitudini che questa story eredita:

- I commenti spiegano il *perché* di una scelta e citano il documento che la giustifica (`kb-0.md` §3, D14). Non ripetono quello che il codice già dice. Misura giusta: `actions.ts:35-37`, `[id]/page.tsx:12-16`.
- Gli errori si distinguono per natura prima che per messaggio: sessione assente contro servizio irraggiungibile, riga assente contro lettura fallita. È la ragione per cui la scheda ha tre uscite diverse invece di una schermata d'errore sola.
- Nei log ci vanno `code` e `message`, mai `details`.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

La revisione della Story 1.1 ha prodotto cinque voci rimandate: due riguardano file che questa story tocca (`[id]/page.tsx` per la fonte unica dei campi, `.btn` per l'altezza). La prima è dentro il perimetro e va chiusa, la seconda no e resta dov'è.

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.2: Vedere e modificare la scheda del cliente]
- FR2 e FR26, campi del cliente e loro facoltatività: [Source: docs/prd-v1.md#3. Entità e campi]
- Schema, vincoli, trigger, policy: [Source: docs/database.md#3. Tabelle], [Source: docs/database.md#4. Aggiornamento automatico di updated_at], [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Card, campi, pulsanti, quattro stati, voce: [Source: docs/design-system.md#4. Spazio, forma, profondità], [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#6. I quattro stati di ogni schermata], [Source: docs/design-system.md#7. Voce dell'interfaccia]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica]
- Decisioni: D13 (un valore non rilevato non si mostra come zero), D15 (fatturato è testo, non numero), D14 (nessuno stato blocca), D9 e D20 (`owner_id`, RLS, variante A), **D21** (quando un campo si salva da solo e quando si conferma), **D22** (l'anagrafica si corregge tutta, nome compreso) — [Source: docs/00-contesto-e-decisioni.md]
- Voci rimandate dalla revisione della Story 1.1: [Source: docs/bmad/implementazione/deferred-work.md]
- Story precedente, pattern e correzioni: [Source: docs/bmad/implementazione/1-1-creare-un-cliente-col-solo-nome.md]
- Salvataggio automatico e indicatore, i tre stati esatti: [Source: docs/design-system.md#5. Componenti], [Source: docs/prd-v1.md#4. Schermate] (FR19, FR20, che la Story 3.3 erediterà)
- Il lavoro dell'utente non si perde mai, ogni campo lungo salva da solo e dice quando: [Source: AGENTS.md#Regole non negoziabili], [Source: docs/kb-0.md#6. Interfaccia e design]
- Campi controllati e ripulitura dei form dopo una Server Action in React 19: [Source: https://react.dev/reference/react/useActionState], [Source: https://www.robinwieruch.de/react-server-action-reset-form/]
- `startTransition` per chiamare un'azione fuori da un gestore di evento: [Source: https://react.dev/reference/react/startTransition]
- `revalidatePath` e Server Actions: [Source: https://nextjs.org/docs/app/api-reference/functions/revalidatePath]

## Dev Agent Record

### Agent Model Used

claude-opus-5

### Debug Log References

**Un valore esportato da un file `'use client'` non arriva al server.** `NAME_FIELD` era stato messo
dentro `client-field-form.tsx`, com'era naturale: sta accanto al componente che lo usa. Sul server
però quel modulo non è il modulo, è un riferimento al client, e `typeof NAME_FIELD` risponde
`"function"`: `NAME_FIELD.key` sarebbe arrivato `undefined` e il campo del nome sarebbe stato reso
senza etichetta e senza sapere che azione chiamare. Né `typecheck` né `build` se ne accorgono, perché
nessuno dei due esegue la pagina. Provato con una rotta usa e getta sotto `/auth` (l'unico percorso
pubblico), poi cancellata: prima `{"tipo":"function"}`, dopo lo spostamento in `client-fields.ts`
`{"tipo":"object","nome":{"key":"name",...}}`. Regola che ne esce: **i valori che un Server Component
deve leggere non stanno in un file `'use client'`.**

**Che la fonte unica tenga è stato provato, non dedotto.** Tolto `sector` da `COLUMNS` lasciandolo in
`CLIENT_FIELDS`: `tsc` risponde `Property 'sector' is missing in type ... but required in type
'ClientDetail'` su entrambi i punti in cui la riga viene passata. Ripristinato. È la prova che il
debito rimandato dalla Story 1.1 è chiuso davvero.

**Che il tipo della query non sia `any`.** Come nella Story 1.1: introdotto `data.nonEsiste`, `tsc`
risponde `Property 'nonEsiste' does not exist on type '{ id: string; name: string; ... }'` con
l'elenco completo delle colonne. Ripristinato.

**Cache di build.** Confermato quanto annotato dalla Story 1.1: dopo `npm run build`, `next dev` va
riavviato con `rm -rf .next`.

### Completion Notes List

**Implementato (Task 1-7)**

- `src/lib/client-fields.ts`: `CLIENT_FIELDS` come unico elenco, i tipi derivati, `isClientFieldKey`,
  `normalizeTextValue`, `parseEmployees`. Puro, senza React e senza Supabase.
- `updateClientField` e `renameClient` in `clienti/actions.ts`, il file condiviso già esistente.
  Chiave controllata dall'allow-list, un campo per chiamata, `maybeSingle()`, nei log solo `code` e
  `message`, `revalidatePath` sulla scheda e sull'elenco, `updated_at` lasciato al trigger.
- `findExistingName` estesa con `exceptId`: la rinomina non conta il cliente come doppione di se stesso.
- `save-indicator.tsx` in `src/components/`, i tre stati esatti, sola presentazione, nessun timer dentro.
- `client-field-form.tsx`: un solo componente per undici campi. `kind` decide controllo, azione e
  salvataggio automatico. Ogni campo è un modulo a sé.
- Scheda e scheletri riscritti su `CLIENT_FIELDS`. Nessun elenco di campi scritto a mano.

**Otto scelte diverse da come le prescriveva il file di story, con il motivo**

1. **`NAME_FIELD` sta in `src/lib/client-fields.ts`, non accanto al componente.** Vedi il Debug Log:
   da un file `'use client'` non sarebbe arrivato al Server Component. Resta **fuori** da
   `CLIENT_FIELDS`, quindi `isClientFieldKey('name')` continua a rispondere falso e la trappola di
   sicurezza della story regge intatta.
2. **Aggiunto `openSession` in `actions.ts`.** Le due azioni nuove non devono reindirizzare, quindi non
   possono riusare la sequenza di `createClientRecord`, che finisce con `redirect('/accedi')`. Senza
   l'helper la distinzione fra sessione assente e auth irraggiungibile sarebbe stata scritta tre volte.
   `createClientRecord` non è stato toccato: tiene la sua copia perché lì il redirect è parte dell'azione.
3. **Nessun redirect nelle due azioni nuove, nemmeno quando la sessione è davvero finita.** La story dice
   "nessun `redirect()` in questa azione" e ne dà il motivo: portare via quello che è stato appena
   scritto. Vale anche per il caso senza sessione, che con undici campi aperti porterebbe via tutto.
   Al suo posto un messaggio che dice cosa fare. Chi non ha una sessione lo ferma già il proxy.
4. **`EMPLOYEES_NEGATIVE_MESSAGE` esportato da `client-fields.ts`.** La stessa frase serve a
   `parseEmployees` e al ramo `23514`: due copie si allontanerebbero alla prima riscrittura.
5. **Cambiato il prefisso del log di `findExistingName`** da `createClientRecord:` a `findExistingName:`.
   Ora la funzione la chiamano due azioni, e il vecchio prefisso sarebbe stato falso nei log della
   rinomina. È la seconda modifica a codice già revisionato, oltre a `exceptId` che Task 3 autorizza.
6. **Tre classi in più di quelle elencate in Task 7:** `.save-indicator` (base: i due modificatori
   hanno bisogno di qualcosa da modificare, e lì sta il colore a riposo e lo spazio riservato),
   `.save-indicator__retry`, e `.detail-identity` riscritta da `align-items: center` a `flex-start`
   con `justify-content: space-between`, perché Task 6 cambia quel blocco: la pillola deve stare
   accanto all'etichetta del nome, non a metà di un campo alto.
7. **Il modulo tiene `action={formAction}` e in più c'è `submit()`.** Il `Salva` a mano resta un invio
   vero, con i campi nascosti che Task 5 chiede; il timer, l'uscita dal campo e `Riprova` costruiscono
   lo stesso `FormData` e chiamano la stessa azione. Un percorso di scrittura solo nel senso che conta:
   stessa azione, stesse chiavi, stesso comportamento dopo.
8. **L'allineamento a `state.saved` avviene solo se nel campo c'è ancora quello che è stato mandato.**
   Allinearlo sempre avrebbe cancellato il testo scritto mentre il salvataggio era in volo, cioè
   esattamente quello che AC6 vieta. Con questa condizione lo spazio in coda si allinea e il testo
   nuovo non si tocca.

**Da decidere, e non deciso qui**

- **`.display-title` non è più usata da nessun file.** Task 7 dice esplicitamente di tenerla come misura
  di riferimento, quindi è rimasta, dichiarata insieme a `.input--display` così il 32/38/600/-0.02em
  esiste in un posto solo. Resta però una classe che nessun TSX nomina, e `kb-0.md` §2 dice che il
  codice morto si cancella. Decisione di Luca.
- **La regola dell'uuid è scritta in due file**, `[id]/page.tsx` e `actions.ts`, con due scopi diversi
  (una scheda che non c'è, contro una richiesta che non doveva esistere). Metterla in comune voleva
  dire un file nuovo fuori dai tre che la story dichiara. Rimandata in `deferred-work.md`.

**Chi ha verificato cosa (Task 8).** Il percorso con accesso richiede una sessione che arriva per email:
non è una cosa che poteva fare l'agente, e le sue caselle restano vuote. Verificato dall'agente:
`typecheck` e `build` puliti con le sette rotte di prima, tipo della query provato reale e non `any`,
fonte unica provata (togliere un campo da `COLUMNS` ferma il compilatore), `parseEmployees` su diciotto
casi limite compresi `''`, spazi, `0`, `-1`, `1.5`, `1e3`, `007`, `2147483647`, `2147483648` e valori non
stringa, `normalizeTextValue` su otto, `formatClockTime` su mezzanotte, mezzogiorno e `09:05`, il
confronto dei doppioni con e senza `exceptId` su nove casi, proxy che continua a mandare `/clienti` a
`/accedi`, nessun errore in console, tutte le classi nuove presenti nel foglio di stile e `.detail__value`
sparita. **Le ventitré voci del secondo gruppo restano da percorrere con una sessione aperta.**

**Nessun test automatico**, come da perimetro: il comando arriva con la Story 1.6. Le verifiche qui
sopra sono state fatte con script usa e getta fuori dal repository, sulle funzioni pure compilate.
`client-fields.ts` non importa né React né Supabase, e insieme a `format-date.ts` esporta tutto quello
che 1.6 vorrà provare.

**Restano invariati:** nessuna migrazione, nessuna dipendenza nuova, nessun esadecimale fuori da
`globals.css`, nessun `any`, `createClientRecord` intatto, `.btn` a 40px e l'alone del focus lasciati
dove stanno.

### File List

**Nuovi**

- `src/lib/client-fields.ts`
- `src/components/save-indicator.tsx`
- `src/app/(app)/clienti/[id]/client-field-form.tsx`
- `src/lib/use-editable-field.ts` — aggiunto dalla revisione del 3 agosto 2026

**Modificati**

- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`
- `src/lib/format-date.ts`
- `src/app/globals.css`
- `docs/bmad/implementazione/deferred-work.md`
- `docs/bmad/implementazione/sprint-status.yaml`

## Change Log

| Data | Cosa |
|---|---|
| 2 agosto 2026 | Story creata sulle quattro AC di `epics.md`. |
| 2 agosto 2026 | Tre decisioni di Luca. Il nome diventa modificabile (AC5, Task 3). I campi lunghi si salvano da soli con il salvataggio a mano ancora disponibile, e l'indicatore di UX-DR8 si costruisce qui una volta sola perché la Story 3.3 lo riusi (AC6, Task 4 e 5). L'alone del focus resta com'è e appartiene alla Story 5.2. |
| 2 agosto 2026 | Le prime due decisioni registrate come D21 e D22 in `00-contesto-e-decisioni.md`, la terza come voce rimandata in `deferred-work.md`. |
| 3 agosto 2026 | Task 1-7 implementati. Fonte unica dei campi, due azioni nuove, indicatore di salvataggio riusabile, campo modificabile unico per undici campi, scheda e scheletri riscritti. Otto scelte diverse dal file di story, con il motivo scritto. Chiusa la seconda voce di `deferred-work.md`: i tre elenchi paralleli sono diventati uno, e la prova è che togliere un campo da `COLUMNS` ferma il compilatore. |
| 3 agosto 2026 | Task 8 diviso come nella Story 1.1: sette voci verificate dall'agente, ventitré da percorrere con una sessione aperta e lasciate vuote. |
| 3 agosto 2026 | Story chiusa da Luca con le ventitré prove a sessione aperta ancora da percorrere: la chiusura è una decisione sua, non una verifica. |
| 3 agosto 2026 | Revisione del codice su tre livelli. Diciassette voci: tre decisioni di Luca, quattordici correzioni applicate, due rimandate, una scartata. Il salvataggio esce da `useActionState` e diventa `src/lib/use-editable-field.ts`, che la Story 3.3 eredita già senza i quattro difetti gravi trovati qui. Story riportata a `in-progress`: le ventitré prove con una sessione aperta valgono adesso su un percorso di scrittura riscritto. |
