# Masterplan

**Progetto:** software personale per la valutazione e il seguito dei clienti
**Owner:** Luca Versilia
**Versione del documento:** 1, 2 agosto 2026

Questo documento dice dove va il progetto. Deriva dalle decisioni registrate in `00-contesto-e-decisioni.md`: dove una sezione applica una decisione, la decisione è citata. Dove invece il contenuto è una proposta non ancora confermata, è marcato **[da confermare]**.

---

## 1. Cos'è

Uno strumento interno che tiene in un unico posto le domande, le risposte, i documenti e i verdetti relativi a ogni cliente potenziale o attivo. Copre due momenti distinti del lavoro: la valutazione iniziale, che serve a decidere se lavorare con qualcuno, e l'audit, che serve a costruire il lavoro vero.

Non è un prodotto in vendita. Non è un CRM commerciale. È il posto dove vive il metodo di Luca, utilizzabile sia da freelance sia dentro una struttura terza.

## 2. Chi lo usa

Oggi un utente solo. Domani, se il contesto lo richiede, collaboratori dentro una web agency (D9).

Questo non comporta costruire funzioni di collaborazione adesso: comporta solo che ogni riga di dato porti il riferimento al proprietario e che la sicurezza a livello di riga sia attiva fin dal primo giorno.

## 3. Cosa fa

**Fase 1, prequalifica.** Una scheda di domande fisse compilate durante o dopo una call di mezz'ora, che si chiude con un verdetto scritto e il motivo. Serve a decidere. Il verdetto è un giudizio di Luca, non un calcolo del sistema (D7).

**Fase 2, audit.** Otto blocchi di raccolta strutturata sul cliente che è diventato tale: obiettivi, processi, punto di rottura, stato della conoscenza, dati e strumenti, baseline, rischi, ipotesi di intervento (D5). Luca la apre dopo una proposta accettata; il software non lo impone (D14).

**Archivio.** Ogni cliente ha una scheda, una storia, i suoi documenti, e resta consultabile a mesi di distanza.

**Uscita.** Tutto ciò che entra può uscire in forma strutturata, senza scrivere codice nuovo (D10).

## 4. Cosa non fa

- Non contiene intelligenza artificiale: nessuna trascrizione, nessuna generazione di testo, nessun suggerimento (D11).
- Non esprime giudizi, non assegna punteggi, non squalifica nessuno automaticamente (D7), e non blocca nessuna azione in base allo stato (D14).
- Non gestisce preventivi, fatture, contratti, attività o calendari.
- Non riceve dati da sistemi esterni: le integrazioni sono solo in uscita (D10).
- Non dipende da nessun servizio esterno per funzionare.

## 5. Principi

1. **Il dato nasce qui.** Il modello lo detta il metodo, non il formato di un CRM di terzi (D10).
2. **Il lavoro non si perde.** Salvataggio automatico su ogni campo lungo, con indicazione visibile dell'ultimo salvataggio.
3. **Le domande sono dati, non codice.** Il questionario si modifica senza toccare il software, e ogni scheda registra con quale versione del questionario è stata compilata, altrimenti le risposte vecchie diventano illeggibili quando le domande cambiano.
4. **Ogni riga sa da dove viene.** Nella fase 2, ogni informazione porta la sua provenienza: chi l'ha detta o da quale documento arriva (D5).
5. **Niente si cancella davvero.** Le decisioni superate restano visibili come superate.

## 6. Entità principali

Ad alto livello, senza ancora scendere nello schema:

- **Cliente**: l'azienda. È il contenitore di tutto il resto.
- **Persona**: chi parla, con ruolo e relazione con la decisione.
- **Questionario**: l'insieme delle domande, versionato ed editabile.
- **Scheda di prequalifica**: una compilazione del questionario riferita a un cliente e a una data, con il verdetto.
- **Audit**: la raccolta in otto blocchi, aperta solo per i clienti attivi.
- **Voce di audit**: la singola informazione, con la sua provenienza.
- **Documento**: file caricato, collegato al cliente (D12).
- **Nota**: testo libero datato, agganciato a un cliente.

## 7. Percorso di rilascio **[da confermare]**

**Prima versione, l'unica che conta subito.** Clienti, questionario editabile, scheda di prequalifica con salvataggio automatico, verdetto, elenco filtrabile, esportazione in markdown di una scheda. Basta questo per usarlo alla prossima call vera.

**Seconda versione.** Fase 2: gli otto blocchi, la provenienza su ogni voce, il caricamento dei documenti, l'esportazione completa di un cliente.

**Terza versione.** Uscita verso Notion o altro, ricerca sul contenuto, versioni del questionario confrontabili.

**Poi, solo se serve davvero.** Collaboratori, permessi, ruoli.

Criterio per passare da una versione all'altra: la precedente è stata usata su clienti reali, non provata una volta.

## 8. Come si misura che funziona **[da confermare]**

- Una scheda di prequalifica si compila durante la call, non dopo.
- A tre mesi di distanza, ritrovare cosa aveva detto un cliente richiede meno di un minuto.
- Nessuna call finisce senza verdetto scritto.
- Nessun documento di cliente sparso fuori dal sistema.

## 9. Rischi

- **Lo strumento si compila per i primi tre clienti e poi si abbandona.** È il modo tipico in cui muoiono gli strumenti personali. Contromisura: la prima versione deve essere più veloce degli appunti sparsi, non più completa.
- **Il questionario cresce.** Ogni domanda aggiunta rende la call più lunga e la compilazione meno probabile. Contromisura: il criterio di ammissione già fissato, se la risposta non cambia il verdetto la domanda non entra (D2).
- **La fase 2 viene aperta prima del contratto.** È lavoro regalato. Contromisura: è una disciplina di Luca, non un blocco del software, che non impedisce nulla (D14).
- **Le domande restano quelle scritte da un altro.** Le domande attuali provengono dalle fonti e da una prima stesura non ancora rivista da Luca; vanno rese sue prima che finiscano nel database.

## 10. Fuori perimetro, per ora

Fatturazione, gestione del tempo, calendario, firma dei documenti, portale per il cliente, notifiche, applicazione mobile nativa.
