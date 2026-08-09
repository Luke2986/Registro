/**
 * Le risposte di una scheda, raggruppate per blocco.
 *
 * File puro, senza React e senza Supabase, così ci si può mettere un test sopra senza
 * impalcatura (kb-0.md §7). È lo stesso patto di client-tags.ts e answer-types.ts.
 *
 * **Si raggruppa per corse consecutive, non con una mappa `titolo → risposte`**, ed è la ragione
 * per cui questa funzione esiste invece di tre righe dentro la pagina. Due blocchi possono avere
 * lo stesso titolo — `question_blocks` non ha nessun indice unico su `title` — e una mappa li
 * fonderebbe in uno, spostando le domande del secondo dentro il primo e cambiando l'ordine
 * dell'intervista. Nessun errore lo direbbe: la scheda si renderebbe, sbagliata. Una corsa
 * consecutiva invece lascia due gruppi omonimi dove erano.
 */

export type AnswerGroup<T> = { title: string; answers: T[] }

/**
 * Generica sul tipo delle righe: serve un `block_title` e basta, e chiedere la riga intera
 * legherebbe un modulo puro allo schema — è lo stesso argomento già scritto su
 * `collectTagSuggestions`.
 *
 * **Le risposte arrivano già ordinate** (`position` poi `id`, dalla lettura della pagina): qui
 * non si riordina niente, perché l'ordine dell'intervista è quello che il database ha dato e
 * ricalcolarlo qui vorrebbe dire due sorgenti d'ordine destinate a divergere.
 */
export function groupAnswersByBlock<T extends { block_title: string }>(
  answers: readonly T[],
): AnswerGroup<T>[] {
  const groups: AnswerGroup<T>[] = []

  for (const answer of answers) {
    const current = groups.at(-1)

    // Solo l'ultimo gruppo, mai una ricerca fra tutti: è questo confronto a fare la corsa.
    if (current !== undefined && current.title === answer.block_title) {
      current.answers.push(answer)
      continue
    }

    groups.push({ title: answer.block_title, answers: [answer] })
  }

  return groups
}
