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
 * L'unica scrittura di questa story: la riscrittura di una domanda. Non dentro
 * question-actions.ts, che con questa azione supererebbe le 200 righe (kb-0.md §2): ogni
 * export di un file 'use server' è un punto d'ingresso raggiungibile dal browser, e un file
 * d'azione porta una azione.
 *
 * Quattro colonne e basta: text, help_text, answer_type, options. Niente position (Story 2.5),
 * niente is_active (Story 2.6), niente block_id (spostare una domanda fra blocchi non è di
 * nessuna story), niente updated_at, che lo muove il trigger della 0006. E nessuna scrittura
 * su questionnaires: `version` resta 1 fino alla fine dell'Epic 2 (decisione registrata in
 * deferred-work.md e database.md §3).
 */

const QUESTION_NOT_SAVED = 'La domanda non è stata salvata. Riprova fra un momento.'
const QUESTION_GONE = 'Questa domanda non è più disponibile. Ricarica la pagina.'

export type UpdateQuestionState = { error?: string }

export async function updateQuestion(
  _previous: UpdateQuestionState,
  formData: FormData,
): Promise<UpdateQuestionState> {
  const session = await openSession('updateQuestion')

  if (!session.ok) return { error: session.error }

  const questionId = formData.get('question_id')

  if (!isUuid(questionId)) {
    console.error('updateQuestion: richiesta rifiutata')
    return { error: QUESTION_NOT_SAVED }
  }

  const text = validateQuestionText(formData.get('text'))

  if (!text.ok) return { error: text.message }

  // Un valore fuori dai quattro arriva solo da una richiesta forgiata: il select del modulo
  // rende solo ANSWER_TYPES. Log e messaggio generico, non un messaggio dedicato.
  const answerType = formData.get('answer_type')

  if (!isAnswerType(answerType)) {
    console.error('updateQuestion: tipo di risposta rifiutato')
    return { error: QUESTION_NOT_SAVED }
  }

  const help = validateHelpText(formData.get('help_text'))

  if (!help.ok) return { error: help.message }

  // Solo per la scelta singola. Per gli altri tipi options si scrive null qualunque cosa
  // arrivi dal modulo — null e non array vuoto (D13) — e dalla 0010 non è più solo disciplina
  // applicativa: un update che dimentica l'azzeramento cade con 23514. È anche il ramo che
  // pulisce: una domanda che lascia la scelta singola esce senza opzioni, che è esattamente
  // il dato da cui question-item.tsx si difende.
  let options: string[] | null = null

  if (answerType === 'scelta_singola') {
    const parsed = parseOptions(formData.get('options'))

    if (!parsed.ok) return { error: parsed.message }

    options = parsed.options
  }

  // Una query sola, nessuna pre-lettura: qui non serve né la posizione né il questionnaire_id,
  // e il caso «domanda non mia o sparita» lo dà gratis il maybeSingle sull'update stesso, come
  // già fa renameBlock. maybeSingle e non single: con la sicurezza a livello di riga, la
  // domanda di un altro proprietario e una domanda cancellata arrivano identiche, cioè zero
  // righe, e con single diventerebbero un errore invece di un messaggio. La riga la filtra
  // questions_owner_all, che risale al questionario (0007_rls.sql).
  const { data, error } = await session.supabase
    .from('questions')
    .update({ text: text.text, help_text: help.helpText, answer_type: answerType, options })
    .eq('id', questionId)
    .select('id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` su un update rifiutato contiene la riga intera, cioè
    // il testo della domanda, che è testo scritto da una persona (kb-0.md §3).
    console.error('updateQuestion: update rifiutato', { code: error.code, message: error.message })

    // Solo 23514, nessun ramo 23503: l'update non scrive nessuna chiave esterna. I vincoli
    // possibili sono quattro — i due della 0009, questions_answer_type_check della 0004 e la
    // 0010 — e checkViolationMessage copre i due con una frase propria, gli altri col fallback.
    if (error.code === '23514') return { error: checkViolationMessage(error.message, QUESTION_NOT_SAVED) }

    return { error: QUESTION_NOT_SAVED }
  }

  if (!data) return { error: QUESTION_GONE }

  // Solo il questionario: le domande non compaiono nell'elenco dei clienti, e questa scrittura
  // non muove clients.updated_at.
  revalidatePath('/questionario')

  return {}
}
