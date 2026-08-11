import { test } from 'node:test'
import assert from 'node:assert/strict'

import { latestVerdict } from './latest-verdict.ts'

test('latestVerdict su un cliente senza schede risponde null', () => {
  assert.equal(latestVerdict([]), null)
})

test('latestVerdict su una scheda sola risponde il suo verdetto', () => {
  assert.equal(
    latestVerdict([
      { call_date: '2026-08-10', created_at: '2026-08-10T05:40:49.990754+00:00', id: 'a', verdict: 'non_deciso' },
    ]),
    'non_deciso',
  )
})

test('latestVerdict sceglie la call più recente, in qualunque ordine arrivino le righe', () => {
  // PostgREST non garantisce l'ordine delle righe innestate.
  const vecchia = { call_date: '2026-08-01', created_at: '2026-08-01T09:00:00+00:00', id: 'a', verdict: 'no' }
  const recente = { call_date: '2026-08-10', created_at: '2026-08-10T09:00:00+00:00', id: 'b', verdict: 'si' }

  assert.equal(latestVerdict([vecchia, recente]), 'si')
  assert.equal(latestVerdict([recente, vecchia]), 'si')
})

test('latestVerdict rompe il pareggio di call_date con created_at', () => {
  const mattina = { call_date: '2026-08-10', created_at: '2026-08-10T07:00:00+00:00', id: 'a', verdict: 'no' }
  const pomeriggio = { call_date: '2026-08-10', created_at: '2026-08-10T15:00:00+00:00', id: 'b', verdict: 'si' }

  assert.equal(latestVerdict([mattina, pomeriggio]), 'si')
  assert.equal(latestVerdict([pomeriggio, mattina]), 'si')
})

test('latestVerdict rompe il pareggio di call_date e created_at con id', () => {
  const uno = { call_date: '2026-08-10', created_at: '2026-08-10T07:00:00+00:00', id: 'aaa', verdict: 'si' }
  const due = { call_date: '2026-08-10', created_at: '2026-08-10T07:00:00+00:00', id: 'bbb', verdict: 'no' }

  assert.equal(latestVerdict([uno, due]), 'si')
  assert.equal(latestVerdict([due, uno]), 'si')
})

test('latestVerdict non fa vincere un created_at illeggibile contro uno valido', () => {
  const rotta = { call_date: '2026-08-10', created_at: 'non è una data', id: 'a', verdict: 'no' }
  const valida = { call_date: '2026-08-10', created_at: '2026-08-10T07:00:00+00:00', id: 'b', verdict: 'si' }

  assert.equal(latestVerdict([rotta, valida]), 'si')
  assert.equal(latestVerdict([valida, rotta]), 'si')
})

test('latestVerdict resta decidibile quando nessun created_at si legge', () => {
  const uno = { call_date: '2026-08-10', created_at: 'boh', id: 'aaa', verdict: 'si' }
  const due = { call_date: '2026-08-10', created_at: 'nemmeno', id: 'bbb', verdict: 'no' }

  assert.equal(latestVerdict([uno, due]), 'si')
  assert.equal(latestVerdict([due, uno]), 'si')
})

test('latestVerdict lascia passare un verdetto fuori dai quattro senza riscriverlo', () => {
  // Il restringimento avviene in VerdictPill, non qui.
  assert.equal(
    latestVerdict([
      { call_date: '2026-08-10', created_at: '2026-08-10T07:00:00+00:00', id: 'a', verdict: 'forse' },
    ]),
    'forse',
  )
})
