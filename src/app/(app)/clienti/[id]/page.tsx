import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { StatusPill } from '@/components/status-pill'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'

const COLUMNS =
  'id, name, status, sector, website, city, province, address, source_channel, revenue, employees, business_goals, notes'

/**
 * `id` è una colonna uuid: una stringa di altra forma fa rifiutare la query da Postgres, e
 * senza questo controllo un indirizzo storpiato finirebbe nello stato d'errore, con un pulsante
 * Riprova che ricarica lo stesso indirizzo impossibile. Non è un guasto: è una scheda che non c'è.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ClientDetail = Pick<
  ClientRow,
  | 'id'
  | 'name'
  | 'status'
  | 'sector'
  | 'website'
  | 'city'
  | 'province'
  | 'address'
  | 'source_channel'
  | 'revenue'
  | 'employees'
  | 'business_goals'
  | 'notes'
>

type Field = { label: string; value: string | null }

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!UUID.test(id)) notFound()

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

  return (
    <>
      <ClientHeader />
      <div className="card">
        <ClientIdentity client={data} />
        <ClientFields client={data} />
      </div>
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

function ClientIdentity({ client }: { client: ClientDetail }) {
  return (
    <div className="detail-identity">
      <h1 className="display-title">{client.name}</h1>
      <StatusPill status={client.status} />
    </div>
  )
}

function ClientFields({ client }: { client: ClientDetail }) {
  // employees a null resta vuoto, ma uno zero dichiarato resta zero: sono due cose diverse.
  const fields: Field[] = [
    { label: 'Settore', value: client.sector },
    { label: 'Sito web', value: client.website },
    { label: 'Città', value: client.city },
    { label: 'Provincia', value: client.province },
    { label: 'Indirizzo', value: client.address },
    { label: 'Come è arrivato', value: client.source_channel },
    { label: 'Fatturato', value: client.revenue },
    { label: 'Dipendenti', value: client.employees === null ? null : String(client.employees) },
    { label: 'Obiettivi', value: client.business_goals },
    { label: 'Note', value: client.notes },
  ]

  // dl, dt e dd invece di div e span: un campo vuoto resta legato alla sua etichetta anche per
  // chi legge con uno screen reader, che altrimenti sentirebbe dieci etichette senza valore.
  return (
    <dl className="detail-grid">
      {fields.map((field) => (
        <div className="field" key={field.label}>
          <dt className="label">{field.label}</dt>
          <dd className="detail__value">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}
