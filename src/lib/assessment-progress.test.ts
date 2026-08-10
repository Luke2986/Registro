import { test } from 'node:test'
import assert from 'node:assert/strict'

import { countAnswered, progressFillPercent } from './assessment-progress.ts'

test('countAnswered su un elenco vuoto risponde zero', () => {
  assert.equal(countAnswered([]), 0)
})

test('countAnswered non conta le risposte mai toccate', () => {
  // `open_assessment` scrive tutte le righe con `content` a `null`: è lo stato di ogni scheda
  // appena aperta, e il numeratore deve valere zero su ventiquattro.
  assert.equal(countAnswered([{ content: null }, { content: null }, { content: null }]), 0)
})

test('countAnswered non conta una risposta di soli spazi', () => {
  // Il caso che giustifica il file (AC3), ed è l'errore che una persona commette battendo la barra
  // spaziatrice invece di cancellare. `saveAnswer` normalizza in scrittura, quindi da lì `'   '`
  // non arriva; il conteggio non può però dipendere da quello, o le due definizioni di «vuoto»
  // resterebbero d'accordo per convenzione invece che per costruzione.
  assert.equal(countAnswered([{ content: '   ' }]), 0)
  assert.equal(countAnswered([{ content: '\n\t ' }]), 0)
  assert.equal(countAnswered([{ content: '' }]), 0)
})

test('countAnswered conta il testo vero, anche con spazi attorno', () => {
  assert.equal(countAnswered([{ content: 'due milioni' }]), 1)
  assert.equal(countAnswered([{ content: '  due milioni  ' }]), 1)
  assert.equal(countAnswered([{ content: '0' }]), 1)
})

test('countAnswered su un misto conta solo quelle piene', () => {
  assert.equal(
    countAnswered([
      { content: 'sì' },
      { content: null },
      { content: '   ' },
      { content: 'poi vediamo' },
      { content: '' },
    ]),
    2,
  )
})

test('progressFillPercent rende la larghezza dei tre casi di riferimento', () => {
  // `0 / 24` è la scheda che esiste oggi, `12 / 15` è quello di AC2, `15 / 15` è la scheda finita.
  assert.equal(progressFillPercent(0, 24), 0)
  assert.equal(progressFillPercent(12, 15), 80)
  assert.equal(progressFillPercent(15, 15), 100)
})

test('progressFillPercent su un totale di zero risponde 0 e mai NaN', () => {
  // `total_questions` è `not null default 0`: lo schema ammette lo zero, e `answered / 0` finirebbe
  // nel DOM come `width: NaN%`, cioè una barra che sparisce senza nessun errore.
  assert.equal(progressFillPercent(0, 0), 0)
  assert.equal(progressFillPercent(3, 0), 0)
  assert.equal(progressFillPercent(0, -1), 0)
})

test('progressFillPercent risponde 0 anche su un totale non numerico', () => {
  // Il caso che il test qui sopra si intitolava a coprire e non copriva: `NaN <= 0` è falso, quindi
  // la guardia ovvia lasciava passare l'unico ingresso capace di produrre `width: NaN%`. Non
  // raggiungibile dallo schema, dove `total_questions` è un intero `not null`: è la promessa
  // scritta in testa alla funzione a doverla reggere.
  assert.equal(progressFillPercent(0, Number.NaN), 0)
  assert.equal(progressFillPercent(12, Number.NaN), 0)
})

test('progressFillPercent non supera 100 nemmeno se il numeratore supera il totale', () => {
  // Per costruzione non succede — le righe di `answers` nascono tutte insieme e `total_questions`
  // è il loro numero — ma una barra che esce dal proprio contenitore è un difetto visibile.
  assert.equal(progressFillPercent(30, 24), 100)
})
