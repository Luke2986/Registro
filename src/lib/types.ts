import type { PersonFieldKey } from './person-fields'
import type { VerdictFieldKey } from './verdict'

import type { Database } from './database.types'

export type ClientRow = Database['public']['Tables']['clients']['Row']
export type PersonRow = Database['public']['Tables']['people']['Row']
export type AssessmentRow = Database['public']['Tables']['assessments']['Row']
export type AnswerRow = Database['public']['Tables']['answers']['Row']

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
 * Quello che la scheda cliente legge di una scheda di prequalifica, e non una riga in più: l'esito
 * e l'avanzamento sono **della 4.1**, che li mostra insieme nella card del cliente. Un dato letto e
 * non mostrato è una colonna che qualcuno mostrerà per sbaglio.
 *
 * La riga diceva «il verdetto è della Story 3.5» ed era sbagliata: la 3.5 scrive il verdetto dentro
 * la schermata di compilazione e non tocca questo tipo. Corretta il 10 agosto 2026, mentre il file
 * era comunque aperto, perché mandava chi implementa la 4.1 a cercare nella 3.5 qualcosa che non c'è.
 */
export type AssessmentSummary = Pick<AssessmentRow, 'id' | 'call_date' | 'interviewee_id'>

/**
 * Le cinque colonne del verdetto, derivate dai descrittori e non riscritte: se un campo entra in
 * `VERDICT_FIELDS` senza entrare nella `select` della schermata, il controllo dei tipi si ferma. È
 * la stessa regola già scritta due volte in questo file — si leggono esattamente le colonne che si
 * rendono.
 */
export type AssessmentVerdict = Pick<AssessmentRow, VerdictFieldKey>

/**
 * Quello che la schermata di compilazione legge di una risposta, e sono esattamente le colonne che
 * rende. `position` non c'è: serve alla lettura come chiave d'ordine e non arriva mai a schermo,
 * e un dato letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio — è l'argomento
 * già scritto su AssessmentSummary.
 *
 * Le tre copie che la 0015 ha aggiunto — `answer_type`, `options`, `help_text` — stanno qui e non
 * si risalgono da `questions`: una scheda resta leggibile com'era anche quando la domanda viva è
 * cambiata (database.md §3).
 */
export type AnswerDetail = Pick<
  AnswerRow,
  'id' | 'block_title' | 'question_text' | 'help_text' | 'answer_type' | 'options' | 'content'
>
