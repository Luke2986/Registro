'use server'

import { revalidatePath } from 'next/cache'

import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * L'unica scrittura di questa story: una domanda si spegne o si riaccende. Una colonna sola,
 * `is_active`, mai una cancellazione (FR13): le risposte già raccolte restano leggibili per
 * costruzione, perché ogni risposta porta la propria copia del testo (database.md §3).
 *
 * File suo e non dentro question-update-actions.ts: quel file dichiara «un file d'azione porta
 * una azione», e le due scritture non sono gemelle — una valida quattro campi con tre
 * validatori, l'altra scrive un booleano. Il precedente delle gemelle conviventi (2.5) vale
 * per forme identiche riga per riga; qui non lo sono.
 *
 * Lo stato di destinazione arriva esplicito dal client e non si inverte sul server: un
 * «toggle» che legge e inverte costerebbe una pre-lettura e renderebbe due schede aperte
 * capaci di annullarsi a vicenda (falso-vero-falso) senza che nessuna veda un errore. Col
 * valore esplicito le stesse due scritture chiedono la stessa cosa e la ottengono entrambe —
 * idempotenti, come `move_*` che riceve la direzione e non «la prossima posizione».
 *
 * Niente rinumerazione: una domanda spenta conserva la sua `position`, così `Riattiva` la
 * rimette esattamente dov'era. Spegnere e riaccendere è un no-op pieno (decisione 3).
 */

const QUESTION_NOT_DEACTIVATED = 'La domanda non è stata disattivata. Riprova fra un momento.'
const QUESTION_NOT_REACTIVATED = 'La domanda non è stata riattivata. Riprova fra un momento.'
const QUESTION_GONE = 'Questa domanda non è più disponibile. Ricarica la pagina.'

/**
 * L'interfaccia manda solo questi due valori: altro arriva da una richiesta forgiata, e la
 * risposta è log e messaggio generico, come per le direzioni forgiate della 2.5. Mai un `as`.
 */
function isActiveValue(value: unknown): value is 'true' | 'false' {
  return value === 'true' || value === 'false'
}

export type SetQuestionActiveState = { error?: string }

export async function setQuestionActive(
  _previous: SetQuestionActiveState,
  formData: FormData,
): Promise<SetQuestionActiveState> {
  const session = await openSession('setQuestionActive')

  if (!session.ok) return { error: session.error }

  const questionId = formData.get('question_id')
  const active = formData.get('active')

  // Con un campo forgiato la destinazione non si conosce: la frase è quella della
  // disattivazione, scelta fissa, perché il caso non è raggiungibile dall'interfaccia.
  if (!isUuid(questionId) || !isActiveValue(active)) {
    console.error('setQuestionActive: richiesta rifiutata')
    return { error: QUESTION_NOT_DEACTIVATED }
  }

  const notWritten = active === 'true' ? QUESTION_NOT_REACTIVATED : QUESTION_NOT_DEACTIVATED

  // Una query sola, nessuna pre-lettura: il caso «non mia o sparita» lo dà gratis il
  // maybeSingle sull'update stesso — con la RLS i due casi arrivano identici, zero righe, e
  // devono diventare un messaggio, non un errore. La riga la filtra questions_owner_all
  // (0007), che risale al questionario. Nessun ramo 23514 né 23503: `is_active` non compare in
  // nessun vincolo check e non è una chiave esterna, quindi nessuno dei due può fallire.
  // `updated_at` lo muove il trigger della 0006.
  const { data, error } = await session.supabase
    .from('questions')
    .update({ is_active: active === 'true' })
    .eq('id', questionId)
    .select('id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe la riga intera, cioè il testo della
    // domanda, che è testo scritto da una persona (kb-0.md §3).
    console.error('setQuestionActive: update rifiutato', { code: error.code, message: error.message })
    return { error: notWritten }
  }

  if (!data) return { error: QUESTION_GONE }

  // Solo il questionario: le domande non compaiono nell'elenco dei clienti, e questa
  // scrittura non muove clients.updated_at.
  revalidatePath('/questionario')

  return {}
}
