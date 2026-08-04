'use client'

import { useCallback } from 'react'

import { SaveIndicator } from '@/components/save-indicator'
import type { PersonField } from '@/lib/person-fields'
import { useEditableField } from '@/lib/use-editable-field'

import { updatePersonField } from '../person-edit-actions'

/**
 * Un campo modificabile di una persona. Usa useEditableField, che è esattamente il caso per cui
 * quel file esiste: cambia chi lo pilota, non com'è fatto.
 *
 * Più corto di client-field-form.tsx e non una sua variante: qui i campi sono sei e si
 * comportano tutti allo stesso modo. Nessun nome con le sue tre regole, nessun avviso di
 * doppione, nessun selettore di stato.
 */
export function PersonFieldForm({
  personId,
  field,
  value,
}: {
  personId: string
  field: PersonField
  value: string | null
}) {
  const long = field.kind === 'long'

  // L'id porta dentro l'id della persona: con tre persone sulla stessa pagina, la convenzione
  // della scheda cliente (`campo-${key}`) produrrebbe tre etichette che puntano allo stesso
  // controllo, cioè un'etichetta rotta per due persone su tre.
  const id = `persona-${personId}-${field.key}`

  const run = useCallback(
    (next: string) => {
      const formData = new FormData()

      formData.set('person_id', personId)
      formData.set('field', field.key)
      formData.set('value', next)

      return updatePersonField({}, formData)
    },
    [personId, field.key],
  )

  // Solo il campo lungo si salva da solo; i cinque corti si confermano, perché sono a una
  // battuta dalla fine e la conferma rende la scrittura intenzionale (D21).
  const state = useEditableField({ run, baseline: value ?? '', autosave: long })

  // Col mouse il fuoco non si sposta affatto sul pulsante, così il campo non ha nemmeno modo di
  // credere di essere stato lasciato. Senza, su Safari, Firefox e iPad il blur arriva con
  // `relatedTarget` a null, la guardia di useEditableField non regge e `Annulla` salva il testo
  // che doveva buttare via. Da tastiera ci pensa il controllo su `relatedTarget`.
  const keepFocus = long ? (event: { preventDefault: () => void }) => event.preventDefault() : undefined

  return (
    <form
      className={`field${long ? ' field--wide' : ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        state.save()
      }}
    >
      <label className="label" htmlFor={id}>
        {field.label}
      </label>

      {long ? (
        <textarea id={id} className="input input--long" rows={3} autoComplete="off" {...state.control} />
      ) : (
        // type="text" e non type="email": il browser rifiuterebbe con parole sue un'email
        // scritta a metà durante una call. inputMode dà comunque la tastiera giusta sul tablet.
        <input
          id={id}
          className="input"
          type="text"
          inputMode={field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : undefined}
          autoComplete="off"
          {...state.control}
        />
      )}

      {state.result.error ? (
        <p className="field__error" role="alert">
          {state.result.error}
        </p>
      ) : null}

      {/* Compaiono solo quando il campo è cambiato: a riposo la scheda si legge, non si compila. */}
      {state.dirty ? (
        <div className="field__actions">
          <button type="submit" className="btn btn--primary" disabled={state.pending} onMouseDown={keepFocus}>
            {state.pending ? 'Salvataggio…' : 'Salva'}
          </button>
          {/* Non si disabilita durante la scrittura, come in client-field-form.tsx: riportare il
              campo a com'era è reversibile, e un `Annulla` spento mentre un salvataggio è in
              volo è un pulsante che non risponde proprio quando lo si preme. */}
          <button type="button" className="btn btn--secondary" onClick={state.cancel} onMouseDown={keepFocus}>
            Annulla
          </button>
        </div>
      ) : null}

      {/* L'indicatore appartiene ai campi che si salvano da soli, e qui è solo quello lungo (D21). */}
      {long ? <SaveIndicator state={state.saveState} onRetry={state.save} /> : null}
    </form>
  )
}
