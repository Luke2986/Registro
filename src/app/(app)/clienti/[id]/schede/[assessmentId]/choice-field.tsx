'use client'

import { orphanOption } from '@/lib/answer-control'

import type { ControlProps } from './answer-field'

/**
 * Il selettore nativo, che sul tablet si comporta meglio di qualunque sostituto disegnato a mano —
 * la stessa ragione già scritta per lo stato del cliente — e nessun `appearance: none`, che
 * porterebbe un colore fuori da globals.css.
 *
 * Un file per conto suo e non in fondo ad `answer-field.tsx`: un componente per file (kb-0.md §2),
 * e in tutto il progetto solo i `page.tsx` ne contengono due.
 */
export function ChoiceField({
  shared,
  options,
  content,
}: {
  shared: ControlProps
  options: string[]
  content: string | null
}) {
  // L'opzione in coda tiene il contenuto scelto *e* raggiungibile, così tornarci indietro resta
  // possibile dopo averlo cambiato. Il perché sta in `answer-control.ts`, insieme ai suoi test.
  const orphan = orphanOption(content, options)

  return (
    <select {...shared} className="input select" autoComplete="off">
      {/* Si può lasciare senza risposta, e la parola lo dice: niente è obbligatorio (AC5). */}
      <option value="">Nessuna risposta</option>
      {options.map((option, index) => (
        // La posizione e non il testo: due opzioni identiche sono un contenuto strano, non un
        // motivo per far cadere la resa. L'elenco è una copia e non si riordina.
        <option key={index} value={option}>
          {option}
        </option>
      ))}
      {orphan === null ? null : <option value={orphan}>{orphan}</option>}
    </select>
  )
}
