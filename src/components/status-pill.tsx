/**
 * I cinque stati sono descrittivi, non gerarchici: nessuno è "meglio" di un altro e il
 * colore non deve suggerirlo (design-system.md §2). I valori ammessi li fissa il vincolo
 * sulla tabella: qui uno stato sconosciuto si mostra neutro invece di rompere la pagina.
 */
const MODIFIER: Record<string, string> = {
  valutato: ' pill--valutato',
  attivo: ' pill--attivo',
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill${MODIFIER[status] ?? ''}`}>
      <span className="pill__dot" aria-hidden="true" />
      {status}
    </span>
  )
}
