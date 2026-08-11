const ROWS = [1, 2, 3, 4, 5]

/**
 * Tre come i campi della barra a pieno regime. Il terzo — il tag — non si rende quando nessun
 * tag è in uso, quindi su un archivio senza tag lo scheletro ne mostra uno in più: si sceglie il
 * caso normale, perché da qui non si sa quali tag esistano senza fare la lettura che questo
 * scheletro sta aspettando.
 */
const FIELDS = ['nome', 'stato', 'tag']

/**
 * Scheletri della forma reale del contenuto, mai un cerchio che gira al centro
 * (design-system.md §6).
 */
export default function ClientsLoading() {
  return (
    <main className="main section--clienti">
      <header className="page-header">
        <h1 className="page-title">Clienti</h1>
      </header>
      <div className="card">
        {/* Lo scheletro della barra sta sopra quelli delle righe: senza, a ogni filtro la barra
            sparirebbe e ricomparirebbe, e la pagina salterebbe sotto le dita di chi ha appena
            cliccato. Un campo vero è alto 70, non 44: `.field` impila l'etichetta (18) sopra
            l'input (44) con 8 di stacco, e con `align-items: flex-end` è il figlio più alto a
            dare l'altezza della riga. Un rettangolo da 44 lasciava 26px di salto, cioè proprio
            quello che questo blocco esiste per togliere — quindi si impilano i due pezzi invece
            di indovinare un totale. */}
        <div className="filters">
          {FIELDS.map((field) => (
            <div key={field} className="field" style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div className="skeleton" style={{ width: 48, height: 18 }} />
              {/* 48, misurato reso e non dedotto dal foglio di stile. `min-height: 44` su
                  `.input` è un pavimento che il contenuto non tocca mai: l'`<input>` viene 46 e
                  il `<select>` 48. Con `align-items: flex-end` è il più alto a dare l'altezza
                  della riga, quindi è il 48 del selettore quello da riprodurre — se lo scheletro
                  usasse 46 la barra crescerebbe di 2px all'arrivo del contenuto. */}
              <div className="skeleton" style={{ height: 48 }} />
            </div>
          ))}
          <div className="skeleton" style={{ flexShrink: 0, width: 88, height: 40 }} />
        </div>

        {/* Cinque tracce come le colonne, altezza 56 come `.table td`. Il quinto rettangolo è 68,
            misurato sulle pillole rese: la più corta viene 34, la più lunga 104,2.

            `.table-scroll` è lo stesso contenitore della tabella: a 375px la riga chiede 364 e ne
            restano 295, quindi senza traboccherebbe dove il contenuto invece scorre. */}
        <div className="table-scroll">
          {ROWS.map((row) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                gap: 16,
                alignItems: 'center',
                height: 56,
              }}
            >
              <div className="skeleton" style={{ width: '60%' }} />
              <div className="skeleton" style={{ width: 72 }} />
              <div className="skeleton" style={{ width: 96 }} />
              <div className="skeleton" style={{ width: 64 }} />
              <div className="skeleton" style={{ width: 68 }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
