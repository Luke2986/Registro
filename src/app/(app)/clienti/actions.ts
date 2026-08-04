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
import { isClientStatus } from '@/lib/client-status'
import { CLIENT_TAG_REMOVE_MAX_LENGTH, normalizeTag, parseTag } from '@/lib/client-tags'
import { createClient } from '@/lib/supabase/server'
import { openSession } from '@/lib/supabase/session'
import type { ClientRow } from '@/lib/types'
import { UUID } from '@/lib/uuid'
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

  // `id` è una colonna uuid: una stringa di altra forma fa rifiutare la query da Postgres. Qui
  // però non è un indirizzo storpiato come nella scheda, è una richiesta che non doveva
  // esistere, e si rifiuta prima di toccare il database.
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

export type UpdateClientStatusState = {
  error?: string
  /** Lo stato com'è adesso nel database. Sincronizza il selettore dopo il salvataggio. */
  saved?: string
}

/**
 * Azione separata da updateClientField, e non è una scelta di stile: `status` è una delle
 * colonne che l'allow-list dei campi esiste per rifiutare. Passando da lì, qualunque stringa
 * arrivata dal browser finirebbe in un update e la difesa resterebbe al vincolo `check` di
 * Postgres, che risponde in inglese e parla di un vincolo invece che di cosa fare.
 *
 * Nessuna condizione sullo stato di partenza, nessuna transizione ammessa o vietata, nessun
 * ordine fra i cinque valori: da qualsiasi stato si passa a qualsiasi altro. Il software
 * registra e mostra, non decide e non vieta (D14).
 */
export async function updateClientStatus(
  _previous: UpdateClientStatusState,
  formData: FormData,
): Promise<UpdateClientStatusState> {
  const session = await openSession('updateClientStatus')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')
  const status = formData.get('status')

  // Il selettore ha esattamente cinque opzioni: qualsiasi altro valore è una richiesta che non
  // doveva esistere. Nei log solo il fatto del rifiuto, come nelle altre azioni della scheda.
  if (typeof clientId !== 'string' || !UUID.test(clientId) || !isClientStatus(status)) {
    console.error('updateClientStatus: richiesta rifiutata')
    return { error: 'Lo stato non è stato salvato. Riprova fra un momento.' }
  }

  // updated_at lo aggiorna il trigger clients_set_updated_at (0006_triggers.sql).
  //
  // maybeSingle e non single: con la sicurezza a livello di riga attiva, la scheda di un altro
  // proprietario e una scheda cancellata arrivano identiche, cioè zero righe.
  const { data, error } = await session.supabase
    .from('clients')
    .update({ status })
    .eq('id', clientId)
    .select('id')
    .maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori della riga (kb-0.md §3).
    console.error('updateClientStatus: update rifiutato', { code: error.code, message: error.message })
    return { error: 'Lo stato non è stato salvato. Riprova fra un momento.' }
  }

  if (!data) return { error: 'Questa scheda non è più disponibile. Torna all’elenco.' }

  revalidatePath(`/clienti/${clientId}`)
  // Anche l'elenco: lo stato è una sua colonna, e la scrittura sposta updated_at, che è il suo
  // ordinamento.
  revalidatePath('/clienti')

  return { saved: status }
}

/** Entrambe le azioni sui tag rispondono la stessa cosa: l'errore, o niente. */
export type ClientTagsState = { error?: string }

/**
 * Nessun `saved` come nelle altre tre azioni: qui non c'è un campo da risincronizzare. I chip
 * li rende il server, e dopo `revalidatePath` arrivano dal payload rivalidato.
 *
 * Due azioni e non una che riceve l'elenco intero: mandare l'array completo dal browser
 * vorrebbe dire fidarsi del client su *quali* tag ha quel cliente, non solo su quale sta
 * aggiungendo. La policy protegge la riga di un altro proprietario, non la colonna scritta male
 * sulla propria (kb-0.md §3). Con due azioni il browser dice una parola sola e il server
 * calcola il resto.
 *
 * `tags` non entra in CLIENT_FIELDS e questa è la sola via di scrittura che ha: passando
 * dall'allow-list dei campi, updateClientField scriverebbe una stringa in una colonna text[].
 */
export async function addClientTag(
  _previous: ClientTagsState,
  formData: FormData,
): Promise<ClientTagsState> {
  const session = await openSession('addClientTag')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')

  if (typeof clientId !== 'string' || !UUID.test(clientId)) {
    console.error('addClientTag: richiesta rifiutata')
    return { error: TAG_NOT_SAVED }
  }

  // Sul server prima di comporre qualsiasi cosa: il maxLength dell'input serve a chi scrive,
  // non alla sicurezza (NFR10). Nei log niente del valore rifiutato: un tag è testo scritto da
  // una persona su un cliente reale, cioè un dato del cliente (kb-0.md §3).
  const parsed = parseTag(formData.get('tag'))

  if (!parsed.ok) return { error: parsed.message }

  const current = await session.supabase.from('clients').select('tags').eq('id', clientId).maybeSingle()

  if (current.error) {
    console.error('addClientTag: lettura fallita', {
      code: current.error.code,
      message: current.error.message,
    })
    return { error: TAG_NOT_SAVED }
  }

  if (!current.data) return { error: CLIENT_GONE }

  // Il tag c'è già: si esce senza scrivere e senza errore. Non è un rifiuto — è AC2 — e
  // soprattutto un update inutile sposterebbe updated_at, facendo saltare il cliente in cima
  // all'elenco per un tag che c'era già.
  //
  // Confrontato sul normalizzato e non per uguaglianza esatta: removeClientTag dichiara che
  // l'array può contenere valori scritti prima che la normalizzazione esistesse, e con un
  // confronto esatto `Referral` già in riga lascerebbe entrare anche `referral`. Due tag che si
  // leggono uguali e sono diversi sono esattamente quello che AC2 e D17 chiudono.
  //
  // Si rivalida lo stesso, pur non scrivendo niente: se il tag c'è nel database e non nei chip
  // che questa pagina mostra, la pagina è vecchia, e senza rivalidazione resterebbe vecchia
  // finché non la si ricarica a mano. updated_at non si muove, quindi l'ordine dell'elenco non
  // cambia.
  if (current.data.tags.some((it) => normalizeTag(it) === parsed.value)) {
    revalidatePath(`/clienti/${clientId}`)
    revalidatePath('/clienti')

    return {}
  }

  // In coda, mai ordinati: un sort() a ogni aggiunta rimescolerebbe i chip già presenti sotto
  // gli occhi di chi guarda, e nessuna AC chiede un ordine.
  //
  // updated_at lo aggiorna il trigger clients_set_updated_at (0006_triggers.sql), e la riga la
  // filtra la policy clients_owner_all: un .eq('owner_id', …) a mano sarebbe ridondante e
  // farebbe credere che sia lui a proteggere (D20).
  const { data, error } = await session.supabase
    .from('clients')
    .update({ tags: [...current.data.tags, parsed.value] })
    .eq('id', clientId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('addClientTag: update rifiutato', { code: error.code, message: error.message })
    return { error: TAG_NOT_SAVED }
  }

  if (!data) return { error: CLIENT_GONE }

  revalidatePath(`/clienti/${clientId}`)
  // Anche l'elenco, per due motivi insieme: i tag sono una sua colonna, e la scrittura sposta
  // updated_at, che oggi è il suo ordinamento.
  revalidatePath('/clienti')

  return {}
}

/**
 * Il tag arriva da un chip reso dal server, quindi è già nella forma memorizzata: si confronta
 * per uguaglianza esatta e **non** si normalizza. Normalizzarlo qui vorrebbe dire non poter più
 * togliere un tag scritto prima che la normalizzazione esistesse.
 *
 * Nessuna conferma prima di togliere: è reversibile — si riscrive in due secondi e il
 * suggerimento resta finché un altro cliente lo porta — e una conferma per un'azione
 * reversibile è rumore (kb-0.md §6).
 */
export async function removeClientTag(
  _previous: ClientTagsState,
  formData: FormData,
): Promise<ClientTagsState> {
  const session = await openSession('removeClientTag')

  if (!session.ok) return { error: session.error }

  const clientId = formData.get('client_id')
  const tag = formData.get('tag')

  // Il tetto non è il limite di un tag — quello vale in scrittura e stringerlo qui vorrebbe dire
  // non poter più togliere un tag scritto prima che esistesse — ma il punto oltre il quale la
  // stringa non può essere un valore memorizzato. Ogni input si valida sul server, anche quello
  // di una cancellazione (kb-0.md §3).
  const invalid =
    typeof clientId !== 'string' ||
    !UUID.test(clientId) ||
    typeof tag !== 'string' ||
    tag.length > CLIENT_TAG_REMOVE_MAX_LENGTH

  if (invalid) {
    console.error('removeClientTag: richiesta rifiutata')
    return { error: TAG_NOT_REMOVED }
  }

  const current = await session.supabase.from('clients').select('tags').eq('id', clientId).maybeSingle()

  if (current.error) {
    console.error('removeClientTag: lettura fallita', {
      code: current.error.code,
      message: current.error.message,
    })
    return { error: TAG_NOT_REMOVED }
  }

  if (!current.data) return { error: CLIENT_GONE }

  const remaining = current.data.tags.filter((it) => it !== tag)

  // Il tag non c'era: si esce senza scrivere, per lo stesso motivo dell'aggiunta di un tag già
  // presente. Un update che non cambia niente sposterebbe updated_at lo stesso. Si rivalida
  // comunque: un chip premuto due volte, o tolto altrove, vuol dire che questa pagina mostra
  // un elenco che nel database non c'è più.
  if (remaining.length === current.data.tags.length) {
    revalidatePath(`/clienti/${clientId}`)
    revalidatePath('/clienti')

    return {}
  }

  const { data, error } = await session.supabase
    .from('clients')
    .update({ tags: remaining })
    .eq('id', clientId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('removeClientTag: update rifiutato', { code: error.code, message: error.message })
    return { error: TAG_NOT_REMOVED }
  }

  if (!data) return { error: CLIENT_GONE }

  revalidatePath(`/clienti/${clientId}`)
  revalidatePath('/clienti')

  return {}
}

const TAG_NOT_SAVED = 'Il tag non è stato salvato. Riprova fra un momento.'
const TAG_NOT_REMOVED = 'Il tag non è stato tolto. Riprova fra un momento.'
const CLIENT_GONE = 'Questa scheda non è più disponibile. Torna all’elenco.'

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
