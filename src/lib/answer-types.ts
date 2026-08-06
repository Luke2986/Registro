/**
 * I quattro tipi di risposta, nell'ordine del vincolo `check` sulla tabella
 * (`0004_questionnaire.sql:41-42`).
 *
 * File puro, senza React e senza Supabase, così ci si può mettere un test sopra senza
 * impalcatura (kb-0.md §7).
 *
 * Qui la mappa `valore → etichetta` c'è, e in `client-status.ts` no: non è un'incoerenza fra i
 * due file. I cinque stati del cliente sono già le parole che compaiono a schermo, mentre
 * `testo_lungo` con la sottolineatura è un artefatto del database, e le etichette nominano le
 * cose come le riconosce chi le usa (design-system.md §7).
 */

/** `as const` non è cosmetico: senza, il tipo si allarga a string[] e AnswerType non vale più niente. */
export const ANSWER_TYPES = ['testo_lungo', 'testo_breve', 'numero', 'scelta_singola'] as const

export type AnswerType = (typeof ANSWER_TYPES)[number]

const VALUES: ReadonlySet<string> = new Set(ANSWER_TYPES)

export function isAnswerType(value: unknown): value is AnswerType {
  return typeof value === 'string' && VALUES.has(value)
}

/**
 * `Record<AnswerType, string>` e non `Record<string, string>`: il giorno che un quinto tipo entra
 * nel vincolo e non qui, il compilatore si ferma invece di lasciarlo senza etichetta in silenzio.
 */
const LABEL: Record<AnswerType, string> = {
  testo_lungo: 'testo lungo',
  testo_breve: 'testo breve',
  numero: 'numero',
  scelta_singola: 'scelta singola',
}

/**
 * La proprietà resta `string` perché `answer_type` è `string` nei tipi generati dallo schema, e
 * quei tipi non si modificano a mano. Un tipo fuori dai quattro si mostra grezzo invece di
 * rompere la pagina o di sparire, come fa già `StatusPill` con uno stato ignoto.
 */
export function answerTypeLabel(value: string): string {
  return isAnswerType(value) ? LABEL[value] : value
}
