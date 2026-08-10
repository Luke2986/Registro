import { normalizeTextValue } from './client-fields.ts'

/**
 * L'avanzamento di una scheda: quante domande hanno una risposta, sul totale che quella scheda
 * conteneva quando è stata aperta (D16). Il denominatore non si calcola qui e non si calcola
 * affatto — è `assessments.total_questions`, congelato da `open_assessment` e mai più toccato —
 * quindi questo modulo porta il solo numeratore e la larghezza della barra.
 *
 * `database.md` §3 dà la definizione in SQL, `count(…) filter (where coalesce(trim(content), '')
 * <> '')`. Quel SQL non gira: PostgREST non calcola l'aggregato sulle righe innestate in un modo
 * che qui convenga, e ottenerlo dal database vorrebbe dire una vista o una colonna materializzata,
 * cioè una migrazione per rendere un numero a schermo. Si legge `answers(content)` innestato e si
 * conta in memoria, che è la stessa forma e lo stesso motivo di `last-activity.ts` (D23).
 *
 * Puro, senza React e senza Supabase, così `npm test` lo copre senza riscrivere niente
 * (kb-0.md §7). Il conteggio gira nel componente server: `assessments-card.tsx` è `'use client'` e
 * le sue prop finiscono nel payload spedito al browser, dove il testo delle risposte non ha nessuna
 * ragione di arrivare (kb-0.md §4).
 *
 * Sta fuori da `last-activity.ts` benché siano due calcoli in memoria sulle stesse righe innestate:
 * quello risponde a «quando questo cliente è stato toccato l'ultima volta» e serve all'ordinamento
 * dell'elenco, questo a «quanto è piena questa scheda» e serve alla card del cliente. Insieme
 * sarebbero un file che due schermate importano per metà ciascuna.
 */

/** La sola colonna che serve: chiedere `AnswerRow` legherebbe il modulo allo schema (`last-activity.ts`). */
export type AnsweredRow = { content: string | null }

/**
 * Il numeratore. La definizione di «vuoto» è importata e non riscritta: è la stessa che `saveAnswer`
 * applica scrivendo (`answer-actions.ts`), ed è ciò che tiene d'accordo per costruzione i due lati
 * dello stesso numero. Una riga di soli spazi non conta come risposta (AC3).
 */
export function countAnswered(answers: readonly AnsweredRow[]): number {
  let answered = 0

  for (const answer of answers) {
    if (normalizeTextValue(answer.content) !== null) answered += 1
  }

  return answered
}

/**
 * La larghezza del riempimento della barra, da 0 a 100.
 *
 * **Il nome dice «percent» e a schermo la percentuale non compare mai** (AC2): questo numero
 * finisce in un `width` CSS e non in un testo. Quello che si legge è il contatore accanto, `12 / 15`.
 *
 * Totale a zero risponde `0` e non `NaN`: `total_questions` è `not null default 0` nello schema,
 * quindi lo zero è un ingresso ammesso, e `width: NaN%` è una barra che sparisce senza dare nessun
 * errore. `open_assessment` non apre schede su zero domande attive, quindi oggi il caso non è
 * raggiungibile — la funzione dev'essere totale lo stesso, per la ragione per cui `activityTime`
 * restituisce un numero e mai `NaN`.
 *
 * La guardia è `!(total > 0)` e non `total <= 0`, e la differenza è tutta: `NaN <= 0` è **falso**,
 * quindi la forma ovvia lasciava passare proprio l'ingresso che la funzione dichiara di fermare, e
 * `Math.min(100, NaN)` risponde `NaN`. Corretta con la revisione della 4.1.
 */
export function progressFillPercent(answered: number, total: number): number {
  if (!(total > 0)) return 0

  return Math.min(100, (answered / total) * 100)
}
