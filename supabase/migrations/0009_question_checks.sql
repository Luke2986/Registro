-- 0009 vincoli sulle domande
-- Reversibile: sì.
-- Come si annulla: alter table questions drop constraint questions_single_choice_has_options;
--   alter table questions drop constraint questions_text_not_blank;
-- Cosa si perde: niente. I vincoli spariscono, le righe restano: né l'aggiunta né
--   l'annullamento toccano un dato.
--
-- La seconda metà della voce rimandata dalla revisione della Story 2.1: questions.text era
-- not null ma accettava la stringa vuota, e una domanda vuota sarebbe una riga anonima con
-- solo il badge sotto. La prima metà l'ha chiusa la 0008 su question_blocks.title.
--
-- Il secondo vincolo copre una direzione sola, ed è voluto: rifiuta la scelta singola senza
-- opzioni, non le opzioni su un tipo che non le usa. Lo schema non lega le due colonne in
-- quel verso, e legarle adesso vorrebbe dire decidere per la Story 2.4 cosa succede
-- riscrivendo il tipo di una domanda che ha opzioni.
--
-- coalesce(array_length(options, 1), 0): array_length su un array vuoto risponde null,
-- non 0, e senza il coalesce un '{}' passerebbe.

alter table questions
  add constraint questions_text_not_blank check (length(trim(text)) > 0);

alter table questions
  add constraint questions_single_choice_has_options
  check (answer_type <> 'scelta_singola' or coalesce(array_length(options, 1), 0) > 0);
