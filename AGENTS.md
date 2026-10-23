# Versionamento delle build OroActive

Per le nuove release usare il nome richiesto dall'utente:

`oroactive_gestionale_<numero>_<YYYYMMDD>`

- Il numero è progressivo rispetto all'ultima build applicativa verificata in `app.js`, `version.json` e nella release online: incrementarlo di uno per ogni nuovo aggiornamento applicativo. Non usare il numero di esecuzione della CI o il numero di commit Git.
- La data è quella dell'aggiornamento, nel fuso `Europe/Rome`, in formato anno-mese-giorno senza separatori.
- La convenzione è stata introdotta dopo la release 65 (`20261023-reliability-65`); il primo aggiornamento con il nuovo formato sarà il 66. Esempio per un aggiornamento il 23 ottobre 2026: `oroactive_gestionale_66_20261023`.
- Allineare l'identificativo client in `app.js`, il service worker, i riferimenti agli asset in HTML e manifest, `version.json` e i controlli della release. Conservare commit Git e metadati della CI come riferimenti tecnici separati.
- Non rinominare retroattivamente release, backup o prove di collaudo già prodotti. Un controllo in sola lettura o un aggiornamento della documentazione non incrementa la build.
