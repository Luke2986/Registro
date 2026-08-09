'use client'

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
 * del pulsante, e non c'è nessun campo da riallineare. Il costo noto — durante il volo il
 * pulsante si spegne e il fuoco cade sul body — è la famiglia di quirk già rimandata alla
 * Story 5.2, annotata nel ledger.
 */
export function QuestionActiveButton({
  questionId,
  isActive,
}: {
  questionId: string
  isActive: boolean
}) {
  const { pending, error, write } = useWrite(
    isActive ? QUESTION_NOT_DEACTIVATED : QUESTION_NOT_REACTIVATED,
  )

  const submit = () => {
    const payload = new FormData()
    payload.set('question_id', questionId)
    // Lo stato di destinazione, esplicito: l'opposto di quello che si vede a schermo.
    payload.set('active', isActive ? 'false' : 'true')

    write(() => setQuestionActive({}, payload))
  }

  return (
    <>
      <button type="button" className="btn btn--quiet" disabled={pending} onClick={submit}>
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
