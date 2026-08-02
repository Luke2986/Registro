type ValidationResult = { ok: true; name: string } | { ok: false; message: string }

/**
 * Stessa condizione del vincolo sulla tabella, check (length(trim(name)) > 0): qui serve a
 * dare un messaggio leggibile, non a sostituire il vincolo, che resta l'ultima difesa.
 *
 * Ritorna il nome già ripulito, così il valore validato e il valore scritto sono lo stesso.
 */
export function validateClientName(raw: unknown): ValidationResult {
  const name = typeof raw === 'string' ? raw.trim() : ''

  if (name.length === 0) {
    return { ok: false, message: 'Scrivi il nome del cliente: è l’unico campo che serve.' }
  }

  return { ok: true, name }
}
