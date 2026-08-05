-- 0001 estensioni
-- Reversibile: sì, ma solo dopo aver annullato 0002.
-- Come si annulla: drop extension pg_trgm;
--   Fallisce finché esiste clients_name_trgm_idx, che usa extensions.gin_trgm_ops.
--   Mai con cascade: toglierebbe quell'indice in silenzio.
-- Cosa si perde: niente di dati. La ricerca per nome tornerebbe a leggere la tabella
--   invece dell'indice: più lenta, mai sbagliata.
--
-- Ordine obbligato (database.md §7): estensioni, tabelle senza dipendenze, tabelle
-- dipendenti, trigger, policy.
--
-- gen_random_uuid() sta in pg_catalog da PostgreSQL 13: non serve installare nulla.
-- pg_trgm serve al solo indice di ricerca sul nome del cliente. Se un giorno non fosse
-- disponibile, si toglie quell'indice e la ricerca passa a ilike.

create extension if not exists pg_trgm with schema extensions;
