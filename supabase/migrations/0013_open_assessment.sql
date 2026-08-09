-- 0013 apertura di una scheda di prequalifica
-- Reversibile: sì.
-- Come si annulla: drop function open_assessment(uuid, date, uuid);
-- Cosa si perde: niente di dati: le schede già aperte e le loro risposte restano.
--   Sparisce l'apertura di una scheda dall'interfaccia: si annulla insieme al codice
--   che la chiama (kb-0.md §10).
--
-- La creazione vive qui e non nel TypeScript per la stessa ragione della 0011 — PostgREST non
-- offre transazioni — ma il caso è più grave. Le scritture sono due: la riga di assessments e le
-- N righe di answers. Due chiamate separate con la rete che cade in mezzo lasciano una scheda
-- con total_questions a 23 e zero risposte, cioè una scheda irreparabile: total_questions non si
-- aggiorna mai (FR16) e le copie del testo andrebbero ricostruite da un questionario che intanto
-- può essere cambiato. Una funzione plpgsql è una transazione: o la scheda nasce intera, o non
-- nasce.
--
-- security invoker, come le tre della 0011: le policy della 0007 filtrano dentro la funzione
-- come in una query diretta, quindi un id altrui indovinato non trova niente. search_path vuoto
-- e nomi qualificati: la funzione non dipende da chi la chiama.
--
-- I due `return null` sulle precondizioni non sono il software che decide al posto della persona
-- (D14 parla degli stati del cliente): sono il software che dice la verità su una precondizione
-- che non c'è. Una scheda aperta su un questionario senza domande attive resterebbe a 0 per
-- sempre, perché total_questions non si aggiorna mai, e nessuna schermata potrebbe più ripararla.
--
-- I due `default null` non sono decorativi: dicono nella firma quello che il corpo già fa — la
-- data assente vale oggi, l'interlocutore assente è un interlocutore che non c'è (AC4) — e sono
-- ciò che rende i due parametri facoltativi nei tipi generati. Senza, il tipo li dichiara
-- obbligatori e non nulli, e passare «nessun interlocutore» chiederebbe un `as`, che è vietato.
create function open_assessment(
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

  -- Le sole attive: è il contrario del filtro assente sulla schermata del questionario, che le
  -- mostra tutte perché deve far vedere *se* una domanda è attiva.
  select count(*)
  into v_total
  from public.questions qq
  join public.question_blocks b on b.id = qq.block_id
  where b.questionnaire_id = v_questionnaire_id and qq.is_active;

  if v_total = 0 then
    return null;
  end if;

  -- Sette colonne e basta: verdict (non_deciso), completion_status (bozza), id, created_at e
  -- updated_at hanno i loro default e il loro trigger. Scriverli qui vorrebbe dire tenere due
  -- posti allineati a mano.
  --
  -- questionnaire_version copia la colonna e non un letterale 1: oggi vale 1 e nessuna scrittura
  -- la muove (D25), ma copiare la colonna è vero anche il giorno che qualcuno la muovesse.
  insert into public.assessments (
    owner_id, client_id, questionnaire_id, questionnaire_version,
    call_date, interviewee_id, total_questions
  )
  values (
    v_owner, p_client_id, v_questionnaire_id, v_version,
    coalesce(p_call_date, current_date), p_interviewee_id, v_total
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

  return v_assessment_id;
end $$;

-- Supabase concede execute anche ad anon per default: un punto d'ingresso che non serve a
-- nessuno non si lascia aperto. La RLS renderebbe comunque le chiamate anonime dei no-op, ma il
-- rifiuto esplicito (42501) è leggibile, il no-op silenzioso no.
revoke execute on function open_assessment(uuid, date, uuid) from public, anon;

grant execute on function open_assessment(uuid, date, uuid) to authenticated;
