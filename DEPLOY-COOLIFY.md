# Deploy OroActive su Coolify

## Variabili ambiente

Imposta nella app Coolify:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=UNA_CHIAVE_LUNGA_CASUALE_DI_ALMENO_32_CARATTERI
JWT_EXPIRES_IN=7d
WEBAUTHN_RP_ID=app.oroactive.it
WEBAUTHN_ORIGINS=https://app.oroactive.it
AURUM_MEMORY_ENCRYPTION_KEY=UNA_CHIAVE_AURUM_LUNGA_CASUALE_STABILE_MINIMO_32_BYTE
AURUM_MEMORY_ENCRYPTION_KEY_PREVIOUS=
BACKUP_DIR=/data/oroactive/backups
REQUIRE_PERSISTENT_BACKUP_STORAGE=true
PRIVATE_UPLOAD_DIR=/app/private_uploads
REQUIRE_PERSISTENT_UPLOAD_STORAGE=true
ACADEMY_UPLOAD_DIR=/app/private_uploads/academy
CUSTOMER_TRUST_PACK_DIR=/app/private_uploads/customer-trust-packs
BULLIONVAULT_MARKET_URL=https://www.bullionvault.com/view_market_xml.do
OPENAI_API_KEY=INSERISCI_CHIAVE_OPENAI_SOLO_BACKEND
OPENAI_MODEL=gpt-4.1-mini
ADMIN_USERNAME=Elite
ADMIN_EMAIL=elite@oroactive.it
# Richiesta soltanto per creare il primo Founder; dopo il provisioning può essere rimossa.
ADMIN_PASSWORD=INSERISCI_PASSWORD_FOUNDER
ADMIN_NOME=Elite
ADMIN_COGNOME=Founder
ADMIN_NEGOZIO=Tutti
```

`AURUM_MEMORY_ENCRYPTION_KEY` cifra le memorie personali di Aurum. Genera una chiave casuale di almeno 32 byte, configurala come secret esclusivamente nel backend di Coolify e conservala in un gestore di segreti sicuro. La chiave deve rimanere stabile tra riavvii e deploy. Se deve essere ruotata, inserisci temporaneamente il valore precedente in `AURUM_MEMORY_ENCRYPTION_KEY_PREVIOUS` finché le memorie esistenti non sono state aggiornate; non inserire mai queste chiavi nel repository, nei log o nel frontend.

`WEBAUTHN_RP_ID` e `WEBAUTHN_ORIGINS` vincolano Face ID/passkey al dominio di produzione. Non aggiungere domini di terze parti. Dopo questo aggiornamento le precedenti registrazioni Face ID non firmate vengono disattivate e ciascun utente deve registrare nuovamente Face ID dopo un accesso con password.

Per generare un valore adatto, esegui localmente `openssl rand -base64 48` e copia il risultato direttamente nel secret Coolify.

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
2. Crea una nuova app dal repository `oroactive/oroactive-app`.
3. Seleziona deploy con Dockerfile oppure Nixpacks.
4. Collega la variabile `DATABASE_URL` del database PostgreSQL.
5. Avvia il deploy.

## Storage persistente obbligatorio

La risorsa Coolify di produzione deve avere due storage persistenti, non semplici
cartelle interne al container:

```text
/data/oroactive/backups  -> backup verificati
/app/private_uploads     -> PDF Academy e Customer Trust Pack
```

Per un'Application Coolify questi mount si configurano nella sezione **Storage**
della risorsa; il file `docker-compose.yml` copre soltanto installazioni avviate
come stack Compose. Prima di aggiungere il secondo mount a un'app già attiva:

1. apri il terminale del container corrente e inventaria
   `/app/private_uploads/academy` e `/app/private_uploads/customer-trust-packs`;
2. copia quelle cartelle in uno storage già persistente e verifica numero file,
   dimensioni e checksum;
3. crea il mount persistente su `/app/private_uploads`;
4. ripristina i file nel nuovo mount e verifica di nuovo i checksum;
5. solo dopo esegui il redeploy.

Il backup manuale include l'intera directory `PRIVATE_UPLOAD_DIR`, quindi entrambi
i tipi di documento rientrano nell'archivio scaricabile e verificabile.
In produzione l'avvio viene rifiutato se uno dei due percorsi non è un mount
reale e scrivibile; `/api/health` deve riportare sia
`persistent_upload_storage: ready` sia `persistent_backup_storage: ready`.

La risorsa di produzione deve usare il ramo `main` e il dominio `https://app.oroactive.it`. In Coolify il deploy automatico del Git provider deve restare disattivato (`Manual deployments only`): il deploy parte esclusivamente dopo i test GitHub Actions tramite l'API ufficiale Coolify. Endpoint e UUID della sola risorsa OroActive di produzione sono vincolati in `scripts/coolify-deploy-target.mjs`; in GitHub e richiesto soltanto il Secret `COOLIFY_TOKEN`. La risorsa `oroactive-site`, dedicata al sito `oroactive.it`, non deve essere usata per il gestionale.

Dopo ogni deploy, `https://app.oroactive.it/api/health` deve riportare:

- lo stesso `commit` presente su GitHub `main`;
- l'`assetBuildId` della release appena costruita;
- il `catalogCount` atteso.
- un processo con `started_at` successivo alla richiesta di deploy.
- database e inizializzazione applicativa nello stato `ready`.
- entrambi gli storage persistenti nello stato `ready`.

Il workflow GitHub considera il deploy riuscito solo quando tutti i valori coincidono e il processo è stato realmente riavviato. Se Coolify accetta la richiesta API ma il dominio espone ancora un processo o un commit vecchio, la risorsa di deploy non è collegata correttamente alla produzione.

Alla prima partenza il server crea automaticamente la tabella `atti_vendita`.
La tabella usa i campi principali richiesti: `id`, `cliente_nome`, `cliente_cognome`, `codice_fiscale`, `telefono`, `peso_oro`, `quotazione`, `totale`, `data_atto`. Le informazioni complete del gestionale vengono salvate anche nel campo `payload`.
Alla prima partenza di un database senza alcun account Founder viene creato il primo accesso usando `ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Se un Founder esiste già, il bootstrap non modifica identità, password o sessioni e `ADMIN_PASSWORD` può essere rimossa dalle variabili ambiente.

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
GET    /api/bullionvault/prices
POST   /api/ai/leggi-documento
POST   /api/ai/controlla-atto
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
L'endpoint BullionVault aggiorna le quotazioni oro, argento e platino in EUR al kg e le inserisce automaticamente nell'atto di vendita.
Gli endpoint AI usano OpenAI solo lato backend tramite `OPENAI_API_KEY`: la chiave non viene mai inviata al frontend.

## Ruoli

```text
Founder  vede tutti i negozi e gestisce ogni ruolo
Supervisore  vede tutti i negozi e gestisce i ruoli subordinati consentiti
Responsabile  opera sulla propria sede e gestisce Commesso/a e Aiuto Commesso/a locali
Commesso/a  opera sulla sede assegnata senza amministrare gli utenti
Aiuto Commesso/a  opera sulla sede assegnata senza amministrare gli utenti
```

Il Founder e il Supervisore possono lavorare su tutte le sedi. Gli altri ruoli sono
vincolati all'identificativo della sede assegnata. Il Founder non può eliminare se
stesso né lasciare il sistema privo di un Founder attivo.

Accesso Founder iniziale:

```text
Nome utente: Elite
Password: il valore configurato in ADMIN_PASSWORD al primo provisioning, oppure la password già gestita dall'app per un Founder esistente
```
