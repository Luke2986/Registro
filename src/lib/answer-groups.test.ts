import { test } from 'node:test'
import assert from 'node:assert/strict'

import { groupAnswersByBlock } from './answer-groups.ts'

/** Il minimo che la funzione chiede: un titolo e qualcosa per riconoscere la riga nel test. */
function answer(id: string, blockTitle: string) {
  return { id, block_title: blockTitle }
}

test('un elenco vuoto non produce nessun gruppo', () => {
  assert.deepEqual(groupAnswersByBlock([]), [])
})

test('un blocco solo produce un gruppo con tutte le sue risposte', () => {
  const rows = [answer('a', 'Contesto'), answer('b', 'Contesto'), answer('c', 'Contesto')]

  assert.deepEqual(groupAnswersByBlock(rows), [{ title: 'Contesto', answers: rows }])
})

test('tre blocchi in fila producono tre gruppi, nell’ordine ricevuto', () => {
  const rows = [
    answer('a', 'Contesto'),
    answer('b', 'Obiettivo'),
    answer('c', 'Obiettivo'),
    answer('d', 'Dove si rompe'),
  ]

  assert.deepEqual(
    groupAnswersByBlock(rows).map((group) => group.title),
    ['Contesto', 'Obiettivo', 'Dove si rompe'],
  )
})

// Il caso per cui questa funzione non è una mappa: con una mappa `titolo → risposte` i due
// `Contesto` diventerebbero un gruppo solo e la domanda `c` risalirebbe sopra la `b`, cambiando
// l'ordine dell'intervista senza nessun errore.
test('due blocchi omonimi non adiacenti restano due gruppi', () => {
  const rows = [answer('a', 'Contesto'), answer('b', 'Obiettivo'), answer('c', 'Contesto')]

  const groups = groupAnswersByBlock(rows)

  assert.equal(groups.length, 3)
  assert.deepEqual(
    groups.map((group) => [group.title, group.answers.map((row) => row.id)]),
    [
      ['Contesto', ['a']],
      ['Obiettivo', ['b']],
      ['Contesto', ['c']],
    ],
  )
})

test('l’ordine dentro il gruppo è quello ricevuto e non si riordina', () => {
  const rows = [answer('c', 'Contesto'), answer('a', 'Contesto'), answer('b', 'Contesto')]

  assert.deepEqual(
    groupAnswersByBlock(rows)[0]?.answers.map((row) => row.id),
    ['c', 'a', 'b'],
  )
})
