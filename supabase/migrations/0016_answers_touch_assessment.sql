-- 0016 salvare una risposta sveglia la sua scheda
-- Reversibile: sì.
-- Come si annulla: drop trigger answers_touch_assessment on public.answers;
--   drop function public.touch_assessment_from_answer();
-- Cosa si perde: niente di dati. `assessments.updated_at` torna a non muoversi quando si salva una
--   risposta, quindi l'elenco clienti torna a non riordinarsi mentre si compila una scheda, e i
--   valori già scritti restano dove sono — nessuno li riporta indietro.
--
-- **Il problema che chiude.** `answers_set_updated_at` (0006) tocca la riga della **risposta**, e
-- niente risale alla scheda: su `answers` esiste un trigger solo e non guarda `assessments`.
-- L'elenco clienti ordina invece per l'ultima attività, che è «la più recente fra la modifica del
-- cliente e la modifica delle sue schede» (database.md §5, letta da `assessments.updated_at`).
-- Conseguenza, misurata con una sonda sui `ctid` e non dedotta: si compila una scheda per un'ora,
-- si torna all'elenco, e il cliente è dov'era.
--
-- **Perché `update of content` e non `insert or update`.** La colonna è quella e una sola.
-- `open_assessment` inserisce le ventiquattro righe di `answers` nella stessa transazione in cui
-- inserisce la scheda, quindi `assessments.updated_at` è già di quell'istante: un trigger
-- sull'`insert` produrrebbe ventiquattro riscritture della stessa riga per non cambiare niente.
-- `saveAnswer` fa `update({ content })` ed è l'unica scrittura che deve svegliare la scheda.
--
-- **Il valore scritto non conta, e va detto perché sembra un errore.** `assessments_set_updated_at`
-- è un trigger `before update` sulla stessa tabella (0006) e riscriverà comunque `updated_at =
-- now()`. Il `set` esiste perché un `update` senza `set` non è SQL valido, e il valore scelto è
-- esattamente quello che il trigger di prima metterebbe: così le due righe non possono divergere.
--
-- **`security invoker` e non `definer`**: le policy della §6 di database.md filtrano dentro il
-- trigger come fuori, e la riga di `assessments` da toccare è dello stesso proprietario della
-- risposta appena scritta — `open_assessment` scrive lo stesso `owner_id` su entrambe. Un `definer`
-- qui vorrebbe dire una funzione capace di toccare la scheda di chiunque, per un beneficio che non
-- esiste. Se i due proprietari non coincidessero l'`update` toccherebbe zero righe e basta, che è
-- il modo giusto di fallire.
--
-- `search_path` vuoto e nomi qualificati, come ogni funzione dalla 0006 in poi: la funzione non
-- dipende da chi la chiama.
--
-- Nessun `grant` e nessun `revoke`, come per `set_updated_at` della 0006: una funzione che
-- restituisce `trigger` non è chiamabile direttamente — Postgres rifiuta con «trigger functions can
-- only be called as triggers» — quindi non c'è nessun permesso da restringere.

create function public.touch_assessment_from_answer() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.assessments
     set updated_at = pg_catalog.now()
   where id = new.assessment_id;

  -- `null` e non `new`: il valore di ritorno di un trigger `after ... for each row` viene ignorato,
  -- e restituire `null` lo dichiara invece di far credere che la riga venga modificata.
  return null;
end $$;

create trigger answers_touch_assessment
  after update of content on public.answers
  for each row execute function public.touch_assessment_from_answer();
