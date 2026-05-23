const state = {
  step: 0,
  signatures: [false, false, false],
  attachments: 0,
  cededItems: 1,
  annualProgressive: 184,
  uploadedCaptures: new Set(),
  captureFiles: new Map(),
  lastSearchResults: [],
  editingPracticeNumber: null,
  authToken: localStorage.getItem("oroactive-auth-token") || "",
  currentUser: null,
  syncTimer: null,
  actsCache: new Map(),
  archivePage: 1,
  archivePageSize: 10,
  searchActive: false,
  editingActId: null,
  editingOriginalStatus: "",
  documentScan: { front: null, back: null },
  cashLimitWarningShown: false,
  bullionVaultPrices: {},
  lastActCaptureAttachments: [],
  loadedSignatureImages: [],
  saving: false,
  clientLookupTimer: null,
  fiscalCodeEditedManually: false,
  captureGroup: null,
  tutorial: {
    active: false,
    index: 0,
    steps: [],
    pendingFirstRun: false
  }
};

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
const apiBase = "/api";
const CASH_PAYMENT_LIMIT = 499.99;
const ACT_LIST_LIMIT = 50;
const ACT_CACHE_TTL = 30000;
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

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
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
      throw new Error(body.error || "Errore comunicazione server");
    }
    return response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Connessione lenta: riprova tra qualche secondo.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
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
    saved = await apiRequest(path, {
      method,
      body: JSON.stringify(act)
    });
  } catch (error) {
    throw error;
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function showLogin() {
  state.authToken = "";
  state.currentUser = null;
  state.actsCache.clear();
  demoActs.splice(0, demoActs.length);
  localStorage.removeItem("oroactive-auth-token");
  loginScreen.hidden = false;
  splashScreen.classList.add("hidden");
  mainMenuScreen.hidden = true;
  appShell.hidden = true;
  if (state.syncTimer) window.clearInterval(state.syncTimer);
  state.syncTimer = null;
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
  return user.nome || "";
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
      text: "Descrivi ogni oggetto, scegli metallo e titolo. Usa Aggiungi riga per inserire piu oggetti: da qui nasceranno pesi, quotazioni, foto preziosi e giacenza.",
      selector: "#cededItemsTable",
      action: () => openPracticeForTutorial(0)
    },
    {
      title: "Quotazioni e pesi",
      text: "Controlla la quotazione BullionVault per ogni metallo e inserisci il peso totale per titolo o materiale. Spunta la casella solo se vuoi stampare il peso sulla copia cliente.",
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
    const client = await apiRequest(`/clienti/${encodeURIComponent(code)}`, { timeoutMs: 9000 });
    applyExistingClient(client);
    showToast("Cliente già presente. Dati caricati automaticamente.");
  } catch {
    applyFiscalCodeDecodedData(decodeFiscalCodeData(code));
  }
}

function applyExistingClient(client = {}) {
  const fields = [
    ['[name="nome"]', client.name],
    ['[name="cognome"]', client.surname],
    ['[name="nascita"]', client.birthDate],
    ['[name="luogo"]', client.birthPlace],
    ['[name="provinciaNascita"]', client.birthProvince],
    ['[name="sesso"]', client.sex],
    ['[name="cittadinanza"]', client.citizenship],
    ['[name="indirizzo"]', client.address],
    ['[name="provinciaResidenza"]', client.residenceProvince],
    ['[name="telefono"]', client.phone],
    ['[name="email"]', client.email],
    ['[name="tipoDocumento"]', client.documentType],
    ['[name="numeroDocumento"]', client.documentNumber],
    ['[name="dataRilascioDocumento"]', client.documentIssueDate],
    ['[name="scadenzaDocumento"]', client.documentExpiry],
    ["#paymentMethod", client.paymentMethod],
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
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();
  renderPreciousCaptureCards();
  updateAttachmentState();
  updateCustomerSummary();
  updateSaleTotal();
  updateDocumentExpiryWarning();
  updateChecklistState();
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

function isFounder() {
  return normalizeRole(state.currentUser?.ruolo) === "founder";
}

function canReviewActs(user = state.currentUser) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function userSeesAllStores(user = state.currentUser) {
  return ["founder", "supervisore", "responsabile", "commesso"].includes(normalizeRole(user?.ruolo));
}

function managedRolesForCurrentUser() {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") return ["aiuto_commesso", "commesso", "responsabile", "supervisore"];
  if (role === "supervisore") return ["aiuto_commesso", "commesso", "responsabile"];
  if (role === "responsabile") return ["aiuto_commesso", "commesso"];
  return [];
}

function currentUserStoreCode() {
  return storeCodeFromName(state.currentUser?.negozio || "Busto Arsizio");
}

function applyRolePermissions() {
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.hidden = !isAdmin();
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
    if (archiveStore) archiveStore.disabled = false;
    if (fusionStore) fusionStore.disabled = false;
  }

  if (loggedUserName && state.currentUser) {
    loggedUserName.textContent = `${displayUsername(state.currentUser)} - ${roleLabel(state.currentUser.ruolo)}`;
  }
  const operatorStoreName = document.getElementById("operatorStoreName");
  if (operatorStoreName && state.currentUser && userSeesAllStores()) {
    operatorStoreName.textContent = "Negozio Tutti";
  }
  if (sessionUsername && state.currentUser) {
    sessionUsername.textContent = displayUsername(state.currentUser);
  }
  const qualityPanel = document.getElementById("qualityReviewPanel");
  if (qualityPanel) qualityPanel.hidden = !canReviewActs();
  configureUserFormPermissions();
}

async function startAuthenticatedApp() {
  showAuthenticatedShell();
  state.tutorial.pendingFirstRun = !localStorage.getItem(tutorialStorageKey());
  applyRolePermissions();
  renderStep();
  await setPracticeMeta();
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
  if (isAdmin()) loadUsers();
  refreshBullionVaultPrices();
  maybeShowLevelUnlockMessage();
  if (!state.syncTimer) state.syncTimer = window.setInterval(syncActsFromServer, 30000);
}

async function restoreSession() {
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
  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.getElementById("loginUsername").value.trim(),
        password: document.getElementById("loginPassword").value
      })
    });
    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("oroactive-auth-token", data.token);
    loginForm.reset();
    await startAuthenticatedApp();
  } catch (error) {
    loginMessage.textContent = error.message || "Accesso non riuscito.";
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
    localStorage.setItem("oroactive-faceid-username", displayUsername(state.currentUser));
    localStorage.setItem("oroactive-faceid-credential", credentialId);
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
  const username = document.getElementById("loginUsername").value.trim() || localStorage.getItem("oroactive-faceid-username") || "";
  const storedCredential = localStorage.getItem("oroactive-faceid-credential") || "";
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
    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("oroactive-auth-token", data.token);
    localStorage.setItem("oroactive-faceid-username", username);
    localStorage.setItem("oroactive-faceid-credential", credentialId);
    await startAuthenticatedApp();
  } catch (error) {
    loginMessage.textContent = error.message || "Accesso Face ID non riuscito.";
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
  if (id === "users" && !isAdmin()) {
    showToast("Sezione riservata a Founder o Responsabile.");
    return;
  }
  const leavingArchive = document.getElementById("archive")?.classList.contains("active-screen") && id !== "archive";
  if (leavingArchive) clearActSearch();
  screens.forEach((screen) => screen.classList.toggle("active-screen", screen.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.section === id));
  if (practiceTopbar) practiceTopbar.hidden = id !== "practice";
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
}

function closeBrandMenu() {
  brandDropdown.hidden = true;
  brandMenuButton.setAttribute("aria-expanded", "false");
}

function toggleBrandMenu() {
  const willOpen = brandDropdown.hidden;
  brandDropdown.hidden = !willOpen;
  brandMenuButton.setAttribute("aria-expanded", String(willOpen));
}

function openBrandMenu() {
  brandDropdown.hidden = false;
  brandMenuButton.setAttribute("aria-expanded", "true");
}

function showMainMenuFromSplash() {
  splashScreen.classList.add("hidden");
  mainMenuScreen.hidden = false;
  maybeStartFirstRunTutorial();
}

async function enterSectionFromMainMenu(section) {
  mainMenuScreen.hidden = true;
  if (section === "practice") await resetCurrentPractice();
  setScreen(section);
}

async function returnToMainMenu() {
  const isPracticeActive = document.getElementById("practice")?.classList.contains("active-screen");
  if (isPracticeActive && !isPracticeFormEmpty()) {
    if (!state.editingPracticeNumber && hasStartedClientSection()) {
      const choice = await askDraftExitChoice();
      if (choice === "cancel") return;
      if (choice === "save") {
        const saved = await archiveCurrentPractice("Bozza", { skipReset: true });
        if (!saved) return;
        showToast("Bozza salvata. Puoi completarla successivamente tramite Elenco.");
      }
      if (choice === "discard") await resetCurrentPractice({ preserveStoreCode: true });
    } else {
      const saved = await archiveCurrentPractice(state.editingOriginalStatus || "Archiviata", { skipReset: true });
      if (!saved) return;
      showToast("Atto di vendita in fase di compilazione archiviato. Puoi completarlo successivamente tramite Elenco.");
    }
  }
  closeBrandMenu();
  clearActSearch();
  mainMenuScreen.hidden = false;
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
  document.getElementById("saveUserButton").textContent = "Salva Utente";
  configureUserFormPermissions();
}

function configureUserFormPermissions() {
  const roleSelect = document.getElementById("userRole");
  const storeSelect = document.getElementById("userStore");
  if (!roleSelect || !storeSelect) return;
  const allowedRoles = managedRolesForCurrentUser();
  [...roleSelect.options].forEach((option) => {
    option.hidden = !allowedRoles.includes(option.value);
  });
  if (!allowedRoles.includes(roleSelect.value)) roleSelect.value = allowedRoles[0] || "commesso";
  const role = normalizeRole(roleSelect.value);
  if (["founder", "supervisore", "responsabile", "commesso"].includes(role)) {
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
    <div class="table-row head"><span>Utente</span><span>Accesso</span><span>Ruolo</span><span>Negozio</span><span>Stato</span><span>Punteggio</span><span>Azioni</span></div>
    ${users.map((user) => `
      <div class="table-row">
        <strong>${escapeHtml(user.nome)} ${escapeHtml(user.cognome)}</strong>
        <span>${escapeHtml(displayUsername(user))}</span>
        <em>${escapeHtml(roleLabel(user.ruolo))}</em>
        <span>${escapeHtml(userSeesAllStores(user) ? "Tutti" : user.negozio)}</span>
        <span class="presence ${user.online ? "online" : "offline"}">${user.online ? "Online" : "Offline"}</span>
        ${scoreBarMarkup(user)}
        <div class="row-actions">
          <select data-user-action="${escapeHtml(String(user.id))}" aria-label="Azioni utente">
            <option value="">Azioni</option>
            <option value="stats">Statistiche</option>
            <option value="edit">Modifica</option>
            <option value="delete">Elimina</option>
          </select>
        </div>
      </div>
    `).join("")}
  `;
}

async function loadUsers() {
  if (!isAdmin()) return;
  try {
    const users = await apiRequest("/utenti");
    state.users = users;
    renderUsers(users);
  } catch (error) {
    showToast(error.message || "Utenti non caricati.");
  }
}

async function saveUser(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  const id = document.getElementById("userId").value;
  const payload = {
    nome: document.getElementById("userName").value.trim(),
    cognome: document.getElementById("userSurname").value.trim(),
    username: document.getElementById("userUsername").value.trim(),
    ruolo: normalizeRole(document.getElementById("userRole").value),
    negozio: document.getElementById("userStore").value
  };
  const password = document.getElementById("userPassword").value;
  if (password) payload.password = password;

  try {
    await apiRequest(id ? `/utenti/${encodeURIComponent(id)}` : "/utenti", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    resetUserForm();
    await loadUsers();
    showToast(id ? "Utente aggiornato." : "Utente creato.");
  } catch (error) {
    showToast(error.message || "Utente non salvato.");
  }
}

function editUser(id) {
  const user = (state.users || []).find((item) => String(item.id) === String(id));
  if (!user) return;
  document.getElementById("userId").value = user.id;
  document.getElementById("userName").value = user.nome || "";
  document.getElementById("userSurname").value = user.cognome || "";
  document.getElementById("userUsername").value = user.username || "";
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
  const confirmed = window.confirm(`Vuoi eliminare definitivamente l'utente ${displayUsername(user)}?`);
  if (!confirmed) return;
  try {
    await apiRequest(`/utenti/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadUsers();
    showToast("Utente eliminato.");
  } catch (error) {
    showToast(error.message || "Utente non eliminato.");
  }
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
  return ROLE_LEVELS.find((level) => level.role === normalizeRole(user?.ruolo)) || ROLE_LEVELS[0];
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
  const percent = Math.min(100, Math.max(0, (score.points / Math.max(target.points, 1)) * 100));
  return {
    ...score,
    target,
    percent
  };
}

function scoreBarMarkup(user) {
  const score = scoreProgress(user);
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
  previewTitle.textContent = `Statistiche ${displayUsername(user)}`;
  previewBody.innerHTML = `
    <section class="stats-preview">
      <h3>${escapeHtml(displayUsername(user))}</h3>
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
  if (normalized === "completato" || normalized === "completata") return "Completato";
  if (normalized === "bozza") return "Bozza";
  if (normalized === "archiviato" || normalized === "archiviata") return "Archiviata";
  return "Archiviata";
}

function statusClass(status = "") {
  const normalized = normalizeWorkflowStatus(status).toLowerCase();
  if (normalized === "completato" || normalized === "completata") return "status-completed";
  if (normalized === "bozza") return "status-draft";
  if (normalized === "archiviato" || normalized === "archiviata") return "status-archived";
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
  return actOperatorKey(act) === userOperatorKey(state.currentUser || {});
}

function canViewActQuality(act) {
  return canReviewActs() || isCurrentUserActOwner(act);
}

function canModifyAct(act) {
  if (normalizeWorkflowStatus(act.status) === "Completato" && !canReviewActs()) return false;
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
  const actions = [`<button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>`];
  if (canModifyAct(act)) {
    actions.push(`<button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica</button>`);
  }

  if (canDeleteActDirectly(act)) {
    actions.push(`<button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>`);
    if (act.deletionRequest?.status === "pending") {
      actions.push(`<button class="warning-button" type="button" data-approve-delete-act="${escapeHtml(act.practiceNumber)}">Autorizza elimina</button>`);
    }
  } else if (canRequestActDeletion(act)) {
    if (act.deletionRequest?.status === "pending") {
      actions.push('<span class="request-pending">Richiesta inviata</span>');
    } else {
      actions.push(`<button class="warning-button" type="button" data-request-delete-act="${escapeHtml(act.practiceNumber)}">Richiedi eliminazione</button>`);
    }
  }

  return `
    <div class="row-actions">
      ${actions.join("")}
      ${deletionRequestLabel(act) ? `<small>${escapeHtml(deletionRequestLabel(act))}</small>` : ""}
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
  const weight = acts.reduce((sum, act) => sum + actWeightAmount(act), 0);
  const spent = acts.reduce((sum, act) => sum + actSpentAmount(act), 0);
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
        <div class="print-field"><span>Operatore</span>${escapeHtml(act.operatorUsername || act.operatorName || missing)}</div>
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
    bullionQuotes: bullionQuoteRows(),
    materialAmounts: materialAmountRows(),
    printWeightCustomer: shouldPrintWeightOnCustomerCopy(),
    amount: fieldValue("#saleTotal"),
    paymentMethod: fieldValue("#paymentMethod"),
    iban: fieldValue("#paymentIban"),
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
    status: normalizeWorkflowStatus(status)
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
  return document.getElementById("archiveStoreFilter")?.value || "Busto Arsizio";
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
    const storeMatches = act.store === selectedStore;
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
    const { day, monthName } = dateParts(act.date);
    groups[monthName] ||= {};
    groups[monthName][day] ||= [];
    groups[monthName][day].push(act);
    return groups;
  }, {});

  container.innerHTML = Object.entries(grouped).map(([month, days]) => `
    <section class="archive-month">
      <h3>${escapeHtml(month)}</h3>
      ${archiveTotalsMarkup(archiveTotals(Object.values(days).flat()), "Mensile")}
      ${Object.entries(days).map(([day, dayActs]) => `
        <div class="archive-day">
          <h4>Giorno ${escapeHtml(day)}</h4>
          ${archiveTotalsMarkup(archiveTotals(dayActs), "Giornaliero")}
          <div class="archive-table acts-table">
            <div class="table-row head"><span>Pratica</span><span>Cliente</span><span>Operatore</span><span>Data</span><span>Stato</span><span>Controllo</span><span>Azioni</span></div>
            ${dayActs.map((act) => `
              <div class="table-row ${canViewActQuality(act) ? `${qualityReviewClass(act.qualityReview)}-row` : ""}">
                <span>${escapeHtml(act.practiceNumber)}</span>
                <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                <span>${escapeHtml(act.operatorUsername || act.operatorName || "Dato non inserito")}</span>
                <span>${escapeHtml(act.date)}</span>
                <em class="${statusClass(act.status)}">${escapeHtml(normalizeWorkflowStatus(act.status))}</em>
                ${qualityReviewCellMarkup(act)}
                ${archiveRowActionsMarkup(act)}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </section>
  `).join("") + archivePaginationMarkup(acts.length, totalPages);
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
  const signatures = ["Firma vendita", "Firma dichiarazioni", "Firma privacy"].map((label) => `
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
      ${canModifyAct(act) ? `<button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica atto</button>` : ""}
      ${canDeleteActDirectly(act) ? `<button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>` : ""}
      ${canRequestActDeletion(act) ? `<button class="warning-button" type="button" data-request-delete-act="${escapeHtml(act.practiceNumber)}">Richiedi eliminazione</button>` : ""}
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
      requestedBy: displayUsername(state.currentUser),
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

  const confirmed = window.confirm(`Vuoi eliminare definitivamente l'atto ${practiceNumber}?`);
  if (!confirmed) return;

  try {
    await deleteActRecord(practiceNumber);
  } catch {
    showToast("Eliminazione non riuscita: controlla la connessione al database.");
    return;
  }
  state.lastSearchResults = state.lastSearchResults.filter((act) => act.practiceNumber !== practiceNumber);
  renderArchiveGroups();
  renderFusionGroups();

  if (!previewModal.hidden) previewModal.hidden = true;
  showToast(`Atto ${practiceNumber} eliminato.`);
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
  updatedAct.status = normalizeWorkflowStatus(existing.status || updatedAct.status);
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
  } catch {
    showToast("Controllo qualità non salvato: controlla la connessione al database.");
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
  return extractProvinceCode(value) || String(value || "").trim().toUpperCase().slice(0, 2);
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

function openDocumentScanModal() {
  stopDocumentCamera();
  state.documentScan = {
    front: null,
    back: null,
    side: "front",
    preview: null,
    review: false,
    detected: {},
    ocrRead: false,
    stream: null,
    cameraActive: false,
    ready: false,
    status: "Centra il documento nel rettangolo"
  };
  previewTitle.textContent = "Scansione documento d'identità";
  renderDocumentScanModal();
  previewModal.hidden = false;
  startDocumentCamera();
}

function currentDocumentScanLabel() {
  return state.documentScan?.side === "back" ? "retro" : "fronte";
}

function renderDocumentScanModal() {
  previewBody.innerHTML = documentScanModalMarkup();
  attachDocumentStream();
}

function documentScanModalMarkup() {
  if (state.documentScan?.review) return documentScanReviewMarkup();
  const sideLabel = currentDocumentScanLabel();
  const preview = state.documentScan?.preview;
  const ready = Boolean(state.documentScan?.ready);
  const frontDone = Boolean(state.documentScan?.front);
  const backDone = Boolean(state.documentScan?.back);
  return `
    <section class="document-scan-flow">
      <div class="scan-step-header">
        <div>
          <p class="eyebrow">Step ${sideLabel === "fronte" ? "1" : "2"}</p>
          <h3>Scatta ${sideLabel} documento</h3>
        </div>
        <span class="scan-progress">${frontDone ? "Fronte acquisito" : "Fronte da acquisire"} · ${backDone ? "Retro acquisito" : "Retro da acquisire"}</span>
      </div>

      ${preview ? documentScanPreviewMarkup(preview, sideLabel) : documentScanCameraMarkup(ready, sideLabel)}

      <div class="document-scan-actions">
        <button class="ghost-button" type="button" id="cancelDocumentScan">Annulla</button>
      </div>
    </section>
  `;
}

function documentScanReviewMarkup() {
  const front = state.documentScan?.front;
  const back = state.documentScan?.back;
  const detected = state.documentScan?.detected || {};
  const ocrRead = Boolean(state.documentScan?.ocrRead);
  const analyzed = Boolean(state.documentScan?.analyzed);
  return `
    <section class="document-scan-flow">
      <div class="scan-step-header">
        <div>
          <p class="eyebrow">Controllo dati</p>
          <h3>Documento fronte e retro acquisito</h3>
        </div>
        <span class="scan-progress">${ocrRead ? "Dati rilevati" : "Lettura da controllare"}</span>
      </div>
      <div class="document-scan-review-grid">
        <article class="document-scan-review-card">
          <span>Anteprima fronte</span>
          ${front ? `<img src="${front.dataUrl}" alt="Anteprima fronte documento">` : "<strong>Fronte non acquisito</strong>"}
        </article>
        <article class="document-scan-review-card">
          <span>Anteprima retro</span>
          ${back ? `<img src="${back.dataUrl}" alt="Anteprima retro documento">` : "<strong>Retro non acquisito</strong>"}
        </article>
      </div>
      <div class="document-scan-data-panel">
        <h4>Dati estratti automaticamente</h4>
        ${analyzed ? `
          <div class="document-scan-data-grid">
            ${documentScanDataRowsMarkup(detected)}
          </div>
          <p>${ocrRead ? "Controlla i dati estratti e correggi eventuali errori." : "Documento non letto correttamente. Riprova la scansione o compila manualmente."}</p>
        ` : "<p>Foto fronte e retro acquisite. Premi Analizza con AI per leggere il documento e compilare la sezione Cliente.</p>"}
      </div>
      <div class="document-scan-actions">
        <button class="ghost-button" type="button" id="cancelDocumentScan">Annulla</button>
        <button class="warning-button" type="button" data-retake-document-side="front">Rifai fronte</button>
        <button class="warning-button" type="button" data-retake-document-side="back">Rifai retro</button>
        <button class="primary-button" type="button" id="analyzeDocumentWithAi">Analizza con AI</button>
        ${analyzed ? '<button class="ghost-button" type="button" id="confirmDocumentScan">Chiudi</button>' : ""}
      </div>
    </section>
  `;
}

function documentScanDataRowsMarkup(data = {}) {
  const rows = [
    ["name", "Nome", data.name],
    ["surname", "Cognome", data.surname],
    ["fiscalCode", "Codice fiscale", data.fiscalCode],
    ["birthDate", "Data di nascita", data.birthDate],
    ["birthPlace", "Luogo di nascita", data.birthPlace],
    ["birthProvince", "Provincia nascita", data.birthProvince],
    ["address", "Indirizzo residenza", data.address],
    ["residenceProvince", "Provincia residenza", data.residenceProvince],
    ["documentType", "Tipo documento", data.documentType],
    ["documentNumber", "Numero documento", data.documentNumber],
    ["documentIssueDate", "Data rilascio/emissione", data.documentIssueDate],
    ["documentExpiry", "Data scadenza", data.documentExpiry],
    ["citizenship", "Cittadinanza", data.citizenship],
    ["sex", "Sesso", data.sex]
  ];
  return rows.map(([field, label, value]) => {
    const confidence = detectedConfidence(data, field);
    const low = value && confidence === "basso";
    return `
    <div class="${low ? "confidence-low" : confidence ? `confidence-${confidence}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Dato non letto")}</strong>
      ${low ? "<em>Controlla questo dato</em>" : confidence ? `<em>Affidabilità ${escapeHtml(confidence)}</em>` : ""}
    </div>
  `;
  }).join("");
}

function documentScanCameraMarkup(ready, sideLabel) {
  return `
    <div class="document-camera-shell ready simple-scan">
      <video id="documentScanVideo" playsinline muted autoplay></video>
      <canvas id="documentScanAnalysisCanvas" hidden></canvas>
      <div class="scan-status ready" id="documentScanStatus">
        Inquadra il documento e scatta ${escapeHtml(sideLabel)}
      </div>
      <div class="scan-fallback-panel" id="documentScanFallback">
        <strong>Fotocamera diretta non disponibile</strong>
        <span>Usa il caricamento foto: su iPad/iPhone si aprirà comunque la fotocamera.</span>
      </div>
    </div>
    <div class="document-scan-controls">
      <button class="primary-button" type="button" id="captureDocumentPhoto">Scatta foto</button>
      <label class="ghost-button scan-file-fallback">
        Carica ${escapeHtml(sideLabel)}
        <input type="file" accept="image/*" capture="environment" data-document-scan-input="${state.documentScan?.side || "front"}">
      </label>
    </div>
  `;
}

function identityCardGuideMarkup(side) {
  if (side === "back") {
    return `
      <div class="identity-card-wireframe cie-back">
        <span class="wire-line wire-parent">Genitori / Tutore</span>
        <span class="wire-line wire-fiscal-back">Codice fiscale</span>
        <span class="wire-line wire-birth-act">Estremi atto nascita</span>
        <span class="wire-line wire-address">Indirizzo residenza</span>
        <span class="wire-barcode">Barcode</span>
        <span class="wire-mrz wire-mrz-1"></span>
        <span class="wire-mrz wire-mrz-2"></span>
        <span class="wire-mrz wire-mrz-3"></span>
      </div>
    `;
  }
  return `
    <div class="identity-card-wireframe cie-front">
      <span class="wire-photo">Foto</span>
      <span class="wire-line wire-surname">Cognome</span>
      <span class="wire-line wire-name">Nome</span>
      <span class="wire-line wire-birth">Luogo e data nascita</span>
      <span class="wire-line wire-sex">Sesso</span>
      <span class="wire-line wire-height">Statura</span>
      <span class="wire-line wire-citizenship">Cittadinanza</span>
      <span class="wire-line wire-issue">Emissione</span>
      <span class="wire-line wire-expiry">Scadenza</span>
      <span class="wire-line wire-number">Numero documento</span>
      <span class="wire-signature">Firma</span>
    </div>
  `;
}

function documentScanPreviewMarkup(preview, sideLabel) {
  return `
    <div class="document-scan-preview">
      <img src="${preview.dataUrl}" alt="Anteprima ${escapeHtml(sideLabel)} documento">
      <div class="document-scan-preview-actions">
        <button class="primary-button" type="button" id="useDocumentScanPhoto">Usa foto</button>
        <button class="ghost-button" type="button" id="retakeDocumentScanPhoto">Rifai foto</button>
      </div>
    </div>
  `;
}

function attachDocumentStream() {
  const video = document.getElementById("documentScanVideo");
  if (!video || !state.documentScan?.stream) return;
  video.srcObject = state.documentScan.stream;
  video.play().catch(() => {});
  const fallback = document.getElementById("documentScanFallback");
  if (fallback) fallback.hidden = true;
}

async function startDocumentCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showDocumentCameraFallback();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1600 },
        height: { ideal: 1000 }
      },
      audio: false
    });
    state.documentScan.stream = stream;
    state.documentScan.cameraActive = true;
    attachDocumentStream();
    updateDocumentScanStatus(true, "Inquadra il documento e scatta foto");
  } catch {
    showDocumentCameraFallback();
  }
}

function showDocumentCameraFallback() {
  const fallback = document.getElementById("documentScanFallback");
  if (fallback) fallback.hidden = false;
  updateDocumentScanStatus(false, "Centra il documento nel rettangolo e usa Carica foto");
}

function stopDocumentCamera() {
  if (state.documentScan?.analysisTimer) window.clearInterval(state.documentScan.analysisTimer);
  state.documentScan?.stream?.getTracks?.().forEach((track) => track.stop());
  if (state.documentScan) {
    state.documentScan.analysisTimer = null;
    state.documentScan.stream = null;
    state.documentScan.cameraActive = false;
  }
}

function startDocumentScanAnalysis() {
  if (state.documentScan?.analysisTimer) window.clearInterval(state.documentScan.analysisTimer);
  state.documentScan.analysisTimer = window.setInterval(analyzeDocumentFrame, 550);
}

function updateDocumentScanStatus(ready, message) {
  if (!state.documentScan) return;
  state.documentScan.ready = ready;
  state.documentScan.status = message;
  const shell = document.querySelector(".document-camera-shell");
  const guide = document.querySelector(".scan-guide-frame");
  const status = document.getElementById("documentScanStatus");
  const button = document.getElementById("captureDocumentPhoto");
  [shell, guide, status].forEach((element) => {
    element?.classList.toggle("ready", ready);
    element?.classList.toggle("warn", !ready);
  });
  if (status) status.textContent = message;
  if (button) {
    button.classList.toggle("primary-button", ready);
    button.classList.toggle("warning-button", !ready);
    button.disabled = !ready;
  }
}

function analyzeDocumentFrame() {
  const video = document.getElementById("documentScanVideo");
  const canvas = document.getElementById("documentScanAnalysisCanvas");
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

  const width = 160;
  const height = Math.max(1, Math.round(width * (video.videoHeight / video.videoWidth)));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);

  const guideWidth = Math.round(width * 0.78);
  const guideHeight = Math.round(guideWidth / 1.586);
  const x = Math.round((width - guideWidth) / 2);
  const y = Math.round((height - guideHeight) / 2);
  const data = ctx.getImageData(x, y, guideWidth, guideHeight).data;
  let brightness = 0;
  let contrast = 0;
  let previous = 0;
  let edges = 0;
  const pixels = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    const gray = (data[index] + data[index + 1] + data[index + 2]) / 3;
    brightness += gray;
    contrast += Math.abs(gray - previous);
    if (Math.abs(gray - previous) > 22) edges += 1;
    previous = gray;
  }

  brightness /= pixels;
  contrast /= pixels;
  const edgeRatio = edges / pixels;
  const goodLight = brightness > 45 && brightness < 230;
  const enoughDetail = contrast > 7 && edgeRatio > 0.08;
  const ready = goodLight && enoughDetail;
  updateDocumentScanStatus(
    ready,
    ready ? "Documento centrato correttamente" : "Centra il documento nel rettangolo"
  );
}

function dataUrlFromVideo(video) {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 800;
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function captureDocumentPhoto() {
  const video = document.getElementById("documentScanVideo");
  if (!video || !video.videoWidth) {
    showToast("Fotocamera non disponibile: usa Carica foto.");
    return;
  }
  const side = state.documentScan?.side || "front";
  state.documentScan.preview = {
    name: side === "front" ? "Documento fronte" : "Documento retro",
    type: "image/jpeg",
    dataUrl: dataUrlFromVideo(video)
  };
  renderDocumentScanModal();
}

async function useDocumentScanPhoto() {
  const side = state.documentScan?.side || "front";
  if (!state.documentScan?.preview) return;
  state.documentScan[side] = state.documentScan.preview;
  state.documentScan.preview = null;
  if (side === "front") {
    state.documentScan.side = "back";
  } else {
    stopDocumentCamera();
    state.documentScan.review = true;
    state.documentScan.analyzed = false;
    state.documentScan.detected = {};
    state.documentScan.ocrRead = false;
    renderDocumentScanModal();
    return;
  }
  renderDocumentScanModal();
}

function retakeDocumentScanPhoto() {
  if (!state.documentScan) return;
  state.documentScan.preview = null;
  renderDocumentScanModal();
}

function retakeDocumentScanSide(side) {
  if (!state.documentScan) return;
  stopDocumentCamera();
  state.documentScan.side = side === "back" ? "back" : "front";
  state.documentScan.preview = null;
  state.documentScan.review = false;
  state.documentScan.analyzed = false;
  state.documentScan.detected = {};
  state.documentScan.ocrRead = false;
  state.documentScan.ready = false;
  renderDocumentScanModal();
  startDocumentCamera();
}

const CIE_OCR_ZONES = {
  front: {
    surname: { x: 0.32, y: 0.05, w: 0.62, h: 0.12 },
    name: { x: 0.32, y: 0.16, w: 0.62, h: 0.12 },
    birth: { x: 0.32, y: 0.27, w: 0.62, h: 0.12 },
    sex: { x: 0.32, y: 0.39, w: 0.2, h: 0.1 },
    citizenship: { x: 0.32, y: 0.49, w: 0.62, h: 0.11 },
    issue: { x: 0.32, y: 0.59, w: 0.3, h: 0.12 },
    expiry: { x: 0.58, y: 0.59, w: 0.32, h: 0.12 },
    documentNumber: { x: 0.32, y: 0.71, w: 0.62, h: 0.12 }
  },
  back: {
    fiscalCode: { x: 0.04, y: 0.19, w: 0.62, h: 0.13 },
    address: { x: 0.04, y: 0.47, w: 0.62, h: 0.16 },
    mrz: { x: 0.04, y: 0.72, w: 0.92, h: 0.24 },
    barcode: { x: 0.72, y: 0.12, w: 0.22, h: 0.48 }
  }
};

function detectedDocumentHasValues(data = {}) {
  return Object.entries(data).some(([key, value]) => key !== "_confidence" && String(value || "").trim());
}

function missingDetectedDocumentFields(data = {}) {
  return ["name", "surname", "fiscalCode", "birthDate", "birthPlace", "address", "documentNumber", "documentIssueDate", "documentExpiry", "citizenship"]
    .filter((field) => !String(data[field] || "").trim());
}

function hasLowConfidenceFields(data = {}) {
  return Object.values(data._confidence || {}).some((confidence) => confidence === "basso");
}

async function analyzeDocumentScanWithAi() {
  const { front, back } = state.documentScan || {};
  if (!front || !back) return;
  stopDocumentCamera();
  let detected = {};
  try {
    showLoading("Analisi documento in corso...");
    detected = await runAiDocumentRecognition(front, back);
    if (!detectedDocumentHasValues(detected)) detected = await runDocumentOcr(front, back);
  } catch {
    try {
      detected = await runDocumentOcr(front, back);
    } catch {
      detected = {};
    }
  } finally {
    hideLoading();
  }
  state.documentScan.detected = detected;
  state.documentScan.ocrRead = detectedDocumentHasValues(detected);
  state.documentScan.review = true;
  state.documentScan.analyzed = true;
  renderDocumentScanModal();
  if (!state.documentScan.ocrRead) {
    showToast("Documento non letto correttamente. Riprova la scansione o compila manualmente.");
    return;
  }
  applyDetectedDocumentData(detected);
  if (missingDetectedDocumentFields(detected).length || hasLowConfidenceFields(detected)) {
    showToast("Controlla i dati estratti e correggi eventuali errori.");
    return;
  }
  showToast("Controlla i dati estratti e correggi eventuali errori.");
}

async function runAiDocumentRecognition(front, back) {
  if (!front?.dataUrl || !back?.dataUrl) return {};
  const data = await apiRequest("/ai/leggi-documento", {
    method: "POST",
    timeoutMs: 70000,
    body: JSON.stringify({
      immagine_fronte: front.dataUrl,
      immagine_retro: back.dataUrl
    })
  });
  const fields = data.fields || {};
  return {
    name: fields.name || data.nome || "",
    surname: fields.surname || data.cognome || "",
    fiscalCode: fields.fiscalCode || data.codice_fiscale || "",
    birthDate: toDateInputValue(fields.birthDate || data.data_nascita || ""),
    birthPlace: fields.birthPlace || data.luogo_nascita || "",
    birthProvince: fields.birthProvince || data.provincia_nascita || "",
    sex: fields.sex || data.sesso || "",
    citizenship: fields.citizenship || data.cittadinanza || "",
    address: fields.address || data.indirizzo_residenza || "",
    residenceProvince: fields.residenceProvince || data.provincia_residenza || "",
    documentNumber: fields.documentNumber || data.numero_documento || "",
    documentIssueDate: toDateInputValue(fields.documentIssueDate || data.data_rilascio || data.data_emissione || ""),
    documentExpiry: toDateInputValue(fields.documentExpiry || data.data_scadenza || ""),
    documentType: normalizeDocumentTypeValue(fields.documentType || data.tipo_documento || ""),
    _confidence: {
      name: fields._confidence?.name || data.confidence?.nome || "",
      surname: fields._confidence?.surname || data.confidence?.cognome || "",
      fiscalCode: fields._confidence?.fiscalCode || data.confidence?.codice_fiscale || "",
      birthDate: fields._confidence?.birthDate || data.confidence?.data_nascita || "",
      birthPlace: fields._confidence?.birthPlace || data.confidence?.luogo_nascita || "",
      address: fields._confidence?.address || data.confidence?.indirizzo_residenza || "",
      documentNumber: fields._confidence?.documentNumber || data.confidence?.numero_documento || "",
      documentExpiry: fields._confidence?.documentExpiry || data.confidence?.data_scadenza || ""
    }
  };
}

function restartDocumentScan() {
  stopDocumentCamera();
  state.documentScan = {
    front: null,
    back: null,
    side: "front",
    preview: null,
    review: false,
    detected: {},
    ocrRead: false,
    stream: null,
    cameraActive: false,
    ready: false,
    status: "Centra il documento nel rettangolo"
  };
  renderDocumentScanModal();
  startDocumentCamera();
}

function setCaptureFile(key, file) {
  const previous = state.captureFiles.get(key);
  revokeCaptureUrl(previous);
  state.captureFiles.set(key, file);
  state.uploadedCaptures.add(key);
  state.attachments = state.uploadedCaptures.size;
}

function confidenceRank(confidence = "basso") {
  return { alto: 3, medio: 2, basso: 1 }[confidence] || 1;
}

function detectedConfidence(data = {}, field) {
  return data._confidence?.[field] || (data[field] ? "basso" : "");
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

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function enhancedImageDataUrl(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = options.contrast || 1.35;
  const threshold = options.threshold || 0;
  for (let index = 0; index < data.length; index += 4) {
    const gray = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
    let value = (gray - 128) * contrast + 128;
    value = Math.max(0, Math.min(255, value));
    if (threshold) value = value > threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.86);
}

async function preprocessDocumentImage(dataUrl) {
  const image = await imageFromDataUrl(dataUrl);
  let cropWidth = image.width * 0.82;
  let cropHeight = cropWidth / 1.586;
  if (cropHeight > image.height * 0.86) {
    cropHeight = image.height * 0.86;
    cropWidth = cropHeight * 1.586;
  }
  const sourceX = Math.max(0, (image.width - cropWidth) / 2);
  const sourceY = Math.max(0, (image.height - cropHeight) / 2);
  const outputWidth = 1300;
  const outputHeight = Math.round(outputWidth / 1.586);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
  const enhanced = await imageFromDataUrl(enhancedImageDataUrl(canvas, { contrast: 1.45 }));
  ctx.filter = "contrast(1.08) saturate(0.35)";
  ctx.drawImage(enhanced, 0, 0, outputWidth, outputHeight);
  ctx.filter = "none";
  return {
    full: canvas.toDataURL("image/jpeg", 0.86),
    canvas
  };
}

function cropZoneFromCanvas(canvas, zone, options = {}) {
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(canvas.width * zone.w));
  output.height = Math.max(1, Math.round(canvas.height * zone.h));
  const ctx = output.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    canvas,
    Math.round(canvas.width * zone.x),
    Math.round(canvas.height * zone.y),
    Math.round(canvas.width * zone.w),
    Math.round(canvas.height * zone.h),
    0,
    0,
    output.width,
    output.height
  );
  return enhancedImageDataUrl(output, {
    contrast: options.contrast || 1.65,
    threshold: options.threshold || 0
  });
}

function normalizeOcrDate(value = "") {
  const text = String(value).trim();
  const dateMatch = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!dateMatch) return "";
  const [, day, month, year] = dateMatch;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeMrzDate(value = "") {
  const text = String(value || "").replace(/\D/g, "");
  if (text.length !== 6) return "";
  const year = Number(text.slice(0, 2));
  const currentYear = new Date().getFullYear() % 100;
  const century = year > currentYear ? 1900 : 2000;
  return `${century + year}-${text.slice(2, 4)}-${text.slice(4, 6)}`;
}

function valueAfterLabel(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n]+)`, "i");
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim().replace(/\s{2,}/g, " ");
  }
  return "";
}

function cleanOcrValue(value = "") {
  return String(value || "").trim().replace(/[|;]/g, "").replace(/\s{2,}/g, " ");
}

const ITALIAN_PROVINCES = new Set("AG AL AN AO AR AP AT AV BA BT BL BN BG BI BO BZ BS BR CA CL CB CI CE CT CZ CH CO CS CR KR CN EN FM FE FI FG FC FR GE GO GR IM IS SP AQ LT LE LC LI LO LU MC MN MS MT ME MI MO MB NA NO NU OR PD PA PR PV PG PU PE PC PI PT PN PZ PO RG RA RC RE RI RN RM RO SA SS SV SI SR SO SU TA TE TR TO TP TN TV TS UD VA VE VB VC VR VV VI VT".split(" "));

function extractProvinceCode(value = "") {
  const upper = String(value || "").toUpperCase();
  const explicit = upper.match(/\(([A-Z]{2})\)/);
  if (explicit && ITALIAN_PROVINCES.has(explicit[1])) return explicit[1];
  const tokens = upper.match(/\b[A-Z]{2}\b/g) || [];
  return tokens.find((token) => ITALIAN_PROVINCES.has(token)) || "";
}

function stripProvinceCode(value = "") {
  const province = extractProvinceCode(value);
  if (!province) return cleanOcrValue(value);
  return cleanOcrValue(String(value)
    .replace(new RegExp(`\\(${province}\\)`, "i"), "")
    .replace(new RegExp(`\\b${province}\\b\\.?$`, "i"), ""));
}

function parseBirthPlaceAndDate(value = "") {
  const cleaned = cleanOcrValue(value);
  const date = normalizeOcrDate(cleaned);
  const province = extractProvinceCode(cleaned);
  let place = cleaned.replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/, "");
  if (province) {
    place = place
      .replace(new RegExp(`\\(${province}\\)`, "i"), "")
      .replace(new RegExp(`\\b${province}\\b\\.?$`, "i"), "");
  }
  place = place.replace(/\s{2,}/g, " ").trim();
  return { place, date, province };
}

function extractMrzLines(text = "") {
  const candidates = String(text || "")
    .toUpperCase()
    .replace(/[«‹]/g, "<")
    .split(/\n+/)
    .map((line) => line.replace(/[^A-Z0-9<]/g, ""))
    .filter((line) => line.includes("<") && line.length >= 20);
  return candidates.slice(-3);
}

function parseMrzText(text = "") {
  const lines = extractMrzLines(text);
  if (lines.length < 2) return {};
  const [line1 = "", line2 = "", line3 = ""] = lines;
  const names = line3.split("<<");
  const surname = names[0]?.replace(/</g, " ").trim() || "";
  const name = names.slice(1).join(" ").replace(/</g, " ").trim();
  return {
    documentNumber: line1.slice(5, 14).replace(/</g, "").trim(),
    birthDate: normalizeMrzDate(line2.slice(0, 6)),
    sex: ["M", "F"].includes(line2.charAt(7)) ? line2.charAt(7) : "",
    documentExpiry: normalizeMrzDate(line2.slice(8, 14)),
    citizenship: line2.slice(15, 18).replace(/</g, "").trim(),
    surname,
    name
  };
}

function parseCieSideText(text = "") {
  const normalized = String(text || "").replace(/\r/g, "\n");
  const fiscalCode = (normalized.match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i)?.[0] || "").toUpperCase();
  const birth = parseBirthPlaceAndDate(valueAfterLabel(normalized, ["luogo e data di nascita", "place and date of birth", "data di nascita", "nato il", "nata il"]));
  const address = cleanOcrValue(valueAfterLabel(normalized, ["indirizzo di residenza", "residenza", "indirizzo", "address"]));
  return {
    name: cleanOcrValue(valueAfterLabel(normalized, ["nome", "name"])),
    surname: cleanOcrValue(valueAfterLabel(normalized, ["cognome", "surname"])),
    fiscalCode,
    birthDate: birth.date || normalizeOcrDate(valueAfterLabel(normalized, ["data nascita", "data di nascita", "date of birth"])),
    birthPlace: birth.place || cleanOcrValue(valueAfterLabel(normalized, ["luogo di nascita", "nato a", "nata a"])),
    birthProvince: birth.province,
    address: stripProvinceCode(address),
    residenceProvince: extractProvinceCode(address),
    documentNumber: cleanOcrValue(valueAfterLabel(normalized, ["numero documento", "documento n", "document no", "n documento", "n\\."])),
    documentIssueDate: normalizeOcrDate(valueAfterLabel(normalized, ["data emissione", "emissione", "data rilascio", "rilasciata il", "rilasciato il"])),
    documentExpiry: normalizeOcrDate(valueAfterLabel(normalized, ["data scadenza", "scadenza", "expiry", "valida fino al"])),
    citizenship: cleanOcrValue(valueAfterLabel(normalized, ["cittadinanza", "nationality"])),
    sex: cleanOcrValue(valueAfterLabel(normalized, ["sesso", "sex"])).charAt(0).toUpperCase()
  };
}

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function ocrConfidence(score = 0, value = "") {
  if (!String(value || "").trim()) return "";
  if (score >= 78) return "alto";
  if (score >= 52) return "medio";
  return "basso";
}

function setCandidate(candidates, field, value, confidence, source = "") {
  const cleanValue = cleanOcrValue(value);
  if (!cleanValue) return;
  candidates[field] ||= [];
  candidates[field].push({ value: cleanValue, confidence: confidence || "basso", source });
}

function selectCandidate(candidates = [], validator = null) {
  const valid = candidates.filter((candidate) => candidate?.value && (!validator || validator(candidate.value)));
  if (!valid.length) return { value: "", confidence: "" };
  valid.sort((first, second) => confidenceRank(second.confidence) - confidenceRank(first.confidence));
  return valid[0];
}

function isFiscalCode(value = "") {
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(String(value).trim());
}

function isDocumentNumber(value = "") {
  return /^[A-Z]{1,3}\d{4,7}[A-Z]{0,2}$/i.test(String(value).replace(/\s/g, ""));
}

function isIsoDate(value = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function zonePrimaryText(text = "") {
  return String(text || "")
    .split(/\n+/)
    .map((line) => cleanOcrValue(line.replace(/^(cognome|surname|nome|name|sesso|sex|cittadinanza|nationality|scadenza|expiry|emissione|numero documento|document no)\b[:\s-]*/i, "")))
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)[0] || "";
}

function parseCieDocumentData(frontText = "", backText = "", zoneTexts = {}) {
  const front = parseCieSideText(frontText);
  const back = parseCieSideText(backText);
  const mrz = parseMrzText(`${backText}\n${zoneTexts.back?.mrz?.text || ""}`) || {};
  const candidates = {};

  Object.entries(front).forEach(([field, value]) => setCandidate(candidates, field, value, "medio", "front-full"));
  Object.entries(back).forEach(([field, value]) => setCandidate(candidates, field, value, "medio", "back-full"));
  Object.entries(mrz).forEach(([field, value]) => setCandidate(candidates, field, value, "alto", "mrz"));

  setCandidate(candidates, "surname", zonePrimaryText(zoneTexts.front?.surname?.text), ocrConfidence(zoneTexts.front?.surname?.confidence, zoneTexts.front?.surname?.text), "front-zone");
  setCandidate(candidates, "name", zonePrimaryText(zoneTexts.front?.name?.text), ocrConfidence(zoneTexts.front?.name?.confidence, zoneTexts.front?.name?.text), "front-zone");
  const birth = parseBirthPlaceAndDate(zonePrimaryText(zoneTexts.front?.birth?.text));
  setCandidate(candidates, "birthPlace", birth.place, ocrConfidence(zoneTexts.front?.birth?.confidence, birth.place), "front-zone");
  setCandidate(candidates, "birthDate", birth.date, ocrConfidence(zoneTexts.front?.birth?.confidence, birth.date), "front-zone");
  setCandidate(candidates, "birthProvince", birth.province, ocrConfidence(zoneTexts.front?.birth?.confidence, birth.province), "front-zone");
  setCandidate(candidates, "sex", zonePrimaryText(zoneTexts.front?.sex?.text).charAt(0).toUpperCase(), ocrConfidence(zoneTexts.front?.sex?.confidence, zoneTexts.front?.sex?.text), "front-zone");
  setCandidate(candidates, "citizenship", zonePrimaryText(zoneTexts.front?.citizenship?.text), ocrConfidence(zoneTexts.front?.citizenship?.confidence, zoneTexts.front?.citizenship?.text), "front-zone");
  setCandidate(candidates, "documentIssueDate", normalizeOcrDate(zonePrimaryText(zoneTexts.front?.issue?.text)), ocrConfidence(zoneTexts.front?.issue?.confidence, zoneTexts.front?.issue?.text), "front-zone");
  setCandidate(candidates, "documentExpiry", normalizeOcrDate(zonePrimaryText(zoneTexts.front?.expiry?.text)), ocrConfidence(zoneTexts.front?.expiry?.confidence, zoneTexts.front?.expiry?.text), "front-zone");
  setCandidate(candidates, "documentNumber", zonePrimaryText(zoneTexts.front?.documentNumber?.text).replace(/\s/g, ""), ocrConfidence(zoneTexts.front?.documentNumber?.confidence, zoneTexts.front?.documentNumber?.text), "front-zone");

  const fiscalZone = (zoneTexts.back?.fiscalCode?.text || "").match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i)?.[0] || "";
  const addressZone = zonePrimaryText(zoneTexts.back?.address?.text);
  setCandidate(candidates, "fiscalCode", fiscalZone.toUpperCase(), ocrConfidence(zoneTexts.back?.fiscalCode?.confidence, fiscalZone), "back-zone");
  setCandidate(candidates, "address", stripProvinceCode(addressZone), ocrConfidence(zoneTexts.back?.address?.confidence, addressZone), "back-zone");
  setCandidate(candidates, "residenceProvince", extractProvinceCode(addressZone), ocrConfidence(zoneTexts.back?.address?.confidence, addressZone), "back-zone");

  const validators = {
    fiscalCode: isFiscalCode,
    birthDate: isIsoDate,
    documentIssueDate: isIsoDate,
    documentExpiry: isIsoDate,
    documentNumber: isDocumentNumber,
    birthProvince: (value) => ITALIAN_PROVINCES.has(String(value).toUpperCase()),
    residenceProvince: (value) => ITALIAN_PROVINCES.has(String(value).toUpperCase()),
    sex: (value) => ["M", "F"].includes(String(value).toUpperCase())
  };
  const fields = ["name", "surname", "fiscalCode", "birthDate", "birthPlace", "birthProvince", "address", "residenceProvince", "documentNumber", "documentIssueDate", "documentExpiry", "citizenship", "sex"];
  const output = { _confidence: {} };
  fields.forEach((field) => {
    const selected = selectCandidate(candidates[field], validators[field]);
    output[field] = selected.value || "";
    if (selected.value) output._confidence[field] = selected.confidence || "basso";
  });
  return output;
}

async function runDocumentOcr(front, back) {
  const available = await loadOcrEngine();
  if (!available || !window.Tesseract?.recognize) return {};
  const frontPrepared = await preprocessDocumentImage(front.dataUrl);
  const backPrepared = await preprocessDocumentImage(back.dataUrl);
  const [frontResult, backResult, frontZones, backZones] = await Promise.all([
    window.Tesseract.recognize(frontPrepared.full, "ita+eng"),
    window.Tesseract.recognize(backPrepared.full, "ita+eng"),
    recognizeCieZones(frontPrepared.canvas, "front"),
    recognizeCieZones(backPrepared.canvas, "back")
  ]);
  return parseCieDocumentData(
    frontResult?.data?.text || "",
    backResult?.data?.text || "",
    { front: frontZones, back: backZones }
  );
}

async function recognizeCieZones(canvas, side) {
  const zones = CIE_OCR_ZONES[side] || {};
  const entries = await Promise.all(Object.entries(zones).map(async ([name, zone]) => {
    const dataUrl = cropZoneFromCanvas(canvas, zone, {
      contrast: name === "mrz" ? 1.9 : 1.65,
      threshold: name === "mrz" ? 138 : 0
    });
    try {
      const result = await window.Tesseract.recognize(dataUrl, "ita+eng");
      return [name, {
        text: result?.data?.text || "",
        confidence: Number(result?.data?.confidence || 0)
      }];
    } catch {
      return [name, { text: "", confidence: 0 }];
    }
  }));
  return Object.fromEntries(entries);
}

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener("load", resolve, { once: true });
      if (window.Tesseract?.recognize) resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadOcrEngine() {
  if (window.Tesseract?.recognize) return true;
  try {
    await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js", "tesseractOcrScript");
    return Boolean(window.Tesseract?.recognize);
  } catch {
    return false;
  }
}

function applyDetectedDocumentData(data = {}) {
  const applied = [
    setFieldIfDetected('[name="nome"]', data.name, detectedConfidence(data, "name")),
    setFieldIfDetected('[name="cognome"]', data.surname, detectedConfidence(data, "surname")),
    setFieldIfDetected('[name="cf"]', data.fiscalCode, detectedConfidence(data, "fiscalCode")),
    setFieldIfDetected('[name="nascita"]', data.birthDate, detectedConfidence(data, "birthDate")),
    setFieldIfDetected('[name="luogo"]', data.birthPlace, detectedConfidence(data, "birthPlace")),
    setFieldIfDetected('[name="provinciaNascita"]', data.birthProvince, detectedConfidence(data, "birthProvince")),
    setFieldIfDetected('[name="indirizzo"]', data.address, detectedConfidence(data, "address")),
    setFieldIfDetected('[name="provinciaResidenza"]', data.residenceProvince, detectedConfidence(data, "residenceProvince")),
    setFieldIfDetected('[name="tipoDocumento"]', data.documentType, detectedConfidence(data, "documentType")),
    setFieldIfDetected('[name="numeroDocumento"]', data.documentNumber, detectedConfidence(data, "documentNumber")),
    setFieldIfDetected('[name="dataRilascioDocumento"]', data.documentIssueDate, detectedConfidence(data, "documentIssueDate")),
    setFieldIfDetected('[name="scadenzaDocumento"]', data.documentExpiry, detectedConfidence(data, "documentExpiry")),
    setFieldIfDetected('[name="cittadinanza"]', data.citizenship, detectedConfidence(data, "citizenship")),
    setFieldIfDetected('[name="sesso"]', data.sex, detectedConfidence(data, "sex"))
  ];
  updateCustomerSummary();
  updateChecklistState();
  return applied.some(Boolean);
}

async function confirmDocumentScan() {
  const { front, back } = state.documentScan || {};
  if (!front || !back) {
    showToast("Scansiona fronte e retro del documento prima di confermare.");
    return;
  }

  const detected = state.documentScan.detected || {};
  const applied = applyDetectedDocumentData(detected);
  if (!applied) {
    showToast("Documento non letto correttamente. Riprova la scansione o compila manualmente.");
  } else if (missingDetectedDocumentFields(detected).length || hasLowConfidenceFields(detected)) {
    showToast("Alcuni dati non sono stati letti correttamente, controlla e completa manualmente.");
  } else {
    showToast("Controlla i dati estratti e correggi eventuali errori");
  }
  stopDocumentCamera();
  previewModal.hidden = true;
}

async function loadActForEdit(practiceNumber) {
  const act = await getActRecord(practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }
  if (!canModifyAct(act)) {
    showToast(normalizeWorkflowStatus(act.status) === "Completato"
      ? "Questo atto è completato. Solo responsabili e founder possono modificarlo."
      : "Puoi modificare solo gli atti di vendita effettuati da te.");
    return;
  }

  await resetCurrentPractice();
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
  state.loadedSignatureImages = Array.isArray(act.signatureImages) ? act.signatureImages : [];

  const cededItemsTable = document.getElementById("cededItemsTable");
  const items = Array.isArray(act.items) && act.items.length ? act.items : [{ description: "", metal: act.materials?.[0]?.metal || "Oro", title: "18 kt" }];
  cededItemsTable.querySelectorAll(".ceded-item-row").forEach((row) => row.remove());
  items.forEach((item) => cededItemsTable.insertAdjacentHTML("beforeend", cededItemRowMarkup(item)));

  document.getElementById("printWeightCustomer").checked = Boolean(act.printWeightCustomer);
  state.signatures = Array.isArray(act.signatures) ? act.signatures : [true, true, true];
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

  if (Array.isArray(act.bullionQuotes)) {
    act.bullionQuotes.forEach((quote) => {
      const input = document.querySelector(`#bullionQuotePanel input[data-bullion-quote="${quote.metal}"]`);
      if (input) input.value = formatBullionInputValue(quote.value);
    });
  }

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
  showToast(`Atto ${practiceNumber} aperto in modifica.`);
}

async function resetCurrentPractice(options = {}) {
  const preservedStoreCode = options.preserveStoreCode ? fieldValue("#storeCode") : "";

  document.querySelectorAll(".form-panel input").forEach((input) => {
    if (input.readOnly || input.type === "file") return;
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

  state.signatures = [false, false, false];
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
  state.loadedSignatureImages = [];
  state.fiscalCodeEditedManually = false;
  setQualityReview(null);

  await setPracticeMeta();
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
      fusedBy: displayUsername(state.currentUser)
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

function fusionActRows(acts, options = {}) {
  if (!acts.length) return '<div class="empty-state">Nessun atto presente.</div>';
  const today = localDateKey();
  return `
    <div class="archive-table fusion-table">
      <div class="table-row head"><span>Atto</span><span>Cliente</span><span>Data acquisto</span><span>Fondibile dal</span><span>Materiale</span><span>Azioni</span></div>
      ${acts.flatMap((act) => materialLotsForAct(act).map((material) => `
        <div class="table-row">
          <span>${escapeHtml(act.practiceNumber)}</span>
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
  status.textContent = signed === 3 ? "Firme complete" : `${3 - signed} firme mancanti`;
  status.classList.toggle("success", signed === 3);
  status.classList.toggle("warning", signed !== 3);
  document.getElementById("summarySignatures").textContent = signed === 3 ? "3 di 3 complete" : `${signed} di 3 complete`;
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
  return isCashPayment() && saleTotalAmount() > CASH_PAYMENT_LIMIT;
}

function cashPaymentLimitMessage() {
  return "Il pagamento in contanti non puo superare 499,99 euro. Seleziona Bonifico o Assegno come pagamento a norma di legge.";
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

function paymentRequiresProof() {
  return ["Bonifico", "Assegno"].includes(selectedPaymentMethod());
}

function updateIbanVisibility() {
  const field = document.getElementById("ibanField");
  if (!field) return;
  field.hidden = selectedPaymentMethod() !== "Bonifico";
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
  document.querySelectorAll("#bullionQuotePanel input[data-bullion-quote]").forEach((input) => {
    const quote = state.bullionVaultPrices[input.dataset.bullionQuote];
    if (!quote) return;
    input.value = formatBullionPrice(quote.value || 0);
    input.dataset.bullionSource = quote.source || "";
    input.dataset.bullionFetchedAt = quote.fetchedAt || "";
    const field = input.closest(".bullion-quote-field");
    const info = field?.querySelector("em");
    if (info) {
      info.textContent = `Dato BullionVault live: ${formatBullionPrice(quote.value)} EUR al kg. Fonte ${quote.source || "mercato BullionVault"}.`;
    }
  });
}

async function refreshBullionVaultPrices(options = {}) {
  try {
    const data = await apiRequest("/bullionvault/prices");
    state.bullionVaultPrices = Object.fromEntries((data.prices || []).map((quote) => [quote.metal, quote]));
    applyBullionVaultPrices();
    if (options.notify) showToast("Quotazioni BullionVault aggiornate.");
  } catch {
    if (options.notify) showToast("Quotazioni BullionVault non disponibili. Puoi inserire il dato manualmente.");
  }
}

async function setPracticeMeta() {
  const now = new Date();
  document.getElementById("practiceDate").value = now.toISOString().slice(0, 10);
  document.getElementById("practiceTime").value = now.toTimeString().slice(0, 5);
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
  renderBullionQuoteFields();
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
  if (selectedPaymentMethod() === "Bonifico" && !isValidIban(fieldValue("#paymentIban"))) {
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
  return state.signatures.every(Boolean) ? [] : ["Tre firme cliente"];
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

function renderBullionQuoteFields() {
  const container = document.getElementById("bullionQuotePanel");
  if (!container) return;

  const previousValues = {};
  container.querySelectorAll("input[data-bullion-quote]").forEach((input) => {
    previousValues[input.dataset.bullionQuote] = input.value;
  });

  const metals = activeMetals();
  container.innerHTML = `
    <div class="bullion-quote-heading">
      <span class="internal-badge">Quotazione giornaliera</span>
      <strong>Dato BullionVault automatico</strong>
      <button class="small-button" id="refreshBullionVaultPrices" type="button">Aggiorna</button>
    </div>
    ${(metals.length ? metals : ["Oro"]).map((metal) => `
      <label class="bullion-quote-field">
        <span>Quotazione ${metal.toLowerCase()} in borsa giornaliera &egrave; di &euro;</span>
        <input data-bullion-quote="${metal}" type="text" inputmode="decimal" value="${escapeHtml(formatBullionInputValue(previousValues[metal]))}" placeholder="Dato BullionVault">
        <em>Dato estrapolato da BullionVault al Kg di ${escapeHtml(pureMaterialLabel(metal))} puro.</em>
      </label>
    `).join("")}
  `;
  applyBullionVaultPrices();
}

function bullionQuoteRows() {
  return [...document.querySelectorAll("#bullionQuotePanel input[data-bullion-quote]")].map((input) => ({
    metal: input.dataset.bullionQuote,
    value: input.value || "Dato non inserito"
  }));
}

function renderMaterialAmountFields() {
  const container = document.getElementById("materialAmountFields");
  if (!container) return;

  const previousValues = {};
  container.querySelectorAll("input[data-material-amount]").forEach((input) => {
    previousValues[input.dataset.materialAmount] = input.value;
  });

  container.innerHTML = activeMetals().map((metal) => `
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
  if (!rows.length) return "";
  return `
    <div class="print-field material-amount-print">
      <span>Ripartizione importo</span>
      ${rows.map((row) => `<strong>${escapeHtml(row.metal)}: ${escapeHtml(formatEuro(Number(row.amount || 0)))}</strong>`).join("")}
    </div>
  `;
}

function buildBullionQuoteBlock() {
  const rows = bullionQuoteRows().map((row) => `
    <div class="print-field">
      <span>Quotazione ${escapeHtml(row.metal.toLowerCase())} BullionVault</span>
      EUR ${escapeHtml(row.value)} al Kg di ${escapeHtml(pureMaterialLabel(row.metal))} puro
    </div>
  `).join("");

  return `
    <h2>Quotazioni borsa giornaliera</h2>
    <div class="print-grid">${rows}</div>
  `;
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
    const labels = ["Firma vendita", "Firma dichiarazioni", "Firma privacy"];
    const image = state.signatures[index] ? canvasToOptimizedDataUrl(canvas) : "";
    return `
      <div class="print-signature">
        <span>${labels[index]}</span>
        ${image ? `<img src="${image}" alt="${labels[index]}">` : "Firma non acquisita"}
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

  const mainCopy = `
    <section class="print-copy ${scope === "company" ? "company-copy" : "customer-copy"}">
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
        <h2>Firme</h2>
        <div class="print-signatures">${signatureRows()}</div>
      `}
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

async function archiveCurrentPractice(status = "Archiviata", options = {}) {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return false;
  const review = currentQualityReview();
  if (review?.status === "negative" && !review.feedback) {
    showToast("Inserisci il feedback scritto per il controllo qualità negativo.");
    return false;
  }
  const isCompletion = status === "Completato";
  const missing = isCompletion ? validatePrintScope("company") : [];
  if (isCompletion && missing.length) {
    showToast(validationMessage(missing, "la copia aziendale"));
    return false;
  }
  const archivedAct = currentActSnapshot(status);
  archivedAct.readOnlyHtml = buildPrintCopy("Atto archiviato - Sola lettura", "Dato interno aziendale", "company");
  const wasEditing = Boolean(state.editingPracticeNumber);
  try {
    await saveActRecord(archivedAct, wasEditing ? "PUT" : "POST");
  } catch (error) {
    showToast(error.message || "Salvataggio non riuscito: controlla la connessione al database.");
    return false;
  }
  renderArchiveGroups();
  renderFusionGroups();
  if (!options.skipReset) await resetCurrentPractice({ preserveStoreCode: true });
  if (wasEditing && !options.skipReset) setScreen("archive");
  showToast(wasEditing ? "Atto di vendita modificato e salvato." : `Atto di vendita ${status.toLowerCase()} e salvato.`);
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
    return archiveCurrentPractice("Completato");
  }

  const preview = missing.slice(0, 8).join(", ");
  const suffix = missing.length > 8 ? ` e altri ${missing.length - 8} elementi` : "";
  const shouldArchive = window.confirm(
    `La pratica non puo essere completata. Mancano: ${preview}${suffix}. Vuoi archiviare l'atto di vendita per completarlo successivamente?`
  );

  if (shouldArchive) {
    await archiveCurrentPractice("Archiviata");
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
  const button = event.target.closest("[data-edit-user]");
  if (button) editUser(button.dataset.editUser);
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

brandMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleBrandMenu();
});

enterSoftware.addEventListener("click", showMainMenuFromSplash);

document.querySelectorAll(".main-menu-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.matches("[data-start-tutorial]")) return;
    enterSectionFromMainMenu(button.dataset.section);
  });
});

document.querySelectorAll("[data-start-tutorial]").forEach((button) => {
  button.addEventListener("click", () => {
    closeBrandMenu();
    if (!button.closest(".main-menu-actions")) mainMenuScreen.hidden = true;
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
  button.addEventListener("click", async () => {
    if (button.matches("[data-start-tutorial]")) return;
    if (button.dataset.section === "practice") await resetCurrentPractice();
    setScreen(button.dataset.section);
    closeBrandMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!brandDropdown.hidden && !event.target.closest(".brand-wrap")) closeBrandMenu();
});

steps.forEach((step) => {
  step.addEventListener("click", () => {
    state.step = Number(step.dataset.step);
    renderStep();
  });
});

document.getElementById("nextStep").addEventListener("click", async () => {
  if (state.step === 2 && state.signatures.some((signed) => !signed)) {
    showToast("Prima di procedere servono tutte e tre le firme del cliente.");
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
  const row = document.createElement("article");
  row.className = "ceded-item-row";
  row.innerHTML = cededItemRowMarkup().replace('<article class="ceded-item-row">', "").replace("</article>", "");
  document.getElementById("cededItemsTable").appendChild(row);
  updateTitleOptions(row);
  updateCededItems();
  updateChecklistState();
  refreshBullionVaultPrices();
  showToast("Nuova riga oggetto aggiunta alla scheda cliente.");
});

document.getElementById("cededItemsTable").addEventListener("input", (event) => {
  updateCededItems();
  updateChecklistState();
});

document.getElementById("cededItemsTable").addEventListener("change", (event) => {
  const row = event.target.closest(".ceded-item-row");
  if (!row || !event.target.matches("select")) return;
  const selects = row.querySelectorAll("select");
  if (event.target === selects[0]) {
    updateTitleOptions(row);
    renderBullionQuoteFields();
    renderWeightFields();
    renderPreciousCaptureCards();
    updateAttachmentState();
    updateChecklistState();
    refreshBullionVaultPrices();
  }
});

document.getElementById("saleTotal").addEventListener("input", () => {
  updateSaleTotal();
  notifyCashPaymentLimitIfNeeded();
  updateChecklistState();
});

document.getElementById("materialAmountFields").addEventListener("input", updateChecklistState);

document.querySelector(".form-panel").addEventListener("input", (event) => {
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
  updateChecklistState();
});

document.querySelector(".form-panel").addEventListener("change", (event) => {
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
  }
  if (event.target.matches('[name="indirizzo"]')) updateResidenceProvinceFromAddress();
  if (event.target.matches('[name="provinciaNascita"], [name="provinciaResidenza"]')) normalizeProvinceField(event.target);
  if (event.target.matches('[name="scadenzaDocumento"]')) updateDocumentExpiryWarning();
  updateChecklistState();
});

document.getElementById("paymentMethod").addEventListener("change", () => {
  notifyCashPaymentLimitIfNeeded();
  renderPaymentCaptureCard();
  updateAttachmentState();
  updateChecklistState();
});

document.getElementById("storeCode").addEventListener("change", async () => {
  await updatePracticeNumber();
  updateChecklistState();
});
document.getElementById("practiceDate").addEventListener("change", async () => {
  await updatePracticeNumber();
  updateChecklistState();
});

document.getElementById("archiveStoreFilter").addEventListener("change", async () => {
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

previewBody.addEventListener("click", (event) => {
  if (event.target.closest("#cancelDocumentScan")) {
    stopDocumentCamera();
    previewModal.hidden = true;
    return;
  }
  if (event.target.closest("#captureDocumentPhoto")) {
    captureDocumentPhoto();
    return;
  }
  if (event.target.closest("#useDocumentScanPhoto")) {
    useDocumentScanPhoto();
    return;
  }
  if (event.target.closest("#retakeDocumentScanPhoto")) {
    retakeDocumentScanPhoto();
    return;
  }
  if (event.target.closest("#restartDocumentScan")) {
    restartDocumentScan();
    return;
  }
  const retakeSideButton = event.target.closest("[data-retake-document-side]");
  if (retakeSideButton) {
    retakeDocumentScanSide(retakeSideButton.dataset.retakeDocumentSide);
    return;
  }
  if (event.target.closest("#analyzeDocumentWithAi")) {
    analyzeDocumentScanWithAi();
    return;
  }
  if (event.target.closest("#confirmDocumentScan")) {
    confirmDocumentScan();
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
document.getElementById("scanDocumentButton").addEventListener("click", openDocumentScanModal);

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
    updateSignatureState();
  });
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-document-scan-input]")) {
    const side = event.target.dataset.documentScanInput;
    const file = event.target.files?.[0];
    if (!side || !file) return;
    try {
      showLoading("Preparazione anteprima...");
      const dataUrl = await fileToDataUrl(file);
      state.documentScan.side = side;
      state.documentScan.preview = {
        name: file.name || (side === "front" ? "Documento fronte" : "Documento retro"),
        type: file.type || "image/jpeg",
        dataUrl
      };
      renderDocumentScanModal();
    } catch {
      showToast("Documento non letto correttamente. Riprova la scansione o compila manualmente.");
    } finally {
      hideLoading();
    }
    return;
  }

  if (!event.target.matches(".capture-card input")) return;
  const card = event.target.closest(".capture-card");
  const key = card?.dataset.captureKey;
  if (!card || !key) return;
  const file = event.target.files?.[0];
  if (file) {
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

document.addEventListener("click", (event) => {
  if (event.target.closest("#refreshBullionVaultPrices")) {
    event.preventDefault();
    refreshBullionVaultPrices({ notify: true });
    return;
  }

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
  stopDocumentCamera();
  previewModal.hidden = true;
});

async function initializeApp() {
  removeLegacySearchMenu();
  upgradeProvinceFields();
  populateAutocompleteLists();
  appShell.hidden = true;
  await restoreSession();
  window.addEventListener("focus", () => {
    if (state.authToken) syncActsFromServer();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.authToken) syncActsFromServer();
  });
}

initializeApp();
