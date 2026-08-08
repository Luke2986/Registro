import type { Database } from '@/lib/database.types'

import { BlockTitleForm } from './block-title-form'
import { NewQuestionForm } from './new-question-form'
import { QuestionItem } from './question-item'

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
          {/* La resa della domanda — display, `Modifica` e modulo — sta nel componente foglia,
              con il suo stato `editing`: così questa card resta un Server Component, come
              l'intestazione con BlockTitleForm. */}
          {block.questions.map((question) => (
            <QuestionItem key={question.id} question={question} />
          ))}
        </ul>
      ) : (
        // Oggi non capita, perché il seed crea gli 8 blocchi con dentro le loro domande. Dopo la
        // Story 2.2 sarà raggiungibile, e una card col solo titolo sembrerebbe un guasto.
        <p className="meta">Nessuna domanda in questo blocco.</p>
      )}

      {/* Un solo punto di montaggio che serve tutti e due i rami, in fondo alla card, dove la
          domanda nuova nascerà — stessa regola del pulsante unico di `Aggiungi blocco`. */}
      <NewQuestionForm blockId={block.id} />
    </section>
  )
}
