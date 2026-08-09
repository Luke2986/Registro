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

// Due `<option value="">` nello stesso selettore: React associa il valore alla prima, cioè
// `Nessuna risposta`, e l'opzione bianca diventa irraggiungibile. Raggiungibile da quando
// `answers.options` è una copia senza vincoli.
test('le opzioni bianche si scartano e non arrivano al selettore', () => {
  assert.deepEqual(answerControl('scelta_singola', ['sì', '', 'no']), {
    kind: 'scelta',
    options: ['sì', 'no'],
  })
  assert.deepEqual(answerControl('scelta_singola', ['sì', '   ', 'no']), {
    kind: 'scelta',
    options: ['sì', 'no'],
  })
})

test('una scelta singola con le sole opzioni bianche cade sul testo breve', () => {
  assert.deepEqual(answerControl('scelta_singola', ['', '  ']), { kind: 'breve' })
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

// Senza il `trim` uscirebbe `<option value="   ">   </option>`, una riga vuota nel menu che da
// selezionata si legge identica a `Nessuna risposta`. Raggiungibile da quando `content` si scrive.
test('un contenuto di soli spazi non produce nessuna opzione in coda', () => {
  assert.equal(orphanOption('   ', ['sì', 'no']), null)
  assert.equal(orphanOption('\n\t ', ['sì', 'no']), null)
})

// L'opzione in coda porta il contenuto memorizzato e non una sua versione ripulita: renderne
// un'altra lo cambierebbe nel momento in cui la si sceglie.
test('l’opzione in coda porta il contenuto com’è, spazi compresi', () => {
  assert.equal(orphanOption(' forse ', ['sì', 'no']), ' forse ')
})

// Senza questa riga React selezionerebbe la prima opzione e la risposta si riscriverebbe da sola.
test('un contenuto fuori dalle opzioni si rende come opzione in coda', () => {
  assert.equal(orphanOption('forse', ['sì', 'no']), 'forse')
})
