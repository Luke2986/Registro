# Design system

**Riferimenti:** `prd-v1.md`, `kb-0.md` sezione 6
**Versione del documento:** 1, 2 agosto 2026

Direzione richiesta: pulito, moderno, caldo, con il colore usato per riconoscere le sezioni. Non monocromatico.

---

## 1. Direzione visiva

Superficie di fondo neutra e calda, contenuti su card bianche che vi galleggiano sopra, angoli generosi, ombre appena percettibili, molto respiro fra i blocchi. La densità informativa sta nella tipografia e nell'allineamento, non nelle cornici: nessun bordo dove basta uno stacco di colore.

Il calore viene dalla base, non dagli accenti. I grigi hanno una componente calda invece di tendere all'azzurro, e su quella base i colori di sezione, che sono freddi e saturi, risaltano senza scaldare l'insieme. È il motivo per cui questa combinazione non legge come il solito beige con accento terracotta.

Una cosa sola, in tutta l'interfaccia, ha il permesso di essere sempre visibile e mai silenziosa: **l'indicatore di salvataggio**. È l'elemento firma del prodotto, perché incarna la sua unica promessa non negoziabile, il lavoro non si perde.

Modalità chiara per la prima versione. I token sono già strutturati per accoglierne una scura, che non si costruisce ora.

---

## 2. Colore

### Base

| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#F5F2EC` | Sfondo dell'applicazione |
| `--surface` | `#FFFFFF` | Card, pannelli, campi |
| `--surface-sunken` | `#EAE5DC` | Righe alternate, stati vuoti, campi disabilitati |
| `--ink` | `#141210` | Testo principale |
| `--ink-muted` | `#58524B` | Testo secondario, etichette |
| `--ink-faint` | `#8B8379` | Segnaposto, metadati |
| `--line` | `#E1DACE` | Bordi e separatori |
| `--line-strong` | `#D3CCC4` | Bordi dei campi al passaggio del mouse |

Il nero non è nero: `#141210` ha una punta di caldo che lo tiene coerente con la base. Usarlo anche per gli elementi scuri pieni (suggerimenti, pillola attiva).

**I sette valori della base e tutti gli accenti sono cambiati il 9 agosto 2026, con la revisione «viva» (D26).** Il fondo si è scaldato di un passo e le superfici si separano di più; i due inchiostri intermedi si sono approfonditi, perché era lì che la gerarchia si appiattiva — `--ink-muted` su `--surface-sunken` passa da 4,9:1 a 6,1:1. La direzione della §1 non cambia: la base resta greige e calda, e l'ombra non si alza (§4), perché la card si stacca dallo stacco fra le superfici.

### Colori di sezione

Ogni area del software ha il suo colore. Serve a orientarsi, quindi resta costante in ogni punto in cui quella sezione compare.

| Sezione | Token | Valore | Tinta di fondo |
|---|---|---|---|
| Clienti | `--sec-clienti` | `#3A4FDE` | `#E8EAFD` |
| Prequalifica | `--sec-prequalifica` | `#0A7E90` | `#DFF1F3` |
| Questionario | `--sec-questionario` | `#7440DA` | `#EFE7FC` |
| Audit (seconda versione) | `--sec-audit` | `#C13A6E` | `#FCE6EF` |
| Documenti (seconda versione) | `--sec-documenti` | `#3B6A9B` | `#E6EDF4` |

### Colori semantici

Riservati agli esiti e agli stati. Non compaiono mai nella navigazione.

| Significato | Token | Valore | Tinta di fondo |
|---|---|---|---|
| Positivo, verdetto sì | `--ok` | `#0E8A5B` | `#DFF3E9` |
| Attenzione, verdetto condizionato | `--warn` | `#A9690A` | `#FBEDD4` |
| Negativo, verdetto no | `--bad` | `#CE4632` | `#FBE6E1` |
| Neutro, non deciso | `--neutral` | `#8A857F` | `#EDE9E2` |

`--neutral` è l'unico valore che la revisione «viva» non ha toccato: il fondo delle cinque pillole di stato è cambiato con la base, il punto no.

~~**Voce aperta, e va guardata prima di chiudere la prima versione:** un colore pieno sulla propria tinta di fondo non arriva a 4,5:1, che è il minimo che la §8 chiede sul testo. Il verdetto `sì` è il caso peggiore, 3,8:1…~~

**Chiusa il 10 agosto 2026, con la Story 3.5**, che è la story che le pillole di verdetto le crea. Si è chiusa nella forma che la voce stessa prescriveva — scurendo **solo dentro le pillole**, non i token — e va detto *come*, altrimenti fra tre mesi la §2 e la §9 si rileggono come una contraddizione.

**Cosa è cambiato:** tre inchiostri nuovi, usati come testo della pillola di verdetto sulla propria tinta di fondo.

~~Usati **soltanto** lì.~~ **Il «soltanto» è caduto il 10 agosto 2026, con la code review della Story 3.6**, ed è una riga sola perché il campo si è allargato di un caso, non di una regola. `--bad-ink` è ora anche il colore di `.page-header__actions .field__error`, cioè della riga d'errore che vive nell'intestazione di pagina: è l'unico `.field__error` del software che non sta dentro una card, quindi l'unico su `--bg` invece che su `--surface`, e lì `--bad` misura **4,13:1** mentre `--bad-ink` misura **4,84:1**. Il nome del token continua a dire il suo ruolo — l'inchiostro che sta sopra un fondo chiaro dove il pieno non arriva — e quel ruolo non era mai stato «la pillola»: era la pillola l'unico posto che ne aveva bisogno finché non ne è nato un secondo.

| Pillola | Testo | Su tinta | Rapporto |
|---|---|---|---|
| sì | `--ok-ink` `#0D7C52` | `--ok-tint` | 4,51:1 |
| sì condizionato | `--warn-ink` `#985F09` | `--warn-tint` | 4,57:1 |
| no | `--bad-ink` `#BB402E` | `--bad-tint` | 4,51:1 |
| non deciso | `--ink-muted` (caso base) | `--neutral-tint` | 6,37:1 |

**Cosa non è cambiato, ed è il punto:** `--ok`, `--warn` e `--bad` restano quelli di D26, e i tre `-ink` non sono una loro versione «migliore»: il nome dice il ruolo, l'inchiostro che sta sopra un fondo chiaro dove il pieno non arriva. ~~E la pillola è l'unico posto che li usa.~~ *(Vero fino al 10 agosto 2026: da quel giorno `--bad-ink` è anche la riga d'errore dell'intestazione di pagina, v. qui sopra. `--ok-ink` e `--warn-ink` restano usati dalle sole pillole.)* La prima stesura di questo capoverso dava però una ragione sbagliata, e la correzione sta qui invece che cancellata: diceva che i tre pieni «continuano a servire come testo su bianco, dove il contrasto c'è già», mentre misurati su bianco `--bad` sta a 4,62:1 e passa, `--warn` a 4,46:1 e `--ok` a 4,37:1 non passano. Nei fatti `--ok` non è usato come testo da nessuna parte e `--warn` come testo compare solo in `.warn-box`, cioè sulla propria tinta. La ragione vera per non toccarli è un'altra: sono i valori di D26, e sostituirli sarebbe superare una decisione registrata dentro una story.

**Il neutro non riceve il quarto token, e non per simmetria mancata:** il caso base della pillola sta già a 6,37:1, mentre il neutro *pieno* starebbe a 3,02:1. Il quarto contrasto si chiude quindi non aggiungendo niente.

**Una correzione alla voce che si chiude:** diceva che «il verdetto `sì` è il caso peggiore, 3,8:1». Misurati tutti e quattro con la formula WCAG il 10 agosto 2026, il peggiore è **non deciso** a colore pieno, 3,02:1; il `sì` sta a 3,77:1, il condizionato a 3,86:1, il `no` a 3,85:1. Chi rileggesse la voce chiusa non deve cercare un quarto token che non esiste.

**Cosa questa chiusura non copre, e va detto perché il testo barrato parlava più largo delle pillole.** La voce enunciava un problema generale — «un colore pieno sulla propria tinta di fondo non arriva a 4,5:1» — e qui si chiude **per le sole pillole di verdetto**. Restano due componenti che sono esattamente quel caso: `.error-box`, `--bad` su `--bad-tint`, **3,85:1**, e `.warn-box`, `--warn` su `--warn-tint`, **3,86:1**. Non sono un difetto introdotto dalla Story 3.5 — esistono da prima e i loro token non cambiano — ma non erano stati guardati, e una voce che sembra chiusa e non lo è è peggio di una aperta. Il residuo sta in `docs/bmad/implementazione/deferred-work.md`, e il punto di ripresa è la **Story 5.2**, che è la passata di verifica del contrasto: i due `-ink` che servirebbero esistono già qui sopra.

**Un quinto inchiostro nato per un fondo scuro, `--ink-inverse: #FFFFFF`** (Story 5.1, 11 agosto 2026). Il suggerimento della navigazione richiusa (§5) è testo bianco su `--ink`, e la regola di §10 dice «nessun esadecimale fuori dai token»: il bianco vive quindi qui e non inline. Simmetrico ai tre `-ink` qui sopra — un inchiostro pensato per un fondo specifico, lì la tinta chiara, qui `--ink` — e non «uno dei semantici»: non ha una controparte pieno/tinta perché non è un colore di significato ma un inchiostro di leggibilità. Contrasto misurato con la formula WCAG l'11 agosto 2026: `#FFFFFF` su `--ink` (`#141210`) sta a **18,69:1**, sovrabbondante di proposito — il suggerimento è piccolo e va letto sicuro. Un solo uso oggi (`.sidebar--collapsed .nav__item::after`); se ne nascerà un secondo, il token è già lì.

### Regola di governo del colore

Questa è la parte che impedisce all'interfaccia di diventare un arcobaleno.

1. **I colori di sezione vivono nella navigazione**: icona attiva, indicatore laterale, intestazione della pagina. Non entrano nel contenuto.
2. **I colori semantici vivono nel contenuto**: verdetti, stati, avvisi. Non entrano nella navigazione.
3. **Le due tavolozze non si sovrappongono**: nessuna sezione usa verde, ambra o rosso, proprio perché quei tre significano qualcosa d'altro.
4. **Il colore non è mai l'unico portatore di significato**: ogni pillola colorata ha anche il suo testo.
5. **Una sola cosa colorata satura per schermata**, di norma quella che devi vedere per prima.

### Stati del cliente

I cinque stati sono descrittivi, non gerarchici: nessuno è "meglio" di un altro e il colore non deve suggerirlo.

| Stato | Rappresentazione |
|---|---|
| potenziale | punto `--ink-faint`, testo `--ink-muted` |
| valutato | punto `--sec-clienti`, testo `--ink` |
| attivo | punto `--ok`, testo `--ink`, peso medio |
| chiuso | punto `--ink-faint`, testo `--ink-muted` |
| perso | punto `--neutral`, testo `--ink-muted` |

---

## 3. Tipografia

Due famiglie, una per l'interfaccia e una per i dati.

| Ruolo | Famiglia | Motivo |
|---|---|---|
| Interfaccia, titoli, testo | **Geist** (ripiego: Inter, poi system-ui) | Grotesque contemporanea, disegnata per le interfacce dense, leggibile ai corpi piccoli |
| Numeri, date, ore, contatori | **Geist Mono** (ripiego: ui-monospace) | Le cifre si allineano in colonna e l'ora del salvataggio si legge senza saltare |

Il monospaziato sui dati non è una scelta estetica: in uno strumento che è fatto di date, contatori e orari, l'allineamento verticale è quello che rende una tabella leggibile a colpo d'occhio.

### Scala

| Token | Dimensione / interlinea | Uso |
|---|---|---|
| `--t-display` | 32 / 38, peso 600, spaziatura -0.02em | Nome del cliente nella sua scheda |
| `--t-title` | 22 / 28, peso 600 | Titoli di pagina e di sezione |
| `--t-heading` | 17 / 24, peso 600 | Titoli di blocco nel questionario |
| `--t-body` | 15 / 24, peso 400 | Testo, risposte, note |
| `--t-label` | 13 / 18, peso 500, spaziatura 0.01em | Etichette dei campi |
| `--t-meta` | 12 / 16, peso 400 | Metadati, testo di aiuto sotto le domande |
| `--t-data` | 13 / 18, mono | Date, contatori, ore |

Le domande del questionario si compongono a `--t-heading`, il testo di aiuto sotto a `--t-meta` in `--ink-muted`: la domanda si legge da lontano, l'aiuto solo se lo cerchi.

---

## 4. Spazio, forma, profondità

**Scala di spaziatura**, multipli di 4: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.

**Raggi**, generosi come nei riferimenti:

| Token | Valore | Uso |
|---|---|---|
| `--r-sm` | 8px | Pillole piccole, badge |
| `--r-md` | 12px | Campi, pulsanti |
| `--r-lg` | 16px | Card interne, voci di menu |
| `--r-xl` | 24px | Card principali, pannelli |
| `--r-full` | 999px | Pillole di stato, avatar, interruttori |

**Ombre**, tre livelli e non uno di più:

| Token | Valore | Uso |
|---|---|---|
| `--sh-1` | `0 1px 2px rgba(27,25,23,.04)` | Card a riposo |
| `--sh-2` | `0 4px 16px rgba(27,25,23,.06)` | Card sollevate, menu |
| `--sh-3` | `0 12px 32px rgba(27,25,23,.10)` | Finestre modali, suggerimenti |

**Movimento:** 150ms per gli stati di passaggio, 220ms per le comparse, `cubic-bezier(.2,.8,.2,1)`. Nessuna animazione decorativa. Rispetto della preferenza di sistema per il movimento ridotto.

---

## 5. Componenti

### Navigazione laterale

Colonna bianca su fondo `--bg`, richiudibile a sola icona come nei riferimenti. La voce attiva ha fondo `--surface-sunken`, icona nel colore della sezione e una barra verticale di 3px dello stesso colore sul bordo sinistro. Da richiusa, il passaggio del mouse mostra un suggerimento su fondo `--ink` con testo bianco.

**Due stati richiusi diversi, e vale la pena saperlo** (Story 5.1, 11 agosto 2026). *Richiusa per scelta*, sopra i 720px: un pulsante toggle nella fascia del brand la stringe da 232 a 56, la scelta si scrive in un cookie (`nav_collapsed`) e vale alla visita successiva. *Richiusa per larghezza*, sotto i 720px: la stessa forma è forzata da una media query, il toggle sparisce, il cookie non conta. La resa a schermo è identica; cambia solo chi la applica. La riga «la scelta viene ricordata» resta vera perché su tablet e telefono la scelta non c'è — a 375 la nav larga non ha senso, e proporla sarebbe una decisione che nessuno userebbe.

### Card

Fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24. Nessun bordo: la separazione la fa lo stacco con `--bg`. Un titolo a `--t-heading` e nient'altro nell'intestazione, salvo un'azione allineata a destra.

### Elenco clienti

Tabella senza griglia: righe separate da 1px `--line`, altezza 56, passaggio del mouse su `--surface-sunken`. Colonne nell'ordine nome, stato, tag, ultima attività, esito.

**Quando le cinque colonne non ci stanno, la tabella cede scorrendo e non comprimendo** (Story 4.2, 11 agosto 2026): un contenitore con un nome suo, `overflow-x: auto`, mai `overflow` sulla card, che è la card di ogni schermata. Perché funzioni serve `min-width: 0` su `.main`, che è una cella di griglia e senza quello prende come larghezza minima il contenuto più largo che porta — cioè allarga la pagina invece di lasciar scorrere il contenitore. Sono le due regole misurate a 375px, dove la pagina resta 375 e la tabella scorre dentro i propri 295; la seconda vale per ogni schermata e ne è stata misurata una sola, e il residuo è a ledger con ripresa alla Story 5.2. Il contenitore porta `tabindex` e un nome accessibile, o da tastiera non si raggiunge quello che nasconde.

Il nome a `--t-body` peso 500, tutto il resto a `--t-meta` o `--t-data`. Le date in mono e in forma relativa entro la settimana ("3 giorni fa"), poi assoluta.

### Pillola di stato e di verdetto

Altezza 22, raggio `--r-full`, padding orizzontale 10, testo `--t-meta` peso 500, fondo nella tinta chiara del colore corrispondente, testo nel colore pieno. Per gli stati del cliente, un punto di 6px prima del testo.

**Superata per i cinque stati del cliente, il 3 agosto 2026.** Il fondo in tinta e il testo nel colore pieno valgono per i verdetti, non per gli stati: là il colore distingue un esito da un altro, qui direbbe che un cliente sta più avanti di un altro. Per gli stati vale la tabella di §2 — fondo `--neutral-tint` per tutti e cinque, e il colore nel punto. La regola qui sopra resta scritta perché è ancora quella dei verdetti.

**Precisata per i verdetti, il 10 agosto 2026, con la chiusura della voce di contrasto di §2.** Il fondo resta la tinta chiara; il testo non è il colore pieno ma il suo inchiostro — `--ok-ink`, `--warn-ink`, `--bad-ink` — perché il pieno sulla propria tinta non arriva a 4,5:1. `non deciso` non ha un inchiostro suo: è il caso base della pillola, `--ink-muted` su `--neutral-tint`. La forma non cambia — altezza 22, raggio pieno, padding 10, `--t-meta` peso 500, nessun punto — cambia soltanto da quale token viene il testo.

### Badge numerico

Come nei riferimenti: raggio `--r-sm`, fondo in tinta chiara, cifra in mono peso 500. Usato per contare le persone o le schede.

### Gruppo di azioni di una riga

**Nato l'11 agosto 2026, e anche questo nasce da un difetto:** nella schermata del questionario ogni domanda portava cinque comandi in fila — due frecce, `Modifica`, `Disattiva`, `Elimina` — dentro un contenitore flessibile. Ne uscivano due disallineamenti, e vale la pena tenerli distinti perché hanno due rimedi diversi.

- **Il gruppo era flessibile quanto il testo.** In un contenitore `space-between` una domanda lunga lo comprimeva, e l'ultimo pulsante andava a capo da solo. Rimedio: `flex: 0 0 auto`, il gruppo non si stringe più.
- **Il numero di pulsanti cambia da riga a riga.** `Elimina` compare solo dove nessuna scheda contiene quella domanda, e in una fila allineata a destra la sua assenza faceva slittare tutti gli altri di una colonna intera. Rimedio: una **griglia a colonne fisse**, dove la cella resta vuota invece di sparire.

Misurate su tre righe consecutive, la coordinata di partenza del gruppo era 618, 710 e 664; ora è 727 su tutte e tre, e la riga col titolo lungo è alta 99 invece di 139.

**La colonna è 100px per tutte le azioni testuali**, che è la parola più larga del gruppo — `Rinomina`, misurata 98,5 — arrotondata al multiplo di 4. Una sola misura e non una per gruppo: così le due colonne dell'intestazione del blocco cadono sopra le ultime due della domanda invece di formare una griglia loro. Il gruppo resta ancorato a destra, ed è quell'ancoraggio che rende comparabili righe con un numero diverso di celle.

**Sotto i 600 il gruppo della domanda scende sotto il testo** e prende tutta la larghezza in colonne uguali: l'allineamento fra righe sopravvive, perché `1fr` è la stessa frazione per tutte. La soglia è misurata — a 601 il testo conserva 201px accanto al gruppo, a 375 la griglia da 308 non starebbe nei 295 della card. L'intestazione del blocco lì torna una fila semplice: ha una riga sola, quindi non ha niente da allineare con sé stessa.

### Pulsante con icona

`.btn--icon`: quadrato di 40, nessun padding, tratto in `--ink-muted`, icona 18. Le due frecce di riordino sono l'unico uso di oggi, in un gruppo staccato di 2 invece di 8 perché sono un comando solo con due direzioni.

La parola non sparisce quando diventa icona: resta come nome accessibile e come suggerimento del passaggio del mouse. `Sposta su` e `Sposta giù` sono diventate icone perché due etichette lunghe occupavano da sole metà della fila per l'azione che si usa meno.

### Interruttore di modalità

Un binario scavato con la voce corrente sollevata su `--surface`: lo stesso linguaggio del cestino letto al contrario — lì il fondo scavato dice «fuori dal questionario», qui dice «lo sfondo su cui una delle due sta sopra». Altezza 34 dentro un contenitore di 40, raggio pieno, testo `--t-label`.

**Nessun colore**, e non è timidezza: una tinta farebbe leggere le due voci come due stati di un dato, e non lo sono — sono due viste della stessa pagina. Lo stato corrente si dichiara con `aria-current="page"`, che è anche il selettore che lo disegna: l'attributo che lo dice all'assistenza e quello che lo colora non possono divergere.

Un uso oggi, in cima al questionario: `Contenuto` e `Ordine`. Le parole nominano cosa si sta sistemando e non cosa si sta facendo — `Modifica` sarebbe entrato in collisione col pulsante omonimo della domanda, e `Leggi` avrebbe mentito, perché anche lì si scrive.

### Cestino

**Nato l'11 agosto 2026, e nasce da un difetto:** i due cestini — quello del questionario e quello delle persone — riusavano `.card` con dentro `.question`, cioè fondo bianco, `--sh-1` e voce a `--t-heading`. Una riga eliminata era resa con gli stessi identici valori di una domanda viva, e distingueva solo la parola sul pulsante. La schermata del questionario aveva quindi tre gradi di vita — attiva, non attiva, eliminata — e due trattamenti, con il salto più grosso non disegnato affatto.

**Il cestino scava invece di galleggiare.** Fondo `--surface-sunken`, nessuna ombra, stesso raggio `--r-xl`, e 40 di stacco sopra invece dei 24 fra due card sorelle: il salto non è fra due card, è fra il questionario e ciò che ne è uscito. Misurati con la formula WCAG, `--surface` su `--bg` sta a 1,12:1 e `--surface-sunken` su `--bg` sta anch'esso a **1,12:1**: lo scavo si legge quanto il rilievo, in direzione opposta. È il motivo per cui la distinzione si fa con la superficie e non con il colore — i colori di sezione vivono nella navigazione e i semantici significano un esito (§2), mentre una voce eliminata non è né una sezione né un esito. **Nessun token nuovo.**

Tre conseguenze che il fondo più scuro impone, e che non si deducono:

- Il separatore sale a `--line-strong`, perché `--line` su `--surface-sunken` sta a 1,11:1, cioè non si vede. A 1,27:1 resta appena più tenue di `--line` su bianco (1,39:1), che per un cestino va bene.
- Il badge si inverte a `--surface`: il suo fondo è `--surface-sunken`, che qui sarebbe scavato su scavato.
- Il conteggio è `--ink-muted` e non `--ink-faint`, che su `--surface-sunken` sta a 2,98:1.

**La voce non è il titolo di niente:** `--t-body` peso 500, non il `--t-heading` della domanda viva. È la seconda metà della distinzione e da sola vale quanto lo scavo — una riga a 17/600 legge come una domanda anche su un fondo diverso. L'inchiostro invece resta pieno: dentro una zona già scavata il testo è la sola cosa da leggere, e smorzarlo due volte lo renderebbe faticoso proprio a chi cerca cosa recuperare.

**Richiuso di default, con un `<details>` nativo.** Il cestino vuoto non compare affatto, quindi una riga chiusa col suo numero è già la prova che dentro c'è qualcosa; da chiuso costa una riga in fondo a una pagina di ventitré domande. Il browser porta `aria-expanded`, l'invio e la barra spaziatrice da sé, e i due chiamanti restano Server Component. Il sommario è alto 64, sopra i 44 che §8 chiede sul tocco, e il fuoco ridichiara `--r-xl` perché l'alone globale porta `--r-sm`, che dentro un angolo da 24 resterebbe tagliato.

**Una sola eccezione, ed è lo stato d'errore** del cestino delle persone: lì compare come card aperta, non come guscio richiuso. Un errore dietro un clic è un errore che nessuno legge, e il numero che il sommario mostra non esiste — non si sa quante righe ci siano, è proprio quello che è mancato.

### Campo di risposta

L'elemento su cui si passa più tempo, quindi il più curato. Fondo `--surface`, bordo 1px `--line`, raggio `--r-md`, padding 12 16, testo `--t-body`. Cresce in altezza con il contenuto, minimo tre righe. Al focus: bordo `--sec-prequalifica` e alone di 3px nella sua tinta chiara, mai l'anello azzurro predefinito del browser.

Sopra il campo la domanda a `--t-heading`, sotto il testo di aiuto a `--t-meta`.

### Indicatore di salvataggio, elemento firma

Riga discreta ancorata in fondo alla schermata di compilazione, sempre visibile, in mono a `--t-data`.

Tre stati soltanto:

| Stato | Testo | Colore |
|---|---|---|
| a riposo | `Salvato alle 14:32` | `--ink-faint` |
| in corso | `Salvataggio…` | `--ink-muted` |
| fallito | `Non salvato, riprovo` + pulsante Riprova | `--bad` |

Nessuna spunta animata, nessun avviso a comparsa. Il tono è quello di un orologio: sta lì, lo guardi quando ti serve.

### Barra di avanzamento

Contatore in mono, `12 / 15`, e accanto una barra alta 4px, larga 64, raggio pieno, riempita in `--sec-prequalifica` su fondo `--surface-sunken`. Nessuna percentuale, nessun colore d'allarme: serve a distinguere una scheda finita da una lasciata a metà, non a mettere fretta.

### Pulsanti

| Variante | Aspetto | Uso |
|---|---|---|
| primario | fondo `--ink`, testo bianco, raggio `--r-md`, altezza 40 | Una sola azione per schermata |
| secondario | fondo `--surface`, bordo `--line`, testo `--ink` | Azioni di supporto |
| discreto | nessun fondo, testo `--ink-muted` | Azioni terziarie |
| distruttivo | testo `--bad`, fondo `--bad` in tinta chiara al passaggio | Solo con conferma |

Il primario è nero e non colorato: così il colore resta libero di significare la sezione o l'esito.

---

## 6. I quattro stati di ogni schermata

Obbligatori, come da `kb-0.md`.

| Stato | Trattamento |
|---|---|
| pieno | Il contenuto |
| in caricamento | Scheletri della forma reale del contenuto, mai un cerchio che gira al centro |
| vuoto | Una riga che dice cosa manca e un pulsante che lo crea. "Nessun cliente ancora. Crea il primo." Non "Nessun risultato trovato." |
| errore | Cosa è successo e cosa fare, in `--bad` su tinta chiara, con l'azione di riprova accanto |

---

## 7. Voce dell'interfaccia

- Italiano, frase minuscola, voce attiva, seconda persona solo quando serve.
- Un'azione si chiama allo stesso modo dal pulsante alla conferma: "Archivia" produce "Archiviato".
- Le etichette nominano le cose come le riconosci tu, non come sono fatte nel database: "Chi decide", non "ruolo decisionale".
- Gli errori non si scusano e non sono vaghi.
- Niente punti esclamativi, niente incoraggiamenti, niente emoji. È uno strumento di lavoro che userai fra un cliente e l'altro.

---

## 8. Accessibilità

- Contrasto minimo 4.5:1 sul testo, verificato in particolare su `--ink-muted` sopra `--surface-sunken`.
- Focus sempre visibile: alone di 3px nella tinta della sezione corrente.
- Bersagli tattili di almeno 44px sui dispositivi tocco, perché la compilazione avviene anche su tablet.
- Colore mai unico portatore di significato.
- Ogni campo ha una etichetta vera, non solo un segnaposto.

---

## 9. Token, pronti da incollare

```css
:root {
  /* base */
  --bg:#F5F2EC; --surface:#FFFFFF; --surface-sunken:#EAE5DC;
  --ink:#141210; --ink-muted:#58524B; --ink-faint:#8B8379;
  --line:#E1DACE; --line-strong:#D3CCC4;

  /* sezioni */
  --sec-clienti:#3A4FDE;       --sec-clienti-tint:#E8EAFD;
  --sec-prequalifica:#0A7E90;  --sec-prequalifica-tint:#DFF1F3;
  --sec-questionario:#7440DA;  --sec-questionario-tint:#EFE7FC;
  --sec-audit:#C13A6E;         --sec-audit-tint:#FCE6EF;
  --sec-documenti:#3B6A9B;     --sec-documenti-tint:#E6EDF4;

  /* semantici */
  --ok:#0E8A5B;      --ok-tint:#DFF3E9;
  --warn:#A9690A;    --warn-tint:#FBEDD4;
  --bad:#CE4632;     --bad-tint:#FBE6E1;
  --neutral:#8A857F; --neutral-tint:#EDE9E2;

  /* inchiostri per un fondo chiaro dove il pieno non arriva a 4,5:1: §2. Nati per le pillole di
     verdetto; dal 10 agosto 2026 `--bad-ink` è anche la riga d'errore dell'intestazione di pagina,
     che è l'unico `.field__error` fuori da una card. Non sostituiscono i tre pieni qui sopra, che
     restano i valori di D26. Il neutro non ne ha uno, e il perché è in §2. */
  --ok-ink:#0D7C52;  --warn-ink:#985F09;  --bad-ink:#BB402E;

  /* inchiostro per un fondo scuro: il suggerimento della navigazione richiusa è testo bianco su
     `--ink` (§2, §5). Nato con la Story 5.1, un uso oggi, 18,69:1 misurati. */
  --ink-inverse:#FFFFFF;

  /* forma */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:24px; --r-full:999px;
  --sh-1:0 1px 2px rgba(27,25,23,.04);
  --sh-2:0 4px 16px rgba(27,25,23,.06);
  --sh-3:0 12px 32px rgba(27,25,23,.10);

  /* tipografia */
  --font-ui:'Geist','Inter',system-ui,sans-serif;
  --font-data:'Geist Mono',ui-monospace,'SF Mono',monospace;

  /* movimento */
  --ease:cubic-bezier(.2,.8,.2,1);
  --dur-fast:150ms; --dur-base:220ms;
}
```

---

## 10. Da non fare

- Nessun valore esadecimale fuori da questo file. Se serve un colore che non c'è, si aggiunge qui.
- Nessun gradiente, nessun vetro smerigliato, nessuna illustrazione tridimensionale: i riferimenti li contengono, questo strumento no, perché è un attrezzo di lavoro e non una vetrina.
- Nessuna icona colorata dentro il contenuto: le icone sono a tratto, in `--ink-muted`, e prendono colore solo quando indicano la sezione attiva.
- Nessun rosso per attirare l'attenzione su cose che non sono errori.
- Nessuna schermata senza i suoi quattro stati.
