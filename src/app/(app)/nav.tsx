'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Le voci in un posto solo: percorso, etichetta e modificatore di sezione. Il colore lo porta il
 * modificatore, non questa riga — nessun valore esadecimale fuori da globals.css.
 */
const ITEMS = [
  { href: '/clienti', label: 'Clienti', section: 'clienti' },
  { href: '/questionario', label: 'Questionario', section: 'questionario' },
] as const

/**
 * Il solo componente del browser del layout: `layout.tsx` resta un Server Component, altrimenti
 * diventerebbe client anche `SignOutButton` e tutto quello che il layout terrà in futuro.
 *
 * Niente della Story 5.1: nessuna barra richiudibile, nessuna icona, nessun suggerimento al
 * passaggio del mouse. Qui c'è una voce in più e l'attivo che si calcola.
 */
export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="nav">
      {ITEMS.map((item) => {
        // Sul prefisso e non sull'uguaglianza: `/clienti/<id>` e `/clienti/nuovo` devono tenere
        // accesa la voce `Clienti`, e oggi lo fanno solo perché è scritta accesa a mano. La barra
        // in fondo al prefisso serve: uno `startsWith('/clienti')` nudo accenderebbe la voce anche
        // su un ipotetico `/clientidiversi`, ed è il tipo di difetto che nessuno trova perché non
        // produce un errore.
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav__item nav__item--${item.section}${active ? ' nav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
