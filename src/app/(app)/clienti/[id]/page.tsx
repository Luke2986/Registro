import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import { StatusPill } from '@/components/status-pill'
import { createClient } from '@/lib/supabase/server'
import type { ClientRow } from '@/lib/types'

const COLUMNS =
  'id, name, status, sector, website, city, province, address, source_channel, revenue, employees, business_goals, notes'

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  // maybeSingle e non single: con single una riga assente sarebbe un errore, e "non esiste"
  // e "non si è caricato" chiedono due risposte diverse.
  const { data, error } = await supabase.from('clients').select(COLUMNS).eq('id', id).maybeSingle()

  if (error) {
    return (
      <>
        <ClientHeader />
        <div className="card">
          <ErrorState
            message="La scheda non si è caricata. La connessione al database non ha risposto."
            retryHref={`/clienti/${id}`}
          />
        </div>
      </>
    )
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
      <Link href="/clienti" className="meta">
        ← Clienti
      </Link>
    </header>
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

  return (
    <div className="detail-grid">
      {fields.map((field) => (
        <div className="field" key={field.label}>
          <span className="label">{field.label}</span>
          <p className="detail__value">{field.value}</p>
        </div>
      ))}
    </div>
  )
}
