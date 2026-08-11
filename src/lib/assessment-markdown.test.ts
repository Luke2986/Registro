import { test } from 'node:test'
import assert from 'node:assert/strict'

import { assessmentMarkdown, type MarkdownAnswer, type MarkdownVerdict } from './assessment-markdown.ts'

const EMPTY_VERDICT: MarkdownVerdict = {
  verdict: 'non_deciso',
  verdict_reason: null,
  condition_text: null,
  verify_by: null,
  next_step: null,
}

function answer(block: string, question: string, content: string | null = null): MarkdownAnswer {
  return { block_title: block, question_text: question, content }
}

function build(overrides: {
  clientName?: string
  callDate?: string
  intervieweeName?: string | null
  answers?: MarkdownAnswer[]
  verdict?: MarkdownVerdict
} = {}): string {
  return assessmentMarkdown({
    clientName: overrides.clientName ?? 'pino',
    callDate: overrides.callDate ?? '2026-08-10',
    intervieweeName: overrides.intervieweeName ?? null,
    answers: overrides.answers ?? [],
    verdict: overrides.verdict ?? EMPTY_VERDICT,
  })
}

test('assessmentMarkdown apre col titolo e porta l’intestazione di AC1', () => {
  const doc = build({ intervieweeName: 'Mario Rossi' })

  assert.ok(doc.startsWith('# Prequalifica — pino\n'))
  assert.ok(doc.includes('**Cliente:** pino\n**Data:** 10/08/2026\n**Interlocutore:** Mario Rossi'))
})

test('assessmentMarkdown senza interlocutore non lascia la riga', () => {
  const doc = build()

  assert.ok(!doc.includes('Interlocutore'))
  assert.ok(doc.includes('**Data:** 10/08/2026'))
})

test('assessmentMarkdown raggruppa le risposte per blocco nell’ordine ricevuto', () => {
  const doc = build({
    answers: [
      answer('Contesto', 'Chi siete?', 'una web agency'),
      answer('Contesto', 'Da quanto?', 'tre anni'),
      answer('Obiettivo', 'Cosa volete?', 'più clienti'),
    ],
  })

  const contesto = doc.indexOf('## Contesto')
  const obiettivo = doc.indexOf('## Obiettivo')

  assert.ok(contesto >= 0 && obiettivo > contesto)
  assert.equal(doc.match(/^## Contesto$/gm)?.length, 1)
  assert.ok(doc.includes('### Chi siete?\n\nuna web agency'))
})

test('assessmentMarkdown lascia due gruppi a due corse separate dello stesso blocco', () => {
  // La ragione per cui `groupAnswersByBlock` conta le corse invece di usare una mappa: una mappa
  // fonderebbe queste due. Due blocchi omonimi *adiacenti* invece si fondono, ed è la voce aperta
  // a ledger dalla revisione della 3.2 — questo test non la copre e non va letto come se lo facesse.
  const doc = build({
    answers: [answer('Dati', 'Prima'), answer('Altro', 'Seconda'), answer('Dati', 'Terza')],
  })

  assert.equal(doc.match(/^## Dati$/gm)?.length, 2)
})

test('assessmentMarkdown lascia la domanda saltata col suo titolo e niente sotto (AC3)', () => {
  const doc = build({ answers: [answer('Contesto', 'Chi siete?'), answer('Contesto', 'Da quanto?', 'tre anni')] })

  assert.ok(doc.includes('### Chi siete?\n\n### Da quanto?\n\ntre anni'))
})

test('assessmentMarkdown conta vuota una risposta di soli spazi', () => {
  const doc = build({ answers: [answer('Contesto', 'Chi siete?', '   \n  ')] })

  assert.ok(doc.includes('### Chi siete?\n\n## Verdetto'))
})

test('assessmentMarkdown porta il testo della domanda su una riga sola', () => {
  const doc = build({ answers: [answer('Contesto', 'Chi\nsiete\tdavvero?')] })

  assert.ok(doc.includes('### Chi siete davvero?'))
  assert.ok(!doc.includes('### Chi\n'))
})

test('assessmentMarkdown porta il titolo del blocco su una riga sola', () => {
  const doc = build({ answers: [answer('Con\ntesto', 'Chi siete?')] })

  assert.ok(doc.includes('## Con testo'))
})

test('assessmentMarkdown porta su una riga sola anche cliente e interlocutore', () => {
  const doc = build({ clientName: 'Ros\nsi', intervieweeName: 'Mario\r\nRossi' })

  assert.ok(doc.startsWith('# Prequalifica — Ros si\n'))
  assert.ok(doc.includes('**Interlocutore:** Mario Rossi'))
})

test('assessmentMarkdown lascia il contenuto com’è battuto, `#` compreso', () => {
  const doc = build({ answers: [answer('Contesto', 'Chi siete?', '# non è un titolo\n- e questo è un elenco')] })

  assert.ok(doc.includes('### Chi siete?\n\n# non è un titolo\n- e questo è un elenco'))
})

test('assessmentMarkdown scrive l’esito per esteso e mai il valore della colonna', () => {
  const doc = build({ verdict: { ...EMPTY_VERDICT, verdict: 'si_condizionato' } })

  assert.ok(doc.includes('### Esito\n\nsì condizionato'))
  assert.ok(!doc.includes('si_condizionato'))
})

test('assessmentMarkdown scrive l’esito anche quando è non deciso', () => {
  assert.ok(build().includes('## Verdetto\n\n### Esito\n\nnon deciso'))
})

test('assessmentMarkdown lascia passare un verdetto fuori dai quattro senza rompere niente', () => {
  const doc = build({ verdict: { ...EMPTY_VERDICT, verdict: 'forse' } })

  assert.ok(doc.includes('### Esito\n\nforse'))
})

test('assessmentMarkdown omette il titolo di un campo del verdetto vuoto', () => {
  const doc = build({ verdict: { ...EMPTY_VERDICT, verdict_reason: '  ', next_step: 'richiamare' } })

  assert.ok(!doc.includes('### Motivo'))
  assert.ok(!doc.includes('### Condizione'))
  assert.ok(doc.includes('### Prossimo passo\n\nrichiamare'))
})

test('assessmentMarkdown rende `verify_by` come giorno civile', () => {
  const doc = build({ verdict: { ...EMPTY_VERDICT, verify_by: '2026-09-01' } })

  assert.ok(doc.includes('### Verificare entro\n\n01/09/2026'))
})

test('assessmentMarkdown su una scheda senza risposte dà intestazione e verdetto e nessun blocco', () => {
  const doc = build()

  assert.equal(doc.match(/^## /gm)?.length, 1)
  assert.ok(doc.includes('## Verdetto'))
})

test('assessmentMarkdown finisce con un solo ritorno a capo', () => {
  const doc = build({ answers: [answer('Contesto', 'Chi siete?', 'una web agency\n\n')] })

  assert.ok(doc.endsWith('\n'))
  assert.ok(!doc.endsWith('\n\n'))
})
