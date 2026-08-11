'use client'

import { useWrite } from '@/lib/use-write'

import { restorePerson } from '../people-actions'

const UNREACHABLE = 'La persona non è stata ripristinata: il server non ha risposto. Riprova fra un momento.'

/**
 * `Ripristina` non chiede conferma, ed è la stessa regola che la chiede a `Elimina`: qui non si
 * perde niente, la persona torna dov'era e semmai la si rielimina (kb-0.md §6).
 *
 * Gemello di quello del questionario e non lo stesso componente: cambia l'azione che chiama,
 * perché cambia la pagina da rivalidare. Unirli vorrebbe dire passare l'azione come prop, cioè
 * una funzione che attraversa il confine fra server e browser.
 */
export function PersonRestoreForm({ archiveId, name }: { archiveId: string; name: string }) {
  const { pending, error, write } = useWrite(UNREACHABLE)

  function restore() {
    const formData = new FormData()

    formData.set('archive_id', archiveId)

    write(() => restorePerson({}, formData))
  }

  return (
    <div className="field">
      <div className="field__actions">
        <button
          type="button"
          className="btn btn--secondary"
          aria-label={`Ripristina ${name}`}
          aria-busy={pending}
          onClick={restore}
        >
          {pending ? 'Ripristino…' : 'Ripristina'}
        </button>
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
