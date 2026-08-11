/**
 * L'esito della scheda più recente di un cliente, per l'elenco. Puro, sotto test (kb-0.md §7).
 */

export type VerdictRow = {
  call_date: string
  created_at: string
  id: string
  verdict: string
}

function createdTime(row: VerdictRow): number {
  const time = Date.parse(row.created_at)

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/**
 * La stessa terna con cui la scheda cliente ordina le sue schede (`clienti/[id]/page.tsx`): copiata
 * apposta, così l'esito nell'elenco è quello della prima riga nella card.
 *
 * `call_date` si confronta come stringa e `created_at` no, e non è un'incoerenza: il primo è un
 * `date` a larghezza fissa, dove l'ordine lessicografico è quello cronologico; il secondo è un
 * `timestamptz`, dove il confronto fra stringhe sbaglia (`last-activity.ts`).
 *
 * Il limite: `Date.parse` tronca ai millisecondi mentre Postgres ordina sui microsecondi, quindi
 * due schede create nello stesso millisecondo qui le separa l'`id` e nella card i microsecondi.
 * L'invariante con la card vale fin lì.
 */
function winsOver(challenger: VerdictRow, holder: VerdictRow): boolean {
  if (challenger.call_date !== holder.call_date) return challenger.call_date > holder.call_date

  const challengerTime = createdTime(challenger)
  const holderTime = createdTime(holder)

  if (challengerTime !== holderTime) return challengerTime > holderTime

  return challenger.id < holder.id
}

/**
 * `null` e non `'non_deciso'` sull'elenco vuoto: `verdict` è `not null default 'non_deciso'`, quindi
 * «mai valutato» lo dice solo l'assenza di righe, e un ripiego renderebbe le due cose indistinguibili
 * senza rompere niente (AC2).
 */
export function latestVerdict(assessments: readonly VerdictRow[]): string | null {
  let winner: VerdictRow | null = null

  for (const assessment of assessments) {
    if (winner === null || winsOver(assessment, winner)) winner = assessment
  }

  return winner === null ? null : winner.verdict
}
