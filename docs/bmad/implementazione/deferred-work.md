# Lavoro rimandato

Voci emerse durante le revisioni e rimandate di proposito, con il motivo. Si cancellano solo quando sono chiuse.

## Deferred from: code review of 1-1-creare-un-cliente-col-solo-nome (2 agosto 2026)

- **`.btn` è alto 40px, sotto il bersaglio da 44px** — `src/app/globals.css:299-311`. Governa tutti e quattro i pulsanti nuovi di questa story (`Salva`, `Annulla`, `Nuovo cliente`, `Crea il primo cliente`). Rimandato: la classe è preesistente e fuori dal perimetro, e cambiarla tocca ogni schermata. Appartiene alla Story 5.2, passata di accessibilità verificata.
- **L'hover illumina tutta la riga ma solo il nome è cliccabile** — `src/app/(app)/clienti/page.tsx:77-79` con `src/app/globals.css:250-252`. L'affordance promette una riga cliccabile, il comportamento dà una cella. Rimandato: la scelta fra estendere il collegamento alla riga o restringere l'hover dipende da come le Story 1.2 e 1.7 trattano la navigazione di riga.
- **Nel ramo d'errore dell'elenco non resta nessun modo di creare un cliente** — `src/app/(app)/clienti/page.tsx:30-39, 43-47`. Il pulsante primario compare solo nel ramo pieno e in quello vuoto; se la query fallisce resta solo Riprova. Rimandato: in quello stato Riprova è l'azione giusta, e aggiungere un secondo pulsante primario violerebbe UX-DR10.
- **Nessun `metadata` sulle rotte nuove** — `src/app/(app)/clienti/[id]/page.tsx`, `src/app/(app)/clienti/nuovo/page.tsx`. Il titolo del browser resta "Registro" per ogni cliente: con due schede aperte diventa un indovinello. Rimandato: fuori dal perimetro della story, appartiene a una passata di rifinitura.

## Deferred from: creazione della story 1-2-vedere-e-modificare-la-scheda-del-cliente (2 agosto 2026)

- **L'alone del focus usa la tinta sbagliata su tutte le schermate** — `src/app/globals.css` (`.input:focus`). `.input:focus` illumina in `--sec-prequalifica`, mentre UX-DR14 chiede la tinta della sezione corrente, che nell'area clienti è `--sec-clienti`. Emerso perché la Story 1.2 riempie una schermata di clienti di campi e rende la discordanza visibile ovunque. Rimandato per decisione di Luca del 2 agosto 2026: la correzione tocca ogni campo del progetto, `/accedi` compreso, e appartiene alla Story 5.2, passata di accessibilità verificata.

## Deferred from: sviluppo della story 1-2-vedere-e-modificare-la-scheda-del-cliente (3 agosto 2026)

- **La regola dell'uuid è scritta in due file** — `src/app/(app)/clienti/[id]/page.tsx` e `src/app/(app)/clienti/actions.ts`. Stessa espressione regolare, due scopi diversi: nella scheda distingue "una scheda che non c'è" da un guasto, nelle azioni rifiuta una richiesta che non doveva esistere. Rimandato: metterla in comune voleva dire un file nuovo, fuori dai tre che la story dichiara. Da chiudere quando una terza rotta ne avrà bisogno, o alla prima passata di riordino.

## Deferred from: code review of 1-2-vedere-e-modificare-la-scheda-del-cliente (3 agosto 2026)

- **Fra l'ultima battuta e i tre secondi non c'è protezione** — `src/app/(app)/clienti/[id]/client-field-form.tsx:124`. Chiudere la scheda o ricaricare mentre la textarea ha ancora il fuoco perde quello che è stato scritto: allo smontaggio c'è `clearTimeout` e nient'altro, nessun `beforeunload` e nessuna scrittura di chiusura. Rimandato per decisione di Luca del 3 agosto 2026: la finestra è di tre secondi e solo col fuoco ancora dentro, e il salvataggio all'uscita dal campo copre già ogni navigazione dentro l'applicazione. Da riprendere se la Story 3.3 rende la finestra più frequente, o se un `beforeunload` diventa accettabile.
- **I due campi lunghi che salvano insieme possono far tornare indietro `baseline`** — `src/app/(app)/clienti/[id]/client-field-form.tsx:38` con `src/app/(app)/clienti/actions.ts:169`. `business_goals` e `notes` hanno due `useActionState` distinti, quindi React non li mette in fila. Ognuna delle due azioni chiama `revalidatePath` sulla scheda e produce un payload reso al proprio momento: se quello partito prima arriva dopo, il campo che ha già scritto riceve un `stored` precedente alla propria scrittura, `dirty` torna vero su un campo salvato e il timer rispara lo stesso testo. Rimandato: dipende dall'ordine di consegna dei payload RSC, non è stato riprodotto, e si autocorregge al giro successivo. Da riprendere se la Story 3.3, che avrà molti più campi che salvano da soli sulla stessa schermata, lo rende frequente.
