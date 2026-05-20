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
  cashLimitWarningShown: false,
  bullionVaultPrices: {}
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
const loggedUserName = document.getElementById("loggedUserName");
const sessionUsername = document.getElementById("sessionUsername");
const appShell = document.querySelector(".app-shell");
const titleOptionsByMetal = {
  Oro: ["24 kt", "22 kt", "21 kt", "18 kt", "14 kt", "12 kt", "9 kt", "6 kt"],
  Argento: ["999", "925", "800"],
  Platino: ["999", "950", "900", "850"]
};
const metalOrder = ["Oro", "Argento", "Platino"];
const documentLabels = {
  "Carta identita": "carta identita",
  Patente: "patente",
  Passaporto: "passaporto"
};
const apiBase = "/api";
const CASH_PAYMENT_LIMIT = 499.99;
const demoActs = [];

function removeLegacySearchMenu() {
  document.querySelectorAll('[data-section="searchActs"], #searchActs').forEach((element) => {
    element.remove();
  });
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  const response = await fetch(`${apiBase}${path}`, {
    headers,
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      showLogin();
    }
    throw new Error(body.error || "Errore comunicazione server");
  }
  return response.json();
}

async function loadSavedActs() {
  try {
    const acts = await apiRequest("/atti");
    demoActs.splice(0, demoActs.length, ...acts);
  } catch (error) {
    showToast("Database non raggiungibile: controllo connessione server.");
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
    '[name="scadenzaDocumento"]',
    "#saleTotal"
  ];
  const hasFilledFields = selectors.some((selector) => hasValue(selector));
  const hasFilledItems = [...document.querySelectorAll(".ceded-item-row input")].some((input) => input.value.trim());
  return !hasFilledFields && !hasFilledItems && state.uploadedCaptures.size === 0 && state.signatures.every((signed) => !signed);
}

async function syncActsFromServer() {
  await loadSavedActs();
  renderArchiveGroups();
  renderFusionGroups();
  if (isAdmin() && document.getElementById("users")?.classList.contains("active-screen")) {
    await loadUsers();
  }

  if (!state.editingPracticeNumber && isPracticeFormEmpty()) {
    await updatePracticeNumber();
  }
}

async function saveActRecord(act, method = "POST") {
  const identifier = act.id || act.practiceNumber;
  const path = method === "PUT" ? `/atti/${encodeURIComponent(identifier)}` : "/atti";
  const saved = await apiRequest(path, {
    method,
    body: JSON.stringify(act)
  });
  const index = demoActs.findIndex(
    (item) => (saved.id && item.id === saved.id) || item.practiceNumber === saved.practiceNumber
  );
  if (index >= 0) demoActs[index] = saved;
  else demoActs.unshift(saved);
  return saved;
}

async function deleteActRecord(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  const identifier = act?.id || practiceNumber;
  await apiRequest(`/atti/${encodeURIComponent(identifier)}`, { method: "DELETE" });
  const index = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (index >= 0) demoActs.splice(index, 1);
}

async function getActRecord(identifier) {
  try {
    const saved = await apiRequest(`/atti/${encodeURIComponent(identifier)}`);
    const index = demoActs.findIndex(
      (item) => (saved.id && item.id === saved.id) || item.practiceNumber === saved.practiceNumber
    );
    if (index >= 0) demoActs[index] = saved;
    else demoActs.unshift(saved);
    return saved;
  } catch {
    return demoActs.find((item) => item.id === identifier || item.practiceNumber === identifier) || null;
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
  if (normalized === "admin") return "responsabile";
  if (normalized === "responsabile") return "responsabile";
  if (normalized === "commessa") return "commessa";
  return "commesso";
}

function roleLabel(role) {
  return {
    founder: "Founder",
    responsabile: "Responsabile",
    commesso: "Commesso",
    commessa: "Commessa"
  }[normalizeRole(role)];
}

function displayUsername(user = {}) {
  if (user.username) return user.username;
  return user.nome || "";
}

function isAdmin() {
  return ["founder", "responsabile"].includes(normalizeRole(state.currentUser?.ruolo));
}

function isFounder() {
  return normalizeRole(state.currentUser?.ruolo) === "founder";
}

function userSeesAllStores(user = state.currentUser) {
  return normalizeRole(user?.ruolo) === "founder";
}

function managedRolesForCurrentUser() {
  const role = normalizeRole(state.currentUser?.ruolo);
  if (role === "founder") return ["responsabile", "commesso", "commessa"];
  if (role === "responsabile") return ["commesso", "commessa"];
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
  } else {
    if (storeCode) storeCode.disabled = false;
    if (archiveStore) archiveStore.disabled = false;
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
  configureUserFormPermissions();
}

async function startAuthenticatedApp() {
  showAuthenticatedShell();
  applyRolePermissions();
  await loadSavedActs();
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
  renderArchiveGroups();
  renderFusionGroups();
  if (isAdmin()) await loadUsers();
  await refreshBullionVaultPrices();
  if (!state.syncTimer) state.syncTimer = window.setInterval(syncActsFromServer, 5000);
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
}

async function enterSectionFromMainMenu(section) {
  mainMenuScreen.hidden = true;
  if (section === "practice") await resetCurrentPractice();
  setScreen(section);
}

function returnToMainMenu() {
  closeBrandMenu();
  clearActSearch();
  mainMenuScreen.hidden = false;
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
  if (role === "founder") {
    storeSelect.value = "Tutti";
    storeSelect.disabled = true;
  } else {
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
    <div class="table-row head"><span>Utente</span><span>Accesso</span><span>Ruolo</span><span>Negozio</span><span>Stato</span><span>Azioni</span></div>
    ${users.map((user) => `
      <div class="table-row">
        <strong>${escapeHtml(user.nome)} ${escapeHtml(user.cognome)}</strong>
        <span>${escapeHtml(displayUsername(user))}</span>
        <em>${escapeHtml(roleLabel(user.ruolo))}</em>
        <span>${escapeHtml(userSeesAllStores(user) ? "Tutti" : user.negozio)}</span>
        <span class="presence ${user.online ? "online" : "offline"}">${user.online ? "Online" : "Offline"}</span>
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
  if (normalized === "archiviato" || normalized === "archiviata") return "Archiviata";
  return "Archiviata";
}

function statusClass(status = "") {
  const normalized = normalizeWorkflowStatus(status).toLowerCase();
  if (normalized === "completato" || normalized === "completata") return "status-completed";
  if (normalized === "archiviato" || normalized === "archiviata") return "status-archived";
  return "";
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
  const materials = weightRows()
    .filter((row) => Number(row.value || 0) > 0)
    .map((row) => ({ metal: row.metal, weight: row.value }));
  const totalWeight = materials.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  return {
    name: fieldValue('[name="nome"]'),
    surname: fieldValue('[name="cognome"]'),
    birthDate: fieldValue('[name="nascita"]'),
    birthPlace: fieldValue('[name="luogo"]'),
    birthProvince: fieldValue('[name="provinciaNascita"]'),
    fiscalCode: fieldValue('[name="cf"]'),
    phone: fieldValue('[name="telefono"]'),
    address: fieldValue('[name="indirizzo"]'),
    residenceProvince: fieldValue('[name="provinciaResidenza"]'),
    documentType: fieldValue('[name="tipoDocumento"]'),
    documentNumber: fieldValue('[name="numeroDocumento"]'),
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
    operatorNotes: document.querySelector(".textarea-label textarea")?.value || "",
    operatorId: state.currentUser?.id || null,
    operatorUsername: displayUsername(state.currentUser),
    operatorName: [state.currentUser?.nome, state.currentUser?.cognome].filter(Boolean).join(" "),
    weight: totalWeight.toFixed(2),
    materials,
    signatures: [...state.signatures],
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

function archiveVisibleActs() {
  const selectedStore = document.getElementById("archiveStoreFilter")?.value || "Busto Arsizio";
  const field = document.getElementById("searchField")?.value || "name";
  const keyword = document.getElementById("searchKeyword")?.value.trim().toLowerCase() || "";
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

  const grouped = acts.reduce((groups, act) => {
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
          <div class="archive-table">
            <div class="table-row head"><span>Pratica</span><span>Cliente</span><span>Data</span><span>Stato</span><span>Azioni</span></div>
            ${dayActs.map((act) => `
              <div class="table-row">
                <span>${escapeHtml(act.practiceNumber)}</span>
                <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                <span>${escapeHtml(act.date)}</span>
                <em class="${statusClass(act.status)}">${escapeHtml(normalizeWorkflowStatus(act.status))}</em>
                <div class="row-actions">
                  <button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>
                  <button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica</button>
                  <button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </section>
  `).join("");
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

function exportDailySearchPdf() {
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
  printPacket.innerHTML = buildArchiveDayExport(storeLabel, dates[0], dayActs);
  window.print();
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
        <div class="print-field"><span>Tipo documento</span>${escapeHtml(act.documentType || missing)}</div>
        <div class="print-field"><span>Numero documento</span>${escapeHtml(act.documentNumber || missing)}</div>
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
      <button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica atto</button>
      <button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>
    </div>
    ${act.readOnlyHtml || buildArchivedActFallback(act)}
  `;
  previewModal.hidden = false;
}

async function deleteAct(practiceNumber) {
  const index = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (index < 0) {
    showToast("Atto di vendita non trovato.");
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

function storeCodeFromAct(act) {
  if (act.storeCode) return act.storeCode;
  return {
    "Busto Arsizio": "BUSTO",
    "Cassano Magnago": "CASSANO",
    Legnano: "LEGNANO"
  }[act.store] || "BUSTO";
}

async function loadActForEdit(practiceNumber) {
  const act = await getActRecord(practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }

  await resetCurrentPractice();
  state.editingPracticeNumber = act.practiceNumber;

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
  setFieldValue('[name="indirizzo"]', act.address);
  setFieldValue('[name="provinciaResidenza"]', act.residenceProvince);
  setFieldValue('[name="tipoDocumento"]', act.documentType);
  setFieldValue('[name="numeroDocumento"]', act.documentNumber);
  setFieldValue('[name="scadenzaDocumento"]', toDateInputValue(act.documentExpiry));
  setFieldValue('[name="professione"]', act.profession);
  setFieldValue("#paymentMethod", act.paymentMethod);
  setFieldValue("#saleTotal", act.amount);
  setFieldValue(".textarea-label textarea", act.operatorNotes);

  const cededItemsTable = document.getElementById("cededItemsTable");
  const items = Array.isArray(act.items) && act.items.length ? act.items : [{ description: "", metal: act.materials?.[0]?.metal || "Oro", title: "18 kt" }];
  cededItemsTable.querySelectorAll(".ceded-item-row").forEach((row) => row.remove());
  items.forEach((item) => cededItemsTable.insertAdjacentHTML("beforeend", cededItemRowMarkup(item)));

  document.getElementById("printWeightCustomer").checked = Boolean(act.printWeightCustomer);
  state.signatures = Array.isArray(act.signatures) ? act.signatures : [true, true, true];
  state.uploadedCaptures = new Set(Array.isArray(act.captures) ? act.captures : []);
  state.captureFiles.clear();
  state.attachments = state.uploadedCaptures.size;
  state.step = 0;

  document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
  updateCededItems();
  updateSaleTotal();
  updateCustomerSummary();
  updateSignatureState();
  updateDocumentCaptureCards();
  renderPaymentCaptureCard();

  if (Array.isArray(act.bullionQuotes)) {
    act.bullionQuotes.forEach((quote) => {
      const input = document.querySelector(`#bullionQuotePanel input[data-bullion-quote="${quote.metal}"]`);
      if (input) input.value = quote.value === "Dato non inserito" ? "" : quote.value;
    });
  }

  if (Array.isArray(act.materials)) {
    act.materials.forEach((material) => {
      const input = document.querySelector(`#totalWeightFields input[data-metal-weight="${material.metal}"]`);
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
  updateAttachmentState();
  updateChecklistState();
}

async function deleteCurrentPractice() {
  const practiceNumber = fieldValue("#practiceNumber");
  const confirmed = window.confirm(`Vuoi eliminare l'atto attualmente in compilazione${practiceNumber ? ` ${practiceNumber}` : ""}?`);
  if (!confirmed) return;

  const existingIndex = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (existingIndex >= 0) {
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

function renderFusionGroups() {
  const container = document.getElementById("fusionGroups");
  if (!container) return;

  const eligibleActs = demoActs
    .map((act) => ({ ...act, daysElapsed: daysFromPurchase(act.date) }))
    .filter((act) => act.daysElapsed >= 10)
    .sort((first, second) => second.daysElapsed - first.daysElapsed);

  if (!eligibleActs.length) {
    container.innerHTML = '<div class="empty-state">Nessun atto disponibile per fusione. Verranno mostrati solo gli atti acquistati da almeno 10 giorni.</div>';
    return;
  }

  const grouped = eligibleActs.reduce((groups, act) => {
    groups[act.store] ||= [];
    groups[act.store].push(act);
    return groups;
  }, {});

  const stores = ["Busto Arsizio", "Cassano Magnago", "Legnano"];
  container.innerHTML = stores
    .filter((store) => grouped[store]?.length)
    .map((store) => {
      const acts = grouped[store];
      const totalWeight = acts.reduce((sum, act) => sum + Number(act.weight || 0), 0);
      const totalAmount = acts.reduce((sum, act) => sum + Number(act.amount || 0), 0);
      const actsByMaterial = acts.reduce((materials, act) => {
        actMaterials(act).forEach((material) => {
          materials[material.metal] ||= [];
          materials[material.metal].push({ ...act, materialWeight: material.weight });
        });
        return materials;
      }, {});

      return `
        <section class="fusion-store">
          <div class="fusion-store-heading">
            <div>
              <h3>${escapeHtml(store)}</h3>
              <p>${acts.length} ${acts.length === 1 ? "atto pronto" : "atti pronti"} per fusione</p>
            </div>
            <div class="fusion-totals">
              <span>${escapeHtml(totalWeight.toFixed(2))} g</span>
              <strong>${escapeHtml(formatEuro(totalAmount))}</strong>
            </div>
          </div>
          <div class="fusion-materials">
            ${metalOrder.filter((metal) => actsByMaterial[metal]?.length).map((metal) => {
              const materialActs = actsByMaterial[metal];
              const materialWeight = materialActs.reduce((sum, act) => sum + Number(act.materialWeight || 0), 0);
              return `
                <section class="fusion-material ${captureClassForMetal(metal)}">
                  <div class="fusion-material-heading">
                    <h4>${escapeHtml(metal)}</h4>
                    <span>${escapeHtml(materialWeight.toFixed(2))} g da fondere</span>
                  </div>
                  <div class="archive-table fusion-table">
                    <div class="table-row head"><span>Atto</span><span>Cliente</span><span>Data acquisto</span><span>Giorni</span><span>Peso materiale</span><span>Azioni</span></div>
                    ${materialActs.map((act) => `
                      <div class="table-row">
                        <span>${escapeHtml(act.practiceNumber)}</span>
                        <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                        <span>${escapeHtml(act.date)}</span>
                        <em class="done">${escapeHtml(act.daysElapsed)} giorni</em>
                        <span>${escapeHtml(act.materialWeight)} g</span>
                        <div class="row-actions">
                          <button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>
                          <button type="button" data-edit-act="${escapeHtml(act.practiceNumber)}">Modifica</button>
                          <button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </section>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
}

function clearActSearch() {
  const keyword = document.getElementById("searchKeyword");
  if (keyword) keyword.value = "";
  state.lastSearchResults = [];
  renderArchiveGroups();
}

function runActSearch() {
  const keyword = document.getElementById("searchKeyword").value.trim().toLowerCase();
  if (!keyword) {
    showToast("Inserisci una parola chiave da ricercare.");
    return;
  }

  const results = archiveVisibleActs();
  state.lastSearchResults = results;
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

function paymentCaptureKey() {
  return `pagamento-${selectedPaymentMethod().toLowerCase().replace(/\s+/g, "-")}`;
}

function renderPaymentCaptureCard() {
  const section = document.getElementById("paymentCaptureSection");
  const grid = document.getElementById("paymentCaptureGrid");
  if (!section || !grid) return;

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
    <label class="capture-card ${loaded ? "loaded" : ""}" data-capture-key="${key}">
      <input type="file" accept="image/*,.pdf" capture="environment">
      <span>Pagamento</span>
      <strong>Contabile ${method}</strong>
      <em>${loaded ? "Allegato acquisito" : "Tocca per fotografare o allegare"}</em>
      ${captureActionsMarkup()}
    </label>
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

function updateDocumentCaptureCards() {
  const label = currentDocumentLabel();
  const slug = currentDocumentSlug();

  document.querySelectorAll("[data-document-capture]").forEach((card) => {
    const side = card.dataset.documentCapture;
    const key = `documento-${side}-${slug}`;
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

function applyBullionVaultPrices() {
  document.querySelectorAll("#bullionQuotePanel input[data-bullion-quote]").forEach((input) => {
    const quote = state.bullionVaultPrices[input.dataset.bullionQuote];
    if (!quote) return;
    input.value = Number(quote.value || 0).toFixed(2);
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
        <input data-bullion-quote="${metal}" type="number" min="0" step="0.01" value="${escapeHtml(previousValues[metal] || "")}" placeholder="Dato BullionVault">
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

function ensureCaptureActions() {
  document.querySelectorAll(".capture-card").forEach((card) => {
    if (!card.querySelector(".capture-actions")) card.insertAdjacentHTML("beforeend", captureActionsMarkup());
  });
}

function renderPreciousCaptureCards() {
  const grid = document.getElementById("preciousCaptureGrid");
  if (!grid) return;

  grid.innerHTML = activeMetals().map((metal) => [
    { side: "fronte", label: "Foto frontale" },
    { side: "retro", label: "Foto retro" }
  ].map((photo) => {
    const key = `preziosi-${metal.toLowerCase()}-${photo.side}`;
    const loaded = state.uploadedCaptures.has(key);
    return `
      <label class="capture-card ${captureClassForMetal(metal)} ${loaded ? "loaded" : ""}" data-capture-key="${key}">
        <input type="file" accept="image/*" capture="environment">
        <span>Preziosi ${metal}</span>
        <strong>${photo.label} ${metal.toLowerCase()}</strong>
        <em>${loaded ? "Foto acquisita" : "Tocca per fotografare"}</em>
        ${captureActionsMarkup()}
      </label>
    `;
  }).join("")).join("");
  ensureCaptureActions();
}

function renderWeightFields() {
  const container = document.getElementById("totalWeightFields");
  if (!container) return;

  const previousValues = {};
  container.querySelectorAll("input[data-metal-weight]").forEach((input) => {
    previousValues[input.dataset.metalWeight] = input.value;
  });

  container.innerHTML = activeMetals().map((metal) => `
    <label class="metal-weight-field">
      <span>Peso totale oggetti preziosi in ${metal.toLowerCase()}</span>
      <div class="metal-weight-input-wrap">
        <input data-metal-weight="${metal}" type="number" value="${escapeHtml(previousValues[metal] || "0")}" min="0" step="0.01">
        <em>gr</em>
      </div>
    </label>
  `).join("");
}

function weightRows() {
  return [...document.querySelectorAll("#totalWeightFields input[data-metal-weight]")].map((input) => ({
    metal: input.dataset.metalWeight,
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
    const image = state.signatures[index] ? canvas.toDataURL("image/png") : "";
    return `
      <div class="print-signature">
        <span>${labels[index]}</span>
        ${image ? `<img src="${image}" alt="${labels[index]}">` : "Firma non acquisita"}
      </div>
    `;
  }).join("");
}

function attachmentRows() {
  return requiredCaptureKeys().map((key) => `
    <div class="print-attachment">
      <span>${state.uploadedCaptures.has(key) ? "Allegato presente" : "Allegato mancante"}</span>
      ${escapeHtml(key.replaceAll("-", " "))}
    </div>
  `).join("");
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
      <h2>Allegati pratica</h2>
      <div class="print-attachments">${attachmentRows()}</div>
  ` : internalWeight;

  return `
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
        <div class="print-field"><span>Tipo documento</span>${escapeHtml(fieldValue('[name="tipoDocumento"]'))}</div>
        <div class="print-field"><span>Numero documento</span>${escapeHtml(fieldValue('[name="numeroDocumento"]'))}</div>
        <div class="print-field"><span>Scadenza documento</span>${escapeHtml(fieldValue('[name="scadenzaDocumento"]'))}</div>
        <div class="print-field"><span>Professione lavorativa</span>${escapeHtml(fieldValue('[name="professione"]'))}</div>
      </div>

      <h2>Vendita</h2>
      <div class="print-grid">
        <div class="print-field"><span>Metodo pagamento</span>${escapeHtml(fieldValue("#paymentMethod"))}</div>
        <div class="print-field"><span>Totale corrisposto</span>${escapeHtml(formatEuro(Number(fieldValue("#saleTotal"))))}</div>
        ${materialAmountsBlockFromRows()}
        <div class="print-field"><span>Note operatore</span>${escapeHtml(document.querySelector(".textarea-label textarea")?.value || "")}</div>
      </div>

      <h2>Oggetti ceduti</h2>
      <div class="print-items">${items}</div>
      ${buildBullionQuoteBlock()}
      ${internalSections}
      <h2>Dichiarazioni</h2>
      <p class="print-legal">Gli oggetti venduti sopra descritti sono usati e/o in cattivo stato di conservazione. Autorizzo la loro ulteriore alterazione per poter eseguire il test di verifica del metallo, determinarne il titolo e calcolarne il prezzo. Dichiaro inoltre che gli stessi sopra indicati oggetti non sono di illecita provenienza, di essere in possesso di tutti i diritti atti alla vendita degli stessi e di accettare e consentire il trattamento dei propri dati personali (Legge 196/03). La presente vale quale ricevuta e saldo per la somma riportata alla voce prezzo complessivo. Il venditore si obbliga fin da ora a restituire il ricavato della vendita qualora, a seguito di controlli di verifica, risulti che gli oggetti consegnati non siano corrispondenti nel valore e nella qualità a quelli dichiarati al momento della vendita e/o risultino di non essere di metallo prezioso. Dichiaro infine di aver letto attentamente quanto sopra riportato e che ai sensi e per gli effetti degli art. 1341 e 1342 del c.c. approvo incondizionatamente.</p>
      <h2>Firme</h2>
      <div class="print-signatures">${signatureRows()}</div>
    </section>
  `;
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

function printCompanyCopy() {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return;
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "la copia aziendale"));
    return;
  }
  renderPaymentCaptureCard();
  printPacket.innerHTML = buildPrintCopy("Copia aziendale interna", "Dato interno aziendale", "company");
  window.print();
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

async function archiveCurrentPractice(status = "Archiviata") {
  if (notifyCashPaymentLimitIfNeeded({ force: true })) return false;
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
  } catch {
    showToast("Salvataggio non riuscito: controlla la connessione al database.");
    return false;
  }
  renderArchiveGroups();
  renderFusionGroups();
  await syncActsFromServer();
  await resetCurrentPractice({ preserveStoreCode: true });
  showToast(wasEditing ? "Atto di vendita modificato e salvato." : `Atto di vendita ${status.toLowerCase()} e salvato.`);
  return true;
}

async function completeCurrentPractice() {
  const missing = validatePrintScope("company");
  if (!missing.length) return archiveCurrentPractice("Completato");

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
logoutButton.addEventListener("click", handleLogout);
document.getElementById("userForm").addEventListener("submit", saveUser);
document.getElementById("resetUserForm").addEventListener("click", resetUserForm);
document.getElementById("usersList").addEventListener("click", (event) => {
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
  button.addEventListener("click", () => enterSectionFromMainMenu(button.dataset.section));
});

document.querySelectorAll("[data-return-menu]").forEach((button) => {
  button.addEventListener("click", returnToMainMenu);
});

brandDropdown.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", async () => {
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
  if (event.target.matches('[name="nome"], [name="cognome"], [name="cf"]')) updateCustomerSummary();
  updateChecklistState();
});

document.querySelector(".form-panel").addEventListener("change", (event) => {
  if (event.target.matches('[name="nome"], [name="cognome"], [name="cf"]')) updateCustomerSummary();
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

document.getElementById("archiveStoreFilter").addEventListener("change", renderArchiveGroups);

document.getElementById("archiveGroups").addEventListener("click", (event) => {
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
document.getElementById("clearActSearch").addEventListener("click", clearActSearch);

document.getElementById("documentType").addEventListener("change", () => {
  updateDocumentCaptureCards();
  updateAttachmentState();
});

document.getElementById("runActSearch").addEventListener("click", runActSearch);
document.getElementById("searchField").addEventListener("change", renderArchiveGroups);

document.getElementById("searchKeyword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runActSearch();
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
    state.signatures[Number(canvas.dataset.signature)] = true;
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
    state.signatures[Number(canvas.dataset.signature)] = false;
    updateSignatureState();
  });
});

document.addEventListener("change", (event) => {
  if (!event.target.matches(".capture-card input")) return;
  const card = event.target.closest(".capture-card");
  const key = card?.dataset.captureKey;
  if (!card || !key) return;
  const file = event.target.files?.[0];
  if (file) {
    const previous = state.captureFiles.get(key);
    if (previous?.url) URL.revokeObjectURL(previous.url);
    state.captureFiles.set(key, {
      name: file.name || "Foto allegata",
      type: file.type || "",
      url: URL.createObjectURL(file)
    });
  }
  state.uploadedCaptures.add(key);
  state.attachments = state.uploadedCaptures.size;
  card.classList.add("loaded");
  card.querySelector("em").textContent = "Foto acquisita";
  updateAttachmentState();
  updateChecklistState();
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#refreshBullionVaultPrices")) {
    event.preventDefault();
    refreshBullionVaultPrices({ notify: true });
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
    if (!file) {
      showToast(state.uploadedCaptures.has(key) ? "Allegato presente, anteprima non disponibile in questa sessione." : "Nessuna foto caricata.");
      return;
    }
    previewTitle.textContent = file.name || "Anteprima foto";
    previewBody.innerHTML = file.type.includes("pdf")
      ? `<iframe class="capture-preview-frame" src="${file.url}" title="${escapeHtml(file.name)}"></iframe>`
      : `<img class="capture-preview-image" src="${file.url}" alt="${escapeHtml(file.name)}">`;
    previewModal.hidden = false;
    return;
  }

  const previous = state.captureFiles.get(key);
  if (previous?.url) URL.revokeObjectURL(previous.url);
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
  button.addEventListener("click", () => showPrintPreview(button.dataset.previewCopy));
});

document.getElementById("closePreview").addEventListener("click", () => {
  previewModal.hidden = true;
});

async function initializeApp() {
  removeLegacySearchMenu();
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
