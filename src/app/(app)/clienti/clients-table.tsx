import Link from 'next/link'

import { StatusPill } from '@/components/status-pill'
import { VerdictPill } from '@/components/verdict-pill'
import { formatLastActivity } from '@/lib/format-date'
import { lastActivityAt } from '@/lib/last-activity'
import { latestVerdict } from '@/lib/latest-verdict'
import type { ClientRow } from '@/lib/types'

/**
 * Le colonne del cliente si continuano a derivare da ClientRow: nessun elenco di campi
 * riscritto a mano. Le schede sono un innesto, quindi non stanno in ClientRow.
 *
 * L'innesto porta l'ultima attività (`updated_at`, dalla 1.6) e, dalla 4.2, il verdetto con le
 * tre chiavi che scelgono quale scheda è la più recente.
 */
export type ClientListRow = Pick<
  ClientRow,
  'id' | 'name' | 'status' | 'tags' | 'updated_at'
> & {
  assessments: { updated_at: string; call_date: string; created_at: string; id: string; verdict: string }[]
}

/**
 * La tabella dell'elenco, in un file suo dalla revisione della Story 1.7: `page.tsx` conteneva
 * due componenti e superava le 200 righe, che è la stessa cosa detta due volte (kb-0.md §2).
 *
 * Colonne nome, stato, tag, ultima attività ed esito — la quinta dalla Story 4.2 — righe alte 56
 * e nessuna griglia (`design-system.md` §5). La forma viene dalla 1.1 e AC5 della 1.7 la verifica.
 *
 * `tabIndex` e `role` sul contenitore che scorre: i soli figli focalizzabili sono i collegamenti
 * sul nome, tutti nella prima colonna, quindi senza il browser non lo scrollerebbe mai da
 * tastiera e a schermo stretto l'esito resterebbe irraggiungibile.
 */
export function ClientsTable({ rows }: { rows: ClientListRow[] }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Elenco clienti">
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Stato</th>
            <th>Tag</th>
            <th>Ultima attività</th>
            <th>Esito</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // `?? []` come in `last-activity.ts`: il tipo lo vieta, ma su `null` il ciclo cadrebbe
            // in un componente server, fuori dal ramo d'errore della pagina.
            const verdict = latestVerdict(row.assessments ?? [])

            return (
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
                {/* Vuota davvero: nessun trattino, che sarebbe un'affermazione su una scheda che
                    non esiste (AC2). */}
                <td>{verdict === null ? null : <VerdictPill verdict={verdict} />}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
