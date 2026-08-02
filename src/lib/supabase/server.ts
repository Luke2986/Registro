import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/database.types'

import { readSupabaseEnv } from './env'

export async function createClient() {
  const { url, publishableKey } = readSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Un Server Component non può scrivere cookie: il rinnovo della sessione
          // lo fa il proxy, quindi qui non c'è niente da fare.
        }
      },
    },
  })
}
