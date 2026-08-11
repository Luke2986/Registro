import Link from 'next/link'

import { questionnaireHref, type QuestionnaireMode } from '@/lib/questionnaire-mode'

const OPTIONS: { mode: QuestionnaireMode; label: string }[] = [
  { mode: 'content', label: 'Contenuto' },
  { mode: 'order', label: 'Ordine' },
]

/**
 * L'interruttore fra le due modalità, uno solo per pagina e non uno per blocco.
 *
 * **Due `Link` e non due pulsanti**: la modalità sta nell'indirizzo, quindi cambiarla è una
 * navigazione, e un `<a>` porta da sé il clic centrale, l'apertura in una scheda nuova e il
 * comportamento della tastiera. `aria-current="page"` dice qual è la vista corrente, che è
 * proprio quello che significa qui, e non serve nessun `role` inventato sopra.
 *
 * Le parole nominano **cosa si sta sistemando**, non cosa si sta facendo: in una modalità si
 * cambia il contenuto — testo, tipo, attivazione, esistenza — nell'altra solo l'ordine.
 * `Modifica` sarebbe entrato in collisione con il pulsante omonimo della domanda, e `Leggi`
 * avrebbe mentito, perché anche lì si scrive.
 *
 * Server Component: due collegamenti non hanno stato.
 */
export function ModeSwitch({ current }: { current: QuestionnaireMode }) {
  return (
    <div className="mode">
      {OPTIONS.map((option) => (
        <Link
          key={option.mode}
          className="mode__option"
          href={questionnaireHref(option.mode)}
          aria-current={option.mode === current ? 'page' : undefined}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
