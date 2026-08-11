/**
 * Il documento markdown di una scheda. Puro, sotto test (kb-0.md §7).
 *
 * Due regole opposte: **quello che diventa un titolo va su una riga sola**, o un ritorno a capo
 * dentro una domanda spezza il titolo; **quello che diventa un blocco si scrive com'è**, perché è
 * il testo che Luca ha battuto.
 *
 * Nessun `questions` e nessun `questionnaires`: il testo della domanda e il titolo del blocco sono
 * copie dentro `answers` (database.md §3), e leggerle *è* AC4.
 */

import { groupAnswersByBlock } from './answer-groups.ts'
import { normalizeTextValue } from './client-fields.ts'
import { formatCallDate } from './format-date.ts'
import { isVerdict, VERDICT_FIELDS, VERDICT_LABELS, type VerdictFieldKey } from './verdict.ts'

/** Le sole tre colonne che il documento rende. */
export type MarkdownAnswer = { block_title: string; question_text: string; content: string | null }

export type MarkdownVerdict = {
  verdict: string
  verdict_reason: string | null
  condition_text: string | null
  verify_by: string | null
  next_step: string | null
}

export type MarkdownAssessment = {
  clientName: string
  callDate: string
  intervieweeName: string | null
  answers: readonly MarkdownAnswer[]
  verdict: MarkdownVerdict
}

const WHITESPACE_RUN = /\s+/g

/** La prima delle due regole: tutto ciò che sta su una riga per costruzione ci resta. */
function oneLine(raw: string): string {
  return raw.replace(WHITESPACE_RUN, ' ').trim()
}

/**
 * Un campo vuoto risponde stringa vuota e il chiamante lo omette, titolo compreso (decisione
 * dell'11 agosto 2026). Un `verdict` fuori dai quattro passa com'è, come già fa `VerdictPill`.
 */
function verdictText(key: VerdictFieldKey, verdict: MarkdownVerdict): string {
  if (key === 'verdict') {
    return isVerdict(verdict.verdict) ? VERDICT_LABELS[verdict.verdict] : verdict.verdict
  }

  const text = normalizeTextValue(verdict[key])

  if (text === null) return ''

  return key === 'verify_by' ? formatCallDate(text) : text
}

/**
 * Il cliente compare due volte di proposito: l'`# H1` è il titolo del documento, le righe sotto sono
 * l'intestazione che AC1 chiede alla lettera.
 *
 * I campi del verdetto prendono un `###` come le domande: `verdict_reason` è lungo, e un'etichetta
 * in grassetto in linea si spezzerebbe su un contenuto a più righe. La forma del file sta nel PRD §4.
 */
export function assessmentMarkdown(assessment: MarkdownAssessment): string {
  const client = oneLine(assessment.clientName)
  const interviewee = assessment.intervieweeName === null ? null : oneLine(assessment.intervieweeName)

  const header = [`**Cliente:** ${client}`, `**Data:** ${formatCallDate(assessment.callDate)}`]

  if (interviewee !== null) header.push(`**Interlocutore:** ${interviewee}`)

  const sections = [`# Prequalifica — ${client}`, header.join('\n')]

  // Già ordinate (`position` poi `id`): riordinare qui darebbe due sorgenti d'ordine.
  for (const group of groupAnswersByBlock(assessment.answers)) {
    sections.push(`## ${oneLine(group.title)}`)

    for (const answer of group.answers) {
      sections.push(`### ${oneLine(answer.question_text)}`)

      // Solo gli spazi ai bordi, o il documento accumula righe vuote: dentro resta com'è battuto.
      const content = normalizeTextValue(answer.content)

      if (content !== null) sections.push(content)
    }
  }

  sections.push('## Verdetto')

  for (const field of VERDICT_FIELDS) {
    const value = verdictText(field.key, assessment.verdict)

    if (value.length === 0) continue

    sections.push(`### ${field.label}`, value)
  }

  return `${sections.join('\n\n')}\n`
}
