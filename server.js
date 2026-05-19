import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);
const actsTable = "atti_vendita";
const jwtSecret = process.env.JWT_SECRET || "cambia-questa-chiave-jwt-oroactive";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

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
  return {
    id: row.id,
    nome: row.nome,
    cognome: row.cognome,
    username: row.username,
    email: row.email,
    ruolo: row.ruolo,
    negozio: row.negozio,
    data_creazione: row.data_creazione
  };
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      ruolo: user.ruolo,
      negozio: user.negozio
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function findUserById(id) {
  const result = await pool.query(
    "SELECT id, nome, cognome, username, email, ruolo, negozio, data_creazione FROM utenti WHERE id = $1",
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
    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Sessione scaduta o non valida" });
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.ruolo !== "admin") {
    return response.status(403).json({ error: "Operazione riservata all'amministratore" });
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
        ruolo = 'admin',
        negozio = $7
       WHERE id = $1`,
      [
        existing.rows[0].id,
        process.env.ADMIN_NOME || "Elite",
        process.env.ADMIN_COGNOME || "Admin",
        username,
        email,
        passwordHash,
        process.env.ADMIN_NEGOZIO || "Busto Arsizio"
      ]
    );
    return;
  }

  await pool.query(
    `INSERT INTO utenti (nome, cognome, username, email, password_hash, ruolo, negozio)
     VALUES ($1, $2, $3, LOWER($4), $5, 'admin', $6)`,
    [
      process.env.ADMIN_NOME || "Elite",
      process.env.ADMIN_COGNOME || "Admin",
      username,
      email,
      passwordHash,
      process.env.ADMIN_NEGOZIO || "Busto Arsizio"
    ]
  );
}

function buildActsQuery({ store, field, q, fusionEligible } = {}, user = null) {
  const where = [];
  const values = [];

  const effectiveStore = user?.ruolo === "operatore" ? user.negozio : store;
  if (effectiveStore) {
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

async function listActs(query = {}, user = null) {
  const { where, values } = buildActsQuery(query, user);
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

function enforceActStore(input, user) {
  if (!user || user.ruolo === "admin") return input;
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
  return user?.ruolo === "admin" || row?.store === user?.negozio;
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

async function updateAct(identifier, input, user) {
  const existing = await findExisting(identifier);
  if (!existing) return null;
  if (!canAccessAct(existing, user)) {
    const error = new Error("Atto non accessibile per il negozio assegnato");
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

async function deleteAct(identifier, user) {
  const existing = await findExisting(identifier);
  if (!existing) return false;
  if (!canAccessAct(existing, user)) {
    const error = new Error("Atto non accessibile per il negozio assegnato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(`DELETE FROM ${actsTable} WHERE id = $1 RETURNING id`, [
    existing.id
  ]);
  return result.rowCount > 0;
}

async function createUser(input) {
  const password = String(input.password || "");
  if (password.length < 8) {
    const error = new Error("La password deve avere almeno 8 caratteri");
    error.status = 400;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO utenti (nome, cognome, username, email, password_hash, ruolo, negozio)
     VALUES ($1, $2, NULLIF($3, ''), LOWER($4), $5, $6, $7)
     RETURNING id, nome, cognome, username, email, ruolo, negozio, data_creazione`,
    [
      input.nome || "",
      input.cognome || "",
      input.username || "",
      input.email || "",
      passwordHash,
      input.ruolo === "admin" ? "admin" : "operatore",
      input.negozio || "Busto Arsizio"
    ]
  );
  return publicUser(result.rows[0]);
}

async function updateUser(id, input) {
  const fields = [];
  const values = [];
  const allowed = ["nome", "cognome", "username", "email", "ruolo", "negozio"];
  allowed.forEach((field) => {
    if (input[field] === undefined) return;
    const value = field === "email" ? String(input[field]).toLowerCase() : input[field];
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
     RETURNING id, nome, cognome, username, email, ruolo, negozio, data_creazione`,
    values
  );
  return result.rowCount ? publicUser(result.rows[0]) : null;
}

async function listUsers() {
  const result = await pool.query(
    "SELECT id, nome, cognome, username, email, ruolo, negozio, data_creazione FROM utenti ORDER BY data_creazione DESC"
  );
  return result.rows.map(publicUser);
}

async function loginUser(identifier, password) {
  const result = await pool.query(
    "SELECT * FROM utenti WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)",
    [identifier || ""]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
    const error = new Error("Email o password non corretti");
    error.status = 401;
    throw error;
  }
  const safeUser = publicUser(user);
  return { token: signUserToken(safeUser), user: safeUser };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "oroactive-gestionale" });
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    response.json(await loginUser(request.body.email, request.body.password));
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

app.get("/api/utenti", requireAdmin, async (_request, response, next) => {
  try {
    response.json(await listUsers());
  } catch (error) {
    next(error);
  }
});

app.post("/api/utenti", requireAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await createUser(request.body));
  } catch (error) {
    next(error);
  }
});

app.put("/api/utenti/:id", requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
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

app.get(["/api/atti/next-number", "/api/acts/next-number"], async (request, response, next) => {
  try {
    const storeCode = request.user.ruolo === "operatore"
      ? storeCodeFromName(request.user.negozio)
      : String(request.query.storeCode || "");
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
