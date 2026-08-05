import Link from 'next/link'

import { FILTER_PARAMS, filtersHref, type ClientFilters } from '@/lib/client-filters'
import { CLIENT_STATUSES } from '@/lib/client-status'

/**
 * La barra che restringe l'elenco.
 *
 * **Componente server, nessun `'use client'`:** è un `<form method="get">`, e l'indirizzo lo
 * costruisce il browser dai `name=` dei campi. Nessuno stato, nessun effetto, nessun timer da
 * pulire. L'indirizzo *è* lo stato, quindi ricaricare, tornare indietro e mettere fra i
 * preferiti funzionano perché non sono stati costruiti: sono il comportamento predefinito.
 *
 * L'alternativa — un componente client che filtra mentre si scrive — aggiungerebbe un valore
 * locale da risincronizzare quando l'indirizzo cambia da fuori, che è il difetto già aperto due
 * volte in `deferred-work.md` su `use-editable-field.ts` e `person-roles-form.tsx`.
 *
 * `showReset` arriva dalla pagina e non si deduce qui: il componente non sa quante righe ha
 * trovato la query, e indovinarlo vorrebbe dire passargli anche quelle.
 */
export function FiltersForm({
  filters,
  tags,
  showReset,
}: {
  filters: ClientFilters
  tags: string[]
  showReset: boolean
}) {
  return (
    // `key` sull'indirizzo corrente, e non è un dettaglio: React non riapplica mai `defaultValue`
    // a un `<select>` non controllato già montato. Ogni ingresso in questa schermata con filtri
    // diversi passa da un `<Link>` — `Azzera i filtri`, `Riprova`, la voce di menu — cioè da una
    // navigazione client che riusa lo stesso nodo. Senza il `key`, azzerare sfiltra l'elenco ma
    // lascia i selettori sui valori tolti, e il `Filtra` successivo li rimanda: la barra
    // rimetterebbe da sola un filtro che si è appena tolto. Cambiando `key` i controlli si
    // rimontano, che è l'unico modo di risincronizzarli senza portare qui uno stato.
    //
    // Vale anche per il campo nome: quello che si digita senza inviare sparisce quando
    // l'indirizzo cambia da fuori, invece di restare sopra un elenco che non gli corrisponde.
    <form key={filtersHref(filters)} method="get" action="/clienti" className="filters" role="search">
      <div className="field">
        <label className="label" htmlFor="filtro-nome">
          Nome
        </label>
        {/* `type="search"` e non `text`: è quello che è, e su molti browser porta con sé il
            gesto nativo che svuota il campo.
            Nessun `maxLength`: il taglio lo fa `parseClientFilters` e non cambia il risultato,
            mentre l'attributo troncherebbe un incolla in silenzio — la voce già rimandata in
            `deferred-work.md`, che non si allarga a un terzo posto.
            `defaultValue` e non `value`: campo non controllato dentro un componente server, e
            il valore corrente arriva dai parametri già letti. */}
        <input
          id="filtro-nome"
          className="input"
          type="search"
          name={FILTER_PARAMS.name}
          defaultValue={filters.name}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="filtro-stato">
          Stato
        </label>
        {/* Le cinque opzioni si mappano da `CLIENT_STATUSES` e non si riscrivono a mano: il
            giorno che uno stato entra nel vincolo della tabella, entra anche qui. */}
        <select
          id="filtro-stato"
          className="input select"
          name={FILTER_PARAMS.status}
          defaultValue={filters.status ?? ''}
        >
          <option value="">Tutti</option>
          {CLIENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Senza nessun tag in uso il campo non si rende: un selettore con una sola voce che dice
          `Tutti` è un controllo che non fa niente. Quando un filtro per tag è attivo `tags` lo
          contiene sempre — ce lo mette la pagina — quindi questo ramo non può nascondere un
          filtro in corso: nasconderlo vorrebbe dire buttarlo via alla submit successiva, perché
          il browser riscrive l'intera query string dai campi che trova. */}
      {tags.length > 0 ? (
        <div className="field">
          <label className="label" htmlFor="filtro-tag">
            Tag
          </label>
          <select
            id="filtro-tag"
            className="input select"
            name={FILTER_PARAMS.tag}
            defaultValue={filters.tag}
          >
            <option value="">Tutti</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Secondario e non primario: l'unica azione primaria della schermata è `Nuovo cliente`
          (design-system.md §5, una sola azione primaria per schermata). */}
      <button type="submit" className="btn btn--secondary">
        Filtra
      </button>

      {showReset ? (
        <Link href="/clienti" className="btn btn--quiet">
          Azzera i filtri
        </Link>
      ) : null}
    </form>
  )
}
