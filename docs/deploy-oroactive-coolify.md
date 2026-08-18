# Deploy OroActive su Coolify

Questa app si aggiorna tramite GitHub Actions e l'API ufficiale di deploy Coolify. Il target pubblico è vincolato alla sola risorsa OroActive produzione; token, URL amministrativi e IP non devono essere scritti nel codice.

## Segreti GitHub richiesti

Impostare in GitHub, nella repository, questi Secrets:

- `COOLIFY_TOKEN`: token Coolify con permesso di deploy sulla risorsa OroActive.
- `OROACTIVE_HEALTH_URL`: URL pubblico della risorsa da verificare dopo il deploy, normalmente `https://app.oroactive.it/api/health`.
- `OROACTIVE_EXPECTED_BRANCH`: ramo autorizzato al deploy, normalmente `main`.

## Build metadata in Coolify

La Docker image accetta questi build arg:

- `GIT_COMMIT`
- `BUILD_TIME`
- `BUILD_NUMBER`
- `SOURCE_COMMIT`
- `SOURCE_BRANCH`

In Coolify vanno valorizzati con i metadati del deploy quando disponibili. Il container li espone poi come:

- `OROACTIVE_GIT_COMMIT`
- `OROACTIVE_BUILD_TIME`
- `OROACTIVE_BUILD_NUMBER`
- `SOURCE_COMMIT`
- `SOURCE_BRANCH`

Gli endpoint pubblici `/api/health`, `/api/version` e `/version.json` mostrano questi metadati senza esporre segreti. Espongono inoltre:

- `assetBuildId`: identifica in modo univoco i file frontend della release.
- `catalogCount`: numero di monete dichiarato dalla build.

In Coolify, nelle impostazioni avanzate della risorsa, abilita `Include Source Commit in Build` se vuoi che `SOURCE_COMMIT` arrivi sempre alla Docker build. L'app usa comunque fallback automatici: `version.json` creato durante la build, lettura diretta di `.git` quando disponibile e numero build calcolato dal conteggio commit Git se `BUILD_NUMBER` non è impostato.

## Flusso deploy

1. Push su `main`.
2. GitHub Actions installa le dipendenze.
3. Controlla la sintassi di `app.js` e `server.js`.
4. Esegue i test.
5. Chiama l'endpoint ufficiale Coolify con il token segreto, forza il target OroActive produzione e impone `force=true`, così ogni commit ricostruisce l'immagine senza riusare la cache di una release precedente.
6. Attende che `/api/health` esponga lo stesso commit appena inviato da un processo appena avviato.
7. Verifica anche che database e inizializzazione siano pronti, che `assetBuildId` coincida con il frontend creato e che `catalogCount` coincida con il catalogo atteso.
8. Termina con successo solo quando la produzione sta servendo commit, frontend e catalogo corretti.

Se Coolify accetta la richiesta API ma il dominio continua a mostrare un commit vecchio, GitHub Actions fallisce. In quel caso il deploy non e completato, anche se la richiesta di deploy ha restituito esito positivo.

Controllare nella stessa risorsa Coolify che serve `app.oroactive.it`:

1. repository: `oroactive/oroactive-app`;
2. ramo: `main`;
3. dominio: `https://app.oroactive.it`;
4. deploy automatico del Git provider disattivato, per evitare un doppio deploy prima dei test GitHub Actions;
5. target applicativo nel file `scripts/coolify-deploy-target.mjs` uguale alla risorsa produzione mostrata da Coolify;
6. Secret GitHub `COOLIFY_TOKEN` valido per questa risorsa;
7. ricostruzione dell'immagine attiva sul nuovo commit, senza riuso di un'immagine appartenente a un commit precedente.

Non usare la risorsa `oroactive-site`: quella risorsa pubblica il sito `oroactive.it`, non il gestionale `app.oroactive.it`.

L'endpoint `https://app.oroactive.it/api/health` deve infine mostrare lo stesso commit di GitHub, l'`assetBuildId` corrente, `catalogCount` pari al numero atteso e gli stati `database` e `initialization` su `ready`. Un valore vecchio o non pronto indica che il dominio sta ancora puntando a un container precedente o che l'avvio non è concluso correttamente.

## PWA e iPad

Il server invia `no-store` per HTML, manifest, service worker, `version.json` e API. Gli asset in `/assets/` e `/icons/` possono invece usare cache lunga.

Il service worker usa una cache versionata e prepara la nuova versione senza attivarla mentre esistono dati non salvati. L'attivazione avviene dopo conferma dell'utente o quando il flusso è pulito; solo allora vengono rimosse le cache OroActive precedenti. La navigazione resta network-first per evitare che l'iPad carichi una vecchia `index.html`.

Prima di caricare il codice principale, `index.html` confronta il proprio identificativo con `assetBuildId` del server. Se non coincidono, rimuove service worker e Cache Storage obsoleti e riapre la pagina con un URL univoco. Questo recupero conserva i dati applicativi e impedisce che una vecchia shell PWA continui a caricare asset superati dopo un deploy corretto.

Il Founder vede nel menu utente la versione caricata e il pulsante `Verifica aggiornamento app`. Se il server ha una versione più recente, l'app mostra un banner persistente con il pulsante di ricarica. Durante pratiche o modifiche non salvate, la ricarica resta manuale.
