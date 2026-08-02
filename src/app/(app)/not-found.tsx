import Link from 'next/link'

/**
 * Il 404 predefinito di Next è in inglese e fuori dal design system. Sta dentro (app), così
 * eredita il guscio con la navigazione laterale e da qui si può sempre tornare indietro.
 */
export default function NotFound() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Non c’è</h1>
      </header>

      <div className="card">
        <div className="empty">
          <p style={{ margin: 0 }}>Questa pagina non esiste, o è stata cancellata.</p>
          <Link href="/clienti" className="btn btn--primary">
            Torna ai clienti
          </Link>
        </div>
      </div>
    </>
  )
}
