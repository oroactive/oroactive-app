# Verifica pre-pubblicazione della prova Apple — 8 settembre 2026

## Confermato

- Suite web completa: 491 test passati, nessun errore.
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
- Controllo visivo: anteprime piccola e media correttamente contenute; la grande
  è presente sotto e l'albero accessibilità espone tutte le quattro azioni.

## Da completare prima di consegnare la prova installabile

- Abbinamento dell'iPad al Mac, installazione e prova sul dispositivo.
- Prova funzionale autenticata su iPhone e iPad.
- Verifica completa del widget grande, Home WidgetKit e rotazione.
- Pubblicazione delle estensioni web retrocompatibili (servizio pubblico della
  quotazione e dispatcher dei collegamenti); nessun deploy eseguito finora.
- Prova reale di quotazione, login, destinazioni, documenti e fotocamera.

L'errore della prima compilazione (exit 65) è stato riprodotto e corretto:
le callback WebKit richiedevano `@MainActor @Sendable`; in seguito Xcode ha
segnalato metadati mancanti nel plist dell'estensione, anch'essi corretti.
Il controllo visivo automatico dello scorrimento del simulatore non è riuscito
per un errore del controllo UI (`noWindowsAvailable`), non per un errore
dimostrato dell'app: la parte non osservata resta da verificare.

Il successivo blocco di firma (`No Accounts`, profili mancanti) è stato superato
dopo la selezione del team in Xcode. Prima di installare l'app è stato rimosso
un App Group estraneo a OroActive; due regressioni proteggono gruppo e dominio.
Il tentativo di installazione sull'iPad ha richiesto prima l'abbinamento del
dispositivo al Mac (`The device must be paired before it can be connected`).

Nessuna modifica al database, nessun atto di prova creato, nessuna sostituzione
della web app e nessuna pubblicazione App Store/TestFlight.
