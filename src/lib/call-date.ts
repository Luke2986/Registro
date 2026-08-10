/**
 * Una data scritta da una persona, validata sul server. File puro, senza React e senza Supabase,
 * perché è esattamente la logica che «rompendosi produce dati sbagliati» (kb-0.md §7): una data
 * storta dentro una scheda non produce nessun errore e nessuno se ne accorge, produce un archivio
 * che fra tre mesi dice che la call è avvenuta il giorno prima.
 *
 * **Nessun limite, né nel passato né nel futuro.** Una call di domani si prepara oggi, una di tre
 * mesi fa si registra adesso: il software registra e mostra, non decide e non vieta (D14).
 * L'unica cosa che si rifiuta è una stringa che non è una data.
 *
 * **Due entrate, una macchina sola.** La data della call e la data entro cui verificare una
 * condizione condividono la forma, il round-trip e il primo giorno, e differiscono **solo sul campo
 * svuotato**: la prima risponde oggi, perché la colonna ha un default; la seconda risponde `null`,
 * perché scrivere oggi vorrebbe dire inventare una scadenza che nessuno ha scritto. Sono nello
 * stesso file di proposito: due copie del round-trip divergerebbero alla prima riscrittura.
 */

export const CALL_DATE_INVALID = 'La data della call non è valida.'

/**
 * Suo e non `CALL_DATE_INVALID`, che nomina la call: qui la data è un'altra. Dice cosa fare invece
 * di cosa è successo, e nomina la via d'uscita — lasciare il campo vuoto è una risposta legittima
 * (kb-0.md §6, NFR16).
 */
export const VERIFY_BY_INVALID = 'Scegli una data valida, oppure lascia il campo vuoto.'

/** La forma che manda `<input type="date">`. `2026-2-3` non è quella, e si rifiuta. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Il primo giorno che una colonna `date` di Postgres accetta. JavaScript ha un anno zero e
 * Postgres no, quindi `0000-01-01` supera la forma e il round-trip e poi fa fallire l'insert con
 * un `22008`. Senza questa riga il rifiuto arriva lo stesso, ma con il messaggio sbagliato — un
 * «riprova» su una cosa che non riuscirà mai.
 */
const FIRST_DAY = '0001-01-01'

/**
 * Il nucleo condiviso dalle due entrate: la forma, il giorno che esiste davvero, il primo giorno
 * che il database accetta. Non esporta niente perché non è una decisione, è un controllo.
 */
function isCalendarDay(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false

  // La forma giusta non basta: `2026-02-31` ce l'ha e non esiste. Il round-trip lo scopre, perché
  // Date lo trasforma in `2026-03-03` e la stringa non torna quella di partenza.
  //
  // `Z` e non l'ora locale: senza, il round-trip dipenderebbe dal fuso della macchina, che è
  // esattamente la classe di difetto che D23 esiste per fermare.
  const parsed = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false

  // Confronto fra stringhe e non fra date: `AAAA-MM-GG` si ordina alfabeticamente come si ordina
  // cronologicamente, ed è già la forma che abbiamo in mano.
  return value >= FIRST_DAY
}

export type CallDateResult = { ok: true; date: string } | { ok: false; message: string }

export function validateCallDate(value: unknown, today: string): CallDateResult {
  // Campo svuotato: chi lo svuota non ha sbagliato niente, e la colonna ha comunque il suo
  // default. `undefined` è l'argomento non passato; `null` invece è la chiave assente da una
  // richiesta che il modulo rende sempre, cioè una richiesta che non doveva esistere, e cade
  // nel rifiuto qui sotto.
  if (value === undefined || value === '') return { ok: true, date: today }

  if (!isCalendarDay(value)) return { ok: false, message: CALL_DATE_INVALID }

  return { ok: true, date: value }
}

export type VerifyByResult = { ok: true; date: string | null } | { ok: false; message: string }

/**
 * La data entro cui verificare una condizione. **Il campo svuotato vale `null` e non oggi**, ed è
 * l'unica ragione per cui questa funzione esiste invece di riusare `validateCallDate`: una
 * scadenza che nessuno ha scritto non si inventa.
 */
export function validateVerifyBy(value: unknown): VerifyByResult {
  if (value === undefined || value === '') return { ok: true, date: null }

  if (!isCalendarDay(value)) return { ok: false, message: VERIFY_BY_INVALID }

  return { ok: true, date: value }
}
