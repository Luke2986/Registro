import { redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { StatusPill } from '@/components/status-pill'
import { formatLastActivity } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'

type ClientListRow = Pick<ClientRow, 'id' | 'name' | 'status' | 'tags' | 'updated_at'>

export default async function ClientsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status, tags, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Clienti</h1>
        {data && data.length > 0 ? (
          <p className="data" style={{ color: 'var(--ink-muted)' }}>
            {data.length}
          </p>
        ) : null}
      </header>

      <div className="card">
        {error ? (
          <ErrorState
            message="L'elenco non si è caricato. La connessione al database non ha risposto."
            retryHref="/clienti"
          />
        ) : data && data.length > 0 ? (
          <ClientsTable rows={data} />
        ) : (
          <div className="empty">
            <p style={{ margin: 0 }}>Nessun cliente ancora.</p>
            <p className="meta">
              La schermata che crea un cliente arriva con il prossimo pezzo di lavoro.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function ClientsTable({ rows }: { rows: ClientListRow[] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Stato</th>
          <th>Tag</th>
          <th>Ultima attività</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="table__name">{row.name}</td>
            <td>
              <StatusPill status={row.status} />
            </td>
            <td className="meta">{row.tags.join(', ')}</td>
            <td className="data" style={{ color: 'var(--ink-muted)' }}>
              {formatLastActivity(row.updated_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
