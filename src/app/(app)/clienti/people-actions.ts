'use server'

import { revalidatePath } from 'next/cache'

import { normalizeTextValue } from '@/lib/client-fields'
import { parseDecisionRoles } from '@/lib/decision-roles'
import { PERSON_FIELDS, type PersonPatch } from '@/lib/person-fields'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

import { CLIENT_GONE, PERSON_GONE, PERSON_NOT_REMOVED, PERSON_NOT_SAVED } from './person-messages'

/**
 * Una persona si aggiunge e si toglie: le due scritture che cambiano quante persone ci sono.
 * Le tre che cambiano una persona che c'è già stanno in person-edit-actions.ts, e le quattro
 * regole comuni a tutte e cinque stanno in person-messages.ts.
 *
 * Non dentro actions.ts: quel file è a oltre cinquecento righe e contiene già due cose, il
 * cliente e i suoi tag (kb-0.md §2).
 */

export type CreatePersonState = { error?: string }

export async function createPerson(
  _previous: CreatePersonState,
  formData: FormData,
): Promise<CreatePersonState> {
  const session = await openSession('createPerson')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')

  if (!isUuid(clientId)) {
    console.error('createPerson: richiesta rifiutata')
    return { error: PERSON_NOT_SAVED }
  }

  // È l'unico punto in cui un `client_id` arriva dal browser, e la policy di `people` da sola
  // non lo copre: un insert con il mio owner_id e il client_id di un altro proprietario la
  // soddisfa, perché la verifica di integrità referenziale non passa dalla sicurezza a livello
  // di riga. Questa lettura invece passa da clients_owner_all e risponde a vuoto se il cliente
  // non è mio.
  const owner = await session.supabase.from('clients').select('id').eq('id', clientId).maybeSingle()

  if (owner.error) {
    console.error('createPerson: lettura del cliente fallita', {
      code: owner.error.code,
      message: owner.error.message,
    })
    return { error: PERSON_NOT_SAVED }
  }

  if (!owner.data) return { error: CLIENT_GONE }

  const fields: PersonPatch = {}

  for (const field of PERSON_FIELDS) fields[field.key] = normalizeTextValue(formData.get(field.key))

  const roles = parseDecisionRoles(formData.getAll('decision_roles'))

  if (!roles.ok) return { error: roles.message }

  // is_primary non si scrive: ha il suo default e la sua azione. id e i due timestamp hanno il
  // default nello schema.
  const { error } = await session.supabase
    .from('people')
    .insert({ ...fields, decision_roles: roles.value, client_id: clientId, owner_id: session.userId })

  if (error) {
    console.error('createPerson: insert rifiutato', { code: error.code, message: error.message })

    // 23503 è la violazione della chiave esterna verso clients: il cliente è stato eliminato fra
    // la lettura qui sopra e questa scrittura. Non è un guasto passeggero, e invitare a
    // riprovare manderebbe a insistere su una cosa che non riuscirà mai più.
    return { error: error.code === '23503' ? CLIENT_GONE : PERSON_NOT_SAVED }
  }

  // Solo la scheda, mai /clienti: le persone non compaiono nell'elenco e scrivere su `people`
  // non muove clients.updated_at, che oggi è il suo ordinamento.
  revalidatePath(`/clienti/${clientId}`)

  return {}
}

export type DeletePersonState = { error?: string }

/**
 * Non è un di più fuori dalle AC: kb-0.md §4 chiede che ogni tabella con dati personali abbia
 * un modo di cancellare davvero, non solo di nascondere. `people` è la tabella con i dati
 * personali del sistema, e senza questa azione una persona aggiunta per sbaglio resterebbe per
 * sempre — lo stesso argomento con cui D22 ha aperto la rinomina del nome del cliente.
 *
 * La riga la filtra la policy people_owner_all.
 */
export async function deletePerson(
  _previous: DeletePersonState,
  formData: FormData,
): Promise<DeletePersonState> {
  const session = await openSession('deletePerson')

  if (!session.ok) return { error: session.error }

  const personId = formData.get('person_id')

  if (!isUuid(personId)) {
    console.error('deletePerson: richiesta rifiutata')
    return { error: PERSON_NOT_REMOVED }
  }

  const { data, error } = await session.supabase
    .from('people')
    .delete()
    .eq('id', personId)
    .select('client_id')
    .maybeSingle()

  if (error) {
    console.error('deletePerson: delete rifiutato', { code: error.code, message: error.message })
    return { error: PERSON_NOT_REMOVED }
  }

  if (!data) return { error: PERSON_GONE }

  revalidatePath(`/clienti/${data.client_id}`)

  return {}
}
