'use client'

import { useEffect, useRef, useState } from 'react'

import { ErrorState } from '@/components/error-state'
import type { PersonDetail } from '@/lib/types'

import { NewPersonForm } from './new-person-form'
import { PersonBlock } from './person-block'

/**
 * La card delle persone, con i suoi quattro stati: l'elenco, lo stato vuoto che dice cosa manca
 * e il pulsante che lo riempie, lo scheletro (in loading.tsx) e l'errore.
 *
 * `people` a `null` vuol dire che la lettura è fallita: la card va in errore e l'anagrafica
 * sopra continua a funzionare. Un elenco vuoto invece è un cliente senza persone, che è normale.
 *
 * `Aggiungi persona` è secondario: l'azione primaria della schermata è il `Salva` che compare
 * quando qualcosa è cambiato (design-system.md §5).
 */
export function PeopleCard({ clientId, people }: { clientId: string; people: PersonDetail[] | null }) {
  const [adding, setAdding] = useState(false)
  const [returning, setReturning] = useState(false)

  /**
   * Il fuoco torna sul titolo della card e non sul pulsante che ha aperto il modulo, che è
   * quello che verrebbe naturale: i due pulsanti — quello dell'intestazione e quello dello stato
   * vuoto — non sono mai montati insieme, e proprio la prima persona di un cliente nuovo li fa
   * scambiare. Rimettere il fuoco su quello che sta per sparire vuol dire perderlo sul corpo
   * della pagina, che è il caso più frequente e non il caso limite. Il titolo invece c'è sempre,
   * in ogni stato della card, e un lettore di schermo annuncia dove si è tornati.
   */
  const heading = useRef<HTMLHeadingElement>(null)

  const count = people?.length ?? 0

  useEffect(() => {
    if (!returning) return

    setReturning(false)
    heading.current?.focus()
  }, [returning])

  function returnFocus() {
    setReturning(true)
  }

  function close() {
    setAdding(false)
    returnFocus()
  }

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title" ref={heading} tabIndex={-1}>
          Persone
        </h2>

        {/* Solo quando c'è almeno una persona: uno 0 accanto a un titolo dice soltanto che non
            c'è niente, e quello lo dice già lo stato vuoto. */}
        {count > 0 ? <span className="badge data">{count}</span> : null}

        {count > 0 && !adding ? (
          <button type="button" className="btn btn--secondary" onClick={() => setAdding(true)}>
            Aggiungi persona
          </button>
        ) : null}
      </div>

      {people === null ? (
        <ErrorState
          message="Le persone non si sono caricate. Riprova fra un momento."
          retryHref={`/clienti/${clientId}`}
        />
      ) : null}

      {/* Sparisce mentre il modulo è aperto: «Nessuna persona ancora.» sopra una persona che si
          sta scrivendo dice il contrario di quello che sta succedendo, e il suo pulsante
          sarebbe il secondo identico a dieci pixel di distanza. */}
      {people !== null && count === 0 && !adding ? (
        <div className="empty">
          <p style={{ margin: 0 }}>Nessuna persona ancora.</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAdding(true)}>
            Aggiungi persona
          </button>
        </div>
      ) : null}

      {count > 0 ? (
        <ul className="people">
          {/* Solo il fuoco, non `close`: eliminare una persona non deve chiudere il modulo di
              creazione aperto sotto, che porterebbe via quello che ci si sta scrivendo (NFR1). */}
          {people?.map((person) => <PersonBlock key={person.id} person={person} onRemoved={returnFocus} />)}
        </ul>
      ) : null}

      {/* In fondo alla card, sotto l'elenco, da qualunque dei due pulsanti sia stato aperto: è
          il posto in cui la persona nuova comparirà. */}
      {adding ? <NewPersonForm clientId={clientId} onSaved={close} onCancel={close} /> : null}
    </div>
  )
}
