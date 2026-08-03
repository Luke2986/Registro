import { CLIENT_FIELDS } from '@/lib/client-fields'

/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6). L'elenco si deriva da CLIENT_FIELDS come la scheda: contato a mano,
 * il giorno che un campo entra o esce lo scheletro resta della forma di ieri e la pagina
 * salta quando il contenuto arriva.
 */
export default function ClientLoading() {
  return (
    <>
      <header className="page-header">
        <div className="skeleton" style={{ width: 88 }} />
      </header>

      <div className="card">
        <div className="detail-identity">
          <div className="field">
            <div className="skeleton" style={{ width: 120 }} />
            <div className="skeleton" style={{ height: 64, borderRadius: 'var(--r-md)' }} />
          </div>
          {/* Lo stato è un campo come gli altri: etichetta e controllo alto 44px, come il
              selettore che arriva al suo posto. Uno scheletro a forma di pillola farebbe
              saltare la riga quando il contenuto arriva. */}
          <div className="field field--status">
            <div className="skeleton" style={{ width: 48 }} />
            <div className="skeleton" style={{ height: 44, borderRadius: 'var(--r-md)' }} />
          </div>
        </div>

        <div className="detail-grid">
          {CLIENT_FIELDS.map((field) => (
            <div className={`field${field.kind === 'long' ? ' field--wide' : ''}`} key={field.key}>
              <div className="skeleton" style={{ width: 72 }} />
              {/* Le due misure sono quelle vere dei controlli: 44px il minimo di `.input`, 98px
                  il minimo di `.input--long`. Uno scheletro più alto accorcia la card quando il
                  contenuto arriva, che è il salto che questo file esiste per evitare. */}
              <div
                className="skeleton"
                style={{ height: field.kind === 'long' ? 98 : 44, borderRadius: 'var(--r-md)' }}
              />
              {/* La riga dell'indicatore tiene il suo spazio anche qui: è sempre in vista. */}
              {field.kind === 'long' ? <div className="skeleton" style={{ width: 140, height: 44 }} /> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
