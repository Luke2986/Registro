'use server'

import { revalidatePath } from 'next/cache'

import { validateCallDate } from '@/lib/call-date'
import { todayIsoDate } from '@/lib/format-date'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * L'apertura di una scheda: la prima scrittura su assessments e su answers.
 *
 * File suo e non dentro actions.ts, che è già a 177 righe: le schede sono un'altra entità, e la
 * regola «un file d'azione porta una azione» è già dichiarata in question-update-actions.ts.
 *
 * **Una sola chiamata, e la scrittura sta nel database.** La riga della scheda e le N righe delle
 * risposte devono nascere insieme o non nascere: PostgREST non offre transazioni, e una scheda
 * con total_questions a 23 e zero risposte è irreparabile, perché total_questions non si aggiorna
 * mai (FR16). Il perché per esteso è in testa a 0013_open_assessment.sql.
 *
 * Nessuna pre-lettura del questionario qui: la duplicherebbe fra TypeScript e SQL, e le due
 * divergerebbero alla prima modifica.
 *
 * Nessun `redirect`: la schermata di compilazione è la Story 3.2 e non esiste ancora, e un
 * redirect verso una rotta che non c'è sarebbe un 404 al termine di un'azione riuscita. La scheda
 * compare nella card del cliente.
 */

const ASSESSMENT_NOT_OPENED = 'La scheda non è stata aperta. Riprova fra un momento.'

/**
 * Un messaggio per quattro precondizioni, ma con due rimedi, perché le quattro cause non si
 * riparano nello stesso modo: tre sono transitorie e la ricarica le mostra, mentre «nessuna
 * domanda attiva» è persistente e ricaricare non la tocca. Senza la seconda metà della frase, chi
 * ha disattivato tutte le domande legge un invito a ripetere una cosa che non riuscirà mai
 * (`kb-0.md` §6: l'errore dice cosa è successo e cosa fare).
 */
const ASSESSMENT_PRECONDITION =
  'La scheda non è stata aperta: il cliente o l’interlocutore non ci sono più, oppure il questionario non ha nessuna domanda attiva. Ricarica la pagina, o riattiva una domanda dal questionario.'

export type OpenAssessmentState = { error?: string }

export async function openAssessment(
  _previous: OpenAssessmentState,
  formData: FormData,
): Promise<OpenAssessmentState> {
  const session = await openSession('openAssessment')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')

  if (!isUuid(clientId)) {
    console.error('openAssessment: richiesta rifiutata')
    return { error: ASSESSMENT_NOT_OPENED }
  }

  // Due assenze diverse che portano allo stesso valore: `null` è il selettore che non è stato
  // reso affatto — il cliente non ha nessuna persona, cioè AC4 — e `''` è la prima opzione,
  // `Nessuno`. Nessuna delle due è un errore.
  const interviewee = formData.get('interviewee_id')
  const intervieweeId = interviewee === null || interviewee === '' ? null : interviewee

  // Presente ma non un uuid è una richiesta forgiata: il selettore offre solo le persone di
  // questo cliente. Che appartengano *a questo* cliente lo verifica la funzione, dove la domanda
  // si può fare in una query sola.
  if (intervieweeId !== null && !isUuid(intervieweeId)) {
    console.error('openAssessment: interlocutore rifiutato')
    return { error: ASSESSMENT_NOT_OPENED }
  }

  // `todayIsoDate()` gira qui, sul server, nel fuso dichiarato: è lo stesso valore che il modulo
  // ha ricevuto come prop, quindi il campo svuotato torna esattamente al giorno che proponeva.
  const callDate = validateCallDate(formData.get('call_date'), todayIsoDate())

  if (!callDate.ok) return { error: callDate.message }

  // Senza interlocutore il parametro non si passa affatto, e la funzione usa il suo `default
  // null`: è l'unico modo di dire «nessuno» a un parametro che i tipi generati dichiarano
  // facoltativo e non nullo. Un `as` per farci stare un `null` sarebbe vietato (kb-0.md §2).
  const { data, error } = await session.supabase.rpc('open_assessment', {
    p_client_id: clientId,
    p_call_date: callDate.date,
    ...(intervieweeId === null ? {} : { p_interviewee_id: intervieweeId }),
  })

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe le righe, cioè il testo delle domande, che è
    // testo scritto da una persona (kb-0.md §3).
    console.error('openAssessment: apertura rifiutata', { code: error.code, message: error.message })
    return { error: ASSESSMENT_NOT_OPENED }
  }

  // La funzione risponde null quando una precondizione non c'è: cliente sparito o non mio,
  // interlocutore di un altro cliente, nessun questionario attivo, nessuna domanda attiva. Non è
  // un guasto, ed è l'unica differenza fra «riprova» e «ricarica».
  if (data === null) return { error: ASSESSMENT_PRECONDITION }

  revalidatePath(`/clienti/${clientId}`)

  // Il secondo non è un di più: dalla Story 1.6 l'ordine dell'elenco dipende anche da
  // assessments.updated_at (last-activity.ts, database.md §5). Senza, si apre una scheda e il
  // cliente resta dov'era. È la voce a ledger della revisione della 1.6, e questa è la prima
  // scrittura che la rende esigibile.
  revalidatePath('/clienti')

  return {}
}
