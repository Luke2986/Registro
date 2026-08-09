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

**Voce aperta, e va guardata prima di chiudere la prima versione:** un colore pieno sulla propria tinta di fondo non arriva a 4,5:1, che è il minimo che la §8 chiede sul testo. Il verdetto `sì` è il caso peggiore, 3,8:1, e non è una novità della revisione «viva» — la coppia precedente stava a 4,2:1, anche quella sotto. Il testo delle pillole è a 12px peso 500, quindi non rientra nell'eccezione del testo grande. Si chiude scurendo i quattro colori pieni **solo dentro le pillole**, non i token, perché quegli stessi token servono anche come testo su bianco, dove il contrasto c'è.

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

### Card

Fondo `--surface`, raggio `--r-xl`, ombra `--sh-1`, padding 24. Nessun bordo: la separazione la fa lo stacco con `--bg`. Un titolo a `--t-heading` e nient'altro nell'intestazione, salvo un'azione allineata a destra.

### Elenco clienti

Tabella senza griglia: righe separate da 1px `--line`, altezza 56, passaggio del mouse su `--surface-sunken`. Colonne nell'ordine nome, stato, tag, ultima attività, esito.

Il nome a `--t-body` peso 500, tutto il resto a `--t-meta` o `--t-data`. Le date in mono e in forma relativa entro la settimana ("3 giorni fa"), poi assoluta.

### Pillola di stato e di verdetto

Altezza 22, raggio `--r-full`, padding orizzontale 10, testo `--t-meta` peso 500, fondo nella tinta chiara del colore corrispondente, testo nel colore pieno. Per gli stati del cliente, un punto di 6px prima del testo.

**Superata per i cinque stati del cliente, il 3 agosto 2026.** Il fondo in tinta e il testo nel colore pieno valgono per i verdetti, non per gli stati: là il colore distingue un esito da un altro, qui direbbe che un cliente sta più avanti di un altro. Per gli stati vale la tabella di §2 — fondo `--neutral-tint` per tutti e cinque, e il colore nel punto. La regola qui sopra resta scritta perché è ancora quella dei verdetti.

### Badge numerico

Come nei riferimenti: raggio `--r-sm`, fondo in tinta chiara, cifra in mono peso 500. Usato per contare le persone o le schede.

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
