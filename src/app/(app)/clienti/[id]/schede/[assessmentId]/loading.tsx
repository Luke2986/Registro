/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6).
 *
 * **Si riserva lo spazio di quello che c'è sempre, non di quello che dipende dai dati.** Quanti
 * blocchi ci siano, quanto sia lunga una domanda e se il campo sia alto 44 o 98 dipendono dalla
 * scheda: riservarli farebbe saltare la pagina invece di togliere il salto. È la stessa regola già
 * applicata due volte in `clienti/[id]/loading.tsx`.
 *
 * `Prequalifica` è il titolo vero e non uno scheletro sopra di lui: si sa prima di aver letto
 * qualsiasi cosa. Il ritorno indietro invece porta il nome del cliente, che ancora non si sa, e la
 * data della call nemmeno.
 */
export default function AssessmentLoading() {
  return (
    <main className="main section--prequalifica">
      <header className="page-header">
        <div className="page-header__lead">
          {/* 88, come lo scheletro del ritorno indietro della scheda cliente. */}
          <div className="skeleton" style={{ width: 88 }} />
          <h1 className="page-title">Prequalifica</h1>
        </div>
        <div className="page-header__actions">
          {/* Tutti e tre ci sono sempre: `completion_status` è `not null default 'bozza'` (0005),
              quindi la parola e il pulsante non dipendono dai dati più di quanto ne dipenda la data.
              Riservare la sola data era la versione precedente, e la code review della 3.6 l'ha
              misurata invece di dedurla: `.page-header` è `space-between`, quindi questo blocco è
              ancorato a destra e cresce verso sinistra, e con 80 riservati contro 289,4 reali la
              data scivolava a sinistra all'arrivo dei dati di **209,4px a 1280** e di **147,9px a
              375**. È esattamente il salto che questo file esiste per togliere. Coi tre scheletri
              scende a **4,6px** e **1px**.
              Le larghezze sono misurate su riproduzione statica col `globals.css` vero e i font
              veri, identiche alle due taglie: data 78, parola 32,7 (`bozza`) o 35,7 (`chiusa`),
              pulsante 146,6 × 40. Lo scarto che resta è l'arrotondamento in eccesso, cioè quanto si
              può riservare senza sapere quale delle due parole arriverà. */}
          <div className="skeleton" style={{ width: 80 }} />
          <div className="skeleton" style={{ width: 36 }} />
          <div className="skeleton" style={{ width: 146, height: 40, borderRadius: 'var(--r-md)' }} />
          {/* Il quarto, dalla 4.3: 87 è la larghezza misurata di `Esporta`. A 375 l'intestazione
              vera va a tre righe con `bozza` e a due con `chiusa`, e lo scheletro può somigliare a
              una sola delle due: somiglia a `bozza`, il valore predefinito della colonna (ledger). */}
          <div className="skeleton" style={{ width: 87, height: 40, borderRadius: 'var(--r-md)' }} />
        </div>
      </header>

      <section className="card">
        <div className="card__header">
          {/* 24, l'altezza di `.card__title`. I titoli dei blocchi stanno fra 73 e 113. */}
          <div className="skeleton" style={{ width: 96, height: 24 }} />
        </div>
      </section>
    </main>
  )
}
