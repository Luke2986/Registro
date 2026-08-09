import type { PersonFieldKey } from './person-fields'

import type { Database } from './database.types'

export type ClientRow = Database['public']['Tables']['clients']['Row']
export type PersonRow = Database['public']['Tables']['people']['Row']
export type AssessmentRow = Database['public']['Tables']['assessments']['Row']

/**
 * Quello che la scheda legge di una persona: i sei campi più le tre colonne che hanno una loro
 * azione. Il tipo si deriva da PERSON_FIELDS e non si riscrive: se un campo entra nell'elenco
 * senza entrare nella `select` della scheda, il controllo dei tipi si ferma.
 *
 * Sta qui e non dentro la pagina perché lo leggono anche i componenti del browser, e un tipo
 * importato da un modulo di pagina sarebbe una dipendenza al contrario.
 */
export type PersonDetail = Pick<PersonRow, 'id' | 'decision_roles' | 'is_primary' | PersonFieldKey>

/**
 * Quello che la scheda cliente legge di una scheda di prequalifica, e non una riga in più: il
 * verdetto è della Story 3.5, l'avanzamento della 4.1. Un dato letto e non mostrato è una colonna
 * che qualcuno mostrerà per sbaglio.
 */
export type AssessmentSummary = Pick<AssessmentRow, 'id' | 'call_date' | 'interviewee_id'>
