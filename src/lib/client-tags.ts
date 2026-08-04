import { INVISIBLE } from './validate-client-name'

/**
 * Le regole dei tag: come si scrivono, quanto sono lunghi, quali si suggeriscono.
 *
 * File puro, senza React e senza Supabase, così la Story 1.6 può metterci un test sopra senza
 * riscrivere niente (kb-0.md §7). È lo stesso patto di client-fields.ts e client-status.ts.
 *
 * Nessuna mappa `valore → etichetta` e nessun elenco di tag ammessi: i tag sono liberi e li
 * scrive Luca. Un vocabolario chiuso sarebbe l'opposto di D17.
 */

/**
 * Il database non pone un massimo: senza un limite qui un incolla accidentale diventa un dato,
 * come per il nome del cliente. Quaranta è la misura oltre la quale il tag non è più
 * un'etichetta leggibile a 12px accanto alle altre nella colonna dell'elenco: è una frase, e
 * quella si scrive nelle note.
 */
export const CLIENT_TAG_MAX_LENGTH = 40

/**
 * Tetto di guardia per il valore che arriva a `removeClientTag`, non il limite di un tag.
 * Quello è CLIENT_TAG_MAX_LENGTH e vale in scrittura: qui un tetto stretto impedirebbe di
 * togliere un tag scritto prima che il limite esistesse, che è il motivo per cui la rimozione
 * non normalizza. Serve solo a non far girare una lettura e un filtro su un valore inventato,
 * perché ogni input si valida sul server, cancellazioni comprese (kb-0.md §3).
 */
export const CLIENT_TAG_REMOVE_MAX_LENGTH = 1000

/**
 * Forma da salvare, non forma di confronto: qui il minuscolo è il dato, ed è tutto il punto
 * di D17. Senza, la stessa etichetta diventa referral, Referral e referrals in tre mesi.
 *
 * `toLocaleLowerCase('it')` e non `toLowerCase()`, come in normalizeClientName: su testo
 * italiano un minuscolo dipendente dalla locale è quello che serve.
 */
export function normalizeTag(raw: string): string {
  return raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('it')
}

export type TagResult = { ok: true; value: string } | { ok: false; message: string }

/**
 * Union discriminata come EmployeesResult, non un oggetto con campi opzionali: con
 * `{ ok?, value?, message? }` esistono combinazioni impossibili e prima o poi il codice ne
 * rende una.
 *
 * Ritorna il tag già normalizzato, così il valore validato e il valore scritto sono lo stesso.
 * Il `maxLength` dell'input serve a chi scrive, non alla sicurezza: questa funzione gira sul
 * server prima di comporre qualsiasi cosa (kb-0.md §3).
 */
export function parseTag(raw: unknown): TagResult {
  const value = typeof raw === 'string' ? normalizeTag(raw) : ''

  if (value.length === 0) return { ok: false, message: 'Scrivi il tag prima di aggiungerlo.' }

  // Nell'elenco i tag di un cliente si leggono uniti dalla virgola (clienti/page.tsx): un
  // singolo tag `referral, urgente` là dentro si legge esattamente come due tag distinti, cioè
  // la stessa ambiguità che D17 esiste per chiudere, presa dal lato opposto. Si rifiuta qui,
  // all'origine, invece che cambiare il separatore a valle. Prima del limite di lunghezza: una
  // frase incollata che contiene virgole quasi sempre è più di un tag, e dirlo è più utile che
  // dire che è lunga.
  if (value.includes(',')) {
    return { ok: false, message: 'Un tag non contiene virgole. Scrivine uno per volta.' }
  }

  // Misurato sul normalizzato e non sul grezzo: gli spazi tolti non devono far rifiutare un
  // tag che ci sta.
  if (value.length > CLIENT_TAG_MAX_LENGTH) {
    return {
      ok: false,
      message: `Il tag supera i ${CLIENT_TAG_MAX_LENGTH} caratteri. Accorcialo: il resto si scrive nelle note.`,
    }
  }

  return { ok: true, value }
}

/**
 * I tag già in uso, per il campo che li suggerisce (AC1). Appiattisce, toglie i doppioni,
 * ordina con la locale italiana: senza localeCompare gli accenti finirebbero in coda
 * all'alfabeto invece che accanto alla lettera senza accento.
 *
 * Prende `readonly { tags: string[] }[]` e non `ClientRow[]`: ha bisogno di una colonna sola,
 * e chiedere la riga intera legherebbe un modulo puro allo schema.
 */
export function collectTagSuggestions(rows: readonly { tags: string[] }[]): string[] {
  const seen = new Set<string>()

  for (const row of rows) {
    for (const tag of row.tags) seen.add(tag)
  }

  return [...seen].sort((a, b) => a.localeCompare(b, 'it'))
}
