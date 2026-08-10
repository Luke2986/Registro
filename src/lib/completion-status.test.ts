import { test } from 'node:test'
import assert from 'node:assert/strict'

import { COMPLETION_STATUSES, isCompletionStatus, nextCompletionStatus } from './completion-status.ts'

test('i due valori stanno nell’ordine del vincolo', () => {
  // 0005_assessments_answers.sql:34. L'ordine è quello del `check` e non un ordine di merito:
  // una scheda in bozza non è una scheda a metà, è una scheda su cui si sta ancora lavorando.
  assert.deepEqual([...COMPLETION_STATUSES], ['bozza', 'chiusa'])
})

test('isCompletionStatus accetta i due valori e nient’altro', () => {
  for (const status of COMPLETION_STATUSES) assert.equal(isCompletionStatus(status), true)

  for (const value of ['', ' bozza', 'CHIUSA', null, undefined, 3, { status: 'bozza' }]) {
    assert.equal(isCompletionStatus(value), false)
  }
})

test('isCompletionStatus rifiuta `chiuso`, che è lo stato del cliente', () => {
  // Il caso che giustifica il file. `clients.status` ammette `chiuso`, `assessments.completion_status`
  // ammette `chiusa`: due colonne diverse, una lettera di distanza, e nei tipi generati sono tutte e
  // due `string`, quindi il compilatore non aiuta. Senza questo test il primo che le scambia lo
  // scopre dal `check` di Postgres, in inglese e al posto sbagliato.
  assert.equal(isCompletionStatus('chiuso'), false)
})

test('nextCompletionStatus manda all’opposto, e da qualsiasi cosa non sia `chiusa` si chiude', () => {
  // Il test che la revisione ha chiesto: è l'unica logica di questa story che, invertita, scrive il
  // dato sbagliato senza dare nessun errore. Le due righe di mezzo sono l'andata e il ritorno, cioè
  // che premere due volte riporta dov'era.
  assert.equal(nextCompletionStatus('bozza'), 'chiusa')
  assert.equal(nextCompletionStatus('chiusa'), 'bozza')
  assert.equal(nextCompletionStatus(nextCompletionStatus('bozza')), 'bozza')

  // `chiuso` è lo stato del cliente: qui non vale «chiusa» e la scheda si chiude, che è la lettura
  // giusta — non esiste nessun terzo caso da rendere, lo garantisce il `check` della 0005.
  assert.equal(nextCompletionStatus('chiuso'), 'chiusa')
  assert.equal(nextCompletionStatus(''), 'chiusa')
})
