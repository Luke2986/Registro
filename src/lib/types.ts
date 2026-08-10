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
 * Quello che la scheda cliente legge di una scheda di prequalifica, e non una riga in più: un dato
 * letto e non mostrato è una colonna che qualcuno mostrerà per sbaglio.
 *
 * La riga diceva «il verdetto è della Story 3.5» ed era sbagliata: la 3.5 scrive il verdetto dentro
 * la schermata di compilazione e non tocca questo tipo. Corretta il 10 agosto 2026, mentre il file
 * era comunque aperto, perché mandava chi implementa la 4.1 a cercare nella 3.5 qualcosa che non c'è.
 *
 * `completion_status` è entrato con la Story 3.6, il 10 agosto 2026, e la regola qui sopra è stata
 * tenuta vera nello stesso commit: la colonna si legge **e** si rende, in `assessments-card.tsx`.
 *
 * `verdict` e `total_questions` sono entrati con la Story 4.1, lo stesso 10 agosto, e la regola è
 * stata tenuta vera allo stesso modo: la pillola d'esito e il contatore sono nella stessa riga, nello
 * stesso commit. Fino a ieri il commento diceva che erano «della 4.1» al futuro, e questa è quella.
 */
export type AssessmentSummary = Pick<
  AssessmentRow,
  'id' | 'call_date' | 'interviewee_id' | 'completion_status' | 'verdict' | 'total_questions'
>

/**
 * Quello che la card riceve davvero: la riga letta più il numeratore dell'avanzamento.
 *
 * `answered` non è una colonna e non può stare dentro il `Pick`: è il numero che il componente
 * server calcola con `countAnswered`, ed è **l'unica cosa che il browser deve sapere delle
 * risposte**. Le righe di `answers` restano sul server, perché passarle a un componente
 * `'use client'` vorrebbe dire spedire al browser il testo integrale di ogni risposta di ogni scheda
 * del cliente per rendere un `12 / 15` (kb-0.md §4).
 */
export type AssessmentListItem = AssessmentSummary & { answered: number }

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
