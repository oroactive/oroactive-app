# Verifica della prova Apple — 8 settembre 2026

## Correzione proporzioni icone — versione Apple 0.1.1 (2)

- Difetto riprodotto nei PNG precedenti: il cerchio Apple Touch Icon risultava
  138 × 110 pixel e quello dell'app Apple 786 × 628; cinque regressioni fallivano.
- Nuove risorse derivate dal master invariato con scala uniforme: cinque
  controlli di circolarità, centratura, riempimento e margini ora superati,
  insieme al controllo delle icone maskable.
- Suite completa fresca: 502 test passati, exit 0.
- Compilazioni incrementali Xcode simulatore e dispositivo: exit 0; firma
  `codesign --verify --deep --strict` superata.
- Controllo visivo delle anteprime su simulatore iPhone e iPad: marchio circolare
  completo, ingrandito e centrato. Controllata anche l'icona nella Home iPad.
- Aggiornamento installato su entrambi i dispositivi fisici senza disinstallare
  l'app. Bundle ID, gruppi, autenticazione e azioni widget invariati.
- Release web preparata: `20260908-logo-layout-29`, riferimenti delle icone
  versionati in HTML, manifest e precache. La distribuzione App Store/TestFlight
  non fa parte del deploy web.

Il precedente elenco di controlli rimane uno storico della prima installazione;
le prove autenticate e le funzioni non esercitate continuano a essere indicate
separatamente, senza dichiarare una garanzia assoluta su tutta l'app.

## Confermato

- Suite web completa: 496 test passati, nessun errore, inclusa la regressione
  del banner PWA nella prova nativa (release web `20260908-apple-trial-28`).
- Regressione Swift dei dati: prezzi invalidi rifiutati, timestamp conservato,
  scadenza e sei destinazioni verificate.
- Controllo Swift con concorrenza completa e avvisi trattati come errori:
  applicazione ed estensione superati su destinazione simulatore x86_64.
- Compilazione Xcode completa Debug per simulatore: esito 0 dopo le correzioni
  delle callback WebKit e dei metadati dell'estensione.
- Installazione e avvio sul simulatore iPhone 17 Pro Max iOS 26.5 riusciti.
- Compilazione firmata per dispositivo riuscita. Verifica `codesign --deep
  --strict` superata; app e widget hanno effettivamente soltanto il gruppo
  `group.it.oroactive.trial` nelle rispettive firme.
- Installazione e avvio riusciti sull'iPhone fisico di Christian.
- Dopo abbinamento, Modalità sviluppatore e registrazione Apple dell'iPad,
  compilazione firmata, installazione e avvio riusciti anche sull'iPad fisico.
  Firma app/estensione ricontrollata: soltanto il gruppo OroActive previsto.
- Controllo visivo: anteprime piccola e media correttamente contenute; la grande
  è presente sotto e l'albero accessibilità espone tutte le quattro azioni.
- Sul simulatore iPad verificati login, recupero da errore di rete con Riprova,
  quotazione reale nelle anteprime e ritorno al login tramite l'azione Aurum.
- Commit `12043aaffed13d9311a716ccd54c80365c0ab876` pubblicato su Coolify;
  workflow GitHub 34226838462 riuscito. Health live: database, inizializzazione,
  upload e backup pronti, catalogo 197 monete, build `20260908-apple-trial-27`.
- Servizio pubblico `/api/widgets/gold` verificato con quotazione BullionVault
  reale e timestamp; associazione Apple pubblicata per il solo bundle di prova.
- Il successivo piccolo aggiornamento web evita il suggerimento di installare
  la PWA quando OroActive è già aperta nell'app Apple; controlli automatici e
  revisione indipendente superati, nessuna modifica all'autenticazione.

## Da verificare durante la prova con l'utente

- Prova funzionale autenticata su iPhone e iPad.
- Verifica completa del widget grande, Home WidgetKit e rotazione.
- Verifica delle destinazioni dopo l'accesso, documenti e fotocamera.

L'errore della prima compilazione (exit 65) è stato riprodotto e corretto:
le callback WebKit richiedevano `@MainActor @Sendable`; in seguito Xcode ha
segnalato metadati mancanti nel plist dell'estensione, anch'essi corretti.
Il controllo visivo automatico dello scorrimento del simulatore non ha consentito
di osservare interamente il formato grande: la parte non osservata resta da
verificare, senza attribuire il limite dello strumento a un errore dell'app.

Il successivo blocco di firma (`No Accounts`, profili mancanti) è stato superato
dopo la selezione del team in Xcode. Prima di installare l'app è stato rimosso
un App Group estraneo a OroActive; due regressioni proteggono gruppo e dominio.
Il tentativo di installazione sull'iPad ha richiesto prima l'abbinamento del
dispositivo al Mac (`The device must be paired before it can be connected`),
poi Modalità sviluppatore e registrazione nei profili, completati con successo.

Nessuna modifica al database, nessun atto di prova creato, nessuna sostituzione
della web app e nessuna pubblicazione App Store/TestFlight.
