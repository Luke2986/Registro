'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { ErrorState } from '@/components/error-state'
import { formatCallDate } from '@/lib/format-date'
import { personDisplayName } from '@/lib/person-fields'
import type { AssessmentSummary, PersonDetail } from '@/lib/types'

import { NewAssessmentForm } from './new-assessment-form'

/**
 * La card delle schede di prequalifica, con i suoi quattro stati: l'elenco, lo stato vuoto che
 * dice cosa manca e il pulsante che lo riempie, lo scheletro (in loading.tsx) e l'errore. È la
 * card delle persone con altri contenuti, ritorno di fuoco sul titolo compreso: i due pulsanti —
 * quello dell'intestazione e quello dello stato vuoto — non sono mai montati insieme, e il titolo
 * invece c'è in ogni stato.
 *
 * `assessments` a `null` vuol dire che la lettura è fallita: va in errore solo questa card, e il
 * resto della scheda continua a funzionare. Un elenco vuoto invece è un cliente su cui non si è
 * ancora fatta nessuna call, che è normale.
 *
 * **La riga porta data e interlocutore, e basta.** Nessuna pillola di verdetto (Story 3.5 e 4.2),
 * nessun contatore e nessuna barra (Story 4.1), nessuno stato di compilazione: oggi vale `bozza`
 * per tutte, e un dato che non varia non informa.
 *
 * Il collegamento sta **sulla data** e non su tutta la riga: la riga porta anche il nome
 * dell'interlocutore, che non è un bersaglio, e l'alone del fuoco su una riga intera è un'altra
 * decisione. La data è anche il nome accessibile del collegamento, ed è l'informazione che
 * distingue davvero due schede dello stesso cliente.
 */
export function AssessmentsCard({
  clientId,
  assessments,
  people,
  today,
}: {
  clientId: string
  assessments: AssessmentSummary[] | null
  people: PersonDetail[] | null
  today: string
}) {
  const [opening, setOpening] = useState(false)
  const [returning, setReturning] = useState(false)

  const heading = useRef<HTMLHeadingElement>(null)

  const count = assessments?.length ?? 0

  // Il nome dell'interlocutore si risolve in memoria dall'elenco che la pagina ha già letto per
  // il selettore: nessuna seconda query e nessun innesto.
  //
  // Resta `null` quando la lettura delle persone è fallita, e non diventa una mappa vuota: un nome
  // che manca perché non si è caricato non è un nome che manca perché non c'è, e collassare i due
  // casi renderebbe ogni scheda *con* interlocutore come una scheda senza.
  const names =
    people === null ? null : new Map(people.map((person) => [person.id, personDisplayName(person)]))

  useEffect(() => {
    if (!returning) return

    setReturning(false)
    heading.current?.focus()
  }, [returning])

  function close() {
    setOpening(false)
    setReturning(true)
  }

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title" ref={heading} tabIndex={-1}>
          Schede
        </h2>

        {count > 0 ? <span className="badge data">{count}</span> : null}

        {count > 0 && !opening ? (
          <button type="button" className="btn btn--secondary" onClick={() => setOpening(true)}>
            Nuova scheda
          </button>
        ) : null}
      </div>

      {assessments === null ? (
        <ErrorState
          message="Le schede non si sono caricate. Riprova fra un momento."
          retryHref={`/clienti/${clientId}`}
        />
      ) : null}

      {/* Sparisce mentre il modulo è aperto: «Nessuna scheda ancora.» sopra una scheda che si sta
          aprendo dice il contrario di quello che sta succedendo, e il suo pulsante sarebbe il
          secondo identico a dieci pixel di distanza. */}
      {assessments !== null && count === 0 && !opening ? (
        <div className="empty">
          <p style={{ margin: 0 }}>Nessuna scheda ancora.</p>
          <button type="button" className="btn btn--secondary" onClick={() => setOpening(true)}>
            Nuova scheda
          </button>
        </div>
      ) : null}

      {count > 0 ? (
        <ul className="assessments">
          {assessments?.map((assessment) => {
            const interviewee = assessment.interviewee_id

            // Interlocutore assente o non risolvibile: la riga porta la sola data, mai un trattino
            // e mai «nessuno». Un valore non rilevato si mostra vuoto (D13).
            const name = interviewee === null || names === null ? undefined : names.get(interviewee)

            // C'è un interlocutore e non sappiamo come si chiama: qui il vuoto direbbe il falso.
            const unnamed = interviewee !== null && names === null

            return (
              <li className="assessment" key={assessment.id}>
                <Link
                  href={`/clienti/${clientId}/schede/${assessment.id}`}
                  className="data assessment__link"
                >
                  {formatCallDate(assessment.call_date)}
                </Link>
                {name === undefined ? null : <span className="meta">{name}</span>}
                {unnamed ? <span className="meta">Interlocutore non caricato</span> : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {/* In fondo alla card, sotto l'elenco, da qualunque dei due pulsanti sia stato aperto: è il
          posto in cui la scheda nuova comparirà. */}
      {opening ? (
        <NewAssessmentForm
          clientId={clientId}
          people={people}
          today={today}
          onOpened={close}
          onCancel={close}
        />
      ) : null}
    </div>
  )
}
