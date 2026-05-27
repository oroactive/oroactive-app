import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 3000);
const actsTable = "atti_vendita";
const CASH_PAYMENT_LIMIT = 500;
const ACT_LIST_LIMIT = 50;
const isProduction = process.env.NODE_ENV === "production";
const runtimeStatus = {
  databaseReady: false,
  databaseError: "",
  startedAt: new Date().toISOString()
};
const missingJwtSecretMessage = "JWT_SECRET obbligatorio: configura una chiave lunga e casuale nelle variabili ambiente.";
const jwtSecret = process.env.JWT_SECRET || (isProduction
  ? crypto.createHash("sha256").update(`oroactive:${process.env.DATABASE_URL || "database"}:${process.env.ADMIN_USERNAME || "Elite"}`).digest("hex")
  : "oroactive-dev-jwt-secret-change-me");
if (!process.env.JWT_SECRET && isProduction) {
  console.error(`${missingJwtSecretMessage} Uso fallback temporaneo per evitare blocco avvio.`);
}
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "50mb";
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const openaiEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const bullionVaultMarketUrl = process.env.BULLIONVAULT_MARKET_URL || "https://www.bullionvault.com/view_market_xml.do";
const backupDirectory = process.env.BACKUP_DIR || path.join(__dirname, "backups");
const academyUploadDirectory = process.env.ACADEMY_UPLOAD_DIR || path.join(__dirname, "private_uploads", "academy");
const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
const backupIntervalMs = 24 * 60 * 60 * 1000;
const backupFolders = ["atti", "documenti", "preziosi", "contabili", "pdf", "firme", "utenti", "giacenza", "fusioni", "knowledge-base", "formazione", "antifrode", "crm"];
const bullionVaultMarkets = {
  Oro: { securityId: "AUXZU", source: "Zurigo" },
  Argento: { securityId: "AGXZU", source: "Zurigo" },
  Platino: { securityId: "PTXLN", source: "Londra" }
};
const defaultStores = [
  { nome: "Busto Arsizio", codice: "BUSTO", citta: "Busto Arsizio", provincia: "VA" },
  { nome: "Cassano Magnago", codice: "CASSANO", citta: "Cassano Magnago", provincia: "VA" },
  { nome: "Legnano", codice: "LEGNANO", citta: "Legnano", provincia: "MI" }
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const aiRuntime = {
  pgvector: false,
  vectorColumn: null,
  jsonColumn: "embedding_json",
  pgvectorMessage: "pgvector non disponibile, uso ricerca testuale fallback",
  embeddingDimension: 1536
};
const knowledgeCategories = [
  "Oro",
  "Argento",
  "Platino",
  "Diamanti",
  "Gemme",
  "Normativa",
  "Antiriciclaggio",
  "Gestione negozio",
  "Vendita",
  "Sicurezza",
  "Fusioni",
  "Clienti",
  "Casi reali",
  "Procedure operative",
  "Formazione operatori"
];

const app = express();
const allowedCorsOrigins = new Set([
  "https://app.oroactive.it",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173"
]);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedCorsOrigins.has(origin)) return callback(null, true);
    if (/^https:\/\/app\.oroactive\.it$/i.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: jsonBodyLimit }));
const apiRateBuckets = new Map();

function apiRateLimit(request, response, next) {
  if (!request.path.startsWith("/api")) return next();
  const key = `${request.ip || request.socket.remoteAddress || "local"}:${request.headers.authorization || "anon"}`;
  const now = Date.now();
  const bucket = apiRateBuckets.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  apiRateBuckets.set(key, bucket);
  if (bucket.count > 360) {
    return response.status(429).json({ error: "Troppe richieste: attendere qualche secondo." });
  }
  next();
}

function auditApiRequest(request, response, next) {
  const startedAt = Date.now();
  response.on("finish", () => {
    if (!request.user?.id) return;
    const method = request.method;
    const route = request.originalUrl.split("?")[0];
    if (route.includes("/auth/me")) return;
    pool.query(
      `INSERT INTO audit_logs (user_id, method, route, status_code, duration_ms, ip_address, created_at)
       VALUES ($1::bigint,$2::text,$3::text,$4::integer,$5::integer,$6::text,NOW())`,
      [
        request.user.id,
        method,
        route,
        response.statusCode,
        Date.now() - startedAt,
        request.ip || request.socket.remoteAddress || ""
      ]
    ).catch((error) => console.error("AUDIT LOG ERROR", error));
  });
  next();
}

app.use(apiRateLimit);

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
    telefono: row.telefono || "",
    note: row.note || "",
    attivo: row.attivo !== false,
    ruolo: normalizeRole(row.ruolo),
    negozio_id: row.negozio_id || null,
    negozio: roleSeesAllStores(row.ruolo) ? "Tutti" : row.negozio,
    hasFaceId: Boolean(row.face_id_credential),
    data_creazione: row.data_creazione,
    updated_at: row.updated_at || row.data_aggiornamento || null,
    last_seen: row.last_seen,
    online,
    stato_connessione: online ? "Online" : "Offline"
  };
}

function normalizeRole(role = "commesso") {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "founder") return "founder";
  if (normalized === "supervisore") return "supervisore";
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
  return ["founder", "supervisore"].includes(normalizeRole(role));
}

function canManageAccess(user) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function managedRolesForActor(actor) {
  const role = normalizeRole(actor?.ruolo);
  if (role === "founder") return ["aiuto_commesso", "commesso", "responsabile", "supervisore"];
  if (role === "supervisore") return ["aiuto_commesso", "commesso", "responsabile"];
  if (role === "responsabile") return ["aiuto_commesso", "commesso"];
  return [];
}

function usersSameStore(actor = {}, target = {}) {
  if (actor.negozio_id && target.negozio_id) return String(actor.negozio_id) === String(target.negozio_id);
  return String(actor.negozio || "") === String(target.negozio || "");
}

function minimalPublicUser(row) {
  const user = publicUser(row);
  return {
    id: user.id,
    nome: user.nome,
    cognome: user.cognome,
    ruolo: user.ruolo,
    negozio: user.negozio,
    attivo: user.attivo,
    last_seen: user.last_seen,
    online: user.online,
    stato_connessione: user.stato_connessione,
    visibility: "minimal",
    canEdit: false,
    canDelete: false,
    canViewActivity: false
  };
}

function canViewUserRecord(actor, target) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(target?.ruolo);
  if (String(actor?.id) === String(target?.id)) return true;
  if (actorRole === "founder") return true;
  if (actorRole === "supervisore") return targetRole !== "founder";
  if (actorRole === "responsabile") {
    return ["commesso", "aiuto_commesso"].includes(targetRole) && usersSameStore(actor, target);
  }
  if (actorRole === "commesso") {
    const lastSeen = target?.last_seen ? new Date(target.last_seen) : null;
    const online = Boolean(lastSeen && Date.now() - lastSeen.getTime() < 2 * 60 * 1000);
    return online && ["commesso", "aiuto_commesso"].includes(targetRole) && usersSameStore(actor, target);
  }
  return false;
}

function canViewUserActivity(actor, target) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(target?.ruolo);
  if (String(actor?.id) === String(target?.id)) return true;
  if (actorRole === "founder") return true;
  if (actorRole === "supervisore") return targetRole !== "founder";
  if (actorRole === "responsabile") {
    return ["commesso", "aiuto_commesso"].includes(targetRole) && usersSameStore(actor, target);
  }
  return false;
}

function publicUserForActor(row, actor) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(row?.ruolo);
  const self = String(actor?.id) === String(row?.id);
  if (actorRole === "commesso" && !self) return minimalPublicUser(row);
  const user = publicUser(row);
  user.visibility = "full";
  user.canEdit = actorRole === "founder"
    ? true
    : canManageAccess(actor) && managedRolesForActor(actor).includes(targetRole) && targetRole !== "founder";
  user.canDelete = user.canEdit && !self;
  user.canViewActivity = canViewUserActivity(actor, row);
  return user;
}

function logUserActivity(input = {}) {
  const userId = input.userId || input.user_id;
  if (!userId) return Promise.resolve();
  return pool.query(
    `INSERT INTO user_activity_logs
      (user_id, actor_id, activity_type, entity_type, entity_id, description, metadata, created_at)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,$6::text,$7::jsonb,NOW())`,
    [
      userId,
      input.actorId || input.actor_id || userId,
      input.activityType || input.activity_type || "activity",
      input.entityType || input.entity_type || null,
      input.entityId || input.entity_id || null,
      input.description || "",
      sanitizeForPostgres(input.metadata || {})
    ]
  ).catch((error) => console.error("USER ACTIVITY LOG ERROR", error));
}

function activityLabel(type = "") {
  return {
    login: "Login",
    logout: "Logout",
    create_act: "Creazione atto",
    update_act: "Modifica atto",
    complete_act: "Completamento atto",
    archive_act: "Archiviazione atto",
    delete_act: "Eliminazione atto",
    print_customer_copy: "Stampa copia cliente",
    print_company_copy: "Stampa copia aziendale",
    create_user: "Creazione utente",
    update_user: "Modifica utente",
    deactivate_user: "Disattivazione utente",
    update_crm: "Modifica cliente CRM",
    academy_course: "Creazione/modifica corso Academy",
    operational_error: "Errore operativo"
  }[type] || "Attività";
}

function publicActivity(row) {
  return {
    id: row.id,
    type: row.activity_type,
    label: activityLabel(row.activity_type),
    entityType: row.entity_type || "",
    entityId: row.entity_id || "",
    description: row.description || activityLabel(row.activity_type),
    metadata: row.metadata || {},
    created_at: row.created_at,
    actor: [row.actor_nome, row.actor_cognome].filter(Boolean).join(" ") || row.actor_username || row.actor_email || ""
  };
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
    "SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti WHERE id = $1::bigint",
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
    return response.status(403).json({ error: "Non autorizzato" });
  }
  next();
}

function requireFounder(request, response, next) {
  if (normalizeRole(request.user?.ruolo) !== "founder") {
    return response.status(403).json({ error: "Non autorizzato" });
  }
  next();
}

function requireBackupManager(request, response, next) {
  if (!["founder", "responsabile"].includes(normalizeRole(request.user?.ruolo))) {
    return response.status(403).json({ error: "Non autorizzato" });
  }
  next();
}

function canManageKnowledge(user) {
  return ["founder", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function requireKnowledgeEditor(request, response, next) {
  if (!canManageKnowledge(request.user)) {
    return response.status(403).json({ error: "Non autorizzato" });
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

function daysBetween(start, end = new Date()) {
  const first = new Date(dateText(start) || "");
  const second = new Date(dateText(end) || "");
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return 0;
  return Math.floor((second.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
}

function dateOrNull(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.includes("T") ? text.slice(0, 10) : text;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function nullIfEmpty(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && !value.trim()) return null;
  return value;
}

function sanitizeForPostgres(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => sanitizeForPostgres(item));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForPostgres(item)]));
  }
  return value;
}

function redactedActPayloadForLog(act = {}) {
  const payload = act.payload || {};
  return {
    id: act.id || null,
    practiceNumber: act.practiceNumber || "",
    status: act.status || "",
    store: act.store || "",
    dataAtto: act.dataAtto || null,
    clienteNome: Boolean(act.clienteNome),
    clienteCognome: Boolean(act.clienteCognome),
    codiceFiscale: act.codiceFiscale ? "***" : "",
    totale: act.totale,
    paymentMethod: act.paymentMethod || "",
    payloadKeys: Object.keys(payload),
    captureAttachmentsCount: Array.isArray(payload.captureAttachments) ? payload.captureAttachments.length : 0,
    signatureImagesCount: Array.isArray(payload.signatureImages) ? payload.signatureImages.length : 0
  };
}

function normalizeWorkflowStatus(status = "archived_incomplete") {
  if (typeof status !== "string") return "archived_incomplete";
  const normalized = status.trim().toLowerCase();
  if (["completed", "complete", "completato", "completata"].includes(normalized)) return "completed";
  if (["archived_completed", "archiviato completato", "archiviata completata"].includes(normalized)) return "archived_completed";
  if (["draft", "bozza", "in bozza"].includes(normalized)) return "draft";
  if (["archived_incomplete", "archived", "archiviato", "archiviata", "archiviato incompleto", "archiviata incompleta"].includes(normalized)) return "archived_incomplete";
  if (["deleted", "eliminato", "eliminata", "cancellato", "cancellata"].includes(normalized)) return "deleted";
  if (["abandoned", "abbandonato", "abbandonata"].includes(normalized)) return "abandoned";
  return "archived_incomplete";
}

function realCompletedStatusSql(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `(COALESCE(${prefix}status, '') ILIKE 'completed'
      OR COALESCE(${prefix}status, '') ILIKE 'Completato'
      OR COALESCE(${prefix}status, '') ILIKE 'archived_completed'
      OR (COALESCE(${prefix}status, '') ILIKE 'Archiviata' AND ${prefix}completed_at IS NOT NULL))
    AND ${prefix}deleted_at IS NULL
    AND ${prefix}completed_at IS NOT NULL`;
}

function visibleRealActStatusSql(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}deleted_at IS NULL
    AND COALESCE(${prefix}status, '') NOT ILIKE 'draft'
    AND COALESCE(${prefix}status, '') NOT ILIKE 'Bozza'
    AND COALESCE(${prefix}status, '') NOT ILIKE 'deleted'
    AND COALESCE(${prefix}status, '') NOT ILIKE 'Deleted'
    AND COALESCE(${prefix}status, '') NOT ILIKE 'abandoned'
    AND COALESCE(${prefix}status, '') NOT ILIKE 'Abandoned'
    AND (
      ${realCompletedStatusSql(alias)}
      OR COALESCE(${prefix}status, '') ILIKE 'archived_incomplete'
      OR (COALESCE(${prefix}status, '') ILIKE 'Archiviata' AND ${prefix}completed_at IS NULL)
    )`;
}

function normalizeFiscalCode(value = "") {
  return String(value || "").trim().toUpperCase();
}

function isCompletedAct(rowOrAct = {}) {
  return ["completed", "archived_completed"].includes(normalizeWorkflowStatus(rowOrAct.status || rowOrAct.payload?.status));
}

function isValidIban(value = "") {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(String(value || "").replace(/\s+/g, ""));
}

function openAiUnavailableError() {
  const error = new Error("AI OpenAI non configurata: imposta OPENAI_API_KEY sul backend.");
  error.status = 503;
  return error;
}

function requireOpenAiClient() {
  if (!openai) throw openAiUnavailableError();
  return openai;
}

function sqlIdentifier(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(name || ""))) {
    throw new Error("Identificatore SQL non valido");
  }
  return `"${name}"`;
}

function vectorInput(embedding = []) {
  return `[${(Array.isArray(embedding) ? embedding : []).map((value) => Number(value) || 0).join(",")}]`;
}

function limitAssistantContext(chunks = [], maxChars = 60000) {
  const selected = [];
  let length = 0;
  for (const chunk of chunks) {
    const content = String(chunk.content || "");
    if (!content) continue;
    const nextLength = length + content.length;
    if (selected.length && nextLength > maxChars) break;
    selected.push(chunk);
    length = nextLength;
  }
  return selected;
}

function validImageDataUrl(value = "") {
  const text = String(value || "");
  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(text) ? text : "";
}

function parseOpenAiJson(response) {
  const text = response.output_text || "";
  if (!text.trim()) return {};
  return JSON.parse(text);
}

const documentAiSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    nome: { type: "string" },
    cognome: { type: "string" },
    data_nascita: { type: "string", description: "Formato GG/MM/AAAA se leggibile, altrimenti stringa vuota." },
    luogo_nascita: { type: "string" },
    codice_fiscale: { type: "string" },
    cittadinanza: { type: "string" },
    indirizzo_residenza: { type: "string" },
    provincia_residenza: { type: "string" },
    tipo_documento: { type: "string" },
    numero_documento: { type: "string" },
    data_rilascio: { type: "string", description: "Formato GG/MM/AAAA se leggibile, altrimenti stringa vuota." },
    data_scadenza: { type: "string", description: "Formato GG/MM/AAAA se leggibile, altrimenti stringa vuota." },
    confidence: {
      type: "object",
      additionalProperties: false,
      properties: {
        nome: { type: "string", enum: ["alto", "medio", "basso", ""] },
        cognome: { type: "string", enum: ["alto", "medio", "basso", ""] },
        data_nascita: { type: "string", enum: ["alto", "medio", "basso", ""] },
        luogo_nascita: { type: "string", enum: ["alto", "medio", "basso", ""] },
        codice_fiscale: { type: "string", enum: ["alto", "medio", "basso", ""] },
        indirizzo_residenza: { type: "string", enum: ["alto", "medio", "basso", ""] },
        numero_documento: { type: "string", enum: ["alto", "medio", "basso", ""] },
        data_scadenza: { type: "string", enum: ["alto", "medio", "basso", ""] }
      },
      required: ["nome", "cognome", "data_nascita", "luogo_nascita", "codice_fiscale", "indirizzo_residenza", "numero_documento", "data_scadenza"]
    }
  },
  required: [
    "nome",
    "cognome",
    "data_nascita",
    "luogo_nascita",
    "codice_fiscale",
    "cittadinanza",
    "indirizzo_residenza",
    "provincia_residenza",
    "tipo_documento",
    "numero_documento",
    "data_rilascio",
    "data_scadenza",
    "confidence"
  ]
};

const actCheckAiSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    errori: { type: "array", items: { type: "string" } },
    campi_mancanti: { type: "array", items: { type: "string" } },
    incongruenze: { type: "array", items: { type: "string" } },
    suggerimenti: { type: "array", items: { type: "string" } }
  },
  required: ["ok", "errori", "campi_mancanti", "incongruenze", "suggerimenti"]
};

const assistantAiSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    risposta: { type: "string" },
    fonte: {
      type: "string",
      enum: [
        "La bilancia d'oro",
        "La bilancia d'oro + Procedura OroActive approvata",
        "Procedura OroActive approvata",
        "La bilancia d'oro + integrazione generale",
        "Integrazione generale",
        "Risposta integrata con ricerca web",
        "Fonti interne non sufficienti, risposta basata su ricerca esterna"
      ]
    },
    dal_libro: { type: "boolean" },
    citazioni: { type: "array", items: { type: "string" } }
  },
  required: ["risposta", "fonte", "dal_libro", "citazioni"]
};

function documentAiToClientFields(result = {}) {
  const confidence = result.confidence || {};
  return {
    name: result.nome || "",
    surname: result.cognome || "",
    fiscalCode: result.codice_fiscale || "",
    birthDate: result.data_nascita || "",
    birthPlace: result.luogo_nascita || "",
    birthProvince: result.provincia_nascita || "",
    sex: result.sesso || "",
    citizenship: result.cittadinanza || "",
    address: result.indirizzo_residenza || "",
    residenceProvince: result.provincia_residenza || "",
    documentNumber: result.numero_documento || "",
    documentIssueDate: result.data_emissione || "",
    documentExpiry: result.data_scadenza || "",
    _confidence: {
      name: confidence.nome || "",
      surname: confidence.cognome || "",
      fiscalCode: confidence.codice_fiscale || "",
      birthDate: confidence.data_nascita || "",
      birthPlace: confidence.luogo_nascita || "",
      address: confidence.indirizzo_residenza || ""
    }
  };
}

async function readDocumentWithOpenAi(frontImage, backImage) {
  const client = requireOpenAiClient();
  const front = validImageDataUrl(frontImage);
  const back = validImageDataUrl(backImage);
  if (!front || !back) {
    const error = new Error("Immagini documento non valide.");
    error.status = 400;
    throw error;
  }

  const result = await client.responses.create({
    model: openaiModel,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Analizza fronte e retro di una carta d'identita, patente o passaporto italiano.
Estrai solo dati visibili e leggibili.
Se un dato non e leggibile, lascia stringa vuota.
Non inventare dati.
Usa formato date GG/MM/AAAA.
Restituisci esclusivamente JSON valido nel formato richiesto.
La confidence deve essere: alto, medio, basso oppure stringa vuota.`
        },
        { type: "input_image", image_url: front, detail: "high" },
        { type: "input_image", image_url: back, detail: "high" }
      ]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "lettura_documento_oroactive",
        strict: true,
        schema: documentAiSchema
      }
    }
  });
  return parseOpenAiJson(result);
}

async function checkActWithOpenAi(act) {
  const client = requireOpenAiClient();
  const compactAct = compactActPayload(act || {});
  const result = await client.responses.create({
    model: openaiModel,
    input: `Controlla questo atto di vendita OroActive e restituisci JSON.
Verifica campi mancanti, documento scaduto, codice fiscale, firme, pagamento, foto documenti, foto preziosi, contabile se Bonifico o Assegno, importo contanti massimo 500 EUR ogni 7 giorni per cliente.
Non inventare dati. Evidenzia solo problemi concreti o suggerimenti utili all'operatore.

ATTO:
${JSON.stringify(compactAct)}`,
    text: {
      format: {
        type: "json_schema",
        name: "controllo_atto_oroactive",
        strict: true,
        schema: actCheckAiSchema
      }
    }
  });
  return parseOpenAiJson(result);
}

function uploadedDataUrlToBuffer(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    const error = new Error("File non valido o non leggibile.");
    error.status = 400;
    throw error;
  }
  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2].replace(/\s+/g, ""), "base64")
  };
}

function bookFileKind(filename = "", mimeType = "") {
  const lowerName = String(filename || "").toLowerCase();
  const lowerMime = String(mimeType || "").toLowerCase();
  if (lowerName.endsWith(".txt") || lowerMime.includes("text/plain")) return "txt";
  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) return "pdf";
  if (lowerName.endsWith(".docx") || lowerMime.includes("wordprocessingml")) return "docx";
  return "";
}

async function extractBookText({ filename = "", dataUrl = "" }) {
  const { mimeType, buffer } = uploadedDataUrlToBuffer(dataUrl);
  const kind = bookFileKind(filename, mimeType);
  if (!kind) {
    const error = new Error("Formato libro non supportato. Carica PDF, DOCX o TXT.");
    error.status = 400;
    throw error;
  }

  if (kind === "txt") return buffer.toString("utf8");

  if (kind === "docx") {
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  const pdfModule = await import("pdf-parse");
  const pdfParse = pdfModule.default || pdfModule;
  const result = await pdfParse(buffer);
  return result.text || "";
}

function normalizeBookText(text = "") {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkBookText(text = "", maxChars = 1100, overlap = 140) {
  const normalized = normalizeBookText(text);
  const chunks = [];
  let index = 0;
  while (index < normalized.length) {
    const targetEnd = Math.min(index + maxChars, normalized.length);
    const paragraphBreak = normalized.lastIndexOf("\n\n", targetEnd);
    const sentenceBreak = normalized.lastIndexOf(". ", targetEnd);
    const end = paragraphBreak > index + 500
      ? paragraphBreak
      : sentenceBreak > index + 500
        ? sentenceBreak + 1
        : targetEnd;
    const content = normalized.slice(index, end).trim();
    if (content.length > 80) chunks.push(content);
    if (end >= normalized.length) break;
    index = Math.max(0, end - overlap);
  }
  return chunks;
}

async function createTextEmbedding(text = "") {
  const [embedding] = await createTextEmbeddings([text]);
  return embedding || null;
}

async function createTextEmbeddings(texts = []) {
  const client = requireOpenAiClient();
  const result = await client.embeddings.create({
    model: openaiEmbeddingModel,
    ...(openaiEmbeddingModel.includes("text-embedding-3") ? { dimensions: aiRuntime.embeddingDimension } : {}),
    input: texts.map((text) => String(text || "").slice(0, 8000))
  });
  return (result.data || []).map((item) => item.embedding || null);
}

function cosineSimilarity(first = [], second = []) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return 0;
  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;
  for (let index = 0; index < first.length; index += 1) {
    const left = Number(first[index]) || 0;
    const right = Number(second[index]) || 0;
    dot += left * right;
    firstNorm += left * left;
    secondNorm += right * right;
  }
  return firstNorm && secondNorm ? dot / (Math.sqrt(firstNorm) * Math.sqrt(secondNorm)) : 0;
}

function textHash(text = "") {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

async function aiChunkColumns() {
  const result = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'ai_document_chunks'
      AND column_name IN ('embedding', 'embedding_json', 'embedding_vector')
  `);
  return result.rows;
}

async function setupAiVectorStorage() {
  await pool.query("ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding_json JSONB");
  await pool.query("ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS title TEXT");
  await pool.query("ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR");
  await pool.query("UPDATE ai_document_chunks SET content_tsv = to_tsvector('italian', COALESCE(content, '')) WHERE content_tsv IS NULL");
  await pool.query("CREATE INDEX IF NOT EXISTS ai_document_chunks_content_fts_idx ON ai_document_chunks USING GIN (content_tsv)");
  aiRuntime.pgvector = false;
  aiRuntime.vectorColumn = null;
  aiRuntime.jsonColumn = "embedding_json";
  aiRuntime.pgvectorMessage = "pgvector non disponibile, uso ricerca testuale fallback";
  console.log(aiRuntime.pgvectorMessage);
}

async function insertAiChunk(db, { document, index, content, embedding }) {
  const jsonColumn = sqlIdentifier(aiRuntime.jsonColumn);
  const metadata = { titolo: document.titolo, autore: document.autore };
  if (aiRuntime.pgvector && aiRuntime.vectorColumn) {
    const vectorColumn = sqlIdentifier(aiRuntime.vectorColumn);
    await db.query(
      `INSERT INTO ai_document_chunks (document_id, chunk_index, title, content, content_tsv, ${jsonColumn}, ${vectorColumn}, metadata)
       VALUES ($1, $2, $3, $4, to_tsvector('italian', $4), $5::jsonb, $6::vector, $7)`,
      [document.id, index, document.titolo, content, JSON.stringify(embedding || []), vectorInput(embedding), metadata]
    );
    return;
  }

  await db.query(
    `INSERT INTO ai_document_chunks (document_id, chunk_index, title, content, content_tsv, ${jsonColumn}, metadata)
     VALUES ($1, $2, $3, $4, to_tsvector('italian', $4), $5::jsonb, $6)`,
    [document.id, index, document.titolo, content, JSON.stringify(embedding || []), metadata]
  );
}

async function updateAiChunkEmbedding(id, embedding) {
  const jsonColumn = sqlIdentifier(aiRuntime.jsonColumn);
  if (aiRuntime.pgvector && aiRuntime.vectorColumn) {
    const vectorColumn = sqlIdentifier(aiRuntime.vectorColumn);
    await pool.query(
      `UPDATE ai_document_chunks
       SET ${jsonColumn} = $2::jsonb,
           ${vectorColumn} = $3::vector,
           metadata = metadata || $4::jsonb
       WHERE id = $1`,
      [
        id,
        JSON.stringify(embedding || []),
        vectorInput(embedding),
        JSON.stringify({ embeddingModel: openaiEmbeddingModel, reindexedAt: new Date().toISOString() })
      ]
    );
    return;
  }

  await pool.query(
    `UPDATE ai_document_chunks
     SET ${jsonColumn} = $2::jsonb,
         metadata = metadata || $3::jsonb
     WHERE id = $1`,
    [
      id,
      JSON.stringify(embedding || []),
      JSON.stringify({ embeddingModel: openaiEmbeddingModel, reindexedAt: new Date().toISOString() })
    ]
  );
}

async function uploadAiBook({ titolo, autore, filename, dataUrl }, user) {
  const extractedText = normalizeBookText(await extractBookText({ filename, dataUrl }));
  const bookHash = textHash(extractedText);
  const chunks = chunkBookText(extractedText);
  if (!chunks.length) {
    const error = new Error("Il libro non contiene testo estraibile sufficiente.");
    error.status = 400;
    throw error;
  }
  console.log("Chunks loaded:", chunks.length);

  const duplicate = await pool.query(
    "SELECT id, titolo, autore, filename, uploaded_by, created_at, (metadata->>'chunks')::int AS chunks FROM ai_documents WHERE metadata->>'bookHash' = $1 ORDER BY created_at DESC LIMIT 1",
    [bookHash]
  );
  if (duplicate.rowCount) {
    return { ...duplicate.rows[0], chunks: duplicate.rows[0].chunks || chunks.length, duplicate: true, message: "Knowledge base pronta" };
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const documentResult = await db.query(
      `INSERT INTO ai_documents (titolo, autore, filename, uploaded_by, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titolo, autore, filename, uploaded_by, created_at`,
      [
        titolo || "La bilancia d'oro",
        autore || "Christian Dinato",
        filename || "libro-ai",
        user.id,
        {
          chunks: chunks.length,
          bookHash,
          sourceType: "book",
          searchMode: aiRuntime.pgvector ? "pgvector" : "full-text",
          embeddingModel: aiRuntime.pgvector ? openaiEmbeddingModel : null
        }
      ]
    );
    const document = documentResult.rows[0];
    const embeddings = aiRuntime.pgvector ? await createTextEmbeddings(chunks) : [];
    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index];
      const embedding = embeddings[index] || [];
      await insertAiChunk(db, { document, index, content, embedding });
    }
    await db.query("COMMIT");
    return { ...document, chunks: chunks.length, message: "Knowledge base pronta" };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

async function aiKnowledgeStatus() {
  const result = await pool.query(`
    SELECT d.id, d.titolo, d.autore, d.filename, d.uploaded_by, d.created_at, COUNT(c.id)::int AS chunks,
           d.metadata->>'searchMode' AS search_mode,
           d.metadata->>'bookHash' AS book_hash
    FROM ai_documents d
    LEFT JOIN ai_document_chunks c ON c.document_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `);
  return result.rows;
}

async function reindexAiBook(documentId) {
  const params = [];
  let where = "";
  if (documentId) {
    params.push(documentId);
    where = "WHERE document_id = $1";
  }
  const result = await pool.query(`SELECT id, content FROM ai_document_chunks ${where} ORDER BY document_id, chunk_index`, params);
  if (!aiRuntime.pgvector) {
    await pool.query(`UPDATE ai_document_chunks SET content_tsv = to_tsvector('italian', COALESCE(content, '')) ${where}`, params);
    console.log("pgvector non disponibile, uso ricerca testuale fallback");
    return { ok: true, chunks: result.rowCount, fallback_full_text: true, message: "Knowledge base pronta" };
  }

  requireOpenAiClient();
  for (let index = 0; index < result.rows.length; index += 50) {
    const batch = result.rows.slice(index, index + 50);
    const embeddings = await createTextEmbeddings(batch.map((row) => row.content));
    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      const row = batch[batchIndex];
      await updateAiChunkEmbedding(row.id, embeddings[batchIndex]);
    }
  }
  return { ok: true, chunks: result.rowCount };
}

async function updateAiBook(id, input = {}, user = null) {
  if (input.dataUrl) {
    const extractedText = normalizeBookText(await extractBookText({ filename: input.filename, dataUrl: input.dataUrl }));
    const bookHash = textHash(extractedText);
    const chunks = chunkBookText(extractedText);
    if (!chunks.length) {
      const error = new Error("Il libro non contiene testo estraibile sufficiente.");
      error.status = 400;
      throw error;
    }
    console.log("Chunks loaded:", chunks.length);

    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const documentResult = await db.query(
        `UPDATE ai_documents
         SET titolo = COALESCE(NULLIF($2, ''), titolo),
             autore = COALESCE(NULLIF($3, ''), autore),
             filename = COALESCE(NULLIF($4, ''), filename),
             uploaded_by = COALESCE($5, uploaded_by),
             metadata = metadata || $6::jsonb
         WHERE id = $1
         RETURNING id, titolo, autore, filename, uploaded_by, created_at`,
        [
          id,
          input.titolo || "",
          input.autore || "",
          input.filename || "",
          user?.id || null,
          JSON.stringify({
            chunks: chunks.length,
            bookHash,
            sourceType: "book",
            searchMode: aiRuntime.pgvector ? "pgvector" : "full-text",
            embeddingModel: aiRuntime.pgvector ? openaiEmbeddingModel : null,
            replacedAt: new Date().toISOString()
          })
        ]
      );
      const document = documentResult.rows[0];
      if (!document) {
        await db.query("ROLLBACK");
        return null;
      }
      await db.query("DELETE FROM ai_document_chunks WHERE document_id = $1", [id]);
      const embeddings = aiRuntime.pgvector ? await createTextEmbeddings(chunks) : [];
      for (let index = 0; index < chunks.length; index += 1) {
        const content = chunks[index];
        const embedding = embeddings[index] || [];
        await insertAiChunk(db, { document, index, content, embedding });
      }
      await db.query("COMMIT");
      return { ...document, chunks: chunks.length, message: "Knowledge base pronta" };
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }

  const result = await pool.query(
    `UPDATE ai_documents
     SET titolo = COALESCE(NULLIF($2, ''), titolo),
         autore = COALESCE(NULLIF($3, ''), autore)
     WHERE id = $1
     RETURNING id, titolo, autore, filename, uploaded_by, created_at`,
    [id, input.titolo || "", input.autore || ""]
  );
  return result.rows[0] || null;
}

async function deleteAiBook(id) {
  const result = await pool.query("DELETE FROM ai_documents WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}

function normalizeKnowledgeStatus(status = "in revisione") {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approvata" || normalized === "approvato") return "approvata";
  if (normalized === "rifiutata" || normalized === "rifiutato") return "rifiutata";
  return "in revisione";
}

function normalizeKnowledgeCategory(category = "") {
  const found = knowledgeCategories.find((item) => item.toLowerCase() === String(category || "").trim().toLowerCase());
  return found || "Procedure operative";
}

function publicKnowledgeNote(row = {}, user = null) {
  const role = normalizeRole(user?.ruolo);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    source: row.source,
    store_experience: row.store_experience,
    author_id: row.author_id,
    author_role: row.author_role,
    status: row.status,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    can_edit: role === "founder" || (role === "responsabile" && String(row.author_id || "") === String(user?.id || "")),
    can_delete: role === "founder" || (role === "responsabile" && String(row.author_id || "") === String(user?.id || "") && row.status !== "approvata")
  };
}

async function indexKnowledgeNote(note = {}) {
  if (!note?.id || normalizeKnowledgeStatus(note.status) !== "approvata") return { indexed: false, chunks: 0 };
  const chunks = chunkBookText(note.content || "");
  if (!chunks.length) return { indexed: false, chunks: 0 };
  console.log("Chunks loaded:", chunks.length);

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "DELETE FROM ai_documents WHERE metadata->>'sourceType' = 'note' AND metadata->>'noteId' = $1",
      [String(note.id)]
    );
    const documentResult = await db.query(
      `INSERT INTO ai_documents (titolo, autore, filename, uploaded_by, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titolo, autore, filename, uploaded_by, created_at`,
      [
        note.title || "Procedura OroActive approvata",
        note.author_role || "OroActive",
        `knowledge-note-${note.id}`,
        note.author_id || null,
        {
          sourceType: "note",
          noteId: String(note.id),
          category: note.category || "Procedure operative",
          status: "approvata",
          searchMode: "full-text"
        }
      ]
    );
    const document = documentResult.rows[0];
    for (let index = 0; index < chunks.length; index += 1) {
      await insertAiChunk(db, { document, index, content: chunks[index], embedding: [] });
    }
    await db.query("COMMIT");
    return { indexed: true, chunks: chunks.length };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

async function listKnowledgeNotes(user) {
  const role = normalizeRole(user?.ruolo);
  if (role === "founder") {
    const result = await pool.query("SELECT * FROM ai_knowledge_notes ORDER BY created_at DESC");
    return { categories: knowledgeCategories, notes: result.rows.map((row) => publicKnowledgeNote(row, user)) };
  }
  if (role === "responsabile") {
    const result = await pool.query(
      "SELECT * FROM ai_knowledge_notes WHERE author_id = $1 OR status = 'approvata' ORDER BY created_at DESC",
      [user.id]
    );
    return { categories: knowledgeCategories, notes: result.rows.map((row) => publicKnowledgeNote(row, user)) };
  }
  const error = new Error("Non autorizzato");
  error.status = 403;
  throw error;
}

async function createKnowledgeNote(input = {}, user) {
  const title = String(input.title || "").trim();
  const content = String(input.content || "").trim();
  if (!title || !content) {
    const error = new Error("Titolo e contenuto sono obbligatori.");
    error.status = 400;
    throw error;
  }
  const isFounderRole = normalizeRole(user?.ruolo) === "founder";
  const requestedStatus = normalizeKnowledgeStatus(input.status);
  const status = isFounderRole && requestedStatus === "approvata" ? "approvata" : "in revisione";
  const result = await pool.query(
    `INSERT INTO ai_knowledge_notes
      (title, category, content, source, store_experience, author_id, author_role, status, approved_by, approved_at)
     VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::bigint, $7::text, $8::text, $9::bigint, CASE WHEN $8::text = 'approvata' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      title,
      normalizeKnowledgeCategory(input.category),
      content,
      String(input.source || "").trim(),
      String(input.store_experience || "").trim(),
      user.id,
      normalizeRole(user.ruolo),
      status,
      status === "approvata" ? user.id : null
    ]
  );
  const note = result.rows[0];
  if (note.status === "approvata") await indexKnowledgeNote(note);
  return publicKnowledgeNote(note, user);
}

async function updateKnowledgeNote(id, input = {}, user) {
  const existing = await pool.query("SELECT * FROM ai_knowledge_notes WHERE id = $1::bigint", [id]);
  const note = existing.rows[0];
  if (!note) return null;
  const role = normalizeRole(user?.ruolo);
  const ownNote = String(note.author_id || "") === String(user?.id || "");
  if (role !== "founder" && !(role === "responsabile" && ownNote)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  if (role === "responsabile" && note.status === "approvata") {
    const error = new Error("La conoscenza approvata dal founder non puo essere modificata dal responsabile.");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE ai_knowledge_notes
     SET title = COALESCE(NULLIF($2::text, ''), title),
         category = COALESCE(NULLIF($3::text, ''), category),
         content = COALESCE(NULLIF($4::text, ''), content),
         source = COALESCE($5::text, source),
         store_experience = COALESCE($6::text, store_experience),
         status = CASE WHEN $7::text = 'founder' THEN $8::text ELSE 'in revisione' END,
         approved_by = CASE WHEN $7::text = 'founder' AND $8::text = 'approvata' THEN $9::bigint ELSE NULL END,
         approved_at = CASE WHEN $7::text = 'founder' AND $8::text = 'approvata' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      id,
      String(input.title || "").trim(),
      normalizeKnowledgeCategory(input.category),
      String(input.content || "").trim(),
      String(input.source || "").trim(),
      String(input.store_experience || "").trim(),
      role,
      normalizeKnowledgeStatus(input.status || note.status),
      user.id
    ]
  );
  const updated = result.rows[0];
  await pool.query("DELETE FROM ai_documents WHERE metadata->>'sourceType' = 'note' AND metadata->>'noteId' = $1", [String(id)]);
  if (updated.status === "approvata") await indexKnowledgeNote(updated);
  return publicKnowledgeNote(updated, user);
}

async function setKnowledgeNoteStatus(id, status, user) {
  const normalized = normalizeKnowledgeStatus(status);
  const result = await pool.query(
    `UPDATE ai_knowledge_notes
     SET status = $2,
         approved_by = CASE WHEN $2 = 'approvata' THEN $3 ELSE NULL END,
         approved_at = CASE WHEN $2 = 'approvata' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, normalized, user.id]
  );
  const note = result.rows[0];
  if (!note) return null;
  await pool.query("DELETE FROM ai_documents WHERE metadata->>'sourceType' = 'note' AND metadata->>'noteId' = $1", [String(id)]);
  if (note.status === "approvata") await indexKnowledgeNote(note);
  return publicKnowledgeNote(note, user);
}

async function deleteKnowledgeNote(id, user) {
  const existing = await pool.query("SELECT * FROM ai_knowledge_notes WHERE id = $1", [id]);
  const note = existing.rows[0];
  if (!note) return false;
  const role = normalizeRole(user?.ruolo);
  const ownNote = String(note.author_id || "") === String(user?.id || "");
  if (role !== "founder" && !(role === "responsabile" && ownNote && note.status !== "approvata")) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  await pool.query("DELETE FROM ai_documents WHERE metadata->>'sourceType' = 'note' AND metadata->>'noteId' = $1", [String(id)]);
  await pool.query("DELETE FROM ai_knowledge_notes WHERE id = $1", [id]);
  return true;
}

async function listAiFeedback() {
  const result = await pool.query(
    `SELECT *
     FROM ai_feedback
     WHERE COALESCE(status, 'da_valutare') = 'da_valutare'
     ORDER BY created_at DESC
     LIMIT 200`
  );
  return { feedback: result.rows };
}

async function createAiFeedback(input = {}, user) {
  const result = await pool.query(
    `INSERT INTO ai_feedback (user_id, question, answer, feedback_type, comment, status)
     VALUES ($1, $2, $3, $4, $5, 'da_valutare')
     RETURNING *`,
    [
      user.id,
      String(input.question || "").slice(0, 6000),
      String(input.answer || "").slice(0, 12000),
      String(input.feedback_type || input.type || "utile").slice(0, 80),
      String(input.comment || "").slice(0, 4000)
    ]
  );
  return result.rows[0];
}

async function feedbackToKnowledge(id, input = {}, user) {
  const feedbackResult = await pool.query(
    `UPDATE ai_feedback
     SET status = 'in_lavorazione',
         reviewed_by = $2::bigint,
         reviewed_at = NOW()
     WHERE id = $1
       AND COALESCE(status, 'da_valutare') = 'da_valutare'
     RETURNING *`,
    [id, user.id]
  );
  const feedback = feedbackResult.rows[0];
  if (!feedback) return null;
  const content = String(input.content || `Domanda operatore:\n${feedback.question}\n\nRisposta AI:\n${feedback.answer}\n\nFeedback:\n${feedback.comment || feedback.feedback_type}`).trim();
  try {
    const note = await createKnowledgeNote({
      title: input.title || `Miglioramento AI #${feedback.id}`,
      category: input.category || "Formazione operatori",
      source: input.source || "Feedback Assistente IA OroActive",
      content,
      status: "approvata"
    }, user);
    await pool.query(
      `UPDATE ai_feedback
       SET status = 'approvato',
           knowledge_note_id = $2::bigint,
           reviewed_by = $3::bigint,
           reviewed_at = NOW()
       WHERE id = $1`,
      [id, note.id, user.id]
    );
    return note;
  } catch (error) {
    await pool.query(
      `UPDATE ai_feedback
       SET status = 'da_valutare',
           reviewed_by = NULL,
           reviewed_at = NULL
       WHERE id = $1
         AND status = 'in_lavorazione'`,
      [id]
    ).catch((restoreError) => {
      console.error("AI FEEDBACK RESTORE ERROR", restoreError);
    });
    throw error;
  }
}

async function deleteAiFeedback(id, user) {
  const result = await pool.query(
    `UPDATE ai_feedback
     SET status = 'eliminato',
         reviewed_by = $2::bigint,
         reviewed_at = NOW()
     WHERE id = $1
       AND COALESCE(status, 'da_valutare') = 'da_valutare'
     RETURNING id`,
    [id, user.id]
  );
  return result.rowCount > 0;
}

async function searchAiChunksBySource(question = "", sourceType = "book", limit = 6) {
  const text = String(question || "").trim();
  if (!text) return [];
  if (!aiRuntime.pgvector) {
    console.log("pgvector non disponibile, uso ricerca testuale fallback");
  }
  const sourceCondition = sourceType === "note"
    ? "d.metadata->>'sourceType' = 'note'"
    : "(d.metadata->>'sourceType' = 'book' OR d.metadata->>'sourceType' IS NULL)";
  const fullTextResult = await pool.query(
    `SELECT c.id, c.title, c.content, c.chunk_index, d.titolo, d.autore, d.metadata,
            ts_rank_cd(c.content_tsv, plainto_tsquery('italian', $1)) AS score
     FROM ai_document_chunks c
     JOIN ai_documents d ON d.id = c.document_id
     WHERE (${sourceCondition})
       AND (c.content_tsv @@ plainto_tsquery('italian', $1) OR c.content ILIKE $2)
     ORDER BY score DESC, c.created_at DESC
     LIMIT $3`,
    [text, `%${text.slice(0, 120)}%`, limit]
  );
  if (fullTextResult.rows.length) return fullTextResult.rows;
  const terms = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 4)
    .slice(0, 8);
  if (!terms.length) return [];
  const fallback = await pool.query(
    `SELECT c.id, c.title, c.content, c.chunk_index, d.titolo, d.autore, d.metadata, 0 AS score
     FROM ai_document_chunks c
     JOIN ai_documents d ON d.id = c.document_id
     WHERE (${sourceCondition})
       AND EXISTS (
         SELECT 1 FROM unnest($1::text[]) term
         WHERE LOWER(c.content) LIKE '%' || term || '%'
       )
     ORDER BY c.created_at DESC
     LIMIT $2::integer`,
    [terms, limit]
  );
  return fallback.rows;
}

async function searchAiChunks(question = "") {
  const [bookChunks, noteChunks, academyChunks] = await Promise.all([
    searchAiChunksBySource(question, "book", 6),
    searchAiChunksBySource(question, "note", 6),
    searchAcademyKnowledgeChunks(question, 4)
  ]);
  return [...bookChunks.slice(0, 5), ...noteChunks.slice(0, 4), ...academyChunks.slice(0, 3)].slice(0, 10);
}

async function searchAcademyKnowledgeChunks(question = "", limit = 4) {
  const text = String(question || "").trim();
  if (!text) return [];
  const terms = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 4)
    .slice(0, 8);
  if (!terms.length) return [];
  const result = await pool.query(
    `SELECT c.id, c.title, COALESCE(c.description, '') AS course_description,
            COALESCE(l.title, '') AS lesson_title,
            COALESCE(l.description, '') AS lesson_description,
            COALESCE(m.title, '') AS material_title,
            COALESCE(m.external_url, m.file_url, '') AS material_url
     FROM courses c
     LEFT JOIN academy_lessons l ON l.course_id = c.id
     LEFT JOIN academy_materials m ON m.course_id = c.id
     WHERE c.active = TRUE
       AND EXISTS (
         SELECT 1 FROM unnest($1::text[]) term
         WHERE LOWER(COALESCE(c.title, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(l.title, '') || ' ' || COALESCE(l.description, '') || ' ' || COALESCE(m.title, '')) LIKE '%' || term || '%'
       )
     ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
     LIMIT $2::integer`,
    [terms, limit]
  );
  return result.rows.map((row, index) => ({
    id: `academy-${row.id}-${index}`,
    title: row.title,
    titolo: row.title,
    autore: "OroActive Academy",
    chunk_index: index,
    metadata: { sourceType: "academy", materialUrl: row.material_url },
    score: 0,
    content: [
      row.title,
      row.course_description,
      row.lesson_title,
      row.lesson_description,
      row.material_title,
      row.material_url
    ].filter(Boolean).join("\n")
  }));
}

function sanitizeQuestionForWebSearch(question = "") {
  return String(question || "")
    .replace(/[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]/gi, "[codice fiscale]")
    .replace(/\b\d{2,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function webSearchFallback(question = "") {
  const query = sanitizeQuestionForWebSearch(question);
  if (!query) return { available: false, results: [] };

  try {
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", "5");
      url.searchParams.set("country", "IT");
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY
        }
      });
      if (!response.ok) throw new Error(`Brave Search HTTP ${response.status}`);
      const payload = await response.json();
      const results = (payload.web?.results || []).slice(0, 5).map((item) => ({
        title: item.title || "",
        url: item.url || "",
        snippet: item.description || ""
      }));
      return { available: true, provider: "Brave Search", results };
    }

    if (process.env.WEB_SEARCH_ENDPOINT) {
      const url = new URL(process.env.WEB_SEARCH_ENDPOINT);
      url.searchParams.set("q", query);
      const response = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error(`Web search HTTP ${response.status}`);
      const payload = await response.json();
      const rawResults = Array.isArray(payload.results) ? payload.results : Array.isArray(payload.items) ? payload.items : [];
      const results = rawResults.slice(0, 5).map((item) => ({
        title: item.title || item.name || "",
        url: item.url || item.link || "",
        snippet: item.snippet || item.description || item.summary || ""
      }));
      return { available: true, provider: "Web Search", results };
    }
  } catch (error) {
    console.error("AI WEB FALLBACK ERROR", error.message || error);
    return { available: true, error: error.message || "Ricerca web non riuscita", results: [] };
  }

  return { available: false, results: [] };
}

async function askOroActiveAssistant(question = "", options = {}) {
  const domanda = String(question || "").trim();
  if (!domanda) {
    const error = new Error("Inserisci una domanda per l'assistente.");
    error.status = 400;
    throw error;
  }

  const chunks = limitAssistantContext(await searchAiChunks(domanda));
  const hasContext = chunks.length > 0;
  const hasBookContext = chunks.some((chunk) => !["note", "academy"].includes(chunk.metadata?.sourceType));
  const hasApprovedKnowledge = chunks.some((chunk) => chunk.metadata?.sourceType === "note");
  const hasAcademyContext = chunks.some((chunk) => chunk.metadata?.sourceType === "academy");
  const shouldUseWeb = chunks.length < 3 || options.allowWeb === true;
  const web = shouldUseWeb ? await webSearchFallback(domanda) : { available: false, results: [] };
  const mode = options.mode === "quiz" ? "quiz" : "chat";
  const context = chunks.map((chunk, index) => (
    `[Fonte ${index + 1}: ${chunk.metadata?.sourceType === "note" ? "Procedura OroActive approvata" : chunk.metadata?.sourceType === "academy" ? "Materiale OroActive Academy" : "La bilancia d'oro"} - ${chunk.titolo || "Knowledge base"}, chunk ${chunk.chunk_index}]\n${chunk.content}`
  )).join("\n\n---\n\n");
  const webContext = (web.results || []).map((item, index) => (
    `[Web ${index + 1}: ${item.title || "Fonte web"}]\n${item.snippet || ""}\n${item.url || ""}`
  )).join("\n\n---\n\n");

  if (!openai) {
    return {
      risposta: "Questa informazione non è presente nella knowledge base OroActive.",
      fonte: web.available && web.results?.length ? "Fonti interne non sufficienti, risposta basata su ricerca esterna" : hasAcademyContext ? "Procedura OroActive approvata" : hasApprovedKnowledge ? (hasBookContext ? "La bilancia d'oro + Procedura OroActive approvata" : "Procedura OroActive approvata") : hasBookContext ? "La bilancia d'oro" : "Integrazione generale",
      dal_libro: false,
      citazioni: [],
      risultati: chunks.map((chunk) => ({
        titolo: chunk.titolo,
        autore: chunk.autore,
        chunk_index: chunk.chunk_index,
        score: Number(chunk.score || 0)
      })),
      error: "OpenAI non configurato"
    };
  }

  try {
    const client = openai;
    const result = await client.responses.create({
      model: openaiModel,
      input: `Sei l'Assistente IA OroActive, esperto di compro oro, oro, argento, platino, diamanti, gemme, gestione negozio, procedure operative e formazione operatori.
Rispondi sempre in italiano, in modo chiaro, pratico, professionale.
Usa prima il libro "La bilancia d'oro" di Christian Dinato, poi le procedure/conoscenze OroActive approvate.
Le conoscenze OroActive approvate possono essere piu recenti e operative del libro: se sono piu dettagliate, integrale alla risposta senza ignorarle.
Se il contesto della knowledge base e sufficiente, rispondi usando solo i passaggi forniti.
Se il contesto interno e parziale o assente e sono presenti risultati web, integra con la sezione "Risposta integrata con ricerca web" citando solo i risultati web forniti.
Se il contesto non contiene abbastanza informazioni e non sono presenti risultati web, devi scrivere esattamente: "Non ho trovato una risposta sufficiente nelle fonti interne e la ricerca Internet non è disponibile."
Non inventare fonti web aggiornate: usa soltanto i risultati web forniti nel contesto.
Non attribuire al libro contenuti non presenti nei passaggi forniti.
Non citare leggi o norme come certe se non sono presenti nel contesto: in quel caso suggerisci verifica professionale.
Modalita richiesta: ${mode === "quiz" ? "Quiz Operatore. Genera un quiz formativo pratico con domande e risposte, basato sui passaggi trovati." : "Assistente operativo."}

CONTESTO KNOWLEDGE BASE:
${hasContext ? context : "Nessun passaggio trovato per questa domanda."}

CONTESTO RICERCA WEB:
${webContext || (web.available ? "Ricerca web disponibile ma senza risultati utili." : "Ricerca Internet non configurata sul backend.")}

DOMANDA:
${domanda}`,
      text: {
        format: {
          type: "json_schema",
          name: "assistente_oroactive",
          strict: true,
          schema: assistantAiSchema
        }
      }
    });

    const parsed = parseOpenAiJson(result);
    return {
      risposta: parsed.risposta || "",
      fonte: parsed.fonte || (web.available && web.results?.length ? "Risposta integrata con ricerca web" : hasAcademyContext ? "Procedura OroActive approvata" : hasApprovedKnowledge ? (hasBookContext ? "La bilancia d'oro + Procedura OroActive approvata" : "Procedura OroActive approvata") : hasBookContext ? "La bilancia d'oro" : "Integrazione generale"),
      dal_libro: Boolean(parsed.dal_libro && hasBookContext),
      citazioni: Array.isArray(parsed.citazioni) ? parsed.citazioni : [],
      risultati: chunks.map((chunk) => ({
        titolo: chunk.titolo,
        autore: chunk.autore,
        chunk_index: chunk.chunk_index,
        score: Number(chunk.score || 0)
      })),
      web: { available: Boolean(web.available), provider: web.provider || "", results: web.results || [] }
    };
  } catch (error) {
    return {
      risposta: web.available && web.results?.length
        ? "Ho trovato risultati web, ma l'AI non ha completato la risposta. Riprova tra poco."
        : "Non ho trovato una risposta sufficiente nelle fonti interne e la ricerca Internet non è disponibile.",
      fonte: web.available && web.results?.length ? "Fonti interne non sufficienti, risposta basata su ricerca esterna" : hasAcademyContext ? "Procedura OroActive approvata" : hasApprovedKnowledge ? (hasBookContext ? "La bilancia d'oro + Procedura OroActive approvata" : "Procedura OroActive approvata") : hasBookContext ? "La bilancia d'oro" : "Integrazione generale",
      dal_libro: false,
      citazioni: [],
      risultati: chunks.map((chunk) => ({
        titolo: chunk.titolo,
        autore: chunk.autore,
        chunk_index: chunk.chunk_index,
        score: Number(chunk.score || 0)
      })),
      error: error.message || "OpenAI non disponibile"
    };
  }
}

async function aiAssistantStatus() {
  const knowledge = await pool.query("SELECT COUNT(*)::int AS documents FROM ai_documents");
  const chunks = await pool.query("SELECT COUNT(*)::int AS chunks FROM ai_document_chunks");
  let vectorEmbeddings = 0;
  if (aiRuntime.pgvector && aiRuntime.vectorColumn) {
    const vectorColumn = sqlIdentifier(aiRuntime.vectorColumn);
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ai_document_chunks WHERE ${vectorColumn} IS NOT NULL`);
    vectorEmbeddings = result.rows[0]?.count || 0;
  }

  let jsonEmbeddings = 0;
  try {
    const jsonColumn = sqlIdentifier(aiRuntime.jsonColumn);
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ai_document_chunks WHERE ${jsonColumn} IS NOT NULL`);
    jsonEmbeddings = result.rows[0]?.count || 0;
  } catch {
    jsonEmbeddings = 0;
  }

  return {
    openai: Boolean(openai),
    pgvector: Boolean(aiRuntime.pgvector),
    fallback_full_text: !aiRuntime.pgvector,
    embeddings: vectorEmbeddings > 0 || jsonEmbeddings > 0,
    knowledge_base_loaded: Number(knowledge.rows[0]?.documents || 0) > 0 && Number(chunks.rows[0]?.chunks || 0) > 0,
    pgvector_message: aiRuntime.pgvectorMessage,
    vector_column: aiRuntime.vectorColumn,
    fallback: aiRuntime.pgvector ? "pgvector" : "full-text"
  };
}

function normalizeAct(input = {}, existing = null) {
  const practiceNumber = input.practiceNumber || existing?.practice_number || "";
  const parsed = parsePracticeNumber(practiceNumber);
  if (!parsed) {
    const error = new Error("Numero atto non valido. Usa formato OA-NEGOZIO-ANNO-NUMERO.");
    error.status = 400;
    throw error;
  }

  const payload = sanitizeForPostgres({ ...(existing?.payload || {}), ...input, practiceNumber });
  const actDate = dateOrNull(input.date || input.data_atto || existing?.data_atto);
  const oroWeight = materialWeight(payload, "Oro") || numberFrom(input.peso_oro ?? existing?.peso_oro);
  const totale = numberFrom(input.amount ?? input.totale ?? existing?.totale);
  const paymentMethod = input.paymentMethod || existing?.payment_method || "";
  const normalizedStatus = normalizeWorkflowStatus(input.status || existing?.status || "archived_incomplete");
  if (String(paymentMethod).toLowerCase().includes("contanti") && totale > 500 && !isDraftLikeStatus(normalizedStatus)) {
    const error = new Error("Il pagamento in contanti non puo superare 500 euro. Seleziona Bonifico o Assegno come pagamento a norma di legge.");
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
    id: nullIfEmpty(input.id || existing?.id),
    practiceNumber,
    store: input.store || existing?.store || "",
    storeCode: parsed.storeCode,
    actYear: parsed.year,
    actNumber: parsed.number,
    dataAtto: actDate,
    clienteNome: nullIfEmpty(input.name ?? input.cliente_nome ?? existing?.cliente_nome) || "",
    clienteCognome: nullIfEmpty(input.surname ?? input.cliente_cognome ?? existing?.cliente_cognome) || "",
    codiceFiscale: nullIfEmpty(input.fiscalCode ?? input.codice_fiscale ?? existing?.codice_fiscale) || "",
    telefono: nullIfEmpty(input.phone ?? input.telefono ?? existing?.telefono) || "",
    pesoOro: oroWeight,
    quotazione: quoteValue(payload, "Oro") || numberFrom(existing?.quotazione),
    totale,
    paymentMethod,
    iban,
    status: normalizedStatus,
    payload
  };
}

function isCashPaymentMethod(method = "") {
  return String(method || "").toLowerCase().includes("contanti");
}

function isDraftLikeStatus(status = "") {
  const normalized = normalizeWorkflowStatus(status).toLowerCase();
  return ["draft", "annullata", "deleted", "abandoned"].includes(normalized);
}

function amlMessage(ok) {
  return ok
    ? "Controllo contanti entro limite negli ultimi 7 giorni."
    : "Attenzione: questo cliente ha raggiunto o supererebbe il limite di 500€ in contanti negli ultimi 7 giorni. Per rispettare le norme antiriciclaggio, utilizzare un metodo di pagamento tracciabile.";
}

async function cashAntiMoneyLaunderingCheck(input = {}) {
  const fiscalCode = normalizeFiscalCode(input.codice_fiscale || input.fiscalCode || "");
  const clientId = input.cliente_id || input.clienteId || "";
  const currentAmount = numberFrom(input.importo_corrente ?? input.amount ?? input.totale ?? 0);
  const actDate = input.data_atto || input.date || new Date().toISOString().slice(0, 10);
  const actId = input.atto_id || input.actId || input.id || "";
  const where = [
    "LOWER(COALESCE(payment_method, '')) LIKE '%contanti%'",
    realCompletedStatusSql(),
    "data_atto BETWEEN ($1::date - INTERVAL '7 days') AND $1::date"
  ];
  const values = [dateOrNull(actDate) || new Date().toISOString().slice(0, 10)];
  if (fiscalCode) {
    values.push(fiscalCode);
    where.push(`UPPER(COALESCE(codice_fiscale, '')) = $${values.length}::text`);
  } else if (clientId) {
    values.push(clientId);
    where.push(`cliente_id = $${values.length}::bigint`);
  } else {
    return {
      ok: true,
      limite: 500,
      totale_ultimi_7_giorni: 0,
      importo_corrente: currentAmount,
      totale_previsto: currentAmount,
      residuo_disponibile: Math.max(0, 500 - currentAmount),
      superamento: Math.max(0, currentAmount - 500),
      messaggio: "Codice fiscale cliente non disponibile per il controllo contanti."
    };
  }
  if (actId) {
    values.push(String(actId));
    where.push(`id::text <> $${values.length}::text`);
  }
  const result = await pool.query(
    `SELECT COALESCE(SUM(totale), 0)::numeric AS total
     FROM ${actsTable}
     WHERE ${where.join(" AND ")}`,
    values
  );
  const previousTotal = Number(result.rows[0]?.total || 0);
  const predicted = previousTotal + currentAmount;
  const available = Math.max(0, 500 - previousTotal);
  const over = Math.max(0, predicted - 500);
  const ok = predicted <= 500;
  return {
    ok,
    limite: 500,
    totale_ultimi_7_giorni: Number(previousTotal.toFixed(2)),
    importo_corrente: Number(currentAmount.toFixed(2)),
    totale_previsto: Number(predicted.toFixed(2)),
    residuo_disponibile: Number(available.toFixed(2)),
    superamento: Number(over.toFixed(2)),
    messaggio: amlMessage(ok)
  };
}

async function saveAmlAlert({ check, act = {}, user = null, attoId = null }) {
  if (!check || Number(check.totale_previsto || 0) < 500) return;
  await pool.query(
    `INSERT INTO antiriciclaggio_alerts
      (cliente_id, codice_fiscale, atto_id, totale_ultimi_7_giorni, importo_corrente, totale_previsto, superamento, user_id)
     VALUES ($1::bigint,$2::text,$3::bigint,$4::numeric,$5::numeric,$6::numeric,$7::numeric,$8::bigint)`,
    [
      act.clienteId || act.cliente_id || null,
      normalizeFiscalCode(act.codiceFiscale || act.fiscalCode || ""),
      attoId || act.id || null,
      check.totale_ultimi_7_giorni || 0,
      check.importo_corrente || 0,
      check.totale_previsto || 0,
      check.superamento || 0,
      user?.id || null
    ]
  );
}

async function saveDocumentIntegrityLog(act = {}, attoId = null, user = null) {
  const legal = act.payload?.legalSignature || act.legalSignature || null;
  if (!legal?.documentHashSha256 || !attoId) return null;
  const result = await pool.query(
    `INSERT INTO document_integrity_logs
      (atto_id, practice_number, hash_sha256, timestamp_firma, geolocation, operator_id, payload)
     VALUES ($1::bigint,$2::text,$3::text,$4::timestamptz,$5::jsonb,$6::bigint,$7::jsonb)
     RETURNING *`,
    [
      attoId,
      act.practiceNumber || act.payload?.practiceNumber || "",
      legal.documentHashSha256,
      legal.timestamp || new Date().toISOString(),
      sanitizeForPostgres(legal.location || {}),
      legal.operatorId || user?.id || null,
      sanitizeForPostgres(legal)
    ]
  ).catch((error) => {
    console.error("DOCUMENT INTEGRITY LOG ERROR", error);
    return { rows: [] };
  });
  return result.rows[0] || null;
}

async function enforceCashAntiMoneyLaundering(act, user, existing = null) {
  if (!isCashPaymentMethod(act.paymentMethod)) return null;
  const check = await cashAntiMoneyLaunderingCheck({
    codice_fiscale: act.codiceFiscale,
    cliente_id: existing?.cliente_id || act.clienteId || null,
    data_atto: act.dataAtto,
    importo_corrente: act.totale,
    atto_id: existing?.id || act.id || null
  });
  if (!isDraftLikeStatus(act.status) && (existing?.id || act.id)) {
    await saveAmlAlert({ check, act, user, attoId: existing?.id || act.id || null });
  }
  if (!isDraftLikeStatus(act.status) && !check.ok) {
    const error = new Error(check.messaggio);
    error.status = 400;
    error.details = check;
    throw error;
  }
  act.payload = {
    ...(act.payload || {}),
    amlCashCheck: check
  };
  return check;
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
    status: normalizeWorkflowStatus(row.status || payload.status || "archived_incomplete"),
    createdAt: row.created_at || payload.createdAt || null,
    completedAt: row.completed_at || payload.completedAt || null,
    archivedAt: row.archived_at || payload.archivedAt || null,
    deletedAt: row.deleted_at || payload.deletedAt || null,
    deletedBy: row.deleted_by || payload.deletedBy || null,
    operatorId: row.operatore_id || payload.operatorId || payload.operatore_id || null,
    operatorUsername: row.operator_username || payload.operatorUsername || "",
    operatorName: [row.operator_nome, row.operator_cognome].filter(Boolean).join(" ") || payload.operatorName || ""
  };
}

async function initDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await setupAiVectorStorage();
  await bootstrapStores();
  await bootstrapAdminUser();
}

async function listBackups() {
  const result = await pool.query(
    `SELECT id, tipo, filename, percorso, stato, dettaglio, dimensione_bytes, n8n_ready, metadata, created_by, created_at, completed_at
     FROM backup_jobs
     ORDER BY created_at DESC
     LIMIT 60`
  );
  return result.rows.map((row) => ({
    ...row,
    mese: row.created_at ? new Date(row.created_at).toISOString().slice(0, 7) : "",
    download_disponibile: row.stato === "completato" && Boolean(row.percorso) && Number(row.dimensione_bytes || 0) > 0
  }));
}

async function latestBackupToday() {
  const result = await pool.query(
    `SELECT id FROM backup_jobs
     WHERE created_at::date = CURRENT_DATE
       AND tipo = 'giornaliero'
       AND stato = 'completato'
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function latestMonthlyBackup(monthKey) {
  const result = await pool.query(
    `SELECT id FROM backup_jobs
     WHERE tipo = 'mensile'
       AND filename LIKE $1
       AND stato = 'completato'
     ORDER BY created_at DESC
     LIMIT 1`,
    [`%${monthKey}%`]
  );
  return result.rows[0] || null;
}

async function backupPathFor(tipo, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const monthKey = `${year}_${month}`;
  const root = path.join(backupDirectory, `backup_${monthKey}`);
  const targetDir = tipo === "mensile" ? root : path.join(root, "giornalieri", `${year}_${month}_${day}`);
  await fs.mkdir(targetDir, { recursive: true });
  await Promise.all(backupFolders.map((folder) => fs.mkdir(path.join(root, folder), { recursive: true })));
  const filename = tipo === "mensile" ? `database_${monthKey}.sql` : `database_${year}_${month}_${day}.sql`;
  return { root, targetDir, filename, outputPath: path.join(targetDir, filename), monthKey };
}

async function writeBackupManifest({ tipo, root, targetDir, filename, monthKey, status, detail, size }) {
  const manifest = {
    app: "OroActive",
    tipo,
    mese: monthKey,
    filename,
    stato: status,
    dettaglio: detail,
    dimensione_bytes: size || 0,
    contenuto: [
      "database PostgreSQL completo",
      "atti di vendita",
      "clienti",
      "documenti fronte/retro",
      "codice fiscale fronte/retro",
      "foto preziosi",
      "contabili",
      "firme",
      "PDF",
      "utenti",
      "giacenza",
      "fusioni",
      "knowledge base AI",
      "formazione",
      "antifrode",
      "CRM"
    ],
    storage_futuro: "Predisposto per S3 / Cloudflare R2 / n8n",
    created_at: new Date().toISOString()
  };
  const manifestPath = path.join(tipo === "mensile" ? root : targetDir, "manifest_backup.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function runBackup(tipo = "giornaliero", user = {}) {
  const normalizedType = tipo === "mensile" ? "mensile" : "giornaliero";
  await fs.mkdir(backupDirectory, { recursive: true });
  const createdAt = new Date();
  const { root, targetDir, filename, outputPath, monthKey } = await backupPathFor(normalizedType, createdAt);
  const job = await pool.query(
    `INSERT INTO backup_jobs (tipo, filename, percorso, stato, dettaglio, n8n_ready, metadata, created_by)
     VALUES ($1::text, $2::text, $3::text, 'in corso', $4::text, TRUE, $5::jsonb, $6::bigint)
     RETURNING id`,
    [
      normalizedType,
      filename,
      outputPath,
      "Backup server PostgreSQL. Documenti, PDF, firme, foto, CRM, AI, formazione e antifrode sono inclusi nel dump database quando salvati nei record OroActive.",
      sanitizeForPostgres({ monthKey, folders: backupFolders, mode: "server" }),
      user.id || null
    ]
  );

  try {
    if (!process.env.DATABASE_URL) {
      await writeBackupManifest({
        tipo: normalizedType,
        root,
        targetDir,
        filename,
        monthKey,
        status: "completato",
        detail: "Backup logico creato. DATABASE_URL non configurato: nessun dump fisico eseguito.",
        size: 0
      });
      const logical = await pool.query(
        `UPDATE backup_jobs
         SET stato = 'completato',
             dettaglio = $2::text,
             metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
             completed_at = NOW()
         WHERE id = $1::bigint
         RETURNING id, tipo, filename, stato, dettaglio, dimensione_bytes, n8n_ready, metadata, created_by, created_at, completed_at`,
        [
          job.rows[0].id,
          "Backup logico creato. Configura DATABASE_URL per includere dump fisico PostgreSQL.",
          sanitizeForPostgres({ logical_backup: true, content: backupFolders })
        ]
      );
      return logical.rows[0];
    }
    await execFileAsync(pgDumpPath, [process.env.DATABASE_URL, "--file", outputPath, "--no-owner", "--no-privileges"], {
      timeout: 15 * 60 * 1000,
      maxBuffer: 1024 * 1024
    });
    const stats = await fs.stat(outputPath);
    await writeBackupManifest({
      tipo: normalizedType,
      root,
      targetDir,
      filename,
      monthKey,
      status: "completato",
      detail: "Backup completato e protetto lato server.",
      size: stats.size
    });
    const result = await pool.query(
      `UPDATE backup_jobs
       SET stato = 'completato',
           dettaglio = $2,
           dimensione_bytes = $3,
           completed_at = NOW()
       WHERE id = $1
       RETURNING id, tipo, filename, stato, dettaglio, dimensione_bytes, n8n_ready, created_at, completed_at`,
      [job.rows[0].id, "Backup completato. Download protetto founder e predisposizione futura S3/R2/n8n.", stats.size]
    );
    return result.rows[0];
  } catch (error) {
    await writeBackupManifest({
      tipo: normalizedType,
      root,
      targetDir,
      filename,
      monthKey,
      status: "errore",
      detail: error.message || "Backup non riuscito",
      size: 0
    }).catch(() => {});
    const result = await pool.query(
      `UPDATE backup_jobs
       SET stato = 'errore',
           dettaglio = $2,
           completed_at = NOW()
       WHERE id = $1
       RETURNING id, tipo, filename, stato, dettaglio, dimensione_bytes, n8n_ready, created_at, completed_at`,
      [job.rows[0].id, error.message || "Backup non riuscito"]
    );
    return result.rows[0];
  }
}

async function backupDetail(id) {
  const result = await pool.query(
    `SELECT id, tipo, filename, percorso, stato, dettaglio, dimensione_bytes, n8n_ready, metadata, created_by, created_at, completed_at
     FROM backup_jobs
     WHERE id = $1::bigint`,
    [id]
  );
  return result.rows[0] || null;
}

async function deleteBackup(id) {
  const detail = await backupDetail(id);
  if (!detail) return false;
  const resolved = detail.percorso ? path.resolve(detail.percorso) : "";
  const allowedRoot = path.resolve(backupDirectory);
  if (resolved) {
    const relative = path.relative(allowedRoot, resolved);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      await fs.rm(resolved, { force: true }).catch(() => {});
    }
  }
  const result = await pool.query("DELETE FROM backup_jobs WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function runDailyBackupIfNeeded() {
  try {
    if (await latestBackupToday()) return;
    const result = await runBackup("giornaliero");
    console.log(`Backup OroActive ${result.stato}: ${result.filename || "senza file"}`);
  } catch (error) {
    console.error("Backup automatico non riuscito", error.message || error);
  }
}

async function runMonthlyBackupIfNeeded() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();
    if (!isLastDayOfMonth && process.env.FORCE_MONTHLY_BACKUP !== "true") return;
    const monthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (await latestMonthlyBackup(monthKey)) return;
    const result = await runBackup("mensile");
    console.log(`Backup mensile OroActive ${result.stato}: ${result.filename || "senza file"}`);
  } catch (error) {
    console.error("Backup mensile non riuscito", error.message || error);
  }
}

function scheduleBackups() {
  console.log("Backup automatici disabilitati: i backup partono solo dal pulsante manuale autorizzato.");
}

async function bootstrapStores() {
  for (const store of defaultStores) {
    await pool.query(
      `INSERT INTO negozi (nome, codice, citta, provincia, attivo)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (codice) DO UPDATE
       SET nome = EXCLUDED.nome,
           citta = COALESCE(negozi.citta, EXCLUDED.citta),
           provincia = COALESCE(negozi.provincia, EXCLUDED.provincia)`,
      [store.nome, store.codice, store.citta, store.provincia]
    );
  }
  await pool.query(`
    UPDATE utenti u
    SET negozio_id = n.id
    FROM negozi n
    WHERE u.negozio_id IS NULL
      AND u.negozio = n.nome
  `);
  await pool.query(`
    UPDATE atti_vendita a
    SET negozio_id = n.id,
        codice_negozio = COALESCE(a.codice_negozio, n.codice),
        numero_atto_negozio = COALESCE(a.numero_atto_negozio, a.act_number),
        operatore_id = COALESCE(a.operatore_id, CASE WHEN (a.payload->>'operatorId') ~ '^[0-9]+$' THEN (a.payload->>'operatorId')::bigint ELSE NULL END)
    FROM negozi n
    WHERE a.negozio_id IS NULL
      AND (a.store = n.nome OR a.store_code = n.codice)
  `);
}

async function bootstrapAdminUser() {
  const username = process.env.ADMIN_USERNAME || "Elite";
  const email = process.env.ADMIN_EMAIL || "elite@oroactive.it";
  const existing = await pool.query(
    "SELECT id FROM utenti WHERE LOWER(username) = LOWER($1::text) OR LOWER(email) = LOWER($2::text) LIMIT 1",
    [username, email]
  );
  const password = process.env.ADMIN_PASSWORD || (isProduction ? "" : "oroactive-dev-admin-password");
  if (!password) {
    const message = "ADMIN_PASSWORD obbligatoria: configura la password Founder nelle variabili ambiente.";
    if (existing.rowCount) {
      console.error(`${message} Founder già presente: mantengo credenziali esistenti.`);
      return;
    }
    console.error(`${message} Founder non creato automaticamente.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.rowCount) {
    await pool.query(
      `UPDATE utenti SET
        nome = $2,
        cognome = $3,
        username = $4,
        email = LOWER($5),
        password_hash = $6,
        ruolo = 'founder',
        negozio = $7,
        updated_at = NOW()
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

async function storeByCodeOrName(value = "") {
  const text = String(value || "").trim();
  if (!text || text === "Tutti") return null;
  const result = await pool.query(
    "SELECT * FROM negozi WHERE codice = $1 OR nome = $1 ORDER BY id LIMIT 1",
    [text]
  );
  return result.rows[0] || null;
}

async function storeForUser(user = {}) {
  if (user.negozio_id) {
    const result = await pool.query("SELECT * FROM negozi WHERE id = $1 LIMIT 1", [user.negozio_id]);
    if (result.rows[0]) return result.rows[0];
  }
  return storeByCodeOrName(user.negozio);
}

function canManageStores(user = {}) {
  return normalizeRole(user.ruolo) === "founder";
}

function canViewControlSections(user = {}) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user.ruolo));
}

async function listStores(user = {}) {
  if (roleSeesAllStores(user.ruolo)) {
    const result = await pool.query("SELECT * FROM negozi ORDER BY nome");
    return result.rows;
  }
  const store = await storeForUser(user);
  return store ? [store] : [];
}

async function createStore(input = {}, user = {}) {
  if (!canManageStores(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const nome = String(input.nome || input.name || "").trim();
  const codice = String(input.codice || input.code || storeCodeFromName(nome)).trim().toUpperCase();
  if (!nome || !codice) {
    const error = new Error("Nome negozio e codice negozio sono obbligatori.");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO negozi (nome, codice, indirizzo, citta, provincia, telefono, email, responsabile_id, attivo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, TRUE))
     ON CONFLICT (codice) DO UPDATE
     SET nome = EXCLUDED.nome,
         indirizzo = EXCLUDED.indirizzo,
         citta = EXCLUDED.citta,
         provincia = EXCLUDED.provincia,
         telefono = EXCLUDED.telefono,
         email = EXCLUDED.email,
         responsabile_id = EXCLUDED.responsabile_id,
         attivo = EXCLUDED.attivo
     RETURNING *`,
    [
      nome,
      codice,
      input.indirizzo || "",
      input.citta || "",
      input.provincia || "",
      input.telefono || "",
      input.email || "",
      input.responsabile_id || null,
      input.attivo !== false
    ]
  );
  return result.rows[0];
}

async function updateStore(id, input = {}, user = {}) {
  if (!canManageStores(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE negozi
     SET nome = COALESCE(NULLIF($2, ''), nome),
         codice = COALESCE(NULLIF($3, ''), codice),
         indirizzo = COALESCE($4, indirizzo),
         citta = COALESCE($5, citta),
         provincia = COALESCE($6, provincia),
         telefono = COALESCE($7, telefono),
         email = COALESCE($8, email),
         responsabile_id = COALESCE($9, responsabile_id),
         attivo = COALESCE($10, attivo)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      String(input.nome || input.name || "").trim(),
      String(input.codice || input.code || "").trim().toUpperCase(),
      input.indirizzo ?? null,
      input.citta ?? null,
      input.provincia ?? null,
      input.telefono ?? null,
      input.email ?? null,
      input.responsabile_id || null,
      typeof input.attivo === "boolean" ? input.attivo : null
    ]
  );
  return result.rows[0] || null;
}

async function visibleStoreWhere(user = {}, values = [], alias = "a") {
  if (roleSeesAllStores(user.ruolo)) return "";
  const store = await storeForUser(user);
  if (!store) return " AND 1 = 0";
  values.push(store.id, store.nome);
  return ` AND (${alias}.negozio_id = $${values.length - 1}::bigint OR ${alias}.store = $${values.length}::text)`;
}

function buildActsQuery({ store, field, q, fusionEligible, includeDrafts } = {}, user = null) {
  const where = [];
  const values = [];
  const shouldIncludeDrafts = includeDrafts === true || includeDrafts === "true";

  if (shouldIncludeDrafts) {
    where.push("deleted_at IS NULL AND COALESCE(status, '') NOT ILIKE 'deleted' AND COALESCE(status, '') NOT ILIKE 'Deleted' AND COALESCE(status, '') NOT ILIKE 'abandoned' AND COALESCE(status, '') NOT ILIKE 'Abandoned'");
  } else {
    where.push(visibleRealActStatusSql());
  }

  const effectiveStore = roleSeesAllStores(user?.ruolo) ? store : user?.negozio;
  if (effectiveStore && effectiveStore !== "Tutti") {
    values.push(effectiveStore);
    where.push(`store = $${values.length}::text`);
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
      where.push(`LOWER(${column}) LIKE $${values.length}::text`);
    }
  } else if (q) {
    values.push(`%${String(q).toLowerCase()}%`);
    const parameter = `$${values.length}::text`;
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
    `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY a.data_atto DESC NULLS LAST, a.act_number DESC NULLS LAST, a.updated_at DESC
     LIMIT ${limitParameter}::integer OFFSET ${offsetParameter}::integer`,
    values
  );
  return result.rows.map((row) => rowToAct(row, { full: false }));
}

async function nextActNumber(storeCode, year) {
  const result = await pool.query(
    `WITH used_numbers AS (
       SELECT DISTINCT COALESCE(numero_atto_negozio, act_number)::integer AS number
       FROM ${actsTable}
       WHERE COALESCE(codice_negozio, store_code) = $1::text
         AND act_year = $2::integer
         AND ${visibleRealActStatusSql()}
         AND COALESCE(numero_atto_negozio, act_number) IS NOT NULL
     ),
     candidates AS (
       SELECT generate_series(1, COALESCE((SELECT MAX(number) FROM used_numbers), 0) + 1) AS number
     )
     SELECT MIN(c.number)::integer AS next_number
     FROM candidates c
     LEFT JOIN used_numbers u ON u.number = c.number
     WHERE u.number IS NULL`,
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

async function enrichActStore(act, user) {
  const store = roleSeesAllStores(user?.ruolo)
    ? await storeByCodeOrName(act.storeCode || act.store)
    : await storeForUser(user);
  if (!store) return act;
  act.negozioId = store.id;
  act.store = store.nome;
  act.storeCode = store.codice;
  act.codiceNegozio = store.codice;
  act.practiceNumber = String(act.practiceNumber || "").replace(/^OA-[^-]+-/, `OA-${store.codice}-`);
  act.numeroAttoNegozio = act.actNumber;
  act.operatoreId = act.payload?.operatorId || user?.id || null;
  act.payload = {
    ...(act.payload || {}),
    store: store.nome,
    storeCode: store.codice,
    negozio_id: store.id,
    codice_negozio: store.codice,
    operatore_id: act.operatoreId
  };
  return act;
}

async function findExisting(identifier) {
  const result = await pool.query(`SELECT * FROM ${actsTable} WHERE id::text = $1::text OR practice_number = $1::text LIMIT 1`, [
    String(identifier ?? "")
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
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function actorKey(user = {}) {
  return String(user.username || user.nome || "").trim().toLowerCase();
}

function actOwnerKey(row = {}) {
  const payload = row.payload || {};
  return String(payload.operatorUsername || payload.operatorName || "").trim().toLowerCase();
}

function actOwnerId(row = {}) {
  const payload = row.payload || {};
  return row.operatore_id || payload.operatorId || payload.operatore_id || null;
}

function canEditAct(row, user) {
  const ownerId = actOwnerId(row);
  if (ownerId && user?.id && String(ownerId) === String(user.id)) return true;
  return canReviewActs(user) || actOwnerKey(row) === actorKey(user);
}

function completedActEditError() {
  const error = new Error("Puoi modificare solo gli atti effettuati da te oppure gli atti autorizzati dal tuo ruolo.");
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
    citizenship: act.payload?.citizenship || act.citizenship || "",
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
  const completeClient = [
    act.clienteNome || act.name,
    act.clienteCognome || act.surname,
    fiscalCode,
    payload.birthDate,
    payload.birthPlace,
    payload.address,
    payload.residenceProvince,
    payload.documentType,
    payload.documentNumber,
    payload.documentExpiry,
    act.telefono || act.phone
  ].every((value) => String(value || "").trim());
  if (!completeClient || isDraftLikeStatus(act.status)) {
    console.log("Cliente non inserito nel CRM: scheda cliente incompleta o atto in bozza", {
      fiscalCode: fiscalCode ? "***" : "",
      status: act.status || ""
    });
    return null;
  }
  const values = [
    fiscalCode,
    nullIfEmpty(act.clienteNome || act.name),
    nullIfEmpty(act.clienteCognome || act.surname),
    nullIfEmpty(act.telefono || act.phone),
    nullIfEmpty(act.payload?.email || act.email),
    nullIfEmpty(act.iban || act.payload?.iban),
    nullIfEmpty(act.negozioId || act.negozio_id || act.payload?.negozio_id),
    nullIfEmpty(payload.address),
    nullIfEmpty(payload.residenceProvince),
    nullIfEmpty(payload.documentType),
    nullIfEmpty(payload.documentNumber),
    nullIfEmpty(payload.paymentMethod),
    nullIfEmpty(act.payload?.accountHolder || act.intestatario_conto || act.accountHolder),
    sanitizeForPostgres(payload)
  ];
  const existing = await pool.query("SELECT id FROM clienti WHERE UPPER(codice_fiscale) = $1::text LIMIT 1", [fiscalCode]);
  const result = existing.rowCount
    ? await pool.query(
      `UPDATE clienti SET
        nome = COALESCE(NULLIF($2::text, ''), nome),
        cognome = COALESCE(NULLIF($3::text, ''), cognome),
        telefono = COALESCE(NULLIF($4::text, ''), telefono),
        email = COALESCE(NULLIF($5::text, ''), email),
        iban = COALESCE(NULLIF($6::text, ''), iban),
        negozio_id = COALESCE($7::bigint, negozio_id),
        indirizzo = COALESCE(NULLIF($8::text, ''), indirizzo),
        provincia = COALESCE(NULLIF($9::text, ''), provincia),
        documento_tipo = COALESCE(NULLIF($10::text, ''), documento_tipo),
        documento_numero = COALESCE(NULLIF($11::text, ''), documento_numero),
        metodo_pagamento = COALESCE(NULLIF($12::text, ''), metodo_pagamento),
        intestatario_conto = COALESCE(NULLIF($13::text, ''), intestatario_conto),
        archiviato = FALSE,
        payload = COALESCE(payload, '{}'::jsonb) || COALESCE($14::jsonb, '{}'::jsonb),
        updated_at = NOW()
       WHERE id = $15::bigint
       RETURNING *`,
      [...values, existing.rows[0].id]
    )
    : await pool.query(
      `INSERT INTO clienti
        (codice_fiscale, nome, cognome, telefono, email, iban, negozio_id, indirizzo, provincia, documento_tipo, documento_numero, metodo_pagamento, intestatario_conto, payload)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::bigint, $8::text, $9::text, $10::text, $11::text, $12::text, $13::text, $14::jsonb)
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
     WHERE UPPER(codice_fiscale) = $1::text
       AND ${realCompletedStatusSql()}
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [normalized]
  );
  const latestAct = latestActResult.rowCount ? rowToAct(latestActResult.rows[0]) : null;
  const result = await pool.query(
    "SELECT * FROM clienti WHERE UPPER(codice_fiscale) = $1::text LIMIT 1",
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
  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    fiscalCode: row.codice_fiscale,
    name: row.nome || payload.name || "",
    surname: row.cognome || payload.surname || "",
    phone: row.telefono || "",
    email: row.email || "",
    iban: row.iban || payload.iban || "",
    address: row.indirizzo || payload.address || "",
    province: row.provincia || payload.residenceProvince || "",
    documentType: row.documento_tipo || payload.documentType || "",
    documentNumber: row.documento_numero || payload.documentNumber || "",
    paymentMethod: row.metodo_pagamento || payload.paymentMethod || "",
    accountHolder: row.intestatario_conto || payload.accountHolder || "",
    level: row.livello_cliente || "nuovo",
    notes: row.note_interne || "",
    archived: Boolean(row.archiviato)
  };
}

function attachmentByKey(attachments = [], matcher) {
  const item = attachments.find((attachment) => matcher(String(attachment.key || "")));
  return item?.dataUrl || item?.url || "";
}

function publicClientLookup(row) {
  if (!row) return { found: false };
  const payload = row.payload || {};
  const attachments = Array.isArray(payload.fiscalDocumentAttachments)
    ? payload.fiscalDocumentAttachments
    : Array.isArray(payload.captureAttachments)
      ? payload.captureAttachments
      : [];
  return {
    found: true,
    cliente: {
      nome: row.nome || payload.name || "",
      cognome: row.cognome || payload.surname || "",
      codice_fiscale: row.codice_fiscale || payload.fiscalCode || "",
      data_nascita: payload.birthDate || "",
      luogo_nascita: payload.birthPlace || "",
      provincia_nascita: payload.birthProvince || "",
      sesso: payload.sex || "",
      cittadinanza: payload.citizenship || "",
      indirizzo_residenza: payload.address || "",
      provincia_residenza: payload.residenceProvince || "",
      telefono: row.telefono || payload.phone || "",
      email: row.email || payload.email || "",
      metodo_pagamento: payload.paymentMethod || "",
      iban: row.iban || payload.iban || "",
      intestatario_conto: payload.accountHolder || payload.intestatarioConto || "",
      note_pagamento: payload.paymentNotes || "",
      tipo_documento: payload.documentType || "",
      numero_documento: payload.documentNumber || "",
      data_rilascio_documento: payload.documentIssueDate || "",
      data_scadenza_documento: payload.documentExpiry || "",
      documenti: {
        documento_tipo: payload.documentType || "",
        documento_fronte_url: attachmentByKey(attachments, (key) => key.startsWith("documento-fronte")),
        documento_retro_url: attachmentByKey(attachments, (key) => key.startsWith("documento-retro")),
        codice_fiscale_fronte_url: attachmentByKey(attachments, (key) => key === "codice-fiscale-fronte"),
        codice_fiscale_retro_url: attachmentByKey(attachments, (key) => key === "codice-fiscale-retro")
      }
    }
  };
}

async function dashboardKpis(user = {}) {
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const result = await pool.query(
    `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     WHERE ${realCompletedStatusSql("a")}
       ${storeWhere}
     ORDER BY a.data_atto DESC NULLS LAST
     LIMIT 1000`,
    values
  );
  const acts = result.rows.map((row) => rowToAct(row));
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sum = (rows, getter) => rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
  const dailyActs = acts.filter((act) => String(act.date || "").slice(0, 10) === today);
  const weeklyActs = acts.filter((act) => String(act.date || "").slice(0, 10) >= weekAgo);
  const monthlyActs = acts.filter((act) => String(act.date || "").slice(0, 7) === month);
  const materials = acts.flatMap(materialLotsFromAct);
  const dailyMaterials = dailyActs.flatMap(materialLotsFromAct);
  const monthlyMaterials = monthlyActs.flatMap(materialLotsFromAct);
  const weightByMetal = (rows) => rows.reduce((totals, row) => {
    totals[row.metal] = (totals[row.metal] || 0) + Number(row.weight || 0);
    return totals;
  }, {});
  const frequency = materials.reduce((items, row) => {
    const key = `${row.metal} ${row.title || ""}`.trim();
    items[key] = (items[key] || 0) + 1;
    return items;
  }, {});
  const byStore = acts.reduce((groups, act) => {
    const key = act.store || "Dato non inserito";
    groups[key] ||= { negozio: key, fatturato: 0, atti: 0, grammi: 0 };
    groups[key].fatturato += Number(act.amount || 0);
    groups[key].atti += 1;
    groups[key].grammi += Number(act.weight || 0);
    return groups;
  }, {});
  const byOperator = acts.reduce((groups, act) => {
    const key = act.operatorUsername || act.operatorName || "Dato non inserito";
    groups[key] ||= { operatore: key, fatturato: 0, atti: 0, grammi: 0 };
    groups[key].fatturato += Number(act.amount || 0);
    groups[key].atti += 1;
    groups[key].grammi += Number(act.weight || 0);
    return groups;
  }, {});
  const paymentSplit = acts.reduce((groups, act) => {
    const key = act.paymentMethod || "Dato non inserito";
    groups[key] = (groups[key] || 0) + Number(act.amount || 0);
    return groups;
  }, {});
  const estimatedMargin = (rows) => sum(rows, (act) => act.amount) * 0.08;
  const incomplete = acts.filter((act) => !["completed", "archived_completed"].includes(normalizeWorkflowStatus(act.status))).length;
  const expiredDocuments = acts.filter((act) => act.documentExpiry && new Date(act.documentExpiry) < new Date()).length;
  const missingUploads = acts.filter((act) => !Array.isArray(act.captureAttachments) || act.captureAttachments.length < 2).length;
  const fusedActs = acts.filter((act) => act.fusion?.fused);
  const openLots = acts.filter((act) => !act.fusion?.fused && daysBetween(act.date, today) >= 10).length;
  const bestStore = Object.values(byStore).sort((a, b) => b.fatturato - a.fatturato)[0] || null;
  const lowOperator = Object.values(byOperator).sort((a, b) => (a.fatturato / Math.max(a.atti, 1)) - (b.fatturato / Math.max(b.atti, 1)))[0] || null;
  const alerts = [
    { label: "Atti incompleti", value: incomplete, detail: "Da completare o verificare" },
    { label: "Documenti scaduti", value: expiredDocuments, detail: "Controllo legale richiesto" },
    { label: "Upload mancanti", value: missingUploads, detail: "Documenti o foto da integrare" }
  ];
  const insights = [
    bestStore ? { title: "Negozio piu performante", level: "trend", text: `${bestStore.negozio} guida il periodo con ${bestStore.atti} atti e ${Number(bestStore.grammi || 0).toFixed(2)} gr.` } : null,
    lowOperator ? { title: "Operatore da monitorare", level: "attenzione", text: `${lowOperator.operatore} ha media acquisto piu bassa: verificare margini e formazione.` } : null,
    openLots ? { title: "Fusioni consigliate", level: "operativo", text: `${openLots} atti risultano fondibili: pianificare invio in raffineria.` } : null
  ].filter(Boolean);
  return {
    kpi: {
      fatturato_giornaliero: sum(dailyActs, (act) => act.amount),
      fatturato_settimanale: sum(weeklyActs, (act) => act.amount),
      fatturato_mensile: sum(monthlyActs, (act) => act.amount),
      numero_atti_giornalieri: dailyActs.length,
      numero_atti_mensili: monthlyActs.length,
      media_acquisto_giorno: dailyActs.length ? sum(dailyActs, (act) => act.amount) / dailyActs.length : 0,
      media_margine: 8,
      utile_giornaliero: estimatedMargin(dailyActs),
      utile_settimanale: estimatedMargin(weeklyActs),
      utile_mensile: estimatedMargin(monthlyActs),
      contanti_erogati: paymentSplit.Contanti || paymentSplit.contanti || 0,
      bonifici: paymentSplit.Bonifico || paymentSplit.bonifico || 0,
      grammi_giornalieri: weightByMetal(dailyMaterials),
      grammi_mensili: weightByMetal(monthlyMaterials)
    },
    alerts,
    insights,
    fusioni: {
      "Lotti aperti": openLots,
      "Atti inviati in fusione": fusedActs.length,
      "Profitto fusioni stimato": estimatedMargin(fusedActs)
    },
    carature_frequenti: Object.entries(frequency).map(([titolo, count]) => ({ titolo, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    pagamenti: paymentSplit,
    ranking_negozi: Object.values(byStore).sort((a, b) => b.fatturato - a.fatturato),
    ranking_operatori: Object.values(byOperator).sort((a, b) => b.fatturato - a.fatturato)
  };
}

async function oroActiveIntelligence(user = {}) {
  const data = await dashboardKpis(user);
  const insights = [...(data.insights || [])];
  const gold = Number(data.kpi?.grammi_mensili?.Oro || 0);
  const silver = Number(data.kpi?.grammi_mensili?.Argento || 0);
  const platinum = Number(data.kpi?.grammi_mensili?.Platino || 0);
  if (gold > silver * 3 && gold > 0) {
    insights.push({
      title: "Trend metalli",
      level: "business",
      text: "Il peso dell'oro acquistato supera nettamente gli altri metalli: monitorare quotazioni e timing fusione."
    });
  }
  if (platinum > 0) {
    insights.push({
      title: "Platino in giacenza",
      level: "operativo",
      text: "Presente platino acquistato: tenere separato per titolo e pianificare raffineria dedicata."
    });
  }
  return {
    generated_at: new Date().toISOString(),
    insights,
    suggerimenti: [
      "Controllare giornalmente documenti scaduti e upload mancanti.",
      "Verificare limite contanti prima del completamento pratica.",
      "Pianificare fusioni degli atti fondibili per ridurre immobilizzo di giacenza."
    ]
  };
}

async function createAntifraudAlert(input = {}) {
  const duplicate = await pool.query(
    `SELECT id FROM antifrode_alerts
     WHERE COALESCE(atto_id, 0) = COALESCE($1::bigint, 0)
       AND COALESCE(cliente_id, 0) = COALESCE($2::bigint, 0)
       AND tipo_alert = $3::text
       AND COALESCE(descrizione, '') = COALESCE($4::text, '')
       AND stato IN ('nuovo', 'in verifica')
     LIMIT 1`,
    [input.atto_id || null, input.cliente_id || null, input.tipo_alert || "", input.descrizione || ""]
  );
  if (duplicate.rowCount) return null;
  const result = await pool.query(
    `INSERT INTO antifrode_alerts (cliente_id, atto_id, tipo_alert, livello, descrizione, stato, creato_da_sistema)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,'nuovo',TRUE)
     RETURNING *`,
    [input.cliente_id || null, input.atto_id || null, input.tipo_alert, input.livello || "medio", input.descrizione || ""]
  );
  return result.rows[0];
}

async function scanAntifraud(user = {}) {
  if (!canViewControlSections(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const actsResult = await pool.query(
    `SELECT * FROM ${actsTable} a
     WHERE ${realCompletedStatusSql("a")}
       ${storeWhere}
     ORDER BY a.updated_at DESC
     LIMIT 500`,
    values
  );
  let created = 0;
  for (const row of actsResult.rows) {
    const act = rowToAct(row);
    if (act.documentExpiry && new Date(act.documentExpiry) < new Date()) {
      if (await createAntifraudAlert({
        cliente_id: row.cliente_id,
        atto_id: row.id,
        tipo_alert: "documento_scaduto",
        livello: "alto",
        descrizione: `Documento scaduto nell'atto ${act.practiceNumber}.`
      })) created += 1;
    }
    if (Number(act.amount || 0) > 15000) {
      if (await createAntifraudAlert({
        cliente_id: row.cliente_id,
        atto_id: row.id,
        tipo_alert: "importo_anomalo",
        livello: "medio",
        descrizione: `Importo anomalo di ${act.amount} EUR nell'atto ${act.practiceNumber}.`
      })) created += 1;
    }
    if (Number(act.weight || 0) > 500) {
      if (await createAntifraudAlert({
        cliente_id: row.cliente_id,
        atto_id: row.id,
        tipo_alert: "peso_anomalo",
        livello: "medio",
        descrizione: `Peso preziosi anomalo di ${act.weight} grammi nell'atto ${act.practiceNumber}.`
      })) created += 1;
    }
  }
  const cashResult = await pool.query(
    `SELECT ar.*
     FROM antiriciclaggio_alerts ar
     LEFT JOIN ${actsTable} a ON a.id = ar.atto_id
     WHERE ar.superamento > 0
       AND (ar.atto_id IS NULL OR (
         a.id IS NOT NULL
         AND a.deleted_at IS NULL
         AND COALESCE(a.status, '') NOT ILIKE 'deleted'
       ))
     ORDER BY ar.created_at DESC
     LIMIT 100`
  );
  for (const alert of cashResult.rows) {
    if (await createAntifraudAlert({
      cliente_id: alert.cliente_id,
      atto_id: alert.atto_id,
      tipo_alert: "contanti_limite",
      livello: "critico",
      descrizione: `Cliente vicino o oltre limite contanti: totale previsto ${alert.totale_previsto} EUR, superamento ${alert.superamento} EUR.`
    })) created += 1;
  }
  const repeatedClients = await pool.query(`
    SELECT cliente_id, codice_fiscale, COUNT(*)::int AS count, MAX(id) AS atto_id
    FROM ${actsTable}
    WHERE data_atto >= CURRENT_DATE - INTERVAL '7 days'
      AND ${realCompletedStatusSql()}
      AND codice_fiscale IS NOT NULL
    GROUP BY cliente_id, codice_fiscale
    HAVING COUNT(*) >= 3
    LIMIT 50
  `);
  for (const row of repeatedClients.rows) {
    if (await createAntifraudAlert({
      cliente_id: row.cliente_id,
      atto_id: row.atto_id,
      tipo_alert: "atti_ravvicinati",
      livello: "medio",
      descrizione: `Cliente con ${row.count} atti negli ultimi 7 giorni.`
    })) created += 1;
  }
  const duplicateIbans = await pool.query(`
    SELECT iban, COUNT(DISTINCT codice_fiscale)::int AS clients
    FROM ${actsTable}
    WHERE iban IS NOT NULL AND iban <> ''
      AND ${realCompletedStatusSql()}
    GROUP BY iban
    HAVING COUNT(DISTINCT codice_fiscale) > 1
    LIMIT 50
  `);
  for (const row of duplicateIbans.rows) {
    if (await createAntifraudAlert({
      tipo_alert: "iban_condiviso",
      livello: "alto",
      descrizione: `IBAN ${row.iban} usato da ${row.clients} clienti diversi.`
    })) created += 1;
  }
  const multiStoreClients = await pool.query(`
    SELECT codice_fiscale, COUNT(DISTINCT store)::int AS stores, COUNT(*)::int AS acts, MAX(id) AS atto_id
    FROM ${actsTable}
    WHERE data_atto >= CURRENT_DATE - INTERVAL '30 days'
      AND ${realCompletedStatusSql()}
      AND codice_fiscale IS NOT NULL
    GROUP BY codice_fiscale
    HAVING COUNT(DISTINCT store) > 1
    LIMIT 50
  `);
  for (const row of multiStoreClients.rows) {
    if (await createAntifraudAlert({
      atto_id: row.atto_id,
      tipo_alert: "vendite_multi_negozio",
      livello: "alto",
      descrizione: `Cliente con ${row.acts} atti distribuiti su ${row.stores} negozi negli ultimi 30 giorni.`
    })) created += 1;
  }
  const inconsistentFiscalCodes = await pool.query(`
    SELECT codice_fiscale, COUNT(DISTINCT LOWER(COALESCE(cliente_nome, '') || '|' || COALESCE(cliente_cognome, '')))::int AS variants, MAX(id) AS atto_id
    FROM ${actsTable}
    WHERE codice_fiscale IS NOT NULL AND codice_fiscale <> ''
      AND ${realCompletedStatusSql()}
    GROUP BY codice_fiscale
    HAVING COUNT(DISTINCT LOWER(COALESCE(cliente_nome, '') || '|' || COALESCE(cliente_cognome, ''))) > 1
    LIMIT 50
  `);
  for (const row of inconsistentFiscalCodes.rows) {
    if (await createAntifraudAlert({
      atto_id: row.atto_id,
      tipo_alert: "codice_fiscale_dati_diversi",
      livello: "critico",
      descrizione: `Codice fiscale associato a ${row.variants} varianti anagrafiche diverse.`
    })) created += 1;
  }
  const frequentUpdates = await pool.query(`
    SELECT route, COUNT(*)::int AS updates, MAX(created_at) AS last_update
    FROM audit_logs
    WHERE method IN ('PUT', 'PATCH')
      AND route LIKE '/api/atti/%'
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY route
    HAVING COUNT(*) >= 3
    LIMIT 50
  `).catch(() => ({ rows: [] }));
  for (const row of frequentUpdates.rows) {
    let identifier = String(row.route || "").replace("/api/atti/", "");
    try {
      identifier = decodeURIComponent(identifier);
    } catch {
      // Keep the raw route fragment if an old audit row contains malformed escaping.
    }
    const existing = await findExisting(identifier).catch(() => null);
    if (!existing || normalizeWorkflowStatus(existing.status) === "deleted" || existing.deleted_at) continue;
    if (await createAntifraudAlert({
      atto_id: existing.id,
      tipo_alert: "atto_modificato_piu_volte",
      livello: "medio",
      descrizione: `Atto ${identifier} modificato ${row.updates} volte negli ultimi 7 giorni.`
    })) created += 1;
  }
  return { ok: true, created };
}

async function listAntifraudAlerts(user = {}) {
  if (!canViewControlSections(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const result = await pool.query(
    `SELECT af.*, a.practice_number, a.store, a.cliente_nome, a.cliente_cognome
     FROM antifrode_alerts af
     LEFT JOIN ${actsTable} a ON a.id = af.atto_id
     WHERE (af.atto_id IS NULL OR (
       a.id IS NOT NULL
       AND a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
     ))
       ${storeWhere}
     ORDER BY af.created_at DESC
     LIMIT 200`,
    values
  );
  return result.rows;
}

async function updateAntifraudAlert(id, input = {}, user = {}) {
  if (!canViewControlSections(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE antifrode_alerts
     SET stato = COALESCE(NULLIF($2, ''), stato),
         reviewed_by = $3,
         reviewed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, input.stato || input.status || "", user.id]
  );
  return result.rows[0] || null;
}

function canManageCourses(user = {}) {
  return normalizeRole(user.ruolo) === "founder";
}

function canEvaluateCourses(user = {}) {
  return ["founder", "responsabile"].includes(normalizeRole(user.ruolo));
}

function courseCode(prefix = "OA") {
  return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function durationMinutesFromLabel(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return 0;
  const hours = Number((text.match(/(\d+(?:[.,]\d+)?)\s*h/) || [])[1]?.replace(",", ".") || 0);
  const minutes = Number((text.match(/(\d+)\s*m/) || [])[1] || 0);
  if (hours || minutes) return Math.round(hours * 60 + minutes);
  const numeric = Number(text.replace(",", "."));
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

async function ensureAcademyFaculty(name = "Facoltà Metalli Preziosi") {
  const normalized = String(name || "Facoltà Metalli Preziosi").trim() || "Facoltà Metalli Preziosi";
  const result = await pool.query(
    `INSERT INTO academy_faculties (name)
     VALUES ($1::text)
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [normalized]
  );
  return result.rows[0];
}

async function ensureCourseCategory(name = "Oro") {
  const result = await pool.query(
    `INSERT INTO course_categories (name)
     VALUES ($1::text)
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [String(name || "Oro").trim() || "Oro"]
  );
  return result.rows[0];
}

async function ensureCourseSection(categoryId, title = "Generale") {
  const normalizedTitle = String(title || "Generale").trim() || "Generale";
  const result = await pool.query(
    `INSERT INTO course_sections (category_id, title)
     VALUES ($1::bigint, $2::text)
     ON CONFLICT (category_id, title) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [categoryId, normalizedTitle]
  );
  return result.rows[0];
}

async function syncAcademyStructure(course, input = {}, user = {}) {
  if (!course?.id) return;
  const faculty = await ensureAcademyFaculty(input.faculty || input.faculty_name || "Facoltà Metalli Preziosi");
  const academyCourseResult = await pool.query(
    `INSERT INTO academy_courses
      (course_id, faculty_id, title, description, level, duration_minutes, teacher, thumbnail_url, final_certification, active, created_by)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, $6::integer, $7::text, $8::text, $9::boolean, $10::boolean, $11::bigint)
     ON CONFLICT (course_id)
     DO UPDATE SET faculty_id = EXCLUDED.faculty_id,
                   title = EXCLUDED.title,
                   description = EXCLUDED.description,
                   level = EXCLUDED.level,
                   duration_minutes = EXCLUDED.duration_minutes,
                   teacher = EXCLUDED.teacher,
                   thumbnail_url = EXCLUDED.thumbnail_url,
                   final_certification = EXCLUDED.final_certification,
                   active = EXCLUDED.active,
                   updated_at = NOW()
     RETURNING *`,
    [
      course.id,
      faculty.id,
      course.title || input.title || "",
      course.description || input.description || "",
      course.level || input.level || "Base",
      Number(course.duration_minutes || durationMinutesFromLabel(input.duration_label || input.duration || "")),
      course.teacher || input.teacher || "",
      course.thumbnail_url || input.thumbnail_url || "",
      course.final_certification !== false,
      course.active !== false,
      user.id || null
    ]
  );
  const academyCourse = academyCourseResult.rows[0];
  const moduleTitle = String(input.module_title || input.module || course.module_title || "Modulo introduttivo").trim() || "Modulo introduttivo";
  let moduleRow = (await pool.query(
    "SELECT * FROM academy_modules WHERE course_id = $1::bigint ORDER BY sort_order ASC, id ASC LIMIT 1",
    [course.id]
  )).rows[0];
  if (moduleRow) {
    moduleRow = (await pool.query(
      `UPDATE academy_modules
       SET academy_course_id = $2::bigint,
           title = $3::text,
           description = $4::text,
           active = TRUE,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [moduleRow.id, academyCourse.id, moduleTitle, course.description || input.description || ""]
    )).rows[0];
  } else {
    moduleRow = (await pool.query(
      `INSERT INTO academy_modules (academy_course_id, course_id, title, description)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::text)
       RETURNING *`,
      [academyCourse.id, course.id, moduleTitle, course.description || input.description || ""]
    )).rows[0];
  }
  const lessonTitle = String(input.lesson_title || input.lesson || course.lesson_title || "Lezione principale").trim() || "Lezione principale";
  const lessonPayload = [
    moduleRow?.id || null,
    course.id,
    lessonTitle,
    course.description || input.description || "",
    course.video_url || input.video_url || "",
    course.pdf_url || input.pdf_url || "",
    Number(course.duration_minutes || durationMinutesFromLabel(input.duration_label || input.duration || ""))
  ];
  let lessonRow = (await pool.query(
    "SELECT * FROM academy_lessons WHERE course_id = $1::bigint ORDER BY sort_order ASC, id ASC LIMIT 1",
    [course.id]
  )).rows[0];
  if (lessonRow) {
    lessonRow = (await pool.query(
      `UPDATE academy_lessons
       SET academy_module_id = $2::bigint,
           title = $3::text,
           description = $4::text,
           video_url = $5::text,
           pdf_url = $6::text,
           duration_minutes = $7::integer,
           active = TRUE,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [lessonRow.id, ...lessonPayload.filter((_, index) => index !== 1)]
    )).rows[0];
  } else {
    lessonRow = (await pool.query(
      `INSERT INTO academy_lessons (academy_module_id, course_id, title, description, video_url, pdf_url, duration_minutes)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, $6::text, $7::integer)
       RETURNING *`,
      lessonPayload
    )).rows[0];
  }
  const materialUrl = String(input.material_data_url || input.material_url || input.pdf_url || input.video_url || "").trim();
  if (lessonRow?.id && materialUrl) {
    await pool.query("DELETE FROM academy_materials WHERE course_id = $1::bigint", [course.id]);
    await pool.query(
      `INSERT INTO academy_materials (academy_lesson_id, course_id, title, material_type, file_url)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text)`,
      [
        lessonRow.id,
        course.id,
        input.material_filename || input.material_title || "Materiale Academy",
        input.material_type || "link",
        materialUrl
      ]
    );
  }
}

async function listCourses(user = {}) {
  const userId = user.id || null;
  const role = normalizeRole(user.ruolo);
  const faculties = await pool.query("SELECT * FROM academy_faculties WHERE active = TRUE ORDER BY sort_order ASC, name ASC");
  const categories = await pool.query("SELECT * FROM course_categories WHERE active = TRUE ORDER BY sort_order ASC, name ASC");
  const sections = await pool.query(
    `SELECT s.*, c.name AS category_name
     FROM course_sections s
     LEFT JOIN course_categories c ON c.id = s.category_id
     WHERE s.active = TRUE
     ORDER BY c.sort_order ASC, s.sort_order ASC, s.title ASC`
  );
  const courses = await pool.query(
    `SELECT c.*, cat.name AS category_name, sec.title AS section_title, faculty.name AS faculty_name,
            COALESCE(mat.file_url, '') AS material_url,
            COALESCE(mat.title, '') AS material_title,
            mat.id AS material_id,
            COALESCE(mat.material_type, '') AS material_type,
            COALESCE(lesson.id, 0) AS lesson_id,
            COALESCE(lesson.title, c.lesson_title, '') AS academy_lesson_title,
            COALESCE(lesson.video_url, c.video_url, '') AS academy_video_url,
            COALESCE(lesson.pdf_url, c.pdf_url, '') AS academy_pdf_url,
            COALESCE(module.title, c.module_title, '') AS academy_module_title,
            COALESCE(notes.note, '') AS user_note,
            COALESCE(progress.percentuale, 0) AS percentuale,
            COALESCE(progress.status, 'non iniziato') AS status
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN course_sections sec ON sec.id = c.section_id
     LEFT JOIN academy_faculties faculty ON faculty.id = c.faculty_id
     LEFT JOIN LATERAL (
       SELECT id, title
       FROM academy_modules
       WHERE course_id = c.id
       ORDER BY sort_order ASC, id ASC
       LIMIT 1
     ) module ON TRUE
     LEFT JOIN LATERAL (
       SELECT id, title, video_url, pdf_url
       FROM academy_lessons
       WHERE course_id = c.id
       ORDER BY sort_order ASC, id ASC
       LIMIT 1
     ) lesson ON TRUE
     LEFT JOIN LATERAL (
       SELECT id, title, material_type, file_url
       FROM course_materials
       WHERE course_id = c.id
       ORDER BY sort_order ASC, id ASC
       LIMIT 1
     ) mat ON TRUE
     LEFT JOIN user_course_progress progress ON progress.course_id = c.id AND progress.user_id = $1::bigint
     LEFT JOIN academy_user_notes notes ON notes.course_id = c.id AND notes.user_id = $1::bigint
     WHERE ($2::text = 'founder' OR c.active = TRUE)
     ORDER BY cat.sort_order ASC, c.order_index ASC, c.created_at DESC`,
    [userId, role]
  );
  const progress = await pool.query(
    "SELECT * FROM user_course_progress WHERE user_id = $1::bigint ORDER BY updated_at DESC",
    [userId]
  );
  const certificates = await pool.query(
    `SELECT cert.*, c.title AS course_title, cat.name AS category_name
     FROM course_certificates cert
     JOIN courses c ON c.id = cert.course_id
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     WHERE cert.user_id = $1::bigint AND cert.status = 'valido'
     ORDER BY cert.issued_at DESC`,
    [userId]
  );
  const badges = await pool.query(
    `SELECT badge.*, c.title AS course_title
     FROM course_badges badge
     LEFT JOIN courses c ON c.id = badge.course_id
     WHERE badge.user_id = $1::bigint
     ORDER BY badge.assigned_at DESC`,
    [userId]
  );
  return {
    faculties: faculties.rows,
    categories: categories.rows,
    sections: sections.rows,
    courses: courses.rows,
    progress: progress.rows,
    certificates: certificates.rows,
    badges: badges.rows
  };
}

async function createCourse(input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("Titolo corso obbligatorio.");
    error.status = 400;
    throw error;
  }
  const faculty = await ensureAcademyFaculty(input.faculty || input.faculty_name || "Facoltà Metalli Preziosi");
  const category = await ensureCourseCategory(input.category || "Oro");
  const section = await ensureCourseSection(category.id, input.section || "Generale");
  const durationLabel = String(input.duration_label || input.duration || "").trim();
  const media = await courseMediaUrlsFromInput(input, user);
  const enrichedInput = {
    ...input,
    thumbnail_url: media.thumbnailUrl,
    video_url: media.videoUrl,
    pdf_url: media.pdfUrl
  };
  const result = await pool.query(
    `INSERT INTO courses
      (category_id, section_id, faculty_id, title, description, level, duration_minutes, duration_label, teacher, thumbnail_url, final_certification, module_title, lesson_title, video_url, pdf_url, active, order_index, created_by)
     VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text, $5::text, $6::text, $7::integer, $8::text, $9::text, $10::text, $11::boolean, $12::text, $13::text, $14::text, $15::text, $16::boolean, $17::integer, $18::bigint)
     RETURNING *`,
    [
      category.id,
      section.id,
      faculty.id,
      title,
      String(input.description || "").trim(),
      input.level || "Base",
      durationMinutesFromLabel(durationLabel),
      durationLabel,
      input.teacher || "",
      enrichedInput.thumbnail_url || "",
      input.final_certification !== false,
      input.module_title || input.module || input.section || "Modulo introduttivo",
      input.lesson_title || input.lesson || "Lezione principale",
      enrichedInput.video_url || "",
      enrichedInput.pdf_url || "",
      input.active !== false,
      Number(input.order_index || 0),
      user.id
    ]
  );
  const materialUrl = String(input.material_data_url || input.material_url || "").trim();
  if (materialUrl) {
    const file = input.material_data_url
      ? await saveAcademyMaterialFile({
        file_data: input.material_data_url,
        mime_type: input.material_mime_type || input.material_type,
        filename: input.material_filename
      }, user)
      : null;
    enrichedInput.material_url = file?.fileUrl || materialUrl;
    enrichedInput.material_data_url = "";
    enrichedInput.material_type = input.material_type || file?.mimeType || (String(input.material_data_url || "").startsWith("data:") ? "file" : "link");
    await pool.query(
      `INSERT INTO course_materials (course_id, title, material_type, file_url)
       VALUES ($1::bigint, $2::text, $3::text, $4::text)`,
      [
        result.rows[0].id,
        input.material_filename || input.material_title || "Materiale corso",
        enrichedInput.material_type,
        enrichedInput.material_url
      ]
    );
  }
  await syncAcademyStructure(result.rows[0], enrichedInput, user);
  return result.rows[0];
}

async function updateCourse(id, input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("Titolo corso obbligatorio.");
    error.status = 400;
    throw error;
  }
  const faculty = await ensureAcademyFaculty(input.faculty || input.faculty_name || "Facoltà Metalli Preziosi");
  const category = await ensureCourseCategory(input.category || "Oro");
  const section = await ensureCourseSection(category.id, input.section || "Generale");
  const durationLabel = String(input.duration_label || input.duration || "").trim();
  const existing = await academyCourseById(id);
  const media = await courseMediaUrlsFromInput({
    thumbnail_url: input.thumbnail_url ?? existing?.thumbnail_url ?? "",
    video_url: input.video_url ?? existing?.video_url ?? "",
    pdf_url: input.pdf_url ?? existing?.pdf_url ?? "",
    thumbnail_data_url: input.thumbnail_data_url,
    thumbnail_mime_type: input.thumbnail_mime_type,
    thumbnail_filename: input.thumbnail_filename,
    video_data_url: input.video_data_url,
    video_mime_type: input.video_mime_type,
    video_filename: input.video_filename,
    pdf_data_url: input.pdf_data_url,
    pdf_mime_type: input.pdf_mime_type,
    pdf_filename: input.pdf_filename
  }, user);
  const enrichedInput = {
    ...input,
    thumbnail_url: media.thumbnailUrl,
    video_url: media.videoUrl,
    pdf_url: media.pdfUrl
  };
  const result = await pool.query(
    `UPDATE courses
     SET category_id = $2::bigint,
         section_id = $3::bigint,
         faculty_id = $4::bigint,
         title = $5::text,
         description = $6::text,
         level = $7::text,
         duration_minutes = $8::integer,
         duration_label = $9::text,
         teacher = $10::text,
         thumbnail_url = $11::text,
         final_certification = $12::boolean,
         module_title = $13::text,
         lesson_title = $14::text,
         video_url = $15::text,
         pdf_url = $16::text,
         active = $17::boolean,
         order_index = $18::integer,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      id,
      category.id,
      section.id,
      faculty.id,
      title,
      String(input.description || "").trim(),
      input.level || "Base",
      durationMinutesFromLabel(durationLabel),
      durationLabel,
      input.teacher || "",
      enrichedInput.thumbnail_url || "",
      input.final_certification !== false,
      input.module_title || input.module || input.section || "Modulo introduttivo",
      input.lesson_title || input.lesson || "Lezione principale",
      enrichedInput.video_url || "",
      enrichedInput.pdf_url || "",
      input.active !== false,
      Number(input.order_index || 0)
    ]
  );
  if (!result.rows[0]) return null;
  if (input.material_url !== undefined || input.material_data_url !== undefined) {
    await pool.query("DELETE FROM course_materials WHERE course_id = $1::bigint", [id]);
    const materialUrl = String(input.material_data_url || input.material_url || "").trim();
    if (materialUrl) {
      const file = input.material_data_url
        ? await saveAcademyMaterialFile({
          file_data: input.material_data_url,
          mime_type: input.material_mime_type || input.material_type,
          filename: input.material_filename
        }, user)
        : null;
      enrichedInput.material_url = file?.fileUrl || materialUrl;
      enrichedInput.material_data_url = "";
      enrichedInput.material_type = input.material_type || file?.mimeType || (String(input.material_data_url || "").startsWith("data:") ? "file" : "link");
      await pool.query(
        `INSERT INTO course_materials (course_id, title, material_type, file_url)
         VALUES ($1::bigint, $2::text, $3::text, $4::text)`,
        [
          id,
          input.material_filename || input.material_title || "Materiale corso",
          enrichedInput.material_type,
          enrichedInput.material_url
        ]
      );
    }
  }
  await syncAcademyStructure(result.rows[0], enrichedInput, user);
  return result.rows[0];
}

async function saveAcademyNote(input = {}, user = {}) {
  const courseId = input.course_id || input.courseId;
  let lessonId = input.lesson_id || input.lessonId || null;
  if (!lessonId) {
    lessonId = (await pool.query(
      "SELECT id FROM academy_lessons WHERE course_id = $1::bigint ORDER BY sort_order ASC, id ASC LIMIT 1",
      [courseId]
    )).rows[0]?.id || null;
  }
  const result = await pool.query(
    `INSERT INTO academy_user_notes (course_id, lesson_id, user_id, note)
     VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text)
     ON CONFLICT (course_id, lesson_id, user_id)
     DO UPDATE SET note = EXCLUDED.note, updated_at = NOW()
     RETURNING *`,
    [courseId, lessonId, user.id, String(input.note || "")]
  );
  return result.rows[0];
}

async function deleteCourse(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query("DELETE FROM courses WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function deleteCourseMaterial(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query("DELETE FROM course_materials WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function deleteCourseSection(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const linked = await pool.query("SELECT COUNT(*)::int AS count FROM courses WHERE section_id = $1::bigint", [id]);
  if (Number(linked.rows[0]?.count || 0) > 0) {
    const error = new Error("La sottosezione contiene corsi: elimina o sposta prima i corsi collegati.");
    error.status = 400;
    throw error;
  }
  const result = await pool.query("DELETE FROM course_sections WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function createAcademyFaculty(input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const name = String(input.name || input.nome || "").trim();
  if (!name) {
    const error = new Error("Nome facoltà obbligatorio.");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO academy_faculties (name, description, active)
     VALUES ($1::text, $2::text, TRUE)
     ON CONFLICT (name)
     DO UPDATE SET description = EXCLUDED.description,
                   active = TRUE,
                   updated_at = NOW()
     RETURNING *`,
    [name, String(input.description || "").trim()]
  );
  return result.rows[0];
}

async function updateAcademyFaculty(id, input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE academy_faculties
     SET name = COALESCE(NULLIF($2::text, ''), name),
         description = $3::text,
         active = COALESCE($4::boolean, active),
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [id, String(input.name || input.nome || "").trim(), String(input.description || "").trim(), input.active ?? input.attivo ?? null]
  );
  return result.rows[0] || null;
}

async function deleteAcademyFaculty(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const linked = await pool.query("SELECT COUNT(*)::int AS count FROM courses WHERE faculty_id = $1::bigint", [id]);
  if (Number(linked.rows[0]?.count || 0) > 0) {
    const result = await pool.query(
      "UPDATE academy_faculties SET active = FALSE, updated_at = NOW() WHERE id = $1::bigint RETURNING id",
      [id]
    );
    return result.rowCount > 0;
  }
  const result = await pool.query("DELETE FROM academy_faculties WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

function academyStatus(input, fallback = true) {
  if (typeof input.active === "boolean") return input.active;
  if (typeof input.attivo === "boolean") return input.attivo;
  if (typeof input.stato === "string") return !["non attivo", "inattivo", "false"].includes(input.stato.toLowerCase());
  return fallback;
}

function academyLevel(input = "Base") {
  const level = String(input || "Base").trim();
  return ["Base", "Intermedio", "Avanzato", "Master"].includes(level) ? level : "Base";
}

async function academyCourseById(courseId) {
  const result = await pool.query(
    `SELECT c.*, cat.name AS category_name, sec.title AS section_title, f.name AS faculty_name,
            ac.id AS academy_course_id
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN course_sections sec ON sec.id = c.section_id
     LEFT JOIN academy_faculties f ON f.id = c.faculty_id
     LEFT JOIN academy_courses ac ON ac.course_id = c.id
     WHERE c.id = $1::bigint
     LIMIT 1`,
    [courseId]
  );
  return result.rows[0] || null;
}

async function courseMediaUrlsFromInput(input = {}, user = {}) {
  const urls = {
    thumbnailUrl: String(input.thumbnail_url || "").trim(),
    videoUrl: String(input.video_url || "").trim(),
    pdfUrl: String(input.pdf_url || "").trim()
  };

  if (input.thumbnail_data_url) {
    const file = await saveAcademyMaterialFile({
      file_data: input.thumbnail_data_url,
      mime_type: input.thumbnail_mime_type,
      filename: input.thumbnail_filename
    }, user);
    urls.thumbnailUrl = file.fileUrl;
  }
  if (input.video_data_url) {
    const file = await saveAcademyMaterialFile({
      file_data: input.video_data_url,
      mime_type: input.video_mime_type,
      filename: input.video_filename
    }, user);
    urls.videoUrl = file.fileUrl;
  }
  if (input.pdf_data_url) {
    const file = await saveAcademyMaterialFile({
      file_data: input.pdf_data_url,
      mime_type: input.pdf_mime_type,
      filename: input.pdf_filename
    }, user);
    urls.pdfUrl = file.fileUrl;
  }
  return urls;
}

async function listAcademyCourses(query = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const where = [];
  const values = [];
  if (role !== "founder") where.push("c.active = TRUE");
  if (query.faculty_id) {
    values.push(query.faculty_id);
    where.push(`c.faculty_id = $${values.length}::bigint`);
  }
  if (query.q) {
    values.push(`%${String(query.q).toLowerCase()}%`);
    where.push(`(LOWER(c.title) LIKE $${values.length}::text OR LOWER(COALESCE(c.description, '')) LIKE $${values.length}::text)`);
  }
  const result = await pool.query(
    `SELECT c.*, cat.name AS category_name, sec.title AS section_title, f.name AS faculty_name,
            ac.id AS academy_course_id
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN course_sections sec ON sec.id = c.section_id
     LEFT JOIN academy_faculties f ON f.id = c.faculty_id
     LEFT JOIN academy_courses ac ON ac.course_id = c.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY f.sort_order ASC NULLS LAST, cat.sort_order ASC NULLS LAST, c.order_index ASC, c.created_at DESC`,
    values
  );
  return result.rows;
}

async function getAcademyCourse(courseId, user = {}) {
  const course = await academyCourseById(courseId);
  if (!course) return null;
  if (normalizeRole(user.ruolo) !== "founder" && course.active === false) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const modules = await listAcademyModules(courseId);
  for (const module of modules) {
    module.lessons = await listAcademyLessons(module.id);
    for (const lesson of module.lessons) {
      lesson.materials = await listAcademyMaterials(lesson.id);
    }
  }
  return { ...course, modules };
}

async function createAcademyCourse(input = {}, user = {}) {
  return createCourse({
    title: input.title || input.titolo,
    description: input.description || input.descrizione,
    faculty: input.faculty || input.faculty_name || input.facolta,
    category: input.category || input.categoria || "Oro",
    level: academyLevel(input.level || input.livello),
    duration_label: input.duration_label || input.durata_stimata || input.duration || "",
    teacher: input.teacher || input.docente || input.formatore || "",
    thumbnail_url: input.thumbnail_url || input.thumbnail || "",
    final_certification: input.certificazione_finale ?? input.final_certification ?? true,
    active: academyStatus(input, true),
    section: input.section || input.sottosezione || "Generale"
  }, user);
}

async function updateAcademyCourse(courseId, input = {}, user = {}) {
  return updateCourse(courseId, {
    title: input.title || input.titolo,
    description: input.description || input.descrizione,
    faculty: input.faculty || input.faculty_name || input.facolta,
    category: input.category || input.categoria || "Oro",
    level: academyLevel(input.level || input.livello),
    duration_label: input.duration_label || input.durata_stimata || input.duration || "",
    teacher: input.teacher || input.docente || input.formatore || "",
    thumbnail_url: input.thumbnail_url || input.thumbnail || "",
    final_certification: input.certificazione_finale ?? input.final_certification ?? true,
    active: academyStatus(input, true),
    section: input.section || input.sottosezione || "Generale"
  }, user);
}

async function listAcademyModules(courseId) {
  const result = await pool.query(
    `SELECT * FROM academy_modules
     WHERE course_id = $1::bigint AND active = TRUE
     ORDER BY sort_order ASC, id ASC`,
    [courseId]
  );
  return result.rows;
}

async function createAcademyModule(input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const courseId = input.course_id || input.courseId;
  const title = String(input.title || input.titolo || "").trim();
  if (!courseId || !title) {
    const error = new Error("Corso e titolo modulo obbligatori.");
    error.status = 400;
    throw error;
  }
  const academyCourse = (await pool.query("SELECT id FROM academy_courses WHERE course_id = $1::bigint LIMIT 1", [courseId])).rows[0];
  const result = await pool.query(
    `INSERT INTO academy_modules (academy_course_id, course_id, title, description, active)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::boolean)
     RETURNING *`,
    [academyCourse?.id || null, courseId, title, String(input.description || input.descrizione || ""), academyStatus(input, true)]
  );
  return result.rows[0];
}

async function updateAcademyModule(id, input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE academy_modules
     SET title = COALESCE(NULLIF($2::text, ''), title),
         description = $3::text,
         active = COALESCE($4::boolean, active),
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [id, String(input.title || input.titolo || "").trim(), String(input.description || input.descrizione || ""), input.active ?? input.attivo ?? null]
  );
  return result.rows[0] || null;
}

async function deleteAcademyModule(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query("UPDATE academy_modules SET active = FALSE, updated_at = NOW() WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function listAcademyLessons(moduleId) {
  const result = await pool.query(
    `SELECT * FROM academy_lessons
     WHERE academy_module_id = $1::bigint AND active = TRUE
     ORDER BY sort_order ASC, id ASC`,
    [moduleId]
  );
  return result.rows;
}

async function createAcademyLesson(input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const moduleId = input.module_id || input.moduleId;
  const module = (await pool.query("SELECT * FROM academy_modules WHERE id = $1::bigint LIMIT 1", [moduleId])).rows[0];
  const title = String(input.title || input.titolo || "").trim();
  if (!module || !title) {
    const error = new Error("Modulo e titolo lezione obbligatori.");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO academy_lessons (academy_module_id, course_id, title, description, video_url, pdf_url, duration_minutes, active)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, $6::text, $7::integer, $8::boolean)
     RETURNING *`,
    [
      module.id,
      module.course_id,
      title,
      String(input.description || input.descrizione || ""),
      input.video_url || input.video || "",
      input.pdf_url || "",
      durationMinutesFromLabel(input.duration_label || input.durata_stimata || input.duration || ""),
      academyStatus(input, true)
    ]
  );
  return result.rows[0];
}

async function updateAcademyLesson(id, input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE academy_lessons
     SET title = COALESCE(NULLIF($2::text, ''), title),
         description = $3::text,
         video_url = $4::text,
         pdf_url = $5::text,
         duration_minutes = $6::integer,
         active = COALESCE($7::boolean, active),
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      id,
      String(input.title || input.titolo || "").trim(),
      String(input.description || input.descrizione || ""),
      input.video_url || input.video || "",
      input.pdf_url || "",
      durationMinutesFromLabel(input.duration_label || input.durata_stimata || input.duration || ""),
      input.active ?? input.attivo ?? null
    ]
  );
  return result.rows[0] || null;
}

async function deleteAcademyLesson(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query("UPDATE academy_lessons SET active = FALSE, updated_at = NOW() WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

function academyDataUrlToBuffer(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return { buffer: null, mimeType: "" };
  return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
}

function academyMaterialType(input = {}) {
  const type = String(input.tipo_materiale || input.material_type || input.type || "").toLowerCase();
  if (["pdf", "video", "immagine", "image", "slide", "documento", "testo", "link"].includes(type)) return type;
  const mime = String(input.mime_type || input.mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("video")) return "video";
  if (mime.includes("image")) return "immagine";
  if (mime.includes("word") || mime.includes("presentation") || mime.includes("powerpoint") || mime.includes("text")) return "documento";
  return input.external_url || input.externalUrl ? "link" : "documento";
}

async function saveAcademyMaterialFile(input = {}, user = {}) {
  const dataUrl = input.file_data || input.fileData || input.data_url || input.dataUrl || "";
  const { buffer, mimeType } = academyDataUrlToBuffer(dataUrl);
  if (!buffer) return { fileUrl: input.file_url || input.fileUrl || "", mimeType: input.mime_type || input.mimeType || "", size: Number(input.size || 0) };
  const allowed = /^(application\/pdf|video\/mp4|video\/quicktime|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation|image\/jpeg|image\/png|image\/webp)$/i;
  if (!allowed.test(mimeType)) {
    const error = new Error("Formato materiale non supportato.");
    error.status = 400;
    throw error;
  }
  await fs.mkdir(academyUploadDirectory, { recursive: true });
  const extension = {
    "application/pdf": ".pdf",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  }[mimeType.toLowerCase()] || ".bin";
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  const fullPath = path.join(academyUploadDirectory, filename);
  await fs.writeFile(fullPath, buffer);
  return {
    fileUrl: `/api/academy/materials/file/${filename}`,
    mimeType,
    size: buffer.length,
    uploadedBy: user.id
  };
}

async function listAcademyMaterials(lessonId) {
  const result = await pool.query(
    `SELECT * FROM academy_materials
     WHERE academy_lesson_id = $1::bigint
     ORDER BY sort_order ASC, id ASC`,
    [lessonId]
  );
  return result.rows;
}

async function createAcademyMaterial(input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const lessonId = input.lesson_id || input.lessonId;
  const lesson = (await pool.query("SELECT * FROM academy_lessons WHERE id = $1::bigint LIMIT 1", [lessonId])).rows[0];
  if (!lesson) {
    const error = new Error("Lezione non trovata.");
    error.status = 404;
    throw error;
  }
  const file = await saveAcademyMaterialFile(input, user);
  const result = await pool.query(
    `INSERT INTO academy_materials
      (academy_lesson_id, course_id, title, material_type, file_url, external_url, mime_type, size_bytes, uploaded_by)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,$6::text,$7::text,$8::bigint,$9::bigint)
     RETURNING *`,
    [
      lesson.id,
      lesson.course_id,
      input.title || input.titolo || "Materiale Academy",
      academyMaterialType(input),
      file.fileUrl || "",
      input.external_url || input.externalUrl || "",
      file.mimeType || input.mime_type || input.mimeType || "",
      file.size || Number(input.size || 0),
      file.uploadedBy || user.id || null
    ]
  );
  return result.rows[0];
}

async function updateAcademyMaterial(id, input = {}, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const current = (await pool.query("SELECT * FROM academy_materials WHERE id = $1::bigint LIMIT 1", [id])).rows[0];
  if (!current) return null;
  const file = await saveAcademyMaterialFile(input, user);
  const result = await pool.query(
    `UPDATE academy_materials
     SET title = COALESCE(NULLIF($2::text, ''), title),
         material_type = COALESCE(NULLIF($3::text, ''), material_type),
         file_url = COALESCE(NULLIF($4::text, ''), file_url),
         external_url = $5::text,
         mime_type = COALESCE(NULLIF($6::text, ''), mime_type),
         size_bytes = COALESCE($7::bigint, size_bytes),
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      id,
      input.title || input.titolo || "",
      academyMaterialType(input),
      file.fileUrl || input.file_url || input.fileUrl || "",
      input.external_url || input.externalUrl || current.external_url || "",
      file.mimeType || input.mime_type || input.mimeType || "",
      file.size || null
    ]
  );
  return result.rows[0] || null;
}

async function deleteAcademyMaterial(id, user = {}) {
  if (!canManageCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query("DELETE FROM academy_materials WHERE id = $1::bigint RETURNING id", [id]);
  return result.rowCount > 0;
}

async function canViewAcademyUser(userId, actor = {}) {
  if (String(userId) === String(actor.id)) return true;
  const role = normalizeRole(actor.ruolo);
  if (["founder", "supervisore"].includes(role)) return true;
  if (role !== "responsabile") return false;
  const target = await findUserRawById(userId);
  return target && String(target.negozio_id || target.negozio || "") === String(actor.negozio_id || actor.negozio || "");
}

async function getAcademyProgressForUser(userId, actor = {}) {
  if (!(await canViewAcademyUser(userId, actor))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `SELECT p.*, c.title AS course_title, f.name AS faculty_name, c.level
     FROM academy_user_progress p
     JOIN courses c ON c.id = p.course_id
     LEFT JOIN academy_faculties f ON f.id = c.faculty_id
     WHERE p.user_id = $1::bigint
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

async function startAcademyCourse(courseId, user = {}) {
  const result = await pool.query(
    `INSERT INTO academy_user_progress (course_id, user_id, status, percentuale, started_at, last_access_at)
     VALUES ($1::bigint, $2::bigint, 'in corso', 0, NOW(), NOW())
     ON CONFLICT (course_id, user_id)
     DO UPDATE SET status = CASE WHEN academy_user_progress.status = 'non iniziato' THEN 'in corso' ELSE academy_user_progress.status END,
                   started_at = COALESCE(academy_user_progress.started_at, NOW()),
                   last_access_at = NOW(),
                   updated_at = NOW()
     RETURNING *`,
    [courseId, user.id]
  );
  return result.rows[0];
}

async function recalculateAcademyCourseProgress(courseId, userId) {
  const totalLessons = Number((await pool.query(
    "SELECT COUNT(*)::int AS count FROM academy_lessons WHERE course_id = $1::bigint AND active = TRUE",
    [courseId]
  )).rows[0]?.count || 0);
  const completedLessons = Number((await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM academy_user_lesson_progress
     WHERE course_id = $1::bigint AND user_id = $2::bigint AND completed = TRUE`,
    [courseId, userId]
  )).rows[0]?.count || 0);
  const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const course = await academyCourseById(courseId);
  const status = percent >= 100
    ? course?.final_certification === false ? "completato" : "in attesa esame"
    : percent > 0 ? "in corso" : "non iniziato";
  const result = await pool.query(
    `INSERT INTO academy_user_progress
      (course_id, user_id, status, percentuale, started_at, last_access_at, completed_at)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, NOW(), NOW(), CASE WHEN $4::numeric >= 100 THEN NOW() ELSE NULL END)
     ON CONFLICT (course_id, user_id)
     DO UPDATE SET status = EXCLUDED.status,
                   percentuale = EXCLUDED.percentuale,
                   started_at = COALESCE(academy_user_progress.started_at, NOW()),
                   last_access_at = NOW(),
                   completed_at = CASE WHEN EXCLUDED.percentuale >= 100 THEN COALESCE(academy_user_progress.completed_at, NOW()) ELSE academy_user_progress.completed_at END,
                   updated_at = NOW()
     RETURNING *`,
    [courseId, userId, status, percent]
  );
  await pool.query(
    `INSERT INTO user_course_progress
      (course_id, user_id, percentuale, status, started_at, last_access_at, completed_at)
     VALUES ($1::bigint, $2::bigint, $3::numeric, $4::text, NOW(), NOW(), CASE WHEN $3::numeric >= 100 THEN NOW() ELSE NULL END)
     ON CONFLICT (course_id, user_id)
     DO UPDATE SET percentuale = EXCLUDED.percentuale,
                   status = EXCLUDED.status,
                   last_access_at = NOW(),
                   completed_at = CASE WHEN EXCLUDED.percentuale >= 100 THEN COALESCE(user_course_progress.completed_at, NOW()) ELSE user_course_progress.completed_at END,
                   updated_at = NOW()`,
    [courseId, userId, percent, status]
  );
  return result.rows[0];
}

async function completeAcademyLesson(input = {}, user = {}) {
  const lessonId = input.lesson_id || input.lessonId;
  const lesson = (await pool.query("SELECT * FROM academy_lessons WHERE id = $1::bigint LIMIT 1", [lessonId])).rows[0];
  if (!lesson) {
    const error = new Error("Lezione non trovata.");
    error.status = 404;
    throw error;
  }
  await pool.query(
    `INSERT INTO academy_user_lesson_progress (lesson_id, course_id, user_id, completed, completed_at)
     VALUES ($1::bigint, $2::bigint, $3::bigint, TRUE, NOW())
     ON CONFLICT (lesson_id, user_id)
     DO UPDATE SET completed = TRUE, completed_at = NOW(), updated_at = NOW()`,
    [lesson.id, lesson.course_id, user.id]
  );
  return recalculateAcademyCourseProgress(lesson.course_id, user.id);
}

async function updateAcademyProgress(id, input = {}, user = {}) {
  const progress = (await pool.query("SELECT * FROM academy_user_progress WHERE id = $1::bigint LIMIT 1", [id])).rows[0];
  if (!progress || !(await canViewAcademyUser(progress.user_id, user))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `UPDATE academy_user_progress
     SET status = COALESCE(NULLIF($2::text, ''), status),
         percentuale = COALESCE($3::numeric, percentuale),
         last_access_at = NOW(),
         completed_at = CASE WHEN COALESCE($3::numeric, percentuale) >= 100 THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [id, input.status || input.stato || "", input.percentuale ?? input.progress ?? null]
  );
  return result.rows[0] || null;
}

async function getAcademyLessonNote(lessonId, user = {}) {
  const result = await pool.query(
    `SELECT * FROM academy_user_notes
     WHERE lesson_id = $1::bigint AND user_id = $2::bigint
     ORDER BY updated_at DESC LIMIT 1`,
    [lessonId, user.id]
  );
  return result.rows[0] || null;
}

async function upsertAcademyLessonNote(lessonId, input = {}, user = {}) {
  const lesson = (await pool.query("SELECT * FROM academy_lessons WHERE id = $1::bigint LIMIT 1", [lessonId])).rows[0];
  if (!lesson) {
    const error = new Error("Lezione non trovata.");
    error.status = 404;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO academy_user_notes (course_id, lesson_id, user_id, note)
     VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text)
     ON CONFLICT (course_id, lesson_id, user_id)
     DO UPDATE SET note = EXCLUDED.note, updated_at = NOW()
     RETURNING *`,
    [lesson.course_id, lesson.id, user.id, String(input.note || "")]
  );
  return result.rows[0];
}

async function updateAcademyNote(id, input = {}, user = {}) {
  const result = await pool.query(
    `UPDATE academy_user_notes
     SET note = $3::text, updated_at = NOW()
     WHERE id = $1::bigint AND user_id = $2::bigint
     RETURNING *`,
    [id, user.id, String(input.note || "")]
  );
  return result.rows[0] || null;
}

async function deleteAcademyNote(id, user = {}) {
  const result = await pool.query("DELETE FROM academy_user_notes WHERE id = $1::bigint AND user_id = $2::bigint RETURNING id", [id, user.id]);
  return result.rowCount > 0;
}

async function saveCourseProgress(input = {}, user = {}) {
  const courseId = input.course_id || input.courseId;
  const percent = Math.max(0, Math.min(100, Number(input.percentuale ?? input.progress ?? 0)));
  const status = String(input.status || (percent >= 100 ? "completato" : percent > 0 ? "in corso" : "non iniziato"));
  const result = await pool.query(
    `INSERT INTO user_course_progress
      (course_id, user_id, percentuale, materials_completed, status, started_at, last_access_at, completed_at)
     VALUES ($1::bigint, $2::bigint, $3::numeric, $4::integer, $5::text, NOW(), NOW(), CASE WHEN $3::numeric >= 100 THEN NOW() ELSE NULL END)
     ON CONFLICT (course_id, user_id)
     DO UPDATE SET percentuale = EXCLUDED.percentuale,
                   materials_completed = EXCLUDED.materials_completed,
                   status = EXCLUDED.status,
                   last_access_at = NOW(),
                   completed_at = CASE WHEN EXCLUDED.percentuale >= 100 THEN NOW() ELSE user_course_progress.completed_at END,
                   updated_at = NOW()
     RETURNING *`,
    [courseId, user.id, percent, Number(input.materials_completed || 0), status]
  );
  return result.rows[0];
}

async function evaluateCourseExam(input = {}, user = {}) {
  if (!canEvaluateCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const targetUserId = input.user_id || user.id;
  if (normalizeRole(user.ruolo) === "responsabile" && !(await canViewAcademyUser(targetUserId, user))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const courseId = input.course_id || input.courseId;
  const examType = String(input.exam_type || "presenza").toLowerCase() === "live" ? "live" : "presenza";
  const esito = String(input.esito || "non_svolto").toLowerCase() === "superato" ? "superato" : String(input.esito || "non_svolto").toLowerCase() === "non_superato" ? "non_superato" : "non_svolto";
  const exam = await pool.query(
    `INSERT INTO course_exam_sessions (course_id, user_id, exam_type, esito, evaluated_by, evaluated_at, note)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::bigint, NOW(), $6::text)
     RETURNING *`,
    [courseId, targetUserId, examType, esito, user.id, String(input.note || "")]
  );
  await pool.query(
    `INSERT INTO academy_exam_results (course_id, user_id, exam_type, esito, evaluated_by, evaluated_at, note)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::bigint, NOW(), $6::text)`,
    [courseId, targetUserId, examType, esito, user.id, String(input.note || "")]
  );
  if (esito === "superato") {
    await pool.query(
      `INSERT INTO user_course_progress
        (course_id, user_id, percentuale, status, started_at, last_access_at, completed_at)
       VALUES ($1::bigint, $2::bigint, 100, 'certificato', NOW(), NOW(), NOW())
       ON CONFLICT (course_id, user_id)
       DO UPDATE SET percentuale = 100, status = 'certificato', last_access_at = NOW(), completed_at = NOW(), updated_at = NOW()`,
      [courseId, targetUserId]
    );
    await pool.query(
      `INSERT INTO academy_user_progress
        (course_id, user_id, percentuale, status, started_at, last_access_at, completed_at)
       VALUES ($1::bigint, $2::bigint, 100, 'certificato', NOW(), NOW(), NOW())
       ON CONFLICT (course_id, user_id)
       DO UPDATE SET percentuale = 100, status = 'certificato', last_access_at = NOW(), completed_at = NOW(), updated_at = NOW()`,
      [courseId, targetUserId]
    );
    const certificateCode = courseCode("CERT-OA");
    const badgeCode = courseCode("BADGE-OA");
    await pool.query(
      `INSERT INTO course_certificates (course_id, user_id, certificate_code, issued_by)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::bigint)
       ON CONFLICT (certificate_code) DO NOTHING`,
      [courseId, targetUserId, certificateCode, user.id]
    );
    await pool.query(
      `INSERT INTO academy_certificates (course_id, user_id, certificate_code, issued_by, metadata)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::bigint, $5::jsonb)
       ON CONFLICT (certificate_code) DO NOTHING`,
      [courseId, targetUserId, certificateCode, user.id, sanitizeForPostgres({ exam_type: examType, evaluated_at: new Date().toISOString() })]
    );
    const course = await pool.query(
      `SELECT c.title, cat.name AS category_name
       FROM courses c
       LEFT JOIN course_categories cat ON cat.id = c.category_id
       WHERE c.id = $1::bigint`,
      [courseId]
    );
    const badgeName = `Operatore OroActive - ${course.rows[0]?.title || "Corso certificato"}`;
    await pool.query(
      `INSERT INTO course_badges (course_id, user_id, badge_name, badge_code, assigned_by)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::bigint)
       ON CONFLICT (badge_code) DO NOTHING`,
      [courseId, targetUserId, badgeName, badgeCode, user.id]
    );
    await pool.query(
      `INSERT INTO academy_badges (course_id, user_id, badge_name, badge_code, assigned_by)
       VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::bigint)
       ON CONFLICT (badge_code) DO NOTHING`,
      [courseId, targetUserId, badgeName, badgeCode, user.id]
    );
    await recalculateAcademyOperatorLevel(targetUserId);
  }
  return exam.rows[0];
}

async function listAcademyExams(query = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const values = [];
  const where = [];
  if (!["founder", "supervisore", "responsabile"].includes(role)) {
    values.push(user.id);
    where.push(`e.user_id = $${values.length}::bigint`);
  } else if (role === "responsabile") {
    values.push(user.negozio_id || null);
    const storeParam = `$${values.length}::bigint`;
    values.push(user.negozio || "");
    where.push(`(u.negozio_id = ${storeParam} OR u.negozio = $${values.length}::text)`);
  } else if (query.user_id) {
    values.push(query.user_id);
    where.push(`e.user_id = $${values.length}::bigint`);
  }
  const result = await pool.query(
    `SELECT e.*, c.title AS course_title, u.nome, u.cognome, u.username
     FROM academy_exam_results e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN utenti u ON u.id = e.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY e.created_at DESC`,
    values
  );
  return result.rows;
}

async function updateAcademyExam(id, input = {}, user = {}) {
  const current = (await pool.query("SELECT * FROM academy_exam_results WHERE id = $1::bigint LIMIT 1", [id])).rows[0];
  if (!current) return null;
  return evaluateCourseExam({
    course_id: current.course_id,
    user_id: current.user_id,
    exam_type: input.exam_type || current.exam_type,
    esito: input.esito || current.esito,
    note: input.note || current.note || ""
  }, user);
}

async function listAcademyCertificates(query = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const values = [];
  const where = ["cert.status = 'valido'"];
  if (!["founder", "supervisore", "responsabile"].includes(role)) {
    values.push(user.id);
    where.push(`cert.user_id = $${values.length}::bigint`);
  } else if (role === "responsabile") {
    values.push(user.negozio_id || null);
    const storeParam = `$${values.length}::bigint`;
    values.push(user.negozio || "");
    where.push(`(u.negozio_id = ${storeParam} OR u.negozio = $${values.length}::text)`);
  } else if (query.user_id) {
    values.push(query.user_id);
    where.push(`cert.user_id = $${values.length}::bigint`);
  }
  const result = await pool.query(
    `SELECT cert.*, c.title AS course_title, c.level, f.name AS faculty_name, u.nome, u.cognome, u.username
     FROM academy_certificates cert
     JOIN courses c ON c.id = cert.course_id
     LEFT JOIN academy_faculties f ON f.id = c.faculty_id
     LEFT JOIN utenti u ON u.id = cert.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY cert.issued_at DESC`,
    values
  );
  return result.rows;
}

async function generateAcademyCertificate(input = {}, user = {}) {
  if (!canEvaluateCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const courseId = input.course_id || input.courseId;
  const targetUserId = input.user_id || input.userId || user.id;
  if (normalizeRole(user.ruolo) === "responsabile" && !(await canViewAcademyUser(targetUserId, user))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const code = input.certificate_code || courseCode("CERT-OA");
  const result = await pool.query(
    `INSERT INTO academy_certificates (course_id, user_id, certificate_code, issued_by, metadata)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::bigint, $5::jsonb)
     ON CONFLICT (certificate_code) DO UPDATE SET status = 'valido'
     RETURNING *`,
    [courseId, targetUserId, code, user.id, sanitizeForPostgres(input.metadata || {})]
  );
  await pool.query(
    `INSERT INTO course_certificates (course_id, user_id, certificate_code, issued_by)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::bigint)
     ON CONFLICT (certificate_code) DO NOTHING`,
    [courseId, targetUserId, code, user.id]
  );
  return result.rows[0];
}

async function listAcademyBadges(query = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const values = [];
  const where = [];
  if (!["founder", "supervisore", "responsabile"].includes(role)) {
    values.push(user.id);
    where.push(`badge.user_id = $${values.length}::bigint`);
  } else if (role === "responsabile") {
    values.push(user.negozio_id || null);
    const storeParam = `$${values.length}::bigint`;
    values.push(user.negozio || "");
    where.push(`(u.negozio_id = ${storeParam} OR u.negozio = $${values.length}::text)`);
  } else if (query.user_id) {
    values.push(query.user_id);
    where.push(`badge.user_id = $${values.length}::bigint`);
  }
  const result = await pool.query(
    `SELECT badge.*, c.title AS course_title, u.nome, u.cognome, u.username
     FROM academy_badges badge
     LEFT JOIN courses c ON c.id = badge.course_id
     LEFT JOIN utenti u ON u.id = badge.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY badge.assigned_at DESC`,
    values
  );
  return result.rows;
}

async function assignAcademyBadge(input = {}, user = {}) {
  if (!canEvaluateCourses(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const targetUserId = input.user_id || input.userId;
  if (normalizeRole(user.ruolo) === "responsabile" && !(await canViewAcademyUser(targetUserId, user))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const code = input.badge_code || courseCode("BADGE-OA");
  const result = await pool.query(
    `INSERT INTO academy_badges (course_id, user_id, badge_name, badge_code, assigned_by)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::bigint)
     RETURNING *`,
    [input.course_id || input.courseId || null, targetUserId, input.badge_name || input.badgeName || "Badge OroActive Academy", code, user.id]
  );
  await recalculateAcademyOperatorLevel(targetUserId);
  return result.rows[0];
}

async function revokeAcademyBadge(id, user = {}) {
  if (normalizeRole(user.ruolo) !== "founder") {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    "UPDATE academy_badges SET status = 'revocato' WHERE id = $1::bigint RETURNING *",
    [id]
  );
  if (result.rows[0]?.user_id) await recalculateAcademyOperatorLevel(result.rows[0].user_id);
  return result.rows[0] || null;
}

function academyLevelFromCounts(certifiedCourses, badges, certificates) {
  const score = Number(certifiedCourses || 0) + Number(badges || 0) + Number(certificates || 0);
  if (score >= 30) return "Master OroActive";
  if (score >= 20) return "Responsabile";
  if (score >= 12) return "Esperto";
  if (score >= 7) return "Senior";
  if (score >= 3) return "Operatore";
  return "Junior";
}

async function recalculateAcademyOperatorLevel(userId) {
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM academy_user_progress WHERE user_id = $1::bigint AND status = 'certificato') AS certified_courses,
       (SELECT COUNT(*)::int FROM academy_badges WHERE user_id = $1::bigint AND status = 'valido') AS badges,
       (SELECT COUNT(*)::int FROM academy_certificates WHERE user_id = $1::bigint AND status = 'valido') AS certificates`,
    [userId]
  );
  const row = counts.rows[0] || {};
  const level = academyLevelFromCounts(row.certified_courses, row.badges, row.certificates);
  const result = await pool.query(
    `INSERT INTO academy_operator_levels
      (user_id, level_name, completed_courses, badges_count, certificates_count, updated_at)
     VALUES ($1::bigint, $2::text, $3::integer, $4::integer, $5::integer, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET level_name = EXCLUDED.level_name,
                   completed_courses = EXCLUDED.completed_courses,
                   badges_count = EXCLUDED.badges_count,
                   certificates_count = EXCLUDED.certificates_count,
                   updated_at = NOW()
     RETURNING *`,
    [userId, level, row.certified_courses || 0, row.badges || 0, row.certificates || 0]
  );
  return result.rows[0];
}

async function getAcademyOperatorLevel(userId, actor = {}) {
  if (!(await canViewAcademyUser(userId, actor))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  return recalculateAcademyOperatorLevel(userId);
}

async function getCourseCertificate(id, user = {}) {
  const role = normalizeRole(user.ruolo);
  const values = [id];
  let where = "cert.id = $1::bigint";
  if (!["founder", "responsabile"].includes(role)) {
    values.push(user.id);
    where += ` AND cert.user_id = $${values.length}::bigint`;
  }
  const result = await pool.query(
    `SELECT cert.*, c.title AS course_title, c.level, c.duration_label, faculty.name AS faculty_name, cat.name AS category_name,
            exam.exam_type, exam.evaluated_at,
            u.nome, u.cognome, u.username
     FROM course_certificates cert
     JOIN courses c ON c.id = cert.course_id
     LEFT JOIN academy_faculties faculty ON faculty.id = c.faculty_id
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN utenti u ON u.id = cert.user_id
     LEFT JOIN LATERAL (
       SELECT exam_type, evaluated_at
       FROM course_exam_sessions
       WHERE course_id = cert.course_id AND user_id = cert.user_id AND esito = 'superato'
       ORDER BY evaluated_at DESC NULLS LAST, id DESC
       LIMIT 1
     ) exam ON TRUE
     WHERE ${where}
     LIMIT 1`,
    values
  );
  return result.rows[0] || null;
}

async function getAcademyCertificateForPdf(id, user = {}) {
  const role = normalizeRole(user.ruolo);
  const values = [id];
  let where = "cert.id = $1::bigint";
  if (!["founder", "responsabile"].includes(role)) {
    values.push(user.id);
    where += ` AND cert.user_id = $${values.length}::bigint`;
  }
  const result = await pool.query(
    `SELECT cert.*, c.title AS course_title, c.level, c.duration_label, faculty.name AS faculty_name, cat.name AS category_name,
            exam.exam_type, exam.evaluated_at,
            u.nome, u.cognome, u.username
     FROM academy_certificates cert
     JOIN courses c ON c.id = cert.course_id
     LEFT JOIN academy_faculties faculty ON faculty.id = c.faculty_id
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN utenti u ON u.id = cert.user_id
     LEFT JOIN LATERAL (
       SELECT exam_type, evaluated_at
       FROM academy_exam_results
       WHERE course_id = cert.course_id AND user_id = cert.user_id AND esito = 'superato'
       ORDER BY evaluated_at DESC NULLS LAST, id DESC
       LIMIT 1
     ) exam ON TRUE
     WHERE ${where}
     LIMIT 1`,
    values
  );
  return result.rows[0] || null;
}

function writeCourseCertificatePdf(certificate, response) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename=\"certificazione-oroactive-${certificate.id}.pdf\"`);
  doc.pipe(response);
  doc.rect(0, 0, 595, 842).fill("#fbf7f0");
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(24).text("Certificazione interna OroActive", 50, 90, { align: "center" });
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(13).fillColor("#333").text("Si certifica che", { align: "center" });
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#000").text(`${certificate.nome || ""} ${certificate.cognome || certificate.username || ""}`.trim() || "Utente OroActive", { align: "center" });
  doc.moveDown();
  doc.font("Helvetica").fontSize(13).fillColor("#333").text("ha superato la prova finale del corso", { align: "center" });
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#c45a1a").text(certificate.course_title || "Corso OroActive", { align: "center" });
  doc.moveDown();
  doc.font("Helvetica").fontSize(12).fillColor("#333").text(`Categoria: ${certificate.category_name || "Formazione OroActive"}`, { align: "center" });
  doc.text(`Facoltà: ${certificate.faculty_name || "OroActive Academy"}`, { align: "center" });
  doc.text(`Livello corso: ${certificate.level || "Base"}`, { align: "center" });
  doc.text(`Data completamento: ${new Date(certificate.issued_at).toLocaleDateString("it-IT")}`, { align: "center" });
  if (certificate.evaluated_at) doc.text(`Data superamento esame: ${new Date(certificate.evaluated_at).toLocaleDateString("it-IT")}`, { align: "center" });
  doc.text(`Modalità esame: ${certificate.exam_type || "presenza/live"}`, { align: "center" });
  doc.text(`Codice certificazione: ${certificate.certificate_code || ""}`, { align: "center" });
  doc.moveDown(4);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111").text("OroActive", { align: "center" });
  doc.font("Helvetica").fontSize(11).text("Certificazione interna valida per formazione aziendale", { align: "center" });
  doc.end();
}

async function listTraining(user = {}) {
  return listCourses(user);
}

async function createTrainingCourse(input = {}, user = {}) {
  return createCourse(input, user);
}

async function saveTrainingResult(input = {}, user = {}) {
  return saveCourseProgress({
    course_id: input.course_id,
    percentuale: input.completed ? 100 : numberFrom(input.score),
    status: input.completed ? "completato" : "in corso",
    materials_completed: input.payload?.materials_completed || 0
  }, user);
}

async function crmClients(user = {}, query = {}) {
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  let searchWhere = "";
  if (query.q) {
    values.push(`%${String(query.q).toLowerCase()}%`);
    const parameter = `$${values.length}`;
    searchWhere = ` AND (
      LOWER(COALESCE(c.nome, '')) LIKE ${parameter}
      OR LOWER(COALESCE(c.cognome, '')) LIKE ${parameter}
      OR LOWER(COALESCE(c.codice_fiscale, '')) LIKE ${parameter}
      OR LOWER(COALESCE(c.telefono, '')) LIKE ${parameter}
      OR LOWER(COALESCE(c.email, '')) LIKE ${parameter}
    )`;
  }
  const result = await pool.query(
    `SELECT c.*,
            COUNT(a.id)::int AS atti_count,
            COALESCE(SUM(a.totale), 0)::numeric AS totale_pagato,
            MAX(a.data_atto) AS ultimo_atto,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(a.store, n.nome)), NULL) AS negozi_visitati
     FROM clienti c
     LEFT JOIN ${actsTable} a ON UPPER(a.codice_fiscale) = UPPER(c.codice_fiscale)
     LEFT JOIN negozi n ON n.id = c.negozio_id
     WHERE COALESCE(c.archiviato, FALSE) = FALSE ${storeWhere} ${searchWhere}
     GROUP BY c.id
     ORDER BY LOWER(COALESCE(c.cognome, '')) ASC, LOWER(COALESCE(c.nome, '')) ASC
     LIMIT 100`,
    values
  );
  return {
    clients: result.rows.map((row) => ({
      ...publicClient(row),
      livello_cliente: row.livello_cliente || "nuovo",
      atti_count: row.atti_count,
      totale_pagato: Number(row.totale_pagato || 0),
      ultimo_atto: row.ultimo_atto,
      negozi_visitati: row.negozi_visitati || [],
      prossima_azione: row.prossima_azione || ""
    }))
  };
}

async function crmClientDetail(id, user = {}) {
  const clientResult = await pool.query("SELECT * FROM clienti WHERE id = $1", [id]);
  const client = clientResult.rows[0];
  if (!client) return null;
  if (!roleSeesAllStores(user.ruolo)) {
    const store = await storeForUser(user);
    const access = await pool.query(
      `SELECT 1
       FROM clienti c
       LEFT JOIN ${actsTable} a ON UPPER(a.codice_fiscale) = UPPER(c.codice_fiscale)
       WHERE c.id = $1::bigint
         AND (c.negozio_id = $2::bigint OR a.negozio_id = $2::bigint OR a.store = $3::text)
       LIMIT 1`,
      [id, store?.id || null, store?.nome || ""]
    );
    if (!access.rowCount) {
      const error = new Error("Non autorizzato");
      error.status = 403;
      throw error;
    }
  }
  const values = [client.codice_fiscale || ""];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const acts = await pool.query(
    `SELECT * FROM ${actsTable} a
     WHERE UPPER(a.codice_fiscale) = UPPER($1) ${storeWhere}
     ORDER BY a.data_atto DESC NULLS LAST`,
    values
  );
  const notes = await pool.query("SELECT * FROM client_notes WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 50", [id]);
  return { client: publicClient(client), acts: acts.rows.map((row) => rowToAct(row, { full: false })), notes: notes.rows };
}

async function addClientNote(id, input = {}, user = {}) {
  const result = await pool.query(
    `INSERT INTO client_notes (cliente_id, user_id, note)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [id, user.id, input.note || ""]
  );
  return result.rows[0];
}

async function updateCrmClient(id, input = {}, user = {}) {
  const detail = await crmClientDetail(id, user);
  if (!detail) return null;
  const payload = {
    ...(detail.client || {}),
    birthDate: input.birthDate || input.data_nascita || detail.client.birthDate || "",
    birthPlace: input.birthPlace || input.luogo_nascita || detail.client.birthPlace || "",
    residenceProvince: input.province || input.provincia || detail.client.province || "",
    address: input.address || input.indirizzo || detail.client.address || "",
    documentType: input.documentType || input.documento_tipo || detail.client.documentType || "",
    documentNumber: input.documentNumber || input.documento_numero || detail.client.documentNumber || "",
    paymentMethod: input.paymentMethod || input.metodo_pagamento || detail.client.paymentMethod || "",
    accountHolder: input.accountHolder || input.intestatario_conto || detail.client.accountHolder || ""
  };
  const result = await pool.query(
    `UPDATE clienti
     SET nome = COALESCE(NULLIF($2::text, ''), nome),
         cognome = COALESCE(NULLIF($3::text, ''), cognome),
         codice_fiscale = COALESCE(NULLIF(UPPER($4::text), ''), codice_fiscale),
         telefono = COALESCE(NULLIF($5::text, ''), telefono),
         email = COALESCE(NULLIF($6::text, ''), email),
         iban = COALESCE(NULLIF($7::text, ''), iban),
         indirizzo = COALESCE(NULLIF($8::text, ''), indirizzo),
         provincia = COALESCE(NULLIF($9::text, ''), provincia),
         documento_tipo = COALESCE(NULLIF($10::text, ''), documento_tipo),
         documento_numero = COALESCE(NULLIF($11::text, ''), documento_numero),
         metodo_pagamento = COALESCE(NULLIF($12::text, ''), metodo_pagamento),
         intestatario_conto = COALESCE(NULLIF($13::text, ''), intestatario_conto),
         livello_cliente = COALESCE(NULLIF($14::text, ''), livello_cliente),
         note_interne = COALESCE($15::text, note_interne),
         payload = COALESCE(payload, '{}'::jsonb) || $16::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      id,
      input.name || input.nome || "",
      input.surname || input.cognome || "",
      input.fiscalCode || input.codice_fiscale || "",
      input.phone || input.telefono || "",
      input.email || "",
      input.iban || "",
      input.address || input.indirizzo || "",
      input.province || input.provincia || "",
      input.documentType || input.documento_tipo || "",
      input.documentNumber || input.documento_numero || "",
      input.paymentMethod || input.metodo_pagamento || "",
      input.accountHolder || input.intestatario_conto || "",
      input.level || input.livello_cliente || "",
      input.notes || input.note_interne || "",
      sanitizeForPostgres(payload)
    ]
  );
  return publicClient(result.rows[0]);
}

async function archiveCrmClient(id, user = {}) {
  const detail = await crmClientDetail(id, user);
  if (!detail) return false;
  const result = await pool.query(
    "UPDATE clienti SET archiviato = TRUE, updated_at = NOW() WHERE id = $1::bigint RETURNING id",
    [id]
  );
  return result.rowCount > 0;
}

async function createInventoryTransfer(input = {}, user = {}) {
  if (!["founder", "supervisore"].includes(normalizeRole(user.ruolo))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO giacenza_trasferimenti
      (negozio_partenza_id, negozio_destinazione_id, metallo, titolo, grammi, data_trasferimento, operatore_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      input.negozio_partenza_id || null,
      input.negozio_destinazione_id || null,
      input.metallo || "",
      input.titolo || "",
      numberFrom(input.grammi),
      input.data_trasferimento || new Date().toISOString().slice(0, 10),
      user.id,
      input.note || ""
    ]
  );
  return result.rows[0];
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
  where.push(realCompletedStatusSql());
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
  const act = await enrichActStore(normalizeAct(protectedInput, existing), user);
  const amlCheck = await enforceCashAntiMoneyLaundering(act, user, existing);
  const nowIso = new Date().toISOString();
  const statusCode = normalizeWorkflowStatus(act.status);
  const completedAt = ["completed", "archived_completed"].includes(statusCode) ? nowIso : null;
  const archivedAt = ["archived_incomplete", "archived_completed"].includes(statusCode) ? nowIso : null;
  const result = await pool.query(
    `INSERT INTO ${actsTable} (
      cliente_nome, cliente_cognome, codice_fiscale, telefono,
      peso_oro, quotazione, totale, data_atto,
      practice_number, store, store_code, act_year, act_number,
      payment_method, status, iban, payload,
      negozio_id, codice_negozio, numero_atto_negozio, operatore_id,
      completed_at, archived_at
    ) VALUES (
      $1::text,$2::text,$3::text,$4::text,
      $5::numeric,$6::numeric,$7::numeric,$8::date,
      $9::text,$10::text,$11::text,$12::integer,$13::integer,
      $14::text,$15::text,$16::text,$17::jsonb,
      $18::bigint,$19::text,$20::integer,$21::bigint,
      $22::timestamptz,$23::timestamptz
    )
    RETURNING *`,
    [
      nullIfEmpty(act.clienteNome),
      nullIfEmpty(act.clienteCognome),
      nullIfEmpty(act.codiceFiscale),
      nullIfEmpty(act.telefono),
      act.pesoOro,
      act.quotazione,
      act.totale,
      dateOrNull(act.dataAtto),
      nullIfEmpty(act.practiceNumber),
      nullIfEmpty(act.store),
      nullIfEmpty(act.storeCode),
      act.actYear,
      act.actNumber,
      nullIfEmpty(act.paymentMethod),
      nullIfEmpty(act.status),
      nullIfEmpty(act.iban),
      sanitizeForPostgres(act.payload),
      nullIfEmpty(act.negozioId),
      nullIfEmpty(act.codiceNegozio),
      act.numeroAttoNegozio,
      nullIfEmpty(act.operatoreId),
      completedAt,
      archivedAt
    ]
  );
  void logUserActivity({
    userId: user?.id,
    actorId: user?.id,
    activityType: ["completed", "archived_completed"].includes(statusCode)
      ? "complete_act"
      : statusCode === "archived_incomplete"
        ? "archive_act"
        : "create_act",
    entityType: "atto",
    entityId: result.rows[0].id,
    description: `Atto ${act.practiceNumber} salvato`,
    metadata: { practiceNumber: act.practiceNumber, status: statusCode, store: act.store }
  });
  await saveDocumentIntegrityLog(act, result.rows[0].id, user);
  if (!isDraftLikeStatus(act.status)) await saveAmlAlert({ check: amlCheck, act, user, attoId: result.rows[0].id });
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable}
       SET cliente_id = $2::bigint,
           iban = COALESCE(NULLIF($3::text, ''), iban)
       WHERE id = $1::bigint
       RETURNING *`,
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
    const error = completedActEditError();
    error.status = 403;
    throw error;
  }
  const act = await enrichActStore(normalizeAct(enforceActStore(input, user), existing), user);
  const normalizedStatus = normalizeWorkflowStatus(act.status);
  const updateValues = [
    existing.id,
    nullIfEmpty(act.clienteNome),
    nullIfEmpty(act.clienteCognome),
    nullIfEmpty(act.codiceFiscale),
    nullIfEmpty(act.telefono),
    act.pesoOro,
    act.quotazione,
    act.totale,
    dateOrNull(act.dataAtto),
    nullIfEmpty(act.practiceNumber),
    nullIfEmpty(act.store),
    nullIfEmpty(act.storeCode),
    act.actYear,
    act.actNumber,
    nullIfEmpty(act.paymentMethod),
    nullIfEmpty(act.status),
    nullIfEmpty(act.iban),
    sanitizeForPostgres(act.payload),
    nullIfEmpty(act.negozioId),
    nullIfEmpty(act.codiceNegozio),
    act.numeroAttoNegozio,
    nullIfEmpty(act.operatoreId),
    normalizedStatus
  ];
  await enforceCashAntiMoneyLaundering(act, user, existing);
  console.log("UPDATE PAYLOAD", redactedActPayloadForLog(act));
  console.log("ATTO ID", existing.id);
  let result;
  try {
    result = await pool.query(
      `UPDATE ${actsTable} SET
        cliente_nome = $2::text,
        cliente_cognome = $3::text,
        codice_fiscale = $4::text,
        telefono = $5::text,
        peso_oro = $6::numeric,
        quotazione = $7::numeric,
        totale = $8::numeric,
        data_atto = $9::date,
        practice_number = $10::text,
        store = $11::text,
        store_code = $12::text,
        act_year = $13::integer,
        act_number = $14::integer,
        payment_method = $15::text,
        status = $16::text,
        iban = $17::text,
        payload = $18::jsonb,
        negozio_id = $19::bigint,
        codice_negozio = $20::text,
        numero_atto_negozio = $21::integer,
        operatore_id = $22::bigint,
        completed_at = CASE
          WHEN $23::text IN ('completed', 'archived_completed') THEN COALESCE(completed_at, NOW())
          ELSE completed_at
        END,
        archived_at = CASE
          WHEN $23::text IN ('archived_incomplete', 'archived_completed') THEN COALESCE(archived_at, NOW())
          ELSE archived_at
        END,
        deleted_at = CASE
          WHEN $23::text = 'deleted' THEN COALESCE(deleted_at, NOW())
          ELSE deleted_at
        END,
        abandoned_at = CASE
          WHEN $23::text = 'abandoned' THEN COALESCE(abandoned_at, NOW())
          ELSE abandoned_at
        END,
        updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      updateValues
    );
  } catch (err) {
    console.error("UPDATE ATTO ERROR", err);
    throw err;
  }
  if (!result.rowCount) return null;
  void logUserActivity({
    userId: user?.id,
    actorId: user?.id,
    activityType: ["completed", "archived_completed"].includes(normalizedStatus)
      ? "complete_act"
      : normalizedStatus === "archived_incomplete"
        ? "archive_act"
        : "update_act",
    entityType: "atto",
    entityId: result.rows[0].id,
    description: `Atto ${act.practiceNumber} aggiornato`,
    metadata: { practiceNumber: act.practiceNumber, status: normalizedStatus, store: act.store }
  });
  await saveDocumentIntegrityLog(act, result.rows[0].id, user);
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable}
       SET cliente_id = $2::bigint,
           iban = COALESCE(NULLIF($3::text, ''), iban)
       WHERE id = $1::bigint
       RETURNING *`,
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
  const result = await pool.query(
    `UPDATE ${actsTable}
     SET status = 'deleted',
         deleted_at = COALESCE(deleted_at, NOW()),
         deleted_by = $2::bigint,
         updated_at = NOW(),
         payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('deletedBy', $2::bigint, 'deletedAt', NOW())
     WHERE id = $1::bigint
     RETURNING id`,
    [existing.id, user?.id || null]
  );
  if (result.rowCount) {
    await pool.query(
      `UPDATE antifrode_alerts
       SET stato = 'atto_eliminato',
           reviewed_by = $2::bigint,
           reviewed_at = NOW()
       WHERE atto_id = $1::bigint
         AND stato IN ('nuovo', 'in verifica')`,
      [existing.id, user?.id || null]
    ).catch((error) => {
      console.error("ANTIFRAUD DELETE SYNC ERROR", error);
    });
    void logUserActivity({
      userId: user?.id,
      actorId: user?.id,
      activityType: "delete_act",
      entityType: "atto",
      entityId: existing.id,
      description: `Atto ${existing.practice_number} eliminato`,
      metadata: { practiceNumber: existing.practice_number, store: existing.store }
    });
  }
  return result.rowCount > 0;
}

async function createUser(input, actor) {
  const firstName = String(input.nome || input.name || "").trim();
  const surname = String(input.cognome || input.surname || "").trim();
  const username = String(input.username || input.email || "").trim();
  const email = String(input.email || "").trim();
  const role = normalizeRole(input.ruolo || input.role || "");
  if (!firstName) {
    const error = new Error("Nome utente obbligatorio");
    error.status = 400;
    throw error;
  }
  if (!surname) {
    const error = new Error("Cognome utente obbligatorio");
    error.status = 400;
    throw error;
  }
  if (!username && !email) {
    const error = new Error("Email/username obbligatorio");
    error.status = 400;
    throw error;
  }
  if (!input.ruolo && !input.role) {
    const error = new Error("Ruolo utente obbligatorio");
    error.status = 400;
    throw error;
  }
  const password = String(input.password || "");
  if (password.length < 8) {
    const error = new Error("La password deve avere almeno 8 caratteri");
    error.status = 400;
    throw error;
  }
  const actorRole = normalizeRole(actor?.ruolo);
  const passwordHash = await bcrypt.hash(password, 12);
  const allowedRoles = managedRolesForActor(actor);
  if (!allowedRoles.includes(role)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const finalRole = role;
  const actorStore = actorRole === "responsabile" ? await storeForUser(actor) : null;
  const store = roleSeesAllStores(finalRole)
    ? null
    : actorRole === "responsabile"
      ? actorStore
      : await storeByCodeOrName(input.negozio || input.negozio_id || "Busto Arsizio");
  if (!roleSeesAllStores(finalRole) && !store) {
    const error = new Error("Negozio assegnato non valido");
    error.status = 400;
    throw error;
  }
  const finalStore = roleSeesAllStores(finalRole)
    ? "Tutti"
    : store.nome;
  const finalEmail = email || `${username}@oroactive.local`;
  const duplicate = await pool.query(
    `SELECT id FROM utenti
     WHERE LOWER(email) = LOWER($1::text)
        OR ($2::text <> '' AND LOWER(username) = LOWER($2::text))
     LIMIT 1`,
    [finalEmail, username]
  );
  if (duplicate.rowCount) {
    const error = new Error("Email/username già presente");
    error.status = 409;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO utenti (nome, cognome, username, email, password_hash, ruolo, negozio, negozio_id, telefono, note, attivo)
     VALUES ($1::text, $2::text, NULLIF($3::text, ''), LOWER($4::text), $5::text, $6::text, $7::text, $8::bigint, $9::text, $10::text, $11::boolean)
     RETURNING id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen`,
    [
      firstName,
      surname,
      username,
      finalEmail,
      passwordHash,
      finalRole,
      finalStore,
      store?.id || null,
      input.telefono || input.phone || null,
      input.note || input.notes || null,
      input.attivo !== false
    ]
  );
  void logUserActivity({
    userId: result.rows[0].id,
    actorId: actor?.id,
    activityType: "create_user",
    entityType: "utente",
    entityId: result.rows[0].id,
    description: "Utente creato",
    metadata: { role: finalRole, store: finalStore }
  });
  return publicUser(result.rows[0]);
}

async function findUserRawById(id) {
  const result = await pool.query("SELECT * FROM utenti WHERE id = $1::bigint", [id]);
  return result.rows[0] || null;
}

function assertCanManageTarget(actor, target, requestedRole = target?.ruolo) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(target?.ruolo);
  if (targetRole === "founder") {
    if (actorRole === "founder" && normalizeRole(requestedRole) === "founder") return;
    const error = new Error("Il Founder non puo essere modificato o revocato");
    error.status = 403;
    throw error;
  }
  const allowedRoles = managedRolesForActor(actor);
  const sameStore = !actor?.negozio_id
    ? String(target?.negozio || "") === String(actor?.negozio || "")
    : String(target?.negozio_id || "") === String(actor.negozio_id);
  if (
    allowedRoles.includes(targetRole)
    && allowedRoles.includes(normalizeRole(requestedRole))
    && (actorRole !== "responsabile" || sameStore)
  ) return;
  const error = new Error("Permesso non consentito per questo utente");
  error.status = 403;
  throw error;
}

function canUseRequestedRoleForUpdate(actor, target, requestedRole) {
  const actorRole = normalizeRole(actor?.ruolo);
  const targetRole = normalizeRole(target?.ruolo);
  const normalizedRequestedRole = normalizeRole(requestedRole);
  if (targetRole === "founder") {
    return actorRole === "founder" && normalizedRequestedRole === "founder";
  }
  return managedRolesForActor(actor).includes(normalizedRequestedRole);
}

async function updateUser(id, input, actor) {
  const target = await findUserRawById(id);
  if (!target) return null;
  const requestedRole = input.ruolo || input.role || target.ruolo;
  assertCanManageTarget(actor, target, requestedRole);
  if ((input.nome !== undefined || input.name !== undefined) && !String(input.nome || input.name || "").trim()) {
    const error = new Error("Nome utente obbligatorio");
    error.status = 400;
    throw error;
  }
  if ((input.cognome !== undefined || input.surname !== undefined) && !String(input.cognome || input.surname || "").trim()) {
    const error = new Error("Cognome utente obbligatorio");
    error.status = 400;
    throw error;
  }
  if ((input.ruolo !== undefined || input.role !== undefined) && !String(input.ruolo || input.role || "").trim()) {
    const error = new Error("Ruolo utente obbligatorio");
    error.status = 400;
    throw error;
  }
  if ((input.ruolo !== undefined || input.role !== undefined) && !canUseRequestedRoleForUpdate(actor, target, input.ruolo || input.role)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  if ((input.email !== undefined || input.username !== undefined) && !String(input.email || input.username || target.email || target.username || "").trim()) {
    const error = new Error("Email/username obbligatorio");
    error.status = 400;
    throw error;
  }
  const fields = [];
  const values = [];
  const allowed = ["nome", "cognome", "username", "email", "ruolo", "negozio", "telefono", "note", "attivo"];
  if (input.name !== undefined && input.nome === undefined) input.nome = input.name;
  if (input.surname !== undefined && input.cognome === undefined) input.cognome = input.surname;
  if (input.role !== undefined && input.ruolo === undefined) input.ruolo = input.role;
  let selectedStore = null;
  if (input.negozio !== undefined || input.negozio_id !== undefined) {
    selectedStore = normalizeRole(actor?.ruolo) === "responsabile"
      ? await storeForUser(actor)
      : await storeByCodeOrName(input.negozio_id || input.negozio);
    const finalRole = normalizeRole(input.ruolo || target.ruolo);
    if (!roleSeesAllStores(finalRole) && !selectedStore) {
      const error = new Error("Negozio assegnato non valido");
      error.status = 400;
      throw error;
    }
  }
  const nextEmail = input.email !== undefined ? String(input.email || "").trim() || target.email : target.email;
  const nextUsername = input.username !== undefined ? String(input.username || "").trim() : target.username;
  if (input.email !== undefined || input.username !== undefined) {
    const duplicate = await pool.query(
      `SELECT id FROM utenti
       WHERE id <> $1::bigint
         AND (
           LOWER(email) = LOWER($2::text)
           OR ($3::text <> '' AND LOWER(username) = LOWER($3::text))
         )
       LIMIT 1`,
      [id, nextEmail, nextUsername || ""]
    );
    if (duplicate.rowCount) {
      const error = new Error("Email/username già presente");
      error.status = 409;
      throw error;
    }
  }
  allowed.forEach((field) => {
    if (input[field] === undefined) return;
    let value = input[field];
    if (field === "ruolo") value = normalizeRole(value);
    if (field === "negozio") {
      value = roleSeesAllStores(input.ruolo || target.ruolo) ? "Tutti" : selectedStore?.nome || value;
    }
    if (field === "email") value = String(value || "").trim() || target.email;
    if (field === "username" && !value) value = null;
    if (field === "attivo") {
      values.push(value !== false && value !== "false");
      fields.push(`${field} = $${values.length}::boolean`);
      return;
    }
    values.push(value === undefined ? null : value);
    fields.push(`${field} = ${field === "email" ? `LOWER($${values.length}::text)` : `$${values.length}::text`}`);
  });
  if (input.negozio !== undefined || input.negozio_id !== undefined || input.ruolo !== undefined) {
    const finalRole = normalizeRole(input.ruolo || target.ruolo);
    values.push(roleSeesAllStores(finalRole) ? null : selectedStore?.id || target.negozio_id || null);
    fields.push(`negozio_id = $${values.length}::bigint`);
  }

  if (input.password) {
    values.push(await bcrypt.hash(String(input.password), 12));
    fields.push(`password_hash = $${values.length}::text`);
  }

  if (!fields.length) return findUserById(id);
  fields.push("updated_at = NOW()");
  values.push(id);
  const result = await pool.query(
    `UPDATE utenti SET ${fields.join(", ")} WHERE id = $${values.length}::bigint
     RETURNING id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen`,
    values
  );
  if (result.rowCount) {
    void logUserActivity({
      userId: result.rows[0].id,
      actorId: actor?.id,
      activityType: "update_user",
      entityType: "utente",
      entityId: result.rows[0].id,
      description: "Utente aggiornato",
      metadata: { changedFields: fields.map((field) => field.split(" = ")[0]) }
    });
  }
  return result.rowCount ? publicUser(result.rows[0]) : null;
}

async function listUsers(options = {}) {
  const where = options.includeFounder ? "" : "WHERE ruolo <> 'founder'";
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti ${where} ORDER BY data_creazione DESC`
  );
  return result.rows.map(publicUser);
}

async function listUsersForActor(actor) {
  const actorRole = normalizeRole(actor?.ruolo);
  if (actorRole === "founder") {
    const result = await pool.query(
      "SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti ORDER BY data_creazione DESC"
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  if (actorRole === "supervisore") {
    const result = await pool.query(
      "SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti WHERE ruolo <> 'founder' ORDER BY data_creazione DESC"
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  if (actorRole === "responsabile") {
    const result = await pool.query(
      `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen
       FROM utenti
       WHERE ruolo = ANY($1::text[])
         AND (negozio_id = $2::bigint OR negozio = $3::text)
       ORDER BY data_creazione DESC`,
      [["commesso", "aiuto_commesso"], actor.negozio_id || null, actor.negozio || ""]
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  if (actorRole === "commesso") {
    const result = await pool.query(
      `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen
       FROM utenti
       WHERE id = $1::bigint
          OR (
            ruolo = ANY($2::text[])
            AND (negozio_id = $3::bigint OR negozio = $4::text)
            AND last_seen >= NOW() - INTERVAL '2 minutes'
          )
       ORDER BY (id = $1::bigint) DESC, last_seen DESC NULLS LAST, data_creazione DESC`,
      [actor.id, ["commesso", "aiuto_commesso"], actor.negozio_id || null, actor.negozio || ""]
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen
     FROM utenti
     WHERE id = $1::bigint
     ORDER BY data_creazione DESC`,
    [actor.id]
  );
  return result.rows.map((row) => publicUserForActor(row, actor));
}

async function getUserForActor(id, actor) {
  const target = await findUserRawById(id);
  if (!target) return null;
  if (canViewUserRecord(actor, target)) return publicUserForActor(target, actor);
  const error = new Error("Non autorizzato");
  error.status = 403;
  throw error;
}

async function listUserActivitiesForActor(id, actor) {
  const target = await findUserRawById(id);
  if (!target) return null;
  if (!canViewUserActivity(actor, target)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `SELECT l.*, a.nome AS actor_nome, a.cognome AS actor_cognome, a.username AS actor_username, a.email AS actor_email
     FROM user_activity_logs l
     LEFT JOIN utenti a ON a.id = l.actor_id
     WHERE l.user_id = $1::bigint
     ORDER BY l.created_at DESC
     LIMIT 100`,
    [id]
  );
  return result.rows.map(publicActivity);
}

async function deleteUser(id, actor) {
  if (String(actor.id) === String(id)) {
    const error = new Error("Non puoi disattivare il tuo stesso accesso");
    error.status = 400;
    throw error;
  }
  const target = await findUserRawById(id);
  if (!target) return false;
  if (normalizeRole(target.ruolo) === "founder") {
    const error = new Error("Il Founder non puo essere disattivato");
    error.status = 403;
    throw error;
  }
  assertCanManageTarget(actor, target);
  const result = await pool.query("UPDATE utenti SET attivo = FALSE, updated_at = NOW() WHERE id = $1::bigint RETURNING id", [id]);
  if (result.rowCount) {
    void logUserActivity({
      userId: id,
      actorId: actor?.id,
      activityType: "deactivate_user",
      entityType: "utente",
      entityId: id,
      description: "Utente disattivato"
    });
  }
  return result.rowCount > 0;
}

async function loginUser(identifier, password) {
  const loginIdentifier = String(identifier || "").trim();
  const result = await pool.query(
    `SELECT *
     FROM utenti
     WHERE LOWER(username) = LOWER($1::text)
        OR LOWER(email) = LOWER($1::text)
     LIMIT 1`,
    [loginIdentifier]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
    const error = new Error("Nome utente o password non corretti");
    error.status = 401;
    throw error;
  }
  if (user.attivo === false) {
    const error = new Error("Utente non attivo");
    error.status = 403;
    throw error;
  }
  await pool.query("UPDATE utenti SET last_seen = NOW() WHERE id = $1", [user.id]);
  user.last_seen = new Date();
  const safeUser = publicUser(user);
  void logUserActivity({
    userId: user.id,
    actorId: user.id,
    activityType: "login",
    entityType: "sessione",
    entityId: user.id,
    description: "Login effettuato"
  });
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
    `UPDATE utenti SET face_id_credential = $2, updated_at = NOW() WHERE id = $1
     RETURNING id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen`,
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
  void logUserActivity({
    userId: user.id,
    actorId: user.id,
    activityType: "login",
    entityType: "sessione",
    entityId: user.id,
    description: "Login Face ID effettuato"
  });
  return { token: signUserToken(safeUser), user: safeUser };
}

async function userFromAuthorizationHeader(header = "") {
  const [, token] = String(header || "").match(/^Bearer\s+(.+)$/i) || [];
  if (!token) return null;
  const decoded = jwt.verify(token, jwtSecret);
  return findUserById(decoded.sub);
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "oroactive-gestionale",
    database: runtimeStatus.databaseReady ? "ready" : "initializing_or_unavailable",
    database_error: runtimeStatus.databaseError || null,
    started_at: runtimeStatus.startedAt
  });
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    response.json(await loginUser(request.body.username, request.body.password));
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (request, response, next) => {
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

app.post("/api/auth/logout", async (request, response) => {
  try {
    const user = await userFromAuthorizationHeader(request.headers.authorization);
    if (user?.id) {
      void logUserActivity({
        userId: user.id,
        actorId: user.id,
        activityType: "logout",
        entityType: "sessione",
        entityId: user.id,
        description: "Logout effettuato"
      });
    }
  } catch {
    // Il logout deve sempre pulire la sessione locale anche se il token non e piu valido.
  }
  response.json({ ok: true });
});

app.get("/api/auth/me", authenticate, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

app.use("/api", authenticate);
app.use("/api", auditApiRequest);

app.get("/api/antiriciclaggio/contanti-check", async (request, response, next) => {
  try {
    response.json(await cashAntiMoneyLaunderingCheck(request.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", async (request, response, next) => {
  try {
    response.json(await dashboardKpis(request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/intelligence/insights", async (request, response, next) => {
  try {
    response.json(await oroActiveIntelligence(request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/backups", requireBackupManager, async (_request, response, next) => {
  try {
    response.json({ backups: await listBackups(), n8n_ready: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/backups/run", requireBackupManager, async (_request, response, next) => {
  try {
    response.status(201).json(await runBackup(_request.body?.tipo === "mensile" ? "mensile" : "giornaliero", _request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/backups/:id", requireBackupManager, async (request, response, next) => {
  try {
    const detail = await backupDetail(request.params.id);
    if (!detail) return response.status(404).json({ error: "Backup non trovato" });
    response.json({ backup: detail });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/backups/:id", requireBackupManager, async (request, response, next) => {
  try {
    const deleted = await deleteBackup(request.params.id);
    if (!deleted) return response.status(404).json({ error: "Backup non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/backups/:id/download", requireBackupManager, async (request, response, next) => {
  try {
    const result = await pool.query(
      "SELECT filename, percorso, stato FROM backup_jobs WHERE id = $1",
      [request.params.id]
    );
    const backup = result.rows[0];
    if (!backup || backup.stato !== "completato" || !backup.percorso) {
      return response.status(404).json({ error: "Backup non disponibile" });
    }
    const resolved = path.resolve(backup.percorso);
    const allowedRoot = path.resolve(backupDirectory);
    const relative = path.relative(allowedRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return response.status(403).json({ error: "Non autorizzato" });
    }
    response.download(resolved, backup.filename || path.basename(resolved));
  } catch (error) {
    next(error);
  }
});

app.get("/api/negozi", async (request, response, next) => {
  try {
    response.json({ stores: await listStores(request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/negozi", requireFounder, async (request, response, next) => {
  try {
    response.status(201).json(await createStore(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/negozi/:id", requireFounder, async (request, response, next) => {
  try {
    const store = await updateStore(request.params.id, request.body, request.user);
    if (!store) return response.status(404).json({ error: "Negozio non trovato" });
    response.json(store);
  } catch (error) {
    next(error);
  }
});

app.get("/api/antifrode", async (request, response, next) => {
  try {
    response.json({ alerts: await listAntifraudAlerts(request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/antifrode/scan", async (request, response, next) => {
  try {
    response.json(await scanAntifraud(request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/antifrode/:id", async (request, response, next) => {
  try {
    const alert = await updateAntifraudAlert(request.params.id, request.body, request.user);
    if (!alert) return response.status(404).json({ error: "Alert non trovato" });
    response.json(alert);
  } catch (error) {
    next(error);
  }
});

app.get("/api/corsi", async (request, response, next) => {
  try {
    response.json(await listCourses(request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/faculties", async (_request, response, next) => {
  try {
    const result = await pool.query("SELECT * FROM academy_faculties ORDER BY sort_order ASC, name ASC");
    response.json({ faculties: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/faculties", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyFaculty(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/faculties/:id", async (request, response, next) => {
  try {
    const faculty = await updateAcademyFaculty(request.params.id, request.body, request.user);
    if (!faculty) return response.status(404).json({ error: "Facoltà non trovata" });
    response.json(faculty);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/faculties/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyFaculty(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Facoltà non trovata" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/facolta", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyFaculty(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/facolta/:id", async (request, response, next) => {
  try {
    const faculty = await updateAcademyFaculty(request.params.id, request.body, request.user);
    if (!faculty) return response.status(404).json({ error: "Facoltà non trovata" });
    response.json(faculty);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/facolta/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyFaculty(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Facoltà non trovata" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/courses", async (request, response, next) => {
  try {
    response.json({ courses: await listAcademyCourses(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/courses/:id", async (request, response, next) => {
  try {
    const course = await getAcademyCourse(request.params.id, request.user);
    if (!course) return response.status(404).json({ error: "Corso non trovato" });
    response.json(course);
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/courses", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyCourse(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/courses/:id", async (request, response, next) => {
  try {
    const course = await updateAcademyCourse(request.params.id, request.body, request.user);
    if (!course) return response.status(404).json({ error: "Corso non trovato" });
    response.json(course);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/courses/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourse(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Corso non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/courses/:courseId/modules", async (request, response, next) => {
  try {
    response.json({ modules: await listAcademyModules(request.params.courseId) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/modules", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyModule(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/modules/:id", async (request, response, next) => {
  try {
    const module = await updateAcademyModule(request.params.id, request.body, request.user);
    if (!module) return response.status(404).json({ error: "Modulo non trovato" });
    response.json(module);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/modules/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyModule(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Modulo non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/modules/:moduleId/lessons", async (request, response, next) => {
  try {
    response.json({ lessons: await listAcademyLessons(request.params.moduleId) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/lessons", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyLesson(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/lessons/:id", async (request, response, next) => {
  try {
    const lesson = await updateAcademyLesson(request.params.id, request.body, request.user);
    if (!lesson) return response.status(404).json({ error: "Lezione non trovata" });
    response.json(lesson);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/lessons/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyLesson(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Lezione non trovata" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/lessons/:lessonId/materials", async (request, response, next) => {
  try {
    response.json({ materials: await listAcademyMaterials(request.params.lessonId) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/materials/file/:filename", async (request, response, next) => {
  try {
    const filename = path.basename(request.params.filename || "");
    const filePath = path.join(academyUploadDirectory, filename);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(academyUploadDirectory))) return response.status(403).json({ error: "Non autorizzato" });
    await fs.access(resolved);
    response.sendFile(resolved);
  } catch (error) {
    if (error.code === "ENOENT") return response.status(404).json({ error: "Materiale non trovato" });
    next(error);
  }
});

app.post("/api/academy/materials", async (request, response, next) => {
  try {
    response.status(201).json(await createAcademyMaterial(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/materials/:id", async (request, response, next) => {
  try {
    const material = await updateAcademyMaterial(request.params.id, request.body, request.user);
    if (!material) return response.status(404).json({ error: "Materiale non trovato" });
    response.json(material);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/materials/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyMaterial(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Materiale non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/my-progress", async (request, response, next) => {
  try {
    response.json({ progress: await getAcademyProgressForUser(request.user.id, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/users/:userId/progress", async (request, response, next) => {
  try {
    response.json({ progress: await getAcademyProgressForUser(request.params.userId, request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/progress/start-course", async (request, response, next) => {
  try {
    response.status(201).json(await startAcademyCourse(request.body.course_id || request.body.courseId, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/progress/complete-lesson", async (request, response, next) => {
  try {
    response.status(201).json(await completeAcademyLesson(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/progress/:id", async (request, response, next) => {
  try {
    const progress = await updateAcademyProgress(request.params.id, request.body, request.user);
    if (!progress) return response.status(404).json({ error: "Avanzamento non trovato" });
    response.json(progress);
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/lessons/:lessonId/notes", async (request, response, next) => {
  try {
    response.json({ note: await getAcademyLessonNote(request.params.lessonId, request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/lessons/:lessonId/notes", async (request, response, next) => {
  try {
    response.status(201).json(await upsertAcademyLessonNote(request.params.lessonId, request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/notes/:id", async (request, response, next) => {
  try {
    const note = await updateAcademyNote(request.params.id, request.body, request.user);
    if (!note) return response.status(404).json({ error: "Appunto non trovato" });
    response.json(note);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/notes/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAcademyNote(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Appunto non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/exams", async (request, response, next) => {
  try {
    response.json({ exams: await listAcademyExams(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/exams", async (request, response, next) => {
  try {
    response.status(201).json(await evaluateCourseExam(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/exams/:id", async (request, response, next) => {
  try {
    const exam = await updateAcademyExam(request.params.id, request.body, request.user);
    if (!exam) return response.status(404).json({ error: "Esame non trovato" });
    response.json(exam);
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/my-certificates", async (request, response, next) => {
  try {
    response.json({ certificates: await listAcademyCertificates({ user_id: request.user.id }, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/certificates", async (request, response, next) => {
  try {
    response.json({ certificates: await listAcademyCertificates(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/certificates/generate", async (request, response, next) => {
  try {
    response.status(201).json(await generateAcademyCertificate(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/certificates/:id/download", async (request, response, next) => {
  try {
    const certificate = await getAcademyCertificateForPdf(request.params.id, request.user);
    if (!certificate) return response.status(404).json({ error: "Certificazione non trovata" });
    writeCourseCertificatePdf(certificate, response);
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/my-badges", async (request, response, next) => {
  try {
    response.json({ badges: await listAcademyBadges({ user_id: request.user.id }, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/badges", async (request, response, next) => {
  try {
    response.json({ badges: await listAcademyBadges(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/badges/assign", async (request, response, next) => {
  try {
    response.status(201).json(await assignAcademyBadge(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/badges/:id/revoke", async (request, response, next) => {
  try {
    const badge = await revokeAcademyBadge(request.params.id, request.user);
    if (!badge) return response.status(404).json({ error: "Badge non trovato" });
    response.json(badge);
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/my-level", async (request, response, next) => {
  try {
    response.json(await getAcademyOperatorLevel(request.user.id, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/users/:userId/level", async (request, response, next) => {
  try {
    response.json(await getAcademyOperatorLevel(request.params.userId, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/recalculate-level/:userId", async (request, response, next) => {
  try {
    if (!(await canViewAcademyUser(request.params.userId, request.user))) return response.status(403).json({ error: "Non autorizzato" });
    response.json(await recalculateAcademyOperatorLevel(request.params.userId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/corsi", async (request, response, next) => {
  try {
    response.status(201).json(await createCourse(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/corsi/:id", async (request, response, next) => {
  try {
    const course = await updateCourse(request.params.id, request.body, request.user);
    if (!course) return response.status(404).json({ error: "Corso non trovato" });
    response.json(course);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/corsi/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourse(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Corso non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/corsi/materiali/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourseMaterial(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Materiale non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/corsi/sottosezioni/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourseSection(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Sottosezione non trovata" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/corsi/progress", async (request, response, next) => {
  try {
    response.status(201).json(await saveCourseProgress(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/notes", async (request, response, next) => {
  try {
    response.status(201).json(await saveAcademyNote(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/corsi/esami", async (request, response, next) => {
  try {
    response.status(201).json(await evaluateCourseExam(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/corsi/certificati/:id/pdf", async (request, response, next) => {
  try {
    const certificate = await getCourseCertificate(request.params.id, request.user);
    if (!certificate) return response.status(404).json({ error: "Certificazione non trovata" });
    writeCourseCertificatePdf(certificate, response);
  } catch (error) {
    next(error);
  }
});

app.get("/api/training", async (request, response, next) => {
  try {
    response.json(await listTraining(request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/training/courses", async (request, response, next) => {
  try {
    response.status(201).json(await createTrainingCourse(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/training/results", async (request, response, next) => {
  try {
    response.status(201).json(await saveTrainingResult(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/crm/clienti", async (request, response, next) => {
  try {
    response.json(await crmClients(request.user, request.query));
  } catch (error) {
    next(error);
  }
});

app.get("/api/crm/clienti/:id", async (request, response, next) => {
  try {
    const detail = await crmClientDetail(request.params.id, request.user);
    if (!detail) return response.status(404).json({ error: "Cliente non trovato" });
    response.json(detail);
  } catch (error) {
    next(error);
  }
});

app.put("/api/crm/clienti/:id", async (request, response, next) => {
  try {
    const client = await updateCrmClient(request.params.id, request.body, request.user);
    if (!client) return response.status(404).json({ error: "Cliente non trovato" });
    response.json(client);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/crm/clienti/:id", async (request, response, next) => {
  try {
    const deleted = await archiveCrmClient(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Cliente non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/crm/clienti/:id/note", async (request, response, next) => {
  try {
    response.status(201).json(await addClientNote(request.params.id, request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/giacenza/trasferimenti", async (request, response, next) => {
  try {
    response.status(201).json(await createInventoryTransfer(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/leggi-documento", async (request, response, next) => {
  try {
    const raw = await readDocumentWithOpenAi(
      request.body.immagine_fronte || request.body.frontImage || request.body.front,
      request.body.immagine_retro || request.body.backImage || request.body.back
    );
    response.json(raw);
  } catch (error) {
    if (!error.status) error.status = 502;
    if (!error.message) error.message = "Lettura AI documento non disponibile.";
    next(error);
  }
});

app.post("/api/ai/controlla-atto", async (request, response, next) => {
  try {
    response.json(await checkActWithOpenAi(request.body.atto || request.body.act || request.body));
  } catch (error) {
    if (!error.status) error.status = 502;
    if (!error.message) error.message = "Controllo AI atto non disponibile.";
    next(error);
  }
});

app.post("/api/ai/assistente", async (request, response, next) => {
  try {
    response.json(await askOroActiveAssistant(request.body.domanda || request.body.question || "", { mode: request.body.mode }));
  } catch (error) {
    if (!error.status) error.status = 502;
    if (!error.message) error.message = "Assistente IA non disponibile.";
    next(error);
  }
});

app.get("/api/ai/status", async (_request, response, next) => {
  try {
    response.json(await aiAssistantStatus());
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/books/status", requireFounder, async (_request, response, next) => {
  try {
    response.json({ documents: await aiKnowledgeStatus() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/upload-book", requireFounder, async (request, response, next) => {
  try {
    response.status(201).json(await uploadAiBook(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/reindex", requireFounder, async (request, response, next) => {
  try {
    response.json(await reindexAiBook(request.body.document_id || request.body.id || null));
  } catch (error) {
    next(error);
  }
});

app.put("/api/ai/book/:id", requireFounder, async (request, response, next) => {
  try {
    const document = await updateAiBook(request.params.id, request.body, request.user);
    if (!document) return response.status(404).json({ error: "Libro non trovato" });
    response.json(document);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/ai/book/:id", requireFounder, async (request, response, next) => {
  try {
    const deleted = await deleteAiBook(request.params.id);
    if (!deleted) return response.status(404).json({ error: "Libro non trovato" });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/knowledge", requireKnowledgeEditor, async (request, response, next) => {
  try {
    response.json(await listKnowledgeNotes(request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/knowledge", requireKnowledgeEditor, async (request, response, next) => {
  try {
    response.status(201).json(await createKnowledgeNote(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/ai/knowledge/:id", requireKnowledgeEditor, async (request, response, next) => {
  try {
    const note = await updateKnowledgeNote(request.params.id, request.body, request.user);
    if (!note) return response.status(404).json({ error: "Conoscenza non trovata" });
    response.json(note);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/ai/knowledge/:id", requireKnowledgeEditor, async (request, response, next) => {
  try {
    const deleted = await deleteKnowledgeNote(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Conoscenza non trovata" });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/knowledge/:id/approve", requireFounder, async (request, response, next) => {
  try {
    const note = await setKnowledgeNoteStatus(request.params.id, "approvata", request.user);
    if (!note) return response.status(404).json({ error: "Conoscenza non trovata" });
    response.json(note);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/knowledge/:id/reject", requireFounder, async (request, response, next) => {
  try {
    const note = await setKnowledgeNoteStatus(request.params.id, "rifiutata", request.user);
    if (!note) return response.status(404).json({ error: "Conoscenza non trovata" });
    response.json(note);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/feedback", async (request, response, next) => {
  try {
    response.status(201).json(await createAiFeedback(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/feedback", requireFounder, async (_request, response, next) => {
  try {
    response.json(await listAiFeedback());
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/feedback/:id/to-knowledge", requireFounder, async (request, response, next) => {
  try {
    const note = await feedbackToKnowledge(request.params.id, request.body, request.user);
    if (!note) return response.status(404).json({ error: "Feedback non trovato" });
    response.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/ai/feedback/:id", requireFounder, async (request, response, next) => {
  try {
    const deleted = await deleteAiFeedback(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Feedback non trovato" });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/faceid/register", async (request, response, next) => {
  try {
    response.json({ user: await registerFaceId(request.user, request.body.credentialId) });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/utenti", "/api/users"], async (_request, response, next) => {
  try {
    response.json(await listUsersForActor(_request.user));
  } catch (error) {
    next(error);
  }
});

app.get(["/api/utenti/:id/activity", "/api/users/:id/activity"], async (request, response, next) => {
  try {
    const activities = await listUserActivitiesForActor(request.params.id, request.user);
    if (!activities) return response.status(404).json({ error: "Utente non trovato" });
    response.json({ activities });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/utenti/:id", "/api/users/:id"], async (request, response, next) => {
  try {
    const user = await getUserForActor(request.params.id, request.user);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.post(["/api/utenti", "/api/users"], requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await createUser(request.body, request.user));
  } catch (error) {
    next(error);
  }
});

app.put(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body, request.user);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.patch(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body, request.user);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
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

app.get("/api/clienti/codice-fiscale/:codiceFiscale", async (request, response, next) => {
  try {
    const client = await getClientByFiscalCode(request.params.codiceFiscale);
    response.json(client ? publicClientLookup(client) : { found: false });
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

app.post("/api/fusioni/lotti", async (request, response, next) => {
  try {
    if (!["founder", "supervisore", "responsabile"].includes(normalizeRole(request.user?.ruolo))) {
      return response.status(403).json({ error: "Non autorizzato" });
    }
    const identifiers = Array.isArray(request.body.atti) ? request.body.atti : String(request.body.atti || "").split(",");
    const acts = [];
    for (const identifier of identifiers.map((item) => String(item).trim()).filter(Boolean)) {
      const row = await findExisting(identifier);
      if (row && canAccessAct(row, request.user)) acts.push(rowToAct(row));
    }
    if (!acts.length) return response.status(400).json({ error: "Nessun atto selezionato per il lotto fusione" });
    const store = acts[0].store || request.body.negozio || "";
    const storeRow = await storeByCodeOrName(store);
    const lots = acts.flatMap(materialLotsFromAct);
    const pesoTotale = lots.reduce((total, lot) => total + Number(lot.weight || 0), 0);
    const valoreTeorico = lots.reduce((total, lot) => total + Number(lot.weight || 0) * quoteForMetal(lot.act, lot.metal) / 1000 * titlePurity(lot.metal, lot.title), 0);
    const lottoCode = `FUS-${storeCodeFromName(store)}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-5)}`;
    const result = await pool.query(
      `INSERT INTO fusion_lots
        (lotto_code, negozio_id, negozio, raffineria, peso_totale, peso_netto, valore_teorico, stato, data_invio, payload, created_by)
       VALUES ($1::text,$2::bigint,$3::text,$4::text,$5::numeric,$6::numeric,$7::numeric,$8::text,$9::date,$10::jsonb,$11::bigint)
       RETURNING *`,
      [
        lottoCode,
        storeRow?.id || null,
        store,
        request.body.raffineria || "",
        pesoTotale,
        numberFrom(request.body.peso_netto || request.body.pesoNetto || pesoTotale),
        valoreTeorico,
        request.body.stato || "aperto",
        dateOrNull(request.body.data_invio || request.body.dataInvio) || new Date().toISOString().slice(0, 10),
        sanitizeForPostgres({ atti: acts.map((act) => act.id), riepilogo: stockSummaryFromActs(acts) }),
        request.user.id
      ]
    );
    response.status(201).json(result.rows[0]);
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

function drawPdfHeader(doc, act, title, options = {}) {
  const logoPath = path.join(__dirname, "oroactive-logo.png");
  if (options.centerLogo) {
    try {
      doc.image(logoPath, 252, 28, { width: 90, height: 90, fit: [90, 90] });
    } catch {
      // Il PDF resta valido anche se il logo non è disponibile.
    }
    doc.fillColor("#f47a20").fontSize(9).font("Helvetica-Bold").text("GESTIONALE OROACTIVE", 42, 124, { width: 511, align: "center" });
    doc.fillColor("#111").fontSize(18).font("Helvetica-Bold").text(title, 42, 139, { width: 511, align: "center" });
    doc.fillColor("#555").fontSize(9).font("Helvetica").text(`Atto n. ${act.practiceNumber || "Dato non inserito"} | ${act.date || ""} ${act.time || ""}`, 42, 164, { width: 511, align: "center" });
    doc.save().opacity(0.045).fillColor("#f47a20").fontSize(54).font("Helvetica-Bold").rotate(-30, { origin: [300, 410] }).text("OROACTIVE", 120, 410);
    doc.restore();
    doc.moveTo(42, 186).lineTo(553, 186).strokeColor("#f4c6a6").stroke();
    return;
  }
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
  y = drawPdfSectionTitle(doc, "6. Firme cliente e operatore", y);
  const signatures = (act.signatureImages || []).filter(Boolean);
  if (signatures.length) {
    signatures.forEach((signature, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 42 + column * 258;
      const boxY = y + row * 86;
      const buffer = dataUrlToBuffer(signature);
      const label = ["Firma vendita", "Firma dichiarazioni", "Firma privacy", "Firma operatore"][index] || `Firma ${index + 1}`;
      doc.roundedRect(x, boxY, 236, 72, 4).strokeColor("#e6d6c8").stroke();
      doc.fillColor("#777").font("Helvetica-Bold").fontSize(7).text(label, x + 7, boxY + 6);
      if (buffer) drawPdfImage(doc, buffer, x + 8, boxY + 18, { fit: [220, 48], align: "center", valign: "center" });
    });
    y += Math.ceil(signatures.length / 2) * 86;
  } else {
    doc.fillColor("#111").font("Helvetica").fontSize(9).text("Firme non disponibili nell'archivio digitale.", 42, y, { width: 511 });
    y += 28;
  }

  y = ensurePdfSpace(doc, y, 75);
  y = drawPdfSectionTitle(doc, "7. Riepilogo finale", y);
  doc.fillColor("#111").font("Helvetica").fontSize(9).text("Atto di vendita generato e archiviato nel gestionale OroActive con allegati fotografici e firme integrate.", 42, y, { width: 511, lineGap: 2 });
}

function drawCustomerPdfPage(doc, act, title) {
  doc.addPage();
  drawPdfHeader(doc, act, title, { centerLogo: true });
  let y = 204;
  y = drawPdfSectionTitle(doc, "Sezione cliente", y);
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
  y = drawPdfSectionTitle(doc, "Sezione vendita", y);
  (act.items || []).forEach((item, index) => {
    y = ensurePdfSpace(doc, y, 42);
    doc.roundedRect(42, y, 511, 34, 4).strokeColor("#e6d6c8").stroke();
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text(`${index + 1}. ${item.description || "Oggetto prezioso"}`, 50, y + 7, { width: 300, height: 18, ellipsis: true });
    doc.fillColor("#555").font("Helvetica").fontSize(9).text(`${item.metal || ""} - ${item.title || ""}`, 365, y + 7, { width: 175 });
    y += 40;
  });
  y = ensurePdfSpace(doc, y, 110);
  y = drawPdfFields(doc, [
    { label: "Metodo pagamento", value: act.paymentMethod },
    { label: "Totale corrisposto", value: pdfFormatEuro(act.amount) },
    ...(act.materialAmounts || []).map((row) => ({ label: `Totale corrisposto ${row.metal}`, value: pdfFormatEuro(row.amount) }))
  ], y, 2);

  y = ensurePdfSpace(doc, y, 135);
  y = drawPdfSectionTitle(doc, "Firme", y);
  const signatures = (act.signatureImages || []).filter(Boolean);
  if (signatures.length) {
    signatures.forEach((signature, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 42 + column * 258;
      const boxY = y + row * 86;
      const buffer = dataUrlToBuffer(signature);
      const label = ["Firma vendita", "Firma dichiarazioni", "Firma privacy", "Firma operatore"][index] || `Firma ${index + 1}`;
      doc.roundedRect(x, boxY, 236, 72, 4).strokeColor("#e6d6c8").stroke();
      doc.fillColor("#777").font("Helvetica-Bold").fontSize(7).text(label, x + 7, boxY + 6);
      if (buffer) drawPdfImage(doc, buffer, x + 8, boxY + 18, { fit: [220, 48], align: "center", valign: "center" });
    });
  } else {
    doc.fillColor("#111").font("Helvetica").fontSize(9).text("Firme non disponibili nell'archivio digitale.", 42, y, { width: 511 });
  }
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

function buildPdfForActs(response, { title = "Atto di vendita OroActive", subtitle = "", acts = [], scope = "company" }) {
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
    if (scope === "customer") {
      drawCustomerPdfPage(doc, act, heading);
    } else {
      drawActMainPdfPage(doc, act, heading);
      drawActAttachmentPdfPages(doc, act, heading);
    }
  });
  doc.end();
}

app.post("/api/pdf/act", async (request, response, next) => {
  try {
    const scope = request.body.scope || "company";
    const act = request.body.act || {};
    void logUserActivity({
      userId: request.user?.id,
      actorId: request.user?.id,
      activityType: scope === "customer" ? "print_customer_copy" : "print_company_copy",
      entityType: "atto",
      entityId: act.id || act.practiceNumber || null,
      description: scope === "customer" ? "Stampa copia cliente" : "Stampa copia aziendale",
      metadata: { practiceNumber: act.practiceNumber || "", scope }
    });
    buildPdfForActs(response, { title: request.body.title || "Atto di vendita OroActive", scope: request.body.scope || "company", acts: [request.body.act || {}] });
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
    const userStore = await storeForUser(request.user);
    const storeCode = roleSeesAllStores(request.user.ruolo)
      ? String(request.query.storeCode || userStore?.codice || "BUSTO")
      : userStore?.codice || storeCodeFromName(request.user.negozio);
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

function friendlyDatabaseError(error, request) {
  const url = request?.originalUrl || "";
  const constraint = String(error.constraint || "");
  if (error.code === "23505") {
    if (/\/api\/(utenti|users)/.test(url) || /utenti_(email|username)|utenti.*unique/i.test(constraint)) {
      return "Email/username già presente";
    }
    if (/\/api\/(crm|clienti)/.test(url) || /clienti/i.test(constraint)) {
      return "Impossibile salvare il CRM: codice fiscale già presente.";
    }
    if (/\/api\/atti|\/api\/acts/.test(url) || /atti_vendita|practice_number/i.test(constraint)) {
      return "Numero atto già presente: controlla la numerazione della pratica.";
    }
    return "Dato già presente: controlla i valori inseriti.";
  }
  if (error.code === "22P02") {
    if (/\/api\/(utenti|users)/.test(url)) return "Formato dato utente non valido.";
    return "Formato dato non valido: controlla ID atto, negozio o valori numerici.";
  }
  if (error.code === "22007" || error.code === "22008") return "Formato data non valido: controlla data atto, scadenza documento e data compilazione.";
  if (error.code === "23502") {
    if (/\/api\/(utenti|users)/.test(url)) return "Campo utente obbligatorio mancante.";
    return "Campo obbligatorio mancante nel salvataggio.";
  }
  if (error.code === "42703") return "Schema database non aggiornato: manca una colonna richiesta.";
  if (error.code === "42P01") return "Schema database non aggiornato: manca una tabella richiesta.";
  if (error.code === "42804" || error.code === "42P18") return "Tipo dato non valido nel salvataggio: controlla importi, date e identificativi.";
  if (/\/api\/(utenti|users)/.test(url)) return "Errore database durante il salvataggio dell'utente.";
  if (url.includes("/api/atti") || url.includes("/api/acts")) return "Errore database durante il salvataggio dell'atto. Verifica negozio, data, pagamento e allegati.";
  if (url.includes("/api/academy") || url.includes("/api/corsi")) return "Errore database durante il salvataggio Academy.";
  if (url.includes("/api/crm")) return "Errore database durante il salvataggio CRM.";
  if (url.includes("/api/backups")) return "Errore database durante il backup.";
  if (url.includes("/api/quotes") || url.includes("/api/quotazioni")) return "Errore database durante il salvataggio quotazioni.";
  return "Errore database: operazione non completata.";
}

app.use((error, request, response, _next) => {
  console.error(error);
  const isDatabaseError = Boolean(error.code || error.severity || error.routine);
  const message = isDatabaseError
    ? friendlyDatabaseError(error, request)
    : error.message || "Errore server";
  response.status(error.status || 500).json({ ok: false, error: message });
});

app.listen(port, () => {
  console.log(`OroActive gestionale in ascolto sulla porta ${port}`);
});

initDatabase()
  .then(() => {
    runtimeStatus.databaseReady = true;
    runtimeStatus.databaseError = "";
    scheduleBackups();
  })
  .catch((error) => {
    runtimeStatus.databaseReady = false;
    runtimeStatus.databaseError = error?.message || "Errore inizializzazione database";
    console.error("Errore inizializzazione database", error);
    if (process.env.REQUIRE_DATABASE_ON_START === "true") {
      process.exit(1);
    }
  });
