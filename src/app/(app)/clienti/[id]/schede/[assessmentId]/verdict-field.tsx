'use client'

import { useCallback, useEffect } from 'react'

import { useEditableField, type SaveResult } from '@/lib/use-editable-field'
import { VERDICTS, VERDICT_LABELS, type VerdictField as FieldDescriptor } from '@/lib/verdict'

import { saveVerdict } from '../../../verdict-actions'

import { useAnswerSave } from './save-boundary'

/**
 * Un campo del verdetto. **Si salva da solo e si iscrive allo stesso registro delle ventiquattro
 * risposte**: un indicatore solo, un `Salva` solo, una `Riprova` sola. Un `Salva` per campo qui
 * sarebbe la terza convenzione della stessa schermata (UX-DR8, decisione della 3.3).
 *
 * **Nessun `required`, nessun asterisco, nessuna conferma, nessun avviso quando il verdetto
 * cambia**: non scriverlo è una risposta legittima e cambiarlo riesce sempre (AC2, AC3, NFR8, D14).
 * Non c'è codice che lo garantisca — è codice che non si scrive.
 */
export function VerdictField({
  assessmentId,
  field,
  value: stored,
  onVerdictChange,
}: {
  assessmentId: string
  field: FieldDescriptor
  value: string | null
  /** Passato al solo campo dell'esito: la card ne segue il valore vivo per la pillola e per i due
      campi condizionali, che devono comparire alla scelta e non tre secondi dopo. */
  onVerdictChange?: (next: string) => void
}) {
  const store = useAnswerSave()

  // `run` dentro `useCallback`, ed è la trappola più grossa di questa schermata: l'hook mette `run`
  // fra le dipendenze di `write`, e `write` fra quelle dell'effetto che arma il timer. Un `run`
  // ricreato a ogni resa riarmerebbe il timer a ogni battuta, e il salvataggio automatico potrebbe
  // non partire mai — senza nessun errore.
  const run = useCallback(
    (next: string): Promise<SaveResult> => {
      const payload = new FormData()
      payload.set('assessment_id', assessmentId)
      payload.set('field', field.key)
      payload.set('value', next)

      return saveVerdict({}, payload)
    },
    [assessmentId, field.key],
  )

  const { dirty, pending, result, saveState, save, control } = useEditableField({
    run,
    baseline: stored ?? '',
    autosave: true,
    // Il solo campo data, e il perché sta per esteso sull'hook: un controllo data restituisce la
    // stringa vuota finché i tre segmenti non formano una data valida, quindi col timer ribattere
    // l'anno di una data salvata e fermarsi tre secondi la cancella. Qui si salva uscendo dal
    // campo, che è quando una data è finita davvero.
    deferUntilExit: field.kind === 'date',
  })

  // **La chiave del registro non può essere l'`id` della scheda**, che è uno solo per tutti e
  // cinque, né una chiave che possa somigliare a un uuid: le altre ventiquattro voci usano l'`id`
  // della risposta. Sbagliando, un campo del verdetto e una risposta si sovrascrivono a vicenda e
  // la barra racconta la scheda sbagliata, in silenzio.
  const entryId = `verdetto-${field.key}`

  // Il cleanup sta in un effetto suo e gira solo allo smontaggio: dentro il secondo toglierebbe e
  // rimetterebbe la voce a ogni battuta. Serve davvero qui, perché due di questi campi si smontano
  // quando il verdetto smette di essere condizionato: senza, resterebbe una voce sporca e il
  // `Salva` della barra acceso per sempre su un campo che non c'è più.
  useEffect(() => () => store.remove(entryId), [store, entryId])

  // Senza elenco di dipendenze di proposito: `save` è una chiusura nuova a ogni resa, quindi un
  // elenco sarebbe una bugia. `set` è idempotente e avvisa solo quando il riassunto cambia davvero.
  useEffect(() => {
    store.set(entryId, { state: saveState, dirty, pending, save })
  })

  const id = `campo-${entryId}`
  const errorId = `errore-${entryId}`

  const shared = {
    ...control,
    // L'unico gestore che non arriva intatto dall'hook, e solo sull'esito: la card deve sapere cosa
    // è stato scelto **adesso**. `control.onChange` resta il primo a essere chiamato, così niente
    // di quello che fa — il valore, l'errore azzerato, il ricordo dell'uscita — dipende da questa
    // riga.
    onChange: (event: { target: { value: string } }) => {
      control.onChange(event)
      onVerdictChange?.(event.target.value)
    },
    id,
    'aria-invalid': result.error ? true : undefined,
    'aria-describedby': result.error ? errorId : undefined,
  }

  return (
    <div className={`field${field.kind === 'long' ? ' field--wide' : ''}`}>
      <label className="label" htmlFor={id}>
        {field.label}
      </label>

      {field.kind === 'verdict' ? (
        /* Nessuna opzione vuota in testa: la colonna è `not null` con default `non_deciso`, quindi
           un verdetto c'è sempre — esattamente come lo stato del cliente. L'ordine è quello del
           vincolo `check` e non un ordine di merito, e nessun colore entra nel selettore: il
           software non suggerisce nessun esito (AC5, NFR7). */
        <select {...shared} className="input select" autoComplete="off">
          {VERDICTS.map((verdict) => (
            <option key={verdict} value={verdict}>
              {VERDICT_LABELS[verdict]}
            </option>
          ))}
        </select>
      ) : field.kind === 'long' ? (
        <textarea {...shared} className="input input--long" rows={3} />
      ) : field.kind === 'date' ? (
        /* Sul tablet apre il selettore di sistema. Nessun `min` e nessun `max`: il software
           registra e mostra, non decide e non vieta (D14). Il valore che il controllo accetta è `''`
           o `AAAA-MM-GG` e nient'altro, e l'hook lo tiene sempre in quella forma. */
        <input {...shared} className="input" type="date" autoComplete="off" />
      ) : (
        <input {...shared} className="input" type="text" autoComplete="off" />
      )}

      {/* La riga sta qui perché la barra non può dirlo: l'indicatore ancorato dice *che* qualcosa
          non è stato salvato, e con ventinove campi **quale** lo può dire solo il campo. */}
      {result.error ? (
        <p className="field__error" role="alert" id={errorId}>
          {result.error}
        </p>
      ) : null}
    </div>
  )
}
