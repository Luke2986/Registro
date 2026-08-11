import { cookies } from 'next/headers'

import { SignOutButton } from '@/components/sign-out-button'

import { Nav } from './nav'
import { SidebarToggle } from './sidebar-toggle'

/**
 * Il layout resta un Server Component: `cookies()` si legge qui, e la classe `.sidebar--collapsed`
 * arriva nel primo render senza salti dopo l'idratazione. La ragione lunga sta in `nav-actions.ts`.
 *
 * Nessun cookie = espansa: al primo accesso si vedono le etichette prima di scegliere se stringerle.
 *
 * **`<main>` non sta più qui, dalla Story 5.2, e chi aggiunge una foglia sotto `(app)/` deve
 * saperlo:** il landmark lo rende ogni rotta, perché porta la classe della propria sezione e da
 * lì arriva la tinta dell'alone del fuoco (`globals.css`, regole `.shell:has(…)`). Il layout è un
 * Server Component e il pathname non ce l'ha, quindi la sezione non può che dirla la rotta.
 * Una foglia nuova senza il suo `<main className="main …">` perde il respiro della pagina: sono
 * `page.tsx`, `loading.tsx`, `error.tsx` e `not-found.tsx`.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const collapsed = (await cookies()).get('nav_collapsed')?.value === '1'

  return (
    <div className="shell">
      <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__brand-text">Registro</span>
          <SidebarToggle defaultCollapsed={collapsed} />
        </div>
        <Nav />
        <div className="sidebar__foot">
          <SignOutButton />
        </div>
      </aside>
      {children}
    </div>
  )
}
