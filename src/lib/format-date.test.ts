import { test } from 'node:test'
import assert from 'node:assert/strict'

import { formatCallDate, formatLastActivity, todayIsoDate } from './format-date.ts'

// `now` si passa sempre a mano: un test che chiama new Date() passa oggi e fallisce il primo
// del mese. In agosto Roma è a UTC+2, e gli scostamenti qui sotto lo dicono esplicitamente.

test('stesso giorno civile → oggi', () => {
  const now = new Date('2026-08-04T18:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-04T08:00:00+02:00', now), 'oggi')
})

test('le 23:00 di ieri, guardate alle 08:00 di oggi → ieri', () => {
  // Nove ore di distanza: contando periodi di ventiquattro ore diventerebbe `oggi`.
  const now = new Date('2026-08-04T08:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-03T23:00:00+02:00', now), 'ieri')
})

test('due giorni → 2 giorni fa', () => {
  const now = new Date('2026-08-04T10:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-02T10:00:00+02:00', now), '2 giorni fa')
})

test('sei giorni → 6 giorni fa', () => {
  const now = new Date('2026-08-04T10:00:00+02:00')

  assert.equal(formatLastActivity('2026-07-29T10:00:00+02:00', now), '6 giorni fa')
})

test('sette giorni → forma assoluta', () => {
  const now = new Date('2026-08-04T10:00:00+02:00')

  assert.equal(formatLastActivity('2026-07-28T10:00:00+02:00', now), '28/07/2026')
})

test('un istante che a Roma è già il giorno dopo si legge come giorno di Roma', () => {
  // 23:30 UTC del 3 agosto sono l'01:30 del 4 agosto a Roma. Contato in UTC — cioè il fuso di
  // Vercel — sarebbe il giorno prima, e la riga direbbe `ieri` invece di `oggi`.
  const now = new Date('2026-08-04T20:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-03T23:30:00+00:00', now), 'oggi')
})

test('e anche la forma assoluta è il giorno di Roma', () => {
  const now = new Date('2026-08-11T10:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-03T23:30:00+00:00', now), '04/08/2026')
})

test('una data futura → oggi', () => {
  const now = new Date('2026-08-04T10:00:00+02:00')

  assert.equal(formatLastActivity('2026-08-05T10:00:00+02:00', now), 'oggi')
})

test('una stringa illeggibile rende una cella vuota, non un’eccezione', () => {
  // `Intl` lancia su una data invalida, e questa funzione gira in un componente server: senza
  // guardia, una stringa storta sarebbe la schermata iniziale che non si rende.
  const now = new Date('2026-08-04T10:00:00+02:00')

  assert.equal(formatLastActivity('non una data', now), '')
})

test('oggi è il giorno di Roma anche quando la macchina è a UTC', () => {
  // Le 22:30 UTC del 9 agosto sono le 00:30 del 10 a Roma. È il caso che conta: su Vercel il
  // fuso è UTC (D23), e senza il timeZone dichiarato una scheda aperta a quell'ora nascerebbe
  // con la data di ieri. I test girano con TZ=UTC proprio perché questo fallisca qui.
  assert.equal(todayIsoDate(new Date('2026-08-09T22:30:00Z')), '2026-08-10')
})

test('oggi resta il giorno corrente quando i due fusi coincidono', () => {
  assert.equal(todayIsoDate(new Date('2026-08-09T10:00:00Z')), '2026-08-09')
})

test('oggi porta mese e giorno a due cifre', () => {
  // Una colonna `date` e `<input type="date">` vogliono AAAA-MM-GG: `2026-1-5` non è quella
  // forma, e sarebbe validateCallDate a rifiutarla.
  assert.equal(todayIsoDate(new Date('2026-01-05T12:00:00Z')), '2026-01-05')
})

test('il giorno di una call si rende gg/mm/aaaa', () => {
  assert.equal(formatCallDate('2026-08-04'), '04/08/2026')
})

test('il giorno di una call non passa da un fuso, nemmeno a mezzanotte', () => {
  // Con `new Date('2026-08-01')` la stringa si leggerebbe in UTC e a Roma resterebbe il primo,
  // ma in un fuso a ovest diventerebbe il 31 luglio. Componendola dalle sue parti non succede.
  assert.equal(formatCallDate('2026-08-01'), '01/08/2026')
})

test('una data di call illeggibile rende vuoto', () => {
  assert.equal(formatCallDate('non una data'), '')
})
