/**
 * I messaggi delle azioni delle persone, in un modulo che le due metà condividono.
 *
 * Non stanno dentro nessuno dei due file di azioni perché quelli hanno `'use server'` in testa e
 * da lì si esportano solo funzioni asincrone. Non si duplicano perché `PERSON_GONE` vale per
 * tutte e cinque, ed è la duplicazione silenziosa che kb-0.md §9 chiede di fermare.
 *
 * **Quattro regole valgono per tutte e cinque le azioni**, in `people-actions.ts` e in
 * `person-edit-actions.ts`.
 *
 * **Nessuna reindirizza.** Aggiungere o correggere una persona non porta da nessuna parte, e una
 * navigazione porterebbe via quello che è scritto negli altri campi (NFR1).
 *
 * **Nessuna scrive `updated_at`**: lo aggiorna il trigger people_set_updated_at.
 *
 * **Nessuna filtra a mano per `owner_id`**: le righe le filtrano le policy people_owner_all e
 * clients_owner_all. Un filtro a mano sarebbe ridondante e farebbe credere che sia lui a
 * proteggere (D20).
 *
 * **Nei log solo `code` e `message`.** Un nome, un'email e un numero di telefono sono dati
 * personali di una persona fisica: `details` conterrebbe i valori della riga (kb-0.md §3 e §4).
 */

export const PERSON_NOT_SAVED = 'La persona non è stata salvata. Riprova fra un momento.'
export const FIELD_NOT_SAVED = 'Il campo non è stato salvato. Riprova fra un momento.'
export const ROLES_NOT_SAVED = 'I ruoli non sono stati salvati. Riprova fra un momento.'
export const PRIMARY_NOT_CHANGED = 'Il contatto principale non è stato cambiato. Ricarica la pagina e riprova.'

/**
 * Il ramo in cui il precedente è già stato tolto e il nuovo non è stato messo: il contatto
 * principale **è** cambiato, da qualcuno a nessuno, e dire «non è stato cambiato» sarebbe falso.
 * Lo stato è legittimo — nessun vincolo pretende che un principale ci sia — ma va detto, perché
 * chi legge deve sapere che gliene manca uno.
 */
export const PRIMARY_CLEARED_ONLY =
  'Il contatto principale precedente è stato tolto, ma il nuovo non è stato messo. Ricarica la pagina e riprova.'

export const PERSON_NOT_REMOVED = 'La persona non è stata eliminata. Riprova fra un momento.'
export const CLIENT_GONE = 'Questa scheda non è più disponibile. Torna all’elenco.'
export const PERSON_GONE = 'Questa persona non è più disponibile. Ricarica la pagina.'

export const PERSON_NOT_RESTORED = 'La persona non è stata ripristinata. Riprova fra un momento.'
export const ARCHIVE_GONE = 'Questa voce del cestino non è più disponibile. Ricarica la pagina.'
