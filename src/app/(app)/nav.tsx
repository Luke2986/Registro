'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ClientiIcon, QuestionarioIcon } from './nav-icons'

/**
 * Le voci in un posto solo: percorso, etichetta, modificatore di sezione e componente-icona. Il
 * colore lo porta il modificatore, non questa riga — nessun valore esadecimale fuori da
 * `globals.css`. L'icona è il componente, non un rendering: la scelta sta in una riga per voce.
 */
const ITEMS = [
  { href: '/clienti', label: 'Clienti', section: 'clienti', icon: ClientiIcon },
  { href: '/questionario', label: 'Questionario', section: 'questionario', icon: QuestionarioIcon },
] as const

/**
 * Il solo componente del browser del layout: `layout.tsx` resta un Server Component, altrimenti
 * diventerebbe client anche `SignOutButton` e ogni componente che il layout terrà in futuro.
 *
 * **Il patto della richiusa (Story 5.1): il rendering è lo stesso in tutti e due gli stati.** Le
 * etichette ci sono sempre nel DOM, è la CSS a nasconderle da richiusa (`.sidebar--collapsed
 * .nav__item__label`). Renderle condizionalmente vorrebbe dire due alberi diversi e un `useEffect`
 * per switcharli senza flash, cioè la strada che il cookie serve a evitare. `data-label` sull'ancora
 * alimenta il tooltip in stato richiuso (pseudo-element `::after` che legge `attr(data-label)`).
 */
export function Nav() {
  const pathname = usePathname()

  return (
    <nav id="app-nav" className="nav">
      {ITEMS.map((item) => {
        // Sul prefisso e non sull'uguaglianza: `/clienti/<id>` e `/clienti/nuovo` devono tenere
        // accesa la voce `Clienti`, e oggi lo fanno solo perché è scritta accesa a mano. La barra
        // in fondo al prefisso serve: uno `startsWith('/clienti')` nudo accenderebbe la voce anche
        // su un ipotetico `/clientidiversi`, ed è il tipo di difetto che nessuno trova perché non
        // produce un errore.
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            data-label={item.label}
            className={`nav__item nav__item--${item.section}${active ? ' nav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon aria-hidden="true" className="nav__item__icon" />
            <span className="nav__item__label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
