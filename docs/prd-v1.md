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
| `contenuto` | testo | la risposta |
| `aggiornato_il` | data e ora | |

**Scelta tecnica, e conta più di quanto sembri:** salvare insieme alla risposta una copia del testo della domanda evita tutta la macchina del versionamento relazionale. Il giorno che riscrivi o cancelli una domanda, le schede vecchie restano leggibili così com'erano, senza migrazioni e senza risposte orfane. Costa una colonna di testo in più per riga.

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

### Compilazione della scheda

La schermata su cui si lavora durante la call, quindi progettata per quello: blocchi in sequenza verticale, campo di risposta ampio, testo di aiuto visibile sotto la domanda, nessun passaggio obbligato fra i blocchi.

- Salvataggio automatico tre secondi dopo l'ultima digitazione, più un comando esplicito di salvataggio.
- Indicazione visibile dell'ultimo salvataggio, con l'ora.
- Chiudendo e riaprendo si torna esattamente dov'era.
- Le domande si possono saltare, tutte.
- Il verdetto sta in fondo, si può lasciare vuoto e compilare dopo, e si può cambiare in qualsiasi momento.

### Gestione del questionario

Elenco dei blocchi e delle domande, con riordino, modifica del testo, attivazione e disattivazione. Nessuna cancellazione fisica: si disattiva.

### Esportazione

Da una scheda, un file markdown con intestazione (cliente, data, interlocutore), le risposte raggruppate per blocco con il testo della domanda, e il verdetto per esteso. Nome file prevedibile: `cliente-data-prequalifica.md`.

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
