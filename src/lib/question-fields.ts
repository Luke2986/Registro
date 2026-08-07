// Import con estensione: modulo raggiunto da un test, la catena si legge in client-tags.ts:1.
import { INVISIBLE } from './validate-client-name.ts'

/**
 * I campi di una domanda del questionario: validazioni e limiti in un posto solo, perché la
 * Story 2.4 riuserà queste stesse funzioni per la riscrittura. Nessun React e nessun Supabase,
 * così ci si mette un test sopra senza impalcatura (kb-0.md §7).
 *
 * Il database non pone massimi di lunghezza: senza un limite qui un incolla accidentale
 * diventa una domanda. I massimi del seed sono 119 (testo), 166 (aiuto) e 25 (opzione):
 * 300/300/80 lasciano spazio senza diventare posti dove si scrive un paragrafo — una domanda
 * si legge ad alta voce in call, un'opzione è una voce di un elenco. Il tetto sul numero di
 * opzioni ferma l'altro incolla accidentale, quello di un documento intero riga per riga:
 * il seed arriva a 4, venti è largo (revisione 2.3, decisione di Luca del 7 agosto 2026).
 */
export const QUESTION_TEXT_MAX_LENGTH = 300
export const QUESTION_HELP_MAX_LENGTH = 300
export const QUESTION_OPTION_MAX_LENGTH = 80
export const QUESTION_OPTIONS_MAX_COUNT = 20

/**
 * Più severa del vincolo questions_text_not_blank (0009): il trim() di JavaScript toglie tutto
 * il whitespace Unicode, quello di Postgres solo spazi. Qui serve a dare un messaggio
 * leggibile, non a sostituire il vincolo, che resta l'ultima difesa.
 *
 * Ritorna il testo già ripulito, così il valore validato e il valore scritto sono lo stesso.
 * Il whitespace interno — invii compresi — collassa in uno spazio: la card rende il testo in
 * un <p> che i newline li collasserebbe comunque, e salvare quello che non si vede sarebbe
 * una divergenza che la Story 3.1 copierebbe nelle risposte (revisione 2.3).
 */
export function validateQuestionText(raw: unknown): { ok: true; text: string } | { ok: false; message: string } {
  const text = typeof raw === 'string' ? raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim() : ''

  if (text.length === 0) {
    return { ok: false, message: 'Scrivi il testo della domanda: senza, in call non c’è niente da chiedere.' }
  }

  if (text.length > QUESTION_TEXT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Il testo supera i ${QUESTION_TEXT_MAX_LENGTH} caratteri. Accorcialo: una domanda si legge ad alta voce, il contesto sta in «Cosa serve capire».`,
    }
  }

  return { ok: true, text }
}

/**
 * Il testo di aiuto è facoltativo: due domande su ventitré del seed non ce l'hanno. Vuoto o
 * soli invisibili tornano `null`, non stringa vuota: un valore non rilevato non si rappresenta
 * come un valore vuoto (D13, stessa regola di normalizeTextValue in people-actions.ts).
 */
export function validateHelpText(raw: unknown): { ok: true; helpText: string | null } | { ok: false; message: string } {
  const helpText = typeof raw === 'string' ? raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim() : ''

  if (helpText.length === 0) return { ok: true, helpText: null }

  if (helpText.length > QUESTION_HELP_MAX_LENGTH) {
    return {
      ok: false,
      message: `«Cosa serve capire» supera i ${QUESTION_HELP_MAX_LENGTH} caratteri. Accorcialo: orienta la domanda, non la risposta.`,
    }
  }

  return { ok: true, helpText }
}

/**
 * Le opzioni della scelta singola, una per riga. Il trim() di riga toglie anche il `\r`, quindi
 * i fine riga `\r\n` non richiedono un caso a parte.
 *
 * Nessuna deduplicazione e nessun avviso di doppione: due opzioni identiche sono un contenuto
 * strano, non un errore — la stessa lettura di block-card.tsx, e il software registra e mostra,
 * non decide (D14).
 */
export function parseOptions(raw: unknown): { ok: true; options: string[] } | { ok: false; message: string } {
  const lines = typeof raw === 'string' ? raw.split('\n') : []
  const options: string[] = []

  for (const [index, line] of lines.entries()) {
    const option = line.replace(INVISIBLE, '').trim()

    if (option.length === 0) continue

    if (option.length > QUESTION_OPTION_MAX_LENGTH) {
      // Il numero di riga: con molte opzioni «un'opzione» si cercherebbe a occhio.
      return {
        ok: false,
        message: `La riga ${index + 1} supera il limite di ${QUESTION_OPTION_MAX_LENGTH} caratteri. Accorciala: un’opzione è una voce di un elenco, non una frase.`,
      }
    }

    options.push(option)
  }

  if (options.length === 0) {
    return { ok: false, message: 'Elenca almeno una opzione, una per riga: una scelta singola senza opzioni non si può compilare.' }
  }

  if (options.length > QUESTION_OPTIONS_MAX_COUNT) {
    return {
      ok: false,
      message: `Le opzioni sono più di ${QUESTION_OPTIONS_MAX_COUNT}. Riducile: una scelta singola con troppe voci non si legge in call.`,
    }
  }

  return { ok: true, options }
}
