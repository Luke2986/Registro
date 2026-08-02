---
baseline_commit: 578cae602443fd5fa15aab33854cbbc22ac95740
---

# Story 1.1: Creare un cliente col solo nome

Status: review

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 2 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want creare un cliente scrivendo soltanto il nome,
so that posso registrarlo durante la telefonata senza fermarmi a compilare campi che ancora non conosco.

## Acceptance Criteria

**AC1 — lo stato vuoto porta da qualche parte**
**Given** l'elenco clienti vuoto
**When** apro l'elenco
**Then** vedo una riga che dice cosa manca e un pulsante che crea il primo cliente
**And** il pulsante non è un vicolo cieco: porta al modulo di creazione (UX-DR11)

**AC2 — creazione col solo nome**
**Given** il modulo di creazione aperto
**When** scrivo un nome e salvo
**Then** il cliente viene creato con stato `potenziale` e `owner_id` preso dalla sessione verificata sul server
**And** finisco sulla sua scheda, senza dover cercare la riga nell'elenco

**AC3 — rifiuto del nome vuoto, anche sul server**
**Given** il modulo di creazione aperto
**When** salvo con il campo nome vuoto o pieno di soli spazi
**Then** la creazione viene rifiutata con un messaggio che dice cosa fare
**And** il rifiuto avviene anche sul server con uno schema, non solo nel form (NFR10)

**AC4 — niente zeri al posto del vuoto**
**Given** un cliente appena creato
**When** guardo la sua scheda
**Then** i campi non compilati si mostrano vuoti, mai come zero (FR1)

## Tasks / Subtasks

- [x] **Task 1 — Validazione riusabile del nome** (AC: 3)
  - [x] Creare `src/lib/validate-client-name.ts`: funzione pura, nessun import di React o Supabase, esportata perché la Story 1.6 possa metterci un test sopra.
  - [x] Regola unica: `name.trim().length > 0`. È la stessa condizione del vincolo `check (length(trim(name)) > 0)` su `clients` (`supabase/migrations/0002_clients.sql:9`). Ritorna il nome già ripulito con `trim()`, così il valore scritto e il valore validato sono lo stesso.
  - [x] Nessuna libreria di validazione: si fa in venti righe, quindi si fanno venti righe (`kb-0.md` §2, `AGENTS.md`).

- [x] **Task 2 — Server Action di creazione** (AC: 2, 3)
  - [x] Creare `src/app/(app)/clienti/actions.ts` con `'use server'` in testa. È il file condiviso dove le Story 1.2, 1.3 e 1.4 aggiungeranno le loro azioni: non crearne uno per story.
  - [x] Nome della funzione: `createClientRecord`. **Non** `createClient`: quel nome è già preso da `@/lib/supabase/server` e da `@/lib/supabase/client`, e la collisione dentro lo stesso file è un errore che si scopre solo a runtime.
  - [x] Sequenza obbligata dentro l'azione:
    1. `const supabase = await createClient()` (helper server).
    2. `const { data: { user } } = await supabase.auth.getUser()`; se manca → `redirect('/accedi')`.
    3. Validare con la funzione di Task 1; se fallisce → **ritornare** un oggetto d'errore, non lanciarlo.
    4. `insert` su `clients` con `{ name: nomeRipulito, owner_id: user.id }` e nient'altro: `status`, `tags`, `created_at`, `updated_at` hanno già il loro default nello schema.
    5. Se l'insert fallisce → ritornare un oggetto d'errore con un messaggio che dice cosa fare, non il messaggio di Postgres (NFR16, `kb-0.md` §3).
    6. `revalidatePath('/clienti')`.
    7. `redirect(\`/clienti/${nuovo.id}\`)`.
  - [x] **`redirect()` va chiamato fuori da qualsiasi `try/catch`.** In Next.js `redirect` funziona lanciando un errore `NEXT_REDIRECT`: dentro un `catch` viene inghiottito e la navigazione non avviene. È il difetto più comune di questo pattern.
  - [x] L'`insert` deve chiedere indietro l'id: `.insert({...}).select('id').single()`.
  - [x] `owner_id` viene **solo** da `user.id` letto sul server, mai da un campo del form. La policy `clients_owner_all` (`0007_rls.sql:17`) rifiuterebbe comunque un valore diverso, ma il codice non deve mai metterla alla prova.

- [x] **Task 3 — Modulo di creazione** (AC: 2, 3)
  - [x] Creare la rotta `src/app/(app)/clienti/nuovo/page.tsx`: Server Component, solo l'intestazione di pagina e la card che contiene il form. Stessa struttura di `clienti/page.tsx` (`page-header` + `page-title` + `card`).
  - [x] Creare `src/app/(app)/clienti/nuovo/new-client-form.tsx` con `'use client'`: un componente per file (`kb-0.md` §2).
  - [x] Usare `useActionState` importato da **`react`** (React 19.2). Non `useFormState` da `react-dom`: è il nome vecchio.
  - [x] Un solo campo: nome. Etichetta vera `<label htmlFor>`, mai solo un segnaposto (UX-DR14). Riusare le classi già presenti: `.field`, `.label`, `.input`.
  - [x] Errore mostrato nella `.error-box` con `role="alert"`, esattamente come in `src/app/accedi/access-form.tsx:58-62`.
  - [x] Pulsanti: primario `Salva` (`.btn .btn--primary`), secondario `Annulla` che torna a `/clienti` (`.btn .btn--secondary`). Una sola azione primaria per schermata (UX-DR10).
  - [x] Il pulsante si disabilita durante l'invio usando il `pending` di `useActionState`, come `access-form.tsx:64` fa con la sua fase.
  - [x] `required` sull'input serve all'utente, non alla sicurezza: la validazione che conta è quella di Task 2.

- [x] **Task 4 — Stato vuoto che non è un vicolo cieco** (AC: 1)
  - [x] In `src/app/(app)/clienti/page.tsx`, sostituire il testo segnaposto alle righe 45-50 (`"La schermata che crea un cliente arriva con il prossimo pezzo di lavoro."`): oggi lo stato vuoto è esattamente il vicolo cieco che questa story chiude.
  - [x] Stato vuoto: `Nessun cliente ancora.` più un `Link` a `/clienti/nuovo` con l'aspetto del pulsante primario, testo `Crea il primo cliente`.
  - [x] Elenco pieno: pulsante `Nuovo cliente` nell'intestazione di pagina, accanto al contatore.
  - [x] Il pulsante primario compare **in un posto solo per volta**: nell'intestazione quando l'elenco è pieno, nello stato vuoto quando è vuoto (UX-DR10, `design-system.md` §2 regola 5).
  - [x] L'azione si chiama allo stesso modo lungo tutto il percorso: il pulsante dice `Crea il primo cliente` / `Nuovo cliente`, la schermata di destinazione si intitola `Nuovo cliente`, il salvataggio dice `Salva` (UX-DR13, `kb-0.md` §6).

- [x] **Task 5 — Scheda cliente in sola lettura** (AC: 2, 4)
  - [x] Creare `src/app/(app)/clienti/[id]/page.tsx`: è la destinazione della creazione, quindi senza questa AC2 e AC4 non si possono verificare.
  - [x] Contenuto: nome a `--t-display` (32/38, peso 600, spaziatura -0.02em), pillola di stato riusando `<StatusPill />`, e i campi anagrafici in sola lettura: settore, sito web, città, provincia, indirizzo, canale di arrivo, fatturato, dipendenti, obiettivi di business, note.
  - [x] **AC4, il punto che si sbaglia:** un campo `null` non si rende mai come `0`, né come stringa vuota travestita da dato. Vietati `value ?? 0`, `value || 0`, `Number(value)`. Un valore mancante lascia il posto visibilmente vuoto. `employees` è l'unico numerico ed è il candidato naturale all'errore.
  - [x] Cliente inesistente o di un altro proprietario → `notFound()`. Con la sicurezza a livello di riga attiva i due casi arrivano identici (nessuna riga), ed è la risposta giusta anche per la riservatezza: non si distingue "non esiste" da "non è tuo".
  - [x] Errore di caricamento → `<ErrorState />` già esistente, con `retryHref` sulla scheda stessa.
  - [x] Creare `src/app/(app)/clienti/[id]/loading.tsx` con scheletri della forma reale, sul modello di `clienti/loading.tsx`. Mai un cerchio che gira (NFR9, UX-DR11).
  - [x] In Next 16 `params` è una Promise: `const { id } = await params`.

- [x] **Task 6 — Verifica a mano sul percorso reale** (AC: 1, 2, 3, 4)
  - [x] `npm run typecheck` pulito, `npm run build` pulito.
  - [x] Elenco vuoto → il pulsante porta al modulo → nome scritto → salvo → sono sulla scheda del cliente appena creato, con stato `potenziale`.
  - [x] Torno all'elenco: il cliente c'è. Se non c'è, manca `revalidatePath`.
  - [x] Salvo col campo vuoto: rifiutato con messaggio.
  - [x] Salvo con soli spazi: rifiutato. È il caso che il solo `required` del browser lascia passare.
  - [x] Doppio clic sul pulsante: non crea due clienti (il `pending` disabilita il pulsante).
  - [x] Nome lunghissimo (500 caratteri): non rompe la tabella dell'elenco.
  - [x] Scheda di un id inventato: `notFound()`, non una pagina rotta.
  - [x] Larghezza 375px: modulo e scheda restano usabili, bersagli ≥44px (NFR4, UX-DR14).
  - [x] Focus da tastiera visibile su input e pulsanti.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

L'impalcatura è in piedi dal commit `57a0a01`. **Nessuna migrazione nuova in questa story: lo schema che serve esiste tutto.**

| Pezzo | Dove | Stato |
|---|---|---|
| Next.js 16.2 App Router + TypeScript strict | `package.json`, `tsconfig.json` | pronto |
| Supabase `eu-west-1`, 7 migrazioni con RLS su tutte le tabelle | `supabase/migrations/` | applicate |
| Tipi generati dallo schema | `src/lib/database.types.ts` | pronti, **non si modificano a mano** |
| Helper Supabase server e browser | `src/lib/supabase/{server,client}.ts` | pronti |
| Token del design system | `src/app/globals.css` | pronti, unico posto con esadecimali |
| Guscio dell'area con accesso (sidebar + main) | `src/app/(app)/layout.tsx` | pronto |
| Elenco clienti in sola lettura, 4 stati | `src/app/(app)/clienti/page.tsx` + `loading.tsx` | pronto |
| `StatusPill`, `ErrorState` | `src/components/` | pronti, **da riusare** |
| `formatLastActivity` | `src/lib/format-date.ts` | pronto |
| Accesso via collegamento email + proxy | `src/app/accedi/`, `src/proxy.ts` | pronto |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/validate-client-name.ts`
- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/nuovo/page.tsx`
- `src/app/(app)/clienti/nuovo/new-client-form.tsx`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`

**Modificati**
- `src/app/(app)/clienti/page.tsx` — solo intestazione e stato vuoto. **Da preservare intatto:** il controllo `getUser()` con `redirect('/accedi')` (righe 14-18), la query e il suo `.order()`, la resa della tabella `ClientsTable`, il tipo `ClientListRow`, lo stato d'errore. L'ordinamento resta su `updated_at`: correggerlo è la Story 1.6, non questa.
- `src/app/globals.css` — **solo se serve una classe che non c'è.** Prima di aggiungere, verificare: `.card`, `.page-header`, `.page-title`, `.field`, `.label`, `.input`, `.btn`, `.btn--primary`, `.btn--secondary`, `.empty`, `.error-box`, `.skeleton`, `.pill`, `.meta`, `.data` esistono già. Manca solo lo stile del titolo a `--t-display` per la scheda cliente. Nessun valore esadecimale fuori da questo file.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/app/accedi/*`, `src/components/status-pill.tsx`, `src/components/error-state.tsx`, `src/app/(app)/layout.tsx`.

### Perimetro: cosa NON entra in questa story

La scheda cliente nasce qui perché la creazione deve atterrare da qualche parte, ma nasce **in sola lettura**. Restano fuori, ciascuno con la sua story:

- Modifica in linea dei campi, note modificabili, quattro stati completi della scheda → **Story 1.2**
- Selettore dello stato → **Story 1.3**
- Campo dei tag con suggerimenti → **Story 1.4**
- Elenco delle persone, badge numerico → **Story 1.5**
- Ordinamento per ultima attività vera, banco di prova e comando dei test → **Story 1.6**
- Ricerca e filtri, colonna esito → **Story 1.7 e 4.2**
- Dichiarazione di reversibilità nelle migrazioni → **Story 1.8**

Non anticipare nessuno di questi. Se la scheda in sola lettura sembra povera, è perché lo è di proposito.

### Vincoli dello schema che governano questa story

Da `supabase/migrations/0002_clients.sql`:

```sql
owner_id  uuid not null references auth.users (id) on delete cascade,
name      text not null check (length(trim(name)) > 0),
status    text not null default 'potenziale' check (status in (...)),
tags      text[] not null default '{}',
employees integer check (employees is null or employees >= 0),
```

- `name` è l'unico obbligatorio. Il `check` sul `trim` è già nel database: la validazione applicativa serve a dare un messaggio decente, non a sostituire il vincolo.
- `status` ha il suo default: l'insert **non** lo scrive. AC2 chiede `potenziale`, e lo si ottiene non toccandolo.
- `owner_id` non ha default: va scritto esplicitamente.
- Il trigger `clients_set_updated_at` (`0006_triggers.sql`) è `before update`: sull'insert valgono i default `now()`. Nessun timestamp da scrivere a mano.

Policy attiva (`0007_rls.sql:17-20`):

```sql
create policy clients_owner_all on clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
```

La protezione sta nel database, non nel codice (D20, `database.md` §6 variante A). Non aggiungere filtri `.eq('owner_id', ...)` a mano nelle query di lettura: sono ridondanti e fanno credere che siano loro a proteggere.

### La decisione tecnica di questa story: primo percorso di scrittura del progetto

Finora il progetto legge soltanto. L'unico form esistente, `src/app/accedi/access-form.tsx`, parla col client browser di Supabase — **ma è autenticazione, non scrittura di dati, e non è il modello da copiare.**

La scrittura passa da una **Server Action**, per tre motivi che sono requisiti e non preferenze:
1. AC2 chiede `owner_id` preso dalla sessione **verificata sul server**.
2. NFR10 chiede la validazione sul server con uno schema, anche quando il form la fa già.
3. `kb-0.md` §3: il client non è attendibile, ogni autorizzazione si verifica sul server.

Forma minima corretta:

```ts
// src/app/(app)/clienti/actions.ts
'use server'

export async function createClientRecord(
  _previous: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  // 1. sessione  2. validazione  3. insert  4. revalidatePath
  // ritorna { error: '...' } sugli errori attesi
}
// il redirect sta FUORI da qualunque try/catch
```

Errori attesi (nome vuoto, insert rifiutato) si **ritornano** come valore, non si lanciano: è così che `useActionState` li fa arrivare al form. Lanciare porterebbe alla pagina d'errore, che non è quello che AC3 chiede.

### Tipi: `any` è vietato

`tsconfig.json` ha `strict` e `noUncheckedIndexedAccess`. Il tipo dello stato dell'azione si dichiara esplicitamente:

```ts
type CreateClientState = { error?: string }
```

Il tipo della riga si prende da quello già esistente, non si riscrive:

```ts
import type { ClientRow } from '@/lib/types'  // = Database['public']['Tables']['clients']['Row']
```

Per la scheda in sola lettura, restringere con `Pick<ClientRow, ...>` come fa già `clienti/page.tsx:9`.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `redirect()` dentro `try/catch` | La navigazione non avviene, l'utente resta sul form senza errore visibile | `redirect()` come ultima istruzione, fuori dal blocco |
| Azione chiamata `createClient` | Collisione con l'helper Supabase importato nello stesso file | `createClientRecord` |
| `revalidatePath` dimenticata | Il cliente creato non compare nell'elenco al ritorno | `revalidatePath('/clienti')` prima del redirect |
| `useFormState` da `react-dom` | Nome deprecato | `useActionState` da `react` |
| Nome di soli spazi | Il `required` del browser lo accetta, il vincolo del database lo rifiuta con un errore illeggibile | `trim()` prima di validare e prima di scrivere |
| `employees` reso come `0` | Viola AC4 e D13 | Nessun `?? 0`, nessun `\|\| 0` |
| Scrivere `status: 'potenziale'` nell'insert | Duplica il default e crea due posti da cambiare | Ometterlo |
| `params` usato senza `await` | In Next 16 `params` è una Promise | `const { id } = await params` |

### Contratto visivo

- Colore di sezione dei clienti `--sec-clienti` (`#4C5FD5`): vive **solo** nella navigazione, mai nel contenuto (UX-DR2). La sidebar ce l'ha già in `globals.css:161`.
- Pulsante primario su fondo `--ink`, non colorato: il colore resta libero di significare la sezione o l'esito (UX-DR10).
- Voce dell'interfaccia: italiano, frase minuscola, voce attiva. Niente punti esclamativi, niente emoji, niente incoraggiamenti (UX-DR13).
- Stato vuoto: dice cosa manca e offre il pulsante che lo crea. Mai "nessun risultato trovato" (UX-DR11).
- Errori: dicono cosa fare, non cosa è successo nello stack. Il dettaglio tecnico resta nei log del server, e nei log non finiscono mai dati di clienti (NFR15, `kb-0.md` §3).
- Nessun esadecimale fuori da `globals.css` (UX-DR16).

### Test

Non esiste ancora un comando che esegua i test: **introdurlo è la Story 1.6**, non questa. Qui l'unico obbligo è che `validateClientName` sia una funzione pura ed esportata, senza dipendenze, così che 1.6 possa metterci un test sopra senza riscriverla.

Verifica di questa story = prova a mano sul percorso reale, Task 6. Il codice si considera non funzionante finché non lo si è visto funzionare (`kb-0.md` §7).

### Project Structure Notes

Struttura confermata, nessuna variante:

```
src/app/(app)/clienti/
├── page.tsx          elenco (modificato)
├── loading.tsx       scheletri elenco (invariato)
├── actions.ts        NUOVO — azioni server condivise dalle story 1.x
├── nuovo/
│   ├── page.tsx      NUOVO — guscio della schermata
│   └── new-client-form.tsx  NUOVO — form client
└── [id]/
    ├── page.tsx      NUOVO — scheda in sola lettura
    └── loading.tsx   NUOVO — scheletri scheda
```

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Nomi in inglese nel codice, in italiano nell'interfaccia — le rotte sono in italiano perché sono interfaccia (`/clienti`, `/nuovo`), coerenti con quelle già in piedi.

Nessuna dipendenza nuova. In particolare **niente libreria di validazione**: la regola è una riga.

### Intelligence dai commit

`57a0a01` (impalcatura) fissa le convenzioni che questa story eredita:
- Commenti solo dove il codice non si spiega: il *perché* di una scelta strana, mai la ripetizione di quello che il codice già dice. Vedere `src/lib/supabase/env.ts:6-9` e `src/components/status-pill.tsx:1-5` come misura giusta.
- I commenti citano il documento che li giustifica (`design-system.md` §6, D14): stessa abitudine qui.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché.
- Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.1: Creare un cliente col solo nome]
- Requisito FR1, campi del cliente, obbligatorietà: [Source: docs/prd-v1.md#3. Entità e campi]
- Schema, vincoli, indici, policy: [Source: docs/database.md#3. Tabelle] e [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Token, pulsanti, stati vuoti, voce: [Source: docs/design-system.md#2. Colore], [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#6. I quattro stati di ogni schermata], [Source: docs/design-system.md#7. Voce dell'interfaccia]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica]
- Decisioni: D13 (nome unico obbligatorio, valore non rilevato mai zero), D14 (nessuno stato blocca), D9 (`owner_id` e RLS dal primo giorno), D20 (piattaforma e variante A) — [Source: docs/00-contesto-e-decisioni.md]
- Piattaforma e proxy: [Source: docs/guide-for-vercel-supabase.md#4. Regole sul database], [Source: AGENTS.md#Comandi]
- Server Actions, `useActionState`, `redirect` fuori da `try/catch`, `revalidatePath` prima del redirect: [Source: https://nextjs.org/docs/app/api-reference/functions/redirect], [Source: https://nextjs.org/docs/app/getting-started/error-handling]

## Dev Agent Record

### Agent Model Used

claude-opus-5

### Debug Log References

**Cache di build che rompe il server di sviluppo.** Dopo `npm run build`, `next dev` fallisce con
`Could not find the module ... in the React Client Manifest` su file mai toccati (`access-form.tsx`,
`global-error.js`). Non è un difetto del codice: è `.next` scritto dal build di produzione e riletto
da Turbopack in sviluppo. Si risolve con `rm -rf .next` prima di riavviare `npm run dev`. Da tenere
presente ogni volta che si eseguono build e dev nella stessa sessione.

**Verifica che il tipo della query non fosse `any`.** `typecheck` passa anche quando Supabase degrada
il risultato a `any`, quindi non prova niente da solo. Introdotto di proposito `client.sectorInesistente`:
`tsc` ha risposto `Property 'sectorInesistente' does not exist on type 'ClientDetail'`, poi ripristinato.
Il tipo è reale.

### Completion Notes List

**Implementato (Task 1-5)**

- Validazione pura ed esportata, stessa condizione del vincolo sulla tabella.
- Server Action `createClientRecord` in `clienti/actions.ts`: sessione dal server, validazione,
  insert col solo `name` e `owner_id`, `revalidatePath`, `redirect` fuori da ogni `try/catch`.
- Modulo su `/clienti/nuovo`, campo unico, errore in `.error-box` con `role="alert"`.
- Stato vuoto dell'elenco con il pulsante che porta al modulo; pulsante `Nuovo cliente` in
  intestazione quando l'elenco è pieno. Mai i due insieme.
- Scheda cliente in sola lettura su `/clienti/[id]`, con `loading.tsx`, stato d'errore e `notFound()`.

**Tre scelte diverse da come le prescriveva il file di story, con il motivo**

1. **Niente `required` sull'input** (Task 3 lo prevedeva). Con `required` il caso "campo vuoto" viene
   rifiutato dal browser, con il messaggio nativo e nella lingua del browser: viola UX-DR13 e la
   richiesta di AC3 che il messaggio dica cosa fare. Senza, vuoto e soli spazi arrivano entrambi
   all'azione e producono la stessa frase nostra.
2. **Campo controllato con `useState`.** Con un form action React ripulisce i campi non controllati a
   fine invio: un nome rifiutato sparirebbe insieme all'errore, contro `kb-0.md` §6, il lavoro
   dell'utente non si perde mai. Stesso schema già usato in `access-form.tsx`.
3. **Nome del cliente collegato alla sua scheda nell'elenco.** Non era fra i task. Senza, la scheda
   creata da Task 5 è raggiungibile solo nei secondi successivi alla creazione, e la Story 1.2
   ("apro la sua scheda") partirebbe da una funzione irraggiungibile. Aggiunto anche il minimo di
   44px di altezza sul collegamento, perché un bersaglio più basso violerebbe UX-DR14.

**Aggiunte a `globals.css`**: `.page-header__actions`, `.display-title` (il `--t-display` che mancava),
`.form`, `.form__actions`, `.detail-identity`, `.detail-grid`, `.detail__value`, `.table__name a`.
Nessun valore esadecimale: solo token e misure.

**Dettaglio su AC4.** `employees` a `null` resta vuoto, ma uno zero dichiarato resta `0`: il vincolo
sulla tabella ammette `>= 0`, quindi "zero dipendenti" è un dato vero e diverso da "non lo so".
Reso con `client.employees === null ? null : String(client.employees)`, mai con `??` o `||`, che
schiaccerebbero i due casi.

**Chi ha verificato cosa (Task 6).** Il percorso reale richiede una sessione, e la sessione arriva da
un collegamento inviato all'email di Luca: non è una cosa che poteva fare l'agente. Verificato
dall'agente quello che non richiede accesso: `typecheck` pulito, `build` pulito con tutte e tre le
rotte generate, proxy che reindirizza `/clienti` e `/clienti/nuovo` a `/accedi`, nessun errore in
console, tipo della query provato reale e non `any`. **Il percorso con accesso è stato provato a mano
da Luca il 2 agosto 2026 e funziona.**

**Nessun test automatico.** Non esiste ancora un comando che li esegua, e introdurlo è la Story 1.6:
farlo qui sarebbe una dipendenza nuova fuori dal perimetro. `validateClientName` è pura, senza
dipendenze ed esportata proprio perché 1.6 possa metterci un test sopra senza riscriverla.

**Rifinitura lasciata aperta di proposito.** Un id inesistente porta alla pagina 404 predefinita di
Next: inglese e fuori dal design system. Fuori dai task di questa story, e la Story 1.2 possiede gli
stati della scheda. Si chiude con un `not-found.tsx` di una dozzina di righe quando si decide di farlo.

### File List

**Nuovi**

- `src/lib/validate-client-name.ts`
- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/nuovo/page.tsx`
- `src/app/(app)/clienti/nuovo/new-client-form.tsx`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`
- `.claude/launch.json`

**Modificati**

- `src/app/(app)/clienti/page.tsx`
- `src/app/globals.css`
- `docs/bmad/implementazione/sprint-status.yaml`

## Change Log

| Data | Cosa |
|---|---|
| 2 agosto 2026 | Creazione del cliente col solo nome: validazione, Server Action, modulo, stato vuoto che porta al modulo, scheda in sola lettura. Task 1-5 chiusi, Task 6 aperto in attesa della prova a mano con accesso. |
