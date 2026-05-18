# Deploy OroActive su Coolify

## Variabili ambiente

Imposta nella app Coolify:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
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

Alla prima partenza il server crea automaticamente la tabella `sale_acts`.

## API REST principali

```text
GET    /api/health
GET    /api/acts
GET    /api/acts?store=Busto%20Arsizio
GET    /api/acts?field=surname&q=Rossi
GET    /api/acts?fusionEligible=true
GET    /api/acts/next-number?storeCode=BUSTO&year=2026
GET    /api/acts/:practiceNumber
POST   /api/acts
PUT    /api/acts/:practiceNumber
DELETE /api/acts/:practiceNumber
```

Il frontend usa queste API per salvare, leggere, cercare, modificare/eliminare e numerare gli atti di vendita.
