'use server'

import { revalidatePath } from 'next/cache'

import { normalizeTextValue } from '@/lib/client-fields'
import { parseDecisionRoles } from '@/lib/decision-roles'
import { PERSON_FIELDS, type PersonPatch } from '@/lib/person-fields'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

import {
  ARCHIVE_GONE,
  CLIENT_GONE,
  PERSON_GONE,
  PERSON_NOT_REMOVED,
  PERSON_NOT_RESTORED,
  PERSON_NOT_SAVED,
} from './person-messages'

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
 * Dalla 0021 la riga passa dal cestino, e la cancellazione non è più in TypeScript: è dentro
 * `delete_person`, perché archiviare e cancellare devono riuscire o fallire insieme, e perché le
 * schede di cui la persona era interlocutore vanno lette **prima** che `interviewee_id` cada in
 * `set null` — dopo non c'è più niente da leggere. Nessun `delete` su `people` da qui.
 *
 * La riga la filtra la policy people_owner_all, dentro la funzione come fuori.
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

  // La rpc risponde un esito e non la riga, quindi il cliente da rivalidare si legge prima. Non
  // arriva dal browser di proposito: un `client_id` di parte servirebbe solo a far rivalidare una
  // pagina altrui, che è innocuo ma è comunque un valore non verificato usato per decidere.
  const person = await session.supabase
    .from('people')
    .select('client_id')
    .eq('id', personId)
    .maybeSingle()

  if (person.error) {
    console.error('deletePerson: lettura della persona fallita', {
      code: person.error.code,
      message: person.error.message,
    })
    return { error: PERSON_NOT_REMOVED }
  }

  if (!person.data) return { error: PERSON_GONE }

  const { data, error } = await session.supabase.rpc('delete_person', { p_person_id: personId })

  if (error) {
    console.error('deletePerson: rpc rifiutata', { code: error.code, message: error.message })
    return { error: PERSON_NOT_REMOVED }
  }

  // Confronto esaustivo e nessun ramo predefinito che valga «riuscito»: una funzione riscritta
  // male risponderebbe un esito nuovo, e leggerlo come un successo toglierebbe la persona dallo
  // schermo senza toglierla dal database.
  if (data !== 'deleted') return { error: PERSON_GONE }

  revalidatePath(`/clienti/${person.data.client_id}`)

  return {}
}

export type RestorePersonState = { error?: string }

/**
 * Il ritorno dal cestino, con `restore_row` che è la stessa funzione del questionario: il ramo
 * lo sceglie `source_table` della riga archiviata, non il chiamante. Qui c'è solo la mappatura
 * degli esiti e la pagina da rivalidare, che è quella del cliente e non `/questionario`.
 *
 * `parent_gone` vuol dire che il cliente non c'è più: la persona non ha dove tornare, e la frase
 * è quella che il resto della scheda usa già per lo stesso caso.
 */
export async function restorePerson(
  _previous: RestorePersonState,
  formData: FormData,
): Promise<RestorePersonState> {
  const session = await openSession('restorePerson')

  if (!session.ok) return { error: session.error }

  const archiveId = formData.get('archive_id')

  if (!isUuid(archiveId)) {
    console.error('restorePerson: richiesta rifiutata')
    return { error: PERSON_NOT_RESTORED }
  }

  // Come in deletePerson, e per lo stesso motivo: il cliente da rivalidare si legge, non si
  // riceve. Per una persona archiviata `parent_id` **è** il cliente.
  const archived = await session.supabase
    .from('archived_rows')
    .select('parent_id')
    .eq('id', archiveId)
    .maybeSingle()

  if (archived.error) {
    console.error('restorePerson: lettura del cestino fallita', {
      code: archived.error.code,
      message: archived.error.message,
    })
    return { error: PERSON_NOT_RESTORED }
  }

  if (!archived.data) return { error: ARCHIVE_GONE }

  const { data, error } = await session.supabase.rpc('restore_row', { p_archive_id: archiveId })

  if (error) {
    console.error('restorePerson: rpc rifiutata', { code: error.code, message: error.message })
    return { error: PERSON_NOT_RESTORED }
  }

  if (data === 'parent_gone') return { error: CLIENT_GONE }
  if (data !== 'restored') return { error: ARCHIVE_GONE }

  revalidatePath(`/clienti/${archived.data.parent_id}`)

  return {}
}
