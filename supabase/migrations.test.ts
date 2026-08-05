import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Il soggetto è una cartella di file .sql, non un modulo: la funzione che legge la testata
// sta qui dentro invece che in src/lib, perché un modulo che solo il proprio test importa
// sarebbe codice che l'applicazione non raggiunge.
//
// Cosa NON verifica: che l'SQL di annullamento sia giusto. Nessun programma può saperlo.
// Quello lo legge una persona, ed è il motivo per cui la dichiarazione va scritta bene.

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations')

const REQUIRED_KEYS = ['Reversibile', 'Come si annulla', 'Cosa si perde'] as const
const ALLOWED_PREFIXES = ['sì', 'no'] as const

// La riga 0 è il titolo (`-- 000N nome`) e resta tale: la dichiarazione comincia sotto.
const FIRST_DECLARATION_LINE = 1

// Una chiave che occupa più righe si continua con `--` allineato (database.md §7): due spazi
// più della prosa, ed è quello che distingue la continuazione dal paragrafo che viene dopo.
const CONTINUATION = /^--\s{2,}\S/

// Il valore comincia con sì o con no come parola intera. Senza il confine finale «non si sa»
// e «nota:» passerebbero come no, cioè entrerebbe il «non lo so» che la dichiarazione esclude.
// Il confronto è in minuscolo e in NFC su entrambi i lati: «Sì» a inizio frase è l'ortografia
// naturale di chi legge database.md §7, e rifiutarla sembrerebbe un guasto dello strumento.
const ANSWER = new RegExp(`^(?:${ALLOWED_PREFIXES.join('|').normalize('NFC')})(?!\\p{L})`, 'u')

// Cerca un drop con cascade, non la parola isolata: `0001` scrive «Mai con cascade» dentro la
// propria dichiarazione, e il `[^;]*` è ciò che impedisce di leggerlo come una violazione.
const CASCADING_DROP = /\bdrop\b[^;]*\bcascade\b/i

type DeclarationKey = (typeof REQUIRED_KEYS)[number]
type DeclarationEntry = { key: DeclarationKey; value: string; line: number }

function parseDeclaration(source: string): DeclarationEntry[] {
  const entries: DeclarationEntry[] = []

  for (const [line, text] of source.split('\n').entries()) {
    if (line < FIRST_DECLARATION_LINE) continue

    const key = REQUIRED_KEYS.find((candidate) => text.startsWith(`-- ${candidate}:`))
    if (key !== undefined) {
      entries.push({ key, value: text.slice(`-- ${key}:`.length).trim(), line })
      continue
    }

    // Fuori da una continuazione la dichiarazione è finita: quello che viene dopo è prosa,
    // e una chiave che ricomparisse là sotto non appartiene più al blocco.
    const open = entries.at(-1)
    if (open === undefined || !CONTINUATION.test(text)) break

    open.value = `${open.value} ${text.slice(2).trim()}`
  }

  return entries
}

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort()

test('la cartella delle migrazioni contiene almeno un file', () => {
  // Senza questa, una cartella vuota o un percorso sbagliato passerebbero in silenzio:
  // zero file da controllare non è zero difetti, è nessun controllo.
  assert.ok(migrationFiles.length > 0, `nessun file .sql in ${MIGRATIONS_DIR}`)
})

for (const fileName of migrationFiles) {
  const entries = parseDeclaration(readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8'))
  const valueOf = (key: DeclarationKey) => entries.find((entry) => entry.key === key)?.value ?? ''

  test(`${fileName} porta le tre chiavi, di seguito, subito sotto il titolo`, () => {
    assert.deepEqual(
      entries.map((entry) => entry.key),
      [...REQUIRED_KEYS],
      `${fileName}: la dichiarazione di reversibilità manca, è incompleta, è fuori ordine, non sta sotto la riga del titolo o è interrotta da altra prosa (database.md §7)`,
    )
  })

  test(`${fileName} non lascia vuota nessuna delle tre chiavi`, () => {
    for (const entry of entries) {
      assert.notEqual(entry.value, '', `${fileName}: «${entry.key}» è presente ma vuota`)
    }
  })

  test(`${fileName} risponde sì o no in «Reversibile»`, () => {
    const reversibile = valueOf('Reversibile').toLowerCase().normalize('NFC')

    assert.ok(
      ANSWER.test(reversibile),
      `${fileName}: «Reversibile» deve cominciare con sì o con no come parola intera, non con «${reversibile}»`,
    )
  })

  test(`${fileName} non annulla con cascade`, () => {
    assert.ok(
      !CASCADING_DROP.test(valueOf('Come si annulla')),
      `${fileName}: «Come si annulla» usa cascade, che non fallisce e lascia righe orfane (D24)`,
    )
  })
}
