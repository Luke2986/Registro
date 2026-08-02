'use client'

import { useState, type FormEvent } from 'react'

import { createClient } from '@/lib/supabase/client'

type Phase = 'compilazione' | 'invio' | 'inviato'

export function AccessForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('compilazione')
  const [error, setError] = useState<string | undefined>(initialError)

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhase('invio')
    setError(undefined)

    const { error: authError } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (authError) {
      setPhase('compilazione')
      setError('Il collegamento non è partito. Controlla l’indirizzo e riprova.')
      return
    }

    setPhase('inviato')
  }

  if (phase === 'inviato') {
    return (
      <p style={{ margin: 0 }}>
        Collegamento inviato a <strong>{email}</strong>. Aprilo da questo dispositivo.
      </p>
    )
  }

  return (
    <form className="access__card" onSubmit={requestLink}>
      <div className="field">
        <label className="label" htmlFor="email">
          Indirizzo email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      {error ? (
        <p className="error-box" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn--primary" disabled={phase === 'invio'}>
        {phase === 'invio' ? 'Invio…' : 'Ricevi il collegamento'}
      </button>
    </form>
  )
}
