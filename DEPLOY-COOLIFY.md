# Deploy OroActive su Coolify

## Variabili ambiente

Imposta nella app Coolify:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=UNA_CHIAVE_LUNGA_CASUALE
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=Elite
ADMIN_EMAIL=elite@oroactive.it
ADMIN_PASSWORD=Snoopdoggydogg.8
ADMIN_NOME=Elite
ADMIN_COGNOME=Founder
ADMIN_NEGOZIO=Tutti
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
Alla prima partenza viene creato anche il primo accesso Founder usando le variabili `ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

## API REST principali

```text
GET    /api/health
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/utenti
POST   /api/utenti
PUT    /api/utenti/:id
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

## Ruoli

```text
Founder  vede tutti i negozi, gestisce responsabili, commessi e commesse
Responsabile  visualizza e gestisce Commesso/Commessa
Commesso/Commessa  accede al gestionale senza sezione Utenti
```

Il Founder visualizza `Tutti` nel campo negozio. Il Founder non compare nella sezione Utenti e non puo essere eliminato. Dopo il primo accesso Founder, crea Responsabili, Commessi o Commesse dalla sezione `Utenti`.

Accesso Founder iniziale:

```text
Nome utente: Elite
Password: Snoopdoggydogg.8
```
