---
baseline_commit: 20afc72
---

# Story 2.1: Vedere il questionario com'è oggi

Status: done

Epic: 2 — Questionario che si cambia senza un rilascio
Data di creazione: 5 agosto 2026

<!-- Nota: la validazione è facoltativa. Si può eseguire validate-create-story prima di dev-story. -->

## Story

As a Luca,
I want vedere blocchi e domande nell'ordine in cui li chiederò,
so that prima di una call so cosa sto per chiedere e in che sequenza.

## Acceptance Criteria

**AC1 — i blocchi e le domande si leggono nel loro ordine**
**Given** il questionario caricato dal seed
**When** apro la schermata del questionario
**Then** vedo gli 8 blocchi nel loro ordine e sotto ciascuno le sue domande nel loro ordine

**AC2 — di ogni domanda si vede tutto quello che la definisce**
**Given** la stessa schermata
**When** guardo una domanda
**Then** ne vedo il testo, il testo di aiuto, il tipo di risposta e se è attiva

**AC3 — il colore di sezione sta nella navigazione e non nel contenuto**
**Given** la schermata del questionario
**When** la guardo
**Then** il colore di sezione usato nella navigazione è quello del questionario, e non entra nel contenuto (UX-DR2)
**And** la schermata ha i suoi quattro stati (NFR9)

**AC4 — il vuoto dice cosa manca, non «nessun risultato»**
**Given** un questionario non ancora caricato
**When** apro la schermata
**Then** lo stato vuoto dice che il questionario non è stato caricato e cosa fare, non «nessun risultato»

> Questa story **legge e basta**. Non aggiunge, non riscrive, non riordina e non disattiva niente: quelle sono le Story 2.2, 2.3, 2.4, 2.5 e 2.6. Nessuna scrittura verso il database, nessuna Server Action, nessun `revalidatePath`. Se alla fine esiste un solo comando che modifica una domanda, la story è stata sbagliata.

> Questa story **non modifica lo schema**. Le tre tabelle del questionario esistono da `0004_questionnaire.sql`, applicata. Se alla fine `list_migrations` restituisce otto righe invece di sette, la story è stata sbagliata.

## Tasks / Subtasks

- [x] **Task 1 — Le quattro etichette del tipo di risposta** (AC: 2)
  - [x] File nuovo `src/lib/answer-types.ts`, sul modello esatto di `src/lib/client-status.ts`: puro, senza React e senza Supabase, così ci si può mettere un test sopra senza impalcatura (`kb-0.md` §7).
  - [x] I quattro valori sono quelli del vincolo `check` su `questions.answer_type` (`0004_questionnaire.sql:41-42`), nel loro ordine: `testo_lungo`, `testo_breve`, `numero`, `scelta_singola`.

    ```ts
    export const ANSWER_TYPES = ['testo_lungo', 'testo_breve', 'numero', 'scelta_singola'] as const
    export type AnswerType = (typeof ANSWER_TYPES)[number]
    ```

  - [x] `as const` non è cosmetico: senza, il tipo si allarga a `string[]` e `AnswerType` non vale più niente. È la stessa riga, con lo stesso commento, che `client-status.ts:14` porta già.
  - [x] `isAnswerType(value: unknown): value is AnswerType` con un `ReadonlySet`, identico a `isClientStatus`.
  - [x] **Qui serve una mappa valore → etichetta, e in `client-status.ts` no.** La differenza è reale e va scritta nel commento, altrimenti chi legge i due file pensa che uno dei due sbagli: i cinque stati del cliente sono già le parole che compaiono a schermo, mentre `testo_lungo` con la sottolineatura è un artefatto del database, e UX-DR13 chiede che le etichette nominino le cose come le riconosce chi le usa. Le quattro etichette sono `testo lungo`, `testo breve`, `numero`, `scelta singola`.
  - [x] La mappa è `Record<AnswerType, string>` e non `Record<string, string>`: il giorno che un quinto tipo entra nel vincolo e non qui, il compilatore si ferma invece di lasciarlo senza etichetta in silenzio. È la lezione già scritta su `status-pill.tsx:9-12`.
  - [x] Un tipo fuori dai quattro **non rompe la pagina e non si nasconde**: si mostra il valore grezzo così com'è, come fa `StatusPill` con uno stato ignoto (`status-pill.tsx:26-27`). La colonna è `not null` con `check`, quindi oggi il caso non esiste; il ramo esiste perché il tipo generato da Supabase è `string` e i tipi generati non si modificano a mano.

- [x] **Task 2 — La lettura del questionario attivo** (AC: 1, 2)
  - [x] Sta dentro `src/app/(app)/questionario/page.tsx`, Server Component `async`, con `createClient()` da `@/lib/supabase/server` e `redirect('/accedi')` se `getUser()` non dà un utente. È lo schema identico di `clienti/page.tsx:23-29`, e si copia quello: il proxy protegge già la rotta (`proxy.ts:6` non elenca `/questionario` fra i percorsi pubblici, e il matcher prende tutto), ma il controllo in pagina resta perché è la difesa che vale anche se una richiesta non passasse dal proxy.
  - [x] Una sola lettura, con le due tabelle innestate:

    ```ts
    const { data, error } = await supabase
      .from('questionnaires')
      .select(
        'id, name, version, question_blocks(id, title, position, created_at, ' +
          'questions(id, text, help_text, answer_type, options, position, is_active, created_at))',
      )
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
    ```

  - [x] **Innesto normale, mai `!inner`.** È la trappola già scritta in `clienti/page.tsx:35-38` e vale qui identica ma peggio: `question_blocks!inner` farebbe sparire il questionario appena creato che non ha ancora blocchi, cioè proprio lo stato che AC4 chiede di mostrare come vuoto; `questions!inner` farebbe sparire un blocco vuoto, che dopo la Story 2.2 sarà normale avere.
  - [x] **La sicurezza a livello di riga vale anche sulle righe innestate.** `question_blocks_owner_all` e `questions_owner_all` (`0007_rls.sql:67-91`) risalgono al questionario con un `exists`: non c'è nessun filtro sul proprietario da riscrivere qui, e riscriverlo sarebbe la duplicazione che `database.md` §6 evita di proposito mettendo la protezione nel database.
  - [x] **Niente `.single()` e niente `.maybeSingle()`.** Tutti e due trasformano «due righe» in un errore, e questa schermata finirebbe sullo stato d'errore per un dato che non è un guasto. `.limit(1)` con un ordinamento dichiarato, poi `data?.[0] ?? null`: zero righe è lo stato vuoto di AC4, non un errore. Oggi il questionario è uno solo, ma `questionnaires` non ha nessun vincolo che lo imponga.
  - [x] `.order('created_at')` sul questionario non è decorativo: `.limit(1)` senza ordinamento sceglie una riga qualsiasi, e il giorno che ce ne fossero due attivi la schermata cambierebbe da un caricamento all'altro. Stessa ragione già scritta in `clienti/page.tsx:63-65` per i tag.
  - [x] **L'ordinamento di blocchi e domande.** Il default è farlo nella query, con `referencedTable`, che è la forma giusta perché è il database a saper ordinare:

    ```ts
      .order('position', { referencedTable: 'question_blocks' })
      .order('position', { referencedTable: 'question_blocks.questions' })
    ```

  - [x] **La forma con il punto va verificata eseguendo, non data per buona.** L'ordinamento di una risorsa innestata a due livelli è una funzione di PostgREST di cui non si dà per certa la sintassi in `@supabase/postgrest-js` alla versione in uso: si esegue e si guarda. Il controllo è a occhio e immediato, perché il questionario vero ha 8 blocchi e 23 domande in un ordine noto (Task 7 lo elenca).
  - [x] **Se la forma con il punto non ordina**, il ripiego dichiarato è un modulo puro `src/lib/questionnaire-order.ts` con un comparatore, ordinato in memoria come fa già `byLastActivityDesc` (D23), **con il suo test**. Non è una scelta libera fra le due: si prova la prima, e la seconda entra solo se la prima non funziona, scrivendo nel Dev Agent Record che cosa ha risposto PostgREST.
  - [x] **`position` non è unico, in nessuna delle due tabelle.** `0004_questionnaire.sql` ha due indici (`question_blocks_questionnaire_position_idx`, `questions_block_position_idx`) e nessuno dei due è `unique`. Un `order by` su una colonna sola non definisce nessun ordine a parità di valore — è scritto già in `clienti/page.tsx:93-95` — quindi serve un secondo criterio: `.order('created_at', { referencedTable: … })` dopo il primo, su entrambi i livelli. Senza, due domande con la stessa posizione si scambiano di posto fra un caricamento e l'altro e nessuno capisce perché.
  - [x] **Le domande disattivate si leggono tutte.** Nessun `.eq('is_active', true)` da nessuna parte. AC2 chiede di vedere *se è attiva*, quindi filtrarle sarebbe rendere invisibile metà del criterio. È il contrario di quello che farà la schermata di compilazione (Story 3.1), ed è la confusione più facile di questa story.
  - [x] Nessun tipo scritto a mano per le righe: si derivano da `Database['public']['Tables'][…]['Row']` come fa `src/lib/types.ts`, oppure si lascia inferire dalla `select`. `any` è vietato (`kb-0.md` §2), e nessun `as` per far tacere il compilatore.
  - [x] Nel ramo d'errore si scrivono nei log **solo `code` e `message`**, mai `details`: `details` conterrebbe valori delle righe (`kb-0.md` §3). È la forma già usata in `clienti/page.tsx:74-77`.

- [x] **Task 3 — La schermata** (AC: 1, 2, 3)
  - [x] `src/app/(app)/questionario/page.tsx`. Intestazione `page-header` con `page-title` `Questionario`, come le altre due schermate.
  - [x] **Una card per blocco**, con il titolo del blocco in `card__header` / `card__title`. Le classi esistono tutte (`globals.css:203-235`), `card + card` dà già lo stacco di 24. La forma alternativa — una card sola con dentro otto sezioni — è stata scartata: `design-system.md` §5 dice che l'intestazione di una card porta *un titolo e nient'altro, salvo un'azione allineata a destra*, e le Story 2.2 e 2.5 avranno bisogno esattamente di quell'azione su ogni blocco. Una card per blocco è il posto dove quelle azioni andranno; una card sola sarebbe da smontare fra due story.
  - [x] **Le domande dentro il blocco sono una lista separata da una riga, senza cornici.** È il pattern già in piedi per le persone (`globals.css:704-727`): `border-top: 1px solid var(--line)` su ogni voce, tolto alla prima. Nessun bordo intorno alla domanda, nessuna cornice, nessuno sfondo: la separazione la fa la riga, come nella tabella dell'elenco.
  - [x] Ogni domanda rende, in quest'ordine:
    - il testo, a `--t-heading` (17/24, peso 600) — è la classe `card__title` come misura, ma su un elemento che non è un titolo di card: se serve, una classe nuova `.question__text` con gli stessi tre valori, e non un `card__title` fuori posto;
    - il testo di aiuto sotto, a `--t-meta` in `--ink-muted`, che è la classe `.meta` già scritta (`globals.css:253-258`). Se `help_text` è `null` non si rende niente: due domande su ventitré ce l'hanno vuoto (le ultime del blocco 8), e un contenitore vuoto lascerebbe un buco che sembra un difetto;
    - una riga di metadati con il tipo di risposta e lo stato di attività.
  - [x] **Il tipo di risposta è testo, non un colore.** `.badge` esiste (`globals.css:240-249`) ed è a fondo neutro proprio perché i colori di sezione non entrano nel contenuto: va bene per il tipo. Le opzioni di `scelta_singola` si elencano come testo semplice sotto — oggi c'è una sola domanda con opzioni, la 10, e sono quattro.
  - [x] **Una domanda disattivata si segnala con una parola, non solo con un colore** (UX-DR2, punto 4): la parola è `non attiva`, e il colore d'accompagnamento è `--ink-faint` o `--neutral`, **mai `--bad` e mai `--warn`**. Una domanda disattivata non è un errore né un avviso: è una scelta di Luca, e i tre colori semantici significano un esito. Il resto della riga può essere più tenue, ma il testo della domanda resta leggibile: `design-system.md` §8 chiede 4.5:1, e una domanda che non si legge non serve a niente su una schermata che esiste per farla leggere.
  - [x] **Una sola azione primaria per schermata** (UX-DR10). In questa story di azioni non ce n'è nessuna: nessun pulsante primario, e va bene così. Il primo arriverà con la Story 2.2.
  - [x] **Nessun conteggio nell'intestazione**, né di blocchi né di domande. È la scelta meno ovvia della schermata e il motivo va scritto nel codice: `/clienti` mette il numero di righe accanto al titolo, e copiarlo qui sembrerebbe coerente. Non lo è, perché il numero che conta per una call è quello delle domande **attive** — è il denominatore che la Story 3.1 congela in `assessments.total_questions` — e un `23` che resta `23` dopo che una domanda è stata disattivata è un numero falso su una schermata che esiste per dire com'è il questionario adesso. Oggi tutte e ventitré sono attive, quindi il difetto non si vedrebbe: si vedrebbe alla prima disattivazione, cioè alla Story 2.6. Il conteggio si aggiunge quando esiste il concetto che lo rende vero, non prima.
  - [x] `page.tsx` resta sotto le 200 righe (`kb-0.md` §2). Se non ci sta, la parte che esce è la resa del blocco in `src/app/(app)/questionario/block-card.tsx` — un componente per file, e niente `'use client'`: non c'è niente di interattivo in questa schermata.
  - [x] Le parole della schermata: `Questionario`, `attiva`, `non attiva`, le quattro etichette dei tipi, e le frasi dei due vuoti che Task 4 prescrive. Italiano, frase minuscola, voce attiva, niente punti esclamativi, niente emoji (UX-DR13). *(Rivisto il 6 agosto 2026. L'elenco diceva «tutte» e non lo era: mancavano le frasi dei vuoti e quella del blocco senza domande. Trattarlo come chiuso è servito in implementazione a non rendere `attiva`, cioè a non soddisfare AC2 — che è il difetto che la revisione ha trovato. Un elenco di vocabolario dice quali parole possono comparire, non quali elementi si rendono, e non supera un criterio di accettazione.)*

- [x] **Task 4 — I quattro stati** (AC: 3, 4)
  - [x] **Pieno:** le card dei blocchi con le loro domande.
  - [x] **In errore:** `ErrorState` da `@/components/error-state`, che esiste e non si riscrive. `message` dice cosa fare e non cosa è successo nello stack (`kb-0.md` §3, NFR16); `retryHref="/questionario"`, che è la rotta stessa — la stessa forma di `clienti/page.tsx:150`. *(Che cosa faccia davvero un `Riprova` verso la rotta su cui si è già è una voce aperta in `deferred-work.md` da tre story: non si chiude qui, e non si peggiora.)*
  - [x] **Vuoto:** il ramo di AC4, e va distinto dall'errore in modo esplicito. `error` non nullo → stato d'errore. `error` nullo e nessun questionario → stato vuoto. Sono due condizioni diverse su due variabili diverse, e non si collassano in un `!data`: un `!data` da solo mostrerebbe «il questionario non è caricato» quando il database non ha risposto, cioè una bugia rassicurante nel momento in cui serve la verità.
  - [x] **Il testo del vuoto.** AC4 vieta `nessun risultato` e chiede *cosa fare*. Il questionario di partenza si carica eseguendo `supabase/seed.sql` sul progetto Supabase, ed è un'operazione che fa Luca, non la schermata. Quindi: una riga che dice che il questionario non è stato ancora caricato e che si carica con quel file, senza pulsante. **Nessun pulsante `Crea il primo blocco`**: creare blocchi è la Story 2.2, e metterlo qui sarebbe costruire in anticipo la story dopo. UX-DR11 chiede uno stato vuoto che dica cosa manca e offra il pulsante che lo crea; qui il pulsante che lo crea non esiste ancora, e la parte che si può onorare oggi è la prima. Vedi la domanda 1.
  - [x] **Un questionario esistente ma senza blocchi non è lo stato vuoto della schermata**: è un questionario vuoto, e si distingue. Oggi non capita — il seed crea sempre gli 8 blocchi insieme al questionario — ma dopo la Story 2.2 sarà uno stato raggiungibile, e i due testi non sono la stessa frase. Se il caso resta senza un ramo suo, va almeno reso in modo che non sembri un guasto: la card del titolo con dentro la riga che dice che non ci sono ancora blocchi.
  - [x] **In caricamento:** `src/app/(app)/questionario/loading.tsx`, scheletri della forma reale del contenuto e mai un cerchio che gira (`design-system.md` §6). Si copia la struttura di `clienti/loading.tsx`: intestazione vera con il titolo `Questionario` — il titolo si sa già, non si mette uno scheletro sopra un testo costante — e sotto due o tre card con dentro rettangoli della forma di una domanda. Le altezze si prendono dalla resa vera, non si indovinano: è la lezione scritta in `clienti/loading.tsx:22-37`, dove un rettangolo indovinato da 44 al posto di 48 faceva saltare la pagina di 26px.
  - [x] **Lo stato vuoto non è raggiungibile su questo database senza cancellare dati.** Il progetto ha un questionario con 8 blocchi e 23 domande, verificato il 5 agosto 2026. **Non si cancella niente per provare il ramo vuoto**, e non si aggiunge nessun parametro né nessuna variabile d'ambiente per simularlo: si legge il codice, e nel Dev Agent Record si scrive che quel ramo non è stato visto reso. È la regola già applicata dalla Story 1.7, che ha dichiarato una barra non vista invece di spuntare la casella.

- [x] **Task 5 — La navigazione: seconda voce, e il colore che segue la sezione** (AC: 3)
  - [x] Oggi `layout.tsx` ha **una sola voce**, con `nav__item--active` scritto a mano nel markup (`layout.tsx:11-13`), e `globals.css:161` mette `--sec-clienti` dentro `.nav__item--active::before`. Con due voci nessuna delle due cose regge: l'attivo va calcolato, e il colore va per sezione.
  - [x] `src/app/(app)/nav.tsx`, componente nuovo con `'use client'` e `usePathname()` da `next/navigation`. È il primo uso di `usePathname` nel progetto; `useRouter` è già usato in `sign-out-button.tsx`, quindi l'import da `next/navigation` in un componente del browser è una forma già in piedi.
  - [x] `layout.tsx` resta un Server Component e monta `<Nav />`. Non diventa `'use client'`: renderebbe client anche `SignOutButton` e tutto quello che il layout terrà in futuro.
  - [x] Le due voci in un elenco dichiarato in un posto solo, con percorso, etichetta e modificatore di sezione. `Clienti` → `/clienti`, `Questionario` → `/questionario`.
  - [x] **L'attivo si calcola sul prefisso, non sull'uguaglianza.** `/clienti/abc-123` e `/clienti/nuovo` devono tenere accesa la voce `Clienti`, e oggi lo fanno solo perché è scritta accesa a mano. La forma è `pathname === href || pathname.startsWith(href + '/')`: lo `startsWith` nudo su `/clienti` accenderebbe la voce anche su un ipotetico `/clientidiversi`, ed è il tipo di difetto che nessuno trova perché non produce un errore.
  - [x] **Il colore di sezione nella barra a sinistra della voce attiva.** `.nav__item--active::before` smette di portare `--sec-clienti` fisso: il colore arriva da un modificatore per sezione (`.nav__item--clienti`, `.nav__item--questionario`) che valorizza una proprietà personalizzata locale, e la regola `::before` la legge. Nessun valore esadecimale: solo i token `--sec-clienti` e `--sec-questionario`, che stanno già in `globals.css:16-21`.
  - [x] **Il colore di sezione resta nella navigazione e non entra nel contenuto** (UX-DR2, AC3). Nella pagina del questionario non compare nessun viola: né sui titoli, né sui badge, né sui bordi, né sull'alone del focus. Un `--sec-questionario` sotto `src/app/(app)/questionario/` è un difetto.
  - [x] **L'alone del focus non si tocca.** `:focus-visible` in `globals.css:83-87` illumina in `--sec-clienti-tint` su tutto il progetto, e UX-DR14 chiede la tinta della sezione corrente: è la voce già rimandata alla Story 5.2 (`deferred-work.md`, 2 agosto), vale per ogni campo di ogni schermata, e correggerla qui vorrebbe dire aprire un lavoro che non è di questa story. Si lascia com'è e si dichiara.
  - [x] **Niente della Story 5.1.** Nessuna barra richiudibile, nessuna icona, nessun suggerimento al passaggio del mouse, nessuno stato salvato: quella è la 5.1 e questa story le toglierebbe il lavoro dalle mani lasciandolo a metà. Qui si aggiunge una voce e si fa funzionare l'attivo.
  - [x] Il bersaglio della voce resta almeno 44px (`.nav__item` ha già `min-height: 44px`), e la voce attiva resta distinguibile anche senza colore, dal fondo `--surface-sunken` e dal peso del testo — che è quello che UX-DR2 punto 4 chiede.

- [x] **Task 6 — Il test delle etichette, e i due documenti da allineare** (AC: 2)
  - [x] `src/lib/answer-types.test.ts`, accanto al modulo che prova, con `node:test` e `node:assert/strict`, import con estensione `.ts`. Il comando esiste dalla Story 1.6 e non si tocca: `npm test` gira già con `TZ=UTC` e prende `src/**/*.test.ts`.
  - [x] Perché questo entra sotto test e la pagina no (`kb-0.md` §7): la mappa valore → etichetta è **una trasformazione**, la stessa categoria di `parseClientFilters`, e rompendosi non produce un errore — produce una domanda che dichiara il tipo di risposta sbagliato, cioè un campo che in call si trova diverso da quello che ci si aspettava. La pagina, le card e gli stati vuoti sono presentazione, e la loro verifica è Task 7.
  - [x] I casi: i quattro valori danno le quattro etichette; `isAnswerType` è vero sui quattro e falso su una stringa fuori elenco, su `null`, su un numero; un valore ignoto passa dalla resa senza eccezione e senza diventare un'etichetta di un altro tipo.
  - [x] **Un test che non è stato visto fallire quando doveva non è un test** (`kb-0.md` §7). Prima di chiudere: rompere di proposito una delle quattro etichette e il ramo del valore ignoto, verificare che i test se ne accorgano, ripristinare con `git diff` a zero. Da scrivere nel Dev Agent Record, come hanno fatto le Story 1.6, 1.7 e 1.8.
  - [x] **`docs/database.md` §8, che oggi dice il falso.** Il paragrafo dichiara che «il seed crea il questionario vuoto e le domande si inseriscono dall'interfaccia»; `supabase/seed.sql` ne inserisce 23 in 8 blocchi, e la dichiarazione aggiunta a `0004_questionnaire.sql:8-10` dalla Story 1.8 dice già la cosa giusta. §8 va riscritta per dire quello che il seed fa davvero, e la parte sul «finché le domande non sono state riviste» è scaduta: le domande sono state riviste ed è la decisione D19.
  - [x] **`deferred-work.md`, la voce del 5 agosto** *«`database.md` §8 contraddice il commento nuovo di `0004`»*, che si chiude con «Da chiudere alla prima story che apre §8 — cioè l'Epic 2». Questa è quella story, e **la chiude**: si marca chiusa con la data e il motivo, con la barratura, come è stato fatto per le due voci già chiuse in quel file. Nessun'altra voce di `deferred-work.md` viene toccata.
  - [x] Niente in `00-contesto-e-decisioni.md`: questa story non prende nessuna decisione strutturale nuova. Vedi la domanda 4.

- [x] **Task 7 — La verifica a mano** (AC: 1, 2, 3, 4)

  Verificabile dall'agente:
  - [x] `npm run typecheck` passa. Nessun `any`, nessun `as` aggiunto.
  - [x] `npm run build` passa.
  - [x] `npm test` passa, e i test delle Story 1.6, 1.7 e 1.8 continuano a girare: il numero totale **cresce**, non cambia. Un test che sparisce non è rosso, è assente.
  - [x] `answer-types.ts` non importa né React né Supabase.
  - [x] `page.tsx`, `loading.tsx`, `nav.tsx` e l'eventuale `block-card.tsx` restano tutti sotto le 200 righe.
  - [x] Sotto `src/app/(app)/questionario/` non compare **nessun** `--sec-questionario` e nessun valore esadecimale (AC3).
  - [x] La `select` **non** contiene `!inner`, e **non** contiene nessun `.eq('is_active', true)` sulle domande. *(Corretto in revisione il 6 agosto 2026: la riga diceva che la `select` non contiene `.eq('is_active', true)` e basta, mentre lo snippet di Task 2 lo mette lì lei, sul questionario. Era una contraddizione della specifica con sé stessa, e la casella risultava spuntata su un'affermazione falsa. Il vincolo vero è sulle domande.)*
  - [x] Nessuna Server Action, nessun `revalidatePath`, nessuna scrittura verso il database in tutta la story.
  - [x] `globals.css` non contiene nessun valore esadecimale nuovo e nessun numero fuori dalla scala di 4.
  - [x] I file toccati sono quelli di «Cosa cambia questa story» e nessun altro, a parte le scritture di metodo (`sprint-status.yaml`, questo file, `deferred-work.md`, `database.md`), che vanno dichiarate nel File List. **Con una deviazione, dichiarata in revisione il 6 agosto 2026:** `block-card.tsx` era condizionato a `page.tsx` sopra le 200 righe, e al momento dell'implementazione la condizione non si era presentata — 115 righe più 75, uniti circa 188. Il file è stato creato lo stesso. La scelta reggeva comunque, perché `kb-0.md` §2 chiede un componente per file e con la resa in linea `page.tsx` ne conterrebbe due, ma era una deviazione da una regola condizionale scritta e andava letta come tale invece che assorbita in silenzio. *Dopo i patch di revisione la condizione si è avverata da sé:* `page.tsx` è a 135 righe e `block-card.tsx` a 85, che uniti superano le 200. La deviazione resta scritta perché quando è stata fatta non era ancora giustificata dal conteggio.

  Richiede una sessione, la fa Luca. **Fatta e confermata da Luca il 6 agosto 2026**, dopo i patch di revisione: le caselle qui sotto sono spuntate sulla sua parola, non su un'osservazione dell'agente, che una sessione non ce l'ha.
  - [x] Apro `/questionario`: vedo 8 card nell'ordine `Contesto`, `Obiettivo`, `Costo di restare come si è`, `Dove si rompe`, `Conoscenza e misura`, `Strumenti già in uso`, `Decisione, tempo, denaro`, `Solo sopra le 50 persone…` (AC1).
  - [x] Le domande dentro i blocchi sono 3, 3, 3, 2, 4, 1, 4, 3 e sono nell'ordine giusto: la prima è `Raccontami in due minuti cosa fate e a chi lo vendete.`, l'ultima è `Da quando dite sì a quando si parte davvero, di solito quanto passa?` (AC1).
  - [x] Ricarico due volte: l'ordine è lo stesso. Un ordine che cambia fra due caricamenti è il secondo criterio che manca.
  - [x] Su ogni domanda leggo testo, testo di aiuto e tipo. Le quattro non-`testo_lungo` sono la 5 e la 19 (`testo breve`), la 10 (`scelta singola`, con le sue quattro opzioni) e la 23 (`testo breve`) (AC2).
  - [x] Le due domande senza testo di aiuto (le ultime del blocco 8) non lasciano un buco che sembra un difetto.
  - [x] Tutte e ventitré risultano attive, e la parola che dice se lo sono si vede senza doverla cercare (AC2).
  - [x] Nella barra a sinistra ci sono due voci; su `/questionario` è accesa `Questionario`, con la barra viola; su `/clienti` è accesa `Clienti`, con la barra blu (AC3).
  - [x] Su `/clienti/<id>` e su `/clienti/nuovo` resta accesa `Clienti`. Non regressione: prima era accesa perché scritta a mano.
  - [x] Dentro la pagina del questionario **non c'è niente di viola** (AC3).
  - [x] I quattro stati reggono: pieno, in caricamento (gli scheletri hanno la forma del contenuto e la pagina non salta quando arriva), in errore. Il vuoto si legge nel codice e non si prova cancellando dati.
  - [x] Larghezza 375px: le card non scorrono di lato, il testo delle domande resta leggibile, la barra a sinistra diventa una fascia in alto come già fa (`globals.css:831-844`).
  - [x] Da tastiera: Tab entra nelle due voci di navigazione, il focus si vede, Invio ci va.
  - [x] Nessun errore in console, nessun avviso di idratazione.
  - [x] Esco e rientro dall'accesso: `/questionario` non è raggiungibile senza sessione e rimanda a `/accedi`.

### Review Findings

Revisione del 6 agosto 2026, skill `bmad-code-review`, tre strati in parallelo (avversariale, casi limite, aderenza alla specifica). Nessuno strato è fallito. Otto scoperte corrette, sei rimandate, otto scartate come rumore.

Dopo i patch: `npm run typecheck` pulito, `npm test` 81 verdi su 81, `npm run build` pulita con `/questionario` fra le rotte dinamiche, `/questionario` e `/clienti` rispondono `307` verso `/accedi`, nessun errore del server. Nessun esadecimale e nessun `--sec-questionario` sotto `questionario/`, nessun `any` e nessun `as`, tutti i file sotto le 200 righe.

**La pagina vera non è stata aperta né in implementazione né in revisione**, per la stessa ragione: l'accesso è un collegamento via email e nessuna delle due sessioni di lavoro ne aveva una. **L'ha aperta Luca il 6 agosto 2026**, dopo i patch, e ha confermato che regge — parola `attiva` compresa, che era la correzione più visibile di questa passata e la sola cosa che nessuna verifica automatica poteva vedere. Le caselle della seconda metà di Task 7 sono spuntate su quella conferma.

- [x] [Review][Patch] **AC2 non è soddisfatto: a schermo niente dice che una domanda è attiva** [src/app/(app)/questionario/block-card.tsx:52] — rende qualcosa solo nel ramo negativo (`question.is_active ? null : <span>non attiva</span>`). Con 23 domande su 23 attive l'indicatore non compare mai, quindi oggi il 100% del contenuto della schermata non porta nessuna informazione sull'attività e la riga di Task 7 «la parola che dice se lo sono si vede senza doverla cercare» non si può spuntare guardando. Il Dev Agent Record dichiara la contraddizione e la chiude scegliendo «l'elenco chiuso delle parole» di Task 3; l'argomento non è stato applicato in modo coerente, perché quello stesso elenco è già superato a `block-card.tsx:71` con `Nessuna domanda in questo blocco.`, che nessun task chiede. **Deciso da Luca il 6 agosto 2026 in revisione: ogni domanda porta la sua parola, `attiva` o `non attiva`.** AC2 si legge alla lettera e la riga di Task 7 si può spuntare guardando; i ventitré `attiva` identici sono il costo accettato. L'elenco delle parole della schermata in Task 3 e nel Contratto visivo cresce di conseguenza.
- [x] [Review][Patch] **Il secondo criterio d'ordinamento non rompe nessun pareggio: tutte le righe del seed hanno lo stesso `created_at`** [src/app/(app)/questionario/page.tsx:56,58,60] — `supabase/seed.sql` è un unico `do $$ … end $$`, cioè una sola transazione, e `default now()` in Postgres è il timestamp *di transazione*. Verificato sul progetto: `count(distinct created_at)` vale 1 su 8 blocchi, 1 su 23 domande e 1 sul questionario. Quindi `(position, created_at)` è una parità identica a `position` da solo su ogni riga esistente, e il commento a `:39-42` dichiara chiuso un problema che resta aperto. L'unica colonna che rompe davvero i pareggi è `id`. Oggi non si vede — 23 posizioni distinte su 23 — e si vedrebbe alla prima collisione, cioè lo scenario che questa stessa story descrive per la 2.3 e per la 2.5.
- [x] [Review][Patch] **`docs/database.md` §8, appena riscritta, contiene una nuova affermazione falsa** [docs/database.md:375] — «ogni riga porta il proprio `owner_id`». `question_blocks` e `questions` non hanno `owner_id` (`0004_questionnaire.sql:28-48`): ce l'ha solo `questionnaires`, ed è precisamente il motivo per cui la §6 scrive policy che risalgono al questionario con un `exists` — la stessa sezione che questa story cita per giustificare l'assenza di un filtro sul proprietario nella query. Una story che chiude una voce di `deferred-work.md` aperta *perché §8 diceva il falso* la richiude con un'altra affermazione falsa nello stesso paragrafo.
- [x] [Review][Patch] **Le opzioni si rendono per qualsiasi `answer_type`, non solo per `scelta_singola`** [src/app/(app)/questionario/block-card.tsx:55] — la condizione guarda solo `options`. Lo schema non accoppia le due colonne: `0004_questionnaire.sql:43` è un `options text[]` nudo e «valorizzato solo per scelta_singola» è un commento, non un `check`. Scenario: la Story 2.4 riscrive la domanda 10 da `scelta_singola` a `testo_lungo` senza azzerare `options`, e la schermata elenca quattro scelte sotto un badge `testo lungo` — una domanda che annuncia opzioni che non offrirà.
- [x] [Review][Patch] **Il commento di `.question--inactive` descrive un'ereditarietà che non c'è** [src/app/globals.css:842] — «il testo e l'aiuto non dichiarano un colore proprio e lo ereditano» è falso per l'aiuto: `.meta` dichiara `color: var(--ink-muted)` (`:268`) e `.question__meta` pure (`:824`). L'unica cosa che eredita è `.question__text`. Oggi il risultato coincide perché i due colori sono lo stesso, quindi non si vede; si vede alla Story 2.6, quando qualcuno cambierà `.question--inactive` e l'aiuto non si muoverà.
- [x] [Review][Patch] **Manca `overflow-wrap` sulle classi nuove** [src/app/globals.css:808,829] — un token senza spazi più largo dello spazio utile (un URL o un dominio dentro il testo di aiuto) esce dalla card e fa scorrere la pagina di lato. A 375px lo spazio dentro la card è circa 295px. È lo stesso difetto che `globals.css:670-671` documenta e chiude per `.tag__text`, con il calcolo già scritto lì: le classi nuove non l'hanno ricevuto. Le 23 domande del seed non hanno token lunghi, quindi il controllo a 375px di Task 7 passerebbe sui dati veri senza vederlo.
- [x] [Review][Patch] **Il motivo dell'assenza del conteggio doveva stare nel codice e non c'è** [src/app/(app)/questionario/page.tsx:79] — Task 3 lo chiede alla lettera: «È la scelta meno ovvia della schermata e **il motivo va scritto nel codice**». L'intestazione è nuda e il motivo vive solo in questo file e nel Dev Agent Record, cioè nei due posti che il task considerava insufficienti.
- [x] [Review][Patch] **Due caselle di Task 7 sono spuntate su affermazioni non vere** [docs/bmad/implementazione/2-1-vedere-il-questionario-com-e-oggi.md:152,155] — la prima dice che la `select` «non contiene `.eq('is_active', true)`» e la `select` lo contiene (`page.tsx:55`), sul questionario e non sulle domande: la sostanza è rispettata ed è lo snippet stesso di Task 2 a metterlo lì, quindi il difetto è della specifica, che si contraddice fra Task 2 e Task 7. La seconda dice che i file toccati sono quelli di «Cosa cambia questa story» e nessun altro, ma `block-card.tsx` era condizionato a `page.tsx` sopra le 200 righe e la condizione non si è mai presentata (115 + 75, uniti circa 188). La scelta di dividerli è difendibile — `kb-0.md` §2 chiede un componente per file — ma è una deviazione da una regola condizionale scritta, e va dichiarata invece che assorbita.
- [x] [Review][Defer] **Il messaggio d'errore diagnostica, e diagnostica male il guasto più probabile** [src/app/(app)/questionario/page.tsx:86] — deferred, pre-esistente: replicato da `clienti/page.tsx:149`.
- [x] [Review][Defer] **AC3 regge nello stato pieno e non in quello d'errore** [src/app/globals.css:83-87] — deferred, pre-esistente: è la voce `:focus-visible` già rimandata alla Story 5.2.
- [x] [Review][Defer] **Un questionario con `is_active = false` si mostra come «non ancora caricato», con un'istruzione che non fa niente** [src/app/(app)/questionario/page.tsx:55,96-99] — deferred, non raggiungibile da questa story.
- [x] [Review][Defer] **`questions.text` e `question_blocks.title` non hanno il `check (length(trim(…)) > 0)` che `clients.name` ha** [supabase/migrations/0004_questionnaire.sql:31,39] — deferred, pre-esistente: è una differenza di schema, e questa story non tocca lo schema.
- [x] [Review][Defer] **Gli scheletri combaciano su una sola forma di card e a una sola larghezza** [src/app/(app)/questionario/loading.tsx:47-49] — deferred: è dentro Task 7, che resta a Luca.
- [x] [Review][Defer] **La fascia di navigazione su schermo stretto cresce con le voci** [src/app/globals.css:125-129,917-930] — deferred, territorio della Story 5.1.

## Dev Notes

### Punto di partenza: cosa esiste già e non va rifatto

Verificato sul repository e sul progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`, `eu-west-1`, PostgreSQL 17.6) il 5 agosto 2026.

**Lo schema c'è tutto ed è applicato.** `0004_questionnaire.sql` ha creato `questionnaires`, `question_blocks` e `questions` con i loro due indici; `0007_rls.sql` ha attivato la sicurezza a livello di riga sulle tre e scritto le tre policy; `0006_triggers.sql` tiene `updated_at` su `questionnaires` e `questions`. Questa story non tocca niente di tutto questo.

**Il questionario è caricato davvero.** Conteggio eseguito il 5 agosto 2026: 1 questionario, 8 blocchi, 23 domande, tutte e 23 attive, 1 utente, 2 clienti, 0 schede. È l'informazione che cambia due cose: lo stato pieno si può vedere subito e senza preparare niente, e lo stato vuoto **non** si può vedere senza cancellare dati, cosa che questa story vieta.

**I tipi generati ci sono già.** `src/lib/database.types.ts` contiene `questionnaires`, `question_blocks` e `questions` con le loro relazioni. Non va rigenerato niente.

**Le classi che servono sono quasi tutte scritte.** `.card`, `.card + .card`, `.card__header`, `.card__title`, `.badge`, `.meta`, `.data`, `.empty`, `.error-box`, `.skeleton`, `.page-header`, `.page-title`, `.nav`, `.nav__item`, `.nav__item--active`. Il pattern «lista separata da una riga dentro una card» esiste in `.people` / `.person`. Quello che manca è poco: la lista delle domande, il trattamento della disattivata, e il colore di sezione che smette di essere fisso.

**Il componente d'errore c'è.** `src/components/error-state.tsx`, 16 righe, `message` più `retryHref`. Non se ne scrive un secondo.

**La rotta è già protetta.** `proxy.ts` ha un matcher che prende tutto tranne gli statici e una lista di percorsi pubblici che contiene solo `/accedi` e `/auth`: `/questionario` è protetta dal momento in cui esiste, senza toccare il proxy. Il `getUser()` in pagina resta perché è la difesa che non dipende dal proxy, ed è quello che fanno già le due pagine dei clienti.

### Cosa cambia questa story, file per file

```
src/app/(app)/questionario/page.tsx      NUOVO — lettura e resa, Server Component
src/app/(app)/questionario/loading.tsx   NUOVO — gli scheletri
src/app/(app)/questionario/block-card.tsx NUOVO, solo se page.tsx supera le 200 righe
src/lib/answer-types.ts                  NUOVO — i quattro tipi e le loro etichette
src/lib/answer-types.test.ts             NUOVO — il test delle etichette
src/lib/questionnaire-order.ts           NUOVO, solo come ripiego di Task 2
src/lib/questionnaire-order.test.ts      NUOVO, insieme al precedente e mai senza
src/app/(app)/nav.tsx                    NUOVO — le due voci, l'attivo dal percorso
src/app/(app)/layout.tsx                 MODIFICA — monta <Nav />, resta server
src/app/globals.css                      MODIFICA — colore di sezione per voce, lista domande
docs/database.md                         MODIFICA — §8 allineata al seed vero
docs/bmad/implementazione/deferred-work.md MODIFICA — chiude la voce del 5 agosto
```

Niente sotto `src/app/(app)/clienti/`, niente in `src/lib/` oltre ai file elencati, nessuna migrazione, nessuna dipendenza.

`layout.tsx` oggi è 22 righe e rende una `<aside>` con `sidebar__brand`, una `<nav>` con l'unica voce scritta attiva a mano, e `sidebar__foot` con `SignOutButton`. Quello che cambia è **solo** il contenuto di `<nav>`, che diventa `<Nav />`. Il resto — la struttura `shell`/`sidebar`/`main`, il marchio, il pulsante di uscita — resta identico: è il layout di ogni schermata dell'applicazione, e una modifica di troppo lì si vede su tutto.

### Le quattro decisioni di questa story

**1. Una card per blocco, non una card sola.** Motivo scritto in Task 3: le Story 2.2 e 2.5 avranno bisogno di un'azione per blocco, e `design-system.md` §5 dice dove va un'azione dentro una card. Una card sola andrebbe smontata fra due story.

**2. Nessun conteggio nell'intestazione.** Il numero che conterebbe è quello delle domande attive, che diventa un concetto solo con la Story 2.6 e un dato solo con la Story 3.1. Un `23` che non cambia dopo una disattivazione sarebbe un numero falso su una schermata fatta per dire com'è il questionario adesso. Si aggiunge quando è vero.

**3. L'ordinamento si prova nel database prima di farlo in memoria.** La D23 ha ordinato in memoria per un motivo preciso — PostgREST non ordina per un aggregato delle righe innestate — e quel motivo qui non c'è: ordinare risorse innestate per una loro colonna è una cosa che PostgREST sa fare. Il ripiego in memoria esiste, dichiarato, e entra solo se la forma con il punto non funziona. Non è una preferenza: è l'ordine in cui si provano le due strade.

**4. Il colore di sezione smette di essere fisso nel foglio di stile.** Con una voce sola `--sec-clienti` dentro `.nav__item--active::before` era una scorciatoia senza conseguenze. Con due voci è un difetto, e AC3 lo chiede esplicitamente. La correzione è locale alla navigazione e non tocca il resto: in particolare **non** tocca `:focus-visible`, che è un'altra voce e un'altra story.

### Trappole note

| Trappola | Conseguenza | Come si evita |
|---|---|---|
| `question_blocks!inner` o `questions!inner` | Spariscono il questionario senza blocchi e il blocco senza domande, cioè proprio gli stati che le AC chiedono | Innesto normale, mai `!inner` |
| `.single()` o `.maybeSingle()` sul questionario | Due questionari attivi diventano la schermata d'errore | `.limit(1)` più `data?.[0] ?? null` |
| `.limit(1)` senza `.order` | Con due questionari la schermata cambia da un caricamento all'altro | `.order('created_at')` prima del limite |
| `.eq('is_active', true)` sulle domande | Metà di AC2 diventa invisibile: non si vede più *se* è attiva | Nessun filtro; l'attività si mostra, non si applica |
| `order by position` e basta | `position` non è unico in nessuna delle due tabelle: due domande si scambiano fra due caricamenti | Secondo criterio `created_at` su entrambi i livelli |
| `!data` usato per lo stato vuoto | Il database che non risponde dice «il questionario non è caricato»: una bugia rassicurante | `error` decide l'errore, `data` decide il vuoto |
| Un pulsante `Crea il primo blocco` nel vuoto | È la Story 2.2 costruita in anticipo e lasciata a metà | Il vuoto dice cosa fare a parole |
| Cancellare righe per vedere lo stato vuoto | Si distrugge il questionario vero per provare un ramo | Si legge il codice e si dichiara non visto |
| `--sec-questionario` dentro la pagina | UX-DR2: i colori di sezione vivono nella navigazione | Nessun token di sezione sotto `questionario/` |
| Rosso o ambra sulla domanda disattivata | Il colore direbbe «errore» o «attenzione» su una scelta di Luca | `--ink-faint` o `--neutral`, più la parola |
| Solo il colore a dire che è disattivata | UX-DR2 punto 4: il colore non è mai l'unico portatore | La parola `non attiva`, sempre |
| `pathname.startsWith('/clienti')` nudo | Accende `Clienti` anche su un ipotetico `/clientidiversi` | Uguaglianza oppure `href + '/'` |
| `pathname === href` e basta | La voce si spegne su `/clienti/<id>`: regressione rispetto a oggi | Il prefisso con la barra |
| `'use client'` su `layout.tsx` | Diventa client tutto il layout, `SignOutButton` compreso | Client solo `nav.tsx` |
| Correggere `:focus-visible` «già che c'ero» | Voce rimandata alla 5.2, tocca ogni campo del progetto | Si lascia e si dichiara |
| Barra richiudibile, icone, suggerimenti | È la Story 5.1, lasciata a metà | Solo la seconda voce e l'attivo |
| `details` dell'errore Supabase nei log | Conterrebbe valori delle righe (`kb-0.md` §3) | Solo `code` e `message` |
| `any` o un `as` per far tacere il compilatore | Vietato senza eccezioni (`kb-0.md` §2) | Tipi derivati da `database.types.ts` |
| Un colore o una misura nuovi in `globals.css` | Il divieto di `design-system.md` §10, §4 | Solo token e scala di 4 |

### Le posizioni del seed sono globali, non per blocco

È la scoperta più importante di questa story per le story che verranno, e va scritta qui perché è qui che si legge la tabella per la prima volta.

`supabase/seed.sql` numera le domande **da 1 a 23 attraverso tutto il questionario**, non da 1 dentro ogni blocco: il blocco `Contesto` ha le posizioni 1-3, `Obiettivo` le 4-6, e così via fino a 21-23 nell'ultimo. Il commento in testa al seed lo dichiara di proposito («`position` è il numero della domanda nel questionario intero, non dentro il blocco: è lo stesso numero che le risposte copiano per tenere l'ordine della scheda»), e `answers.position` in `0005` esiste esattamente per quello.

Per **questa** story non cambia niente: ordinare le domande per `position` dentro il loro blocco dà l'ordine giusto in entrambe le convenzioni, perché le posizioni sono comunque crescenti dentro ogni blocco.

Per le story dopo cambia tutto, e chi le scriverà deve trovarlo scritto:

- **Story 2.3**, che crea una domanda «in fondo al blocco, con posizione successiva all'ultima»: se calcola `max(position) + 1` dentro il blocco, la domanda nuova nel blocco 1 prende la posizione 4, che nel questionario intero appartiene già alla prima domanda del blocco 2. Le due non si scontrano — nessun vincolo unico lo impedisce — e l'ordine dentro `answers` diventa ambiguo.
- **Story 2.5**, che riordina «in modo che le posizioni restino consecutive e senza duplicati»: consecutive dentro cosa, il blocco o il questionario, è la domanda che quella story deve chiudere per prima.

Non si risolve qui, perché qui non si scrive niente. Si scrive dove si trova.

### Contratto visivo

- Le card sono quelle di sempre: fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24, **nessun bordo** (UX-DR3). Fra una card e l'altra 24, che `.card + .card` dà già.
- La separazione fra domande è una riga da 1px in `--line`, tolta alla prima: identica a `.person`, e per la stessa ragione — la densità sta nella tipografia e nell'allineamento, non nelle cornici.
- Il testo della domanda a `--t-heading` (17/24, peso 600), il testo di aiuto sotto a `--t-meta` (12/16) in `--ink-muted`. È esattamente il rapporto che `design-system.md` §3 descrive per il questionario: «la domanda si legge da lontano, l'aiuto solo se lo cerchi».
- Il tipo di risposta in `.badge`, fondo neutro `--surface-sunken`. Nessuna tinta di sezione, nessun colore semantico.
- La domanda disattivata: la parola `non attiva` in `--ink-muted` o `--neutral`, e il resto della riga può stare su `--ink-muted` invece che `--ink`. Il contrasto minimo resta 4.5:1 (`design-system.md` §8): `--ink-muted` su `--surface` lo rispetta, `--ink-faint` su `--surface` **no** per un testo che si deve leggere — va bene per un metadato, non per il testo della domanda.
- Nessuna icona. Le icone del progetto sono a tratto e in `--ink-muted`, e qui non ce ne sono: nessun lucchetto sulla domanda disattivata, nessun simbolo per il tipo di risposta.
- **Nessun valore esadecimale fuori dai token, nessun numero fuori dalla scala di 4** (`design-system.md` §10, §4). I 12, 16, 20 e 24 che servono sono già in uso nel file.
- Le parole: `Questionario`, `attiva`, `non attiva`, `testo lungo`, `testo breve`, `numero`, `scelta singola`, più le frasi dei vuoti. Italiano, frase minuscola, voce attiva, niente punti esclamativi, niente incoraggiamenti, niente emoji (UX-DR13). *(`attiva` aggiunta il 6 agosto 2026 con la decisione di revisione su AC2.)*

### Perimetro: cosa NON entra in questa story

- **Nessuna scrittura.** Nessuna Server Action, nessun `revalidatePath`, nessun `insert`, `update` o `delete`. Aggiungere, riscrivere, riordinare e disattivare sono le Story 2.2, 2.3, 2.4, 2.5 e 2.6, una per volta.
- **Nessuna migrazione**, nessuna tabella, colonna, indice, vincolo, trigger o policy. Nessun `apply_migration`. Le tre tabelle e le tre policy esistono.
- **Nessuna modifica a `seed.sql`.** Il contenuto del questionario è la decisione D19 ed è già rivisto; questa story lo legge, non lo cambia.
- **Nessun conteggio, nessuna barra di avanzamento, nessuna percentuale.** La barra di avanzamento è UX-DR9 e appartiene alla Story 4.1, e ha bisogno del totale congelato che non esiste ancora.
- **Nessuna `version` a schermo.** `questionnaires.version` si legge nella query — serve a far compilare la `select` una volta sola per tutta l'epica — ma non si rende da nessuna parte. Cresce «quando si modifica la struttura», e finché non esiste niente che la faccia crescere è un numero fermo che occupa spazio senza dire niente. La mostrerà la story che le dà un motivo per cambiare.
- **Niente della Story 5.1**: nessuna navigazione richiudibile, nessuna icona, nessun suggerimento al passaggio del mouse.
- **Niente della Story 5.2**: `:focus-visible` resta com'è, `.btn` resta alto 40, nessuna passata di accessibilità generale. Due voci rimandate restano rimandate.
- **Nessun `metadata` sulla rotta nuova.** È una voce di `deferred-work.md` dal 2 agosto che vale per tutte le rotte del progetto e si chiude in una passata sola: aggiungerlo qui su una sola rotta la lascerebbe aperta e disomogenea.
- **Nessuna ricerca, nessun filtro, nessuna piegatura dei blocchi.** Ventitré domande stanno in una pagina che si scorre.
- **Nessuna dipendenza nuova.** Nessuna libreria di icone, nessuna di accordion, nessun gestore di stato: la schermata è una lettura e una lista.
- **Nessuna anteprima della scheda** e nessun collegamento verso la compilazione: la Story 3.1 non esiste ancora.
- **Nessun test oltre quello delle etichette** (più quello del comparatore, se il ripiego di Task 2 entra in gioco). La pagina, le card, gli stati vuoti e la navigazione sono presentazione, e la loro verifica è Task 7 (`kb-0.md` §7).
- **Nessuna voce di `deferred-work.md` viene chiusa oltre a quella di `database.md` §8**, che è la sola che dichiara di chiudersi qui.

### Test

Un file, un modulo puro, nessuna impalcatura — più un secondo file solo se il ripiego di Task 2 entra in gioco, e in quel caso i due nascono insieme.

Cosa entra, e perché rientra in `kb-0.md` §7: la mappa da `answer_type` a etichetta è **una trasformazione** da un valore del database a un valore che si legge, cioè la stessa categoria di `parseClientFilters`. E come le altre, rompendosi non produce un errore: produce una domanda che dichiara un tipo di risposta diverso da quello che il campo sarà davvero in call. È un difetto che si scopre solo davanti al cliente.

Se entra il comparatore del ripiego, entra per lo stesso motivo di `byLastActivityDesc`: un ordinamento sbagliato non è un errore, è una sequenza di intervista diversa da quella che Luca ha deciso.

Cosa **non** entra: la pagina, la query, la navigazione, gli stati vuoti, le card. Sono presentazione e integrazione, e la loro verifica è la sessione di Task 7.

Restano fuori, come dalle Story 1.6, 1.7 e 1.8, i candidati naturali già elencati là: `parseDecisionRoles`, `personDisplayName`, `normalizeTag`, `collectTagSuggestions`, `normalizeClientName`. Non si aggiungono adesso, sarebbero lavoro non chiesto.

**Un vincolo tecnico da non scoprire a metà lavoro**, ereditato dalla Story 1.7: un modulo di `src/lib` raggiunto da un test deve usare l'estensione `.ts` su tutta la propria catena di import, altrimenti il test muore con `ERR_MODULE_NOT_FOUND` da un file che chi lo scrive non ha toccato. Né `tsc --noEmit` né `next build` lo segnalano. `answer-types.ts` non importa niente, quindi il problema non si pone; se il comparatore importasse qualcosa, si pone.

### Project Structure Notes

```
src/app/(app)/
├── layout.tsx              MODIFICA — <nav> monta <Nav />, il resto invariato
├── nav.tsx                 NUOVO — 'use client', usePathname, due voci
├── clienti/                intoccata
└── questionario/           NUOVA cartella
    ├── page.tsx            la schermata, Server Component
    ├── loading.tsx         gli scheletri
    └── block-card.tsx      solo se page.tsx supera le 200 righe

src/lib/
├── answer-types.ts         NUOVO
├── answer-types.test.ts    NUOVO
├── questionnaire-order.ts       solo come ripiego, mai senza il suo test
└── questionnaire-order.test.ts  idem

src/app/globals.css         MODIFICA — colore per sezione, lista delle domande
docs/database.md            MODIFICA — §8
docs/bmad/implementazione/deferred-work.md  MODIFICA — una voce chiusa
```

La rotta è `/questionario`, italiana e al singolare come `/clienti` è italiana al plurale: le rotte di questo progetto sono in italiano perché sono testo che si legge (`kb-0.md` §2, nomi in italiano nell'interfaccia).

Convenzioni vincolanti (`kb-0.md` §2): file e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni e variabili in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`, nomi in inglese nel codice e in italiano in quello che si legge. Un componente per file. Nessun file supera le 200 righe: se ci arriva, dentro c'è più di una cosa.

### Piattaforma in uso, verificata

Da `package.json` e dalla macchina, il 5 agosto 2026: Node `v24.13.0`, Next.js `^16.2.12` con App Router, React e React DOM `^19.2.8`, TypeScript `^5.9.0` con `strict`, `noUncheckedIndexedAccess` e `allowImportingTsExtensions`, `@supabase/ssr ^0.12.4`, `@supabase/supabase-js ^2.111.0`, `geist ^1.7.2`. Nessuna va aggiornata, nessuna entra.

`noUncheckedIndexedAccess` è attivo: `data[0]` ha tipo `T | undefined`, quindi `data?.[0] ?? null` non è prudenza, è quello che il compilatore pretende. Vale anche dentro le righe innestate.

Dal progetto Supabase `Registro` (`izkycpwxuedpkzgpvcxc`), regione `eu-west-1`, PostgreSQL 17.6, il 5 agosto 2026: sette migrazioni registrate, `pg_trgm` alla `1.6`, e il questionario caricato con 1 questionario, 8 blocchi, 23 domande tutte attive.

Da confermare eseguendo, e da scrivere nel Dev Agent Record:

- **Che `.order('position', { referencedTable: 'question_blocks.questions' })` ordini davvero il secondo livello di innesto.** È l'unica incertezza tecnica della story e non si dà per buona: l'ordinamento di una risorsa innestata a due livelli è una funzione di PostgREST di cui va verificata la sintassi in questa versione di `postgrest-js`. Il controllo è immediato, perché l'ordine giusto delle 23 domande è noto. Se non funziona, entra il ripiego di Task 2 e si scrive che cosa ha risposto.
- **Che `usePathname()` dentro un componente montato da un layout server dia il percorso corrente a ogni navigazione**, e non quello del primo caricamento. È il primo uso nel progetto.
- **Che il ramo vuoto non sia raggiungibile senza cancellare dati**, e quindi resti dichiarato come non visto invece che spuntato.

### Intelligence dai commit

Da `20afc72` (Story 1.8), `4d2ef1d`, `f407faa` e `3352e51` (Story 1.7), `4ac1646` e `0cc87f5` (Story 1.6), le abitudini che questa story eredita:

- **Le caselle non si spuntano se non sono vere.** La revisione della 1.6 ne ha rimesse vuote tre. Una casella spuntata su un compito non finito è un segnale di completamento falso.
- **Quello che non si è visto non si dichiara verificato.** La 1.7 ha scritto nel Dev Agent Record che la barra non è stata vista resa, invece di spuntare la casella. Qui vale per lo stato vuoto, che non è raggiungibile.
- **Un test si vede fallire prima di crederci.** Le 1.6, 1.7 e 1.8 hanno tutte una tabella delle rotture di proposito nel Dev Agent Record, con il ripristino verificato da `git diff`.
- **Task di verifica diviso in due**: quello che l'agente esegue e quello che richiede una sessione di Luca. La seconda parte resta la condizione per andare a `done`.
- **Fuori dal perimetro si chiede prima.** La 1.7 si è fermata davanti a un `ERR_MODULE_NOT_FOUND` che richiedeva un file non suo, e ha chiesto invece di decidere.
- **Nei log `code` e `message`, mai `details`** (`clienti/page.tsx:74-77`).
- **Un difetto che non produce un errore è il difetto peggiore.** È il filo di tutte e tre le ultime story — il filtro che tronca in silenzio, l'ordine che sembra plausibile, l'annullamento che riesce a metà — e in questa è l'ordine delle domande.
- **Le decisioni strutturali si scrivono dove sono state prese** (`kb-0.md` §8). La revisione della 1.6 ha dovuto aggiungere D23 perché due scelte vivevano solo nel file della story. La domanda 4 chiede se qui serva lo stesso.
- Messaggi di commit in italiano, imperativo, con il corpo che spiega il perché. Un commit per compito (`AGENTS.md`).

### Riferimenti

- Story e criteri: [Source: docs/bmad/pianificazione/epics.md#Story 2.1: Vedere il questionario com'è oggi]
- Le cinque story che vengono dopo, e che questa non deve anticipare: [Source: docs/bmad/pianificazione/epics.md#Epic 2: Questionario che si cambia senza un rilascio]
- FR12, FR13, FR14 e NFR9, i requisiti che l'epica copre: [Source: docs/bmad/pianificazione/epics.md#Requirements Inventory]
- UX-DR2 (governo del colore), UX-DR3 (card), UX-DR10 (pulsanti), UX-DR11 (quattro stati), UX-DR13 (voce), UX-DR14 (accessibilità), UX-DR16 (nessun esadecimale): [Source: docs/bmad/pianificazione/epics.md#UX Design Requirements]
- Le tre tabelle, i loro vincoli e il perché le domande si disattivano invece di cancellarsi: [Source: docs/database.md#3. Tabelle]
- Le policy che risalgono al questionario per `question_blocks` e `questions`: [Source: docs/database.md#6. Protezione degli accessi, due varianti]
- Il paragrafo da riscrivere, che oggi dice il falso: [Source: docs/database.md#8. Dati iniziali]
- Le domande come dati e non come codice, e il questionario modificabile dall'interfaccia: [Source: docs/prd-v1.md#3. Entità e campi]
- Card, badge, quattro stati, pillole, pulsanti, voce dell'interfaccia: [Source: docs/design-system.md#5. Componenti]
- I colori di sezione, la regola di governo del colore e i token: [Source: docs/design-system.md#2. Colore]
- La domanda a `--t-heading` e l'aiuto a `--t-meta`: [Source: docs/design-system.md#3. Tipografia]
- Contrasto, focus e bersagli tattili: [Source: docs/design-system.md#8. Accessibilità]
- Cosa entra sotto test e cosa no: [Source: docs/kb-0.md#7. Verifica]
- `any` vietato, un componente per file, nessuna dipendenza senza motivo: [Source: docs/kb-0.md#2. Convenzioni di codice]
- Nessun dato personale nei log, errori muti verso l'esterno: [Source: docs/kb-0.md#3. Sicurezza]
- I quattro stati e le parole come materiale di progetto: [Source: docs/kb-0.md#6. Interfaccia e design]
- Deriva del piano e duplicazione silenziosa: [Source: docs/kb-0.md#9. Anti-pattern del lavoro con agenti]
- Il questionario come decisione chiusa, 20 domande più 3 condizionali: [Source: docs/00-contesto-e-decisioni.md#D19. Questionario della fase 1, prima versione]
- Il software non blocca niente, e le domande si disattivano invece di sparire: [Source: docs/00-contesto-e-decisioni.md#D14. Il software non blocca niente]
- L'ordinamento in memoria e quando è la scelta giusta: [Source: docs/00-contesto-e-decisioni.md#D23. L'ultima attività si calcola in memoria, e le date si rendono in un fuso dichiarato]
- Story precedente, formato delle dichiarazioni di reversibilità e metodo di verifica: [Source: docs/bmad/implementazione/1-8-poter-tornare-indietro-da-una-modifica-di-schema.md]
- I quattro stati su una schermata che carica dati, e i due vuoti che sono due: [Source: docs/bmad/implementazione/1-7-cercare-e-filtrare-l-elenco.md]
- La voce da chiudere su `database.md` §8, e le due sulla 5.2 che restano aperte: [Source: docs/bmad/implementazione/deferred-work.md]

### Domande per Luca, e le risposte applicate

**Chiuse tutte e cinque da Luca il 5 agosto 2026: sì a tutti i default.** Le risposte sono già dentro i task, quindi qui non resta niente da decidere: questa sezione serve a chi fra tre mesi si chiede perché la story è fatta così.

Nessuna ribalta il default, quindi nessun task cambia. Le due che valeva la pena chiedere lo stesso sono la prima — perché nominare un file SQL dentro l'interfaccia è di solito un difetto — e la quarta, perché riguarda un file che è di Luca.

1. *Confermata: una riga senza pulsante, e il file si nomina.* **Lo stato vuoto: cosa dice, e senza pulsante?** AC4 chiede che dica cosa fare, UX-DR11 in generale chiede lo stato vuoto che *offre il pulsante che crea*. Qui il pulsante che crea è la Story 2.2 e non esiste ancora. Default: **una riga senza pulsante**, sul modello di «il questionario non è ancora stato caricato: si carica eseguendo `supabase/seed.sql` sul progetto Supabase». È un'istruzione tecnica dentro l'interfaccia, il che di solito è un difetto — qui l'unico utente è chi esegue quel file, quindi è l'informazione giusta invece che rumore.

2. *Confermata: `Questionario`.* **La voce di navigazione come si chiama?** È il nome della sezione in `design-system.md` §2 e il nome che l'epica usa. L'alternativa sarebbe `Domande`, che è come si nomina la cosa parlando. Default: **`Questionario`**, perché è già il nome della sezione e del colore.

3. *Confermata: non si mostra.* **La versione del questionario si mostra?** `questionnaires.version` è informativo per dichiarazione (`database.md` §3) e oggi vale 1. Su una schermata che si chiama «com'è oggi» un `versione 1` in monospaziato accanto al titolo sarebbe coerente; è anche un dato in più che nessuna AC chiede. Default: **non si mostra**, per la stessa ragione per cui non si mostra il conteggio — la versione cresce «quando si modifica la struttura», e finché non esiste niente che la faccia crescere (Story 2.2 e seguenti) è un numero fermo che non dice niente. Il divieto è ora scritto anche nel perimetro, perché è l'unica delle cinque risposte che si traduce in una cosa da **non** fare.

4. *Confermata: `00-contesto-e-decisioni.md` non si tocca.* **Va registrata una decisione sulle posizioni globali del seed?** È il tipo di cosa che le Story 2.3 e 2.5 troveranno scomoda e saranno tentate di «sistemare» senza sapere perché è così. Sta scritta in questa story e nel commento del seed, ma nessuno dei due è il posto dove si cerca. Default: **non lo tocco** — la decisione vera (consecutive dentro il blocco o dentro il questionario) non è ancora stata presa: la prende la Story 2.5, ed è lei che dovrà scriverla. **Conseguenza da non perdere:** questa è la seconda volta che una story registra la stessa scoperta senza chiuderla. Se la Story 2.5 non scrive la decisione dove si cerca, il posto giusto non esisterà mai.

5. *Confermata: la parola più `--ink-muted`, mai `--ink-faint` sul testo della domanda.* **La domanda disattivata: quanto si spegne?** Default: **la parola `non attiva` più il testo del blocco su `--ink-muted` invece che `--ink`**, con il testo della domanda che resta leggibile a 4.5:1. L'alternativa più forte — l'intera riga in `--ink-faint` — scenderebbe sotto il contrasto minimo su un testo che si deve poter leggere, e `design-system.md` §8 non lo permette.

## Dev Agent Record

### Agent Model Used

Claude Opus 5, skill `bmad-dev-story`, 5 agosto 2026.

### Debug Log References

**1. L'ordinamento innestato a due livelli funziona, e la prova è il controllo negativo.**

È l'unica incertezza tecnica che la story dichiarava, e non si poteva chiudere guardando il codice di `postgrest-js`: quello si limita a comporre il parametro (`PostgrestTransformBuilder.ts:380`, `const key = referencedTable ? \`${referencedTable}.order\` : 'order'`), e chi decide se il parametro vale qualcosa è il server.

Verificato contro il progetto vero con quattro richieste. La sessione anonima non vede nessuna riga per via della sicurezza a livello di riga, ma **un errore di sintassi o di pianificazione arriva prima del filtro sulle righe**, quindi il codice di stato distingue lo stesso:

| Richiesta | Risposta | Cosa dimostra |
|---|---|---|
| `question_blocks.questions.order=position.asc,created_at.asc` | `200`, `[]` | accettata |
| `question_blocks.questions.order=colonna_che_non_esiste.asc` | `400` — `column questions_2.colonna_che_non_esiste does not exist` | il parametro **viene applicato** all'innesto giusto, non ignorato |
| `question_blocks.order=colonna_che_non_esiste.asc` | `400` — `column question_blocks_1.colonna_che_non_esiste does not exist` | idem sul primo livello |
| `question_blocks.domande.order=position.asc` | `400` — `PGRST108: 'domande' is not an embedded resource in this request` | un percorso inventato viene **rifiutato**, quindi il `200` della prima riga non è un silenzio |

L'ultima riga è quella che rende conclusive le altre: se PostgREST scartasse i parametri che non riconosce, il `200` non direbbe niente. Non lo fa.

Poi la stessa catena `.order()` è stata costruita **dal codice della pagina**, non da un URL scritto a mano, e se ne sono letti i parametri prima di eseguirla — perché «ho provato una stringa che somiglia a quella che il codice produce» non è una verifica:

```
select    = id,name,version,question_blocks(id,title,position,created_at,questions(id,text,…))
order     = created_at.asc
blocchi   = position.asc,created_at.asc
domande   = position.asc,created_at.asc
is_active = eq.true   limit = 1     → status 200, nessun errore
```

**Il ripiego di Task 2 non è entrato.** `src/lib/questionnaire-order.ts` e il suo test non esistono: la prima strada ha funzionato, e la story dice che la seconda entra solo se la prima non funziona.

**2. Il tipo delle righe si perdeva, e non per colpa della query.** La `select` scritta come nella story — due letterali uniti con `+` — faceva fallire il controllo dei tipi con `Property 'question_blocks' does not exist on type 'GenericStringError'` e un `block` implicitamente `any`. Il motivo non è PostgREST: in TypeScript `'a' + 'b'` ha tipo `string` e non `'ab'`, e il parser della `select` ha bisogno del letterale. Risolto con un letterale unico su più righe: `select` toglie da sé ogni spazio fuori dalle virgolette (`PostgrestQueryBuilder.ts:935-946`), quindi andare a capo non cambia la richiesta. Nessun `as` e nessun `any` aggiunti — che era l'alternativa sbagliata a portata di mano.

**3. Le rotture di proposito, viste fallire prima di crederci** (`kb-0.md` §7).

| Rottura | Chi se ne accorge | Ripristinato |
|---|---|---|
| `testo_lungo: 'testo lungo'` → `'testo_lungo'` (etichetta lasciata grezza) | 2 test rossi: «i quattro valori danno le quattro etichette» e «nessuna etichetta porta la sottolineatura del database» | sì |
| il ramo del valore ignoto restituisce `LABEL.testo_lungo` invece del valore | 1 test rosso: «un tipo fuori dai quattro si mostra grezzo, non diventa un altro tipo» | sì |

Dopo il ripristino: 81 test verdi, e i due file risultano solo come non tracciati in `git status`, senza modifiche residue.

**4. Le altezze degli scheletri sono state misurate, non indovinate.** Non essendoci una sessione (vedi sotto), il contenuto è stato reso su un banco di prova statico servito in locale, con il `globals.css` vero e il testo vero del seed. Misure a 1280: testo della domanda 24, aiuto 16, riga del tipo 22 — che è l'altezza del `.badge`, non i 16 della sua riga di testo, ed è esattamente l'errore che `clienti/loading.tsx` documenta. Badge `testo lungo` 81 di larghezza, `scelta singola` 95; titoli dei blocchi fra 73 e 113.

Poi scheletro e contenuto sono stati messi sulla stessa pagina e confrontati: **card dello scheletro 408, card del contenuto 408, salto 0**. Gli stacchi non sono riprodotti a mano — `loading.tsx` usa le stesse `.questions` e `.question` del contenuto, così le due misure non possono divergere. Il banco di prova è stato rimosso a verifica finita: non è entrato nel repository.

**5. Le migrazioni sono ancora sette.** `list_migrations` sul progetto `izkycpwxuedpkzgpvcxc` risponde `0001`…`0007`, come la story pretende. Nessun `apply_migration`, nessuna scrittura verso il database in tutta la story.

### Completion Notes List

**Cosa è stato fatto**

- `src/lib/answer-types.ts`, modulo puro sul modello di `client-status.ts`, con la mappa verso le etichette e il commento che spiega perché lì la mappa non serve e qui sì. Nessun import: né React né Supabase.
- `src/lib/answer-types.test.ts`, 5 test con `node:test`. Il totale passa da 76 a 81: **cresce**, non cambia.
- La lettura del questionario in `questionario/page.tsx`: una sola richiesta, innesto normale, nessun filtro sulle domande, ordine dato dal database su entrambi i livelli con il secondo criterio `created_at` — che serve perché `position` non è unico in nessuna delle due tabelle.
- La schermata: una card per blocco, le domande come lista separata da una riga, testo + aiuto + tipo + attività. Nessun conteggio nell'intestazione, nessuna `version` a schermo, nessuna azione: la prima arriva con la Story 2.2.
- I quattro stati, con vuoto ed errore decisi da due variabili diverse e mai da un `!data`.
- La navigazione a due voci, con l'attivo calcolato sul prefisso e il colore di sezione che smette di essere fisso nel foglio di stile.
- `database.md` §8 riscritta, e la voce del 5 agosto in `deferred-work.md` chiusa con la barratura.

**Verificato dall'agente:** `npm run typecheck` pulito, `npm run build` pulito con `/questionario` fra le rotte dinamiche, `npm test` 81 verdi su 81. Nessun `any`, nessun `as`, nessun esadecimale e nessun `--sec-questionario` sotto `questionario/`, nessun `!inner`, nessun `.eq('is_active', true)` sulle domande, nessuna Server Action e nessun `revalidatePath`. I file toccati sono esattamente quelli di «Cosa cambia questa story», meno i due del ripiego che non è servito. Tutti i file nuovi stanno sotto le 200 righe: la più lunga è `page.tsx` con 115.

`/questionario` senza sessione risponde `307` verso `/accedi`, e `/clienti` continua a farlo: la rotta è protetta dal momento in cui esiste, senza toccare `proxy.ts`.

**Non visto reso, e dichiarato invece che spuntato**

Tre cose. Le prime due sono quelle che la story prevedeva; la terza no, ed è la più importante da leggere.

1. **Lo stato vuoto.** Non raggiungibile senza cancellare dati, cosa che la story vieta. Letto nel codice, non visto reso. Vale per tutti e due i vuoti: il questionario che non c'è e il questionario senza blocchi.
2. **La domanda disattivata.** Tutte e ventitré sono attive e non se ne è disattivata nessuna per guardare. Il trattamento è stato verificato sul banco di prova statico, dove risulta `--ink-muted` sul testo, sul badge e sulla parola — mai `--bad` e mai `--warn` — ma sul database vero non esiste ancora un caso.
3. **La pagina vera non è mai stata aperta.** L'accesso è un collegamento via email e non c'è una sessione da usare in questa sessione di lavoro. Tutto quello che ho verificato del disegno l'ho verificato su una copia statica col foglio di stile vero, e tutto quello che ho verificato dei dati l'ho verificato in SQL. **Nessuno dei due è la pagina.** È esattamente la ragione per cui Task 7 è diviso in due, e la seconda metà resta la condizione per andare a `done`.

I dati contro cui confrontare la sessione, letti il 5 agosto 2026: 8 blocchi nell'ordine `Contesto`, `Obiettivo`, `Costo di restare come si è`, `Dove si rompe`, `Conoscenza e misura`, `Strumenti già in uso`, `Decisione, tempo, denaro`, `Solo sopra le 50 persone…`; domande 3, 3, 3, 2, 4, 1, 4, 3; posizioni globali 1-23; zero disattivate; due senza testo di aiuto, entrambe nel blocco 8; una sola `scelta_singola`, la 10, con quattro opzioni.

**Una cosa da decidere, decisa nel modo più conservativo e poi ribaltata in revisione**

AC2 chiede di vedere «se è attiva». Task 3 e il Contratto visivo elencavano **due volte** le parole della schermata dicendo che sono tutte: `Questionario`, `non attiva`, e le quattro etichette dei tipi. Task 7 però chiede di verificare che «tutte e ventitré risultano attive, e la parola che dice se lo sono si vede senza doverla cercare» — e con ventitré domande attive e nessuna parola `attiva`, quella riga non si può spuntare guardando.

Le due letture portano a schermate diverse: o ogni domanda porta la sua parola (`attiva` / `non attiva`), oppure solo le disattivate la portano e l'assenza è il segnale. In implementazione **ho seguito l'elenco chiuso**, perché è esplicito, dichiarato completo e ripetuto in due punti.

**Chiuso da Luca in revisione, il 6 agosto 2026: ogni domanda porta la sua parola.** Due cose hanno rovesciato l'argomento dell'elenco chiuso. La prima: quell'elenco non era chiuso davvero — mancavano le frasi dei due vuoti e `Nessuna domanda in questo blocco.`, che sono a schermo e che nessun task chiede, quindi era già stato superato mentre lo invocavo. La seconda, che conta di più: un elenco di vocabolario dice quali parole possono comparire, non quali elementi si rendono, e non può superare un criterio di accettazione. Con ventitré attive su ventitré l'informazione non compariva mai, cioè AC2 non era soddisfatto su nessuna riga della schermata. I ventitré `attiva` identici restano rumore, ed è il costo accettato.

La lezione da portare avanti, perché non riguarda questa story sola: quando una regola di stile e un criterio di accettazione si contraddicono, si chiede — non si sceglie la regola di stile perché è scritta due volte.

**Rimandato, e perché**

- `:focus-visible` resta su `--sec-clienti-tint` anche sotto `/questionario`: è la voce già rimandata alla Story 5.2, vale per ogni campo del progetto, e correggerla qui avrebbe aperto un lavoro che non è di questa story.
- Niente della Story 5.1: nessuna barra richiudibile, nessuna icona, nessun suggerimento al passaggio del mouse.
- Nessun `metadata` sulla rotta nuova: è la voce del 2 agosto che vale per tutte le rotte e si chiude in una passata sola.

Nessuna voce nuova aggiunta a `deferred-work.md`, e nessuna chiusa oltre a quella che dichiarava di chiudersi qui.

### File List

```
src/lib/answer-types.ts                        NUOVO
src/lib/answer-types.test.ts                   NUOVO
src/app/(app)/questionario/page.tsx            NUOVO
src/app/(app)/questionario/block-card.tsx      NUOVO
src/app/(app)/questionario/loading.tsx         NUOVO
src/app/(app)/nav.tsx                          NUOVO
src/app/(app)/layout.tsx                       MODIFICA — monta <Nav />, resta server
src/app/globals.css                            MODIFICA — colore per sezione, lista delle domande
docs/database.md                               MODIFICA — §8 allineata al seed vero
docs/bmad/implementazione/deferred-work.md     MODIFICA — chiusa la voce del 5 agosto su §8
docs/bmad/implementazione/sprint-status.yaml   MODIFICA — scrittura di metodo
docs/bmad/implementazione/2-1-…md              MODIFICA — questo file
```

Non creati, perché il ripiego di Task 2 non è servito: `src/lib/questionnaire-order.ts` e `src/lib/questionnaire-order.test.ts`.

## Change Log

| Data | Versione | Descrizione | Autore |
|---|---|---|---|
| 5 agosto 2026 | 0.1 | Story creata | Claude Opus 5, skill `bmad-create-story` |
| 5 agosto 2026 | 0.2 | Le cinque domande chiuse da Luca, sì a tutti i default. Il divieto sulla `version` a schermo passa dalle domande al perimetro | Claude Opus 5 |
| 6 agosto 2026 | 1.0 | Verifica di sessione fatta da Luca sulla pagina vera, dopo i patch: la schermata regge, parola `attiva` compresa. Task 7 chiuso, story `done` | Luca |
| 6 agosto 2026 | 0.4 | Revisione del codice, tre strati. Otto scoperte corrette: la parola `attiva` su ogni domanda (decisione di Luca, AC2 non era soddisfatto), `id` come criterio finale d'ordinamento perché tutte le righe del seed condividono lo stesso `created_at`, le opzioni rese solo per `scelta_singola`, `database.md` §8 che dichiarava `owner_id` su tre tabelle invece che su una, `overflow-wrap` sulle classi nuove, due commenti che dicevano il falso, il motivo del non-conteggio portato nel codice, due caselle di Task 7 corrette. Sei voci rimandate in `deferred-work.md`. Status a `in-progress`: la pagina vera non è ancora stata aperta | Claude Opus 5, skill `bmad-code-review` |
| 5 agosto 2026 | 0.3 | Task 1-6 eseguiti. L'ordinamento a due livelli verificato con quattro richieste al progetto vero, ripiego in memoria non entrato. La `select` concatenata perdeva il tipo delle righe: sostituita con un letterale unico. Etichette viste fallire su due rotture. Scheletri misurati su un banco di prova statico, salto zero. `database.md` §8 riscritta, una voce di `deferred-work.md` chiusa. Task 7 resta a Luca: la pagina vera non è mai stata aperta, perché non c'è una sessione | Claude Opus 5, skill `bmad-dev-story` |
