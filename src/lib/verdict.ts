/**
 * Il vocabolario del verdetto: i quattro valori, le loro etichette, i cinque campi della card, e la
 * regola che decide se i due campi condizionali si vedono.
 *
 * File puro, senza React e senza Supabase, così `npm test` lo copre senza riscrivere niente
 * (kb-0.md §7). Per il cliente le stesse due cose stanno in due file — `client-status.ts` e
 * `client-fields.ts` — e qui stanno insieme perché la differenza è vera: lo stato è **uno dei
 * dodici** campi del cliente e i due elenchi non si parlano, mentre i quattro valori del verdetto
 * sono il dominio di uno dei cinque campi e tutti e cinque sono lo stesso concetto.
 */

import { normalizeTextValue } from './client-fields.ts'

/**
 * `as const` non è cosmetico: senza, il tipo si allarga a string[] e Verdict non vale più niente.
 *
 * **L'ordine è quello del vincolo `check`** (`0005_assessments_answers.sql:28`) e non un ordine di
 * merito: mettere `si` in testa perché sembra l'ordine naturale è il modo più facile di suggerire
 * un esito senza accorgersene, e il verdetto è sempre della persona (NFR7, D7).
 */
export const VERDICTS = ['si', 'si_condizionato', 'no', 'non_deciso'] as const

export type Verdict = (typeof VERDICTS)[number]

const VALUES: ReadonlySet<string> = new Set(VERDICTS)

/**
 * Il server riceve dal browser il valore da scrivere nella colonna `verdict`. Qui non si normalizza
 * niente — niente `trim()`, niente minuscole — perché quel valore non lo scrive una persona: lo
 * manda un `select` costruito su questo stesso elenco. Qualsiasi altra cosa è una richiesta che non
 * doveva esistere, e si rifiuta prima del database (kb-0.md §3). Il `check` di Postgres resta
 * l'ultima difesa e non la prima: da lì il messaggio arriva in inglese e parla di un vincolo.
 */
export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VALUES.has(value)
}

/**
 * Qui la mappa serve e per gli stati del cliente no, ed è la differenza da non saltare: nel
 * database c'è `si_condizionato`, a schermo va `sì condizionato`, con l'accento e senza trattino
 * basso.
 *
 * `Record<Verdict, string>` e non `Record<string, string>`: il giorno che un quinto valore entra
 * nel vincolo e non qui, il compilatore si ferma invece di mostrare una stringa grezza.
 */
export const VERDICT_LABELS: Record<Verdict, string> = {
  si: 'sì',
  si_condizionato: 'sì condizionato',
  no: 'no',
  non_deciso: 'non deciso',
}

/**
 * I cinque campi, nell'ordine delle colonne di `assessments`.
 *
 * `Esito` e non `Verdetto`: `Verdetto` è già il titolo della card, e un `<h2>` seguito da una
 * `<label>` con la stessa parola si legge come un difetto. Le due parole restano legate — il
 * glossario di `AGENTS.md` definisce il verdetto come «l'esito che la persona scrive» — ed è la
 * stessa parola che l'elenco userà per la sua colonna.
 *
 * `kind` decide **solo quale controllo si rende**, non se il campo si salva da solo: su questa
 * schermata si salva da solo tutto, ed è la decisione della 3.2 e della 3.3.
 */
export const VERDICT_FIELDS = [
  { key: 'verdict', label: 'Esito', kind: 'verdict' },
  { key: 'verdict_reason', label: 'Motivo', kind: 'long' },
  { key: 'condition_text', label: 'Condizione', kind: 'short' },
  { key: 'verify_by', label: 'Verificare entro', kind: 'date' },
  { key: 'next_step', label: 'Prossimo passo', kind: 'short' },
] as const

export type VerdictField = (typeof VERDICT_FIELDS)[number]
export type VerdictFieldKey = VerdictField['key']

const KEYS: ReadonlySet<string> = new Set(VERDICT_FIELDS.map((field) => field.key))

/**
 * L'azione riceve dal browser il nome della colonna da scrivere. Senza questo controllo diventa una
 * scrittura arbitraria su qualsiasi colonna della propria riga, `owner_id` e `total_questions`
 * compresi: la policy protegge le righe di un altro proprietario, non la colonna sbagliata sulla
 * propria (kb-0.md §3). È la stessa difesa di `isClientFieldKey`, e per lo stesso motivo.
 */
export function isVerdictFieldKey(value: unknown): value is VerdictFieldKey {
  return typeof value === 'string' && KEYS.has(value)
}

const CONDITIONAL: ReadonlySet<string> = new Set<VerdictFieldKey>(['condition_text', 'verify_by'])

/**
 * Le due chiavi che `showsCondition` governa. Stanno qui accanto a lei e non scritte in linea nel
 * JSX: quali due campi si nascondono e quando si nascondono sono la stessa decisione, e in due
 * posti divergerebbero.
 */
export function isConditionalField(key: VerdictFieldKey): boolean {
  return CONDITIONAL.has(key)
}

/**
 * Se la condizione e la data entro cui verificarla si vedono (decisione di Luca del 10 agosto 2026,
 * variante B′).
 *
 * Sta qui e non scritta in linea nel JSX perché è esattamente la logica che, sbagliata, non dà
 * nessun errore in nessuna delle due direzioni (kb-0.md §7): larga mostra due campi vuoti a chi non
 * li ha chiesti, che è rumore; stretta **nasconde un testo scritto da una persona**, che
 * ricomparirebbe solo nell'esportazione futura, mesi dopo, sotto un verdetto dove non significa più
 * niente.
 *
 * **I tre argomenti non vengono dalla stessa fonte, ed è deliberato:** `verdict` è quello vivo del
 * selettore, i due contenuti sono quelli salvati. Col verdetto salvato i due campi comparirebbero
 * tre secondi dopo la scelta, cioè un'attesa che durante una call si legge come uno strumento
 * rotto; coi contenuti vivi il campo sparirebbe sotto le dita mentre si cancella l'ultimo carattere
 * della condizione, che è il difetto peggiore dei due.
 *
 * Il vuoto è quello di `normalizeTextValue`, importato e non riscritto: è la stessa definizione con
 * cui il server decide che cosa scrivere, e senza di essa un campo riapparirebbe per uno spazio.
 */
export function showsCondition(
  verdict: string,
  conditionText: string | null,
  verifyBy: string | null,
): boolean {
  if (verdict === 'si_condizionato') return true

  return normalizeTextValue(conditionText) !== null || normalizeTextValue(verifyBy) !== null
}
