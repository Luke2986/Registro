'use client'

import { personDisplayName } from '@/lib/person-fields'
import type { PersonDetail } from '@/lib/types'
import { useWrite } from '@/lib/use-write'

import { openAssessment } from '../assessment-actions'

const UNREACHABLE = 'La scheda non è stata aperta: il server non ha risposto. Riprova fra un momento.'

/**
 * L'apertura: due campi e un solo pulsante. È il percorso che si fa nei primi dieci secondi di
 * una call, quindi non chiede niente che si possa chiedere dopo — non il verdetto, non le
 * risposte, non lo stato.
 *
 * `today` arriva come prop e non si calcola qui: oggi a Roma non è oggi in UTC, e un valore
 * calcolato nel browser sarebbe diverso da quello reso dal server (D23).
 */
export function NewAssessmentForm({
  clientId,
  people,
  today,
  onOpened,
  onCancel,
}: {
  clientId: string
  people: PersonDetail[] | null
  today: string
  onOpened: () => void
  onCancel: () => void
}) {
  const { pending, error, write } = useWrite(UNREACHABLE)

  return (
    <form
      className="person"
      onSubmit={(event) => {
        event.preventDefault()

        // Letto qui, mentre l'evento è ancora in corso: dopo, `currentTarget` è nullo.
        const element = event.currentTarget
        const formData = new FormData(element)

        formData.set('client_id', clientId)

        write(
          () => openAssessment({}, formData),
          () => {
            element.reset()
            onOpened()
          },
        )
      }}
    >
      <div className="detail-grid">
        <div className="field">
          <label className="label" htmlFor="nuova-scheda-data">
            Data della call
          </label>
          {/* `type="date"` e non un campo di testo: sul tablet apre il selettore di sistema, e le
              call si fanno anche fuori casa (NFR4). Nessun `min` e nessun `max`: una call di
              domani si prepara oggi, una di tre mesi fa si registra adesso (D14). */}
          <input
            id="nuova-scheda-data"
            name="call_date"
            className="input"
            type="date"
            defaultValue={today}
            disabled={pending}
            autoFocus
          />
        </div>

        {/* Tre rami e non due. Senza persone il selettore non si rende affatto: uno con la sola
            opzione `Nessuno` è un controllo che finge di far scegliere, e la riga al suo posto è
            AC4 resa visibile. Se invece la lettura è fallita — `people` a null — il selettore non
            c'è per un altro motivo, e dirlo qui non è ridondante con la card sopra: la scheda che
            nasce adesso resta senza interlocutore per sempre, perché niente la modifica prima
            della Story 3.6 e niente si cancella (masterplan §5). Un campo che sparisce in
            silenzio è la sola cosa che questo modulo non può permettersi. */}
        {people !== null && people.length > 0 ? (
          <div className="field">
            <label className="label" htmlFor="nuova-scheda-interlocutore">
              Interlocutore
            </label>
            <select
              id="nuova-scheda-interlocutore"
              name="interviewee_id"
              className="input select"
              defaultValue=""
              disabled={pending}
            >
              <option value="">Nessuno</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {personDisplayName(person)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {people !== null && people.length === 0 ? (
          <p className="meta">Nessuna persona registrata: la scheda si apre senza interlocutore.</p>
        ) : null}

        {people === null ? (
          <p className="meta">Le persone non si sono caricate: la scheda si apre senza interlocutore.</p>
        ) : null}
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Primario dentro il modulo, dove è l'unica azione: fuori resta primario il `Salva` dei
          campi (design-system.md §5). */}
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Apertura…' : 'Apri scheda'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={pending}>
          Annulla
        </button>
      </div>
    </form>
  )
}
