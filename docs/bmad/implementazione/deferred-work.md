# Lavoro rimandato

Voci emerse durante le revisioni e rimandate di proposito, con il motivo. Si cancellano solo quando sono chiuse.

## Deferred from: code review of 1-1-creare-un-cliente-col-solo-nome (2 agosto 2026)

- **`.btn` è alto 40px, sotto il bersaglio da 44px** — `src/app/globals.css:299-311`. Governa tutti e quattro i pulsanti nuovi di questa story (`Salva`, `Annulla`, `Nuovo cliente`, `Crea il primo cliente`). Rimandato: la classe è preesistente e fuori dal perimetro, e cambiarla tocca ogni schermata. Appartiene alla Story 5.2, passata di accessibilità verificata.
- **Tre elenchi di campi da tenere allineati a mano** — `src/app/(app)/clienti/[id]/page.tsx:8-30, 100-111`. La stringa `COLUMNS`, il `Pick<ClientRow, ...>` e l'array `fields` ripetono gli stessi nomi in tre punti; togliere un campo da `fields` non produce nessun errore di compilazione, il campo sparisce dalla scheda in silenzio (`kb-0.md` §9). Rimandato: la Story 1.2 riscrive lo stesso file per la modifica in linea, ed è lì che la fonte unica va costruita.
- **L'hover illumina tutta la riga ma solo il nome è cliccabile** — `src/app/(app)/clienti/page.tsx:77-79` con `src/app/globals.css:250-252`. L'affordance promette una riga cliccabile, il comportamento dà una cella. Rimandato: la scelta fra estendere il collegamento alla riga o restringere l'hover dipende da come le Story 1.2 e 1.7 trattano la navigazione di riga.
- **Nel ramo d'errore dell'elenco non resta nessun modo di creare un cliente** — `src/app/(app)/clienti/page.tsx:30-39, 43-47`. Il pulsante primario compare solo nel ramo pieno e in quello vuoto; se la query fallisce resta solo Riprova. Rimandato: in quello stato Riprova è l'azione giusta, e aggiungere un secondo pulsante primario violerebbe UX-DR10.
- **Nessun `metadata` sulle rotte nuove** — `src/app/(app)/clienti/[id]/page.tsx`, `src/app/(app)/clienti/nuovo/page.tsx`. Il titolo del browser resta "Registro" per ogni cliente: con due schede aperte diventa un indovinello. Rimandato: fuori dal perimetro della story, appartiene a una passata di rifinitura.
