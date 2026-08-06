import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ANSWER_TYPES, answerTypeLabel, isAnswerType } from './answer-types.ts'

test('AC2 — i quattro valori danno le quattro etichette', () => {
  assert.equal(answerTypeLabel('testo_lungo'), 'testo lungo')
  assert.equal(answerTypeLabel('testo_breve'), 'testo breve')
  assert.equal(answerTypeLabel('numero'), 'numero')
  assert.equal(answerTypeLabel('scelta_singola'), 'scelta singola')
})

test('nessuna etichetta porta la sottolineatura del database', () => {
  for (const value of ANSWER_TYPES) {
    assert.ok(
      !answerTypeLabel(value).includes('_'),
      `l'etichetta di ${value} è ancora il valore grezzo`,
    )
  }
})

test('isAnswerType è vero sui quattro del vincolo', () => {
  for (const value of ANSWER_TYPES) {
    assert.equal(isAnswerType(value), true, `${value} dovrebbe essere un tipo di risposta`)
  }
})

test('isAnswerType è falso su tutto il resto', () => {
  assert.equal(isAnswerType('testo'), false)
  assert.equal(isAnswerType('scelta_multipla'), false)
  assert.equal(isAnswerType('TESTO_LUNGO'), false)
  assert.equal(isAnswerType(''), false)
  assert.equal(isAnswerType(null), false)
  assert.equal(isAnswerType(undefined), false)
  assert.equal(isAnswerType(3), false)
  assert.equal(isAnswerType(['testo_lungo']), false)
})

// Il ramo che esiste perché il tipo generato da Supabase è `string`: la colonna è `not null` con
// `check`, quindi oggi il caso non si presenta, ma i tipi generati non si modificano a mano.
test('un tipo fuori dai quattro si mostra grezzo, non diventa un altro tipo', () => {
  assert.equal(answerTypeLabel('scelta_multipla'), 'scelta_multipla')
  assert.equal(answerTypeLabel(''), '')
})
