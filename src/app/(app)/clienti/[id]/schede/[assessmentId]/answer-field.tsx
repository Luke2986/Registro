'use client'

import { useState } from 'react'

import { answerControl } from '@/lib/answer-control'

import { ChoiceField } from './choice-field'

/**
 * Quello che ogni controllo riceve, con un nome perché sia **una** dichiarazione sola. `shared` è
 * annotato con questo tipo di proposito: così il giorno che la Story 3.3 gli aggiunge un `onBlur`
 * per il salvataggio all'uscita, l'oggetto letterale non compila finché il tipo non lo conosce, e
 * `ChoiceField` non può restare indietro in silenzio — che sarebbe il salvataggio sparito da una
 * domanda su ventiquattro, cioè il difetto più difficile da vedere.
 */
export type ControlProps = {
  id: string
  value: string
  onChange: (event: { target: { value: string } }) => void
  'aria-describedby': string | undefined
}

/**
 * La domanda e il suo campo. È l'elemento su cui si passa più tempo di tutti, quindi è il più
 * curato, e quasi tutto glielo danno già `.input` e `.input:focus` (design-system.md §5).
 *
 * **Lo stato è locale e non si salva.** `useState` e basta: nessuna azione, nessun timer, nessun
 * indicatore. La Story 3.3 sostituirà quel `useState` con `useEditableField`, che è un diff di
 * poche righe *se* lo stato vive qui e non nella pagina — è il motivo per cui il campo è un
 * componente per conto suo, come `ClientFieldForm` è un modulo per campo. Un indicatore fermo su
 * «Salvato» sopra una schermata che non salva sarebbe la bugia peggiore che questo prodotto possa
 * raccontare, quindi non c'è: la pagina lo dice a parole, una volta, in cima.
 *
 * **Nessun `required`, nessun asterisco, nessun `pattern`, nessun conteggio**: niente è
 * obbligatorio e nessun avviso ferma (AC5, FR18).
 */
export function AnswerField({
  answerId,
  questionText,
  helpText,
  answerType,
  options,
  content,
}: {
  answerId: string
  questionText: string
  helpText: string | null
  answerType: string
  options: string[] | null
  content: string | null
}) {
  const [value, setValue] = useState(content ?? '')

  const id = `risposta-${answerId}`
  const helpId = `aiuto-${answerId}`

  const shared: ControlProps = {
    id,
    value,
    onChange: (event) => setValue(event.target.value),
    // Solo quando l'aiuto c'è: un `aria-describedby` che punta a un elemento assente non descrive
    // niente e alcuni lettori di schermo lo annunciano lo stesso, a vuoto.
    'aria-describedby': helpText ? helpId : undefined,
  }

  // Il controllo si sceglie in `answer-control.ts`, che è puro e ha i suoi test: la mappatura e i
  // suoi due ripieghi sono logica che, rompendosi, produce un dato sbagliato senza dare nessun
  // errore (kb-0.md §7). L'unione porta con sé le opzioni, così qui non resta niente da ri-decidere
  // — una sola sorgente per una sola decisione.
  const control = answerControl(answerType, options)

  return (
    <>
      {/* Una `<label>` vera e non un `<p>`: la domanda è l'unica cosa a schermo che nomini quel
          campo, e ogni campo ha un'etichetta vera e non solo un segnaposto (kb-0.md §6). Così AC2
          e l'accessibilità sono la stessa riga invece di due. */}
      <label className="answer__text" htmlFor={id}>
        {questionText}
      </label>

      {/* Sotto la domanda e sopra il campo, come il PRD §4 e design-system.md §5. Aiuto vuoto →
          nessun contenitore: un `<p>` vuoto lascia un buco che sembra un difetto (è la stessa
          ragione già scritta su question-item.tsx). */}
      {helpText ? (
        <p className="meta answer__help" id={helpId}>
          {helpText}
        </p>
      ) : null}

      {control.kind === 'breve' ? (
        <input {...shared} className="input" type="text" autoComplete="off" />
      ) : control.kind === 'numero' ? (
        /* type="text" e non type="number": con type="number" il browser restituisce stringa vuota
           per un contenuto non numerico, e quello che è stato battuto sparirebbe. `inputMode` dà
           comunque il tastierino sul tablet. È la stessa scelta già motivata su
           client-field-form.tsx. */
        <input {...shared} className="input" type="text" inputMode="numeric" autoComplete="off" />
      ) : control.kind === 'scelta' ? (
        <ChoiceField shared={shared} options={control.options} content={content} />
      ) : (
        /* `data-replica` porta lo *stesso* stato che alimenta il campo, non una lettura del DOM: se
           le due sorgenti fossero due, il campo crescerebbe con un carattere di ritardo. */
        <div className="answer__grow" data-replica={value}>
          <textarea {...shared} className="input input--long" rows={3} />
        </div>
      )}
    </>
  )
}
