'use client'

import { useState } from 'react'

import { VerdictPill } from '@/components/verdict-pill'
import type { AssessmentVerdict } from '@/lib/types'
import { VERDICT_FIELDS, isConditionalField, showsCondition } from '@/lib/verdict'

import { VerdictField } from './verdict-field'

/**
 * Il verdetto, in fondo alla schermata: dopo l'ultimo blocco e sopra la barra ancorata, cioè dove
 * si arriva. Sta **dentro `SaveBoundary`**, quindi i suoi cinque campi si iscrivono allo stesso
 * registro delle ventiquattro risposte e la riga che li racconta resta una sola.
 *
 * **Nessun elemento `<form>`**, per la stessa ragione scritta in `answer-blocks.tsx`: un `<form>`
 * porterebbe l'invio implicito con Invio, cioè un ricaricamento che porta via quello che è stato
 * scritto. Qui la trappola morde più che sui blocchi, perché i controlli sono corti e un Invio ci
 * arriva davvero.
 *
 * **È un componente client e la specifica lo dava server**, ed è uno scostamento dichiarato,
 * deciso da Luca il 10 agosto 2026. Il motivo: la pillola dell'intestazione e i due campi
 * condizionali devono seguire il valore **vivo** del selettore, non quello sul server — altrimenti
 * scegliendo `sì condizionato` i due campi comparirebbero tre secondi dopo, che durante una call si
 * legge come uno strumento rotto. Uno stato vivo condiviso fra la pillola e i campi non può stare
 * in un componente server, e l'alternativa — un terzo file client che finiva per rendere anche
 * l'intestazione — lasciava la card server come guscio vuoto.
 *
 * **AC5 governa ogni scelta qui dentro:** nessun punteggio, nessun conteggio, nessuna frase che
 * commenti la scheda, nessun ordine che suggerisca un esito migliore di un altro. Il verdetto è
 * sempre della persona (NFR7, D7).
 */
export function VerdictCard({
  assessmentId,
  verdict,
}: {
  assessmentId: string
  verdict: AssessmentVerdict
}) {
  // Il valore vivo del selettore. Non si risincronizza col server, esattamente come `value` dentro
  // `useEditableField`, ed è voluto: il campo e la pillola devono raccontare la stessa cosa.
  const [live, setLive] = useState(verdict.verdict)

  // Le tre fonti sono diverse di proposito — il verdetto vivo, i due contenuti salvati — e il
  // perché sta scritto per esteso su `showsCondition`. In breve: coi contenuti vivi il campo
  // sparirebbe sotto le dita mentre si cancella l'ultimo carattere della condizione.
  const conditional = showsCondition(live, verdict.condition_text, verdict.verify_by)

  // **Comparsi una volta, restano per il resto della sessione**, e non è una comodità: smontarli
  // butta via il timer armato del campo accanto e toglie dal registro una voce che poteva essere in
  // stato `failed`, cioè fa dire alla barra «Salvato» su un testo che non è mai arrivato e non è
  // più a schermo. Bastava svuotare la condizione mentre la data aveva il timer armato, senza
  // toccare il verdetto (revisione del 10 agosto 2026, decisione di Luca).
  //
  // `showsCondition` decide quindi **se compaiono**, non se restano. La variante B′ resta alla
  // lettera al caricamento della schermata, che è dove decide davvero.
  const [everConditional, setEverConditional] = useState(conditional)

  if (conditional && !everConditional) setEverConditional(true)

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Verdetto</h2>
        <div className="card__actions">
          <VerdictPill verdict={live} />
        </div>
      </div>

      <div className="detail-grid">
        {VERDICT_FIELDS.map((field) =>
          isConditionalField(field.key) && !everConditional ? null : (
            <VerdictField
              key={field.key}
              assessmentId={assessmentId}
              field={field}
              value={verdict[field.key]}
              onVerdictChange={field.key === 'verdict' ? setLive : undefined}
            />
          ),
        )}
      </div>
    </section>
  )
}
