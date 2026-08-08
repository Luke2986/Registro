'use client'

import { useWrite } from '@/lib/use-write'

import { moveBlock, moveQuestion } from './move-actions'

const BLOCK_NOT_MOVED = 'Il blocco non è stato spostato. Riprova fra un momento.'
const QUESTION_NOT_MOVED = 'La domanda non è stata spostata. Riprova fra un momento.'

/**
 * Le due frecce di riordino, uguali per blocchi e domande: `Sposta su` e `Sposta giù` dicono
 * cosa succede (UX-DR13), e sono `btn--quiet` come `Rinomina` e `Modifica` — azioni terziarie,
 * fino a 62 istanze sulla pagina.
 *
 * Il componente importa lui le due azioni e sceglie per `kind`: un callback costruito nel
 * Server Component non sarebbe serializzabile, e passare l'azione come prop obbligherebbe ogni
 * chiamante a rifare il binding.
 *
 * Al bordo il pulsante è `disabled`: un comando che non farà niente non deve sembrare un
 * comando; il no-op della funzione resta come ultima difesa per la richiesta forgiata. Il
 * costo noto — l'elemento spostato fino al bordo spegne il pulsante appena premuto e il fuoco
 * cade sul body — è la famiglia di quirk già rimandata alla Story 5.2, annotata nel ledger.
 */
export function MoveButtons({
  kind,
  id,
  isFirst,
  isLast,
}: {
  kind: 'block' | 'question'
  id: string
  isFirst: boolean
  isLast: boolean
}) {
  const { pending, error, write } = useWrite(
    kind === 'block' ? BLOCK_NOT_MOVED : QUESTION_NOT_MOVED,
  )

  const move = (direction: 'up' | 'down') => {
    const payload = new FormData()
    payload.set('direction', direction)

    if (kind === 'block') {
      payload.set('block_id', id)
      write(() => moveBlock({}, payload))
      return
    }

    payload.set('question_id', id)
    write(() => moveQuestion({}, payload))
  }

  // Niente onSuccess: la rivalidazione di /questionario riordina la lista, e il pulsante
  // premuto si muove col suo elemento (React sposta il nodo con la sua chiave).
  return (
    <>
      <button
        type="button"
        className="btn btn--quiet"
        disabled={pending || isFirst}
        onClick={() => move('up')}
      >
        Sposta su
      </button>
      <button
        type="button"
        className="btn btn--quiet"
        disabled={pending || isLast}
        onClick={() => move('down')}
      >
        Sposta giù
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
