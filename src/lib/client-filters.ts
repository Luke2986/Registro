import { isClientStatus, type ClientStatus } from './client-status.ts'
import {
  CLIENT_TAG_MAX_LENGTH,
  TAG_BREAKS_ARRAY_LITERAL,
  normalizeTag,
} from './client-tags.ts'
import { CLIENT_NAME_MAX_LENGTH, INVISIBLE } from './validate-client-name.ts'

/**
 * I filtri dell'elenco: da parametri dell'indirizzo — che chiunque può scrivere a mano — a tre
 * valori che finiscono dentro una query.
 *
 * File puro, senza React e senza Supabase: è il patto già in piedi con client-status.ts,
 * client-tags.ts e last-activity.ts, ed è la condizione per cui il test accanto non ha bisogno
 * di impalcature (kb-0.md §7). Le regole di nome, stato e tag si importano da dove già stanno:
 * una seconda copia si allontanerebbe dalla prima alla prima riscrittura (kb-0.md §9).
 *
 * **I filtri non sono un controllo di accesso.** Non decidono quali righe si possono vedere —
 * quello lo fa la policy `clients_owner_all`, dentro la stessa richiesta — ma solo quali fra le
 * proprie righe si mostrano. È il motivo per cui un valore storpiato vale «nessun filtro»
 * invece di essere un errore: rilassare un filtro non allarga niente.
 */

/**
 * I nomi dei parametri in un posto solo, letti dalla pagina, dal modulo e dai `name=` del form.
 * In due posti, il giorno che uno cambia il form smette in silenzio di filtrare.
 *
 * In italiano come le rotte (`/clienti`, `/accedi`): l'indirizzo è interfaccia, e kb-0.md §2
 * mette l'inglese nel codice, non in quello che si legge nella barra del browser.
 */
export const FILTER_PARAMS = { name: 'nome', status: 'stato', tag: 'tag' } as const

/**
 * Stringa vuota e `null` sono l'unica rappresentazione dell'assenza: nessun campo opzionale,
 * così non esistono combinazioni impossibili da rendere.
 */
export type ClientFilters = {
  /** `''` = nessun filtro */
  name: string
  status: ClientStatus | null
  /** `''` = nessun filtro */
  tag: string
}

type SearchParams = Record<string, string | string[] | undefined>

/**
 * Un parametro ripetuto (`?stato=attivo&stato=perso`) arriva come `string[]`: si prende il
 * primo, mai l'array. Passarlo così com'è a `.eq` lo farebbe rifiutare da PostgREST, cioè un
 * indirizzo storpiato produrrebbe la schermata d'errore invece di un elenco.
 *
 * Con `noUncheckedIndexedAccess` attivo `raw[0]` è `| undefined`, e si gestisce con `??` e mai
 * con un `as`: un array vuoto è una forma che l'indirizzo può davvero avere.
 */
function firstValue(raw: string | string[] | undefined): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''

  return ''
}

/**
 * Si toglie quello che è invisibile e si taglia ai bordi, **ma gli spazi interni non si
 * comprimono**: la ricerca deve avere la stessa forma della colonna, e la colonna non li
 * comprime. `validateClientName` fa solo `replace(INVISIBLE, '').trim()`, quindi un nome
 * incollato da un documento può stare in tabella come `Mario␣␣Rossi`.
 *
 * Comprimerli — che è quello che faceva la prima stesura, copiando `normalizeClientName` — rende
 * quel cliente irraggiungibile: il termine diventa `Mario Rossi` e `ilike` non trova niente,
 * nemmeno copiando il nome dall'elenco. `normalizeClientName` comprime perché è la forma di
 * *confronto* fra due nomi, usata per i doppioni; qui serve la forma *memorizzata*, e sono due
 * cose diverse.
 *
 * Resta il caso opposto: due spazi battuti per sbaglio cercando un nome che ne ha uno solo non
 * lo trovano. Chiuderlo da entrambe le parti vorrebbe dire confrontare su una forma normalizzata
 * nel database, cioè un indice funzionale, cioè una migrazione che l'Epic 1 non porta.
 */
function parseName(raw: string): string {
  const name = raw.replace(INVISIBLE, '').trim()

  // La colonna non contiene nomi più lunghi, quindi tagliare non cambia il risultato e la
  // richiesta resta di dimensione dichiarata (kb-0.md §3).
  return name.length > CLIENT_NAME_MAX_LENGTH ? name.slice(0, CLIENT_NAME_MAX_LENGTH) : name
}

/**
 * I tag sono salvati già normalizzati (D17, Story 1.4): confrontare un valore non normalizzato
 * vorrebbe dire non trovare mai `Referral`. Oltre il limite nessun tag esiste, quindi il filtro
 * non ha niente da cercare e vale come assente.
 *
 * `TAG_BREAKS_ARRAY_LITERAL` è la seconda metà della guardia che sta in `parseTag`, e serve
 * perché quella copre solo la scrittura: qui il valore arriva dall'indirizzo, che chiunque
 * scrive a mano, e può portare anche un tag salvato prima che il divieto esistesse. Senza,
 * `?tag=a,b` diventa `cs.{a,b}`, cioè «ha entrambi i tag» — un filtro multiplo che il perimetro
 * della story esclude — e `?tag=a}b` diventa un letterale malformato, cioè la schermata
 * d'errore da un indirizzo battuto a mano.
 *
 * Vale «nessun filtro» e non un errore, come per lo stato ignoto: rilassare un filtro non
 * allarga niente. Un tag storto già in colonna resta quindi visibile nella riga e rimovibile
 * dalla scheda, ma sceglierlo dal menu non restringe l'elenco.
 */
function parseTagFilter(raw: string): string {
  const tag = normalizeTag(raw)

  if (tag.length > CLIENT_TAG_MAX_LENGTH) return ''

  return TAG_BREAKS_ARRAY_LITERAL.test(tag) ? '' : tag
}

export function parseClientFilters(params: SearchParams): ClientFilters {
  const status = firstValue(params[FILTER_PARAMS.status])

  return {
    name: parseName(firstValue(params[FILTER_PARAMS.name])),
    // Uno stato che non esiste non è un errore e non ferma niente: vale nessun filtro, e il
    // selettore torna su `Tutti`. È la stessa scelta di StatusPill, che su uno stato ignoto
    // rende neutro invece di far cadere la pagina.
    status: isClientStatus(status) ? status : null,
    tag: parseTagFilter(firstValue(params[FILTER_PARAMS.tag])),
  }
}

/**
 * Lo leggono tre punti della pagina — l'intestazione, lo stato vuoto, la barra — e ricavarlo
 * tre volte è il modo in cui due dei tre finiscono per non essere d'accordo.
 */
export function hasActiveFilters(filters: ClientFilters): boolean {
  return filters.name !== '' || filters.status !== null || filters.tag !== ''
}

/**
 * L'indirizzo canonico dei filtri correnti, `/clienti` quando non ce n'è nessuno.
 *
 * Serve al `Riprova` dello stato d'errore: deve rifare *la stessa vista*, non riportare
 * all'elenco intero — che sarebbe, per giunta, indistinguibile da `Azzera i filtri`.
 *
 * `URLSearchParams` codifica come un form GET nativo, spazio compreso (`+`): è la stessa
 * codifica che produce la barra, quindi l'indirizzo scritto qui e quello scritto dal browser
 * sono lo stesso. L'ordine è quello di inserimento, quindi fisso e verificabile da un test.
 */
export function filtersHref(filters: ClientFilters): string {
  const params = new URLSearchParams()

  if (filters.name) params.set(FILTER_PARAMS.name, filters.name)
  if (filters.status) params.set(FILTER_PARAMS.status, filters.status)
  if (filters.tag) params.set(FILTER_PARAMS.tag, filters.tag)

  const query = params.toString()

  return query ? `/clienti?${query}` : '/clienti'
}

/**
 * Il modello per `ilike`, con i jolly di chi cerca resi letterali. Senza l'escape, un `%`
 * battuto nel campo diventa un jolly e la ricerca risponde righe che non contengono quello che
 * è stato scritto: un difetto che non produce un errore, produce un elenco sbagliato.
 *
 * `\\` per primo nella classe di caratteri, altrimenti si sfugge la barra appena aggiunta.
 *
 * **Il `*` non si tocca.** PostgREST lo dichiara alias di `%` nei modelli di `like`/`ilike`, con
 * la conversione prima di SQL, quindi sfuggirlo produrrebbe `\%` — un `%` letterale, e non un
 * `*`. Verificato in sessione il 5 agosto 2026: `?nome=*` risponde tutti i clienti, quindi la
 * conversione avviene davvero.
 *
 * Si accetta di proposito: è un falso positivo, e si vede — il campo mostra `*` accanto a tutte
 * le righe. Toglierlo darebbe un falso negativo, cioè un cliente `5*5` che non si trova più e di
 * cui nessuno si accorge, che è il modo di fallire peggiore dei due in un elenco che serve a
 * ritrovare le cose.
 *
 * Il test accanto fissa quello che questa funzione fa davvero al `*`: niente.
 */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}
