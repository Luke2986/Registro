'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import { createSaveStore, type SaveStore } from '@/lib/save-store'

import { SaveBar } from './save-bar'

/**
 * Il confine che tiene insieme i ventiquattro campi e la riga sola che li racconta.
 *
 * **Il valore del contesto è il registro e non cambia mai identità**, ed è il motivo per cui
 * questa schermata usa un registro esterno invece di tenere gli stati in un `useState` qui dentro:
 * un valore di contesto che cambia a ogni battuta fa rendere di nuovo *tutti e ventiquattro* i
 * campi che lo consumano, mentre così ne rende uno solo — quello in cui si sta scrivendo — e la
 * barra solo quando la riga da mostrare cambia davvero.
 *
 * Quello che questo confine **non** protegge, e va detto perché la prima stesura del commento
 * diceva il contrario: i blocchi arrivano come `children` da un componente server, ma la loro
 * identità è stabile solo finché a rendere di nuovo è questo componente — che non lo fa mai, avendo
 * per stato il solo registro. Nel caso che succede davvero, cioè il payload che torna dopo la
 * `revalidatePath` di ogni salvataggio, `children` è un albero nuovo e tutti e ventiquattro i campi
 * si rendono di nuovo comunque. Il guadagno del registro è l'altro, ed è quello che conta durante
 * la digitazione: fra un salvataggio e l'altro nessuno rende niente per colpa del contesto.
 */
const SaveContext = createContext<SaveStore | null>(null)

export function SaveBoundary({ children }: { children: ReactNode }) {
  // Inizializzatore pigro e mai una chiamata nuda nel corpo, che ne farebbe uno nuovo per resa:
  // tutte le iscrizioni si perderebbero e la barra resterebbe ferma sul vuoto.
  const [store] = useState(createSaveStore)

  return (
    <SaveContext.Provider value={store}>
      {children}
      <SaveBar store={store} />
    </SaveContext.Provider>
  )
}

/**
 * L'accesso al registro che il campo usa per iscriversi. È un hook e non un secondo componente,
 * quindi «un componente per file» regge: pubblicare un contesto insieme al suo provider è il modo
 * normale di farlo.
 *
 * Il contesto nasce a `null` e non con un registro di riserva: un registro di riserva farebbe
 * funzionare un campo montato fuori dal confine, in silenzio e senza mai comparire nella barra.
 */
export function useAnswerSave(): SaveStore {
  const store = useContext(SaveContext)

  if (store === null) throw new Error('AnswerField va reso dentro SaveBoundary')

  return store
}
