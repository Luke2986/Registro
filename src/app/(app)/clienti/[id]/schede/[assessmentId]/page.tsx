import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { groupAnswersByBlock } from '@/lib/answer-groups'
import { formatCallDate } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'

import { AnswerBlocks } from './answer-blocks'
import { CompletionButton } from './completion-button'
import { SaveBoundary } from './save-boundary'
import { VerdictCard } from './verdict-card'

/**
 * Le colonne di AnswerDetail, e sono esattamente quelle che la schermata rende. `position` si
 * chiede solo come chiave d'ordine — v. sotto — e non entra nel tipo.
 */
const ANSWER_COLUMNS = 'id, block_title, question_text, help_text, answer_type, options, content'

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>
}) {
  const { id, assessmentId } = await params

  // Stessa riga e stessa ragione della scheda cliente: una colonna uuid fa rifiutare la query da
  // Postgres su una stringa di altra forma, e un indirizzo storpiato è una scheda che non c'è,
  // non un guasto con il suo `Riprova` che ricarica un indirizzo impossibile.
  if (!isUuid(id) || !isUuid(assessmentId)) notFound()

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Sessione assente e servizio irraggiungibile arrivano qui allo stesso modo: solo il primo
  // caso vuol dire "sei fuori", e mandare a /accedi per un guasto transitorio è una bugia.
  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error('AssessmentPage: auth non raggiungibile', { status: authError.status })
    return <AssessmentError clientId={id} assessmentId={assessmentId} />
  }

  if (!user) redirect('/accedi')

  // `.eq('client_id', id)` è correttezza e non sicurezza — la policy filtra comunque per
  // proprietario — ma è quello che rende un indirizzo cucito a mano, con la scheda di un cliente
  // sotto un altro cliente, un 404 invece di una pagina che mente sul contesto.
  //
  // L'innesto `clients(name)` e non una seconda lettura: `assessments.client_id` è una chiave
  // esterna sola verso `clients`, quindi il percorso non è ambiguo. Serve al ritorno indietro,
  // che deve dire *su chi* si torna.
  //
  // maybeSingle e non single, come sulla scheda cliente: con single una riga assente sarebbe un
  // errore, e «non esiste» e «non si è caricato» chiedono due risposte diverse.
  //
  // Le cinque colonne del verdetto si leggono qui e non con una seconda lettura: sono sulla stessa
  // riga. Il tipo `AssessmentVerdict` le tiene allineate ai descrittori, quindi un campo aggiunto
  // all'elenco e dimenticato qui ferma il controllo dei tipi invece di arrivare vuoto a schermo.
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select(
      'id, client_id, call_date, completion_status, verdict, verdict_reason, condition_text, verify_by, next_step, clients(name)',
    )
    .eq('id', assessmentId)
    .eq('client_id', id)
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori della riga (kb-0.md §3).
    console.error('AssessmentPage: scheda non letta', { code: error.code, message: error.message })
    return <AssessmentError clientId={id} assessmentId={assessmentId} />
  }

  // Con la sicurezza a livello di riga attiva, la scheda di un altro proprietario arriva qui
  // identica a una inesistente, e la risposta giusta è la stessa.
  if (!assessment) notFound()

  // `.eq('assessment_id', assessmentId)` è correttezza e non sicurezza, come sopra: senza,
  // arriverebbero le risposte di tutte le schede.
  //
  // `.order('id')` dopo `position`: `answers.position` non è unica — `answers_assessment_position_idx`
  // è un indice normale — e un `order by` su una colonna sola non definisce nessun ordine a parità
  // di valore. `created_at` non servirebbe a niente qui, perché tutte le righe di una scheda
  // nascono nella stessa transazione e quindi con lo stesso valore.
  //
  // Nessun innesto su `questions` e nessuna lettura del questionario: tipo, opzioni e aiuto sono
  // copie dentro `answers` dalla 0015, ed è tutto il punto — una scheda vecchia non si rende col
  // questionario di oggi.
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select(ANSWER_COLUMNS)
    .eq('assessment_id', assessmentId)
    .order('position')
    .order('id')

  if (answersError) {
    console.error('AssessmentPage: risposte non lette', {
      code: answersError.code,
      message: answersError.message,
    })
  }

  return (
    <>
      {/* L'innesto arriva come oggetto e non come elenco, e non è nullabile: verificato sul tipo
          generato il 9 agosto 2026, `{ name: string }`. Nessun `?.` e nessun ripiego, che qui
          sarebbero un ramo morto. */}
      <AssessmentHeader
        clientId={id}
        clientName={assessment.clients.name}
        callDate={assessment.call_date}
        assessmentId={assessment.id}
        completionStatus={assessment.completion_status}
      />

      {answersError ? (
        <div className="card">
          <ErrorState
            message="Le risposte non si sono caricate. Riprova fra un momento."
            retryHref={`/clienti/${id}/schede/${assessmentId}`}
          />
        </div>
      ) : answers === null || answers.length === 0 ? (
        <div className="card">
          {/* Nessun pulsante, con la stessa ragione dello stato vuoto del questionario: non c'è
              niente che l'interfaccia possa fare per ripararla. Non è raggiungibile da qui —
              `open_assessment` solleva un'eccezione se scriverebbe zero righe (0014) — ma il ramo
              esiste lo stesso. */}
          <div className="empty">
            <p style={{ margin: 0 }}>Questa scheda non ha nessuna domanda.</p>
          </div>
        </div>
      ) : (
        /* Il confine è client e i blocchi no: restano un componente server passato come figli, e
           il contesto raggiunge lo stesso i campi, che sono client anche loro. La barra si rende
           solo qui, nello stato pieno: dove non c'è nessun campo non c'è niente da salvare e
           niente da dire, e un indicatore fermo su una schermata senza campi è la stessa bugia di
           un indicatore fermo su una schermata che non salva. */
        <SaveBoundary>
          <AnswerBlocks groups={groupAnswersByBlock(answers)} />
          {/* Dopo i blocchi e prima della barra, che è «arrivo in fondo» (AC1). Dentro il confine
              perché i suoi cinque campi si iscrivono allo stesso registro: la barra ne conta ora
              ventinove. `SaveBoundary` rende `{children}` e poi la barra, quindi due figli bastano
              e non c'è niente da toccare là dentro.
              Il ramo è quello pieno e resta l'unico, per decisione di Luca del 10 agosto 2026: se
              le risposte non si caricano, il rimedio è ricaricare, e scrivere un verdetto durante
              un guasto del database è la cosa che meno serve in quel momento. */}
          {/* Le cinque colonne si passano una per una e non riversando la riga intera: `assessment`
              porta anche `client_id`, `call_date` e il nome del cliente, che finirebbero nel
              payload del browser senza che la card ne renda nessuno. È il lavoro per cui
              `AssessmentVerdict` esiste, e passando la riga intera non lo fa. */}
          <VerdictCard
            assessmentId={assessment.id}
            verdict={{
              verdict: assessment.verdict,
              verdict_reason: assessment.verdict_reason,
              condition_text: assessment.condition_text,
              verify_by: assessment.verify_by,
              next_step: assessment.next_step,
            }}
          />
        </SaveBoundary>
      )}
    </>
  )
}

/**
 * Il nome del cliente è il ritorno indietro, non un titolo: la pagina è la scheda, il cliente è
 * da dove si viene. Il titolo è `Prequalifica` e la data della call gli sta accanto.
 *
 * **Lo stato di compilazione sta qui e non in fondo** (decisione di Luca del 10 agosto 2026): il
 * comando si preme una volta per scheda, lo stato si *legge* ogni volta che la si apre, e fra i due
 * è il secondo a decidere dove va la coppia. Accanto alla data sta anche accanto all'altra cosa che
 * dice *quale* scheda è, che è ciò che lo stato di compilazione è. In fondo si sarebbe visto solo
 * scorrendo, cioè quasi mai.
 *
 * Nello stato d'errore i due mancano insieme alla data, ed è giusto: la riga della scheda non si è
 * letta, quindi non si sa né che stato abbia né cosa scriverci.
 */
function AssessmentHeader({
  clientId,
  clientName,
  callDate,
  assessmentId,
  completionStatus,
}: {
  clientId: string
  clientName?: string
  callDate?: string
  assessmentId?: string
  completionStatus?: string
}) {
  return (
    <header className="page-header">
      {/* Ritorno e titolo in colonna: con tre figli diretti `.page-header` manderebbe il titolo in
          mezzo, e su ogni altra pagina il titolo è a filo sinistro.
          Senza il nome — succede solo nello stato d'errore, dove la scheda non si è letta — il
          collegamento nomina comunque la sua destinazione, che è vera: si torna al cliente. */}
      <div className="page-header__lead">
        <Link href={`/clienti/${clientId}`} className="meta back-link">
          ← {clientName ?? 'Cliente'}
        </Link>
        <h1 className="page-title">Prequalifica</h1>
      </div>
      {callDate === undefined ? null : (
        <div className="page-header__actions">
          <span className="data">{formatCallDate(callDate)}</span>
          {/* La parola c'è sempre, non solo quando la scheda è chiusa: è la stessa scelta di
              `question-item.tsx` col suo motivo — una parola che compare solo nel caso negativo non
              dice niente a chi non l'ha mai vista comparire, e il pulsante da solo nomina la
              destinazione, non lo stato. Nessun colore e nessuna pillola: lo stato di compilazione
              non è un esito, e l'unica cosa colorata satura di questa schermata è già la pillola del
              verdetto (UX-DR2, regola 5). */}
          {completionStatus === undefined || assessmentId === undefined ? null : (
            <>
              <span className="meta">{completionStatus}</span>
              <CompletionButton assessmentId={assessmentId} completionStatus={completionStatus} />
              {/* Un `<a>` e mai `<Link>`: una navigazione lato client non scarica niente, e il
                  comando sembrerebbe rotto senza dare nessun errore. Nessun `download`: nel ramo
                  d'errore trasformerebbe un messaggio in un file scaricato. */}
              <a href={`/clienti/${clientId}/schede/${assessmentId}/esporta`} className="btn btn--secondary">
                Esporta
              </a>
            </>
          )}
        </div>
      )}
    </header>
  )
}

function AssessmentError({ clientId, assessmentId }: { clientId: string; assessmentId: string }) {
  return (
    <>
      <AssessmentHeader clientId={clientId} />
      <div className="card">
        <ErrorState
          message="La scheda non si è caricata. Riprova fra un momento."
          retryHref={`/clienti/${clientId}/schede/${assessmentId}`}
        />
      </div>
    </>
  )
}
