import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'

import { readSupabaseEnv } from './env'

export function createClient() {
  const { url, publishableKey } = readSupabaseEnv()

  return createBrowserClient<Database>(url, publishableKey)
}
