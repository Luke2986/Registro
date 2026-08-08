'use client'

import { useEffect, useRef, useState } from 'react'

import { answerTypeLabel } from '@/lib/answer-types'

import type { QuestionnaireQuestion } from './block-card'
import { EditQuestionForm } from './edit-question-form'

/**
 * La singola domanda dentro la card di blocco: a riposo il display con il suo `Modifica`,
 * aperto il modulo che lo sostituisce — tenere il testo vecchio sopra il campo vorrebbe dire
 * la stessa domanda scritta due volte, di cui una vecchia (l'argomento di BlockTitleForm
 * sull'h2). Lo stato `editing` sta qui, nel componente foglia, come `renaming` sta in
 * BlockTitleForm e non nella card: block-card.tsx resta un Server Component.
 *
 * `Modifica` è `btn--quiet`: azione terziaria, fino a ventitré istanze sulla pagina — stesso
 * argomento di `Rinomina` e `Aggiungi domanda`. E c'è anche sulle domande non attive: nessuno
 * stato blocca nessuna azione (D14).
 */
export function QuestionItem({ question }: { question: QuestionnaireQuestion }) {
  const [editing, setEditing] = useState(false)
  const [returning, setReturning] = useState(false)

  /** Alla chiusura il fuoco torna su `Modifica`, che ricompare nello stesso posto. */
  const editButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!returning) return

    setReturning(false)
    editButton.current?.focus()
  }, [returning])

  return (
    <li className={`question${question.is_active ? '' : ' question--inactive'}`}>
      {editing ? (
        <EditQuestionForm
          question={question}
          onClose={() => {
            setEditing(false)
            setReturning(true)
          }}
        />
      ) : (
        <>
          <div className="question__header">
            <p className="question__text">{question.text}</p>
            <button
              type="button"
              ref={editButton}
              className="btn btn--quiet"
              onClick={() => setEditing(true)}
            >
              Modifica
            </button>
          </div>

          {/* Due domande su ventitré hanno l'aiuto vuoto: un contenitore reso comunque
              lascerebbe un buco che sembra un difetto. */}
          {question.help_text ? <p className="meta">{question.help_text}</p> : null}

          <p className="question__meta">
            <span className="badge">{answerTypeLabel(question.answer_type)}</span>
            {/* La parola c'è sempre, anche sulle attive: AC2 chiede di vedere *se* una domanda
                è attiva, e con ventitré domande attive su ventitré una parola che compare solo
                nel caso negativo non direbbe niente a nessuno. Una parola e non solo un colore,
                perché il colore non è mai l'unico portatore di significato (design-system.md
                §2); e una domanda disattivata non è né un errore né un avviso — è una scelta —
                quindi niente rosso e niente ambra. */}
            <span>{question.is_active ? 'attiva' : 'non attiva'}</span>
          </p>

          {/* Solo per `scelta_singola`, e non per qualsiasi domanda che abbia `options`
              valorizzato: dalla 0010 il dato incoerente non può più nascere, ma la difesa in
              resa resta — costa un confronto e tiene la pagina in piedi anche su un dato
              anteriore o forgiato. */}
          {question.answer_type === 'scelta_singola' &&
          question.options &&
          question.options.length > 0 ? (
            <ul className="question__options">
              {question.options.map((option, index) => (
                // La posizione e non il testo: due opzioni identiche sono un contenuto
                // strano, non un motivo per far cadere la resa. L'elenco è di sola lettura
                // e non si riordina, quindi l'indice è stabile.
                <li key={index}>{option}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </li>
  )
}
