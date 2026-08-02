const ROWS = [1, 2, 3, 4, 5]

/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6).
 */
export default function ClientsLoading() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Clienti</h1>
      </header>
      <div className="card">
        {ROWS.map((row) => (
          <div
            key={row}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 16,
              alignItems: 'center',
              height: 56,
            }}
          >
            <div className="skeleton" style={{ width: '60%' }} />
            <div className="skeleton" style={{ width: 72 }} />
            <div className="skeleton" style={{ width: 96 }} />
            <div className="skeleton" style={{ width: 64 }} />
          </div>
        ))}
      </div>
    </>
  )
}
