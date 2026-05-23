import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
const port = Number(process.env.PORT || 3000);
const actsTable = "atti_vendita";
const CASH_PAYMENT_LIMIT = 499.99;
const ACT_LIST_LIMIT = 50;
const jwtSecret = process.env.JWT_SECRET || "cambia-questa-chiave-jwt-oroactive";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const openaiEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
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

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const aiRuntime = {
  pgvector: false,
  vectorColumn: null,
  jsonColumn: "embedding_json",
  pgvectorMessage: "pgvector non verificato",
  embeddingDimension: 1536
};

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
  return ["founder", "supervisore", "responsabile", "commesso"].includes(normalizeRole(role));
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

function requireFounder(request, response, next) {
  if (normalizeRole(request.user?.ruolo) !== "founder") {
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

function normalizeWorkflowStatus(status = "Archiviata") {
  if (typeof status !== "string") return "Archiviata";
  const normalized = status.trim().toLowerCase();
  if (normalized === "completato" || normalized === "completata") return "Completato";
  if (normalized === "bozza") return "Bozza";
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
      enum: ["La bilancia d'oro", "La bilancia d'oro + integrazione generale", "Integrazione generale"]
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
Verifica campi mancanti, documento scaduto, codice fiscale, firme, pagamento, foto documenti, foto preziosi, contabile se Bonifico o Assegno, importo contanti massimo 499,99 EUR.
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

function chunkBookText(text = "", maxChars = 3200, overlap = 350) {
  const normalized = normalizeBookText(text);
  const chunks = [];
  let index = 0;
  while (index < normalized.length) {
    const targetEnd = Math.min(index + maxChars, normalized.length);
    const nextBreak = normalized.lastIndexOf("\n\n", targetEnd);
    const end = nextBreak > index + 1200 ? nextBreak : targetEnd;
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
  const initialColumns = await aiChunkColumns();
  const legacyEmbedding = initialColumns.find((column) => column.column_name === "embedding");
  aiRuntime.jsonColumn = legacyEmbedding && legacyEmbedding.data_type !== "USER-DEFINED" ? "embedding" : "embedding_json";

  try {
    const installed = await pool.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if (!installed.rowCount) {
      await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    }
    const active = await pool.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if (!active.rowCount) throw new Error("Estensione vector non attiva");

    const columns = await aiChunkColumns();
    const embeddingColumn = columns.find((column) => column.column_name === "embedding");
    if (!embeddingColumn) {
      await pool.query(`ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding vector(${aiRuntime.embeddingDimension})`);
      aiRuntime.vectorColumn = "embedding";
    } else if (embeddingColumn.udt_name === "vector") {
      aiRuntime.vectorColumn = "embedding";
    } else {
      await pool.query(`ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(${aiRuntime.embeddingDimension})`);
      aiRuntime.vectorColumn = "embedding_vector";
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_chunks_embedding
      ON ai_document_chunks
      USING ivfflat (${sqlIdentifier(aiRuntime.vectorColumn)} vector_cosine_ops)
    `);
    aiRuntime.pgvector = true;
    aiRuntime.pgvectorMessage = `pgvector attivo su colonna ${aiRuntime.vectorColumn}`;
    console.log(aiRuntime.pgvectorMessage);
  } catch (error) {
    aiRuntime.pgvector = false;
    aiRuntime.vectorColumn = null;
    aiRuntime.pgvectorMessage = "pgvector non disponibile, uso ricerca testuale fallback";
    console.log(aiRuntime.pgvectorMessage);
    if (error?.message) console.log(`Dettaglio pgvector: ${error.message}`);
  }
}

async function insertAiChunk(db, { document, index, content, embedding }) {
  const jsonColumn = sqlIdentifier(aiRuntime.jsonColumn);
  const metadata = { titolo: document.titolo, autore: document.autore };
  if (aiRuntime.pgvector && aiRuntime.vectorColumn) {
    const vectorColumn = sqlIdentifier(aiRuntime.vectorColumn);
    await db.query(
      `INSERT INTO ai_document_chunks (document_id, chunk_index, content, ${jsonColumn}, ${vectorColumn}, metadata)
       VALUES ($1, $2, $3, $4::jsonb, $5::vector, $6)`,
      [document.id, index, content, JSON.stringify(embedding || []), vectorInput(embedding), metadata]
    );
    return;
  }

  await db.query(
    `INSERT INTO ai_document_chunks (document_id, chunk_index, content, ${jsonColumn}, metadata)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [document.id, index, content, JSON.stringify(embedding || []), metadata]
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
  requireOpenAiClient();
  const extractedText = normalizeBookText(await extractBookText({ filename, dataUrl }));
  const chunks = chunkBookText(extractedText);
  if (!chunks.length) {
    const error = new Error("Il libro non contiene testo estraibile sufficiente.");
    error.status = 400;
    throw error;
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
        { chunks: chunks.length, embeddingModel: openaiEmbeddingModel }
      ]
    );
    const document = documentResult.rows[0];
    const embeddings = await createTextEmbeddings(chunks);
    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index];
      const embedding = embeddings[index];
      await insertAiChunk(db, { document, index, content, embedding });
    }
    await db.query("COMMIT");
    return { ...document, chunks: chunks.length };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

async function aiKnowledgeStatus() {
  const result = await pool.query(`
    SELECT d.id, d.titolo, d.autore, d.filename, d.uploaded_by, d.created_at, COUNT(c.id)::int AS chunks
    FROM ai_documents d
    LEFT JOIN ai_document_chunks c ON c.document_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `);
  return result.rows;
}

async function reindexAiBook(documentId) {
  requireOpenAiClient();
  const params = [];
  let where = "";
  if (documentId) {
    params.push(documentId);
    where = "WHERE document_id = $1";
  }
  const result = await pool.query(`SELECT id, content FROM ai_document_chunks ${where} ORDER BY document_id, chunk_index`, params);
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
    requireOpenAiClient();
    const extractedText = normalizeBookText(await extractBookText({ filename: input.filename, dataUrl: input.dataUrl }));
    const chunks = chunkBookText(extractedText);
    if (!chunks.length) {
      const error = new Error("Il libro non contiene testo estraibile sufficiente.");
      error.status = 400;
      throw error;
    }

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
          JSON.stringify({ chunks: chunks.length, embeddingModel: openaiEmbeddingModel, replacedAt: new Date().toISOString() })
        ]
      );
      const document = documentResult.rows[0];
      if (!document) {
        await db.query("ROLLBACK");
        return null;
      }
      await db.query("DELETE FROM ai_document_chunks WHERE document_id = $1", [id]);
      const embeddings = await createTextEmbeddings(chunks);
      for (let index = 0; index < chunks.length; index += 1) {
        const content = chunks[index];
        const embedding = embeddings[index];
        await insertAiChunk(db, { document, index, content, embedding });
      }
      await db.query("COMMIT");
      return { ...document, chunks: chunks.length };
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

async function searchAiChunks(question = "") {
  const text = String(question || "").trim();
  if (!text) return [];

  if (aiRuntime.pgvector && aiRuntime.vectorColumn) {
    try {
      const questionEmbedding = await createTextEmbedding(text);
      const vectorColumn = sqlIdentifier(aiRuntime.vectorColumn);
      const result = await pool.query(
        `SELECT c.id, c.content, c.chunk_index, d.titolo, d.autore,
                1 - (c.${vectorColumn} <=> $1::vector) AS score
         FROM ai_document_chunks c
         JOIN ai_documents d ON d.id = c.document_id
         WHERE c.${vectorColumn} IS NOT NULL
         ORDER BY c.${vectorColumn} <=> $1::vector
         LIMIT 6`,
        [vectorInput(questionEmbedding)]
      );
      if (result.rows.length) return result.rows;
    } catch (error) {
      console.log(`Ricerca pgvector non disponibile, uso fallback testuale: ${error.message}`);
    }
  }

  if (!aiRuntime.pgvector) {
    console.log("pgvector non disponibile, uso ricerca testuale fallback");
  }

  const fullTextResult = await pool.query(
    `SELECT c.id, c.content, c.chunk_index, d.titolo, d.autore,
            ts_rank_cd(to_tsvector('italian', c.content), plainto_tsquery('italian', $1)) AS score
     FROM ai_document_chunks c
     JOIN ai_documents d ON d.id = c.document_id
     WHERE to_tsvector('italian', c.content) @@ plainto_tsquery('italian', $1)
        OR c.content ILIKE $2
     ORDER BY score DESC, c.created_at DESC
     LIMIT 6`,
    [text, `%${text.slice(0, 120)}%`]
  );
  if (fullTextResult.rows.length || !openai) return fullTextResult.rows;

  try {
    const questionEmbedding = await createTextEmbedding(text);
    const jsonColumn = sqlIdentifier(aiRuntime.jsonColumn);
    const rows = await pool.query(`
      SELECT c.id, c.content, c.${jsonColumn} AS embedding_json, c.chunk_index, d.titolo, d.autore
      FROM ai_document_chunks c
      JOIN ai_documents d ON d.id = c.document_id
      WHERE c.${jsonColumn} IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 1500
    `);
    return rows.rows
      .map((row) => ({
        ...row,
        score: cosineSimilarity(questionEmbedding, Array.isArray(row.embedding_json) ? row.embedding_json : [])
      }))
      .filter((row) => row.score > 0.18)
      .sort((first, second) => second.score - first.score)
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function askOroActiveAssistant(question = "") {
  const client = requireOpenAiClient();
  const domanda = String(question || "").trim();
  if (!domanda) {
    const error = new Error("Inserisci una domanda per l'assistente.");
    error.status = 400;
    throw error;
  }

  const chunks = await searchAiChunks(domanda);
  const hasBookContext = chunks.length > 0;
  const context = chunks.map((chunk, index) => (
    `[Fonte ${index + 1}: ${chunk.titolo || "La bilancia d'oro"}, chunk ${chunk.chunk_index}]\n${chunk.content}`
  )).join("\n\n---\n\n");

  const result = await client.responses.create({
    model: openaiModel,
    input: `Sei l'Assistente IA OroActive, esperto di compro oro, oro, argento, platino, diamanti, gemme, gestione negozio, procedure operative e formazione operatori.
Rispondi sempre in italiano, in modo chiaro, pratico, professionale.
Usa come fonte primaria il libro "La bilancia d'oro" di Christian Dinato.
Se il contesto del libro e sufficiente, inizia con "Dal libro risulta...".
Se il contesto del libro non contiene abbastanza informazioni, devi scrivere esattamente: "Questa informazione non è presente nel libro".
Solo dopo quella frase puoi aggiungere una sezione "In integrazione generale..." con conoscenza generale, senza inventare fonti.
Non attribuire al libro contenuti non presenti nei passaggi forniti.
Non citare leggi o norme come certe se non sono presenti nel contesto: in quel caso suggerisci verifica professionale.

CONTESTO DAL LIBRO:
${hasBookContext ? context : "Nessun passaggio del libro trovato per questa domanda."}

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
    fonte: parsed.fonte || (hasBookContext ? "La bilancia d'oro" : "Integrazione generale"),
    dal_libro: Boolean(parsed.dal_libro && hasBookContext),
    citazioni: Array.isArray(parsed.citazioni) ? parsed.citazioni : [],
    risultati: chunks.map((chunk) => ({
      titolo: chunk.titolo,
      autore: chunk.autore,
      chunk_index: chunk.chunk_index,
      score: Number(chunk.score || 0)
    }))
  };
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
  await setupAiVectorStorage();
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
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
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

async function listUsers(options = {}) {
  const where = options.includeFounder ? "" : "WHERE ruolo <> 'founder'";
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, ruolo, negozio, face_id_credential, data_creazione, last_seen FROM utenti ${where} ORDER BY data_creazione DESC`
  );
  return result.rows.map(publicUser);
}

async function listUsersForActor(actor) {
  const actorRole = normalizeRole(actor?.ruolo);
  if (actorRole === "founder") return listUsers({ includeFounder: true });
  if (actorRole === "supervisore") return listUsers();
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
    response.json(await askOroActiveAssistant(request.body.domanda || request.body.question || ""));
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

function drawCustomerPdfPage(doc, act, title) {
  doc.addPage();
  drawPdfHeader(doc, act, title);
  let y = 122;
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
