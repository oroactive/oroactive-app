# Deploy OroActive su Coolify

Questa app si aggiorna tramite GitHub Actions e webhook Coolify. Nessun URL amministrativo, token o IP deve essere scritto nel codice.

## Segreti GitHub richiesti

Impostare in GitHub, nella repository, questi Secrets:

- `COOLIFY_WEBHOOK`: webhook di deploy fornito da Coolify.
- `COOLIFY_TOKEN`: token usato dal webhook Coolify.
- `OROACTIVE_HEALTH_URL`: URL pubblico da verificare dopo il deploy, normalmente `https://app.oroactive.it/version.json`.
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
5. Chiama il webhook Coolify usando solo i Secrets.
6. Attende che il dominio pubblico esponga in `/version.json`, `/api/version` o `/api/health` lo stesso commit appena inviato.
7. Verifica anche che `assetBuildId` coincida con il frontend creato e che `catalogCount` coincida con il catalogo atteso.
8. Termina con successo solo quando la produzione sta servendo commit, frontend e catalogo corretti.

Se Coolify accetta il webhook ma il dominio continua a mostrare un commit vecchio, GitHub Actions fallisce. In quel caso il deploy non e completato, anche se la chiamata webhook ha restituito esito positivo.

Controllare nella stessa risorsa Coolify che serve `app.oroactive.it`:

1. repository: `oroactive/oroactive-app`;
2. ramo: `main`;
3. dominio: `https://app.oroactive.it`;
4. deploy automatico attivo;
5. webhook copiato da questa stessa risorsa e salvato nel Secret GitHub `COOLIFY_WEBHOOK`;
6. ricostruzione dell'immagine attiva sul nuovo commit, senza riuso di un'immagine appartenente a un commit precedente.

Non usare il webhook della risorsa `oroactive-site`: quella risorsa pubblica il sito `oroactive.it`, non il gestionale `app.oroactive.it`.

La pagina `https://app.oroactive.it/version.json` deve infine mostrare lo stesso commit di GitHub, l'`assetBuildId` corrente e `catalogCount` pari al numero atteso dalla release. Un valore vecchio indica che il dominio sta ancora puntando a un container precedente.

## PWA e iPad

Il server invia `no-store` per HTML, manifest, service worker, `version.json` e API. Gli asset in `/assets/` e `/icons/` possono invece usare cache lunga.

Il service worker usa una cache versionata, attiva subito la nuova versione e rimuove le cache OroActive precedenti. La navigazione resta network-first per evitare che l'iPad carichi una vecchia `index.html`.

Prima di caricare il codice principale, `index.html` confronta il proprio identificativo con `assetBuildId` del server. Se non coincidono, rimuove service worker e Cache Storage obsoleti e riapre la pagina con un URL univoco. Questo recupero conserva i dati applicativi e impedisce che una vecchia shell PWA continui a caricare asset superati dopo un deploy corretto.

Il Founder vede nel menu utente la versione caricata e il pulsante `Verifica aggiornamento app`. Se il server ha una versione più recente, l'app mostra un banner persistente con il pulsante di ricarica. Durante pratiche o modifiche non salvate, la ricarica resta manuale.
