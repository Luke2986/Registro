'use client'

import { useEffect, useRef, useState } from 'react'

import { answerTypeLabel } from '@/lib/answer-types'
import type { QuestionnaireMode } from '@/lib/questionnaire-mode'

import type { QuestionnaireQuestion } from './block-card'
import { DeleteButton } from './delete-button'
import { EditQuestionForm } from './edit-question-form'
import { MoveButtons } from './move-buttons'
import { QuestionActiveButton } from './question-active-button'

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
export function QuestionItem({
  question,
  mode,
  isFirst,
  isLast,
  deletable,
}: {
  question: QuestionnaireQuestion
  /** Quale gruppo di azioni rendere: le frecce oppure tutto il resto. */
  mode: QuestionnaireMode
  isFirst: boolean
  isLast: boolean
  /** Nessuna scheda l'ha mai contenuta, quindi non c'è storia da perdere a cancellarla (0017). */
  deletable: boolean
}) {
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
            {/* I due gruppi non convivono mai: la modalità separa il riordino da tutto il resto,
                perché le frecce da sole occupavano metà della fila per l'azione che si usa meno.
                In ordine il gruppo è sempre lo stesso — due icone — quindi resta una fila; in
                contenuto è una griglia, perché `Elimina` c'è solo su alcune domande e in una
                fila allineata a destra la sua assenza faceva slittare tutte le altre.
                Le frecce ci sono anche sulle domande non attive: nessuno stato blocca nessuna
                azione (D14) — una domanda spenta si può ancora mettere nell'ordine giusto. */}
            {mode === 'order' ? (
              <div className="question__actions">
                <MoveButtons
                  kind="question"
                  id={question.id}
                  name={question.text}
                  isFirst={isFirst}
                  isLast={isLast}
                />
              </div>
            ) : (
              <div className="question__actions question__actions--grid">
                {/* Il nome accessibile porta la domanda, la parola visibile no: ventitré
                    «Modifica» identici sono quello che sente chi naviga per elenco di pulsanti,
                    e nell'elenco il testo della domanda è l'unica cosa che li distingue. A
                    schermo la parola resta sola, perché lì la domanda è già scritta accanto. */}
                <button
                  type="button"
                  ref={editButton}
                  className="btn btn--quiet"
                  aria-label={`Modifica la domanda «${question.text}»`}
                  onClick={() => setEditing(true)}
                >
                  Modifica
                </button>
                {/* Anche sulle domande spente, dove dice `Riattiva`: nessuno stato blocca
                    nessuna azione (D14). */}
                <QuestionActiveButton
                  questionId={question.id}
                  questionText={question.text}
                  isActive={question.is_active}
                />
                {/* `Elimina` e `Disattiva` non sono due modi di dire la stessa cosa e convivono
                    di proposito: la prima toglie una domanda che non è mai servita, la seconda la
                    ritira dalle schede nuove lasciando leggibili le vecchie. Appena una scheda la
                    contiene resta solo la seconda, e il pulsante sparisce invece di rifiutare —
                    ma la sua cella resta, altrimenti la fila slitta. */}
                {deletable ? (
                  <DeleteButton kind="question" id={question.id} label={question.text} />
                ) : (
                  <span />
                )}
              </div>
            )}
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
