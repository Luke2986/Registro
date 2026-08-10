---
baseline_commit: 4adbe57
---

# Story 3.4: Riprendere una scheda interrotta

Status: review

Epic: 3 — Una call intera dentro lo strumento
Data di creazione: 9 agosto 2026

> **Baseline.** La Story 3.3 è implementata, revisionata e chiusa: `4adbe57` su `main`, albero pulito. Tutti i conteggi di questo file — righe, test, grep, stato del database — sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati il 9 agosto 2026: **190 test verdi**, `npm run typecheck` senza uscita, quindici migrazioni a registro tutte col prefisso, **3 clienti, 1 persona, 0 schede, 0 risposte, 1 questionario, 9 blocchi, 24 domande tutte attive**.
>
> Zero schede e zero risposte **non** vogliono dire che la 3.3 non sia stata verificata: la sua sessione ha lasciato il database identico alla partenza, e la story lo dichiara. Il conteggio, non la data, è la sola cosa da guardare.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want ritrovare la scheda esattamente dove l'avevo lasciata,
so that una call interrotta o un browser chiuso di colpo non mi costano il lavoro fatto.

## Acceptance Criteria

**AC1 — quello che è stato scritto si ritrova**
**Given** una scheda con tre campi compilati
**When** chiudo il browser di colpo e riapro la scheda
**Then** ritrovo i tre campi compilati (criterio di accettazione 3 del PRD, FR21)

**AC2 — la scheda vecchia non si rende col questionario di oggi**
**Given** una scheda parzialmente compilata
**When** la riapro
**Then** l'ordine delle domande è quello fissato all'apertura, non quello del questionario di oggi

**AC3 — riaprendo si riprende a scrivere, e il salvataggio riparte**
**Given** una scheda riaperta
**When** riprendo a scrivere
**Then** il salvataggio automatico riparte come prima, senza dover ricaricare la pagina

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **I tre criteri sono già veri nel meccanismo, e la loro implementazione è già in piedi.** La 3.1 congela l'ordine dentro `answers`, la 3.2 rende la scheda da quelle copie senza mai toccare il questionario, la 3.3 fa persistere il contenuto. Il rendering del contenuto salvato **non è il lavoro di questa story**: entrambe le story precedenti lo dicono per iscritto, con la stessa frase — *«Nessuna ripresa esplicita né conferma di ripristino: Story 3.4. Che il campo si renda col suo `content` è lettura, e c'è già dalla 3.2»*.
>
> **Quindi non inventare una ripresa.** Nessun banner «hai una scheda in sospeso», nessuna conferma di ripristino, nessuna bozza locale in `localStorage`, nessun `useEffect` che ricarichi, nessuna schermata nuova, nessuna migrazione. Chi legge «riprendere una scheda» e costruisce un meccanismo di ripresa ha costruito una funzione che il prodotto non ha chiesto e che duplica quello che il database già fa.
>
> **Quello che questa story fa davvero sono tre cose.** **(1)** Prova i tre criteri invece di dedurli — due dei tre non sono mai stati provati su una scheda che esiste, perché di schede non ne è mai rimasta nessuna. **(2)** Chiude il buco per cui il salvataggio all'uscita dal campo **non parte** se una scrittura è già in volo, che è testualmente «una call interrotta mi costa il lavoro fatto» e che `deferred-work.md:18` tiene aperto dal 3 agosto. **(3)** Copre la finestra fra l'ultima battuta e i tre secondi con un salvataggio al passaggio in secondo piano — che **non** è il `beforeunload` rifiutato il 9 agosto, e la differenza è tutto il punto.
>
> **Le due decisioni sono di Luca, prese il 9 agosto 2026**, e stanno per esteso in **Dev Notes → «Domande per Luca»**. Il loro prezzo è dichiarato e non si sconta: `use-editable-field.ts` serve a quattro schermate e vanno riverificate tutte.
>
> **Non porta il verdetto** (3.5), **né lo stato di compilazione** (3.6), **né il contatore e la barra** (4.1), **né l'esportazione** (4.3), **né il trigger su `assessments.updated_at`** (4.1, `deferred-work.md:131`, che è la voce che questa story rischia più di tutte di raccogliere per errore, perché tocca `answers`, il salvataggio e la rivalidazione). Nessuna migrazione, e nessun file nuovo salvo il caso dichiarato in **Test**.

## Tasks / Subtasks

- [x] **Task 1 — Provare che l'ordine congelato regge davvero** (AC: 2)

  - [x] Nessuna riga di codice: AC2 è una proprietà dello schema e delle due query che lo leggono, e si verifica misurandola. Il meccanismo è già descritto in **Dev Notes → «L'AC2 è già vero, ed è provato»**, con l'esito delle due sonde già eseguite il 9 agosto 2026. **Rieseguirle** dopo ogni modifica di questa story, con lo stesso metodo: `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`, come la 3.3.
  - [x] Sonda A, il riordino: apri una scheda con `open_assessment`, fotografa le sue risposte con **la query esatta della pagina** (`order by position, id`), sposta due blocchi del questionario con `move_block(…, 'down')`, rileggi. Atteso: le righe sono identiche in posizione, titolo del blocco e testo, e l'ordine dei blocchi **nella scheda** diverge da quello del questionario di oggi.
  - [x] Sonda B, la riscrittura: sulla stessa scheda scrivi un `content`, poi riscrivi la domanda 1 cambiandole testo, tipo, opzioni e aiuto, disattiva la domanda 2, aggiungi una domanda nuova. Rileggi. Atteso: **24 righe prima, 24 dopo**, tutte le nove colonne identiche, `content` intatto, e la riga 1 della scheda porta il testo e il tipo **vecchi** mentre `questions` porta i nuovi.
  - [x] Se una delle due sonde dà un esito diverso da quello scritto in Dev Notes, **fermati e dillo**: vorrebbe dire che qualcosa fra il 9 agosto e oggi ha rotto la scelta centrale dello schema, ed è più grave di questa story.

- [x] **Task 2 — Il salvataggio all'uscita non si perde più dietro una scrittura in volo** (AC: 1, 3)

  - [x] Il difetto, per esteso, sta in `deferred-work.md:18` buco **(a)** e in **Dev Notes → «Trappole note»**. In `src/lib/use-editable-field.ts:185`, `onBlur` salva solo `if (autosave && dirty && !pending)`. Scrivendo, aspettando i tre secondi, e continuando a scrivere mentre la richiesta viaggia, l'uscita dal campo **non scrive niente**. Restando in pagina si sana da sé dopo altri tre secondi; navigando via in quella finestra il testo nuovo non parte mai.
  - [x] La voce del debito cita quella riga come `:183`: era vero quando è stata scritta, oggi è la **185**, verificata sulla baseline. Non è la stessa riga cambiata di senso, è il file che si è allungato di due righe di commento — ma conviene guardare il codice invece del numero, che è la ragione per cui il codice è citato per intero qui sopra.
  - [x] La correzione **non** è togliere `!pending` e lasciar partire una seconda scrittura sopra la prima: due `update` sulla stessa riga senza ordine garantito possono far vincere il testo vecchio, che è un danno peggiore di quello che si chiude. La forma è **ricordare che c'è un'uscita da onorare** — un `useRef` accanto a `waiting`, che `onBlur` accende quando si rifiuta per `pending` — e **spendere quel ricordo appena la scrittura in volo si risolve**, dentro il `.then` di `write`, chiamando `write(value)` invece di aspettare i tre secondi del timer.
  - [x] Il ricordo si azzera quando lo si spende, quando il campo riprende il fuoco, e in `cancel()`. Se al momento della risoluzione il campo non è più sporco — perché il server ha riallineato — non si scrive niente.
  - [x] **Quello che questa correzione non copre, e va scritto nel Dev Agent Record invece di lasciarlo credere chiuso:** lo smontaggio dentro quella stessa finestra. Se il componente sparisce prima che la scrittura in volo si risolva, non c'è più nessuno a spendere il ricordo. Resta il buco **(b)** della stessa voce — un fallimento dopo lo smontaggio esce su `!alive` e nessuno lo dice — che è un problema di *segnalazione* e non di *perdita*, e che non si chiude qui perché dopo lo smontaggio non esiste più nessun posto dove segnalare.
  - [x] **`use-editable-field.ts` serve a quattro schermate, non a una.** I consumatori sono `answer-field.tsx`, `client-field-form.tsx`, `person-field-form.tsx`, `block-title-form.tsx` — verificato con `grep -rn "useEditableField" src/`, quattro risultati oltre al file stesso. Il Task 6 li riverifica tutti: è la ragione per cui la 3.3 aveva rimandato questa correzione, e non si aggira.

- [x] **Task 3 — La finestra fra l'ultima battuta e i tre secondi** (AC: 1)

  - [x] Un ascoltatore su `document`, evento `visibilitychange`, che quando `document.visibilityState === 'hidden'` fa esattamente quello che fa l'uscita dal campo: `if (autosave && dirty && !pending) write(value)`. Registrato e tolto in un effetto suo, con le sue dipendenze. **Dentro l'hook e non in `answer-field.tsx`**, per decisione di Luca del 9 agosto 2026: una copia della stessa decisione fuori dal posto dove vive la macchina del salvataggio è la «duplicazione silenziosa» di `kb-0.md` §9.
  - [x] Se il Task 2 è già in piedi, il ricordo dell'uscita rifiutata vale anche qui: la pagina che passa in secondo piano mentre una scrittura è in volo accende lo stesso ricordo invece di non fare niente. Le due correzioni si incontrano in quel punto, e vanno scritte in modo che non si scavalchino.
  - [x] **Non è il `beforeunload` che Luca ha rifiutato il 9 agosto**, e la differenza va tenuta ferma perché è tutto il motivo per cui la domanda si riapre: `beforeunload` fa comparire una finestrella del browser, e i due motivi del rifiuto erano quella finestrella e `design-system.md` §5, «nessun avviso a comparsa». `visibilitychange` non mostra niente, non chiede niente, non ferma niente: fa partire una scrittura e basta. Nessuno dei due motivi lo tocca.
  - [x] Copre la scheda del browser che passa in secondo piano, l'applicazione che va via sul tablet, e — sulla maggior parte dei browser — la chiusura. **Non è una garanzia**: la richiesta parte, e se il browser chiude il processo prima che sia uscita, non arriva. Va scritto così nel Dev Agent Record, senza promettere di più: `deferred-work.md:18` esiste perché una promessa più larga del vero è stata già scritta una volta e corretta lo stesso giorno.
  - [x] Vale su tutte e quattro le schermate che usano l'hook, non solo su questa. È un guadagno, non un effetto collaterale — ma va dichiarato, e la scheda cliente va riprovata (Task 6).

- [x] **Task 4 — Che non ci siano regressioni sull'ordine e sulle copie** (AC: 2)

  - [x] Nessun test nuovo su `answer-groups.ts`: i cinque casi che ci sono coprono già le corse consecutive, i blocchi omonimi non adiacenti e l'ordine dentro il gruppo. **Verificare** che ci siano ancora e passino, non aggiungerne per fare numero.
  - [x] Grep di perimetro, coi numeri attesi dichiarati **prima** di eseguirli, misurati sulla baseline il 9 agosto 2026: `grep -rn "from('questions')\|from('question_blocks')" "src/app/(app)/clienti/"` → **zero righe**. La schermata di compilazione non deve leggere il questionario da nessuna parte, mai, ed è la forma eseguibile dell'AC2.
  - [x] `grep -n "order(" "src/app/(app)/clienti/[id]/schede/[assessmentId]/page.tsx"` → **tre righe**: la 89 e la 90, che sono le due vere — `position` poi `id` — e la 77, che è il commento che spiega perché ce ne vogliono due. Il secondo `order` non è ornamento: `answers_assessment_position_idx` è un indice normale e non unico, e un `order by` su una colonna sola non definisce nessun ordine a parità di valore. **Se le righe vere diventano una, l'AC2 è rotto in un modo che nessun test coglie.**

- [x] **Task 5 — Il debito che questa story apre o sposta** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera, perché è il file che tiene la memoria di quello che si è scelto di non fare. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 3-4-riprendere-una-scheda-interrotta (9 agosto 2026)`, appesa **in fondo** al file. Una story può aprire due sezioni, implementazione e code review, come hanno fatto la 2.2, la 3.1 e la 3.3.
  - [x] Forma di una voce nuova, un bullet solo per quanto lungo: **titolo in grassetto che dice il difetto e non il rimedio** — `percorso/file.ts:righe`, poi la prosa su cosa succede e cosa lo rende raggiungibile o no, poi `Rimandato:` o `Rimandato per decisione di Luca del <data>:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**: una story numerata o un evento contabile, mai un generico «più avanti».
  - [x] **Una voce esistente non si riscrive: le si appende in coda un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 3.4, il 9 agosto 2026**:`, oppure `**Correzione…**`, `**Estesa…**`, `**Esito…**` secondo cosa si sta facendo. E se un'annotazione precedente si scopre falsa, si corregge **in vista**, citandone il testo fra virgolette invece di cancellarlo: i due precedenti sono nelle voci 7 e 18, entrambi del 9 agosto.
  - [x] **La barratura è solo per una voce chiusa per intero**, `~~` fuori dal grassetto e sul solo titolo, con la voce che resta in posizione e il testo originale intatto. Il preambolo del file dice «si cancellano solo quando sono chiuse», ma nessuna delle dieci voci chiuse è mai stata cancellata: **si segue la pratica, non la lettera**.
  - [x] La voce **1.2 riga 18** è quella che questa story tocca più da vicino, e va annotata con tre cose: che il buco **(a)** è chiuso dal Task 2 e **cosa resta scoperto** (lo smontaggio dentro la stessa finestra, e il buco **(b)**); che la finestra dei tre secondi è ora coperta dal Task 3 *per quanto un `visibilitychange` possa coprirla*, senza promettere di più; e che il **`beforeunload` resta rifiutato**, con i suoi due motivi, perché la decisione del 9 agosto sul `visibilitychange` non lo riapre. **Non si barra**: la voce resta aperta.
  - [x] La voce **3.2 riga 127** — `block_id` non copiato dentro `answers` — dice che «la finestra gratuita si chiude alla prima scheda che Luca compila e tiene», e che va contato invece che dedotto dalla data. Questa è la prima story la cui verifica manuale **richiede** che le righe restino. **Ricontare `answers` alla fine della sessione** e annotare il numero: se restano righe, la finestra è chiusa e chi riprende la voce deve leggere il costo `not null` senza riempimento come scaduto.
  - [x] Nel File List la riga prende la forma già usata dalla 3.3: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni`.

- [x] **Task 6 — Verifica** (AC: 1, 2, 3)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi restano **190** se non se ne aggiungono; se dal Task 2 o dal 3 nasce un modulo puro, il numero cresce e va dichiarato in anticipo.
  - [x] Riesecuzione delle due sonde del Task 1, con gli esiti riportati nel Dev Agent Record.
  - [x] **Riverificare tutte e quattro le schermate che usano l'hook**, non solo la compilazione: il campo lungo e il campo corto della scheda cliente, i campi della persona, il titolo del blocco nel questionario. Un salvataggio all'uscita che smette di funzionare su una di quelle è una regressione che questa story avrebbe introdotto e **nessun test coglierebbe**. È il prezzo dichiarato delle due risposte «sì», e non si sconta.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione del 10 agosto 2026, tre strati in parallelo. Verificato a mano prima di assegnare la gravità: `npm test` dà **196 verdi**, `npm run typecheck` è muto, i due grep del Task 4 danno **zero** e **tre** righe, il perimetro dei dieci file intoccabili è rispettato, nessun `beforeunload`, nessuna bozza locale, nessuna migrazione, nessuna dipendenza.

- [x] [Review][Patch] *(era una decisione: Luca ha scelto di correggere, il 10 agosto 2026)* **`save()` non ricorda l'uscita quando una scrittura è in volo, ed è l'unico dei tre percorsi che non lo fa** — `src/lib/use-editable-field.ts:192-194`. `save: () => { if (!pending) write(value) }` era già così, ma prima nessun percorso ricordava; ora `onBlur` e il `visibilitychange` ricordano e il gesto **esplicito** — il `Salva` della barra ancorata, il `Riprova` dell'indicatore — è il solo che si perde in silenzio. Sui campi lunghi si sana col timer; **sui campi corti no**, perché con `autosave` falso non c'è nessun timer e `onBlur` esce prima del ramo nuovo: scrivere `A`, premere `Salva`, correggere in `B` mentre la richiesta viaggia, premere `Salva` di nuovo e navigare via perde `B` senza nessun segnale. Il Task 2 prescrive però `onBlur` e basta, quindi estendere il ricordo a `save()` è un allargamento del perimetro, e il perimetro in questo progetto lo decide Luca. La correzione, se si fa, è di tre righe e ricalca quella già scritta: `if (pending) { owedExit.current = value; return }`.

- [x] [Review][Patch] **Il ricordo acceso dal `visibilitychange` non si azzera quando si riprende a scrivere, e può riscrivere sul server un testo già cancellato** [src/lib/use-editable-field.ts:205-210]. Trovato da tutti e tre gli strati. `owedExit` si azzera in `onFocus` e in `cancel()`, ma **non** in `onChange` — e il caso che il Task 3 esiste per coprire è proprio quello in cui il campo **non perde mai il fuoco**, quindi al ritorno in pagina nessun `focus` scatta. Sequenza: si scrive `risposta lunga`, il timer manda; si batte ` e ancora`; si cambia scheda del browser col fuoco dentro, e `:174` accende il ricordo su `risposta lunga e ancora`; si torna e si cancella l'ultima parte; la scrittura in volo si risolve e `shouldHonourExit` risponde `true`, perché confronta il ricordo con `sent` e con `saved` e mai con il valore vivo. Sul server torna il testo appena cancellato. Converge col timer tre secondi dopo, ma chiudere il browser dentro quella finestra lo fissa. Il percorso `onBlur` da solo non ha il difetto: è il Task 3 a renderlo raggiungibile. Correzione: azzerare `owedExit` in `onChange`, che è la stessa regola di `onFocus` — una battuta nuova supera il ricordo.

- [x] [Review][Patch] **`shouldHonourExit` dichiara un predicato di tipo che non rispetta** [src/lib/owed-exit.ts:28]. `owed is string` promette al compilatore che un `false` implica `owed === null`, mentre la funzione risponde `false` anche con `owed` stringa (righe 33 e 37). Oggi non fa danno — al richiamo di `use-editable-field.ts:134` non c'è nessun ramo `else` — ma è una restrizione falsa che il primo `else` scritto sopra userebbe. Il commento a `:21-22` la giustifica per evitare un `as`, che `kb-0.md` §2 non vuole: un `as` però si vede in revisione, e questo no. Correzione senza `as` e senza bugia: firma `boolean` con `owed: string`, e al richiamo `if (owed !== null && shouldHonourExit(owed, next, outcome.saved))`. Il primo caso di `owed-exit.test.ts:6-8` si sposta di conseguenza.

- [x] [Review][Patch] **Il File List dichiara una transizione di stato che non è quella avvenuta** [docs/bmad/implementazione/3-4-riprendere-una-scheda-interrotta.md:404]. Scrive `3.4 da ready-for-dev a review`, ma alla baseline il valore era `backlog`: `git show HEAD:docs/bmad/implementazione/sprint-status.yaml` riga 75 dà `3-4-riprendere-una-scheda-interrotta: backlog`.

- [x] [Review][Patch] **La voce nuova di `deferred-work.md` non porta il localizzatore di riga che il Task 5 prescrive** [docs/bmad/implementazione/deferred-work.md:145]. La forma dichiarata è «titolo in grassetto che dice il difetto e non il rimedio — `percorso/file.ts:righe`», e la voce scrive `` `src/lib/use-editable-field.ts`, l'effetto del `visibilitychange` `` senza numeri. Nella stessa voce il punto di ripresa — «nella passata che riallinea `useState(baseline)` con le sue due sorelle» — non è «una story numerata o un evento contabile». Precedenti per entrambe esistono nel file (voci 10, 14, 19, 48, 131), quindi è deviazione lieve, ma il Task 5 la nomina.

- [x] [Review][Patch] **Il commento del `visibilitychange` promette una scrittura che nel ramo `pending` non parte** [src/lib/use-editable-field.ts:161-166]. «Non mostra niente, non chiede niente e non ferma niente — fa partire una scrittura» è vero solo nel ramo `:178`. Con una scrittura già in volo (`:173-176`) si scrive un ref, e quel ref si spende solo se il componente è ancora montato (`:106`): alla chiusura della scheda non lo è. `deferred-work.md` lo dice giusto; il commento nel codice, che è quello che si rileggerà, no. Una clausola.

- [x] [Review][Defer] **Le due guardie nuove leggono `pending` da una chiusura che può precedere la resa** [src/lib/use-editable-field.ts:173, :240] — rimandato, stessa radice della guardia `attempted.current === value` già a debito.
- [x] [Review][Defer] **L'ascoltatore del `visibilitychange` si toglie e si rimette a ogni battuta** [src/lib/use-editable-field.ts:167-184] — rimandato, si chiude con la stessa modifica della voce qui sopra.
- [x] [Review][Defer] **`visibilitychange` da solo copre male la terminazione su iOS, che è il bersaglio dichiarato** [src/lib/use-editable-field.ts:181] — rimandato, `pagehide` allarga una decisione che nomina `visibilitychange` per nome.
- [x] [Review][Defer] **Nessun controllo automatico sulle regole degli hook** [package.json] — preesistente, non introdotto qui.

**Le sei correzioni sono state applicate il 10 agosto 2026, e la verifica è stata rifatta dopo:** `npm run typecheck` muto, **196 test verdi** — il numero non cambia, perché nessuna delle sei tocca un comportamento verificabile da un test puro — e `npm run build` con le nove rotte e nessun avviso. Le tre di codice stanno in `use-editable-field.ts` (il ricordo azzerato in `onChange`, `save()` che ricorda come gli altri due percorsi, la clausola del commento che prometteva una scrittura anche dove non parte) e in `owed-exit.ts` (`boolean` invece del predicato di tipo, con il `owed !== null` spostato al richiamo, dove restringe davvero). Le altre tre sono documentazione. **Le tre caselle comportamentali sulle altre schermate restano alla sessione**, e ora ne coprono una in più: il campo corto della scheda cliente e della persona è il posto dove la correzione a `save()` si vede o non si vede.

**Cinque rilievi scartati, e il motivo, perché scartare in silenzio è come non aver guardato.** *(1)* La ricorsione che azzera `setResult`/`setSaveState` della scrittura appena conclusa: la seconda scrittura porta testo **più recente** e il suo esito è quello autorevole, quindi l'esito soppiantato non è perso ma superato. *(2)* Lo smontaggio dentro la finestra della scrittura in volo: la story lo dichiara fuori copertura e l'annotazione alla voce 18 lo scrive. *(3)* La firma a tre stringhe posizionali di `shouldHonourExit`: scambiare `sent` e `saved` non compila, perché `saved` è `string | undefined` e `sent` è `string`. *(4)* «Costo a effetto zero» nella voce nuova letto come sottostima: la frase vuol dire «costo con effetto zero», che è quello che è. *(5)* Le 200 righe di `kb-0.md` §2 non registrate in `deferred-work.md`: la story le registra e il punto di ripresa è nominato (voce 136), e l'argomento del Dev Agent Record regge — il file esporta una cosa sola, l'unico pezzo separabile è già uscito in `owed-exit.ts`, e 72 delle 249 righe sono commento.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Tutta la macchina che serve ai tre criteri è in piedi da tre story. Elencata qui perché la trappola di questa story è costruire un doppione di qualcosa che già funziona.

| Cosa | Dove | Da quando |
|---|---|---|
| L'ordine di una scheda, congelato all'apertura | `answers.position`, copiata verbatim da `questions.position` | schema 0005, scritta da `open_assessment` (0013, riscritta dalla 0014 e dalla 0015) |
| Il testo della domanda e il titolo del blocco, congelati | `answers.question_text`, `answers.block_title` | schema 0005, «la scelta centrale dello schema» |
| Il tipo, le opzioni e l'aiuto, congelati anche loro | `answers.answer_type`, `options`, `help_text` | migrazione 0015, Story 3.2 — la promessa era applicata a metà |
| La lettura che rispetta l'ordine congelato | `page.tsx`, `.order('position').order('id')` | 3.2 |
| Il raggruppamento per blocco senza riordinare | `src/lib/answer-groups.ts`, con cinque test | 3.2 |
| Il campo che nasce col suo contenuto salvato | `answer-field.tsx`, `useEditableField({ baseline: content ?? '' })` | 3.2, poi 3.3 |
| La persistenza di quel contenuto | `answer-actions.ts`, `saveAnswer` | 3.3 |
| Il salvataggio automatico e l'indicatore | `use-editable-field.ts`, `save-store.ts`, `save-bar.tsx` | 3.3 |

Il collegamento da cui si riapre una scheda esiste anche lui, ed è sulla data: `assessments-card.tsx:121-126`, `<Link href={/clienti/${clientId}/schede/${assessment.id}}>`. Niente da aggiungere.

### L'AC2 è già vero, ed è provato

Non dedotto: misurato il 9 agosto 2026 sul progetto Supabase, in due transazioni annullate. Chi implementa le rilancia (Task 1) e riporta gli esiti; qui c'è cosa aspettarsi.

**Il meccanismo.** `open_assessment` (0015) copia dentro ogni riga di `answers` la posizione, il titolo del blocco, il testo, il tipo, le opzioni e l'aiuto **verbatim**, buchi di posizione compresi. La pagina rilegge quelle copie e **non tocca `questions` da nessuna parte**. Il questionario può quindi essere riordinato, riscritto, potato e allungato senza che una scheda già aperta se ne accorga.

**Sonda A — il questionario si riordina sotto.** Aperta una scheda (24 risposte, `total_questions` 24), spostati due blocchi con `move_block(…, 'down')`, che rinumera tutte e 24 le domande:

| | Ordine dei blocchi |
|---|---|
| Dentro la scheda, prima e dopo | `Contesto > Obiettivo > Costo di restare come si è > …` |
| Nel questionario, dopo il riordino | `Obiettivo > Costo di restare come si è > Contesto > …` |

`scheda_identica_dopo_il_riordino: true` — posizione, titolo del blocco e testo identici riga per riga. I due ordini **divergono**, ed è esattamente quello che l'AC2 chiede.

**Sonda B — la domanda si riscrive, si disattiva, se ne aggiunge una.** Sulla stessa scheda, con un `content` già scritto sulla riga 1: riscritta la domanda 1 (testo, tipo da `testo_lungo` a `scelta_singola`, opzioni, aiuto), disattivata la domanda 2, aggiunta una domanda nuova.

| | Valore |
|---|---|
| Righe prima / dopo | **24 / 24** |
| Tutte e nove le colonne identiche | **true** |
| Testo riga 1 nella scheda | `Quante persone siete e come vi dividete il lavoro?` |
| Testo riga 1 nel questionario oggi | `DOMANDA RISCRITTA OGGI` |
| Tipo riga 1 nella scheda | `testo_lungo` (non `scelta_singola`) |
| `content` riga 1 | intatto |

È anche la prova dei criteri **4 e 5** del PRD §6, che nessuna story aveva ancora misurato.

**Il limite noto, e non si chiude qui.** `answers.position` copia una posizione che può essere duplicata, se la scheda nasce dentro la finestra di rinumerazione fallita descritta in `database.md` §8. Con posizioni duplicate `.order('position').order('id')` dà comunque un ordine **definito e stabile** — arbitrario, ma sempre lo stesso — quindi l'AC2 regge alla lettera: l'ordine è quello fissato all'apertura. Che quell'ordine possa non essere quello dell'intervista è `deferred-work.md:120`, aperto dalla 3.1, e si chiude con la corsa della 2.2, non qui.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/use-editable-field.ts` | il ricordo dell'uscita rifiutata per `pending`, speso alla risoluzione | 2 |
| `src/lib/use-editable-field.ts` | l'ascoltatore `visibilitychange` quando la pagina passa in secondo piano | 3 |
| `docs/bmad/implementazione/deferred-work.md` | una voce nuova, e le annotazioni sulle voci 18 e 127 | 5 |

**Un file solo di codice, e serve a quattro schermate.** È il fatto che governa tutta la verifica di questa story: le due correzioni sono piccole, la superficie su cui possono rompere qualcosa non lo è.

**E basta.** Nessun altro file si apre. In particolare **non** si aprono: `page.tsx`, `answer-blocks.tsx`, `answer-field.tsx`, `choice-field.tsx`, `save-bar.tsx`, `save-boundary.tsx`, `save-store.ts`, `answer-actions.ts`, `globals.css`, `supabase/migrations/`. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**: quasi certamente vuol dire che si sta costruendo la ripresa che questa story non chiede.

### Trappole note

**1. Costruire una ripresa che non serve.** La più probabile, ed è nel titolo della story. «Riprendere» qui non è un'azione dell'utente: è una proprietà del dato. Non ci sono bozze locali da riconciliare, perché non esistono bozze locali — l'unica copia sta nel database, e la schermata la legge dal server a ogni caricamento.

**2. `useState(baseline)` non risincronizza, e non deve.** `use-editable-field.ts:60`. Quando la `revalidatePath` di un salvataggio riporta un `content` nuovo, `baseline` cambia e `value` no. È **voluto**: riscrivere una textarea sotto le dita toglie l'a capo appena battuto e manda il cursore in fondo. La conseguenza osservabile — `dirty` che torna vero su un campo già salvato, cioè `Salva` acceso a vuoto — è `deferred-work.md:19`, che si chiude con le sue due sorelle e non qui. **Chi «aggiusta» il riallineamento dentro questa story rompe la digitazione su quattro schermate.**

**3. Le chiavi React sono ciò che tiene in vita quello che è scritto.** `answer-blocks.tsx:29` usa `group.answers[0]?.id` per il blocco e `answer.id` per la voce. Dopo ogni `revalidatePath` arriva un albero nuovo e tutti e ventiquattro i campi si rendono di nuovo: sono le chiavi a fare la differenza fra una *resa* e un *rimontaggio*, e un rimontaggio azzererebbe `useState(baseline)` cancellando quello che si stava scrivendo. **Non toccarle.** Usare il titolo del blocco come chiave fonde due blocchi omonimi in silenzio.

**4. `run` deve restare dentro `useCallback`.** `answer-field.tsx:66`. L'hook mette `run` fra le dipendenze di `write` e `write` fra quelle dell'effetto che arma il timer: un `run` ricreato a ogni resa riarmerebbe il timer a ogni battuta e il salvataggio automatico potrebbe **non partire mai, senza nessun errore**. È dichiarata «la trappola più grossa di questa schermata».

**5. Il buco che il Task 2 chiude, e i due modi sbagliati di chiuderlo.** Togliere `!pending` fa partire due `update` sulla stessa riga senza ordine garantito: se vince il primo, il testo più vecchio sovrascrive il più nuovo, ed è un danno peggiore. Mettere un `await` dentro `onBlur` non esiste: un gestore di evento non trattiene la navigazione. La sola forma sicura è ricordare e spendere alla risoluzione.

**6. Il `.catch` che diventa `UNREACHABLE` non è cerimonia.** `use-editable-field.ts:95`. Senza, un rifiuto della promessa risale al confine d'errore, che sostituisce l'intera scheda e porta via quello che c'è scritto in tutti gli altri campi. È il motivo per cui questo file esiste invece di `useActionState`.

**7. Mai `details` nei log.** `answers.content` è quello che un cliente reale ha detto in una call, la categoria di dato più sensibile del sistema (`kb-0.md` §3 e §4). Solo `code` e `message`.

### La cache del router, e perché la `revalidatePath` resta dov'è

L'AC3 dice «senza dover ricaricare la pagina», quindi la cache del router del browser è la cosa che potrebbe smentirlo. La 3.3 ha lasciato la questione aperta per iscritto: *«se si dimostrasse superflua, il fatto si scrive e la chiamata si toglie, ma non prima»*.

**Due fatti nuovi, verificati il 9 agosto 2026 dentro `node_modules/next`, versione 16.2.12:**

- `experimental.staleTimes` vale di default `{ dynamic: 0, static: 300 }` — `dist/server/config-shared.js:242-244`;
- `experimental.cachedNavigations` vale di default `false` — `dist/server/config-shared.js:190`.

`next.config.ts` non sovrascrive nessuno dei due, e la rotta è dinamica: legge i cookie tramite il client Supabase. Un segmento dinamico è quindi considerato stantio subito e viene richiesto di nuovo a ogni navigazione in avanti.

**Non basta a togliere la chiamata, e non si toglie.** Il caso che l'AC3 descrive davvero è il ritorno indietro seguito da un rientro, che nel router segue una strada sua e che questi due valori non descrivono. La verifica di sessione della 3.3 ha passato quella casella **con la `revalidatePath` presente**, quindi quello che si sa è che funziona *così*, non che funzionerebbe senza. La regola della 3.3 vale ancora: si toglie quando si dimostra superflua, non prima. **Questa story non la toglie**, e la casella di sessione che potrebbe un giorno dimostrarlo è nell'elenco in fondo.

### Perimetro: cosa NON entra in questa story

- **Nessuna migrazione.** Lo schema regge i tre criteri già com'è, ed è provato sopra.
- **Nessuna schermata nuova, nessun banner, nessuna conferma di ripristino, nessuna bozza locale.**
- **Nessun `beforeunload`.** Resta rifiutato con i due motivi del 9 agosto, e la decisione sul `visibilitychange` non lo riapre: uno mostra una finestrella e chiede, l'altro fa partire una scrittura in silenzio.
- **Il verdetto** (3.5), **lo stato di compilazione** (3.6), **il contatore e la barra** (4.1), **l'esportazione** (4.3).
- **Il trigger che muove `assessments.updated_at` quando si salva una risposta** — `deferred-work.md:131`, punto di ripresa dichiarato: Story 4.1, insieme al contatore che è la prima cosa che cambia davvero quando si salva.
- **`block_id` dentro `answers`** — `deferred-work.md:127`, rimandato per decisione di Luca del 9 agosto 2026, confermato dalla 3.3.
- **Il buco (b) di `deferred-work.md:18`**, il fallimento muto dopo lo smontaggio: resta aperto, e il Task 2 dichiara perché non si chiude con lui.
- **Il proxy che reindirizza il POST dell'azione a sessione finita** — `deferred-work.md:135`, fuori perimetro e decisione di design.
- **Lo stato d'errore che smonta `SaveBoundary`** — `deferred-work.md:137`, ristrutturazione della pagina.
- **Il campo bloccato che copre gli altri ventitré** — `deferred-work.md:136`, da riprendere il giorno che si tocca l'hook per intero.

### Test

`use-editable-field.ts` è codice del browser: non è fra i moduli puri che `npm test` copre, e questa story **non** costruisce un'impalcatura di test del DOM per due correzioni da poche righe — sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2). Le due correzioni si verificano a mano, sulle quattro schermate, e la verifica si dichiara.

Quello che resta automatico è il perimetro: i cinque test di `answer-groups.test.ts`, i due grep del Task 4, e i 190 test che devono restare verdi.

**Se durante l'implementazione una decisione diventa una funzione pura** — per esempio un predicato che dica se l'uscita dal campo va onorata — allora quella funzione va in un modulo suo con i suoi test, ed è la regola già applicata a `answer-control.ts` e `save-store.ts`: la logica che, rompendosi, produce un dato sbagliato senza dare nessun errore è esattamente quella che `kb-0.md` §7 assegna ai test automatici. Non si forza; se emerge, si fa.

### Contratto visivo

Nessuno. Questa story non aggiunge niente a schermo e non tocca `globals.css`. Se emergesse un bisogno misurato a schermo — misurato, non giudicato — si dichiara nel Dev Agent Record prima di scrivere la regola, che è la forma che `deferred-work.md:122` chiede.

L'unica cosa a schermo che la riapertura esercita più di ogni altra è lo **stato in caricamento**: riaprendo una scheda si vede `loading.tsx` prima del contenuto. Lo scheletro c'è già ed è deliberatamente parziale — riserva lo spazio di quello che si sa sempre, non di quello che dipende dai dati — quindi un piccolo assestamento all'arrivo delle risposte è voluto e non un difetto. Va guardato, non corretto d'istinto.

### Sicurezza

Non cambia niente, e va detto perché una story che promette di ritrovare dei dati è una story che li rilegge. Nessuna scrittura nuova, nessuna azione nuova, nessuna policy toccata, nessuna migrazione. La lettura della scheda passa già per `.eq('client_id', id)` e `.eq('assessment_id', assessmentId)` — correttezza e non sicurezza, perché a filtrare per proprietario è la sicurezza a livello di riga — e resta com'è.

Il Task 2 e il Task 3 toccano `use-editable-field.ts` senza toccare nessun percorso di autorizzazione: l'hook decide **quando** chiamare `run`, mai **cosa** è permesso. Il `!pending` che il Task 2 aggira è una guardia contro le scritture concorrenti, non un controllo di accesso, e il Task 3 fa partire la stessa scrittura che l'uscita dal campo fa già partire.

### Project Structure Notes

Nessuna cartella nuova, nessuna dipendenza nuova, e nessun file nuovo salvo il caso dichiarato in **Test**. `use-editable-field.ts` resta in `src/lib/`, dove sta da sei story, e resta l'unico posto dove vive la macchina del salvataggio: chi fosse tentato di duplicarne una variante dentro `schede/` sta creando la seconda copia di una decisione, che è l'anti-pattern «duplicazione silenziosa» di `kb-0.md` §9.

### Piattaforma in uso, verificata

Letti da `package.json` e `node_modules` il 9 agosto 2026: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

`document.visibilityState` e l'evento `visibilitychange` sono API del browser da anni e non richiedono nessuna dipendenza; l'ascoltatore va comunque registrato dentro un effetto, perché `document` non esiste durante la resa sul server.

### Intelligence dai commit e dalla story precedente

Gli ultimi quattro commit sono `4adbe57` (chiusura 3.3), `1de267e` (implementazione e revisione 3.3), `e194e67` (chiusura 3.2), `096fa03` (implementazione e revisione 3.2). La forma è costante e va rispettata: **un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca**. Lo stato `done` non lo mette la revisione.

Dalla 3.3, il metodo di verifica da ripetere: sonde SQL in transazione annullata; il confronto sugli `updated_at` **non** discrimina dentro una transazione, perché `now()` è fermo — si confrontano i `ctid`, che cambiano se e solo se la riga viene riscritta; le forme degli innesti PostgREST si **vedono rispondere**, non si deducono; la verifica visiva senza sessione si fa su una riproduzione statica servita in locale, con misure da `getComputedStyle` invece che giudizi.

Dalla 3.3, la casella di sessione già passata che copre metà dell'AC1 e metà dell'AC3: *«Ricarico la pagina: quello che avevo scritto c'è»* e *«Scrivo in un campo, vado alla scheda cliente con il ritorno indietro, torno dentro senza ricaricare: il testo c'è»*. Le due caselle di questa story sono più strette e più cattive: la chiusura vera del browser, e la scheda lasciata a metà e ripresa il giorno dopo.

### Riferimenti

- Criterio di accettazione 3, 4 e 5 — [Source: docs/prd-v1.md#6-criteri-di-accettazione]
- FR21, e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-3-una-call-intera-dentro-lo-strumento]
- Le copie dentro `answers`, «la scelta centrale dello schema» — [Source: docs/database.md#3-tabelle]
- `position` è il numero nel questionario intero, e chi lo scrive — [Source: docs/database.md#8-dati-iniziali]
- D21, quando un campo si salva da solo — [Source: docs/00-contesto-e-decisioni.md#d21]
- D14, il software non blocca niente — [Source: docs/00-contesto-e-decisioni.md#d14]
- «Il lavoro dell'utente non si perde mai» — [Source: AGENTS.md#regole-non-negoziabili] e [Source: docs/kb-0.md#6-interfaccia-e-design]
- L'indicatore di salvataggio e i suoi tre stati — [Source: docs/design-system.md#5-componenti]
- I quattro stati di ogni schermata — [Source: docs/design-system.md#6-i-quattro-stati-di-ogni-schermata]
- Il buco del salvataggio all'uscita, per esteso — [Source: docs/bmad/implementazione/deferred-work.md:18]
- Il limite delle posizioni duplicate — [Source: docs/bmad/implementazione/deferred-work.md:120]

### Domande per Luca — chiuse il 9 agosto 2026

Due, e decidevano l'esistenza di due Task su sei. **Risposte entrambe «sì»**: il Task 2 e il Task 3 esistono, e la story non ha più rami condizionati. Le domande restano scritte perché il motivo della risposta è la parte che serve fra sei mesi.

**Domanda 1 — Questa story chiude il buco del salvataggio all'uscita rifiutato per `pending`? → SÌ**

Il fatto: `use-editable-field.ts:185` non salva all'uscita dal campo se una scrittura è già in volo. Chi scrive, aspetta i tre secondi, continua a scrivere mentre la richiesta viaggia e poi naviga via, perde il testo battuto in quella finestra. La finestra dura un andata e ritorno di rete: trascurabile in casa, reale da tablet su rete di cellulare.

Il precedente: `deferred-work.md:18` lo rimanda dicendo *«da riprendere insieme [alla scheda cliente], e non dentro la story del salvataggio delle risposte»*. La story del salvataggio delle risposte era la 3.3. Questa è la story per cui *«una call interrotta o un browser chiuso di colpo non mi costano il lavoro fatto»*, che è testualmente lo stesso difetto.

Il costo: l'hook serve a quattro schermate, quindi la correzione va riverificata su tutte e quattro. È esattamente il costo per cui era stata rimandata.

**La risposta, il 9 agosto 2026: sì, si chiude qui.** Il rimando della 3.3 nominava come punto di ripresa «la story del salvataggio delle risposte», e questa non lo è: è la story per cui *«una call interrotta o un browser chiuso di colpo non mi costano il lavoro fatto»*, cioè testualmente il difetto. Il costo dei quattro riverifica si paga (Task 6). Quello che **non** si chiude resta dichiarato: lo smontaggio dentro la stessa finestra, e il buco (b) del fallimento muto dopo lo smontaggio.

**Domanda 2 — Si mette un salvataggio quando la pagina passa in secondo piano? → SÌ**

Il fatto: fra l'ultima battuta e i tre secondi non c'è niente. Chiudere la scheda del browser, o passare a un'altra applicazione sul tablet, col fuoco ancora nel campo, perde fino a tre secondi di scrittura.

Il precedente, e perché la domanda si riapre: il 9 agosto hai rifiutato il `beforeunload` con due motivi *«che non scadono»* — è una finestrella del browser che compare, e `design-system.md` §5 dice «nessun avviso a comparsa». `visibilitychange` **non è quello**: non mostra niente, non chiede niente, non ferma niente. Fa partire la stessa scrittura che fa partire l'uscita dal campo. Nessuno dei due motivi del rifiuto lo tocca, e la stessa voce di `deferred-work.md` dichiara il punto di ripresa come *«una decisione di design e non di implementazione»* — cioè questa.

Il limite da sapere prima di dire sì: **non è una garanzia.** La richiesta parte; se il browser chiude il processo prima che sia uscita, non arriva. Restringe la finestra, non la chiude.

**La risposta, il 9 agosto 2026: sì, con `visibilitychange`, e dentro l'hook.** Il rifiuto del 9 agosto riguardava il `beforeunload` e i suoi due motivi non toccano un ascoltatore che non mostra niente. Va **nell'hook** e non solo in `answer-field.tsx`: una copia della stessa decisione fuori dal posto dove vive la macchina del salvataggio sarebbe la «duplicazione silenziosa» di `kb-0.md` §9, e le altre tre schermate ci guadagnano invece di restare indietro. Il prezzo è che vanno riverificate, ed è lo stesso prezzo che il Task 2 paga già.

**Il `beforeunload` resta rifiutato**, e questa decisione non lo riapre: la differenza fra i due è tutto il motivo per cui la domanda si è riaperta, e va tenuta scritta perché fra sei mesi non la si confonda.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), 9 agosto 2026.

### Debug Log References

Nessun log applicativo. Le verifiche eseguite, tutte riproducibili:

- `npm run typecheck` — nessuna uscita.
- `npm run build` — nove rotte, nessun avviso.
- `npm test` — **196 test, 196 verdi** (erano 190; i sei nuovi sono di `owed-exit.test.ts`, vedi sotto).
- Le due sonde dell'AC2, eseguite due volte: prima di toccare il codice e di nuovo alla fine, in una `execute_sql` sola con `begin; set local role authenticated; … rollback;`.
- I due grep di perimetro del Task 4.

### Completion Notes List

**Task 1 — le due sonde dell'AC2 danno l'esito scritto in Dev Notes, prima e dopo le modifiche.**

*Sonda A, il questionario si riordina sotto.* 24 righe prima, 24 dopo, `scheda_identica_dopo_il_riordino: true` su tutte e otto le colonne confrontate. I due ordini divergono come atteso:

| | Ordine dei blocchi |
|---|---|
| Dentro la scheda | `Contesto > Obiettivo > Costo di restare come si è > …` |
| Nel questionario, dopo il riordino | `Obiettivo > Costo di restare come si è > Contesto > …` |

*Una nota sul metodo, perché la prima esecuzione è stata sbagliata e vale la pena dirlo.* Spostare in giù i **primi due blocchi in ordine di posizione** non produce nessuna divergenza: il primo scende di uno, il secondo — che nel frattempo è diventato il primo — risale al suo posto, e il questionario torna com'era. La sonda passava con `identica: true` e due ordini **uguali**, cioè non provava niente. La forma giusta è spostare in giù **lo stesso blocco due volte**. Chi la rieseguirà parta da qui.

*Sonda B, la domanda si riscrive, si disattiva, se ne aggiunge una.* 24 righe prima, 24 dopo, tutte e nove le colonne identiche, `content` intatto. La riga 1 della scheda porta testo e tipo **vecchi** (`testo_lungo`) mentre `questions` porta i nuovi (`DOMANDA RISCRITTA OGGI`, `scelta_singola`). Domande attive dopo le tre scritture: 24 — una disattivata, una aggiunta. È anche la misura dei criteri **4 e 5** del PRD §6.

**Task 2 — il buco (a) di `deferred-work.md:18` è chiuso, e la forma è quella prescritta.** `owedExit`, un `useRef<string | null>` accanto a `waiting`. `onBlur` lo accende col testo corrente quando deve rifiutarsi per `pending`, invece di non fare niente; il `.then` di `write` lo spende chiamando `write(owed)` appena la scrittura in volo si risolve. `!pending` **non** è stato tolto: due `update` sulla stessa riga senza ordine garantito possono far vincere il testo vecchio, che è il danno peggiore descritto nella trappola 5. Il ricordo si azzera quando lo si spende, in `onFocus` e in `cancel()`.

**Un predicato puro è emerso, ed è esattamente quello che la sezione Test nomina come esempio** («un predicato che dica se l'uscita dal campo va onorata»). Sta in `src/lib/owed-exit.ts`, `shouldHonourExit(owed, sent, saved)`, con sei test. Vale la pena dire perché non è stato lasciato in linea, visto che sono tre confronti: sbagliandolo in una direzione si rimanda due volte la stessa scrittura, sbagliandolo nell'altra si butta via il testo battuto durante il viaggio — e **nessuna delle due dà un errore**, che è la definizione di `kb-0.md` §7. Il caso che lo giustifica da solo è il **campo svuotato**: `owed` è `string | null`, e un controllo scritto sulla verità di `owed` invece che su `!== null` scarterebbe la stringa vuota, cioè perderebbe in silenzio la cancellazione di una risposta. C'è un test che lo fissa. La funzione risponde con un predicato di tipo (`owed is string`) e non con un `boolean`, così chi la chiama scrive `write(owed)` senza un `as`.

**Task 3 — il `visibilitychange` è dentro l'hook, e vale su tutte e quattro le schermate.** Effetto suo, con le sue dipendenze (`autosave, dirty, pending, value, write`), che registra e toglie l'ascoltatore su `document`. Con `autosave` falso non registra niente: i campi corti si confermano con `Salva`, ed è D21. Quando la pagina passa in secondo piano con una scrittura già in volo accende lo **stesso** ricordo del Task 2 invece di non fare niente.

**Le due correzioni non si scavalcano, e il caso è stato ragionato invece che sperato.** Se il cambio di scheda del browser fa scattare anche il `blur`, l'ordine fra i due eventi non conta: chi arriva primo scrive, chi arriva secondo trova `pending` e accende il ricordo col **medesimo** testo, e alla risoluzione `shouldHonourExit` lo scarta perché `owed === sent`. Nessuna scrittura doppia in nessuno dei due ordini.

**Quello che il Task 3 non promette, e che non va letto come chiuso.** La richiesta parte; se il browser chiude il processo prima che sia uscita, non arriva. Restringe la finestra, non la chiude. Copre con certezza il passaggio a un'altra applicazione sul tablet e il cambio di scheda; la chiusura la copre sulla maggior parte dei browser e non su tutti. La casella di sessione dell'AC1 che la prova dice già che un esito negativo **non è un fallimento della story**, e va annotato come tale.

**Quello che il Task 2 non copre, e non è chiuso.** Lo smontaggio dentro la finestra della scrittura in volo: se il componente sparisce prima che si risolva, il `.then` esce su `!alive` e non c'è più nessuno a spendere il ricordo — il testo battuto durante il viaggio si perde lo stesso. È la stessa navigazione che la correzione copre, solo più veloce della risposta del server. Resta anche il buco **(b)** della stessa voce, il fallimento muto dopo lo smontaggio, che è un problema di *segnalazione* e non di *perdita*: dopo lo smontaggio non esiste più nessun posto dove segnalare. Entrambi sono scritti nell'annotazione alla voce 18.

**Task 4 — i due grep danno i numeri dichiarati prima di eseguirli.** `from('questions')`/`from('question_blocks')` sotto `clienti/`: **zero righe**. `order(` nella pagina della scheda: **tre righe** — la 89 e la 90, che sono le due vere, e la 77, che è il commento che spiega perché ce ne vogliono due. I cinque test di `answer-groups.test.ts` ci sono ancora e passano; non ne sono stati aggiunti.

**Task 5 — una voce nuova e tre annotazioni, non due.** Le due previste sono sulle voci **18** e **127**. La terza è sulla voce **141** (`saveDirty` senza tetto di concorrenza) ed è una **correzione in vista**, non un'aggiunta di comodo: quella voce dice «capita solo quando il salvataggio esplicito viene premuto su molti campi», e dopo il Task 3 non è più vero. L'ascoltatore sta dentro **ogni** istanza dell'hook, quindi il passaggio in secondo piano fa partire tutte le scritture sporche insieme — la stessa raffica, senza che nessuno abbia premuto niente. La story non poteva prevederla perché nasce dalla decisione del Task 3; lo scostamento dal conteggio previsto è dichiarato qui e nel File List.

**La voce nuova è un costo che il Task 3 introduce, non una perdita.** L'ascoltatore copia alla lettera la condizione dell'uscita dal campo e quindi, a differenza del timer, non porta la guardia `attempted.current === value`. Quando il server ripulisce il testo, `dirty` resta vero su un campo già salvato (è la voce sui payload fuori ordine) e da lì ogni passaggio in secondo piano rimanda lo stesso identico testo. **Non è stata "aggiustata" di iniziativa**: `onBlur` ha la stessa mancanza dalla Story 1.2, correggerne uno solo lascerebbe due condizioni diverse per la stessa decisione, e la causa a monte è il disallineamento fra `value` e `baseline`, che la trappola 2 vieta esplicitamente di toccare qui.

**Task 6 — cosa è stato verificato davvero, e cosa no.**

Automatico: typecheck, build, 196 test verdi, i due grep, le due sonde rieseguite dopo le modifiche.

Sulle quattro schermate che usano l'hook, **la verifica eseguita è statica e va letta per quello che è**, perché il comportamento richiede una sessione vera:

- **`block-title-form.tsx`** passa `autosave: false`. L'effetto del `visibilitychange` esce prima di registrare, e `onBlur` esce su `!autosave` prima del ramo nuovo: `owedExit` non si accende mai. **Provabilmente invariata.**
- **`person-field-form.tsx`** (`autosave: long`) e **`client-field-form.tsx`** (`autosave: autosaves`): i campi corti ricadono nel caso qui sopra; i lunghi prendono le due correzioni. Il rischio vero su queste due è `Annulla`, ed è coperto **due volte**: col mouse `keepFocus` fa `preventDefault` sul `mousedown` e il `blur` non arriva affatto; da tastiera il fuoco va su un pulsante dentro lo stesso `form` e la guardia su `relatedTarget` esce prima del ramo nuovo. In più `cancel()` azzera il ricordo comunque.
- **`answer-field.tsx`** propaga `control` senza avvolgerlo, quindi `onFocus` e `onBlur` arrivano intatti; la voce nel registro si aggiorna a ogni resa, così la scrittura in più del ricordo speso porta la barra su `Salvataggio…` come ogni altra.

**Le tre caselle comportamentali su quelle schermate restano a Luca**, in «Verifica di sessione»: nessuna sessione è disponibile a questo agente, e un salvataggio all'uscita che smettesse di funzionare non lo coglierebbe nessun test. È il prezzo dichiarato delle due risposte «sì», e qui è pagato solo a metà.

**Perimetro rispettato.** Un solo file di codice esistente toccato (`use-editable-field.ts`), più il modulo puro nuovo con i suoi test, che è il caso dichiarato in **Test**. Nessuna migrazione, nessun file nuovo di rotta, `globals.css` non aperto, e nessuno dei dieci file elencati come intoccabili in Dev Notes. Nessuna ripresa costruita: nessun banner, nessuna conferma di ripristino, nessuna bozza locale, nessun `beforeunload`. La `revalidatePath` di `saveAnswer` resta dov'è.

**`use-editable-field.ts` ha superato le 200 righe di `kb-0.md` §2, e va detto invece che lasciato scoprire.** Da **189 a 249** righe totali; il codice vero passa da **115 a 141**, e la differenza sono 72 righe di commento su 249. La regola dice «quasi sempre contiene due cose», e qui il «quasi» regge: il file resta una cosa sola — la macchina del salvataggio di un campo — e l'unico pezzo separabile è già stato separato in `owed-exit.ts`. Dividerlo davvero vorrebbe dire spezzare quella macchina in due, che è l'opposto di quanto le Project Structure Notes chiedono («resta l'unico posto dove vive»). Non si apre una voce nuova perché il punto di ripresa esiste già ed è nominato: `deferred-work.md:136`, «il giorno che si tocca l'hook per intero».

**Correzione dopo la revisione del 10 agosto 2026: i numeri qui sopra erano veri prima delle sei patch e non lo sono più.** Il file sta a **270** righe totali, **146** di codice e **87** di commento, con 37 vuote. Le patch hanno aggiunto **cinque** righe di codice — il ramo `pending` di `save()`, l'azzeramento in `onChange`, il `owed !== null` al richiamo — e quindici di commento. L'argomento non cambia con i numeri, perché non dipendeva da quanto si sfora ma dal fatto che il file resta una cosa sola; cambia il conteggio, e va scritto giusto perché è quello che si rileggerà.

**Stato del database alla fine: identico alla partenza** — 3 clienti, 1 persona, **0 schede, 0 risposte**, 1 questionario, 9 blocchi, 24 domande tutte attive. Tutte le sonde sono girate in transazioni annullate. Per la voce `deferred-work.md:127` questo significa che la finestra gratuita **non** si è chiusa con l'implementazione: si chiude con la sessione di Luca, che per la prima volta deve **tenere** le righe per poter provare «la riprendo domani».

### Verifica di sessione

Le caselle che nessun agente può spuntare, perché richiedono un accesso vero e un browser vero. `done` si mette dopo queste, non dopo la revisione.

**AC1 — quello che è stato scritto si ritrova**

- [ ] Apro una scheda su un cliente, scrivo in tre campi di tre blocchi diversi, aspetto che l'indicatore dica `Salvato alle …`. **Chiudo il browser di colpo** — non la scheda, l'applicazione — riapro e torno sulla scheda: i tre campi ci sono, con quello che avevo scritto.
- [ ] Ripeto scrivendo in un campo di tipo scelta singola e in uno numerico: si ritrovano anche quelli, col controllo giusto.
- [ ] Scrivo in un campo e **chiudo la scheda del browser entro un secondo**, senza uscire dal campo e senza aspettare i tre secondi. Riapro: c'è. È la finestra che il Task 3 copre, ed è la casella che dice se l'ha coperta davvero. Se non c'è, **non è un fallimento della story**: il Task 3 dichiara di restringere la finestra e non di chiuderla. Va annotato quale delle due cose è successa.
- [ ] Stessa prova ma **passando a un'altra applicazione** invece di chiudere, e sul tablet invece che sul portatile: è il caso per cui il `visibilitychange` è stato scelto, e l'unico che copre con certezza.
- [ ] Scrivo in un campo, aspetto che l'indicatore dica `Salvataggio…`, e **mentre dice così** continuo a scrivere e poi vado subito alla scheda cliente. Torno: c'è anche quello che ho battuto durante il salvataggio. È la casella del Task 2, e prima di questa story falliva.
- [ ] Compilo mezza scheda oggi, chiudo tutto, **la riprendo domani**: è la scheda di ieri, dove l'avevo lasciata.

**AC2 — la scheda vecchia non si rende col questionario di oggi**

- [ ] Con una scheda già aperta e mezza compilata, vado nel questionario e **riordino due blocchi**. Torno sulla scheda: l'ordine è quello di prima, e i blocchi stanno dove stavano.
- [ ] **Riscrivo il testo di una domanda** che nella scheda ha già una risposta. Torno sulla scheda: la domanda si legge com'era, e la risposta è al suo posto.
- [ ] **Cambio il tipo** di una domanda già risposta, da testo lungo a scelta singola. Torno sulla scheda: il controllo è ancora quello vecchio e la risposta si legge per intero.
- [ ] **Disattivo una domanda** che nella scheda ha una risposta. Torno sulla scheda: c'è ancora. Apro una scheda **nuova**: non c'è.
- [ ] **Aggiungo una domanda** al questionario. La scheda vecchia non la mostra e non cambia il suo totale.
- [ ] **Tolgo un'opzione** da una scelta singola a cui la scheda ha già risposto proprio con quella. Torno sulla scheda: la risposta è ancora selezionata, in coda al menu, e non si è riscritta da sola. È l'opzione orfana di `answer-control.ts`, e la riapertura è il momento in cui serve davvero.
- [ ] Riapro una scheda su una rete lenta e guardo lo **stato in caricamento**: lo scheletro compare, poi arriva il contenuto. Se salta in un modo che dà fastidio, lo annoto con la misura, non col giudizio.

**AC3 — riaprendo si riprende a scrivere, e il salvataggio riparte**

- [ ] Riapro una scheda già compilata a metà e scrivo in un campo nuovo: dopo tre secondi l'indicatore dice `Salvato alle …`, senza aver ricaricato niente.
- [ ] Correggo un campo che aveva già del testo: si salva, e ricaricando c'è la correzione.
- [ ] Esco alla scheda cliente col ritorno indietro e rientro **senza ricaricare**, due volte di fila, scrivendo qualcosa ogni volta: ogni giro il testo dell'ultimo c'è e il salvataggio riparte.
- [ ] Con la rete staccata scrivo in un campo, l'indicatore va su `Non salvato, riprovo`, riattacco la rete e premo `Riprova`: passa. Poi **ricarico**: il testo è sul server.
- [ ] *Facoltativa, per la questione lasciata aperta dalla 3.3:* riprovo il giro «esco e rientro senza ricaricare» in una copia locale con la `revalidatePath` di `saveAnswer` commentata. Se il testo nuovo c'è lo stesso, la chiamata è dimostrata superflua e si toglie, con il fatto scritto. Se non c'è, resta e la questione si chiude per sempre.

**Le altre tre schermate che usano l'hook — è qui che una regressione di questa story si vedrebbe**

- [ ] Scheda cliente: il campo lungo `obiettivi_business` si salva da solo e all'uscita, il campo corto conferma con `Salva`, `Annulla` continua a funzionare.
- [ ] Persona: i campi lunghi si salvano da soli, i corti confermano.
- [ ] Questionario: il titolo del blocco si conferma con `Salva`, e `Annulla` non salva.

**Alla fine**

- [ ] Riconto `clients`, `people`, `assessments`, `answers`, `question_blocks`, `questions`. Se **restano righe in `answers`**, la finestra gratuita di `deferred-work.md:127` è chiusa e va scritto.
- [ ] Se qualcosa non va come qui sopra, si annota **cosa** e **dove**, non «non funziona».

### File List

```
src/lib/use-editable-field.ts                          MODIFICA — il ricordo dell'uscita rifiutata
                                                       per `pending` (Task 2) e l'ascoltatore
                                                       `visibilitychange` (Task 3)
src/lib/owed-exit.ts                                   NUOVO — `shouldHonourExit`, il predicato
                                                       puro del Task 2, caso dichiarato in «Test»
src/lib/owed-exit.test.ts                              NUOVO — sei casi, da 190 a 196 test
docs/bmad/implementazione/deferred-work.md             MODIFICA — 1 voce nuova, 3 annotazioni
docs/bmad/implementazione/sprint-status.yaml           MODIFICA — 3.4 da backlog a review
docs/bmad/implementazione/3-4-riprendere-una-scheda-interrotta.md   MODIFICA — questo file
```

Le annotazioni di `deferred-work.md` sono **tre** e non due: le voci 18 e 127 come previsto, più la 141, per il motivo scritto nel Task 5 delle note.

## Change Log

| Data | Chi | Cosa |
|---|---|---|
| 9 agosto 2026 | create-story | Creazione del file, con le due sonde dell'AC2 già eseguite e i default della cache del router di Next 16 verificati |
| 9 agosto 2026 | Luca | Domanda 1 «sì»: il buco del salvataggio all'uscita rifiutato per `pending` si chiude qui. Domanda 2 «sì»: si mette il salvataggio al passaggio in secondo piano, con `visibilitychange` e dentro l'hook. Il `beforeunload` resta rifiutato. I Task 2 e 3 smettono di essere condizionati |
| 10 agosto 2026 | code-review | Tre strati in parallelo, quindici rilievi: sei corretti, quattro rimandati con la loro voce in `deferred-work.md`, cinque scartati col motivo. Il più grosso è il ricordo che non si azzerava riprendendo a scrivere, raggiungibile solo per via del `visibilitychange` del Task 3: la pagina che va in secondo piano col fuoco dentro non produce nessun `blur`, quindi al ritorno nessun `focus` azzerava niente e la risoluzione poteva riscrivere sul server un testo già corretto. Su decisione di Luca il ricordo è stato esteso anche a `save()`, che era l'unico dei tre percorsi a perdersi in silenzio — e sul campo corto, che non ha timer, si perdeva davvero. Stato invariato a `review`: `done` lo mette la verifica di sessione |
| 9 agosto 2026 | dev-story | Implementazione dei sei Task. `owedExit` in `use-editable-field.ts` chiude il buco (a) di `deferred-work.md:18`; l'ascoltatore `visibilitychange` restringe la finestra dei tre secondi su tutte e quattro le schermate. Estratto `owed-exit.ts` con sei test — il caso dichiarato in «Test» — da 190 a 196. Le due sonde dell'AC2 rieseguite prima e dopo, con lo stesso esito. Una voce nuova e **tre** annotazioni in `deferred-work.md`: la terza, sulla voce 141, corregge una raggiungibilità che il Task 3 ha cambiato. Le tre caselle comportamentali sulle altre schermate restano alla sessione |
