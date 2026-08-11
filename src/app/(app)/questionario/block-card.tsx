import type { Database } from '@/lib/database.types'
import type { QuestionnaireMode } from '@/lib/questionnaire-mode'

import { BlockTitleForm } from './block-title-form'
import { DeleteButton } from './delete-button'
import { MoveButtons } from './move-buttons'
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
> & {
  /** L'aggregato di PostgREST, non le righe: quante schede hanno già congelato questa domanda. */
  answers: { count: number }[]
}

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
export function BlockCard({
  block,
  mode,
  isFirst,
  isLast,
}: {
  block: QuestionnaireBlock
  /** Quale gruppo di azioni rendere: le frecce oppure tutto il resto. */
  mode: QuestionnaireMode
  isFirst: boolean
  isLast: boolean
}) {
  // isFirst/isLast arrivano dalla pagina, che è l'unica a conoscere l'elenco intero: servono
  // solo a spegnere la freccia al bordo — il no-op della funzione resta l'ultima difesa.
  return (
    <section className="card">
      <BlockTitleForm
        blockId={block.id}
        title={block.title}
        mode={mode}
        actions={
          <MoveButtons
            kind="block"
            id={block.id}
            name={block.title}
            isFirst={isFirst}
            isLast={isLast}
          />
        }
        // Solo sul blocco vuoto, che è la stessa condizione che la 0017 verifica dentro la
        // transazione: il blocco non porta dati suoi, porta le domande, e svuotarlo è il passo
        // che si fa prima. Mostrarlo sempre vorrebbe dire un pulsante che rifiuta quasi sempre.
        //
        // La cella resta anche quando il pulsante non c'è, ed è metà della sistemazione: in una
        // fila allineata a destra un pulsante mancante fa slittare tutti gli altri di una
        // colonna, ed è così che tre righe consecutive finivano su tre coordinate diverse.
        trailing={
          block.questions.length === 0 ? (
            <DeleteButton kind="block" id={block.id} label={block.title} />
          ) : (
            <span />
          )
        }
      />

      {block.questions.length > 0 ? (
        <ul className="questions">
          {/* La resa della domanda — display, `Modifica` e modulo — sta nel componente foglia,
              con il suo stato `editing`: così questa card resta un Server Component, come
              l'intestazione con BlockTitleForm. */}
          {block.questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              mode={mode}
              isFirst={index === 0}
              isLast={index === block.questions.length - 1}
              // La forma dell'aggregato resta qui, sul server: il componente foglia riceve la
              // risposta e non la domanda. `?? 0` perché PostgREST rende l'aggregato come un
              // array, e un array vuoto vuol dire nessuna riga, cioè zero.
              deletable={(question.answers[0]?.count ?? 0) === 0}
            />
          ))}
        </ul>
      ) : (
        // Oggi non capita, perché il seed crea gli 8 blocchi con dentro le loro domande. Dopo la
        // Story 2.2 sarà raggiungibile, e una card col solo titolo sembrerebbe un guasto.
        <p className="meta">Nessuna domanda in questo blocco.</p>
      )}

      {/* Un solo punto di montaggio che serve tutti e due i rami, in fondo alla card, dove la
          domanda nuova nascerà — stessa regola del pulsante unico di `Aggiungi blocco`. */}
      <NewQuestionForm blockId={block.id} blockTitle={block.title} />
    </section>
  )
}
