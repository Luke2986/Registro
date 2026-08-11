import { redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { parseQuestionnaireMode } from '@/lib/questionnaire-mode'
import { createClient } from '@/lib/supabase/server'

import { BlockCard } from './block-card'
import { ModeSwitch } from './mode-switch'
import { NewBlockForm } from './new-block-form'
import { TrashCard } from './trash-card'

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  // `await` obbligatorio: da Next 15 `searchParams` è una promessa e in 16 la forma sincrona non
  // esiste più. Stesso schema di /clienti, che già attende i suoi filtri.
  const mode = parseQuestionnaireMode(await searchParams)

  // Innesto normale e mai `question_blocks!inner` né `questions!inner`: con !inner sparirebbero
  // il questionario senza blocchi — cioè proprio lo stato vuoto che AC4 chiede di mostrare — e il
  // blocco senza domande, che dalla Story 2.2 sarà normale avere. La sicurezza a livello di riga
  // vale anche sulle righe innestate: `question_blocks_owner_all` e `questions_owner_all`
  // (0007_rls.sql) risalgono al questionario, quindi qui non c'è nessun filtro sul proprietario
  // da riscrivere — riscriverlo sarebbe la duplicazione che database.md §6 evita di proposito.
  //
  // Nessun `.eq('is_active', true)` sulle domande, e non è una dimenticanza: AC2 chiede di vedere
  // *se* una domanda è attiva, quindi filtrarle renderebbe invisibile metà del criterio. È il
  // contrario di quello che farà la schermata di compilazione.
  //
  // `answers(count)` è l'aggregato e non le righe: dice solo *se* una domanda è già finita in una
  // scheda, che è la condizione da cui dipende `Elimina` (0017). Il contenuto delle risposte non
  // si legge — è il confine che database.md §3 traccia per l'elenco clienti, e vale qui uguale.
  // Senza questo conteggio il pulsante comparirebbe su tutte le domande e rifiuterebbe su quasi
  // tutte: la regola è del server, ma dev'essere visibile prima di premere.
  //
  // Niente `.single()` e niente `.maybeSingle()`: tutti e due trasformano «due righe» in un
  // errore, e questa schermata finirebbe sullo stato d'errore per un dato che non è un guasto.
  // `questionnaires` non ha nessun vincolo che imponga un solo questionario attivo.
  // `.order('created_at')` prima del limite perché `.limit(1)` senza ordinamento sceglie una riga
  // qualsiasi: con due questionari attivi la schermata cambierebbe da un caricamento all'altro.
  // `.order('id')` subito dopo per la ragione scritta sotto — nemmeno `created_at` è unico qui, e
  // qui il pareggio non cambia l'ordine di una lista: cambia *quale* questionario si vede.
  //
  // L'ordine di blocchi e domande lo fa il database, con `referencedTable`. La forma col punto per
  // il secondo livello di innesto è stata verificata sul progetto il 5 agosto 2026: un percorso di
  // innesto inesistente risponde PGRST108 e una colonna inesistente su quel percorso risponde
  // 42703, quindi il parametro viene applicato e non ignorato in silenzio.
  //
  // I criteri dopo `position` non sono decorativi: `position` non è unico in nessuna delle due
  // tabelle (0004_questionnaire.sql non crea nessun indice `unique`), e un `order by` su una
  // colonna sola non definisce nessun ordine a parità di valore.
  //
  // `created_at` da solo non basta, ed è la cosa meno ovvia di questo blocco: `seed.sql` è un
  // unico `do $$ … end $$`, cioè una transazione sola, e `now()` in Postgres è il timestamp *di
  // transazione*. Tutte le righe seminate condividono quindi lo stesso `created_at` — verificato,
  // vale 1 valore distinto su 8 blocchi e 1 su 23 domande — e fra due di loro il pareggio
  // resterebbe intatto. `created_at` distingue solo ciò che è stato creato in momenti diversi, che
  // è comunque l'ordine giusto per una domanda aggiunta dopo. `id` chiude: è la sola colonna unica
  // per costruzione, quindi l'ordine è definito sempre. Arbitrario a parità di tutto il resto, ma
  // stabile, che è quello che serve — due domande che si scambiano di posto fra un caricamento e
  // l'altro sono un difetto che non produce nessun errore.
  const { data, error } = await supabase
    .from('questionnaires')
    // Un letterale unico e non due stringhe unite con `+`: la concatenazione di due letterali in
    // TypeScript dà `string`, e il tipo delle righe si perde insieme al letterale. `select` toglie
    // da sé ogni spazio fuori dalle virgolette, quindi andare a capo non cambia la richiesta.
    .select(`
      id, name, version,
      question_blocks(
        id, title, position, created_at,
        questions(id, text, help_text, answer_type, options, position, is_active, created_at, answers(count))
      )
    `)
    .eq('is_active', true)
    .order('created_at')
    .order('id')
    .order('position', { referencedTable: 'question_blocks' })
    .order('created_at', { referencedTable: 'question_blocks' })
    .order('id', { referencedTable: 'question_blocks' })
    .order('position', { referencedTable: 'question_blocks.questions' })
    .order('created_at', { referencedTable: 'question_blocks.questions' })
    .order('id', { referencedTable: 'question_blocks.questions' })
    .limit(1)

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori delle righe (kb-0.md §3).
    console.error('QuestionnairePage: questionario non letto', {
      code: error.code,
      message: error.message,
    })
  }

  // `noUncheckedIndexedAccess` è attivo, quindi `data[0]` è già `T | undefined`.
  const questionnaire = data?.[0] ?? null

  // Il cestino, in una lettura sua: `archived_rows` non ha nessuna chiave esterna verso le altre
  // tabelle — di proposito, perché la riga di origine non esiste più — quindi non è innestabile e
  // non c'è modo di prenderla con la query qui sopra. `payload` non si legge: l'elenco vive di
  // `label` e `source_table`, ed è la ragione per cui quelle due colonne esistono fuori dal jsonb.
  // Un errore qui non porta la pagina sullo stato d'errore: il questionario è leggibile lo stesso,
  // e sostituirlo con un guasto perché il cestino non risponde sarebbe sproporzionato.
  // `in` sulle due sorgenti del questionario e non tutta la tabella: dalla 0021 il cestino
  // raccoglie anche le persone, che tornano dalla scheda del loro cliente e qui sarebbero righe
  // senza contesto, con un `Ripristina` che rivalida la pagina sbagliata.
  const { data: archived, error: archivedError } = await supabase
    .from('archived_rows')
    .select('id, source_table, label, archived_at')
    .in('source_table', ['questions', 'question_blocks'])
    .order('archived_at', { ascending: false })

  if (archivedError) {
    console.error('QuestionnairePage: cestino non letto', {
      code: archivedError.code,
      message: archivedError.message,
    })
  }

  // I due rami stanno su due variabili diverse e non si collassano in un `!data`: un `!data` da
  // solo direbbe «il questionario non è caricato» anche quando il database non ha risposto, cioè
  // una bugia rassicurante nel momento in cui serve la verità.
  return (
    <>
      {/* Nessun conteggio accanto al titolo, e non è una dimenticanza: `/clienti` ce l'ha e
          copiarlo qui sembrerebbe coerente. Non lo è, perché il numero che conta per una call è
          quello delle domande *attive*, cioè il denominatore che la Story 3.1 congela in
          `assessments.total_questions`. Un `23` che resta `23` dopo che una domanda è stata
          disattivata sarebbe un numero falso su una schermata che esiste per dire com'è il
          questionario adesso. Si aggiunge quando esiste il concetto che lo rende vero. */}
      <header className="page-header">
        <h1 className="page-title">Questionario</h1>
        {/* L'interruttore c'è anche quando il questionario non si è caricato: sparire in errore
            farebbe cambiare posto al titolo, e la modalità è una vista, non un'azione sui dati. */}
        <ModeSwitch current={mode} />
      </header>

      {error ? (
        <div className="card">
          <ErrorState
            message="Il questionario non si è caricato. La connessione al database non ha risposto."
            retryHref="/questionario"
          />
        </div>
      ) : questionnaire === null ? (
        <div className="card">
          <div className="empty">
            {/* Nessun pulsante: senza un questionario non esiste nessun questionnaire_id a cui
                agganciare un blocco. Nominare un file SQL dentro l'interfaccia sarebbe di solito
                un difetto; qui l'unico utente è chi quel file lo esegue, quindi è l'informazione
                giusta. */}
            <p style={{ margin: 0 }}>
              Il questionario non è ancora stato caricato. Si carica eseguendo supabase/seed.sql
              sul progetto Supabase.
            </p>
          </div>
        </div>
      ) : questionnaire.question_blocks.length === 0 ? (
        <div className="card">
          <div className="empty">
            {/* Un questionario che esiste e non ha blocchi non è lo stesso stato di un
                questionario che non c'è, e le due frasi non sono la stessa frase. Qui il
                pulsante c'è (UX-DR11), nell'altro vuoto no: senza un questionario non esiste
                nessun questionnaire_id a cui agganciare un blocco. */}
            <p style={{ margin: 0 }}>Il questionario non ha ancora nessun blocco.</p>
            <NewBlockForm questionnaireId={questionnaire.id} />
          </div>
        </div>
      ) : (
        <>
          {questionnaire.question_blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              mode={mode}
              isFirst={index === 0}
              isLast={index === questionnaire.question_blocks.length - 1}
            />
          ))}

          {/* Un solo `Aggiungi blocco`, in fondo, dove il blocco nuovo nascerà: anche
              nell'intestazione vorrebbe dire due pulsanti identici nello stato vuoto, e con i
              blocchi presenti un'azione lontana dal punto in cui il suo risultato compare. */}
          <div className="card">
            <NewBlockForm questionnaireId={questionnaire.id} />
          </div>
        </>
      )}

      {/* Fuori dai rami: il cestino si mostra anche quando il questionario non si è caricato, che
          è proprio il momento in cui uno potrebbe cercarlo. Assente quando è vuoto — il perché
          sta in trash-card.tsx. */}
      {archived && archived.length > 0 ? <TrashCard rows={archived} /> : null}
    </>
  )
}
