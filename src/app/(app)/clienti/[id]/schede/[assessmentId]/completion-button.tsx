'use client'

import { useEffect } from 'react'

import { COMPLETION_CLOSED, nextCompletionStatus } from '@/lib/completion-status'
import { useWrite } from '@/lib/use-write'

import { setCompletionStatus } from '../../../completion-actions'

const ASSESSMENT_NOT_CLOSED = 'La scheda non è stata chiusa. Riprova fra un momento.'
const ASSESSMENT_NOT_REOPENED = 'La scheda non è stata riportata in bozza. Riprova fra un momento.'

/**
 * Un pulsante solo che alterna `Chiudi la scheda`/`Riporta in bozza`: l'etichetta nomina lo stato di
 * destinazione, cioè cosa succede premendo (UX-DR13), e l'azione si chiama allo stesso modo dal
 * pulsante al messaggio d'errore.
 *
 * **`Riporta in bozza` e non `Riapri`**, e non si ri-decide: in questo progetto «riaprire una
 * scheda» vuol già dire tornarci sopra col browser — è la lingua della Story 3.4 e delle sue AC — e
 * la stessa parola per due cose diverse sulla stessa schermata è un difetto che si scopre tardi.
 *
 * `btn--secondary` e non `btn--primary`: l'unica azione primaria di questa schermata è il `Salva`
 * della barra (UX-DR10), e non si diventa in due.
 *
 * **Nessuna conferma**, né prima di chiudere né prima di riportare in bozza: l'azione opposta la
 * annulla identica, e kb-0.md §6 è esplicito — nessuna conferma per azioni reversibili. Una conferma
 * protegge da una perdita, e qui non si perde niente per costruzione. Chiudere non blocca nessun
 * campo: è AC1, e si soddisfa non scrivendo niente.
 *
 * Il componente importa lui l'azione, come `QuestionActiveButton` e `MoveButtons`: un callback
 * costruito nel componente server non sarebbe serializzabile.
 *
 * Niente `onSuccess` e niente stato ottimistico: la rivalidazione fa girare la parola dello stato e
 * l'etichetta del pulsante, e non c'è nessun campo da riallineare. Durante il volo il pulsante non
 * si spegne più — `aria-busy` lo annuncia e lo lascia focalizzabile — e il secondo clic lo assorbe
 * `useWrite` (Story 5.2).
 *
 * **La riuscita si sente, non solo il fallimento (Story 5.2).** Il fallimento era già un
 * `role="alert"`; la riuscita non aveva niente, e l'unico segnale del nuovo stato era l'etichetta
 * di un pulsante e una parola nuda accanto. Ora quella parola è una zona `aria-live` in
 * `page.tsx` e questo pulsante la nomina con `aria-describedby`: chi non vede lo schermo sente
 * cosa è cambiato, e sa che è questo pulsante a cambiarla. Nessun testo nuovo a schermo — la
 * parola c'era già — è una relazione dichiarata.
 */
export function CompletionButton({
  assessmentId,
  completionStatus,
  statusId,
}: {
  assessmentId: string
  completionStatus: string
  /** L'elemento che porta la parola dello stato, in `page.tsx`: il pulsante lo nomina. */
  statusId: string
}) {
  // La proprietà resta `string` perché `AssessmentRow['completion_status']` è `string` nei tipi
  // generati dallo schema, e quei tipi non si modificano a mano.
  //
  // Un verso solo, e tutto ne discende: la destinazione la calcola un modulo puro sotto test, e
  // l'etichetta e il messaggio la nominano invece di ricalcolarla. Prima erano tre ternari sullo
  // stesso booleano, due orientati al contrario del terzo e nessuno raggiungibile da `npm test`:
  // invertirne uno chiudeva una scheda a chi aveva chiesto di riportarla in bozza.
  const next = nextCompletionStatus(completionStatus)
  const closing = next === COMPLETION_CLOSED

  const { pending, error, clearError, write } = useWrite(
    closing ? ASSESSMENT_NOT_CLOSED : ASSESSMENT_NOT_REOPENED,
  )

  // Lo stato è girato: l'errore parlava del tentativo di prima, e il messaggio nomina la
  // destinazione — «La scheda non è stata chiusa» resterebbe sotto un pulsante che ora dice
  // `Riporta in bozza`, cioè una frase falsa. Gemello di `QuestionActiveButton` (Story 5.2).
  useEffect(() => {
    clearError()
    // Solo al cambio di stato: `clearError` è una funzione nuova a ogni render — `useWrite` la
    // restituisce senza memoizzarla — e metterla fra le dipendenze farebbe girare l'effetto per
    // sempre. Corretto dalla revisione della 5.2: qui c'era scritto «è stabile», e il gemello
    // `QuestionActiveButton` diceva già il contrario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionStatus])

  const submit = () => {
    const payload = new FormData()
    payload.set('assessment_id', assessmentId)
    // Lo stato di destinazione, esplicito: il server non inverte niente, e due schede aperte che
    // premono insieme chiedono la stessa cosa invece di annullarsi a vicenda.
    payload.set('completion_status', next)

    write(() => setCompletionStatus({}, payload))
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--secondary"
        aria-busy={pending}
        aria-describedby={statusId}
        onClick={submit}
      >
        {closing ? 'Chiudi la scheda' : 'Riporta in bozza'}
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
