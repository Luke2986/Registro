import { test } from 'node:test'
import assert from 'node:assert/strict'

import { shouldHonourExit } from './owed-exit.ts'

test('senza un ricordo non si scrive niente', () => {
  assert.equal(shouldHonourExit(null, 'mandato', 'mandato'), false)
})

test('il ricordo battuto durante il viaggio si onora', () => {
  assert.equal(shouldHonourExit('nuovo', 'mandato', 'mandato'), true)
})

// Il caso in cui si esce dal campo senza aver battuto altro: la scrittura in volo portava già
// tutto, e onorare il ricordo vorrebbe dire mandare due volte la stessa cosa.
test('il ricordo uguale al testo appena mandato non si riscrive', () => {
  assert.equal(shouldHonourExit('mandato', 'mandato', 'mandato'), false)
})

// Il server ripulisce: si manda «testo », lui salva «testo», e nel frattempo lo spazio in coda
// è stato tolto a mano. Quello che resta a schermo è già sul server.
test('il ricordo uguale a quello che il server ha salvato non si riscrive', () => {
  assert.equal(shouldHonourExit('testo', 'testo ', 'testo'), false)
})

// Una scrittura fallita non risponde nessun `saved`: il ricordo resta l'unica cosa più recente
// che esista, e va mandato. Vale anche il suo contrario, che è il caso della riga sopra.
test('con una scrittura fallita il ricordo nuovo si onora e quello identico no', () => {
  assert.equal(shouldHonourExit('nuovo', 'mandato', undefined), true)
  assert.equal(shouldHonourExit('mandato', 'mandato', undefined), false)
})

// La riga che un controllo scritto sulla verità di `owed` sbaglierebbe in silenzio: svuotare un
// campo è una modifica, e il suo ricordo va onorato come ogni altro.
test('il campo svuotato è un ricordo come gli altri', () => {
  assert.equal(shouldHonourExit('', 'c’era del testo', undefined), true)
  assert.equal(shouldHonourExit('', '', undefined), false)
  assert.equal(shouldHonourExit('', 'c’era del testo', ''), false)
})
