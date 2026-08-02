'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { validateClientName } from '@/lib/validate-client-name'

export type CreateClientState = { error?: string }

/**
 * Non si chiama createClient: quel nome è già dell'helper Supabase importato qui sopra.
 *
 * owner_id viene solo dalla sessione letta sul server, mai da un campo del form. La policy
 * clients_owner_all rifiuterebbe comunque un valore diverso, ma non la si mette alla prova.
 *
 * status, tags e i timestamp hanno il loro default nello schema: scriverli qui vorrebbe dire
 * tenere due posti allineati a mano.
 */
export async function createClientRecord(
  _previous: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  const validation = validateClientName(formData.get('name'))

  if (!validation.ok) return { error: validation.message }

  const { data, error } = await supabase
    .from('clients')
    .insert({ name: validation.name, owner_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Il cliente non è stato salvato. Riprova fra un momento.' }
  }

  revalidatePath('/clienti')

  // redirect fuori da qualsiasi try/catch: funziona lanciando NEXT_REDIRECT, e dentro un
  // catch verrebbe inghiottito senza che la navigazione avvenga.
  redirect(`/clienti/${data.id}`)
}
