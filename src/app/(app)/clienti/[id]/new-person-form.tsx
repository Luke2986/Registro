'use client'

import { DECISION_ROLES } from '@/lib/decision-roles'
import { PERSON_FIELDS } from '@/lib/person-fields'
import { useWrite } from '@/lib/use-write'

import { createPerson } from '../people-actions'

const UNREACHABLE = 'La persona non è stata salvata: il server non ha risposto. Riprova fra un momento.'

/**
 * La creazione: i sei campi, i cinque ruoli e **un solo `Salva`**. È il percorso che si fa
 * mentre si è al telefono, e sei conferme separate per registrare una persona appena conosciuta
 * sono sei clic di troppo. La correzione, che arriva giorni dopo, resta un campo per volta con
 * la sua conferma (D21).
 *
 * `contatto principale` non è qui: è una proprietà del cliente più che della persona — ce n'è
 * uno solo — e ha la sua azione. Si mette dopo, con una spunta.
 *
 * Campi non controllati con il `name` preso da PERSON_FIELDS, così il formData che arriva
 * all'azione ha già le chiavi che l'azione si aspetta. Nessun `required` su nessuno: nessun
 * campo è obbligatorio (AC1).
 */
export function NewPersonForm({
  clientId,
  onSaved,
  onCancel,
}: {
  clientId: string
  onSaved: () => void
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
          () => createPerson({}, formData),
          () => {
            // Solo dopo un successo: chiamando l'azione a mano React non ripulisce niente da
            // sé, quindi un valore rifiutato resta dov'è insieme al suo errore. Durante
            // l'attesa i campi sono disabilitati, così non si azzera niente che sia stato
            // scritto nel frattempo.
            element.reset()
            onSaved()
          },
        )
      }}
    >
      <div className="detail-grid">
        {PERSON_FIELDS.map((field) => {
          const id = `nuova-persona-${field.key}`

          return (
            <div className={`field${field.kind === 'long' ? ' field--wide' : ''}`} key={field.key}>
              <label className="label" htmlFor={id}>
                {field.label}
              </label>

              {field.kind === 'long' ? (
                <textarea
                  id={id}
                  name={field.key}
                  className="input input--long"
                  rows={3}
                  autoComplete="off"
                  disabled={pending}
                />
              ) : (
                <input
                  id={id}
                  name={field.key}
                  className="input"
                  type="text"
                  inputMode={field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : undefined}
                  autoComplete="off"
                  disabled={pending}
                  autoFocus={field.key === 'first_name'}
                />
              )}
            </div>
          )
        })}
      </div>

      <fieldset className="field--group">
        <legend className="label">Nella decisione</legend>

        <div className="checks">
          {DECISION_ROLES.map((role) => (
            <label className="check" key={role.value}>
              <input type="checkbox" name="decision_roles" value={role.value} disabled={pending} />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Qui `Salva` è primario: dentro il modulo è l'unica azione. */}
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={pending}>
          Annulla
        </button>
      </div>
    </form>
  )
}
