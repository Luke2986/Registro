import { test } from 'node:test'
import assert from 'node:assert/strict'

import { assessmentFileName } from './export-filename.ts'

/**
 * L'invariante vale più di ogni elenco di ingressi: gli ingressi cattivi sono infiniti, e chi
 * scrive il test pensa agli stessi a cui ha pensato scrivendo il codice. Questa espressione è la
 * stessa cosa che la lista di ammessi promette, e si verifica su **ogni** caso del file.
 */
const SAFE = /^[a-z0-9-]+\.md$/

function checked(clientName: string, callDate: string): string {
  const name = assessmentFileName(clientName, callDate)
  assert.match(name, SAFE, `nome non sicuro: ${JSON.stringify(name)}`)

  return name
}

test('assessmentFileName compone cliente, data ISO e suffisso', () => {
  assert.equal(checked('pino', '2026-08-10'), 'pino-2026-08-10-prequalifica.md')
})

test('assessmentFileName toglie i diacritici invece di scartare la lettera', () => {
  assert.equal(checked('Società Rossi & C.', '2026-08-10'), 'societa-rossi-c-2026-08-10-prequalifica.md')
})

test('assessmentFileName tratta la forma decomposta come quella composta', () => {
  // `à` battuto a tastiera e `a` + U+0300 incollato dal web devono dare lo stesso nome.
  assert.equal(
    checked('città', '2026-08-10'),
    checked('città', '2026-08-10'),
  )
})

test('assessmentFileName collassa ogni corsa di caratteri non ammessi in un solo trattino', () => {
  assert.equal(checked('Rossi   &&&   Figli', '2026-08-10'), 'rossi-figli-2026-08-10-prequalifica.md')
})

test('assessmentFileName non lascia trattini in testa né in coda allo slug', () => {
  assert.equal(checked('  ...pino!!!  ', '2026-08-10'), 'pino-2026-08-10-prequalifica.md')
})

test('assessmentFileName mette in minuscolo', () => {
  assert.equal(checked('PINO SpA', '2026-08-10'), 'pino-spa-2026-08-10-prequalifica.md')
})

test('assessmentFileName non lascia passare una virgoletta doppia', () => {
  // Il caso che chiude il valore di Content-Disposition in anticipo.
  const name = checked('pino"cattivo', '2026-08-10')
  assert.ok(!name.includes('"'))
  assert.equal(name, 'pino-cattivo-2026-08-10-prequalifica.md')
})

test('assessmentFileName non lascia passare un ritorno a capo', () => {
  // Il caso che inietterebbe una seconda intestazione nella risposta.
  const name = checked('pino\r\nX-Qualcosa: valore', '2026-08-10')
  assert.ok(!name.includes('\r'))
  assert.ok(!name.includes('\n'))
})

test('assessmentFileName non lascia passare un separatore di percorso', () => {
  assert.equal(checked('../../pino', '2026-08-10'), 'pino-2026-08-10-prequalifica.md')
  assert.equal(checked('a\\b', '2026-08-10'), 'a-b-2026-08-10-prequalifica.md')
})

test('assessmentFileName fa cadere un carattere invisibile senza importare INVISIBLE', () => {
  // Uno zero-width non è in [a-z0-9], quindi cade da sé: è il punto di una lista di ammessi.
  assert.equal(checked('pi​no', '2026-08-10'), 'pi-no-2026-08-10-prequalifica.md')
})

test('assessmentFileName ripiega su `cliente` quando lo slug si riduce a niente', () => {
  assert.equal(checked('日本語', '2026-08-10'), 'cliente-2026-08-10-prequalifica.md')
  assert.equal(checked('...', '2026-08-10'), 'cliente-2026-08-10-prequalifica.md')
  assert.equal(checked('', '2026-08-10'), 'cliente-2026-08-10-prequalifica.md')
})

test('assessmentFileName non tronca un nome al limite dei 200 caratteri', () => {
  const long = 'a'.repeat(200)
  assert.equal(checked(long, '2026-08-10'), `${long}-2026-08-10-prequalifica.md`)
})

test('assessmentFileName regge una callDate di altra forma senza rompere l’invariante', () => {
  // La data arriva da una colonna `date` e ha sempre questa forma; se non l'avesse, il nome
  // resta comunque sicuro, che è la sola cosa che conta qui.
  checked('pino', '')
  checked('pino', '10/08/2026')
  checked('pino', 'non una data')
})
