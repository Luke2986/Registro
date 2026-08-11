'use client'

import { useWrite } from '@/lib/use-write'

import { moveBlock, moveQuestion } from './move-actions'

const BLOCK_NOT_MOVED = 'Il blocco non è stato spostato. Riprova fra un momento.'
const QUESTION_NOT_MOVED = 'La domanda non è stata spostata. Riprova fra un momento.'

const ARROW = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/**
 * Le due frecce di riordino, uguali per blocchi e domande: `Sposta su` e `Sposta giù` dicono
 * cosa succede (UX-DR13), e sono `btn--quiet` come `Rinomina` e `Modifica` — azioni terziarie,
 * fino a 62 istanze sulla pagina.
 *
 * **Le parole sono diventate icone l'11 agosto 2026**, e la frase qui sopra regge lo stesso: la
 * parola non è sparita, si è spostata dove serve. Resta come nome accessibile — quello che sente
 * chi non vede lo schermo — e come `title`, cioè il suggerimento del passaggio del mouse. Sono
 * diventate icone perché due etichette lunghe occupavano da sole metà della fila di comandi per
 * l'azione che si usa meno, ed è la stessa ragione per cui esistono le due modalità: una freccia
 * disegnata dice «su» meglio di come lo dica la parola «su».
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
      {/* Le due icone stanno in un contenitore loro, staccate di 2 invece che di 8: sono un
          comando solo con due direzioni, e a distanza piena sembrerebbero due comandi diversi. */}
      <div className="move">
        <button
          type="button"
          className="btn btn--quiet btn--icon"
          disabled={pending || isFirst}
          aria-label="Sposta su"
          title="Sposta su"
          onClick={() => move('up')}
        >
          <svg {...ARROW}>
            <path d="M12 19V6M6 12l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          className="btn btn--quiet btn--icon"
          disabled={pending || isLast}
          aria-label="Sposta giù"
          title="Sposta giù"
          onClick={() => move('down')}
        >
          <svg {...ARROW}>
            <path d="M12 5v13M6 12l6 6 6-6" />
          </svg>
        </button>
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
