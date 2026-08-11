'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from './nav-icons'
import { setNavCollapsed } from './nav-actions'

/**
 * Il pulsante che richiude/espande la sidebar.
 *
 * **Perché `useState` locale *insieme a* `router.refresh()`, che sembra ridondante:** il refresh
 * rifà il render del layout server ma **non** rerenda i Client Components che non hanno cambiato le
 * loro prop, quindi senza `useState` questo pulsante mostrerebbe l'`aria-expanded` vecchio anche
 * dopo che il server ha ricevuto il cookie nuovo. Lo stato locale è quello che l'utente vede
 * subito; `router.refresh()` è quello che allinea il DOM della sidebar. Si allineano ai lati
 * opposti della stessa transizione.
 *
 * **`aria-expanded={!collapsed}`, invertito, e va scritto perché confonde alla prima lettura:**
 * ARIA descrive lo stato del *contenuto controllato* (la nav), non del pulsante. La nav è espansa
 * quando `collapsed` è falso. La prossima persona che apre il file scriverà istintivamente
 * `aria-expanded={collapsed}` e non se ne accorgerà nessuno.
 *
 * **Il pulsante non rende il tooltip da hover** anche se sta dentro `.sidebar__brand` e non dentro
 * `.nav__item`: il selettore CSS del tooltip guarda solo `.nav__item`. Va scritto perché guardando
 * il markup viene il dubbio.
 */
export function SidebarToggle({ defaultCollapsed }: { defaultCollapsed: boolean }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [pending, startTransition] = useTransition()

  function onClick() {
    const next = !collapsed
    setCollapsed(next)
    startTransition(async () => {
      await setNavCollapsed(next)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      className="sidebar-toggle"
      onClick={onClick}
      disabled={pending}
      aria-expanded={!collapsed}
      aria-controls="app-nav"
      aria-label={collapsed ? 'Espandi la navigazione' : 'Richiudi la navigazione'}
    >
      {collapsed ? <ChevronRightIcon aria-hidden="true" /> : <ChevronLeftIcon aria-hidden="true" />}
    </button>
  )
}
