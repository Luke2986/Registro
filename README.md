# Prequalifica

Strumento personale per valutare e seguire i clienti: raccoglie in un unico posto le domande, le risposte, i documenti e i verdetti di ogni azienda con cui si entra in contatto.

Non è un prodotto in vendita e non è un CRM. È il posto dove vive un metodo di lavoro.

**Stato:** in costruzione, prima versione.
**Utenti:** uno.
**In rete:** https://registro-luke2986s-projects.vercel.app

---

## Cosa fa

Copre due momenti distinti.

**Prequalifica.** Una scheda di domande compilata durante una call di mezz'ora, che si chiude con un verdetto scritto e il motivo. Serve a decidere se lavorare con qualcuno.

**Audit** (seconda versione). Otto blocchi di raccolta strutturata sul cliente diventato tale, con la provenienza di ogni informazione.

Il verdetto è sempre un giudizio della persona, mai un calcolo del sistema. Nessuno stato blocca nessuna azione.

## Cosa non fa

Nessuna intelligenza artificiale, nessuna trascrizione, nessun suggerimento automatico. Nessuna integrazione in entrata: il software è la fonte di verità e le eventuali integrazioni sono solo in uscita. Niente fatturazione, calendario, notifiche, portale cliente.

---

## Documentazione

I documenti sono divisi per scopo. Chi lavora al progetto, persona o agente, legge solo quello che serve al compito corrente.

| File | Cosa contiene | Quando leggerlo |
|---|---|---|
| `00-contesto-e-decisioni.md` | Ogni decisione presa, datata, con quello che è stato scartato e perché | Sempre, prima di rimettere in discussione qualcosa |
| `masterplan.md` | Dove va il progetto, in quali fasi, cosa resta fuori | All'inizio, e a ogni cambio di direzione |
| `prd-v1.md` | Requisiti della prima versione, schermate, comportamenti, criteri di accettazione | Mentre si costruisce una funzionalità |
| `database.md` | Schema completo, vincoli, indici, protezione degli accessi | Prima di ogni modifica ai dati |
| `design-system.md` | Colore, tipografia, componenti, stati, token | Prima di scrivere interfaccia |
| `kb-0.md` | Regole permanenti, valide per ogni progetto | Sempre, è vincolante |
| `guide-for-lovable.md` / `guide-for-replit.md` / `guide-for-vercel-supabase.md` | Manuali della piattaforma, alternativi fra loro | Si carica solo quello della piattaforma scelta |
| `01-fase-1-prequalifica.md` | Le domande della scheda e il formato del verdetto | Quando si caricano i contenuti iniziali del questionario |

Le domande della prequalifica sono **dati**, non codice: si modificano dall'interfaccia e non richiedono un rilascio.

---

## Struttura del repository

```
/
├── CLAUDE.md              regole sempre attive per l'agente, corte, rimandano a docs/
├── AGENTS.md              stesse regole per agenti diversi da Claude Code
├── README.md              questo file
├── docs/                  tutta la documentazione elencata sopra
├── supabase/
│   ├── migrations/        file numerati, l'unico modo di cambiare lo schema
│   └── seed.sql           questionario iniziale
└── src/
    ├── app/               schermate: (app) è l'area con accesso, accedi e auth stanno fuori
    ├── components/        pezzi di interfaccia riusabili, uno per file
    ├── lib/               client Supabase, tipi generati dallo schema, utilità
    └── proxy.ts           rinnova la sessione e tiene fuori chi non ha fatto l'accesso
```

---

## Stack

| Pezzo | Scelta |
|---|---|
| Applicazione | Next.js con App Router, TypeScript |
| Database, accesso | Supabase (PostgreSQL, regione `eu-west-1`) |
| Hosting e ambienti | Vercel |
| Codice e storia | GitHub, privato |
| Sviluppo | Claude Code |

Scelta presa il 2 agosto 2026 fra le tre alternative descritte in `database.md`. Vale la variante A della sezione 6: la protezione delle righe sta nel database, come policy di sicurezza a livello di riga, non nel codice applicativo. I manuali delle piattaforme scartate restano in `docs/` come storia.

L'accesso è un collegamento inviato per email, senza password. Dopo il primo accesso conviene disattivare le nuove iscrizioni dal pannello Supabase: l'utente è uno solo.

---

## Avvio in locale

```bash
npm install
npm run dev
```

Le variabili d'ambiente vivono in `.env.local`, mai nel repository. I nomi richiesti stanno in `.env.example`, senza i valori: si copiano dal progetto Supabase, sezione API.

Le migrazioni sono i file numerati in `supabase/migrations/`, applicati in ordine al progetto Supabase e sempre prima del codice che li usa. Il questionario iniziale sta in `supabase/seed.sql` e si esegue una volta sola, dopo il primo accesso: ogni riga deve portare il proprio proprietario.

---

## Come si lavora

1. Un ramo per ogni pezzo di lavoro.
2. Le modifiche allo schema passano sempre da un file di migrazione versionato, mai dalla dashboard.
3. Si verifica sull'anteprima, non solo in locale.
4. Le migrazioni si applicano prima del codice che le usa.
5. Si unisce al ramo principale, che rilascia.

Prima di dire che una cosa è finita: funziona, è stata provata a mano sul percorso reale, non ha rotto nient'altro.

---

## Convenzioni

Sono in `kb-0.md` e sono vincolanti. In sintesi: TypeScript senza `any`, nomi in inglese nel codice e in italiano nell'interfaccia, un componente per file, nessun segreto nel codice, sicurezza a livello di riga attiva dal primo giorno, nessun colore esadecimale fuori dai token.

---

## Privato

Il repository contiene informazioni su aziende e persone reali. Resta privato, i dati restano in Unione Europea, e nessun dato di cliente compare nei log, negli esempi o nei file di prova.
