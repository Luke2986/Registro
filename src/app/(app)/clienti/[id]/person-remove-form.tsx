'use client'

import { useEffect, useRef, useState } from 'react'

import { personDisplayName } from '@/lib/person-fields'
import { useWrite } from '@/lib/use-write'

import { deletePerson } from '../people-actions'

const UNREACHABLE = 'La persona non è stata eliminata: il server non ha risposto. Riprova fra un momento.'

/**
 * `Elimina` in due tempi, dentro la riga stessa. Nessuna finestra modale: il progetto non ne ha
 * una e introdurla è un pezzo di interfaccia che nessuna AC chiede.
 *
 * La conferma è obbligatoria e non è la stessa scelta dei tag: togliere un tag è reversibile in
 * due secondi, eliminare una persona no (kb-0.md §6). Il verbo cambia apposta — `Togli` per un
 * tag, `Elimina` per una persona — e resta lo stesso dal pulsante alla conferma.
 *
 * I due tempi scambiano un pulsante con due, quindi React smonta quello appena premuto e il
 * fuoco cadrebbe sul corpo della pagina: si sposta a mano, avanti sulla conferma e indietro su
 * `Annulla`. La domanda è legata alla conferma con `aria-describedby`, così chi non vede lo
 * schermo sente cosa sta per confermare invece di sentire solo «Elimina».
 */
export function PersonRemoveForm({
  person,
  onRemoved,
}: {
  person: { id: string; first_name: string | null; last_name: string | null }
  onRemoved: () => void
}) {
  const [asking, setAsking] = useState(false)
  const { pending, error, write } = useWrite(UNREACHABLE)

  const trigger = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const asked = useRef(false)

  const name = personDisplayName(person)
  const questionId = `elimina-${person.id}-domanda`

  useEffect(() => {
    if (asking) confirm.current?.focus()
    // Solo tornando indietro, mai al primo montaggio: rubare il fuoco a chi sta scrivendo in un
    // altro campo perché una persona è comparsa nell'elenco sarebbe peggio del difetto.
    else if (asked.current) trigger.current?.focus()

    asked.current = asking
  }, [asking])

  function remove() {
    const formData = new FormData()

    formData.set('person_id', person.id)

    // La riga sparisce insieme al pulsante appena premuto: chi riporta il fuoco è la card, che
    // resta montata.
    write(() => deletePerson({}, formData), onRemoved)
  }

  return (
    <div className="field">
      {/* La domanda sta sopra i due pulsanti e non accanto: a 375px, in fila, la riga non
          starebbe nella card e la pagina scorrerebbe di lato. */}
      {asking ? (
        <p className="meta" id={questionId}>
          Elimini {name}? Non si recupera.
        </p>
      ) : null}

      <div className="field__actions">
        {asking ? (
          <>
            <button
              ref={confirm}
              type="button"
              className="btn btn--danger"
              aria-describedby={questionId}
              onClick={remove}
              disabled={pending}
            >
              {pending ? 'Eliminazione…' : 'Elimina'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setAsking(false)}
              disabled={pending}
            >
              Annulla
            </button>
          </>
        ) : (
          // Con tre persone sulla scheda, tre pulsanti che si chiamano tutti «Elimina» non si
          // distinguono da un lettore di schermo. Stesso precedente di `Togli il tag ${tag}`.
          <button
            ref={trigger}
            type="button"
            className="btn btn--danger"
            aria-label={`Elimina ${name}`}
            onClick={() => setAsking(true)}
          >
            Elimina
          </button>
        )}
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
