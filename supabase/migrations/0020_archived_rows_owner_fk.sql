-- 0020 archived_rows.owner_id fa riferimento a auth.users, come le altre cinque
-- Reversibile: sì.
-- Come si annulla: alter table archived_rows drop constraint archived_rows_owner_id_fkey;
-- Cosa si perde: niente. Nessun dato: cade solo il vincolo.
--
-- `database.md` §6 dice che `owner_id` fa riferimento a `auth.users(id)`, e le cinque tabelle
-- con un `owner_id` proprio lo dichiarano tutte con `on delete cascade`. La 0018 ha creato
-- `archived_rows` senza: una svista, non una scelta, e va chiusa prima che diventi il precedente
-- da cui la prossima tabella copia.
--
-- Non è ridondante rispetto alla policy: la policy della 0018 impedisce di *scrivere* un
-- proprietario altrui, il vincolo impedisce di scriverne uno che non esiste affatto — e il
-- `cascade` fa sparire il cestino insieme all'utente, che è l'unica risposta coerente con le
-- altre cinque.

alter table archived_rows
  add constraint archived_rows_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;
