/**
 * I due stati di compilazione di una scheda, nell'ordine del vincolo `check` sulla tabella
 * (`0005_assessments_answers.sql:34`). Sono etichette descrittive e non gradini: una scheda chiusa
 * resta modificabile in tutto, verdetto compreso, e nessuno dei due valori impedisce nessuna
 * azione (D14). Nessun vincolo li lega a `verdict`, ed è quello che AC2 e AC3 chiedono.
 *
 * File puro, senza React e senza Supabase, così `npm test` lo copre senza riscrivere niente
 * (kb-0.md §7).
 *
 * Sta fuori da `verdict.ts` e non dentro: quel file tiene insieme i quattro valori e i cinque campi
 * perché sono lo stesso concetto, e lo stato di compilazione non è quel concetto. Metterli nello
 * stesso file sarebbe la prima delle scelte che ricostruiscono il legame che il database si è
 * rifiutato di scrivere.
 *
 * Nessuna mappa `valore → etichetta`: i due valori del database sono già le parole che compaiono
 * nell'interfaccia, come i cinque stati del cliente, e una tabella che ripete `bozza: 'bozza'`
 * sarebbe un secondo posto da tenere allineato senza guadagnarci niente.
 */

/**
 * I due valori sono costanti nominate e non letterali sparsi, e la revisione della 3.6 ha mostrato
 * perché: il pulsante li batteva a mano, quindi cambiarli qui lo avrebbe lasciato falso in silenzio.
 * Da qui in avanti il vocabolario si cambia in questo punto solo.
 */
export const COMPLETION_DRAFT = 'bozza'
export const COMPLETION_CLOSED = 'chiusa'

/** `as const` non è cosmetico: senza, il tipo si allarga a string[] e CompletionStatus non vale più niente. */
export const COMPLETION_STATUSES = [COMPLETION_DRAFT, COMPLETION_CLOSED] as const

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number]

const VALUES: ReadonlySet<string> = new Set(COMPLETION_STATUSES)

/**
 * Il server riceve dal browser lo stato di destinazione da scrivere nella colonna
 * `completion_status`. Qui non si normalizza niente — niente `trim()`, niente minuscole — perché
 * quel valore non lo scrive una persona: lo calcola `nextCompletionStatus` da quello che la scheda
 * vale adesso. Qualsiasi altra cosa è una richiesta che non doveva esistere, e si rifiuta
 * (kb-0.md §3).
 *
 * `chiuso` è lo stato del *cliente* e non passa di qui: il `check` di Postgres lo fermerebbe
 * comunque, ma da lì il messaggio arriva in inglese e parla di un vincolo invece di dire cosa fare.
 */
export function isCompletionStatus(value: unknown): value is CompletionStatus {
  return typeof value === 'string' && VALUES.has(value)
}

/**
 * Lo stato di destinazione: cosa si scrive premendo il pulsante su una scheda che vale `current`.
 *
 * Sta qui e non dentro il componente perché è l'unica decisione di questa story che, sbagliata,
 * scrive il dato sbagliato **senza dare nessun errore** — chiudere una scheda a chi ha chiesto di
 * riportarla in bozza (kb-0.md §7). Dentro il JSX era un ternario fuori dalla portata di `npm test`,
 * ed era uno di tre sullo stesso booleano, due dei quali orientati al contrario del terzo.
 *
 * Prende `string` e non `CompletionStatus` perché il valore arriva da `AssessmentRow`, dove lo
 * schema generato dice `string`: qualunque cosa non sia `chiusa` è una scheda che si può chiudere,
 * e il `check` della 0005 garantisce che non ci sia nessun terzo caso da rendere.
 */
export function nextCompletionStatus(current: string): CompletionStatus {
  return current === COMPLETION_CLOSED ? COMPLETION_DRAFT : COMPLETION_CLOSED
}
