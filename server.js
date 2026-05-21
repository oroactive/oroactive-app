import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);
const actsTable = "atti_vendita";
const CASH_PAYMENT_LIMIT = 499.99;
const ACT_LIST_LIMIT = 50;
const jwtSecret = process.env.JWT_SECRET || "cambia-questa-chiave-jwt-oroactive";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
const bullionVaultMarketUrl = process.env.BULLIONVAULT_MARKET_URL || "https://www.bullionvault.com/view_market_xml.do";
const bullionVaultMarkets = {
  Oro: { securityId: "AUXZU", source: "Zurigo" },
  Argento: { securityId: "AGXZU", source: "Zurigo" },
  Platino: { securityId: "PTXLN", source: "Londra" }
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "250mb" }));

function storeCodeFromName(storeName) {
  return {
    "Busto Arsizio": "BUSTO",
    "Cassano Magnago": "CASSANO",
    Legnano: "LEGNANO"
  }[storeName] || "BUSTO";
}

function storeNameFromCode(storeCode) {
  return {
    BUSTO: "Busto Arsizio",
    CASSANO: "Cassano Magnago",
    LEGNANO: "Legnano"
  }[storeCode] || "Busto Arsizio";
}

function publicUser(row) {
  if (!row) return null;
  const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
  const online = Boolean(lastSeen && Date.now() - lastSeen.getTime() < 2 * 60 * 1000);
  return {
    id: row.id,
    nome: row.nome,
    cognome: row.cognome,
    username: row.username,
    email: row.email,
    ruolo: normalizeRole(row.ruolo),
    negozio: roleSeesAllStores(row.ruolo) ? "Tutti" : row.negozio,
    hasFaceId: Boolean(row.face_id_credential),
    data_creazione: row.data_creazione,
    last_seen: row.last_seen,
    online,
    stato_connessione: online ? "Online" : "Offline"
  };
}

function normalizeRole(role = "commesso") {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "founder") return "founder";
  if (normalized === "admin") return "responsabile";
  if (normalized === "responsabile") return "responsabile";
  if (normalized === "aiuto_commesso" || normalized === "aiuto commesso" || normalized === "aiuto_commessa" || normalized === "aiuto commessa") {
    return "aiuto_commesso";
  }
  if (normalized === "commesso" || normalized === "operatore" || normalized === "utente" || normalized === "user") {
    return "commesso";
  }
  if (normalized === "commessa") return "commesso";
  return "commesso";
}

function roleSeesAllStores(role) {
  return ["founder", "responsabile", "commesso"].includes(normalizeRole(role));
}

function canManageAccess(user) {
  return ["founder", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function managedRolesForActor(actor) {
  const role = normalizeRole(actor?.ruolo);
  if (role === "founder") return ["aiuto_commesso", "commesso", "responsabile"];
  if (role === "responsabile") return ["aiuto_commesso", "commesso"];
  return [];
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      ruolo: normalizeRole(user.ruolo),
      negozio: user.negozio
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function findUserById(id) {
  const result = await pool.query(
    "SELECT id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen FROM utenti WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

async function authenticate(request, response, next) {
  try {
    const header = request.headers.authorization || "";
    const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];
    if (!token) return response.status(401).json({ error: "Accesso non autenticato" });

    const decoded = jwt.verify(token, jwtSecret);
    const user = await findUserById(decoded.sub);
    if (!user) return response.status(401).json({ error: "Utente non trovato" });
    await pool.query("UPDATE utenti SET last_seen = NOW() WHERE id = $1", [user.id]);
    user.last_seen = new Date();
    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Sessione scaduta o non valida" });
  }
}

function requireAdmin(request, response, next) {
  if (!canManageAccess(request.user)) {
    return response.status(403).json({ error: "Operazione riservata a Founder o Responsabile" });
  }
  next();
}

function parsePracticeNumber(practiceNumber = "") {
  const match = String(practiceNumber).match(/^OA-([^-]+)-(\d{4})-(\d+)$/);
  if (!match) return null;
  return {
    storeCode: match[1],
    year: Number(match[2]),
    number: Number(match[3])
  };
}

function actNumberValue(practiceNumber = "") {
  const parsed = parsePracticeNumber(practiceNumber);
  return parsed?.number || 0;
}

function numberFrom(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "Dato non inserito") return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBullionVaultPrices(xml) {
  const buyMatch = xml.match(/<buyPrices>[\s\S]*?<price\b[^>]*\blimit="([^"]+)"/i);
  const sellMatch = xml.match(/<sellPrices>[\s\S]*?<price\b[^>]*\blimit="([^"]+)"/i);
  const buy = buyMatch ? Number(buyMatch[1]) : null;
  const sell = sellMatch ? Number(sellMatch[1]) : null;
  const validPrices = [buy, sell].filter((value) => Number.isFinite(value) && value > 0);
  if (!validPrices.length) return null;
  const value = validPrices.length === 2 ? (validPrices[0] + validPrices[1]) / 2 : validPrices[0];
  return { value, buy, sell };
}

async function fetchBullionVaultPrice(metal, market) {
  const url = new URL(bullionVaultMarketUrl);
  url.searchParams.set("considerationCurrency", "EUR");
  url.searchParams.set("securityId", market.securityId);
  url.searchParams.set("quantity", "0.001");
  url.searchParams.set("marketWidth", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/xml,text/xml,*/*" }
    });
    if (!response.ok) throw new Error(`BullionVault HTTP ${response.status}`);
    const xml = await response.text();
    const prices = parseBullionVaultPrices(xml);
    if (!prices) throw new Error("Prezzo BullionVault non disponibile");
    return {
      metal,
      securityId: market.securityId,
      currency: "EUR",
      unit: "KG",
      source: market.source,
      fetchedAt: new Date().toISOString(),
      ...prices
    };
  } finally {
    clearTimeout(timeout);
  }
}

function materialWeight(input, metalName) {
  const row = Array.isArray(input.materials) ? input.materials.find((material) => material.metal === metalName) : null;
  return numberFrom(row?.weight);
}

function quoteValue(input, metalName) {
  const row = Array.isArray(input.bullionQuotes)
    ? input.bullionQuotes.find((quote) => quote.metal === metalName)
    : null;
  if (row) return numberFrom(row.value);
  const firstQuote = Array.isArray(input.bullionQuotes) ? input.bullionQuotes[0] : null;
  return numberFrom(firstQuote?.value ?? input.quotazione ?? input.quote);
}

function dateText(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeWorkflowStatus(status = "Archiviata") {
  if (typeof status !== "string") return "Archiviata";
  const normalized = status.trim().toLowerCase();
  if (normalized === "completato" || normalized === "completata") return "Completato";
  if (normalized === "archiviato" || normalized === "archiviata") return "Archiviata";
  return "Archiviata";
}

function normalizeFiscalCode(value = "") {
  return String(value || "").trim().toUpperCase();
}

function isCompletedAct(rowOrAct = {}) {
  return normalizeWorkflowStatus(rowOrAct.status || rowOrAct.payload?.status) === "Completato";
}

function isValidIban(value = "") {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(String(value || "").replace(/\s+/g, ""));
}

function normalizeAct(input = {}, existing = null) {
  const practiceNumber = input.practiceNumber || existing?.practice_number || "";
  const parsed = parsePracticeNumber(practiceNumber);
  if (!parsed) {
    const error = new Error("Numero atto non valido. Usa formato OA-NEGOZIO-ANNO-NUMERO.");
    error.status = 400;
    throw error;
  }

  const payload = { ...(existing?.payload || {}), ...input, practiceNumber };
  const actDate = input.date || input.data_atto || existing?.data_atto || null;
  const oroWeight = materialWeight(payload, "Oro") || numberFrom(input.peso_oro ?? existing?.peso_oro);
  const totale = numberFrom(input.amount ?? input.totale ?? existing?.totale);
  const paymentMethod = input.paymentMethod || existing?.payment_method || "";
  if (String(paymentMethod).toLowerCase().includes("contanti") && totale > CASH_PAYMENT_LIMIT) {
    const error = new Error("Il pagamento in contanti non puo superare 499,99 euro. Seleziona Bonifico o Assegno come pagamento a norma di legge.");
    error.status = 400;
    throw error;
  }
  const iban = String(input.iban ?? payload.iban ?? existing?.iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (String(paymentMethod).toLowerCase().includes("bonifico") && iban && !isValidIban(iban)) {
    const error = new Error("IBAN non valido. Controlla il formato prima di salvare.");
    error.status = 400;
    throw error;
  }

  return {
    id: input.id || existing?.id || null,
    practiceNumber,
    store: input.store || existing?.store || "",
    storeCode: parsed.storeCode,
    actYear: parsed.year,
    actNumber: parsed.number,
    dataAtto: actDate,
    clienteNome: input.name ?? input.cliente_nome ?? existing?.cliente_nome ?? "",
    clienteCognome: input.surname ?? input.cliente_cognome ?? existing?.cliente_cognome ?? "",
    codiceFiscale: input.fiscalCode ?? input.codice_fiscale ?? existing?.codice_fiscale ?? "",
    telefono: input.phone ?? input.telefono ?? existing?.telefono ?? "",
    pesoOro: oroWeight,
    quotazione: quoteValue(payload, "Oro") || numberFrom(existing?.quotazione),
    totale,
    paymentMethod,
    iban,
    status: normalizeWorkflowStatus(input.status || existing?.status || "Archiviata"),
    payload
  };
}

function compactActPayload(payload = {}) {
  const {
    captureAttachments,
    signatureImages,
    readOnlyHtml,
    lastActCaptureAttachments,
    ...compact
  } = payload;
  return compact;
}

function rowToAct(row, options = {}) {
  const payload = options.full === false ? compactActPayload(row.payload || {}) : (row.payload || {});
  return {
    ...payload,
    id: row.id,
    practiceNumber: row.practice_number || payload.practiceNumber,
    store: row.store || payload.store || "",
    date: payload.date || dateText(row.data_atto),
    name: row.cliente_nome || payload.name || "",
    surname: row.cliente_cognome || payload.surname || "",
    fiscalCode: row.codice_fiscale || payload.fiscalCode || "",
    phone: row.telefono || payload.phone || "",
    iban: row.iban || payload.iban || "",
    weight: payload.weight ?? row.peso_oro,
    amount: payload.amount ?? row.totale,
    paymentMethod: row.payment_method || payload.paymentMethod || "",
    status: normalizeWorkflowStatus(row.status || payload.status || "Archiviata")
  };
}

async function initDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await bootstrapAdminUser();
}

async function bootstrapAdminUser() {
  const username = process.env.ADMIN_USERNAME || "Elite";
  const email = process.env.ADMIN_EMAIL || "elite@oroactive.it";
  const password = process.env.ADMIN_PASSWORD || "Snoopdoggydogg.8";
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await pool.query(
    "SELECT id FROM utenti WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1",
    [username, email]
  );

  if (existing.rowCount) {
    await pool.query(
      `UPDATE utenti SET
        nome = $2,
        cognome = $3,
        username = $4,
        email = LOWER($5),
        password_hash = $6,
        ruolo = 'founder',
        negozio = $7
       WHERE id = $1`,
      [
        existing.rows[0].id,
        process.env.ADMIN_NOME || "Elite",
        process.env.ADMIN_COGNOME || "Founder",
        username,
        email,
        passwordHash,
        "Tutti"
      ]
    );
    return;
  }

  await pool.query(
    `INSERT INTO utenti (nome, cognome, username, email, password_hash, ruolo, negozio)
     VALUES ($1, $2, $3, LOWER($4), $5, 'founder', $6)`,
    [
      process.env.ADMIN_NOME || "Elite",
      process.env.ADMIN_COGNOME || "Founder",
      username,
      email,
      passwordHash,
      "Tutti"
    ]
  );
}

function buildActsQuery({ store, field, q, fusionEligible } = {}, user = null) {
  const where = [];
  const values = [];

  const effectiveStore = roleSeesAllStores(user?.ruolo) ? store : user?.negozio;
  if (effectiveStore && effectiveStore !== "Tutti") {
    values.push(effectiveStore);
    where.push(`store = $${values.length}`);
  }

  if (q && field) {
    const allowedFields = {
      name: "cliente_nome",
      surname: "cliente_cognome",
      fiscalCode: "codice_fiscale",
      phone: "telefono",
      practiceNumber: "practice_number",
      date: "data_atto::text",
      store: "store",
      amount: "totale::text",
      paymentMethod: "payment_method",
      weight: "peso_oro::text"
    };
    const column = allowedFields[field];
    if (column) {
      values.push(`%${String(q).toLowerCase()}%`);
      where.push(`LOWER(${column}) LIKE $${values.length}`);
    }
  } else if (q) {
    values.push(`%${String(q).toLowerCase()}%`);
    const parameter = `$${values.length}`;
    where.push(`(
      LOWER(COALESCE(practice_number, '')) LIKE ${parameter}
      OR LOWER(COALESCE(cliente_nome, '')) LIKE ${parameter}
      OR LOWER(COALESCE(cliente_cognome, '')) LIKE ${parameter}
      OR LOWER(COALESCE(codice_fiscale, '')) LIKE ${parameter}
      OR LOWER(COALESCE(telefono, '')) LIKE ${parameter}
      OR LOWER(COALESCE(store, '')) LIKE ${parameter}
      OR LOWER(COALESCE(payment_method, '')) LIKE ${parameter}
      OR LOWER(COALESCE(data_atto::text, '')) LIKE ${parameter}
      OR LOWER(COALESCE(totale::text, '')) LIKE ${parameter}
      OR LOWER(COALESCE(peso_oro::text, '')) LIKE ${parameter}
      OR LOWER(COALESCE(payload::text, '')) LIKE ${parameter}
    )`);
  }

  if (fusionEligible === "true") {
    where.push("data_atto <= CURRENT_DATE - INTERVAL '10 days'");
  }

  return { where, values };
}

function queryLimit(value) {
  const parsed = Number(value || ACT_LIST_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return ACT_LIST_LIMIT;
  return Math.min(parsed, ACT_LIST_LIMIT);
}

function queryOffset(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function listActs(query = {}, user = null) {
  const { where, values } = buildActsQuery(query, user);
  const limit = queryLimit(query.limit);
  const offset = queryOffset(query.offset);
  values.push(limit);
  const limitParameter = `$${values.length}`;
  values.push(offset);
  const offsetParameter = `$${values.length}`;
  const result = await pool.query(
    `SELECT * FROM ${actsTable}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY data_atto DESC NULLS LAST, act_number DESC NULLS LAST, updated_at DESC
     LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
    values
  );
  return result.rows.map((row) => rowToAct(row, { full: false }));
}

async function nextActNumber(storeCode, year) {
  const result = await pool.query(
    `SELECT COALESCE(MAX(act_number), 0) + 1 AS next_number
     FROM ${actsTable}
     WHERE store_code = $1 AND act_year = $2`,
    [storeCode, year]
  );
  return Number(result.rows[0].next_number);
}

function enforceActStore(input, user) {
  if (!user || roleSeesAllStores(user.ruolo)) return input;
  const storeCode = storeCodeFromName(user.negozio);
  const practiceNumber = String(input.practiceNumber || "").replace(/^OA-[^-]+-/, `OA-${storeCode}-`);
  return {
    ...input,
    store: user.negozio,
    storeCode,
    practiceNumber
  };
}

async function findExisting(identifier) {
  const result = await pool.query(`SELECT * FROM ${actsTable} WHERE id::text = $1 OR practice_number = $1 LIMIT 1`, [
    identifier
  ]);
  return result.rowCount ? result.rows[0] : null;
}

async function getAct(identifier) {
  const row = await findExisting(identifier);
  return row ? rowToAct(row) : null;
}

function canAccessAct(row, user) {
  return roleSeesAllStores(user?.ruolo) || row?.store === user?.negozio;
}

function canReviewActs(user) {
  return ["founder", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function actorKey(user = {}) {
  return String(user.username || user.nome || "").trim().toLowerCase();
}

function actOwnerKey(row = {}) {
  const payload = row.payload || {};
  return String(payload.operatorUsername || payload.operatorName || "").trim().toLowerCase();
}

function canEditAct(row, user) {
  if (isCompletedAct(row) && !canReviewActs(user)) return false;
  return canReviewActs(user) || actOwnerKey(row) === actorKey(user);
}

function completedActEditError() {
  const error = new Error("Questo atto è completato. Solo responsabili e founder possono modificarlo.");
  error.status = 403;
  return error;
}

async function upsertClientFromAct(act) {
  const fiscalCode = normalizeFiscalCode(act.codiceFiscale || act.fiscalCode);
  if (!fiscalCode) return null;
  const payload = {
    name: act.clienteNome || act.name || "",
    surname: act.clienteCognome || act.surname || "",
    birthDate: act.payload?.birthDate || act.birthDate || "",
    birthPlace: act.payload?.birthPlace || act.birthPlace || "",
    birthProvince: act.payload?.birthProvince || act.birthProvince || "",
    sex: act.payload?.sex || act.sex || "",
    address: act.payload?.address || act.address || "",
    residenceProvince: act.payload?.residenceProvince || act.residenceProvince || "",
    documentType: act.payload?.documentType || act.documentType || "",
    documentNumber: act.payload?.documentNumber || act.documentNumber || "",
    documentIssueDate: act.payload?.documentIssueDate || act.documentIssueDate || "",
    documentExpiry: act.payload?.documentExpiry || act.documentExpiry || "",
    fiscalDocumentAttachments: (act.payload?.captureAttachments || act.captureAttachments || []).filter((attachment) => (
      String(attachment.key || "").startsWith("documento-") || String(attachment.key || "").startsWith("codice-fiscale-")
    )),
    paymentMethod: act.payload?.paymentMethod || act.paymentMethod || ""
  };
  const values = [
    fiscalCode,
    act.clienteNome || act.name || "",
    act.clienteCognome || act.surname || "",
    act.telefono || act.phone || "",
    act.payload?.email || act.email || "",
    act.iban || act.payload?.iban || "",
    payload
  ];
  const existing = await pool.query("SELECT id FROM clienti WHERE UPPER(codice_fiscale) = $1 LIMIT 1", [fiscalCode]);
  const result = existing.rowCount
    ? await pool.query(
      `UPDATE clienti SET
        nome = COALESCE(NULLIF($2, ''), nome),
        cognome = COALESCE(NULLIF($3, ''), cognome),
        telefono = COALESCE(NULLIF($4, ''), telefono),
        email = COALESCE(NULLIF($5, ''), email),
        iban = COALESCE(NULLIF($6, ''), iban),
        payload = COALESCE(payload, '{}'::jsonb) || COALESCE($7::jsonb, '{}'::jsonb),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [...values, existing.rows[0].id]
    )
    : await pool.query(
      `INSERT INTO clienti (codice_fiscale, nome, cognome, telefono, email, iban, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      values
    );
  return result.rows[0] || null;
}

async function getClientByFiscalCode(fiscalCode) {
  const normalized = normalizeFiscalCode(fiscalCode);
  if (!normalized) return null;
  const latestActResult = await pool.query(
    `SELECT * FROM ${actsTable}
     WHERE UPPER(codice_fiscale) = $1
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [normalized]
  );
  const latestAct = latestActResult.rowCount ? rowToAct(latestActResult.rows[0]) : null;
  const result = await pool.query(
    "SELECT * FROM clienti WHERE UPPER(codice_fiscale) = $1 LIMIT 1",
    [normalized]
  );
  if (result.rowCount) {
    const row = result.rows[0];
    const savedAttachments = Array.isArray(row.payload?.fiscalDocumentAttachments) ? row.payload.fiscalDocumentAttachments : [];
    const latestAttachments = Array.isArray(latestAct?.captureAttachments)
      ? latestAct.captureAttachments.filter((attachment) => (
        String(attachment.key || "").startsWith("documento-") || String(attachment.key || "").startsWith("codice-fiscale-")
      ))
      : [];
    const mergedPayload = {
      ...(latestAct || {}),
      ...(row.payload || {}),
      fiscalDocumentAttachments: savedAttachments.length ? savedAttachments : latestAttachments,
      paymentMethod: row.payload?.paymentMethod || latestAct?.paymentMethod || "",
      iban: row.iban || row.payload?.iban || latestAct?.iban || ""
    };
    return {
      ...row,
      nome: row.nome || mergedPayload.name || latestAct?.name || "",
      cognome: row.cognome || mergedPayload.surname || latestAct?.surname || "",
      telefono: row.telefono || mergedPayload.phone || latestAct?.phone || "",
      email: row.email || mergedPayload.email || latestAct?.email || "",
      iban: row.iban || mergedPayload.iban || latestAct?.iban || "",
      payload: mergedPayload
    };
  }

  if (!latestAct) return null;
  const client = await upsertClientFromAct({
    ...latestAct,
    clienteNome: latestAct.name,
    clienteCognome: latestAct.surname,
    codiceFiscale: latestAct.fiscalCode,
    telefono: latestAct.phone,
    payload: latestAct
  });
  return client;
}

function publicClient(row) {
  if (!row) return null;
  return {
    ...(row.payload || {}),
    id: row.id,
    fiscalCode: row.codice_fiscale,
    name: row.nome || row.payload?.name || "",
    surname: row.cognome || row.payload?.surname || "",
    phone: row.telefono || "",
    email: row.email || "",
    iban: row.iban || row.payload?.iban || ""
  };
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

function materialLotsFromAct(act = {}) {
  const items = Array.isArray(act.items) ? act.items : [];
  const materials = Array.isArray(act.materials) ? act.materials : [];
  if (!materials.length) return [];
  return materials.flatMap((material) => {
    const metal = material.metal || "Oro";
    const title = material.title || material.caratura || material.titolo;
    if (title) return [{ metal, title, weight: numberFrom(material.weight), act }];
    const titles = [...new Set(items
      .filter((item) => (item.metal || "Oro") === metal)
      .map((item) => item.title || item.titolo || item.caratura)
      .filter(Boolean))];
    const inferredTitle = titles.length === 1 ? titles[0] : titles.length ? `Titoli misti (${titles.join(", ")})` : "Titolo non indicato";
    return [{ metal, title: inferredTitle, weight: numberFrom(material.weight), act }];
  }).filter((lot) => lot.weight > 0);
}

function quoteForMetal(act = {}, metal = "Oro") {
  const quote = Array.isArray(act.bullionQuotes)
    ? act.bullionQuotes.find((row) => row.metal === metal)
    : null;
  return numberFrom(quote?.value || (metal === "Oro" ? act.quotazione : 0));
}

async function stockActs(query = {}, user = null) {
  const { where, values } = buildActsQuery({ store: query.negozio_id || query.store || query.negozio }, user);
  where.push("COALESCE((payload->'fusion'->>'fused')::boolean, false) = false");
  const result = await pool.query(
    `SELECT * FROM ${actsTable}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY data_atto DESC NULLS LAST, act_number DESC NULLS LAST`,
    values
  );
  return result.rows.map((row) => rowToAct(row));
}

function stockSummaryFromActs(acts = []) {
  const grouped = new Map();
  acts.forEach((act) => {
    materialLotsFromAct(act).forEach((lot) => {
      const key = `${act.store}|${lot.metal}|${lot.title}`;
      const current = grouped.get(key) || {
        negozio: act.store,
        metallo: lot.metal,
        titolo: lot.title,
        grammiTotali: 0,
        numeroAtti: 0,
        valoreStimato: 0,
        atti: new Set()
      };
      current.grammiTotali += lot.weight;
      current.atti.add(act.practiceNumber || act.id);
      const quote = quoteForMetal(act, lot.metal);
      if (quote > 0) current.valoreStimato += (lot.weight / 1000) * quote * titlePurity(lot.metal, lot.title);
      grouped.set(key, current);
    });
  });
  return [...grouped.values()].map((row) => ({
    ...row,
    grammiTotali: Number(row.grammiTotali.toFixed(3)),
    numeroAtti: row.atti.size,
    valoreStimato: Number(row.valoreStimato.toFixed(2)),
    atti: [...row.atti]
  })).sort((a, b) => (
    String(a.negozio).localeCompare(String(b.negozio))
    || String(a.metallo).localeCompare(String(b.metallo))
    || String(a.titolo).localeCompare(String(b.titolo))
  ));
}

async function saveAct(input, user) {
  const protectedInput = enforceActStore(input, user);
  const existing = protectedInput.id
    ? await findExisting(protectedInput.id)
    : protectedInput.practiceNumber
      ? await findExisting(protectedInput.practiceNumber)
      : null;
  if (existing && !canAccessAct(existing, user)) {
    const error = new Error("Atto non accessibile per il negozio assegnato");
    error.status = 403;
    throw error;
  }
  if (existing) return updateAct(existing.id, protectedInput, user);
  const act = normalizeAct(protectedInput, existing);
  const result = await pool.query(
    `INSERT INTO ${actsTable} (
      cliente_nome, cliente_cognome, codice_fiscale, telefono,
      peso_oro, quotazione, totale, data_atto,
      practice_number, store, store_code, act_year, act_number,
      payment_method, status, iban, payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [
      act.clienteNome,
      act.clienteCognome,
      act.codiceFiscale,
      act.telefono,
      act.pesoOro,
      act.quotazione,
      act.totale,
      act.dataAtto,
      act.practiceNumber,
      act.store,
      act.storeCode,
      act.actYear,
      act.actNumber,
      act.paymentMethod,
      act.status,
      act.iban,
      act.payload
    ]
  );
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable} SET cliente_id = $2, iban = COALESCE(NULLIF($3, ''), iban) WHERE id = $1 RETURNING *`,
      [result.rows[0].id, client.id, client.iban || act.iban || ""]
    );
    return rowToAct(withClient.rows[0], { full: false });
  }
  return rowToAct(result.rows[0], { full: false });
}

async function updateAct(identifier, input, user) {
  const existing = await findExisting(identifier);
  if (!existing) return null;
  if (!canAccessAct(existing, user)) {
    const error = new Error("Atto non accessibile per il negozio assegnato");
    error.status = 403;
    throw error;
  }
  if (!canEditAct(existing, user)) {
    const error = isCompletedAct(existing)
      ? completedActEditError()
      : new Error("Puoi modificare solo gli atti effettuati da te");
    error.status = 403;
    throw error;
  }
  const act = normalizeAct(enforceActStore(input, user), existing);
  const result = await pool.query(
    `UPDATE ${actsTable} SET
      cliente_nome = $2,
      cliente_cognome = $3,
      codice_fiscale = $4,
      telefono = $5,
      peso_oro = $6,
      quotazione = $7,
      totale = $8,
      data_atto = $9,
      practice_number = $10,
      store = $11,
      store_code = $12,
      act_year = $13,
      act_number = $14,
      payment_method = $15,
      status = $16,
      iban = $17,
      payload = $18,
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      act.clienteNome,
      act.clienteCognome,
      act.codiceFiscale,
      act.telefono,
      act.pesoOro,
      act.quotazione,
      act.totale,
      act.dataAtto,
      act.practiceNumber,
      act.store,
      act.storeCode,
      act.actYear,
      act.actNumber,
      act.paymentMethod,
      act.status,
      act.iban,
      act.payload
    ]
  );
  if (!result.rowCount) return null;
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable} SET cliente_id = $2, iban = COALESCE(NULLIF($3, ''), iban) WHERE id = $1 RETURNING *`,
      [result.rows[0].id, client.id, client.iban || act.iban || ""]
    );
    return rowToAct(withClient.rows[0], { full: false });
  }
  return rowToAct(result.rows[0], { full: false });
}

async function deleteAct(identifier, user) {
  const existing = await findExisting(identifier);
  if (!existing) return false;
  if (!canAccessAct(existing, user)) {
    const error = new Error("Atto non accessibile per il negozio assegnato");
    error.status = 403;
    throw error;
  }
  if (!canReviewActs(user)) {
    const error = new Error("Eliminazione riservata a Responsabile o Elite");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(`DELETE FROM ${actsTable} WHERE id = $1 RETURNING id`, [
    existing.id
  ]);
  return result.rowCount > 0;
}

async function createUser(input, actor) {
  const password = String(input.password || "");
  if (password.length < 8) {
    const error = new Error("La password deve avere almeno 8 caratteri");
    error.status = 400;
    throw error;
  }
  const actorRole = normalizeRole(actor?.ruolo);
  const passwordHash = await bcrypt.hash(password, 12);
  const role = normalizeRole(input.ruolo);
  const allowedRoles = managedRolesForActor(actor);
  const finalRole = allowedRoles.includes(role) ? role : allowedRoles.at(-1) || "commesso";
  const finalStore = roleSeesAllStores(finalRole) ? "Tutti" : input.negozio || "Busto Arsizio";
  const username = String(input.username || "").trim();
  const generatedEmail = `${username || `utente-${Date.now()}`}@oroactive.local`;
  const result = await pool.query(
    `INSERT INTO utenti (nome, cognome, username, email, password_hash, ruolo, negozio)
     VALUES ($1, $2, NULLIF($3, ''), LOWER($4), $5, $6, $7)
     RETURNING id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen`,
    [
      input.nome || "",
      input.cognome || "",
      username,
      generatedEmail,
      passwordHash,
      finalRole,
      finalStore
    ]
  );
  return publicUser(result.rows[0]);
}

async function findUserRawById(id) {
  const result = await pool.query("SELECT * FROM utenti WHERE id = $1", [id]);
  return result.rows[0] || null;
}

function assertCanManageTarget(actor, target, requestedRole = target?.ruolo) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(target?.ruolo);
  if (targetRole === "founder") {
    const error = new Error("Il Founder non puo essere modificato o revocato");
    error.status = 403;
    throw error;
  }
  const allowedRoles = managedRolesForActor(actor);
  if (allowedRoles.includes(targetRole) && allowedRoles.includes(normalizeRole(requestedRole))) return;
  const error = new Error("Permesso non consentito per questo utente");
  error.status = 403;
  throw error;
}

async function updateUser(id, input, actor) {
  const target = await findUserRawById(id);
  if (!target) return null;
  assertCanManageTarget(actor, target, input.ruolo || target.ruolo);
  const fields = [];
  const values = [];
  const allowed = ["nome", "cognome", "username", "ruolo", "negozio"];
  allowed.forEach((field) => {
    if (input[field] === undefined) return;
    let value = input[field];
    if (field === "ruolo") value = normalizeRole(value);
    if (field === "negozio" && roleSeesAllStores(input.ruolo || target.ruolo)) value = "Tutti";
    values.push(field === "username" && !value ? null : value);
    fields.push(`${field} = $${values.length}`);
  });

  if (input.password) {
    values.push(await bcrypt.hash(String(input.password), 12));
    fields.push(`password_hash = $${values.length}`);
  }

  if (!fields.length) return findUserById(id);
  values.push(id);
  const result = await pool.query(
    `UPDATE utenti SET ${fields.join(", ")} WHERE id = $${values.length}
     RETURNING id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen`,
    values
  );
  return result.rowCount ? publicUser(result.rows[0]) : null;
}

async function listUsers() {
  const result = await pool.query(
    "SELECT id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen FROM utenti WHERE ruolo <> 'founder' ORDER BY data_creazione DESC"
  );
  return result.rows.map(publicUser);
}

async function listUsersForActor(actor) {
  const actorRole = normalizeRole(actor?.ruolo);
  if (actorRole === "founder") return listUsers();
  const roles = managedRolesForActor(actor);
  if (!roles.length) return [];
  const values = [roles];
  let where = "WHERE ruolo = ANY($1)";
  if (actorRole === "responsabile" && !roleSeesAllStores(actor.ruolo)) {
    values.push(actor.negozio);
    where += " AND negozio = $2";
  }
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen
     FROM utenti ${where}
     ORDER BY data_creazione DESC`,
    values
  );
  return result.rows.map(publicUser);
}

async function deleteUser(id, actor) {
  if (String(actor.id) === String(id)) {
    const error = new Error("Non puoi eliminare il tuo stesso accesso");
    error.status = 400;
    throw error;
  }
  const target = await findUserRawById(id);
  if (!target) return false;
  if (normalizeRole(target.ruolo) === "founder") {
    const error = new Error("Il Founder non puo essere eliminato");
    error.status = 403;
    throw error;
  }
  assertCanManageTarget(actor, target);
  const result = await pool.query("DELETE FROM utenti WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}

async function loginUser(identifier, password) {
  const result = await pool.query(
    "SELECT * FROM utenti WHERE LOWER(username) = LOWER($1)",
    [identifier || ""]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
    const error = new Error("Nome utente o password non corretti");
    error.status = 401;
    throw error;
  }
  await pool.query("UPDATE utenti SET last_seen = NOW() WHERE id = $1", [user.id]);
  user.last_seen = new Date();
  const safeUser = publicUser(user);
  return { token: signUserToken(safeUser), user: safeUser };
}

async function registerFaceId(user, credentialId) {
  const credential = String(credentialId || "").trim();
  if (!credential) {
    const error = new Error("Credenziale Face ID non valida");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `UPDATE utenti SET face_id_credential = $2 WHERE id = $1
     RETURNING id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen`,
    [user.id, credential]
  );
  return publicUser(result.rows[0]);
}

async function loginWithFaceId(identifier, credentialId) {
  const result = await pool.query(
    "SELECT * FROM utenti WHERE LOWER(username) = LOWER($1) AND face_id_credential = $2",
    [identifier || "", String(credentialId || "")]
  );
  const user = result.rows[0];
  if (!user) {
    const error = new Error("Face ID non registrato per questo utente");
    error.status = 401;
    throw error;
  }
  await pool.query("UPDATE utenti SET last_seen = NOW() WHERE id = $1", [user.id]);
  user.last_seen = new Date();
  const safeUser = publicUser(user);
  return { token: signUserToken(safeUser), user: safeUser };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "oroactive-gestionale" });
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    response.json(await loginUser(request.body.username, request.body.password));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/faceid/login", async (request, response, next) => {
  try {
    response.json(await loginWithFaceId(request.body.username, request.body.credentialId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/auth/me", authenticate, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

app.use("/api", authenticate);

app.post("/api/auth/faceid/register", async (request, response, next) => {
  try {
    response.json({ user: await registerFaceId(request.user, request.body.credentialId) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/utenti", requireAdmin, async (_request, response, next) => {
  try {
    response.json(await listUsersForActor(_request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/utenti", requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await createUser(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/utenti/:id", requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body, request.user);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/utenti/:id", requireAdmin, async (request, response, next) => {
  try {
    const deleted = await deleteUser(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Utente non trovato" });
    response.json({ ok: true, id: request.params.id });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti", "/api/acts"], async (request, response, next) => {
  try {
    response.json(await listActs(request.query, request.user));
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/search", "/api/acts/search"], async (request, response, next) => {
  try {
    response.json(await listActs(request.query, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/bullionvault/prices", async (_request, response, next) => {
  try {
    const results = await Promise.allSettled(
      Object.entries(bullionVaultMarkets).map(([metal, market]) => fetchBullionVaultPrice(metal, market))
    );
    const prices = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (!prices.length) {
      return response.status(502).json({ error: "Quotazioni BullionVault momentaneamente non disponibili" });
    }

    response.json({
      provider: "BullionVault",
      note: "Prezzo medio tra miglior acquisto e miglior vendita espresso in EUR al kg.",
      prices
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/clienti/:codiceFiscale", async (request, response, next) => {
  try {
    const client = await getClientByFiscalCode(request.params.codiceFiscale);
    if (!client) return response.status(404).json({ error: "Cliente non trovato" });
    response.json(publicClient(client));
  } catch (error) {
    next(error);
  }
});

app.get("/api/giacenza", async (request, response, next) => {
  try {
    const storeQuery = request.query.negozio_id || request.query.store || request.query.negozio || "";
    const store = ["BUSTO", "CASSANO", "LEGNANO"].includes(String(storeQuery).toUpperCase())
      ? storeNameFromCode(String(storeQuery).toUpperCase())
      : storeQuery;
    const acts = await stockActs({ store }, request.user);
    response.json({
      generatedAt: new Date().toISOString(),
      giacenza: stockSummaryFromActs(acts)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/fusioni/riepilogo", async (request, response, next) => {
  try {
    const identifiers = String(request.query.atti || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const rows = [];
    for (const identifier of identifiers) {
      const row = await findExisting(identifier);
      if (row && canAccessAct(row, request.user)) rows.push(rowToAct(row));
    }
    response.json({
      count: rows.length,
      riepilogo: stockSummaryFromActs(rows),
      atti: rows.map((act) => ({
        id: act.id,
        practiceNumber: act.practiceNumber,
        cliente: [act.name, act.surname].filter(Boolean).join(" "),
        store: act.store,
        materiali: materialLotsFromAct(act).map((lot) => ({
          metallo: lot.metal,
          titolo: lot.title,
          grammi: Number(lot.weight.toFixed(3))
        }))
      }))
    });
  } catch (error) {
    next(error);
  }
});

function pdfFormatEuro(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function dataUrlToBuffer(dataUrl = "") {
  const match = String(dataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

function actMaterialsForPdf(act = {}) {
  if (Array.isArray(act.materials) && act.materials.length) return act.materials;
  return [{ metal: "Oro", weight: act.weight || "0" }];
}

function actAttachmentsForPdf(act = {}) {
  return (act.captureAttachments || [])
    .map((attachment) => ({
      label: attachmentLabelForPdf(attachment.key),
      buffer: dataUrlToBuffer(attachment.dataUrl || attachment.url || "")
    }))
    .filter((attachment) => attachment.buffer);
}

function attachmentLabelForPdf(key = "") {
  const normalized = String(key).replaceAll("-", " ");
  if (normalized.includes("documento fronte")) return "Documento fronte";
  if (normalized.includes("documento retro")) return "Documento retro";
  if (normalized.includes("codice fiscale fronte")) return "Codice fiscale fronte";
  if (normalized.includes("codice fiscale retro")) return "Codice fiscale retro";
  if (normalized.includes("preziosi")) return normalized.replace("preziosi", "Preziosi");
  if (normalized.includes("pagamento")) return "Contabile pagamento";
  return "Allegato fotografico";
}

function drawPdfHeader(doc, act, title) {
  const logoPath = path.join(__dirname, "oroactive-logo.png");
  try {
    doc.image(logoPath, 42, 30, { width: 52, height: 52, fit: [52, 52] });
  } catch {
    // Il PDF resta valido anche se il logo non è disponibile.
  }
  doc.fillColor("#f47a20").fontSize(9).font("Helvetica-Bold").text("GESTIONALE OROACTIVE", 105, 32);
  doc.fillColor("#111").fontSize(20).font("Helvetica-Bold").text(title, 105, 45, { width: 360 });
  doc.fillColor("#555").fontSize(9).font("Helvetica").text(`Atto n. ${act.practiceNumber || "Dato non inserito"} | ${act.date || ""} ${act.time || ""}`, 105, 70);
  doc.fillColor("#555").text(`Negozio ${act.store || "Dato non inserito"} | Operatore ${act.operatorUsername || act.operatorName || "Dato non inserito"}`, 105, 84);
  doc.save().opacity(0.045).fillColor("#f47a20").fontSize(54).font("Helvetica-Bold").rotate(-30, { origin: [300, 410] }).text("OROACTIVE", 120, 410);
  doc.restore();
  doc.moveTo(42, 104).lineTo(553, 104).strokeColor("#f4c6a6").stroke();
}

function drawPdfSectionTitle(doc, title, y) {
  doc.fillColor("#f47a20").font("Helvetica-Bold").fontSize(11).text(title.toUpperCase(), 42, y);
  return y + 18;
}

function drawPdfImage(doc, buffer, x, y, options) {
  try {
    doc.image(buffer, x, y, options);
    return true;
  } catch {
    return false;
  }
}

function drawPdfFields(doc, fields, y, columns = 2) {
  const gap = 10;
  const width = (511 - gap * (columns - 1)) / columns;
  let currentY = y;
  const rowHeight = 46;
  const boxHeight = 40;
  fields.forEach((field, index) => {
    const column = index % columns;
    if (index && column === 0) currentY += rowHeight;
    const x = 42 + column * (width + gap);
    doc.roundedRect(x, currentY, width, boxHeight, 4).strokeColor("#e6d6c8").stroke();
    doc.fillColor("#777").font("Helvetica-Bold").fontSize(7).text(field.label, x + 7, currentY + 6, { width: width - 14 });
    doc.fillColor("#111").font("Helvetica").fontSize(8.5).text(String(field.value || "Dato non inserito"), x + 7, currentY + 18, { width: width - 14, height: 20, ellipsis: true });
  });
  return currentY + rowHeight + 6;
}

function ensurePdfSpace(doc, y, needed = 90) {
  if (y + needed <= 760) return y;
  doc.addPage();
  return 42;
}

function drawActMainPdfPage(doc, act, title) {
  doc.addPage();
  drawPdfHeader(doc, act, title);
  let y = 122;
  y = drawPdfSectionTitle(doc, "1. Dati cliente", y);
  y = drawPdfFields(doc, [
    { label: "Nome", value: act.name },
    { label: "Cognome", value: act.surname },
    { label: "Codice fiscale", value: act.fiscalCode },
    { label: "Telefono", value: act.phone },
    { label: "Cittadinanza", value: act.citizenship },
    { label: "Sesso", value: act.sex },
    { label: "Data nascita", value: act.birthDate },
    { label: "Luogo nascita", value: act.birthPlace },
    { label: "Provincia nascita", value: act.birthProvince },
    { label: "Residenza", value: act.address },
    { label: "Provincia residenza", value: act.residenceProvince },
    { label: "Documento", value: `${act.documentType || ""} ${act.documentNumber || ""}`.trim() },
    { label: "Data rilascio", value: act.documentIssueDate },
    { label: "Scadenza documento", value: act.documentExpiry }
  ], y, 2);

  y = ensurePdfSpace(doc, y, 150);
  y = drawPdfSectionTitle(doc, "2. Oggetti ceduti", y);
  (act.items || []).forEach((item, index) => {
    y = ensurePdfSpace(doc, y, 42);
    doc.roundedRect(42, y, 511, 34, 4).strokeColor("#e6d6c8").stroke();
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text(`${index + 1}. ${item.description || "Oggetto prezioso"}`, 50, y + 7, { width: 300, height: 18, ellipsis: true });
    doc.fillColor("#555").font("Helvetica").fontSize(9).text(`${item.metal || ""} - ${item.title || ""}`, 365, y + 7, { width: 175 });
    y += 40;
  });

  y = ensurePdfSpace(doc, y, 170);
  y = drawPdfSectionTitle(doc, "3. Peso totale e pagamento", y);
  const materialFields = actMaterialsForPdf(act).map((material) => ({
    label: `Peso totale ${material.metal}`,
    value: `${material.weight || "0"} gr`
  }));
  const amountFields = (act.materialAmounts || []).map((row) => ({
    label: `Totale corrisposto ${row.metal}`,
    value: pdfFormatEuro(row.amount)
  }));
  y = drawPdfFields(doc, [
    ...materialFields,
    { label: "Metodo pagamento", value: act.paymentMethod },
    { label: "Totale corrisposto", value: pdfFormatEuro(act.amount) },
    ...amountFields
  ], y, 2);

  y = ensurePdfSpace(doc, y, 135);
  y = drawPdfSectionTitle(doc, "6. Firme cliente", y);
  const signatures = (act.signatureImages || []).filter(Boolean);
  if (signatures.length) {
    signatures.forEach((signature, index) => {
      const x = 42 + index * 172;
      const buffer = dataUrlToBuffer(signature);
      doc.roundedRect(x, y, 154, 72, 4).strokeColor("#e6d6c8").stroke();
      doc.fillColor("#777").font("Helvetica-Bold").fontSize(7).text(`Firma ${index + 1}`, x + 7, y + 6);
      if (buffer) drawPdfImage(doc, buffer, x + 8, y + 18, { fit: [138, 48], align: "center", valign: "center" });
    });
    y += 86;
  } else {
    doc.fillColor("#111").font("Helvetica").fontSize(9).text("Firme non disponibili nell'archivio digitale.", 42, y, { width: 511 });
    y += 28;
  }

  y = ensurePdfSpace(doc, y, 75);
  y = drawPdfSectionTitle(doc, "7. Riepilogo finale", y);
  doc.fillColor("#111").font("Helvetica").fontSize(9).text("Atto di vendita generato e archiviato nel gestionale OroActive con allegati fotografici e firme integrate.", 42, y, { width: 511, lineGap: 2 });
}

function drawActAttachmentPdfPages(doc, act, title) {
  const attachments = actAttachmentsForPdf(act);
  doc.addPage();
  drawPdfHeader(doc, act, `${title} - Allegati`);
  let y = 124;
  y = drawPdfSectionTitle(doc, "5. Allegati fotografici", y);
  if (!attachments.length) {
    return;
  }
  attachments.forEach((attachment) => {
    y = ensurePdfSpace(doc, y, 270);
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(10).text(attachment.label, 42, y);
    y += 14;
    doc.roundedRect(42, y, 511, 245, 6).strokeColor("#e6d6c8").stroke();
    drawPdfImage(doc, attachment.buffer, 52, y + 10, { fit: [491, 225], align: "center", valign: "center" });
    y += 265;
  });
}

function buildPdfForActs(response, { title = "Atto di vendita OroActive", subtitle = "", acts = [] }) {
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename=\"oroactive-atti.pdf\"`);
  const doc = new PDFDocument({ size: "A4", autoFirstPage: false, margin: 42, bufferPages: true });
  doc.pipe(response);
  if (subtitle) {
    doc.addPage();
    drawPdfHeader(doc, { practiceNumber: "", store: "", operatorUsername: "" }, title);
    const orderedActs = [...acts].sort((first, second) => actNumberValue(first.practiceNumber) - actNumberValue(second.practiceNumber));
    const firstPractice = orderedActs[0]?.practiceNumber || "Dato non inserito";
    const lastPractice = orderedActs.at(-1)?.practiceNumber || "Dato non inserito";
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(16).text(subtitle, 42, 140, { width: 511 });
    doc.fillColor("#555").font("Helvetica").fontSize(10).text(`Atti inclusi: ${acts.length}`, 42, 170);
    doc.text(`Da pratica: ${firstPractice}`, 42, 188);
    doc.text(`A pratica: ${lastPractice}`, 42, 206);
    doc.text(`Data generazione: ${new Date().toLocaleString("it-IT")}`, 42, 224);
  }
  acts.forEach((act) => {
    const heading = act.practiceNumber ? `Atto di vendita ${act.practiceNumber}` : title;
    drawActMainPdfPage(doc, act, heading);
    drawActAttachmentPdfPages(doc, act, heading);
  });
  doc.end();
}

app.post("/api/pdf/act", async (request, response, next) => {
  try {
    buildPdfForActs(response, { title: request.body.title || "Atto di vendita OroActive", acts: [request.body.act || {}] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/pdf/acts", async (request, response, next) => {
  try {
    buildPdfForActs(response, {
      title: request.body.title || "Esportazione atti OroActive",
      subtitle: request.body.subtitle || "",
      acts: Array.isArray(request.body.acts) ? request.body.acts : []
    });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/next-number", "/api/acts/next-number"], async (request, response, next) => {
  try {
    const storeCode = roleSeesAllStores(request.user.ruolo)
      ? String(request.query.storeCode || "")
      : storeCodeFromName(request.user.negozio);
    const year = Number(request.query.year || new Date().getFullYear());
    response.json({ nextNumber: await nextActNumber(storeCode, year) });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const row = await findExisting(request.params.id);
    if (row && !canAccessAct(row, request.user)) return response.status(403).json({ error: "Atto non accessibile" });
    const act = row ? rowToAct(row) : null;
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.post(["/api/atti", "/api/acts"], async (request, response, next) => {
  try {
    response.status(201).json(await saveAct(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const act = await updateAct(request.params.id, request.body, request.user);
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const deleted = await deleteAct(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Atto non trovato" });
    response.json({ ok: true, id: request.params.id });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(__dirname, { extensions: ["html"] }));
app.get("*", (_request, response) => response.sendFile(path.join(__dirname, "index.html")));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({ error: error.message || "Errore server" });
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`OroActive gestionale in ascolto sulla porta ${port}`);
    });
  })
  .catch((error) => {
    console.error("Errore inizializzazione database", error);
    process.exit(1);
  });
