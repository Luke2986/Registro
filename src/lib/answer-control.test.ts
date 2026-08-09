import { test } from 'node:test'
import assert from 'node:assert/strict'

import { answerControl, orphanOption } from './answer-control.ts'

test('i quattro tipi del questionario danno i quattro controlli', () => {
  assert.deepEqual(answerControl('testo_lungo', null), { kind: 'lungo' })
  assert.deepEqual(answerControl('testo_breve', null), { kind: 'breve' })
  assert.deepEqual(answerControl('numero', null), { kind: 'numero' })
  assert.deepEqual(answerControl('scelta_singola', ['sì', 'no']), {
    kind: 'scelta',
    options: ['sì', 'no'],
  })
})

// Il ripiego che il caso irraggiungibile chiede lo stesso: `questions_single_choice_has_options`
// lo vieta dove si scrive, e `answers` è una copia senza vincoli.
test('una scelta singola senza opzioni cade sul testo breve, non sul lungo', () => {
  assert.deepEqual(answerControl('scelta_singola', null), { kind: 'breve' })
  assert.deepEqual(answerControl('scelta_singola', []), { kind: 'breve' })
})

// Il caso che esiste perché `answers.answer_type` non ha nessun `check`: la copia registra la
// storia invece di rifiutarla, e un vocabolario che il presente non conosce più deve comunque
// mostrare quello che ha raccolto.
test('un tipo fuori dai quattro cade sul testo lungo, che mostra tutto', () => {
  assert.deepEqual(answerControl('data', null), { kind: 'lungo' })
  assert.deepEqual(answerControl('', null), { kind: 'lungo' })
})

test('le opzioni arrivano nell’ordine ricevuto e non si riordinano', () => {
  const control = answerControl('scelta_singola', ['terzo', 'primo', 'secondo'])

  assert.deepEqual(control.kind === 'scelta' ? control.options : null, [
    'terzo',
    'primo',
    'secondo',
  ])
})

test('un contenuto fra le opzioni non produce nessuna opzione in coda', () => {
  assert.equal(orphanOption('sì', ['sì', 'no']), null)
})

test('un contenuto vuoto o assente non produce nessuna opzione in coda', () => {
  assert.equal(orphanOption(null, ['sì', 'no']), null)
  assert.equal(orphanOption('', ['sì', 'no']), null)
})

// Senza questa riga React selezionerebbe la prima opzione e la risposta si riscriverebbe da sola.
test('un contenuto fuori dalle opzioni si rende come opzione in coda', () => {
  assert.equal(orphanOption('forse', ['sì', 'no']), 'forse')
})
