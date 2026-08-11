'use client'

import { formatClockTime } from '@/lib/format-date'

/**
 * Union discriminata e non tre booleani: con tre booleani esistono otto combinazioni di cui
 * cinque impossibili, e prima o poi il codice ne rende una.
 */
export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed' }

const MODIFIER: Record<SaveState['kind'], string> = {
  idle: '',
  saving: ' save-indicator--saving',
  saved: '',
  failed: ' save-indicator--failed',
}

/**
 * L'elemento firma del prodotto: incarna l'unica promessa non negoziabile, il lavoro non si
 * perde. Un salvataggio silenzioso è indistinguibile da un salvataggio mancato, e chi sta
 * scrivendo non ha modo di sapere quale dei due è.
 *
 * Sola presentazione: nessuna chiamata, nessun timer. Chi lo usa gli passa lo stato. Sta in
 * components/ e non dentro la scheda del cliente perché la schermata di compilazione lo
 * riuserà ancorato in fondo: cambia dove sta e chi lo pilota, non com'è fatto.
 *
 * Il tono è quello di un orologio: sta lì, lo si guarda quando serve. Nessuna spunta, nessuna
 * animazione, nessun avviso a comparsa (design-system.md §5).
 */
export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  // La riga c'è sempre, anche vuota: è una zona che si annuncia da sola quando cambia, e
  // funziona solo se esiste nel documento già prima del cambiamento. Vuota tiene anche il
  // suo spazio, così quando l'indicatore compare il campo sotto non salta.
  //
  // **`aria-live="polite"` sul solo testo, e il `Riprova` fuori (Story 5.2).** Prima era un
  // `role="status"` sull'intera riga, cioè una regione live che conteneva anche il pulsante: a
  // ogni fallimento il lettore di schermo riannunciava pure lui, e un pulsante è un controllo,
  // non un annuncio. `aria-live` dichiarato invece di implicito perché qui i cambi sono
  // frequenti e non urgenti, e `polite` è la scelta che li mette in coda invece di
  // interromperci sopra.
  return (
    <p className={`data save-indicator${MODIFIER[state.kind]}`}>
      <span aria-live="polite">
        {/* Prima del primo salvataggio non c'è un'ora da dire, quindi non si dice niente. */}
        {state.kind === 'saving' ? 'Salvataggio…' : null}
        {state.kind === 'saved' ? `Salvato alle ${formatClockTime(state.at)}` : null}
        {state.kind === 'failed' ? 'Non salvato, riprovo' : null}
      </span>
      {state.kind === 'failed' ? (
        <button type="button" className="save-indicator__retry" onClick={onRetry}>
          Riprova
        </button>
      ) : null}
    </p>
  )
}
