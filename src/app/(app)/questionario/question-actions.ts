'use server'

import { revalidatePath } from 'next/cache'

import { isAnswerType } from '@/lib/answer-types'
import {
  checkViolationMessage,
  parseOptions,
  validateHelpText,
  validateQuestionText,
} from '@/lib/question-fields'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * L'unica scrittura di questa story: una domanda nuova dentro un blocco. Non dentro actions.ts,
 * che è a 177 righe e con questa azione supererebbe le 200 (kb-0.md §2): le azioni dei blocchi
 * e quelle delle domande sono due cose, come clienti/actions.ts e people-actions.ts.
 *
 * Nessun update da nessuna parte: riscrivere una domanda è la Story 2.4, riordinare la 2.5,
 * disattivare la 2.6. E nessuna scrittura su questionnaires: `version` resta 1 fino alla fine
 * dell'Epic 2, per la decisione registrata in deferred-work.md e database.md §3.
 */

const QUESTION_NOT_SAVED = 'La domanda non è stata salvata. Riprova fra un momento.'
const BLOCK_GONE = 'Questo blocco non è più disponibile. Ricarica la pagina.'

export type CreateQuestionState = { error?: string }

export async function createQuestion(
  _previous: CreateQuestionState,
  formData: FormData,
): Promise<CreateQuestionState> {
  const session = await openSession('createQuestion')

  if (!session.ok) return { error: session.error }

  const blockId = formData.get('block_id')

  if (!isUuid(blockId)) {
    console.error('createQuestion: richiesta rifiutata')
    return { error: QUESTION_NOT_SAVED }
  }

  const text = validateQuestionText(formData.get('text'))

  if (!text.ok) return { error: text.message }

  // Un valore fuori dai quattro arriva solo da una richiesta forgiata: il select del modulo
  // rende solo ANSWER_TYPES. Log e messaggio generico, non un messaggio dedicato.
  const answerType = formData.get('answer_type')

  if (!isAnswerType(answerType)) {
    console.error('createQuestion: tipo di risposta rifiutato')
    return { error: QUESTION_NOT_SAVED }
  }

  const help = validateHelpText(formData.get('help_text'))

  if (!help.ok) return { error: help.message }

  // Solo per la scelta singola. Per gli altri tipi options si scrive null qualunque cosa
  // arrivi dal modulo: lo schema non lega le due colonne (0004), e un array salvato su un
  // `numero` sarebbe il dato sporco che block-card.tsx si difende dal mostrare. null e non
  // array vuoto: la colonna è null-abile e il seed usa null (D13).
  let options: string[] | null = null

  if (answerType === 'scelta_singola') {
    const parsed = parseOptions(formData.get('options'))

    if (!parsed.ok) return { error: parsed.message }

    options = parsed.options
  }

  // Non è ridondante rispetto alla policy: distingue «blocco non mio o sparito» da «blocco
  // senza domande», che dalla lettura della posizione tornano identici, e consegna il
  // questionnaire_id che serve alla lettura sotto. La riga la filtra la policy che risale al
  // questionario (0007_rls.sql).
  const block = await session.supabase
    .from('question_blocks')
    .select('id, questionnaire_id')
    .eq('id', blockId)
    .maybeSingle()

  if (block.error) {
    console.error('createQuestion: lettura del blocco fallita', {
      code: block.error.code,
      message: block.error.message,
    })
    return { error: QUESTION_NOT_SAVED }
  }

  if (!block.data) return { error: BLOCK_GONE }

  // L'ultima posizione fra le domande DEL QUESTIONARIO, non del blocco: le posizioni delle
  // domande sono globali (database.md §8), e il massimo del blocco + 1 colliderebbe con la
  // prima domanda del blocco successivo. Con il massimo globale la domanda nasce comunque in
  // fondo al suo blocco, perché la pagina ordina per position dentro il blocco.
  //
  // `!inner` non è decorativo: senza, il filtro sull'innesto svuota l'innesto invece di
  // filtrare le domande, e il massimo diventerebbe quello di tutti i questionari del
  // proprietario. Oggi il questionario è uno e il risultato sarebbe identico; il filtro tiene
  // vera l'affermazione il giorno che sono due. Forma verificata sul progetto il 7 agosto
  // 2026: il filtro raggiunge il join generato (42703 su una colonna inventata nel percorso).
  const last = await session.supabase
    .from('questions')
    .select('position, question_blocks!inner(questionnaire_id)')
    .eq('question_blocks.questionnaire_id', block.data.questionnaire_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (last.error) {
    console.error('createQuestion: lettura della posizione fallita', {
      code: last.error.code,
      message: last.error.message,
    })
    return { error: QUESTION_NOT_SAVED }
  }

  // Sei colonne e basta. Niente is_active: il default dello schema è true, ed è l'«attiva»
  // di AC1 — scriverlo vorrebbe dire tenere due posti allineati a mano. Niente id, created_at,
  // updated_at: hanno i loro default e il loro trigger.
  const { error } = await session.supabase.from('questions').insert({
    block_id: blockId,
    text: text.text,
    help_text: help.helpText,
    answer_type: answerType,
    options,
    position: (last.data?.position ?? 0) + 1,
  })

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe la riga intera, cioè il testo della
    // domanda, che è testo scritto da una persona (kb-0.md §3). Il message di un 23514 nomina
    // solo il vincolo, e si può loggare.
    console.error('createQuestion: insert rifiutato', { code: error.code, message: error.message })

    // 23503 è la chiave esterna verso question_blocks: il blocco è sparito fra la lettura e
    // la scrittura. Non è un guasto passeggero, e invitare a riprovare manderebbe a insistere
    // su una cosa che non riuscirà mai più.
    if (error.code === '23503') return { error: BLOCK_GONE }
    if (error.code === '23514') return { error: checkViolationMessage(error.message, QUESTION_NOT_SAVED) }

    return { error: QUESTION_NOT_SAVED }
  }

  // Solo il questionario: le domande non compaiono nell'elenco dei clienti, e questa scrittura
  // non muove clients.updated_at.
  revalidatePath('/questionario')

  return {}
}
