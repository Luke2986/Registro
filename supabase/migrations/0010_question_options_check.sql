-- 0010 vincolo sulle opzioni fuori dalla scelta singola
-- Reversibile: sì.
-- Come si annulla: alter table questions drop constraint questions_options_only_single_choice;
-- Cosa si perde: niente. Il vincolo sparisce, le righe restano: né l'aggiunta né
--   l'annullamento toccano un dato.
--
-- La metà lasciata aperta di proposito dalla 0009: quel file rifiuta la scelta singola senza
-- opzioni, questo rifiuta le opzioni su un tipo che non le usa. La decisione che mancava è
-- della Story 2.4, che introduce la riscrittura del tipo: via dalla scelta singola le opzioni
-- si azzerano sul server, e da qui in poi il database lo pretende. Senza, un bug
-- nell'azzeramento produrrebbe il dato sporco da cui question-item.tsx si difende: opzioni
-- annunciate a schermo per una domanda che in call non le offre.
--
-- `options is null` e non `array_length`: null è come il server scrive «niente opzioni» (D13),
-- e un array vuoto su un tipo che non le usa sarebbe comunque il dato ambiguo da rifiutare.
--
-- questions_single_choice_has_options non si tocca: la sua debolezza nota — array[''] passa,
-- conta gli elementi e non la sostanza — resta rimandata in deferred-work.md, perché
-- parseOptions è ancora l'unico percorso di scrittura delle opzioni e stringhe vuote non ne
-- emette mai.

alter table questions
  add constraint questions_options_only_single_choice
  check (answer_type = 'scelta_singola' or options is null);
