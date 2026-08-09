import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { groupAnswersByBlock } from '@/lib/answer-groups'
import { formatCallDate } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'

import { AnswerBlocks } from './answer-blocks'

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
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('id, client_id, call_date, clients(name)')
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
        <>
          {/* **Questa riga sparisce con la Story 3.3**, quando il salvataggio arriva davvero: da
              lì in poi sarebbe una bugia. Finché non c'è, va detto a schermo e non solo nel file
              della story — «il lavoro dell'utente non si perde mai» è una regola non negoziabile
              (AGENTS.md, kb-0.md §6), e una schermata che accetta ventiquattro campi e li getta
              alla ricarica senza dirlo è indistinguibile da una che salva.
              È un avviso e non un errore: non usa `--bad`, non impedisce niente, e non porta
              `role="alert"` perché non annuncia un fatto appena successo — c'è dall'inizio e si
              legge nell'ordine. Il margine è in linea e non una classe: una regola in
              `globals.css` sopravviverebbe alla riga che descrive, e resterebbe morta. */}
          <p className="warn-box" style={{ margin: '0 0 24px' }}>
            Qui ancora non si salva: quello che scrivi resta finché non ricarichi la pagina.
          </p>
          <AnswerBlocks groups={groupAnswersByBlock(answers)} />
        </>
      )}
    </>
  )
}

/**
 * Il nome del cliente è il ritorno indietro, non un titolo: la pagina è la scheda, il cliente è
 * da dove si viene. Il titolo è `Prequalifica` e la data della call gli sta accanto.
 */
function AssessmentHeader({
  clientId,
  clientName,
  callDate,
}: {
  clientId: string
  clientName?: string
  callDate?: string
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
