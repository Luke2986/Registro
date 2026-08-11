---
baseline_commit: e109999
---

# Story 4.1: Vedere a che punto è ogni scheda

Status: done

Epic: 4 — Ritrovare a mesi di distanza e portare fuori
Data di creazione: 10 agosto 2026

> **Baseline.** La Story 3.6 è implementata, revisionata e chiusa: `e109999` su `main`, albero pulito. Con lei si chiude l'Epic 3. Tutti i conteggi di questo file sono presi da quel commit e dal progetto Supabase `izkycpwxuedpkzgpvcxc`, verificati il 10 agosto 2026: **216 test verdi**, `npm run typecheck` senza uscita, **quindici migrazioni** a registro, tutte col prefisso numerico.
>
> **Lo stato del database è invariato dalla 3.5**, per la seconda story di fila: 3 clienti, 1 persona, **1 scheda, 24 risposte di cui 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. La scheda è quella nata alle 07:40:49 di Roma del 10 agosto, `total_questions` 24, `verdict` `non_deciso`, `completion_status` `bozza`. **Su quella scheda l'avanzamento che questa story costruisce vale `0 / 24`**, ed è il caso limite più utile che si potesse avere per la prima misura.
>
> **Questa è la prima story dell'Epic 4.** L'epic non aggiunge funzioni alla call: rende ritrovabile quello che la call ha lasciato.

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want vedere per ogni scheda quante domande ho risposto sul totale,
so that distinguo una scheda finita da una lasciata a metà senza aprirla.

## Acceptance Criteria

**AC1 — la riga della scheda porta tre cose, non una**
**Given** un cliente con più schede
**When** apro la sua scheda cliente
**Then** vedo l'elenco delle sue schede con **data, esito e avanzamento** (FR24)

**AC2 — la forma dell'avanzamento è fissata**
**Given** una scheda con 12 risposte su 15 domande
**When** guardo il suo avanzamento
**Then** vedo il contatore `12 / 15` in monospaziato e accanto una barra alta 4px e larga 64, riempita in `--sec-prequalifica` (UX-DR9)
**And** non vedo nessuna percentuale e nessun colore d'allarme

**AC3 — «vuoto» vuol dire vuoto anche quando è pieno di spazi**
**Given** una risposta compilata con soli spazi
**When** viene contata
**Then** non conta come risposta

**AC4 — il denominatore è congelato**
**Given** una scheda chiusa ieri con 15 domande su 15
**When** oggi aggiungo una domanda nuova al questionario
**Then** quella scheda continua a mostrare `15 / 15` e non torna incompleta (FR16, criterio di accettazione 10 del PRD)

---

> **Leggi questo prima dei Task, o costruirai la cosa sbagliata.**
>
> **AC1 chiede tre cose e non due, e la trappola è un commento nel codice che dice il falso.** `assessments-card.tsx:29-31` dichiara che «la pillola di verdetto» arriva con la 4.2 e che chi implementa la 4.1 «dovrà aggiungerne due, non tre». **È sbagliato.** La 4.2 è l'esito **nell'elenco clienti**, non nella card del cliente; l'esito nella card è AC1 di questa story, è scritto in `prd-v1.md` §4 («ogni scheda nell'elenco mostra data, esito e avanzamento»), ed è quello che Luca ha risposto alla Domanda 1 della 3.6: «l'esito, il contatore e la barra saranno il quarto, il quinto e il sesto». `types.ts:22-24` dice la cosa giusta («l'esito e l'avanzamento sono della 4.1, che li mostra insieme nella card del cliente»). Le tre cose da aggiungere sono **esito, contatore, barra**, e il commento della card va corretto insieme.
>
> **Nessuna nuova pillola: `VerdictPill` esiste dalla 3.5** in `src/components/verdict-pill.tsx`, ed è finita là esattamente perché «la card del cliente e l'elenco la renderanno». Chi ne scrive una seconda sta rifacendo una cosa fatta ieri.
>
> **Il denominatore non si conta: si legge.** È `assessments.total_questions`, congelato all'apertura da `open_assessment` e mai più toccato (`0015_answer_question_copy.sql:185-190`, `database.md` §3). AC4 è vera **per costruzione** e si rompe solo scrivendo codice che non serve: qualunque `from('questions')` dentro questa schermata è il difetto, non la soluzione.
>
> **Il numeratore si conta con `normalizeTextValue` e non con una regola nuova.** `answer-actions.ts:62-65` lo dichiara per iscritto e in anticipo: «è la **stessa definizione di «vuoto»** che il conteggio dell'avanzamento userà (`coalesce(trim(content), '') <> ''`, `database.md` §3). Riscriverla qui darebbe due definizioni su due lati dello stesso numero, destinate a divergere». AC3 è quella riga, e si soddisfa importando.
>
> **Il conteggio si fa sul server e alla card arrivano due numeri.** `assessments-card.tsx` è `'use client'`: tutto ciò che gli si passa come prop viene serializzato e spedito al browser. Passargli le righe di `answers` vorrebbe dire spedire al browser **il testo integrale di ogni risposta di ogni scheda del cliente** per mostrare un `12 / 15` — cioè la categoria di dato più sensibile del sistema (`kb-0.md` §4) trasportata per niente. La riduzione avviene in `page.tsx`, che è un componente server.
>
> **Le due domande sono chiuse: le risposte stanno in Dev Notes → «Risposte di Luca», e i Task condizionati vanno letti con quelle in mano.** In breve: **Domanda 1 → A**, la migrazione `0016` entra in questa story; **Domanda 2 → B**, la macchina dei quattro stati non si estrae qui e il punto di ripresa è la 5.1. Nessun Task va eseguito indovinando, e nessuno va saltato.
>
> **Una migrazione, e una sola.** La `0016` è il trigger che fa muovere `assessments.updated_at` quando si salva una risposta: è la voce `deferred-work.md:131`, il cui punto di ripresa dichiarato è **questa story**, «da fare lì, e in una volta sola con lei». Non serve a nessuna delle quattro AC — serve a FR11 — ed è la ragione per cui esisteva la Domanda 1.
>
> **Non porta l'esito nell'elenco clienti** (4.2), **né l'esportazione** (4.3), **né nessun filtro o ordinamento per avanzamento**, che nessuna AC chiede e nessun documento nomina.

## Tasks / Subtasks

- [x] **Task 1 — Il conteggio, in un modulo puro** (AC: 2, 3, 4)

  - [x] File nuovo `src/lib/assessment-progress.ts`, puro: niente React, niente Supabase, così `npm test` lo copre senza riscrivere niente (`kb-0.md` §7). È la stessa forma di `last-activity.ts`, che è il precedente esatto — un calcolo che PostgREST non fa e che vive in memoria.
  - [x] `import { normalizeTextValue } from './client-fields.ts'`. **L'estensione `.ts` non è un refuso**: dentro `src/lib` gli import di valore la portano tutti (`verdict.ts:12`, `block-title.ts:2`, `client-filters.ts:1`), perché `npm test` esegue i `.ts` direttamente da `node --test`. Senza, il test non parte.
  - [x] `countAnswered(answers: readonly { content: string | null }[]): number` — conta le righe per cui `normalizeTextValue(content) !== null`. **Una riga di logica e nessuna regola nuova**: la definizione di «vuoto» è quella che `saveAnswer` applica scrivendo, e importarla è ciò che tiene i due lati dello stesso numero d'accordo per sempre (`answer-actions.ts:62-65`).
  - [x] Il tipo del parametro è la sola colonna che serve e non `AnswerRow`: chiedere la riga intera legherebbe il modulo allo schema, ed è l'argomento già scritto in testa a `ActivityRow` (`last-activity.ts:8-12`).
  - [x] `progressFillPercent(answered: number, total: number): number` — la larghezza del riempimento, da 0 a 100. **Il nome dice «percent» e a schermo la percentuale non compare mai** (AC2): questo numero è una larghezza CSS e nient'altro, e il commento lo deve dire, perché è la prima cosa che una revisione leggerà come una violazione.
  - [x] `total <= 0` risponde `0` e non `NaN`. Non è difensivismo: `total_questions` è `not null default 0` nello schema (`0005_assessments_answers.sql`), e `answered / 0` finirebbe nel DOM come `width: NaN%`, cioè una barra che sparisce senza nessun errore. `open_assessment` rifiuta di aprire una scheda su zero domande attive, quindi il caso non è raggiungibile **oggi**: la funzione però dev'essere totale, per la stessa ragione per cui `activityTime` restituisce un numero e mai `NaN` (`last-activity.ts:50-54`).
  - [x] Il risultato si limita a 100 anche se `answered > total`. Per costruzione non succede — le righe di `answers` nascono tutte insieme e `total_questions` è il loro numero — ma una barra che esce dal proprio contenitore è un difetto visibile prodotto da un numero che nessuno guarderà.
  - [x] Test in `src/lib/assessment-progress.test.ts`: `countAnswered` su elenco vuoto, su contenuti `null`, sulla **stringa di soli spazi** (AC3, ed è il caso che giustifica il file), su testo vero, su un misto; `progressFillPercent` per `0/24`, `12/15`, `15/15`, `0/0`, e il caso limitato a 100.

- [x] **Task 2 — La lettura: due colonne e un innesto** (AC: 1, 2, 3, 4)

  - [x] `src/lib/types.ts`: `AssessmentSummary` cresce di `'verdict'` e `'total_questions'`. **E il commento va corretto, non lasciato**: oggi dice che «l'esito e l'avanzamento sono della 4.1» al futuro, e da questa story è al presente. La regola che quel commento enuncia — «un dato letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio» — si tiene vera rendendo le due colonne nello stesso commit (Task 3).
  - [x] Sempre in `types.ts`, il tipo della riga che la card riceve: `export type AssessmentListItem = AssessmentSummary & { answered: number }`. `answered` non è una colonna e non può stare dentro un `Pick`: è il numero calcolato sul server, ed è **l'unica cosa che il browser deve sapere delle risposte**.
  - [x] `src/app/(app)/clienti/[id]/page.tsx:99-105`: la `select` delle schede diventa `'id, call_date, interviewee_id, completion_status, verdict, total_questions, answers(content)'`. Gli `.order` non si toccano: sono tre e due sono veri, e il perché sta già scritto sopra la query.
  - [x] **L'innesto è normale e mai `answers!inner(...)`**: con `!inner` diventa un join interno e farebbe sparire dall'elenco ogni scheda senza risposte. Non ne esistono — `open_assessment` le scrive tutte o annulla la transazione — ma è la stessa trappola che `clienti/page.tsx:35-38` documenta per `assessments`, e vale la riga.
  - [x] La riduzione, subito sotto la query e prima del `return`: da ogni riga letta si costruisce un `AssessmentListItem` con `answered: countAnswered(assessment.answers)` e **senza `answers`**. Il modo giusto è costruire l'oggetto esplicito con le ~~sei~~ **sette** chiavi, non un rest spread che «toglie» `answers`: con l'oggetto esplicito il giorno che una colonna entra nel tipo e non nella riduzione il compilatore si ferma. *(Le chiavi sono sette e non sei: le sei colonne di `AssessmentSummary` più `answered`, che non è una colonna. Corretto con la revisione, il 10 agosto 2026 — il codice era giusto e la casella portava il numero sbagliato.)*
  - [x] **Nessuna riga di `answers` arriva alla card.** È la ragione per cui questo Task esiste e non è una riga dentro il Task 3. La verifica è nel Task 7 ed è un grep, non una dichiarazione.
  - [x] Nessun secondo `select`, nessuna seconda query, nessun conteggio chiesto al database: il perché di questa scelta, il suo costo e il giorno in cui smette di valere stanno in **Dev Notes → «Come si conta l'avanzamento»**, e vanno riassunti in due righe di commento sopra la query.

- [x] **Task 3 — La riga: esito, contatore, barra** (AC: 1, 2)

  - [x] `src/app/(app)/clienti/[id]/assessments-card.tsx`: la prop `assessments` passa da `AssessmentSummary[] | null` a `AssessmentListItem[] | null`.
  - [x] `import { VerdictPill } from '@/components/verdict-pill'` e `<VerdictPill verdict={assessment.verdict} />` dopo la parola dello stato di compilazione. Nessun ramo condizionale: `verdict` è `not null default 'non_deciso'`, quindi la pillola c'è **sempre**, ed è la stessa scelta e lo stesso motivo della parola dello stato («una parola che compare solo nel caso negativo si legge come un avviso invece che come uno stato»).
  - [x] L'avanzamento, dopo la pillola, come **un solo figlio flex** e non due:

    ```tsx
    <span className="progress">
      <span className="data">{assessment.answered} / {assessment.total_questions}</span>
      <span className="progress__bar" aria-hidden="true">
        <span className="progress__fill" style={{ width: `${progressFillPercent(...)}%` }} />
      </span>
    </span>
    ```

    Un solo figlio perché `.assessment` è `flex-wrap: wrap`: contatore e barra separati sarebbero due figli, e su schermo stretto la barra andrebbe a capo lasciando il numero da solo, che è esattamente la coppia che UX-DR9 tiene insieme.
  - [x] `aria-hidden="true"` sulla barra, e non un `role="progressbar"`. La barra **ripete** un'informazione che il contatore accanto dice già per esteso: annunciarla vorrebbe dire far leggere due volte lo stesso numero a chi non vede lo schermo. Il colore non è mai l'unico portatore di significato (UX-DR2, regola 4) proprio perché il numero c'è.
  - [x] Il contatore prende `.data`, che è il monospaziato (AC2, UX-DR12). Gli spazi attorno alla barra `/` sono quelli di `design-system.md` §5: `12 / 15`, non `12/15`.
  - [x] **L'ordine di lettura della riga è quello che Luca ha fissato rispondendo alla Domanda 1 della 3.6**: data, interlocutore (quando c'è), stato di compilazione, **esito**, **avanzamento**. Non si ri-decide in implementazione.
  - [x] **Il commento in testa alla card va riscritto, ed è la metà di questo Task.** Le righe 24-36 dicono tre cose di cui una è falsa e una è scaduta: che la pillola di verdetto arriva con la 4.2 (falso: è AC1 di questa story), e che chi implementa la 4.1 «dovrà aggiungerne due, non tre» (scaduto: sono tre). Al loro posto va scritto cosa la riga porta adesso e cosa resta fuori — l'esito nell'**elenco clienti** (4.2) e l'esportazione (4.3). Lasciarlo com'è è il difetto che `kb-0.md` §8 chiede di non produrre, ed è lo stesso lavoro che la 3.6 ha già fatto su questo stesso commento.
  - [x] `loading.tsx` della scheda cliente **non si tocca**, ed è una scelta e non un'omissione: la card delle schede vi riserva il solo titolo, perché badge, pulsante e righe «compaiono solo con almeno una scheda» (`loading.tsx:72-77`). L'avanzamento vive dentro una riga che lo scheletro non riserva già oggi, quindi non c'è nessun salto nuovo da evitare. Se chi implementa la cambia, la scrive col motivo — la 3.6 ha pagato una patch di revisione esattamente su questo.

- [x] **Task 4 — Le tre regole di CSS** (AC: 2)

  - [x] `src/app/globals.css`, accanto al blocco `/* schede di prequalifica del cliente */` (`:860-901`) e non in fondo al file: le regole nuove stanno dove sta la cosa che vestono.
  - [x] `.progress` inline-flex, `align-items: center`, `gap: 8px`. `.progress__bar` larga **64**, alta **4**, `border-radius: var(--r-full)`, fondo `--surface-sunken`, `overflow: hidden`. `.progress__fill` alto 100%, fondo `--sec-prequalifica`, **e `display: block`** — quest'ultimo aggiunto in implementazione e dichiarato con la revisione: `.progress__fill` è uno `<span>`, quindi in linea, e su un elemento in linea non sostituito `height: 100%` non ha effetto; `.progress__bar` non ne ha bisogno perché è figlio flex ed è già blockificato. I numeri sono quelli di `design-system.md` §5 e di UX-DR9, letteralmente: non si arrotondano e non si «migliorano».
  - [x] **`--sec-prequalifica` dentro il contenuto non è una violazione di UX-DR2, ed è la prima cosa che una revisione contesterà.** La regola generale dice che i colori di sezione vivono nella navigazione; `design-system.md` §5 prescrive però *questa* barra in *quel* token, ed è la regola più specifica. Il precedente esiste ed è nel repository dalla 3.2: il campo di risposta prende bordo `--sec-prequalifica` e alone nella sua tinta al fuoco (`globals.css:629-630`, con il commento a `:1040` che ne discute la portata). Il commento sopra le tre regole deve dirlo, altrimenti qualcuno lo «correggerà».
  - [x] Nessun colore d'allarme e nessuna soglia: la barra ha un colore solo, sempre, a qualunque riempimento (AC2). Serve a distinguere una scheda finita da una lasciata a metà, non a mettere fretta.
  - [x] Nessun `transition` sulla larghezza: il valore non cambia sotto gli occhi di chi guarda — arriva già calcolato dal server — e `design-system.md` §4 non ammette animazioni decorative.

- [x] **Task 5 — Il trigger su `answers`, se la Domanda 1 è A** (AC: —, ma è il debito che questa story è incaricata di chiudere)

  > Task condizionato. Se la Domanda 1 è **B**, di questo Task si esegue **solo** la prima casella — la rivalidazione di `/clienti/[id]`, che serve all'AC1 — e il resto non si fa: nessuna migrazione, nessun `revalidatePath('/clienti')`, e `deferred-work.md:131` riceve un'annotazione col nuovo punto di ripresa (Task 6).

  - [x] `src/app/(app)/clienti/answer-actions.ts:93-101`: si aggiunge `revalidatePath(\`/clienti/${data.assessments.client_id}\`)`. **Questa riga serve all'AC1 in entrambe le varianti**: senza, si compilano dieci risposte, si torna alla scheda cliente e il contatore dice ancora quello di prima. Il commento che oggi motiva l'assenza delle due chiamate va riscritto per la parte che scade, e **non cancellato**: la parte su `/clienti` resta vera finché il trigger non c'è.
  - [x] Migrazione nuova `supabase/migrations/0016_answers_touch_assessment.sql`, applicata **prima** del codice che la usa (`kb-0.md` §10, `guide-for-vercel-supabase.md` §6). Si applica con `apply_migration` passando il nome **con il prefisso numerico** (`0016_answers_touch_assessment`), e subito dopo si verifica il registro con `list_migrations`: è la trappola documentata in `database.md` §7, costata un allineamento a mano alla 0008.
  - [x] La dichiarazione di reversibilità in testa, nelle **tre chiavi esatte** di `database.md` §7, in quest'ordine e scritte lettera per lettera, **senza `cascade`** nell'annullamento (D24). `migrations.test.ts` le verifica e il conteggio dei test cresce di quattro.
  - [x] La funzione ricalca `set_updated_at` della 0006: `language plpgsql`, `security invoker`, `set search_path = ''`. Fa un `update public.assessments set updated_at = pg_catalog.now() where id = new.assessment_id` e ritorna `null`, che è quello che un trigger `after ... for each row` deve ritornare.
  - [x] **Il valore scritto non conta e va detto nel file**: `assessments_set_updated_at` è un trigger `before update` sulla stessa tabella (`0006_triggers.sql:44-46`) e riscriverà comunque `updated_at = now()`. Il `set` esiste perché un `update` senza `set` non è SQL valido, e il valore scelto è lo stesso che il trigger metterebbe, così le due righe non possono divergere.
  - [x] **Il trigger è `after update of content on public.answers`, non `after insert or update`.** La colonna è quella e una sola: `open_assessment` inserisce le ventiquattro risposte nella stessa transazione in cui inserisce la scheda, quindi `assessments.updated_at` è già di quell'istante, e un trigger sull'`insert` produrrebbe ventiquattro riscritture della stessa riga per non cambiare niente. `saveAnswer` fa `update({ content })` (`answer-actions.ts:76-81`) ed è l'unica scrittura che deve svegliare la scheda.
  - [x] `security invoker` e non `definer`: le policy della §6 di `database.md` filtrano dentro il trigger come fuori, e la riga di `assessments` da toccare è dello stesso proprietario della risposta appena scritta. Un `definer` qui vorrebbe dire una funzione capace di toccare la scheda di chiunque, per un beneficio che non esiste.
  - [x] Sempre in `answer-actions.ts`, si aggiunge `revalidatePath('/clienti')`: da questa migrazione in poi `assessments.updated_at` si muove davvero, quindi l'ordine dell'elenco cambia (FR11, `database.md` §5, `last-activity.ts`). **Prima della migrazione questa chiamata sarebbe costo a effetto zero**, ed è testualmente l'argomento con cui la 3.3 l'aveva rifiutata: le due cose si fanno insieme o non si fanno.
  - [x] `database.md` §4 elenca i trigger per tabella e `§7` l'elenco dei file di migrazione: entrambi crescono di una riga. Una migrazione che non compare in quell'elenco è una migrazione che il prossimo lettore non sa che esiste.

- [x] **Task 6 — Il debito che questa story chiude, sposta o apre** (AC: —)

  - [x] Le convenzioni di `deferred-work.md` sono strette e vanno rispettate alla lettera. **L'intestazione di sezione è in inglese** — formula fissa, non si traduce — e tutto il resto è in italiano: `## Deferred from: implementazione della story 4-1-vedere-a-che-punto-e-ogni-scheda (10 agosto 2026)`, appesa **in fondo** al file.
  - [x] Forma di una voce nuova, un bullet solo per quanto lungo: **titolo in grassetto che dice il difetto e non il rimedio**, con `percorso/file.ts:righe`, poi la prosa su cosa succede e cosa lo rende raggiungibile, poi `Rimandato:` col motivo, poi `Da riprendere` o `Da chiudere` **con il punto di ripresa nominato**: una story numerata o un evento contabile, mai un generico «più avanti».
  - [x] **Una voce esistente non si riscrive: le si appende in coda un'annotazione** che comincia con un marcatore in grassetto che nomina story e data — `**Annotazione dalla Story 4.1, il 10 agosto 2026**:` — e se un'annotazione precedente si scopre falsa si corregge **in vista**, citandone il testo fra virgolette invece di cancellarlo. **La barratura è solo per una voce chiusa per intero.**
  - [x] La voce **riga 131** (salvare una risposta non muove `assessments.updated_at`) è la voce di questa story, e riceve trattamenti opposti secondo la Domanda 1. Se **A**: si **chiude**, barrandola per intero, con la misura che lo prova — la sonda sui `ctid` del Task 7 — e dicendo quale forma ha preso il trigger (`update of content` e non `insert or update`), perché è l'unico scostamento dalla strada che la voce stessa aveva scritto. Se **B**: si annota col nuovo punto di ripresa e col motivo, e l'annotazione deve dire che `revalidatePath('/clienti/[id]')` da `saveAnswer` **è stata scritta** e non chiude niente — è la terza volta che quella voce rischia di sembrare chiusa per una rivalidazione, e le prime due sono già scritte dentro di lei.
  - [x] La voce **riga 121** (la macchina dei quattro stati scritta tre volte) dice «da chiudere alla terza, che è l'Epic 4». Questa è la prima story dell'Epic 4 e apre `assessments-card.tsx`. Secondo la **Domanda 2**: se **A**, si chiude e si barra; se **B**, si annota col punto di ripresa scelto e col motivo, e l'annotazione deve dire che la card è stata aperta senza estrarre niente — perché una voce che nomina un file toccato da una story che non la chiude va detta, o la prossima persona penserà che nessuno ci sia passato.
  - [x] La voce **riga 127** (`block_id` non copiato dentro `answers`) si annota **solo se i numeri cambiano**. Alla creazione di questa story sono identici a quelli che la 3.6 ha già scritto — 1 scheda, 24 risposte, **0 con contenuto** — quindi non c'è niente di nuovo da dire. La verifica di sessione di questa story è però la prima che ha bisogno di risposte **con contenuto** per essere vera (AC2 chiede un contatore diverso da zero): se ne lascia, quella è la misura che quella voce aspetta da cinque story, e va scritta col numero.
  - [x] La voce **riga 41** (nello stato d'errore della card non resta nessun modo di creare) riguarda le stesse tre card della voce 121 e va riletta insieme a lei. Questa story non la tocca; se la Domanda 2 è A e l'estrazione avviene, va detto **se** l'estrazione l'ha chiusa o l'ha soltanto spostata in un file solo, che non è la stessa cosa.
  - [x] Ogni scostamento dal conteggio previsto — voci nuove, annotazioni in più o in meno — si dichiara nel Dev Agent Record **col motivo**. Nel File List la riga prende la forma già usata: `docs/bmad/implementazione/deferred-work.md   MODIFICA — <n> voci nuove, <m> annotazioni, <k> chiuse`.

- [x] **Task 7 — Verifica** (AC: 1, 2, 3, 4)

  - [x] `npm run typecheck`, `npm run build`, `npm test`. I test attesi partono da **216** e crescono di quelli di `assessment-progress.test.ts`, più **quattro** se la Domanda 1 è A (`migrations.test.ts` gira una volta per file `.sql`). **Il numero atteso si dichiara prima di eseguire**, non dopo.
  - [x] **Grep dell'AC4, che è l'unico modo automatico di provare un'assenza**: `grep -rn "from('questions')\|from('question_blocks')" "src/app/(app)/clienti/"` deve restare a **zero righe**. È lo stesso grep della 3.4 e della 3.6, e qui prova la cosa più importante della story: il denominatore non guarda il questionario di oggi.
  - [x] **Grep del confine fra server e browser**: `grep -n "answers" "src/app/(app)/clienti/[id]/assessments-card.tsx"` deve dare **zero righe**. La card riceve due numeri e non una riga di risposta. Se ne desse una, il testo di ogni risposta di ogni scheda del cliente starebbe nel payload della pagina.
  - [x] Grep di perimetro coi numeri attesi dichiarati **prima**: `grep -rn "total_questions" src/` deve toccare, oltre ai file che questa story dichiara, solo righe preesistenti — `database.types.ts` è generato e non si modifica a mano. Si conta con `grep -rln "total_questions" src/ | wc -l` e si scrive l'esito, non l'intenzione. *(La 3.6 ha pagato una patch di revisione per aver spuntato una casella su una condizione impossibile: la condizione qui è «solo righe preesistenti», non «solo i file dichiarati».)*
  - [x] **La misura di AC2, e si scrive col numero.** Riproduzione statica servita in locale con `globals.css` vero, come nella 3.3, 3.4, 3.5 e 3.6, e valori da `getComputedStyle` invece che giudizi: larghezza della barra **64px**, altezza **4px**, `border-radius` pieno, colore del riempimento uguale a `--sec-prequalifica`, colore del fondo uguale a `--surface-sunken`. Più la larghezza del riempimento a `0 / 24`, a `12 / 15` e a `15 / 15`: devono essere 0, il 80% di 64 e 64.
  - [x] Misura a **375px** della riga completa — data, interlocutore, `bozza`, pillola, contatore e barra sono sei cose su una riga sola: si guarda se `.assessment` va a capo e **dove**, e se `documentElement.scrollWidth` supera 375. `.assessment` è già `flex-wrap: wrap` con `gap: 4px 12px`, quindi andare a capo è il comportamento previsto e non un difetto; la cosa da provare è che **contatore e barra non si separino mai**, che è la ragione del contenitore `.progress`.
  - [x] Verifica dell'allineamento: `.assessment` è `align-items: baseline` e la pillola è alta 22px con `display: inline-flex`. Si misura, non si giudica: se la riga si scompone, la correzione è nel CSS della riga e va scritta col motivo.
  - [x] Sonda SQL in transazione annullata, con la stessa forma delle quattro story precedenti — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'; … rollback;` in una sola `execute_sql`. **Prima cosa da provare, ed è AC3 a database**: scrivere `'   '` in `answers.content` e verificare che il conteggio `count(*) filter (where coalesce(trim(content),'') <> '')` resti quello di prima. La definizione dell'applicazione e quella di `database.md` §3 devono dare lo stesso numero sullo stesso dato.
  - [x] Sonda dell'AC4, che è la più importante e la meno ovvia: sulla scheda esistente, aggiungere una domanda attiva al questionario dentro la transazione e verificare che `assessments.total_questions` resti **24** e che le righe di `answers` restino **24**. Nessuna delle due cambia, perché niente le tocca — ed è precisamente questo che la sonda prova.
  - [x] **Solo se la Domanda 1 è A** — sonda del trigger: dentro la stessa transazione, confrontare il `ctid` della riga di `assessments` **prima e dopo** un `update` su `answers.content`. Dentro una transazione `now()` è fermo, quindi `updated_at` **non** discrimina: è la lezione della 3.3, si applica e non si riscopre. E una seconda sonda che prova la scelta di `update of content`: un `insert` in `answers` **non** deve riscrivere la riga della scheda.
  - [x] **Solo se la Domanda 1 è A** — sonda della policy: lo stesso `update` su `answers` con un `sub` diverso deve toccare zero righe, e il trigger non deve poter toccare la scheda di un altro proprietario.
  - [x] Le caselle che richiedono una sessione vera stanno in **«Verifica di sessione»**, in fondo. `done` non lo mette la revisione: lo mette Luca dopo averle passate.

### Review Findings

Revisione del 10 agosto 2026, tre strati in parallelo: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Sette reperti scartati come rumore.

**Le quattro AC sono soddisfatte e il perimetro è rispettato alla lettera.** Nessuno dei dieci file dichiarati fuori perimetro è stato aperto, `loading.tsx` compreso; i tre grep del Task 7 danno l'esito dichiarato (0 righe, 0 righe, 11 file di cui 6 verificati intatti con `git diff --quiet`); 228 test verdi, `typecheck` e `build` muti. Il trigger è stato riletto **dal database** e non dal file: `AFTER UPDATE OF content ON public.answers`, `prosecdef = false`, `search_path=""`, registro a sedici voci tutte col prefisso. AC4 regge per costruzione e il grep che la protegge può fallire.

**I numeri del Dev Agent Record reggono al ricalcolo,** con tre eccezioni tutte nella prosa e nessuna nel codice: sono l'ultimo `[Patch]` qui sotto.

**Quello che la revisione ha trovato non è nel codice nuovo, ma nel suo bordo.** Due reperti dicono la stessa cosa da due parti: questa story ha reso vere due condizioni che altri due file avevano scritto come «non ancora vere», e quei due file non sono stati riaperti perché erano fuori perimetro. È la conseguenza prevista dalla riga «se sembra necessario aprirne uno, fermati e dillo» — solo che il momento in cui diventa necessario è arrivato dopo.

- [x] [Review][Decision] **`saveVerdict` non rivalida `/clienti/[id]`, e da oggi quella card rende il verdetto** — `src/app/(app)/clienti/verdict-actions.ts:143-145` porta scritto: «`/clienti/[id]` no: la card del cliente non rende oggi nessuna delle cinque colonne… **Diventerà necessaria quando quella card mostrerà l'esito e l'avanzamento**». Questa story mostra l'esito, quindi la condizione si è avverata nello stesso commit che lascia la riga fuori. Percorso: apro `/clienti/X`, la pillola dice `non deciso`; entro nella scheda dalla data, scrivo verdetto `sì`; torno indietro col collegamento `← Cliente`, che è navigazione lato client, e la card può ancora dire `non deciso`. È lo stesso difetto che la 3.6 ha **misurato** per `completion_status` («si chiude una scheda, si torna al cliente, e la riga dice ancora `bozza`») e chiuso aggiungendo esattamente quella riga in `completion-actions.ts:112`. Delle tre scritture della schermata di compilazione, ora due su tre rivalidano `/clienti/[id]` e una no. **La decisione è di Luca perché `verdict-actions.ts` è dichiarato fuori perimetro:** o si apre ora per una riga più il commento che scade, o si rimanda dicendo dove.
- [x] [Review][Decision] **Il commento di `save-bar.tsx` dichiara un costo che questa story ha appena alzato** — `src/app/(app)/clienti/[id]/schede/[assessmentId]/save-bar.tsx:35-37`: «nel caso peggiore la stessa scrittura parte due volte con lo stesso valore. **Costa un `updated_at` mosso due volte e nient'altro** — una difesa in più sarebbe una macchina per un danno che non c'è». Dopo la 0016 costa anche l'`updated_at` della **scheda** e la posizione del cliente nell'elenco. La story ha annotato la voce del ledger che faceva la stessa affermazione (`deferred-work.md`, sezione della 3.4) e ha lasciato intatta quella nel codice, che è il posto dove qualcuno la leggerà per decidere di non aggiungere la difesa. **Stessa decisione della voce qui sopra e stesso file vietato:** la cartella `schede/` è dichiarata «non si apre affatto».
- [x] [Review][Decision] **Il contatore non ha nessun nome accessibile, e la barra che poteva darglielo è `aria-hidden`** — `src/app/(app)/clienti/[id]/assessments-card.tsx:157-169`. La riga letta da un lettore di schermo suona «10 agosto 2026, Mario Rossi, bozza, non deciso, **0 / 24**»: due cifre nude. La motivazione scritta per l'`aria-hidden` — «la barra ripete il numero che il contatore dice per esteso» — presuppone che il contatore dica qualcosa per esteso, e non lo dice. Il `role="progressbar"` scartato avrebbe portato con sé `aria-valuetext`, cioè un'etichetta; toltolo, non è stato messo niente al suo posto. Confronto interno: lo stato di compilazione è una parola e il verdetto è una parola, quindi l'avanzamento è **l'unico dei tre** a non essere comprensibile senza vedere lo schermo. **La decisione è di Luca perché il Task 3 prescrive questo markup con la sua motivazione:** aggiungere un `aria-label` sul contenitore `.progress` è uno scostamento dalla specifica, e l'alternativa è mandarlo alla 5.2 con le altre voci di accessibilità già lì.
- [x] [Review][Patch] **Il commento che autorizza `--sec-prequalifica` nel contenuto cita come precedente un difetto registrato, e con la data sbagliata** [`src/app/globals.css:907-911`] — dice «Il precedente sta già nel repository **dalla 3.2** — il campo di risposta prende bordo e alone nella stessa tinta al fuoco (`.input:focus` qui sopra). Chi lo «corregge» applica la regola sbagliata». Due cose non reggono. La data: `globals.css:1072` dice che «`.input:focus` dichiara **da sempre** `--sec-prequalifica`», e la voce a ledger la data al 2 agosto 2026. E, che conta di più, `.input:focus` **non è un precedente ma un difetto aperto**: `globals.css:1072-1077` avverte che quella tinta è giusta **solo** sulla schermata di compilazione e che su ogni altra è sbagliata, con la voce assegnata alla 5.2. La barra nuova sta su `/clienti/[id]`, cioè su una delle «ogni altra». Che la barra debba essere `--sec-prequalifica` resta giusto — `design-system.md` §5 lo prescrive per quel componente, ed è la regola più specifica — sbagliato è l'argomento con cui la si difende, e quella frase finirà davanti a chi eseguirà la 5.2, il cui compito è correggere proprio `.input:focus`. Da riscrivere tenendo la §5 e togliendo il precedente.
- [x] [Review][Patch] **`database.md` §3 continua a dare l'SQL dell'avanzamento senza dire che non gira, mentre §5 per lo stesso caso ha la sua nota** [`docs/database.md:232-243`] — il blocco `### Avanzamento` dà `count(…) filter (where coalesce(trim(ans.content), '') <> '')` e nient'altro: niente dice che il calcolo vive in `src/lib/assessment-progress.ts` e che quella query non la esegue nessuno. Un paragrafo più in là la §5 fa esattamente il contrario per l'ultima attività — «**Come è calcolata davvero, dalla Story 1.6.** Il SQL qui sopra resta la definizione, ma non è quello che gira» — ed è la stessa forma e lo stesso motivo (D23), citato dalle Dev Notes di questa story. Questa story ha aperto `database.md` per due altre aggiunte e non ha fatto la terza. Chi cercherà l'avanzamento partendo dallo schema, che è il percorso previsto, non troverà il codice.
- [x] [Review][Patch] **`countAnswered` riceve l'innesto senza il `?? []` che il gemello dichiara indispensabile** [`src/app/(app)/clienti/[id]/page.tsx:137`] — `src/lib/last-activity.ts:28-32` scrive `row.assessments ?? []` con la motivazione esplicita: «se rispondesse `null` il `for` cadrebbe dentro un componente server, cioè fuori dal ramo d'errore della pagina, che quindi non riuscirebbe a rendersi». `countAnswered` cicla un innesto della **stessa natura**, passato nudo, dentro lo **stesso** componente server, e per giunta **dopo** il ramo `if (assessmentsError)`: un `TypeError` lì non dà la card in errore — che la pagina sa rendere — ma porta via la scheda cliente intera, anagrafica e persone comprese. Non raggiungibile oggi: PostgREST risponde `[]` sugli innesti vuoti e il tipo lo dichiara non nullabile. Quello che manca è che la difesa già giudicata utile una volta non è stata portata sul secondo consumatore della stessa forma, e le due righe ora dicono cose diverse sullo stesso rischio.
- [x] [Review][Patch] **`progressFillPercent` non è totale come promette, e il test omonimo non lo prova** [`src/lib/assessment-progress.ts:57`] — la docstring dichiara che la funzione esiste perché «`width: NaN%` è una barra che sparisce senza dare nessun errore» e che «dev'essere totale lo stesso». La guardia è `if (total <= 0) return 0`, e `NaN <= 0` è **falso**: `progressFillPercent(0, NaN)` esegue `Math.min(100, NaN)` e risponde `NaN`, che finisce nel DOM come `width: NaN%` — esattamente l'esito che la funzione dichiara di impedire. Il test si chiama «risponde 0 e mai NaN» e prova `0`, `3/0` e `-1`, mai un ingresso non numerico. Non raggiungibile dallo schema, dove `total_questions` è `not null` intero: è la promessa scritta a non essere mantenuta, e costa un carattere — `if (!(total > 0))` — più il caso nel test.
- [x] [Review][Patch] **Tre numeri della prosa che il diff smentisce** — nessuno nel codice, tutti nel Dev Agent Record e nelle caselle. (a) Il File List dice «`sprint-status.yaml` MODIFICA — 4-1 **da ready-for-dev a review**»: il diff mostra `backlog → review`, e in più una seconda riga non dichiarata, `epic-4: backlog → in-progress`. Il Change Log dice «Story creata, `ready-for-dev`», quindi il difetto vero è che la creazione della story non aveva aggiornato il file — ma il File List racconta una transizione che non è avvenuta. (b) Il Task 2 prescrive «l'oggetto esplicito con le **sei** chiavi» e `page.tsx:129-138` ne costruisce **sette** (le sei colonne più `answered`): il codice è giusto e le Completion Notes dicono «sette» senza notare che la casella spuntata diceva sei. (c) Il Task 4 elenca per `.progress__fill` solo «alto 100%, fondo `--sec-prequalifica`», e il codice aggiunge `display: block`, **necessario** — è uno `<span>`, quindi in linea, e su un elemento in linea non sostituito `height: 100%` non ha effetto; `.progress__bar` è blockificato perché figlio flex, `.progress__fill` no. Aggiunta corretta e non dichiarata. Da riscrivere i tre punti con l'esito vero.
- [x] [Review][Defer] **Il trigger 0016 scatta anche su una riscrittura identica, e `onBlur` è il terzo percorso che la produce** [`supabase/migrations/0016_answers_touch_assessment.sql:57`] — `after update of content` scatta perché la colonna compare nel `set`, non perché il valore cambi, e `saveAnswer` fa sempre `update({ content })` senza confrontare. Il repository documenta già due percorsi che rimandano lo stesso testo (il `visibilitychange` e il doppio avvio da `Salva`); il terzo è l'uscita dal campo, che dalla 1.2 non porta la guardia `attempted.current === value` e che nessuna voce nomina. Da oggi ognuno dei tre muove `assessments.updated_at` e riporta il cliente in cima. **Rimandato: la story ha già annotato la voce del `visibilitychange` e ha dichiarato per iscritto perché non lo gonfia** — «il cliente ci finirebbe comunque, perché ci si sta davvero lavorando sopra». Resta che la 0016 argomenta per pagine perché è `update of content` e non `insert or update`, e non applica lo stesso ragionamento all'update a valore invariato: la chiusura è `when (old.content is distinct from new.content)`, cioè una migrazione nuova, ed è la strada da valutare insieme alla guardia che le tre voci del ledger chiedono già.
- [x] [Review][Defer] **Ogni salvataggio di risposta prende ora un lock esclusivo sulla riga della scheda** [`supabase/migrations/0016_answers_touch_assessment.sql:47`] — la schermata di compilazione ha ventiquattro campi con timer indipendenti: l'uscita dal campo A e il timer del campo B partono insieme, due server action concorrenti aggiornano due righe di `answers` diverse, e i due trigger fanno `update public.assessments … where id = <la stessa>`. Il secondo aspetta il commit del primo. Nessun deadlock è possibile — nessuna transazione prende `assessments` prima di `answers` — e oggi sono transazioni corte, quindi è accodamento e non guasto. Diventa un guasto il giorno che qualcosa tiene quella riga più a lungo: l'attesa incontra `statement_timeout`, l'`update` su `answers` fallisce, e `saveAnswer` risponde `ANSWER_NOT_SAVED` su un salvataggio che chi scrive crede al sicuro — cioè la promessa non negoziabile del prodotto. **Rimandato: è una proprietà nuova introdotta dalla 0016 e non un difetto raggiungibile**, e niente si può scegliere senza vederla succedere con più di una scheda.
- [x] [Review][Defer] **Un riempimento non nullo può leggersi come vuoto: `1 / 24` sta quasi tutto dentro il tappo arrotondato** [`src/app/globals.css:923-935`] — `.progress__bar` ha `border-radius: var(--r-full)` con `overflow: hidden` su una barra alta 4px, quindi i tappi misurano 2px per lato; `1 / 24` dà 4,17% di 64px, cioè **2,67px**, che cade quasi per intero dentro la curva sinistra. «Una risposta data» e «nessuna risposta» rendono quasi la stessa barra, e il compito dichiarato — distinguere una scheda finita da una lasciata a metà — fallisce proprio al primo passo. **Rimandato: nessuna informazione si perde**, perché il contatore accanto dice `1 / 24` per esteso ed è lui il portatore (UX-DR2 regola 4); e il rimedio — un `min-width` sul riempimento — è una regola in più che `design-system.md` §5 non prescrive, quindi va decisa guardandola su dati veri e non sulla riproduzione statica.
- [x] [Review][Defer] **La voce del `visibilitychange` cita righe e condizione che il codice non ha** [`docs/bmad/implementazione/deferred-work.md`, sezione della 3.4] — la voce punta a `src/lib/use-editable-field.ts:167-184` chiamandolo «l'effetto del `visibilitychange`», ma a quelle righe c'è il **timer del salvataggio automatico**; l'ascoltatore sta a `:192-209`. E afferma che l'ascoltatore «copia alla lettera la condizione dell'uscita dal campo — `if (autosave && dirty && !pending) write(value)`», mentre il codice vero con `pending` non salta la scrittura: la ricorda in `owedExit.current`. **Rimandato perché è preesistente e questa story ha fatto la cosa giusta**: la convenzione del ledger dice che una voce non si riscrive, le si appende un'annotazione, ed è quello che è stato fatto. Da riallineare quando quella voce si chiude — il ledger vale in quanto verificabile, e la 3.6 si è già corretta con la frase «una voce di questo ledger che il primo grep smentisce non serve a niente».

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

| Cosa | Dove | Da quando |
|---|---|---|
| `total_questions`, congelato all'apertura e mai aggiornato | `assessments`, migrazione `0005`, scritto da `open_assessment` | 2 agosto / 3.1 |
| Le righe di `answers` create tutte all'apertura, con `content` a `null` | `open_assessment`, `0013` → `0014` → `0015` | 3.1 |
| La definizione di «vuoto» applicata in scrittura | `normalizeTextValue`, `src/lib/client-fields.ts:75-79` | 1.2 |
| La pillola di verdetto, coi suoi quattro casi e i suoi tre inchiostri | `src/components/verdict-pill.tsx` | 3.5 |
| Le etichette dei quattro verdetti | `VERDICT_LABELS`, `src/lib/verdict.ts` | 3.5 |
| La riga della scheda coi suoi tre figli e i quattro stati della card | `assessments-card.tsx` | 3.1, estesa dalla 3.6 |
| Il precedente di un calcolo che PostgREST non fa, in memoria e sotto test | `src/lib/last-activity.ts` | 1.6 |
| Il trigger che muove `assessments.updated_at` sugli `update` alla tabella | `assessments_set_updated_at`, `0006` | 2 agosto |

**Questa story scrive poco codice e legge molti documenti.** Le quattro AC sono due numeri e una barra; quello che le rende difficili è che tre di esse — AC1 per l'esito, AC3 per gli spazi, AC4 per il denominatore — sono già state decise altrove, e sbagliarle vuol dire non aver letto dove.

### Le tre cose che la riga guadagna, e perché sono tre e non due

`assessments-card.tsx:29-31` dice oggi:

> Restano fuori, e arrivano con l'Epic 4: la pillola di verdetto (4.2), il contatore delle risposte e la barra di avanzamento (4.1). Chi implementa la 4.1 troverà quindi la riga già a tre figli e dovrà aggiungerne due, non tre.

**È sbagliato in un punto e scaduto nell'altro**, e va corretto invece che seguito. Tre fonti dicono il contrario, e nessuna è ambigua:

- **L'AC1 di questa story**, nell'epic: «vedo l'elenco delle sue schede con data, **esito** e avanzamento (FR24)».
- **Il PRD**, §4, «Scheda cliente»: «Ogni scheda nell'elenco mostra data, esito e **avanzamento della compilazione**».
- **La risposta di Luca alla Domanda 1 della 3.6**, il 10 agosto: «la riga della scheda è già a tre figli, e **l'esito, il contatore e la barra** saranno il quarto, il quinto e il sesto — non i primi tre».

La Story 4.2 è l'esito **nell'elenco clienti**, cioè un'altra schermata e un'altra query: il suo titolo lo dice e le sue AC parlano di «la sua riga nell'elenco». Il commento della card ha confuso le due, e `types.ts:22-24` invece dice la cosa giusta. Correggere il commento fa parte del Task 3, e non è cosmesi: è la stessa cosa che la 3.6 ha dovuto fare su queste stesse righe, per la stessa ragione.

### Come si conta l'avanzamento, e cosa costa

`database.md` §3 dà la definizione in SQL:

```sql
count(ans.id) filter (where coalesce(trim(ans.content), '') <> '') as answered
```

**Quel SQL non gira, e la definizione resta quella.** È la stessa forma già decisa per l'ultima attività con D23: PostgREST non calcola aggregati sulle righe innestate in un modo che qui convenga, e ottenerlo dal database vorrebbe dire o una vista o una colonna materializzata, cioè una migrazione per rendere un numero a schermo. Si legge `answers(content)` innestato e si conta in memoria, in `src/lib/assessment-progress.ts`.

**Il costo, dichiarato invece che scoperto dopo.** Contare in memoria vuol dire trasferire il contenuto di tutte le risposte di tutte le schede di quel cliente: con una scheda sono 24 righe, con dieci schede 240, e una risposta è testo lungo per natura. Sulla scheda di **un** cliente è un costo piccolo e limitato; su un elenco di clienti sarebbe un'altra cosa, ed è il motivo per cui la Story 4.2 — che tocca l'elenco — **non** può copiare questa soluzione e dovrà leggere solo `verdict`.

**Quando questa scelta smette di valere, e come ci si accorge:** il giorno in cui un cliente ha decine di schede, cioè quando la pagina del cliente diventa lenta a caricarsi e non a rendersi. Da lì la strada è l'aggregato di PostgREST sull'innesto (`answers(count)` con un filtro sulla risorsa innestata) oppure una colonna `answered` mantenuta dal trigger della 0016, e nessuna delle due è gratis: la prima **cambia la definizione di «vuoto»**, perché un filtro PostgREST sa dire `content is not null` ma non `trim(content) <> ''`, e AC3 tornerebbe a dipendere dal fatto che `saveAnswer` normalizza in scrittura invece che dal conteggio. Oggi le due definizioni sono la stessa funzione importata da due punti, ed è la cosa che le tiene d'accordo.

**Dove avviene la riduzione conta quanto il calcolo.** `assessments-card.tsx` è `'use client'`: le sue prop finiscono nel payload spedito al browser. Il conteggio sta in `page.tsx`, che è un componente server, e alla card arrivano `answered` e `total_questions`, due numeri. È `kb-0.md` §4 applicato al trasporto e non solo ai log: le risposte dei clienti sono la categoria di dato più sensibile del sistema, e non c'è nessuna ragione perché il browser ne veda una riga su una schermata che mostra un `12 / 15`.

### Il denominatore è congelato, e AC4 si soddisfa non scrivendo codice

`total_questions` lo scrive `open_assessment` una volta sola, col numero di righe di `answers` **scritte davvero** e non con un conteggio letto un istante prima (`0014`, poi `0015:174-190`). Non lo aggiorna nessuno, mai: è la decisione D16, ed è scritta in `database.md` §3 con il suo motivo — «altrimenti aggiungere una domanda oggi farebbe tornare incomplete le schede chiuse ieri», che è AC4 parola per parola.

Le righe di `answers` sono congelate allo stesso modo: nascono tutte all'apertura, con `content` a `null`, e nessuna scrittura ne aggiunge o ne toglie. Disattivare una domanda oggi non tocca le schede di ieri (2.6), riscriverne il testo nemmeno (0015).

**Conseguenza operativa: AC4 non si implementa, si protegge.** L'unico modo di romperla è leggere `questions` da questa schermata per contare le domande attive — che è precisamente ciò che il grep del Task 7 vieta, ed è lo stesso grep che la 3.4 ha introdotto per la schermata di compilazione.

### Il trigger che manca su `answers`, e perché la decisione è aperta

`deferred-work.md:131` descrive un difetto vecchio di due story: `answers_set_updated_at` tocca la riga della **risposta**, e niente risale alla scheda. Quindi si compila una scheda per un'ora, si torna all'elenco clienti, e il cliente è dov'era.

Quella voce assegna il punto di ripresa a **questa story**, con questo motivo: «è la prima a mostrare qualcosa che cambia davvero quando si salva una risposta — il contatore e la barra di avanzamento nella card del cliente — e quindi la prima in cui la rivalidazione di `/clienti/[id]` diventa necessaria invece che decorativa. Da fare lì, e in una volta sola con lei».

**Metà di quella frase è vera e mezza no, e la Domanda 1 nasce da lì.**

È vera per `/clienti/[id]`: senza quella rivalidazione, `saveAnswer` lascia la card del cliente col contatore di prima, e AC1 sarebbe vera solo dopo un ricaricamento a mano. Quella riga si scrive **in entrambe le varianti**, e non ha bisogno di nessuna migrazione.

Non è vera per il resto: il trigger serve all'**ordinamento dell'elenco clienti** (FR11), che nessuna delle quattro AC nomina. È lavoro giusto, dichiarato, e assegnato qui — ma è una migrazione dentro una story che non ne chiede nessuna, cioè esattamente la forma che `AGENTS.md` chiama deriva del piano quando non è decisa in anticipo. Per questo si decide adesso, e non durante l'implementazione.

**Se entra, entra intera.** Trigger, `revalidatePath('/clienti')` e la chiusura della voce a ledger sono una cosa sola: il trigger senza la rivalidazione lascia l'elenco fermo lo stesso, e la rivalidazione senza il trigger è costo a effetto zero — che è l'argomento con cui la 3.3 l'aveva rifiutata e che resterebbe valido.

### Cosa cambia questa story, file per file

| File | Cosa | Task |
|---|---|---|
| `src/lib/assessment-progress.ts` | **nuovo** — `countAnswered` e `progressFillPercent` | 1 |
| `src/lib/assessment-progress.test.ts` | **nuovo** — col caso dei soli spazi e quello di `0 / 0` | 1 |
| `src/lib/types.ts` | `AssessmentSummary` cresce di due colonne, `AssessmentListItem` nasce, il commento si corregge | 2 |
| `src/app/(app)/clienti/[id]/page.tsx` | due colonne e l'innesto nella `select`, la riduzione sul server | 2 |
| `.../clienti/[id]/assessments-card.tsx` | pillola, contatore, barra, e il commento sbagliato riscritto | 3 |
| `src/app/globals.css` | tre regole, accanto a quelle della riga | 4 |
| `src/app/(app)/clienti/answer-actions.ts` | `revalidatePath('/clienti/[id]')` sempre; `/clienti` solo se Domanda 1 = A | 5 |
| `supabase/migrations/0016_answers_touch_assessment.sql` | **solo Domanda 1 = A** — il trigger | 5 |
| `docs/database.md` | **solo Domanda 1 = A** — §4 e §7 crescono di una riga | 5 |
| `docs/bmad/implementazione/deferred-work.md` | almeno le voci 131 e 121 | 6 |

**E basta.** In particolare **non** si aprono: `src/app/(app)/clienti/page.tsx` e `clients-table.tsx` (sono la 4.2), `src/lib/last-activity.ts`, `assessment-actions.ts`, `verdict-actions.ts`, `completion-actions.ts`, `verdict.ts`, `verdict-pill.tsx`, `people-card.tsx`, `clienti/[id]/loading.tsx`, e tutta la cartella `schede/[assessmentId]/` tranne nulla — non si apre affatto. Se durante l'implementazione sembra necessario aprirne uno, **fermati e dillo**.

### Trappole note

**1. Fermarsi a due cose invece di tre.** La più probabile, perché il commento nel codice la suggerisce per iscritto. L'esito nella card del cliente è AC1 di **questa** story; la 4.2 è l'elenco clienti.

**2. Riscrivere la definizione di «vuoto».** Un `content?.trim()` scritto a mano dentro la pagina compila, passa i test che non esistono, e il giorno che `normalizeTextValue` cambia il conteggio e la scrittura smettono di essere d'accordo senza che niente lo dica. Si importa.

**3. Contare le domande attive invece di leggere `total_questions`.** Sembra più «giusto» — sono le domande vere del questionario — ed è la rottura esatta di AC4. Il denominatore è una fotografia, non una misura di oggi.

**4. Passare le risposte alla card.** `'use client'` in cima al file è la ragione per cui non si fa. Il grep del Task 7 lo verifica perché una dichiarazione non basta.

**5. Scrivere una seconda pillola di verdetto.** `VerdictPill` esiste dalla 3.5 e sta in `src/components/` proprio perché «la card del cliente e l'elenco la renderanno». Riscriverla vorrebbe dire due mappe di etichette e due insiemi di colori destinati a divergere.

**6. «Correggere» `--sec-prequalifica` dentro il contenuto.** È prescritto da `design-system.md` §5 per questa barra, ha un precedente nel campo di risposta, e il commento nel CSS deve dirlo. Toglierlo perché lo vieta la regola generale è applicare la regola meno specifica.

**7. Mostrare una percentuale.** AC2 la vieta esplicitamente. `progressFillPercent` restituisce un numero che finisce in un `width` e non in un testo, e il suo commento lo deve dire, perché altrimenti sarà la prima cosa contestata da chi rivede.

**8. Dividere per zero.** `total_questions` è `not null default 0`. `open_assessment` non apre schede su zero domande, quindi oggi non capita; una funzione pura che restituisce `NaN` per un ingresso ammesso dallo schema è comunque una funzione parziale, e `width: NaN%` non dà nessun errore.

**9. Colorare la barra secondo il riempimento.** «Rosso sotto il 30%» è la cosa che `design-system.md` §5 e AC2 escludono con le stesse parole: «nessuna percentuale, nessun colore d'allarme: serve a distinguere una scheda finita da una lasciata a metà, non a mettere fretta».

**10. Rivalidare `/clienti` senza il trigger.** Costo a effetto zero che sembra la correzione di un difetto, ed è l'argomento già scritto in `answer-actions.ts:97-100`. Le due cose viaggiano insieme.

### Perimetro: cosa NON entra in questa story

- **L'esito nell'elenco clienti** (4.2) e **l'esportazione in markdown** (4.3).
- **Qualsiasi filtro o ordinamento per avanzamento o per stato di compilazione**: nessuna AC lo chiede e nessun documento lo nomina.
- **Nessuna percentuale, nessuna soglia, nessun colore d'allarme**, in nessun punto (AC2).
- **La schermata di compilazione**, che non si apre: l'avanzamento vive nella scheda cliente e non lì. Aggiungerlo «già che c'ero» sopra i blocchi è una funzione non richiesta.
- **La correzione dei 40px di `.btn`** — `deferred-work.md` voce 1, che appartiene alla 5.2.
- **I due riquadri `.error-box` e `.warn-box` sotto 4,5:1** — `deferred-work.md:156`, che appartiene alla 5.2.
- **Le due voci di accessibilità aperte dalla 3.6** sul pulsante `useWrite`, che appartengono alla 5.2.
- **Il trigger 0016**, se e solo se la Domanda 1 è B.

### Test

Un modulo puro nasce e va sotto test, ed è la stessa regola applicata a `client-status.ts`, `answer-control.ts`, `save-store.ts`, `owed-exit.ts`, `verdict.ts`, `completion-status.ts` e `last-activity.ts`: la logica che, rompendosi, produce un dato sbagliato **senza dare nessun errore**.

`assessment-progress.ts` è esattamente quel caso, ed è il più puro dell'elenco: un `12 / 15` sbagliato non lancia niente, non si vede da nessuna parte, e viene creduto. I due casi che valgono davvero sono la **stringa di soli spazi** — AC3, e l'errore che una persona commette battendo la barra spaziatrice invece di cancellare — e `0 / 0`, che è l'ingresso che lo schema ammette e la funzione deve reggere.

`assessments-card.tsx` è codice del browser e di presentazione: **non** si costruisce un'impalcatura di test del DOM per lui, che sarebbe una dipendenza nuova senza motivo dichiarato (`kb-0.md` §2 e §7). Si verifica a mano, e la verifica si dichiara con i numeri.

Se la Domanda 1 è A, `migrations.test.ts` cresce di quattro test da solo, senza scrivere niente: gira una volta per ogni file `.sql` della cartella.

### Contratto visivo

Una forma nuova sola, la barra, e i suoi numeri sono già decisi da `design-system.md` §5 e da UX-DR9: contatore in monospaziato nella forma `12 / 15`, barra alta **4px**, larga **64**, raggio pieno, riempita in `--sec-prequalifica` su fondo `--surface-sunken`. Nessuna percentuale, nessun colore d'allarme.

**La pillola non ha una forma nuova**: è `VerdictPill`, cioè `.pill` con i suoi tre modificatori, e `non_deciso` è il caso base senza modificatore (`globals.css:494-516`). Su questa schermata comparirà una pillola per scheda.

**UX-DR2 regola 5, «una sola cosa colorata satura per schermata», va guardata e non ignorata.** Dopo questa story la scheda cliente porta: il punto colorato dello stato del cliente, una pillola di verdetto per scheda in tinta chiara, e una barra piena in `--sec-prequalifica` per scheda. La regola dice «di norma», e la cosa che va vista per prima su questa schermata è precisamente l'avanzamento — è il motivo per cui l'epic esiste. Le pillole restano in tinta chiara e il punto dello stato è 6px: la barra è l'unico pieno, ed è quello giusto. Se la misura a 375px mostrasse una riga rumorosa, la correzione è la disposizione e non il colore.

**`--sec-prequalifica` nel contenuto** ha già un precedente nel repository — il fuoco del campo di risposta, `globals.css:629-630` — e qui è prescritto dalla §5. Il commento sopra le regole nuove lo deve dire per esteso, o la prima revisione lo leggerà come una violazione della regola di governo del colore.

### Sicurezza

Nessuna scrittura nuova se la Domanda 1 è B; una lettura più larga in entrambi i casi, e una funzione di trigger se è A.

- **La lettura innestata si protegge da sé.** `answers_owner_all` (`0007_rls.sql:60`) filtra le risposte altrui dentro la stessa richiesta, come `assessments_owner_all` già fa per l'innesto delle schede nell'elenco clienti. Non c'è nessun controllo da riscrivere lato applicazione.
- **Il dato più sensibile del sistema non deve attraversare il confine.** Il contenuto delle risposte si legge sul server e si riduce a un numero prima di toccare qualsiasi componente `'use client'`. È l'unica ragione per cui il Task 2 è un Task e non una riga dentro il Task 3.
- **Mai `details` nei log.** Vale come sempre e qui più che altrove: la riga di `answers` contiene ciò che un cliente reale ha detto in una call. La pagina già logga solo `code` e `message`, e non cambia.
- **Il trigger è `security invoker`** (solo Domanda 1 = A): le policy filtrano dentro come fuori, e la riga di `assessments` che tocca è dello stesso proprietario della risposta scritta. Un `security definer` qui sarebbe una funzione capace di toccare la scheda di chiunque, per nessun beneficio.
- **`set search_path = ''`** e nomi schema-qualificati nel corpo, come in tutte le funzioni dalla 0006 in poi.

### Project Structure Notes

Nessuna cartella nuova, nessuna dipendenza nuova. Il modulo puro sta in `src/lib` accanto a `last-activity.ts`, che è il suo precedente esatto: un calcolo che il database potrebbe fare, non fa, e che vive sotto test.

**`assessment-progress.ts` sta fuori da `last-activity.ts` e non dentro**, benché siano due calcoli in memoria sulle stesse righe innestate. Il motivo non è la lunghezza: `last-activity.ts` risponde a «quando questo cliente è stato toccato l'ultima volta» e serve all'**ordinamento dell'elenco**; questo risponde a «quanto è piena questa scheda» e serve alla **card del cliente**. Metterli insieme creerebbe un file che due schermate importano per metà ciascuna, e il primo che aggiunge una funzione lo farebbe crescere nella direzione sbagliata.

Il componente della barra **non nasce**: sono tre `<span>` dentro la riga che li usa. Un `<Progress>` in `src/components/` avrebbe senso il giorno che una seconda schermata lo rendesse, e oggi non esiste — `StatusPill` e `VerdictPill` stanno là perché due schermate le rendono davvero, e la barra ne ha una sola. Se la 4.3 o la 5.1 ne avessero bisogno, quel giorno il file nasce, e sarà una decisione e non una previsione.

### Piattaforma in uso, verificata

Letti da `package.json` e invariati alla baseline: Next **16.2.12**, React **19.2.8**, `@supabase/ssr` **0.12.4**, `@supabase/supabase-js` **2.111.0**, TypeScript **5.9**. Postgres **17.6.1.155**, regione `eu-west-1`. Il proxy è `src/proxy.ts`: da Next 16 `middleware.ts` è deprecato.

Niente di quello che questa story usa è nuovo. L'innesto a due livelli — `assessments` con `answers(...)` — è la stessa forma che `clienti/page.tsx:41` usa da 1.6 per `clients` con `assessments(updated_at)`, e che `answer-actions.ts:80` usa al contrario per risalire da `answers` a `assessments`. Nessuna API della piattaforma che non sia già in uso in almeno due file.

### Stato del database, e cosa vuol dire per la verifica

Misurato il 10 agosto 2026 sul progetto `izkycpwxuedpkzgpvcxc`.

| | Dichiarato dalla 3.6 alla sua chiusura | Oggi |
|---|---|---|
| clienti / persone | 3 / 1 | 3 / 1 |
| schede / risposte | 1 / 24 | 1 / 24 |
| risposte con contenuto | 0 | **0** |
| questionari / blocchi | 1 / 9 | 1 / 9 |
| domande, di cui attive | 24 / 23 | 24 / 23 |

Quindici migrazioni a registro, tutte col prefisso numerico: `list_migrations` risponde da `0001_extensions` a `0015_answer_question_copy` senza nomi spogli. Chi applica la 0016 verifichi subito dopo che il registro sia ancora così (`database.md` §7).

**Due conseguenze per questa story.**

La prima riguarda le sonde: la scheda esistente è a `0 / 24`, cioè il caso limite della barra vuota, ed è il valore che la riproduzione statica deve rendere per primo. Il `12 / 15` di AC2 non esiste a database e non deve esistere: si misura sulla riproduzione statica, che è dove i numeri si scelgono.

La seconda riguarda la verifica di sessione, e va detta chiara perché è la prima volta in cinque story. **AC2 non si può passare senza scrivere risposte vere**: un contatore diverso da zero richiede che qualcosa sia stato scritto e sia rimasto. Se Luca compila e tiene, `deferred-work.md:127` riceve finalmente la misura che aspetta da cinque story — e va scritta col numero, contando le righe di `answers` **e** quante hanno contenuto, non deducendola dalla data. Le previsioni su questo punto sono state scritte e smentite quattro volte.

### Intelligence dai commit e dalla story precedente

Gli ultimi commit sono `e109999` (chiusura 3.6, e con lei l'Epic 3), `628c7bf` (chiusura 3.5), `1cc5e25` (implementazione e revisione 3.5). **La forma è costante da sei story e va rispettata: un commit di implementazione con la revisione già applicata, poi un commit separato che chiude la story dopo la verifica di sessione di Luca.** Lo stato `done` non lo mette la revisione.

Dalla 3.6 e dalla sua revisione, cinque cose di metodo che questa story riusa invece di riscoprire:

- **Un numero dichiarato nel Dev Agent Record viene ricalcolato in revisione.** La 3.6 ne ha dichiarati due sbagliati — un'eccedenza di 44px che era la larghezza del pannello, e una causa attribuita alla riga d'errore che la rimisura ha smentito. I numeri di questa story sono quasi tutti misure di CSS: si prendono da `getComputedStyle`, non a occhio.
- **Uno scheletro di caricamento si valuta sulla dimensione che si muove**, non su quella che si è misurata per prima: la 3.6 ha misurato l'altezza e il salto era orizzontale. Qui la conclusione è di non toccarlo, ed è scritta col motivo nel Task 3 proprio perché non sembri una dimenticanza.
- **Una casella non si spunta su una condizione irrealizzabile.** La 3.6 ne aveva una che nessun esito poteva soddisfare. Le condizioni dei grep del Task 7 sono scritte in modo da poter fallire.
- **Una voce del ledger che sembra più chiusa di quanto è, è un difetto.** La voce 131 lo ha già rischiato due volte, con la 3.5 e con la 3.6. Questa è la story che la chiude o la sposta, ed è l'ultima occasione per dirne la verità.
- **Le decisioni prese durante l'implementazione si scrivono in «Domande per Luca»**, non solo nel Dev Agent Record.

Dalla verifica di sessione delle ultime tre story, l'avvertimento che vale più di tutti: **le caselle che chiedono un'annotazione spesso non la ricevono**, e restano passate senza essere misurate. Quelle di questa story sono poche apposta, e due chiedono un numero.

### Riferimenti

- L'AC1 con «data, esito e avanzamento», e l'epic per intero — [Source: docs/bmad/pianificazione/epics.md#epic-4-ritrovare-a-mesi-di-distanza-e-portare-fuori]
- FR24, FR16, FR11, NFR9 — [Source: docs/bmad/pianificazione/epics.md#functional-requirements]
- UX-DR9, la barra e il contatore; UX-DR2, la regola di governo del colore — [Source: docs/bmad/pianificazione/epics.md#ux-design-requirements]
- «Ogni scheda nell'elenco mostra data, esito e avanzamento», e il criterio di accettazione 10 — [Source: docs/prd-v1.md#4-schermate]
- L'avanzamento visibile nella scheda cliente, e perché il denominatore è congelato — [Source: docs/00-contesto-e-decisioni.md#d16]
- `total_questions`, chi lo scrive e perché non si aggiorna; la definizione SQL dell'avanzamento — [Source: docs/database.md#3-tabelle]
- L'ultima attività, e da dove si legge — [Source: docs/database.md#5-ultima-attività-del-cliente]
- Il formato della dichiarazione di reversibilità, e il `cascade` vietato — [Source: docs/database.md#7-migrazioni]
- La barra di avanzamento e la pillola di verdetto, forma e token — [Source: docs/design-system.md#5-componenti]
- Il calcolo in memoria e il fuso dichiarato, come precedente di metodo — [Source: docs/00-contesto-e-decisioni.md#d23]
- Il trigger che manca su `answers`, e il punto di ripresa dichiarato — [Source: docs/bmad/implementazione/deferred-work.md:131]
- La macchina dei quattro stati scritta tre volte — [Source: docs/bmad/implementazione/deferred-work.md:121]
- Lo stato d'errore senza modo di creare, sulle stesse tre card — [Source: docs/bmad/implementazione/deferred-work.md:41]
- `globals.css` si apre su una misura e non su un giudizio — [Source: docs/bmad/implementazione/deferred-work.md:122]

### Domande per Luca — da chiudere prima di `dev-story`

Due. La prima cambia **quanto** si costruisce e porta una migrazione; la seconda cambia **quanto si rimette in ordine**. Nessun Task va eseguito indovinando: se restano aperte, l'implementazione si ferma e lo dice.

**Domanda 1 — Il trigger su `answers` entra in questa story?**

Il fatto: `deferred-work.md:131` assegna a questa story il trigger che fa muovere `assessments.updated_at` quando si salva una risposta, «da fare lì, e in una volta sola con lei». Nessuna delle quattro AC lo chiede: serve a FR11, cioè all'ordine dell'elenco clienti. Quello che invece **serve all'AC1 in entrambi i casi** è una riga sola, `revalidatePath('/clienti/[id]')` dentro `saveAnswer`, senza la quale si compilano dieci risposte, si torna al cliente e il contatore dice ancora quello di prima.

**A — sì, come dice il ledger.** Migrazione `0016`, `revalidatePath('/clienti')` in `saveAnswer`, la voce 131 si chiude e si barra, `database.md` §4 e §7 crescono di una riga. Prezzo: una migrazione dentro una story che non ne chiedeva nessuna, e due sonde SQL in più.

**B — no, si sposta.** Questa story scrive la sola `revalidatePath('/clienti/[id]')`, che le serve, e la voce 131 riceve un'annotazione col nuovo punto di ripresa. Prezzo: il difetto resta vivo e — peggio — da questa story in poi l'avanzamento **si aggiorna** sulla scheda cliente mentre l'elenco resta fermo, cioè le due schermate raccontano cose diverse sulla stessa scheda. È il difetto vecchio che diventa visibile.

**Il default proposto è A**, per la ragione che B rende peggiore: il ledger non ha scelto questa story a caso, l'ha scelta perché è quella in cui il difetto smette di essere invisibile. Il costo è una migrazione di trenta righe con la sua dichiarazione, ed è il momento più economico per pagarla — `answers` ha ventiquattro righe.

**Domanda 2 — La macchina dei quattro stati, scritta tre volte, si estrae qui?**

Il fatto: `deferred-work.md:121` dice «da chiudere alla terza, che è l'Epic 4 — e va chiusa insieme alla voce sullo stato d'errore senza modo di creare (voce 41), che riguarda le stesse tre card». `PeopleCard` e `AssessmentsCard` sono identiche riga per riga con i sostantivi cambiati; la terza è la card dei campi. Questa è la prima story dell'Epic 4 e apre `assessments-card.tsx`.

**A — sì, ora.** Si estrae il componente comune e si decide insieme cosa fa `Riprova` su una rotta già aperta (voce 41). Prezzo: la story tocca tre card per un lavoro che nessuna delle sue AC chiede, e riverificare i quattro stati di tre schermate è più lavoro della story stessa.

**B — no, si dichiara dove.** Si annota la voce 121 col punto di ripresa scelto e col motivo. Prezzo: la card viene aperta, modificata e richiusa senza chiudere una voce che la nomina, e va detto nel ledger perché chi passa dopo non pensi che nessuno ci sia stato.

**Il default proposto è B**, e il punto di ripresa proposto è la **Story 5.1**: la voce 121 e la voce 41 sono due decisioni di forma sull'intera interfaccia — quale componente incarna i quattro stati, e cosa fa `Riprova` — e la 5.1 è la story della navigazione, cioè la prima che guarda la forma e non una funzione. Aggiungere l'estrazione qui vorrebbe dire una story che fa due cose, che è il difetto che `AGENTS.md` nomina per primo. **Se Luca preferisce un punto diverso, lo dice qui**: quello che non va fatto è lasciare la voce senza punto di ripresa dopo averla riletta.

---

### Risposte di Luca, 10 agosto 2026, prima di `dev-story`

**Domanda 1 → A.** Il trigger su `answers` entra **in questa story**. Task 5 eseguito per intero: migrazione `0016_answers_touch_assessment.sql` applicata prima del codice che la usa, `saveAnswer` rivalida **sia** `/clienti/[id]` **sia** `/clienti`, `deferred-work.md:131` si **chiude e si barra** con la misura dei `ctid` che lo prova, `database.md` §4 e §7 crescono di una riga. I test attesi salgono di quattro per il solo `migrations.test.ts`.

**Domanda 2 → delegata**, e la decisione presa è **B**: la macchina dei quattro stati **non** si estrae in questa story, e il punto di ripresa dichiarato è la **Story 5.1**.

Il motivo, scritto qui perché è una decisione e non una preferenza. Estrarre ora vorrebbe dire toccare tre card — `client-card.tsx`, `people-card.tsx`, `assessments-card.tsx` — e riverificare i quattro stati di due schermate per un lavoro che nessuna delle quattro AC chiede, dentro una story che già porta una migrazione. Sono due cose in una story, che è il primo difetto nominato da `AGENTS.md`. E la voce 121 non si chiude da sola: `deferred-work.md` dice che va chiusa **insieme alla voce 41** — «cosa fa davvero `Riprova` su una rotta già aperta» — che è una decisione sull'interfaccia intera e non su una card. La 5.1 è la prima story che guarda la forma invece di una funzione, ed è il posto dove le due si decidono una volta sola per tutte e tre.

Conseguenza da portare fino in fondo nel Task 6, e non da lasciare implicita: questa story **apre `assessments-card.tsx`, la modifica e la richiude senza chiudere una voce che la nomina**. L'annotazione alla voce 121 lo deve dire con queste parole, o chi passa dopo penserà che nessuno ci sia stato. La voce 41 si rilegge e non si annota: questa story non la tocca e il suo destino resta legato alla 121.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via Claude Code, 10 agosto 2026.

### Debug Log References

Nessun difetto da rincorrere: nessuna delle sette attività ha richiesto più di un tentativo, e non ci sono stati fallimenti di test dopo la fase rossa iniziale del Task 1 (il test scritto prima del modulo, che fallisce perché il modulo non esiste — voluto).

**I numeri attesi, dichiarati prima di eseguire e non dopo.** Test da **216** a **228**: otto di `assessment-progress.test.ts` più quattro di `migrations.test.ts`, che gira una volta per file `.sql` e ne ha trovato uno in più. Misurato: 228, zero rossi. Prima dell'applicazione della 0016 il conteggio è passato per 224, che è la verifica intermedia degli otto.

**I tre grep del Task 7, con l'esito e non l'intenzione.**

| Grep | Atteso | Esito |
|---|---|---|
| `from('questions')\|from('question_blocks')` in `src/app/(app)/clienti/` | 0 righe | **0 righe**, `grep` esce 1 |
| `answers` in `assessments-card.tsx` | 0 righe | **0 righe**, `grep` esce 1 |
| `total_questions` in `src/` | solo i file dichiarati più righe preesistenti | **11 file**: i 5 dichiarati (2 nuovi), più `database.types.ts` (generato) e 5 file di soli commenti — `assessment-actions.ts`, `verdict-actions.ts`, `questionario/page.tsx`, `verdict.ts`, `verdict.test.ts` |

I sei non dichiarati sono stati verificati **intatti** con `git diff --quiet` file per file, e non a occhio: la condizione da provare era «solo righe preesistenti», non «solo i file dichiarati».

**La misura di AC2, con `getComputedStyle` e non a giudizio.** Riproduzione statica servita in locale con il `globals.css` vero e i due font Geist, come nella 3.3, 3.4, 3.5 e 3.6.

| Cosa | Prescritto | Misurato |
|---|---|---|
| larghezza della barra | 64px | **64px** |
| altezza della barra | 4px | **4px** |
| raggio | pieno | **999px** (`--r-full`) |
| fondo della barra | `--surface-sunken` | **`rgb(234, 229, 220)`** = `#EAE5DC`, il token |
| colore del riempimento | `--sec-prequalifica` | **`rgb(10, 126, 144)`** = `#0A7E90`, il token |
| riempimento a `0 / 24` | 0 | **0px** |
| riempimento a `12 / 15` | 80% di 64 | **51,2px** = 64 × 0,8 |
| riempimento a `15 / 15` | 64 | **64px** |
| `transition` sulla larghezza | nessuna | **`0s`** su barra e riempimento |
| contatore | monospaziato, `12 / 15` con gli spazi | **`Geist Mono`**, testo `0 / 24` |

**Una divergenza fra dichiarato e calcolato, e non è un difetto:** `.progress` dichiara `display: inline-flex` e `getComputedStyle` risponde `flex`. È la blockificazione dei figli di un contenitore flex, prevista dalla specifica CSS — `.progress` è figlio di `.assessment`, che è `display: flex` — e non cambia niente nella resa, perché un figlio flex non è mai in flusso in linea. La regola resta scritta come la prescrive il Task 4.

**La misura a 375px.** `documentElement.clientWidth` 375, `scrollWidth` **375**, eccedenza orizzontale **0**: la pagina non scorre di lato. La riga va a capo in **due linee flex** — comportamento previsto da `flex-wrap: wrap` e non un difetto — e su tutte e quattro le righe di prova **contatore e barra restano sulla stessa linea, a 8px di distanza**, che è la ragione per cui esiste il contenitore `.progress`. La prima misura contava quattro linee ed era sbagliata: raggruppava per coordinata `top`, che con `align-items: baseline` differisce anche fra figli della stessa linea. Rifatta raggruppando per sovrapposizione degli intervalli verticali, che è la linea flex vera.

**L'allineamento della riga, misurato e non giudicato.** La pillola è alta **22px** con `display: inline-flex`; sulla stessa linea del testo il suo bordo inferiore cade **3px** sotto quello dei `.meta`, che è l'allineamento corretto di una pillola con padding la cui baseline di testo è allineata alle altre. La riga non si scompone e **nessuna correzione al CSS della riga è stata necessaria**.

**Le sonde SQL, tutte in transazione annullata, con la forma delle quattro story precedenti.**

| Sonda | Cosa prova | Esito |
|---|---|---|
| AC3 a database | `'   '` scritto in `answers.content` non conta come risposta | **1** riga di soli spazi esiste, **0** contate come risposte, 24 righe totali |
| AC4 | il denominatore è congelato | domande attive **23 → 24**, `total_questions` resta **24**, righe di `answers` restano **24** |
| trigger, `ctid` | la 0016 fa risalire la scrittura alla scheda | `ctid` **`(0,21)` → `(0,27)`**: la riga della scheda viene riscritta |
| `update of content` | un `insert` e un `update` su altra colonna non svegliano la scheda | `ctid` **`(0,21)` → `(0,21)`**, intatta |
| policy | il trigger non tocca la scheda di un altro proprietario | `sub` diverso: **0 righe toccate**, `ctid` **`(0,21)`** invariato |

Sul `ctid` va detta una cosa che il Task 7 anticipava: dentro una transazione `now()` è fermo, quindi `updated_at` **non** è la prova — è la lezione della 3.3, applicata e non riscoperta. Qui `updated_at` si è mosso lo stesso, ma solo perché il valore di partenza era delle 07:40 di stamattina e non di quella transazione: la prova resta il `ctid`.

**La forma PostgREST dell'innesto, che né `build` né `typecheck` verificano.** Provata con la chiave pubblicabile e senza sessione, come nella 2.1: la `select` vera risponde **200** con `[]` (RLS filtra tutto, che è la risposta giusta); una colonna inventata dentro l'innesto dà **`42703` «column answers_1.contenuto_inventato does not exist»**, e l'alias `answers_1` è la prova che il join viene generato davvero invece di essere ignorato; un innesto inventato dà **`PGRST200`**.

### Completion Notes List

**Cosa fa adesso la riga della scheda.** Data, interlocutore quando c'è, stato di compilazione, **pillola di verdetto**, **contatore e barra**. Sono tre cose nuove e non due, ed è la trappola numero uno di questa story: il commento in testa a `assessments-card.tsx` dichiarava che la pillola sarebbe arrivata con la 4.2 e che la 4.1 avrebbe dovuto aggiungerne due. Era sbagliato — la 4.2 è l'esito nell'**elenco clienti** — e il commento è stato riscritto invece che seguito, dicendo anche che cosa diceva prima.

**Le tre decisioni che questa story non ha preso, perché erano già prese altrove**, ed è la ragione per cui scrive poco codice:

- **AC3 non ha una regola nuova.** `countAnswered` importa `normalizeTextValue`, che è la stessa funzione che `saveAnswer` applica scrivendo. Le due definizioni di «vuoto» sono d'accordo per costruzione e non per convenzione, ed è quello che `answer-actions.ts:62-65` aveva dichiarato in anticipo.
- **AC4 non si implementa, si protegge.** Il denominatore è `assessments.total_questions`, letto e mai calcolato. L'unico modo di romperla sarebbe leggere `questions` da questa schermata: il grep lo vieta, ed è a zero righe.
- **La pillola non è stata riscritta.** `VerdictPill` esiste dalla 3.5 e sta in `src/components/` esattamente perché «la card del cliente e l'elenco la renderanno».

**Il confine fra server e browser è la ragione per cui il Task 2 è un Task.** `assessments-card.tsx` è `'use client'`: passargli le righe di `answers` avrebbe messo nel payload della pagina il testo integrale di ogni risposta di ogni scheda del cliente per rendere un `12 / 15`. La riduzione avviene in `page.tsx`, che è un componente server, e alla card arrivano due numeri. L'oggetto della riduzione è costruito esplicito con le sette chiavi e non con un rest spread che «toglie» `answers`, così il giorno che una colonna entra nel tipo e non nella riduzione il compilatore si ferma.

**La migrazione 0016 è entrata per intero, come la Domanda 1 chiedeva.** Applicata **prima** del codice che la usa, col nome **col prefisso numerico** (`0016_answers_touch_assessment`), e il registro è stato riletto subito dopo con `list_migrations`: **sedici voci, tutte col prefisso**, la trappola della 0008 non si è ripresentata. Il trigger è `after update of content` e non `after insert or update`, che è l'unico scostamento dalla strada scritta nella voce a ledger, ed è dichiarato in testa al file con il suo motivo — `open_assessment` scrive le ventiquattro righe nella stessa transazione della scheda, quindi un trigger sull'`insert` riscriverebbe ventiquattro volte la stessa riga per non cambiare niente. `saveAnswer` rivalida ora tutti e tre i percorsi, e le due chiamate nuove sono arrivate **insieme** al trigger perché separate sarebbero state costo a effetto zero, che è l'argomento con cui la 3.3 le aveva rifiutate.

**Tre scostamenti, dichiarati col motivo.**

1. **Il ledger ha ricevuto un'annotazione in più di quelle previste**, sulla voce del `visibilitychange` che rimanda un testo già mandato (`deferred-work.md`, sezione dell'implementazione della 3.4). Quella voce dichiara che la riscrittura di troppo è «costo a effetto zero»: da oggi non lo è più, perché il trigger 0016 la fa risalire a `assessments.updated_at` e `saveAnswer` rivalida `/clienti`, quindi ogni passaggio in secondo piano che rimandi un testo già salvato riporta il cliente in cima all'elenco. Non è un difetto nuovo — il cliente ci finirebbe comunque, perché ci si sta lavorando sopra — ma una frase del ledger che questa story rende falsa va corretta in vista, non lasciata.
2. **È stata aperta una voce nuova** sull'assenza di `.limit()` nell'innesto che alimenta il contatore. È la stessa famiglia delle due voci già aperte sul troncamento silenzioso di PostgREST, ma la conseguenza è di un'altra categoria: là manca una riga e si vede, qui comparirebbe un numero **plausibile e più basso del vero**. La voce distingue quello che è certo (il costo, dichiarato nelle Dev Notes) da quello che non è stato misurato (se e a quale soglia PostgREST tronchi le righe innestate, non osservabile con una scheda sola), e dice perché `.limit()` peggiorerebbe invece di correggere.
3. **La voce sul `block_id` non copiato dentro `answers` non è stata annotata**, ed è una decisione e non una dimenticanza: la casella la vuole «solo se i numeri cambiano», e i numeri sono identici a quelli che la 3.5 e la 3.6 hanno già scritto — **1 scheda, 24 risposte, 0 con contenuto**. Non c'era niente di nuovo da dire. La misura che quella voce aspetta da cinque story può arrivare solo dalla verifica di sessione, che è la prima a richiedere risposte con contenuto. Per la stessa ragione la voce sullo stato d'errore senza modo di creare (la 41) è stata **riletta e non annotata**: il suo destino resta legato alla 121, e la Domanda 2 è B.

**Cosa non è stato toccato, e la conferma che regge.** Nessuno dei file dichiarati fuori perimetro è stato aperto: `clienti/page.tsx`, `clients-table.tsx`, `last-activity.ts`, `assessment-actions.ts`, `verdict-actions.ts`, `completion-actions.ts`, `verdict.ts`, `verdict-pill.tsx`, `people-card.tsx`, `clienti/[id]/loading.tsx`, e l'intera cartella `schede/[assessmentId]/`. `loading.tsx` in particolare **non si tocca per scelta**, come il Task 3 prescrive: la card delle schede vi riserva il solo titolo, perché righe e pulsante compaiono solo con almeno una scheda, quindi l'avanzamento vive dentro una riga che lo scheletro non riserva già oggi e non c'è nessun salto nuovo da evitare.

**Una cosa da tenere d'occhio e nessuna azione presa:** `assessments-card.tsx` è ora a **189 righe** contro il limite di 200 di `kb-0.md` §2. Sotto la soglia, ma la prossima cosa che entra in quella card la supera — ed è lo stesso file che la voce 121 del ledger dice di estrarre alla Story 5.1.

**Lo stato del database a fine implementazione, contato e non dedotto.** Invariato: 3 clienti, 1 persona, **1 scheda, 24 risposte, 0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. Tutte le sonde sono girate in transazioni annullate e non hanno lasciato niente.

### Revisione applicata, 10 agosto 2026

Otto patch scritte, nessuna nel comportamento: sei correggono documenti e commenti che questa story ha reso falsi, due sono codice. Tre nascono da decisioni di Luca prese in revisione, perché toccavano file dichiarati fuori perimetro o il markup prescritto da un Task.

**Le due patch di codice.** `verdict-actions.ts` rivalida ora anche `/clienti/[id]`: il suo commento diceva che sarebbe «diventata necessaria quando quella card mostrerà l'esito», e questa story l'esito lo mostra — senza la riga si scrive un verdetto, si torna al cliente e la pillola dice ancora quello di prima, che è il difetto misurato dalla 3.6 per la parola dello stato. E il contenitore `.progress` ha ora `role="img"` con un nome: il contatore dice `0 / 24`, due cifre nude, mentre stato ed esito accanto sono due parole, quindi l'avanzamento era l'unico dei tre dati della riga illeggibile senza vedere lo schermo. `role="img"` e non un contenitore muto perché su un elemento generico `aria-label` non viene esposto.

**Le due difese portate a coerenza.** `countAnswered` riceve l'innesto con `?? []`, che è la stessa riga e lo stesso motivo di `last-activity.ts` — un `null` lì porterebbe via la scheda cliente intera invece di dare la card in errore. E `progressFillPercent` guarda `!(total > 0)` invece di `total <= 0`: `NaN <= 0` è **falso**, quindi la forma ovvia lasciava passare l'unico ingresso capace di produrre `width: NaN%`, che è testualmente ciò che la funzione dichiara di impedire. Il test omonimo lo prova ora davvero, e i test salgono da 228 a **229**.

**Quattro correzioni a prosa che questa story aveva reso falsa.** Il commento del CSS legittimava `--sec-prequalifica` nel contenuto citando `.input:focus` come precedente: non è un precedente ma una voce a ledger assegnata alla 5.2, e la scheda cliente è una delle schermate dove quel commento dichiara la tinta sbagliata — la ragione buona resta una sola, `design-system.md` §5. `save-bar.tsx` diceva che una doppia scrittura «costa un `updated_at` mosso due volte e nient'altro», e dopo la 0016 costa anche la posizione del cliente nell'elenco: la stessa affermazione a ledger era già stata annotata, questa no. `database.md` §3 dava l'SQL dell'avanzamento senza dire che non gira, mentre §5 per lo stesso caso ha la sua nota dalla 1.6. E tre numeri di questo file non reggevano al ricalcolo: il File List dichiarava una transizione di `sprint-status.yaml` da `ready-for-dev` quando la partenza era `backlog`, e non nominava la seconda riga cambiata; il Task 2 contava sei chiavi dove il codice ne costruisce sette; il Task 4 non elencava il `display: block` senza cui la barra non si vedrebbe.

**Riverifica dopo le patch:** `npm test` **229 verdi**, `npm run typecheck` senza uscita, `npm run build` compila, i due grep del Task 7 a **zero righe** entrambi. Nessuna misura di CSS è cambiata, perché nessuna regola di CSS è cambiata: le patch al foglio di stile sono tutte dentro un commento.

**Quattro voci rimandate**, tutte a ledger con il punto di ripresa: il trigger che scatta anche su una riscrittura identica, il lock esclusivo che ogni salvataggio prende sulla riga della scheda, il riempimento di `1 / 24` che sta quasi tutto dentro il tappo arrotondato, e i riferimenti a riga scaduti nella voce del `visibilitychange`. Sette reperti scartati come rumore.

### File List

```
src/lib/assessment-progress.ts                          NUOVO — countAnswered e progressFillPercent
src/lib/assessment-progress.test.ts                     NUOVO — 8 test, col caso dei soli spazi e 0/0
supabase/migrations/0016_answers_touch_assessment.sql   NUOVO — il trigger, applicato al progetto
src/lib/types.ts                                        MODIFICA — AssessmentSummary +2 colonne, AssessmentListItem, commento corretto
src/app/(app)/clienti/[id]/page.tsx                     MODIFICA — l'innesto nella select e la riduzione sul server
src/app/(app)/clienti/[id]/assessments-card.tsx         MODIFICA — pillola, contatore, barra, commento riscritto
src/app/(app)/clienti/answer-actions.ts                 MODIFICA — revalidatePath di /clienti/[id] e /clienti
src/app/globals.css                                     MODIFICA — .progress, .progress__bar, .progress__fill
docs/database.md                                        MODIFICA — §4 il settimo trigger, §7 la riga della 0016
docs/bmad/implementazione/deferred-work.md              MODIFICA — 1 voce nuova, 2 annotazioni, 1 chiusa
docs/bmad/implementazione/sprint-status.yaml            MODIFICA — 4-1 da backlog a review, epic-4 da backlog a in-progress
docs/bmad/implementazione/4-1-...-ogni-scheda.md        MODIFICA — caselle, Dev Agent Record, Change Log, Status

    dalla revisione del 10 agosto 2026:
src/app/(app)/clienti/verdict-actions.ts                MODIFICA — revalidatePath di /clienti/[id], e il commento che scade
src/app/(app)/clienti/[id]/schede/[assessmentId]/save-bar.tsx  MODIFICA — solo il commento sul costo della doppia scrittura
src/app/(app)/clienti/[id]/assessments-card.tsx         MODIFICA — role="img" e aria-label sul contenitore .progress
src/app/(app)/clienti/[id]/page.tsx                     MODIFICA — `?? []` sull'innesto passato a countAnswered
src/lib/assessment-progress.ts                          MODIFICA — la guardia diventa !(total > 0)
src/lib/assessment-progress.test.ts                     MODIFICA — il caso NaN, da 8 a 9 test
src/app/globals.css                                     MODIFICA — solo il commento sopra le tre regole
docs/database.md                                        MODIFICA — §3, «come è calcolato davvero»
docs/bmad/implementazione/deferred-work.md              MODIFICA — 4 voci nuove dalla revisione
```

I due file della revisione fuori dal perimetro della story — `verdict-actions.ts` e `save-bar.tsx` — sono stati aperti per decisione di Luca del 10 agosto 2026, presa reperto per reperto e non in blocco. Il primo porta una riga di comportamento, il secondo solo un commento.

## Verifica di sessione

_(le caselle che richiedono una sessione vera; le passa Luca, e sono quelle che portano la story a `done`)_

**Passate tutte e otto da Luca l'11 agosto 2026. Tre chiedevano un'annotazione e non l'hanno ricevuta**, e sta scritto qui invece di essere deducibile dalle spunte, che è la forma con cui la 3.5 ha chiuso lo stesso caso: il contatore prima e dopo la risposta di soli spazi, i due numeri prima e dopo la domanda aggiunta al questionario, e il conteggio finale di `answers` con la quota di righe che hanno contenuto. Restano quindi **passate e non misurate**. La story lo nominava quattro volte come il difetto da non ripetere, e non ripeterlo non è riuscito: chi rilegge non deve credere che quei numeri esistano da qualche parte.

**Dove non è avvenuta, misurato e non dedotto.** Sul progetto `izkycpwxuedpkzgpvcxc` non è stata scritta **nessuna** risposta: `assessments.updated_at` è uguale a `created_at` al microsecondo — `2026-08-10 07:40:49.990754` di Roma — e **zero** delle 24 righe di `answers` ha `updated_at > created_at`, quindi il trigger 0016 non vi è mai scattato. I contatori sono identici a quelli dichiarati dalla 3.5 e dalla 3.6: 3 clienti, 1 persona, 1 scheda, 24 risposte di cui **0 con contenuto**, 1 questionario, 9 blocchi, 24 domande di cui 23 attive. La verifica è quindi avvenuta altrove, come già per la 3.5 — l'ambiente non è stato dichiarato.

**Conseguenza per il ledger, e va detta perché è la sesta volta.** `deferred-work.md`, voce del `block_id` non copiato dentro `answers`, aspetta da cinque story la misura di quante righe di `answers` portino un contenuto. Questa story era la prima a **non poterla evitare**, perché AC2 non si passa senza scrivere risposte vere. La misura c'è stata, su un ambiente che non è questo, e il numero non è stato raccolto: **la voce resta aperta con la stessa attesa**, e su questo progetto lo zero è confermato invece che superato. La sesta occasione è la 4.2 o la 4.3, e vale la pena scriverlo: una voce che aspetta un numero per sei story non lo sta aspettando, lo sta perdendo.

- [x] Apro un cliente che ha almeno una scheda: la riga porta data, interlocutore quando c'è, stato di compilazione, **pillola di verdetto** e **contatore con barra**, in quest'ordine (AC1).
- [x] Sulla scheda a `0 / 24` la barra è vuota e il contatore dice `0 / 24`: non `0%`, non un trattino, non uno spazio bianco (AC2).
- [x] Apro una scheda, rispondo a tre domande, torno al cliente **senza ricaricare la pagina**: il contatore dice `3 / 24` (AC1, e la rivalidazione della Domanda 1).
- [x] In una risposta scrivo **solo spazi** e la salvo: il contatore **non** cresce (AC3). *Da annotare col numero prima e dopo.*
- [x] Aggiungo una domanda nuova al questionario, torno al cliente: il contatore e il totale della scheda di prima **non cambiano** (AC4). *Da annotare coi due numeri.*
- [x] Guardo la riga su schermo stretto (telefono o finestra a 375px): contatore e barra restano insieme, la riga va a capo senza far scorrere la pagina di lato.
- [x] **Solo se la Domanda 1 è A** — compilo una risposta e torno all'elenco clienti: quel cliente è salito in cima (FR11). *È la prova che il trigger 0016 fa quello per cui esiste.*
- [x] Conteggio finale di `answers` e di quante righe hanno contenuto, da scrivere qui col numero: serve a `deferred-work.md:127`, che lo aspetta da cinque story.

## Change Log

| Data | Cosa |
|---|---|
| 10 agosto 2026 | Story creata, `ready-for-dev`. |
| 10 agosto 2026 | Domande chiuse: 1 → A (la migrazione `0016` entra), 2 → delegata e decisa **B** (nessuna estrazione qui, punto di ripresa alla 5.1). |
| 10 agosto 2026 | Implementata. La riga della scheda porta esito, contatore e barra; il conteggio è un modulo puro sotto test che importa la definizione di «vuoto» invece di riscriverla; il denominatore si legge da `total_questions` e nessuna query tocca `questions`. Migrazione `0016_answers_touch_assessment` applicata al progetto prima del codice, registro riletto: sedici voci col prefisso. Test da 216 a 228, `typecheck` e `build` verdi, i tre grep del Task 7 all'esito atteso. Ledger: voce del trigger **chiusa e barrata** con la misura dei `ctid`, voce dei quattro stati **annotata** col punto di ripresa alla 5.1, una voce **nuova** sull'innesto senza `.limit()`. Status a `review`. |
| 10 agosto 2026 | Revisione in tre strati paralleli. Quattro AC soddisfatte, perimetro rispettato, i numeri del Dev Agent Record reggono al ricalcolo tranne tre di prosa. Otto patch applicate — due di codice (`revalidatePath` di `/clienti/[id]` da `saveVerdict`, nome accessibile sul contenitore dell'avanzamento), due di coerenza fra difese gemelle (`?? []` sull'innesto, guardia `!(total > 0)`), quattro su commenti e documenti che questa story aveva reso falsi. Tre nascono da decisioni di Luca su file fuori perimetro o sul markup prescritto. Test da 228 a **229**, `typecheck` e `build` verdi, i due grep a zero. Quattro voci rimandate a ledger, sette reperti scartati. Status **resta `review`**: a `done` lo porta la verifica di sessione, non la revisione. |
| 11 agosto 2026 | Verifica di sessione passata, otto caselle su otto, e la story va a `done`. Solo documenti: nessuna riga di codice cambia, perché la verifica non ha trovato niente da correggere. **Tre caselle chiedevano un'annotazione e non l'hanno ricevuta** — i due numeri dei soli spazi, i due della domanda aggiunta, e il conteggio finale delle risposte con contenuto — e restano passate e non misurate, scritto in testa alla sezione invece che deducibile dalle spunte. La verifica è avvenuta fuori dal progetto `izkycpwxuedpkzgpvcxc`, che è intatto e lo prova al microsecondo: `assessments.updated_at` uguale a `created_at`, zero righe di `answers` mai riscritte, quindi il trigger 0016 non vi è mai scattato. La voce del `block_id` a ledger **resta aperta**: aspettava da cinque story il numero delle risposte con contenuto, questa era la prima a non poterlo evitare, e il numero non è stato raccolto. |
