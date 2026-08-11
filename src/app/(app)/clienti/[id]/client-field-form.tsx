'use client'

import { useCallback, useEffect, useRef } from 'react'

import { SaveIndicator } from '@/components/save-indicator'
import type { EditableField } from '@/lib/client-fields'
import { CLIENT_STATUSES } from '@/lib/client-status'
import { useEditableField, type SaveResult } from '@/lib/use-editable-field'
import { CLIENT_NAME_MAX_LENGTH } from '@/lib/validate-client-name'

import { renameClient, updateClientField, updateClientStatus } from '../actions'

/**
 * Il campo modificabile della scheda, usato dodici volte con parametri diversi. `kind` decide
 * tre cose e nient'altro: che controllo si rende, quale azione si chiama, se il campo si salva
 * da solo.
 *
 * Ogni campo è un modulo a sé: un salvataggio che fallisce riguarda un campo solo e non porta
 * via quello che c'è scritto negli altri (NFR1). I dodici moduli sono fratelli dentro la
 * card, mai annidati.
 *
 * Il `FormData` lo costruisce `run`, sempre, sia che a tirare la corda sia il pulsante, sia il
 * timer, sia `Riprova`: un solo percorso di scrittura per davvero, e nessun invio nativo che
 * possa partire in parallelo a quello.
 */
export function ClientFieldForm({
  clientId,
  field,
  value: stored,
}: {
  clientId: string
  field: EditableField
  value: string | null
}) {
  const autosaves = field.kind === 'long'
  const baseline = stored ?? ''

  /** Il nome su cui l'avviso di doppione è già stato dato. Annulla lo azzera: un avviso accettato
      e poi abbandonato non vale per il tentativo successivo, che deve avvisare di nuovo. */
  const acknowledged = useRef('')

  const run = useCallback(
    (next: string): Promise<SaveResult> => {
      const payload = new FormData()
      payload.set('client_id', clientId)

      if (field.kind === 'name') {
        payload.set('name', next)
        payload.set('duplicate_of', acknowledged.current)

        return renameClient({}, payload)
      }

      if (field.kind === 'status') {
        payload.set('status', next)

        return updateClientStatus({}, payload)
      }

      payload.set('field', field.key)
      payload.set('value', next)

      return updateClientField({}, payload)
    },
    [clientId, field],
  )

  const { dirty, pending, result, saveState, save, cancel, control } = useEditableField({
    run,
    baseline,
    autosave: autosaves,
  })

  useEffect(() => {
    if (result.duplicateOf !== undefined) acknowledged.current = result.duplicateOf
  }, [result])

  const id = `campo-${field.key}`
  const errorId = `${id}-errore`
  const warningId = `${id}-avviso`
  const described = [result.error ? errorId : null, result.duplicateOf ? warningId : null].filter(
    (it) => it !== null,
  )

  const shared = {
    ...control,
    id,
    'aria-invalid': result.error ? true : undefined,
    'aria-describedby': described.join(' ') || undefined,
  }

  // Col mouse il fuoco non si sposta affatto sul pulsante, così il campo non ha nemmeno modo di
  // credere di essere stato lasciato. Da tastiera ci pensa il controllo su `relatedTarget`.
  const keepFocus = autosaves ? (event: { preventDefault: () => void }) => event.preventDefault() : undefined

  return (
    <form
      className={`field${autosaves ? ' field--wide' : ''}${field.kind === 'status' ? ' field--status' : ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label className="label" htmlFor={id}>
        {field.label}
      </label>

      {field.kind === 'long' ? (
        <textarea {...shared} className="input input--long" rows={3} />
      ) : field.kind === 'integer' ? (
        /* type="text" e non type="number": con type="number" il browser restituisce stringa
           vuota per un contenuto non numerico, e quello che è stato battuto sparirebbe prima
           di arrivare al server. inputMode dà comunque il tastierino sul tablet. */
        <input {...shared} className="input" type="text" inputMode="numeric" autoComplete="off" />
      ) : field.kind === 'name' ? (
        <input
          {...shared}
          className="input input--display"
          type="text"
          maxLength={CLIENT_NAME_MAX_LENGTH}
          autoComplete="off"
        />
      ) : field.kind === 'status' ? (
        /* Nessuna opzione vuota in testa: la colonna è `not null` con default `potenziale`,
           quindi uno stato c'è sempre. Freccia nativa, che sul tablet si comporta meglio di
           qualunque sostituto disegnato a mano. */
        <select {...shared} className="input select" autoComplete="off">
          {CLIENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} className="input" type="text" autoComplete="off" />
      )}

      {result.error ? (
        <p className="field__error" role="alert" id={errorId}>
          {result.error}
        </p>
      ) : null}

      {result.duplicateOf ? (
        <p className="warn-box" role="alert" id={warningId}>
          Esiste già un cliente con questo nome. Salva di nuovo per rinominarlo lo stesso.
        </p>
      ) : null}

      {/* A riposo la scheda si legge, non si compila: i pulsanti compaiono solo quando il
          campo è cambiato. */}
      {dirty ? (
        <div className="field__actions">
          <button type="submit" className="btn btn--primary" aria-busy={pending} onMouseDown={keepFocus}>
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          {/* Riportare il campo al valore di prima è reversibile, quindi nessuna conferma. */}
          <button
            type="button"
            className="btn btn--secondary"
            onMouseDown={keepFocus}
            onClick={() => {
              acknowledged.current = ''
              cancel()
            }}
          >
            Annulla
          </button>
        </div>
      ) : null}

      {autosaves ? <SaveIndicator state={saveState} onRetry={() => save()} /> : null}
    </form>
  )
}
