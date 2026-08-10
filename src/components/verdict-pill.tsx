import { VERDICT_LABELS, isVerdict } from '@/lib/verdict'
import type { Verdict } from '@/lib/verdict'

/**
 * **Nessun punto di 6px, a differenza della pillola di stato.** Il punto serve là perché il fondo è
 * uguale per tutti e cinque gli stati, che sono descrittivi e non gerarchici. Qui gli esiti *sono*
 * diversi fra loro, e vale la regola non superata di `design-system.md` §5: fondo nella tinta
 * chiara, testo nel colore pieno. L'etichetta accanto al colore non è decorazione — è AC4 e UX-DR2,
 * «il colore non è mai l'unico portatore di significato».
 *
 * Sta in `src/components/` e non dentro la cartella della rotta perché la card del cliente e
 * l'elenco la renderanno: è lo stesso motivo per cui `StatusPill` sta lì.
 *
 * La mappa è `Record<Verdict, string>` e non `Record<string, string>`: il giorno che un valore entra
 * nell'elenco e non qui, il compilatore si ferma invece di lasciarlo neutro in silenzio.
 *
 * `non_deciso` **non ha modificatore, e non è una dimenticanza**: il caso base di `.pill` è già
 * fondo `--neutral-tint` e testo `--ink-muted`, che è 6,37:1 — mentre il neutro pieno starebbe a
 * 3,02:1, il peggiore dei quattro. Il quarto contrasto si chiude non aggiungendo niente.
 */
const MODIFIER: Record<Verdict, string> = {
  si: ' pill--verdetto-si',
  si_condizionato: ' pill--verdetto-condizionato',
  no: ' pill--verdetto-no',
  non_deciso: '',
}

/**
 * La proprietà resta `string` perché `AssessmentRow['verdict']` è `string` nei tipi generati dallo
 * schema, e quei tipi non si modificano a mano. Il restringimento avviene qui: un verdetto
 * sconosciuto si mostra neutro invece di rompere la pagina.
 */
export function VerdictPill({ verdict }: { verdict: string }) {
  if (!isVerdict(verdict)) return <span className="pill">{verdict}</span>

  return <span className={`pill${MODIFIER[verdict]}`}>{VERDICT_LABELS[verdict]}</span>
}
