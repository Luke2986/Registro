/**
 * Icone della navigazione, in un file loro.
 *
 * A tratto e non piene: `design-system.md` §10 dice «le icone sono a tratto». `currentColor` sul
 * `stroke`: la voce attiva porta `--nav-accent` come `color` sul link, e l'icona lo eredita senza
 * doverlo scrivere due volte. Nessuna dipendenza — `lucide-react` e simili portano centinaia di
 * kilobyte di albero per rendere due contorni (`AGENTS.md`, «nessuna dipendenza senza motivo»).
 * In un file separato per non gonfiare `nav.tsx` e per avere «l'icona di Clienti» in un posto
 * solo il giorno che serve altrove.
 *
 * Nessun `use client`: componenti server puri che rendono `<svg>`.
 */

type IconProps = React.SVGProps<SVGSVGElement>

const baseProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/**
 * Due contorni di persona sovrapposti, per suggerire un gruppo. I clienti qui sono aziende ma con
 * dentro persone (D13), quindi non un singolo utente. Ridisegnato dalla forma `users` a due
 * silhouette di Heroicons.
 */
export function ClientiIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c0-2.9 2.46-5.25 5.5-5.25s5.5 2.35 5.5 5.25" />
      <path d="M16 6.5a2.75 2.75 0 0 1 0 5.5" />
      <path d="M17 14c2.21 0 4 1.79 4 4" />
    </svg>
  )
}

/**
 * Rettangolo con tre righe orizzontali: la metafora «lista/checklist» che ogni software di
 * questionari riconosce. **Non** un punto interrogativo — ambiguo con l'aiuto contestuale che il
 * software non ha oggi e potrebbe voler avere domani.
 */
export function QuestionarioIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  )
}

/**
 * Freccia del toggle: a sinistra quando la nav è espansa («richiudi»), a destra quando è richiusa
 * («espandi»). Rende chiaro il verso senza leggere `aria-label`.
 */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
