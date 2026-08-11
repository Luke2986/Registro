import { cookies } from 'next/headers'

import { SignOutButton } from '@/components/sign-out-button'

import { Nav } from './nav'
import { SidebarToggle } from './sidebar-toggle'

/**
 * Il layout resta un Server Component: `cookies()` si legge qui, e la classe `.sidebar--collapsed`
 * arriva nel primo render senza salti dopo l'idratazione. La ragione lunga sta in `nav-actions.ts`.
 *
 * Nessun cookie = espansa: al primo accesso si vedono le etichette prima di scegliere se stringerle.
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
      <main className="main">{children}</main>
    </div>
  )
}
