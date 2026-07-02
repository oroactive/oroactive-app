const state = {
  step: 0,
  signatures: [false, false, false, false],
  attachments: 0,
  cededItems: 1,
  annualProgressive: 184,
  uploadedCaptures: new Set(),
  captureFiles: new Map(),
  lastSearchResults: [],
  editingPracticeNumber: null,
  authToken: "",
  currentUser: null,
  syncTimer: null,
  appVersionTimer: null,
  clientVersion: null,
  serverVersion: null,
  updateAvailable: false,
  serviceWorkerReloading: false,
  actsCache: new Map(),
  archivePage: 1,
  archivePageSize: 10,
  searchActive: false,
  editingActId: null,
  editingOriginalStatus: "",
  editingApprovalStatus: "",
  editingApprovalRequestId: null,
  editingDirty: false,
  suppressDirtyTracking: false,
  loggingIn: false,
  splashStartedAt: 0,
  splashReady: false,
  splashError: null,
  cashLimitWarningShown: false,
  amlCashCheck: null,
  amlCashCheckTimer: null,
  amlCashCheckLoading: false,
  aurumShield: null,
  aurumShieldTimer: null,
  aurumShieldSettings: null,
  aurumShieldAlerts: [],
  guidedQualityCheck: null,
  guidedQualityTimer: null,
  guidedQualityLoading: false,
  bullionVaultPrices: {},
  goldPredictionStatus: null,
  goldPredictionHistory: [],
  goldPredictionLatest: [],
  goldPredictionSettings: null,
  metalPredictionHistory: {},
  metalPredictionLatest: {},
  buybackPolicy: null,
  buybackCalculations: [],
  buybackScenario: "standard",
  competitorSources: [],
  competitorQuotes: [],
  competitorAiStatus: null,
  competitorAiQuotes: [],
  competitorExtractionRules: [],
  competitorExtractionResults: {},
  competitorStats: {},
  buybackSimulationContext: null,
  lastActCaptureAttachments: [],
  loadedSignatureImages: [],
  saving: false,
  savingUser: false,
  clientLookupTimer: null,
  fiscalCodeEditedManually: false,
  captureGroup: null,
  assistantMessages: [],
  aiBooks: [],
  aiStatus: null,
  knowledgeNotes: [],
  aiFeedback: [],
  stores: [],
  dashboard: null,
  founderReports: [],
  founderReport: null,
  antifraudAlerts: [],
  trainingCourses: [],
  trainingScenarios: [],
  operatorTrainingResults: [],
  operatorTeamTrainingResults: [],
  activeTrainingSession: null,
  activeTrainingData: null,
  courseFaculties: [],
  courseCategories: [],
  courseSections: [],
  courseProgress: [],
  courseCertificates: [],
  courseBadges: [],
  academyQualificationSettings: { enabled: true, mode: "shadow", pilot_mode: false },
  academyLearningPath: null,
  academyNextObjective: null,
  academyCompetencies: [],
  academyPracticalAssessments: [],
  academyOperationalCapabilities: [],
  academySimulationScenarios: [],
  academyExamHistory: [],
  academyFounderDashboard: null,
  courseActiveTab: "catalog",
  coinCatalogSearch: "",
  coinCatalogCountry: "",
  coinCatalogPurity: "",
  coinSelectedId: "sterlina-oro-sovrana",
  coinIdentification: null,
  aurumBlocksConfig: null,
  aurumBlocksQuestions: [],
  aurumBlocksSession: null,
  aurumBlocksGame: null,
  aurumBlocksLoop: null,
  aurumBlocksScores: [],
  aurumBlocksBestScore: 0,
  aurumBlocksBestScoreRow: null,
  aurumBlocksLeaderboard: [],
  aurumBlocksBadges: [],
  aurumBlocksQuestionOpen: false,
  aurumBlocksTouchStart: null,
  gamingOverview: null,
  users: [],
  userActivities: new Map(),
  crmClients: [],
  crmSearchTimer: null,
  backups: [],
  storeHealth: [],
  storeHealthDateRange: null,
  storeHealthDetail: null,
  approvals: [],
  suspendedPractices: [],
  suspendedPagination: { page: 1, limit: 50, total: 0 },
  auditLogs: [],
  auditPagination: { page: 1, limit: 50, total: 0 },
  notifications: [],
  notificationUnreadCount: 0,
  notificationPagination: { page: 1, limit: 20, total: 0 },
  notificationTimer: null,
  fusionView: "stock",
  privacyPolicy: null,
  privacyAcceptance: null,
  privacyVersions: [],
  privacyAcceptances: [],
  privacyNoticeShown: false,
  clockTimer: null,
  aurumSettings: null,
  aurumCurrentSection: "menu",
  aurumTipTimer: null,
  aurumTipHideTimer: null,
  aurumMovementTimer: null,
  aurumLookTimer: null,
  aurumTipIndex: 0,
  aurumPositionIndex: 0,
  aurumMessages: [],
  aurumMode: "",
  aurumPriceContext: null,
  aurumLastPriceContext: null,
  aurumSending: false,
  aurumAskedMoodToday: false,
  aurumLastUserMessage: "",
  aurumConsentCandidate: null,
  aurumMemories: [],
  aurumAllMemories: [],
  aurumSupportRequests: [],
  aurumActiveQuiz: null,
  aurumQuizIndex: 0,
  aurumFloatingPosition: null,
  aurumDragState: null,
  aurumSuppressNextClick: false,
  aurumAvoidActive: false,
  aurumAutoMoved: false,
  aurumAvoidFrame: null,
  bullionChartLoaded: false,
  pendingSync: [],
  syncingPending: false,
  sessionTimeoutTimer: null,
  clientVersion: null,
  serverVersion: null,
  appUpdateAvailable: false,
  appUpdateBannerDismissed: false,
  appUpdateTimer: null,
  appUpdateLastCheckedAt: null,
  tutorial: {
    active: false,
    source: "",
    id: "",
    index: 0,
    steps: [],
    pendingFirstRun: false
  }
};

window.__OROACTIVE_DIRTY_STATE__ = false;
window.__OROACTIVE_VERSION__ = null;

const SIGNATURE_LABELS = ["Firma vendita", "Firma dichiarazioni", "Firma privacy", "Firma operatore"];
const REQUIRED_SIGNATURES = SIGNATURE_LABELS.length;
const OROACTIVE_WEBSITE_URL = "http://wcfme33owxz0wfkr0ysnzthy.188.213.161.151.sslip.io/";
const PRIVACY_POLICY_FALLBACK = {
  version: "v1.0",
  updated_at: "2026-05-29",
  title: "Privacy Policy e Informativa sul trattamento dei dati personali — OroActive",
  subtitle: "Informativa ai sensi del Regolamento UE 2016/679 (GDPR) e della normativa applicabile in materia di protezione dei dati personali.",
  note: "Questa informativa descrive come OroActive tratta i dati personali all'interno dell'app gestionale e nei processi collegati agli atti di vendita, alla gestione clienti, alla formazione, alla sicurezza operativa e alle funzionalità AI.",
  controller: {
    company_name: "[INSERIRE RAGIONE SOCIALE]",
    legal_address: "[INSERIRE INDIRIZZO]",
    privacy_email: "[INSERIRE EMAIL PRIVACY]",
    pec: "[INSERIRE PEC]",
    vat: "[INSERIRE DATI]",
    status: "Da completare"
  },
  sections: [
    { id: "utenti-app", tab: "Informativa utenti app", title: "1. Titolare del trattamento", badge: "Da completare", paragraphs: ["Il Titolare del trattamento è [INSERIRE RAGIONE SOCIALE], con sede legale in [INSERIRE INDIRIZZO]. Email privacy: [INSERIRE EMAIL PRIVACY]. PEC: [INSERIRE PEC]. P.IVA / C.F.: [INSERIRE DATI].", "I dati sopra indicati devono essere completati dal Founder o dal consulente privacy prima dell'utilizzo definitivo."] },
    { id: "clienti-atti", tab: "Informativa clienti / atti di vendita", title: "2. Quali dati trattiamo", paragraphs: ["L'app OroActive può trattare dati degli utenti dell'app, dati dei clienti collegati agli atti di vendita, dati tecnici e dati relativi alle funzionalità AI e Aurum."], groups: [
      { title: "Dati degli utenti dell'app", items: ["nome e cognome", "username/email", "ruolo operativo", "negozio assegnato", "telefono se inserito", "stato online/offline", "attività svolte nell'app", "log accessi", "autorizzazioni, notifiche e audit trail", "risultati formazione Academy", "badge e certificazioni interne"] },
      { title: "Dati dei clienti negli atti di vendita", items: ["nome e cognome", "codice fiscale", "data e luogo di nascita", "indirizzo di residenza", "telefono/email se richiesti", "dati documento di identità", "immagini documento/tessera sanitaria se acquisite", "firme", "dati relativi agli oggetti preziosi ceduti", "foto preziosi", "dati pagamento", "IBAN o contabili se necessari", "numero pratica / atto di vendita", "storico operazioni collegate al cliente"] },
      { title: "Dati tecnici e di sicurezza", items: ["indirizzo IP", "browser/dispositivo", "data e ora accesso", "log di sistema", "audit log", "attività utente", "errori applicativi", "notifiche operative", "stato sessione"] },
      { title: "Dati relativi ad AI e Aurum", items: ["domande inviate all'assistente", "risposte generate", "contesto operativo non sensibile", "memorie salvate solo se l'utente ha dato consenso", "preferenze operative condivise volontariamente dall'utente"] }
    ], closing: "OroActive non deve utilizzare l'AI per trattare dati sensibili non necessari o documenti personali senza specifica necessità operativa e senza adeguate misure di protezione." },
    { id: "finalita", tab: "Dati trattati", title: "3. Perché trattiamo i dati", items: ["gestione degli utenti dell'app", "autenticazione e controllo accessi", "gestione ruoli e permessi", "compilazione e conservazione degli atti di vendita", "identificazione del cliente", "adempimenti normativi e amministrativi", "gestione pagamenti", "generazione PDF e copie cliente/azienda", "gestione CRM clienti", "controllo qualità pratica", "sicurezza operativa", "prevenzione errori, frodi e anomalie", "gestione giacenza e fusioni", "gestione backup", "audit trail e tracciamento attività", "notifiche interne", "formazione interna OroActive Academy", "supporto operativo tramite Aurum/AI", "generazione Customer Trust Pack", "statistiche interne autorizzate per Founder/Responsabili"] },
    { id: "basi-giuridiche", tab: "Finalità e basi giuridiche", title: "4. Base giuridica del trattamento", paragraphs: ["Il trattamento può fondarsi su esecuzione di misure contrattuali o precontrattuali, adempimento di obblighi legali, legittimo interesse del Titolare alla sicurezza, organizzazione, controllo qualità, tutela aziendale e prevenzione di abusi, consenso dell'interessato quando richiesto, e necessità di accertare, esercitare o difendere un diritto in sede competente."], closing: "Le basi giuridiche devono essere verificate e confermate dal consulente privacy in base al modello operativo definitivo." },
    { id: "modalita", tab: "Conservazione dati", title: "5. Come vengono trattati i dati", paragraphs: ["I dati sono trattati con strumenti informatici e telematici, mediante accesso autenticato all'app OroActive. L'accesso è regolato da ruoli e permessi, in modo che ogni utente possa vedere solo le informazioni necessarie alla propria funzione.", "L'app può registrare attività operative, modifiche, salvataggi, eliminazioni, stampe, accessi, autorizzazioni e altre azioni rilevanti per garantire sicurezza, tracciabilità e controllo interno."] },
    { id: "conservazione", tab: "Conservazione dati", title: "6. Per quanto tempo conserviamo i dati", paragraphs: ["I dati sono conservati per il tempo necessario alle finalità per cui sono stati raccolti, agli obblighi normativi applicabili, alla tutela dei diritti del Titolare e alla corretta gestione delle pratiche aziendali."], items: ["atti di vendita e documenti collegati: secondo obblighi normativi e policy aziendale", "dati utenti: per tutta la durata del rapporto operativo e successivamente per esigenze di sicurezza/audit", "audit log: per esigenze di tracciabilità e sicurezza", "backup: secondo policy interna di conservazione e verifica", "dati Academy: per mantenere storico formativo e certificazioni interne", "memorie Aurum: fino a cancellazione da parte dell'utente o disattivazione memoria"], closing: "Le tempistiche definitive devono essere confermate dal consulente privacy." },
    { id: "comunicazione", tab: "Sicurezza", title: "7. A chi possono essere comunicati i dati", items: ["personale autorizzato OroActive", "Founder, responsabili e supervisori secondo permessi", "fornitori tecnici dell'app", "hosting provider", "fornitori backup/storage", "consulenti fiscali/legali/amministrativi", "autorità competenti quando previsto dalla legge", "servizi di pagamento o strumenti collegati se necessari", "fornitori AI solo nei limiti tecnici e con minimizzazione dei dati"], closing: "Non vengono comunicati dati personali a soggetti non autorizzati." },
    { id: "ai-aurum", tab: "AI, Aurum e automazioni", title: "8. Funzionalità AI e Aurum", paragraphs: ["OroActive può includere funzionalità di assistenza AI tramite Aurum, assistente operativo interno. Aurum può aiutare l'utente a comprendere sezioni, compilare correttamente le pratiche, consultare procedure e ricevere suggerimenti operativi."], items: ["Aurum non sostituisce il giudizio umano", "Aurum non deve trattare dati cliente non necessari", "dati sensibili, documenti, firme, IBAN e codici fiscali devono essere minimizzati", "le memorie personali dell'utente vengono salvate solo se l'utente conferma esplicitamente", "l'utente può visualizzare e cancellare le memorie Aurum", "eventuali domande e risposte possono essere registrate per sicurezza, miglioramento e tracciabilità nel rispetto delle policy interne"] },
    { id: "sicurezza", tab: "Sicurezza", title: "9. Misure di sicurezza", paragraphs: ["OroActive adotta misure tecniche e organizzative per proteggere i dati personali."], items: ["accesso con credenziali", "ruoli e permessi", "tracciamento attività tramite Audit Trail", "backup", "controllo qualità", "autorizzazioni superiori per pratiche rischiose", "protezione file e documenti", "limitazione accessi in base al ruolo", "registrazione eventi critici", "controlli su operazioni anomale"], closing: "La sicurezza viene migliorata progressivamente in base all'evoluzione dell'app e delle esigenze operative." },
    { id: "diritti", tab: "Diritti privacy", title: "10. Diritti privacy", paragraphs: ["L'interessato può esercitare, nei limiti previsti dalla normativa, i diritti di accesso, rettifica, cancellazione, limitazione del trattamento, opposizione, portabilità ove applicabile, revoca del consenso ove il trattamento sia basato sul consenso e reclamo all'Autorità Garante per la protezione dei dati personali.", "Per esercitare i diritti: Email [INSERIRE EMAIL PRIVACY] - PEC [INSERIRE PEC]."] },
    { id: "cookie-pwa", tab: "Cookie / PWA / log tecnici", title: "11. Cookie, PWA e dati tecnici", paragraphs: ["L'app OroActive può utilizzare strumenti tecnici necessari al funzionamento, come cookie tecnici, localStorage, sessionStorage, service worker/PWA e log tecnici."], items: ["mantenere la sessione", "migliorare la navigazione", "salvare preferenze utente", "abilitare funzionalità PWA", "gestire aggiornamenti applicativi", "garantire sicurezza e continuità operativa"], closing: "Se in futuro verranno utilizzati strumenti di analytics, marketing o profilazione, dovrà essere predisposta informativa e consenso specifico ove richiesto." },
    { id: "versione", tab: "Versione documento", title: "12. Aggiornamenti della Privacy Policy", paragraphs: ["La presente informativa può essere aggiornata nel tempo. In caso di modifiche rilevanti, l'app potrà mostrare una richiesta di presa visione agli utenti al successivo accesso."] }
  ]
};
const ENABLE_AURUM_MASCOT = true;
const OROACTIVE_SPLASH_SESSION_KEY = "oroactive_splash_seen";
const OROACTIVE_SPLASH_MIN_MS = 5000;
const OROACTIVE_SPLASH_BRIEF_MS = 5000;
const OROACTIVE_SPLASH_READY_MS = 180;
const OROACTIVE_SPLASH_EXIT_MS = 430;
const OROACTIVE_UPDATE_INTERVAL_MS = 30000;
const AURUM_SETTINGS_KEY = "oroactive-aurum-settings";
const AURUM_FLOATING_POSITION_KEY = "aurum_floating_position";
const AURUM_AVOID_EVENT = "aurum:avoid-elements-updated";
const AURUM_SAFE_MARGIN = 12;
const AURUM_DEFAULT_OFFSET = 24;
const AURUM_AVOID_SELECTORS = [
  "[data-aurum-avoid='true']",
  ".aurum-avoid",
  ".autocomplete-list:not([hidden])",
  ".suggestion-list:not([hidden])",
  ".dropdown-menu:not([hidden])",
  ".field-tooltip:not([hidden])",
  ".field-error-popover:not([hidden])",
  ".operator-perfect-tooltip:not([hidden])",
  ".document-expiry-warning:not([hidden])",
  ".aml-cash-alert:not([hidden])",
  ".material-amount-panel:not([hidden])",
  ".guided-quality-actions:not([hidden])",
  ".quality-review-panel:not([hidden])",
  ".brand-dropdown:not([hidden])",
  ".main-user-dropdown:not([hidden])",
  ".notification-dropdown:not([hidden])"
];
const AURUM_ACTIVE_FIELD_SELECTOR = "#practice input, #practice select, #practice textarea, #practice button, #practice canvas";
const AURUM_DEFAULT_SETTINGS = {
  enabled: true,
  movement: true,
  greeting: true,
  memory: true
};
const AURUM_TIPS = [
  "Controlla sempre documento, firme e pagamento prima di archiviare.",
  "Ricorda il limite contanti negli ultimi 7 giorni.",
  "La trasparenza aumenta la fiducia del cliente.",
  "Prima di fondere, verifica bene la giacenza per caratura.",
  "Un cliente ricorrente va gestito con storico aggiornato.",
  "La precisione protegge l'operatore e il negozio."
];
const AURUM_SECTION_TIPS = {
  menu: [
    "Sono qui se vuoi orientarti tra atti, Academy, giacenza e AI.",
    "Tengo d'occhio il menu senza disturbare: scegli una sezione e ti accompagno."
  ],
  practice: [
    "Controlla documento, scadenza, firme e metodo di pagamento prima di completare.",
    "Ricorda di verificare il limite contanti negli ultimi 7 giorni."
  ],
  archive: [
    "Puoi aprire un atto in anteprima o riaprirlo per modificarlo.",
    "Gli atti eliminati non devono rientrare nei flussi operativi."
  ],
  fusion: [
    "Controlla sempre caratura e metallo prima di creare un lotto fusione.",
    "Prima di fondere, verifica che gli atti siano completati e non eliminati."
  ],
  crm: [
    "Aggiorna note cliente e storico pagamento per mantenere dati puliti.",
    "Uno storico CRM chiaro rende piu semplice aiutare il cliente ricorrente."
  ],
  training: [
    "Puoi completare i corsi e ottenere badge interni OroActive.",
    "La formazione funziona meglio a piccoli blocchi, ma costanti."
  ],
  coinEncyclopedia: [
    "Per identificare una moneta confronta sempre foto, peso, diametro, bordo e titolo.",
    "La ricerca con fotocamera aiuta, ma la verifica fisica resta fondamentale."
  ],
  aurumBlocks: [
    "Aurum Blocks allena precisione, carature e riflessi senza toccare dati reali.",
    "Nel Training Carature rispondi alle domande rapide per ottenere bonus formativi."
  ],
  gaming: [
    "Gaming OroActive e un'area formativa: gioca solo nei momenti consentiti dal tuo responsabile.",
    "Aurum Blocks e l'unico gioco attivo: allena carature, precisione e riflessi senza creare dati operativi reali."
  ],
  users: [
    "Controlla ruoli e permessi prima di modificare un utente.",
    "Le attivita utente aiutano a capire cosa e successo senza confondere i reparti."
  ],
  backups: [
    "Ricorda di verificare il backup dopo averlo creato.",
    "Un backup utile deve avere dump, manifest e checksum coerenti."
  ],
  assistant: [
    "Posso usare le conoscenze approvate senza creare una seconda AI.",
    "Le risposte automatiche partono solo quando invii una domanda."
  ],
  antifraud: [
    "Gli alert antifrode devono ignorare atti eliminati o non piu operativi.",
    "Prima di agire su un alert, controlla documento, pagamenti e storico cliente."
  ],
  quotazione: [
    "Aggiorna le quotazioni prima di usare dati sensibili di vendita.",
    "Prezzi chiari e aggiornati proteggono cliente e operatore."
  ],
  dashboard: [
    "La dashboard deve contare solo dati reali e non eliminati.",
    "Se un valore sembra strano, conviene controllare filtri e periodo."
  ],
  storeHealth: [
    "La Salute Negozio unisce qualità, rischio, formazione, backup e performance.",
    "Uno score basso va letto partendo da pratiche sospese, alert critici e backup."
  ]
};
const AURUM_MENU_POSITIONS = [
  { x: 0, y: 0 },
  { x: -172, y: -118 },
  { x: -38, y: -218 },
  { x: -246, y: -36 },
  { x: -108, y: -72 }
];
const AURUM_SECTION_MAP = {
  practice: "nuovo_atto_vendita",
  archive: "elenco_atti",
  fusion: "giacenza",
  giacenza: "giacenza",
  fusioni: "fusioni",
  crm: "crm_clienti",
  users: "utenti",
  training: "academy",
  aurumBlocks: "academy",
  gaming: "academy",
  backups: "backup",
  quotazione: "quotazioni",
  aurumAdmin: "assistente_ai",
  dashboard: "dashboard",
  storeHealth: "dashboard",
  assistant: "assistente_ai",
  knowledgeNotes: "assistente_ai",
  antifraud: "elenco_atti"
};

const OROACTIVE_APP_GUIDE = {
  nuovo_atto_vendita: {
    title: "Nuovo Atto di Vendita",
    description: "Sezione per compilare, controllare, stampare, archiviare o completare un atto di vendita.",
    fields: ["nome", "cognome", "codice fiscale", "documento", "scadenza documento", "residenza", "provincia", "oggetti preziosi", "metallo", "titolo/caratura", "peso", "metodo pagamento", "IBAN", "contabile", "firma cliente", "controllo qualità"],
    actions: ["salva bozza", "chiudi e archivia", "completa pratica", "stampa copia cliente", "stampa copia aziendale", "elimina atto"],
    steps: ["Compila la scheda cliente", "Verifica documento e residenza", "Inserisci oggetti preziosi, metallo, titolo e peso", "Seleziona metodo pagamento e totale", "Carica documenti, foto preziosi e contabile se richiesta", "Fai firmare cliente e operatore", "Controlla riepilogo e checklist", "Stampa le copie necessarie", "Completa pratica oppure chiudi e archivia"],
    checks: ["documento valido", "codice fiscale coerente", "firme acquisite", "allegati presenti", "pagamento compilato", "limite contanti verificato"],
    commonErrors: ["documento scaduto", "firme mancanti", "contabile assente per pagamento tracciabile", "IBAN non valido", "totale non indicato"],
    permissions: ["commesso", "aiuto_commesso", "responsabile", "supervisore", "founder"]
  },
  elenco_atti: {
    title: "Elenco Atti",
    description: "Archivio operativo degli atti validi, divisi per negozio, stato e ricerca.",
    fields: ["numero pratica", "negozio", "cliente", "data creazione", "stato", "totale", "operatore"],
    actions: ["apri anteprima", "modifica o riapri", "elimina", "esporta PDF giornaliero", "esporta PDF mensile"],
    steps: ["Filtra per negozio se autorizzato", "Cerca numero pratica o cliente", "Usa Apri per sola lettura", "Usa Modifica/Riapri per lavorare sull'atto", "Elimina solo se hai permesso e conferma"],
    checks: ["non completare dall'elenco", "non duplicare numerazione", "atti eliminati esclusi dai flussi operativi"],
    commonErrors: ["atto non trovato", "permesso insufficiente", "ricerca troppo generica"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  },
  giacenza: {
    title: "Giacenza",
    description: "Vista dei preziosi collegati ad atti completati e non eliminati, per metallo, titolo e negozio.",
    fields: ["negozio", "metallo", "titolo/caratura", "grammi", "atto collegato", "stato fusione"],
    actions: ["filtra negozio", "controlla materiale", "prepara fusione"],
    steps: ["Scegli negozio o tutti i negozi", "Controlla grammi per metallo e titolo", "Verifica che l'atto collegato sia completato", "Usa i dati per pianificare fusioni coerenti"],
    checks: ["atti eliminati esclusi", "titolo corretto", "grammi coerenti", "nessun materiale già fuso"],
    commonErrors: ["conteggi fantasma da atti eliminati", "caratura non coerente", "negozio errato"],
    permissions: ["responsabile", "supervisore", "founder"]
  },
  fusioni: {
    title: "Fusioni",
    description: "Gestione lotti e materiale da fondere partendo da giacenza valida.",
    fields: ["lotto fusione", "metallo", "caratura", "grammi", "raffineria", "storico"],
    actions: ["seleziona materiale", "genera lotto", "crea PDF fusione", "consulta storico raffineria"],
    steps: ["Verifica la giacenza valida", "Separa materiale per metallo e caratura", "Seleziona gli atti/materiali da includere", "Genera il lotto", "Stampa o salva PDF fusione", "Aggiorna storico raffineria"],
    checks: ["solo atti completati", "nessun atto eliminato", "nessun materiale già stornato"],
    commonErrors: ["materiale duplicato", "caratura mista", "lotto incompleto"],
    permissions: ["responsabile", "supervisore", "founder"]
  },
  crm_clienti: {
    title: "CRM Clienti",
    description: "Storico clienti, note operative, documenti, pagamenti e negozi visitati.",
    fields: ["cliente", "codice fiscale", "telefono", "note", "storico atti", "pagamenti", "prossima azione"],
    actions: ["cerca cliente", "apri dettaglio", "modifica cliente", "aggiungi nota", "elimina cliente se autorizzato"],
    steps: ["Cerca cliente per nome o codice fiscale", "Apri la scheda", "Aggiorna note e prossima azione", "Controlla storico pagamenti e negozi", "Salva modifiche"],
    checks: ["dati coerenti", "note utili e non superflue", "codice fiscale non duplicato"],
    commonErrors: ["cliente non trovato", "codice fiscale mancante", "note non salvate"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  },
  utenti: {
    title: "Utenti",
    description: "Gestione utenti, ruoli, negozi assegnati, stato online/offline e attività.",
    fields: ["nome", "cognome", "username", "ruolo", "negozio", "telefono", "note", "stato attivo"],
    actions: ["crea utente", "modifica utente", "disattiva utente", "apri attività", "controlla stato online"],
    steps: ["Controlla il ruolo del tuo account", "Crea o seleziona utente", "Imposta ruolo e negozio", "Salva", "Controlla attività se autorizzato"],
    checks: ["username univoco", "ruolo coerente", "negozio valido", "permessi rispettati"],
    commonErrors: ["username già presente", "ruolo mancante", "negozio non valido", "non autorizzato"],
    permissions: ["responsabile", "supervisore", "founder"]
  },
  academy: {
    title: "OroActive Academy",
    description: "Catalogo corsi, certificazioni, badge e gestione formazione.",
    fields: ["catalogo corsi", "certificazioni", "badge", "materiali"],
    actions: ["apri corso", "sostieni esame", "modifica corso", "elimina corso"],
    steps: ["Apri catalogo Academy", "Scegli un corso disponibile", "Consulta materiali e lezioni", "Sostieni verifica se prevista", "Controlla badge e certificazioni"],
    checks: ["materiali validi", "corso attivo", "permesso gestione Academy"],
    commonErrors: ["file non valido", "corso non trovato", "permesso insufficiente"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  },
  training_operatore: {
    title: "Training Operatore",
    description: "Ambiente demo per esercitarsi nella compilazione di un atto senza creare dati reali.",
    fields: ["scenario", "atto demo", "controllo qualità demo", "Aurum Shield demo", "punteggio", "feedback"],
    actions: ["avvia training", "salva progresso demo", "completa training", "rivedi errori"],
    steps: ["Scegli uno scenario", "Avvia training", "Correggi i dati demo", "Esegui controllo qualità", "Gestisci rischio demo", "Completa e leggi feedback Aurum"],
    checks: ["nessun atto reale", "nessun CRM reale", "nessuna giacenza reale", "nessun Trust Pack reale"],
    commonErrors: ["documento scaduto non corretto", "contabile mancante", "firme mancanti", "rischio ignorato"],
    permissions: ["aiuto_commesso", "commesso", "responsabile", "supervisore", "founder"]
  },
  backup: {
    title: "Backup",
    description: "Backup manuali verificabili con manifest, checksum, download e test restore.",
    fields: ["codice backup", "stato", "verifica integrità", "test restore", "dimensione", "manifest"],
    actions: ["crea nuovo backup", "verifica backup", "scarica backup", "test restore", "elimina backup"],
    steps: ["Clicca Crea nuovo backup", "Attendi stato completato", "Verifica integrità", "Scarica se sei Founder", "Avvia test restore solo da Founder se serve", "Elimina solo se autorizzato"],
    checks: ["database.dump presente", "manifest presente", "checksum coerente", "file non pubblico"],
    commonErrors: ["pg_dump non disponibile", "checksum non corrispondente", "backup non trovato"],
    permissions: ["responsabile", "founder"]
  },
  quotazioni: {
    title: "Quotazioni",
    description: "Prezzi e grafici di oro, argento e platino.",
    fields: ["oro", "argento", "platino", "grafico", "fonte quotazione"],
    actions: ["aggiorna quotazioni", "apri grafico esterno"],
    steps: ["Apri Quotazioni", "Clicca Aggiorna quotazioni", "Controlla metallo e valore", "Usa dati aggiornati nelle valutazioni"],
    checks: ["fonte disponibile", "dato aggiornato", "connessione attiva"],
    commonErrors: ["quotazione non disponibile", "grafico non incorporabile"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  },
  customer_trust_pack: {
    title: "Customer Trust Pack",
    description: "Pacchetto cliente post-vendita con riepilogo trasparente, copia cliente, contatti e FAQ.",
    fields: ["codice Trust Pack", "numero atto", "dati negozio", "riepilogo vendita", "metodo pagamento", "contatti"],
    actions: ["genera Trust Pack", "scarica PDF", "prepara WhatsApp", "invio email se configurato"],
    steps: ["Completa o archivia l'atto", "Apri l'atto dall'elenco", "Clicca Genera Customer Trust Pack", "Scarica il PDF", "Invialo manualmente o prepara WhatsApp"],
    checks: ["atto completato o archiviato", "atto non eliminato", "dati cliente e pagamento presenti", "nessun dato interno nel PDF"],
    commonErrors: ["atto non completato", "PDF non disponibile", "invio email non configurato"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  },
  dashboard: {
    title: "Dashboard",
    description: "KPI, fatturato, grammi acquistati, pagamenti, ranking e controlli direzionali.",
    fields: ["fatturato", "grammi", "pagamenti", "ranking negozi", "operatori", "periodo"],
    actions: ["consulta KPI", "analizza negozi", "controlla performance"],
    steps: ["Apri Dashboard", "Controlla periodo e negozio", "Leggi KPI principali", "Approfondisci ranking e operatori", "Verifica dati anomali"],
    checks: ["solo atti completati e non eliminati", "periodo corretto", "negozio corretto"],
    commonErrors: ["dati non aggiornati", "filtri errati", "conteggi da atti eliminati"],
    permissions: ["responsabile", "supervisore", "founder"]
  },
  assistente_ai: {
    title: "Assistente IA OroActive",
    description: "Chat AI, knowledge base, feedback e formazione operativa.",
    fields: ["domanda", "modalità", "knowledge base", "feedback", "conoscenze approvate"],
    actions: ["invia domanda", "approva conoscenza", "elimina feedback", "carica libro", "rigenera embeddings"],
    steps: ["Scrivi domanda precisa", "Controlla risposta e fonte", "Lascia feedback se utile", "Trasforma feedback in conoscenza solo se approvata", "Aggiorna knowledge base da Founder"],
    checks: ["non inviare dati sensibili non necessari", "fonte coerente", "risposta non generica"],
    commonErrors: ["AI non configurata", "knowledge base vuota", "file non valido"],
    permissions: ["commesso", "responsabile", "supervisore", "founder"]
  }
};
const AURUM_FIELD_HELP = {
  codice_fiscale: {
    labels: ["codice fiscale", "cf"],
    text: "Il codice fiscale identifica il cliente e collega la pratica allo storico CRM. Inseriscilo senza spazi; se il cliente è già presente, OroActive può recuperare l'anagrafica."
  },
  documento: {
    labels: ["documento", "tipo documento", "numero documento"],
    text: "Il documento serve a identificare il cliente. Compila tipo, numero, data rilascio e scadenza, poi allega fronte e retro quando richiesto."
  },
  scadenza_documento: {
    labels: ["scadenza documento", "data scadenza"],
    text: "La scadenza documento indica fino a quando il documento è valido. Se è scaduto, chiedi un documento valido prima di completare la pratica."
  },
  cittadinanza: {
    labels: ["cittadinanza", "nazionalità", "nazionalita"],
    text: "La cittadinanza completa l'anagrafica del cliente e aiuta a mantenere coerenti i dati dell'atto e del CRM."
  },
  residenza: {
    labels: ["residenza", "indirizzo"],
    text: "La residenza è l'indirizzo del cliente. Usa formato chiaro: via, numero civico e città, così la pratica resta leggibile e coerente."
  },
  provincia: {
    labels: ["provincia", "provincia residenza"],
    text: "La provincia è la sigla collegata al luogo o all'indirizzo del cliente. Serve per completare correttamente l'anagrafica."
  },
  oggetti_preziosi: {
    labels: ["oggetti preziosi", "oggetti ceduti", "preziosi"],
    text: "Qui descrivi i preziosi ceduti dal cliente. Ogni oggetto deve avere descrizione, metallo e titolo/caratura corretti."
  },
  metallo: {
    labels: ["metallo", "oro", "argento", "platino"],
    text: "Il metallo indica il materiale dell'oggetto: oro, argento o platino. È essenziale per calcolare valore, giacenza e fusione."
  },
  titolo_caratura: {
    labels: ["titolo", "caratura", "18kt", "18 kt"],
    text: "Il titolo/caratura indica la purezza del metallo. 18kt significa 18 parti di oro puro su 24, circa il 75%."
  },
  peso: {
    labels: ["peso", "grammi", "grammo"],
    text: "Il peso indica quanti grammi di materiale vengono acquistati. Deve essere coerente con metallo e titolo perché alimenta giacenza e fusioni."
  },
  metodo_pagamento: {
    labels: ["metodo pagamento", "pagamento"],
    text: "Il metodo pagamento indica come viene corrisposto il totale: bonifico, contanti nei limiti di legge o assegno. Controlla sempre limite contanti e contabile quando serve."
  },
  iban: {
    labels: ["iban"],
    text: "L'IBAN va compilato quando il pagamento richiede un conto di destinazione, ad esempio bonifico. Inseriscilo completo e senza dati superflui nelle note."
  },
  contabile: {
    labels: ["contabile", "ricevuta", "prova pagamento"],
    text: "Nel campo Contabile carichi la prova del pagamento tracciabile, ad esempio ricevuta bonifico o assegno."
  },
  firma_cliente: {
    labels: ["firma cliente", "firme", "firma"],
    text: "Le firme confermano vendita, dichiarazioni, privacy e operatore. Devono essere acquisite prima di completare correttamente l'atto."
  },
  controllo_qualita: {
    labels: ["controllo qualità", "controllo qualita", "quality"],
    text: "Il controllo qualità consente ai ruoli autorizzati di validare o segnalare problemi sull'atto, soprattutto prima o dopo completamento."
  },
  stato_atto: {
    labels: ["stato atto", "stato pratica"],
    text: "Lo stato indica se l'atto è archiviato, completato o eliminato. Gli atti eliminati non devono apparire nei flussi operativi."
  },
  giacenza: {
    labels: ["giacenza"],
    text: "La giacenza mostra i preziosi derivati da atti completati e non eliminati, separati per negozio, metallo e caratura."
  },
  lotto_fusione: {
    labels: ["lotto fusione", "fusione", "lotto"],
    text: "Il lotto fusione raggruppa materiale da fondere. Prima di generarlo, controlla caratura, grammi, negozio e atti collegati."
  },
  badge: {
    labels: ["badge"],
    text: "I badge sono riconoscimenti interni Academy collegati a formazione, completamenti o competenze operative."
  },
  certificazione: {
    labels: ["certificazione", "certificazioni"],
    text: "Le certificazioni attestano il completamento di percorsi o verifiche Academy e aiutano a monitorare la crescita operativa."
  }
};
const AURUM_HELP_TARGETS = [
  { key: "codice_fiscale", selector: '[name="cf"]' },
  { key: "documento", selector: "#documentType, [name='numeroDocumento']" },
  { key: "scadenza_documento", selector: '[name="scadenzaDocumento"]' },
  { key: "cittadinanza", selector: '[name="cittadinanza"]' },
  { key: "residenza", selector: '[name="indirizzo"]' },
  { key: "provincia", selector: "#residenceProvince, #birthProvince" },
  { key: "oggetti_preziosi", selector: "#cededItemsTable" },
  { key: "peso", selector: "#totalWeightFields" },
  { key: "metodo_pagamento", selector: "#paymentMethod" },
  { key: "iban", selector: "#paymentIban" },
  { key: "contabile", selector: "#paymentCaptureSection" },
  { key: "firma_cliente", selector: ".signature-grid" },
  { key: "controllo_qualita", selector: "#qualityReviewPanel" },
  { key: "stato_atto", selector: "#archiveGroups" },
  { key: "giacenza", selector: "#fusionGroups" },
  { key: "badge", selector: "#courseSummary" },
  { key: "certificazione", selector: "#courseSummary" }
];
const AURUM_TUTORIAL_TO_GUIDE = {
  tutorial_compila_atto: "nuovo_atto_vendita",
  tutorial_stampa_copia_cliente: "nuovo_atto_vendita",
  tutorial_stampa_copia_aziendale: "nuovo_atto_vendita",
  tutorial_elenco_atti: "elenco_atti",
  tutorial_giacenza: "giacenza",
  tutorial_fusioni: "fusioni",
  tutorial_crm: "crm_clienti",
  tutorial_academy: "academy",
  tutorial_backup: "backup",
  tutorial_utenti: "utenti"
};
const AURUM_LIVE_TUTORIALS = {
  tutorial_compila_atto: {
    title: "Compilazione atto di vendita",
    intro: "Ti guido passo passo nella compilazione dell'atto di vendita.",
    steps: [
      { title: "Apri Nuovo Atto", text: "La pratica si compila dalla sezione Atto di Vendita. Controlla negozio, numero provvisorio, data e ora.", screen: "practice", practiceStep: 0, selector: ".practice-meta" },
      { title: "Dati cliente", text: "Compila nome, cognome e codice fiscale. Se il cliente esiste già, l'app può recuperare i dati CRM.", screen: "practice", practiceStep: 0, selector: '[data-aurum-help="codice_fiscale"]' },
      { title: "Documento", text: "Inserisci tipo, numero, rilascio e scadenza documento. Se è scaduto, chiedi un documento valido.", screen: "practice", practiceStep: 0, selector: '[data-aurum-help="documento"]' },
      { title: "Residenza", text: "Completa indirizzo e provincia di residenza in modo leggibile e coerente.", screen: "practice", practiceStep: 0, selector: '[data-aurum-help="residenza"]' },
      { title: "Oggetti preziosi", text: "Aggiungi descrizione, metallo e titolo/caratura per ogni oggetto ceduto.", screen: "practice", practiceStep: 0, selector: '[data-aurum-help="oggetti_preziosi"]' },
      { title: "Pagamento", text: "Scegli metodo pagamento, inserisci totale e IBAN/contabile quando richiesti.", screen: "practice", practiceStep: 1, selector: '[data-aurum-help="metodo_pagamento"]' },
      { title: "Documenti e foto", text: "Carica documento, tessera sanitaria, foto preziosi e contabile se prevista.", screen: "practice", practiceStep: 3, selector: ".capture-grid" },
      { title: "Firme", text: "Fai firmare cliente e operatore nelle aree previste prima di completare.", screen: "practice", practiceStep: 2, selector: '[data-aurum-help="firma_cliente"]' },
      { title: "Controllo e chiusura", text: "Nel riepilogo controlla checklist, stampa copie e poi completa o archivia.", screen: "practice", practiceStep: 4, selector: ".print-box" }
    ]
  },
  tutorial_stampa_copia_cliente: {
    title: "Stampa copia cliente",
    intro: "Ti mostro come stampare o salvare la copia cliente.",
    steps: [
      { title: "Apri l'atto", text: "Apri l'atto da Elenco o resta nel riepilogo se lo stai compilando.", screen: "archive", selector: "#archiveGroups" },
      { title: "Controlla dati", text: "Verifica cliente, vendita, oggetti, pagamento e firme prima della stampa.", screen: "practice", practiceStep: 4, selector: ".summary-grid" },
      { title: "Copia cliente", text: "Clicca Stampa Copia cliente o apri l'anteprima copia cliente.", screen: "practice", practiceStep: 4, selector: "#printCustomerCopySummary" },
      { title: "Anteprima", text: "Controlla l'anteprima: deve contenere solo i dati previsti per il cliente.", screen: "practice", practiceStep: 4, selector: ".print-box" },
      { title: "Stampa o PDF", text: "Se l'anteprima è corretta, stampa o salva PDF dal browser/dispositivo.", screen: "practice", practiceStep: 4, selector: ".print-box" }
    ]
  },
  tutorial_stampa_copia_aziendale: {
    title: "Stampa copia aziendale",
    intro: "Ti mostro come stampare o salvare la copia aziendale interna.",
    steps: [
      { title: "Apri o completa riepilogo", text: "La copia aziendale si controlla dal riepilogo dell'atto o dall'anteprima dell'atto archiviato.", screen: "practice", practiceStep: 4, selector: ".summary-grid" },
      { title: "Controlla dati interni", text: "Verifica cliente, vendita, pagamento, allegati, foto preziosi e note operative.", screen: "practice", practiceStep: 4, selector: ".summary-grid" },
      { title: "Copia aziendale", text: "Clicca Stampa Copia aziendale o apri l'anteprima copia aziendale.", screen: "practice", practiceStep: 4, selector: "#printCompanyCopySummary" },
      { title: "Anteprima interna", text: "La copia aziendale può includere contenuti interni che non vanno confusi con la copia cliente.", screen: "practice", practiceStep: 4, selector: ".print-box" },
      { title: "Stampa o PDF", text: "Se l'anteprima è corretta, stampa o salva PDF per archivio aziendale.", screen: "practice", practiceStep: 4, selector: ".print-box" }
    ]
  },
  tutorial_elenco_atti: {
    title: "Sezione Elenco Atti",
    intro: "Ti spiego come usare l'elenco senza modificare per errore una pratica.",
    steps: [
      { title: "Filtro negozio", text: "Se autorizzato, scegli il negozio; altrimenti vedi solo ciò che il ruolo permette.", screen: "archive", selector: "#archiveStoreFilter" },
      { title: "Ricerca", text: "Cerca per cliente, numero pratica o parola chiave quando l'elenco è lungo.", screen: "archive", selector: "#searchKeyword" },
      { title: "Apri", text: "Apri mostra l'anteprima sola lettura dell'atto.", screen: "archive", selector: "#archiveGroups" },
      { title: "Modifica/Riapri", text: "Modifica o Riapri carica l'atto nella sezione Atto di Vendita senza duplicarlo.", screen: "archive", selector: "#archiveGroups" },
      { title: "Elimina", text: "Elimina rimuove l'atto dai flussi operativi solo dopo conferma e permessi corretti.", screen: "archive", selector: "#archiveGroups" }
    ]
  },
  tutorial_giacenza: {
    title: "Sezione Giacenza",
    intro: "Ti guido nella lettura della giacenza per metallo, titolo e negozio.",
    steps: [
      { title: "Filtro negozio", text: "Scegli il negozio o Tutti se il tuo ruolo lo consente.", screen: "giacenza", selector: "#fusionStoreFilter" },
      { title: "Metallo e titolo", text: "Leggi grammi separati per metallo e caratura/titolo.", screen: "giacenza", selector: "#fusionGroups" },
      { title: "Atti validi", text: "La giacenza deve includere solo atti completati e non eliminati.", screen: "giacenza", selector: "#fusionGroups" },
      { title: "Preparazione fusione", text: "Usa questi dati per preparare lotti coerenti e senza duplicazioni.", screen: "giacenza", selector: "#fusionGroups" }
    ]
  },
  tutorial_fusioni: {
    title: "Sezione Fusioni",
    intro: "Ti spiego come ragionare sui lotti fusione partendo dalla giacenza valida.",
    steps: [
      { title: "Controlla giacenza", text: "Prima di fondere verifica metallo, caratura, grammi e negozio.", screen: "fusioni", selector: "#fusionGroups" },
      { title: "Separa materiale", text: "Non mischiare carature o materiali diversi nello stesso controllo operativo.", screen: "fusioni", selector: "#fusionGroups" },
      { title: "Genera lotto", text: "Crea il lotto solo quando gli atti sono completati, non eliminati e non già stornati.", screen: "fusioni", selector: "#fusionGroups" },
      { title: "PDF e storico", text: "Salva PDF fusione e aggiorna lo storico raffineria quando previsto.", screen: "fusioni", selector: "#fusionGroups" }
    ]
  },
  tutorial_crm: {
    title: "Sezione CRM",
    intro: "Ti guido nella gestione dello storico cliente.",
    steps: [
      { title: "Cerca cliente", text: "Usa ricerca per nome, telefono o codice fiscale senza inserire dati superflui.", screen: "crm", selector: "#crmSearch" },
      { title: "Apri dettaglio", text: "Controlla storico atti, pagamenti, note e negozi visitati.", screen: "crm", selector: "#crmList" },
      { title: "Modifica cliente", text: "Aggiorna solo dati utili e verificati.", screen: "crm", selector: "#crmList" },
      { title: "Note operative", text: "Scrivi note brevi e professionali, utili per la prossima interazione.", screen: "crm", selector: "#crmList" }
    ]
  },
  tutorial_academy: {
    title: "OroActive Academy",
    intro: "Ti spiego catalogo, corsi, badge e certificazioni.",
    steps: [
      { title: "Catalogo", text: "Apri il catalogo e scegli un corso disponibile.", screen: "training", selector: "#trainingList" },
      { title: "Certificazioni", text: "Le certificazioni confermano percorsi o esami completati.", screen: "training", selector: "#courseSummary" },
      { title: "Badge", text: "I badge mostrano competenze e traguardi interni.", screen: "training", selector: "#courseSummary" },
      { title: "Gestione Academy", text: "Solo ruoli autorizzati possono visualizzare, modificare o eliminare corsi.", screen: "training", selector: "#trainingList" }
    ]
  },
  tutorial_backup: {
    title: "Sezione Backup",
    intro: "Ti guido nel backup manuale e verificabile.",
    steps: [
      { title: "Crea backup", text: "Clicca Crea nuovo backup e attendi il completamento.", screen: "backups", selector: "#runBackupNow" },
      { title: "Verifica integrità", text: "Dopo la creazione, usa Verifica per controllare checksum e manifest.", screen: "backups", selector: "#backupsList" },
      { title: "Download", text: "Il download passa da endpoint autenticato ed è riservato ai ruoli previsti.", screen: "backups", selector: "#backupsList" },
      { title: "Test restore", text: "Solo Founder può avviare test restore su ambiente sicuro.", screen: "backups", selector: "#backupsList" },
      { title: "Elimina", text: "Elimina solo quando sei certo che il backup non serva più.", screen: "backups", selector: "#backupsList" }
    ]
  },
  tutorial_utenti: {
    title: "Sezione Utenti",
    intro: "Ti spiego ruoli, permessi, stato online e attività.",
    steps: [
      { title: "Lista utenti", text: "Vedi solo gli utenti consentiti dal tuo ruolo.", screen: "users", selector: "#usersList" },
      { title: "Ruoli", text: "Imposta ruolo corretto: Founder, Supervisore, Responsabile, Commesso o Aiuto commesso.", screen: "users", selector: "#userRole" },
      { title: "Negozio", text: "Associa il negozio quando il ruolo non vede tutti i punti vendita.", screen: "users", selector: "#userStore" },
      { title: "Attività", text: "Apri Attività per vedere login, modifiche, stampe e operazioni disponibili.", screen: "users", selector: "#usersList" },
      { title: "Salva", text: "Salva e controlla che l'elenco si aggiorni senza errori di altre sezioni.", screen: "users", selector: "#userForm" }
    ]
  }
};
const AURUM_COMPRO_ORO_QUIZ = [
  {
    question: "Cosa indica la dicitura 18kt su un oggetto in oro?",
    accepted: ["75", "750", "18 parti", "18 su 24"],
    answer: "18kt indica 18 parti di oro puro su 24, cioe circa il 75% di oro, spesso espresso come titolo 750.",
    explanation: "E una base importante per distinguere titolo/caratura e calcolare correttamente valore e giacenza."
  },
  {
    question: "Prima di completare un atto di vendita, quali controlli operativi non devono mancare?",
    accepted: ["documento", "firme", "pagamento", "contabile", "limite contanti"],
    answer: "Prima di completare controlla documento valido, dati cliente, oggetti preziosi, pagamento, eventuale contabile, firme e limite contanti.",
    explanation: "Questi controlli proteggono operatore, cliente e azienda da errori o pratiche incomplete."
  },
  {
    question: "Perche giacenza e fusioni devono escludere un atto eliminato?",
    accepted: ["non esiste", "eliminato", "conteggi", "fantasma", "giacenza"],
    answer: "Perche un atto eliminato non fa piu parte dei flussi operativi: non deve generare giacenza, fusioni, dashboard o conteggi.",
    explanation: "Lasciarlo nei conteggi creerebbe materiale fantasma e dati economici non coerenti."
  },
  {
    question: "Che cosa va caricato nel campo contabile quando il pagamento e tracciabile?",
    accepted: ["ricevuta", "bonifico", "assegno", "prova", "pagamento"],
    answer: "Nel campo contabile va caricata la prova del pagamento tracciabile, ad esempio ricevuta bonifico o documentazione dell'assegno.",
    explanation: "Serve a tenere completa la pratica e a rendere verificabile il pagamento."
  },
  {
    question: "Qual e la differenza operativa tra Apri e Modifica/Riapri in Elenco Atti?",
    accepted: ["anteprima", "sola lettura", "modifica", "riapri", "atto"],
    answer: "Apri mostra l'anteprima in sola lettura; Modifica/Riapri carica l'atto nella sezione Atto di vendita per lavorarci senza creare duplicati.",
    explanation: "Questa distinzione evita modifiche accidentali e numerazioni duplicate."
  }
];

const GOLD_COIN_CATALOG = [
  {
    id: "sterlina-oro-sovrana",
    name: "Sterlina d'oro",
    country: "Regno Unito",
    mintYears: "1817-oggi",
    nominal: "1 Sovereign",
    metal: "Oro",
    purity: 0.9167,
    purityLabel: "22 kt / 916,7‰",
    grossWeight: 7.988,
    fineGold: 7.322,
    diameter: 22.05,
    edge: "Zigrinato",
    obverse: "Ritratto del sovrano britannico",
    reverse: "San Giorgio e il drago o stemma reale, secondo emissione",
    history: "La sovrana moderna nasce nel 1817 con la riforma monetaria britannica. E una delle monete d'oro piu diffuse nel mercato europeo e viene usata spesso come riferimento operativo per riconoscere peso, diametro e titolo 22 kt.",
    recognitionHints: ["sovrana", "sovereign", "san giorgio", "drago", "elizabeth", "victoria", "georgius"],
    visual: { front: "profile", back: "dragon", frontText: "SOV", backText: "G&D" }
  },
  {
    id: "marengo-20-lire-italia",
    name: "Marengo italiano 20 Lire",
    country: "Italia",
    mintYears: "1861-1927",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 6.4516,
    fineGold: 5.806,
    diameter: 21,
    edge: "Zigrinato o inciso, secondo emissione",
    obverse: "Ritratto del Re d'Italia",
    reverse: "Stemma sabaudo, valore 20 Lire e anno",
    history: "Il 20 Lire italiano segue lo standard dell'Unione Monetaria Latina. I tipi di Vittorio Emanuele II, Umberto I e Vittorio Emanuele III sono tra le monete piu ricorrenti nei controlli da banco.",
    recognitionHints: ["20 lire", "regno d'italia", "vittorio emanuele", "umberto", "stemma sabaudo"],
    visual: { front: "profile", back: "shield", frontText: "20L", backText: "SAV" }
  },
  {
    id: "marengo-20-lire-vittorio-emanuele-ii",
    name: "Marengo 20 Lire Vittorio Emanuele II",
    country: "Italia",
    mintYears: "1861-1878",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Ritratto di Vittorio Emanuele II, Re d'Italia",
    reverse: "Stemma sabaudo coronato con collare dell'Annunziata, rami di alloro e valore L.20",
    history: "Il marengo italiano da 20 Lire nasce nello standard dell'Unione Monetaria Latina, con titolo 900‰, peso di circa 6,45 g e diametro di 21 mm. Le emissioni di Vittorio Emanuele II accompagnano i primi anni del Regno d'Italia: al dritto compare il profilo del primo re d'Italia, mentre al rovescio e raffigurato lo stemma sabaudo con valore L.20. Come gli altri marenghi europei, contiene circa 5,80 g di oro fino ed e una tipologia storica ricorrente nelle verifiche da banco.",
    recognitionHints: ["marengo", "20 lire", "vittorio emanuele ii", "vittorio emanuele", "regno d'italia", "regno d italia", "l.20", "l 20", "1874", "stemma sabaudo", "collare annunziata", "alloro", "italia"],
    visual: { front: "profile", back: "shield", frontText: "VEII", backText: "L20" }
  },
  {
    id: "marengo-20-lire-vittorio-emanuele-ii-regno-sardegna",
    name: "Marengo 20 Lire Vittorio Emanuele II Regno di Sardegna",
    country: "Italia",
    mintYears: "1849-1861",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Ritratto di Vittorio Emanuele II, Re di Sardegna",
    reverse: "Stemma sabaudo coronato con rami di alloro e valore L.20",
    history: "Il Marengo 20 Lire di Vittorio Emanuele II del Regno di Sardegna appartiene alle emissioni sabaude precedenti alla proclamazione del Regno d'Italia. Rientra nello standard dei marenghi europei: oro 900/1000, peso di circa 6,45 g, circa 5,80 g di oro fino e diametro di 21 mm. Al dritto presenta il profilo del sovrano con legenda VICTORIUS EMMANUEL II D.G. REX SARD. CYP. ET HIER., mentre al rovescio compare lo stemma sabaudo coronato con rami di alloro e valore L.20. E una tipologia utile da distinguere dal 20 Lire del Regno d'Italia per legenda e contesto storico.",
    recognitionHints: ["marengo", "20 lire", "vittorio emanuele ii", "vittorio emanuele", "regno di sardegna", "rex sard", "sardegna", "savoia", "l.20", "l 20", "1852", "stemma sabaudo", "alloro", "italia"],
    visual: { front: "profile", back: "shield", frontText: "VEIIS", backText: "L20" }
  },
  {
    id: "marengo-20-lire-vittorio-emanuele-iii-aratrice",
    name: "Marengo 20 Lire Vittorio Emanuele III Aratrice",
    country: "Italia",
    mintYears: "1910-1912",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Ritratto di Vittorio Emanuele III con legenda VITTORIO EMANUELE III",
    reverse: "Figura dell'Aratrice con aratro, fascio di spighe, valore Lire 20 e legenda REGNO D'ITALIA",
    history: "Il Marengo 20 Lire Vittorio Emanuele III Aratrice appartiene alle emissioni italiane in oro da 20 Lire coniate secondo lo standard dell'Unione Monetaria Latina: titolo 900/1000, peso di circa 6,45 g, circa 5,80 g di oro fino e diametro di 21 mm. Al dritto mostra il profilo di Vittorio Emanuele III; al rovescio la figura dell'Aratrice, allegoria agricola del Regno d'Italia, con aratro, spighe e valore Lire 20. E una tipologia riconoscibile per il rovescio figurativo, diverso dallo stemma sabaudo dei marenghi italiani piu comuni.",
    recognitionHints: ["marengo", "20 lire", "vittorio emanuele iii", "aratrice", "regno d'italia", "regno italia", "lire 20", "1912", "aratro", "spighe", "italia"],
    visual: { front: "profile", back: "figure", frontText: "VEIII", backText: "ARAT" }
  },
  {
    id: "100-lire-vittorio-emanuele-iii-fascione",
    name: "100 Lire Vittorio Emanuele III Fascione",
    country: "Italia",
    mintYears: "1923",
    nominal: "100 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 32.25,
    fineGold: 29.025,
    diameter: 35,
    edge: "Zigrinato",
    obverse: "Ritratto di Vittorio Emanuele III con legenda VITTORIO EMANUELE III RE D'ITALIA",
    reverse: "Fascio littorio con scure, valore Lire 100, data Ottobre 1922 - 1923 e segno R della Zecca di Roma",
    history: "La 100 Lire Vittorio Emanuele III Fascione fu coniata nel 1923 insieme al pezzo da 20 Lire dello stesso tipo per commemorare il primo anniversario della marcia su Roma del 28 ottobre 1922. Gli esemplari, originariamente satinati, non entrarono in circolazione perche il valore intrinseco dell'oro superava il valore nominale; la Zecca li distribui ai privati al prezzo di 400 Lire. La moneta ha titolo 900/1000, peso di 32,25 g e diametro di 35 mm.",
    recognitionHints: ["100 lire", "vittorio emanuele iii", "fascione", "lire 100", "ottobre 1922", "1923", "fascio", "scure", "regno d'italia", "italia"],
    visual: { front: "profile", back: "symbol", frontText: "VEIII", backText: "L100" }
  },
  {
    id: "40-lire-oro-napoleone-i",
    name: "40 Lire oro Napoleone I",
    country: "Italia",
    mintYears: "1810",
    nominal: "40 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 12.9,
    fineGold: 11.61,
    diameter: 26,
    edge: "Zigrinato",
    obverse: "Profilo di Napoleone Bonaparte verso sinistra con legenda NAPOLEONE IMPERATORE E RE, anno 1810 e segno di zecca M",
    reverse: "Stemma del Regno d'Italia con legenda REGNO D'ITALIA e valore 40 Lire",
    history: "Le 40 Lire oro Napoleone I del 1810 furono prodotte dalla zecca di Milano durante il Regno d'Italia napoleonico. Sono note anche come doppio marengo: valore nominale, peso e contenuto d'oro sono il doppio del marengo da 20 Lire. La tiratura indicata e' di 157.750 esemplari, rendendola comune ma molto ricercata da collezionisti e investitori. La moneta richiama il periodo in cui Napoleone, incoronato Re d'Italia nel Duomo di Milano il 26 maggio 1805 con la Corona Ferrea, governo' uno Stato satellite dell'Impero Francese. Ha titolo 900/1000, peso di 12,90 g, circa 11,60 g d'oro fino e diametro di 26 mm.",
    recognitionHints: ["40 lire", "napoleone i", "napoleone imperatore e re", "regno d'italia", "regno italia", "1810", "zecca milano", "segno m", "doppio marengo", "italia"],
    visual: { front: "profile", back: "coat", frontText: "NAP", backText: "40L" }
  },
  {
    id: "marengo-20-lire-carlo-alberto",
    name: "Marengo 20 Lire Carlo Alberto",
    country: "Italia",
    mintYears: "1831-1849",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Ritratto di Carlo Alberto, Re di Sardegna",
    reverse: "Stemma sabaudo coronato con rami di alloro e valore L.20",
    history: "Il marengo da 20 Lire di Carlo Alberto appartiene alla tradizione sabauda precedente al Regno d'Italia. Carlo Alberto di Savoia, padre di Vittorio Emanuele II, compare al dritto con legenda reale, mentre il rovescio riporta lo stemma sabaudo coronato, rami di alloro e valore L.20. Come gli altri marenghi europei nello standard latino, e una moneta in oro 900/1000 da circa 6,45 g, con circa 5,80 g di oro fino e diametro di 21 mm.",
    recognitionHints: ["marengo", "20 lire", "carlo alberto", "albertus", "rex sard", "regno di sardegna", "sardegna", "savoia", "l.20", "l 20", "1835", "stemma sabaudo", "alloro", "italia"],
    visual: { front: "profile", back: "shield", frontText: "CA", backText: "L20" }
  },
  {
    id: "marengo-20-lire-carlo-felice",
    name: "Marengo 20 Lire Carlo Felice",
    country: "Italia",
    mintYears: "1821-1831",
    nominal: "20 Lire",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Ritratto di Carlo Felice, Re di Sardegna",
    reverse: "Stemma sabaudo coronato con rami di alloro e valore L.20",
    history: "Il marengo da 20 Lire di Carlo Felice appartiene alle emissioni sabaude del Regno di Sardegna precedenti al Regno d'Italia. Al dritto raffigura Carlo Felice con legenda CAR FELIX D.G. REX SAR. CYP. ET HIER., mentre il rovescio presenta lo stemma sabaudo coronato, rami di alloro e valore L.20. Mantiene lo standard dei marenghi in oro 900/1000: peso di circa 6,45 g, circa 5,80 g di oro fino e diametro di 21 mm.",
    recognitionHints: ["marengo", "20 lire", "carlo felice", "car felix", "rex sar", "regno di sardegna", "sardegna", "savoia", "l.20", "l 20", "1827", "stemma sabaudo", "alloro", "italia"],
    visual: { front: "profile", back: "shield", frontText: "CF", backText: "L20" }
  },
  {
    id: "marengo-francese-20-franchi",
    name: "Marengo francese 20 Franchi",
    country: "Francia",
    mintYears: "1803-1914",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 6.4516,
    fineGold: 5.806,
    diameter: 21,
    edge: "Inciso o zigrinato, secondo emissione",
    obverse: "Napoleone, Marianne o Gallo, secondo tipologia",
    reverse: "Valore 20 Francs e simboli della Repubblica o Impero",
    history: "Il 20 Franchi francese e il modello da cui deriva il nome comune Marengo. Lo standard 900‰ e il peso di circa 6,45 g lo rendono immediatamente confrontabile con le emissioni latine.",
    recognitionHints: ["20 francs", "napoleon", "marianne", "coq", "gallo", "republique francaise"],
    visual: { front: "profile", back: "rooster", frontText: "20F", backText: "RF" }
  },
  {
    id: "napoleone-20-franchi-gallo-marianne",
    name: "Napoleone d'oro 20 Franchi Francesi",
    country: "Francia",
    mintYears: "1899-1914",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 6.4516,
    fineGold: 5.81,
    diameter: 21,
    thickness: 1.4,
    edge: "Zigrinato",
    obverse: "Marianne della Repubblica francese disegnata da J.C. Chaplain",
    reverse: "Gallo gallico con valore 20 Francs e motto Liberte Egalite Fraternite",
    history: "Coniata dalla zecca francese di Parigi tra il 1899 e il 1914, questa tipologia del 20 Franchi francese unisce Marianne, simbolo della Repubblica, e il gallo gallico, emblema della cultura e della storia francese. Come il Vreneli svizzero, e una moneta 900‰: circa 90% oro e 10% rame, con contenuto d'oro fino di circa 5,81 g.",
    recognitionHints: ["napoleone d'oro", "20 francs", "marianne", "gallo", "coq", "chaplain", "liberte egalite fraternite", "french mint"],
    visual: { front: "profile", back: "rooster", frontText: "RF", backText: "20F" }
  },
  {
    id: "marengo-20-franchi-napoleone-iii-testa-laureata",
    name: "Marengo 20 Franchi Napoleone III testa laureata",
    country: "Francia",
    mintYears: "1861-1870",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Napoleone III testa laureata con legenda NAPOLEON III EMPEREUR",
    reverse: "Stemma imperiale francese con legenda EMPIRE FRANCAIS, valore 20 FR e anno",
    history: "Il marengo oro identifica la moneta d'oro da 20 franchi nata dopo la vittoria napoleonica di Marengo del 14 giugno 1800 e poi estesa alle emissioni dell'Unione Monetaria Latina. La zecca di Parigi continuo a produrre 20 franchi con caratteristiche costanti di peso e titolo. Questa variante raffigura Napoleone III con testa laureata, imperatore dei francesi dal 1852 fino alla caduta del Secondo Impero dopo la guerra franco-tedesca. Il rovescio riporta lo stemma imperiale francese, il valore 20 FR e l'anno di coniazione.",
    recognitionHints: ["marengo", "napoleone iii", "napoleon iii", "testa laureata", "20 franchi", "20 francs", "20 fr", "empereur", "empire francais", "barre", "1865", "secondo impero", "francia"],
    visual: { front: "profile", back: "shield", frontText: "NIII", backText: "20FR" }
  },
  {
    id: "marengo-20-franchi-napoleone-iii-testa-nuda",
    name: "Marengo 20 Franchi Napoleone III testa nuda",
    country: "Francia",
    mintYears: "1853-1860",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Napoleone III testa nuda con legenda NAPOLEON III EMPEREUR",
    reverse: "Stemma imperiale francese con legenda EMPIRE FRANCAIS, valore 20 FR e anno",
    history: "Il marengo oro identifica la moneta d'oro da 20 franchi nata dopo la vittoria napoleonica di Marengo del 14 giugno 1800 e poi estesa alle emissioni dell'Unione Monetaria Latina. La zecca di Parigi continuo a produrre 20 franchi con caratteristiche costanti di peso e titolo. Questa variante raffigura Napoleone III a testa nuda, prima della tipologia laureata, con il ritratto imperiale e la legenda NAPOLEON III EMPEREUR. Come gli altri marenghi francesi, mantiene titolo 900‰, peso di circa 6,45 g e diametro di 21 mm.",
    recognitionHints: ["marengo", "napoleone iii", "napoleon iii", "testa nuda", "senza alloro", "20 franchi", "20 francs", "20 fr", "empereur", "empire francais", "barre", "1857", "secondo impero", "francia"],
    visual: { front: "profile", back: "shield", frontText: "NIII", backText: "20FR" }
  },
  {
    id: "marengo-svizzero-vreneli",
    name: "Vreneli 20 Franchi",
    country: "Svizzera",
    mintYears: "1897-1949",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 6.4516,
    fineGold: 5.806,
    diameter: 21,
    edge: "Inciso o zigrinato, secondo anno",
    obverse: "Helvetia / Vreneli con montagne alpine",
    reverse: "Stemma svizzero, quercia e valore 20 FR",
    history: "Il Vreneli e una delle monete svizzere piu riconoscibili. Il ritratto femminile e lo stemma con croce aiutano il riconoscimento visivo rapido in negozio.",
    recognitionHints: ["helvetia", "vreneli", "20 fr", "svizzera", "croce svizzera"],
    visual: { front: "profile", back: "cross", frontText: "HEL", backText: "20F" }
  },
  {
    id: "krugerrand-1-oz",
    name: "Krugerrand",
    country: "Sud Africa",
    mintYears: "1967-oggi",
    nominal: "Senza valore nominale",
    metal: "Oro",
    purity: 0.9167,
    purityLabel: "22 kt / 916,7‰",
    grossWeight: 33.93,
    fineGold: 31.1035,
    diameter: 32.77,
    edge: "Zigrinato",
    obverse: "Ritratto di Paul Kruger",
    reverse: "Antilope springbok e indicazione fine gold",
    history: "Creato nel 1967, il Krugerrand e stato pensato come moneta bullion da un'oncia. Contiene esattamente un'oncia troy di oro fino, pur essendo in lega 22 kt.",
    recognitionHints: ["krugerrand", "kruger", "springbok", "south africa", "fyngoud"],
    visual: { front: "profile", back: "springbok", frontText: "KR", backText: "1 OZ" }
  },
  {
    id: "american-eagle-1-oz",
    name: "America Aquila 50 Dollari d'oro",
    country: "Stati Uniti",
    mintYears: "Anni misti",
    nominal: "50 Dollars",
    metal: "Oro",
    purity: 0.9167,
    purityLabel: "22 kt / 916,7‰",
    grossWeight: 33.92,
    fineGold: 31.1035,
    diameter: 32.7,
    edge: "Zigrinato",
    obverse: "Lady Liberty con torcia e ramo d'ulivo, raggi del sole e scritta LIBERTY",
    reverse: "Aquila americana con nido, 1 OZ FINE GOLD e valore 50 DOLLARS",
    history: "L'Aquila americana, meglio conosciuta come American Gold Eagle, e una moneta d'oro coniata dalla Zecca degli Stati Uniti. Autorizzata dal Gold Bullion Coin Act del 1985, fu emessa per la prima volta nel 1986 nei formati da 1/10, 1/4, 1/2 e 1 oncia. Per legge l'oro deve provenire da giacimenti auriferi americani ed e legato con argento e rame per renderla resistente all'usura.",
    recognitionHints: ["america aquila", "aquila americana", "american gold eagle", "american eagle", "50 dollars", "1 oz fine gold", "liberty", "gold bullion coin act", "united states", "in god we trust", "e pluribus unum"],
    visual: { front: "liberty", back: "eagle", frontText: "LIB", backText: "50$" }
  },
  {
    id: "american-buffalo-1-oz",
    name: "American Buffalo",
    country: "Stati Uniti",
    mintYears: "2006-oggi",
    nominal: "50 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.108,
    fineGold: 31.1035,
    diameter: 32.7,
    edge: "Zigrinato",
    obverse: "Profilo nativo americano",
    reverse: "Bisonte americano",
    history: "La Buffalo e stata introdotta come bullion statunitense in oro 24 kt. Il bisonte sul retro e un segno visivo molto utile per distinguerla dalla Gold Eagle.",
    recognitionHints: ["buffalo", "bison", "indian head", "50 dollars", "9999"],
    visual: { front: "profile", back: "buffalo", frontText: "BUF", backText: "9999" }
  },
  {
    id: "maple-leaf-1-oz",
    name: "Maple Leaf",
    country: "Canada",
    mintYears: "1979-oggi",
    nominal: "50 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.11,
    fineGold: 31.1035,
    diameter: 30,
    edge: "Zigrinato",
    obverse: "Ritratto reale canadese",
    reverse: "Foglia d'acero",
    history: "La Maple Leaf canadese e tra le bullion piu note in oro puro. La foglia d'acero centrale e la dicitura fine gold/or pur la rendono molto riconoscibile.",
    recognitionHints: ["maple leaf", "foglia acero", "canada", "fine gold", "or pur"],
    visual: { front: "profile", back: "leaf", frontText: "CAN", backText: "9999" }
  },
  {
    id: "canada-maple-leaf-20-dollari",
    name: "Canada Foglia d'Acero d'oro 20 Dollari",
    country: "Canada",
    mintYears: "Anni misti / 1979-oggi",
    nominal: "20 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 15.55,
    fineGold: 15.548,
    diameter: 25,
    edge: "Zigrinato",
    obverse: "Foglia d'acero canadese con diciture Canada, Fine Gold, 1/2 oz, Or Pur e 9999",
    reverse: "Ritratto reale canadese con valore nominale 20 Dollars",
    history: "La Gold Maple Leaf, o Foglia d'Acero d'oro, e la bullion simbolo della Royal Canadian Mint. Introdotta nel 1979, e coniata in oro puro 999,9/1000 proveniente da miniere canadesi e riconosciuta per il motivo iconico della foglia d'acero. La serie e prodotta in vari tagli, tra cui 1 oz, 1/2 oz, 1/4 oz e 1/10 oz; le emissioni moderne integrano elementi di sicurezza come micro-incisioni laser a forma di foglia d'acero e linee radiali complesse.",
    recognitionHints: ["maple leaf", "foglia acero", "foglia d'acero", "canada", "20 dollars", "1/2 oz", "fine gold", "or pur", "9999", "royal canadian mint"],
    visual: { front: "leaf", back: "profile", frontText: "1/2", backText: "20$" }
  },
  {
    id: "filarmonica-vienna-2026-1-oz",
    name: "Filarmonica di Vienna 2026",
    country: "Austria",
    mintYears: "2026",
    nominal: "100 Euro",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.1,
    fineGold: 31.1,
    diameter: 37,
    edge: "Zigrinato",
    obverse: "Grande organo della Musikverein di Vienna con iscrizioni REPUBLIK ÖSTERREICH, 1 UNZE GOLD 999.9, 2026 e 100 EURO",
    reverse: "Composizione di strumenti orchestrali con violini, violoncello, arpa, fagotto e corno sotto il titolo Wiener Philharmoniker",
    history: "Emissione 2026 della celebre bullion austriaca da un'oncia, prodotta ufficialmente dalla Zecca Austriaca. La moneta unisce il grande organo della Musikverein e gli strumenti dell'orchestra filarmonica, simboli immediati della tradizione musicale viennese. E riconosciuta a livello globale, garantita per autenticita, peso e purezza, e apprezzata per elevata liquidita e raffinata estetica.",
    recognitionHints: ["filarmonica vienna 2026", "wiener philharmoniker", "republik osterreich", "1 unze gold 999.9", "100 euro", "organo musikverein", "strumenti orchestra"],
    visual: { front: "organ", back: "music", frontText: "2026", backText: "WIEN" }
  },
  {
    id: "somalia-elephant-2023-1-oz",
    name: "Somalia Elephant 2023",
    country: "Somalia",
    mintYears: "2023",
    nominal: "1.000 Shillings",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.1,
    fineGold: 31.1,
    diameter: 39,
    edge: "Zigrinato",
    obverse: "Stemma della Repubblica Somala con due leopardi, anno 2023 e valore 1.000 Shillings",
    reverse: "Elefante della serie African Wildlife con iscrizioni Elephant, 1 oz Au e 999,9",
    history: "Emissione 2023 della serie African Wildlife Somalia Elephant, prodotta dalla Bavarian State Mint. La serie e apprezzata per il disegno annuale dell'elefante africano e per il formato bullion in oro puro 999,9. Il lato nazionale riporta lo stemma della Somalia e il valore nominale, mentre il rovescio valorizza il soggetto naturalistico con un forte impatto visivo.",
    recognitionHints: ["somalia elephant 2023", "african wildlife", "elephant", "1 oz au 999.9", "somali republic", "1000 shillings", "bavarian state mint"],
    visual: { front: "shield", back: "elephant", frontText: "SOM", backText: "1OZ" }
  },
  {
    id: "arca-noe-armenia-2025-1-oz",
    name: "Arca di Noe Armenia 2025",
    country: "Armenia",
    mintYears: "2025",
    nominal: "50.000 Dram",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.1,
    fineGold: 31.1,
    diameter: 38.6,
    thickness: 1.65,
    edge: "Zigrinato",
    obverse: "Stemma della Repubblica d'Armenia con aquila e leone, valore 50.000 Dram, peso 1 oz, titolo Au 999,9 e anno 2025",
    reverse: "Arca di Noe sulle acque con Monte Ararat, sole nascente e colomba con ramoscello d'ulivo; iscrizioni Noah's Ark e testo armeno",
    history: "La serie Arca di Noe rende omaggio al patrimonio culturale armeno e alla simbologia biblica legata al Monte Ararat. Il rovescio racconta l'Arca di Noe che galleggia sull'acqua, con la colomba e il ramoscello d'ulivo come simboli di pace e speranza. Prodotta da Geiger Edelmetalle, rinomata zecca tedesca, questa emissione in oro puro 999,9 combina artigianalita, precisione e valore d'investimento.",
    recognitionHints: ["arca di noe", "noah's ark", "armenia 2025", "50000 dram", "republic of armenia", "ararat", "colomba", "geiger edelmetalle", "au 999.9"],
    visual: { front: "shield", back: "ark", frontText: "ARM", backText: "NOE" }
  },
  {
    id: "britannia-1-oz",
    name: "Britannia",
    country: "Regno Unito",
    mintYears: "1987-oggi",
    nominal: "100 Pounds",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰ dal 2013",
    grossWeight: 31.104,
    fineGold: 31.1035,
    diameter: 32.69,
    edge: "Zigrinato",
    obverse: "Ritratto del sovrano britannico",
    reverse: "Britannia con elmo, scudo e tridente",
    history: "La Britannia e la bullion britannica moderna. Le emissioni dal 2013 sono in oro 999,9‰, mentre le prime serie erano in lega 22 kt.",
    recognitionHints: ["britannia", "100 pounds", "tridente", "shield", "british"],
    visual: { front: "profile", back: "britannia", frontText: "GB", backText: "BRI" }
  },
  {
    id: "britannia-100-sterline-fdc",
    name: "100 Sterline Britannia d'oro (FIOR DI CONIO)",
    country: "Regno Unito",
    mintYears: "1987-oggi",
    nominal: "100 Pounds",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰ dal 2013",
    grossWeight: 31.104,
    fineGold: 0.9999,
    diameter: 32.69,
    edge: "Zigrinato",
    obverse: "Ritratto del sovrano britannico",
    reverse: "Britannia con elmo, scudo e tridente",
    history: "Le monete d'oro Gold Britannia sono monete inglesi emesse dalla Royal Mint (Zecca Reale inglese) in oro dal 1987. La Gold Britannia e' stata la prima moneta in oro da investimento europea del peso di 1 oncia troy; in Gran Bretagna ha corso legale e valore nominale di 100 sterline. La Britannia d'oro e' nota anche per l'esenzione dal capital gain tax nel Regno Unito. Le Gold Britannia sono prodotte anche nei tagli da 1/2, 1/4 e 1/10 di oncia troy e, dal 2013, anche in formati aggiuntivi. Dal 2013 le monete hanno purezza 999,9/1000, mentre fino al 2012 erano a 916,7/1000. Il rovescio raffigura Lady Britannia con tridente, scudo, elmo corinzio e ramoscello d'ulivo; il dritto presenta il ritratto del sovrano britannico.",
    recognitionHints: ["britannia", "100 pounds", "tridente", "shield", "british"],
    visual: { front: "/assets/coins/britannia-100-sterline-fdc-fronte.png", back: "/assets/coins/britannia-100-sterline-fdc-retro.png", frontText: "GB", backText: "BRI" }
  },
  {
    id: "kangaroo-nugget-1-oz",
    name: "Australia Nugget d'oro (Kangaroo) 100 Dollari",
    country: "Australia",
    mintYears: "Anni misti / 1986-oggi",
    nominal: "100 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.10,
    fineGold: 31.10,
    diameter: 30,
    edge: "Zigrinato",
    obverse: "Canguro australiano con scritta AUSTRALIAN KANGAROO, 1 oz 9999 Gold",
    reverse: "Ritratto reale con scritte ELIZABETH II, AUSTRALIA e 100 DOLLARS",
    history: "Il canguro australiano d'oro, noto come Australian Gold Nugget o Gold Kangaroo, e uno dei prodotti piu importanti della Zecca australiana di Perth. Dal debutto nel 1986 e fino al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive sono state caratterizzate dal canguro rosso, simbolo piu rappresentativo dell'Australia. Il Nugget d'oro australiano e coniato in oro puro 999,9/1000 nei tagli da 1/20, 1/10, 1/4, 1/2, 1, 2, 10 once e 1 kg. Ha corso legale in Australia e, a differenza di molte bullion, per legge viene emesso ogni anno con un differente disegno, caratteristica che puo aumentarne l'interesse numismatico insieme alla tiratura limitata. Nel 2011 la Perth Mint realizzo anche una moneta d'oro da una tonnellata, con valore nominale di 1 milione di dollari e valutazione superiore a 53 milioni di dollari al momento del conio. I Nugget d'oro non vanno confusi con le monete Australian Lunar Gold Bullion, sempre prodotte dalla Perth Mint ma dedicate agli animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget", "gold kangaroo", "kangaroo nugget", "kangaroo 100 dollars", "100 dollars australia", "1 oz", "1oz 9999 gold", "9999 gold", "perth mint", "canguro australiano", "nugget d'oro"],
    visual: { front: "profile", back: "kangaroo", frontText: "AUS", backText: "KNG" }
  },
  {
    id: "australia-nugget-kangaroo-50-dollari",
    name: "Australia Nugget d'oro (Kangaroo) 50 Dollari",
    country: "Australia",
    mintYears: "Anni misti / 1986-oggi",
    nominal: "50 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 15.59,
    fineGold: 15.588,
    diameter: 25.08,
    edge: "Zigrinato",
    obverse: "Canguro rosso australiano con diciture The Australian Nugget, 1/2 oz e 9999 Gold",
    reverse: "Ritratto della Regina Elisabetta II con valore nominale 50 Dollars e dicitura Australia",
    history: "Il Nugget d'oro australiano, oggi conosciuto anche come Australian Gold Kangaroo, e uno dei prodotti piu importanti della Perth Mint. Dal debutto nel 1986 al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive hanno adottato il canguro rosso, simbolo piu immediato dell'Australia. E coniato in oro puro 999,9/1000 in diversi tagli, compreso il 1/2 oz da 50 Dollari, e ha corso legale in Australia. Il disegno del canguro varia ogni anno, caratteristica che puo aumentare l'interesse numismatico rispetto al solo valore dell'oro fino. Non va confuso con la serie Lunar Gold Bullion della Perth Mint, che utilizza animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget", "gold kangaroo", "kangaroo 50 dollars", "50 dollars australia", "1/2 oz", "9999 gold", "red kangaroo", "perth mint", "nugget d'oro"],
    visual: { front: "kangaroo", back: "profile", frontText: "1/2", backText: "50$" }
  },
  {
    id: "australia-nugget-kangaroo-100-dollari-fdc",
    name: "Australia Nugget d'oro (Kangaroo) 100 Dollari (FIOR DI CONIO)",
    country: "Australia",
    mintYears: "Fior di Conio (FDC)",
    nominal: "100 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 31.10,
    fineGold: 31.10,
    diameter: 30,
    edge: "Zigrinato",
    obverse: "Canguro australiano 2024 con diciture Kangaroo, 1 oz e 9999 Gold",
    reverse: "Ritratto di Carlo III con valore nominale 100 Dollars e dicitura Australia",
    history: "Il canguro australiano d'oro, noto come Australian Gold Nugget o Gold Kangaroo, e uno dei prodotti piu importanti della Zecca australiana di Perth. Dal debutto nel 1986 e fino al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive sono state caratterizzate dal canguro rosso, simbolo piu rappresentativo dell'Australia. Il Nugget d'oro australiano e coniato in oro puro 999,9/1000 nei tagli da 1/20, 1/10, 1/4, 1/2, 1, 2, 10 once e 1 kg. Ha corso legale in Australia e, a differenza di molte bullion, per legge viene emesso ogni anno con un differente disegno, caratteristica che puo aumentarne l'interesse numismatico insieme alla tiratura limitata. Nel 2011 la Perth Mint creo una moneta d'oro da una tonnellata, battendo il precedente record della Big Maple Leaf della Royal Canadian Mint: il valore nominale era di 1 milione di dollari, ma al momento del conio venne valutata oltre 53 milioni di dollari. I Nugget d'oro non vanno confusi con le monete Australian Lunar Gold Bullion, sempre prodotte dalla Perth Mint ma dedicate agli animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget fdc", "gold kangaroo fdc", "kangaroo 100 dollars fdc", "100 dollars australia fdc", "2024 kangaroo", "charles iii", "carlo iii", "1 oz", "1oz 9999 gold", "9999 gold", "perth mint", "nugget d'oro", "fior di conio"],
    visual: { front: "kangaroo", back: "profile", frontText: "FDC", backText: "100$" }
  },
  {
    id: "australia-nugget-kangaroo-50-dollari-fdc",
    name: "Australia Nugget d'oro (Kangaroo) 50 Dollari (Fior di Conio)",
    country: "Australia",
    mintYears: "Fior di Conio (FDC)",
    nominal: "50 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 15.59,
    fineGold: 15.588,
    diameter: 25.08,
    edge: "Zigrinato",
    obverse: "Canguro australiano 2024 con diciture Kangaroo, 1/2 oz e 9999 Gold",
    reverse: "Ritratto di Carlo III con valore nominale 50 Dollars e dicitura Australia",
    history: "Il Nugget d'oro australiano, oggi conosciuto anche come Australian Gold Kangaroo, e uno dei prodotti piu importanti della Perth Mint. Dal debutto nel 1986 al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive hanno adottato il canguro rosso, simbolo piu immediato dell'Australia. E coniato in oro puro 999,9/1000 in diversi tagli, compreso il 1/2 oz da 50 Dollari, e ha corso legale in Australia. Il disegno del canguro varia ogni anno, caratteristica che puo aumentare l'interesse numismatico rispetto al solo valore dell'oro fino. Nel 2011 la Perth Mint ha realizzato una moneta da una tonnellata, con diametro di circa 80 centimetri e spessore di 12 centimetri, valutata oltre 53 milioni di dollari al momento del conio. Non va confuso con la serie Lunar Gold Bullion della Perth Mint, che utilizza animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget fdc", "gold kangaroo fdc", "kangaroo 50 dollars fdc", "50 dollars australia fdc", "1/2 oz", "2024 kangaroo", "charles iii", "9999 gold", "red kangaroo", "perth mint", "nugget d'oro"],
    visual: { front: "kangaroo", back: "profile", frontText: "FDC", backText: "50$" }
  },
  {
    id: "australia-nugget-kangaroo-25-dollari",
    name: "Australia Nugget d'oro (Kangaroo) 25 Dollari",
    country: "Australia",
    mintYears: "Anni misti / 1986-oggi",
    nominal: "25 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 7.77,
    fineGold: 7.769,
    diameter: 20.08,
    edge: "Zigrinato",
    obverse: "Canguro rosso australiano con diciture The Australian Nugget, 1/4 oz e 9999 Gold",
    reverse: "Ritratto della Regina Elisabetta II con valore nominale 25 Dollars e dicitura Australia",
    history: "Il Nugget d'oro australiano, oggi conosciuto anche come Australian Gold Kangaroo, e uno dei prodotti piu importanti della Perth Mint. Dal debutto nel 1986 al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive hanno adottato il canguro rosso, simbolo piu immediato dell'Australia. E coniato in oro puro 999,9/1000 in diversi tagli, compreso il 1/4 oz da 25 Dollari, e ha corso legale in Australia. Il disegno del canguro varia ogni anno, caratteristica che puo aumentare l'interesse numismatico rispetto al solo valore dell'oro fino. Nel 2011 la Perth Mint ha realizzato anche una moneta da una tonnellata, simbolo della rilevanza internazionale della serie. Non va confuso con la serie Lunar Gold Bullion della Perth Mint, che utilizza animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget", "gold kangaroo", "kangaroo 25 dollars", "25 dollars australia", "1/4 oz", "9999 gold", "red kangaroo", "perth mint", "nugget d'oro"],
    visual: { front: "kangaroo", back: "profile", frontText: "1/4", backText: "25$" }
  },
  {
    id: "australia-nugget-kangaroo-25-dollari-fdc",
    name: "Australia Nugget d'oro (Kangaroo) 25 Dollari (FIOR DI CONIO)",
    country: "Australia",
    mintYears: "Fior di Conio (FDC)",
    nominal: "25 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 7.77,
    fineGold: 7.769,
    diameter: 20.08,
    edge: "Zigrinato",
    obverse: "Canguro australiano 2024 con diciture Kangaroo, 1/4 oz e 9999 Gold",
    reverse: "Ritratto di Carlo III con valore nominale 25 Dollars e dicitura Australia",
    history: "Il canguro australiano d'oro, noto come Australian Gold Nugget o Gold Kangaroo, e uno dei prodotti piu importanti della Zecca australiana di Perth. Dal debutto nel 1986 e fino al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive sono state caratterizzate dal canguro rosso, simbolo piu rappresentativo dell'Australia. Il Nugget d'oro australiano e coniato in oro puro 999,9/1000 nei tagli da 1/20, 1/10, 1/4, 1/2, 1, 2, 10 once e 1 kg. Ha corso legale in Australia e, a differenza di molte bullion, per legge viene emesso ogni anno con un differente disegno, caratteristica che puo aumentarne l'interesse numismatico insieme alla tiratura limitata. Nel 2011 la Perth Mint creo una moneta d'oro da una tonnellata, battendo il precedente record della Big Maple Leaf della Royal Canadian Mint: il valore nominale era di 1 milione di dollari, ma al momento del conio venne valutata oltre 53 milioni di dollari. I Nugget d'oro non vanno confusi con le monete Australian Lunar Gold Bullion, sempre prodotte dalla Perth Mint ma dedicate agli animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget fdc", "gold kangaroo fdc", "kangaroo 25 dollars fdc", "25 dollars australia fdc", "2024 kangaroo", "charles iii", "carlo iii", "1/4 oz", "9999 gold", "perth mint", "nugget d'oro", "fior di conio"],
    visual: { front: "kangaroo", back: "profile", frontText: "FDC", backText: "25$" }
  },
  {
    id: "australia-nugget-kangaroo-15-dollari",
    name: "Australia Nugget d'oro (Kangaroo) 15 Dollari",
    country: "Australia",
    mintYears: "Anni misti / 1986-oggi",
    nominal: "15 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 3.11,
    fineGold: 3.11,
    diameter: 16,
    edge: "Zigrinato",
    obverse: "Canguro rosso australiano con diciture Australian Kangaroo, 1/10 oz e 9999 Gold",
    reverse: "Ritratto della Regina Elisabetta II con valore nominale 15 Dollars e dicitura Australia",
    history: "Il Nugget d'oro australiano, oggi conosciuto anche come Australian Gold Kangaroo, e uno dei prodotti piu importanti della Perth Mint. Dal debutto nel 1986 al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive hanno adottato il canguro rosso, simbolo piu immediato dell'Australia. E coniato in oro puro 999,9/1000 in diversi tagli, compreso il 1/10 oz da 15 Dollari, e ha corso legale in Australia. Il disegno del canguro varia ogni anno, caratteristica che puo aumentare l'interesse numismatico rispetto al solo valore dell'oro fino. Nel 2011 la Perth Mint ha realizzato anche una moneta da una tonnellata, simbolo della rilevanza internazionale della serie. Non va confuso con la serie Lunar Gold Bullion della Perth Mint, che utilizza animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget", "gold kangaroo", "kangaroo 15 dollars", "15 dollars australia", "1/10 oz", "1/10oz", "9999 gold", "red kangaroo", "perth mint", "nugget d'oro"],
    visual: { front: "kangaroo", back: "profile", frontText: "1/10", backText: "15$" }
  },
  {
    id: "australia-nugget-kangaroo-15-dollari-fdc",
    name: "Australia Nugget d'oro (Kangaroo) 15 Dollari (FIOR DI CONIO)",
    country: "Australia",
    mintYears: "Fior di Conio (FDC)",
    nominal: "15 Dollars",
    metal: "Oro",
    purity: 0.9999,
    purityLabel: "24 kt / 999,9‰",
    grossWeight: 3.11,
    fineGold: 3.11,
    diameter: 16,
    edge: "Zigrinato",
    obverse: "Canguro australiano 2024 con diciture Kangaroo, 1/10 oz e 9999 Gold",
    reverse: "Ritratto di Carlo III con valore nominale 15 Dollars e dicitura Australia",
    history: "Il canguro australiano d'oro, noto come Australian Gold Nugget o Gold Kangaroo, e uno dei prodotti piu importanti della Zecca australiana di Perth. Dal debutto nel 1986 e fino al 1989 raffigurava una pepita d'oro, da cui il nome Nugget; le emissioni successive sono state caratterizzate dal canguro rosso, simbolo piu rappresentativo dell'Australia. Il Nugget d'oro australiano e coniato in oro puro 999,9/1000 nei tagli da 1/20, 1/10, 1/4, 1/2, 1, 2, 10 once e 1 kg. Ha corso legale in Australia e, a differenza di molte bullion, per legge viene emesso ogni anno con un differente disegno, caratteristica che puo aumentarne l'interesse numismatico insieme alla tiratura limitata. Nell'ottobre 2011 la Perth Mint creo una moneta d'oro da una tonnellata, con un canguro rosso sul davanti e il ritratto della Regina Elisabetta II sul retro; il valore nominale era di 1 milione di dollari, ma al momento del conio venne valutata oltre 53 milioni di dollari. I Nugget d'oro non vanno confusi con le monete Australian Lunar Gold Bullion, sempre prodotte dalla Perth Mint ma dedicate agli animali del calendario lunare cinese.",
    recognitionHints: ["australia nugget fdc", "gold kangaroo fdc", "kangaroo 15 dollars fdc", "15 dollars australia fdc", "2024 kangaroo", "charles iii", "carlo iii", "1/10 oz", "1/10oz", "9999 gold", "perth mint", "nugget d'oro", "fior di conio"],
    visual: { front: "kangaroo", back: "profile", frontText: "FDC", backText: "15$" }
  },
  {
    id: "libertad-1-oz",
    name: "Libertad",
    country: "Messico",
    mintYears: "1981-oggi",
    nominal: "Onza",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 31.1035,
    fineGold: 31.1035,
    diameter: 34.5,
    edge: "Zigrinato",
    obverse: "Stemma messicano con aquila e serpente",
    reverse: "Vittoria alata e vulcani Popocatepetl/Iztaccihuatl",
    history: "La Libertad messicana deriva dalla tradizione dell'Onza. Il soggetto con Vittoria alata e vulcani e molto distintivo nel riconoscimento fotografico.",
    recognitionHints: ["libertad", "onza", "mexico", "vittoria alata", "aquila serpente"],
    visual: { front: "eagle", back: "winged", frontText: "MX", backText: "ONZA" }
  },
  {
    id: "cina-panda-oro-1-oz-30g",
    name: "Cina Panda oro 1 oz | 30 grammi",
    country: "Cina",
    mintYears: "Anni misti / 1982-oggi",
    nominal: "500 Yuan",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 31.11,
    fineGold: 31.079,
    diameter: 32,
    edge: "Zigrinato",
    obverse: "Panda gigante con valore 500 yuan e indicazione 1 oz Au .999",
    reverse: "Tempio del Cielo con scritte in caratteri cinesi",
    history: "Il Panda d'oro e una serie di monete auree coniate dalla zecca cinese a partire dal 1982. Il disegno del panda cambia di anno in anno, con minime differenze anche nelle dimensioni. La serie e stata prodotta in tagli da 1/20 di oncia fino a 1 oncia; dal 2016 viene coniata in tagli metrici da 1 a 30 grammi. Il Panda oro 1 oz / 30 grammi resta riconoscibile per il panda sul dritto, il Tempio del Cielo sul retro e il valore nominale da 500 yuan.",
    recognitionHints: ["panda oro", "china panda", "cina panda", "panda cinese", "500 yuan", "500元", "1oz au .999", "1 oz", "30 grammi", "tempio del cielo"],
    visual: { front: "panda", back: "temple", frontText: "500", backText: "CN" }
  },
  {
    id: "cina-panda-oro-1-2-oz-15g",
    name: "Cina Panda oro 1/2 oz | 15 grammi",
    country: "Cina",
    mintYears: "Anni misti / 1982-oggi",
    nominal: "200 Yuan",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 15.55,
    fineGold: 15.534,
    diameter: 27,
    edge: "Zigrinato",
    obverse: "Panda gigante con valore 200 yuan",
    reverse: "Tempio del Cielo con scritte in caratteri cinesi",
    history: "Il Panda d'oro e una serie di monete auree coniate dalla zecca cinese a partire dal 1982. Il disegno cambia di anno in anno con minime differenze di dimensione e composizione iconografica. La serie e stata prodotta in tagli da 1/20 di oncia fino a 1 oncia; dal 2016 viene coniata in tagli metrici da 1 a 30 grammi. Il taglio 1/2 oz, oggi associato al formato da 15 grammi, mantiene l'oro 999/1000, il panda sul dritto e il Tempio del Cielo sul retro.",
    recognitionHints: ["panda oro", "china panda", "cina panda", "panda cinese", "200 yuan", "200元", "1/2 oz", "mezza oncia", "15 grammi", "15g", "tempio del cielo"],
    visual: { front: "panda", back: "temple", frontText: "200", backText: "CN" }
  },
  {
    id: "cina-panda-oro-1-20-oz-1g",
    name: "Cina Panda oro 1/20 oz | 1 grammo",
    country: "Cina",
    mintYears: "Anni misti / 1982-oggi",
    nominal: "20 Yuan",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 1.55,
    fineGold: 1.548,
    diameter: 17.95,
    edge: "Zigrinato",
    obverse: "Panda gigante con valore 20 yuan",
    reverse: "Tempio del Cielo con scritte in caratteri cinesi",
    history: "Il Panda d'oro e una serie di monete auree coniate dalla zecca cinese a partire dal 1982. Il disegno cambia di anno in anno con minime differenze di dimensione. La serie storica varia da 1/20 di oncia a 1 oncia; dal 2016 viene coniata in tagli metrici da 1 a 30 grammi. Questa scheda identifica il formato piccolo 1/20 oz / 1 grammo, in oro 999/1000, con panda sul dritto e Tempio del Cielo sul retro.",
    recognitionHints: ["panda oro", "china panda", "cina panda", "panda cinese", "20 yuan", "20元", "1/20 oz", "un ventesimo", "1.55 grammi", "1,55 grammi", "1 grammo", "1 g", "tempio del cielo"],
    visual: { front: "panda", back: "temple", frontText: "20", backText: "CN" }
  },
  {
    id: "cina-panda-oro-1-grammo-fdc",
    name: "Cina Panda oro 1 grammo (Fior di Conio)",
    country: "Cina",
    mintYears: "Fior di Conio (FDC) / 2016-oggi",
    nominal: "10 Yuan",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 1,
    fineGold: 0.999,
    diameter: 10,
    edge: "Zigrinato",
    obverse: "Panda gigante con valore 10 yuan e indicazione 1g Au .999",
    reverse: "Tempio del Cielo con anno 2018 e scritte in caratteri cinesi",
    history: "Il Panda d'oro e una serie di monete auree coniate dalla zecca cinese a partire dal 1982. Il disegno della moneta cambia di anno in anno con minime differenze di dimensione e soggetto. A partire dal 2016 la serie viene emessa in tagli metrici da 1 a 30 grammi. Il taglio da 1 grammo in Fior di Conio mantiene oro 999/1000, valore nominale 10 yuan, panda sul dritto e Tempio del Cielo sul retro.",
    recognitionHints: ["panda oro", "china panda", "cina panda", "panda cinese", "10 yuan", "10元", "1g au .999", "1 grammo", "1 g", "fior di conio", "fdc", "tempio del cielo", "2018"],
    visual: { front: "panda", back: "temple", frontText: "10", backText: "CN" }
  },
  {
    id: "panda-cinese-30g",
    name: "Panda cinese 30 g",
    country: "Cina",
    mintYears: "1982-oggi",
    nominal: "500 Yuan",
    metal: "Oro",
    purity: 0.999,
    purityLabel: "24 kt / 999‰",
    grossWeight: 30,
    fineGold: 30,
    diameter: 32,
    edge: "Zigrinato",
    obverse: "Tempio del Cielo",
    reverse: "Panda, disegno variabile per anno",
    history: "Il Panda cinese e noto per il disegno del panda che cambia spesso. Dal 2016 la serie principale usa tagli metrici, tra cui 30 grammi.",
    recognitionHints: ["panda", "china", "500 yuan", "tempio del cielo", "30 g"],
    visual: { front: "temple", back: "panda", frontText: "CN", backText: "30G" }
  },
  {
    id: "centenario-50-pesos",
    name: "50 Pesos Centenario",
    country: "Messico",
    mintYears: "1921-1947 e riconiazioni",
    nominal: "50 Pesos",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 41.667,
    fineGold: 37.5,
    diameter: 37,
    edge: "Inciso",
    obverse: "Vittoria alata con vulcani",
    reverse: "Stemma messicano con aquila",
    history: "Il Centenario celebra l'indipendenza messicana ed e molto riconoscibile per il grande formato e il contenuto di 37,5 g di oro fino.",
    recognitionHints: ["50 pesos", "centenario", "37.5", "mexico", "vittoria alata"],
    visual: { front: "winged", back: "eagle", frontText: "50P", backText: "37.5" }
  },
  {
    id: "ducato-austriaco",
    name: "Ducato austriaco",
    country: "Austria",
    mintYears: "Storico e riconiazioni 1915",
    nominal: "1 Ducat",
    metal: "Oro",
    purity: 0.986,
    purityLabel: "986‰",
    grossWeight: 3.491,
    fineGold: 3.443,
    diameter: 20,
    edge: "Liscio",
    obverse: "Francesco Giuseppe",
    reverse: "Aquila bicipite imperiale",
    history: "Il ducato austriaco e una moneta sottile ad alto titolo, spesso incontrata come riconiazione 1915. Il titolo 986‰ e il peso ridotto richiedono attenzione in verifica.",
    recognitionHints: ["ducat", "ducato", "1915", "franz joseph", "aquila bicipite"],
    visual: { front: "profile", back: "doubleeagle", frontText: "DUC", backText: "986" }
  },
  {
    id: "20-dollari-double-eagle",
    name: "20 Dollars Double Eagle",
    country: "Stati Uniti",
    mintYears: "1849-1933",
    nominal: "20 Dollars",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 33.436,
    fineGold: 30.093,
    diameter: 34,
    edge: "Zigrinato o con motto, secondo tipologia",
    obverse: "Liberty Head o Saint-Gaudens",
    reverse: "Aquila americana",
    history: "La Double Eagle e una grande moneta statunitense da 20 dollari. I tipi Liberty Head e Saint-Gaudens sono tra i piu noti per collezionismo e bullion storico.",
    recognitionHints: ["double eagle", "twenty dollars", "20 dollars", "liberty", "saint gaudens"],
    visual: { front: "liberty", back: "eagle", frontText: "20$", backText: "US" }
  },
  {
    id: "20-mark-germania",
    name: "20 Mark oro",
    country: "Germania",
    mintYears: "1871-1915",
    nominal: "20 Mark",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 7.965,
    fineGold: 7.168,
    diameter: 22.5,
    edge: "Inciso",
    obverse: "Sovrano o stemma dello stato emittente",
    reverse: "Aquila imperiale tedesca e valore",
    history: "Il 20 Mark oro dell'Impero tedesco presenta vari stati emittenti ma mantiene standard monetari comuni. L'aquila imperiale e il valore 20 Mark aiutano l'identificazione.",
    recognitionHints: ["20 mark", "deutsches reich", "kaiser", "aigle", "aquila imperiale"],
    visual: { front: "profile", back: "eagle", frontText: "20M", backText: "DR" }
  }

,  {
    id: "britannia-10-sterline-oro",
    slug: "britannia-10-sterline-oro",
    name: "10 Sterline Britannia d'oro",
    title: "10 Sterline Britannia d'oro",
    displayName: "10 Sterline Britannia d'oro",
    country: "Regno Unito",
    stato: "Regno Unito",
    nation: "Regno Unito",
    group: "Regno Unito",
    category: "Regno Unito",
    denomination: "10 Sterline",
    metal: "Oro",
    mint: "Royal Mint",
    producer: "Royal Mint",
    purity: "916,7/1000 - 999,9/1000",
    titolo: "916,7/1000 - 999,9/1000",
    weight: "3,11 grammi",
    peso: "3,11 grammi",
    weightGrams: 3.11,
    diameter: "16,5 millimetri",
    diametro: "16,5 millimetri",
    diameterMm: 16.5,
    period: "Anni misti",
    periodo: "Anni misti",
    condition: "Anni misti",
    statoConservazione: "Anni misti",
    frontLabel: "Fronte - Regina Elisabetta II",
    backLabel: "Retro - Britannia",
    obverse: "Ritratto della Regina Elisabetta II con iscrizione regale.",
    reverse: "Lady Britannia con tridente, scudo, elmo corinzio e ramoscello d'ulivo.",
    image: "/assets/coins/britannia-10-sterline-fronte.png",
    frontImage: "/assets/coins/britannia-10-sterline-fronte.png",
    obverseImage: "/assets/coins/britannia-10-sterline-fronte.png",
    imageFront: "/assets/coins/britannia-10-sterline-fronte.png",
    backImage: "/assets/coins/britannia-10-sterline-retro.png",
    reverseImage: "/assets/coins/britannia-10-sterline-retro.png",
    imageBack: "/assets/coins/britannia-10-sterline-retro.png",
    description: "Le monete d’oro Gold Britannia sono monete inglesi emesse dalla Royal Mint in oro dal 1987. La Britannia d’oro e stata la prima moneta europea da investimento del peso di 1 oncia troy e in Gran Bretagna ha corso legale. Le emissioni sono disponibili in diversi tagli, tra cui 1/2, 1/4 e 1/10 di oncia; dal 2013 sono state introdotte anche versioni da 5 once e da 1/20 di oncia. Dal 2013 la purezza e 999,9/1000, mentre fino al 2012 era 916,7/1000. La moneta e apprezzata per il disegno raffinato e per le tecniche di conio orientate alla sicurezza. Sul fronte compare il ritratto di Elisabetta II, mentre sul retro e raffigurata Lady Britannia con tridente, scudo, elmo corinzio e ramoscello d’ulivo, simbolo di pace e vittoria.",
    history: "Le monete d’oro Gold Britannia sono monete inglesi emesse dalla Royal Mint in oro dal 1987. La Britannia d’oro e stata la prima moneta europea da investimento del peso di 1 oncia troy e in Gran Bretagna ha corso legale. Le emissioni sono disponibili in diversi tagli, tra cui 1/2, 1/4 e 1/10 di oncia; dal 2013 sono state introdotte anche versioni da 5 once e da 1/20 di oncia. Dal 2013 la purezza e 999,9/1000, mentre fino al 2012 era 916,7/1000. La moneta e apprezzata per il disegno raffinato e per le tecniche di conio orientate alla sicurezza. Sul fronte compare il ritratto di Elisabetta II, mentre sul retro e raffigurata Lady Britannia con tridente, scudo, elmo corinzio e ramoscello d’ulivo, simbolo di pace e vittoria.",
    story: "Le monete d’oro Gold Britannia sono monete inglesi emesse dalla Royal Mint in oro dal 1987. La Britannia d’oro e stata la prima moneta europea da investimento del peso di 1 oncia troy e in Gran Bretagna ha corso legale. Le emissioni sono disponibili in diversi tagli, tra cui 1/2, 1/4 e 1/10 di oncia; dal 2013 sono state introdotte anche versioni da 5 once e da 1/20 di oncia. Dal 2013 la purezza e 999,9/1000, mentre fino al 2012 era 916,7/1000. La moneta e apprezzata per il disegno raffinato e per le tecniche di conio orientate alla sicurezza. Sul fronte compare il ritratto di Elisabetta II, mentre sul retro e raffigurata Lady Britannia con tridente, scudo, elmo corinzio e ramoscello d’ulivo, simbolo di pace e vittoria.",
    technicalDetails: [
      { label: "Titolo", value: "916,7/1000 - 999,9/1000" },
      { label: "Peso", value: "3,11 grammi" },
      { label: "Diametro", value: "16,5 millimetri" },
      { label: "Periodo/Stato", value: "Anni misti" }
    ],
    details: [
      { label: "Titolo", value: "916,7/1000 - 999,9/1000" },
      { label: "Peso", value: "3,11 grammi" },
      { label: "Diametro", value: "16,5 millimetri" },
      { label: "Periodo/Stato", value: "Anni misti" }
    ],
    specifications: {
      Titolo: "916,7/1000 - 999,9/1000",
      Peso: "3,11 grammi",
      Diametro: "16,5 millimetri",
      "Periodo/Stato": "Anni misti"
    }
  }
];

const BILANCIA_DORO_COIN_IMAGE_BASE = "/assets/coins/bilancia-oro";

const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS = new Set([
  "sterlina-oro-sovrana",
  "marengo-20-lire-italia",
  "marengo-francese-20-franchi",
  "napoleone-20-franchi-gallo-marianne",
  "marengo-svizzero-vreneli",
  "krugerrand-1-oz",
  "american-eagle-1-oz",
  "arca-noe-armenia-2025-1-oz",
  "centenario-50-pesos",
  "ducato-austriaco",
  "20-dollari-double-eagle",
  "20-mark-germania",
  "sterlina-vecchio-conio",
  "sudafrica-2-rand",
  "cile-100-pesos",
  "austria-100-corone",
  "messico-20-pesos",
  "austria-1000-scellini",
  "ungheria-20-corone"
]);

function bilanciaDoroCoinImages(slug, source = "La Bilancia d'Oro", invertSides = false) {
  const frontSide = invertSides ? "back" : "front";
  const backSide = invertSides ? "front" : "back";
  return {
    front: `${BILANCIA_DORO_COIN_IMAGE_BASE}/${slug}-${frontSide}.png`,
    back: `${BILANCIA_DORO_COIN_IMAGE_BASE}/${slug}-${backSide}.png`,
    source
  };
}

function withBilanciaDoroImages(coin, slug, source) {
  return {
    ...coin,
    bookImages: bilanciaDoroCoinImages(
      slug,
      source,
      INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS.has(coin.id)
    )
  };
}

const BILANCIA_DORO_IMAGE_SLUGS_BY_COIN = {
  "sterlina-oro-sovrana": "sterlina-oro-sovrana",
  "marengo-20-lire-italia": "marengo-20-lire-italia",
  "marengo-20-lire-vittorio-emanuele-ii": "marengo-20-lire-vittorio-emanuele-ii",
  "marengo-20-lire-vittorio-emanuele-ii-regno-sardegna": "marengo-20-lire-vittorio-emanuele-ii-regno-sardegna",
  "marengo-20-lire-vittorio-emanuele-iii-aratrice": "marengo-20-lire-vittorio-emanuele-iii-aratrice",
  "100-lire-vittorio-emanuele-iii-fascione": "100-lire-vittorio-emanuele-iii-fascione",
  "40-lire-oro-napoleone-i": "40-lire-oro-napoleone-i",
  "marengo-20-lire-carlo-alberto": "marengo-20-lire-carlo-alberto",
  "marengo-20-lire-carlo-felice": "marengo-20-lire-carlo-felice",
  "marengo-francese-20-franchi": "marengo-francese-20-franchi",
  "napoleone-20-franchi-gallo-marianne": "napoleone-20-franchi-gallo-marianne",
  "marengo-20-franchi-napoleone-iii-testa-laureata": "marengo-20-franchi-napoleone-iii-testa-laureata",
  "marengo-20-franchi-napoleone-iii-testa-nuda": "marengo-20-franchi-napoleone-iii-testa-nuda",
  "marengo-svizzero-vreneli": "marengo-svizzero-vreneli",
  "krugerrand-1-oz": "krugerrand-1-oz",
  "american-eagle-1-oz": "american-eagle-1-oz",
  "american-buffalo-1-oz": "american-buffalo-1-oz",
  "maple-leaf-1-oz": "maple-leaf-1-oz",
  "canada-maple-leaf-20-dollari": "canada-maple-leaf-20-dollari",
  "filarmonica-vienna-2026-1-oz": "filarmonica-vienna-2026-1-oz",
  "somalia-elephant-2023-1-oz": "somalia-elephant-2023-1-oz",
  "arca-noe-armenia-2025-1-oz": "arca-noe-armenia-2025-1-oz",
  "britannia-1-oz": "britannia-1-oz",
  "100-lire-vittorio-emanuele-iii-fascione": "100-lire-vittorio-emanuele-iii-fascione",
  "kangaroo-nugget-1-oz": "australia-nugget-kangaroo-100-dollari",
  "australia-nugget-kangaroo-100-dollari-fdc": "australia-nugget-kangaroo-100-dollari-fdc",
  "australia-nugget-kangaroo-50-dollari": "australia-nugget-kangaroo-50-dollari",
  "australia-nugget-kangaroo-50-dollari-fdc": "australia-nugget-kangaroo-50-dollari-fdc",
  "australia-nugget-kangaroo-25-dollari": "australia-nugget-kangaroo-25-dollari",
  "australia-nugget-kangaroo-25-dollari-fdc": "australia-nugget-kangaroo-25-dollari-fdc",
  "australia-nugget-kangaroo-15-dollari": "australia-nugget-kangaroo-15-dollari",
  "australia-nugget-kangaroo-15-dollari-fdc": "australia-nugget-kangaroo-15-dollari-fdc",
  "libertad-1-oz": "libertad-1-oz",
  "cina-panda-oro-1-oz-30g": "cina-panda-oro-1-oz-30g",
  "cina-panda-oro-1-2-oz-15g": "cina-panda-oro-1-2-oz-15g",
  "cina-panda-oro-1-20-oz-1g": "cina-panda-oro-1-20-oz-1g",
  "cina-panda-oro-1-grammo-fdc": "cina-panda-oro-1-grammo-fdc",
  "panda-cinese-30g": "panda-cinese-30g",
  "centenario-50-pesos": "centenario-50-pesos",
  "messico-10-pesos-oro": "messico-10-pesos-oro",
  "ducato-austriaco": "ducato-austriaco",
  "20-dollari-double-eagle": "20-dollari-saint-gaudens",
  "20-mark-germania": "20-mark-germania"
};

const COIN_IMAGE_SOURCE_BY_COIN = {
  "marengo-20-lire-vittorio-emanuele-ii": "Archivio OroActive",
  "marengo-20-lire-vittorio-emanuele-ii-regno-sardegna": "Archivio OroActive",
  "marengo-20-lire-vittorio-emanuele-iii-aratrice": "Archivio OroActive",
  "100-lire-vittorio-emanuele-iii-fascione": "Archivio OroActive",
  "40-lire-oro-napoleone-i": "Archivio OroActive",
  "marengo-20-lire-carlo-alberto": "Archivio OroActive",
  "marengo-20-lire-carlo-felice": "Archivio OroActive",
  "american-buffalo-1-oz": "Archivio OroActive",
  "maple-leaf-1-oz": "Archivio OroActive",
  "canada-maple-leaf-20-dollari": "Archivio OroActive",
  "kangaroo-nugget-1-oz": "Archivio OroActive",
  "australia-nugget-kangaroo-100-dollari-fdc": "Archivio OroActive",
  "australia-nugget-kangaroo-50-dollari": "Archivio OroActive",
  "australia-nugget-kangaroo-50-dollari-fdc": "Archivio OroActive",
  "australia-nugget-kangaroo-25-dollari": "Archivio OroActive",
  "australia-nugget-kangaroo-25-dollari-fdc": "Archivio OroActive",
  "australia-nugget-kangaroo-15-dollari": "Archivio OroActive",
  "australia-nugget-kangaroo-15-dollari-fdc": "Archivio OroActive",
  "libertad-1-oz": "Archivio OroActive",
  "cina-panda-oro-1-oz-30g": "Archivio OroActive",
  "cina-panda-oro-1-2-oz-15g": "Archivio OroActive",
  "cina-panda-oro-1-20-oz-1g": "Archivio OroActive",
  "cina-panda-oro-1-grammo-fdc": "Archivio OroActive",
  "panda-cinese-30g": "Archivio OroActive",
  "messico-10-pesos-oro": "Archivio OroActive",
  "marengo-20-franchi-napoleone-iii-testa-laureata": "Archivio OroActive",
  "marengo-20-franchi-napoleone-iii-testa-nuda": "Archivio OroActive",
  "napoleone-20-franchi-gallo-marianne": "Archivio OroActive",
  "filarmonica-vienna-2026-1-oz": "Archivio OroActive",
  "somalia-elephant-2023-1-oz": "Archivio OroActive",
  "arca-noe-armenia-2025-1-oz": "Archivio OroActive",
  "100-lire-vittorio-emanuele-iii-fascione": "Archivio OroActive",
  "ducato-austriaco": "Archivio OroActive",
  "4-ducati-austriaci": "Archivio OroActive"
};

const BILANCIA_DORO_COIN_ADDITIONS = [
  withBilanciaDoroImages({
    id: "marengo-belga-20-franchi",
    name: "Marengo 20 Franchi Albert (Belgio)",
    country: "Belgio",
    mintYears: "1914; riconi secondo dopoguerra",
    nominal: "20 Francs",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Busto di Re Alberto I volto a sinistra con legenda ALBERT ROI DES BELGES",
    reverse: "Stemma coronato del Belgio con valore 20 F e data 1914",
    history: "Il Marengo 20 Franchi Albert appartiene alle monete auree dell'Unione Monetaria Latina. Re Alberto I fu l'ultimo sovrano belga a coniare nel 1914 monete da investimento di questo tipo; alcuni milioni di esemplari furono poi riconiati nel secondo dopoguerra. La moneta mantiene lo standard marengo: titolo 900/1000, peso 6,45 g e diametro 21 mm, con scritte in francese e fiammingo.",
    recognitionHints: ["marengo belga", "marengo 20 franchi", "20 francs", "20 f", "albert roi", "des belges", "alberto primo", "albert i", "belgio", "belgique", "belgie", "1914", "stemma belga"],
    visual: { front: "profile", back: "shield", frontText: "ALBERT", backText: "20F" }
  }, "marengo-belga-20-franchi"),
  withBilanciaDoroImages({
    id: "marengo-austriaco-20-franchi",
    name: "Marengo 20 Franchi Francesco Giuseppe I (Austria)",
    country: "Austria",
    mintYears: "1870-1916 / riconio 1892",
    nominal: "20 Franchi / 8 Fiorini",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰ / 21,6 kt",
    grossWeight: 6.45,
    fineGold: 5.805,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Profilo laureato dell'imperatore Francesco Giuseppe I con legenda FRANCISCVS IOSEPHVS I D G IMPERATOR ET REX",
    reverse: "Aquila imperiale austriaca con legenda IMPERIVM AVSTRIACVM, data 1892 e doppia denominazione 8 Fl / 20 Fr",
    history: "Quando nel 1866 la Prussia sconfisse l'Austria, questa usci dallo Zollverein e nel 1867 si indirizzo verso l'Unione Monetaria Latina. Furono emesse monete d'oro da 8 e 4 fiorini equivalenti alle monete da 20 e 10 lire/franchi, anche se l'Austria non completo l'ingresso nell'Unione previsto per il 1870. Il marengo austriaco d'oro fu coniato dalla Zecca Austriaca dal 1870 al 1916; come monete di borsa sono considerate soprattutto le coniazioni successive al 1900. La tipologia e stata soggetta a riconio continuando a presentare l'anno 1892. Il dritto mostra il profilo dell'imperatore Francesco Giuseppe I, sovrano dell'impero austro-ungarico dal 1848 fino alla prima guerra mondiale. Il rovescio riporta la scritta IMPERIVM AVSTRIACVM e l'aquila imperiale austriaca che separa la doppia denominazione 20 franchi e 8 fiorini.",
    recognitionHints: ["marengo austriaco", "marengo 20 franchi", "francesco giuseppe", "franz joseph", "francisces iosephus", "imperator et rex", "imperivm avstriacvm", "imperium austriacum", "8 fl", "8 florins", "8 fiorini", "20 fr", "20 francs", "1892", "aquila imperiale", "austria"],
    visual: { front: "profile", back: "doubleeagle", frontText: "AT", backText: "20F" }
  }, "marengo-austriaco-20-franchi-francesco-giuseppe-i", "Archivio OroActive"),
  withBilanciaDoroImages({
    id: "sterlina-vecchio-conio",
    name: "Sterlina vecchio conio",
    country: "Regno Unito",
    mintYears: "1871-1925",
    nominal: "1 Sovereign",
    metal: "Oro",
    purity: 0.9167,
    purityLabel: "22 kt / 916,7‰",
    grossWeight: 7.988,
    fineGold: 7.322,
    diameter: 22.12,
    edge: "Zigrinato",
    obverse: "Effigie di Vittoria, Edoardo VII o Giorgio V",
    reverse: "San Giorgio a cavallo che trafigge il drago",
    history: "La sterlina vecchio conio mantiene lo stesso standard tecnico della sovrana moderna, ma presenta effigi storiche dei sovrani britannici precedenti.",
    recognitionHints: ["sterlina vecchio conio", "georgius", "victoria", "edward", "san giorgio"],
    visual: { front: "profile", back: "dragon", frontText: "SOV", backText: "OLD" }
  }, "sterlina-vecchio-conio"),
  withBilanciaDoroImages({
    id: "sudafrica-2-rand",
    name: "Sudafrica 2 Rand",
    country: "Sud Africa",
    mintYears: "1961-1983",
    nominal: "2 Rand",
    metal: "Oro",
    purity: 0.9167,
    purityLabel: "22 kt / 916,7‰",
    grossWeight: 7.988,
    fineGold: 7.322,
    diameter: 22.12,
    edge: "Zigrinato",
    obverse: "Busto di Jan van Riebeeck",
    reverse: "Antilope springbok e valore 2 Rand",
    history: "Il 2 Rand sudafricano condivide peso e titolo della sterlina, ma si riconosce per il busto di Jan van Riebeeck e lo springbok.",
    recognitionHints: ["2 rand", "south africa", "sudafrica", "jan van riebeeck", "springbok"],
    visual: { front: "profile", back: "springbok", frontText: "2R", backText: "SA" }
  }, "sudafrica-2-rand"),
  withBilanciaDoroImages({
    id: "cile-100-pesos",
    name: "Cile 100 Pesos",
    country: "Cile",
    mintYears: "1926-1946/1980",
    nominal: "100 Pesos",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 20.34,
    fineGold: 18.3,
    diameter: 32,
    edge: "Zigrinato",
    obverse: "Testa laureata della Repubblica del Cile",
    reverse: "Stemma con stella, condor e cervo andino",
    history: "Il 100 Pesos cileno e una grande moneta d'oro 900‰. La figura femminile laureata e lo stemma nazionale con condor aiutano il riconoscimento.",
    recognitionHints: ["100 pesos", "cile", "chile", "condor", "republica de chile"],
    visual: { front: "profile", back: "shield", frontText: "CL", backText: "100P" }
  }, "cile-100-pesos"),
  withBilanciaDoroImages({
    id: "20-dollari-liberty",
    name: "20 Dollars Liberty Head",
    country: "Stati Uniti",
    mintYears: "1849-1907",
    nominal: "20 Dollars",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 33.436,
    fineGold: 30.093,
    diameter: 34,
    edge: "Zigrinato",
    obverse: "Liberty Head con corona LIBERTY",
    reverse: "Aquila americana con scudo",
    history: "La Liberty Head Double Eagle e la tipologia storica da 20 dollari precedente al disegno Saint-Gaudens, con lo stesso modulo e contenuto d'oro.",
    recognitionHints: ["20 dollars liberty", "liberty head", "double eagle", "united states", "twenty dollars"],
    visual: { front: "liberty", back: "eagle", frontText: "20$", backText: "LIB" }
  }, "20-dollari-liberty"),
  withBilanciaDoroImages({
    id: "austria-100-corone",
    name: "Austria 100 Corone",
    country: "Austria",
    mintYears: "1915 e riconiazioni",
    nominal: "100 Corone",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 33.88,
    fineGold: 30.49,
    diameter: 37,
    edge: "Zigrinato",
    obverse: "Francesco Giuseppe I",
    reverse: "Aquila bicipite imperiale e valore 100 Corone",
    history: "La 100 Corone austriaca e spesso incontrata come riconiazione datata 1915. Il grande formato e l'aquila imperiale sono elementi di riconoscimento immediati.",
    recognitionHints: ["100 corone", "100 corona", "austria", "franz joseph", "1915"],
    visual: { front: "profile", back: "doubleeagle", frontText: "100K", backText: "AT" }
  }, "austria-100-corone"),
  withBilanciaDoroImages({
    id: "4-ducati-austriaci",
    name: "Austria 4 Ducati d'oro (Francesco Giuseppe)",
    country: "Austria",
    mintYears: "1854-1914; riconio 1915",
    nominal: "4 Ducati",
    metal: "Oro",
    purity: 0.986,
    purityLabel: "986‰ / 98,62%",
    grossWeight: 13.96,
    fineGold: 13.7773,
    diameter: 39.5,
    edge: "Liscio",
    obverse: "Busto laureato di Francesco Giuseppe I volto a destra con legenda FRANC IOS I D G AUSTRIAE IMPERATOR",
    reverse: "Aquila bicipite coronata con stemma austriaco, data 1915 e legenda HUNGAR BOHEM GAL LOD ILL REX A A",
    history: "Il 4 Ducati d'oro d'Austria, detto anche Cecco Beppe o Ducatone, e una moneta della Munze Osterreich dedicata a Francesco Giuseppe. La data 1915 indica quasi sempre un riconio: la produzione storica inizio nel 1854 e termino nel 1914, mentre dal 1920 venne riconiata come trade coin. Ha oro fino pari a 13,7773 g su 13,96 g totali, titolo 986/1000 e diametro 39,5 mm.",
    recognitionHints: ["4 ducati", "4 ducat", "ducatone", "cecco beppe", "ducato austriaco", "francesco giuseppe", "franz joseph", "franc ios", "austriae imperator", "hungar bohem", "aquila bicipite", "1915"],
    visual: { front: "profile", back: "doubleeagle", frontText: "FJ", backText: "1915" }
  }, "4-ducati-austriaci", COIN_IMAGE_SOURCE_BY_COIN["4-ducati-austriaci"]),
  withBilanciaDoroImages({
    id: "10-dollari-indiano",
    name: "10 Dollars Indian Head",
    country: "Stati Uniti",
    mintYears: "1907-1933",
    nominal: "10 Dollars",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 16.72,
    fineGold: 15.04,
    diameter: 27,
    edge: "Zigrinato",
    obverse: "Liberty con copricapo indiano",
    reverse: "Aquila americana",
    history: "Il 10 Dollars Indian Head e una moneta statunitense storica dal disegno molto distintivo, con Liberty reinterpretata con copricapo indiano.",
    recognitionHints: ["10 dollars indian", "indian head", "eagle", "united states", "ten dollars"],
    visual: { front: "profile", back: "eagle", frontText: "10$", backText: "IND" }
  }, "10-dollari-indiano"),
  withBilanciaDoroImages({
    id: "10-dollari-liberty",
    name: "10 Dollars Liberty Head",
    country: "Stati Uniti",
    mintYears: "1838-1907",
    nominal: "10 Dollars",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 16.72,
    fineGold: 15.04,
    diameter: 27,
    edge: "Zigrinato",
    obverse: "Liberty Head con corona LIBERTY",
    reverse: "Aquila americana con scudo",
    history: "Il 10 Dollars Liberty Head e la mezza Double Eagle storica statunitense, con ritratto Liberty e aquila con scudo.",
    recognitionHints: ["10 dollars liberty", "liberty head", "ten dollars", "eagle", "united states"],
    visual: { front: "liberty", back: "eagle", frontText: "10$", backText: "LIB" }
  }, "10-dollari-liberty"),
  withBilanciaDoroImages({
    id: "messico-20-pesos",
    name: "Messico 20 Pesos",
    country: "Messico",
    mintYears: "1917-1921 e riconiazioni 1959",
    nominal: "20 Pesos",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 16.66,
    fineGold: 15,
    diameter: 27.4,
    edge: "Inciso",
    obverse: "Calendario azteco",
    reverse: "Stemma messicano con aquila e serpente",
    history: "Il 20 Pesos messicano si riconosce per il calendario azteco e lo stemma con aquila e serpente. Contiene 15 g di oro fino.",
    recognitionHints: ["20 pesos", "messico", "mexico", "calendario azteco", "aztec calendar"],
    visual: { front: "calendar", back: "eagle", frontText: "20P", backText: "MX" }
  }, "messico-20-pesos"),
  withBilanciaDoroImages({
    id: "messico-10-pesos-oro",
    name: "Messico 10 Pesos oro",
    country: "Messico",
    mintYears: "1921-1947",
    nominal: "10 Pesos",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 8.33,
    fineGold: 7.5,
    diameter: 22.5,
    edge: "Zigrinato",
    obverse: "Ritratto di Miguel Hidalgo con valore 10 Pesos e anno di coniazione",
    reverse: "Stemma nazionale messicano con aquila e serpente",
    history: "Queste monete sono state coniate dal governo messicano tra il 1921 e il 1947. Prima dell'avvento del Krugerrand oro nel 1967, il Pesos messicano era certamente tra le monete in oro da investimento piu diffuse al mondo. Per il Messico i Pesos messicani sono monete d'oro che hanno un immenso valore storico e sentimentale, perche hanno iniziato a circolare oltre 100 anni fa dopo la liberazione del Messico.",
    recognitionHints: ["10 pesos", "messico", "mexico", "miguel hidalgo", "hidalgo", "estados unidos mexicanos", "aquila e serpente"],
    visual: { front: "portrait", back: "eagle", frontText: "10P", backText: "MX" }
  }, "messico-10-pesos-oro"),
  withBilanciaDoroImages({
    id: "austria-1000-scellini",
    name: "Austria 1000 Scellini",
    country: "Austria",
    mintYears: "1976",
    nominal: "1000 Scellini",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 13.5,
    fineGold: 12.15,
    diameter: 27,
    edge: "Zigrinato",
    obverse: "Motivo commemorativo austriaco",
    reverse: "Valore 1000 Schilling e simboli nazionali",
    history: "Moneta commemorativa emessa per il millennio della nazione austriaca, con standard 900‰ e contenuto di circa 12,15 g di oro fino.",
    recognitionHints: ["1000 scellini", "1000 schilling", "austria", "1976", "millennio"],
    visual: { front: "seal", back: "shield", frontText: "1000", backText: "ATS" }
  }, "austria-1000-scellini"),
  withBilanciaDoroImages({
    id: "ungheria-20-corone",
    name: "Ungheria 20 Corone",
    country: "Ungheria",
    mintYears: "Varie emissioni",
    nominal: "20 Corone",
    metal: "Oro",
    purity: 0.9,
    purityLabel: "900‰",
    grossWeight: 6.775,
    fineGold: 6.097,
    diameter: 21,
    edge: "Zigrinato",
    obverse: "Francesco Giuseppe I",
    reverse: "Stemma reale ungherese sorretto da angeli",
    history: "La 20 Corone ungherese appartiene all'area austro-ungarica e si riconosce per l'effigie imperiale e lo stemma reale d'Ungheria.",
    recognitionHints: ["20 corone", "20 korona", "ungheria", "hungary", "francesco giuseppe"],
    visual: { front: "profile", back: "shield", frontText: "20K", backText: "HU" }
  }, "ungheria-20-corone")
];

GOLD_COIN_CATALOG.forEach((coin) => {
  const slug = BILANCIA_DORO_IMAGE_SLUGS_BY_COIN[coin.id];
  if (slug) {
    coin.bookImages = bilanciaDoroCoinImages(
      slug,
      COIN_IMAGE_SOURCE_BY_COIN[coin.id],
      INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS.has(coin.id)
    );
  }
});
GOLD_COIN_CATALOG.push(...BILANCIA_DORO_COIN_ADDITIONS);

const COIN_RECOGNITION_HINTS = {
  ai: "Confronto AI su immagine caricato dal backend.",
  local: "Risultato locale basato sul catalogo e sui filtri visibili."
};

function normalizeSignatureArray(value, fallback = false) {
  const source = Array.isArray(value) ? value : [];
  return SIGNATURE_LABELS.map((_, index) => Boolean(source[index] ?? fallback));
}

const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const steps = document.querySelectorAll(".step");
const panels = document.querySelectorAll(".form-step");
const toast = document.getElementById("toast");
const printPacket = document.getElementById("printPacket");
const previewModal = document.getElementById("previewModal");
const previewBody = document.getElementById("previewBody");
const previewTitle = document.getElementById("previewTitle");
const brandMenuButton = document.getElementById("brandMenuButton");
const brandDropdown = document.getElementById("brandDropdown");
const splashScreen = document.getElementById("splashScreen");
const splashStatus = document.getElementById("splashStatus");
const splashError = document.getElementById("splashError");
const splashRetry = document.getElementById("splashRetry");
const splashLoginFallback = document.getElementById("splashLoginFallback");
const mainMenuScreen = document.getElementById("mainMenuScreen");
const mainUserMenuButton = document.getElementById("mainUserMenuButton");
const mainUserDropdown = document.getElementById("mainUserDropdown");
const mainMenuClock = document.getElementById("mainMenuClock");
const mainMenuLogoRefresh = document.getElementById("mainMenuLogoRefresh");
const appVersionPanel = document.getElementById("appVersionPanel");
const appVersionLabel = document.getElementById("appVersionLabel");
const appVersionDetail = document.getElementById("appVersionDetail");
const appUpdateBanner = document.getElementById("appUpdateBanner");
const appUpdateBannerText = document.getElementById("appUpdateBannerText");
const mainMenuQuickActions = document.getElementById("mainMenuQuickActions");
const mainMenuActions = document.getElementById("mainMenuActions");
const mainMenuSearch = document.getElementById("mainMenuSearch");
const mainMenuSearchResults = document.getElementById("mainMenuSearchResults");
const mainMenuWelcome = document.getElementById("mainMenuWelcome");
const mainMenuHeroRole = document.getElementById("mainMenuHeroRole");
const mainMenuHeroStore = document.getElementById("mainMenuHeroStore");
const mainMenuFounderKpis = document.getElementById("mainMenuFounderKpis");
const mainMenuNotificationSlot = document.getElementById("mainMenuNotificationSlot");
const installHint = document.getElementById("installHint");
const quoteDashboard = document.getElementById("quoteDashboard");
const bullionVaultChart = document.getElementById("bullionVaultChart");
const bullionVaultChartFallback = document.getElementById("bullionVaultChartFallback");
const goldPredictionStatus = document.getElementById("goldPredictionStatus");
const goldPredictionCards = document.getElementById("goldPredictionCards");
const goldPredictionList = document.getElementById("goldPredictionList");
const goldPredictionKaratTable = document.getElementById("goldPredictionKaratTable");
const goldPredictionChart = document.getElementById("goldPredictionChart");
const goldPredictionExplanation = document.getElementById("goldPredictionExplanation");
const goldPredictionSettingsPanel = document.getElementById("goldPredictionSettingsPanel");
const goldPredictionSettingsForm = document.getElementById("goldPredictionSettingsForm");
const syncGoldHistoryButton = document.getElementById("syncGoldHistory");
const runGoldPredictionButton = document.getElementById("runGoldPrediction");
const askAurumGoldPredictionButton = document.getElementById("askAurumGoldPrediction");
const buybackScenarioSelect = document.getElementById("buybackScenarioSelect");
const buybackSimulatorForm = document.getElementById("buybackSimulatorForm");
const buybackSimulatorOutput = document.getElementById("buybackSimulatorOutput");
const buybackPolicyEditor = document.getElementById("buybackPolicyEditor");
const competitorSourceForm = document.getElementById("competitorSourceForm");
const competitorQuoteForm = document.getElementById("competitorQuoteForm");
const competitorCsvForm = document.getElementById("competitorCsvForm");
const competitorQuotesList = document.getElementById("competitorQuotesList");
const competitorExtractionTrainerList = document.getElementById("competitorExtractionTrainerList");
const profileCard = document.getElementById("profileCard");
const practiceTopbar = document.getElementById("practiceTopbar");
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const faceIdLoginButton = document.getElementById("faceIdLoginButton");
const registerFaceIdButton = document.getElementById("registerFaceIdButton");
const loggedUserName = document.getElementById("loggedUserName");
const sessionUsername = document.getElementById("sessionUsername");
const notificationCenter = document.getElementById("notificationCenter");
const notificationDefaultParent = notificationCenter?.parentElement || document.body;
const notificationBell = document.getElementById("notificationBell");
const notificationUnreadBadge = document.getElementById("notificationUnreadBadge");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationDropdownList = document.getElementById("notificationDropdownList");
const markAllNotificationsRead = document.getElementById("markAllNotificationsRead");
const viewAllNotifications = document.getElementById("viewAllNotifications");
const loadingIndicator = document.getElementById("loadingIndicator");
const appShell = document.querySelector(".app-shell");
const tutorialOverlay = document.getElementById("tutorialOverlay");
const tutorialTitle = document.getElementById("tutorialTitle");
const tutorialText = document.getElementById("tutorialText");
const tutorialCount = document.getElementById("tutorialCount");
const tutorialNext = document.getElementById("tutorialNext");
const tutorialBack = document.getElementById("tutorialBack");
const tutorialSkip = document.getElementById("tutorialSkip");
const assistantChat = document.getElementById("assistantChat");
const assistantForm = document.getElementById("assistantForm");
const assistantQuestion = document.getElementById("assistantQuestion");
const assistantMode = document.getElementById("assistantMode");
const assistantLoading = document.getElementById("assistantLoading");
const aurumMascotRoot = document.getElementById("aurumMascotRoot");
const aurumMascotButton = document.getElementById("aurumMascotButton");
const aurumTipBubble = document.getElementById("aurumTipBubble");
const aurumTipText = document.getElementById("aurumTipText");
const aurumTipClose = document.getElementById("aurumTipClose");
const aurumChatPanel = document.getElementById("aurumChatPanel");
const aurumChatTitle = document.getElementById("aurumChatTitle");
const aurumChatClose = document.getElementById("aurumChatClose");
const aurumChatMessages = document.getElementById("aurumChatMessages");
const aurumChatForm = document.getElementById("aurumChatForm");
const aurumQuestion = document.getElementById("aurumQuestion");
const aurumAskButton = document.getElementById("aurumAskButton");
const aurumConsentPanel = document.getElementById("aurumConsentPanel");
const aurumRememberYes = document.getElementById("aurumRememberYes");
const aurumRememberNo = document.getElementById("aurumRememberNo");
const aurumSupportActions = document.getElementById("aurumSupportActions");
const aurumMessageRecipient = document.getElementById("aurumMessageRecipient");
const aurumSendDirectMessage = document.getElementById("aurumSendDirectMessage");
const aurumResetPosition = document.getElementById("aurumResetPosition");
const aurumManagementPanel = document.getElementById("aurumManagementPanel");
const aurumEnabledToggle = document.getElementById("aurumEnabledToggle");
const aurumMovementToggle = document.getElementById("aurumMovementToggle");
const aurumGreetingToggle = document.getElementById("aurumGreetingToggle");
const aurumMemoryToggle = document.getElementById("aurumMemoryToggle");
const aurumRefreshAdminData = document.getElementById("aurumRefreshAdminData");
const aurumResetLocalMemory = document.getElementById("aurumResetLocalMemory");
const aurumSupportRequestsList = document.getElementById("aurumSupportRequestsList");
const aurumMemoriesList = document.getElementById("aurumMemoriesList");
const userMessagesPanel = document.getElementById("userMessagesPanel");
const userMessagesList = document.getElementById("userMessagesList");
const userMessageForm = document.getElementById("userMessageForm");
const userMessageRecipient = document.getElementById("userMessageRecipient");
const userMessageText = document.getElementById("userMessageText");
const knowledgeForm = document.getElementById("knowledgeForm");
const knowledgeStatus = document.getElementById("knowledgeStatus");
const reindexKnowledge = document.getElementById("reindexKnowledge");
const knowledgeNoteForm = document.getElementById("knowledgeNoteForm");
const knowledgeNotesList = document.getElementById("knowledgeNotesList");
const aiFeedbackList = document.getElementById("aiFeedbackList");
const resetKnowledgeNoteButton = document.getElementById("resetKnowledgeNoteForm");
const dashboardGrid = document.getElementById("dashboardGrid");
const dashboardPanels = document.getElementById("dashboardPanels");
const storeHealthFilters = document.getElementById("storeHealthFilters");
const storeHealthPeriod = document.getElementById("storeHealthPeriod");
const storeHealthDateFrom = document.getElementById("storeHealthDateFrom");
const storeHealthDateTo = document.getElementById("storeHealthDateTo");
const storeHealthSummary = document.getElementById("storeHealthSummary");
const storeHealthList = document.getElementById("storeHealthList");
const recalculateStoreHealthButton = document.getElementById("recalculateStoreHealth");
const founderReportDate = document.getElementById("founderReportDate");
const founderReportStatus = document.getElementById("founderReportStatus");
const founderReportCards = document.getElementById("founderReportCards");
const founderReportBody = document.getElementById("founderReportBody");
const founderReportHistory = document.getElementById("founderReportHistory");
const generateFounderReportButton = document.getElementById("generateFounderReport");
const downloadFounderReportPdfButton = document.getElementById("downloadFounderReportPdf");
const sendFounderReportButton = document.getElementById("sendFounderReport");
const aurumShieldCard = document.getElementById("aurumShieldCard");
const aurumShieldScore = document.getElementById("aurumShieldScore");
const aurumShieldLevel = document.getElementById("aurumShieldLevel");
const aurumShieldFactors = document.getElementById("aurumShieldFactors");
const aurumShieldRecommendations = document.getElementById("aurumShieldRecommendations");
const aurumShieldSettingsForm = document.getElementById("aurumShieldSettingsForm");
const aurumShieldAlertsList = document.getElementById("aurumShieldAlertsList");
const guidedQualityPanel = document.getElementById("guidedQualityPanel");
const guidedQualityStatusText = document.getElementById("guidedQualityStatusText");
const guidedQualityScore = document.getElementById("guidedQualityScore");
const guidedQualityList = document.getElementById("guidedQualityList");
const guidedQualityActions = document.getElementById("guidedQualityActions");
const storeForm = document.getElementById("storeForm");
const storesList = document.getElementById("storesList");
const antifraudList = document.getElementById("antifraudList");
const trainingList = document.getElementById("trainingList");
const courseSummary = document.getElementById("courseSummary");
const courseCurrentLocation = document.getElementById("courseCurrentLocation");
const courseSearch = document.getElementById("courseSearch");
const courseCategoryFilter = document.getElementById("courseCategoryFilter");
const courseToolbar = document.querySelector(".course-toolbar");
const trainingCourseEditHost = document.getElementById("trainingCourseEditHost");
const trainingCourseEditTemplate = document.getElementById("trainingCourseEditTemplate");
let trainingCourseForm = document.getElementById("trainingCourseForm");
let trainingCourseReset = document.getElementById("trainingCourseReset");
let trainingCourseSaveButton = document.getElementById("trainingCourseSaveButton");
let trainingCoursePreviewButton = document.getElementById("trainingCoursePreviewButton");
let trainingCourseFile = document.getElementById("trainingCourseFile");
let trainingCourseThumbnailFile = document.getElementById("trainingCourseThumbnailFile");
let trainingCourseVideoFile = document.getElementById("trainingCourseVideoFile");
let trainingCoursePdfFile = document.getElementById("trainingCoursePdfFile");
const aurumBlocksShell = document.getElementById("aurumBlocksShell");
const aurumBlocksGame = document.getElementById("aurumBlocksGame");
const aurumBlocksBoard = document.getElementById("aurumBlocksBoard");
const aurumBlocksScore = document.getElementById("aurumBlocksScore");
const aurumBlocksLevel = document.getElementById("aurumBlocksLevel");
const aurumBlocksLines = document.getElementById("aurumBlocksLines");
const aurumBlocksCombo = document.getElementById("aurumBlocksCombo");
const aurumBlocksNext = document.getElementById("aurumBlocksNext");
const aurumBlocksModeLabel = document.getElementById("aurumBlocksModeLabel");
const aurumBlocksCoach = document.getElementById("aurumBlocksCoach");
const aurumBlocksLegend = document.getElementById("aurumBlocksLegend");
const aurumBlocksQuestion = document.getElementById("aurumBlocksQuestion");
const aurumBlocksGameOver = document.getElementById("aurumBlocksGameOver");
const aurumBlocksMyScores = document.getElementById("aurumBlocksMyScores");
const aurumBlocksLeaderboard = document.getElementById("aurumBlocksLeaderboard");
const aurumBlocksBadges = document.getElementById("aurumBlocksBadges");
const aurumBlocksScreen = document.getElementById("aurumBlocks");
const gamingShell = document.getElementById("gamingShell");
const gamingQuickRanking = document.getElementById("gamingQuickRanking");
const gamingPersonalStats = document.getElementById("gamingPersonalStats");
const gamingAurumBlocksBadges = document.getElementById("gamingAurumBlocksBadges");
const coinSearchInput = document.getElementById("coinSearchInput");
const coinCountryFilter = document.getElementById("coinCountryFilter");
const coinPurityFilter = document.getElementById("coinPurityFilter");
const coinResetSearch = document.getElementById("coinResetSearch");
const coinCameraInput = document.getElementById("coinCameraInput");
const coinScanStatus = document.getElementById("coinScanStatus");
const coinScanPreview = document.getElementById("coinScanPreview");
const coinIdentificationResults = document.getElementById("coinIdentificationResults");
const coinOverviewGrid = document.getElementById("coinOverviewGrid");
const coinCatalogGrid = document.getElementById("coinCatalogGrid");
const coinDetailPanel = document.getElementById("coinDetailPanel");
const crmSearch = document.getElementById("crmSearch");
const crmList = document.getElementById("crmList");
const backupsList = document.getElementById("backupsList");
const approvalsList = document.getElementById("approvalsList");
const refreshApprovals = document.getElementById("refreshApprovals");
const suspendedPracticesList = document.getElementById("suspendedPracticesList");
const suspendedPracticeFilters = document.getElementById("suspendedPracticeFilters");
const refreshSuspendedPractices = document.getElementById("refreshSuspendedPractices");
const suspendedPracticesPrev = document.getElementById("suspendedPracticesPrev");
const suspendedPracticesNext = document.getElementById("suspendedPracticesNext");
const suspendedPracticesPageInfo = document.getElementById("suspendedPracticesPageInfo");
const saveSuspendedPracticeButton = document.getElementById("saveSuspendedPractice");
const auditTrailFilters = document.getElementById("auditTrailFilters");
const auditTrailList = document.getElementById("auditTrailList");
const auditTrailPageInfo = document.getElementById("auditTrailPageInfo");
const auditTrailPrev = document.getElementById("auditTrailPrev");
const auditTrailNext = document.getElementById("auditTrailNext");
const notificationFilters = document.getElementById("notificationFilters");
const notificationsList = document.getElementById("notificationsList");
const notificationsPageInfo = document.getElementById("notificationsPageInfo");
const notificationsPrev = document.getElementById("notificationsPrev");
const notificationsNext = document.getElementById("notificationsNext");
const refreshNotifications = document.getElementById("refreshNotifications");
const clearNotificationFilters = document.getElementById("clearNotificationFilters");
const titleOptionsByMetal = {
  Oro: ["24 kt", "22 kt", "21 kt", "18 kt", "14 kt", "12 kt", "9 kt", "6 kt"],
  Argento: ["999", "925", "800"],
  Platino: ["999", "950", "900", "850"]
};
const metalOrder = ["Oro", "Argento", "Platino"];
const AURUM_BLOCKS_WIDTH = 10;
const AURUM_BLOCKS_HEIGHT = 20;
const AURUM_BLOCKS_LEVEL_LINES = 10;
const AURUM_BLOCKS_MAX_LEVEL = 20;
const AURUM_BLOCKS_DROP_BASE_MS = 900;
const AURUM_BLOCKS_MODE_LABELS = {
  arcade: "Arcade Libero",
  daily: "Sfida Giornaliera",
  training: "Training Carature"
};
const AURUM_BLOCKS_METALS = [
  { id: "oro24", label: "Oro 24kt", full: "ORO 24K", short: "24K", className: "metal-oro24 aurum-ingot-gold-24k", valueBonus: 1.15, rarity: 5 },
  { id: "oro22", label: "Oro 22kt", full: "ORO 22K", short: "22K", className: "metal-oro22 aurum-ingot-gold-22k", valueBonus: 1.12, rarity: 7 },
  { id: "oro18", label: "Oro 18kt", full: "ORO 18K", short: "18K", className: "metal-oro18 aurum-ingot-gold-18k", valueBonus: 1.1, rarity: 12 },
  { id: "oro14", label: "Oro 14kt", full: "ORO 14K", short: "14K", className: "metal-oro14 aurum-ingot-gold-14k", valueBonus: 1.05, rarity: 16 },
  { id: "oro9", label: "Oro 9kt", full: "ORO 9K", short: "9K", className: "metal-oro9 aurum-ingot-gold-9k", valueBonus: 1.02, rarity: 18 },
  { id: "arg999", label: "Argento 999", full: "AG 999", short: "AG999", className: "metal-arg999 aurum-ingot-silver-999", valueBonus: 1.05, rarity: 12 },
  { id: "arg925", label: "Argento 925", full: "AG 925", short: "AG925", className: "metal-arg925 aurum-ingot-silver-925", valueBonus: 1.03, rarity: 16 },
  { id: "arg800", label: "Argento 800", full: "AG 800", short: "AG800", className: "metal-arg800 aurum-ingot-silver-800", valueBonus: 1, rarity: 20 },
  { id: "pt950", label: "Platino 950", full: "PT 950", short: "PT950", className: "metal-pt950 aurum-ingot-platinum-950", valueBonus: 1.12, rarity: 4 }
];
const AURUM_BLOCKS_SHAPES = [
  { id: "lingotto_lineare", name: "Lingotto Lineare", cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  { id: "blocco_bilancia", name: "Blocco Bilancia", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "scudo_aurum", name: "Scudo Aurum", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "barra_18kt", name: "Barra 18kt", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "blocco_sigillo", name: "Blocco Sigillo", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: "gemma_quadrata", name: "Gemma Quadrata", cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: "staffa_oroactive", name: "Staffa OroActive", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
];
const AURUM_BLOCKS_FALLBACK_QUESTIONS = [
  {
    id: "kt18",
    question: "Il 18kt contiene circa quale percentuale di oro puro?",
    options: ["75%", "50%", "90%"],
    correct_answer: "75%",
    explanation: "18kt corrisponde a circa 75% di oro puro."
  },
  {
    id: "ag925",
    question: "Quale titolo argento è comunemente indicato come sterling?",
    options: ["925", "800", "999"],
    correct_answer: "925",
    explanation: "L'argento sterling è comunemente indicato come 925."
  },
  {
    id: "kt24",
    question: "Il 24kt indica oro praticamente puro?",
    options: ["Sì", "No"],
    correct_answer: "Sì",
    explanation: "24kt indica oro praticamente puro."
  },
  {
    id: "archiviazione",
    question: "Prima di archiviare un atto cosa va controllato?",
    options: ["Documento, firme, pagamento", "Solo il peso", "Solo il nome cliente"],
    correct_answer: "Documento, firme, pagamento",
    explanation: "Documento, firme e pagamento sono controlli essenziali prima della chiusura."
  },
  {
    id: "documento_scaduto",
    question: "Se un documento è scaduto, cosa deve fare l'operatore?",
    options: ["Fermarsi e verificare procedura", "Completare comunque", "Ignorare"],
    correct_answer: "Fermarsi e verificare procedura",
    explanation: "Un documento scaduto richiede verifica prima di procedere."
  }
];
const AURUM_BLOCKS_COACH_MESSAGES = [
  "Ottimo incastro: precisione da operatore OroActive.",
  "Combo completata. Mantieni il ritmo senza perdere controllo.",
  "Ricorda: 18kt significa circa 75% di oro puro.",
  "Le righe pulite premiano metodo, non fretta.",
  "Pausa intelligente: allenare precisione aiuta anche nel lavoro."
];
const AURUM_BLOCKS_LINE_EFFECTS = {
  1: { name: "Gold Spark", label: "LINEA PULITA", particles: 16 },
  2: { name: "Double Bullion", label: "FUSIONE D'ORO", particles: 30 },
  3: { name: "Aurum Burst", label: "COLPO DA MAESTRO", particles: 45 },
  4: { name: "Golden Cascade", label: "AURUM BONUS", particles: 70 }
};
const COMUNI_ITALIANI = [
  { comune: "Busto Arsizio", provincia: "VA", codice: "B300" },
  { comune: "Cassano Magnago", provincia: "VA", codice: "C004" },
  { comune: "Legnano", provincia: "MI", codice: "E514" },
  { comune: "Milano", provincia: "MI", codice: "F205" },
  { comune: "Roma", provincia: "RM", codice: "H501" },
  { comune: "Torino", provincia: "TO", codice: "L219" },
  { comune: "Napoli", provincia: "NA", codice: "F839" },
  { comune: "Palermo", provincia: "PA", codice: "G273" },
  { comune: "Genova", provincia: "GE", codice: "D969" },
  { comune: "Bologna", provincia: "BO", codice: "A944" },
  { comune: "Firenze", provincia: "FI", codice: "D612" },
  { comune: "Venezia", provincia: "VE", codice: "L736" },
  { comune: "Verona", provincia: "VR", codice: "L781" },
  { comune: "Varese", provincia: "VA", codice: "L682" },
  { comune: "Gallarate", provincia: "VA", codice: "D869" },
  { comune: "Saronno", provincia: "VA", codice: "I441" },
  { comune: "Castellanza", provincia: "VA", codice: "C139" },
  { comune: "Cinisello Balsamo", provincia: "MI", codice: "C707" },
  { comune: "Sesto San Giovanni", provincia: "MI", codice: "I690" },
  { comune: "Monza", provincia: "MB", codice: "F704" },
  { comune: "Como", provincia: "CO", codice: "C933" },
  { comune: "Bergamo", provincia: "BG", codice: "A794" },
  { comune: "Brescia", provincia: "BS", codice: "B157" },
  { comune: "Pavia", provincia: "PV", codice: "G388" },
  { comune: "Novara", provincia: "NO", codice: "F952" },
  { comune: "Padova", provincia: "PD", codice: "G224" },
  { comune: "Vicenza", provincia: "VI", codice: "L840" },
  { comune: "Treviso", provincia: "TV", codice: "L407" },
  { comune: "Parma", provincia: "PR", codice: "G337" },
  { comune: "Modena", provincia: "MO", codice: "F257" },
  { comune: "Reggio Emilia", provincia: "RE", codice: "H223" },
  { comune: "Rimini", provincia: "RN", codice: "H294" },
  { comune: "Ancona", provincia: "AN", codice: "A271" },
  { comune: "Perugia", provincia: "PG", codice: "G478" },
  { comune: "Cagliari", provincia: "CA", codice: "B354" },
  { comune: "Bari", provincia: "BA", codice: "A662" },
  { comune: "Catania", provincia: "CT", codice: "C351" }
];
const STATI_ESTERI = [
  { comune: "Francia", provincia: "EE", codice: "Z110", cittadinanza: "Francese" },
  { comune: "Parigi", provincia: "EE", codice: "Z110", cittadinanza: "Francese" },
  { comune: "Germania", provincia: "EE", codice: "Z112", cittadinanza: "Tedesca" },
  { comune: "Berlino", provincia: "EE", codice: "Z112", cittadinanza: "Tedesca" },
  { comune: "Svizzera", provincia: "EE", codice: "Z133", cittadinanza: "Svizzera" },
  { comune: "Spagna", provincia: "EE", codice: "Z131", cittadinanza: "Spagnola" },
  { comune: "Regno Unito", provincia: "EE", codice: "Z114", cittadinanza: "Britannica" },
  { comune: "Stati Uniti", provincia: "EE", codice: "Z404", cittadinanza: "Statunitense" }
];
const LUOGHI_CATASTALI = [...COMUNI_ITALIANI.map((item) => ({ ...item, cittadinanza: "Italiana" })), ...STATI_ESTERI];
const PROVINCE_NAMES = {
  AG: "Agrigento", AL: "Alessandria", AN: "Ancona", AO: "Aosta", AR: "Arezzo", AP: "Ascoli Piceno", AT: "Asti", AV: "Avellino",
  BA: "Bari", BT: "Barletta-Andria-Trani", BL: "Belluno", BN: "Benevento", BG: "Bergamo", BI: "Biella", BO: "Bologna", BZ: "Bolzano", BS: "Brescia", BR: "Brindisi",
  CA: "Cagliari", CL: "Caltanissetta", CB: "Campobasso", CE: "Caserta", CT: "Catania", CZ: "Catanzaro", CH: "Chieti", CO: "Como", CS: "Cosenza", CR: "Cremona", KR: "Crotone", CN: "Cuneo",
  EN: "Enna", FM: "Fermo", FE: "Ferrara", FI: "Firenze", FG: "Foggia", FC: "Forli-Cesena", FR: "Frosinone", GE: "Genova", GO: "Gorizia", GR: "Grosseto",
  IM: "Imperia", IS: "Isernia", SP: "La Spezia", AQ: "L'Aquila", LT: "Latina", LE: "Lecce", LC: "Lecco", LI: "Livorno", LO: "Lodi", LU: "Lucca",
  MC: "Macerata", MN: "Mantova", MS: "Massa-Carrara", MT: "Matera", ME: "Messina", MI: "Milano", MO: "Modena", MB: "Monza e Brianza",
  NA: "Napoli", NO: "Novara", NU: "Nuoro", OR: "Oristano", PD: "Padova", PA: "Palermo", PR: "Parma", PV: "Pavia", PG: "Perugia", PU: "Pesaro e Urbino", PE: "Pescara", PC: "Piacenza", PI: "Pisa", PT: "Pistoia", PN: "Pordenone", PZ: "Potenza", PO: "Prato",
  RG: "Ragusa", RA: "Ravenna", RC: "Reggio Calabria", RE: "Reggio Emilia", RI: "Rieti", RN: "Rimini", RM: "Roma", RO: "Rovigo",
  SA: "Salerno", SS: "Sassari", SV: "Savona", SI: "Siena", SR: "Siracusa", SO: "Sondrio", SU: "Sud Sardegna", TA: "Taranto", TE: "Teramo", TR: "Terni", TO: "Torino", TP: "Trapani", TN: "Trento", TV: "Treviso", TS: "Trieste",
  UD: "Udine", VA: "Varese", VE: "Venezia", VB: "Verbano-Cusio-Ossola", VC: "Vercelli", VR: "Verona", VV: "Vibo Valentia", VI: "Vicenza", VT: "Viterbo", EE: "Estero"
};
const PROVINCE_CODES = Object.keys(PROVINCE_NAMES).sort();
const FISCAL_MONTH_CODES = ["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"];
const NAME_SEX_HINTS = {
  M: new Set("ALESSANDRO ANDREA ANGELO ANTONIO CHRISTIAN CRISTIAN DANIELE DAVIDE DOMENICO EMANUELE FABIO FEDERICO FILIPPO FRANCESCO GABRIELE GIACOMO GIANLUCA GIOVANNI GIUSEPPE LORENZO LUCA MARCO MARIO MATTEO MICHELE NICOLA PAOLO PIETRO RICCARDO ROBERTO SALVATORE SIMONE STEFANO TOMMASO VINCENZO".split(" ")),
  F: new Set("ALESSANDRA ANNA ANTONELLA ARIANNA AURORA BARBARA BENEDETTA CATERINA CHIARA CRISTINA ELENA ELISA ELISABETTA FEDERICA FRANCESCA GIADA GIULIA ILARIA LAURA MARTINA MARIA MONICA PAOLA ROBERTA SARA SERENA SILVIA SOFIA VALENTINA VERONICA".split(" "))
};
const documentLabels = {
  "Carta identita": "carta identita",
  Patente: "patente",
  Passaporto: "passaporto"
};
const oroactiveConfig = window.OroActiveConfig || {};
const API_BASE_URL = oroactiveConfig.apiBaseUrl || window.location.origin.replace(/\/+$/, "").replace(/\/api$/i, "");
const apiBase = oroactiveConfig.apiBase || `${API_BASE_URL}/api`;
const CASH_PAYMENT_LIMIT = 500;
const ACT_LIST_LIMIT = 50;
const ACT_CACHE_TTL = 30000;
const APP_VERSION_CHECK_INTERVAL_MS = 30000;
const API_RETRY_ATTEMPTS = 3;
const NOTIFICATION_POLL_INTERVAL_MS = 60000;
const QUALITY_FLAG_POINTS = 1;
const ROLE_LEVELS = [
  { role: "aiuto_commesso", label: "Commesso OroActive", points: 1000 },
  { role: "commesso", label: "Responsabile OroActive", points: 2500 },
  { role: "responsabile", label: "Supervisore dei Responsabili OroActive", points: 5000 }
];
const LEVEL_UNLOCK_MESSAGES = {
  aiuto_commesso: {
    title: "Hai sbloccato il livello Commesso OroActive",
    body: `Hai sbloccato il livello Commesso OroActive.

Da questo momento non stai semplicemente utilizzando un software.
Stai entrando in una realtà costruita su fiducia, responsabilità e crescita personale.

OroActive ha scelto di affidarti un ruolo importante, perché crediamo nelle tue capacità, nella tua mentalità e nel valore che puoi portare ogni giorno all'interno del negozio.

Ogni cliente che incontrerai, ogni pratica che gestirai e ogni dettaglio a cui presterai attenzione contribuiranno a costruire qualcosa di più grande: la reputazione e il futuro di OroActive.

Qui non cerchiamo persone perfette.
Cerchiamo persone che vogliono migliorarsi, imparare, crescere e diventare professionisti veri.

Ricorda sempre una cosa:
la fiducia si conquista con costanza, precisione e atteggiamento.

Questo livello rappresenta l'inizio del tuo percorso.
Il modo in cui lo affronterai determinerà fino a dove potrai arrivare.

Benvenuto in OroActive.`
  },
  commesso: {
    title: "Hai sbloccato il livello Responsabile OroActive",
    body: `Hai sbloccato il livello Responsabile OroActive.

Questo traguardo non rappresenta soltanto un nuovo livello operativo.
Rappresenta la fiducia che OroActive ha deciso di riporre in te.

Diventare Responsabile significa essere un punto di riferimento.
Per il team.
Per i clienti.
Per il futuro del marchio.

Le persone non seguiranno solo ciò che dici, ma soprattutto il modo in cui agirai ogni giorno: con mentalità, presenza, disciplina e rispetto.

OroActive nasce da valori profondi: crescita, umanità, ambizione e professionalità.
E oggi quei valori li rappresenti anche tu.

Grazie di cuore per essere parte della famiglia OroActive.
Grazie per l'impegno, per l'energia che metti nel tuo lavoro e per il contributo reale che dai ogni giorno alla costruzione di qualcosa di grande.

Ricorda sempre una cosa:
i ruoli si assegnano, ma la leadership si conquista.

Questo livello è la dimostrazione che il tuo percorso sta lasciando il segno.

Continua a crescere.
Continua a credere nelle tue capacità.
Continua a portare in alto il nome OroActive.

Il futuro si costruisce insieme.`
  },
  responsabile: {
    title: "Supervisore dei Responsabili OroActive",
    body: `Hai raggiunto lo status riservato di
Supervisore dei Responsabili OroActive.

Questo livello non viene assegnato semplicemente per i risultati ottenuti.
Viene conquistato attraverso il carattere, la resilienza, le cadute affrontate e la forza dimostrata nel rialzarsi ogni volta.

Oggi non stai ricevendo soltanto un nuovo ruolo.
Stai entrando nel cuore operativo di OroActive.

Da questo momento collaborerai direttamente con il fondatore e con i soci nella gestione delle aree aziendali e nel coordinamento operativo dei responsabili.
Questo significa che il tuo valore, la tua mentalità e la tua visione sono diventati parte integrante della crescita del marchio.

Essere Supervisore significa guidare senza perdere l'umiltà.
Significa diventare una luce per chi sta ancora costruendo il proprio cammino.
Significa rappresentare l'essenza più profonda di OroActive: crescita, disciplina, umanità, ambizione e coraggio.

Ma soprattutto... significa aver dimostrato di meritare fiducia.

Voglio dirti personalmente grazie.

Grazie per ogni sacrificio affrontato.
Grazie per non aver mollato nei momenti difficili.
Grazie per aver creduto in questo progetto anche nelle salite più dure.
Perché sono proprio le difficoltà, le cadute e le sfide affrontate nel silenzio a costruire le persone destinate a lasciare il segno.

Che questo traguardo non sia un punto di arrivo, ma una nuova partenza.
Una luce da seguire.
Una responsabilità da onorare.
Un percorso che continui a portarti sempre più in alto, aiutandoti a scoprire il tuo enorme potenziale sia come persona che come professionista.

Ricordati sempre una cosa:

non sarai mai solo in questo cammino.

Io, Christian Dinato, fondatore di OroActive, sarò sempre al tuo fianco durante il tuo percorso lavorativo, pronto a sostenerti, supportarti e credere in te anche nei momenti più complessi.

Perché OroActive non è soltanto un marchio.
È una famiglia costruita da persone che hanno deciso di crescere insieme.

Grazie ancora di cuore.
E benvenuto tra coloro che porteranno OroActive verso il futuro.`
  }
};
const demoActs = [];

function removeLegacySearchMenu() {
  document.querySelectorAll('[data-section="searchActs"], #searchActs').forEach((element) => {
    element.remove();
  });
}

function removeFooterBuildMetadata() {
  document.querySelectorAll(".software-footer .app-footer-build, .software-footer [data-founder-footer-build]").forEach((element) => {
    element.remove();
  });
  document.querySelectorAll(".software-footer").forEach((footer) => {
    if (/Build\s+[a-f0-9]{7,}|#git-|·\s*main/i.test(footer.textContent || "")) {
      footer.textContent = "© 2026 OroActive Tech - Software gestionale proprietario";
    }
  });
}

function showLoading(message = "Caricamento in corso...") {
  if (!loadingIndicator) return;
  loadingIndicator.querySelector("span").textContent = message;
  loadingIndicator.hidden = false;
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.hidden = true;
}

function isStandalonePwa() {
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function isAppleTouchDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then((registration) => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            state.updateAvailable = true;
            showAppUpdateBanner("Aggiornamento pronto. Ricarica OroActive quando hai terminato l'operazione in corso.");
          }
        });
      });
      void registration.update();
    }).catch(() => {
      // La PWA resta utilizzabile anche senza service worker.
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (state.serviceWorkerReloading) return;
      state.serviceWorkerReloading = true;
      window.location.reload();
    });
  });
}

async function refreshApp(options = {}) {
  if (!options.silent) showToast("Aggiornamento app in corso...", "warning");
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => null)));
    }
    if (window.caches?.keys) {
      const keys = await window.caches.keys();
      const staticCacheKeys = keys.filter((key) => /oroactive|static|asset|pwa/i.test(key));
      await Promise.all(staticCacheKeys.map((key) => window.caches.delete(key).catch(() => false)));
    }
  } catch {
    // Anche se l'aggiornamento cache fallisce, il reload mantiene la sessione e ricarica l'app.
  } finally {
    window.location.reload();
  }
}

function normalizeAppVersion(version = {}) {
  return {
    ok: version.ok !== false,
    app: version.app || "OroActive",
    commit: String(version.commit || "unknown"),
    shortCommit: String(version.shortCommit || version.short_commit || version.commit || "unknown").slice(0, 12),
    buildNumber: String(version.buildNumber || version.build_number || "local"),
    buildTime: String(version.buildTime || version.build_time || ""),
    branch: String(version.branch || "main"),
    environment: String(version.environment || "")
  };
}

function appVersionKey(version = {}) {
  const data = normalizeAppVersion(version);
  return [data.commit, data.buildNumber, data.buildTime].join("|");
}

async function fetchAppVersion(path = "/api/version") {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error("Versione app non disponibile.");
  return normalizeAppVersion(await response.json());
}

async function fetchClientVersion() {
  try {
    return await fetchAppVersion("/version.json");
  } catch {
    return fetchAppVersion("/api/version");
  }
}

async function ensureClientVersion() {
  if (state.clientVersion) return state.clientVersion;
  const version = await fetchClientVersion();
  state.clientVersion = version;
  window.__OROACTIVE_VERSION__ = version;
  return version;
}

function isCriticalUnsavedWorkflow() {
  const activePractice = document.getElementById("practice")?.classList.contains("active-screen");
  const hasFormData = !isPracticeFormEmpty();
  return Boolean(
    state.saving ||
    state.editingDirty ||
    state.pendingSync.length ||
    state.uploadedCaptures.size ||
    state.captureFiles.size ||
    state.attachments ||
    state.signatures.some(Boolean) ||
    (activePractice && hasFormData)
  );
}

function syncDirtyState() {
  window.__OROACTIVE_DIRTY_STATE__ = isCriticalUnsavedWorkflow();
  return window.__OROACTIVE_DIRTY_STATE__;
}

async function clearOldOroactiveCaches() {
  if (!window.caches?.keys) return [];
  const keys = await window.caches.keys();
  const oldKeys = keys.filter((key) => /^oroactive-|^static-|^asset-|^pwa-/i.test(key));
  await Promise.all(oldKeys.map((key) => window.caches.delete(key).catch(() => false)));
  return oldKeys;
}

async function performAppUpdateReload() {
  if (syncDirtyState()) {
    alert("Salva la pratica prima di aggiornare l'app.");
    showToast("Aggiornamento disponibile. Salva la pratica prima di aggiornare.", "warning");
    return false;
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      await registration.update().catch(() => null);
    }
  }
  await clearOldOroactiveCaches();
  window.location.reload();
  return true;
}

function hideAppUpdateBanner() {
  document.getElementById("oroactiveUpdateBanner")?.remove();
}

function showAppUpdateBanner(serverVersion = {}) {
  if (state.appUpdateBannerDismissed) return;
  const customMessage = typeof serverVersion === "string" ? serverVersion : "";
  let banner = document.getElementById("oroactiveUpdateBanner");
  if (!banner) {
    banner = document.createElement("aside");
    banner.id = "oroactiveUpdateBanner";
    banner.setAttribute("role", "status");
    banner.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px;border:1px solid rgba(255,138,24,.55);border-radius:12px;background:rgba(18,18,18,.96);color:#fff;box-shadow:0 18px 45px rgba(0,0,0,.45);";
    banner.innerHTML = `
      <span data-update-copy></span>
      <span style="display:flex;gap:8px;align-items:center;">
        <button class="ghost-button" type="button" data-app-update-later>Dopo</button>
        <button class="primary-button" type="button" data-app-update-now>Aggiorna ora</button>
      </span>
    `;
    banner.querySelector("[data-app-update-later]")?.addEventListener("click", () => {
      state.appUpdateBannerDismissed = true;
      hideAppUpdateBanner();
    });
    banner.querySelector("[data-app-update-now]")?.addEventListener("click", () => {
      performAppUpdateReload().catch(() => showToast("Aggiornamento non completato. Riprova tra qualche secondo.", "error"));
    });
    document.body.appendChild(banner);
  }
  const dirty = syncDirtyState();
  const copy = customMessage || (dirty
    ? "Aggiornamento disponibile. Salva la pratica prima di aggiornare."
    : "Nuova versione OroActive disponibile");
  banner.querySelector("[data-update-copy]").textContent = copy;
  if (!customMessage) state.serverVersion = normalizeAppVersion(serverVersion);
}

async function appUpdateDebugInfo() {
  const cacheKeys = window.caches?.keys ? await window.caches.keys().catch(() => []) : [];
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  return {
    serviceWorkerActive: Boolean(navigator.serviceWorker?.controller || registration?.active),
    serviceWorkerWaiting: Boolean(registration?.waiting),
    caches: cacheKeys.filter((key) => /^oroactive-|^static-|^asset-|^pwa-/i.test(key)),
    dirty: syncDirtyState(),
    lastCheckedAt: state.appUpdateLastCheckedAt || "",
    userAgent: navigator.userAgent || ""
  };
}

function versionDetailRow(label, value) {
  return `<div class="print-field"><span>${escapeHtml(label)}</span>${escapeHtml(value || "non disponibile")}</div>`;
}

async function openAppVersionPreview() {
  if (!isFounder() || !previewModal || !previewBody || !previewTitle) return;
  const [client, server, debug] = await Promise.all([
    ensureClientVersion().catch(() => null),
    fetchAppVersion("/api/version").catch(() => null),
    appUpdateDebugInfo()
  ]);
  if (server) state.serverVersion = server;
  const updated = Boolean(client && server && appVersionKey(client) === appVersionKey(server));
  const status = client && server ? (updated ? "App aggiornata" : "Nuova versione disponibile") : "Impossibile verificare";
  previewTitle.textContent = "Verifica aggiornamento app";
  previewBody.innerHTML = `
    <section class="quality-decision-modal">
      <div class="print-grid">
        ${versionDetailRow("Versione client", client?.buildNumber)}
        ${versionDetailRow("Versione server", server?.buildNumber)}
        ${versionDetailRow("Commit client", client?.shortCommit || client?.commit)}
        ${versionDetailRow("Commit server", server?.shortCommit || server?.commit)}
        ${versionDetailRow("Build client", client?.buildTime)}
        ${versionDetailRow("Build server", server?.buildTime)}
        ${versionDetailRow("Stato", status)}
        ${versionDetailRow("Service worker attivo", debug.serviceWorkerActive ? "si" : "no")}
        ${versionDetailRow("Service worker in attesa", debug.serviceWorkerWaiting ? "si" : "no")}
        ${versionDetailRow("Cache disponibili", debug.caches.join(", ") || "nessuna")}
        ${versionDetailRow("Ultima verifica", debug.lastCheckedAt ? formatDateTime(debug.lastCheckedAt) : "non disponibile")}
        ${versionDetailRow("Pratica non salvata", debug.dirty ? "si" : "no")}
        ${versionDetailRow("Dispositivo", debug.userAgent)}
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-app-version-check>Verifica ora</button>
        <button class="primary-button" type="button" data-app-update-now>Aggiorna ora</button>
        <button class="ghost-button" type="button" data-close-preview>Chiudi</button>
      </div>
    </section>
  `;
  previewModal.hidden = false;
}

async function checkForAppUpdate(options = {}) {
  try {
    const showResult = Boolean(options.showResult || options.manual);
    const client = await ensureClientVersion();
    const server = await fetchAppVersion("/api/version");
    state.serverVersion = server;
    state.appUpdateLastCheckedAt = new Date().toISOString();
    if (!server.ok) return false;
    const changed = appVersionKey(server) !== appVersionKey(client);
    state.appUpdateAvailable = changed;
    if (changed) {
      state.appUpdateBannerDismissed = false;
      showAppUpdateBanner(server);
      if (options.autoReload && !syncDirtyState() && !document.hidden) {
        window.setTimeout(() => void performAppUpdateReload(), 1200);
      }
    } else {
      hideAppUpdateBanner();
    }
    if (showResult) {
      showToast(changed ? "Nuova versione OroActive disponibile." : "App aggiornata.", changed ? "warning" : "success");
      await openAppVersionPreview();
    }
    return changed;
  } catch {
    if (options.showResult || options.manual) {
      showToast("Impossibile verificare l'aggiornamento app.", "error");
      await openAppVersionPreview();
    }
    return false;
  }
}

function startAppVersionChecker() {
  ensureClientVersion().catch(() => null);
  window.clearInterval(state.appUpdateTimer);
  state.appUpdateTimer = window.setInterval(() => checkForAppUpdate(), OROACTIVE_UPDATE_INTERVAL_MS);
  window.addEventListener("focus", () => checkForAppUpdate());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkForAppUpdate();
  });
}

function startAppVersionChecks() {
  startAppVersionChecker();
}

async function handleAppUpdateNow() {
  return performAppUpdateReload();
}

function triggerLogoRefresh() {
  if (mainMenuLogoRefresh?.classList) {
    mainMenuLogoRefresh.classList.add("logo-refresh-clicked");
  }
  aurumLookAtLogo("Aggiornamento in corso, controllo che sia tutto pronto.");
  showToast("Verifico l'ultima versione dell'app...", "warning");
  window.setTimeout(() => {
    mainMenuLogoRefresh?.classList?.remove("logo-refresh-clicked");
  }, 220);
  window.setTimeout(() => {
    void checkForAppUpdate({ manual: true });
  }, 280);
}

async function loadStoredAuthToken() {
  const token = await loadDeviceStorage("oroactive-auth-token");
  state.authToken = token;
  return token;
}

async function saveStoredAuthToken(token) {
  state.authToken = token || "";
  await saveDeviceStorage("oroactive-auth-token", token || "");
}

async function clearStoredAuthToken() {
  state.authToken = "";
  await saveDeviceStorage("oroactive-auth-token", "");
}

async function loadDeviceStorage(key) {
  return localStorage.getItem(key) || "";
}

async function saveDeviceStorage(key, value) {
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

function maybeShowInstallHint() {
  if (!installHint || localStorage.getItem("oroactive-install-hint-dismissed")) return;
  if (isStandalonePwa() || !isAppleTouchDevice()) return;
  installHint.hidden = false;
}

function updateMainMenuClock() {
  if (!mainMenuClock) return;
  const now = new Date();
  const date = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(now);
  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);
  mainMenuClock.textContent = `${date} - ${time}`;
}

function startMainMenuClock() {
  updateMainMenuClock();
  if (state.clockTimer) return;
  state.clockTimer = window.setInterval(updateMainMenuClock, 1000);
}

function resetSessionTimeout() {
  if (!state.authToken) return;
  window.clearTimeout(state.sessionTimeoutTimer);
  state.sessionTimeoutTimer = window.setTimeout(() => {
    showToast("Sessione scaduta per inattività. Effettua nuovamente l'accesso.", "warning");
    showLogin();
  }, 30 * 60 * 1000);
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasSeenStartupSplashThisSession() {
  try {
    return sessionStorage.getItem(OROACTIVE_SPLASH_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function markStartupSplashSeen() {
  try {
    sessionStorage.setItem(OROACTIVE_SPLASH_SESSION_KEY, "true");
  } catch {
    // sessionStorage can be unavailable in private or restricted browser modes.
  }
}

function setSplashStatus(message, options = {}) {
  if (!splashStatus) return;
  splashStatus.textContent = message || "";
  splashStatus.classList.toggle("is-ready", Boolean(options.ready));
}

function showStartupSplash() {
  if (!splashScreen) return;
  state.splashStartedAt = performance.now();
  state.splashReady = false;
  state.splashError = null;
  splashScreen.classList.remove("hidden", "is-exiting", "is-error");
  splashScreen.classList.toggle("is-brief", hasSeenStartupSplashThisSession());
  if (splashError) splashError.hidden = true;
  setSplashStatus("Verifica sessione");
  document.body.classList.add("splash-active");
}

async function hideStartupSplash() {
  if (!splashScreen || splashScreen.classList.contains("hidden")) return;
  state.splashReady = true;
  setSplashStatus("OroActive pronto", { ready: true });
  await wait(OROACTIVE_SPLASH_READY_MS);
  splashScreen.classList.add("is-exiting");
  await wait(OROACTIVE_SPLASH_EXIT_MS);
  splashScreen.classList.add("hidden");
  splashScreen.classList.remove("is-exiting", "is-error", "is-brief");
  document.body.classList.remove("splash-active");
  markStartupSplashSeen();
}

async function completeStartupSplash(targetView) {
  const minimumDuration = hasSeenStartupSplashThisSession() ? OROACTIVE_SPLASH_BRIEF_MS : OROACTIVE_SPLASH_MIN_MS;
  const elapsed = performance.now() - (state.splashStartedAt || performance.now());
  if (elapsed < minimumDuration) await wait(minimumDuration - elapsed);
  if (targetView === "main") {
    openMainMenuCleanly({ keepSplash: true });
    maybeStartFirstRunTutorial();
  }
  await hideStartupSplash();
}

function showStartupSplashError(error) {
  console.error("OroActive startup error", error);
  state.splashError = error;
  if (!splashScreen) return;
  splashScreen.classList.remove("hidden", "is-exiting");
  splashScreen.classList.add("is-error");
  document.body.classList.add("splash-active");
  setSplashStatus("", { ready: true });
  if (splashError) splashError.hidden = false;
}

function reportFrontendFailure(area, error) {
  console.error(`OroActive ${area} error`, error);
}

async function runSafeStartupTask(area, task) {
  try {
    return await task();
  } catch (error) {
    reportFrontendFailure(area, error);
    return null;
  }
}

function runSafeUiTask(area, task) {
  try {
    return task();
  } catch (error) {
    reportFrontendFailure(area, error);
    return null;
  }
}

function shouldRetryApi(error, responseStatus) {
  if (responseStatus && responseStatus < 500 && responseStatus !== 429) return false;
  return error?.name === "AbortError" || !navigator.onLine || !responseStatus || responseStatus >= 500 || responseStatus === 429;
}

function serverConnectionError() {
  const error = new Error("Connessione al server non disponibile. Riprova tra qualche secondo.");
  error.isConnectionError = true;
  return error;
}

function cleanUserMessage(message, fallback = "Operazione non completata. Riprova tra qualche secondo.") {
  const raw = typeof message === "string" ? message.trim() : "";
  if (!raw || raw === "undefined" || raw === "null" || raw === "[object Object]") return fallback;
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return "Connessione al server non disponibile. Riprova tra qualche secondo.";
  }
  if (/TypeError|ReferenceError|SyntaxError|Cannot read|is not defined|Unexpected token|stack trace|duplicate key|violates .*constraint|invalid input syntax|PostgreSQL|SQLSTATE/i.test(raw)) {
    return fallback;
  }
  return raw.length > 320 ? `${raw.slice(0, 317)}...` : raw;
}

function apiErrorFallback(path = "", status = 0) {
  if (status === 401) return "Sessione scaduta. Effettua nuovamente l'accesso.";
  if (status === 403) return "Operazione non autorizzata.";
  if (/\/utenti|\/users/.test(path)) return "Operazione utenti non completata.";
  if (/\/atti|\/acts/.test(path)) return "Operazione atto non completata.";
  if (/\/suspended-practices/.test(path)) return "Operazione pratica sospesa non completata.";
  if (/\/approvals/.test(path)) return "Operazione autorizzazione non completata.";
  if (/\/notifications/.test(path)) return "Operazione notifiche non completata.";
  if (/\/customer-trust-pack/.test(path)) return "Customer Trust Pack non completato.";
  if (/\/privacy-policy/.test(path)) return "Centro Privacy non caricato.";
  if (/\/store-health/.test(path)) return "Salute Negozio non caricata.";
  if (/\/founder-daily-report/.test(path)) return "Founder Daily Report non completato.";
  if (/\/backups/.test(path)) return "Operazione backup non completata.";
  if (/\/training/.test(path)) return "Training Operatore non completato.";
  if (/\/academy|\/corsi/.test(path)) return "Operazione Academy non completata.";
  if (/\/crm|\/clienti/.test(path)) return "Operazione CRM non completata.";
  if (/\/aurum-shield|\/quality-check/.test(path)) return "Controllo pratica non completato.";
  if (/\/quotazioni/.test(path)) return "Analisi quotazioni non completata.";
  if (/\/ai|\/aurum/.test(path)) return "Operazione Aurum non completata.";
  return "Operazione non completata. Riprova tra qualche secondo.";
}

function sanitizeForSave(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => sanitizeForSave(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForSave(item)]));
  }
  return value;
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  const attempts = Math.max(1, Number(options.retries ?? API_RETRY_ATTEMPTS));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 18000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        headers,
        ...options,
        signal: options.signal || controller.signal
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 401 && !path.startsWith("/auth/login")) {
          showLogin();
        }
        const error = new Error(cleanUserMessage(body.error, apiErrorFallback(path, response.status)));
        error.status = response.status;
        Object.assign(error, body);
        if (attempt < attempts && shouldRetryApi(error, response.status)) {
          await wait(350 * attempt);
          continue;
        }
        throw error;
      }
      return response.status === 204 ? null : response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts && shouldRetryApi(error, error.status)) {
        await wait(350 * attempt);
        continue;
      }
      if (error.name === "AbortError" || error instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(error.message || "")) {
        throw serverConnectionError();
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw lastError || serverConnectionError();
}

function mergeActsIntoCache(acts = []) {
  acts.forEach((saved) => {
    const index = demoActs.findIndex(
      (item) => (saved.id && item.id === saved.id) || item.practiceNumber === saved.practiceNumber
    );
    if (index >= 0) demoActs[index] = { ...demoActs[index], ...saved };
    else demoActs.unshift(saved);
  });
}

async function loadSavedActs(options = {}) {
  const {
    force = false,
    store = "",
    field = "",
    q = "",
    includeSuspended = false,
    limit = ACT_LIST_LIMIT,
    offset = 0,
    silent = false
  } = options;
  const endpoint = q ? "/atti/search" : "/atti";
  const params = queryString({ store, field, q, includeSuspended: includeSuspended ? "true" : "", limit, offset });
  const cacheKey = `${endpoint}?${params}`;
  const cached = state.actsCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.time < ACT_CACHE_TTL) {
    mergeActsIntoCache(cached.acts);
    return cached.acts;
  }

  try {
    if (!silent) showLoading("Caricamento atti...");
    const acts = await apiRequest(`${endpoint}${params ? `?${params}` : ""}`);
    state.actsCache.set(cacheKey, { time: Date.now(), acts });
    if (store && !q) {
      for (let index = demoActs.length - 1; index >= 0; index -= 1) {
        if (demoActs[index].store === store) demoActs.splice(index, 1);
      }
    }
    mergeActsIntoCache(acts);
    return acts;
  } catch (error) {
    if (!silent) showToast(error.message || "Database non raggiungibile: controllo connessione server.");
    return [];
  } finally {
    if (!silent) hideLoading();
  }
}

function isPracticeFormEmpty() {
  const selectors = [
    '[name="nome"]',
    '[name="cognome"]',
    '[name="nascita"]',
    '[name="luogo"]',
    '[name="cf"]',
    '[name="telefono"]',
    '[name="indirizzo"]',
    '[name="numeroDocumento"]',
    '[name="dataRilascioDocumento"]',
    '[name="scadenzaDocumento"]',
    "#saleTotal"
  ];
  const hasFilledFields = selectors.some((selector) => hasValue(selector));
  const hasFilledItems = [...document.querySelectorAll(".ceded-item-row input")].some((input) => input.value.trim());
  return !hasFilledFields && !hasFilledItems && state.uploadedCaptures.size === 0 && state.signatures.every((signed) => !signed);
}

function hasStartedClientSection() {
  return [
    '[name="nome"]',
    '[name="cognome"]',
    '[name="nascita"]',
    '[name="luogo"]',
    '[name="provinciaNascita"]',
    '[name="cf"]',
    '[name="telefono"]',
    '[name="email"]',
    '[name="cittadinanza"]',
    '[name="sesso"]',
    '[name="indirizzo"]',
    '[name="provinciaResidenza"]',
    '[name="numeroDocumento"]',
    '[name="dataRilascioDocumento"]',
    '[name="scadenzaDocumento"]'
  ].some((selector) => hasValue(selector));
}

function markPracticeDirty() {
  if (state.editingPracticeNumber && !state.suppressDirtyTracking) {
    state.editingDirty = true;
  }
  syncDirtyState();
}

async function syncActsFromServer() {
  const activeArchive = document.getElementById("archive")?.classList.contains("active-screen");
  const activeFusion = document.getElementById("fusion")?.classList.contains("active-screen");
  const activeSuspended = document.getElementById("suspendedPractices")?.classList.contains("active-screen");
  if (activeArchive) {
    await loadArchiveScreenData({ force: true, silent: true });
    renderArchiveGroups();
  }
  if (activeFusion) {
    await loadFusionScreenData({ force: true, silent: true });
    renderFusionGroups();
  }
  if (activeSuspended) {
    await loadSuspendedPractices();
  }
  if (isAdmin() && document.getElementById("users")?.classList.contains("active-screen")) {
    await loadUsers();
  }
  maybeShowLevelUnlockMessage();

  if (!state.editingPracticeNumber && isPracticeFormEmpty()) {
    await updatePracticeNumber();
  }
}

function persistPendingSync() {
  const value = JSON.stringify(state.pendingSync.slice(0, 30));
  saveDeviceStorage("oroactive-pending-sync", value).catch(() => {});
}

async function loadPendingSyncQueue() {
  const value = await loadDeviceStorage("oroactive-pending-sync") || "[]";
  try {
    state.pendingSync = JSON.parse(value);
  } catch {
    state.pendingSync = [];
  }
}

function queuePendingActSave(act, method, identifier) {
  const pending = {
    id: `pending-${Date.now()}`,
    method,
    identifier,
    act: sanitizeForSave(act),
    createdAt: new Date().toISOString()
  };
  state.pendingSync = state.pendingSync.filter((item) => item.identifier !== identifier && item.act?.practiceNumber !== act.practiceNumber);
  state.pendingSync.unshift(pending);
  persistPendingSync();
  return { ...act, id: act.id || pending.id, _pendingSync: true };
}

async function flushPendingSync() {
  if (state.syncingPending || !state.authToken || !state.pendingSync.length || !navigator.onLine) return;
  state.syncingPending = true;
  try {
    const remaining = [];
    for (const item of state.pendingSync) {
      try {
        const identifier = item.act.id || item.identifier || item.act.practiceNumber;
        const path = item.method === "PUT" ? `/atti/${encodeURIComponent(identifier)}` : "/atti";
        const saved = await apiRequest(path, {
          method: item.method,
          retries: 1,
          timeoutMs: 30000,
          body: JSON.stringify(sanitizeForSave(item.act))
        });
        mergeActsIntoCache([saved]);
      } catch {
        remaining.push(item);
      }
    }
  state.pendingSync = remaining;
  persistPendingSync();
  } finally {
    state.syncingPending = false;
  }
}

async function saveActRecord(act, method = "POST") {
  if (state.saving) throw new Error("Salvataggio già in corso.");
  state.saving = true;
  syncDirtyState();
  const identifier = act.id || state.editingActId || state.editingPracticeNumber || act.practiceNumber;
  const path = method === "PUT" ? `/atti/${encodeURIComponent(identifier)}` : "/atti";
  document.querySelectorAll("#archivePractice, #saveSuspendedPractice, #nextStep").forEach((button) => {
    button.disabled = true;
  });
  showLoading("Salvataggio in corso...");
  let saved;
  try {
    const payload = sanitizeForSave(act);
    saved = await apiRequest(path, {
      method,
      timeoutMs: 60000,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!navigator.onLine || /Connessione lenta|Failed to fetch|NetworkError/i.test(error.message || "")) {
      saved = queuePendingActSave(act, method, identifier);
      showToast("Connessione lenta: atto salvato temporaneamente e sincronizzato appena possibile.", "warning");
    } else {
      throw error;
    }
  } finally {
    hideLoading();
    state.saving = false;
    syncDirtyState();
    document.querySelectorAll("#archivePractice, #saveSuspendedPractice, #nextStep").forEach((button) => {
      button.disabled = false;
    });
  }
  state.actsCache.clear();
  const index = demoActs.findIndex(
    (item) => (saved.id && item.id === saved.id) || item.practiceNumber === saved.practiceNumber
  );
  if (index >= 0) demoActs[index] = { ...demoActs[index], ...saved };
  else demoActs.unshift(saved);
  if (!saved._pendingSync) {
    showToast("Salvataggio completato", "success");
  }
  return saved;
}

async function deleteActRecord(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  const identifier = act?.id || practiceNumber;
  await apiRequest(`/atti/${encodeURIComponent(identifier)}`, { method: "DELETE" });
  state.actsCache.clear();
  const index = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (index >= 0) demoActs.splice(index, 1);
}

async function getActRecord(identifier) {
  try {
    showLoading("Apertura pratica...");
    const saved = await apiRequest(`/atti/${encodeURIComponent(identifier)}`);
    const index = demoActs.findIndex(
      (item) => (saved.id && item.id === saved.id) || item.practiceNumber === saved.practiceNumber
    );
    if (index >= 0) demoActs[index] = saved;
    else demoActs.unshift(saved);
    return saved;
  } catch {
    return demoActs.find((item) => item.id === identifier || item.practiceNumber === identifier) || null;
  } finally {
    hideLoading();
  }
}

function showToast(message, type = "") {
  toast.textContent = cleanUserMessage(message);
  toast.classList.remove("success", "error", "warning");
  if (type) toast.classList.add(type);
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show", "success", "error", "warning");
  }, 2600);
}

async function withButtonBusy(button, busyText, task) {
  if (!button || button.disabled) return;
  const previousText = button.textContent;
  button.disabled = true;
  if (busyText) button.textContent = busyText;
  try {
    await task();
  } catch (error) {
    showToast(cleanUserMessage(error?.message), "error");
  } finally {
    button.disabled = false;
    if (busyText) button.textContent = previousText;
  }
}

function showLogin(options = {}) {
  const { keepSplash = false } = options;
  clearStoredAuthToken();
  state.currentUser = null;
  if (mainUserMenuButton) mainUserMenuButton.textContent = "Elite";
  if (loggedUserName) loggedUserName.textContent = "";
  if (sessionUsername) sessionUsername.textContent = "";
  state.actsCache.clear();
  state.notifications = [];
  state.notificationUnreadCount = 0;
  state.privacyAcceptance = null;
  state.privacyNoticeShown = false;
  demoActs.splice(0, demoActs.length);
  stopNotificationPolling();
  closeNotificationDropdown();
  renderNotificationBadge();
  if (notificationCenter) notificationCenter.hidden = true;
  loginScreen.hidden = false;
  if (!keepSplash) {
    splashScreen.classList.add("hidden");
    document.body.classList.remove("splash-active");
  }
  mainMenuScreen.hidden = true;
  document.body.classList.remove("main-menu-active");
  closeMainMenuDropdowns();
  closeMainUserMenu();
  closeNotificationDropdown();
  updateAurumMascotVisibility();
  syncNotificationPlacement();
  appShell.hidden = true;
  if (state.syncTimer) window.clearInterval(state.syncTimer);
  state.syncTimer = null;
  window.clearTimeout(state.sessionTimeoutTimer);
  state.sessionTimeoutTimer = null;
}

function showAuthenticatedShell(options = {}) {
  const { keepSplash = false } = options;
  loginScreen.hidden = true;
  appShell.hidden = true;
  if (keepSplash) {
    splashScreen.classList.remove("hidden");
  } else {
    splashScreen.classList.add("hidden");
    document.body.classList.remove("splash-active");
  }
  mainMenuScreen.hidden = true;
  document.body.classList.remove("main-menu-active");
  syncNotificationPlacement();
}

function normalizeRole(role = "commesso") {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "founder") return "founder";
  if (normalized === "supervisore") return "supervisore";
  if (normalized === "admin") return "responsabile";
  if (normalized === "responsabile") return "responsabile";
  if (normalized === "aiuto_commesso" || normalized === "aiuto commesso" || normalized === "aiuto commessa" || normalized === "aiuto_commessa") {
    return "aiuto_commesso";
  }
  return "commesso";
}

function roleLabel(role) {
  return {
    founder: "Founder",
    supervisore: "Supervisore",
    responsabile: "Responsabile",
    commesso: "Commesso/a",
    aiuto_commesso: "Aiuto Commesso/a"
  }[normalizeRole(role)];
}

function displayUsername(user = {}) {
  if (user.username) return user.username;
  if (isFounderUser(user) && user.email) return user.email;
  return user.nome || "";
}

function isFounderUser(user = {}) {
  return normalizeRole(user?.ruolo) === "founder";
}

function displayMenuUserName(user = {}) {
  if (isFounderUser(user)) return "Elite";
  return [user.nome, user.cognome].filter(Boolean).join(" ").trim() || displayUsername(user) || user.email || "Operatore OroActive";
}

function displayUserFullName(user = {}) {
  const fullName = [user.nome, user.cognome].filter(Boolean).join(" ").trim();
  return fullName || displayMenuUserName(user);
}

function formatDateTime(value) {
  if (!value) return "Dato non inserito";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Dato non inserito";
  return date.toLocaleString("it-IT");
}

function canManageCoursesUi() {
  return normalizeRole(state.currentUser?.ruolo) === "founder";
}

function canEvaluateCoursesUi() {
  return ["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function tutorialStorageKey(user = state.currentUser) {
  const userKey = user?.id || displayUsername(user) || "utente";
  return `oroactive-tutorial-completato-${normalizeRole(user?.ruolo)}-${userKey}`;
}

function tutorialRoleIntro() {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") {
    return "Come Founder puoi vedere tutti i negozi, controllare gli utenti, verificare gli atti e supervisionare l'intero flusso. Questo tutorial ti mostra la compilazione perfetta di un atto, cosi puoi formare e correggere il team.";
  }
  if (role === "responsabile") {
    return "Come Responsabile puoi seguire gli atti dei negozi, controllare la qualita delle pratiche e supportare gli operatori. Il tutorial ti accompagna nella compilazione completa e nei controlli finali.";
  }
  if (role === "aiuto_commesso") {
    return "Come Aiuto Commesso/a il tuo obiettivo e compilare ogni pratica con ordine e precisione. Segui questi passaggi: il tutorial resta aperto mentre compili realmente l'atto.";
  }
  return "Come Commesso/a puoi creare e completare gli atti di vendita dei negozi abilitati. Il tutorial ti guida campo dopo campo fino all'archiviazione corretta.";
}

function openPracticeForTutorial(step = 0) {
  splashScreen.classList.add("hidden");
  document.body.classList.remove("splash-active");
  setScreen("practice");
  state.step = step;
  renderStep();
}

function buildTutorialSteps() {
  return [
    {
      title: "Benvenuto nel tutorial OroActive",
      text: `${tutorialRoleIntro()} Premi Avanti per iniziare: entreremo nella scheda Atto di Vendita e compileremo ogni sezione nell'ordine corretto.`,
      selector: ".main-menu-actions"
    },
    {
      title: "Inizia dall'Atto di Vendita",
      text: "Questa e la schermata dove nasce la pratica. Controlla negozio, numero atto, data e ora: il gestionale li prepara in automatico, ma vanno sempre verificati prima di procedere.",
      selector: ".practice-meta",
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Dati anagrafici cliente",
      text: "Inserisci nome e cognome. Il sesso viene suggerito dal nome quando riconosciuto, ma resta modificabile. Se il cliente e gia presente, il codice fiscale recupera automaticamente i dati salvati.",
      selector: '[name="nome"]',
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Codice fiscale e nascita",
      text: "Compila codice fiscale, data di nascita, luogo e provincia. Se scrivi un codice fiscale valido, il sistema ricava data, sesso, comune e provincia quando possibile.",
      selector: '[name="cf"]',
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Residenza",
      text: "Compila l'indirizzo nel formato consigliato: Via, numero civico e citta. Quando la citta viene riconosciuta, la provincia di residenza si compila automaticamente.",
      selector: '[name="indirizzo"]',
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Documento del cliente",
      text: "Seleziona tipo documento, numero, data rilascio, scadenza e professione. Se il documento e scaduto, OroActive evidenzia l'avviso per richiedere un documento valido.",
      selector: '[name="tipoDocumento"]',
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Oggetti preziosi ceduti",
      text: "Descrivi ogni oggetto, scegli metallo e titolo. Usa Aggiungi riga per inserire piu oggetti: da qui nasceranno pesi, foto preziosi e giacenza.",
      selector: "#cededItemsTable",
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Pesi e giacenza",
      text: "Inserisci il peso totale per titolo o materiale. Spunta la casella solo se vuoi stampare il peso sulla copia cliente.",
      selector: "#totalWeightFields",
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Pagamento e ripartizione",
      text: "Scegli il metodo di pagamento, inserisci il totale corrisposto e ripartisci l'importo per metallo se ci sono piu tipologie. Con Bonifico appare anche il campo IBAN.",
      selector: "#paymentMethod",
      action: () => openPracticeForTutorial(1)
    },
    {
      title: "Note operatore",
      text: "Usa le note solo per dettagli utili alla pratica. Evita informazioni superflue: devono aiutare chi rilegge l'atto in elenco, controllo qualita o stampa aziendale.",
      selector: ".textarea-label textarea",
      action: () => openPracticeForTutorial(1)
    },
    {
      title: "Firme cliente",
      text: "Fai firmare il cliente in tutte e tre le aree. Il gestionale non ti fa completare correttamente la pratica se le firme richieste non sono state acquisite.",
      selector: ".signature-grid",
      action: () => openPracticeForTutorial(2)
    },
    {
      title: "Documenti e fotografie",
      text: "Carica o fotografa documento, tessera sanitaria, preziosi e contabile quando richiesta. I riquadri diventano verdi quando la foto e presente e resta visionabile.",
      selector: ".capture-grid",
      action: () => openPracticeForTutorial(3)
    },
    {
      title: "Riepilogo e controlli obbligatori",
      text: "Nel riepilogo controlla cliente, codice fiscale, oggetti, totale, firme e allegati. La checklist laterale ti mostra cosa manca prima di completare la pratica.",
      selector: ".summary-grid",
      action: () => openPracticeForTutorial(4)
    },
    {
      title: "Stampa, archiviazione e completamento",
      text: "Copia cliente e copia aziendale servono per anteprima e stampa. Chiudi e archivia salva una pratica incompleta; Completa pratica salva definitivamente solo se i controlli sono positivi.",
      selector: ".print-box",
      action: () => openPracticeForTutorial(4)
    },
    {
      title: "Tutorial completato",
      text: "Ora puoi compilare l'atto seguendo lo stesso ordine. Se vuoi rivedere la guida, usa il pulsante Tutorial nel menu principale o nella barra laterale.",
      selector: ".bottom-actions",
      action: () => openPracticeForTutorial(0)
    }
  ];
}

function clearTutorialHighlight() {
  document.querySelectorAll(".tutorial-highlight").forEach((element) => element.classList.remove("tutorial-highlight"));
}

function applyTutorialHighlight(selector) {
  clearTutorialHighlight();
  if (!selector) return;
  const target = document.querySelector(selector);
  if (!target) return;
  target.classList.add("tutorial-highlight");
  window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }), 80);
}

function renderTutorialStep() {
  if (!state.tutorial.active) return;
  const step = state.tutorial.steps[state.tutorial.index];
  if (!step) {
    finishTutorial();
    return;
  }
  if (state.tutorial.source === "aurum") {
    runAurumTutorialStepAction(step);
    ensureAurumHelpAttributes();
  } else {
    step.action?.();
  }
  tutorialTitle.textContent = step.title;
  tutorialText.textContent = step.text;
  tutorialCount.textContent = `Passo ${state.tutorial.index + 1} di ${state.tutorial.steps.length}`;
  tutorialBack.disabled = state.tutorial.index === 0;
  tutorialNext.textContent = state.tutorial.index === state.tutorial.steps.length - 1 ? "Fine tutorial" : "Avanti";
  tutorialSkip.textContent = state.tutorial.source === "aurum" ? "Chiudi tutorial" : "Salta tutorial";
  tutorialOverlay.hidden = false;
  window.setTimeout(() => applyTutorialHighlight(step.selector), 120);
}

function markTutorialSeen() {
  if (!state.currentUser) return;
  localStorage.setItem(tutorialStorageKey(), "1");
  state.tutorial.pendingFirstRun = false;
}

function finishTutorial(options = {}) {
  const shouldRemember = state.tutorial.firstRun || options.remember;
  const source = state.tutorial.source || "";
  if (shouldRemember) markTutorialSeen();
  state.tutorial.active = false;
  state.tutorial.index = 0;
  state.tutorial.steps = [];
  state.tutorial.firstRun = false;
  state.tutorial.source = "";
  state.tutorial.id = "";
  tutorialOverlay.hidden = true;
  clearTutorialHighlight();
  tutorialSkip.textContent = "Salta tutorial";
  if (source === "aurum" && options.completed) {
    state.aurumMessages.push({ role: "assistant", content: "Tutorial completato." });
    renderAurumMessages();
  }
}

function startTutorial(options = {}) {
  if (!state.currentUser) return;
  state.tutorial.active = true;
  state.tutorial.index = 0;
  state.tutorial.steps = buildTutorialSteps();
  state.tutorial.firstRun = Boolean(options.firstRun);
  state.tutorial.source = "app";
  state.tutorial.id = "tutorial_generale";
  renderTutorialStep();
}

function maybeStartFirstRunTutorial() {
  if (!state.tutorial.pendingFirstRun || !state.currentUser) return;
  if (localStorage.getItem(tutorialStorageKey())) {
    state.tutorial.pendingFirstRun = false;
    return;
  }
  window.setTimeout(() => startTutorial({ firstRun: true }), 450);
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/gi, "")
    .toUpperCase()
    .trim();
}

function findComune(value = "") {
  const normalized = normalizeText(value);
  return LUOGHI_CATASTALI.find((item) => normalizeText(item.comune) === normalized) || null;
}

function findComuneInText(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return LUOGHI_CATASTALI
    .filter((item) => normalized.includes(normalizeText(item.comune)))
    .sort((first, second) => second.comune.length - first.comune.length)[0] || null;
}

function populateAutocompleteLists() {
  const cityList = document.getElementById("citySuggestions");
  if (cityList) {
    cityList.innerHTML = LUOGHI_CATASTALI
      .map((item) => `<option value="${escapeHtml(item.comune)}">${escapeHtml(item.provincia)} - ${escapeHtml(item.cittadinanza || "Italiana")}</option>`)
      .join("");
  }
  const provinceList = document.getElementById("provinceSuggestions");
  if (provinceList) {
    provinceList.innerHTML = PROVINCE_CODES.map((code) => `<option value="${escapeHtml(`${code} - ${PROVINCE_NAMES[code]}`)}"></option>`).join("");
  }
}

function upgradeProvinceFields() {
  ["birthProvince", "residenceProvince"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select || select.tagName !== "SELECT") return;
    const input = document.createElement("input");
    input.id = select.id;
    input.name = select.name;
    input.value = select.value || "";
    input.setAttribute("list", "provinceSuggestions");
    input.setAttribute("autocomplete", "off");
    input.classList.add("aurum-field-avoid-anchor");
    input.placeholder = "Es. MI - Milano";
    select.replaceWith(input);
  });
}

function fiscalNamePart(value = "", isName = false) {
  const text = normalizeText(value).replace(/\s+/g, "");
  const consonants = text.replace(/[AEIOU]/g, "");
  const vowels = text.replace(/[^AEIOU]/g, "");
  const source = isName && consonants.length >= 4
    ? `${consonants[0]}${consonants[2]}${consonants[3]}`
    : `${consonants}${vowels}XXX`;
  return source.slice(0, 3);
}

function inferSexFromName(value = "") {
  const firstName = normalizeText(value).split(/\s+/).filter(Boolean)[0] || "";
  if (!firstName) return "";
  if (NAME_SEX_HINTS.M.has(firstName)) return "M";
  if (NAME_SEX_HINTS.F.has(firstName)) return "F";
  if (firstName.endsWith("A")) return "F";
  if (firstName.endsWith("O") || firstName.endsWith("E") || firstName.endsWith("I")) return "M";
  return "";
}

function autofillSexFromName() {
  const sexField = document.querySelector('[name="sesso"]');
  if (!sexField || sexField.value) return false;
  const inferred = inferSexFromName(fieldValue('[name="nome"]'));
  if (!inferred) return false;
  setFieldIfDetected('[name="sesso"]', inferred, "medio");
  return true;
}

function fiscalControlChar(code15) {
  const odd = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
    K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
    U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
  };
  const even = {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
    K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
    U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25
  };
  const sum = [...code15].reduce((total, char, index) => total + (index % 2 === 0 ? odd[char] : even[char]), 0);
  return String.fromCharCode(65 + (sum % 26));
}

function generatedFiscalCode() {
  const name = fieldValue('[name="nome"]');
  const surname = fieldValue('[name="cognome"]');
  const sex = fieldValue('[name="sesso"]') || "M";
  const birthDate = fieldValue('[name="nascita"]');
  const luogo = findComune(fieldValue('[name="luogo"]'));
  if (!name || !surname || !birthDate || !luogo?.codice) return "";
  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear()).slice(-2);
  const month = FISCAL_MONTH_CODES[date.getMonth()];
  const day = String(date.getDate() + (sex === "F" ? 40 : 0)).padStart(2, "0");
  const code15 = `${fiscalNamePart(surname)}${fiscalNamePart(name, true)}${year}${month}${day}${luogo.codice}`;
  return `${code15}${fiscalControlChar(code15)}`;
}

function maybeAutofillFiscalCode() {
  if (state.fiscalCodeEditedManually) return;
  const generated = generatedFiscalCode();
  const fiscalInput = document.querySelector('[name="cf"]');
  if (!generated || !fiscalInput) return;
  fiscalInput.value = generated;
  updateCustomerSummary();
  showToast(fieldValue('[name="sesso"]')
    ? "Codice fiscale generato automaticamente."
    : "Codice fiscale generato automaticamente. Verifica il sesso del cliente.");
}

function decodeFiscalCodeData(value = "") {
  const code = normalizeFiscalCodeInput(value);
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(code)) return null;
  const year = Number(code.slice(6, 8));
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year > currentYear ? 1900 + year : 2000 + year;
  const monthIndex = FISCAL_MONTH_CODES.indexOf(code[8]);
  const rawDay = Number(code.slice(9, 11));
  const sex = rawDay > 40 ? "F" : "M";
  const day = rawDay > 40 ? rawDay - 40 : rawDay;
  const placeCode = code.slice(11, 15);
  const comune = LUOGHI_CATASTALI.find((item) => item.codice === placeCode);
  return {
    sex,
    birthDate: monthIndex >= 0 ? `${fullYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "",
    birthPlace: comune?.comune || "",
    birthProvince: comune?.provincia || "",
    citizenship: comune?.cittadinanza || ""
  };
}

function normalizeFiscalCodeInput(value = "") {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function applyFiscalCodeDecodedData(data) {
  if (!data) return false;
  setFieldIfDetected('[name="sesso"]', data.sex, "alto");
  setFieldIfDetected('[name="nascita"]', data.birthDate, "alto");
  setFieldIfDetected('[name="luogo"]', data.birthPlace, data.birthPlace ? "alto" : "");
  setFieldIfDetected('[name="provinciaNascita"]', data.birthProvince, data.birthProvince ? "alto" : "");
  setFieldIfDetected('[name="cittadinanza"]', data.citizenship, data.citizenship ? "alto" : "");
  updateCustomerSummary();
  updateDocumentExpiryWarning();
  updateChecklistState();
  return true;
}

function updateCitizenshipFromBirthPlace() {
  const place = findComune(fieldValue('[name="luogo"]'));
  if (!place?.cittadinanza) return;
  const citizenship = document.querySelector('[name="cittadinanza"]');
  if (citizenship && !citizenship.value.trim()) {
    setFieldIfDetected('[name="cittadinanza"]', place.cittadinanza, "alto");
  }
  if (place.provincia) setFieldIfDetected('[name="provinciaNascita"]', place.provincia, "alto");
}

function updateResidenceProvinceFromAddress() {
  const place = findComuneInText(fieldValue('[name="indirizzo"]'));
  if (place?.provincia) setFieldIfDetected('[name="provinciaResidenza"]', place.provincia, "alto");
}

function normalizeProvinceField(input) {
  if (!input?.matches?.('[name="provinciaNascita"], [name="provinciaResidenza"]')) return;
  const normalized = normalizeProvinceValue(input.value);
  if (normalized && input.value !== normalized) input.value = normalized;
}

async function lookupExistingClient(fiscalCode) {
  const code = normalizeFiscalCodeInput(fiscalCode);
  if (code.length !== 16) return;
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(code)) return;
  try {
    showLoading("Ricerca cliente...");
    const result = await apiRequest(`/clienti/codice-fiscale/${encodeURIComponent(code)}`, { timeoutMs: 9000 });
    if (result?.found && result.cliente) {
      applyExistingClient(result.cliente);
      showToast("Cliente già presente. Dati caricati automaticamente.");
      return;
    }
    applyFiscalCodeDecodedData(decodeFiscalCodeData(code));
  } catch {
    applyFiscalCodeDecodedData(decodeFiscalCodeData(code));
  } finally {
    hideLoading();
  }
}

function applyExistingClient(client = {}) {
  const documentData = client.documenti || {};
  const fields = [
    ['[name="nome"]', client.name || client.nome],
    ['[name="cognome"]', client.surname || client.cognome],
    ['[name="nascita"]', toDateInputValue(client.birthDate || client.data_nascita)],
    ['[name="luogo"]', client.birthPlace || client.luogo_nascita],
    ['[name="provinciaNascita"]', client.birthProvince || client.provincia_nascita],
    ['[name="sesso"]', client.sex || client.sesso],
    ['[name="cittadinanza"]', client.citizenship || client.cittadinanza],
    ['[name="indirizzo"]', client.address || client.indirizzo_residenza],
    ['[name="provinciaResidenza"]', client.residenceProvince || client.provincia_residenza],
    ['[name="telefono"]', client.phone || client.telefono],
    ['[name="email"]', client.email],
    ['[name="tipoDocumento"]', normalizeDocumentTypeValue(client.documentType || client.tipo_documento || documentData.documento_tipo)],
    ['[name="numeroDocumento"]', client.documentNumber || client.numero_documento],
    ['[name="dataRilascioDocumento"]', toDateInputValue(client.documentIssueDate || client.data_rilascio_documento)],
    ['[name="scadenzaDocumento"]', toDateInputValue(client.documentExpiry || client.data_scadenza_documento)],
    ["#paymentMethod", client.paymentMethod || client.metodo_pagamento],
    ["#paymentIban", client.iban]
  ];
  fields.forEach(([selector, value]) => {
    if (value) setFieldIfDetected(selector, value, "alto");
  });
  if (Array.isArray(client.fiscalDocumentAttachments)) {
    client.fiscalDocumentAttachments.forEach((attachment) => {
      if (!attachment?.key || !attachment.dataUrl) return;
      state.uploadedCaptures.add(attachment.key);
      state.captureFiles.set(attachment.key, {
        name: attachment.name || "Documento cliente",
        type: attachment.type || "image/jpeg",
        dataUrl: attachment.dataUrl,
        url: attachment.dataUrl
      });
    });
    state.attachments = state.uploadedCaptures.size;
  }
  applyExistingClientDocuments(documentData);
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  renderPreciousCaptureCards();
  updateAttachmentState();
  updateCustomerSummary();
  updateSaleTotal();
  updateDocumentExpiryWarning();
  updateChecklistState();
}

function setClientDocumentCapture(key, dataUrl, name) {
  if (!key || !dataUrl) return;
  state.uploadedCaptures.add(key);
  state.captureFiles.set(key, {
    name,
    type: String(dataUrl).startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg",
    dataUrl,
    url: dataUrl
  });
}

function applyExistingClientDocuments(documenti = {}) {
  if (!documenti || typeof documenti !== "object") return;
  const frontKey = documentCaptureKey("fronte");
  const backKey = documentCaptureKey("retro");
  setClientDocumentCapture(frontKey, documenti.documento_fronte_url, "Documento fronte cliente");
  setClientDocumentCapture(backKey, documenti.documento_retro_url, "Documento retro cliente");
  setClientDocumentCapture("codice-fiscale-fronte", documenti.codice_fiscale_fronte_url, "Codice fiscale fronte cliente");
  setClientDocumentCapture("codice-fiscale-retro", documenti.codice_fiscale_retro_url, "Codice fiscale retro cliente");
  state.attachments = state.uploadedCaptures.size;
  refreshCaptureCardStates();
}

function refreshCaptureCardStates() {
  document.querySelectorAll(".capture-card[data-capture-key]").forEach((card) => {
    const key = card.dataset.captureKey;
    const loaded = state.uploadedCaptures.has(key) || state.captureFiles.has(key);
    card.classList.toggle("loaded", loaded);
    const note = card.querySelector("em");
    if (note && loaded) note.textContent = "Foto acquisita";
  });
}

function isValidIban(value = "") {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(String(value || "").replace(/\s+/g, ""));
}

function updateDocumentExpiryWarning() {
  const input = document.querySelector('[name="scadenzaDocumento"]');
  const warning = document.getElementById("documentExpiryWarning");
  const label = input?.closest("label");
  if (!input || !warning) return false;
  const value = input.value;
  const expired = Boolean(value && new Date(`${value}T23:59:59`).getTime() < Date.now());
  warning.hidden = !expired;
  input.classList.toggle("document-expired", expired);
  label?.classList.toggle("expired", expired);
  return expired;
}

function isAdmin() {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function canViewUsersDirectory() {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function isFounder() {
  return normalizeRole(state.currentUser?.ruolo) === "founder";
}

function canManageKnowledgeUi() {
  return ["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function canViewControlSectionsUi() {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function canReviewActs(user = state.currentUser) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

const MENU_ROLES = {
  all: ["founder", "supervisore", "responsabile", "commesso", "aiuto_commesso"],
  operators: ["founder", "supervisore", "responsabile", "commesso"],
  controls: ["founder", "supervisore", "responsabile"],
  founder: ["founder"],
  backup: ["founder", "responsabile"],
  administration: ["founder", "supervisore", "responsabile"]
};

const MENU_GROUPS = [
  {
    id: "operativita",
    label: "Operatività",
    description: "Atti, giacenza, fusioni e quotazioni.",
    icon: "Atti",
    order: 10,
    roles: MENU_ROLES.all,
    items: [
      { id: "new-sale-deed", label: "Nuovo atto di vendita", description: "Crea una nuova pratica.", icon: "+", order: 10, section: "practice", roles: MENU_ROLES.all, keywords: "atto vendita pratica nuovo compilazione" },
      { id: "sale-deeds-list", label: "Elenco atti", description: "Archivio pratiche.", icon: "Lista", order: 20, section: "archive", roles: MENU_ROLES.operators, keywords: "elenco atti archivio customer trust pack copia cliente" },
      { id: "suspended-practices", label: "Pratiche sospese", description: "Pratiche da correggere.", icon: "Alert", order: 30, section: "suspendedPractices", roles: MENU_ROLES.all, keywords: "sospese incomplete autorizzazione qualità" },
      { id: "stock", label: "Giacenza", description: "Materiali e titoli.", icon: "Metalli", order: 40, section: "giacenza", roles: MENU_ROLES.controls, keywords: "giacenza metalli oro argento platino" },
      { id: "melting", label: "Fusioni", description: "Lotti e raffineria.", icon: "Lotti", order: 50, section: "fusioni", roles: MENU_ROLES.controls, keywords: "fusioni lotti raffineria metalli" },
      { id: "quotes", label: "Quotazioni", description: "Oro, argento e mercato.", icon: "EUR", order: 60, section: "quotazione", roles: MENU_ROLES.operators, keywords: "quotazioni oro argento platino prezzi analisi mercato competitor metalli" }
    ]
  },
  {
    id: "clienti",
    label: "Clienti",
    description: "CRM, storico clienti e Trust Pack.",
    icon: "Clienti",
    order: 20,
    roles: MENU_ROLES.operators,
    items: [
      { id: "crm", label: "CRM Clienti", description: "Storico e anagrafiche cliente.", icon: "CR", order: 10, section: "crm", roles: MENU_ROLES.operators, keywords: "crm clienti ricerca cliente storico" },
      { id: "trust-pack", label: "Customer Trust Pack", description: "Pacchetto trasparenza cliente.", icon: "TP", order: 20, section: "archive", roles: MENU_ROLES.operators, keywords: "trust pack copia cliente pdf trasparenza" },
      { id: "customer-search", label: "Ricerca cliente", description: "Trova rapidamente un cliente.", icon: "RC", order: 30, section: "crm", roles: MENU_ROLES.operators, keywords: "ricerca cliente anagrafica codice fiscale" }
    ]
  },
  {
    id: "formazione",
    label: "Formazione",
    description: "Academy, corsi e Gaming OroActive.",
    icon: "Academy",
    order: 30,
    roles: MENU_ROLES.all,
    items: [
      { id: "academy", label: "OroActive Academy", description: "Ingresso unico a catalogo, certificazioni, badge e training.", icon: "OA", order: 10, section: "training", courseTabShortcut: "catalog", roles: MENU_ROLES.all, keywords: "academy formazione catalogo academy corsi certificazioni attestati badge training operatore gestione academy" },
      { id: "gold-coin-encyclopedia", label: "Elenco Monete", description: "Enciclopedia monete d'oro con schede, storia e ricerca fotografica AI.", icon: "EM", order: 60, section: "coinEncyclopedia", roles: MENU_ROLES.all, keywords: "elenco monete monete oro enciclopedia numismatica sterlina marengo krugerrand sovereign riconoscimento fotocamera" },
      { id: "gaming-oroactive", label: "Gaming OroActive", description: "Aurum Blocks arcade formativo.", icon: "GO", order: 70, section: "gaming", roles: MENU_ROLES.all, keywords: "gaming oroactive giochi arcade formazione punteggi carature" },
      { id: "knowledge", label: "Nuova conoscenza", description: "Contenuti utili per l'AI.", icon: "AI", order: 80, section: "knowledgeNotes", roles: ["founder", "responsabile"], condition: "knowledge", keywords: "conoscenza ai approvata aurum" },
      { id: "app-tutorial", label: "Tutorial app", description: "Guida rapida all'app.", icon: "TU", order: 100, action: "tutorial", roles: MENU_ROLES.all, keywords: "tutorial guida aiuto" }
    ]
  },
  {
    id: "controllo",
    label: "Controllo",
    description: "Qualità, sicurezza e autorizzazioni.",
    icon: "Scudo",
    order: 40,
    roles: MENU_ROLES.all,
    items: [
      { id: "antifraud", label: "Antifrode AI", description: "Alert e controlli rischio.", icon: "AF", order: 10, section: "antifraud", roles: MENU_ROLES.controls, condition: "control", keywords: "antifrode rischio alert" },
      { id: "aurum-shield", label: "Aurum Shield", description: "Risk score e compliance.", icon: "SH", order: 20, section: "aurumShield", roles: MENU_ROLES.founder, condition: "founder", keywords: "shield rischio score compliance" },
      { id: "quality-check", label: "Controllo Qualità", description: "Checklist pratica.", icon: "CQ", order: 30, section: "practice", roles: MENU_ROLES.operators, keywords: "controllo qualità checklist pratica" },
      { id: "approvals", label: "Autorizzazioni", description: "Richieste e approvazioni.", icon: "Ok", order: 40, section: "approvals", roles: MENU_ROLES.all, condition: "approval", keywords: "richieste autorizzazione approva rifiuta" },
      { id: "audit", label: "Audit Trail", description: "Tracciamento azioni.", icon: "AT", order: 60, section: "auditTrail", roles: MENU_ROLES.founder, condition: "founder", keywords: "audit log attività sicurezza" },
      { id: "backup", label: "Backup", description: "Backup e verifica.", icon: "BK", order: 70, section: "backups", roles: MENU_ROLES.backup, condition: "backup", keywords: "backup verifica download restore" }
    ]
  },
  {
    id: "direzione",
    label: "Direzione",
    description: "Dashboard, KPI e report.",
    icon: "KPI",
    order: 50,
    roles: MENU_ROLES.founder,
    condition: "founder",
    items: [
      { id: "founder-dashboard", label: "Dashboard Founder / KPI rete", description: "Controllo globale.", icon: "DF", order: 10, section: "dashboard", roles: MENU_ROLES.founder, condition: "founder", keywords: "dashboard founder kpi rete statistiche" },
      { id: "daily-report", label: "Founder Daily Report", description: "Report operativo giornaliero.", icon: "FR", order: 20, section: "founderDailyReport", roles: MENU_ROLES.founder, condition: "founder", keywords: "report giornaliero founder" },
      { id: "store-health", label: "Salute Negozio / Performance negozi", description: "Health score punti vendita.", icon: "SN", order: 30, section: "storeHealth", roles: MENU_ROLES.founder, condition: "founder", keywords: "salute negozio store health performance" },
      { id: "verify-app-update", label: "Verifica aggiornamento app", description: "Versione client e server.", icon: "UP", order: 40, action: "app-update", roles: MENU_ROLES.founder, condition: "founder", keywords: "aggiornamento app pwa versione build service worker cache" }
    ]
  },
  {
    id: "amministrazione",
    label: "Amministrazione",
    description: "Utenti, privacy e impostazioni.",
    icon: "Admin",
    order: 60,
    roles: MENU_ROLES.administration,
    items: [
      { id: "users", label: "Utenti e permessi", description: "Ruoli e profili.", icon: "UT", order: 10, section: "users", roles: MENU_ROLES.administration, condition: "userDirectory", keywords: "utenti permessi ruoli profili" },
      { id: "stores", label: "Negozi", description: "Sedi e configurazioni.", icon: "NG", order: 20, section: "stores", roles: MENU_ROLES.founder, condition: "founder", keywords: "negozi sedi amministrazione" },
      { id: "aurum-admin", label: "Gestione Aurum", description: "Memorie e impostazioni Aurum.", icon: "GA", order: 30, section: "aurumAdmin", roles: MENU_ROLES.founder, condition: "founder", keywords: "gestione aurum impostazioni memoria" },
      { id: "privacy-center", label: "Centro Privacy", description: "Privacy Policy e dati personali.", icon: "PV", order: 40, section: "privacyCenter", roles: MENU_ROLES.all, keywords: "privacy dati personali informativa gdpr policy" },
      { id: "oroactive-website", label: "Sito web OroActive", description: "Apri il sito ufficiale.", icon: "SW", order: 50, action: "website", roles: MENU_ROLES.all, keywords: "sito web oroactive dominio" },
      { id: "profile", label: "Profilo utente", description: "Dati del tuo account.", icon: "PR", order: 60, section: "profile", roles: MENU_ROLES.all, keywords: "profilo dati utente account" }
    ]
  }
];

const MENU_QUICK_ACTIONS = [
  { id: "quick-new-sale-deed", label: "Nuovo atto", description: "Crea subito", icon: "+", order: 10, section: "practice", roles: MENU_ROLES.all, keywords: "atto vendita nuovo" },
  { id: "quick-archive", label: "Elenco atti", description: "Archivio pratiche", icon: "Lista", order: 20, section: "archive", roles: MENU_ROLES.operators, keywords: "elenco atti archivio" },
  { id: "quick-suspended", label: "Pratiche sospese", description: "Da correggere", icon: "Alert", order: 30, section: "suspendedPractices", roles: MENU_ROLES.all, keywords: "pratiche sospese" },
  { id: "quick-quotes", label: "Quotazioni", description: "Prezzi metalli", icon: "EUR", order: 40, section: "quotazione", roles: MENU_ROLES.operators, keywords: "quotazioni oro argento prezzi analisi mercato" }
];

const MAIN_MENU_SEARCH_SHORTCUTS = [
  {
    id: "search-open-aurum",
    label: "Apri Aurum",
    description: "Assistente operativo OroActive",
    icon: "Aurum",
    action: "aurum",
    roles: MENU_ROLES.all,
    keywords: "aurum assistente ia ai chat aiuto"
  }
];

function menuRoleAllowed(item = {}) {
  const role = normalizeRole(state.currentUser?.ruolo);
  return !item.roles || item.roles.includes(role);
}

function menuConditionAllowed(condition = "") {
  if (!condition) return true;
  return {
    founder: isFounder,
    backup: canManageBackupsUi,
    knowledge: canManageKnowledgeUi,
    userDirectory: canViewUsersDirectory,
    control: canViewControlSectionsUi,
    approval: canUseApprovalSectionUi
  }[condition]?.() ?? true;
}

function isMenuItemVisible(item = {}) {
  return Boolean(state.currentUser) && menuRoleAllowed(item) && menuConditionAllowed(item.condition);
}

function menuItemMatchesSearch(item = {}, search = "") {
  if (!search) return true;
  const haystack = `${item.label || ""} ${item.keywords || ""} ${item.section || ""}`.toLowerCase();
  return haystack.includes(search);
}

function mainMenuSearchLabel(item = {}, group = {}) {
  if (item.id === "academy") return "OroActive Academy";
  if (item.id === "gaming-oroactive") return "Gaming OroActive";
  if (item.id === "quotes") return "Quotazioni";
  return item.label || group.label || "Funzione OroActive";
}

function visibleMainMenuSearchItems(search = "") {
  if (!search) return [];
  const results = [];
  visibleMenuGroups().forEach((group) => {
    group.items.forEach((item) => {
      if (!menuItemMatchesSearch(item, search)) return;
      results.push({
        ...item,
        label: mainMenuSearchLabel(item, group),
        areaLabel: group.label,
        areaDescription: group.description
      });
    });
  });
  MAIN_MENU_SEARCH_SHORTCUTS.forEach((item) => {
    if (isMenuItemVisible(item) && menuItemMatchesSearch(item, search)) {
      results.push({ ...item, areaLabel: "Assistente" });
    }
  });
  const seen = new Set();
  return results
    .filter((item) => {
      const key = `${item.action || item.section || ""}:${item.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function sortedMenuItems(items = []) {
  return [...items].sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

const SECTION_ROUTE_ALIASES = {
  fusion: { screen: "fusion", fusionView: "stock" },
  giacenza: { screen: "fusion", fusionView: "stock" },
  fusioni: { screen: "fusion", fusionView: "melting" }
};

function resolveSectionRoute(section = "") {
  const key = String(section || "").trim();
  return SECTION_ROUTE_ALIASES[key] || { screen: key };
}

function menuButtonMarkup(item = {}, extraClass = "") {
  const attributes = [
    `type="button"`,
    `data-menu-item="${escapeHtml(item.id)}"`
  ];
  if (item.section) attributes.push(`data-section="${escapeHtml(item.section)}"`);
  if (item.courseTabShortcut) attributes.push(`data-course-tab-shortcut="${escapeHtml(item.courseTabShortcut)}"`);
  if (item.action) attributes.push(`data-menu-action="${escapeHtml(item.action)}"`);
  return `
    <button class="main-menu-item-button ${escapeHtml(extraClass)}" ${attributes.join(" ")} aria-label="${escapeHtml(item.label || "Funzione OroActive")}">
      <span class="main-menu-item-icon" aria-hidden="true">${escapeHtml(item.icon || "OA")}</span>
      <span class="main-menu-item-copy">
        <strong>${escapeHtml(item.label || "")}</strong>
        ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
      </span>
    </button>
  `;
}

function mainMenuSearchResultMarkup(item = {}) {
  const attributes = [
    `type="button"`,
    `data-menu-item="${escapeHtml(item.id)}"`
  ];
  if (item.section) attributes.push(`data-section="${escapeHtml(item.section)}"`);
  if (item.courseTabShortcut) attributes.push(`data-course-tab-shortcut="${escapeHtml(item.courseTabShortcut)}"`);
  if (item.action) attributes.push(`data-menu-action="${escapeHtml(item.action)}"`);
  return `
    <button class="main-menu-search-result" ${attributes.join(" ")}>
      <span class="main-menu-search-result-icon" aria-hidden="true">${escapeHtml(item.icon || "Vai")}</span>
      <span>
        <strong>${escapeHtml(item.label || "")}</strong>
        <small>${escapeHtml(`${item.areaLabel || "OroActive"} · ${item.description || item.areaDescription || "Apri funzione"}`)}</small>
      </span>
    </button>
  `;
}

function closeMainMenuSearchResults() {
  if (!mainMenuSearchResults) return;
  mainMenuSearchResults.hidden = true;
  mainMenuSearchResults.innerHTML = "";
}

function renderMainMenuSearchResults(search = "") {
  if (!mainMenuSearchResults) return;
  const cleanSearch = String(search || "").trim().toLowerCase();
  const results = visibleMainMenuSearchItems(cleanSearch);
  mainMenuSearchResults.hidden = !cleanSearch;
  mainMenuSearchResults.innerHTML = cleanSearch
    ? (results.length
      ? results.map((item) => mainMenuSearchResultMarkup(item)).join("")
      : '<div class="main-menu-search-empty">Nessuna funzione autorizzata trovata.</div>')
    : "";
}

function visibleMenuItems(items = [], search = "") {
  return sortedMenuItems(items).filter((item) => isMenuItemVisible(item) && menuItemMatchesSearch(item, search));
}

function visibleMenuGroups(search = "") {
  return sortedMenuItems(MENU_GROUPS)
    .filter((group) => isMenuItemVisible(group))
    .map((group) => ({ ...group, items: visibleMenuItems(group.items, search) }))
    .filter((group) => group.items.length);
}

function getMainMenuConfigForRole(userRole = state.currentUser?.ruolo) {
  const role = normalizeRole(userRole);
  const quickActions = visibleMenuItems(MENU_QUICK_ACTIONS);
  const macroAreas = visibleMenuGroups();
  return {
    quickActions,
    macroAreas,
    showFounderMetrics: role === "founder",
    showDirection: role === "founder",
    showAdmin: ["founder", "supervisore", "responsabile"].includes(role),
    searchScope: [
      ...macroAreas.flatMap((group) => group.items.map((item) => item.id)),
      ...MAIN_MENU_SEARCH_SHORTCUTS.filter((item) => isMenuItemVisible(item)).map((item) => item.id)
    ]
  };
}

function menuGroupMarkup(group = {}, area = "main") {
  const submenuId = `${area === "sidebar" ? "mainMenuSidebar" : "mainMenu"}-${group.id}`;
  return `
    <div class="main-menu-group ${area === "sidebar" ? "main-menu-sidebar-group" : ""}" data-menu-group="${escapeHtml(group.id)}">
      <button class="main-menu-group-button" type="button" data-main-menu-toggle="${escapeHtml(submenuId)}" aria-expanded="false">
        <span class="main-menu-group-icon" aria-hidden="true">${escapeHtml(group.icon || "OA")}</span>
        <span class="main-menu-group-copy">
          <strong>${escapeHtml(group.label || "")}</strong>
          ${group.description ? `<small>${escapeHtml(group.description)}</small>` : ""}
        </span>
        <span class="main-menu-group-arrow" aria-hidden="true">›</span>
      </button>
      <div class="main-menu-submenu" id="${escapeHtml(submenuId)}" hidden>
        ${group.items.map((item) => menuButtonMarkup(item)).join("")}
      </div>
    </div>
  `;
}

function mainMenuKpiValue(path = []) {
  return path.reduce((value, key) => value?.[key], state.dashboard) ?? null;
}

function renderFounderMenuKpis() {
  if (!mainMenuFounderKpis) return;
  mainMenuFounderKpis.hidden = !isFounder();
  if (!isFounder()) {
    mainMenuFounderKpis.innerHTML = "";
    return;
  }
  const healthScore = mainMenuKpiValue(["store_health", "average_score"]);
  const dailyActs = mainMenuKpiValue(["kpi", "numero_atti_giornalieri"]);
  const suspended = mainMenuKpiValue(["suspended_practices", "total"]);
  const unread = Number.isFinite(Number(state.notificationUnreadCount)) ? Number(state.notificationUnreadCount) : null;
  const kpis = [
    { label: "Store Health medio", value: healthScore === null ? null : `${Number(healthScore || 0)}/100` },
    { label: "Atti oggi", value: dailyActs === null ? null : dailyActs },
    { label: "Pratiche sospese", value: suspended === null ? null : suspended },
    { label: "Notifiche non lette", value: unread }
  ];
  const visibleKpis = kpis.filter((kpi) => kpi.value !== null && kpi.value !== undefined && kpi.value !== "");
  if (!visibleKpis.length) {
    mainMenuFounderKpis.innerHTML = `
      <div class="main-menu-founder-empty">
        <strong>Nessun dato operativo disponibile oggi</strong>
        <small>Apri la Dashboard per controllare KPI e report quando i dati saranno caricati.</small>
      </div>
      <button class="main-menu-dashboard-link" type="button" data-section="dashboard">Vai alla Dashboard</button>
    `;
    return;
  }
  mainMenuFounderKpis.innerHTML = `
    <div class="main-menu-founder-kpi-list">
      ${visibleKpis.map((kpi) => `<article><span>${escapeHtml(kpi.label)}</span><strong>${escapeHtml(String(kpi.value))}</strong></article>`).join("")}
    </div>
    <button class="main-menu-dashboard-link" type="button" data-section="dashboard">Vai alla Dashboard</button>
  `;
}

function renderRoleBasedMenus() {
  const search = String(mainMenuSearch?.value || "").trim().toLowerCase();
  const menuConfig = getMainMenuConfigForRole();
  if (mainMenuQuickActions) {
    mainMenuQuickActions.innerHTML = menuConfig.quickActions
      .map((item) => menuButtonMarkup(item, "main-menu-quick-button"))
      .join("");
  }
  const groups = menuConfig.macroAreas;
  if (mainMenuActions) {
    mainMenuActions.innerHTML = groups.length
      ? groups.map((group) => menuGroupMarkup(group)).join("")
      : '<div class="main-menu-empty">Nessuna funzione disponibile per questa ricerca.</div>';
  }
  renderMainMenuSearchResults(search);
  if (brandDropdown) {
    const brandGroups = visibleMenuGroups();
    brandDropdown.innerHTML = brandGroups.map((group) => `
      <button class="brand-dropdown-title brand-dropdown-toggle" type="button" data-brand-submenu-toggle="${escapeHtml(`brandMenu-${group.id}`)}" aria-expanded="false">
        ${escapeHtml(group.label)}
      </button>
      <div class="brand-submenu" id="${escapeHtml(`brandMenu-${group.id}`)}" hidden>
        ${group.items.map((item) => menuButtonMarkup(item, "user-menu-button")).join("")}
      </div>
    `).join("");
  }
  renderFounderMenuKpis();
}

function renderMainMenuFallback() {
  if (mainMenuQuickActions && !mainMenuQuickActions.querySelector("button")) {
    mainMenuQuickActions.innerHTML = `
      <button class="main-menu-item-button main-menu-quick-button" type="button" data-section="practice">
        <span class="main-menu-item-icon" aria-hidden="true">+</span>
        <span class="main-menu-item-copy">
          <strong>Nuovo atto</strong>
          <small>Crea subito</small>
        </span>
      </button>
      <button class="main-menu-item-button main-menu-quick-button" type="button" data-section="archive">
        <span class="main-menu-item-icon" aria-hidden="true">Lista</span>
        <span class="main-menu-item-copy">
          <strong>Elenco atti</strong>
          <small>Archivio pratiche</small>
        </span>
      </button>
    `;
  }
  if (mainMenuActions && !mainMenuActions.querySelector("button")) {
    mainMenuActions.innerHTML = `
      <button class="main-menu-item-button" type="button" data-section="dashboard">
        <span class="main-menu-item-icon" aria-hidden="true">KPI</span>
        <span class="main-menu-item-copy">
          <strong>Dashboard</strong>
          <small>Panoramica operativa</small>
        </span>
      </button>
      <button class="main-menu-item-button" type="button" data-section="quotazione">
        <span class="main-menu-item-icon" aria-hidden="true">EUR</span>
        <span class="main-menu-item-copy">
          <strong>Quotazioni</strong>
          <small>Prezzi metalli</small>
        </span>
      </button>
    `;
  }
}

function currentUserNeedsApprovalForRisk() {
  return ["commesso", "aiuto_commesso"].includes(normalizeRole(state.currentUser?.ruolo));
}

function userSeesAllStores(user = state.currentUser) {
  return ["founder", "supervisore"].includes(normalizeRole(user?.ruolo));
}

function managedRolesForCurrentUser() {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") return ["aiuto_commesso", "commesso", "responsabile", "supervisore"];
  if (role === "supervisore") return ["aiuto_commesso", "commesso", "responsabile"];
  if (role === "responsabile") return ["aiuto_commesso", "commesso"];
  return [];
}

function canEditUserRow(user = {}) {
  return isAdmin() && user.visibility !== "minimal" && user.canEdit !== false;
}

function canCreateUsersUi() {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function canDeleteUserRow(user = {}) {
  return isFounder()
    && user?.id
    && user.visibility !== "minimal"
    && user.canDelete !== false
    && user.attivo !== false
    && String(user.id) !== String(state.currentUser?.id);
}

function currentUserStoreCode() {
  return storeCodeFromName(state.currentUser?.negozio || "Busto Arsizio");
}

function canManageBackupsUi() {
  return ["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function canUseApprovalSectionUi() {
  return Boolean(state.currentUser);
}

function syncNotificationPlacement() {
  if (!notificationCenter) return;
  const shouldDockInMainMenu = Boolean(mainMenuNotificationSlot && mainMenuScreen && !mainMenuScreen.hidden);
  const target = shouldDockInMainMenu ? mainMenuNotificationSlot : notificationDefaultParent;
  if (target && notificationCenter.parentElement !== target) target.appendChild(notificationCenter);
  notificationCenter.classList.toggle("is-main-menu-docked", shouldDockInMainMenu);
  if (notificationDropdown && !notificationDropdown.hidden) positionNotificationDropdown();
}

function positionNotificationDropdown() {
  if (!notificationDropdown || notificationDropdown.hidden || !notificationBell) return;
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const margin = 12;
  const preferredWidth = viewportWidth <= 520 ? viewportWidth - (margin * 2) : 390;
  const width = Math.max(280, Math.min(preferredWidth, viewportWidth - (margin * 2)));
  const bellRect = notificationBell.getBoundingClientRect();
  const top = Math.min(
    Math.max(margin, bellRect.bottom + 10),
    Math.max(margin, viewportHeight - 240)
  );
  const left = Math.min(
    Math.max(margin, bellRect.right - width),
    Math.max(margin, viewportWidth - width - margin)
  );
  const maxHeight = Math.max(220, viewportHeight - top - margin);
  notificationDropdown.classList.add("is-viewport-anchored");
  notificationDropdown.style.setProperty("--notification-dropdown-width", `${width}px`);
  notificationDropdown.style.setProperty("--notification-dropdown-left", `${left}px`);
  notificationDropdown.style.setProperty("--notification-dropdown-top", `${top}px`);
  notificationDropdown.style.setProperty("--notification-dropdown-max-height", `${maxHeight}px`);
}

function applyRolePermissions() {
  renderRoleBasedMenus();
  document.querySelectorAll(".user-directory-only").forEach((element) => {
    element.hidden = !canViewUsersDirectory();
  });
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.hidden = !isAdmin();
  });
  document.querySelectorAll(".founder-only").forEach((element) => {
    element.hidden = !isFounder();
  });
  document.querySelectorAll(".backup-manager-only").forEach((element) => {
    element.hidden = !canManageBackupsUi();
  });
  document.querySelectorAll(".approval-section-only").forEach((element) => {
    element.hidden = !canUseApprovalSectionUi();
  });
  document.querySelectorAll(".knowledge-editor-only").forEach((element) => {
    element.hidden = !canManageKnowledgeUi();
  });
  document.querySelectorAll(".control-only").forEach((element) => {
    element.hidden = !canViewControlSectionsUi();
  });
  if (notificationCenter) notificationCenter.hidden = !state.currentUser;
  syncNotificationPlacement();

  const storeCode = document.getElementById("storeCode");
  const archiveStore = document.getElementById("archiveStoreFilter");
  const fusionStore = document.getElementById("fusionStoreFilter");
  if (!userSeesAllStores()) {
    const code = currentUserStoreCode();
    if (storeCode) {
      storeCode.value = code;
      storeCode.disabled = true;
    }
    if (archiveStore) {
      archiveStore.value = state.currentUser.negozio;
      archiveStore.disabled = true;
    }
    if (fusionStore) {
      fusionStore.value = state.currentUser.negozio;
      fusionStore.disabled = true;
    }
  } else {
    if (storeCode) storeCode.disabled = false;
    if (archiveStore) {
      archiveStore.disabled = false;
      if (archiveStore.querySelector('option[value="Tutti"]') && archiveStore.dataset.userSelected !== "true") {
        archiveStore.value = "Tutti";
      }
    }
    if (fusionStore) fusionStore.disabled = false;
  }

  if (loggedUserName && state.currentUser) {
    loggedUserName.textContent = `${displayMenuUserName(state.currentUser)} - ${roleLabel(state.currentUser.ruolo)}`;
  }
  if (mainMenuWelcome && state.currentUser) {
    mainMenuWelcome.textContent = `Bentornato, ${displayMenuUserName(state.currentUser)}`;
  }
  if (mainMenuHeroRole && state.currentUser) {
    mainMenuHeroRole.textContent = roleLabel(state.currentUser.ruolo);
  }
  if (mainMenuHeroStore && state.currentUser) {
    mainMenuHeroStore.textContent = userSeesAllStores() ? "Tutti i negozi" : (state.currentUser.negozio || "Negozio assegnato");
  }
  const operatorStoreName = document.getElementById("operatorStoreName");
  if (operatorStoreName && state.currentUser && userSeesAllStores()) {
    operatorStoreName.textContent = "Negozio Tutti";
  }
  if (sessionUsername && state.currentUser) {
    sessionUsername.textContent = displayMenuUserName(state.currentUser);
  }
  if (mainUserMenuButton && state.currentUser) {
    mainUserMenuButton.textContent = displayMenuUserName(state.currentUser);
  }
  const qualityPanel = document.getElementById("qualityReviewPanel");
  if (qualityPanel) qualityPanel.hidden = !canReviewActs();
  configureUserFormPermissions();
  renderAurumManagementPanel();
  updateAurumMascotVisibility();
  renderFounderMenuKpis();
  renderAppVersionUi();
}

async function startAuthenticatedApp(options = {}) {
  const { keepSplash = false, openMainMenu = true } = options;
  showAuthenticatedShell({ keepSplash });
  resetSessionTimeout();
  state.tutorial.pendingFirstRun = !localStorage.getItem(tutorialStorageKey());
  runSafeUiTask("role permissions", applyRolePermissions);
  startMainMenuClock();
  maybeShowInstallHint();
  if (openMainMenu && !keepSplash) showMainMenuFromSplash();
  void hydrateAuthenticatedAppInBackground().catch((error) => reportFrontendFailure("authenticated background load", error));
}

async function hydrateAuthenticatedAppInBackground() {
  await runSafeStartupTask("pending sync queue", loadPendingSyncQueue);
  await runSafeStartupTask("available stores", loadAvailableStores);
  runSafeUiTask("practice render", () => {
    renderStep();
    updateSignatureState();
    updateDocumentCaptureCards();
    updateAttachmentState();
    updateCededItems();
    updateSaleTotal();
    updateCustomerSummary();
    renderPaymentCaptureCard();
    updateChecklistState();
    document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
    ensureAurumHelpAttributes();
  });
  await runSafeStartupTask("practice metadata", () => setPracticeMeta({ deferPracticeNumber: true }));
  runSafeUiTask("role permissions refresh", applyRolePermissions);
  await Promise.allSettled([
    canViewUsersDirectory() ? runSafeStartupTask("users preload", loadUsers) : Promise.resolve(),
    runSafeStartupTask("Aurum memories", loadAurumMemories),
    runSafeStartupTask("Aurum support requests", loadAurumSupportRequests),
    runSafeStartupTask("notification count", loadNotificationCount),
    isFounder() ? runSafeStartupTask("Aurum founder memories", loadAurumAllMemories) : Promise.resolve()
  ]);
  startNotificationPolling();
  startAppVersionChecks();
  void maybeShowPrivacyPolicyNotice();
  runSafeUiTask("Aurum daily greeting", maybeShowAurumDailyGreeting);
  runSafeUiTask("level unlock message", maybeShowLevelUnlockMessage);
  await runSafeStartupTask("pending sync flush", flushPendingSync);
  if (!state.syncTimer) {
    state.syncTimer = window.setInterval(async () => {
      await runSafeStartupTask("pending sync flush", flushPendingSync);
      await runSafeStartupTask("acts sync", syncActsFromServer);
    }, 30000);
  }
}

async function restoreSession(options = {}) {
  const { keepSplash = false } = options;
  await loadStoredAuthToken();
  if (!state.authToken) {
    setSplashStatus("Preparazione login");
    showLogin({ keepSplash });
    return false;
  }
  setSplashStatus("Caricamento profilo");
  try {
    const data = await apiRequest("/auth/me");
    state.currentUser = data.user;
    setSplashStatus("Preparazione area operativa");
    await startAuthenticatedApp({ keepSplash, openMainMenu: !keepSplash });
    return true;
  } catch {
    setSplashStatus("Preparazione login");
    showLogin({ keepSplash });
    return false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (state.loggingIn) return;
  loginMessage.textContent = "";
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const submitButton = loginForm.querySelector('button[type="submit"]');
  state.loggingIn = true;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Accesso...";
  }
  if (faceIdLoginButton) faceIdLoginButton.disabled = true;
  showLoading("Accesso in corso...");
  try {
    const body = JSON.stringify({ username, password });
    let data;
    try {
      data = await apiRequest("/auth/login", { method: "POST", body, retries: 1 });
    } catch (error) {
      if (error.status === 404 || error.status === 405) {
        data = await apiRequest("/login", { method: "POST", body, retries: 1 });
      } else {
        throw error;
      }
    }
    state.currentUser = data.user;
    await saveStoredAuthToken(data.token);
    loginForm.reset();
    await startAuthenticatedApp();
  } catch (error) {
    loginMessage.textContent = error.status === 401
      ? "Credenziali non valide"
      : error.isConnectionError
        ? "Connessione al server non disponibile. Riprova tra qualche secondo."
        : error.status
          ? cleanUserMessage(error.message, "Accesso non riuscito.")
          : cleanUserMessage(error.message, "Accesso non riuscito.");
  } finally {
    state.loggingIn = false;
    hideLoading();
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Accedi";
    }
    if (faceIdLoginButton) faceIdLoginButton.disabled = false;
  }
}

function bytesToBase64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

function webAuthnAvailable() {
  return window.PublicKeyCredential && navigator.credentials && window.isSecureContext;
}

async function registerFaceId() {
  if (!state.currentUser) return;
  if (!webAuthnAvailable()) {
    showToast("Face ID richiede HTTPS e un dispositivo compatibile.");
    return;
  }

  try {
    const userId = new TextEncoder().encode(String(state.currentUser.id || displayUsername(state.currentUser)));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: "OroActive Gestionale" },
        user: {
          id: userId,
          name: displayUsername(state.currentUser),
          displayName: displayUsername(state.currentUser)
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000
      }
    });
    const credentialId = bytesToBase64Url(credential.rawId);
    const data = await apiRequest("/auth/faceid/register", {
      method: "POST",
      body: JSON.stringify({ credentialId })
    });
    state.currentUser = data.user;
    await saveDeviceStorage("oroactive-faceid-username", displayUsername(state.currentUser));
    await saveDeviceStorage("oroactive-faceid-credential", credentialId);
    showToast("Face ID registrato su questo dispositivo.");
  } catch (error) {
    showToast(error.message || "Registrazione Face ID non completata.");
  }
}

async function loginWithFaceId() {
  if (!webAuthnAvailable()) {
    loginMessage.textContent = "Face ID richiede HTTPS e un dispositivo compatibile.";
    return;
  }
  const username = document.getElementById("loginUsername").value.trim() || await loadDeviceStorage("oroactive-faceid-username") || "";
  const storedCredential = await loadDeviceStorage("oroactive-faceid-credential") || "";
  if (!username || !storedCredential) {
    loginMessage.textContent = "Prima accedi con password e registra il Face ID su questo dispositivo.";
    return;
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{
          id: base64UrlToBytes(storedCredential),
          type: "public-key"
        }],
        userVerification: "required",
        timeout: 60000
      }
    });
    const credentialId = bytesToBase64Url(credential.rawId);
    const data = await apiRequest("/auth/faceid/login", {
      method: "POST",
      body: JSON.stringify({ username, credentialId })
    });
    state.currentUser = data.user;
    await saveStoredAuthToken(data.token);
    await saveDeviceStorage("oroactive-faceid-username", username);
    await saveDeviceStorage("oroactive-faceid-credential", credentialId);
    await startAuthenticatedApp();
  } catch (error) {
    loginMessage.textContent = error.status === 401
      ? "Credenziali non valide"
      : error.isConnectionError
        ? "Connessione al server OroActive non riuscita"
        : error.message || "Accesso Face ID non riuscito.";
  }
}

async function handleLogout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // La sessione viene comunque rimossa dal dispositivo.
  }
  showLogin();
}

function setScreen(id) {
  const requestedSection = id;
  const route = resolveSectionRoute(id);
  if (route.fusionView) state.fusionView = route.fusionView;
  id = route.screen;
  if (id === "users" && !canViewUsersDirectory()) {
    showToast("Sezione non disponibile per il tuo ruolo.");
    return;
  }
  if (id === "knowledgeNotes" && !canManageKnowledgeUi()) {
    showToast("Sezione riservata a Founder o Responsabile.");
    return;
  }
  if (id === "dashboard" && !isFounder()) {
    showToast("Dashboard Founder è riservata al Founder.");
    return;
  }
  if (["antifraud", "storeHealth"].includes(id) && !canViewControlSectionsUi()) {
    showToast("Sezione riservata a Founder, Supervisore o Responsabile.");
    return;
  }
  if (id === "stores" && !isFounder()) {
    showToast("Sezione riservata al Founder.");
    return;
  }
  if (id === "aurumAdmin" && !isFounder()) {
    showToast("Gestione Aurum riservata al Founder.");
    return;
  }
  if (id === "aurumShield" && !isFounder()) {
    showToast("Aurum Shield è riservato al Founder.");
    return;
  }
  if (id === "auditTrail" && !isFounder()) {
    showToast("OroActive Audit Trail è riservato al Founder.");
    return;
  }
  if (id === "founderDailyReport" && !isFounder()) {
    showToast("Founder Daily Report è riservato al Founder.");
    return;
  }
  if (id === "backups" && !canManageBackupsUi()) {
    showToast("Sezione riservata a Founder o Responsabile.");
    return;
  }
  if (id === "approvals" && !canUseApprovalSectionUi()) {
    showToast("Sezione non disponibile per il tuo ruolo.");
    return;
  }
  prepareInternalSectionLayout();
  closeMainMenuDropdowns();
  closeMainUserMenu();
  const leavingArchive = document.getElementById("archive")?.classList.contains("active-screen") && id !== "archive";
  if (leavingArchive) clearActSearch();
  screens.forEach((screen) => screen.classList.toggle("active-screen", screen.id === id));
  syncNotificationPlacement();
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.section === id));
  if (practiceTopbar) practiceTopbar.hidden = id !== "practice";
  if (id !== "quotazione" && bullionVaultChart) {
    bullionVaultChart.innerHTML = "";
    state.bullionChartLoaded = false;
  }
  if (id !== "aurumBlocks") {
    stopAurumBlocksLoop();
    updateAurumBlocksUiState(true);
  }
  setAurumSection(requestedSection);
  void handleScreenDataLoad(id).catch((error) => {
    showToast(sectionLoadErrorMessage(id, error), "error");
  });
}

function sectionLoadErrorMessage(id, error) {
  const labels = {
    archive: "Elenco atti non caricato.",
    suspendedPractices: "Pratiche sospese non caricate.",
    approvals: "Richieste autorizzazione non caricate.",
    notifications: "Notifiche non caricate.",
    fusion: "Giacenza e fusioni non caricate.",
    dashboard: "Dashboard non caricata.",
    storeHealth: "Salute Negozio non caricata.",
    quotazione: "Quotazioni non caricate.",
    backups: "Backup non caricati.",
    stores: "Negozi non caricati.",
    antifraud: "Antifrode non caricato.",
    aurumShield: "Aurum Shield non caricato.",
    auditTrail: "Audit Trail non caricato.",
    founderDailyReport: "Founder Daily Report non caricato.",
    training: "Academy non caricata.",
    coinEncyclopedia: "Elenco Monete non caricato.",
    gaming: "Gaming OroActive non caricato.",
    aurumBlocks: "Aurum Blocks non caricato.",
    crm: "CRM non caricato.",
    assistant: "Assistente IA non caricato.",
    aurumAdmin: "Gestione Aurum non caricata.",
    knowledgeNotes: "Conoscenze OroActive non caricate.",
    privacyCenter: "Centro Privacy non caricato.",
    users: "Utenti non caricati."
  };
  return cleanUserMessage(error?.message, labels[id] || "Sezione non caricata.");
}

async function handleScreenDataLoad(id) {
  if (id === "archive") {
    await loadArchiveScreenData();
    renderArchiveGroups();
  }
  if (id === "fusion") {
    await loadFusionScreenData();
    renderFusionGroups();
  }
  if (id === "dashboard") await loadDashboard();
  if (id === "storeHealth") await loadStoreHealth();
  if (id === "quotazione") {
    renderQuoteDashboard();
    await refreshBullionVaultPrices();
    initBullionVaultChart();
    await loadGoldPredictionPanel();
  }
  if (id === "backups") await loadBackups();
  if (id === "approvals") await loadApprovals();
  if (id === "suspendedPractices") await loadSuspendedPractices(1);
  if (id === "notifications") await loadNotificationsPage(1);
  if (id === "stores") await loadStores();
  if (id === "antifraud") await loadAntifraud();
  if (id === "aurumShield") await loadAurumShieldAdmin();
  if (id === "auditTrail") await loadAuditTrail();
  if (id === "founderDailyReport") await loadFounderDailyReport();
  if (id === "training") await loadTraining();
  if (id === "coinEncyclopedia") renderCoinEncyclopedia();
  if (id === "gaming") await loadGamingOroActive();
  if (id === "aurumBlocks") await loadAurumBlocks();
  if (id === "crm") await loadCrmClients();
  if (id === "assistant") {
    renderAssistantMessages();
    renderAurumManagementPanel();
    await loadAurumMemories();
    await loadAurumSupportRequests();
    if (isFounder()) await loadAurumAllMemories();
    if (isFounder()) await loadKnowledgeStatus();
  }
  if (id === "aurumAdmin") {
    renderAurumManagementPanel();
    await refreshAurumAdminData();
  }
  if (id === "knowledgeNotes") {
    resetKnowledgeNoteFormValues();
    await loadKnowledgeNotes();
    if (isFounder()) await loadAiFeedback();
  }
  if (id === "profile") {
    renderProfileCard();
  }
  if (id === "privacyCenter") {
    await loadPrivacyPolicyState({ audit: true });
  }
  if (id === "users") {
    await loadUsers();
    await loadAurumSupportRequests();
  }
}

function renderProfileCard() {
  if (!profileCard || !state.currentUser) return;
  const user = state.currentUser;
  const createdAt = formatDateTime(user.data_creazione);
  const accessLabel = isFounderUser(user) ? "Username / email" : "Nome utente";
  const accessValue = isFounderUser(user)
    ? user.username || user.email || "Dato non inserito"
    : user.username || "Dato non inserito";
  profileCard.innerHTML = `
    <div class="profile-row"><span>Nome</span><strong>${escapeHtml(displayUserFullName(user))}</strong></div>
    <div class="profile-row"><span>Cognome</span><strong>${escapeHtml(user.cognome || "Dato non inserito")}</strong></div>
    <div class="profile-row"><span>${escapeHtml(accessLabel)}</span><strong>${escapeHtml(accessValue)}</strong></div>
    <div class="profile-row"><span>Ruolo</span><strong>${escapeHtml(roleLabel(user.ruolo))}</strong></div>
    <div class="profile-row"><span>Negozio</span><strong>${escapeHtml(user.negozio || "Tutti")}</strong></div>
    <div class="profile-row"><span>Data creazione account</span><strong>${escapeHtml(createdAt)}</strong></div>
    <div class="profile-row"><span>Face ID</span><strong>${user.hasFaceId ? "Registrato" : "Non registrato"}</strong></div>
    <div class="user-form-actions">
      <button class="ghost-button" type="button" id="profileRegisterFaceId">Registra Face ID</button>
    </div>
  `;
  document.getElementById("profileRegisterFaceId")?.addEventListener("click", registerFaceId);
}

function activePrivacyPolicy() {
  return state.privacyPolicy || PRIVACY_POLICY_FALLBACK;
}

function privacyAcceptanceMatches(policy = activePrivacyPolicy()) {
  return Boolean(state.privacyAcceptance?.policy_version && state.privacyAcceptance.policy_version === policy.version);
}

function privacyStatusMarkup(policy = activePrivacyPolicy()) {
  const accepted = privacyAcceptanceMatches(policy);
  return `
    <div>
      <span class="privacy-badge ${accepted ? "accepted" : "pending"}">${accepted ? "Presa visione registrata" : "Presa visione da registrare"}</span>
      <strong>${accepted ? "Informativa letta" : "Privacy Policy disponibile"}</strong>
      <p>${accepted ? `Versione ${escapeHtml(policy.version)} letta il ${escapeHtml(formatDateTime(state.privacyAcceptance.accepted_at))}.` : "Apri le sezioni, consulta l'informativa e registra la presa visione quando hai terminato."}</p>
    </div>
    <small>Versione ${escapeHtml(policy.version || "v1.0")} · Aggiornamento ${escapeHtml(policy.updated_at || "2026-05-29")}</small>
  `;
}

function privacySectionMarkup(section = {}, index = 0) {
  const paragraphs = (section.paragraphs || [])
    .map((text) => `<p>${escapeHtml(text)}</p>`)
    .join("");
  const items = (section.items || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const groups = (section.groups || [])
    .map((group) => `
      <div class="privacy-group">
        <h4>${escapeHtml(group.title || "Dati trattati")}</h4>
        <ul>${(group.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    `)
    .join("");
  return `
    <details class="privacy-accordion-section" ${index < 3 ? "open" : ""}>
      <summary>
        <span>${escapeHtml(section.tab || `Sezione ${index + 1}`)}</span>
        ${section.badge ? `<mark>${escapeHtml(section.badge)}</mark>` : ""}
      </summary>
      <div class="privacy-accordion-body">
        <h3>${escapeHtml(section.title || section.tab || "Informativa")}</h3>
        ${paragraphs}
        ${items ? `<ul>${items}</ul>` : ""}
        ${groups}
        ${section.closing ? `<p class="privacy-note">${escapeHtml(section.closing)}</p>` : ""}
      </div>
    </details>
  `;
}

function privacyPolicyDocumentMarkup(policy = activePrivacyPolicy(), options = {}) {
  const sections = (policy.sections || PRIVACY_POLICY_FALLBACK.sections || [])
    .map((section, index) => privacySectionMarkup(section, index))
    .join("");
  return `
    <article class="privacy-policy-document ${options.compact ? "compact" : ""}">
      <div class="privacy-document-meta">
        <span>GDPR</span>
        <strong>${escapeHtml(policy.version || "v1.0")}</strong>
        <em>${escapeHtml(policy.updated_at || "2026-05-29")}</em>
      </div>
      <h2>${escapeHtml(policy.title || PRIVACY_POLICY_FALLBACK.title)}</h2>
      <p>${escapeHtml(policy.subtitle || PRIVACY_POLICY_FALLBACK.subtitle)}</p>
      <div class="privacy-warning">
        <strong>Bozza professionale interna</strong>
        <span>${escapeHtml(policy.note || PRIVACY_POLICY_FALLBACK.note)}</span>
      </div>
      <div class="privacy-accordion">${sections}</div>
    </article>
  `;
}

function renderPrivacyCenter() {
  const policy = activePrivacyPolicy();
  const content = document.getElementById("privacyPolicyContent");
  const status = document.getElementById("privacyStatusCard");
  const summary = document.getElementById("privacySummaryCards");
  const founderPanel = document.getElementById("privacyFounderPanel");
  const versionsList = document.getElementById("privacyVersionsList");
  const acceptancesList = document.getElementById("privacyAcceptancesList");
  const acceptButton = document.getElementById("privacyAcceptButton");
  if (status) status.innerHTML = privacyStatusMarkup(policy);
  if (summary) {
    summary.innerHTML = [
      ["Informativa utenti app", "Ruoli, accessi, attività, Academy e notifiche."],
      ["Informativa clienti", "Atti di vendita, documenti, firme e pagamenti."],
      ["AI e Aurum", "Minimizzazione dati, memoria e assistenza operativa."],
      ["Diritti privacy", "Accesso, rettifica, cancellazione, opposizione e reclamo."]
    ].map(([title, text]) => `
      <article class="privacy-summary-card">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(text)}</span>
      </article>
    `).join("");
  }
  if (content) content.innerHTML = privacyPolicyDocumentMarkup(policy);
  if (acceptButton) {
    acceptButton.disabled = privacyAcceptanceMatches(policy);
    acceptButton.textContent = privacyAcceptanceMatches(policy) ? "Presa visione registrata" : "Ho letto l'informativa";
  }
  if (founderPanel) founderPanel.hidden = !isFounder();
  if (versionsList) {
    versionsList.innerHTML = (state.privacyVersions || []).map((version) => `
      <article class="privacy-admin-row">
        <strong>${escapeHtml(version.version || "")}${version.is_active ? " · attiva" : ""}</strong>
        <span>${escapeHtml(version.title || "Privacy Policy OroActive")}</span>
        <small>${escapeHtml(formatDateTime(version.created_at))}</small>
      </article>
    `).join("") || '<div class="empty-state">Nessuna versione privacy trovata.</div>';
  }
  if (acceptancesList) {
    acceptancesList.innerHTML = (state.privacyAcceptances || []).map((acceptance) => `
      <article class="privacy-admin-row">
        <strong>${escapeHtml(acceptance.user_name || acceptance.username || "Utente")}</strong>
        <span>${escapeHtml(roleLabel(acceptance.user_role || ""))} · ${escapeHtml(acceptance.policy_version || "")}</span>
        <small>${escapeHtml(formatDateTime(acceptance.accepted_at))}</small>
      </article>
    `).join("") || '<div class="empty-state">Nessuna presa visione registrata.</div>';
  }
}

async function loadPrivacyPolicyState(options = {}) {
  const { audit = false, silent = false } = options;
  try {
    const suffix = audit ? "?audit=true" : "";
    const data = await apiRequest(`/privacy-policy/current${suffix}`);
    state.privacyPolicy = data.policy || PRIVACY_POLICY_FALLBACK;
    state.privacyAcceptance = data.acceptance || null;
    const versions = await apiRequest("/privacy-policy/versions").catch(() => ({ versions: [] }));
    state.privacyVersions = versions.versions || [];
    if (isFounder()) {
      const acceptances = await apiRequest("/privacy-policy/acceptances").catch(() => ({ acceptances: [] }));
      state.privacyAcceptances = acceptances.acceptances || [];
    } else {
      state.privacyAcceptances = [];
    }
  } catch (error) {
    state.privacyPolicy = PRIVACY_POLICY_FALLBACK;
    if (!silent) showToast(error.message || "Centro Privacy non caricato.", "error");
  } finally {
    renderPrivacyCenter();
  }
}

async function acceptPrivacyPolicy() {
  const policy = activePrivacyPolicy();
  const data = await apiRequest("/privacy-policy/accept", {
    method: "POST",
    body: JSON.stringify({ version: policy.version })
  });
  state.privacyAcceptance = data.acceptance || state.privacyAcceptance;
  await loadPrivacyPolicyState({ silent: true });
  showToast(data.message || "Presa visione registrata correttamente.", "success");
}

async function downloadPrivacyPolicyPdf() {
  const policy = activePrivacyPolicy();
  await downloadProtectedFile("/privacy-policy/current/pdf", `privacy-policy-oroactive-${policy.version || "v1.0"}.pdf`, "Preparo informativa privacy...");
  showToast("Informativa privacy scaricata.", "success");
}

async function openPrivacyNoticePreview(options = {}) {
  if (state.authToken && !state.privacyPolicy) await loadPrivacyPolicyState({ audit: !options.login, silent: true });
  const policy = activePrivacyPolicy();
  previewTitle.textContent = options.customer ? "Informativa privacy cliente" : "Privacy Policy OroActive";
  previewBody.innerHTML = `
    <div class="privacy-preview">
      ${options.customer ? `
        <div class="privacy-warning">
          <strong>Informativa privacy cliente</strong>
          <span>Prima della conclusione della pratica il cliente deve poter consultare l'informativa sul trattamento dei dati personali.</span>
        </div>
      ` : ""}
      ${privacyPolicyDocumentMarkup(policy, { compact: true })}
      ${state.authToken && !options.customer ? `
        <div class="privacy-preview-actions">
          <button class="primary-button" type="button" data-accept-privacy-policy ${privacyAcceptanceMatches(policy) ? "disabled" : ""}>${privacyAcceptanceMatches(policy) ? "Presa visione registrata" : "Ho letto"}</button>
          <button class="ghost-button" type="button" data-open-privacy-center>Apri Centro Privacy</button>
        </div>
      ` : ""}
    </div>
  `;
  previewModal.hidden = false;
}

async function maybeShowPrivacyPolicyNotice() {
  if (!state.currentUser || state.privacyNoticeShown) return;
  state.privacyNoticeShown = true;
  await loadPrivacyPolicyState({ silent: true });
  if (!privacyAcceptanceMatches()) {
    await openPrivacyNoticePreview();
  }
}

function closeMainMenuDropdowns() {
  document.querySelectorAll(".main-menu-submenu").forEach((submenu) => {
    submenu.hidden = true;
  });
  document.querySelectorAll("[data-main-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleMainMenuDropdown(id) {
  const submenu = document.getElementById(id);
  if (!submenu) return;
  const willOpen = submenu.hidden;
  closeMainMenuDropdowns();
  submenu.hidden = !willOpen;
  [...document.querySelectorAll("[data-main-menu-toggle]")]
    .find((button) => button.dataset.mainMenuToggle === id)
    ?.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) {
    window.requestAnimationFrame(() => {
      submenu.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }
}

function closeMainUserMenu() {
  if (!mainUserDropdown || !mainUserMenuButton) return;
  mainUserDropdown.hidden = true;
  mainUserMenuButton.setAttribute("aria-expanded", "false");
}

function toggleMainUserMenu() {
  if (!mainUserDropdown || !mainUserMenuButton) return;
  const willOpen = mainUserDropdown.hidden;
  mainUserDropdown.hidden = !willOpen;
  mainUserMenuButton.setAttribute("aria-expanded", String(willOpen));
}

function closeBrandMenu() {
  brandDropdown.hidden = true;
  brandMenuButton.setAttribute("aria-expanded", "false");
  document.querySelectorAll(".brand-submenu").forEach((submenu) => {
    submenu.hidden = true;
  });
  document.querySelectorAll("[data-brand-submenu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleBrandMenu() {
  const willOpen = brandDropdown.hidden;
  brandDropdown.hidden = !willOpen;
  brandMenuButton.setAttribute("aria-expanded", String(willOpen));
}

function toggleBrandSubmenu(id) {
  const submenu = document.getElementById(id);
  if (!submenu) return;
  const willOpen = submenu.hidden;
  document.querySelectorAll(".brand-submenu").forEach((item) => {
    item.hidden = true;
  });
  document.querySelectorAll("[data-brand-submenu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
  submenu.hidden = !willOpen;
  document.querySelector(`[data-brand-submenu-toggle="${cssEscape(id)}"]`)?.setAttribute("aria-expanded", String(willOpen));
}

function openBrandMenu() {
  brandDropdown.hidden = false;
  brandMenuButton.setAttribute("aria-expanded", "true");
}

function openOroActiveWebsite() {
  window.open(OROACTIVE_WEBSITE_URL, "_blank", "noopener,noreferrer");
}

function safeScrollTopInstant() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } catch {
    window.scrollTo(0, 0);
  }
}

function setMainMenuMode(active) {
  document.body.classList.toggle("main-menu-active", active);
  if (appShell) appShell.hidden = active;
  if (mainMenuScreen) mainMenuScreen.hidden = !active;
}

function cleanupUiBeforeMainMenu() {
  closeBrandMenu();
  closeMainUserMenu();
  closeNotificationDropdown();
  closeMainMenuDropdowns();
  closeMainMenuSearchResults();
  clearActSearch();
  if (previewModal) previewModal.hidden = true;
  if (tutorialOverlay) tutorialOverlay.hidden = true;
  screens.forEach((screen) => screen.classList.remove("active-screen"));
  navItems.forEach((item) => item.classList.remove("active"));
  if (practiceTopbar) practiceTopbar.hidden = true;
  if (bullionVaultChart) {
    bullionVaultChart.innerHTML = "";
    state.bullionChartLoaded = false;
  }
  if (typeof stopAurumBlocksLoop === "function") stopAurumBlocksLoop();
  if (typeof updateAurumBlocksUiState === "function") updateAurumBlocksUiState(true);
  document.body.classList.remove(
    "modal-open",
    "drawer-open",
    "section-overlay-open",
    "aurum-blocks-playing",
    "aurum-blocks-paused",
    "sale-deed-active",
    "academy-view-active"
  );
  safeScrollTopInstant();
}

function openMainMenuCleanly(options = {}) {
  const { renderMenus = true, keepSplash = false } = options;
  loginScreen.hidden = true;
  if (!keepSplash) {
    splashScreen.classList.add("hidden");
    document.body.classList.remove("splash-active");
  }
  cleanupUiBeforeMainMenu();
  if (renderMenus) {
    runSafeUiTask("main menu render", renderRoleBasedMenus);
    renderMainMenuFallback();
  }
  setMainMenuMode(true);
  syncNotificationPlacement();
  setAurumSection("menu");
  updateAurumMascotVisibility();
}

function prepareInternalSectionLayout() {
  document.body.classList.remove("main-menu-active");
  splashScreen.classList.add("hidden");
  if (appShell) appShell.hidden = false;
  if (mainMenuScreen) mainMenuScreen.hidden = true;
  closeMainMenuDropdowns();
  closeMainMenuSearchResults();
  closeMainUserMenu();
  syncNotificationPlacement();
}

function showMainMenuFromSplash() {
  openMainMenuCleanly();
  maybeStartFirstRunTutorial();
}

async function enterSectionFromMainMenu(section) {
  const route = resolveSectionRoute(section);
  if (route.fusionView) state.fusionView = route.fusionView;
  prepareInternalSectionLayout();
  setAurumSection(section);
  updateAurumMascotVisibility();
  if (route.screen === "practice") {
    setScreen(route.screen);
    await clearPracticeForFreshStart({ deferPracticeNumber: true });
    return;
  }
  setScreen(section);
}

async function clearPracticeForFreshStart(options = {}) {
  previewModal.hidden = true;
  await resetCurrentPractice(options);
}

async function returnToMainMenu() {
  const isPracticeActive = document.getElementById("practice")?.classList.contains("active-screen");
  if (isPracticeActive && !isPracticeFormEmpty()) {
    if (state.editingPracticeNumber) {
      if (state.editingDirty) {
        const choice = await askEditingExitChoice();
        if (choice === "cancel") return;
        if (choice === "save") {
          const saved = await archiveCurrentPractice(state.editingOriginalStatus || "Archiviata", { destination: "menu" });
          if (!saved) return;
        }
        if (choice === "discard") await clearPracticeForFreshStart();
      } else {
        await clearPracticeForFreshStart();
      }
    } else if (hasStartedClientSection()) {
      const choice = await askDraftExitChoice();
      if (choice === "cancel") return;
      if (choice === "save") {
        const saved = await archiveCurrentPractice("Bozza", { skipReset: true });
        if (!saved) return;
        await clearPracticeForFreshStart();
        showToast("Bozza salvata. Puoi completarla successivamente tramite Elenco.");
      }
      if (choice === "discard") await clearPracticeForFreshStart();
    } else {
      const saved = await archiveCurrentPractice(state.editingOriginalStatus || "Archiviata", { skipReset: true });
      if (!saved) return;
      await clearPracticeForFreshStart();
      showToast("Atto di vendita in fase di compilazione archiviato. Puoi completarlo successivamente tramite Elenco.");
    }
  }
  openMainMenuCleanly();
}

function askEditingExitChoice() {
  previewTitle.textContent = "Modifiche non salvate";
  previewBody.innerHTML = `
    <section class="customer-copy-options">
      <p>Hai modifiche non salvate. Vuoi salvarle prima di uscire?</p>
      <div class="preview-action-stack">
        <button class="primary-button" type="button" data-editing-exit-choice="save">Salva ed esci</button>
        <button class="danger-button" type="button" data-editing-exit-choice="discard">Esci senza salvare</button>
        <button class="ghost-button" type="button" data-editing-exit-choice="cancel">Annulla</button>
      </div>
    </section>
  `;
  previewModal.hidden = false;
  return new Promise((resolve) => {
    const handler = (event) => {
      const button = event.target.closest("[data-editing-exit-choice]");
      if (!button) return;
      previewBody.removeEventListener("click", handler);
      previewModal.hidden = true;
      resolve(button.dataset.editingExitChoice);
    };
    previewBody.addEventListener("click", handler);
  });
}

function askDraftExitChoice() {
  previewTitle.textContent = "Atto in compilazione";
  previewBody.innerHTML = `
    <section class="customer-copy-options">
      <p>Hai iniziato a compilare questo atto. Vuoi salvarlo come bozza per completarlo successivamente?</p>
      <div class="preview-action-stack">
        <button class="primary-button" type="button" data-draft-exit-choice="save">Salva bozza</button>
        <button class="danger-button" type="button" data-draft-exit-choice="discard">Esci senza salvare</button>
        <button class="ghost-button" type="button" data-draft-exit-choice="cancel">Annulla</button>
      </div>
    </section>
  `;
  previewModal.hidden = false;
  return new Promise((resolve) => {
    const handler = (event) => {
      const button = event.target.closest("[data-draft-exit-choice]");
      if (!button) return;
      previewBody.removeEventListener("click", handler);
      previewModal.hidden = true;
      resolve(button.dataset.draftExitChoice);
    };
    previewBody.addEventListener("click", handler);
  });
}

function resetUserForm() {
  const form = document.getElementById("userForm");
  if (!form) return;
  form.reset();
  document.getElementById("userId").value = "";
  document.getElementById("userPassword").required = true;
  const userActive = document.getElementById("userActive");
  if (userActive) userActive.value = "true";
  document.getElementById("saveUserButton").textContent = "Salva Utente";
  configureUserFormPermissions();
}

function configureUserFormPermissions() {
  const form = document.getElementById("userForm");
  const roleSelect = document.getElementById("userRole");
  const storeSelect = document.getElementById("userStore");
  const emailLabel = document.getElementById("userEmailLabel");
  const emailInput = document.getElementById("userEmail");
  const saveButton = document.getElementById("saveUserButton");
  const resetButton = document.getElementById("resetUserForm");
  const canUseForm = canCreateUsersUi();
  if (form) form.hidden = !canUseForm;
  if (saveButton) saveButton.disabled = !canUseForm;
  if (resetButton) resetButton.hidden = !canUseForm;
  if (!roleSelect || !storeSelect) return;
  if (!canUseForm) return;
  const editingUserId = document.getElementById("userId")?.value;
  const editingUser = (state.users || []).find((user) => String(user.id) === String(editingUserId));
  const editingFounder = isFounder() && normalizeRole(editingUser?.ruolo) === "founder";
  const allowedRoles = editingFounder
    ? ["founder", ...managedRolesForCurrentUser()]
    : managedRolesForCurrentUser();
  [...roleSelect.options].forEach((option) => {
    option.hidden = !allowedRoles.includes(option.value);
  });
  if (!allowedRoles.includes(roleSelect.value)) roleSelect.value = allowedRoles.find((role) => role !== "founder") || "commesso";
  roleSelect.disabled = editingFounder;
  const role = normalizeRole(roleSelect.value);
  const emailAllowed = role === "founder";
  if (emailLabel) emailLabel.hidden = !emailAllowed;
  if (emailInput) {
    emailInput.disabled = !emailAllowed;
    if (!emailAllowed) emailInput.value = "";
  }
  if (["founder", "supervisore"].includes(role)) {
    storeSelect.value = "Tutti";
    storeSelect.disabled = true;
    [...storeSelect.options].forEach((option) => {
      option.hidden = option.value !== "Tutti" && option.textContent !== "Tutti";
    });
  } else {
    [...storeSelect.options].forEach((option) => {
      option.hidden = option.value === "Tutti" || option.textContent === "Tutti";
    });
    storeSelect.disabled = false;
    if (storeSelect.value === "Tutti") storeSelect.value = "Busto Arsizio";
  }
}

function renderUsers(users) {
  const container = document.getElementById("usersList");
  if (!container) return;
  if (!users.length) {
    container.innerHTML = '<div class="empty-state">Nessun utente registrato.</div>';
    renderAurumMessageRecipients();
    return;
  }

  container.innerHTML = `
    <div class="table-row head"><span>Utente</span><span>Accesso</span><span>Ruolo</span><span>Negozio</span><span>Stato e date</span><span>Punteggio</span><span>Azioni</span></div>
    ${users.map((user) => {
    const minimal = user.visibility === "minimal";
    const canEdit = canEditUserRow(user);
    const canDelete = canDeleteUserRow(user);
    const canViewActivity = user.canViewActivity !== false && !minimal;
    const actions = [
      canViewActivity ? `<button type="button" data-user-activity="${escapeHtml(String(user.id))}">Attività</button>` : "",
      canEdit ? `<button type="button" data-edit-user="${escapeHtml(String(user.id))}">Modifica</button>` : "",
      canDelete ? `<button class="danger-button" type="button" data-delete-user="${escapeHtml(String(user.id))}">Elimina utente</button>` : ""
    ].filter(Boolean);
    return `
      <div class="table-row">
        <strong>
          ${escapeHtml(user.nome || "Nome non inserito")} ${escapeHtml(user.cognome || "")}
          ${!minimal && user.telefono ? `<small>Tel. ${escapeHtml(user.telefono)}</small>` : ""}
          ${!minimal && user.note ? `<small>Note: ${escapeHtml(user.note)}</small>` : ""}
        </strong>
        <span>
          ${minimal ? "Dati minimi" : escapeHtml(displayUsername(user))}
          ${!minimal && isFounderUser(user) && user.email && user.email !== displayUsername(user) ? `<small>${escapeHtml(user.email)}</small>` : ""}
        </span>
        <em>${escapeHtml(roleLabel(user.ruolo))}</em>
        <span>${escapeHtml(userSeesAllStores(user) ? "Tutti" : user.negozio)}</span>
        <span>
          <em class="${user.attivo === false ? "status-draft" : "status-completed"}">${user.attivo === false ? "Non attivo" : "Attivo"}</em>
          <small class="presence ${user.online ? "online" : "offline"}">${user.online ? "Online" : "Offline"}</small>
          <small>Ultima attività: ${escapeHtml(formatDateTime(user.last_seen))}</small>
          <small>Creato: ${escapeHtml(formatDateTime(user.data_creazione))}</small>
          <small>Aggiornato: ${escapeHtml(formatDateTime(user.updated_at))}</small>
        </span>
        ${minimal ? '<span class="user-score-cell muted">Dati riservati</span>' : scoreBarMarkup(user)}
        <div class="row-actions">
          ${actions.join("") || '<span class="muted">Nessuna azione disponibile</span>'}
        </div>
      </div>
    `;
  }).join("")}
  `;
  renderAurumMessageRecipients();
}

function userSaveErrorMessage(error, isEditing) {
  const raw = String(error?.message || "").trim();
  const prefix = isEditing ? "Impossibile aggiornare l'utente" : "Impossibile salvare l'utente";
  if (!raw) return `${prefix}.`;
  if (/numero atto|numerazione della pratica/i.test(raw)) {
    return `${prefix}: errore di validazione account.`;
  }
  if (/^impossibile\s+(salvare|aggiornare)\s+l'utente/i.test(raw)) return raw;
  return `${prefix}: ${raw}`;
}

async function loadUsers() {
  if (!canViewUsersDirectory()) return;
  try {
    const users = await apiRequest("/utenti");
    state.users = users;
    renderUsers(users);
  } catch (error) {
    showToast(error.message || "Utenti non caricati.");
  }
}

async function showUserActivity(id) {
  const user = (state.users || []).find((item) => String(item.id) === String(id));
  if (!user) {
    showToast("Utente non trovato.");
    return;
  }
  try {
    const data = await apiRequest(`/utenti/${encodeURIComponent(id)}/activity`);
    const activities = data.activities || [];
    state.userActivities.set(String(id), activities);
    previewTitle.textContent = `Attività - ${displayUserFullName(user)}`;
    previewBody.innerHTML = activities.length
      ? `<div class="activity-list">${activities.map((activity) => `
          <article class="activity-row">
            <strong>${escapeHtml(activity.label || "Attività")}</strong>
            <span>${escapeHtml(activity.description || "")}</span>
            <small>${escapeHtml(formatDateTime(activity.created_at))}${activity.actor ? ` - ${escapeHtml(activity.actor)}` : ""}</small>
          </article>
        `).join("")}</div>`
      : '<div class="empty-state">Nessuna attività registrata</div>';
    previewModal.hidden = false;
  } catch (error) {
    showToast(error.message || "Attività utente non caricata.", "error");
  }
}

async function saveUser(event) {
  event.preventDefault();
  if (!canCreateUsersUi()) {
    showToast("Non autorizzato.", "error");
    return;
  }
  if (state.savingUser) return;
  const id = document.getElementById("userId").value;
  const isEditing = Boolean(id);
  if (isEditing) {
    const editingUser = (state.users || []).find((user) => String(user.id) === String(id));
    if (!editingUser || !canEditUserRow(editingUser)) {
      showToast("Non autorizzato.", "error");
      return;
    }
  }
  const saveButton = document.getElementById("saveUserButton");
  const role = normalizeRole(document.getElementById("userRole").value);
  const payload = {
    nome: document.getElementById("userName").value.trim(),
    cognome: document.getElementById("userSurname").value.trim(),
    username: document.getElementById("userUsername").value.trim(),
    ruolo: role,
    negozio: document.getElementById("userStore").value,
    telefono: document.getElementById("userPhone")?.value.trim(),
    note: document.getElementById("userNotes")?.value.trim(),
    attivo: document.getElementById("userActive")?.value !== "false"
  };
  if (role === "founder") {
    payload.email = document.getElementById("userEmail")?.value.trim();
  }
  const password = document.getElementById("userPassword").value;
  if (password) payload.password = password;

  try {
    state.savingUser = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = isEditing ? "Aggiornamento..." : "Creazione...";
    }
    const savedUser = await apiRequest(isEditing ? `/utenti/${encodeURIComponent(id)}` : "/utenti", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    if (String(savedUser?.id || "") === String(state.currentUser?.id || "")) {
      state.currentUser = { ...state.currentUser, ...savedUser };
      applyRolePermissions();
      renderProfileCard();
    }
    resetUserForm();
    await loadUsers();
    showToast(isEditing ? "Utente aggiornato correttamente" : "Utente creato correttamente", "success");
  } catch (error) {
    showToast(userSaveErrorMessage(error, isEditing), "error");
  } finally {
    state.savingUser = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = document.getElementById("userId").value ? "Salva Modifiche" : "Salva Utente";
    }
  }
}

function editUser(id) {
  const user = (state.users || []).find((item) => String(item.id) === String(id));
  if (!user) return;
  if (!canEditUserRow(user)) {
    showToast("Sezione non disponibile per il tuo ruolo.");
    return;
  }
  document.getElementById("userId").value = user.id;
  document.getElementById("userName").value = user.nome || "";
  document.getElementById("userSurname").value = user.cognome || "";
  document.getElementById("userUsername").value = user.username || "";
  const userEmail = document.getElementById("userEmail");
  if (userEmail) userEmail.value = isFounderUser(user) ? user.email || "" : "";
  const userPhone = document.getElementById("userPhone");
  if (userPhone) userPhone.value = user.telefono || "";
  const userNotes = document.getElementById("userNotes");
  if (userNotes) userNotes.value = user.note || "";
  const userActive = document.getElementById("userActive");
  if (userActive) userActive.value = user.attivo === false ? "false" : "true";
  document.getElementById("userRole").value = normalizeRole(user.ruolo);
  document.getElementById("userStore").value = userSeesAllStores(user) ? "Tutti" : user.negozio || "Busto Arsizio";
  const password = document.getElementById("userPassword");
  password.value = "";
  password.required = false;
  document.getElementById("saveUserButton").textContent = "Salva Modifiche";
  configureUserFormPermissions();
  showToast("Utente caricato in modifica.");
}

async function deleteUser(id) {
  const user = (state.users || []).find((item) => String(item.id) === String(id));
  if (!user) return;
  if (!canDeleteUserRow(user)) {
    showToast("Non autorizzato.", "error");
    return;
  }
  const confirmed = window.confirm("Sei sicuro di voler eliminare questo utente? L'azione non sarà disponibile agli altri ruoli.");
  if (!confirmed) return;
  try {
    const result = await apiRequest(`/utenti/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (String(document.getElementById("userId")?.value || "") === String(id)) resetUserForm();
    await loadUsers();
    showToast(result?.message || "Utente eliminato correttamente.", "success");
  } catch (error) {
    showToast(error.message || "Impossibile eliminare l'utente.", "error");
  }
}

function renderAssistantMessages() {
  if (!assistantChat) return;
  if (!state.assistantMessages.length) {
    assistantChat.innerHTML = '<div class="empty-state">Scrivi una domanda per consultare l’assistente IA OroActive.</div>';
    return;
  }
  assistantChat.innerHTML = state.assistantMessages.map((message, index) => `
    <article class="assistant-message ${message.role === "user" ? "user" : "ai"}">
      ${escapeHtml(message.content)}
      ${message.role === "assistant" ? `
        <div class="assistant-feedback" data-assistant-feedback-index="${index}">
          <button type="button" data-ai-feedback="utile">Risposta utile</button>
          <button type="button" data-ai-feedback="non_utile">Risposta non utile</button>
          <button type="button" data-ai-feedback="errore">Segnala errore</button>
          <button type="button" data-ai-feedback="miglioramento">Suggerisci miglioramento</button>
        </div>
      ` : ""}
    </article>
  `).join("");
  assistantChat.scrollTop = assistantChat.scrollHeight;
}

async function askAssistant(event) {
  event.preventDefault();
  const question = assistantQuestion?.value.trim();
  if (!question) {
    showToast("Scrivi una domanda per l'assistente IA.");
    return;
  }

  state.assistantMessages.push({ role: "user", content: question });
  assistantQuestion.value = "";
  renderAssistantMessages();
  if (assistantLoading) assistantLoading.hidden = false;
  const sendButton = document.getElementById("assistantSend");
  if (sendButton) sendButton.disabled = true;

  try {
    const data = await apiRequest("/ai/assistente", {
      method: "POST",
      body: JSON.stringify({ domanda: question, mode: assistantMode?.value || "chat" }),
      timeoutMs: 60000
    });
    state.assistantMessages.push({
      role: "assistant",
      content: data.risposta || "Risposta non disponibile.",
      source: data.fonte || "Integrazione generale",
      question
    });
  } catch (error) {
    state.assistantMessages.push({
      role: "assistant",
      content: error.message || "Assistente IA non disponibile. Puoi riprovare tra poco.",
      source: "Sistema"
    });
  } finally {
    if (assistantLoading) assistantLoading.hidden = true;
    if (sendButton) sendButton.disabled = false;
    renderAssistantMessages();
  }
}

function ensureAurumHelpAttributes() {
  AURUM_HELP_TARGETS.forEach(({ key, selector }) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.dataset.aurumHelp = key;
    });
  });
}

function aurumNormalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAurumNormativeQuestion(question = "") {
  const normalized = aurumNormalize(question);
  if (!normalized) return false;
  const hasNormativeIntent = /(legge|normativa|decreto|d lgs|dlgs|legislativo|antiriciclaggio|adempiment|obblig|norma|compliance|compro oro|registro|questura|oro usato)/.test(normalized);
  const hasQuestionIntent = /(quale|quando|anno|emessa|emanata|ultima|recente|cosa dice|spiegami|riguarda|devo|bisogna|obbliga|prevede)/.test(normalized);
  return hasNormativeIntent && hasQuestionIntent;
}

function isAurumNormativeAnswerAdequate(answer = "") {
  const normalized = aurumNormalize(answer);
  if (!normalized) return false;
  return /(decreto legislativo|d lgs|dlgs|normativa|legge)/.test(normalized)
    && /(2017|92|2024|211|compro oro|antiriciclaggio)/.test(normalized);
}

function buildAurumNormativeAnswer(question = "") {
  const normalized = aurumNormalize(question);
  const asksLatest = /(ultima|ultimo|recente|nuova|aggiornat|2024)/.test(normalized);
  const asksYear = /(anno|quando|emessa|emanata|fatta)/.test(normalized);
  const opening = asksYear && !asksLatest
    ? "La normativa organica di riferimento per i compro oro e stata emanata nel 2017: Decreto Legislativo 25 maggio 2017, n. 92."
    : asksLatest
      ? "Nel materiale normativo caricato in OroActive il riferimento piu recente e il Decreto Legislativo 10 dicembre 2024, n. 211; il quadro base per i compro oro resta il Decreto Legislativo 25 maggio 2017, n. 92."
      : "Per i compro oro il riferimento operativo principale caricato in Aurum e il Decreto Legislativo 25 maggio 2017, n. 92, con aggiornamenti normativi successivi presenti nei materiali OroActive.";

  return [
    "Risposta normativa OroActive",
    "",
    opening,
    "",
    "In pratica, per l'operatore significa lavorare sempre con questi controlli minimi:",
    "1. identificare correttamente il cliente e verificare il documento;",
    "2. registrare l'operazione con descrizione chiara degli oggetti, metallo, titolo/caratura, peso e prezzo;",
    "3. conservare documenti, foto, firme e tracciabilita secondo procedura OroActive;",
    "4. rispettare limiti, mezzi di pagamento e controlli antiriciclaggio previsti dalle policy interne;",
    "5. sospendere o far autorizzare la pratica quando emergono anomalie, documenti scaduti, operazioni frazionate o rischio Aurum Shield.",
    "",
    "Se la domanda riguarda l'ultima norma caricata: il documento piu recente nei materiali Aurum e il D.Lgs. 211/2024. Se invece chiedi la legge base dei compro oro, la risposta e il 2017, D.Lgs. 92/2017.",
    "",
    "Nota: questa e una spiegazione operativa interna, non consulenza legale. Per decisioni formali usa sempre il testo ufficiale e le procedure approvate dal Founder."
  ].join("\n");
}

function isAurumFieldHelpQuestion(question = "") {
  const normalized = aurumNormalize(question);
  if (!normalized) return false;
  if (/(questo campo|campo selezionato|campo attuale|spiegami.*campo|a cosa serve.*campo|cosa significa.*campo|che significa.*campo)/.test(normalized)) return true;
  return /(campo|voce|selezione|input|form|compilare|inserire|dove scrivo|dove metto)/.test(normalized);
}

function aurumSectionKey(section = state.aurumCurrentSection) {
  return AURUM_SECTION_MAP[section] || section || "nuovo_atto_vendita";
}

function currentAurumGuide(section = state.aurumCurrentSection) {
  return OROACTIVE_APP_GUIDE[aurumSectionKey(section)] || OROACTIVE_APP_GUIDE.nuovo_atto_vendita;
}

function currentAurumSubSection() {
  if (aurumSectionKey() === "nuovo_atto_vendita") {
    return document.querySelector(".form-step.active-step h2")?.textContent?.trim() || "";
  }
  return document.querySelector(".screen.active-screen h2")?.textContent?.trim() || "";
}

function elementIsVisible(element) {
  if (!element || element.hidden) return false;
  const rect = element.getBoundingClientRect();
  return Boolean(rect.width || rect.height);
}

function visibleAurumFields() {
  const fields = new Set(currentAurumGuide().fields || []);
  document.querySelectorAll(".screen.active-screen [data-aurum-help], .main-menu-screen:not([hidden]) [data-aurum-help]").forEach((element) => {
    if (!elementIsVisible(element)) return;
    const help = AURUM_FIELD_HELP[element.dataset.aurumHelp];
    if (help?.labels?.[0]) fields.add(help.labels[0]);
  });
  return [...fields].slice(0, 24);
}

function visibleAurumActions() {
  const actions = new Set(currentAurumGuide().actions || []);
  document.querySelectorAll(".screen.active-screen button, .main-menu-screen:not([hidden]) button").forEach((button) => {
    if (!elementIsVisible(button)) return;
    const text = button.textContent?.replace(/\s+/g, " ").trim();
    if (text && text.length <= 60) actions.add(text);
  });
  return [...actions].slice(0, 24);
}

function aurumRoleAdvice() {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") return "Hai accesso direzionale: posso includere dashboard, utenti, backup, audit e performance.";
  if (role === "responsabile") return "Adatto la guida a controllo operatori, giacenza, corsi team e flussi negozio.";
  if (role === "aiuto_commesso") return "Ti guido con passaggi più semplici e segnalo quando serve un responsabile.";
  return "Mi concentro su operatività corretta, compilazione atti e procedure quotidiane.";
}

function formatAurumGuideResponse(guideKey, tutorialId = "") {
  const guide = OROACTIVE_APP_GUIDE[guideKey] || currentAurumGuide();
  const tutorial = AURUM_LIVE_TUTORIALS[tutorialId];
  const steps = tutorial?.steps?.map((step) => step.text) || guide.steps || [];
  return [
    `${tutorial?.title || guide.title}`,
    "",
    `Obiettivo: ${guide.description}`,
    `Prerequisiti: permesso coerente con il ruolo, dati verificati e sezione corretta aperta.`,
    "",
    "Passaggi:",
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `Controlli da fare: ${(guide.checks || []).join(", ")}.`,
    `Errori da evitare: ${(guide.commonErrors || []).join(", ")}.`,
    `Alla fine: salva, stampa o completa solo dopo aver verificato i controlli obbligatori.`,
    "",
    aurumRoleAdvice()
  ].join("\n");
}

function aurumFieldByQuestion(question = "") {
  const normalized = aurumNormalize(question);
  const activeKey = document.activeElement?.closest?.("[data-aurum-help]")?.dataset?.aurumHelp || "";
  if (/questo campo|campo selezionato|campo attuale/.test(normalized) && activeKey) return activeKey;
  if (!isAurumFieldHelpQuestion(question)) return "";
  return Object.entries(AURUM_FIELD_HELP).find(([, help]) => (
    help.labels.some((label) => normalized.includes(aurumNormalize(label)))
  ))?.[0] || "";
}

function explainAurumField(fieldKey = "") {
  const help = AURUM_FIELD_HELP[fieldKey];
  if (!help) return "";
  const label = help.labels[0] || "campo";
  return `Campo: ${label}\n\n${help.text}\n\nDove controllarlo: ${currentAurumGuide().title}. Se il campo non è visibile, apri la sezione corretta o il passaggio relativo.`;
}

function inferAurumTutorialId(question = "") {
  const normalized = aurumNormalize(question);
  if (/(copia cliente|stampa cliente|stampare.*cliente|pdf cliente)/.test(normalized)) return "tutorial_stampa_copia_cliente";
  if (/(copia aziendale|stampa aziendale|stampare.*aziendale|pdf aziendale)/.test(normalized)) return "tutorial_stampa_copia_aziendale";
  if (/(elenco|archivio|lista atti|atti creati)/.test(normalized)) return "tutorial_elenco_atti";
  if (/(giacenza|grammi|materiale in giacenza)/.test(normalized)) return "tutorial_giacenza";
  if (/(fusione|fusioni|lotto|raffineria)/.test(normalized)) return "tutorial_fusioni";
  if (/(crm|cliente crm|storico cliente|modifico un cliente)/.test(normalized)) return "tutorial_crm";
  if (/(academy|corso|corsi|badge|certificazione|formazione)/.test(normalized)) return "tutorial_academy";
  if (/(backup|restore|scarica backup|verifica backup)/.test(normalized)) return "tutorial_backup";
  if (/(utenti|utente|ruoli|permessi|online|offline|attivita utente)/.test(normalized)) return "tutorial_utenti";
  if (/(atto di vendita|compil.*atto|nuovo atto|archiviare|completa pratica|cosa devo controllare)/.test(normalized)) return "tutorial_compila_atto";
  if (/(guidami|passo passo|tutorial operativo|cosa devo fare ora|spiegami questa sezione|come funziona questa sezione)/.test(normalized)) {
    return {
      nuovo_atto_vendita: "tutorial_compila_atto",
      elenco_atti: "tutorial_elenco_atti",
      giacenza: "tutorial_giacenza",
      fusioni: "tutorial_fusioni",
      crm_clienti: "tutorial_crm",
      academy: "tutorial_academy",
      backup: "tutorial_backup",
      utenti: "tutorial_utenti"
    }[aurumSectionKey()] || "";
  }
  return "";
}

function aurumTutorialAllowed(tutorialId = "") {
  const guide = OROACTIVE_APP_GUIDE[AURUM_TUTORIAL_TO_GUIDE[tutorialId]];
  if (!guide) return true;
  return (guide.permissions || []).includes(normalizeRole(state.currentUser?.ruolo));
}

function runAurumTutorialStepAction(step = {}) {
  if (step.screen) {
    setScreen(step.screen);
  }
  if (Number.isInteger(step.practiceStep)) {
    state.step = step.practiceStep;
    renderStep();
  }
}

function buildAurumTutorialSteps(tutorialId = "") {
  const tutorial = AURUM_LIVE_TUTORIALS[tutorialId];
  if (!tutorial) return [];
  return tutorial.steps.map((step) => ({ ...step, aurum: true }));
}

function startAurumTutorial(tutorialId = "") {
  if (!shouldShowAurumMascot()) return false;
  const tutorial = AURUM_LIVE_TUTORIALS[tutorialId];
  if (!tutorial) return false;
  if (!aurumTutorialAllowed(tutorialId)) {
    state.aurumMessages.push({
      role: "assistant",
      content: "Potresti non avere il permesso per questa procedura. Puoi chiedere a un responsabile o al founder."
    });
    renderAurumMessages();
    return true;
  }
  ensureAurumHelpAttributes();
  state.tutorial.active = true;
  state.tutorial.source = "aurum";
  state.tutorial.id = tutorialId;
  state.tutorial.index = 0;
  state.tutorial.steps = buildAurumTutorialSteps(tutorialId);
  state.tutorial.firstRun = false;
  state.aurumMessages.push({ role: "assistant", content: `${tutorial.intro}\n\nAvvio la Guida passo passo: usa Avanti, Indietro o Chiudi tutorial.` });
  renderAurumMessages();
  renderTutorialStep();
  return true;
}

function handleAurumTutorRequest(question = "") {
  const fieldKey = aurumFieldByQuestion(question);
  if (fieldKey) {
    const answer = explainAurumField(fieldKey);
    state.aurumMessages.push({ role: "assistant", content: answer });
    const target = document.querySelector(`[data-aurum-help="${cssEscape(fieldKey)}"]`);
    if (target) applyTutorialHighlight(`[data-aurum-help="${cssEscape(fieldKey)}"]`);
    renderAurumMessages();
    return true;
  }
  if (/(questo campo|a cosa serve.*campo|spiegami.*campo)/.test(aurumNormalize(question))) {
    state.aurumMessages.push({ role: "assistant", content: "Seleziona o tocca un campo visibile e poi chiedimi di spiegarlo. Posso spiegare codice fiscale, documento, residenza, metallo, titolo, peso, pagamento, contabile, firme, giacenza, fusioni, badge e certificazioni." });
    renderAurumMessages();
    return true;
  }
  const tutorialId = inferAurumTutorialId(question);
  if (!tutorialId) return false;
  const guideKey = AURUM_TUTORIAL_TO_GUIDE[tutorialId] || aurumSectionKey();
  state.aurumMessages.push({ role: "assistant", content: formatAurumGuideResponse(guideKey, tutorialId) });
  renderAurumMessages();
  startAurumTutorial(tutorialId);
  return true;
}

function stopAurumTips() {
  window.clearTimeout(state.aurumTipTimer);
  window.clearTimeout(state.aurumTipHideTimer);
  state.aurumTipTimer = null;
  state.aurumTipHideTimer = null;
  hideAurumTip();
}

function stopAurumMovement() {
  window.clearTimeout(state.aurumMovementTimer);
  state.aurumMovementTimer = null;
  state.aurumPositionIndex = 0;
  if (aurumMascotRoot) {
    aurumMascotRoot.classList.remove("aurum-roaming");
    aurumMascotRoot.style.setProperty("--aurum-x", "0px");
    aurumMascotRoot.style.setProperty("--aurum-y", "0px");
  }
}

function hideAurumTip() {
  if (!aurumTipBubble) return;
  aurumTipBubble.hidden = true;
  aurumTipBubble.classList.remove("aurum-tip-side-left", "aurum-tip-side-right");
  aurumTipBubble.style.removeProperty("--aurum-tip-offset-y");
  aurumTipBubble.style.removeProperty("left");
  aurumTipBubble.style.removeProperty("top");
  aurumTipBubble.style.removeProperty("right");
  aurumTipBubble.style.removeProperty("bottom");
}

function loadAurumSettings() {
  if (state.aurumSettings) return state.aurumSettings;
  try {
    const saved = JSON.parse(localStorage.getItem(AURUM_SETTINGS_KEY) || "{}");
    state.aurumSettings = { ...AURUM_DEFAULT_SETTINGS, ...saved };
  } catch {
    state.aurumSettings = { ...AURUM_DEFAULT_SETTINGS };
  }
  return state.aurumSettings;
}

function saveAurumSettings(settings = {}) {
  state.aurumSettings = { ...AURUM_DEFAULT_SETTINGS, ...state.aurumSettings, ...settings };
  localStorage.setItem(AURUM_SETTINGS_KEY, JSON.stringify(state.aurumSettings));
  renderAurumManagementPanel();
  updateAurumMascotVisibility();
}

function safeViewportInset(name = "right") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`env(safe-area-inset-${name})`);
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadAurumFloatingPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(AURUM_FLOATING_POSITION_KEY) || "null");
    if (!saved || !Number.isFinite(Number(saved.x)) || !Number.isFinite(Number(saved.y))) return null;
    return { x: Number(saved.x), y: Number(saved.y) };
  } catch {
    return null;
  }
}

function saveAurumFloatingPosition(position) {
  if (!position) return;
  localStorage.setItem(AURUM_FLOATING_POSITION_KEY, JSON.stringify({
    x: Math.round(position.x),
    y: Math.round(position.y)
  }));
}

function aurumViewportBounds(element = aurumMascotRoot) {
  const rect = element?.getBoundingClientRect?.();
  const width = Math.max(rect?.width || element?.offsetWidth || 96, 64);
  const height = Math.max(rect?.height || element?.offsetHeight || 96, 64);
  return {
    minX: AURUM_SAFE_MARGIN + safeViewportInset("left"),
    minY: AURUM_SAFE_MARGIN + safeViewportInset("top"),
    maxX: Math.max(AURUM_SAFE_MARGIN, window.innerWidth - width - AURUM_SAFE_MARGIN - safeViewportInset("right")),
    maxY: Math.max(AURUM_SAFE_MARGIN, window.innerHeight - height - AURUM_SAFE_MARGIN - safeViewportInset("bottom")),
    width,
    height
  };
}

function clampAurumPosition(position = {}, element = aurumMascotRoot) {
  const bounds = aurumViewportBounds(element);
  const requestedX = Number(position.x);
  const requestedY = Number(position.y);
  return {
    x: Math.min(Math.max(Number.isFinite(requestedX) ? requestedX : bounds.maxX, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(Number.isFinite(requestedY) ? requestedY : bounds.maxY, bounds.minY), bounds.maxY)
  };
}

function defaultAurumPosition(element = aurumMascotRoot) {
  const bounds = aurumViewportBounds(element);
  return {
    x: bounds.maxX - Math.max(0, AURUM_DEFAULT_OFFSET - AURUM_SAFE_MARGIN),
    y: bounds.maxY - Math.max(0, AURUM_DEFAULT_OFFSET - AURUM_SAFE_MARGIN)
  };
}

function applyAurumPosition(position, options = {}) {
  if (!aurumMascotRoot || !position) return;
  const clamped = clampAurumPosition(position);
  state.aurumFloatingPosition = clamped;
  aurumMascotRoot.style.setProperty("--aurum-left", `${clamped.x}px`);
  aurumMascotRoot.style.setProperty("--aurum-top", `${clamped.y}px`);
  aurumMascotRoot.classList.add("aurum-positioned");
  if (options.save) {
    state.aurumAutoMoved = false;
    saveAurumFloatingPosition(clamped);
  }
  constrainAurumTipToViewport();
}

function restoreAurumFloatingPosition() {
  if (!aurumMascotRoot || aurumMascotRoot.hidden) return;
  const saved = loadAurumFloatingPosition();
  const position = saved ? clampAurumPosition(saved) : defaultAurumPosition();
  applyAurumPosition(position, { save: false });
}

function resetAurumFloatingPosition(options = {}) {
  localStorage.removeItem(AURUM_FLOATING_POSITION_KEY);
  state.aurumAutoMoved = false;
  if (aurumChatPanel) {
    aurumChatPanel.classList.remove("aurum-panel-positioned", "aurum-panel-dragging");
    aurumChatPanel.style.removeProperty("left");
    aurumChatPanel.style.removeProperty("top");
    aurumChatPanel.style.removeProperty("right");
    aurumChatPanel.style.removeProperty("bottom");
  }
  restoreAurumFloatingPosition();
  constrainAurumPanelToViewport();
  scheduleAurumAvoidance();
  if (options.toast !== false) showToast("Posizione Aurum ripristinata", "success");
}

function aurumRectFromPosition(position, element = aurumMascotRoot) {
  const bounds = aurumViewportBounds(element);
  return {
    left: position.x,
    top: position.y,
    right: position.x + bounds.width,
    bottom: position.y + bounds.height,
    width: bounds.width,
    height: bounds.height
  };
}

function rectsOverlap(first, second, margin = 8) {
  return !(first.right + margin < second.left
    || first.left - margin > second.right
    || first.bottom + margin < second.top
    || first.top - margin > second.bottom);
}

function expandedRect(rect, inset = 12) {
  return {
    left: Math.max(0, rect.left - inset),
    top: Math.max(0, rect.top - inset),
    right: Math.min(window.innerWidth, rect.right + inset),
    bottom: Math.min(window.innerHeight, rect.bottom + inset),
    width: Math.min(window.innerWidth, rect.right + inset) - Math.max(0, rect.left - inset),
    height: Math.min(window.innerHeight, rect.bottom + inset) - Math.max(0, rect.top - inset)
  };
}

function activePracticeAvoidRect() {
  const active = document.activeElement;
  if (!active?.matches?.(AURUM_ACTIVE_FIELD_SELECTOR) || !active.closest("#practice")) return null;
  const rect = active.getBoundingClientRect();
  const extraBottom = active.matches("input[list], select, textarea") ? 210 : 96;
  return {
    left: Math.max(0, rect.left - 18),
    top: Math.max(0, rect.top - 18),
    right: Math.min(window.innerWidth, rect.right + 18),
    bottom: Math.min(window.innerHeight, rect.bottom + extraBottom),
    width: Math.min(window.innerWidth, rect.right + 18) - Math.max(0, rect.left - 18),
    height: Math.min(window.innerHeight, rect.bottom + extraBottom) - Math.max(0, rect.top - 18)
  };
}

function visibleAurumAvoidRects() {
  const rects = [];
  document.querySelectorAll(AURUM_AVOID_SELECTORS.join(",")).forEach((element) => {
    if (!element || element.closest("#aurumMascotRoot") || !elementIsVisible(element)) return;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    rects.push(expandedRect(rect, 10));
  });
  const activeRect = activePracticeAvoidRect();
  if (activeRect) rects.push(activeRect);
  return rects;
}

function aurumPositionCandidates(element = aurumMascotRoot) {
  const bounds = aurumViewportBounds(element);
  const offset = AURUM_DEFAULT_OFFSET;
  const maxX = bounds.maxX;
  const maxY = bounds.maxY;
  const minX = bounds.minX;
  const minY = bounds.minY;
  const centerY = Math.round((window.innerHeight - bounds.height) / 2);
  return [
    { x: maxX - Math.max(0, offset - AURUM_SAFE_MARGIN), y: maxY - Math.max(0, offset - AURUM_SAFE_MARGIN) },
    { x: minX + offset, y: maxY - Math.max(0, offset - AURUM_SAFE_MARGIN) },
    { x: maxX - Math.max(0, offset - AURUM_SAFE_MARGIN), y: minY + offset },
    { x: minX + offset, y: minY + offset },
    { x: maxX - Math.max(0, offset - AURUM_SAFE_MARGIN), y: centerY },
    { x: minX + offset, y: centerY }
  ].map((position) => clampAurumPosition(position, element));
}

function findFreeAurumPosition(avoidRects = []) {
  const current = state.aurumFloatingPosition || defaultAurumPosition();
  const currentRect = aurumRectFromPosition(current);
  if (!avoidRects.some((rect) => rectsOverlap(currentRect, rect, 10))) return current;
  return aurumPositionCandidates().find((position) => {
    const candidateRect = aurumRectFromPosition(position);
    return !avoidRects.some((rect) => rectsOverlap(candidateRect, rect, 10));
  }) || current;
}

function scheduleAurumAvoidance() {
  if (state.aurumAvoidFrame) cancelAnimationFrame(state.aurumAvoidFrame);
  state.aurumAvoidFrame = requestAnimationFrame(updateAurumAvoidance);
}

function updateAurumAvoidance() {
  state.aurumAvoidFrame = null;
  if (!aurumMascotRoot || aurumMascotRoot.hidden || !shouldShowAurumMascot()) return;
  const avoidRects = visibleAurumAvoidRects();
  const avoidActive = avoidRects.length > 0;
  const compact = avoidActive && Boolean(document.getElementById("practice")?.classList.contains("active-screen"));
  state.aurumAvoidActive = avoidActive;
  aurumMascotRoot.classList.toggle("aurum-avoid-active", avoidActive);
  aurumMascotRoot.classList.toggle("aurum-compact", compact);
  if (compact) hideAurumTip();
  if (!avoidActive && state.aurumAutoMoved) {
    restoreAurumFloatingPosition();
    state.aurumAutoMoved = false;
    return;
  }
  if (aurumTipBubble && !aurumTipBubble.hidden) {
    constrainAurumTipToViewport();
    return;
  }
  if (!avoidActive || !aurumChatPanel?.hidden) return;
  const nextPosition = findFreeAurumPosition(avoidRects);
  const current = state.aurumFloatingPosition || defaultAurumPosition();
  if (Math.abs(nextPosition.x - current.x) > 1 || Math.abs(nextPosition.y - current.y) > 1) {
    state.aurumAutoMoved = true;
    applyAurumPosition(nextPosition, { save: false });
  }
}

function markAurumAvoidElements() {
  [
    "#documentExpiryWarning",
    "#amlCashAlert",
    "#materialAmountPanel",
    "#guidedQualityActions",
    "#qualityReviewPanel",
    ".bottom-actions",
    ".practice-card",
    ".customer-privacy-actions",
    ".signature-grid",
    ".capture-grid",
    ".capture-actions",
    ".document-scan-actions",
    ".notification-dropdown",
    ".brand-dropdown",
    ".main-user-dropdown"
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.dataset.aurumAvoid = "true";
    });
  });
  document.querySelectorAll("#practice input[list], #practice select, #practice textarea").forEach((element) => {
    element.classList.add("aurum-field-avoid-anchor");
  });
}

function dispatchAurumAvoidanceUpdate() {
  window.dispatchEvent(new CustomEvent(AURUM_AVOID_EVENT));
}

function constrainAurumPanelToViewport() {
  if (!aurumChatPanel || aurumChatPanel.hidden) return;
  const rect = aurumChatPanel.getBoundingClientRect();
  const minX = AURUM_SAFE_MARGIN;
  const minY = AURUM_SAFE_MARGIN;
  const maxX = Math.max(minX, window.innerWidth - rect.width - AURUM_SAFE_MARGIN);
  const maxY = Math.max(minY, window.innerHeight - rect.height - AURUM_SAFE_MARGIN);
  if (rect.left < minX || rect.top < minY || rect.right > window.innerWidth - AURUM_SAFE_MARGIN || rect.bottom > window.innerHeight - AURUM_SAFE_MARGIN) {
    aurumChatPanel.classList.add("aurum-panel-positioned");
    aurumChatPanel.style.left = `${Math.min(Math.max(rect.left, minX), maxX)}px`;
    aurumChatPanel.style.top = `${Math.min(Math.max(rect.top, minY), maxY)}px`;
    aurumChatPanel.style.right = "auto";
    aurumChatPanel.style.bottom = "auto";
  }
}

function constrainAurumTipToViewport() {
  if (!aurumTipBubble || !aurumMascotRoot || aurumTipBubble.hidden || aurumMascotRoot.hidden) return;
  aurumTipBubble.style.removeProperty("left");
  aurumTipBubble.style.removeProperty("top");
  aurumTipBubble.style.removeProperty("right");
  aurumTipBubble.style.removeProperty("bottom");
  aurumTipBubble.style.removeProperty("--aurum-tip-offset-y");
  const mascotRect = aurumMascotRoot.getBoundingClientRect();
  const tipRect = aurumTipBubble.getBoundingClientRect();
  if (!mascotRect.width || !mascotRect.height || !tipRect.width || !tipRect.height) return;
  const safeLeft = AURUM_SAFE_MARGIN + safeViewportInset("left");
  const safeRight = AURUM_SAFE_MARGIN + safeViewportInset("right");
  const safeTop = AURUM_SAFE_MARGIN + safeViewportInset("top");
  const safeBottom = AURUM_SAFE_MARGIN + safeViewportInset("bottom");
  const gap = Math.max(12, AURUM_SAFE_MARGIN);
  const leftSpace = mascotRect.left - safeLeft - gap;
  const rightSpace = window.innerWidth - safeRight - mascotRect.right - gap;
  const side = leftSpace >= tipRect.width || leftSpace >= rightSpace ? "left" : "right";
  const requestedTop = mascotRect.top + (mascotRect.height - tipRect.height) / 2;
  const minTop = safeTop;
  const maxTop = Math.max(safeTop, window.innerHeight - tipRect.height - safeBottom);
  const offsetY = Math.round(Math.min(Math.max(requestedTop, minTop), maxTop) - requestedTop);
  aurumTipBubble.classList.toggle("aurum-tip-side-left", side === "left");
  aurumTipBubble.classList.toggle("aurum-tip-side-right", side === "right");
  aurumTipBubble.style.setProperty("--aurum-tip-offset-y", `${offsetY}px`);
}

function scheduleAurumViewportClamp() {
  window.requestAnimationFrame(() => {
    constrainAurumPanelToViewport();
    constrainAurumTipToViewport();
  });
}

function applyAurumPanelPosition(position) {
  if (!aurumChatPanel) return;
  const rect = aurumChatPanel.getBoundingClientRect();
  const x = Math.min(Math.max(position.x, AURUM_SAFE_MARGIN), Math.max(AURUM_SAFE_MARGIN, window.innerWidth - rect.width - AURUM_SAFE_MARGIN));
  const y = Math.min(Math.max(position.y, AURUM_SAFE_MARGIN), Math.max(AURUM_SAFE_MARGIN, window.innerHeight - rect.height - AURUM_SAFE_MARGIN));
  aurumChatPanel.classList.add("aurum-panel-positioned");
  aurumChatPanel.style.left = `${x}px`;
  aurumChatPanel.style.top = `${y}px`;
  aurumChatPanel.style.right = "auto";
  aurumChatPanel.style.bottom = "auto";
}

function handleAurumPointerDown(event) {
  if (!shouldShowAurumMascot()) return;
  const headerHandle = event.target.closest?.(".aurum-chat-header");
  const mascotHandle = event.target.closest?.("#aurumMascotButton");
  if (!headerHandle && !mascotHandle) return;
  if (headerHandle && event.target.closest("button, input, textarea, select")) return;
  if (event.button !== undefined && event.button !== 0) return;
  const element = headerHandle ? aurumChatPanel : aurumMascotRoot;
  if (!element) return;
  const rect = element.getBoundingClientRect();
  state.aurumDragState = {
    pointerId: event.pointerId,
    element: headerHandle ? "panel" : "mascot",
    originX: rect.left,
    originY: rect.top,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
  element.classList.add(headerHandle ? "aurum-panel-dragging" : "aurum-dragging");
  element.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleAurumPointerMove(event) {
  const drag = state.aurumDragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  if (drag.element === "panel") {
    applyAurumPanelPosition({ x: drag.originX + dx, y: drag.originY + dy });
  } else {
    applyAurumPosition({ x: drag.originX + dx, y: drag.originY + dy }, { save: false });
  }
  constrainAurumTipToViewport();
}

function handleAurumPointerUp(event) {
  const drag = state.aurumDragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const element = drag.element === "panel" ? aurumChatPanel : aurumMascotRoot;
  element?.classList.remove(drag.element === "panel" ? "aurum-panel-dragging" : "aurum-dragging");
  element?.releasePointerCapture?.(event.pointerId);
  if (drag.element === "mascot" && drag.moved) {
    state.aurumSuppressNextClick = true;
    saveAurumFloatingPosition(state.aurumFloatingPosition || defaultAurumPosition());
    window.setTimeout(() => {
      state.aurumSuppressNextClick = false;
    }, 80);
  }
  state.aurumDragState = null;
  scheduleAurumAvoidance();
}

function shouldShowAurumMascot() {
  const settings = loadAurumSettings();
  return Boolean(ENABLE_AURUM_MASCOT && settings.enabled && state.currentUser);
}

function updateAurumMascotVisibility() {
  const visible = shouldShowAurumMascot();
  if (aurumMascotRoot) aurumMascotRoot.hidden = !visible;
  if (!visible) {
    stopAurumTips();
    stopAurumMovement();
    if (aurumChatPanel) aurumChatPanel.hidden = true;
    aurumMascotRoot?.classList.remove("aurum-panel-open");
    return;
  }
  restoreAurumFloatingPosition();
  updateAurumMovement();
  scheduleAurumTips();
  scheduleAurumAvoidance();
}

function aurumUserLabel(user = state.currentUser) {
  if (!user) return "operatore";
  return user.nome || displayUsername(user) || user.email || "operatore";
}

function aurumGreetingKey(user = state.currentUser) {
  const today = new Date().toISOString().slice(0, 10);
  return `aurum_greeting_${today}_${user?.id || displayUsername(user) || "utente"}`;
}

function maybeShowAurumDailyGreeting() {
  if (!shouldShowAurumMascot() || !loadAurumSettings().greeting || !state.currentUser) return;
  const key = aurumGreetingKey();
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "shown");
  state.aurumAskedMoodToday = true;
  state.aurumMessages.push({
    role: "assistant",
    content: `Ciao ${aurumUserLabel()}, bentornato in OroActive. Come stai oggi?`
  });
  renderAurumMessages();
  showAurumTip(`Ciao ${aurumUserLabel()}, se vuoi sono qui per aiutarti nelle attivita di oggi.`);
}

function sectionTipPool(section = state.aurumCurrentSection) {
  return AURUM_SECTION_TIPS[section] || AURUM_TIPS;
}

function setAurumSection(section = "menu") {
  state.aurumCurrentSection = section || "menu";
  updateAurumMovement();
  markAurumAvoidElements();
  scheduleAurumAvoidance();
  if (shouldShowAurumMascot()) {
    window.clearTimeout(state.aurumTipHideTimer);
    const tips = sectionTipPool();
    const tip = tips[state.aurumTipIndex % tips.length] || AURUM_TIPS[0];
    showAurumTip(tip);
  }
}

function updateAurumMovement() {
  window.clearTimeout(state.aurumMovementTimer);
  const settings = loadAurumSettings();
  const canRoam = shouldShowAurumMascot()
    && settings.movement
    && mainMenuScreen
    && !mainMenuScreen.hidden
    && (!aurumChatPanel || aurumChatPanel.hidden)
    && (!aurumTipBubble || aurumTipBubble.hidden);
  if (!canRoam) {
    stopAurumMovement();
    return;
  }
  if (!aurumMascotRoot) return;
  aurumMascotRoot.classList.add("aurum-roaming");
  const move = () => {
    const point = AURUM_MENU_POSITIONS[state.aurumPositionIndex % AURUM_MENU_POSITIONS.length];
    state.aurumPositionIndex += 1;
    aurumMascotRoot.style.setProperty("--aurum-x", `${point.x}px`);
    aurumMascotRoot.style.setProperty("--aurum-y", `${point.y}px`);
    state.aurumMovementTimer = window.setTimeout(move, 11500);
  };
  state.aurumMovementTimer = window.setTimeout(move, 2600);
}

function aurumLookAtLogo(message = "Il logo OroActive mi piace particolarmente.") {
  if (!shouldShowAurumMascot()) return;
  window.clearTimeout(state.aurumLookTimer);
  aurumMascotButton?.classList.add("aurum-look-logo");
  showAurumTip(message);
  state.aurumLookTimer = window.setTimeout(() => {
    aurumMascotButton?.classList.remove("aurum-look-logo");
  }, 3600);
}

function renderAurumMessages() {
  if (!aurumChatMessages) return;
  const isPriceExplanation = state.aurumMode === "price_explanation";
  if (aurumChatTitle) aurumChatTitle.textContent = isPriceExplanation ? "Aurum — Spiegazione prezzo" : "Aurum — Assistente OroActive";
  aurumChatPanel?.classList.toggle("aurum-price-explanation-mode", isPriceExplanation);
  if (!state.aurumMessages.length) {
    aurumChatMessages.innerHTML = isPriceExplanation
      ? '<div class="empty-state">Aurum è pronto per spiegare prezzi, carature, titoli, costi, margini e scenari.</div>'
      : '<div class="empty-state">Aurum è pronto per rispondere usando l’Assistente IA OroActive.</div>';
  } else {
    aurumChatMessages.innerHTML = state.aurumMessages.map((message) => `
      <article class="aurum-message ${message.role === "user" ? "user" : "assistant"}">
        ${escapeHtml(message.content || "")}
      </article>
    `).join("");
    aurumChatMessages.scrollTop = aurumChatMessages.scrollHeight;
  }
  renderAurumMemoryLists();
  scheduleAurumViewportClamp();
}

function openAurumChat() {
  if (!shouldShowAurumMascot()) return;
  closeMainMenuDropdowns();
  closeMainUserMenu();
  stopAurumMovement();
  aurumMascotRoot?.classList.add("aurum-panel-open");
  if (aurumChatPanel) aurumChatPanel.hidden = false;
  hideAurumTip();
  renderAurumMessages();
  window.setTimeout(scheduleAurumViewportClamp, 0);
  window.setTimeout(() => aurumQuestion?.focus(), 60);
  updateAurumMascotVisibility();
}

function openAurumPanel(options = {}) {
  if (options.mode) state.aurumMode = options.mode;
  if (options.context) {
    state.aurumPriceContext = options.context;
    if (options.mode === "price_explanation") state.aurumLastPriceContext = options.context;
  }
  if (options.initialMessage) {
    const message = String(options.initialMessage || "").trim();
    if (message && state.aurumMessages[state.aurumMessages.length - 1]?.content !== message) {
      state.aurumMessages.push({ role: "user", content: message });
      state.aurumLastUserMessage = message;
    }
  }
  openAurumChat();
}

function resetAurumVisibleChat() {
  state.aurumMessages = [];
  state.aurumLastUserMessage = "";
  state.aurumMode = "";
  state.aurumPriceContext = null;
  state.aurumActiveQuiz = null;
  state.aurumSending = false;
  showAurumMemoryConsent(null);
  if (aurumSupportActions) aurumSupportActions.hidden = true;
  if (aurumQuestion) aurumQuestion.value = "";
  if (aurumAskButton) aurumAskButton.disabled = false;
  renderAurumMessages();
}

function closeAurumChat() {
  if (aurumChatPanel) aurumChatPanel.hidden = true;
  aurumMascotRoot?.classList.remove("aurum-panel-open");
  resetAurumVisibleChat();
  updateAurumMovement();
  scheduleAurumAvoidance();
}

function showAurumTip(text = "") {
  if (!shouldShowAurumMascot() || !aurumTipBubble || !aurumTipText || !text && aurumChatPanel && !aurumChatPanel.hidden) return;
  if (state.aurumAvoidActive && aurumChatPanel?.hidden) {
    hideAurumTip();
    return;
  }
  stopAurumMovement();
  const tips = sectionTipPool();
  const message = text || tips[state.aurumTipIndex % tips.length] || AURUM_TIPS[state.aurumTipIndex % AURUM_TIPS.length];
  state.aurumTipIndex += 1;
  aurumTipText.textContent = message;
  aurumTipBubble.hidden = false;
  scheduleAurumViewportClamp();
  window.requestAnimationFrame(constrainAurumTipToViewport);
  window.clearTimeout(state.aurumTipHideTimer);
  state.aurumTipHideTimer = window.setTimeout(() => {
    hideAurumTip();
    updateAurumMovement();
    scheduleAurumAvoidance();
  }, 6500);
}

function scheduleAurumTips() {
  window.clearTimeout(state.aurumTipTimer);
  if (!shouldShowAurumMascot()) return;
  state.aurumTipTimer = window.setTimeout(() => {
    showAurumTip();
    scheduleAurumTips();
  }, 120000);
}

function classifyAurumMood(text = "") {
  const value = String(text || "").toLowerCase();
  if (/(responsabile|founder|fondatore|parlare con|supporto)/i.test(value)) return "support";
  if (/(stress|stressato|male|stanco|ansia|preoccup|problema|cliente difficile|arrabbi|agitato|non bene)/i.test(value)) return "negative";
  if (/(bene|benissimo|tutto bene|ok|alla grande|positivo|sereno|carico)/i.test(value)) return "positive";
  if (/(cosi|così|normale|abbastanza|neutro|uguale)/i.test(value)) return "neutral";
  return "";
}

function handleAurumMoodReply(question = "") {
  const mood = classifyAurumMood(question);
  if (!state.aurumAskedMoodToday && !mood) return false;
  if (mood === "positive") {
    state.aurumMessages.push({ role: "assistant", content: "Perfetto, allora ti accompagno nelle attivita di oggi." });
    state.aurumAskedMoodToday = false;
    return true;
  }
  if (mood === "negative") {
    state.aurumMessages.push({ role: "assistant", content: "Mi dispiace. Vuoi che ti aiuti a organizzare meglio le attivita di oggi oppure vuoi inviare un messaggio riservato a un utente specifico?" });
    if (aurumSupportActions) aurumSupportActions.hidden = false;
    renderAurumMessageRecipients();
    state.aurumAskedMoodToday = false;
    return true;
  }
  if (mood === "support") {
    state.aurumMessages.push({ role: "assistant", content: "Posso inviare un messaggio interno riservato. Seleziona il destinatario tra gli utenti disponibili." });
    if (aurumSupportActions) aurumSupportActions.hidden = false;
    renderAurumMessageRecipients();
    state.aurumAskedMoodToday = false;
    return true;
  }
  if (mood === "neutral" || state.aurumAskedMoodToday) {
    state.aurumMessages.push({ role: "assistant", content: "Va bene. Se vuoi, posso aiutarti a ordinare le priorita operative della giornata." });
    state.aurumAskedMoodToday = false;
    return true;
  }
  return false;
}

function detectAurumMemoryCandidate(question = "") {
  if (!loadAurumSettings().memory) return null;
  const text = String(question || "").trim();
  if (text.length < 12 || text.length > 300) return null;
  if (classifyAurumMood(text) === "negative") return null;
  if (!/(ricorda|ricordami|preferisco|di solito|per me e meglio|mi aiuta|quando lavoro)/i.test(text)) return null;
  return {
    memory_text: text,
    memory_type: /(corso|academy|formazione)/i.test(text) ? "training_preference" : "work_preference"
  };
}

function showAurumMemoryConsent(candidate) {
  state.aurumConsentCandidate = candidate;
  if (aurumConsentPanel) aurumConsentPanel.hidden = !candidate;
}

function aurumMemoryTypeLabel(type = "") {
  return {
    work_preference: "Preferenza lavoro",
    training_preference: "Preferenza formazione",
    operational_note: "Nota operativa",
    communication_preference: "Preferenza comunicazione",
    user_question: "Domanda utente",
    user_feedback: "Feedback utente",
    quiz_answer: "Risposta quiz",
    support_message: "Messaggio supporto"
  }[String(type || "").trim()] || "Memoria Aurum";
}

function renderAurumMemoryLists() {
  renderFounderAurumMemories();
}

function renderFounderAurumMemories() {
  if (!aurumMemoriesList) return;
  if (!isFounder()) {
    aurumMemoriesList.innerHTML = "";
    return;
  }
  const memories = state.aurumAllMemories || [];
  if (!memories.length) {
    aurumMemoriesList.innerHTML = '<div class="empty-state">Nessuna memoria Aurum registrata.</div>';
    return;
  }
  const groups = new Map();
  memories.forEach((memory) => {
    const key = String(memory.user_id || "sconosciuto");
    if (!groups.has(key)) {
      groups.set(key, {
        label: memory.user_name || "Utente OroActive",
        store: memory.store || "",
        rows: []
      });
    }
    groups.get(key).rows.push(memory);
  });
  aurumMemoriesList.innerHTML = [...groups.values()].map((group) => `
    <section class="aurum-memory-group">
      <h4>${escapeHtml(group.label)}</h4>
      ${group.store ? `<small>${escapeHtml(group.store)}</small>` : ""}
      ${group.rows.map((memory) => `
        <article class="aurum-list-row">
          <span>${escapeHtml(memory.memory_text || "")}</span>
          <small>${escapeHtml(aurumMemoryTypeLabel(memory.memory_type))} · ${escapeHtml(formatDateTime(memory.updated_at || memory.created_at))}</small>
        </article>
      `).join("")}
    </section>
  `).join("");
}

function availableAurumMessageRecipients() {
  return (state.users || [])
    .filter((user) => String(user.id || "") !== String(state.currentUser?.id || ""))
    .filter((user) => user.attivo !== false)
    .filter((user) => user.visibility !== "hidden");
}

function renderAurumMessageRecipients() {
  const users = availableAurumMessageRecipients();
  const options = users.length
    ? `<option value="">Seleziona utente</option>${users.map((user) => `
        <option value="${escapeHtml(String(user.id))}">${escapeHtml(displayUserFullName(user))} - ${escapeHtml(roleLabel(user.ruolo))}</option>
      `).join("")}`
    : '<option value="">Nessun utente disponibile</option>';
  [aurumMessageRecipient, userMessageRecipient].forEach((select) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = options;
    if (current && users.some((user) => String(user.id) === String(current))) select.value = current;
  });
}

function aurumMessageDirectionLabel(request = {}) {
  if (request.is_sender) return `A: ${request.recipient_name || "utente"}`;
  if (request.is_recipient) return `Da: ${request.user_name || "utente"}`;
  return `Da: ${request.user_name || "utente"} · A: ${request.recipient_name || "utente"}`;
}

function renderAurumSupportRequests() {
  if (!state.aurumSupportRequests.length) {
    if (aurumSupportRequestsList) aurumSupportRequestsList.innerHTML = '<div class="empty-state">Nessun messaggio riservato aperto.</div>';
    renderUserMessages();
    return;
  }
  const markup = state.aurumSupportRequests.map((request) => `
    <article class="aurum-list-row">
      <strong>${escapeHtml(aurumMessageDirectionLabel(request))}</strong>
      <span>${escapeHtml(request.message || "Richiesta supporto")}</span>
      <small>${escapeHtml(request.status || "open")} · ${escapeHtml(formatDateTime(request.created_at))}${request.founder_observer ? " · Solo visualizzazione Founder" : ""}</small>
      ${request.response_message ? `
        <span><b>Risposta:</b> ${escapeHtml(request.response_message)}</span>
        <small>Risposto da ${escapeHtml(request.respondent_name || "referente")} · ${escapeHtml(formatDateTime(request.responded_at))}</small>
      ` : ""}
      ${request.can_reply ? `<textarea data-aurum-message-reply="${escapeHtml(request.id || "")}" rows="2" placeholder="Scrivi una risposta riservata">${escapeHtml(request.response_message || "")}</textarea>` : ""}
      ${(request.can_reply || request.can_delete) ? `
        <div class="row-actions">
          ${request.can_reply ? `<button class="primary-button" type="button" data-reply-aurum-message="${escapeHtml(request.id || "")}">Rispondi</button>` : ""}
          ${request.can_delete ? `<button class="danger-button" type="button" data-delete-aurum-message="${escapeHtml(request.id || "")}">Elimina</button>` : ""}
        </div>
      ` : ""}
    </article>
  `).join("");
  if (aurumSupportRequestsList) aurumSupportRequestsList.innerHTML = markup;
  renderUserMessages(markup);
}

function renderUserMessages(markup = "") {
  const canViewMessages = Boolean(state.currentUser);
  if (userMessagesPanel) userMessagesPanel.hidden = !canViewMessages;
  if (userMessageForm) userMessageForm.hidden = !canViewMessages;
  renderAurumMessageRecipients();
  if (!userMessagesList || !canViewMessages) return;
  userMessagesList.innerHTML = markup || '<div class="empty-state">Nessun messaggio riservato ricevuto.</div>';
}

function renderAurumManagementPanel() {
  const settings = loadAurumSettings();
  const canViewPanel = isFounder();
  if (aurumManagementPanel) aurumManagementPanel.hidden = !canViewPanel;
  if (aurumEnabledToggle) aurumEnabledToggle.checked = Boolean(settings.enabled);
  if (aurumMovementToggle) aurumMovementToggle.checked = Boolean(settings.movement);
  if (aurumGreetingToggle) aurumGreetingToggle.checked = Boolean(settings.greeting);
  if (aurumMemoryToggle) aurumMemoryToggle.checked = Boolean(settings.memory);
  [aurumEnabledToggle, aurumMovementToggle, aurumGreetingToggle, aurumMemoryToggle].forEach((toggle) => {
    if (toggle) toggle.disabled = !isFounder();
  });
  if (aurumResetLocalMemory) aurumResetLocalMemory.hidden = !isFounder();
  renderAurumMemoryLists();
  renderAurumSupportRequests();
}

function shouldRecordAurumMemory() {
  return ENABLE_AURUM_MASCOT && Boolean(state.currentUser) && Boolean(loadAurumSettings().memory);
}

function recordAurumInteractionMemory(memoryType, text, context = "") {
  if (!shouldRecordAurumMemory()) return;
  const content = [text, context].filter(Boolean).join(" | ").trim();
  if (content.length < 3) return;
  apiRequest("/aurum/memories", {
    method: "POST",
    body: JSON.stringify({
      memory_text: content.slice(0, 1000),
      memory_type: memoryType,
      automatic: true
    })
  }).then((data) => {
    if (data.memory) {
      state.aurumMemories = [data.memory, ...state.aurumMemories].filter(Boolean).slice(0, 100);
      renderAurumMemoryLists();
    }
    if (isFounder()) loadAurumAllMemories();
  }).catch(() => {
    // La memoria non deve mai bloccare chat, quiz o operatività.
  });
}

async function loadAurumMemories() {
  if (!ENABLE_AURUM_MASCOT || !state.currentUser) return;
  try {
    const data = await apiRequest("/aurum/memories");
    state.aurumMemories = data.memories || [];
  } catch {
    state.aurumMemories = [];
  }
  renderAurumMemoryLists();
}

async function loadAurumAllMemories() {
  if (!ENABLE_AURUM_MASCOT || !isFounder()) return;
  try {
    const data = await apiRequest("/aurum/memories/all");
    state.aurumAllMemories = data.memories || [];
  } catch {
    state.aurumAllMemories = [];
  }
  renderFounderAurumMemories();
}

async function saveAurumMemory() {
  const candidate = state.aurumConsentCandidate;
  showAurumMemoryConsent(null);
  if (!candidate) return;
  try {
    const data = await apiRequest("/aurum/memories", {
      method: "POST",
      body: JSON.stringify(candidate)
    });
    state.aurumMemories = [data.memory, ...state.aurumMemories].filter(Boolean);
    state.aurumMessages.push({ role: "assistant", content: "Memoria salvata. La usero solo per supporto operativo interno." });
  } catch (error) {
    state.aurumMessages.push({ role: "assistant", content: error.message || "Non sono riuscito a salvare la memoria." });
  } finally {
    renderAurumMessages();
  }
}

async function deleteAurumMemory(id) {
  if (!id) return;
  try {
    await apiRequest(`/aurum/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.aurumMemories = state.aurumMemories.filter((memory) => String(memory.id) !== String(id));
    renderAurumMemoryLists();
    showToast("Memoria Aurum eliminata.");
  } catch (error) {
    showToast(error.message || "Memoria Aurum non eliminata.");
  }
}

async function loadAurumSupportRequests() {
  if (!ENABLE_AURUM_MASCOT || !state.currentUser) return;
  try {
    const data = await apiRequest("/aurum/support-requests");
    state.aurumSupportRequests = data.requests || [];
  } catch {
    state.aurumSupportRequests = [];
  }
  renderAurumSupportRequests();
}

async function refreshAurumAdminData() {
  await Promise.all([
    loadAurumSupportRequests(),
    isFounder() ? loadAurumAllMemories() : Promise.resolve()
  ]);
}

async function replyAurumMessage(id, container) {
  if (!id) return;
  const row = container?.querySelector?.(`[data-aurum-message-reply="${cssEscape(id)}"]`)?.closest(".aurum-list-row")
    || document.querySelector(`[data-aurum-message-reply="${cssEscape(id)}"]`)?.closest(".aurum-list-row");
  const textarea = row?.querySelector(`[data-aurum-message-reply="${cssEscape(id)}"]`);
  const reply = textarea?.value.trim() || "";
  if (!reply) {
    showToast("Scrivi una risposta al messaggio.", "error");
    return;
  }
  try {
    const data = await apiRequest(`/aurum/support-requests/${encodeURIComponent(id)}/reply`, {
      method: "PATCH",
      body: JSON.stringify({ response_message: reply })
    });
    state.aurumSupportRequests = state.aurumSupportRequests.map((message) => (
      String(message.id) === String(id) ? data.request : message
    ));
    renderAurumSupportRequests();
    showToast("Risposta inviata correttamente.", "success");
  } catch (error) {
    showToast(error.message || "Risposta non inviata.", "error");
  }
}

async function deleteAurumMessage(id) {
  if (!id) return;
  if (!window.confirm("Vuoi eliminare questo messaggio riservato?")) return;
  try {
    await apiRequest(`/aurum/support-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.aurumSupportRequests = state.aurumSupportRequests.filter((message) => String(message.id) !== String(id));
    renderAurumSupportRequests();
    showToast("Messaggio eliminato.", "success");
  } catch (error) {
    showToast(error.message || "Messaggio non eliminato.", "error");
  }
}

async function sendAurumDirectMessage(recipientId, message, options = {}) {
  if (!state.currentUser) return;
  const text = String(message || "").trim();
  if (!recipientId) {
    showToast("Seleziona il destinatario del messaggio.", "error");
    return false;
  }
  if (!text) {
    showToast("Scrivi un messaggio da inviare.", "error");
    return false;
  }
  try {
    const data = await apiRequest("/aurum/support-requests", {
      method: "POST",
      body: JSON.stringify({
        recipient_user_id: recipientId,
        message: text
      })
    });
    state.aurumSupportRequests = [data.request, ...state.aurumSupportRequests].filter(Boolean);
    recordAurumInteractionMemory("support_message", text, `Destinatario: ${data.request?.recipient_name || recipientId}`);
    if (aurumSupportActions) aurumSupportActions.hidden = true;
    if (options.fromAurum) {
      state.aurumMessages.push({ role: "assistant", content: "Messaggio riservato inviato al destinatario selezionato." });
    }
    renderAurumSupportRequests();
    showToast("Messaggio inviato correttamente.", "success");
    return true;
  } catch (error) {
    if (options.fromAurum) {
      state.aurumMessages.push({ role: "assistant", content: error.message || "Non sono riuscito a inviare il messaggio." });
    }
    showToast(error.message || "Messaggio non inviato.", "error");
    return false;
  } finally {
    renderAurumMessages();
  }
}

function normalizeAurumQuizText(value = "") {
  return aurumNormalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function startAurumCuriosityQuiz() {
  if (!shouldShowAurumMascot()) return;
  const quiz = AURUM_COMPRO_ORO_QUIZ[state.aurumQuizIndex % AURUM_COMPRO_ORO_QUIZ.length];
  state.aurumQuizIndex += 1;
  state.aurumActiveQuiz = quiz;
  state.aurumMessages.push({
    role: "assistant",
    content: `Quiz compro oro\n\n${quiz.question}\n\nRispondi liberamente: ti correggo io se serve.`
  });
  renderAurumMessages();
}

function evaluateAurumQuizAnswer(answer = "") {
  const quiz = state.aurumActiveQuiz;
  if (!quiz) return false;
  const normalized = normalizeAurumQuizText(answer);
  const matches = (quiz.accepted || []).filter((term) => normalized.includes(normalizeAurumQuizText(term))).length;
  const correct = matches >= Math.min(2, Math.max(1, Math.ceil((quiz.accepted || []).length / 3)));
  state.aurumActiveQuiz = null;
  recordAurumInteractionMemory("quiz_answer", `Domanda quiz: ${quiz.question}`, `Risposta utente: ${answer}`);
  state.aurumMessages.push({
    role: "assistant",
    content: correct
      ? `Risposta corretta.\n\n${quiz.answer}\n\n${quiz.explanation}`
      : `Risposta da correggere.\n\nRisposta esatta: ${quiz.answer}\n\n${quiz.explanation}`
  });
  renderAurumMessages();
  return true;
}

function aurumContextPayload(question) {
  const guide = currentAurumGuide();
  const tutorialId = inferAurumTutorialId(question);
  const normativeQuestion = isAurumNormativeQuestion(question);
  const isPriceExplanation = state.aurumMode === "price_explanation";
  return {
    domanda: question,
    message: question,
    mode: isPriceExplanation ? "price_explanation" : normativeQuestion ? "normativa_operativa" : tutorialId ? "tutorial_operativo" : "chat",
    interface: "aurum_operational_tutor",
    section: isPriceExplanation ? "quotazione" : aurumSectionKey(),
    userId: state.currentUser?.id || null,
    context: {
      currentSection: isPriceExplanation ? "quotazione" : aurumSectionKey(),
      currentSubSection: isPriceExplanation ? "analisi_predittiva_metalli" : currentAurumSubSection(),
      userRole: state.currentUser?.ruolo || "",
      role: state.currentUser?.ruolo || "",
      storeName: state.currentUser?.negozio || "",
      store: state.currentUser?.negozio || "",
      userName: aurumUserLabel(),
      visibleFields: visibleAurumFields(),
      availableActions: visibleAurumActions(),
      appGuide: {
        title: guide.title,
        description: guide.description,
        fields: guide.fields,
        actions: guide.actions,
        steps: guide.steps,
        checks: guide.checks,
        commonErrors: guide.commonErrors,
        permissions: guide.permissions
      },
      tutorialRequested: Boolean(tutorialId),
      tutorialId,
      priceExplanationContext: isPriceExplanation ? state.aurumPriceContext : null,
      normativeContext: normativeQuestion ? {
        documenti: [
          "Decreto Legislativo 25 maggio 2017, n. 92",
          "Decreto Legislativo 10 dicembre 2024, n. 211",
          "Normativa e legislazione 2017",
          "Normativa e legislazione 2023"
        ],
        rispostaLocale: buildAurumNormativeAnswer(question)
      } : null,
      availableMemories: (state.aurumMemories || []).map((memory) => memory.memory_text).filter(Boolean).slice(0, 8)
    }
  };
}

async function askAurum(event) {
  event.preventDefault();
  if (!ENABLE_AURUM_MASCOT || state.aurumSending) return;
  const question = aurumQuestion?.value.trim();
  if (!question) {
    showToast("Scrivi una domanda per Aurum.");
    return;
  }
  state.aurumLastUserMessage = question;
  state.aurumMessages.push({ role: "user", content: question });
  if (aurumQuestion) aurumQuestion.value = "";
  renderAurumMessages();

  if (state.aurumActiveQuiz) {
    evaluateAurumQuizAnswer(question);
    return;
  }

  recordAurumInteractionMemory("user_question", question, `Sezione: ${aurumSectionKey()}`);
  const normativeQuestion = isAurumNormativeQuestion(question);

  if (/(quiz|curiosita|curiosità|domanda compro oro|mettimi alla prova)/i.test(question)) {
    startAurumCuriosityQuiz();
    return;
  }

  if (handleAurumMoodReply(question)) {
    renderAurumMessages();
    return;
  }

  if (!normativeQuestion && handleAurumTutorRequest(question)) {
    return;
  }

  state.aurumSending = true;
  if (aurumAskButton) aurumAskButton.disabled = true;
  try {
    const data = await apiRequest("/ai/assistente", {
      method: "POST",
      body: JSON.stringify(aurumContextPayload(question)),
      timeoutMs: 60000
    });
    state.aurumMessages.push({
      role: "assistant",
      content: normativeQuestion && !isAurumNormativeAnswerAdequate(data.risposta)
        ? buildAurumNormativeAnswer(question)
        : data.risposta || "Risposta non disponibile.",
      source: data.fonte || ""
    });
    showAurumMemoryConsent(detectAurumMemoryCandidate(question));
  } catch (error) {
    state.aurumMessages.push({
      role: "assistant",
      content: normativeQuestion
        ? buildAurumNormativeAnswer(question)
        : error.message || "Aurum non riesce a contattare l'Assistente IA in questo momento."
    });
  } finally {
    state.aurumSending = false;
    if (aurumAskButton) aurumAskButton.disabled = false;
    renderAurumMessages();
  }
}

function renderKnowledgeStatus() {
  if (!knowledgeStatus) return;
  if (!isFounder()) {
    knowledgeStatus.innerHTML = "";
    return;
  }
  const status = state.aiStatus;
  const statusMarkup = status ? `
    <article class="knowledge-row">
      <strong>Stato AI</strong>
      <span>OpenAI: ${status.openai ? "attivo" : "non configurato"}</span>
      <span>Ricerca: ${status.pgvector ? "pgvector attivo" : "fallback full-text attivo"}</span>
      <span>${status.fallback_full_text ? "Full-text PostgreSQL: attivo" : `Embeddings: ${status.embeddings ? "presenti" : "non presenti"}`}</span>
      <span>${status.knowledge_base_loaded ? "Libro indicizzato correttamente" : "Libro non ancora indicizzato"}</span>
      <span>${escapeHtml(status.pgvector_message || "")}</span>
    </article>
  ` : "";
  if (!state.aiBooks.length) {
    knowledgeStatus.innerHTML = `${statusMarkup}<div class="empty-state">Nessun libro indicizzato.</div>`;
    return;
  }
  state.aiBooks.sort((first, second) => new Date(second.created_at) - new Date(first.created_at));
  knowledgeStatus.innerHTML = statusMarkup + state.aiBooks.map((book) => `
    <article class="knowledge-row">
      <strong>${escapeHtml(book.titolo || "La bilancia d'oro")}</strong>
      <span>${escapeHtml(book.autore || "Christian Dinato")} · ${escapeHtml(book.filename || "file caricato")}</span>
      <span>${Number(book.chunks || 0)} blocchi indicizzati</span>
      <span>Knowledge base pronta</span>
      <span>Ricerca fallback attiva</span>
      <button class="danger-button" type="button" data-delete-book="${escapeHtml(String(book.id))}">Elimina libro</button>
    </article>
  `).join("");
}

async function loadKnowledgeStatus() {
  if (!isFounder()) return;
  try {
    const [data, status] = await Promise.all([
      apiRequest("/ai/books/status"),
      apiRequest("/ai/status")
    ]);
    state.aiBooks = data.documents || [];
    state.aiStatus = status;
    renderKnowledgeStatus();
  } catch (error) {
    if (knowledgeStatus) knowledgeStatus.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Knowledge base non caricata.")}</div>`;
  }
}

async function uploadKnowledgeBook(event) {
  event.preventDefault();
  if (!isFounder()) return;
  const file = document.getElementById("knowledgeFile")?.files?.[0];
  if (!file) {
    showToast("Seleziona un file PDF, DOCX o TXT.");
    return;
  }

  try {
    showLoading("Caricamento e indicizzazione libro...");
    const dataUrl = await fileToDataUrl(file);
    const data = await apiRequest("/ai/upload-book", {
      method: "POST",
      body: JSON.stringify({
        titolo: document.getElementById("knowledgeTitle")?.value.trim() || "La bilancia d'oro",
        autore: document.getElementById("knowledgeAuthor")?.value.trim() || "Christian Dinato",
        filename: file.name,
        dataUrl
      }),
      timeoutMs: 180000
    });
    knowledgeForm.reset();
    document.getElementById("knowledgeTitle").value = "La bilancia d'oro";
    document.getElementById("knowledgeAuthor").value = "Christian Dinato";
    await loadKnowledgeStatus();
    showToast(data.message || `Knowledge base pronta: ${Number(data.chunks || 0)} chunk creati.`);
  } catch (error) {
    showToast(error.message || "Libro non indicizzato.");
  } finally {
    hideLoading();
  }
}

async function reindexKnowledgeBase() {
  if (!isFounder()) return;
  try {
    showLoading("Rigenerazione embeddings...");
    const data = await apiRequest("/ai/reindex", {
      method: "POST",
      body: JSON.stringify({}),
      timeoutMs: 180000
    });
    await loadKnowledgeStatus();
    showToast(`Embeddings rigenerati per ${Number(data.chunks || 0)} blocchi.`);
  } catch (error) {
    showToast(error.message || "Rigenerazione non riuscita.");
  } finally {
    hideLoading();
  }
}

async function deleteKnowledgeBook(id) {
  if (!isFounder()) return;
  const confirmed = window.confirm("Vuoi eliminare questo libro dalla Knowledge Base AI?");
  if (!confirmed) return;
  try {
    await apiRequest(`/ai/book/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadKnowledgeStatus();
    showToast("Libro eliminato dalla Knowledge Base.");
  } catch (error) {
    showToast(error.message || "Libro non eliminato.");
  }
}

function knowledgeStatusLabel(status = "") {
  const normalized = String(status || "in revisione").toLowerCase();
  if (normalized === "approvata") return "Approvata";
  if (normalized === "rifiutata") return "Rifiutata";
  return "In revisione";
}

function resetKnowledgeNoteFormValues() {
  if (!knowledgeNoteForm) return;
  knowledgeNoteForm.reset();
  document.getElementById("knowledgeNoteId").value = "";
  document.getElementById("knowledgeNoteAuthor").value = displayUserFullName(state.currentUser || {});
  document.getElementById("knowledgeNoteRole").value = roleLabel(state.currentUser?.ruolo || "");
  const experience = document.getElementById("knowledgeNoteExperience");
  if (experience) experience.value = "";
  const saveButton = document.getElementById("saveKnowledgeNoteButton");
  if (saveButton) {
    saveButton.textContent = "Salva conoscenza";
    saveButton.classList.remove("success-button", "knowledge-save-editing");
    saveButton.classList.add("primary-button");
  }
}

function renderKnowledgeNotes() {
  if (!knowledgeNotesList) return;
  if (!state.knowledgeNotes.length) {
    knowledgeNotesList.innerHTML = '<div class="empty-state">Nessuna conoscenza inserita.</div>';
    return;
  }
  knowledgeNotesList.innerHTML = state.knowledgeNotes.map((note) => `
    <article class="knowledge-note-row">
      <div>
        <strong>${escapeHtml(note.title || "Conoscenza OroActive")}</strong>
        <span>${escapeHtml(note.category || "Procedure operative")} · ${escapeHtml(knowledgeStatusLabel(note.status))}</span>
        <small>${escapeHtml(note.source || "Fonte non indicata")} · ${escapeHtml(note.store_experience || "Esperienza negozio non indicata")} · ${escapeHtml(new Date(note.created_at).toLocaleDateString("it-IT"))}</small>
      </div>
      <p>${escapeHtml(String(note.content || "").slice(0, 220))}${String(note.content || "").length > 220 ? "..." : ""}</p>
      <div class="row-actions">
        ${note.can_edit ? `<button type="button" data-edit-knowledge="${escapeHtml(String(note.id))}">Modifica</button>` : ""}
        ${isFounder() && note.status !== "approvata" ? `<button class="primary-button" type="button" data-approve-knowledge="${escapeHtml(String(note.id))}">Approva</button>` : ""}
        ${note.can_delete ? `<button class="danger-button" type="button" data-delete-knowledge="${escapeHtml(String(note.id))}">Elimina</button>` : ""}
      </div>
    </article>
  `).join("");
}

async function loadKnowledgeNotes() {
  if (!canManageKnowledgeUi()) return;
  try {
    const data = await apiRequest("/ai/knowledge");
    state.knowledgeNotes = data.notes || [];
    renderKnowledgeNotes();
  } catch (error) {
    if (knowledgeNotesList) knowledgeNotesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Conoscenze non caricate.")}</div>`;
  }
}

async function saveKnowledgeNote(event) {
  event.preventDefault();
  if (!canManageKnowledgeUi()) return;
  const id = document.getElementById("knowledgeNoteId")?.value;
  const isEditing = Boolean(id);
  const payload = {
    title: document.getElementById("knowledgeNoteTitle")?.value.trim(),
    category: document.getElementById("knowledgeNoteCategory")?.value,
    source: document.getElementById("knowledgeNoteSource")?.value.trim(),
    store_experience: document.getElementById("knowledgeNoteExperience")?.value.trim(),
    content: document.getElementById("knowledgeNoteContent")?.value.trim(),
    status: isFounder() ? "approvata" : "in revisione"
  };
  if (!payload.title || !payload.content) {
    showToast("Titolo e contenuto sono obbligatori.");
    return;
  }
  try {
    showLoading(isEditing ? "Aggiornamento conoscenza..." : "Salvataggio conoscenza...");
    await apiRequest(id ? `/ai/knowledge/${encodeURIComponent(id)}` : "/ai/knowledge", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
      timeoutMs: 60000
    });
    resetKnowledgeNoteFormValues();
    await loadKnowledgeNotes();
    if (isEditing) knowledgeNotesList?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(isEditing
      ? "Conoscenza aggiornata con successo"
      : isFounder()
        ? "Conoscenza approvata e indicizzata."
        : "Conoscenza salvata in revisione.");
  } catch (error) {
    showToast(error.message || "Conoscenza non salvata.");
  } finally {
    hideLoading();
  }
}

function editKnowledgeNote(id) {
  const note = state.knowledgeNotes.find((item) => String(item.id) === String(id));
  if (!note) return;
  document.getElementById("knowledgeNoteId").value = note.id;
  document.getElementById("knowledgeNoteTitle").value = note.title || "";
  document.getElementById("knowledgeNoteCategory").value = note.category || "Procedure operative";
  document.getElementById("knowledgeNoteSource").value = note.source || "";
  const experience = document.getElementById("knowledgeNoteExperience");
  if (experience) experience.value = note.store_experience || "";
  document.getElementById("knowledgeNoteContent").value = note.content || "";
  document.getElementById("knowledgeNoteAuthor").value = displayUserFullName(state.currentUser || {});
  document.getElementById("knowledgeNoteRole").value = roleLabel(state.currentUser?.ruolo || "");
  const saveButton = document.getElementById("saveKnowledgeNoteButton");
  if (saveButton) {
    saveButton.textContent = "Salva modifiche";
    saveButton.classList.remove("primary-button");
    saveButton.classList.add("success-button", "knowledge-save-editing");
  }
  knowledgeNoteForm?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function approveKnowledgeNote(id) {
  if (!isFounder()) return;
  try {
    showLoading("Approvazione e indicizzazione...");
    await apiRequest(`/ai/knowledge/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({}), timeoutMs: 60000 });
    await loadKnowledgeNotes();
    showToast("Conoscenza approvata e indicizzata.");
  } catch (error) {
    showToast(error.message || "Conoscenza non approvata.");
  } finally {
    hideLoading();
  }
}

async function rejectKnowledgeNote(id) {
  if (!isFounder()) return;
  try {
    await apiRequest(`/ai/knowledge/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({}) });
    await loadKnowledgeNotes();
    showToast("Conoscenza rifiutata.");
  } catch (error) {
    showToast(error.message || "Conoscenza non aggiornata.");
  }
}

async function deleteKnowledgeNote(id) {
  const confirmed = window.confirm("Vuoi eliminare questa conoscenza OroActive?");
  if (!confirmed) return;
  try {
    await apiRequest(`/ai/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadKnowledgeNotes();
    showToast("Conoscenza eliminata.");
  } catch (error) {
    showToast(error.message || "Conoscenza non eliminata.");
  }
}

function renderAiFeedback() {
  if (!aiFeedbackList) return;
  if (!isFounder()) {
    aiFeedbackList.innerHTML = "";
    return;
  }
  if (!state.aiFeedback.length) {
    aiFeedbackList.innerHTML = '<div class="empty-state">Nessun feedback AI registrato.</div>';
    return;
  }
  aiFeedbackList.innerHTML = state.aiFeedback.map((item) => `
    <article class="knowledge-note-row">
      <div>
        <strong>${escapeHtml(item.feedback_type || "feedback")}</strong>
        <span>${escapeHtml(new Date(item.created_at).toLocaleString("it-IT"))}</span>
      </div>
      <p><b>Domanda:</b> ${escapeHtml(String(item.question || "").slice(0, 180))}</p>
      <p><b>Commento:</b> ${escapeHtml(item.comment || "Nessun commento")}</p>
      <div class="row-actions">
        <button class="primary-button" type="button" data-feedback-to-knowledge="${escapeHtml(String(item.id))}">Trasforma in conoscenza approvata</button>
        <button class="danger-button" type="button" data-delete-ai-feedback="${escapeHtml(String(item.id))}">Elimina feedback</button>
      </div>
    </article>
  `).join("");
}

async function loadAiFeedback() {
  if (!isFounder()) return;
  try {
    const data = await apiRequest("/ai/feedback");
    state.aiFeedback = data.feedback || [];
    renderAiFeedback();
  } catch (error) {
    if (aiFeedbackList) aiFeedbackList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Feedback non caricato.")}</div>`;
  }
}

async function sendAssistantFeedback(messageIndex, type) {
  const message = state.assistantMessages[Number(messageIndex)];
  if (!message || message.role !== "assistant") return;
  let comment = "";
  if (type === "errore" || type === "miglioramento") {
    comment = window.prompt(type === "errore" ? "Descrivi l'errore rilevato" : "Scrivi il miglioramento suggerito") || "";
    if (!comment.trim()) return;
  }
  try {
    await apiRequest("/ai/feedback", {
      method: "POST",
      body: JSON.stringify({
        question: message.question || "",
        answer: message.content || "",
        feedback_type: type,
        comment
      })
    });
    recordAurumInteractionMemory("user_feedback", comment || `Feedback ${type}`, `Domanda: ${message.question || ""}`);
    showToast("Feedback salvato. Grazie.");
  } catch (error) {
    showToast(error.message || "Feedback non salvato.");
  }
}

async function feedbackToKnowledge(id) {
  if (!isFounder()) return;
  try {
    await apiRequest(`/ai/feedback/${encodeURIComponent(id)}/to-knowledge`, {
      method: "POST",
      body: JSON.stringify({})
    });
    await Promise.all([loadKnowledgeNotes(), loadAiFeedback()]);
    showToast("Feedback trasformato in conoscenza approvata.");
  } catch (error) {
    showToast(error.message || "Feedback non trasformato.");
  }
}

async function deleteAiFeedback(id) {
  if (!isFounder()) return;
  const confirmed = window.confirm("Vuoi eliminare questo feedback dell'assistente?");
  if (!confirmed) return;
  try {
    await apiRequest(`/ai/feedback/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadAiFeedback();
    showToast("Feedback eliminato.");
  } catch (error) {
    showToast(error.message || "Feedback non eliminato.");
  }
}

function metricCard(label, value) {
  return `<article class="dashboard-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></article>`;
}

function renderDashboard() {
  if (!dashboardGrid || !dashboardPanels) return;
  const data = state.dashboard || {};
  const kpi = data.kpi || {};
  const shield = data.aurum_shield || {};
  const audit = data.audit_summary || {};
  const approvals = data.approval_summary || {};
  const suspended = data.suspended_practices || {};
  const storeHealth = data.store_health || {};
  dashboardGrid.innerHTML = [
    metricCard("Totale oro oggi", `${Number(kpi.grammi_giornalieri?.Oro || 0).toFixed(2)} gr`),
    metricCard("Totale argento oggi", `${Number(kpi.grammi_giornalieri?.Argento || 0).toFixed(2)} gr`),
    metricCard("Totale platino oggi", `${Number(kpi.grammi_giornalieri?.Platino || 0).toFixed(2)} gr`),
    metricCard("Contanti erogati", formatEuro(kpi.contanti_erogati || 0)),
    metricCard("Bonifici", formatEuro(kpi.bonifici || 0)),
    metricCard("Utile giornaliero stimato", formatEuro(kpi.utile_giornaliero || 0)),
    metricCard("Utile settimanale stimato", formatEuro(kpi.utile_settimanale || 0)),
    metricCard("Utile mensile stimato", formatEuro(kpi.utile_mensile || 0)),
    metricCard("Fatturato giornaliero", formatEuro(kpi.fatturato_giornaliero || 0)),
    metricCard("Fatturato mensile", formatEuro(kpi.fatturato_mensile || 0)),
    metricCard("Atti giornalieri", kpi.numero_atti_giornalieri || 0),
    metricCard("Atti mensili", kpi.numero_atti_mensili || 0),
    metricCard("Media margine", kpi.media_margine ? `${Number(kpi.media_margine).toFixed(2)}%` : "Dato non disponibile"),
    metricCard("Shield alto rischio oggi", shield.high_today || 0),
    metricCard("Shield critici", shield.critical_open || 0),
    metricCard("Shield score medio", `${Number(shield.average_score || 0)}/100`),
    metricCard("Autorizzazioni in attesa", approvals.pending || 0),
    metricCard("Richieste rischiose", approvals.risky_pending || 0),
    metricCard("Pratiche sospese", suspended.total || 0),
    metricCard("Sospese oggi", suspended.today || 0),
    metricCard("Health Score rete", `${Number(storeHealth.average_score || 0)}/100`),
    metricCard("Negozi critici", (storeHealth.stores || []).filter((store) => store.status === "critico").length),
    metricCard("Login oggi", audit.logins_today || 0),
    metricCard("Azioni critiche oggi", Number(audit.acts_deleted_today || 0) + Number(audit.shield_alerts_today || 0)),
    metricCard("Oro mensile", `${Number(kpi.grammi_mensili?.Oro || 0).toFixed(2)} gr`),
    metricCard("Argento mensile", `${Number(kpi.grammi_mensili?.Argento || 0).toFixed(2)} gr`),
    metricCard("Platino mensile", `${Number(kpi.grammi_mensili?.Platino || 0).toFixed(2)} gr`)
  ].join("");
  renderFounderMenuKpis();
  const ranking = (rows = [], labelKey = "negozio") => rows.slice(0, 8).map((row, index) => `
    <div class="dashboard-rank-row">
      <span>${index + 1}. ${escapeHtml(row[labelKey] || "Dato non inserito")}</span>
      <strong>${escapeHtml(formatEuro(row.fatturato || 0))}</strong>
      <em>${Number(row.grammi || 0).toFixed(2)} gr · ${Number(row.atti || 0)} atti</em>
    </div>
  `).join("") || '<div class="empty-state">Nessun dato disponibile.</div>';
  dashboardPanels.innerHTML = `
    <section class="dashboard-panel"><h3>Ranking negozi</h3>${ranking(data.ranking_negozi, "negozio")}</section>
    <section class="dashboard-panel"><h3>Ranking operatori</h3>${ranking(data.ranking_operatori, "operatore")}</section>
    <section class="dashboard-panel"><h3>Alert operativi</h3>${(data.alerts || []).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong><em>${escapeHtml(item.detail || "")}</em></div>`).join("") || '<div class="empty-state">Nessun alert operativo.</div>'}</section>
    <section class="dashboard-panel"><h3>Aurum Shield</h3>
      <div class="dashboard-rank-row"><span>Alert aperti</span><strong>${escapeHtml(String(shield.open_alerts || 0))}</strong><em>Pratiche da verificare</em></div>
      <div class="dashboard-rank-row"><span>Negozio con piu alert</span><strong>${escapeHtml(shield.top_store?.store || "Nessun dato")}</strong><em>${escapeHtml(String(shield.top_store?.alerts || 0))} alert</em></div>
      <div class="dashboard-rank-row"><span>Operatore con piu alert</span><strong>${escapeHtml(shield.top_operator?.operator || "Nessun dato")}</strong><em>${escapeHtml(String(shield.top_operator?.alerts || 0))} alert</em></div>
    </section>
    <section class="dashboard-panel"><h3>Richieste autorizzazione</h3>
      <div class="dashboard-rank-row"><span>In attesa</span><strong>${escapeHtml(String(approvals.pending || 0))}</strong><em>Da approvare o rifiutare</em></div>
      <div class="dashboard-rank-row"><span>Rischiose</span><strong>${escapeHtml(String(approvals.risky_pending || 0))}</strong><em>Alto/critico o score sopra soglia</em></div>
      ${(approvals.latest || []).slice(0, 5).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.practiceNumber || "Atto")}</span><strong>${escapeHtml(item.statusLabel || approvalStatusMeta(item.status).label)}</strong><em>${escapeHtml(item.requestedByName || "Utente")} · ${escapeHtml(String(item.risk_score || 0))}/100</em></div>`).join("") || '<div class="empty-state">Nessuna richiesta in attesa.</div>'}
    </section>
    <section class="dashboard-panel"><h3>Pratiche sospese</h3>
      <div class="dashboard-rank-row"><span>Totale visibili</span><strong>${escapeHtml(String(suspended.total || 0))}</strong><em>Non contate come completate</em></div>
      <div class="dashboard-rank-row"><span>Sospese oggi</span><strong>${escapeHtml(String(suspended.today || 0))}</strong><em>Da correggere</em></div>
      ${(suspended.latest || []).slice(0, 5).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.practiceNumber || item.numero_atto || "Atto")}</span><strong>${escapeHtml(String(item.risk_score || 0))}/100</strong><em>${escapeHtml((item.motivi || [])[0] || "Motivo da verificare")}</em></div>`).join("") || '<div class="empty-state">Nessuna pratica sospesa.</div>'}
    </section>
    <section class="dashboard-panel"><h3>Salute Negozi</h3>
      <div class="dashboard-rank-row"><span>Score medio rete</span><strong>${escapeHtml(String(storeHealth.average_score || 0))}/100</strong><em>Ultimi 7 giorni</em></div>
      <div class="dashboard-rank-row"><span>Miglior negozio</span><strong>${escapeHtml(storeHealth.best_store?.store_name || "Nessun dato")}</strong><em>${escapeHtml(String(storeHealth.best_store?.score || 0))}/100 · ${escapeHtml(storeHealth.best_store?.status || "")}</em></div>
      <div class="dashboard-rank-row"><span>Negozio più critico</span><strong>${escapeHtml(storeHealth.critical_store?.store_name || "Nessun dato")}</strong><em>${escapeHtml(String(storeHealth.critical_store?.score || 0))}/100 · ${escapeHtml(storeHealth.critical_store?.status || "")}</em></div>
      <div class="dashboard-rank-row"><span>Alert salute</span><strong>${escapeHtml(String(storeHealth.alert_count || 0))}</strong><em>Pratiche, rischio, qualità, backup</em></div>
      <button class="ghost-button small-button" type="button" data-open-store-health>Apri Salute Negozio</button>
    </section>
    <section class="dashboard-panel"><h3>Oggi nell'app</h3>
      <div class="dashboard-rank-row"><span>Atti creati</span><strong>${escapeHtml(String(audit.acts_created_today || 0))}</strong><em>Da Audit Trail</em></div>
      <div class="dashboard-rank-row"><span>Atti modificati</span><strong>${escapeHtml(String(audit.acts_updated_today || 0))}</strong><em>Da Audit Trail</em></div>
      <div class="dashboard-rank-row"><span>Atti eliminati</span><strong>${escapeHtml(String(audit.acts_deleted_today || 0))}</strong><em>Azioni critiche</em></div>
      <div class="dashboard-rank-row"><span>Stampe copia cliente</span><strong>${escapeHtml(String(audit.customer_prints_today || 0))}</strong><em>PDF cliente</em></div>
      ${(audit.top_users || []).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.user_name || "Utente")}</span><strong>${escapeHtml(String(item.total || 0))}</strong><em>${escapeHtml(roleLabel(item.user_role || ""))}</em></div>`).join("") || '<div class="empty-state">Nessuna attività rilevante oggi.</div>'}
      ${(audit.latest || []).slice(0, 5).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(formatDateTime(item.created_at))}</span><strong>${escapeHtml(item.label || auditActionLabel(item.action))}</strong><em>${escapeHtml(item.userName || item.actor || "")}</em></div>`).join("")}
    </section>
    <section class="dashboard-panel"><h3>OroActive Intelligence</h3>${(data.insights || []).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.title)}</span><strong>${escapeHtml(item.level || "info")}</strong><em>${escapeHtml(item.text)}</em></div>`).join("") || '<div class="empty-state">Nessun insight disponibile.</div>'}</section>
    <section class="dashboard-panel"><h3>Fusioni</h3>${Object.entries(data.fusioni || {}).map(([key, value]) => `<div class="dashboard-rank-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("") || '<div class="empty-state">Nessuna fusione registrata.</div>'}</section>
    <section class="dashboard-panel"><h3>Carature frequenti</h3>${(data.carature_frequenti || []).map((item) => `<div class="dashboard-rank-row"><span>${escapeHtml(item.titolo)}</span><strong>${item.count}</strong></div>`).join("") || '<div class="empty-state">Nessun dato disponibile.</div>'}</section>
    <section class="dashboard-panel"><h3>Pagamenti</h3>${Object.entries(data.pagamenti || {}).map(([key, value]) => `<div class="dashboard-rank-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(formatEuro(value))}</strong></div>`).join("") || '<div class="empty-state">Nessun dato disponibile.</div>'}</section>
  `;
}

async function loadDashboard() {
  try {
    state.dashboard = await apiRequest("/dashboard");
    renderDashboard();
  } catch (error) {
    if (dashboardGrid) dashboardGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Dashboard non caricata.")}</div>`;
  }
}

function storeHealthStatusClass(status = "") {
  const normalized = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (normalized.includes("ottimo")) return "store-health-ottimo";
  if (normalized.includes("buono")) return "store-health-buono";
  if (normalized.includes("controll")) return "store-health-da-controllare";
  return "store-health-critico";
}

function storeHealthPeriodParams() {
  const period = storeHealthPeriod?.value || "last_7";
  const params = { period };
  const dateFrom = storeHealthDateFrom?.value || "";
  const dateTo = storeHealthDateTo?.value || "";
  if (period === "custom" || dateFrom || dateTo) {
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
  }
  return params;
}

function updateStoreHealthDateInputs() {
  const custom = storeHealthPeriod?.value === "custom";
  [storeHealthDateFrom, storeHealthDateTo].forEach((input) => {
    if (!input) return;
    input.disabled = !custom;
    input.closest("label")?.classList.toggle("muted-control", !custom);
  });
}

function storeHealthTrendText(trend) {
  if (trend === null || trend === undefined || Number.isNaN(Number(trend))) return "Trend non disponibile";
  const value = Number(trend);
  if (value === 0) return "Trend stabile";
  return `${value > 0 ? "+" : ""}${value} rispetto al periodo precedente`;
}

function storeHealthReadableValue(value) {
  if (value === null || value === undefined || value === "") return "Dato non disponibile";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Nessun dato";
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "");
    return entries.length
      ? entries.map(([key, item]) => `${key}: ${storeHealthReadableValue(item)}`).join(" · ")
      : "Nessun dato";
  }
  return String(value);
}

function storeHealthRowsFromObject(data = {}, labels = {}) {
  const entries = Object.entries(data || {});
  if (!entries.length) return '<div class="empty-state">Nessun dato disponibile.</div>';
  return entries.map(([key, value]) => founderReportRow(labels[key] || key.replace(/_/g, " "), storeHealthReadableValue(value))).join("");
}

function storeHealthArrayRows(rows = [], emptyText = "Nessun dato disponibile.") {
  if (!rows.length) return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  return rows.map((row) => founderReportRow(
    row.label || row.title || row.message || "Voce",
    row.points !== undefined ? `${row.count !== undefined ? "-" : "+"}${row.points}` : row.score || row.value || "",
    row.count !== undefined ? `${row.count} occorrenze` : row.detail || row.description || ""
  )).join("");
}

function renderStoreHealth() {
  if (!storeHealthSummary || !storeHealthList) return;
  const stores = state.storeHealth || [];
  const average = stores.length ? Math.round(stores.reduce((sum, store) => sum + Number(store.score || 0), 0) / stores.length) : 0;
  const excellent = stores.filter((store) => store.status === "ottimo").length;
  const warning = stores.filter((store) => ["da_controllare", "critico"].includes(store.status)).length;
  const critical = stores.filter((store) => store.status === "critico").length;
  const alerts = stores.reduce((sum, store) => sum + (store.main_alerts || []).length, 0);
  storeHealthSummary.innerHTML = [
    metricCard("Health Score medio rete", `${average}/100`),
    metricCard("Negozi ottimi", excellent),
    metricCard("Negozi da controllare", warning),
    metricCard("Negozi critici", critical),
    metricCard("Alert aperti", alerts)
  ].join("");

  if (!stores.length) {
    storeHealthList.innerHTML = '<div class="empty-state">Nessuno score disponibile per il periodo selezionato.</div>';
    return;
  }
  storeHealthList.innerHTML = stores.map((store) => {
    const factors = store.factors || {};
    const operational = factors.operational || {};
    const risk = factors.risk || {};
    const academy = factors.academy || {};
    const backup = factors.backup || {};
    const statusClass = storeHealthStatusClass(store.status);
    return `
      <article class="store-health-card ${statusClass}">
        <div class="store-health-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(store.store_code || "Negozio")}</p>
            <h3>${escapeHtml(store.store_name || "Negozio")}</h3>
            <span class="store-health-trend">${escapeHtml(storeHealthTrendText(store.trend))}</span>
          </div>
          <div class="store-health-score" aria-label="Health Score ${escapeHtml(store.store_name || "")}">
            <strong>${escapeHtml(String(store.score || 0))}</strong>
            <span>/100</span>
            <em>${escapeHtml(store.status_label || store.status || "Stato")}</em>
          </div>
        </div>
        <div class="store-health-kpis">
          <span><strong>${escapeHtml(String(operational.completed_acts || 0))}</strong> atti completati</span>
          <span><strong>${escapeHtml(String(operational.suspended_open || 0))}</strong> sospese</span>
          <span><strong>${escapeHtml(String(risk.critical_alerts || 0))}</strong> alert critici</span>
          <span><strong>${escapeHtml(String(Number(academy.average_progress || 0).toFixed(1)))}%</strong> Academy</span>
          <span><strong>${escapeHtml(backup.latest_verified ? "OK" : "Da verificare")}</strong> backup</span>
        </div>
        <div class="store-health-alerts">
          ${(store.main_alerts || []).map((item) => `<mark>${escapeHtml(item)}</mark>`).join("") || "<span>Nessun alert principale.</span>"}
        </div>
        <div class="store-health-recommendations">
          ${(store.recommendations || []).slice(0, 3).map((item) => `<p>${escapeHtml(item)}</p>`).join("") || "<p>Mantenere il monitoraggio operativo.</p>"}
        </div>
        <button class="ghost-button small-button" type="button" data-store-health-detail="${escapeHtml(String(store.store_id || ""))}">Dettaglio</button>
      </article>
    `;
  }).join("");
}

async function loadStoreHealth() {
  if (!canViewControlSectionsUi()) return;
  updateStoreHealthDateInputs();
  if (storeHealthList) storeHealthList.innerHTML = '<div class="empty-state">Calcolo Salute Negozio...</div>';
  const params = storeHealthPeriodParams();
  const query = queryString(params);
  const data = await apiRequest(`/store-health${query ? `?${query}` : ""}`, { timeoutMs: 45000 });
  state.storeHealth = data.stores || [];
  state.storeHealthDateRange = data.date_range || null;
  renderStoreHealth();
}

async function recalculateStoreHealth() {
  if (!canViewControlSectionsUi()) return;
  updateStoreHealthDateInputs();
  const body = storeHealthPeriodParams();
  const data = await apiRequest("/store-health/calculate", {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs: 60000
  });
  state.storeHealth = data.stores || [];
  renderStoreHealth();
  showToast(data.message || "Store Health Score ricalcolato.", "success");
}

async function openStoreHealthDetail(storeId) {
  if (!storeId || !previewModal || !previewBody || !previewTitle) return;
  const params = storeHealthPeriodParams();
  const query = queryString(params);
  const [detailResponse, historyResponse] = await Promise.all([
    apiRequest(`/store-health/${encodeURIComponent(storeId)}${query ? `?${query}` : ""}`, { timeoutMs: 45000 }),
    apiRequest(`/store-health/${encodeURIComponent(storeId)}/history?limit=12`, { timeoutMs: 45000 }).catch(() => ({ history: [] }))
  ]);
  const store = detailResponse.store || null;
  if (!store) return;
  state.storeHealthDetail = store;
  const factors = store.factors || {};
  const historyRows = (historyResponse.history || []).map((row) => founderReportRow(
    `${row.date_from || ""} / ${row.date_to || ""}`,
    `${row.score || 0}/100`,
    row.status_label || row.status || ""
  )).join("") || '<div class="empty-state">Storico non ancora disponibile.</div>';
  previewTitle.textContent = `Salute Negozio · ${store.store_name || "Dettaglio"}`;
  previewBody.innerHTML = `
    <div class="store-health-detail ${storeHealthStatusClass(store.status)}">
      <div class="store-health-detail-hero">
        <div>
          <p class="eyebrow">${escapeHtml(store.store_code || "Negozio")}</p>
          <h3>${escapeHtml(store.store_name || "Negozio")}</h3>
          <p>${escapeHtml(storeHealthTrendText(store.trend))}</p>
        </div>
        <div class="store-health-score">
          <strong>${escapeHtml(String(store.score || 0))}</strong>
          <span>/100</span>
          <em>${escapeHtml(store.status_label || store.status || "Stato")}</em>
        </div>
      </div>
      <section class="dashboard-panel"><h3>Raccomandazioni operative</h3>
        ${(store.recommendations || []).map((item) => founderReportRow("Azione", item)).join("") || '<div class="empty-state">Nessuna raccomandazione.</div>'}
      </section>
      <section class="dashboard-panel"><h3>Penalità applicate</h3>${storeHealthArrayRows(store.penalties || [], "Nessuna penalità applicata.")}</section>
      <section class="dashboard-panel"><h3>Bonus applicati</h3>${storeHealthArrayRows(store.bonuses || [], "Nessun bonus applicato.")}</section>
      <section class="dashboard-panel"><h3>KPI atti</h3>${storeHealthRowsFromObject(factors.operational || {}, {
        completed_acts: "Atti completati",
        suspended_open: "Pratiche sospese",
        pending_approvals: "Autorizzazioni in attesa",
        deleted_acts: "Atti eliminati",
        average_completion_hours: "Tempo medio completamento",
        suspended_over_48h: "Sospese oltre 48h"
      })}</section>
      <section class="dashboard-panel"><h3>Rischio e qualità</h3>
        ${storeHealthRowsFromObject({ ...(factors.risk || {}), ...(factors.quality || {}) }, {
          average_shield_score: "Score Shield medio",
          high_alerts: "Alert alto rischio",
          critical_alerts: "Alert critici",
          failed_checks: "Controlli falliti",
          warning_checks: "Controlli con attenzione",
          expired_documents: "Documenti scaduti",
          missing_receipts: "Contabili mancanti"
        })}
      </section>
      <section class="dashboard-panel"><h3>Commerciale e pagamenti</h3>
        ${storeHealthRowsFromObject({ ...(factors.commercial || {}), ...(factors.payments || {}) }, {
          gold_grams: "Oro acquistato",
          silver_grams: "Argento acquistato",
          platinum_grams: "Platino acquistato",
          estimated_profit: "Utile stimato",
          average_margin: "Margine medio",
          customers: "Clienti",
          recurring_customers: "Clienti ricorrenti",
          payment_volume: "Volume pagamenti",
          cash: "Contanti",
          bank_transfers: "Bonifici",
          checks: "Assegni",
          suspicious_payments: "Pagamenti sospetti"
        })}
      </section>
      <section class="dashboard-panel"><h3>Giacenza, fusioni e Academy</h3>
        ${storeHealthRowsFromObject({ ...(factors.stock_and_fusion || {}), ...(factors.academy || {}) }, {
          stock_by_metal: "Giacenza per metallo",
          fusion_lots_open: "Fusioni aperte",
          fusion_lots_completed: "Fusioni concluse",
          fusion_lots_late: "Lotti in ritardo",
          average_progress: "Formazione media",
          operators_below_60: "Operatori sotto 60%",
          certificates: "Certificazioni",
          badges: "Badge"
        })}
      </section>
      <section class="dashboard-panel"><h3>Operatori, backup e sicurezza</h3>
        ${storeHealthRowsFromObject({ ...(factors.operators || {}), ...(factors.backup || {}), ...(factors.security || {}) }, {
          active_operators: "Operatori attivi",
          logins: "Login",
          total_activity: "Attività totale",
          too_many_errors: "Errori operativi",
          too_many_updates: "Modifiche atti",
          latest_backup_code: "Ultimo backup",
          latest_status: "Stato backup",
          latest_verified: "Backup verificato",
          failed_recently: "Backup fallito recente",
          audit_critical: "Audit critici",
          unauthorized_attempts: "Tentativi non autorizzati"
        })}
      </section>
      <section class="dashboard-panel"><h3>Storico score</h3>${historyRows}</section>
    </div>
  `;
  previewModal.hidden = false;
}

function todayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function selectedFounderReportDate() {
  return founderReportDate?.value || todayDateInputValue();
}

function formatGrams(value = 0) {
  return `${Number(value || 0).toFixed(2)} gr`;
}

function founderReportRow(label, value, detail = "") {
  return `
    <div class="dashboard-rank-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value ?? 0))}</strong>
      ${detail ? `<em>${escapeHtml(detail)}</em>` : ""}
    </div>
  `;
}

function renderFounderReportHistory() {
  if (!founderReportHistory) return;
  if (!state.founderReports.length) {
    founderReportHistory.innerHTML = '<div class="empty-state">Nessun report precedente.</div>';
    return;
  }
  founderReportHistory.innerHTML = state.founderReports.slice(0, 12).map((report) => `
    <button class="founder-report-history-item" type="button" data-founder-report-date="${escapeHtml(report.report_date || "")}">
      <strong>${escapeHtml(report.report_date || "Data non disponibile")}</strong>
      <span>${escapeHtml(report.status || "generated")} · ${escapeHtml(String(report.summary?.acts_completed_today || 0))} atti completati</span>
    </button>
  `).join("");
}

function renderFounderDailyReport() {
  const report = state.founderReport;
  if (!founderReportCards || !founderReportBody || !founderReportStatus) return;
  if (!report) {
    founderReportStatus.textContent = "Report non generato per la data selezionata.";
    founderReportCards.innerHTML = "";
    founderReportBody.innerHTML = '<div class="empty-state">Genera il report o scegli una data già disponibile.</div>';
    return;
  }
  const summary = report.summary || {};
  const risks = report.risks_data || {};
  const backup = report.backup_data || {};
  const storeHealthData = report.store_health_data || {};
  const payments = summary.payments || {};
  const metals = summary.metals?.totals || {};
  founderReportStatus.textContent = `Report ${report.report_date} · stato ${report.status || "generated"} · aggiornato ${formatDateTime(report.updated_at)}`;
  founderReportCards.innerHTML = [
    metricCard("Atti completati", summary.acts_completed_today || 0),
    metricCard("Pratiche sospese", report.suspended_data?.current_total || summary.suspended_total || 0),
    metricCard("Alert Shield critici", risks.critical_count || 0),
    metricCard("Contanti erogati", formatEuro(payments.contanti_amount || 0)),
    metricCard("Oro acquistato", formatGrams(metals.Oro || 0)),
    metricCard("Health Score medio", `${Number(storeHealthData.average_score || 0)}/100`),
    metricCard("Backup status", backup.failed_today ? "Da verificare" : "Regolare")
  ].join("");

  const storeRows = (report.stores_data || []).slice(0, 10).map((store) => founderReportRow(
    store.negozio || "Negozio",
    `${store.atti_completati || 0} atti`,
    `${formatGrams(store.oro_acquistato || 0)} oro · ${store.atti_sospesi || 0} sospese · ${store.aurum_shield_alerts || 0} alert`
  )).join("") || '<div class="empty-state">Nessun dato negozio.</div>';
  const operatorRows = (report.operators_data || []).slice(0, 10).map((operator) => founderReportRow(
    operator.user_name || "Utente",
    operator.total_activity || 0,
    `${roleLabel(operator.user_role || "")} · ${operator.acts_created || 0} creati · ${operator.acts_completed || 0} completati · ${operator.relevant_alerts || 0} alert`
  )).join("") || '<div class="empty-state">Nessuna attività operatore.</div>';
  const suspendedRows = (report.suspended_data?.open_practices || []).slice(0, 8).map((practice) => founderReportRow(
    practice.practice_number || "Pratica sospesa",
    `${practice.risk_score || 0}/100`,
    `${practice.negozio || "Negozio"} · ${(practice.motivi || [])[0]?.message || (practice.motivi || [])[0] || "Motivo da verificare"}`
  )).join("") || '<div class="empty-state">Nessuna pratica sospesa aperta.</div>';
  const riskRows = [
    founderReportRow("Rischio basso", risks.low_count || 0),
    founderReportRow("Rischio medio", risks.medium_count || 0),
    founderReportRow("Rischio alto", risks.high_count || 0),
    founderReportRow("Rischio critico", risks.critical_count || 0)
  ].join("") + ((risks.recurring_reasons || []).slice(0, 5).map((item) => founderReportRow(item.reason, item.total, "Motivo ricorrente")).join("") || "");
  const qualityRows = [
    founderReportRow("Qualità superata", report.quality_data?.passed_today || 0),
    founderReportRow("Qualità con attenzione", report.quality_data?.warning_today || 0),
    founderReportRow("Qualità non superata", report.quality_data?.failed_today || 0)
  ].join("") + ((report.quality_data?.recurring_missing_data || []).slice(0, 5).map((item) => founderReportRow(item.reason, item.total, "Dato mancante ricorrente")).join("") || "");
  const approvalRows = [
    founderReportRow("Richieste create", report.approvals_data?.created_today || 0),
    founderReportRow("Approvate", report.approvals_data?.approved_today || 0),
    founderReportRow("Rifiutate", report.approvals_data?.rejected_today || 0),
    founderReportRow("Pendenti", report.approvals_data?.pending || 0),
    founderReportRow("Tempo medio", `${Number(report.approvals_data?.average_approval_minutes || 0).toFixed(1)} min`)
  ].join("");
  const auditRows = [
    founderReportRow("Azioni registrate", report.audit_data?.actions_today || 0),
    founderReportRow("Atti eliminati", report.audit_data?.deleted_acts || 0),
    founderReportRow("Utenti modificati", report.audit_data?.updated_users || 0),
    founderReportRow("Download backup", report.audit_data?.backup_downloads || 0),
    founderReportRow("Cambio ruoli", report.audit_data?.role_changes || 0)
  ].join("") + ((report.audit_data?.latest_critical_events || []).slice(0, 5).map((item) => founderReportRow(
    item.label || auditActionLabel(item.action),
    formatDateTime(item.created_at),
    item.userName || item.actor || ""
  )).join("") || "");
  const backupRows = [
    founderReportRow("Backup creati", backup.created_today || 0),
    founderReportRow("Backup verificati", backup.verified_today || 0),
    founderReportRow("Backup falliti", backup.failed_today || 0),
    founderReportRow("Ultimo backup", backup.latest_backup?.backup_code || "Dato non disponibile", backup.latest_backup?.status || ""),
    founderReportRow("Ultimo test restore", backup.latest_restore_test_status || "not_tested")
  ].join("");
  const academyRows = [
    founderReportRow("Corsi completati", report.academy_data?.courses_completed_today || 0),
    founderReportRow("Certificazioni", report.academy_data?.certificates_issued_today || 0),
    founderReportRow("Badge", report.academy_data?.badges_assigned_today || 0),
    founderReportRow("Corsi in sospeso", report.academy_data?.pending_courses || 0),
    founderReportRow("Progresso medio", `${Number(report.academy_data?.average_progress || 0).toFixed(1)}%`)
  ].join("");
  const aiRows = [
    founderReportRow("Domande ad Aurum", report.ai_data?.aurum_questions_today || 0),
    founderReportRow("Richieste supporto", report.ai_data?.support_requests_today || 0)
  ].join("");
  const storeHealthRows = (storeHealthData.stores || []).slice(0, 8).map((store) => founderReportRow(
    store.store_name || "Negozio",
    `${store.score || 0}/100`,
    `${store.status_label || store.status || "Stato"} · ${store.trend === null || store.trend === undefined ? "trend n/d" : `${store.trend > 0 ? "+" : ""}${store.trend}`}`
  )).join("") || '<div class="empty-state">Nessuno score negozio disponibile.</div>';
  const actionRows = (report.actions_recommended || []).map((item, index) => founderReportRow(`Azione ${index + 1}`, item)).join("") || '<div class="empty-state">Nessuna azione consigliata.</div>';

  founderReportBody.innerHTML = `
    <section class="dashboard-panel"><h3>Riepilogo generale</h3>
      ${founderReportRow("Atti creati oggi", summary.acts_created_today || 0)}
      ${founderReportRow("Atti completati oggi", summary.acts_completed_today || 0)}
      ${founderReportRow("Atti archiviati oggi", summary.acts_archived_today || 0)}
      ${founderReportRow("Atti eliminati oggi", summary.acts_deleted_today || 0)}
      ${founderReportRow("Fusioni create oggi", summary.fusions_today || 0)}
    </section>
    <section class="dashboard-panel"><h3>Metalli e pagamenti</h3>
      ${founderReportRow("Oro", formatGrams(metals.Oro || 0), `Var. ${formatGrams(summary.metals_variation_vs_previous_day?.Oro || 0)}`)}
      ${founderReportRow("Argento", formatGrams(metals.Argento || 0), `Var. ${formatGrams(summary.metals_variation_vs_previous_day?.Argento || 0)}`)}
      ${founderReportRow("Platino", formatGrams(metals.Platino || 0), `Var. ${formatGrams(summary.metals_variation_vs_previous_day?.Platino || 0)}`)}
      ${founderReportRow("Contanti", formatEuro(payments.contanti_amount || 0), `${payments.contanti_count || 0} pratiche`)}
      ${founderReportRow("Bonifici", formatEuro(payments.bonifico_amount || 0), `${payments.bonifico_count || 0} pratiche`)}
      ${founderReportRow("Contabili mancanti", payments.missing_receipts || 0)}
    </section>
    <section class="dashboard-panel"><h3>Negozi</h3>${storeRows}</section>
    <section class="dashboard-panel"><h3>Salute negozi</h3>
      ${founderReportRow("Score medio rete", `${storeHealthData.average_score || 0}/100`)}
      ${founderReportRow("Miglior negozio", storeHealthData.best_store?.store_name || "Nessun dato", `${storeHealthData.best_store?.score || 0}/100`)}
      ${founderReportRow("Negozio più critico", storeHealthData.critical_store?.store_name || "Nessun dato", `${storeHealthData.critical_store?.score || 0}/100`)}
      ${storeHealthRows}
    </section>
    <section class="dashboard-panel"><h3>Operatori</h3>${operatorRows}</section>
    <section class="dashboard-panel"><h3>Aurum Shield</h3>${riskRows}</section>
    <section class="dashboard-panel"><h3>Controllo Qualità</h3>${qualityRows}</section>
    <section class="dashboard-panel"><h3>Pratiche sospese</h3>${suspendedRows}</section>
    <section class="dashboard-panel"><h3>Autorizzazioni</h3>${approvalRows}</section>
    <section class="dashboard-panel"><h3>Notifiche</h3>
      ${founderReportRow("Notifiche create", report.notifications_data?.created_today || 0)}
      ${founderReportRow("Critiche", report.notifications_data?.critical_today || 0)}
      ${founderReportRow("Non lette", report.notifications_data?.unread_today || 0)}
      ${founderReportRow("Autorizzazioni", report.notifications_data?.approval_notifications || 0)}
      ${founderReportRow("Backup", report.notifications_data?.backup_notifications || 0)}
      ${founderReportRow("Rischio", report.notifications_data?.risk_notifications || 0)}
    </section>
    <section class="dashboard-panel"><h3>Audit Trail</h3>${auditRows}</section>
    <section class="dashboard-panel"><h3>Backup</h3>${backupRows}</section>
    <section class="dashboard-panel"><h3>Academy</h3>${academyRows}</section>
    <section class="dashboard-panel"><h3>AI / Aurum</h3>${aiRows}</section>
    <section class="dashboard-panel"><h3>Azioni consigliate</h3>${actionRows}</section>
  `;
}

async function loadFounderDailyReport(date = selectedFounderReportDate()) {
  if (!isFounder()) return;
  if (founderReportDate && !founderReportDate.value) founderReportDate.value = todayDateInputValue();
  try {
    const history = await apiRequest("/founder-daily-report");
    state.founderReports = history.reports || [];
    renderFounderReportHistory();
  } catch {
    state.founderReports = [];
    renderFounderReportHistory();
  }
  try {
    const data = await apiRequest(`/founder-daily-report/${encodeURIComponent(date)}`);
    state.founderReport = data.report || null;
  } catch (error) {
    if (error.status !== 404) showToast(error.message || "Founder Daily Report non caricato.", "error");
    state.founderReport = null;
  }
  renderFounderDailyReport();
}

async function generateFounderDailyReport() {
  if (!isFounder()) return;
  const date = todayDateInputValue();
  if (founderReportDate) founderReportDate.value = date;
  const data = await apiRequest("/founder-daily-report/generate", {
    method: "POST",
    body: JSON.stringify({ date }),
    timeoutMs: 60000
  });
  state.founderReport = data.report || null;
  await loadFounderDailyReport(date);
  showToast("Founder Daily Report generato.", "success");
}

async function downloadFounderDailyReportPdf() {
  if (!isFounder()) return;
  const date = selectedFounderReportDate();
  const response = await fetch(`${apiBase}/founder-daily-report/${encodeURIComponent(date)}/pdf`, {
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {},
    cache: "no-store"
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(cleanUserMessage(body.error, "PDF Founder Daily Report non disponibile."));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `founder-daily-report-${date}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function sendFounderDailyReport() {
  if (!isFounder()) return;
  const date = selectedFounderReportDate();
  const data = await apiRequest(`/founder-daily-report/${encodeURIComponent(date)}/send`, {
    method: "POST",
    body: JSON.stringify({})
  });
  showToast(data.message || "Invio report non configurato.", data.ok ? "success" : "warning");
}

function auditActionLabel(action = "") {
  return {
    login: "Login",
    logout: "Logout",
    login_failed: "Login fallito",
    session_expired: "Sessione scaduta",
    create_act: "Creazione atto",
    save_draft: "Salvataggio bozza",
    update_act: "Modifica atto",
    complete_act: "Completamento atto",
    archive_act: "Archiviazione atto",
    delete_act: "Eliminazione atto",
    print_customer_copy: "Stampa copia cliente",
    print_company_copy: "Stampa copia aziendale",
    generate_pdf: "Generazione PDF",
    modify_payment: "Modifica pagamento",
    risk_score_calculated: "Risk score calcolato",
    aurum_shield_alert_created: "Alert rischio creato",
    aurum_shield_alert_reviewed: "Alert rischio in verifica",
    aurum_shield_alert_resolved: "Alert rischio risolto",
    quality_check_executed: "Controllo qualità eseguito",
    quality_check_failed: "Controllo qualità fallito",
    create_user: "Creazione utente",
    update_user: "Modifica utente",
    change_user_role: "Cambio ruolo utente",
    change_user_store: "Cambio negozio utente",
    user_deleted: "Eliminazione utente",
    user_deactivated: "Disattivazione utente",
    unauthorized_user_delete_attempt: "Tentativo eliminazione utente non autorizzato",
    unauthorized_user_create_attempt: "Tentativo creazione utente non autorizzato",
    deactivate_user: "Disattivazione utente",
    view_user_activity: "Visualizzazione attività utente",
    update_crm_client: "Modifica cliente CRM",
    add_crm_note: "Nota CRM",
    delete_crm_client: "Archiviazione cliente CRM",
    create_backup: "Creazione backup",
    verify_backup: "Verifica backup",
    download_backup: "Download backup",
    delete_backup: "Eliminazione backup",
    test_restore_backup: "Test restore backup",
    ask_aurum: "Domanda ad Aurum",
    aurum_support_request: "Richiesta supporto Aurum",
    aurum_memory_created: "Memoria Aurum creata",
    aurum_memory_deleted: "Memoria Aurum eliminata",
    approval_requested: "Richiesta autorizzazione",
    approval_approved: "Autorizzazione approvata",
    approval_rejected: "Autorizzazione rifiutata",
    approval_cancelled: "Autorizzazione annullata",
    approval_required_blocked_completion: "Completamento bloccato per autorizzazione",
    approval_unauthorized_attempt: "Tentativo autorizzazione non consentito",
    sale_deed_completed_after_approval: "Atto completato dopo autorizzazione",
    sale_deed_modified_after_approval_request: "Modifica atto dopo richiesta autorizzazione",
    sale_deed_suspended: "Pratica sospesa",
    suspended_practice_reopened: "Pratica sospesa riaperta",
    suspended_practice_resolved: "Controlli pratica sospesa risolti",
    suspended_practice_deleted: "Pratica sospesa eliminata",
    sale_deed_completed_after_suspension: "Atto completato dopo sospensione",
    create_academy_course: "Creazione corso Academy",
    update_academy_course: "Modifica corso Academy",
    delete_academy_course: "Eliminazione corso Academy",
    complete_academy_lesson: "Completamento lezione",
    assign_certificate: "Assegnazione certificazione",
    assign_badge: "Assegnazione badge",
    revoke_badge: "Revoca badge",
    create_fusion_lot: "Creazione lotto fusione",
    founder_daily_report_generated: "Founder Daily Report generato",
    founder_daily_report_downloaded: "Download Founder Daily Report",
    founder_daily_report_sent: "Invio Founder Daily Report",
    founder_daily_report_failed: "Errore Founder Daily Report",
    gold_price_sync: "Sync storico prezzo oro",
    gold_prediction_run: "Analisi di mercato oro",
    gold_prediction_settings_updated: "Impostazioni predizione oro aggiornate",
    store_health_score_calculated: "Store Health Score ricalcolato",
    customer_trust_pack_generated: "Customer Trust Pack generato",
    customer_trust_pack_downloaded: "Download Customer Trust Pack",
    customer_trust_pack_sent_email: "Customer Trust Pack inviato email",
    customer_trust_pack_sent_whatsapp: "Customer Trust Pack WhatsApp preparato",
    customer_trust_pack_regenerated: "Customer Trust Pack rigenerato",
    training_started: "Training operatore avviato",
    training_completed: "Training operatore completato",
    training_passed: "Training operatore superato",
    training_failed: "Training operatore non superato",
    privacy_policy_viewed: "Privacy Policy visualizzata",
    privacy_policy_accepted: "Privacy Policy accettata",
    privacy_policy_version_created: "Versione Privacy Policy creata",
    customer_privacy_notice_viewed: "Informativa privacy cliente visualizzata",
    api_request_error: "Errore API"
  }[action] || action.replace(/_/g, " ") || "Attività";
}

function auditTrailParams(page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (!auditTrailFilters) return params;
  const formData = new FormData(auditTrailFilters);
  for (const [key, value] of formData.entries()) {
    const text = String(value || "").trim();
    if (text) params.set(key, text);
  }
  return params;
}

function auditDataBlock(title, data) {
  if (!data) return "";
  return `
    <section class="audit-detail-block">
      <h4>${escapeHtml(title)}</h4>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </section>
  `;
}

function renderAuditTrail() {
  if (!auditTrailList) return;
  const logs = state.auditLogs || [];
  if (!logs.length) {
    auditTrailList.innerHTML = '<div class="empty-state">Nessuna attività trovata con questi filtri.</div>';
  } else {
    auditTrailList.innerHTML = `
      <div class="table-row head">
        <span>Data</span><span>Utente</span><span>Azione</span><span>Entità</span><span>Dettaglio</span><span></span>
      </div>
      ${logs.map((log) => `
        <div class="table-row audit-row">
          <span>${escapeHtml(formatDateTime(log.created_at))}</span>
          <span>
            <strong>${escapeHtml(log.userName || log.actor || "Utente")}</strong>
            <small>${escapeHtml(roleLabel(log.userRole || ""))}${log.storeName ? ` · ${escapeHtml(log.storeName)}` : ""}</small>
          </span>
          <span><mark class="audit-action-badge">${escapeHtml(log.label || auditActionLabel(log.action))}</mark></span>
          <span>${escapeHtml(log.entityType || "Sistema")}<small>${escapeHtml(log.entityLabel || log.entityId || "")}</small></span>
          <span>${escapeHtml(log.description || log.route || "")}</span>
          <span><button class="ghost-button small-button" type="button" data-view-audit-log="${escapeHtml(log.id)}">Dettaglio</button></span>
        </div>
      `).join("")}
    `;
  }
  const pagination = state.auditPagination || { page: 1, limit: 50, total: 0 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 50)));
  if (auditTrailPageInfo) auditTrailPageInfo.textContent = `Pagina ${pagination.page || 1} di ${totalPages} · ${pagination.total || 0} log`;
  if (auditTrailPrev) auditTrailPrev.disabled = Number(pagination.page || 1) <= 1;
  if (auditTrailNext) auditTrailNext.disabled = Number(pagination.page || 1) >= totalPages;
}

async function loadAuditTrail(page = 1) {
  if (!isFounder()) return;
  if (auditTrailList) auditTrailList.innerHTML = '<div class="empty-state">Caricamento Audit Trail...</div>';
  try {
    const data = await apiRequest(`/audit-logs?${auditTrailParams(page).toString()}`);
    state.auditLogs = data.logs || [];
    state.auditPagination = data.pagination || { page, limit: 50, total: state.auditLogs.length };
    renderAuditTrail();
  } catch (error) {
    if (auditTrailList) auditTrailList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Audit Trail non caricato.")}</div>`;
  }
}

async function viewAuditLog(id) {
  try {
    const data = await apiRequest(`/audit-logs/${encodeURIComponent(id)}`);
    const log = data.log || data;
    previewTitle.textContent = `Audit Trail · ${auditActionLabel(log.action || log.type)}`;
    previewBody.innerHTML = `
      <div class="audit-detail-grid">
        <div><span>Data</span><strong>${escapeHtml(formatDateTime(log.created_at))}</strong></div>
        <div><span>Utente</span><strong>${escapeHtml(log.userName || log.actor || "Utente")}</strong></div>
        <div><span>Ruolo</span><strong>${escapeHtml(roleLabel(log.userRole || ""))}</strong></div>
        <div><span>Negozio</span><strong>${escapeHtml(log.storeName || "Dato non inserito")}</strong></div>
        <div><span>Entità</span><strong>${escapeHtml(log.entityType || "Sistema")} ${escapeHtml(log.entityLabel || log.entityId || "")}</strong></div>
        <div><span>IP / Device</span><strong>${escapeHtml([log.ip_address, log.device_info].filter(Boolean).join(" · ") || "Dato non inserito")}</strong></div>
      </div>
      ${auditDataBlock("Prima", log.before_data)}
      ${auditDataBlock("Dopo", log.after_data)}
      ${auditDataBlock("Metadata", log.metadata)}
    `;
    previewModal.hidden = false;
  } catch (error) {
    showToast(error.message || "Dettaglio audit non caricato.", "error");
  }
}

function notificationTypeLabel(type = "system") {
  return {
    approval_request: "Autorizzazione",
    approval_approved: "Approvata",
    approval_rejected: "Rifiutata",
    aurum_shield_alert: "Aurum Shield",
    quality_check_failed: "Qualità",
    document_expired: "Documento",
    backup_created: "Backup",
    backup_failed: "Backup",
    deed_deleted: "Atto eliminato",
    deed_completed: "Atto completato",
    user_updated: "Utenti",
    audit_critical: "Audit",
    academy_course_assigned: "Academy",
    academy_course_completed: "Academy",
    aurum_support_request: "Aurum",
    suspended_practice_created: "Pratiche sospese",
    suspended_practice_resolved: "Pratica risolta",
    suspended_practice_deleted: "Pratica eliminata",
    suspended_practice_pending_too_long: "Sospesa da verificare",
    system: "Sistema"
  }[String(type || "system")] || "Sistema";
}

function notificationSeverityMeta(severity = "info") {
  return {
    info: { label: "Info", className: "notification-info" },
    success: { label: "Successo", className: "notification-success" },
    warning: { label: "Attenzione", className: "notification-warning" },
    danger: { label: "Pericolo", className: "notification-danger" },
    critical: { label: "Critica", className: "notification-critical" }
  }[String(severity || "info").toLowerCase()] || { label: "Info", className: "notification-info" };
}

function renderNotificationBadge() {
  const count = Number(state.notificationUnreadCount || 0);
  if (notificationUnreadBadge) {
    notificationUnreadBadge.hidden = count <= 0;
    notificationUnreadBadge.textContent = count > 99 ? "99+" : String(count);
  }
  if (notificationBell) {
    notificationBell.classList.toggle("has-unread", count > 0);
  }
  renderFounderMenuKpis();
}

function notificationCardMarkup(notification = {}, compact = false) {
  const meta = notificationSeverityMeta(notification.severity);
  const isUnread = !notification.read_at && !notification.read;
  return `
    <article class="notification-item ${meta.className} ${isUnread ? "is-unread" : "is-read"}">
      <div class="notification-item-main">
        <div class="notification-item-title">
          <strong>${escapeHtml(notification.title || "Notifica OroActive")}</strong>
          <mark>${escapeHtml(notificationTypeLabel(notification.type))}</mark>
        </div>
        <p>${escapeHtml(notification.message || "")}</p>
        <small>${escapeHtml(formatDateTime(notification.created_at))} · ${escapeHtml(meta.label)}</small>
      </div>
      <div class="notification-item-actions">
        <button type="button" data-open-notification="${escapeHtml(String(notification.id || ""))}">Apri</button>
        ${isUnread ? `<button class="ghost-button" type="button" data-read-notification="${escapeHtml(String(notification.id || ""))}">Letta</button>` : ""}
        ${compact ? "" : `<button class="ghost-button" type="button" data-delete-notification="${escapeHtml(String(notification.id || ""))}">Elimina</button>`}
      </div>
    </article>
  `;
}

function closeNotificationDropdown() {
  if (notificationDropdown) {
    notificationDropdown.hidden = true;
    notificationDropdown.classList.remove("is-viewport-anchored");
    notificationDropdown.style.removeProperty("--notification-dropdown-width");
    notificationDropdown.style.removeProperty("--notification-dropdown-left");
    notificationDropdown.style.removeProperty("--notification-dropdown-top");
    notificationDropdown.style.removeProperty("--notification-dropdown-max-height");
  }
  if (notificationBell) notificationBell.setAttribute("aria-expanded", "false");
}

function renderNotificationDropdownEmpty(message = "Nessuna notifica non letta.") {
  if (!notificationDropdownList) return;
  notificationDropdownList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  if (notificationDropdown && !notificationDropdown.hidden) positionNotificationDropdown();
}

async function loadNotificationCount() {
  if (!state.currentUser || !notificationCenter) return;
  try {
    const data = await apiRequest("/notifications/unread-count", { retries: 1 });
    state.notificationUnreadCount = Number(data.unread_count || 0);
    renderNotificationBadge();
  } catch {
    renderNotificationBadge();
  }
}

function startNotificationPolling() {
  if (state.notificationTimer || !state.currentUser) return;
  state.notificationTimer = window.setInterval(loadNotificationCount, NOTIFICATION_POLL_INTERVAL_MS);
}

function stopNotificationPolling() {
  if (state.notificationTimer) window.clearInterval(state.notificationTimer);
  state.notificationTimer = null;
}

function notificationFilterParams(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (!notificationFilters) return params;
  const formData = new FormData(notificationFilters);
  for (const [key, value] of formData.entries()) {
    const text = String(value || "").trim();
    if (text) params.set(key, text);
  }
  return params;
}

async function loadNotificationDropdown() {
  if (!state.currentUser || !notificationDropdownList) return;
  notificationDropdownList.innerHTML = '<div class="empty-state">Caricamento notifiche...</div>';
  try {
    const data = await apiRequest("/notifications?limit=6&page=1&unread=true", { retries: 1 });
    state.notificationUnreadCount = Number(data.unread_count || 0);
    renderNotificationBadge();
    const notifications = data.notifications || [];
    notificationDropdownList.innerHTML = notifications.length
      ? notifications.map((notification) => notificationCardMarkup(notification, true)).join("")
      : '<div class="empty-state">Nessuna notifica non letta.</div>';
    if (notificationDropdown && !notificationDropdown.hidden) positionNotificationDropdown();
  } catch (error) {
    notificationDropdownList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Notifiche non caricate.")}</div>`;
  }
}

async function loadNotificationsPage(page = 1) {
  if (!state.currentUser || !notificationsList) return;
  notificationsList.innerHTML = '<div class="empty-state">Caricamento notifiche...</div>';
  try {
    const data = await apiRequest(`/notifications?${notificationFilterParams(page, 20).toString()}`);
    state.notifications = data.notifications || [];
    state.notificationUnreadCount = Number(data.unread_count || 0);
    state.notificationPagination = data.pagination || { page, limit: 20, total: state.notifications.length };
    renderNotificationBadge();
    renderNotificationsPage();
  } catch (error) {
    notificationsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Notifiche non caricate.")}</div>`;
  }
}

function renderNotificationsPage() {
  if (!notificationsList) return;
  const notifications = state.notifications || [];
  if (!notifications.length) {
    notificationsList.innerHTML = '<div class="empty-state">Nessuna notifica trovata con questi filtri.</div>';
  } else {
    notificationsList.innerHTML = `
      <div class="table-row head">
        <span>Notifica</span><span>Tipo</span><span>Gravità</span><span>Data</span><span>Azioni</span>
      </div>
      ${notifications.map((notification) => {
        const meta = notificationSeverityMeta(notification.severity);
        const isUnread = !notification.read_at && !notification.read;
        return `
          <div class="table-row notification-row ${isUnread ? "is-unread" : "is-read"} ${meta.className}">
            <span>
              <strong>${escapeHtml(notification.title || "Notifica OroActive")}</strong>
              <small>${escapeHtml(notification.message || "")}</small>
            </span>
            <span>${escapeHtml(notificationTypeLabel(notification.type))}</span>
            <span><mark>${escapeHtml(meta.label)}</mark></span>
            <span>${escapeHtml(formatDateTime(notification.created_at))}</span>
            <span class="row-actions">
              <button type="button" data-open-notification="${escapeHtml(String(notification.id || ""))}">Apri</button>
              ${isUnread ? `<button class="ghost-button" type="button" data-read-notification="${escapeHtml(String(notification.id || ""))}">Segna letta</button>` : ""}
              <button class="ghost-button" type="button" data-delete-notification="${escapeHtml(String(notification.id || ""))}">Elimina</button>
            </span>
          </div>
        `;
      }).join("")}
    `;
  }
  const pagination = state.notificationPagination || { page: 1, limit: 20, total: 0 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));
  if (notificationsPageInfo) notificationsPageInfo.textContent = `Pagina ${pagination.page || 1} di ${totalPages} · ${pagination.total || 0} notifiche`;
  if (notificationsPrev) notificationsPrev.disabled = Number(pagination.page || 1) <= 1;
  if (notificationsNext) notificationsNext.disabled = Number(pagination.page || 1) >= totalPages;
}

function sectionFromNotificationAction(actionUrl = "") {
  const target = String(actionUrl || "").trim();
  if (!target.startsWith("#")) return "";
  return target.replace(/^#/, "") || "";
}

function findNotificationById(id) {
  const needle = String(id || "");
  return [
    ...(state.notifications || [])
  ].find((notification) => String(notification.id || "") === needle) || null;
}

async function markNotificationReadById(id, options = {}) {
  const data = await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PUT",
    body: JSON.stringify({ opened: Boolean(options.opened) })
  });
  state.notificationUnreadCount = Number(data.unread_count || 0);
  renderNotificationBadge();
  return data.notification || null;
}

async function openNotificationById(id) {
  try {
    const known = findNotificationById(id);
    const notification = await markNotificationReadById(id, { opened: true }) || known;
    closeNotificationDropdown();
    const section = sectionFromNotificationAction(notification?.action_url || known?.action_url || "");
    if (section) {
      setScreen(section);
    } else {
      showToast("Notifica segnata come letta.", "success");
    }
    await loadNotificationCount();
  } catch (error) {
    showToast(error.message || "Notifica non aperta.", "error");
  }
}

async function readNotificationById(id) {
  try {
    await markNotificationReadById(id);
    await loadNotificationDropdown();
    if (document.getElementById("notifications")?.classList.contains("active-screen")) {
      await loadNotificationsPage(state.notificationPagination?.page || 1);
    }
  } catch (error) {
    showToast(error.message || "Notifica non aggiornata.", "error");
  }
}

async function markAllNotificationsAsRead() {
  try {
    const data = await apiRequest("/notifications/read-all", { method: "PUT", body: JSON.stringify({}) });
    state.notificationUnreadCount = Number(data.unread_count || 0);
    renderNotificationBadge();
    if (state.notificationUnreadCount > 0) {
      await loadNotificationDropdown();
    } else {
      renderNotificationDropdownEmpty("Tutte le notifiche sono state lette.");
    }
    if (document.getElementById("notifications")?.classList.contains("active-screen")) {
      await loadNotificationsPage(state.notificationPagination?.page || 1);
    }
    showToast("Notifiche segnate come lette.", "success");
  } catch (error) {
    showToast(error.message || "Notifiche non aggiornate.", "error");
  }
}

async function deleteNotificationById(id) {
  if (!window.confirm("Vuoi eliminare questa notifica?")) return;
  try {
    const data = await apiRequest(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.notificationUnreadCount = Number(data.unread_count || 0);
    renderNotificationBadge();
    await loadNotificationDropdown();
    if (document.getElementById("notifications")?.classList.contains("active-screen")) {
      await loadNotificationsPage(state.notificationPagination?.page || 1);
    }
  } catch (error) {
    showToast(error.message || "Notifica non eliminata.", "error");
  }
}

function approvalStatusMeta(status = "pending") {
  return {
    pending: { label: "In attesa", className: "approval-pending" },
    approved: { label: "Approvata", className: "approval-approved" },
    rejected: { label: "Rifiutata", className: "approval-rejected" },
    cancelled: { label: "Annullata", className: "approval-cancelled" }
  }[String(status || "pending").toLowerCase()] || { label: "In attesa", className: "approval-pending" };
}

function approvalReasonText(reason = {}) {
  if (typeof reason === "string") return reason;
  return reason.message || reason.label || reason.title || "Motivo da verificare";
}

function approvalReasonsMarkup(reasons = []) {
  const items = Array.isArray(reasons) ? reasons : [];
  if (!items.length) return '<small class="muted">Nessun motivo dettagliato disponibile.</small>';
  return `
    <ul class="approval-reasons">
      ${items.slice(0, 6).map((reason) => `
        <li>
          <strong>${escapeHtml(reason.severity || reason.type || "verifica")}</strong>
          <span>${escapeHtml(approvalReasonText(reason))}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function canReviewApprovalRequest(approval = {}) {
  return canReviewActs() && String(approval.status || "pending") === "pending";
}

function canCancelApprovalRequest(approval = {}) {
  return String(approval.status || "pending") === "pending"
    && String(approval.requested_by || "") === String(state.currentUser?.id || "");
}

function renderApprovals() {
  if (!approvalsList) return;
  const approvals = state.approvals || [];
  if (!approvals.length) {
    approvalsList.innerHTML = '<div class="empty-state">Nessuna richiesta autorizzazione visibile per il tuo ruolo.</div>';
    return;
  }
  approvalsList.innerHTML = `
    <div class="table-row head">
      <span>Pratica</span><span>Richiedente</span><span>Rischio</span><span>Motivi</span><span>Stato</span><span>Azioni</span>
    </div>
    ${approvals.map((approval) => {
      const meta = approvalStatusMeta(approval.status);
      const canReview = canReviewApprovalRequest(approval);
      const canCancel = canCancelApprovalRequest(approval);
      return `
        <div class="table-row approval-row">
          <span>
            <strong>${escapeHtml(approval.practiceNumber || `Atto ${approval.sale_deed_id || ""}`)}</strong>
            <small>${escapeHtml(approval.clientName || "Cliente non indicato")}${approval.store ? ` · ${escapeHtml(approval.store)}` : ""}</small>
          </span>
          <span>
            ${escapeHtml(approval.requestedByName || "Utente")}
            <small>${escapeHtml(roleLabel(approval.requested_by_role || ""))} · ${escapeHtml(formatDateTime(approval.created_at))}</small>
          </span>
          <span>
            <strong>${escapeHtml(Number(approval.risk_score || 0))}/100</strong>
            <small>${escapeHtml(approval.risk_level || "da verificare")}</small>
          </span>
          <span>${approvalReasonsMarkup(approval.reasons)}</span>
          <span><mark class="approval-status ${meta.className}">${escapeHtml(meta.label)}</mark></span>
          <span class="row-actions">
            <button type="button" data-open-approval-act="${escapeHtml(approval.practiceNumber || "")}" ${approval.practiceNumber ? "" : "disabled"}>Apri</button>
            <button type="button" data-edit-approval-act="${escapeHtml(approval.practiceNumber || "")}" ${approval.practiceNumber ? "" : "disabled"}>Modifica</button>
            <button class="ghost-button" type="button" data-view-approval="${escapeHtml(approval.id)}">Dettaglio</button>
            ${canReview ? `<button class="primary-button" type="button" data-approve-approval="${escapeHtml(approval.id)}">Approva</button>` : ""}
            ${canReview ? `<button class="danger-button" type="button" data-reject-approval="${escapeHtml(approval.id)}">Rifiuta</button>` : ""}
            ${canCancel ? `<button class="ghost-button" type="button" data-cancel-approval="${escapeHtml(approval.id)}">Annulla</button>` : ""}
          </span>
        </div>
      `;
    }).join("")}
  `;
}

async function loadApprovals() {
  if (!canUseApprovalSectionUi()) return;
  if (approvalsList) approvalsList.innerHTML = '<div class="empty-state">Caricamento richieste autorizzazione...</div>';
  try {
    const data = await apiRequest("/approvals");
    state.approvals = data.approvals || [];
    renderApprovals();
  } catch (error) {
    if (approvalsList) approvalsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Richieste autorizzazione non caricate.")}</div>`;
  }
}

async function viewApprovalRequest(id) {
  try {
    const data = await apiRequest(`/approvals/${encodeURIComponent(id)}`);
    const approval = data.approval_request || data;
    const meta = approvalStatusMeta(approval.status);
    previewTitle.textContent = `Autorizzazione · ${approval.practiceNumber || approval.sale_deed_id || id}`;
    previewBody.innerHTML = `
      <div class="audit-detail-grid">
        <div><span>Stato</span><strong>${escapeHtml(meta.label)}</strong></div>
        <div><span>Richiedente</span><strong>${escapeHtml(approval.requestedByName || "Utente")}</strong></div>
        <div><span>Ruolo</span><strong>${escapeHtml(roleLabel(approval.requested_by_role || ""))}</strong></div>
        <div><span>Negozio</span><strong>${escapeHtml(approval.store || "Dato non inserito")}</strong></div>
        <div><span>Risk score</span><strong>${escapeHtml(Number(approval.risk_score || 0))}/100 · ${escapeHtml(approval.risk_level || "n/d")}</strong></div>
        <div><span>Data richiesta</span><strong>${escapeHtml(formatDateTime(approval.created_at))}</strong></div>
      </div>
      <section class="audit-detail-block">
        <h4>Motivi</h4>
        ${approvalReasonsMarkup(approval.reasons)}
      </section>
      ${approval.requester_note ? auditDataBlock("Nota richiedente", approval.requester_note) : ""}
      ${approval.reviewer_note ? auditDataBlock("Nota revisore", approval.reviewer_note) : ""}
      ${auditDataBlock("Controllo Qualità", approval.quality_check)}
      ${auditDataBlock("Aurum Shield", approval.aurum_shield)}
    `;
    previewModal.hidden = false;
  } catch (error) {
    showToast(error.message || "Dettaglio autorizzazione non caricato.", "error");
  }
}

async function approveApprovalRequest(id) {
  const reviewerNote = window.prompt("Nota opzionale per l'approvazione:") || "";
  try {
    const data = await apiRequest(`/approvals/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewer_note: reviewerNote })
    });
    showToast(data.message || "Autorizzazione approvata. La pratica può essere completata.", "success");
    await loadApprovals();
    await loadNotificationCount();
    await loadArchiveScreenData({ force: true, silent: true }).catch(() => {});
    renderArchiveGroups();
  } catch (error) {
    showToast(error.message || "Autorizzazione non approvata.", "error");
  }
}

async function rejectApprovalRequest(id) {
  const reviewerNote = window.prompt("Motivo del rifiuto autorizzazione:");
  if (!reviewerNote || !reviewerNote.trim()) {
    showToast("Nota obbligatoria per rifiutare l'autorizzazione.", "warning");
    return;
  }
  try {
    const data = await apiRequest(`/approvals/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewer_note: reviewerNote.trim() })
    });
    showToast(data.message || "Autorizzazione rifiutata. Correggere la pratica prima di procedere.", "success");
    await loadApprovals();
    await loadNotificationCount();
    await loadArchiveScreenData({ force: true, silent: true }).catch(() => {});
    renderArchiveGroups();
  } catch (error) {
    showToast(error.message || "Autorizzazione non rifiutata.", "error");
  }
}

async function cancelApprovalRequest(id) {
  if (!window.confirm("Vuoi annullare questa richiesta autorizzazione?")) return;
  try {
    const data = await apiRequest(`/approvals/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    showToast(data.message || "Richiesta autorizzazione annullata.", "success");
    await loadApprovals();
    await loadNotificationCount();
    await loadArchiveScreenData({ force: true, silent: true }).catch(() => {});
    renderArchiveGroups();
  } catch (error) {
    showToast(error.message || "Richiesta non annullata.", "error");
  }
}

function suspendedPracticeParams(page = 1) {
  const formData = suspendedPracticeFilters ? new FormData(suspendedPracticeFilters) : new FormData();
  const params = {
    page,
    limit: state.suspendedPagination.limit || 50
  };
  for (const [key, value] of formData.entries()) {
    const text = String(value || "").trim();
    if (text) params[key] = text;
  }
  return queryString(params);
}

function suspendedPracticeReasonsMarkup(reasons = []) {
  const list = Array.isArray(reasons) ? reasons : [];
  if (!list.length) return '<span class="muted">Motivo da verificare</span>';
  return `
    <ul class="suspended-reasons">
      ${list.slice(0, 5).map((reason) => `<li>${escapeHtml(String(reason || ""))}</li>`).join("")}
    </ul>
  `;
}

function suspendedPracticeApprovalMarkup(practice = {}) {
  if (!practice.approval_status) return '<mark class="approval-status approval-cancelled">Non richiesta</mark>';
  const meta = approvalStatusMeta(practice.approval_status);
  return `<mark class="approval-status ${meta.className}">${escapeHtml(meta.label)}</mark>`;
}

function canDeleteSuspendedPracticeUi(practice = {}) {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") return true;
  return role === "responsabile" && (practice.store === state.currentUser?.negozio || practice.negozio === state.currentUser?.negozio);
}

function renderSuspendedPractices() {
  if (!suspendedPracticesList) return;
  const practices = state.suspendedPractices || [];
  if (!practices.length) {
    suspendedPracticesList.innerHTML = '<div class="empty-state">Nessuna pratica sospesa visibile per il tuo ruolo.</div>';
  } else {
    suspendedPracticesList.innerHTML = `
      <div class="table-row head"><span>Pratica</span><span>Cliente</span><span>Negozio</span><span>Motivi</span><span>Rischio</span><span>Autorizzazione</span><span>Azioni</span></div>
      ${practices.map((practice) => {
        const shield = practice.aurumShield || { score: practice.risk_score, risk_level: practice.risk_level };
        const canDelete = canDeleteSuspendedPracticeUi(practice);
        return `
          <div class="table-row suspended-practice-row">
            <span>
              <strong>${escapeHtml(practice.practiceNumber || practice.numero_atto || "")}</strong>
              <small>${escapeHtml(formatDateTime(practice.suspended_at || practice.suspendedAt || practice.created_at))}</small>
            </span>
            <span>
              <strong>${escapeHtml(practice.cliente || `${practice.name || ""} ${practice.surname || ""}`.trim() || "Cliente non indicato")}</strong>
              <small>${escapeHtml(practice.operatore || practice.operatorName || practice.operatorUsername || "Operatore non indicato")}</small>
            </span>
            <span>${escapeHtml(practice.negozio || practice.store || "Dato non inserito")}</span>
            <span>${suspendedPracticeReasonsMarkup(practice.motivi || practice.suspendedReasons)}</span>
            <span>${aurumShieldBadgeMarkup(shield)}</span>
            <span>${suspendedPracticeApprovalMarkup(practice)}</span>
            <div class="row-actions">
              <button type="button" data-open-suspended="${escapeHtml(String(practice.id || ""))}">Apri</button>
              <button type="button" data-edit-suspended="${escapeHtml(String(practice.id || practice.practiceNumber || ""))}">Modifica / Riapri</button>
              <button class="ghost-button" type="button" data-resolve-suspended="${escapeHtml(String(practice.id || ""))}">Risolvi controlli</button>
              <button class="primary-button" type="button" data-approval-suspended="${escapeHtml(String(practice.id || ""))}">Richiedi autorizzazione</button>
              <button class="danger-button" type="button" data-delete-suspended="${escapeHtml(String(practice.id || ""))}" ${canDelete ? "" : "disabled"}>Elimina</button>
            </div>
          </div>
        `;
      }).join("")}
    `;
  }
  if (suspendedPracticesPageInfo) {
    const pagination = state.suspendedPagination || { page: 1, limit: 50, total: 0 };
    const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 50)));
    suspendedPracticesPageInfo.textContent = `Pagina ${pagination.page || 1} di ${totalPages} - ${pagination.total || 0} pratiche`;
  }
  if (suspendedPracticesPrev) suspendedPracticesPrev.disabled = Number(state.suspendedPagination?.page || 1) <= 1;
  if (suspendedPracticesNext) {
    const pagination = state.suspendedPagination || { page: 1, limit: 50, total: 0 };
    suspendedPracticesNext.disabled = Number(pagination.page || 1) >= Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 50)));
  }
}

async function loadSuspendedPractices(page = state.suspendedPagination?.page || 1) {
  if (!suspendedPracticesList) return;
  suspendedPracticesList.innerHTML = '<div class="empty-state">Caricamento pratiche sospese...</div>';
  try {
    const params = suspendedPracticeParams(page);
    const data = await apiRequest(`/suspended-practices${params ? `?${params}` : ""}`);
    state.suspendedPractices = data.practices || [];
    state.suspendedPagination = data.pagination || { page, limit: 50, total: state.suspendedPractices.length };
    renderSuspendedPractices();
  } catch (error) {
    suspendedPracticesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Pratiche sospese non caricate.")}</div>`;
  }
}

async function viewSuspendedPractice(id) {
  try {
    const data = await apiRequest(`/suspended-practices/${encodeURIComponent(id)}`);
    const practice = data.practice || {};
    const act = data.act || practice;
    previewTitle.textContent = `Pratica sospesa · ${practice.practiceNumber || act.practiceNumber || id}`;
    previewBody.innerHTML = `
      <section class="approval-detail">
        <div class="audit-detail-grid">
          <div><span>Cliente</span><strong>${escapeHtml(practice.cliente || `${act.name || ""} ${act.surname || ""}`.trim() || "Dato non inserito")}</strong></div>
          <div><span>Negozio</span><strong>${escapeHtml(practice.negozio || act.store || "Dato non inserito")}</strong></div>
          <div><span>Operatore</span><strong>${escapeHtml(practice.operatore || act.operatorName || act.operatorUsername || "Dato non inserito")}</strong></div>
          <div><span>Stato</span><strong>${escapeHtml(workflowStatusListLabel(practice.stato || act.status))}</strong></div>
          <div><span>Risk score</span><strong>${escapeHtml(String(practice.risk_score || act.aurumShield?.score || 0))}/100</strong></div>
          <div><span>Autorizzazione</span><strong>${escapeHtml(practice.approvalStatusLabel || "")}</strong></div>
        </div>
        <h4>Motivi sospensione</h4>
        ${suspendedPracticeReasonsMarkup(practice.motivi || act.suspendedReasons)}
        ${auditDataBlock("Controllo Qualità", act.qualityCheck || practice.quality_check || {})}
        ${auditDataBlock("Aurum Shield", act.aurumShield || {})}
        ${auditDataBlock("Pagamento", { metodo: act.paymentMethod, importo: act.amount, iban: act.iban ? "presente" : "" })}
        <h4>Log sospensione</h4>
        ${(data.logs || []).length ? `<div class="archive-table users-table">${data.logs.map((log) => `
          <div class="table-row">
            <span>${escapeHtml(formatDateTime(log.created_at))}</span>
            <strong>${escapeHtml(log.action || "")}</strong>
            <span>${escapeHtml(log.userName || "Sistema")}</span>
            <small>${escapeHtml(log.reason || "")}</small>
          </div>
        `).join("")}</div>` : '<div class="empty-state">Nessun log sospensione registrato.</div>'}
      </section>
    `;
    previewModal.hidden = false;
  } catch (error) {
    showToast(error.message || "Impossibile aprire la pratica sospesa.", "error");
  }
}

async function editSuspendedPractice(id) {
  try {
    const data = await apiRequest(`/suspended-practices/${encodeURIComponent(id)}`);
    const practiceNumber = data.act?.practiceNumber || data.practice?.practiceNumber || data.practice?.numero_atto;
    if (!practiceNumber) throw new Error("Numero pratica non disponibile.");
    await loadActForEdit(practiceNumber);
    showToast("Pratica sospesa riaperta: correggi i controlli evidenziati.", "success");
  } catch (error) {
    showToast(error.message || "Impossibile riaprire la pratica sospesa.", "error");
  }
}

async function resolveSuspendedPractice(id) {
  try {
    const data = await apiRequest(`/suspended-practices/${encodeURIComponent(id)}/resolve-check`, { method: "POST" });
    showToast(data.message || "Controlli pratica sospesa aggiornati.", data.resolved ? "success" : "warning");
    await loadSuspendedPractices();
    await loadArchiveScreenData({ force: true, silent: true }).catch(() => {});
    renderArchiveGroups();
    if (shouldShowAurumMascot()) {
      showAurumTip(data.resolved ? "La pratica ora può essere completata." : "La pratica resta sospesa: controlla i motivi aggiornati.");
    }
  } catch (error) {
    showToast(error.message || "Controlli pratica sospesa non aggiornati.", "error");
  }
}

async function requestSuspendedPracticeApproval(id) {
  try {
    const data = await apiRequest(`/suspended-practices/${encodeURIComponent(id)}`);
    const practice = data.practice || {};
    const reasons = (practice.motivi || []).map((message) => ({ type: "suspended_practice", severity: "warning", message }));
    const response = await apiRequest("/approvals/request", {
      method: "POST",
      body: JSON.stringify({
        sale_deed_id: data.act?.id || practice.id || id,
        requester_note: "Richiesta da Pratiche sospese",
        reasons,
        risk_score: practice.risk_score || data.act?.aurumShield?.score || 0,
        risk_level: practice.risk_level || data.act?.aurumShield?.risk_level || "",
        quality_check: data.act?.qualityCheck || {},
        aurum_shield: data.act?.aurumShield || {}
      })
    });
    showToast(response.message || "Richiesta autorizzazione inviata.", "success");
    await Promise.all([
      loadSuspendedPractices(),
      loadApprovals().catch(() => {}),
      loadNotificationCount().catch(() => {})
    ]);
  } catch (error) {
    showToast(error.message || "Richiesta autorizzazione non inviata.", "error");
  }
}

async function deleteSuspendedPractice(id) {
  if (!window.confirm("Sei sicuro di voler eliminare definitivamente questa pratica sospesa dai flussi operativi?")) return;
  try {
    await apiRequest(`/suspended-practices/${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("Pratica sospesa eliminata.", "success");
    await Promise.all([
      loadSuspendedPractices(),
      loadArchiveScreenData({ force: true, silent: true }).catch(() => {}),
      loadNotificationCount().catch(() => {})
    ]);
    renderArchiveGroups();
  } catch (error) {
    showToast(error.message || "Impossibile eliminare la pratica sospesa.", "error");
  }
}

async function saveCurrentPracticeAsSuspended(options = {}) {
  if (!fieldValue("#practiceNumber")) await updatePracticeNumber();
  if (!fieldValue("#practiceNumber")) {
    showToast("Numerazione atto momentaneamente non disponibile.");
    return false;
  }
  const quality = options.quality || state.guidedQualityCheck || await validateQualityChecklist({ status: "completed", silent: true });
  const shield = options.shield || quality?.aurum_shield || state.aurumShield || await evaluateAurumShield({ status: "completed", silent: true });
  const reasons = frontendSuspensionReasons({ quality, shield, reasons: options.reasons });
  if (!reasons.length) reasons.push(options.manual ? "Pratica sospesa manualmente dall'operatore." : "Controlli operativi da completare.");
  const wasEditing = Boolean(state.editingPracticeNumber || state.editingActId);
  let act = currentActSnapshot("suspended");
  act.suspendedReasons = reasons;
  act.suspendedReason = reasons[0] || "";
  act.qualityCheck = quality || act.qualityCheck;
  act.aurumShield = shield || act.aurumShield;
  try {
    const saved = await saveActRecord(act, wasEditing ? "PUT" : "POST");
    state.editingActId = saved.id || state.editingActId;
    state.editingPracticeNumber = saved.practiceNumber || state.editingPracticeNumber;
    state.editingOriginalStatus = normalizeWorkflowStatus(saved.status || "suspended");
    showToast(options.message || "Pratica salvata tra le pratiche sospese.", "success");
    await loadSuspendedPractices().catch(() => {});
    await loadArchiveScreenData({ force: true, silent: true }).catch(() => {});
    renderArchiveGroups();
    if (!options.stayOnPractice) setScreen("suspendedPractices");
    if (shouldShowAurumMascot()) showAurumTip(`Pratica sospesa: ${reasons[0]}`);
    return true;
  } catch (error) {
    showToast(error.message || "Impossibile salvare la pratica sospesa.", "error");
    return false;
  }
}

function aurumShieldLevelMeta(level = "basso") {
  return {
    basso: { label: "Pratica sicura", className: "risk-low" },
    medio: { label: "Pratica da controllare", className: "risk-medium" },
    alto: { label: "Attenzione operativa", className: "risk-high" },
    critico: { label: "Alto rischio — richiede verifica", className: "risk-critical" }
  }[String(level || "").toLowerCase()] || { label: "Pratica da controllare", className: "risk-medium" };
}

function aurumShieldBadgeMarkup(shield) {
  if (!shield || shield.score === undefined || shield.score === null) return '<span class="aurum-shield-badge risk-unknown">Shield n/d</span>';
  const meta = aurumShieldLevelMeta(shield.risk_level || shield.riskLevel);
  return `<span class="aurum-shield-badge ${meta.className}">Shield ${Number(shield.score || 0)}/100</span>`;
}

function renderAurumShieldCard() {
  if (!aurumShieldCard) return;
  const shield = state.aurumShield || { score: 0, risk_level: "basso", summary: "Pratica sicura", factors: [], recommendations: [] };
  const meta = aurumShieldLevelMeta(shield.risk_level);
  aurumShieldCard.classList.remove("risk-low", "risk-medium", "risk-high", "risk-critical", "risk-loading");
  aurumShieldCard.classList.add(meta.className);
  if (aurumShieldScore) aurumShieldScore.textContent = `${Number(shield.score || 0)}/100`;
  if (aurumShieldLevel) aurumShieldLevel.textContent = shield.summary || meta.label;
  if (aurumShieldFactors) {
    const factors = Array.isArray(shield.factors) ? shield.factors : [];
    aurumShieldFactors.innerHTML = factors.length
      ? factors.slice(0, 5).map((factor) => `<li>${escapeHtml(factor.message || "")}</li>`).join("")
      : "<li>Nessun fattore di rischio rilevato.</li>";
  }
  if (aurumShieldRecommendations) {
    const recommendations = Array.isArray(shield.recommendations) ? shield.recommendations : [];
    aurumShieldRecommendations.innerHTML = recommendations.length
      ? `<strong>Raccomandazioni</strong>${recommendations.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}`
      : "";
  }
}

function currentAurumShieldDraftData(status = "draft") {
  const storeSelect = document.getElementById("storeCode");
  const materials = weightRows()
    .filter((row) => Number(row.value || 0) > 0)
    .map((row) => ({ metal: row.metal, title: row.title, weight: row.value }));
  const totalWeight = materials.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  return {
    id: state.editingActId || null,
    practiceNumber: fieldValue("#practiceNumber"),
    date: fieldValue("#practiceDate"),
    store: storeSelect?.selectedOptions[0]?.textContent || "",
    storeCode: storeSelect?.value || "",
    name: fieldValue('[name="nome"]'),
    surname: fieldValue('[name="cognome"]'),
    fiscalCode: fieldValue('[name="cf"]'),
    documentType: fieldValue('[name="tipoDocumento"]'),
    documentNumber: fieldValue('[name="numeroDocumento"]'),
    documentExpiry: fieldValue('[name="scadenzaDocumento"]'),
    paymentMethod: fieldValue("#paymentMethod"),
    amount: fieldValue("#saleTotal"),
    iban: paymentRequiresIban() ? fieldValue("#paymentIban") : "",
    accountHolder: fieldValue("#paymentAccountHolder"),
    items: collectCededItems(),
    materials,
    weight: totalWeight.toFixed(2),
    captures: [...state.uploadedCaptures],
    signatures: [...state.signatures],
    qualityReview: currentQualityReview(),
    operatorId: state.currentUser?.id || null,
    status
  };
}

async function evaluateAurumShield(options = {}) {
  if (!state.authToken || !aurumShieldCard) return null;
  if (options.loading) aurumShieldCard.classList.add("risk-loading");
  try {
    const data = await apiRequest("/aurum-shield/evaluate", {
      method: "POST",
      timeoutMs: 16000,
      body: JSON.stringify({
        sale_deed_id: options.saleDeedId || state.editingActId || "",
        draft_data: options.draftData || currentAurumShieldDraftData(options.status || "draft")
      })
    });
    state.aurumShield = data;
    renderAurumShieldCard();
    if (["alto", "critico"].includes(String(data.risk_level || "")) && shouldShowAurumMascot()) {
      showAurumTip("Questa pratica merita un controllo in più. Ho rilevato alcuni segnali da verificare.");
    }
    return data;
  } catch (error) {
    if (!options.silent) showToast(error.message || "Aurum Shield non disponibile.", "warning");
    return null;
  } finally {
    aurumShieldCard.classList.remove("risk-loading");
  }
}

function scheduleAurumShieldEvaluation() {
  window.clearTimeout(state.aurumShieldTimer);
  state.aurumShieldTimer = window.setTimeout(() => {
    evaluateAurumShield({ silent: true });
  }, 800);
  scheduleQualityCheckValidation();
}

function frontendApprovalReasons({ quality = null, shield = null } = {}) {
  const reasons = [];
  const shieldLevel = String(shield?.risk_level || "").toLowerCase();
  if (shield && ["alto", "critico"].includes(shieldLevel)) {
    reasons.push({
      type: "aurum_shield",
      severity: shieldLevel,
      message: `${shield.summary || "Aurum Shield richiede verifica"} (${Number(shield.score || 0)}/100)`
    });
  }
  (shield?.factors || []).forEach((factor) => {
    const points = Number(factor.points || 0);
    const severity = String(factor.severity || "").toLowerCase();
    if (points >= 20 || ["high", "critical", "alto", "critico"].includes(severity)) {
      reasons.push({
        type: factor.type || "risk_factor",
        severity: severity || "warning",
        message: factor.message || "Fattore rischio da verificare"
      });
    }
  });
  const qualityStatus = String(quality?.quality_status || quality?.status || "").toLowerCase();
  if (qualityStatus === "non_completabile") {
    (quality.blocking_errors || []).slice(0, 8).forEach((message) => {
      reasons.push({ type: "quality_error", severity: "error", message });
    });
  }
  if (qualityStatus === "attenzione") {
    (quality.warnings || []).slice(0, 6).forEach((message) => {
      reasons.push({ type: "quality_warning", severity: "warning", message });
    });
  }
  if (state.amlCashCheck?.ok === false) {
    reasons.push({ type: "cash_limit", severity: "critical", message: state.amlCashCheck.messaggio || cashPaymentLimitMessage() });
  } else if (isCashPayment() && saleTotalAmount() >= CASH_PAYMENT_LIMIT * 0.8) {
    reasons.push({ type: "cash_limit", severity: "high", message: "Contanti vicino alla soglia configurata." });
  }
  const seen = new Set();
  return reasons.filter((reason) => {
    const key = `${reason.type}:${reason.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function frontendSuspensionReasons({ quality = null, shield = null, reasons = [] } = {}) {
  const messages = [];
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === "object") {
      add(value.message || value.action || value.label || value.title || value.description);
      return;
    }
    const text = String(value || "").trim();
    if (text && !messages.includes(text)) messages.push(text);
  };
  add(reasons);
  add(quality?.blocking_errors);
  add(quality?.required_actions);
  add(quality?.warnings);
  add(shield?.factors);
  if (shield && Number(shield.score || 0) >= 61) add(shield.summary || `Aurum Shield ${Number(shield.score || 0)}/100`);
  if (state.amlCashCheck?.ok === false) add(state.amlCashCheck.messaggio || cashPaymentLimitMessage());
  return messages.slice(0, 20);
}

function approvalPromptText({ reasons = [], shield = null, quality = null } = {}) {
  const status = quality?.quality_status || quality?.status || "";
  const title = "Questa pratica richiede autorizzazione di un responsabile o founder prima di essere completata.";
  const reasonLines = reasons.length
    ? reasons.slice(0, 7).map((reason) => `- ${approvalReasonText(reason)}`).join("\n")
    : "- Elementi operativi da verificare prima del completamento";
  const scoreLine = shield ? `\nRisk score: ${Number(shield.score || 0)}/100 (${shield.risk_level || "n/d"})` : "";
  const qualityLine = status ? `\nControllo Qualità: ${status}` : "";
  return `${title}${scoreLine}${qualityLine}\n\nMotivi:\n${reasonLines}\n\nVuoi inviare la richiesta autorizzazione?`;
}

function shouldRequestApprovalForQuality(quality, action = "complete") {
  if (!["complete", "archive"].includes(action)) return false;
  if (String(state.editingApprovalStatus || "").toLowerCase() === "approved") return false;
  const status = String(quality?.quality_status || quality?.status || "").toLowerCase();
  return currentUserNeedsApprovalForRisk() && ["non_completabile", "attenzione"].includes(status);
}

function shouldRequestApprovalForShield(shield) {
  if (!currentUserNeedsApprovalForRisk()) return false;
  if (String(state.editingApprovalStatus || "").toLowerCase() === "approved") return false;
  const score = Number(shield?.score || 0);
  const level = String(shield?.risk_level || "").toLowerCase();
  return score > 60 || ["alto", "critico"].includes(level);
}

function hasApprovedApprovalForCurrentAct() {
  return String(state.editingApprovalStatus || "").toLowerCase() === "approved"
    || workflowStatusCode(state.editingOriginalStatus || "") === "approval_approved";
}

async function requestApprovalForCurrentPractice(options = {}) {
  if (!currentUserNeedsApprovalForRisk()) return false;
  if (!fieldValue("#practiceNumber")) await updatePracticeNumber();
  if (!fieldValue("#practiceNumber")) {
    showToast("Numerazione atto momentaneamente non disponibile.", "warning");
    return false;
  }
  const quality = options.quality || state.guidedQualityCheck || null;
  const shield = options.shield || quality?.aurum_shield || state.aurumShield || null;
  const reasons = options.reasons?.length ? options.reasons : frontendApprovalReasons({ quality, shield });
  if (options.askConfirm !== false && !window.confirm(approvalPromptText({ reasons, shield, quality }))) return false;
  const targetStatus = options.targetStatus || "completed";
  const pendingAct = {
    ...(options.draftData || currentActSnapshot("pending_approval")),
    status: "pending_approval",
    approvalStatus: "pending",
    approvalReasons: reasons,
    aurumShield: shield || null,
    qualityCheck: quality || null
  };
  pendingAct.practiceNumber ||= fieldValue("#practiceNumber");
  const method = state.editingActId || state.editingPracticeNumber || pendingAct.id ? "PUT" : "POST";
  try {
    const saved = await saveActRecord(pendingAct, method);
    state.editingActId = saved.id || state.editingActId;
    state.editingPracticeNumber = saved.practiceNumber || pendingAct.practiceNumber || state.editingPracticeNumber;
    state.editingApprovalStatus = "pending";
    const data = await apiRequest("/approvals/request", {
      method: "POST",
      body: JSON.stringify({
        sale_deed_id: saved.id,
        requester_note: options.requesterNote || "",
        reasons,
        risk_score: Number(shield?.score || 0),
        risk_level: shield?.risk_level || "",
        quality_check: quality || {},
        aurum_shield: shield || {},
        target_status: targetStatus,
        action: options.action || "complete"
      })
    });
    showToast(data.message || "Richiesta autorizzazione inviata", "success");
    state.editingApprovalRequestId = data.approval_request?.id || state.editingApprovalRequestId;
    if (shouldShowAurumMascot()) {
      showAurumTip("Ho inviato la richiesta autorizzazione. Responsabile o Founder potranno approvarla o rifiutarla.");
    }
    await Promise.all([
      loadApprovals().catch(() => {}),
      loadNotificationCount().catch(() => {}),
      loadArchiveScreenData({ force: true, silent: true }).catch(() => {})
    ]);
    renderArchiveGroups();
    if (document.getElementById("approvals") && canUseApprovalSectionUi()) setScreen("approvals");
    return true;
  } catch (error) {
    showToast(error.message || "Richiesta autorizzazione non inviata.", "error");
    return false;
  }
}

async function confirmAurumShieldBeforeFinalSave(shield, options = {}) {
  if (!shield || Number(shield.score || 0) <= 60) return true;
  const level = String(shield.risk_level || "");
  if (shouldRequestApprovalForShield(shield)) {
    await requestApprovalForCurrentPractice({
      ...options,
      shield,
      reasons: frontendApprovalReasons({ quality: options.quality || state.guidedQualityCheck, shield }),
      askConfirm: true
    });
    return false;
  }
  if (level === "critico" && shield.block_critical_practices && !hasApprovedApprovalForCurrentAct() && !["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo))) {
    showToast("Aurum Shield ha rilevato rischio critico: richiedi verifica a Responsabile o Founder.", "warning");
    return false;
  }
  const preview = (shield.factors || []).slice(0, 4).map((factor) => `- ${factor.message}`).join("\n");
  return window.confirm(`Aurum Shield ha rilevato rischio ${level}.\n\n${preview}\n\nVerifica i punti indicati prima di completare. Vuoi confermare comunque?`);
}

function guidedQualityMeta(status = "non_completabile") {
  return {
    completabile: { label: "COMPLETABILE", className: "quality-ok", icon: "✅" },
    attenzione: { label: "COMPLETABILE CON ATTENZIONE", className: "quality-warning", icon: "⚠️" },
    non_completabile: { label: "NON COMPLETABILE", className: "quality-error", icon: "❌" }
  }[status] || { label: "NON COMPLETABILE", className: "quality-error", icon: "❌" };
}

function guidedQualityIcon(status = "") {
  return status === "ok" ? "✅" : status === "warning" ? "⚠️" : "❌";
}

function qualityCheckDraftData(status = "completed") {
  return {
    ...currentActSnapshot(status),
    amlCashCheck: state.amlCashCheck,
    aurumShield: state.aurumShield
  };
}

function renderGuidedQualityCheck(quality = state.guidedQualityCheck) {
  if (!guidedQualityPanel || !guidedQualityList) return;
  const status = quality?.quality_status || quality?.status || "non_completabile";
  const meta = guidedQualityMeta(status);
  guidedQualityPanel.classList.remove("quality-ok", "quality-warning", "quality-error");
  guidedQualityPanel.classList.add(meta.className);
  if (guidedQualityStatusText) {
    guidedQualityStatusText.textContent = quality?.summary || "Controllo in attesa dei dati pratica.";
  }
  if (guidedQualityScore) {
    guidedQualityScore.textContent = `${Number(quality?.score || 0)}%`;
  }
  const checks = Array.isArray(quality?.checks) ? quality.checks : [];
  if (!checks.length) {
    guidedQualityList.innerHTML = '<p class="muted">Compila l\'atto per visualizzare i controlli automatici prima di completare, archiviare o stampare.</p>';
  } else {
    guidedQualityList.innerHTML = checks.map((check) => `
      <article class="guided-quality-check ${escapeHtml(check.status || "error")}">
        <div>
          <strong>${guidedQualityIcon(check.status)} ${escapeHtml(check.label || "Controllo pratica")}</strong>
          <span>${escapeHtml(check.message || "")}</span>
          ${check.status !== "ok" && check.action ? `<small>Azione: ${escapeHtml(check.action)}</small>` : ""}
        </div>
        ${check.status !== "ok" && check.target ? `<button class="ghost-button" type="button" data-quality-target="${escapeHtml(check.target)}">Vai al campo</button>` : ""}
      </article>
    `).join("");
  }
  const actions = Array.isArray(quality?.required_actions) ? quality.required_actions : [];
  if (guidedQualityActions) {
    guidedQualityActions.hidden = !actions.length;
    guidedQualityActions.innerHTML = actions.length
      ? `<strong>Azioni richieste</strong><ol>${actions.slice(0, 8).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>`
      : "";
  }
}

async function validateQualityChecklist(options = {}) {
  if (!state.authToken || !guidedQualityPanel) return null;
  state.guidedQualityLoading = true;
  try {
    const data = await apiRequest("/quality-check/validate", {
      method: "POST",
      timeoutMs: 18000,
      body: JSON.stringify({
        atto_id: options.saleDeedId || state.editingActId || "",
        draft_data: options.draftData || qualityCheckDraftData(options.status || "completed")
      })
    });
    state.guidedQualityCheck = data;
    if (data?.aurum_shield) {
      state.aurumShield = data.aurum_shield;
      renderAurumShieldCard();
    }
    renderGuidedQualityCheck(data);
    return data;
  } catch (error) {
    if (!options.silent) showToast(error.message || "Controllo qualità non disponibile.", "warning");
    return null;
  } finally {
    state.guidedQualityLoading = false;
  }
}

function scheduleQualityCheckValidation() {
  if (!state.authToken || !guidedQualityPanel) return;
  window.clearTimeout(state.guidedQualityTimer);
  state.guidedQualityTimer = window.setTimeout(() => {
    validateQualityChecklist({ silent: true, status: "completed" });
  }, 900);
}

function qualityTargetStep(target = "") {
  if (/signature|firma/i.test(target)) return 2;
  if (/capture|document|paymentCapture|preziosi-|codice-fiscale|foto/i.test(target)) return 3;
  if (/payment|saleTotal|iban/i.test(target)) return 1;
  if (/aurumShield|qualityReview|guidedQuality/i.test(target)) return 4;
  return 0;
}

function focusQualityTarget(target = "") {
  if (!target) return;
  state.step = qualityTargetStep(target);
  renderStep();
  window.setTimeout(() => {
    const element = document.querySelector(target);
    if (!element) {
      showToast("Campo collegato non visibile in questa sezione.");
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("quality-target-highlight");
    if (typeof element.focus === "function") element.focus({ preventScroll: true });
    window.setTimeout(() => element.classList.remove("quality-target-highlight"), 2200);
  }, 120);
}

function showAurumQualityGuidance(quality) {
  if (!shouldShowAurumMascot()) return;
  const firstAction = quality?.required_actions?.[0] || quality?.blocking_errors?.[0] || quality?.warnings?.[0];
  if (firstAction) showAurumTip(`Aurum ha controllato la pratica: ${firstAction}`);
}

function saleDeedValidationStatus(quality = {}) {
  return String(quality.quality_status || quality.status || "non_completabile").toLowerCase();
}

function saleDeedValidationItems(quality = {}, status = saleDeedValidationStatus(quality)) {
  const source = status === "non_completabile"
    ? (quality.blocking_errors || quality.required_actions || [])
    : (quality.warnings || []);
  return source.map((item) => {
    if (typeof item === "object") return item.message || item.action || item.label || item.title || "";
    return String(item || "");
  }).filter(Boolean);
}

function completionActionVerb(action = "complete") {
  if (action === "archive") return "archiviare";
  if (action === "print") return "stampare";
  return "completare";
}

function saleDeedValidationListMarkup(items = []) {
  return items.length
    ? `<ul class="quality-modal-list">${items.slice(0, 10).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : '<p class="muted">Controlli operativi da verificare.</p>';
}

function showSaleDeedValidationModal(quality = {}, action = "complete") {
  const status = saleDeedValidationStatus(quality);
  const items = saleDeedValidationItems(quality, status);
  return new Promise((resolve) => {
    if (!previewModal || !previewBody || !previewTitle) {
      if (status === "attenzione") {
        resolve(window.confirm(`Pratica completabile con attenzione.\n\n- ${items.slice(0, 6).join("\n- ")}\n\nVuoi ${completionActionVerb(action)} comunque?`) ? "proceed" : "cancel");
      } else {
        resolve(window.confirm(`Pratica non completabile.\n\n- ${items.slice(0, 6).join("\n- ")}\n\nVuoi salvarla come pratica sospesa?`) ? "suspend" : "back");
      }
      return;
    }

    const isBlocked = status === "non_completabile";
    previewTitle.textContent = isBlocked ? "Pratica non completabile" : "Pratica completabile con attenzione";
    previewBody.innerHTML = isBlocked
      ? `
        <section class="quality-decision-modal quality-error">
          <p>Prima di completare la pratica devi correggere questi punti:</p>
          ${saleDeedValidationListMarkup(items)}
          <div class="preview-action-stack">
            <button class="ghost-button" type="button" data-quality-completion-choice="back">Torna alla pratica</button>
            <button class="warning-button" type="button" data-quality-completion-choice="suspend">Salva come pratica sospesa</button>
          </div>
        </section>
      `
      : `
        <section class="quality-decision-modal quality-warning">
          <p>Sono presenti avvisi non bloccanti. Verifica i punti indicati prima di procedere.</p>
          ${saleDeedValidationListMarkup(items)}
          <div class="preview-action-stack">
            <button class="ghost-button" type="button" data-quality-completion-choice="cancel">Annulla</button>
            <button class="primary-button" type="button" data-quality-completion-choice="proceed">${action === "archive" ? "Archivia comunque" : "Completa comunque"}</button>
          </div>
        </section>
      `;
    previewModal.hidden = false;

    const closeButton = document.getElementById("closePreview");
    const cleanup = () => {
      previewBody.removeEventListener("click", onChoice);
      closeButton?.removeEventListener("click", onClose);
    };
    const finish = (choice) => {
      cleanup();
      previewModal.hidden = true;
      resolve(choice);
    };
    function onChoice(event) {
      const button = event.target.closest("[data-quality-completion-choice]");
      if (!button) return;
      finish(button.dataset.qualityCompletionChoice || "back");
    }
    function onClose() {
      finish(isBlocked ? "back" : "cancel");
    }

    previewBody.addEventListener("click", onChoice);
    closeButton?.addEventListener("click", onClose, { once: true });
  });
}

async function validateSaleDeedForCompletion(atto = null, options = {}) {
  const quality = await validateQualityChecklist({
    status: options.status || atto?.status || "completed",
    silent: options.silent || false,
    draftData: atto || options.draftData,
    saleDeedId: options.saleDeedId
  });
  if (!quality) return null;
  const status = saleDeedValidationStatus(quality);
  return {
    ...quality,
    status,
    quality_status: status,
    blockingErrors: quality.blocking_errors || quality.blockingErrors || [],
    warnings: quality.warnings || [],
    checks: quality.checks || [],
    requiredActions: quality.required_actions || quality.requiredActions || []
  };
}

async function ensureGuidedQualityAllows(action = "complete", options = {}) {
  const quality = await validateSaleDeedForCompletion(options.draftData || null, {
    status: options.status || "completed",
    silent: false,
    saleDeedId: options.saleDeedId
  });
  if (!quality) return false;
  const status = saleDeedValidationStatus(quality);
  if (status === "non_completabile") {
    showAurumQualityGuidance(quality);
    const choice = await showSaleDeedValidationModal(quality, action);
    if (choice === "suspend") {
      await saveCurrentPracticeAsSuspended({
        quality,
        shield: quality.aurum_shield || state.aurumShield,
        stayOnPractice: false,
        message: "Pratica salvata come sospesa"
      });
    } else {
      showToast("Impossibile completare: correggi i controlli obbligatori.", "error");
    }
    return false;
  }
  if (status === "attenzione") {
    showAurumQualityGuidance(quality);
    const choice = await showSaleDeedValidationModal(quality, action);
    return choice === "proceed";
  }
  if (shouldShowAurumMascot()) showAurumTip("La pratica è pronta. Hai completato tutti i controlli principali.");
  return true;
}

function renderAurumShieldSettings(settings = {}) {
  document.getElementById("shieldCashLimit").value = settings.cash_limit_amount ?? 500;
  document.getElementById("shieldCashWindowDays").value = settings.cash_window_days ?? 7;
  document.getElementById("shieldFrequentSalesLimit").value = settings.frequent_sales_limit ?? 3;
  document.getElementById("shieldDocumentExpiryDays").value = settings.document_expiry_warning_days ?? 30;
  document.getElementById("shieldBlockCritical").checked = Boolean(settings.block_critical_practices);
  document.getElementById("shieldDashboardAlerts").checked = settings.dashboard_alerts_enabled !== false;
  document.getElementById("shieldAiExplanation").checked = Boolean(settings.ai_explanation_enabled);
  document.getElementById("shieldFactorWeights").value = JSON.stringify(settings.factor_weights || {}, null, 2);
}

function renderAurumShieldAlerts() {
  if (!aurumShieldAlertsList) return;
  const alerts = state.aurumShieldAlerts || [];
  if (!alerts.length) {
    aurumShieldAlertsList.innerHTML = '<div class="empty-state">Nessun alert Aurum Shield aperto.</div>';
    return;
  }
  aurumShieldAlertsList.innerHTML = `
    <div class="table-row head"><span>Rischio</span><span>Atto</span><span>Cliente</span><span>Negozio</span><span>Stato</span><span>Azioni</span></div>
    ${alerts.map((alert) => `
      <div class="table-row">
        <strong>${escapeHtml(alert.severity || alert.risk_level || "medio")}</strong>
        <span>${escapeHtml(alert.practice_number || "")}</span>
        <span>${escapeHtml([alert.cliente_nome, alert.cliente_cognome].filter(Boolean).join(" ") || "Dato non inserito")}</span>
        <span>${escapeHtml(alert.store || "")}</span>
        <em>${escapeHtml(alert.status || "open")}</em>
        <select data-shield-alert-status="${escapeHtml(String(alert.id))}">
          <option value="">Aggiorna</option>
          <option value="in verifica">In verifica</option>
          <option value="risolto">Risolto</option>
          <option value="falso positivo">Falso positivo</option>
        </select>
        <small>${escapeHtml(alert.description || "")}</small>
      </div>
    `).join("")}
  `;
}

async function loadAurumShieldAdmin() {
  const [settingsData, alertsData] = await Promise.all([
    apiRequest("/aurum-shield/settings"),
    apiRequest("/aurum-shield/alerts")
  ]);
  state.aurumShieldSettings = settingsData.settings || {};
  state.aurumShieldAlerts = alertsData.alerts || [];
  renderAurumShieldSettings(state.aurumShieldSettings);
  renderAurumShieldAlerts();
}

async function saveAurumShieldSettings(event) {
  event.preventDefault();
  let weights = {};
  try {
    weights = JSON.parse(document.getElementById("shieldFactorWeights").value || "{}");
  } catch {
    showToast("Pesi fattori rischio non validi: controlla il JSON.", "error");
    return;
  }
  const data = await apiRequest("/aurum-shield/settings", {
    method: "PUT",
    body: JSON.stringify({
      cash_limit_amount: Number(document.getElementById("shieldCashLimit").value || 500),
      cash_window_days: Number(document.getElementById("shieldCashWindowDays").value || 7),
      frequent_sales_limit: Number(document.getElementById("shieldFrequentSalesLimit").value || 3),
      document_expiry_warning_days: Number(document.getElementById("shieldDocumentExpiryDays").value || 30),
      block_critical_practices: document.getElementById("shieldBlockCritical").checked,
      dashboard_alerts_enabled: document.getElementById("shieldDashboardAlerts").checked,
      ai_explanation_enabled: document.getElementById("shieldAiExplanation").checked,
      factor_weights: weights
    })
  });
  state.aurumShieldSettings = data.settings || {};
  renderAurumShieldSettings(state.aurumShieldSettings);
  showToast("Configurazione Aurum Shield salvata.", "success");
}

function renderBackups() {
  if (!backupsList) return;
  if (!state.backups.length) {
    backupsList.innerHTML = '<div class="empty-state">Nessun backup registrato.</div>';
    return;
  }
  backupsList.innerHTML = `
    <div class="table-row head"><span>Codice</span><span>Data/ora</span><span>Creato da</span><span>Stato</span><span>Verifica</span><span>Restore</span><span>Dimensione</span><span>Azioni</span></div>
    ${state.backups.map((backup) => `
      <div class="table-row">
        <strong>${escapeHtml(backup.backup_code || backup.id || "Backup")}</strong>
        <span>${escapeHtml(backup.created_at ? new Date(backup.created_at).toLocaleString("it-IT") : "Dato non inserito")}</span>
        <span>${escapeHtml(backup.created_by_name || backup.created_by_role || "Sistema")}</span>
        ${backupStatusMarkup(backup.status)}
        ${backupStatusMarkup(backup.verification_status || "not_verified")}
        ${backupStatusMarkup(backup.restore_test_status || "not_tested")}
        <span>${formatBytes(backup.file_size || backup.dimensione_bytes || 0)}</span>
        <div class="row-actions">
          <button type="button" data-view-backup="${escapeHtml(String(backup.id))}">Visualizza</button>
          <button type="button" data-verify-backup="${escapeHtml(String(backup.id))}">Verifica</button>
          ${isFounder() ? `<button type="button" data-test-restore-backup="${escapeHtml(String(backup.id))}">Test restore</button>` : ""}
          ${isFounder() && backup.download_disponibile ? `<button type="button" data-download-backup="${escapeHtml(String(backup.id))}">Download</button>` : ""}
          ${isFounder() ? `<button class="danger-button" type="button" data-delete-backup="${escapeHtml(String(backup.id))}">Elimina</button>` : ""}
        </div>
      </div>
    `).join("")}
  `;
}

function backupStatusMarkup(status = "") {
  const normalized = String(status || "").toLowerCase();
  const ok = ["completed", "verified", "passed"].includes(normalized);
  const bad = ["failed", "deleted"].includes(normalized);
  const running = ["running", "pending"].includes(normalized);
  const cls = ok ? "done" : bad ? "warning" : running ? "status-draft" : "";
  return `<em class="${cls}">${escapeHtml(status || "not_verified")}</em>`;
}

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return "Dato non inserito";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function viewBackup(id) {
  const data = await apiRequest(`/backups/${encodeURIComponent(id)}`);
  const backup = data.backup || {};
  previewTitle.textContent = "Dettaglio backup";
  const manifest = backup.manifest || backup.metadata?.manifest || {};
  const logs = backup.logs || [];
  previewBody.innerHTML = `
    <section class="customer-copy-options">
      <h3>Backup ${escapeHtml(String(backup.backup_code || backup.id || ""))}</h3>
      <p>Creato il: ${escapeHtml(backup.created_at ? new Date(backup.created_at).toLocaleString("it-IT") : "Dato non inserito")}</p>
      <p>Creato da: ${escapeHtml(backup.created_by_name || backup.created_by_role || "Sistema")}</p>
      <p>Tipo: ${escapeHtml(backup.backup_type || "manual_full")} · Stato: ${escapeHtml(backup.status || "Dato non inserito")}</p>
      <p>Verifica: ${escapeHtml(backup.verification_status || "not_verified")} · Test restore: ${escapeHtml(backup.restore_test_status || "not_tested")}</p>
      <p>Dimensione: ${escapeHtml(formatBytes(backup.file_size))}</p>
      <p>Checksum SHA256: ${escapeHtml(backup.checksum_sha256 || "Dato non inserito")}</p>
      ${backup.error_message ? `<p class="warning">Errore: ${escapeHtml(backup.error_message)}</p>` : ""}
      <h4>Sezioni incluse</h4>
      <p>${escapeHtml((manifest.included_sections || []).join(", ") || "Dato non inserito")}</p>
      <h4>Manifest</h4>
      <pre class="backup-detail-json">${escapeHtml(JSON.stringify(manifest, null, 2))}</pre>
      <h4>Log backup</h4>
      <div class="activity-list">${logs.length ? logs.map((log) => `
        <article class="activity-row">
          <strong>${escapeHtml(log.level || "info")}</strong>
          <span>${escapeHtml(log.message || "")}</span>
          <small>${escapeHtml(formatDateTime(log.created_at))}</small>
        </article>
      `).join("") : '<div class="empty-state">Nessun log registrato.</div>'}</div>
    </section>
  `;
  previewModal.hidden = false;
}

async function deleteBackup(id) {
  if (!isFounder() || !id) return;
  if (!window.confirm("Vuoi eliminare questo backup dall'elenco operativo? Il file fisico resta protetto sul server.")) return;
  await apiRequest(`/backups/${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadBackups();
  showToast("Backup eliminato correttamente", "success");
}

async function loadBackups() {
  if (!canManageBackupsUi()) return;
  try {
    const data = await apiRequest("/backups");
    state.backups = data.backups || [];
    renderBackups();
  } catch (error) {
    if (backupsList) backupsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Backup non caricati.")}</div>`;
  }
}

async function runBackupNow() {
  if (!canManageBackupsUi()) return;
  try {
    showLoading("Backup in corso...");
    const data = await apiRequest("/backups/create", { method: "POST", body: JSON.stringify({}), timeoutMs: 1200000 });
    await loadBackups();
    const backup = data.backup || {};
    showToast(backup.status === "completed" ? "Backup creato correttamente" : backup.error_message || "Backup fallito.", backup.status === "completed" ? "success" : "error");
  } catch (error) {
    showToast(error.message || "Backup non riuscito.");
  } finally {
    hideLoading();
  }
}

async function verifyBackup(id) {
  if (!canManageBackupsUi() || !id) return;
  try {
    showLoading("Verifica integrità backup...");
    const data = await apiRequest(`/backups/${encodeURIComponent(id)}/verify`, { method: "POST", body: JSON.stringify({}), timeoutMs: 300000 });
    await loadBackups();
    showToast(data.backup?.verification_status === "verified" ? "Verifica integrità completata" : "Checksum non corrispondente", data.backup?.verification_status === "verified" ? "success" : "error");
  } catch (error) {
    showToast(error.message || "Verifica backup non riuscita.");
  } finally {
    hideLoading();
  }
}

async function testRestoreBackup(id) {
  if (!isFounder() || !id) return;
  if (!window.confirm("Avviare test restore su database temporaneo sicuro? Il database di produzione non verrà modificato.")) return;
  try {
    showLoading("Test restore in corso...");
    const data = await apiRequest(`/backups/${encodeURIComponent(id)}/test-restore`, { method: "POST", body: JSON.stringify({}), timeoutMs: 1200000 });
    await loadBackups();
    showToast(data.backup?.restore_test_status === "passed" ? "Test restore completato con successo" : "Test restore fallito: controllare log", data.backup?.restore_test_status === "passed" ? "success" : "error");
  } catch (error) {
    showToast(error.message || "Test restore fallito: controllare log");
  } finally {
    hideLoading();
  }
}

async function downloadBackup(id) {
  if (!isFounder() || !id) return;
  try {
    showLoading("Download backup...");
    const response = await fetch(`${apiBase}/backups/${encodeURIComponent(id)}/download`, {
      headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {},
      cache: "no-store"
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Download non disponibile");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || `oroactive-backup-${id}.tar.gz`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showToast(error.message || "Download backup non riuscito.");
  } finally {
    hideLoading();
  }
}

function renderStores() {
  if (!storesList) return;
  if (!state.stores.length) {
    storesList.innerHTML = '<div class="empty-state">Nessun negozio configurato.</div>';
    return;
  }
  storesList.innerHTML = `
    <div class="table-row head"><span>Codice</span><span>Negozio</span><span>Città</span><span>Provincia</span><span>Stato</span><span>Azioni</span></div>
    ${state.stores.map((store) => `
      <div class="table-row">
        <span>${escapeHtml(store.codice || "")}</span>
        <strong>${escapeHtml(store.nome || "")}</strong>
        <span>${escapeHtml(store.citta || "")}</span>
        <span>${escapeHtml(store.provincia || "")}</span>
        <em class="${store.attivo ? "status-completed" : "status-draft"}">${store.attivo ? "Attivo" : "Non attivo"}</em>
        <span class="row-actions"><button type="button" data-edit-store="${store.id}">Modifica</button><button class="warning-button" type="button" data-toggle-store="${store.id}">${store.attivo ? "Disattiva" : "Attiva"}</button></span>
      </div>
    `).join("")}
  `;
}

async function loadStores() {
  try {
    const data = await apiRequest("/negozi");
    state.stores = data.stores || [];
    populateStoreSelectors();
    renderStores();
  } catch (error) {
    if (storesList) storesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Negozi non caricati.")}</div>`;
  }
}

function populateStoreSelectors() {
  const stores = state.stores.length ? state.stores : [
    { nome: "Busto Arsizio", codice: "BUSTO" },
    { nome: "Cassano Magnago", codice: "CASSANO" },
    { nome: "Legnano", codice: "LEGNANO" }
  ];
  const currentValues = {
    userStore: document.getElementById("userStore")?.value,
    archive: document.getElementById("archiveStoreFilter")?.value,
    fusion: document.getElementById("fusionStoreFilter")?.value,
    storeCode: document.getElementById("storeCode")?.value
  };
  const userStore = document.getElementById("userStore");
  if (userStore) {
    userStore.innerHTML = '<option>Tutti</option>' + stores.map((store) => `<option>${escapeHtml(store.nome)}</option>`).join("");
    if (currentValues.userStore) userStore.value = currentValues.userStore;
  }
  ["archiveStoreFilter", "fusionStoreFilter"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const includeAll = id === "archiveStoreFilter" || id === "fusionStoreFilter";
    select.innerHTML = `${includeAll ? "<option>Tutti</option>" : ""}${stores.map((store) => `<option>${escapeHtml(store.nome)}</option>`).join("")}`;
    const previous = id === "archiveStoreFilter" ? currentValues.archive : currentValues.fusion;
    if (previous) select.value = previous;
  });
  const storeCodeSelect = document.getElementById("storeCode");
  if (storeCodeSelect) {
    storeCodeSelect.innerHTML = stores.map((store) => `<option value="${escapeHtml(store.codice)}">${escapeHtml(store.nome)}</option>`).join("");
    if (currentValues.storeCode) storeCodeSelect.value = currentValues.storeCode;
  }
  configureUserFormPermissions();
}

async function loadAvailableStores() {
  try {
    const data = await apiRequest("/negozi");
    state.stores = data.stores || [];
    populateStoreSelectors();
  } catch {
    populateStoreSelectors();
  }
}

function resetStoreForm() {
  storeForm?.reset();
  document.getElementById("storeId").value = "";
  document.getElementById("storeActiveInput").checked = true;
}

async function saveStore(event) {
  event.preventDefault();
  if (!isFounder()) return;
  const id = document.getElementById("storeId").value;
  const payload = {
    nome: document.getElementById("storeNameInput").value.trim(),
    codice: document.getElementById("storeCodeInput").value.trim().toUpperCase(),
    indirizzo: document.getElementById("storeAddressInput").value.trim(),
    citta: document.getElementById("storeCityInput").value.trim(),
    provincia: document.getElementById("storeProvinceInput").value.trim().toUpperCase(),
    telefono: document.getElementById("storePhoneInput").value.trim(),
    email: document.getElementById("storeEmailInput").value.trim(),
    attivo: document.getElementById("storeActiveInput").checked
  };
  try {
    await apiRequest(id ? `/negozi/${id}` : "/negozi", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    resetStoreForm();
    await loadStores();
    showToast("Negozio salvato.");
  } catch (error) {
    showToast(error.message || "Negozio non salvato.");
  }
}

function editStore(id) {
  const store = state.stores.find((item) => String(item.id) === String(id));
  if (!store) return;
  document.getElementById("storeId").value = store.id;
  document.getElementById("storeNameInput").value = store.nome || "";
  document.getElementById("storeCodeInput").value = store.codice || "";
  document.getElementById("storeAddressInput").value = store.indirizzo || "";
  document.getElementById("storeCityInput").value = store.citta || "";
  document.getElementById("storeProvinceInput").value = store.provincia || "";
  document.getElementById("storePhoneInput").value = store.telefono || "";
  document.getElementById("storeEmailInput").value = store.email || "";
  document.getElementById("storeActiveInput").checked = store.attivo !== false;
}

async function toggleStore(id) {
  const store = state.stores.find((item) => String(item.id) === String(id));
  if (!store) return;
  await apiRequest(`/negozi/${id}`, { method: "PUT", body: JSON.stringify({ attivo: !store.attivo }) });
  await loadStores();
}

function renderAntifraud() {
  if (!antifraudList) return;
  if (!state.antifraudAlerts.length) {
    antifraudList.innerHTML = '<div class="empty-state">Nessun alert antifrode presente.</div>';
    return;
  }
  antifraudList.innerHTML = `
    <div class="table-row head"><span>Livello</span><span>Tipo</span><span>Atto</span><span>Cliente</span><span>Stato</span><span>Azioni</span></div>
    ${state.antifraudAlerts.map((alert) => `
      <div class="table-row">
        <strong>${escapeHtml(alert.livello || alert.severity || "medio")}</strong>
        <span>${escapeHtml(alert.tipo_alert || alert.title || "")}</span>
        <span>${escapeHtml(alert.practice_number || "")}</span>
        <span>${escapeHtml([alert.cliente_nome, alert.cliente_cognome].filter(Boolean).join(" ") || "Dato non inserito")}</span>
        <em>${escapeHtml(alert.stato || alert.status || "nuovo")}</em>
        <select ${alert.source === "aurum_shield" ? `data-shield-alert-status="${escapeHtml(String(alert.id))}"` : `data-antifraud-status="${escapeHtml(String(alert.id))}"`}>
          <option value="">Aggiorna</option>
          <option value="in verifica">In verifica</option>
          <option value="risolto">Risolto</option>
          <option value="falso positivo">Falso positivo</option>
        </select>
        <small>${escapeHtml(alert.descrizione || alert.description || "")}</small>
      </div>
    `).join("")}
  `;
}

async function loadAntifraud() {
  try {
    const [data, shield] = await Promise.all([
      apiRequest("/antifrode"),
      apiRequest("/aurum-shield/alerts").catch(() => ({ alerts: [] }))
    ]);
    const shieldAlerts = (shield.alerts || []).map((alert) => ({ ...alert, source: "aurum_shield" }));
    state.antifraudAlerts = [...(data.alerts || []), ...shieldAlerts];
    renderAntifraud();
  } catch (error) {
    if (antifraudList) antifraudList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Antifrode non caricato.")}</div>`;
  }
}

async function scanAntifraud() {
  try {
    showLoading("Analisi antifrode in corso...");
    const data = await apiRequest("/antifrode/scan", { method: "POST", body: JSON.stringify({}) });
    await loadAntifraud();
    showToast(`Analisi completata. Nuovi alert: ${Number(data.created || 0)}.`);
  } catch (error) {
    showToast(error.message || "Analisi antifrode non riuscita.");
  } finally {
    hideLoading();
  }
}

function courseProgressFor(courseId) {
  return state.courseProgress.find((item) => String(item.course_id) === String(courseId)) || {};
}

function operatorAcademyLevel() {
  const completed = (state.courseProgress || []).filter((item) => ["completato", "certificato"].includes(String(item.status || "").toLowerCase())).length;
  const badges = state.courseBadges.length;
  const certificates = state.courseCertificates.length;
  const score = completed * 2 + badges * 3 + certificates * 4;
  if (score >= 40) return "Master OroActive";
  if (score >= 28) return "Responsabile";
  if (score >= 18) return "Esperto";
  if (score >= 10) return "Senior";
  if (score >= 4) return "Operatore";
  return "Junior";
}

function bindTrainingCourseEditFormElements() {
  trainingCourseForm = document.getElementById("trainingCourseForm");
  trainingCourseReset = document.getElementById("trainingCourseReset");
  trainingCourseSaveButton = document.getElementById("trainingCourseSaveButton");
  trainingCoursePreviewButton = document.getElementById("trainingCoursePreviewButton");
  trainingCourseFile = document.getElementById("trainingCourseFile");
  trainingCourseThumbnailFile = document.getElementById("trainingCourseThumbnailFile");
  trainingCourseVideoFile = document.getElementById("trainingCourseVideoFile");
  trainingCoursePdfFile = document.getElementById("trainingCoursePdfFile");
  if (trainingCourseForm && !trainingCourseForm.dataset.bound) {
    trainingCourseForm.addEventListener("submit", createTrainingCourse);
    trainingCourseForm.dataset.bound = "true";
  }
  if (trainingCourseReset && !trainingCourseReset.dataset.bound) {
    trainingCourseReset.addEventListener("click", resetTrainingCourseFormValues);
    trainingCourseReset.dataset.bound = "true";
  }
  if (trainingCoursePreviewButton && !trainingCoursePreviewButton.dataset.bound) {
    trainingCoursePreviewButton.addEventListener("click", () => {
      void previewCurrentCourseDraft().catch((error) => showToast(error.message || "Anteprima corso non disponibile.", "error"));
    });
    trainingCoursePreviewButton.dataset.bound = "true";
  }
}

function ensureTrainingCourseEditForm() {
  if (!trainingCourseEditHost || !trainingCourseEditTemplate) return null;
  if (!document.getElementById("trainingCourseForm")) {
    const fragment = trainingCourseEditTemplate.content.cloneNode(true);
    trainingCourseEditHost.replaceChildren(fragment);
  }
  bindTrainingCourseEditFormElements();
  return trainingCourseForm;
}

function removeTrainingCourseEditForm() {
  trainingCourseEditHost?.replaceChildren();
  bindTrainingCourseEditFormElements();
}

function resetTrainingCourseFormValues() {
  if (!trainingCourseForm) return;
  trainingCourseForm.reset();
  document.getElementById("trainingCourseId").value = "";
  document.getElementById("trainingCourseActive").checked = true;
  document.getElementById("trainingCourseCertification").checked = true;
  if (trainingCourseFile) trainingCourseFile.value = "";
  if (trainingCourseThumbnailFile) trainingCourseThumbnailFile.value = "";
  if (trainingCourseVideoFile) trainingCourseVideoFile.value = "";
  if (trainingCoursePdfFile) trainingCoursePdfFile.value = "";
  if (trainingCourseSaveButton) trainingCourseSaveButton.textContent = "Salva modifiche";
  if (trainingCoursePreviewButton) trainingCoursePreviewButton.hidden = true;
  trainingCourseForm.hidden = true;
  removeTrainingCourseEditForm();
}

function renderCourseSummary() {
  if (!courseSummary) return;
  courseSummary.innerHTML = `<span>Livello ${escapeHtml(operatorAcademyLevel())}</span><strong>Test finali</strong><small>Badge e certificazioni</small>`;
}

const ACADEMY_TAB_LABELS = {
  path: "Il mio percorso",
  catalog: "Catalogo Academy",
  competencies: "Matrice competenze",
  certifications: "Certificazioni",
  badges: "Badge",
  exams: "Esami",
  practicals: "Prove pratiche",
  simulations: "Laboratorio simulazioni",
  history: "Storico formazione",
  operatorTraining: "Training Operatore",
  management: "Gestione Academy",
  dashboard: "Dashboard formazione"
};

function updateAcademyLocation() {
  if (!courseCurrentLocation) return;
  courseCurrentLocation.textContent = `OroActive Academy / ${ACADEMY_TAB_LABELS[state.courseActiveTab] || ACADEMY_TAB_LABELS.catalog}`;
}

function trainingDifficultyLabel(difficulty = "") {
  return {
    base: "Base",
    intermedio: "Intermedio",
    avanzato: "Avanzato",
    master: "Master"
  }[String(difficulty || "").toLowerCase()] || "Base";
}

function renderTrainingScenarioCard(scenario = {}) {
  return `
    <article class="operator-training-card">
      <div>
        <span class="training-mode-badge">${escapeHtml(trainingDifficultyLabel(scenario.difficulty))}</span>
        <h3>${escapeHtml(scenario.title || "Scenario Training")}</h3>
        <p>${escapeHtml(scenario.description || "")}</p>
        <small>Durata stimata ${escapeHtml(scenario.duration || "10 min")} · ${escapeHtml(scenario.objective || "Esercitazione operativa")}</small>
      </div>
      <div class="training-card-actions">
        <button class="primary-button" type="button" data-start-operator-training="${escapeHtml(scenario.id)}">Avvia training</button>
      </div>
    </article>
  `;
}

function trainingResultRow(result = {}) {
  const passed = result.passed === true;
  return `
    <article class="operator-training-result ${passed ? "passed" : "failed"}">
      <span>${escapeHtml(formatDateTime(result.completed_at || result.started_at || ""))}</span>
      <strong>${escapeHtml(result.scenario_title || "Training Operatore")}</strong>
      <em>${Number(result.score || 0)}/${Number(result.max_score || 100)} · ${passed ? "Superato" : "Da ripetere"}</em>
      <button type="button" data-open-training-result="${escapeHtml(String(result.id))}">Dettaglio</button>
    </article>
  `;
}

function trainingFormValue(name) {
  const element = document.querySelector(`[data-training-field="${name}"]`);
  if (!element) return "";
  if (element.type === "checkbox") return element.checked;
  return element.value;
}

function currentTrainingFormData() {
  return {
    name: trainingFormValue("name"),
    surname: trainingFormValue("surname"),
    fiscalCode: trainingFormValue("fiscalCode"),
    birthDate: trainingFormValue("birthDate"),
    birthPlace: trainingFormValue("birthPlace"),
    birthProvince: trainingFormValue("birthProvince"),
    address: trainingFormValue("address"),
    residenceProvince: trainingFormValue("residenceProvince"),
    documentType: trainingFormValue("documentType"),
    documentNumber: trainingFormValue("documentNumber"),
    documentExpiry: trainingFormValue("documentExpiry"),
    paymentMethod: trainingFormValue("paymentMethod"),
    amount: Number(trainingFormValue("amount") || 0),
    receiptUploaded: trainingFormValue("receiptUploaded"),
    preciousDescription: trainingFormValue("preciousDescription"),
    metal: trainingFormValue("metal"),
    title: trainingFormValue("title"),
    weight: Number(trainingFormValue("weight") || 0),
    signaturesComplete: trainingFormValue("signaturesComplete"),
    qualityCheckDone: trainingFormValue("qualityCheckDone"),
    riskAcknowledged: trainingFormValue("riskAcknowledged"),
    authorizationRequested: trainingFormValue("authorizationRequested"),
    aurumHelpUsed: trainingFormValue("aurumHelpUsed"),
    trustPackDemoPrepared: trainingFormValue("trustPackDemoPrepared")
  };
}

function renderActiveOperatorTraining() {
  const session = state.activeTrainingSession;
  const data = state.activeTrainingData || {};
  if (!session) return "";
  return `
    <section class="operator-training-live" data-training-session="${escapeHtml(String(session.id))}">
      <div class="training-live-header">
        <span class="training-mode-badge">MODALITÀ TRAINING — dati simulati</span>
        <div>
          <h3>${escapeHtml(session.scenario_title || "Training Operatore")}</h3>
          <p>Questa pratica non crea atti reali, clienti CRM, giacenza, fusioni, PDF cliente o Trust Pack reali.</p>
        </div>
      </div>
      <div class="operator-training-grid">
        <label>Nome demo <input data-training-field="name" value="${escapeHtml(data.name || "")}"></label>
        <label>Cognome demo <input data-training-field="surname" value="${escapeHtml(data.surname || "")}"></label>
        <label>Codice fiscale demo <input data-training-field="fiscalCode" value="${escapeHtml(data.fiscalCode || "")}"></label>
        <label>Data nascita <input type="date" data-training-field="birthDate" value="${escapeHtml(data.birthDate || "")}"></label>
        <label>Luogo nascita <input data-training-field="birthPlace" value="${escapeHtml(data.birthPlace || "")}"></label>
        <label>Provincia nascita <input data-training-field="birthProvince" value="${escapeHtml(data.birthProvince || "")}"></label>
        <label>Residenza <input data-training-field="address" value="${escapeHtml(data.address || "")}"></label>
        <label>Provincia residenza <input data-training-field="residenceProvince" value="${escapeHtml(data.residenceProvince || "")}"></label>
        <label>Tipo documento <input data-training-field="documentType" value="${escapeHtml(data.documentType || "")}"></label>
        <label>Numero documento demo <input data-training-field="documentNumber" value="${escapeHtml(data.documentNumber || "")}"></label>
        <label>Scadenza documento <input type="date" data-training-field="documentExpiry" value="${escapeHtml(data.documentExpiry || "")}"></label>
        <label>Metodo pagamento
          <select data-training-field="paymentMethod">
            ${["Bonifico", "Contanti", "Assegno"].map((method) => `<option ${String(data.paymentMethod || "") === method ? "selected" : ""}>${method}</option>`).join("")}
          </select>
        </label>
        <label>Importo demo <input type="number" min="0" step="0.01" data-training-field="amount" value="${escapeHtml(String(data.amount || 0))}"></label>
        <label>Oggetto prezioso <input data-training-field="preciousDescription" value="${escapeHtml(data.preciousDescription || "")}"></label>
        <label>Metallo <input data-training-field="metal" value="${escapeHtml(data.metal || "")}"></label>
        <label>Titolo/caratura <input data-training-field="title" value="${escapeHtml(data.title || "")}"></label>
        <label>Peso grammi <input type="number" min="0" step="0.01" data-training-field="weight" value="${escapeHtml(String(data.weight || 0))}"></label>
      </div>
      <div class="operator-training-checks">
        <label class="inline-check"><input type="checkbox" data-training-field="receiptUploaded" ${data.receiptUploaded ? "checked" : ""}> Contabile demo caricata</label>
        <label class="inline-check"><input type="checkbox" data-training-field="signaturesComplete" ${data.signaturesComplete ? "checked" : ""}> Firme demo complete</label>
        <label class="inline-check"><input type="checkbox" data-training-field="qualityCheckDone" ${data.qualityCheckDone ? "checked" : ""}> Controllo qualità demo eseguito</label>
        <label class="inline-check"><input type="checkbox" data-training-field="riskAcknowledged" ${data.riskAcknowledged ? "checked" : ""}> Warning Aurum Shield demo gestito</label>
        <label class="inline-check"><input type="checkbox" data-training-field="authorizationRequested" ${data.authorizationRequested ? "checked" : ""}> Autorizzazione superiore simulata richiesta</label>
        <label class="inline-check"><input type="checkbox" data-training-field="aurumHelpUsed" ${data.aurumHelpUsed ? "checked" : ""}> Ho usato i suggerimenti Aurum</label>
        <label class="inline-check"><input type="checkbox" data-training-field="trustPackDemoPrepared" ${data.trustPackDemoPrepared ? "checked" : ""}> Trust Pack demo preparato senza invio reale</label>
      </div>
      <div class="operator-training-aurum">
        <strong>Aurum</strong>
        <span>${escapeHtml(session.metadata?.aurum_tip || "Controlla i dati demo e completa solo quando la pratica è coerente.")}</span>
      </div>
      <div class="training-card-actions">
        <button type="button" data-save-operator-training="${escapeHtml(String(session.id))}">Salva progresso demo</button>
        <button class="primary-button" type="button" data-complete-operator-training="${escapeHtml(String(session.id))}">Completa training</button>
        <button type="button" data-cancel-operator-training>Chiudi training</button>
      </div>
    </section>
  `;
}

function renderOperatorTraining() {
  const ownResults = state.operatorTrainingResults || [];
  const teamResults = state.operatorTeamTrainingResults || [];
  const average = ownResults.length ? Math.round(ownResults.reduce((sum, item) => sum + Number(item.score || 0), 0) / ownResults.length) : 0;
  trainingList.innerHTML = `
    <section class="operator-training-shell">
      <div class="operator-training-header">
        <div>
          <span class="training-mode-badge">TRAINING — nessun effetto reale</span>
          <h3>Training Operatore</h3>
          <p>Simula pratiche di vendita, qualità, Aurum Shield e Trust Pack demo senza creare atti reali o modificare dashboard, CRM, giacenza e fusioni.</p>
        </div>
        <div class="operator-training-score">
          <span>Punteggio medio</span>
          <strong>${average}/100</strong>
          <small>${ownResults.length} training svolti</small>
        </div>
      </div>
      ${renderActiveOperatorTraining()}
      <div class="operator-training-section">
        <h4>Scenari disponibili</h4>
        <div class="operator-training-scenarios">
          ${(state.trainingScenarios || []).map(renderTrainingScenarioCard).join("") || '<div class="empty-state">Nessuno scenario training disponibile.</div>'}
        </div>
      </div>
      <div class="operator-training-results-grid">
        <section>
          <h4>Il mio storico training</h4>
          <div class="operator-training-results">
            ${ownResults.length ? ownResults.map(trainingResultRow).join("") : '<div class="empty-state">Non hai ancora completato training.</div>'}
          </div>
        </section>
        <section class="control-only">
          <h4>Risultati team</h4>
          <div class="operator-training-results">
            ${teamResults.length ? teamResults.map(trainingResultRow).join("") : '<div class="empty-state">Nessun risultato team disponibile.</div>'}
          </div>
        </section>
      </div>
    </section>
  `;
}

function qualificationStateClass(value = "") {
  const normalized = String(value || "").toLowerCase();
  if (/completed|certified|active|approved|abilitato|superato|sbloccato|passed/.test(normalized)) return "good";
  if (/expired|revoked|rejected|failed|scaduto|revocato|non_enabled|not_enabled/.test(normalized)) return "bad";
  if (/pending|progress|review|warning|shadow|warn|attesa|formazione|practical/.test(normalized)) return "warn";
  return "neutral";
}

function renderQualificationStatus(value = "", label = "") {
  const text = label || value || "Non iniziato";
  return `<span class="qualification-status ${qualificationStateClass(value || text)}">${escapeHtml(text)}</span>`;
}

function renderMyLearningPath() {
  const path = state.academyLearningPath || {};
  const courses = Array.isArray(path.mandatoryCourses) ? path.mandatoryCourses : [];
  const settings = state.academyQualificationSettings || {};
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Qualificazione operativa</span>
        <h3>Il mio percorso</h3>
        <p>${escapeHtml(path.nextObjective || state.academyNextObjective || "Percorso formativo in preparazione.")}</p>
        <div class="academy-course-meta">
          <span>Ruolo ${escapeHtml(path.currentRole || state.currentUser?.ruolo || "utente")}</span>
          <span>${escapeHtml(path.assignedPath?.name || "Percorso non assegnato")}</span>
          <span>Modalità ${escapeHtml(settings.mode || "shadow")}</span>
        </div>
      </article>
      <div class="academy-path-grid">
        ${courses.length ? courses.map((course, index) => `
          <article class="academy-qualification-card">
            <span class="course-pill">${String(index + 1).padStart(2, "0")}</span>
            <h4>${escapeHtml(course.title || course.code || "Corso")}</h4>
            <p>${escapeHtml(course.code || "")}</p>
            <div class="academy-course-meta">
              ${renderQualificationStatus(course.state, course.completed ? "Completato" : course.locked ? "Bloccato" : course.state || "Da completare")}
              ${course.practical_required ? renderQualificationStatus(course.practical_approved ? "approved" : "pending", course.practical_approved ? "Pratica approvata" : "Pratica richiesta") : "<span>Solo teoria</span>"}
              ${renderQualificationStatus(course.certification_status, `Certificazione ${course.certification_status || "assente"}`)}
            </div>
          </article>
        `).join("") : '<div class="empty-state">Nessun percorso assegnato. Il Founder può assegnare o verificare il ruolo dell’utente.</div>'}
      </div>
    </section>
  `;
}

function renderCompetencyMatrix() {
  const competencies = state.academyCompetencies || [];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Matrice competenze</span>
        <h3>Competenze operative</h3>
        <p>Le competenze sono distinte dalle autorizzazioni operative: un corso superato non abilita automaticamente funzioni sensibili.</p>
      </article>
      <div class="competency-matrix" role="table" aria-label="Matrice competenze OroActive">
        <div class="competency-row competency-head" role="row">
          <span>Competenza</span>
          <span>Teoria</span>
          <span>Pratica</span>
          <span>Certificazione</span>
          <span>Operatività</span>
        </div>
        ${competencies.length ? competencies.map((item) => `
          <article class="competency-row" role="row">
            <span><strong>${escapeHtml(item.name || item.competencyCode)}</strong><small>${escapeHtml(item.competencyCode || "")}</small></span>
            <span>${renderQualificationStatus(item.theoryPassed ? "passed" : "pending", item.theoryPassed ? "Superata" : "Da sostenere")}</span>
            <span>${renderQualificationStatus(item.practicalRequired ? (item.practicalApproved ? "approved" : "pending") : "neutral", item.practicalRequired ? (item.practicalApproved ? "Approvata" : "Da sostenere") : "Non prevista")}</span>
            <span>${renderQualificationStatus(item.certificationStatus, item.certificationStatus || "Assente")}</span>
            <span>${renderQualificationStatus(item.operationalStatus, item.operationalStatus === "certified" ? "Certificato" : "Non abilitato")}</span>
          </article>
        `).join("") : '<div class="empty-state">Matrice competenze non disponibile.</div>'}
      </div>
    </section>
  `;
}

function renderAcademyExams() {
  const attempts = state.academyExamHistory || [];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Esami teorici</span>
        <h3>Storico tentativi</h3>
        <p>Gli esami vengono corretti lato backend. Le risposte corrette non sono inviate al dispositivo prima della consegna.</p>
      </article>
      <div class="academy-path-grid">
        ${attempts.length ? attempts.map((attempt) => `
          <article class="academy-qualification-card">
            <h4>${escapeHtml(attempt.course_title || "Esame Academy")}</h4>
            <p>${escapeHtml(formatDateTime(attempt.submitted_at || attempt.started_at || ""))}</p>
            <div class="academy-course-meta">
              ${renderQualificationStatus(attempt.passed ? "passed" : attempt.status, attempt.passed ? "Superato" : attempt.status || "In corso")}
              ${attempt.score !== null && attempt.score !== undefined ? `<span>Punteggio ${escapeHtml(String(attempt.score))}%</span>` : ""}
            </div>
          </article>
        `).join("") : '<div class="empty-state">Nessun tentativo esame registrato.</div>'}
      </div>
    </section>
  `;
}

function renderPracticalAssessments() {
  const assessments = state.academyPracticalAssessments || [];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Prove pratiche</span>
        <h3>Valutazioni operative</h3>
        <p>Le prove pratiche richiedono valutazione di Responsabile, Supervisore o Founder qualificato.</p>
      </article>
      <div class="academy-path-grid">
        ${assessments.length ? assessments.map((assessment) => `
          <article class="academy-qualification-card">
            <h4>${escapeHtml(assessment.title || assessment.assessment_title || "Prova pratica")}</h4>
            <p>${escapeHtml(assessment.course_title || assessment.description || "")}</p>
            <div class="academy-course-meta">
              ${renderQualificationStatus(assessment.latest_status || "not_started", assessment.latest_status || "Da richiedere")}
              ${assessment.total_score !== null && assessment.total_score !== undefined ? `<span>Punteggio ${escapeHtml(String(assessment.total_score))}/100</span>` : ""}
            </div>
            <div class="training-card-actions">
              <button type="button" data-request-practical-assessment="${escapeHtml(String(assessment.id))}">Richiedi prova pratica</button>
            </div>
          </article>
        `).join("") : '<div class="empty-state">Nessuna prova pratica configurata.</div>'}
      </div>
    </section>
  `;
}

function renderSimulationLab() {
  const scenarios = state.academySimulationScenarios || [];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">SIMULAZIONE — dati non reali</span>
        <h3>Laboratorio simulazioni</h3>
        <p>Scenari fittizi per allenare controlli, decisioni ed escalation senza creare atti, clienti, giacenza o movimenti reali.</p>
      </article>
      <div class="academy-path-grid">
        ${scenarios.length ? scenarios.map((scenario) => `
          <article class="academy-qualification-card simulation-card">
            <span class="training-mode-badge">${escapeHtml(trainingDifficultyLabel(scenario.difficulty))}</span>
            <h4>${escapeHtml(scenario.title || "Scenario")}</h4>
            <p>${escapeHtml(scenario.description || "")}</p>
            <div class="academy-course-meta">
              <span>${escapeHtml(scenario.expected_decision || "Decisione da valutare")}</span>
              <span>Versione ${escapeHtml(String(scenario.version || 1))}</span>
            </div>
            <div class="training-card-actions">
              <button class="primary-button" type="button" data-start-academy-simulation="${escapeHtml(String(scenario.id))}">Avvia simulazione</button>
            </div>
          </article>
        `).join("") : '<div class="empty-state">Nessuno scenario simulazione disponibile.</div>'}
      </div>
    </section>
  `;
}

function renderTrainingHistory() {
  const path = state.academyLearningPath || {};
  const completed = Array.isArray(path.completedCourses) ? path.completedCourses : [];
  const attempts = state.academyExamHistory || [];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Storico formazione</span>
        <h3>Attività formative</h3>
        <p>Corsi completati, esami consegnati e progressi utili alla qualificazione operativa.</p>
      </article>
      <div class="academy-path-grid">
        <article class="academy-qualification-card">
          <h4>Corsi completati</h4>
          ${completed.length ? `<ul>${completed.map((course) => `<li>${escapeHtml(course.title || course.code)}</li>`).join("")}</ul>` : "<p>Nessun corso completato registrato.</p>"}
        </article>
        <article class="academy-qualification-card">
          <h4>Esami consegnati</h4>
          ${attempts.length ? `<ul>${attempts.map((attempt) => `<li>${escapeHtml(attempt.course_title || "Esame")} · ${escapeHtml(attempt.passed ? "Superato" : attempt.status || "Consegnato")}</li>`).join("")}</ul>` : "<p>Nessun esame consegnato.</p>"}
        </article>
      </div>
    </section>
  `;
}

function renderFounderQualificationDashboard() {
  if (!canManageCoursesUi()) {
    trainingList.innerHTML = '<div class="empty-state">Dashboard formazione riservata al Founder.</div>';
    return;
  }
  const dashboard = state.academyFounderDashboard || {};
  const metricGroups = [
    ["Utenti per ruolo", dashboard.users_by_role || [], "ruolo"],
    ["Certificazioni", dashboard.certifications || [], "status"],
    ["Esami", dashboard.exams || [], "esito"],
    ["Prove pratiche", dashboard.practical_assessments || [], "status"],
    ["Simulazioni", dashboard.simulations || [], "status"]
  ];
  trainingList.innerHTML = `
    <section class="academy-qualification-shell">
      <article class="academy-qualification-hero">
        <span class="course-pill">Founder</span>
        <h3>Dashboard formazione</h3>
        <p>Modalità qualifica: ${escapeHtml(dashboard.settings?.mode || state.academyQualificationSettings?.mode || "shadow")}. In shadow vengono registrati i requisiti senza bloccare le funzioni operative.</p>
      </article>
      <div class="founder-dashboard-grid">
        ${metricGroups.map(([title, rows, labelKey]) => `
          <article class="academy-qualification-card">
            <h4>${escapeHtml(title)}</h4>
            ${rows.length ? rows.map((row) => `
              <div class="founder-dashboard-row">
                <span>${escapeHtml(row[labelKey] || "Non definito")}</span>
                <strong>${escapeHtml(String(row.total || 0))}</strong>
              </div>
            `).join("") : '<p>Nessun dato disponibile.</p>'}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTraining() {
  if (!trainingList) return;
  if (!ACADEMY_TAB_LABELS[state.courseActiveTab]) {
    state.courseActiveTab = "catalog";
  }
  renderCourseSummary();
  updateAcademyLocation();
  if (state.courseActiveTab !== "management") {
    removeTrainingCourseEditForm();
  } else if (trainingCourseForm && !document.getElementById("trainingCourseId")?.value) {
    removeTrainingCourseEditForm();
  }
  if (courseToolbar) courseToolbar.hidden = !["catalog", "management"].includes(state.courseActiveTab);
  document.querySelectorAll("[data-course-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.courseTab === state.courseActiveTab);
  });

  if (state.courseActiveTab === "path") {
    renderMyLearningPath();
    return;
  }

  if (state.courseActiveTab === "competencies") {
    renderCompetencyMatrix();
    return;
  }

  if (state.courseActiveTab === "exams") {
    renderAcademyExams();
    return;
  }

  if (state.courseActiveTab === "practicals") {
    renderPracticalAssessments();
    return;
  }

  if (state.courseActiveTab === "simulations") {
    renderSimulationLab();
    return;
  }

  if (state.courseActiveTab === "history") {
    renderTrainingHistory();
    return;
  }

  if (state.courseActiveTab === "operatorTraining") {
    renderOperatorTraining();
    return;
  }

  if (state.courseActiveTab === "dashboard") {
    renderFounderQualificationDashboard();
    return;
  }

  const search = String(courseSearch?.value || "").trim().toLowerCase();
  const category = String(courseCategoryFilter?.value || "").trim();
  const visibleCourses = state.trainingCourses.filter((course) => {
    const matchesSearch = !search || [course.title, course.description, course.section_title, course.category_name, course.faculty_name, course.level, course.teacher]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesCategory = !category || String(course.category_name || course.category || "") === category;
    return matchesSearch && matchesCategory;
  });

  if (state.courseActiveTab === "management") {
    if (!canManageCoursesUi()) {
      trainingList.innerHTML = '<div class="empty-state">Gestione Academy riservata al Founder.</div>';
      return;
    }
    const facultyOptions = (state.courseFaculties || []).map((faculty) => `<option>${escapeHtml(faculty.name)}</option>`).join("");
    const facultySelect = document.getElementById("trainingCourseFaculty");
    if (facultySelect && facultyOptions) facultySelect.innerHTML = facultyOptions;
    const courseRows = visibleCourses.length ? visibleCourses.map(renderCourseCard).join("") : "";
    trainingList.innerHTML = `
      <article class="course-card academy-course-card">
        <div>
          <span class="course-pill">Gestione Academy</span>
          <h3>Corsi disponibili</h3>
          <p>Visualizza i corsi presenti in Academy, modifica i contenuti oppure elimina quelli non più necessari.</p>
        </div>
      </article>
      ${courseRows || '<div class="empty-state">Nessun corso disponibile.</div>'}
    `;
    return;
  }

  if (state.courseActiveTab === "certifications") {
    trainingList.innerHTML = state.courseCertificates.length ? state.courseCertificates.map((certificate) => `
      <article class="course-card">
        <div>
          <span class="course-pill">Certificazione</span>
          <h3>${escapeHtml(certificate.course_title || certificate.title || "Corso OroActive")}</h3>
          <p>${escapeHtml(certificate.category_name || "Formazione OroActive")} · ${escapeHtml(certificate.certificate_code || "")}</p>
        </div>
        <button class="primary-button" type="button" data-download-certificate="${escapeHtml(String(certificate.id))}">Scarica PDF</button>
      </article>
    `).join("") : '<div class="empty-state">Nessuna certificazione ottenuta.</div>';
    return;
  }

  if (state.courseActiveTab === "badges") {
    trainingList.innerHTML = state.courseBadges.length ? state.courseBadges.map((badge) => `
      <article class="course-card badge-card">
        <div>
          <span class="course-pill">Badge</span>
          <h3>${escapeHtml(badge.badge_name || "Badge OroActive")}</h3>
          <p>${escapeHtml(badge.course_title || "Corso collegato")} · ${escapeHtml(badge.badge_code || "")}</p>
        </div>
        <strong>${escapeHtml(badge.status || "valido")}</strong>
      </article>
    `).join("") : '<div class="empty-state">Nessun badge ottenuto.</div>';
    return;
  }

  const advancedCourses = visibleCourses.filter(isAdvancedPathCourseUi);
  const standardCourses = visibleCourses.filter((course) => !isAdvancedPathCourseUi(course));
  const standardRows = standardCourses.map(renderCourseCard).join("");
  const advancedRows = renderAdvancedAcademyPath(advancedCourses);
  trainingList.innerHTML = standardRows || advancedRows
    ? `${standardRows}${advancedRows}`
    : '<div class="empty-state">Nessun corso attivo.</div>';
}

function courseFinalExamQuestions(course = {}) {
  if (Array.isArray(course.final_exam_questions)) return course.final_exam_questions;
  if (Array.isArray(course.final_exam?.questions)) return course.final_exam.questions;
  return [];
}

function courseExamPassed(course = {}) {
  return course.final_exam_passed === true || Boolean(course.certificate_id);
}

function courseSlidesUrl(course = {}) {
  return course.slides_download_url || course.academy_pdf_url || course.pdf_url || "";
}

function courseExamRetryMessage(course = {}) {
  if (!course.final_exam_retry_blocked || !course.final_exam_retry_available_at) return "";
  return `Test ripetibile dal ${formatDateTime(course.final_exam_retry_available_at)}`;
}

function academyCourseCodeUi(course = {}) {
  const metadata = course.metadata || {};
  return String(course.course_code || metadata.seedCode || metadata.courseCode || "").trim();
}

function isAdvancedPathCourseUi(course = {}) {
  const metadata = course.metadata || {};
  return Boolean(course.advanced_path_course || metadata.isAdvancedPathCourse);
}

function renderAdvancedAcademyPath(courses = []) {
  if (!courses.length) return "";
  const founderAccess = courses.some((course) => course.founder_access);
  const locked = courses.some((course) => course.course_locked || course.prerequisites_satisfied === false);
  const banner = founderAccess
    ? {
      label: "Accesso Founder",
      title: "Percorso Avanzato Compro Oro",
      text: "Come Founder puoi visualizzare subito tutte le specializzazioni avanzate senza sbloccare il prerequisito."
    }
    : locked
      ? {
        label: "Percorso avanzato bloccato",
        title: "Completa il corso propedeutico",
        text: "Per accedere alle specializzazioni avanzate devi completare il Corso Operativo Completo Compro Oro e superare il relativo esame finale."
      }
      : {
        label: "Percorso avanzato sbloccato",
        title: "Specializzazioni disponibili",
        text: "Hai completato il Corso Operativo Completo Compro Oro. Tutte le specializzazioni avanzate sono disponibili."
      };
  return `
    <section class="academy-advanced-path">
      <div class="academy-advanced-path-banner ${locked && !founderAccess ? "locked" : "unlocked"}">
        <span class="course-pill">${escapeHtml(banner.label)}</span>
        <h3>${escapeHtml(banner.title)}</h3>
        <p>${escapeHtml(banner.text)}</p>
      </div>
      <div class="academy-advanced-path-grid">
        ${courses.map(renderCourseCard).join("")}
      </div>
    </section>
  `;
}

function renderCourseCard(course) {
  const videoUrl = course.academy_video_url || course.video_url || "";
  const pdfUrl = courseSlidesUrl(course);
  const courseCode = academyCourseCodeUi(course);
  const isAdvancedPath = isAdvancedPathCourseUi(course);
  const isLocked = Boolean(course.course_locked || course.prerequisites_satisfied === false || course.slides_locked);
  const lockReason = course.course_lock_reason
    || (Array.isArray(course.missing_prerequisites) && course.missing_prerequisites.length
      ? `Completa prima: ${course.missing_prerequisites.map((item) => item.title || item.code).join(", ")}.`
      : "Completa prima i corsi propedeutici.");
  const finalExamQuestions = courseFinalExamQuestions(course);
  const hasFinalExam = finalExamQuestions.length > 0;
  const showExamUnavailable = !isLocked && isAdvancedPath && !hasFinalExam;
  const examPassed = courseExamPassed(course);
  const retryMessage = courseExamRetryMessage(course);
  const canOpenSlides = Boolean(pdfUrl) && !isLocked;
  const isUploadedVideo = /^\/api\/academy\/materials\/file\//.test(String(videoUrl)) || /\.(mp4|mov)(\?|#|$)/i.test(String(videoUrl));
  const moduleTitle = course.academy_module_title || course.module_title || course.section_title || "Modulo introduttivo";
  const lessonTitle = course.academy_lesson_title || course.lesson_title || "Lezione principale";
  const showManagementActions = state.courseActiveTab === "management" && canManageCoursesUi();
  const managementActions = showManagementActions ? `
    <div class="academy-course-admin-actions">
      <button type="button" data-edit-course="${escapeHtml(String(course.id))}">Modifica</button>
      <button class="danger-button" type="button" data-delete-course="${escapeHtml(String(course.id))}">Elimina</button>
    </div>
  ` : "";
  const testStatus = isLocked
    ? `<span class="academy-test-status locked">Bloccato · ${escapeHtml(lockReason)}</span>`
    : hasFinalExam
      ? examPassed
        ? `<span class="academy-test-status passed">Test finale superato${course.final_exam_score ? ` · ${escapeHtml(String(course.final_exam_score))}%` : ""}</span>`
        : retryMessage
          ? `<span class="academy-test-status">Test finale non superato · ${escapeHtml(retryMessage)}</span>`
          : `<span class="academy-test-status">Test finale richiesto per ottenere badge e certificazione</span>`
      : showExamUnavailable
        ? `<span class="academy-test-status">Esame da configurare</span>`
        : "";
  const firstMissingPrerequisite = Array.isArray(course.missing_prerequisites) ? course.missing_prerequisites[0] : null;
  const prerequisiteButton = isLocked && firstMissingPrerequisite?.code
    ? `<button class="secondary-button" type="button" data-open-prerequisite-course="${escapeHtml(String(firstMissingPrerequisite.code))}">Vai al corso propedeutico</button>`
    : "";
  return `
    <article class="course-card academy-course-card ${isLocked ? "is-locked" : ""}" data-course-code="${escapeHtml(courseCode)}">
      <div class="course-card-main">
        <span class="course-pill">${escapeHtml(course.faculty_name || "Academy")}</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description || "")}</p>
        <div class="academy-course-meta">
          <span>${escapeHtml(course.category_name || course.category || "Formazione")}</span>
          <span>Livello ${escapeHtml(course.level || "Base")}</span>
          <span>Durata ${escapeHtml(course.duration_label || (course.duration_minutes ? `${course.duration_minutes} min` : "Da definire"))}</span>
          <span>Docente ${escapeHtml(course.teacher || "OroActive")}</span>
          ${course.founder_access ? "<span>Accesso Founder</span>" : ""}
        </div>
        <small>${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)}</small>
        ${testStatus}
        ${isUploadedVideo ? `<video class="academy-video-player" controls playsinline preload="metadata" src="${escapeHtml(videoUrl)}"></video>` : ""}
        <div class="academy-materials">
          ${videoUrl ? `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">Guarda video lezione</a>` : ""}
          ${pdfUrl ? `
            <button type="button" ${canOpenSlides ? `data-view-course-slides="${escapeHtml(String(course.id))}"` : "disabled"} title="${canOpenSlides ? "" : escapeHtml(lockReason)}">Visualizza Corso</button>
            <button type="button" ${canOpenSlides ? `data-download-course-slides="${escapeHtml(String(course.id))}"` : "disabled"} title="${canOpenSlides ? "" : escapeHtml(lockReason)}">Scarica PDF corso</button>
          ` : ""}
          ${managementActions}
        </div>
      </div>
      <div class="course-progress-panel">
        ${isLocked ? `<span class="academy-course-lock">${escapeHtml(lockReason)}</span>${prerequisiteButton}` : ""}
        ${!isLocked && hasFinalExam && !examPassed ? `<button class="primary-button" type="button" data-course-exam="${escapeHtml(String(course.id))}" ${course.final_exam_retry_blocked ? "disabled" : ""}>${course.final_exam_retry_blocked ? "Test disponibile tra 48 ore" : "Sostieni test finale"}</button>` : ""}
        ${showExamUnavailable ? '<button class="primary-button" type="button" disabled>Esame non disponibile</button>' : ""}
        ${hasFinalExam && examPassed ? `<button class="primary-button" type="button" data-download-certificate="${escapeHtml(String(course.certificate_id || ""))}" ${course.certificate_id ? "" : "disabled"}>Scarica certificato</button>` : ""}
      </div>
    </article>
  `;
}

function isGoldMasterCourse(course = {}) {
  const metadata = course.metadata || {};
  return metadata.goldMaster === true
    || metadata.courseCode === "ORO-MASTER-001"
    || String(course.title || "").trim() === "Oro Master — Dalla Bilancia d’Oro";
}

function currentTrainingDataSnapshot() {
  return {
    faculties: state.courseFaculties || [],
    courses: state.trainingCourses || [],
    categories: state.courseCategories || [],
    sections: state.courseSections || [],
    progress: state.courseProgress || [],
    certificates: state.courseCertificates || [],
    badges: state.courseBadges || []
  };
}

function normalizeTrainingCourseForState(course = {}, payload = {}) {
  if (!course?.id) return null;
  return {
    ...course,
    faculty_name: course.faculty_name || payload.faculty || payload.faculty_name || "Academy",
    category_name: course.category_name || payload.category || "Formazione",
    section_title: course.section_title || payload.section || payload.section_title || "Generale",
    academy_module_title: course.academy_module_title || payload.module_title || payload.module || course.module_title || "Modulo introduttivo",
    academy_lesson_title: course.academy_lesson_title || payload.lesson_title || payload.lesson || course.lesson_title || "Lezione principale",
    academy_video_url: course.academy_video_url || payload.video_url || course.video_url || "",
    academy_pdf_url: course.academy_pdf_url || payload.pdf_url || course.pdf_url || "",
    material_url: course.material_url || payload.material_url || payload.material_data_url || "",
    material_title: course.material_title || payload.material_filename || payload.material_title || "",
    active: course.active !== false && payload.active !== false
  };
}

function ensureLocalAcademyTaxonomy(course = {}) {
  const facultyName = String(course.faculty_name || "").trim();
  if (facultyName && !(state.courseFaculties || []).some((item) => item.name === facultyName)) {
    state.courseFaculties = [{ id: `local-faculty-${Date.now()}`, name: facultyName, description: "Facoltà Academy" }, ...(state.courseFaculties || [])];
  }
  const categoryName = String(course.category_name || "").trim();
  if (categoryName && !(state.courseCategories || []).some((item) => item.name === categoryName)) {
    state.courseCategories = [{ id: `local-category-${Date.now()}`, name: categoryName }, ...(state.courseCategories || [])];
  }
  const sectionTitle = String(course.section_title || "").trim();
  if (sectionTitle && !(state.courseSections || []).some((item) => item.title === sectionTitle)) {
    state.courseSections = [{ id: `local-section-${Date.now()}`, title: sectionTitle, category_name: categoryName }, ...(state.courseSections || [])];
  }
}

function mergeTrainingCourseInState(course = {}, payload = {}) {
  const normalizedCourse = normalizeTrainingCourseForState(course, payload);
  if (!normalizedCourse?.id) return null;
  state.trainingCourses = [
    normalizedCourse,
    ...(state.trainingCourses || []).filter((item) => String(item.id) !== String(normalizedCourse.id))
  ];
  ensureLocalAcademyTaxonomy(normalizedCourse);
  return normalizedCourse;
}

function applyAcademyQualificationData({
  settingsData = {},
  learningPathData = {},
  competenciesData = {},
  practicalsData = {},
  capabilitiesData = {},
  simulationsData = {},
  examHistoryData = {},
  founderDashboardData = {}
} = {}) {
  state.academyQualificationSettings = settingsData.settings || state.academyQualificationSettings || { enabled: true, mode: "shadow", pilot_mode: false };
  state.academyLearningPath = learningPathData.learning_path || state.academyLearningPath || null;
  state.academyNextObjective = learningPathData.next_objective || state.academyLearningPath?.nextObjective || null;
  state.academyCompetencies = competenciesData.competencies || state.academyCompetencies || [];
  state.academyPracticalAssessments = practicalsData.practical_assessments || state.academyPracticalAssessments || [];
  state.academyOperationalCapabilities = capabilitiesData.capabilities || state.academyOperationalCapabilities || [];
  state.academySimulationScenarios = simulationsData.scenarios || state.academySimulationScenarios || [];
  state.academyExamHistory = examHistoryData.attempts || state.academyExamHistory || [];
  state.academyFounderDashboard = founderDashboardData.dashboard || state.academyFounderDashboard || null;
}

function applyTrainingData(data = {}, scenarioData = {}, myResultsData = {}, teamResultsData = {}, qualificationData = {}) {
  state.courseFaculties = (data.faculties || []).filter((faculty) => String(faculty.name || "").trim() !== "OroActive Academy");
  state.trainingCourses = (data.courses || []).filter((course) => !isGoldMasterCourse(course));
  state.courseCategories = data.categories || [];
  state.courseSections = data.sections || [];
  state.courseProgress = data.progress || [];
  state.courseCertificates = data.certificates || [];
  state.courseBadges = data.badges || [];
  state.trainingScenarios = scenarioData.scenarios || [];
  state.operatorTrainingResults = myResultsData.results || [];
  state.operatorTeamTrainingResults = teamResultsData.results || [];
  applyAcademyQualificationData(qualificationData);
}

async function loadTraining() {
  const [
    rawCourseDataResult,
    scenarioDataResult,
    myResultsDataResult,
    teamResultsDataResult,
    settingsResult,
    learningPathResult,
    competenciesResult,
    practicalsResult,
    capabilitiesResult,
    simulationsResult,
    examHistoryResult,
    founderDashboardResult
  ] = await Promise.allSettled([
    apiRequest("/corsi"),
    apiRequest("/training/scenarios", { retries: 1 }),
    apiRequest("/training/my-results", { retries: 1 }),
    apiRequest("/training/team-results", { retries: 1 }),
    apiRequest("/academy/qualification/settings", { retries: 1 }),
    apiRequest("/academy/my-learning-path", { retries: 1 }),
    apiRequest("/academy/my-competencies", { retries: 1 }),
    apiRequest("/academy/my-practical-assessments", { retries: 1 }),
    apiRequest("/academy/my-operational-capabilities", { retries: 1 }),
    apiRequest("/academy/simulations", { retries: 1 }),
    apiRequest("/academy/exam-attempts/history", { retries: 1 }),
    apiRequest("/academy/founder/qualification-dashboard", { retries: 1 })
  ]);
  const courseDataLoaded = rawCourseDataResult.status === "fulfilled";
  const rawCourseData = courseDataLoaded ? rawCourseDataResult.value : currentTrainingDataSnapshot();
  if (!courseDataLoaded) {
    showToast(cleanUserMessage(rawCourseDataResult.reason?.message, "Catalogo Academy non caricato."), "error");
  }
  const data = rawCourseData;
  applyTrainingData(
    data,
    scenarioDataResult.status === "fulfilled" ? scenarioDataResult.value : { scenarios: state.trainingScenarios || [] },
    myResultsDataResult.status === "fulfilled" ? myResultsDataResult.value : { results: state.operatorTrainingResults || [] },
    teamResultsDataResult.status === "fulfilled" ? teamResultsDataResult.value : { results: state.operatorTeamTrainingResults || [] },
    {
      settingsData: settingsResult.status === "fulfilled" ? settingsResult.value : {},
      learningPathData: learningPathResult.status === "fulfilled" ? learningPathResult.value : {},
      competenciesData: competenciesResult.status === "fulfilled" ? competenciesResult.value : {},
      practicalsData: practicalsResult.status === "fulfilled" ? practicalsResult.value : {},
      capabilitiesData: capabilitiesResult.status === "fulfilled" ? capabilitiesResult.value : {},
      simulationsData: simulationsResult.status === "fulfilled" ? simulationsResult.value : {},
      examHistoryData: examHistoryResult.status === "fulfilled" ? examHistoryResult.value : {},
      founderDashboardData: founderDashboardResult.status === "fulfilled" ? founderDashboardResult.value : {}
    }
  );
  renderTraining();
}

function formatCoinNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function coinPurityPercent(coin = {}) {
  return `${formatCoinNumber(Number(coin.purity || 0) * 100, 2)}%`;
}

function coinPurityBucket(coin = {}) {
  const purity = Number(coin.purity || 0);
  if (purity >= 0.999) return "999";
  if (purity >= 0.916 && purity < 0.999) return "917";
  if (purity >= 0.899 && purity < 0.916) return "900";
  return "";
}

function coinCatalogFiltered() {
  const search = String(state.coinCatalogSearch || coinSearchInput?.value || "").trim().toLowerCase();
  const country = String(state.coinCatalogCountry || coinCountryFilter?.value || "").trim();
  const purity = String(state.coinCatalogPurity || coinPurityFilter?.value || "").trim();
  return GOLD_COIN_CATALOG.filter((coin) => {
    const haystack = [
      coin.name,
      coin.country,
      coin.mintYears,
      coin.nominal,
      coin.purityLabel,
      coin.obverse,
      coin.reverse,
      coin.history,
      ...(coin.recognitionHints || [])
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesCountry = !country || coin.country === country;
    const matchesPurity = !purity || coinPurityBucket(coin) === purity;
    return matchesSearch && matchesCountry && matchesPurity;
  }).sort((a, b) => {
    const countryOrder = String(a.country || "").localeCompare(String(b.country || ""), "it");
    if (countryOrder) return countryOrder;
    return String(a.name || "").localeCompare(String(b.name || ""), "it");
  });
}

function groupedCoinsByCountry(coins = []) {
  return coins.reduce((groups, coin) => {
    const country = coin.country || "Paese non indicato";
    const existing = groups.find((group) => group.country === country);
    if (existing) {
      existing.coins.push(coin);
    } else {
      groups.push({ country, coins: [coin] });
    }
    return groups;
  }, []);
}

function coinFaceMarkup(coin = {}, side = "front") {
  const imageUrl = coin.bookImages?.[side];
  const visual = coin.visual || {};
  const type = side === "back" ? visual.back : visual.front;
  const text = side === "back" ? visual.backText : visual.frontText;
  const label = side === "back" ? "Retro" : "Fronte";
  if (imageUrl) {
    return `
      <figure class="coin-photo-frame" aria-label="${escapeHtml(label)} ${escapeHtml(coin.name || "moneta")}">
        <span class="coin-photo-image">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${label} ${coin.name || "moneta d'oro"}`)}" loading="lazy" decoding="async">
        </span>
        <figcaption>${escapeHtml(label)}</figcaption>
      </figure>
    `;
  }
  return `
    <div class="coin-face coin-face-${escapeHtml(type || "seal")}" aria-label="${escapeHtml(label)} ${escapeHtml(coin.name || "moneta")}">
      <span class="coin-face-ring"></span>
      <span class="coin-face-symbol">${escapeHtml(text || (side === "back" ? "R" : "F"))}</span>
      <span class="coin-face-caption">${escapeHtml(label)}</span>
    </div>
  `;
}

function coinMiniFacesMarkup(coin = {}) {
  return `
    <div class="coin-mini-media">
      ${coinFaceMarkup(coin, "front")}
      ${coinFaceMarkup(coin, "back")}
    </div>
  `;
}

function coinSpecListMarkup(coin = {}) {
  const specs = [
    ["Paese", coin.country],
    ["Periodo", coin.mintYears],
    ["Valore nominale", coin.nominal],
    ["Titolo", coin.purityLabel],
    ["Purezza", coinPurityPercent(coin)],
    ["Peso lordo", `${formatCoinNumber(coin.grossWeight, 3)} g`],
    ["Oro fino", `${formatCoinNumber(coin.fineGold, 3)} g`],
    ["Diametro", `${formatCoinNumber(coin.diameter, 2)} mm`],
    ...(coin.thickness ? [["Spessore", `${formatCoinNumber(coin.thickness, 2)} mm`]] : []),
    ["Bordo", coin.edge]
  ];
  return specs.map(([label, value]) => `
    <div class="coin-spec">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `).join("");
}

function coinCardMarkup(coin = {}) {
  const active = String(state.coinSelectedId || "") === String(coin.id);
  return `
    <article class="coin-card ${active ? "active" : ""}">
      ${coinMiniFacesMarkup(coin)}
      <div class="coin-card-copy">
        <span class="coin-pill">${escapeHtml(coin.country)}</span>
        <h3>${escapeHtml(coin.name)}</h3>
        <p>${escapeHtml(coin.purityLabel)} · ${formatCoinNumber(coin.grossWeight, 3)} g · fino ${formatCoinNumber(coin.fineGold, 3)} g</p>
      </div>
      <button type="button" class="ghost-button" data-open-coin="${escapeHtml(String(coin.id))}">Apri scheda</button>
    </article>
  `;
}

function coinCountryGroupMarkup(group = {}) {
  const coins = Array.isArray(group.coins) ? group.coins : [];
  return `
    <section class="coin-country-group" aria-label="${escapeHtml(group.country || "Paese")}">
      <header class="coin-country-heading">
        <h3>${escapeHtml(group.country || "Paese")}</h3>
        <span>${coins.length} ${coins.length === 1 ? "moneta" : "monete"}</span>
      </header>
      <div class="coin-country-grid">
        ${coins.map(coinCardMarkup).join("")}
      </div>
    </section>
  `;
}

function selectedCoin() {
  return GOLD_COIN_CATALOG.find((coin) => coin.id === state.coinSelectedId) || GOLD_COIN_CATALOG[0];
}

function renderCoinCountryOptions() {
  if (!coinCountryFilter) return;
  const current = coinCountryFilter.value || state.coinCatalogCountry || "";
  const countries = [...new Set(GOLD_COIN_CATALOG.map((coin) => coin.country))].sort((a, b) => a.localeCompare(b, "it"));
  coinCountryFilter.innerHTML = `<option value="">Tutti i paesi</option>${countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("")}`;
  coinCountryFilter.value = countries.includes(current) ? current : "";
}

function renderCoinOverview(visibleCoins = []) {
  if (!coinOverviewGrid) return;
  const countries = new Set(GOLD_COIN_CATALOG.map((coin) => coin.country)).size;
  const pure = GOLD_COIN_CATALOG.filter((coin) => Number(coin.purity || 0) >= 0.999).length;
  const latin = GOLD_COIN_CATALOG.filter((coin) => Number(coin.purity || 0) === 0.9).length;
  coinOverviewGrid.innerHTML = [
    ["Monete catalogate", GOLD_COIN_CATALOG.length],
    ["Paesi", countries],
    ["Oro 999+", pure],
    ["Standard 900‰", latin],
    ["Risultati visibili", visibleCoins.length]
  ].map(([label, value]) => `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join("");
}

function renderCoinDetail(coin = selectedCoin()) {
  if (!coinDetailPanel || !coin) return;
  const aliases = (coin.recognitionHints || []).slice(0, 7).map((hint) => `<span>${escapeHtml(hint)}</span>`).join("");
  const imageSource = coin.bookImages?.source
    ? `<p class="coin-image-source">Foto fronte/retro estratte da ${escapeHtml(coin.bookImages.source)}.</p>`
    : "";
  coinDetailPanel.innerHTML = `
    <article class="coin-detail-card">
      <div class="coin-detail-media">
        ${coinFaceMarkup(coin, "front")}
        ${coinFaceMarkup(coin, "back")}
        ${imageSource}
      </div>
      <div class="coin-detail-copy">
        <p class="eyebrow">Scheda tecnica moneta d'oro</p>
        <h3>${escapeHtml(coin.name)}</h3>
        <p class="muted">${escapeHtml(coin.country)} · ${escapeHtml(coin.mintYears)} · ${escapeHtml(coin.nominal)}</p>
        <div class="coin-spec-grid">${coinSpecListMarkup(coin)}</div>
        <section class="coin-history-box">
          <h4>Storia e riconoscimento</h4>
          <p>${escapeHtml(coin.history)}</p>
          <div class="coin-history-points">
            <span><strong>Fronte:</strong> ${escapeHtml(coin.obverse)}</span>
            <span><strong>Retro:</strong> ${escapeHtml(coin.reverse)}</span>
          </div>
          <div class="coin-aliases">${aliases}</div>
        </section>
        <p class="coin-disclaimer">Scheda formativa indicativa. Per decisioni operative verificare sempre peso, diametro, titolo, magnetismo, bordo e autenticita fisica della moneta.</p>
      </div>
    </article>
  `;
}

function renderCoinIdentificationResults() {
  if (!coinIdentificationResults) return;
  const result = state.coinIdentification;
  if (!result) {
    coinIdentificationResults.innerHTML = "";
    return;
  }
  const matches = Array.isArray(result.matches) ? result.matches : [];
  if (!matches.length) {
    coinIdentificationResults.innerHTML = `
      <div class="coin-identification-empty">
        <strong>Nessuna moneta identificata con sicurezza.</strong>
        <p>${escapeHtml(result.message || "Prova con una foto piu nitida, includendo bordo, fronte o retro completo.")}</p>
      </div>
    `;
    return;
  }
  coinIdentificationResults.innerHTML = `
    <div class="coin-identification-heading">
      <strong>Possibili corrispondenze</strong>
      <span>${escapeHtml(result.ai_configured === false ? COIN_RECOGNITION_HINTS.local : COIN_RECOGNITION_HINTS.ai)}</span>
    </div>
    ${matches.map((match) => {
      const coin = GOLD_COIN_CATALOG.find((item) => item.id === match.id) || {};
      const confidence = Math.max(0, Math.min(100, Math.round(Number(match.confidence || 0) * 100)));
      return `
        <button class="coin-match-row" type="button" data-open-coin="${escapeHtml(String(match.id || ""))}">
          <span>${escapeHtml(coin.name || match.name || "Moneta candidata")}</span>
          <strong>${confidence || "?"}%</strong>
          <small>${escapeHtml(match.reason || match.visual_evidence || "Confronto visivo disponibile.")}</small>
        </button>
      `;
    }).join("")}
  `;
}

function renderCoinEncyclopedia() {
  renderCoinCountryOptions();
  const visibleCoins = coinCatalogFiltered();
  renderCoinOverview(visibleCoins);
  if (coinCatalogGrid) {
    coinCatalogGrid.innerHTML = visibleCoins.length
      ? groupedCoinsByCountry(visibleCoins).map(coinCountryGroupMarkup).join("")
      : '<div class="empty-state">Nessuna moneta trovata. Modifica ricerca o filtri.</div>';
  }
  if (!visibleCoins.some((coin) => coin.id === state.coinSelectedId) && visibleCoins[0]) {
    state.coinSelectedId = visibleCoins[0].id;
  }
  renderCoinDetail(selectedCoin());
  renderCoinIdentificationResults();
}

function resetCoinSearch() {
  state.coinCatalogSearch = "";
  state.coinCatalogCountry = "";
  state.coinCatalogPurity = "";
  state.coinIdentification = null;
  if (coinSearchInput) coinSearchInput.value = "";
  if (coinCountryFilter) coinCountryFilter.value = "";
  if (coinPurityFilter) coinPurityFilter.value = "";
  if (coinCameraInput) coinCameraInput.value = "";
  if (coinScanPreview) {
    coinScanPreview.hidden = true;
    coinScanPreview.innerHTML = "";
  }
  if (coinScanStatus) coinScanStatus.textContent = "Pronto per analizzare fronte o retro della moneta.";
  renderCoinEncyclopedia();
}

async function identifyCoinFromCamera(file) {
  if (!file) return;
  if (!/^image\//i.test(file.type || "")) {
    showToast("Carica una foto della moneta in formato immagine.", "error");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast("Foto troppo pesante. Usa un'immagine sotto 8 MB.", "error");
    return;
  }
  try {
    if (coinScanStatus) coinScanStatus.textContent = "Analisi immagine in corso...";
    const dataUrl = await fileToDataUrl(file);
    if (coinScanPreview) {
      coinScanPreview.hidden = false;
      coinScanPreview.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Foto moneta caricata">`;
    }
    const catalog = GOLD_COIN_CATALOG.map((coin) => ({
      id: coin.id,
      name: coin.name,
      country: coin.country,
      purityLabel: coin.purityLabel,
      grossWeight: coin.grossWeight,
      diameter: coin.diameter,
      obverse: coin.obverse,
      reverse: coin.reverse,
      recognitionHints: coin.recognitionHints
    }));
    const result = await apiRequest("/training/gold-coins/identify", {
      method: "POST",
      body: JSON.stringify({ image: dataUrl, catalog }),
      timeoutMs: 45000
    });
    state.coinIdentification = result;
    const firstMatch = result.matches?.[0]?.id;
    if (firstMatch && GOLD_COIN_CATALOG.some((coin) => coin.id === firstMatch)) {
      state.coinSelectedId = firstMatch;
    }
    if (coinScanStatus) {
      coinScanStatus.textContent = result.ai_configured === false
        ? "AI non configurata: mostrato fallback locale, usa anche ricerca manuale."
        : "Analisi completata. Controlla sempre peso e diametro prima di decidere.";
    }
    renderCoinEncyclopedia();
  } catch (error) {
    state.coinIdentification = {
      ok: false,
      ai_configured: false,
      matches: [],
      message: cleanUserMessage(error.message, "Riconoscimento moneta non disponibile.")
    };
    if (coinScanStatus) coinScanStatus.textContent = "Riconoscimento non disponibile. Puoi cercare la moneta manualmente nel catalogo.";
    renderCoinIdentificationResults();
    showToast(error.message || "Riconoscimento moneta non disponibile.", "error");
  }
}

function aurumBlocksSeededRandom(seed = "") {
  let value = 2166136261;
  String(seed || "aurum-blocks").split("").forEach((char) => {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  });
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aurumBlocksRandom() {
  return state.aurumBlocksGame?.random?.() ?? Math.random();
}

function aurumBlocksWeightedMetal() {
  const total = AURUM_BLOCKS_METALS.reduce((sum, metal) => sum + Number(metal.rarity || 1), 0);
  let pick = aurumBlocksRandom() * total;
  for (const metal of AURUM_BLOCKS_METALS) {
    pick -= Number(metal.rarity || 1);
    if (pick <= 0) return metal;
  }
  return AURUM_BLOCKS_METALS[AURUM_BLOCKS_METALS.length - 1];
}

function aurumBlocksEmptyBoard() {
  return Array.from({ length: AURUM_BLOCKS_HEIGHT }, () => Array.from({ length: AURUM_BLOCKS_WIDTH }, () => null));
}

function aurumBlocksNormalizeCells(cells = []) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function aurumBlocksRotateCells(cells = []) {
  const width = Math.max(...cells.map(([x]) => x)) + 1;
  return aurumBlocksNormalizeCells(cells.map(([x, y]) => [y, width - 1 - x]));
}

function aurumBlocksCreatePiece() {
  const shape = AURUM_BLOCKS_SHAPES[Math.floor(aurumBlocksRandom() * AURUM_BLOCKS_SHAPES.length)] || AURUM_BLOCKS_SHAPES[0];
  const metal = aurumBlocksWeightedMetal();
  const width = Math.max(...shape.cells.map(([x]) => x)) + 1;
  return {
    id: `${shape.id}-${Date.now()}-${Math.floor(aurumBlocksRandom() * 10000)}`,
    shapeId: shape.id,
    name: shape.name,
    metal,
    cells: shape.cells.map((cell) => [...cell]),
    x: Math.floor((AURUM_BLOCKS_WIDTH - width) / 2),
    y: 0
  };
}

function aurumBlocksPieceCells(piece = {}) {
  return (piece.cells || []).map(([x, y]) => ({ x: Number(piece.x || 0) + x, y: Number(piece.y || 0) + y, metal: piece.metal }));
}

function aurumBlocksCollides(piece = {}, board = state.aurumBlocksGame?.board || []) {
  return aurumBlocksPieceCells(piece).some(({ x, y }) => (
    x < 0 || x >= AURUM_BLOCKS_WIDTH || y >= AURUM_BLOCKS_HEIGHT || (y >= 0 && board[y]?.[x])
  ));
}

function aurumBlocksMove(dx = 0, dy = 0) {
  const game = state.aurumBlocksGame;
  if (!game || game.over || game.paused || state.aurumBlocksQuestionOpen) return false;
  const moved = { ...game.active, x: game.active.x + dx, y: game.active.y + dy };
  if (aurumBlocksCollides(moved)) return false;
  game.active = moved;
  renderAurumBlocksBoard();
  return true;
}

function aurumBlocksRotate() {
  const game = state.aurumBlocksGame;
  if (!game || game.over || game.paused || state.aurumBlocksQuestionOpen) return;
  const rotated = { ...game.active, cells: aurumBlocksRotateCells(game.active.cells) };
  const candidates = [rotated, { ...rotated, x: rotated.x - 1 }, { ...rotated, x: rotated.x + 1 }, { ...rotated, y: rotated.y - 1 }];
  const valid = candidates.find((piece) => !aurumBlocksCollides(piece));
  if (valid) {
    game.active = valid;
    renderAurumBlocksBoard();
  }
}

function aurumBlocksHardDrop() {
  const game = state.aurumBlocksGame;
  if (!game || game.over || game.paused || state.aurumBlocksQuestionOpen) return;
  let distance = 0;
  while (aurumBlocksMove(0, 1)) distance += 1;
  game.score += distance * 2;
  aurumBlocksLockPiece();
}

function aurumBlocksSoftDrop() {
  const game = state.aurumBlocksGame;
  if (!game || game.over || game.paused || state.aurumBlocksQuestionOpen) return;
  if (aurumBlocksMove(0, 1)) game.score += 1;
  else aurumBlocksLockPiece();
  renderAurumBlocksHud();
}

function aurumBlocksMetalById(id = "") {
  return AURUM_BLOCKS_METALS.find((metal) => metal.id === id) || null;
}

function aurumBlocksMetalCellData(metal = {}) {
  const meta = aurumBlocksMetalById(metal.metalId || metal.id) || metal;
  return {
    metalId: meta.id || metal.metalId || "",
    label: meta.label || metal.label || "Lingotto OroActive",
    full: meta.full || metal.full || meta.label || metal.label || "Lingotto",
    short: meta.short || metal.short || "",
    className: meta.className || metal.className || ""
  };
}

function aurumBlocksLineBonus(clearedRows = []) {
  const metals = clearedRows.flat().filter(Boolean).map((cell) => cell.metalId || cell.id || "");
  if (metals.includes("oro24")) return { multiplier: 1.15, label: "BONUS 24K +15%", className: "aurum-bonus-24k" };
  if (metals.includes("oro18")) return { multiplier: 1.1, label: "BONUS 18K +10%", className: "aurum-bonus-18k" };
  if (metals.includes("arg999")) return { multiplier: 1.05, label: "BONUS ARGENTO +5%", className: "aurum-bonus-silver" };
  return { multiplier: 1, label: "", className: "" };
}

function aurumBlocksLineMultiplier(clearedRows = []) {
  return aurumBlocksLineBonus(clearedRows).multiplier;
}

function aurumBlocksLineClearCoachMessage(lineCount = 1, effect = {}) {
  if (effect.cleanBoard) return "Fusione d'oro perfetta: board pulita.";
  if (effect.metalBonusLabel) return `${effect.metalBonusLabel}: colpo da maestro.`;
  if (lineCount >= 4) return "Aurum Bonus! Mossa perfetta.";
  if (lineCount === 3) return "Ottima precisione: hai acceso la board.";
  if (lineCount === 2) return "Doppio lingotto!";
  return "Linea pulita.";
}

function aurumBlocksClearLines() {
  const game = state.aurumBlocksGame;
  if (!game) return 0;
  const fullRowIndexes = [];
  const fullRows = [];
  game.board.forEach((row, index) => {
    if (row.every(Boolean)) {
      fullRowIndexes.push(index);
      fullRows.push(row);
    }
  });
  if (!fullRows.length) {
    game.combo = 0;
    game.pendingLineEffect = null;
    return 0;
  }
  game.board = game.board.filter((row) => !row.every(Boolean));
  while (game.board.length < AURUM_BLOCKS_HEIGHT) {
    game.board.unshift(Array.from({ length: AURUM_BLOCKS_WIDTH }, () => null));
  }
  const lines = fullRows.length;
  const base = [0, 100, 300, 500, 800][lines] || (800 + (lines - 4) * 250);
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.lines += lines;
  game.level = Math.min(AURUM_BLOCKS_MAX_LEVEL, Math.floor(game.lines / AURUM_BLOCKS_LEVEL_LINES) + 1);
  game.dropMs = Math.max(90, AURUM_BLOCKS_DROP_BASE_MS - (game.level - 1) * 38);
  const cleanBoard = game.board.every((row) => row.every((cell) => !cell));
  const metalBonus = aurumBlocksLineBonus(fullRows);
  const scoreGained = Math.round(base * game.level * metalBonus.multiplier) + (50 * game.combo) + (cleanBoard ? 500 : 0);
  game.score += scoreGained;
  game.pendingLineEffect = {
    clearedRows: fullRows,
    rowIndexes: fullRowIndexes,
    lineCount: lines,
    scoreGained,
    combo: game.combo,
    metalBonus: metalBonus.multiplier,
    metalBonusLabel: metalBonus.label,
    metalBonusClass: metalBonus.className,
    cleanBoard
  };
  showAurumBlocksCoach(aurumBlocksLineClearCoachMessage(lines, game.pendingLineEffect), {
    force: lines >= 2 || Boolean(metalBonus.label) || cleanBoard
  });
  maybeShowAurumBlocksQuestion();
  return lines;
}

function aurumBlocksLockPiece() {
  const game = state.aurumBlocksGame;
  if (!game) return;
  aurumBlocksPieceCells(game.active).forEach(({ x, y, metal }) => {
    if (y >= 0 && y < AURUM_BLOCKS_HEIGHT && x >= 0 && x < AURUM_BLOCKS_WIDTH) {
      const metalData = aurumBlocksMetalCellData(metal);
      game.board[y][x] = {
        ...metalData,
        landedAt: Date.now()
      };
    }
  });
  aurumBlocksClearLines();
  game.active = game.next.shift() || aurumBlocksCreatePiece();
  game.next.push(aurumBlocksCreatePiece());
  if (aurumBlocksCollides(game.active)) {
    endAurumBlocksGame();
    return;
  }
  renderAurumBlocksBoard();
  renderAurumBlocksHud();
  if (game.pendingLineEffect) {
    triggerGoldLineClearEffect(game.pendingLineEffect);
    game.pendingLineEffect = null;
  }
}

function updateAurumBlocksUiState(forceInactive = false) {
  const game = state.aurumBlocksGame;
  const screenActive = aurumBlocksScreen?.classList.contains("active-screen");
  const playing = !forceInactive && Boolean(game && !game.over && screenActive);
  const paused = playing && Boolean(game.paused);
  const gameOver = !forceInactive && Boolean(game?.over && screenActive);
  aurumBlocksShell?.classList.toggle("is-playing", playing);
  aurumBlocksShell?.classList.toggle("is-paused", paused);
  aurumBlocksShell?.classList.toggle("is-game-over", gameOver);
  aurumBlocksGame?.classList.toggle("is-paused", paused);
  document.body.classList.toggle("aurum-blocks-playing", playing);
  document.body.classList.toggle("aurum-blocks-paused", paused);
  aurumBlocksShell?.querySelectorAll("[data-aurum-blocks-pause]").forEach((button) => {
    button.textContent = paused ? "Riprendi" : "Pausa";
    button.setAttribute("aria-pressed", paused ? "true" : "false");
  });
}

function triggerGoldLineClearEffect(effect = {}) {
  if (!aurumBlocksBoard || !effect.lineCount) return;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const lineCount = Math.max(1, Math.min(4, Number(effect.lineCount || 1)));
  const tier = lineCount >= 4 ? 4 : lineCount;
  const effectConfig = AURUM_BLOCKS_LINE_EFFECTS[tier] || AURUM_BLOCKS_LINE_EFFECTS[1];
  const rows = (effect.rowIndexes || []).length ? effect.rowIndexes : [AURUM_BLOCKS_HEIGHT - 1];
  const boardClass = tier >= 4 ? "aurum-board-golden-cascade" : tier >= 3 ? "aurum-board-aurum-burst" : "aurum-board-gold-glow";
  aurumBlocksBoard.classList.remove("aurum-board-gold-glow", "aurum-board-aurum-burst", "aurum-board-golden-cascade");
  void aurumBlocksBoard.offsetWidth;
  aurumBlocksBoard.classList.add(boardClass);
  window.setTimeout(() => {
    aurumBlocksBoard?.classList.remove(boardClass);
  }, reducedMotion ? 260 : 980);

  let layer = aurumBlocksBoard.querySelector(".aurum-effects-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "aurum-effects-layer";
    layer.setAttribute("aria-hidden", "true");
    aurumBlocksBoard.appendChild(layer);
  }
  layer.innerHTML = "";

  const averageRow = rows.reduce((sum, row) => sum + Number(row || 0), 0) / rows.length;
  rows.forEach((row) => {
    const flash = document.createElement("span");
    flash.className = `aurum-line-flash aurum-line-flash-${tier}`;
    flash.style.setProperty("--row-y", `${(Number(row || 0) / AURUM_BLOCKS_HEIGHT) * 100}%`);
    flash.style.setProperty("--row-h", `${100 / AURUM_BLOCKS_HEIGHT}%`);
    layer.appendChild(flash);
    const sweep = document.createElement("span");
    sweep.className = `aurum-molten-sweep aurum-molten-sweep-${tier}`;
    sweep.style.setProperty("--row-y", `${(Number(row || 0) / AURUM_BLOCKS_HEIGHT) * 100}%`);
    sweep.style.setProperty("--row-h", `${100 / AURUM_BLOCKS_HEIGHT}%`);
    layer.appendChild(sweep);
  });

  const scorePopup = document.createElement("span");
  scorePopup.className = `aurum-score-pop aurum-score-pop-${tier}`;
  scorePopup.textContent = `+${Math.max(0, Math.round(effect.scoreGained || 0))}`;
  scorePopup.style.setProperty("--pop-y", `${Math.min(84, Math.max(8, ((averageRow + 0.5) / AURUM_BLOCKS_HEIGHT) * 100))}%`);
  layer.appendChild(scorePopup);

  if (Number(effect.combo || 0) > 1) {
    const comboPopup = document.createElement("span");
    comboPopup.className = "aurum-combo-pop";
    comboPopup.textContent = `COMBO x${Math.max(2, Number(effect.combo || 2))}`;
    comboPopup.style.setProperty("--combo-y", `${Math.min(78, Math.max(10, ((averageRow + 1.6) / AURUM_BLOCKS_HEIGHT) * 100))}%`);
    layer.appendChild(comboPopup);
  }

  const bonusText = effect.cleanBoard
    ? "LINEA PERFETTA"
    : (effect.metalBonusLabel || (tier >= 2 ? effectConfig.label : ""));
  if (bonusText) {
    const bonusBanner = document.createElement("span");
    bonusBanner.className = `aurum-bonus-banner ${escapeHtml(effect.metalBonusClass || "")} ${effect.cleanBoard ? "aurum-bonus-clean-board" : ""}`;
    bonusBanner.textContent = bonusText;
    layer.appendChild(bonusBanner);
  }

  if (!reducedMotion) {
    const particleCount = Math.min(70, effectConfig.particles || lineCount * 16);
    const particlePalettes = [
      ["#fff7c2", "#ffd700", "#ff6a00"],
      ["#ffffff", "#fff1b8", "#ffb000"],
      ["#ffe28a", "#ff9f1c", "#b87900"]
    ];
    for (let index = 0; index < particleCount; index += 1) {
      const row = rows[index % rows.length] ?? averageRow;
      const particle = document.createElement("span");
      const variant = index % 7 === 0 ? "aurum-gold-star" : index % 5 === 0 ? "aurum-gold-fragment" : "aurum-gold-spark";
      particle.className = `aurum-gold-particle ${variant}`;
      const left = 4 + aurumBlocksRandom() * 92;
      const top = ((Number(row || 0) + aurumBlocksRandom()) / AURUM_BLOCKS_HEIGHT) * 100;
      const dx = (aurumBlocksRandom() - 0.5) * (tier >= 4 ? 190 : 130);
      const dy = -36 - aurumBlocksRandom() * (tier >= 4 ? 120 : 76);
      const size = 3 + aurumBlocksRandom() * (tier >= 3 ? 8 : 5);
      const palette = particlePalettes[Math.floor(aurumBlocksRandom() * particlePalettes.length)] || particlePalettes[0];
      particle.style.setProperty("--x", `${left}%`);
      particle.style.setProperty("--y", `${top}%`);
      particle.style.setProperty("--dx", `${dx}px`);
      particle.style.setProperty("--dy", `${dy}px`);
      particle.style.setProperty("--size", `${size}px`);
      particle.style.setProperty("--delay", `${Math.round(aurumBlocksRandom() * 130)}ms`);
      particle.style.setProperty("--duration", `${540 + Math.round(aurumBlocksRandom() * 410)}ms`);
      particle.style.setProperty("--particle-start", palette[0]);
      particle.style.setProperty("--particle-mid", palette[1]);
      particle.style.setProperty("--particle-end", palette[2]);
      layer.appendChild(particle);
    }
  }

  window.setTimeout(() => {
    if (layer?.isConnected) layer.remove();
  }, reducedMotion ? 520 : 1180);
}

function renderAurumBlocksBoard() {
  if (!aurumBlocksBoard) return;
  const game = state.aurumBlocksGame;
  if (!game) {
    aurumBlocksBoard.innerHTML = "";
    return;
  }
  const activeCells = new Map();
  aurumBlocksPieceCells(game.active).forEach((cell) => {
    if (cell.y >= 0) activeCells.set(`${cell.x}:${cell.y}`, {
      ...aurumBlocksMetalCellData(cell.metal),
      active: true
    });
  });
  const cells = [];
  const now = Date.now();
  for (let y = 0; y < AURUM_BLOCKS_HEIGHT; y += 1) {
    for (let x = 0; x < AURUM_BLOCKS_WIDTH; x += 1) {
      const cell = activeCells.get(`${x}:${y}`) || game.board[y][x];
      if (!cell) {
        cells.push('<span class="aurum-blocks-cell" aria-label="vuoto"></span>');
        continue;
      }
      const cellData = aurumBlocksMetalCellData(cell);
      const landed = !cell.active && Number(cell.landedAt || 0) && now - Number(cell.landedAt || 0) < 260;
      const classNames = [
        "filled",
        "aurum-ingot-cell",
        cellData.className,
        cell.active ? "aurum-ingot-active" : "",
        landed ? "aurum-ingot-landed" : ""
      ].filter(Boolean).join(" ");
      cells.push(`<span class="aurum-blocks-cell ${escapeHtml(classNames)}" aria-label="${escapeHtml(cellData.full || cellData.label)}" title="${escapeHtml(cellData.full || cellData.label)}"><span class="aurum-ingot-label">${escapeHtml(cellData.short || "")}</span></span>`);
    }
  }
  aurumBlocksBoard.innerHTML = `${cells.join("")}<div class="aurum-effects-layer" aria-hidden="true"></div>`;
}

function renderAurumBlocksLegend() {
  if (!aurumBlocksLegend) return;
  aurumBlocksLegend.innerHTML = AURUM_BLOCKS_METALS.map((metal) => `
    <span class="aurum-metal-legend-item">
      <span class="aurum-metal-swatch aurum-ingot-cell ${escapeHtml(metal.className)}" aria-hidden="true">
        <span class="aurum-ingot-label">${escapeHtml(metal.short)}</span>
      </span>
      <span>${escapeHtml(metal.full || metal.label)}</span>
    </span>
  `).join("");
}

function renderAurumBlocksHud() {
  const game = state.aurumBlocksGame;
  if (!game) return;
  if (aurumBlocksScore) aurumBlocksScore.textContent = String(Math.max(0, Math.round(game.score || 0)));
  if (aurumBlocksLevel) aurumBlocksLevel.textContent = String(game.level || 1);
  if (aurumBlocksLines) aurumBlocksLines.textContent = String(game.lines || 0);
  if (aurumBlocksCombo) aurumBlocksCombo.textContent = String(game.combo || 0);
  if (aurumBlocksModeLabel) aurumBlocksModeLabel.textContent = AURUM_BLOCKS_MODE_LABELS[game.mode] || "Arcade Libero";
  if (aurumBlocksNext) {
    aurumBlocksNext.innerHTML = (game.next || []).slice(0, 3).map((piece) => `
      <span class="aurum-next-ingot ${escapeHtml(piece.metal?.className || "")}">
        <strong>${escapeHtml(piece.metal?.short || "")}</strong>
        <small>${escapeHtml(piece.metal?.full || piece.metal?.label || "Lingotto")}</small>
        <em>${escapeHtml(piece.name || "Lingotto")}</em>
      </span>
    `).join("");
  }
  renderAurumBlocksLegend();
  updateAurumBlocksUiState();
}

function showAurumBlocksCoach(message = "", options = {}) {
  const game = state.aurumBlocksGame;
  const now = Date.now();
  if (!options.force && game && game.lastCoachAt && now - game.lastCoachAt < 18000) return;
  if (game) game.lastCoachAt = now;
  if (!aurumBlocksCoach) return;
  aurumBlocksCoach.innerHTML = `
    <strong>Aurum coach</strong>
    <span>${escapeHtml(message || "Precisione e metodo: una riga alla volta.")}</span>
  `;
}

function aurumBlocksActiveQuestion() {
  const questions = state.aurumBlocksQuestions.length ? state.aurumBlocksQuestions : AURUM_BLOCKS_FALLBACK_QUESTIONS;
  const game = state.aurumBlocksGame;
  const used = game?.usedQuestions || new Set();
  const available = questions.filter((question) => !used.has(String(question.id || question.question)));
  const pool = available.length ? available : questions;
  const question = pool[Math.floor(aurumBlocksRandom() * pool.length)] || AURUM_BLOCKS_FALLBACK_QUESTIONS[0];
  used.add(String(question.id || question.question));
  if (game) game.usedQuestions = used;
  return question;
}

function maybeShowAurumBlocksQuestion() {
  const game = state.aurumBlocksGame;
  if (!game || game.mode !== "training" || state.aurumBlocksQuestionOpen || !aurumBlocksQuestion) return;
  if (!game.lines || game.lines % 4 !== 0 || game.lastQuestionLine === game.lines) return;
  game.lastQuestionLine = game.lines;
  const question = aurumBlocksActiveQuestion();
  state.aurumBlocksQuestionOpen = true;
  game.paused = true;
  aurumBlocksQuestion.hidden = false;
  aurumBlocksQuestion.innerHTML = `
    <div>
      <span class="training-mode-badge">Training Carature</span>
      <h3>${escapeHtml(question.question || "Domanda Aurum Blocks")}</h3>
      <div class="aurum-blocks-question-options">
        ${(question.options || []).map((option) => `<button type="button" data-aurum-blocks-answer="${escapeHtml(String(option))}" data-correct-answer="${escapeHtml(String(question.correct_answer || ""))}" data-explanation="${escapeHtml(question.explanation || "")}">${escapeHtml(String(option))}</button>`).join("")}
      </div>
    </div>
  `;
}

function answerAurumBlocksQuestion(answerButton) {
  const game = state.aurumBlocksGame;
  if (!game || !answerButton) return;
  const answer = String(answerButton.dataset.aurumBlocksAnswer || "");
  const correct = String(answerButton.dataset.correctAnswer || "");
  const explanation = String(answerButton.dataset.explanation || "");
  const isCorrect = answer === correct;
  if (isCorrect) {
    game.score += 250;
    game.trainingCorrect += 1;
    showAurumBlocksCoach("Risposta corretta: bonus Aurum assegnato.");
  } else {
    game.trainingWrong += 1;
    showAurumBlocksCoach(explanation || `Risposta da ripassare: quella corretta era ${correct}.`);
  }
  state.aurumBlocksQuestionOpen = false;
  game.paused = false;
  if (aurumBlocksQuestion) {
    aurumBlocksQuestion.hidden = true;
    aurumBlocksQuestion.innerHTML = "";
  }
  renderAurumBlocksHud();
}

function aurumBlocksTick(timestamp = 0) {
  const game = state.aurumBlocksGame;
  if (!game || game.over) return;
  if (!document.getElementById("aurumBlocks")?.classList.contains("active-screen")) return;
  if (!game.paused && !state.aurumBlocksQuestionOpen && timestamp - game.lastTick >= game.dropMs) {
    game.lastTick = timestamp;
    if (!aurumBlocksMove(0, 1)) aurumBlocksLockPiece();
  }
  state.aurumBlocksLoop = window.requestAnimationFrame(aurumBlocksTick);
}

function stopAurumBlocksLoop() {
  if (state.aurumBlocksLoop) window.cancelAnimationFrame(state.aurumBlocksLoop);
  state.aurumBlocksLoop = null;
}

async function loadAurumBlocks() {
  const [configData, questionData, scoresData, leaderboardData, badgesData] = await Promise.all([
    apiRequest("/aurum-blocks/config").catch(() => ({ config: null })),
    apiRequest("/aurum-blocks/questions").catch(() => ({ questions: AURUM_BLOCKS_FALLBACK_QUESTIONS })),
    apiRequest("/aurum-blocks/my-scores").catch(() => ({ scores: [] })),
    apiRequest("/aurum-blocks/leaderboard").catch(() => ({ leaderboard: [] })),
    apiRequest("/aurum-blocks/my-badges").catch(() => ({ badges: [] }))
  ]);
  state.aurumBlocksConfig = configData.config || null;
  state.aurumBlocksQuestions = questionData.questions?.length ? questionData.questions : AURUM_BLOCKS_FALLBACK_QUESTIONS;
  state.aurumBlocksScores = scoresData.scores || [];
  state.aurumBlocksBestScore = Number(scoresData.best_score || scoresData.best?.score || 0);
  state.aurumBlocksBestScoreRow = scoresData.best || null;
  state.aurumBlocksLeaderboard = leaderboardData.leaderboard || [];
  state.aurumBlocksBadges = badgesData.badges || [];
  renderAurumBlocksLegend();
  renderAurumBlocksLists();
  if (!state.aurumBlocksGame) renderAurumBlocksBoard();
  if (state.aurumBlocksGame && !state.aurumBlocksGame.over && !state.aurumBlocksLoop) {
    state.aurumBlocksLoop = window.requestAnimationFrame(aurumBlocksTick);
  }
}

function renderAurumBlocksLists() {
  if (aurumBlocksMyScores) {
    const bestScore = Number(state.aurumBlocksBestScore || 0);
    const bestRow = state.aurumBlocksBestScoreRow;
    aurumBlocksMyScores.innerHTML = (state.aurumBlocksScores || []).length
      ? `
        <article class="aurum-blocks-best-score">
          <strong>Record personale ${escapeHtml(String(bestScore))}</strong>
          <span>${escapeHtml(AURUM_BLOCKS_MODE_LABELS[bestRow?.mode] || bestRow?.mode || "Miglior punteggio")}${bestRow?.level ? ` · livello ${escapeHtml(String(bestRow.level))}` : ""}</span>
          <small>${bestRow?.created_at ? escapeHtml(formatDateTime(bestRow.created_at)) : "Storico personale"}</small>
        </article>
        ${state.aurumBlocksScores.map((row) => `
        <article>
          <strong>${escapeHtml(String(row.score || 0))}</strong>
          <span>${escapeHtml(AURUM_BLOCKS_MODE_LABELS[row.mode] || row.mode || "Arcade")} · livello ${escapeHtml(String(row.level || 1))} · righe ${escapeHtml(String(row.lines_cleared || 0))}</span>
          <small>${escapeHtml(formatDateTime(row.created_at))}</small>
        </article>
      `).join("")}`
      : '<div class="empty-state">Nessuna partita salvata.</div>';
  }
  if (aurumBlocksLeaderboard) {
    aurumBlocksLeaderboard.innerHTML = (state.aurumBlocksLeaderboard || []).length
      ? state.aurumBlocksLeaderboard.map((row, index) => `
        <article class="${String(row.user_id || "") === String(state.currentUser?.id || "") ? "is-current-user" : ""}">
          <strong>#${escapeHtml(String(row.position || index + 1))} · ${escapeHtml(String(row.score || 0))}</strong>
          <span>${escapeHtml(row.user_name || row.username || "Operatore OroActive")} · ${escapeHtml(AURUM_BLOCKS_MODE_LABELS[row.mode] || row.mode || "Arcade")}</span>
          <small>${escapeHtml(row.store_name || row.negozio || "Negozio non indicato")} · livello ${escapeHtml(String(row.level || 1))} · righe ${escapeHtml(String(row.lines_cleared || 0))}</small>
        </article>
      `).join("")
      : '<div class="empty-state">Classifica non ancora disponibile.</div>';
  }
  if (aurumBlocksBadges) {
    aurumBlocksBadges.innerHTML = (state.aurumBlocksBadges || []).length
      ? state.aurumBlocksBadges.map((badge) => `
        <article>
          <strong>${escapeHtml(badge.name || badge.badge_name || "Badge Aurum Blocks")}</strong>
          <span>${escapeHtml(badge.description || "")}</span>
          <small>${escapeHtml(formatDateTime(badge.awarded_at || badge.created_at))}</small>
        </article>
      `).join("")
      : '<div class="empty-state">Nessun badge Aurum Blocks ancora ottenuto.</div>';
  }
}

async function startAurumBlocks(mode = "arcade") {
  stopAurumBlocksLoop();
  const normalizedMode = ["arcade", "daily", "training"].includes(mode) ? mode : "arcade";
  let session = null;
  try {
    const data = await apiRequest("/aurum-blocks/session/start", {
      method: "POST",
      body: JSON.stringify({ mode: normalizedMode })
    });
    session = data.session || null;
  } catch (error) {
    session = { id: `local-${Date.now()}`, mode: normalizedMode, daily_seed: new Date().toISOString().slice(0, 10) };
    showToast("Partita avviata. Il salvataggio online verrà tentato a fine partita.", "warning");
  }
  const seed = normalizedMode === "daily" ? (session.daily_seed || new Date().toISOString().slice(0, 10)) : `${Date.now()}-${Math.random()}`;
  const random = normalizedMode === "daily" ? aurumBlocksSeededRandom(seed) : Math.random;
  state.aurumBlocksGame = {
    sessionId: session.id,
    mode: normalizedMode,
    board: aurumBlocksEmptyBoard(),
    active: null,
    next: [],
    score: 0,
    level: 1,
    lines: 0,
    combo: 0,
    bestCombo: 0,
    dropMs: AURUM_BLOCKS_DROP_BASE_MS,
    over: false,
    paused: false,
    lastTick: 0,
    startedAt: Date.now(),
    lastCoachAt: 0,
    trainingCorrect: 0,
    trainingWrong: 0,
    usedQuestions: new Set(),
    random
  };
  state.aurumBlocksGame.active = aurumBlocksCreatePiece();
  state.aurumBlocksGame.next = [aurumBlocksCreatePiece(), aurumBlocksCreatePiece(), aurumBlocksCreatePiece()];
  state.aurumBlocksSession = session;
  state.aurumBlocksQuestionOpen = false;
  if (aurumBlocksGame) aurumBlocksGame.hidden = false;
  if (aurumBlocksGameOver) aurumBlocksGameOver.hidden = true;
  if (aurumBlocksQuestion) aurumBlocksQuestion.hidden = true;
  showAurumBlocksCoach(normalizedMode === "training"
    ? "Training Carature attivo: completa righe e rispondi ai quiz Aurum."
    : "Partita avviata: incastra i lingotti e cerca linee pulite.");
  renderAurumBlocksLegend();
  renderAurumBlocksBoard();
  renderAurumBlocksHud();
  updateAurumBlocksUiState();
  state.aurumBlocksLoop = window.requestAnimationFrame(aurumBlocksTick);
}

function pauseAurumBlocks() {
  const game = state.aurumBlocksGame;
  if (!game || game.over) return;
  game.paused = !game.paused;
  showAurumBlocksCoach(game.paused ? "Pausa attiva. Riprendi quando hai spazio mentale." : "Si riparte: metodo e precisione.");
  updateAurumBlocksUiState();
}

async function endAurumBlocksGame() {
  const game = state.aurumBlocksGame;
  if (!game || game.over) return;
  game.over = true;
  updateAurumBlocksUiState();
  stopAurumBlocksLoop();
  const duration = Math.max(0, Math.round((Date.now() - Number(game.startedAt || Date.now())) / 1000));
  let badges = [];
  let personalRecord = null;
  if (game.sessionId && !String(game.sessionId).startsWith("local-")) {
    try {
      const data = await apiRequest(`/aurum-blocks/session/${encodeURIComponent(game.sessionId)}/finish`, {
        method: "POST",
        body: JSON.stringify({
          score: Math.max(0, Math.round(game.score || 0)),
          level: game.level || 1,
          lines_cleared: game.lines || 0,
          best_combo: game.bestCombo || 0,
          duration_seconds: duration,
          training_correct_answers: game.trainingCorrect || 0,
          training_wrong_answers: game.trainingWrong || 0,
          metadata: { mode_label: AURUM_BLOCKS_MODE_LABELS[game.mode] || game.mode }
        })
      });
      badges = data.badges || [];
      personalRecord = data.personal_record || null;
      await loadAurumBlocks();
    } catch (error) {
      showToast(error.message || "Punteggio Aurum Blocks non salvato.", "warning");
    }
  }
  const personalRecordMarkup = personalRecord?.is_new_personal_record
    ? `<div class="aurum-blocks-record-banner aurum-blocks-record-burst">
        <strong>Nuovo record personale!</strong>
        <span>${escapeHtml(String(personalRecord.new_score || Math.round(game.score || 0)))} punti · +${escapeHtml(String(personalRecord.difference || 0))} rispetto al precedente${personalRecord.position ? ` · posizione #${escapeHtml(String(personalRecord.position))}` : ""}</span>
      </div>`
    : "";
  if (aurumBlocksGameOver) {
    aurumBlocksGameOver.hidden = false;
    aurumBlocksGameOver.innerHTML = `
      <div class="aurum-blocks-final-card">
        <span class="training-mode-badge">Fine partita</span>
        <h3>Aurum Score ${escapeHtml(String(Math.round(game.score || 0)))}</h3>
        <p>Livello ${escapeHtml(String(game.level || 1))} · righe ${escapeHtml(String(game.lines || 0))} · combo migliore ${escapeHtml(String(game.bestCombo || 0))}</p>
        ${personalRecordMarkup}
        ${badges.length ? `<div class="aurum-blocks-earned">${badges.map((badge) => `<strong>${escapeHtml(badge.name || badge.badge_name || "Badge ottenuto")}</strong>`).join("")}</div>` : ""}
        <div class="aurum-blocks-actions">
          <button class="primary-button" type="button" data-aurum-blocks-start="${escapeHtml(game.mode)}">Gioca ancora</button>
          <button type="button" data-aurum-blocks-exit>Menu Aurum Blocks</button>
          <button type="button" data-aurum-blocks-go-gaming>Torna a Gaming OroActive</button>
        </div>
      </div>
    `;
  }
  showAurumBlocksCoach(`Training completato: ${Math.round(game.score || 0)} punti, livello ${game.level || 1}.`);
  updateAurumBlocksUiState();
}

function exitAurumBlocksGame() {
  stopAurumBlocksLoop();
  state.aurumBlocksGame = null;
  state.aurumBlocksQuestionOpen = false;
  if (aurumBlocksGame) aurumBlocksGame.hidden = true;
  if (aurumBlocksQuestion) {
    aurumBlocksQuestion.hidden = true;
    aurumBlocksQuestion.innerHTML = "";
  }
  if (aurumBlocksGameOver) aurumBlocksGameOver.hidden = true;
  renderAurumBlocksBoard();
  updateAurumBlocksUiState(true);
}

function renderGamingAurumBlocks() {
  const scores = state.aurumBlocksScores || [];
  const leaderboard = state.aurumBlocksLeaderboard || [];
  const badges = state.aurumBlocksBadges || [];
  const bestScore = Number(state.aurumBlocksBestScore || 0);
  const bestRow = state.aurumBlocksBestScoreRow || null;

  if (gamingPersonalStats) {
    gamingPersonalStats.innerHTML = scores.length
      ? `
        <article class="is-current-user">
          <strong>Record Aurum Blocks: ${escapeHtml(String(bestScore))}</strong>
          <span>${escapeHtml(AURUM_BLOCKS_MODE_LABELS[bestRow?.mode] || bestRow?.mode || "Miglior punteggio")} · ${escapeHtml(String(scores.length))} partite salvate</span>
          <small>${bestRow?.created_at ? escapeHtml(formatDateTime(bestRow.created_at)) : "Storico personale Aurum Blocks"}</small>
        </article>
        ${scores.slice(0, 4).map((row) => `
          <article>
            <strong>${escapeHtml(String(row.score || 0))} punti</strong>
            <span>${escapeHtml(AURUM_BLOCKS_MODE_LABELS[row.mode] || row.mode || "Arcade")} · livello ${escapeHtml(String(row.level || 1))} · righe ${escapeHtml(String(row.lines_cleared || 0))}</span>
            <small>${escapeHtml(formatDateTime(row.created_at))}</small>
          </article>
        `).join("")}
      `
      : '<div class="empty-state">Nessuna partita Aurum Blocks salvata.</div>';
  }

  if (gamingQuickRanking) {
    gamingQuickRanking.innerHTML = leaderboard.length
      ? leaderboard.slice(0, 6).map((row, index) => `
        <article class="${String(row.user_id || "") === String(state.currentUser?.id || "") ? "is-current-user" : ""}">
          <strong>#${escapeHtml(String(row.position || index + 1))} · ${escapeHtml(String(row.score || 0))}</strong>
          <span>${escapeHtml(row.user_name || row.username || "Operatore OroActive")} · ${escapeHtml(AURUM_BLOCKS_MODE_LABELS[row.mode] || row.mode || "Arcade")}</span>
          <small>${escapeHtml(row.store_name || row.negozio || "Negozio non indicato")} · livello ${escapeHtml(String(row.level || 1))} · righe ${escapeHtml(String(row.lines_cleared || 0))}</small>
        </article>
      `).join("")
      : '<div class="empty-state">Non ci sono ancora altri punteggi in classifica.</div>';
  }

  if (gamingAurumBlocksBadges) {
    gamingAurumBlocksBadges.innerHTML = badges.length
      ? badges.slice(0, 6).map((badge) => `
        <article>
          <strong>${escapeHtml(badge.name || badge.badge_name || "Badge Aurum Blocks")}</strong>
          <span>${escapeHtml(badge.description || "Badge formativo Aurum Blocks")}</span>
          <small>${escapeHtml(formatDateTime(badge.awarded_at || badge.created_at))}</small>
        </article>
      `).join("")
      : '<div class="empty-state">Nessun badge Aurum Blocks ancora ottenuto.</div>';
  }
}

async function loadGamingOroActive() {
  const [overviewData, scoresData, leaderboardData, badgesData] = await Promise.all([
    apiRequest("/gaming/overview").catch(() => ({ overview: null })),
    apiRequest("/aurum-blocks/my-scores").catch(() => ({ scores: [], best_score: 0, best: null })),
    apiRequest("/aurum-blocks/leaderboard").catch(() => ({ leaderboard: [] })),
    apiRequest("/aurum-blocks/my-badges").catch(() => ({ badges: [] }))
  ]);
  state.gamingOverview = overviewData.overview || overviewData || null;
  state.aurumBlocksScores = scoresData.scores || [];
  state.aurumBlocksBestScore = Number(scoresData.best_score || scoresData.best?.score || 0);
  state.aurumBlocksBestScoreRow = scoresData.best || null;
  state.aurumBlocksLeaderboard = leaderboardData.leaderboard || [];
  state.aurumBlocksBadges = badgesData.badges || [];
  renderGamingAurumBlocks();
}

async function trainingCourseFormPayload({ forceActive = null } = {}) {
  const selectedFile = trainingCourseFile?.files?.[0];
  const thumbnailFile = trainingCourseThumbnailFile?.files?.[0];
  const videoFile = trainingCourseVideoFile?.files?.[0];
  const pdfFile = trainingCoursePdfFile?.files?.[0];
  const materialDataUrl = selectedFile ? await fileToDataUrl(selectedFile) : "";
  const thumbnailDataUrl = thumbnailFile ? await fileToDataUrl(thumbnailFile) : "";
  const videoDataUrl = videoFile ? await fileToDataUrl(videoFile) : "";
  const pdfDataUrl = pdfFile ? await fileToDataUrl(pdfFile) : "";
  return {
    title: document.getElementById("trainingCourseTitle").value.trim(),
    faculty: document.getElementById("trainingCourseFaculty").value.trim(),
    category: document.getElementById("trainingCourseCategory").value.trim(),
    section: document.getElementById("trainingCourseSection").value.trim(),
    level: document.getElementById("trainingCourseLevel").value.trim(),
    duration_label: document.getElementById("trainingCourseDuration").value.trim(),
    teacher: document.getElementById("trainingCourseTeacher").value.trim(),
    thumbnail_url: document.getElementById("trainingCourseThumbnail").value.trim(),
    module_title: document.getElementById("trainingCourseModule").value.trim(),
    lesson_title: document.getElementById("trainingCourseLesson").value.trim(),
    description: document.getElementById("trainingCourseDescription").value.trim(),
    video_url: document.getElementById("trainingCourseVideo").value.trim(),
    pdf_url: document.getElementById("trainingCoursePdf").value.trim(),
    material_url: document.getElementById("trainingCourseMaterial").value.trim(),
    thumbnail_data_url: thumbnailDataUrl,
    thumbnail_filename: thumbnailFile?.name || "",
    thumbnail_mime_type: thumbnailFile?.type || "",
    video_data_url: videoDataUrl,
    video_filename: videoFile?.name || "",
    video_mime_type: videoFile?.type || "",
    pdf_data_url: pdfDataUrl,
    pdf_filename: pdfFile?.name || "",
    pdf_mime_type: pdfFile?.type || "",
    material_data_url: materialDataUrl,
    material_filename: selectedFile?.name || "",
    material_type: selectedFile?.type || "",
    material_mime_type: selectedFile?.type || "",
    active: forceActive === null ? document.getElementById("trainingCourseActive").checked : Boolean(forceActive),
    final_certification: document.getElementById("trainingCourseCertification").checked
  };
}

async function createTrainingCourse(event) {
  event.preventDefault();
  if (!canManageCoursesUi()) return;
  const id = document.getElementById("trainingCourseId")?.value;
  if (!id) {
    showToast("Seleziona un corso da Gestione Academy per modificarlo.", "warning");
    return;
  }
  const payload = await trainingCourseFormPayload();
  const savedCourse = await apiRequest(`/corsi/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  mergeTrainingCourseInState(savedCourse, payload);
  resetTrainingCourseFormValues();
  renderTraining();
  await loadTraining();
  showToast("Corso aggiornato correttamente.");
}

async function updateCourseProgress(courseId) {
  const current = courseProgressFor(courseId);
  const value = window.prompt("Percentuale completamento corso", String(current.percentuale || 25));
  if (value === null) return;
  const percent = Math.max(0, Math.min(100, Number(value || 0)));
  await apiRequest("/corsi/progress", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, percentuale: percent, status: percent >= 100 ? "completato" : "in corso" })
  });
  await loadTraining();
  showToast("Avanzamento corso aggiornato.");
}

async function markCourseExamPassed(courseId) {
  if (!canEvaluateCoursesUi()) return;
  const examType = window.confirm("Esame svolto in live? Premi OK per live, Annulla per presenza.") ? "live" : "presenza";
  await apiRequest("/corsi/esami", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, user_id: state.currentUser?.id, exam_type: examType, esito: "superato" })
  });
  await loadTraining();
  showToast("Esame superato, certificazione e badge assegnati.");
}

function academyExamHashSeed(seed = "") {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function academyExamMixedOptions(question = {}, courseId = "", questionIndex = 0) {
  const rawOptions = Array.isArray(question.options) ? question.options.map((option) => String(option)) : [];
  const options = rawOptions.map((option, originalIndex) => ({ option, originalIndex }));
  if (options.length < 2) return options;

  let seed = academyExamHashSeed(`${courseId}:${question.id || question.question || questionIndex}:${questionIndex}`);
  for (let index = options.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }

  if (options[0]?.originalIndex === 0) {
    const targetIndex = (academyExamHashSeed(`${seed}:first-answer-offset`) % (options.length - 1)) + 1;
    [options[0], options[targetIndex]] = [options[targetIndex], options[0]];
  }

  return options;
}

function showCourseExamModal(courseId) {
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  if (!course) return;
  const questions = courseFinalExamQuestions(course);
  if (!questions.length) {
    void markCourseExamPassed(courseId);
    return;
  }
  const retryMessage = courseExamRetryMessage(course);
  if (retryMessage) {
    showToast(retryMessage, "warning");
    return;
  }
  const passScore = Number(course.final_exam?.pass_score || 80);
  const requiredCorrect = Math.ceil((questions.length * passScore) / 100);
  document.querySelector(".academy-preview-backdrop")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="academy-preview-backdrop" role="dialog" aria-modal="true" aria-label="Test finale corso Academy">
      <article class="academy-preview-modal academy-exam-modal">
        <header>
          <div>
            <span class="course-pill">Test finale</span>
            <h3>${escapeHtml(course.title || "Corso Academy")}</h3>
            <p>Rispondi correttamente ad almeno ${escapeHtml(String(requiredCorrect))} domande su ${escapeHtml(String(questions.length))} (${escapeHtml(String(passScore))}%) per ottenere badge e certificazione interna OroActive Academy.</p>
          </div>
          <button type="button" class="academy-preview-close" data-close-course-preview aria-label="Chiudi test">×</button>
        </header>
        <form class="academy-exam-form" data-course-final-exam-form="${escapeHtml(String(course.id))}">
          ${questions.map((question, index) => `
            <fieldset class="academy-exam-question">
              <legend>${index + 1}. ${escapeHtml(question.question || "Domanda")}</legend>
              <div class="academy-exam-options">
                ${academyExamMixedOptions(question, course.id, index).map(({ option, originalIndex }, optionIndex) => {
                  const optionId = `academy-exam-${question.id}-${optionIndex}-${originalIndex}-${String(option).replace(/[^a-z0-9]+/gi, "-").slice(0, 24)}`;
                  return `
                    <label for="${escapeHtml(optionId)}">
                      <input
                        id="${escapeHtml(optionId)}"
                        type="radio"
                        name="academy-exam-${escapeHtml(String(question.id))}"
                        value="${escapeHtml(String(option))}"
                        data-academy-option-original-index="${escapeHtml(String(originalIndex))}"
                        data-academy-exam-answer="${escapeHtml(String(question.id))}">
                      <span>${escapeHtml(String(option))}</span>
                    </label>
                  `;
                }).join("")}
              </div>
            </fieldset>
          `).join("")}
          <div class="academy-exam-feedback" data-academy-exam-feedback hidden></div>
        </form>
        <footer>
          <button type="button" data-close-course-preview>Chiudi</button>
          <button class="primary-button" type="button" data-submit-course-final-exam="${escapeHtml(String(course.id))}">Consegna test</button>
        </footer>
      </article>
    </div>
  `);
}

async function submitCourseFinalExam(courseId) {
  const form = document.querySelector(`[data-course-final-exam-form="${cssEscape(courseId)}"]`);
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  const questions = courseFinalExamQuestions(course);
  if (!form || !course || !questions.length) return;
  const answers = questions.map((question) => {
    const selected = form.querySelector(`[data-academy-exam-answer="${cssEscape(String(question.id))}"]:checked`);
    return {
      question_id: question.id,
      answer: selected?.value || ""
    };
  });
  if (answers.some((answer) => !answer.answer)) {
    const feedback = form.querySelector("[data-academy-exam-feedback]");
    if (feedback) {
      feedback.hidden = false;
      feedback.className = "academy-exam-feedback error";
      feedback.textContent = "Rispondi a tutte le domande prima di consegnare il test.";
    }
    return;
  }
  const result = await apiRequest("/academy/exams", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, answers })
  });
  const feedback = form.querySelector("[data-academy-exam-feedback]");
  if (feedback) {
    feedback.hidden = false;
    feedback.className = `academy-exam-feedback ${result.passed ? "success" : "error"}`;
    const retryText = result.retry_available_at
      ? ` Potrai ripetere il test dal ${formatDateTime(result.retry_available_at)}.`
      : " Potrai ripetere il test dopo 48 ore.";
    feedback.textContent = result.passed
      ? `Test superato: ${result.correct}/${result.total} risposte corrette (${result.score}%). Badge e certificato sono ora disponibili.`
      : `Test non superato: ${result.correct}/${result.total} risposte corrette (${result.score}%). Servono almeno ${Math.ceil((Number(result.total || 0) * Number(result.pass_score || 0)) / 100)} risposte corrette su ${result.total}.${retryText}`;
  }
  if (!result.passed) {
    const submitButton = document.querySelector(`[data-submit-course-final-exam="${cssEscape(courseId)}"]`);
    if (submitButton) submitButton.disabled = true;
    await loadTraining();
    showToast("Test non superato. Potrai ripeterlo dopo 48 ore.", "warning");
    return;
  }
  if (result.passed) {
    await loadTraining();
    window.setTimeout(() => document.querySelector(".academy-preview-backdrop")?.remove(), 900);
    showToast("Test superato: certificato e badge assegnati.", "success");
  }
}

async function downloadCourseSlides(courseId, options = {}) {
  const download = options.download !== false;
  const response = await fetch(`${apiBase}/academy/courses/${encodeURIComponent(courseId)}/slides/download${download ? "?download=1" : ""}`, {
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Slide PDF non disponibili.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  if (download) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `corso-oroactive-${courseId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function editCourse(courseId) {
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  if (!course) return;
  state.courseActiveTab = "management";
  const form = ensureTrainingCourseEditForm();
  if (!form) {
    showToast("Modifica corso non disponibile.", "error");
    return;
  }
  document.getElementById("trainingCourseId").value = course.id;
  document.getElementById("trainingCourseTitle").value = course.title || "";
  document.getElementById("trainingCourseFaculty").value = course.faculty_name || "Facoltà Metalli Preziosi";
  document.getElementById("trainingCourseCategory").value = course.category_name || course.category || "Oro";
  document.getElementById("trainingCourseSection").value = course.section_title || "";
  document.getElementById("trainingCourseLevel").value = course.level || "Base";
  document.getElementById("trainingCourseDuration").value = course.duration_label || "";
  document.getElementById("trainingCourseTeacher").value = course.teacher || "";
  document.getElementById("trainingCourseThumbnail").value = course.thumbnail_url || "";
  document.getElementById("trainingCourseModule").value = course.academy_module_title || course.module_title || "";
  document.getElementById("trainingCourseLesson").value = course.academy_lesson_title || course.lesson_title || "";
  document.getElementById("trainingCourseDescription").value = course.description || "";
  document.getElementById("trainingCourseVideo").value = course.academy_video_url || course.video_url || "";
  document.getElementById("trainingCoursePdf").value = course.academy_pdf_url || course.pdf_url || "";
  document.getElementById("trainingCourseMaterial").value = course.material_url || "";
  document.getElementById("trainingCourseActive").checked = course.active !== false;
  document.getElementById("trainingCourseCertification").checked = course.final_certification !== false;
  if (trainingCourseSaveButton) trainingCourseSaveButton.textContent = "Salva modifiche";
  if (trainingCoursePreviewButton) trainingCoursePreviewButton.hidden = true;
  renderTraining();
  if (trainingCourseForm) trainingCourseForm.hidden = false;
  trainingCourseForm?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function trainingCoursePreviewPayload() {
  return {
    id: document.getElementById("trainingCourseId")?.value || "",
    title: document.getElementById("trainingCourseTitle")?.value.trim() || "Corso Academy",
    faculty_name: document.getElementById("trainingCourseFaculty")?.value.trim() || "Facoltà Metalli Preziosi",
    category_name: document.getElementById("trainingCourseCategory")?.value.trim() || "Formazione",
    section_title: document.getElementById("trainingCourseSection")?.value.trim() || "Generale",
    level: document.getElementById("trainingCourseLevel")?.value.trim() || "Base",
    duration_label: document.getElementById("trainingCourseDuration")?.value.trim() || "Da definire",
    teacher: document.getElementById("trainingCourseTeacher")?.value.trim() || "OroActive Academy",
    thumbnail_url: document.getElementById("trainingCourseThumbnail")?.value.trim() || "",
    module_title: document.getElementById("trainingCourseModule")?.value.trim() || "Modulo introduttivo",
    lesson_title: document.getElementById("trainingCourseLesson")?.value.trim() || "Lezione principale",
    description: document.getElementById("trainingCourseDescription")?.value.trim() || "",
    video_url: document.getElementById("trainingCourseVideo")?.value.trim() || "",
    pdf_url: document.getElementById("trainingCoursePdf")?.value.trim() || "",
    material_url: document.getElementById("trainingCourseMaterial")?.value.trim() || "",
    active: document.getElementById("trainingCourseActive")?.checked !== false,
    final_certification: document.getElementById("trainingCourseCertification")?.checked !== false
  };
}

async function loadCourseDetailsForPreview(courseId) {
  if (!courseId) return null;
  try {
    return await apiRequest(`/academy/courses/${encodeURIComponent(courseId)}`);
  } catch (error) {
    console.warn("Dettaglio corso non disponibile, uso dati locali:", error);
    return state.trainingCourses.find((item) => String(item.id) === String(courseId)) || null;
  }
}

function coursePreviewModulesMarkup(course = {}) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  if (modules.length) {
    return modules.map((module) => `
      <section class="academy-preview-module">
        <h4>${escapeHtml(module.title || "Modulo")}</h4>
        <p>${escapeHtml(module.description || module.objective || "")}</p>
        <ul>
          ${(module.lessons || []).slice(0, 10).map((lesson) => `<li>${escapeHtml(lesson.title || "Lezione")}</li>`).join("") || "<li>Lezioni da completare</li>"}
        </ul>
      </section>
    `).join("");
  }
  return `
    <section class="academy-preview-module">
      <h4>${escapeHtml(course.module_title || course.academy_module_title || "Modulo introduttivo")}</h4>
      <ul><li>${escapeHtml(course.lesson_title || course.academy_lesson_title || "Lezione principale")}</li></ul>
    </section>
  `;
}

function showCoursePreviewModal(course = {}) {
  document.querySelector(".academy-preview-backdrop")?.remove();
  const status = course.active === false ? "Bozza non pubblicata" : "Visibile / pubblicabile";
  document.body.insertAdjacentHTML("beforeend", `
    <div class="academy-preview-backdrop" role="dialog" aria-modal="true" aria-label="Anteprima corso Academy">
      <article class="academy-preview-modal">
        <header>
          <div>
            <span class="course-pill">Anteprima corso</span>
            <h3>${escapeHtml(course.title || "Corso Academy")}</h3>
            <p>${escapeHtml(course.description || "Descrizione da completare.")}</p>
          </div>
          <button type="button" class="academy-preview-close" data-close-course-preview aria-label="Chiudi anteprima">×</button>
        </header>
        <div class="academy-preview-meta">
          <span>${escapeHtml(course.faculty_name || "Academy")}</span>
          <span>${escapeHtml(course.category_name || course.category || "Formazione")}</span>
          <span>Livello ${escapeHtml(course.level || "Base")}</span>
          <span>Durata ${escapeHtml(course.duration_label || "Da definire")}</span>
          <span>${escapeHtml(status)}</span>
        </div>
        <div class="academy-preview-content">
          ${course.thumbnail_url ? `<img src="${escapeHtml(course.thumbnail_url)}" alt="Anteprima corso ${escapeHtml(course.title || "")}">` : ""}
          ${coursePreviewModulesMarkup(course)}
          <section class="academy-preview-module">
            <h4>Materiali collegati</h4>
            <ul>
              ${course.video_url || course.academy_video_url ? `<li>Video lezione disponibile</li>` : ""}
              ${course.pdf_url || course.academy_pdf_url ? `<li>PDF lezione disponibile</li>` : ""}
              ${course.material_url ? `<li>Materiale didattico collegato</li>` : ""}
              ${!(course.video_url || course.academy_video_url || course.pdf_url || course.academy_pdf_url || course.material_url) ? "<li>Nessun materiale aggiuntivo collegato.</li>" : ""}
            </ul>
          </section>
        </div>
        <footer>
          <button type="button" data-close-course-preview>Chiudi</button>
        </footer>
      </article>
    </div>
  `);
}

async function previewCurrentCourseDraft() {
  if (!canManageCoursesUi()) return;
  const draft = trainingCoursePreviewPayload();
  const details = draft.id ? await loadCourseDetailsForPreview(draft.id) : null;
  showCoursePreviewModal({ ...(details || {}), ...draft });
}

async function publishCurrentCourseDraft() {
  if (!canManageCoursesUi()) return;
  const id = document.getElementById("trainingCourseId")?.value;
  if (!id) {
    showToast("Prima seleziona Modifica su un corso oppure crea il corso.", "warning");
    return;
  }
  const payload = await trainingCourseFormPayload({ forceActive: true });
  const savedCourse = await apiRequest(`/corsi/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  mergeTrainingCourseInState(savedCourse, payload);
  await publishCourse(id, { skipConfirm: true });
}

async function publishCourse(courseId, options = {}) {
  if (!canManageCoursesUi()) return;
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  if (!options.skipConfirm && !window.confirm(`Pubblicare il corso "${course?.title || "Academy"}" e renderlo disponibile agli utenti autorizzati?`)) return;
  const publishedCourse = await apiRequest(`/corsi/${encodeURIComponent(courseId)}/publish`, { method: "POST" });
  mergeTrainingCourseInState(publishedCourse, { active: true });
  await loadTraining();
  showToast("Corso pubblicato correttamente.", "success");
}

async function saveAcademyNote(courseId, lessonId = "") {
  const textarea = document.querySelector(`[data-academy-note="${cssEscape(courseId)}"]`);
  await apiRequest("/academy/notes", {
    method: "POST",
    body: JSON.stringify({
      course_id: courseId,
      lesson_id: lessonId || null,
      note: textarea?.value || ""
    })
  });
  await loadTraining();
  showToast("Appunti salvati.");
}

function askCourseAi(courseId) {
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  if (!course) return;
  setScreen("assistant");
  assistantQuestion.value = `Aiutami a studiare questa lezione OroActive Academy:\nCorso: ${course.title}\nFacoltà: ${course.faculty_name || "Academy"}\nModulo: ${course.academy_module_title || course.module_title || ""}\nLezione: ${course.academy_lesson_title || course.lesson_title || ""}\n\nRiassumi i punti chiave e preparami 5 domande di ripasso.`;
  assistantQuestion.focus();
}

async function deleteCourse(courseId) {
  if (!canManageCoursesUi()) return;
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  const title = course?.title || "questo corso";
  if (!window.confirm(`Vuoi davvero eliminare definitivamente "${title}"?\n\nL'operazione rimuove il corso dal catalogo Academy e non può essere annullata.`)) return;
  await apiRequest(`/corsi/${encodeURIComponent(courseId)}`, { method: "DELETE" });
  await loadTraining();
  showToast("Corso eliminato correttamente.");
}

async function deleteCourseMaterial(materialId) {
  if (!canManageCoursesUi()) return;
  if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;
  await apiRequest(`/corsi/materiali/${encodeURIComponent(materialId)}`, { method: "DELETE" });
  await loadTraining();
  showToast("Materiale eliminato correttamente.");
}

async function deleteCourseSection(sectionId) {
  if (!canManageCoursesUi()) return;
  if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;
  await apiRequest(`/corsi/sottosezioni/${encodeURIComponent(sectionId)}`, { method: "DELETE" });
  await loadTraining();
  showToast("Sottosezione eliminata correttamente.");
}

async function createAcademyFaculty() {
  if (!canManageCoursesUi()) return;
  const name = document.getElementById("academyFacultyName")?.value.trim();
  const description = document.getElementById("academyFacultyDescription")?.value.trim();
  if (!name) {
    showToast("Inserisci il nome della facoltà.");
    return;
  }
  await apiRequest("/academy/facolta", {
    method: "POST",
    body: JSON.stringify({ name, description })
  });
  await loadTraining();
  showToast("Facoltà creata correttamente.");
}

async function editAcademyFaculty(facultyId) {
  if (!canManageCoursesUi()) return;
  const faculty = state.courseFaculties.find((item) => String(item.id) === String(facultyId));
  if (!faculty) return;
  const name = window.prompt("Nome facoltà", faculty.name || "");
  if (name === null) return;
  const description = window.prompt("Descrizione facoltà", faculty.description || "");
  if (description === null) return;
  await apiRequest(`/academy/facolta/${encodeURIComponent(facultyId)}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, active: true })
  });
  await loadTraining();
  showToast("Facoltà aggiornata correttamente.");
}

async function deleteAcademyFaculty(facultyId) {
  if (!canManageCoursesUi()) return;
  if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;
  await apiRequest(`/academy/facolta/${encodeURIComponent(facultyId)}`, { method: "DELETE" });
  await loadTraining();
  showToast("Facoltà eliminata correttamente.");
}

async function downloadCourseCertificate(certificateId) {
  const response = await fetch(`${apiBase}/academy/certificates/${encodeURIComponent(certificateId)}/download`, {
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Certificazione non scaricabile.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificazione-oroactive-${certificateId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function startOperatorTraining(scenarioId) {
  const data = await apiRequest("/training/start", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId })
  });
  state.activeTrainingSession = data.training_session || null;
  state.activeTrainingData = data.demo_data || {};
  state.courseActiveTab = "operatorTraining";
  renderTraining();
  showToast("Training Operatore avviato in modalità demo.", "success");
}

async function saveOperatorTrainingProgress(sessionId) {
  const demoData = currentTrainingFormData();
  const data = await apiRequest(`/training/session/${encodeURIComponent(sessionId)}/save-progress`, {
    method: "POST",
    body: JSON.stringify({ demo_data: demoData })
  });
  state.activeTrainingSession = data.training_session || state.activeTrainingSession;
  state.activeTrainingData = demoData;
  showToast("Progresso training salvato senza creare dati reali.", "success");
}

async function completeOperatorTraining(sessionId) {
  const demoData = currentTrainingFormData();
  const data = await apiRequest(`/training/session/${encodeURIComponent(sessionId)}/complete`, {
    method: "POST",
    body: JSON.stringify({ demo_data: demoData })
  });
  const session = data.training_session || {};
  state.activeTrainingSession = null;
  state.activeTrainingData = null;
  await loadTraining();
  previewTitle.textContent = "Risultato Training Operatore";
  previewBody.innerHTML = trainingResultDetailMarkup(session);
  previewModal.hidden = false;
  showToast(session.passed ? "Training superato." : "Training da ripetere.", session.passed ? "success" : "warning");
}

function trainingResultDetailMarkup(result = {}) {
  const feedback = result.feedback || {};
  const mistakes = result.mistakes || [];
  return `
    <section class="operator-training-detail">
      <span class="training-mode-badge">Risultato formativo</span>
      <h3>${escapeHtml(result.scenario_title || "Training Operatore")}</h3>
      <div class="operator-training-score large">
        <span>Punteggio</span>
        <strong>${Number(result.score || 0)}/${Number(result.max_score || 100)}</strong>
        <small>${result.passed ? "Superato" : "Da ripetere"}</small>
      </div>
      <p>${escapeHtml(feedback.summary || "Feedback non disponibile.")}</p>
      <h4>Aurum</h4>
      <p>${escapeHtml(feedback.aurum || "Rivedi i passaggi e riprova lo scenario.")}</p>
      <h4>Errori rilevati</h4>
      ${mistakes.length ? `<ul>${mistakes.map((mistake) => `<li><strong>${escapeHtml(mistake.message)}</strong><span>${escapeHtml(mistake.severity || "")} · -${Number(mistake.points || 0)} punti</span></li>`).join("")}</ul>` : "<p>Nessun errore bloccante rilevato.</p>"}
      <h4>Punti forti</h4>
      ${(feedback.strengths || []).length ? `<ul>${feedback.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Nessun punto forte registrato.</p>"}
      <h4>Miglioramenti</h4>
      ${(feedback.improvements || []).length ? `<ul>${feedback.improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Continua ad allenarti con scenari diversi.</p>"}
    </section>
  `;
}

async function openOperatorTrainingResult(id) {
  const data = await apiRequest(`/training/results/${encodeURIComponent(id)}`);
  previewTitle.textContent = "Dettaglio Training Operatore";
  previewBody.innerHTML = trainingResultDetailMarkup(data.result || {});
  previewModal.hidden = false;
}

function renderCrmClients() {
  if (!crmList) return;
  if (!state.crmClients.length) {
    crmList.innerHTML = '<div class="empty-state">Nessun cliente trovato.</div>';
    return;
  }
  crmList.innerHTML = `
    <div class="table-row head"><span>Cliente</span><span>Negozi</span><span>Codice fiscale</span><span>Telefono</span><span>Storico</span><span>Azioni</span></div>
    ${state.crmClients.map((client) => `
      <div class="table-row">
        <strong>${escapeHtml(`${client.name || ""} ${client.surname || ""}`.trim() || "Dato non inserito")}</strong>
        <span>${escapeHtml((client.negozi_visitati || []).join(", ") || "Dato non inserito")}</span>
        <span>${escapeHtml(client.fiscalCode || "")}</span>
        <span>${escapeHtml(client.phone || "")}</span>
        <span>${Number(client.atti_count || 0)} atti · ${escapeHtml(formatEuro(client.totale_pagato || 0))}<small>Shield medio ${Number(client.aurum_shield_average_score || 0)}/100</small></span>
        <button type="button" data-open-crm-client="${client.id}">Apri</button>
      </div>
    `).join("")}
  `;
}

async function loadCrmClients() {
  const query = queryString({ q: crmSearch?.value.trim() || "" });
  const data = await apiRequest(`/crm/clienti${query ? `?${query}` : ""}`);
  state.crmClients = data.clients || [];
  renderCrmClients();
}

async function openCrmClient(id) {
  const detail = await apiRequest(`/crm/clienti/${id}`);
  const client = detail.client || {};
  previewTitle.textContent = "Scheda CRM cliente";
  previewBody.innerHTML = `
    <section class="customer-copy-options crm-edit-panel" data-crm-edit="${escapeHtml(String(client.id))}">
      <h3>${escapeHtml(`${client.name || ""} ${client.surname || ""}`.trim() || "Cliente")}</h3>
      <div class="crm-edit-grid">
        <label>Nome <input id="crmEditName" value="${escapeHtml(client.name || "")}"></label>
        <label>Cognome <input id="crmEditSurname" value="${escapeHtml(client.surname || "")}"></label>
        <label>Codice fiscale <input id="crmEditFiscalCode" value="${escapeHtml(client.fiscalCode || "")}"></label>
        <label>Telefono <input id="crmEditPhone" value="${escapeHtml(client.phone || "")}"></label>
        <label>Email <input id="crmEditEmail" value="${escapeHtml(client.email || "")}"></label>
        <label>Indirizzo <input id="crmEditAddress" value="${escapeHtml(client.address || "")}"></label>
        <label>Provincia <input id="crmEditProvince" value="${escapeHtml(client.province || "")}"></label>
        <label>Documento <input id="crmEditDocumentType" value="${escapeHtml(client.documentType || "")}"></label>
        <label>Numero documento <input id="crmEditDocumentNumber" value="${escapeHtml(client.documentNumber || "")}"></label>
        <label>IBAN <input id="crmEditIban" value="${escapeHtml(client.iban || "")}"></label>
        <label>Intestatario conto <input id="crmEditAccountHolder" value="${escapeHtml(client.accountHolder || "")}"></label>
        <label>Livello cliente
          <select id="crmEditLevel">
            ${["nuovo", "ricorrente", "VIP", "attenzione", "bloccato"].map((level) => `<option ${String(client.level || client.livello_cliente || "nuovo") === level ? "selected" : ""}>${level}</option>`).join("")}
          </select>
        </label>
        <label>Note operative <textarea id="crmEditNotes" rows="4">${escapeHtml(client.notes || "")}</textarea></label>
      </div>
      <h4>Storico atti</h4>
      ${(detail.acts || []).map((act) => `<p>${escapeHtml(act.practiceNumber)} · ${escapeHtml(act.date)} · ${escapeHtml(formatEuro(act.amount || 0))}</p>`).join("") || "<p>Nessun atto collegato.</p>"}
      <h4>Trust Pack</h4>
      <div class="crm-trust-pack-list">
        ${(detail.trust_packs || []).map((pack) => `
          <div class="crm-trust-pack-row">
            <span><strong>${escapeHtml(pack.trust_pack_code || "Trust Pack")}</strong><small>${escapeHtml(pack.practice_number || "")} · ${escapeHtml(formatDateTime(pack.generated_at || ""))} · ${escapeHtml(pack.delivery_status || "generated")}</small></span>
            <button type="button" data-download-trust-pack="${escapeHtml(String(pack.id))}">Download</button>
          </div>
        `).join("") || "<p>Nessun Customer Trust Pack generato.</p>"}
      </div>
      <h4>Aurum Shield</h4>
      <div class="aurum-shield-crm">
        <p>Score medio storico: <strong>${Number(detail.aurum_shield?.average_score || 0)}/100</strong></p>
        <p>Ultimo score: <strong>${Number(detail.aurum_shield?.latest_score?.score || 0)}/100</strong></p>
        <p>Alert aperti: <strong>${Number(detail.aurum_shield?.open_alerts?.length || 0)}</strong></p>
        ${(detail.aurum_shield?.history || []).slice(0, 5).map((row) => `<p>${escapeHtml(row.practice_number || "")} · ${escapeHtml(row.risk_level || "")} · ${Number(row.score || 0)}/100</p>`).join("") || "<p>Nessuno storico rischio registrato.</p>"}
      </div>
      <h4>Note interne</h4>
      ${(detail.notes || []).map((note) => `<p>${escapeHtml(note.note)}</p>`).join("") || "<p>Nessuna nota.</p>"}
      <div class="preview-action-stack">
        <button class="primary-button" type="button" data-save-crm-client="${escapeHtml(String(client.id))}">Salva modifiche</button>
        <button class="danger-button" type="button" data-delete-crm-client="${escapeHtml(String(client.id))}">Elimina cliente</button>
      </div>
    </section>
  `;
  previewModal.hidden = false;
}

async function saveCrmClient(id) {
  await apiRequest(`/crm/clienti/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      name: document.getElementById("crmEditName")?.value.trim(),
      surname: document.getElementById("crmEditSurname")?.value.trim(),
      fiscalCode: document.getElementById("crmEditFiscalCode")?.value.trim(),
      phone: document.getElementById("crmEditPhone")?.value.trim(),
      email: document.getElementById("crmEditEmail")?.value.trim(),
      address: document.getElementById("crmEditAddress")?.value.trim(),
      province: document.getElementById("crmEditProvince")?.value.trim(),
      documentType: document.getElementById("crmEditDocumentType")?.value.trim(),
      documentNumber: document.getElementById("crmEditDocumentNumber")?.value.trim(),
      iban: document.getElementById("crmEditIban")?.value.trim(),
      accountHolder: document.getElementById("crmEditAccountHolder")?.value.trim(),
      level: document.getElementById("crmEditLevel")?.value,
      notes: document.getElementById("crmEditNotes")?.value.trim()
    })
  });
  previewModal.hidden = true;
  await loadCrmClients();
  showToast("Cliente aggiornato correttamente", "success");
}

async function deleteCrmClient(id) {
  if (!window.confirm("Sei sicuro di voler eliminare questo cliente dal CRM?")) return;
  await apiRequest(`/crm/clienti/${encodeURIComponent(id)}`, { method: "DELETE" });
  previewModal.hidden = true;
  await loadCrmClients();
  showToast("Cliente eliminato dal CRM.", "success");
}

function actOperatorKey(act) {
  return String(act.operatorUsername || act.operatorName || "").trim().toLowerCase();
}

function userOperatorKey(user) {
  return String(displayUsername(user) || user.nome || "").trim().toLowerCase();
}

function actSpentAmount(act) {
  const materialSum = Array.isArray(act.materialAmounts)
    ? act.materialAmounts.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    : 0;
  return materialSum > 0 ? materialSum : Number(act.amount || 0);
}

function directFlagsForUser(user) {
  const key = userOperatorKey(user);
  const acts = demoActs.filter((act) => actOperatorKey(act) === key);
  return {
    positive: acts.filter((act) => act.qualityReview?.status === "positive").length,
    negative: acts.filter((act) => act.qualityReview?.status === "negative").length
  };
}

function managedOperatorKeysForResponsible() {
  return new Set((state.users || [])
    .filter((user) => ["aiuto_commesso", "commesso"].includes(normalizeRole(user.ruolo)))
    .map(userOperatorKey)
    .filter(Boolean));
}

function teamFlagsForResponsible() {
  const managedKeys = managedOperatorKeysForResponsible();
  if (!managedKeys.size) return { positive: 0, negative: 0 };
  const acts = demoActs.filter((act) => managedKeys.has(actOperatorKey(act)));
  return {
    positive: acts.filter((act) => act.qualityReview?.status === "positive").length,
    negative: acts.filter((act) => act.qualityReview?.status === "negative").length
  };
}

function scoreTargetForUser(user) {
  return ROLE_LEVELS.find((level) => level.role === normalizeRole(user?.ruolo)) || null;
}

function scoreDetailsForUser(user) {
  const role = normalizeRole(user?.ruolo);
  const direct = directFlagsForUser(user);
  if (role === "responsabile") {
    const team = teamFlagsForResponsible();
    const points = Math.max(0, ((direct.positive + team.positive) * QUALITY_FLAG_POINTS) - (team.negative * 5));
    return {
      points,
      positive: direct.positive + team.positive,
      negative: team.negative,
      directPositive: direct.positive,
      teamPositive: team.positive
    };
  }

  return {
    points: direct.positive * QUALITY_FLAG_POINTS,
    positive: direct.positive,
    negative: direct.negative,
    directPositive: direct.positive,
    teamPositive: 0
  };
}

function scoreProgress(user) {
  const score = scoreDetailsForUser(user);
  const target = scoreTargetForUser(user);
  if (!target) {
    return {
      ...score,
      target: null,
      percent: 0
    };
  }
  const percent = Math.min(100, Math.max(0, (score.points / Math.max(target.points, 1)) * 100));
  return {
    ...score,
    target,
    percent
  };
}

function scoreBarMarkup(user) {
  const score = scoreProgress(user);
  if (!score.target) {
    return `<span class="user-score-cell muted">${normalizeRole(user?.ruolo) === "founder" ? "Fondatore OroActive" : "Nessun obiettivo previsto"}</span>`;
  }
  const unlockText = `${score.points}/${score.target.points} punti`;
  const levelText = score.points >= score.target.points
    ? `${score.target.label} raggiunto`
    : `Obiettivo: ${score.target.label}`;
  const penaltyText = normalizeRole(user?.ruolo) === "responsabile" && score.negative
    ? ` - ${score.negative} flag negativi team`
    : "";
  const objectiveMarkup = isFounder()
    ? `<button class="score-goal-button" type="button" data-goal-message="${escapeHtml(String(user.id))}">${escapeHtml(levelText)}</button>`
    : `<em>${escapeHtml(levelText)}</em>`;
  return `
    <div class="score-wrap">
      <div class="score-bar" aria-label="Punteggio operatore">
        <span style="width:${score.percent.toFixed(1)}%"></span>
      </div>
      <small>${escapeHtml(unlockText)} - ${escapeHtml(score.positive)} flag positivi${escapeHtml(penaltyText)}</small>
      ${objectiveMarkup}
    </div>
  `;
}

function showLevelMessageForUser(user, options = {}) {
  if (!user || !previewModal || !previewBody || !previewTitle) return false;
  const role = normalizeRole(user.ruolo);
  const message = LEVEL_UNLOCK_MESSAGES[role];
  if (!message) return false;

  const score = scoreProgress(user);
  if (!score.target) return false;
  if (!options.previewOnly && score.points < score.target.points) return false;

  if (!options.previewOnly) {
    const storageKey = `oroactive-level-unlock-${user.id || displayUsername(user)}-${role}-${score.target.points}`;
    if (localStorage.getItem(storageKey)) return false;
    localStorage.setItem(storageKey, "shown");
  }

  previewTitle.textContent = message.title;
  previewBody.innerHTML = `
    <section class="level-unlock-message">
      <h3>${escapeHtml(message.title)}</h3>
      ${options.previewOnly ? `<p><strong>Anteprima Elite obiettivo ${escapeHtml(score.target.points)} punti.</strong></p>` : ""}
      ${message.body.split("\n\n").map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("")}
    </section>
  `;
  previewModal.hidden = false;
  return true;
}

function maybeShowLevelUnlockMessage() {
  showLevelMessageForUser(state.currentUser);
}

function previewGoalMessage(userId) {
  if (!isFounder()) {
    showToast("Anteprima riservata a Elite.");
    return;
  }
  const user = (state.users || []).find((item) => String(item.id) === String(userId));
  if (!user) {
    showToast("Utente non trovato.");
    return;
  }
  showLevelMessageForUser(user, { previewOnly: true });
}

function actWeightAmount(act) {
  const materialSum = Array.isArray(act.materials)
    ? act.materials.reduce((sum, row) => sum + Number(row.weight || 0), 0)
    : 0;
  return materialSum > 0 ? materialSum : Number(act.weight || 0);
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

function computeStatsRows(user) {
  const operatorKey = userOperatorKey(user);
  const today = localDateKey();
  const currentMonth = monthKey();
  const userActs = demoActs.filter((act) => actOperatorKey(act) === operatorKey);
  const stores = [...new Set(userActs.map((act) => act.store || user.negozio).filter(Boolean))];

  return stores.map((store) => {
    const storeActs = userActs.filter((act) => (act.store || user.negozio) === store);
    const dailyActs = storeActs.filter((act) => String(act.date || "").slice(0, 10) === today);
    const monthlyActs = storeActs.filter((act) => String(act.date || "").slice(0, 7) === currentMonth);
    const dailyWeight = dailyActs.reduce((sum, act) => sum + actWeightAmount(act), 0);
    const dailySpent = dailyActs.reduce((sum, act) => sum + actSpentAmount(act), 0);
    const monthlyWeight = monthlyActs.reduce((sum, act) => sum + actWeightAmount(act), 0);
    const monthlySpent = monthlyActs.reduce((sum, act) => sum + actSpentAmount(act), 0);

    return {
      store,
      operator: displayUsername(user),
      dailyWeight,
      dailySpent,
      dailyAverage: dailyWeight > 0 ? dailySpent / dailyWeight : 0,
      dailyClients: dailyActs.length,
      monthlyWeight,
      monthlySpent,
      monthlyAverage: monthlyWeight > 0 ? monthlySpent / monthlyWeight : 0
    };
  });
}

async function showUserStatistics(id) {
  const user = (state.users || []).find((item) => String(item.id) === String(id));
  if (!user) return;
  await loadSavedActs();
  const rows = computeStatsRows(user);
  previewTitle.textContent = `Statistiche ${displayUserFullName(user)}`;
  previewBody.innerHTML = `
    <section class="stats-preview">
      <h3>${escapeHtml(displayUserFullName(user))}</h3>
      <p>Statistiche acquisto oggetti preziosi suddivise per negozio e operatore.</p>
      ${rows.length ? `
        <div class="archive-table stats-table">
          <div class="table-row head"><span>Negozio</span><span>Operatore</span><span>Grammi giorno</span><span>Speso giorno</span><span>Media giorno</span><span>Clienti</span><span>Grammi mese</span><span>Speso mese</span><span>Media mese</span></div>
          ${rows.map((row) => `
            <div class="table-row">
              <strong>${escapeHtml(row.store)}</strong>
              <span>${escapeHtml(row.operator)}</span>
              <span>${escapeHtml(row.dailyWeight.toFixed(2))} gr</span>
              <span>${escapeHtml(formatEuro(row.dailySpent))}</span>
              <span>${escapeHtml(formatEuro(row.dailyAverage))}/gr</span>
              <span>${escapeHtml(row.dailyClients)}</span>
              <span>${escapeHtml(row.monthlyWeight.toFixed(2))} gr</span>
              <span>${escapeHtml(formatEuro(row.monthlySpent))}</span>
              <span>${escapeHtml(formatEuro(row.monthlyAverage))}/gr</span>
            </div>
          `).join("")}
        </div>
      ` : '<div class="empty-state">Nessun atto collegato a questo operatore.</div>'}
    </section>
  `;
  previewModal.hidden = false;
}

function normalizeWorkflowStatus(status = "Archiviata") {
  if (typeof status !== "string") return "Archiviata";
  const normalized = status.trim().toLowerCase();
  if (["completed", "completato", "completata"].includes(normalized)) return "Completato";
  if (["archived_completed", "archived", "archiviato", "archiviata", "archiviato completato", "archiviata completata"].includes(normalized)) return "Archiviato completato";
  if (["draft", "bozza"].includes(normalized)) return "Bozza";
  if (["archived_incomplete", "archiviato incompleto", "archiviata incompleta"].includes(normalized)) return "Archiviato incompleto";
  if (["pending_approval", "in_attesa_autorizzazione", "in attesa autorizzazione", "attesa autorizzazione"].includes(normalized)) return "In attesa autorizzazione";
  if (["approval_approved", "autorizzazione_approvata", "autorizzazione approvata"].includes(normalized)) return "Autorizzazione approvata";
  if (["approval_rejected", "autorizzazione_rifiutata", "autorizzazione rifiutata"].includes(normalized)) return "Autorizzazione rifiutata";
  if (["suspended", "sospesa", "sospeso", "pratica sospesa"].includes(normalized)) return "Sospesa";
  if (["deleted", "eliminato", "eliminata"].includes(normalized)) return "Eliminato";
  if (["abandoned", "abbandonato", "abbandonata"].includes(normalized)) return "Abbandonato";
  return "Archiviata";
}

function workflowStatusCode(status = "") {
  const label = normalizeWorkflowStatus(status);
  if (label === "Completato") return "completed";
  if (label === "Archiviato completato") return "archived_completed";
  if (label === "Bozza") return "draft";
  if (label === "Archiviato incompleto" || label === "Archiviata") return "archived_incomplete";
  if (label === "In attesa autorizzazione") return "pending_approval";
  if (label === "Autorizzazione approvata") return "approval_approved";
  if (label === "Autorizzazione rifiutata") return "approval_rejected";
  if (label === "Sospesa") return "suspended";
  if (label === "Eliminato") return "deleted";
  if (label === "Abbandonato") return "abandoned";
  return "archived_incomplete";
}

function normalizeSaleDeedStatus(status = "") {
  return workflowStatusCode(status);
}

function workflowStatusListLabel(status = "") {
  const code = workflowStatusCode(status);
  if (code === "completed") return "Completato";
  if (code === "archived_completed") return "Archiviato";
  if (code === "pending_approval") return "In attesa autorizzazione";
  if (code === "approval_approved") return "Autorizzazione approvata";
  if (code === "approval_rejected") return "Autorizzazione rifiutata";
  if (code === "suspended") return "Sospesa";
  if (code === "deleted") return "Eliminato";
  return "Archiviato";
}

function isCompletedWorkflowStatus(status = "") {
  return ["completed", "archived_completed"].includes(workflowStatusCode(status));
}

function statusClass(status = "") {
  const normalized = workflowStatusCode(status);
  if (normalized === "completed" || normalized === "archived_completed") return "status-completed";
  if (normalized === "draft") return "status-draft";
  if (normalized === "archived_incomplete") return "status-archived";
  if (normalized === "pending_approval") return "status-pending-approval";
  if (normalized === "approval_approved") return "status-approval-approved";
  if (normalized === "approval_rejected") return "status-approval-rejected";
  if (normalized === "suspended") return "status-suspended";
  if (normalized === "deleted" || normalized === "abandoned") return "status-deleted";
  return "";
}

function qualityReviewLabel(review) {
  if (review?.status === "positive") return "Flag positivo";
  if (review?.status === "negative") return "Flag negativo";
  return "Non flaggato";
}

function qualityReviewClass(review) {
  if (review?.status === "positive") return "quality-positive";
  if (review?.status === "negative") return "quality-negative";
  return "quality-pending";
}

function isCurrentUserActOwner(act) {
  if (act?.operatorId && state.currentUser?.id && String(act.operatorId) === String(state.currentUser.id)) return true;
  return actOperatorKey(act) === userOperatorKey(state.currentUser || {});
}

function canViewActQuality(act) {
  return canReviewActs() || isCurrentUserActOwner(act);
}

function canModifyAct(act) {
  return canReviewActs() || isCurrentUserActOwner(act);
}

function canDeleteActDirectly(act) {
  return canReviewActs();
}

function canRequestActDeletion(act) {
  return ["aiuto_commesso", "commesso"].includes(normalizeRole(state.currentUser?.ruolo)) && isCurrentUserActOwner(act);
}

function qualityReviewCellMarkup(act) {
  if (!canViewActQuality(act)) {
    return '<em class="quality-review-badge quality-hidden">Riservato</em>';
  }
  if (act.qualityReview?.status === "negative") {
    return `<button class="quality-review-badge quality-negative" type="button" data-quality-feedback="${escapeHtml(act.practiceNumber)}">Flag negativo</button>`;
  }
  return `<em class="quality-review-badge ${qualityReviewClass(act.qualityReview)}">${escapeHtml(qualityReviewLabel(act.qualityReview))}</em>`;
}

function deletionRequestLabel(act) {
  if (act.deletionRequest?.status === "pending") {
    return `Richiesta eliminazione da ${act.deletionRequest.requestedBy || "operatore"}`;
  }
  return "";
}

function archiveRowActionsMarkup(act) {
  const archivedIncomplete = workflowStatusCode(act.status) === "archived_incomplete";
  const canModify = canModifyAct(act);
  const canDelete = canDeleteActDirectly(act);
  const actions = [
    `<button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>`,
    `<button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}" ${canModify ? "" : "disabled"}>${archivedIncomplete ? "Riapri" : "Modifica"}</button>`,
    `<button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}" ${canDelete ? "" : "disabled"}>Elimina</button>`
  ];
  if (canUseCustomerTrustPack(act)) {
    actions.splice(2, 0, `<button type="button" data-open-trust-pack="${escapeHtml(act.practiceNumber)}">Trust Pack</button>`);
  }

  return `
    <div class="row-actions">
      ${actions.join("")}
    </div>
  `;
}

function dateParts(date) {
  const dateObject = parseActDate(date);
  return {
    day: String(dateObject.getDate()).padStart(2, "0"),
    monthName: dateObject.toLocaleDateString("it-IT", { month: "long", year: "numeric" })
  };
}

function archiveTotals(acts) {
  const completedActs = acts.filter((act) => isCompletedWorkflowStatus(act.status));
  const weight = completedActs.reduce((sum, act) => sum + actWeightAmount(act), 0);
  const spent = completedActs.reduce((sum, act) => sum + actSpentAmount(act), 0);
  return {
    weight,
    spent,
    average: weight > 0 ? spent / weight : 0
  };
}

function archiveTotalsMarkup(totals, labelPrefix) {
  return `
    <div class="archive-totals">
      <span>${escapeHtml(labelPrefix)} grammi: <strong>${escapeHtml(totals.weight.toFixed(2))} gr</strong></span>
      <span>${escapeHtml(labelPrefix)} speso: <strong>${escapeHtml(formatEuro(totals.spent))}</strong></span>
      <span>${escapeHtml(labelPrefix)} media: <strong>${escapeHtml(formatEuro(totals.average))}/gr</strong></span>
    </div>
  `;
}

function attachmentLabel(key = "") {
  return key.replaceAll("-", " ");
}

function actAttachmentMap(act = {}) {
  return new Map((act.captureAttachments || []).map((attachment) => [attachment.key, attachment]));
}

function printableAttachmentRows(keys, uploadedKeys, attachments = new Map()) {
  return keys.map((key) => {
    const attachment = attachments.get(key);
    const present = uploadedKeys.has(key) || Boolean(attachment);
    const imageSource = attachment?.dataUrl || attachment?.url || "";
    const isImage = imageSource.startsWith("data:image/");
    return `
      <div class="print-attachment ${isImage ? "with-image" : ""}">
        <span>${present ? "Allegato presente" : "Allegato mancante"}</span>
        <strong>${escapeHtml(attachmentLabel(key))}</strong>
        ${isImage ? `<img src="${imageSource}" alt="${escapeHtml(attachmentLabel(key))}">` : ""}
      </div>
    `;
  }).join("");
}

function actAttachmentPage(act, heading) {
  const attachments = actAttachmentMap(act);
  const attachmentKeys = attachments.size ? [...attachments.keys()] : (act.captures || []);
  return `
    <section class="print-copy company-copy readonly-copy attachment-copy">
      <h1>${escapeHtml(heading)} - Foto documenti e allegati</h1>
      <p class="print-legal">Foto documenti cliente, foto preziosi e contabile pagamento riferite all'atto di vendita.</p>
      <div class="print-attachments full-attachments">${printableAttachmentRows(attachmentKeys, new Set(act.captures || []), attachments)}</div>
    </section>
  `;
}

function actCompanyMainPage(act, heading) {
  const missing = "Dato non inserito";
  const materials = actMaterials(act);
  const itemRows = (Array.isArray(act.items) && act.items.length ? act.items : materials).map((item, index) => `
    <div class="print-item">
      <strong>${index + 1}</strong>
      <div><span>Descrizione</span>${escapeHtml(item.description || `Oggetto prezioso in ${(item.metal || "").toLowerCase()}`)}</div>
      <div><span>Metallo</span>${escapeHtml(item.metal || missing)}</div>
      <div><span>Titolo</span>${escapeHtml(item.title || missing)}</div>
    </div>
  `).join("");
  const weightRows = materials.map((material) => `<li>Peso totale oggetti preziosi in ${escapeHtml(material.metal.toLowerCase())}: ${escapeHtml(material.weight)} gr</li>`).join("");

  return `
    <section class="print-copy company-copy readonly-copy act-main-page">
      <h1>${escapeHtml(heading)}</h1>
      <div class="print-meta">
        <div class="print-field"><span>Atto n.</span>${escapeHtml(act.practiceNumber || missing)}</div>
        <div class="print-field"><span>Data</span>${escapeHtml(act.date || missing)}</div>
        <div class="print-field"><span>Ora</span>${escapeHtml(act.time || missing)}</div>
        <div class="print-field"><span>Negozio</span>${escapeHtml(act.store || missing)}</div>
      </div>

      <h2>Sezione cliente</h2>
      <div class="print-grid">
        <div class="print-field"><span>Nome</span>${escapeHtml(act.name || missing)}</div>
        <div class="print-field"><span>Cognome</span>${escapeHtml(act.surname || missing)}</div>
        <div class="print-field"><span>Codice fiscale</span>${escapeHtml(act.fiscalCode || missing)}</div>
        <div class="print-field"><span>Telefono</span>${escapeHtml(act.phone || missing)}</div>
        <div class="print-field"><span>Cittadinanza</span>${escapeHtml(act.citizenship || missing)}</div>
        <div class="print-field"><span>Sesso</span>${escapeHtml(act.sex || missing)}</div>
        <div class="print-field"><span>Data nascita</span>${escapeHtml(act.birthDate || missing)}</div>
        <div class="print-field"><span>Luogo nascita</span>${escapeHtml(act.birthPlace || missing)}</div>
        <div class="print-field"><span>Provincia nascita</span>${escapeHtml(act.birthProvince || missing)}</div>
        <div class="print-field"><span>Residenza</span>${escapeHtml(act.address || missing)}</div>
        <div class="print-field"><span>Provincia residenza</span>${escapeHtml(act.residenceProvince || missing)}</div>
        <div class="print-field"><span>Documento</span>${escapeHtml(act.documentType || missing)}</div>
        <div class="print-field"><span>Numero documento</span>${escapeHtml(act.documentNumber || missing)}</div>
        <div class="print-field"><span>Data rilascio documento</span>${escapeHtml(act.documentIssueDate || missing)}</div>
        <div class="print-field"><span>Scadenza documento</span>${escapeHtml(act.documentExpiry || missing)}</div>
        <div class="print-field"><span>Professione</span>${escapeHtml(act.profession || missing)}</div>
      </div>

      <h2>Sezione vendita</h2>
      <div class="print-grid">
        <div class="print-field"><span>Metodo pagamento</span>${escapeHtml(act.paymentMethod || missing)}</div>
        <div class="print-field"><span>Totale corrisposto</span>${escapeHtml(formatEuro(Number(act.amount || 0)))}</div>
        ${materialAmountsBlockFromRows(act.materialAmounts || [])}
        <div class="print-field"><span>Operatore</span>${escapeHtml(act.operatorName || act.operatorUsername || missing)}</div>
      </div>

      <h2>Oggetti preziosi</h2>
      <div class="print-items">${itemRows}</div>
      <div class="print-internal">
        <span>Dato interno aziendale</span>
        <strong>Peso totale oggetti preziosi</strong>
        <ul>${weightRows}</ul>
      </div>
    </section>
  `;
}

function fullActPrintHtml(act, heading = "Atto di vendita - Fascicolo aziendale") {
  return `${actCompanyMainPage(act, heading)}${actAttachmentPage(act, heading)}`;
}

function buildActsPdfPacket(title, subtitle, acts) {
  return `
    <section class="print-copy archive-export-cover">
      <h1>${escapeHtml(title)}</h1>
      <div class="print-meta">
        <div class="print-field"><span>Dettaglio</span>${escapeHtml(subtitle)}</div>
        <div class="print-field"><span>Atti esportati</span>${escapeHtml(acts.length)}</div>
        <div class="print-field"><span>Data esportazione</span>${escapeHtml(localDateKey())}</div>
      </div>
      <p class="print-legal">Fascicolo unico con sezioni cliente, vendita, firme e documenti allegati per ogni atto di vendita.</p>
    </section>
    ${acts.map((act) => fullActPrintHtml(act, `Atto di vendita ${act.practiceNumber}`)).join("")}
  `;
}

async function requestPdf(path, payload, filename) {
  const headers = { "Content-Type": "application/json" };
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  state.saving = true;
  syncDirtyState();
  showLoading("Preparazione PDF...");
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "PDF non generato.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  } finally {
    hideLoading();
    state.saving = false;
    syncDirtyState();
  }
}

async function downloadProtectedFile(path, filename, loadingText = "Preparazione download...") {
  const headers = {};
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  showLoading(loadingText);
  try {
    const response = await fetch(`${apiBase}${path}`, { headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(cleanUserMessage(body.error, apiErrorFallback(path, response.status)));
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const finalFilename = match?.[1] || filename || "oroactive-download.pdf";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  } finally {
    hideLoading();
  }
}

function canUseCustomerTrustPack(act = {}) {
  const status = workflowStatusCode(act.status);
  return Boolean(act && !act.deletedAt && (isCompletedWorkflowStatus(act.status) || (act.completedAt && status === "archived_incomplete")));
}

function customerTrustPackButtonsMarkup(act = {}, trustPack = null) {
  if (!canUseCustomerTrustPack(act)) {
    return `<p class="trust-pack-hint">Il Customer Trust Pack può essere generato solo per pratiche completate o archiviate.</p>`;
  }
  const identifier = escapeHtml(String(act.id || act.practiceNumber || ""));
  if (trustPack?.id) {
    const id = escapeHtml(String(trustPack.id));
    return `
      <div class="trust-pack-actions">
        <button class="primary-button" type="button" data-download-trust-pack="${id}">Scarica Trust Pack</button>
        <button type="button" data-email-trust-pack="${id}">Invia email</button>
        <button type="button" data-whatsapp-trust-pack="${id}">Invia WhatsApp</button>
        <button type="button" data-generate-trust-pack="${identifier}" data-regenerate-trust-pack="true">Rigenera</button>
      </div>
      <small class="trust-pack-code">Codice ${escapeHtml(trustPack.trust_pack_code || "")}</small>
    `;
  }
  return `
    <div class="trust-pack-actions">
      <button class="primary-button" type="button" data-generate-trust-pack="${identifier}">Genera Customer Trust Pack</button>
    </div>
  `;
}

async function fetchCustomerTrustPackForAct(identifier) {
  try {
    const data = await apiRequest(`/customer-trust-pack/sale-deed/${encodeURIComponent(identifier)}`);
    return data.trust_pack || data.trust_packs?.[0] || null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function refreshCustomerTrustPackPanel(act, trustPack = null) {
  const panel = document.querySelector("[data-trust-pack-panel]");
  if (!panel) return;
  panel.innerHTML = customerTrustPackButtonsMarkup(act, trustPack);
}

async function generateCustomerTrustPackForAct(identifier, options = {}) {
  const data = await apiRequest("/customer-trust-pack/generate", {
    method: "POST",
    body: JSON.stringify({
      sale_deed_id: identifier,
      regenerate: options.regenerate === true
    })
  });
  const trustPack = data.trust_pack || null;
  showToast(data.message || "Customer Trust Pack generato correttamente", "success");
  const act = await getActRecord(identifier);
  if (act) await refreshCustomerTrustPackPanel(act, trustPack);
  return trustPack;
}

async function downloadCustomerTrustPack(id) {
  await downloadProtectedFile(`/customer-trust-pack/${encodeURIComponent(id)}/download`, "customer-trust-pack-oroactive.pdf", "Download Trust Pack...");
  showToast("Customer Trust Pack scaricato.", "success");
}

async function sendCustomerTrustPackEmail(id) {
  const data = await apiRequest(`/customer-trust-pack/${encodeURIComponent(id)}/send-email`, { method: "POST", body: "{}" });
  showToast(data.message || "Invio email non configurato. Puoi scaricare il PDF manualmente.", data.ok ? "success" : "warning");
}

async function markCustomerTrustPackWhatsapp(id) {
  const data = await apiRequest(`/customer-trust-pack/${encodeURIComponent(id)}/mark-whatsapp`, { method: "POST", body: "{}" });
  if (data.whatsapp_url) window.open(data.whatsapp_url, "_blank", "noopener");
  showToast(data.message || "Invio WhatsApp preparato.", "success");
}

function parseActDate(date) {
  if (date.includes("-")) {
    const [year, month, day] = date.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const [day, month, year] = date.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function dateValue(date) {
  return parseActDate(date).getTime();
}

function daysFromPurchase(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - dateValue(date)) / 86400000);
}

function currentActSnapshot(status = "Archiviata") {
  const storeSelect = document.getElementById("storeCode");
  const items = collectCededItems();
  const captures = [...state.uploadedCaptures];
  const captureAttachments = [...state.captureFiles.entries()].map(([key, file]) => ({
    key,
    name: file.name,
    type: file.type,
    dataUrl: file.dataUrl || ""
  }));
  const materials = weightRows()
    .filter((row) => Number(row.value || 0) > 0)
    .map((row) => ({ metal: row.metal, title: row.title, weight: row.value }));
  const totalWeight = materials.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  return {
    id: state.editingActId || null,
    name: fieldValue('[name="nome"]'),
    surname: fieldValue('[name="cognome"]'),
    birthDate: fieldValue('[name="nascita"]'),
    birthPlace: fieldValue('[name="luogo"]'),
    birthProvince: fieldValue('[name="provinciaNascita"]'),
    fiscalCode: fieldValue('[name="cf"]'),
    phone: fieldValue('[name="telefono"]'),
    email: fieldValue('[name="email"]'),
    citizenship: fieldValue('[name="cittadinanza"]'),
    sex: fieldValue('[name="sesso"]'),
    address: fieldValue('[name="indirizzo"]'),
    residenceProvince: fieldValue('[name="provinciaResidenza"]'),
    documentType: fieldValue('[name="tipoDocumento"]'),
    documentNumber: fieldValue('[name="numeroDocumento"]'),
    documentIssueDate: fieldValue('[name="dataRilascioDocumento"]'),
    documentExpiry: fieldValue('[name="scadenzaDocumento"]'),
    profession: fieldValue('[name="professione"]'),
    practiceNumber: fieldValue("#practiceNumber"),
    date: fieldValue("#practiceDate"),
    time: fieldValue("#practiceTime"),
    store: storeSelect?.selectedOptions[0]?.textContent || "",
    storeCode: storeSelect?.value || "",
    items,
    materialAmounts: materialAmountRows(),
    printWeightCustomer: shouldPrintWeightOnCustomerCopy(),
    customerPrivacyAcknowledged: Boolean(document.getElementById("customerPrivacyAcknowledged")?.checked),
    amount: fieldValue("#saleTotal"),
    paymentMethod: fieldValue("#paymentMethod"),
    iban: paymentRequiresIban() ? fieldValue("#paymentIban") : "",
    operatorNotes: document.querySelector(".textarea-label textarea")?.value || "",
    operatorId: state.currentUser?.id || null,
    operatorUsername: displayUsername(state.currentUser),
    operatorName: [state.currentUser?.nome, state.currentUser?.cognome].filter(Boolean).join(" "),
    weight: totalWeight.toFixed(2),
    materials,
    captureAttachments,
    qualityReview: currentQualityReview(),
    signatures: [...state.signatures],
    signatureImages: signatureImages(),
    captures,
    approvalStatus: state.editingApprovalStatus || "",
    approvalRequestId: state.editingApprovalRequestId || null,
    suspendedReasons: frontendSuspensionReasons({ quality: state.guidedQualityCheck, shield: state.aurumShield }),
    suspendedReason: frontendSuspensionReasons({ quality: state.guidedQualityCheck, shield: state.aurumShield })[0] || "",
    status: workflowStatusCode(status)
  };
}

function archiveSearchValue(act, field) {
  const values = {
    name: act.name,
    surname: act.surname,
    practiceNumber: act.practiceNumber,
    date: act.date,
    store: act.store,
    amount: act.amount,
    paymentMethod: act.paymentMethod,
    weight: act.weight
  };
  return String(values[field] ?? "").toLowerCase();
}

function selectedArchiveStore() {
  return document.getElementById("archiveStoreFilter")?.value || "Tutti";
}

function archiveShowsSuspended() {
  return Boolean(document.getElementById("archiveIncludeSuspended")?.checked);
}

function selectedFusionStore() {
  return document.getElementById("fusionStoreFilter")?.value || "Busto Arsizio";
}

async function loadArchiveScreenData(options = {}) {
  await loadSavedActs({
    force: options.force || false,
    store: selectedArchiveStore(),
    includeSuspended: archiveShowsSuspended(),
    limit: ACT_LIST_LIMIT,
    silent: options.silent || false
  });
}

async function loadFusionScreenData(options = {}) {
  await loadSavedActs({
    force: options.force || false,
    store: selectedFusionStore(),
    limit: ACT_LIST_LIMIT,
    silent: options.silent || false
  });
}

function archiveVisibleActs() {
  const selectedStore = selectedArchiveStore();
  const field = document.getElementById("searchField")?.value || "name";
  const keyword = document.getElementById("searchKeyword")?.value.trim().toLowerCase() || "";
  if (state.searchActive && keyword) return state.lastSearchResults;
  return demoActs.filter((act) => {
    const storeMatches = selectedStore === "Tutti" || act.store === selectedStore;
    const keywordMatches = !keyword || archiveSearchValue(act, field).includes(keyword);
    const status = workflowStatusCode(act.status);
    const suspendedStatus = ["suspended", "pending_approval"].includes(status);
    const operativeStatus = isCompletedWorkflowStatus(status) || (archiveShowsSuspended() && suspendedStatus);
    return storeMatches && keywordMatches && operativeStatus;
  });
}

function renderArchiveGroups() {
  const container = document.getElementById("archiveGroups");
  if (!container) return;

  const keyword = document.getElementById("searchKeyword")?.value.trim() || "";
  const acts = archiveVisibleActs()
    .sort((first, second) => dateValue(second.date) - dateValue(first.date));
  if (!acts.length) {
    container.innerHTML = keyword
      ? '<div class="empty-state">Nessun atto di vendita trovato per la ricerca inserita nel negozio selezionato.</div>'
      : '<div class="empty-state">Nessun atto registrato per il negozio selezionato.</div>';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(acts.length / state.archivePageSize));
  state.archivePage = Math.min(Math.max(1, state.archivePage), totalPages);
  const start = (state.archivePage - 1) * state.archivePageSize;
  const visiblePageActs = acts.slice(start, start + state.archivePageSize);

  const grouped = visiblePageActs.reduce((groups, act) => {
    const store = act.store || "Negozio non indicato";
    const { day, monthName } = dateParts(act.date);
    groups[store] ||= {};
    groups[store][monthName] ||= {};
    groups[store][monthName][day] ||= [];
    groups[store][monthName][day].push(act);
    return groups;
  }, {});

  container.innerHTML = Object.entries(grouped).map(([store, months]) => {
    const storeActs = Object.values(months).flatMap((days) => Object.values(days).flat());
    return `
      <section class="archive-month archive-store-group">
        <h3>${escapeHtml(store)}</h3>
        ${archiveTotalsMarkup(archiveTotals(storeActs), "Negozio")}
        ${Object.entries(months).map(([month, days]) => `
          <div class="archive-day">
            <h4>${escapeHtml(month)}</h4>
            ${archiveTotalsMarkup(archiveTotals(Object.values(days).flat()), "Mensile")}
            ${Object.entries(days).map(([day, dayActs]) => `
              <div class="archive-day-inner">
                <h5>Giorno ${escapeHtml(day)}</h5>
                ${archiveTotalsMarkup(archiveTotals(dayActs), "Giornaliero")}
                <div class="archive-table acts-table">
                  <div class="table-row head"><span>Pratica</span><span>Negozio</span><span>Cliente</span><span>Date</span><span>Stato</span><span>Totale</span><span>Operatore</span><span>Azioni</span></div>
                  ${dayActs.map((act) => `
                    <div class="table-row ${canViewActQuality(act) ? `${qualityReviewClass(act.qualityReview)}-row` : ""}">
                      <span>
                        ${escapeHtml(act.practiceNumber)}
                        <small>${escapeHtml(workflowStatusListLabel(act.status))}</small>
                      </span>
                      <span>${escapeHtml(act.store || "Dato non inserito")}</span>
                      <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                      <span>
                        <small>Creazione: ${escapeHtml(formatDateTime(act.createdAt || act.date))}</small>
                        <small>Completamento: ${escapeHtml(formatDateTime(act.completedAt))}</small>
                      </span>
                      <em class="${statusClass(act.status)}">${escapeHtml(workflowStatusListLabel(act.status))}${aurumShieldBadgeMarkup(act.aurumShield)}</em>
                      <strong>${escapeHtml(formatEuro(Number(act.amount || 0)))}</strong>
                      <span>${escapeHtml(act.operatorName || act.operatorUsername || "Dato non inserito")}</span>
                      ${archiveRowActionsMarkup(act)}
                    </div>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        `).join("")}
      </section>
    `;
  }).join("") + archivePaginationMarkup(acts.length, totalPages);
}

function archivePaginationMarkup(total, totalPages) {
  if (totalPages <= 1) return "";
  return `
    <div class="archive-pagination">
      <button type="button" data-archive-page="${state.archivePage - 1}" ${state.archivePage <= 1 ? "disabled" : ""}>Indietro</button>
      <span>Pagina ${state.archivePage} di ${totalPages} - ${total} atti caricati</span>
      <button type="button" data-archive-page="${state.archivePage + 1}" ${state.archivePage >= totalPages ? "disabled" : ""}>Avanti</button>
    </div>
  `;
}

function buildArchiveDayExport(store, date, acts) {
  const rows = acts.map((act) => `
    <div class="archive-export-row">
      <span>${escapeHtml(act.practiceNumber)}</span>
      <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
      <span>${escapeHtml(act.store)}</span>
      <span>${escapeHtml(formatEuro(Number(act.amount)))}</span>
      <span>${escapeHtml(act.paymentMethod)}</span>
      <span>${escapeHtml(act.weight)} g</span>
      <em class="${statusClass(act.status)}">${escapeHtml(normalizeWorkflowStatus(act.status))}</em>
    </div>
  `).join("");

  return `
    <section class="print-copy archive-export-copy">
      <h1>Elenco Atti di Vendita</h1>
      <div class="print-meta">
        <div class="print-field"><span>Negozio</span>${escapeHtml(store)}</div>
        <div class="print-field"><span>Giorno</span>${escapeHtml(date)}</div>
        <div class="print-field"><span>Atti presenti</span>${acts.length}</div>
      </div>
      <div class="archive-export-table">
        <div class="archive-export-row head">
          <span>Atto</span>
          <span>Cliente</span>
          <span>Negozio</span>
          <span>Importo</span>
          <span>Pagamento</span>
          <span>Peso totale</span>
          <span>Stato</span>
        </div>
        ${rows}
      </div>
    </section>
  `;
}

function exportArchiveDay(date) {
  const selectedStore = document.getElementById("archiveStoreFilter")?.value || "";
  const dayActs = demoActs
    .filter((act) => act.store === selectedStore && act.date === date)
    .sort((first, second) => first.practiceNumber.localeCompare(second.practiceNumber));

  if (!dayActs.length) {
    showToast("Nessun atto da esportare per il giorno selezionato.");
    return;
  }

  printPacket.innerHTML = buildArchiveDayExport(selectedStore, date, dayActs);
  window.print();
}

async function exportDailySearchPdf() {
  const results = archiveVisibleActs();

  if (!results.length) {
    showToast("Nessun atto da esportare nell'elenco selezionato.");
    return;
  }

  const dates = [...new Set(results.map((act) => act.date))];
  if (dates.length !== 1) {
    showToast("Per esportare il PDF giornaliero cerca una sola data precisa.");
    return;
  }

  const stores = [...new Set(results.map((act) => act.store))];
  const storeLabel = stores.length === 1 ? stores[0] : "Tutti i negozi";
  const dayActs = results.sort((first, second) => first.practiceNumber.localeCompare(second.practiceNumber));
  try {
    await requestPdf("/pdf/acts", {
      title: "Esportazione PDF giornaliera",
      subtitle: `${storeLabel} - ${dates[0]}`,
      acts: dayActs
    }, `OroActive-PDF-giornaliero-${dates[0]}.pdf`);
  } catch (error) {
    showToast(error.message || "PDF giornaliero non generato.");
  }
}

async function exportMonthlySearchPdf() {
  const results = archiveVisibleActs();

  if (!results.length) {
    showToast("Nessun atto da esportare nell'elenco selezionato.");
    return;
  }

  const months = [...new Set(results.map((act) => String(act.date || "").slice(0, 7)))];
  if (months.length !== 1) {
    showToast("Per esportare il PDF mensile cerca un solo mese, ad esempio 2026-05.");
    return;
  }

  const stores = [...new Set(results.map((act) => act.store))];
  const storeLabel = stores.length === 1 ? stores[0] : "Tutti i negozi";
  const monthActs = results.sort((first, second) => first.practiceNumber.localeCompare(second.practiceNumber));
  try {
    await requestPdf("/pdf/acts", {
      title: "Esportazione PDF mensile",
      subtitle: `${storeLabel} - ${months[0]}`,
      acts: monthActs
    }, `OroActive-PDF-mensile-${months[0]}.pdf`);
  } catch (error) {
    showToast(error.message || "PDF mensile non generato.");
  }
}

function storeCodeFromName(storeName) {
  return {
    "Busto Arsizio": "BUSTO",
    "Cassano Magnago": "CASSANO",
    Legnano: "LEGNANO"
  }[storeName] || "BUSTO";
}

function buildArchivedActFallback(act) {
  const missing = "Dato non inserito";
  const materials = actMaterials(act);
  const materialRows = actMaterials(act).map((material, index) => `
    <div class="print-item">
      <strong>${index + 1}</strong>
      <div><span>Descrizione</span>${escapeHtml(material.description || `Oggetto prezioso in ${material.metal.toLowerCase()}`)}</div>
      <div><span>Metallo</span>${escapeHtml(material.metal)}</div>
      <div><span>Titolo</span>${escapeHtml(material.title || missing)}</div>
    </div>
  `).join("");
  const weightRows = materials.map((material) => `<li>${escapeHtml(material.metal)}: ${escapeHtml(material.weight)} g</li>`).join("");
  const attachmentKeys = [
    "documento fronte",
    "documento retro",
    "codice fiscale fronte",
    "codice fiscale retro",
    ...materials.flatMap((material) => [
      `preziosi ${material.metal.toLowerCase()} fronte`,
      `preziosi ${material.metal.toLowerCase()} laterale`
    ]),
    "contabile pagamento se prevista"
  ];
  const attachmentList = attachmentKeys.map((key) => `
    <div class="print-attachment">
      <span>Stato allegato</span>
      ${escapeHtml(key)} - ${escapeHtml(missing)}
    </div>
  `).join("");
  const signatures = SIGNATURE_LABELS.map((label) => `
    <div class="print-signature">
      <span>${label}</span>
      ${escapeHtml(missing)}
    </div>
  `).join("");

  return `
    <section class="print-copy company-copy readonly-copy">
      <h1>Atto di vendita OroActive - Anteprima aziendale sola lettura</h1>
      <div class="print-meta">
        <div class="print-field"><span>Atto n.</span>${escapeHtml(act.practiceNumber)}</div>
        <div class="print-field"><span>Data</span>${escapeHtml(act.date)}</div>
        <div class="print-field"><span>Ora</span>${escapeHtml(act.time || missing)}</div>
        <div class="print-field"><span>Negozio</span>${escapeHtml(act.store)}</div>
      </div>

      <h2>Dati cliente</h2>
      <div class="print-grid">
        <div class="print-field"><span>Nome</span>${escapeHtml(act.name)}</div>
        <div class="print-field"><span>Cognome</span>${escapeHtml(act.surname)}</div>
        <div class="print-field"><span>Data nascita</span>${escapeHtml(act.birthDate || missing)}</div>
        <div class="print-field"><span>Luogo nascita</span>${escapeHtml(act.birthPlace || missing)}</div>
        <div class="print-field"><span>Provincia nascita</span>${escapeHtml(act.birthProvince || missing)}</div>
        <div class="print-field"><span>Residenza</span>${escapeHtml(act.address || missing)}</div>
        <div class="print-field"><span>Provincia residenza</span>${escapeHtml(act.residenceProvince || missing)}</div>
        <div class="print-field"><span>Codice fiscale</span>${escapeHtml(act.fiscalCode || missing)}</div>
        <div class="print-field"><span>Telefono</span>${escapeHtml(act.phone || missing)}</div>
        <div class="print-field"><span>Cittadinanza</span>${escapeHtml(act.citizenship || missing)}</div>
        <div class="print-field"><span>Sesso</span>${escapeHtml(act.sex || missing)}</div>
        <div class="print-field"><span>Tipo documento</span>${escapeHtml(act.documentType || missing)}</div>
        <div class="print-field"><span>Numero documento</span>${escapeHtml(act.documentNumber || missing)}</div>
        <div class="print-field"><span>Data rilascio documento</span>${escapeHtml(act.documentIssueDate || missing)}</div>
        <div class="print-field"><span>Scadenza documento</span>${escapeHtml(act.documentExpiry || missing)}</div>
        <div class="print-field"><span>Professione lavorativa</span>${escapeHtml(act.profession || missing)}</div>
      </div>

      <h2>Vendita</h2>
      <div class="print-grid">
        <div class="print-field"><span>Metodo pagamento</span>${escapeHtml(act.paymentMethod)}</div>
        <div class="print-field"><span>Totale corrisposto</span>${escapeHtml(formatEuro(Number(act.amount)))}</div>
        ${materialAmountsBlockFromRows(act.materialAmounts || [])}
        <div class="print-field"><span>Note operatore</span>${escapeHtml(act.notes || missing)}</div>
      </div>

      <h2>Oggetti ceduti</h2>
      <div class="print-items">${materialRows}</div>
      <div class="print-internal">
        <span>Dato interno aziendale</span>
        <strong>Peso totale oggetti preziosi</strong>
        <ul>${weightRows}</ul>
      </div>

      <h2>Allegati pratica</h2>
      <div class="print-attachments">${attachmentList}</div>

      <h2>Dichiarazioni</h2>
      <p class="print-legal">Gli oggetti venduti sopra descritti sono usati e/o in cattivo stato di conservazione. Autorizzo la loro ulteriore alterazione per poter eseguire il test di verifica del metallo, determinarne il titolo e calcolarne il prezzo. Dichiaro inoltre che gli stessi sopra indicati oggetti non sono di illecita provenienza, di essere in possesso di tutti i diritti atti alla vendita degli stessi e di accettare e consentire il trattamento dei propri dati personali (Legge 196/03). La presente vale quale ricevuta e saldo per la somma riportata alla voce prezzo complessivo. Il venditore si obbliga fin da ora a restituire il ricavato della vendita qualora, a seguito di controlli di verifica, risulti che gli oggetti consegnati non siano corrispondenti nel valore e nella qualità a quelli dichiarati al momento della vendita e/o risultino di non essere di metallo prezioso. Dichiaro infine di aver letto attentamente quanto sopra riportato e che ai sensi e per gli effetti degli art. 1341 e 1342 del c.c. approvo incondizionatamente.</p>

      <h2>Firme</h2>
      <div class="print-signatures">${signatures}</div>
    </section>
  `;
}

async function openArchivedAct(practiceNumber) {
  const act = await getActRecord(practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }
  const trustPack = canUseCustomerTrustPack(act) ? await fetchCustomerTrustPackForAct(act.id || act.practiceNumber).catch(() => null) : null;

  previewTitle.textContent = `Atto di vendita ${act.practiceNumber}`;
  previewBody.innerHTML = `
    <div class="readonly-actions">
      <button type="button" data-preview-act-print="${escapeHtml(act.practiceNumber)}" data-preview-print-scope="customer">Stampa copia cliente</button>
      <button type="button" data-preview-act-print="${escapeHtml(act.practiceNumber)}" data-preview-print-scope="company">Stampa copia aziendale</button>
    </div>
    <section class="trust-pack-panel" data-trust-pack-panel="${escapeHtml(String(act.id || act.practiceNumber || ""))}">
      <h3>Customer Trust Pack OroActive</h3>
      <p>Riepilogo cliente professionale con vendita, contatti e informazioni post-vendita.</p>
      ${customerTrustPackButtonsMarkup(act, trustPack)}
    </section>
    ${act.readOnlyHtml || buildArchivedActFallback(act)}
  `;
  previewModal.hidden = false;
}

function showQualityFeedback(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act || !canViewActQuality(act) || act.qualityReview?.status !== "negative") {
    showToast("Feedback non disponibile per questo utente.");
    return;
  }
  previewTitle.textContent = `Feedback controllo qualità ${practiceNumber}`;
  previewBody.innerHTML = `
    <section class="level-unlock-message quality-feedback-message">
      <h3>Flag negativo</h3>
      <p>${escapeHtml(act.qualityReview.feedback || "Feedback non inserito.")}</p>
    </section>
  `;
  previewModal.hidden = false;
}

async function requestActDeletion(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act || !canRequestActDeletion(act)) {
    showToast("Non puoi richiedere l'eliminazione di questo atto.");
    return;
  }

  if (act.deletionRequest?.status === "pending") {
    showToast("Richiesta di eliminazione gia inviata al Responsabile o a Elite.");
    return;
  }

  const confirmed = window.confirm(`Vuoi inviare al Responsabile o a Elite la richiesta di eliminazione dell'atto ${practiceNumber}?`);
  if (!confirmed) return;

  const updatedAct = {
    ...act,
    deletionRequest: {
      status: "pending",
      requestedBy: displayUserFullName(state.currentUser),
      requestedByRole: roleLabel(state.currentUser?.ruolo),
      requestedAt: new Date().toISOString()
    }
  };

  try {
    await saveActRecord(updatedAct, "PUT");
    await syncActsFromServer();
    showToast("Richiesta di eliminazione inviata al Responsabile o a Elite.");
  } catch {
    showToast("Richiesta non inviata: controlla la connessione al database.");
  }
}

async function deleteAct(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }

  if (!canDeleteActDirectly(act)) {
    await requestActDeletion(practiceNumber);
    return;
  }

  const confirmed = window.confirm(`Sei sicuro di voler eliminare definitivamente questo atto?\n\n${practiceNumber}`);
  if (!confirmed) return;

  try {
    await deleteActRecord(practiceNumber);
  } catch {
    showToast("Impossibile eliminare l'atto.");
    return;
  }
  state.lastSearchResults = state.lastSearchResults.filter((act) => act.practiceNumber !== practiceNumber);
  await Promise.allSettled([
    loadArchiveScreenData({ force: true, silent: true }),
    loadFusionScreenData({ force: true, silent: true }),
    loadDashboard()
  ]);
  renderArchiveGroups();
  renderFusionGroups();

  if (!previewModal.hidden) previewModal.hidden = true;
  showToast(`Atto ${practiceNumber} eliminato.`, "success");
}

async function approveDeleteAct(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act || !canDeleteActDirectly(act)) {
    showToast("Autorizzazione non disponibile.");
    return;
  }
  if (!act.deletionRequest || act.deletionRequest.status !== "pending") {
    showToast("Non ci sono richieste di eliminazione per questo atto.");
    return;
  }
  await deleteAct(practiceNumber);
}

function cededItemRowMarkup(item = {}) {
  const metal = item.metal || "Oro";
  const titleOptions = titleOptionsByMetal[metal] || titleOptionsByMetal.Oro;
  const title = item.title || (metal === "Oro" ? "18 kt" : titleOptions[0]);
  return `
    <article class="ceded-item-row">
      <strong class="row-number">1</strong>
      <label>Descrizione oggetto <input value="${escapeHtml(item.description || "")}"></label>
      <label>Metallo
        <select>
          ${metalOrder.map((option) => `<option${option === metal ? " selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
      <label>Titolo
        <select>
          ${titleOptions.map((option) => `<option${option === title ? " selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
      <button class="remove-row" type="button" aria-label="Rimuovi riga" disabled>-</button>
    </article>
  `;
}

function defaultCededItemRow() {
  return cededItemRowMarkup();
}

function collectCededItems() {
  return [...document.querySelectorAll(".ceded-item-row")].map((row) => {
    const selects = row.querySelectorAll("select");
    return {
      description: row.querySelector("input")?.value || "",
      metal: selects[0]?.value || "Oro",
      title: selects[1]?.value || ""
    };
  });
}

function currentQualityReview() {
  const selected = document.querySelector('input[name="qualityReviewStatus"]:checked')?.value || "";
  const feedback = document.getElementById("qualityReviewFeedback")?.value.trim() || "";
  if (!selected) return null;
  return {
    status: selected,
    feedback
  };
}

function setQualityReview(review = null) {
  document.querySelectorAll('input[name="qualityReviewStatus"]').forEach((input) => {
    input.checked = review?.status === input.value;
  });
  const feedback = document.getElementById("qualityReviewFeedback");
  if (feedback) feedback.value = review?.feedback || "";
}

async function saveQualityReview() {
  if (!canReviewActs()) {
    showToast("Controllo qualità riservato a Responsabili ed Elite.");
    return false;
  }

  const review = currentQualityReview();
  if (!review) {
    showToast("Seleziona controllo positivo o negativo.");
    return false;
  }

  if (review.status === "negative" && !review.feedback) {
    showToast("Inserisci il feedback scritto per il controllo qualità negativo.");
    return false;
  }

  const practiceNumber = fieldValue("#practiceNumber");
  const existing = demoActs.find((act) => act.practiceNumber === practiceNumber);
  if (!existing) {
    showToast("Archivia l'atto prima di inserire il controllo qualità.");
    return false;
  }

  const updatedAct = currentActSnapshot(existing.status || "Archiviata");
  updatedAct.id = existing.id;
  updatedAct.status = workflowStatusCode(existing.status || updatedAct.status);
  updatedAct.operatorId = existing.operatorId ?? updatedAct.operatorId;
  updatedAct.operatorUsername = existing.operatorUsername || updatedAct.operatorUsername;
  updatedAct.operatorName = existing.operatorName || updatedAct.operatorName;
  updatedAct.qualityReview = {
    status: review.status,
    feedback: review.feedback,
    reviewedAt: new Date().toISOString()
  };
  updatedAct.readOnlyHtml = buildPrintCopy("Atto archiviato - Sola lettura", "Dato interno aziendale", "company");

  try {
    await saveActRecord(updatedAct, "PUT");
    await syncActsFromServer();
    if (isAdmin()) await loadUsers();
    scheduleQualityCheckValidation();
    showToast(review.status === "positive" ? "Controllo qualità positivo salvato." : "Controllo qualità negativo salvato.");
    return true;
  } catch (error) {
    showToast(error.message || "Controllo qualità non salvato: controlla la connessione al database.", "error");
    return false;
  }
}

function setFieldValue(selector, value) {
  const field = document.querySelector(selector);
  if (field) field.value = value || "";
}

function toDateInputValue(value) {
  const text = String(value || "");
  if (!text || text.includes("-")) return text;
  const [day, month, year] = text.split("/");
  return year && month && day ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
}

function normalizeDocumentTypeValue(value = "") {
  const normalized = normalizeText(value);
  if (normalized.includes("PATENTE")) return "Patente";
  if (normalized.includes("PASSAPORTO")) return "Passaporto";
  if (normalized.includes("CARTA") || normalized.includes("IDENTITA")) return "Carta identita";
  return value || "";
}

function normalizeProvinceValue(value = "") {
  const upper = String(value || "").toUpperCase();
  const explicit = upper.match(/\(([A-Z]{2})\)/);
  if (explicit && PROVINCE_CODES.includes(explicit[1])) return explicit[1];
  const tokens = upper.match(/\b[A-Z]{2}\b/g) || [];
  return tokens.find((token) => PROVINCE_CODES.includes(token)) || upper.trim().slice(0, 2);
}

function storeCodeFromAct(act) {
  if (act.storeCode) return act.storeCode;
  return {
    "Busto Arsizio": "BUSTO",
    "Cassano Magnago": "CASSANO",
    Legnano: "LEGNANO"
  }[act.store] || "BUSTO";
}

function restoreCaptureStateFromAct(act) {
  const restoredCaptures = new Set(Array.isArray(act.captures) ? act.captures : []);
  state.captureFiles.clear();

  (act.captureAttachments || []).forEach((attachment) => {
    if (!attachment?.key) return;
    const source = attachment.dataUrl || attachment.url || "";
    restoredCaptures.add(attachment.key);
    state.captureFiles.set(attachment.key, {
      name: attachment.name || attachmentLabel(attachment.key),
      type: attachment.type || (String(source).startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg"),
      dataUrl: source,
      url: source
    });
  });

  state.uploadedCaptures = restoredCaptures;
  state.attachments = restoredCaptures.size;
}

function setCaptureFile(key, file) {
  const previous = state.captureFiles.get(key);
  revokeCaptureUrl(previous);
  state.captureFiles.set(key, file);
  state.uploadedCaptures.add(key);
  state.attachments = state.uploadedCaptures.size;
}

function setFieldIfDetected(selector, value, confidence = "basso") {
  if (!value) return false;
  const field = document.querySelector(selector);
  if (!field) return false;
  field.value = value;
  field.classList.toggle("ocr-low-confidence", confidence === "basso");
  field.title = confidence === "basso" ? "Controlla questo dato" : "";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  field.classList.toggle("ocr-low-confidence", confidence === "basso");
  field.title = confidence === "basso" ? "Controlla questo dato" : "";
  return true;
}

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === "true" || window.Tesseract?.recognize || window.BullionVaultChart) {
        resolve();
        return;
      }
      existing.addEventListener("load", resolve, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadActForEdit(practiceNumber) {
  const act = await getActRecord(practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }
  if (!canModifyAct(act)) {
    showToast("Puoi modificare solo gli atti effettuati da te oppure gli atti autorizzati dal tuo ruolo.");
    return;
  }

  await resetCurrentPractice();
  state.suppressDirtyTracking = true;
  state.editingPracticeNumber = act.practiceNumber;
  state.editingActId = act.id || null;
  state.editingOriginalStatus = normalizeWorkflowStatus(act.status || "Archiviata");
  state.editingApprovalStatus = act.approvalStatus || "";
  state.editingApprovalRequestId = act.approvalRequestId || null;

  setFieldValue("#storeCode", storeCodeFromAct(act));
  setFieldValue("#practiceNumber", act.practiceNumber);
  setFieldValue("#practiceDate", toDateInputValue(act.date));
  setFieldValue("#practiceTime", act.time);
  setFieldValue('[name="nome"]', act.name);
  setFieldValue('[name="cognome"]', act.surname);
  setFieldValue('[name="nascita"]', toDateInputValue(act.birthDate));
  setFieldValue('[name="luogo"]', act.birthPlace);
  setFieldValue('[name="provinciaNascita"]', act.birthProvince);
  setFieldValue('[name="cf"]', act.fiscalCode);
  setFieldValue('[name="telefono"]', act.phone);
  setFieldValue('[name="email"]', act.email);
  setFieldValue('[name="cittadinanza"]', act.citizenship);
  setFieldValue('[name="sesso"]', act.sex);
  setFieldValue('[name="indirizzo"]', act.address);
  setFieldValue('[name="provinciaResidenza"]', act.residenceProvince);
  setFieldValue('[name="tipoDocumento"]', act.documentType);
  setFieldValue('[name="numeroDocumento"]', act.documentNumber);
  setFieldValue('[name="dataRilascioDocumento"]', toDateInputValue(act.documentIssueDate));
  setFieldValue('[name="scadenzaDocumento"]', toDateInputValue(act.documentExpiry));
  setFieldValue('[name="professione"]', act.profession);
  setFieldValue("#paymentMethod", act.paymentMethod);
  setFieldValue("#paymentIban", act.iban);
  setFieldValue("#saleTotal", act.amount);
  setFieldValue(".textarea-label textarea", act.operatorNotes);
  setQualityReview(act.qualityReview || null);
  state.loadedSignatureImages = SIGNATURE_LABELS.map((_, index) => Array.isArray(act.signatureImages) ? act.signatureImages[index] || "" : "");

  const cededItemsTable = document.getElementById("cededItemsTable");
  const items = Array.isArray(act.items) && act.items.length ? act.items : [{ description: "", metal: act.materials?.[0]?.metal || "Oro", title: "18 kt" }];
  cededItemsTable.querySelectorAll(".ceded-item-row").forEach((row) => row.remove());
  items.forEach((item) => cededItemsTable.insertAdjacentHTML("beforeend", cededItemRowMarkup(item)));

  document.getElementById("printWeightCustomer").checked = Boolean(act.printWeightCustomer);
  const customerPrivacyAcknowledged = document.getElementById("customerPrivacyAcknowledged");
  if (customerPrivacyAcknowledged) customerPrivacyAcknowledged.checked = Boolean(act.customerPrivacyAcknowledged);
  state.signatures = normalizeSignatureArray(act.signatures, true);
  restoreCaptureStateFromAct(act);
  state.step = 0;

  document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
  updateCededItems();
  updateSaleTotal();
  updateCustomerSummary();
  updateSignatureState();
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  renderPreciousCaptureCards();
  updateAttachmentState();
  updateDocumentExpiryWarning();

  if (Array.isArray(act.materials)) {
    act.materials.forEach((material) => {
      const titleSelector = material.title ? `[data-metal-title="${cssEscape(material.title)}"]` : "";
      const input = document.querySelector(`#totalWeightFields input[data-metal-weight="${cssEscape(material.metal)}"]${titleSelector}`)
        || document.querySelector(`#totalWeightFields input[data-metal-weight="${cssEscape(material.metal)}"]`);
      if (input) input.value = material.weight || "";
    });
  }
  if (Array.isArray(act.materialAmounts)) {
    act.materialAmounts.forEach((material) => {
      const input = document.querySelector(`#materialAmountFields input[data-material-amount="${material.metal}"]`);
      if (input) input.value = material.amount || "";
    });
  }

  document.getElementById("sidePracticeNumber").textContent = act.practiceNumber;
  document.getElementById("operatorStoreName").textContent = `Negozio ${document.getElementById("storeCode").selectedOptions[0]?.textContent || ""}`;
  renderStep();
  setScreen("practice");
  state.aurumShield = act.aurumShield || null;
  state.guidedQualityCheck = act.qualityCheck || null;
  renderAurumShieldCard();
  renderGuidedQualityCheck();
  scheduleAurumShieldEvaluation();
  previewModal.hidden = true;
  state.editingDirty = false;
  state.suppressDirtyTracking = false;
  showToast(`Atto ${practiceNumber} aperto in modifica.`);
}

async function resetCurrentPractice(options = {}) {
  const preservedStoreCode = options.preserveStoreCode ? fieldValue("#storeCode") : "";

  previewModal.hidden = true;

  document.querySelectorAll(".form-panel input").forEach((input) => {
    if (input.type === "file") {
      input.value = "";
      return;
    }
    if (input.readOnly) return;
    if (input.type === "checkbox") {
      input.checked = false;
      return;
    }
    input.value = "";
  });

  document.querySelectorAll(".form-panel textarea").forEach((textarea) => {
    textarea.value = "";
  });

  document.querySelectorAll(".form-panel select").forEach((select) => {
    select.selectedIndex = 0;
  });

  if (preservedStoreCode) {
    document.getElementById("storeCode").value = preservedStoreCode;
  }

  const cededItemsTable = document.getElementById("cededItemsTable");
  cededItemsTable.querySelectorAll(".ceded-item-row").forEach((row) => row.remove());
  cededItemsTable.insertAdjacentHTML("beforeend", defaultCededItemRow());

  state.signatures = normalizeSignatureArray([], false);
  state.loadedSignatureImages = SIGNATURE_LABELS.map(() => "");
  document.querySelectorAll("canvas[data-signature]").forEach((canvas) => {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  });

  state.uploadedCaptures.clear();
  state.captureFiles.clear();
  state.attachments = 0;
  state.step = 0;
  state.editingPracticeNumber = null;
  state.editingActId = null;
  state.editingOriginalStatus = "";
  state.editingApprovalStatus = "";
  state.editingApprovalRequestId = null;
  state.editingDirty = false;
  state.suppressDirtyTracking = false;
  state.loadedSignatureImages = SIGNATURE_LABELS.map(() => "");
  state.fiscalCodeEditedManually = false;
  state.captureGroup = null;
  state.lastActCaptureAttachments = [];
  state.cashLimitWarningShown = false;
  state.amlCashCheck = null;
  window.clearTimeout(state.amlCashCheckTimer);
  state.aurumShield = null;
  window.clearTimeout(state.aurumShieldTimer);
  state.guidedQualityCheck = null;
  window.clearTimeout(state.guidedQualityTimer);
  renderAmlCashAlert();
  renderAurumShieldCard();
  renderGuidedQualityCheck();
  setQualityReview(null);

  await setPracticeMeta({ deferPracticeNumber: options.deferPracticeNumber });
  applyRolePermissions();
  document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
  renderStep();
  updateSignatureState();
  updateCustomerSummary();
  updateCededItems();
  updateSaleTotal();
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  updateIbanVisibility();
  updateAttachmentState();
  updateChecklistState();
  syncDirtyState();
  scheduleQualityCheckValidation();
}

async function deleteCurrentPractice() {
  const practiceNumber = fieldValue("#practiceNumber");
  const confirmed = window.confirm(`Vuoi eliminare l'atto attualmente in compilazione${practiceNumber ? ` ${practiceNumber}` : ""}?`);
  if (!confirmed) return;

  const existingIndex = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (existingIndex >= 0) {
    const existingAct = demoActs[existingIndex];
    if (!canDeleteActDirectly(existingAct)) {
      await requestActDeletion(practiceNumber);
      return;
    }
    try {
      await deleteActRecord(practiceNumber);
    } catch {
      showToast("Eliminazione non riuscita: controlla la connessione al database.");
      return;
    }
    renderArchiveGroups();
    renderFusionGroups();
  }

  await resetCurrentPractice({ preserveStoreCode: true });
  showToast("Atto in compilazione eliminato.");
}

function actMaterials(act) {
  if (Array.isArray(act.materials) && act.materials.length) return act.materials;
  return [{ metal: "Oro", weight: act.weight || "0" }];
}

function addDays(date, days) {
  const copy = parseActDate(date);
  copy.setDate(copy.getDate() + days);
  return localDateKey(copy);
}

function materialTotalMap(acts) {
  return metalOrder.reduce((totals, metal) => {
    totals[metal] = acts.reduce((sum, act) => {
      const material = actMaterials(act).find((item) => item.metal === metal);
      return sum + Number(material?.weight || 0);
    }, 0);
    return totals;
  }, {});
}

function materialTotalsMarkup(totals, label = "Totali giacenza") {
  return `
    <div class="fusion-totals material-total-grid">
      <strong>${escapeHtml(label)}</strong>
      ${metalOrder.map((metal) => `<span>${escapeHtml(metal)}: ${escapeHtml((totals[metal] || 0).toFixed(2))} gr</span>`).join("")}
    </div>
  `;
}

function isActFused(act) {
  return Boolean(act.fusion?.fused);
}

function actNumberValue(practiceNumber = "") {
  const match = String(practiceNumber).match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function nextFusionDdtNumber(store) {
  const numbers = demoActs
    .filter((act) => act.store === store && act.fusion?.ddtNumber)
    .map((act) => Number(act.fusion.ddtNumber))
    .filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function ddtNumberForFusionBatch(store, date) {
  const existing = demoActs.find((act) => (
    act.store === store
    && act.fusion?.fused
    && act.fusion?.date === date
    && act.fusion?.ddtNumber
  ));
  return existing ? existing.fusion.ddtNumber : nextFusionDdtNumber(store);
}

function materialLotsForAct(act) {
  return actMaterials(act).map((material) => {
    const titles = [...new Set((act.items || [])
      .filter((item) => item.metal === material.metal)
      .map((item) => item.title)
      .filter(Boolean))];
    return {
      act,
      metal: material.metal,
      title: material.title || (titles.length === 1 ? titles[0] : titles.length ? `Titoli misti (${titles.join(", ")})` : "Titolo non indicato"),
      weight: Number(material.weight || 0)
    };
  });
}

function titlePurity(metal, title = "") {
  const clean = String(title || "").toLowerCase().replace(",", ".").trim();
  const kt = clean.match(/(\d+(?:\.\d+)?)\s*kt/);
  if (kt) return Number(kt[1]) / 24;
  const numeric = clean.match(/\d+(?:\.\d+)?/);
  if (numeric) {
    const value = Number(numeric[0]);
    if (value > 24) return value / 1000;
    if (metal === "Oro") return value / 24;
  }
  return 1;
}

function fusionLots(acts) {
  return acts.flatMap(materialLotsForAct);
}

function fusionLotTotals(acts) {
  return fusionLots(acts).reduce((totals, lot) => {
    const key = `${lot.metal}|${lot.title}`;
    totals[key] ||= { metal: lot.metal, title: lot.title, weight: 0 };
    totals[key].weight += lot.weight;
    return totals;
  }, {});
}

function fusionSummaryText(acts) {
  const lots = Object.values(fusionLotTotals(acts));
  if (!lots.length) return "Nessun materiale registrato.";
  return lots
    .map((lot) => `${lot.metal} ${lot.title}: ${lot.weight.toFixed(2)} gr`)
    .join(" - ");
}

function stockByTitleMarkup(acts) {
  const lots = Object.values(fusionLotTotals(acts));
  if (!lots.length) return '<div class="empty-state">Nessun materiale in giacenza.</div>';
  return `
    <div class="archive-table giacenza-title-table">
      <div class="table-row head"><span>Metallo</span><span>Titolo</span><span>Grammi totali</span><span>Atti collegati</span></div>
      ${lots.map((lot) => {
        const linkedActs = acts.filter((act) => materialLotsForAct(act).some((actLot) => actLot.metal === lot.metal && actLot.title === lot.title));
        return `
          <div class="table-row">
            <strong>${escapeHtml(lot.metal)}</strong>
            <span>${escapeHtml(lot.title)}</span>
            <span>${escapeHtml(lot.weight.toFixed(2))} gr</span>
            <span>${escapeHtml(linkedActs.length)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function fusionDdtCode(store, date, number) {
  const year = String(date || localDateKey()).slice(0, 4);
  return `${storeCodeFromName(store)}-${year}-${number}`;
}

function fusionDdtHtml(store, date, acts) {
  const orderedActs = [...acts].sort((first, second) => actNumberValue(first.practiceNumber) - actNumberValue(second.practiceNumber));
  const firstAct = orderedActs[0]?.practiceNumber || "";
  const lastAct = orderedActs.at(-1)?.practiceNumber || "";
  const ddtNumber = orderedActs[0]?.fusion?.ddtNumber || ddtNumberForFusionBatch(store, date);
  const lots = Object.values(fusionLotTotals(orderedActs));
  const totalsByMetal = materialTotalMap(orderedActs);
  const overallWeight = lots.reduce((sum, lot) => sum + lot.weight, 0);

  return `
    <section class="print-copy ddt-copy">
      <div class="ddt-header">
        <img src="oroactive-logo.png" alt="OroActive">
        <div>
          <h1>Documento di Trasporto - Fusione</h1>
          <p>OroActive Compro Oro</p>
          <p>Ragione sociale, sede legale, P.IVA e riferimenti societari futuri</p>
        </div>
      </div>

      <div class="print-meta">
        <div class="print-field"><span>DDT n.</span>${escapeHtml(fusionDdtCode(store, date, ddtNumber))}</div>
        <div class="print-field"><span>Data DDT</span>${escapeHtml(date)}</div>
        <div class="print-field"><span>Negozio</span>${escapeHtml(store)}</div>
      </div>

      <h2>Destinatario</h2>
      <div class="ddt-recipient">
        <div><span>Destinatario</span>______________________________________________</div>
        <div><span>Sede</span>______________________________________________________</div>
        <div><span>P.IVA / C.F.</span>_______________________________________________</div>
      </div>

      <h2>Materiale destinato alla fusione</h2>
      <p class="ddt-statement">
        Vi consegnamo grammi di materiale prezioso usato destinato alla fusione di ${escapeHtml(store)}
        da atto n. ${escapeHtml(firstAct)} a atto n. ${escapeHtml(lastAct)}.
      </p>
      <div class="archive-export-table ddt-lot-table">
        <div class="archive-export-row head"><span>Materiale</span><span>Titolo / caratura</span><span>Grammi</span></div>
        ${lots.map((lot) => `
          <div class="archive-export-row">
            <strong>${escapeHtml(lot.metal)}</strong>
            <span>${escapeHtml(lot.title)}</span>
            <span>${escapeHtml(lot.weight.toFixed(2))} gr</span>
          </div>
        `).join("")}
      </div>

      <h2>Totale grammi di scarico</h2>
      <div class="print-grid">
        ${metalOrder.map((metal) => `
          <div class="print-field"><span>${escapeHtml(metal)}</span>${escapeHtml((totalsByMetal[metal] || 0).toFixed(2))} gr</div>
        `).join("")}
        <div class="print-field"><span>Totale complessivo</span>${escapeHtml(overallWeight.toFixed(2))} gr</div>
      </div>

      <h2>Atti inclusi nel DDT</h2>
      <div class="archive-export-table ddt-act-table">
        <div class="archive-export-row head"><span>Atto</span><span>Cliente</span><span>Data acquisto</span></div>
        ${orderedActs.map((act) => `
          <div class="archive-export-row">
            <strong>${escapeHtml(act.practiceNumber)}</strong>
            <span>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</span>
            <span>${escapeHtml(act.date)}</span>
          </div>
        `).join("")}
      </div>

      <div class="ddt-signatures">
        <div>Firma consegnatario ____________________________</div>
        <div>Firma destinatario _____________________________</div>
      </div>
    </section>
  `;
}

function printFusionDdt(store, date) {
  const acts = demoActs.filter((act) => act.store === store && act.fusion?.fused && act.fusion?.date === date);
  if (!acts.length) {
    showToast("Nessun atto fuso presente per creare il DDT.");
    return;
  }
  printPacket.innerHTML = fusionDdtHtml(store, date, acts);
  window.print();
}

async function confirmActFusion(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }

  const today = localDateKey();
  const legalDate = addDays(act.date, 10);
  const confirmed = window.confirm(
    `L'atto ${practiceNumber} risulta fondibile secondo i termini di legge dal ${legalDate}. Puoi decidere se procedere comunque con la fusione oppure attendere i termini di legge. Vuoi confermare lo scarico dalla giacenza e mandarlo in fusione?`
  );
  if (!confirmed) return;

  const updatedAct = {
    ...act,
    fusion: {
      ...(act.fusion || {}),
      fused: true,
      date: today,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      legalFusionDate: legalDate,
      ddtNumber: ddtNumberForFusionBatch(act.store, today),
      fusedBy: displayUserFullName(state.currentUser)
    }
  };

  try {
    await saveActRecord(updatedAct, "PUT");
    await syncActsFromServer();
    showToast(`Atto ${practiceNumber} scaricato dalla giacenza e inserito nella fusione del giorno.`);
  } catch {
    showToast("Fusione non salvata: controlla la connessione al database.");
  }
}

async function confirmSelectedFusion(store) {
  const selected = [...document.querySelectorAll(`[data-select-fusion-act]:checked`)]
    .map((input) => input.dataset.selectFusionAct)
    .filter(Boolean);
  const unique = [...new Set(selected)];
  if (!unique.length) {
    showToast("Seleziona almeno un atto da mandare in fusione.");
    return;
  }
  const acts = unique.map((practiceNumber) => demoActs.find((act) => act.practiceNumber === practiceNumber)).filter(Boolean);
  const summary = fusionSummaryText(acts);
  const proceed = window.confirm(`Vuoi creare un lotto fusione per ${acts.length} atti di ${store}? ${summary}`);
  if (!proceed) return;
  try {
    showLoading("Creazione lotto fusione...");
    const today = localDateKey();
    const ddtNumber = ddtNumberForFusionBatch(store, today);
    const lot = await apiRequest("/fusioni/lotti", {
      method: "POST",
      body: JSON.stringify({ atti: unique, negozio: store, data_invio: today })
    }).catch(() => null);
    for (const act of acts) {
      const updatedAct = {
        ...act,
        fusion: {
          ...(act.fusion || {}),
          fused: true,
          date: today,
          ddtNumber,
          lotId: lot?.lotto_code || fusionDdtCode(store, today, ddtNumber),
          refinery: act.fusion?.refinery || "",
          theoreticalValue: materialLotsForAct(act).reduce((total, lot) => total + Number(lot.weight || 0) * Number(act.quotazione || 0) / 1000 * titlePurity(lot.metal, lot.title), 0)
        }
      };
      await saveActRecord(updatedAct, "PUT");
    }
    await loadFusionScreenData({ force: true, silent: true });
    renderFusionGroups();
    showToast("Lotto fusione creato e giacenza aggiornata.", "success");
  } catch (error) {
    showToast(error.message || "Lotto fusione non creato.", "error");
  } finally {
    hideLoading();
  }
}

function fusionActRows(acts, options = {}) {
  if (!acts.length) return '<div class="empty-state">Nessun atto presente.</div>';
  const today = localDateKey();
  return `
    <div class="archive-table fusion-table">
      <div class="table-row head"><span>Atto</span><span>Cliente</span><span>Data acquisto</span><span>Fondibile dal</span><span>Materiale</span><span>Azioni</span></div>
      ${acts.flatMap((act) => materialLotsForAct(act).map((material) => `
        <div class="table-row">
          <span>${isActFused(act) ? "" : `<input type="checkbox" data-select-fusion-act="${escapeHtml(act.practiceNumber)}" aria-label="Seleziona ${escapeHtml(act.practiceNumber)}"> `}${escapeHtml(act.practiceNumber)}</span>
          <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
          <span>${escapeHtml(act.date)}</span>
          <em class="${(options.ready || act.fusionDate <= today) ? "done" : ""}">${escapeHtml(act.fusionDate || addDays(act.date, 10))}</em>
          <span>${escapeHtml(material.metal)} ${escapeHtml(material.title)} - ${escapeHtml(material.weight.toFixed(2))} gr</span>
          <div class="row-actions">
            <button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>
            ${canModifyAct(act) ? `<button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica</button>` : ""}
            ${isActFused(act) ? "" : `<button class="warning-button" type="button" data-fuse-act="${escapeHtml(act.practiceNumber)}">Fondi</button>`}
            ${canDeleteActDirectly(act) ? `<button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>` : ""}
            ${canRequestActDeletion(act) ? (
              act.deletionRequest?.status === "pending"
                ? '<span class="request-pending">Richiesta inviata</span>'
                : `<button class="warning-button" type="button" data-request-delete-act="${escapeHtml(act.practiceNumber)}">Richiedi eliminazione</button>`
            ) : ""}
          </div>
        </div>
      `)).join("")}
    </div>
  `;
}

function fusionScreenMeta(view = state.fusionView) {
  return view === "melting"
    ? {
      kicker: "Fusioni",
      title: "Fusioni",
      subtitle: "Prepara lotti fusione, seleziona materiale fondibile e consulta lo storico raffineria."
    }
    : {
      kicker: "Giacenza",
      title: "Giacenza",
      subtitle: "Materiale prezioso in giacenza e calendario fusioni, suddiviso per negozio."
    };
}

function updateFusionScreenCopy() {
  const meta = fusionScreenMeta();
  const screen = document.getElementById("fusion");
  if (!screen) return;
  screen.dataset.fusionView = state.fusionView;
  const header = screen.querySelector(".archive-header");
  const kicker = header?.querySelector(".eyebrow");
  const title = header?.querySelector("h2");
  const subtitle = header?.querySelector(".muted");
  if (kicker) kicker.textContent = meta.kicker;
  if (title) title.textContent = meta.title;
  if (subtitle) subtitle.textContent = meta.subtitle;
}

function focusFusionViewAnchor() {
  if (state.fusionView !== "melting") return;
  window.requestAnimationFrame(() => {
    const target = document.querySelector("#fusion .fusion-batch-actions, #fusion .fusion-history, #fusionGroups");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderFusionGroups() {
  const container = document.getElementById("fusionGroups");
  if (!container) return;
  updateFusionScreenCopy();
  const selectedStore = document.getElementById("fusionStoreFilter")?.value || "Tutti";

  const acts = demoActs
    .filter((act) => isCompletedWorkflowStatus(act.status))
    .map((act) => ({ ...act, daysElapsed: daysFromPurchase(act.date), fusionDate: addDays(act.date, 10) }))
    .sort((first, second) => dateValue(second.date) - dateValue(first.date));

  if (!acts.length) {
    container.innerHTML = '<div class="empty-state">Nessuna giacenza disponibile per i negozi autorizzati.</div>';
    focusFusionViewAnchor();
    return;
  }

  const grouped = acts.reduce((groups, act) => {
    groups[act.store] ||= [];
    groups[act.store].push(act);
    return groups;
  }, {});

  const stores = ["Busto Arsizio", "Cassano Magnago", "Legnano"];
  container.innerHTML = stores
    .filter((store) => selectedStore === "Tutti" || store === selectedStore)
    .filter((store) => grouped[store]?.length)
    .map((store) => {
      const storeActs = grouped[store];
      const stockActs = storeActs.filter((act) => !isActFused(act));
      const fusedActs = storeActs.filter(isActFused);
      const storeTotals = materialTotalMap(stockActs);
      const readyActs = stockActs.filter((act) => act.daysElapsed >= 10);
      const readyTotals = materialTotalMap(readyActs);
      const orderedStoreActs = [...stockActs].sort((first, second) => {
        const fusionCompare = String(first.fusionDate || "").localeCompare(String(second.fusionDate || ""));
        return fusionCompare || String(second.date || "").localeCompare(String(first.date || ""));
      });
      const fusedByDay = fusedActs.reduce((days, act) => {
        const date = act.fusion?.date || localDateKey();
        days[date] ||= [];
        days[date].push(act);
        return days;
      }, {});

      return `
        <section class="fusion-store">
          <div class="fusion-store-heading">
            <div>
              <h3>${escapeHtml(store)}</h3>
              <p>Giacenza complessiva per negozio, con atti ordinati per data di fusione.</p>
            </div>
            <div class="fusion-store-totals">
              ${materialTotalsMarkup(storeTotals)}
              ${materialTotalsMarkup(readyTotals, "Totali fondibili oggi")}
            </div>
          </div>
          <div class="fusion-materials single-fusion-table">
            <div class="fusion-material-heading">
              <h4>Giacenza metalli per titolo/caratura</h4>
              <span>Raggruppata per materiale e negozio</span>
            </div>
            ${stockByTitleMarkup(stockActs)}
            <div class="fusion-batch-actions">
              <button class="primary-button" type="button" data-fuse-selected-store="${escapeHtml(store)}">Crea lotto fusione da selezionati</button>
              <span>Seleziona piu atti per generare un lotto unico separato per materiale e caratura.</span>
            </div>
            ${fusionActRows(orderedStoreActs)}
          </div>
          <div class="fusion-history">
            <div class="fusion-material-heading">
              <h4>Fusioni confermate</h4>
              <span>${escapeHtml(fusedActs.length)} atti fusi</span>
            </div>
            ${Object.entries(fusedByDay).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayActs]) => `
              <section class="fusion-day-summary">
                <div class="fusion-day-heading">
                  <div>
                    <h5>Fusione del ${escapeHtml(date)}</h5>
                    <span>DDT ${escapeHtml(fusionDdtCode(store, date, dayActs[0]?.fusion?.ddtNumber || ddtNumberForFusionBatch(store, date)))}</span>
                  </div>
                  <button class="primary-button" type="button" data-fusion-ddt-store="${escapeHtml(store)}" data-fusion-ddt-date="${escapeHtml(date)}">Prepara PDF DDT Fusione</button>
                </div>
                <p>${escapeHtml(fusionSummaryText(dayActs))}</p>
                ${fusionActRows(dayActs, { ready: true })}
              </section>
            `).join("") || '<div class="empty-state">Nessuna fusione confermata per questo negozio.</div>'}
          </div>
        </section>
      `;
    }).join("") || '<div class="empty-state">Nessuna giacenza disponibile per il negozio selezionato.</div>';
  focusFusionViewAnchor();
}

function clearActSearch() {
  const keyword = document.getElementById("searchKeyword");
  if (keyword) keyword.value = "";
  state.lastSearchResults = [];
  state.searchActive = false;
  state.archivePage = 1;
  renderArchiveGroups();
}

async function runActSearch() {
  const keyword = document.getElementById("searchKeyword").value.trim();
  if (!keyword) {
    showToast("Inserisci una parola chiave da ricercare.");
    return;
  }

  const results = await loadSavedActs({
    force: true,
    store: selectedArchiveStore(),
    field: document.getElementById("searchField")?.value || "name",
    q: keyword,
    includeSuspended: archiveShowsSuspended(),
    limit: ACT_LIST_LIMIT
  });
  state.lastSearchResults = results;
  state.searchActive = true;
  state.archivePage = 1;
  renderArchiveGroups();
  if (!results.length) showToast("Nessun atto trovato nel negozio selezionato.");
}

function renderStep() {
  steps.forEach((step, index) => step.classList.toggle("active", index === state.step));
  panels.forEach((panel, index) => panel.classList.toggle("active-step", index === state.step));
  document.getElementById("previousStep").disabled = state.step === 0;
  const nextStepButton = document.getElementById("nextStep");
  const isFinalStep = state.step === 4;
  nextStepButton.textContent = isFinalStep ? "Completa pratica" : "Avanti";
  nextStepButton.classList.toggle("complete-practice-button", isFinalStep);
  if (isFinalStep) scheduleQualityCheckValidation();
  markAurumAvoidElements();
  dispatchAurumAvoidanceUpdate();
}

function updateSignatureState() {
  const signed = state.signatures.filter(Boolean).length;
  const status = document.getElementById("signatureStatus");
  status.textContent = signed === REQUIRED_SIGNATURES ? "Firme complete" : `${REQUIRED_SIGNATURES - signed} firme mancanti`;
  status.classList.toggle("success", signed === REQUIRED_SIGNATURES);
  status.classList.toggle("warning", signed !== REQUIRED_SIGNATURES);
  document.getElementById("summarySignatures").textContent = signed === REQUIRED_SIGNATURES ? `${REQUIRED_SIGNATURES} di ${REQUIRED_SIGNATURES} complete` : `${signed} di ${REQUIRED_SIGNATURES} complete`;
  updateChecklistState();
}

function updateAttachmentState() {
  const required = requiredCaptureKeys();
  const uploadedRequired = required.filter((key) => state.uploadedCaptures.has(key)).length;
  document.getElementById("summaryAttachments").textContent = `${uploadedRequired} di ${required.length} caricati`;
  updateChecklistState();
}

function selectedPaymentMethod() {
  return fieldValue("#paymentMethod");
}

function saleTotalAmount() {
  const total = Number(fieldValue("#saleTotal"));
  return Number.isFinite(total) ? total : 0;
}

function isCashPayment() {
  return selectedPaymentMethod().toLowerCase().includes("contanti");
}

function cashPaymentLimitViolation() {
  return isCashPayment() && (saleTotalAmount() > CASH_PAYMENT_LIMIT || state.amlCashCheck?.ok === false);
}

function cashPaymentLimitMessage() {
  return state.amlCashCheck?.messaggio || "Attenzione: questo cliente ha raggiunto o supererebbe il limite di 500€ in contanti negli ultimi 7 giorni. Per rispettare le norme antiriciclaggio, utilizzare un metodo di pagamento tracciabile.";
}

function notifyCashPaymentLimitIfNeeded(options = {}) {
  if (!cashPaymentLimitViolation()) {
    state.cashLimitWarningShown = false;
    return false;
  }

  if (options.force || !state.cashLimitWarningShown) {
    showToast(cashPaymentLimitMessage());
    state.cashLimitWarningShown = true;
  }
  return true;
}

function renderAmlCashAlert() {
  const box = document.getElementById("amlCashAlert");
  if (!box) return;
  const data = state.amlCashCheck;
  if (!isCashPayment() || !data) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const over = data.ok === false;
  box.hidden = false;
  box.classList.toggle("blocking", over);
  box.innerHTML = `
    <strong>${over ? "Limite contanti superato" : "Controllo contanti ultimi 7 giorni"}</strong>
    <span>Contanti ricevuti ultimi 7 giorni: ${escapeHtml(formatEuro(Number(data.totale_ultimi_7_giorni || 0)))}</span>
    <span>Importo atto corrente: ${escapeHtml(formatEuro(Number(data.importo_corrente || 0)))}</span>
    <span>Totale previsto: ${escapeHtml(formatEuro(Number(data.totale_previsto || 0)))}</span>
    <span>Residuo disponibile: ${escapeHtml(formatEuro(Math.max(0, Number(data.residuo_disponibile || 0))))}</span>
    ${Number(data.superamento || 0) > 0 ? `<span>Superamento limite: ${escapeHtml(formatEuro(Number(data.superamento || 0)))}</span>` : ""}
    <em>${over ? "Per normativa antiriciclaggio, non possiamo erogare ulteriori contanti oltre il limite consentito negli ultimi 7 giorni. È necessario utilizzare Bonifico o Assegno." : "Metodo utilizzabile entro il residuo indicato."}</em>
  `;
}

function scheduleAmlCashCheck() {
  window.clearTimeout(state.amlCashCheckTimer);
  state.amlCashCheckTimer = window.setTimeout(() => refreshAmlCashCheck(), 400);
}

async function refreshAmlCashCheck(options = {}) {
  if (!isCashPayment()) {
    state.amlCashCheck = null;
    renderAmlCashAlert();
    return null;
  }
  const fiscalCode = normalizeFiscalCodeInput(fieldValue('[name="cf"]'));
  const amount = saleTotalAmount();
  const date = fieldValue("#practiceDate");
  if (!fiscalCode || fiscalCode.length !== 16 || amount <= 0 || !date) {
    state.amlCashCheck = null;
    renderAmlCashAlert();
    return null;
  }
  try {
    state.amlCashCheckLoading = true;
    const query = queryString({
      codice_fiscale: fiscalCode,
      data_atto: date,
      importo_corrente: amount,
      atto_id: state.editingActId || ""
    });
    const data = await apiRequest(`/antiriciclaggio/contanti-check?${query}`, { timeoutMs: 12000 });
    state.amlCashCheck = data;
    renderAmlCashAlert();
    if (options.force && data.ok === false) showToast(cashPaymentLimitMessage());
    return data;
  } catch (error) {
    if (options.force) showToast(error.message || "Controllo antiriciclaggio non disponibile.");
    return null;
  } finally {
    state.amlCashCheckLoading = false;
  }
}

function paymentRequiresProof() {
  return ["Bonifico", "Assegno"].includes(selectedPaymentMethod());
}

function paymentRequiresIban() {
  return selectedPaymentMethod().trim().toLowerCase() === "bonifico";
}

function updateIbanVisibility() {
  const field = document.getElementById("ibanField");
  if (!field) return;
  field.hidden = !paymentRequiresIban();
}

function paymentCaptureKey() {
  return `pagamento-${selectedPaymentMethod().toLowerCase().replace(/\s+/g, "-")}`;
}

function renderPaymentCaptureCard() {
  const section = document.getElementById("paymentCaptureSection");
  const grid = document.getElementById("paymentCaptureGrid");
  if (!section || !grid) return;
  updateIbanVisibility();

  section.hidden = !paymentRequiresProof();
  if (!paymentRequiresProof()) {
    grid.innerHTML = "";
    updateAttachmentState();
    return;
  }

  const key = paymentCaptureKey();
  const method = selectedPaymentMethod().toLowerCase();
  const loaded = state.uploadedCaptures.has(key);
  grid.innerHTML = `
    <div class="capture-combo-card" data-capture-group="payment">
      <div>
        <span>Pagamento</span>
        <strong>Contabile pagamento</strong>
        <em>Carica immagine o PDF della contabile ${escapeHtml(method)}.</em>
      </div>
      <label class="capture-card ${loaded ? "loaded" : ""}" data-capture-key="${key}">
        <input type="file" accept="image/*,.pdf" capture="environment">
        <span>Pagamento</span>
        <strong>Contabile ${method}</strong>
        <em>${loaded ? "Allegato acquisito" : "Tocca per fotografare o allegare"}</em>
        ${captureActionsMarkup()}
      </label>
    </div>
  `;
  ensureCaptureActions();
  updateAttachmentState();
}

function currentDocumentLabel() {
  return documentLabels[fieldValue("#documentType")] || "documento";
}

function currentDocumentSlug() {
  return currentDocumentLabel().toLowerCase().replace(/\s+/g, "-");
}

function documentCaptureKey(side) {
  return `documento-${side}-${currentDocumentSlug()}`;
}

function updateDocumentCaptureCards() {
  const label = currentDocumentLabel();
  const title = document.getElementById("identityDocumentGroupTitle");
  if (title) title.textContent = `${fieldValue("#documentType") || "Documento identità"} / patente / passaporto`;

  document.querySelectorAll("[data-document-capture]").forEach((card) => {
    const side = card.dataset.documentCapture;
    const key = documentCaptureKey(side);
    card.dataset.captureKey = key;
    card.querySelector("strong").textContent = `${side === "fronte" ? "Fronte" : "Retro"} ${label}`;
    const loaded = state.uploadedCaptures.has(key);
    card.classList.toggle("loaded", loaded);
    card.querySelector("em").textContent = loaded ? "Foto acquisita" : "Tocca per fotografare";
  });
  ensureCaptureActions();
}

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function formatBullionPrice(value) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function parseItalianNumber(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "Dato non inserito") return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBullionInputValue(value) {
  if (value === undefined || value === null || value === "" || value === "Dato non inserito") return "";
  return formatBullionPrice(parseItalianNumber(value));
}

function applyBullionVaultPrices() {
  renderQuoteDashboard();
}

function renderQuoteDashboard() {
  if (!quoteDashboard) return;
  const metals = ["Oro", "Argento", "Platino"];
  const rows = metals.map((metal) => {
    const quote = state.bullionVaultPrices[metal];
    return `
      <article>
        <span>${escapeHtml(metal)}</span>
        <strong>${quote ? `${formatBullionPrice(quote.value)} EUR/kg` : "Dato non inserito"}</strong>
      </article>
    `;
  });
  quoteDashboard.innerHTML = rows.join("");
}

async function initBullionVaultChart() {
  if (!bullionVaultChart || state.bullionChartLoaded) return;
  try {
    await loadScriptOnce("https://www.bullionvault.com/chart/bullionvaultchart.js?v=1", "bullionvault-chart-script");
    if (typeof window.BullionVaultChart !== "function") throw new Error("Widget non disponibile");
    bullionVaultChart.innerHTML = "";
    new window.BullionVaultChart({
      bullion: "gold",
      currency: "EUR",
      timeframe: "1w",
      chartType: "line",
      containerDefinedSize: true,
      displayLatestPriceLine: true,
      switchBullion: true,
      switchCurrency: true,
      switchTimeframe: true,
      switchChartType: false,
      exportButton: false
    }, "bullionVaultChart");
    state.bullionChartLoaded = true;
    if (bullionVaultChartFallback) bullionVaultChartFallback.hidden = true;
  } catch {
    if (bullionVaultChartFallback) bullionVaultChartFallback.hidden = false;
  }
}

async function refreshBullionVaultPrices(options = {}) {
  try {
    const data = await apiRequest("/bullionvault/prices");
    state.bullionVaultPrices = Object.fromEntries((data.prices || []).map((quote) => [quote.metal, quote]));
    applyBullionVaultPrices();
    renderQuoteDashboard();
    if (options.notify) showToast("Quotazioni BullionVault aggiornate.");
  } catch {
    renderQuoteDashboard();
    if (options.notify) showToast("Quotazioni BullionVault non disponibili. Puoi inserire il dato manualmente.");
  }
}

function formatGoldPerGram(value, currency = "EUR") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Non disponibile";
  return `${new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)}/g`;
}

function goldPredictionHorizonLabel(horizon = "") {
  return {
    today: "oggi",
    "24h": "24 ore",
    "7d": "7 giorni",
    "30d": "30 giorni"
  }[String(horizon)] || horizon || "Scenario";
}

function goldPredictionTrendClass(value = "") {
  const trend = String(value || "").toLowerCase();
  if (trend.includes("rial")) return "up";
  if (trend.includes("rib")) return "down";
  return "flat";
}

function formatMetalPerKg(value, currency = "EUR") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Non disponibile";
  return `${new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)}/kg`;
}

function formatPredictionPercent(value) {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(number * 100)}%`;
}

function metalDisplayName(metal = "") {
  return String(metal) === "silver" ? "Argento" : "Oro";
}

function metalPredictionRows() {
  const source = state.metalPredictionLatest || {};
  return Object.values(source).flat().length
    ? Object.values(source).flat()
    : (state.goldPredictionLatest || []);
}

function metalPredictionsByKey() {
  return new Map(metalPredictionRows().map((prediction) => [`${prediction.metal}:${prediction.horizon || prediction.prediction_horizon}`, prediction]));
}

function competitorComparisonMessage(row = {}) {
  const count = Number(row.competitor_count || 0);
  if (!count) return "Nessun competitor";
  const diffAvg = Number(row.difference_vs_avg || 0);
  const diffMax = Number(row.difference_vs_max || 0);
  const avgText = diffAvg < 0 ? `${formatGoldPerGram(Math.abs(diffAvg), row.currency)} sotto media` : `${formatGoldPerGram(diffAvg, row.currency)} sopra media`;
  const maxText = diffMax < 0 ? `${formatGoldPerGram(Math.abs(diffMax), row.currency)} sotto max` : `${formatGoldPerGram(diffMax, row.currency)} sopra max`;
  return `${avgText} · ${maxText}`;
}

function marketStatusLabel(status = "", row = {}) {
  if (competitorDataIsStale(row)) return "Dati competitor da aggiornare";
  const value = String(status || row.market_comparison_status || "").toLowerCase();
  if (value === "competitor_too_high") return "Competitor sopra massimo pagabile";
  if (value === "aligned_market") return "Allineato";
  if (value === "above_market") return "Competitivo";
  if (value === "below_market") return "Sotto media";
  if (value === "no_competitor_data") return "Dati competitor assenti";
  return row.competitor_count ? "Confronto disponibile" : "Dati competitor assenti";
}

function marketStatusClass(status = "") {
  const value = String(status || "").toLowerCase();
  if (value === "competitor_too_high") return "warning";
  if (value === "aligned_market") return "neutral";
  if (value === "above_market") return "success";
  if (value === "below_market") return "warning";
  return "muted";
}

function competitorDataIsStale(row = {}) {
  if (!row.competitor_count || !row.competitor_last_update) return false;
  const maxAgeHours = Number(state.goldPredictionSettings?.competitor_data_max_age_hours || state.goldPredictionStatus?.settings?.competitor_data_max_age_hours || 24);
  const updatedAt = new Date(row.competitor_last_update).getTime();
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt > Math.max(1, maxAgeHours) * 60 * 60 * 1000;
}

function marketDelta(value, currency = "EUR") {
  if (!aurumHasNumber(value)) return "—";
  const number = Number(value);
  if (number === 0) return "Allineato";
  return number > 0
    ? `+${formatGoldPerGram(number, currency)}`
    : `-${formatGoldPerGram(Math.abs(number), currency)}`;
}

function buybackMarketPrice(row = {}) {
  return Number(row.best_market_client_price_per_gram || row.recommended_payable_per_gram || 0);
}

function competitorNameKey(name = "") {
  const normalized = String(name || "")
    .normalize("NFKC")
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("it-IT");
  if (normalized === "oro d oro" || normalized === "oro d'oro") return "oro d'oro";
  return normalized;
}

const HIDDEN_COMPETITOR_KEYS = new Set(["banco preziosi"]);

function isHiddenCompetitorName(name = "") {
  return HIDDEN_COMPETITOR_KEYS.has(competitorNameKey(name));
}

function competitorDisplayName(name = "") {
  const key = competitorNameKey(name);
  if (key === "oro d'oro") return "Oro D'oro";
  return String(name || "").trim();
}

function competitorNamesForMetal(metal = "") {
  const namesByKey = new Map();
  (state.competitorQuotes || [])
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .forEach((quote) => {
      const name = String(quote.competitor_name || "").trim();
      const key = competitorNameKey(name);
      if (key && !namesByKey.has(key)) namesByKey.set(key, competitorDisplayName(name));
    });
  return [...namesByKey.values()].sort((first, second) => first.localeCompare(second, "it"));
}

function latestCompetitorQuoteForPurity(competitorName = "", metal = "", purityCode = "") {
  const normalizedName = competitorNameKey(competitorName);
  return (state.competitorQuotes || [])
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => competitorNameKey(quote.competitor_name) === normalizedName)
    .filter((quote) => quote.metal === metal)
    .filter((quote) => quote.purity_code === purityCode)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function competitorQuoteMatrixValue(quote = null) {
  if (!quote) return "—";
  const currency = quote.currency || "EUR";
  const isRange = quote.raw_payload?.price_kind === "range";
  const min = Number(quote.raw_payload?.range_min_per_gram || 0);
  const max = Number(quote.raw_payload?.range_max_per_gram || 0);
  if (isRange && min && max) {
    return `da ${formatGoldPerGram(min, currency)} a ${formatGoldPerGram(max, currency)}`;
  }
  return formatGoldPerGram(quote.price_per_gram, currency);
}

function competitorSourceStatusLabel(source = {}) {
  const status = String(source.last_sync_status || "").toLowerCase();
  if (status === "success" || status === "updated") return "Aggiornato";
  if (status === "partial") return "Parziale";
  if (status === "failed") return "Sync fallito";
  if (status === "no_quotes") return "Nessun prezzo inserito";
  if (status === "manual_required") return "Da aggiornare manualmente";
  if (status === "disabled") return "Disattivato";
  if (source.source_type === "manual") return "Manuale";
  return "Da aggiornare";
}

function competitorAutoSyncSummaryHtml() {
  const sync = state.competitorSyncStatus || {};
  const status = sync.status || {};
  const hasStatus = Boolean(sync.status);
  const sourcesTotal = Number(sync.sources_total || state.competitorSources?.length || 0);
  const updated = Number(sync.sources_updated || 0);
  const failed = Number(sync.sources_failed || 0);
  const validQuotes = Number(sync.valid_quotes_24h || 0);
  const lastError = status.last_error || (sync.recent_logs || []).find((log) => log.error_message)?.error_message || "";
  return `
    <article class="competitor-auto-sync-card">
      <div>
        <span>Auto aggiornamento competitor</span>
        <strong>${hasStatus ? status.enabled ? "Attivo" : "Disattivo" : "Stato riservato"}</strong>
      </div>
      <div>
        <span>Ultima sync</span>
        <strong>${status.last_run_at ? escapeHtml(formatDateTime(status.last_run_at)) : "Non ancora eseguita"}</strong>
      </div>
      <div>
        <span>Prossima sync</span>
        <strong>${status.next_run_at ? escapeHtml(formatDateTime(status.next_run_at)) : "Non pianificata"}</strong>
      </div>
      <div>
        <span>Fonti aggiornate</span>
        <strong>${updated}/${sourcesTotal}</strong>
      </div>
      <div>
        <span>Fonti fallite</span>
        <strong>${failed}</strong>
      </div>
      <div>
        <span>Prezzi validi 24h</span>
        <strong>${validQuotes}</strong>
      </div>
      ${lastError ? `<p>${escapeHtml(lastError)}</p>` : ""}
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-competitor-sync="all">Forza sync competitor</button>` : ""}
    </article>
  `;
}

function competitorAiExtractionSummaryHtml() {
  const ai = state.competitorAiStatus || {};
  const status = ai.status || {};
  const hasStatus = Boolean(ai.status);
  const latest = ai.latest_run || {};
  const sourcesTotal = Number(latest.sources_total || status.sources_total || state.competitorSources?.length || 0);
  const sourcesSuccess = Number(latest.sources_success || 0);
  const sourcesFailed = Number(latest.sources_failed || 0);
  const pagesAnalyzed = Number(latest.pages_analyzed || 0);
  const quotesSaved = Number(latest.quotes_saved || 0);
  const validQuotes = Number(ai.quotes_24h || state.competitorAiQuotes?.length || 0);
  const lastError = status.last_error || latest.error_message || "";
  return `
    <article class="competitor-auto-sync-card competitor-ai-sync-card">
      <div>
        <span>Analisi AI competitor</span>
        <strong>${hasStatus ? status.enabled ? "Attiva" : "Disattiva" : "Stato riservato"}</strong>
      </div>
      <div>
        <span>AI backend</span>
        <strong>${hasStatus ? status.openai_configured ? "Configurata" : "Non configurata" : "Riservata"}</strong>
      </div>
      <div>
        <span>Ultima analisi</span>
        <strong>${status.last_run_at ? escapeHtml(formatDateTime(status.last_run_at)) : latest.started_at ? escapeHtml(formatDateTime(latest.started_at)) : "Non ancora eseguita"}</strong>
      </div>
      <div>
        <span>Prossima analisi</span>
        <strong>${status.next_run_at ? escapeHtml(formatDateTime(status.next_run_at)) : "Non pianificata"}</strong>
      </div>
      <div>
        <span>Fonti ok/fallite</span>
        <strong>${sourcesSuccess}/${sourcesTotal} · ${sourcesFailed} KO</strong>
      </div>
      <div>
        <span>Pagine / quote</span>
        <strong>${pagesAnalyzed} pagine · ${quotesSaved || validQuotes} quote</strong>
      </div>
      ${status.running ? `<p>Analisi AI competitor in corso. I nuovi dati compariranno appena il backend completa il run.</p>` : ""}
      ${lastError ? `<p>${escapeHtml(lastError)}</p>` : ""}
      ${isFounder() ? `<button class="ghost-button" type="button" data-run-ai-competitor-extract="all">Riesegui analisi AI</button>` : ""}
    </article>
  `;
}

function competitorSourceForQuote(quote = {}) {
  const sources = state.competitorSources || [];
  return sources.find((source) => String(source.id) === String(quote.source_id))
    || sources.find((source) => source.name?.toLowerCase() === quote.competitor_name?.toLowerCase())
    || {};
}

function competitorAiPageForSource(source = {}) {
  const summary = state.competitorAiStatus?.page_summary || [];
  return summary.find((page) => String(page.source_id || "") === String(source.id || ""))
    || summary.find((page) => page.competitor_name?.toLowerCase() === source.name?.toLowerCase())
    || {};
}

function competitorQuoteTypeLabel(type = "") {
  const normalized = String(type || "customer_buyback").toLowerCase();
  if (normalized === "customer_buyback") return "Acquisto cliente";
  return "Non mostrata";
}

function isUnsupportedCompetitorBuybackQuote(quote = {}) {
  const competitorKey = competitorNameKey(quote.competitor_name);
  const quoteType = String(quote.quote_type || "customer_buyback").toLowerCase();
  return HIDDEN_COMPETITOR_KEYS.has(competitorKey) && quoteType === "customer_buyback";
}

function isCompetitorBuybackQuote(quote = {}) {
  return String(quote.quote_type || "customer_buyback").toLowerCase() === "customer_buyback"
    && !isUnsupportedCompetitorBuybackQuote(quote);
}

function competitorSourceTypeLabel(type = "") {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "oro_express_parser") return "Parser Oro Express";
  if (normalized === "oro_doro_parser") return "Parser Oro D'Oro";
  if (normalized === "amico_oro_parser") return "Parser Amico Oro";
  if (normalized === "pronto_gold_parser") return "Parser Pronto Gold";
  if (normalized === "bordin_parser") return "Parser Bordin";
  if (normalized === "gold_standard_parser") return "Parser Gold Standard";
  if (normalized === "oro_in_euro_parser") return "Parser Oro in Euro";
  if (normalized === "gruppo_oro_24k_parser") return "Parser Gruppo Oro 24K";
  if (normalized === "configured_page") return "Pagina configurata";
  if (normalized === "api") return "API";
  if (normalized === "csv_import") return "CSV";
  return normalized || "manuale";
}

function competitorPurityDisplay(quote = {}) {
  if (quote.competitor_name === "Oro Express" && quote.metal === "silver" && quote.purity_code === "used_generic") {
    return "Argento usato / generico";
  }
  if (quote.competitor_name === "Oro Express" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro puro / 24kt";
  if (quote.competitor_name === "Oro Express" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro usato / 18kt";
  if (quote.competitor_name === "Oro Express" && quote.metal === "silver" && quote.purity_code === "999") return "Argento puro / 999";
  if (quote.competitor_name === "Oro D'Oro" && quote.metal === "gold") return `Oro ${quote.purity_code}`;
  if (quote.competitor_name === "Oro D'Oro" && quote.metal === "silver") return `Argento ${quote.purity_code}`;
  if (quote.competitor_name === "Amico Oro" && quote.metal === "gold" && quote.purity_code === "24kt") return "24K / 24kt";
  if (quote.competitor_name === "Amico Oro" && quote.metal === "gold" && quote.purity_code === "18kt") return "18K / 18kt";
  if (quote.competitor_name === "Amico Oro" && quote.metal === "gold" && quote.purity_code === "14kt") return "14K / 14kt";
  if (quote.competitor_name === "Amico Oro" && quote.metal === "silver" && quote.purity_code === "999") return "Argento 999";
  if (quote.competitor_name === "Amico Oro" && quote.metal === "silver" && quote.purity_code === "925") return "Argento 925";
  if (quote.competitor_name === "Amico Oro" && quote.metal === "silver" && quote.purity_code === "800") return "Argento 800";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro puro 24k acquisto";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro usato 18k da/a";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "gold" && quote.purity_code === "14kt") return "Oro usato 14k";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "gold" && quote.purity_code === "9kt") return "Oro usato 9k";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "silver" && quote.purity_code === "999") return "Argento puro acquisto";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "silver" && quote.purity_code === "925") return "Argento usato 925";
  if (quote.competitor_name === "Pronto Gold" && quote.metal === "silver" && quote.purity_code === "800") return "Argento usato 800";
  if (quote.competitor_name === "Bordin" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro 24kt / 999,9‰";
  if (quote.competitor_name === "Bordin" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro 18kt / 750‰";
  if (quote.competitor_name === "Bordin" && quote.metal === "gold" && quote.purity_code === "14kt") return "Oro 14kt / 585‰";
  if (quote.competitor_name === "Bordin" && quote.metal === "silver") return `Argento ${quote.purity_code}‰`;
  if (quote.competitor_name === "Gold Standard" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro 24K prezzo MIN";
  if (quote.competitor_name === "Gold Standard" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro 18K prezzo MIN";
  if (quote.competitor_name === "Gold Standard" && quote.metal === "silver") return `Argento ${quote.purity_code} prezzo MIN`;
  if (quote.competitor_name === "Oro in Euro" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro 750/1000 / 18kt";
  if (quote.competitor_name === "Oro in Euro" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro 999/1000 / 24kt";
  if (quote.competitor_name === "Oro in Euro" && quote.metal === "silver" && quote.purity_code === "999") return "Argento 999/1000";
  if (quote.competitor_name === "Gruppo Oro 24K" && quote.metal === "gold" && quote.purity_code === "24kt") return "Oro 24 carati / 24kt";
  if (quote.competitor_name === "Gruppo Oro 24K" && quote.metal === "gold" && quote.purity_code === "18kt") return "Oro 18 carati / 18kt";
  if (quote.competitor_name === "Gruppo Oro 24K" && quote.metal === "silver" && quote.purity_code === "999") return "Argento 999";
  if (quote.competitor_name === "Gruppo Oro 24K" && quote.metal === "silver" && quote.purity_code === "800") return "Argento 800";
  return quote.purity_code || "—";
}

function competitorEvidenceHtml(quote = {}) {
  const evidence = String(quote.evidence_text || "").trim();
  if (!evidence) return "—";
  const sourceUrl = quote.source_url || quote.url || "";
  return `
    <details class="competitor-ai-evidence">
      <summary>Vedi prova</summary>
      <p>${escapeHtml(evidence.slice(0, 320))}${evidence.length > 320 ? "..." : ""}</p>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Apri fonte</a>` : ""}
    </details>
  `;
}

function latestOroExpressQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Oro Express")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestOroDOroQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Oro D'Oro" || String(quote.competitor_name || "").toLowerCase() === "oro d'oro")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestAmicoOroQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Amico Oro")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestProntoGoldQuote(metal = "", purityCode = "", quoteType = "customer_buyback") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Pronto Gold")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .filter((quote) => !quoteType || String(quote.quote_type || "customer_buyback").toLowerCase() === quoteType)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestBordinQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Bordin")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestGoldStandardQuote(metal = "", purityCode = "", quoteType = "customer_buyback") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Gold Standard")
    .filter(isCompetitorBuybackQuote)
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .filter((quote) => !quoteType || String(quote.quote_type || "customer_buyback").toLowerCase() === quoteType)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestOroInEuroQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Oro in Euro")
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .filter(isCompetitorBuybackQuote)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function latestGruppoOro24kQuote(metal = "", purityCode = "") {
  return (state.competitorQuotes || [])
    .filter((quote) => quote.competitor_name === "Gruppo Oro 24K")
    .filter((quote) => !metal || quote.metal === metal)
    .filter((quote) => !purityCode || quote.purity_code === purityCode)
    .filter(isCompetitorBuybackQuote)
    .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))[0] || null;
}

function oroExpressSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Oro Express") || {};
  const quotes = ["24kt", "18kt", "999", "used_generic"]
    .map((code) => latestOroExpressQuote(code === "999" || code === "used_generic" ? "silver" : "gold", code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Oro Express rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="oro-express-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Oro Express</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.oro-express.it</a>` : "https://www.oro-express.it"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="oro-express-grid">${quoteRows}</div>
      <p>Ultimo aggiornamento: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-oro-express-sync>Forza aggiornamento Oro Express</button>` : ""}
    </article>
  `;
}

function oroDOroSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => String(item.name || "").toLowerCase() === "oro d'oro") || {};
  const quoteConfigs = [
    { metal: "gold", code: "24kt" },
    { metal: "gold", code: "22kt" },
    { metal: "gold", code: "21kt" },
    { metal: "gold", code: "20kt" },
    { metal: "gold", code: "18kt" },
    { metal: "gold", code: "14kt" },
    { metal: "gold", code: "9kt" },
    { metal: "silver", code: "999" },
    { metal: "silver", code: "925" },
    { metal: "silver", code: "800" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestOroDOroQuote(item.metal, item.code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Oro D'Oro rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="oro-doro-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Oro D'Oro</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.comproorodoro.it</a>` : "https://www.comproorodoro.it"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="oro-doro-grid">${quoteRows}</div>
      <p>Ultimo aggiornamento: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-oro-doro-sync>Forza aggiornamento Oro D'Oro</button>` : ""}
    </article>
  `;
}

function amicoOroSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Amico Oro") || {};
  const quotes = ["24kt", "18kt", "14kt", "999", "925", "800"]
    .map((code) => latestAmicoOroQuote(["999", "925", "800"].includes(code) ? "silver" : "gold", code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Amico Oro rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="amico-oro-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Amico Oro</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.amico-oro.it</a>` : "https://www.amico-oro.it"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="amico-oro-grid">${quoteRows}</div>
      <p>Ultimo aggiornamento: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-amico-oro-sync>Forza aggiornamento Amico Oro</button>` : ""}
    </article>
  `;
}

function prontoGoldSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Pronto Gold") || {};
  const quoteConfigs = [
    { metal: "gold", code: "24kt", type: "customer_buyback" },
    { metal: "gold", code: "18kt", type: "customer_buyback" },
    { metal: "gold", code: "14kt", type: "customer_buyback" },
    { metal: "gold", code: "9kt", type: "customer_buyback" },
    { metal: "silver", code: "999", type: "customer_buyback" },
    { metal: "silver", code: "925", type: "customer_buyback" },
    { metal: "silver", code: "800", type: "customer_buyback" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestProntoGoldQuote(item.metal, item.code, item.type))
    .filter(Boolean);
  if (!quotes.length) return "";
  const providerTimestamp = quotes.map((quote) => quote.raw_payload?.provider_timestamp || quote.raw_payload?.provider_timestamp_text).filter(Boolean)[0] || "";
  const providerTimestampLabel = providerTimestamp
    ? Number.isNaN(new Date(providerTimestamp).getTime()) ? providerTimestamp : formatDateTime(providerTimestamp)
    : "non rilevato";
  const quoteRows = quotes.map((quote) => {
        const isRange = quote.raw_payload?.price_kind === "range";
        const min = Number(quote.raw_payload?.range_min_per_gram || 0);
        const max = Number(quote.raw_payload?.range_max_per_gram || 0);
        const priceLabel = isRange && min && max
          ? `da ${formatGoldPerGram(min, quote.currency || "EUR")} a ${formatGoldPerGram(max, quote.currency || "EUR")}`
          : formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR");
        return `
          <div>
            <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
            <strong>${escapeHtml(priceLabel)}</strong>
          </div>
        `;
      }).join("");
  return `
    <article class="pronto-gold-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Pronto Gold</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.prontogold.com</a>` : "https://www.prontogold.com"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="pronto-gold-grid">${quoteRows}</div>
      <p>Ultimo aggiornamento sito: ${escapeHtml(providerTimestampLabel)} · Ultimo sync app: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      <p class="gold-prediction-disclaimer">Sono mostrate solo le quotazioni di acquisto cliente per carature e titoli disponibili. Il range 18k usa il valore massimo pubblicato; prezzi di borsa, vendita e monete restano esclusi dal confronto.</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-pronto-gold-sync>Forza aggiornamento Pronto Gold</button>` : ""}
    </article>
  `;
}

function bordinSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Bordin") || {};
  const bordinSourceUrl = String(source.website_url || "").includes("orometallipreziosi.com")
    ? "https://oroemetallipreziosi.com"
    : source.website_url || "https://oroemetallipreziosi.com";
  const quoteConfigs = [
    { metal: "gold", code: "24kt" },
    { metal: "gold", code: "18kt" },
    { metal: "gold", code: "14kt" },
    { metal: "silver", code: "999" },
    { metal: "silver", code: "925" },
    { metal: "silver", code: "800" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestBordinQuote(item.metal, item.code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const conditionTexts = [...new Set(quotes.map((quote) => quote.raw_payload?.condition_text).filter(Boolean))];
  const providerTimestamp = quotes
    .map((quote) => quote.raw_payload?.provider_timestamp || quote.quote_date)
    .filter(Boolean)
    .sort((first, second) => new Date(second) - new Date(first))[0] || "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Bordin rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="bordin-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Bordin</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: <a href="${escapeHtml(bordinSourceUrl)}" target="_blank" rel="noopener">oroemetallipreziosi.com</a> · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="bordin-grid">${quoteRows}</div>
      <p>
        Ultimo sync app: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}
        ${providerTimestamp ? ` · Ultimo aggiornamento sito: ${escapeHtml(formatDateTime(providerTimestamp))}` : ""}
        ${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}
      </p>
      ${conditionTexts.length ? `<p class="gold-prediction-disclaimer">${escapeHtml(conditionTexts.join(" · "))}</p>` : `<p class="gold-prediction-disclaimer">Condizioni quantità non rilevate automaticamente.</p>`}
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-bordin-sync>Forza aggiornamento Bordin</button>` : ""}
    </article>
  `;
}

function goldStandardSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Gold Standard") || {};
  const quoteConfigs = [
    { metal: "gold", code: "24kt", type: "customer_buyback" },
    { metal: "gold", code: "18kt", type: "customer_buyback" },
    { metal: "silver", code: "925", type: "customer_buyback" },
    { metal: "silver", code: "800", type: "customer_buyback" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestGoldStandardQuote(item.metal, item.code, item.type))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => {
        const priceLabel = quote.metal === "silver"
          ? `${formatMetalPerKg(quote.price_per_kg, quote.currency || "EUR")} · ${formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR")}`
          : formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR");
        return `
          <div>
            <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
            <strong>${escapeHtml(priceLabel)}</strong>
          </div>
        `;
      }).join("")
    : `<p>Nessuna quotazione Gold Standard rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="gold-standard-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Gold Standard</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.goldstandard.gold</a>` : "https://www.goldstandard.gold"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="gold-standard-grid">${quoteRows}</div>
      <p>Ultimo sync app: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      <p class="gold-prediction-disclaimer">Gold Standard indica prezzi MIN di acquisto cliente: trattarli come benchmark operativo e verificare condizioni in negozio. Le quotazioni borsa non vengono mostrate.</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-gold-standard-sync>Forza aggiornamento Gold Standard</button>` : ""}
    </article>
  `;
}

function oroInEuroSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Oro in Euro") || {};
  const quoteConfigs = [
    { metal: "gold", code: "18kt" },
    { metal: "gold", code: "24kt" },
    { metal: "silver", code: "999" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestOroInEuroQuote(item.metal, item.code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Oro in Euro rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="oro-in-euro-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Oro in Euro</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.quotazioneritirooro.it</a>` : "https://www.quotazioneritirooro.it"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="oro-in-euro-grid">${quoteRows}</div>
      <p>Ultimo sync app: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}</p>
      <p class="gold-prediction-disclaimer">Oro in Euro pubblica valori al grammo per 750/1000, 999/1000 oro e 999/1000 argento: vengono usati come benchmark cliente, non come prezzo spot internazionale.</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-oro-in-euro-sync>Forza aggiornamento Oro in Euro</button>` : ""}
    </article>
  `;
}

function gruppoOro24kSummaryHtml() {
  const source = (state.competitorSources || []).find((item) => item.name === "Gruppo Oro 24K") || {};
  const quoteConfigs = [
    { metal: "gold", code: "24kt" },
    { metal: "gold", code: "18kt" },
    { metal: "silver", code: "999" },
    { metal: "silver", code: "800" }
  ];
  const quotes = quoteConfigs
    .map((item) => latestGruppoOro24kQuote(item.metal, item.code))
    .filter(Boolean);
  if (!source.id && !quotes.length) return "";
  const providerTimestamp = quotes
    .map((quote) => quote.raw_payload?.provider_timestamp || quote.quote_date)
    .filter(Boolean)
    .sort((first, second) => new Date(second) - new Date(first))[0] || "";
  const quoteRows = quotes.length
    ? quotes.map((quote) => `
        <div>
          <span>${escapeHtml(competitorPurityDisplay(quote))}</span>
          <strong>${escapeHtml(formatGoldPerGram(quote.price_per_gram, quote.currency || "EUR"))}</strong>
        </div>
      `).join("")
    : `<p>Nessuna quotazione Gruppo Oro 24K rilevata automaticamente. Uso ultimo dato valido se disponibile.</p>`;
  return `
    <article class="gruppo-oro-24k-card">
      <header>
        <div>
          <span>Competitor dedicato</span>
          <h5>Gruppo Oro 24K</h5>
        </div>
        <strong>${escapeHtml(competitorSourceStatusLabel(source))}</strong>
      </header>
      <p>Sito: ${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">www.comprooromilano.org</a>` : "https://www.comprooromilano.org"} · Metodo: parser automatico · Ogni 60 minuti</p>
      <div class="gruppo-oro-24k-grid">${quoteRows}</div>
      <p>
        Ultimo sync app: ${source.last_sync_at ? escapeHtml(formatDateTime(source.last_sync_at)) : "non ancora eseguito"}
        ${providerTimestamp ? ` · Ultimo aggiornamento sito: ${escapeHtml(formatDateTime(providerTimestamp))}` : ""}
        ${source.last_sync_error ? ` · ${escapeHtml(source.last_sync_error)}` : ""}
      </p>
      <p class="gold-prediction-disclaimer">Vengono usati solo ORO 24 carati, ORO 18 carati, Argento 999 e Argento 800 dal riquadro pubblico. Monete, sterline, krugerrand e valori borsa restano esclusi.</p>
      ${isFounder() ? `<button class="ghost-button" type="button" data-force-gruppo-oro-24k-sync>Forza aggiornamento Gruppo Oro 24K</button>` : ""}
    </article>
  `;
}

function competitorMarketSummaryRows() {
  return buybackRowsFor("gold", "today").concat(buybackRowsFor("silver", "today"));
}

function buybackRowsFor(metal, horizon = "today") {
  return (state.buybackCalculations || [])
    .filter((row) => row.metal === metal && (row.horizon || row.prediction_horizon) === horizon && row.scenario === state.buybackScenario)
    .sort((first, second) => Number(second.purity_value || 0) - Number(first.purity_value || 0));
}

function findBuybackRow(metal, purityCode, horizon = "today", scenario = state.buybackScenario) {
  return (state.buybackCalculations || []).find((row) => (
    row.metal === metal
    && row.purity_code === purityCode
    && (row.horizon || row.prediction_horizon) === horizon
    && row.scenario === scenario
  ));
}

function aurumHasNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function formatAurumGram(value, currency = "EUR") {
  return aurumHasNumber(value) && Number(value) > 0 ? formatGoldPerGram(value, currency) : "non disponibile";
}

function formatAurumKg(value, currency = "EUR") {
  return aurumHasNumber(value) && Number(value) > 0 ? formatMetalPerKg(value, currency) : "non disponibile";
}

function formatAurumPercent(value) {
  return aurumHasNumber(value) ? formatPredictionPercent(value) : "non disponibile";
}

function formatAurumNumber(value, digits = 2) {
  if (!aurumHasNumber(value)) return "non disponibile";
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value));
}

function latestMetalHistoryDate(metal = "") {
  const rows = state.metalPredictionHistory?.[metal] || [];
  return rows.at(-1)?.provider_timestamp || rows.at(-1)?.created_at || "";
}

function latestMetalHistorySource(metal = "") {
  const rows = state.metalPredictionHistory?.[metal] || [];
  return rows.at(-1)?.source || state.goldPredictionStatus?.status?.provider || state.goldPredictionStatus?.settings?.provider || "";
}

function buildPriceExplanationQuestion(context = {}, followup = "") {
  const metal = metalDisplayName(context.metal);
  const purity = context.purity_code ? ` ${context.purity_code}` : "";
  if (context.type === "general") {
    return "Spiega l'Analisi di mercato: situazione generale di oro e argento, scenario attivo, trend, volatilità, fonti dati, competitor e prezzo massimo pagabile.";
  }
  if (context.type === "simulator") {
    return `Spiega questo calcolo simulato per ${metal}${purity}: ${formatAurumNumber(context.grams, 2)} grammi, scenario ${context.scenario || "standard"}, massimo pagabile e prezzo consigliato.`;
  }
  if (followup === "simple") return `Spiegami in modo più semplice il prezzo ${metal}${purity} nello scenario ${context.scenario || "standard"}.`;
  if (followup === "formula") return `Mostrami la formula del prezzo ${metal}${purity}: valore teorico, costi, margine, massimo pagabile e consigliato.`;
  if (followup === "competitor") return `Confronta il prezzo ${metal}${purity} con i competitor disponibili senza inventare dati mancanti.`;
  if (followup === "risk") return `Spiegami il rischio di rialzo o ribasso per ${metal}${purity}, usando trend, volatilità, range e confidence.`;
  return `Spiega il prezzo ${metal}${purity} nello scenario ${context.scenario || "standard"} partendo dalla quotazione pura e arrivando a massimo pagabile e consigliato.`;
}

function pricePolicyFor(row = {}) {
  return (state.buybackPolicy?.policies || []).find((policy) => (
    policy.metal === row.metal && policy.purity_code === row.purity_code
  )) || {};
}

function predictionForMetal(metal = "", horizon = "today") {
  const predictionMap = metalPredictionsByKey();
  return predictionMap.get(`${metal}:${horizon}`)
    || predictionMap.get(`${metal}:today`)
    || predictionMap.get(`${metal}:24h`)
    || {};
}

function buildPriceExplanationContext(row = {}, options = {}) {
  const metal = row.metal || options.metal || "gold";
  const horizon = row.horizon || row.prediction_horizon || options.horizon || "today";
  const currency = row.currency || options.currency || state.goldPredictionStatus?.settings?.currency || "EUR";
  const purity = Number(row.purity_value || options.purity_value || 0);
  const prediction = predictionForMetal(metal, horizon);
  const policy = pricePolicyFor(row);
  const pureSpotPerGram = Number(row.spot_price_per_gram || prediction.current_price_per_gram || prediction.predicted_price_per_gram || 0);
  const predictedPure = Number(prediction.predicted_price_per_gram || prediction.current_price_per_gram || 0);
  const predictedLowPure = Number(prediction.predicted_low_per_gram || 0);
  const predictedHighPure = Number(prediction.predicted_high_per_gram || 0);
  const purityCode = row.purity_code || options.purity_code || "";
  const oroExpressQuote = latestOroExpressQuote(metal, purityCode);
  const oroDOroQuote = latestOroDOroQuote(metal, purityCode);
  const amicoOroQuote = latestAmicoOroQuote(metal, purityCode);
  const prontoGoldQuote = latestProntoGoldQuote(metal, purityCode, "customer_buyback");
  const bordinQuote = latestBordinQuote(metal, purityCode);
  const goldStandardQuote = latestGoldStandardQuote(metal, purityCode, "customer_buyback");
  const oroInEuroQuote = latestOroInEuroQuote(metal, purityCode);
  const gruppoOro24kQuote = latestGruppoOro24kQuote(metal, purityCode);
  return {
    mode: "price_explanation",
    type: options.type || "row",
    section: "quotazione",
    subsection: "analisi_predittiva_metalli",
    metal,
    metal_label: metalDisplayName(metal),
    purity_code: purityCode,
    purity_label: row.label || purityCode || "",
    purity_value: purity || null,
    scenario: row.scenario || options.scenario || state.buybackScenario || "standard",
    horizon,
    currency,
    spot_price_per_kg: pureSpotPerGram ? pureSpotPerGram * 1000 : null,
    spot_price_per_gram: pureSpotPerGram || null,
    theoretical_value_per_gram: aurumHasNumber(row.theoretical_value_per_gram) ? Number(row.theoretical_value_per_gram) : null,
    predicted_price_per_gram: predictedPure && purity ? predictedPure * purity : null,
    predicted_low_per_gram: predictedLowPure && purity ? predictedLowPure * purity : null,
    predicted_high_per_gram: predictedHighPure && purity ? predictedHighPure * purity : null,
    max_payable_per_gram: aurumHasNumber(row.max_payable_per_gram) ? Number(row.max_payable_per_gram) : null,
    recommended_payable_per_gram: aurumHasNumber(row.recommended_payable_per_gram) ? Number(row.recommended_payable_per_gram) : null,
    recoverable_value_per_gram: aurumHasNumber(row.recoverable_value_per_gram) ? Number(row.recoverable_value_per_gram) : null,
    margin_estimated_per_gram: aurumHasNumber(row.margin_estimated_per_gram) ? Number(row.margin_estimated_per_gram) : null,
    margin_estimated_pct: aurumHasNumber(row.margin_estimated_pct) ? Number(row.margin_estimated_pct) : aurumHasNumber(policy.margin_target_pct) ? Number(policy.margin_target_pct) : null,
    melting_loss_pct: aurumHasNumber(row.melting_loss_pct) ? Number(row.melting_loss_pct) : aurumHasNumber(policy.melting_loss_pct) ? Number(policy.melting_loss_pct) : null,
    refinery_spread_pct: aurumHasNumber(row.refinery_spread_pct) ? Number(row.refinery_spread_pct) : aurumHasNumber(policy.refinery_spread_pct) ? Number(policy.refinery_spread_pct) : null,
    operating_cost_per_gram: aurumHasNumber(row.operating_cost_per_gram) ? Number(row.operating_cost_per_gram) : aurumHasNumber(policy.operating_cost_per_gram) ? Number(policy.operating_cost_per_gram) : null,
    melting_cost_per_gram: aurumHasNumber(row.melting_cost_per_gram) ? Number(row.melting_cost_per_gram) : aurumHasNumber(policy.melting_cost_per_gram) ? Number(policy.melting_cost_per_gram) : null,
    risk_buffer_pct: aurumHasNumber(row.risk_buffer_pct) ? Number(row.risk_buffer_pct) : aurumHasNumber(policy.risk_buffer_pct) ? Number(policy.risk_buffer_pct) : null,
    negotiation_buffer_pct: aurumHasNumber(row.negotiation_buffer_pct) ? Number(row.negotiation_buffer_pct) : aurumHasNumber(policy.negotiation_buffer_pct) ? Number(policy.negotiation_buffer_pct) : null,
    trend: row.trend || prediction.trend || "laterale",
    volatility: row.volatility || prediction.volatility || "media",
    confidence: row.confidence || prediction.confidence || "bassa",
    competitor_avg_price: aurumHasNumber(row.competitor_avg_price) ? Number(row.competitor_avg_price) : null,
    competitor_max_price: aurumHasNumber(row.competitor_max_price) ? Number(row.competitor_max_price) : null,
    competitor_min_price: aurumHasNumber(row.competitor_min_price) ? Number(row.competitor_min_price) : null,
    competitor_median_price: aurumHasNumber(row.competitor_median_price) ? Number(row.competitor_median_price) : null,
    competitor_count: Number(row.competitor_count || 0),
    competitor_sync_status: state.competitorSyncStatus?.status?.last_status || null,
    competitor_sources_updated: Number(state.competitorSyncStatus?.sources_updated || 0),
    competitor_sources_failed: Number(state.competitorSyncStatus?.sources_failed || 0),
    competitor_valid_quotes_24h: Number(state.competitorSyncStatus?.valid_quotes_24h || 0),
    competitor_sync_last_run_at: state.competitorSyncStatus?.status?.last_run_at || null,
    competitor_sync_next_run_at: state.competitorSyncStatus?.status?.next_run_at || null,
    competitor_ai_enabled: Boolean(state.competitorAiStatus?.status?.enabled),
    competitor_ai_openai_configured: Boolean(state.competitorAiStatus?.status?.openai_configured),
    competitor_ai_running: Boolean(state.competitorAiStatus?.status?.running),
    competitor_ai_last_run_at: state.competitorAiStatus?.status?.last_run_at || state.competitorAiStatus?.latest_run?.started_at || null,
    competitor_ai_next_run_at: state.competitorAiStatus?.status?.next_run_at || null,
    competitor_ai_sources_success: Number(state.competitorAiStatus?.latest_run?.sources_success || 0),
    competitor_ai_sources_failed: Number(state.competitorAiStatus?.latest_run?.sources_failed || 0),
    competitor_ai_pages_analyzed: Number(state.competitorAiStatus?.latest_run?.pages_analyzed || 0),
    competitor_ai_quotes_saved: Number(state.competitorAiStatus?.latest_run?.quotes_saved || 0),
    competitor_ai_quotes_24h: Number(state.competitorAiStatus?.quotes_24h || state.competitorAiQuotes?.length || 0),
    competitor_ai_last_error: state.competitorAiStatus?.status?.last_error || state.competitorAiStatus?.latest_run?.error_message || "",
    competitor_failed_sources: (state.competitorSyncStatus?.sources || [])
      .filter((source) => String(source.last_sync_status || "").toLowerCase() === "failed")
      .map((source) => source.name)
      .slice(0, 5),
    best_competitor_name: row.best_competitor_name || row.competitor_reference?.competitor_name || "",
    best_competitor_price: aurumHasNumber(row.best_competitor_price) ? Number(row.best_competitor_price) : aurumHasNumber(row.competitor_reference?.price_per_gram) ? Number(row.competitor_reference.price_per_gram) : null,
    best_market_client_price_per_gram: aurumHasNumber(row.best_market_client_price_per_gram) ? Number(row.best_market_client_price_per_gram) : null,
    oro_express_quote: oroExpressQuote ? {
      metal: oroExpressQuote.metal,
      purity_code: oroExpressQuote.purity_code,
      label: competitorPurityDisplay(oroExpressQuote),
      price_per_gram: Number(oroExpressQuote.price_per_gram || 0),
      source_url: oroExpressQuote.source_url || oroExpressQuote.url || "",
      quote_date: oroExpressQuote.quote_date || null,
      evidence_text: oroExpressQuote.evidence_text || "",
      confidence: oroExpressQuote.ai_confidence || oroExpressQuote.confidence || "high"
    } : null,
    oro_doro_quote: oroDOroQuote ? {
      metal: oroDOroQuote.metal,
      purity_code: oroDOroQuote.purity_code,
      quote_type: oroDOroQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(oroDOroQuote),
      price_per_gram: Number(oroDOroQuote.price_per_gram || 0),
      price_per_kg: Number(oroDOroQuote.price_per_kg || 0),
      source_url: oroDOroQuote.source_url || oroDOroQuote.url || "",
      quote_date: oroDOroQuote.quote_date || null,
      evidence_text: oroDOroQuote.evidence_text || "",
      confidence: oroDOroQuote.ai_confidence || oroDOroQuote.confidence || "high"
    } : null,
    amico_oro_quote: amicoOroQuote ? {
      metal: amicoOroQuote.metal,
      purity_code: amicoOroQuote.purity_code,
      quote_type: amicoOroQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(amicoOroQuote),
      price_per_gram: Number(amicoOroQuote.price_per_gram || 0),
      source_url: amicoOroQuote.source_url || amicoOroQuote.url || "",
      quote_date: amicoOroQuote.quote_date || null,
      evidence_text: amicoOroQuote.evidence_text || "",
      confidence: amicoOroQuote.ai_confidence || amicoOroQuote.confidence || "high"
    } : null,
    pronto_gold_quote: prontoGoldQuote ? {
      metal: prontoGoldQuote.metal,
      purity_code: prontoGoldQuote.purity_code,
      quote_type: prontoGoldQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(prontoGoldQuote),
      price_per_gram: Number(prontoGoldQuote.price_per_gram || 0),
      price_per_kg: Number(prontoGoldQuote.price_per_kg || 0),
      source_url: prontoGoldQuote.source_url || prontoGoldQuote.url || "",
      quote_date: prontoGoldQuote.quote_date || null,
      provider_timestamp: prontoGoldQuote.raw_payload?.provider_timestamp || null,
      provider_timestamp_text: prontoGoldQuote.raw_payload?.provider_timestamp_text || "",
      price_kind: prontoGoldQuote.raw_payload?.price_kind || "",
      range_min_per_gram: prontoGoldQuote.raw_payload?.range_min_per_gram || null,
      range_max_per_gram: prontoGoldQuote.raw_payload?.range_max_per_gram || null,
      evidence_text: prontoGoldQuote.evidence_text || "",
      confidence: prontoGoldQuote.ai_confidence || prontoGoldQuote.confidence || "high"
    } : null,
    bordin_quote: bordinQuote ? {
      metal: bordinQuote.metal,
      purity_code: bordinQuote.purity_code,
      quote_type: bordinQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(bordinQuote),
      price_per_gram: Number(bordinQuote.price_per_gram || 0),
      price_per_kg: Number(bordinQuote.price_per_kg || 0),
      source_url: bordinQuote.source_url || bordinQuote.url || "",
      quote_date: bordinQuote.quote_date || null,
      provider_timestamp: bordinQuote.raw_payload?.provider_timestamp || null,
      condition_text: bordinQuote.raw_payload?.condition_text || "",
      min_quantity_grams: bordinQuote.raw_payload?.min_quantity_grams || null,
      evidence_text: bordinQuote.evidence_text || "",
      confidence: bordinQuote.ai_confidence || bordinQuote.confidence || "high"
    } : null,
    gold_standard_quote: goldStandardQuote ? {
      metal: goldStandardQuote.metal,
      purity_code: goldStandardQuote.purity_code,
      quote_type: goldStandardQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(goldStandardQuote),
      price_per_gram: Number(goldStandardQuote.price_per_gram || 0),
      price_per_kg: Number(goldStandardQuote.price_per_kg || 0),
      source_url: goldStandardQuote.source_url || goldStandardQuote.url || "",
      quote_date: goldStandardQuote.quote_date || null,
      price_kind: goldStandardQuote.raw_payload?.price_kind || "",
      evidence_text: goldStandardQuote.evidence_text || "",
      confidence: goldStandardQuote.ai_confidence || goldStandardQuote.confidence || "high"
    } : null,
    oro_in_euro_quote: oroInEuroQuote ? {
      metal: oroInEuroQuote.metal,
      purity_code: oroInEuroQuote.purity_code,
      quote_type: oroInEuroQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(oroInEuroQuote),
      price_per_gram: Number(oroInEuroQuote.price_per_gram || 0),
      price_per_kg: Number(oroInEuroQuote.price_per_kg || 0),
      source_url: oroInEuroQuote.source_url || oroInEuroQuote.url || "",
      quote_date: oroInEuroQuote.quote_date || null,
      fineness_per_mille: oroInEuroQuote.raw_payload?.fineness_per_mille || null,
      evidence_text: oroInEuroQuote.evidence_text || "",
      confidence: oroInEuroQuote.ai_confidence || oroInEuroQuote.confidence || "high"
    } : null,
    gruppo_oro_24k_quote: gruppoOro24kQuote ? {
      metal: gruppoOro24kQuote.metal,
      purity_code: gruppoOro24kQuote.purity_code,
      quote_type: gruppoOro24kQuote.quote_type || "customer_buyback",
      label: competitorPurityDisplay(gruppoOro24kQuote),
      price_per_gram: Number(gruppoOro24kQuote.price_per_gram || 0),
      price_per_kg: Number(gruppoOro24kQuote.price_per_kg || 0),
      source_url: gruppoOro24kQuote.source_url || gruppoOro24kQuote.url || "",
      quote_date: gruppoOro24kQuote.quote_date || null,
      provider_timestamp: gruppoOro24kQuote.raw_payload?.provider_timestamp || null,
      fineness_per_mille: gruppoOro24kQuote.raw_payload?.fineness_per_mille || null,
      evidence_text: gruppoOro24kQuote.evidence_text || "",
      confidence: gruppoOro24kQuote.ai_confidence || gruppoOro24kQuote.confidence || "high"
    } : null,
    market_comparison_status: row.market_comparison_status || "",
    market_price_reason: row.market_price_reason || "",
    safe_to_offer: row.safe_to_offer,
    requires_founder_approval: row.requires_founder_approval,
    difference_vs_avg: aurumHasNumber(row.difference_vs_avg) ? Number(row.difference_vs_avg) : null,
    difference_vs_max: aurumHasNumber(row.difference_vs_max) ? Number(row.difference_vs_max) : null,
    difference_vs_market_best: aurumHasNumber(row.difference_vs_market_best) ? Number(row.difference_vs_market_best) : null,
    last_update: row.created_at || prediction.created_at || latestMetalHistoryDate(metal) || null,
    source: row.source || prediction.source || latestMetalHistorySource(metal) || "fallback",
    model_features: prediction.features || row.features || {},
    ai_quote_type: row.quote_type || null,
    ai_confidence: row.ai_confidence || null,
    evidence_text: row.evidence_text || null,
    source_url: row.source_url || row.url || null,
    grams: aurumHasNumber(options.grams) ? Number(options.grams) : null,
    theoretical_total: aurumHasNumber(options.grams) && aurumHasNumber(row.theoretical_value_per_gram) ? Number(options.grams) * Number(row.theoretical_value_per_gram) : null,
    max_payable_total: aurumHasNumber(options.grams) && aurumHasNumber(row.max_payable_per_gram) ? Number(options.grams) * Number(row.max_payable_per_gram) : null,
    recommended_total: aurumHasNumber(options.grams) && aurumHasNumber(row.recommended_payable_per_gram) ? Number(options.grams) * Number(row.recommended_payable_per_gram) : null,
    best_market_total: aurumHasNumber(options.grams) && aurumHasNumber(row.best_market_client_price_per_gram) ? Number(options.grams) * Number(row.best_market_client_price_per_gram) : null,
    best_competitor_total: aurumHasNumber(options.grams) && aurumHasNumber(row.best_competitor_price) ? Number(options.grams) * Number(row.best_competitor_price) : null,
    margin_total: aurumHasNumber(options.grams) && aurumHasNumber(row.margin_estimated_per_gram) ? Number(options.grams) * Number(row.margin_estimated_per_gram) : null,
    recoverable_total: aurumHasNumber(options.grams) && aurumHasNumber(row.recoverable_value_per_gram) ? Number(options.grams) * Number(row.recoverable_value_per_gram) : null
  };
}

function buildGeneralPriceExplanationContext() {
  const gold = findBuybackRow("gold", "18kt", "today", state.buybackScenario) || buybackRowsFor("gold", "today")[0] || {};
  const silver = findBuybackRow("silver", "925", "today", state.buybackScenario) || buybackRowsFor("silver", "today")[0] || {};
  const status = state.goldPredictionStatus?.status || {};
  const syncStatus = state.competitorSyncStatus?.status || {};
  const failedSources = (state.competitorSyncStatus?.sources || [])
    .filter((source) => String(source.last_sync_status || "").toLowerCase() === "failed")
    .map((source) => source.name)
    .slice(0, 5);
  const buybackCompetitorQuotes = (state.competitorQuotes || []).filter(isCompetitorBuybackQuote);
  return {
    mode: "price_explanation",
    type: "general",
    section: "quotazione",
    subsection: "analisi_predittiva_metalli",
    scenario: state.buybackScenario || "standard",
    source: status.provider_label || status.provider || latestMetalHistorySource("gold") || latestMetalHistorySource("silver") || "fallback",
    provider_configured: Boolean(status.configured),
    last_update: [latestMetalHistoryDate("gold"), latestMetalHistoryDate("silver")].filter(Boolean).sort().at(-1) || null,
    warning: state.goldPredictionStatus?.warning || state.goldPredictionStatus?.historyWarning || "",
    competitor_count: Number(buybackCompetitorQuotes.length || 0),
    competitor_sync_status: syncStatus.last_status || null,
    competitor_sync_enabled: Boolean(syncStatus.enabled),
    competitor_sync_running: Boolean(syncStatus.running),
    competitor_sources_total: Number(state.competitorSyncStatus?.sources_total || state.competitorSources?.length || 0),
    competitor_sources_updated: Number(state.competitorSyncStatus?.sources_updated || 0),
    competitor_sources_failed: Number(state.competitorSyncStatus?.sources_failed || 0),
    competitor_valid_quotes_24h: Number(state.competitorSyncStatus?.valid_quotes_24h || 0),
    competitor_sync_last_run_at: syncStatus.last_run_at || null,
    competitor_sync_next_run_at: syncStatus.next_run_at || null,
    competitor_sync_last_error: syncStatus.last_error || "",
    competitor_failed_sources: failedSources,
    competitor_ai_enabled: Boolean(state.competitorAiStatus?.status?.enabled),
    competitor_ai_openai_configured: Boolean(state.competitorAiStatus?.status?.openai_configured),
    competitor_ai_running: Boolean(state.competitorAiStatus?.status?.running),
    competitor_ai_last_run_at: state.competitorAiStatus?.status?.last_run_at || state.competitorAiStatus?.latest_run?.started_at || null,
    competitor_ai_next_run_at: state.competitorAiStatus?.status?.next_run_at || null,
    competitor_ai_sources_success: Number(state.competitorAiStatus?.latest_run?.sources_success || 0),
    competitor_ai_sources_failed: Number(state.competitorAiStatus?.latest_run?.sources_failed || 0),
    competitor_ai_pages_analyzed: Number(state.competitorAiStatus?.latest_run?.pages_analyzed || 0),
    competitor_ai_quotes_saved: Number(state.competitorAiStatus?.latest_run?.quotes_saved || 0),
    competitor_ai_quotes_24h: Number(state.competitorAiStatus?.quotes_24h || state.competitorAiQuotes?.length || 0),
    competitor_ai_last_error: state.competitorAiStatus?.status?.last_error || state.competitorAiStatus?.latest_run?.error_message || "",
    competitor_extraction_rules_total: Number(state.competitorExtractionRules?.length || 0),
    competitor_extraction_rules_found: Number((state.competitorExtractionRules || []).filter((rule) => String(rule.last_test_status || "").toLowerCase() === "found").length),
    competitor_extraction_rules_not_found: Number((state.competitorExtractionRules || []).filter((rule) => ["not_found", "failed", "error"].includes(String(rule.last_test_status || "").toLowerCase())).length),
    competitor_extraction_sources_configured: Number(new Set((state.competitorExtractionRules || []).map((rule) => rule.source_id).filter(Boolean)).size),
    oro_express_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Oro Express")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 4)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        price_per_gram: Number(quote.price_per_gram || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        evidence_text: quote.evidence_text || ""
      })),
    oro_doro_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Oro D'Oro" || String(quote.competitor_name || "").toLowerCase() === "oro d'oro")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 10)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        price_per_gram: Number(quote.price_per_gram || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        evidence_text: quote.evidence_text || ""
      })),
    amico_oro_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Amico Oro")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 6)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        price_per_gram: Number(quote.price_per_gram || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        evidence_text: quote.evidence_text || ""
      })),
    pronto_gold_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Pronto Gold")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 11)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        quote_type: quote.quote_type || "customer_buyback",
        price_per_gram: Number(quote.price_per_gram || 0),
        price_per_kg: Number(quote.price_per_kg || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        provider_timestamp: quote.raw_payload?.provider_timestamp || null,
        price_kind: quote.raw_payload?.price_kind || "",
        range_min_per_gram: quote.raw_payload?.range_min_per_gram || null,
        range_max_per_gram: quote.raw_payload?.range_max_per_gram || null,
        evidence_text: quote.evidence_text || ""
      })),
    bordin_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Bordin")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 6)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        price_per_gram: Number(quote.price_per_gram || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        condition_text: quote.raw_payload?.condition_text || "",
        min_quantity_grams: quote.raw_payload?.min_quantity_grams || null,
        evidence_text: quote.evidence_text || ""
      })),
    gold_standard_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Gold Standard")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 6)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        quote_type: quote.quote_type || "customer_buyback",
        price_per_gram: Number(quote.price_per_gram || 0),
        price_per_kg: Number(quote.price_per_kg || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        price_kind: quote.raw_payload?.price_kind || "",
        evidence_text: quote.evidence_text || ""
      })),
    oro_in_euro_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Oro in Euro")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 3)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        quote_type: quote.quote_type || "customer_buyback",
        price_per_gram: Number(quote.price_per_gram || 0),
        price_per_kg: Number(quote.price_per_kg || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        fineness_per_mille: quote.raw_payload?.fineness_per_mille || null,
        evidence_text: quote.evidence_text || ""
      })),
    gruppo_oro_24k_quotes: buybackCompetitorQuotes
      .filter((quote) => quote.competitor_name === "Gruppo Oro 24K")
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0))
      .slice(0, 4)
      .map((quote) => ({
        label: competitorPurityDisplay(quote),
        quote_type: quote.quote_type || "customer_buyback",
        price_per_gram: Number(quote.price_per_gram || 0),
        price_per_kg: Number(quote.price_per_kg || 0),
        source_url: quote.source_url || quote.url || "",
        quote_date: quote.quote_date || null,
        provider_timestamp: quote.raw_payload?.provider_timestamp || null,
        fineness_per_mille: quote.raw_payload?.fineness_per_mille || null,
        evidence_text: quote.evidence_text || ""
      })),
    gold: buildPriceExplanationContext(gold, { type: "summary", metal: "gold", purity_code: gold.purity_code || "18kt" }),
    silver: buildPriceExplanationContext(silver, { type: "summary", metal: "silver", purity_code: silver.purity_code || "925" })
  };
}

function trendExplanation(context = {}) {
  const trend = String(context.trend || "laterale").toLowerCase();
  const volatility = String(context.volatility || "media").toLowerCase();
  const confidence = String(context.confidence || "bassa").toLowerCase();
  const featureText = context.model_features && Object.keys(context.model_features).length
    ? ` I dati modello disponibili includono: ${Object.entries(context.model_features).slice(0, 4).map(([key, value]) => `${key}=${value}`).join(", ")}.`
    : "";
  const volatilityText = volatility === "alta"
    ? "La volatilità è alta, quindi il range previsto si allarga e conviene usare più prudenza."
    : volatility === "bassa"
      ? "La volatilità è bassa, quindi il range previsto è più contenuto."
      : "La volatilità è media, quindi il prezzo può muoversi ma senza un segnale estremo.";
  if (trend.includes("rial")) {
    return `Il sistema legge un trend rialzista: le medie o la regressione recente indicano una possibile spinta verso l'alto.${featureText} ${volatilityText} La confidence indicata è ${confidence}.`;
  }
  if (trend.includes("rib")) {
    return `Il sistema legge un trend ribassista: le medie brevi o il prezzo recente risultano più deboli rispetto al riferimento lungo.${featureText} ${volatilityText} La confidence indicata è ${confidence}.`;
  }
  return `Il sistema legge una fase laterale: le medie sono vicine o la variazione recente è contenuta.${featureText} ${volatilityText} La confidence indicata è ${confidence}.`;
}

function competitorExplanation(context = {}) {
  const syncParts = [];
  if (context.competitor_sync_last_run_at) syncParts.push(`ultimo auto aggiornamento ${formatDateTime(context.competitor_sync_last_run_at)}`);
  if (Number(context.competitor_sources_updated || 0)) syncParts.push(`${context.competitor_sources_updated} fonti aggiornate`);
  if (Number(context.competitor_sources_failed || 0)) syncParts.push(`${context.competitor_sources_failed} fonti fallite`);
  if (context.competitor_failed_sources?.length) syncParts.push(`fonti da verificare: ${context.competitor_failed_sources.join(", ")}`);
  const syncText = syncParts.length ? ` Stato auto sync: ${syncParts.join("; ")}.` : "";
  const aiParts = [];
  if (context.competitor_ai_last_run_at) aiParts.push(`ultima analisi AI ${formatDateTime(context.competitor_ai_last_run_at)}`);
  if (Number(context.competitor_ai_pages_analyzed || 0)) aiParts.push(`${context.competitor_ai_pages_analyzed} pagine analizzate`);
  if (Number(context.competitor_ai_quotes_24h || context.competitor_ai_quotes_saved || 0)) aiParts.push(`${context.competitor_ai_quotes_24h || context.competitor_ai_quotes_saved} quotazioni AI valide/recenti`);
  if (Number(context.competitor_ai_sources_failed || 0)) aiParts.push(`${context.competitor_ai_sources_failed} fonti senza dati o fallite`);
  if (context.competitor_ai_last_error) aiParts.push(`ultimo errore AI: ${context.competitor_ai_last_error}`);
  const aiText = aiParts.length
    ? ` Analisi AI: ${aiParts.join("; ")}.`
    : ` Analisi AI: ${context.competitor_ai_enabled ? "attiva ma senza quotazioni cliente valide ancora disponibili" : "non disponibile o disattiva"}.`;
  if (!Number(context.competitor_count || 0)) {
    return `Confronto competitor: non ci sono rilevazioni competitor disponibili per questa voce. Aurum non inventa prezzi esterni: serve inserimento manuale, CSV, fonte configurata o analisi AI con prova testuale.${syncText}${aiText}`;
  }
  const currency = context.currency || "EUR";
  const recommended = Number(context.recommended_payable_per_gram || 0);
  const avg = Number(context.competitor_avg_price || 0);
  const max = Number(context.competitor_max_price || 0);
  const bestMarket = Number(context.best_market_client_price_per_gram || 0);
  const bestName = context.best_competitor_name || "miglior competitor rilevato";
  const bestPrice = Number(context.best_competitor_price || max || 0);
  const deltaAvg = recommended && avg ? recommended - avg : null;
  const deltaText = deltaAvg === null
    ? ""
    : deltaAvg >= 0
      ? ` Il consigliato OroActive è sopra la media competitor di ${formatAurumGram(deltaAvg, currency)}.`
      : ` Il consigliato OroActive è sotto la media competitor di ${formatAurumGram(Math.abs(deltaAvg), currency)}.`;
  const marketText = bestMarket
    ? ` Il prezzo migliore di mercato sostenibile è ${formatAurumGram(bestMarket, currency)}: ${context.market_price_reason || marketStatusLabel(context.market_comparison_status)}.`
    : "";
  const approvalText = context.requires_founder_approval ? " Serve attenzione: per superare il limite sostenibile è richiesta approvazione Founder." : "";
  const oroExpress = context.oro_express_quote;
  const oroExpressText = oroExpress
    ? ` Oro Express è stato aggiornato ${oroExpress.quote_date ? `il ${formatDateTime(oroExpress.quote_date)}` : "automaticamente"}: ${oroExpress.label || context.purity_code} a ${formatAurumGram(oroExpress.price_per_gram, currency)}. ${Number(context.max_payable_per_gram || 0) && Number(oroExpress.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: non è consigliato superarlo senza autorizzazione." : "Rientra nel confronto con il massimo pagabile e il prezzo consigliato OroActive."}`
    : "";
  const oroDOro = context.oro_doro_quote;
  const oroDOroText = oroDOro
    ? ` Oro D'Oro è stato aggiornato ${oroDOro.quote_date ? `il ${formatDateTime(oroDOro.quote_date)}` : "automaticamente"}: ${oroDOro.label || context.purity_code} a ${formatAurumGram(oroDOro.price_per_gram, currency)}. ${Number(context.max_payable_per_gram || 0) && Number(oroDOro.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: inseguirlo ridurrebbe il margine sotto policy senza autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  const amicoOro = context.amico_oro_quote;
  const amicoOroText = amicoOro
    ? ` Amico Oro è stato aggiornato ${amicoOro.quote_date ? `il ${formatDateTime(amicoOro.quote_date)}` : "automaticamente"}: ${amicoOro.label || context.purity_code} a ${formatAurumGram(amicoOro.price_per_gram, currency)}. ${Number(context.max_payable_per_gram || 0) && Number(amicoOro.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: non è consigliato superarlo senza autorizzazione." : "Rientra nel confronto con il massimo pagabile e il prezzo consigliato OroActive."}`
    : "";
  const prontoGold = context.pronto_gold_quote;
  const prontoGoldRange = prontoGold?.price_kind === "range" && Number(prontoGold.range_min_per_gram || 0) && Number(prontoGold.range_max_per_gram || 0)
    ? ` Il valore 18k è un range da ${formatAurumGram(prontoGold.range_min_per_gram, currency)} a ${formatAurumGram(prontoGold.range_max_per_gram, currency)}; per il confronto viene usato il massimo pubblicato.`
    : "";
  const prontoGoldText = prontoGold
    ? ` Pronto Gold è stato aggiornato ${prontoGold.provider_timestamp ? `dal sito il ${formatDateTime(prontoGold.provider_timestamp)}` : prontoGold.quote_date ? `il ${formatDateTime(prontoGold.quote_date)}` : "automaticamente"}: ${prontoGold.label || context.purity_code} a ${formatAurumGram(prontoGold.price_per_gram, currency)}.${prontoGoldRange} ${Number(context.max_payable_per_gram || 0) && Number(prontoGold.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: inseguirlo ridurrebbe il margine sotto policy senza autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  const bordin = context.bordin_quote;
  const bordinText = bordin
    ? ` Bordin è stato aggiornato ${bordin.provider_timestamp ? `dal sito il ${formatDateTime(bordin.provider_timestamp)}` : bordin.quote_date ? `il ${formatDateTime(bordin.quote_date)}` : "automaticamente"}: ${bordin.label || context.purity_code} a ${formatAurumGram(bordin.price_per_gram, currency)}.${bordin.condition_text ? ` Nota Bordin: ${bordin.condition_text}` : ""} ${Number(context.max_payable_per_gram || 0) && Number(bordin.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: avvicinarsi a quel prezzo ridurrebbe il margine sotto policy senza autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  const goldStandard = context.gold_standard_quote;
  const goldStandardText = goldStandard
    ? ` Gold Standard è stato aggiornato ${goldStandard.quote_date ? `il ${formatDateTime(goldStandard.quote_date)}` : "automaticamente"}: ${goldStandard.label || context.purity_code} a ${formatAurumGram(goldStandard.price_per_gram, currency)}. ${goldStandard.price_kind === "min_price" ? "Questo è un prezzo MIN di acquisto cliente, utile come benchmark ma da verificare con le condizioni in negozio." : ""} ${Number(context.max_payable_per_gram || 0) && Number(goldStandard.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: avvicinarsi a quel prezzo ridurrebbe il margine sotto policy senza autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  const oroInEuro = context.oro_in_euro_quote;
  const oroInEuroText = oroInEuro
    ? ` Oro in Euro è stato aggiornato ${oroInEuro.quote_date ? `il ${formatDateTime(oroInEuro.quote_date)}` : "automaticamente"}: ${oroInEuro.label || context.purity_code} a ${formatAurumGram(oroInEuro.price_per_gram, currency)}. ${oroInEuro.fineness_per_mille ? `Finezza pubblicata: ${oroInEuro.fineness_per_mille}/1000.` : ""} ${Number(context.max_payable_per_gram || 0) && Number(oroInEuro.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: avvicinarsi a quel prezzo richiede verifica del margine o autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  const gruppoOro24k = context.gruppo_oro_24k_quote;
  const gruppoOro24kText = gruppoOro24k
    ? ` Gruppo Oro 24K è stato aggiornato ${gruppoOro24k.provider_timestamp ? `dal sito il ${formatDateTime(gruppoOro24k.provider_timestamp)}` : gruppoOro24k.quote_date ? `il ${formatDateTime(gruppoOro24k.quote_date)}` : "automaticamente"}: ${gruppoOro24k.label || context.purity_code} a ${formatAurumGram(gruppoOro24k.price_per_gram, currency)}. Sono escluse monete e quotazioni borsa. ${Number(context.max_payable_per_gram || 0) && Number(gruppoOro24k.price_per_gram || 0) > Number(context.max_payable_per_gram) ? "Risulta sopra il massimo pagabile OroActive: avvicinarsi a quel prezzo richiede verifica del margine o autorizzazione." : "Rientra nel confronto con massimo pagabile e prezzo consigliato OroActive."}`
    : "";
  return `Confronto competitor: ${context.competitor_count} rilevazioni. Media ${formatAurumGram(avg, currency)}, minimo ${formatAurumGram(context.competitor_min_price, currency)}, massimo ${formatAurumGram(max, currency)}. Miglior competitor: ${bestName} a ${formatAurumGram(bestPrice, currency)}.${deltaText}${marketText}${approvalText}${oroExpressText}${oroDOroText}${amicoOroText}${prontoGoldText}${bordinText}${goldStandardText}${oroInEuroText}${gruppoOro24kText}${syncText}${aiText}`;
}

function formulaExplanation(context = {}) {
  const currency = context.currency || "EUR";
  const costs = [
    `perdita fusione ${formatAurumPercent(context.melting_loss_pct)}`,
    `spread raffineria ${formatAurumPercent(context.refinery_spread_pct)}`,
    `costo operativo ${formatAurumGram(context.operating_cost_per_gram, currency)}`,
    `costo fonderia ${formatAurumGram(context.melting_cost_per_gram, currency)}`,
    `buffer rischio ${formatAurumPercent(context.risk_buffer_pct)}`,
    `buffer trattativa ${formatAurumPercent(context.negotiation_buffer_pct)}`,
    `margine target ${formatAurumPercent(context.margin_estimated_pct)}`
  ].join("; ");
  return `Formula sintetica: prezzo puro €/g × purezza = valore teorico. Poi si considera il rientro netto togliendo fonderia, perdita, spread e costi. Da quel netto si applica il margine target per ottenere il massimo pagabile, poi il buffer rischio/trattativa per arrivare al prezzo consigliato. Parametri disponibili: ${costs}.`;
}

function generateGeneralPriceExplanation(context = {}) {
  const gold = context.gold || {};
  const silver = context.silver || {};
  const competitorSync = context.competitor_sync_last_run_at
    ? `Auto aggiornamento competitor: ${context.competitor_sync_status || "stato non disponibile"}, ultimo run ${formatDateTime(context.competitor_sync_last_run_at)}${context.competitor_sync_next_run_at ? `, prossimo run ${formatDateTime(context.competitor_sync_next_run_at)}` : ""}. Fonti aggiornate: ${context.competitor_sources_updated || 0}/${context.competitor_sources_total || 0}; fonti fallite: ${context.competitor_sources_failed || 0}; prezzi validi 24h: ${context.competitor_valid_quotes_24h || 0}.`
    : `Auto aggiornamento competitor: ${context.competitor_sync_enabled ? "attivo" : "non disponibile o disattivo"}.`;
  const competitorAi = context.competitor_ai_last_run_at
    ? `Analisi AI competitor: ultimo run ${formatDateTime(context.competitor_ai_last_run_at)}${context.competitor_ai_next_run_at ? `, prossimo run ${formatDateTime(context.competitor_ai_next_run_at)}` : ""}. Pagine analizzate: ${context.competitor_ai_pages_analyzed || 0}; quotazioni AI recenti: ${context.competitor_ai_quotes_24h || 0}; fonti fallite o senza dati: ${context.competitor_ai_sources_failed || 0}.`
    : `Analisi AI competitor: ${context.competitor_ai_enabled ? "attiva, ma senza un run completato disponibile" : "non disponibile o disattiva"}${context.competitor_ai_openai_configured ? "" : " e modello AI backend non configurato"}.`;
  const extractionRules = Number(context.competitor_extraction_rules_total || 0)
    ? `Trainer estrazione: ${context.competitor_extraction_rules_total} regole configurate su ${context.competitor_extraction_sources_configured || 0} fonti; ${context.competitor_extraction_rules_found || 0} rilevate negli ultimi test e ${context.competitor_extraction_rules_not_found || 0} non rilevate o da correggere.`
    : "Trainer estrazione: nessuna regola guidata configurata; il Founder puo aggiungerla nella tab Configura estrazione.";
  return `Spiegazione generale Analisi di mercato

Scenario attivo
Lo scenario operativo selezionato è ${context.scenario || "standard"}${context.last_update ? `, con ultimo aggiornamento ${formatDateTime(context.last_update)}` : ""}.

Oro
Per l'oro il riferimento operativo è ${gold.purity_code || "18kt"}: valore teorico ${formatAurumGram(gold.theoretical_value_per_gram, gold.currency)}, massimo pagabile ${formatAurumGram(gold.max_payable_per_gram, gold.currency)}, consigliato ${formatAurumGram(gold.recommended_payable_per_gram, gold.currency)}. ${trendExplanation(gold)}

Argento
Per l'argento il riferimento operativo è ${silver.purity_code || "925"}: valore teorico ${formatAurumGram(silver.theoretical_value_per_gram, silver.currency)}, massimo pagabile ${formatAurumGram(silver.max_payable_per_gram, silver.currency)}, consigliato ${formatAurumGram(silver.recommended_payable_per_gram, silver.currency)}. ${trendExplanation(silver)}

Competitor e fonti
${Number(context.competitor_count || 0) ? `Sono presenti ${context.competitor_count} rilevazioni competitor aggregate.` : "Nessun competitor configurato: il confronto esterno non viene inventato."} ${competitorSync} ${competitorAi} ${extractionRules} ${context.competitor_sync_last_error ? `Ultimo errore sync: ${context.competitor_sync_last_error}.` : ""} ${context.competitor_ai_last_error ? `Ultimo errore AI: ${context.competitor_ai_last_error}.` : ""} ${context.warning ? `Nota dati: ${context.warning}` : ""}
${context.oro_express_quotes?.length ? `Oro Express rilevato: ${context.oro_express_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Oro Express non ha ancora quotazioni recenti salvate nel confronto."}
${context.oro_doro_quotes?.length ? `Oro D'Oro rilevato: ${context.oro_doro_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Oro D'Oro non ha ancora quotazioni recenti salvate nel confronto."}
${context.amico_oro_quotes?.length ? `Amico Oro rilevato: ${context.amico_oro_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Amico Oro non ha ancora quotazioni recenti salvate nel confronto."}
${context.pronto_gold_quotes?.length ? `Pronto Gold rilevato: ${context.pronto_gold_quotes.map((quote) => `${quote.label} ${quote.price_kind === "range" && quote.range_min_per_gram && quote.range_max_per_gram ? `da ${formatAurumGram(quote.range_min_per_gram, "EUR")} a ${formatAurumGram(quote.range_max_per_gram, "EUR")}` : formatAurumGram(quote.price_per_gram, "EUR")}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Pronto Gold non ha ancora quotazioni di acquisto cliente recenti salvate nel confronto."}
${context.bordin_quotes?.length ? `Bordin rilevato: ${context.bordin_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}${quote.condition_text ? ` - ${quote.condition_text}` : ""}`).join("; ")}.` : "Bordin non ha ancora quotazioni recenti salvate nel confronto."}
${context.gold_standard_quotes?.length ? `Gold Standard rilevato: ${context.gold_standard_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.price_kind === "min_price" ? " (prezzo MIN cliente)" : ""}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Gold Standard non ha ancora quotazioni di acquisto cliente recenti salvate nel confronto."}
${context.oro_in_euro_quotes?.length ? `Oro in Euro rilevato: ${context.oro_in_euro_quotes.map((quote) => `${quote.label} ${formatAurumGram(quote.price_per_gram, "EUR")}${quote.fineness_per_mille ? ` (${quote.fineness_per_mille}/1000)` : ""}${quote.quote_date ? ` (${formatDateTime(quote.quote_date)})` : ""}`).join("; ")}.` : "Oro in Euro non ha ancora quotazioni recenti salvate nel confronto."}

Avviso finale
Questa è una stima operativa e non una garanzia di prezzo. Il prezzo finale resta definito dalle policy OroActive e dall'operatore autorizzato.`;
}

function generateLocalPriceExplanation(context = {}, options = {}) {
  if (context.type === "general" && options.followup === "formula") {
    return `Formula generale Analisi di mercato

Per ogni riga OroActive parte dal prezzo puro al grammo, applica la purezza della caratura o del titolo, calcola il valore teorico e poi considera perdita fusione, spread raffineria, costi operativi, costi fonderia, buffer rischio, buffer trattativa e margine target.

Oro: il riferimento puro viene convertito da €/kg a €/g e poi moltiplicato per kt/24. Esempio: 18kt = 18/24 = 0,75.

Argento: il riferimento puro viene convertito da €/kg a €/g e poi moltiplicato per titolo/1000. Esempio: 925 = 0,925.

Il massimo pagabile è la soglia che tutela il margine configurato. Il prezzo consigliato resta più prudente perché include spazio per trattativa, volatilità e rischio operativo.`;
  }
  if (context.type === "general" && options.followup === "competitor") {
    return Number(context.competitor_count || 0)
      ? `Confronto competitor generale: sono presenti ${context.competitor_count} rilevazioni aggregate. Apri una riga specifica Oro o Argento e usa “Spiega” per confrontare media, miglior competitor, massimo pagabile e prezzo migliore di mercato sostenibile di quella caratura o titolo.`
      : "Confronto competitor generale: non ci sono ancora competitor configurati. Aurum non inventa prezzi esterni: inserisci rilevazioni manuali, CSV o fonti autorizzate per ottenere il confronto.";
  }
  if (context.type === "general" && options.followup === "risk") {
    return `Rischio di fluttuazione generale

Oro: ${trendExplanation(context.gold || {})}

Argento: ${trendExplanation(context.silver || {})}

Se lo storico è insufficiente o la fonte non è configurata, la confidence resta bassa e lo scenario prudente è più adatto.`;
  }
  if (context.type === "general") return generateGeneralPriceExplanation(context);
  if (options.followup === "competitor") return competitorExplanation(context);
  if (options.followup === "formula") return formulaExplanation(context);
  if (options.followup === "risk") return trendExplanation(context);
  const currency = context.currency || "EUR";
  const metal = context.metal_label || metalDisplayName(context.metal);
  const purity = context.purity_label || context.purity_code || "";
  const purityFormula = context.metal === "silver"
    ? `${context.purity_code || "titolo"} / 1000 = ${formatAurumNumber(context.purity_value, 3)}`
    : `${String(context.purity_code || "").replace(/kt/i, "") || "kt"} / 24 = ${formatAurumNumber(context.purity_value, 3)}`;
  const simulatorText = context.type === "simulator" && aurumHasNumber(context.grams)
    ? `\n\nSimulatore: calcolo visualizzato\nPer ${formatAurumNumber(context.grams, 2)} grammi il valore teorico totale è ${formatEuro(context.displayed_values?.theoretical_total ?? context.theoretical_total)}.\nMassimo pagabile totale: ${formatEuro(context.displayed_values?.max_payable_total ?? context.max_payable_total)}.\nPrezzo consigliato totale: ${formatEuro(context.displayed_values?.recommended_total ?? context.recommended_total)}.\nMiglior prezzo mercato stimato: ${formatEuro(context.displayed_values?.best_market_total ?? context.best_market_total)}.\nMargine stimato totale: ${formatEuro(context.displayed_values?.margin_total ?? context.margin_total)}.\nMargine residuo sul mercato: ${formatEuro(context.displayed_values?.residual_margin_total ?? context.residual_margin_total)}.\nRientro previsto totale: ${formatEuro(context.displayed_values?.recoverable_total ?? context.recoverable_total)}.${context.best_competitor_total ? `\nMiglior competitor rilevato: ${formatEuro(context.displayed_values?.best_competitor_total ?? context.best_competitor_total)}.` : ""}${context.displayed_values?.competitor_avg_price ? `\nCompetitor medio: ${formatAurumGram(context.displayed_values.competitor_avg_price, currency)}.` : ""}`
    : "";
  return `Spiegazione prezzo ${metal} ${purity} — Scenario ${context.scenario || "standard"}

Punto di partenza
Il calcolo parte dal prezzo puro di borsa: ${formatAurumKg(context.spot_price_per_kg, currency)}, cioè ${formatAurumGram(context.spot_price_per_gram, currency)}.

Calcolo purezza
La purezza usata è ${purityFormula}. Se questo dato manca o lo storico è insufficiente, la stima diventa meno affidabile.

Valore teorico
${formatAurumGram(context.spot_price_per_gram, currency)} × ${formatAurumNumber(context.purity_value, 3)} = ${formatAurumGram(context.theoretical_value_per_gram, currency)}. Questo è il valore teorico del metallo prima di costi e margini.

Costi e rientro compro oro
${formulaExplanation(context)}

Massimo pagabile
Il massimo pagabile è ${formatAurumGram(context.max_payable_per_gram, currency)}. È il limite oltre cui il rientro OroActive rischia di non rispettare margine, costi e policy Founder.

Prezzo consigliato
Il prezzo consigliato è ${formatAurumGram(context.recommended_payable_per_gram, currency)}. Può essere diverso dal massimo pagabile perché lascia spazio a volatilità, trattativa, rischio operativo e sicurezza di margine.

Fluttuazione prevista
Range stimato per questa voce: basso ${formatAurumGram(context.predicted_low_per_gram, currency)}, centrale ${formatAurumGram(context.predicted_price_per_gram, currency)}, alto ${formatAurumGram(context.predicted_high_per_gram, currency)}. ${trendExplanation(context)}

Confronto competitor
${competitorExplanation(context)}${simulatorText}

Avviso finale
Questa è una stima operativa e non una garanzia di prezzo. Il prezzo finale resta definito dalle policy OroActive e dall'operatore autorizzato.`;
}

async function explainPriceWithAurum(context = {}, options = {}) {
  const question = options.question || buildPriceExplanationQuestion(context, options.followup);
  openAurumPanel({ mode: "price_explanation", initialMessage: question, context });
  if (options.immediateLocal) {
    state.aurumMessages.push({
      role: "assistant",
      content: generateLocalPriceExplanation(context, options),
      source: "Spiegazione locale OroActive"
    });
    renderAurumMessages();
    if (options.skipRemote) return;
  }
  const loadingIndex = state.aurumMessages.push({ role: "assistant", content: "Sto preparando la spiegazione del prezzo..." }) - 1;
  renderAurumMessages();
  try {
    const data = await apiRequest("/ai/assistente", {
      method: "POST",
      body: JSON.stringify({
        message: question,
        mode: "price_explanation",
        interface: "aurum_price_explanation",
        section: "quotazione",
        context: {
          currentSection: "quotazione",
          currentSubSection: "analisi_predittiva_metalli",
          userRole: state.currentUser?.ruolo || "",
          storeName: state.currentUser?.negozio || "",
          priceExplanationContext: context
        }
      }),
      timeoutMs: 60000
    });
    const answer = String(data.risposta || "").trim();
    const fallbackNeeded = Boolean(data.error) || !answer || /Non ho trovato una risposta sufficiente|Questa informazione non è presente/i.test(answer);
    state.aurumMessages[loadingIndex] = {
      role: "assistant",
      content: fallbackNeeded
        ? `Aurum AI non disponibile. Ti mostro una spiegazione tecnica locale.\n\n${generateLocalPriceExplanation(context, options)}`
        : answer,
      source: fallbackNeeded ? "Spiegazione locale OroActive" : data.fonte || "Aurum"
    };
  } catch (error) {
    state.aurumMessages[loadingIndex] = {
      role: "assistant",
      content: `Aurum AI non disponibile. Ti mostro una spiegazione tecnica locale.\n\n${generateLocalPriceExplanation(context, options)}`,
      source: "Spiegazione locale OroActive"
    };
  } finally {
    renderAurumMessages();
  }
}

function handlePriceExplanationClick(event) {
  const button = event.target.closest("[data-explain-price-row]");
  if (!button) return;
  const row = findBuybackRow(
    button.dataset.metal || "gold",
    button.dataset.purityCode || "",
    button.dataset.horizon || "today",
    button.dataset.scenario || state.buybackScenario
  );
  if (!row) {
    showToast("Calcolo prezzo non disponibile. Aggiorna l'analisi metalli.", "warning");
    return;
  }
  void explainPriceWithAurum(buildPriceExplanationContext(row));
}

function renderGoldPredictionStatus() {
  if (!goldPredictionStatus) return;
  const status = state.goldPredictionStatus?.status || {};
  const warning = state.goldPredictionStatus?.warning || state.goldPredictionStatus?.historyWarning || "";
  const goldLatest = state.metalPredictionHistory?.gold?.at(-1);
  const silverLatest = state.metalPredictionHistory?.silver?.at(-1);
  const latestDate = [goldLatest?.created_at, silverLatest?.created_at].filter(Boolean).sort().at(-1);
  const configured = status.configured
    ? `${status.provider_label || "Provider"} configurato.`
    : (status.note || "Fonte prezzo non configurata. Usa Sync BullionVault o import manuale.");
  goldPredictionStatus.innerHTML = `
    <span>${escapeHtml(configured)}</span>
    <strong>${escapeHtml(latestDate ? `Ultimo aggiornamento: ${formatDateTime(latestDate)}` : "Dati prezzo non ancora salvati")}</strong>
    <strong>Scenario attivo: ${escapeHtml(state.buybackScenario)}</strong>
    <strong>Competitor: confronto integrato</strong>
    ${warning ? `<em>${escapeHtml(warning)}</em>` : ""}
  `;
}

function renderGoldPredictionCards() {
  if (!goldPredictionCards) return;
  const predictionMap = metalPredictionsByKey();
  const gold = predictionMap.get("gold:today") || predictionMap.get("gold:24h") || {};
  const silver = predictionMap.get("silver:today") || predictionMap.get("silver:24h") || {};
  const currency = gold.currency || silver.currency || state.goldPredictionStatus?.settings?.currency || "EUR";
  const sources = (state.competitorSources || []).filter((source) => !isHiddenCompetitorName(source.name));
  const quotes = (state.competitorQuotes || []).filter(isCompetitorBuybackQuote);
  const todayKey = new Date().toISOString().slice(0, 10);
  const gold18 = findBuybackRow("gold", "18kt", "today", state.buybackScenario) || {};
  const silver925 = findBuybackRow("silver", "925", "today", state.buybackScenario) || {};
  const competitiveRows = competitorMarketSummaryRows().filter((row) => ["above_market", "aligned_market"].includes(row.market_comparison_status)).length;
  const competitorTooHighRows = competitorMarketSummaryRows().filter((row) => row.market_comparison_status === "competitor_too_high").length;
  const cards = [
    { label: "Oro puro", value: formatMetalPerKg(Number(gold.current_price_per_gram || gold.predicted_price_per_gram || 0) * 1000, currency) },
    { label: "Oro puro", value: formatGoldPerGram(gold.current_price_per_gram || gold.predicted_price_per_gram, currency) },
    { label: "Argento puro", value: formatMetalPerKg(Number(silver.current_price_per_gram || silver.predicted_price_per_gram || 0) * 1000, currency) },
    { label: "Argento puro", value: formatGoldPerGram(silver.current_price_per_gram || silver.predicted_price_per_gram, currency) },
    { label: "Trend oro", value: gold.trend || "In attesa", className: goldPredictionTrendClass(gold.trend) },
    { label: "Trend argento", value: silver.trend || "In attesa", className: goldPredictionTrendClass(silver.trend) },
    { label: "Volatilità oro", value: gold.volatility || "In attesa", className: gold.volatility === "alta" ? "warning" : "" },
    { label: "Volatilità argento", value: silver.volatility || "In attesa", className: silver.volatility === "alta" ? "warning" : "" },
    { label: "Scenario", value: state.buybackScenario },
    { label: "Competitor monitorati", value: String(sources.filter((source) => source.active !== false).length) },
    { label: "Quotazioni oggi", value: String(quotes.filter((quote) => String(quote.quote_date || "").slice(0, 10) === todayKey).length) },
    { label: "Oro 18kt media competitor", value: gold18.competitor_count ? formatGoldPerGram(gold18.competitor_avg_price, currency) : "Non disponibile" },
    { label: "Argento 925 media competitor", value: silver925.competitor_count ? formatGoldPerGram(silver925.competitor_avg_price, currency) : "Non disponibile" },
    { label: "Carature competitive", value: String(competitiveRows), className: competitiveRows ? "success" : "" },
    { label: "Competitor oltre limite", value: String(competitorTooHighRows), className: competitorTooHighRows ? "warning" : "" }
  ];
  goldPredictionCards.innerHTML = cards.map((card) => `
    <article class="gold-prediction-metric ${card.className || ""}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
    </article>
  `).join("");
}

function renderGoldPredictionList() {
  if (!goldPredictionList) return;
  const predictions = metalPredictionRows();
  if (!predictions.length) {
    goldPredictionList.innerHTML = '<div class="empty-state">Nessuna previsione calcolata. Usa “Calcola prezzi” per generare una stima indicativa.</div>';
    return;
  }
  goldPredictionList.innerHTML = predictions
    .filter((prediction) => ["today", "24h", "7d", "30d"].includes(prediction.horizon || prediction.prediction_horizon))
    .map((prediction) => `
      <article class="gold-prediction-scenario ${goldPredictionTrendClass(prediction.trend)}">
        <div>
          <span>${escapeHtml(metalDisplayName(prediction.metal))} · ${escapeHtml(goldPredictionHorizonLabel(prediction.horizon || prediction.prediction_horizon))}</span>
          <strong>${escapeHtml(formatGoldPerGram(prediction.predicted_price_per_gram || prediction.current_price_per_gram, prediction.currency || "EUR"))}</strong>
        </div>
        <p>Range indicativo: ${escapeHtml(formatGoldPerGram(prediction.predicted_low_per_gram, prediction.currency || "EUR"))} - ${escapeHtml(formatGoldPerGram(prediction.predicted_high_per_gram, prediction.currency || "EUR"))}</p>
        <p>Trend ${escapeHtml(prediction.trend || "laterale")} · volatilità ${escapeHtml(prediction.volatility || "media")} · confidence ${escapeHtml(prediction.confidence || "bassa")}</p>
      </article>
    `).join("");
}

function buybackTableHtml(title, metal) {
  const rows = buybackRowsFor(metal, "today");
  if (!rows.length) return `<div class="empty-state">Calcolo ${escapeHtml(title)} non ancora disponibile.</div>`;
  const competitorNames = competitorNamesForMetal(metal);
  const purityHeaders = rows.map((row) => `
    <th>
      <span class="gold-prediction-purity-code">${escapeHtml(row.label || row.purity_code)}</span>
      <small>Purezza ${escapeHtml(formatPredictionPercent(row.purity_value))}</small>
    </th>
  `).join("");
  const competitorRows = competitorNames.length
    ? competitorNames.map((name) => {
        const quoteCells = rows.map((row) => {
          const quote = latestCompetitorQuoteForPurity(name, metal, row.purity_code);
          return `<td>${escapeHtml(competitorQuoteMatrixValue(quote))}</td>`;
        }).join("");
        return `
          <tr>
            <th>${escapeHtml(name)}</th>
            ${quoteCells}
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="${rows.length + 1}">Nessuna quotazione competitor disponibile.</td></tr>`;
  return `
    <div class="gold-prediction-table-heading">${escapeHtml(title)}</div>
    <div class="gold-prediction-table-wrap">
      <table class="gold-prediction-table">
        <thead>
          <tr>
            <th>Competitor</th>
            ${purityHeaders}
          </tr>
        </thead>
        <tbody>
          ${competitorRows}
        </tbody>
      </table>
    </div>
  `;
}

function renderGoldPredictionKaratTable() {
  if (!goldPredictionKaratTable) return;
  goldPredictionKaratTable.innerHTML = `
    ${buybackTableHtml("Oro", "gold")}
    ${buybackTableHtml("Argento", "silver")}
  `;
}

function renderGoldPredictionChart() {
  if (!goldPredictionChart) return;
  const series = ["gold", "silver"].map((metal) => {
    const history = (state.metalPredictionHistory?.[metal] || []).slice(-30);
    const base = Number(history[0]?.price_per_gram || 0) || 1;
    return {
      metal,
      points: history.map((row, index) => ({ index, value: (Number(row.price_per_gram || 0) / base) * 100 }))
    };
  }).filter((item) => item.points.length > 1);
  if (!series.length) {
    goldPredictionChart.innerHTML = '<div class="empty-state">Storico insufficiente per disegnare il grafico.</div>';
    return;
  }
  const width = 720;
  const height = 260;
  const padding = 28;
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(max - min, 1);
  const longest = Math.max(...series.map((item) => item.points.length));
  const toX = (index) => padding + (index * ((width - padding * 2) / Math.max(1, longest - 1)));
  const toY = (value) => height - padding - ((value - min) / range) * (height - padding * 2);
  goldPredictionChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico storico indicizzato oro e argento">
      <rect x="0" y="0" width="${width}" height="${height}" rx="18" class="gold-prediction-chart-bg" />
      ${series.map((item) => `
        <polyline points="${item.points.map((point) => `${toX(point.index)},${toY(point.value)}`).join(" ")}" class="gold-prediction-line ${item.metal === "silver" ? "silver" : ""}" />
      `).join("")}
      <text x="${padding}" y="${padding - 8}" class="gold-prediction-axis">Indice storico 30 giorni</text>
      <text x="${padding}" y="${height - 8}" class="gold-prediction-axis">Oro e argento normalizzati a 100</text>
    </svg>
  `;
}

function renderGoldPredictionExplanation() {
  if (!goldPredictionExplanation) return;
  const disclaimer = state.goldPredictionStatus?.settings?.disclaimer || "Le previsioni sono stime statistiche indicative e non rappresentano garanzia di prezzo. Il prezzo massimo pagabile è calcolato secondo le policy OroActive configurate dal Founder. Il prezzo finale applicato al cliente resta responsabilità dell'operatore autorizzato e delle policy aziendali.";
  goldPredictionExplanation.innerHTML = `
    <h4>Come leggere il prezzo massimo pagabile</h4>
    <p>Il valore teorico parte dal prezzo puro al grammo e viene moltiplicato per purezza, caratura o titolo. Il sistema sottrae perdita fusione, spread raffineria, costi operativi e buffer rischio, poi applica il margine target e il buffer trattativa della policy Founder.</p>
    <p class="gold-prediction-disclaimer">${escapeHtml(disclaimer)}</p>
  `;
}

function defaultExtractionRulesForSource(source = {}) {
  if (String(source.name || "").toLowerCase() === "oro express") {
    const pageUrl = source.website_url || "https://www.oro-express.it";
    return [
      ["gold_24kt", "Oro puro", "gold", "24kt", "1", "oro puro", "oro\\s+puro[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"],
      ["gold_18kt", "Oro usato", "gold", "18kt", "0.75", "oro usato", "oro\\s+usato[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"],
      ["silver_999", "Argento puro", "silver", "999", "0.999", "argento puro", "argento\\s+puro[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"],
      ["silver_used_generic", "Argento usato", "silver", "used_generic", "", "argento usato", "argento\\s+usato[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Oro Express",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "oro d'oro") {
    const pageUrl = source.website_url || "https://www.comproorodoro.it";
    return [
      ["oro_doro_gold_24kt", "ORO 24kt", "gold", "24kt", "1", "ORO 24kt", "ORO\\s*(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)[\\s\\S]{0,40}?24\\s*(?:kt|k)"],
      ["oro_doro_gold_22kt", "ORO 22kt", "gold", "22kt", String(22 / 24), "ORO 22KT", "ORO\\s*22\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_gold_21kt", "ORO 21kt", "gold", "21kt", String(21 / 24), "ORO 21KT", "ORO\\s*21\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_gold_20kt", "ORO 20kt", "gold", "20kt", String(20 / 24), "ORO 20KT", "ORO\\s*20\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_gold_18kt", "ORO 18kt", "gold", "18kt", "0.75", "ORO 18KT", "ORO\\s*18\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_gold_14kt", "ORO 14kt", "gold", "14kt", String(14 / 24), "ORO 14KT", "ORO\\s*14\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_gold_9kt", "ORO 9kt", "gold", "9kt", String(9 / 24), "ORO 9KT", "ORO\\s*9\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_silver_999", "ARGENTO 999", "silver", "999", "0.999", "ARGENTO 999", "ARGENTO\\s*(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)[\\s\\S]{0,40}?999"],
      ["oro_doro_silver_925", "ARGENTO 925", "silver", "925", "0.925", "ARGENTO 925", "ARGENTO\\s*925[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
      ["oro_doro_silver_800", "ARGENTO 800", "silver", "800", "0.8", "ARGENTO 800", "ARGENTO\\s*800[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Oro D'Oro",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "amico oro") {
    const pageUrl = source.website_url || "https://www.amico-oro.it";
    return [
      ["amico_oro_gold_24kt", "24K al gr", "gold", "24kt", "1", "24K al gr", "24K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"],
      ["amico_oro_gold_18kt", "18K al gr", "gold", "18kt", "0.75", "18K al gr", "18K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"],
      ["amico_oro_gold_14kt", "14K al gr", "gold", "14kt", String(14 / 24), "14K al gr", "14K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Amico Oro",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "pronto gold") {
    const pageUrl = source.extraction_config?.quote_url || source.extraction_config?.quoteUrl || "https://www.prontogold.com/quotazioni";
    return [
      ["pronto_gold_gold_24kt_buy", "ORO PURO 24k Acquisto", "gold", "24kt", "1", "ORO PURO 24k", "EUR/g", "ORO\\s+PURO\\s*24k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"],
      ["pronto_gold_gold_18kt_range", "Compro ORO usato 18k da/a", "gold", "18kt", "0.75", "Compro ORO usato 18k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*18k[\\s\\S]{0,160}?da\\s*([0-9]+[,.]?[0-9]*)[\\s\\S]{0,120}?a\\s*([0-9]+[,.]?[0-9]*)"],
      ["pronto_gold_gold_14kt", "Compro ORO usato 14k", "gold", "14kt", String(14 / 24), "Compro ORO usato 14k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*14k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"],
      ["pronto_gold_gold_9kt", "Compro ORO usato 9k", "gold", "9kt", String(9 / 24), "Compro ORO usato 9k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*9k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"],
      ["pronto_gold_silver_999_buy", "ARGENTO PURO Acquisto", "silver", "999", "0.999", "ARGENTO PURO", "EUR/g", "ARGENTO\\s+PURO[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"],
      ["pronto_gold_silver_925", "Compro ARGENTO usato 925", "silver", "925", "0.925", "Compro ARGENTO usato 925", "EUR/g", "Compro\\s+ARGENTO\\s+usato\\s*925[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"],
      ["pronto_gold_silver_800", "Compro ARGENTO usato 800", "silver", "800", "0.8", "Compro ARGENTO usato 800", "EUR/g", "Compro\\s+ARGENTO\\s+usato\\s*800[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, unit, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Pronto Gold",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit,
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "bordin") {
    const pageUrl = source.website_url || "https://oroemetallipreziosi.com";
    return [
      ["bordin_gold_24kt", "Oro 24kt - 999,9‰", "gold", "24kt", "0.9999", "Oro 24kt", "Oro\\s*24\\s*(?:kt|k)[\\s\\S]{0,120}?999[,.]9\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"],
      ["bordin_gold_18kt", "Oro 18kt - 750‰", "gold", "18kt", "0.75", "Oro 18kt", "Oro\\s*18\\s*(?:kt|k)[\\s\\S]{0,120}?750\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"],
      ["bordin_gold_14kt", "Oro 14kt - 585‰", "gold", "14kt", "0.585", "Oro 14kt", "Oro\\s*14\\s*(?:kt|k)[\\s\\S]{0,120}?585\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"],
      ["bordin_silver_999", "Argento 999‰", "silver", "999", "0.999", "Argento 999", "Argento\\s*999\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"],
      ["bordin_silver_925", "Argento 925‰", "silver", "925", "0.925", "Argento 925", "Argento\\s*925\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"],
      ["bordin_silver_800", "Argento 800‰", "silver", "800", "0.8", "Argento 800", "Argento\\s*800\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Bordin",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "gold standard") {
    const pageUrl = source.website_url || "https://www.goldstandard.gold";
    return [
      ["gold_standard_gold_24kt_reference", "Quotazione dell'oro in borsa", "gold", "24kt", "1", "Quotazione dell'oro in borsa", "Quotazione\\s+dell[’']oro\\s+in\\s+borsa[\\s\\S]{0,120}?€\\s*([0-9]+[,.]?[0-9]*)"],
      ["gold_standard_gold_18kt_buyback", "Acquistiamo ORO 18K prezzo MIN", "gold", "18kt", "0.75", "Acquistiamo ORO 18K", "Acquistiamo\\s+ORO\\s*18\\s*K[\\s\\S]{0,120}?prezzo\\s*MIN[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)"],
      ["gold_standard_gold_24kt_buyback", "Acquistiamo ORO 24K al prezzo MIN", "gold", "24kt", "1", "Acquistiamo ORO 24K", "Acquistiamo\\s+ORO\\s*24\\s*K[\\s\\S]{0,120}?prezzo\\s*MIN[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Gold Standard",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  if (String(source.name || "").toLowerCase() === "oro in euro") {
    const pageUrl = source.website_url || "https://www.quotazioneritirooro.it";
    return [
      ["oro_in_euro_gold_18kt", "Oro 750/1000", "gold", "18kt", "0.75", "Oro 750/1000", "Oro\\s*750\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"],
      ["oro_in_euro_gold_24kt", "Oro 999/1000", "gold", "24kt", "0.999", "Oro 999/1000", "Oro\\s*999\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"],
      ["oro_in_euro_silver_999", "Argento 999/1000", "silver", "999", "0.999", "Argento 999/1000", "Argento\\s*999\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"]
    ].map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
      source_id: source.id,
      competitor_name: source.name || "Oro in Euro",
      page_url: pageUrl,
      field_key,
      label,
      metal,
      purity_code,
      purity_value,
      unit: "EUR/g",
      anchor_text,
      regex_pattern,
      extraction_method: "anchor_regex",
      required: true,
      active: true,
      last_test_status: "not_tested"
    }));
  }
  return [{
    source_id: source.id,
    competitor_name: source.name || "",
    page_url: source.website_url || "",
    field_key: "gold_18kt",
    label: "Oro 18kt",
    metal: "gold",
    purity_code: "18kt",
    purity_value: "0.75",
    unit: "EUR/g",
    anchor_text: "",
    css_selector: "",
    xpath_selector: "",
    regex_pattern: "",
    extraction_method: "anchor_regex",
    required: true,
    active: true,
    last_test_status: "not_configured"
  }];
}

function extractionRulesForSource(source = {}) {
  const rules = (state.competitorExtractionRules || []).filter((rule) => String(rule.source_id) === String(source.id));
  return rules.length ? rules : defaultExtractionRulesForSource(source);
}

function extractionTestResultsForSource(sourceId) {
  const direct = state.competitorExtractionResults?.[sourceId]?.results || [];
  if (direct.length) return direct;
  return (state.competitorExtractionRules || [])
    .filter((rule) => String(rule.source_id) === String(sourceId) && rule.last_test_status && rule.last_test_status !== "not_tested")
    .map((rule) => ({
      rule,
      status: rule.last_test_status,
      value: rule.last_test_value,
      evidence_text: rule.last_test_evidence,
      method: rule.extraction_method,
      confidence: "medium"
    }));
}

function extractionStatusLabel(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (["found", "success"].includes(normalized)) return "Rilevato";
  if (["partial", "da_verificare"].includes(normalized)) return "Da verificare";
  if (["not_found", "failed"].includes(normalized)) return "Non rilevato";
  if (normalized === "not_configured") return "Da configurare";
  if (normalized === "error") return "Errore";
  return "Non testato";
}

function extractionResultListHtml(sourceId) {
  const results = extractionTestResultsForSource(sourceId);
  if (!results.length) return '<div class="empty-state">Nessun test eseguito. Usa “Testa estrazione” per verificare le regole.</div>';
  return `
    <div class="extraction-result-list">
      ${results.map((result) => `
        <div class="extraction-result ${escapeHtml(String(result.status || "not_tested").toLowerCase())}">
          <strong>${escapeHtml(result.rule?.label || result.rule?.field_key || "Regola")}</strong>
          <span>${escapeHtml(extractionStatusLabel(result.status))}</span>
          <span>${result.value ? escapeHtml(formatGoldPerGram(result.value, "EUR")) : "Dato non rilevato"}</span>
          <small>${escapeHtml(result.evidence_text || result.error || "Nessuna prova testuale disponibile")}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCompetitorExtractionTrainer() {
  if (!competitorExtractionTrainerList) return;
  if (!isFounder()) {
    competitorExtractionTrainerList.innerHTML = "";
    return;
  }
  const sources = state.competitorSources || [];
  if (!sources.length) {
    competitorExtractionTrainerList.innerHTML = '<div class="empty-state">Nessuna fonte competitor configurata.</div>';
    return;
  }
  competitorExtractionTrainerList.innerHTML = sources.map((source) => {
    const rules = extractionRulesForSource(source);
    return `
      <section class="competitor-extraction-source" data-extraction-source-id="${escapeHtml(source.id)}">
        <div class="competitor-extraction-head">
          <div>
            <h5>${escapeHtml(source.name)}</h5>
            <p>${source.website_url ? `<a href="${escapeHtml(source.website_url)}" target="_blank" rel="noopener">${escapeHtml(source.website_url)}</a>` : "URL non configurato"}</p>
          </div>
          <div class="competitor-extraction-actions">
            <button class="small-button" type="button" data-test-extraction-source="${escapeHtml(source.id)}">Testa estrazione</button>
            <button class="small-button" type="button" data-ai-assisted-extraction="${escapeHtml(source.id)}">Esegui analisi AI assistita</button>
            <button class="primary-button small-button" type="button" data-save-extraction-rules="${escapeHtml(source.id)}">Salva regole</button>
          </div>
        </div>
        <div class="competitor-table-wrap">
          <table class="competitor-table competitor-extraction-table">
            <thead>
              <tr>
                <th>Attiva</th>
                <th>Campo</th>
                <th>Label</th>
                <th>Pagina quotazioni</th>
                <th>Metallo</th>
                <th>Caratura/Titolo</th>
                <th>Purezza</th>
                <th>Unità</th>
                <th>Anchor</th>
                <th>CSS</th>
                <th>XPath</th>
                <th>Regex</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map((rule) => `
                <tr class="extraction-rule-row" data-rule-id="${escapeHtml(rule.id || "")}">
                  <td><input data-rule-field="active" type="checkbox" ${rule.active !== false ? "checked" : ""} aria-label="Regola attiva"></td>
                  <td><input data-rule-field="field_key" value="${escapeHtml(rule.field_key || "")}" placeholder="gold_18kt"></td>
                  <td><input data-rule-field="label" value="${escapeHtml(rule.label || "")}" placeholder="Oro 18kt"></td>
                  <td><input data-rule-field="page_url" type="url" value="${escapeHtml(rule.page_url || source.website_url || "")}" placeholder="https://..."></td>
                  <td>
                    <select data-rule-field="metal">
                      <option value="gold" ${rule.metal === "gold" ? "selected" : ""}>Oro</option>
                      <option value="silver" ${rule.metal === "silver" ? "selected" : ""}>Argento</option>
                    </select>
                  </td>
                  <td><input data-rule-field="purity_code" value="${escapeHtml(rule.purity_code || "")}" placeholder="18kt / 925"></td>
                  <td><input data-rule-field="purity_value" type="number" step="0.001" min="0" max="1" value="${rule.purity_value ?? ""}" placeholder="0.75"></td>
                  <td>
                    <select data-rule-field="unit">
                      <option value="EUR/g" ${rule.unit !== "EUR/kg" ? "selected" : ""}>EUR/g</option>
                      <option value="EUR/kg" ${rule.unit === "EUR/kg" ? "selected" : ""}>EUR/kg</option>
                    </select>
                  </td>
                  <td><input data-rule-field="anchor_text" value="${escapeHtml(rule.anchor_text || "")}" placeholder="oro usato"></td>
                  <td><input data-rule-field="css_selector" value="${escapeHtml(rule.css_selector || "")}" placeholder=".price-18kt"></td>
                  <td><input data-rule-field="xpath_selector" value="${escapeHtml(rule.xpath_selector || "")}" placeholder="//div[contains(@class,'price')]"></td>
                  <td><textarea data-rule-field="regex_pattern" rows="2" placeholder="oro\\s+usato...">${escapeHtml(rule.regex_pattern || "")}</textarea></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${extractionResultListHtml(source.id)}
      </section>
    `;
  }).join("");
}

function renderCompetitorQuotes() {
  if (!competitorQuotesList) return;
  competitorQuotesList.innerHTML = `
    ${competitorAutoSyncSummaryHtml()}
    ${competitorAiExtractionSummaryHtml()}
    ${oroExpressSummaryHtml()}
    ${oroDOroSummaryHtml()}
    ${amicoOroSummaryHtml()}
    ${prontoGoldSummaryHtml()}
    ${bordinSummaryHtml()}
    ${goldStandardSummaryHtml()}
    ${oroInEuroSummaryHtml()}
    ${gruppoOro24kSummaryHtml()}
    <p class="gold-prediction-disclaimer">La vista resta sintetica: fonti preconfigurate e tabella tecnica delle quotazioni rilevate sono nascoste. Il confronto usa solo prezzi di acquisto cliente validi per caratura o titolo disponibile.</p>
  `;
  renderCompetitorExtractionTrainer();
}

function renderGoldPredictionSettings() {
  if (!goldPredictionSettingsPanel || !goldPredictionSettingsForm) return;
  goldPredictionSettingsPanel.hidden = !isFounder();
  if (!isFounder()) return;
  const settings = state.goldPredictionSettings || state.goldPredictionStatus?.settings || {};
  goldPredictionSettingsForm.provider.value = settings.provider || state.goldPredictionStatus?.status?.provider || "manual";
  if (goldPredictionSettingsForm.fallback_provider) goldPredictionSettingsForm.fallback_provider.value = settings.fallback_provider || state.goldPredictionStatus?.status?.fallback_provider || "manual";
  goldPredictionSettingsForm.currency.value = settings.currency || "EUR";
  goldPredictionSettingsForm.history_days.value = settings.history_days || 90;
  goldPredictionSettingsForm.model.value = settings.model || "ensemble";
  goldPredictionSettingsForm.demo_mode.checked = Boolean(settings.demo_mode || state.goldPredictionStatus?.status?.demo_mode);
  if (goldPredictionSettingsForm.market_match_delta_per_gram) {
    goldPredictionSettingsForm.market_match_delta_per_gram.value = Number(settings.market_match_delta_per_gram || 0);
  }
  if (goldPredictionSettingsForm.competitor_data_max_age_hours) {
    goldPredictionSettingsForm.competitor_data_max_age_hours.value = Number(settings.competitor_data_max_age_hours || 24);
  }
  if (goldPredictionSettingsForm.allow_aggressive_market_match) {
    goldPredictionSettingsForm.allow_aggressive_market_match.checked = Boolean(settings.allow_aggressive_market_match);
  }
  if (goldPredictionSettingsForm.show_competitor_to_commesso) {
    goldPredictionSettingsForm.show_competitor_to_commesso.checked = Boolean(settings.show_competitor_to_commesso);
  }
  if (goldPredictionSettingsForm.require_founder_approval_if_competitor_above_max) {
    goldPredictionSettingsForm.require_founder_approval_if_competitor_above_max.checked = settings.require_founder_approval_if_competitor_above_max !== false;
  }
  goldPredictionSettingsForm.disclaimer.value = settings.disclaimer || state.goldPredictionStatus?.settings?.disclaimer || "";
  if (buybackPolicyEditor) {
    const policies = state.buybackPolicy?.policies || [];
    buybackPolicyEditor.innerHTML = `
      <h4>Override carature e titoli</h4>
      <div class="buyback-policy-grid">
        ${policies.map((policy) => `
          <fieldset class="buyback-policy-row" data-policy-metal="${escapeHtml(policy.metal)}" data-policy-code="${escapeHtml(policy.purity_code)}">
            <legend>${escapeHtml(policy.label || policy.purity_code)}</legend>
            <label>Margine %<input data-policy-field="margin_target_pct" type="number" step="0.1" min="0" max="95" value="${Number(policy.margin_target_pct || 0) * 100}"></label>
            <label>Spread raffin. %<input data-policy-field="refinery_spread_pct" type="number" step="0.1" min="0" max="50" value="${Number(policy.refinery_spread_pct || 0) * 100}"></label>
            <label>Perdita fusione %<input data-policy-field="melting_loss_pct" type="number" step="0.1" min="0" max="50" value="${Number(policy.melting_loss_pct || 0) * 100}"></label>
            <label>Costo op. €/g<input data-policy-field="operating_cost_per_gram" type="number" step="0.01" min="0" value="${Number(policy.operating_cost_per_gram || 0)}"></label>
            <label>Costo fus. €/g<input data-policy-field="melting_cost_per_gram" type="number" step="0.01" min="0" value="${Number(policy.melting_cost_per_gram || 0)}"></label>
            <label>Buffer tratt. %<input data-policy-field="negotiation_buffer_pct" type="number" step="0.1" min="0" max="50" value="${Number(policy.negotiation_buffer_pct || 0) * 100}"></label>
          </fieldset>
        `).join("")}
      </div>
    `;
  }
}

function renderGoldPredictionPanel() {
  renderGoldPredictionStatus();
  renderGoldPredictionCards();
  renderGoldPredictionList();
  renderGoldPredictionKaratTable();
  renderGoldPredictionChart();
  renderGoldPredictionExplanation();
  renderCompetitorQuotes();
  renderGoldPredictionSettings();
  if (syncGoldHistoryButton) syncGoldHistoryButton.hidden = !["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

async function loadGoldPredictionPanel(options = {}) {
  if (!goldPredictionStatus) return;
  if (!options.silent) goldPredictionStatus.textContent = "Caricamento Analisi di mercato...";
  try {
    const statusData = await apiRequest("/quotazioni/metals/status");
    const currency = encodeURIComponent(statusData.settings?.currency || "EUR");
    const scenario = state.buybackScenario || "standard";
    const [historyData, latestData, policyData, buybackData, competitorData, prontoGoldQuotesData, competitorSourcesData, competitorSyncData, competitorMarketData, competitorAiStatusData, competitorAiQuotesData, competitorExtractionRulesData] = await Promise.all([
      apiRequest(`/quotazioni/metals/history?metals=gold,silver&days=30&currency=${currency}`),
      apiRequest(`/quotazioni/metals/predictions/latest?metals=gold,silver&currency=${currency}`),
      apiRequest("/quotazioni/buyback-policy"),
      apiRequest("/quotazioni/buyback-calculate", {
        method: "POST",
        body: JSON.stringify({ metals: ["gold", "silver"], currency: decodeURIComponent(currency), horizons: ["today", "24h", "7d", "30d"], scenario })
      }),
      apiRequest(`/quotazioni/competitors/quotes?days=30&limit=500&quote_type=customer_buyback&currency=${currency}`).catch(() => ({ quotes: [], stats: {} })),
      apiRequest(`/quotazioni/competitors/quotes?competitor_name=${encodeURIComponent("Pronto Gold")}&days=30&limit=80&quote_type=customer_buyback&currency=${currency}`).catch(() => ({ quotes: [] })),
      apiRequest("/quotazioni/competitors/sources").catch(() => ({ sources: [] })),
      apiRequest("/quotazioni/competitors/sync-status").catch(() => null),
      apiRequest(`/quotazioni/competitors/market-summary?currency=${currency}`).catch(() => null),
      apiRequest("/quotazioni/competitors/ai-extract/status").catch(() => null),
      apiRequest(`/quotazioni/competitors/quotes/ai?days=30&currency=${currency}`).catch(() => ({ quotes: [] })),
      isFounder() ? apiRequest("/quotazioni/competitors/extraction-rules").catch(() => ({ rules: [] })) : Promise.resolve({ rules: [] })
    ]);
    state.goldPredictionStatus = {
      ...statusData,
      warning: buybackData.warning || "",
      historyWarning: historyData.warning || ""
    };
    state.metalPredictionHistory = historyData.history || {};
    state.goldPredictionHistory = state.metalPredictionHistory.gold || [];
    state.metalPredictionLatest = latestData.predictions || {};
    state.goldPredictionLatest = buybackData.predictions || Object.values(state.metalPredictionLatest).flat();
    state.buybackPolicy = policyData.policy || null;
    state.buybackCalculations = buybackData.calculations || [];
    const quoteMap = new Map();
    [...(competitorData.quotes || []), ...(prontoGoldQuotesData.quotes || [])]
      .filter(isCompetitorBuybackQuote)
      .forEach((quote) => {
        const key = [
          competitorNameKey(quote.competitor_name),
          quote.metal || "",
          quote.purity_code || "",
          quote.quote_type || ""
        ].join("|");
        const existing = quoteMap.get(key);
        const existingDate = new Date(existing?.quote_date || existing?.created_at || 0).getTime();
        const quoteDate = new Date(quote.quote_date || quote.created_at || 0).getTime();
        if (!existing || quoteDate >= existingDate) {
          quoteMap.set(key, { ...quote, competitor_name: competitorDisplayName(quote.competitor_name) });
        }
      });
    state.competitorQuotes = [...quoteMap.values()]
      .sort((first, second) => new Date(second.quote_date || second.created_at || 0) - new Date(first.quote_date || first.created_at || 0));
    state.competitorStats = buybackData.competitor_stats || competitorData.stats || statusData.competitor_stats || {};
    state.competitorSources = (competitorSourcesData.sources || [])
      .filter((source) => !isHiddenCompetitorName(source.name));
    state.competitorSyncStatus = competitorSyncData
      ? {
          ...competitorSyncData,
          sources: (competitorSyncData.sources || []).filter((source) => !isHiddenCompetitorName(source.name)),
          sources_total: (competitorSyncData.sources || state.competitorSources || []).filter((source) => !isHiddenCompetitorName(source.name)).length
        }
      : null;
    state.competitorMarketSummary = competitorMarketData?.summary || null;
    state.competitorAiStatus = competitorAiStatusData
      ? {
          ...competitorAiStatusData,
          sources: (competitorAiStatusData.sources || []).filter((source) => !isHiddenCompetitorName(source.name)),
          page_summary: (competitorAiStatusData.page_summary || []).filter((page) => !isHiddenCompetitorName(page.competitor_name)),
          sources_total: (competitorAiStatusData.sources || state.competitorSources || []).filter((source) => !isHiddenCompetitorName(source.name)).length
        }
      : null;
    state.competitorAiQuotes = (competitorAiQuotesData.quotes || []).filter(isCompetitorBuybackQuote);
    state.competitorExtractionRules = (competitorExtractionRulesData.rules || []).filter((rule) => !isHiddenCompetitorName(rule.competitor_name));
    state.goldPredictionSettings = statusData.settings || null;
    if (isFounder()) {
      const settingsData = await apiRequest("/quotazioni/gold-prediction/settings").catch(() => null);
      if (settingsData?.settings) state.goldPredictionSettings = settingsData.settings;
    }
    renderGoldPredictionPanel();
  } catch (error) {
    goldPredictionStatus.innerHTML = `<span>${escapeHtml(cleanUserMessage(error?.message, "Analisi metalli non disponibile al momento."))}</span>`;
  }
}

async function syncGoldHistory() {
  const data = await apiRequest("/quotazioni/metals/sync-bullionvault", {
    method: "POST",
    body: JSON.stringify({ metals: ["gold", "silver"] })
  });
  showToast(data.warning || "Storico BullionVault oro e argento aggiornato.", data.warning ? "warning" : "success");
  await loadGoldPredictionPanel({ silent: true });
}

async function runGoldPrediction() {
  const currency = state.goldPredictionSettings?.currency || state.goldPredictionStatus?.settings?.currency || "EUR";
  const scenario = buybackScenarioSelect?.value || state.buybackScenario || "standard";
  state.buybackScenario = scenario;
  const data = await apiRequest("/quotazioni/buyback-calculate", {
    method: "POST",
    body: JSON.stringify({ metals: ["gold", "silver"], currency, horizons: ["today", "24h", "7d", "30d"], scenario })
  });
  state.goldPredictionLatest = data.predictions || [];
  state.metalPredictionLatest = (data.predictions || []).reduce((accumulator, prediction) => {
    accumulator[prediction.metal] = accumulator[prediction.metal] || [];
    accumulator[prediction.metal].push(prediction);
    return accumulator;
  }, {});
  state.buybackCalculations = data.calculations || [];
  state.competitorStats = data.competitor_stats || state.competitorStats || {};
  state.goldPredictionStatus = { ...(state.goldPredictionStatus || {}), warning: data.warning || "" };
  renderGoldPredictionPanel();
  showToast(data.warning || "Prezzi massimi pagabili aggiornati.", data.warning ? "warning" : "success");
}

function collectBuybackPolicyRows() {
  if (!buybackPolicyEditor) return [];
  return [...buybackPolicyEditor.querySelectorAll("[data-policy-metal][data-policy-code]")].map((fieldset) => {
    const row = {
      metal: fieldset.dataset.policyMetal,
      purity_code: fieldset.dataset.policyCode
    };
    fieldset.querySelectorAll("[data-policy-field]").forEach((input) => {
      const key = input.dataset.policyField;
      const value = Number(input.value || 0);
      row[key] = key.endsWith("_pct") ? value / 100 : value;
    });
    const existing = state.buybackPolicy?.policies?.find((policy) => policy.metal === row.metal && policy.purity_code === row.purity_code) || {};
    return { ...existing, ...row };
  });
}

async function saveGoldPredictionSettings(event) {
  event.preventDefault();
  if (!isFounder()) return;
  const formData = new FormData(goldPredictionSettingsForm);
  const payload = {
    provider: formData.get("provider"),
    fallback_provider: formData.get("fallback_provider"),
    currency: formData.get("currency"),
    history_days: Number(formData.get("history_days") || 90),
    model: formData.get("model"),
    demo_mode: formData.get("demo_mode") === "on",
    market_match_delta_per_gram: Number(formData.get("market_match_delta_per_gram") || 0),
    competitor_data_max_age_hours: Number(formData.get("competitor_data_max_age_hours") || 24),
    allow_aggressive_market_match: formData.get("allow_aggressive_market_match") === "on",
    show_competitor_to_commesso: formData.get("show_competitor_to_commesso") === "on",
    require_founder_approval_if_competitor_above_max: formData.get("require_founder_approval_if_competitor_above_max") === "on",
    disclaimer: formData.get("disclaimer"),
    horizons: ["today", "24h", "7d", "30d"]
  };
  const [settingsData, policyData] = await Promise.all([
    apiRequest("/quotazioni/gold-prediction/settings", { method: "PUT", body: JSON.stringify(payload) }),
    apiRequest("/quotazioni/buyback-policy", { method: "PUT", body: JSON.stringify({ policies: collectBuybackPolicyRows() }) })
  ]);
  state.goldPredictionSettings = settingsData.settings || payload;
  state.buybackPolicy = policyData.policy || state.buybackPolicy;
  showToast("Impostazioni e Policy Prezzi Compro Oro aggiornate.", "success");
  await loadGoldPredictionPanel({ silent: true });
}

function renderBuybackSimulation(event) {
  event?.preventDefault();
  if (!buybackSimulatorForm || !buybackSimulatorOutput) return;
  const formData = new FormData(buybackSimulatorForm);
  const metal = String(formData.get("metal") || "gold");
  const purityCode = String(formData.get("purity_code") || "18kt");
  const grams = Math.max(0, Number(formData.get("grams") || 0));
  const scenario = String(formData.get("scenario") || state.buybackScenario || "standard");
  const row = findBuybackRow(metal, purityCode, "today", scenario) || findBuybackRow(metal, purityCode, "today", state.buybackScenario);
  if (!row || !grams) {
    state.buybackSimulationContext = null;
    buybackSimulatorOutput.textContent = "Calcolo non disponibile. Aggiorna i prezzi e inserisci un peso valido.";
    return null;
  }
  const bestMarket = buybackMarketPrice(row);
  const bestCompetitor = Number(row.best_competitor_price || row.competitor_max_price || 0);
  const residualMargin = Math.max(0, Number(row.recoverable_value_per_gram || 0) - bestMarket);
  state.buybackSimulationContext = buildPriceExplanationContext(row, { type: "simulator", grams, scenario });
  Object.assign(state.buybackSimulationContext, {
    best_market_client_price_per_gram: bestMarket || state.buybackSimulationContext.best_market_client_price_per_gram,
    best_market_total: bestMarket ? bestMarket * grams : state.buybackSimulationContext.best_market_total,
    best_competitor_price: bestCompetitor || state.buybackSimulationContext.best_competitor_price,
    best_competitor_total: bestCompetitor ? bestCompetitor * grams : state.buybackSimulationContext.best_competitor_total,
    residual_margin_per_gram: residualMargin,
    residual_margin_total: residualMargin * grams,
    displayed_values: {
      theoretical_total: Number(row.theoretical_value_per_gram || 0) * grams,
      max_payable_total: Number(row.max_payable_per_gram || 0) * grams,
      recommended_total: Number(row.recommended_payable_per_gram || 0) * grams,
      best_market_total: bestMarket * grams,
      best_competitor_total: bestCompetitor ? bestCompetitor * grams : null,
      margin_total: Number(row.margin_estimated_per_gram || 0) * grams,
      residual_margin_total: residualMargin * grams,
      recoverable_total: Number(row.recoverable_value_per_gram || 0) * grams,
      competitor_avg_price: row.competitor_count ? Number(row.competitor_avg_price || 0) : null
    }
  });
  const bordinQuote = state.buybackSimulationContext?.bordin_quote || null;
  const bordinMinGrams = Number(bordinQuote?.min_quantity_grams || 0);
  const bordinWarning = bordinQuote && bordinMinGrams && grams < bordinMinGrams
    ? `<p class="gold-prediction-disclaimer">Bordin indica offerta valida sopra ${escapeHtml(formatAurumNumber(bordinMinGrams, 0))}g. Confronto da considerare con prudenza per ${escapeHtml(formatAurumNumber(grams, 2))}g.</p>`
    : "";
  const warning = row.market_comparison_status === "competitor_too_high"
    ? `<p class="gold-prediction-disclaimer">Il miglior competitor rilevato supera il massimo sostenibile OroActive. Superare ${escapeHtml(formatEuro(row.max_payable_per_gram * grams))} ridurrebbe il margine sotto la policy configurata.</p>`
    : "";
  buybackSimulatorOutput.innerHTML = `
    <div><span>Valore teorico</span><strong>${escapeHtml(formatEuro(row.theoretical_value_per_gram * grams))}</strong></div>
    <div><span>Massimo pagabile</span><strong>${escapeHtml(formatEuro(row.max_payable_per_gram * grams))}</strong></div>
    <div><span>Prezzo consigliato</span><strong>${escapeHtml(formatEuro(row.recommended_payable_per_gram * grams))}</strong></div>
    <div><span>Miglior prezzo mercato stimato</span><strong>${escapeHtml(formatEuro(bestMarket * grams))}</strong></div>
    <div><span>Miglior competitor rilevato</span><strong>${bestCompetitor ? escapeHtml(formatEuro(bestCompetitor * grams)) : "Non disponibile"}</strong></div>
    <div><span>Margine stimato</span><strong>${escapeHtml(formatEuro(row.margin_estimated_per_gram * grams))}</strong></div>
    <div><span>Margine residuo su mercato</span><strong>${escapeHtml(formatEuro(residualMargin * grams))}</strong></div>
    <div><span>Rientro previsto</span><strong>${escapeHtml(formatEuro(row.recoverable_value_per_gram * grams))}</strong></div>
    <div><span>Competitor medio</span><strong>${row.competitor_count ? escapeHtml(formatGoldPerGram(row.competitor_avg_price, row.currency)) : "Non disponibile"}</strong></div>
    ${warning}
    ${bordinWarning}
  `;
  return state.buybackSimulationContext;
}

async function saveCompetitorSource(event) {
  event.preventDefault();
  if (!isFounder() || !competitorSourceForm) return;
  const formData = new FormData(competitorSourceForm);
  const payload = {
    name: formData.get("name"),
    website_url: formData.get("website_url"),
    source_type: formData.get("source_type"),
    notes: formData.get("notes"),
    active: true
  };
  await apiRequest("/quotazioni/competitors/sources", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  competitorSourceForm.reset();
  showToast("Fonte competitor salvata.", "success");
  await loadGoldPredictionPanel({ silent: true });
}

async function saveCompetitorQuote(event) {
  event.preventDefault();
  if (!isFounder() || !competitorQuoteForm) return;
  const formData = new FormData(competitorQuoteForm);
  const payload = {
    competitor_name: formData.get("competitor_name"),
    url: formData.get("url"),
    website_url: formData.get("url"),
    metal: formData.get("metal"),
    purity_code: formData.get("purity_code"),
    price_per_gram: Number(formData.get("price_per_gram") || 0),
    confidence: formData.get("confidence"),
    currency: "EUR",
    quote_date: new Date().toISOString()
  };
  await apiRequest("/quotazioni/competitors/quotes/manual", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  competitorQuoteForm.reset();
  showToast("Quotazione competitor salvata.", "success");
  await loadGoldPredictionPanel({ silent: true });
}

async function importCompetitorCsv(event) {
  event.preventDefault();
  if (!isFounder() || !competitorCsvForm) return;
  const formData = new FormData(competitorCsvForm);
  const csv = String(formData.get("csv") || "").trim();
  if (!csv) {
    showToast("Inserisci un CSV competitor valido.", "warning");
    return;
  }
  const data = await apiRequest("/quotazioni/competitors/quotes/import-csv", {
    method: "POST",
    body: JSON.stringify({ csv })
  });
  competitorCsvForm.reset();
  showToast(data.message || "Import competitor completato.", data.errors?.length ? "warning" : "success");
  await loadGoldPredictionPanel({ silent: true });
}

async function forceCompetitorAutoSync(sourceId = "all") {
  if (!isFounder()) return;
  const payload = sourceId && sourceId !== "all" ? { source_id: sourceId } : {};
  showToast(sourceId === "all" ? "Auto sync competitor in esecuzione..." : "Sync fonte competitor in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/auto-sync/run", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 90000
  });
  const saved = Number(data.quotes_saved || data.result?.quotes_saved || 0);
  const failed = (data.results || []).filter((item) => item.status === "failed").length + (data.result?.status === "failed" ? 1 : 0);
  showToast(
    failed ? `Sync completata con ${failed} fonte/i da verificare. Quotazioni salvate: ${saved}.` : `Sync competitor completata. Quotazioni salvate: ${saved}.`,
    failed ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceOroExpressSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Oro Express in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/oro-express/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed" ? "Oro Express non leggibile automaticamente. Ultimo dato valido mantenuto." : `Oro Express aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceOroDOroSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Oro D'Oro in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/oro-doro/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Oro D'Oro non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Oro D'Oro aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Oro D'Oro aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceAmicoOroSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Amico Oro in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/amico-oro/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed" ? "Amico Oro non leggibile automaticamente. Ultimo dato valido mantenuto." : `Amico Oro aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceProntoGoldSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Pronto Gold in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/pronto-gold/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Pronto Gold non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Pronto Gold aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Pronto Gold aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceBordinSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Bordin in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/bordin/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Bordin non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Bordin aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Bordin aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceGoldStandardSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Gold Standard in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/gold-standard/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Gold Standard non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Gold Standard aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Gold Standard aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceOroInEuroSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Oro in Euro in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/oro-in-euro/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Oro in Euro non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Oro in Euro aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Oro in Euro aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function forceGruppoOro24kSync() {
  if (!isFounder()) return;
  showToast("Aggiornamento Gruppo Oro 24K in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/gruppo-oro-24k/sync", {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 90000
  });
  const saved = Number(data.result?.quotes_saved || 0);
  const status = data.result?.status || data.state?.last_status || "success";
  showToast(
    status === "failed"
      ? "Gruppo Oro 24K non leggibile automaticamente. Ultimo dato valido mantenuto."
      : status === "partial"
        ? `Gruppo Oro 24K aggiornato parzialmente. Quotazioni salvate: ${saved}.`
        : `Gruppo Oro 24K aggiornato. Quotazioni salvate: ${saved}.`,
    status === "failed" || status === "partial" ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function runAiCompetitorExtraction(sourceId = "all") {
  if (!isFounder()) return;
  const payload = sourceId && sourceId !== "all" ? { source_id: sourceId } : {};
  showToast(sourceId === "all" ? "Analisi AI competitor in esecuzione..." : "Analisi AI della fonte competitor in esecuzione...", "success");
  const data = await apiRequest("/quotazioni/competitors/ai-extract/run", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 180000
  });
  const saved = Number(data.quotes_saved || data.run?.quotes_saved || data.result?.quotes_saved || 0);
  const pages = Number(data.pages_analyzed || data.run?.pages_analyzed || data.result?.pages_analyzed || 0);
  const failed = Number(data.sources_failed || data.run?.sources_failed || data.result?.sources_failed || 0);
  showToast(
    failed ? `Analisi AI completata con ${failed} fonte/i da verificare. Quote salvate: ${saved}.` : `Analisi AI completata. Pagine: ${pages}. Quote salvate: ${saved}.`,
    failed ? "warning" : "success"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function toggleCompetitorAutoSync(sourceId, nextAutoSync) {
  if (!isFounder() || !sourceId) return;
  const source = (state.competitorSources || []).find((item) => String(item.id) === String(sourceId)) || {};
  const enabled = nextAutoSync === true || nextAutoSync === "true";
  const payload = {
    active: source.active !== false,
    auto_sync_enabled: enabled,
    sync_interval_minutes: source.sync_interval_minutes || 180,
    source_type: source.source_type || "configured_page",
    extraction_config: source.extraction_config || {}
  };
  await apiRequest(`/quotazioni/competitors/sources/${encodeURIComponent(sourceId)}/auto-sync`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  showToast(enabled ? "Auto sync fonte competitor attivato." : "Auto sync fonte competitor disattivato.", "success");
  await loadGoldPredictionPanel({ silent: true });
}

function collectExtractionRulesForSource(sourceId) {
  const container = competitorExtractionTrainerList?.querySelector(`[data-extraction-source-id="${cssEscape(String(sourceId))}"]`);
  if (!container) return [];
  const source = (state.competitorSources || []).find((item) => String(item.id) === String(sourceId)) || {};
  return [...container.querySelectorAll(".extraction-rule-row")].map((row) => {
    const field = (name) => row.querySelector(`[data-rule-field="${name}"]`);
    const value = (name) => field(name)?.value?.trim() || "";
    const purityValue = value("purity_value");
    return {
      id: row.dataset.ruleId || null,
      source_id: sourceId,
      competitor_name: source.name || "",
      active: field("active")?.checked !== false,
      field_key: value("field_key"),
      label: value("label"),
      page_url: value("page_url") || source.website_url || "",
      metal: value("metal") || "gold",
      purity_code: value("purity_code"),
      purity_value: purityValue === "" ? null : Number(purityValue),
      unit: value("unit") || "EUR/g",
      anchor_text: value("anchor_text"),
      css_selector: value("css_selector"),
      xpath_selector: value("xpath_selector"),
      regex_pattern: value("regex_pattern"),
      extraction_method: value("css_selector")
        ? "css_selector"
        : value("xpath_selector")
          ? "xpath_selector"
          : "anchor_regex",
      required: true
    };
  }).filter((rule) => rule.field_key && rule.page_url);
}

async function saveExtractionRules(sourceId) {
  if (!isFounder() || !sourceId) return;
  const rules = collectExtractionRulesForSource(sourceId);
  if (!rules.length) {
    showToast("Configura almeno una regola con campo e URL pagina.", "warning");
    return;
  }
  const data = await apiRequest(`/quotazioni/competitors/sources/${encodeURIComponent(sourceId)}/extraction-rules`, {
    method: "PUT",
    body: JSON.stringify({ rules })
  });
  const otherRules = (state.competitorExtractionRules || []).filter((rule) => String(rule.source_id) !== String(sourceId));
  state.competitorExtractionRules = [...otherRules, ...(data.rules || [])];
  renderCompetitorExtractionTrainer();
  showToast(data.message || "Regole di estrazione salvate.", "success");
}

async function testExtractionSource(sourceId, options = {}) {
  if (!isFounder() || !sourceId) return;
  const endpoint = options.forceAi ? "extraction-ai-assisted" : "extraction-test";
  const data = await apiRequest(`/quotazioni/competitors/sources/${encodeURIComponent(sourceId)}/${endpoint}`, {
    method: "POST",
    body: JSON.stringify({ save_quotes: true }),
    timeoutMs: options.forceAi ? 180000 : 90000
  });
  state.competitorExtractionResults = {
    ...(state.competitorExtractionResults || {}),
    [sourceId]: data
  };
  showToast(
    data.quotes_saved
      ? `Estrazione completata. Quotazioni salvate: ${data.quotes_saved}.`
      : data.message || "Dato non rilevato: controlla anchor, selettore o regex.",
    data.quotes_saved ? "success" : "warning"
  );
  await loadGoldPredictionPanel({ silent: true });
}

async function handleCompetitorAction(event) {
  const fill = event.target.closest("[data-fill-competitor-source]");
  const disable = event.target.closest("[data-disable-competitor-source]");
  const forceSync = event.target.closest("[data-force-competitor-sync]");
  const forceOroExpress = event.target.closest("[data-force-oro-express-sync]");
  const forceOroDOro = event.target.closest("[data-force-oro-doro-sync]");
  const forceAmicoOro = event.target.closest("[data-force-amico-oro-sync]");
  const forceProntoGold = event.target.closest("[data-force-pronto-gold-sync]");
  const forceBordin = event.target.closest("[data-force-bordin-sync]");
  const forceGoldStandard = event.target.closest("[data-force-gold-standard-sync]");
  const forceOroInEuro = event.target.closest("[data-force-oro-in-euro-sync]");
  const forceGruppoOro24k = event.target.closest("[data-force-gruppo-oro-24k-sync]");
  const runAiExtract = event.target.closest("[data-run-ai-competitor-extract]");
  const toggleAutoSync = event.target.closest("[data-toggle-competitor-auto-sync]");
  const saveRules = event.target.closest("[data-save-extraction-rules]");
  const testRules = event.target.closest("[data-test-extraction-source]");
  const aiAssistedRules = event.target.closest("[data-ai-assisted-extraction]");
  if (fill) {
    const source = (state.competitorSources || []).find((item) => String(item.id) === String(fill.dataset.fillCompetitorSource));
    if (source && competitorQuoteForm) {
      competitorQuoteForm.competitor_name.value = source.name || "";
      competitorQuoteForm.url.value = source.website_url || "";
      competitorQuoteForm.price_per_gram?.focus();
      showToast("Fonte competitor pronta per inserire una quotazione manuale.", "success");
    }
    return;
  }
  if (forceSync && isFounder()) {
    await forceCompetitorAutoSync(forceSync.dataset.forceCompetitorSync || "all");
    return;
  }
  if (forceOroExpress && isFounder()) {
    await forceOroExpressSync();
    return;
  }
  if (forceOroDOro && isFounder()) {
    await forceOroDOroSync();
    return;
  }
  if (forceAmicoOro && isFounder()) {
    await forceAmicoOroSync();
    return;
  }
  if (forceProntoGold && isFounder()) {
    await forceProntoGoldSync();
    return;
  }
  if (forceBordin && isFounder()) {
    await forceBordinSync();
    return;
  }
  if (forceGoldStandard && isFounder()) {
    await forceGoldStandardSync();
    return;
  }
  if (forceOroInEuro && isFounder()) {
    await forceOroInEuroSync();
    return;
  }
  if (forceGruppoOro24k && isFounder()) {
    await forceGruppoOro24kSync();
    return;
  }
  if (runAiExtract && isFounder()) {
    await runAiCompetitorExtraction(runAiExtract.dataset.runAiCompetitorExtract || "all");
    return;
  }
  if (toggleAutoSync && isFounder()) {
    await toggleCompetitorAutoSync(toggleAutoSync.dataset.toggleCompetitorAutoSync, toggleAutoSync.dataset.nextAutoSync);
    return;
  }
  if (saveRules && isFounder()) {
    await withButtonBusy(saveRules, "Salvo...", () => saveExtractionRules(saveRules.dataset.saveExtractionRules));
    return;
  }
  if (testRules && isFounder()) {
    await withButtonBusy(testRules, "Testo...", () => testExtractionSource(testRules.dataset.testExtractionSource));
    return;
  }
  if (aiAssistedRules && isFounder()) {
    await withButtonBusy(aiAssistedRules, "Analizzo...", () => testExtractionSource(aiAssistedRules.dataset.aiAssistedExtraction, { forceAi: true }));
    return;
  }
  if (disable && isFounder()) {
    await apiRequest(`/quotazioni/competitors/sources/${encodeURIComponent(disable.dataset.disableCompetitorSource)}`, {
      method: "DELETE"
    });
    showToast("Fonte competitor disattivata.", "success");
    await loadGoldPredictionPanel({ silent: true });
  }
}

function askAurumGoldPrediction() {
  void explainPriceWithAurum(buildGeneralPriceExplanationContext());
}

function explainBuybackSimulation() {
  const context = renderBuybackSimulation();
  if (!context) {
    showToast("Prima esegui una simulazione prezzo valida.", "warning");
    return;
  }
  void explainPriceWithAurum(context, {
    question: buildPriceExplanationQuestion(context),
    immediateLocal: true,
    skipRemote: true
  });
}

async function setPracticeMeta(options = {}) {
  const now = new Date();
  document.getElementById("practiceDate").value = now.toISOString().slice(0, 10);
  document.getElementById("practiceTime").value = now.toTimeString().slice(0, 5);
  if (options.deferPracticeNumber) {
    document.getElementById("practiceNumber").value = "";
    document.getElementById("sidePracticeNumber").textContent = "In assegnazione";
    updatePracticeNumber().catch(() => {
      showToast("Numerazione atto momentaneamente non disponibile.");
    });
    return;
  }
  await updatePracticeNumber();
}

async function updatePracticeNumber() {
  const storeSelect = document.getElementById("storeCode");
  const storeCode = storeSelect?.value || "NEGOZIO";
  const selectedDate = document.getElementById("practiceDate").value;
  const year = selectedDate ? Number(selectedDate.slice(0, 4)) : new Date().getFullYear();

  if (state.editingPracticeNumber) {
    document.getElementById("practiceNumber").value = state.editingPracticeNumber;
    document.getElementById("sidePracticeNumber").textContent = state.editingPracticeNumber;
    document.getElementById("operatorStoreName").textContent = `Negozio ${storeSelect?.selectedOptions[0]?.textContent || ""}`;
    return;
  }

  let nextNumber = null;
  try {
    const data = await apiRequest(`/atti/next-number?storeCode=${encodeURIComponent(storeCode)}&year=${year}`);
    nextNumber = data.nextNumber;
  } catch {
    const lastNumber = demoActs.reduce((max, act) => {
      const match = String(act.practiceNumber || "").match(/^OA-([^-]+)-(\d{4})-(\d+)$/);
      if (!match) return max;
      const [, actStore, actYear, actNumber] = match;
      if (actStore !== storeCode || Number(actYear) !== year) return max;
      return Math.max(max, Number(actNumber));
    }, 0);
    nextNumber = lastNumber + 1;
  }

  const practiceNumber = `OA-${storeCode}-${year}-${nextNumber}`;
  document.getElementById("practiceNumber").value = practiceNumber;
  document.getElementById("sidePracticeNumber").textContent = practiceNumber;
  document.getElementById("operatorStoreName").textContent = `Negozio ${storeSelect?.selectedOptions[0]?.textContent || ""}`;
}

function updateSaleTotal() {
  document.getElementById("summaryTotal").textContent = formatEuro(saleTotalAmount());
}

function updateCustomerSummary() {
  const name = fieldValue('[name="nome"]').trim();
  const surname = fieldValue('[name="cognome"]').trim();
  const fiscalCode = fieldValue('[name="cf"]').trim();
  const customer = [name, surname].filter(Boolean).join(" ");
  document.getElementById("summaryClient").textContent = customer || "Dati non inseriti";
  document.getElementById("summaryFiscalCode").textContent = fiscalCode || "Dato non inserito";
}

function updateCededItems() {
  const rows = document.querySelectorAll(".ceded-item-row");

  rows.forEach((row, index) => {
    row.querySelector(".row-number").textContent = index + 1;
    const removeButton = row.querySelector(".remove-row");
    removeButton.disabled = rows.length === 1;
  });

  state.cededItems = rows.length;
  const materialTypes = activeMetals().length || 1;
  document.getElementById("summaryItems").textContent = materialTypes === 1
    ? "1 tipologia di prezioso registrato"
    : `${materialTypes} tipologie di preziosi registrati`;
  renderWeightFields();
  renderMaterialAmountFields();
  renderPreciousCaptureCards();
  updateAttachmentState();
}

function updateTitleOptions(row) {
  const selects = row.querySelectorAll("select");
  const metalSelect = selects[0];
  const titleSelect = selects[1];
  if (!metalSelect || !titleSelect) return;

  const currentTitle = titleSelect.value;
  const options = titleOptionsByMetal[metalSelect.value] || titleOptionsByMetal.Oro;
  titleSelect.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
  if (options.includes(currentTitle)) titleSelect.value = currentTitle;
  else if (metalSelect.value === "Oro") titleSelect.value = "18 kt";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value ?? ""));
  return String(value ?? "").replace(/["\\]/g, "\\$&");
}

function fieldValue(selector) {
  return document.querySelector(selector)?.value || "";
}

function hasValue(selector) {
  return fieldValue(selector).trim().length > 0;
}

function missingClientDataFields() {
  const checks = [
    ["Negozio", "#storeCode"],
    ["Atto di vendita n.", "#practiceNumber"],
    ["Data compilazione", "#practiceDate"],
    ["Ora compilazione", "#practiceTime"],
    ["Nome", '[name="nome"]'],
    ["Cognome", '[name="cognome"]'],
    ["Data di nascita", '[name="nascita"]'],
    ["Luogo di nascita", '[name="luogo"]'],
    ["Provincia nascita", '[name="provinciaNascita"]'],
    ["Codice fiscale", '[name="cf"]'],
    ["Telefono", '[name="telefono"]'],
    ["Indirizzo di residenza", '[name="indirizzo"]'],
    ["Provincia residenza", '[name="provinciaResidenza"]'],
    ["Professione lavorativa", '[name="professione"]']
  ];
  return checks.filter(([, selector]) => !hasValue(selector)).map(([label]) => label);
}

function missingIdentityDocumentFields() {
  const checks = [
    ["Tipo documento", '[name="tipoDocumento"]'],
    ["Numero documento", '[name="numeroDocumento"]'],
    ["Scadenza documento", '[name="scadenzaDocumento"]']
  ];
  return checks.filter(([, selector]) => !hasValue(selector)).map(([label]) => label);
}

function updateChecklistState() {
  const checklist = document.querySelectorAll(".checklist input");
  if (!checklist.length) return;

  const required = requiredCaptureKeys();
  const documentKeys = required.slice(0, 4);
  const practiceKeys = required.slice(4);
  checklist[0].checked = missingClientDataFields().length === 0;
  checklist[1].checked = missingIdentityDocumentFields().length === 0;
  checklist[2].checked = state.signatures.every(Boolean);
  checklist[3].checked = documentKeys.length > 0 && documentKeys.every((key) => state.uploadedCaptures.has(key));
  checklist[4].checked = missingSaleFields().length === 0 && practiceKeys.every((key) => state.uploadedCaptures.has(key));
}

function missingCustomerFields() {
  const checks = [
    ["Negozio", "#storeCode"],
    ["Atto di vendita n.", "#practiceNumber"],
    ["Data compilazione", "#practiceDate"],
    ["Ora compilazione", "#practiceTime"],
    ["Nome", '[name="nome"]'],
    ["Cognome", '[name="cognome"]'],
    ["Data di nascita", '[name="nascita"]'],
    ["Luogo di nascita", '[name="luogo"]'],
    ["Provincia nascita", '[name="provinciaNascita"]'],
    ["Codice fiscale", '[name="cf"]'],
    ["Telefono", '[name="telefono"]'],
    ["Indirizzo di residenza", '[name="indirizzo"]'],
    ["Provincia residenza", '[name="provinciaResidenza"]'],
    ["Tipo documento", '[name="tipoDocumento"]'],
    ["Numero documento", '[name="numeroDocumento"]'],
    ["Scadenza documento", '[name="scadenzaDocumento"]'],
    ["Professione lavorativa", '[name="professione"]']
  ];
  return checks.filter(([, selector]) => !hasValue(selector)).map(([label]) => label);
}

function missingSaleFields() {
  const missing = [];
  if (!hasValue("#paymentMethod")) missing.push("Metodo pagamento");
  if (saleTotalAmount() <= 0) missing.push("Totale corrisposto");
  if (cashPaymentLimitViolation()) missing.push("Metodo pagamento a norma di legge");
  if (paymentRequiresIban() && !isValidIban(fieldValue("#paymentIban"))) {
    missing.push("IBAN valido per bonifico");
  }
  materialAmountRows().forEach((row) => {
    if (Number(row.amount || 0) <= 0) missing.push(`Importo ${row.metal}`);
  });
  if (materialAmountRows().length && Math.abs(materialAmountTotal() - saleTotalAmount()) > 0.01) {
    missing.push("Ripartizione importo uguale al totale corrisposto");
  }

  const itemRows = [...document.querySelectorAll(".ceded-item-row")];
  if (!itemRows.length) {
    missing.push("Oggetti ceduti");
  } else {
    itemRows.forEach((row, index) => {
      const description = row.querySelector("input")?.value.trim();
      const selects = row.querySelectorAll("select");
      if (!description) missing.push(`Descrizione oggetto riga ${index + 1}`);
      if (!selects[0]?.value) missing.push(`Metallo riga ${index + 1}`);
      if (!selects[1]?.value) missing.push(`Titolo riga ${index + 1}`);
    });
  }

  return missing;
}

function missingSignatureFields() {
  return state.signatures.every(Boolean) ? [] : ["Tre firme cliente e firma operatore"];
}

function missingDocumentFields() {
  return requiredCaptureKeys()
    .filter((key) => !state.uploadedCaptures.has(key))
    .map((key) => key.replaceAll("-", " "));
}

function validationMessage(missing, copyLabel) {
  const preview = missing.slice(0, 4).join(", ");
  const suffix = missing.length > 4 ? ` e altri ${missing.length - 4} campi` : "";
  return `Per stampare ${copyLabel} completa: ${preview}${suffix}.`;
}

function validatePrintScope(scope) {
  const missing = [
    ...missingCustomerFields(),
    ...missingSaleFields(),
    ...missingSignatureFields()
  ];

  if (scope === "company") missing.push(...missingDocumentFields());
  return missing;
}

function shouldPrintWeightOnCustomerCopy() {
  return document.getElementById("printWeightCustomer")?.checked || false;
}

function activeMetals() {
  const metals = new Set([...document.querySelectorAll(".ceded-item-row")].map((row) => row.querySelector("select")?.value).filter(Boolean));
  return metalOrder.filter((metal) => metals.has(metal));
}

function activeMetalTitleLots() {
  const lots = new Map();
  collectCededItems().forEach((item) => {
    const metal = item.metal || "Oro";
    const title = item.title || "Titolo non indicato";
    const key = `${metal}|${title}`;
    lots.set(key, { key, metal, title });
  });
  return [...lots.values()].sort((first, second) => (
    metalOrder.indexOf(first.metal) - metalOrder.indexOf(second.metal)
    || String(first.title).localeCompare(String(second.title))
  ));
}

function pureMaterialLabel(metal) {
  return {
    Oro: "oro",
    Argento: "argento",
    Platino: "platino"
  }[metal] || "materiale prezioso";
}

function renderMaterialAmountFields() {
  const container = document.getElementById("materialAmountFields");
  if (!container) return;
  const panel = document.getElementById("materialAmountPanel") || container.closest(".material-amount-panel");
  const metals = activeMetals();
  const shouldShowSplit = metals.length > 1;

  const previousValues = {};
  container.querySelectorAll("input[data-material-amount]").forEach((input) => {
    previousValues[input.dataset.materialAmount] = input.value;
  });

  if (panel) panel.hidden = !shouldShowSplit;
  if (!shouldShowSplit) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = metals.map((metal) => `
    <label class="material-amount-field">
      <span>Di cui ${metal}</span>
      <input data-material-amount="${metal}" type="number" min="0" step="0.01" value="${escapeHtml(previousValues[metal] || "")}" placeholder="Importo ${metal.toLowerCase()}">
    </label>
  `).join("");
}

function materialAmountRows() {
  return [...document.querySelectorAll("#materialAmountFields input[data-material-amount]")].map((input) => ({
    metal: input.dataset.materialAmount,
    amount: input.value || "0"
  }));
}

function materialAmountTotal() {
  return materialAmountRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function materialAmountsBlockFromRows(rows = materialAmountRows()) {
  if (rows.length < 2) return "";
  return `
    <div class="print-field material-amount-print">
      <span>Ripartizione importo</span>
      ${rows.map((row) => `<strong>${escapeHtml(row.metal)}: ${escapeHtml(formatEuro(Number(row.amount || 0)))}</strong>`).join("")}
    </div>
  `;
}

function buildBullionQuoteBlock() {
  return "";
}

function requiredCaptureKeys() {
  const documentSlug = currentDocumentSlug();
  const documentKeys = [`documento-fronte-${documentSlug}`, `documento-retro-${documentSlug}`, "codice-fiscale-fronte", "codice-fiscale-retro"];
  const preciousKeys = activeMetals().flatMap((metal) => [
    `preziosi-${metal.toLowerCase()}-fronte`,
    `preziosi-${metal.toLowerCase()}-retro`
  ]);
  const paymentKeys = paymentRequiresProof() ? [paymentCaptureKey()] : [];
  return [...documentKeys, ...preciousKeys, ...paymentKeys];
}

function captureClassForMetal(metal) {
  return {
    Oro: "gold",
    Argento: "silver",
    Platino: "platinum"
  }[metal] || "gold";
}

function captureActionsMarkup() {
  return `
    <div class="capture-actions">
      <button type="button" data-view-capture>Visualizza foto</button>
      <button type="button" data-delete-capture>Elimina foto</button>
    </div>
  `;
}

function captureGroupConfig(group = "") {
  if (group === "identity") {
    const label = currentDocumentLabel();
    return {
      title: "Documento identità / patente / passaporto",
      description: `Documento selezionato: ${fieldValue("#documentType") || "Carta identità"}`,
      slots: [
        { key: documentCaptureKey("fronte"), label: `Fronte ${label}`, action: "Rifai fronte" },
        { key: documentCaptureKey("retro"), label: `Retro ${label}`, action: "Rifai retro" }
      ]
    };
  }
  if (group === "fiscal") {
    return {
      title: "Codice fiscale / tessera sanitaria",
      description: "Carica fronte e retro della tessera.",
      slots: [
        { key: "codice-fiscale-fronte", label: "Fronte tessera", action: "Rifai fronte" },
        { key: "codice-fiscale-retro", label: "Retro tessera", action: "Rifai retro" }
      ]
    };
  }
  if (group.startsWith("precious:")) {
    const metal = group.split(":")[1] || "Oro";
    return {
      title: "Foto preziosi",
      description: `Preziosi in ${metal.toLowerCase()}: foto frontale e foto fianco/laterale.`,
      slots: [
        { key: `preziosi-${metal.toLowerCase()}-fronte`, label: "Foto frontale preziosi", action: "Rifai fronte" },
        { key: `preziosi-${metal.toLowerCase()}-retro`, label: "Foto fianco/laterale preziosi", action: "Rifai retro" }
      ]
    };
  }
  if (group === "payment") {
    return {
      title: "Contabile pagamento",
      description: "Carica immagine o PDF della contabile.",
      slots: [{ key: paymentCaptureKey(), label: "Contabile pagamento", action: "Rifai contabile" }]
    };
  }
  return null;
}

function captureGroupSlotMarkup(slot) {
  const file = state.captureFiles.get(slot.key);
  const source = capturePreviewSource(file);
  const loaded = state.uploadedCaptures.has(slot.key);
  const preview = source && !isCapturePdf(file, source)
    ? `<img src="${source}" alt="${escapeHtml(slot.label)}">`
    : `<strong>${loaded ? "Allegato presente" : "Da caricare"}</strong>`;
  return `
    <article class="capture-group-slot ${loaded ? "loaded" : ""}">
      <span>${escapeHtml(slot.label)}</span>
      <div>${preview}</div>
      <button class="ghost-button" type="button" data-trigger-capture-key="${escapeHtml(slot.key)}">${loaded ? escapeHtml(slot.action) : "Carica / scatta"}</button>
    </article>
  `;
}

function openCaptureGroupModal(group) {
  const config = captureGroupConfig(group);
  if (!config) return;
  state.captureGroup = group;
  previewTitle.textContent = config.title;
  previewBody.innerHTML = `
    <section class="capture-group-modal">
      <p>${escapeHtml(config.description)}</p>
      <div class="capture-group-grid">${config.slots.map(captureGroupSlotMarkup).join("")}</div>
      <div class="document-scan-actions">
        <button class="danger-button" type="button" data-remove-capture-group="${escapeHtml(group)}">Rimuovi</button>
        <button class="warning-button" type="button" data-reload-capture-group="${escapeHtml(group)}">Aggiorna anteprima</button>
        <button class="primary-button" type="button" data-confirm-capture-group>Conferma</button>
      </div>
    </section>
  `;
  previewModal.hidden = false;
}

function removeCaptureGroup(group) {
  const config = captureGroupConfig(group);
  if (!config) return;
  config.slots.forEach((slot) => {
    const previous = state.captureFiles.get(slot.key);
    revokeCaptureUrl(previous);
    state.captureFiles.delete(slot.key);
    state.uploadedCaptures.delete(slot.key);
    const input = document.querySelector(`.capture-card[data-capture-key="${cssEscape(slot.key)}"] input`);
    if (input) input.value = "";
  });
  state.attachments = state.uploadedCaptures.size;
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  renderPreciousCaptureCards();
  updateAttachmentState();
  updateChecklistState();
  openCaptureGroupModal(group);
}

function fileToDataUrl(file) {
  if (file.type && file.type.startsWith("image/")) return imageFileToOptimizedDataUrl(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function imageFileToOptimizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.74));
      };
      image.onerror = reject;
      image.src = String(reader.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function optimizeImageDataUrl(dataUrl, options = {}) {
  return new Promise((resolve) => {
    if (!String(dataUrl || "").startsWith("data:image/")) {
      resolve(dataUrl || "");
      return;
    }
    const image = new Image();
    image.onload = () => {
      const maxSide = options.maxSide || 1200;
      const quality = options.quality || 0.74;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl || "");
    image.src = dataUrl;
  });
}

function revokeCaptureUrl(file) {
  if (file?.url && String(file.url).startsWith("blob:")) URL.revokeObjectURL(file.url);
}

function capturePreviewSource(file) {
  return file?.dataUrl || file?.url || "";
}

function isCapturePdf(file, source) {
  return String(file?.type || "").includes("pdf") || String(source || "").startsWith("data:application/pdf");
}

function canvasToOptimizedDataUrl(canvas) {
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const ctx = output.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(canvas, 0, 0);
  return output.toDataURL("image/jpeg", 0.72);
}

function ensureCaptureActions() {
  document.querySelectorAll(".capture-card").forEach((card) => {
    if (!card.querySelector(".capture-actions")) card.insertAdjacentHTML("beforeend", captureActionsMarkup());
  });
}

function renderPreciousCaptureCards() {
  const grid = document.getElementById("preciousCaptureGrid");
  if (!grid) return;

  grid.innerHTML = activeMetals().map((metal) => `
    <div class="capture-combo-card ${captureClassForMetal(metal)}" data-capture-group="precious:${escapeHtml(metal)}">
      <div>
        <span>Preziosi ${escapeHtml(metal)}</span>
        <strong>Foto preziosi</strong>
        <em>Carica o scatta due foto dei preziosi in ${escapeHtml(metal.toLowerCase())}.</em>
      </div>
      ${[
        { side: "fronte", label: "Foto 1" },
        { side: "retro", label: "Foto 2" }
      ].map((photo) => {
        const key = `preziosi-${metal.toLowerCase()}-${photo.side}`;
        const loaded = state.uploadedCaptures.has(key);
        return `
          <label class="capture-card ${captureClassForMetal(metal)} ${loaded ? "loaded" : ""}" data-capture-key="${key}">
            <input type="file" accept="image/*" capture="environment">
            <span>${escapeHtml(photo.label)}</span>
            <strong>${escapeHtml(photo.label)} ${escapeHtml(metal.toLowerCase())}</strong>
            <em>${loaded ? "Foto acquisita" : "Tocca per fotografare"}</em>
            ${captureActionsMarkup()}
          </label>
        `;
      }).join("")}
    </div>
  `).join("");
  ensureCaptureActions();
}

function renderWeightFields() {
  const container = document.getElementById("totalWeightFields");
  if (!container) return;

  const previousValues = {};
  container.querySelectorAll("input[data-metal-weight]").forEach((input) => {
    previousValues[input.dataset.metalWeight] = input.value;
    if (input.dataset.metalKey) previousValues[input.dataset.metalKey] = input.value;
  });

  container.innerHTML = activeMetalTitleLots().map((lot) => `
    <label class="metal-weight-field">
      <span>Peso totale oggetti preziosi in ${lot.metal.toLowerCase()} ${lot.title}</span>
      <div class="metal-weight-input-wrap">
        <input data-metal-weight="${lot.metal}" data-metal-title="${escapeHtml(lot.title)}" data-metal-key="${escapeHtml(lot.key)}" type="number" value="${escapeHtml(previousValues[lot.key] || previousValues[lot.metal] || "0")}" min="0" step="0.01">
        <em>gr</em>
      </div>
    </label>
  `).join("");
}

function weightRows() {
  return [...document.querySelectorAll("#totalWeightFields input[data-metal-weight]")].map((input) => ({
    metal: input.dataset.metalWeight,
    title: input.dataset.metalTitle || "",
    key: input.dataset.metalKey || input.dataset.metalWeight,
    value: input.value || "0"
  }));
}

function buildWeightBlock(label) {
  const rows = weightRows().map((row) => `<li>Peso totale oggetti preziosi in ${escapeHtml(row.metal.toLowerCase())}: ${escapeHtml(row.value)} gr</li>`).join("");
  return `
    <div class="print-internal">
      ${label ? `<span>${escapeHtml(label)}</span>` : ""}
      <strong>Peso totale oggetti preziosi</strong>
      <ul>${rows}</ul>
    </div>
  `;
}

function signatureRows() {
  return [...document.querySelectorAll("canvas[data-signature]")].map((canvas, index) => {
    const label = SIGNATURE_LABELS[index] || `Firma ${index + 1}`;
    const image = state.signatures[index] ? (state.loadedSignatureImages[index] || canvasToOptimizedDataUrl(canvas)) : "";
    return `
      <div class="print-signature">
        <span>${label}</span>
        ${image ? `<img src="${image}" alt="${label}">` : "Firma non acquisita"}
      </div>
    `;
  }).join("");
}

function signatureImages() {
  return [...document.querySelectorAll("canvas[data-signature]")].map((canvas, index) => (
    state.signatures[index] ? (state.loadedSignatureImages[index] || canvasToOptimizedDataUrl(canvas)) : ""
  ));
}

function attachmentRows() {
  return printableAttachmentRows(requiredCaptureKeys(), state.uploadedCaptures, state.captureFiles);
}

function companyAttachmentPrintPage() {
  const rows = attachmentRows();
  return `
    <section class="print-copy company-copy attachment-copy">
      <h1>Allegati fotografici atto di vendita</h1>
      <p class="print-legal">Foto documenti cliente, foto preziosi e contabile pagamento allegati alla copia aziendale interna.</p>
      <div class="print-attachments full-attachments">${rows}</div>
    </section>
  `;
}

function buildPrintCopy(title, weightLabel, scope, includeWeight = false) {
  const items = [...document.querySelectorAll(".ceded-item-row")].map((row, index) => {
    const description = row.querySelector("input")?.value || "";
    const selects = row.querySelectorAll("select");
    return `
      <div class="print-item">
        <strong>${index + 1}</strong>
        <div><span>Descrizione</span>${escapeHtml(description)}</div>
        <div><span>Metallo</span>${escapeHtml(selects[0]?.value || "")}</div>
        <div><span>Titolo</span>${escapeHtml(selects[1]?.value || "")}</div>
      </div>
    `;
  }).join("");

  const internalWeight = (weightLabel || includeWeight) ? buildWeightBlock(weightLabel) : "";
  const internalSections = scope === "company" ? `
      ${internalWeight}
  ` : internalWeight;
  const customerOnly = scope === "customer";
  const customerLogo = customerOnly ? `
      <div class="customer-copy-logo">
        <img src="oroactive-logo.png" alt="OroActive">
      </div>
  ` : "";

  const mainCopy = `
    <section class="print-copy ${scope === "company" ? "company-copy" : "customer-copy"}">
      ${customerLogo}
      <h1>Atto di vendita OroActive - ${title}</h1>
      <div class="print-meta">
        <div class="print-field"><span>Atto n.</span>${escapeHtml(fieldValue("#practiceNumber"))}</div>
        <div class="print-field"><span>Data</span>${escapeHtml(fieldValue("#practiceDate"))}</div>
        <div class="print-field"><span>Ora</span>${escapeHtml(fieldValue("#practiceTime"))}</div>
      </div>

      <h2>Dati cliente</h2>
      <div class="print-grid">
        <div class="print-field"><span>Nome</span>${escapeHtml(fieldValue('[name="nome"]'))}</div>
        <div class="print-field"><span>Cognome</span>${escapeHtml(fieldValue('[name="cognome"]'))}</div>
        <div class="print-field"><span>Data nascita</span>${escapeHtml(fieldValue('[name="nascita"]'))}</div>
        <div class="print-field"><span>Luogo nascita</span>${escapeHtml(fieldValue('[name="luogo"]'))}</div>
        <div class="print-field"><span>Provincia nascita</span>${escapeHtml(fieldValue('[name="provinciaNascita"]'))}</div>
        <div class="print-field"><span>Residenza</span>${escapeHtml(fieldValue('[name="indirizzo"]'))}</div>
        <div class="print-field"><span>Provincia residenza</span>${escapeHtml(fieldValue('[name="provinciaResidenza"]'))}</div>
        <div class="print-field"><span>Codice fiscale</span>${escapeHtml(fieldValue('[name="cf"]'))}</div>
        <div class="print-field"><span>Telefono</span>${escapeHtml(fieldValue('[name="telefono"]'))}</div>
        <div class="print-field"><span>Cittadinanza</span>${escapeHtml(fieldValue('[name="cittadinanza"]'))}</div>
        <div class="print-field"><span>Sesso</span>${escapeHtml(fieldValue('[name="sesso"]'))}</div>
        <div class="print-field"><span>Tipo documento</span>${escapeHtml(fieldValue('[name="tipoDocumento"]'))}</div>
        <div class="print-field"><span>Numero documento</span>${escapeHtml(fieldValue('[name="numeroDocumento"]'))}</div>
        <div class="print-field"><span>Data rilascio documento</span>${escapeHtml(fieldValue('[name="dataRilascioDocumento"]'))}</div>
        <div class="print-field"><span>Scadenza documento</span>${escapeHtml(fieldValue('[name="scadenzaDocumento"]'))}</div>
        <div class="print-field"><span>Professione lavorativa</span>${escapeHtml(fieldValue('[name="professione"]'))}</div>
      </div>

      <h2>Vendita</h2>
      <div class="print-grid">
        <div class="print-field"><span>Metodo pagamento</span>${escapeHtml(fieldValue("#paymentMethod"))}</div>
        <div class="print-field"><span>Totale corrisposto</span>${escapeHtml(formatEuro(Number(fieldValue("#saleTotal"))))}</div>
        ${materialAmountsBlockFromRows()}
        ${customerOnly ? "" : `<div class="print-field"><span>Note operatore</span>${escapeHtml(document.querySelector(".textarea-label textarea")?.value || "")}</div>`}
      </div>

      <h2>Oggetti ceduti</h2>
      <div class="print-items">${items}</div>
      ${customerOnly ? "" : buildBullionQuoteBlock()}
      ${internalSections}
      ${customerOnly ? "" : `
        <h2>Dichiarazioni</h2>
        <p class="print-legal">Gli oggetti venduti sopra descritti sono usati e/o in cattivo stato di conservazione. Autorizzo la loro ulteriore alterazione per poter eseguire il test di verifica del metallo, determinarne il titolo e calcolarne il prezzo. Dichiaro inoltre che gli stessi sopra indicati oggetti non sono di illecita provenienza, di essere in possesso di tutti i diritti atti alla vendita degli stessi e di accettare e consentire il trattamento dei propri dati personali (Legge 196/03). La presente vale quale ricevuta e saldo per la somma riportata alla voce prezzo complessivo. Il venditore si obbliga fin da ora a restituire il ricavato della vendita qualora, a seguito di controlli di verifica, risulti che gli oggetti consegnati non siano corrispondenti nel valore e nella qualità a quelli dichiarati al momento della vendita e/o risultino di non essere di metallo prezioso. Dichiaro infine di aver letto attentamente quanto sopra riportato e che ai sensi e per gli effetti degli art. 1341 e 1342 del c.c. approvo incondizionatamente.</p>
      `}
      <h2>Firme</h2>
      <div class="print-signatures">${signatureRows()}</div>
    </section>
  `;

  return scope === "company" ? `${mainCopy}${companyAttachmentPrintPage()}` : mainCopy;
}

function preparePrintPacket() {
  renderPaymentCaptureCard();
  printPacket.innerHTML = [
    buildPrintCopy("Copia cliente", "", "customer", shouldPrintWeightOnCustomerCopy()),
    buildPrintCopy("Copia aziendale interna", "Dato interno aziendale", "company")
  ].join("");
}

async function printBothCopies() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  if (!(await ensureGuidedQualityAllows("print", { status: "completed" }))) return;
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "le copie cliente e aziendale"));
    return;
  }
  preparePrintPacket();
  window.print();
}

async function printCustomerCopy() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  if (!(await ensureGuidedQualityAllows("print", { status: "completed" }))) return;
  const missing = validatePrintScope("customer");
  if (missing.length) {
    showToast(validationMessage(missing, "la copia cliente"));
    return;
  }
  renderPaymentCaptureCard();
  printPacket.innerHTML = buildPrintCopy(
    "Copia cliente",
    "",
    "customer",
    shouldPrintWeightOnCustomerCopy()
  );
  window.print();
}

async function printCompanyCopy() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  if (!(await ensureGuidedQualityAllows("print", { status: "completed" }))) return;
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "la copia aziendale"));
    return;
  }
  renderPaymentCaptureCard();
  try {
    await requestPdf("/pdf/act", {
      title: "Copia aziendale interna",
      act: currentActSnapshot(state.editingPracticeNumber ? "Archiviata" : "Archiviata")
    }, `OroActive-${fieldValue("#practiceNumber") || "atto"}-copia-aziendale.pdf`);
  } catch (error) {
    showToast(error.message || "PDF copia aziendale non generato.");
  }
}

async function showPrintPreview(scope) {
  renderPaymentCaptureCard();
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  if (!(await ensureGuidedQualityAllows("print", { status: "completed" }))) return;
  const isCompany = scope === "company";
  const missing = validatePrintScope(scope);
  if (missing.length) {
    showToast(validationMessage(missing, isCompany ? "la copia aziendale" : "la copia cliente"));
    return;
  }
  const html = buildPrintCopy(
    isCompany ? "Copia aziendale interna" : "Copia cliente",
    isCompany ? "Dato interno aziendale" : "",
    scope,
    !isCompany && shouldPrintWeightOnCustomerCopy()
  );
  previewTitle.textContent = `Anteprima ${isCompany ? "copia aziendale interna" : "copia cliente"}`;
  previewBody.innerHTML = html;
  previewModal.hidden = false;
}

async function showCustomerCopyOptions() {
  if (!(await ensureGuidedQualityAllows("print", { status: "completed" }))) return;
  const act = currentActSnapshot("Archiviata");
  const previewHtml = buildPrintCopy("Copia cliente", "", "customer", shouldPrintWeightOnCustomerCopy());
  previewTitle.textContent = "Anteprima copia cliente";
  previewBody.innerHTML = `
    <section class="customer-copy-options">
      <p>Anteprima stampa copia cliente: contiene solo sezione cliente e sezione vendita.</p>
      <div class="preview-action-stack">
        <button class="primary-button" type="button" data-customer-copy-action="download">Scarica PDF</button>
        <button class="ghost-button" type="button" data-customer-copy-action="email">Invia via email</button>
        <button class="ghost-button" type="button" data-customer-copy-action="whatsapp">Invia via WhatsApp</button>
      </div>
    </section>
    ${previewHtml}
  `;
  previewModal.hidden = false;
}

async function handleCustomerCopyAction(action) {
  const act = currentActSnapshot("Archiviata");
  if (action === "download") {
    await requestPdf("/pdf/act", { title: `Copia cliente ${act.practiceNumber}`, scope: "customer", act }, `copia-cliente-${act.practiceNumber || "oroactive"}.pdf`);
    return;
  }
  if (action === "email") {
    if (!act.email) {
      showToast("Inserisci l'email del cliente prima di preparare l'invio.");
      return;
    }
    const subject = encodeURIComponent("Copia atto di vendita OroActive");
    const body = encodeURIComponent("Gentile Cliente,\n\nle inviamo la copia dell'atto di vendita OroActive. Per tutela dei dati personali, il documento PDF deve essere allegato o condiviso tramite link sicuro generato dal gestionale.\n\nCordiali saluti,\nOroActive");
    window.location.href = `mailto:${encodeURIComponent(act.email)}?subject=${subject}&body=${body}`;
    return;
  }
  if (action === "whatsapp") {
    if (!act.phone) {
      showToast("Inserisci il telefono del cliente prima di preparare WhatsApp.");
      return;
    }
    const phone = String(act.phone).replace(/\D/g, "");
    const message = encodeURIComponent("Gentile Cliente, la copia del suo atto di vendita OroActive è pronta. Per sicurezza il PDF deve essere scaricato o condiviso tramite link sicuro dal gestionale.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener");
  }
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function currentLocationSafe() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timeout = window.setTimeout(() => resolve(null), 1800);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      () => {
        window.clearTimeout(timeout);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 1500, maximumAge: 60000 }
    );
  });
}

async function attachLegalSignatureMetadata(act) {
  const timestamp = new Date().toISOString();
  const signedPayload = sanitizeForSave({
    practiceNumber: act.practiceNumber,
    status: act.status,
    customer: {
      name: act.name,
      surname: act.surname,
      fiscalCode: act.fiscalCode
    },
    sale: {
      amount: act.amount,
      materials: act.materials,
      items: act.items
    },
    signatures: act.signatureImages?.map(Boolean)
  });
  const hash = await sha256Hex(JSON.stringify(signedPayload));
  return {
    ...act,
    legalSignature: {
      timestamp,
      documentHashSha256: hash,
      integrity: "SHA256",
      antiTamper: true,
      signedBy: displayUserFullName(state.currentUser),
      operatorId: state.currentUser?.id || null,
      location: await currentLocationSafe(),
      auditTrail: [
        ...(act.legalSignature?.auditTrail || []),
        { action: "save", status: act.status, timestamp, operator: displayUserFullName(state.currentUser) }
      ]
    }
  };
}

async function archiveCurrentPractice(status = "Archiviata", options = {}) {
  await refreshAmlCashCheck({ force: true });
  if (!fieldValue("#practiceNumber")) await updatePracticeNumber();
  if (!fieldValue("#practiceNumber")) {
    showToast("Numerazione atto momentaneamente non disponibile.");
    return false;
  }
  const review = currentQualityReview();
  if (review?.status === "negative" && !review.feedback) {
    showToast("Inserisci il feedback scritto per il controllo qualità negativo.");
    return false;
  }
  const requestedStatus = workflowStatusCode(status);
  const wantsFinalSave = requestedStatus === "completed"
    || requestedStatus === "archived_completed"
    || (requestedStatus === "archived_incomplete" && !options.destination);
  const targetStatus = requestedStatus === "draft"
    ? "draft"
    : requestedStatus === "suspended"
      ? "suspended"
      : requestedStatus === "completed"
        ? "completed"
        : wantsFinalSave
          ? "archived_completed"
          : requestedStatus;
  const isCompletion = ["completed", "archived_completed"].includes(targetStatus);
  if (requestedStatus !== "draft" && !options.skipQualityCheck) {
    const qualityDraft = currentActSnapshot(isCompletion ? targetStatus : "archived_completed");
    const allowed = await ensureGuidedQualityAllows(isCompletion ? "complete" : "archive", {
      status: isCompletion ? targetStatus : "archived_completed",
      draftData: qualityDraft
    });
    if (!allowed) return false;
  }
  const wasEditing = Boolean(state.editingPracticeNumber);
  const originalAct = wasEditing
    ? demoActs.find((act) => (
      (state.editingActId && String(act.id) === String(state.editingActId))
      || act.practiceNumber === state.editingPracticeNumber
    ))
    : null;
  let archivedAct = currentActSnapshot(targetStatus);
  if (originalAct) {
    archivedAct.operatorId = originalAct.operatorId ?? archivedAct.operatorId;
    archivedAct.operatorUsername = originalAct.operatorUsername || archivedAct.operatorUsername;
    archivedAct.operatorName = originalAct.operatorName || archivedAct.operatorName;
  }
  archivedAct = await attachLegalSignatureMetadata(archivedAct);
  archivedAct.readOnlyHtml = buildPrintCopy("Atto archiviato - Sola lettura", "Dato interno aziendale", "company");
  const shield = await evaluateAurumShield({ draftData: archivedAct, status: targetStatus, silent: true, loading: true });
  if (!(await confirmAurumShieldBeforeFinalSave(shield, {
    action: isCompletion ? "complete" : "archive",
    targetStatus,
    draftData: archivedAct,
    quality: state.guidedQualityCheck
  }))) return false;
  if (shield) archivedAct.aurumShield = shield;
  try {
    await saveActRecord(archivedAct, wasEditing ? "PUT" : "POST");
  } catch (error) {
    if (error.approval_required) {
      await requestApprovalForCurrentPractice({
        action: isCompletion ? "complete" : "archive",
        targetStatus,
        draftData: archivedAct,
        quality: error.quality_check || state.guidedQualityCheck,
        shield: error.aurum_shield || shield,
        reasons: error.reasons || frontendApprovalReasons({ quality: error.quality_check || state.guidedQualityCheck, shield: error.aurum_shield || shield }),
        askConfirm: true
      });
      return false;
    }
    showToast(error.message || "Errore nel salvataggio dell'atto.", "error");
    return false;
  }
  state.editingDirty = false;
  renderArchiveGroups();
  renderFusionGroups();
  if (!options.skipReset) {
    await resetCurrentPractice({ preserveStoreCode: true });
    if (options.destination === "menu") {
      if (wasEditing) setScreen("practice");
    } else {
      setScreen("archive");
    }
  }
  const successMessage = targetStatus === "archived_incomplete"
    ? "Atto archiviato. Puoi riaprirlo e completarlo dall'elenco."
    : targetStatus === "suspended"
      ? "Pratica salvata tra le sospese. Correggi i controlli prima di completarla."
    : targetStatus === "archived_completed"
      ? "Atto completato e archiviato correttamente."
      : targetStatus === "completed"
        ? "Atto completato correttamente."
        : wasEditing
          ? "Atto di vendita modificato e salvato."
          : "Atto di vendita salvato.";
  showToast(wasEditing && !["archived_incomplete", "suspended"].includes(targetStatus) ? "Atto di vendita modificato e salvato." : successMessage, "success");
  return true;
}

function compactActForAi(act = {}) {
  const {
    captureAttachments,
    signatureImages,
    readOnlyHtml,
    lastActCaptureAttachments,
    ...compact
  } = act;
  return {
    ...compact,
    capturesCount: Array.isArray(captureAttachments) ? captureAttachments.length : state.uploadedCaptures.size,
    signaturesStatus: Array.isArray(signatureImages)
      ? signatureImages.map(Boolean)
      : state.signatures
  };
}

async function runAiActCheck(act) {
  try {
    showLoading("Aurum Shield e Controllo Qualità...");
    return await apiRequest("/ai/controlla-atto", {
      method: "POST",
      timeoutMs: 45000,
      body: JSON.stringify({ atto: compactActForAi(act) })
    });
  } catch {
    return null;
  } finally {
    hideLoading();
  }
}

async function completeCurrentPractice() {
  return archiveCurrentPractice("completed");
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.courseTabShortcut) state.courseActiveTab = item.dataset.courseTabShortcut;
    setScreen(item.dataset.section);
  });
});

loginForm?.addEventListener("submit", handleLogin);
faceIdLoginButton?.addEventListener("click", loginWithFaceId);
logoutButton?.addEventListener("click", handleLogout);
registerFaceIdButton?.addEventListener("click", registerFaceId);
document.getElementById("userForm")?.addEventListener("submit", saveUser);
document.getElementById("resetUserForm")?.addEventListener("click", resetUserForm);
document.getElementById("usersList")?.addEventListener("click", (event) => {
  const goalButton = event.target.closest("[data-goal-message]");
  if (goalButton) {
    previewGoalMessage(goalButton.dataset.goalMessage);
    return;
  }
  const activityButton = event.target.closest("[data-user-activity]");
  if (activityButton) {
    showUserActivity(activityButton.dataset.userActivity);
    return;
  }
  const button = event.target.closest("[data-edit-user]");
  if (button) {
    editUser(button.dataset.editUser);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-user]");
  if (deleteButton) deleteUser(deleteButton.dataset.deleteUser);
});
document.getElementById("usersList")?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-user-action]");
  if (!select || !select.value) return;
  const id = select.dataset.userAction;
  if (select.value === "stats") showUserStatistics(id);
  if (select.value === "edit") editUser(id);
  if (select.value === "delete") deleteUser(id);
  select.value = "";
});
document.getElementById("userRole")?.addEventListener("change", configureUserFormPermissions);
mainMenuLogoRefresh?.addEventListener("click", triggerLogoRefresh);
mainMenuLogoRefresh?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  triggerLogoRefresh();
});
assistantForm?.addEventListener("submit", askAssistant);
aurumMascotRoot?.addEventListener("pointerdown", handleAurumPointerDown);
window.addEventListener("pointermove", handleAurumPointerMove, { passive: false });
window.addEventListener("pointerup", handleAurumPointerUp);
window.addEventListener("pointercancel", handleAurumPointerUp);
aurumMascotButton?.addEventListener("click", () => {
  if (state.aurumSuppressNextClick) {
    state.aurumSuppressNextClick = false;
    return;
  }
  aurumMascotButton.classList.add("aurum-clicked");
  window.setTimeout(() => aurumMascotButton.classList.remove("aurum-clicked"), 220);
  openAurumChat();
});
aurumChatClose?.addEventListener("click", closeAurumChat);
aurumResetPosition?.addEventListener("click", () => resetAurumFloatingPosition());
aurumTipClose?.addEventListener("click", () => {
  hideAurumTip();
  updateAurumMovement();
  scheduleAurumAvoidance();
});
aurumChatForm?.addEventListener("submit", askAurum);
aurumRememberYes?.addEventListener("click", saveAurumMemory);
aurumRememberNo?.addEventListener("click", () => {
  showAurumMemoryConsent(null);
  state.aurumMessages.push({ role: "assistant", content: "Va bene, non salvo questa informazione." });
  renderAurumMessages();
});
aurumSendDirectMessage?.addEventListener("click", () => {
  sendAurumDirectMessage(aurumMessageRecipient?.value || "", state.aurumLastUserMessage || "Messaggio riservato da Aurum", { fromAurum: true });
});
userMessageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const sent = await sendAurumDirectMessage(userMessageRecipient?.value || "", userMessageText?.value || "");
  if (sent && userMessageText) userMessageText.value = "";
});
[aurumEnabledToggle, aurumMovementToggle, aurumGreetingToggle, aurumMemoryToggle].forEach((toggle) => {
  toggle?.addEventListener("change", () => saveAurumSettings({
    enabled: Boolean(aurumEnabledToggle?.checked),
    movement: Boolean(aurumMovementToggle?.checked),
    greeting: Boolean(aurumGreetingToggle?.checked),
    memory: Boolean(aurumMemoryToggle?.checked)
  }));
});
aurumRefreshAdminData?.addEventListener("click", refreshAurumAdminData);
[
  aurumSupportRequestsList,
  userMessagesList
].forEach((container) => {
  container?.addEventListener("click", (event) => {
    const replyButton = event.target.closest("[data-reply-aurum-message]");
    const deleteButton = event.target.closest("[data-delete-aurum-message]");
    if (replyButton) replyAurumMessage(replyButton.dataset.replyAurumMessage, container);
    if (deleteButton) deleteAurumMessage(deleteButton.dataset.deleteAurumMessage);
  });
});
aurumResetLocalMemory?.addEventListener("click", () => {
  const userKey = state.currentUser?.id || displayUsername(state.currentUser) || "utente";
  Object.keys(localStorage)
    .filter((key) => key.startsWith("aurum_greeting_") && key.endsWith(`_${userKey}`))
    .forEach((key) => localStorage.removeItem(key));
  showToast("Saluto giornaliero Aurum resettato per il test.");
});
[aurumMemoriesList].forEach((container) => {
  container?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-aurum-memory]");
    if (button) deleteAurumMemory(button.dataset.deleteAurumMemory);
  });
});
knowledgeForm?.addEventListener("submit", uploadKnowledgeBook);
reindexKnowledge?.addEventListener("click", reindexKnowledgeBase);
knowledgeNoteForm?.addEventListener("submit", saveKnowledgeNote);
resetKnowledgeNoteButton?.addEventListener("click", resetKnowledgeNoteFormValues);
storeForm?.addEventListener("submit", saveStore);
document.getElementById("resetStoreForm")?.addEventListener("click", resetStoreForm);
storesList?.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-store]");
  const toggle = event.target.closest("[data-toggle-store]");
  if (edit) editStore(edit.dataset.editStore);
  if (toggle) toggleStore(toggle.dataset.toggleStore);
});
document.getElementById("scanAntifraud")?.addEventListener("click", scanAntifraud);
antifraudList?.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-antifraud-status]");
  const shieldSelect = event.target.closest("[data-shield-alert-status]");
  if (!select && !shieldSelect) return;
  const target = select || shieldSelect;
  if (!target.value) return;
  await apiRequest(select ? `/antifrode/${select.dataset.antifraudStatus}` : `/aurum-shield/alerts/${shieldSelect.dataset.shieldAlertStatus}/review`, {
    method: "PUT",
    body: JSON.stringify({ stato: target.value, status: target.value })
  });
  await loadAntifraud();
});
aurumShieldSettingsForm?.addEventListener("submit", saveAurumShieldSettings);
aurumShieldAlertsList?.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-shield-alert-status]");
  if (!select || !select.value) return;
  await apiRequest(`/aurum-shield/alerts/${select.dataset.shieldAlertStatus}/review`, {
    method: "PUT",
    body: JSON.stringify({ status: select.value })
  });
  await loadAurumShieldAdmin();
});
trainingCourseForm?.addEventListener("submit", createTrainingCourse);
trainingCourseReset?.addEventListener("click", resetTrainingCourseFormValues);
trainingCoursePreviewButton?.addEventListener("click", () => {
  void previewCurrentCourseDraft().catch((error) => showToast(error.message || "Anteprima corso non disponibile.", "error"));
});
courseSearch?.addEventListener("input", renderTraining);
courseCategoryFilter?.addEventListener("change", renderTraining);
document.querySelectorAll("[data-course-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    state.courseActiveTab = button.dataset.courseTab || "catalog";
    if (state.courseActiveTab !== "management") resetTrainingCourseFormValues();
    renderTraining();
  });
});
trainingList?.addEventListener("click", async (event) => {
  const startOperator = event.target.closest("[data-start-operator-training]");
  const saveOperator = event.target.closest("[data-save-operator-training]");
  const completeOperator = event.target.closest("[data-complete-operator-training]");
  const cancelOperator = event.target.closest("[data-cancel-operator-training]");
  const openTrainingResult = event.target.closest("[data-open-training-result]");
  const exam = event.target.closest("[data-course-exam]");
  const viewSlides = event.target.closest("[data-view-course-slides]");
  const downloadSlides = event.target.closest("[data-download-course-slides]");
  const certificate = event.target.closest("[data-download-certificate]");
  const editCourseButton = event.target.closest("[data-edit-course]");
  const deleteCourseButton = event.target.closest("[data-delete-course]");
  const prerequisiteButton = event.target.closest("[data-open-prerequisite-course]");
  const requestPractical = event.target.closest("[data-request-practical-assessment]");
  const startSimulation = event.target.closest("[data-start-academy-simulation]");
  try {
    if (startOperator) return await withButtonBusy(startOperator, "Avvio...", () => startOperatorTraining(startOperator.dataset.startOperatorTraining));
    if (saveOperator) return await withButtonBusy(saveOperator, "Salvo...", () => saveOperatorTrainingProgress(saveOperator.dataset.saveOperatorTraining));
    if (completeOperator) return await withButtonBusy(completeOperator, "Valuto...", () => completeOperatorTraining(completeOperator.dataset.completeOperatorTraining));
    if (cancelOperator) {
      state.activeTrainingSession = null;
      state.activeTrainingData = null;
      renderTraining();
      return;
    }
    if (openTrainingResult) return await openOperatorTrainingResult(openTrainingResult.dataset.openTrainingResult);
    if (exam) {
      const course = state.trainingCourses.find((item) => String(item.id) === String(exam.dataset.courseExam));
      return courseFinalExamQuestions(course).length ? showCourseExamModal(exam.dataset.courseExam) : await markCourseExamPassed(exam.dataset.courseExam);
    }
    if (viewSlides) return await withButtonBusy(viewSlides, "Apro...", () => downloadCourseSlides(viewSlides.dataset.viewCourseSlides, { download: false }));
    if (downloadSlides) return await withButtonBusy(downloadSlides, "Scarico...", () => downloadCourseSlides(downloadSlides.dataset.downloadCourseSlides, { download: true }));
    if (certificate) return await downloadCourseCertificate(certificate.dataset.downloadCertificate);
    if (requestPractical) {
      return await withButtonBusy(requestPractical, "Richiedo...", async () => {
        await apiRequest(`/academy/practical-assessments/${requestPractical.dataset.requestPracticalAssessment}/request`, {
          method: "POST",
          body: JSON.stringify({ notes: "Richiesta prova pratica da OroActive Academy" })
        });
        showToast("Prova pratica richiesta.");
        await loadTraining();
      });
    }
    if (startSimulation) {
      return await withButtonBusy(startSimulation, "Avvio...", async () => {
        await apiRequest(`/academy/simulations/${startSimulation.dataset.startAcademySimulation}/start`, {
          method: "POST",
          body: JSON.stringify({ mode: "training" })
        });
        showToast("Simulazione avviata in modalità training.");
        await loadTraining();
      });
    }
    if (prerequisiteButton) {
      const prerequisiteCode = prerequisiteButton.dataset.openPrerequisiteCourse || "";
      const card = [...document.querySelectorAll("[data-course-code]")]
        .find((item) => item.dataset.courseCode === prerequisiteCode);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("academy-course-highlight");
        window.setTimeout(() => card.classList.remove("academy-course-highlight"), 1600);
      } else {
        showToast("Corso propedeutico non disponibile nel catalogo.", "warning");
      }
      return;
    }
    if (editCourseButton) {
      editCourse(editCourseButton.dataset.editCourse);
      return;
    }
    if (deleteCourseButton) return await withButtonBusy(deleteCourseButton, "Elimino...", () => deleteCourse(deleteCourseButton.dataset.deleteCourse));
  } catch (error) {
    showToast(error.message || "Operazione corso non riuscita.");
  }
});
document.addEventListener("click", (event) => {
  const closePreview = event.target.closest("[data-close-course-preview]");
  const backdrop = event.target.classList?.contains("academy-preview-backdrop") ? event.target : null;
  const submitCourseExam = event.target.closest("[data-submit-course-final-exam]");
  if (closePreview || backdrop) {
    document.querySelector(".academy-preview-backdrop")?.remove();
    return;
  }
  if (submitCourseExam) {
    void withButtonBusy(submitCourseExam, "Correggo...", () => submitCourseFinalExam(submitCourseExam.dataset.submitCourseFinalExam));
    return;
  }
});
coinSearchInput?.addEventListener("input", () => {
  state.coinCatalogSearch = coinSearchInput.value || "";
  renderCoinEncyclopedia();
});
coinCountryFilter?.addEventListener("change", () => {
  state.coinCatalogCountry = coinCountryFilter.value || "";
  renderCoinEncyclopedia();
});
coinPurityFilter?.addEventListener("change", () => {
  state.coinCatalogPurity = coinPurityFilter.value || "";
  renderCoinEncyclopedia();
});
coinResetSearch?.addEventListener("click", resetCoinSearch);
coinCameraInput?.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  void identifyCoinFromCamera(file);
});
[coinCatalogGrid, coinIdentificationResults].forEach((container) => {
  container?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-coin]");
    if (!button) return;
    const id = button.dataset.openCoin;
    if (!GOLD_COIN_CATALOG.some((coin) => coin.id === id)) return;
    state.coinSelectedId = id;
    renderCoinEncyclopedia();
    coinDetailPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
gamingShell?.addEventListener("click", (event) => {
  const openSectionButton = event.target.closest("[data-gaming-open]");
  if (openSectionButton) {
    setScreen(openSectionButton.dataset.gamingOpen);
  }
});

aurumBlocksShell?.addEventListener("click", (event) => {
  const start = event.target.closest("[data-aurum-blocks-start]");
  const control = event.target.closest("[data-aurum-blocks-control]");
  const answer = event.target.closest("[data-aurum-blocks-answer]");
  const pause = event.target.closest("[data-aurum-blocks-pause]");
  const restart = event.target.closest("[data-aurum-blocks-restart]");
  const exit = event.target.closest("[data-aurum-blocks-exit]");
  const gaming = event.target.closest("[data-aurum-blocks-go-gaming]");
  if (start) {
    withButtonBusy(start, "Avvio...", () => startAurumBlocks(start.dataset.aurumBlocksStart));
    return;
  }
  if (answer) {
    answerAurumBlocksQuestion(answer);
    return;
  }
  if (control) {
    const action = control.dataset.aurumBlocksControl;
    if (action === "left") aurumBlocksMove(-1, 0);
    if (action === "right") aurumBlocksMove(1, 0);
    if (action === "rotate") aurumBlocksRotate();
    if (action === "down") aurumBlocksSoftDrop();
    if (action === "drop") aurumBlocksHardDrop();
    return;
  }
  if (pause) {
    pauseAurumBlocks();
    return;
  }
  if (restart) {
    startAurumBlocks(state.aurumBlocksGame?.mode || "arcade");
    return;
  }
  if (exit) {
    exitAurumBlocksGame();
    return;
  }
  if (gaming) {
    exitAurumBlocksGame();
    setScreen("gaming");
  }
});
aurumBlocksBoard?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  state.aurumBlocksTouchStart = { x: event.clientX, y: event.clientY, at: Date.now() };
});
aurumBlocksBoard?.addEventListener("pointerup", (event) => {
  event.preventDefault();
  const start = state.aurumBlocksTouchStart;
  state.aurumBlocksTouchStart = null;
  if (!start) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < 18 && absY < 18) {
    aurumBlocksRotate();
    return;
  }
  if (absY > absX && dy > 28) {
    if (Date.now() - start.at < 240 || dy > 92) aurumBlocksHardDrop();
    else aurumBlocksSoftDrop();
    return;
  }
  if (absX > absY && absX > 24) aurumBlocksMove(dx > 0 ? 1 : -1, 0);
});
crmSearch?.addEventListener("input", () => {
  window.clearTimeout(state.crmSearchTimer);
  state.crmSearchTimer = window.setTimeout(loadCrmClients, 350);
});
crmList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-crm-client]");
  if (button) openCrmClient(button.dataset.openCrmClient);
});
previewBody?.addEventListener("click", async (event) => {
  const saveClient = event.target.closest("[data-save-crm-client]");
  const deleteClient = event.target.closest("[data-delete-crm-client]");
  const checkVersion = event.target.closest("[data-app-version-check]");
  const updateNow = event.target.closest("[data-app-update-now]");
  const closePreview = event.target.closest("[data-close-preview]");
  try {
    if (checkVersion) return await checkForAppUpdate({ showResult: true });
    if (updateNow) return await performAppUpdateReload();
    if (closePreview && previewModal) {
      previewModal.hidden = true;
      return;
    }
    if (saveClient) await saveCrmClient(saveClient.dataset.saveCrmClient);
    if (deleteClient) await deleteCrmClient(deleteClient.dataset.deleteCrmClient);
  } catch (error) {
    showToast(error.message || "Operazione CRM non riuscita.");
  }
});
document.getElementById("runBackupNow")?.addEventListener("click", (event) => {
  withButtonBusy(event.currentTarget, "Backup...", () => runBackupNow());
});
backupsList?.addEventListener("click", (event) => {
  const download = event.target.closest("[data-download-backup]");
  const view = event.target.closest("[data-view-backup]");
  const deleteButton = event.target.closest("[data-delete-backup]");
  const verify = event.target.closest("[data-verify-backup]");
  const restore = event.target.closest("[data-test-restore-backup]");
  if (download) withButtonBusy(download, "Download...", () => downloadBackup(download.dataset.downloadBackup));
  if (view) viewBackup(view.dataset.viewBackup);
  if (deleteButton) withButtonBusy(deleteButton, "Elimino...", () => deleteBackup(deleteButton.dataset.deleteBackup));
  if (verify) withButtonBusy(verify, "Verifico...", () => verifyBackup(verify.dataset.verifyBackup));
  if (restore) withButtonBusy(restore, "Test...", () => testRestoreBackup(restore.dataset.testRestoreBackup));
});
dashboardPanels?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-open-store-health]")) return;
  setScreen("storeHealth");
});
storeHealthFilters?.addEventListener("submit", (event) => {
  event.preventDefault();
  withButtonBusy(recalculateStoreHealthButton || event.submitter, "Ricalcolo...", recalculateStoreHealth);
});
storeHealthPeriod?.addEventListener("change", () => {
  updateStoreHealthDateInputs();
  loadStoreHealth().catch((error) => showToast(error.message || "Salute Negozio non caricata.", "error"));
});
[storeHealthDateFrom, storeHealthDateTo].forEach((input) => {
  input?.addEventListener("change", () => {
    if (storeHealthPeriod?.value === "custom") loadStoreHealth().catch((error) => showToast(error.message || "Salute Negozio non caricata.", "error"));
  });
});
storeHealthList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-store-health-detail]");
  if (button) openStoreHealthDetail(button.dataset.storeHealthDetail).catch((error) => showToast(error.message || "Dettaglio Salute Negozio non caricato.", "error"));
});
founderReportDate?.addEventListener("change", () => loadFounderDailyReport(selectedFounderReportDate()));
generateFounderReportButton?.addEventListener("click", (event) => {
  withButtonBusy(event.currentTarget, "Genero...", () => generateFounderDailyReport());
});
downloadFounderReportPdfButton?.addEventListener("click", (event) => {
  withButtonBusy(event.currentTarget, "Scarico...", () => downloadFounderDailyReportPdf());
});
sendFounderReportButton?.addEventListener("click", (event) => {
  withButtonBusy(event.currentTarget, "Invio...", () => sendFounderDailyReport());
});
founderReportHistory?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-founder-report-date]");
  if (!button) return;
  if (founderReportDate) founderReportDate.value = button.dataset.founderReportDate;
  loadFounderDailyReport(button.dataset.founderReportDate);
});
auditTrailFilters?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAuditTrail(1);
});
auditTrailList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-audit-log]");
  if (button) viewAuditLog(button.dataset.viewAuditLog);
});
auditTrailPrev?.addEventListener("click", () => {
  const page = Math.max(1, Number(state.auditPagination?.page || 1) - 1);
  loadAuditTrail(page);
});
auditTrailNext?.addEventListener("click", () => {
  const page = Number(state.auditPagination?.page || 1) + 1;
  loadAuditTrail(page);
});
notificationBell?.addEventListener("click", async (event) => {
  event.stopPropagation();
  const opening = notificationDropdown?.hidden !== false;
  if (notificationDropdown) notificationDropdown.hidden = !opening;
  if (notificationBell) notificationBell.setAttribute("aria-expanded", opening ? "true" : "false");
  if (opening) {
    positionNotificationDropdown();
    await loadNotificationDropdown();
    positionNotificationDropdown();
  } else {
    closeNotificationDropdown();
  }
});
notificationDropdown?.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = event.target.closest("[data-open-notification]");
  const read = event.target.closest("[data-read-notification]");
  const remove = event.target.closest("[data-delete-notification]");
  if (open) openNotificationById(open.dataset.openNotification);
  if (read) readNotificationById(read.dataset.readNotification);
  if (remove) deleteNotificationById(remove.dataset.deleteNotification);
});
markAllNotificationsRead?.addEventListener("click", markAllNotificationsAsRead);
viewAllNotifications?.addEventListener("click", () => {
  closeNotificationDropdown();
  setScreen("notifications");
});
notificationFilters?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadNotificationsPage(1);
});
notificationFilters?.addEventListener("change", () => loadNotificationsPage(1));
clearNotificationFilters?.addEventListener("click", () => {
  notificationFilters?.reset();
  loadNotificationsPage(1);
});
refreshNotifications?.addEventListener("click", () => loadNotificationsPage(state.notificationPagination?.page || 1));
notificationsList?.addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-notification]");
  const read = event.target.closest("[data-read-notification]");
  const remove = event.target.closest("[data-delete-notification]");
  if (open) openNotificationById(open.dataset.openNotification);
  if (read) readNotificationById(read.dataset.readNotification);
  if (remove) deleteNotificationById(remove.dataset.deleteNotification);
});
notificationsPrev?.addEventListener("click", () => {
  const page = Math.max(1, Number(state.notificationPagination?.page || 1) - 1);
  loadNotificationsPage(page);
});
notificationsNext?.addEventListener("click", () => {
  const page = Number(state.notificationPagination?.page || 1) + 1;
  loadNotificationsPage(page);
});
refreshApprovals?.addEventListener("click", (event) => withButtonBusy(event.currentTarget, "Aggiorno...", loadApprovals));
approvalsList?.addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-approval-act]");
  const edit = event.target.closest("[data-edit-approval-act]");
  const view = event.target.closest("[data-view-approval]");
  const approve = event.target.closest("[data-approve-approval]");
  const reject = event.target.closest("[data-reject-approval]");
  const cancel = event.target.closest("[data-cancel-approval]");
  if (open) openArchivedAct(open.dataset.openApprovalAct);
  if (edit) loadActForEdit(edit.dataset.editApprovalAct);
  if (view) viewApprovalRequest(view.dataset.viewApproval);
  if (approve) withButtonBusy(approve, "Approvo...", () => approveApprovalRequest(approve.dataset.approveApproval));
  if (reject) withButtonBusy(reject, "Rifiuto...", () => rejectApprovalRequest(reject.dataset.rejectApproval));
  if (cancel) withButtonBusy(cancel, "Annullamento...", () => cancelApprovalRequest(cancel.dataset.cancelApproval));
});
refreshSuspendedPractices?.addEventListener("click", (event) => {
  withButtonBusy(event.currentTarget, "Aggiorno...", () => loadSuspendedPractices(state.suspendedPagination?.page || 1));
});
suspendedPracticeFilters?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadSuspendedPractices(1);
});
suspendedPracticeFilters?.addEventListener("change", () => loadSuspendedPractices(1));
suspendedPracticesPrev?.addEventListener("click", () => loadSuspendedPractices(Math.max(1, Number(state.suspendedPagination?.page || 1) - 1)));
suspendedPracticesNext?.addEventListener("click", () => loadSuspendedPractices(Number(state.suspendedPagination?.page || 1) + 1));
suspendedPracticesList?.addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-suspended]");
  const edit = event.target.closest("[data-edit-suspended]");
  const resolve = event.target.closest("[data-resolve-suspended]");
  const approval = event.target.closest("[data-approval-suspended]");
  const remove = event.target.closest("[data-delete-suspended]");
  if (open) viewSuspendedPractice(open.dataset.openSuspended);
  if (edit) editSuspendedPractice(edit.dataset.editSuspended);
  if (resolve) withButtonBusy(resolve, "Controllo...", () => resolveSuspendedPractice(resolve.dataset.resolveSuspended));
  if (approval) withButtonBusy(approval, "Invio...", () => requestSuspendedPracticeApproval(approval.dataset.approvalSuspended));
  if (remove) withButtonBusy(remove, "Elimino...", () => deleteSuspendedPractice(remove.dataset.deleteSuspended));
});
document.getElementById("refreshQuoteDashboard")?.addEventListener("click", () => {
  refreshBullionVaultPrices({ notify: true });
  initBullionVaultChart();
  loadGoldPredictionPanel({ silent: true });
});
syncGoldHistoryButton?.addEventListener("click", () => withButtonBusy(syncGoldHistoryButton, "Sincronizzo...", syncGoldHistory));
runGoldPredictionButton?.addEventListener("click", () => withButtonBusy(runGoldPredictionButton, "Calcolo...", runGoldPrediction));
askAurumGoldPredictionButton?.addEventListener("click", askAurumGoldPrediction);
goldPredictionKaratTable?.addEventListener("click", handlePriceExplanationClick);
buybackScenarioSelect?.addEventListener("change", () => {
  state.buybackScenario = buybackScenarioSelect.value || "standard";
  withButtonBusy(runGoldPredictionButton, "Calcolo...", runGoldPrediction);
});
buybackSimulatorForm?.addEventListener("submit", renderBuybackSimulation);
buybackSimulatorForm?.addEventListener("click", (event) => {
  if (!event.target.closest("#explainBuybackSimulation")) return;
  event.preventDefault();
  explainBuybackSimulation();
});
competitorSourceForm?.addEventListener("submit", (event) => {
  withButtonBusy(event.submitter || competitorSourceForm.querySelector('button[type="submit"]'), "Salvo...", () => saveCompetitorSource(event));
});
competitorQuoteForm?.addEventListener("submit", (event) => {
  withButtonBusy(event.submitter || competitorQuoteForm.querySelector('button[type="submit"]'), "Salvo...", () => saveCompetitorQuote(event));
});
competitorCsvForm?.addEventListener("submit", (event) => {
  withButtonBusy(event.submitter || competitorCsvForm.querySelector('button[type="submit"]'), "Importo...", () => importCompetitorCsv(event));
});
competitorQuotesList?.addEventListener("click", (event) => {
  void handleCompetitorAction(event);
});
competitorExtractionTrainerList?.addEventListener("click", (event) => {
  void handleCompetitorAction(event);
});
goldPredictionSettingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  withButtonBusy(event.submitter || goldPredictionSettingsForm.querySelector('button[type="submit"]'), "Salvo...", () => saveGoldPredictionSettings(event));
});
document.getElementById("dismissInstallHint")?.addEventListener("click", () => {
  localStorage.setItem("oroactive-install-hint-dismissed", "1");
  if (installHint) installHint.hidden = true;
});
knowledgeStatus?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-book]");
  if (button) deleteKnowledgeBook(button.dataset.deleteBook);
});
knowledgeNotesList?.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-knowledge]");
  const approve = event.target.closest("[data-approve-knowledge]");
  const remove = event.target.closest("[data-delete-knowledge]");
  if (edit) editKnowledgeNote(edit.dataset.editKnowledge);
  if (approve) approveKnowledgeNote(approve.dataset.approveKnowledge);
  if (remove) deleteKnowledgeNote(remove.dataset.deleteKnowledge);
});
aiFeedbackList?.addEventListener("click", (event) => {
  const approve = event.target.closest("[data-feedback-to-knowledge]");
  const remove = event.target.closest("[data-delete-ai-feedback]");
  if (approve) feedbackToKnowledge(approve.dataset.feedbackToKnowledge);
  if (remove) deleteAiFeedback(remove.dataset.deleteAiFeedback);
});
assistantChat?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ai-feedback]");
  if (!button) return;
  const wrapper = button.closest("[data-assistant-feedback-index]");
  sendAssistantFeedback(wrapper?.dataset.assistantFeedbackIndex, button.dataset.aiFeedback);
});

function applyMenuButtonShortcut(button) {
  if (button?.dataset?.courseTabShortcut) state.courseActiveTab = button.dataset.courseTabShortcut;
}

async function openMainMenuItem(button) {
  if (!button) return;
  if (button.dataset.mainMenuToggle) {
    toggleMainMenuDropdown(button.dataset.mainMenuToggle);
    return;
  }
  applyMenuButtonShortcut(button);
  if (button.dataset.menuAction === "website") {
    openOroActiveWebsite();
    closeMainMenuDropdowns();
    return;
  }
  if (button.dataset.menuAction === "tutorial") {
    closeMainMenuDropdowns();
    updateAurumMascotVisibility();
    startTutorial({ firstRun: false });
    return;
  }
  if (button.dataset.menuAction === "aurum") {
    closeMainMenuDropdowns();
    closeMainMenuSearchResults();
    setAurumSection("menu");
    updateAurumMascotVisibility();
    openAurumChat();
    return;
  }
  if (button.dataset.menuAction === "app-update") {
    closeMainMenuDropdowns();
    closeMainMenuSearchResults();
    await checkForAppUpdate({ showResult: true });
    return;
  }
  if (button.dataset.section) await enterSectionFromMainMenu(button.dataset.section);
}

async function openBrandMenuItem(button) {
  if (!button) return;
  if (button.dataset.brandSubmenuToggle) {
    toggleBrandSubmenu(button.dataset.brandSubmenuToggle);
    return;
  }
  applyMenuButtonShortcut(button);
  if (button.dataset.menuAction === "website") {
    openOroActiveWebsite();
    closeBrandMenu();
    return;
  }
  if (button.dataset.menuAction === "tutorial") {
    closeBrandMenu();
    prepareInternalSectionLayout();
    updateAurumMascotVisibility();
    startTutorial({ firstRun: false });
    return;
  }
  if (button.dataset.menuAction === "app-update") {
    closeBrandMenu();
    await checkForAppUpdate({ showResult: true });
    return;
  }
  if (!button.dataset.section) return;
  setScreen(button.dataset.section);
  if (button.dataset.section === "practice") await resetCurrentPractice({ deferPracticeNumber: true });
  closeBrandMenu();
}

brandMenuButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleBrandMenu();
});

splashRetry?.addEventListener("click", () => {
  window.location.reload();
});

splashLoginFallback?.addEventListener("click", () => {
  showLogin({ keepSplash: true });
  void hideStartupSplash();
});

mainMenuQuickActions?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  event.stopPropagation();
  void openMainMenuItem(button);
});

mainMenuActions?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  event.stopPropagation();
  void openMainMenuItem(button);
});

mainMenuFounderKpis?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  event.stopPropagation();
  void openMainMenuItem(button);
});

mainMenuSearch?.addEventListener("input", () => {
  renderRoleBasedMenus();
});

mainMenuSearch?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  mainMenuSearch.value = "";
  closeMainMenuSearchResults();
  renderRoleBasedMenus();
});

mainMenuSearchResults?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  event.stopPropagation();
  if (mainMenuSearch) mainMenuSearch.value = "";
  closeMainMenuSearchResults();
  void openMainMenuItem(button);
});

mainUserMenuButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMainUserMenu();
});

document.querySelectorAll("[data-login-privacy]").forEach((button) => {
  button.addEventListener("click", () => openPrivacyNoticePreview({ login: true }));
});

mainUserDropdown?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (event.target.closest("[data-user-profile]")) {
    setScreen("profile");
    return;
  }
  if (event.target.closest("[data-user-privacy]")) {
    setScreen("privacyCenter");
    return;
  }
  if (event.target.closest("[data-user-users]")) {
    setScreen("users");
    return;
  }
  if (event.target.closest("[data-user-check-update]")) {
    closeMainUserMenu();
    void checkForAppUpdate({ manual: true });
    return;
  }
  if (event.target.closest("[data-user-logout]")) {
    handleLogout();
  }
});

appUpdateBanner?.addEventListener("click", (event) => {
  if (event.target.closest("[data-app-update-now]")) {
    void handleAppUpdateNow();
    return;
  }
  if (event.target.closest("[data-app-update-dismiss]")) {
    hideAppUpdateBanner();
  }
});

document.querySelectorAll("[data-start-tutorial]").forEach((button) => {
  button.addEventListener("click", () => {
    closeMainMenuDropdowns();
    closeBrandMenu();
    if (!button.closest(".main-menu-actions")) prepareInternalSectionLayout();
    updateAurumMascotVisibility();
    startTutorial({ firstRun: false });
  });
});

tutorialNext?.addEventListener("click", () => {
  if (!state.tutorial.active) return;
  if (state.tutorial.index >= state.tutorial.steps.length - 1) {
    const isAurumTutorial = state.tutorial.source === "aurum";
    finishTutorial({ remember: !isAurumTutorial, completed: true });
    showToast(isAurumTutorial ? "Tutorial Aurum completato." : "Tutorial completato. Puoi iniziare la compilazione dell'atto.");
    return;
  }
  state.tutorial.index += 1;
  renderTutorialStep();
});

tutorialBack?.addEventListener("click", () => {
  if (!state.tutorial.active || state.tutorial.index === 0) return;
  state.tutorial.index -= 1;
  renderTutorialStep();
});

tutorialSkip?.addEventListener("click", () => {
  const isAurumTutorial = state.tutorial.source === "aurum";
  finishTutorial({ remember: !isAurumTutorial });
  showToast(isAurumTutorial ? "Guida Aurum chiusa." : "Tutorial chiuso. Puoi riaprirlo dal menu quando vuoi.");
});

document.querySelectorAll("[data-return-menu]").forEach((button) => {
  button.addEventListener("click", returnToMainMenu);
});

brandDropdown?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  event.stopPropagation();
  void openBrandMenuItem(button);
});

window.addEventListener("resize", () => {
  if (notificationDropdown && !notificationDropdown.hidden) positionNotificationDropdown();
  restoreAurumFloatingPosition();
  scheduleAurumViewportClamp();
  scheduleAurumAvoidance();
});
window.addEventListener("scroll", scheduleAurumAvoidance, { passive: true });
document.addEventListener("scroll", scheduleAurumAvoidance, { passive: true, capture: true });
window.addEventListener(AURUM_AVOID_EVENT, scheduleAurumAvoidance);

document.addEventListener("focusin", (event) => {
  if (event.target.matches?.(AURUM_ACTIVE_FIELD_SELECTOR) || event.target.closest?.(AURUM_AVOID_SELECTORS.join(","))) {
    dispatchAurumAvoidanceUpdate();
  }
});

document.addEventListener("focusout", (event) => {
  if (event.target.matches?.(AURUM_ACTIVE_FIELD_SELECTOR) || event.target.closest?.(AURUM_AVOID_SELECTORS.join(","))) {
    window.setTimeout(dispatchAurumAvoidanceUpdate, 80);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches?.(AURUM_ACTIVE_FIELD_SELECTOR)) dispatchAurumAvoidanceUpdate();
});

document.addEventListener("change", (event) => {
  if (event.target.matches?.(AURUM_ACTIVE_FIELD_SELECTOR)) dispatchAurumAvoidanceUpdate();
});

document.addEventListener("click", (event) => {
  if (!brandDropdown.hidden && !event.target.closest(".brand-wrap")) closeBrandMenu();
  if (mainUserDropdown && !mainUserDropdown.hidden && !event.target.closest(".main-user-menu")) closeMainUserMenu();
  if (notificationDropdown && !notificationDropdown.hidden && !event.target.closest(".notification-center")) closeNotificationDropdown();
  if (mainMenuScreen && !mainMenuScreen.hidden && !event.target.closest(".main-menu-group")) closeMainMenuDropdowns();
  if (mainMenuScreen && !mainMenuScreen.hidden && !event.target.closest(".main-menu-search-wrap")) closeMainMenuSearchResults();
  if (aurumChatPanel && !aurumChatPanel.hidden && !event.target.closest("#aurumChatPanel") && !event.target.closest("#aurumMascotButton")) closeAurumChat();
});

document.addEventListener("keydown", (event) => {
  if (document.getElementById("aurumBlocks")?.classList.contains("active-screen") && state.aurumBlocksGame && !state.aurumBlocksGame.over) {
    const handledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar", "p", "P"];
    if (handledKeys.includes(event.key)) {
      event.preventDefault();
      if (event.key === "ArrowLeft") aurumBlocksMove(-1, 0);
      if (event.key === "ArrowRight") aurumBlocksMove(1, 0);
      if (event.key === "ArrowUp") aurumBlocksRotate();
      if (event.key === "ArrowDown") aurumBlocksSoftDrop();
      if (event.key === " " || event.key === "Spacebar") aurumBlocksHardDrop();
      if (event.key === "p" || event.key === "P") pauseAurumBlocks();
      return;
    }
  }
  if (event.key === "Escape" && aurumChatPanel && !aurumChatPanel.hidden) closeAurumChat();
});

steps.forEach((step) => {
  step.addEventListener("click", () => {
    state.step = Number(step.dataset.step);
    renderStep();
  });
});

document.getElementById("nextStep")?.addEventListener("click", async () => {
  if (state.step === 2 && state.signatures.some((signed) => !signed)) {
    showToast("Prima di procedere servono le tre firme cliente e la firma operatore.");
    return;
  }
  if (state.step < 4) {
    state.step += 1;
    renderStep();
  } else {
    await completeCurrentPractice();
  }
});

document.getElementById("previousStep")?.addEventListener("click", () => {
  if (state.step > 0) {
    state.step -= 1;
    renderStep();
  }
});

document.getElementById("deleteCurrentPractice")?.addEventListener("click", deleteCurrentPractice);
document.getElementById("saveQualityReview")?.addEventListener("click", saveQualityReview);
document.getElementById("privacyAcceptButton")?.addEventListener("click", () => withButtonBusy(document.getElementById("privacyAcceptButton"), "Registro...", acceptPrivacyPolicy));
document.getElementById("privacyPdfButton")?.addEventListener("click", () => withButtonBusy(document.getElementById("privacyPdfButton"), "Scarico...", downloadPrivacyPolicyPdf));
document.querySelector("[data-open-customer-privacy]")?.addEventListener("click", async () => {
  await openPrivacyNoticePreview({ customer: true });
  if (state.authToken) {
    apiRequest("/privacy-policy/customer-notice/viewed", {
      method: "POST",
      body: JSON.stringify({ practice_number: fieldValue("#practiceNumber") })
    }).catch(() => null);
  }
});
guidedQualityList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quality-target]");
  if (button) focusQualityTarget(button.dataset.qualityTarget);
});

document.getElementById("printCustomerCopySummary")?.addEventListener("click", printCustomerCopy);
document.getElementById("printCompanyCopySummary")?.addEventListener("click", printCompanyCopy);

document.getElementById("archivePractice")?.addEventListener("click", () => archiveCurrentPractice("Archiviata"));
saveSuspendedPracticeButton?.addEventListener("click", () => saveCurrentPracticeAsSuspended({ manual: true }));

document.getElementById("addCededItem")?.addEventListener("click", () => {
  markPracticeDirty();
  const row = document.createElement("article");
  row.className = "ceded-item-row";
  row.innerHTML = cededItemRowMarkup().replace('<article class="ceded-item-row">', "").replace("</article>", "");
  document.getElementById("cededItemsTable").appendChild(row);
  updateTitleOptions(row);
  updateCededItems();
  updateChecklistState();
  showToast("Nuova riga oggetto aggiunta alla scheda cliente.");
});

document.getElementById("cededItemsTable")?.addEventListener("input", (event) => {
  markPracticeDirty();
  updateCededItems();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.getElementById("cededItemsTable")?.addEventListener("change", (event) => {
  markPracticeDirty();
  const row = event.target.closest(".ceded-item-row");
  if (!row || !event.target.matches("select")) return;
  const selects = row.querySelectorAll("select");
  if (event.target === selects[0]) {
    updateTitleOptions(row);
    renderWeightFields();
    renderPreciousCaptureCards();
    updateAttachmentState();
    updateChecklistState();
    scheduleAurumShieldEvaluation();
  }
});

document.getElementById("saleTotal")?.addEventListener("input", () => {
  markPracticeDirty();
  updateSaleTotal();
  notifyCashPaymentLimitIfNeeded();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.getElementById("materialAmountFields")?.addEventListener("input", () => {
  markPracticeDirty();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.querySelector(".form-panel").addEventListener("input", (event) => {
  markPracticeDirty();
  event.target.classList?.remove("ocr-low-confidence");
  if (event.target.title === "Controlla questo dato") event.target.title = "";
  if (event.target.matches('[name="nome"], [name="cognome"], [name="cf"]')) updateCustomerSummary();
  if (event.target.matches('[name="cf"]')) {
    const normalizedCode = normalizeFiscalCodeInput(event.target.value);
    if (event.target.value !== normalizedCode) event.target.value = normalizedCode;
    const generated = generatedFiscalCode();
    state.fiscalCodeEditedManually = Boolean(normalizedCode && normalizedCode !== generated);
    if (normalizedCode.length === 16) applyFiscalCodeDecodedData(decodeFiscalCodeData(normalizedCode));
    window.clearTimeout(state.clientLookupTimer);
    if (normalizedCode.length === 16) {
      state.clientLookupTimer = window.setTimeout(() => lookupExistingClient(normalizedCode), 350);
    }
    scheduleAmlCashCheck();
  }
  if (event.target.matches('[name="nome"], [name="cognome"], [name="sesso"], [name="nascita"], [name="luogo"], [name="provinciaNascita"]')) {
    if (event.target.matches('[name="nome"]')) autofillSexFromName();
    if (event.target.matches('[name="luogo"]')) updateCitizenshipFromBirthPlace();
    maybeAutofillFiscalCode();
  }
  if (event.target.matches('[name="indirizzo"]')) updateResidenceProvinceFromAddress();
  if (event.target.matches('[name="provinciaNascita"], [name="provinciaResidenza"]')) {
    event.target.value = event.target.value.toUpperCase();
  }
  if (event.target.matches('[name="scadenzaDocumento"]')) updateDocumentExpiryWarning();
  if (event.target.matches("#saleTotal")) scheduleAmlCashCheck();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.querySelector(".form-panel").addEventListener("change", (event) => {
  markPracticeDirty();
  event.target.classList?.remove("ocr-low-confidence");
  if (event.target.title === "Controlla questo dato") event.target.title = "";
  if (event.target.matches('[name="nome"], [name="cognome"], [name="cf"]')) updateCustomerSummary();
  if (event.target.matches('[name="luogo"]')) {
    updateCitizenshipFromBirthPlace();
    maybeAutofillFiscalCode();
  }
  if (event.target.matches('[name="nome"], [name="cognome"], [name="sesso"], [name="nascita"], [name="provinciaNascita"]')) {
    if (event.target.matches('[name="nome"]')) autofillSexFromName();
    maybeAutofillFiscalCode();
  }
  if (event.target.matches('[name="cf"]')) {
    const normalizedCode = normalizeFiscalCodeInput(event.target.value);
    if (event.target.value !== normalizedCode) event.target.value = normalizedCode;
    if (normalizedCode.length === 16) {
      applyFiscalCodeDecodedData(decodeFiscalCodeData(normalizedCode));
      lookupExistingClient(normalizedCode);
    }
    scheduleAmlCashCheck();
  }
  if (event.target.matches('[name="indirizzo"]')) updateResidenceProvinceFromAddress();
  if (event.target.matches('[name="provinciaNascita"], [name="provinciaResidenza"]')) normalizeProvinceField(event.target);
  if (event.target.matches('[name="scadenzaDocumento"]')) updateDocumentExpiryWarning();
  if (event.target.matches("#saleTotal")) scheduleAmlCashCheck();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.getElementById("paymentMethod")?.addEventListener("change", () => {
  markPracticeDirty();
  scheduleAmlCashCheck();
  notifyCashPaymentLimitIfNeeded();
  renderAmlCashAlert();
  renderPaymentCaptureCard();
  scheduleAmlCashCheck();
  updateAttachmentState();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.getElementById("storeCode")?.addEventListener("change", async () => {
  markPracticeDirty();
  await updatePracticeNumber();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});
document.getElementById("practiceDate")?.addEventListener("change", async () => {
  markPracticeDirty();
  await updatePracticeNumber();
  scheduleAmlCashCheck();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
});

document.getElementById("archiveStoreFilter")?.addEventListener("change", async () => {
  document.getElementById("archiveStoreFilter").dataset.userSelected = "true";
  state.archivePage = 1;
  state.searchActive = false;
  state.lastSearchResults = [];
  const keyword = document.getElementById("searchKeyword");
  if (keyword) keyword.value = "";
  await loadArchiveScreenData({ force: true });
  renderArchiveGroups();
});
document.getElementById("fusionStoreFilter")?.addEventListener("change", async () => {
  await loadFusionScreenData({ force: true });
  renderFusionGroups();
});

document.getElementById("archiveGroups")?.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-archive-page]");
  if (pageButton) {
    state.archivePage = Number(pageButton.dataset.archivePage) || 1;
    renderArchiveGroups();
    return;
  }
  const feedbackButton = event.target.closest("[data-quality-feedback]");
  if (feedbackButton) {
    showQualityFeedback(feedbackButton.dataset.qualityFeedback);
    return;
  }
  const requestDeleteButton = event.target.closest("[data-request-delete-act]");
  if (requestDeleteButton) {
    requestActDeletion(requestDeleteButton.dataset.requestDeleteAct);
    return;
  }
  const approveDeleteButton = event.target.closest("[data-approve-delete-act]");
  if (approveDeleteButton) {
    approveDeleteAct(approveDeleteButton.dataset.approveDeleteAct);
    return;
  }
  const trustPackButton = event.target.closest("[data-open-trust-pack]");
  if (trustPackButton) {
    openArchivedAct(trustPackButton.dataset.openTrustPack);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-act]");
  if (deleteButton) {
    deleteAct(deleteButton.dataset.deleteAct);
    return;
  }
  const editButton = event.target.closest("[data-edit-act]");
  if (editButton) {
    loadActForEdit(editButton.dataset.editAct);
    return;
  }
  const openButton = event.target.closest("[data-open-act]");
  if (!openButton) return;
  openArchivedAct(openButton.dataset.openAct);
});

document.getElementById("fusionGroups")?.addEventListener("click", (event) => {
  const fuseSelectedButton = event.target.closest("[data-fuse-selected-store]");
  if (fuseSelectedButton) {
    confirmSelectedFusion(fuseSelectedButton.dataset.fuseSelectedStore);
    return;
  }
  const requestDeleteButton = event.target.closest("[data-request-delete-act]");
  if (requestDeleteButton) {
    requestActDeletion(requestDeleteButton.dataset.requestDeleteAct);
    return;
  }
  const approveDeleteButton = event.target.closest("[data-approve-delete-act]");
  if (approveDeleteButton) {
    approveDeleteAct(approveDeleteButton.dataset.approveDeleteAct);
    return;
  }
  const ddtButton = event.target.closest("[data-fusion-ddt-store]");
  if (ddtButton) {
    printFusionDdt(ddtButton.dataset.fusionDdtStore, ddtButton.dataset.fusionDdtDate);
    return;
  }
  const fuseButton = event.target.closest("[data-fuse-act]");
  if (fuseButton) {
    confirmActFusion(fuseButton.dataset.fuseAct);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-act]");
  if (deleteButton) {
    deleteAct(deleteButton.dataset.deleteAct);
    return;
  }
  const editButton = event.target.closest("[data-edit-act]");
  if (editButton) {
    loadActForEdit(editButton.dataset.editAct);
    return;
  }
  const openButton = event.target.closest("[data-open-act]");
  if (!openButton) return;
  openArchivedAct(openButton.dataset.openAct);
});

previewBody?.addEventListener("click", async (event) => {
  const acceptPrivacy = event.target.closest("[data-accept-privacy-policy]");
  if (acceptPrivacy) {
    await withButtonBusy(acceptPrivacy, "Registro...", acceptPrivacyPolicy);
    previewModal.hidden = true;
    return;
  }
  if (event.target.closest("[data-open-privacy-center]")) {
    previewModal.hidden = true;
    setScreen("privacyCenter");
    return;
  }
  const triggerCapture = event.target.closest("[data-trigger-capture-key]");
  if (triggerCapture) {
    const input = document.querySelector(`.capture-card[data-capture-key="${cssEscape(triggerCapture.dataset.triggerCaptureKey)}"] input`);
    input?.click();
    return;
  }
  const reloadCaptureGroup = event.target.closest("[data-reload-capture-group]");
  if (reloadCaptureGroup) {
    openCaptureGroupModal(reloadCaptureGroup.dataset.reloadCaptureGroup);
    return;
  }
  const removeCaptureGroupButton = event.target.closest("[data-remove-capture-group]");
  if (removeCaptureGroupButton) {
    removeCaptureGroup(removeCaptureGroupButton.dataset.removeCaptureGroup);
    return;
  }
  if (event.target.closest("[data-confirm-capture-group]")) {
    state.captureGroup = null;
    previewModal.hidden = true;
    showToast("Allegati confermati.");
    return;
  }
  const customerCopyAction = event.target.closest("[data-customer-copy-action]");
  if (customerCopyAction) {
    handleCustomerCopyAction(customerCopyAction.dataset.customerCopyAction);
    return;
  }
  const previewActPrint = event.target.closest("[data-preview-act-print]");
  if (previewActPrint) {
    const practiceNumber = previewActPrint.dataset.previewActPrint;
    const scope = previewActPrint.dataset.previewPrintScope || "company";
    const act = await getActRecord(practiceNumber);
    if (!act) {
      showToast("Impossibile aprire l'atto selezionato.", "error");
      return;
    }
    try {
      await requestPdf(
        "/pdf/act",
        { title: `${scope === "customer" ? "Copia cliente" : "Copia aziendale"} ${act.practiceNumber}`, scope, act },
        `${scope === "customer" ? "copia-cliente" : "copia-aziendale"}-${act.practiceNumber || "oroactive"}.pdf`
      );
    } catch (error) {
      showToast(error.message || "PDF non generato.", "error");
    }
    return;
  }
  const generateTrustPack = event.target.closest("[data-generate-trust-pack]");
  if (generateTrustPack) {
    await withButtonBusy(generateTrustPack, generateTrustPack.dataset.regenerateTrustPack === "true" ? "Rigenero..." : "Genero...", () => generateCustomerTrustPackForAct(generateTrustPack.dataset.generateTrustPack, { regenerate: generateTrustPack.dataset.regenerateTrustPack === "true" }));
    return;
  }
  const downloadTrustPack = event.target.closest("[data-download-trust-pack]");
  if (downloadTrustPack) {
    await withButtonBusy(downloadTrustPack, "Scarico...", () => downloadCustomerTrustPack(downloadTrustPack.dataset.downloadTrustPack));
    return;
  }
  const emailTrustPack = event.target.closest("[data-email-trust-pack]");
  if (emailTrustPack) {
    await withButtonBusy(emailTrustPack, "Invio...", () => sendCustomerTrustPackEmail(emailTrustPack.dataset.emailTrustPack));
    return;
  }
  const whatsappTrustPack = event.target.closest("[data-whatsapp-trust-pack]");
  if (whatsappTrustPack) {
    await withButtonBusy(whatsappTrustPack, "Preparo...", () => markCustomerTrustPackWhatsapp(whatsappTrustPack.dataset.whatsappTrustPack));
    return;
  }
  const requestDeleteButton = event.target.closest("[data-request-delete-act]");
  if (requestDeleteButton) {
    requestActDeletion(requestDeleteButton.dataset.requestDeleteAct);
    return;
  }
  const editButton = event.target.closest("[data-edit-act]");
  if (editButton) {
    loadActForEdit(editButton.dataset.editAct);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-act]");
  if (!deleteButton) return;
  deleteAct(deleteButton.dataset.deleteAct);
});

document.getElementById("exportDailyPdf")?.addEventListener("click", exportDailySearchPdf);
document.getElementById("exportMonthlyPdf")?.addEventListener("click", exportMonthlySearchPdf);
document.getElementById("clearActSearch")?.addEventListener("click", clearActSearch);

document.getElementById("documentType")?.addEventListener("change", () => {
  updateDocumentCaptureCards();
  updateAttachmentState();
});

document.getElementById("runActSearch")?.addEventListener("click", runActSearch);
document.getElementById("searchField")?.addEventListener("change", () => {
  state.searchActive = false;
  state.lastSearchResults = [];
  state.archivePage = 1;
  renderArchiveGroups();
});

document.getElementById("archiveIncludeSuspended")?.addEventListener("change", async () => {
  state.searchActive = false;
  state.lastSearchResults = [];
  state.archivePage = 1;
  await loadArchiveScreenData({ force: true, silent: true });
  renderArchiveGroups();
});

document.getElementById("searchKeyword")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runActSearch();
});

document.getElementById("searchKeyword")?.addEventListener("input", () => {
  state.searchActive = false;
  state.lastSearchResults = [];
  state.archivePage = 1;
});

document.getElementById("cededItemsTable")?.addEventListener("click", (event) => {
  if (!event.target.classList.contains("remove-row") || event.target.disabled) return;
  markPracticeDirty();
  event.target.closest(".ceded-item-row").remove();
  updateCededItems();
  updateChecklistState();
});

document.querySelectorAll("canvas[data-signature]").forEach((canvas) => {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let last = null;

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#17130d";

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function start(event) {
    event.preventDefault();
    drawing = true;
    last = point(event);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const next = point(event);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last = next;
    const signatureIndex = Number(canvas.dataset.signature);
    state.signatures[signatureIndex] = true;
    state.loadedSignatureImages[signatureIndex] = "";
    markPracticeDirty();
    updateSignatureState();
    scheduleAurumShieldEvaluation();
  }

  function end() {
    drawing = false;
    last = null;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  canvas.parentElement.querySelector(".clear-signature").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const signatureIndex = Number(canvas.dataset.signature);
    state.signatures[signatureIndex] = false;
    state.loadedSignatureImages[signatureIndex] = "";
    markPracticeDirty();
    updateSignatureState();
    scheduleAurumShieldEvaluation();
  });
});

window.addEventListener("online", () => {
  flushPendingSync();
});

["click", "keydown", "touchstart", "pointerdown"].forEach((eventName) => {
  window.addEventListener(eventName, resetSessionTimeout, { passive: true });
});

document.addEventListener("change", async (event) => {
  if (!event.target.matches(".capture-card input")) return;
  const card = event.target.closest(".capture-card");
  const key = card?.dataset.captureKey;
  if (!card || !key) return;
  const file = event.target.files?.[0];
  if (file) {
    markPracticeDirty();
    const previous = state.captureFiles.get(key);
    revokeCaptureUrl(previous);
    let dataUrl = "";
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      showToast("Foto caricata, ma anteprima PDF non disponibile.");
    }
    state.captureFiles.set(key, {
      name: file.name || "Foto allegata",
      type: file.type || "",
      url: dataUrl,
      dataUrl
    });
  }
  state.uploadedCaptures.add(key);
  state.attachments = state.uploadedCaptures.size;
  card.classList.add("loaded");
  card.querySelector("em").textContent = "Foto acquisita";
  updateAttachmentState();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
  if (state.captureGroup && !previewModal.hidden) openCaptureGroupModal(state.captureGroup);
});

document.addEventListener("click", async (event) => {
  const captureGroup = event.target.closest("[data-capture-group]");
  if (captureGroup && !event.target.closest(".capture-card") && !event.target.closest(".capture-actions")) {
    openCaptureGroupModal(captureGroup.dataset.captureGroup);
    return;
  }

  const viewButton = event.target.closest("[data-view-capture]");
  const deleteButton = event.target.closest("[data-delete-capture]");
  if (!viewButton && !deleteButton) return;

  event.preventDefault();
  event.stopPropagation();
  const card = event.target.closest(".capture-card");
  const key = card?.dataset.captureKey;
  if (!card || !key) return;

  if (viewButton) {
    const file = state.captureFiles.get(key);
    const source = capturePreviewSource(file);
    if (!source) {
      showToast(state.uploadedCaptures.has(key) ? "Allegato presente, anteprima non disponibile in questa sessione." : "Nessuna foto caricata.");
      return;
    }
    previewTitle.textContent = file.name || "Anteprima foto";
    previewBody.innerHTML = isCapturePdf(file, source)
      ? `<iframe class="capture-preview-frame" src="${source}" title="${escapeHtml(file.name)}"></iframe>`
      : `<img class="capture-preview-image" src="${source}" alt="${escapeHtml(file.name)}">`;
    previewModal.hidden = false;
    return;
  }

  const previous = state.captureFiles.get(key);
  markPracticeDirty();
  revokeCaptureUrl(previous);
  state.captureFiles.delete(key);
  state.uploadedCaptures.delete(key);
  state.attachments = state.uploadedCaptures.size;
  card.classList.remove("loaded");
  card.querySelector("em").textContent = key.startsWith("pagamento-") ? "Tocca per fotografare o allegare" : "Tocca per fotografare";
  const input = card.querySelector("input");
  if (input) input.value = "";
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  renderPreciousCaptureCards();
  updateAttachmentState();
  updateChecklistState();
  scheduleAurumShieldEvaluation();
  showToast("Foto eliminata.");
});

document.querySelectorAll("[data-preview-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.dataset.previewCopy === "customer") await showCustomerCopyOptions();
    else await showPrintPreview(button.dataset.previewCopy);
  });
});

document.getElementById("closePreview")?.addEventListener("click", () => {
  previewModal.hidden = true;
});

async function initializeApp() {
  showStartupSplash();
  try {
    registerServiceWorker();
    startAppVersionChecker();
    removeLegacySearchMenu();
    removeFooterBuildMetadata();
    upgradeProvinceFields();
    populateAutocompleteLists();
    markAurumAvoidElements();
    startMainMenuClock();
    appShell.hidden = true;
    const sessionRestored = await restoreSession({ keepSplash: true });
    maybeShowInstallHint();
    window.addEventListener("focus", () => {
      if (state.authToken) syncActsFromServer();
      if (state.authToken) void checkForAppUpdate({ manual: false, autoReload: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.authToken) syncActsFromServer();
      if (!document.hidden && state.authToken) void checkForAppUpdate({ manual: false, autoReload: true });
    });
    await completeStartupSplash(sessionRestored ? "main" : "login");
  } catch (error) {
    showStartupSplashError(error);
  }
}

initializeApp();
