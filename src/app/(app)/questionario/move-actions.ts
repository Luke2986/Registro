'use server'

import { revalidatePath } from 'next/cache'

import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * Le due scritture di riordino dell'Epic 2: un blocco o una domanda si spostano di un passo.
 * Due azioni nello stesso file come le due scritture dei blocchi in actions.ts: sono gemelle
 * riga per riga, e il precedente «un file d'azione, una azione» (2.3, 2.4) nasceva dal limite
 * delle 200 righe, che qui non si avvicina.
 *
 * Il riordino vero non sta qui: sta nelle funzioni della 0011, perché PostgREST non offre
 * transazioni e riscrivere N posizioni con N update in fila lascerebbe il questionario
 * incoerente a ogni rete caduta a metà. Qui c'è solo la chiamata e la mappatura dei tre esiti.
 * Nessun update su position in TypeScript, da nessuna parte.
 */

const BLOCK_NOT_MOVED = 'Il blocco non è stato spostato. Riprova fra un momento.'
const QUESTION_NOT_MOVED = 'La domanda non è stata spostata. Riprova fra un momento.'
const BLOCK_GONE = 'Questo blocco non è più disponibile. Ricarica la pagina.'
const QUESTION_GONE = 'Questa domanda non è più disponibile. Ricarica la pagina.'

/**
 * L'interfaccia manda solo questi due valori: altro arriva da una richiesta forgiata, e la
 * risposta è log e messaggio generico, come per i tipi forgiati della 2.3. Mai un `as`.
 */
function isDirection(value: unknown): value is 'up' | 'down' {
  return value === 'up' || value === 'down'
}

export type MoveBlockState = { error?: string }

export async function moveBlock(
  _previous: MoveBlockState,
  formData: FormData,
): Promise<MoveBlockState> {
  const session = await openSession('moveBlock')

  if (!session.ok) return { error: session.error }

  const blockId = formData.get('block_id')
  const direction = formData.get('direction')

  if (!isUuid(blockId) || !isDirection(direction)) {
    console.error('moveBlock: richiesta rifiutata')
    return { error: BLOCK_NOT_MOVED }
  }

  // Una chiamata sola, nessuna pre-lettura: il caso «non mio o sparito» lo dà la funzione col
  // suo false, come maybeSingle lo dà a renameBlock. Le policy filtrano dentro la funzione,
  // che è security invoker. Nessun ramo 23514 né 23503: la funzione non attraversa quei
  // vincoli, e i due rami sarebbero codice morto copiato dalle azioni di scrittura.
  const { data, error } = await session.supabase.rpc('move_block', {
    p_block_id: blockId,
    p_direction: direction,
  })

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori delle righe (kb-0.md §3).
    console.error('moveBlock: rpc rifiutata', { code: error.code, message: error.message })
    return { error: BLOCK_NOT_MOVED }
  }

  if (!data) return { error: BLOCK_GONE }

  // Solo il questionario: i blocchi non compaiono nell'elenco dei clienti, e questa scrittura
  // non muove clients.updated_at.
  revalidatePath('/questionario')

  return {}
}

export type MoveQuestionState = { error?: string }

export async function moveQuestion(
  _previous: MoveQuestionState,
  formData: FormData,
): Promise<MoveQuestionState> {
  const session = await openSession('moveQuestion')

  if (!session.ok) return { error: session.error }

  const questionId = formData.get('question_id')
  const direction = formData.get('direction')

  if (!isUuid(questionId) || !isDirection(direction)) {
    console.error('moveQuestion: richiesta rifiutata')
    return { error: QUESTION_NOT_MOVED }
  }

  const { data, error } = await session.supabase.rpc('move_question', {
    p_question_id: questionId,
    p_direction: direction,
  })

  if (error) {
    console.error('moveQuestion: rpc rifiutata', { code: error.code, message: error.message })
    return { error: QUESTION_NOT_MOVED }
  }

  if (!data) return { error: QUESTION_GONE }

  revalidatePath('/questionario')

  return {}
}
