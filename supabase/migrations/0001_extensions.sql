-- 0001 estensioni
-- Ordine obbligato (database.md §7): estensioni, tabelle senza dipendenze, tabelle
-- dipendenti, trigger, policy.
--
-- gen_random_uuid() sta in pg_catalog da PostgreSQL 13: non serve installare nulla.
-- pg_trgm serve al solo indice di ricerca sul nome del cliente. Se un giorno non fosse
-- disponibile, si toglie quell'indice e la ricerca passa a ilike.

create extension if not exists pg_trgm with schema extensions;
