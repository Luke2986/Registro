-- Dati iniziali: il questionario di prequalifica, versione 1 (D19).
-- Contenuto identico a docs/01-fase-1-prequalifica.md: venti domande in sette blocchi,
-- più tre condizionali sopra le 50 persone o quando l'interlocutore non è il titolare.
--
-- Nessun dato finto di clienti: questo file contiene solo il questionario.
--
-- Si esegue dopo il primo accesso, perché ogni riga deve portare il proprio owner_id.
-- È idempotente: se un questionario esiste già per quell'utente, non tocca niente.
--
-- position è il numero della domanda nel questionario intero, non dentro il blocco:
-- è lo stesso numero che le risposte copiano per tenere l'ordine della scheda.

do $$
declare
  v_owner         uuid;
  v_questionnaire uuid;
  v_block         uuid;
begin
  select id into v_owner from auth.users order by created_at limit 1;

  if v_owner is null then
    raise notice 'Nessun utente ancora: fai il primo accesso, poi riesegui questo seed.';
    return;
  end if;

  if exists (select 1 from questionnaires where owner_id = v_owner) then
    raise notice 'Questionario già presente: nessuna modifica.';
    return;
  end if;

  insert into questionnaires (owner_id, name, version, is_active)
  values (v_owner, 'Prequalifica', 1, true)
  returning id into v_questionnaire;

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Contesto', 1) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Raccontami in due minuti cosa fate e a chi lo vendete.',
     'Il mestiere, e se l''azienda sa descrivere il proprio cliente oltre al proprio prodotto.',
     'testo_lungo', 1),
    (v_block,
     'Quante persone siete e come vi dividete il lavoro?',
     'La dimensione reale e se esiste qualcuno che potrà seguire il lavoro dall''interno.',
     'testo_lungo', 2),
    (v_block,
     'Su quali strumenti gira il lavoro oggi? Gestionale, CRM, fogli, cos''altro.',
     'Dove vivono i dati e quanto è strutturato il sistema informativo.',
     'testo_lungo', 3);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Obiettivo', 2) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Fra dodici mesi, cosa dev''essere diverso perché tu dica che è andata bene?',
     'Il traguardo di business (fatturato, margine, tempo, nuovi mercati), non la tecnologia. Se la risposta è uno strumento, riformula: quel risultato a cosa serve.',
     'testo_lungo', 4),
    (v_block,
     'Quel risultato, tradotto in numeri, quanto vale?',
     'Se l''obiettivo è misurabile, perché è la stessa cosa che a fine progetto permette di dimostrare qualcosa.',
     'testo_breve', 5),
    (v_block,
     'È un obiettivo condiviso in azienda o è tuo? Chi altro ce l''ha in testa?',
     'Se il progetto esiste solo nella stanza in cui stai parlando.',
     'testo_lungo', 6);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Costo di restare come si è', 3) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Se fra dodici mesi tutto resta esattamente com''è oggi, cosa succede?',
     'Il costo dello status quo, che è la differenza fra un problema e una curiosità.',
     'testo_lungo', 7),
    (v_block,
     'Cosa avete già provato per risolverlo, e com''è andata?',
     'Consulenti precedenti, strumenti comprati e mai usati, tentativi interni. E a chi è stata attribuita la responsabilità.',
     'testo_lungo', 8),
    (v_block,
     'Cosa vi ha fatto cercare qualcuno adesso, e non sei mesi fa?',
     'L''evento che ha messo in moto la cosa. Se non ce n''è uno, il progetto non ha una spinta propria.',
     'testo_lungo', 9);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Dove si rompe', 4) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, options, position) values
    (v_block,
     'Il problema è che non arrivano abbastanza clienti, oppure che quelli che arrivano fate fatica a servirli come vorreste?',
     'È la domanda che indirizza tutto il lavoro a valle. Se la risposta è "tutte e due", chiedi quale delle due toglie il sonno.',
     'scelta_singola',
     array['manca domanda','manca capacità di erogare','entrambe','non chiaro'],
     10);

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Quali sono le attività su cui si consuma più tempo di quanto valgano?',
     'I candidati alla mappatura della fase 2. Qui si raccolgono solo i nomi, non si mappa niente.',
     'testo_lungo', 11);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Conoscenza e misura', 5) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Quando entra una persona nuova, come impara a lavorare? C''è qualcosa di scritto o guarda come fanno gli altri?',
     'Se le procedure esistono fuori dalle teste delle persone. Determina quanto costa la fase 2 e quanto è delegabile qualsiasi cosa.',
     'testo_lungo', 12),
    (v_block,
     'Chi, in azienda, sa dire se un lavoro è fatto bene o male?',
     'Se esiste un criterio di qualità riconosciuto o se dipende dall''umore di chi comanda.',
     'testo_lungo', 13),
    (v_block,
     'Se domani si ammalasse la persona che sa più cose, cosa si fermerebbe?',
     'Dove è concentrato il sapere e quanto l''azienda dipende da una testa sola.',
     'testo_lungo', 14),
    (v_block,
     'Che numeri guardate oggi, e ogni quanto?',
     'Se esiste una base di partenza misurabile. Se non esiste, costruirla è parte del lavoro e va messa a preventivo.',
     'testo_lungo', 15);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Strumenti già in uso', 6) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Qualcuno in azienda usa già strumenti di intelligenza artificiale per lavorare? Chi, per cosa, con quali regole?',
     'Il punto di partenza reale, che quasi mai coincide con quello dichiarato dall''azienda, e se i dati stanno passando da qualche parte senza che nessuno lo abbia deciso.',
     'testo_lungo', 16);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Decisione, tempo, denaro', 7) returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Chi decide se questa cosa si fa? Oltre a te, chi deve dire sì?',
     'La catena decisionale reale.',
     'testo_lungo', 17),
    (v_block,
     'Su una cosa così avete già messo da parte un budget, o è da valutare?',
     'Se il denaro esiste. Non serve la cifra, serve sapere se c''è.',
     'testo_lungo', 18),
    (v_block,
     'Entro quando vorreste vedere il primo risultato?',
     'L''aspettativa temporale, e la distanza fra questa e la realtà del lavoro.',
     'testo_breve', 19),
    (v_block,
     'Chi seguirà il lavoro dall''interno, e quanto tempo può dedicarci a settimana?',
     'Se esiste un interlocutore che apre i file e risponde alle domande. Senza, qualsiasi audit si ferma dopo due settimane.',
     'testo_lungo', 20);

  insert into question_blocks (questionnaire_id, title, position)
  values (v_questionnaire, 'Solo sopra le 50 persone, o quando l''interlocutore non è il titolare', 8)
  returning id into v_block;

  insert into questions (block_id, text, help_text, answer_type, position) values
    (v_block,
     'Chi firma il contratto, e ha già firmato cose simili quest''anno?',
     'Vale per il blocco intero: se stai parlando con qualcuno che può portare la decisione a destinazione, e quanto è lungo il percorso.',
     'testo_lungo', 21),
    (v_block,
     'Chi può fermare il progetto anche se tu sei favorevole?',
     null,
     'testo_lungo', 22),
    (v_block,
     'Da quando dite sì a quando si parte davvero, di solito quanto passa?',
     null,
     'testo_breve', 23);

  raise notice 'Questionario di prequalifica caricato: 8 blocchi, 23 domande.';
end $$;
