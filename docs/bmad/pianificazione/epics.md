---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/prd-v1.md
  - docs/database.md
  - docs/design-system.md
  - docs/kb-0.md
  - docs/00-contesto-e-decisioni.md
  - AGENTS.md
---

# Registro - Epic Breakdown

## Overview

Questo documento contiene la scomposizione completa in epic e story di Registro, a partire dai requisiti del PRD, dal design system e dai vincoli di schema e di metodo.

**Nota sugli input:** il progetto non ha un documento chiamato "Architettura" né un contratto UX nel formato BMAD. Valgono come tali, per decisione presa il 2 agosto 2026: `database.md` per lo schema e i vincoli dei dati, `kb-0.md` e `AGENTS.md` per le regole vincolanti di costruzione, `design-system.md` per il contratto visivo e di interazione.

**Nota sullo stato di partenza:** l'impalcatura esiste già e non va rifatta. Sono in piedi: progetto Next.js 16 con App Router e TypeScript, sette migrazioni applicate con sicurezza a livello di riga su tutte le tabelle, seed del questionario pronto, token del design system, accesso con collegamento via email, elenco clienti in sola lettura con i quattro stati, rilascio su Vercel funzionante. La Epic 1 Story 1 non deve creare il progetto: deve partire dal primo pezzo di valore mancante.

## Requirements Inventory

### Functional Requirements

FR1: Creare un cliente indicando il solo nome, unico campo obbligatorio.
FR2: Modificare in linea i dati anagrafici del cliente: settore, sito web, città, provincia, indirizzo, canale di arrivo, fatturato, dipendenti, obiettivi di business, note.
FR3: Assegnare al cliente uno dei cinque stati descrittivi (potenziale, valutato, attivo, chiuso, perso) senza che nessuno stato impedisca un'azione.
FR4: Assegnare al cliente tag liberi e multipli, con suggerimento di quelli già in uso e normalizzazione in minuscolo prima della scrittura.
FR5: Aggiungere persone sotto un cliente, con nome, cognome, ruolo aziendale, email, telefono e note.
FR6: Assegnare a una persona più ruoli rispetto alla decisione fra: ha il problema, decide, può bloccare, referente operativo, interlocutore.
FR7: Segnare una sola persona per cliente come contatto principale, togliendo il precedente.
FR8: Elencare i clienti con nome, stato, tag, ultima attività ed esito dell'ultima scheda.
FR9: Cercare i clienti per nome.
FR10: Filtrare l'elenco per stato e per tag.
FR11: Ordinare l'elenco per ultima attività come impostazione predefinita, dove ultima attività è la più recente fra la modifica del cliente e la modifica delle sue schede.
FR12: Gestire il questionario dall'interfaccia: aggiungere, riscrivere e riordinare blocchi e domande senza toccare il codice.
FR13: Disattivare una domanda invece di cancellarla: sparisce dalle schede nuove e resta in quelle vecchie.
FR14: Ammettere quattro tipi di risposta: testo lungo, testo breve, numero, scelta singola con opzioni.
FR15: Aprire una scheda di prequalifica su un cliente in qualsiasi stato, indicando data e interlocutore.
FR16: Congelare nella scheda, al momento dell'apertura, il numero di domande attive: è il denominatore dell'avanzamento e non si aggiorna mai.
FR17: Salvare insieme a ogni risposta la copia del testo della domanda e del titolo del blocco com'erano quel giorno.
FR18: Compilare le risposte in blocchi in sequenza verticale, potendo saltare qualsiasi domanda e senza passaggi obbligati fra i blocchi.
FR19: Salvare automaticamente tre secondi dopo l'ultima digitazione, più un comando esplicito di salvataggio.
FR20: Mostrare in ogni momento l'esito e l'ora dell'ultimo salvataggio.
FR21: Riaprire una scheda interrotta e ritrovarla esattamente dov'era.
FR22: Registrare il verdetto fra sì, sì condizionato, no e non deciso, con motivo, condizione, data entro cui verificarla e prossimo passo; si può lasciare vuoto e cambiare in qualsiasi momento.
FR23: Marcare la scheda come bozza o chiusa, senza che questo dipenda dal verdetto.
FR24: Mostrare nella scheda cliente, per ogni scheda di prequalifica, quante domande sono state risposte sul totale congelato, con un contatore e una barra.
FR25: Esportare una scheda in markdown con intestazione (cliente, data, interlocutore), risposte raggruppate per blocco con il testo della domanda, e verdetto per esteso, con nome file prevedibile `cliente-data-prequalifica.md`.
FR26: Tenere note libere sul cliente, sempre visibili nella sua scheda.

### NonFunctional Requirements

NFR1: Il lavoro non si perde mai: qualsiasi interruzione durante la compilazione conserva l'ultimo salvataggio automatico.
NFR2: Sicurezza a livello di riga attiva su tutte le tabelle dal primo giorno, anche con un solo utente.
NFR3: Database in regione dell'Unione Europea.
NFR4: Funziona su portatile e su tablet; la compilazione dev'essere usabile a schermo piccolo, perché le call si fanno anche fuori casa.
NFR5: Nessuna chiamata a servizi esterni per funzionare: se un'integrazione è spenta, il lavoro continua.
NFR6: Nessuna intelligenza artificiale dentro il prodotto: nessuna trascrizione, nessuna generazione di testo, nessun suggerimento.
NFR7: Nessun punteggio, nessuna squalifica automatica, nessun suggerimento di esito: il verdetto è sempre della persona.
NFR8: Nessuno stato del cliente blocca nessuna azione: il software registra e mostra, non decide e non vieta.
NFR9: Ogni schermata che carica dati ha quattro stati progettati: pieno, vuoto, in caricamento, in errore.
NFR10: Ogni input si valida sul server con uno schema, anche quando il form lo valida già.
NFR11: Nessun segreto nel codice: solo variabili d'ambiente.
NFR12: TypeScript ovunque, `any` vietato.
NFR13: Contrasto minimo 4.5:1, focus sempre visibile, bersagli tattili di almeno 44px, rispetto della preferenza di sistema per il movimento ridotto.
NFR14: L'esportazione dei dati di un cliente dev'essere possibile senza scrivere codice nuovo.
NFR15: Nessun dato personale nei log: né email, né contenuti scritti dai clienti, né identificativi diretti.
NFR16: Gli errori mostrati dicono cosa fare, non cosa è successo nello stack.

### Additional Requirements

Dai vincoli di schema (`database.md`) e dalle regole vincolanti (`kb-0.md`, `AGENTS.md`):

- **L'impalcatura esiste già.** Next.js 16 con App Router e TypeScript, Supabase in `eu-west-1`, rilascio su Vercel da GitHub. Nessuna story deve ricreare il progetto o reinstallare la piattaforma.
- **Lo schema è già applicato**: sette tabelle, sette migrazioni numerate, policy di sicurezza a livello di riga su tutte, trigger `updated_at` su sei. Le story che toccano i dati partono da qui, non da zero.
- Ogni modifica di schema è un file di migrazione numerato dentro il repository, mai una modifica dalla dashboard.
- **Debito aperto da chiudere:** le sette migrazioni esistenti non dichiarano se sono reversibili, come invece impone `kb-0.md` §5.
- **Debito aperto da chiudere:** l'elenco clienti ordina per `clients.updated_at`, mentre `database.md` §5 definisce l'ultima attività come il maggiore fra quella e l'ultima modifica delle schede.
- Le righe di `answers` si creano tutte all'apertura della scheda, con `content` a `null`, così l'ordine è fissato e l'avanzamento si conta.
- I suggerimenti dei tag si ricavano con `select distinct unnest(tags) where owner_id = $1`; la normalizzazione in minuscolo avviene prima della scrittura, lato applicazione.
- Un indice unico parziale garantisce un solo contatto principale per cliente: l'applicazione toglie il precedente prima di segnarne un altro.
- Il seed del questionario si esegue una volta sola, dopo il primo accesso, perché ogni riga porta il proprio proprietario.
- L'accesso è un collegamento inviato per email; dopo il primo accesso vanno disattivate le nuove iscrizioni.
- Un componente per file; oltre le 200 righe un file quasi sempre contiene due cose.
- Nessuna dipendenza nuova senza motivo dichiarato: prima di aggiungere una libreria, se si fa in venti righe si fanno venti righe.
- I test automatici si scrivono per la logica che, se si rompe, produce dati sbagliati: calcoli, trasformazioni, permessi. Oggi non esiste né un test né un modo di eseguirli.
- Le tabelle della seconda versione (`audits`, `audit_entries`, `documents`) si agganciano a `clients` e non modificano le tabelle esistenti: non vanno anticipate.

### UX Design Requirements

Dal contratto visivo e di interazione (`design-system.md`):

UX-DR1: Navigazione laterale su card bianca, richiudibile a sola icona; voce attiva con fondo `--surface-sunken`, icona nel colore della sezione e barra verticale di 3px sul bordo sinistro; da richiusa, il passaggio del mouse mostra un suggerimento su fondo `--ink`.
UX-DR2: Regola di governo del colore: i colori di sezione vivono solo nella navigazione, i semantici solo nel contenuto, nessuna sezione usa verde, ambra o rosso, una sola cosa colorata satura per schermata, e il colore non è mai l'unico portatore di significato.
UX-DR3: Card come contenitore unico del contenuto: fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24, nessun bordo.
UX-DR4: Elenco clienti come tabella senza griglia: righe separate da 1px, altezza 56, passaggio del mouse su `--surface-sunken`, colonne nell'ordine nome, stato, tag, ultima attività, esito; date in monospaziato e in forma relativa entro la settimana, poi assoluta.
UX-DR5: Pillola di stato e di verdetto: altezza 22, raggio pieno, padding orizzontale 10, fondo nella tinta chiara e testo nel colore pieno; per gli stati del cliente un punto di 6px prima del testo, e i cinque stati non sono gerarchici.
UX-DR6: Badge numerico per contare persone e schede: raggio `--r-sm`, fondo in tinta chiara, cifra in monospaziato.
UX-DR7: Campo di risposta: fondo `--surface`, bordo 1px, raggio `--r-md`, padding 12/16, cresce in altezza col contenuto con un minimo di tre righe; al focus bordo `--sec-prequalifica` e alone di 3px nella sua tinta, mai l'anello predefinito del browser. Sopra la domanda a `--t-heading`, sotto il testo di aiuto a `--t-meta`.
UX-DR8: **Indicatore di salvataggio, elemento firma.** Riga ancorata in fondo alla schermata di compilazione, sempre visibile, in monospaziato, con tre stati soltanto: a riposo `Salvato alle 14:32` in `--ink-faint`, in corso `Salvataggio…` in `--ink-muted`, fallito `Non salvato, riprovo` in `--bad` con pulsante Riprova. Nessuna spunta animata, nessun avviso a comparsa.
UX-DR9: Barra di avanzamento: contatore in monospaziato nella forma `12 / 15` e barra alta 4px, larga 64, riempita in `--sec-prequalifica` su fondo `--surface-sunken`. Nessuna percentuale, nessun colore d'allarme.
UX-DR10: Quattro varianti di pulsante: primario su fondo `--ink` e una sola azione primaria per schermata, secondario bordato, discreto senza fondo, distruttivo in `--bad` e solo con conferma.
UX-DR11: I quattro stati di ogni schermata hanno un trattamento fissato: scheletri della forma reale del contenuto e mai un cerchio che gira, stato vuoto che dice cosa manca e offre il pulsante che lo crea, stato d'errore che dice cosa fare con l'azione di riprova accanto.
UX-DR12: Due famiglie tipografiche e sette gradi di scala: Geist per l'interfaccia, Geist Mono per numeri, date, ore e contatori. Il monospaziato sui dati non è estetica: è quello che rende una tabella leggibile a colpo d'occhio.
UX-DR13: Voce dell'interfaccia: italiano, frase minuscola, voce attiva; un'azione si chiama allo stesso modo dal pulsante alla conferma; le etichette nominano le cose come le riconosce chi le usa, non come sono fatte nel database; niente punti esclamativi, niente incoraggiamenti, niente emoji.
UX-DR14: Accessibilità: contrasto minimo 4.5:1 verificato su `--ink-muted` sopra `--surface-sunken`, focus visibile con alone di 3px nella tinta della sezione corrente, bersagli tattili di almeno 44px, ogni campo con una etichetta vera e non solo un segnaposto.
UX-DR15: Movimento: 150ms per gli stati di passaggio, 220ms per le comparse, `cubic-bezier(.2,.8,.2,1)`, nessuna animazione decorativa, rispetto della preferenza di sistema per il movimento ridotto.
UX-DR16: Nessun valore esadecimale fuori dal file dei token; nessun gradiente, vetro smerigliato o illustrazione tridimensionale; nessuna icona colorata dentro il contenuto.

### FR Coverage Map

FR1: Epic 1 - Creazione del cliente col solo nome
FR2: Epic 1 - Modifica in linea dell'anagrafica
FR3: Epic 1 - Stato descrittivo che non blocca
FR4: Epic 1 - Tag con suggerimenti e minuscolo forzato
FR5: Epic 1 - Persone sotto il cliente
FR6: Epic 1 - Ruoli multipli rispetto alla decisione
FR7: Epic 1 - Contatto principale unico per cliente
FR8: Epic 1 - Colonne nome, stato, tag, ultima attività · **completato in Epic 4** per la colonna esito
FR9: Epic 1 - Ricerca per nome
FR10: Epic 1 - Filtri per stato e per tag
FR11: Epic 1 - Ordinamento per ultima attività, calcolata come da `database.md` §5
FR12: Epic 2 - Blocchi e domande modificabili dall'interfaccia
FR13: Epic 2 - Disattivazione invece di cancellazione
FR14: Epic 2 - Quattro tipi di risposta
FR15: Epic 3 - Apertura della scheda su un cliente in qualsiasi stato
FR16: Epic 3 - Totale delle domande congelato all'apertura
FR17: Epic 3 - Copia del testo di domanda e blocco dentro la risposta
FR18: Epic 3 - Compilazione libera, blocchi in sequenza verticale
FR19: Epic 3 - Salvataggio automatico a tre secondi più comando esplicito
FR20: Epic 3 - Indicatore di salvataggio con l'ora
FR21: Epic 3 - Ripresa esatta di una scheda interrotta
FR22: Epic 3 - Verdetto, motivo, condizione, data, prossimo passo
FR23: Epic 3 - Bozza o chiusa, slegata dal verdetto
FR24: Epic 4 - Avanzamento per scheda nella scheda cliente
FR25: Epic 4 - Esportazione della scheda in markdown
FR26: Epic 1 - Note libere sempre visibili

### UX-DR Coverage Map

UX-DR1: Epic 5 - Story 5.1, navigazione richiudibile con suggerimento e voce attiva
UX-DR2: Epic 1 - Story 1.3 (pillole di stato), Epic 3 - Story 3.5 (pillole di verdetto), Epic 5 - Story 5.2 (il colore non è mai solo)
UX-DR3: Epic 1 - Story 1.2, la card come contenitore della scheda cliente
UX-DR4: Epic 1 - Story 1.6 e Story 1.7, tabella senza griglia e date relative in monospaziato
UX-DR5: Epic 1 - Story 1.3, Epic 4 - Story 4.2, stessa pillola in elenco e in scheda
UX-DR6: Epic 1 - Story 1.5, badge numerico delle persone
UX-DR7: Epic 3 - Story 3.2, campo di risposta con focus nella tinta di sezione
UX-DR8: Epic 3 - Story 3.3, indicatore di salvataggio nei suoi tre stati
UX-DR9: Epic 4 - Story 4.1, contatore e barra di avanzamento
UX-DR10: Epic 1 - Story 1.1 (primario), Epic 2 - Story 2.6 (assenza del distruttivo)
UX-DR11: Epic 1 - Story 1.7, Epic 2 - Story 2.1, i quattro stati su ogni schermata che carica dati
UX-DR12: Epic 1 - Story 1.6, monospaziato su date e contatori
UX-DR13: presente in ogni story attraverso le etichette in italiano e minuscolo delle sue AC
UX-DR14: Epic 5 - Story 5.2, passata di accessibilità verificata; Epic 3 - Story 3.2 per i 44px in compilazione
UX-DR15: Epic 5 - Story 5.2, rispetto della preferenza di movimento ridotto
UX-DR16: Epic 5 - Story 5.2 e vincolo permanente di `kb-0.md`, verificato a ogni story

## Epic List

### Epic 1: Clienti, persone, elenco che si ritrova

Luca mette nel sistema clienti veri e li ritrova. Crea un cliente scrivendo solo il nome, compila l'anagrafica quando la scopre, aggiunge le persone con cui parla e chi di loro decide, marca lo stato e i tag, tiene le note. Dall'elenco cerca per nome, filtra per stato e per tag, e vede in cima chi ha toccato per ultimo. È l'epica che rende lo strumento un archivio invece che una pagina vuota.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8 (parziale: colonna esito in Epic 4), FR9, FR10, FR11, FR26

**Implementation Notes:** tutto lo schema che serve esiste già; nessuna migrazione nuova. Consolidata in una sola epica perché elenco, scheda cliente e persone toccano le stesse due tabelle e gli stessi componenti. Include i due debiti aperti: la reversibilità non dichiarata nelle sette migrazioni e l'ultima attività calcolata su `clients.updated_at` invece che come da `database.md` §5. Include il banco di prova minimo, perché il calcolo dell'ultima attività è esattamente la logica che, rompendosi, produce dati sbagliati.

### Epic 2: Questionario che si cambia senza un rilascio

Luca riscrive una domanda che nella call non ha funzionato, ne aggiunge una, ne sposta l'ordine, ne disattiva una che non serve più. Tutto dall'interfaccia, senza toccare il codice e senza rimettere in produzione niente. Le schede già compilate restano leggibili come erano.

**FRs covered:** FR12, FR13, FR14

**Implementation Notes:** epica breve e isolata, tocca solo le tre tabelle del questionario e una schermata sua. Non dipende da nessuna epica e nessuna dipende da lei: il seed carica già le 23 domande approvate, quindi la compilazione può esistere anche senza questa. Va prima della compilazione solo se Luca vuole poter correggere le domande prima della prima call vera.

### Epic 3: Una call intera dentro lo strumento

Luca apre una scheda mentre è al telefono, scrive nei campi, salta le domande che non servono, e non pensa mai al salvataggio perché lo strumento glielo dice. Se il browser si chiude, riapre e ritrova tutto. Alla fine scrive il verdetto, o lo lascia in bianco e ci torna domani. È l'epica per cui esiste il prodotto: senza questa, il resto è un contenitore vuoto.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23

**Implementation Notes:** l'epica più densa e la più delicata, perché contiene l'unica promessa non negoziabile del prodotto, il lavoro non si perde. L'indicatore di salvataggio (UX-DR8) è l'elemento firma e va costruito qui con i suoi tre stati esatti. Le righe di `answers` si creano tutte all'apertura con `content` a `null`, e `total_questions` si scrive una volta sola: sono i due punti dove un errore si scopre mesi dopo.

### Epic 4: Ritrovare a mesi di distanza e portare fuori

Luca riapre un cliente dopo tre mesi e in un colpo d'occhio vede quali schede ha finito e quali ha lasciato a metà, e com'è andata. Poi esporta una scheda in markdown e la passa a un commerciale, o se la tiene fuori dal sistema. È l'epica che rende vero il criterio di successo dichiarato nel masterplan: ritrovare cosa aveva detto un cliente in meno di un minuto.

**FRs covered:** FR24, FR25, FR8 (completamento: colonna esito nell'elenco)

**Implementation Notes:** dipende da Epic 3, perché mostra ed esporta le schede. La barra di avanzamento (UX-DR9) usa il totale congelato e non il questionario corrente: è il punto in cui si verifica che aggiungere una domanda oggi non faccia tornare incomplete le schede chiuse ieri.

### Epic 5: Rifinitura dell'interfaccia

Luca stringe la navigazione quando lo schermo è piccolo, e usa lo strumento da tastiera, con poca luce o su un treno senza che nulla diventi illeggibile.

**FRs covered:** nessuno. Copre UX-DR1, UX-DR14, UX-DR15, UX-DR16.

**Implementation Notes:** epica aggiunta in fase di creazione delle story, non presente nella struttura approvata: due requisiti del design system, la navigazione richiudibile e la verifica di accessibilità, non appartenevano a nessuna funzionalità e sarebbero spariti dentro la prima epica urgente. Sta in fondo perché la passata di accessibilità ha senso quando tutte le schermate esistono. Non blocca niente e niente dipende da lei.

---

## Epic 1: Clienti, persone, elenco che si ritrova

Luca mette nel sistema clienti veri e li ritrova. Crea un cliente scrivendo solo il nome, compila l'anagrafica quando la scopre, aggiunge le persone con cui parla e chi di loro decide, marca lo stato e i tag, tiene le note. Dall'elenco cerca per nome, filtra per stato e per tag, e vede in cima chi ha toccato per ultimo.

### Story 1.1: Creare un cliente col solo nome

As a Luca,
I want creare un cliente scrivendo soltanto il nome,
So that posso registrarlo durante la telefonata senza fermarmi a compilare campi che ancora non conosco.

**Acceptance Criteria:**

**Given** l'elenco clienti vuoto
**When** apro l'elenco
**Then** vedo una riga che dice cosa manca e un pulsante che crea il primo cliente
**And** il pulsante non è un vicolo cieco: porta al modulo di creazione (UX-DR11)

**Given** il modulo di creazione aperto
**When** scrivo un nome e salvo
**Then** il cliente viene creato con stato `potenziale` e `owner_id` preso dalla sessione verificata sul server
**And** finisco sulla sua scheda, senza dover cercare la riga nell'elenco

**Given** il modulo di creazione aperto
**When** salvo con il campo nome vuoto o pieno di soli spazi
**Then** la creazione viene rifiutata con un messaggio che dice cosa fare
**And** il rifiuto avviene anche sul server con uno schema, non solo nel form (NFR10)

**Given** un cliente appena creato
**When** guardo la sua scheda
**Then** i campi non compilati si mostrano vuoti, mai come zero (FR1)

### Story 1.2: Vedere e modificare la scheda del cliente

As a Luca,
I want aprire la scheda di un cliente e correggere i suoi dati dove sono, senza passare da un modulo separato,
So that quando scopro qualcosa a metà di una call lo scrivo subito.

**Acceptance Criteria:**

**Given** un cliente esistente
**When** apro la sua scheda
**Then** vedo il nome a `--t-display`, e sotto settore, sito web, città, provincia, indirizzo, canale di arrivo, fatturato, dipendenti, obiettivi di business e note
**And** la schermata ha i suoi quattro stati: pieno, vuoto, in caricamento con scheletri della forma reale, in errore con l'azione di riprova (NFR9, UX-DR11)

**Given** la scheda aperta
**When** modifico un campo e confermo
**Then** il valore viene salvato e `updated_at` si aggiorna da solo tramite il trigger già esistente
**And** un valore cancellato torna vuoto, non diventa zero né stringa vuota mostrata come dato

**Given** il campo dipendenti
**When** scrivo un numero negativo
**Then** il salvataggio viene rifiutato dal vincolo già presente sulla tabella e l'errore dice cosa fare, non cosa è successo nello stack (NFR16)

**Given** le note libere
**When** le compilo
**Then** restano sempre visibili nella scheda, senza doverle aprire (FR26)

### Story 1.3: Cambiare lo stato del cliente

As a Luca,
I want marcare a che punto sono con un cliente,
So that dall'elenco capisco a colpo d'occhio dove mi trovo senza rileggere le note.

**Acceptance Criteria:**

**Given** un cliente in qualsiasi stato
**When** apro il selettore dello stato
**Then** vedo i cinque valori: potenziale, valutato, attivo, chiuso, perso
**And** nessuno di essi è presentato come migliore o più avanzato di un altro (UX-DR5)

**Given** un cliente in stato `chiuso` o `perso`
**When** provo a modificarne l'anagrafica o ad aprirvi qualsiasi cosa
**Then** l'azione riesce: nessuno stato impedisce nessuna azione (NFR8, FR3)

**Given** uno stato assegnato
**When** guardo la riga nell'elenco
**Then** vedo la pillola alta 22 con raggio pieno, punto di 6px prima del testo, e il testo sempre presente accanto al colore (UX-DR2, UX-DR5)

### Story 1.4: Marcare i clienti con tag riusabili

As a Luca,
I want marcare i clienti con etichette mie e riusarle senza riscriverle,
So that in tre mesi non mi ritrovo referral, Referral e referrals come tre cose diverse.

**Acceptance Criteria:**

**Given** la scheda di un cliente
**When** comincio a scrivere un tag
**Then** il campo mi suggerisce quelli che ho già usato, ricavati con `select distinct unnest(tags) where owner_id = $1`

**Given** un tag scritto in maiuscolo o con spazi ai bordi
**When** lo salvo
**Then** viene normalizzato in minuscolo e ripulito prima della scrittura, lato applicazione
**And** se il cliente ha già quel tag non viene aggiunto due volte

**Given** un cliente con più tag
**When** guardo la sua riga nell'elenco
**Then** li vedo tutti nella colonna tag (FR4)

### Story 1.5: Registrare le persone e chi decide

As a Luca,
I want tenere sotto il cliente le persone con cui parlo e il loro peso nella decisione,
So that so a chi scrivere e chi può dire di no prima di preparare una proposta.

**Acceptance Criteria:**

**Given** la scheda di un cliente
**When** aggiungo una persona
**Then** posso indicare nome, cognome, ruolo aziendale, email, telefono e note, e nessuno di questi campi è obbligatorio

**Given** una persona
**When** le assegno i ruoli rispetto alla decisione
**Then** posso sceglierne più di uno fra: ha il problema, decide, può bloccare, referente operativo, interlocutore
**And** l'etichetta mostrata è quella che riconosco io, per esempio "chi decide", non "ruolo decisionale" (UX-DR13)

**Given** un cliente che ha già un contatto principale
**When** segno come principale una seconda persona
**Then** la precedente smette di esserlo, e l'operazione riesce senza violare l'indice unico parziale già presente

**Given** un cliente con più persone
**When** guardo la scheda
**Then** vedo un badge numerico in monospaziato che le conta (UX-DR6)

### Story 1.6: Ordinare l'elenco per ultima attività vera

As a Luca,
I want vedere in cima all'elenco i clienti su cui ho lavorato per ultimo,
So that riapro lo strumento e riprendo da dove ero, invece di cercare.

**Acceptance Criteria:**

**Given** un cliente modificato ieri e un cliente la cui scheda di prequalifica è stata modificata oggi
**When** apro l'elenco
**Then** il secondo sta sopra il primo, perché l'ultima attività è il maggiore fra `clients.updated_at` e l'ultima modifica delle sue schede (`database.md` §5, FR11)

**Given** un cliente senza nessuna scheda
**When** calcolo la sua ultima attività
**Then** vale il suo `updated_at`, senza righe perse dal join

**Given** una data di ultima attività
**When** la mostro in tabella
**Then** appare in monospaziato, in forma relativa entro la settimana e assoluta oltre (UX-DR4, UX-DR12)

**Given** il progetto senza test
**When** questa storia viene chiusa
**Then** esiste un comando che esegue i test e almeno la formattazione della data e il calcolo dell'ultima attività ne hanno uno, perché sono la logica che rompendosi produce dati sbagliati (`kb-0.md` §7)

### Story 1.7: Cercare e filtrare l'elenco

As a Luca,
I want restringere l'elenco per nome, stato e tag,
So that trovo un cliente in pochi secondi anche quando ce ne sono duecento.

**Acceptance Criteria:**

**Given** l'elenco con più clienti
**When** scrivo una parte di un nome nella ricerca
**Then** vedo solo i clienti che corrispondono, sfruttando l'indice trigram già creato

**Given** l'elenco
**When** scelgo uno stato nel filtro
**Then** vedo solo i clienti in quello stato (FR10)

**Given** l'elenco
**When** scelgo un tag nel filtro
**Then** vedo solo i clienti che hanno quel tag, sfruttando l'indice gin già creato

**Given** una ricerca o un filtro che non trova nulla
**When** guardo la schermata
**Then** lo stato vuoto dice che nessun cliente corrisponde a questo filtro, non "nessun risultato trovato", e offre di azzerare i filtri (UX-DR11)

**Given** la tabella dell'elenco
**When** la guardo
**Then** le colonne sono nell'ordine nome, stato, tag, ultima attività, con righe alte 56 e nessuna griglia (UX-DR4)

### Story 1.8: Poter tornare indietro da una modifica di schema

As a Luca,
I want che ogni migrazione dica come si annulla, o perché non si può,
So that il giorno che una modifica va storta so se posso tornare indietro prima di eseguirla, non dopo.

**Acceptance Criteria:**

**Given** le sette migrazioni già applicate
**When** le apro
**Then** ognuna dichiara in testa se è reversibile e con quale operazione, oppure perché non lo è (`kb-0.md` §5)

**Given** una migrazione nuova
**When** viene scritta
**Then** la stessa dichiarazione è presente, e la sua assenza è un difetto come lo sarebbe una policy mancante

**Given** la dichiarazione di reversibilità
**When** la leggo
**Then** è una nota nel file di migrazione e non un file separato, perché una nota lontana dal codice che descrive invecchia da sola

---

## Epic 2: Questionario che si cambia senza un rilascio

Luca riscrive una domanda che nella call non ha funzionato, ne aggiunge una, ne sposta l'ordine, ne disattiva una che non serve più. Tutto dall'interfaccia, senza toccare il codice e senza rimettere in produzione niente.

### Story 2.1: Vedere il questionario com'è oggi

As a Luca,
I want vedere blocchi e domande nell'ordine in cui li chiederò,
So that prima di una call so cosa sto per chiedere e in che sequenza.

**Acceptance Criteria:**

**Given** il questionario caricato dal seed
**When** apro la schermata del questionario
**Then** vedo gli 8 blocchi nel loro ordine e sotto ciascuno le sue domande nel loro ordine
**And** per ogni domanda vedo il testo, il testo di aiuto, il tipo di risposta e se è attiva

**Given** la schermata del questionario
**When** la guardo
**Then** il colore di sezione usato nella navigazione è quello del questionario, e non entra nel contenuto (UX-DR2)
**And** la schermata ha i suoi quattro stati (NFR9)

**Given** un questionario non ancora caricato
**When** apro la schermata
**Then** lo stato vuoto dice che il questionario non è stato caricato e cosa fare, non "nessun risultato"

### Story 2.2: Aggiungere e rinominare un blocco

As a Luca,
I want creare un blocco nuovo e correggere il titolo di uno esistente,
So that posso riorganizzare l'intervista quando cambio il modo di condurla.

**Acceptance Criteria:**

**Given** la schermata del questionario
**When** aggiungo un blocco con un titolo
**Then** compare in fondo, con la posizione successiva all'ultima esistente

**Given** un blocco esistente
**When** ne cambio il titolo
**Then** il nuovo titolo vale per le schede aperte da adesso in poi
**And** le risposte già date conservano il titolo del blocco com'era quel giorno, perché ne hanno una copia propria (FR17)

**Given** un titolo vuoto
**When** provo a salvare
**Then** il salvataggio viene rifiutato sul server, non solo nel form (NFR10)

### Story 2.3: Aggiungere una domanda scegliendo il tipo di risposta

As a Luca,
I want aggiungere una domanda dentro un blocco e dire che tipo di risposta mi aspetto,
So that il campo che mi trovo davanti in call è già quello giusto.

**Acceptance Criteria:**

**Given** un blocco
**When** aggiungo una domanda con testo e testo di aiuto
**Then** viene creata in fondo al blocco, attiva, con posizione successiva all'ultima

**Given** la creazione di una domanda
**When** scelgo il tipo di risposta
**Then** posso scegliere fra testo lungo, testo breve, numero e scelta singola (FR14)
**And** se scelgo scelta singola posso elencare le opzioni, e senza almeno una opzione il salvataggio viene rifiutato

**Given** una domanda appena creata
**When** apro una scheda nuova
**Then** la domanda c'è; le schede già aperte restano com'erano

### Story 2.4: Riscrivere una domanda

As a Luca,
I want correggere il testo di una domanda e il suo testo di aiuto,
So that posso migliorare l'intervista dopo ogni call senza aspettare un rilascio.

**Acceptance Criteria:**

**Given** una domanda esistente
**When** ne riscrivo il testo o il testo di aiuto
**Then** la modifica vale per le schede aperte da adesso in poi

**Given** una domanda modificata
**When** riapro una scheda compilata prima della modifica
**Then** vi leggo la domanda com'era quel giorno, non quella di oggi (FR13, criterio di accettazione 4 del PRD)

**Given** una domanda di tipo scelta singola
**When** ne modifico le opzioni
**Then** le risposte già date restano quelle scritte, anche se l'opzione scelta non esiste più

### Story 2.5: Riordinare blocchi e domande

As a Luca,
I want spostare un blocco o una domanda su e giù,
So that la sequenza dell'intervista segue il modo in cui la conduco davvero.

**Acceptance Criteria:**

**Given** più blocchi
**When** ne sposto uno
**Then** le posizioni vengono riscritte in modo che restino consecutive e senza duplicati

**Given** più domande dentro un blocco
**When** ne sposto una
**Then** vale la stessa regola dentro quel blocco

**Given** un riordino
**When** apro una scheda nuova
**Then** le domande compaiono nel nuovo ordine; le schede già aperte conservano il loro

### Story 2.6: Disattivare una domanda invece di cancellarla

As a Luca,
I want togliere dal giro una domanda senza perdere le risposte che ha già raccolto,
So that non devo scegliere fra un questionario pulito e la storia dei clienti passati.

**Acceptance Criteria:**

**Given** una domanda attiva
**When** la disattivo
**Then** resta nella tabella con `is_active` a falso e non viene mai cancellata fisicamente (FR13)

**Given** una domanda disattivata
**When** apro una scheda nuova
**Then** quella domanda non compare e non entra nel totale congelato

**Given** una domanda disattivata
**When** riapro una scheda aperta prima della disattivazione
**Then** la domanda e la sua risposta ci sono ancora, leggibili

**Given** la schermata del questionario
**When** la guardo
**Then** non esiste nessun comando che cancella una domanda

---

## Epic 3: Una call intera dentro lo strumento

Luca apre una scheda mentre è al telefono, scrive nei campi, salta le domande che non servono, e non pensa mai al salvataggio perché lo strumento glielo dice. Se il browser si chiude, riapre e ritrova tutto. Alla fine scrive il verdetto, o lo lascia in bianco e ci torna domani.

### Story 3.1: Aprire una scheda di prequalifica su un cliente

As a Luca,
I want aprire una scheda su un cliente indicando data e interlocutore,
So that comincio a scrivere entro dieci secondi dall'inizio della call.

**Acceptance Criteria:**

**Given** un cliente in qualsiasi stato, anche chiuso o perso
**When** apro una scheda nuova
**Then** l'apertura riesce, perché nessuno stato blocca nessuna azione (NFR8, FR15)

**Given** l'apertura di una scheda
**When** la scheda viene creata
**Then** `total_questions` viene scritto una volta sola col numero di domande attive in quel momento, e non verrà mai più aggiornato (FR16)
**And** vengono create tutte le righe di `answers`, una per domanda attiva, con `content` a `null`, ciascuna con la copia del testo della domanda, del titolo del blocco e della posizione (FR17)

**Given** l'apertura di una scheda
**When** scelgo l'interlocutore
**Then** posso sceglierlo fra le persone di quel cliente, oppure lasciarlo vuoto
**And** la data proposta è oggi ed è modificabile

**Given** un cliente senza nessuna persona registrata
**When** apro una scheda
**Then** l'apertura riesce lo stesso, con interlocutore vuoto

### Story 3.2: Compilare le risposte durante la call

As a Luca,
I want scorrere i blocchi dall'alto e scrivere dove serve, saltando quello che non serve,
So that la scheda segue la conversazione invece di imporle un percorso.

**Acceptance Criteria:**

**Given** una scheda aperta
**When** la guardo
**Then** vedo i blocchi in sequenza verticale, ciascuno coi suoi campi, senza passaggi obbligati fra un blocco e l'altro (FR18)

**Given** una domanda
**When** la guardo
**Then** il testo sta sopra il campo a `--t-heading` e il testo di aiuto sotto a `--t-meta` in `--ink-muted` (UX-DR7)

**Given** un campo di risposta di tipo testo lungo
**When** ci scrivo dentro
**Then** cresce in altezza col contenuto, con un minimo di tre righe
**And** al focus ha bordo `--sec-prequalifica` e alone di 3px nella sua tinta, mai l'anello predefinito del browser (UX-DR7)

**Given** una domanda di tipo scelta singola
**When** la compilo
**Then** scelgo fra le opzioni salvate nella copia della domanda

**Given** una scheda intera
**When** la lascio completamente vuota
**Then** nessun campo è obbligatorio e nessun avviso mi ferma (FR18)

**Given** un tablet
**When** compilo la scheda
**Then** i bersagli toccabili sono almeno 44px e la schermata resta usabile (NFR4, UX-DR14)

### Story 3.3: Non pensare mai al salvataggio

As a Luca,
I want che quello che scrivo si salvi da solo e che lo strumento me lo dica,
So that posso guardare in faccia il cliente invece di cercare un pulsante Salva.

**Acceptance Criteria:**

**Given** un campo in cui sto scrivendo
**When** smetto di digitare per tre secondi
**Then** il contenuto viene salvato senza che io faccia niente (FR19)

**Given** la schermata di compilazione
**When** la guardo in qualsiasi momento
**Then** vedo l'indicatore di salvataggio ancorato in fondo, sempre visibile, in monospaziato (UX-DR8)

**Given** un salvataggio riuscito
**When** guardo l'indicatore
**Then** dice `Salvato alle 14:32` in `--ink-faint`

**Given** un salvataggio in corso
**When** guardo l'indicatore
**Then** dice `Salvataggio…` in `--ink-muted`

**Given** una connessione che cade durante il salvataggio
**When** guardo l'indicatore
**Then** dice `Non salvato, riprovo` in `--bad` con accanto un pulsante Riprova
**And** il contenuto scritto resta nel campo e non viene perso (NFR1)

**Given** la schermata di compilazione
**When** cerco un comando esplicito di salvataggio
**Then** esiste, oltre a quello automatico (FR19)

**Given** l'indicatore di salvataggio
**When** cambia stato
**Then** non compare nessuna spunta animata e nessun avviso a comparsa (UX-DR8)

### Story 3.4: Riprendere una scheda interrotta

As a Luca,
I want ritrovare la scheda esattamente dove l'avevo lasciata,
So that una call interrotta o un browser chiuso di colpo non mi costano il lavoro fatto.

**Acceptance Criteria:**

**Given** una scheda con tre campi compilati
**When** chiudo il browser di colpo e riapro la scheda
**Then** ritrovo i tre campi compilati (criterio di accettazione 3 del PRD, FR21)

**Given** una scheda parzialmente compilata
**When** la riapro
**Then** l'ordine delle domande è quello fissato all'apertura, non quello del questionario di oggi

**Given** una scheda riaperta
**When** riprendo a scrivere
**Then** il salvataggio automatico riparte come prima, senza dover ricaricare la pagina

### Story 3.5: Scrivere il verdetto

As a Luca,
I want chiudere la scheda con un giudizio mio e il motivo,
So that fra tre mesi so non solo cosa ho deciso ma perché.

**Acceptance Criteria:**

**Given** una scheda compilata
**When** arrivo in fondo
**Then** trovo il verdetto fra sì, sì condizionato, no e non deciso, con motivo, prossimo passo, e in caso di condizionato la condizione e la data entro cui verificarla (FR22)

**Given** un verdetto già scritto
**When** lo cambio
**Then** il cambiamento riesce sempre, in qualsiasi momento, senza conferme né avvisi (NFR8)

**Given** una scheda senza verdetto
**When** la lascio così
**Then** resta `non_deciso` e nessun avviso mi ferma

**Given** il verdetto
**When** guardo la sua pillola
**Then** verde per sì, ambra per condizionato, rosso per no, grigio per non deciso, ciascuna col proprio testo accanto al colore (UX-DR2, UX-DR5)

**Given** una scheda compilata
**When** cerco un punteggio, una raccomandazione o un suggerimento di esito
**Then** non ne esiste nessuno in nessun punto della schermata (NFR7)

### Story 3.6: Lasciare in bozza o chiudere

As a Luca,
I want marcare una scheda come finita quando lo è,
So that dall'elenco distinguo quelle da riprendere da quelle chiuse.

**Acceptance Criteria:**

**Given** una scheda in bozza
**When** la chiudo
**Then** passa a `chiusa` e resta comunque modificabile (NFR8, FR23)

**Given** una scheda senza verdetto
**When** provo a chiuderla
**Then** la chiusura riesce: nessun vincolo lega lo stato di compilazione al verdetto (FR23)

**Given** una scheda chiusa
**When** la riapro il giorno dopo e scrivo il verdetto
**Then** l'operazione riesce (criterio di accettazione 6 del PRD)

---

## Epic 4: Ritrovare a mesi di distanza e portare fuori

Luca riapre un cliente dopo tre mesi e in un colpo d'occhio vede quali schede ha finito e quali ha lasciato a metà, e com'è andata. Poi esporta una scheda in markdown e la passa a un commerciale.

### Story 4.1: Vedere a che punto è ogni scheda

As a Luca,
I want vedere per ogni scheda quante domande ho risposto sul totale,
So that distinguo una scheda finita da una lasciata a metà senza aprirla.

**Acceptance Criteria:**

**Given** un cliente con più schede
**When** apro la sua scheda cliente
**Then** vedo l'elenco delle sue schede con data, esito e avanzamento (FR24)

**Given** una scheda con 12 risposte su 15 domande
**When** guardo il suo avanzamento
**Then** vedo il contatore `12 / 15` in monospaziato e accanto una barra alta 4px e larga 64, riempita in `--sec-prequalifica` (UX-DR9)
**And** non vedo nessuna percentuale e nessun colore d'allarme

**Given** una risposta compilata con soli spazi
**When** viene contata
**Then** non conta come risposta

**Given** una scheda chiusa ieri con 15 domande su 15
**When** oggi aggiungo una domanda nuova al questionario
**Then** quella scheda continua a mostrare `15 / 15` e non torna incompleta (FR16, criterio di accettazione 10 del PRD)

### Story 4.2: Vedere l'esito nell'elenco clienti

As a Luca,
I want vedere nell'elenco com'è finita l'ultima valutazione di ogni cliente,
So that scorro duecento righe e capisco dove sono senza aprirne nessuna.

**Acceptance Criteria:**

**Given** un cliente con più schede
**When** guardo la sua riga nell'elenco
**Then** vedo l'esito della scheda più recente per data di call (FR8)

**Given** un cliente senza nessuna scheda
**When** guardo la sua riga
**Then** la colonna esito è vuota, non mostra "non deciso" né uno zero

**Given** la colonna esito
**When** la guardo
**Then** usa le stesse pillole della scheda, con lo stesso testo e lo stesso colore (UX-DR5)

### Story 4.3: Esportare una scheda in markdown

As a Luca,
I want portare fuori una scheda in un file leggibile,
So that posso passarla a un commerciale o tenerla fuori dal sistema senza copiarla a mano.

**Acceptance Criteria:**

**Given** una scheda compilata
**When** la esporto
**Then** ottengo un file markdown con intestazione (cliente, data, interlocutore), le risposte raggruppate per blocco con il testo della domanda a cui rispondono, e il verdetto per esteso (FR25, criterio di accettazione 7 del PRD)

**Given** l'esportazione
**When** guardo il nome del file
**Then** è prevedibile, nella forma `cliente-data-prequalifica.md`

**Given** una scheda con domande saltate
**When** la esporto
**Then** le domande senza risposta compaiono comunque, con la risposta vuota, perché una domanda non fatta e una domanda senza risposta non sono la stessa cosa

**Given** una scheda che contiene domande poi modificate o disattivate
**When** la esporto
**Then** il markdown riporta le domande com'erano quel giorno (FR17)

---

## Epic 5: Rifinitura dell'interfaccia

Due requisiti del design system non appartengono a nessuna funzionalità in particolare ma valgono su tutte le schermate: la navigazione e la verifica di accessibilità. Stanno qui perché infilarli dentro una epica funzionale li avrebbe fatti sparire dietro il primo obiettivo urgente.

### Story 5.1: Navigazione laterale richiudibile

As a Luca,
I want poter stringere la navigazione a sole icone,
So that su un portatile piccolo o su un tablet la scheda in compilazione si prende la larghezza che le serve.

**Acceptance Criteria:**

**Given** la navigazione aperta
**When** la richiudo
**Then** resta la sola colonna di icone, e la scelta viene ricordata alla visita successiva

**Given** la navigazione richiusa
**When** passo il mouse su una voce
**Then** compare un suggerimento su fondo `--ink` con testo bianco (UX-DR1)

**Given** la sezione corrente
**When** guardo la sua voce
**Then** ha fondo `--surface-sunken`, icona nel colore della sezione e una barra verticale di 3px sul bordo sinistro (UX-DR1)

**Given** uno schermo stretto
**When** apro qualsiasi schermata
**Then** la navigazione non copre il contenuto e resta raggiungibile (NFR4)

### Story 5.2: Passata di accessibilità verificata

As a Luca,
I want che lo strumento resti usabile da tastiera e leggibile in condizioni scomode,
So that compilare una scheda in treno o con poca luce non diventa un ostacolo.

**Acceptance Criteria:**

**Given** ogni testo dell'interfaccia
**When** ne misuro il contrasto
**Then** è almeno 4.5:1, verificato in particolare per `--ink-muted` sopra `--surface-sunken` (UX-DR14)

**Given** la navigazione da tastiera
**When** passo di elemento in elemento
**Then** il focus è sempre visibile, con alone di 3px nella tinta della sezione corrente

**Given** ogni campo di ogni modulo
**When** lo ispeziono
**Then** ha una etichetta vera, non solo un segnaposto

**Given** la preferenza di sistema per il movimento ridotto
**When** è attiva
**Then** le transizioni si annullano (UX-DR15)

**Given** qualsiasi informazione trasmessa da un colore
**When** la guardo
**Then** ha sempre anche un testo che la ripete (UX-DR2)
