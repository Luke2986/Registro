'use client'

import { useState } from 'react'

import { ANSWER_TYPES, answerTypeLabel, isAnswerType, type AnswerType } from '@/lib/answer-types'
import { useWrite } from '@/lib/use-write'

import type { QuestionnaireQuestion } from './block-card'
import { updateQuestion } from './question-update-actions'

const UNREACHABLE = 'La domanda non è stata salvata: il server non ha risposto. Riprova fra un momento.'

/**
 * Il modulo di modifica di una domanda. I campi sono gli stessi quattro della creazione, con le
 * stesse etichette, ed è duplicazione dichiarata, non silenziosa (Dev Notes della story, dec. 3):
 * generalizzare new-question-form.tsx vorrebbe dire una macchina di props — id, default,
 * etichetta del submit, semantica del reset — su un file appena stabilizzato da una revisione.
 * Se fra tre story i moduli sono tre, l'astrazione si fa lì, sapendo cosa deve servire.
 *
 * Al successo chiama `onClose` e basta: niente `element.reset()` — nel modulo di creazione
 * serviva a ripulire per il giro dopo, qui il componente si smonta e un reset chiamato male
 * ripristinerebbe il prefill sopra quello che c'era scritto.
 */
export function EditQuestionForm({
  question,
  onClose,
}: {
  question: QuestionnaireQuestion
  onClose: () => void
}) {
  // La guardia e non un `as`: answer_type è string nei tipi generati, e un valore fuori dai
  // quattro — possibile solo da SQL — ripiega su testo_lungo invece di rompere il select.
  const initialType: AnswerType = isAnswerType(question.answer_type)
    ? question.answer_type
    : 'testo_lungo'
  const initialOptions = (question.options ?? []).join('\n')

  const [answerType, setAnswerType] = useState<AnswerType>(initialType)

  // Anche le opzioni sono controllate, ed è protezione, non pilotaggio: il campo si smonta
  // quando il tipo lascia la scelta singola, e senza stato un tocco accidentale sul select
  // porterebbe via quello che c'era scritto (revisione 2.3, decisione di Luca).
  const [options, setOptions] = useState(initialOptions)

  const { pending, error, clearError, write } = useWrite(UNREACHABLE)

  // Il confronto è col prefill, non col database: serve a sapere se chiudere butta via del
  // digitato, non se la domanda è cambiata. text e help_text si leggono dal form perché non
  // sono controllati; il confronto grezzo può dire «modificato» per uno spazio in coda che il
  // server poi normalizzerebbe — direzione giusta: al massimo chiede una conferma in più, mai
  // una in meno.
  function isDirty(form: HTMLFormElement): boolean {
    const data = new FormData(form)

    return (
      data.get('text') !== question.text ||
      data.get('help_text') !== (question.help_text ?? '') ||
      answerType !== initialType ||
      options !== initialOptions
    )
  }

  function close() {
    // L'errore parla del tentativo abbandonato: riaprendo il modulo non deve esserci già rosso.
    clearError()
    onClose()
  }

  // Gli id portano il question.id: il modulo può esistere in più istanze sulla stessa pagina.
  const textId = `domanda-${question.id}-testo`
  const helpId = `domanda-${question.id}-aiuto`
  const typeId = `domanda-${question.id}-tipo`
  const optionsId = `domanda-${question.id}-opzioni`

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()

        // Letto qui, mentre l'evento è ancora in corso: dopo, `currentTarget` è nullo.
        const formData = new FormData(event.currentTarget)

        formData.set('question_id', question.id)

        write(
          () => updateQuestion({}, formData),
          () => close(),
        )
      }}
    >
      <div className="field">
        <label className="label" htmlFor={textId}>
          Testo della domanda
        </label>

        {/* autoFocus: il pulsante che ha aperto il modulo non c'è più. defaultValue e non
            value: il campo non pilota niente, e un prefill controllato sarebbe stato in più.
            Nessun maxLength: il limite lo dice il server, con il messaggio che spiega cosa
            fare. */}
        <textarea
          id={textId}
          name="text"
          className="input input--long"
          autoComplete="off"
          autoFocus
          disabled={pending}
          defaultValue={question.text}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={helpId}>
          Cosa serve capire
        </label>

        {/* `?? ''`: una domanda con l'aiuto vuoto apre il campo vuoto, non con `null` dentro. */}
        <textarea
          id={helpId}
          name="help_text"
          className="input input--long"
          autoComplete="off"
          disabled={pending}
          defaultValue={question.help_text ?? ''}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={typeId}>
          Tipo di risposta
        </label>

        <select
          id={typeId}
          name="answer_type"
          className="input select"
          value={answerType}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value

            if (isAnswerType(value)) {
              setAnswerType(value)
              // L'errore può parlare di un campo che col tipo nuovo non esiste più
              // (revisione 2.3): al prossimo salvataggio, se serve, ricompare.
              clearError()
            }
          }}
        >
          {ANSWER_TYPES.map((type) => (
            <option key={type} value={type}>
              {answerTypeLabel(type)}
            </option>
          ))}
        </select>

        {/* Il campo opzioni si è smontato ma il dato c'è ancora, in stato e nel database:
            salvando, il server lo azzera (decisione 1 della story). Senza questa riga l'unica
            traccia sarebbe la sparizione del campo — un'azione distruttiva merita almeno un
            avviso (kb-0.md §6). Informa e non blocca (D14): revisione 2.4. */}
        {answerType !== 'scelta_singola' && options.trim() !== '' ? (
          <p className="meta">Questo tipo non usa opzioni: salvando, quelle scritte si perdono.</p>
        ) : null}
      </div>

      {/* Reso solo per la scelta singola: il campo compare e scompare con il tipo, ma il
          valore resta in stato e ricompare tornando sulla scelta singola. Quando è nascosto
          non manda niente al server, e comunque il server scrive null per gli altri tipi. */}
      {answerType === 'scelta_singola' ? (
        <div className="field">
          <label className="label" htmlFor={optionsId}>
            Opzioni, una per riga
          </label>

          <textarea
            id={optionsId}
            name="options"
            className="input input--long"
            autoComplete="off"
            disabled={pending}
            value={options}
            onChange={(event) => setOptions(event.target.value)}
          />
        </div>
      ) : null}

      {/* Un errore solo, sopra le azioni: con quattro campi non c'è un input solo a cui
          agganciare aria-describedby — il modello è new-person-form, non block-title-form. */}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Qui `Salva` è primario: dentro il modulo è l'unica azione. */}
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        {/* Su un modulo intonso Annulla chiude e basta: nessuna conferma per azioni
            reversibili (kb-0.md §6). Su un modulo riscritto chiede prima, perché il digitato
            non salvato non è recuperabile — è la metà della regola che vieta le azioni
            distruttive senza conferma (revisione 2.4). La conferma è la nativa: una modale
            propria per una frase sola sarebbe cerimonia. */}
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form

            if (
              form &&
              isDirty(form) &&
              !window.confirm('Chiudere senza salvare? Le modifiche a questa domanda si perdono.')
            ) {
              return
            }

            close()
          }}
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
