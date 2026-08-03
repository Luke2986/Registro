/**
 * I cinque stati del cliente, nell'ordine del vincolo `check` sulla tabella
 * (`0002_clients.sql:10`). Sono etichette descrittive, non gradini: nessuno vale più di un
 * altro e nessuno impedisce nessuna azione (D14).
 *
 * File puro, senza React e senza Supabase, così la Story 1.6 può metterci un test sopra
 * senza riscrivere niente (kb-0.md §7).
 *
 * Nessuna mappa `valore → etichetta`: i cinque valori del database sono già le parole che
 * compaiono nell'interfaccia, e una tabella che ripete `potenziale: 'potenziale'` sarebbe un
 * secondo posto da tenere allineato senza guadagnarci niente.
 */

/** `as const` non è cosmetico: senza, il tipo si allarga a string[] e ClientStatus non vale più niente. */
export const CLIENT_STATUSES = ['potenziale', 'valutato', 'attivo', 'chiuso', 'perso'] as const

export type ClientStatus = (typeof CLIENT_STATUSES)[number]

const VALUES: ReadonlySet<string> = new Set(CLIENT_STATUSES)

/**
 * Il server riceve dal browser il valore da scrivere nella colonna `status`. Qui non si
 * normalizza niente — niente `trim()`, niente minuscole — perché quel valore non lo scrive
 * una persona: lo manda un `select` costruito su questo stesso elenco. Qualsiasi altra cosa
 * è una richiesta che non doveva esistere, e si rifiuta (kb-0.md §3).
 */
export function isClientStatus(value: unknown): value is ClientStatus {
  return typeof value === 'string' && VALUES.has(value)
}
