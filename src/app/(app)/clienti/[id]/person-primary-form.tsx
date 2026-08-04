'use client'

import { useEffect, useState } from 'react'

import { useWrite } from '@/lib/use-write'

import { setPersonPrimary } from '../person-edit-actions'

const UNREACHABLE = 'Il contatto principale non è stato cambiato: il server non ha risposto. Riprova fra un momento.'

/**
 * Scrive subito, senza `Salva`: è un interruttore, il gesto è già la decisione, ed è
 * reversibile togliendo la spunta. È la stessa grammatica della × di un tag, non quella di un
 * campo di testo, e una conferma per un'azione reversibile è rumore (kb-0.md §6).
 *
 * Nessun indicatore di salvataggio: quello appartiene ai campi che si salvano da soli (D21).
 * Qui la conferma è la spunta che resta, e perché resti la spunta segue il gesto e non la riga:
 * una casella controllata sul solo valore del database si spegne da sola al clic — React
 * rirende con il valore vecchio prima ancora che la richiesta parta — e chi guarda vede il
 * proprio tocco annullarsi. Il valore chiesto vale finché il database non l'ha raggiunto, e
 * torna indietro se la scrittura non riesce.
 */
export function PersonPrimaryForm({ personId, isPrimary }: { personId: string; isPrimary: boolean }) {
  const { pending, error, write } = useWrite(UNREACHABLE)
  const [asked, setAsked] = useState<boolean | null>(null)

  const checked = asked ?? isPrimary

  // La riga ha raggiunto quello che è stato chiesto: da qui in poi la spunta torna a seguire il
  // database, così una modifica arrivata da fuori non resta nascosta da uno stato locale vecchio.
  useEffect(() => {
    setAsked((current) => (current === isPrimary ? null : current))
  }, [isPrimary])

  // La scrittura non è riuscita: la spunta torna a dire quello che è davvero salvato, e il
  // messaggio sotto dice cosa fare.
  useEffect(() => {
    if (error !== null) setAsked(null)
  }, [error])

  return (
    <div className="field">
      <label className="check">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked

            setAsked(next)

            const formData = new FormData()

            formData.set('person_id', personId)
            formData.set('primary', next ? '1' : '0')

            write(() => setPersonPrimary({}, formData))
          }}
        />
        contatto principale
      </label>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
