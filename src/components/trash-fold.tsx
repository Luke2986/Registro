/**
 * Il guscio del cestino, uguale nel questionario e nella scheda cliente.
 *
 * Esiste come componente e non come due copie perché la testa è identica nei due posti — titolo,
 * conteggio, freccia — e l'unica differenza è cosa c'è dentro. Duplicarla vorrebbe dire due
 * cestini che divergono alla prima modifica (kb-0.md §9).
 *
 * **Chiuso di default**, ed è la scelta che governa il resto: il cestino vuoto non compare
 * affatto, quindi una riga chiusa col suo numero è già la prova che dentro c'è qualcosa. Da
 * chiuso costa una riga in fondo a una pagina di ventitré domande; da aperto è la card scavata.
 *
 * `<details>` nativo e non uno stato React: il browser porta `aria-expanded`, il tasto invio e la
 * barra spaziatrice da sé, e i due chiamanti restano Server Component.
 */
export function TrashFold({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <details className="trash">
      <summary className="trash__summary">
        {/* A tratto e `currentColor` come le icone della navigazione (design-system.md §10). */}
        <svg
          className="trash__chevron"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
        <span className="trash__title">Cestino</span>
        {/* `data` porta il monospaziato: è un contatore, e i numeri del progetto stanno in mono
            (design-system.md §3). Letto ad alta voce diventa «Cestino 2», che è quello che è. */}
        <span className="trash__count data">{count}</span>
      </summary>

      <div className="trash__body">{children}</div>
    </details>
  )
}
