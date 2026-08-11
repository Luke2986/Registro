---
baseline_commit: 6fbe291
---

# Story 4.2: Vedere l'esito nell'elenco clienti

Status: review

Epic: 4 — Ritrovare a mesi di distanza e portare fuori
Data di creazione: 11 agosto 2026

> **Baseline.** La Story 4.1 è implementata, revisionata e chiusa dalla verifica di sessione: `6fbe291` su `main`, albero pulito. Tutti i conteggi di questo file sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati l'11 agosto 2026: **229 test verdi**, `npm run typecheck` senza uscita, **sedici migrazioni** a registro, tutte col prefisso numerico da `0001_extensions` a `0016_answers_touch_assessment`.
>
> **Lo stato del database è invariato dalla 3.5, per la quarta story di fila:** 3 clienti, 1 persona, **1 scheda, 24 risposte di cui 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. La scheda ha `verdict` `non_deciso`, `call_date` `2026-08-10`, `completion_status` `bozza`.
>
> **Un numero conta più degli altri per questa story: dei tre clienti, uno solo ha una scheda.** Gli altri due ne hanno zero. AC2 — la colonna vuota per un cliente senza schede — è quindi osservabile oggi, su dati veri, senza costruire niente. È il caso più facile da sbagliare e il più facile da verificare: la coincidenza va sfruttata.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want vedere nell'elenco com'è finita l'ultima valutazione di ogni cliente,
so that scorro duecento righe e capisco dove sono senza aprirne nessuna.

## Acceptance Criteria

**AC1 — la riga dell'elenco porta l'esito della scheda più recente**
**Given** un cliente con più schede
**When** guardo la sua riga nell'elenco
**Then** vedo l'esito della scheda **più recente per data di call** (FR8)

**AC2 — «nessuna scheda» non è «non deciso»**
**Given** un cliente senza nessuna scheda
**When** guardo la sua riga
**Then** la colonna esito è **vuota**, non mostra `non deciso` né uno zero

**AC3 — la pillola è la stessa, non una che le somiglia**
**Given** la colonna esito
**When** la guardo
**Then** usa le stesse pillole della scheda, con lo stesso testo e lo stesso colore (UX-DR5)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **AC2 è la sola AC che si può sbagliare in silenzio, e la trappola è nello schema.** `assessments.verdict` è `not null default 'non_deciso'`: ogni scheda **ha** un verdetto, sempre. Quindi «nessuna scheda» e «scheda senza verdetto» sono due cose diverse che il database rappresenta in due modi diversi, e la colonna deve distinguerle. Un cliente con una scheda in bozza e verdetto non ancora scritto mostra la pillola `non deciso`; un cliente senza schede mostra **niente**. Chi scrive `verdict ?? 'non_deciso'` da qualche parte ha appena reso AC2 falsa senza rompere nessun test.
>
> **Nessuna pillola nuova, e nessun secondo elenco di etichette.** `VerdictPill` esiste dalla 3.5 in `src/components/verdict-pill.tsx`, ed è finita in `src/components/` con questa motivazione scritta nel file: «la card del cliente e **l'elenco** la renderanno». La card l'ha resa con la 4.1. Questa story è l'elenco, cioè la seconda metà di quella frase. AC3 si soddisfa importando, e chi ne scrive una seconda produce due mappe di colori destinate a divergere.
>
> **Questa schermata non ha il confine server/browser della 4.1, e va detto o qualcuno lo ricostruirà per abitudine.** `assessments-card.tsx` è `'use client'`, e per questo la 4.1 riduce le risposte a due numeri dentro `page.tsx`. `clients-table.tsx` **non** è un componente del browser: non ha `'use client'`, e infatti chiama già `lastActivityAt(row)` al proprio interno (`clients-table.tsx:49`). Il calcolo dell'esito va nello stesso posto, per la stessa ragione, e `page.tsx` cresce **solo** nella `select`.
>
> **`answers` non entra in questa schermata, in nessuna forma.** `database.md` §3 lo dice per iscritto e con il motivo: contare l'avanzamento in memoria costa il trasferimento del contenuto di tutte le risposte, ed è sostenibile sulla scheda di **un** cliente e non su un elenco di duecento. Nessuna AC di questa story chiede un avanzamento nell'elenco, e aggiungerlo «già che c'ero» è la funzione non richiesta più costosa che questo repository possa produrre.
>
> **«Più recente per data di call» non basta a scegliere una riga, e il pareggio non è teorico.** `call_date` è una **data** e non un istante: due schede dello stesso giorno pareggiano. La rottura non dà nessun errore — dà un esito che cambia da un caricamento all'altro. La regola di rottura del pareggio esiste già scritta, ed è quella con cui la scheda cliente ordina le sue schede: `call_date desc`, poi `created_at desc`, poi `id` (`clienti/[id]/page.tsx:95-99,112-114`). Si copia quella, e il risultato è un'invariante verificabile a occhio: **l'esito nell'elenco è l'esito della prima riga nella card del cliente**.
>
> **La tabella passa da quattro colonne a cinque, e lo scheletro di caricamento le conta.** `clienti/loading.tsx:49` dichiara `gridTemplateColumns: '2fr 1fr 1fr 1fr'` con quattro rettangoli. Lasciarlo com'è vuol dire una colonna che compare all'arrivo dei dati, cioè esattamente il salto che uno scheletro esiste per togliere. Qui `loading.tsx` **si tocca**, e non è la scelta della 4.1 (dove non toccarlo era la cosa giusta e dichiarata).
>
> **Le due domande sono chiuse: le risposte stanno in Dev Notes → «Risposte di Luca», e i Task condizionati vanno letti con quelle in mano.** In breve: **Domanda 1 → A**, la variante è scelta ma l'esecuzione resta **condizionata alla misura del Task 5** — se la misura è pulita il Task 6 non si fa affatto, e la variante C è chiusa in partenza; **Domanda 2 → A**, il `Promise.all` entra in questa story e la voce a ledger si chiude. Nessun Task va eseguito indovinando, e nessuno va saltato.
>
> **Non porta:** l'esportazione in markdown (4.3), nessun filtro e nessun ordinamento per esito, nessun avanzamento nell'elenco, nessuna modifica a `verdict-pill.tsx` o a `verdict.ts`.

## Tasks / Subtasks

- [x] **Task 1 — La scelta della scheda, in un modulo puro** (AC: 1, 2)

  - [x] File nuovo `src/lib/latest-verdict.ts`, puro: niente React, niente Supabase, così `npm test` lo copre senza riscrivere niente (`kb-0.md` §7). È la stessa forma di `last-activity.ts` e di `assessment-progress.ts`, che sono i due precedenti esatti — calcoli che PostgREST non fa e che vivono in memoria sotto test.
  - [x] Il tipo del parametro è **solo quello che serve al calcolo** e non `AssessmentRow`: chiedere la riga intera legherebbe il modulo allo schema, ed è l'argomento già scritto in testa ad `ActivityRow` (`last-activity.ts:8-12`) e ripetuto in `assessment-progress.ts`.

    ```ts
    export type VerdictRow = {
      call_date: string
      created_at: string
      id: string
      verdict: string
    }
    ```

  - [x] `latestVerdict(assessments: readonly VerdictRow[]): string | null` — restituisce il `verdict` della scheda vincente, oppure **`null` quando l'elenco è vuoto**. `null` e non `'non_deciso'`: è AC2, ed è l'unica riga di questo modulo che una svista rende falsa senza dare nessun errore.
  - [x] Il vincitore si sceglie con la **stessa terna** che ordina le schede nella card del cliente: `call_date` decrescente, poi `created_at` decrescente, poi `id`. Il commento deve dire che è una copia deliberata di `clienti/[id]/page.tsx:112-114` e perché: così l'esito dell'elenco è l'esito della **prima riga** nella card, che è un'invariante che si verifica guardando due schermate invece che leggendo il codice.
  - [x] **`call_date` si confronta come stringa, e va scritto nel commento perché sembrerà una violazione.** `last-activity.ts:17-23` dichiara che «il confronto passa da `Date.parse` e mai dal confronto fra stringhe», e ha ragione **per un `timestamptz`**, che arriva con precisione e scostamento variabili. `call_date` è un `date`: PostgREST lo rende come `2026-08-10`, larghezza fissa e senza fuso, dove l'ordine lessicografico **è** l'ordine cronologico. Passare da `Date.parse` qui aggiungerebbe un `NaN` da gestire senza guadagnare niente.
  - [x] **`created_at` invece è un `timestamptz` e si confronta con `Date.parse`**, con la stessa gestione del `NaN` di `last-activity.ts:33-38`: un istante illeggibile non vince mai contro uno leggibile, e non rende il confronto indecidibile. Le due colonne si confrontano in due modi diversi **di proposito**, e il commento lo deve dire, o la prima revisione lo leggerà come un'incoerenza.
  - [x] `id` chiude la terna: arbitrario a parità di tutto il resto, ma **stabile**, che è quello che serve. Il motivo è già scritto in `clienti/[id]/page.tsx:97-99` — «due schede che si scambiano di posto fra un caricamento e l'altro sono un difetto che non produce nessun errore».
  - [x] Nessun restringimento del `verdict` a `Verdict` dentro questo modulo: la colonna è `string` nei tipi generati dallo schema, e il restringimento avviene dove avviene già, cioè dentro `VerdictPill` (`verdict-pill.tsx:33-34`), che su un valore sconosciuto mostra neutro invece di rompere la pagina.
  - [x] Test in `src/lib/latest-verdict.test.ts`: elenco vuoto → `null` (AC2, ed è il caso che giustifica il file); una scheda sola → il suo verdetto; due `call_date` diverse → vince la più recente **indipendentemente dall'ordine dell'array in ingresso**, perché PostgREST non garantisce l'ordine delle righe innestate; pareggio su `call_date` rotto da `created_at`; pareggio su `call_date` **e** `created_at` rotto da `id`; un `created_at` illeggibile che non vince contro uno valido; un verdetto fuori dai quattro che passa attraverso senza essere riscritto.

- [x] **Task 2 — La lettura: quattro colonne dentro l'innesto che c'è già** (AC: 1, 2)

  - [x] `src/app/(app)/clienti/page.tsx:41`: la `select` passa da `'id, name, status, tags, updated_at, assessments(updated_at)'` a `'id, name, status, tags, updated_at, assessments(updated_at, call_date, created_at, id, verdict)'`.
  - [x] **L'innesto esiste già dalla Story 1.6 e non ne nasce uno nuovo**: `assessments(updated_at)` alimenta `lastActivityAt`. Questa story gli aggiunge quattro colonne, non una seconda query. Nessun secondo `select`, nessun `.rpc`, nessun conteggio chiesto al database.
  - [x] **Innesto normale e mai `assessments!inner(...)`.** Il commento sopra la query lo dice già dal 1.6, con il motivo esatto che oggi conta ancora di più: con `!inner` diventa un join interno e **sparirebbero dall'elenco i due clienti senza schede**, cioè proprio le righe su cui AC2 si verifica. La riga di commento non si tocca, si estende.
  - [x] Le quattro colonne nuove costano poco e va scritto perché, in due righe di commento: sono un enum breve e tre chiavi d'ordine, non `answers(content)`. `database.md` §3 dichiara che l'elenco «non può copiare» la soluzione dell'avanzamento, e questo è il confine: si legge quello che serve a scegliere **una** riga e a dirne l'esito, mai il contenuto delle risposte.
  - [x] Gli `.order` della query **non si toccano**: `.order('updated_at', …)` sceglie *quali* righe tornano al tetto di PostgREST, e l'ordinamento vero resta `byLastActivityDesc` in memoria (`page.tsx:92-101`). L'esito non è una chiave d'ordine e nessuna AC lo chiede.
  - [x] La riduzione **non si fa in `page.tsx`**, e non è una svista: a differenza della 4.1, `ClientsTable` è un componente server e non c'è nessun confine di serializzazione da proteggere. Il calcolo sta nel Task 3, accanto a `lastActivityAt`, che è già lì per lo stesso motivo.
  - [x] **`Promise.all` sulle due letture** (`page.tsx:58` e `:67`), che è la chiusura della voce a ledger decisa con la Domanda 2 → A. Le due `await` diventano una, e **nient'altro**: i due rami d'errore restano dove sono e come sono, perché l'asimmetria fra `error` che porta allo stato d'errore e `tagsError` che si limita a un `console.error` è una decisione della 1.7 col motivo scritto accanto (`page.tsx:71-78`), e non è quello che questa voce chiude. **Se il `Promise.all` costringesse a toccare un ramo d'errore, fermarsi e dirlo:** vorrebbe dire che la modifica non è quella che la voce descriveva. La contabilità della voce sta nel Task 7.

- [x] **Task 3 — La quinta colonna** (AC: 1, 2, 3)

  - [x] `src/app/(app)/clienti/clients-table.tsx`, tipo `ClientListRow` (`:12-17`): l'innesto cresce delle stesse quattro colonne della `select`.

    ```ts
    assessments: { updated_at: string; call_date: string; created_at: string; id: string; verdict: string }[]
    ```

    Il commento sopra il tipo (`:8-11`) dice «Le schede sono un innesto, quindi non stanno in `ClientRow`» e resta vero: si estende con quello che l'innesto porta adesso e perché.
  - [x] Intestazione: `<th>Esito</th>`, **in coda**, dopo `Ultima attività`. L'ordine è quello di `design-system.md` §5 e del PRD §4 — nome, stato, tag, ultima attività, esito — e non si ri-decide. La parola è `Esito` e non `Verdetto`: è la stessa scelta già motivata in `verdict.ts:56-59`, che chiude dicendo «è la stessa parola che l'elenco userà per la sua colonna».
  - [x] La cella, con il valore calcolato **una volta sola** e non due — una per il controllo e una per la prop:

    ```tsx
    const verdict = latestVerdict(row.assessments ?? [])
    …
    <td>{verdict === null ? null : <VerdictPill verdict={verdict} />}</td>
    ```

    La `const` sta dentro il `.map` della riga, sopra il `return`. È la stessa forma con cui `lastActivityAt(row)` viene chiamata una volta e passata subito (`:49`), solo che qui il valore serve due volte e va tenuto.
  - [x] **`?? []` sull'innesto**, per la stessa ragione e con lo stesso commento dei due gemelli: `last-activity.ts:28-32` e `clienti/[id]/page.tsx:137-141`. PostgREST risponde `[]` sugli innesti vuoti e il tipo lo dichiara non nullabile, ma è la difesa che la revisione della 4.1 ha già chiesto di portare al secondo consumatore della stessa forma: qui un ciclo su `null` cadrebbe dentro un componente server e porterebbe via l'elenco intero invece di dare lo stato d'errore, che la pagina sa rendere.
  - [x] **La cella vuota è vuota davvero** (AC2): nessun trattino, nessun `—`, nessun «nessuna scheda», nessuno `0`. Un `<td>` senza contenuto è la resa giusta e onesta: la riga non ha quel dato perché quel dato non esiste, e ogni segnaposto sarebbe un'affermazione su una scheda che non c'è.
  - [x] **`aria-hidden` non entra e nessun nome accessibile si aggiunge alla cella.** La pillola porta la propria etichetta come testo (`VerdictPill` rende `VERDICT_LABELS[verdict]`), quindi si legge da sé — è la differenza con la barra di avanzamento della 4.1, che erano due cifre nude e ha dovuto ricevere un `aria-label` in revisione. Qui non serve, e aggiungerlo raddoppierebbe l'annuncio.
  - [x] Il commento in testa al file (`:19-26`) elenca le colonne — «nome, stato, tag, ultima attività» — e da questa story sono cinque. Va corretto nello stesso commit, e va detto **da quale story** arriva la quinta: è la stessa cosa che la 3.6 e la 4.1 hanno dovuto fare sul commento della card, per non lasciare in giro una frase che il codice smentisce (`kb-0.md` §8).

- [x] **Task 4 — Lo scheletro conta le colonne** (AC: —, ma è NFR9 e UX-DR11)

  - [x] `src/app/(app)/clienti/loading.tsx:49`: `gridTemplateColumns` passa da `'2fr 1fr 1fr 1fr'` a **cinque** tracce, e sotto (`:55-58`) nasce un quinto rettangolo.
  - [x] La larghezza del quinto rettangolo si sceglie **sulla pillola vera e non a occhio**: la pillola è alta 22 con padding orizzontale 10, e la sua larghezza dipende dall'etichetta. Si misura la più corta (`no`) e la più lunga (`sì condizionato`) nella riproduzione statica del Task 5 e si sceglie un valore in mezzo, dichiarandolo. Gli altri quattro rettangoli sono 60%, 72, 96 e 64, e sono stati scelti allo stesso modo.
  - [x] **Lo scheletro riproduce l'altezza della riga e non della pillola**: la riga è alta 56 (`.table td`) e il blocco lo dichiara già (`:52`). Non si tocca.
  - [x] **Lo scheletro non cambia con la Domanda 1, e questa riga sostituisce quella che c'era.** Con la variante C — la colonna nascosta a schermo stretto — lo scheletro avrebbe dovuto seguirla, o a 375px avrebbe disegnato una colonna che il contenuto non rende. C è chiusa in partenza, quindi le cinque tracce valgono a ogni larghezza. Se la variante A viene eseguita e la tabella riceve un contenitore che scorre, lo scheletro **gli sta dentro come la tabella**: si guarda che il blocco delle righe non esca dal contenitore prima del contenuto.

- [x] **Task 5 — Le cinque colonne a 375px, e la misura che decide la Domanda 1** (AC: 3)

  - [x] **Questa casella si esegue prima di quelle della Domanda 1, non dopo.** Riproduzione statica servita in locale con il `globals.css` vero e i due font Geist, come nella 3.3, 3.4, 3.5, 3.6 e 4.1, e valori da `getComputedStyle` invece che giudizi.
  - [x] Cosa si misura, e i numeri si scrivono: `documentElement.scrollWidth` a `clientWidth` 375 con **cinque colonne piene** e l'etichetta più lunga (`sì condizionato`) nella colonna esito. Se supera 375, la pagina scorre di lato ed è il caso che la Domanda 1 governa.
  - [x] **La pillola è il punto di rottura probabile e va guardata per prima**: `.pill` ha `height: 22px` fisso e nessun `white-space` dichiarato (`globals.css:446-457`), quindi in una cella stretta l'etichetta va a capo **dentro** un contenitore di altezza fissa. Si misura `offsetHeight` della pillola nella colonna esito a 375px: se è più di 22, la pillola è rotta e AC3 non regge — «le stesse pillole della scheda» vuol dire anche la stessa forma.
  - [x] Si misura anche il caso della cella **vuota** (AC2): la riga di un cliente senza schede deve restare alta 56 come le altre, e la colonna non deve collassare a zero facendo saltare l'allineamento delle intestazioni.
  - [x] La misura si fa su tutti e quattro i verdetti, non su uno: `sì`, `sì condizionato`, `no`, `non deciso`. Il caso peggiore è il secondo, ed è anche l'unico con uno spazio, cioè l'unico che può andare a capo.
  - [x] **Se la misura è pulita, la Domanda 1 non si esegue affatto** e si scrive che non è stato necessario, col numero. Una domanda condizionata che si esegue per abitudine è lavoro non richiesto.

- [x] **Task 6 — La forma della tabella a schermo stretto, se il Task 5 lo chiede** (AC: 3)

  > Task condizionato alla **misura del Task 5**, non più alla Domanda 1: **la Domanda 1 è chiusa su A**. Se la misura è pulita, di questo Task non si esegue niente e lo si dichiara col numero. Se rompe, si esegue **solo** la variante A.

  - [x] **Variante A** — `white-space: nowrap` su `.pill` in `globals.css`, accanto alla regola esistente (`:446-457`) e non in fondo al file, più un contenitore che scorre di lato attorno alla tabella. La regola su `.pill` tocca anche le pillole di stato del cliente: le loro cinque etichette sono parole singole, quindi il comportamento non cambia, **e va verificato invece che affermato** — si misura `offsetHeight` di una pillola di stato prima e dopo.
  - [x] **Variante A, il contenitore**: `overflow-x: auto` su un elemento nuovo attorno a `<table>` e **non** su `.card`, che è la card di ogni schermata del progetto. Una regola con un nome suo, accanto a `.table`, con il commento che dice perché la tabella cede scorrendo invece che comprimendo.
  - [x] ~~**Variante C** — regola dentro il `@media (max-width: 720px)` già esistente.~~ **Chiusa in partenza dalla risposta alla Domanda 1, l'11 agosto 2026: non si esegue in nessun caso.** Resta scritta perché il motivo per cui è stata scartata vale anche per chi un giorno la riproporrà: nascondere l'esito su telefono contraddice la ragione per cui questa story esiste, e `display: none` toglie la colonna anche a chi legge con uno screen reader.
  - [x] **Nessun valore esadecimale**, nessun token nuovo, nessuna animazione. E la misura del Task 5 si rifà dopo, coi numeri nuovi.

- [x] **Task 7 — Il ledger: quattro voci da rileggere, due da annotare e una da chiudere** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 4-2-vedere-l-esito-nell-elenco-clienti (11 agosto 2026)`, appesa **in fondo** al file. Una voce nuova è un bullet solo per quanto lungo: titolo in grassetto che dice **il difetto e non il rimedio**, con `percorso/file.ts:righe`, poi la prosa, poi `Rimandato:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**.
  - [x] **Una voce esistente non si riscrive: le si appende un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 4.2, l'11 agosto 2026**:` — e la barratura è solo per una voce chiusa per intero.
  - [x] **Voce dell'innesto senza `.limit()` sull'elenco clienti** (sezione «code review of 1-6»): **si annota, ed è l'annotazione obbligatoria di questa story.** Oggi quella voce dice che al tetto di righe di PostgREST l'elenco esce «in un ordine sbagliato ma plausibile». Da questa story il troncamento delle righe **innestate** ha una seconda conseguenza di categoria diversa: un cliente le cui schede più recenti cadono fuori dalla finestra mostra **l'esito di una scheda vecchia**, cioè un valore plausibile e sbagliato al posto di un ordine sbagliato. È la stessa distinzione che la 4.1 ha già scritto per il proprio innesto (sezione «implementazione della story 4-1»), e le due voci vanno lette insieme.
  - [x] **Voce «L'hover illumina tutta la riga ma solo il nome è cliccabile»** (sezione «code review of 1-1»): **si annota, e l'annotazione corregge due riferimenti morti.** La voce punta a `src/app/(app)/clienti/page.tsx:77-79` e a `src/app/globals.css:250-252`, e **nessuno dei due è più quello**: la Story 1.7 ha spostato la tabella in un file suo, quindi la riga sta ora a `clients-table.tsx:39-51` e la regola dell'hover a `globals.css:421-423`, mentre a `globals.css:250` oggi c'è la riga d'errore dell'intestazione di pagina, cioè un pezzo di codice che non c'entra niente. La voce dichiara anche che la scelta «dipende da come le Story 1.2 e 1.7 trattano la navigazione di riga», e quelle due sono chiuse da giorni: il punto di ripresa va rinominato. Questa story allarga la riga di una colonna senza chiudere la voce, e va detto — è la stessa forma con cui la 4.1 ha annotato la voce dei quattro stati. La revisione della 4.1 ha già scritto la regola generale: «una voce di questo ledger che il primo grep smentisce non serve a niente».
  - [x] **Voce «Le due letture della schermata iniziale sono attese in serie»** (sezione «code review of 1-7»): **si chiude e si barra** (Domanda 2 → A). La chiusura dice che il trigger dichiarato dalla voce stessa — «da chiudere quando si tocca comunque quel blocco» — è arrivato con questa story, e **corregge i riferimenti di riga** prima di barrarli: la voce dice `:68` e `:75`, le due letture stanno a **`:58`** e **`:67`**, scaduti come quelli della voce dell'hover e per la stessa causa. Va detto anche cosa la chiusura **non** copre: le due letture ora partono insieme, ma restano due richieste e non una, e la seconda rilegge la riga del cliente corrente — che è l'altra voce, quella dei suggerimenti dei tag senza `.limit()`, e non si chiude qui.
  - [x] **Voce del `block_id` non copiato dentro `answers`** (sezione «code review of 3-2»): si annota **solo se i numeri cambiano**. Aspetta da sei story il conteggio delle risposte con contenuto; alla creazione di questa story è ancora **0 su 24**. La verifica di sessione di questa story **non** ha bisogno di scrivere risposte — AC1 chiede un verdetto, non un contenuto — quindi il numero probabilmente non arriverà nemmeno stavolta, e la cosa onesta è scriverlo invece di riprometterlo. La 4.1 ha scritto che «una voce che aspetta un numero per sei story non lo sta aspettando, lo sta perdendo»: se la verifica di sessione non lo produce, questa story lo conferma.
  - [x] Ogni scostamento dal conteggio previsto — voci nuove, annotazioni in più o in meno — si dichiara nel Dev Agent Record **col motivo**. Nel File List la riga prende la forma già usata: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni, <k> chiuse`.

- [x] **Task 8 — La riga di `database.md` che questa story rende falsa** (AC: —)

  - [x] `docs/database.md` §3, blocco `### Avanzamento`, ultima riga: «Per la stessa ragione l'elenco clienti non può copiare questa soluzione e legge il solo `verdict`». Da questa story l'elenco legge `verdict` **più le tre chiavi d'ordine** che scelgono la scheda — `call_date`, `created_at`, `id` — quindi «il solo `verdict`» è letteralmente falso.
  - [x] La correzione è **una frase, non un paragrafo**, e deve tenere in piedi la parte che regge e che è il motivo per cui la riga esiste: l'elenco non legge `answers`, mai. Si dice quello che legge davvero e da quale story.
  - [x] **Non si tocca altro di `database.md`**: nessuna migrazione, nessun trigger, nessuna policy, nessuna riga in §4 o §7. Questa story non tocca lo schema.
  - [x] Nessun altro documento cambia. `prd-v1.md` §4 e `design-system.md` §5 elencano già cinque colonne con l'esito in coda: questa story li rende veri, non li corregge.

- [x] **Task 9 — Verifica** (AC: 1, 2, 3)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi partono da **229** e crescono dei soli test di `latest-verdict.test.ts`: **nessuna migrazione**, quindi `migrations.test.ts` non cresce. **Il numero atteso si dichiara prima di eseguire**, non dopo.
  - [x] **Grep del confine con l'avanzamento, che è l'unico modo automatico di provare un'assenza**: `grep -n "answers\|countAnswered\|assessment-progress" "src/app/(app)/clienti/page.tsx" "src/app/(app)/clienti/clients-table.tsx"` deve restare a **zero righe**. Prova la cosa che `database.md` §3 dichiara e che questa story potrebbe rompere per zelo: l'elenco non legge il contenuto delle risposte.
  - [x] **Grep del perimetro sulla pillola**: `grep -rn "pill--verdetto\|VERDICT_LABELS" src/` deve toccare solo `globals.css`, `verdict.ts`, `verdict-pill.tsx` e i loro test — cioè **nessun file nuovo**. Se una quinta occorrenza compare, qualcuno ha riscritto la pillola invece di importarla (AC3).
  - [x] Grep di perimetro coi numeri attesi dichiarati **prima**: `grep -rln "verdict" src/ | wc -l` e il confronto file per file con `git diff --quiet` su quelli non dichiarati. La condizione da provare è «solo righe preesistenti», **non** «solo i file dichiarati» — è la patch che la 4.1 ha pagato in revisione.
  - [x] **La misura di AC3, e si scrive coi numeri.** Sulla riproduzione statica: altezza della pillola nella cella (**22px**), `border-radius` pieno, `padding` orizzontale 10, `font-size` 12 e peso 500, e i quattro fondi e i quattro inchiostri uguali ai token — `--ok-tint`/`--ok-ink`, `--warn-tint`/`--warn-ink`, `--bad-tint`/`--bad-ink`, e il caso base `--neutral-tint`/`--ink-muted` per `non deciso`. Sono gli stessi valori che la 3.5 ha già misurato dentro la card: **devono coincidere**, ed è quello che AC3 chiede.
  - [x] Misura a **375px** e a **1280px**, con `documentElement.scrollWidth` e non a occhio, nei due casi: cinque colonne piene con l'etichetta più lunga, e una riga con la cella esito vuota. I numeri stanno nel Dev Agent Record insieme all'esito della Domanda 1.
  - [x] Sonda SQL in transazione annullata, con la stessa forma delle cinque story precedenti — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`. **Prima cosa da provare, ed è AC1 a database:** inserire nella transazione una seconda scheda sullo stesso cliente con `call_date` più recente e verdetto diverso, e verificare che la terna `order by call_date desc, created_at desc, id` scelga quella. Poi il pareggio: due schede con la **stessa** `call_date` e `created_at` diversi.
  - [x] Sonda di AC2, che è la più facile da provare e la più facile da dimenticare: il conteggio dei clienti **senza** nessuna scheda — oggi **2 su 3** — con la stessa `left join` che l'innesto produce. È il numero che rende AC2 osservabile sull'archivio vero.
  - [x] **La forma PostgREST dell'innesto allargato**, che né `build` né `typecheck` verificano: provata con la chiave pubblicabile e senza sessione, come nella 2.1 e nella 4.1. La `select` vera deve rispondere **200** con `[]` (la sicurezza a livello di riga filtra tutto, che è la risposta giusta), e una colonna inventata dentro l'innesto deve dare **`42703`** con l'alias `assessments_1`, che è la prova che il join viene generato davvero invece di essere ignorato.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione dell'11 agosto 2026, tre strati in parallelo: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Sei reperti scartati come rumore.

**Le tre AC sono soddisfatte, e AC2 — quella che poteva fallire in silenzio — è soddisfatta nel modo giusto.** Nessun ripiego `?? 'non_deciso'` esiste in nessun punto della catena: il grep sui tre file dà zero, `latestVerdict([])` risponde `null`, e la cella rende un `<td>` senza contenuto (`clients-table.tsx:61`). La terna d'ordine coincide davvero con `clienti/[id]/page.tsx:112-114`, verso dell'`id` compreso — `challenger.id < holder.id` è l'ordine crescente che `.order('id')` produce. La pillola è importata e non riscritta: nessun file nuovo compare nel grep su `VERDICT_LABELS`. 237 test verdi, `typecheck` pulito, nessun file toccato fuori dal File List.

**Nessun difetto nel codice nuovo, e quasi tutti i reperti stanno nella prosa che lo accompagna.** Questa story ha un Task intero — il 7 — il cui scopo dichiarato è correggere riferimenti morti nel ledger, con scritto dentro «una voce di questo ledger che il primo grep smentisce non serve a niente». Le annotazioni che quel Task ha prodotto ne contengono **quattro** nuovi, e uno è morto per colpa delle dieci righe che questa stessa story ha aggiunto sopra la regola citata. È il primo `[Patch]` qui sotto, ed è la cosa più utile che la revisione abbia trovato.

**Il solo reperto che tocca il comportamento è la conseguenza non guardata della variante A.** La tabella ora cede scorrendo dentro un contenitore, e quel contenitore è l'unica cosa che sta fra chi guarda e la colonna nuova a schermo stretto. La Domanda 1 aveva scartato la variante C perché «`display: none` toglie la colonna anche a chi legge con uno screen reader»: la variante A la lascia nel DOM e la mette fuori dalla portata della tastiera, e nessuno ha rifatto quella domanda dopo il cambio di variante.

- [x] [Review][Patch] **`.table-scroll` non entra nell'ordine di tabulazione, e quello che nasconde a 375px è esattamente la colonna nuova** [`src/app/(app)/clienti/clients-table.tsx:30`] — il contenitore è un `<div>` con `overflow-x: auto`, senza `tabIndex`, senza ruolo e senza nome. L'euristica che rende focalizzabile uno scroller vale sui contenitori **senza** figli focalizzabili, e qui i figli focalizzabili ci sono: sono i collegamenti sul nome, tutti nella **prima** colonna. Tabulando non ci si sposta mai a destra, quindi il contenitore non scorre mai, e con i numeri del Dev Agent Record — 514px di contenuto in 295 visibili — i 219 tagliati sono `Esito` per intero. Prima di questa story la stessa colonna sarebbe stata raggiungibile, perché a scorrere era la **pagina** (465 su 375, misurato dalla story stessa): la regressione nasce qui. Il rimedio è il pattern canonico e sta in una riga — `tabIndex={0}`, `role="region"` e un `aria-label` — sul solo contenitore della tabella; quello dello scheletro non ne ha bisogno, perché non porta nessuna informazione da leggere.
- [x] [Review][Patch] **Il Task che corregge i riferimenti morti ne scrive quattro nuovi, e uno lo uccide questa story** [`docs/bmad/implementazione/deferred-work.md:8,46,55`] — verificati uno per uno. (a) L'annotazione all'hover sposta la regola a `globals.css:421-423`: era vero su `HEAD`, non lo è più dopo il commit, perché le dieci righe di `.main` e `.table-scroll` stanno tutte sopra e `.table tbody tr:hover td` è ora a **`:431`**. Il numero è stato preso prima delle proprie modifiche al foglio. (b) La stessa annotazione mette la riga della tabella a `clients-table.tsx:65-82` e il collegamento a `:66-68`: il file è lungo **69** righe, la `<tr>` sta a **`:48-62`** e il collegamento a **`:49-51`**; a `:65-67` ci sono `</tbody>`, `</table>` e `</div>`. (c) L'annotazione all'innesto colloca la `select` a `page.tsx:49`, dove c'è il commento sugli indici gin: la `.select` è a **`:44`**. (d) La voce chiusa e barrata indica il `Promise.all` a `page.tsx:79-82`, dove c'è il `console.error` dei tag: il `Promise.all` è a **`:71-74`**. I riferimenti *storici* `:58` e `:67` sono invece esatti, verificati su `git show HEAD`.
- [x] [Review][Patch] **L'annotazione all'innesto riafferma un rimedio che questa story ha appena reso inutilizzabile** [`docs/bmad/implementazione/deferred-work.md:46`] — la voce indica come contenimento `.limit(1, { referencedTable: 'assessments' })` e chiude con «Il rimando e il punto di ripresa restano quelli scritti sopra». Ma da oggi l'innesto ha **due** consumatori con due ordini incompatibili: `lastActivityAt` vuole il massimo di `updated_at`, `latestVerdict` il massimo della terna `call_date, created_at, id`. Una `limit(1)` porta una riga sola in un ordine solo — con un `.order` abbinato rompe l'altro consumatore, senza `.order` porta una riga arbitraria e li rompe entrambi in silenzio. Il rimedio non è «da riprendere», è **da riscrivere**, e la voce non lo dice. Nella stessa annotazione va attenuata la seconda affermazione: che il tetto di righe si applichi anche alle righe **innestate** non è verificato in nessun punto del repository, e la voce lo dà per fatto mentre la story ha eseguito sonde PostgREST vere senza provare proprio quella.
- [x] [Review][Patch] **La frase di `database.md` corretta dal Task 8 ripete la categoria di errore che doveva correggere** [`docs/database.md:249`] — dice che l'elenco «legge `verdict` più le tre chiavi che scelgono la scheda — `call_date`, `created_at`, `id`». L'innesto vero ne porta **cinque**: `assessments(updated_at, call_date, created_at, id, verdict)` (`page.tsx:44`). `updated_at` è preesistente e serve all'ultima attività, ma è esattamente l'omissione che rendeva falsa la frase vecchia («legge il solo `verdict`»), ed è la frase su cui si appoggerà chi vorrà aggiungere una sesta colonna. La parte che regge — e non `answers`, in nessuna forma — resta vera e non si tocca.
- [x] [Review][Patch] **`design-system.md` §5 descrive una tabella che non si comporta più così** [`docs/design-system.md:176-180`] — «Tabella senza griglia: righe separate da 1px `--line`, altezza 56, passaggio del mouse su `--surface-sunken`». Da questa story la tabella **cede scorrendo** dentro un contenitore con un nome suo, e `.main` non allarga più la pagina per contenerla: sono due regole strutturali nuove che vivono solo nei commenti del foglio e in una voce a ledger. `kb-0.md` §6 vuole il sistema prima delle schermate e §8 vuole la decisione scritta dove è stata presa. Il Task 8 vietava di toccare altri documenti, ma quel divieto è stato scritto quando la variante A era ancora **condizionale**: la misura l'ha resa reale, e il documento non l'ha saputo. Due righe, non un paragrafo.
- [x] [Review][Patch] **Tre caselle del Task 2 e del Task 3 dichiarano commenti che il codice non porta** [`src/app/(app)/clienti/clients-table.tsx:10-13,21-27`; `src/app/(app)/clienti/page.tsx:35-41`] — (a) «Il commento sopra il tipo (`:8-11`) … si estende con quello che l'innesto porta adesso e perché»: il commento è identico a prima mentre il tipo sotto è cresciuto di quattro colonne. (b) «va detto **da quale story** arriva la quinta»: il commento in testa elenca le cinque colonne e non nomina nessuna story — e nel riscriverlo ha cancellato la frase sulla 1.7 che la casella chiedeva di correggere, non di togliere. (c) Task 2: «Le quattro colonne nuove costano poco e va scritto perché, in due righe di commento: sono un enum breve e tre chiavi d'ordine, non `answers(content)`»: il commento scritto dice solo che `answers` non si legge mai, e la ragione per cui *queste* quattro sono a buon mercato non compare da nessuna parte nel codice. La casella «la riga di commento non si tocca, si estende» è invece uno scostamento giusto — l'inciso «che oggi sono tutti» era diventato falso — ma non dichiarato.
- [x] [Review][Patch] **Due numeri del Dev Agent Record che il file smentisce** — (a) il grep del confine con l'avanzamento è dichiarato a «**due** righe, entrambe di prosa»: il comando ne dà **una**, `page.tsx:40`, e `clients-table.tsx` non ne contiene nessuna. La condizione che contava — nessuna lettura di `answers` — regge lo stesso. (b) Il File List dice «`sprint-status.yaml` MODIFICA — 4-2 **da ready-for-dev a review**»: il diff mostra `backlog → review`. È lo stesso difetto che la revisione della 4.1 aveva già trovato sulla propria riga: la creazione della story non aveva aggiornato il file, e il File List racconta una transizione che non è avvenuta.
- [x] [Review][Patch] **L'invariante che la story propone come prova a occhio non regge sotto il millisecondo** [`src/lib/latest-verdict.ts:12-16`] — `created_at` è un `timestamptz` a microsecondi e `Date.parse` tronca ai millisecondi: `…990754` e `…990312` danno lo stesso numero. Due schede con la stessa `call_date` create nello stesso millisecondo — un doppio clic su «Nuova scheda», che `kb-0.md` §7 elenca fra i casi da provare — vengono ordinate da Postgres sui microsecondi e da `latestVerdict` sull'`id`: le due schermate possono scegliere schede diverse. La story eleva «l'esito nell'elenco è l'esito della prima riga nella card» a invariante verificabile a occhio e la mette nella Verifica di sessione: o si rompe il pareggio residuo sulla stringa quando i millisecondi coincidono, o il limite si scrive accanto all'invariante. Una riga in entrambi i casi.
- [x] [Review][Defer] **La pillola `non deciso` perde il proprio fondo quando il mouse passa sulla riga** [`src/app/globals.css:431-433` contro `:466-469`] — `--neutral-tint` è `#EDE9E2` e `--surface-sunken`, il fondo della riga al passaggio, è `#EAE5DC`: fra i due il rapporto è circa **1,03:1**, cioè lo stesso colore. Dei quattro esiti, l'unico senza fondo proprio si dissolve nella riga e resta testo nudo mentre gli altri tre restano pillole — ed è anche il caso più frequente su un archivio appena avviato, dove l'unico verdetto a database è `non_deciso`. Nella card del cliente non succede, perché lì non c'è hover di riga. **Rimandato: nessuna informazione si perde** — il testo resta e resta leggibile, `--ink-muted` su `--surface-sunken` sta a 6,1:1 — e il rimedio è un token o una quinta regola che `design-system.md` §5 non prescrive, cioè una decisione di forma da prendere guardando la tabella e non un difetto da correggere qui.

**La correzione della tabulazione è stata misurata, non affermata.** Riproduzione statica servita in locale con il `globals.css` vero, viewport 375, la tabella dentro `.card` e `.main` come nell'app. Con `tabIndex`, `role` e nome accessibile il contenitore è **il primo elemento tabulabile del documento**, prima dei tre collegamenti sul nome — `[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]` dà `DIV.table-scroll, A, A, A` — e riceve il fuoco (`document.activeElement.className` è `table-scroll`). Portato lo scorrimento al massimo (155 su 295 visibili di 449 di contenuto), l'intestazione `Esito` e la pillola entrano **interamente** nel riquadro, e la pillola resta alta **22**. La pagina non scorre: `documentElement.scrollWidth` 375 su `clientWidth` 375.

**Quello che quella misura non prova, e per questo la Verifica di sessione ha una casella in più:** la pressione vera del tasto. Gli eventi sintetici inviati al riquadro d'anteprima non muovono lo scroller, quindi lo scorrimento con le frecce è stato provato per assegnazione di `scrollLeft` e non da tastiera. Il font della riproduzione non è Geist, quindi le larghezze qui sopra sono quelle della riproduzione e non quelle dell'app — le larghezze vere sono nel Debug Log, misurate durante l'implementazione; qui contano l'ordine di tabulazione e il fuoco, che dal font non dipendono.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| La pillola di verdetto, coi suoi quattro casi e i suoi tre inchiostri | `src/components/verdict-pill.tsx` | 3.5 |
| Le etichette dei quattro verdetti | `VERDICT_LABELS`, `src/lib/verdict.ts` | 3.5 |
| Le tre regole CSS delle pillole di verdetto | `globals.css:494-516` | 3.5 |
| La tabella dell'elenco, in un file suo | `src/app/(app)/clienti/clients-table.tsx` | 1.7 |
| L'innesto `assessments(...)` nella query dell'elenco | `clienti/page.tsx:41` | 1.6 |
| L'ordinamento in memoria su righe innestate, come precedente di metodo | `src/lib/last-activity.ts` | 1.6 (D23) |
| Un secondo calcolo puro sulle stesse righe innestate | `src/lib/assessment-progress.ts` | 4.1 |
| La terna che sceglie l'ordine delle schede di un cliente | `clienti/[id]/page.tsx:112-114` | 3.1 |
| Lo scheletro della tabella, a quattro colonne | `clienti/loading.tsx:44-60` | 1.7 |

**Questa story scrive meno codice della 4.1 e ha un rischio in più.** Le tre AC sono una colonna, e la parte difficile non è renderla: è che due delle tre — AC2 sul vuoto e AC3 sulla forma della pillola — falliscono **senza dare nessun errore**. Una si rompe scrivendo un `??` di troppo, l'altra si rompe a 375px, dove nessuno guarda.

### Perché la pillola è la stessa e non una che le somiglia

`verdict-pill.tsx:11-12` porta scritto, dal 10 agosto: «Sta in `src/components/` e non dentro la cartella della rotta perché **la card del cliente e l'elenco la renderanno**». La card è la 4.1. L'elenco è questa story. Non c'è nessuna decisione da prendere: c'è una previsione scritta da chiudere.

AC3 dice «le stesse pillole della scheda, con lo stesso testo e lo stesso colore», e la forma con cui si soddisfa non è un confronto visivo ma un'importazione: stesso componente, stessa mappa di etichette, stesse tre classi CSS. Il confronto visivo del Task 9 serve a provare che il contesto della tabella non ne rompe la forma — che è un'altra cosa, ed è il rischio vero.

**Cosa non si tocca di quel componente.** Il restringimento `isVerdict` che rende neutro un valore sconosciuto invece di rompere la pagina; l'assenza del punto di 6px, che è la differenza dichiarata con `StatusPill`; l'assenza di modificatore per `non_deciso`, che è il caso base e sta a 6,37:1. Sono tre decisioni della 3.5, tutte con il loro motivo nel file.

### AC2, e perché è la sola che si rompe in silenzio

Lo schema non ha un modo di dire «questo cliente non è mai stato valutato» dentro `assessments`: lo dice l'**assenza di righe**. `verdict` è `not null default 'non_deciso'` (`0005_assessments_answers.sql`), quindi ogni scheda porta un verdetto e `non_deciso` è quello di partenza.

Le due situazioni sono diverse e vanno rese diverse:

| Situazione | Righe in `assessments` | Cosa mostra la colonna |
|---|---|---|
| Cliente mai valutato | 0 | **niente** |
| Scheda aperta, verdetto non ancora scritto | 1, `verdict = 'non_deciso'` | pillola `non deciso` |

Il modo di romperla è uno solo e sembra innocuo: dare a `latestVerdict` un valore di ripiego. Da lì i due clienti senza schede diventano indistinguibili da un cliente in corso di valutazione, e nessun test lo dice, perché il test che lo direbbe è quello che si è dimenticato di scrivere.

**Oggi il caso è osservabile senza costruirlo:** dei tre clienti a database, **uno** ha una scheda e **due** no. La verifica di sessione lo guarda su dati veri.

### La scheda «più recente», e perché la terna non è zelo

AC1 dice «per data di call». `call_date` è un `date`: due call nello stesso giorno pareggiano, e con un utente che ne fa più d'una al giorno il pareggio è la normalità e non l'eccezione.

Un pareggio non risolto non produce un errore: produce **un esito che cambia da un caricamento all'altro**, perché PostgREST non garantisce l'ordine delle righe innestate. È lo stesso difetto che `last-activity.ts:56-61` descrive per l'elenco — «un elenco che si muove da solo è indistinguibile da un difetto» — e la contromisura è la stessa: un ordine totale, dichiarato.

La terna non si inventa qui: esiste già, ed è quella con cui la scheda cliente ordina le sue schede (`clienti/[id]/page.tsx:95-99`, dove il motivo è scritto per esteso). Copiarla produce un'invariante che si verifica **guardando**, non leggendo il codice:

> l'esito nella riga dell'elenco è l'esito della **prima** scheda nella card del cliente.

Se le due schermate divergono, una delle due ha l'ordine sbagliato, e la cosa si vede in due secondi.

**Le due colonne si confrontano in due modi diversi, e non è un'incoerenza.** `call_date` è un `date` reso come `2026-08-10`: larghezza fissa, nessun fuso, ordine lessicografico identico all'ordine cronologico. `created_at` è un `timestamptz` reso come `2026-08-10T05:40:49.990754+00:00`: precisione e scostamento variabili, dove il confronto fra stringhe sbaglia — è l'argomento scritto in `last-activity.ts:17-23`, che vale là e vale qui per `created_at` soltanto.

### Dove va il calcolo, e perché non è dove l'ha messo la 4.1

La 4.1 riduce le righe di `answers` a due numeri dentro `page.tsx` **perché `assessments-card.tsx` è `'use client'`**: le sue prop finiscono nel payload spedito al browser, e il contenuto delle risposte è la categoria di dato più sensibile del sistema (`kb-0.md` §4).

Qui il confine non c'è. `clients-table.tsx` non porta `'use client'` — è un componente server, come `StatusPill` che rende — e infatti chiama già `lastActivityAt(row)` al proprio interno (`:49`). L'esito va nello stesso posto: è **una stringa breve per riga**, non il testo di ventiquattro risposte, e spostare il calcolo in `page.tsx` aggiungerebbe una riduzione e un tipo per non guadagnare niente.

**Va scritto nel commento**, perché la 4.1 ha appena stabilito il contrario a due file di distanza e la simmetria apparente è più forte della differenza vera.

### Cosa l'elenco non legge, e perché è una decisione registrata

`database.md` §3, in fondo al blocco dell'avanzamento: «Per la stessa ragione l'elenco clienti non può copiare questa soluzione e legge il solo `verdict`». La ragione è scritta sopra: contare l'avanzamento in memoria vuol dire **trasferire il contenuto di tutte le risposte**, che su un cliente sono ventiquattro righe e su un elenco di duecento clienti sono un'altra cosa.

Quindi: nessun `answers(...)` in questa schermata, in nessuna forma, nemmeno `answers(count)`. Il grep del Task 9 lo verifica, perché una dichiarazione non basta.

Il costo che questa story aggiunge è invece piccolo e va detto per intero: quattro colonne dentro un innesto che esiste già — un enum breve e tre chiavi d'ordine. Nessuna riga in più, nessuna query in più.

### Il rischio a 375px, e perché ha un Task suo

La tabella è `width: 100%` con `border-collapse: collapse` e **nessun contenitore che scorra**: `.card` non ha `overflow`, e l'unico punto responsivo del foglio è il `@media (max-width: 720px)` che tocca `.shell`, `.sidebar` e `.main` (`globals.css:1274-1287`). A 375px la larghezza utile è 375 meno i 16 di padding di `.main` e i 24 di `.card`, cioè **295px per cinque colonne**, ognuna con 24px di padding orizzontale.

Due cose possono rompersi, e sono opposte:

- **Senza `white-space`**, l'etichetta più lunga — `sì condizionato`, l'unica con uno spazio — va a capo **dentro** `.pill`, che ha `height: 22px` fisso (`globals.css:450`). Il testo esce dalla pillola: AC3 cade, perché «la stessa pillola della scheda» è anche la stessa forma.
- **Con `white-space: nowrap`**, la pillola non si comprime più e la larghezza minima della tabella supera il contenitore: la pagina scorre di lato, che è la cosa che la 4.1 ha misurato ed escluso per la propria riga (`scrollWidth` 375 su `clientWidth` 375).

Nessuna delle due è accettabile in silenzio, e quale delle due strade prendere è una decisione di forma su una schermata intera, non un dettaglio di implementazione: è la **Domanda 1**. Il Task 5 la misura prima, così la decisione si prende su un numero.

**NFR4 dice «funziona su portatile e su tablet»** e nomina la compilazione come il caso critico; l'elenco però è la schermata iniziale, quella che si apre sempre, e una schermata iniziale che scorre di lato su telefono è la prima cosa che si vede.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/latest-verdict.ts` | **nuovo** — `latestVerdict`, e `null` quando non ci sono schede | 1 |
| `src/lib/latest-verdict.test.ts` | **nuovo** — l'elenco vuoto, i due pareggi, l'ordine d'ingresso | 1 |
| `src/app/(app)/clienti/page.tsx` | quattro colonne dentro l'innesto che c'è già, e il `Promise.all` sulle due letture | 2 |
| `src/app/(app)/clienti/clients-table.tsx` | il tipo, l'intestazione, la cella, il commento corretto | 3 |
| `src/app/(app)/clienti/loading.tsx` | la quinta traccia e il quinto rettangolo | 4 |
| `src/app/globals.css` | **solo se la misura del Task 5 rompe** — `white-space: nowrap` su `.pill` e il contenitore che scorre (variante A) | 6 |
| `docs/database.md` | §3, la frase «legge il solo `verdict`» | 8 |
| `docs/bmad/implementazione/deferred-work.md` | due annotazioni e una voce chiusa | 7 |

**E basta.** In particolare **non** si aprono: `src/components/verdict-pill.tsx`, `src/lib/verdict.ts`, `src/components/status-pill.tsx`, `src/lib/last-activity.ts`, `src/lib/assessment-progress.ts`, `src/lib/client-filters.ts`, `filters-form.tsx`, tutta la cartella `clienti/[id]/` — card del cliente compresa, che la 4.1 ha appena chiuso — e tutta `clienti/[id]/schede/`. Nessuna migrazione, nessuna server action. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**.

### Trappole note

**1. Dare a `latestVerdict` un valore di ripiego.** `?? 'non_deciso'` scritto in qualunque punto della catena rende AC2 falsa e non rompe niente. È la trappola numero uno, e il test dell'elenco vuoto è l'unica cosa che la intercetta.

**2. Riscrivere la pillola.** Esiste dalla 3.5 e sta in `src/components/` con scritto sopra che l'elenco la renderà. Una seconda vorrebbe dire due mappe di etichette e due insiemi di colori destinati a divergere. Il grep del Task 9 lo verifica.

**3. Fermarsi a `call_date` e non rompere il pareggio.** Sembra quello che AC1 chiede, letteralmente. Produce un esito che cambia da un caricamento all'altro su ogni cliente con due call nello stesso giorno, cioè il caso normale.

**4. Confrontare `created_at` come stringa** perché `call_date` si confronta così. Sono due tipi diversi e il motivo sta scritto sopra: un `date` a larghezza fissa sì, un `timestamptz` no.

**5. Portare l'avanzamento anche nell'elenco.** È la funzione non richiesta più costosa possibile qui, e `database.md` §3 la vieta con il motivo. Nessuna AC la chiede.

**6. Dimenticare `loading.tsx`.** Lo scheletro ha quattro colonne scritte a mano in un `gridTemplateColumns`: senza la quinta, la colonna compare all'arrivo dei dati e la tabella salta. La 4.1 ha dichiarato per iscritto perché **non** toccarlo era giusto là; qui è il contrario, e per lo stesso ragionamento.

**7. Mettere un trattino nella cella vuota.** `—` sembra più curato di una cella vuota ed è un'affermazione su una scheda che non esiste. AC2 dice «vuota».

**8. Riordinare l'elenco per esito**, o aggiungere un filtro per esito. Nessuna AC lo chiede, nessun documento lo nomina, e l'ordinamento è quello dell'ultima attività (FR11), che non si tocca.

**9. Mettere `overflow-x` su `.card`.** È la card di ogni schermata del progetto. Se serve un contenitore che scorra, nasce accanto a `.table` e vale per la tabella.

**10. Misurare a occhio.** Le misure di questa story sono tutte di CSS: si prendono da `getComputedStyle` e da `scrollWidth`. La 3.6 ha pagato due patch di revisione per due numeri dichiarati e non misurati, e la 4.1 ne ha pagate tre di prosa.

### Perimetro: cosa NON entra in questa story

- **L'esportazione della scheda in markdown** (4.3).
- **Qualsiasi filtro o ordinamento per esito**, e qualsiasi avanzamento nell'elenco.
- **Qualsiasi modifica a `verdict-pill.tsx` e `verdict.ts`**: si importano, non si toccano.
- **La card del cliente e la schermata di compilazione**, che la 4.1 e l'Epic 3 hanno appena chiuso.
- **La correzione dei 40px di `.btn`** — `deferred-work.md` voce 1, che appartiene alla 5.2.
- **I due riquadri `.error-box` e `.warn-box` sotto 4,5:1** — voce della 3.5, che appartiene alla 5.2.
- **L'alone del fuoco in `--sec-prequalifica` fuori dalla compilazione** — voce del 2 agosto, che appartiene alla 5.2.
- **L'estrazione della macchina dei quattro stati** — voce della 3.1, il cui punto di ripresa la 4.1 ha fissato alla **5.1**.
- **La migrazione con `unnest` per i suggerimenti dei tag** — voce della 1.4, che nessuna story dell'Epic 4 tocca.

### Test

Un modulo puro nasce e va sotto test, ed è la stessa regola applicata a `client-status.ts`, `answer-control.ts`, `save-store.ts`, `owed-exit.ts`, `verdict.ts`, `completion-status.ts`, `last-activity.ts` e `assessment-progress.ts`: la logica che, rompendosi, produce un dato sbagliato **senza dare nessun errore**.

`latest-verdict.ts` è esattamente quel caso, e ne ha due di quel tipo in un file solo: l'elenco vuoto che deve dare `null` (AC2) e il pareggio che deve dare sempre la stessa riga (AC1). Nessuno dei due lancia niente, nessuno dei due si vede, entrambi vengono creduti.

Il caso che vale più di tutti è **l'ordine dell'array in ingresso**: il test deve passare lo stesso elenco in due ordini diversi e pretendere lo stesso risultato. PostgREST non garantisce l'ordine delle righe innestate, e un `latestVerdict` che restituisce «l'ultima dell'array» invece della vincente passerebbe qualsiasi test scritto con un ordine solo.

`clients-table.tsx` è codice di presentazione: **non** si costruisce un'impalcatura di test del DOM per lui, che sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2 e §7). Si verifica a mano, e la verifica si dichiara con i numeri.

### Contratto visivo

**Nessuna forma nuova.** La pillola è quella di `design-system.md` §5 come precisata il 10 agosto: altezza 22, raggio pieno, padding orizzontale 10, `--t-meta` peso 500, fondo nella tinta chiara e testo nell'**inchiostro** e non nel colore pieno — `--ok-ink`, `--warn-ink`, `--bad-ink` — con `non deciso` come caso base (`--ink-muted` su `--neutral-tint`). Nessun punto di 6px: quello è delle pillole di stato.

**La colonna sta in coda**, dopo `Ultima attività`: è l'ordine di `design-system.md` §5 e del PRD §4.

**UX-DR2 regola 5, «una sola cosa colorata satura per schermata», va guardata e non ignorata.** Dopo questa story ogni riga dell'elenco porta due pillole: quella dello stato, che è in tinta neutra col colore nel punto di 6px, e quella dell'esito, che è in tinta chiara. Nessuna delle due è satura, e su un elenco di duecento righe è la ripetizione e non l'intensità a fare rumore. La regola dice «di norma», e la cosa che va vista per prima su questa schermata è il nome del cliente, che resta a peso 500 su `--ink`. Se la misura mostrasse una tabella rumorosa, la correzione è la disposizione e non il colore.

### Sicurezza

Nessuna scrittura nuova. Una lettura più larga su un innesto che esiste già.

- **L'innesto si protegge da sé.** `assessments_owner_all` (`0007_rls.sql`) filtra le schede altrui dentro la stessa richiesta, come fa già dal 1.6 per `updated_at`. Non c'è nessun controllo da riscrivere lato applicazione, e le quattro colonne nuove sono dentro lo stesso filtro.
- **Nessun dato personale nei log.** La pagina logga solo `code` e `message` e non cambia (`kb-0.md` §3): `details` conterrebbe valori delle righe.
- **Il verdetto non è la categoria sensibile del sistema, le risposte sì.** È la ragione per cui questa colonna si può leggere e `answers` no, ed è scritta in `database.md` §3.
- **Nessun input nuovo, nessun parametro nuovo dalla richiesta.** I tre filtri della barra restano quelli, e l'esito non ne diventa un quarto.

### Project Structure Notes

Nessuna cartella nuova, nessuna dipendenza nuova. Il modulo puro sta in `src/lib` accanto a `last-activity.ts` e `assessment-progress.ts`, che sono i suoi due precedenti.

**`latest-verdict.ts` sta fuori da `last-activity.ts` e non dentro**, benché entrambi calcolino in memoria sulle stesse righe innestate della stessa query. È la stessa scelta e lo stesso argomento che la 4.1 ha già scritto per `assessment-progress.ts`: `last-activity.ts` risponde a «quando questo cliente è stato toccato l'ultima volta» e serve all'**ordinamento**; questo risponde a «com'è finita l'ultima valutazione» e serve a **una colonna**. Sono due domande diverse sulla stessa riga, e un file che le contenesse entrambe crescerebbe nella direzione sbagliata al primo che aggiunge una funzione.

Nessun componente nuovo in `src/components/`: la pillola c'è, e la cella sono due tag dentro la tabella.

### Piattaforma in uso, verificata

Letti da `package.json` e invariati alla baseline: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

Niente di quello che questa story usa è nuovo. L'innesto `clients` con `assessments(...)` è in produzione dalla Story 1.6 e questa gli aggiunge quattro colonne: nessuna API della piattaforma che non sia già in uso in almeno tre file.

**Una cosa da non dare per scontata, ed è l'unica:** PostgREST non garantisce l'ordine delle righe innestate se non lo si chiede con `.order(…, { referencedTable })`. Questa story **non** lo chiede — sceglie in memoria, per la stessa ragione di D23 — e il test dell'ordine d'ingresso è quello che rende la scelta indipendente da quella garanzia.

### Stato del database, e cosa vuol dire per la verifica

Misurato l'11 agosto 2026 sul progetto `izkycpwxuedpkzgpvcxc`.

| | Dichiarato dalla 4.1 alla sua chiusura | Oggi |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| **clienti con almeno una scheda** | — | **1** |
| **clienti senza nessuna scheda** | — | **2** |
| schede / risposte | 1 / 24 | 1 / 24 |
| risposte con contenuto | 0 | **0** |
| questionari / blocchi | 1 / 9 | 1 / 9 |
| domande, di cui attive | 24 / 23 | 24 / 23 |

L'unica scheda: `call_date` **2026-08-10**, `verdict` **`non_deciso`**, `completion_status` `bozza`, `total_questions` 24.

Sedici migrazioni a registro, tutte col prefisso numerico. Questa story non ne aggiunge nessuna.

**Tre conseguenze per la verifica.**

**AC2 è già osservabile e non va costruita:** due clienti su tre hanno zero schede. Sono le due righe con la colonna vuota, e la verifica di sessione le guarda per prime.

**AC1 non è osservabile senza scrivere:** l'unico cliente con una scheda ne ha una sola, quindi «la più recente» non discrimina niente. Per vederlo servono due schede sullo stesso cliente con `call_date` diverse — e la seconda si apre dall'interfaccia, che è funzione della 3.1 e non di questa story. La sonda SQL del Task 9 prova la stessa cosa a database in transazione annullata; la verifica di sessione la prova a schermo.

**AC3 si prova a schermo, e in un caso solo:** l'unico verdetto a database è `non_deciso`, cioè il caso base senza modificatore, che è quello che dà **meno** informazione dei quattro. Gli altri tre si guardano cambiando il verdetto dalla schermata di compilazione, che è funzione della 3.5. È l'unica casella della verifica di sessione che chiede di scrivere qualcosa.

### Intelligence dai commit e dalla story precedente

Gli ultimi commit sono `6fbe291` (chiusura 4.1 con la verifica di sessione), `ea6a306` (implementazione 4.1 con la revisione già applicata), `e109999` (chiusura 3.6). **La forma è costante da sette story e va rispettata: un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca.** Lo stato `done` non lo mette la revisione.

Dalla 4.1 e dalla sua revisione, cinque cose di metodo che questa story riusa invece di riscoprire:

- **Un commento nel codice che dice il falso è una trappola attiva, non un difetto cosmetico.** La 4.1 ha dovuto correggere un commento che mandava chi implementava a costruire due cose invece di tre. Qui i commenti da correggere sono due — l'elenco delle colonne in `clients-table.tsx:19-26` e la frase di `database.md` §3 — e sono Task, non rifiniture.
- **Una difesa scritta una volta va portata su tutti i consumatori della stessa forma.** La revisione della 4.1 ha aggiunto `?? []` a `countAnswered` perché `last-activity.ts` ce l'aveva e il gemello no. Questa story ha il terzo consumatore dello stesso innesto: il `?? []` c'è dal primo momento, non dalla revisione.
- **Una funzione pura dev'essere totale, e la guardia ovvia spesso non lo è.** `progressFillPercent` usava `total <= 0`, che su `NaN` è falso. Qui l'equivalente è l'elenco vuoto, che è il caso *normale* e non un ingresso degenere: due clienti su tre lo producono ogni volta che l'elenco si carica.
- **I numeri del Dev Agent Record vengono ricalcolati in revisione.** La 4.1 ne ha dichiarati tre che il diff ha smentito, tutti nella prosa. Le misure di questa story sono quasi tutte CSS: si prendono da `getComputedStyle`, non a occhio.
- **Una voce del ledger che sembra più chiusa di quanto è, è un difetto.** Questa story ne rilegge quattro e ne annota almeno due; quella dell'innesto senza `.limit()` cambia di categoria per colpa sua, e va detto.

Dalla verifica di sessione della 4.1, l'avvertimento che vale più di tutti: **tre caselle su otto chiedevano un'annotazione e non l'hanno ricevuta**, e sono rimaste passate e non misurate. Le caselle di questa story che chiedono un numero sono contrassegnate, e sono poche apposta.

### Riferimenti

- L'AC1, l'AC2, l'AC3 e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-4-ritrovare-a-mesi-di-distanza-e-portare-fuori]
- FR8, «elencare i clienti con nome, stato, tag, ultima attività ed esito dell'ultima scheda» — [Source: docs/bmad/pianificazione/epics.md#functional-requirements]
- UX-DR5, la pillola di stato e di verdetto; UX-DR2, la regola di governo del colore; UX-DR11, i quattro stati — [Source: docs/bmad/pianificazione/epics.md#ux-design-requirements]
- «Tabella con nome, stato, tag, ultima attività, esito dell'ultima scheda» — [Source: docs/prd-v1.md#4-schermate]
- Il verdetto è un giudizio e non un calcolo, e nessun esito si suggerisce — [Source: docs/00-contesto-e-decisioni.md#d7]
- La pillola di verdetto, forma e token, come precisata il 10 agosto 2026 — [Source: docs/design-system.md#5-componenti]
- I tre inchiostri e perché `non deciso` non ne ha uno — [Source: docs/design-system.md#2-colore]
- L'ordine delle colonne dell'elenco e la tabella senza griglia — [Source: docs/design-system.md#5-componenti]
- Perché l'elenco non può copiare il calcolo dell'avanzamento — [Source: docs/database.md#3-tabelle]
- L'ultima attività, il calcolo in memoria e quando smette di valere — [Source: docs/database.md#5-ultima-attività-del-cliente]
- Il calcolo in memoria come precedente di metodo — [Source: docs/00-contesto-e-decisioni.md#d23]
- L'innesto senza `.limit()` sull'elenco clienti — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 1-6»]
- L'hover di riga contro il collegamento sul nome — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 1-1»]
- Le due letture della schermata iniziale attese in serie — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 1-7»]
- Il `block_id` non copiato dentro `answers`, e il numero che aspetta da sei story — [Source: docs/bmad/implementazione/deferred-work.md, sezione «code review of 3-2»]

### Domande per Luca — da chiudere prima di `dev-story`

Due. La prima è **condizionata a una misura** e decide che forma prende una schermata intera; la seconda decide se una voce del ledger si chiude qui. Nessun Task va eseguito indovinando: se restano aperte, l'implementazione si ferma e lo dice.

**Domanda 1 — Se cinque colonne non stanno in 375px, cosa cede?**

Il fatto: la tabella dell'elenco è `width: 100%` senza nessun contenitore che scorra, e l'unico punto responsivo del foglio è il `@media (max-width: 720px)` che tocca solo la struttura di pagina. A 375px restano **295px per cinque colonne**. La pillola `sì condizionato` è l'unica etichetta con uno spazio, quindi l'unica che può andare a capo dentro un `.pill` alto 22px fissi — e una pillola col testo che esce fa cadere AC3, che chiede «le stesse pillole della scheda».

**Il Task 5 misura prima.** Se `scrollWidth` resta 375 e la pillola resta alta 22, questa domanda non si esegue e si scrive il numero. Se no:

**A — la tabella cede scorrendo.** `white-space: nowrap` su `.pill`, più un contenitore con `overflow-x: auto` attorno alla tabella (non su `.card`). Prezzo: su telefono l'elenco si scorre di lato per vedere l'esito, e una regola tocca anche le pillole di stato — le cui cinque etichette sono parole singole, quindi senza conseguenze, ma va misurato invece che affermato.

**C — a schermo stretto una colonna si nasconde.** Una regola dentro il `@media` esistente. Prezzo: un dato sparisce dove serve di più, nessun documento lo prescrive, e va deciso **quale** colonna e se sparisce anche per chi legge con uno screen reader — `display: none` la toglie a tutti.

**Il default proposto è A**, per due motivi. Il primo: nascondere l'esito su telefono contraddice la ragione per cui questa story esiste — «scorro duecento righe e capisco dove sono senza aprirne nessuna» — e nascondere una **altra** colonna al posto suo sarebbe una decisione su un dato che nessuna story di questa epic sta guardando. Il secondo: A è reversibile e locale, C è una regola responsiva che vale per sempre su una schermata sola, e ne servirebbero altre il giorno che le colonne diventano sei. **Se il Task 5 misura pulito, la risposta giusta è «nessuna delle due».**

**Domanda 2 — La voce sulle due letture in serie si chiude qui?**

Il fatto: `deferred-work.md`, sezione «code review of 1-7», dice che due letture della schermata iniziale sono attese in serie pur non scambiandosi niente, e che la latenza si somma sulla schermata che si apre più spesso. La voce dichiara il proprio punto di ripresa: «**da chiudere quando si tocca comunque quel blocco**, o se la schermata iniziale diventa lenta». Questa story tocca quel blocco — cambia la `select` della prima delle due letture.

**La voce cita `clienti/page.tsx:68` e `:75`, e non sono più quelle righe:** oggi le due letture stanno a **`:58`** e **`:67`**. Il riferimento è scaduto come quello della voce dell'hover, e in entrambi i casi la deriva viene dalla Story 1.7, che ha spostato la tabella in un file suo. Vale in entrambe le varianti: chi la chiude o la annota corregge anche il numero, perché una voce che il primo grep smentisce non serve a niente.

**A — sì, si chiude.** Un `Promise.all` sulle due letture, che è una modifica di tre righe e non cambia nessun ramo d'errore: entrambe le letture hanno già la propria gestione a valle. La voce si chiude e si barra dicendo che il trigger dichiarato è arrivato. Prezzo: una modifica che nessuna AC chiede dentro una story che ne ha tre, cioè la forma che `AGENTS.md` chiama deriva del piano quando non è decisa prima — ed è per questo che si decide adesso.

**B — no, si annota.** Si scrive che il blocco è stato toccato e la voce non è stata chiusa, col motivo e col nuovo punto di ripresa. Prezzo: il trigger che la voce si era data si è avverato senza produrre niente, e una voce il cui trigger si consuma in silenzio non scatterà più.

**Il default proposto è A**, perché il punto di ripresa non è generico — la voce ha scelto *questa* condizione, e la condizione è arrivata. Se Luca preferisce B, quello che non va fatto è annotarla senza dire che il trigger è passato: è esattamente il modo in cui una voce diventa invisibile.

---

### Risposte di Luca, 11 agosto 2026, prima di `dev-story`

**Domanda 1 → A**, e resta **condizionata alla misura del Task 5**. La variante è scelta, non l'esecuzione: se `scrollWidth` resta 375 e la pillola resta alta 22, il Task 6 **non si esegue** e si scrive il numero che lo dimostra. Se la misura rompe, si applica A e solo A — `white-space: nowrap` su `.pill` accanto alla regola esistente, più un contenitore con `overflow-x: auto` attorno alla tabella, con un nome suo e **mai** su `.card`. La variante C non si esegue in nessun caso, e le sue caselle nel Task 6 sono da leggere come chiuse in partenza.

Due cose che la scelta di A porta con sé e che non vanno lasciate implicite. La prima: la regola su `.pill` tocca anche le pillole di stato del cliente, e la casella che chiede di **misurare** `offsetHeight` di una pillola di stato prima e dopo non è una formalità — è l'unica cosa che distingue «le cinque etichette sono parole singole quindi non cambia niente» da una verifica. La seconda: A fa scorrere l'elenco di lato su telefono, ed è un comportamento nuovo su una schermata che oggi non scorre. Va misurato e scritto, non solo ottenuto.

**Domanda 2 → A.** La voce sulle due letture in serie si **chiude e si barra** con questa story: `Promise.all` sulle due letture di `clienti/page.tsx`, oggi a `:58` e `:67`. Il trigger che la voce si era data — «da chiudere quando si tocca comunque quel blocco» — è arrivato, e una voce che sceglie *quella* condizione e poi la lascia passare non scatterà più.

Il perimetro della chiusura è stretto e va rispettato: **le due `await` diventano una**, e nient'altro. I due rami d'errore restano dove sono e come sono — `error` della prima lettura governa lo stato d'errore della schermata, `tagsError` della seconda si limita a un `console.error` e la pagina va avanti — perché quella asimmetria è una decisione della 1.7 con il suo motivo scritto accanto (`page.tsx:71-78`), e non è quello che questa voce chiude. Se il `Promise.all` costringesse a toccare un ramo d'errore, **fermarsi e dirlo**: vorrebbe dire che la modifica non è quella che la voce descriveva.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), tramite Claude Code, 11 agosto 2026.

### Debug Log References

Nessun difetto in volo da registrare: nessun test rosso oltre a quello atteso della fase rossa, nessuna correzione a cascata, nessun `HALT`. Le uniche cose interessanti sono misure, e stanno qui sotto.

**La misura del Task 5, sulla riproduzione statica servita in locale con il `globals.css` vero e i due font Geist.** Tutti i numeri da `getComputedStyle`, `getBoundingClientRect` e `documentElement.scrollWidth`.

**Il rilevatore che la story proponeva non funziona, e questa è la scoperta che ha cambiato il resto.** Il Task 5 dice «si misura `offsetHeight` della pillola: se è più di 22, la pillola è rotta». Non può esserlo mai: `.pill` ha `height: 22px` **fissa**, quindi un'etichetta che va a capo non fa crescere la pillola — esce da sotto e il testo si legge fuori dal proprio fondo colorato, con `offsetHeight` fermo a 22. Il rilevatore vero è il numero di righe di testo, preso con `Range.getClientRects()` sul contenuto della pillola.

Con quello, a 375px e **prima** di questa story: `sì condizionato` occupava **due** righe di testo — rettangoli a `top` 357 (largo 9,4, cioè `sì`) e `top` 381 (largo 71,9, cioè `condizionato`) — dentro una pillola alta 22. AC3 cadeva, e nessuna misura di altezza lo avrebbe detto. `non deciso`, che pure ha uno spazio, stava su una riga sola. Con `white-space: nowrap`: una riga, larghezza 104,2. Le altre otto etichette sono parole singole e non cambiano — la pillola di stato `potenziale` misura **90,6 × 22 prima e 90,6 × 22 dopo**, che è la misura che la risposta alla Domanda 1 chiedeva esplicitamente di fare invece di affermare.

**Le due premesse della Domanda 1 erano false, e sono state portate a Luca prima di eseguire il Task 6.** Numeri a `clientWidth` 375:

| caso | `documentElement.scrollWidth` |
|---|---|
| quattro colonne, **prima** di questa story | **465** |
| cinque colonne, senza variante | 581 |
| cinque colonne + `nowrap` | 593 |
| cinque colonne + `nowrap` + contenitore che scorre | **593**, invariato |
| cinque colonne + `nowrap` + contenitore + `min-width: 0` su `.main` | **375** |

Cioè: (1) l'elenco **scorreva già di lato a 375px prima di questa story**, contro quello che la Domanda 1 dava per scontato («un comportamento nuovo su una schermata che oggi non scorre»); (2) il contenitore con `overflow-x: auto` **da solo non fa niente**, perché il traboccamento nasce da `.main`, che è una cella di griglia di `.shell` con `min-width: auto` e prende come larghezza minima il contenuto più largo che porta. Un contenitore che scorre non riduce la larghezza minima di un blocco in flusso normale: quella riga la riduce solo `min-width: 0` sulla cella di griglia.

**Terzo fatto, e non era previsto in questi termini: lo scheletro di caricamento era una regressione vera.** Da solo a 375px, con quattro tracce misura esattamente **375** — entra al pixel — e con la quinta traccia esce a **444**. Il Task 4 lo aveva anticipato in una riga condizionale («lo scheletro gli sta dentro come la tabella»), e la misura l'ha resa non condizionale.

**Decisione di Luca dell'11 agosto 2026, presa su questi numeri: variante A completa, `min-width: 0` su `.main` compreso.** Stato finale misurato a 375px: pagina **375** nei tre casi — tabella sola, scheletro solo, entrambi — con la tabella che scorre dentro i propri 295 visibili su 514 di contenuto e lo scheletro dentro 295 su 364. A 1280px nessuno dei due contenitori scorre (920 su 920) e la pagina è 1280 su 1280.

**AC3, i numeri della pillola dentro la tabella** (misurati a 1280, dove nessun contenitore interferisce): altezza **22**, raggio **999px**, padding **0 10**, corpo **12px**, peso **500**, una riga di testo per tutte e quattro. I fondi e gli inchiostri coincidono con i token e non sono stati riscritti da nessuna parte:

| pillola | fondo reso | token | inchiostro reso | token |
|---|---|---|---|---|
| sì | `rgb(223,243,233)` | `--ok-tint` `#DFF3E9` | `rgb(13,124,82)` | `--ok-ink` `#0D7C52` |
| sì condizionato | `rgb(251,237,212)` | `--warn-tint` `#FBEDD4` | `rgb(152,95,9)` | `--warn-ink` `#985F09` |
| no | `rgb(251,230,225)` | `--bad-tint` `#FBE6E1` | `rgb(187,64,46)` | `--bad-ink` `#BB402E` |
| non deciso | `rgb(237,233,226)` | `--neutral-tint` `#EDE9E2` | `rgb(88,82,75)` | `--ink-muted` `#58524B` |

**AC2 a schermo:** la cella del cliente senza schede ha `innerHTML` **stringa vuota** — nessun trattino, nessuno spazio, nessun fondo — e resta alta **56** come la riga, che resta anch'essa 56. La colonna non collassa e le intestazioni restano allineate.

**Le sonde SQL**, in una transazione annullata, con `set local role authenticated` e i claims dell'unico proprietario. Il rollback è stato verificato ricontando dopo: 1 scheda, 24 risposte, 3 clienti, invariati.

- **AC2 a database:** clienti senza nessuna scheda, contati con la stessa `left join` che l'innesto produce → **2 su 3**.
- **AC1 a database:** inserita nella transazione una seconda scheda sullo stesso cliente con `call_date` `2026-08-11` e verdetto `si`, la terna `order by call_date desc, created_at desc, id` sceglie **quella** (`si`, 2026-08-11) e non la preesistente.
- **Il pareggio:** inserita una terza scheda con la **stessa** `call_date` `2026-08-10` della preesistente e verdetto `no`, fra quelle due vince quella con `created_at` più recente → **`no`**. Ordine completo delle tre: `si/2026-08-11 > no/2026-08-10 > non_deciso/2026-08-10`.

**La forma PostgREST dell'innesto allargato**, provata con la chiave pubblicabile e senza sessione, che è l'unica cosa che né `build` né `typecheck` verificano: la `select` vera risponde **200** con **`[]`** — la sicurezza a livello di riga filtra tutto, che è la risposta giusta senza sessione — e una colonna inventata dentro l'innesto risponde **`42703`**, «column **`assessments_1`**.colonna_inventata does not exist», che è la prova che il join viene generato davvero invece di essere ignorato.

**I grep di perimetro, coi numeri dichiarati prima.**

- **L'elenco non legge `answers`**: `grep -n "answers\|countAnswered\|assessment-progress"` sui due file dell'elenco dà **una riga sola, ed è prosa** — `page.tsx:40`, il commento che spiega perché `answers` *non* si legge; `clients-table.tsx` non ne ha nessuna. *(Il numero dichiarato prima della revisione era «due righe»: ricontato l'11 agosto 2026, è una. La condizione che contava — nessuna lettura di `answers` — regge lo stesso.)* Fuori dai commenti: **zero**. Le due `select` della schermata sono `id, name, status, tags, updated_at, assessments(...)` e `tags`, e nessuna delle due nomina `answers`.
- **Nessuna pillola riscritta**: `grep -rln "pill--verdetto\|VERDICT_LABELS" src/` dà **cinque** file, non i quattro che il Task 9 prevedeva — `globals.css`, `verdict.ts`, `verdict.test.ts`, `verdict-pill.tsx` e **`verdict-field.tsx`**. Il quinto è preesistente e non è una pillola: è il selettore del verdetto della Story 3.5, che usa `VERDICT_LABELS` per le proprie `<option>`, e `git status` conferma che non è stato toccato. La condizione che contava — nessun file **nuovo** fra questi — regge: l'unico file nuovo di questa story, `latest-verdict.ts`, non compare.
- **Solo righe preesistenti fuori dai file dichiarati**: i file che nominano `verdict` sotto `src/` sono **17**, e quelli modificati sono **quattro** — `clients-table.tsx`, `page.tsx` e i due nuovi. `git status` non riporta nessun altro file di `src/` toccato.

### Completion Notes List

- **AC1** — `latestVerdict` sceglie la scheda con la stessa terna della card del cliente (`call_date` decrescente, `created_at` decrescente, `id` crescente), copiata deliberatamente da `clienti/[id]/page.tsx:112-114`. Il risultato è l'invariante verificabile a occhio che la story chiedeva: **l'esito nella riga dell'elenco è l'esito della prima riga nella card del cliente**. Provata a database sulle tre schede della sonda.
- **AC2** — `latestVerdict` risponde `null` sull'elenco vuoto, e la cella rende `null`, cioè un `<td>` senza contenuto: nessun trattino, nessuno zero, nessun segnaposto. Il valore di ripiego che avrebbe reso AC2 falsa senza rompere niente non esiste in nessun punto della catena; il test dell'elenco vuoto è il primo del file e c'è dal primo momento. Osservabile oggi su dati veri: due clienti su tre.
- **AC3** — la pillola si **importa**, non si riscrive: `VerdictPill` da `src/components/verdict-pill.tsx`, che dal 10 agosto porta scritto sopra «la card del cliente e l'elenco la renderanno». Questa story è la seconda metà di quella frase, e non c'era nessuna decisione da prendere — c'era una previsione da chiudere. Forma e colori misurati e coincidenti coi token.
- **Le due domande sono state eseguite come le risposte prescrivevano, e una ha prodotto una terza domanda.** Domanda 2 → A: le due `await` sono diventate una `Promise.all` e **nient'altro**; i due rami d'errore non sono stati toccati e restano asimmetrici, quindi non si è verificato il caso in cui la story chiedeva di fermarsi. Domanda 1 → A: la misura del Task 5 **non è risultata pulita**, quindi il Task 6 si è eseguito; ma poiché due premesse della domanda si sono rivelate false e il rimedio che restava toccava `.main`, cioè una regola di ogni schermata, la cosa è stata portata a Luca invece di essere decisa — ed è la scelta che la story prescrive («se durante l'implementazione sembra necessario aprirne uno, fermati e dillo»).
- **`.main { min-width: 0 }` è l'unica riga di questo lavoro che vale fuori dall'elenco**, ed è stata misurata solo sull'elenco. Il residuo è a ledger con il punto di ripresa alla Story 5.2 e con la forma di misura da usare.
- **Ledger: 1 voce nuova, 2 annotazioni, 1 chiusa e barrata**, contro le «due annotazioni e una voce chiusa» che la story prevedeva. Lo scostamento è la voce nuova, e il motivo è quello del punto qui sopra. La quarta voce da rileggere — il `block_id` non copiato dentro `answers` — **non ha ricevuto l'annotazione, e la condizione era esplicita**: si annota «solo se i numeri cambiano». Non sono cambiati: **24 righe di `answers`, 0 con contenuto**, identici a quelli con cui la story è stata scritta, e le sonde di questa story sono girate tutte in transazioni annullate. È il settimo giro in cui quel numero non arriva, ed è scritto qui invece di essere ripromesso.
- **Nessuna migrazione, nessuna server action, nessuno schema toccato.** `migrations.test.ts` non cresce: sedici migrazioni a registro, invariate.
- **Test: 237, come dichiarato prima di eseguire** — 229 della baseline più gli 8 di `latest-verdict.test.ts`. Il caso che vale più di tutti è quello dell'ordine dell'array in ingresso: ogni prova di scelta passa lo stesso elenco nei due versi e pretende lo stesso risultato, perché PostgREST non garantisce l'ordine delle righe innestate e un `latestVerdict` che rispondesse «l'ultima dell'array» passerebbe qualsiasi test scritto con un ordine solo.

### File List

```
src/lib/latest-verdict.ts                                    NUOVO — latestVerdict, e null quando non ci sono schede
src/lib/latest-verdict.test.ts                               NUOVO — 8 prove: elenco vuoto, i due pareggi, l'ordine d'ingresso
src/app/(app)/clienti/page.tsx                               MODIFICA — quattro colonne nell'innesto che c'era già, e Promise.all sulle due letture
src/app/(app)/clienti/clients-table.tsx                      MODIFICA — il tipo, l'intestazione Esito, la cella, il contenitore che scorre, il commento corretto
src/app/(app)/clienti/loading.tsx                            MODIFICA — la quinta traccia, il quinto rettangolo a 68, lo stesso contenitore della tabella
src/app/globals.css                                          MODIFICA — white-space:nowrap su .pill, .table-scroll nuova, min-width:0 su .main
docs/database.md                                             MODIFICA — §3, la frase «legge il solo verdict»
docs/design-system.md                                        MODIFICA — §5, il cedimento della tabella (dalla revisione)
docs/bmad/implementazione/deferred-work.md                   MODIFICA — 2 voci nuove (1 dalla revisione), 2 annotazioni, 1 chiusa
docs/bmad/implementazione/sprint-status.yaml                 MODIFICA — 4-2 da backlog a review (non da ready-for-dev: la creazione della story non aveva aggiornato il file)
docs/bmad/implementazione/4-2-vedere-l-esito-nell-elenco-clienti.md   MODIFICA — caselle, Dev Agent Record, Change Log, Status
```

## Verifica di sessione

_(le caselle che richiedono una sessione vera; le passa Luca, e sono quelle che portano la story a `done`)_

- [ ] Apro l'elenco clienti: le **due** righe dei clienti senza schede hanno la colonna esito **vuota** — non `non deciso`, non un trattino, non uno spazio con un fondo (AC2). *Da annotare col numero di righe vuote viste.*
- [ ] La riga del cliente che ha una scheda mostra la pillola `non deciso`, cioè la stessa che vedo aprendo la sua scheda cliente (AC1, AC3).
- [ ] Apro la scheda, scrivo verdetto `sì`, torno all'elenco: la pillola nella riga è diventata `sì`, verde chiaro, **senza ricaricare a mano**.
- [ ] Confronto le due schermate: l'esito nella riga dell'elenco è quello della **prima** scheda nella card del cliente. *È l'invariante che prova la terna d'ordine, e vale fino al millisecondo: due schede create nello stesso millisecondo le separa l'`id` qui e i microsecondi là (revisione dell'11 agosto 2026).*
- [ ] Apro una seconda scheda sullo stesso cliente con una `call_date` più recente e un verdetto diverso: l'elenco mostra **quello nuovo** (AC1). *Da annotare coi due verdetti, prima e dopo.*
- [ ] Guardo l'elenco su schermo stretto (telefono o finestra a 375px): la pillola resta alta 22 col testo dentro, e la pagina si comporta come deciso nella Domanda 1.
- [ ] Sempre a 375px, **con la sola tastiera**: tabulando arrivo al contenitore della tabella e le frecce lo scorrono fino a scoprire la colonna esito. *Casella nata dalla revisione dell'11 agosto 2026, che ha trovato il contenitore fuori dall'ordine di tabulazione.*
- [ ] Guardo l'elenco mentre carica (rete lenta o ricarica dura): lo scheletro ha **cinque** colonne e all'arrivo dei dati la tabella non salta.
- [ ] Conteggio di `answers` e di quante righe hanno contenuto, da scrivere qui col numero: lo aspetta da sei story la voce del `block_id` a ledger. Se questa verifica non scrive risposte, si scrive **quello**, invece di rimandarlo una settima volta.

## Change Log

| Data | Cosa |
|---|---|
| 11 agosto 2026 | Story creata, `ready-for-dev`. |
| 11 agosto 2026 | Domande chiuse: **1 → A** (variante `nowrap` più contenitore che scorre, ma l'esecuzione resta condizionata alla misura del Task 5; la variante C è chiusa in partenza), **2 → A** (il `Promise.all` entra in questa story e la voce a ledger sulle due letture in serie si chiude e si barra). Conseguenze applicate ai Task 2, 6 e 7 e alla tabella dei file. |
| 11 agosto 2026 | Implementata. `latest-verdict.ts` nuovo con 8 prove, quattro colonne dentro l'innesto che c'era già, quinta colonna nella tabella, scheletro a cinque tracce, `Promise.all` sulle due letture. 237 test verdi (229 + 8), `typecheck` e `build` puliti, nessuna migrazione. |
| 11 agosto 2026 | La misura del Task 5 **non è risultata pulita** e ha smentito due premesse della Domanda 1: la pillola `sì condizionato` andava davvero a capo a 375px (rilevata con le righe di testo, perché `offsetHeight` non può vederlo su un'altezza fissa), l'elenco **scorreva già di lato** prima di questa story (465px su 375), e il contenitore con `overflow-x: auto` da solo non cambiava niente. Decisione di Luca sui numeri: **variante A completa**, con `min-width: 0` su `.main`. Stato finale a 375px: pagina 375, tabella e scheletro che scorrono dentro i propri 295. |
| 11 agosto 2026 | Ledger: 1 voce nuova (`.main { min-width: 0 }` vale per ogni schermata e ne è stata misurata una, ripresa alla 5.2), 2 annotazioni (innesto senza `.limit()`, hover di riga coi riferimenti corretti), 1 chiusa e barrata (le due letture in serie). La voce del `block_id` non è stata annotata perché i numeri non sono cambiati: 24 risposte, 0 con contenuto. |
| 11 agosto 2026 | Code review, tre strati in parallelo: 8 `[Patch]` applicate, 1 `[Defer]` a ledger, 6 reperti scartati. Un solo rilievo nel comportamento — il contenitore che scorre non entrava nell'ordine di tabulazione, quindi a 375px la colonna nuova era irraggiungibile da tastiera: risolto con `tabIndex`, `role` e nome accessibile. Gli altri sette sono prosa: quattro riferimenti di riga morti scritti dal Task 7 (uno ucciso dalle dieci righe che questa story aggiunge sopra la regola citata), il rimedio `.limit(1)` non più applicabile con due consumatori dell'innesto, `updated_at` omesso dalla frase di `database.md`, `design-system.md` che non sapeva del cedimento della tabella, tre commenti dichiarati e non scritti, due numeri del Dev Agent Record, e il limite ai millisecondi dell'invariante con la card. |
