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
 * **La card non esiste quando è vuota**, e non è una scorciatoia sullo stato vuoto: il cestino
 * vuoto è la condizione normale, e una card che dice «niente» in fondo a ogni visita sarebbe
 * rumore permanente pagato per un caso raro. Lo stato vuoto qui è l'assenza — l'unico posto del
 * software dove è la resa giusta, perché non c'è niente da invitare a fare.
 *
 * Server Component: l'unica parte interattiva è il pulsante, che è il componente client.
 */
export function TrashCard({ rows }: { rows: ArchivedRow[] }) {
  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Cestino</h2>
      </div>

      <p className="meta">
        Quello che elimini resta qui e si può rimettere dov’era. Le risposte già date dai clienti
        non passano di qui: non si cancellano mai.
      </p>

      <ul className="questions">
        {rows.map((row) => (
          <li key={row.id} className="question">
            <div className="question__header">
              <p className="question__text">{row.label}</p>
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
    </section>
  )
}
