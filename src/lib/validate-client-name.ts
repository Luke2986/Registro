type ValidationResult = { ok: true; name: string } | { ok: false; message: string }

/**
 * Caratteri invisibili che né il `trim()` di JavaScript né il `trim()` di Postgres tolgono:
 * incollati da una pagina web passerebbero per un nome e produrrebbero una riga anonima
 * nell'elenco, cioè quello che l'obbligo del nome esiste per evitare (D13).
 */
const INVISIBLE = /[​-‍⁠﻿]/g

/** Il database non pone un massimo: senza un limite qui un incolla accidentale diventa un dato. */
export const CLIENT_NAME_MAX_LENGTH = 200

/**
 * Stessa condizione del vincolo sulla tabella, check (length(trim(name)) > 0): qui serve a
 * dare un messaggio leggibile, non a sostituire il vincolo, che resta l'ultima difesa.
 *
 * Ritorna il nome già ripulito, così il valore validato e il valore scritto sono lo stesso.
 */
export function validateClientName(raw: unknown): ValidationResult {
  const name = typeof raw === 'string' ? raw.replace(INVISIBLE, '').trim() : ''

  if (name.length === 0) {
    return { ok: false, message: 'Scrivi il nome del cliente: è l’unico campo che serve.' }
  }

  if (name.length > CLIENT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Il nome supera i ${CLIENT_NAME_MAX_LENGTH} caratteri. Accorcialo: il resto si scrive nelle note.`,
    }
  }

  return { ok: true, name }
}

/**
 * Forma di confronto, mai forma da salvare: serve solo a riconoscere che due nomi sono lo
 * stesso cliente scritto in due modi. Il nome resta memorizzato come è stato digitato, perché
 * riscrivere in silenzio quello che ha battuto una persona è peggio del doppione che evita.
 */
export function normalizeClientName(name: string): string {
  return name.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('it')
}
