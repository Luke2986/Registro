/**
 * Con quale controllo si rende una risposta, deciso dalla copia del tipo che sta dentro `answers`
 * e mai risalendo a `questions`: una scheda vecchia non si rende col questionario di oggi.
 *
 * File puro, senza React e senza Supabase, e non è un capriccio di struttura. Questa è logica che,
 * rompendosi, non dà nessun errore e produce un dato sbagliato — una `scelta_singola` resa come
 * campo libero, o una risposta riscritta da sola dal selettore — che è esattamente ciò a cui
 * `kb-0.md` §7 assegna i test automatici.
 *
 * **Il tipo è un'unione discriminata e non una stringa** perché la decisione sia una sola. Con una
 * stringa la resa dovrebbe comunque ricavarsi le opzioni per conto suo, e le due derivazioni
 * resterebbero d'accordo solo per l'ordine in cui sono scritte: il giorno che un tipo nuovo entra
 * di qua e non di là, il controllo dice una cosa e la schermata ne disegna un'altra, in silenzio.
 * Portandosi dietro le opzioni, invece, chi rende non ha più niente da decidere.
 */

export type AnswerControl =
  | { kind: 'lungo' }
  | { kind: 'breve' }
  | { kind: 'numero' }
  | { kind: 'scelta'; options: string[] }

/**
 * **I due ripieghi, e non sono difensivi per abitudine.** Una `scelta_singola` **senza opzioni**
 * cade sul testo breve, che è la forma che quella domanda avrebbe dovuto avere: senza il ripiego
 * non avrebbe nessun controllo. Un tipo **fuori dai quattro** cade sul testo lungo, che è il più
 * permissivo e mostra per intero quello che c'è — rendere grezzo invece di sparire o di far cadere
 * la pagina è il precedente di `answerTypeLabel` e di `StatusPill`, e vale ancora di più su una
 * copia storica, che per definizione può portare un vocabolario che il presente non conosce più.
 */
export function answerControl(answerType: string, options: string[] | null): AnswerControl {
  if (answerType === 'numero') return { kind: 'numero' }

  if (answerType === 'scelta_singola') {
    return options !== null && options.length > 0 ? { kind: 'scelta', options } : { kind: 'breve' }
  }

  if (answerType === 'testo_breve') return { kind: 'breve' }

  return { kind: 'lungo' }
}

/**
 * Il contenuto che non corrisponde a nessuna opzione, da rendere come opzione in coda.
 *
 * React, su un `value` che non corrisponde a nessuna `<option>`, seleziona la prima e cambia il
 * significato della risposta senza dire niente: qui il danno sarebbe una risposta riscritta da
 * sola. Con le copie della 0015 il caso è raro per costruzione, ma raro e impossibile non sono la
 * stessa cosa.
 */
export function orphanOption(content: string | null, options: string[]): string | null {
  return content !== null && content !== '' && !options.includes(content) ? content : null
}
