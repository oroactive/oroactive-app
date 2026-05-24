# OroActive iOS nativa con Capacitor

Questa configurazione trasforma l'attuale web app OroActive in app iOS nativa senza riscrivere frontend, backend o PostgreSQL.

## Requisiti Mac

- Node.js con `npm`
- Xcode installato
- CocoaPods installato
- Account Apple Developer per firma e App Store

## Installazione dipendenze

```bash
npm install
```

Se Capacitor non fosse gia presente:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/app @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen @capacitor/filesystem @capacitor/preferences @capacitor/camera @capacitor/geolocation @capacitor/local-notifications
```

## Preparazione app iOS

```bash
npm run ios:prepare
npx cap init OroActive it.oroactive.app
npx cap add ios
npx cap sync ios
npx cap open ios
```

Se il progetto iOS esiste gia:

```bash
npm run ios:sync
npm run ios:open
```

## Backend

L'app nativa usa il backend esistente. In ambiente nativo il frontend punta a:

```text
API_BASE_URL = https://app.oroactive.it
```

Tutte le chiamate vengono composte come:

```text
https://app.oroactive.it/api/...
```

Se il dominio cambia, aggiornare `API_BASE_URL` in `app.js` oppure impostare `window.OROACTIVE_API_BASE_URL` prima del caricamento di `app.js`.

## Permessi iOS da verificare in Xcode

In `ios/App/App/Info.plist` aggiungere o verificare:

```xml
<key>NSCameraUsageDescription</key>
<string>OroActive usa la fotocamera per fotografare documenti, preziosi e contabili.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>OroActive permette di allegare foto e documenti dalla libreria.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>OroActive usa la posizione solo per il timestamp e audit della firma.</string>
<key>NSFaceIDUsageDescription</key>
<string>OroActive usa Face ID per velocizzare l'accesso autorizzato.</string>
```

## Funzioni native predisposte

- Face ID tramite WebAuthn dove supportato e storage token in Capacitor Preferences
- fotocamera nativa con qualità alta e compressione controllata
- geolocalizzazione firma tramite Capacitor Geolocation
- feedback aptico con Capacitor Haptics
- notifiche locali per conferme operative
- splash screen nero/arancione
- status bar nera
- offline mode base con coda locale temporanea e sincronizzazione al ritorno online
- safe-area iPhone/iPad

## App Store

In Xcode:

1. Selezionare `App`.
2. Impostare Team Apple Developer.
3. Bundle Identifier: `it.oroactive.app`.
4. Configurare Signing Release.
5. Archive.
6. Caricare tramite Organizer / App Store Connect.

## Nota sicurezza

L'app nativa non cachea API, documenti, atti o PDF nel service worker. I dati operativi restano sul backend/PostgreSQL. La coda offline locale serve solo per recuperare salvataggi interrotti da connessione lenta.
