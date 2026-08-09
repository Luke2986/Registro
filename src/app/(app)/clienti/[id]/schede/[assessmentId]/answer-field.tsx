'use client'

import { useCallback, useEffect } from 'react'

import { answerControl } from '@/lib/answer-control'
import { useEditableField, type EditableFieldState, type SaveResult } from '@/lib/use-editable-field'

import { saveAnswer } from '../../../answer-actions'

import { ChoiceField } from './choice-field'
import { useAnswerSave } from './save-boundary'

/**
 * Quello che ogni controllo riceve, con un nome perché sia **una** dichiarazione sola. I gestori
 * arrivano da `useEditableField` invece di essere riscritti qui: così `onFocus` e `onBlur` — cioè
 * il salvataggio all'uscita dal campo — non possono mancare a un controllo e restare su un altro,
 * che sarebbe il salvataggio sparito da una domanda su ventiquattro, il difetto più difficile da
 * vedere. Se un giorno l'hook ne aggiunge un terzo, `shared` non compila finché non lo passa.
 */
export type ControlProps = EditableFieldState['control'] & {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

/**
 * La domanda e il suo campo. È l'elemento su cui si passa più tempo di tutti, quindi è il più
 * curato, e quasi tutto glielo danno già `.input` e `.input:focus` (design-system.md §5).
 *
 * **Si salva da solo**: tre secondi dopo l'ultima battuta, e comunque all'uscita dal campo (D21).
 * La macchina è `useEditableField`, che esiste da sei story proprio per questa schermata: qui non
 * si riscrive niente, si sostituisce la fonte del valore.
 *
 * **Nessun `Salva` e nessun `Annulla` per campo, e nessun `<form>`.** Il comando esplicito è uno
 * solo e sta nella barra ancorata. Un `<form>` porterebbe l'invio implicito con Invio, cioè un
 * ricaricamento che porta via quello che è stato scritto — su una schermata dove si preme Invio
 * per andare a capo, è il gesto più probabile della giornata.
 *
 * **Nessun `required`, nessun asterisco, nessun `pattern`, nessun conteggio**: niente è
 * obbligatorio e nessun avviso ferma (AC5 della 3.2, FR18).
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
  const store = useAnswerSave()

  // `run` dentro `useCallback`, ed è la trappola più grossa di questa schermata: l'hook mette
  // `run` fra le dipendenze di `write`, e `write` fra quelle dell'effetto che arma il timer. Un
  // `run` ricreato a ogni resa riarmerebbe il timer a ogni battuta, e il salvataggio automatico
  // potrebbe non partire mai — senza nessun errore.
  //
  // Il `FormData` lo costruisce `run`, sempre, sia che a tirare la corda sia il timer, sia
  // l'uscita dal campo, sia il comando esplicito, sia `Riprova`: un solo percorso di scrittura.
  const run = useCallback(
    (next: string): Promise<SaveResult> => {
      const payload = new FormData()
      payload.set('answer_id', answerId)
      payload.set('content', next)

      return saveAnswer({}, payload)
    },
    [answerId],
  )

  const { value, dirty, pending, result, saveState, save, control } = useEditableField({
    run,
    baseline: content ?? '',
    autosave: true,
  })

  // Il cleanup sta in un effetto suo e gira solo allo smontaggio: dentro il secondo toglierebbe e
  // rimetterebbe la voce a ogni battuta, cioè due ricalcoli e due rese della barra per tasto.
  useEffect(() => () => store.remove(answerId), [store, answerId])

  // Senza elenco di dipendenze di proposito: `save` è una chiusura nuova a ogni resa, quindi un
  // elenco sarebbe una bugia. `set` è idempotente e avvisa solo quando il riassunto cambia davvero.
  useEffect(() => {
    store.set(answerId, { state: saveState, dirty, pending, save })
  })

  const id = `risposta-${answerId}`
  const helpId = `aiuto-${answerId}`
  const errorId = `errore-${answerId}`

  // Solo quando ci sono: un `aria-describedby` che punta a un elemento assente non descrive niente
  // e alcuni lettori di schermo lo annunciano lo stesso, a vuoto.
  const described = [helpText ? helpId : null, result.error ? errorId : null].filter(
    (it) => it !== null,
  )

  const shared: ControlProps = {
    ...control,
    id,
    'aria-describedby': described.join(' ') || undefined,
    'aria-invalid': result.error ? true : undefined,
  }

  // Il controllo si sceglie in `answer-control.ts`, che è puro e ha i suoi test: la mappatura e i
  // suoi ripieghi sono logica che, rompendosi, produce un dato sbagliato senza dare nessun errore
  // (kb-0.md §7). L'unione porta con sé le opzioni, così qui non resta niente da ri-decidere.
  const shape = answerControl(answerType, options)

  return (
    <>
      {/* Una `<label>` vera e non un `<p>`: la domanda è l'unica cosa a schermo che nomini quel
          campo, e ogni campo ha un'etichetta vera e non solo un segnaposto (kb-0.md §6). */}
      <label className="answer__text" htmlFor={id}>
        {questionText}
      </label>

      {/* Sotto la domanda e sopra il campo, come il PRD §4 e design-system.md §5. Aiuto vuoto →
          nessun contenitore: un `<p>` vuoto lascia un buco che sembra un difetto. */}
      {helpText ? (
        <p className="meta answer__help" id={helpId}>
          {helpText}
        </p>
      ) : null}

      {shape.kind === 'breve' ? (
        <input {...shared} className="input" type="text" autoComplete="off" />
      ) : shape.kind === 'numero' ? (
        /* type="text" e non type="number": con type="number" il browser restituisce stringa vuota
           per un contenuto non numerico, e quello che è stato battuto sparirebbe. `inputMode` dà
           comunque il tastierino sul tablet. */
        <input {...shared} className="input" type="text" inputMode="numeric" autoComplete="off" />
      ) : shape.kind === 'scelta' ? (
        <ChoiceField shared={shared} options={shape.options} content={content} />
      ) : (
        /* `data-replica` porta lo *stesso* stato che alimenta il campo, non una lettura del DOM: se
           le due sorgenti fossero due, il campo crescerebbe con un carattere di ritardo. */
        <div className="answer__grow" data-replica={value}>
          <textarea {...shared} className="input input--long" rows={3} />
        </div>
      )}

      {/* La riga sta qui perché la barra non può dirlo: l'indicatore ancorato dice *che* qualcosa
          non è stato salvato, e con ventiquattro campi **quale** lo può dire solo il campo. Senza,
          si saprebbe che c'è un guasto e non dove sia il testo a rischio. */}
      {result.error ? (
        <p className="field__error" role="alert" id={errorId}>
          {result.error}
        </p>
      ) : null}
    </>
  )
}
