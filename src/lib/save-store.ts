import type { SaveState } from '@/components/save-indicator'

/**
 * Il registro dei campi che salvano, e la regola con cui ventiquattro stati diventano una riga
 * sola. È l'unica macchina nuova della schermata di compilazione.
 *
 * File puro, senza React e senza Supabase, e non è un capriccio di struttura: sbagliando la
 * priorità, questa logica non dà nessun errore e produce **la bugia peggiore che questo prodotto
 * possa raccontare** — `Salvato alle 14:32` mentre una risposta non è stata scritta. `kb-0.md` §7
 * assegna i test automatici esattamente a questo.
 *
 * **Un registro esterno e non gli stati dentro un provider.** La strada ovvia — un contesto con
 * dentro un `useState` — rende di nuovo *tutti* i consumatori a ogni battuta, perché il valore del
 * contesto cambia identità. Con un registro creato una volta e mai sostituito il contesto è
 * immobile: chi scrive rende sé stesso, e la barra si iscrive a parte.
 *
 * L'unico import è `import type`, quindi cancellato prima dell'esecuzione: l'unione dei quattro
 * stati è dichiarata una volta sola, dove vive il componente che la rende.
 */

/** Quello che un campo pubblica al registro: come sta e come lo si fa salvare. */
export type SaveEntry = {
  state: SaveState
  dirty: boolean
  pending: boolean
  save: () => void
}

/** Quello che la barra legge: la riga da mostrare, e quanti campi si possono salvare adesso. */
export type SaveSummary = { state: SaveState; dirty: number }

/**
 * Un campo che ha qualcosa da salvare **e** può salvarlo adesso. Con una scrittura già in volo non
 * è nessuna delle due cose: `save()` si rifiuterebbe da sé, quindi contarlo accenderebbe il comando
 * esplicito su un lavoro che non può fare — un pulsante che non risponde e non dice perché. Il
 * predicato è uno solo perché il conteggio e il comando devono dire la stessa cosa: due punti
 * divergono. Quando la risposta arriva il campo torna salvabile, e premerlo scrive subito invece di
 * aspettare i tre secondi del timer.
 */
function savable(entry: SaveEntry): boolean {
  return entry.dirty && !entry.pending
}

const IDLE: SaveState = { kind: 'idle' }

/**
 * Il riassunto di una schermata senza campi. Serve come `getServerSnapshot` alla barra, che viene
 * resa anche sul server perché sta dentro un componente client: senza, `useSyncExternalStore`
 * solleva durante la resa. Congelata perché è condivisa e non deve poter cambiare sotto a nessuno.
 */
export const EMPTY_SUMMARY: SaveSummary = Object.freeze({ state: IDLE, dirty: 0 })

/**
 * La priorità, in quest'ordine e non in un altro:
 *
 * 1. **un solo `failed` vince su tutto.** Un fallimento nascosto sotto un `Salvato` è esattamente
 *    il difetto che l'indicatore esiste per impedire.
 * 2. altrimenti un `saving` qualsiasi.
 * 3. altrimenti il `saved` **più recente**: l'ora dell'ultimo salvataggio riuscito, non del primo.
 * 4. altrimenti `idle`, che è anche il caso dell'elenco vuoto.
 */
export function aggregateSaveState(states: Iterable<SaveState>): SaveState {
  let latest: Date | null = null
  let saving = false

  for (const state of states) {
    if (state.kind === 'failed') return { kind: 'failed' }

    if (state.kind === 'saving') saving = true

    if (state.kind === 'saved' && (latest === null || state.at > latest)) latest = state.at
  }

  if (saving) return { kind: 'saving' }

  return latest === null ? { kind: 'idle' } : { kind: 'saved', at: latest }
}

export type SaveStore = {
  subscribe: (listener: () => void) => () => void
  getSummary: () => SaveSummary
  set: (id: string, entry: SaveEntry) => void
  remove: (id: string) => void
  /** Il comando esplicito della barra: salva tutto quello che è cambiato. */
  saveDirty: () => void
  /** Il `Riprova` dell'indicatore: rimanda solo quello che non è passato. */
  retryFailed: () => void
}

export function createSaveStore(): SaveStore {
  const entries = new Map<string, SaveEntry>()
  const listeners = new Set<() => void>()

  // Il riassunto si tiene qui e si sostituisce solo quando cambia davvero: `useSyncExternalStore`
  // richiama `getSummary` a ogni resa e va in ciclo infinito se l'identità cambia ogni volta. È la
  // parte che rende la barra ferma mentre si scrive.
  let summary: SaveSummary = EMPTY_SUMMARY

  const recompute = () => {
    let dirty = 0
    const states: SaveState[] = []

    for (const entry of entries.values()) {
      if (savable(entry)) dirty += 1

      states.push(entry.state)
    }

    const next: SaveSummary = { state: aggregateSaveState(states), dirty }

    if (sameSummary(summary, next)) return

    summary = next

    for (const listener of listeners) listener()
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    getSummary: () => summary,
    set: (id, entry) => {
      entries.set(id, entry)
      recompute()
    },
    remove: (id) => {
      entries.delete(id)
      recompute()
    },
    // I due filtri stanno qui e non nella barra: sarebbe la stessa decisione presa in due punti, e
    // due punti divergono. Il primo è `savable`, lo stesso del conteggio.
    saveDirty: () => {
      for (const entry of entries.values()) {
        if (savable(entry)) entry.save()
      }
    },
    retryFailed: () => {
      for (const entry of entries.values()) {
        if (entry.state.kind === 'failed' && !entry.pending) entry.save()
      }
    },
  }
}

/** Due riassunti che si leggono uguali a schermo sono lo stesso riassunto. */
function sameSummary(a: SaveSummary, b: SaveSummary): boolean {
  if (a.dirty !== b.dirty || a.state.kind !== b.state.kind) return false

  // Solo `saved` porta un dato oltre al genere: se l'ora è la stessa, la riga è la stessa.
  if (a.state.kind === 'saved' && b.state.kind === 'saved') {
    return a.state.at.getTime() === b.state.at.getTime()
  }

  return true
}
