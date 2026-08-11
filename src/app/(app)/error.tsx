'use client'

/**
 * Quarto stato di ogni schermata, per gli errori lanciati invece che ritornati: senza questo
 * confine una variabile d'ambiente mancante porterebbe alla pagina d'errore predefinita di
 * Next, in inglese e fuori dal design system (design-system.md §6).
 *
 * Il messaggio dice cosa fare, non cosa è successo nello stack: il dettaglio resta nei log del
 * server, e il digest è l'unica cosa che li ricollega a questa schermata (kb-0.md §3).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    // Nessuna classe di sezione: questo confine copre ogni rotta sotto `(app)/` e non ne conosce
    // nessuna. L'alone del fuoco prende quindi il ripiego di `:root`, che è la scelta giusta —
    // dichiarare una sezione qui vorrebbe dire dichiararne una sbagliata su tutte le altre.
    <main className="main">
      <header className="page-header">
        <h1 className="page-title">Qualcosa non ha risposto</h1>
      </header>

      <div className="card">
        <div className="error-box" role="alert">
          <p style={{ margin: 0 }}>La pagina non si è caricata. Riprova; se torna, il dettaglio è nei log.</p>
          <button type="button" className="btn btn--secondary" onClick={reset}>
            Riprova
          </button>
        </div>
        {error.digest ? (
          <p className="data" style={{ color: 'var(--ink-faint)', margin: '16px 0 0' }}>
            Riferimento: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  )
}
