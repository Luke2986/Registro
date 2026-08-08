import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  QUESTION_HELP_MAX_LENGTH,
  QUESTION_OPTION_MAX_LENGTH,
  QUESTION_OPTIONS_MAX_COUNT,
  QUESTION_TEXT_MAX_LENGTH,
  checkViolationMessage,
  parseOptions,
  validateHelpText,
  validateQuestionText,
} from './question-fields.ts'

// Lo zero-width space: l'invisibile che né il trim() di JavaScript né quello di Postgres
// tolgono, lo stesso usato dai test di client-tags. Se passasse, una domanda «vuota» avrebbe
// un testo di lunghezza uno e il vincolo questions_text_not_blank non la fermerebbe.
const ZERO_WIDTH = '​'

test('validateQuestionText accetta un testo normale e lo ritorna ripulito', () => {
  const result = validateQuestionText('  Qual è il problema?  ')

  assert.deepEqual(result, { ok: true, text: 'Qual è il problema?' })
})

test('validateQuestionText rifiuta i soli spazi', () => {
  const result = validateQuestionText('   ')

  assert.equal(result.ok, false)
})

test('validateQuestionText rifiuta i soli invisibili', () => {
  // Il caso che trim() da solo non copre.
  const result = validateQuestionText(ZERO_WIDTH.repeat(3))

  assert.equal(result.ok, false)
})

test('validateQuestionText toglie gli invisibili in mezzo senza far cadere il testo', () => {
  const result = validateQuestionText(`Qual${ZERO_WIDTH}e?`)

  assert.deepEqual(result, { ok: true, text: 'Quale?' })
})

test('validateQuestionText rifiuta quello che non è una stringa', () => {
  for (const raw of [undefined, null, 42]) {
    assert.equal(validateQuestionText(raw).ok, false, `${String(raw)} doveva essere rifiutato`)
  }
})

test('validateQuestionText accetta il limite esatto e rifiuta un carattere in più', () => {
  assert.equal(validateQuestionText('a'.repeat(QUESTION_TEXT_MAX_LENGTH)).ok, true)
  assert.equal(validateQuestionText('a'.repeat(QUESTION_TEXT_MAX_LENGTH + 1)).ok, false)
})

test('validateQuestionText collassa il whitespace interno, invii compresi', () => {
  // Salvato = mostrato: la card rende in un <p> che collasserebbe comunque (revisione 2.3).
  const result = validateQuestionText('Qual è\nil  problema?')

  assert.deepEqual(result, { ok: true, text: 'Qual è il problema?' })
})

test('validateHelpText ritorna null sul vuoto, sui soli spazi e su undefined', () => {
  // null e non stringa vuota: un valore non rilevato non si rappresenta come un valore
  // vuoto (D13), e la colonna è null-abile.
  for (const raw of ['', '   ', undefined]) {
    assert.deepEqual(validateHelpText(raw), { ok: true, helpText: null })
  }
})

test('validateHelpText ritorna un testo ripulito', () => {
  const result = validateHelpText(`  Serve a capire${ZERO_WIDTH} chi paga.  `)

  assert.deepEqual(result, { ok: true, helpText: 'Serve a capire chi paga.' })
})

test('validateHelpText accetta il limite esatto e rifiuta un carattere in più', () => {
  assert.equal(validateHelpText('a'.repeat(QUESTION_HELP_MAX_LENGTH)).ok, true)
  assert.equal(validateHelpText('a'.repeat(QUESTION_HELP_MAX_LENGTH + 1)).ok, false)
})

test('validateHelpText tratta quello che non è una stringa come assente', () => {
  // Il campo è facoltativo: un non-string vale come non compilato, non come errore.
  for (const raw of [null, 42]) {
    assert.deepEqual(validateHelpText(raw), { ok: true, helpText: null }, `${String(raw)} doveva valere null`)
  }
})

test('validateHelpText collassa il whitespace interno, invii compresi', () => {
  const result = validateHelpText('Serve a capire\nchi paga.')

  assert.deepEqual(result, { ok: true, helpText: 'Serve a capire chi paga.' })
})

test('parseOptions ritorna una riga valida come unica opzione', () => {
  assert.deepEqual(parseOptions('sì'), { ok: true, options: ['sì'] })
})

test('parseOptions conserva l’ordine scritto', () => {
  const result = parseOptions('primo\nsecondo\nterzo')

  assert.deepEqual(result, { ok: true, options: ['primo', 'secondo', 'terzo'] })
})

test('parseOptions scarta le righe vuote e quelle di soli spazi', () => {
  const result = parseOptions('primo\n\n   \nsecondo')

  assert.deepEqual(result, { ok: true, options: ['primo', 'secondo'] })
})

test('parseOptions tollera i fine riga \\r\\n', () => {
  const result = parseOptions('primo\r\nsecondo\r\n')

  assert.deepEqual(result, { ok: true, options: ['primo', 'secondo'] })
})

test('parseOptions rifiuta quando non resta nessuna opzione', () => {
  for (const raw of ['', '   ', '\n\n', ZERO_WIDTH, undefined, null, 42]) {
    assert.equal(parseOptions(raw).ok, false, `${JSON.stringify(raw)} doveva essere rifiutato`)
  }
})

test('parseOptions accetta un’opzione al limite esatto e rifiuta un carattere in più', () => {
  assert.equal(parseOptions('a'.repeat(QUESTION_OPTION_MAX_LENGTH)).ok, true)

  const rejected = parseOptions(`valida\n${'a'.repeat(QUESTION_OPTION_MAX_LENGTH + 1)}`)

  assert.equal(rejected.ok, false)
  // Il messaggio nomina la riga che sfora: con molte opzioni si cercherebbe a occhio.
  if (!rejected.ok) assert.match(rejected.message, /riga 2/)
})

test('parseOptions accetta il tetto esatto di opzioni e rifiuta una in più', () => {
  const atLimit = Array.from({ length: QUESTION_OPTIONS_MAX_COUNT }, (_, i) => `opzione ${i + 1}`).join('\n')

  assert.equal(parseOptions(atLimit).ok, true)
  assert.equal(parseOptions(`${atLimit}\nuna di troppo`).ok, false)
})

test('parseOptions non deduplica: due opzioni identiche restano due', () => {
  // La deduplicazione qui sarebbe una decisione, non una pulizia: il software registra e
  // mostra, non decide (D14).
  const result = parseOptions('uguale\nuguale')

  assert.deepEqual(result, { ok: true, options: ['uguale', 'uguale'] })
})

// Un fallback riconoscibile e diverso da ogni frase dei validatori: se un test lo vede
// tornare, è davvero il parametro passato e non una costante rimasta dentro la funzione.
const FALLBACK = 'frase di ripiego del chiamante'

test('checkViolationMessage riconosce questions_text_not_blank e risponde la frase del validatore', () => {
  const blank = validateQuestionText('')

  assert.equal(blank.ok, false)
  if (!blank.ok) {
    assert.equal(
      checkViolationMessage('new row violates check constraint "questions_text_not_blank"', FALLBACK),
      blank.message,
    )
  }
})

test('checkViolationMessage riconosce questions_single_choice_has_options e risponde la frase del validatore', () => {
  const empty = parseOptions('')

  assert.equal(empty.ok, false)
  if (!empty.ok) {
    assert.equal(
      checkViolationMessage('new row violates check constraint "questions_single_choice_has_options"', FALLBACK),
      empty.message,
    )
  }
})

test('checkViolationMessage risponde il fallback sul vincolo della 0010', () => {
  // Di proposito: il vincolo non è raggiungibile dall'interfaccia, perché il server azzera
  // le opzioni prima di scrivere. Se scatta, arriva da SQL o da una richiesta forgiata, e
  // una frase dedicata sarebbe un messaggio per nessuno.
  assert.equal(
    checkViolationMessage('new row violates check constraint "questions_options_only_single_choice"', FALLBACK),
    FALLBACK,
  )
})

test('checkViolationMessage su un messaggio qualunque ritorna proprio il fallback passato, non una costante interna', () => {
  const other = 'un’altra frase di ripiego'

  assert.equal(checkViolationMessage('deadlock detected', other), other)
})
