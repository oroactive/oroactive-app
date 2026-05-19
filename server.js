import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);
const actsTable = "atti_vendita";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

function parsePracticeNumber(practiceNumber = "") {
  const match = String(practiceNumber).match(/^OA-([^-]+)-(\d{4})-(\d+)$/);
  if (!match) return null;
  return {
    storeCode: match[1],
    year: Number(match[2]),
    number: Number(match[3])
  };
}

function numberFrom(value) {
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
    totale: numberFrom(input.amount ?? input.totale ?? existing?.totale),
    paymentMethod: input.paymentMethod || existing?.payment_method || "",
    status: normalizeWorkflowStatus(input.status || existing?.status || "Archiviata"),
    payload
  };
}

function rowToAct(row) {
  const payload = row.payload || {};
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
    weight: payload.weight ?? row.peso_oro,
    amount: payload.amount ?? row.totale,
    paymentMethod: row.payment_method || payload.paymentMethod || "",
    status: normalizeWorkflowStatus(row.status || payload.status || "Archiviata")
  };
}

async function initDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
}

function buildActsQuery({ store, field, q, fusionEligible } = {}) {
  const where = [];
  const values = [];

  if (store) {
    values.push(store);
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

async function listActs(query = {}) {
  const { where, values } = buildActsQuery(query);
  const result = await pool.query(
    `SELECT * FROM ${actsTable}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY data_atto DESC NULLS LAST, act_number DESC NULLS LAST, updated_at DESC`,
    values
  );
  return result.rows.map(rowToAct);
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

async function saveAct(input) {
  const existing = input.id ? await findExisting(input.id) : input.practiceNumber ? await findExisting(input.practiceNumber) : null;
  if (existing) return updateAct(existing.id, input);
  const act = normalizeAct(input, existing);
  const result = await pool.query(
    `INSERT INTO ${actsTable} (
      cliente_nome, cliente_cognome, codice_fiscale, telefono,
      peso_oro, quotazione, totale, data_atto,
      practice_number, store, store_code, act_year, act_number,
      payment_method, status, payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
      act.payload
    ]
  );
  return rowToAct(result.rows[0]);
}

async function updateAct(identifier, input) {
  const existing = await findExisting(identifier);
  if (!existing) return null;
  const act = normalizeAct(input, existing);
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
      payload = $17,
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
      act.payload
    ]
  );
  return result.rowCount ? rowToAct(result.rows[0]) : null;
}

async function deleteAct(identifier) {
  const result = await pool.query(`DELETE FROM ${actsTable} WHERE id::text = $1 OR practice_number = $1 RETURNING id`, [
    identifier
  ]);
  return result.rowCount > 0;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "oroactive-gestionale" });
});

app.get(["/api/atti", "/api/acts"], async (request, response, next) => {
  try {
    response.json(await listActs(request.query));
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/search", "/api/acts/search"], async (request, response, next) => {
  try {
    response.json(await listActs(request.query));
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/next-number", "/api/acts/next-number"], async (request, response, next) => {
  try {
    const storeCode = String(request.query.storeCode || "");
    const year = Number(request.query.year || new Date().getFullYear());
    response.json({ nextNumber: await nextActNumber(storeCode, year) });
  } catch (error) {
    next(error);
  }
});

app.get(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const act = await getAct(request.params.id);
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.post(["/api/atti", "/api/acts"], async (request, response, next) => {
  try {
    response.status(201).json(await saveAct(request.body));
  } catch (error) {
    next(error);
  }
});

app.put(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const act = await updateAct(request.params.id, request.body);
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const deleted = await deleteAct(request.params.id);
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
