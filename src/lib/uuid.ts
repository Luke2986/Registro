/**
 * La regola dell'uuid, in un posto solo. Era scritta in due file — la scheda del cliente e le
 * sue azioni — e la voce rimandata del 3 agosto 2026 diceva di unificarla quando una terza rotta
 * ne avesse avuto bisogno. Le azioni delle persone sono la terza.
 *
 * File puro, senza React e senza Supabase (kb-0.md §7).
 *
 * Il motivo per cui il controllo esiste cambia da punto a punto, e per questo i commenti restano
 * dove si chiama: nella scheda distingue «una scheda che non c'è» da un guasto, nelle azioni
 * rifiuta una richiesta che non doveva esistere.
 */

/** Nessun flag `g`: con quello `test` ricorderebbe la posizione fra una chiamata e l'altra. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `id` è una colonna uuid: una stringa di altra forma fa rifiutare la query da Postgres. Quello
 * che arriva dal browser può essere qualsiasi cosa, un file compreso, quindi il tipo si verifica
 * qui insieme alla forma.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}
