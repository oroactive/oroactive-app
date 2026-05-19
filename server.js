import crypto from "node:crypto";
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

function normalizeAct(input) {
  const parsed = parsePracticeNumber(input.practiceNumber);
  if (!parsed) {
    const error = new Error("Numero atto non valido. Usa formato OA-NEGOZIO-ANNO-NUMERO.");
    error.status = 400;
    throw error;
  }

  return {
    id: input.id || crypto.randomUUID(),
    practiceNumber: input.practiceNumber,
    store: input.store || "",
    storeCode: parsed.storeCode,
    actYear: parsed.year,
    actNumber: parsed.number,
    actDate: input.date || null,
    customerName: input.name || "",
    customerSurname: input.surname || "",
    amount: Number(input.amount || 0),
    paymentMethod: input.paymentMethod || "",
    totalWeight: Number(input.weight || 0),
    status: input.status || "Archiviata",
    payload: input
  };
}

function rowToAct(row) {
  return {
    ...row.payload,
    id: row.id,
    practiceNumber: row.practice_number,
    store: row.store,
    date: row.payload?.date || row.act_date,
    name: row.customer_name,
    surname: row.customer_surname,
    amount: row.payload?.amount ?? row.amount,
    paymentMethod: row.payment_method,
    weight: row.payload?.weight ?? row.total_weight,
    status: row.status
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
      name: "customer_name",
      surname: "customer_surname",
      practiceNumber: "practice_number",
      date: "act_date::text",
      store: "store",
      amount: "amount::text",
      paymentMethod: "payment_method",
      weight: "total_weight::text"
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
      LOWER(practice_number) LIKE ${parameter}
      OR LOWER(customer_name) LIKE ${parameter}
      OR LOWER(customer_surname) LIKE ${parameter}
      OR LOWER(store) LIKE ${parameter}
      OR LOWER(payment_method) LIKE ${parameter}
      OR LOWER(act_date::text) LIKE ${parameter}
      OR LOWER(amount::text) LIKE ${parameter}
      OR LOWER(total_weight::text) LIKE ${parameter}
      OR LOWER(payload::text) LIKE ${parameter}
    )`);
  }

  if (fusionEligible === "true") {
    where.push("act_date <= CURRENT_DATE - INTERVAL '10 days'");
  }

  return { where, values };
}

async function listActs(query = {}) {
  const { where, values } = buildActsQuery(query);
  const result = await pool.query(
    `SELECT * FROM ${actsTable}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY act_date DESC NULLS LAST, act_number DESC`,
    values
  );
  return result.rows.map(rowToAct);
}

async function nextActNumber(storeCode, year) {
  const result = await pool.query(
    `SELECT COALESCE(MAX(act_number), 0) + 1 AS next_number FROM ${actsTable} WHERE store_code = $1 AND act_year = $2`,
    [storeCode, year]
  );
  return Number(result.rows[0].next_number);
}

async function getAct(practiceNumber) {
  const result = await pool.query(`SELECT * FROM ${actsTable} WHERE practice_number = $1`, [practiceNumber]);
  return result.rowCount ? rowToAct(result.rows[0]) : null;
}

async function saveAct(input) {
  const act = normalizeAct(input);
  const result = await pool.query(
    `INSERT INTO ${actsTable} (
      id, practice_number, store, store_code, act_year, act_number, act_date,
      customer_name, customer_surname, amount, payment_method, total_weight, status, payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (practice_number) DO UPDATE SET
      store = EXCLUDED.store,
      store_code = EXCLUDED.store_code,
      act_year = EXCLUDED.act_year,
      act_number = EXCLUDED.act_number,
      act_date = EXCLUDED.act_date,
      customer_name = EXCLUDED.customer_name,
      customer_surname = EXCLUDED.customer_surname,
      amount = EXCLUDED.amount,
      payment_method = EXCLUDED.payment_method,
      total_weight = EXCLUDED.total_weight,
      status = EXCLUDED.status,
      payload = EXCLUDED.payload,
      updated_at = NOW()
    RETURNING *`,
    [
      act.id,
      act.practiceNumber,
      act.store,
      act.storeCode,
      act.actYear,
      act.actNumber,
      act.actDate,
      act.customerName,
      act.customerSurname,
      act.amount,
      act.paymentMethod,
      act.totalWeight,
      act.status,
      act.payload
    ]
  );
  return rowToAct(result.rows[0]);
}

async function updateAct(practiceNumber, input) {
  const act = normalizeAct({ ...input, practiceNumber });
  const result = await pool.query(
    `UPDATE ${actsTable} SET
      store = $2, store_code = $3, act_year = $4, act_number = $5, act_date = $6,
      customer_name = $7, customer_surname = $8, amount = $9, payment_method = $10,
      total_weight = $11, status = $12, payload = $13, updated_at = NOW()
     WHERE practice_number = $1
     RETURNING *`,
    [
      act.practiceNumber,
      act.store,
      act.storeCode,
      act.actYear,
      act.actNumber,
      act.actDate,
      act.customerName,
      act.customerSurname,
      act.amount,
      act.paymentMethod,
      act.totalWeight,
      act.status,
      act.payload
    ]
  );
  return result.rowCount ? rowToAct(result.rows[0]) : null;
}

async function deleteActByPracticeNumber(practiceNumber) {
  const result = await pool.query(`DELETE FROM ${actsTable} WHERE practice_number = $1 RETURNING practice_number`, [
    practiceNumber
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

app.get(["/api/atti/:practiceNumber", "/api/acts/:practiceNumber"], async (request, response, next) => {
  try {
    const act = await getAct(request.params.practiceNumber);
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

app.put(["/api/atti/:practiceNumber", "/api/acts/:practiceNumber"], async (request, response, next) => {
  try {
    const act = await updateAct(request.params.practiceNumber, request.body);
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/atti/:practiceNumber", "/api/acts/:practiceNumber"], async (request, response, next) => {
  try {
    const deleted = await deleteActByPracticeNumber(request.params.practiceNumber);
    if (!deleted) return response.status(404).json({ error: "Atto non trovato" });
    response.json({ ok: true, practiceNumber: request.params.practiceNumber });
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
