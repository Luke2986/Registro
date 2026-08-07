'use server'

import { revalidatePath } from 'next/cache'

import { validateBlockTitle } from '@/lib/block-title'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * Le due scritture dell'Epic 2 sui blocchi: si aggiunge e si rinomina, niente altro. Non dentro
 * clienti/actions.ts, che è a oltre cinquecento righe e contiene già due cose (kb-0.md §2), e
 * un file 'use server' espone ogni suo export come punto d'ingresso raggiungibile dal browser.
 *
 * Nessuna scrittura verso questions, answers o questionnaires: rinominare un blocco non tocca
 * le risposte già date, perché answers.block_title è una copia scritta all'apertura della
 * scheda (database.md §3) e non esiste nessun collegamento da aggiornare.
 */

const BLOCK_NOT_SAVED = 'Il blocco non è stato salvato. Riprova fra un momento.'
const TITLE_NOT_SAVED = 'Il titolo non è stato salvato. Riprova fra un momento.'
const QUESTIONNAIRE_GONE = 'Il questionario non è più disponibile. Ricarica la pagina.'
const BLOCK_GONE = 'Questo blocco non è più disponibile. Ricarica la pagina.'

/**
 * 23514 è il vincolo question_blocks_title_not_blank (0008): è l'ultima difesa e non dovrebbe
 * scattare mai, perché validateBlockTitle rifiuta prima. Se scatta, il messaggio resta il
 * nostro e non quello di Postgres, che risponde in inglese e parla di un vincolo invece che di
 * cosa fare. Il messaggio si prende dal validatore stesso — validateBlockTitle('') è la stessa
 * condizione del vincolo — così la frase vive in un posto solo.
 */
function blankTitleMessage(fallback: string): string {
  const blank = validateBlockTitle('')

  return blank.ok ? fallback : blank.message
}

export type CreateBlockState = { error?: string }

export async function createBlock(
  _previous: CreateBlockState,
  formData: FormData,
): Promise<CreateBlockState> {
  const session = await openSession('createBlock')

  if (!session.ok) return { error: session.error }

  const questionnaireId = formData.get('questionnaire_id')

  if (!isUuid(questionnaireId)) {
    console.error('createBlock: richiesta rifiutata')
    return { error: BLOCK_NOT_SAVED }
  }

  const validation = validateBlockTitle(formData.get('title'))

  if (!validation.ok) return { error: validation.message }

  // Non è ridondante rispetto alla policy: serve a distinguere «questionario non mio o sparito»
  // da «questionario senza blocchi», che dalla lettura della posizione tornano identici, cioè
  // zero righe. La riga la filtra questionnaires_owner_all.
  const owner = await session.supabase
    .from('questionnaires')
    .select('id')
    .eq('id', questionnaireId)
    .maybeSingle()

  if (owner.error) {
    console.error('createBlock: lettura del questionario fallita', {
      code: owner.error.code,
      message: owner.error.message,
    })
    return { error: BLOCK_NOT_SAVED }
  }

  if (!owner.data) return { error: QUESTIONNAIRE_GONE }

  // L'ultima posizione la ordina il database: nessun array letto per intero, nessun Math.max
  // su un elenco vuoto, e il primo blocco di un questionario vuoto non è un caso particolare.
  // Le posizioni dei blocchi sono per questionario (1-8 oggi), non globali come quelle delle
  // domande: il filtro sul questionario è quello che tiene vera l'affermazione il giorno che i
  // questionari sono due.
  const last = await session.supabase
    .from('question_blocks')
    .select('position')
    .eq('questionnaire_id', questionnaireId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (last.error) {
    console.error('createBlock: lettura della posizione fallita', {
      code: last.error.code,
      message: last.error.message,
    })
    return { error: BLOCK_NOT_SAVED }
  }

  // id e created_at hanno il loro default nello schema: scriverli qui vorrebbe dire tenere due
  // posti allineati a mano.
  const { error } = await session.supabase.from('question_blocks').insert({
    questionnaire_id: questionnaireId,
    title: validation.title,
    position: (last.data?.position ?? 0) + 1,
  })

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe il titolo rifiutato, cioè testo scritto
    // da una persona (kb-0.md §3).
    console.error('createBlock: insert rifiutato', { code: error.code, message: error.message })

    // 23503 è la chiave esterna verso questionnaires: il questionario è sparito fra la lettura
    // e la scrittura. Non è un guasto passeggero, e invitare a riprovare manderebbe a insistere
    // su una cosa che non riuscirà mai più.
    if (error.code === '23503') return { error: QUESTIONNAIRE_GONE }
    if (error.code === '23514') return { error: blankTitleMessage(BLOCK_NOT_SAVED) }

    return { error: BLOCK_NOT_SAVED }
  }

  // Solo il questionario: i blocchi non compaiono nell'elenco dei clienti, e questa scrittura
  // non muove clients.updated_at, che è il suo ordinamento.
  revalidatePath('/questionario')

  return {}
}

export type RenameBlockState = { error?: string; saved?: string }

export async function renameBlock(
  _previous: RenameBlockState,
  formData: FormData,
): Promise<RenameBlockState> {
  const session = await openSession('renameBlock')

  if (!session.ok) return { error: session.error }

  const blockId = formData.get('block_id')

  if (!isUuid(blockId)) {
    console.error('renameBlock: richiesta rifiutata')
    return { error: TITLE_NOT_SAVED }
  }

  const validation = validateBlockTitle(formData.get('title'))

  if (!validation.ok) return { error: validation.message }

  // question_blocks non ha updated_at e non ha un trigger (0004, 0006): a differenza di ogni
  // scrittura sulla scheda cliente, questa non muove nessun timestamp e non riordina niente.
  // Le risposte già date non si toccano: answers.block_title è una copia, non un riferimento.
  //
  // maybeSingle e non single: con la sicurezza a livello di riga attiva, il blocco di un altro
  // proprietario e un blocco cancellato arrivano identici, cioè zero righe, e con single
  // diventerebbero un errore invece di un messaggio comprensibile.
  const { data, error } = await session.supabase
    .from('question_blocks')
    .update({ title: validation.title })
    .eq('id', blockId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('renameBlock: update rifiutato', { code: error.code, message: error.message })

    if (error.code === '23514') return { error: blankTitleMessage(TITLE_NOT_SAVED) }

    return { error: TITLE_NOT_SAVED }
  }

  if (!data) return { error: BLOCK_GONE }

  revalidatePath('/questionario')

  // Il titolo ripulito: è quello che useEditableField usa per riallineare il campo, senza il
  // quale uno spazio in coda lascerebbe Salva acceso su un campo già salvato.
  return { saved: validation.title }
}
