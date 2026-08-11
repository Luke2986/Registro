/**
 * La modalità della schermata del questionario: si agisce sul **contenuto** o sull'**ordine**.
 *
 * Nasce da un difetto di disposizione: cinque comandi per riga, per ventitré domande, in un
 * gruppo flessibile che una domanda lunga stringeva fino a mandare `Elimina` a capo. Due dei
 * cinque — le frecce — servono solo mentre si riordina, che è un momento raro e dichiarato.
 * Separarli toglie quasi metà dei comandi dal caso normale.
 *
 * **Sta nell'indirizzo e non in un cookie**, ed è la scelta che conta. Un cookie la farebbe
 * ritrovare accesa fra tre settimane, cioè il difetto tipico delle modalità: uno stato che si
 * dimentica di aver acceso. Nell'indirizzo invece esce dalla pagina con la pagina, si può
 * mettere fra i preferiti, e la schermata resta un Server Component — nessun `use client` per
 * tenere un booleano.
 *
 * Non è un divieto: nessuno stato blocca nessuna azione (D14). Le azioni non rese non sono
 * negate, sono altrove, a un clic di distanza — e la modalità è una vista, come lo è un filtro
 * dell'elenco clienti.
 */
export type QuestionnaireMode = 'content' | 'order'

/** In italiano come `nome`, `stato` e `tag` dell'elenco clienti: l'indirizzo lo legge una persona. */
export const MODE_PARAM = 'modo'
export const ORDER_VALUE = 'ordine'

type SearchParams = Record<string, string | string[] | undefined>

/**
 * Un valore che non esiste vale `content`, come uno stato ignoto vale «nessun filtro» in
 * `parseClientFilters`: un indirizzo scritto male non è un guasto e non ferma niente.
 */
export function parseQuestionnaireMode(params: SearchParams): QuestionnaireMode {
  const raw = params[MODE_PARAM]
  const value = Array.isArray(raw) ? raw[0] : raw

  return value === ORDER_VALUE ? 'order' : 'content'
}

/** L'indirizzo canonico di una modalità: `/questionario` è il contenuto, senza parametro. */
export function questionnaireHref(mode: QuestionnaireMode): string {
  return mode === 'order' ? `/questionario?${MODE_PARAM}=${ORDER_VALUE}` : '/questionario'
}
