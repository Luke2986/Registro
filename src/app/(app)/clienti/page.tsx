import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { StatusPill } from '@/components/status-pill'
import { formatLastActivity } from '@/lib/format-date'
import { byLastActivityDesc, lastActivityAt } from '@/lib/last-activity'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'

/**
 * Le colonne del cliente si continuano a derivare da ClientRow: nessun elenco di campi
 * riscritto a mano. Le schede sono un innesto, quindi non stanno in ClientRow.
 */
type ClientListRow = Pick<ClientRow, 'id' | 'name' | 'status' | 'tags' | 'updated_at'> & {
  assessments: { updated_at: string }[]
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  // Innesto normale e mai `assessments!inner(...)`: con !inner diventa un join interno e fa
  // sparire dall'elenco ogni cliente senza schede, che oggi sono tutti. La sicurezza a livello
  // di riga vale anche sulle righe innestate: assessments_owner_all filtra le schede altrui
  // dentro la stessa richiesta, senza controlli da riscrivere qui.
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status, tags, updated_at, assessments(updated_at)')
    .order('updated_at', { ascending: false })

  // `.order` sul database resta perché sceglie *quali* righe tornano quando ce ne sono più del
  // tetto di PostgREST, e le più recenti sono quelle giuste. Non dà però un ordine stabile: un
  // ORDER BY su una colonna sola non definisce niente a parità di valore, e a renderlo stabile è
  // il criterio sul nome dentro il comparatore. L'ordinamento vero è qui, perché PostgREST non
  // ordina per un aggregato delle righe innestate. Copia prima di ordinare: `.sort()` muterebbe
  // sul posto l'array del client di rete.
  const rows = data ? [...data].sort(byLastActivityDesc) : null

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Clienti</h1>
        {rows && rows.length > 0 ? (
          <div className="page-header__actions">
            <p className="data" style={{ color: 'var(--ink-muted)', margin: 0 }}>
              {rows.length}
            </p>
            <Link href="/clienti/nuovo" className="btn btn--primary">
              Nuovo cliente
            </Link>
          </div>
        ) : null}
      </header>

      <div className="card">
        {error ? (
          <ErrorState
            message="L'elenco non si è caricato. La connessione al database non ha risposto."
            retryHref="/clienti"
          />
        ) : rows && rows.length > 0 ? (
          <ClientsTable rows={rows} />
        ) : (
          <div className="empty">
            <p style={{ margin: 0 }}>Nessun cliente ancora.</p>
            <Link href="/clienti/nuovo" className="btn btn--primary">
              Crea il primo cliente
            </Link>
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
            <td className="table__name">
              <Link href={`/clienti/${row.id}`}>{row.name}</Link>
            </td>
            <td>
              <StatusPill status={row.status} />
            </td>
            <td className="meta">{row.tags.join(', ')}</td>
            <td className="data" style={{ color: 'var(--ink-muted)' }}>
              {formatLastActivity(lastActivityAt(row))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
