import { test } from 'node:test'
import assert from 'node:assert/strict'

import { BLOCK_TITLE_MAX_LENGTH, validateBlockTitle } from './block-title.ts'

test('un titolo normale torna ok e ripulito', () => {
  const result = validateBlockTitle('  Contesto  ')

  assert.deepEqual(result, { ok: true, title: 'Contesto' })
})

test('una stringa di soli spazi è rifiutata', () => {
  const result = validateBlockTitle('   ')

  assert.equal(result.ok, false)
})

// Il caso che trim() da solo non copre: gli zero-width passerebbero per un titolo.
test('una stringa di soli caratteri invisibili è rifiutata', () => {
  const result = validateBlockTitle('​‍﻿')

  assert.equal(result.ok, false)
})

test('gli invisibili in mezzo a un titolo valido spariscono senza far cadere il titolo', () => {
  const result = validateBlockTitle('Obiet​tivo')

  assert.deepEqual(result, { ok: true, title: 'Obiettivo' })
})

test('undefined, null e un numero sono rifiutati', () => {
  assert.equal(validateBlockTitle(undefined).ok, false)
  assert.equal(validateBlockTitle(null).ok, false)
  assert.equal(validateBlockTitle(3).ok, false)
})

// È qui che il limite si sposterebbe di uno senza che nessuno se ne accorga.
test('un titolo lungo esattamente il limite passa, uno di uno in più no', () => {
  assert.equal(validateBlockTitle('a'.repeat(BLOCK_TITLE_MAX_LENGTH)).ok, true)
  assert.equal(validateBlockTitle('a'.repeat(BLOCK_TITLE_MAX_LENGTH + 1)).ok, false)
})
