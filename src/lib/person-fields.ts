/**
 * Fonte unica dei campi della persona: da qui in poi nessun elenco di campi si riscrive a mano
 * da nessuna parte. Ci si derivano il modulo di creazione, il blocco della persona e il tipo
 * della query. È lo stesso patto di client-fields.ts, che esiste perché prima erano tre elenchi
 * paralleli e toglierne uno non produceva nessun errore di compilazione.
 *
 * File puro, senza React e senza Supabase, così la Story 1.6 può metterci un test sopra senza
 * riscrivere niente (kb-0.md §7).
 *
 * normalizeTextValue non è qui e non si riscrive: si importa da client-fields.ts. È già
 * «stringa vuota → null, mai '' nel database» e vale identica anche per le persone. Il nome del
 * file dice `client` e la funzione è generica: si annota, non si sposta.
 */

/** `as const` non è cosmetico: senza, `key` si allarga a string e PersonFieldKey non vale più niente. */
export const PERSON_FIELDS = [
  { key: 'first_name', label: 'Nome', kind: 'short' },
  { key: 'last_name', label: 'Cognome', kind: 'short' },
  { key: 'job_title', label: 'Ruolo in azienda', kind: 'short' },
  { key: 'email', label: 'Email', kind: 'email' },
  { key: 'phone', label: 'Telefono', kind: 'phone' },
  { key: 'notes', label: 'Note', kind: 'long' },
] as const

export type PersonField = (typeof PERSON_FIELDS)[number]
export type PersonFieldKey = (typeof PERSON_FIELDS)[number]['key']

/**
 * Un campo per colonna, mai il formData riversato in un oggetto e passato a update(). Sta qui e
 * non accanto alle azioni perché lo usano due file di azioni diversi, e un tipo derivato da
 * PERSON_FIELDS appartiene al posto dove PERSON_FIELDS è definita.
 */
export type PersonPatch = Partial<Record<PersonFieldKey, string | null>>

/**
 * `email` e `phone` sono due `kind` a sé e non `short` per una ragione sola: danno la tastiera
 * giusta sul tablet. Restano campi di testo, senza `type="email"` e senza validazione di
 * formato: un'email scritta a metà durante una call deve poter essere salvata, perché il
 * software registra e mostra, non decide e non vieta (D14).
 */
const KEYS: ReadonlySet<string> = new Set(PERSON_FIELDS.map((field) => field.key))

/**
 * L'azione riceve dal browser il nome della colonna da scrivere. Senza questo controllo
 * diventa una scrittura arbitraria su qualsiasi colonna: `client_id` sposterebbe la persona
 * sotto il cliente di un altro proprietario con una richiesta sola, `owner_id` gliela
 * regalerebbe, `is_primary` e `decision_roles` scavalcherebbero le azioni che li governano.
 * La policy protegge le righe di un altro proprietario, non la colonna sbagliata sulla
 * propria riga (kb-0.md §3).
 */
export function isPersonFieldKey(value: unknown): value is PersonFieldKey {
  return typeof value === 'string' && KEYS.has(value)
}

/**
 * Il nome da dire, non da mostrare: serve all'etichetta accessibile del pulsante che elimina e
 * alla riga di conferma, dove tre pulsanti chiamati tutti «Elimina» non si distinguono.
 *
 * Prende le due colonne che gli servono e non PersonRow: chiedere la riga intera legherebbe un
 * modulo puro allo schema. È la stessa regola già applicata a collectTagSuggestions.
 */
export function personDisplayName(person: { first_name: string | null; last_name: string | null }): string {
  const name = [person.first_name, person.last_name]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
    .join(' ')

  return name.length === 0 ? PERSON_UNNAMED : name
}

/**
 * Il ripiego, esportato perché serve anche al cestino, che di una persona archiviata ha
 * l'etichetta già composta e non le due colonne: `delete_person` la scrive vuota quando non c'è
 * nome, perché nel database una frase italiana rivolta a chi guarda lo schermo sarebbe fuori posto.
 */
export const PERSON_UNNAMED = 'Persona senza nome'
