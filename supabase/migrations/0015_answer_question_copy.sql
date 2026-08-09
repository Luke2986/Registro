-- 0015 la risposta copia anche il tipo, le opzioni e l'aiuto
-- Reversibile: sì nella struttura, no nei dati.
-- Come si annulla: prima la funzione, poi le colonne, e in quest'ordine — v. «L'ordine» qui sotto.
--   create or replace function open_assessment(...) -- il corpo intero di
--   0014_open_assessment_total.sql, che ricrea la funzione senza le tre colonne;
--   alter table public.answers drop column help_text;
--   alter table public.answers drop column options;
--   alter table public.answers drop column answer_type;
-- Cosa si perde: le tre copie di ogni risposta già scritta. Le schede restano, e con loro
--   il testo della domanda, il blocco, la posizione e il contenuto; sparisce il modo di
--   sapere con che controllo quella risposta era stata raccolta.
--
-- **L'ordine dell'annullamento, e perché non è quello che verrebbe da scrivere.** Verrebbe da
-- togliere prima le tre colonne e rimettere la funzione dopo, come si disfa un lavoro a ritroso.
-- Ma un `drop column` su una colonna citata **solo dentro un corpo plpgsql** non fallisce: i corpi
-- delle funzioni non sono tracciati come dipendenze, quindi Postgres lascia fare e non dice niente.
-- Il primo passo riuscirebbe in silenzio, e chi si fermasse lì — per un'interruzione, o perché il
-- secondo sembra facoltativo visto che il primo non ha protestato — resterebbe con lo schema
-- tornato indietro e questa funzione ancora installata: il primo `Apri scheda` fallirebbe con
-- `column "answer_type" of relation "answers" does not exist`, durante una call. Rimettendo prima
-- la funzione della 0014, invece, ogni passo lascia il database in uno stato che funziona. È la
-- stessa ragione per cui database.md §7 rifiuta il `cascade` nelle istruzioni di annullamento: un
-- annullamento che fallisce rumorosamente è migliore di uno che riesce a metà.
--
-- **Il problema che chiude.** `answers` copia dalla 0005 il testo della domanda, il titolo del
-- blocco e la posizione, e nient'altro. Il tipo di risposta, le opzioni della scelta singola e il
-- testo di aiuto non sono copiati, e servono tutti e tre alla schermata di compilazione: senza il
-- tipo non si sa che controllo disegnare, senza le opzioni una scelta singola non ha niente da
-- offrire, senza l'aiuto non c'è niente da mostrare sotto la domanda.
--
-- **Perché copie e non un innesto su `questions`.** Senza le copie la schermata deve risalire a
-- `questions` da `question_id`, e allora una domanda riscritta cambia la scheda vecchia sotto gli
-- occhi: una `scelta_singola` diventata `numero` rende una risposta come «sì, ma solo il primo
-- anno» dentro un campo numerico, cioè un contenuto che non si legge e non si corregge più. È la
-- categoria di guasto che la 0005 chiama «la scelta centrale dello schema» — la risposta resta
-- leggibile anche se la domanda cambia o sparisce — applicata a metà. E `question_id` è
-- `on delete set null`: il giorno che quella colonna è nulla, l'innesto non porta più niente.
--
-- **Adesso costa zero, e fra una scheda e mille no.** `answers` è vuota (contata il 9 agosto
-- 2026), quindi `not null` si dichiara senza default e senza riempimento. Con righe dentro
-- servirebbe un default, cioè un valore inventato che nessuno saprebbe più distinguere da uno
-- vero su una colonna che esiste per registrare la storia.
alter table public.answers
  -- Senza default: l'unica scrittura è `open_assessment`, e un default la lascerebbe sbagliare in
  -- silenzio. Il `not null` passa solo perché la tabella è vuota.
  --
  -- Senza `check`, e non è una dimenticanza: questa colonna copia e non valida. Il valore ha già
  -- superato il vincolo su `questions`, e ripeterlo qui vuol dire due insiemi da tenere allineati
  -- a mano — il giorno che divergono il rifiuto arriva dentro `open_assessment`, cioè una scheda
  -- che non si apre durante una call per una parola. Una copia che rifiuta la storia è peggio di
  -- una copia che la registra.
  add column answer_type text not null,
  -- Copiata verbatim, nessun vincolo che la leghi al tipo. La 0010 lega le due cose su
  -- `questions`, che è dove si scrive; qui si riceve.
  add column options text[],
  -- Nullabile: due domande su ventiquattro hanno l'aiuto vuoto, quindi il caso è vivo.
  add column help_text text;

-- Stesso corpo della 0014, con tre nomi in più nell'insert su `answers` e nella sua select. Il
-- commento della 0014 spiega perché ogni riga è com'è, e vale ancora per intero: la funzione è
-- nata da una revisione, e riscriverla da capo qui sarebbe il posto in cui una regressione entra
-- senza rumore.
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
  -- answer_type, options e help_text si copiano allo stesso modo e per la stessa ragione: quello
  -- che la scheda ha raccolto resta leggibile com'era anche quando la domanda viva è cambiata.
  --
  -- Nessun order by: l'ordine di una scheda lo porta position, non l'ordine d'inserimento, e
  -- tutte le righe nascono nella stessa transazione, quindi con lo stesso created_at.
  insert into public.answers (
    owner_id, assessment_id, question_id, question_text, block_title, position,
    answer_type, options, help_text
  )
  select v_owner, v_assessment_id, qq.id, qq.text, b.title, qq.position,
         qq.answer_type, qq.options, qq.help_text
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
