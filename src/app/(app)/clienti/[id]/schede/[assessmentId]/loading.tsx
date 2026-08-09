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
    <>
      <header className="page-header">
        <div className="page-header__lead">
          {/* 88, come lo scheletro del ritorno indietro della scheda cliente. */}
          <div className="skeleton" style={{ width: 88 }} />
          <h1 className="page-title">Prequalifica</h1>
        </div>
        <div className="page-header__actions">
          {/* La data in mono viene 80 di larghezza: `09/08/2026` a 13px. */}
          <div className="skeleton" style={{ width: 80 }} />
        </div>
      </header>

      <section className="card">
        <div className="card__header">
          {/* 24, l'altezza di `.card__title`. I titoli dei blocchi stanno fra 73 e 113. */}
          <div className="skeleton" style={{ width: 96, height: 24 }} />
        </div>
      </section>
    </>
  )
}
