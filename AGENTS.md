# Istruzioni per l'agente

Progetto: strumento personale per valutare e seguire i clienti. Raccolta e archiviazione di domande, risposte, documenti e verdetti. Un solo utente. Nessuna intelligenza artificiale dentro il prodotto.

Rispondi in italiano.

## Prima di scrivere codice

- **Pianifica.** Qualsiasi lavoro che tocchi più di un file o il database comincia con un piano in prosa: cosa cambia, dove, in che ordine, cosa si rompe. Il piano si approva, poi si scrive.
- **Chiedi invece di inventare.** Se manca un'informazione per decidere, fai una domanda e fermati. Una domanda in più costa meno di un'ipotesi sbagliata scoperta tre giorni dopo.
- **Una cosa alla volta.** Un compito, un commit. Nessuna funzionalità non richiesta, nessun refactor non concordato, nessun file fuori dal perimetro.
- **Cerca prima di scrivere.** Se una funzione somiglia a qualcosa che potrebbe già esistere, verificalo.

## Regole non negoziabili

- Nessun segreto nel codice. Solo variabili d'ambiente.
- Nessun valore esadecimale nel codice. Solo i token del design system.
- `any` è vietato in TypeScript.
- Ogni modifica allo schema è un file di migrazione versionato. Mai dalla dashboard.
- Ogni migrazione dichiara in testa come si annulla, o perché non si può. Formato in `docs/database.md` §7; la sua assenza è un difetto come lo sarebbe una policy mancante.
- Sicurezza a livello di riga attiva su tutte le tabelle dal primo giorno, anche con un solo utente. Dove la piattaforma non la supporta, ogni query filtra per proprietario e il filtro si verifica sul server.
- Ogni schermata che carica dati ha quattro stati progettati: pieno, vuoto, in caricamento, in errore.
- Nessuno stato del cliente blocca nessuna azione. Il software registra e mostra, non decide e non vieta.
- Il verdetto è sempre della persona: nessun punteggio, nessuna squalifica automatica, nessun suggerimento di esito.
- Il lavoro dell'utente non si perde mai: ogni campo lungo salva da solo e dice quando ha salvato.

## Documentazione

Leggi solo quello che serve al compito corrente.

- Decisioni prese, con date e motivi: @docs/00-contesto-e-decisioni.md
- Direzione e fasi: @docs/masterplan.md
- Requisiti della prima versione: @docs/prd-v1.md
- Schema dati e policy: @docs/database.md
- Colore, tipografia, componenti: @docs/design-system.md
- Regole permanenti, valide sempre: @docs/kb-0.md
- Manuale della piattaforma in uso: @docs/guide-for-vercel-supabase.md

Prima di rimettere in discussione una scelta, controlla se è già una decisione registrata e perché è stata presa.

## Vocabolario del dominio

- **Cliente**: l'azienda. Contenitore di tutto il resto.
- **Persona**: chi lavora nell'azienda, con un ruolo aziendale e uno o più ruoli rispetto alla decisione.
- **Questionario**: l'insieme delle domande, modificabile dall'interfaccia. Le domande sono dati, non codice.
- **Scheda**: una compilazione del questionario riferita a un cliente e a una data.
- **Verdetto**: l'esito che la persona scrive alla fine di una scheda.
- **Avanzamento**: domande risposte sul totale che quella scheda conteneva quando è stata aperta. Il totale non si aggiorna mai.

Nel codice i nomi sono in inglese, nell'interfaccia in italiano. Le etichette nominano le cose come le riconosce chi le usa: "chi decide", non "ruolo decisionale".

## Comandi

Piattaforma: Next.js con App Router e TypeScript, dati e accesso su Supabase, rilascio su Vercel.

```bash
# sviluppo:  npm run dev
# build:     npm run build
# tipi:      npm run typecheck
# migrazioni: file numerati in supabase/migrations, applicati al progetto Supabase
#             prima del codice che li usa. Mai dalla dashboard.
# test:      npm test
```

Il proxy si chiama `src/proxy.ts`: da Next 16 il vecchio `middleware.ts` è deprecato.

## Da non fare

- Non modificare lo schema dalla dashboard.
- Non disattivare la sicurezza a livello di riga per provare qualcosa.
- Non aggiungere dipendenze senza motivo dichiarato.
- Non commentare codice morto: cancellarlo, la storia sta in Git.
- Non aggiungere intelligenza artificiale, servizi esterni o integrazioni in entrata.
- Non far crescere questo file: quello che cresce va in `docs/` e si richiama con `@`.
