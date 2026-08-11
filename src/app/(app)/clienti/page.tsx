import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ErrorState } from '@/components/error-state'
import {
  filtersHref,
  hasActiveFilters,
  likePattern,
  parseClientFilters,
} from '@/lib/client-filters'
import { collectTagSuggestions } from '@/lib/client-tags'
import { byLastActivityDesc } from '@/lib/last-activity'
import { createClient } from '@/lib/supabase/server'

import { ClientsTable } from './clients-table'
import { FiltersForm } from './filters-form'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/accedi')

  // `await` obbligatorio: da Next 15 `params` e `searchParams` sono promesse e in 16 la forma
  // sincrona non esiste più. Stesso schema di [id]/page.tsx, che già attende `params`.
  const filters = parseClientFilters(await searchParams)

  // Innesto normale e mai `assessments!inner(...)`: con !inner diventa un join interno e fa
  // sparire dall'elenco ogni cliente senza schede. La sicurezza a livello di riga vale anche
  // sulle righe innestate: assessments_owner_all filtra le schede altrui dentro la stessa
  // richiesta, senza controlli da riscrivere qui.
  //
  // Mai `answers(...)`, in nessuna forma: `database.md` §3 dichiara che l'elenco non può copiare
  // il calcolo dell'avanzamento della scheda cliente. Le quattro colonne della 4.2 stanno invece
  // dentro il confine: un valore vincolato e tre chiavi d'ordine, non il contenuto delle risposte.
  let query = supabase
    .from('clients')
    .select('id, name, status, tags, updated_at, assessments(updated_at, call_date, created_at, id, verdict)')

  // I tre filtri stanno nella query e mai sull'array già letto, e non è un dettaglio di
  // prestazioni: PostgREST restituisce una finestra di righe, non tutte, quindi filtrare dopo
  // la lettura vuol dire filtrare su quella finestra, cioè non trovare un cliente che esiste.
  // Qui invece entrano in gioco i due indici gin di 0002_clients.sql:28-29.
  //
  // `.ilike` e non `.like`: due lettere in minuscolo devono trovare un nome scritto in
  // maiuscolo. L'indice trigram serve entrambi, e entra in gioco da tre caratteri in su.
  //
  // `.contains` e non `.eq`: la colonna è `text[]` e `cs.{…}` è l'operatore che usa l'indice
  // gin. Regge perché nessun tag contiene virgole — lo vieta `parseTag` — altrimenti `cs.{a,b}`
  // si leggerebbe come due elementi e il filtro cambierebbe significato in silenzio.
  if (filters.name) query = query.ilike('name', likePattern(filters.name))
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.tag) query = query.contains('tags', [filters.tag])

  // I tag da offrire si leggono a parte e senza filtri. Ricavarli da `data` è la trappola di
  // questo punto: scelto un tag, l'elenco si restringe, il menu si ricostruirebbe sui soli tag
  // rimasti e da lì non si potrebbe più scegliere un tag diverso. Il filtro si chiuderebbe
  // dietro di sé. In memoria e non in SQL per la stessa ragione di [id]/page.tsx: PostgREST non
  // espone `unnest`. Con `.order`, perché senza, al tetto di righe la finestra non è scelta da
  // nessun criterio e il menu cambierebbe da un caricamento all'altro.
  const tagQuery = supabase.from('clients').select('tags')

  // Insieme e non in serie: le due letture non si scambiano niente, e la latenza si sommava sulla
  // schermata che si apre più spesso. I due rami d'errore restano diversi apposta (v. sotto).
  const [{ data, error }, { data: tagRows, error: tagsError }] = await Promise.all([
    query.order('updated_at', { ascending: false }),
    tagQuery.order('updated_at', { ascending: false }),
  ])

  if (tagsError) {
    // Solo codice e messaggio: `details` conterrebbe valori delle righe (kb-0.md §3). Un filtro
    // che non si può offrire è un aiuto che manca, non un guasto dell'elenco: si va avanti.
    console.error('ClientsPage: tag da filtrare non letti', {
      code: tagsError.code,
      message: tagsError.message,
    })
  }

  // Il tag filtrato entra fra le opzioni anche se nessuna riga letta lo porta — lettura fallita,
  // tag fuori dalla finestra, tag scritto a mano: senza, il selettore sparirebbe o direbbe
  // `Tutti` con l'elenco filtrato, e la submit successiva butterebbe via il filtro.
  const rowsForTags = tagRows ?? []
  const tags = collectTagSuggestions(
    filters.tag ? [...rowsForTags, { tags: [filters.tag] }] : rowsForTags,
  )

  // Lettura non filtrata: zero righe senza errore vuol dire archivio vuoto davvero, e lì lo stato
  // vuoto giusto è quello che invita a creare, non quello che parla di un filtro.
  const archiveEmpty = !tagsError && tagRows !== null && tagRows.length === 0

  // `.order` sul database resta perché sceglie *quali* righe tornano quando ce ne sono più del
  // tetto di PostgREST, e le più recenti sono quelle giuste. Non dà però un ordine stabile: un
  // ORDER BY su una colonna sola non definisce niente a parità di valore, e a renderlo stabile è
  // il criterio sul nome dentro il comparatore. L'ordinamento vero è qui, perché PostgREST non
  // ordina per un aggregato delle righe innestate. Copia prima di ordinare: `.sort()` muterebbe
  // sul posto l'array del client di rete.
  //
  // Filtrare cambia *quali* righe arrivano, non come si ordinano: questa riga è quella della
  // Story 1.6, invariata.
  const rows = data ? [...data].sort(byLastActivityDesc) : null

  const filtered = hasActiveFilters(filters)

  // Le righe da mettere in tabella, o `null` se non ce ne sono da mettere. Un valore e non un
  // booleano: così restringe il tipo di `rows` nel ramo che lo usa, e l'elenco pieno resta una
  // condizione sola letta da tre punti invece di tre condizioni che devono restare d'accordo.
  const found = rows !== null && rows.length > 0 ? rows : null

  // Il ramo e il pulsante si decidono dallo stesso valore, non due volte: `Azzera i filtri`
  // vive nello stato vuoto quando c'è, e nella barra in tutti gli altri casi. Ricavarli
  // separatamente è il modo in cui i due finiscono per non essere d'accordo, e due pulsanti
  // identici a sessanta pixel di distanza sono rumore.
  const emptyForFilters = !error && filtered && found === null && !archiveEmpty

  return (
    // La classe di sezione sul landmark, non su un contenitore anonimo: è `<main>` a dire quale
    // sezione si sta guardando, e da lì `globals.css` ricava la tinta dell'alone del fuoco.
    <main className="main section--clienti">
      <header className="page-header">
        <h1 className="page-title">Clienti</h1>
        {/* `Nuovo cliente` resta col filtro che non trova niente **e nell'errore**: legato alle
            sole righe sparirebbe in entrambi. Nell'errore non fa due primarie, perché il
            `Riprova` di ErrorState è secondario. Sull'archivio vuoto l'intestazione non c'è
            nemmeno con un filtro attivo: lì la primaria è `Crea il primo cliente`. Il conteggio
            resta legato alle righe: uno `0` accanto a uno stato vuoto è una ripetizione. */}
        {error || found !== null || (filtered && !archiveEmpty) ? (
          <div className="page-header__actions">
            {found ? (
              <p className="data" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                {found.length}
              </p>
            ) : null}
            <Link href="/clienti/nuovo" className="btn btn--primary">
              Nuovo cliente
            </Link>
          </div>
        ) : null}
      </header>

      <div className="card">
        {/* Fuori da ogni ramo condizionale, di proposito: è il controllo che toglie il filtro, e
            perderlo insieme ai risultati vorrebbe dire restare bloccati dentro una vista che
            non si può più cambiare. Gli stati di una schermata sono stati del contenuto, non
            della schermata. `Azzera i filtri` sta qui oppure nello stato vuoto, mai in
            entrambi: la stessa azione due volte a sessanta pixel di distanza è rumore. */}
        <FiltersForm filters={filters} tags={tags} showReset={filtered && !emptyForFilters} />

        {error ? (
          <ErrorState
            message="L'elenco non si è caricato. La connessione al database non ha risposto."
            retryHref={filtersHref(filters)}
          />
        ) : found ? (
          <ClientsTable rows={found} />
        ) : emptyForFilters ? (
          <div className="empty">
            <p style={{ margin: 0 }}>Nessun cliente corrisponde a questo filtro.</p>
            <Link href="/clienti" className="btn btn--quiet">
              Azzera i filtri
            </Link>
          </div>
        ) : (
          <div className="empty">
            <p style={{ margin: 0 }}>Nessun cliente ancora.</p>
            <Link href="/clienti/nuovo" className="btn btn--primary">
              Crea il primo cliente
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
