'use client'

import { useEffect, useRef, useState } from 'react'

import { useWrite } from '@/lib/use-write'

import { deleteBlock, deleteQuestion } from './delete-actions'

const BLOCK_UNREACHABLE = 'Il blocco non è stato eliminato: il server non ha risposto. Riprova fra un momento.'
const QUESTION_UNREACHABLE = 'La domanda non è stata eliminata: il server non ha risposto. Riprova fra un momento.'

/**
 * `Elimina` in due tempi, uguale per blocchi e domande, e uguale a quello delle persone: nessuna
 * finestra modale, la conferma sostituisce il pulsante dentro la riga stessa. La conferma è
 * obbligatoria perché la cancellazione non si annulla (kb-0.md §6) — è l'opposto di `Disattiva`,
 * che `Riattiva` rimette identica e che infatti non ne chiede.
 *
 * Sceglie per `kind` come MoveButtons, e per lo stesso motivo: un callback costruito nel Server
 * Component non sarebbe serializzabile.
 *
 * I due tempi scambiano un pulsante con due, quindi React smonta quello appena premuto e il
 * fuoco cadrebbe sul corpo della pagina: si sposta a mano, avanti sulla conferma e indietro su
 * `Annulla`. La domanda è legata alla conferma con `aria-describedby`, così chi non vede lo
 * schermo sente cosa sta per confermare invece di sentire solo «Elimina».
 *
 * Niente onSuccess: la riga sparisce con la rivalidazione, e il componente con lei.
 */
export function DeleteButton({
  kind,
  id,
  label,
}: {
  kind: 'block' | 'question'
  id: string
  /** Quello che sta per sparire, detto com'è a schermo: con 23 pulsanti che si chiamano tutti
      `Elimina`, un lettore di schermo non ne distinguerebbe uno dall'altro. */
  label: string
}) {
  const [asking, setAsking] = useState(false)
  const { pending, error, write } = useWrite(
    kind === 'block' ? BLOCK_UNREACHABLE : QUESTION_UNREACHABLE,
  )

  const trigger = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const asked = useRef(false)

  const questionId = `elimina-${id}-domanda`
  const what = kind === 'block' ? 'il blocco' : 'la domanda'
  const name = `Elimina ${what} ${label}`

  useEffect(() => {
    if (asking) confirm.current?.focus()
    // Solo tornando indietro, mai al primo montaggio: rubare il fuoco a chi sta scrivendo
    // altrove perché una riga è comparsa sarebbe peggio del difetto.
    else if (asked.current) trigger.current?.focus()

    asked.current = asking
  }, [asking])

  const remove = () => {
    const payload = new FormData()

    if (kind === 'block') {
      payload.set('block_id', id)
      write(() => deleteBlock({}, payload))
      return
    }

    payload.set('question_id', id)
    write(() => deleteQuestion({}, payload))
  }

  if (!asking) {
    return (
      <>
        <button
          type="button"
          ref={trigger}
          className="btn btn--danger"
          aria-label={name}
          onClick={() => setAsking(true)}
        >
          Elimina
        </button>
        {/* L'errore resta leggibile dopo che la conferma è sparita: `in_use` è la risposta che
            spiega perché il pulsante c'era e non ha funzionato. */}
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <>
      {/* Il testo della cosa non entra nella frase, e non è per brevità: quasi ogni domanda
          finisce già con `?`, e inlinearla dava «…dividete il lavoro?? Non si recupera.». Chi
          non vede lo schermo non perde niente, perché l'identità sta nel nome accessibile dei
          due pulsanti, che è lo stesso prima e dopo la conferma. */}
      <p className="meta" id={questionId}>
        Elimini {what}? Non si recupera.
      </p>
      <button
        type="button"
        ref={confirm}
        className="btn btn--danger"
        aria-label={name}
        aria-describedby={questionId}
        disabled={pending}
        onClick={remove}
      >
        {pending ? 'Eliminazione…' : 'Elimina'}
      </button>
      <button
        type="button"
        className="btn btn--secondary"
        disabled={pending}
        onClick={() => setAsking(false)}
      >
        Annulla
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
