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
  actsCache: new Map(),
  archivePage: 1,
  archivePageSize: 10,
  searchActive: false,
  editingActId: null,
  editingOriginalStatus: "",
  editingDirty: false,
  suppressDirtyTracking: false,
  cashLimitWarningShown: false,
  amlCashCheck: null,
  amlCashCheckTimer: null,
  amlCashCheckLoading: false,
  bullionVaultPrices: {},
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
  antifraudAlerts: [],
  trainingCourses: [],
  courseFaculties: [],
  courseCategories: [],
  courseSections: [],
  courseProgress: [],
  courseCertificates: [],
  courseBadges: [],
  courseActiveTab: "catalog",
  users: [],
  userActivities: new Map(),
  crmClients: [],
  crmSearchTimer: null,
  backups: [],
  clockTimer: null,
  aurumTipTimer: null,
  aurumTipHideTimer: null,
  aurumTipIndex: 0,
  aurumMessages: [],
  aurumSending: false,
  bullionChartLoaded: false,
  pendingSync: [],
  syncingPending: false,
  sessionTimeoutTimer: null,
  tutorial: {
    active: false,
    index: 0,
    steps: [],
    pendingFirstRun: false
  }
};

const SIGNATURE_LABELS = ["Firma vendita", "Firma dichiarazioni", "Firma privacy", "Firma operatore"];
const REQUIRED_SIGNATURES = SIGNATURE_LABELS.length;
const OROACTIVE_WEBSITE_URL = "https://oroactive.com/";
const AURUM_TIPS = [
  "Controlla sempre documento, firme e pagamento prima di archiviare.",
  "Ricorda il limite contanti negli ultimi 7 giorni.",
  "La trasparenza aumenta la fiducia del cliente.",
  "Prima di fondere, verifica bene la giacenza per caratura.",
  "Un cliente ricorrente va gestito con storico aggiornato.",
  "La precisione protegge l'operatore e il negozio."
];

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
const enterSoftware = document.getElementById("enterSoftware");
const mainMenuScreen = document.getElementById("mainMenuScreen");
const mainUserMenuButton = document.getElementById("mainUserMenuButton");
const mainUserDropdown = document.getElementById("mainUserDropdown");
const mainMenuClock = document.getElementById("mainMenuClock");
const mainMenuLogoRefresh = document.getElementById("mainMenuLogoRefresh");
const installHint = document.getElementById("installHint");
const quoteDashboard = document.getElementById("quoteDashboard");
const bullionVaultChart = document.getElementById("bullionVaultChart");
const bullionVaultChartFallback = document.getElementById("bullionVaultChartFallback");
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
const aurumChatClose = document.getElementById("aurumChatClose");
const aurumChatMessages = document.getElementById("aurumChatMessages");
const aurumChatForm = document.getElementById("aurumChatForm");
const aurumQuestion = document.getElementById("aurumQuestion");
const aurumAskButton = document.getElementById("aurumAskButton");
const knowledgeForm = document.getElementById("knowledgeForm");
const knowledgeStatus = document.getElementById("knowledgeStatus");
const reindexKnowledge = document.getElementById("reindexKnowledge");
const knowledgeNoteForm = document.getElementById("knowledgeNoteForm");
const knowledgeNotesList = document.getElementById("knowledgeNotesList");
const aiFeedbackList = document.getElementById("aiFeedbackList");
const resetKnowledgeNoteButton = document.getElementById("resetKnowledgeNoteForm");
const dashboardGrid = document.getElementById("dashboardGrid");
const dashboardPanels = document.getElementById("dashboardPanels");
const storeForm = document.getElementById("storeForm");
const storesList = document.getElementById("storesList");
const antifraudList = document.getElementById("antifraudList");
const trainingCourseForm = document.getElementById("trainingCourseForm");
const trainingList = document.getElementById("trainingList");
const courseSummary = document.getElementById("courseSummary");
const courseSearch = document.getElementById("courseSearch");
const courseCategoryFilter = document.getElementById("courseCategoryFilter");
const trainingCourseReset = document.getElementById("trainingCourseReset");
const trainingCourseSaveButton = document.getElementById("trainingCourseSaveButton");
const trainingCourseFile = document.getElementById("trainingCourseFile");
const trainingCourseThumbnailFile = document.getElementById("trainingCourseThumbnailFile");
const trainingCourseVideoFile = document.getElementById("trainingCourseVideoFile");
const trainingCoursePdfFile = document.getElementById("trainingCoursePdfFile");
const trainingCourseFormPanel = document.getElementById("trainingCourseForm");
const crmSearch = document.getElementById("crmSearch");
const crmList = document.getElementById("crmList");
const backupsList = document.getElementById("backupsList");
const titleOptionsByMetal = {
  Oro: ["24 kt", "22 kt", "21 kt", "18 kt", "14 kt", "12 kt", "9 kt", "6 kt"],
  Argento: ["999", "925", "800"],
  Platino: ["999", "950", "900", "850"]
};
const metalOrder = ["Oro", "Argento", "Platino"];
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
const API_RETRY_ATTEMPTS = 3;
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
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // La PWA resta utilizzabile anche senza service worker.
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

function triggerLogoRefresh() {
  if (mainMenuLogoRefresh?.classList) {
    mainMenuLogoRefresh.classList.add("logo-refresh-clicked");
  }
  showToast("Aggiornamento app in corso...", "warning");
  window.setTimeout(() => {
    mainMenuLogoRefresh?.classList?.remove("logo-refresh-clicked");
  }, 220);
  window.setTimeout(() => {
    refreshApp({ silent: true });
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

function shouldRetryApi(error, responseStatus) {
  if (responseStatus && responseStatus < 500 && responseStatus !== 429) return false;
  return error?.name === "AbortError" || !navigator.onLine || !responseStatus || responseStatus >= 500 || responseStatus === 429;
}

function serverConnectionError() {
  const error = new Error("Connessione al server OroActive non riuscita");
  error.isConnectionError = true;
  return error;
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
        const error = new Error(body.error || "Errore comunicazione server");
        error.status = response.status;
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
    limit = ACT_LIST_LIMIT,
    offset = 0,
    silent = false
  } = options;
  const endpoint = q ? "/atti/search" : "/atti";
  const params = queryString({ store, field, q, limit, offset });
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
}

async function syncActsFromServer() {
  const activeArchive = document.getElementById("archive")?.classList.contains("active-screen");
  const activeFusion = document.getElementById("fusion")?.classList.contains("active-screen");
  if (activeArchive) {
    await loadArchiveScreenData({ force: true, silent: true });
    renderArchiveGroups();
  }
  if (activeFusion) {
    await loadFusionScreenData({ force: true, silent: true });
    renderFusionGroups();
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
  const identifier = act.id || state.editingActId || state.editingPracticeNumber || act.practiceNumber;
  const path = method === "PUT" ? `/atti/${encodeURIComponent(identifier)}` : "/atti";
  document.querySelectorAll("#archivePractice, #nextStep").forEach((button) => {
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
    document.querySelectorAll("#archivePractice, #nextStep").forEach((button) => {
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
  toast.textContent = message;
  toast.classList.remove("success", "error", "warning");
  if (type) toast.classList.add(type);
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show", "success", "error", "warning");
  }, 2600);
}

function showLogin() {
  clearStoredAuthToken();
  state.currentUser = null;
  if (mainUserMenuButton) mainUserMenuButton.textContent = "Elite";
  if (loggedUserName) loggedUserName.textContent = "";
  if (sessionUsername) sessionUsername.textContent = "";
  state.actsCache.clear();
  demoActs.splice(0, demoActs.length);
  loginScreen.hidden = false;
  splashScreen.classList.add("hidden");
  mainMenuScreen.hidden = true;
  closeMainMenuDropdowns();
  closeMainUserMenu();
  updateAurumMascotVisibility();
  appShell.hidden = true;
  if (state.syncTimer) window.clearInterval(state.syncTimer);
  state.syncTimer = null;
  window.clearTimeout(state.sessionTimeoutTimer);
  state.sessionTimeoutTimer = null;
}

function showAuthenticatedShell() {
  loginScreen.hidden = true;
  appShell.hidden = false;
  splashScreen.classList.remove("hidden");
  mainMenuScreen.hidden = true;
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
  return displayUsername(user) || [user.nome, user.cognome].filter(Boolean).join(" ").trim() || "Utente OroActive";
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
  mainMenuScreen.hidden = true;
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
  step.action?.();
  tutorialTitle.textContent = step.title;
  tutorialText.textContent = step.text;
  tutorialCount.textContent = `Passo ${state.tutorial.index + 1} di ${state.tutorial.steps.length}`;
  tutorialBack.disabled = state.tutorial.index === 0;
  tutorialNext.textContent = state.tutorial.index === state.tutorial.steps.length - 1 ? "Fine tutorial" : "Avanti";
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
  if (shouldRemember) markTutorialSeen();
  state.tutorial.active = false;
  state.tutorial.index = 0;
  state.tutorial.steps = [];
  state.tutorial.firstRun = false;
  tutorialOverlay.hidden = true;
  clearTutorialHighlight();
}

function startTutorial(options = {}) {
  if (!state.currentUser) return;
  state.tutorial.active = true;
  state.tutorial.index = 0;
  state.tutorial.steps = buildTutorialSteps();
  state.tutorial.firstRun = Boolean(options.firstRun);
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
  return Boolean(state.currentUser);
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

function canDeleteUserRow(user = {}) {
  return canEditUserRow(user) && user.canDelete !== false && String(user.id) !== String(state.currentUser?.id);
}

function currentUserStoreCode() {
  return storeCodeFromName(state.currentUser?.negozio || "Busto Arsizio");
}

function canManageBackupsUi() {
  return ["founder", "responsabile"].includes(userRole());
}

function applyRolePermissions() {
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
  document.querySelectorAll(".knowledge-editor-only").forEach((element) => {
    element.hidden = !canManageKnowledgeUi();
  });
  document.querySelectorAll(".control-only").forEach((element) => {
    element.hidden = !canViewControlSectionsUi();
  });

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
  updateAurumMascotVisibility();
}

async function startAuthenticatedApp() {
  showAuthenticatedShell();
  resetSessionTimeout();
  state.tutorial.pendingFirstRun = !localStorage.getItem(tutorialStorageKey());
  applyRolePermissions();
  startMainMenuClock();
  maybeShowInstallHint();
  await loadPendingSyncQueue();
  await loadAvailableStores();
  renderStep();
  await setPracticeMeta({ deferPracticeNumber: true });
  applyRolePermissions();
  updateSignatureState();
  updateDocumentCaptureCards();
  updateAttachmentState();
  updateCededItems();
  updateSaleTotal();
  updateCustomerSummary();
  renderPaymentCaptureCard();
  updateChecklistState();
  document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
  if (canViewUsersDirectory()) loadUsers();
  maybeShowLevelUnlockMessage();
  await flushPendingSync();
  if (!state.syncTimer) {
    state.syncTimer = window.setInterval(async () => {
      await flushPendingSync();
      await syncActsFromServer();
    }, 30000);
  }
}

async function restoreSession() {
  await loadStoredAuthToken();
  if (!state.authToken) {
    showLogin();
    return false;
  }
  try {
    const data = await apiRequest("/auth/me");
    state.currentUser = data.user;
    await startAuthenticatedApp();
    return true;
  } catch {
    showLogin();
    return false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "";
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
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
        ? "Connessione al server OroActive non riuscita"
        : error.status
          ? `Errore ${error.status}: ${error.message || "Accesso non riuscito."}`
          : error.message || "Accesso non riuscito.";
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
  if (id === "users" && !canViewUsersDirectory()) {
    showToast("Sezione non disponibile per il tuo ruolo.");
    return;
  }
  if (id === "knowledgeNotes" && !canManageKnowledgeUi()) {
    showToast("Sezione riservata a Founder o Responsabile.");
    return;
  }
  if (["dashboard", "antifraud"].includes(id) && !canViewControlSectionsUi()) {
    showToast("Sezione riservata a Founder, Supervisore o Responsabile.");
    return;
  }
  if (id === "stores" && !isFounder()) {
    showToast("Sezione riservata al Founder.");
    return;
  }
  if (id === "backups" && !canManageBackupsUi()) {
    showToast("Sezione riservata a Founder o Responsabile.");
    return;
  }
  closeMainMenuDropdowns();
  closeMainUserMenu();
  const leavingArchive = document.getElementById("archive")?.classList.contains("active-screen") && id !== "archive";
  if (leavingArchive) clearActSearch();
  screens.forEach((screen) => screen.classList.toggle("active-screen", screen.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.section === id));
  if (practiceTopbar) practiceTopbar.hidden = id !== "practice";
  if (id !== "quotazione" && bullionVaultChart) {
    bullionVaultChart.innerHTML = "";
    state.bullionChartLoaded = false;
  }
  handleScreenDataLoad(id);
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
  if (id === "quotazione") {
    renderQuoteDashboard();
    await refreshBullionVaultPrices();
    initBullionVaultChart();
  }
  if (id === "backups") await loadBackups();
  if (id === "stores") await loadStores();
  if (id === "antifraud") await loadAntifraud();
  if (id === "training") await loadTraining();
  if (id === "crm") await loadCrmClients();
  if (id === "assistant") {
    renderAssistantMessages();
    if (isFounder()) await loadKnowledgeStatus();
  }
  if (id === "knowledgeNotes") {
    resetKnowledgeNoteFormValues();
    await loadKnowledgeNotes();
    if (isFounder()) await loadAiFeedback();
  }
  if (id === "profile") {
    renderProfileCard();
  }
  if (id === "users") await loadUsers();
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

function showMainMenuFromSplash() {
  splashScreen.classList.add("hidden");
  mainMenuScreen.hidden = false;
  updateAurumMascotVisibility();
  maybeStartFirstRunTutorial();
}

async function enterSectionFromMainMenu(section) {
  mainMenuScreen.hidden = true;
  updateAurumMascotVisibility();
  if (section === "practice") {
    setScreen(section);
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
  closeBrandMenu();
  clearActSearch();
  mainMenuScreen.hidden = false;
  updateAurumMascotVisibility();
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
  const roleSelect = document.getElementById("userRole");
  const storeSelect = document.getElementById("userStore");
  const emailLabel = document.getElementById("userEmailLabel");
  const emailInput = document.getElementById("userEmail");
  if (!roleSelect || !storeSelect) return;
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
      canDelete ? `<button class="danger-button" type="button" data-delete-user="${escapeHtml(String(user.id))}">Disattiva</button>` : ""
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
  if (!isAdmin()) return;
  if (state.savingUser) return;
  const id = document.getElementById("userId").value;
  const isEditing = Boolean(id);
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
    showToast("Sezione non disponibile per il tuo ruolo.");
    return;
  }
  const confirmed = window.confirm(`Vuoi disattivare l'utente ${displayUserFullName(user)}?`);
  if (!confirmed) return;
  try {
    await apiRequest(`/utenti/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadUsers();
    showToast("Utente disattivato correttamente.", "success");
  } catch (error) {
    showToast(error.message || "Utente non disattivato.");
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
      ${message.source ? `<span class="assistant-source">Fonte: ${escapeHtml(message.source)}</span>` : ""}
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

function stopAurumTips() {
  window.clearTimeout(state.aurumTipTimer);
  window.clearTimeout(state.aurumTipHideTimer);
  state.aurumTipTimer = null;
  state.aurumTipHideTimer = null;
  if (aurumTipBubble) aurumTipBubble.hidden = true;
}

function shouldShowAurumMascot() {
  return Boolean(state.currentUser);
}

function updateAurumMascotVisibility() {
  const visible = shouldShowAurumMascot();
  if (aurumMascotRoot) aurumMascotRoot.hidden = !visible;
  if (!visible || mainMenuScreen?.hidden) {
    stopAurumTips();
    if (aurumChatPanel) aurumChatPanel.hidden = true;
    return;
  }
  scheduleAurumTips();
}

function renderAurumMessages() {
  if (!aurumChatMessages) return;
  if (!state.aurumMessages.length) {
    aurumChatMessages.innerHTML = '<div class="empty-state">Aurum è pronto per rispondere usando l’Assistente IA OroActive.</div>';
    return;
  }
  aurumChatMessages.innerHTML = state.aurumMessages.map((message) => `
    <article class="aurum-message ${message.role === "user" ? "user" : "assistant"}">${escapeHtml(message.content || "")}</article>
  `).join("");
  aurumChatMessages.scrollTop = aurumChatMessages.scrollHeight;
}

function openAurumChat() {
  if (!shouldShowAurumMascot()) return;
  if (mainMenuScreen) mainMenuScreen.hidden = false;
  closeMainMenuDropdowns();
  closeMainUserMenu();
  if (aurumChatPanel) aurumChatPanel.hidden = false;
  if (aurumTipBubble) aurumTipBubble.hidden = true;
  renderAurumMessages();
  window.setTimeout(() => aurumQuestion?.focus(), 60);
  updateAurumMascotVisibility();
}

function closeAurumChat() {
  if (aurumChatPanel) aurumChatPanel.hidden = true;
}

function showAurumTip(text = "") {
  if (!shouldShowAurumMascot() || mainMenuScreen?.hidden || !aurumTipBubble || !aurumTipText) return;
  const message = text || AURUM_TIPS[state.aurumTipIndex % AURUM_TIPS.length];
  state.aurumTipIndex += 1;
  aurumTipText.textContent = message;
  aurumTipBubble.hidden = false;
  window.clearTimeout(state.aurumTipHideTimer);
  state.aurumTipHideTimer = window.setTimeout(() => {
    if (aurumTipBubble) aurumTipBubble.hidden = true;
  }, 6500);
}

function scheduleAurumTips() {
  window.clearTimeout(state.aurumTipTimer);
  if (!shouldShowAurumMascot() || mainMenuScreen?.hidden) return;
  state.aurumTipTimer = window.setTimeout(() => {
    showAurumTip();
    scheduleAurumTips();
  }, 24000);
}

async function askAurum(event) {
  event.preventDefault();
  if (state.aurumSending) return;
  const question = aurumQuestion?.value.trim();
  if (!question) {
    showToast("Scrivi una domanda per Aurum.");
    return;
  }
  state.aurumMessages.push({ role: "user", content: question });
  if (aurumQuestion) aurumQuestion.value = "";
  renderAurumMessages();
  state.aurumSending = true;
  if (aurumAskButton) aurumAskButton.disabled = true;
  try {
    const data = await apiRequest("/ai/assistente", {
      method: "POST",
      body: JSON.stringify({ domanda: question, mode: "chat", interface: "aurum_official_mascot" }),
      timeoutMs: 60000
    });
    state.aurumMessages.push({
      role: "assistant",
      content: data.risposta || "Risposta non disponibile."
    });
  } catch (error) {
    state.aurumMessages.push({
      role: "assistant",
      content: error.message || "Aurum non riesce a contattare l'Assistente IA in questo momento."
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
    metricCard("Oro mensile", `${Number(kpi.grammi_mensili?.Oro || 0).toFixed(2)} gr`),
    metricCard("Argento mensile", `${Number(kpi.grammi_mensili?.Argento || 0).toFixed(2)} gr`),
    metricCard("Platino mensile", `${Number(kpi.grammi_mensili?.Platino || 0).toFixed(2)} gr`)
  ].join("");
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
        <strong>${escapeHtml(alert.livello || "medio")}</strong>
        <span>${escapeHtml(alert.tipo_alert || "")}</span>
        <span>${escapeHtml(alert.practice_number || "")}</span>
        <span>${escapeHtml([alert.cliente_nome, alert.cliente_cognome].filter(Boolean).join(" ") || "Dato non inserito")}</span>
        <em>${escapeHtml(alert.stato || "nuovo")}</em>
        <select data-antifraud-status="${alert.id}">
          <option value="">Aggiorna</option>
          <option value="in verifica">In verifica</option>
          <option value="risolto">Risolto</option>
          <option value="falso positivo">Falso positivo</option>
        </select>
        <small>${escapeHtml(alert.descrizione || "")}</small>
      </div>
    `).join("")}
  `;
}

async function loadAntifraud() {
  try {
    const data = await apiRequest("/antifrode");
    state.antifraudAlerts = data.alerts || [];
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
  if (trainingCourseSaveButton) trainingCourseSaveButton.textContent = "Crea corso";
}

function renderCourseSummary() {
  if (!courseSummary) return;
  const progresses = state.courseProgress || [];
  const average = progresses.length
    ? Math.round(progresses.reduce((sum, item) => sum + Number(item.percentuale || 0), 0) / progresses.length)
    : 0;
  courseSummary.innerHTML = `<span>Livello ${escapeHtml(operatorAcademyLevel())}</span><strong>${average}%</strong><small>Completamento medio</small>`;
}

function renderTraining() {
  if (!trainingList) return;
  renderCourseSummary();
  if (trainingCourseForm) {
    trainingCourseForm.hidden = !(state.courseActiveTab === "management" && canManageCoursesUi());
  }
  document.querySelectorAll("[data-course-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.courseTab === state.courseActiveTab);
  });

  const search = String(courseSearch?.value || "").trim().toLowerCase();
  const category = String(courseCategoryFilter?.value || "").trim();
  const visibleCourses = state.trainingCourses.filter((course) => {
    const matchesSearch = !search || [course.title, course.description, course.section_title, course.category_name, course.faculty_name, course.level, course.teacher]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesCategory = !category || String(course.category_name || course.category || "") === category;
    return matchesSearch && matchesCategory;
  });

  if (state.courseActiveTab === "mine") {
    const mine = visibleCourses.filter((course) => Number(courseProgressFor(course.id).percentuale || 0) > 0 || courseProgressFor(course.id).status);
    trainingList.innerHTML = mine.length ? mine.map(renderCourseCard).join("") : '<div class="empty-state">Non hai ancora iniziato corsi.</div>';
    return;
  }

  if (state.courseActiveTab === "history") {
    const rows = (state.courseProgress || []).map((progress) => {
      const course = state.trainingCourses.find((item) => String(item.id) === String(progress.course_id)) || {};
      return `
        <article class="course-card badge-card">
          <div>
            <span class="course-pill">Storico formazione</span>
            <h3>${escapeHtml(course.title || "Corso OroActive")}</h3>
            <p>${escapeHtml(progress.status || "non iniziato")} · ${Number(progress.percentuale || 0)}% · Ultimo accesso ${progress.last_access_at ? new Date(progress.last_access_at).toLocaleDateString("it-IT") : "Dato non inserito"}</p>
          </div>
          <strong>${escapeHtml(course.faculty_name || "Academy")}</strong>
        </article>
      `;
    });
    trainingList.innerHTML = rows.length ? rows.join("") : '<div class="empty-state">Nessuno storico formazione disponibile.</div>';
    return;
  }

  if (state.courseActiveTab === "management") {
    if (!canManageCoursesUi()) {
      trainingList.innerHTML = '<div class="empty-state">Gestione Academy riservata al Founder.</div>';
      return;
    }
    const facultyOptions = (state.courseFaculties || []).map((faculty) => `<option>${escapeHtml(faculty.name)}</option>`).join("");
    const facultySelect = document.getElementById("trainingCourseFaculty");
    if (facultySelect && facultyOptions) facultySelect.innerHTML = facultyOptions;
    const facultyRows = (state.courseFaculties || []).map((faculty) => `
      <article class="course-card badge-card">
        <div>
          <span class="course-pill">Facoltà</span>
          <h3>${escapeHtml(faculty.name)}</h3>
          <p>${escapeHtml(faculty.description || "Facoltà OroActive Academy")}</p>
        </div>
        <div class="course-progress-panel">
          <strong>${state.trainingCourses.filter((course) => course.faculty_name === faculty.name).length} corsi</strong>
          <button type="button" data-edit-academy-faculty="${escapeHtml(String(faculty.id))}">Modifica facoltà</button>
          <button class="danger-button" type="button" data-delete-academy-faculty="${escapeHtml(String(faculty.id))}">Elimina facoltà</button>
        </div>
      </article>
    `);
    trainingList.innerHTML = `
      <article class="course-card academy-course-card">
        <div>
          <span class="course-pill">Gestione Academy</span>
          <h3>Crea facoltà</h3>
          <p>Le facoltà ordinano corsi, moduli, lezioni e certificazioni come una piccola università interna.</p>
          <div class="academy-faculty-form">
            <input id="academyFacultyName" placeholder="Nome facoltà">
            <input id="academyFacultyDescription" placeholder="Descrizione facoltà">
            <button class="primary-button" type="button" data-create-academy-faculty>Crea facoltà</button>
          </div>
        </div>
      </article>
      ${facultyRows.join("") || '<div class="empty-state">Nessuna facoltà configurata.</div>'}
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

  trainingList.innerHTML = visibleCourses.length ? visibleCourses.map(renderCourseCard).join("") : '<div class="empty-state">Nessun corso attivo.</div>';
}

function renderCourseCard(course) {
  const progress = courseProgressFor(course.id);
  const percent = Math.max(0, Math.min(100, Number(progress.percentuale || course.percentuale || 0)));
  const status = progress.status || course.status || "non iniziato";
  const canManage = canManageCoursesUi();
  const canEvaluate = canEvaluateCoursesUi();
  const lessonId = course.lesson_id && Number(course.lesson_id) > 0 ? String(course.lesson_id) : "";
  const videoUrl = course.academy_video_url || course.video_url || "";
  const pdfUrl = course.academy_pdf_url || course.pdf_url || "";
  const isUploadedVideo = /^\/api\/academy\/materials\/file\//.test(String(videoUrl)) || /\.(mp4|mov)(\?|#|$)/i.test(String(videoUrl));
  const moduleTitle = course.academy_module_title || course.module_title || course.section_title || "Modulo introduttivo";
  const lessonTitle = course.academy_lesson_title || course.lesson_title || "Lezione principale";
  return `
    <article class="course-card academy-course-card">
      <div class="course-card-main">
        <span class="course-pill">${escapeHtml(course.faculty_name || "OroActive Academy")}</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description || "")}</p>
        <div class="academy-course-meta">
          <span>${escapeHtml(course.category_name || course.category || "Formazione")}</span>
          <span>Livello ${escapeHtml(course.level || "Base")}</span>
          <span>Durata ${escapeHtml(course.duration_label || (course.duration_minutes ? `${course.duration_minutes} min` : "Da definire"))}</span>
          <span>Docente ${escapeHtml(course.teacher || "OroActive")}</span>
        </div>
        <small>${escapeHtml(moduleTitle)} · ${escapeHtml(lessonTitle)} · Stato: ${escapeHtml(status)}</small>
        ${isUploadedVideo ? `<video class="academy-video-player" controls playsinline preload="metadata" src="${escapeHtml(videoUrl)}"></video>` : ""}
        <div class="academy-materials">
          ${videoUrl ? `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">Guarda video lezione</a>` : ""}
          ${pdfUrl ? `<a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" download>Scarica PDF lezione</a>` : ""}
          ${course.material_url ? `<a href="${escapeHtml(course.material_url)}" target="_blank" rel="noopener">Apri materiale didattico</a>` : ""}
        </div>
        <label class="academy-note-label">Appunti personali
          <textarea data-academy-note="${escapeHtml(String(course.id))}" data-academy-lesson="${escapeHtml(lessonId)}" rows="3" placeholder="Scrivi appunti sulla lezione">${escapeHtml(course.user_note || "")}</textarea>
        </label>
      </div>
      <div class="course-progress-panel">
        <div class="course-progress"><span style="width:${percent}%"></span></div>
        <strong>${percent}%</strong>
        <button type="button" data-course-progress="${escapeHtml(String(course.id))}">${percent > 0 ? "Continua corso" : "Inizia corso"}</button>
        <button type="button" data-save-academy-note="${escapeHtml(String(course.id))}" data-academy-lesson="${escapeHtml(lessonId)}">Salva appunti</button>
        <button type="button" data-course-ai="${escapeHtml(String(course.id))}">Chiedi all'AI</button>
        ${canEvaluate ? `<button class="primary-button" type="button" data-course-exam="${escapeHtml(String(course.id))}">Segna esame superato</button>` : ""}
        ${canManage ? `<button type="button" data-edit-course="${escapeHtml(String(course.id))}">Modifica</button>` : ""}
        ${canManage ? `<button class="danger-button" type="button" data-delete-course="${escapeHtml(String(course.id))}">Elimina corso</button>` : ""}
        ${canManage && course.material_id ? `<button type="button" data-delete-course-material="${escapeHtml(String(course.material_id))}">Elimina materiale</button>` : ""}
        ${canManage && course.section_id ? `<button type="button" data-delete-course-section="${escapeHtml(String(course.section_id))}">Elimina sottosezione</button>` : ""}
      </div>
    </article>
  `;
}

async function loadTraining() {
  const data = await apiRequest("/corsi");
  state.courseFaculties = data.faculties || [];
  state.trainingCourses = data.courses || [];
  state.courseCategories = data.categories || [];
  state.courseSections = data.sections || [];
  state.courseProgress = data.progress || [];
  state.courseCertificates = data.certificates || [];
  state.courseBadges = data.badges || [];
  renderTraining();
}

async function createTrainingCourse(event) {
  event.preventDefault();
  if (!canManageCoursesUi()) return;
  const id = document.getElementById("trainingCourseId")?.value;
  const selectedFile = trainingCourseFile?.files?.[0];
  const thumbnailFile = trainingCourseThumbnailFile?.files?.[0];
  const videoFile = trainingCourseVideoFile?.files?.[0];
  const pdfFile = trainingCoursePdfFile?.files?.[0];
  const materialDataUrl = selectedFile ? await fileToDataUrl(selectedFile) : "";
  const thumbnailDataUrl = thumbnailFile ? await fileToDataUrl(thumbnailFile) : "";
  const videoDataUrl = videoFile ? await fileToDataUrl(videoFile) : "";
  const pdfDataUrl = pdfFile ? await fileToDataUrl(pdfFile) : "";
  await apiRequest(id ? `/corsi/${encodeURIComponent(id)}` : "/corsi", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify({
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
      active: document.getElementById("trainingCourseActive").checked,
      final_certification: document.getElementById("trainingCourseCertification").checked
    })
  });
  resetTrainingCourseFormValues();
  await loadTraining();
  showToast(id ? "Corso aggiornato correttamente" : "Corso creato.");
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

function editCourse(courseId) {
  const course = state.trainingCourses.find((item) => String(item.id) === String(courseId));
  if (!course) return;
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
  assistantQuestion.value = `Aiutami a studiare questa lezione OroActive Academy:\nCorso: ${course.title}\nFacoltà: ${course.faculty_name || "OroActive Academy"}\nModulo: ${course.academy_module_title || course.module_title || ""}\nLezione: ${course.academy_lesson_title || course.lesson_title || ""}\n\nRiassumi i punti chiave e preparami 5 domande di ripasso.`;
  assistantQuestion.focus();
}

async function deleteCourse(courseId) {
  if (!canManageCoursesUi()) return;
  if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;
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
  const response = await fetch(`${apiBase}/corsi/certificati/${encodeURIComponent(certificateId)}/pdf`, {
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
        <span>${Number(client.atti_count || 0)} atti · ${escapeHtml(formatEuro(client.totale_pagato || 0))}</span>
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
  if (["archived_completed", "archiviato completato", "archiviata completata"].includes(normalized)) return "Archiviato completato";
  if (["draft", "bozza"].includes(normalized)) return "Bozza";
  if (["archived_incomplete", "archived", "archiviato", "archiviata", "archiviato incompleto", "archiviata incompleta"].includes(normalized)) return "Archiviato incompleto";
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
  if (label === "Eliminato") return "deleted";
  if (label === "Abbandonato") return "abandoned";
  return "archived_incomplete";
}

function workflowStatusListLabel(status = "") {
  const code = workflowStatusCode(status);
  if (code === "completed" || code === "archived_completed") return "Completato";
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
  }
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

function selectedFusionStore() {
  return document.getElementById("fusionStoreFilter")?.value || "Busto Arsizio";
}

async function loadArchiveScreenData(options = {}) {
  await loadSavedActs({
    force: options.force || false,
    store: selectedArchiveStore(),
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
    return storeMatches && keywordMatches;
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
                        <small>${isCompletedWorkflowStatus(act.status) ? "Completato" : "Archiviato"}</small>
                      </span>
                      <span>${escapeHtml(act.store || "Dato non inserito")}</span>
                      <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                      <span>
                        <small>Creazione: ${escapeHtml(formatDateTime(act.createdAt || act.date))}</small>
                        <small>Completamento: ${escapeHtml(formatDateTime(act.completedAt))}</small>
                      </span>
                      <em class="${statusClass(act.status)}">${escapeHtml(workflowStatusListLabel(act.status))}</em>
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

  previewTitle.textContent = `Atto di vendita ${act.practiceNumber}`;
  previewBody.innerHTML = `
    <div class="readonly-actions">
      <button type="button" data-preview-act-print="${escapeHtml(act.practiceNumber)}" data-preview-print-scope="customer">Stampa copia cliente</button>
      <button type="button" data-preview-act-print="${escapeHtml(act.practiceNumber)}" data-preview-print-scope="company">Stampa copia aziendale</button>
    </div>
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
  state.editingDirty = false;
  state.suppressDirtyTracking = false;
  state.loadedSignatureImages = SIGNATURE_LABELS.map(() => "");
  state.fiscalCodeEditedManually = false;
  state.captureGroup = null;
  state.lastActCaptureAttachments = [];
  state.cashLimitWarningShown = false;
  state.amlCashCheck = null;
  window.clearTimeout(state.amlCashCheckTimer);
  renderAmlCashAlert();
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

function renderFusionGroups() {
  const container = document.getElementById("fusionGroups");
  if (!container) return;
  const selectedStore = document.getElementById("fusionStoreFilter")?.value || "Tutti";

  const acts = demoActs
    .map((act) => ({ ...act, daysElapsed: daysFromPurchase(act.date), fusionDate: addDays(act.date, 10) }))
    .sort((first, second) => dateValue(second.date) - dateValue(first.date));

  if (!acts.length) {
    container.innerHTML = '<div class="empty-state">Nessuna giacenza disponibile per i negozi autorizzati.</div>';
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

function printBothCopies() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "le copie cliente e aziendale"));
    return;
  }
  preparePrintPacket();
  window.print();
}

function printCustomerCopy() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
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

function showPrintPreview(scope) {
  renderPaymentCaptureCard();
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
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

function showCustomerCopyOptions() {
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
  if (normalizeWorkflowStatus(status) !== "Bozza" && notifyCashPaymentLimitIfNeeded({ force: true })) return false;
  const review = currentQualityReview();
  if (review?.status === "negative" && !review.feedback) {
    showToast("Inserisci il feedback scritto per il controllo qualità negativo.");
    return false;
  }
  const requestedStatus = workflowStatusCode(status);
  const hasCompleteData = validatePrintScope("company").length === 0;
  const targetStatus = requestedStatus === "completed"
    ? "completed"
    : requestedStatus === "archived_completed"
      ? "archived_completed"
      : requestedStatus === "draft"
        ? "draft"
        : hasCompleteData
          ? "archived_completed"
          : "archived_incomplete";
  const isCompletion = ["completed", "archived_completed"].includes(targetStatus);
  const missing = isCompletion ? validatePrintScope("company") : [];
  if (isCompletion && missing.length && !options.skipValidation) {
    showToast(validationMessage(missing, "la copia aziendale"));
    return false;
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
  try {
    await saveActRecord(archivedAct, wasEditing ? "PUT" : "POST");
  } catch (error) {
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
  if (wasEditing && options.destination === "menu") mainMenuScreen.hidden = false;
  const successMessage = targetStatus === "archived_incomplete"
    ? "Atto archiviato. Puoi riaprirlo e completarlo dall'elenco."
    : targetStatus === "archived_completed"
      ? "Atto completato e archiviato correttamente."
      : targetStatus === "completed"
        ? "Atto completato correttamente."
        : wasEditing
          ? "Atto di vendita modificato e salvato."
          : "Atto di vendita salvato.";
  showToast(wasEditing && targetStatus !== "archived_incomplete" ? "Atto di vendita modificato e salvato." : successMessage, "success");
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
    showLoading("Controllo AI pratica...");
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
  const missing = validatePrintScope("company");
  if (!missing.length) {
    const act = currentActSnapshot("Completato");
    const aiCheck = await runAiActCheck(act);
    const aiProblems = [
      ...(aiCheck?.errori || []),
      ...(aiCheck?.campi_mancanti || []),
      ...(aiCheck?.incongruenze || [])
    ];
    if (aiCheck && !aiCheck.ok && aiProblems.length) {
      const preview = aiProblems.slice(0, 6).join(", ");
      const proceed = window.confirm(`Controllo AI: ${preview}. Vuoi completare comunque la pratica?`);
      if (!proceed) {
        if (aiCheck.suggerimenti?.length) showToast(`Suggerimento AI: ${aiCheck.suggerimenti[0]}`);
        return false;
      }
    }
    return archiveCurrentPractice("completed");
  }

  const preview = missing.slice(0, 8).join(", ");
  const suffix = missing.length > 8 ? ` e altri ${missing.length - 8} elementi` : "";
  const shouldArchive = window.confirm(
    `La pratica non puo essere completata. Mancano: ${preview}${suffix}. Vuoi archiviare l'atto di vendita per completarlo successivamente?`
  );

  if (shouldArchive) {
    await archiveCurrentPractice("archived_incomplete");
    showToast("Atto di vendita archiviato. Potrai completarlo da Elenco.");
    return true;
  }

  showToast(validationMessage(missing, "la pratica"));
  return false;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setScreen(item.dataset.section));
});

loginForm.addEventListener("submit", handleLogin);
faceIdLoginButton.addEventListener("click", loginWithFaceId);
logoutButton.addEventListener("click", handleLogout);
registerFaceIdButton.addEventListener("click", registerFaceId);
document.getElementById("userForm").addEventListener("submit", saveUser);
document.getElementById("resetUserForm").addEventListener("click", resetUserForm);
document.getElementById("usersList").addEventListener("click", (event) => {
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
document.getElementById("usersList").addEventListener("change", (event) => {
  const select = event.target.closest("[data-user-action]");
  if (!select || !select.value) return;
  const id = select.dataset.userAction;
  if (select.value === "stats") showUserStatistics(id);
  if (select.value === "edit") editUser(id);
  if (select.value === "delete") deleteUser(id);
  select.value = "";
});
document.getElementById("userRole").addEventListener("change", configureUserFormPermissions);
mainMenuLogoRefresh?.addEventListener("click", triggerLogoRefresh);
mainMenuLogoRefresh?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  triggerLogoRefresh();
});
assistantForm?.addEventListener("submit", askAssistant);
aurumMascotButton?.addEventListener("click", () => {
  aurumMascotButton.classList.add("aurum-clicked");
  window.setTimeout(() => aurumMascotButton.classList.remove("aurum-clicked"), 220);
  openAurumChat();
});
aurumChatClose?.addEventListener("click", closeAurumChat);
aurumTipClose?.addEventListener("click", () => {
  if (aurumTipBubble) aurumTipBubble.hidden = true;
});
aurumChatForm?.addEventListener("submit", askAurum);
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
  if (!select || !select.value) return;
  await apiRequest(`/antifrode/${select.dataset.antifraudStatus}`, {
    method: "PUT",
    body: JSON.stringify({ stato: select.value })
  });
  await loadAntifraud();
});
trainingCourseForm?.addEventListener("submit", createTrainingCourse);
trainingCourseReset?.addEventListener("click", resetTrainingCourseFormValues);
courseSearch?.addEventListener("input", renderTraining);
courseCategoryFilter?.addEventListener("change", renderTraining);
document.querySelectorAll("[data-course-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    state.courseActiveTab = button.dataset.courseTab || "catalog";
    renderTraining();
  });
});
trainingList?.addEventListener("click", async (event) => {
  const progress = event.target.closest("[data-course-progress]");
  const exam = event.target.closest("[data-course-exam]");
  const edit = event.target.closest("[data-edit-course]");
  const deleteCourseButton = event.target.closest("[data-delete-course]");
  const deleteMaterialButton = event.target.closest("[data-delete-course-material]");
  const deleteSectionButton = event.target.closest("[data-delete-course-section]");
  const certificate = event.target.closest("[data-download-certificate]");
  const noteButton = event.target.closest("[data-save-academy-note]");
  const aiButton = event.target.closest("[data-course-ai]");
  const createFaculty = event.target.closest("[data-create-academy-faculty]");
  const editFaculty = event.target.closest("[data-edit-academy-faculty]");
  const deleteFaculty = event.target.closest("[data-delete-academy-faculty]");
  try {
    if (progress) await updateCourseProgress(progress.dataset.courseProgress);
    if (exam) await markCourseExamPassed(exam.dataset.courseExam);
    if (edit) editCourse(edit.dataset.editCourse);
    if (deleteCourseButton) await deleteCourse(deleteCourseButton.dataset.deleteCourse);
    if (deleteMaterialButton) await deleteCourseMaterial(deleteMaterialButton.dataset.deleteCourseMaterial);
    if (deleteSectionButton) await deleteCourseSection(deleteSectionButton.dataset.deleteCourseSection);
    if (certificate) await downloadCourseCertificate(certificate.dataset.downloadCertificate);
    if (noteButton) await saveAcademyNote(noteButton.dataset.saveAcademyNote, noteButton.dataset.academyLesson);
    if (aiButton) askCourseAi(aiButton.dataset.courseAi);
    if (createFaculty) await createAcademyFaculty();
    if (editFaculty) await editAcademyFaculty(editFaculty.dataset.editAcademyFaculty);
    if (deleteFaculty) await deleteAcademyFaculty(deleteFaculty.dataset.deleteAcademyFaculty);
  } catch (error) {
    showToast(error.message || "Operazione corso non riuscita.");
  }
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
  try {
    if (saveClient) await saveCrmClient(saveClient.dataset.saveCrmClient);
    if (deleteClient) await deleteCrmClient(deleteClient.dataset.deleteCrmClient);
  } catch (error) {
    showToast(error.message || "Operazione CRM non riuscita.");
  }
});
document.getElementById("runBackupNow")?.addEventListener("click", () => runBackupNow());
backupsList?.addEventListener("click", (event) => {
  const download = event.target.closest("[data-download-backup]");
  const view = event.target.closest("[data-view-backup]");
  const deleteButton = event.target.closest("[data-delete-backup]");
  const verify = event.target.closest("[data-verify-backup]");
  const restore = event.target.closest("[data-test-restore-backup]");
  if (download) downloadBackup(download.dataset.downloadBackup);
  if (view) viewBackup(view.dataset.viewBackup);
  if (deleteButton) deleteBackup(deleteButton.dataset.deleteBackup);
  if (verify) verifyBackup(verify.dataset.verifyBackup);
  if (restore) testRestoreBackup(restore.dataset.testRestoreBackup);
});
document.getElementById("refreshQuoteDashboard")?.addEventListener("click", () => {
  refreshBullionVaultPrices({ notify: true });
  initBullionVaultChart();
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

brandMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleBrandMenu();
});

enterSoftware.addEventListener("click", showMainMenuFromSplash);

document.querySelectorAll(".main-menu-actions button").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (button.dataset.mainMenuToggle) {
      toggleMainMenuDropdown(button.dataset.mainMenuToggle);
      return;
    }
    if (button.matches("[data-open-oroactive-website]")) {
      openOroActiveWebsite();
      closeMainMenuDropdowns();
      return;
    }
    if (button.matches("[data-start-tutorial]")) return;
    if (button.dataset.section) enterSectionFromMainMenu(button.dataset.section);
  });
});

mainUserMenuButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMainUserMenu();
});

mainUserDropdown?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (event.target.closest("[data-user-profile]")) {
    mainMenuScreen.hidden = true;
    updateAurumMascotVisibility();
    setScreen("profile");
    return;
  }
  if (event.target.closest("[data-user-users]")) {
    mainMenuScreen.hidden = true;
    updateAurumMascotVisibility();
    setScreen("users");
    return;
  }
  if (event.target.closest("[data-user-logout]")) {
    handleLogout();
  }
});

document.querySelectorAll("[data-start-tutorial]").forEach((button) => {
  button.addEventListener("click", () => {
    closeMainMenuDropdowns();
    closeBrandMenu();
    if (!button.closest(".main-menu-actions")) mainMenuScreen.hidden = true;
    updateAurumMascotVisibility();
    startTutorial({ firstRun: false });
  });
});

tutorialNext.addEventListener("click", () => {
  if (!state.tutorial.active) return;
  if (state.tutorial.index >= state.tutorial.steps.length - 1) {
    finishTutorial({ remember: true });
    showToast("Tutorial completato. Puoi iniziare la compilazione dell'atto.");
    return;
  }
  state.tutorial.index += 1;
  renderTutorialStep();
});

tutorialBack.addEventListener("click", () => {
  if (!state.tutorial.active || state.tutorial.index === 0) return;
  state.tutorial.index -= 1;
  renderTutorialStep();
});

tutorialSkip.addEventListener("click", () => {
  finishTutorial({ remember: true });
  showToast("Tutorial chiuso. Puoi riaprirlo dal menu quando vuoi.");
});

document.querySelectorAll("[data-return-menu]").forEach((button) => {
  button.addEventListener("click", returnToMainMenu);
});

brandDropdown.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (button.dataset.brandSubmenuToggle) {
      toggleBrandSubmenu(button.dataset.brandSubmenuToggle);
      return;
    }
    if (button.matches("[data-open-oroactive-website]")) {
      openOroActiveWebsite();
      closeBrandMenu();
      return;
    }
    if (button.matches("[data-start-tutorial]")) return;
    if (!button.dataset.section) return;
    setScreen(button.dataset.section);
    if (button.dataset.section === "practice") await resetCurrentPractice({ deferPracticeNumber: true });
    closeBrandMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!brandDropdown.hidden && !event.target.closest(".brand-wrap")) closeBrandMenu();
  if (mainUserDropdown && !mainUserDropdown.hidden && !event.target.closest(".main-user-menu")) closeMainUserMenu();
  if (mainMenuScreen && !mainMenuScreen.hidden && !event.target.closest(".main-menu-group")) closeMainMenuDropdowns();
});

steps.forEach((step) => {
  step.addEventListener("click", () => {
    state.step = Number(step.dataset.step);
    renderStep();
  });
});

document.getElementById("nextStep").addEventListener("click", async () => {
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

document.getElementById("previousStep").addEventListener("click", () => {
  if (state.step > 0) {
    state.step -= 1;
    renderStep();
  }
});

document.getElementById("deleteCurrentPractice").addEventListener("click", deleteCurrentPractice);
document.getElementById("saveQualityReview").addEventListener("click", saveQualityReview);

document.getElementById("printCustomerCopySummary").addEventListener("click", printCustomerCopy);
document.getElementById("printCompanyCopySummary").addEventListener("click", printCompanyCopy);

document.getElementById("archivePractice").addEventListener("click", () => archiveCurrentPractice("Archiviata"));

document.getElementById("addCededItem").addEventListener("click", () => {
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

document.getElementById("cededItemsTable").addEventListener("input", (event) => {
  markPracticeDirty();
  updateCededItems();
  updateChecklistState();
});

document.getElementById("cededItemsTable").addEventListener("change", (event) => {
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
  }
});

document.getElementById("saleTotal").addEventListener("input", () => {
  markPracticeDirty();
  updateSaleTotal();
  notifyCashPaymentLimitIfNeeded();
  updateChecklistState();
});

document.getElementById("materialAmountFields").addEventListener("input", () => {
  markPracticeDirty();
  updateChecklistState();
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
});

document.getElementById("paymentMethod").addEventListener("change", () => {
  markPracticeDirty();
  scheduleAmlCashCheck();
  notifyCashPaymentLimitIfNeeded();
  renderAmlCashAlert();
  renderPaymentCaptureCard();
  scheduleAmlCashCheck();
  updateAttachmentState();
  updateChecklistState();
});

document.getElementById("storeCode").addEventListener("change", async () => {
  markPracticeDirty();
  await updatePracticeNumber();
  updateChecklistState();
});
document.getElementById("practiceDate").addEventListener("change", async () => {
  markPracticeDirty();
  await updatePracticeNumber();
  scheduleAmlCashCheck();
  updateChecklistState();
});

document.getElementById("archiveStoreFilter").addEventListener("change", async () => {
  document.getElementById("archiveStoreFilter").dataset.userSelected = "true";
  state.archivePage = 1;
  state.searchActive = false;
  state.lastSearchResults = [];
  const keyword = document.getElementById("searchKeyword");
  if (keyword) keyword.value = "";
  await loadArchiveScreenData({ force: true });
  renderArchiveGroups();
});
document.getElementById("fusionStoreFilter").addEventListener("change", async () => {
  await loadFusionScreenData({ force: true });
  renderFusionGroups();
});

document.getElementById("archiveGroups").addEventListener("click", (event) => {
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

document.getElementById("fusionGroups").addEventListener("click", (event) => {
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

previewBody.addEventListener("click", async (event) => {
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

document.getElementById("exportDailyPdf").addEventListener("click", exportDailySearchPdf);
document.getElementById("exportMonthlyPdf").addEventListener("click", exportMonthlySearchPdf);
document.getElementById("clearActSearch").addEventListener("click", clearActSearch);

document.getElementById("documentType").addEventListener("change", () => {
  updateDocumentCaptureCards();
  updateAttachmentState();
});

document.getElementById("runActSearch").addEventListener("click", runActSearch);
document.getElementById("searchField").addEventListener("change", () => {
  state.searchActive = false;
  state.lastSearchResults = [];
  state.archivePage = 1;
  renderArchiveGroups();
});

document.getElementById("searchKeyword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runActSearch();
});

document.getElementById("searchKeyword").addEventListener("input", () => {
  state.searchActive = false;
  state.lastSearchResults = [];
  state.archivePage = 1;
});

document.getElementById("cededItemsTable").addEventListener("click", (event) => {
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
  showToast("Foto eliminata.");
});

document.querySelectorAll("[data-preview-copy]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.previewCopy === "customer") showCustomerCopyOptions();
    else showPrintPreview(button.dataset.previewCopy);
  });
});

document.getElementById("closePreview").addEventListener("click", () => {
  previewModal.hidden = true;
});

async function initializeApp() {
  registerServiceWorker();
  removeLegacySearchMenu();
  upgradeProvinceFields();
  populateAutocompleteLists();
  startMainMenuClock();
  appShell.hidden = true;
  await restoreSession();
  maybeShowInstallHint();
  window.addEventListener("focus", () => {
    if (state.authToken) syncActsFromServer();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.authToken) syncActsFromServer();
  });
}

initializeApp();
