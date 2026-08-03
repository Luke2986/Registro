import { isClientStatus, type ClientStatus } from '@/lib/client-status'

/**
 * I cinque stati sono descrittivi, non gerarchici: nessuno è "meglio" di un altro e il
 * colore non deve suggerirlo (design-system.md §2). Per questo il colore sta nel punto e non
 * nel fondo: una pillola interamente verde accanto a una interamente grigia direbbe che quel
 * cliente sta meglio dell'altro.
 *
 * La mappa è `Record<ClientStatus, string>` e non `Record<string, string>`: il giorno che uno
 * stato entra nell'elenco e non qui, il compilatore si ferma invece di lasciarlo neutro in
 * silenzio.
 */
const MODIFIER: Record<ClientStatus, string> = {
  potenziale: '',
  valutato: ' pill--valutato',
  attivo: ' pill--attivo',
  chiuso: '',
  perso: ' pill--perso',
}

/**
 * La proprietà resta `string` perché `ClientRow['status']` è `string` nei tipi generati dallo
 * schema, e quei tipi non si modificano a mano. Il restringimento avviene qui: uno stato
 * sconosciuto si mostra neutro invece di rompere la pagina.
 */
export function StatusPill({ status }: { status: string }) {
  const modifier = isClientStatus(status) ? MODIFIER[status] : ''

  return (
    <span className={`pill${modifier}`}>
      <span className="pill__dot" aria-hidden="true" />
      {status}
    </span>
  )
}
