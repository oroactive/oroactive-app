# Deploy OroActive su Coolify

Questa app si aggiorna tramite GitHub Actions e webhook Coolify. Nessun URL amministrativo, token o IP deve essere scritto nel codice.

## Segreti GitHub richiesti

Impostare in GitHub, nella repository, questi Secrets:

- `COOLIFY_WEBHOOK`: webhook di deploy fornito da Coolify.
- `COOLIFY_TOKEN`: token usato dal webhook Coolify.
- `OROACTIVE_HEALTH_URL`: endpoint pubblico di salute, ad esempio `https://app.oroactive.it/api/health`.
- `OROACTIVE_EXPECTED_BRANCH`: ramo autorizzato al deploy, normalmente `main`.

## Build metadata in Coolify

La Docker image accetta questi build arg:

- `GIT_COMMIT`
- `BUILD_TIME`
- `BUILD_NUMBER`

In Coolify vanno valorizzati con i metadati del deploy quando disponibili. Il container li espone poi come:

- `OROACTIVE_GIT_COMMIT`
- `OROACTIVE_BUILD_TIME`
- `OROACTIVE_BUILD_NUMBER`

Gli endpoint pubblici `/api/health` e `/api/version` mostrano questi metadati senza esporre segreti.

## Flusso deploy

1. Push su `main`.
2. GitHub Actions installa le dipendenze.
3. Controlla la sintassi di `app.js` e `server.js`.
4. Esegue i test.
5. Chiama il webhook Coolify usando solo i Secrets.
6. Attende che `/api/health` risponda con `ok: true` e con il commit appena deployato.

Se il commit esposto da `/api/health` è `unknown`, il deploy viene considerato non valido: in quel caso verificare che Coolify passi correttamente i build arg alla Docker build.

## PWA e iPad

Il server invia `no-store` per HTML, manifest, service worker, `version.json` e API. Gli asset in `/assets/` e `/icons/` possono invece usare cache lunga.

Il service worker usa una cache versionata, attiva subito la nuova versione e rimuove le cache OroActive precedenti. La navigazione resta network-first per evitare che l'iPad carichi una vecchia `index.html`.

Il Founder vede nel menu utente la versione caricata e il pulsante `Verifica aggiornamento app`. Se il server ha una versione più recente, l'app mostra un banner persistente con il pulsante di ricarica. Durante pratiche o modifiche non salvate, la ricarica resta manuale.
