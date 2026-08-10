'use server'

import { revalidatePath } from 'next/cache'

import { validateVerifyBy } from '@/lib/call-date'
import { normalizeTextValue } from '@/lib/client-fields'
import { openSession } from '@/lib/supabase/session'
import type { AssessmentRow } from '@/lib/types'
import { isUuid } from '@/lib/uuid'
import { isVerdict, isVerdictFieldKey, type VerdictFieldKey } from '@/lib/verdict'

/**
 * La scrittura di un campo del verdetto: la seconda scrittura della schermata di compilazione, e la
 * seconda in assoluto su `assessments`.
 *
 * File suo e non dentro `answer-actions.ts` né `assessment-actions.ts`: è un altro momento e
 * un'altra riga, e «un file d'azione porta una azione» è la regola già dichiarata in
 * `question-update-actions.ts`.
 *
 * **Nessun `redirect`, nemmeno a sessione finita** (regola di `supabase/session.ts`), e qui con un
 * motivo in più: una navigazione porterebbe via quello che è appena stato scritto negli altri campi
 * del verdetto *e* nei ventiquattro sopra.
 *
 * La forma è quella di `saveAnswer` riga per riga, che a sua volta è quella di `updateClientField`.
 * L'unico punto in cui si comporta diversamente è la rivalidazione, e il perché sta accanto a lei.
 */

const VERDICT_NOT_SAVED = 'Il campo non è stato salvato. Riprova fra un momento.'

/**
 * Non «torna all'elenco», che è il messaggio della scheda cliente: mandare via da una schermata
 * piena di testo appena scritto sarebbe la cosa peggiore, e ricaricare è davvero il rimedio.
 */
const VERDICT_GONE = 'Questa scheda non è più disponibile. Ricarica la pagina.'

/** Un campo per chiamata: mai il formData riversato in un oggetto e passato a update(). */
type VerdictPatch = Partial<Pick<AssessmentRow, VerdictFieldKey>>

export type SaveVerdictState = { error?: string; saved?: string }

export async function saveVerdict(
  _previous: SaveVerdictState,
  formData: FormData,
): Promise<SaveVerdictState> {
  const session = await openSession('saveVerdict')

  if (!session.ok) return { error: session.error }

  const assessmentId = formData.get('assessment_id')
  const field = formData.get('field')

  // `id` è una colonna uuid: una stringa di altra forma è una richiesta che non doveva esistere.
  // `isVerdictFieldKey` è l'altra metà, e la più importante: senza, l'azione è una scrittura
  // arbitraria su qualsiasi colonna della propria riga — `owner_id` e `total_questions` compresi —
  // perché la policy protegge le righe di un altro proprietario, non la colonna sbagliata sulla
  // propria. Nei log solo la chiave rifiutata, mai il valore (kb-0.md §3).
  if (!isUuid(assessmentId) || !isVerdictFieldKey(field)) {
    console.error('saveVerdict: richiesta rifiutata', { field })
    return { error: VERDICT_NOT_SAVED }
  }

  const raw = formData.get('value')

  // Svuotare un campo si fa mandando la stringa vuota. Una chiave assente, o un file al suo posto,
  // non è quello: è una richiesta malformata, e trattarla come «svuota» vorrebbe dire cancellare un
  // motivo e rispondere che è andata bene.
  if (typeof raw !== 'string') {
    console.error('saveVerdict: valore mancante', { field })
    return { error: VERDICT_NOT_SAVED }
  }

  const patch: VerdictPatch = {}
  let saved: string

  // I due campi non testuali sono isolati come `employees` in updateClientField, e per la stessa
  // ragione: separandoli, il resto della union ha tutto lo stesso tipo `string | null` e
  // l'assegnazione con chiave variabile compila senza forzature.
  if (field === 'verdict') {
    // Il valore non lo scrive una persona, lo manda un `select` costruito sull'elenco: qualsiasi
    // altra cosa si rifiuta qui. Il `check` di Postgres resta l'ultima difesa e non la prima,
    // perché da lì il messaggio arriverebbe in inglese e parlerebbe di un vincolo.
    if (!isVerdict(raw)) {
      console.error('saveVerdict: verdetto non ammesso')
      return { error: VERDICT_NOT_SAVED }
    }

    patch.verdict = raw
    saved = raw
  } else if (field === 'verify_by') {
    const parsed = validateVerifyBy(raw)

    if (!parsed.ok) return { error: parsed.message }

    patch.verify_by = parsed.date
    saved = parsed.date ?? ''
  } else {
    // Importata e non riscritta: è la stessa definizione di «vuoto» con cui `showsCondition` decide
    // se i due campi condizionali si vedono. Due definizioni sui due lati della stessa decisione
    // farebbero riapparire un campo per uno spazio.
    const value = normalizeTextValue(raw)

    patch[field] = value
    saved = value ?? ''
  }

  // **Il server non azzera mai `condition_text` e `verify_by` quando il verdetto cambia.** Sarebbe
  // cancellare quello che una persona ha scritto, e nessun vincolo lo chiede — a differenza delle
  // opzioni della scelta singola, dove il `check` lo pretendeva. Si scrive la colonna che si chiede
  // di scrivere e nessun'altra: è il motivo per cui `patch` porta una chiave sola.
  //
  // updated_at non si scrive mai a mano: lo aggiorna assessments_set_updated_at (0006_triggers.sql).
  //
  // maybeSingle e non single: con la sicurezza a livello di riga attiva, la scheda di un altro
  // proprietario e una scheda cancellata arrivano identiche, cioè zero righe.
  const { data, error } = await session.supabase
    .from('assessments')
    .update(patch)
    .eq('id', assessmentId)
    .select('id, client_id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe il **motivo del verdetto**, cioè un giudizio su
    // un'azienda reale, che è la stessa categoria di dato del contenuto di una risposta
    // (kb-0.md §3 e §4).
    console.error('saveVerdict: update rifiutato', { code: error.code, message: error.message })
    return { error: VERDICT_NOT_SAVED }
  }

  if (!data) return { error: VERDICT_GONE }

  // Gli identificativi del percorso si ricavano dalla riga appena scritta, mai dal formData: un
  // percorso suggerito dal browser è la voce a ledger del PERSON_GONE.
  revalidatePath(`/clienti/${data.client_id}/schede/${data.id}`)

  // **E qui `saveAnswer` non è il modello da copiare.** Scrivere una risposta muove
  // `answers.updated_at` e non tocca la riga della scheda, quindi da lì rivalidare l'elenco sarebbe
  // costo a effetto zero. Questa scrittura invece riscrive `assessments`, dove il trigger c'è, e
  // `assessments.updated_at` è la chiave con cui l'elenco ordina (database.md §5, last-activity.ts):
  // senza questa riga si scrive un verdetto, si torna all'elenco e il cliente è dov'era.
  revalidatePath('/clienti')

  // La card del cliente rende la pillola d'esito nella riga della scheda dalla Story 4.1, il 10
  // agosto 2026: senza questa riga si scrive un verdetto, si torna al cliente e la pillola dice
  // ancora quello di prima. Qui c'era scritto che rivalidarla sarebbe stato «costo a effetto zero»
  // e che sarebbe «diventata necessaria quando quella card mostrerà l'esito e l'avanzamento» —
  // vero fino a quel giorno, e quel giorno è arrivato. È la stessa riga e lo stesso motivo di
  // `completion-actions.ts`, che l'aveva aggiunta per la parola dello stato con la Story 3.6.
  revalidatePath(`/clienti/${data.client_id}`)

  // Serve a riallineare il campo dopo che il server ha ripulito: senza, uno spazio in coda
  // lascerebbe il campo sporco e il comando acceso su un campo già salvato.
  return { saved }
}
