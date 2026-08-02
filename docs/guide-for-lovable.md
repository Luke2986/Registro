# Guida operativa: Lovable + GitHub + Claude Code

Manuale di piattaforma. Da caricare come contesto **solo se il progetto viene costruito su Lovable**. Alternativo a `guide-for-replit.md` e `guide-for-vercel-supabase.md`.

Non contiene regole generali di sviluppo: quelle stanno in `kb-0.md`. Qui c'è solo ciò che è specifico di Lovable e che, se ignorato, rompe il progetto.

Verificato ad agosto 2026. Le piattaforme cambiano in fretta: prima di seguire alla lettera i passaggi di interfaccia, controlla `docs.lovable.dev`.

---

## 1. Modello mentale

Lovable ospita il codice dentro di sé e lo genera dalla chat. Il codice è tuo e può uscire, ma la piattaforma resta il posto dove l'agente lavora. Tre cose vanno capite prima di iniziare: dove vive il backend, come esce il codice, come rientra.

### Modalità di lavoro

Due modalità, con nomi che sono cambiati nel tempo (Build/Plan nell'interfaccia recente, Agent/Chat nella documentazione più vecchia):

- **Plan (o Chat)**: ragiona, ispeziona file e log, fa domande, produce un piano. Non tocca il codice. Un piano approvato viene salvato in `.lovable/plan.md` e la piattaforma passa in Build.
- **Build (o Agent)**: implementa. Cerca nei file, legge on demand, ispeziona log ed errori, e in Agent mode il costo è a consumo invece che a credito fisso per messaggio.

Regola operativa: ogni funzionalità non banale nasce in Plan, si approva il piano, poi si costruisce.

---

## 2. Backend: Cloud o Supabase, e la scelta non è reversibile a costo zero

Un progetto Lovable può avere due backend diversi, entrambi Postgres:

| | Lovable Cloud | Supabase tuo |
|---|---|---|
| Chi lo possiede | L'istanza è gestita da Lovable | Il progetto è nel tuo account Supabase |
| Dashboard Supabase | Il progetto non compare | Compare, con SQL editor, log, monitoring |
| Service role key e connection string diretta | Non accessibili | Accessibili |
| Setup | Zero configurazione | Qualche passaggio in più |

Come capire quale hai: clicca l'icona Cloud nella barra in alto. Se vedi schermate per gestire tabelle e utenti dentro Lovable, sei su Cloud. Se vedi il logo Supabase e i link alla dashboard, sei sul tuo.

**Cosa serve sapere prima di iniziare:** i progetti nuovi tendono a partire su Cloud in automatico. Se vuoi il tuo Supabase, va detto all'agente *prima* che cominci a costruire, chiedendo di non collegare Lovable Cloud e di lavorare su stato locale; poi si collega Supabase dalla scheda Cloud.

Da luglio 2026 esistono nella scheda Cloud, sotto Advanced settings, i comandi Export, Pause e Remove per uscire da Cloud, quindi la scelta iniziale non è più definitiva, ma la migrazione resta lavoro vero, con tabelle, utenti, file di storage, edge function e cron da riportare. Verifica lo stato attuale di questi comandi prima di contarci.

**Raccomandazione:** se il progetto contiene dati di clienti reali, Supabase tuo. La dashboard, l'accesso SQL diretto e la possibilità di spostare il frontend altrove valgono i venti minuti di setup in più.

---

## 3. GitHub: come esce il codice e come rientra

La sincronizzazione è bidirezionale, ma ha vincoli precisi.

**Setup, nell'ordine:**
1. Settings → Connectors → GitHub, autorizza via OAuth.
2. Installa la GitHub App di Lovable sull'account o sull'organizzazione.
3. Collega il progetto: Lovable crea un repository nuovo e ci spinge tutto il codice come primo commit.

**I vincoli che rompono tutto:**

- **La sync funziona solo sul branch di default (`main`).** Quello che Claude Code fa su un altro branch non arriva in Lovable finché non è su main.
- **Non si importa un repository esistente in Lovable.** Il flusso è solo in uscita: Lovable crea il repo. Se hai già del codice altrove, non lo porti dentro.
- **Non rinominare, spostare o cancellare il repository collegato.** La sync si rompe in modo permanente e l'unico rimedio è scollegare e ricollegare, il che crea un repo nuovo.
- Lo switch fra branch dentro Lovable va abilitato in Settings → Account → Labs.
- Le pull request si aprono e si gestiscono su GitHub, non dentro Lovable.

**Nota di realtà:** la sync bidirezionale è un servizio, e come tutti i servizi ogni tanto si guasta (a marzo 2026 c'è stato un incidente in cui i commit spinti su GitHub non comparivano nell'editor). Se le modifiche di Claude Code non appaiono in Lovable, prima di riscriverle controlla lo stato della piattaforma su `status.lovable.dev`.

---

## 4. Il ciclo di lavoro con Claude Code

Il principio: **una modifica alla volta, da un lato solo.** Il modo più veloce per creare conflitti è lavorare in parallelo dentro Lovable e in locale.

Ciclo consigliato:

1. **Lovable** per l'impalcatura, le schermate, le prime versioni di una funzionalità. È lì che è veloce.
2. **Push automatico su GitHub** a ogni modifica.
3. **Claude Code in locale** sul repo clonato, per la logica complessa, i refactor, i test, la pulizia. È lì che è preciso.
4. **Merge su `main`**, che riporta tutto dentro Lovable.
5. Prima di riprendere in Lovable, verifica che il commit sia arrivato.

Regola pratica: quando apri Claude Code, chiudi la chat di Lovable. Quando torni in Lovable, fai prima un pull e assicurati che main sia allineato.

---

## 5. Istruzioni permanenti all'agente

Lovable legge tre livelli di contesto, in questo ordine di specificità:

- **Workspace knowledge**: regole valide per tutti i progetti del workspace (convenzioni, librerie preferite, naming).
- **Project knowledge**: contesto del singolo progetto (scopo dell'applicazione, schema del database, decisioni di architettura, terminologia del dominio). In caso di conflitto con il workspace, vince questo.
- **File di istruzioni nel repo**: un `AGENTS.md` alla radice viene sempre letto, indipendentemente dalla lunghezza della sessione. Anche `CLAUDE.md` può guidare l'agente di Lovable.

**Conseguenza pratica per questo progetto:** metti le regole in un `AGENTS.md` alla radice del repository invece che solo nel campo Knowledge. Così lo stesso file governa sia l'agente di Lovable sia Claude Code, e vive sotto controllo di versione.

Esistono anche le Skill, file markdown caricati su richiesta e richiamabili con `/nome-skill`: utili per procedure ripetute che non serve tenere sempre in contesto.

---

## 6. Sicurezza

- Con Supabase collegato, alla pubblicazione è disponibile una scansione di sicurezza: usala prima di ogni rilascio che tocchi i dati.
- La Row Level Security va attiva su ogni tabella che contiene dati di clienti, senza eccezioni "poi la metto".
- Le chiavi segrete non stanno mai nel codice del frontend. Se una chiave finisce in una variabile esposta al browser, va considerata compromessa e ruotata.

---

## 7. Da non fare

- Non iniziare a costruire senza aver deciso il backend: cambiarlo dopo costa.
- Non lavorare su branch diversi da `main` aspettandoti di vedere il risultato in Lovable.
- Non rinominare il repository collegato.
- Non chiedere in Build una funzionalità che non hai prima definito in Plan, se tocca il database.
- Non tenere aperta la chat di Lovable mentre Claude Code sta scrivendo sullo stesso codice.

---

## 8. Checklist di avvio

- [ ] Deciso il backend (Cloud o Supabase tuo) e dichiarato all'agente prima del primo prompt
- [ ] GitHub collegato e repository creato, con nome definitivo
- [ ] Repository clonato in locale e Claude Code funzionante
- [ ] `AGENTS.md` alla radice con le regole del progetto
- [ ] Project knowledge compilato con scopo, schema dati e terminologia
- [ ] RLS attiva sulle tabelle con dati
- [ ] Segreti nel gestore della piattaforma, non nel codice

---

## Fonti

- Documentazione Lovable su GitHub: https://docs.lovable.dev/integrations/github
- Documentazione Lovable su Cloud: https://docs.lovable.dev/integrations/cloud
- Documentazione Lovable su Knowledge: https://docs.lovable.dev/features/knowledge
- Supabase, come capire quale backend usa un progetto Lovable: https://supabase.com/docs/guides/troubleshooting/identify-lovable-cloud-or-supabase-backend
- Stato della piattaforma: https://status.lovable.dev
