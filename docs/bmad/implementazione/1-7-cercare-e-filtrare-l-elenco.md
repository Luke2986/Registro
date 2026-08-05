---
baseline_commit: 4ac1646
---

# Story 1.7: Cercare e filtrare l'elenco

Status: in-progress

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 4 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want restringere l'elenco per nome, stato e tag,
so that trovo un cliente in pochi secondi anche quando ce ne sono duecento.

## Acceptance Criteria

**AC1 — la ricerca per nome passa dall'indice, non dalla memoria**
**Given** l'elenco con più clienti
**When** scrivo una parte di un nome nella ricerca
**Then** vedo solo i clienti che corrispondono, sfruttando l'indice trigram già creato

**AC2 — il filtro per stato**
**Given** l'elenco
**When** scelgo uno stato nel filtro
**Then** vedo solo i clienti in quello stato (FR10)

**AC3 — il filtro per tag passa dall'indice gin**
**Given** l'elenco
**When** scelgo un tag nel filtro
**Then** vedo solo i clienti che hanno quel tag, sfruttando l'indice gin già creato

**AC4 — lo stato vuoto di un filtro non è lo stato vuoto di un archivio vuoto**
**Given** una ricerca o un filtro che non trova nulla
**When** guardo la schermata
**Then** lo stato vuoto dice che nessun cliente corrisponde a questo filtro, non "nessun risultato trovato", e offre di azzerare i filtri (UX-DR11)

**AC5 — la tabella resta quella che è**
**Given** la tabella dell'elenco
**When** la guardo
**Then** le colonne sono nell'ordine nome, stato, tag, ultima attività, con righe alte 56 e nessuna griglia (UX-DR4)

> AC5 **non è lavoro nuovo**: la tabella è in piedi dalla Story 1.1 e l'ultima attività dalla 1.6. È una verifica di non regressione, ed è la ragione per cui questa story aggiunge una barra **sopra** la tabella e non riscrive la tabella.

## Tasks / Subtasks

- [ ] **Task 1 — Il modulo puro dei filtri** (AC: 1, 2, 3, 4)
  - [x] Creare `src/lib/client-filters.ts`. **Nessun import di React né di Supabase**: è il patto già in piedi con `client-fields.ts`, `client-status.ts`, `client-tags.ts`, `person-fields.ts`, `decision-roles.ts`, `last-activity.ts`, ed è la condizione per cui Task 6 può metterci un test sopra senza impalcature.
  - [x] **Non si riscrive niente che esista già.** Il modulo importa e riusa: `isClientStatus` e `ClientStatus` da `client-status.ts`, `normalizeTag` e `CLIENT_TAG_MAX_LENGTH` da `client-tags.ts`, `INVISIBLE` e `CLIENT_NAME_MAX_LENGTH` da `validate-client-name.ts`. Una seconda copia di una qualsiasi di queste regole si allontanerebbe dalla prima alla prima riscrittura (`kb-0.md` §9).
  - [x] I nomi dei parametri dell'indirizzo in una costante sola, letta sia dalla pagina sia dal modulo, sia dai `name=` del form. Se stanno in due posti, il giorno che uno cambia il form smette in silenzio di filtrare:

    ```ts
    export const FILTER_PARAMS = { name: 'nome', status: 'stato', tag: 'tag' } as const
    ```

    In italiano come le rotte (`/clienti`, `/clienti/nuovo`, `/accedi`): l'indirizzo è interfaccia, e `kb-0.md` §2 mette l'inglese nel codice, non in quello che si legge nella barra del browser.
  - [x] La forma del risultato. Stringa vuota e `null` vogliono dire «nessun filtro», e sono l'unica rappresentazione dell'assenza: nessun campo opzionale, così non esistono combinazioni impossibili.

    ```ts
    export type ClientFilters = {
      name: string              // '' = nessun filtro
      status: ClientStatus | null
      tag: string               // '' = nessun filtro
    }
    ```

  - [x] `parseClientFilters(params: Record<string, string | string[] | undefined>): ClientFilters`
    - Un parametro ripetuto (`?stato=attivo&stato=perso`) arriva come `string[]`: si prende **il primo**, mai l'array. Senza, `.eq('status', …)` riceverebbe un array e la query verrebbe rifiutata da PostgREST, cioè un indirizzo storpiato produrrebbe la schermata d'errore. Con `noUncheckedIndexedAccess` attivo, `value[0]` è `| undefined` e va gestito, **mai con un `as`**.
    - `name`: `INVISIBLE` tolti, spazi compressi, `trim()`. Se supera `CLIENT_NAME_MAX_LENGTH` si taglia a quella lunghezza: la colonna non contiene nomi più lunghi, quindi il risultato non cambia, e la richiesta resta di dimensione dichiarata (`kb-0.md` §3, ogni input si valida sul server).
    - `status`: `isClientStatus(value) ? value : null`. Uno stato che non esiste **non è un errore e non ferma niente**: vale nessun filtro, e il selettore torna su `Tutti`. È la stessa scelta di `StatusPill` (`status-pill.tsx:27`), che su uno stato ignoto rende neutro invece di far cadere la pagina.
    - `tag`: `normalizeTag(value)`, e `''` se supera `CLIENT_TAG_MAX_LENGTH`. I tag sono salvati già normalizzati (Story 1.4): confrontare un valore non normalizzato vorrebbe dire non trovare mai `Referral`.
  - [x] `hasActiveFilters(filters: ClientFilters): boolean` — vero se almeno uno dei tre è valorizzato. Lo leggono tre punti della pagina (l'intestazione, lo stato vuoto, la barra), e ricavarlo tre volte è il modo in cui due dei tre finiscono per non essere d'accordo.
  - [x] `filtersHref(filters: ClientFilters): string` — l'indirizzo canonico dei filtri correnti, `/clienti` quando non ce n'è nessuno. Serve a `retryHref` dello stato d'errore: `Riprova` deve rifare **la stessa vista**, non riportare all'elenco intero. I parametri si accodano in ordine fisso (nome, stato, tag) e solo se valorizzati, così l'indirizzo è deterministico e verificabile da un test.
  - [x] `likePattern(term: string): string` — il modello per `ilike`, con i jolly di chi cerca resi letterali:

    ```ts
    export function likePattern(term: string): string {
      return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
    }
    ```

    Senza l'escape, un `%` battuto nel campo diventa un jolly e la ricerca risponde righe che non contengono quello che è stato scritto: un difetto che non produce un errore, produce un elenco sbagliato. `\\` per primo nella classe di caratteri, altrimenti si sfugge la barra che si è appena aggiunta.
  - [ ] **`*` resta un jolly e non si può proteggere.** PostgREST dichiara `*` come alias di `%` nei modelli di `like`/`ilike`, e la conversione avviene prima che il valore arrivi a SQL: sfuggirlo con una barra produrrebbe `\%`, cioè un `%` letterale, non un `*`. Va **verificato in sviluppo** e scritto nel Dev Agent Record: se in questa versione la conversione non avviene, la riga di commento cambia e il codice no. Non si dà per verificato quello che non si è visto (`kb-0.md` §1).
  - [x] Il file resta sotto le 200 righe (`kb-0.md` §2). Se cresce oltre, dentro c'è più di una cosa.

- [x] **Task 2 — L'elenco filtra nel database** (AC: 1, 2, 3)
  - [x] `src/app/(app)/clienti/page.tsx`. La pagina riceve i parametri, che in Next 16 sono una promessa:

    ```ts
    export default async function ClientsPage({
      searchParams,
    }: {
      searchParams: Promise<Record<string, string | string[] | undefined>>
    }) {
      const filters = parseClientFilters(await searchParams)
    ```

    `await` obbligatorio: `params` e `searchParams` sono asincroni da Next 15 e in 16 non esiste più la forma sincrona. Stesso schema di `[id]/page.tsx:31-32`, che già attende `params`.
  - [x] I filtri si applicano **alla query**, mai all'array in memoria. È il merito di AC1 e AC3, che nominano i due indici: `clients_name_trgm_idx` (gin, `gin_trgm_ops`) e `clients_tags_idx` (gin), entrambi creati in `0002_clients.sql:28-29`. Filtrare dopo la lettura li lascerebbe inutilizzati e leggerebbe comunque tutte le righe.

    ```ts
    let query = supabase
      .from('clients')
      .select('id, name, status, tags, updated_at, assessments(updated_at)')

    if (filters.name) query = query.ilike('name', likePattern(filters.name))
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.tag) query = query.contains('tags', [filters.tag])

    const { data, error } = await query.order('updated_at', { ascending: false })
    ```

  - [x] **La `select` non cambia, e in particolare non diventa `assessments!inner(...)`.** Con `!inner` l'innesto diventa un join interno e fa sparire ogni cliente senza schede, che oggi sono tutti: è il modo esatto in cui la Story 1.6 falliva, e riscrivere questa riga è l'occasione per reintrodurlo.
  - [x] `.contains('tags', [tag])` e non `.eq`: la colonna è `text[]`, e `cs.{…}` è l'operatore che usa l'indice gin. Funziona perché nessun tag contiene virgole — lo vieta `parseTag` (`client-tags.ts:63`) proprio per non far leggere `referral, urgente` come due cose. Se un giorno quel divieto cadesse, `cs.{a,b}` diventerebbe due elementi e il filtro cambierebbe significato in silenzio.
  - [x] `.ilike` e non `.like`: il nome si cerca senza distinzione fra maiuscole e minuscole, ed è quello che una persona si aspetta scrivendo due lettere. L'indice trigram serve entrambi.
  - [x] **L'ordinamento della Story 1.6 resta intatto:** `const rows = data ? [...data].sort(byLastActivityDesc) : null`. Nessuna riga di `last-activity.ts` si apre, il `.order('updated_at')` sul database resta dov'è, e la cella continua a rendere `formatLastActivity(lastActivityAt(row))`. Filtrare cambia *quali* righe arrivano, non come si ordinano.
  - [x] `ClientListRow` non cambia: le colonne sono le stesse.
  - [x] Nessuna azione nuova, nessun `revalidatePath`: un filtro è una lettura. `actions.ts` non si apre.

- [x] **Task 3 — L'elenco dei tag da offrire, che non dipende dal filtro** (AC: 3)
  - [x] Il selettore dei tag si costruisce su **tutti** i tag in uso, non su quelli delle righe filtrate. Ricavarli da `rows` è la trappola centrale di questo task: scegli `referral`, l'elenco si restringe ai clienti con quel tag, il menu si ricostruisce sui soli tag di quelle righe e da lì non si può più scegliere un tag diverso né tornare indietro. Il filtro si chiuderebbe dietro di sé.
  - [x] Serve quindi una seconda lettura, non filtrata, con lo stesso schema già in piedi in `[id]/page.tsx:77`:

    ```ts
    const { data: tagRows, error: tagsError } = await supabase.from('clients').select('tags')
    ```

    e `collectTagSuggestions(tagRows ?? [])` da `client-tags.ts`, **che esiste già e non si riscrive**: appiattisce, toglie i doppioni e ordina con la collazione italiana.
  - [x] Un errore su questa lettura **non fa cadere la schermata**: si registra in console con `code` e `message` soltanto — mai `details`, che conterrebbe valori delle righe (`kb-0.md` §3) — e si va avanti con l'elenco vuoto. È esattamente il trattamento che la scheda cliente dà allo stesso errore (`[id]/page.tsx:79-86`): un filtro che non si può offrire è un aiuto che manca, non un guasto dell'elenco.
  - [x] **Questa query non ha `.limit()`, e la voce di `deferred-work.md` che lo dice resta aperta.** Vedi Task 7: la si annota, non la si chiude.

- [x] **Task 4 — La barra dei filtri** (AC: 1, 2, 3, 4)
  - [x] Creare `src/app/(app)/clienti/filters-form.tsx`. **Componente server, nessun `'use client'`**: è un `<form method="get" action="/clienti">`, e il browser costruisce l'indirizzo dai `name=` dei campi. Nessuno stato, nessun effetto, nessuna dipendenza. L'indirizzo *è* lo stato: ricaricare, tornare indietro e mettere fra i preferiti funzionano senza scrivere una riga per farli funzionare.
  - [x] La firma, tre proprietà e nessuna in più:

    ```ts
    { filters: ClientFilters; tags: string[]; showReset: boolean }
    ```

    `showReset` arriva dalla pagina e non si deduce qui: il componente non sa quante righe ha trovato la query, e indovinarlo vorrebbe dire passargli anche quelle.
  - [x] Ogni campo ha un `id` suo e la sua `<label htmlFor>`: tre `id` distinti, sulla stessa schermata di `[id]` mai — questa pagina non ne ha altri — ma la regola è che un'etichetta senza `htmlFor` non è un'etichetta.
  - [x] `role="search"` sul form: con tre controlli che restringono un elenco, è il punto di riferimento che una tecnologia assistiva cerca.
  - [x] Tre campi, ciascuno con **una etichetta vera e non solo un segnaposto** (UX-DR14, `design-system.md` §8):
    - `Nome` — `<input type="search" className="input" name={FILTER_PARAMS.name} defaultValue={filters.name} autoComplete="off" />`. `type="search"` e non `text`: è quello che è, e su molti browser porta con sé il gesto nativo che lo svuota.
    - `Stato` — `<select className="input select">` con una prima opzione `value=""` etichettata `Tutti`, poi le cinque di `CLIENT_STATUSES`. L'elenco si mappa da quella costante, **non si riscrive a mano**: il giorno che uno stato entra nel vincolo, entra anche qui.
    - `Tag` — stesso schema, `value=""` etichettata `Tutti`, poi i tag di Task 3. Se non ce n'è nessuno il campo **non si rende**: un selettore con una sola voce che dice `Tutti` è un controllo che non fa niente.
  - [x] `defaultValue` e non `value`: sono campi non controllati dentro un componente server, e il valore corrente arriva dai parametri già letti.
  - [x] `maxLength` sul campo nome: **no.** È la voce già rimandata in `deferred-work.md` («`maxLength` tronca l'incolla in silenzio»), e qui non c'è nemmeno un messaggio da mostrare: il taglio lo fa `parseClientFilters` e non cambia il risultato. Non si aggiunge un terzo posto a un difetto che si chiuderà in una passata sola.
  - [x] Un `Filtra` in `btn btn--secondary`. **Non primario:** l'unica azione primaria della schermata è `Nuovo cliente` (UX-DR10).
  - [x] `Azzera i filtri` come `<Link href="/clienti">` in `btn btn--quiet`, la variante *discreta* di `design-system.md` §5 — nessun fondo, testo `--ink-muted` — che il progetto non ha ancora e che Task 5 aggiunge in quattro righe.
  - [x] **`Azzera i filtri` compare una volta sola su tutta la schermata.** Quando il filtro non trova niente vive nello stato vuoto, che AC4 obbliga a offrirlo; in tutti gli altri casi vive nella barra. Il componente lo decide da una proprietà che gli passa la pagina, non indovinandolo: due pulsanti identici a sessanta pixel di distanza sono rumore, e nessuno dei due è l'azione giusta.
  - [x] La barra si rende **sempre**, anche nel ramo d'errore e anche quando l'elenco è vuoto per un filtro: è il controllo che toglie il filtro, e perderlo insieme ai risultati vuol dire restare bloccati dentro una vista che non si può più cambiare. Sta dentro la card, sopra la tabella, e non entra in nessuno dei rami condizionali.

- [x] **Task 5 — I quattro stati, e i due vuoti che sono due** (AC: 4, 5)
  - [x] **Pieno:** la tabella di oggi, invariata. Colonne nome, stato, tag, ultima attività; righe a 56; nessuna griglia (AC5). `ClientsTable` non si tocca.
  - [x] **Vuoto senza filtri:** quello di oggi, invariato. `Nessun cliente ancora.` e `Crea il primo cliente` in `btn btn--primary`.
  - [x] **Vuoto con filtri:** nuovo. `Nessun cliente corrisponde a questo filtro.` e `Azzera i filtri`. Il testo di AC4 è esplicito su quello che **non** va scritto: mai `nessun risultato trovato`. Frase minuscola, voce attiva, nessun punto esclamativo (UX-DR13).
  - [x] **In errore:** `ErrorState` come oggi, ma con `retryHref={filtersHref(filters)}` invece di `/clienti` fisso: `Riprova` deve rifare la vista che ha fallito, non riportare all'elenco intero — che, per giunta, sarebbe indistinguibile da `Azzera i filtri`. *(Che cosa faccia davvero un `Riprova` verso la rotta su cui si è già è una voce aperta in `deferred-work.md` da due story: non si chiude qui, ma nemmeno si peggiora dandogli l'indirizzo sbagliato.)*
  - [x] **In caricamento:** `loading.tsx` si allarga con uno scheletro della barra dei filtri sopra quelli delle righe. Senza, a ogni filtro la barra sparisce e ricompare, e la pagina salta di 60px sotto le dita di chi ha appena cliccato. Gli scheletri restano della forma reale del contenuto, mai un cerchio che gira (`design-system.md` §6).
  - [x] **L'intestazione non lascia vicoli ciechi.** Oggi il conteggio e `Nuovo cliente` compaiono solo con `rows.length > 0`: con un filtro che non trova niente sparirebbero, e dalla schermata non si potrebbe più creare un cliente. La condizione diventa `rows && (rows.length > 0 || hasActiveFilters(filters))`. Il conteggio resta legato a `rows.length > 0`: uno `0` accanto a uno stato vuoto che dice già la stessa cosa è una ripetizione.
  - [x] Con l'intestazione visibile e lo stato vuoto filtrato, sulla schermata c'è **una sola azione primaria** (`Nuovo cliente`), perché `Azzera i filtri` è discreto (UX-DR10). Nel vuoto senza filtri l'intestazione non c'è e la primaria è `Crea il primo cliente`. Verificare che non ce ne siano mai due.
  - [x] `src/app/globals.css` — l'unica sezione nuova, e sta accanto a quella dell'elenco:

    ```css
    /* elenco: ricerca e filtri */

    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    ```

    più `flex: 1 1 160px; min-width: 0` sui campi dentro la barra, e `flex-shrink: 0` sui due comandi. `min-width: 0` per la stessa ragione già scritta su `.detail-grid > *`: senza, un campo non scende sotto il proprio contenuto e a 375px la card scorre di lato.
  - [x] `.btn--quiet`: `background: none; color: var(--ink-muted);`. Quattro righe, accanto agli altri tre modificatori di `.btn`.
  - [x] **Nessun valore esadecimale, nessun numero fuori dalla scala di 4** (`design-system.md` §10, §4). I 12 e i 20 di sopra sono quelli che il resto del file usa già.
  - [x] `align-items: flex-end` perché `.input` è alto 44 e `.btn` 40: la differenza è la voce già rimandata alla Story 5.2, e allineare in basso è quello che `.tags-add` fa già per lo stesso motivo.

- [x] **Task 6 — I test del modulo dei filtri** (AC: 1, 2, 3, 4)
  - [x] `src/lib/client-filters.test.ts`, accanto al modulo che prova, con `node:test` e `node:assert/strict`, import con estensione `.ts`. Il comando esiste dalla Story 1.6 e non si tocca: `npm test` gira già con `TZ=UTC`.
  - [x] È la logica che `kb-0.md` §7 chiede di mettere sotto test, e per il motivo esatto che il file elenca: rompendosi **non produce un errore, produce un elenco sbagliato**. Uno stato letto male mostra i clienti di un altro stato senza che niente lo segnali.
  - [x] `parseClientFilters`:
    - oggetto vuoto → i tre filtri assenti
    - stringhe vuote (`?nome=&stato=&tag=`, che è quello che manda il form quando non si compila niente) → i tre filtri assenti
    - valore ripetuto (`string[]`) → si prende il primo
    - array vuoto → nessun filtro, e nessuna eccezione
    - stato ignoto (`?stato=pippo`) → `null`, non un errore
    - stato valido → conservato
    - tag in maiuscolo e con spazi ai bordi → normalizzato in minuscolo e ripulito
    - tag oltre il limite → ignorato
    - nome con caratteri invisibili e spazi doppi → ripulito e compresso
    - nome oltre `CLIENT_NAME_MAX_LENGTH` → tagliato a quella lunghezza
  - [x] `likePattern`:
    - un termine normale → `%termine%`
    - `%` e `_` battuti da chi cerca → resi letterali con la barra
    - una barra battuta → raddoppiata, e non trasformata in un escape di quello che segue
  - [x] `hasActiveFilters`: falso sui tre assenti, vero su ciascuno dei tre da solo.
  - [x] `filtersHref`: `/clienti` senza filtri; con i filtri, i parametri nell'ordine fisso, codificati, e solo quelli valorizzati.
  - [x] **Un test che non è stato visto fallire quando doveva non è un test** (`kb-0.md` §7). Prima di chiudere: rompere di proposito l'escape di `likePattern` e il ramo dello stato ignoto, verificare che i test se ne accorgano, ripristinare. Da scrivere nel Dev Agent Record, come ha fatto la Story 1.6.

- [x] **Task 7 — La voce rimandata che questa story tocca** (nessuna AC: è metodo)
  - [x] `deferred-work.md`, voce del 3 agosto *«La query dei suggerimenti non ha `.limit()` e PostgREST tronca in silenzio»*, che si chiude con *«Da riprendere se i clienti superano il migliaio, o insieme alla Story 1.7 che tocca comunque i tag»*. Questa è quella story, e **non la chiude**: la strada vera resta la migrazione con `unnest` che l'Epic 1 dichiara di non portare.
  - [x] Quello che cambia è che ora lo stesso schema esiste in **due** punti, e il secondo è la schermata iniziale. La voce va aggiornata con il secondo riferimento (`src/app/(app)/clienti/page.tsx`) e con la conseguenza: al tetto di righe di PostgREST il selettore dei tag offre un elenco incompleto, quindi un tag esistente diventa non filtrabile e niente lo dice.
  - [x] Una riga, in un file che esiste apposta. Nessun'altra voce di `deferred-work.md` viene chiusa da questa story.

- [ ] **Task 8 — La verifica a mano** (AC: 1, 2, 3, 4, 5)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as` aggiunto.
  - [x] `npm run build` passa.
  - [x] `npm test` passa, e il nuovo file di test esiste dove dice Task 6. I 22 test della Story 1.6 continuano a passare.
  - [x] `client-filters.ts` non importa né React né Supabase.
  - [x] `page.tsx` resta sotto le 200 righe; `filters-form.tsx` e `client-filters.ts` pure.
  - [x] La `select` **non** contiene `!inner`, e la riga dell'ordinamento in memoria è identica a quella della Story 1.6.
  - [x] `globals.css` non contiene nessun valore esadecimale nuovo.
  - [ ] Nessun file fuori dall'elenco di «Cosa cambia questa story» è stato aperto, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`), che vanno dichiarate nel File List.

  Richiede una sessione, la fa Luca:
  - [ ] Scrivo una parte di un nome e premo Invio: restano solo i clienti che corrispondono, e l'indirizzo del browser lo dice (AC1).
  - [ ] Cerco in minuscolo un nome scritto in maiuscolo: lo trovo lo stesso.
  - [ ] Scelgo uno stato: restano solo i clienti in quello stato (AC2).
  - [ ] Scelgo un tag: restano solo i clienti che ce l'hanno, e **il menu dei tag continua a offrirli tutti**, non solo quelli rimasti (AC3).
  - [ ] Combino nome, stato e tag: i tre si sommano.
  - [ ] Filtro qualcosa che non esiste: leggo `Nessun cliente corrisponde a questo filtro.`, ho un modo di azzerare, e `Nuovo cliente` è ancora lì (AC4).
  - [ ] Azzero: torno all'elenco intero, ordinato per ultima attività come prima (AC5, non regressione della 1.6).
  - [ ] Ricarico la pagina con i filtri attivi: li ritrovo. Torno indietro col tasto del browser: torno alla vista precedente.
  - [ ] Batto un `%` nel campo nome: non diventa un jolly, e l'elenco non risponde tutto.
  - [ ] I quattro stati reggono: pieno, vuoto senza filtri, in caricamento (la barra **non** sparisce e la pagina non salta), in errore.
  - [ ] Larghezza 375px: la barra va a capo, i bersagli restano toccabili e la tabella non scorre di lato.
  - [ ] Da tastiera: Tab entra nei tre campi, ognuno ha la sua etichetta, il focus si vede, Invio nel campo nome filtra.
  - [ ] Nessun errore in console, nessun avviso di idratazione.

### Review Findings

Revisione del 5 agosto 2026, tre strati in parallelo: Blind Hunter e Edge Case Hunter senza il testo di questa story, Acceptance Auditor con. Le verifiche meccaniche della story reggono tutte (`typecheck`, `build`, 43 test verdi, conteggi di riga, nessun `any`, `select` invariata): i rilievi sono di comportamento, ed è il motivo per cui nessuno dei tre comandi li intercetta.

**Decise in revisione il 5 agosto 2026, da Claude su delega di Luca**

- [x] [Review][Patch] **I tag con `"`, `{`, `}` o `\` sono salvabili e rompono la query del filtro → si vietano, in due punti** [src/lib/client-tags.ts:63, src/lib/client-filters.ts:72] — `parseTag` rifiuta solo il vuoto, la virgola e i 40 caratteri (`client-tags.ts:63`, `:69`), quindi `dell"anno` e `a}b` sono tag validi, salvati e offerti dal selettore. `postgrest-js` serializza `` `cs.{${value.join(',')}}` `` senza virgolettare gli elementi (`@supabase/postgrest-js/dist/index.mjs:1642`): sceglierli dal menu produce un letterale di array malformato, PostgREST risponde 400 e la schermata cade in errore con un messaggio falso, «La connessione al database non ha risposto». `Riprova` usa `filtersHref(filters)` e ricostruisce lo stesso indirizzo che fallisce, quindi non può mai riuscire. Verificato per esecuzione, non per lettura. Il commento a `page.tsx:61-63` — «Regge perché nessun tag contiene virgole — lo vieta `parseTag`» — copre un metacarattere su cinque, ed è attaccato al percorso sbagliato: `parseTag` è la scrittura, il filtro passa da `normalizeTag`, che le virgole non le tocca. Dalla barra dell'indirizzo lo stesso buco dà `?tag=a,b` → `cs.{a,b}`, cioè «ha entrambi i tag», il filtro multiplo che il perimetro esclude.

  **Scelta: vietare i metacaratteri, non virgolettare il letterale.** L'alternativa — comporre a mano il letterale virgolettato e passarlo come stringa a `.contains` — è più elegante e non restringe niente, ma vorrebbe dire scrivere un quoter di letterali Postgres e spedirlo senza poterlo provare, perché l'anteprima si ferma a `/accedi` e PostgREST non è esercitabile da qui. Sarebbe un secondo `*`: una cosa dichiarata e mai vista girare. Vietarli invece si verifica per intero nel modulo puro, con un test e senza database. E non è una restrizione nuova: `parseTag` vieta già la virgola, nello stesso file e per la stessa ragione — un carattere che cambia come il valore viene letto a valle non appartiene a un'etichetta. D17 dice che i tag sono liberi nel senso di «nessun vocabolario chiuso», non «qualsiasi sequenza di byte». La guardia va in due punti, perché `parseTag` ferma solo i nuovi: `parseTagFilter` ferma quelli che arrivano dall'indirizzo e quelli già salvati.

  **Residuo accettato:** un tag storto già in colonna resta visibile nella riga e rimovibile (`removeClientTag` non normalizza di proposito), ma sceglierlo dal menu non filtra invece di dare errore. Un no-op silenzioso al posto di una schermata d'errore, su un caso che richiede un tag già scritto con quei caratteri.

- [x] [Review][Patch] **`*` resta un jolly nella ricerca per nome → resta, con un test che lo fissa e un commento che non finge** [src/lib/client-filters.ts:133] — il docblock lo dichiara e la domanda 4 lo ha chiuso col default, ma non c'è né una guardia né un test: `?nome=*` risponde tutti i clienti e `a*b` risponde `axxxb`.

  **Scelta: non si tocca il termine.** La conversione non è verificabile da qui, quindi la scelta va retta sotto entrambe le ipotesi. Lasciare il `*` produce un falso positivo, ed è visibile: il campo mostra `*` accanto a duecento righe. Toglierlo produce un falso negativo: un cliente `5*5` cercato per nome non si trova, e nessuno se ne accorge. Le Dev Notes di questa story dicono già quale dei due è il peggiore — «non trovare un cliente che esiste, un difetto che non produce nessun errore e che si scopre solo cercando qualcosa che si sa esserci» — e il `*` battuto in un campo di ricerca è un caso raro, mentre un carattere cancellato in silenzio vale per ogni ricerca futura. Quello che cambia: il commento smette di far sembrare capito un comportamento solo letto, e un test fissa quello che `likePattern` fa davvero al `*`, così il giorno che la verifica di sessione lo smentisce il test è il posto dove si vede.

**Da correggere**

- [x] [Review][Patch] I due `<select>` non si risincronizzano su navigazione client: dopo `Azzera i filtri` continuano a mostrare i filtri tolti, e il `Filtra` successivo li rimette [src/app/(app)/clienti/filters-form.tsx:65, :87]
- [x] [Review][Patch] La ricerca comprime gli spazi interni ma la scrittura del nome no: un cliente salvato come `Mario␣␣Rossi` non si trova nemmeno copiandone il nome dall'elenco, e un test verde fissa il comportamento sbagliato [src/lib/client-filters.ts:60]
- [x] [Review][Patch] Il campo Tag non renduto porta via il filtro attivo alla submit successiva, e nel frattempo niente a schermo dice che il filtro c'è [src/app/(app)/clienti/filters-form.tsx:78]
- [x] [Review][Patch] Lo scheletro della barra è alto 44 dove la barra vera è 70 (`label` 18 + `gap` 8 + `input` 44): la pagina salta di 26px, cioè quello che il commento dichiara di voler evitare [src/app/(app)/clienti/loading.tsx:17-22]
- [x] [Review][Patch] `Nuovo cliente` sparisce nello stato d'errore: la stessa perdita che il commento a `:116-118` dichiara inaccettabile, chiusa per il filtro e lasciata aperta per l'errore [src/app/(app)/clienti/page.tsx:120]
- [x] [Review][Patch] La lettura dei tag non ha `.order()`: al tetto di righe la finestra non è definita da nessun criterio e il menu può cambiare da un caricamento all'altro [src/app/(app)/clienti/page.tsx:75]
- [x] [Review][Patch] Lo stato vuoto del filtro copre anche l'archivio vuoto: su un archivio nuovo `/clienti?stato=attivo` mostra `Azzera i filtri` invece di `Crea il primo cliente` [src/app/(app)/clienti/page.tsx:110]
- [x] [Review][Patch] `.btn--quiet` non ha stato di passaggio né di fuoco, e `Azzera i filtri` è un `<Link>`: accanto a un `Filtra` bordato non si legge come un comando [src/app/globals.css:423]
- [x] [Review][Patch] La convenzione `.ts` sugli import non è scritta da nessuna parte e la voce di `deferred-work.md` che la denuncia parla ancora di «due file di test» [src/lib/client-tags.ts:1]

**Rimandato**

- [x] [Review][Defer] Le due letture del database sono attese in serie invece che in parallelo [src/app/(app)/clienti/page.tsx:68, :75] — rimandato, refactor non concordato

**Respinto come rumore**

- «Nessun `as` aggiunto» contro `as const` a `client-filters.ts:27`: è prescritto alla lettera dal blocco di codice di Task 1 e non è un'asserzione che aggira il controllo dei tipi.
- «`.btn--quiet` non ha stato di fuoco»: metà del rilievo era falsa. La regola `:focus-visible` globale (`globals.css:83`) dà a ogni pulsante l'alone da 3px richiesto da `design-system.md` §8. Mancava solo il passaggio del mouse, ed è quello che è stato aggiunto.

**Aperto dalla revisione, e chiuso su decisione di Luca**

- [x] **`page.tsx` aveva superato le 200 righe → `ClientsTable` estratta in un file suo.** Le correzioni avevano portato il file da 198 a 213, sopra il limite di `kb-0.md` §2 che Task 8 verifica. Il file conteneva due componenti — `ClientsPage` e `ClientsTable` — e li conteneva già a 198: «un componente per file» è la riga di `kb-0.md` §2 subito prima del limite, quindi la causa non erano le righe aggiunte, era una divisione mancante. Estratta in `src/app/(app)/clienti/clients-table.tsx` su decisione di Luca del 5 agosto 2026, insieme al tipo `ClientListRow` che serve solo a lei. Esito: `page.tsx` 172, `clients-table.tsx` 56, entrambi sotto il limite, un componente per file.

  **AC5 verificata contro la fonte, non contro sé stessa:** il corpo di `ClientsTable` dopo lo spostamento è identico byte per byte a quello di `git show 4ac1646`, cioè al commit di baseline della story. Colonne, altezza delle righe e assenza di griglia non sono cambiate né durante lo sviluppo né durante la revisione.

### Verifica resa, 5 agosto 2026

Fatta con una rotta di anteprima temporanea a `/auth/anteprima`, poi cancellata. Stava sotto `/auth` perché `PUBLIC_PATHS` del proxy include quel prefisso: **nessuna riga del controllo d'accesso è stata toccata per poter provare qualcosa** (`kb-0.md` §3). Dati inventati, nessun database, nessuna sessione. La rotta importava i componenti veri — `FiltersForm`, `ClientsTable`, lo scheletro di `loading.tsx` — quindi quello che si è visto è il codice della story, non una sua imitazione; i due stati vuoti erano invece una copia della resa di `page.tsx`.

**Perché scavalcare l'accesso non sarebbe bastato:** oltre il proxy c'è `clients_owner_all`, che filtra per `auth.uid()`. Senza sessione ogni query risponde `[]`, quindi si sarebbe vista una schermata vuota e nient'altro. Il blocco non è una regola, è che non funzionerebbe.

**Il rimontaggio dei `<select>`, provato in tutti e due i sensi.** Da `?stato=attivo&tag=referral`, con un `<Link>` verso la vista senza filtri:

| | nodo `<select>` riusato | valori mostrati | righe in tabella |
|---|---|---|---|
| senza `key` (difetto riprodotto) | sì | `attivo`, `referral` | 3 |
| con `key` (correzione) | no, rimontato | vuoti | 3 |

In entrambi i casi la navigazione era client-side, verificato con un marcatore su `window` sopravvissuto al passaggio. Senza `key` la barra dichiarava due filtri che l'elenco non aveva. Con `key` si azzera anche il campo nome già digitato.

**Lo scheletro non fa più saltare la pagina.** Misurato a 1280: barra vera **74**, scheletro **74**, differenza **0** (era 26). Per arrivarci sono serviti due numeri misurati e non dedotti: `min-height: 44` su `.input` è un pavimento che il contenuto non tocca — reso, l'`<input>` viene 46 e il `<select>` 48 — ed è il 48 del selettore a dare l'altezza della riga con `align-items: flex-end`.

**Un difetto nuovo, trovato guardando e non leggendo.** Quei 2px di differenza fra `<input>` e `<select>` finivano sull'etichetta: `Nome` era due pixel più in basso di `Stato` e `Tag`. Corretto con `.filters .input { height: 48px }`, dentro la sezione CSS di questa story e non sulla `.input` condivisa, che resta la voce rimandata alla 5.2. Etichette ora tutte a 176.

**Gli altri stati, verificati sul reso:**

- *Filtro senza risultati:* `Nessun cliente corrisponde a questo filtro.`, **un solo** `Azzera i filtri`, **una sola** primaria (`Nuovo cliente`), barra presente.
- *Archivio vuoto con filtro attivo:* `Nessun cliente ancora.` con `Crea il primo cliente`, intestazione assente, una sola primaria. Prima della correzione era un vicolo cieco.
- *Errore:* `Riprova` punta a `/clienti?stato=attivo` — conserva il filtro — ed è secondario; `Nuovo cliente` è nell'intestazione; la barra con `Azzera` c'è.
- *375px:* nessuno scorrimento orizzontale, né di pagina né dentro la card; la barra va a capo; i tre controlli sono alti 48. I pulsanti restano a 40, che è la voce già rimandata alla 5.2.
- *Tastiera:* Tab entra nei campi in ordine, ogni controllo ha la sua etichetta collegata, `:focus-visible` risponde con l'alone da 3px. La tinta è `#E6F3F4`, quella di prequalifica: è la voce già rimandata alla 5.2, non una regressione di questa story.

### Verifica contro il database vero, 5 agosto 2026

Tre delle sei voci non avevano bisogno di una sessione, e l'ipotesi era sbagliata: un 400 di PostgREST arriva **prima** del filtro per proprietario, quindi si vede anche da una richiesta anonima; e il pianificatore risponde a `explain` senza leggere una riga.

- [x] **La guardia sui metacaratteri evita davvero il 400 (AC3).** Richieste anonime a `/rest/v1/clients`: `cs.{referral}` → 200; `cs.{a}b}` → 400 `22P02`, *Junk after closing right brace*; `cs.{dell"anno}` → 400 `22P02`, *Incorrectly quoted array element*; `cs.{a,b}` → 200, ma con il significato «ha entrambi i tag».
- [x] **La barra rovesciata era vietata per un motivo sbagliato.** `cs.{a\b}` risponde **200**: `\` è il carattere di *escape* del letterale, non uno che lo rompe, e `cs.{a\}b}` lo conferma — è valido, e cerca `a}b`. Vietarla resta giusto, per una ragione diversa e peggiore delle altre: un tag salvato come `a\b` verrebbe cercato come `ab` e non si troverebbe mai, senza nessun errore a dirlo. Corretto il motivo scritto in `client-tags.ts` e nel test; il comportamento non cambia.
- [x] **L'indice trigram serve la ricerca per parte di nome (AC1), l'indice gin serve il filtro per tag (AC3).** `explain` con `enable_seqscan = off`: `name ilike '%acme%'` → `Bitmap Index Scan on clients_name_trgm_idx`; `tags @> '{referral}'` → `Bitmap Index Scan on clients_tags_idx`; in entrambi con la condizione dentro `Index Cond`, non in un filtro dopo. La scansione sequenziale si è dovuta togliere a mano perché la tabella ha due righe: a quella misura il pianificatore preferisce leggerle tutte, ed è la scelta giusta. Quindi questo prova che la forma della query *sa* usare l'indice, non che oggi lo usi.

**Cosa resta e richiede una sessione vera.** Quello che dipende dai dati, e che né un'anteprima né una richiesta anonima possono dire:

- [ ] Se PostgREST converta davvero `*` in `%`: battere `*` nel campo nome e guardare se l'elenco risponde tutto. Il piano di esecuzione lo direbbe, ma `application/vnd.pgrst.plan` è disattivato su questo progetto (406), e con la sicurezza a livello di riga una richiesta anonima risponde `[]` in entrambi i casi. Se non convertisse, cambia il commento di `likePattern` e non il codice.
- [ ] Che l'ordinamento per ultima attività regga su righe vere, filtrate e non (AC5, non regressione della 1.6).
- [ ] Che un cliente salvato con due spazi nel nome si trovi copiandone il nome dall'elenco.
- [ ] Che aggiungendo un tag con `"` o `}` compaia il messaggio di rifiuto invece del salvataggio.

Le righe di prova che chiuderebbero le ultime tre non si scrivono in produzione (kb-0.md §5): si compilano usando il software.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story.** I due indici che le AC nominano sono applicati dal primo giorno, e l'Epic 1 dichiara di non portare migrazioni (`epics.md`, Implementation Notes dell'Epic 1).

| Pezzo | Dove | Stato |
|---|---|---|
| `clients_name_trgm_idx`, gin su `name` con `gin_trgm_ops` | `supabase/migrations/0002_clients.sql:29` | applicato — **è l'indice di AC1** |
| `clients_tags_idx`, gin su `tags` | `0002_clients.sql:28` | applicato — **è l'indice di AC3** |
| Estensione `pg_trgm` nello schema `extensions` | `0001_extensions.sql:9` | installata |
| `CLIENT_STATUSES` e `isClientStatus` | `src/lib/client-status.ts:15`, `:27` | il vocabolario dei cinque stati, **si riusa** |
| `normalizeTag`, `CLIENT_TAG_MAX_LENGTH`, `collectTagSuggestions` | `src/lib/client-tags.ts:19`, `:37`, `:87` | **si riusano tutti e tre** |
| `INVISIBLE`, `CLIENT_NAME_MAX_LENGTH` | `src/lib/validate-client-name.ts:15`, `:18` | **si riusano** |
| `byLastActivityDesc`, `lastActivityAt` | `src/lib/last-activity.ts` | Story 1.6, **non si aprono** |
| `formatLastActivity` | `src/lib/format-date.ts:61` | Story 1.6, **non si apre** |
| Tabella senza griglia, righe a 56, hover, `.data` in monospaziato | `globals.css:266-303`, `:260` | **AC5 è già in piedi** |
| `.input`, `.select`, `.field`, `.label`, `.btn--secondary` | `globals.css:406-460`, `:389` | la barra si compone con questi, non con classi nuove |
| `ErrorState`, stato vuoto, scheletri di `loading.tsx` | `components/error-state.tsx`, `clienti/loading.tsx` | esistono; lo stato vuoto si sdoppia, gli altri due si allargano appena |
| `StatusPill` | `components/status-pill.tsx` | invariato |
| `npm test`, con `TZ=UTC` | `package.json:8` | esiste dalla Story 1.6, **non si tocca** |
| `<datalist>` con suggerimenti dei tag | `[id]/client-tags-form.tsx:210` | è il campo di *scrittura* dei tag, non il filtro: **non si riusa il componente**, si riusa l'idea |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/client-filters.ts` — lettura dei parametri, modello per `ilike`, indirizzo canonico. Puro.
- `src/lib/client-filters.test.ts` — il test del modulo.
- `src/app/(app)/clienti/filters-form.tsx` — la barra. Componente server, un `<form method="get">`.

**Modificati**
- `src/app/(app)/clienti/page.tsx` — `searchParams`, i tre filtri sulla query, la seconda lettura dei tag, la barra, il secondo stato vuoto, la condizione dell'intestazione, `retryHref`. **Non**: la `select`, l'ordinamento, `ClientsTable`, le colonne.
- `src/app/(app)/clienti/loading.tsx` — lo scheletro della barra sopra quelli delle righe.
- `src/app/globals.css` — una sezione `.filters` e il modificatore `.btn--quiet`. Nient'altro.
- `docs/bmad/implementazione/deferred-work.md` — Task 7, una riga su una voce esistente.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/lib/last-activity.ts`, `src/lib/format-date.ts`, `src/lib/client-status.ts`, `src/lib/client-tags.ts`, `src/lib/validate-client-name.ts`, `src/lib/use-editable-field.ts`, `src/lib/use-write.ts`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/nuovo/*`, tutto `src/app/(app)/clienti/[id]/*`, `actions.ts`, `people-actions.ts`, `person-edit-actions.ts`, `src/components/*`, `package.json`, `tsconfig.json`, `AGENTS.md`.

I moduli di `src/lib` elencati sopra si **importano** e non si modificano: se una loro regola sembra doversi cambiare per far funzionare i filtri, la cosa da cambiare è il filtro.

### Le quattro decisioni di questa story

**1. Lo stato dei filtri è l'indirizzo, e la barra è un form GET.**

Tre alternative, e il motivo della scelta.

- *Un `<form method="get">` che ricarica la pagina.* Il browser costruisce l'indirizzo dai nomi dei campi. Zero righe di codice client, zero stato da risincronizzare, e ricarica, tasto indietro e preferiti funzionano perché non sono stati costruiti: sono il comportamento predefinito. Costa un clic sul pulsante quando si sceglie da un selettore.
- *Un componente client con `useRouter().replace()` e un ritardo sulla digitazione.* Filtra mentre si scrive e non ha pulsanti. Costa un file `'use client'`, un `useTransition`, un timer da pulire allo smontaggio, e riporta il problema del valore locale che non si risincronizza quando l'indirizzo cambia da fuori — che è già una voce aperta in `deferred-work.md` su `use-editable-field.ts` e su `person-roles-form.tsx`.
- *Filtrare in memoria sulle righe già lette.* Escluso dalle AC, che nominano i due indici.

Si sceglie la prima. Il criterio non è la semplicità in astratto: è che le altre due aggiungono uno stato duplicato — il campo da una parte, l'indirizzo dall'altra — e ogni difetto già aperto in questo progetto sul tema è esattamente quello.

**Quando questa scelta smette di valere:** il giorno in cui la ricerca deve rispondere mentre si scrive, cioè quando i clienti sono abbastanza da rendere il clic un fastidio invece che una conferma. Da lì il form diventa un componente client, e l'indirizzo resta la fonte di verità: la parte che si aggiunge è il `router.replace`, non un secondo stato.

**2. I filtri si applicano nel database, e non è un dettaglio di prestazioni.**

AC1 e AC3 nominano due indici, e nominarli vuol dire che il filtro dev'essere una condizione SQL. Ma il motivo vero è un altro, ed è lo stesso della Story 1.6: PostgREST restituisce una finestra di righe, non tutte. Filtrare dopo aver letto vorrebbe dire filtrare su quella finestra, cioè non trovare un cliente che esiste — un difetto che non produce nessun errore e che si scopre solo cercando qualcosa che si sa esserci.

Che è, per inciso, il motivo per cui la voce di `deferred-work.md` sul tetto di righe resta aperta e sale di importanza: filtrare nel database la rende meno probabile, non la chiude.

**3. L'elenco dei tag da offrire si legge a parte, non dalle righe filtrate.**

Costa una seconda richiesta sulla schermata iniziale, ed è il costo che rende il filtro reversibile. Il precedente è già nel progetto — la scheda cliente legge la stessa colonna per gli stessi suggerimenti (`[id]/page.tsx:77`) — e la ragione per cui non si fa in SQL è la stessa: PostgREST non espone `unnest`, quindi `select distinct unnest(tags)` di `database.md` §3 si ottiene leggendo la colonna e appiattendo lato applicazione.

**Una precisazione che vale la pena scrivere: i filtri non sono un controllo di accesso.** Le tre condizioni arrivano dall'indirizzo, cioè dal browser, cioè da qualcosa che non è attendibile (`kb-0.md` §3). Non è un problema, perché non decidono *quali righe si può vedere*: quello lo fa la policy `clients_owner_all` (`0007_rls.sql`), che filtra per proprietario dentro la stessa richiesta e vale anche sulle righe innestate. I filtri decidono solo quali fra le proprie righe si mostrano. Per questo uno stato ignoto vale «nessun filtro» invece di essere un errore: rilassare un filtro non allarga niente. Se un giorno un parametro dell'indirizzo dovesse scegliere *di chi* sono le righe, questa frase smette di valere e la validazione diventa un'altra cosa.

**4. La barra sopravvive a tutti e quattro gli stati.**

È la conseguenza di una cosa che il design system dice e che è facile leggere come una regola estetica: gli stati di una schermata sono *stati del contenuto*, non della schermata. I comandi che cambiano vista stanno fuori dai rami, altrimenti lo stato d'errore e lo stato vuoto diventano vicoli ciechi — che è già una voce aperta due volte in `deferred-work.md`, sull'elenco e sulla card delle persone. Qui non si ripete.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Filtrare l'array invece della query | Gli indici non entrano mai in gioco e si filtra una finestra di righe: un cliente che esiste non si trova | Le tre condizioni sulla `PostgrestFilterBuilder` |
| Riscrivere la `select` e metterci `assessments!inner` | Spariscono tutti i clienti senza schede, cioè oggi tutti | La `select` non si tocca |
| `.ilike('name', term)` senza `%` | Cerca l'uguaglianza esatta, non una parte del nome | `likePattern` |
| `%` o `_` battuti nel campo | Diventano jolly: l'elenco risponde righe che non contengono quello che è scritto | Escape con la barra, e un test |
| `*` battuto nel campo | PostgREST lo converte in `%`: resta un jolly e non si può sfuggire | Dichiarato, verificato in sviluppo, scritto nel commento |
| Elenco dei tag ricavato dalle righe filtrate | Scelto un tag, il menu si restringe a quel tag: il filtro si chiude dietro di sé | Seconda lettura non filtrata |
| Stato ignoto dall'indirizzo passato a `.eq` | Un indirizzo storpiato diventa la schermata d'errore | `isClientStatus` → nessun filtro |
| Parametro ripetuto passato così com'è | `.eq` riceve un array e PostgREST rifiuta la query | Si prende il primo valore |
| `searchParams` letto senza `await` | In Next 16 è una promessa: si legge `undefined` ovunque | `await searchParams` |
| Un solo stato vuoto | `Nessun cliente ancora.` mentre di clienti ce ne sono duecento | Due stati vuoti, scelti da `hasActiveFilters` |
| `Nuovo cliente` legato a `rows.length > 0` | Con un filtro che non trova niente non si può più creare un cliente | La condizione include i filtri attivi |
| Due `Azzera i filtri` sulla stessa schermata | La stessa azione due volte a sessanta pixel di distanza | Uno solo: barra **oppure** stato vuoto |
| Barra dentro il ramo d'errore o dentro quello pieno | Si resta bloccati in una vista che non si può cambiare | Fuori dai rami condizionali |
| `loading.tsx` senza lo scheletro della barra | La pagina salta a ogni filtro | Uno scheletro della forma reale |
| `retryHref="/clienti"` con i filtri attivi | `Riprova` diventa un `Azzera` travestito | `filtersHref(filters)` |
| Un tag con la virgola in `.contains` | `cs.{a,b}` si legge come due elementi | `parseTag` le vieta già in scrittura |
| Ordinamento rifatto o «migliorato» | La Story 1.6 rifatta e in disaccordo con sé stessa | `[...data].sort(byLastActivityDesc)` invariato |
| `revalidatePath` aggiunto per i filtri | Un filtro è una lettura: non c'è niente da rivalidare | Nessuna azione nuova |
| `maxLength` sul campo di ricerca | Terzo posto in cui l'incolla si tronca in silenzio | Il taglio lo fa il modulo, e non si vede |
| Un colore o una misura nuovi in `globals.css` | Il divieto di `design-system.md` §10 | Solo token e scala di 4 |

### Contratto visivo

- La barra sta **dentro la card, sopra la tabella**, con lo stesso stacco che `.card__header` usa già (20px). La card resta il contenitore unico del contenuto: fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24, nessun bordo (UX-DR3).
- Nessun colore di sezione nella barra: i colori di sezione vivono nella navigazione (UX-DR2). Il filtro attivo non si segnala con un colore — si legge nel campo, che mostra il valore, e nell'indirizzo.
- Nessuna icona: le icone del progetto sono a tratto e in `--ink-muted`, e qui non ce ne sono. Nessuna lente d'ingrandimento disegnata a mano, per la stessa ragione per cui il selettore dello stato non ha `appearance: none`.
- I campi sono `.input` come tutti gli altri: bordo 1px `--line`, raggio `--r-md`, padding 12/16, altezza minima 44 (UX-DR14). Il selettore aggiunge `.select`, che è già scritto.
- **L'alone del focus resta `--sec-prequalifica`**, che nell'area clienti è la tinta sbagliata: è la voce già rimandata alla Story 5.2 (`deferred-work.md`, 2 agosto) e vale per ogni campo del progetto. Non si corregge qui per tre campi soli.
- `.btn` alto 40 contro `.input` alto 44 è l'altra voce rimandata alla 5.2. `align-items: flex-end` toglie almeno il disallineamento visibile, come fa già `.tags-add`.
- Le parole: `Nome`, `Stato`, `Tag`, `Tutti`, `Filtra`, `Azzera i filtri`, `Nessun cliente corrisponde a questo filtro.` Italiano, frase minuscola, voce attiva, niente punti esclamativi, niente emoji (UX-DR13). `Azzera` dal pulsante alla conferma: l'azione si chiama allo stesso modo dovunque compaia.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione**, nessuna vista, nessuna funzione nel database, nessun indice nuovo. I due che servono ci sono.
- **Nessuna ricerca fuori dal nome.** AC1 dice «una parte di un nome». Non note, non settore, non città, non persone: sarebbe un'altra query, un altro indice e un'altra decisione.
- **Nessuna paginazione**, nessun caricamento progressivo, nessun ordinamento cliccabile sulle intestazioni, nessun conteggio dei risultati oltre quello già presente.
- **Nessun filtro multiplo**: uno stato, un tag. Più tag insieme vorrebbero dire un altro controllo e un'altra semantica (tutti o almeno uno), e nessuna AC li chiede.
- **Nessuna colonna `Esito`**: è la Story 4.2, e ha bisogno di schede che non esistono.
- **Nessun salvataggio dei filtri come preferenza** (né `localStorage`, né una colonna, né un cookie). L'indirizzo è già la memoria, e i preferiti del browser sono già il posto dove si salva una vista.
- **Nessuna evidenziazione** del pezzo di nome trovato dentro la riga.
- **Nessuna dipendenza nuova.** In particolare nessuna libreria di combobox, nessun `nuqs`, nessun gestore di stato dell'indirizzo: il form GET fa quello che serve in venti righe (`kb-0.md` §2).
- **Nessuna delle voci di `deferred-work.md` viene chiusa.** Task 7 ne aggiorna una, che è il contrario di chiuderla.
- **Nessun test oltre quello del modulo dei filtri.** Non si prova la pagina, non si prova il form, non si prova la query: sono presentazione e integrazione, e la loro verifica è Task 8 (`kb-0.md` §7).

### Test

Un file, un modulo puro, nessuna impalcatura. Il comando esiste dalla Story 1.6 e non si tocca.

Cosa entra sotto test e perché: `parseClientFilters` è **una trasformazione** — da parametri di un indirizzo, che chiunque può scrivere a mano, a tre valori che finiscono dentro una query — e `likePattern` è **un calcolo** su un valore che arriva da fuori. Sono le due categorie che `kb-0.md` §7 nomina, e nessuna delle due rompendosi produce un errore: producono un elenco che mostra le righe sbagliate, cioè un difetto che si scopre solo cercando qualcosa che si sa esserci.

Cosa **non** entra: la pagina, la query, il form, `ClientsTable`, gli stati vuoti. Sono presentazione, e la loro verifica è la sessione di Task 8.

Restano fuori, come dalla Story 1.6, i candidati naturali già elencati là: `parseDecisionRoles`, `personDisplayName`, `normalizeTag`, `collectTagSuggestions`, `normalizeClientName`. Non si aggiungono adesso — sarebbero lavoro non chiesto — ma `normalizeTag` e `collectTagSuggestions` entrano indirettamente sotto test da qui, perché `parseClientFilters` usa la prima e la barra la seconda.

### Project Structure Notes

```
src/lib/
├── client-filters.ts        NUOVO — lettura dei parametri, likePattern, filtersHref. Puro.
├── client-filters.test.ts   NUOVO
└── (tutto il resto)         invariato

src/app/(app)/clienti/
├── page.tsx                 searchParams, i tre filtri sulla query, i tag, i due stati vuoti
├── filters-form.tsx         NUOVO — la barra. Componente server, <form method="get">
├── loading.tsx              + lo scheletro della barra
└── (tutto il resto)         invariato

src/app/globals.css          + .filters e .btn--quiet
docs/bmad/implementazione/deferred-work.md   la voce sul .limit() dei tag, aggiornata
```

Convenzioni vincolanti (`kb-0.md` §2): file in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`, nomi in inglese nel codice e in italiano nell'interfaccia, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Il test sta accanto al modulo che prova e ne porta il nome più `.test`.

Il form sta in un file suo e non dentro `page.tsx` per la regola del componente per file, e perché `page.tsx` è già a 111 righe: con i filtri, la seconda lettura e il secondo stato vuoto arriva intorno a 150, e la barra dentro lo porterebbe oltre.

### Piattaforma in uso, verificata

Da `package.json` e dal repository, il 4 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict` e `noUncheckedIndexedAccess`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata, nessuna entra.

Verificato leggendo la documentazione, **da confermare eseguendo** e da scrivere nel Dev Agent Record:

- **`searchParams` è una promessa.** In Next 16 `params` e `searchParams` sono asincroni e la forma sincrona non esiste più. La pagina della scheda cliente attende già `params` (`[id]/page.tsx:32`): stesso schema.
- **PostgREST converte `*` in `%`** nei modelli di `like` e `ilike` — «to avoid URL encoding you can use `*` as an alias of the percent sign `%` for the pattern». Da qui la nota di Task 1: un `*` battuto nel campo resta un jolly, e sfuggirlo produrrebbe un `%` letterale, non un `*`.
- **`contains` su una colonna `text[]`** genera `tags=cs.{valore}`, che è l'operatore `@>` e usa l'indice gin. `supabase-js` unisce gli elementi con la virgola senza virgolettarli: è il motivo per cui il divieto di virgole dentro un tag (`parseTag`) è una precondizione di questo filtro e non un dettaglio della Story 1.4.
- **Le condizioni si accumulano riassegnando il costruttore di query.** `.ilike`, `.eq` e `.contains` ritornano lo stesso costruttore, quindi `let query = …; if (…) query = query.ilike(…)` è la forma documentata per i filtri condizionali. Che il controllo dei tipi la accetti senza un `as` va visto: se non lo facesse, la strada è comporre l'oggetto delle condizioni e non aggirare i tipi.
- **L'indice trigram entra in gioco da tre caratteri in su.** Con uno o due, Postgres legge la tabella. Non è un problema di correttezza e a questa scala non si vede: si scrive perché il giorno che la ricerca sembrasse lenta su due lettere, la risposta è questa e non un difetto.
- **Che `loading.tsx` si renda anche sull'invio del form va guardato, non dedotto.** Un form GET nativo è una navigazione di documento, non una transizione dell'App Router: il confine di sospensione dovrebbe comunque rendersi mentre la pagina scorre in streaming, ma è esattamente il tipo di cosa che la Story 1.4 ha sbagliato tre volte deducendola. Se non si rendesse, lo scheletro della barra chiesto da Task 5 non diventa inutile — serve comunque alla navigazione da dentro l'applicazione — ma va scritto nel Dev Agent Record che il salto sull'invio del form resta.

### Intelligence dai commit

Da `4ac1646`, `0cc87f5` e `386eb3b` (Story 1.6) e da `cee425a` (Story 1.5), le abitudini che questa story eredita:

- **Le funzioni pure di `src/lib` non importano né React né Supabase**, e sono il posto dove va la logica che va provata. Sette moduli lo rispettano; `client-filters.ts` è l'ottavo.
- **Task di verifica diviso in due**: quello che l'agente esegue e quello che richiede una sessione. Le seconde restano vuote finché non le percorre Luca, e la story non va a `done` prima.
- **Quello che riguarda la resa si prova sull'anteprima, non si deduce.** La Story 1.4 ha sbagliato tre volte su dettagli visivi non visti resi.
- **Nei log `code` e `message`, mai `details`**, che conterrebbe valori delle righe.
- **Le decisioni strutturali si scrivono dove sono state prese** (`kb-0.md` §8): la revisione della 1.6 ha dovuto aggiungere D23 a `00-contesto-e-decisioni.md` e una nota a `database.md` §5 perché due scelte vivevano solo nel file della story. Se una delle quattro decisioni qui sopra sopravvive alla revisione così com'è, il posto dove va scritta è `00-contesto-e-decisioni.md`, e la domanda 6 lo chiede.
- **Le caselle non si spuntano se non sono vere.** La revisione della 1.6 ne ha rimesse vuote tre. Una casella spuntata su un compito non finito è un segnale di completamento falso, ed è peggio di una casella vuota.
- **`revalidatePath('/clienti')` sta solo nelle azioni del cliente**, e resta com'è: questa story non scrive niente.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.7: Cercare e filtrare l'elenco]
- FR9 e FR10, ricerca per nome e filtri per stato e tag: [Source: docs/prd-v1.md#4. Schermate]
- Gli stati come etichette descrittive che non bloccano: [Source: docs/00-contesto-e-decisioni.md#D14. Il software non blocca niente]
- I tag liberi, filtrabili, normalizzati in minuscolo: [Source: docs/00-contesto-e-decisioni.md#D17. Tag sul cliente]
- I due indici e la nota su `unnest`: [Source: docs/database.md#3. Tabelle]
- Come è calcolato davvero l'ordinamento, e quando smette di bastare: [Source: docs/database.md#5. Ultima attività del cliente]
- Tabella senza griglia, colonne, date in monospaziato, pillole, pulsanti: [Source: docs/design-system.md#5. Componenti]
- I quattro stati, con lo stato vuoto che dice cosa manca: [Source: docs/design-system.md#6. I quattro stati di ogni schermata]
- Voce dell'interfaccia e accessibilità: [Source: docs/design-system.md#7. Voce dell'interfaccia], [Source: docs/design-system.md#8. Accessibilità]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica], [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Story precedente, pattern, misure e comando dei test: [Source: docs/bmad/implementazione/1-6-ordinare-l-elenco-per-ultima-attivita-vera.md]
- I tag e la loro normalizzazione, con la corsa nota accettata: [Source: docs/bmad/implementazione/1-4-marcare-i-clienti-con-tag-riusabili.md]
- Voci rimandate ancora aperte, tre delle quali questa story sfiora: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima o durante lo sviluppo

Ognuna ha già la sua risposta di default dentro i task: se non rispondi, si fa quella.

1. **La barra è un form GET con un pulsante `Filtra`**, non una ricerca che filtra mentre scrivi. Ricarica, tasto indietro e preferiti funzionano senza codice; il costo è un clic quando scegli da un selettore. L'alternativa è un componente client con un ritardo sulla digitazione, che aggiunge uno stato locale da risincronizzare — cioè il difetto già aperto due volte in `deferred-work.md`. Default: form GET. Confermi?
2. **I parametri dell'indirizzo sono in italiano**: `/clienti?nome=rossi&stato=attivo&tag=referral`. Coerente con le rotte, che sono già italiane. Default: italiano. Confermi, o li preferisci in inglese come il codice?
3. **Premendo `Filtra` a campi vuoti l'indirizzo diventa `/clienti?nome=&stato=&tag=`.** È come si comportano i form GET nativi, e il modulo legge le stringhe vuote come «nessun filtro», quindi la schermata è identica. Toglierli richiederebbe un componente client, cioè la domanda 1. Default: si accetta l'indirizzo con i parametri vuoti. Va bene?
4. **`%` e `_` battuti nella ricerca diventano letterali, `*` no.** PostgREST converte `*` in `%` prima di SQL e non c'è modo di sfuggirlo. Default: si sfuggono i due che si possono sfuggire, e il `*` resta un jolly, dichiarato nel commento e verificato in sviluppo. Confermi, oppure preferisci togliere il `*` dal termine cercato, sapendo che vuol dire cancellare in silenzio un carattere battuto?
5. **Si aggiunge `.btn--quiet`**, la variante *discreta* già descritta in `design-system.md` §5 e mai implementata, per `Azzera i filtri`. Quattro righe. L'alternativa è usare `btn--secondary` e avere due pulsanti bordati affiancati. Default: si aggiunge. Confermi?
6. **La decisione 1 va registrata in `00-contesto-e-decisioni.md` come D24?** «Lo stato dei filtri vive nell'indirizzo, e la barra è un form GET» è una scelta strutturale che qualcuno rimetterà in discussione fra tre mesi, e `kb-0.md` §8 chiede che il motivo sia scritto. Quel file è tuo, quindi lo segnalo invece di modificarlo di nascosto. Default: **non** lo tocco, e la decisione resta scritta qui. Preferisci che ci vada?

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 4 agosto 2026.

### Debug Log References

**Un blocco non previsto dalla story: `node --test` non risolve gli import senza estensione.**

Il primo `npm test` sul file nuovo è morto prima di eseguire un solo test:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/Users/…/src/lib/validate-client-name'
  imported from /Users/…/src/lib/client-tags.ts
```

Node esegue i `.ts` come ESM, dove il percorso relativo va scritto con l'estensione. `client-filters.ts` deve importare `normalizeTag` da `client-tags.ts` (Task 1 lo impone, ed è giusto), e `client-tags.ts` a riga 1 importa `./validate-client-name` senza `.ts`. I test della 1.5 e della 1.6 non l'avevano mai incontrato perché `format-date.ts` e `last-activity.ts` non hanno import relativi: questo è il primo modulo sotto test che ne ha.

Nessuna strada resta dentro il perimetro: riscrivere `normalizeTag` è vietato da Task 1, saltare il test è vietato da Task 6, e un hook di risoluzione toccherebbe `package.json`, anch'esso «Da non toccare». **Chiesto a Luca prima di procedere** (`AGENTS.md`, «se serve modificare qualcosa fuori dal perimetro, dillo prima»): scelta l'aggiunta di `.ts` all'import esistente, un solo token, con `allowImportingTsExtensions` già attivo in `tsconfig.json`. Verificata su `npm test`, `npm run typecheck` e `npm run build` — quest'ultimo conta, perché `client-tags.ts` sta nel grafo dell'app e non solo in quello dei test.

**La verifica di Task 6 che i test falliscono quando devono.** Rotti di proposito i due punti che il task nomina, uno per volta e poi insieme:

| Rottura | Test rossi |
|---|---|
| `likePattern` senza l'escape (`` `%${term}%` ``) | 3 — `%`, `_`, la barra |
| `isClientStatus(status) ? status : null` → `status as ClientStatus` | 4 — indirizzo vuoto, stringhe vuote, array vuoto, stato ignoto |

7 rossi su 21, poi ripristinato e `git diff` sul file torna a zero rispetto alla versione buona. Un test che non è stato visto fallire quando doveva non è un test (`kb-0.md` §7).

**L'anteprima non arriva alla schermata.** Avviato `npm run dev` e chiesto `/clienti?nome=ro&stato=attivo`: il proxy reindirizza a `/accedi` prima che la rotta si renda (`GET /accedi 200`, nessun errore in console, nessun avviso). La barra, i due stati vuoti, lo scheletro e il comportamento a 375px **non sono stati visti resi**: richiedono una sessione, e stanno nella parte di Task 8 che fa Luca. Non si dà per verificato quello che non si è visto.

### Completion Notes List

**Tre caselle restano vuote di proposito**, perché spuntarle sarebbe un segnale di completamento falso:

1. **Task 1, la conversione di `*` in `%` da parte di PostgREST.** Il codice è scritto e il commento di `likePattern` dichiara il comportamento, ma la conversione **non è stata vista girare**: distinguerla richiede una query con dati veri, e con la sicurezza a livello di riga attiva una richiesta senza sessione risponde `[]` sia con `*` sia senza, quindi non prova niente. Task 1 chiede esplicitamente di verificarlo in sviluppo. **Da aggiungere alla sessione di Luca:** battere `*` nel campo nome e guardare se l'elenco risponde tutto. Se la conversione non avvenisse in questa versione, cambia la riga di commento e non il codice.
2. **Task 8, la riga «nessun file fuori dall'elenco».** Non è vera come scritta: `src/lib/client-tags.ts` è fuori dall'elenco «Cosa cambia questa story» e non è una scrittura di metodo. La modifica è di un token, motivata sopra e **approvata da Luca in sessione**, ma la casella dice un'altra cosa e resta vuota.
3. **Task 8, le tredici verifiche di sessione.** Nessuna è stata percorsa: l'anteprima si ferma a `/accedi`.

**Quello che è stato fatto e verificato:**

- `src/lib/client-filters.ts`, 135 righe, puro: nessun import di React né di Supabase. Riusa `isClientStatus`/`ClientStatus`, `normalizeTag`/`CLIENT_TAG_MAX_LENGTH`, `INVISIBLE`/`CLIENT_NAME_MAX_LENGTH` dai moduli che già li tengono; nessuna regola riscritta.
- 21 test nuovi, 43 in totale con i 22 della Story 1.6, tutti verdi. `npm test` non è stato toccato e gira già con `TZ=UTC`.
- I tre filtri stanno nella query (`.ilike`, `.eq`, `.contains`) e mai sull'array. La `select` è invariata e non contiene `!inner` — l'unica occorrenza nel file è nel commento che lo vieta. La riga dell'ordinamento della 1.6 è identica: `const rows = data ? [...data].sort(byLastActivityDesc) : null`.
- I tag del selettore arrivano da una seconda lettura **non filtrata**, così scegliere un tag non chiude il filtro dietro di sé. Un errore su quella lettura registra `code` e `message` — mai `details` — e non fa cadere la schermata.
- La barra è un componente server, un `<form method="get">`: nessun `'use client'`, nessuno stato, nessun timer. Sta fuori da tutti i rami condizionali, quindi sopravvive anche all'errore e al vuoto.
- **`Azzera i filtri` compare una volta sola.** Il ramo e il pulsante si decidono dallo stesso valore (`emptyForFilters`), non da due condizioni che devono restare d'accordo. Stessa cosa per l'elenco pieno: `found` è un valore e non un booleano, così restringe il tipo di `rows` e serve i tre punti che lo leggono.
- **Una sola azione primaria per stato**, verificato leggendo i rami: pieno e vuoto-con-filtri hanno `Nuovo cliente` nell'intestazione e `Azzera i filtri` è `btn--quiet`; il vuoto-senza-filtri non ha intestazione e la primaria è `Crea il primo cliente`.
- `retryHref={filtersHref(filters)}`: `Riprova` rifà la vista che ha fallito. Un test verifica il giro completo `filtersHref` → `parseClientFilters`, così i due non possono divergere.
- `globals.css`: solo `.filters`, `.filters .field`, `.filters .btn` e `.btn--quiet`. Nessun valore esadecimale nuovo, nessuna misura fuori dalla scala di 4 (12, 20, 160).
- `page.tsx` 198 righe, `filters-form.tsx` 112, `client-filters.ts` 135: tutti sotto il limite di `kb-0.md` §2. Il commento della query è stato accorciato quando `page.tsx` è arrivato a 201.
- Nessun `any`, nessun `as` aggiunto, nessuna dipendenza nuova, nessuna migrazione, nessuna azione nuova, nessun `revalidatePath`.
- Task 7: la voce di `deferred-work.md` sul `.limit()` dei suggerimenti è stata **aggiornata e non chiusa**, con il secondo riferimento e la conseguenza (un tag che esiste diventa non filtrabile e niente lo dice).

**Le sei domande della story** sono state chiuse con i default, come la story stessa prevede in assenza di risposta: form GET con `Filtra`, parametri in italiano, indirizzo con i parametri vuoti accettato, `%` e `_` sfuggiti e `*` no, `.btn--quiet` aggiunto, e `00-contesto-e-decisioni.md` **non toccato** — la decisione 1 resta scritta qui, e se sopravvive alla revisione il posto dove registrarla lo decide Luca.

### File List

**Nuovi**
- `src/lib/client-filters.ts`
- `src/lib/client-filters.test.ts`
- `src/app/(app)/clienti/filters-form.tsx`
- `src/app/(app)/clienti/clients-table.tsx` — *aggiunto in revisione*, estrazione senza modifiche del contenuto

**Modificati**
- `src/app/(app)/clienti/page.tsx`
- `src/app/(app)/clienti/loading.tsx`
- `src/app/globals.css`

**Modificato fuori perimetro, con deroga esplicita di Luca del 4 agosto 2026**
- `src/lib/client-tags.ts` — riga 1, `'./validate-client-name'` → `'./validate-client-name.ts'`. Senza, `node --test` non risolve la catena e il test di Task 6 non parte. Motivo per esteso nel Debug Log.

**Scritture di metodo**
- `docs/bmad/implementazione/1-7-cercare-e-filtrare-l-elenco.md` (questo file)
- `docs/bmad/implementazione/sprint-status.yaml`
- `docs/bmad/implementazione/deferred-work.md`

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 4 agosto 2026 | 0.1 | Creazione della story | Claude Code (create-story) |
| 4 agosto 2026 | 0.2 | Task 1-7 implementati: modulo dei filtri con 21 test, filtri nella query, selettore dei tag non filtrato, barra come form GET, due stati vuoti, `.btn--quiet`. Task 8 solo nella parte verificabile dall'agente. | Claude Code (dev-story) |
| 5 agosto 2026 | 0.3 | Revisione a tre strati. 11 correzioni applicate, fra cui i `<select>` che non si risincronizzavano, i metacaratteri dei tag che rompevano la query e la ricerca che comprimeva spazi che la colonna non comprime. 2 decisioni prese su delega, 1 voce rimandata, 2 respinte. 47 test verdi. | Claude Code (code-review) |
| 5 agosto 2026 | 0.4 | `ClientsTable` estratta in `clients-table.tsx` su decisione di Luca: `page.tsx` da 213 a 172, un componente per file. Contenuto della tabella identico a `4ac1646`. | Claude Code (code-review) |
| 5 agosto 2026 | 0.5 | Verifica resa con una rotta di anteprima temporanea, senza toccare il controllo d'accesso. Rimontaggio dei `<select>` provato in entrambi i sensi, salto dello scheletro da 26px a 0, quattro stati e 375px verificati. Trovata e corretta una dodicesima cosa: le tre etichette della barra non erano allineate. Restano sei verifiche che richiedono una sessione vera. | Claude Code (code-review) |
| 5 agosto 2026 | 0.6 | Tre delle sei verifiche chiuse senza sessione: un 400 di PostgREST precede il filtro per proprietario, e `explain` non legge righe. I due indici servono le due query. La barra rovesciata non rompe il letterale — lo sfugge — quindi il divieto resta e il motivo scritto cambia: fallisce in silenzio invece che con un errore. | Claude Code (code-review) |
