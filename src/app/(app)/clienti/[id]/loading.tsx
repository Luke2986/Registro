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

        {/* I tag stanno fra l'identità e la griglia, come nella scheda: etichetta stretta e un
            blocco alto quanto la riga di scrittura. Uno scheletro che non ha la forma del
            contenuto fa saltare la pagina quando il contenuto arriva. */}
        <div className="field field--tags">
          <div className="skeleton" style={{ width: 32 }} />
          <div className="skeleton" style={{ height: 44, borderRadius: 'var(--r-md)' }} />
          {/* La riga che spiega il minuscolo è sempre resa, mai condizionale: senza il suo
              posto qui, la griglia dei campi scende di 24px quando il contenuto arriva. La
              riga dei chip invece non si riserva, perché un cliente senza tag non ce l'ha. */}
          <div className="skeleton" style={{ width: 280 }} />
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

      {/* La card delle persone: solo il titolo. Si riserva lo spazio di quello che c'è sempre,
          non di quello che dipende dai dati, ed è la stessa regola già applicata alla riga dei
          chip. Il badge e `Aggiungi persona` compaiono solo con almeno una persona, e i blocchi
          delle persone nemmeno: riservarli farebbe saltare la pagina su ogni cliente che non ne
          ha, cioè spostare il salto invece di toglierlo. */}
      <div className="card">
        <div className="card__header">
          <div className="skeleton" style={{ width: 72, height: 24 }} />
        </div>
      </div>
    </>
  )
}
