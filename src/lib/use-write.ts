'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

export type WriteState = {
  pending: boolean
  error: string | null
  /** Azzera l'errore: lo chiama chi sta per cambiare il valore di cui l'errore parlava. */
  clearError: () => void
  write: <R extends { error?: string }>(call: () => Promise<R>, onSuccess?: (outcome: R) => void) => void
}

/**
 * Chiamare un'azione da un controllo che non è un campo di testo: una casella, un interruttore,
 * un pulsante. Tiene `pending`, trasforma una rete caduta in un messaggio e non scrive stato
 * dopo lo smontaggio. Quattro componenti delle persone hanno bisogno delle stesse identiche
 * meccaniche, e scriverle quattro volte è la duplicazione che kb-0.md §9 chiede di fermare.
 *
 * **Non passa da `useActionState`**, per il motivo già scritto in use-editable-field.ts: un
 * rifiuto della promessa risalirebbe al confine d'errore, che sostituisce l'intera scheda e
 * porta via quello che c'è scritto negli altri campi (NFR1). Chiamata qui dentro, la stessa
 * caduta diventa un messaggio sotto il controllo.
 *
 * `unreachable` lo passa chi lo usa perché cambia da azione ad azione: «non è stato salvato» e
 * «non è stato tolto» non sono la stessa frase.
 *
 * È codice del browser, quindi non è fra i moduli puri che la Story 1.6 metterà sotto test.
 */
export function useWrite(unreachable: string): WriteState {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alive = useRef(true)

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  const write = useCallback(
    <R extends { error?: string }>(call: () => Promise<R>, onSuccess?: (outcome: R) => void) => {
      setPending(true)
      setError(null)

      // Funzione di scope asincrona con await: la transizione resta aperta finché l'azione non
      // si è risolta, quindi la rivalidazione che il server rimanda arriva dentro di essa
      // invece di piombare come aggiornamento urgente.
      //
      // Quello che gli aggiornamenti di stato *dopo* l'await facciano — se restino nella
      // transizione o tornino urgenti — non è verificato in questa combinazione di versioni, e
      // React 19 lo documenta diversamente da come verrebbe naturale. La conseguenza è comunque
      // trascurabile qui: `setPending(false)` e `setError` sono due valori locali, non una
      // resa costosa. Resta fra le cose da guardare in anteprima.
      startTransition(async () => {
        // La caduta si intercetta con il secondo argomento di .then e non con un .catch():
        // quello obbligherebbe a un `as` per far tornare i tipi, e se serve un `as` la forma è
        // sbagliata (kb-0.md §2). `null` è «il server non ha risposto», che non è un esito
        // dell'azione e non va confuso con uno.
        const outcome = await call().then(
          (it): R | null => it,
          (): null => null,
        )

        if (!alive.current) return

        setPending(false)

        if (outcome === null) {
          setError(unreachable)
          return
        }

        if (outcome.error !== undefined) {
          setError(outcome.error)
          return
        }

        onSuccess?.(outcome)
      })
    },
    [unreachable],
  )

  return { pending, error, clearError: () => setError(null), write }
}
