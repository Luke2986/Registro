# PRD, prima versione

**Progetto:** software personale per la valutazione e il seguito dei clienti
**Versione del documento:** 1, 2 agosto 2026
**Riferimenti:** `masterplan.md`, `00-contesto-e-decisioni.md`

Le proposte non ancora confermate sono marcate **[da confermare]**.

---

## 1. Scopo

Permettere di condurre una call di prequalifica compilando una scheda in diretta, chiuderla con un verdetto scritto, e ritrovare mesi dopo cosa è stato detto e da chi.

Utente: uno solo, l'autore. Nessun invito, nessun ruolo, nessuna condivisione.

## 2. Perimetro

**Dentro:** clienti con le loro persone, questionario modificabile, compilazione della scheda con salvataggio automatico, verdetto, elenco filtrabile, esportazione della singola scheda in markdown.

**Fuori:** fase 2 e audit, caricamento di file, uscite verso Notion o CRM, collaboratori, intelligenza artificiale di qualsiasi tipo, notifiche, calendario.

## 3. Entità e campi

### Cliente

| Campo | Tipo | Note |
|---|---|---|
| `nome` | testo | **Unico campo obbligatorio.** È l'identificativo nell'elenco |
| `stato` | scelta | potenziale, valutato, attivo, chiuso, perso. Descrittivo, non blocca nulla (D14) |
| `settore` | testo | libero |
| `sito_web` | testo | |
| `citta`, `provincia`, `indirizzo` | testo | |
| `canale_arrivo` | testo | come è arrivato il contatto |
| `fatturato` | testo | testo e non numero: "circa due milioni" è una risposta reale |
| `dipendenti` | numero | |
| `obiettivi_business` | testo lungo | |
| `tag` | elenco di testi | marcature libere e trasversali: referral, conosciuto a un evento, urgente |
| `note` | testo lungo | appunti liberi, sempre visibili |
| `creato_il`, `aggiornato_il` | data e ora | automatici |
| `owner_id` | riferimento | presente dal primo giorno anche con un solo utente (D9) |

Tutti i campi tranne `nome` sono facoltativi e restano vuoti finché non si sa (D13, D15). Un campo non compilato si mostra vuoto, mai come zero. I valori qui dentro sono l'ultimo stato conosciuto e si sovrascrivono; quelli dentro una scheda di prequalifica restano com'erano quel giorno e non si aggiornano mai da soli.

### Persona

Sotto il cliente, anche quando ce n'è una sola.

| Campo | Tipo | Note |
|---|---|---|
| `nome`, `cognome` | testo | |
| `ruolo_aziendale` | testo | quello che c'è sul biglietto da visita |
| `ruoli_decisione` | scelta multipla | ha il problema, decide, può bloccare, referente operativo, interlocutore |
| `email`, `telefono` | testo | |
| `principale` | vero/falso | uno solo per cliente |
| `note` | testo lungo | |

### Questionario

| Campo | Tipo | Note |
|---|---|---|
| `versione` | numero | cresce a ogni modifica strutturale, a scopo informativo |
| `blocchi` | elenco | titolo e ordine |
| `domande` | elenco | testo, testo di aiuto ("cosa serve capire"), tipo di risposta, ordine, attiva sì/no |

**La riga `versione` è superata dall'8 agosto 2026, con la decisione D25.** Nessuna delle cinque scritture del questionario la fa crescere — blocchi, domande nuove, riscrittura, riordino, disattivazione — e `version` resta `1` finché nessuno la legge: la ricostruzione delle schede vecchie passa dalle copie salvate dentro le risposte, non da qui. La riga resta scritta perché la colonna esiste ancora e le esportazioni future potrebbero volerla. Il motivo per esteso sta in `00-contesto-e-decisioni.md` (D25), la conseguenza sullo schema in `database.md` §3.

Tipi di risposta previsti: testo lungo, testo breve, numero, scelta singola. Le domande si aggiungono, si riordinano, si riscrivono e si disattivano dall'interfaccia, senza toccare il codice.

Una domanda disattivata non compare nelle nuove schede ma resta leggibile in quelle vecchie.

### Scheda di prequalifica

Una compilazione, riferita a un cliente e a una data.

| Campo | Tipo | Note |
|---|---|---|
| `cliente` | riferimento | |
| `data`, `interlocutore` | data, riferimento a persona | |
| `versione_questionario` | numero | quale versione era attiva |
| `risposte` | elenco | vedi sotto |
| `verdetto` | scelta | sì, sì condizionato, no, non ancora deciso |
| `motivo` | testo lungo | |
| `condizione`, `verificare_entro` | testo, data | usati se il verdetto è condizionato |
| `prossimo_passo` | testo | |
| `stato_compilazione` | scelta | bozza, chiusa |

### Risposta

| Campo | Tipo | Note |
|---|---|---|
| `domanda_id` | riferimento | |
| `testo_domanda_al_momento` | testo | **copia del testo della domanda com'era quando è stata posta** |
| `blocco_al_momento` | testo | idem per il blocco |
| `tipo_al_momento` | scelta | idem per il tipo di risposta: è quello che decide il controllo da mostrare |
| `opzioni_al_momento` | elenco di testi | idem per le opzioni, valorizzato solo se il tipo era scelta singola |
| `aiuto_al_momento` | testo | idem per il "cosa serve capire" |
| `contenuto` | testo | la risposta |
| `aggiornato_il` | data e ora | |

**Le tre righe del tipo, delle opzioni e dell'aiuto sono state aggiunte il 9 agosto 2026, con la Story 3.2.** Il documento ne elencava cinque e il tipo si sarebbe risalito da `domanda_id`: ma allora una domanda riscritta cambierebbe le schede vecchie sotto gli occhi. La schermata di compilazione le legge tutte e tre da qui e non tocca mai il questionario. Lo schema in `database.md` §3, il motivo per esteso in testa a `supabase/migrations/0015_answer_question_copy.sql`.

**Scelta tecnica, e conta più di quanto sembri:** salvare insieme alla risposta una copia della domanda — il testo, il blocco, e dalla 3.2 anche il tipo, le opzioni e l'aiuto — evita tutta la macchina del versionamento relazionale. Il giorno che riscrivi o cancelli una domanda, le schede vecchie restano leggibili così com'erano, senza migrazioni e senza risposte orfane. Costa qualche colonna in più per riga.

## 4. Schermate

### Elenco clienti (schermata iniziale)

Tabella con nome, stato, tag, ultima attività, esito dell'ultima scheda. Ricerca sul nome, filtro per stato e per tag. Ordinamento predefinito per ultima attività.

I tag si scrivono liberamente, ma il campo suggerisce quelli già usati e li normalizza in minuscolo, altrimenti in tre mesi hai referral, Referral e referrals come tre cose diverse.

Stato vuoto: un invito a creare il primo cliente, non una scritta grigia.

### Scheda cliente

Una pagina con: dati anagrafici modificabili in linea, elenco delle persone, elenco delle schede di prequalifica, note libere.

Ogni scheda nell'elenco mostra data, esito e **avanzamento della compilazione**: il numero di domande a cui hai risposto sul totale che quella scheda conteneva, con una barra sottile accanto. Niente percentuali, niente grafici, niente colori d'allarme: serve a sapere se una scheda è finita o lasciata a metà.

Il totale è il numero di domande presenti in quella scheda quando è stata compilata, non nel questionario di oggi. Altrimenti il giorno che aggiungi una domanda tutte le schede chiuse tornano incomplete. Conta come risposta qualsiasi campo non vuoto.

Da qui si crea una scheda nuova.

**Anche le persone hanno il loro cestino, dall'11 agosto 2026.** `Elimina` su una persona non cancella: la mette in un **Cestino** che compare sotto l'elenco delle persone e solo quando c'è qualcosa dentro, con un `Ripristina` che la rimette dov'era — i suoi campi, i suoi ruoli, il contrassegno di contatto principale se nel frattempo nessun altro l'ha preso. **E se era l'interlocutore di una scheda, torna a esserlo**: è la parte che conta, perché una scheda che perde chi è stato intervistato perde un'informazione che non sta scritta da nessun'altra parte. Solo dove la scheda non ne ha ricevuto un altro nel frattempo: quella sarebbe una scelta più recente, e il ripristino non la rovescia.

Con questo il software non ha più nessuna cancellazione senza ritorno.

### Compilazione della scheda

La schermata su cui si lavora durante la call, quindi progettata per quello: blocchi in sequenza verticale, campo di risposta ampio, testo di aiuto visibile sotto la domanda, nessun passaggio obbligato fra i blocchi.

- Salvataggio automatico tre secondi dopo l'ultima digitazione, più un comando esplicito di salvataggio.
- Indicazione visibile dell'ultimo salvataggio, con l'ora.
- Chiudendo e riaprendo si torna esattamente dov'era.
- Le domande si possono saltare, tutte.
- Il verdetto sta in fondo, si può lasciare vuoto e compilare dopo, e si può cambiare in qualsiasi momento.

### Gestione del questionario

Elenco dei blocchi e delle domande, con riordino, modifica del testo, attivazione e disattivazione. Nessuna cancellazione fisica: si disattiva.

**L'ultima frase è precisata dall'11 agosto 2026, e va letta insieme a quello che la motiva.** La regola esiste per proteggere le schede vecchie: cancellare una domanda che una scheda contiene toglierebbe la domanda a cui una risposta risponde. Non dice niente invece su una domanda scritta per sbaglio due minuti fa, che nessuna scheda ha mai visto — e quella restava in un questionario che si rilegge a ogni call, senza nessun modo di toglierla.

Da qui `Elimina`, che compare **solo** dove non c'è storia da perdere: su una domanda che nessuna scheda ha mai contenuto, e su un blocco senza domande. Appena una scheda contiene la domanda il pulsante sparisce e resta `Disattiva`, che è la risposta giusta per quel caso e continua a essere l'unica. Il pulsante sparisce invece di rifiutare perché la regola è del server ma dev'essere visibile prima di premere. Come è imposta, e perché non basta un `delete`, sta in `database.md` §3.

**E `Elimina` non cancella: archivia.** Quello che togli finisce in un **Cestino**, in fondo alla stessa schermata, con un `Ripristina` accanto che lo rimette dov'era — identico, con il suo tipo, le sue opzioni, il suo «cosa serve capire» e il suo stato di attivazione. La card del cestino non compare quando è vuoto. La conferma su `Elimina` resta comunque, benché l'azione sia ora reversibile: il ritorno sta in un'altra parte della pagina, e in un elenco di ventitré righe simili un tocco sbagliato si fa senza accorgersene.

**Quello che il cestino non tocca, ed è il punto che conta:** le risposte già date dai clienti non passano di lì e non si cancellano in nessun caso, perché ogni risposta porta la propria copia della domanda. Cambiare, disattivare o eliminare una domanda oggi non modifica una sola lettera di una scheda compilata un anno fa.

### Esportazione

Da una scheda, un file markdown con intestazione (cliente, data, interlocutore), le risposte raggruppate per blocco con il testo della domanda, e il verdetto per esteso. Nome file prevedibile: `cliente-data-prequalifica.md`.

**«Prevedibile» aveva bisogno di una definizione, e la Story 4.3 gliene ha data una (11 agosto 2026).** Tre cose che il capoverso qui sopra non dice e che si cercano qui:

- **I livelli dei titoli:** `#` il documento, `##` il blocco e il verdetto, `###` la domanda e il campo del verdetto. Uniforme di proposito: `Motivo` è un campo lungo, e un'etichetta in grassetto in linea si spezzerebbe su un contenuto a più righe.
- **La data nel nome del file è ISO**, `pino-2026-08-10-prequalifica.md`, e dentro il documento la stessa data si legge `10/08/2026`. Le due forme divergono apposta: una cartella di esportazioni si ordina per nome, e l'ISO è l'unica forma che rende quell'ordine cronologico. Il nome è tutto minuscolo e composto da `[a-z0-9-]`, che è anche la difesa contro un nome di cliente che finisce in un'intestazione HTTP.
- **Cosa non entra nel file:** il «cosa serve capire», le opzioni e il tipo di risposta (dicono com'era fatto il controllo, non cosa è stato detto), lo stato di compilazione e l'avanzamento. Una **domanda saltata** compare col suo titolo e sotto niente; un **campo del verdetto vuoto** si omette, titolo compreso, tranne l'`Esito`, che c'è sempre.

## 5. Requisiti non funzionali

- Nessun dato perso: qualsiasi interruzione durante la compilazione conserva l'ultimo salvataggio automatico.
- Row Level Security attiva su tutte le tabelle dal primo giorno, anche con un solo utente (D9).
- Database in regione europea.
- Funziona su portatile e su tablet; la compilazione dev'essere usabile a schermo piccolo, perché le call si fanno anche fuori casa.
- Nessuna chiamata a servizi esterni per funzionare.

## 6. Criteri di accettazione

1. Creo un cliente con il solo nome e lo salvo senza errori.
2. Aggiungo due persone allo stesso cliente e assegno a una di esse più ruoli di decisione.
3. Apro una scheda, scrivo in tre campi, chiudo il browser di colpo, riapro: ritrovo i tre campi compilati.
4. Modifico il testo di una domanda, apro una scheda vecchia: la domanda vecchia si legge come era prima.
5. Disattivo una domanda: sparisce dalle schede nuove, resta in quelle vecchie.
6. Compilo una scheda senza verdetto e la lascio in bozza; ci torno il giorno dopo e la chiudo.
7. Esporto una scheda: il markdown contiene tutte le risposte con la domanda a cui rispondono.
8. Filtro l'elenco per stato e trovo solo i clienti in quello stato.
9. Nella scheda cliente vedo, per ogni scheda, quante domande sono state risposte sul totale di quella scheda.
10. Aggiungo una domanda nuova al questionario: l'avanzamento delle schede già chiuse non cambia.
11. Assegno due tag a un cliente e filtro l'elenco per uno di essi.

## 7. Da fare prima di costruire

- Rivedere il contenuto effettivo delle domande. Non è un requisito del software, perché le domande sono dati modificabili dall'interfaccia, ma il questionario iniziale va caricato con domande approvate.
