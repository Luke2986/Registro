import { CLIENT_FIELDS, NAME_FIELD, STATUS_FIELD, type ClientFieldKey } from '@/lib/client-fields'
import type { ClientRow } from '@/lib/types'

import { ClientFieldForm } from './client-field-form'
import { ClientTagsForm } from './client-tags-form'

/**
 * L'elenco dei campi sta in un posto solo, CLIENT_FIELDS, e da lì si derivano sia questo tipo sia
 * la griglia. Se un campo entra nell'elenco senza entrare nelle colonne che la pagina legge, la
 * riga tornata dalla query non soddisfa più ClientDetail e il controllo dei tipi si ferma — il
 * controllo scatta dove la pagina passa la riga a questo componente.
 *
 * `tags` è elencato a parte come `name` e `status`: non è un campo di testo che passa da
 * updateClientField, e dentro CLIENT_FIELDS l'allow-list smetterebbe di rifiutarlo.
 */
type ClientDetail = Pick<ClientRow, 'id' | 'name' | 'status' | 'tags' | ClientFieldKey>

/**
 * L'anagrafica: identità, tag, campi. Sta in un file suo dalla Story 3.1, quando la card delle
 * schede ha portato `page.tsx` oltre le 200 righe di `kb-0.md` §2. Non è un refactor di
 * occasione: quel file era già cinque letture e quattro componenti di presentazione, e la
 * presentazione è la metà che si stacca senza toccare nessuna query.
 *
 * Il nome è un campo come gli altri, con la sua etichetta vera: resta grande e leggibile come un
 * titolo, ma è modificabile e lo dichiara. Accanto, lo stato è un campo anche lui: qui comanda il
 * selettore, e la pillola resta il modo di leggere lo stato dall'elenco. Due rappresentazioni
 * dello stesso valore a dieci pixel di distanza sono una di troppo.
 */
export function ClientCard({ client, suggestions }: { client: ClientDetail; suggestions: string[] }) {
  // Nessun pulsante nello stato vuoto: i campi sono già lì e sono già l'azione.
  const untouched = CLIENT_FIELDS.every((field) => client[field.key] === null)

  return (
    <div className="card">
      <div className="detail-identity">
        <ClientFieldForm clientId={client.id} field={NAME_FIELD} value={client.name} />
        <ClientFieldForm clientId={client.id} field={STATUS_FIELD} value={client.status} />
      </div>

      {/* I tag stanno con l'identità del cliente, non fra i campi anagrafici della griglia: sono
          una marcatura trasversale, non un dato dell'azienda. */}
      <ClientTagsForm clientId={client.id} tags={client.tags} suggestions={suggestions} />

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
    </div>
  )
}

/** employees a null resta vuoto, ma uno zero dichiarato resta zero: sono due cose diverse (D13). */
function readValue(client: ClientDetail, key: ClientFieldKey): string | null {
  const value = client[key]

  return value === null ? null : String(value)
}
