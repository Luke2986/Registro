import { answerTypeLabel } from '@/lib/answer-types'
import type { Database } from '@/lib/database.types'

import { BlockTitleForm } from './block-title-form'

type BlockRow = Database['public']['Tables']['question_blocks']['Row']
type QuestionRow = Database['public']['Tables']['questions']['Row']

/**
 * I tipi si derivano dallo schema generato e non si riscrivono a mano: una colonna che cambia
 * nome ferma il compilatore invece di arrivare a schermo come campo vuoto.
 */
export type QuestionnaireQuestion = Pick<
  QuestionRow,
  'id' | 'text' | 'help_text' | 'answer_type' | 'options' | 'is_active'
>

export type QuestionnaireBlock = Pick<BlockRow, 'id' | 'title'> & {
  questions: QuestionnaireQuestion[]
}

/**
 * Una card per blocco e non una card sola con otto sezioni dentro: l'intestazione di una card
 * porta un titolo e nient'altro, salvo un'azione allineata a destra (design-system.md §5), ed è
 * lì che le Story 2.2 e 2.5 metteranno la loro. Una card sola andrebbe smontata fra due story.
 *
 * Nessun `'use client'`: la resa delle domande è testo fermo e resta sul server. L'unica parte
 * interattiva è l'intestazione, che è il componente client montato qui sotto.
 */
export function BlockCard({ block }: { block: QuestionnaireBlock }) {
  return (
    <section className="card">
      <BlockTitleForm blockId={block.id} title={block.title} />

      {block.questions.length > 0 ? (
        <ul className="questions">
          {block.questions.map((question) => (
            <li
              key={question.id}
              className={`question${question.is_active ? '' : ' question--inactive'}`}
            >
              <p className="question__text">{question.text}</p>

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
                  valorizzato: lo schema non lega le due colonne — `options text[]` non ha nessun
                  `check` e «valorizzato solo per scelta_singola» è un commento — quindi una
                  domanda riscritta da `scelta_singola` a un altro tipo senza svuotare `options`
                  annuncerebbe scelte che in call non ci saranno. */}
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
            </li>
          ))}
        </ul>
      ) : (
        // Oggi non capita, perché il seed crea gli 8 blocchi con dentro le loro domande. Dopo la
        // Story 2.2 sarà raggiungibile, e una card col solo titolo sembrerebbe un guasto.
        <p className="meta">Nessuna domanda in questo blocco.</p>
      )}
    </section>
  )
}
