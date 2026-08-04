import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { CLIENT_FIELDS, NAME_FIELD, STATUS_FIELD, type ClientFieldKey } from '@/lib/client-fields'
import { collectTagSuggestions } from '@/lib/client-tags'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'
import { isUuid } from '@/lib/uuid'

import { ClientFieldForm } from './client-field-form'
import { ClientTagsForm } from './client-tags-form'
import { PeopleCard } from './people-card'

const COLUMNS =
  'id, name, status, tags, sector, website, city, province, address, source_channel, revenue, employees, business_goals, notes'

/** Le colonne di PersonDetail: se una manca qui, il tipo non è più soddisfatto e i tipi si fermano. */
const PEOPLE_COLUMNS = 'id, first_name, last_name, job_title, email, phone, notes, decision_roles, is_primary'

/**
 * L'elenco dei campi sta in un posto solo, CLIENT_FIELDS, e da lì si derivano sia questo tipo
 * sia la griglia. Se un campo entra nell'elenco senza entrare in COLUMNS, la riga tornata dalla
 * query non soddisfa più ClientDetail e il controllo dei tipi si ferma.
 *
 * `tags` è elencato a parte come `name` e `status`: non è un campo di testo che passa da
 * updateClientField, e dentro CLIENT_FIELDS l'allow-list smetterebbe di rifiutarlo.
 */
type ClientDetail = Pick<ClientRow, 'id' | 'name' | 'status' | 'tags' | ClientFieldKey>

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

  return (
    <>
      <ClientHeader />
      <div className="card">
        <ClientIdentity client={data} />
        {/* I tag stanno con l'identità del cliente, non fra i campi anagrafici della griglia:
            sono una marcatura trasversale, non un dato dell'azienda. */}
        <ClientTagsForm clientId={data.id} tags={data.tags} suggestions={suggestions} />
        <ClientFields client={data} />
      </div>
      {/* Card sorella dell'anagrafica, non una sezione dentro di essa: le persone sono voci
          sotto il cliente, e un elenco che cresce dentro la card dei campi la renderebbe due
          cose. `people` a null è «non si è caricato», che la card distingue da «non ce ne
          sono»: va in errore solo lei, e l'anagrafica sopra resta usabile. */}
      <PeopleCard clientId={data.id} people={people} />
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

/**
 * Il nome è un campo come gli altri, con la sua etichetta vera: resta grande e leggibile come
 * un titolo, ma è modificabile e lo dichiara. Accanto, lo stato è un campo anche lui: qui
 * comanda il selettore, e la pillola resta il modo di leggere lo stato dall'elenco. Due
 * rappresentazioni dello stesso valore a dieci pixel di distanza sono una di troppo.
 */
function ClientIdentity({ client }: { client: ClientDetail }) {
  return (
    <div className="detail-identity">
      <ClientFieldForm clientId={client.id} field={NAME_FIELD} value={client.name} />
      <ClientFieldForm clientId={client.id} field={STATUS_FIELD} value={client.status} />
    </div>
  )
}

function ClientFields({ client }: { client: ClientDetail }) {
  // Nessun pulsante nello stato vuoto: i campi sono già lì e sono già l'azione.
  const untouched = CLIENT_FIELDS.every((field) => client[field.key] === null)

  return (
    <>
      {untouched ? (
        <p className="meta" style={{ marginBottom: 20 }}>
          Di questo cliente sai solo il nome. I campi si compilano quando li scopri.
        </p>
      ) : null}

      <div className="detail-grid">
        {CLIENT_FIELDS.map((field) => (
          <ClientFieldForm key={field.key} clientId={client.id} field={field} value={readValue(client, field.key)} />
        ))}
      </div>
    </>
  )
}

/** employees a null resta vuoto, ma uno zero dichiarato resta zero: sono due cose diverse (D13). */
function readValue(client: ClientDetail, key: ClientFieldKey): string | null {
  const value = client[key]

  return value === null ? null : String(value)
}
