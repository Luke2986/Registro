import Link from 'next/link'

import { StatusPill } from '@/components/status-pill'
import { formatLastActivity } from '@/lib/format-date'
import { lastActivityAt } from '@/lib/last-activity'
import type { ClientRow } from '@/lib/types'

/**
 * Le colonne del cliente si continuano a derivare da ClientRow: nessun elenco di campi
 * riscritto a mano. Le schede sono un innesto, quindi non stanno in ClientRow.
 */
export type ClientListRow = Pick<
  ClientRow,
  'id' | 'name' | 'status' | 'tags' | 'updated_at'
> & {
  assessments: { updated_at: string }[]
}

/**
 * La tabella dell'elenco, in un file suo dalla revisione della Story 1.7: `page.tsx` conteneva
 * due componenti e superava le 200 righe, che è la stessa cosa detta due volte (kb-0.md §2).
 *
 * Il contenuto non è cambiato di una riga nello spostamento. Colonne nome, stato, tag, ultima
 * attività, righe alte 56 e nessuna griglia: la forma è quella dalla Story 1.1, e AC5 della 1.7
 * è la verifica che sia rimasta tale.
 */
export function ClientsTable({ rows }: { rows: ClientListRow[] }) {
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
