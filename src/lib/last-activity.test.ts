import test from 'node:test'
import assert from 'node:assert/strict'

import { byLastActivityDesc, lastActivityAt } from './last-activity.ts'

test('AC2 — un cliente senza schede vale il suo updated_at', () => {
  const row = { updated_at: '2026-08-01T10:00:00+00:00', assessments: [] }

  assert.equal(lastActivityAt(row), '2026-08-01T10:00:00+00:00')
})

test('AC1 — una scheda più recente vince sul cliente', () => {
  const row = {
    updated_at: '2026-07-01T10:00:00+00:00',
    assessments: [{ updated_at: '2026-08-04T09:00:00+00:00' }],
  }

  assert.equal(lastActivityAt(row), '2026-08-04T09:00:00+00:00')
})

test('una scheda più vecchia non vince sul cliente', () => {
  const row = {
    updated_at: '2026-08-04T09:00:00+00:00',
    assessments: [{ updated_at: '2026-07-01T10:00:00+00:00' }],
  }

  assert.equal(lastActivityAt(row), '2026-08-04T09:00:00+00:00')
})

test('fra più schede vince la più recente, non l’ultima dell’array', () => {
  const row = {
    updated_at: '2026-06-01T10:00:00+00:00',
    assessments: [
      { updated_at: '2026-07-01T10:00:00+00:00' },
      { updated_at: '2026-08-04T09:00:00+00:00' },
      { updated_at: '2026-07-15T10:00:00+00:00' },
    ],
  }

  assert.equal(lastActivityAt(row), '2026-08-04T09:00:00+00:00')
})

test('due timestamptz che come stringhe ordinano al contrario', () => {
  // Come stringhe '2026-08-04T09:00:00.123456+00:00' < '2026-08-04T11:00:00+02:00',
  // ma sono lo stesso istante meno un secondo: il confronto giusto è fra numeri.
  const row = {
    updated_at: '2026-08-04T09:00:00.123456+00:00',
    assessments: [{ updated_at: '2026-08-04T11:00:00+02:00' }],
  }

  assert.equal(lastActivityAt(row), '2026-08-04T09:00:00.123456+00:00')
})

test('una data illeggibile fra le schede non vince e non fa cadere niente', () => {
  const row = {
    updated_at: '2026-08-01T10:00:00+00:00',
    assessments: [{ updated_at: 'non una data' }],
  }

  assert.equal(lastActivityAt(row), '2026-08-01T10:00:00+00:00')
})

test('il comparatore mette in cima la scheda più recente', () => {
  const fermo = {
    name: 'Alfa',
    updated_at: '2026-08-04T09:00:00+00:00',
    assessments: [],
  }
  const conScheda = {
    name: 'Beta',
    updated_at: '2026-07-01T10:00:00+00:00',
    assessments: [{ updated_at: '2026-08-04T10:00:00+00:00' }],
  }

  assert.deepEqual([fermo, conScheda].sort(byLastActivityDesc), [conScheda, fermo])
})

test('a parità esatta di istante il comparatore ordina per nome', () => {
  const zeta = { name: 'Zeta', updated_at: '2026-08-04T09:00:00+00:00', assessments: [] }
  const alfa = { name: 'Alfa', updated_at: '2026-08-04T09:00:00+00:00', assessments: [] }

  assert.deepEqual([zeta, alfa].sort(byLastActivityDesc), [alfa, zeta])
})
