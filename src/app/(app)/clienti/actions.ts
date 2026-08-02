'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { normalizeClientName, validateClientName } from '@/lib/validate-client-name'

export type CreateClientState = {
  error?: string
  /** Il nome su cui è stato dato l'avviso di doppione: rimandandolo indietro, il salvataggio passa. */
  duplicateOf?: string
}

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
    error: authError,
  } = await supabase.auth.getUser()

  // getUser() risponde con un errore sia quando la sessione manca sia quando il servizio non
  // risponde. Solo il primo caso vuol dire "sei fuori": mandare a /accedi per un guasto
  // transitorio porterebbe via il nome appena digitato (kb-0.md §6).
  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error('createClientRecord: auth non raggiungibile', { status: authError.status })
    return { error: 'Non è stato possibile verificare l’accesso. Riprova fra un momento.' }
  }

  if (!user) redirect('/accedi')

  const validation = validateClientName(formData.get('name'))

  if (!validation.ok) return { error: validation.message }

  const acknowledged = formData.get('duplicate_of')
  const alreadyWarned = acknowledged === validation.name

  if (!alreadyWarned) {
    const duplicate = await findExistingName(supabase, validation.name)

    if (duplicate.failed) {
      return { error: 'Il cliente non è stato salvato. Riprova fra un momento.' }
    }

    // Avviso, non divieto: il software registra e mostra, non decide e non vieta (D14). Il
    // secondo Salva sullo stesso nome crea il cliente lo stesso.
    if (duplicate.found) return { duplicateOf: validation.name }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({ name: validation.name, owner_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    // Solo codice e messaggio: `details` conterrebbe il valore rifiutato, cioè un dato del
    // cliente, e nei log non ci finisce mai (kb-0.md §3).
    console.error('createClientRecord: insert rifiutato', { code: error?.code, message: error?.message })
    return { error: 'Il cliente non è stato salvato. Riprova fra un momento.' }
  }

  revalidatePath('/clienti')

  // redirect fuori da qualsiasi try/catch: funziona lanciando NEXT_REDIRECT, e dentro un
  // catch verrebbe inghiottito senza che la navigazione avvenga.
  redirect(`/clienti/${data.id}`)
}

/**
 * Confronto in memoria e non in SQL: "Acme Srl", "acme  srl" e "ACME SRL" sono lo stesso
 * cliente, e nessun filtro di PostgREST li riconosce senza una funzione nel database. Con
 * qualche centinaio di clienti leggere i soli nomi costa meno della migrazione che servirebbe.
 * La riga la filtra la policy, non questa query.
 */
async function findExistingName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<{ failed: boolean; found: boolean }> {
  const { data, error } = await supabase.from('clients').select('name')

  if (error) {
    console.error('createClientRecord: controllo doppioni fallito', {
      code: error.code,
      message: error.message,
    })
    return { failed: true, found: false }
  }

  const target = normalizeClientName(name)

  return { failed: false, found: data.some((row) => normalizeClientName(row.name) === target) }
}
