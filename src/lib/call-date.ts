/**
 * La data di una call, validata sul server. File puro, senza React e senza Supabase, perché è
 * esattamente la logica che «rompendosi produce dati sbagliati» (kb-0.md §7): una data storta
 * dentro una scheda non produce nessun errore e nessuno se ne accorge, produce un archivio che
 * fra tre mesi dice che la call è avvenuta il giorno prima.
 *
 * **Nessun limite, né nel passato né nel futuro.** Una call di domani si prepara oggi, una di tre
 * mesi fa si registra adesso: il software registra e mostra, non decide e non vieta (D14).
 * L'unica cosa che si rifiuta è una stringa che non è una data.
 */

export const CALL_DATE_INVALID = 'La data della call non è valida.'

/** La forma che manda `<input type="date">`. `2026-2-3` non è quella, e si rifiuta. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Il primo giorno che una colonna `date` di Postgres accetta. JavaScript ha un anno zero e
 * Postgres no, quindi `0000-01-01` supera la forma e il round-trip e poi fa fallire l'insert con
 * un `22008`. Senza questa riga il rifiuto arriva lo stesso, ma con il messaggio sbagliato — un
 * «riprova» su una cosa che non riuscirà mai.
 */
const FIRST_DAY = '0001-01-01'

export type CallDateResult = { ok: true; date: string } | { ok: false; message: string }

export function validateCallDate(value: unknown, today: string): CallDateResult {
  // Campo svuotato: chi lo svuota non ha sbagliato niente, e la colonna ha comunque il suo
  // default. `undefined` è l'argomento non passato; `null` invece è la chiave assente da una
  // richiesta che il modulo rende sempre, cioè una richiesta che non doveva esistere, e cade
  // nel rifiuto qui sotto.
  if (value === undefined || value === '') return { ok: true, date: today }

  if (typeof value !== 'string' || !ISO_DAY.test(value)) return { ok: false, message: CALL_DATE_INVALID }

  // La forma giusta non basta: `2026-02-31` ce l'ha e non esiste. Il round-trip lo scopre, perché
  // Date lo trasforma in `2026-03-03` e la stringa non torna quella di partenza.
  //
  // `Z` e non l'ora locale: senza, il round-trip dipenderebbe dal fuso della macchina, che è
  // esattamente la classe di difetto che D23 esiste per fermare.
  const parsed = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { ok: false, message: CALL_DATE_INVALID }
  }

  // Confronto fra stringhe e non fra date: `AAAA-MM-GG` si ordina alfabeticamente come si ordina
  // cronologicamente, ed è già la forma che abbiamo in mano.
  if (value < FIRST_DAY) return { ok: false, message: CALL_DATE_INVALID }

  return { ok: true, date: value }
}
