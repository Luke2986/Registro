'use server'

import { revalidatePath } from 'next/cache'

import { isCompletionStatus } from '@/lib/completion-status'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

/**
 * Marcare una scheda come finita, o riportarla in bozza: la terza scrittura su `assessments` dopo
 * `openAssessment` e `saveVerdict`, e una colonna sola.
 *
 * File suo e non dentro `verdict-actions.ts` né `assessment-actions.ts`: «un file d'azione porta una
 * azione» è la regola già dichiarata in `question-update-actions.ts`. Qui il motivo è più forte del
 * solito — metterla accanto al verdetto è la prima mossa verso il legame che AC2 e AC3 negano e che
 * il database si è rifiutato di scrivere.
 *
 * **Non blocca niente, e non è un'omissione.** Chiudere una scheda non la rende di sola lettura: i
 * campi restano scrivibili, il verdetto si può scrivere dopo, e riportarla in bozza è sempre
 * possibile. Il software registra e mostra, non decide e non vieta (D14, NFR8).
 *
 * Lo stato di destinazione arriva esplicito dal client e non si inverte sul server, come in
 * `setQuestionActive`: un «toggle» che legge e inverte costerebbe una pre-lettura e renderebbe due
 * schede aperte capaci di annullarsi a vicenda — bozza, chiusa, bozza — senza che nessuna delle due
 * veda un errore. Col valore esplicito le stesse due scritture chiedono la stessa cosa e la
 * ottengono entrambe.
 *
 * **Nessun `redirect`, nemmeno a sessione finita** (regola di `supabase/session.ts`), e qui con il
 * motivo in più della 3.5: il comando sta sulla schermata di compilazione, e una navigazione
 * porterebbe via quello che è appena stato scritto nei ventinove campi.
 */

const ASSESSMENT_NOT_CLOSED = 'La scheda non è stata chiusa. Riprova fra un momento.'
const ASSESSMENT_NOT_REOPENED = 'La scheda non è stata riportata in bozza. Riprova fra un momento.'

/**
 * Non «torna all'elenco», per la stessa ragione di `saveVerdict`: mandare via da una schermata piena
 * di testo appena scritto sarebbe la cosa peggiore, e ricaricare è davvero il rimedio.
 */
const ASSESSMENT_GONE = 'Questa scheda non è più disponibile. Ricarica la pagina.'

export type SetCompletionStatusState = { error?: string }

export async function setCompletionStatus(
  _previous: SetCompletionStatusState,
  formData: FormData,
): Promise<SetCompletionStatusState> {
  const session = await openSession('setCompletionStatus')

  if (!session.ok) return { error: session.error }

  const assessmentId = formData.get('assessment_id')
  const status = formData.get('completion_status')

  // `id` è una colonna uuid: una stringa di altra forma è una richiesta che non doveva esistere. Il
  // valore non lo scrive una persona, lo manda un pulsante costruito sui due valori ammessi: qui non
  // si normalizza niente, e il `check` di Postgres resta l'ultima difesa e non la prima, perché da
  // lì il messaggio arriverebbe in inglese e parlerebbe di un vincolo (NFR16).
  //
  // Con un campo forgiato la destinazione non si conosce: la frase è quella della chiusura, scelta
  // fissa, perché il caso non è raggiungibile dall'interfaccia. Nei log niente valori: la riga di
  // `assessments` porta un giudizio su un'azienda reale.
  if (!isUuid(assessmentId) || !isCompletionStatus(status)) {
    console.error('setCompletionStatus: richiesta rifiutata')
    return { error: ASSESSMENT_NOT_CLOSED }
  }

  const notWritten = status === 'chiusa' ? ASSESSMENT_NOT_CLOSED : ASSESSMENT_NOT_REOPENED

  // Nessun elenco di chiavi ammesse come in `saveVerdict`: là le colonne sono cinque e la chiave
  // viaggia nel formData, qui la colonna è una sola e sta scritta nel codice. Una guardia sul nome
  // sarebbe una difesa per una porta che non c'è.
  //
  // Una query sola, nessuna pre-lettura: il caso «non mia o sparita» lo dà gratis il maybeSingle
  // sull'update stesso — con la sicurezza a livello di riga i due casi arrivano identici, zero
  // righe, e devono diventare un messaggio e non un errore.
  //
  // `updated_at` non si scrive mai a mano: lo muove `assessments_set_updated_at` (0006).
  const { data, error } = await session.supabase
    .from('assessments')
    .update({ completion_status: status })
    .eq('id', assessmentId)
    .select('id, client_id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe la riga intera, cioè il motivo del verdetto e
    // il prossimo passo, che sono un giudizio su un'azienda reale (kb-0.md §3 e §4).
    console.error('setCompletionStatus: update rifiutato', {
      code: error.code,
      message: error.message,
    })
    return { error: notWritten }
  }

  if (!data) return { error: ASSESSMENT_GONE }

  // Gli identificativi del percorso si ricavano dalla riga appena scritta, mai dal formData: un
  // percorso suggerito dal browser è la voce a ledger del PERSON_GONE.
  //
  // La rotta di compilazione: è dove sta il comando, ed è la rivalidazione che fa girare la parola
  // dello stato e l'etichetta del pulsante.
  revalidatePath(`/clienti/${data.client_id}/schede/${data.id}`)

  // La scheda cliente rende la parola nella riga della scheda (`assessments-card.tsx`): senza questa
  // riga si chiude una scheda, si torna al cliente, e l'elenco dice ancora `bozza`. È la prima delle
  // tre scritture della schermata di compilazione a chiederla — `saveAnswer` non la fa e `saveVerdict`
  // l'aveva esclusa scrivendone il motivo, che scade qui e solo qui. Fuori da questa schermata la
  // chiamata è di casa da sempre, a partire da `openAssessment`: quello che cambia è il perché, non
  // la novità. **Il trigger che manca su `answers` resta identico** e appartiene alla 4.1
  // (deferred-work.md).
  revalidatePath(`/clienti/${data.client_id}`)

  // **E qui `saveAnswer` non è il modello da copiare.** Questa scrittura riscrive `assessments`, dove
  // il trigger c'è, e `assessments.updated_at` è la chiave con cui l'elenco ordina (database.md §5,
  // last-activity.ts): senza questa riga si chiude una scheda, si torna all'elenco e il cliente è
  // dov'era. È la stessa riga e lo stesso motivo di `saveVerdict`.
  revalidatePath('/clienti')

  return {}
}
