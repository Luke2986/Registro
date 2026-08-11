import { ErrorState } from '@/components/error-state'
import { formatLastActivity } from '@/lib/format-date'
import { PERSON_UNNAMED } from '@/lib/person-fields'

import { PersonRestoreForm } from './person-restore-form'

export type ArchivedPerson = {
  id: string
  label: string
  archived_at: string
}

/**
 * Il cestino delle persone di questo cliente, gemello di quello del questionario e con le stesse
 * due regole: **non esiste quando è vuoto**, perché il cestino vuoto è la condizione normale e
 * una card che dice «niente» a ogni visita sarebbe rumore permanente; e `Ripristina` non chiede
 * conferma, perché non si perde niente.
 *
 * Card a sé e non una parte della card delle persone: quella card ha già i suoi quattro stati e
 * un elenco che cresce, e una seconda lista dentro le farebbe dire due cose. Sta subito sotto,
 * prima delle schede, cioè accanto a quello da cui la riga è uscita.
 *
 * Server Component: l'unica parte interattiva è il pulsante, che è il componente client. Vale
 * anche per l'orario, che così si calcola una volta sola sul server, nel fuso dichiarato (D23).
 *
 * `rows` a `null` è «la lettura è fallita», e allora la card **compare lo stesso**, in errore:
 * l'assenza qui vuol dire «non c'è niente da recuperare», e dirla quando non si sa manderebbe a
 * credere perduta una persona che sta nel cestino.
 */
export function PersonTrashCard({ clientId, rows }: { clientId: string; rows: ArchivedPerson[] | null }) {
  if (rows === null) {
    return (
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Cestino</h2>
        </div>
        <ErrorState
          message="Il cestino non si è caricato. Riprova fra un momento."
          retryHref={`/clienti/${clientId}`}
        />
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Cestino</h2>
      </div>

      <p className="meta">
        Le persone che elimini restano qui e si possono rimettere dov’erano, con i loro campi e i
        loro ruoli. Se una era l’interlocutore di una scheda, torna a esserlo.
      </p>

      <ul className="people">
        {rows.map((row) => (
          <li key={row.id} className="person">
            <div className="person__foot">
              {/* `label` arriva vuota quando la persona non aveva né nome né cognome: il ripiego
                  sta qui e non nel database, dov'è l'unica riga che parlerebbe a chi guarda lo
                  schermo. Stessa parola di personDisplayName, dallo stesso posto. */}
              <p style={{ margin: 0 }}>{row.label.trim() || PERSON_UNNAMED}</p>
              <PersonRestoreForm archiveId={row.id} name={row.label.trim() || PERSON_UNNAMED} />
            </div>
            <p className="meta">Eliminata {formatLastActivity(row.archived_at)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
