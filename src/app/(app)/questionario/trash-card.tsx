import { TrashFold } from '@/components/trash-fold'
import { formatLastActivity } from '@/lib/format-date'

import { RestoreButton } from './restore-button'

export type ArchivedRow = {
  id: string
  source_table: string
  label: string
  archived_at: string
}

/**
 * Il cestino: quello che `Elimina` ha tolto dal questionario, con la via del ritorno accanto.
 *
 * **Non esiste quando è vuoto**, e non è una scorciatoia sullo stato vuoto: il cestino vuoto è la
 * condizione normale, e una card che dice «niente» in fondo a ogni visita sarebbe rumore
 * permanente pagato per un caso raro. Lo stato vuoto qui è l'assenza — l'unico posto del software
 * dove è la resa giusta, perché non c'è niente da invitare a fare.
 *
 * **Non è una card**, dall'11 agosto 2026: è il guscio scavato e richiuso di `TrashFold`, e la
 * voce dentro non riusa più `.question__text`. La ragione sta nel CSS, accanto ai contrasti
 * misurati; qui basta sapere che una riga eliminata non deve leggersi come una domanda viva, che
 * è esattamente quello che faceva finché il markup era lo stesso.
 *
 * Server Component: l'unica parte interattiva è il pulsante, che è il componente client.
 */
export function TrashCard({ rows }: { rows: ArchivedRow[] }) {
  return (
    <TrashFold count={rows.length}>
      <p className="meta">
        Quello che elimini resta qui e si può rimettere dov’era. Le risposte già date dai clienti
        non passano di qui: non si cancellano mai.
      </p>

      <ul className="questions">
        {rows.map((row) => (
          <li key={row.id} className="question">
            <div className="question__header">
              <p className="trash__label">{row.label}</p>
              <div className="question__actions">
                <RestoreButton archiveId={row.id} label={row.label} />
              </div>
            </div>
            <p className="question__meta">
              {/* La parola dice di cosa si tratta, perché nel cestino un blocco e una domanda
                  si somigliano: sono tutti e due una riga con un testo. */}
              <span className="badge">
                {row.source_table === 'question_blocks' ? 'Blocco' : 'Domanda'}
              </span>
              <span>{formatLastActivity(row.archived_at)}</span>
            </p>
          </li>
        ))}
      </ul>
    </TrashFold>
  )
}
