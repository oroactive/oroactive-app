import crypto from "node:crypto";

import { containsAssistantPersonalData } from "./privacy.js";
import "../../shared/aurum-policy.js";

const sharedPolicy = globalThis.OroActiveAurumPolicy;
if (!sharedPolicy?.containsForbiddenMemoryData) {
  throw new Error("Policy condivisa privacy e sicurezza Aurum non disponibile.");
}

export const AURUM_MEMORY_CONSENT_VERSION = "aurum-memory-v2-2026-07-30";

export const AURUM_MEMORY_TYPES = Object.freeze({
  preferred_name: Object.freeze({ label: "Nome preferito", singularKey: "profile.preferred_name", sensitivity: "sensitive", maxLength: 60 }),
  birthday: Object.freeze({ label: "Compleanno", singularKey: "profile.birthday", sensitivity: "sensitive", maxLength: 10 }),
  communication_preference: Object.freeze({ label: "Preferenza di comunicazione", sensitivity: "personal", maxLength: 300 }),
  work_preference: Object.freeze({ label: "Preferenza di lavoro", sensitivity: "personal", maxLength: 300 }),
  training_preference: Object.freeze({ label: "Preferenza di apprendimento", sensitivity: "personal", maxLength: 300 }),
  goal: Object.freeze({ label: "Obiettivo", sensitivity: "personal", maxLength: 500 }),
  habit: Object.freeze({ label: "Abitudine", sensitivity: "personal", maxLength: 500 }),
  strength: Object.freeze({ label: "Punto di forza", sensitivity: "personal", maxLength: 400 }),
  reflection: Object.freeze({ label: "Riflessione", sensitivity: "personal", maxLength: 500 }),
  commitment: Object.freeze({ label: "Impegno", sensitivity: "personal", maxLength: 500 }),
  boundary: Object.freeze({ label: "Confine personale", sensitivity: "personal", maxLength: 400 }),
  request: Object.freeze({ label: "Richiesta da ricordare", sensitivity: "personal", maxLength: 500 })
});

const credentialPattern = /\b(?:password|passcode|pin|token|api key|chiave segreta|credenzial[ei])\b/iu;
const customerDataPattern = /\b(?:cliente|documento d['’]?identit[aà]|carta d['’]?identit[aà]|passaporto|patente|codice fiscale|partita iva|iban|conto corrente|firma biometrica)\b/iu;

function memoryError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizePlainText(value = "", maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizePreferredName(value = "") {
  const name = normalizePlainText(value, 60);
  if (!name || !/^[\p{L}][\p{L}'’ -]{0,59}$/u.test(name)) {
    throw memoryError("Il nome preferito non è valido.");
  }
  return name;
}

function normalizeBirthday(value = "") {
  const match = String(value || "").trim().match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](?:19|20)\d{2})?\b/);
  if (!match) throw memoryError("Il compleanno deve contenere giorno e mese.");
  const day = Number(match[1]);
  const month = Number(match[2]);
  const check = new Date(Date.UTC(2000, month - 1, day));
  if (check.getUTCDate() !== day || check.getUTCMonth() !== month - 1) {
    throw memoryError("Il compleanno non è valido.");
  }
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function normalizeGeneralMemory(value = "", maxLength = 500) {
  const text = normalizePlainText(value, maxLength);
  if (text.length < 2) throw memoryError("La memoria Aurum è vuota.");
  if (containsAurumForbiddenMemoryData(text)) {
    throw memoryError("Questa informazione non può essere salvata nella memoria Aurum: riguarda categorie particolari o salute.");
  }
  if (credentialPattern.test(text)) {
    throw memoryError("Questa informazione non può essere salvata nella memoria Aurum: contiene credenziali.");
  }
  if (customerDataPattern.test(text) || containsAssistantPersonalData(text)) {
    throw memoryError("Questa informazione non può essere salvata nella memoria Aurum: contiene dati cliente o identificativi non consentiti.");
  }
  return text;
}

export function containsAurumForbiddenMemoryData(value = "") {
  return sharedPolicy.containsForbiddenMemoryData(value);
}

export function normalizeAurumMemoryType(value = "") {
  const type = String(value || "").trim().toLowerCase();
  if (!Object.hasOwn(AURUM_MEMORY_TYPES, type)) {
    throw memoryError("Tipo di memoria Aurum non consentito.");
  }
  return type;
}

export function normalizeAurumMemoryInput(input = {}) {
  if (input.automatic === true || input.explicit_consent !== true) {
    throw memoryError("È necessario il consenso esplicito per salvare una memoria Aurum.");
  }

  const memoryType = normalizeAurumMemoryType(input.memory_type || input.type);
  const definition = AURUM_MEMORY_TYPES[memoryType];
  const rawValue = input.memory_value ?? input.value ?? input.memory_text ?? input.text ?? "";
  const value = memoryType === "preferred_name"
    ? normalizePreferredName(rawValue)
    : memoryType === "birthday"
      ? normalizeBirthday(rawValue)
      : normalizeGeneralMemory(rawValue, definition.maxLength);
  const requestedKey = normalizePlainText(input.memory_key || "", 100).toLowerCase();
  const memoryKey = definition.singularKey || (/^[a-z0-9_.-]{3,100}$/.test(requestedKey) ? requestedKey : null);

  return Object.freeze({
    memoryType,
    memoryKey,
    label: definition.label,
    value,
    sensitivity: definition.sensitivity,
    consentVersion: AURUM_MEMORY_CONSENT_VERSION,
    useInChat: input.use_in_chat !== false,
    shareWithAi: input.share_with_ai === true
  });
}

function encryptionKey(secret = "") {
  const value = String(secret || "");
  if (value.length < 16) throw memoryError("Chiave di cifratura memoria Aurum non configurata.");
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function encryptionAad({ userId, memoryId, memoryType }) {
  return Buffer.from(`aurum-memory|${String(userId)}|${String(memoryId)}|${String(memoryType)}`, "utf8");
}

export function encryptAurumMemoryValue(value = "", options = {}) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(options.secret), iv);
  cipher.setAAD(encryptionAad(options));
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAurumMemoryValue(payload = "", options = {}) {
  const [version, ivValue, tagValue, encryptedValue] = String(payload || "").split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw memoryError("Formato memoria Aurum cifrata non valido.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(options.secret),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAAD(encryptionAad(options));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function aurumMemoryTypeLabel(type = "") {
  return AURUM_MEMORY_TYPES[String(type || "").trim().toLowerCase()]?.label || "Memoria personale";
}

export function redactAurumPrivateMemoryValues(value = "", memories = []) {
  let output = String(value || "");
  const privateValues = memories
    .filter((memory) => memory.share_with_ai !== true && !memory.unavailable)
    .map((memory) => String(memory.memory_value || memory.memory_text || "").trim())
    .filter((memoryValue) => memoryValue.length >= 2)
    .sort((left, right) => right.length - left.length);
  for (const privateValue of privateValues) {
    const escaped = privateValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(
      new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu"),
      "$1[memoria privata omessa]"
    );
  }
  return output;
}

const coachingMemoryTypes = new Set([
  "preferred_name",
  "communication_preference",
  "work_preference",
  "training_preference",
  "goal",
  "habit",
  "strength",
  "reflection",
  "commitment",
  "boundary",
  "request"
]);

function normalizeMemoryIntentText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectAurumMemoriesForAi(memories = [], options = {}) {
  if (options.blockPersonalMemory === true) return [];
  const question = normalizeMemoryIntentText(options.question || "");
  const hasCoachingContext = options.hasCoachingContext === true;
  const requestedTypes = new Set();

  if (hasCoachingContext) {
    coachingMemoryTypes.forEach((type) => requestedTypes.add(type));
  } else {
    if (/\b(?:come mi chiamo|qual e il mio nome|nome preferito|come vuoi chiamarmi|chiamami)\b/.test(question)) {
      requestedTypes.add("preferred_name");
    }
    if (/\b(?:compleanno|data del mio compleanno|quando sono nat[oa]|fammi gli auguri)\b/.test(question)) {
      requestedTypes.add("birthday");
    }
    if (/\b(?:come preferisco che tu risponda|preferenza di comunicazione|tono delle risposte|risposte? piu brevi|domande? una alla volta)\b/.test(question)) {
      requestedTypes.add("communication_preference");
    }
    if (/\b(?:come preferisco imparare|preferenza di apprendimento|metodo di studio)\b/.test(question)) {
      requestedTypes.add("training_preference");
    }
  }

  return memories
    .filter((memory) => (
      memory
      && memory.share_with_ai === true
      && memory.unavailable !== true
      && requestedTypes.has(String(memory.memory_type || ""))
      && String(memory.memory_value || memory.memory_text || "").trim()
    ))
    .slice(0, 8);
}
