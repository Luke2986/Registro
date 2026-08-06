import { SignOutButton } from '@/components/sign-out-button'

import { Nav } from './nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">Registro</div>
        <Nav />
        <div className="sidebar__foot">
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
