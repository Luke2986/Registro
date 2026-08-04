---
baseline_commit: 461c7ab92b6000bd26cc23a4b17e014190517466
---

# Story 1.4: Marcare i clienti con tag riusabili

Status: in-progress

Epic: 1 — Clienti, persone, elenco che si ritrova
Data di creazione: 3 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want marcare i clienti con etichette mie e riusarle senza riscriverle,
so that in tre mesi non mi ritrovo referral, Referral e referrals come tre cose diverse.

## Acceptance Criteria

**AC1 — il campo suggerisce i tag già usati**
**Given** la scheda di un cliente
**When** comincio a scrivere un tag
**Then** il campo mi suggerisce quelli che ho già usato, ricavati con `select distinct unnest(tags) where owner_id = $1`

**AC2 — minuscolo forzato e nessun doppione**
**Given** un tag scritto in maiuscolo o con spazi ai bordi
**When** lo salvo
**Then** viene normalizzato in minuscolo e ripulito prima della scrittura, lato applicazione
**And** se il cliente ha già quel tag non viene aggiunto due volte

**AC3 — tutti i tag nella colonna dell'elenco**
**Given** un cliente con più tag
**When** guardo la sua riga nell'elenco
**Then** li vedo tutti nella colonna tag (FR4)

## Tasks / Subtasks

- [x] **Task 1 — La normalizzazione dei tag, pura e in un posto solo** (AC: 1, 2)
  - [x] Creare `src/lib/client-tags.ts`: dati e funzioni pure, **nessun import di React né di Supabase**, tutto esportato, così la Story 1.6 può metterci un test sopra senza riscrivere niente (`kb-0.md` §7). È lo stesso patto di `client-fields.ts` e `client-status.ts`.
  - [x] `normalizeTag(raw: string): string` fa quattro cose e nient'altro, in quest'ordine: toglie i caratteri invisibili, comprime gli spazi interni in uno solo, taglia quelli ai bordi, porta in minuscolo con `toLocaleLowerCase('it')`.

    ```ts
    export function normalizeTag(raw: string): string {
      return raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('it')
    }
    ```

    `toLocaleLowerCase('it')` e non `toLowerCase()`: è la stessa forma già usata da `normalizeClientName` (`validate-client-name.ts`), e un minuscolo dipendente dalla locale è quello che serve su testo italiano.
  - [x] **`INVISIBLE` non si riscrive: si importa.** In `validate-client-name.ts` la costante esiste già con il suo commento; questa story la rende esportata (`const` → `export const`) e la importa qui. Una seconda copia della stessa espressione regolare è la duplicazione silenziosa che `kb-0.md` §9 chiede di fermare, e il difetto che copre è identico: uno zero-width incollato da una pagina web produrrebbe due tag che si leggono uguali e sono diversi, cioè esattamente il problema che AC2 esiste per chiudere.

    Nota per chi la riusa: la costante ha il flag `g`. Con `String.replace` è sicura — `replace` parte sempre da zero e azzera `lastIndex`. Con `.test()` o `.exec()` no: quella strada non si prende.
  - [x] `CLIENT_TAG_MAX_LENGTH = 40`, esportato. Il tag deve restare leggibile nella colonna dell'elenco a 12px accanto agli altri: oltre i quaranta caratteri non è più un'etichetta, è una frase, e quella sta nelle note. Il database non pone un massimo, quindi senza questo limite un incolla accidentale diventa un dato (stessa ragione di `CLIENT_NAME_MAX_LENGTH`).
  - [x] `parseTag(raw: unknown): TagResult` con la stessa forma di `parseEmployees`, così l'azione la usa allo stesso modo:

    ```ts
    export type TagResult = { ok: true; value: string } | { ok: false; message: string }
    ```

    Rifiuta il non-stringa e la stringa che si normalizza a vuota → `'Scrivi il tag prima di aggiungerlo.'`; rifiuta oltre il limite → `` `Il tag supera i ${CLIENT_TAG_MAX_LENGTH} caratteri. Accorcialo: il resto si scrive nelle note.` ``. **Il limite si misura sul valore normalizzato**, non sul grezzo: gli spazi tolti non devono far rifiutare un tag che ci sta.
  - [x] `collectTagSuggestions(rows: readonly { tags: string[] }[]): string[]`: appiattisce, toglie i doppioni, ordina con `localeCompare('it')`. È la funzione che regge AC1 e va tenuta pura perché è la prima candidata a un test nella Story 1.6.
  - [x] **Nessuna mappa di etichette, nessun elenco di tag predefiniti.** I tag sono liberi e li scrive Luca: un vocabolario chiuso sarebbe l'opposto di D17.

- [x] **Task 2 — Le due azioni, dentro il file che esiste già** (AC: 2)
  - [x] Aggiungere `addClientTag` e `removeClientTag` in `src/app/(app)/clienti/actions.ts`, **il file condiviso**. Nessun file di azioni per story: 1.1 lo ha creato, 1.2 ci ha messo le sue due, 1.3 la sua.
  - [x] Un solo tipo di stato per entrambe, perché entrambe rispondono la stessa cosa:

    ```ts
    export type ClientTagsState = { error?: string }
    ```

    Nessun `saved`: qui non c'è un campo da risincronizzare. I chip li rende il server, e dopo `revalidatePath` arrivano dal payload rivalidato. La firma resta `(_previous, formData)` come le altre tre azioni del file, anche se la chiamata è a mano: è la forma che il progetto ha, e cambiarla per un'azione sola non guadagna niente.
  - [x] **Due azioni e non una che riceve l'elenco intero.** Mandare l'array completo dal browser vorrebbe dire fidarsi del client su *quali* tag ha quel cliente, non solo su quale sta aggiungendo: la policy protegge la riga di un altro proprietario, non la colonna scritta male sulla propria (`kb-0.md` §3). Con due azioni il browser dice una parola sola e il server calcola il resto.
  - [x] `addClientTag`, sequenza obbligata:
    1. `const session = await openSession('addClientTag')` — **l'helper esiste già** (`actions.ts:334`) e tiene la distinzione fra sessione assente e auth irraggiungibile. Non riscriverla, non copiarla.
    2. leggere `client_id` dal `formData` e verificarlo con la costante `UUID` già presente in quel file (`actions.ts:319`);
    3. `parseTag(formData.get('tag'))`; se non passa → il messaggio della funzione, e nei log **niente**: il valore rifiutato è un dato del cliente (`kb-0.md` §3, NFR15);
    4. leggere i tag di adesso: `.from('clients').select('tags').eq('id', clientId).maybeSingle()`;
    5. se `error` → log con **solo** `code` e `message`, e `'Il tag non è stato salvato. Riprova fra un momento.'`; se `!data` → `'Questa scheda non è più disponibile. Torna all\'elenco.'`, come le altre azioni;
    6. **se il tag c'è già → uscire con `{}` senza scrivere niente.** È AC2: non un errore, non un avviso, e soprattutto nessun `update`, perché un update inutile sposterebbe `updated_at` e farebbe saltare il cliente in cima all'elenco per un tag che c'era già;
    7. `.update({ tags: [...data.tags, tag] }).eq('id', clientId).select('id').maybeSingle()`;
    8. `revalidatePath(\`/clienti/${clientId}\`)` **e** `revalidatePath('/clienti')` — la seconda per due motivi insieme: i tag sono una colonna dell'elenco, e la scrittura sposta `updated_at`, che oggi è l'ordinamento;
    9. ritornare `{}`.
  - [x] **In coda, mai ordinati.** `[...data.tags, tag]` e non un `sort()`: riordinare l'elenco a ogni aggiunta rimescolerebbe i chip già presenti sotto gli occhi di chi guarda, e nessuna AC chiede un ordine. L'ordine dei tag è quello in cui sono stati messi.
  - [x] `removeClientTag`: stessa apertura, stesso `UUID`, poi `tag` letto come stringa grezza e **non normalizzato**. Il valore arriva da un chip reso dal server, quindi è già nella forma memorizzata; si confronta per uguaglianza esatta e si scrive `data.tags.filter((it) => it !== tag)`. Se il filtro non toglie niente — il tag non c'era — si esce con `{}` senza scrivere, per lo stesso motivo del punto 6.
  - [x] **Nessuna conferma prima di togliere un tag.** È reversibile: si riscrive in due secondi e il suggerimento resta finché un altro cliente lo porta. Una conferma per un'azione reversibile è rumore (`kb-0.md` §6), ed è la stessa scelta già fatta da `Annulla` nella Story 1.2.
  - [x] **Mai scrivere `updated_at`.** Lo aggiorna il trigger `clients_set_updated_at`, che è `before update` (`0006_triggers.sql`).
  - [x] Non aggiungere `.eq('owner_id', user.id)`: la riga la filtra la policy `clients_owner_all` (`0007_rls.sql:17`). Un filtro a mano è ridondante e fa credere che sia lui a proteggere (D20, `database.md` §6 variante A).
  - [x] **Nessun `redirect()`**, come le altre azioni della scheda: aggiungere un tag non porta da nessuna parte, e una navigazione porterebbe via quello che è scritto negli altri campi (NFR1).
  - [x] Nessun limite al numero di tag per cliente. Non lo chiede nessuna AC e il software non vieta (D14).

- [x] **Task 3 — Il campo dei tag, un componente suo** (AC: 1, 2)
  - [x] Creare `src/app/(app)/clienti/[id]/client-tags-form.tsx`, `'use client'`.
  - [x] **Non è un sesto `kind` di `ClientFieldForm`, e `client-field-form.tsx` non si tocca affatto.** `kind` decide tre cose — che controllo si rende, quale azione si chiama, se il campo si salva da solo — e tutte e tre presuppongono un valore che è una stringa. Qui il valore è un `text[]`, `useEditableField` è a stringa da cima a fondo (`baseline: string`, `run(next: string)`), e l'interazione non è "cambia un valore e conferma" ma "aggiungi una voce" e "togli una voce", cioè due scritture diverse con due esiti diversi. Infilarlo là dentro vorrebbe dire piegare la macchina del campo per farle rappresentare una cosa che non è.

    Conseguenza da registrare: la voce rimandata dalla revisione della 1.3 — *cinque ternari annidati, e il sesto `kind` entra nella stessa catena* — **non peggiora con questa story**, perché il sesto ramo non arriva. `client-field-form.tsx` resta a 175 righe e resta in `deferred-work.md` com'è.
  - [x] Proprietà: `{ clientId: string; tags: string[]; suggestions: string[] }`. Nessuna copia locale dei tag: i chip si rendono direttamente dalla proprietà, che dopo `revalidatePath` arriva aggiornata. **Questo evita in partenza il difetto rimandato dalla Story 1.2** — un `baseline` che cambia e non risincronizza lo stato locale — perché uno stato locale da risincronizzare non esiste.
  - [x] Stato locale, solo tre cose: `draft` (quello che si sta scrivendo), `pending`, `error`. Nient'altro.
  - [x] **L'azione non passa da `useActionState`**, per il motivo già scritto in `use-editable-field.ts:43-48`: un rifiuto della promessa — rete caduta, rilascio a metà — verrebbe rilanciato durante la resa e risalirebbe al confine d'errore, che sostituirebbe l'intera scheda e porterebbe via quello che c'è scritto negli altri campi. Si chiama a mano dentro `startTransition`, con `.catch()` che trasforma la caduta in un messaggio:

    ```ts
    const UNREACHABLE = 'Il tag non è stato salvato: il server non ha risposto. Riprova fra un momento.'
    ```

    `startTransition` e non una chiamata nuda: la scrittura rivalida scheda ed elenco, e quella rivalidazione dev'essere un aggiornamento non urgente.
  - [x] Un `alive` ref con `useEffect` di pulizia, come in `use-editable-field.ts:70-78`: senza, una risposta che arriva dopo lo smontaggio scrive stato su un componente che non c'è più. È l'unico pezzo che somiglia a quel file, e non è la stessa macchina: qui non ci sono `baseline`, `attempted`, `waiting` né timer.
  - [x] Forma resa, in quest'ordine: etichetta vera `Tag` con `htmlFor` → i chip → la riga per aggiungere → il messaggio d'errore. Prima cosa hai, poi come se ne aggiunge uno.
  - [x] Il tutto dentro un `<form onSubmit>` che chiama l'aggiunta: **con l'Invio il tag entra**, che è quello che serve mentre si è al telefono. I pulsanti dei chip sono `type="button"`, altrimenti l'invio implicito li farebbe partire come invio del form — è la stessa trappola annotata nella revisione della 1.3 sul `<select>`.
  - [x] Ogni chip è un `<span className="tag">` con il testo e dentro un `<button type="button" className="tag__remove" aria-label={\`Togli il tag ${tag}\`}>` con `×` in `aria-hidden`. L'etichetta accessibile è obbligatoria: un pulsante il cui unico contenuto è un segno non ha nome (UX-DR14).
  - [x] Il campo di scrittura: `<input className="input" list="campo-tags-suggerimenti" maxLength={CLIENT_TAG_MAX_LENGTH} autoComplete="off" />` con un `<datalist id="campo-tags-suggerimenti">` accanto.

    `autoComplete="off"` come ogni altro controllo del progetto: senza, i valori salvati dal browser competono con i suggerimenti veri.
  - [x] I suggerimenti si filtrano prima di renderli: `suggestions.filter((it) => !tags.includes(it))`. Suggerire un tag che il cliente ha già vuol dire invitare a un'operazione che non farà niente.
  - [x] **`<datalist>` e non una libreria di combobox.** Serve un elenco di parole che si restringe mentre si scrive: si fa con l'elemento nativo, quindi si fa con l'elemento nativo (`kb-0.md` §2, nessuna dipendenza senza motivo). Sul tablet il controllo nativo si comporta meglio di qualunque sostituto, che è la stessa ragione per cui il `<select>` della 1.3 non ha `appearance: none` (NFR4).
  - [x] Il pulsante `Aggiungi` compare **solo quando c'è qualcosa da aggiungere**, cioè `draft.trim().length > 0`. È la stessa grammatica dei campi che si confermano: a riposo la scheda si legge, non si compila.
  - [x] Dopo un'aggiunta riuscita: `draft` torna vuoto e il fuoco resta nel campo, così il secondo tag si scrive di seguito. Dopo un'aggiunta rifiutata: `draft` resta com'è, insieme al suo errore — un valore rifiutato non sparisce mai (è la regola di `new-client-form.tsx:13-16`).
  - [x] Sotto il campo, una riga `.meta`: `Si salvano in minuscolo, così lo stesso tag non diventa tre cose diverse.` Serve perché la normalizzazione riscrive quello che è stato battuto, e una riscrittura silenziosa senza spiegazione si legge come un guasto.
  - [x] `aria-describedby` che punta al suggerimento e all'errore quando ci sono, `aria-invalid` sull'errore: stesso cablaggio di `new-client-form.tsx:30-32`. L'errore è un `<p className="field__error" role="alert">`, come nel campo modificabile.
  - [x] **Nessun `SaveIndicator`.** L'indicatore appartiene ai campi che si salvano da soli (D21); qui la conferma è il chip che compare. Metterlo qui vorrebbe dire raccontare un salvataggio automatico che non c'è.
  - [ ] Verificare che il file resti sotto le 200 righe (`kb-0.md` §2). **Non è riuscito.** In sviluppo il file è finito a 200 righe esatte, che non è «sotto le 200», e la casella era spuntata lo stesso; dopo le correzioni della revisione è a 241. Vedi «Una conseguenza da guardare, non chiusa qui» nei Review Findings.

- [x] **Task 4 — La scheda porta i tag e i suggerimenti** (AC: 1)
  - [x] In `src/app/(app)/clienti/[id]/page.tsx` aggiungere `tags` a `COLUMNS` e a `ClientDetail`:

    ```ts
    type ClientDetail = Pick<ClientRow, 'id' | 'name' | 'status' | 'tags' | ClientFieldKey>
    ```

    Sono due punti perché `tags` non è in `CLIENT_FIELDS` e non deve entrarci, esattamente come `name` e `status`: non è un campo di testo che passa da `updateClientField`.
  - [x] Dopo che la riga del cliente è confermata — non prima, così un indirizzo che non esiste non paga una query in più — leggere i suggerimenti:

    ```ts
    const { data: tagRows, error: tagsError } = await supabase.from('clients').select('tags')
    ```

    Se fallisce: `console.error` con solo `code` e `message`, e si va avanti con l'elenco vuoto. **Un suggerimento mancante non è un guasto della scheda**: è un aiuto che non c'è, e far cadere la pagina per quello sarebbe sproporzionato. La scheda resta compilabile.
  - [x] `collectTagSuggestions(tagRows ?? [])` per ricavare l'elenco. La riga la filtra la policy, non questa query.
  - [x] **Perché in memoria e non in SQL.** L'AC scrive `select distinct unnest(tags) where owner_id = $1`: PostgREST non espone `unnest`, quindi la stessa cosa si ottiene leggendo la sola colonna `tags` e appiattendo lato applicazione. È il precedente già scritto e motivato in `findExistingName` (`actions.ts:353-356`): con qualche centinaio di clienti leggere una colonna costa meno della migrazione che servirebbe, e `AGENTS.md` dice che l'Epic 1 non porta migrazioni nuove.
  - [x] Rendere `<ClientTagsForm clientId={data.id} tags={data.tags} suggestions={suggestions} />` **fra `ClientIdentity` e `ClientFields`**: i tag sono una marcatura trasversale, stanno con l'identità del cliente, non fra i campi anagrafici della griglia.
  - [x] **Da preservare intatto** in `page.tsx`: il controllo `UUID` con `notFound()`, la distinzione fra sessione assente e auth irraggiungibile, `maybeSingle()` col suo commento, il `console.error` con solo `code` e `message`, `ClientHeader`, `ClientError`, `ClientIdentity`, `ClientFields` e `readValue`. Il messaggio «Di questo cliente sai solo il nome» continua a derivarsi da `CLIENT_FIELDS` e non cambia: i tag non entrano in quel conto.

- [x] **Task 5 — Le classi che mancano, e solo quelle** (AC: 1)
  - [x] In `src/app/globals.css`, quattro classi nuove: `.field--tags`, `.tags`, `.tag`, `.tag__remove`. Prima di scrivere qualsiasi altra cosa, verificare che non esista già: `.field`, `.label`, `.input`, `.btn`, `.field__actions`, `.field__error`, `.meta`, `.pill`, `.pill__dot`, `.detail-identity`, `.detail-grid`, `.field--wide`, `.field--status` ci sono tutte.
  - [x] `.field--tags`: `margin-bottom: 32px`, lo stesso stacco che `.detail-identity` ha già sopra la griglia. Il campo sta fuori da `.detail-grid`, quindi `field--wide` — che agisce su `grid-column` — qui non farebbe niente.
  - [x] `.tags`: `display: flex; flex-wrap: wrap; gap: 8px; align-items: center`.
  - [x] `.tag`: fondo `--surface-sunken`, testo `--ink`, raggio `--r-full`, `padding-left: 12px`, `padding-right: 0`, `min-height: 44px`, `font-size: 13px`. **Non riusare `.pill`**: quella ha il punto da 6px e i 22px di altezza perché è una pillola di stato in una tabella (UX-DR5), mentre questo è un controllo che si tocca.
  - [x] `.tag__remove`: `min-width: 44px; min-height: 44px`, nessun fondo, nessun bordo, colore `--ink-muted`, `border-radius: var(--r-full)`, `cursor: pointer`, `font-family: inherit`. I 44px non sono negoziabili: è un bersaglio tattile e le call si fanno anche su tablet (UX-DR14, NFR4). Il precedente in casa è `.save-indicator__retry`, che è testo e tiene comunque `min-height: 44px`.
  - [x] Il chip è alto 44 di conseguenza, cioè quanto `.input`: la riga dei tag e la riga di scrittura hanno la stessa altezza e il campo non sembra due cose.
  - [x] Riga di aggiunta: nessuna classe nuova. `display: flex; gap: 8px` si ottiene con `.field__actions` già esistente? **No** — quella è la riga dei pulsanti. Serve un contenitore proprio: aggiungere `.tags-add { display: flex; gap: 8px; align-items: flex-start }` e `.tags-add .input { flex: 1; min-width: 0 }`, altrimenti un tag lungo allarga il campo e porta la card a scorrere di lato (è la stessa ragione del `min-width: 0` già scritto su `.detail-grid > *`).
  - [x] **Nessun colore di sezione e nessun colore semantico sul chip.** Verde, ambra e rosso significano esiti, il blu è la sezione: un tag non è né l'uno né l'altro e resta neutro (UX-DR2). In questa schermata la cosa colorata è già una, il punto della pillola di stato.
  - [x] Nessun valore esadecimale fuori da questo file, in nessuna circostanza (UX-DR16).

- [x] **Task 6 — Lo scheletro segue la forma nuova** (AC: 1)
  - [x] In `src/app/(app)/clienti/[id]/loading.tsx`, fra `.detail-identity` e `.detail-grid`, aggiungere lo scheletro del campo dei tag: etichetta stretta più un blocco alto 44px dentro un `.field field--tags`. Uno scheletro che non ha la forma del contenuto fa saltare la pagina quando il contenuto arriva, ed è già stato corretto due volte nelle story precedenti.
  - [x] Il resto del file non si tocca: l'elenco dei campi continua a derivarsi da `CLIENT_FIELDS`.

- [ ] **Task 7 — Verifica a mano sul percorso reale** (AC: 1, 2, 3)

  Le caselle dicono chi ha verificato cosa e restano vuote dove non ha verificato nessuno. Il percorso con accesso richiede una sessione che arriva per email: nessun agente può percorrerlo. Una casella spuntata per conto di terzi vale meno di una vuota (`kb-0.md` §7).

  *Verificabile dall'agente, senza sessione*
  - [x] `npm run typecheck` e `npm run build` puliti, stesse sette rotte di prima.
  - [x] `normalizeTag` sui casi limite: `'Referral'`, `'  referral  '`, `'REFERRAL'`, `'refer  ral'` (due spazi in mezzo), `'referral​'` (zero-width in coda), `''`, `'   '`, un tag con accenti (`'Città'` → `'città'`). L'esito atteso si scrive prima di eseguire, non dopo.
  - [x] `parseTag` sui casi limite: i cinque sopra, più il non-stringa (`null`, `undefined`, un numero, un oggetto), più una stringa di 41 caratteri normalizzati (rifiutata) e una di 40 (accettata), più una di 45 che dopo il taglio degli spazi ne fa 38 (**accettata**: il limite si misura sul normalizzato).
  - [x] `collectTagSuggestions` su: nessuna riga, righe con `tags` vuoto, tre righe con lo stesso tag (esce una volta sola), tag che si ordinano con gli accenti.
  - [x] Prova che `tags` resti fuori dall'allow-list dei campi: `isClientFieldKey('tags')` risponde falso. Come `status`, `name` e `owner_id`.
  - [x] `client-tags.ts` non importa né React né Supabase (`grep` sugli import).
  - [x] Nessun esadecimale fuori da `globals.css` (`grep` sui file toccati).
  - [x] `client-field-form.tsx` e `use-editable-field.ts` non compaiono nel diff. Se ci sono, Task 3 ha preso la strada sbagliata.

  *Da percorrere con una sessione aperta*
  - [ ] Apro la scheda di un cliente senza tag: vedo l'etichetta `Tag`, il campo vuoto e nessun chip. Nessun pulsante `Aggiungi` finché non scrivo.
  - [ ] Scrivo `Referral` e premo Invio: compare il chip `referral`, in minuscolo, e il campo si svuota restando pronto per il secondo.
  - [ ] Aggiungo un secondo tag e un terzo: i chip restano nell'ordine in cui li ho messi.
  - [ ] Riscrivo `referral` su un cliente che ce l'ha già: non compare un secondo chip, non compare un errore, e tornando all'elenco il cliente **non** è saltato in cima (nessuna scrittura, `updated_at` fermo).
  - [ ] Scrivo `  URGENTE  ` con spazi ai bordi: esce `urgente`.
  - [ ] Apro un secondo cliente e comincio a scrivere `re`: il campo mi propone i tag già usati sul primo. Scelgo dall'elenco e premo Invio: il tag entra.
  - [ ] Sul cliente che ha già `referral`, apro i suggerimenti: `referral` non c'è, ci sono gli altri.
  - [ ] Premo la `×` di un chip: sparisce. Ricarico: è sparito davvero. Lo riscrivo: torna.
  - [ ] Torno all'elenco: la colonna Tag mostra **tutti** i tag di quel cliente, non i primi due (AC3).
  - [ ] Un cliente con sei tag: la riga cresce e resta leggibile, e la tabella non scorre di lato.
  - [ ] Premo Invio col campo vuoto: non succede niente di brutto e non parte nessuna scrittura.
  - [ ] Incollo una frase di 200 caratteri: il campo si ferma a 40 (`maxLength`), e se il limite lo forzo dal server arriva il messaggio che dice cosa fare.
  - [ ] Tolgo la rete e aggiungo un tag: compare il messaggio che dice cosa fare, il testo scritto resta nel campo, rimetto la rete e `Aggiungi` funziona.
  - [ ] Larghezza 375px: i chip vanno a capo, la `×` resta toccabile a 44px, il campo non si schiaccia (NFR4, UX-DR14).
  - [ ] Su un iPad vero: il `<datalist>` propone davvero i suggerimenti mentre scrivo. Safari lo rende a modo suo, e le call si fanno anche fuori casa — è la stessa prova che nella 1.3 è servita per il `<select>` nativo.
  - [ ] Da tastiera: si arriva al campo, si scorrono i suggerimenti, si aggiunge con Invio, si raggiunge ogni `×` e si toglie un tag senza mouse. Il fuoco si vede sempre.
  - [ ] Il lettore di schermo annuncia le `×` come «Togli il tag referral», non come «pulsante».
  - [ ] Su un cliente `chiuso` o `perso`: aggiungere e togliere tag riesce identico. Nessuno stato blocca niente (NFR8, D14).
  - [ ] Nessun errore in console.

### Review Findings

Revisione del 3 agosto 2026, tre livelli in parallelo (adversarial, edge case, aderenza alle AC).
Le severità sono state assegnate qui, non dai revisori, dopo aver riletto il codice attorno a ogni
punto segnalato e verificato a mano i numeri di CSS e le righe fuori dal diff. Trentacinque rilievi
grezzi, uniti in ventuno. Le quattro decisioni sono state chiuse da Luca il 3 agosto 2026.

**Decise**

- [x] [Review][Decision] Aggiungere un tag già presente riesce in silenzio e svuota comunque il campo — `actions.ts:368` esce con `{}`, che il componente legge come successo: `onSuccess` parte, `draft` torna vuoto, il fuoco resta dentro. All'utente il campo si svuota e nessun chip nuovo compare, cioè lo stesso identico esito di un salvataggio che non è avvenuto. La story chiede «non compare un secondo chip, non compare un errore» e quella parte è rispettata, ma non dice se il campo debba svuotarsi: il commento del componente dichiara «la conferma è il chip che compare», e in questo ramo il chip non compare mai. → **Deciso il 3 agosto 2026: si lascia com'è.** La story chiede il silenzio e il silenzio c'è. Il gesto resta ambiguo per scelta, non per svista.
- [x] [Review][Decision] «Di questo cliente sai solo il nome» resta vero solo per i campi anagrafici — `page.tsx:140` conta `CLIENT_FIELDS`, e `tags` non ci entra per decisione esplicita di Task 4. Conseguenza che prima non esisteva: un cliente con tre tag e nessun altro campo compilato legge quella frase dieci pixel sotto i propri chip. Non è un difetto del codice, è la decisione della story che diventa visibile solo ora che i tag si scrivono. → **Deciso il 3 agosto 2026: si lascia com'è.** La frase parla dell'anagrafica, e i tag non sono anagrafica. Il conto continua a derivarsi da `CLIENT_FIELDS`, come Task 4 prescriveva.
- [x] [Review][Decision] La virgola dentro un tag è indistinguibile dal separatore dell'elenco — `normalizeTag` (`client-tags.ts`) toglie invisibili, comprime spazi e mette in minuscolo, ma lascia passare ogni punteggiatura; l'elenco rende `row.tags.join(', ')` (`clienti/page.tsx:83`). Un singolo tag `referral, urgente` si legge in colonna esattamente come due tag distinti. È la stessa ambiguità che D17 esiste per chiudere, presa dal lato opposto. → **Deciso il 3 agosto 2026: `parseTag` rifiuta la virgola.** Si chiude all'origine invece che a valle, e l'elenco non si tocca. Diventa una correzione.
- [x] [Review][Decision] La corsa lettura-scrittura è scritta solo dentro questa story — entrambe le azioni leggono `tags`, ricompongono e riscrivono l'array intero (`actions.ts:353`+`376`, `:423`+`441`): due scritture in volo insieme e una sparisce senza errore. Due revisori su tre l'hanno segnalata in modo indipendente. La scelta di accettarla è già presa e motivata («Una corsa nota, e perché si accetta»), e resta giusta con un utente solo. → **Deciso il 3 agosto 2026: va in `deferred-work.md` come voce sua.** La decisione di accettarla non cambia; cambia dove è visibile. Chiude la domanda 4 della story nel senso opposto a quello scelto in sviluppo.

**Da correggere**

- [x] [Review][Patch] `parseTag` accetta la virgola, che nell'elenco è il separatore fra un tag e l'altro [src/lib/client-tags.ts:47] — **bassa**, da decisione del 3 agosto 2026

- [x] [Review][Patch] `setDraft('')` è incondizionato: quello che si scrive durante l'attesa sparisce [src/app/(app)/clienti/[id]/client-tags-form.tsx:110] — **alta**
- [x] [Review][Patch] Un tag lungo trabocca dalla card a 375px: `.tag` non ha né `min-width: 0` né `overflow-wrap` [src/app/globals.css:537] — **media**
- [x] [Review][Patch] Lo scheletro dei tag è 26px più basso del campo vero: manca la riga `.meta`, che non è condizionale [src/app/(app)/clienti/[id]/loading.tsx:34] — **media**
- [x] [Review][Patch] La via «niente da fare» esce prima di `revalidatePath`: una scheda vecchia non si riallinea mai [src/app/(app)/clienti/actions.ts:368] — **media**
- [x] [Review][Patch] `focusInput()` riporta il cursore nel campo tag anche se ci si è spostati su un altro campo [src/app/(app)/clienti/[id]/client-tags-form.tsx:111] — **media**
- [x] [Review][Patch] Un solo canale d'errore per due azioni: una rimozione fallita marca `aria-invalid` sull'input di scrittura e usa il messaggio dell'aggiunta [src/app/(app)/clienti/[id]/client-tags-form.tsx:9] — **bassa**
- [x] [Review][Patch] `Aggiungi` diventa `Salvataggio…`: l'azione cambia nome a metà, con il vocabolario del `SaveIndicator` che Task 3 vieta a questo campo [src/app/(app)/clienti/[id]/client-tags-form.tsx:182] — **bassa**
- [x] [Review][Patch] Il controllo dei doppioni confronta il valore normalizzato con l'array grezzo, mentre `removeClientTag` dichiara che l'array può contenere valori non normalizzati [src/app/(app)/clienti/actions.ts:368] — **bassa**
- [x] [Review][Patch] `.tags-add { align-items: flex-start }` mette `Aggiungi` (40px) e l'input (44px) allineati in alto, disallineati in basso [src/app/globals.css:578] — **bassa**
- [x] [Review][Patch] `write(action: typeof addClientTag, …)` tipizza il parametro come una delle due implementazioni invece della firma condivisa [src/app/(app)/clienti/[id]/client-tags-form.tsx:68] — **bassa**
- [x] [Review][Patch] `removeClientTag` non pone nessun limite alla stringa `tag`: l'unico controllo è `typeof` [src/app/(app)/clienti/actions.ts:418] — **bassa**
- [x] [Review][Patch] Il Dev Agent Record dichiara cose che il codice non sostiene: il file è a 200 righe esatte e non «sotto le 200», e le «tre cose non specificate» sono almeno sei — fra quelle non dichiarate c'è il pulsante che cambia nome [docs/bmad/implementazione/1-4-marcare-i-clienti-con-tag-riusabili.md] — **bassa**

**Com'è stato corretto**

- **`setDraft('')` diventa condizionale.** Il valore mandato si cattura prima (`const sent = draft`) e il campo si svuota solo se non è cambiato: `setDraft((current) => (current === sent ? '' : current))`. È la forma già usata da `use-editable-field.ts:115` per lo stesso identico motivo, e senza di essa il secondo tag dettato di seguito spariva a metà parola.
- **`focusInput` diventa `restoreFocus`, e il fuoco si rimette solo se si è perso.** Il controllo è `document.activeElement` nullo o `body`. Copre i due casi in cui sparisce davvero — la `×` premuta e `Aggiungi` che si smonta quando il campo si svuota — e non copre quello in cui è già su un altro campo, dove riportarlo indietro faceva finire lì le battute successive e dava un blur a una textarea a metà. Sul percorso dell'aggiunta con l'Invio la chiamata era comunque un colpo a vuoto: il fuoco non aveva mai lasciato il campo. Il `detail === 0` sulla rimozione resta com'era.
- **Le due vie «niente da fare» rivalidano.** Nessuna scrittura, quindi `updated_at` non si muove e l'ordine dell'elenco non cambia: cambia solo che una pagina che mostra chip non più veri si riallinea invece di restare vecchia finché non la si ricarica a mano.
- **Il controllo dei doppioni passa da `includes` a `some(normalizeTag(...) === …)`.** Provato: con `tags = ['Referral']` in riga, `includes('referral')` risponde falso e lascerebbe entrare il secondo, `some` risponde vero. `removeClientTag` continua a confrontare per uguaglianza esatta, ed è giusto così: le due funzioni ora dicono la stessa cosa sull'array invece di due cose opposte.
- **`.tag__text`, `max-width: 100%` e `flex-shrink: 0`.** Il testo va in un elemento suo con `overflow-wrap: anywhere`, il chip non supera la larghezza del contenitore, e la `×` non si stringe quando il testo va a capo — altrimenti i 44px sarebbero promessi e non dati.
- **Lo scheletro guadagna la terza riga.** 16 + 8 + 44 + 8 + 16 contro i 18 + 8 + 44 + 8 + 16 del contenuto vero. La riga dei chip non si riserva di proposito: un cliente senza tag non ce l'ha, e riservarla sposterebbe il salto dall'altra parte.
- **Un errore con il suo `scope`.** `error` diventa `{ message, scope }`: `aria-invalid` e `aria-describedby` sul campo di scrittura si accendono solo per un errore d'aggiunta, la prima battuta cancella solo quello, e la caduta di rete ha due messaggi come già li aveva il server.
- **`Aggiunta…` invece di `Salvataggio…`**, che è la parola dell'indicatore di salvataggio che Task 3 vieta a questo campo.
- **`parseTag` rifiuta la virgola**, prima del controllo di lunghezza: una frase incollata che contiene virgole quasi sempre è più di un tag, e dirlo è più utile che dire che è lunga.
- **`ClientTagAction`** è la firma condivisa, non `typeof addClientTag`. **`CLIENT_TAG_REMOVE_MAX_LENGTH = 1000`** è un tetto di guardia, largo di proposito: stringerlo impedirebbe di togliere un tag scritto prima che il limite esistesse, che è la ragione per cui la rimozione non normalizza.
- **`.tags-add` passa a `align-items: center`.** I 40px di `.btn` restano la voce già rimandata dalla revisione della Story 1.1; qui si toglie solo il disallineamento fra i due controlli della stessa riga.

`npm run typecheck` e `npm run build` puliti dopo le correzioni, stesse sette rotte. Le funzioni pure riprovate a mano su 28 controlli, 28 passati: gli otto di `normalizeTag` e i nove di `parseTag` di prima non sono cambiati, più sei sulla virgola e tre sul dedup normalizzato.

**Una conseguenza da guardare, non chiusa qui**

`client-tags-form.tsx` è passato da 200 righe a **241**, cioè sopra le 200 di `kb-0.md` §2. Nove delle tredici correzioni toccano quel file, ed era già al limite. La regola dice «quasi sempre contiene due cose», e qui le due cose si vedono: la fila dei chip con la sua rimozione, e il campo che ne aggiunge uno con i suoi suggerimenti. La divisione non è stata fatta in questa revisione perché è un refactor non concordato su un file appena corretto (`AGENTS.md`, `kb-0.md` §9), ed è la stessa scelta di default già presa per `actions.ts`. Da decidere prima della Story 1.5.

**Rimandate**

- [x] [Review][Defer] `maxLength` tronca l'incolla in silenzio e rende irraggiungibile dall'interfaccia il messaggio del limite [src/app/(app)/clienti/[id]/client-tags-form.tsx:166] — rimandata: stesso pattern già in `client-field-form.tsx:120` e `new-client-form.tsx:50` con `CLIENT_NAME_MAX_LENGTH`, si chiude in una passata sola
- [x] [Review][Defer] Nessuna normalizzazione Unicode e `INVISIBLE` incompleta: `città` decomposto e `città` composto restano due tag, e U+00AD, U+180E, U+202A–E non sono coperti [src/lib/client-tags.ts:29] — rimandata, stesso buco in `normalizeClientName` dalla Story 1.1
- [x] [Review][Defer] La query dei suggerimenti non ha `.limit()`: PostgREST tronca a 1000 righe in silenzio e i suggerimenti diventano incompleti senza segnalarlo [src/app/(app)/clienti/[id]/page.tsx:75] — rimandata: stesso pattern di `findExistingName`, e oggi i clienti sono qualche decina
- [x] [Review][Defer] Nessun aggiornamento di stato è dentro `startTransition`: la funzione di scope è sincrona, quindi `setDraft`/`setPending`/`setError` girano fuori dal tracciamento come aggiornamenti urgenti [src/app/(app)/clienti/[id]/client-tags-form.tsx:81] — rimandata, stesso pattern di `use-editable-field.ts` da chiudere in un colpo solo
- [x] [Review][Defer] La corsa lettura-scrittura sull'array `tags`: due scritture in volo insieme e una sparisce senza errore [src/app/(app)/clienti/actions.ts:353] — rimandata per decisione del 3 agosto 2026: richiede due schede aperte sullo stesso cliente nello stesso secondo, con un utente solo, e l'alternativa è la migrazione che l'Epic 1 dichiara di non portare

**Scartati come rumore, e perché**

- *Il pulsante `Aggiungi` che compare alla prima battuta restringe l'input sotto il cursore* — è un salto di layout vero, ma prescritto da Task 3 («compare solo quando c'è qualcosa da aggiungere, cioè `draft.trim().length > 0`») ed è la stessa grammatica dei campi che si confermano. Scelta decisa e scritta, non un difetto.
- *Il campo si svuota anche quando il tag c'era già* — decisione del 3 agosto 2026, sopra.
- *«Di questo cliente sai solo il nome» sopra i chip* — decisione del 3 agosto 2026, sopra.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

**Nessuna migrazione in questa story.** La colonna `tags` esiste dal primo giorno, è `text[] not null default '{}'`, e ha già il suo indice gin che la Story 1.7 userà per filtrare.

| Pezzo | Dove | Stato |
|---|---|---|
| Colonna `tags text[] not null default '{}'` | `supabase/migrations/0002_clients.sql:21` | applicata |
| Indice `clients_tags_idx` (gin) | `supabase/migrations/0002_clients.sql:28` | applicato, lo userà la 1.7 |
| Policy `clients_owner_all`, valida anche in scrittura | `supabase/migrations/0007_rls.sql:17` | attiva |
| Trigger `clients_set_updated_at` | `supabase/migrations/0006_triggers.sql` | attivo |
| `openSession`, `UUID`, il trattamento degli errori | `src/app/(app)/clienti/actions.ts:319-350` | **esistono: riusarli** |
| `INVISIBLE`, i caratteri invisibili da togliere | `src/lib/validate-client-name.ts:8` | **esiste: esportarla, non copiarla** |
| Colonna Tag nell'elenco, già resa | `src/app/(app)/clienti/page.tsx:83` | **soddisfa già AC3: non si tocca** |
| `.input`, `.btn`, `.field`, `.label`, `.field__error`, `.meta` | `src/app/globals.css` | pronte |
| `ClientFieldForm` e `useEditableField` | `client-field-form.tsx`, `use-editable-field.ts` | **fuori perimetro: non si toccano** |
| Tipi generati dallo schema (`tags: string[]`) | `src/lib/database.types.ts:169` | pronti, **non si modificano a mano** |

**AC3 è già soddisfatta dal codice di oggi**, e va verificata invece che implementata: `page.tsx:83` rende `row.tags.join(', ')` in `.meta`, cioè tutti i tag, senza troncamenti e senza «+2 altri». Restano testo e non chip di proposito: nell'elenco la cosa colorata è già la pillola di stato, e una fila di chip accanto le toglierebbe il primo posto (UX-DR2, «una sola cosa colorata satura per schermata»). L'unica cosa che può cambiare è l'altezza della riga quando i tag sono molti, ed è il prezzo di «li vedo tutti», che è quello che l'AC chiede.

### Cosa cambia questa story, file per file

**Nuovi**
- `src/lib/client-tags.ts` — normalizzazione, limite, `parseTag`, `collectTagSuggestions`. Puro.
- `src/app/(app)/clienti/[id]/client-tags-form.tsx` — il campo dei tag, `'use client'`.

**Modificati**
- `src/lib/validate-client-name.ts` — **una parola**: `const INVISIBLE` diventa `export const INVISIBLE`. Nessun cambiamento di comportamento.
- `src/app/(app)/clienti/actions.ts` — si aggiungono `addClientTag` e `removeClientTag`. **Da preservare intatto:** `createClientRecord`, `updateClientField`, `renameClient`, `updateClientStatus`, `openSession`, `findExistingName`, la costante `UUID` e tutti i loro commenti. Sono passati da tre revisioni.
- `src/app/(app)/clienti/[id]/page.tsx` — `tags` in `COLUMNS` e in `ClientDetail`, la query dei suggerimenti, il campo reso fra identità e griglia. Nient'altro.
- `src/app/(app)/clienti/[id]/loading.tsx` — una riga di scheletro in più.
- `src/app/globals.css` — `.field--tags`, `.tags`, `.tag`, `.tag__remove`, `.tags-add`.

**Riusati senza modifiche, e da non riscrivere**
`src/lib/client-fields.ts`, `src/lib/client-status.ts`, `src/lib/use-editable-field.ts`, `src/app/(app)/clienti/[id]/client-field-form.tsx`, `src/components/status-pill.tsx`, `src/components/save-indicator.tsx`, `src/components/error-state.tsx`, `src/lib/types.ts`, `src/lib/format-date.ts`.

**Da non toccare**
`src/proxy.ts`, `src/lib/database.types.ts`, `src/lib/supabase/*`, `supabase/migrations/*`, `src/app/accedi/*`, `src/app/(app)/layout.tsx`, `src/app/(app)/clienti/page.tsx`, `src/app/(app)/clienti/nuovo/*`, `src/app/(app)/clienti/loading.tsx`.

### La decisione di questa story: i tag non sono un campo

Le tre story precedenti hanno costruito una macchina sola per tutti i campi della scheda: un componente, un `kind`, un `useEditableField` che tiene valore, `dirty`, errore e timer. La tentazione, arrivati ai tag, è farne il sesto `kind`. La revisione della Story 1.3 se l'aspettava e ha lasciato scritto che al sesto ramo si sarebbe scelto fra una mappa `kind → renderer` e la divisione del file.

**Non si sceglie né l'una né l'altra, perché i tag non sono un campo di quella famiglia.** Tre differenze, e sono strutturali:

1. **Il valore non è una stringa.** `useEditableField` è a stringa in ogni sua parte: `baseline: string`, `value: string`, `run(next: string) => Promise<SaveResult>`, `dirty = value !== baseline`. Un `text[]` ci passa solo dopo averlo serializzato — per esempio unendolo con la virgola — e a quel punto ogni regola del campo (l'allineamento su `saved`, il confronto per `dirty`) lavora su una rappresentazione invece che sul dato.
2. **Il gesto non è "cambia e conferma", è "aggiungi" e "togli".** Sono due scritture con due esiti, e nessuna delle due modifica un valore esistente: lo compongono. La conferma di D21 esiste perché un campo a metà digitazione non è una decisione; qui la decisione è l'Invio, e il chip che compare è la conferma.
3. **I suggerimenti hanno bisogno di un campo che contiene un tag solo.** Con l'elenco unito dalla virgola, `<datalist>` confronta il proprio elenco con l'intero contenuto del campo: scritto `referral, urg`, non propone più niente. AC1 chiede il contrario.

Quindi: componente proprio, azioni proprie, e `client-field-form.tsx` che non viene aperto. La voce rimandata sui cinque ternari resta esattamente dov'è e non peggiora.

### Perimetro: cosa NON entra in questa story

- **Nessun filtro per tag nell'elenco**: è la **Story 1.7**, che porta ricerca e filtri insieme. L'indice gin che le servirà esiste già e questa story non lo tocca.
- **Nessun chip nell'elenco**: la colonna resta il testo unito dalla virgola che c'è oggi, e il file dell'elenco non si apre.
- **Nessuna rinomina globale di un tag.** `database.md` §3 la dichiara come il prezzo consapevole dell'array al posto di due tabelle: si perde il rinomina-ovunque, si guadagna metà della complessità. Chi sbaglia un tag lo toglie e lo riscrive.
- **Nessuna gestione dei tag fuori dalla scheda cliente**: nessuna pagina «tutti i tag», nessuna cancellazione di un tag da tutti i clienti.
- **Nessun conteggio d'uso accanto ai suggerimenti**: non lo chiede nessuna AC, e sarebbe una seconda query per un'informazione che nessuno ha chiesto.
- **Nessun limite al numero di tag** e nessun elenco chiuso di tag ammessi: il software registra e mostra, non decide e non vieta (D14, D17).
- **Le persone non esistono ancora**: **Story 1.5**.
- **L'ordinamento resta su `clients.updated_at`**: l'ultima attività vera è la **Story 1.6**.
- **Nessun test automatico**: il comando che li esegue arriva con la **Story 1.6**. Qui l'obbligo è che `client-tags.ts` resti puro ed esportato.
- **Niente `metadata` sulle rotte, niente ritocchi a `.btn`, niente cambi all'alone del focus, niente navigazione di riga nell'elenco**: sono le voci di `deferred-work.md` e restano dove sono.

### La trappola di sicurezza di questa story

`tags` è una colonna che l'allow-list dei campi non conosce, e questa story ci apre una via di scrittura. La deve aprire **stretta**:

1. **`tags` non entra in `CLIENT_FIELDS`.** Se ci entrasse, `updateClientField` scriverebbe una stringa in una colonna `text[]` e il tipo generato non compilerebbe nemmeno — ma soprattutto la difesa passerebbe dall'allow-list a Postgres, cioè al posto sbagliato. `isClientFieldKey('tags')` deve continuare a rispondere falso, ed è una delle prove di Task 7.
2. **Il browser manda una parola, non un elenco.** È la ragione per cui le azioni sono due e ricevono `tag`, non `tags`. Accettare l'array intero vorrebbe dire fidarsi del client su quali tag ha quel cliente: la policy protegge la riga di un altro proprietario, non la colonna scritta male sulla propria (`kb-0.md` §3).
3. **`parseTag` sul server, prima di comporre qualsiasi cosa.** Il `maxLength` dell'input serve a chi scrive, non alla sicurezza: la validazione lato client non è una difesa (NFR10).
4. **Nel log del rifiuto non finisce il valore.** Un tag è testo scritto da una persona su un cliente reale: è un dato del cliente (NFR15). Si registra che è stato rifiutato, non cosa era.

### Tipi: `any` è vietato

`tsconfig.json` ha `strict` e `noUncheckedIndexedAccess`.

- `ClientRow['tags']` è `string[]` nei tipi generati (`database.types.ts:169`): non serve nessun restringimento e non si tocca il file generato.
- `TagResult` è una union discriminata come `EmployeesResult`, non un oggetto con campi opzionali: con `{ ok?: boolean; value?: string; message?: string }` esistono combinazioni impossibili e prima o poi il codice ne rende una.
- `collectTagSuggestions` prende `readonly { tags: string[] }[]` e non `ClientRow[]`: la funzione ha bisogno di una colonna sola, e chiedere la riga intera legherebbe un modulo puro allo schema.
- Nessun `as` per far passare i tipi. Se serve, la forma è sbagliata.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| Sesto `kind` dentro `ClientFieldForm` | Una macchina a stringa piegata a rappresentare un array, e i suggerimenti che smettono di funzionare | Componente proprio, `client-field-form.tsx` non si apre |
| Una sola azione che riceve l'array intero | Il browser detta quali tag ha il cliente, non solo quale aggiunge | Due azioni, una parola per chiamata |
| `update` anche quando il tag c'è già | `updated_at` si sposta, il cliente salta in cima all'elenco per niente | Uscire prima di scrivere, senza errore |
| `sort()` sull'array dei tag | I chip già presenti si rimescolano sotto gli occhi | Aggiunta in coda, ordine di inserimento |
| Seconda copia della regex dei caratteri invisibili | Due copie che si allontanano alla prima riscrittura (`kb-0.md` §9) | Esportare quella che esiste |
| `.test()` su `INVISIBLE` | Il flag `g` porta `lastIndex` avanti e il controllo salta un carattere sì e uno no | Solo `String.replace` |
| Limite dei 40 caratteri misurato sul grezzo | Un tag valido con spazi ai bordi viene rifiutato | Misurare sul normalizzato |
| `useActionState` per le due azioni | Una rete caduta risale al confine d'errore e porta via la scheda intera | `startTransition` + `catch`, come `use-editable-field.ts` |
| Copia locale dei tag nello stato del componente | Torna il difetto già rimandato: un `baseline` che cambia e non risincronizza | I chip si rendono dalla proprietà |
| `revalidatePath` solo sulla scheda | L'elenco mostra i tag vecchi e l'ordine vecchio | Rivalidare anche `/clienti` |
| Query dei suggerimenti che fa cadere la pagina | Un aiuto mancante spegne una scheda compilabile | Errore registrato, elenco vuoto, si va avanti |
| `.pill` riusata per i chip | 22px di altezza e un punto da 6px su un controllo che si tocca | Classe `.tag` propria, 44px |
| `SaveIndicator` sotto i tag | Racconta un salvataggio automatico che non c'è (D21) | Nessun indicatore: la conferma è il chip |
| Pulsanti dei chip senza `type="button"` | L'Invio nel campo li fa partire come invio del form | `type="button"` su ognuno |
| `×` come unico contenuto del pulsante | Un pulsante senza nome accessibile (UX-DR14) | `aria-label` con il tag dentro |
| `details` dell'errore Supabase nei log | Contiene valori della riga, cioè dati del cliente | Solo `code` e `message` (NFR15) |
| Chip colorati | Il colore smette di significare esito o sezione (UX-DR2) | Neutro: `--surface-sunken` e `--ink` |

### Una corsa nota, e perché si accetta

`addClientTag` e `removeClientTag` leggono l'array, lo ricompongono e lo riscrivono. Con la stessa scheda aperta in due posti, due aggiunte simultanee possono far perdere la prima: entrambe leggono lo stesso elenco di partenza e la seconda scrittura sovrascrive.

Si accetta, con il motivo scritto. L'alternativa è una funzione nel database che faccia `array_append` in una sola istruzione, cioè una migrazione nuova per una corsa che richiede due schede aperte sullo stesso cliente nello stesso secondo, con un utente solo (D9). `AGENTS.md` dichiara che l'Epic 1 non porta migrazioni, e `kb-0.md` §9 chiama «correzione a cascata» esattamente questo: costruire la macchina prima del problema.

Il giorno che gli utenti diventano più di uno, questa è una delle cose da riprendere — insieme alle policy, che quel giorno cambiano comunque.

### Contratto visivo

- I tag sono **neutri**: fondo `--surface-sunken`, testo `--ink`. Nessun colore di sezione e nessun colore semantico, perché verde, ambra e rosso significano esiti e il blu significa la sezione (UX-DR2). In questa schermata la cosa colorata è già una sola, il punto della pillola di stato.
- Il chip è alto 44px come `.input`, e la sua `×` è un bersaglio da 44px: è un controllo che si tocca, e le call si fanno anche su tablet (UX-DR14, NFR4).
- Etichetta vera `Tag` con `htmlFor`, mai il solo campo a fare da etichetta (UX-DR14). L'`id` segue la convenzione degli altri campi: `campo-tags`.
- `Aggiungi` è primario e compare solo quando c'è qualcosa da aggiungere. Resta l'unica azione primaria del campo (UX-DR10).
- Voce: italiano, frase minuscola, voce attiva. L'etichetta è `Tag`, che è la parola con cui la colonna dell'elenco li chiama già (UX-DR13). L'azione si chiama `Aggiungi` dal pulsante fino al chip che compare.
- Errori che dicono cosa fare, mai cosa è successo nello stack (NFR16). Il dettaglio resta nei log, e nei log non finiscono mai dati di clienti (NFR15).
- Nessun esadecimale fuori da `globals.css` (UX-DR16).

**Una discordanza già presente, che questa story non corregge:** `.input:focus` usa `--sec-prequalifica` (`globals.css:404`), mentre UX-DR14 chiede l'alone nella tinta della sezione corrente. Vale anche per il campo nuovo. Correggerla tocca ogni campo del progetto: resta alla **Story 5.2** per decisione del 2 agosto 2026 (`deferred-work.md`).

### Test

Non esiste ancora un comando che esegua i test: introdurlo è la **Story 1.6**. Qui l'unico obbligo è che `client-tags.ts` non importi né React né Supabase e che esporti tutto quello che 1.6 vorrà provare.

`normalizeTag` e `collectTagSuggestions` sono i due candidati veri: la prima è una trasformazione che, se si rompe, produce dati sbagliati nel database — tre scritture dello stesso tag — e la seconda è quella che decide cosa si vede nel campo. È esattamente la logica che `kb-0.md` §7 chiede di mettere sotto test.

La verifica di questa story è la prova a mano di Task 7. Il codice si considera non funzionante finché non lo si è visto funzionare.

### Project Structure Notes

```
src/lib/
├── client-fields.ts        invariato (tags non ci entra, come name e status)
├── client-status.ts        invariato
├── client-tags.ts          NUOVO — normalizzazione, limite, parse, suggerimenti. Puro.
├── use-editable-field.ts   invariato
└── validate-client-name.ts + export su INVISIBLE, nient'altro

src/app/(app)/clienti/
├── page.tsx                elenco (invariato: rende già tutti i tag)
├── actions.ts              + addClientTag, + removeClientTag
└── [id]/
    ├── page.tsx            tags in COLUMNS, query dei suggerimenti, campo reso
    ├── loading.tsx         + scheletro della riga dei tag
    ├── client-field-form.tsx  invariato
    └── client-tags-form.tsx   NUOVO — chip, campo con datalist, due azioni
```

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni in `camelCase`, un componente per file, oltre 200 righe un file quasi sempre contiene due cose. Nomi in inglese nel codice, in italiano nell'interfaccia.

Nessuna dipendenza nuova. In particolare nessuna libreria di combobox, di tag input o di chip: quello che serve è un `<input list>` con il suo `<datalist>`, che è nativo e su tablet si comporta meglio di qualunque sostituto (NFR4, `kb-0.md` §2).

**Una misura da tenere d'occhio:** `actions.ts` è a 383 righe e con le due azioni nuove arriva verso le 460. `kb-0.md` §2 dice che oltre le 200 un file quasi sempre contiene due cose. Qui la regola vale meno alla lettera — è un modulo di azioni, non un componente, e la Story 1.3 aveva già stabilito che 1.4 e 1.5 mettono le loro azioni lì — ma è il momento di dirlo invece di scoprirlo alla 1.5. Vedi la domanda in fondo.

### Piattaforma in uso, verificata

Da `package.json` alla data di creazione della story: Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna di queste va aggiornata in questa story, e non ne entra nessuna nuova.

Conseguenze che contano qui:

- Le Server Action stanno in un file con `'use server'` in testa e vengono chiamate dal browser: quello che arriva dal `FormData` non è attendibile, mai.
- `revalidatePath` è l'unico modo con cui una scrittura si riflette sulle due schermate. Chiamata a mano, va dentro `startTransition`, altrimenti la rivalidazione arriva come aggiornamento urgente.
- `useActionState` viene da `react`, non `useFormState` da `react-dom`. In questo progetto però i campi non ci passano affatto: chiamano l'azione a mano dentro `startTransition`, ed è una decisione presa in revisione il 3 agosto 2026 (`use-editable-field.ts:35-49`). **Non tornare indietro**, e non è nemmeno un dettaglio di gusto: è la differenza fra un errore di rete che diventa un messaggio e uno che porta via la scheda.
- `.update({ tags: [...] })` su una colonna `text[]`: supabase-js manda l'array come JSON e PostgREST lo converte. Non serve nessuna funzione, nessun `array_append`, nessuna sintassi `{a,b}` a mano.
- `<datalist>` è HTML nativo e React lo rende senza nulla di speciale. È supportato dai browser correnti, **ma la resa e il momento in cui i suggerimenti compaiono cambiano da browser a browser**, e Safari fa storia a sé: per questo la prova su iPad è fra quelle da percorrere con una sessione aperta, come lo è stata quella del `<select>` nella Story 1.3. Non si dà per verificato quello che non si è visto.

### Intelligence dai commit

Da `d10eaa1` e `461c7ab` (Story 1.3, implementazione e chiusura), le abitudini che questa story eredita:

- **Le azioni stanno tutte in `actions.ts`** e riusano `openSession`, la costante `UUID` e lo stesso trattamento degli errori. Non se ne scrive una copia.
- **Nei log vanno `code` e `message`, mai `details`**, e mai il valore rifiutato.
- **`maybeSingle` e non `single`**: con la sicurezza a livello di riga attiva, la riga di un altro proprietario e una riga cancellata arrivano identiche, cioè zero righe.
- **Le azioni della scheda non reindirizzano mai**, nemmeno a sessione finita: un messaggio che dice cosa fare, e basta.
- **Il file di story ha già sbagliato tre volte su dettagli visivi non visti resi** (il `padding-right` del selettore, i punti della pillola): quello che riguarda la resa va provato sull'anteprima, non dedotto.
- **Task 7 si divide in due**: quello che l'agente può verificare e quello che richiede una sessione. Le seconde restano vuote finché non le percorre Luca. La story non va a `done` prima.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

Le voci ancora aperte in `deferred-work.md` riguardano `.btn` a 40px, l'alone del focus, l'hover di riga nell'elenco, il ramo d'errore dell'elenco senza pulsante, i `metadata` mancanti sulle rotte, la regex uuid duplicata, la finestra dei tre secondi del salvataggio automatico, i due campi lunghi che possono far tornare indietro `baseline`, lo stato fuori dai cinque, il `save()` che non controlla `dirty` e i cinque ternari del campo modificabile. **Nessuna di queste viene chiusa da questa story, e nessuna peggiora**: in particolare i cinque ternari restano cinque, perché il sesto `kind` non arriva.

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 1.4: Marcare i clienti con tag riusabili]
- FR4, tag liberi e multipli con suggerimenti e minuscolo forzato: [Source: docs/prd-v1.md#3. Entità e campi], [Source: docs/prd-v1.md#4. Schermate]
- Colonna `tags`, indice gin, suggerimenti con `unnest`, il prezzo consapevole dell'array: [Source: docs/database.md#3. Tabelle]
- Policy e trigger: [Source: docs/database.md#6. Protezione degli accessi, due varianti], [Source: docs/database.md#4. Aggiornamento automatico di updated_at]
- Colore che non è mai l'unico portatore di significato, pillole, bersagli tattili: [Source: docs/design-system.md#2. Colore], [Source: docs/design-system.md#5. Componenti], [Source: docs/design-system.md#8. Accessibilità]
- Regole vincolanti: [Source: docs/kb-0.md#2. Convenzioni di codice], [Source: docs/kb-0.md#3. Sicurezza], [Source: docs/kb-0.md#6. Interfaccia e design], [Source: docs/kb-0.md#7. Verifica], [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Decisioni: **D17** (tag liberi, suggeriti e normalizzati in minuscolo), **D14** (il software non blocca niente), **D21** (quando un campo si salva da solo e quando si conferma), D9 (un utente ora, più utenti dopo), D13 e D15 (l'anagrafica si sovrascrive) — [Source: docs/00-contesto-e-decisioni.md]
- Story precedente, pattern delle azioni e correzioni della revisione: [Source: docs/bmad/implementazione/1-3-cambiare-lo-stato-del-cliente.md]
- Voci rimandate ancora aperte: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, da chiudere prima o durante lo sviluppo

1. **Togliere un tag non è chiesto da nessuna AC.** L'ho messo dentro: senza, un tag battuto male resterebbe per sempre su quel cliente, che è l'argomento con cui D22 ha aperto la rinomina del nome. Confermi che entra in questa story?
2. **`actions.ts` arriva verso le 460 righe.** Si lascia crescere fino alla 1.5 e poi si divide in un colpo solo, oppure questa story lo divide già (per esempio `client-actions.ts` e `tag-actions.ts`)? Lasciarlo com'è è la scelta di default: dividerlo adesso tocca un file uscito da tre revisioni.
3. **Quaranta caratteri per un tag** è un numero che ho scelto io, sul criterio «deve restare leggibile nella colonna dell'elenco». Va bene, o preferisci più stretto?
4. **La corsa lettura-scrittura** descritta sopra: la accetto e la lascio scritta qui dentro, oppure la registro in `deferred-work.md` così resta visibile fuori da questa story?
5. **Nell'elenco i tag restano testo unito dalla virgola**, non chip. Confermi, o li vuoi come chip anche lì (allora è un'altra story, perché tocca il file dell'elenco e la regola della cosa colorata)?

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), workflow `bmad-dev-story`, 3 agosto 2026.

### Debug Log References

**Verifica delle funzioni pure.** Non esiste ancora un comando che esegua i test — arriva con la Story 1.6 — quindi i tre moduli puri sono stati compilati con `tsc` in un file di scratch e provati con un'esecuzione a mano. Gli esiti attesi sono stati scritti prima di eseguire, non dopo. 30 controlli, 30 passati:

- `normalizeTag`: `'Referral'`, `'  referral  '`, `'REFERRAL'` → `'referral'`; `'refer  ral'` → `'refer ral'`; `'referral'` + zero-width → `'referral'`; `''` e `'   '` → `''`; `'Città'` → `'città'`.
- `parseTag`: i cinque casi sopra accettati; `''`, `'   '`, `null`, `undefined`, `42`, `{}` rifiutati con `'Scrivi il tag prima di aggiungerlo.'`; 41 caratteri rifiutati, 40 accettati; **45 caratteri grezzi che dopo il taglio degli spazi ne fanno 38 accettati**, cioè il limite si misura sul normalizzato.
- `collectTagSuggestions`: nessuna riga → `[]`; righe con `tags` vuoto → `[]`; tre righe con lo stesso tag → una voce sola; `['zeta','àlfa','beta']` → `['àlfa','beta','zeta']`, cioè l'accento ordinato accanto alla lettera e non in coda all'alfabeto.
- Allow-list: `isClientFieldKey('tags')`, `('status')`, `('name')` rispondono falso, `('sector')` vero.

**Verifica del perimetro.** `git status` conferma che `client-field-form.tsx`, `use-editable-field.ts` e l'elenco `clienti/page.tsx` non compaiono nel diff. `grep` conferma che `client-tags.ts` importa solo `./validate-client-name` e che nessun file toccato contiene un esadecimale fuori da `globals.css`. Il diff di `validate-client-name.ts` è di una parola sola: `const INVISIBLE` → `export const INVISIBLE`, espressione regolare intatta.

**Verifica della compilazione.** `npm run typecheck` e `npm run build` puliti, stesse sette rotte di prima.

**Quello che non è stato verificato, e perché.** Il server di sviluppo è stato avviato e la rotta `/clienti/[id]` chiesta: il proxy reindirizza a `/accedi`, come deve fare senza sessione. Nessun errore in console. La scheda vera non è raggiungibile senza un collegamento che arriva per email, quindi **tutte le prove della seconda metà di Task 7 restano vuote**: la resa dei chip, il `<datalist>` su Safari e iPad, il comportamento da tastiera e il lettore di schermo non li ha visti nessuno. Una casella spuntata per conto di terzi vale meno di una vuota (`kb-0.md` §7).

### Completion Notes List

Implementati i Task da 1 a 6. Task 7 è chiuso per la metà verificabile senza sessione e aperto per l'altra.

**Le cinque domande in fondo alla story sono state chiuse con la risposta di default già scritta nei task**, perché ogni task ne conteneva già una:

1. **Togliere un tag entra in questa story.** Era già nell'elenco dei task (`removeClientTag`), e senza, un tag battuto male resterebbe per sempre su quel cliente.
2. **`actions.ts` non si divide adesso.** Era la scelta di default dichiarata. Il file è passato da 383 a **534 righe** (566 dopo le correzioni della revisione), cioè settanta più delle 460 che la story stimava: le due azioni hanno più passaggi delle altre perché leggono l'array prima di ricomporlo. La divisione, se si fa, si fa alla 1.5 in un colpo solo, su un file uscito da quattro revisioni invece che tre — ma il numero va guardato allora, non rimandato ancora.
3. **Quaranta caratteri** restano il limite del tag.
4. **La corsa lettura-scrittura resta scritta qui dentro**, non in `deferred-work.md`: richiede due schede aperte sullo stesso cliente nello stesso secondo, con un utente solo.
5. **Nell'elenco i tag restano testo unito dalla virgola.** AC3 era già soddisfatta da `page.tsx:83` e quel file non è stato aperto.

**Le cose scritte che la story non specificava, e il motivo.** *Corretto in revisione il 3 agosto 2026: qui ne erano dichiarate tre, ma sono almeno sei. Le tre non dichiarate sono `setError(null)` sul `onChange` dell'input, `disabled={pending}` su ogni `×` e sul pulsante, e il pulsante che cambiava nome in `Salvataggio…` — che è proprio quella che si nascondeva nello scarto, ed è stata corretta.*

- **`.tag__remove:disabled`** in `globals.css`. Il pulsante della `×` è disabilitato durante una scrittura in corso, e senza questa regola lo stato disabilitato non si vedrebbe. Segue la grammatica di `.btn:disabled`, che è già `opacity: 0.5`.
- **Il fuoco torna nel campo anche dopo aver tolto un tag, ma solo se la `×` è stata premuta da tastiera.** Il pulsante che aveva il fuoco sparisce insieme al chip: senza rimetterlo, chi usa la tastiera resta senza posizione e il Tab riparte da capo, mentre Task 7 chiede che il fuoco si veda sempre. Rimetterlo *anche* col dito però aprirebbe la tastiera software a ogni tag tolto, che su tablet è un fastidio a ogni tocco — e le call si fanno su tablet (NFR4). I due casi si distinguono con `event.detail === 0`, che vale zero quando il click è generato dalla tastiera. **È il pezzo di questa story che va guardato per primo in revisione:** è l'unica scelta che non deriva da una riga della story, e la prova sta nella metà di Task 7 che nessuno ha ancora percorso.
- **L'Invio a campo vuoto non chiama il server.** Il server rifiuterebbe comunque con il messaggio giusto, ma un errore rosso per un Invio a vuoto sarebbe rumore, e Task 7 chiede che non succeda «niente di brutto».

**Quello che non è peggiorato:** `client-field-form.tsx` resta a 175 righe e a cinque ternari, perché il sesto `kind` non è arrivato. La voce corrispondente in `deferred-work.md` resta esattamente com'era.

### File List

**Nuovi**
- `src/lib/client-tags.ts`
- `src/app/(app)/clienti/[id]/client-tags-form.tsx`

**Modificati**
- `src/lib/validate-client-name.ts`
- `src/app/(app)/clienti/actions.ts`
- `src/app/(app)/clienti/[id]/page.tsx`
- `src/app/(app)/clienti/[id]/loading.tsx`
- `src/app/globals.css`
- `docs/bmad/implementazione/sprint-status.yaml`
- `docs/bmad/implementazione/1-4-marcare-i-clienti-con-tag-riusabili.md`

## Change Log

| Data | Cosa |
|---|---|
| 3 agosto 2026 | Story creata sulle tre AC di `epics.md`. Decisa la forma del campo: componente proprio invece del sesto `kind` di `ClientFieldForm`, con i tre motivi strutturali scritti. Decise due azioni separate invece di una che riceve l'elenco intero. Deciso che l'elenco clienti non si tocca, perché AC3 è già soddisfatta. Cinque domande aperte in fondo. |
| 3 agosto 2026 | Task 1-6 implementati. `client-tags.ts` con `normalizeTag`, `parseTag`, `collectTagSuggestions` e il limite dei 40 caratteri; `INVISIBLE` esportata invece che copiata; `addClientTag` e `removeClientTag` in `actions.ts`; `client-tags-form.tsx` con chip, `<datalist>` e chiamata a mano dentro `startTransition`; `tags` e i suggerimenti nella scheda; cinque classi in `globals.css`; scheletro allineato. Le cinque domande chiuse con la risposta di default. |
| 3 agosto 2026 | Task 7 chiuso per la metà verificabile senza sessione: 30 controlli sulle funzioni pure, perimetro del diff, typecheck e build. La metà che richiede una sessione resta vuota, e la story non va a `done` prima che la percorra Luca. |
| 3 agosto 2026 | Revisione a tre livelli in parallelo. Ventuno rilievi: quattro decisioni chiuse da Luca, tredici correzioni applicate, cinque voci rimandate in `deferred-work.md`, tre scartati. La più pesante era `setDraft('')` incondizionato, che portava via il tag scritto durante l'attesa. Corretta anche la corsa lettura-scrittura come voce visibile fuori da questa story, e `parseTag` che ora rifiuta la virgola. `client-tags-form.tsx` sale a 241 righe: la divisione resta da decidere prima della 1.5. Stato riportato a `in-progress`, perché le correzioni hanno toccato la resa e la seconda metà di Task 7 non l'ha ancora percorsa nessuno. |
