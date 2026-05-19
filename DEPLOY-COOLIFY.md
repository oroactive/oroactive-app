# Deploy OroActive su Coolify

## Variabili ambiente

Imposta nella app Coolify:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Per la configurazione OroActive richiesta:

```text
DATABASE_URL=postgresql://oroactive_admin:LA_TUA_PASSWORD@HOST_INTERNO_POSTGRESQL:5432/oroactive_db
```

Se il PostgreSQL richiede SSL:

```text
DATABASE_SSL=true
```

## Servizi Coolify

1. Crea un database PostgreSQL in Coolify.
2. Crea una nuova app dal repository o caricando questi file.
3. Seleziona deploy con Dockerfile oppure Nixpacks.
4. Collega la variabile `DATABASE_URL` del database PostgreSQL.
5. Avvia il deploy.

Alla prima partenza il server crea automaticamente la tabella `atti_vendita`.
La tabella usa i campi principali richiesti: `id`, `cliente_nome`, `cliente_cognome`, `codice_fiscale`, `telefono`, `peso_oro`, `quotazione`, `totale`, `data_atto`. Le informazioni complete del gestionale vengono salvate anche nel campo `payload`.

## API REST principali

```text
GET    /api/health
GET    /api/atti
POST   /api/atti
GET    /api/atti/:id
GET    /api/atti/search?q=Rossi
GET    /api/atti/search?field=surname&q=Rossi
GET    /api/atti?store=Busto%20Arsizio
GET    /api/atti?fusionEligible=true
GET    /api/atti/next-number?storeCode=BUSTO&year=2026
PUT    /api/atti/:id
DELETE /api/atti/:id
```

Il frontend usa queste API per salvare, leggere, cercare, modificare/eliminare e numerare gli atti di vendita. Per compatibilita, gli endpoint `:id` accettano anche il numero atto `OA-NEGOZIO-ANNO-NUMERO`.
