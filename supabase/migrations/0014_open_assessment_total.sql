-- 0014 il totale di una scheda si ricava dalle righe scritte
-- Reversibile: sì.
-- Come si annulla: drop function open_assessment(uuid, date, uuid);
--   poi si riesegue per intero 0013_open_assessment.sql, che ricrea la versione precedente.
--   La 0013 dichiara `create function` e non `create or replace`, quindi il drop viene prima:
--   senza, la riesecuzione fallisce con «function already exists».
-- Cosa si perde: niente di dati. La funzione non legge e non tocca nessuna riga già scritta:
--   le schede aperte e le loro risposte restano come sono, con i totali che avevano. Tornando
--   indietro tornano i due difetti che questa migrazione chiude.
--
-- Due correzioni dalla revisione della Story 3.1 (9 agosto 2026), tutte e due dentro la stessa
-- funzione: si riapre una volta sola.
--
-- **1. `total_questions` veniva da un conteggio, non dalle righe scritte.** La 0013 contava le
-- domande attive in un'istruzione e le inseriva in un'altra. Una funzione plpgsql gira nella
-- transazione del chiamante, che è in read committed: ogni istruzione prende uno snapshot nuovo,
-- quindi le due potevano vedere due insiemi diversi di `questions`. Un `Disattiva` da una seconda
-- scheda del browser, in mezzo, faceva nascere una scheda con `total_questions` a 23 e ventidue
-- risposte — e quel numero non si aggiorna mai (FR16), quindi l'avanzamento avrebbe letto
-- «22 / 23» per sempre, su una scheda finita. La transazione chiudeva il buco della rete che
-- cade, non questo.
--
-- Il conteggio resta, ma serve solo alla precondizione: se non c'è nessuna domanda attiva la
-- scheda non si apre. Il numero che finisce nella colonna è invece `row_count` dell'insert delle
-- risposte, cioè le righe che sono state scritte davvero. Non è una difesa in più: è l'unica
-- forma in cui l'invariante «il denominatore è il numero di risposte» è vera per costruzione
-- invece che per coincidenza di due letture.
--
-- Il lock consultivo della 0012 non sarebbe bastato: `setQuestionActive` è un update PostgREST
-- diretto e quel lock non lo prende, quindi la coda a cui si accodano i riordini qui non esiste.
--
-- **2. `current_date` risolveva «oggi» in UTC.** Il ripiego della data si valutava nel `TimeZone`
-- della sessione, che su Supabase è UTC: una chiamata che ometteva la data fra mezzanotte e le
-- due di Roma scriveva ieri. È lo stesso difetto che `todayIsoDate()` e la prop `today` esistono
-- per impedire (D23), rifatto nell'unico punto che non dichiarava nessun fuso.
--
-- **Il fuso è ora scritto in due posti**, qui e in `src/lib/format-date.ts` (`TIME_ZONE`), e
-- devono restare uguali. È lo stesso patto già in vigore per la terna che sceglie il questionario
-- attivo, uguale a quella di `questionario/page.tsx`: una costante duplicata con un commento che
-- nomina l'altro sito costa meno di una funzione che non sa dire che giorno è quando la chiama
-- qualcuno che non è l'azione.
create or replace function open_assessment(
  p_client_id uuid,
  p_call_date date default null,
  p_interviewee_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid;
  v_questionnaire_id uuid;
  v_version integer;
  v_total integer;
  v_written integer;
  v_assessment_id uuid;
begin
  -- owner_id è not null senza default su tutte e due le tabelle, quindi chi inserisce deve
  -- saperlo. È la stessa condizione che le policy verificano in `with check`.
  v_owner := (select auth.uid());

  -- Non è ridondante con la policy: distingue «non mio o sparito» da un successo, e con la RLS
  -- i due casi arrivano identici — zero righe.
  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    return null;
  end if;

  -- Correttezza e non sicurezza, come lo `.eq('client_id', id)` della scheda: il selettore offre
  -- solo le persone di quel cliente, e una scheda che dichiara come interlocutore la persona di
  -- un altro cliente è un dato falso che nessuna schermata potrebbe più smentire.
  if p_interviewee_id is not null and not exists (
    select 1 from public.people p
    where p.id = p_interviewee_id and p.client_id = p_client_id
  ) then
    return null;
  end if;

  -- La terna è la stessa della schermata del questionario (questionario/page.tsx): is_active,
  -- order by created_at poi id, limit 1. Se le due scegliessero un questionario diverso, la
  -- scheda congelerebbe le domande di uno e la schermata mostrerebbe l'altro, e nessun errore
  -- lo direbbe. `questionnaires` non ha nessun vincolo che imponga un solo questionario attivo,
  -- e nemmeno `created_at` è unico: `id` chiude, arbitrario ma stabile.
  select q.id, q.version
  into v_questionnaire_id, v_version
  from public.questionnaires q
  where q.is_active
  order by q.created_at, q.id
  limit 1;

  if v_questionnaire_id is null then
    return null;
  end if;

  -- Solo la precondizione: una scheda aperta su un questionario senza domande attive resterebbe
  -- a 0 per sempre, e nessuna schermata potrebbe più ripararla. Il numero che finisce nella
  -- colonna non è questo — v. sotto.
  select count(*)
  into v_total
  from public.questions qq
  join public.question_blocks b on b.id = qq.block_id
  where b.questionnaire_id = v_questionnaire_id and qq.is_active;

  if v_total = 0 then
    return null;
  end if;

  -- Sette colonne e basta: verdict (non_deciso), completion_status (bozza), id, created_at e
  -- updated_at hanno i loro default e il loro trigger.
  --
  -- questionnaire_version copia la colonna e non un letterale 1: oggi vale 1 e nessuna scrittura
  -- la muove (D25), ma copiare la colonna è vero anche il giorno che qualcuno la muovesse.
  --
  -- total_questions entra qui col conteggio e viene corretto sotto se le righe scritte sono
  -- diverse: la colonna è not null, quindi un valore ci vuole, e nessuno vede l'intermedio
  -- perché siamo dentro una transazione.
  insert into public.assessments (
    owner_id, client_id, questionnaire_id, questionnaire_version,
    call_date, interviewee_id, total_questions
  )
  values (
    v_owner, p_client_id, v_questionnaire_id, v_version,
    coalesce(p_call_date, (pg_catalog.now() at time zone 'Europe/Rome')::date),
    p_interviewee_id, v_total
  )
  returning id into v_assessment_id;

  -- Nessun content: il default è null, ed è quello che serve — l'avanzamento si conta sulle
  -- righe che ce l'hanno.
  --
  -- position si copia verbatim, buchi compresi. Una domanda disattivata conserva la sua
  -- posizione (2.6), quindi le posizioni delle sole attive possono essere 1, 2, 4, … Non è un
  -- difetto e non si chiude: answers.position serve a *ordinare* la scheda, il conteggio è
  -- total_questions. Rinumerare qui produrrebbe una scheda i cui numeri non corrispondono più a
  -- nessuna domanda del questionario.
  --
  -- Nessun order by: l'ordine di una scheda lo porta position, non l'ordine d'inserimento, e
  -- tutte le righe nascono nella stessa transazione, quindi con lo stesso created_at.
  insert into public.answers (
    owner_id, assessment_id, question_id, question_text, block_title, position
  )
  select v_owner, v_assessment_id, qq.id, qq.text, b.title, qq.position
  from public.questions qq
  join public.question_blocks b on b.id = qq.block_id
  where b.questionnaire_id = v_questionnaire_id and qq.is_active;

  get diagnostics v_written = row_count;

  -- Zero righe vuol dire che le domande attive sono sparite fra il conteggio e questo insert.
  -- Qui non si può più `return null`: la riga della scheda è già inserita, e uscire la lascerebbe
  -- committata senza nessuna risposta, cioè proprio la scheda irreparabile. L'eccezione annulla
  -- la transazione. L'azione risponde «riprova», ed è la cosa giusta: al tentativo successivo la
  -- precondizione qui sopra scatta e il messaggio diventa quello esatto.
  if v_written = 0 then
    raise exception 'open_assessment: nessuna domanda attiva al momento della scrittura';
  end if;

  -- Il denominatore è il numero di risposte che esistono, non quello letto un istante prima.
  if v_written <> v_total then
    update public.assessments
    set total_questions = v_written
    where id = v_assessment_id;
  end if;

  return v_assessment_id;
end $$;

-- `create or replace` conserva i privilegi della 0013, quindi revoke e grant non si ripetono:
-- riscriverli qui vorrebbe dire tenere due posti allineati a mano per un effetto che non c'è.
