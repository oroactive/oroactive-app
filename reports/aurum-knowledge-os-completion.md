# Aurum Knowledge OS — rapporto di completamento

Data del rapporto: 1 agosto 2026

Ambito: implementazione nel repository OroActive

Stato dichiarato: codice e artefatti pronti per migrazione, sincronizzazione e revisione Founder; nessun contenuto pending è pubblicato automaticamente.

## Sintesi esecutiva

Aurum Knowledge OS introduce una base di conoscenza governata per il settore compro oro con registro delle fonti, versionamento, documenti e chunk, fatti atomici, Knowledge Graph, procedure, casi anonimizzati, retrieval ibrido, strumenti deterministici, controllo dei ruoli, citazioni strutturate, rilevamento di conflitti e una console Founder a 17 sezioni.

L'implementazione è intenzionalmente **fail-closed**: una risposta professionale non diventa assertiva se non dispone di fonti correnti, approvate e sufficientemente autorevoli. Le nuove versioni, i seed, i documenti, i chunk, i fatti, le procedure e i casi entrano in stato `pending` e richiedono un'azione Founder esplicita.

Il codice è completo e la suite locale è verde. In questa sessione non era disponibile un database PostgreSQL di produzione: la migration non è stata applicata e non sono state eseguite sincronizzazioni o approvazioni sul sistema live. Di conseguenza non è corretto dichiarare che Aurum “conosce tutto”.

## Architettura

1. **Router della domanda**: classifica dominio, rischio, giurisdizione, ruolo, presenza di dati personali, soglia minima di autorità e strumenti autorizzati.
2. **Registro fonti**: conserva provenienza, autorità, giurisdizione, licenza, modalità di acquisizione, periodicità e obbligo di revisione.
3. **Sincronizzazione controllata**: acquisisce una fonte con protezioni SSRF e DNS pinning, calcola SHA-256, crea una versione, estrae testo, genera chunk ed embeddings e lascia tutto `pending`.
4. **Retrieval ibrido**: combina ricerca full-text e vettoriale, filtra per governance, prende fino a 12 candidati e ne restituisce al massimo 8 dopo il reranking.
5. **Knowledge Graph**: fatti atomici e relazioni esplicite affiancano i documenti, con validità temporale, autorità, confidence e fonte obbligatoria.
6. **Procedure**: sequenze versionate di passi, strumenti richiesti, avvertenze e ruoli; la pubblicazione richiede fonti approvate.
7. **Casi reali**: entrano nel retrieval solo se `anonymized = TRUE`, `review_status = approved` e se la fonte interna dedicata è attiva.
8. **Strumenti deterministici**: eseguono esclusivamente calcoli o controlli basati sugli input, senza inventare prezzi, pesi, esiti diagnostici o decisioni AML.
9. **Contratto di risposta**: impone classificazione, dominio, data di validità, confidenza, assunzioni, informazioni mancanti, passi, rischi, escalation e massimo quattro citazioni verificabili.
10. **Sicurezza e privacy**: minimizzazione dei prompt, nessun testo integrale della domanda nell'audit, isolamento delle fonti non attendibili, ACL per ruolo e blocco dei contenuti non approvati.
11. **Console Founder**: Panoramica, Domini, Fonti, Versioni, Documenti, Fatti, Knowledge Graph, Procedure, Casi reali, Review Queue, Conflitti, Fonti obsolete, Sincronizzazioni, Copertura, Test Aurum, Feedback e Impostazioni.

## Tabelle e migration

Migration aggiunta: `migrations/20260801_aurum_knowledge_os.sql`.

Nuove tabelle:

- `ai_source_registry`
- `ai_source_versions`
- `ai_knowledge_facts`
- `ai_knowledge_relations`
- `ai_procedures`
- `ai_procedure_steps`
- `ai_case_library`
- `ai_review_queue`
- `ai_sync_runs`
- `ai_answer_audit`
- `ai_evaluation_cases`
- `ai_knowledge_conflicts`

Estensioni governate:

- `ai_documents`: fonte, versione, dominio, giurisdizione, autorità, URL ufficiale, validità, hash, revisione, verifica e stato corrente.
- `ai_document_chunks`: versione, dominio, giurisdizione, autorità, sezione/articolo, validità, tipo di fatto, revisione e label di citazione.

La migration è transazionale (`BEGIN`/`COMMIT`) e idempotente per le entità create. **Non è stata applicata a un database live in questa sessione.**

## Fonti

Registro configurato: **39 fonti**.

| Gruppo | Numero | Stato locale |
|---|---:|---|
| Fonti esterne ufficiali | 27 | Configurate; verifica iniziale ancora dovuta |
| Fonti interne OroActive | 12 | Configurate; sync/upload e review Founder richiesti |
| Full text consentito dalla policy | 18 | Utilizzabile solo quando disponibile e legittimamente acquisito |
| Solo metadati/abstract | 21 | Il contenuto integrale non viene memorizzato |

Le fonti ufficiali comprendono Normattiva, OAM, UIF, MIMIT, Garante Privacy, EUR-Lex, Agenzia delle Entrate, CIBJO, GIA, ISO, OECD e LBMA. Le fonti interne comprendono conoscenza settoriale, procedure operative, Laboratorio Gemmologico, Elenco Monete, La Bilancia d'Oro, manuale del format, Aurum Shield, procedure AML e privacy, Academy, manuali strumenti e casi anonimizzati approvati.

Il full text di fonti protette o soggette a condizioni specifiche, incluse risorse ISO, GIA, CIBJO e LBMA, non viene acquisito quando la policy indica `metadata_only`. Sono conservati soltanto metadati, riferimenti e abstract consentiti.

Le modifiche proposte al registro entrano nella Review Queue e vengono applicate con confronto atomico sullo stato originario: una proposta divenuta obsoleta non può sovrascrivere una modifica successiva. La policy di acquisizione effettiva viene letta dal registro SQL governato, non sostituita dalla configurazione locale durante la sincronizzazione.

Durante la preparazione sono stati controllati puntualmente cinque endpoint obbligatori — DPR 633/1972 su Normattiva, prezzi metalli LBMA, guida applicativa GDPR del Garante, risorse standard CIBJO e guida Responsible Sourcing LBMA — ma il registro conserva correttamente `last_checked_at = null`: questi controlli preparatori non sostituiscono una sincronizzazione tracciata nel database.

## Versioni, documenti e chunk

- Versionamento: hash SHA-256 stabile, etichetta versione, intervallo di efficacia, riepilogo variazioni e stato di review.
- Seed controllato: **4 versioni interne attese** al bootstrap, riferite a conoscenza settoriale, procedura operativa, Laboratorio Gemmologico ed Elenco Monete.
- Stato iniziale delle versioni seed: `pending`, non correnti e non auto-approvate.
- Documento/chunk: parser strutturato, policy di conservazione, chunk fino a 2.800 caratteri, full-text italiano ed embedding opzionale con fallback full-text.
- Ripresa idempotente: una sincronizzazione interrotta ricostruisce documento, chunk e voce di Review Queue della versione pending.

Conteggi runtime di versioni, documenti e chunk: **non disponibili**, perché il database live non è stato connesso e il bootstrap non è stato eseguito.

## Fatti, relazioni e procedure

Artefatti seed controllati:

| Entità | Numero | Stato iniziale |
|---|---:|---|
| Fatti atomici | 15 | Pending |
| Relazioni Knowledge Graph | 10 | Pending |
| Procedure | 8 | Pending |
| Passi procedurali | 26 | Pending |

I seed coprono contenuti iniziali in **14 domini unici**. La pubblicazione di una procedura è atomica e viene rifiutata se mancano passi o versioni fonte approvate.

## Casi reali

- Casi inclusi nel seed: **0**.
- Inserimento: sempre `anonymized = FALSE` e `pending` fino all'attestazione esplicita del Founder.
- Approvazione: richiede conferma di anonimizzazione e nuova verifica dei campi.
- Identità: la chiave è un UUID opaco generato dal server e il tipo fonte è fissato a `internal_anonymized_case`; valori forniti dal client non possono sostituirli.
- Privacy fail-closed: chiavi e valori sono ammessi solo dal vocabolario controllato; dati anagrafici, contatti, documenti, targhe, date personali, identificativi misti e sequenze numeriche lunghe vengono rifiutati. Il vocabolario copre per test tutti i 61 materiali e i 21 strumenti del Laboratorio Gemmologico. Le formule chimiche sono ammesse soltanto nei campi formula dedicati e solo se corrispondono al catalogo controllato, evitando che un seriale alfanumerico venga interpretato come formula.
- Retrieval: solo record anonimizzati e approvati, con fonte interna attiva e livello di autorità 70; nei domini misti non abbassano la soglia delle fonti normative o tecniche.
- Snapshot interno: esporta soltanto i campi utili dei casi approvati, escludendo identificativi utente e campi amministrativi.

## Strumenti deterministici

Sono stati implementati e registrati **14 strumenti**:

1. `calculateFineMetal`
2. `convertPurity`
3. `convertWeightUnits`
4. `calculateDensity`
5. `calculateBuybackPrice`
6. `calculateFoundryYield`
7. `reconcileLotWeights`
8. `compareMeltVsResale`
9. `checkActCompleteness`
10. `buildAssayProtocol`
11. `lookupHallmark`
12. `compareGemCandidates`
13. `scoreAmlIndicators`
14. `calculateStoreMargin`

Gli strumenti sono filtrati sia dal router sia dal dispatcher. I calcoli economici e AML più sensibili sono riservati ai ruoli autorizzati; confronto strategico e margine negozio restano Founder-only. Lo score AML è supporto all'attenzione e non decide né trasmette una SOS.

## Domini

La tassonomia contiene **35 domini**:

`legal_compro_oro`, `oam_registry`, `aml_ctf`, `privacy`, `ai_governance`, `precious_metals`, `alloys`, `assaying`, `hallmarks`, `jewellery_manufacturing`, `jewellery_repairs`, `gemology`, `diamonds`, `pearls`, `coral`, `numismatics`, `bullion`, `market_prices`, `buyback_pricing`, `foundry`, `refining`, `bullion_desk`, `responsible_sourcing`, `tax_accounting`, `physical_security`, `internal_fraud`, `store_operations`, `customer_communication`, `sales`, `complaints`, `franchising`, `business_management`, `oroactive_policy`, `oroactive_cases`, `training_academy`.

Ogni riferimento a una fonte primaria nella tassonomia risolve una chiave reale del registro. Questo è un controllo strutturale, non una dichiarazione che il contenuto di ogni dominio sia già stato sincronizzato e approvato.

## Copertura

| Metrica | Risultato |
|---|---:|
| Domini tassonomici | 35 |
| Domini con riferimenti primari configurati | 35/35 |
| Domini presenti nei seed fatti/relazioni/procedure | 14/35 |
| Fonti registrate | 39 |
| Fonti esterne con verifica tracciata | 0/27 |
| Fonti esterne in attesa di verifica iniziale | 27/27 |
| Casi di valutazione | 325 |
| Domini coperti dalle eval | 16 |
| Eval con strumento atteso | 243 |
| Riferimenti fonte delle eval mancanti dal registro | 0 |

Distribuzione rischio delle eval: **45 critical**, **175 high**, **105 medium**. Il dataset verifica schema, routing atteso, concetti, claim vietati, fonti, strumenti ed escalation; non è stato eseguito come benchmark di risposte di un modello live.

## Conflitti

Il rilevatore gestisce affermazioni incompatibili, sovrapposizione temporale, autorità e blocco prudenziale per l'alto rischio. La tabella `ai_knowledge_conflicts` e l'azione Founder di risoluzione sono presenti.

- Conflitti nel seed statico: **0 rilevati dai test**.
- Conflitti runtime aperti: **non determinabili senza database e sincronizzazione**.

## Fonti obsolete

La staleness usa `next_check_at`, periodicità e ultima verifica; le fonti `manual` non vengono trattate come fonti periodiche scadute. Lo scheduler ricontrolla automaticamente anche gli adapter interni `on_change`, con priorità, limite per ciclo e intervallo minimo, e può creare versioni pending senza approvare mai contenuti.

- Fonti esterne con `last_checked_at` valorizzato: **0**.
- Fonti esterne dovute per verifica iniziale: **27**.
- Stato runtime della dashboard “Fonti obsolete”: **non disponibile senza database**.

## Test e verifiche

- Suite completa: **326 test eseguiti, 326 superati, 0 falliti**.
- Esecuzione riproducibile: `pnpm test` con il runtime Node.js incluso nell'ambiente Codex; il comando usa `node --test --test-concurrency=1 tests/*.test.mjs`.
- Dataset eval: 325 casi unici, distribuzione minima valida, 20 chiavi fonte uniche e 0 chiavi mancanti.
- Sintassi: `app.js`, `server.js`, service worker, configurazione frontend, policy condivisa, servizi Knowledge OS, router, risposta professionale, gestione Founder, strumenti e generatore eval verificati con Node.
- JSON: registro fonti, tassonomia, seed, eval, manifest e versione validi.
- Git: `git diff --check` superato.
- Smoke HTTP locale finale: home, `version.json` e health hanno risposto HTTP 200 con database simulato; l'errore database previsto è rimasto confinato alle funzioni dati.
- Controlli specifici: fonti/licenze, versionamento pending, applicazione atomica delle proposte, ACL, privacy/PII inclusi identificativi numerici, vocabolario dell'intero catalogo gemmologico, prompt injection, SSRF/DNS pinning, citazioni, autorità, conflitti, retrieval, casi, PWA no-store e 17 tab Founder.

## Limiti rimasti

1. Nessun PostgreSQL live era disponibile: migration, bootstrap, indici, query reali e conteggi runtime non sono stati verificati contro il database di produzione.
2. Nessuna fonte è stata sincronizzata nel database durante questa sessione; le 27 fonti esterne richiedono la prima verifica tracciata.
3. Le 4 versioni seed, i 15 fatti, le 10 relazioni e le 8 procedure richiedono approvazione Founder prima di contribuire a risposte assertive.
4. Le fonti `founder_upload` richiedono file legittimamente detenuti e conferma dei diritti; i contenuti protetti non sono inclusi.
5. Non esistono ancora casi reali approvati nella libreria seed.
6. Le eval sono un dataset di accettazione e routing, non una valutazione eseguita su un modello live.
7. Non è stato possibile eseguire un collaudo firmato completo delle 17 schermate con dati di produzione, memoria utente reale e provider AI live.
8. La qualità normativa deve continuare a essere presidiata da revisione professionale e aggiornamenti delle fonti; Aurum non sostituisce commercialista, avvocato, responsabile AML, gemmologo o autorità competente.
9. Il vocabolario fail-closed dei casi rifiuta prudentemente nuovi campi o termini non ancora ammessi; l'estensione futura del catalogo richiederà l'aggiornamento esplicito del vocabolario e dei relativi test prima dell'uso nei casi reali.

## Attività non completate in questa sessione

- Applicazione della migration al VPS/database di produzione.
- Prima sincronizzazione completa delle fonti e verifica di raggiungibilità registrata.
- Upload dei manuali e documenti proprietari con conferma dei diritti.
- Revisione/approvazione Founder di versioni, documenti, chunk, fatti, relazioni e procedure.
- Popolamento e approvazione di casi reali anonimizzati.
- Esecuzione delle 325 eval contro un provider AI live.
- Test end-to-end autenticato su produzione con tutti i ruoli.
- Push Git e deploy: esclusi espressamente dall'istruzione di consegna.

## Conclusione

La piattaforma tecnica, la governance, gli strumenti, la console Founder e i controlli automatici di Aurum Knowledge OS sono implementati e verificati localmente. L'entrata in esercizio della conoscenza richiede migration, sincronizzazione e approvazioni Founder; fino ad allora il comportamento fail-closed evita che contenuti non verificati vengano presentati come fatti professionali.
