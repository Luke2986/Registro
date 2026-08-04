/**
 * I cinque ruoli rispetto alla decisione, nell'ordine del vincolo `check` sulla tabella
 * (`0003_people.sql:14`). Sono multipli perché in una piccola impresa la stessa persona è tutte
 * le cose insieme (D13).
 *
 * File puro, senza React e senza Supabase, così la Story 1.6 può metterci un test sopra senza
 * riscrivere niente (kb-0.md §7).
 *
 * Qui la mappa `valore → etichetta` serve, al contrario di client-status.ts dove i cinque valori
 * del database erano già le parole dell'interfaccia: `puo_bloccare` non si mostra a nessuno, e
 * le etichette nominano le cose come le riconosce chi le usa (design-system.md §7).
 */

/** `as const` non è cosmetico: senza, `value` si allarga a string e DecisionRole non vale più niente. */
export const DECISION_ROLES = [
  { value: 'ha_il_problema', label: 'ha il problema' },
  { value: 'decide', label: 'decide' },
  { value: 'puo_bloccare', label: 'può bloccare' },
  { value: 'referente_operativo', label: 'referente operativo' },
  { value: 'interlocutore', label: 'interlocutore' },
] as const

export type DecisionRole = (typeof DECISION_ROLES)[number]['value']

const VALUES: ReadonlySet<string> = new Set(DECISION_ROLES.map((role) => role.value))

/**
 * Qui non si normalizza niente — niente `trim()`, niente minuscole — perché questi valori non
 * li scrive una persona: li mandano cinque caselle costruite su questo stesso elenco.
 */
export function isDecisionRole(value: unknown): value is DecisionRole {
  return typeof value === 'string' && VALUES.has(value)
}

export const DECISION_ROLES_INVALID = 'I ruoli non sono stati salvati. Ricarica la pagina e riprova.'

export type DecisionRolesResult = { ok: true; value: DecisionRole[] } | { ok: false; message: string }

/**
 * Union discriminata come TagResult ed EmployeesResult, non un oggetto con campi opzionali: con
 * `{ ok?, value?, message? }` esistono combinazioni impossibili e prima o poi il codice ne rende
 * una.
 *
 * Fa tre cose. **Rifiuta** qualsiasi valore fuori dal vocabolario invece di scartarlo in
 * silenzio: è una richiesta che non doveva esistere, come uno stato fuori dai cinque. **Toglie i
 * doppioni**, che non è teorico — il vincolo sulla tabella è `decision_roles <@ array[...]`,
 * cioè un test di sottoinsieme, e `['decide','decide']` lo passa. **Ritorna nell'ordine di
 * DECISION_ROLES**, così l'elenco memorizzato e quello a schermo si leggono uguali.
 *
 * L'elenco vuoto è valido e vuol dire «nessun ruolo».
 */
export function parseDecisionRoles(raw: readonly unknown[]): DecisionRolesResult {
  const chosen = new Set<DecisionRole>()

  for (const value of raw) {
    if (!isDecisionRole(value)) return { ok: false, message: DECISION_ROLES_INVALID }

    chosen.add(value)
  }

  return { ok: true, value: DECISION_ROLES.filter((role) => chosen.has(role.value)).map((role) => role.value) }
}
