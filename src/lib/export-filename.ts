/**
 * Il nome del file di un'esportazione. Puro, sotto test (kb-0.md §7).
 *
 * Lo slug si costruisce con una **lista di ammessi** e mai togliendo i caratteri vietati: il nome
 * del cliente finisce dentro `Content-Disposition`, dove un `"` cambia il nome del file e un
 * `\r\n` inietta una seconda intestazione.
 */

/** NFD non decompone queste: senza la mappa `Ørsted` darebbe `rsted`, cioè scarterebbe la lettera. */
const TRANSLITERATED: Record<string, string> = {
  Ø: 'o',
  ø: 'o',
  Ł: 'l',
  ł: 'l',
  ß: 'ss',
  Æ: 'ae',
  æ: 'ae',
  Œ: 'oe',
  œ: 'oe',
  Ð: 'd',
  ð: 'd',
  Đ: 'd',
  đ: 'd',
  Þ: 'th',
  þ: 'th',
}

const TRANSLITERABLE = /[ØøŁłßÆæŒœÐðĐđÞþ]/g

/** I diacritici combinanti che NFD separa dalla lettera: via loro, `Società` resta `societa`. */
const COMBINING = /[\u0300-\u036F]/g

const NOT_ALLOWED = /[^a-z0-9]+/g

const EDGE_DASHES = /^-+|-+$/g

/** Senza, un nome di sola punteggiatura o non latino darebbe `-2026-08-10-prequalifica.md`. */
const FALLBACK = 'cliente'

function slug(raw: string): string {
  return raw
    .replace(TRANSLITERABLE, (char) => TRANSLITERATED[char] ?? char)
    .normalize('NFD')
    .replace(COMBINING, '')
    .toLowerCase()
    .replace(NOT_ALLOWED, '-')
    .replace(EDGE_DASHES, '')
}

/**
 * `callDate` è ISO e non `gg/mm/aaaa`, quindi la data si legge in due forme nello stesso oggetto:
 * una cartella di esportazioni si ordina per nome, e l'ISO è l'unica forma che rende quell'ordine
 * cronologico (decisione dell'11 agosto 2026).
 *
 * Nessun troncamento: 200 caratteri di nome più data e suffisso stanno sotto i 255 di ogni
 * filesystem, e troncare farebbe collidere due clienti che differiscono in coda.
 */
export function assessmentFileName(clientName: string, callDate: string): string {
  const parts = [slug(clientName) || FALLBACK, slug(callDate), 'prequalifica']

  return `${parts.filter((part) => part.length > 0).join('-')}.md`
}
