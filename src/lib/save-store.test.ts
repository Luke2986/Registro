import { test } from 'node:test'
import assert from 'node:assert/strict'

import type { SaveState } from '../components/save-indicator.tsx'

import { EMPTY_SUMMARY, aggregateSaveState, createSaveStore, type SaveEntry } from './save-store.ts'

const SAVING: SaveState = { kind: 'saving' }
const FAILED: SaveState = { kind: 'failed' }
const IDLE: SaveState = { kind: 'idle' }

const saved = (iso: string): SaveState => ({ kind: 'saved', at: new Date(iso) })

function entry(state: SaveState, extra: Partial<SaveEntry> = {}): SaveEntry {
  return { state, dirty: false, pending: false, save: () => {}, ...extra }
}

test('nessun campo e campi tutti fermi danno la riga vuota', () => {
  assert.deepEqual(aggregateSaveState([]), { kind: 'idle' })
  assert.deepEqual(aggregateSaveState([IDLE, IDLE, IDLE]), { kind: 'idle' })
})

test('un salvataggio riuscito porta la sua ora', () => {
  assert.deepEqual(aggregateSaveState([IDLE, saved('2026-08-09T14:32:00Z')]), {
    kind: 'saved',
    at: new Date('2026-08-09T14:32:00Z'),
  })
})

// L'indicatore dice quando si è salvato l'ultima volta, non la prima: con l'ora del primo
// mostrerebbe un orario vecchio mentre si continua a salvare.
test('fra due salvataggi riusciti vince l’ora più recente, in qualsiasi ordine arrivino', () => {
  const older = saved('2026-08-09T14:32:00Z')
  const newer = saved('2026-08-09T15:10:00Z')

  assert.deepEqual(aggregateSaveState([older, newer]), {
    kind: 'saved',
    at: new Date('2026-08-09T15:10:00Z'),
  })
  assert.deepEqual(aggregateSaveState([newer, older]), {
    kind: 'saved',
    at: new Date('2026-08-09T15:10:00Z'),
  })
})

test('un salvataggio in corso copre quelli già riusciti', () => {
  assert.deepEqual(aggregateSaveState([saved('2026-08-09T14:32:00Z'), SAVING]), { kind: 'saving' })
})

// Il caso più importante di tutti: senza questo test si riordina la scala dei confronti e niente
// diventa rosso, mentre a schermo comparirebbe `Salvato alle 14:32` su un lavoro non salvato.
test('un solo fallimento vince su tutto, in qualsiasi posizione stia', () => {
  assert.deepEqual(aggregateSaveState([SAVING, FAILED, SAVING]), { kind: 'failed' })
  assert.deepEqual(aggregateSaveState([saved('2026-08-09T14:32:00Z'), FAILED]), { kind: 'failed' })
  assert.deepEqual(aggregateSaveState([FAILED, saved('2026-08-09T15:10:00Z')]), { kind: 'failed' })
})

test('il registro parte dal riassunto vuoto', () => {
  const store = createSaveStore()

  assert.equal(store.getSummary(), EMPTY_SUMMARY)
})

// È il contratto di `useSyncExternalStore`: un oggetto nuovo a ogni chiamata manda la barra in
// ciclo infinito, e un avviso per battuta la fa rendere ventiquattro volte per niente.
test('due scritture con lo stesso riassunto non avvisano e rispondono lo stesso oggetto', () => {
  const store = createSaveStore()
  let notices = 0

  store.subscribe(() => {
    notices += 1
  })

  store.set('a', entry(SAVING))

  const first = store.getSummary()

  store.set('a', entry(SAVING))

  assert.equal(notices, 1)
  assert.equal(store.getSummary(), first)
})

test('una scrittura che cambia stato avvisa e cambia il riassunto', () => {
  const store = createSaveStore()
  let notices = 0

  store.set('a', entry(SAVING))
  store.subscribe(() => {
    notices += 1
  })
  store.set('a', entry(FAILED))

  assert.equal(notices, 1)
  assert.deepEqual(store.getSummary().state, { kind: 'failed' })
})

// Due `saved` a ore diverse sono due righe diverse a schermo, quindi il riassunto deve cambiare.
test('due salvataggi riusciti a ore diverse sono due riassunti diversi', () => {
  const store = createSaveStore()
  let notices = 0

  store.set('a', entry(saved('2026-08-09T14:32:00Z')))
  store.subscribe(() => {
    notices += 1
  })
  store.set('a', entry(saved('2026-08-09T15:10:00Z')))

  assert.equal(notices, 1)
  assert.deepEqual(store.getSummary().state, { kind: 'saved', at: new Date('2026-08-09T15:10:00Z') })
})

test('togliere un campo ricalcola il riassunto senza di lui', () => {
  const store = createSaveStore()

  store.set('a', entry(FAILED))
  store.set('b', entry(saved('2026-08-09T14:32:00Z')))

  assert.deepEqual(store.getSummary().state, { kind: 'failed' })

  store.remove('a')

  assert.deepEqual(store.getSummary().state, { kind: 'saved', at: new Date('2026-08-09T14:32:00Z') })
})

test('il riassunto conta i campi da salvare', () => {
  const store = createSaveStore()

  store.set('a', entry(IDLE, { dirty: true }))
  store.set('b', entry(IDLE, { dirty: true }))
  store.set('c', entry(IDLE))

  assert.equal(store.getSummary().dirty, 2)

  store.remove('a')

  assert.equal(store.getSummary().dirty, 1)
})

// Un campo con una scrittura in volo non è salvabile: `save()` si rifiuterebbe da sé, quindi
// contarlo accenderebbe il comando esplicito su un lavoro che non può fare. Torna nel conteggio
// quando la risposta arriva, e da lì premerlo scrive subito invece di aspettare i tre secondi.
test('un campo cambiato con una scrittura in volo non si conta finché non torna salvabile', () => {
  const store = createSaveStore()

  store.set('a', entry(SAVING, { dirty: true, pending: true }))

  assert.equal(store.getSummary().dirty, 0)

  store.set('a', entry(saved('2026-08-09T14:32:00Z'), { dirty: true }))

  assert.equal(store.getSummary().dirty, 1)
})

test('il comando esplicito salva i campi cambiati e salta quelli già in volo', () => {
  const store = createSaveStore()
  const called: string[] = []

  store.set('cambiato', entry(IDLE, { dirty: true, save: () => called.push('cambiato') }))
  store.set('in-volo', entry(SAVING, { dirty: true, pending: true, save: () => called.push('in-volo') }))
  store.set('fermo', entry(IDLE, { save: () => called.push('fermo') }))

  store.saveDirty()

  assert.deepEqual(called, ['cambiato'])
})

test('Riprova rimanda solo i falliti e salta quelli già in volo', () => {
  const store = createSaveStore()
  const called: string[] = []

  store.set('caduto', entry(FAILED, { save: () => called.push('caduto') }))
  store.set('caduto-in-volo', entry(FAILED, { pending: true, save: () => called.push('caduto-in-volo') }))
  store.set('riuscito', entry(saved('2026-08-09T14:32:00Z'), { save: () => called.push('riuscito') }))

  store.retryFailed()

  assert.deepEqual(called, ['caduto'])
})

test('chi si disiscrive non riceve più avvisi', () => {
  const store = createSaveStore()
  let notices = 0

  const unsubscribe = store.subscribe(() => {
    notices += 1
  })

  store.set('a', entry(SAVING))
  unsubscribe()
  store.set('a', entry(FAILED))

  assert.equal(notices, 1)
})
