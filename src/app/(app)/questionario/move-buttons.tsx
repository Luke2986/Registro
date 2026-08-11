'use client'

import { useWrite } from '@/lib/use-write'

import { moveBlock, moveQuestion } from './move-actions'

const BLOCK_NOT_MOVED = 'Il blocco non è stato spostato. Riprova fra un momento.'
const QUESTION_NOT_MOVED = 'La domanda non è stata spostata. Riprova fra un momento.'

const ARROW = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/**
 * Le due frecce di riordino, uguali per blocchi e domande: `Sposta su` e `Sposta giù` dicono
 * cosa succede (UX-DR13), e sono `btn--quiet` come `Rinomina` e `Modifica` — azioni terziarie,
 * fino a 62 istanze sulla pagina.
 *
 * **Le parole sono diventate icone l'11 agosto 2026**, e la frase qui sopra regge lo stesso: la
 * parola non è sparita, si è spostata dove serve. Resta come nome accessibile — quello che sente
 * chi non vede lo schermo — e come `title`, cioè il suggerimento del passaggio del mouse. Sono
 * diventate icone perché due etichette lunghe occupavano da sole metà della fila di comandi per
 * l'azione che si usa meno, ed è la stessa ragione per cui esistono le due modalità: una freccia
 * disegnata dice «su» meglio di come lo dica la parola «su».
 *
 * Il componente importa lui le due azioni e sceglie per `kind`: un callback costruito nel
 * Server Component non sarebbe serializzabile, e passare l'azione come prop obbligherebbe ogni
 * chiamante a rifare il binding.
 *
 * **Al bordo il pulsante è `disabled`, durante il volo no, e la Story 5.2 separa le due cose per
 * la prima volta.** Erano un `disabled={pending || isFirst}` solo, cioè due semantiche diverse
 * dette con la stessa parola: `disabled` significa «l'azione è inammissibile» — un comando che
 * non farà niente non deve sembrare un comando — mentre durante il volo l'azione è ammissibile e
 * sta solo succedendo. Tenerle unite spegneva il pulsante appena premuto e scaricava il fuoco sul
 * body. Ora il volo lo dice `aria-busy`, il pulsante resta focalizzabile, e il secondo clic lo
 * assorbe `useWrite`. Il no-op della funzione resta come ultima difesa per la richiesta forgiata.
 *
 * **Il fuoco lo si perde ancora al bordo, e la revisione della 5.2 lo corregge qui invece di
 * lasciarlo credere chiuso:** si preme `Sposta su` sulla seconda domanda, la rivalidazione la porta
 * in prima posizione, `isFirst` diventa vero e il pulsante che ha il fuoco si spegne. È lo stesso
 * fuoco che cade sul body, per l'altra delle due semantiche — e quella resta `disabled` a ragione,
 * perché l'azione lì è davvero inammissibile. Chiuso per il volo, aperto per il bordo, a ledger.
 *
 * `name` esiste per il nome accessibile: ventitré «Sposta su» indistinguibili sono quello che
 * sente chi naviga per elenco di pulsanti, e il titolo della domanda o del blocco è l'unica cosa
 * che li distingue.
 */
export function MoveButtons({
  kind,
  id,
  name,
  isFirst,
  isLast,
}: {
  kind: 'block' | 'question'
  id: string
  name: string
  isFirst: boolean
  isLast: boolean
}) {
  const what = kind === 'block' ? 'il blocco' : 'la domanda'
  const { pending, error, write } = useWrite(
    kind === 'block' ? BLOCK_NOT_MOVED : QUESTION_NOT_MOVED,
  )

  const move = (direction: 'up' | 'down') => {
    const payload = new FormData()
    payload.set('direction', direction)

    if (kind === 'block') {
      payload.set('block_id', id)
      write(() => moveBlock({}, payload))
      return
    }

    payload.set('question_id', id)
    write(() => moveQuestion({}, payload))
  }

  // Niente onSuccess: la rivalidazione di /questionario riordina la lista, e il pulsante
  // premuto si muove col suo elemento (React sposta il nodo con la sua chiave).
  return (
    <>
      {/* Le due icone stanno in un contenitore loro, staccate di 2 invece che di 8: sono un
          comando solo con due direzioni, e a distanza piena sembrerebbero due comandi diversi. */}
      <div className="move">
        <button
          type="button"
          className="btn btn--quiet btn--icon"
          disabled={isFirst}
          aria-busy={pending}
          aria-label={`Sposta su ${what} «${name}»`}
          title="Sposta su"
          onClick={() => move('up')}
        >
          <svg {...ARROW}>
            <path d="M12 19V6M6 12l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          className="btn btn--quiet btn--icon"
          disabled={isLast}
          aria-busy={pending}
          aria-label={`Sposta giù ${what} «${name}»`}
          title="Sposta giù"
          onClick={() => move('down')}
        >
          <svg {...ARROW}>
            <path d="M12 5v13M6 12l6 6 6-6" />
          </svg>
        </button>
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
