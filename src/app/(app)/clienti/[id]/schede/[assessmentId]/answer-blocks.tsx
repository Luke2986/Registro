import type { AnswerGroup } from '@/lib/answer-groups'
import type { AnswerDetail } from '@/lib/types'

import { AnswerField } from './answer-field'

/**
 * Una card per blocco, in sequenza verticale: è la forma della schermata del questionario, che è
 * già la stessa cosa disposta allo stesso modo, ed è «i blocchi in sequenza verticale» (AC1) senza
 * inventare niente. Nessun passaggio obbligato, nessuna numerazione, nessun collasso e nessuna
 * scheda a linguette: una schermata che si scorre è quella che segue una conversazione.
 *
 * Nessun `'use client'`: qui è tutto testo fermo. L'unica parte che si tocca è il campo, che è il
 * componente client montato qui sotto e che tiene il proprio stato — è il motivo per cui la Story
 * 3.3 ha sostituito quel `useState` con `useEditableField` senza aprire questo file.
 *
 * **Nessun elemento `<form>`**, e non è una dimenticanza. La ragione non è più che non ci sia
 * niente da inviare — dalla 3.3 ogni campo si salva — ma che un `<form>` porterebbe l'invio
 * implicito con Invio, cioè un ricaricamento che porta via quello che è stato scritto, su una
 * schermata dove si preme Invio per andare a capo. Il perché per esteso sta in `answer-field.tsx`.
 */
export function AnswerBlocks({ groups }: { groups: AnswerGroup<AnswerDetail>[] }) {
  return (
    <>
      {groups.map((group) => (
        // La `key` è l'`id` della prima risposta e non il titolo: due blocchi omonimi sono
        // possibili — è la stessa ragione per cui il raggruppamento va per corse — e due `key`
        // uguali fanno rendere a React un solo blocco dei due, in silenzio. Il ripiego sul titolo
        // non si raggiunge: un gruppo nasce solo insieme alla sua prima risposta.
        <section className="card" key={group.answers[0]?.id ?? group.title}>
          <div className="card__header">
            <h2 className="card__title">{group.title}</h2>
          </div>

          <ol className="answers">
            {group.answers.map((answer) => (
              <li className="answer" key={answer.id}>
                <AnswerField
                  answerId={answer.id}
                  questionText={answer.question_text}
                  helpText={answer.help_text}
                  answerType={answer.answer_type}
                  options={answer.options}
                  content={answer.content}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  )
}
