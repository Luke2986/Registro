# Guida operativa: Next.js + Supabase + Vercel, con Claude Code

Manuale di piattaforma. Da caricare come contesto **solo se il progetto viene costruito su questo stack**. Alternativo a `guide-for-lovable.md` e `guide-for-replit.md`.

Il lettore previsto è Claude Code. Serve a dargli il perimetro: cosa esiste, dove sta, cosa non deve fare.

Non contiene regole generali di sviluppo: quelle stanno in `kb-0.md`.

Verificato ad agosto 2026.

---

## 1. Perimetro dello stack

- **Frontend e backend applicativo:** Next.js con App Router, TypeScript.
- **Dati, autenticazione, storage, funzioni:** Supabase (Postgres gestito, Auth, Storage, Edge Functions, Realtime).
- **Hosting e ambienti:** Vercel.
- **Codice e storia:** GitHub, che è anche il meccanismo di rilascio, perché Vercel costruisce da lì.
- **Sviluppo:** Claude Code in locale.

Differenza rispetto alle altre due opzioni: qui non esiste una piattaforma che genera l'app al posto tuo. Ogni pezzo è esplicito, la configurazione è tua, e questo è il motivo per sceglierlo quando il software deve durare.

---

## 2. Ambienti

Vercel ne ha tre e vanno tenuti distinti in testa:

| Ambiente | Quando si usa |
|---|---|
| Production | Il branch di produzione |
| Preview | Tutti gli altri branch, incluse le pull request e branch persistenti come `staging` |
| Development | Solo lo sviluppo locale via `vercel dev` |

Un branch `staging` resta sotto Preview finché non gli assegni esplicitamente un ambiente dedicato, cosa possibile sui piani superiori. Sul piano base, staging si ottiene assegnando variabili Preview a uno specifico branch.

Ogni deploy di anteprima ha un URL diverso, e questo crea il problema classico dell'autenticazione: i redirect di Supabase non corrispondono. Si risolve aggiungendo un pattern con wildcard fra i Redirect URL di Supabase, oppure tenendo un progetto Supabase separato per lo staging.

---

## 3. Variabili d'ambiente

Con l'integrazione Supabase installata dal marketplace di Vercel, le variabili vengono iniettate e mantenute aggiornate sul progetto Vercel. Fra quelle gestite: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, più le varianti Postgres (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL` e le credenziali separate).

Regole non negoziabili:

- Tutto ciò che ha prefisso `NEXT_PUBLIC_` finisce nel bundle del browser. Lì può stare solo l'URL del progetto e la chiave pubblicabile.
- `SUPABASE_SECRET_KEY` e le stringhe di connessione Postgres non compaiono mai in codice che gira sul client, né in un componente che potrebbe essere reso client.
- In locale le variabili stanno in `.env.local`, che non va mai committato.
- Le variabili con prefisso pubblico devono esistere **prima** della build, perché vengono incorporate a quel momento.

Se una chiave segreta è finita in una variabile pubblica anche solo per un commit, va ruotata dal pannello Supabase.

---

## 4. Regole sul database

- **Row Level Security attiva su ogni tabella con dati.** Nessuna eccezione temporanea: una tabella senza RLS esposta tramite l'API è pubblica.
- **Ogni modifica di schema passa da un file di migrazione versionato**, mai da modifiche manuali nell'editor SQL della dashboard. La dashboard serve per guardare, non per cambiare.
- Le policy si scrivono insieme alla tabella, nello stesso commit.
- I dati di prova stanno in un file di seed, separato dalle migrazioni.

---

## 5. Istruzioni permanenti a Claude Code

Claude Code carica le istruzioni all'inizio di ogni sessione da una gerarchia di file, dai più generali ai più specifici. Quelli che riguardano questo progetto:

- **`./CLAUDE.md` alla radice del repository**: le istruzioni del progetto, condivise tramite il controllo di versione. Il file alla radice sopravvive alla compattazione, perché viene riletto da disco e reinserito in sessione.
- **`~/.claude/CLAUDE.md`**: le tue preferenze personali, valide su tutti i progetti, non condivise.
- Esiste anche una memoria automatica, in cui Claude annota da sé comandi di build, note di architettura e correzioni ricevute.

**Come si scrive un `CLAUDE.md` che funziona:** ci vanno solo i fatti che servono in *ogni* sessione, comandi di build, convenzioni, struttura delle cartelle, divieti espliciti. Se una regola è una procedura in più passi o riguarda solo una parte del codice, non va lì: diventa una skill o una regola limitata a un percorso. Il file può importare altri file con `@percorso/file.md`, il che permette di tenerlo corto e rimandare alla documentazione di dettaglio.

Criterio pratico per aggiornarlo: se correggi Claude due volte sulla stessa cosa, quella cosa va scritta nel file. Non aggiungere regole a caldo dopo una sessione andata male, perché è così che il file si riempie di eccezioni.

Struttura consigliata del repository:

```
/
├── CLAUDE.md                 ← regole sempre attive, corte
├── AGENTS.md                 ← se serve compatibilità con altri agenti
├── docs/
│   ├── masterplan.md
│   ├── prd.md
│   ├── database.md           ← schema, tabelle, policy RLS
│   ├── design-system.md
│   └── deployment.md
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── src/
```

`CLAUDE.md` rimanda a `docs/` invece di contenerne il testo: così ogni sessione carica solo quello che serve.

---

## 6. Ciclo di lavoro

1. Branch dal principale per ogni pezzo di lavoro.
2. Claude Code lavora sul branch, con migrazioni versionate se tocca il database.
3. Push su GitHub: Vercel costruisce automaticamente un deploy di anteprima.
4. Verifica sull'anteprima, non in locale, perché è lì che emergono i problemi di variabili e di redirect.
5. Merge sul principale, che rilascia in produzione.

Le migrazioni vanno applicate al progetto Supabase prima che il codice che le usa arrivi in produzione, altrimenti il deploy funziona e l'applicazione no.

---

## 7. Da non fare

- Non modificare lo schema dalla dashboard Supabase.
- Non disattivare RLS "per provare".
- Non usare la chiave segreta in codice raggiungibile dal browser.
- Non committare `.env.local`.
- Non far crescere `CLAUDE.md` oltre un paio di schermate: quello che cresce va in `docs/` e si richiama con `@`.
- Non rilasciare in produzione senza aver visto funzionare l'anteprima.

---

## 8. Checklist di avvio

- [ ] Repository GitHub privato creato
- [ ] Progetto Supabase creato, regione scelta consapevolmente (dati di clienti italiani, quindi Unione Europea)
- [ ] Progetto Vercel collegato al repository
- [ ] Integrazione Supabase installata su Vercel e variabili verificate nei tre ambienti
- [ ] `.env.local` in locale e in `.gitignore`
- [ ] Redirect URL di Supabase configurati anche per le anteprime
- [ ] Prima migrazione versionata, con RLS attiva
- [ ] `CLAUDE.md` alla radice e `docs/` popolata

---

## Fonti

- Integrazione Supabase su Vercel e variabili gestite: https://vercel.com/marketplace/supabase
- Template ufficiale Next.js con Supabase: https://vercel.com/templates/next.js/supabase
- Ambienti Vercel e variabili, note di Supabase: https://supabase.com/docs/guides/troubleshooting/vercel-integration-environment-variables-not-syncing-for-persistent-git-branches-b9191e
- Memoria e `CLAUDE.md`: https://code.claude.com/docs/en/memory
- Documentazione Claude Code: https://docs.claude.com/en/docs/claude-code/overview
