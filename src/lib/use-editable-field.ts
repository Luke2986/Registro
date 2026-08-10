'use client'

import { type FocusEvent, startTransition, useCallback, useEffect, useRef, useState } from 'react'

import type { SaveState } from '@/components/save-indicator'
import { shouldHonourExit } from '@/lib/owed-exit'

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
  /**
   * Il testo di una scrittura dovuta e non partita, perché una era già in volo. Si spende appena
   * quella si risolve: chi è uscito dal campo per navigare via non torna in pagina ad aspettare i
   * tre secondi del timer.
   *
   * L'accendono tutti e tre i percorsi che scrivono senza il timer — l'uscita dal campo, il
   * passaggio in secondo piano, il salvataggio esplicito — perché una sola regola per la stessa
   * decisione è il punto: lasciarne fuori uno lo renderebbe il solo a perdersi in silenzio.
   */
  const owedExit = useRef<string | null>(null)
  const focused = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  // Il tipo è dichiarato invece che dedotto perché il corpo richiama `write` per spendere
  // l'uscita rimasta in sospeso: senza l'annotazione l'inferenza gira su sé stessa.
  const write: (next: string) => void = useCallback(
    (next: string) => {
      attempted.current = next
      setResult({})
      setPending(true)
      if (autosave) setSaveState({ kind: 'saving' })

      // L'azione parte anche da un timer, quindi fuori da un gestore di evento, e ogni scrittura
      // riuscita rivalida qualcosa: dentro startTransition quella rivalidazione arriva come
      // aggiornamento non urgente, che è il modo in cui una Server Action chiamata a mano va
      // lanciata. *Cosa* rivalidi lo decide l'azione e non questo file: la scheda cliente rivalida
      // anche l'elenco, la compilazione solo la propria rotta, perché scrivere una risposta non
      // muove la chiave con cui l'elenco ordina (decisione 3 della Story 3.3).
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
            if (outcome.saved !== undefined) {
              const alignment = { sent: next, saved: outcome.saved }

              if (focused.current) waiting.current = alignment
              else setValue((current) => (current === next ? alignment.saved : current))
            }

            // L'uscita rimasta in sospeso si onora qui e non aspettando il timer, perché il
            // timer arma solo finché si resta in pagina, e chi è uscito per navigare via non ci
            // resta. La decisione sta in un modulo suo, con i suoi test.
            const owed = owedExit.current
            owedExit.current = null

            if (owed !== null && shouldHonourExit(owed, next, outcome.saved)) write(owed)
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

  // Fra l'ultima battuta e i tre secondi non c'è niente: chiudere la scheda del browser, o
  // passare a un'altra applicazione sul tablet col fuoco ancora nel campo, perde quello che si
  // è appena scritto. Qui si fa la stessa cosa che fa l'uscita dal campo.
  //
  // **Non è il `beforeunload` rifiutato il 9 agosto 2026**, e la differenza è tutta: quello fa
  // comparire una finestrella del browser, contro `design-system.md` §5. Questo non mostra
  // niente, non chiede niente e non ferma niente — fa partire una scrittura, o ne ricorda una se
  // ce n'è già una in volo.
  //
  // **Non è una garanzia,** e i due rami non promettono la stessa cosa: quello che scrive fa
  // partire la richiesta, e se il browser chiude il processo prima che sia uscita non arriva;
  // quello che ricorda non fa partire niente, e il ricordo si spende solo se il componente è
  // ancora montato quando la scrittura in volo si risolve. Restringe la finestra, non la chiude.
  useEffect(() => {
    if (!autosave) return

    const onHidden = () => {
      if (document.visibilityState !== 'hidden' || !dirty) return

      if (pending) {
        owedExit.current = value
        return
      }

      write(value)
    }

    document.addEventListener('visibilitychange', onHidden)

    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [autosave, dirty, pending, value, write])

  return {
    value,
    dirty,
    pending,
    result,
    saveState,
    save: () => {
      // Stessa regola dell'uscita dal campo, e per lo stesso motivo: con una scrittura in volo
      // non se ne avvia una seconda, si ricorda. Senza, il gesto esplicito sarebbe l'unico dei
      // tre percorsi a perdersi in silenzio — e sul campo corto, che non ha timer che lo sani,
      // si perderebbe davvero.
      if (pending) {
        owedExit.current = value
        return
      }

      write(value)
    },
    cancel: () => {
      attempted.current = null
      waiting.current = null
      owedExit.current = null
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
        // E una battuta nuova supera il ricordo, come lo supera il fuoco che torna. Serve al
        // caso che il `visibilitychange` copre e `onFocus` no: la pagina che va in secondo piano
        // col fuoco ancora dentro non produce nessun `blur`, quindi al ritorno nessun `focus`
        // azzera niente, e senza questa riga la risoluzione riscriverebbe un testo già corretto.
        owedExit.current = null
      },
      onFocus: () => {
        focused.current = true
        // Il campo è di nuovo sotto le dita: l'uscita di prima non è più un'uscita, e quello che
        // c'è da salvare lo dirà la prossima.
        owedExit.current = null
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
        if (!autosave || !dirty) return

        // Con una scrittura già in volo non se ne avvia una seconda: due `update` sulla stessa
        // riga non hanno un ordine garantito, e se vince la prima il testo vecchio sovrascrive
        // il nuovo. Si ricorda l'uscita, e la si onora quando quella in volo si risolve.
        if (pending) {
          owedExit.current = value
          return
        }

        write(value)
      },
    },
  }
}
