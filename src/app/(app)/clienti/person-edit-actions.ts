'use server'

import { revalidatePath } from 'next/cache'

import { normalizeTextValue } from '@/lib/client-fields'
import { parseDecisionRoles, type DecisionRole } from '@/lib/decision-roles'
import { isPersonFieldKey, type PersonPatch } from '@/lib/person-fields'
import { openSession } from '@/lib/supabase/session'
import { isUuid } from '@/lib/uuid'

import {
  FIELD_NOT_SAVED,
  PERSON_GONE,
  PRIMARY_CLEARED_ONLY,
  PRIMARY_NOT_CHANGED,
  ROLES_NOT_SAVED,
} from './person-messages'

/**
 * Le tre scritture che cambiano una persona che c'è già: un campo, i ruoli, il contatto
 * principale. Aggiungerla e toglierla stanno in people-actions.ts, e le quattro regole comuni a
 * tutte e cinque stanno in person-messages.ts.
 *
 * **Nessuna riceve un `client_id` dal browser.** Lo ricavano dalla riga della persona, che la
 * policy ha già filtrato. Vale in particolare per setPersonPrimary, che tocca *altre* righe:
 * prenderlo dal formData vorrebbe dire lasciar scegliere a chi chiama a quale cliente togliere
 * il contatto principale.
 */

export type UpdatePersonFieldState = { error?: string; saved?: string }

/** La gemella di updateClientField, più semplice: qui i sei campi sono tutti di testo. */
export async function updatePersonField(
  _previous: UpdatePersonFieldState,
  formData: FormData,
): Promise<UpdatePersonFieldState> {
  const session = await openSession('updatePersonField')

  if (!session.ok) return { error: session.error }

  const personId = formData.get('person_id')
  const field = formData.get('field')

  // Nei log solo la chiave rifiutata: il valore è un dato personale.
  if (!isUuid(personId) || !isPersonFieldKey(field)) {
    console.error('updatePersonField: richiesta rifiutata', { field })
    return { error: FIELD_NOT_SAVED }
  }

  const raw = formData.get('value')

  // Svuotare un campo si fa mandando una stringa vuota. Una chiave assente, o un file al suo
  // posto, non è quello: è una richiesta malformata, e trattarla come «svuota» vorrebbe dire
  // cancellare una colonna e rispondere che è andata bene.
  if (typeof raw !== 'string') {
    console.error('updatePersonField: valore mancante', { field })
    return { error: FIELD_NOT_SAVED }
  }

  const patch: PersonPatch = {}
  const value = normalizeTextValue(raw)

  patch[field] = value

  // client_id torna dalla select e non si prende dal browser: serve a rivalidare la scheda
  // giusta. maybeSingle e non single: la riga di un altro proprietario e una riga cancellata
  // arrivano identiche, cioè zero righe.
  const { data, error } = await session.supabase
    .from('people')
    .update(patch)
    .eq('id', personId)
    .select('client_id')
    .maybeSingle()

  if (error) {
    console.error('updatePersonField: update rifiutato', { code: error.code, message: error.message })
    return { error: FIELD_NOT_SAVED }
  }

  if (!data) return { error: PERSON_GONE }

  revalidatePath(`/clienti/${data.client_id}`)

  return { saved: value ?? '' }
}

export type UpdatePersonRolesState = { error?: string; saved?: DecisionRole[] }

/**
 * Qui l'elenco intero arriva dal browser, e va bene, al contrario dei tag: il vocabolario è
 * chiuso e verificato contro l'allow-list, quindi il client non può iniettare niente, e
 * l'insieme *è* il valore del campo, non una collezione che cresce nel tempo.
 */
export async function updatePersonRoles(
  _previous: UpdatePersonRolesState,
  formData: FormData,
): Promise<UpdatePersonRolesState> {
  const session = await openSession('updatePersonRoles')

  if (!session.ok) return { error: session.error }

  const personId = formData.get('person_id')

  if (!isUuid(personId)) {
    console.error('updatePersonRoles: richiesta rifiutata')
    return { error: ROLES_NOT_SAVED }
  }

  // Sul server prima di comporre qualsiasi cosa: il `check` della tabella è l'ultima difesa,
  // non la prima, e da lì il messaggio arriverebbe in inglese parlando di un vincolo.
  const roles = parseDecisionRoles(formData.getAll('decision_roles'))

  if (!roles.ok) return { error: roles.message }

  const { data, error } = await session.supabase
    .from('people')
    .update({ decision_roles: roles.value })
    .eq('id', personId)
    .select('client_id')
    .maybeSingle()

  if (error) {
    console.error('updatePersonRoles: update rifiutato', { code: error.code, message: error.message })
    return { error: ROLES_NOT_SAVED }
  }

  if (!data) return { error: PERSON_GONE }

  revalidatePath(`/clienti/${data.client_id}`)

  // L'elenco canonico: il componente ci riallinea il proprio stato senza aspettare la
  // rivalidazione.
  return { saved: roles.value }
}

export type PersonPrimaryState = { error?: string }

export async function setPersonPrimary(
  _previous: PersonPrimaryState,
  formData: FormData,
): Promise<PersonPrimaryState> {
  const session = await openSession('setPersonPrimary')

  if (!session.ok) return { error: session.error }

  const personId = formData.get('person_id')
  const primary = formData.get('primary')

  if (!isUuid(personId) || (primary !== '1' && primary !== '0')) {
    console.error('setPersonPrimary: richiesta rifiutata')
    return { error: PRIMARY_NOT_CHANGED }
  }

  // client_id si prende da qui, mai dal formData: è l'unico modo di essere sicuri di togliere
  // il principale al cliente giusto, perché questa azione tocca *altre* righe.
  const person = await session.supabase
    .from('people')
    .select('client_id, is_primary')
    .eq('id', personId)
    .maybeSingle()

  if (person.error) {
    console.error('setPersonPrimary: lettura fallita', {
      code: person.error.code,
      message: person.error.message,
    })
    return { error: PRIMARY_NOT_CHANGED }
  }

  if (!person.data) return { error: PERSON_GONE }

  const wanted = primary === '1'

  // Lo stato chiesto è già quello che c'è: si esce senza scrivere. Un update inutile muove
  // updated_at per niente, e la pagina che chiedeva si riallinea comunque con la rivalidazione.
  if (person.data.is_primary === wanted) {
    revalidatePath(`/clienti/${person.data.client_id}`)

    return {}
  }

  if (wanted) {
    // L'ordine non è negoziabile: people_one_primary_per_client_idx ammette una sola riga con
    // is_primary per cliente, quindi mettendo prima e togliendo dopo la scrittura verrebbe
    // rifiutata con 23505. Togliendo prima, la finestra intermedia è «nessun principale», che è
    // uno stato legittimo: nessun vincolo pretende che ce ne sia uno.
    const cleared = await session.supabase
      .from('people')
      .update({ is_primary: false })
      .eq('client_id', person.data.client_id)
      .eq('is_primary', true)

    if (cleared.error) {
      console.error('setPersonPrimary: il precedente non è stato tolto', {
        code: cleared.error.code,
        message: cleared.error.message,
      })
      return { error: PRIMARY_NOT_CHANGED }
    }
  }

  const { data, error } = await session.supabase
    .from('people')
    .update({ is_primary: wanted })
    .eq('id', personId)
    .select('id')
    .maybeSingle()

  revalidatePath(`/clienti/${person.data.client_id}`)

  // Da qui in poi, se `wanted` è vero il precedente principale è già stato tolto: qualunque cosa
  // vada storta, il contatto principale **è** cambiato, da qualcuno a nessuno. Dire «non è stato
  // cambiato» sarebbe falso, e chi legge resterebbe senza sapere che gliene manca uno.
  const failure = wanted ? PRIMARY_CLEARED_ONLY : PRIMARY_NOT_CHANGED

  if (error) {
    console.error('setPersonPrimary: update rifiutato', { code: error.code, message: error.message })
    return { error: failure }
  }

  // La persona è sparita fra la lettura e la scrittura: se stavamo mettendo, il principale
  // precedente è comunque già stato tolto, e il messaggio lo dice invece di parlare solo della
  // persona che non c'è più.
  if (!data) return { error: wanted ? failure : PERSON_GONE }

  return {}
}
