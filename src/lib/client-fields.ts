/**
 * Fonte unica dei campi modificabili del cliente: da qui in poi nessun elenco di campi si
 * riscrive a mano da nessuna parte. Prima erano tre elenchi paralleli dentro la scheda, e
 * toglierne uno non produceva nessun errore di compilazione: il campo spariva in silenzio.
 *
 * File puro, senza React e senza Supabase, così la Story 1.6 può metterci un test sopra
 * senza riscrivere niente (kb-0.md §7).
 *
 * `name` non è qui, e non è una dimenticanza: ha tre regole sue — limite di lunghezza,
 * caratteri invisibili tolti, avviso di doppione — che vivono in validate-client-name.ts.
 * Dentro questo elenco passerebbe da normalizeTextValue e sparirebbero tutte e tre senza
 * che nessun compilatore se ne accorga. La rinomina è un'azione separata.
 */

/** `as const` non è cosmetico: senza, `key` si allarga a string e ClientFieldKey non vale più niente. */
export const CLIENT_FIELDS = [
  { key: 'sector', label: 'Settore', kind: 'short' },
  { key: 'website', label: 'Sito web', kind: 'short' },
  { key: 'city', label: 'Città', kind: 'short' },
  { key: 'province', label: 'Provincia', kind: 'short' },
  { key: 'address', label: 'Indirizzo', kind: 'short' },
  { key: 'source_channel', label: 'Come è arrivato', kind: 'short' },
  { key: 'revenue', label: 'Fatturato', kind: 'short' },
  { key: 'employees', label: 'Dipendenti', kind: 'integer' },
  { key: 'business_goals', label: 'Obiettivi', kind: 'long' },
  { key: 'notes', label: 'Note', kind: 'long' },
] as const

export type ClientField = (typeof CLIENT_FIELDS)[number]
export type ClientFieldKey = (typeof CLIENT_FIELDS)[number]['key']

/**
 * Il descrittore del nome: **fuori** da CLIENT_FIELDS di proposito, così isClientFieldKey
 * continua a rifiutare 'name' e la rinomina resta un'azione a sé con le sue tre regole.
 * Ha la stessa forma degli altri perché lo rende lo stesso componente.
 *
 * Sta qui e non dentro il componente perché quel file è 'use client': un valore esportato da
 * un modulo client, letto da un Server Component, non è l'oggetto ma un riferimento al client,
 * e `key` arriverebbe `undefined`. Provato, non dedotto.
 */
export const NAME_FIELD = { key: 'name', label: 'Nome del cliente', kind: 'name' } as const

/**
 * Il descrittore dello stato: **fuori** da CLIENT_FIELDS come il nome, e per un motivo più
 * severo. `status` è una delle colonne che isClientFieldKey esiste per rifiutare: dentro
 * l'elenco, updateClientField accetterebbe qualunque stringa arrivi dal browser e la
 * scriverebbe, lasciando la difesa al vincolo `check` di Postgres, cioè un messaggio in
 * inglese al posto sbagliato. Il vocabolario dei cinque valori sta in client-status.ts, e
 * l'azione che lo usa è updateClientStatus.
 *
 * Sta qui e non dentro il componente per la stessa ragione di NAME_FIELD: un valore esportato
 * da un modulo 'use client', letto da un Server Component, non è l'oggetto ma un riferimento
 * al client, e `key` arriverebbe `undefined`.
 */
export const STATUS_FIELD = { key: 'status', label: 'Stato', kind: 'status' } as const

export type EditableField = ClientField | typeof NAME_FIELD | typeof STATUS_FIELD

const KEYS: ReadonlySet<string> = new Set(CLIENT_FIELDS.map((field) => field.key))

/**
 * L'azione riceve dal browser il nome della colonna da scrivere. Senza questo controllo
 * diventa una scrittura arbitraria su qualsiasi colonna, owner_id, status e name compresi:
 * la policy protegge le righe di un altro proprietario, non la colonna sbagliata sulla
 * propria riga (kb-0.md §3).
 */
export function isClientFieldKey(value: unknown): value is ClientFieldKey {
  return typeof value === 'string' && KEYS.has(value)
}

/**
 * Stringa vuota → null, mai '' nel database: un campo svuotato deve tornare vuoto, e ''
 * è un dato che si mostra come dato (D13).
 */
export function normalizeTextValue(raw: unknown): string | null {
  const text = typeof raw === 'string' ? raw.trim() : ''

  return text.length === 0 ? null : text
}

export type EmployeesResult = { ok: true; value: number | null } | { ok: false; message: string }

/**
 * Esportato perché lo dice anche il vincolo employees >= 0 quando è lui a rifiutare la
 * scrittura: due copie della stessa frase si allontanerebbero alla prima riscrittura.
 */
export const EMPLOYEES_NEGATIVE_MESSAGE =
  'Il numero di dipendenti non può essere negativo. Lascia il campo vuoto se non lo sai.'

/** Il massimo di un integer di Postgres: oltre, l'errore arriverebbe dal database in inglese. */
const EMPLOYEES_MAX = 2_147_483_647

const INTEGER = /^-?\d+$/

/**
 * Non Number(raw): Number('') è 0, quindi svuotare il campo scriverebbe zero dipendenti.
 * Vuoto e zero sono due risposte diverse, e questa funzione esiste per tenerle separate.
 *
 * Il vincolo employees >= 0 sulla tabella resta l'ultima difesa, non la prima: da lì il
 * messaggio arriverebbe in inglese e parlerebbe di un vincolo, non di cosa fare.
 */
export function parseEmployees(raw: unknown): EmployeesResult {
  const text = typeof raw === 'string' ? raw.trim() : ''

  if (text.length === 0) return { ok: true, value: null }

  if (!INTEGER.test(text)) {
    return { ok: false, message: 'Scrivi il numero di dipendenti in cifre, senza altri caratteri.' }
  }

  const value = Number(text)

  // Object.is e non solo `< 0`: in JavaScript `-0 < 0` è falso, quindi "-0" passerebbe il
  // controllo e finirebbe scritto come zero invece di essere rifiutato come il segno che è.
  if (value < 0 || Object.is(value, -0)) return { ok: false, message: EMPLOYEES_NEGATIVE_MESSAGE }

  if (value > EMPLOYEES_MAX) return { ok: false, message: 'Il numero è troppo grande.' }

  return { ok: true, value }
}
