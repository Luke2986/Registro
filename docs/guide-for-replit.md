# Guida operativa: Replit + GitHub + Claude Code

Manuale di piattaforma. Da caricare come contesto **solo se il progetto viene costruito su Replit**. Alternativo a `guide-for-lovable.md` e `guide-for-vercel-supabase.md`.

Non contiene regole generali di sviluppo: quelle stanno in `kb-0.md`. Qui c'è solo ciò che è specifico di Replit.

Verificato ad agosto 2026. Controlla `docs.replit.com` prima di seguire alla lettera i passaggi di interfaccia.

---

## 1. Modello mentale

Replit mette editor, agente, database, segreti e hosting nella stessa scheda del browser. La differenza sostanziale rispetto a Lovable: qui hai una shell vera, Git integrato e accesso diretto ai file. È più vicino a un ambiente di sviluppo che a un generatore di app, e questo cambia il modo di lavorarci.

Conseguenza per il tuo ciclo: Replit è già un posto dove il codice si tocca a mano, quindi la divisione del lavoro con Claude Code è meno netta e va decisa da te invece che imposta dalla piattaforma.

---

## 2. Git e GitHub

Git è integrato in ogni progetto, tramite il pannello Git nella barra laterale e tramite la shell. Da lì si committa, si creano branch, si legge la storia e si spinge su un remoto (GitHub, GitLab, Bitbucket) senza installare niente.

**Importare da GitHub** si può, in due modi:
- rapido, per repository pubblici: apri `https://replit.com/github.com/<owner>/<repo>`
- guidato, anche per repository privati: `replit.com/import`, scegli GitHub, connetti l'account, scegli il repo

**Cosa non arriva con l'import:** i valori dei segreti e delle variabili d'ambiente, e i servizi specifici di altre piattaforme che qui non girano. Vanno rimessi a mano nel gestore dei segreti.

**Le pull request non si gestiscono dentro Replit:** si lavora su branch qui, si aprono e si revisionano su GitHub.

**Autenticazione:** i token di accesso personali vanno nei Secrets, mai in chiaro nell'URL del remoto o in un file.

Per operazioni Git complicate (rebase, cherry-pick, storie ingarbugliate) usa la shell con git da riga di comando, o falle fare a Claude Code in locale: il pannello grafico copre i casi semplici.

---

## 3. Istruzioni all'agente

Tre livelli, tutti da conoscere:

- **`replit.md` nella radice del progetto.** È il file che personalizza il comportamento dell'agente. Viene creato in automatico al primo uso, precompilato, e l'agente lo aggiorna man mano che impara cose sul progetto. Puoi modificarlo quando vuoi; se è diventato illeggibile, si cancella e alla conversazione successiva l'agente ne genera uno nuovo.
- **Custom Instructions**, a livello di workspace: sempre attive, iniettate in ogni progetto e in ogni sessione.
- **Skill**, cartelle con dentro un `SKILL.md`: istruzioni riutilizzabili caricate quando servono e richiamabili con `/nome`. Sono file di testo normali, versionabili insieme al codice e portabili.

**Attenzione a un effetto collaterale:** l'agente scrive dentro `replit.md` di sua iniziativa, quindi il file può cambiare senza che tu lo abbia deciso. Se una regola per te è vincolante, tienila anche in un `AGENTS.md` che modifichi solo tu, e nel `replit.md` scrivi che quel file va rispettato.

---

## 4. Database e segreti

**Attenzione, i database interni sono due e non sono intercambiabili:**

- **PostgreSQL**, servito da Neon, relazionale, con SQL runner e strumenti visuali. È quello che serve a qualsiasi applicazione con più entità collegate.
- **Replit DB**, un archivio chiave-valore, limitato a circa 50 MiB e 5.000 chiavi. Va bene per preferenze e contatori, non per i dati di un'applicazione.

Ogni app nasce con un database, ma **Postgres va chiesto esplicitamente**: nel primo prompt all'agente si dichiara di volere un database PostgreSQL e quali dati deve contenere. Senza dirlo, si rischia di ritrovarsi sul chiave-valore e di scoprirlo tardi.

L'agente scrive ed esegue le migrazioni quando i prompt successivi aggiungono campi o tabelle. Esiste anche un ripristino a un checkpoint precedente, che include il database se lo si seleziona fra le opzioni aggiuntive.

**Differenza che conta rispetto a Supabase:** qui non c'è un livello di autenticazione integrato che alimenta la Row Level Security. La RLS esiste come funzione di Postgres, ma senza il pezzo di Supabase che la collega all'utente autenticato la protezione dei dati va scritta nel codice: nessuna query senza filtro sul proprietario, e il filtro verificato sul server. Dove `kb-0.md` dice "RLS attiva su ogni tabella", su questa piattaforma si traduce così.

Puoi comunque collegare un Postgres esterno (Supabase, Neon) se vuoi tenere i dati fuori dalla piattaforma. Per un software che contiene dati di clienti è la scelta più prudente: il database resta tuo anche se un giorno cambi ambiente, e con Supabase recuperi la RLS integrata.

I segreti si mettono nel gestore dedicato e si leggono come variabili d'ambiente. Quando l'agente incontra un'integrazione che richiede una credenziale, si ferma e la chiede: rispondi lì, non incollarla nel codice.

---

## 5. Il ciclo di lavoro con Claude Code

Replit non ha una sincronizzazione automatica bidirezionale come Lovable: c'è Git, e Git funziona come funziona ovunque. Questo è un vantaggio, perché il comportamento è prevedibile.

Ciclo consigliato:

1. **Replit** per l'impalcatura iniziale, il database, il deploy, e per lavorare da browser quando non sei alla scrivania.
2. **Commit e push su GitHub** a ogni blocco di lavoro finito, non a fine giornata.
3. **Claude Code in locale**, sul repo clonato, per il lavoro che richiede precisione: logica, refactor, test, revisione.
4. **Push su GitHub**, poi **pull dentro Replit** prima di ricominciare da lì.

La regola è la stessa di sempre: si scrive da un lato solo per volta, e si fa pull prima di aprire una sessione nuova.

---

## 6. Costi

Il modello è a consumo e con il tempo pesa: le sessioni lunghe dell'agente e le app sempre attive consumano crediti in modo non lineare. Due abitudini che aiutano: far fare all'agente i lavori di impalcatura e a Claude Code quelli lunghi di rifinitura, e spegnere ciò che non serve tenere acceso.

---

## 7. Da non fare

- Non lasciare i token GitHub fuori dai Secrets.
- Non affidarti a `replit.md` come unica fonte delle regole, visto che l'agente lo riscrive.
- Non dare per scontato che i segreti siano arrivati con l'import: non arrivano.
- Non tenere i dati dei clienti nel database della piattaforma se prevedi di poter cambiare ambiente.
- Non aprire una sessione dell'agente su codice che Claude Code sta modificando in locale.

---

## 8. Checklist di avvio

- [ ] Progetto creato e collegato a un repository GitHub privato
- [ ] Database PostgreSQL richiesto esplicitamente all'agente, non Replit DB
- [ ] Deciso dove vive il database (Postgres interno o esterno)
- [ ] Segreti nel gestore, nessuna chiave nel codice
- [ ] `AGENTS.md` alla radice con le regole che non devono cambiare
- [ ] `replit.md` letto almeno una volta e corretto dove dice cose sbagliate sul progetto
- [ ] Repository clonato in locale con Claude Code funzionante
- [ ] Comando di avvio configurato nei Workflow

---

## Fonti

- Import da GitHub: https://docs.replit.com/getting-started/quickstarts/import-from-github
- File di istruzioni dell'agente: https://docs.replit.com/replitai/replit-dot-md
- Custom Instructions e Skill: https://replit.com/blog/custom-skills
- Database SQL: https://docs.replit.com/cloud-services/storage-and-databases/sql-database
- Indice della documentazione: https://docs.replit.com/llms.txt
