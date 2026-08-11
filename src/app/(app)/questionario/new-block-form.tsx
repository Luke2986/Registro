'use client'

import { useEffect, useRef, useState } from 'react'

import { useWrite } from '@/lib/use-write'

import { createBlock } from './actions'

const UNREACHABLE = 'Il blocco non è stato salvato: il server non ha risposto. Riprova fra un momento.'

/**
 * Il pulsante `Aggiungi blocco` e, quando è premuto, il modulo al suo posto. Un solo campo:
 * la posizione non si chiede e non si mostra, la calcola il server — un campo per la posizione
 * sarebbe la Story 2.5 costruita in anticipo e lasciata a metà.
 *
 * Passa da `useWrite` e non da `useActionState`: un rifiuto della promessa risalirebbe al
 * confine d'errore, che sostituisce l'intera schermata. `element.reset()` solo dopo un
 * successo, così un titolo rifiutato resta dov'è insieme al suo errore.
 */
export function NewBlockForm({ questionnaireId }: { questionnaireId: string }) {
  const [adding, setAdding] = useState(false)
  const [returning, setReturning] = useState(false)

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
    // L'errore parla del tentativo abbandonato: riaprendo il modulo non deve esserci già rosso.
    clearError()
  }

  if (!adding) {
    return (
      <button type="button" ref={addButton} className="btn btn--secondary" onClick={() => setAdding(true)}>
        Aggiungi blocco
      </button>
    )
  }

  return (
    <form
      className="field"
      onSubmit={(event) => {
        event.preventDefault()

        // Letto qui, mentre l'evento è ancora in corso: dopo, `currentTarget` è nullo.
        const element = event.currentTarget
        const formData = new FormData(element)

        formData.set('questionnaire_id', questionnaireId)

        write(
          () => createBlock({}, formData),
          () => {
            element.reset()
            close()
          },
        )
      }}
    >
      <label className="label" htmlFor="nuovo-blocco-titolo">
        Titolo del blocco
      </label>

      {/* autoFocus: il pulsante che ha aperto il modulo non c'è più. Nessun maxLength: il
          limite lo dice il server, con il messaggio che spiega cosa fare. */}
      <input
        id="nuovo-blocco-titolo"
        name="title"
        className="input"
        type="text"
        autoComplete="off"
        autoFocus
        disabled={pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'nuovo-blocco-titolo-errore' : undefined}
      />

      {error ? (
        <p className="field__error" role="alert" id="nuovo-blocco-titolo-errore">
          {error}
        </p>
      ) : null}

      {/* Qui `Salva` è primario: dentro il modulo è l'unica azione. */}
      <div className="field__actions">
        <button type="submit" className="btn btn--primary" aria-busy={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        {/* `disabled` e non `aria-busy`, dalla revisione della 5.2: annullare non è un'azione in
            volo, e premuto durante la scrittura smonta il modulo senza fermarla. */}
        <button type="button" className="btn btn--secondary" disabled={pending} onClick={close}>
          Annulla
        </button>
      </div>
    </form>
  )
}
