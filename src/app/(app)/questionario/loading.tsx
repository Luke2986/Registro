/**
 * I primi tre blocchi veri hanno tre domande ciascuno. Tre card e non otto: quello che sta sotto
 * la piega non serve a far sembrare la pagina piena, e `clienti/loading.tsx` mostra già cinque
 * righe per un archivio di qualsiasi dimensione.
 */
const BLOCKS = [1, 2, 3]
const QUESTIONS = [1, 2, 3]

/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6).
 *
 * Le altezze sono misurate sulla resa, non dedotte dal foglio di stile: il testo della domanda
 * viene 24, l'aiuto 16, la riga del tipo 22 — che è l'altezza del `.badge`, non i 16 della sua
 * riga di testo. È la lezione di `clienti/loading.tsx:22-37`, dove un rettangolo indovinato da 44
 * al posto di 48 faceva saltare la pagina di 26px.
 *
 * Gli stacchi non si riproducono a mano: le stesse `.question` e `.questions` del contenuto vero
 * portano già il divisorio, i 20 di padding e i 20 di margine. Un contenitore diverso qui vorrebbe
 * dire due misure da tenere d'accordo, e la seconda si scorda.
 *
 * L'intestazione porta il titolo vero e non uno scheletro sopra di lui: `Questionario` si sa già
 * prima di aver letto qualsiasi cosa.
 */
export default function QuestionnaireLoading() {
  return (
    <main className="main section--questionario">
      <header className="page-header">
        <h1 className="page-title">Questionario</h1>
      </header>

      {BLOCKS.map((block) => (
        <section className="card" key={block}>
          <div className="card__header">
            {/* 24, l'altezza di `.card__title`. I titoli veri stanno fra 73 e 113 di larghezza. */}
            <div className="skeleton" style={{ width: 96, height: 24 }} />
          </div>
          <ul className="questions">
            {QUESTIONS.map((question) => (
              <li className="question" key={question}>
                <div className="skeleton" style={{ width: '70%', height: 24 }} />
                <div className="skeleton" style={{ width: '90%', height: 16 }} />
                {/* 88: `testo lungo` viene 81 e `scelta singola` 95. */}
                <div className="skeleton" style={{ width: 88, height: 22 }} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
