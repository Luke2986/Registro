'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  EMPLOYEES_NEGATIVE_MESSAGE,
  isClientFieldKey,
  normalizeTextValue,
  parseEmployees,
  type ClientFieldKey,
} from '@/lib/client-fields'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'
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

export type UpdateClientFieldState = {
  error?: string
  /** Il valore com'è adesso nel database, reso stringa. Sincronizza il campo dopo il salvataggio. */
  saved?: string
}

/** Un campo per chiamata: mai il formData riversato in un oggetto e passato a update(). */
type ClientPatch = Partial<Pick<ClientRow, ClientFieldKey>>

/**
 * Modifica in linea di un campo della scheda. Non finisce con un redirect, ed è l'unica
 * azione del progetto che non lo fa: la modifica non porta da nessuna parte, si resta dove
 * si è.
 */
export async function updateClientField(
  _previous: UpdateClientFieldState,
  formData: FormData,
): Promise<UpdateClientFieldState> {
  const session = await openSession('updateClientField')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')
  const field = formData.get('field')

  if (typeof clientId !== 'string' || !UUID.test(clientId) || !isClientFieldKey(field)) {
    // Nei log solo la chiave rifiutata: il valore è un dato del cliente (kb-0.md §3).
    console.error('updateClientField: richiesta rifiutata', { field })
    return { error: 'Il campo non è stato salvato. Riprova fra un momento.' }
  }

  const raw = formData.get('value')

  // Svuotare un campo si fa mandando una stringa vuota. Una chiave `value` assente, o un file
  // al suo posto, non è quello: è una richiesta malformata, e trattarla come "svuota" vorrebbe
  // dire cancellare una colonna e rispondere che è andata bene.
  if (typeof raw !== 'string') {
    console.error('updateClientField: valore mancante', { field })
    return { error: 'Il campo non è stato salvato. Riprova fra un momento.' }
  }

  const patch: ClientPatch = {}
  let saved: string

  // employees è isolato perché è l'unico non testuale: separandolo, il resto della union ha
  // tutto lo stesso tipo string | null e l'assegnazione con chiave variabile compila senza
  // forzature.
  if (field === 'employees') {
    const parsed = parseEmployees(raw)

    if (!parsed.ok) return { error: parsed.message }

    patch.employees = parsed.value
    saved = parsed.value === null ? '' : String(parsed.value)
  } else {
    const value = normalizeTextValue(raw)

    patch[field] = value
    saved = value ?? ''
  }

  // updated_at non si scrive mai qui: lo aggiorna il trigger clients_set_updated_at, che è
  // before update (0006_triggers.sql). Scriverlo a mano vorrebbe dire tenere due posti allineati.
  //
  // maybeSingle e non single: con la sicurezza a livello di riga attiva, la scheda di un altro
  // proprietario e una scheda cancellata arrivano identiche, cioè zero righe, e con single
  // diventerebbero un errore invece di un messaggio comprensibile.
  const { data, error } = await session.supabase
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .select('id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe il valore rifiutato (kb-0.md §3).
    console.error('updateClientField: update rifiutato', { code: error.code, message: error.message })

    // 23514 è il vincolo employees >= 0. È l'ultima difesa e non dovrebbe scattare mai, perché
    // parseEmployees rifiuta prima: se scatta, il messaggio resta il nostro e non quello di Postgres.
    if (error.code === '23514') return { error: EMPLOYEES_NEGATIVE_MESSAGE }

    return { error: 'Il campo non è stato salvato. Riprova fra un momento.' }
  }

  if (!data) return { error: 'Questa scheda non è più disponibile. Torna all’elenco.' }

  revalidatePath(`/clienti/${clientId}`)
  // Anche l'elenco: la modifica sposta updated_at, che è il suo ordinamento.
  revalidatePath('/clienti')

  return { saved }
}

export type RenameClientState = {
  error?: string
  /** Il nome su cui è stato dato l'avviso di doppione: rimandandolo indietro, la rinomina passa. */
  duplicateOf?: string
  /** Il nome com'è adesso nel database, già ripulito. */
  saved?: string
}

/**
 * Azione separata da updateClientField, non un undicesimo campo: il nome ha tre regole che
 * gli altri non hanno — limite di lunghezza, caratteri invisibili tolti, avviso di doppione —
 * e passando dall'allow-list dei campi si perderebbero tutte e tre in silenzio.
 */
export async function renameClient(
  _previous: RenameClientState,
  formData: FormData,
): Promise<RenameClientState> {
  const session = await openSession('renameClient')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')

  if (typeof clientId !== 'string' || !UUID.test(clientId)) {
    console.error('renameClient: richiesta rifiutata')
    return { error: 'Il nome non è stato salvato. Riprova fra un momento.' }
  }

  const validation = validateClientName(formData.get('name'))

  if (!validation.ok) return { error: validation.message }

  const acknowledged = formData.get('duplicate_of')
  const alreadyWarned = acknowledged === validation.name

  if (!alreadyWarned) {
    const duplicate = await findExistingName(session.supabase, validation.name, clientId)

    if (duplicate.failed) return { error: 'Il nome non è stato salvato. Riprova fra un momento.' }

    // Avviso, non divieto: il software registra e mostra, non decide e non vieta (D14). Il
    // secondo Salva sullo stesso nome rinomina lo stesso.
    if (duplicate.found) return { duplicateOf: validation.name }
  }

  const { data, error } = await session.supabase
    .from('clients')
    .update({ name: validation.name })
    .eq('id', clientId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('renameClient: update rifiutato', { code: error.code, message: error.message })
    return { error: 'Il nome non è stato salvato. Riprova fra un momento.' }
  }

  if (!data) return { error: 'Questa scheda non è più disponibile. Torna all’elenco.' }

  revalidatePath(`/clienti/${clientId}`)
  // Il nome è la prima colonna dell'elenco: senza questa, lì resta quello vecchio.
  revalidatePath('/clienti')

  return { saved: validation.name }
}

/**
 * `id` è una colonna uuid: una stringa di altra forma fa rifiutare la query da Postgres. Qui
 * però non è un indirizzo storpiato come nella scheda, è una richiesta che non doveva esistere,
 * e si rifiuta prima di toccare il database.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SessionResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }

/**
 * Le azioni della scheda non mandano mai a /accedi, nemmeno quando la sessione è davvero
 * finita: una navigazione porterebbe via quello che è appena stato scritto negli altri dieci
 * campi, cioè l'unica promessa non negoziabile del prodotto (NFR1). Chi non ha una sessione
 * lo ferma già il proxy prima di arrivare qui.
 *
 * createClientRecord tiene la sua copia della distinzione perché lì il redirect è parte
 * dell'azione: la creazione porta sulla scheda nuova, e senza sessione non c'è niente da salvare.
 */
async function openSession(action: string): Promise<SessionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error(`${action}: auth non raggiungibile`, { status: authError.status })
    return { ok: false, error: 'Non è stato possibile verificare l’accesso. Riprova fra un momento.' }
  }

  if (!user) return { ok: false, error: 'L’accesso non è più valido. Ricarica la pagina per rientrare.' }

  return { ok: true, supabase }
}

/**
 * Confronto in memoria e non in SQL: "Acme Srl", "acme  srl" e "ACME SRL" sono lo stesso
 * cliente, e nessun filtro di PostgREST li riconosce senza una funzione nel database. Con
 * qualche centinaio di clienti leggere i soli nomi costa meno della migrazione che servirebbe.
 * La riga la filtra la policy, non questa query.
 *
 * `exceptId` salta la riga che si sta rinominando: senza, il cliente risulterebbe doppione di
 * se stesso e cambiare una sola maiuscola chiederebbe due Salva. La creazione la chiama senza
 * il parametro e si comporta come prima.
 */
async function findExistingName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  exceptId?: string,
): Promise<{ failed: boolean; found: boolean }> {
  const { data, error } = await supabase.from('clients').select('id, name')

  if (error) {
    console.error('findExistingName: controllo doppioni fallito', {
      code: error.code,
      message: error.message,
    })
    return { failed: true, found: false }
  }

  const target = normalizeClientName(name)

  return {
    failed: false,
    found: data.some((row) => row.id !== exceptId && normalizeClientName(row.name) === target),
  }
}
