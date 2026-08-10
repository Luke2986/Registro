/**
 * Se un'uscita dal campo rimasta in sospeso vada onorata, quando la scrittura che l'aveva
 * rifiutata si risolve.
 *
 * File puro, senza React, per la ragione di `kb-0.md` §7: questa decisione, sbagliandosi, non dà
 * nessun errore in nessuna delle due direzioni. Troppo permissiva rimanda la stessa scrittura due
 * volte; troppo stretta butta via il testo battuto mentre la richiesta viaggiava, che è
 * esattamente la perdita che il ricordo esiste per impedire. È anche l'unico pezzo verificabile
 * da solo di una correzione che per il resto vive dentro un hook del browser.
 */

/**
 * `owed` è il testo che il campo aveva quando è uscito senza poter scrivere, `sent` quello che la
 * scrittura in volo aveva mandato, `saved` quello che il server ha risposto di aver salvato —
 * `undefined` se la scrittura è fallita o se l'azione non lo dice.
 *
 * **La stringa vuota è un valore e non un'assenza:** svuotare un campo è una modifica come
 * un'altra, e un controllo scritto sulla verità di `owed` la butterebbe via in silenzio. Il
 * ricordo assente è `null`, e solo quello.
 *
 * **Risponde `boolean` e non un predicato di tipo `owed is string`,** che pure farebbe scrivere
 * `write(owed)` senza un `as`: un predicato promette al compilatore che un `false` implica
 * `owed === null`, mentre qui il `false` arriva anche su una stringa. Sarebbe una restrizione
 * falsa, e un `as` almeno si vede in revisione. Chi lo chiama esce prima su `owed !== null`, che
 * restringe davvero e non costa niente.
 */
export function shouldHonourExit(
  owed: string | null,
  sent: string,
  saved: string | undefined,
): boolean {
  if (owed === null) return false

  // È il testo che la scrittura appena conclusa aveva già mandato: chi è uscito senza battere
  // altro non ha niente da salvare che non sia già partito.
  if (owed === sent) return false

  // È già quello che il server ha salvato: il ripulito coincide con quello che resta a schermo,
  // e riscriverlo sarebbe la stessa richiesta due volte.
  if (owed === saved) return false

  return true
}
