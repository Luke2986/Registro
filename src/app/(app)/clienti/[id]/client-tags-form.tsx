'use client'

import { startTransition, useEffect, useRef, useState } from 'react'

import { CLIENT_TAG_MAX_LENGTH } from '@/lib/client-tags'

import { addClientTag, removeClientTag, type ClientTagsState } from '../actions'

/**
 * Due messaggi e non uno. Il server distingue già «non è stato salvato» da «non è stato tolto»;
 * una rete caduta mentre si toglie un tag, annunciata come un salvataggio mancato, manderebbe a
 * cercare un salvataggio che nessuno aveva chiesto (kb-0.md §6: l'azione si chiama allo stesso
 * modo dal pulsante alla conferma, e anche all'errore).
 */
const UNREACHABLE = {
  add: 'Il tag non è stato salvato: il server non ha risposto. Riprova fra un momento.',
  remove: 'Il tag non è stato tolto: il server non ha risposto. Riprova fra un momento.',
}

/** Le due azioni condividono la firma: il parametro è quella, non una delle due implementazioni. */
type ClientTagAction = (previous: ClientTagsState, formData: FormData) => Promise<ClientTagsState>

/** Da quale delle due viene l'errore: quello di una rimozione non riguarda il campo di scrittura. */
type Scope = 'add' | 'remove'

const ID = 'campo-tags'
const SUGGESTIONS_ID = `${ID}-suggerimenti`
const HINT_ID = `${ID}-suggerimento`
const ERROR_ID = `${ID}-errore`

/**
 * I tag della scheda: i chip di adesso, il campo che ne aggiunge uno, la `×` che ne toglie uno.
 *
 * **Non è un sesto `kind` di ClientFieldForm, e quel file non si apre.** `useEditableField` è a
 * stringa da cima a fondo — `baseline: string`, `run(next: string)`, `dirty = value !== baseline`
 * — mentre qui il valore è un `text[]` e il gesto non è "cambia un valore e conferma" ma
 * "aggiungi una voce" e "togli una voce", cioè due scritture con due esiti. Infilarlo là dentro
 * vorrebbe dire piegare la macchina del campo per farle rappresentare una cosa che non è.
 *
 * Nessuna copia locale dei tag: i chip si rendono dalla proprietà, che dopo `revalidatePath`
 * arriva aggiornata. Uno stato locale da risincronizzare non esiste, quindi non esiste nemmeno
 * il difetto di un `baseline` che cambia e non si risincronizza.
 *
 * Nessun SaveIndicator: l'indicatore appartiene ai campi che si salvano da soli (D21). Qui la
 * conferma è il chip che compare.
 */
export function ClientTagsForm({
  clientId,
  tags,
  suggestions,
}: {
  clientId: string
  tags: string[]
  suggestions: string[]
}) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string; scope: Scope } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const alive = useRef(true)

  // Si rimette il fuoco solo se nel frattempo si è perso, e si perde davvero: il pulsante della
  // `×` sparisce insieme al chip, e `Aggiungi` sparisce insieme al testo che l'ha fatto
  // comparire. Se invece è già andato su un altro campo — si preme Invio e si passa subito a
  // Note — riportarlo indietro farebbe finire lì le battute successive, e darebbe un blur a una
  // textarea lasciata a metà.
  const restoreFocus = () => {
    const active = document.activeElement

    if (!active || active === document.body) input.current?.focus()
  }

  // Senza la pulizia, una risposta che arriva dopo lo smontaggio scrive stato su un componente
  // che non c'è più.
  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  /**
   * L'azione non passa da useActionState, per il motivo scritto in use-editable-field.ts: un
   * rifiuto della promessa — rete caduta, rilascio a metà — verrebbe rilanciato durante la resa
   * e risalirebbe al confine d'errore, che sostituirebbe l'intera scheda e porterebbe via
   * quello che c'è scritto negli altri campi (NFR1).
   *
   * startTransition e non una chiamata nuda: la scrittura rivalida scheda ed elenco, e quella
   * rivalidazione dev'essere un aggiornamento non urgente.
   */
  function write(action: ClientTagAction, tag: string, scope: Scope, onSuccess?: () => void) {
    // La guardia sta qui e non solo sull'invio, dalla revisione della Story 5.2. Fino all'11 agosto
    // 2026 il secondo clic lo fermava `disabled={pending}` sulla `×`; con `aria-busy` il pulsante
    // resta premibile, e `removeClientTag` legge l'array dei tag e lo riscrive intero — due
    // rimozioni in volo insieme leggono lo stesso elenco e la seconda rimette dentro il tag che la
    // prima aveva tolto. Questo file non passa da `useWrite`, quindi la sua guardia non lo copre.
    if (pending) return

    setError(null)
    setPending(true)

    const payload = new FormData()
    payload.set('client_id', clientId)
    payload.set('tag', tag)

    startTransition(() => {
      void action({}, payload)
        .catch(() => ({ error: UNREACHABLE[scope] }))
        .then((outcome) => {
          if (!alive.current) return

          setPending(false)
          setError(outcome.error ? { message: outcome.error, scope } : null)

          // Un valore rifiutato non sparisce mai: il campo si svuota solo quando il tag è
          // entrato davvero.
          if (!outcome.error) onSuccess?.()
        })
    })
  }

  // Suggerire un tag che il cliente ha già vuol dire invitare a un'operazione che non farà
  // niente.
  const available = suggestions.filter((it) => !tags.includes(it))
  // L'errore di una rimozione non descrive il campo di scrittura, che contiene un valore che non
  // c'entra, e non lo rende non valido: resta annunciato dal suo `role="alert"`, e basta.
  const failedAdding = error?.scope === 'add'
  const described = [HINT_ID, failedAdding ? ERROR_ID : null].filter((it) => it !== null).join(' ')

  return (
    <form
      className="field field--tags"
      onSubmit={(event) => {
        event.preventDefault()

        // Con l'Invio il tag entra, che è quello che serve mentre si è al telefono. Col campo
        // vuoto non parte nessuna scrittura: il server lo rifiuterebbe comunque, ma un errore
        // per un Invio a vuoto sarebbe rumore.
        if (pending || draft.trim().length === 0) return

        // Si svuota solo se nel frattempo non è stato scritto altro. Fra l'Invio e la risposta
        // passano centinaia di millisecondi, e chi detta i tag di seguito ha già cominciato il
        // secondo: uno `setDraft('')` incondizionato se lo porterebbe via. È la stessa guardia
        // di use-editable-field.ts, e il motivo per cui esiste è lo stesso.
        const sent = draft

        write(addClientTag, sent, 'add', () => {
          setDraft((current) => (current === sent ? '' : current))
          restoreFocus()
        })
      }}
    >
      <label className="label" htmlFor={ID}>
        Tag
      </label>

      {/* Prima cosa hai, poi come se ne aggiunge uno. */}
      {tags.length > 0 ? (
        <div className="tags">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {/* Il testo in un elemento suo: senza, un tag di 40 caratteri senza spazi non ha
                  dove andare a capo e porta la card a scorrere di lato sotto i 400px. */}
              <span className="tag__text">{tag}</span>
              {/* type="button": senza, l'invio implicito del form li farebbe partire tutti.
                  aria-label obbligatoria: un pulsante il cui unico contenuto è un segno non ha
                  nome (design-system.md §8). Togliere è reversibile, quindi nessuna conferma. */}
              <button
                type="button"
                className="tag__remove"
                aria-label={`Togli il tag ${tag}`}
                aria-busy={pending}
                /* Il pulsante che aveva il fuoco sparisce insieme al chip: da tastiera, senza
                   rimetterlo nel campo il Tab riparte da capo. `detail === 0` distingue il click
                   da tastiera da quello col dito, che invece aprirebbe la tastiera software a
                   ogni tag tolto. */
                onClick={(e) =>
                  write(removeClientTag, tag, 'remove', e.detail === 0 ? restoreFocus : undefined)
                }
              >
                <span aria-hidden="true">×</span>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="tags-add">
        {/* <datalist> e non una libreria di combobox: serve un elenco di parole che si restringe
            mentre si scrive, e l'elemento nativo lo fa. Sul tablet si comporta meglio di
            qualunque sostituto, che è la stessa ragione per cui il selettore dello stato non ha
            appearance: none.
            autoComplete="off" come ogni altro controllo: senza, i valori salvati dal browser
            competono con i suggerimenti veri. */}
        <input
          id={ID}
          ref={input}
          className="input"
          type="text"
          list={SUGGESTIONS_ID}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            // L'errore parla del valore di prima: lasciarlo acceso su un campo che si sta
            // correggendo vuol dire mettere del rosso su una cosa che non è più un errore.
            // Quello di una rimozione invece resta: la rimozione non è avvenuta, e correggere
            // il campo di scrittura non la rifà.
            setError((current) => (current?.scope === 'add' ? null : current))
          }}
          maxLength={CLIENT_TAG_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={failedAdding ? true : undefined}
          aria-describedby={described}
        />

        <datalist id={SUGGESTIONS_ID}>
          {available.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>

        {/* Compare solo quando c'è qualcosa da aggiungere: a riposo la scheda si legge, non si
            compila. È l'unica azione primaria del campo. */}
        {draft.trim().length > 0 ? (
          <button type="submit" className="btn btn--primary" aria-busy={pending}>
            {/* `Aggiunta…` e non `Salvataggio…`: l'azione si chiama allo stesso modo dal
                pulsante alla conferma (kb-0.md §6), e `Salvataggio…` è per giunta la parola
                dell'indicatore di salvataggio, che qui Task 3 vieta di proposito. */}
            {pending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        ) : null}
      </div>

      {/* La normalizzazione riscrive quello che è stato battuto, e una riscrittura silenziosa
          senza spiegazione si legge come un guasto. */}
      <p className="meta" id={HINT_ID}>
        Si salvano in minuscolo, così lo stesso tag non diventa tre cose diverse.
      </p>

      {error ? (
        <p className="field__error" role="alert" id={ERROR_ID}>
          {error.message}
        </p>
      ) : null}
    </form>
  )
}
