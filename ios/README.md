# OroActive Prova per iPhone e iPad

Applicazione Apple di prova separata dalla web app. Il progetto non sostituisce
OroActive web e non contiene una copia del database: apre il gestionale HTTPS
esistente in una sessione WebKit persistente.

**Attenzione:** l'accesso usa gli stessi account e gli stessi dati reali del
gestionale. Un atto salvato dalla prova è un atto reale. Non creare operazioni
fittizie sul servizio di produzione durante i controlli.

## Tre widget

- Piccolo: solo il logo OroActive, apre il menu.
- Medio: quotazione indicativa dell'oro puro in EUR/kg, Nuovo Atto e Aurum.
- Grande: quotazione, Nuovo Atto, Elenco Monete, Laboratorio Gemmologico e Aurum.

I widget usano la stessa fonte BullionVault della pagina Quotazione attraverso
`GET /api/widgets/gold`. Non condividono credenziali, conversazioni o dati cliente.
Il timestamp indica il recupero del dato, non un tick certificato di borsa.
Apple decide gli aggiornamenti in Home: il progetto richiede una nuova timeline
dopo 15 minuti e marca il prezzo come non aggiornato dopo due minuti. Non promette
aggiornamenti ogni secondo. In assenza di una rilevazione valida mostra
"Quotazione non disponibile"; un errore di rete non ringiovanisce un dato vecchio.

Dopo l'installazione: aprire l'app almeno una volta, quindi tenere premuto sulla
Home di iPhone/iPad, scegliere Aggiungi widget, cercare OroActive e selezionare il
formato. Nell'app il pulsante Widget mostra le tre anteprime cliccabili.

## Progetto e firma

- Aprire `OroActiveTrial/OroActiveTrial.xcodeproj` con Xcode.
- Schema: `OroActiveTrial`; iOS/iPadOS minimo 26.0.
- App: `it.oroactive.trial`, nome visibile **OroActive Prova**.
- Estensione: `it.oroactive.trial.widgets`.
- Gruppo condiviso: `group.it.oroactive.trial` (solo quotazione pubblica).
- Team di sviluppo configurato: `F9GWSX8N83`; firma automatica.
- Associated Domain: `webcredentials:app.oroactive.it`, per il dominio di accesso.

Il server deve pubblicare l'associazione Apple e il servizio widget prima delle
prove complete. I collegamenti interni richiedono il dispatcher
`window.OroActiveNavigation` della release web abbinata. L'app non intercetta
tutti i normali link web tramite Universal Links.

La firma richiede un account Apple abilitato e profili validi per app, estensione
e App Group. Un dispositivo fisico richiede autorizzazione del computer ed
eventualmente Modalità sviluppatore. App Store e TestFlight sono passaggi
separati: questo progetto non implica una pubblicazione su App Store.

## Verifiche prima del rilascio della prova

1. Eseguire i test web, inclusi `widget-navigation` e `widget-gold-quote`.
2. Compilare `Shared/OroActiveAction.swift`, `Shared/GoldQuote.swift` e
   `Verification/WidgetDataRegression.swift` come eseguibile Swift di regressione.
3. Compilare app ed estensione con lo schema condiviso, per simulatore e dispositivo.
4. Sul simulatore controllare i tre formati e rotazione iPhone/iPad. In Debug,
   l'argomento `--widget-gallery` apre subito le anteprime native.
5. Sul dispositivo controllare accesso, sessione persistente, tutti i collegamenti,
   chiusura documenti, stampa/condivisione e fotocamera. Non salvare atti fittizi.
6. Confermare che la web app ordinaria continui a funzionare e che il prezzo
   resti etichettato correttamente anche senza connessione.

La presenza del progetto non equivale a installazione o verifica già completata:
lo stato effettivo di build, firma e prove viene riportato alla consegna.
