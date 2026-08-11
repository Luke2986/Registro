'use server'

import { revalidatePath } from 'next/cache'

import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * Le due cancellazioni: una domanda mai finita in una scheda, un blocco senza domande. Due
 * azioni nello stesso file perché sono gemelle riga per riga, come le due di move-actions.ts.
 *
 * La regola non sta qui: sta nelle funzioni della 0017, perché il database non sa rifiutare da
 * solo né l'una né l'altra — `on delete cascade` sul blocco e `on delete set null` sulla
 * risposta riescono tutti e due in silenzio. Qui c'è solo la chiamata e la mappatura dei tre
 * esiti, e nessun `delete` su `questions` o `question_blocks` in TypeScript, da nessuna parte.
 */

const QUESTION_NOT_DELETED = 'La domanda non è stata eliminata. Riprova fra un momento.'
const BLOCK_NOT_DELETED = 'Il blocco non è stato eliminato. Riprova fra un momento.'
const QUESTION_GONE = 'Questa domanda non è più disponibile. Ricarica la pagina.'
const BLOCK_GONE = 'Questo blocco non è più disponibile. Ricarica la pagina.'

// I due `in_use` dicono cosa fare, non cosa è successo dentro (kb-0.md §3): la via d'uscita è
// `Disattiva` per la domanda e svuotare il blocco per il blocco.
const QUESTION_IN_USE = 'Questa domanda è già dentro una scheda. Si può solo disattivare.'
const BLOCK_IN_USE = 'Questo blocco ha ancora delle domande. Elimina prima quelle.'

/**
 * Gli esiti della 0017. Il confronto è esaustivo e non c'è nessun ramo predefinito che valga
 * «riuscito»: una funzione riscritta male risponderebbe un esito nuovo, e leggerlo come un
 * successo cancellerebbe la riga dallo schermo senza averla cancellata dal database.
 */
function isDeleted(outcome: unknown): boolean {
  return outcome === 'deleted'
}

export type DeleteQuestionState = { error?: string }

export async function deleteQuestion(
  _previous: DeleteQuestionState,
  formData: FormData,
): Promise<DeleteQuestionState> {
  const session = await openSession('deleteQuestion')

  if (!session.ok) return { error: session.error }

  const questionId = formData.get('question_id')

  if (!isUuid(questionId)) {
    console.error('deleteQuestion: richiesta rifiutata')
    return { error: QUESTION_NOT_DELETED }
  }

  const { data, error } = await session.supabase.rpc('delete_question', {
    p_question_id: questionId,
  })

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori delle righe (kb-0.md §3).
    console.error('deleteQuestion: rpc rifiutata', { code: error.code, message: error.message })
    return { error: QUESTION_NOT_DELETED }
  }

  if (data === 'in_use') return { error: QUESTION_IN_USE }
  if (!isDeleted(data)) return { error: QUESTION_GONE }

  revalidatePath('/questionario')

  return {}
}

export type DeleteBlockState = { error?: string }

export async function deleteBlock(
  _previous: DeleteBlockState,
  formData: FormData,
): Promise<DeleteBlockState> {
  const session = await openSession('deleteBlock')

  if (!session.ok) return { error: session.error }

  const blockId = formData.get('block_id')

  if (!isUuid(blockId)) {
    console.error('deleteBlock: richiesta rifiutata')
    return { error: BLOCK_NOT_DELETED }
  }

  const { data, error } = await session.supabase.rpc('delete_block', {
    p_block_id: blockId,
  })

  if (error) {
    console.error('deleteBlock: rpc rifiutata', { code: error.code, message: error.message })
    return { error: BLOCK_NOT_DELETED }
  }

  if (data === 'in_use') return { error: BLOCK_IN_USE }
  if (!isDeleted(data)) return { error: BLOCK_GONE }

  revalidatePath('/questionario')

  return {}
}
