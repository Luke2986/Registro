import { createClient } from './server'

/**
 * `userId` è l'unica aggiunta rispetto alla forma che questa funzione aveva dentro actions.ts:
 * `owner_id` è `not null` senza default, quindi chi inserisce una riga deve saperlo, e la
 * sessione è già stata verificata qui. Chiederlo di nuovo con un secondo `getUser()` sarebbe
 * una seconda chiamata al servizio di autenticazione per un dato che abbiamo già in mano.
 */
export type SessionResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }

/**
 * Le azioni della scheda non mandano mai a /accedi, nemmeno quando la sessione è davvero
 * finita: una navigazione porterebbe via quello che è appena stato scritto negli altri campi,
 * cioè l'unica promessa non negoziabile del prodotto (NFR1). Chi non ha una sessione lo ferma
 * già il proxy prima di arrivare qui.
 *
 * createClientRecord tiene la sua copia della distinzione perché lì il redirect è parte
 * dell'azione: la creazione porta sulla scheda nuova, e senza sessione non c'è niente da salvare.
 *
 * Sta in un file suo e non dentro actions.ts perché serve anche alle azioni delle persone.
 * Esportarla da lì non era possibile: quel file ha `'use server'` in testa, quindi ogni suo
 * export diventa un punto di ingresso raggiungibile dal browser, e questa funzione restituisce
 * un client Supabase. Questo file non ha `'use server'`: è codice di server importato da chi ne
 * ha bisogno.
 */
export async function openSession(action: string): Promise<SessionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error(`${action}: auth non raggiungibile`, { status: authError.status })
    return { ok: false, error: 'Non è stato possibile verificare l’accesso. Riprova fra un momento.' }
  }

  if (!user) return { ok: false, error: 'L’accesso non è più valido. Ricarica la pagina per rientrare.' }

  return { ok: true, supabase, userId: user.id }
}
