import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  VERDICTS,
  VERDICT_FIELDS,
  VERDICT_LABELS,
  isConditionalField,
  isVerdict,
  isVerdictFieldKey,
  showsCondition,
} from './verdict.ts'

test('i quattro valori stanno nell’ordine del vincolo, non in un ordine di merito', () => {
  // 0005_assessments_answers.sql:28. Se qualcuno riordina mettendo `si` in testa «perché è
  // l'ordine naturale», il selettore comincia a suggerire un esito (NFR7, D7).
  assert.deepEqual([...VERDICTS], ['si', 'si_condizionato', 'no', 'non_deciso'])
})

test('isVerdict accetta i quattro valori e nient’altro', () => {
  for (const verdict of VERDICTS) assert.equal(isVerdict(verdict), true)

  // La stringa vuota è quello che manderebbe un selettore con l'opzione vuota, che non esiste;
  // gli altri non arrivano nemmeno da un browser.
  for (const value of ['', ' si', 'SI', 'forse', null, undefined, 3, { verdict: 'si' }]) {
    assert.equal(isVerdict(value), false)
  }
})

test('ogni verdetto ha la sua etichetta, e sono quelle che si leggono a schermo', () => {
  // Una mappa incompleta mostrerebbe `si_condizionato` a schermo: la cosa più visibile e la meno
  // grave delle tre che questo file protegge.
  assert.deepEqual(
    VERDICTS.map((verdict) => VERDICT_LABELS[verdict]),
    ['sì', 'sì condizionato', 'no', 'non deciso'],
  )
})

test('i cinque campi sono le cinque colonne del verdetto, in quell’ordine', () => {
  assert.deepEqual(
    VERDICT_FIELDS.map((field) => field.key),
    ['verdict', 'verdict_reason', 'condition_text', 'verify_by', 'next_step'],
  )
})

test('isVerdictFieldKey accetta le cinque chiavi', () => {
  for (const field of VERDICT_FIELDS) assert.equal(isVerdictFieldKey(field.key), true)
})

test('isVerdictFieldKey rifiuta le altre colonne della stessa riga', () => {
  // Non è un caso per fare numero: è la ragione per cui la funzione esiste. La policy protegge le
  // righe di un altro proprietario, non la colonna sbagliata sulla propria.
  for (const key of [
    'owner_id',
    'total_questions',
    'completion_status',
    'client_id',
    'id',
    'questionnaire_id',
    '',
    null,
    undefined,
  ]) {
    assert.equal(isVerdictFieldKey(key), false)
  }
})

test('i campi condizionali sono la condizione e la data, e nessun altro', () => {
  assert.deepEqual(
    VERDICT_FIELDS.filter((field) => isConditionalField(field.key)).map((field) => field.key),
    ['condition_text', 'verify_by'],
  )
})

test('col verdetto condizionato i due campi si vedono, anche vuoti', () => {
  assert.equal(showsCondition('si_condizionato', null, null), true)
})

test('senza verdetto condizionato e senza contenuto i due campi non ci sono', () => {
  for (const verdict of ['si', 'no', 'non_deciso']) {
    assert.equal(showsCondition(verdict, null, null), false)
    assert.equal(showsCondition(verdict, '', ''), false)
  }
})

test('un contenuto salvato basta a tenerli visibili, anche cambiando verdetto', () => {
  // È la metà della decisione che impedisce a un testo scritto di diventare invisibile e di
  // ricomparire solo nell'esportazione, sotto un «no», dove non significa più niente.
  assert.equal(showsCondition('no', 'Entro settembre assumono un tecnico', null), true)
  assert.equal(showsCondition('no', null, '2026-09-30'), true)
  assert.equal(showsCondition('si', 'una condizione', '2026-09-30'), true)
})

test('una condizione di soli spazi non è un contenuto', () => {
  // Stessa definizione di vuoto di normalizeTextValue: senza, il campo riapparirebbe per uno
  // spazio, e quello spazio non è niente che qualcuno abbia scritto.
  assert.equal(showsCondition('no', '   ', null), false)
  assert.equal(showsCondition('no', '\n\t ', '  '), false)
})
