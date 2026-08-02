/** Dieci come i campi resi da page.tsx: uno scheletro più corto fa saltare il contenuto quando arriva. */
const FIELDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6).
 */
export default function ClientLoading() {
  return (
    <>
      <header className="page-header">
        <div className="skeleton" style={{ width: 88 }} />
      </header>

      <div className="card">
        <div className="detail-identity">
          <div className="skeleton" style={{ width: 280, height: 38 }} />
          <div className="skeleton" style={{ width: 88, height: 22, borderRadius: 'var(--r-full)' }} />
        </div>
        <div className="detail-grid">
          {FIELDS.map((field) => (
            <div className="field" key={field}>
              <div className="skeleton" style={{ width: 72 }} />
              <div className="skeleton" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
