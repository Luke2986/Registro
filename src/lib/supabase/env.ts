type SupabaseEnv = {
  url: string
  publishableKey: string
}

/**
 * Le due variabili si leggono per nome esteso e non da una mappa: solo così Next le
 * sostituisce nel bundle del browser al momento della build.
 */
export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Variabili mancanti: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  }

  return { url, publishableKey }
}
