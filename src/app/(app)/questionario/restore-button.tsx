'use client'

import { useWrite } from '@/lib/use-write'

import { restoreRow } from './delete-actions'

const UNREACHABLE = 'Non è stato ripristinato: il server non ha risposto. Riprova fra un momento.'

/**
 * `Ripristina` non chiede conferma, ed è la stessa regola che la chiede a `Elimina`: qui non si
 * perde niente, la voce torna dov'era e semmai la si rielimina (kb-0.md §6).
 *
 * `btn--secondary` e non `btn--quiet`: nel cestino è l'unica azione della riga, e un'azione sola
 * che non si vede è un cestino da cui non si esce.
 */
export function RestoreButton({ archiveId, label }: { archiveId: string; label: string }) {
  const { pending, error, write } = useWrite(UNREACHABLE)

  const submit = () => {
    const payload = new FormData()
    payload.set('archive_id', archiveId)

    write(() => restoreRow({}, payload))
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--secondary"
        disabled={pending}
        aria-label={`Ripristina ${label}`}
        onClick={submit}
      >
        {pending ? 'Ripristino…' : 'Ripristina'}
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
