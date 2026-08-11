'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import type { QuestionnaireMode } from '@/lib/questionnaire-mode'
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
export function BlockTitleForm({
  blockId,
  title,
  mode,
  actions,
  trailing,
}: {
  blockId: string
  title: string
  /** Quale gruppo rendere: `actions` da solo in ordine, `Rinomina` più `trailing` in contenuto. */
  mode: QuestionnaireMode
  /** Le azioni della card oltre a `Rinomina` (le frecce della 2.5), rese solo a riposo. */
  actions?: ReactNode
  /** Quelle che stanno dopo `Rinomina`: l'azione distruttiva va per ultima, com'è nella riga
      della domanda. Un secondo slot e non un riordino di `actions`, che vale per tutte. */
  trailing?: ReactNode
}) {
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
    // Il gruppo sta a destra come stava l'azione sola: in rinomina il modulo sostituisce
    // l'intestazione intera, frecce comprese, com'è già per il titolo.
    //
    // I due gruppi non convivono mai, e non è una semplificazione: sono la stessa cosa di
    // `question-item.tsx`, cioè le due metà che la modalità separa. In ordine il gruppo è
    // sempre lo stesso — due icone — quindi non ha bisogno di griglia; in contenuto ne ha
    // bisogno, perché `Elimina` c'è solo sul blocco vuoto.
    return (
      <div className="card__header">
        <h2 className="card__title">{title}</h2>
        {mode === 'order' ? (
          <div className="card__actions">{actions}</div>
        ) : (
          <div className="card__actions card__actions--grid">
            {/* Stessa ragione del `Modifica` della domanda: otto «Rinomina» identici non si
                distinguono in un elenco di pulsanti, e il titolo del blocco è ciò che li separa. */}
            <button
              type="button"
              ref={renameButton}
              className="btn btn--quiet"
              aria-label={`Rinomina il blocco «${title}»`}
              onClick={() => setRenaming(true)}
            >
              Rinomina
            </button>
            {trailing}
          </div>
        )}
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
        <button type="submit" className="btn btn--primary" aria-busy={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        {/* Riportare il campo al valore di prima è reversibile, quindi nessuna conferma. `disabled`
            e non `aria-busy`, dalla revisione della 5.2: annullare non è un'azione in volo, e
            premuto durante la scrittura riporta il campo al titolo vecchio mentre il server scrive
            quello nuovo. */}
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
