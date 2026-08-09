---
baseline_commit: e194e67
---

# Story 3.3: Non pensare mai al salvataggio

Status: done

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 9 agosto 2026

> **Baseline.** La Story 3.2 è implementata, revisionata e chiusa: `e194e67` su `main`, albero pulito. Tutti i conteggi di questo file (righe, test, grep, stato del database) sono presi da quel commit e dal progetto Supabase, verificati il 9 agosto 2026: **171 test verdi**, quindici migrazioni a registro tutte col prefisso, **3 clienti, 1 persona, 0 schede, 0 risposte, 9 blocchi, 24 domande tutte attive**.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want che quello che scrivo si salvi da solo e che lo strumento me lo dica,
so that posso guardare in faccia il cliente invece di cercare un pulsante Salva.

## Acceptance Criteria

**AC1 — tre secondi dopo l'ultima battuta, senza fare niente**
**Given** un campo in cui sto scrivendo
**When** smetto di digitare per tre secondi
**Then** il contenuto viene salvato senza che io faccia niente (FR19)

**AC2 — l'indicatore è ancorato in fondo e non se ne va mai**
**Given** la schermata di compilazione
**When** la guardo in qualsiasi momento
**Then** vedo l'indicatore di salvataggio ancorato in fondo, sempre visibile, in monospaziato (UX-DR8)

**AC3 — a riposo dice l'ora**
**Given** un salvataggio riuscito
**When** guardo l'indicatore
**Then** dice `Salvato alle 14:32` in `--ink-faint`

**AC4 — in corso lo dice**
**Given** un salvataggio in corso
**When** guardo l'indicatore
**Then** dice `Salvataggio…` in `--ink-muted`

**AC5 — quando cade, lo dice e non porta via niente**
**Given** una connessione che cade durante il salvataggio
**When** guardo l'indicatore
**Then** dice `Non salvato, riprovo` in `--bad` con accanto un pulsante Riprova
**And** il contenuto scritto resta nel campo e non viene perso (NFR1)

**AC6 — il comando esplicito esiste**
**Given** la schermata di compilazione
**When** cerco un comando esplicito di salvataggio
**Then** esiste, oltre a quello automatico (FR19)

**AC7 — nessuna cerimonia**
**Given** l'indicatore di salvataggio
**When** cambia stato
**Then** non compare nessuna spunta animata e nessun avviso a comparsa (UX-DR8)

> **Questa story chiude la promessa che dà il nome al prodotto.** `AGENTS.md` e `kb-0.md` §6 mettono «il lavoro dell'utente non si perde mai» fra le regole non negoziabili, e la 3.2 ha consegnato di proposito una schermata dove non era vera, con un avviso a schermo che lo diceva. **Quell'avviso sparisce qui**, e sparisce insieme alla cosa che descriveva: se resta, mente.

> **La macchina del salvataggio esiste già e non si riscrive.** `useEditableField` e `SaveIndicator` sono in piedi, provati e in uso sulla scheda cliente da sei story. Quello che è nuovo è **uno solo**: l'indicatore era per campo, qui è **uno per schermata, ancorato in fondo**, e ventiquattro campi devono confluirci senza mentire. Tutto il resto è riuso.

> **Non porta il verdetto** (3.5), **né lo stato di compilazione** (3.6), **né il contatore e la barra** (4.1), **né l'esportazione** (4.3). E non porta nessuna migrazione, salvo diversa risposta alla domanda 2.

## Tasks / Subtasks

- [x] **Task 1 — L'azione che scrive una risposta** (AC: 1, 5, 6)

  - [x] `src/app/(app)/clienti/answer-actions.ts` **nuovo**, `'use server'`, **una azione sola**: `saveAnswer`. File suo e non dentro `assessment-actions.ts`, che porta `openAssessment`: è un'altra tabella e un altro momento, e «un file d'azione porta una azione» è la regola già dichiarata in `question-update-actions.ts`.
  - [x] Firma con la forma di tutte le altre: `saveAnswer(_previous: SaveAnswerState, formData: FormData): Promise<SaveAnswerState>`, con `SaveAnswerState = { error?: string; saved?: string }`. È la forma che `useEditableField` si aspetta da `run` — `SaveResult` ha `error`, `saved` e `duplicateOf`, e le prime due bastano: qui non esistono doppioni.
  - [x] `openSession('saveAnswer')` in testa, e **nessun `redirect`**: le azioni della scheda non mandano mai a `/accedi`, perché una navigazione porterebbe via quello che è appena stato scritto negli altri ventitré campi. È scritto in `src/lib/supabase/session.ts` e vale qui più che altrove.
  - [x] `answer_id` dev'essere un uuid (`UUID.test`, come le azioni del cliente): qualsiasi altra forma è una richiesta che non doveva esistere e si rifiuta prima di toccare il database. Nei log **solo il fatto del rifiuto**, mai il valore.
  - [x] `content` dev'essere una stringa (`typeof raw !== 'string'` → rifiuto). Svuotare una risposta si fa mandando la stringa vuota; una chiave assente è una richiesta malformata, e trattarla come «svuota» vorrebbe dire cancellare una risposta e rispondere che è andata bene. È la stessa distinzione già scritta in `updateClientField`.
  - [x] La normalizzazione è `normalizeTextValue` di `@/lib/client-fields`, **importata e non riscritta**. Fa esattamente la regola che serve — `trim()`, e stringa vuota → `null`, mai `''` nel database (D13) — ed è la **stessa definizione di «vuoto»** che il conteggio dell'avanzamento userà nella 4.1 (`coalesce(trim(content), '') <> ''`, `database.md` §3). Riscriverla qui darebbe due definizioni di vuoto su due lati dello stesso numero, destinate a divergere. Il nome del file dice `client` e la funzione no: se un terzo chiamante arriva, si sposta in un modulo suo — con due non ancora.
  - [x] La scrittura, e il ritorno porta i due identificativi che servono a rivalidare:
    ```ts
    .from('answers')
      .update({ content })
      .eq('id', answerId)
      .select('assessment_id, assessments(client_id)')
      .maybeSingle()
    ```
    **I percorsi da rivalidare si ricavano dalla riga appena scritta, non dal `formData`.** È la voce già a ledger sul `PERSON_GONE` — «`revalidatePath` con un percorso suggerito dal client» è la cosa che quella voce esiste per non fare — e qui costa un innesto invece di una lettura in più. `answers.assessment_id` è `not null` con una sola chiave esterna, quindi il percorso non è ambiguo. **La forma dell'innesto va vista rispondere, non dedotta**: se il tipo generato lo desse come elenco, si legge secondo il tipo che arriva e non si forza con un `as` (kb-0.md §2), e lo si dichiara nel Dev Agent Record. È la lezione della 3.2, dove la sonda `never` ha smentito l'abitudine.
    `maybeSingle` e non `single`: con la sicurezza a livello di riga attiva, una risposta di un altro proprietario e una risposta cancellata arrivano identiche, cioè zero righe.
    `updated_at` non si scrive mai a mano: lo aggiorna `answers_set_updated_at` (0006).
  - [x] Errore: si logga **`code` e `message` e mai `details`**. Qui la regola morde più che altrove: `details` conterrebbe il **contenuto della risposta**, cioè quello che un cliente reale ha detto in una call, che è la categoria di dato più sensibile del sistema (kb-0.md §3 e §4). Il messaggio all'utente è `Il campo non è stato salvato. Riprova fra un momento.`
  - [x] `!data` → `Questa risposta non è più disponibile. Ricarica la pagina.` Non «torna all'elenco», che è il messaggio della scheda cliente: qui ricaricare è davvero il rimedio, e mandare via da una schermata piena di testo appena scritto sarebbe la cosa peggiore.
  - [x] **`revalidatePath` sulla sola rotta di compilazione** (v. decisione 3 e domanda 2): `revalidatePath(/clienti/${clientId}/schede/${assessmentId})`. **Non** `/clienti` e **non** `/clienti/${clientId}`: nessuna delle due rende oggi qualcosa che questa scrittura cambi — la card del cliente mostra data e interlocutore (3.2), l'avanzamento è la 4.1, e l'ordinamento dell'elenco guarda `assessments.updated_at`, che scrivendo una risposta **non si muove**. Rivalidarle sarebbe costo senza effetto, e — peggio — sembrerebbe la correzione di un difetto che invece resta. La voce a ledger dell'elenco va corretta di conseguenza (Task 6).
  - [x] Ritorno `{ saved: content ?? '' }`. Serve a `useEditableField` per riallineare il campo dopo che il server ha ripulito: senza, uno spazio in coda lascerebbe il campo sporco e la barra col comando acceso su una risposta già salvata.
  - [x] **Nessun limite di lunghezza su `content`, ed è dichiarato.** Una risposta è testo lungo per natura e un tetto sarebbe un numero inventato; il caso appartiene alla voce già a ledger sui campi della persona, che si chiude in una passata sola decidendo una volta dove sta il limite e chi lo dice a schermo. Va annotata (Task 6), non risolta qui.

- [x] **Task 2 — Il registro dei campi e l'aggregazione: modulo puro col suo test** (AC: 2, 3, 4, 5)

  Questa è **l'unica macchina nuova della story**, ed è la ragione per cui la 3.2 ha lasciato qui l'indicatore unico: oggi `SaveIndicator` è montato per campo dentro `ClientFieldForm`, e UX-DR8 chiede **una riga sola ancorata in fondo**. Ventiquattro stati devono diventare uno, e la regola con cui diventano uno è logica che, sbagliata, produce **la bugia peggiore che questo prodotto possa raccontare**: `Salvato alle 14:32` mentre una risposta non è stata scritta. `kb-0.md` §7 assegna i test automatici esattamente a questo.

  - [x] `src/lib/save-store.ts` **nuovo**, senza React e senza Supabase. Un solo `import type { SaveState } from '@/components/save-indicator'` — di tipo, quindi cancellato a runtime: non si duplica l'unione dei quattro stati, che è già dichiarata una volta sola. **Va verificato che `node --test` lo digerisca** (i moduli di `src/lib` oggi sotto test non usano l'alias `@/`): se non lo digerisse, il ripiego è l'import relativo con estensione, e si dichiara nel Dev Agent Record.
  - [x] Estensione `.ts` sugli import interni, se ne servono: è la regola già scritta su `client-tags.ts:1`.
  - [x] `aggregateSaveState(fields): SaveState`, **esportata e testata a parte**. La priorità, in quest'ordine e non in un altro:
    1. **un solo `failed` vince su tutto.** Un fallimento nascosto sotto un `Salvato` è esattamente il difetto che l'indicatore esiste per impedire.
    2. altrimenti un `saving` qualsiasi → `saving`.
    3. altrimenti il `saved` **più recente** (`at` massimo): l'ora dell'ultimo salvataggio riuscito, non del primo.
    4. altrimenti `idle`, che è anche il caso dell'elenco vuoto.
  - [x] `createSaveStore()`: il registro, con `subscribe`, `getSummary`, `set(id, entry)`, `remove(id)`, `saveDirty()` e `retryFailed()`. Ogni voce è `{ state: SaveState; dirty: boolean; pending: boolean; save: () => void }`, e il riassunto è `{ state: SaveState; dirty: number }` — lo stato da mostrare e quanti campi hanno qualcosa da salvare.
  - [x] **`getSummary` restituisce lo stesso oggetto finché il riassunto non cambia davvero**, e non è un'ottimizzazione: `useSyncExternalStore` richiama la funzione a ogni resa e va in ciclo infinito se l'identità cambia ogni volta. Il riassunto si ricalcola dentro `set`/`remove`, si confronta con quello in cache (`kind`, `at.getTime()`, numero dei `dirty`) e, se è uguale, **si tiene il vecchio oggetto e non si avvisa nessuno**. È la parte che rende la barra ferma mentre si scrive.
  - [x] `saveDirty()` chiama `save()` **solo** sulle voci `dirty && !pending`; `retryFailed()` solo su quelle `state.kind === 'failed' && !pending`. Il filtro sta qui e non nella barra: è la stessa decisione presa in due punti, e due punti divergono.
  - [x] Una costante `EMPTY_SUMMARY` congelata, esportata: serve come `getServerSnapshot` alla barra, che viene resa **anche sul server** perché sta dentro un componente client. Senza, `useSyncExternalStore` solleva durante la resa sul server.
  - [x] `src/lib/save-store.test.ts` **nuovo**. Sull'aggregazione: elenco vuoto → `idle`; tutti `idle` → `idle`; un `saved` → la sua ora; due `saved` → **la più recente**; un `saving` fra dei `saved` → `saving`; un `failed` fra dei `saving` → `failed`; un `failed` fra dei `saved` → `failed`. Sul registro: due `set` con lo stesso contenuto **non avvisano** e `getSummary` risponde **lo stesso oggetto** (identità, che è il contratto di `useSyncExternalStore`); un `set` che cambia stato avvisa; `remove` toglie e ricalcola; `saveDirty` chiama solo i sporchi e non i pendenti; `retryFailed` chiama solo i falliti; il conteggio dei `dirty`.

- [x] **Task 3 — Il campo si salva da solo** (AC: 1, 5)

  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx` **modifica**. Sparisce `useState(content ?? '')` e arriva `useEditableField({ run, baseline: content ?? '', autosave: true })`. È il diff che la 3.2 aveva preparato scrivendo lo stato dentro il campo invece che nella pagina: **il file non si riscrive, si sostituisce la fonte del valore**.
  - [x] **`run` va dentro `useCallback`, ed è la trappola più grossa della story.** `useEditableField` mette `run` fra le dipendenze di `write`, e `write` fra quelle dell'effetto che arma il timer: un `run` ricreato a ogni resa **riarma il timer a ogni resa**, e il salvataggio automatico può non partire mai. Fallirebbe AC1 in silenzio, senza nessun errore. `ClientFieldForm` lo avvolge per questa ragione, e qui vale identico:
    ```ts
    const run = useCallback((next: string): Promise<SaveResult> => {
      const payload = new FormData()
      payload.set('answer_id', answerId)
      payload.set('content', next)
      return saveAnswer({}, payload)
    }, [answerId])
    ```
    Il `FormData` lo costruisce `run`, sempre, sia che a tirare la corda sia il timer, sia l'uscita dal campo, sia il comando esplicito, sia `Riprova`: **un solo percorso di scrittura**, come sulla scheda cliente.
  - [x] **`autosave: true` porta con sé il salvataggio all'uscita dal campo**, e non è un di più: senza, chi scrive e clicca via entro tre secondi perde quello che ha scritto, cioè esattamente ciò che la regola esiste per impedire (D21). Sta già dentro `useEditableField.control.onBlur` e non si scrive niente.
  - [x] **`ControlProps` guadagna `onFocus` e `onBlur`**, e il tipo esiste apposta: il commento in testa a quel tipo dice, alla lettera, che il giorno che la 3.3 aggiunge `onBlur` l'oggetto letterale non deve compilare finché il tipo non lo conosce, così che `ChoiceField` non resti indietro in silenzio — cioè il salvataggio sparito da **una domanda su ventiquattro**, il difetto più difficile da vedere. Si estende il tipo e si verifica che `ChoiceField` compili senza toccarlo.
  - [x] `shared` diventa `{ ...control, id, 'aria-describedby': …, 'aria-invalid': result.error ? true : undefined }`. `aria-describedby` mette insieme l'aiuto (quando c'è) e la riga d'errore (quando c'è), come fa `ClientFieldForm`.
  - [x] **La riga d'errore sta sotto il campo, e serve perché la barra non può dirlo.** `result.error` si rende in un `<p className="field__error" role="alert">`, la stessa classe e lo stesso ruolo della scheda cliente. L'indicatore ancorato dice *che* qualcosa non è stato salvato; con ventiquattro campi, **quale** lo può dire solo il campo. Senza questa riga, AC5 è soddisfatta a metà: si sa che c'è un guasto e non dove.
  - [x] **Nessun `<form>`, ancora, e adesso è una decisione e non un'assenza** (la 3.2 la lasciava a questa story). Un `<form>` porterebbe l'invio implicito con Invio, cioè un ricaricamento della pagina che porta via quello che è stato scritto — su una schermata dove si preme Invio per andare a capo in un campo lungo, è il gesto più probabile della giornata. Il controllo `event.currentTarget.form?.contains(event.relatedTarget)` dentro `onBlur` resta inerte senza un modulo, e va bene: esiste per proteggere `Salva` e `Annulla` **dello stesso campo**, che qui non esistono.
  - [x] **Nessun `Salva` e nessun `Annulla` per campo**: il comando è uno solo e sta nella barra (v. domanda 1). Ventiquattro coppie di pulsanti che compaiono e spariscono mentre si parla al telefono sono il contrario di «non pensare mai al salvataggio».
  - [x] Il campo si iscrive al registro del Task 2, e **il cleanup non va nello stesso effetto**:
    ```ts
    useEffect(() => () => store.remove(answerId), [store, answerId])   // solo allo smontaggio
    useEffect(() => { store.set(answerId, { state: saveState, dirty, pending, save }) })
    ```
    Il secondo effetto gira a ogni resa di proposito: `save` è una chiusura nuova ogni volta, quindi un elenco di dipendenze sarebbe una bugia, e `set` è idempotente e avvisa solo quando il riassunto cambia davvero. Mettere il `remove` **dentro** quel secondo effetto lo farebbe togliere e rimettere a ogni battuta: due ricalcoli e due rese della barra per tasto premuto.
  - [x] `src/lib/answer-control.ts` **modifica, due righe e i loro test**, ed è la voce che `deferred-work.md` assegna esplicitamente a questa story: fino a ieri `content` era sempre `null`, da oggi è scrivibile, quindi i due casi degeneri diventano raggiungibili.
    - `orphanOption` confronta sul testo **ripulito**: con `content = '   '` la forma attuale genera `<option value="   ">   </option>`, cioè una riga vuota nel menu che da selezionata si legge identica a `Nessuna risposta`, che è la confusione che l'opzione orfana esiste per evitare.
    - `answerControl` scarta le opzioni **bianche** prima di decidere: un elemento `''` dentro `answers.options` darebbe due `<option value="">` nello stesso selettore, React associa il valore alla prima — `Nessuna risposta` — e quella risposta diventa irraggiungibile. Se dopo lo scarto non resta nessuna opzione, si cade sul ripiego già esistente (`breve`), senza aggiungere un ramo.
    - I casi nuovi entrano in `answer-control.test.ts`.

- [x] **Task 4 — La barra ancorata in fondo** (AC: 2, 3, 4, 5, 6, 7)

  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/save-boundary.tsx` **nuovo**, `'use client'`. Crea il registro **una volta sola** (`useState(() => createSaveStore())`, mai una chiamata nuda nel corpo, che ne farebbe uno per resa e perderebbe tutte le iscrizioni), lo mette in un contesto, rende `{children}` e sotto la barra. Esporta anche `useAnswerSave()`, l'accesso al registro che il campo usa: è un hook e non un secondo componente, quindi «un componente per file» regge.
  - [x] **Il valore del contesto è il registro e non cambia mai identità.** È il motivo per cui questa story usa un registro esterno invece di tenere gli stati in un `useState` del provider: un valore di contesto che cambia a ogni battuta fa rendere di nuovo **tutti e ventiquattro** i campi che lo consumano, mentre così ne rende uno solo — quello in cui si sta scrivendo — e la barra solo quando la riga da mostrare cambia davvero. I blocchi arrivano come `children` da un componente server, quindi la loro identità è stabile e React salta quel sottoalbero da sé.
  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/save-bar.tsx` **nuovo**, `'use client'`. Legge il riassunto con `useSyncExternalStore(store.subscribe, store.getSummary, () => EMPTY_SUMMARY)` e rende **`SaveIndicator` così com'è** — il componente esiste, ha i tre stati esatti di `design-system.md` §5, non ha spunte né avvisi a comparsa, e AC3, AC4 e AC7 sono soddisfatte **senza scrivere una riga**. `onRetry` è `store.retryFailed`.
  - [x] Accanto, il comando esplicito (AC6): `<button type="button" className="btn btn--primary" onClick={store.saveDirty} disabled={summary.dirty === 0}>Salva</button>`. È l'unica azione primaria della schermata, quindi UX-DR10 regge. `onMouseDown={(e) => e.preventDefault()}` per non togliere il fuoco al campo, che è la ricetta già scritta come `keepFocus` in `ClientFieldForm`: senza, il clic fa uscire dal campo, l'uscita salva, e il clic salva di nuovo.
  - [x] **Un doppio salvataggio dello stesso testo è innocuo, e per questo non serve una macchina in più.** Da tastiera (Tab sul pulsante, poi Invio) l'uscita dal campo e il clic possono passare nella stessa manciata di millisecondi: `save()` si difende con `!pending`, il registro filtra i pendenti, e nel caso peggiore la stessa `update` parte due volte con lo stesso valore. Costa un `updated_at` mosso due volte e nient'altro. Va scritto, altrimenti qualcuno costruirà una difesa per un danno che non c'è.
  - [x] La barra si rende **solo nello stato pieno**, insieme ai blocchi. Negli stati d'errore e vuoto non c'è nessun campo, quindi non c'è niente da salvare e niente da dire: un indicatore fermo su una schermata senza campi è la stessa bugia di un indicatore fermo su una schermata che non salva.
  - [x] **CSS nuovo, una regola: `.save-bar`.** Nessun esadecimale, solo token e la scala di spaziatura.
    ```css
    .save-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: 24px;
      padding: 8px 0;
      background: var(--bg);
      border-top: 1px solid var(--line);
    }
    ```
    **`sticky` e non `fixed`**: un elemento appiccicato occupa il proprio spazio nel flusso, quindi non copre mai l'ultima risposta, mentre uno fisso la nasconderebbe e nessuno se ne accorgerebbe finché non serve rispondere all'ultima domanda. Il fondo dev'essere **opaco** perché il contenuto scorre dietro; `--bg` è il colore su cui la pagina galleggia già. L'altezza minima arriva da `.save-indicator`, che dichiara `min-height: 44px` da sei story.
  - [x] **Da guardare a schermo, e se serve si dichiara**: `.main` ha `padding: 40px` (24/16 sotto i 720px), quindi la barra è larga quanto la colonna del contenuto e non quanto la finestra. Se il contenuto si vedesse scorrere ai lati della barra, il rimedio è un margine negativo con il padding corrispondente — ma si applica **dopo** averlo visto, non prima: è la voce a ledger sulla 3.1, `globals.css` si apre sul bisogno misurato e non sul giudizio, e la 3.2 ha già mostrato come si fa.

- [x] **Task 5 — La pagina: via l'avviso, dentro il confine** (AC: 2)

  - [x] `src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx` **modifica, e solo queste due cose.**
  - [x] **Sparisce la `.warn-box`** «Qui ancora non si salva: quello che scrivi resta finché non ricarichi la pagina.», con tutto il suo commento. È la riga che la revisione della 3.2 ha aggiunto dichiarando «sparisce con la Story 3.3, quando il salvataggio arriva davvero: da lì in poi sarebbe una bugia». Se resta, è una bugia. Se resta il commento senza la riga, è un commento che descrive codice che non c'è.
  - [x] Lo stato pieno diventa `<SaveBoundary>{<AnswerBlocks groups={…} />}</SaveBoundary>`. I blocchi restano un componente server passato come figli: il confine è client, i figli no, e il contesto raggiunge lo stesso i campi, che sono client anche loro.
  - [x] **Nient'altro in quel file**: le due letture non cambiano, i quattro stati non cambiano, l'intestazione non cambia, `.eq('client_id', id)` resta dov'è.
  - [x] `loading.tsx` **non si tocca**: durante il caricamento non c'è nessun campo, quindi nessuna barra da riservare, e uno scheletro di una barra che comparirà vuota farebbe saltare la pagina invece di togliere il salto — è la stessa regola con cui quel file è stato scritto.

- [x] **Task 6 — I documenti**

  - [x] `docs/bmad/implementazione/deferred-work.md`. Annotazioni su voci esistenti, e **una voce nuova sola**, quella che questa story scopre davvero:
    - **Voce nuova**: *salvare una risposta non muove `assessments.updated_at`, quindi l'ultima attività del cliente non si aggiorna durante la compilazione*. `answers_set_updated_at` tocca la riga della risposta, e niente risale alla scheda; `last-activity.ts` e `database.md` §5 leggono `assessments.updated_at`. FR11 dice «la più recente fra la modifica del cliente e la modifica delle sue schede», e compilare una scheda è modificarla. La strada è un trigger su `answers` che tocchi la scheda, cioè una migrazione. Punto di ripresa: la **Story 4.1**, che è la prima a mostrare qualcosa che cambia davvero quando si salva una risposta, e quindi la prima in cui la rivalidazione di `/clienti/[id]` diventa necessaria. Con il costo dichiarato oggi (v. domanda 2).
    - la voce della 1.6 su **la rivalidazione di `/clienti` quando cambia una scheda**, chiusa dalla 3.1, dice che «la regola vale da qui in avanti per ogni scrittura che tocchi una scheda, la 3.3 compresa». Va annotata: applicata alla lettera qui **sarebbe un gesto a vuoto**, perché la chiave d'ordine non si muove — la voce si è chiusa sulla rivalidazione e il problema che descriveva («si lavora un'ora su una scheda, si torna all'elenco e il cliente è dov'era») è ancora lì. Rimanda alla voce nuova.
    - la voce della revisione 1.2 sui **campi lunghi che salvano insieme e fanno tornare indietro `baseline`** dichiara come punto di ripresa «se la Story 3.3 rende il caso frequente». **Lo rende**: ventiquattro campi che salvano da soli sulla stessa schermata, e ogni salvataggio rivalida la rotta. Va annotata con la misura del danno vero, che è meno di quanto la voce prometteva: `value` non si riallinea da `baseline` (è l'altra voce, quella della 1.3), quindi **il testo a schermo non torna indietro mai**; e il timer non rispara, perché `attempted.current === value` glielo impedisce. Quello che resta osservabile è `dirty` che torna vero su un campo salvato, cioè il comando `Salva` acceso quando non c'è niente da salvare. Da riprendere con le sue sorelle.
    - la voce della revisione 1.2 su **i tre secondi fra l'ultima battuta e il salvataggio** dichiara come punto di ripresa «se la Story 3.3 rende la finestra più frequente». Va annotata con quello che è cambiato: la finestra è ora sulla schermata dove si sta un'ora, e i campi sono ventiquattro invece di due. Resta chiusa dal salvataggio all'uscita dal campo per ogni navigazione dentro l'applicazione; scoperta resta la chiusura della finestra del browser con il fuoco ancora dentro (v. domanda 4).
    - la voce della 1.1 su **`.btn` a 40px**: questa story rimette un pulsante su questa schermata — `Salva` nella barra — quindi l'annotazione della 3.2 («nello stato pieno non c'è nessun pulsante») smette di valere per lo stato pieno. Va corretta, perché è scritta nel documento che serve a chi chiuderà quella voce. `Riprova` dell'indicatore invece è già a 44px.
    - la voce della 2.2/3.2 su **`block_id` che manca dentro `answers`** dichiara che la finestra gratuita si chiude con questa story. Va annotata con l'esito della domanda 3.
    - la voce sulla **mancanza di un tetto di lunghezza** sui campi della persona si estende a `answers.content`, che è il campo più lungo del software e non ne ha uno.
  - [x] `docs/prd-v1.md` e `docs/database.md` **non si toccano**, salvo che la risposta alla domanda 2 porti una migrazione: FR19 e FR20 sono già scritti e questa story li implementa senza cambiare né lo schema né il modello.

- [x] **Task 7 — La verifica** (AC: 1, 2, 3, 4, 5, 6, 7)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. **Nessun `any`, nessun `as`** (kb-0.md §2, NFR12).
  - [x] `npm run build` passa.
  - [x] `npm test` passa e il totale **cresce**: **171 oggi**, più i casi di `save-store.test.ts` e i casi nuovi di `answer-control.test.ts`. Il numero esatto lo scrive il Dev Agent Record. **Se resta 171, il Task 2 non c'è.**
  - [x] Che `node --test` risolva (o non debba risolvere) l'`import type` con l'alias `@/` dentro `src/lib/save-store.ts`: è la sola incognita di piattaforma di questa story, e va **eseguita**, non dedotta. Se fallisce, il ripiego e il motivo si dichiarano.
  - [x] **La sonda senza sessione**: un `PATCH …/rest/v1/answers?id=eq.<uuid>` con la sola chiave pubblicabile e `{"content":"x"}` nel corpo **non tocca nessuna riga**, e un `GET` successivo con una sessione vera lo conferma. È la prova che `answers_owner_all` copre anche la scrittura, che finora nessuno ha esercitato: le sonde della 3.2 erano tutte in lettura.
  - [x] **La prova che la scrittura arriva, in una transazione che si annulla** (`begin; … rollback;` in una sola chiamata `execute_sql`, come le sonde della 2.5, della 3.1 e della 3.2): si apre una scheda con `open_assessment`, si scrive `content` su una risposta, si verifica che la riga porti il testo e che `answers.updated_at` si sia mosso mentre `assessments.updated_at` **no** — che è la voce nuova del Task 6, e va vista invece che affermata. Dopo il `rollback`, riconteggio identico alla partenza: **0 schede, 0 risposte, 3 clienti, 24 domande attive**.
  - [x] Il grep del perimetro: `.from('answers')` passa da **uno a due** (la lettura della pagina e l'update dell'azione); `.from('questions')` sotto `clienti/` resta **zero**; `'use server'` cresce di **uno**; nessun `required` e nessun `aria-required` (AC5 della 3.2 non decade); `warn-box` **zero** occorrenze sotto `schede/`; **zero esadecimali** nei file nuovi; `--sec-prequalifica` **zero** occorrenze fuori da `globals.css`.
  - [x] Tutti i file di codice toccati sotto le 200 righe. `globals.css` è il foglio unico del progetto ed era già oltre: si dichiara il conteggio prima e dopo.
  - [x] I file toccati sono quelli di «Cosa cambia questa story», più le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`). Ogni file fuori da quell'elenco si dichiara **uno per uno** nelle Completion Notes.

  Richiede una sessione, la fa Luca — è la condizione per `done`. **Da questa story in poi si può compilare una scheda vera**, ed è la prima volta: le righe che restano nel database sono quelle che chiudono la finestra gratuita di `block_id` (domanda 3).
  - [x] Apro una scheda, scrivo in un campo lungo, **smetto di digitare e conto tre secondi**: senza toccare niente, in fondo compare `Salvataggio…` e poi `Salvato alle hh:mm` (AC1, AC3, AC4).
  - [x] Ricarico la pagina: **quello che avevo scritto c'è.** È l'opposto esatto della verifica corrispondente della 3.2, ed è il motivo per cui questa story esiste.
  - [x] Scrivo in un campo e **clicco via entro tre secondi**: il salvataggio parte lo stesso all'uscita dal campo, e ricaricando il testo c'è (D21).
  - [x] L'indicatore è **in fondo, sempre visibile**: scorro la pagina dall'alto in basso e resta lì, in monospaziato, senza coprire l'ultima risposta (AC2).
  - [x] Scrivo in **tre campi di tre blocchi diversi** e li lascio: l'indicatore finisce su un solo `Salvato alle hh:mm`, con l'ora dell'ultimo, e non lampeggia fra uno stato e l'altro a ogni battuta.
  - [x] **Stacco la rete** (modalità offline degli strumenti di sviluppo), scrivo in un campo e aspetto: l'indicatore dice `Non salvato, riprovo` in rosso con `Riprova` accanto, **il testo resta nel campo**, e sotto quel campo — e solo quello — compare la riga che dice che non è stato salvato (AC5, NFR1). Riattacco la rete, premo `Riprova`: torna `Salvato alle hh:mm`, e ricaricando il testo c'è.
  - [x] Con un campo fallito e un altro salvato bene, l'indicatore dice **`Non salvato, riprovo`** e non `Salvato`. È la regola di priorità del Task 2 vista a schermo, ed è la cosa che questa story non può sbagliare.
  - [x] Il comando esplicito: scrivo in un campo e **premo `Salva` senza aspettare i tre secondi** — salva subito. A niente di modificato il pulsante è spento (AC6).
  - [x] Premo `Salva` con il **mouse** mentre il cursore è ancora dentro il campo: il fuoco resta nel campo e il salvataggio parte una volta sola.
  - [x] Cambio la risposta della domanda a **scelta singola** e la lascio: si salva come le altre. La rimetto su `Nessuna risposta`: si salva vuota.
  - [x] Scrivo in un campo, vado alla scheda cliente con il ritorno indietro, **torno dentro senza ricaricare**: il testo c'è. È la rivalidazione della rotta che si verifica, ed è la ragione per cui è stata messa.
  - [x] Nessuna spunta animata, nessun avviso a comparsa, nessuna animazione: l'indicatore cambia parole e basta (AC7).
  - [x] **Appena aperta la scheda, prima di scrivere niente**: la barra c'è, il pulsante è spento e l'indicatore è vuoto. Da guardare e da dire se basta (v. contratto visivo): se legge come un difetto, la decisione tocca `design-system.md` §5 e non questa story.
  - [x] Da tastiera: Tab attraversa i campi nell'ordine visivo, arriva a `Salva` e a `Riprova`, il fuoco si vede su tutti.
  - [x] Larghezza 375px: la barra resta ancorata, l'indicatore e il pulsante stanno sulla stessa riga o vanno a capo senza traboccare, nessuno scorrimento laterale, i bersagli restano da 44px.
  - [x] **Su un tablet vero, con la tastiera a schermo aperta**: tocco un campo a metà pagina, la tastiera sale, e guardo se la barra è ancora visibile mentre scrivo. `sticky; bottom: 0` si aggancia al viewport di *layout*, che la tastiera non restringe: se la riga finisce sotto la tastiera, l'elemento firma sparisce nell'unico momento in cui serve. Aggiunta dalla revisione: la prova a 375px è stata fatta in una riproduzione statica su desktop, dove il caso non si presenta. Se il difetto c'è, il rimedio è `viewport` con `interactive-widget: 'resizes-content'` in `layout.tsx`.
  - [x] **Tab fino all'ultima domanda**: passando da un campo all'altro con la tastiera, guardo se il campo che prende il fuoco resta sotto la barra. Non c'è nessuno `scroll-margin-bottom` nel foglio, quindi il browser porta il campo a filo del bordo inferiore, cioè dietro la riga ancorata. Se succede, il rimedio è uno `scroll-margin-bottom` sui campi — ma dopo averlo visto, non prima.
  - [x] Nessun errore in console e **nessun avviso di idratazione**: l'ora nasce nel browser, ed è la ragione per cui `formatClockTime` non dichiara un fuso.
  - [x] L'avviso «Qui ancora non si salva» **non c'è più** da nessuna parte.

### Review Findings

Revisione del 9 agosto 2026, skill `bmad-code-review`, tre strati in parallelo: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Tutti e sette gli AC risultano mantenuti e nessuna casella `[x]` del Task 7 è risultata falsa alla riesecuzione: `npm test` 189, typecheck e build verdi, i sei grep di perimetro e i nove conteggi di righe esatti, i dieci file ammessi e nessuno dei vietati aperto.

Le due voci `[Decision]` sono state risolte da Luca il 9 agosto 2026 e sono diventate patch. La prima è stata riformulata durante la decisione, perché la lettura che la sosteneva era sbagliata: togliere il filtro da `saveDirty` non avrebbe cambiato niente, dato che `save()` si difende già con la stessa condizione (`use-editable-field.ts:144-146`). Il difetto vero è il **conteggio**, non il filtro.

- [x] **[Review][Patch] `summary.dirty` conta anche i campi che in quel momento non sono salvabili, quindi `Salva` si accende su un lavoro che non può fare** [src/lib/save-store.ts:92] — Si scrive, passano tre secondi, il timer invia e `pending` diventa vero; si continua a scrivere mentre la richiesta è in volo. Da lì `onBlur` salta perché richiede `!pending` (`use-editable-field.ts:183`), `saveDirty` salta perché filtra `entry.dirty && !entry.pending` (`save-store.ts:127`), `retryFailed` guarda solo i `failed` (`:132`), e `save()` si rifiuta da sé (`use-editable-field.ts:145`). Restando in pagina si sana — `pending` cade e l'effetto riarma il timer — ma nella finestra il pulsante è **abilitato** e non fa niente né dice niente. **Deciso da Luca:** il conteggio diventa `dirty && !pending`, con un predicato solo dichiarato una volta e usato dal conteggio e da `saveDirty` — che è la ragione per cui la story voleva il filtro nel registro e non nella barra. Così il pulsante è spento mentre la barra dice `Salvataggio…`, che è la verità, e si riaccende appena la risposta arriva, quando premerlo scrive davvero senza aspettare i tre secondi. **Resta scoperta la perdita da navigazione** dentro la finestra: chiuderla vorrebbe dire aprire `use-editable-field.ts`, che è fuori perimetro e serve anche alla scheda cliente. Va a ledger.
- [x] **[Review][Patch] Due caselle nuove alla sessione: la barra appiccicata va misurata su un tablet vero** [src/app/globals.css:1075] — `position: sticky; bottom: 0` si aggancia al viewport di *layout*; su iPad e Android l'apertura della tastiera restringe quello *visuale* e lascia il primo dov'è, quindi la riga resta sotto la tastiera — l'elemento firma sparisce esattamente mentre si scrive, cioè nell'unico momento in cui serve. `src/app/layout.tsx` non esporta `viewport`, quindi vale il default di Next senza `interactive-widget`. Secondo caso, stessa causa: non esiste nessun `scroll-margin-bottom` né `scroll-padding-bottom` nel foglio, quindi passando da una domanda all'altra col Tab il browser porta il campo a filo del bordo inferiore, cioè sotto la barra. La verifica fatta è a 375px in una riproduzione statica su desktop, dove nessuno dei due si presenta. **Deciso da Luca:** prima la misura, poi la riga — è la regola del Task 4, `globals.css` si apre sul bisogno misurato e non sul giudizio. Il rimedio, se serve, è `viewport` con `interactive-widget: 'resizes-content'` in `layout.tsx` e uno `scroll-margin-bottom` sui campi.
- [x] **[Review][Patch] Il ledger dichiara una copertura più larga del vero, e la decisione sul `beforeunload` è stata presa su quella premessa** [docs/bmad/implementazione/deferred-work.md:18]
- [x] **[Review][Patch] I due commenti di `answer-blocks.tsx` che questa story ha reso falsi** [src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-blocks.tsx:12]
- [x] **[Review][Patch] `useEditableField` dice ancora che ogni scrittura riuscita rivalida «la scheda e l'elenco»** [src/lib/use-editable-field.ts:87]
- [x] **[Review][Patch] `ChoiceField` promette un ritorno indietro che dura fino alla rivalidazione** [src/app/(app)/clienti/[id]/schede/[assessmentId]/choice-field.tsx:24]
- [x] **[Review][Patch] `SaveBoundary` rassicura su un meccanismo che nel caso vero non scatta** [src/app/(app)/clienti/[id]/schede/[assessmentId]/save-boundary.tsx:18]
- [x] **[Review][Patch] «Due test in più rispetto all'elenco della story» sono tre** [docs/bmad/implementazione/3-3-non-pensare-mai-al-salvataggio.md:485]
- [x] **[Review][Defer] A sessione davvero finita il proxy reindirizza il POST dell'azione a `/accedi`, e la protezione «nessun `redirect`» di `saveAnswer` non arriva in tempo** [src/proxy.ts:41] — rimandato, preesistente
- [x] **[Review][Defer] Un campo bloccato su `saving` o su `failed` copre lo stato degli altri ventitré e nessuna via lo scioglie** [src/lib/save-store.ts:55] — rimandato, preesistente
- [x] **[Review][Defer] Una rivalidazione che cade sul ramo d'errore smonta `SaveBoundary` dal percorso di successo** [src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx:110] — rimandato, preesistente
- [x] **[Review][Defer] Un contenuto oltre il limite del corpo di una Server Action si diagnostica come «il server non ha risposto»** [src/app/(app)/clienti/answer-actions.ts:76] — rimandato, preesistente
- [x] **[Review][Defer] La zona `role="status"` aggrega ventiquattro campi e si annuncia due volte per pausa** [src/components/save-indicator.tsx:39] — rimandato, preesistente
- [x] **[Review][Defer] `Riprova` non trattiene il fuoco come `Salva`, e l'asimmetria non è dichiarata** [src/components/save-indicator.tsx:46] — rimandato, preesistente
- [x] **[Review][Defer] `saveDirty` fa partire tutte le scritture insieme: dieci fallimenti inseriscono dieci `role="alert"` sotto il cursore** [src/lib/save-store.ts:125] — rimandato, preesistente

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository (`e194e67`, albero pulito) e sul progetto Supabase il 9 agosto 2026.

**Lo stato del database:** 1 questionario attivo a `version` 1, **9 blocchi**, **24 domande tutte attive** con posizioni 1..24, **3 clienti**, **1 persona**, `assessments` e `answers` **vuote**. Quindici migrazioni a registro, tutte col prefisso. **171 test verdi.** I tipi di risposta vivi sono venti `testo_lungo`, tre `testo_breve`, una `scelta_singola` con quattro opzioni, **zero `numero`**; due domande hanno l'aiuto vuoto.

**La macchina del salvataggio è già scritta, provata e in uso da sei story.** Non si riscrive niente di questo:

- `src/lib/use-editable-field.ts` — valore, `dirty`, `pending`, i tre stati dell'indicatore, il timer a **3000ms**, il salvataggio all'uscita dal campo, il riallineamento sul valore ripulito dal server, la caduta di rete trasformata in `failed` invece che in un confine d'errore che porterebbe via tutta la schermata. Il commento in testa dice che esiste **proprio perché la schermata di compilazione lo riuserà**.
- `src/components/save-indicator.tsx` — i tre stati esatti di `design-system.md` §5, `role="status"`, nessuna spunta, nessun avviso a comparsa, la riga che c'è sempre anche vuota. Il suo commento dice che sta in `components/` **perché la schermata di compilazione lo riuserà ancorato in fondo: cambia dove sta e chi lo pilota, non com'è fatto.** Questa è quella schermata.
- `globals.css` — `.save-indicator`, `.save-indicator--saving`, `.save-indicator--failed`, `.save-indicator__retry` (già a 44px), `.field__error`, `.btn--primary`. **Manca solo `.save-bar`.**
- `src/lib/format-date.ts` — `formatClockTime`, con il motivo scritto per cui non dichiara un fuso: gira solo nel browser, e l'ora nasce lì per non far litigare l'idratazione.
- `src/lib/supabase/session.ts` — `openSession`, con la regola che le azioni della scheda non mandano mai a `/accedi`.
- Le forme delle azioni: `updateClientField` è il modello riga per riga — validazione dell'uuid, `typeof raw !== 'string'`, normalizzazione, `maybeSingle`, log dei soli `code` e `message`, ritorno di `saved`.

**Quello che manca, e sono le uniche cose nuove:** l'azione che scrive una risposta, il registro che fa di ventiquattro stati uno solo, e la riga ancorata che lo mostra.

**Il campo è già fatto per ricevere il salvataggio.** La 3.2 ha messo lo stato dentro `AnswerField` invece che nella pagina apposta, e ha dichiarato `ControlProps` come tipo con nome apposta, scrivendolo nel commento: «il giorno che la Story 3.3 gli aggiunge un `onBlur`… `ChoiceField` non può restare indietro in silenzio». Il preparativo va usato, non aggirato.

### Cosa cambia questa story, file per file

```
src/app/(app)/clienti/answer-actions.ts                            NUOVO — saveAnswer (~70)
src/lib/save-store.ts                                              NUOVO — aggregazione e registro (~80)
src/lib/save-store.test.ts                                         NUOVO — priorità, identità, filtri
src/lib/answer-control.ts                                          MODIFICA — i due casi degeneri
src/lib/answer-control.test.ts                                     MODIFICA — i loro casi
src/app/(app)/clienti/[id]/schede/[assessmentId]/save-boundary.tsx NUOVO — 'use client', contesto e confine (~55)
src/app/(app)/clienti/[id]/schede/[assessmentId]/save-bar.tsx      NUOVO — 'use client', indicatore e Salva (~40)
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx  MODIFICA — useEditableField, la riga d'errore
src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx          MODIFICA — via l'avviso, dentro il confine
src/app/globals.css                                                MODIFICA — .save-bar
docs/bmad/implementazione/deferred-work.md                         MODIFICA — una voce nuova, sei annotazioni
```

**Non si aprono:** `use-editable-field.ts`, `save-indicator.tsx`, `use-write.ts`, `client-field-form.tsx`, tutto `questionario/`, `assessment-actions.ts`, `actions.ts`, `people-actions.ts`, `person-edit-actions.ts`, `assessments-card.tsx`, `answer-blocks.tsx`, `choice-field.tsx`, `loading.tsx`, `answer-groups.ts`, `format-date.ts`, `last-activity.ts`, `types.ts`, `database.types.ts`, `nav.tsx`, `seed.sql`, le migrazioni 0001-0015. **Nessuna dipendenza nuova**: il registro sta in ottanta righe, e una libreria di stato per ventiquattro campi sulla stessa pagina sarebbe la dipendenza senza motivo che `AGENTS.md` vieta.

`choice-field.tsx` sta fra i file che non si aprono **di proposito**: se l'estensione di `ControlProps` lo facesse smettere di compilare, la correzione è nel tipo o in `answer-field.tsx`, non lì.

### Le quattro decisioni di questa story

**1. Un registro esterno, e non gli stati nel provider.** Ventiquattro campi devono confluire in una riga sola. La strada ovvia — un contesto con dentro un `useState` — rende di nuovo **tutti** i consumatori a ogni battuta, perché il valore del contesto cambia identità. Con un registro creato una volta e mai sostituito, il contesto è immobile: chi scrive rende sé stesso, la barra si iscrive a parte con `useSyncExternalStore` e si rende **solo quando la riga da mostrare cambia davvero**. Il prezzo è un modulo in più di ottanta righe; il guadagno è che la macchina che decide cosa mostrare è pura, sta fuori da React e ha i suoi test — ed è la macchina che, sbagliando, direbbe `Salvato` su un lavoro non salvato.

**2. Il comando esplicito è uno solo e sta nella barra.** FR19 chiede che esista, non che ce ne sia uno per campo. Ventiquattro coppie `Salva`/`Annulla` che compaiono e spariscono mentre si parla al telefono sono il contrario di quello che questa story si chiama; e UX-DR10 vuole **una** azione primaria per schermata, che con ventiquattro pulsanti neri non sarebbe vera nemmeno per sbaglio. La scheda cliente resta com'è: là i campi corti si confermano e i lunghi si salvano da soli (D21), qui sono tutti campi di risposta e la regola è una sola.

**3. Si rivalida la rotta di compilazione e nient'altro, e la ragione va letta due volte.** Rivalidare la rotta corrente serve: si esce alla scheda cliente e si rientra senza ricaricare, e senza rivalidazione la cache del router potrebbe restituire il testo di prima — che è indistinguibile da un lavoro perso. Rivalidare `/clienti` invece **non** serve, e qui la scoperta: scrivere una risposta muove `answers.updated_at` e **non** `assessments.updated_at`, che è la chiave con cui l'elenco ordina (`database.md` §5). La voce a ledger della 1.6 dice che ogni scrittura che tocca una scheda deve rivalidare l'elenco «la 3.3 compresa» — applicata alla lettera sarebbe un gesto a vuoto che *sembra* una correzione, ed è il modo in cui un difetto si chiude sulla carta e resta aperto nel software. Va scritto come voce nuova, non nascosto dentro una `revalidatePath` (v. domanda 2).

**4. Il campo dice quale, la barra dice che.** L'indicatore unico è quello che UX-DR8 chiede, e ha un limite che con un campo solo non aveva: `Non salvato, riprovo` non dice **quale** delle ventiquattro. La riga d'errore sotto il campo — la stessa `.field__error` della scheda cliente — è la metà mancante. Senza, AC5 è soddisfatta alla lettera e non nella sostanza: si sa che c'è un guasto e non dove sia il testo a rischio.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `run` non avvolto in `useCallback` | `write` cambia a ogni resa, l'effetto riarma il timer, il salvataggio automatico non parte mai: **AC1 cade in silenzio** | `useCallback((next) => …, [answerId])`, come `ClientFieldForm` |
| `createSaveStore()` chiamato nel corpo del componente | Un registro nuovo per resa: tutte le iscrizioni si perdono e la barra resta ferma su `idle` | `useState(() => createSaveStore())` |
| `getSummary` che costruisce un oggetto nuovo ogni volta | `useSyncExternalStore` entra in ciclo infinito | Il riassunto si ricalcola in `set` e si tiene in cache se è uguale |
| `getServerSnapshot` mancante | La barra solleva durante la resa sul server | `EMPTY_SUMMARY` congelata, esportata dal registro |
| `store.remove` dentro l'effetto che fa `set` | Toglie e rimette a ogni battuta: due rese della barra per tasto premuto | Due effetti: il cleanup solo allo smontaggio |
| Aggregare mettendo `saved` davanti a `failed` | `Salvato alle 14:32` mentre una risposta non è stata scritta: la bugia peggiore che questo prodotto possa dire | `failed` vince su tutto, e c'è il test che lo dice |
| Prendere l'ora del **primo** `saved` invece dell'ultimo | L'indicatore mostra un'ora vecchia mentre si continua a salvare | `at` massimo, col suo test |
| Mettere un `<form>` intorno ai campi | Invio va a capo in un campo lungo, ma su un campo corto invia e **ricarica la pagina** | Nessun `<form>`, e il motivo scritto |
| Il pulsante `Salva` senza `onMouseDown` che trattiene il fuoco | Il clic fa uscire dal campo, l'uscita salva, il clic salva di nuovo | `event.preventDefault()` su `onMouseDown`, la ricetta di `keepFocus` |
| Costruire una difesa contro il doppio salvataggio | Macchina in più per un danno che non c'è | Due `update` con lo stesso valore sono innocue: si dichiara |
| `revalidatePath` con un percorso preso dal `formData` | Il browser sceglie quale pagina rivalidare: è la voce a ledger del `PERSON_GONE` | I due identificativi si ricavano dalla riga scritta, con l'innesto |
| Rivalidare `/clienti` «perché lo dice la regola» | Costo a ogni salvataggio, effetto zero, e un difetto che sembra chiuso | Solo la rotta di compilazione, e la voce nuova a ledger |
| Loggare `details` dell'errore di scrittura | Contiene **il contenuto della risposta**, cioè quello che un cliente ha detto in una call | Solo `code` e `message` (kb-0.md §3) |
| Scrivere `''` invece di `null` su una risposta svuotata | Il numeratore dell'avanzamento (4.1) conta come risposta un campo vuoto | `normalizeTextValue`, che è già la stessa definizione di vuoto |
| Riscrivere la normalizzazione invece di importarla | Due definizioni di «vuoto» sui due lati dello stesso conteggio | Si importa da `client-fields.ts`, e si dichiara |
| Estendere `ControlProps` e dimenticare `ChoiceField` | Il salvataggio sparisce da **una** domanda su ventiquattro | Il tipo è uno solo: se `ChoiceField` resta indietro, non compila |
| `position: fixed` per la barra | Copre l'ultima risposta, e nessuno se ne accorge finché non serve rispondere all'ultima domanda | `sticky`, che occupa il proprio spazio nel flusso |
| Barra con fondo trasparente | Il testo scorre sotto e si legge attraverso la riga | `background: var(--bg)` |
| Rendere la barra anche negli stati d'errore e vuoto | Un indicatore fermo su una schermata senza campi | Solo nello stato pieno |
| Lasciare la `.warn-box` della 3.2 | La schermata dichiara di non salvare mentre salva | Sparisce con il suo commento |
| Montare `useWrite` invece di `useEditableField` | È per i controlli che non sono campi di testo, e non ha timer né indicatore | `useEditableField`, che esiste per questo |

### Contratto visivo

- **La riga ancorata è l'elemento firma del prodotto** (`design-system.md` §1 e §5): l'unica cosa dell'interfaccia che ha il permesso di essere sempre visibile e mai silenziosa, perché incarna l'unica promessa non negoziabile. Monospaziato, `--t-data`, tre stati e non uno di più. **Il tono è quello di un orologio: sta lì, lo si guarda quando serve.**
- **I tre colori sono già decisi**: `--ink-faint` a riposo, `--ink-muted` in corso, `--bad` nel fallimento. Non si aggiungono stati, non si aggiungono icone, non si aggiungono spunte.
- **Prima del primo salvataggio la riga è vuota, e resta vuota di proposito.** `SaveIndicator` non dice niente quando non c'è ancora un'ora da dire, e la riga tiene comunque il suo spazio così che il campo sotto non salti quando l'indicatore compare. AC2 chiede che l'indicatore sia ancorato e sempre visibile, e lo è: quello che manca all'inizio è il testo, non la riga. **Va guardato a schermo prima di dire che basta** — se una barra con dentro solo un pulsante e uno spazio bianco legge come un difetto invece che come un orologio fermo, è una decisione da prendere lì, non adesso, e la strada sarebbe una quarta parola per lo stato a riposo, cioè un cambiamento a `design-system.md` §5 e non a questa schermata.
- **Il pulsante è primario e nero** (`--ink`), ed è l'unico della schermata nello stato pieno: il colore resta libero di significare la sezione o l'esito (UX-DR10).
- **Nessun colore dentro il contenuto** oltre all'alone del fuoco, che `design-system.md` §5 assegna esplicitamente al campo di risposta e che su questa schermata è l'unico posto del progetto dove la tinta è quella giusta. Niente verde, ambra o rosso fuori dalla riga d'errore e dall'indicatore fallito, perché quei tre significano un esito e qui non c'è nessun esito (UX-DR2).
- **Le parole nuove a schermo sono tre**: `Salva`, la riga d'errore del campo, e il messaggio `Questa risposta non è più disponibile. Ricarica la pagina.` Tutto il resto lo dice già `SaveIndicator`. Italiano, frase minuscola, nessun punto esclamativo, nessuna scusa: l'errore dice cosa fare (kb-0.md §6).
- **Niente animazioni, niente comparse, niente transizioni.** La schermata sta ferma mentre si parla al telefono, e la barra pure.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione**, salvo diversa risposta alla domanda 2. Lo schema regge com'è: `answers.content` esiste dalla 0005 e la policy dalla 0007.
- **Nessun verdetto, motivo, condizione, data di verifica, prossimo passo**: Story 3.5.
- **Nessuno stato di compilazione, nessun `Chiudi la scheda`**: Story 3.6.
- **Nessun contatore, nessuna barra di avanzamento**, né qui né nella card del cliente: Story 4.1.
- **Nessuna colonna esito nell'elenco, nessuna pillola di verdetto**: Story 4.2.
- **Nessuna esportazione**: Story 4.3.
- **Nessuna ripresa esplicita né conferma di ripristino**: Story 3.4. Che il campo si renda col suo `content` è lettura, e c'è già dalla 3.2.
- **Nessun `beforeunload`** (v. domanda 4), nessun avviso prima di lasciare la pagina.
- **Nessun test sui componenti e nessun client Supabase finto**: la resa si prova a schermo, le letture e le scritture con le sonde in transazione annullata. Un test con un client finto verificherebbe il finto.
- **Nessun `metadata` sulle rotte**: è la voce a ledger della 1.1.
- **Nessuna correzione ai quirk del fuoco** (ledger, Story 5.2), nessun ritocco a `.btn` per i 44px: se ne emerge uno nuovo si annota.
- **Nessuna ripulitura dei dati di prova**: il blocco `prova` e la sua domanda restano finché Luca non decide.
- **Nessun tetto di lunghezza inventato** su `content`.

### Test

Cosa entra: `aggregateSaveState` e `createSaveStore`, e i due casi degeneri di `answerControl`/`orphanOption`. È logica che, rompendosi, **non dà nessun errore**: l'indicatore dice la cosa sbagliata, o un selettore mostra una riga vuota che non si distingue da «Nessuna risposta». `kb-0.md` §7 assegna i test automatici esattamente a questo, e non alla presentazione.

Il caso più importante di tutti è **`failed` che vince su `saved`**: è una riga di codice e una riga di test, e senza il test si riordina la scala dei confronti senza che niente diventi rosso.

Cosa **non** entra: nessun test su `useEditableField`, che è codice del browser ed è in uso da sei story; nessun test sull'azione, che si prova con la sonda in transazione annullata; nessun test sulla barra, che si guarda.

`migrations.test.ts` non si tocca e non cresce, perché questa story non porta migrazioni.

### Project Structure Notes

```
src/lib/
├── save-store.ts                       NUOVO — aggregazione e registro, senza React
├── save-store.test.ts                  NUOVO
├── answer-control.ts                   MODIFICA — opzioni bianche, confronto ripulito
└── answer-control.test.ts              MODIFICA

src/app/(app)/clienti/
├── answer-actions.ts                   NUOVO — 'use server', una azione
└── [id]/schede/[assessmentId]/
    ├── page.tsx                        MODIFICA — via l'avviso, dentro il confine
    ├── save-boundary.tsx               NUOVO — 'use client', contesto e confine
    ├── save-bar.tsx                    NUOVO — 'use client', indicatore e Salva
    ├── answer-field.tsx                MODIFICA — useEditableField
    ├── answer-blocks.tsx               INVARIATO
    ├── choice-field.tsx                INVARIATO
    └── loading.tsx                     INVARIATO

src/app/globals.css                     MODIFICA — .save-bar
src/components/save-indicator.tsx       INVARIATO — si monta, non si tocca
src/lib/use-editable-field.ts           INVARIATO — si usa, non si tocca
```

Convenzioni vincolanti (kb-0.md §2): `kebab-case` per i file, `PascalCase` per i componenti, nomi in inglese nel codice e in italiano a schermo, **un componente per file** — `save-boundary.tsx` esporta anche `useAnswerSave`, che è un hook e non un componente, ed è il modo normale di pubblicare un contesto insieme al suo provider — nessun file sopra le 200 righe. L'unica eccezione dichiarata resta `edit-question-form.tsx` a 228, e questa story non la apre.

Le azioni stanno a livello di `clienti/` e non dentro la cartella della rotta: è dove stanno `actions.ts`, `people-actions.ts`, `person-edit-actions.ts` e `assessment-actions.ts`.

### Piattaforma in uso, verificata

Ricontata il 9 agosto 2026 su `e194e67`: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), `eu-west-1`, PostgreSQL 17.6, quindici migrazioni registrate col prefisso.

`useSyncExternalStore` è di React da sempre in questa versione, non è una dipendenza e non è sperimentale.

Tre cose da verificare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `node --test` non inciampi sull'`import type` con alias `@/`** dentro `src/lib/save-store.ts`. Un `import type` viene cancellato prima dell'esecuzione, quindi l'alias non dovrebbe mai essere risolto — ma nessun modulo di `src/lib` oggi sotto test usa l'alias, quindi il caso non è mai stato provato in questo progetto e non si dichiara sulla fiducia (kb-0.md §1).
- **Che l'innesto `assessments(client_id)` dentro la `select` di ritorno di un `update` risolva**, e con quale forma. PostgREST accetta le risorse innestate anche nel `returning`, ma la forma va vista rispondere: se il tipo generato la desse come elenco, si legge secondo il tipo che arriva e non si forza con un `as`. È la lezione della sonda `never` della 3.2.
- **Che la cache del router restituisca la pagina rivalidata** uscendo e rientrando senza ricaricare. È la ragione per cui `revalidatePath` sulla rotta corrente c'è: se si dimostrasse superflua, il fatto si scrive e la chiamata si toglie, ma **non prima**.

### Intelligence dai commit e dalla story precedente

Da `e194e67` (3.2), dalla sua revisione e dalla sua verifica di sessione, le abitudini che questa story eredita:

- **La verifica è divisa in due**: parte agente (typecheck, build, test, sonde SQL in transazione annullata, sonda senza sessione, grep di perimetro) e sessione di Luca, che è la condizione per `done`.
- **Le caselle non si spuntano se non sono vere.** La revisione della 3.1 ha trovato una casella di perimetro spuntata che affermava il falso, e la revisione della 3.2 ha trovato uno scostamento non dichiarato mentre le note dicevano «entrambi dichiarati». Qui la casella dei file fuori elenco chiede di dichiararli **uno per uno**.
- **Gli scostamenti si dichiarano tutti, anche quelli difendibili.** Uno scostamento raccontato a metà è costato un patch alla 3.2.
- **`globals.css` si apre sul bisogno misurato a schermo, non sul giudizio.** La 3.2 ha stabilito il precedente con `.page-header__lead`, nata dopo aver visto il difetto.
- **Un ripiego che il codice non raggiunge si toglie invece di lasciarlo.** La 3.2 ha provato la forma dell'innesto con una sonda `never` prima di togliere un `?.` scritto per abitudine.
- **Se una prova cambia lo stato del database, si dichiara cosa resta.** La verifica della 3.2 ha aggiunto e poi tolto una domanda di tipo `numero`, e l'ha scritto perché chi ricontasse non deducesse che la casella era falsa. Questa story lascerà dietro di sé **le prime risposte scritte davvero**: vanno contate e dichiarate, perché chiudono una finestra (domanda 3).
- **Le domande si chiudono prima di implementare**, e il default è già dentro i task: se Luca conferma, non cambia niente.
- Messaggi di commit in italiano, imperativo, corpo che spiega il perché. Un compito, un commit (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 3.3: Non pensare mai al salvataggio]
- FR19, FR20, NFR1, NFR9, NFR10, NFR16, UX-DR8, UX-DR10: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- L'indicatore di salvataggio con i suoi tre stati esatti: [Source: docs/design-system.md#5. Componenti]
- Quando un campo si salva da solo e quando si conferma, e perché l'indicatore è la seconda metà della regola: [Source: docs/00-contesto-e-decisioni.md#D21]
- La macchina che si riusa, con il commento che dice che esiste per questa schermata: [Source: src/lib/use-editable-field.ts] e [Source: src/components/save-indicator.tsx]
- Il modello dell'azione, riga per riga: [Source: src/app/(app)/clienti/actions.ts] (`updateClientField`)
- La sessione che non manda mai a `/accedi`: [Source: src/lib/supabase/session.ts]
- La normalizzazione del testo e la definizione di «vuoto»: [Source: src/lib/client-fields.ts] (`normalizeTextValue`)
- Il campo preparato per ricevere il salvataggio, e il tipo che impedisce a `ChoiceField` di restare indietro: [Source: src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx]
- L'avviso da togliere, con la sua data di scadenza scritta dentro: [Source: src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx]
- La definizione di ultima attività e la colonna su cui l'elenco ordina: [Source: docs/database.md#5. Ultima attività del cliente] e [Source: src/lib/last-activity.ts]
- I trigger `updated_at`, e quello che non c'è: [Source: supabase/migrations/0006_triggers.sql]
- La policy di scrittura su `answers`: [Source: supabase/migrations/0007_rls.sql]
- Il conteggio dell'avanzamento, che definisce «risposta vuota»: [Source: docs/database.md#3. Tabelle]
- I due casi degeneri assegnati a questa story: [Source: docs/bmad/implementazione/deferred-work.md]
- Story precedente, con le sue lezioni e il suo ledger: [Source: docs/bmad/implementazione/3-2-compilare-le-risposte-durante-la-call.md]

### Domande per Luca — chiuse il 9 agosto 2026

Quattro, tutte con un default già applicato nei task. **Luca ha confermato tutti e quattro i default il 9 agosto 2026, prima di implementare: i task non cambiano.** Restano scritte con le loro alternative, perché il motivo per cui una strada è stata scartata è la parte che serve fra sei mesi.

1. **Il comando esplicito: uno solo nella barra ancorata, o uno per campo?** — *risolta: uno solo nella barra.*
   FR19 chiede che un comando esplicito esista, non dove stia. Sulla scheda cliente ogni campo ha il suo `Salva`, e la coerenza suggerirebbe di rifarlo qui.
   **Default: uno solo**, accanto all'indicatore, che salva tutto quello che è cambiato. Ventiquattro coppie di pulsanti che compaiono e spariscono durante una call sono il contrario di «non pensare mai al salvataggio», e UX-DR10 vuole una sola azione primaria per schermata.
   Se la risposta è **uno per campo**, ogni `AnswerField` prende `Salva` e `Annulla` come `ClientFieldForm`, servono il `keepFocus` e il controllo su `relatedTarget` — quindi torna anche il `<form>` per campo, con l'invio implicito da gestire — e la barra resta col solo indicatore. È più lavoro e più rumore a schermo, ma è la forma che il resto del software ha già.

2. **Salvare una risposta non muove `assessments.updated_at`: si fa la migrazione 0016 col trigger, o si rimanda?** — *risolta: si rimanda.*
   Scoperto scrivendo questa story. `answers_set_updated_at` tocca la risposta; niente risale alla scheda. L'elenco ordina per `assessments.updated_at` (`database.md` §5), quindi si compila una scheda per un'ora, si torna all'elenco e **il cliente è dov'era** — che è testualmente il difetto che la voce a ledger della 1.6 diceva chiuso. FR11 dice «la più recente fra la modifica del cliente e la modifica delle sue schede».
   **Default: si rimanda**, con una voce nuova a ledger e il punto di ripresa alla Story 4.1, che è la prima a mostrare qualcosa che cambia davvero quando si salva. `saveAnswer` rivalida solo la rotta di compilazione, e **non** finge di correggere l'elenco. Il motivo del rimando è `AGENTS.md`: nessuna AC di questa story parla di ultima attività, e una migrazione non richiesta dentro la story del salvataggio è deriva del piano.
   Se la risposta è **la migrazione**, arriva una 0016 con un trigger `after insert or update on answers` che scrive `updated_at` sulla scheda, `security invoker` e `set search_path = ''` come la 0006, con la dichiarazione D24 in testa nelle tre chiavi esatte e senza `cascade`; `saveAnswer` rivalida anche `/clienti` e `/clienti/[id]`; il Task 7 guadagna la sonda che lo verifica e `npm test` cresce di quattro dai controlli su `migrations.test.ts`. Costa un file e mezza giornata di verifica in più, e chiude FR11 oggi invece che con l'Epic 4.

3. **`block_id` dentro `answers`: la finestra gratuita si chiude con questa story.** — *risolta: si conferma il rimando.*
   Il 9 agosto hai rimandato `block_id` con il motivo che `kb-0.md` §4 vieta i campi «utili un giorno». La voce a ledger dichiara però che il costo scade **qui**: `answers` è ancora vuota, quindi oggi la colonna si aggiungerebbe `not null` senza riempimento, come la 0015; dalla prima scheda vera che resta — cioè da questa story — servirebbe una colonna nullabile e un riempimento da `answers.question_id → questions.block_id`, che copre solo le domande non ancora cancellate.
   **Default: si conferma il rimando**, e la voce si annota con la finestra chiusa e il costo nuovo. Il danno resta cosmetico e richiede due blocchi vicini con lo stesso titolo.
   Se la risposta è **si prende adesso**, la colonna entra nella 0016 — che esiste solo se la risposta alla domanda 2 è «la migrazione», altrimenti va aperta apposta — insieme al riempimento dentro `open_assessment` e al raggruppamento per identità invece che per titolo in `answer-groups.ts`, coi suoi test. È mezza giornata, e questa è l'ultima in cui costa così poco.

4. **Un `beforeunload` per i tre secondi con il fuoco ancora dentro?** — *risolta: no.*
   È la voce a ledger della revisione 1.2, il cui punto di ripresa è «se la Story 3.3 rende la finestra più frequente». La rende: ventiquattro campi su una schermata dove si sta un'ora. Chiudere la finestra del browser fra l'ultima battuta e i tre secondi perde quella frase.
   **Default: no.** Il salvataggio all'uscita dal campo copre già ogni navigazione dentro l'applicazione e ogni clic altrove; resta scoperta solo la chiusura della finestra col cursore ancora dentro il campo. E un `beforeunload` è, letteralmente, una finestrella del browser che compare: `design-system.md` §5 dice «nessun avviso a comparsa», e `kb-0.md` §6 vuole una conferma solo per le azioni distruttive.
   Se la risposta è **sì**, sono poche righe dentro `save-boundary.tsx` — un `beforeunload` armato quando il registro ha almeno un campo sporco e disarmato quando non ne ha — più una casella di verifica, e la voce a ledger si chiude invece di essere annotata.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), skill `bmad-dev-story`, 9 agosto 2026.

### Debug Log References

**Le tre incognite di piattaforma, tutte eseguite e nessuna dedotta.**

1. **`node --test` digerisce l'`import type` con l'alias `@/`.** `src/lib/save-store.ts` importa `import type { SaveState } from '@/components/save-indicator'` e i suoi quattordici test passano: l'import di tipo viene cancellato prima dell'esecuzione, quindi l'alias non arriva mai al risolutore. Nessun ripiego servito. Nel **file di test**, che importa anche lui `SaveState`, la forma è invece relativa con estensione (`'../components/save-indicator.tsx'`), coerente con la regola scritta su `client-tags.ts:1`.

2. **L'innesto `assessments(client_id)` dentro la `select` di ritorno di un `update` risolve, come oggetto non nullabile.** `data.assessments.client_id` compila senza `?.` e senza `as`: `npm run typecheck` verde. È la stessa forma già verificata dalla 3.2 per `clients(name)`, e vale anche nel `returning` di una scrittura.

3. **La cache del router** — se `revalidatePath` sulla rotta corrente sia necessaria uscendo e rientrando senza ricaricare — **non è verificabile senza sessione** ed è una delle caselle della sessione di Luca. La chiamata resta, come la story prescrive («se si dimostrasse superflua, il fatto si scrive e la chiamata si toglie, ma non prima»).

**Le sonde sul database** (progetto `izkycpwxuedpkzgpvcxc`, tutte con `set local role authenticated` e `request.jwt.claims` del proprietario, così che le policy filtrino davvero):

- **La scrittura arriva.** `open_assessment` in transazione, poi `update answers set content = …`: la riga porta il testo, 24 risposte, `total_questions` 24. `rollback`.
- **`assessments.updated_at` non si muove, e il metodo è diverso da quello che il Task 7 chiedeva.** Il confronto sui due `updated_at` **non discrimina**: `now()` è fermo per tutta la transazione, quindi l'inserimento e la scrittura successiva portano lo stesso valore, e un `updated_at` messo a mano viene riscritto da `assessments_set_updated_at`, che è un `before update` sulla riga che si sta toccando. Sostituito con il confronto dei **`ctid`**, che è la posizione fisica della tupla e cambia se e solo se quella riga viene riscritta: dopo l'`update` sulla risposta, il `ctid` della **risposta** cambia e quello della **scheda** no. In più, prova strutturale: su `answers` esiste **un trigger solo**, `answers_set_updated_at`, e non tocca `assessments`. Che quel trigger scatti su un update è stato visto a parte, scrivendo `updated_at` a mano e ritrovandolo riportato a `now()`.
- **La sonda senza sessione.** `PATCH /rest/v1/answers?id=eq.<uuid>` con la sola chiave pubblicabile e `Prefer: return=representation` risponde `[]` (HTTP 200, **zero righe toccate**), il `GET` con la stessa chiave risponde `[]`, e la lettura con una sessione vera conferma `content is null`. `answers_owner_all` copre anche la scrittura, che finora nessuno aveva esercitato.
- **Riconteggio finale identico alla partenza:** 3 clienti, 1 persona, **0 schede, 0 risposte**, 9 blocchi, 24 domande attive.

**La verifica a schermo, con la riproduzione statica** (tecnica della Story 2.3: `globals.css` copiato nello scratchpad, markup esatto, server locale). Misurato invece che giudicato:

- `position: sticky; bottom: 0` **tiene**: a metà scorrimento `barra.bottom === window.innerHeight`, sia a 1280×800 sia a 375×812.
- **La barra è larga quanto la colonna del contenuto e non quanto la finestra**, come la story prevedeva — e il rimedio col margine negativo **non serve**: larghezza e bordo sinistro della barra coincidono con quelli della card (953 e 272 a 1280, 343 e 16 a 375). Nessuno scorrimento laterale a nessuna delle due larghezze. `globals.css` non è stato aperto oltre la regola dichiarata.
- **I tre stati portano i tre colori giusti**, letti da `getComputedStyle`: a riposo e salvato `rgb(139,131,121)` = `--ink-faint`, in corso `rgb(88,82,75)` = `--ink-muted`, fallito `rgb(206,70,50)` = `--bad`. Fondo della barra `rgb(245,242,236)` = `--bg`, bordo `rgb(225,218,206)` = `--line`.
- **Bersagli:** indicatore 44px, `Riprova` 44px, `Salva` **40px** — la voce a ledger di `.btn`, annotata.
- A 375px indicatore e pulsante restano **sulla stessa riga in tutti e quattro gli stati**, e `Salva` non esce dalla barra.
- **Lo screenshot del pane rende a metà a 1280** (il pane risultava nascosto): a quella larghezza la verifica è quella misurata qui sopra, non visiva. A 375px lo screenshot rende correttamente e mostra la barra ancorata con `Non salvato, riprovo`, `Riprova` e `Salva`.
- I caratteri divergono dalla resa vera (Geist arriva da `next/font` e nella riproduzione non c'è): è il limite noto della tecnica, e non tocca spaziatura né colori.

### Completion Notes List

**Cosa è stato costruito.** Tre cose nuove e nient'altro: l'azione che scrive una risposta, il registro che fa di ventiquattro stati uno solo, e la riga ancorata che lo mostra. `useEditableField`, `SaveIndicator` e `use-write.ts` non sono stati aperti: si montano e si usano.

**`npm test` passa da 171 a 189.** +14 da `save-store.test.ts`, +4 da `answer-control.test.ts`. `npm run typecheck` e `npm run build` verdi. Nessun `any` e nessun `as` nei file toccati (grep = 0).

**Grep del perimetro, tutti come la story li voleva:** `.from('answers')` **2** (la lettura della pagina e l'update dell'azione), `.from('questions')` sotto `clienti/` **0**, `'use server'` da 9 a **10**, `warn-box` sotto `schede/` **0**, esadecimali nei file nuovi **0**, `--sec-prequalifica` fuori da `globals.css` **0**. L'unica occorrenza di `required` sotto `schede/` è la parola dentro un commento («Nessun `required`…»), non un attributo.

**Righe:** tutti i file di codice sotto le 200 — `answer-actions.ts` 106, `save-store.ts` 148, `save-store.test.ts` 179, `answer-control.ts` 67, `answer-control.test.ts` 84, `save-boundary.tsx` 50, `save-bar.tsx` 49, `answer-field.tsx` 158, `page.tsx` 187. `globals.css` **da 1155 a 1174** (+19, la sola regola `.save-bar`), ed era già oltre il limite come foglio unico del progetto.

**Nessun file fuori dall'elenco di «Cosa cambia questa story».** Le sole aggiunte sono le scritture di metodo previste: `sprint-status.yaml`, questo file, `deferred-work.md`.

**Gli scostamenti, tutti, anche quelli difendibili.**

1. **`ControlProps` è derivato invece che riscritto**: `EditableFieldState['control'] & { id, aria-describedby, aria-invalid }`. La story chiedeva di «estendere il tipo» aggiungendo `onFocus` e `onBlur` a mano; derivarlo raggiunge lo stesso scopo — `ChoiceField` non compila se resta indietro — ed è più forte, perché non può restare indietro **mai più**: se un giorno l'hook aggiunge un terzo gestore, `shared` smette di compilare da solo. `use-editable-field.ts` **non è stato aperto**: se ne importa solo un tipo già esportato. Verificato che `ChoiceField` compila senza toccarlo.

2. **`aggregateSaveState` riceve gli stati e non le voci del registro** (`Iterable<SaveState>`). La story scriveva `aggregateSaveState(fields)` senza dire di che cosa fossero fatti gli elementi: l'aggregazione dipende solo dagli stati, quindi la firma onesta è quella, e il test non deve fabbricare `save`, `dirty` e `pending` per provare una priorità che non li guarda. Il conteggio dei `dirty` resta nel registro, che scorre le voci una volta sola.

3. **`orphanOption`: il `trim` giudica il vuoto, non l'appartenenza.** La story diceva «confronta sul testo ripulito». Confrontare **anche** l'appartenenza sul ripulito avrebbe fatto rendere in coda una versione ripulita del contenuto memorizzato, che è un'altra risposta: sceglierla cambierebbe il valore. Così invece soli spazi non producono più nessuna opzione (che è il difetto descritto, la riga vuota indistinguibile da `Nessuna risposta`), e tutto il resto continua a portare il testo com'è. Un test lo fissa (`' forse '` esce `' forse '`).

4. **La variabile del controllo si chiama `shape` e non `control`** dentro `answer-field.tsx`: `control` è ora il nome dei gestori che arrivano dall'hook, e tenere le due parole allineate con `ControlProps` vale più della continuità col nome che aveva nella 3.2.

5. **`isUuid` invece di `UUID.test`**: stessa funzione, stesso modulo `@/lib/uuid`, ed è la forma già usata da `assessment-actions.ts`, che è l'azione sorella.

6. **Tre test in più rispetto all'elenco della story** — la prima stesura di questa nota ne dichiarava due e la revisione ha trovato il terzo, che è esattamente la classe di affermazione che le due revisioni precedenti avevano già colto: che chi si disiscrive smetta di ricevere avvisi (è il contratto di `subscribe`, e senza nessuno lo prova); che due `saved` a **ore diverse** siano due riassunti diversi — la metà mancante del confronto in cache, perché senza di essa `sameSummary` potrebbe congelare l'ora e la barra mostrerebbe per sempre il primo salvataggio; e che il registro **parta** dal riassunto vuoto, cioè che `getSummary` risponda `EMPTY_SUMMARY` per identità prima di qualsiasi scrittura, che è quello su cui si appoggia `getServerSnapshot`.

7. **La sonda sul `ctid` invece che sugli `updated_at`**, con il motivo per esteso nel Debug Log: dentro una transazione `now()` è fermo, quindi il confronto che il Task 7 chiedeva non poteva discriminare. La sostituzione prova **di più**, non di meno.

8. **Una scheda è stata creata e tolta fuori transazione**, perché la sonda senza sessione ha bisogno di una riga vera su cui fallire: aperta con `open_assessment` (24 risposte, tutte con `content` a `null`), sondata, e cancellata subito dopo. Il riconteggio finale è identico alla partenza — **0 schede, 0 risposte** — quindi **la finestra gratuita di `block_id` non si è chiusa con questa story**: si chiuderà con la prima scheda che Luca compila e tiene. Il ledger lo dice esplicitamente, perché chi ricontasse non deduca il contrario dalla data.

**Il perimetro dichiarato è rispettato:** nessuna migrazione, nessun verdetto, nessuno stato di compilazione, nessun contatore, nessuna esportazione, nessun `beforeunload`, nessun tetto di lunghezza inventato su `content`, nessuna dipendenza nuova.

**Quello che resta a Luca**, ed è la condizione per `done`: le diciassette caselle della sessione. Due meritano attenzione particolare — **la riga vuota della barra prima del primo salvataggio** (la story chiede di guardarla e dire se basta: se legge come un difetto invece che come un orologio fermo, la decisione tocca `design-system.md` §5 e non questa schermata), e **la prova con la rete staccata**, che è l'unica in cui AC5 si vede per intero, con l'indicatore in rosso *e* la riga sotto il campo che dice quale.

### Verifica di sessione

Fatta da Luca il 9 agosto 2026, dopo la revisione. **Diciannove caselle su diciannove**, comprese le due che la revisione aveva aggiunto sul tablet. Con questa la story è `done`.

Le tre che chiedevano un giudizio e non un pass/fail, perché sono quelle che avrebbero aperto altro lavoro:

- **La riga vuota della barra prima del primo salvataggio va bene com'è.** Legge come un orologio che non ha ancora niente da dire, non come un difetto. La strada alternativa — una quarta parola per lo stato a riposo — avrebbe toccato `design-system.md` §5 e non questa schermata, e resta non presa. La casella si chiude qui e non lascia niente dietro.
- **Le due prove sul tablet sono passate entrambe.** Con la tastiera a schermo aperta la barra resta visibile, quindi `sticky; bottom: 0` regge anche dove il viewport visuale si restringe; e passando da una domanda all'altra col Tab nessun campo finisce dietro la barra. Nessuna riga di `globals.css` da aggiungere: né il `viewport` con `interactive-widget`, né lo `scroll-margin-bottom`. È la regola del Task 4 applicata fino in fondo — si è misurato, e la misura ha detto che non serviva.
- **Non resta nessuna scheda nel database, e la conseguenza va detta.** Riconteggio dopo la sessione: 3 clienti, 1 persona, **0 schede, 0 risposte**, 9 blocchi, 24 domande attive — identico alla partenza. La story prevedeva che questa sessione lasciasse dietro di sé le prime risposte scritte davvero e che quelle chiudessero la finestra gratuita di `block_id` (domanda 3): **non è successo**, quindi la finestra è ancora aperta e la voce a ledger resta valida com'è. Sta scritto perché chi ricontasse fra un mese non deduca il contrario dalla data della story, e perché una tabella vuota dopo una verifica non vuol dire che la verifica non sia stata fatta.

### File List

```
src/app/(app)/clienti/answer-actions.ts                            NUOVO
src/lib/save-store.ts                                              NUOVO
src/lib/save-store.test.ts                                         NUOVO
src/app/(app)/clienti/[id]/schede/[assessmentId]/save-boundary.tsx NUOVO
src/app/(app)/clienti/[id]/schede/[assessmentId]/save-bar.tsx      NUOVO
src/lib/answer-control.ts                                          MODIFICA
src/lib/answer-control.test.ts                                     MODIFICA
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-field.tsx  MODIFICA
src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx          MODIFICA
src/app/globals.css                                                MODIFICA
docs/bmad/implementazione/deferred-work.md                         MODIFICA
docs/bmad/implementazione/sprint-status.yaml                       MODIFICA
docs/bmad/implementazione/3-3-non-pensare-mai-al-salvataggio.md    MODIFICA
```

Aggiunti dalla revisione del 9 agosto 2026, e sono tre file che l'elenco «non si aprono» vietava. Tutti e tre per **la sola prosa**, nessuna riga di codice, e Luca ha approvato l'uscita dal perimetro prima che avvenisse. Il motivo è la stessa regola con cui il Task 5 ha tolto la `.warn-box` insieme al suo commento: un commento che descrive codice che non c'è è un difetto, e questa story ne ha resi falsi tre.

```
src/app/(app)/clienti/[id]/schede/[assessmentId]/answer-blocks.tsx COMMENTI — «senza salvataggio non c'è niente da inviare»
src/app/(app)/clienti/[id]/schede/[assessmentId]/choice-field.tsx  COMMENTI — fin dove arriva il ritorno indietro
src/lib/use-editable-field.ts                                      COMMENTI — non tutte le azioni rivalidano l'elenco
```

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 9 agosto 2026 | 0.1 | Story creata | Claude Opus 5, skill `bmad-create-story` |
| 9 agosto 2026 | 0.2 | Le quattro domande chiuse prima di implementare: Luca conferma tutti e quattro i default — un comando esplicito solo nella barra, nessuna migrazione 0016 per `assessments.updated_at`, `block_id` rimandato col costo nuovo dichiarato, nessun `beforeunload`. I task non cambiano. | Luca |
| 9 agosto 2026 | 1.2 | Verifica di sessione fatta da Luca: diciannove caselle su diciannove, comprese le due aggiunte dalla revisione. La riga vuota della barra resta com'è — legge come un orologio fermo — quindi `design-system.md` §5 non si tocca; le due prove sul tablet passano, quindi `globals.css` non guadagna né il `viewport` né lo `scroll-margin-bottom`. Non resta nessuna scheda nel database, quindi la finestra gratuita di `block_id` è ancora aperta. Story `done`. | Luca |
| 9 agosto 2026 | 1.1 | Revisione applicata. Tutti e sette gli AC mantenuti e nessuna casella del Task 7 falsa alla riesecuzione. Due decisioni chiuse da Luca e otto patch applicate: il conteggio dei campi da salvare diventa `dirty && !pending`, così `Salva` non si accende più su un lavoro che non può fare; due caselle nuove alla sessione per misurare la barra appiccicata su un tablet vero; e sei correzioni di prosa, fra cui il ledger che dichiarava una copertura più larga del vero e tre commenti resi falsi da questa story, in file fuori perimetro aperti solo per il commento e con l'approvazione di Luca. Sette voci rimandate a ledger. Test da 189 a 190, typecheck e build verdi. | Claude Opus 5, skill `bmad-code-review` |
| 9 agosto 2026 | 1.0 | Story implementata. Tre cose nuove — `saveAnswer`, il registro `save-store` con i suoi test, la barra ancorata — e il resto è riuso: `useEditableField` e `SaveIndicator` non sono stati aperti. Chiusa la voce a ledger sui due casi degeneri della scelta singola; aperta la voce nuova su `assessments.updated_at` che non si muove salvando una risposta, con ripresa alla Story 4.1. Test da 171 a 189, typecheck e build verdi. Restano le diciassette caselle della sessione di Luca. | Claude Opus 5, skill `bmad-dev-story` |
