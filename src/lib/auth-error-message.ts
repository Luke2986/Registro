/** Forma strutturale dell'errore di Supabase: evita di dipendere da un tipo non esportato. */
type AuthFailure = { status?: number | undefined; code?: string | undefined }

/**
 * Il messaggio dice cosa fare, e la causa più frequente non è l'indirizzo sbagliato: è il tetto
 * di invii dell'SMTP integrato di Supabase, basso di proposito. Confonderlo con un errore di
 * digitazione manda a cercare il guasto dalla parte opposta, e il tetto nel frattempo resta.
 *
 * Funzione pura ed esportata perché la Story 1.6 possa metterci un test sopra.
 */
export function authErrorMessage(error: AuthFailure): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Troppe richieste di collegamento. Aspetta qualche minuto, poi riprova una volta sola.'
  }

  if (error.status === undefined || error.status >= 500) {
    return 'Il servizio di accesso non ha risposto. Riprova fra un momento.'
  }

  return 'Il collegamento non è partito. Controlla l’indirizzo e riprova.'
}
