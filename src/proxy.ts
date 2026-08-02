import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { readSupabaseEnv } from '@/lib/supabase/env'

const PUBLIC_PATHS = ['/accedi', '/auth']

/**
 * Rinnova i cookie di sessione a ogni richiesta e tiene fuori chi non ha fatto l'accesso.
 * Non è l'unico controllo: i dati restano protetti dalla sicurezza a livello di riga,
 * che vale anche se una richiesta non passasse mai di qui.
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = readSupabaseEnv()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  if (!user && !isPublic) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/accedi'
    destination.search = ''
    return NextResponse.redirect(destination)
  }

  if (user && pathname.startsWith('/accedi')) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/clienti'
    destination.search = ''
    return NextResponse.redirect(destination)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
