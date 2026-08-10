'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { ErrorState } from '@/components/error-state'
import { VerdictPill } from '@/components/verdict-pill'
import { progressFillPercent } from '@/lib/assessment-progress'
import { formatCallDate } from '@/lib/format-date'
import { personDisplayName } from '@/lib/person-fields'
import type { AssessmentListItem, PersonDetail } from '@/lib/types'

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
 * **La riga porta data, interlocutore, stato di compilazione, esito e avanzamento.** Lo stato è
 * entrato con la Story 3.6, il 10 agosto 2026, ed è la ragione per cui quella story esiste:
 * «dall'elenco distinguo quelle da riprendere da quelle chiuse». Prima valeva `bozza` per tutte e un
 * dato che non varia non informa; da quando esiste un comando che lo cambia, varia.
 *
 * L'esito e l'avanzamento sono entrati con la Story 4.1, lo stesso 10 agosto: sono le tre cose che
 * AC1 chiede insieme — «data, esito e avanzamento» — e vale la pena dire che qui c'era scritto il
 * contrario. Il commento diceva che la pillola di verdetto sarebbe arrivata con la 4.2 e che chi
 * implementa la 4.1 avrebbe dovuto aggiungere «due cose, non tre»: la 4.2 è l'esito **nell'elenco
 * clienti**, cioè un'altra schermata e un'altra query, e le cose da aggiungere erano tre.
 *
 * Restano fuori: l'esito nell'elenco clienti (4.2) e l'esportazione della scheda in markdown (4.3).
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
  assessments: AssessmentListItem[] | null
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
                {/* La parola c'è su ogni riga, non solo sulle chiuse: con una sola scheda chiusa
                    fra molte, una parola che compare solo nel caso negativo si legge come un
                    avviso invece che come uno stato. È la stessa forma e lo stesso motivo di
                    `question-item.tsx`. Nessun colore: lo stato di compilazione non è un esito.
                    In coda e non davanti alla data, che resta il collegamento e l'informazione
                    che distingue due schede dello stesso cliente. */}
                <span className="meta">{assessment.completion_status}</span>
                {/* Nessun ramo condizionale: `verdict` è `not null default 'non_deciso'`, quindi la
                    pillola c'è sempre — lo stesso motivo della parola dello stato qui sopra. La
                    pillola è quella della 3.5 e non se ne scrive una seconda. */}
                <VerdictPill verdict={assessment.verdict} />
                {/* Un solo figlio flex e non due: `.assessment` è `flex-wrap: wrap`, e contatore e
                    barra separati andrebbero a capo uno senza l'altro, lasciando il numero solo —
                    che è esattamente la coppia che UX-DR9 tiene insieme.

                    `aria-hidden` sulla barra e non un `role="progressbar"`: la barra **ripete** il
                    numero che il contatore dice accanto, e annunciarla vorrebbe dire far leggere
                    due volte la stessa cosa a chi non vede lo schermo.

                    Il nome sul contenitore è arrivato con la revisione della 4.1, e va detto perché
                    il commento qui sopra da solo non basta: il contatore dice `0 / 24`, cioè due
                    cifre nude, mentre lo stato di compilazione e l'esito accanto sono due parole.
                    Senza nome, l'avanzamento era l'unico dei tre dati della riga non comprensibile
                    a chi non vede lo schermo. `role="img"` e non un contenitore muto: su un elemento
                    generico `aria-label` non viene esposto, mentre qui rende la coppia atomica e
                    sostituisce le due cifre con la frase — che è quello che serve leggere. */}
                <span
                  className="progress"
                  role="img"
                  aria-label={`avanzamento: ${assessment.answered} risposte su ${assessment.total_questions}`}
                >
                  <span className="data">
                    {assessment.answered} / {assessment.total_questions}
                  </span>
                  <span className="progress__bar" aria-hidden="true">
                    <span
                      className="progress__fill"
                      style={{
                        width: `${progressFillPercent(assessment.answered, assessment.total_questions)}%`,
                      }}
                    />
                  </span>
                </span>
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
