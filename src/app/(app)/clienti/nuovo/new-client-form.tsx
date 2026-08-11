'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'

import { CLIENT_NAME_MAX_LENGTH } from '@/lib/validate-client-name'

import { createClientRecord, type CreateClientState } from '../actions'

const INITIAL: CreateClientState = {}

/**
 * Il campo è controllato come in access-form: con un form action React ripulisce i campi non
 * controllati a fine invio, e un nome rifiutato sparirebbe insieme all'errore.
 *
 * Nessun required sull'input: lo lascerebbe rifiutare al browser, con il suo messaggio e la
 * sua lingua. Rifiutano l'azione e il vincolo sulla tabella, con parole nostre.
 */
export function NewClientForm() {
  const [name, setName] = useState('')
  const [state, formAction, pending] = useActionState(createClientRecord, INITIAL)
  const input = useRef<HTMLInputElement>(null)

  // Chi legge lo schermo con la tastiera si ritroverebbe il fuoco sul pulsante appena premuto,
  // e dovrebbe risalire fino al campo per correggerlo.
  useEffect(() => {
    if (state.error || state.duplicateOf) input.current?.focus()
  }, [state])

  const describedBy = ['name-hint', state.error ? 'name-error' : null, state.duplicateOf ? 'name-warning' : null]
    .filter((id) => id !== null)
    .join(' ')

  return (
    // La guardia sul doppio invio, dalla revisione della Story 5.2: `useActionState` mette in coda
    // le azioni invece di rifiutarle, e con `aria-busy` al posto di `disabled` il pulsante resta
    // premibile. Il caso è il secondo `Salva`, quello che conferma un nome doppione: lì
    // `duplicate_of` è già valorizzato, quindi due invii saltano entrambi il controllo e creano
    // due clienti identici.
    <form action={(data) => (pending ? undefined : formAction(data))} className="form">
      {/* Rimanda indietro il nome su cui l'avviso è già stato dato: cambiandolo, l'avviso torna. */}
      <input type="hidden" name="duplicate_of" value={state.duplicateOf ?? ''} />

      <div className="field">
        <label className="label" htmlFor="name">
          Nome del cliente
        </label>
        <input
          id="name"
          name="name"
          className="input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={CLIENT_NAME_MAX_LENGTH}
          autoComplete="off"
          autoFocus
          ref={input}
          aria-required="true"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={describedBy}
        />
        <p className="meta" id="name-hint">
          È l’unico campo che serve. Il resto si compila quando lo sai.
        </p>
      </div>

      {state.error ? (
        <p className="error-box" role="alert" id="name-error" style={{ margin: 0 }}>
          {state.error}
        </p>
      ) : null}

      {state.duplicateOf ? (
        <p className="warn-box" role="alert" id="name-warning" style={{ margin: 0 }}>
          Esiste già un cliente con questo nome. Salva di nuovo per crearlo lo stesso.
        </p>
      ) : null}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" aria-busy={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        <Link href="/clienti" className="btn btn--secondary">
          Annulla
        </Link>
      </div>
    </form>
  )
}
