import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  CALL_DATE_INVALID,
  VERIFY_BY_INVALID,
  validateCallDate,
  validateVerifyBy,
} from './call-date.ts'

const TODAY = '2026-08-09'

test('una data nella forma giusta si accetta com’è', () => {
  assert.deepEqual(validateCallDate('2026-08-04', TODAY), { ok: true, date: '2026-08-04' })
})

test('il campo svuotato vale oggi, non un errore', () => {
  assert.deepEqual(validateCallDate('', TODAY), { ok: true, date: TODAY })
})

test('l’argomento non passato vale oggi', () => {
  assert.deepEqual(validateCallDate(undefined, TODAY), { ok: true, date: TODAY })
})

test('null, un numero e un oggetto sono richieste che non doveva esistere', () => {
  // formData.get risponde null quando la chiave non c'è: il modulo rende sempre il campo, quindi
  // qui la richiesta è forgiata. Gli altri due non arrivano nemmeno da un browser.
  for (const value of [null, 20260804, { date: '2026-08-04' }, new Date()]) {
    assert.deepEqual(validateCallDate(value, TODAY), { ok: false, message: CALL_DATE_INVALID })
  }
})

test('un giorno che non esiste ha la forma giusta e si rifiuta lo stesso', () => {
  // Senza il round-trip, Date lo trasformerebbe in 2026-03-03 e la scheda direbbe un giorno che
  // nessuno ha scelto.
  assert.deepEqual(validateCallDate('2026-02-31', TODAY), { ok: false, message: CALL_DATE_INVALID })
})

test('la forma corta non è quella che manda il campo data', () => {
  assert.deepEqual(validateCallDate('2026-2-3', TODAY), { ok: false, message: CALL_DATE_INVALID })
})

test('il 29 febbraio di un anno bisestile esiste e si accetta', () => {
  assert.deepEqual(validateCallDate('2028-02-29', TODAY), { ok: true, date: '2028-02-29' })
})

test('il 29 febbraio di un anno che non è bisestile non esiste', () => {
  assert.deepEqual(validateCallDate('2026-02-29', TODAY), { ok: false, message: CALL_DATE_INVALID })
})

test('l’anno zero esiste in JavaScript e non in Postgres, quindi si rifiuta qui', () => {
  // Ha la forma giusta e supera il round-trip, perché Date accetta l'anno zero. Senza il
  // controllo arriverebbe fino all'insert e il messaggio direbbe «riprova» invece di «la data
  // non è valida».
  assert.deepEqual(validateCallDate('0000-01-01', TODAY), { ok: false, message: CALL_DATE_INVALID })
  assert.deepEqual(validateCallDate('0001-01-01', TODAY), { ok: true, date: '0001-01-01' })
})

test('nessun limite: il passato lontano e il futuro lontano si accettano', () => {
  // Una call di tre mesi fa si registra adesso, una di domani si prepara oggi (D14).
  assert.deepEqual(validateCallDate('2019-01-01', TODAY), { ok: true, date: '2019-01-01' })
  assert.deepEqual(validateCallDate('2031-12-31', TODAY), { ok: true, date: '2031-12-31' })
})

test('il campo «verificare entro» svuotato vale null, non oggi', () => {
  // È il caso che giustifica la seconda funzione: scrivere oggi vorrebbe dire inventare una
  // scadenza che nessuno ha scritto, dentro una colonna che deve restare vuota.
  assert.deepEqual(validateVerifyBy(''), { ok: true, date: null })
  assert.deepEqual(validateVerifyBy(undefined), { ok: true, date: null })
})

test('null è una chiave assente da una richiesta che il modulo rende sempre', () => {
  assert.deepEqual(validateVerifyBy(null), { ok: false, message: VERIFY_BY_INVALID })
  assert.deepEqual(validateVerifyBy(20260930), { ok: false, message: VERIFY_BY_INVALID })
})

test('«verificare entro» condivide forma, round-trip e primo giorno con la data della call', () => {
  assert.deepEqual(validateVerifyBy('2026-9-3'), { ok: false, message: VERIFY_BY_INVALID })
  assert.deepEqual(validateVerifyBy('2026-02-31'), { ok: false, message: VERIFY_BY_INVALID })
  assert.deepEqual(validateVerifyBy('0000-01-01'), { ok: false, message: VERIFY_BY_INVALID })
})

test('una data valida torna sé stessa, senza limiti', () => {
  assert.deepEqual(validateVerifyBy('2026-09-30'), { ok: true, date: '2026-09-30' })
  assert.deepEqual(validateVerifyBy('2019-01-01'), { ok: true, date: '2019-01-01' })
})

test('il messaggio del «verificare entro» non nomina la call', () => {
  // Riusare CALL_DATE_INVALID avrebbe parlato della data sbagliata al posto giusto.
  assert.notEqual(VERIFY_BY_INVALID, CALL_DATE_INVALID)
})
