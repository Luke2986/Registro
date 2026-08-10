'use client'

import { useSyncExternalStore } from 'react'

import { SaveIndicator } from '@/components/save-indicator'
import { EMPTY_SUMMARY, type SaveStore } from '@/lib/save-store'

/**
 * La riga ancorata in fondo alla schermata di compilazione: l'elemento firma del prodotto, l'unica
 * cosa dell'interfaccia che ha il permesso di essere sempre visibile e mai silenziosa
 * (design-system.md §1 e §5).
 *
 * `SaveIndicator` si monta e non si tocca: ha già i tre stati esatti, nessuna spunta e nessun
 * avviso a comparsa. Qui cambia dove sta e chi lo pilota, non com'è fatto.
 *
 * Il terzo argomento è la fotografia sul server: la barra viene resa anche lì, perché sta dentro
 * un componente client, e senza `useSyncExternalStore` solleverebbe durante la resa.
 */
export function SaveBar({ store }: { store: SaveStore }) {
  const summary = useSyncExternalStore(store.subscribe, store.getSummary, () => EMPTY_SUMMARY)

  return (
    <div className="save-bar">
      <SaveIndicator state={summary.state} onRetry={store.retryFailed} />

      {/* Il comando esplicito è uno solo e sta qui: FR19 chiede che esista, non che ce ne sia uno
          per campo, e ventiquattro coppie di pulsanti che compaiono e spariscono mentre si parla
          al telefono sono il contrario di «non pensare mai al salvataggio». È l'unica azione
          primaria della schermata (UX-DR10).

          `onMouseDown` che trattiene il fuoco: senza, il clic fa uscire dal campo, l'uscita salva,
          e il clic salva di nuovo. È la ricetta già scritta come `keepFocus` sulla scheda cliente.
          Da tastiera i due possono comunque passare nella stessa manciata di millisecondi, e va
          bene: `save()` si difende con `!pending`, il registro filtra i pendenti, e nel caso
          peggiore la stessa scrittura parte due volte con lo stesso valore.

          Qui c'era scritto che costa «un `updated_at` mosso due volte e nient'altro», e dal 10
          agosto 2026 non è più vero: il trigger `answers_touch_assessment` della migrazione 0016 fa
          risalire ogni `update` di `answers.content` fino ad `assessments.updated_at`, e `saveAnswer`
          rivalida anche `/clienti` — quindi la scrittura di troppo riporta il cliente in cima
          all'elenco. Non è una perdita e l'ordine che ne esce non è sbagliato, perché su quel
          cliente si sta davvero lavorando; è che la scrittura di troppo non è più invisibile. La
          guardia che la eviterebbe è `attempted.current === value`, che manca a tutti e tre i
          percorsi che rimandano un testo già salvato — questo, l'uscita dal campo e il
          `visibilitychange` — e sta a ledger come una cosa sola, insieme alla via di database
          (`when (old.content is distinct from new.content)` sul trigger). */}
      <button
        type="button"
        className="btn btn--primary"
        disabled={summary.dirty === 0}
        onMouseDown={(event) => event.preventDefault()}
        onClick={store.saveDirty}
      >
        Salva
      </button>
    </div>
  )
}
