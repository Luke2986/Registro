'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useEditableField, type SaveResult } from '@/lib/use-editable-field'

import { renameBlock } from './actions'

/**
 * L'intestazione della card di blocco: a riposo il titolo con il suo `Rinomina`, aperto il
 * modulo che la sostituisce — tenere l'h2 sopra il campo vorrebbe dire lo stesso titolo scritto
 * due volte, di cui uno vecchio.
 *
 * Il titolo si corregge da un pulsante e non da un campo sempre acceso: la schermata del
 * questionario è fatta per leggere, e otto campi accesi la trasformerebbero in un modulo. Lo
 * stato `renaming` sta qui e non in block-card.tsx, che così resta un Server Component.
 *
 * `Rinomina` è `btn--quiet`: azione terziaria, otto pulsanti bordati uno sotto l'altro
 * peserebbero quanto il contenuto.
 *
 * Il campo è corto e si conferma (D21): `autosave: false`, nessun SaveIndicator, che è la
 * seconda metà della regola del campo lungo.
 */
export function BlockTitleForm({ blockId, title }: { blockId: string; title: string }) {
  const [renaming, setRenaming] = useState(false)
  const [returning, setReturning] = useState(false)

  /**
   * Alla chiusura il fuoco torna su `Rinomina`, che ricompare nello stesso posto: più semplice
   * del caso delle persone, dove i due pulsanti si scambiano e il fuoco va sul titolo.
   */
  const renameButton = useRef<HTMLButtonElement>(null)

  const run = useCallback(
    (next: string): Promise<SaveResult> => {
      const payload = new FormData()
      payload.set('block_id', blockId)
      payload.set('title', next)

      return renameBlock({}, payload)
    },
    [blockId],
  )

  const { pending, result, save, cancel, control } = useEditableField({
    run,
    baseline: title,
    autosave: false,
  })

  useEffect(() => {
    if (!returning) return

    setReturning(false)
    renameButton.current?.focus()
  }, [returning])

  // Dopo un salvataggio riuscito il modulo si chiude da sé: `saved` arriva solo su un successo,
  // e il titolo nuovo lo porta la rivalidazione di /questionario.
  useEffect(() => {
    if (result.saved === undefined) return

    setRenaming(false)
    setReturning(true)
  }, [result])

  const id = `blocco-${blockId}-titolo`
  const errorId = `${id}-errore`

  if (!renaming) {
    return (
      <div className="card__header">
        <h2 className="card__title">{title}</h2>
        <button
          type="button"
          ref={renameButton}
          className="btn btn--quiet"
          onClick={() => setRenaming(true)}
        >
          Rinomina
        </button>
      </div>
    )
  }

  return (
    <form
      className="field block-rename"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label className="label" htmlFor={id}>
        Titolo del blocco
      </label>

      {/* autoFocus: il pulsante che ha aperto il modulo non c'è più, e chi usa la tastiera
          resterebbe con il fuoco sul corpo della pagina. Nessun maxLength: con l'attributo il
          messaggio del limite diventa codice che nessuno vedrà, e l'incolla si tronca in
          silenzio. Il limite lo dice il server. */}
      <input
        {...control}
        id={id}
        className="input"
        type="text"
        autoComplete="off"
        autoFocus
        disabled={pending}
        aria-invalid={result.error ? true : undefined}
        aria-describedby={result.error ? errorId : undefined}
      />

      {result.error ? (
        <p className="field__error" role="alert" id={errorId}>
          {result.error}
        </p>
      ) : null}

      <div className="field__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        {/* Riportare il campo al valore di prima è reversibile, quindi nessuna conferma. */}
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={() => {
            cancel()
            setRenaming(false)
            setReturning(true)
          }}
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
