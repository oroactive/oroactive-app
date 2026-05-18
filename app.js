const state = {
  step: 0,
  signatures: [false, false, false],
  attachments: 0,
  cededItems: 1,
  annualProgressive: 184,
  uploadedCaptures: new Set(),
  lastSearchResults: []
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
const demoActs = [
  {
    name: "Marco",
    surname: "Rossi",
    practiceNumber: "OA-BUSTO-2026-000184",
    date: "15/05/2026",
    store: "Busto Arsizio",
    amount: "860",
    paymentMethod: "Bonifico",
    weight: "18.45",
    materials: [{ metal: "Oro", weight: "18.45" }],
    status: "Bozza"
  },
  {
    name: "Anna",
    surname: "Neri",
    practiceNumber: "OA-BUSTO-2026-000181",
    date: "03/05/2026",
    store: "Busto Arsizio",
    amount: "730",
    paymentMethod: "Bonifico",
    weight: "15.20",
    materials: [{ metal: "Oro", weight: "15.20" }],
    status: "Archiviata"
  },
  {
    name: "Laura",
    surname: "Bianchi",
    practiceNumber: "OA-CASSANO-2026-000183",
    date: "15/05/2026",
    store: "Cassano Magnago",
    amount: "1240",
    paymentMethod: "Assegno",
    weight: "27.30",
    materials: [{ metal: "Argento", weight: "27.30" }],
    status: "Archiviata"
  },
  {
    name: "Paolo",
    surname: "Gallo",
    practiceNumber: "OA-CASSANO-2026-000180",
    date: "28/04/2026",
    store: "Cassano Magnago",
    amount: "410",
    paymentMethod: "Contanti nei limiti di legge",
    weight: "8.40",
    materials: [{ metal: "Oro", weight: "8.40" }],
    status: "Archiviata"
  },
  {
    name: "Gianni",
    surname: "Verdi",
    practiceNumber: "OA-LEGNANO-2026-000182",
    date: "14/05/2026",
    store: "Legnano",
    amount: "520",
    paymentMethod: "Contanti nei limiti di legge",
    weight: "11.80",
    materials: [{ metal: "Platino", weight: "11.80" }],
    status: "Archiviata"
  },
  {
    name: "Sara",
    surname: "Costa",
    practiceNumber: "OA-LEGNANO-2026-000179",
    date: "02/04/2026",
    store: "Legnano",
    amount: "980",
    paymentMethod: "Assegno",
    weight: "21.10",
    materials: [{ metal: "Oro", weight: "14.60" }, { metal: "Argento", weight: "6.50" }],
    status: "Archiviata"
  }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setScreen(id) {
  const leavingSearch = document.getElementById("searchActs")?.classList.contains("active-screen") && id !== "searchActs";
  if (leavingSearch) clearActSearch();
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

function enterSectionFromMainMenu(section) {
  mainMenuScreen.hidden = true;
  setScreen(section);
}

function returnToMainMenu() {
  closeBrandMenu();
  clearActSearch();
  mainMenuScreen.hidden = false;
}

function renderSearchResults(results) {
  const container = document.getElementById("searchResults");
  if (!results.length) {
    container.innerHTML = '<div class="empty-state">Nessun atto di vendita trovato per la ricerca inserita.</div>';
    return;
  }

  container.innerHTML = `
    <div class="archive-table search-table">
      <div class="table-row head"><span>Atto</span><span>Cliente</span><span>Negozio</span><span>Data</span><span>Importo</span><span>Pagamento</span><span>Azioni</span></div>
      ${results.map((act) => `
        <div class="table-row">
          <span>${escapeHtml(act.practiceNumber)}</span>
          <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
          <span>${escapeHtml(act.store)}</span>
          <span>${escapeHtml(act.date)}</span>
          <em>${escapeHtml(formatEuro(Number(act.amount)))}</em>
          <span>${escapeHtml(act.paymentMethod)}</span>
          <div class="row-actions">
            <button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>
            <button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function dateParts(date) {
  const [day, month, year] = date.split("/");
  const dateObject = new Date(Number(year), Number(month) - 1, Number(day));
  return {
    day,
    monthName: dateObject.toLocaleDateString("it-IT", { month: "long", year: "numeric" })
  };
}

function dateValue(date) {
  const [day, month, year] = date.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

function daysFromPurchase(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - dateValue(date)) / 86400000);
}

function currentActSnapshot(status = "Archiviata") {
  const storeSelect = document.getElementById("storeCode");
  const materials = weightRows()
    .filter((row) => Number(row.value || 0) > 0)
    .map((row) => ({ metal: row.metal, weight: row.value }));
  const totalWeight = materials.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  return {
    name: fieldValue('[name="nome"]'),
    surname: fieldValue('[name="cognome"]'),
    practiceNumber: fieldValue("#practiceNumber"),
    date: fieldValue("#practiceDate"),
    time: fieldValue("#practiceTime"),
    store: storeSelect?.selectedOptions[0]?.textContent || "",
    amount: fieldValue("#saleTotal"),
    paymentMethod: fieldValue("#paymentMethod"),
    weight: totalWeight.toFixed(2),
    materials,
    status
  };
}

function renderArchiveGroups() {
  const selectedStore = document.getElementById("archiveStoreFilter")?.value || "Busto Arsizio";
  const container = document.getElementById("archiveGroups");
  if (!container) return;

  const acts = demoActs
    .filter((act) => act.store === selectedStore)
    .sort((first, second) => dateValue(second.date) - dateValue(first.date));
  if (!acts.length) {
    container.innerHTML = '<div class="empty-state">Nessun atto registrato per il negozio selezionato.</div>';
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
      ${Object.entries(days).map(([day, dayActs]) => `
        <div class="archive-day">
          <h4>Giorno ${escapeHtml(day)}</h4>
          <div class="archive-table">
            <div class="table-row head"><span>Pratica</span><span>Cliente</span><span>Data</span><span>Stato</span><span>Azioni</span></div>
            ${dayActs.map((act) => `
              <div class="table-row">
                <span>${escapeHtml(act.practiceNumber)}</span>
                <strong>${escapeHtml(act.name)} ${escapeHtml(act.surname)}</strong>
                <span>${escapeHtml(act.date)}</span>
                <em class="${act.status === "Archiviata" ? "done" : ""}">${escapeHtml(act.status)}</em>
                <div class="row-actions">
                  <button type="button" data-open-act="${escapeHtml(act.practiceNumber)}">Apri</button>
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
      <em>${escapeHtml(act.status)}</em>
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
  const field = document.getElementById("searchField").value;
  const keyword = document.getElementById("searchKeyword").value.trim().toLowerCase();
  const results = keyword
    ? demoActs.filter((act) => String(act[field]).toLowerCase().includes(keyword))
    : state.lastSearchResults;

  if (!results.length) {
    showToast("Cerca prima gli atti del giorno da esportare.");
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

function openArchivedAct(practiceNumber) {
  const act = demoActs.find((item) => item.practiceNumber === practiceNumber);
  if (!act) {
    showToast("Atto di vendita non trovato.");
    return;
  }

  previewTitle.textContent = `Atto di vendita ${act.practiceNumber}`;
  previewBody.innerHTML = `
    <div class="readonly-actions">
      <button class="danger-button" type="button" data-delete-act="${escapeHtml(act.practiceNumber)}">Elimina atto</button>
    </div>
    ${act.readOnlyHtml || buildArchivedActFallback(act)}
  `;
  previewModal.hidden = false;
}

function deleteAct(practiceNumber) {
  const index = demoActs.findIndex((act) => act.practiceNumber === practiceNumber);
  if (index < 0) {
    showToast("Atto di vendita non trovato.");
    return;
  }

  const confirmed = window.confirm(`Vuoi eliminare definitivamente l'atto ${practiceNumber}?`);
  if (!confirmed) return;

  demoActs.splice(index, 1);
  state.lastSearchResults = state.lastSearchResults.filter((act) => act.practiceNumber !== practiceNumber);
  renderArchiveGroups();
  renderFusionGroups();

  const searchActive = document.getElementById("searchActs")?.classList.contains("active-screen");
  const keyword = document.getElementById("searchKeyword")?.value.trim();
  if (searchActive && keyword) {
    runActSearch();
  } else if (searchActive) {
    renderSearchResults(state.lastSearchResults);
  }

  if (!previewModal.hidden) previewModal.hidden = true;
  showToast(`Atto ${practiceNumber} eliminato.`);
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
  const results = document.getElementById("searchResults");
  if (keyword) keyword.value = "";
  if (results) results.innerHTML = "";
  state.lastSearchResults = [];
}

function runActSearch() {
  const field = document.getElementById("searchField").value;
  const keyword = document.getElementById("searchKeyword").value.trim().toLowerCase();
  if (!keyword) {
    showToast("Inserisci una parola chiave da ricercare.");
    return;
  }

  const results = demoActs.filter((act) => String(act[field]).toLowerCase().includes(keyword));
  state.lastSearchResults = results;
  renderSearchResults(results);
}

function renderStep() {
  steps.forEach((step, index) => step.classList.toggle("active", index === state.step));
  panels.forEach((panel, index) => panel.classList.toggle("active-step", index === state.step));
  document.getElementById("previousStep").disabled = state.step === 0;
  document.getElementById("nextStep").textContent = state.step === 4 ? "Completa pratica" : "Avanti";
}

function updateSignatureState() {
  const signed = state.signatures.filter(Boolean).length;
  const status = document.getElementById("signatureStatus");
  status.textContent = signed === 3 ? "Firme complete" : `${3 - signed} firme mancanti`;
  status.classList.toggle("success", signed === 3);
  status.classList.toggle("warning", signed !== 3);
  document.getElementById("summarySignatures").textContent = signed === 3 ? "3 di 3 complete" : `${signed} di 3 complete`;
  document.querySelectorAll(".checklist input")[2].checked = signed === 3;
}

function updateAttachmentState() {
  const required = requiredCaptureKeys();
  const uploadedRequired = required.filter((key) => state.uploadedCaptures.has(key)).length;
  document.getElementById("summaryAttachments").textContent = `${uploadedRequired} di ${required.length} caricati`;
  document.querySelectorAll(".checklist input")[3].checked = required.slice(0, 4).every((key) => state.uploadedCaptures.has(key));
  document.querySelectorAll(".checklist input")[4].checked = required.slice(4).every((key) => state.uploadedCaptures.has(key));
}

function selectedPaymentMethod() {
  return fieldValue("#paymentMethod");
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
    </label>
  `;
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
}

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function setPracticeMeta() {
  const now = new Date();
  document.getElementById("practiceDate").value = now.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  document.getElementById("practiceTime").value = now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  });
  updatePracticeNumber();
}

function updatePracticeNumber() {
  const year = new Date().getFullYear();
  const storeSelect = document.getElementById("storeCode");
  const storeCode = storeSelect?.value || "NEGOZIO";
  const progressive = String(state.annualProgressive).padStart(6, "0");
  const practiceNumber = `OA-${storeCode}-${year}-${progressive}`;
  document.getElementById("practiceNumber").value = practiceNumber;
  document.getElementById("sidePracticeNumber").textContent = practiceNumber;
  document.getElementById("operatorStoreName").textContent = `Negozio ${storeSelect?.selectedOptions[0]?.textContent || ""}`;
}

function updateSaleTotal() {
  const total = Number(document.getElementById("saleTotal").value);
  document.getElementById("summaryTotal").textContent = formatEuro(Number.isFinite(total) ? total : 0);
}

function updateCededItems() {
  const rows = document.querySelectorAll(".ceded-item-row");

  rows.forEach((row, index) => {
    row.querySelector(".row-number").textContent = index + 1;
    const removeButton = row.querySelector(".remove-row");
    removeButton.disabled = rows.length === 1;
  });

  state.cededItems = rows.length;
  document.getElementById("summaryItems").textContent = `${rows.length} ${rows.length === 1 ? "prezioso registrato" : "preziosi registrati"}`;
  renderWeightFields();
  renderPreciousCaptureCards();
  updateAttachmentState();
}

function updateTitleOptions(row) {
  const selects = row.querySelectorAll("select");
  const metalSelect = selects[0];
  const titleSelect = selects[1];
  if (!metalSelect || !titleSelect) return;

  const options = titleOptionsByMetal[metalSelect.value] || titleOptionsByMetal.Oro;
  titleSelect.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
  if (metalSelect.value === "Oro") titleSelect.value = "18 kt";
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
  const saleTotal = Number(fieldValue("#saleTotal"));
  if (!hasValue("#paymentMethod")) missing.push("Metodo pagamento");
  if (!Number.isFinite(saleTotal) || saleTotal <= 0) missing.push("Totale corrisposto");

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
  const metals = new Set([...document.querySelectorAll(".ceded-item-row select")].map((select) => select.value));
  return metalOrder.filter((metal) => metals.has(metal));
}

function requiredCaptureKeys() {
  const documentSlug = currentDocumentSlug();
  const documentKeys = [`documento-fronte-${documentSlug}`, `documento-retro-${documentSlug}`, "codice-fiscale-fronte", "codice-fiscale-retro"];
  const preciousKeys = activeMetals().flatMap((metal) => [
    `preziosi-${metal.toLowerCase()}-fronte`,
    `preziosi-${metal.toLowerCase()}-laterale`
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

function renderPreciousCaptureCards() {
  const grid = document.getElementById("preciousCaptureGrid");
  if (!grid) return;

  grid.innerHTML = activeMetals().map((metal) => [
    { side: "fronte", label: "Foto frontale" },
    { side: "laterale", label: "Foto laterale" }
  ].map((photo) => {
    const key = `preziosi-${metal.toLowerCase()}-${photo.side}`;
    const loaded = state.uploadedCaptures.has(key);
    return `
      <label class="capture-card ${captureClassForMetal(metal)} ${loaded ? "loaded" : ""}" data-capture-key="${key}">
        <input type="file" accept="image/*" capture="environment">
        <span>Preziosi ${metal}</span>
        <strong>${photo.label} ${metal.toLowerCase()}</strong>
        <em>${loaded ? "Foto acquisita" : "Tocca per fotografare"}</em>
      </label>
    `;
  }).join("")).join("");
}

function renderWeightFields() {
  const container = document.getElementById("totalWeightFields");
  if (!container) return;

  const previousValues = {};
  container.querySelectorAll("input[data-metal-weight]").forEach((input) => {
    previousValues[input.dataset.metalWeight] = input.value;
  });

  container.innerHTML = activeMetals().map((metal) => `
    <label>Peso totale ${metal.toLowerCase()} in grammi
      <input data-metal-weight="${metal}" type="number" value="${escapeHtml(previousValues[metal] || (metal === "Oro" ? "18.45" : "0"))}" min="0" step="0.01">
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
  const rows = weightRows().map((row) => `<li>${escapeHtml(row.metal)}: ${escapeHtml(row.value)} g</li>`).join("");
  return `
    <div class="print-internal">
      <span>${label}</span>
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

function buildPrintCopy(title, weightLabel, scope) {
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

  const internalWeight = weightLabel ? buildWeightBlock(weightLabel) : "";
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
        <div class="print-field"><span>Note operatore</span>${escapeHtml(document.querySelector(".textarea-label textarea")?.value || "")}</div>
      </div>

      <h2>Oggetti ceduti</h2>
      <div class="print-items">${items}</div>
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
    buildPrintCopy("Copia cliente", shouldPrintWeightOnCustomerCopy() ? "Peso totale autorizzato su copia cliente" : "", "customer"),
    buildPrintCopy("Copia aziendale interna", "Dato interno aziendale", "company")
  ].join("");
}

function showPrintPreview(scope) {
  renderPaymentCaptureCard();
  const isCompany = scope === "company";
  const missing = validatePrintScope(scope);
  if (missing.length) {
    showToast(validationMessage(missing, isCompany ? "la copia aziendale" : "la copia cliente"));
    return;
  }
  const html = buildPrintCopy(
    isCompany ? "Copia aziendale interna" : "Copia cliente",
    isCompany ? "Dato interno aziendale" : (shouldPrintWeightOnCustomerCopy() ? "Peso totale autorizzato su copia cliente" : ""),
    scope
  );
  previewTitle.textContent = `Anteprima ${isCompany ? "copia aziendale interna" : "copia cliente"}`;
  previewBody.innerHTML = html;
  previewModal.hidden = false;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setScreen(item.dataset.section));
});

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
  button.addEventListener("click", () => {
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

document.getElementById("nextStep").addEventListener("click", () => {
  if (state.step === 2 && state.signatures.some((signed) => !signed)) {
    showToast("Prima di procedere servono tutte e tre le firme del cliente.");
    return;
  }
  if (state.step < 4) {
    state.step += 1;
    renderStep();
  } else {
    showToast("Pratica archiviata nella cartella digitale.");
  }
});

document.getElementById("previousStep").addEventListener("click", () => {
  if (state.step > 0) {
    state.step -= 1;
    renderStep();
  }
});

document.getElementById("saveDraft").addEventListener("click", () => {
  showToast("Bozza salvata automaticamente.");
});

document.getElementById("printPractice").addEventListener("click", () => {
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "le copie cliente e aziendale"));
    return;
  }
  preparePrintPacket();
  window.print();
});

document.getElementById("archivePractice").addEventListener("click", () => {
  const missing = validatePrintScope("company");
  if (missing.length) {
    showToast(validationMessage(missing, "la copia aziendale"));
    return;
  }
  const archivedAct = currentActSnapshot("Archiviata");
  archivedAct.readOnlyHtml = buildPrintCopy("Atto archiviato - Sola lettura", "Dato interno aziendale", "company");
  const existingIndex = demoActs.findIndex((act) => act.practiceNumber === archivedAct.practiceNumber);
  if (existingIndex >= 0) {
    demoActs[existingIndex] = archivedAct;
  } else {
    demoActs.unshift(archivedAct);
  }
  renderArchiveGroups();
  renderFusionGroups();
  showToast("Atto di vendita salvato e archiviato.");
});

document.getElementById("addCededItem").addEventListener("click", () => {
  const row = document.createElement("article");
  row.className = "ceded-item-row";
  row.innerHTML = `
    <strong class="row-number">1</strong>
    <label>Descrizione oggetto <input value=""></label>
    <label>Metallo
      <select>
        <option>Oro</option>
        <option>Argento</option>
        <option>Platino</option>
      </select>
    </label>
    <label>Titolo
      <select>
        <option>24 kt</option>
        <option>22 kt</option>
        <option>21 kt</option>
        <option selected>18 kt</option>
        <option>14 kt</option>
        <option>12 kt</option>
        <option>9 kt</option>
        <option>6 kt</option>
      </select>
    </label>
    <button class="remove-row" type="button" aria-label="Rimuovi riga">-</button>
  `;
  document.getElementById("cededItemsTable").appendChild(row);
  updateTitleOptions(row);
  updateCededItems();
  showToast("Nuova riga oggetto aggiunta alla scheda cliente.");
});

document.getElementById("cededItemsTable").addEventListener("input", (event) => {
  if (event.target.matches('input[type="number"]')) updateCededItems();
});

document.getElementById("cededItemsTable").addEventListener("change", (event) => {
  const row = event.target.closest(".ceded-item-row");
  if (!row || !event.target.matches("select")) return;
  const selects = row.querySelectorAll("select");
  if (event.target === selects[0]) {
    updateTitleOptions(row);
    renderWeightFields();
    renderPreciousCaptureCards();
    updateAttachmentState();
  }
});

document.getElementById("saleTotal").addEventListener("input", updateSaleTotal);

document.getElementById("paymentMethod").addEventListener("change", () => {
  renderPaymentCaptureCard();
  updateAttachmentState();
});

document.getElementById("storeCode").addEventListener("change", updatePracticeNumber);

document.getElementById("archiveStoreFilter").addEventListener("change", renderArchiveGroups);

document.getElementById("archiveGroups").addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-act]");
  if (deleteButton) {
    deleteAct(deleteButton.dataset.deleteAct);
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
  const openButton = event.target.closest("[data-open-act]");
  if (!openButton) return;
  openArchivedAct(openButton.dataset.openAct);
});

document.getElementById("searchResults").addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-act]");
  if (deleteButton) {
    deleteAct(deleteButton.dataset.deleteAct);
    return;
  }
  const openButton = event.target.closest("[data-open-act]");
  if (!openButton) return;
  openArchivedAct(openButton.dataset.openAct);
});

previewBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-act]");
  if (!deleteButton) return;
  deleteAct(deleteButton.dataset.deleteAct);
});

document.getElementById("exportDailyPdf").addEventListener("click", exportDailySearchPdf);

document.getElementById("documentType").addEventListener("change", () => {
  updateDocumentCaptureCards();
  updateAttachmentState();
});

document.getElementById("runActSearch").addEventListener("click", runActSearch);

document.getElementById("searchKeyword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runActSearch();
});

document.getElementById("cededItemsTable").addEventListener("click", (event) => {
  if (!event.target.classList.contains("remove-row") || event.target.disabled) return;
  event.target.closest(".ceded-item-row").remove();
  updateCededItems();
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
  state.uploadedCaptures.add(key);
  state.attachments = state.uploadedCaptures.size;
  card.classList.add("loaded");
  card.querySelector("em").textContent = "Foto acquisita";
  updateAttachmentState();
});

document.querySelectorAll("[data-preview-copy]").forEach((button) => {
  button.addEventListener("click", () => showPrintPreview(button.dataset.previewCopy));
});

document.getElementById("closePreview").addEventListener("click", () => {
  previewModal.hidden = true;
});

renderStep();
setPracticeMeta();
updateSignatureState();
updateDocumentCaptureCards();
updateAttachmentState();
updateCededItems();
updateSaleTotal();
renderPaymentCaptureCard();
document.querySelectorAll(".ceded-item-row").forEach(updateTitleOptions);
renderArchiveGroups();
renderFusionGroups();
