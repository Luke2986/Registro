import { NextResponse, type NextRequest } from 'next/server'

import { assessmentMarkdown } from '@/lib/assessment-markdown'
import { normalizeTextValue } from '@/lib/client-fields'
import { assessmentFileName } from '@/lib/export-filename'
import { personDisplayName } from '@/lib/person-fields'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'

/**
 * L'esportazione di una scheda in markdown.
 *
 * **Un Route Handler e non una server action:** AC2 chiede un *nome di file*, e quello lo decide
 * `Content-Disposition`, che solo una risposta HTTP può portare.
 *
 * Nessun `Content-Disposition` sui rami d'errore, o il browser scaricherebbe un file che contiene
 * un messaggio d'errore.
 */

const EXPORT_FAILED = 'L’esportazione non è riuscita. Riprova fra un momento.'
const NOT_FOUND = 'Questa scheda non esiste.'
const NO_SESSION = 'Non sei più collegato. Accedi e riprova.'

function plain(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/**
 * Senza né nome né cognome la riga non compare: `personDisplayName` risponderebbe `Persona senza
 * nome`, cioè una frase scritta dal software dentro un documento che porta la firma di Luca.
 */
function intervieweeName(person: { first_name: string | null; last_name: string | null } | null): string | null {
  if (person === null) return null
  if (normalizeTextValue(person.first_name) === null && normalizeTextValue(person.last_name) === null) return null

  return personDisplayName(person)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assessmentId: string }> },
) {
  const { id, assessmentId } = await params

  // Una colonna uuid fa rifiutare la query da Postgres su una stringa di altra forma, e un
  // indirizzo storpiato è una scheda che non c'è.
  if (!isUuid(id) || !isUuid(assessmentId)) return plain(NOT_FOUND, 404)

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Sessione assente e servizio irraggiungibile arrivano qui allo stesso modo: solo il primo vuol
  // dire «sei fuori». Nessun redirect: chi non ha sessione lo ferma il proxy prima di arrivare qui.
  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error('AssessmentExport: auth non raggiungibile', { status: authError.status })
    return plain(EXPORT_FAILED, 500)
  }

  if (!user) return plain(NO_SESSION, 401)

  // `.eq('client_id', id)` è correttezza e non sicurezza — la policy filtra comunque per
  // proprietario — ma rende un indirizzo cucito a mano un 404 invece di un file che mente sul
  // contesto. `maybeSingle` perché «non esiste» e «non si è caricato» chiedono due risposte diverse.
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select(
      'call_date, verdict, verdict_reason, condition_text, verify_by, next_step, clients(name), people(first_name, last_name)',
    )
    .eq('id', assessmentId)
    .eq('client_id', id)
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe i valori delle righe (kb-0.md §3).
    console.error('AssessmentExport: scheda non letta', { code: error.code, message: error.message })
    return plain(EXPORT_FAILED, 500)
  }

  if (!assessment) return plain(NOT_FOUND, 404)

  // Gli stessi due `.order` della schermata di compilazione, e devono restare gli stessi:
  // `answers.position` non è unica, quindi su una colonna sola l'ordine a parità di valore non è
  // definito e il file elencherebbe le domande in un ordine diverso dallo schermo.
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('block_title, question_text, content')
    .eq('assessment_id', assessmentId)
    .order('position')
    .order('id')

  // Un 500 e non un file con meno domande dentro, al contrario della pagina sorella che rende la
  // schermata con l'elenco vuoto: una schermata può essere parziale, un documento no.
  if (answersError || answers === null) {
    console.error('AssessmentExport: risposte non lette', {
      code: answersError?.code,
      message: answersError?.message,
    })
    return plain(EXPORT_FAILED, 500)
  }

  const clientName = assessment.clients.name

  const document = assessmentMarkdown({
    clientName,
    callDate: assessment.call_date,
    intervieweeName: intervieweeName(assessment.people),
    answers,
    verdict: {
      verdict: assessment.verdict,
      verdict_reason: assessment.verdict_reason,
      condition_text: assessment.condition_text,
      verify_by: assessment.verify_by,
      next_step: assessment.next_step,
    },
  })

  return new NextResponse(document, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Nessuna codifica RFC 5987: il nome è ASCII per costruzione, conseguenza della lista di
      // ammessi e non una scorciatoia.
      'Content-Disposition': `attachment; filename="${assessmentFileName(clientName, assessment.call_date)}"`,
      // Il documento porta il testo integrale delle risposte (kb-0.md §4).
      'Cache-Control': 'no-store',
    },
  })
}
