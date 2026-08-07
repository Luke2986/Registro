-- 0008 titolo del blocco non vuoto
-- Reversibile: sì.
-- Come si annulla: alter table question_blocks drop constraint question_blocks_title_not_blank;
-- Cosa si perde: niente. Il vincolo sparisce, le righe restano: né l'aggiunta né
--   l'annullamento toccano un dato.
--
-- Stessa condizione che clients.name ha dal primo giorno: title era not null ma accettava la
-- stringa vuota, e un blocco senza titolo è una card senza intestazione che niente a schermo
-- denuncia. Il vincolo arriva con la story che introduce la scrittura dei blocchi (2.2), perché
-- kb-0.md §5 vuole la difesa nel database e non solo nella validazione applicativa.
-- questions.text ha lo stesso buco e lo chiudono le story che ne introducono la scrittura.

alter table question_blocks
  add constraint question_blocks_title_not_blank check (length(trim(title)) > 0);
