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
  // L'opzione in coda tiene raggiungibile la risposta memorizzata quando è fuori dalle opzioni di
  // oggi — una domanda riscritta dopo che qualcuno aveva già risposto. Il perché sta in
  // `answer-control.ts`, insieme ai suoi test.
  //
  // Fin dove arriva, e da quando: `content` è la risposta **sul server**, non quella nel campo.
  // Finché la 3.2 non salvava, l'opzione restava lì per sempre e tornarci indietro era possibile
  // in qualsiasi momento. Dalla 3.3 il salvataggio la sostituisce: scelta un'altra opzione, tre
  // secondi dopo la scrittura passa, la rivalidazione riporta il `content` nuovo e la vecchia
  // sparisce dal menu. È coerente — non è più la risposta memorizzata, quindi non è più orfana —
  // ma il ritorno indietro dura quanto quella finestra, non per sempre.
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
