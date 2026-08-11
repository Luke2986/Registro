'use server'

import { cookies } from 'next/headers'

/**
 * Scrive la preferenza «nav richiusa» in un cookie letto dal Server Component `layout.tsx`.
 *
 * **Cookie e non `localStorage`, e va detto perché la prima intuizione è l'altra.** `layout.tsx` è
 * un Server Component e questa story vuole che resti tale: un cookie si legge sul server, un
 * `localStorage` no. Con `localStorage` il primo render arriverebbe sempre espanso e la nav
 * lampeggerebbe stringendosi dopo l'idratazione — visibile ogni volta che si torna
 * sull'applicazione, che è ogni volta che il collegamento email consuma la sessione. Il cookie è
 * l'unica strada che non chiede a `layout.tsx` di diventare client, e il precedente è già dentro
 * `@supabase/ssr`, che scrive i suoi via cookie e non via storage.
 *
 * **`httpOnly: false` è deliberato**, e va scritto perché la regola generale del progetto è
 * l'opposto: qui è una preferenza di forma, non un token, e non vederlo dal browser vorrebbe dire
 * non poterlo leggere in un futuro componente client che non abbia percorso il ciclo di rerender
 * del server. Nessuna informazione sensibile.
 *
 * **Nessun `redirect`, nessun `revalidatePath`**: la nav si aggiorna al prossimo render del layout,
 * che il toggle chiede con `router.refresh()` dopo aver chiamato l'azione.
 */
export async function setNavCollapsed(collapsed: boolean): Promise<void> {
  const store = await cookies()
  store.set({
    name: 'nav_collapsed',
    value: collapsed ? '1' : '0',
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })
}
