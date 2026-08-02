import Link from 'next/link'

import { SignOutButton } from '@/components/sign-out-button'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">Registro</div>
        <nav className="nav">
          <Link href="/clienti" className="nav__item nav__item--active">
            Clienti
          </Link>
        </nav>
        <div className="sidebar__foot">
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
