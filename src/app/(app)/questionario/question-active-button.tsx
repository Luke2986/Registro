'use client'

import { useEffect } from 'react'

import { useWrite } from '@/lib/use-write'

import { setQuestionActive } from './question-active-actions'

const QUESTION_NOT_DEACTIVATED = 'La domanda non è stata disattivata. Riprova fra un momento.'
const QUESTION_NOT_REACTIVATED = 'La domanda non è stata riattivata. Riprova fra un momento.'

/**
 * Un pulsante solo che alterna `Disattiva`/`Riattiva`: l'etichetta dice cosa succede premendo
 * (UX-DR13), e l'azione si chiama allo stesso modo dal pulsante al messaggio d'errore.
 * `btn--quiet` come `Modifica` e le frecce: azione terziaria, fino a ventitré istanze.
 *
 * Nessuna conferma prima di disattivare: `Riattiva` la annulla identica, e kb-0.md §6 è
 * esplicito — nessuna conferma per azioni reversibili. La conferma protegge da una perdita;
 * qui non si perde niente per costruzione.
 *
 * Il componente importa lui l'azione, come MoveButtons: un callback costruito nel Server
 * Component non sarebbe serializzabile.
 *
 * Niente onSuccess: la rivalidazione fa girare la parola `attiva`/`non attiva` e l'etichetta
 * del pulsante, e non c'è nessun campo da riallineare. Durante il volo il pulsante non si spegne
 * più — `aria-busy` lo annuncia e lo lascia focalizzabile — e il secondo clic lo assorbe
 * `useWrite` (Story 5.2).
 */
export function QuestionActiveButton({
  questionId,
  questionText,
  isActive,
}: {
  questionId: string
  /** Solo per il nome accessibile: a schermo la domanda è già scritta accanto al pulsante. */
  questionText: string
  isActive: boolean
}) {
  const { pending, error, clearError, write } = useWrite(
    isActive ? QUESTION_NOT_DEACTIVATED : QUESTION_NOT_REACTIVATED,
  )

  // Questo pulsante non ha un campo di cui azzerare l'errore, quindi lo azzera sul cambio della
  // prop che l'azione muove: senza, un errore sopravvive alla rivalidazione e resta a schermo
  // finché non si ripreme. `clearError` fuori dalle dipendenze di proposito — è una funzione
  // nuova a ogni render, e metterla lì farebbe girare l'effetto per sempre.
  useEffect(() => {
    clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const submit = () => {
    const payload = new FormData()
    payload.set('question_id', questionId)
    // Lo stato di destinazione, esplicito: l'opposto di quello che si vede a schermo.
    payload.set('active', isActive ? 'false' : 'true')

    write(() => setQuestionActive({}, payload))
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--quiet"
        aria-busy={pending}
        aria-label={`${isActive ? 'Disattiva' : 'Riattiva'} la domanda «${questionText}»`}
        onClick={submit}
      >
        {isActive ? 'Disattiva' : 'Riattiva'}
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
