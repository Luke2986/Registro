// Import con estensione: modulo raggiunto da un test, la catena si legge in client-tags.ts:1.
import { INVISIBLE } from './validate-client-name.ts'

type ValidationResult = { ok: true; title: string } | { ok: false; message: string }

/**
 * Il database non pone un massimo: senza un limite qui un incolla accidentale diventa il titolo
 * di una card. Il titolo più lungo del seed è 68 caratteri, e 120 lascia spazio a un blocco
 * condizionale più esplicito senza diventare un posto dove si scrive un paragrafo.
 */
export const BLOCK_TITLE_MAX_LENGTH = 120

/**
 * Più severa del vincolo sulla tabella, check (length(trim(title)) > 0), aggiunto con la
 * migrazione 0008: il trim() di JavaScript toglie tutto il whitespace Unicode, quello di
 * Postgres solo spazi. Qui serve a dare un messaggio leggibile, non a sostituire il vincolo,
 * che resta l'ultima difesa.
 *
 * Ritorna il titolo già ripulito, così il valore validato e il valore scritto sono lo stesso.
 */
export function validateBlockTitle(raw: unknown): ValidationResult {
  const title = typeof raw === 'string' ? raw.replace(INVISIBLE, '').trim() : ''

  if (title.length === 0) {
    return { ok: false, message: 'Scrivi il titolo del blocco: senza, la card resta senza intestazione.' }
  }

  if (title.length > BLOCK_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Il titolo supera i ${BLOCK_TITLE_MAX_LENGTH} caratteri. Accorcialo: un titolo è un'intestazione, non un paragrafo.`,
    }
  }

  return { ok: true, title }
}
