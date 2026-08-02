# Metodo di valutazione cliente, contesto e decisioni

**Owner:** Luca Versilia
**Aperto il:** 2 agosto 2026
**Ultimo aggiornamento:** 2 agosto 2026, D19

Questo file è la memoria del progetto. Va portato in ogni nuova chat o strumento per ricostruire il contesto senza ripartire da zero. Si aggiorna solo quando una decisione è confermata, non quando è ipotizzata.

---

## Cos'è

Un metodo interno, non un prodotto in vendita, per valutare e seguire ogni nuovo cliente. Serve a Luca sia da freelance sia quando lavora dentro una web agency. Tiene in un unico posto domande, risposte, documenti e verdetto, così che il contesto di un cliente sia recuperabile a distanza di mesi.

## Fonti da cui nasce

- Documento sull'audit per l'integrazione dell'IA aziendale (sintesi delle riflessioni di Giada Franceschini). Se ne prende la griglia di mappatura dei processi, non l'impostazione IA-centrica.
- Skill `marketing-strategy-framework` (STP, value proposition, posizionamento, pricing, canali, measurement).
- Skill `plg-gtm-expert` (status quo, ECP, funnel, metriche, pricing e WTP).
- Skill `operations-quality-specialist` per il ramo erogazione.

---

## Decisioni prese

### D1. Due fasi separate, con un evento in mezzo
*2 agosto 2026*

**Fase 1, prequalifica.** Serve a Luca. Mezz'ora, output un sì o un no scritto in mezza pagina. Criterio di ammissione di una domanda: se la risposta non può cambiare il verdetto, non entra in fase 1.

**Fase 2, audit.** Serve al cliente. Due o tre settimane, output il documento su cui si lavora dopo.

**Evento in mezzo:** Luca apre la fase 2 solo dopo una proposta accettata, anche solo un audit pagato a parte, perché la fase 2 è la parte costosa del servizio e se esce prima di un contratto è stata regalata. È una scelta sua di metodo, non un vincolo del software: vedi D14, il sistema non impedisce nulla.

### D2. Il criterio di divisione fra le due fasi
*2 agosto 2026*

Non è generico contro dettagliato. È decidere contro costruire. La divisione per grado di dettaglio produce una fase 1 piena di anagrafica inutile.

### D3. Stesso set di domande da PMI a enterprise, più un blocco decisionale
*2 agosto 2026*

Il merito delle domande non cambia con la dimensione. Cambia chi ha il problema, chi decide e chi paga: in PMI spesso sono la stessa persona, sopra una certa dimensione no. Sopra i 50 dipendenti o quando l'interlocutore non è il titolare, si attiva un blocco aggiuntivo su chi firma, chi può dire no e quanto dura il giro di approvazioni.

### D4. La domanda diagnostica che divide tutto il lavoro a valle
*2 agosto 2026*

Manca domanda o manca capacità di erogare. Se manca domanda, il lavoro va verso growth e posizionamento (`plg-gtm-expert`, `marketing-strategy-framework`). Se manca capacità di erogare, va verso processi e delega, e lì l'IA è una delle risposte possibili, mai la premessa. È il punto di differenziazione dell'offerta: quasi nessuno oggi dice a un'azienda che non le serve l'IA, le serve smettere di sbagliare il target.

### D5. Struttura della fase 2, otto blocchi
*2 agosto 2026*

1. Obiettivi in numeri, vincoli reali, orizzonte temporale.
2. Mappatura dei processi che generano ricavi con la griglia a mattoncini: input, passaggi, output, conoscenza necessaria, sistemi su cui gira.
3. Diagnosi del punto di rottura, domanda o erogazione.
4. Stato della conoscenza: cosa è scritto, cosa vive nelle persone, chi sa, chi sa giudicare se un lavoro è fatto bene, chi progetta.
5. Dati e strumenti: cosa esiste, chi ci accede, cosa è misurato oggi.
6. Baseline numerica di partenza: ore per attività, tassi di conversione, costi. Senza questo blocco a fine progetto non si dimostra nulla.
7. Rischi e uso non governato di strumenti già in circolo in azienda.
8. Ipotesi di intervento, ognuna con il proprio criterio di misura.

**Regola di compilazione:** ogni riga porta la provenienza, chi l'ha detta o da quale documento arriva. A tre settimane di distanza la differenza fra dichiarato e dedotto è tutto quando si difende una raccomandazione.

### D6. Contenitore ~~Notion~~
*2 agosto 2026, superata lo stesso giorno da D8*

Ipotesi iniziale, mia e non richiesta: database Notion invece di un software. Superata: Luca vuole un software proprio.

---

### D7. Il verdetto della fase 1 è un giudizio, non un calcolo
*2 agosto 2026*

Non esistono regole automatiche di squalifica. Le domande servono a informare la decisione di Luca, che resta sua e discrezionale, call per call. Cade di conseguenza tutto l'impianto delle soglie: le cinque condizioni di uscita, la soglia aggiuntiva di merito e il limite delle sei settimane, che erano aggiunte non concordate.

Applicato alla scheda: rimosse le righe di allarme sotto ogni domanda e l'intera sezione delle soglie. Sotto ogni domanda resta solo cosa serve capire. Il verdetto è un campo vuoto che compila Luca.

### D8. La destinazione è un software personale
*2 agosto 2026*

Il fine ultimo non è una scheda né un artifact: è un software che Luca costruisce e usa per sé. La tecnologia non è ancora decisa, le candidate sono Replit, Claude Code, Lovable, con database su Supabase o su quello incluso nella piattaforma scelta.

Copre entrambe le fasi: prequalifica con archivio delle schede, e audit con i documenti dei clienti che diventano tali. Un eventuale modulo intermedio serve solo a provare le domande sul campo prima di fissare lo schema dati.

### D9. Un utente ora, più utenti dopo, integrazioni dopo
*2 agosto 2026*

Oggi l'unico utente è Luca. Il software deve però poter accogliere collaboratori in futuro, per esempio dentro una web agency, e doversi collegare a un CRM o a Notion.

Conseguenza sulle scelte di oggi, non sul lavoro di oggi: non si costruisce nulla di multi-utente adesso, ma si evitano le due scelte che lo renderebbero impossibile dopo. Ogni riga di dato porta il riferimento al proprietario dal primo giorno, e la Row Level Security è attiva da subito anche con un solo utente. Con queste due cose, aggiungere persone dopo è una migrazione da un pomeriggio; senza, è una riscrittura.

Stessa logica per le integrazioni: non si costruiscono adesso, ma tutto ciò che entra nel sistema deve poterne uscire in forma strutturata senza scrivere codice nuovo.

### D10. Il software è la fonte di verità
*2 agosto 2026*

Il dato nasce e vive qui. Le integrazioni sono in uscita: il software spinge fuori copie verso Notion, un CRM o altro, e non riceve il proprio modello dati da nessuno.

Conseguenze operative:
- Il modello dati lo detta il metodo, non il formato di un CRM di terzi.
- Ogni entità esportabile ha un identificatore stabile che non cambia mai, così una copia esterna resta riconciliabile.
- Ogni record porta la data dell'ultima modifica, altrimenti una sincronizzazione in uscita non sa cosa mandare.
- Nessuna funzione del software dipende da un servizio esterno per funzionare: se l'integrazione è spenta, il lavoro continua.

### D11. Nessuna intelligenza artificiale dentro il prodotto
*2 agosto 2026*

Il software è raccolta e archiviazione. Nessun modello linguistico, nessuna trascrizione automatica, nessuna generazione di bozze: il testo lo scrive Luca.

Conseguenze:
- Niente chiavi API di terzi da gestire, niente costo variabile, niente dati dei clienti inviati fuori.
- L'architettura si riduce a scrittura, lettura ed esportazione di dati propri.
- Se un giorno servirà, si aggiunge sopra un sistema che già funziona, il che è l'ordine giusto.

### D12. Il software conserva anche i file
*2 agosto 2026*

Oltre ai testi scritti da Luca, il sistema conserva i documenti che arrivano dai clienti: PDF, fogli di calcolo, presentazioni. I file appartengono al cliente e restano collegati a lui, non alla singola call.

Conseguenze: serve uno storage con accesso ristretto e collegamenti temporanei, un limite di dimensione dichiarato, e l'esportazione di un cliente deve includere anche i suoi file.

### D13. Scheda cliente: azienda contenitore, persone sotto, campi liberi
*2 agosto 2026*

La scheda cliente raccoglie i dati anagrafici dell'azienda e tutto ciò che si scopre nel tempo. Compilazione manuale, sempre: nessun recupero automatico da fonti esterne, coerente con D10 e D11.

**Obbligatorietà:** nessun campo obbligatorio, tranne il nome con cui il cliente è identificato. Senza quello l'elenco si riempie di righe anonime e di duplicati della stessa azienda scritti in tre modi.

**Persone:** l'azienda è il contenitore, le persone sono voci sotto, anche quando ce n'è una sola. Per ciascuna: nome, cognome, ruolo aziendale, email, telefono, note. In più il ruolo rispetto alla decisione, che può essere multiplo perché in una piccola impresa la stessa persona è tutte le cose insieme: chi ha il problema, chi decide, chi può bloccare, referente operativo, semplice interlocutore. Una persona può essere segnata come contatto principale.

**Numeri dichiarati (fatturato, dipendenti, obiettivi):** vedi D15, sono campi normali della scheda cliente.

**Rappresentazione:** un valore non rilevato non si mostra come zero.

### D14. Il software non blocca niente
*2 agosto 2026*

Gli stati del cliente sono etichette descrittive, non permessi: potenziale, valutato, attivo, chiuso, perso. Servono a filtrare l'elenco e a sapere a colpo d'occhio dove si è arrivati.

Nessuno stato impedisce un'azione. La fase 2 si può aprire su un cliente in qualsiasi stato, una scheda si può compilare in qualsiasi momento, un verdetto si può cambiare. Il sistema registra e mostra, non decide e non vieta: la decisione è sempre e solo di Luca (coerente con D7).

Applicato anche a ritroso: la regola di D1 sull'apertura della fase 2 resta come metodo di lavoro di Luca, non come vincolo tecnico.

### D15. Fatturato, dipendenti e obiettivi sono campi normali della scheda cliente
*2 agosto 2026*

Scartata l'entità separata "dato dichiarato" con valore, data e origine: troppa struttura per il beneficio. Restano tre campi semplici nella scheda cliente, sovrascrivibili, come tutto il resto dell'anagrafica.

La scheda cliente deve dare un quadro completo a colpo d'occhio: è quello il criterio che governa cosa ci sta dentro.

Semantica da tenere ferma per evitare contraddizioni: il valore nella scheda cliente è *l'ultimo che Luca sa*, quello dentro una scheda di prequalifica è *quello che il cliente ha dichiarato in quella call*. Non sono la stessa cosa e non devono sovrascriversi a vicenda: la scheda di prequalifica non si aggiorna mai da sola.

### D16. Avanzamento visibile nella scheda cliente
*2 agosto 2026*

Nella scheda cliente, ogni scheda di prequalifica mostra a colpo d'occhio quante domande sono state risposte sul totale. Rappresentazione minima: un contatore e una barra sottile, nessuna percentuale, nessun colore d'allarme.

Il denominatore è il numero di domande che quella scheda conteneva al momento della compilazione, non il questionario corrente: aggiungere una domanda oggi non deve far tornare incomplete le schede chiuse ieri.

### D17. Tag sul cliente
*2 agosto 2026*

Oltre al settore, il cliente ha tag liberi e multipli per marcature trasversali. Filtrabili dall'elenco. Il campo suggerisce i tag già in uso e li normalizza in minuscolo, per non ritrovarsi la stessa etichetta scritta in tre modi.

Con questa decisione il PRD della prima versione è chiuso.

### D18. Design system approvato
*2 agosto 2026*

Direzione: base neutra calda, card bianche, angoli generosi, colore usato per riconoscere le sezioni.

Regola di governo che tiene insieme il sistema: i colori di sezione vivono solo nella navigazione, quelli semantici solo nel contenuto, e nessuna sezione usa verde, ambra o rosso perché quei tre indicano gli esiti. Il pulsante primario è nero, così il colore resta disponibile per significare qualcosa.

Elemento firma: l'indicatore di salvataggio, in monospaziato, sempre visibile durante la compilazione.

Dettagli e token in `design-system.md`.

### D19. Questionario della fase 1, prima versione
*2 agosto 2026*

Venti domande in sette blocchi, più tre condizionali sopra le 50 persone o quando l'interlocutore non è il titolare. Contenuto in `01-fase-1-prequalifica.md`, pronto da caricare come questionario iniziale.

Sotto ogni domanda c'è solo cosa serve capire, mai un segnale d'allarme o un suggerimento di esito.

Chiuso il debito aperto dall'inizio: le domande non sono più una prima stesura non rivista, ma la versione da usare. Restano modificabili dall'interfaccia, quindi cambiarle non richiede un rilascio.

---

## Scartato, e perché

| Ipotesi | Motivo dello scarto |
|---|---|
| Prodotto vendibile a sé stante | Non è l'obiettivo dichiarato. E costruirlo prima di aver capito cosa comprano i clienti è il *hidden gem* del framework di pricing: si generalizza da n=1. |
| Deliverable unico che unisce audit IA e consulenza growth | Due buyer, due urgenze, due budget. Un solo documento non vince nessuna delle due gare. |
| Audit da 27 blocchi (6 fasi marketing + 6 del documento + 15 domande di discovery) | Nessuna PMI italiana compra un audit del genere da un consulente singolo. Deve stare in una pagina e in una call da venti minuti. |
| Riportare il documento di Giada così com'è | È una sintesi fatta da un modello di idee altrui, con rimandi a materiali che non abbiamo. Il dato del 70% legato al change management e i tre ruoli Oracle/Evaluator/Architect vanno verificati o riformulati prima di finire in un documento a firma Luca. |

---

## Questioni aperte

- Fase 2: come si prezza, in quanti giorni, con quale effort. Se il metodo dev'essere ripetibile serve scope fisso, tempo fisso, prezzo fisso.
- Se costruire la skill che conduce l'intervista, e quando.
- Terminologia dei tre ruoli in fase 2, blocco 4: da verificare la fonte o da riscrivere con parole proprie.

---

## File collegati

- `01-fase-1-prequalifica.md`, domande esatte e soglie di squalifica.
