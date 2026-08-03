'use client'

import { type FocusEvent, startTransition, useCallback, useEffect, useRef, useState } from 'react'

import type { SaveState } from '@/components/save-indicator'

/** Quello che le azioni della scheda rispondono: l'errore, il valore ripulito, l'avviso di doppione. */
export type SaveResult = { error?: string; saved?: string; duplicateOf?: string }

/** Lo stesso intervallo che vale per la compilazione: un secondo numero da ricordare non serve. */
const AUTOSAVE_DELAY = 3000

const UNREACHABLE = 'Il campo non è stato salvato: il server non ha risposto. Riprova fra un momento.'

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export type EditableFieldState = {
  value: string
  dirty: boolean
  pending: boolean
  result: SaveResult
  saveState: SaveState
  /** Salva quello che c'è nel campo adesso: lo chiamano il pulsante e Riprova. */
  save: () => void
  /** Riporta il campo a com'era e azzera errore, avviso e indicatore. */
  cancel: () => void
  control: {
    value: string
    onChange: (event: { target: { value: string } }) => void
    onFocus: () => void
    onBlur: (event: FocusEvent<Control>) => void
  }
}

/**
 * Un campo che si salva: il valore, se è cambiato, l'esito dell'ultima scrittura, i tre stati
 * dell'indicatore e il timer del salvataggio automatico. Chi lo usa disegna, non governa.
 *
 * Sta in un file suo perché la schermata di compilazione lo riuserà su ogni risposta: cambia
 * chi lo pilota, non come è fatto. È codice del browser, quindi non è fra i moduli puri che la
 * Story 1.6 metterà sotto test.
 *
 * **L'azione non passa da `useActionState`, ed è il motivo per cui questo file esiste.** Con
 * `useActionState` un rifiuto della promessa — rete caduta, servizio che non risponde, rilascio
 * a metà — viene rilanciato durante la resa e risale fino al confine d'errore, che sostituisce
 * l'intera scheda e porta via quello che c'è scritto in tutti gli altri campi. Chiamata qui
 * dentro, la stessa caduta diventa lo stato `failed` con il suo `Riprova`, che è quello che la
 * regola chiede quando un salvataggio non riesce.
 */
export function useEditableField({
  run,
  baseline,
  autosave,
}: {
  run: (next: string) => Promise<SaveResult>
  baseline: string
  autosave: boolean
}): EditableFieldState {
  // Campo controllato: un valore rifiutato deve restare dov'è, insieme al suo errore.
  const [value, setValue] = useState(baseline)
  const [result, setResult] = useState<SaveResult>({})
  const [pending, setPending] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })

  /** L'ultimo valore mandato al server: da solo non se ne rimanda mai due volte lo stesso. */
  const attempted = useRef<string | null>(null)
  /** Un allineamento maturato mentre si scriveva: si applica quando il campo perde il fuoco. */
  const waiting = useRef<{ sent: string; saved: string } | null>(null)
  const focused = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  const write = useCallback(
    (next: string) => {
      attempted.current = next
      setResult({})
      setPending(true)
      if (autosave) setSaveState({ kind: 'saving' })

      // L'azione parte anche da un timer, quindi fuori da un gestore di evento, e ogni scrittura
      // riuscita rivalida la scheda e l'elenco: dentro startTransition quella rivalidazione
      // arriva come aggiornamento non urgente, che è il modo in cui una Server Action chiamata
      // a mano va lanciata.
      startTransition(() => {
        void run(next)
          .catch((): SaveResult => ({ error: UNREACHABLE }))
          .then((outcome) => {
            if (!alive.current) return

            setPending(false)
            setResult(outcome)

            // L'ora nasce qui, nel browser: calcolata durante la resa sul server, server e
            // client renderebbero due orari diversi e l'idratazione se ne lamenterebbe.
            if (autosave) {
              setSaveState(outcome.error ? { kind: 'failed' } : { kind: 'saved', at: new Date() })
            }

            // Il server salva il valore ripulito: senza questo allineamento uno spazio in coda
            // lascerebbe Salva acceso su un campo già salvato. Si allinea solo se nel frattempo
            // non è stato scritto altro, e mai mentre il campo ha il fuoco: riscrivere una
            // textarea sotto le dita toglie l'a capo appena battuto e manda il cursore in fondo.
            if (outcome.saved === undefined) return

            const alignment = { sent: next, saved: outcome.saved }

            if (focused.current) waiting.current = alignment
            else setValue((current) => (current === next ? alignment.saved : current))
          })
      })
    },
    [autosave, run],
  )

  const dirty = value !== baseline

  useEffect(() => {
    // Mai due volte da solo sullo stesso testo. Senza questa condizione un salvataggio fallito
    // ripartirebbe ogni tre secondi all'infinito, e uno riuscito su un testo che il server
    // ripulisce — uno spazio in coda, un a capo — si rimanderebbe da sé per sempre. Riprova
    // resta il modo di insistere, ed è un gesto di chi scrive.
    if (!autosave || !dirty || pending || attempted.current === value) return

    const timer = setTimeout(() => write(value), AUTOSAVE_DELAY)

    // Si cancella allo smontaggio: senza la pulizia, un salvataggio parte su un componente che
    // non c'è più.
    return () => clearTimeout(timer)
  }, [autosave, dirty, pending, value, write])

  return {
    value,
    dirty,
    pending,
    result,
    saveState,
    save: () => {
      if (!pending) write(value)
    },
    cancel: () => {
      attempted.current = null
      waiting.current = null
      setValue(baseline)
      setResult({})
      setSaveState({ kind: 'idle' })
    },
    control: {
      value,
      onChange: (event) => {
        setValue(event.target.value)
        // L'errore parla del valore di prima: lasciarlo acceso su un campo che si sta
        // correggendo vuol dire mettere del rosso su una cosa che non è più un errore.
        setResult({})
      },
      onFocus: () => {
        focused.current = true
      },
      onBlur: (event) => {
        focused.current = false

        const alignment = waiting.current
        waiting.current = null

        if (alignment && value === alignment.sent) {
          setValue(alignment.saved)
          return
        }

        // Il fuoco che passa a Salva o Annulla dello stesso campo non è un'uscita dal campo: è
        // il pulsante che sta per decidere. Salvare qui vorrebbe dire scrivere il testo che
        // Annulla deve buttare via, e scriverlo due volte quando il pulsante è Salva.
        if (event.currentTarget.form?.contains(event.relatedTarget)) return

        // Senza il salvataggio all'uscita dal campo, chi scrive e clicca via entro tre secondi
        // perde quello che ha scritto: è esattamente ciò che la regola esiste per impedire.
        if (autosave && dirty && !pending) write(value)
      },
    },
  }
}
