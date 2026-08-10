'use server'

import { revalidatePath } from 'next/cache'

import { normalizeTextValue } from '@/lib/client-fields'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * La scrittura di una risposta, che è l'unica scrittura della schermata di compilazione.
 *
 * File suo e non dentro assessment-actions.ts, che porta l'apertura di una scheda: è un'altra
 * tabella e un altro momento, e «un file d'azione porta una azione» è la regola già dichiarata in
 * question-update-actions.ts.
 *
 * **Nessun `redirect`, nemmeno a sessione finita.** Una navigazione porterebbe via quello che è
 * appena stato scritto negli altri ventitré campi, cioè l'unica promessa non negoziabile del
 * prodotto (NFR1). È la regola scritta in supabase/session.ts, e qui vale più che altrove.
 *
 * La forma è quella di updateClientField riga per riga: uuid verificato prima di toccare il
 * database, `typeof raw !== 'string'` distinto dallo svuotamento, normalizzazione condivisa,
 * `maybeSingle`, log dei soli `code` e `message`, ritorno del valore ripulito.
 */

const ANSWER_NOT_SAVED = 'Il campo non è stato salvato. Riprova fra un momento.'

/**
 * Non «torna all'elenco», che è il messaggio della scheda cliente: qui ricaricare è davvero il
 * rimedio, e mandare via da una schermata piena di testo appena scritto sarebbe la cosa peggiore.
 */
const ANSWER_GONE = 'Questa risposta non è più disponibile. Ricarica la pagina.'

export type SaveAnswerState = { error?: string; saved?: string }

export async function saveAnswer(
  _previous: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const session = await openSession('saveAnswer')

  if (!session.ok) return { error: session.error }

  const answerId = formData.get('answer_id')

  // `id` è una colonna uuid: una stringa di altra forma è una richiesta che non doveva esistere, e
  // si rifiuta prima di toccare il database. Nei log solo il fatto del rifiuto, mai il valore.
  if (!isUuid(answerId)) {
    console.error('saveAnswer: richiesta rifiutata')
    return { error: ANSWER_NOT_SAVED }
  }

  const raw = formData.get('content')

  // Svuotare una risposta si fa mandando la stringa vuota. Una chiave assente, o un file al suo
  // posto, non è quello: è una richiesta malformata, e trattarla come «svuota» vorrebbe dire
  // cancellare una risposta e rispondere che è andata bene.
  if (typeof raw !== 'string') {
    console.error('saveAnswer: contenuto mancante')
    return { error: ANSWER_NOT_SAVED }
  }

  // Importata e non riscritta: è la **stessa definizione di «vuoto»** che il conteggio
  // dell'avanzamento userà (`coalesce(trim(content), '') <> ''`, database.md §3). Riscriverla qui
  // darebbe due definizioni su due lati dello stesso numero, destinate a divergere.
  const content = normalizeTextValue(raw)

  // I due identificativi da rivalidare si ricavano dalla riga appena scritta, mai dal formData: un
  // percorso suggerito dal browser è la voce a ledger del PERSON_GONE. `answers.assessment_id` è
  // `not null` con una chiave esterna sola, quindi il percorso non è ambiguo e costa un innesto
  // invece di una lettura in più.
  //
  // updated_at non si scrive mai a mano: lo aggiorna answers_set_updated_at (0006_triggers.sql).
  //
  // maybeSingle e non single: con la sicurezza a livello di riga attiva, la risposta di un altro
  // proprietario e una risposta cancellata arrivano identiche, cioè zero righe.
  const { data, error } = await session.supabase
    .from('answers')
    .update({ content })
    .eq('id', answerId)
    .select('assessment_id, assessments(client_id)')
    .maybeSingle()

  if (error) {
    // Qui la regola morde più che altrove: `details` conterrebbe il **contenuto della risposta**,
    // cioè quello che un cliente reale ha detto in una call, che è la categoria di dato più
    // sensibile del sistema (kb-0.md §3 e §4).
    console.error('saveAnswer: update rifiutato', { code: error.code, message: error.message })
    return { error: ANSWER_NOT_SAVED }
  }

  if (!data) return { error: ANSWER_GONE }

  // La rotta di compilazione: si esce alla scheda cliente e si rientra senza ricaricare, e senza
  // rivalidazione la cache del router restituirebbe il testo di prima, che è indistinguibile da un
  // lavoro perso.
  revalidatePath(`/clienti/${data.assessments.client_id}/schede/${data.assessment_id}`)

  // Le altre due sono nate con la Story 4.1, il 10 agosto 2026, e fino a quel giorno erano
  // **assenti di proposito**: la scheda cliente non rendeva niente che questa scrittura cambiasse, e
  // l'ordinamento dell'elenco guarda `assessments.updated_at`, che salvando una risposta non si
  // muoveva — su `answers` c'era un trigger solo e non risaliva alla scheda. Rivalidare sarebbe
  // stato costo a effetto zero e, peggio, sarebbe sembrato la correzione di un difetto che restava.
  //
  // Le due cose sono cambiate insieme, ed è il motivo per cui le due chiamate arrivano insieme: la
  // card del cliente porta ora il contatore e la barra di avanzamento, e la migrazione 0016
  // (`answers_touch_assessment`) fa risalire l'`updated_at` alla scheda. Senza la prima si
  // compilano dieci risposte, si torna al cliente e il contatore dice ancora quello di prima; senza
  // la seconda il cliente non risale nell'elenco (FR11, database.md §5).
  revalidatePath(`/clienti/${data.assessments.client_id}`)
  revalidatePath('/clienti')

  // Serve a riallineare il campo dopo che il server ha ripulito: senza, uno spazio in coda
  // lascerebbe il campo sporco e il comando acceso su una risposta già salvata.
  return { saved: content ?? '' }
}
