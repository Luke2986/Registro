'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

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

  return (
    <form action={formAction} className="form">
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
          autoComplete="off"
          autoFocus
        />
        <p className="meta">È l’unico campo che serve. Il resto si compila quando lo sai.</p>
      </div>

      {state.error ? (
        <p className="error-box" role="alert" style={{ margin: 0 }}>
          {state.error}
        </p>
      ) : null}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        <Link href="/clienti" className="btn btn--secondary">
          Annulla
        </Link>
      </div>
    </form>
  )
}
