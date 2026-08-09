# kb-0: regole permanenti

Regole valide per **ogni** progetto, indipendenti dalla piattaforma e dal prodotto. Si caricano insieme al manuale di piattaforma (`guide-for-*.md`) e alla documentazione del progetto (`docs/`).

Chi legge questo file è un agente che scrive codice. Le regole sono vincolanti: se una richiesta le contraddice, si segnala il conflitto invece di eseguirla in silenzio.

Chi mantiene il file è una persona sola, che costruisce software per sé e per il proprio lavoro, senza un team che rimedi agli errori. Ogni regola qui dentro esiste per questo motivo.

---

## 1. Come si comporta l'agente

**Pianifica prima di scrivere.** Qualsiasi lavoro che tocchi più di un file, o che tocchi il database, comincia con un piano in prosa: cosa cambia, dove, in che ordine, cosa si rompe se va male. Il piano si approva, poi si scrive.

**Chiedi invece di inventare.** Se manca un'informazione per decidere, fai una domanda e fermati. Non riempire il vuoto con un'ipotesi plausibile: un'ipotesi sbagliata scoperta a tre giorni di distanza costa più di una domanda.

**Una cosa alla volta.** Un compito, un commit, una verifica. Non aggiungere funzionalità non richieste, non "già che c'ero" su file fuori dal perimetro, non riscrivere codice funzionante perché lo scriveresti diversamente.

**Non toccare quello che non è nel perimetro.** Se per fare il lavoro serve modificare qualcosa fuori dal perimetro concordato, dillo prima.

**Dichiara l'incertezza.** Se una libreria, un'API o un comportamento della piattaforma non ti è noto con certezza, dillo e verifica. Non c'è nessun costo nel dire "questa parte va controllata"; c'è un costo alto nel far sembrare certa una cosa inventata.

**Niente scuse e niente cerimonie.** Se hai sbagliato, correggi e vai avanti.

---

## 2. Convenzioni di codice

- TypeScript ovunque. `any` è vietato: se il tipo non si sa, si scrive il tipo giusto o si usa `unknown` con un controllo esplicito.
- Nomi in inglese nel codice, nomi in italiano nell'interfaccia. Nessuna commistione dentro lo stesso identificatore.
- File e cartelle in `kebab-case`, componenti in `PascalCase`, funzioni e variabili in `camelCase`, costanti in `SCREAMING_SNAKE_CASE`.
- Un componente per file. Se un file supera le 200 righe, quasi sempre contiene due cose.
- Le funzioni fanno una cosa sola e hanno un nome che la descrive. Se il nome contiene "and" o "manage", la funzione è due funzioni.
- Commenti solo dove il codice non può spiegarsi: il perché di una scelta strana, un vincolo esterno, un aggiramento di un bug noto. Nessun commento che ripete quello che il codice già dice.
- Nessuna dipendenza nuova senza motivo dichiarato. Prima di aggiungere una libreria: si può fare in venti righe? Se sì, venti righe.
- Codice morto si cancella, non si commenta. La storia sta in Git.

---

## 3. Sicurezza

Queste regole non hanno eccezioni temporanee.

- **Nessun segreto nel codice.** Chiavi, token, stringhe di connessione, password: solo variabili d'ambiente e gestori di segreti. Una chiave finita in un commit è compromessa anche se il commit viene rimosso: si ruota.
- **Il client non è attendibile.** Ogni autorizzazione si verifica sul server. Nascondere un pulsante non è un controllo di accesso.
- **Ogni input si valida sul server**, con uno schema, anche se il form già lo valida. La validazione lato client serve all'utente, non alla sicurezza.
- **Row Level Security attiva su ogni tabella con dati**, dal primo giorno. Le policy si scrivono nello stesso commit della tabella.
- **Query parametrizzate sempre.** Nessuna concatenazione di stringhe per costruire SQL.
- **Errori muti verso l'esterno.** Il messaggio all'utente dice cosa fare, non cosa è successo nello stack. I dettagli vanno nei log.
- **Niente dati personali nei log.** Né email, né contenuti scritti dai clienti, né identificativi diretti.

---

## 4. Dati personali

Il software tratta informazioni su aziende e persone reali, quindi:

- Si raccoglie solo ciò che serve a far funzionare la cosa. Un campo "utile un giorno" non si aggiunge.
- Ogni tabella con dati personali ha `created_at`, `updated_at` e un modo di cancellare davvero, non solo di nascondere.
- L'esportazione dei dati di un cliente dev'essere possibile senza scrivere codice nuovo.
- La regione del database sta nell'Unione Europea.
- Le registrazioni audio, le trascrizioni e i documenti dei clienti sono la categoria più sensibile del sistema: accesso ristretto, nessuna condivisione con servizi terzi non dichiarati.

---

## 5. Database

- **Ogni modifica di schema è un file di migrazione versionato**, dentro il repository. Nessuna modifica manuale dalla dashboard: la dashboard serve a guardare.
- Ogni migrazione è reversibile o dichiara esplicitamente perché non lo è.
- Chiavi primarie `uuid`, non interi progressivi.
- Timestamp con fuso orario, sempre.
- Vincoli nel database, non solo nel codice: chiavi esterne, `not null`, `unique`, `check`. Il database è l'ultima difesa contro i dati incoerenti.
- I dati di prova stanno in un file di seed separato e non finiscono mai in produzione.

---

## 6. Interfaccia e design

**Prima il sistema, poi le schermate.** Colori, tipografia, spaziature e raggi esistono come token prima che venga scritto il primo componente. Nessun valore esadecimale sparso nel codice: solo variabili.

**Quattro stati per ogni schermata.** Ogni vista che carica dati ne ha quattro, tutti progettati: pieno, vuoto, in caricamento, in errore. Lo stato vuoto è un invito a fare qualcosa, non una scritta grigia che dice "nessun risultato". Lo stato d'errore dice cosa è andato storto e cosa si può fare.

**Le parole sono materiale di progetto.** Etichette in italiano, frase minuscola, voce attiva. Un pulsante dice cosa succede quando lo premi: "Salva bozza", non "Invia". L'azione mantiene lo stesso nome per tutto il percorso: se il pulsante dice "Archivia", la conferma dice "Archiviato". Si nominano le cose come le riconosce chi le usa, non come sono fatte dentro.

**Il lavoro dell'utente non si perde mai.** Qualsiasi form lungo salva da solo e dice quando ha salvato. Nessuna azione distruttiva senza conferma; nessuna conferma per azioni reversibili.

**Un pavimento di qualità, senza annunciarlo:** funziona su schermo piccolo, il focus da tastiera si vede, il contrasto è sufficiente, il movimento rispetta le preferenze di sistema.

**Restare specifici.** L'interfaccia di un prodotto costruito per sé può permettersi di essere densa e diretta invece che rassicurante e generica. Meglio una tabella leggibile che una griglia di schede con icone.

---

## 7. Verifica

Il codice generato si considera non funzionante finché non lo si è visto funzionare.

- Ogni funzionalità si prova a mano sul percorso reale, non solo nel caso ideale: campo vuoto, testo lunghissimo, doppio clic, connessione che cade, ricarica a metà.
- I test automatici si scrivono per la logica che, se si rompe, produce dati sbagliati: calcoli, trasformazioni, permessi. Non per i componenti di presentazione.
- Prima di dire che una cosa è finita: funziona, è stata provata, non ha rotto nient'altro.
- Se un errore viene "risolto" senza aver capito perché si presentava, non è risolto.

---

## 8. Documentazione e tracciamento

- `docs/` contiene la documentazione di progetto: visione, requisiti, schema dati, design system, rilascio. Il file di istruzioni dell'agente rimanda lì invece di contenerne il testo.
- Ogni decisione strutturale si scrive dove è stata presa, con la data e il motivo. Una decisione senza motivo scritto verrà rimessa in discussione fra tre mesi.
- Le attività si tracciano con caselle in markdown, non con sistemi elaborati.
- Quando una decisione ne supera una precedente, la precedente si marca come superata e resta visibile. Non si cancella la storia.
- I messaggi di commit dicono cosa cambia e perché, in italiano o in inglese ma coerentemente.

---

## 9. Anti-pattern del lavoro con agenti

Da riconoscere e fermare, perché sono il modo tipico in cui un progetto costruito così degenera:

- **Accumulo.** Ogni richiesta aggiunge codice e nessuna ne toglie. Ogni tanto si passa a togliere.
- **Duplicazione silenziosa.** L'agente riscrive una funzione che esiste già perché non l'ha cercata. Prima di scrivere, si cerca.
- **Correzione a cascata.** Un errore si "risolve" aggiungendo un caso particolare, che ne genera un altro. Se servono tre casi particolari, il progetto era sbagliato.
- **Deriva del piano.** Si parte per fare una cosa e se ne fanno quattro. Il piano approvato è il perimetro.
- **Fiducia cieca.** Il codice che gestisce soldi, permessi o dati dei clienti si legge riga per riga prima di accettarlo, sempre.
- **Riscrittura dell'infrastruttura.** Nessun cambio di libreria, framework o struttura delle cartelle senza una decisione esplicita e scritta.

---

## 10. Rilascio

- Le migrazioni si applicano prima del codice che le usa.
- Prima di ogni rilascio che tocchi i dati: esiste un modo di tornare indietro?
- Un rilascio venerdì sera è un rilascio lunedì mattina.
