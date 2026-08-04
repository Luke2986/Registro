---
baseline_commit: 34a6a2e7c09b27aaf0480a6b9ff3ba2c418fe023
---

# Story 1.5: Registrare le persone e chi decide

Status: done

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 4 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want tenere sotto il cliente le persone con cui parlo e il loro peso nella decisione,
so that so a chi scrivere e chi può dire di no prima di preparare una proposta.

## Acceptance Criteria

**AC1 — una persona si aggiunge, e nessun campo è obbligatorio**
**Given** la scheda di un cliente
**When** aggiungo una persona
**Then** posso indicare nome, cognome, ruolo aziendale, email, telefono e note, e nessuno di questi campi è obbligatorio

**AC2 — i ruoli nella decisione sono più di uno, con le parole giuste**
**Given** una persona
**When** le assegno i ruoli rispetto alla decisione
**Then** posso sceglierne più di uno fra: ha il problema, decide, può bloccare, referente operativo, interlocutore
**And** l'etichetta mostrata è quella che riconosco io, per esempio "chi decide", non "ruolo decisionale" (UX-DR13)

**AC3 — un solo contatto principale, e il cambio riesce**
**Given** un cliente che ha già un contatto principale
**When** segno come principale una seconda persona
**Then** la precedente smette di esserlo, e l'operazione riesce senza violare l'indice unico parziale già presente

**AC4 — il badge conta le persone**
**Given** un cliente con più persone
**When** guardo la scheda
**Then** vedo un badge numerico in monospaziato che le conta (UX-DR6)

## Tasks / Subtasks

- [x] **Task 1 — I moduli puri: campi, ruoli, uuid** (AC: 1, 2)
  - [x] Creare `src/lib/person-fields.ts`: dati e funzioni pure, **nessun import di React né di Supabase**, tutto esportato, così la Story 1.6 può metterci un test sopra senza riscrivere niente (`kb-0.md` §7). È lo stesso patto di `client-fields.ts`, `client-status.ts` e `client-tags.ts`.

    ```ts
    export const PERSON_FIELDS = [
      { key: 'first_name', label: 'Nome', kind: 'short' },
      { key: 'last_name', label: 'Cognome', kind: 'short' },
      { key: 'job_title', label: 'Ruolo in azienda', kind: 'short' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phone', label: 'Telefono', kind: 'phone' },
      { key: 'notes', label: 'Note', kind: 'long' },
    ] as const
    ```

    `as const` non è cosmetico: senza, `key` si allarga a `string` e `PersonFieldKey` non vale più niente. `email` e `phone` sono `kind` a sé e non `short` per una ragione sola: danno la tastiera giusta sul tablet (`inputMode`). Restano `<input type="text">` — vedi Task 5.

    **Fonte unica: da qui in poi nessun elenco di campi si riscrive a mano da nessuna parte.** Ci si derivano il modulo di creazione, il blocco della persona e il tipo della query. È lo stesso patto di `CLIENT_FIELDS`, che esiste perché prima erano tre elenchi paralleli e toglierne uno non produceva nessun errore di compilazione.
  - [x] `isPersonFieldKey(value: unknown): value is PersonFieldKey` costruita su un `Set` delle chiavi, identica a `isClientFieldKey`. **È la difesa che tiene `decision_roles`, `is_primary`, `client_id` e `owner_id` fuori dalla scrittura per chiave variabile.**
  - [x] `personDisplayName(person: { first_name: string | null; last_name: string | null }): string`: unisce quello che c'è, e se non c'è niente risponde `'Persona senza nome'`. Serve all'etichetta accessibile del pulsante che elimina e alla riga di conferma, mai a un titolo visibile (vedi Contratto visivo).
  - [x] **`normalizeTextValue` non si riscrive: si importa** da `@/lib/client-fields`. È già «stringa vuota → `null`, mai `''` nel database» e vale identica qui. Una seconda copia è la duplicazione silenziosa che `kb-0.md` §9 chiede di fermare. Il nome del file dice `client` e la funzione è generica: si annota, non si sposta (spostarla toccherebbe `actions.ts`, fuori perimetro).
  - [x] **Nessun limite di lunghezza e nessuna validazione di formato** su email e telefono. I dieci campi del cliente non ne hanno, e un'email scritta a metà durante una call deve poter essere salvata: il software registra e mostra, non decide e non vieta (D14). Niente `type="email"`, che farebbe rifiutare il browser con parole sue.
  - [x] Creare `src/lib/decision-roles.ts`, puro allo stesso modo. I cinque valori **nell'ordine del vincolo `check`** (`0003_people.sql:14`), ognuno con la parola che compare a schermo:

    ```ts
    export const DECISION_ROLES = [
      { value: 'ha_il_problema', label: 'ha il problema' },
      { value: 'decide', label: 'decide' },
      { value: 'puo_bloccare', label: 'può bloccare' },
      { value: 'referente_operativo', label: 'referente operativo' },
      { value: 'interlocutore', label: 'interlocutore' },
    ] as const
    ```

    **Qui la mappa valore → etichetta serve**, al contrario di `client-status.ts` dove i cinque valori del database erano già le parole dell'interfaccia: `puo_bloccare` non si mostra a nessuno (UX-DR13, AC2).
  - [x] `isDecisionRole(value: unknown): value is DecisionRole` e `parseDecisionRoles(raw: readonly unknown[]): DecisionRolesResult`, union discriminata come `TagResult` e `EmployeesResult`. `parseDecisionRoles` fa tre cose: **rifiuta** qualsiasi valore fuori dal vocabolario (non lo scarta in silenzio: è una richiesta che non doveva esistere, come uno stato fuori dai cinque), **toglie i doppioni**, **ritorna nell'ordine di `DECISION_ROLES`**.

    Il doppione non è teorico: il vincolo sulla tabella è `decision_roles <@ array[...]`, cioè un test di sottoinsieme, e `['decide','decide']` lo passa. L'elenco vuoto è valido e vuol dire «nessun ruolo».
  - [x] Creare `src/lib/uuid.ts` con la regola dell'uuid, **spostata e non copiata**: `export const UUID` e `export function isUuid(value: unknown): value is string`. Poi sostituire le due copie esistenti con l'import — `src/app/(app)/clienti/[id]/page.tsx:21` e `src/app/(app)/clienti/actions.ts:502`. **I commenti restano ai punti di chiamata**, perché dicono due cose diverse: nella scheda distingue «una scheda che non c'è» da un guasto, nelle azioni rifiuta una richiesta che non doveva esistere.

    Chiude la voce di `deferred-work.md` del 3 agosto 2026 («la regola dell'uuid è scritta in due file»), alla condizione che quella voce stessa dichiarava: quando ne ha bisogno una terza rotta. Le azioni delle persone sono la terza.

- [x] **Task 2 — `openSession` esce da `actions.ts`, senza cambiare comportamento** (AC: 1, 2, 3)
  - [x] Creare `src/lib/supabase/session.ts` e spostarci `openSession` e il tipo `SessionResult` **così come sono**, commento lungo compreso. Nessuna riga di logica cambia.
  - [x] In `src/app/(app)/clienti/actions.ts`: togliere la definizione, aggiungere l'import. **Nient'altro si tocca in quel file**: `createClientRecord`, `updateClientField`, `renameClient`, `updateClientStatus`, `addClientTag`, `removeClientTag`, `findExistingName`, le costanti dei messaggi e tutti i loro commenti sono passati da quattro revisioni.
  - [x] **Perché non basta esportarla da `actions.ts`.** Quel file ha `'use server'` in testa: da un modulo così si possono esportare solo funzioni asincrone, e ognuna diventa un punto di ingresso raggiungibile dal browser. `openSession` restituisce un client Supabase — pubblicarla come azione vorrebbe dire esporre un endpoint che non deve esistere. Il file nuovo **non** ha `'use server'`: è codice di server importato da chi ne ha bisogno.
  - [x] `src/lib/supabase/session.ts` non è un candidato ai test della 1.6: parla con Supabase.

- [x] **Task 3 — Le azioni delle persone, in un file nuovo** (AC: 1, 2, 3)
  - [x] Creare `src/app/(app)/clienti/people-actions.ts` con `'use server'` in testa. **Non dentro `actions.ts`**: quel file è a 566 righe e contiene già due cose (il cliente e i suoi tag); le persone sono la terza, e la revisione della 1.4 ha lasciato scritto che il numero si guarda alla 1.5. `kb-0.md` §2 dice che oltre le 200 righe un file quasi sempre contiene due cose.
  - [x] Cinque azioni, tutte con la firma `(_previous, formData)` del progetto, tutte che aprono con `openSession('<nome>')`, tutte che riusano `isUuid`, e **nessuna che reindirizza**: aggiungere una persona non porta da nessuna parte, e una navigazione porterebbe via quello che è scritto negli altri campi (NFR1).
  - [x] `createPerson(_previous, formData): Promise<{ error?: string }>` — sequenza obbligata:
    1. `openSession`; se non va, il suo errore.
    2. `client_id` dal `formData`, verificato con `isUuid`.
    3. **Verificare che quel cliente sia mio**: `.from('clients').select('id').eq('id', clientId).maybeSingle()`. Se `error` → log con solo `code` e `message` e `'La persona non è stata salvata. Riprova fra un momento.'`; se `!data` → `'Questa scheda non è più disponibile. Torna all'elenco.'`. **Questo passaggio non è una cortesia: è la sicurezza di questa story.** Vedi «La trappola di sicurezza di questa story».
    4. I sei campi: `normalizeTextValue(formData.get(field.key))` per ognuno di `PERSON_FIELDS`, ciclando sull'elenco e **mai** riversando il `formData` in un oggetto.
    5. `parseDecisionRoles(formData.getAll('decision_roles'))`; se non passa, il messaggio della funzione.
    6. `.from('people').insert({ ...fields, decision_roles: roles, client_id: clientId, owner_id: user.id })`. `is_primary` non si scrive: ha il suo default `false` e la sua azione (punto sotto). `created_at`, `updated_at` e `id` hanno il default nello schema.
    7. `revalidatePath(\`/clienti/${clientId}\`)` — **e non `/clienti`**: vedi «Quello che non si rivalida, e perché».
    8. `{}`.
  - [x] `updatePersonField(_previous, formData): Promise<{ error?: string; saved?: string }>` — la gemella di `updateClientField`, più semplice perché non ha il caso `employees`: `person_id` con `isUuid`, `field` con `isPersonFieldKey`, `value` che **deve essere una stringa** (una chiave assente non è «svuota», è una richiesta malformata: è la stessa guardia di `actions.ts:130`), `normalizeTextValue`, `.update(patch).eq('id', personId).select('id, client_id').maybeSingle()`.

    `client_id` torna dalla `select` perché serve a `revalidatePath` e **non si prende dal browser**. Se `!data` → `'Questa persona non è più disponibile. Ricarica la pagina.'`. Il `saved` è il valore ripulito (`value ?? ''`), che risincronizza il campo come già fa la scheda cliente.
  - [x] `updatePersonRoles(_previous, formData): Promise<{ error?: string; saved?: string[] }>` — `person_id`, `parseDecisionRoles(formData.getAll('decision_roles'))`, `.update({ decision_roles: roles })`. Ritorna `saved: roles`, cioè l'elenco canonico: il componente ci riallinea il proprio stato senza aspettare la rivalidazione.

    **Qui l'elenco intero arriva dal browser, e va bene**, al contrario dei tag: il vocabolario è chiuso e verificato contro l'allow-list, quindi il client non può iniettare niente, e l'insieme *è* il valore del campo, non una collezione che cresce nel tempo.
  - [x] `setPersonPrimary(_previous, formData): Promise<{ error?: string }>` — `person_id` e `primary` (`'1'` o `'0'`, qualsiasi altra cosa è un rifiuto). Sequenza:
    1. leggere la persona: `.select('id, client_id, is_primary').eq('id', personId).maybeSingle()`. **`client_id` si prende da qui, mai dal `formData`**: è l'unico modo di essere sicuri di togliere il principale al cliente giusto.
    2. se lo stato chiesto è già quello che c'è → `revalidatePath` e `{}` senza scrivere. Stessa ragione del tag già presente: uno `update` inutile muove `updated_at` per niente, e la pagina che chiedeva si riallinea comunque.
    3. se si sta **togliendo**: `.update({ is_primary: false }).eq('id', personId)`. Fine.
    4. se si sta **mettendo**: prima `.update({ is_primary: false }).eq('client_id', person.client_id).eq('is_primary', true)`, poi `.update({ is_primary: true }).eq('id', personId)`.
    5. `revalidatePath(\`/clienti/${person.client_id}\`)`.

    **L'ordine dei due update non è negoziabile** (AC3): l'indice unico parziale `people_one_primary_per_client_idx` ammette una sola riga con `is_primary` per cliente. Mettendo prima e togliendo dopo, la scrittura verrebbe rifiutata con `23505`. Togliendo prima, la finestra intermedia è «nessun principale», che è uno stato legittimo — nessun vincolo pretende che ce ne sia uno.

    Se il secondo update fallisce, il cliente resta senza principale: è recuperabile con un secondo tentativo, e il messaggio lo dice — `'Il contatto principale non è stato cambiato. Ricarica la pagina e riprova.'` Non si finge che sia andata bene.
  - [x] `deletePerson(_previous, formData): Promise<{ error?: string }>` — `person_id`, `.delete().eq('id', personId).select('id, client_id').maybeSingle()`, `revalidatePath` sulla scheda. La riga la filtra la policy `people_owner_all`.

    **Non è un di più fuori dalle AC.** `kb-0.md` §4: ogni tabella con dati personali ha `created_at`, `updated_at` e **un modo di cancellare davvero, non solo di nascondere**. `people` è la tabella con i dati personali del sistema — nomi, email, numeri di telefono di persone vere. Senza questa azione, una persona aggiunta per sbaglio resta per sempre, che è lo stesso argomento con cui D22 ha aperto la rinomina del nome del cliente.
  - [x] **Nessun `.eq('owner_id', …)` scritto a mano** in nessuna delle cinque: le righe le filtrano `people_owner_all` e `clients_owner_all` (`0007_rls.sql:17,22`). Un filtro a mano è ridondante e fa credere che sia lui a proteggere (D20).
  - [x] **Mai scrivere `updated_at`**: lo aggiorna il trigger `people_set_updated_at` (`0006_triggers.sql:19`).
  - [x] **Nei log non finisce mai un dato della persona.** Un nome, un'email e un numero di telefono sono dati personali di una persona fisica: nei log vanno `code` e `message` dell'errore Supabase, mai `details`, mai il valore rifiutato, mai la chiave `person_id` accanto a un valore (`kb-0.md` §3 e §4, NFR15). È la stessa regola dei tag, con più ragioni dietro.

- [x] **Task 4 — Un solo modo di chiamare un'azione dai controlli nuovi** (AC: 1, 2, 3)
  - [x] Creare `src/lib/use-write.ts`, `'use client'`. Quattro dei componenti nuovi hanno bisogno delle stesse identiche meccaniche — chiama l'azione, trasforma una rete caduta in un messaggio, tiene `pending`, non scrive stato dopo lo smontaggio — e scriverle quattro volte è la duplicazione che `kb-0.md` §9 chiede di fermare.

    ```ts
    export function useWrite(unreachable: string): {
      pending: boolean
      error: string | null
      clearError: () => void
      write: <R extends { error?: string }>(
        call: () => Promise<R>,
        onSuccess?: (outcome: R) => void,
      ) => void
    }
    ```

    `unreachable` è il messaggio della rete caduta e lo passa chi lo usa, perché cambia da azione ad azione: la 1.4 ha già stabilito che «non è stato salvato» e «non è stato tolto» non sono la stessa frase.
  - [x] **Non passa da `useActionState`**, per il motivo già scritto in `use-editable-field.ts:35-49`: un rifiuto della promessa risalirebbe al confine d'errore, che sostituisce l'intera scheda e porta via quello che c'è scritto negli altri campi (NFR1).
  - [x] La caduta si intercetta con il **secondo argomento di `.then`**, non con un `.catch()` che obbliga a un `as` per far tornare i tipi. `kb-0.md` §2: se serve un `as`, la forma è sbagliata.
  - [x] La funzione di scope di `startTransition` è **asincrona con `await`**, che è la forma corretta e che `deferred-work.md` indica come strada. I due file vecchi (`use-editable-field.ts`, `client-tags-form.tsx`) restano com'erano: sono fuori perimetro e la loro voce rimandata resta aperta. **Da verificare in sviluppo** che React 19.2 non protesti su questa forma dentro Next 16; se protesta, si prende la forma sincrona già in casa e lo si scrive nel Dev Agent Record.
  - [x] `alive` ref con `useEffect` di pulizia, come in `use-editable-field.ts:72-78`.
  - [x] Non è un candidato ai test della 1.6: è codice del browser.

- [x] **Task 5 — I componenti della scheda** (AC: 1, 2, 3, 4)

  Sette file, tutti in `src/app/(app)/clienti/[id]/`, tutti `'use client'`, ognuno una cosa sola (`kb-0.md` §2). **Nessuno di questi apre `client-field-form.tsx`, `client-tags-form.tsx` o `use-editable-field.ts`**: il primo e il secondo sono fuori perimetro, il terzo si usa così com'è.

  - [x] `person-field-form.tsx` — un campo modificabile della persona. **Usa `useEditableField`**, che è esattamente il caso per cui quel file esiste («cambia chi lo pilota, non come è fatto», `use-editable-field.ts:41`): `run` costruisce il `FormData` (`person_id`, `field`, `value`) e chiama `updatePersonField`, `baseline` è il valore memorizzato, `autosave` è vero solo per `kind === 'long'`.

    `updatePersonField` risponde `{ error?, saved? }`, che soddisfa già `SaveResult` (`use-editable-field.ts:8`): **nessun tipo nuovo e nessun adattatore**. Il `duplicateOf` di quel tipo resta semplicemente non valorizzato, perché nessun campo della persona ha un avviso di doppione.

    Rende: `<label className="label">` con `htmlFor`, poi `<textarea className="input input--long" rows={3}>` per `long`, altrimenti `<input className="input" type="text">` con `inputMode="email"` o `inputMode="tel"` secondo il `kind`, sempre `autoComplete="off"`. Sotto: l'errore in `<p className="field__error" role="alert">`, i pulsanti `Salva`/`Annulla` **solo quando il campo è cambiato**, e il `SaveIndicator` **solo** per il campo lungo (D21).

    **Gli `id` portano dentro l'`id` della persona**: `persona-${personId}-${field.key}`. Con tre persone sulla stessa pagina, la convenzione della scheda cliente (`campo-${key}`) produrrebbe tre etichette che puntano allo stesso controllo, cioè un'etichetta rotta per due persone su tre (UX-DR14).

    Nessun `kind: 'name'`, nessun avviso di doppione, nessun `kind: 'status'`: qui i campi sono sei e si comportano tutti allo stesso modo. È il motivo per cui questo file è più corto di `client-field-form.tsx` e non una sua variante.
  - [x] `person-roles-form.tsx` — i cinque ruoli. `<fieldset className="field field--group">` con `<legend className="label">Nella decisione</legend>` e cinque `<label className="check">` ognuna con la sua `<input type="checkbox">` e la sua etichetta da `DECISION_ROLES`.

    Stato locale `DecisionRole[]`, tenuto sempre nell'ordine di `DECISION_ROLES` (si ricava filtrando l'elenco, non spingendo in coda). `dirty` è il confronto dei due elenchi uniti: `local.join(',') !== stored.join(',')`. Quando è `dirty` compaiono `Salva` e `Annulla`, come per un campo corto (D21): **l'insieme si compone e poi si conferma**, e cinque scritture per cinque caselle sarebbero cinque giri di rete per una decisione sola.

    Dopo un salvataggio riuscito lo stato locale si riallinea su `saved`, che è l'elenco canonico tornato dal server.
  - [x] `person-primary-form.tsx` — una `<label className="check">` con `<input type="checkbox">` e la parola `contatto principale`. **Scrive subito**, senza `Salva`: è un interruttore, il gesto è già la decisione, ed è reversibile togliendo la spunta. È la stessa grammatica della `×` di un tag, non quella di un campo di testo.

    Nessun `SaveIndicator`: l'indicatore appartiene ai campi che si salvano da soli (D21), e qui la conferma è la spunta che resta.
  - [x] `person-remove-form.tsx` — `Elimina` in due tempi, dentro la riga stessa: il pulsante `btn--danger`, e alla pressione la riga diventa `Elimini <nome>? Non si recupera.` con `Elimina` e `Annulla`. **Nessuna finestra modale**: il progetto non ne ha una e introdurla è un pezzo di interfaccia che nessuna AC chiede.

    La conferma è obbligatoria e non è la stessa scelta dei tag: togliere un tag è reversibile in due secondi, eliminare una persona no (`kb-0.md` §6). Il verbo cambia apposta — `Togli` per un tag, `Elimina` per una persona — e resta lo stesso dal pulsante alla conferma (UX-DR13).

    `aria-label={\`Elimina ${personDisplayName(person)}\`}` sul pulsante: con tre persone sulla scheda, tre pulsanti che si chiamano tutti «Elimina» non si distinguono da un lettore di schermo. È lo stesso precedente di `Togli il tag ${tag}`.
  - [x] `new-person-form.tsx` — la creazione. I sei campi presi da `PERSON_FIELDS` più i cinque ruoli, e **un solo `Salva`**. È il percorso che si fa mentre si è al telefono: sei conferme separate per registrare una persona appena conosciuta sono sei clic di troppo.

    Campi **non controllati**, con `name={field.key}` preso da `PERSON_FIELDS` e `name="decision_roles"` su tutte e cinque le caselle, così il `formData` che arriva all'azione ha già le chiavi che l'azione si aspetta. Il modulo si azzera con `form.reset()` **solo dopo un successo**: chiamando l'azione a mano (non con `<form action={…}>`) React non ripulisce niente da solo, quindi un valore rifiutato resta dov'è insieme al suo errore, che è la regola di `new-client-form.tsx:13-16`.

    Dopo il successo il modulo si chiude e il fuoco torna sul pulsante che l'ha aperto. La conferma è la persona che compare nell'elenco.

    **`contatto principale` non è in questo modulo**: è una proprietà del cliente più che della persona (ce n'è uno solo) e ha la sua azione con il suo scambio. Si mette dopo, con una spunta.
  - [x] `person-block.tsx` — una persona: `<li className="person">` con la griglia `.detail-grid` dei sei campi (`field--wide` sulle note, come nella scheda cliente), il gruppo dei ruoli, la spunta del principale e il pulsante che elimina.
  - [x] `people-card.tsx` — la card intera: intestazione con il titolo `Persone` e il **badge numerico** (AC4), lo stato vuoto, l'elenco `<ul className="people">` dei blocchi, il pulsante `Aggiungi persona` con il modulo che apre.

    **Il badge compare solo quando c'è almeno una persona**: uno `0` accanto a un titolo non conta niente, dice solo che non c'è niente, e quello lo dice già lo stato vuoto.

    Stato vuoto (UX-DR11): `Nessuna persona ancora.` e il pulsante che ne crea una, **non** una scritta grigia. Quando l'elenco è vuoto il pulsante sta lì e non anche nell'intestazione: due pulsanti identici a dieci pixel di distanza sono uno di troppo. Il modulo di creazione compare comunque **in fondo alla card**, sotto l'elenco, da qualunque dei due pulsanti sia stato aperto: è il posto in cui la persona nuova comparirà.

    `Aggiungi persona` è **secondario**, non primario: l'azione primaria di questa schermata è il `Salva` che compare quando qualcosa è cambiato (UX-DR10). Dentro il modulo di creazione, invece, `Salva` è primario perché lì è l'unica azione.

- [x] **Task 6 — La scheda legge le persone** (AC: 1, 4)
  - [x] In `src/lib/types.ts` aggiungere `export type PersonRow = Database['public']['Tables']['people']['Row']`, accanto a `ClientRow`. Il file generato **non si tocca**: le persone ci sono già (`database.types.ts:213-268`).
  - [x] In `src/app/(app)/clienti/[id]/page.tsx`, **dopo** che la riga del cliente è confermata:

    ```ts
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, first_name, last_name, job_title, email, phone, notes, decision_roles, is_primary')
      .eq('client_id', id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    ```

    `.eq('client_id', id)` non è sicurezza — quella la fa la policy — è correttezza: senza, arriverebbero tutte le persone di tutti i clienti. L'ordine è quello di inserimento, come i tag: nessuna AC chiede un ordine diverso, e riordinare sotto gli occhi di chi guarda è peggio che non ordinare. `id` come secondo criterio rende l'ordine deterministico anche a parità di istante.
  - [x] Il tipo si deriva, non si riscrive: `type PersonDetail = Pick<PersonRow, 'id' | 'decision_roles' | 'is_primary' | PersonFieldKey>`. Se un campo entra in `PERSON_FIELDS` senza entrare nella `select`, il controllo dei tipi si ferma — è lo stesso patto già in piedi per `ClientDetail`.
  - [x] **Se la lettura fallisce, la card delle persone va in errore e la scheda resta usabile**: `<ErrorState message="Le persone non si sono caricate. Riprova fra un momento." retryHref={\`/clienti/${id}\`} />` dentro la card, e l'anagrafica sopra continua a funzionare. Non è il trattamento dei suggerimenti dei tag — quello è un aiuto che può mancare — perché qui manca del contenuto, e NFR9 chiede che ogni schermata che carica dati abbia il suo stato d'errore.
  - [x] La card delle persone si rende **dopo** quella dell'anagrafica, come seconda `.card` sorella. `page.tsx` resta com'è in tutto il resto: il controllo `isUuid` con `notFound()`, la distinzione fra sessione assente e auth irraggiungibile, `maybeSingle()`, i `console.error` con solo `code` e `message`, `ClientHeader`, `ClientError`, `ClientIdentity`, `ClientFields`, `readValue` e la query dei suggerimenti dei tag.

- [x] **Task 7 — Le classi che mancano, e solo quelle** (AC: 2, 4)
  - [x] In `src/app/globals.css`. Prima di scrivere qualsiasi cosa, verificare che non esista già: `.card`, `.field`, `.field--wide`, `.label`, `.input`, `.input--long`, `.btn`, `.btn--primary`, `.btn--secondary`, `.field__actions`, `.field__error`, `.meta`, `.data`, `.detail-grid`, `.empty`, `.error-box`, `.skeleton` ci sono tutte e si riusano.
  - [x] `.card__header`: `display: flex; align-items: center; gap: 12px; margin-bottom: 20px`, con l'azione spinta a destra. `.card__title`: 17/24 peso 600, `margin: 0` — è `--t-heading` di `design-system.md` §3. La card ha «un titolo e nient'altro nell'intestazione, salvo un'azione allineata a destra» (§5).
  - [x] `.badge` (UX-DR6): `border-radius: var(--r-sm)`, fondo `--surface-sunken`, testo `--ink`, altezza 22, `padding: 0 8px`, `font-weight: 500`. Il monospaziato arriva componendo `className="badge data"`, come il progetto già compone `input input--long` e `data save-indicator`.

    **Fondo neutro e non in tinta di sezione**: i colori di sezione vivono nella navigazione, non nel contenuto (UX-DR2). È la stessa scelta già fatta per i chip dei tag.
  - [x] `.people`: `list-style: none; margin: 0; padding: 0`. `.person`: `border-top: 1px solid var(--line); padding-top: 24px; margin-top: 24px`, e `:first-child` senza bordo né margine. Nessuna cornice: la separazione la fa la riga, come nella tabella dell'elenco.
  - [x] `.person__foot`: la riga con la spunta del principale e il pulsante che elimina — `display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px`.
  - [x] `.field--group`: `border: 0; padding: 0; margin: 0`, perché è un `<fieldset>` e il browser gliene mette di suoi. `.check`: `display: inline-flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer`, e `.checks` per il gruppo delle cinque: `display: flex; flex-wrap: wrap; gap: 8px 20px`.

    I 44px stanno sulla `<label>`, che avvolge la casella: la casella nativa è alta 13-16px, e senza l'etichetta intorno il bersaglio tattile non c'è (UX-DR14, NFR4). Nessun `appearance: none` sulla casella, per la stessa ragione per cui il selettore dello stato non ce l'ha.
  - [x] `.btn--danger`: testo `--bad`, nessun fondo, bordo trasparente; al passaggio del mouse fondo `--bad-tint` (`design-system.md` §5).
  - [x] **Nessun valore esadecimale fuori da questo file** (UX-DR16). Nessun colore di sezione e nessun colore semantico dentro il contenuto, tranne il `--bad` del pulsante distruttivo, che è un colore semantico usato per quello che significa.

- [x] **Task 8 — Lo scheletro segue la forma nuova** (AC: 4)
  - [x] In `src/app/(app)/clienti/[id]/loading.tsx`, dopo la card esistente, la seconda card: lo scheletro dell'intestazione (titolo stretto + badge) e quello del pulsante `Aggiungi persona`, alto 40 come `.btn`.
  - [x] **I blocchi delle persone non si riservano.** Un cliente senza persone non ne ha, ed è la stessa regola già applicata alla riga dei chip: si riserva lo spazio di quello che c'è sempre, non di quello che dipende dai dati. Riservarlo sposterebbe il salto dall'altra parte.
  - [x] Il resto del file non si tocca.

- [x] **Task 9 — Verifica a mano sul percorso reale** (AC: 1, 2, 3, 4)

  Le caselle dicono chi ha verificato cosa e restano vuote dove non ha verificato nessuno. Il percorso con accesso richiede una sessione che arriva per email: nessun agente può percorrerlo. Una casella spuntata per conto di terzi vale meno di una vuota (`kb-0.md` §7).

  *Verificabile dall'agente, senza sessione*
  - [x] `npm run typecheck` e `npm run build` puliti, stesse sette rotte di prima.
  - [x] `personDisplayName` sui casi limite: nome e cognome, solo nome, solo cognome, nessuno dei due (`'Persona senza nome'`), spazi ai bordi. L'esito atteso si scrive prima di eseguire, non dopo.
  - [x] `parseDecisionRoles` sui casi limite: elenco vuoto (**accettato**, vuol dire nessun ruolo); i cinque validi in ordine sparso (tornano nell'ordine di `DECISION_ROLES`); doppioni (`['decide','decide']` → `['decide']`); un valore inventato (**rifiutato**); un non-stringa dentro l'elenco (rifiutato); i cinque insieme.
  - [x] `isPersonFieldKey` risponde **falso** su `'decision_roles'`, `'is_primary'`, `'client_id'`, `'owner_id'`, `'id'`, e vero su `'first_name'` e `'notes'`. È la prova della trappola di sicurezza.
  - [x] `isUuid` sui casi limite, e le due copie della regex sparite: `grep` conferma che `UUID` è definita in un file solo.
  - [x] `person-fields.ts` e `decision-roles.ts` non importano né React né Supabase (`grep` sugli import).
  - [x] Nessun esadecimale fuori da `globals.css` (`grep` sui file toccati).
  - [x] `client-field-form.tsx`, `client-tags-form.tsx` e `use-editable-field.ts` **non compaiono nel diff**. Se ci sono, Task 5 ha preso la strada sbagliata.
  - [x] Il diff di `actions.ts` contiene solo la rimozione di `openSession` e della costante `UUID`, i due import, e il commento dell'uuid spostato al punto di chiamata come chiede Task 1. Nient'altro. *(Riformulata in revisione: la casella diceva «Nient'altro» e il commento c'era, dichiarato nel Debug Log ma non nella casella.)*
  - [x] `use-write.ts` non è stato cablato dentro `client-tags-form.tsx` né dentro `use-editable-field.ts`: quei due file restano com'erano, con la loro voce rimandata aperta.
  - [ ] Ogni file nuovo sta sotto le 200 righe (`kb-0.md` §2). *Resta vuota dopo la revisione: la divisione decisa il 4 agosto 2026 porta `people-actions.ts` da 337 a 128 righe, ma `person-edit-actions.ts` esce a 227. Tutti gli altri quattordici file nuovi stanno sotto (il più lungo è `new-person-form.tsx` a 126). Per scendere sotto 200 servirebbe una terza divisione — `setPersonPrimary` in un file suo, che è difendibile perché è l'unica azione che tocca altre righe — e quella non è stata approvata.*

  *Da percorrere con una sessione aperta*
  - [ ] Apro un cliente senza persone: vedo la card `Persone`, lo stato vuoto che dice cosa manca e il pulsante che ne crea una. Nessun badge.
  - [ ] Aggiungo una persona con il **solo nome** e salvo: compare nell'elenco, il badge dice `1`, il modulo si chiude (AC1).
  - [ ] Aggiungo una persona **senza compilare niente** e salvo: riesce, e nell'elenco c'è una persona con i campi vuoti. Nessun campo è obbligatorio (AC1).
  - [ ] Aggiungo una seconda persona compilando tutto, ruoli compresi: il badge dice `2`, l'ordine è quello in cui le ho messe.
  - [ ] Correggo il cognome di una persona: compare `Salva`, salvo, ricarico, il valore è quello nuovo.
  - [ ] Scrivo nelle note di una persona e aspetto tre secondi senza toccare niente: l'indicatore dice `Salvato alle …`. Poi scrivo e clicco subito su un altro campo: il salvataggio parte lo stesso (D21).
  - [ ] Assegno **tre ruoli** a una persona, salvo, ricarico: sono ancora tre e le parole a schermo sono quelle italiane, non `puo_bloccare` (AC2).
  - [ ] Tolgo tutti i ruoli e salvo: resta senza ruoli, senza errori.
  - [ ] Segno la prima persona come `contatto principale`. Poi segno la seconda: **la prima si spegne da sola** e nessun errore compare. Ricarico: il principale è la seconda (AC3).
  - [ ] Tolgo la spunta al principale: il cliente resta senza principale e non succede niente di brutto.
  - [ ] Elimino una persona: la conferma appare in linea, `Annulla` la fa sparire senza toccare niente, `Elimina` la toglie davvero. Ricarico: è sparita, e il badge è sceso di uno.
  - [ ] Su un cliente `chiuso` o `perso`: aggiungere, modificare, segnare il principale ed eliminare riescono identici. Nessuno stato blocca niente (NFR8, D14).
  - [ ] Aggiungo una persona e torno all'elenco: il cliente **non** è saltato in cima, perché `clients.updated_at` non si è mosso. È voluto (vedi le Dev Notes).
  - [ ] Tolgo la rete e provo a salvare un campo di una persona: compare il messaggio che dice cosa fare, il testo resta nel campo, rimetto la rete e il salvataggio funziona.
  - [ ] Larghezza 375px: la griglia dei campi passa a una colonna, le caselle dei ruoli vanno a capo, ogni bersaglio resta toccabile a 44px, la card non scorre di lato (NFR4, UX-DR14).
  - [ ] Da tastiera: si arriva a ogni campo, a ogni casella e a ogni pulsante, si aggiunge una persona senza mouse, e il fuoco si vede sempre.
  - [ ] Con il lettore di schermo: ogni campo ha la sua etichetta e le etichette **non si confondono fra una persona e l'altra**; il pulsante che elimina si annuncia con il nome della persona; il gruppo dei ruoli si annuncia come gruppo.
  - [ ] Nessun errore in console.

### Review Findings

*Revisione del 4 agosto 2026, tre passate in parallelo: adversarial, edge case, aderenza alla spec. Sedici rilievi tenuti, tre scartati come rumore (la persona interamente vuota è chiesta da AC1; il campo assente in creazione è legittimo, al contrario del campo assente in correzione; `canonical()` che filtra un ruolo sconosciuto è irraggiungibile finché il `check` della tabella regge).*

- [x] **[Review][Patch] La spunta `contatto principale` torna indietro al clic** [`src/app/(app)/clienti/[id]/person-primary-form.tsx:29-30`] — `checked={isPrimary}` non ha stato locale: al clic `setPending(true)` fa rirendere prima di qualsiasi rete, React ripristina la casella al valore vecchio e la disabilita. Per tutto il giro di rete lo schermo dice il contrario di quello che è stato chiesto. Task 5 promette che «la conferma è la spunta che resta», e la spunta non resta. **Deciso da Luca il 4 agosto 2026: stato ottimistico locale.** La spunta si accende subito e torna indietro solo se il server dice di no. Supera la scelta dichiarata nelle Completion Notes («mostra quello che è salvato, non quello che è stato chiesto»), che va riscritta di conseguenza.
- [x] **[Review][Patch] Lo scheletro riserva il badge e il pulsante, che esistono solo con almeno una persona** [`src/app/(app)/clienti/[id]/loading.tsx:66-73`] — Task 8 dice due cose incompatibili: il primo punto chiede titolo + badge + pulsante, il secondo dice di riservare «lo spazio di quello che c'è sempre, non di quello che dipende dai dati». Badge e pulsante d'intestazione si rendono solo con `count > 0` (`people-card.tsx:43,45`): su un cliente senza persone lo scheletro promette un'intestazione piena e arriva un titolo più un blocco `.empty`. **Deciso da Luca il 4 agosto 2026: solo il titolo**, che è l'unica cosa sempre presente. Il primo punto di Task 8 va riscritto.
- [x] **[Review][Patch] `people-actions.ts` è a 337 righe** — è l'unica casella di Task 9 lasciata vuota fra quelle verificabili senza sessione, ed è la domanda 5 che la story pone. **Deciso da Luca il 4 agosto 2026: si divide**, `createPerson` + `deletePerson` da una parte, le tre modifiche dall'altra. Il limite di `kb-0.md` §2 resta com'è scritto.

- [x] **[Review][Patch] `Annulla` sul campo Note di una persona salva invece di scartare** [`src/app/(app)/clienti/[id]/person-field-form.tsx:91`] — manca `onMouseDown={keepFocus}` sui due pulsanti, che `client-field-form.tsx:154,161` mette proprio per questo. Su Safari, Firefox e iPad un pulsante non prende il fuoco al clic: la textarea va in `blur` con `relatedTarget === null`, la guardia di `use-editable-field.ts:179` è falsa e si cade su `if (autosave && dirty && !pending) write(value)`. Il testo che `Annulla` doveva buttare via finisce nel database. Peggio: quel `write` mette `pending`, e qui `Annulla` è `disabled={state.pending}` — a differenza di `ClientFieldForm` — quindi il `click` non arriva nemmeno e `cancel()` non gira mai.
- [x] **[Review][Patch] Il fuoco si perde dopo aver aggiunto la prima persona, e lo stato vuoto resta a schermo sopra il modulo** [`src/app/(app)/clienti/[id]/people-card.tsx:27-34,59-66,76`] — il commento dice che uno dei due pulsanti «resta sempre montato», e questo è vero tranne nella transizione 0→1, che è la prima che si incontra su un cliente nuovo: `close()` mette il fuoco sul pulsante dello stato vuoto, poi la rivalidazione porta `count` a 1, quel pulsante si smonta e il fuoco cade su `<body>`. Nella direzione opposta, eliminando l'ultima persona, nessuno riporta il fuoco da nessuna parte. In più `count === 0` e `adding` sono condizioni indipendenti: con il modulo aperto su un cliente senza persone si vedono insieme «Nessuna persona ancora.», un secondo `Aggiungi persona` e il modulo in compilazione.
- [x] **[Review][Patch] `setPersonPrimary` racconta una cosa diversa da quella successa** [`src/app/(app)/clienti/people-actions.ts:282-290`] — se la seconda scrittura fallisce, o se la riga sparisce fra la lettura e la scrittura, il precedente principale **è già stato tolto**: il contatto principale è cambiato, da qualcuno a nessuno. `PRIMARY_NOT_CHANGED` dice «non è stato cambiato» e `PERSON_GONE` parla di tutt'altro. Il commento a riga 283 sa già come stanno le cose e la riga sotto restituisce comunque la frase sbagliata. Serve una seconda costante per il ramo in cui la prima scrittura è passata.
- [x] **[Review][Patch] `Elimina` in due tempi distrugge il fuoco e non annuncia la conferma** [`src/app/(app)/clienti/[id]/person-remove-form.tsx:42-70`] — il ternario alterna un `<button>` e un Fragment, quindi React smonta il pulsante premuto e il fuoco finisce su `<body>`, sia entrando nella conferma sia uscendone con `Annulla`. La domanda `Elimini …? Non si recupera.` è un `<p className="meta">` senza `role`, senza `aria-live` e senza `aria-describedby` sui pulsanti: da lettore di schermo si preme `Elimina`, non si sente niente e si è persa la posizione. Il file cura l'etichetta accessibile del pulsante e lascia scoperta la conferma di un'azione irreversibile su dati personali.
- [x] **[Review][Patch] `createPerson` non distingue il cliente sparito dal guasto passeggero** [`src/app/(app)/clienti/people-actions.ts:89-92`] — se il cliente viene eliminato fra il controllo di proprietà e l'`insert`, la chiave esterna risponde `23503` e finisce nel ramo generico: il messaggio è «Riprova fra un momento», cioè un invito a insistere su un'operazione che non riuscirà mai più. La frase giusta, `CLIENT_GONE`, è già due righe sopra.
- [x] **[Review][Patch] Il Dev Agent Record afferma due cose che il codice smentisce** — (a) lo scostamento n.3 motiva lo spostamento di `PersonDetail` con «lo leggono tre moduli — la pagina, `people-card.tsx` e `person-block.tsx`», ma `page.tsx` non lo importa: ci compare solo dentro un commento (`page.tsx:18`). Lo spostamento resta difendibile per i due componenti, la ragione scritta no. (b) La casella di Task 9 «Il diff di `actions.ts` contiene solo la rimozione di `openSession` e della costante `UUID`, più i due import. Nient'altro» è falsa: c'è anche un commento di tre righe dentro `updateClientField` (`actions.ts:121-123`), che Task 1 chiedeva e il Debug Log dichiara. O si riformula la casella, o non si spunta.
- [x] **[Review][Patch] Quattro scostamenti minori dal testo dei task, nessuno dichiarato** — `autoFocus={field.key === 'first_name'}` (`new-person-form.tsx:88`) non lo chiede nessuna riga della story; il `<fieldset>` porta `className="field--group"` e non `field field--group` come scrive Task 5, con `field` spostata sul `<form>` (`person-roles-form.tsx:64,70` e `new-person-form.tsx:96`); `updatePersonField` e `deletePerson` fanno `.select('client_id')` dove Task 3 scrive `.select('id, client_id')`; tre regole CSS portano proprietà oltre l'elenco di Task 7 (`.person` con `display:flex/column/gap:20px`, `.field--group` con `display:flex/column/gap:8px/min-width:0`, `.card__header .btn` con `margin-left:auto`), mentre le Completion Notes ne dichiarano due sole. Tutti innocui: vanno annotati, non corretti.
- [x] **[Review][Patch] Il commento di `use-write.ts:48-50` va verificato prima di restare** — afferma che «anche gli aggiornamenti di stato che arrivano dopo la risposta restano dentro la transizione». React 19 documenta il contrario per le transizioni asincrone: gli aggiornamenti dopo un `await` non sono automaticamente marcati come transizione se non si rientra in `startTransition`. La conseguenza pratica è trascurabile — `setPending(false)` diventa urgente invece che differito — ma un commento che dice il falso è peggio di nessun commento. Va insieme alla verifica in anteprima che Task 4 chiedeva e che le Completion Notes dichiarano non fatta.

- [x] **[Review][Defer] `PERSON_GONE` esce senza rivalidare: la riga fantasma resta interattiva** [`people-actions.ts:151,198,332`] — rimandato: senza la riga non c'è `client_id`, e prenderlo dal browser è proprio quello che la story vieta. Il messaggio dice già «Ricarica la pagina».
- [x] **[Review][Defer] Lo stato locale dei ruoli non si risincronizza quando il dato cambia da fuori** [`person-roles-form.tsx:27`] — rimandato: è la stessa voce già aperta su `use-editable-field.ts:60`, da chiudere in una passata sola su tutti i campi.
- [x] **[Review][Defer] Nessun limite di attesa in `useWrite`** [`use-write.ts:56`] — rimandato: `use-editable-field.ts:91` ha la stessa forma, e la voce va aperta su entrambi insieme.
- [x] **[Review][Defer] Lo stato d'errore della card non lascia nessun modo di aggiungere una persona** [`people-card.tsx:52-57`] — rimandato: con `people === null` nessuno dei due pulsanti si rende, e `Riprova` è un `<Link>` alla rotta già aperta, che è il comportamento di `ErrorState` ovunque nel progetto.
- [x] **[Review][Defer] Nessun limite di lunghezza sui sei campi della persona** [`people-actions.ts:77,132`] — rimandato: Task 1 lo dichiara voluto e la domanda 6 lo conferma, ma resta l'asimmetria con `name` (200) e i tag (40), e `kb-0.md` §3 chiede uno schema sul server.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story.** La tabella `people` esiste dal primo giorno, con i suoi vincoli e la sua policy.

| Pezzo | Dove | Stato |
|---|---|---|
| Tabella `people` con i sei campi, `decision_roles`, `is_primary` | `supabase/migrations/0003_people.sql` | applicata |
| `check (decision_roles <@ array[...])`, i cinque valori ammessi | `0003_people.sql:14` | applicato |
| Indice unico parziale `people_one_primary_per_client_idx` | `0003_people.sql:27` | **è il vincolo di AC3** |
| Indice `people_client_idx` | `0003_people.sql:23` | applicato |
| Policy `people_owner_all`, valida anche in scrittura | `0007_rls.sql:22` | attiva |
| Trigger `people_set_updated_at` | `0006_triggers.sql:19` | attivo |
| Tipi generati per `people` | `src/lib/database.types.ts:213-268` | pronti, **non si modificano a mano** |
| `useEditableField`, la macchina di un campo che si salva | `src/lib/use-editable-field.ts` | **esiste: si usa così com'è** |
| `SaveIndicator` nei suoi tre stati | `src/components/save-indicator.tsx` | **esiste: si usa così com'è** |
| `ErrorState` | `src/components/error-state.tsx` | pronto |
| `normalizeTextValue` | `src/lib/client-fields.ts:75` | **esiste: si importa, non si copia** |
| `openSession` | `src/app/(app)/clienti/actions.ts:517` | **si sposta in un file suo (Task 2)** |
| La regex `UUID`, in due copie | `[id]/page.tsx:21`, `actions.ts:502` | **si unifica (Task 1)** |
| `.card`, `.field`, `.detail-grid`, `.input`, `.btn`, `.empty` | `src/app/globals.css` | pronte |
| `ClientFieldForm`, `ClientTagsForm` | `[id]/client-field-form.tsx`, `[id]/client-tags-form.tsx` | **fuori perimetro: non si aprono** |

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/person-fields.ts` — i sei campi, l'allow-list, il nome da mostrare. Puro.
- `src/lib/decision-roles.ts` — i cinque ruoli con le loro etichette, la validazione. Puro.
- `src/lib/uuid.ts` — la regola dell'uuid, da due copie a una. Puro.
- `src/lib/supabase/session.ts` — `openSession`, spostata senza modifiche.
- `src/lib/use-write.ts` — chiamare un'azione dai controlli che non sono campi di testo.
- `src/app/(app)/clienti/people-actions.ts` — le cinque azioni delle persone.
- `src/app/(app)/clienti/[id]/people-card.tsx` — la card, il badge, lo stato vuoto, l'elenco.
- `src/app/(app)/clienti/[id]/person-block.tsx` — una persona.
- `src/app/(app)/clienti/[id]/person-field-form.tsx` — un campo di una persona.
- `src/app/(app)/clienti/[id]/person-roles-form.tsx` — i cinque ruoli.
- `src/app/(app)/clienti/[id]/person-primary-form.tsx` — la spunta del contatto principale.
- `src/app/(app)/clienti/[id]/person-remove-form.tsx` — `Elimina` in due tempi.
- `src/app/(app)/clienti/[id]/new-person-form.tsx` — la creazione, un solo `Salva`.

**Modificati**
- `src/lib/types.ts` — una riga: `PersonRow`.
- `src/app/(app)/clienti/actions.ts` — **solo** l'uscita di `openSession` e della costante `UUID`, sostituite da due import. Nessun cambiamento di comportamento.
- `src/app/(app)/clienti/[id]/page.tsx` — la query delle persone, il tipo, la seconda card. Nient'altro.
- `src/app/(app)/clienti/[id]/loading.tsx` — lo scheletro della seconda card.
- `src/app/globals.css` — `.card__header`, `.card__title`, `.badge`, `.people`, `.person`, `.person__foot`, `.field--group`, `.checks`, `.check`, `.btn--danger`.

**Riusati senza modifiche, e da non riscrivere**
`src/lib/use-editable-field.ts`, `src/lib/client-fields.ts` (solo importata), `src/lib/client-status.ts`, `src/lib/client-tags.ts`, `src/lib/format-date.ts`, `src/components/save-indicator.tsx`, `src/components/error-state.tsx`, `src/components/status-pill.tsx`.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/{client,server,env}.ts`, `supabase/migrations/*`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/page.tsx`, `src/app/(app)/clienti/loading.tsx`, `src/app/(app)/clienti/nuovo/*`, `src/app/(app)/clienti/[id]/client-field-form.tsx`, `src/app/(app)/clienti/[id]/client-tags-form.tsx`.

### Le due decisioni di questa story

**1. Le persone si compilano con un modulo solo e si correggono un campo per volta.**

La 1.4 ha deciso che i tag non sono un campo della famiglia di `ClientFieldForm`. Le persone invece **sono** fatte di campi di quella famiglia: sei valori di testo, ognuno con la sua etichetta, ognuno che si sovrascrive. Quindi si usa la macchina che esiste — `useEditableField` — e non se ne costruisce una seconda.

Ma la creazione non passa da lì, e il motivo è il gesto, non la teoria: registrare una persona appena conosciuta mentre si è al telefono, confermando sei campi uno alla volta, sono sei clic per una cosa sola. Il modulo di creazione ha un `Salva` unico, come `new-client-form.tsx`; la correzione, che è un campo per volta e arriva giorni dopo, resta un campo per volta con la sua conferma (D21).

Conseguenza da tenere ferma: le note della persona sono un campo lungo e **si salvano da sole** quando si correggono, mentre nel modulo di creazione no, perché lì non esiste ancora una riga da aggiornare. Non è una deroga a D21: è la stessa distinzione già in piedi fra `/clienti/nuovo` e la scheda.

**2. Le azioni delle persone stanno in un file nuovo, e `actions.ts` non si divide.**

La revisione della 1.4 ha lasciato aperta la misura: `actions.ts` è a 566 righe e le persone porterebbero cinque azioni, cioè verso le novecento. Si sceglie la strada minima che chiude il problema senza aprirne un altro:

- le azioni nuove vanno in `people-actions.ts`, che nasce a misura;
- `actions.ts` **non si riorganizza**: dividere un file uscito da quattro revisioni è un refactor non concordato (`kb-0.md` §9), e nessuna riga di questa story ne ha bisogno;
- si spostano fuori solo le due cose che servono a entrambi i file — `openSession` e la regex dell'uuid — perché l'alternativa sarebbe copiarle, cioè la duplicazione silenziosa che `kb-0.md` §9 chiede di fermare.

### La trappola di sicurezza di questa story

È la più seria incontrata finora, e non si vede leggendo lo schema.

**`people` ha la sua policy, ma la chiave esterna verso `clients` non passa dalla policy di `clients`.** `people_owner_all` verifica una cosa sola: che `people.owner_id` sia il mio. Un `insert` con il mio `owner_id` e il `client_id` **di un altro proprietario** soddisfa la policy, e il vincolo di chiave esterna lo accetta, perché la verifica di integrità referenziale non è soggetta alla sicurezza a livello di riga. Il risultato è una scrittura dentro il cliente di qualcun altro.

Con un utente solo non succede niente. Il giorno che gli utenti sono due, è un buco vero, e va chiuso adesso, mentre il codice si scrive:

1. **`createPerson` legge il cliente prima di scrivere.** `.from('clients').select('id').eq('id', clientId).maybeSingle()`: quella lettura passa da `clients_owner_all`, quindi risponde a vuoto se il cliente non è mio. È l'unico punto in cui un `client_id` arriva dal browser.
2. **`client_id` non è nell'allow-list dei campi.** `isPersonFieldKey('client_id')` deve rispondere falso, come `owner_id`, `is_primary` e `decision_roles`. Senza, `updatePersonField` sposterebbe una persona sotto il cliente di un altro con una richiesta sola.
3. **Le altre quattro azioni non ricevono mai un `client_id`.** Lo ricavano dalla riga della persona, che la policy ha già filtrato. Vale in particolare per `setPersonPrimary`, che tocca *altre* righe: prendere il `client_id` dal browser vorrebbe dire lasciar scegliere a chi chiama a quale cliente togliere il contatto principale.
4. **`decision_roles` si valida contro il vocabolario chiuso**, sul server, prima di comporre qualsiasi cosa. Il `check` della tabella è l'ultima difesa, non la prima: da lì il messaggio arriverebbe in inglese e parlerebbe di un vincolo (NFR10).
5. **Nei log non finisce nessun dato della persona.** Nomi, email e telefoni di persone fisiche sono la categoria più sensibile che questo software tratta (`kb-0.md` §4, NFR15).

### Quello che non si rivalida, e perché

Le azioni delle persone chiamano `revalidatePath` **solo sulla scheda del cliente**, mai su `/clienti`.

I tag lo facevano per due ragioni insieme: sono una colonna dell'elenco, e la scrittura sposta `clients.updated_at`, che oggi è l'ordinamento. Qui nessuna delle due vale: le persone non compaiono nell'elenco, e scrivere su `people` non tocca `clients.updated_at`, perché il trigger è per tabella.

Conseguenza visibile: **aggiungere una persona non fa salire il cliente in cima all'elenco.** È corretto e va lasciato così anche dopo la Story 1.6: `database.md` §5 definisce l'ultima attività come il maggiore fra `clients.updated_at` e l'ultima modifica delle **schede**, e le persone non ci entrano. Chi lo trovasse strano non lo sta guardando come un difetto da correggere: è la definizione.

### Tipi: `any` è vietato

`tsconfig.json` ha `strict` e `noUncheckedIndexedAccess`.

- `PersonRow['decision_roles']` è `string[]` nei tipi generati, non `DecisionRole[]`: il restringimento avviene nei componenti e nelle azioni, con `isDecisionRole`, esattamente come `StatusPill` restringe `status`. Il file generato non si tocca.
- `DecisionRolesResult` e ogni altro esito è una **union discriminata**, non un oggetto con campi opzionali: con `{ ok?, value?, message? }` esistono combinazioni impossibili e prima o poi il codice ne rende una.
- `personDisplayName` prende `{ first_name: string | null; last_name: string | null }` e non `PersonRow`: ha bisogno di due colonne, e chiedere la riga intera legherebbe un modulo puro allo schema. È la stessa regola già applicata a `collectTagSuggestions`.
- `useWrite` è generico sul risultato dell'azione (`<R extends { error?: string }>`), così ogni chiamante riceve indietro il proprio tipo — per esempio il `saved: string[]` dei ruoli — senza nessun `as`.
- Nessun `as` per far passare i tipi. Se serve, la forma è sbagliata.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `insert` su `people` senza verificare il cliente | Una persona scritta dentro il cliente di un altro proprietario | `createPerson` legge prima il cliente, che passa dalla policy |
| `client_id` o `is_primary` dentro `PERSON_FIELDS` | Una richiesta sola sposta una persona sotto un altro cliente | Allow-list stretta, provata in Task 9 |
| `is_primary` messo prima di togliere il precedente | `23505`, l'indice unico parziale rifiuta la scrittura | Prima si toglie, poi si mette |
| `client_id` per lo scambio preso dal `formData` | Si toglie il principale al cliente sbagliato | Si legge dalla riga della persona |
| `decision_roles` scritto senza togliere i doppioni | Il `check` è un test di sottoinsieme e `['decide','decide']` passa | `parseDecisionRoles` deduplica e ordina |
| Un ruolo fuori vocabolario scartato in silenzio | Una richiesta malformata trattata come valida | Si rifiuta, come uno stato fuori dai cinque |
| `id` dei campi senza l'`id` della persona | Tre etichette che puntano allo stesso controllo | `persona-${personId}-${key}` |
| `revalidatePath('/clienti')` copiato dai tag | Rivalidazione di una pagina in cui non cambia niente | Solo la scheda |
| Nome e cognome ripetuti in un titolo sopra i campi | Due rappresentazioni dello stesso valore a dieci pixel | Il nome è il campo, l'etichetta accessibile sta sul pulsante |
| `useActionState` per le azioni nuove | Una rete caduta risale al confine d'errore e porta via la scheda | `useWrite`, chiamata a mano dentro `startTransition` |
| `<form action={…}>` nel modulo di creazione | React ripulisce i campi a fine invio e un valore rifiutato sparisce | Chiamata a mano, `reset()` solo dopo il successo |
| `type="email"` sul campo email | Il browser rifiuta con parole sue un'email scritta a metà | `type="text"` con `inputMode="email"` |
| Casella di controllo senza etichetta che la avvolge | Bersaglio tattile da 16px su un tablet | `.check` alta 44px, la casella dentro la `<label>` |
| `Elimina` senza conferma | Un dato personale sparisce con un clic e non torna | Conferma in linea, in due tempi |
| Conferma anche per la spunta del principale | Cerimonia su un'azione reversibile (`kb-0.md` §6) | Scrive subito |
| `SaveIndicator` sotto i ruoli o sotto la spunta | Racconta un salvataggio automatico che non c'è (D21) | Nessun indicatore: solo sotto le note |
| `openSession` esportata da un file `'use server'` | Un endpoint che restituisce un client Supabase | Sta in un file senza `'use server'` |
| `details` dell'errore Supabase nei log | Contiene valori della riga, cioè dati personali | Solo `code` e `message` |

### Una conseguenza che arriva con l'Epic 3

`assessments.interviewee_id` punta a `people(id)` con `on delete set null` (`database.md` §3). Oggi non esiste nessuna scheda di prequalifica, quindi eliminare una persona non porta via niente. Dal giorno in cui l'Epic 3 esiste, eliminare una persona **azzera l'interlocutore delle schede in cui compariva**, senza avvisare.

Non si costruisce niente adesso per questo — sarebbe la macchina prima del problema (`kb-0.md` §9) — ma la riga di conferma di `deletePerson` è il posto in cui, quel giorno, andrà detto. Va guardata quando si scrive la Story 3.1.

### Contratto visivo

- La card delle persone è la **seconda** della scheda, sorella di quella dell'anagrafica: stesso fondo, stesso raggio, stessa ombra, nessun bordo (UX-DR3).
- Il badge è **neutro e in monospaziato** (UX-DR6, UX-DR12): fondo `--surface-sunken`, cifra in `--font-data`. Nessun colore di sezione nel contenuto (UX-DR2).
- Le persone si separano con una riga da 1px, non con cornici: la densità sta nella tipografia e nell'allineamento.
- `Aggiungi persona` è **secondario**; l'unica azione primaria della schermata resta il `Salva` che compare quando qualcosa è cambiato (UX-DR10). Dentro il modulo di creazione il primario è il suo `Salva`.
- `Elimina` è l'unico distruttivo del progetto: testo `--bad`, fondo in tinta al passaggio, **solo con conferma** (`design-system.md` §5).
- Voce: italiano, frase minuscola, voce attiva. Le etichette nominano le cose come le riconosce chi le usa — `Ruolo in azienda` e non `ruolo aziendale`, `Nella decisione` con sotto `decide` e `può bloccare`, mai `decision_roles` né `puo_bloccare` (UX-DR13, AC2). L'azione si chiama allo stesso modo dal pulsante alla conferma: `Elimina` → `Elimini …?` → `Elimina`.
- I quattro stati della card (NFR9, UX-DR11): pieno l'elenco, vuoto una riga che dice cosa manca e il pulsante che la crea, in caricamento gli scheletri della forma reale, in errore il riquadro con `Riprova`.
- Bersagli tattili di almeno 44px su campi, caselle e pulsanti; ogni campo con la sua etichetta vera (UX-DR14, NFR4).
- Nessun esadecimale fuori da `globals.css` (UX-DR16).

**Due discordanze già presenti, che questa story non corregge:** `.input:focus` illumina in `--sec-prequalifica` invece della tinta della sezione corrente, e `.btn` è alto 40px invece di 44. Valgono anche per i controlli nuovi. Restano alla **Story 5.2** per decisione del 2 agosto 2026 (`deferred-work.md`).

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione.** Tutto quello che serve è applicato dal primo giorno.
- **Le persone non compaiono nell'elenco clienti** e non ne cambiano le colonne: quel file non si apre.
- **Nessun riordino delle persone**, nessun trascinamento, nessuna posizione: l'ordine è quello di inserimento, come per i tag.
- **Nessun collegamento fra persona e scheda di prequalifica**: `interviewee_id` è dell'**Epic 3**.
- **Nessuna validazione di formato su email e telefono**, nessun `mailto:` e nessun `tel:` cliccabili: non li chiede nessuna AC.
- **Nessuna rubrica globale**, nessuna pagina «tutte le persone», nessuna persona condivisa fra due clienti. L'azienda è il contenitore (D13).
- **Nessun conteggio delle persone nell'elenco clienti**: il badge sta nella scheda, dove AC4 lo chiede.
- **Nessun test automatico**: il comando che li esegue arriva con la **Story 1.6**. Qui l'obbligo è che i tre moduli puri restino puri ed esportati.
- **`actions.ts` non si riorganizza**, `client-tags-form.tsx` non si divide: la sua misura sopra le 200 righe resta una voce da guardare, non un lavoro di questa story.
- **Nessuna delle voci di `deferred-work.md` viene chiusa**, tranne quella dell'uuid duplicato, che Task 1 chiude alla condizione già scritta nella voce stessa.

### Test

Non esiste ancora un comando che esegua i test: introdurlo è la **Story 1.6**. Qui l'unico obbligo è che `person-fields.ts`, `decision-roles.ts` e `uuid.ts` non importino né React né Supabase e che esportino tutto quello che la 1.6 vorrà provare.

I candidati veri sono due: **`parseDecisionRoles`**, che è un permesso — decide quali valori entrano in una colonna vincolata — e **`personDisplayName`**, che è una trasformazione usata in un'etichetta accessibile. È esattamente la logica che `kb-0.md` §7 chiede di mettere sotto test: calcoli, trasformazioni, permessi.

La verifica di questa story è la prova a mano di Task 9. Il codice si considera non funzionante finché non lo si è visto funzionare.

### Project Structure Notes

```
src/lib/
├── client-fields.ts        invariato (normalizeTextValue si importa da qui)
├── decision-roles.ts       NUOVO — i cinque ruoli con le etichette. Puro.
├── person-fields.ts        NUOVO — i sei campi, allow-list, nome da mostrare. Puro.
├── types.ts                + PersonRow
├── use-editable-field.ts   invariato — lo usa person-field-form.tsx
├── use-write.ts            NUOVO — chiamare un'azione dai controlli non testuali
├── uuid.ts                 NUOVO — da due copie a una
└── supabase/
    └── session.ts          NUOVO — openSession, spostata da actions.ts

src/app/(app)/clienti/
├── page.tsx                invariato
├── actions.ts              − openSession, − UUID, + due import. Nient'altro.
├── people-actions.ts       NUOVO — create, updateField, updateRoles, setPrimary, delete
└── [id]/
    ├── page.tsx            + query delle persone, + seconda card
    ├── loading.tsx         + scheletro della seconda card
    ├── client-field-form.tsx  invariato
    ├── client-tags-form.tsx   invariato
    ├── people-card.tsx        NUOVO — card, badge, stato vuoto, elenco
    ├── person-block.tsx       NUOVO — una persona
    ├── person-field-form.tsx  NUOVO — un campo, su useEditableField
    ├── person-roles-form.tsx  NUOVO — i cinque ruoli, con conferma
    ├── person-primary-form.tsx NUOVO — la spunta del principale
    ├── person-remove-form.tsx  NUOVO — Elimina in due tempi
    └── new-person-form.tsx     NUOVO — la creazione, un solo Salva
```

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Nomi in inglese nel codice, in italiano nell'interfaccia.

Sette componenti e non uno solo: è la ragione per cui il limite delle 200 righe si rispetta senza sforzo, e ognuno fa una cosa che si legge dal nome. Il precedente in casa è la scheda cliente, che ha un componente per il campo e uno per i tag.

Nessuna dipendenza nuova. In particolare nessuna libreria di form, di validazione, di gruppi di caselle o di finestre modali: quello che serve sono `<input type="checkbox">`, `<fieldset>` e due pulsanti (`kb-0.md` §2).

### Piattaforma in uso, verificata

Da `package.json` alla data di creazione della story: Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata in questa story, e non ne entra nessuna nuova.

Conseguenze che contano qui:

- Un modulo con `'use server'` in testa può esportare **solo funzioni asincrone**, e ognuna diventa un punto di ingresso raggiungibile dal browser. È il motivo per cui `openSession` e `UUID` escono da `actions.ts` invece di essere esportate da lì (Task 2).
- Quello che arriva dal `FormData` non è attendibile, mai. `formData.getAll('decision_roles')` restituisce un elenco di `FormDataEntryValue`, che può contenere anche file: `parseDecisionRoles` riceve `readonly unknown[]` e verifica ogni voce.
- `revalidatePath` è l'unico modo con cui una scrittura si riflette sulla schermata. Chiamata a mano, va dentro `startTransition`.
- `.update({ decision_roles: [...] })` su una colonna `text[]`: supabase-js manda l'array come JSON e PostgREST lo converte. Nessuna sintassi `{a,b}` a mano.
- `.order()` funziona anche su una colonna che non compare nella `select`: `created_at` ordina senza dover essere letta.
- `useActionState` viene da `react`, ma in questo progetto le scritture della scheda **non ci passano**: chiamano l'azione a mano dentro `startTransition`, per decisione presa in revisione il 3 agosto 2026 (`use-editable-field.ts:35-49`). Non tornare indietro.
- React 19 accetta una funzione di scope asincrona in `startTransition`. È la forma che `deferred-work.md` indica come corretta e che `use-write.ts` adotta. **Da verificare in sviluppo**: se in questa combinazione di versioni si comporta diversamente da come è documentato, si prende la forma sincrona già usata nel progetto e lo si scrive nel Dev Agent Record. Non si dà per verificato quello che non si è visto.

### Intelligence dai commit

Da `34a6a2e` (Story 1.4, implementazione e revisione) e `d10eaa1` (Story 1.3), le abitudini che questa story eredita:

- **Le azioni riusano `openSession`, la regola dell'uuid e lo stesso trattamento degli errori.** Non se ne scrive una copia: qui si va oltre e si smette di averne due.
- **Nei log `code` e `message`, mai `details`**, e mai il valore rifiutato.
- **`maybeSingle` e non `single`**: con la sicurezza a livello di riga attiva, la riga di un altro proprietario e una riga cancellata arrivano identiche, cioè zero righe.
- **Le azioni della scheda non reindirizzano mai**, nemmeno a sessione finita: un messaggio che dice cosa fare, e basta.
- **La guardia sul valore mandato.** La correzione più pesante della 1.4 è stata `setDraft('')` incondizionato, che portava via quello che si scriveva durante l'attesa. Dove un modulo si azzera dopo una risposta — qui è `new-person-form.tsx` — vale la stessa regola: si azzera solo quello che non è stato toccato nel frattempo.
- **Quello che riguarda la resa va provato sull'anteprima, non dedotto.** La story 1.4 ha sbagliato tre volte su dettagli visivi non visti resi.
- **Task 9 si divide in due**: quello che l'agente può verificare e quello che richiede una sessione. Le seconde restano vuote finché non le percorre Luca, e la story non va a `done` prima.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

Le voci ancora aperte in `deferred-work.md` riguardano `.btn` a 40px, l'alone del focus, l'hover di riga nell'elenco, il ramo d'errore dell'elenco senza pulsante, i `metadata` mancanti sulle rotte, la finestra dei tre secondi del salvataggio automatico, i due campi lunghi che possono far tornare indietro `baseline`, lo stato fuori dai cinque, il `save()` che non controlla `dirty`, i cinque ternari del campo modificabile, il `maxLength` che tronca in silenzio, la normalizzazione Unicode mancante, la query dei suggerimenti senza `.limit()`, gli aggiornamenti fuori da `startTransition` e la corsa lettura-scrittura sui tag. **Nessuna di queste viene chiusa da questa story tranne quella dell'uuid duplicato, e nessuna peggiora.**

Due però vanno guardate mentre si scrive, perché il codice nuovo le sfiora:

- **Un `baseline` che cambia non risincronizza `value`** (`use-editable-field.ts:60`). Con più persone sulla stessa scheda i campi sono più numerosi, ma lo scenario resta lo stesso — la stessa scheda aperta in due posti — e con un utente solo resta raro. Non peggiora: peggiora il numero di campi, non il difetto.
- **`save()` non controlla `dirty`.** Vale identico per i campi nuovi. Resta la stessa voce, da chiudere in una passata sola su tutti i campi.

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.5: Registrare le persone e chi decide]
- FR5, FR6, FR7 e i campi della persona: [Source: docs/prd-v1.md#3. Entità e campi]
- Tabella `people`, `check` sui ruoli, indice unico parziale del contatto principale: [Source: docs/database.md#3. Tabelle]
- Policy, trigger, e il perché la protezione sta nel database: [Source: docs/database.md#6. Protezione degli accessi, due varianti], [Source: docs/database.md#4. Aggiornamento automatico di updated_at]
- Badge numerico, pulsante distruttivo, i quattro stati, bersagli tattili, voce dell'interfaccia: [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#6. I quattro stati di ogni schermata], [Source: docs/design-system.md#7. Voce dell'interfaccia], [Source: docs/design-system.md#8. Accessibilità]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#4. Dati personali], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica], [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Decisioni: **D13** (l'azienda è il contenitore, le persone sono voci sotto, ruoli multipli), **D14** (il software non blocca niente), **D21** (quando un campo si salva da solo e quando si conferma), **D22** (l'anagrafica si corregge tutta), D9 (un utente ora, più utenti dopo) — [Source: docs/00-contesto-e-decisioni.md]
- Story precedente, pattern delle azioni, correzioni della revisione e misure dei file: [Source: docs/bmad/implementazione/1-4-marcare-i-clienti-con-tag-riusabili.md]
- Voci rimandate ancora aperte: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima o durante lo sviluppo

Ognuna ha già la sua risposta di default dentro i task: se non rispondi, si fa quella.

1. **Eliminare una persona non è chiesto da nessuna AC.** L'ho messa dentro perché `kb-0.md` §4 pretende «un modo di cancellare davvero» sulle tabelle con dati personali, e perché una persona aggiunta per sbaglio resterebbe per sempre (l'argomento di D22). Default: entra, con conferma in due tempi. Confermi?
2. **La creazione ha un `Salva` solo, la correzione un campo per volta.** È l'unica asimmetria della scheda ed è voluta: sei conferme durante una call sono sei di troppo. Default: si fa così. Preferisci invece che anche la creazione confermi campo per campo, o che anche la correzione abbia un `Salva` unico per persona?
3. **I ruoli si confermano, il contatto principale scrive subito.** I primi sono un insieme che si compone (cinque caselle, un `Salva`), il secondo è un interruttore. Default: come descritto. Li vuoi uniformi?
4. **Le etichette dei cinque ruoli** sono `ha il problema`, `decide`, `può bloccare`, `referente operativo`, `interlocutore`, sotto il titolo `Nella decisione`. Sono le parole di `epics.md`. Ti tornano come le diresti tu, o ne cambieresti qualcuna?
5. **`actions.ts` non si divide, le persone vanno in un file nuovo.** Era la domanda lasciata aperta dalla 1.4. Default: `people-actions.ts` nuovo, `actions.ts` toccato solo per far uscire `openSession` e la regex dell'uuid. Confermi, o vuoi che questa story riorganizzi anche `actions.ts`?
6. **Email e telefono non si validano** e non diventano collegamenti cliccabili. Default: campi di testo come gli altri, perché un'email scritta a metà durante una call deve poter essere salvata. Confermi?

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code)

### Debug Log References

- `npm run typecheck`: pulito.
- `npm run build`: pulito, sette rotte come prima (`/`, `/_not-found`, `/accedi`, `/auth/callback`, `/clienti`, `/clienti/[id]`, `/clienti/nuovo`).
- Casi limite dei tre moduli puri percorsi a mano con `node --experimental-strip-types` su uno script fuori dal repository, con l'esito atteso scritto prima di eseguire: **33 casi, tutti passati**. `personDisplayName` (nome e cognome, solo nome, solo cognome, nessuno dei due, stringhe vuote, soli spazi, spazi ai bordi), `parseDecisionRoles` (elenco vuoto accettato, ordine sparso ricomposto, doppioni tolti, tutti e cinque, valore inventato rifiutato, numero rifiutato, `null` rifiutato, `Decide` maiuscolo rifiutato), `isPersonFieldKey` (falso su `decision_roles`, `is_primary`, `client_id`, `owner_id`, `id`, `updated_at` e su un non-stringa; vero su `first_name` e `notes`), `isUuid` (valido, maiuscolo, senza trattini, troncato, con coda, con un a capo in fondo, stringa vuota, non stringa, e due chiamate di fila sullo stesso valore per escludere il flag `g`).
- Controlli con `grep`: la regex dell'uuid è definita in un file solo; `person-fields.ts`, `decision-roles.ts` e `uuid.ts` non hanno nessun import; nessun esadecimale fuori da `globals.css` nei file toccati; `client-field-form.tsx`, `client-tags-form.tsx` e `use-editable-field.ts` non compaiono nel diff; `use-write.ts` non è stato cablato nei due file vecchi.
- Diff di `actions.ts` verificato riga per riga: due import, l'uscita di `openSession` e della costante `UUID`, e il commento dell'uuid spostato al punto di chiamata come chiedeva Task 1. Nient'altro.

### Completion Notes List

Tre scostamenti dal testo dei task, tutti dichiarati e nessuno silenzioso.

1. **`openSession` è stata spostata con una riga in più, non identica.** `SessionResult` nel ramo `ok` porta anche `userId`. Task 2 diceva «così com'è», ma Task 3 chiede `owner_id: user.id` nell'insert, e `people.owner_id` è `not null` senza default: senza quel dato la persona non si scrive. Le alternative erano un secondo `getUser()` dentro `createPerson`, cioè una seconda chiamata al servizio di autenticazione per un dato già in mano, o una migrazione che mettesse `auth.uid()` come default, che questa story dichiara di non portare. Nessun chiamante esistente cambia comportamento.

2. **~~`people-actions.ts` è a 337 righe, non sotto le 200.~~** *Superato dalla revisione del 4 agosto 2026: Luca ha scelto di dividere.* `people-actions.ts` tiene `createPerson` e `deletePerson` (128 righe), `person-edit-actions.ts` le tre modifiche (227), e i messaggi condivisi stanno in `person-messages.ts` (40) perché da un modulo `'use server'` si esportano solo funzioni asincrone e `PERSON_GONE` serve a entrambi. `PersonPatch` è finito in `person-fields.ts`, dove sta già `PERSON_FIELDS` da cui si deriva. La casella di Task 9 resta comunque vuota: `person-edit-actions.ts` è a 227 righe.

3. **`PersonDetail` sta in `src/lib/types.ts`, non dentro `page.tsx`.** Lo leggono `people-card.tsx` e `person-block.tsx`, e un tipo importato da un modulo di pagina sarebbe una dipendenza al contrario. *Corretto in revisione: la versione precedente diceva «tre moduli, la pagina compresa», e `page.tsx` non lo importa — ci compare solo dentro un commento.* Il patto che contava è rimasto, ma per una via diversa da quella descritta: il tipo si deriva da `PERSON_FIELDS` e da `PersonRow` e non si riscrive, quindi un campo che entra nell'elenco senza entrare nella `select` ferma il controllo dei tipi sul prop di `<PeopleCard people={people} />`, non sulla query.

Due regole CSS oltre l'elenco di Task 7, perché senza non si reggeva la pagina: `.card + .card` (24px, altrimenti le due card si toccano e si leggono come una sola con una riga in mezzo) e il riuso di `.person` sul modulo di creazione invece di inventargli una classe sua.

Scelte prese dove il testo lasciava spazio:

- **`new-person-form.tsx`: i campi si disabilitano durante la scrittura.** È la lezione della 1.4 applicata a campi non controllati: `form.reset()` dopo il successo non può portare via niente scritto nel frattempo, perché nel frattempo non si può scrivere. La finestra dura quanto la chiamata.
- **`setPersonPrimary` rivalida prima di riportare l'errore del secondo update.** Se il precedente è già stato tolto, la pagina deve mostrarlo: fingere che non sia successo niente sarebbe peggio dell'errore.
- ~~**La spunta del principale segue la riga del database, non uno stato locale.**~~ *Superata dalla revisione del 4 agosto 2026: la casella si spegneva da sola al clic, perché React rirende con il valore vecchio prima ancora che la richiesta parta. Ora segue il gesto, torna a seguire la riga quando il database l'ha raggiunta, e torna indietro se la scrittura non riesce.*
- ~~**Lo stato vuoto tiene il suo pulsante montato anche mentre il modulo è aperto**, altrimenti dopo il salvataggio il fuoco non avrebbe dove tornare.~~ *Superata dalla revisione del 4 agosto 2026: il fuoco non ci tornava lo stesso nel caso 0→1, cioè il primo che si incontra. Ora il fuoco torna sul titolo della card, che è l'unica cosa montata in tutti e quattro gli stati, e lo stato vuoto sparisce mentre il modulo è aperto.*

### Aggiunte e correzioni della revisione del 4 agosto 2026

Quello che è cambiato oltre ai file già elencati, e che va letto insieme ai task.

- **`autoFocus` sul primo campo del modulo di creazione è diventato portante.** Non era chiesto da nessun task e non era dichiarato; ora i due pulsanti `Aggiungi persona` si smontano quando il modulo si apre, e senza `autoFocus` il fuoco cadrebbe sul corpo della pagina proprio nel gesto che apre il modulo.
- **Il fuoco si sposta a mano nella conferma dell'eliminazione**, avanti sul pulsante che conferma e indietro su `Annulla`, e la domanda è legata alla conferma con `aria-describedby`. Senza, React smontava il pulsante appena premuto e il fuoco spariva a ogni passaggio.
- **`PersonBlock` prende `onRemoved`**, che la card usa solo per riprendersi il fuoco. Non chiude il modulo di creazione aperto sotto: chiuderlo porterebbe via quello che ci si sta scrivendo (NFR1).
- **`person-field-form.tsx` ha `onMouseDown={keepFocus}` sui due pulsanti**, come `client-field-form.tsx`, e `Annulla` non è più disabilitato durante la scrittura. Erano le due differenze da `ClientFieldForm`, e insieme facevano salvare al pulsante che doveva scartare.
- **Quattro scostamenti minori dal testo dei task, ora dichiarati e lasciati come sono:** il `<fieldset>` porta `className="field--group"` con `field` spostata sul `<form>` che lo avvolge, invece di `field field--group` come scrive Task 5 (resa identica); `updatePersonField` e `deletePerson` fanno `.select('client_id')` dove Task 3 scrive `.select('id, client_id')`, perché `id` non serviva a nessuno; `.person`, `.field--group` e `.card__header .btn` portano proprietà di impaginazione oltre l'elenco di Task 7; `.card + .card` e il riuso di `.person` sul modulo di creazione erano già dichiarati.
- **Il commento sulla transizione asincrona di `use-write.ts` è stato riscritto.** Affermava che gli aggiornamenti di stato dopo l'`await` restano dentro la transizione; React 19 lo documenta diversamente, e la cosa non è stata vista girare. Il commento ora dice quello che è certo e segna il resto come da guardare in anteprima.

**Quello che non è stato verificato, e non si spunta per conto di terzi:** tutto il percorso che richiede una sessione. In particolare resta da vedere sul campo la forma `startTransition(async () => …)` di `use-write.ts`, che Task 4 chiedeva di verificare in sviluppo: tipi e build sono puliti e React 19 la documenta, ma non l'ho vista girare, quindi non è verificata. Se protesta, la strada è la forma sincrona già in casa.

Nessuna migrazione, nessuna dipendenza nuova, nessuna voce di `deferred-work.md` peggiorata. Chiusa quella dell'uuid duplicato, alla condizione che la voce stessa dichiarava.

### File List

**Nuovi**

- `src/lib/person-fields.ts`
- `src/lib/decision-roles.ts`
- `src/lib/uuid.ts`
- `src/lib/use-write.ts`
- `src/lib/supabase/session.ts`
- `src/app/(app)/clienti/people-actions.ts`
- `src/app/(app)/clienti/person-edit-actions.ts` *(aggiunto in revisione: la divisione decisa il 4 agosto 2026)*
- `src/app/(app)/clienti/person-messages.ts` *(aggiunto in revisione: i messaggi condivisi dalle due metà)*
- `src/app/(app)/clienti/[id]/people-card.tsx`
- `src/app/(app)/clienti/[id]/person-block.tsx`
- `src/app/(app)/clienti/[id]/person-field-form.tsx`
- `src/app/(app)/clienti/[id]/person-roles-form.tsx`
- `src/app/(app)/clienti/[id]/person-primary-form.tsx`
- `src/app/(app)/clienti/[id]/person-remove-form.tsx`
- `src/app/(app)/clienti/[id]/new-person-form.tsx`

**Modificati**

- `src/lib/types.ts`
- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`
- `src/app/globals.css`
- `docs/bmad/implementazione/deferred-work.md`
- `docs/bmad/implementazione/sprint-status.yaml`
- `docs/bmad/implementazione/1-5-registrare-le-persone-e-chi-decide.md`

## Change Log

| Data | Cosa |
|---|---|
| 4 agosto 2026 | Story creata sulle quattro AC di `epics.md`. Decise le due forme: `useEditableField` riusato per la correzione campo per campo, modulo unico per la creazione; cinque azioni in un file nuovo invece che dentro `actions.ts`, con `openSession` e la regex dell'uuid spostate fuori perché servono a due file. Individuata e chiusa nei task la trappola di sicurezza della chiave esterna verso `clients`, che la policy di `people` da sola non copre. Sei domande aperte in fondo. |
| 4 agosto 2026 | Story implementata. Tredici file nuovi, cinque modificati, nessuna migrazione e nessuna dipendenza. Chiusa la voce di `deferred-work.md` sull'uuid scritto in due file. Tre scostamenti dichiarati nelle note: `openSession` porta anche `userId`, `people-actions.ts` resta sopra le 200 righe, `PersonDetail` sta in `types.ts`. Restano da percorrere le verifiche che richiedono una sessione. |
| 4 agosto 2026 | Code review in tre passate parallele: adversarial, edge case, aderenza alla spec. Sedici rilievi tenuti, tre scartati. Tre decisioni prese da Luca — spunta del principale ottimistica, scheletro col solo titolo, `people-actions.ts` diviso — e tutti gli undici patch applicati. Il rilievo più pesante: `Annulla` sul campo Note salvava invece di scartare su Safari, Firefox e iPad, perché mancava `onMouseDown={keepFocus}`. Cinque voci rimandate in `deferred-work.md`. Nessuna violazione delle AC, nessun buco di sicurezza: la trappola della chiave esterna è chiusa in tutti e cinque i punti. |
