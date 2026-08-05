import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CLIENT_TAG_MAX_LENGTH } from './client-tags.ts'
import { CLIENT_NAME_MAX_LENGTH } from './validate-client-name.ts'
import {
  filtersHref,
  hasActiveFilters,
  likePattern,
  parseClientFilters,
  type ClientFilters,
} from './client-filters.ts'

const NESSUN_FILTRO: ClientFilters = { name: '', status: null, tag: '' }

test('AC1 AC2 AC3 — un indirizzo senza parametri non filtra niente', () => {
  assert.deepEqual(parseClientFilters({}), NESSUN_FILTRO)
})

test('le stringhe vuote che manda il form a campi vuoti non filtrano niente', () => {
  // `/clienti?nome=&stato=&tag=` è esattamente quello che produce un form GET nativo quando
  // non si compila nessun campo: deve valere come l'assenza dei parametri.
  assert.deepEqual(parseClientFilters({ nome: '', stato: '', tag: '' }), NESSUN_FILTRO)
})

test('un parametro ripetuto vale il primo valore, mai l’array', () => {
  // `?stato=attivo&stato=perso` arriva come string[]. Passarlo così com'è a `.eq` farebbe
  // rifiutare la query da PostgREST, cioè un indirizzo storpiato diventerebbe la schermata
  // d'errore.
  const filters = parseClientFilters({ stato: ['attivo', 'perso'], nome: ['rossi', 'bianchi'] })

  assert.equal(filters.status, 'attivo')
  assert.equal(filters.name, 'rossi')
})

test('un array vuoto non filtra e non solleva niente', () => {
  assert.deepEqual(parseClientFilters({ nome: [], stato: [], tag: [] }), NESSUN_FILTRO)
})

test('AC2 — uno stato che non esiste vale nessun filtro, non un errore', () => {
  // Rilassare un filtro non allarga niente: quali righe si possono vedere lo decide la policy,
  // non l'indirizzo. Stessa scelta di StatusPill, che su uno stato ignoto rende neutro.
  assert.equal(parseClientFilters({ stato: 'pippo' }).status, null)
})

test('AC2 — uno stato valido si conserva', () => {
  assert.equal(parseClientFilters({ stato: 'valutato' }).status, 'valutato')
})

test('AC3 — un tag in maiuscolo e con spazi ai bordi si normalizza', () => {
  // I tag sono salvati già normalizzati (Story 1.4): senza normalizzare il valore cercato,
  // `Referral` non troverebbe mai `referral`.
  assert.equal(parseClientFilters({ tag: '  Referral  ' }).tag, 'referral')
})

test('AC3 — un tag oltre il limite non filtra', () => {
  const troppoLungo = 'a'.repeat(CLIENT_TAG_MAX_LENGTH + 1)

  assert.equal(parseClientFilters({ tag: troppoLungo }).tag, '')
})

test('AC3 — un tag esattamente al limite filtra', () => {
  const alLimite = 'a'.repeat(CLIENT_TAG_MAX_LENGTH)

  assert.equal(parseClientFilters({ tag: alLimite }).tag, alLimite)
})

test('AC1 — il nome perde i caratteri invisibili e gli spazi ai bordi', () => {
  // Scritti come escape e non come caratteri: un test sugli invisibili che li mostra invisibili
  // non si rilegge, e un giro di copia-incolla li perde senza che niente lo segnali.
  const sporco = ' \u200Bmario \u200Drossi\uFEFF '

  assert.equal(parseClientFilters({ nome: sporco }).name, 'mario rossi')
})

test('AC1 — gli spazi interni NON si comprimono: la ricerca ha la forma della colonna', () => {
  // `validateClientName` fa solo `replace(INVISIBLE, '').trim()`, quindi un nome incollato da un
  // documento sta in tabella con i suoi spazi doppi. Comprimerli qui renderebbe quel cliente
  // irraggiungibile: il termine diventerebbe `Mario Rossi` e `ilike` non troverebbe niente,
  // nemmeno copiando il nome dall'elenco. Non trovare quello che c'è è il modo peggiore in cui
  // un elenco può sbagliare.
  const inColonna = 'Mario  Rossi'
  const cercato = parseClientFilters({ nome: inColonna }).name

  assert.equal(cercato, inColonna)
  assert.ok(inColonna.toLowerCase().includes(cercato.toLowerCase()))
})

test('AC1 — un nome oltre il limite si taglia a quella lunghezza', () => {
  // La colonna non contiene nomi più lunghi, quindi il risultato non cambia e la richiesta
  // resta di dimensione dichiarata.
  const troppoLungo = 'a'.repeat(CLIENT_NAME_MAX_LENGTH + 50)

  assert.equal(parseClientFilters({ nome: troppoLungo }).name.length, CLIENT_NAME_MAX_LENGTH)
})

test('AC3 — un tag che romperebbe il filtro per tag non filtra', () => {
  // `.contains('tags', [tag])` diventa `cs.{tag}`, che legge Postgres con le sue regole di
  // letterale di array — misurate, vedi TAG_BREAKS_ARRAY_LITERAL. La virgola cambia il filtro in
  // «ha entrambi i tag», graffe e virgolette danno un 400, la barra rovesciata sfugge il carattere
  // che segue e fa cercare un valore diverso senza dirlo. Vale nessun filtro, non errore.
  for (const storto of ['a,b', 'a}b', 'a{b', 'dell"anno', 'a\\b']) {
    assert.equal(parseClientFilters({ tag: storto }).tag, '', storto)
  }
})

test('AC3 — un tag normale non viene toccato dalla guardia', () => {
  // La guardia non deve mangiarsi i tag veri: apostrofi, accenti e trattini restano.
  for (const buono of ['referral', "passaparola-d'agosto", 'città']) {
    assert.equal(parseClientFilters({ tag: buono }).tag, buono, buono)
  }
})

test('AC1 — un termine normale diventa un modello con i jolly ai due lati', () => {
  assert.equal(likePattern('rossi'), '%rossi%')
})

test('AC1 — il * non viene toccato, ed è una scelta e non una dimenticanza', () => {
  // PostgREST dichiara `*` alias di `%` e converte prima di SQL, quindi sfuggirlo produrrebbe un
  // `%` letterale invece di un `*`. Non è stato visto girare: da qui PostgREST non si esercita.
  // Si lascia passare di proposito — un falso positivo si vede, un carattere cancellato in
  // silenzio no — e questo test fissa quello che la funzione fa davvero, così il giorno che la
  // verifica di sessione dice come si comporta PostgREST è qui che si vede cosa cambia.
  assert.equal(likePattern('*'), '%*%')
  assert.equal(likePattern('a*b'), '%a*b%')
})

test('AC1 — un % battuto da chi cerca resta letterale', () => {
  // Senza l'escape la ricerca risponde righe che non contengono quello che è stato scritto:
  // un difetto che non produce un errore, produce un elenco sbagliato.
  assert.equal(likePattern('100%'), '%100\\%%')
})

test('AC1 — un _ battuto da chi cerca resta letterale', () => {
  assert.equal(likePattern('a_b'), '%a\\_b%')
})

test('AC1 — una barra si raddoppia e non sfugge quello che segue', () => {
  // `\%` significherebbe «un % letterale»: la barra battuta va sfuggita per prima, altrimenti
  // si sfugge la barra che si è appena aggiunta.
  assert.equal(likePattern('a\\%b'), '%a\\\\\\%b%')
})

test('hasActiveFilters è falso quando non c’è nessun filtro', () => {
  assert.equal(hasActiveFilters(NESSUN_FILTRO), false)
})

test('hasActiveFilters è vero con ciascuno dei tre da solo', () => {
  assert.equal(hasActiveFilters({ ...NESSUN_FILTRO, name: 'rossi' }), true)
  assert.equal(hasActiveFilters({ ...NESSUN_FILTRO, status: 'attivo' }), true)
  assert.equal(hasActiveFilters({ ...NESSUN_FILTRO, tag: 'referral' }), true)
})

test('filtersHref senza filtri è l’elenco intero', () => {
  assert.equal(filtersHref(NESSUN_FILTRO), '/clienti')
})

test('AC4 — filtersHref accoda solo i parametri valorizzati, in ordine fisso', () => {
  // Serve al Riprova dello stato d'errore: deve rifare la stessa vista, non riportare
  // all'elenco intero, che sarebbe indistinguibile da Azzera i filtri.
  assert.equal(
    filtersHref({ name: 'rossi', status: 'attivo', tag: 'referral' }),
    '/clienti?nome=rossi&stato=attivo&tag=referral',
  )
  assert.equal(filtersHref({ name: '', status: 'attivo', tag: '' }), '/clienti?stato=attivo')
  assert.equal(filtersHref({ name: 'rossi', status: null, tag: 'referral' }), '/clienti?nome=rossi&tag=referral')
})

test('filtersHref codifica quello che va codificato', () => {
  // Un `&` o un `%` battuti nel campo nome non devono diventare un secondo parametro né una
  // sequenza di percent-encoding storpiata.
  assert.equal(filtersHref({ name: 'a&b', status: null, tag: '' }), '/clienti?nome=a%26b')
  assert.equal(filtersHref({ name: '100%', status: null, tag: '' }), '/clienti?nome=100%25')
})

test('filtersHref e parseClientFilters si leggono a vicenda', () => {
  // Il giro completo: quello che l'indirizzo scrive, la pagina lo rilegge identico. Senza,
  // Riprova rifarebbe una vista diversa da quella fallita.
  const filters: ClientFilters = { name: 'mario rossi', status: 'attivo', tag: 'referral' }
  const query = new URL(filtersHref(filters), 'https://esempio.invalid').searchParams

  assert.deepEqual(parseClientFilters(Object.fromEntries(query)), filters)
})
