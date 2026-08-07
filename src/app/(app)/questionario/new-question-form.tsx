'use client'

import { useEffect, useRef, useState } from 'react'

import { ANSWER_TYPES, answerTypeLabel, isAnswerType, type AnswerType } from '@/lib/answer-types'
import { useWrite } from '@/lib/use-write'

import { createQuestion } from './question-actions'

const UNREACHABLE = 'La domanda non è stata salvata: il server non ha risposto. Riprova fra un momento.'

/**
 * Il pulsante `Aggiungi domanda` e, quando è premuto, il modulo al suo posto. La posizione non
 * si chiede e non si mostra, la calcola il server — un campo per la posizione sarebbe la
 * Story 2.5 costruita in anticipo.
 *
 * Il pulsante è quiet e non secondary: sono otto istanze, una per card, e otto pulsanti
 * bordati uno sotto l'altro pesano quanto il contenuto — lo stesso motivo per cui `Rinomina`
 * è quiet mentre `Aggiungi blocco`, che è uno solo, è secondary.
 *
 * Passa da `useWrite` e non da `useActionState`: un rifiuto della promessa risalirebbe al
 * confine d'errore, che sostituisce l'intera schermata. `element.reset()` solo dopo un
 * successo, così una domanda rifiutata resta dov'è insieme al suo errore.
 */
export function NewQuestionForm({ blockId }: { blockId: string }) {
  const [adding, setAdding] = useState(false)
  const [returning, setReturning] = useState(false)

  // Il tipo pilota il campo delle opzioni. Preselezionato `testo_lungo`: il default dello
  // schema e il tipo di 22 domande su 23.
  const [answerType, setAnswerType] = useState<AnswerType>('testo_lungo')

  // Anche le opzioni sono controllate, ed è protezione, non pilotaggio: il campo si smonta
  // quando il tipo lascia la scelta singola, e senza stato un tocco accidentale sul select
  // porterebbe via quello che c'era scritto (kb-0 §6; revisione 2.3, decisione di Luca).
  const [options, setOptions] = useState('')

  /** Alla chiusura il fuoco torna sul pulsante, che ricompare nello stesso posto. */
  const addButton = useRef<HTMLButtonElement>(null)

  const { pending, error, clearError, write } = useWrite(UNREACHABLE)

  useEffect(() => {
    if (!returning) return

    setReturning(false)
    addButton.current?.focus()
  }, [returning])

  function close() {
    setAdding(false)
    setReturning(true)
    setAnswerType('testo_lungo')
    // Controllato: element.reset() non lo tocca, si azzera qui.
    setOptions('')
    // L'errore parla del tentativo abbandonato: riaprendo il modulo non deve esserci già rosso.
    clearError()
  }

  // Gli id portano il blockId: il modulo esiste in otto istanze sulla stessa pagina.
  const textId = `nuova-domanda-${blockId}-testo`
  const helpId = `nuova-domanda-${blockId}-aiuto`
  const typeId = `nuova-domanda-${blockId}-tipo`
  const optionsId = `nuova-domanda-${blockId}-opzioni`

  if (!adding) {
    return (
      <button
        type="button"
        ref={addButton}
        className="btn btn--quiet block-add-question"
        onClick={() => setAdding(true)}
      >
        Aggiungi domanda
      </button>
    )
  }

  return (
    <form
      className="form block-add-question"
      onSubmit={(event) => {
        event.preventDefault()

        // Letto qui, mentre l'evento è ancora in corso: dopo, `currentTarget` è nullo.
        const element = event.currentTarget
        const formData = new FormData(element)

        formData.set('block_id', blockId)

        write(
          () => createQuestion({}, formData),
          () => {
            element.reset()
            close()
          },
        )
      }}
    >
      <div className="field">
        <label className="label" htmlFor={textId}>
          Testo della domanda
        </label>

        {/* autoFocus: il pulsante che ha aperto il modulo non c'è più. Una textarea e non un
            input: una domanda arriva a 119 caratteri già oggi, una riga sola la nasconderebbe.
            Nessun maxLength: il limite lo dice il server, con il messaggio che spiega cosa
            fare. */}
        <textarea id={textId} name="text" className="input input--long" autoComplete="off" autoFocus disabled={pending} />
      </div>

      <div className="field">
        {/* L'etichetta è questa e non «testo di aiuto»: è il nome con cui la cosa esiste nel
            metodo (D7, D19), e le etichette nominano le cose come le riconosce chi le usa. */}
        <label className="label" htmlFor={helpId}>
          Cosa serve capire
        </label>

        <textarea id={helpId} name="help_text" className="input input--long" autoComplete="off" disabled={pending} />
      </div>

      <div className="field">
        <label className="label" htmlFor={typeId}>
          Tipo di risposta
        </label>

        <select
          id={typeId}
          name="answer_type"
          className="input select"
          value={answerType}
          disabled={pending}
          onChange={(event) => {
            // La guardia e non un `as`: il valore di un select è string per il DOM, ma qui
            // può essere solo uno dei quattro, perché le option vengono da ANSWER_TYPES.
            const value = event.target.value

            if (isAnswerType(value)) {
              setAnswerType(value)
              // L'errore può parlare di un campo che col tipo nuovo non esiste più
              // (revisione 2.3): al prossimo salvataggio, se serve, ricompare.
              clearError()
            }
          }}
        >
          {ANSWER_TYPES.map((type) => (
            <option key={type} value={type}>
              {answerTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {/* Reso solo per la scelta singola: il campo compare e scompare con il tipo, ma il
          valore resta in stato e ricompare tornando sulla scelta singola. Quando è nascosto
          non manda niente al server, e comunque il server scrive null per gli altri tipi. */}
      {answerType === 'scelta_singola' ? (
        <div className="field">
          <label className="label" htmlFor={optionsId}>
            Opzioni, una per riga
          </label>

          <textarea
            id={optionsId}
            name="options"
            className="input input--long"
            autoComplete="off"
            disabled={pending}
            value={options}
            onChange={(event) => setOptions(event.target.value)}
          />
        </div>
      ) : null}

      {/* Un errore solo, sopra le azioni: con quattro campi non c'è un input solo a cui
          agganciare aria-describedby — il modello è new-person-form, non block-title-form. */}
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
        <button type="button" className="btn btn--secondary" disabled={pending} onClick={close}>
          Annulla
        </button>
      </div>
    </form>
  )
}
