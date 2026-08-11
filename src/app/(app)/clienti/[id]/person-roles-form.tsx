'use client'

import { useState } from 'react'

import { DECISION_ROLES, type DecisionRole } from '@/lib/decision-roles'
import { useWrite } from '@/lib/use-write'

import { updatePersonRoles } from '../person-edit-actions'

const UNREACHABLE = 'I ruoli non sono stati salvati: il server non ha risposto. Riprova fra un momento.'

/**
 * L'elenco canonico: nell'ordine di DECISION_ROLES e senza i valori che quel vocabolario non
 * conosce. Ricavarlo filtrando l'elenco invece di spingere in coda tiene le cinque caselle
 * sempre nello stesso ordine, e restringe `string[]` a `DecisionRole[]` senza nessun `as`.
 */
function canonical(values: readonly string[]): DecisionRole[] {
  return DECISION_ROLES.filter((role) => values.includes(role.value)).map((role) => role.value)
}

/**
 * I cinque ruoli si compongono e poi si confermano, come un campo corto (D21): cinque scritture
 * per cinque caselle sarebbero cinque giri di rete per una decisione sola.
 */
export function PersonRolesForm({ personId, roles }: { personId: string; roles: readonly string[] }) {
  const stored = canonical(roles)
  const [local, setLocal] = useState<DecisionRole[]>(stored)
  const { pending, error, clearError, write } = useWrite(UNREACHABLE)

  const dirty = local.join(',') !== stored.join(',')

  function toggle(role: DecisionRole, checked: boolean) {
    // L'errore parla della scelta di prima: lasciarlo acceso su un gruppo che si sta cambiando
    // vuol dire mettere del rosso su una cosa che non è più un errore.
    clearError()
    setLocal((current) => canonical(checked ? [...current, role] : current.filter((it) => it !== role)))
  }

  function save() {
    const formData = new FormData()

    formData.set('person_id', personId)
    for (const role of local) formData.append('decision_roles', role)

    const sent = local.join(',')

    write(
      () => updatePersonRoles({}, formData),
      (outcome) => {
        const saved = outcome.saved

        if (saved === undefined) return

        // Solo se nel frattempo non è stata toccata un'altra casella: riallineare comunque
        // porterebbe via la spunta messa durante l'attesa, che è la correzione più pesante
        // uscita dalla revisione della Story 1.4.
        setLocal((current) => (current.join(',') === sent ? saved : current))
      },
    )
  }

  return (
    <form
      className="field"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <fieldset className="field--group">
        <legend className="label">Nella decisione</legend>

        <div className="checks">
          {DECISION_ROLES.map((role) => (
            // La casella sta dentro la label: la casella nativa è alta 16px, e senza
            // l'etichetta intorno il bersaglio tattile non c'è (design-system.md §8).
            <label className="check" key={role.value}>
              <input
                type="checkbox"
                checked={local.includes(role.value)}
                disabled={pending}
                onChange={(event) => toggle(role.value, event.target.checked)}
              />
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

      {dirty ? (
        <div className="field__actions">
          <button type="submit" className="btn btn--primary" aria-busy={pending}>
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          {/* `disabled` e non `aria-busy`, dalla revisione della 5.2: annullare non è un'azione in
              volo, e premuto durante la scrittura riporta le caselle ai ruoli vecchi mentre il
              server scrive quelli nuovi. */}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              clearError()
              setLocal(stored)
            }}
            disabled={pending}
          >
            Annulla
          </button>
        </div>
      ) : null}
    </form>
  )
}
