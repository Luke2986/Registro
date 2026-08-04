import { test } from 'node:test'
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

test('se è il cliente ad avere la data illeggibile, vince la scheda valida', () => {
  // La direzione opposta della regola di Task 1, scritta nel codice e prima mai eseguita.
  const row = {
    updated_at: 'non una data',
    assessments: [{ updated_at: '2026-08-01T10:00:00+00:00' }],
  }

  assert.equal(lastActivityAt(row), '2026-08-01T10:00:00+00:00')
})

test('un innesto null non fa cadere il calcolo', () => {
  // Il tipo lo vieta e PostgREST risponde `[]`, ma è l'unica forma mai vista girare sui dati
  // veri: se rispondesse null, senza guardia cadrebbe la schermata iniziale intera.
  const row = { updated_at: '2026-08-01T10:00:00+00:00', assessments: null }

  assert.equal(lastActivityAt(row as unknown as Parameters<typeof lastActivityAt>[0]), '2026-08-01T10:00:00+00:00')
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

test('una riga con data illeggibile finisce in fondo e non riordina le altre', () => {
  // Il difetto che questo test esiste per impedire: con il ripiego sul nome dentro il confronto,
  // il comparatore smetteva di essere transitivo e gennaio finiva sopra agosto.
  const vecchio = { name: 'Alfa', updated_at: '2026-01-01T10:00:00+00:00', assessments: [] }
  const rotto = { name: 'Beta', updated_at: 'non una data', assessments: [] }
  const recente = { name: 'Gamma', updated_at: '2026-08-04T10:00:00+00:00', assessments: [] }

  assert.deepEqual([vecchio, rotto, recente].sort(byLastActivityDesc), [recente, vecchio, rotto])
})

test('l’ordine non dipende dall’ordine di partenza', () => {
  // Un comparatore non transitivo dà risultati diversi a seconda di come arriva l'array, cioè
  // di quello che decide il database. Le sei permutazioni devono dare la stessa risposta.
  const vecchio = { name: 'Alfa', updated_at: '2026-01-01T10:00:00+00:00', assessments: [] }
  const rotto = { name: 'Beta', updated_at: 'non una data', assessments: [] }
  const recente = { name: 'Gamma', updated_at: '2026-08-04T10:00:00+00:00', assessments: [] }

  const permutazioni = [
    [vecchio, rotto, recente],
    [vecchio, recente, rotto],
    [rotto, vecchio, recente],
    [rotto, recente, vecchio],
    [recente, vecchio, rotto],
    [recente, rotto, vecchio],
  ]

  for (const partenza of permutazioni) {
    const nomi = [...partenza].sort(byLastActivityDesc).map((row) => row.name)
    assert.deepEqual(nomi, ['Gamma', 'Alfa', 'Beta'], `partenza ${partenza.map((r) => r.name).join(' ')}`)
  }
})

test('due righe entrambe illeggibili non si scambiano di posto', () => {
  // `−Infinity − (−Infinity)` è NaN: il confronto sui valori evita anche questo.
  const zeta = { name: 'Zeta', updated_at: 'non una data', assessments: [] }
  const alfa = { name: 'Alfa', updated_at: 'nemmeno questa', assessments: [] }

  assert.deepEqual([zeta, alfa].sort(byLastActivityDesc), [alfa, zeta])
})
