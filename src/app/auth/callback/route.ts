import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Chiude il giro del collegamento inviato per email: scambia il codice con una sessione
 * e scrive i cookie. Un Route Handler può scriverli, un Server Component no.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Dietro un proxy l'origine reale sta nell'intestazione inoltrata, non nella richiesta.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost
      ? origin
      : `https://${forwardedHost}`

  if (!code) {
    return NextResponse.redirect(`${base}/accedi?errore=collegamento`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${base}/accedi?errore=collegamento`)
  }

  return NextResponse.redirect(`${base}/clienti`)
}
