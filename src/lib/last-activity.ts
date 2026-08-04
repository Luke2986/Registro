/**
 * L'ultima attività di un cliente è il maggiore fra la sua `updated_at` e quella delle sue
 * schede (database.md §5). PostgREST non ordina per un aggregato delle righe innestate: il
 * calcolo sta qui, in memoria. Il giorno in cui l'elenco viene paginato serve una vista, perché
 * ordinare in memoria vuol dire leggere tutto. Puro, senza React né Supabase (kb-0.md §7).
 */

/** Le due sole cose che servono al calcolo: chiedere la riga intera legherebbe il modulo allo schema. */
export type ActivityRow = {
  updated_at: string
  assessments: readonly { updated_at: string }[]
}

const byName = new Intl.Collator('it')

/**
 * Restituisce la stringa ISO vincente, non un numero: chi la riceve la passa a
 * formatLastActivity, che prende una stringa. Il confronto passa da Date.parse e mai dal
 * confronto fra stringhe: un timestamptz arriva come `2026-08-04T10:00:00.123456+00:00`, e due
 * valori con precisione o scostamento diversi si ordinano male alfabeticamente e giusto come
 * numeri. Una data illeggibile perde contro qualsiasi data valida; se nessuna è valida vince
 * `updated_at`, che nello schema è not null.
 */
export function lastActivityAt(row: ActivityRow): string {
  let winner = row.updated_at
  let winnerTime = Date.parse(winner)

  // `?? []` difende una forma che il tipo vieta: PostgREST risponde `[]` sugli innesti vuoti e
  // l'inferenza di supabase-js lo dichiara non nullabile. Ma è l'unica riga di questa story mai
  // vista girare su dati veri, e se rispondesse `null` il `for` cadrebbe dentro un componente
  // server, cioè fuori dal ramo d'errore della pagina, che quindi non riuscirebbe a rendersi.
  for (const assessment of row.assessments ?? []) {
    const time = Date.parse(assessment.updated_at)
    if (Number.isNaN(time)) continue
    if (Number.isNaN(winnerTime) || time > winnerTime) {
      winner = assessment.updated_at
      winnerTime = time
    }
  }

  return winner
}

/**
 * Una data illeggibile vale meno di qualsiasi data valida, come dice `lastActivityAt`. Serve un
 * numero e non `NaN`, perché `NaN` in un comparatore non rende una riga ultima: rende il
 * confronto indecidibile, e il ripiego che ne segue distrugge l'ordine di righe che con quella
 * riga non c'entrano niente.
 */
function activityTime(row: ActivityRow): number {
  const time = Date.parse(lastActivityAt(row))

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/**
 * Più recente prima; a parità esatta ordina per nome. Senza il secondo criterio due clienti con
 * lo stesso istante cambiano posto a ogni ricarica, e un elenco che si muove da solo è
 * indistinguibile da un difetto. `sort` è stabile dal 2019, ma la stabilità dipende dall'ordine
 * di partenza, cioè dal database: la stabilità che serve dev'essere dichiarata, non dedotta.
 *
 * Il confronto è sui valori e non sulla differenza. Sottrarre due istanti sembra più diretto, ma
 * fa comparire `NaN` appena uno dei due non si legge, e `−Infinity − (−Infinity)` è `NaN` anche
 * quando entrambi sono illeggibili: da lì il comparatore smette di essere transitivo e l'ordine
 * finale dipende da quello di partenza. Confrontando i valori l'ordine è totale sempre.
 */
export function byLastActivityDesc<T extends ActivityRow & { name: string }>(a: T, b: T): number {
  const timeA = activityTime(a)
  const timeB = activityTime(b)

  if (timeA !== timeB) return timeB > timeA ? 1 : -1

  return byName.compare(a.name, b.name)
}
