import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { countAnswered } from '@/lib/assessment-progress'
import { collectTagSuggestions } from '@/lib/client-tags'
import { todayIsoDate } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'

import { AssessmentsCard } from './assessments-card'
import { ClientCard } from './client-card'
import { PeopleCard } from './people-card'
import { PersonTrashCard } from './person-trash-card'

const COLUMNS =
  'id, name, status, tags, sector, website, city, province, address, source_channel, revenue, employees, business_goals, notes'

/** Le colonne di PersonDetail: se una manca qui, il tipo non è più soddisfatto e i tipi si fermano. */
const PEOPLE_COLUMNS = 'id, first_name, last_name, job_title, email, phone, notes, decision_roles, is_primary'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // `id` è una colonna uuid: una stringa di altra forma fa rifiutare la query da Postgres, e
  // senza questo controllo un indirizzo storpiato finirebbe nello stato d'errore, con un
  // pulsante Riprova che ricarica lo stesso indirizzo impossibile. Non è un guasto: è una
  // scheda che non c'è.
  if (!isUuid(id)) notFound()

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Sessione assente e servizio irraggiungibile arrivano qui allo stesso modo: solo il primo
  // caso vuol dire "sei fuori", e mandare a /accedi per un guasto transitorio è una bugia.
  if (authError && (authError.status === undefined || authError.status >= 500)) {
    console.error('ClientPage: auth non raggiungibile', { status: authError.status })
    return <ClientError id={id} />
  }

  if (!user) redirect('/accedi')

  // maybeSingle e non single: con single una riga assente sarebbe un errore, e "non esiste"
  // e "non si è caricato" chiedono due risposte diverse.
  const { data, error } = await supabase.from('clients').select(COLUMNS).eq('id', id).maybeSingle()

  if (error) {
    // Solo codice e messaggio: `details` conterrebbe valori della riga (kb-0.md §3).
    console.error('ClientPage: lettura fallita', { code: error.code, message: error.message })
    return <ClientError id={id} />
  }

  // Con la sicurezza a livello di riga attiva, il cliente di un altro proprietario arriva qui
  // identico a uno inesistente. È anche la risposta giusta: non si distinguono i due casi.
  if (!data) notFound()

  // Dopo che la riga è confermata, non prima: un indirizzo che non esiste non paga una query
  // in più.
  //
  // In memoria e non in SQL: PostgREST non espone `unnest`, quindi il `select distinct
  // unnest(tags)` si ottiene leggendo la sola colonna e appiattendo lato applicazione. È lo
  // stesso precedente di findExistingName: con qualche centinaio di clienti leggere una colonna
  // costa meno della migrazione che servirebbe. La riga la filtra la policy, non questa query.
  const { data: tagRows, error: tagsError } = await supabase.from('clients').select('tags')

  if (tagsError) {
    // Un suggerimento mancante non è un guasto della scheda: è un aiuto che non c'è, e far
    // cadere la pagina per quello sarebbe sproporzionato. Si va avanti con l'elenco vuoto.
    console.error('ClientPage: suggerimenti dei tag non letti', {
      code: tagsError.code,
      message: tagsError.message,
    })
  }

  const suggestions = collectTagSuggestions(tagRows ?? [])

  // `.eq('client_id', id)` non è sicurezza — quella la fa la policy — è correttezza: senza,
  // arriverebbero le persone di tutti i clienti. L'ordine è quello di inserimento, come i tag:
  // nessuna AC ne chiede un altro, e riordinare sotto gli occhi di chi guarda è peggio che non
  // ordinare. `id` come secondo criterio lo rende deterministico anche a parità di istante.
  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select(PEOPLE_COLUMNS)
    .eq('client_id', id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (peopleError) {
    console.error('ClientPage: persone non lette', { code: peopleError.code, message: peopleError.message })
  }

  // Il cestino di **questo** cliente: `parent_id` di una persona archiviata è il suo cliente. In
  // una query sua e non innestata in `clients`, perché `archived_rows` non ha una chiave esterna
  // verso le tabelle di origine — la riga di origine può non esistere più, che è il punto della
  // tabella (database.md §3). `payload` non si legge: contiene la riga intera, quindi email e
  // telefono, e da qui finirebbe nel payload spedito al browser (kb-0.md §4).
  const { data: archivedPeople, error: archivedError } = await supabase
    .from('archived_rows')
    .select('id, label, archived_at')
    .eq('source_table', 'people')
    .eq('parent_id', id)
    .order('archived_at', { ascending: false })

  if (archivedError) {
    console.error('ClientPage: cestino non letto', {
      code: archivedError.code,
      message: archivedError.message,
    })
  }

  // `.eq('client_id', id)` è correttezza e non sicurezza, come per le persone. I criteri dopo
  // `call_date` non sono decorativi: `call_date` è una *data*, quindi due schede dello stesso
  // giorno pareggerebbero, e `created_at` da solo non è unico per costruzione. `id` chiude:
  // arbitrario a parità di tutto il resto, ma stabile, che è quello che serve — due schede che si
  // scambiano di posto fra un caricamento e l'altro sono un difetto che non produce nessun errore.
  //
  // L'innesto porta il **numeratore** dell'avanzamento e niente di più: nessun secondo `select`,
  // nessun conteggio chiesto al database, perché PostgREST non calcola l'aggregato sulle righe
  // innestate in un modo che qui convenga, e ottenerlo costerebbe una vista o una colonna
  // materializzata per rendere un numero a schermo (D23, la stessa forma dell'ultima attività). Il
  // costo è leggere il contenuto di tutte le risposte di tutte le schede di **questo** cliente:
  // piccolo e limitato qui, e la ragione per cui l'elenco clienti non può copiare questa soluzione.
  // Innesto normale e mai `answers!inner(...)`, che farebbe sparire ogni scheda senza risposte.
  const { data: assessmentRows, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, call_date, interviewee_id, completion_status, verdict, total_questions, answers(content)')
    .eq('client_id', id)
    .order('call_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id')

  if (assessmentsError) {
    console.error('ClientPage: schede non lette', {
      code: assessmentsError.code,
      message: assessmentsError.message,
    })
  }

  // La riduzione avviene qui, che è un componente server, e non dentro la card, che è `'use
  // client'`: le sue prop finiscono nel payload spedito al browser, e il contenuto delle risposte è
  // la categoria di dato più sensibile del sistema (kb-0.md §4). Alla card arrivano due numeri.
  //
  // L'oggetto è esplicito e non un rest spread che «toglie» `answers`: così il giorno che una
  // colonna entra in AssessmentListItem e non in questa riduzione, il compilatore si ferma.
  const assessments =
    assessmentRows?.map((assessment) => ({
      id: assessment.id,
      call_date: assessment.call_date,
      interviewee_id: assessment.interviewee_id,
      completion_status: assessment.completion_status,
      verdict: assessment.verdict,
      total_questions: assessment.total_questions,
      // `?? []` difende una forma che il tipo vieta, ed è la stessa riga e lo stesso motivo di
      // `last-activity.ts`: PostgREST risponde `[]` sugli innesti vuoti, ma se rispondesse `null`
      // il ciclo dentro `countAnswered` cadrebbe **qui**, cioè in un componente server e dopo il
      // ramo d'errore qui sopra — non la card in errore, che la pagina sa rendere, ma la scheda
      // cliente intera che non si rende.
      answered: countAnswered(assessment.answers ?? []),
    })) ?? null

  return (
    <>
      <ClientHeader />
      <ClientCard client={data} suggestions={suggestions} />
      {/* Card sorella dell'anagrafica, non una sezione dentro di essa: le persone sono voci
          sotto il cliente, e un elenco che cresce dentro la card dei campi la renderebbe due
          cose. `people` a null è «non si è caricato», che la card distingue da «non ce ne
          sono»: va in errore solo lei, e l'anagrafica sopra resta usabile. */}
      <PeopleCard clientId={data.id} people={people} />
      {/* Subito sotto le persone e non in fondo alla pagina: è accanto a quello da cui la riga è
          uscita. Non compare quando è vuoto — lo stato vuoto del cestino è l'assenza — ma compare
          quando la lettura è fallita, perché lì «vuoto» non si sa. */}
      {archivedPeople === null || archivedPeople.length > 0 ? (
        <PersonTrashCard clientId={data.id} rows={archivedPeople} />
      ) : null}
      {/* Dopo le persone, perché l'ordine della pagina è quello del lavoro: le persone si
          registrano prima della call, le schede dopo. `people` serve qui due volte, al selettore
          dell'interlocutore e al nome nella riga, e arriva dalla lettura che è già stata fatta.
          `today` si calcola sul server, nel fuso dichiarato: calcolato nel browser darebbe due
          valori diversi a server e client, e su Vercel il fuso è UTC (D23). */}
      <AssessmentsCard
        clientId={data.id}
        assessments={assessments}
        people={people}
        today={todayIsoDate()}
      />
    </>
  )
}

function ClientHeader() {
  return (
    <header className="page-header">
      <Link href="/clienti" className="meta back-link">
        ← Clienti
      </Link>
    </header>
  )
}

function ClientError({ id }: { id: string }) {
  return (
    <>
      <ClientHeader />
      <div className="card">
        <ErrorState message="La scheda non si è caricata. Riprova fra un momento." retryHref={`/clienti/${id}`} />
      </div>
    </>
  )
}

