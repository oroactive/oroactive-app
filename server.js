import { createReadStream, createWriteStream } from "node:fs";
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
import { createAiCompetitorQuoteExtractor } from "./services/competitors/aiCompetitorQuoteExtractor.js";
import { createCompetitorExtractionTrainer } from "./services/competitors/competitorExtractionTrainer.js";
import { createAmicoOroExtractor } from "./services/competitors/extractors/amicoOroExtractor.js";
import { createBancoPreziosiExtractor } from "./services/competitors/extractors/bancoPreziosiExtractor.js";
import { createBordinExtractor } from "./services/competitors/extractors/bordinExtractor.js";
import { createGoldStandardExtractor } from "./services/competitors/extractors/goldStandardExtractor.js";
import { createGruppoOro24kExtractor } from "./services/competitors/extractors/gruppoOro24kExtractor.js";
import { createOroDOroExtractor } from "./services/competitors/extractors/oroDOroExtractor.js";
import { createOroExpressExtractor } from "./services/competitors/extractors/oroExpressExtractor.js";
import { createOroInEuroExtractor } from "./services/competitors/extractors/oroInEuroExtractor.js";
import { createProntoGoldExtractor } from "./services/competitors/extractors/prontoGoldExtractor.js";
import { fetchBullionVaultSpotPrice } from "./services/marketData/bullionVaultProvider.js";
import {
  GOLD_MASTER_BADGE_NAME,
  GOLD_MASTER_CERTIFICATION_NAME,
  GOLD_MASTER_COURSE_CODE,
  GOLD_MASTER_COURSE_TITLE,
  GOLD_MASTER_MEDIA_PROMPTS,
  buildGoldMasterCoursePayload,
  findBilanciaDOroSource,
  slugifyGoldMaster
} from "./services/academy/goldMasterCourseGenerator.js";

dotenv.config();

const { Pool, Client } = pg;
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
const metalPriceProviderPrimary = String(process.env.METAL_PRICE_PROVIDER_PRIMARY || process.env.GOLD_PRICE_PROVIDER || "bullionvault").toLowerCase();
const metalPriceProviderFallback = String(process.env.METAL_PRICE_PROVIDER_FALLBACK || "manual").toLowerCase();
const goldPriceProvider = metalPriceProviderPrimary;
const goldPriceBaseCurrency = String(process.env.METAL_PRICE_CURRENCY || process.env.GOLD_PRICE_BASE_CURRENCY || "EUR").toUpperCase();
const metalPriceCacheMinutes = Math.max(5, Number(process.env.METAL_PRICE_CACHE_MINUTES || process.env.GOLD_PRICE_UPDATE_INTERVAL_MINUTES || 15));
const metalPriceSyncDays = Math.min(Math.max(Number(process.env.METAL_PRICE_SYNC_DAYS || 90), 10), 365);
const goldPriceUpdateIntervalMinutes = metalPriceCacheMinutes;
const competitorAutoSyncEnabled = String(process.env.COMPETITOR_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const competitorAutoSyncIntervalMinutes = Math.max(15, Number(process.env.COMPETITOR_AUTO_SYNC_INTERVAL_MINUTES || 180));
const competitorAutoSyncOnStartup = String(process.env.COMPETITOR_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const competitorAutoSyncMaxSourcesPerRun = Math.min(Math.max(Number(process.env.COMPETITOR_AUTO_SYNC_MAX_SOURCES_PER_RUN || 8), 1), 20);
const competitorAutoSyncTimeoutMs = Math.min(Math.max(Number(process.env.COMPETITOR_AUTO_SYNC_TIMEOUT_MS || 15000), 3000), 60000);
const competitorAutoSyncUserAgent = process.env.COMPETITOR_AUTO_SYNC_USER_AGENT || "OroActiveBot/1.0";
const oroExpressAutoSyncEnabled = String(process.env.ORO_EXPRESS_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const oroExpressAutoSyncOnStartup = String(process.env.ORO_EXPRESS_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const oroExpressSyncIntervalMinutes = Math.max(60, Number(process.env.ORO_EXPRESS_SYNC_INTERVAL_MINUTES || 60));
const oroExpressUrl = process.env.ORO_EXPRESS_URL || "https://www.oro-express.it";
const oroExpressUsePlaywright = String(process.env.ORO_EXPRESS_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const oroExpressTimeoutMs = Math.min(Math.max(Number(process.env.ORO_EXPRESS_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const oroExpressSilverUsedMapping = String(process.env.ORO_EXPRESS_SILVER_USED_MAPPING || "generic").toLowerCase();
const oroDOroAutoSyncEnabled = String(process.env.ORO_DORO_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const oroDOroAutoSyncOnStartup = String(process.env.ORO_DORO_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const oroDOroSyncIntervalMinutes = Math.max(60, Number(process.env.ORO_DORO_SYNC_INTERVAL_MINUTES || 60));
const oroDOroUrl = process.env.ORO_DORO_URL || "https://www.comproorodoro.it";
const oroDOroUsePlaywright = String(process.env.ORO_DORO_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const oroDOroUseAiFallback = String(process.env.ORO_DORO_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const oroDOroTimeoutMs = Math.min(Math.max(Number(process.env.ORO_DORO_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const amicoOroAutoSyncEnabled = String(process.env.AMICO_ORO_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const amicoOroAutoSyncOnStartup = String(process.env.AMICO_ORO_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const amicoOroSyncIntervalMinutes = Math.max(60, Number(process.env.AMICO_ORO_SYNC_INTERVAL_MINUTES || 60));
const amicoOroUrl = process.env.AMICO_ORO_URL || "https://www.amico-oro.it";
const amicoOroUsePlaywright = String(process.env.AMICO_ORO_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const amicoOroUseAiVisionFallback = String(process.env.AMICO_ORO_USE_AI_VISION_FALLBACK || "true").toLowerCase() !== "false";
const amicoOroTimeoutMs = Math.min(Math.max(Number(process.env.AMICO_ORO_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const prontoGoldAutoSyncEnabled = String(process.env.PRONTO_GOLD_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const prontoGoldAutoSyncOnStartup = String(process.env.PRONTO_GOLD_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const prontoGoldSyncIntervalMinutes = Math.max(60, Number(process.env.PRONTO_GOLD_SYNC_INTERVAL_MINUTES || 60));
const prontoGoldUrl = process.env.PRONTO_GOLD_URL || "https://www.prontogold.com";
const prontoGoldQuoteUrl = process.env.PRONTO_GOLD_QUOTE_URL || "https://www.prontogold.com/quotazioni";
const prontoGoldUsePlaywright = String(process.env.PRONTO_GOLD_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const prontoGoldUseAiFallback = String(process.env.PRONTO_GOLD_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const prontoGoldTimeoutMs = Math.min(Math.max(Number(process.env.PRONTO_GOLD_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const bancoPreziosiAutoSyncEnabled = String(process.env.BANCO_PREZIOSI_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const bancoPreziosiAutoSyncOnStartup = String(process.env.BANCO_PREZIOSI_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const bancoPreziosiSyncIntervalMinutes = Math.max(60, Number(process.env.BANCO_PREZIOSI_SYNC_INTERVAL_MINUTES || 60));
const bancoPreziosiUrl = process.env.BANCO_PREZIOSI_URL || "https://www.bancopreziosimilano.it";
const bancoPreziosiQuoteUrl = process.env.BANCO_PREZIOSI_QUOTE_URL || "https://www.bancopreziosimilano.it/quotazioni";
const bancoPreziosiUsePlaywright = String(process.env.BANCO_PREZIOSI_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const bancoPreziosiUseAiFallback = String(process.env.BANCO_PREZIOSI_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const bancoPreziosiTimeoutMs = Math.min(Math.max(Number(process.env.BANCO_PREZIOSI_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const bordinAutoSyncEnabled = String(process.env.BORDIN_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const bordinAutoSyncOnStartup = String(process.env.BORDIN_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const bordinSyncIntervalMinutes = Math.max(60, Number(process.env.BORDIN_SYNC_INTERVAL_MINUTES || 60));
const bordinUrl = process.env.BORDIN_URL || "https://oroemetallipreziosi.com";
const bordinUsePlaywright = String(process.env.BORDIN_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const bordinUseAiFallback = String(process.env.BORDIN_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const bordinTimeoutMs = Math.min(Math.max(Number(process.env.BORDIN_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const goldStandardAutoSyncEnabled = String(process.env.GOLD_STANDARD_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const goldStandardAutoSyncOnStartup = String(process.env.GOLD_STANDARD_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const goldStandardSyncIntervalMinutes = Math.max(60, Number(process.env.GOLD_STANDARD_SYNC_INTERVAL_MINUTES || 60));
const goldStandardUrl = process.env.GOLD_STANDARD_URL || "https://www.goldstandard.gold";
const goldStandardUsePlaywright = String(process.env.GOLD_STANDARD_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const goldStandardUseAiFallback = String(process.env.GOLD_STANDARD_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const goldStandardTimeoutMs = Math.min(Math.max(Number(process.env.GOLD_STANDARD_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const oroInEuroAutoSyncEnabled = String(process.env.ORO_IN_EURO_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const oroInEuroAutoSyncOnStartup = String(process.env.ORO_IN_EURO_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const oroInEuroSyncIntervalMinutes = Math.max(60, Number(process.env.ORO_IN_EURO_SYNC_INTERVAL_MINUTES || 60));
const oroInEuroUrl = process.env.ORO_IN_EURO_URL || "https://www.quotazioneritirooro.it";
const oroInEuroUsePlaywright = String(process.env.ORO_IN_EURO_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const oroInEuroUseAiFallback = String(process.env.ORO_IN_EURO_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const oroInEuroTimeoutMs = Math.min(Math.max(Number(process.env.ORO_IN_EURO_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const gruppoOro24kAutoSyncEnabled = String(process.env.GRUPPO_ORO_24K_AUTO_SYNC_ENABLED || "true").toLowerCase() !== "false";
const gruppoOro24kAutoSyncOnStartup = String(process.env.GRUPPO_ORO_24K_AUTO_SYNC_ON_STARTUP || "true").toLowerCase() !== "false";
const gruppoOro24kSyncIntervalMinutes = Math.max(60, Number(process.env.GRUPPO_ORO_24K_SYNC_INTERVAL_MINUTES || 60));
const gruppoOro24kUrl = process.env.GRUPPO_ORO_24K_URL || "https://www.comprooromilano.org";
const gruppoOro24kUsePlaywright = String(process.env.GRUPPO_ORO_24K_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const gruppoOro24kUseAiFallback = String(process.env.GRUPPO_ORO_24K_USE_AI_FALLBACK || "true").toLowerCase() !== "false";
const gruppoOro24kTimeoutMs = Math.min(Math.max(Number(process.env.GRUPPO_ORO_24K_TIMEOUT_MS || competitorAutoSyncTimeoutMs || 15000), 3000), 60000);
const competitorAiExtractionEnabled = String(process.env.AI_COMPETITOR_EXTRACTION_ENABLED || process.env.COMPETITOR_AI_AUTO_EXTRACTION_ENABLED || "true").toLowerCase() !== "false";
const competitorAiAutoExtractionEnabled = String(process.env.COMPETITOR_AI_AUTO_EXTRACTION_ENABLED || "true").toLowerCase() !== "false";
const competitorAiExtractionIntervalMinutes = Math.max(60, Number(process.env.AI_COMPETITOR_EXTRACTION_INTERVAL_MINUTES || process.env.COMPETITOR_AI_AUTO_EXTRACTION_INTERVAL_MINUTES || 360));
const competitorAiExtractionOnStartup = String(process.env.COMPETITOR_AI_EXTRACTION_ON_STARTUP || "false").toLowerCase() === "true";
const competitorAiMaxPagesPerSource = Math.min(Math.max(Number(process.env.AI_COMPETITOR_EXTRACTION_MAX_PAGES_PER_SOURCE || process.env.COMPETITOR_AI_MAX_PAGES_PER_SOURCE || 8), 1), 8);
const competitorAiExtractionTimeoutMs = Math.min(Math.max(Number(process.env.AI_COMPETITOR_EXTRACTION_TIMEOUT_MS || 15000), 3000), 60000);
const competitorAiUsePlaywright = String(process.env.AI_COMPETITOR_USE_PLAYWRIGHT || "true").toLowerCase() !== "false";
const competitorAiUserAgent = process.env.AI_COMPETITOR_USER_AGENT || competitorAutoSyncUserAgent;
const competitorAiExtractionModel = process.env.AI_COMPETITOR_EXTRACTION_MODEL || process.env.COMPETITOR_AI_EXTRACTION_MODEL || openaiModel;
const competitorAiMaxTextChars = Math.min(Math.max(Number(process.env.COMPETITOR_AI_MAX_TEXT_CHARS || 12000), 3000), 24000);
const competitorAutoSyncState = {
  enabled: competitorAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: "",
  lastSummary: null
};
const competitorAiExtractionState = {
  enabled: competitorAiExtractionEnabled,
  autoEnabled: competitorAiAutoExtractionEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: "",
  lastRunId: null,
  lastSummary: null
};
const oroExpressSyncState = {
  enabled: oroExpressAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const oroDOroSyncState = {
  enabled: oroDOroAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const amicoOroSyncState = {
  enabled: amicoOroAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const prontoGoldSyncState = {
  enabled: prontoGoldAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const bancoPreziosiSyncState = {
  enabled: bancoPreziosiAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const bordinSyncState = {
  enabled: bordinAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const goldStandardSyncState = {
  enabled: goldStandardAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const oroInEuroSyncState = {
  enabled: oroInEuroAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const gruppoOro24kSyncState = {
  enabled: gruppoOro24kAutoSyncEnabled,
  running: false,
  timer: null,
  lastRunAt: null,
  nextRunAt: null,
  lastStatus: "idle",
  lastError: ""
};
const bullionVaultEnabled = String(process.env.BULLIONVAULT_ENABLED || "true").toLowerCase() !== "false";
const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
const customMetalApiUrl = process.env.CUSTOM_METAL_API_URL || "";
const backupDirectory = process.env.BACKUP_DIR || "/data/oroactive/backups";
const academyUploadDirectory = process.env.ACADEMY_UPLOAD_DIR || path.join(__dirname, "private_uploads", "academy");
const goldMasterSlideDirectory = academyUploadDirectory;
const trustPackDirectory = process.env.CUSTOMER_TRUST_PACK_DIR || path.join(__dirname, "private_uploads", "customer-trust-packs");
const oroactiveSiteUrl = process.env.OROACTIVE_SITE_URL || "http://wcfme33owxz0wfkr0ysnzthy.188.213.161.151.sslip.io/";
const privacyPolicyVersion = "v1.0";
const privacyPolicyUpdatedAt = "2026-05-29";
const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
const pgRestorePath = process.env.PG_RESTORE_PATH || "pg_restore";
const backupIntervalMs = 24 * 60 * 60 * 1000;
const TROY_OUNCE_GRAMS = 31.1034768;
const backupFolders = ["atti", "documenti", "preziosi", "contabili", "pdf", "firme", "utenti", "giacenza", "fusioni", "knowledge-base", "formazione", "antifrode", "crm"];
const backupFileSources = [
  { source: "uploads", target: "files/uploads", section: "uploads" },
  { source: "public/uploads", target: "files/public_uploads", section: "public uploads" },
  { source: "documents", target: "documents", section: "documenti identita" },
  { source: "pdf", target: "pdf", section: "pdf" },
  { source: "firme", target: "signatures/firme", section: "firme" },
  { source: "signatures", target: "signatures", section: "signatures" },
  { source: "preziosi", target: "photos/preziosi", section: "foto preziosi" },
  { source: "contabili", target: "receipts/contabili", section: "contabili" },
  { source: "storage", target: "files/storage", section: "storage" },
  { source: "private_uploads/academy", target: "academy/uploads", section: "academy uploads" },
  { source: "knowledge-base", target: "ai/knowledge-base", section: "AI knowledge base" }
];
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

const defaultPrivacyPolicyContent = {
  version: privacyPolicyVersion,
  updated_at: privacyPolicyUpdatedAt,
  title: "Privacy Policy e Informativa sul trattamento dei dati personali — OroActive",
  subtitle: "Informativa ai sensi del Regolamento UE 2016/679 (GDPR) e della normativa applicabile in materia di protezione dei dati personali.",
  note: "Questa informativa descrive come OroActive tratta i dati personali all'interno dell'app gestionale e nei processi collegati agli atti di vendita, alla gestione clienti, alla formazione, alla sicurezza operativa e alle funzionalità AI.",
  controller: {
    company_name: "[INSERIRE RAGIONE SOCIALE]",
    legal_address: "[INSERIRE INDIRIZZO]",
    privacy_email: "[INSERIRE EMAIL PRIVACY]",
    pec: "[INSERIRE PEC]",
    vat: "[INSERIRE DATI]",
    status: "Da completare"
  },
  sections: [
    {
      id: "utenti-app",
      tab: "Informativa utenti app",
      title: "1. Titolare del trattamento",
      badge: "Da completare",
      paragraphs: [
        "Il Titolare del trattamento è [INSERIRE RAGIONE SOCIALE], con sede legale in [INSERIRE INDIRIZZO]. Email privacy: [INSERIRE EMAIL PRIVACY]. PEC: [INSERIRE PEC]. P.IVA / C.F.: [INSERIRE DATI].",
        "I dati sopra indicati devono essere completati dal Founder o dal consulente privacy prima dell'utilizzo definitivo."
      ]
    },
    {
      id: "clienti-atti",
      tab: "Informativa clienti / atti di vendita",
      title: "2. Quali dati trattiamo",
      paragraphs: [
        "L'app OroActive può trattare dati degli utenti dell'app, dati dei clienti collegati agli atti di vendita, dati tecnici e dati relativi alle funzionalità AI e Aurum."
      ],
      groups: [
        { title: "Dati degli utenti dell'app", items: ["nome e cognome", "username/email", "ruolo operativo", "negozio assegnato", "telefono se inserito", "stato online/offline", "attività svolte nell'app", "log accessi", "autorizzazioni, notifiche e audit trail", "risultati formazione Academy", "badge e certificazioni interne"] },
        { title: "Dati dei clienti negli atti di vendita", items: ["nome e cognome", "codice fiscale", "data e luogo di nascita", "indirizzo di residenza", "telefono/email se richiesti", "dati documento di identità", "immagini documento/tessera sanitaria se acquisite", "firme", "dati relativi agli oggetti preziosi ceduti", "foto preziosi", "dati pagamento", "IBAN o contabili se necessari", "numero pratica / atto di vendita", "storico operazioni collegate al cliente"] },
        { title: "Dati tecnici e di sicurezza", items: ["indirizzo IP", "browser/dispositivo", "data e ora accesso", "log di sistema", "audit log", "attività utente", "errori applicativi", "notifiche operative", "stato sessione"] },
        { title: "Dati relativi ad AI e Aurum", items: ["domande inviate all'assistente", "risposte generate", "contesto operativo non sensibile", "memorie salvate solo se l'utente ha dato consenso", "preferenze operative condivise volontariamente dall'utente"] }
      ],
      closing: "OroActive non deve utilizzare l'AI per trattare dati sensibili non necessari o documenti personali senza specifica necessità operativa e senza adeguate misure di protezione."
    },
    {
      id: "dati-trattati",
      tab: "Dati trattati",
      title: "3. Perché trattiamo i dati",
      items: ["gestione degli utenti dell'app", "autenticazione e controllo accessi", "gestione ruoli e permessi", "compilazione e conservazione degli atti di vendita", "identificazione del cliente", "adempimenti normativi e amministrativi", "gestione pagamenti", "generazione PDF e copie cliente/azienda", "gestione CRM clienti", "controllo qualità pratica", "sicurezza operativa", "prevenzione errori, frodi e anomalie", "gestione giacenza e fusioni", "gestione backup", "audit trail e tracciamento attività", "notifiche interne", "formazione interna OroActive Academy", "supporto operativo tramite Aurum/AI", "generazione Customer Trust Pack", "statistiche interne autorizzate per Founder/Responsabili"]
    },
    {
      id: "basi-giuridiche",
      tab: "Finalità e basi giuridiche",
      title: "4. Base giuridica del trattamento",
      paragraphs: ["Il trattamento può fondarsi, a seconda dei casi, su esecuzione di misure contrattuali o precontrattuali, adempimento di obblighi legali, legittimo interesse del Titolare alla sicurezza, organizzazione, controllo qualità, tutela aziendale e prevenzione di abusi, consenso dell'interessato quando richiesto, e necessità di accertare, esercitare o difendere un diritto in sede competente."],
      closing: "Le basi giuridiche devono essere verificate e confermate dal consulente privacy in base al modello operativo definitivo."
    },
    {
      id: "modalita",
      tab: "Conservazione dati",
      title: "5. Come vengono trattati i dati",
      paragraphs: ["I dati sono trattati con strumenti informatici e telematici, mediante accesso autenticato all'app OroActive. L'accesso è regolato da ruoli e permessi, in modo che ogni utente possa vedere solo le informazioni necessarie alla propria funzione.", "L'app può registrare attività operative, modifiche, salvataggi, eliminazioni, stampe, accessi, autorizzazioni e altre azioni rilevanti per garantire sicurezza, tracciabilità e controllo interno."]
    },
    {
      id: "conservazione",
      tab: "Conservazione dati",
      title: "6. Per quanto tempo conserviamo i dati",
      paragraphs: ["I dati sono conservati per il tempo necessario alle finalità per cui sono stati raccolti, agli obblighi normativi applicabili, alla tutela dei diritti del Titolare e alla corretta gestione delle pratiche aziendali."],
      items: ["atti di vendita e documenti collegati: secondo obblighi normativi e policy aziendale", "dati utenti: per tutta la durata del rapporto operativo e successivamente per esigenze di sicurezza/audit", "audit log: per esigenze di tracciabilità e sicurezza", "backup: secondo policy interna di conservazione e verifica", "dati Academy: per mantenere storico formativo e certificazioni interne", "memorie Aurum: fino a cancellazione da parte dell'utente o disattivazione memoria"],
      closing: "Le tempistiche definitive devono essere confermate dal consulente privacy."
    },
    {
      id: "comunicazione",
      tab: "Sicurezza",
      title: "7. A chi possono essere comunicati i dati",
      items: ["personale autorizzato OroActive", "Founder, responsabili e supervisori secondo permessi", "fornitori tecnici dell'app", "hosting provider", "fornitori backup/storage", "consulenti fiscali/legali/amministrativi", "autorità competenti quando previsto dalla legge", "servizi di pagamento o strumenti collegati se necessari", "fornitori AI solo nei limiti tecnici e con minimizzazione dei dati"],
      closing: "Non vengono comunicati dati personali a soggetti non autorizzati."
    },
    {
      id: "ai-aurum",
      tab: "AI, Aurum e automazioni",
      title: "8. Funzionalità AI e Aurum",
      paragraphs: ["OroActive può includere funzionalità di assistenza AI tramite Aurum, assistente operativo interno. Aurum può aiutare l'utente a comprendere sezioni, compilare correttamente le pratiche, consultare procedure e ricevere suggerimenti operativi."],
      items: ["Aurum non sostituisce il giudizio umano", "Aurum non deve trattare dati cliente non necessari", "dati sensibili, documenti, firme, IBAN e codici fiscali devono essere minimizzati", "le memorie personali dell'utente vengono salvate solo se l'utente conferma esplicitamente", "l'utente può visualizzare e cancellare le memorie Aurum", "eventuali domande e risposte possono essere registrate per sicurezza, miglioramento e tracciabilità nel rispetto delle policy interne"]
    },
    {
      id: "sicurezza",
      tab: "Sicurezza",
      title: "9. Misure di sicurezza",
      paragraphs: ["OroActive adotta misure tecniche e organizzative per proteggere i dati personali."],
      items: ["accesso con credenziali", "ruoli e permessi", "tracciamento attività tramite Audit Trail", "backup", "controllo qualità", "autorizzazioni superiori per pratiche rischiose", "protezione file e documenti", "limitazione accessi in base al ruolo", "registrazione eventi critici", "controlli su operazioni anomale"],
      closing: "La sicurezza viene migliorata progressivamente in base all'evoluzione dell'app e delle esigenze operative."
    },
    {
      id: "diritti",
      tab: "Diritti privacy",
      title: "10. Diritti privacy",
      paragraphs: ["L'interessato può esercitare, nei limiti previsti dalla normativa, i diritti di accesso, rettifica, cancellazione, limitazione del trattamento, opposizione, portabilità ove applicabile, revoca del consenso ove il trattamento sia basato sul consenso e reclamo all'Autorità Garante per la protezione dei dati personali.", "Per esercitare i diritti: Email [INSERIRE EMAIL PRIVACY] - PEC [INSERIRE PEC]."]
    },
    {
      id: "cookie-pwa",
      tab: "Cookie / PWA / log tecnici",
      title: "11. Cookie, PWA e dati tecnici",
      paragraphs: ["L'app OroActive può utilizzare strumenti tecnici necessari al funzionamento, come cookie tecnici, localStorage, sessionStorage, service worker/PWA e log tecnici."],
      items: ["mantenere la sessione", "migliorare la navigazione", "salvare preferenze utente", "abilitare funzionalità PWA", "gestire aggiornamenti applicativi", "garantire sicurezza e continuità operativa"],
      closing: "Se in futuro verranno utilizzati strumenti di analytics, marketing o profilazione, dovrà essere predisposta informativa e consenso specifico ove richiesto."
    },
    {
      id: "versione",
      tab: "Versione documento",
      title: "12. Aggiornamenti della Privacy Policy",
      paragraphs: ["La presente informativa può essere aggiornata nel tempo. In caso di modifiche rilevanti, l'app potrà mostrare una richiesta di presa visione agli utenti al successivo accesso."]
    }
  ]
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const aiCompetitorQuoteExtractor = createAiCompetitorQuoteExtractor({
  openai,
  model: competitorAiExtractionModel,
  maxPagesPerSource: competitorAiMaxPagesPerSource,
  timeoutMs: competitorAiExtractionTimeoutMs,
  userAgent: competitorAiUserAgent,
  usePlaywright: competitorAiUsePlaywright,
  maxTextChars: competitorAiMaxTextChars,
  logger: console
});
const oroExpressExtractor = createOroExpressExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: oroExpressUrl,
  timeoutMs: oroExpressTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: oroExpressUsePlaywright,
  silverUsedMapping: oroExpressSilverUsedMapping,
  maxTextChars: competitorAiMaxTextChars
});
const oroDOroExtractor = createOroDOroExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: oroDOroUrl,
  timeoutMs: oroDOroTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: oroDOroUsePlaywright,
  useAiFallback: oroDOroUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const amicoOroExtractor = createAmicoOroExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: amicoOroUrl,
  timeoutMs: amicoOroTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: amicoOroUsePlaywright,
  useAiVisionFallback: amicoOroUseAiVisionFallback,
  maxTextChars: competitorAiMaxTextChars
});
const prontoGoldExtractor = createProntoGoldExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: prontoGoldUrl,
  quoteUrl: prontoGoldQuoteUrl,
  timeoutMs: prontoGoldTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: prontoGoldUsePlaywright,
  useAiFallback: prontoGoldUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const bancoPreziosiExtractor = createBancoPreziosiExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: bancoPreziosiUrl,
  quoteUrl: bancoPreziosiQuoteUrl,
  timeoutMs: bancoPreziosiTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: bancoPreziosiUsePlaywright,
  useAiFallback: bancoPreziosiUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const bordinExtractor = createBordinExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: bordinUrl,
  timeoutMs: bordinTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: bordinUsePlaywright,
  useAiFallback: bordinUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const goldStandardExtractor = createGoldStandardExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: goldStandardUrl,
  timeoutMs: goldStandardTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: goldStandardUsePlaywright,
  useAiFallback: goldStandardUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const oroInEuroExtractor = createOroInEuroExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: oroInEuroUrl,
  timeoutMs: oroInEuroTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: oroInEuroUsePlaywright,
  useAiFallback: oroInEuroUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const gruppoOro24kExtractor = createGruppoOro24kExtractor({
  openai,
  model: competitorAiExtractionModel,
  url: gruppoOro24kUrl,
  timeoutMs: gruppoOro24kTimeoutMs,
  userAgent: competitorAutoSyncUserAgent,
  usePlaywright: gruppoOro24kUsePlaywright,
  useAiFallback: gruppoOro24kUseAiFallback,
  maxTextChars: competitorAiMaxTextChars
});
const competitorExtractionTrainer = createCompetitorExtractionTrainer({
  openai,
  model: competitorAiExtractionModel,
  fetchPage: fetchCompetitorPage,
  oroExpressExtractor,
  oroDOroExtractor,
  amicoOroExtractor,
  prontoGoldExtractor,
  bancoPreziosiExtractor,
  bordinExtractor,
  goldStandardExtractor,
  oroInEuroExtractor,
  gruppoOro24kExtractor
});
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
const aurumBundledKnowledgeRoot = path.join(__dirname, "assets", "aurum-knowledge", "normative");
const aurumBundledKnowledgeDocuments = [
  {
    titolo: "Decreto Legislativo n.92 del 25 Maggio 2017",
    autore: "Normativa italiana",
    filename: "Decreto Legislativo n.92 del 25 Maggio 2017.pdf",
    category: "Normativa"
  },
  {
    titolo: "Decreto Legislativo n.211 del 10 Dicembre 2024",
    autore: "Normativa italiana",
    filename: "Decreto Legislativo n.211 del 10 Dicembre 2024.pdf",
    category: "Normativa"
  },
  {
    titolo: "Elenco Monete d'Oro",
    autore: "Normativa italiana",
    filename: "Elenco Monete d'Oro.pdf",
    category: "Monete d'oro"
  },
  {
    titolo: "Normativa e legislazione 2017",
    autore: "La Bilancia d'Oro",
    filename: "Normativa e legislazione 2017.pdf",
    category: "Normativa"
  },
  {
    titolo: "Normativa e legislazione 2023",
    autore: "La Bilancia d'Oro",
    filename: "Normativa e legislazione 2023.pdf",
    category: "Normativa"
  }
];
const defaultAurumShieldSettings = {
  cash_limit_amount: 500,
  cash_window_days: 7,
  frequent_sales_limit: 3,
  document_expiry_warning_days: 30,
  block_critical_practices: false,
  dashboard_alerts_enabled: true,
  ai_explanation_enabled: false,
  factor_weights: {
    expired_document: 40,
    document_expiring: 15,
    duplicate_document: 35,
    missing_fiscal_code: 25,
    new_client: 5,
    frequent_sales: 30,
    multi_store_sales: 35,
    cash_near_limit: 20,
    cash_over_limit: 45,
    iban_holder_mismatch: 20,
    shared_iban: 30,
    missing_precious_photos: 15,
    missing_signature: 35,
    missing_weight_or_title: 20,
    anomalous_amount_weight: 20,
    frequent_updates: 10,
    negative_quality: 35,
    missing_quality: 10,
    missing_payment_receipt: 20,
    previous_alerts: 25,
    fast_completion: 15,
    operator_anomalies: 15,
    store_anomalies: 15
  }
};

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
    void writeAuditLog({
      req: request,
      user: request.user,
      action: response.statusCode >= 400 ? "api_request_error" : "api_request",
      entityType: "api",
      entityLabel: `${method} ${route}`,
      metadata: {
        method,
        route,
        status_code: response.statusCode,
        duration_ms: Date.now() - startedAt
      }
    });
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
  const role = normalizeRole(row.ruolo);
  return {
    id: row.id,
    nome: row.nome,
    cognome: row.cognome,
    username: row.username,
    email: role === "founder" ? row.email : "",
    telefono: row.telefono || "",
    note: row.note || "",
    attivo: row.attivo !== false,
    ruolo: role,
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
  user.canDelete = actorRole === "founder" && !self && user.attivo !== false;
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
    aurum_memory_saved: "Memoria Aurum salvata",
    aurum_support_request: "Richiesta supporto Aurum",
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

function auditActionLabel(action = "") {
  return {
    api_request: "Richiesta API",
    api_request_error: "Errore API",
    login: "Login utente",
    logout: "Logout utente",
    login_failed: "Login fallito",
    session_expired: "Sessione scaduta",
    create_act: "Creazione atto",
    save_draft: "Salvataggio bozza",
    update_act: "Modifica atto",
    complete_act: "Completamento atto",
    archive_act: "Archiviazione atto",
    delete_act: "Eliminazione atto",
    reopen_act: "Riapertura atto",
    print_customer_copy: "Stampa copia cliente",
    print_company_copy: "Stampa copia aziendale",
    generate_pdf: "Generazione PDF",
    modify_payment: "Modifica pagamento",
    modify_deed_client_data: "Modifica dati cliente atto",
    upload_documents: "Caricamento documenti",
    upload_jewelry_photos: "Caricamento foto preziosi",
    customer_signature: "Firma cliente",
    quality_check_executed: "Controllo qualità eseguito",
    quality_check_failed: "Controllo qualità fallito",
    risky_practice_approved: "Approvazione pratica rischiosa",
    risk_score_calculated: "Risk score calcolato",
    aurum_shield_alert_created: "Alert rischio creato",
    aurum_shield_alert_reviewed: "Alert rischio in verifica",
    aurum_shield_alert_resolved: "Alert rischio risolto",
    update_aurum_shield_settings: "Modifica configurazione Aurum Shield",
    create_user: "Creazione utente",
    update_user: "Modifica utente",
    change_user_role: "Cambio ruolo utente",
    change_user_store: "Cambio negozio utente",
    user_deleted: "Eliminazione utente",
    user_deactivated: "Disattivazione utente",
    unauthorized_user_delete_attempt: "Tentativo eliminazione utente non autorizzato",
    unauthorized_user_create_attempt: "Tentativo creazione utente non autorizzato",
    deactivate_user: "Disattivazione utente",
    delete_user: "Eliminazione utente",
    view_user_activity: "Visualizzazione attività utente",
    create_crm_client: "Creazione cliente CRM",
    update_crm_client: "Modifica cliente CRM",
    delete_crm_client: "Archiviazione cliente CRM",
    add_crm_note: "Aggiunta nota CRM",
    update_client_bank_data: "Modifica dati bancari cliente",
    create_fusion_lot: "Creazione lotto fusione",
    update_fusion_lot: "Modifica lotto fusione",
    delete_fusion_lot: "Eliminazione lotto fusione",
    change_fusion_lot_status: "Cambio stato lotto fusione",
    print_fusion_pdf: "Stampa PDF fusione",
    create_academy_course: "Creazione corso Academy",
    update_academy_course: "Modifica corso Academy",
    delete_academy_course: "Eliminazione corso Academy",
    upload_academy_material: "Caricamento materiale corso",
    complete_academy_lesson: "Completamento lezione",
    complete_academy_course: "Completamento corso",
    assign_certificate: "Assegnazione certificazione",
    assign_badge: "Assegnazione badge",
    revoke_badge: "Revoca badge",
    create_backup: "Creazione backup",
    verify_backup: "Verifica backup",
    download_backup: "Download backup",
    delete_backup: "Eliminazione backup",
    test_restore_backup: "Test restore backup",
    ask_aurum: "Domanda ad Aurum",
    aurum_support_request: "Richiesta supporto Aurum",
    aurum_memory_created: "Memoria Aurum creata",
    aurum_memory_deleted: "Memoria Aurum eliminata",
    approval_requested: "Richiesta autorizzazione",
    approval_approved: "Autorizzazione approvata",
    approval_rejected: "Autorizzazione rifiutata",
    approval_cancelled: "Autorizzazione annullata",
    approval_required_blocked_completion: "Completamento bloccato per autorizzazione",
    approval_unauthorized_attempt: "Tentativo autorizzazione non consentito",
    sale_deed_completed_after_approval: "Atto completato dopo autorizzazione",
    sale_deed_modified_after_approval_request: "Modifica atto dopo richiesta autorizzazione",
    sale_deed_suspended: "Pratica sospesa",
    suspended_practice_reopened: "Pratica sospesa riaperta",
    suspended_practice_resolved: "Controlli pratica sospesa risolti",
    suspended_practice_deleted: "Pratica sospesa eliminata",
    sale_deed_completed_after_suspension: "Atto completato dopo sospensione",
    notification_created: "Notifica creata",
    notification_read: "Notifica letta",
    notification_action_opened: "Apertura notifica",
    store_health_score_calculated: "Store Health Score ricalcolato",
    founder_daily_report_generated: "Founder Daily Report generato",
    founder_daily_report_downloaded: "Download Founder Daily Report",
    founder_daily_report_sent: "Invio Founder Daily Report",
    founder_daily_report_failed: "Errore Founder Daily Report",
    gold_price_sync: "Sync storico prezzo oro",
    gold_prediction_run: "Analisi di mercato oro",
    gold_prediction_settings_updated: "Impostazioni predizione oro aggiornate",
    customer_trust_pack_generated: "Customer Trust Pack generato",
    customer_trust_pack_downloaded: "Download Customer Trust Pack",
    customer_trust_pack_sent_email: "Customer Trust Pack inviato email",
    customer_trust_pack_sent_whatsapp: "Customer Trust Pack WhatsApp preparato",
    customer_trust_pack_regenerated: "Customer Trust Pack rigenerato",
    training_started: "Training operatore avviato",
    training_completed: "Training operatore completato",
    training_passed: "Training operatore superato",
    training_failed: "Training operatore non superato",
    privacy_policy_viewed: "Privacy Policy visualizzata",
    privacy_policy_accepted: "Privacy Policy accettata",
    privacy_policy_version_created: "Versione Privacy Policy creata",
    customer_privacy_notice_viewed: "Informativa privacy cliente visualizzata"
  }[action] || activityLabel(action) || "Attività";
}

function auditRequestIp(req) {
  return req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
    || req?.ip
    || req?.socket?.remoteAddress
    || "";
}

function auditDeviceInfo(userAgent = "") {
  const ua = String(userAgent || "");
  if (!ua) return "";
  const platform = /iphone|ipad|ios/i.test(ua)
    ? "iOS/iPadOS"
    : /macintosh|mac os/i.test(ua)
      ? "Mac"
      : /android/i.test(ua)
        ? "Android"
        : /windows/i.test(ua)
          ? "Windows"
          : "Web";
  const browser = /edg/i.test(ua)
    ? "Edge"
    : /chrome|crios/i.test(ua)
      ? "Chrome"
      : /safari/i.test(ua)
        ? "Safari"
        : /firefox/i.test(ua)
          ? "Firefox"
          : "Browser";
  return `${platform} · ${browser}`;
}

function auditUserName(user = {}) {
  return [user.nome, user.cognome].filter(Boolean).join(" ").trim()
    || user.username
    || user.email
    || "";
}

function maskAuditString(key = "", value = "") {
  const text = String(value || "");
  if (!text) return text;
  if (/iban/i.test(key)) {
    return text.length > 8 ? `${text.slice(0, 4)}${"*".repeat(Math.max(text.length - 8, 0))}${text.slice(-4)}` : "********";
  }
  if (/codice[_\s-]*fiscale|fiscal/i.test(key)) {
    return text.length > 6 ? `${text.slice(0, 3)}${"*".repeat(Math.max(text.length - 6, 0))}${text.slice(-3)}` : "******";
  }
  if (text.length > 500) return `${text.slice(0, 500)}...`;
  return text;
}

function compactAuditPayload(value, key = "", depth = 0) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (depth > 4) return "[contenuto omesso]";
  if (typeof value === "string") {
    if (/password|token|secret|hash|firma|signature|base64|documento.*(url|file)|foto|image|pdf|file_path/i.test(key)) {
      return value ? "[dato protetto]" : "";
    }
    return maskAuditString(key, value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => compactAuditPayload(item, key, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([entryKey, entryValue]) => {
      if (/password|token|secret|hash|firma|signature|base64|document.*file|captureFiles|loadedSignatureImages|buffer/i.test(entryKey)) {
        return [entryKey, entryValue ? "[dato protetto]" : null];
      }
      return [entryKey, compactAuditPayload(entryValue, entryKey, depth + 1)];
    }));
  }
  return String(value);
}

function auditChangedFields(beforeData = {}, afterData = {}) {
  const before = beforeData || {};
  const after = afterData || {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)).slice(0, 30);
}

async function writeAuditLog({
  req = null,
  user = null,
  action = "activity",
  entityType = "system",
  entityId = null,
  entityLabel = null,
  beforeData = null,
  afterData = null,
  metadata = {}
} = {}) {
  try {
    const actor = user || req?.user || null;
    const safeMetadata = compactAuditPayload(metadata || {});
    const userAgent = req?.headers?.["user-agent"] || safeMetadata.user_agent || "";
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, user_name, user_role, store_id, store_name,
        action, entity_type, entity_id, entity_label,
        before_data, after_data, metadata,
        ip_address, user_agent, device_info,
        method, route, status_code, duration_ms, created_at
      ) VALUES (
        $1::bigint,$2::text,$3::text,$4::bigint,$5::text,
        $6::text,$7::text,$8::text,$9::text,
        $10::jsonb,$11::jsonb,$12::jsonb,
        $13::text,$14::text,$15::text,
        $16::text,$17::text,$18::integer,$19::integer,NOW()
      )`,
      [
        actor?.id || null,
        auditUserName(actor),
        actor?.ruolo ? normalizeRole(actor.ruolo) : null,
        safeMetadata.store_id || actor?.negozio_id || null,
        safeMetadata.store_name || actor?.negozio || null,
        action,
        entityType,
        entityId === undefined || entityId === null ? null : String(entityId),
        entityLabel || null,
        beforeData === undefined ? null : sanitizeForPostgres(compactAuditPayload(beforeData)),
        afterData === undefined ? null : sanitizeForPostgres(compactAuditPayload(afterData)),
        sanitizeForPostgres(safeMetadata),
        auditRequestIp(req),
        userAgent,
        auditDeviceInfo(userAgent),
        safeMetadata.method || req?.method || null,
        safeMetadata.route || req?.originalUrl?.split("?")[0] || null,
        Number.isFinite(Number(safeMetadata.status_code)) ? Number(safeMetadata.status_code) : null,
        Number.isFinite(Number(safeMetadata.duration_ms)) ? Number(safeMetadata.duration_ms) : null
      ]
    );
  } catch (err) {
    console.error("AUDIT LOG ERROR", err);
  }
}

function publicAuditLog(row = {}) {
  const action = row.action || row.activity_type || "activity";
  return {
    id: row.id,
    type: action,
    action,
    label: auditActionLabel(action),
    user_id: row.user_id,
    userName: row.user_name || [row.actor_nome, row.actor_cognome].filter(Boolean).join(" ") || row.actor_username || row.actor_email || "",
    userRole: row.user_role || "",
    store_id: row.store_id || null,
    storeName: row.store_name || "",
    entityType: row.entity_type || "",
    entityId: row.entity_id || "",
    entityLabel: row.entity_label || "",
    description: row.entity_label || row.metadata?.description || auditActionLabel(action),
    before_data: row.before_data || null,
    after_data: row.after_data || null,
    metadata: row.metadata || {},
    ip_address: row.ip_address || "",
    user_agent: row.user_agent || "",
    device_info: row.device_info || "",
    method: row.method || "",
    route: row.route || "",
    status_code: row.status_code || null,
    duration_ms: row.duration_ms || null,
    created_at: row.created_at,
    actor: row.user_name || [row.actor_nome, row.actor_cognome].filter(Boolean).join(" ") || row.actor_username || row.actor_email || ""
  };
}

function canViewAuditTrail(user = {}) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function addAuditVisibilityWhere(user, conditions, values, alias = "al") {
  const role = normalizeRole(user?.ruolo);
  if (role === "founder") return;
  if (role === "supervisore") {
    conditions.push(`COALESCE(${alias}.user_role, '') <> 'founder'`);
    return;
  }
  if (role === "responsabile") {
    const roleParam = values.push(["commesso", "aiuto_commesso"]) || values.length;
    const clauses = [`${alias}.user_id = $${values.push(user?.id || null)}::bigint`];
    const storeClauses = [];
    if (user?.negozio_id) storeClauses.push(`${alias}.store_id = $${values.push(user.negozio_id)}::bigint`);
    if (user?.negozio) storeClauses.push(`${alias}.store_name = $${values.push(user.negozio)}::text`);
    if (storeClauses.length) {
      clauses.push(`(COALESCE(${alias}.user_role, '') = ANY($${roleParam}::text[]) AND (${storeClauses.join(" OR ")}))`);
    }
    conditions.push(`(${clauses.join(" OR ")})`);
    return;
  }
  conditions.push(`${alias}.user_id = $${values.push(user?.id || null)}::bigint`);
}

async function listAuditLogs(query = {}, user = {}) {
  if (!canViewAuditTrail(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 50)));
  const offset = (page - 1) * limit;
  const values = [];
  const conditions = ["1=1"];
  addAuditVisibilityWhere(user, conditions, values, "al");
  if (query.user_id) conditions.push(`al.user_id = $${values.push(query.user_id)}::bigint`);
  if (query.action) conditions.push(`al.action = $${values.push(query.action)}::text`);
  if (query.entity_type) conditions.push(`al.entity_type = $${values.push(query.entity_type)}::text`);
  if (query.entity_id) conditions.push(`al.entity_id = $${values.push(String(query.entity_id))}::text`);
  if (query.store_id) conditions.push(`al.store_id = $${values.push(query.store_id)}::bigint`);
  if (query.role) conditions.push(`al.user_role = $${values.push(normalizeRole(query.role))}::text`);
  if (query.date_from) conditions.push(`al.created_at >= $${values.push(query.date_from)}::date`);
  if (query.date_to) conditions.push(`al.created_at < ($${values.push(query.date_to)}::date + INTERVAL '1 day')`);
  if (query.search) {
    const searchParam = values.push(`%${String(query.search).trim()}%`);
    conditions.push(`(
      al.user_name ILIKE $${searchParam}
      OR al.action ILIKE $${searchParam}
      OR al.entity_type ILIKE $${searchParam}
      OR al.entity_id ILIKE $${searchParam}
      OR al.entity_label ILIKE $${searchParam}
      OR al.route ILIKE $${searchParam}
    )`);
  }
  const where = conditions.join(" AND ");
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs al WHERE ${where}`, values);
  const result = await pool.query(
    `SELECT al.*
     FROM audit_logs al
     WHERE ${where}
     ORDER BY al.created_at DESC, al.id DESC
     LIMIT $${values.push(limit)}::integer OFFSET $${values.push(offset)}::integer`,
    values
  );
  return {
    ok: true,
    logs: result.rows.map(publicAuditLog),
    pagination: { page, limit, total: totalResult.rows[0]?.total || 0 }
  };
}

async function getAuditLogDetail(id, user = {}) {
  if (!canViewAuditTrail(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const values = [id];
  const conditions = ["al.id = $1::bigint"];
  addAuditVisibilityWhere(user, conditions, values, "al");
  const result = await pool.query(`SELECT al.* FROM audit_logs al WHERE ${conditions.join(" AND ")} LIMIT 1`, values);
  return result.rows[0] ? publicAuditLog(result.rows[0]) : null;
}

async function dashboardAuditSummary(user = {}) {
  if (!canViewAuditTrail(user)) {
    return {
      logins_today: 0,
      acts_created_today: 0,
      acts_updated_today: 0,
      acts_deleted_today: 0,
      customer_prints_today: 0,
      shield_alerts_today: 0,
      top_users: [],
      latest: []
    };
  }
  const values = [];
  const conditions = ["al.created_at >= CURRENT_DATE"];
  addAuditVisibilityWhere(user, conditions, values, "al");
  const where = conditions.join(" AND ");
  const [counts, topUsers, latest] = await Promise.all([
    pool.query(
      `SELECT action, COUNT(*)::int AS total
       FROM audit_logs al
       WHERE ${where}
       GROUP BY action`,
      values
    ),
    pool.query(
      `SELECT COALESCE(user_name, 'Utente') AS user_name, COALESCE(user_role, '') AS user_role, COUNT(*)::int AS total
       FROM audit_logs al
       WHERE ${where}
         AND al.user_id IS NOT NULL
       GROUP BY user_name, user_role
       ORDER BY total DESC
       LIMIT 5`,
      values
    ),
    pool.query(
      `SELECT al.*
       FROM audit_logs al
       WHERE ${where}
         AND COALESCE(action, '') <> 'api_request'
       ORDER BY created_at DESC, id DESC
       LIMIT 10`,
      values
    )
  ]);
  const byAction = Object.fromEntries(counts.rows.map((row) => [row.action, row.total]));
  return {
    logins_today: byAction.login || 0,
    acts_created_today: byAction.create_act || byAction.save_draft || 0,
    acts_updated_today: byAction.update_act || 0,
    acts_deleted_today: byAction.delete_act || 0,
    customer_prints_today: byAction.print_customer_copy || 0,
    shield_alerts_today: byAction.aurum_shield_alert_created || 0,
    top_users: topUsers.rows,
    latest: latest.rows.map(publicAuditLog)
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
    if (user.attivo === false) return response.status(403).json({ ok: false, error: "Utente non attivo" });
    await pool.query("UPDATE utenti SET last_seen = NOW() WHERE id = $1", [user.id]);
    user.last_seen = new Date();
    request.user = user;
    next();
  } catch {
    void writeAuditLog({
      req: request,
      action: "session_expired",
      entityType: "sessione",
      entityLabel: "Token non valido o scaduto"
    });
    response.status(401).json({ error: "Sessione scaduta o non valida" });
  }
}

function requireAdmin(request, response, next) {
  if (!canManageAccess(request.user)) {
    const route = request.originalUrl || request.path || "";
    if (request.method === "POST" && /^\/api\/(utenti|users)(\?|$)/.test(route)) {
      void writeAuditLog({
        req: request,
        user: request.user,
        action: "unauthorized_user_create_attempt",
        entityType: "utente",
        entityLabel: "Tentativo creazione utente",
        metadata: {
          attempted_role: request.body?.ruolo || request.body?.role || "",
          critical: true
        }
      });
    }
    if (request.method === "DELETE" && /^\/api\/(utenti|users)\/[^/?]+/.test(route)) {
      void writeAuditLog({
        req: request,
        user: request.user,
        action: "unauthorized_user_delete_attempt",
        entityType: "utente",
        entityId: request.params?.id || null,
        entityLabel: "Tentativo eliminazione utente",
        metadata: { target_user_id: request.params?.id || null, critical: true }
      });
    }
    return response.status(403).json({ ok: false, error: "Non autorizzato" });
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
  return fetchBullionVaultSpotPrice({
    metal,
    market,
    currency: "EUR",
    marketUrl: bullionVaultMarketUrl,
    fetchImpl: fetch
  });
}

function normalizePredictionMetal(metal = "gold") {
  const value = String(metal || "gold").trim().toLowerCase();
  if (["oro", "gold", "au", "xau"].includes(value)) return "gold";
  if (["argento", "silver", "ag"].includes(value)) return "silver";
  if (["platino", "platinum", "pt"].includes(value)) return "platinum";
  return "gold";
}

function normalizePredictionCurrency(currency = goldPriceBaseCurrency) {
  const value = String(currency || goldPriceBaseCurrency || "EUR").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : "EUR";
}

function normalizePredictionHorizon(horizon = "24h") {
  const value = String(horizon || "24h").trim().toLowerCase();
  if (["today", "oggi", "now", "current"].includes(value)) return "today";
  if (["24h", "1d", "day"].includes(value)) return "24h";
  if (["7d", "week", "1w"].includes(value)) return "7d";
  if (["30d", "month", "1m"].includes(value)) return "30d";
  return "24h";
}

function predictionHorizonDays(horizon = "24h") {
  return { today: 0, "24h": 1, "7d": 7, "30d": 30 }[normalizePredictionHorizon(horizon)] ?? 1;
}

function goldPredictionDefaultSettings() {
  return {
    provider: metalPriceProviderPrimary,
    fallback_provider: metalPriceProviderFallback,
    currency: goldPriceBaseCurrency,
    history_days: metalPriceSyncDays,
    horizons: ["today", "24h", "7d", "30d"],
    model: "ensemble",
    demo_mode: false,
    market_match_delta_per_gram: 0,
    allow_aggressive_market_match: false,
    competitor_data_max_age_hours: 24,
    show_competitor_to_commesso: false,
    require_founder_approval_if_competitor_above_max: true,
    disclaimer: "Le previsioni sono stime statistiche indicative. Il massimo pagabile è calcolato secondo le policy OroActive configurate dal Founder, includendo margine, costi e buffer. Non rappresenta garanzia di prezzo o consulenza finanziaria."
  };
}

function providerConfigured(provider = goldPriceProvider) {
  const value = String(provider || "manual").toLowerCase();
  if (value === "bullionvault") return bullionVaultEnabled;
  if (value === "alphavantage") return Boolean(alphaVantageApiKey);
  if (value === "custom_api") return Boolean(customMetalApiUrl);
  if (value === "lbma") return false;
  return false;
}

function providerLabel(provider = "") {
  const value = String(provider || "manual").toLowerCase();
  if (value === "bullionvault") return "BullionVault";
  if (value === "alphavantage") return "Alpha Vantage";
  if (value === "custom_api") return "Custom API";
  if (value === "lbma") return "LBMA";
  return "Manuale";
}

function providerUserMessage(provider = goldPriceProvider) {
  const value = String(provider || "manual").toLowerCase();
  if (value === "bullionvault" && !bullionVaultEnabled) return "BullionVault non configurato. Inserisci provider o usa import manuale.";
  if (value === "alphavantage" && !alphaVantageApiKey) return "Alpha Vantage non configurato. Inserisci API key lato backend o usa BullionVault.";
  if (value === "custom_api" && !customMetalApiUrl) return "Custom API non configurata. Inserisci CUSTOM_METAL_API_URL lato backend.";
  if (value === "lbma") return "Fallback LBMA non configurato come API automatica. Usa ultimo dato salvato o import manuale.";
  if (value === "manual") return "Fonte manuale selezionata. Sincronizza da BullionVault o inserisci dati manuali.";
  return "Fonte prezzo configurata.";
}

function providerStatus(provider = goldPriceProvider, settings = {}) {
  const value = String(provider || "manual").toLowerCase();
  const fallback = String(settings.fallback_provider || metalPriceProviderFallback || "manual").toLowerCase();
  const configured = providerConfigured(value);
  return {
    provider: value,
    provider_label: providerLabel(value),
    fallback_provider: fallback,
    fallback_label: providerLabel(fallback),
    configured,
    fallback_configured: providerConfigured(fallback),
    currency: goldPriceBaseCurrency,
    update_interval_minutes: goldPriceUpdateIntervalMinutes,
    sync_days: metalPriceSyncDays,
    demo_mode: Boolean(settings.demo_mode),
    note: configured ? `${providerLabel(value)} configurato lato backend.` : providerUserMessage(value)
  };
}

function publicMetalPriceHistory(row = {}) {
  const pricePerGram = Number(row.price_per_gram || 0);
  return {
    id: row.id || null,
    metal: row.metal || "gold",
    currency: row.currency || "EUR",
    price_per_kg: Number(row.price_per_kg || (pricePerGram * 1000) || 0),
    price_per_ounce: Number(row.price_per_ounce || 0),
    price_per_gram: pricePerGram,
    source: row.source || "",
    provider_timestamp: row.provider_timestamp || null,
    raw_payload: row.raw_payload || row.rawPayload || {},
    created_at: row.created_at || null
  };
}

function publicGoldPrediction(row = {}) {
  return {
    id: row.id || null,
    metal: row.metal || "gold",
    currency: row.currency || "EUR",
    horizon: row.prediction_horizon || row.horizon || "24h",
    prediction_horizon: row.prediction_horizon || row.horizon || "24h",
    current_price_per_gram: Number(row.current_price_per_gram || 0),
    predicted_price_per_gram: Number(row.predicted_price_per_gram || 0),
    predicted_low_per_gram: Number(row.predicted_low_per_gram || 0),
    predicted_high_per_gram: Number(row.predicted_high_per_gram || 0),
    trend: row.trend || "laterale",
    volatility: row.volatility || "media",
    confidence: row.confidence || "bassa",
    model_name: row.model_name || "ensemble",
    features: row.features || {},
    explanation: row.explanation || "",
    created_at: row.created_at || null
  };
}

async function loadGoldPredictionSettings() {
  const defaults = goldPredictionDefaultSettings();
  try {
    const result = await pool.query("SELECT value FROM gold_prediction_settings WHERE key = 'default' LIMIT 1");
    const saved = result.rows[0]?.value || {};
    return {
      ...defaults,
      ...saved,
      provider: String(saved.provider || defaults.provider || "bullionvault").toLowerCase(),
      fallback_provider: String(saved.fallback_provider || defaults.fallback_provider || "manual").toLowerCase(),
      demo_mode: Boolean(saved.demo_mode ?? defaults.demo_mode)
    };
  } catch {
    return defaults;
  }
}

async function updateGoldPredictionSettings(input = {}, user = {}, req = null) {
  const current = await loadGoldPredictionSettings();
  const requestedHorizons = Array.isArray(input.horizons) && input.horizons.length
    ? input.horizons.map(normalizePredictionHorizon).filter((value, index, array) => array.indexOf(value) === index)
    : [];
  const next = {
    ...current,
    provider: ["manual", "bullionvault", "alphavantage", "lbma", "custom_api"].includes(String(input.provider || "").toLowerCase())
      ? String(input.provider).toLowerCase()
      : current.provider,
    fallback_provider: ["manual", "bullionvault", "alphavantage", "lbma", "custom_api"].includes(String(input.fallback_provider || input.fallbackProvider || "").toLowerCase())
      ? String(input.fallback_provider || input.fallbackProvider).toLowerCase()
      : current.fallback_provider,
    currency: normalizePredictionCurrency(input.currency || current.currency),
    history_days: Math.min(Math.max(Number(input.history_days || input.historyDays || current.history_days || 90), 10), 365),
    horizons: requestedHorizons.length ? requestedHorizons : current.horizons,
    model: ["ensemble", "moving_average", "linear_regression"].includes(String(input.model || "").toLowerCase())
      ? String(input.model).toLowerCase()
      : current.model,
    demo_mode: Boolean(input.demo_mode ?? input.demoMode ?? current.demo_mode),
    market_match_delta_per_gram: Math.max(0, Number(input.market_match_delta_per_gram ?? input.marketMatchDeltaPerGram ?? current.market_match_delta_per_gram ?? 0)),
    allow_aggressive_market_match: Boolean(input.allow_aggressive_market_match ?? input.allowAggressiveMarketMatch ?? current.allow_aggressive_market_match),
    competitor_data_max_age_hours: Math.min(Math.max(Number(input.competitor_data_max_age_hours ?? input.competitorDataMaxAgeHours ?? current.competitor_data_max_age_hours ?? 24), 1), 720),
    show_competitor_to_commesso: Boolean(input.show_competitor_to_commesso ?? input.showCompetitorToCommesso ?? current.show_competitor_to_commesso),
    require_founder_approval_if_competitor_above_max: Boolean(input.require_founder_approval_if_competitor_above_max ?? input.requireFounderApprovalIfCompetitorAboveMax ?? current.require_founder_approval_if_competitor_above_max ?? true),
    disclaimer: String(input.disclaimer || current.disclaimer || goldPredictionDefaultSettings().disclaimer).slice(0, 600)
  };
  const result = await pool.query(
    `INSERT INTO gold_prediction_settings (key, value, updated_by, updated_at)
     VALUES ('default', $1::jsonb, $2::bigint, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
     RETURNING *`,
    [sanitizeForPostgres(next), user?.id || null]
  );
  void writeAuditLog({
    req,
    user,
    action: "gold_prediction_settings_updated",
    entityType: "gold_prediction",
    entityLabel: "Impostazioni Analisi di mercato oro",
    beforeData: current,
    afterData: next,
    metadata: { provider: next.provider, model: next.model }
  });
  return result.rows[0]?.value || next;
}

function demoMetalHistory(metal = "gold", days = 60, currency = "EUR", base = null) {
  const normalizedMetal = normalizePredictionMetal(metal);
  const basePrice = Number(base || (normalizedMetal === "silver" ? 0.86 : 68.4));
  const count = Math.min(Math.max(Number(days || 60), 14), 365);
  const rows = [];
  const now = Date.now();
  for (let index = count - 1; index >= 0; index -= 1) {
    const age = count - 1 - index;
    const wave = Math.sin(age / 5) * basePrice * 0.0105;
    const slow = Math.cos(age / 11) * basePrice * 0.0055;
    const trend = age * basePrice * 0.00026;
    const pricePerGram = Math.max(0.001, basePrice - trend + wave + slow);
    rows.push(publicMetalPriceHistory({
      id: `demo-${index}`,
      metal: normalizedMetal,
      currency,
      price_per_kg: pricePerGram * 1000,
      price_per_gram: pricePerGram,
      price_per_ounce: pricePerGram * TROY_OUNCE_GRAMS,
      source: "demo",
      provider_timestamp: new Date(now - index * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - index * 24 * 60 * 60 * 1000).toISOString()
    }));
  }
  return rows;
}

function demoGoldHistory(days = 60, currency = "EUR", base = 68.4) {
  return demoMetalHistory("gold", days, currency, base);
}

async function queryMetalPriceHistory({ metal = "gold", currency = "EUR", days = 90, limit = 365 } = {}) {
  const normalizedMetal = normalizePredictionMetal(metal);
  const normalizedCurrency = normalizePredictionCurrency(currency);
  const safeDays = Math.min(Math.max(Number(days || 90), 1), 365);
  const safeLimit = Math.min(Math.max(Number(limit || 365), 1), 365);
  const result = await pool.query(
    `SELECT *
       FROM metal_price_history
      WHERE metal = $1::text
        AND currency = $2::text
        AND created_at >= NOW() - ($3::int * INTERVAL '1 day')
      ORDER BY created_at ASC
      LIMIT $4::int`,
    [normalizedMetal, normalizedCurrency, safeDays, safeLimit]
  );
  return result.rows.map(publicMetalPriceHistory);
}

async function latestMetalPriceHistory(metal = "gold", currency = "EUR") {
  const result = await pool.query(
    `SELECT *
       FROM metal_price_history
      WHERE metal = $1::text
        AND currency = $2::text
      ORDER BY created_at DESC
      LIMIT 1`,
    [normalizePredictionMetal(metal), normalizePredictionCurrency(currency)]
  );
  return result.rows[0] ? publicMetalPriceHistory(result.rows[0]) : null;
}

async function insertMetalPriceHistory(input = {}) {
  const pricePerGram = Number(input.price_per_gram || input.pricePerGram || 0);
  const pricePerOunce = Number(input.price_per_ounce || input.pricePerOunce || (pricePerGram * TROY_OUNCE_GRAMS));
  const pricePerKg = Number(input.price_per_kg || input.pricePerKg || (pricePerGram * 1000));
  if (!Number.isFinite(pricePerGram) || pricePerGram <= 0) throw new Error("Prezzo metallo non valido");
  const result = await pool.query(
    `INSERT INTO metal_price_history (
      metal, currency, price_per_kg, price_per_ounce, price_per_gram, source, provider_timestamp, raw_payload
    ) VALUES (
      $1::text,$2::text,$3::numeric,$4::numeric,$5::numeric,$6::text,$7::timestamptz,$8::jsonb
    )
    RETURNING *`,
    [
      normalizePredictionMetal(input.metal || "gold"),
      normalizePredictionCurrency(input.currency || "EUR"),
      pricePerKg,
      pricePerOunce,
      pricePerGram,
      input.source || "manual",
      input.provider_timestamp || input.providerTimestamp || null,
      sanitizeForPostgres(input.raw_payload || input.rawPayload || {})
    ]
  );
  return publicMetalPriceHistory(result.rows[0]);
}

async function fetchAlphaVantageMetalPrice(metal = "gold", currency = "EUR") {
  if (!alphaVantageApiKey) throw new Error("Alpha Vantage API key non configurata");
  const normalizedMetal = normalizePredictionMetal(metal);
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
  url.searchParams.set("from_currency", normalizedMetal === "silver" ? "XAG" : "XAU");
  url.searchParams.set("to_currency", normalizePredictionCurrency(currency));
  url.searchParams.set("apikey", alphaVantageApiKey);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`);
  const data = await response.json();
  const exchange = data?.["Realtime Currency Exchange Rate"] || {};
  const pricePerOunce = Number(exchange["5. Exchange Rate"]);
  if (!Number.isFinite(pricePerOunce) || pricePerOunce <= 0) throw new Error("Prezzo Alpha Vantage non disponibile");
  return {
    metal: normalizedMetal,
    currency: normalizePredictionCurrency(currency),
    price_per_ounce: pricePerOunce,
    price_per_gram: pricePerOunce / TROY_OUNCE_GRAMS,
    price_per_kg: (pricePerOunce / TROY_OUNCE_GRAMS) * 1000,
    source: "alphavantage",
    provider_timestamp: exchange["6. Last Refreshed"] || new Date().toISOString()
  };
}

async function fetchAlphaVantageGoldPrice(currency = "EUR") {
  return fetchAlphaVantageMetalPrice("gold", currency);
}

async function fetchCustomMetalPrice(metal = "gold", currency = "EUR") {
  if (!customMetalApiUrl) throw new Error("Custom API non configurata");
  const normalizedMetal = normalizePredictionMetal(metal);
  const url = new URL(customMetalApiUrl);
  url.searchParams.set("metal", normalizedMetal);
  url.searchParams.set("currency", normalizePredictionCurrency(currency));
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Custom metal API HTTP ${response.status}`);
  const data = await response.json();
  const pricePerGram = Number(data.price_per_gram || data.pricePerGram || (Number(data.price_per_kg || data.pricePerKg || 0) / 1000));
  const pricePerOunce = Number(data.price_per_ounce || data.pricePerOunce || (pricePerGram * TROY_OUNCE_GRAMS));
  if (!Number.isFinite(pricePerGram) || pricePerGram <= 0) throw new Error("Prezzo Custom API non disponibile");
  return {
    metal: normalizedMetal,
    currency: normalizePredictionCurrency(data.currency || currency),
    price_per_kg: Number(data.price_per_kg || data.pricePerKg || (pricePerGram * 1000)),
    price_per_ounce: pricePerOunce,
    price_per_gram: pricePerGram,
    source: "custom_api",
    provider_timestamp: data.provider_timestamp || data.providerTimestamp || data.timestamp || new Date().toISOString(),
    raw_payload: sanitizeForPostgres(data)
  };
}

function configuredMetalProviderChain(settings = {}) {
  const providers = [
    settings.provider || metalPriceProviderPrimary || "bullionvault",
    settings.fallback_provider || metalPriceProviderFallback || "manual"
  ].map((provider) => String(provider || "manual").toLowerCase());
  return providers.filter((provider, index, array) => array.indexOf(provider) === index);
}

async function fetchMetalPriceFromProvider(provider = "manual", metal = "gold", settings = {}) {
  const value = String(provider || "manual").toLowerCase();
  const currency = normalizePredictionCurrency(settings.currency || goldPriceBaseCurrency);
  const normalizedMetal = normalizePredictionMetal(metal);
  if (value === "bullionvault") {
    if (!bullionVaultEnabled) throw new Error("BullionVault disabilitato");
    if (currency !== "EUR") throw new Error("BullionVault configurato in EUR per OroActive");
    const label = normalizedMetal === "silver" ? "Argento" : "Oro";
    const quote = await fetchBullionVaultPrice(label, bullionVaultMarkets[label]);
    const pricePerGram = Number(quote.value || 0) / 1000;
    return {
      metal: normalizedMetal,
      currency: "EUR",
      price_per_kg: Number(quote.value || 0),
      price_per_ounce: pricePerGram * TROY_OUNCE_GRAMS,
      price_per_gram: pricePerGram,
      source: "bullionvault",
      provider_timestamp: quote.fetchedAt,
      raw_payload: quote.rawPayload || { buy: quote.buy, sell: quote.sell, security_id: quote.securityId }
    };
  }
  if (value === "alphavantage") return fetchAlphaVantageMetalPrice(normalizedMetal, currency);
  if (value === "custom_api") return fetchCustomMetalPrice(normalizedMetal, currency);
  if (value === "lbma") throw new Error("LBMA non configurato come provider automatico");
  throw new Error("Fonte dati non configurata");
}

async function fetchConfiguredMetalPrice(metal = "gold", settings = {}) {
  const errors = [];
  for (const provider of configuredMetalProviderChain(settings)) {
    if (!providerConfigured(provider)) {
      errors.push(`${providerLabel(provider)}: ${providerUserMessage(provider)}`);
      continue;
    }
    try {
      return await fetchMetalPriceFromProvider(provider, metal, settings);
    } catch (error) {
      errors.push(`${providerLabel(provider)}: ${error.message || "errore provider"}`);
    }
  }
  const message = errors.length ? errors.join(" | ") : "Fonte dati non configurata";
  throw new Error(message);
}

async function fetchConfiguredGoldPrice(settings = {}) {
  return fetchConfiguredMetalPrice("gold", settings);
}

async function syncMetalPriceHistory(metal = "gold", user = {}, req = null) {
  const settings = await loadGoldPredictionSettings();
  const normalizedMetal = normalizePredictionMetal(metal);
  try {
    const price = await fetchConfiguredMetalPrice(normalizedMetal, settings);
    const inserted = await insertMetalPriceHistory(price);
    void writeAuditLog({
      req,
      user,
      action: "gold_price_sync",
      entityType: "gold_price_history",
      entityId: inserted.id,
      entityLabel: normalizedMetal === "silver" ? "Storico prezzo argento" : "Storico prezzo oro",
      afterData: inserted,
      metadata: { metal: normalizedMetal, provider: settings.provider || goldPriceProvider }
    });
    return { ok: true, mode: "live", warning: "", price: inserted };
  } catch (error) {
    console.error("METAL PRICE SYNC ERROR", normalizedMetal, error.message || error);
    const latest = await latestMetalPriceHistory(normalizedMetal, settings.currency || goldPriceBaseCurrency);
    if (latest) {
      return {
        ok: true,
        mode: "saved",
        warning: `Provider non disponibile. Uso ultimo dato salvato per ${normalizedMetal === "silver" ? "argento" : "oro"}.`,
        price: latest
      };
    }
    if (settings.demo_mode) {
      const demo = demoMetalHistory(normalizedMetal, 30, settings.currency || goldPriceBaseCurrency).at(-1);
      return {
        ok: true,
        mode: "demo",
        warning: `Modalità demo attiva: dato dimostrativo per ${normalizedMetal === "silver" ? "argento" : "oro"}.`,
        price: demo
      };
    }
    return {
      ok: false,
      mode: "unavailable",
      warning: `${providerUserMessage(settings.provider)} Storico non disponibile: configurare fonte dati o sincronizzare manualmente.`,
      price: null
    };
  }
}

async function syncGoldPriceHistory(user = {}, req = null) {
  return syncMetalPriceHistory("gold", user, req);
}

async function syncBullionVaultMetalHistory(user = {}, req = null, input = {}) {
  const currency = normalizePredictionCurrency(input.currency || "EUR");
  const metals = (Array.isArray(input.metals) && input.metals.length ? input.metals : ["gold", "silver"])
    .map(normalizePredictionMetal)
    .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
  const results = [];
  for (const metal of metals) {
    const label = metal === "silver" ? "Argento" : "Oro";
    try {
      if (!bullionVaultEnabled) throw new Error("BullionVault non configurato");
      if (currency !== "EUR") throw new Error("BullionVault configurato in EUR per OroActive");
      const quote = await fetchBullionVaultPrice(label, bullionVaultMarkets[label]);
      const pricePerGram = Number(quote.value || 0) / 1000;
      const inserted = await insertMetalPriceHistory({
        metal,
        currency: "EUR",
        price_per_kg: Number(quote.value || 0),
        price_per_ounce: pricePerGram * TROY_OUNCE_GRAMS,
        price_per_gram: pricePerGram,
        source: "bullionvault",
        provider_timestamp: quote.fetchedAt,
        raw_payload: quote.rawPayload || { buy: quote.buy, sell: quote.sell, security_id: quote.securityId }
      });
      void writeAuditLog({
        req,
        user,
        action: "gold_price_sync",
        entityType: "metal_price_history",
        entityId: inserted.id,
        entityLabel: `Sync BullionVault ${label}`,
        afterData: inserted,
        metadata: { metal, provider: "bullionvault" }
      });
      results.push({ ok: true, metal, mode: "live", warning: "", price: inserted });
    } catch (error) {
      console.error("BULLIONVAULT METAL SYNC ERROR", metal, error.message || error);
      const latest = await latestMetalPriceHistory(metal, currency);
      results.push({
        ok: Boolean(latest),
        metal,
        mode: latest ? "saved" : "unavailable",
        warning: latest
          ? `BullionVault non disponibile. Uso ultimo dato salvato per ${label.toLowerCase()}.`
          : `BullionVault non configurato o non disponibile per ${label.toLowerCase()}. Storico non disponibile.`,
        price: latest || null
      });
    }
  }
  const failures = results.filter((result) => !result.ok);
  return {
    ok: !failures.length,
    provider: "bullionvault",
    results,
    warning: results.map((result) => result.warning).filter(Boolean).join(" ")
  };
}

function average(values = []) {
  const clean = values.filter((value) => Number.isFinite(Number(value)));
  return clean.length ? clean.reduce((sum, value) => sum + Number(value), 0) / clean.length : 0;
}

function standardDeviation(values = []) {
  const clean = values.filter((value) => Number.isFinite(Number(value)));
  if (clean.length < 2) return 0;
  const avg = average(clean);
  return Math.sqrt(clean.reduce((sum, value) => sum + ((Number(value) - avg) ** 2), 0) / (clean.length - 1));
}

function movingAverage(values = [], period = 7) {
  return average(values.slice(Math.max(0, values.length - period)));
}

function exponentialMovingAverage(values = [], period = 7) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  return values.reduce((ema, value, index) => index === 0 ? Number(value) : (Number(value) * k) + (ema * (1 - k)), Number(values[0]));
}

function linearSlope(values = []) {
  const clean = values.map(Number).filter(Number.isFinite);
  const n = clean.length;
  if (n < 2) return 0;
  const xAvg = (n - 1) / 2;
  const yAvg = average(clean);
  let numerator = 0;
  let denominator = 0;
  clean.forEach((y, x) => {
    numerator += (x - xAvg) * (y - yAvg);
    denominator += (x - xAvg) ** 2;
  });
  return denominator ? numerator / denominator : 0;
}

function classifyGoldTrend({ ma7 = 0, ma30 = 0, emaShort = 0, emaLong = 0, slope = 0, current = 0 } = {}) {
  let score = 0;
  if (ma7 > ma30 * 1.002) score += 1;
  if (ma7 < ma30 * 0.998) score -= 1;
  if (emaShort > emaLong * 1.002) score += 1;
  if (emaShort < emaLong * 0.998) score -= 1;
  if (slope > current * 0.001) score += 1;
  if (slope < -current * 0.001) score -= 1;
  if (score >= 2) return "rialzista";
  if (score <= -2) return "ribassista";
  return "laterale";
}

function classifyGoldVolatility(std = 0) {
  if (std >= 0.018) return "alta";
  if (std >= 0.007) return "media";
  return "bassa";
}

function predictionConfidence(points = 0, volatility = "media", latestDate = null, demo = false) {
  if (demo || points < 10) return "bassa";
  const ageHours = latestDate ? (Date.now() - new Date(latestDate).getTime()) / 36e5 : 999;
  if (ageHours > 72) return "bassa";
  if (points < 30 || volatility === "alta") return "media/bassa";
  return "media";
}

function calculateGoldPrediction(history = [], options = {}) {
  const horizon = normalizePredictionHorizon(options.horizon || "24h");
  const days = predictionHorizonDays(horizon);
  const sorted = [...history]
    .map(publicMetalPriceHistory)
    .filter((row) => Number(row.price_per_gram) > 0)
    .sort((first, second) => new Date(first.created_at) - new Date(second.created_at));
  const prices = sorted.map((row) => Number(row.price_per_gram));
  const current = prices.at(-1) || 0;
  const ma7 = movingAverage(prices, 7);
  const ma30 = movingAverage(prices, 30);
  const emaShort = exponentialMovingAverage(prices, 7);
  const emaLong = exponentialMovingAverage(prices, 30);
  const slope = linearSlope(prices.slice(-45));
  const returns = prices.slice(1).map((price, index) => prices[index] ? (price - prices[index]) / prices[index] : 0);
  const volatilityStd = standardDeviation(returns);
  const volatility = classifyGoldVolatility(volatilityStd);
  const trend = classifyGoldTrend({ ma7, ma30, emaShort, emaLong, slope, current });
  const linearProjection = current + (slope * days);
  const emaProjection = current + ((emaShort - emaLong) * Math.min(days, 14) * 0.12);
  const maProjection = current + ((ma7 - ma30) * Math.min(days, 14) * 0.08);
  const predicted = Math.max(0, (linearProjection * 0.45) + (emaProjection * 0.25) + (maProjection * 0.15) + (current * 0.15));
  const volatilityFactor = volatility === "alta" ? 2.15 : volatility === "media" ? 1.7 : 1.25;
  const statisticalRange = current * Math.max(volatilityStd, 0.004) * Math.sqrt(days) * volatilityFactor;
  const minimumRange = current * (horizon === "today" ? 0.0025 : horizon === "24h" ? 0.006 : horizon === "7d" ? 0.014 : 0.026);
  const range = Math.max(statisticalRange, minimumRange);
  const low = Math.max(0, predicted - range);
  const high = predicted + range;
  const confidence = predictionConfidence(sorted.length, volatility, sorted.at(-1)?.created_at, options.demo);
  const modelName = options.model || "ensemble";
  const stale = sorted.at(-1)?.created_at && ((Date.now() - new Date(sorted.at(-1).created_at).getTime()) / 36e5) > 72;
  const explanation = [
    `Stima ${horizon}: trend ${trend} con volatilità ${volatility}.`,
    `Il modello combina media mobile 7/30 periodi, EMA breve/lunga, regressione lineare e range statistico.`,
    stale ? "Attenzione: i dati disponibili non risultano aggiornati nelle ultime 72 ore." : "",
    "La previsione è indicativa e non rappresenta un prezzo garantito."
  ].filter(Boolean).join(" ");
  return {
    metal: normalizePredictionMetal(options.metal || "gold"),
    currency: normalizePredictionCurrency(options.currency || "EUR"),
    horizon,
    prediction_horizon: horizon,
    current_price_per_gram: current,
    predicted_price_per_gram: predicted,
    predicted_low_per_gram: low,
    predicted_high_per_gram: high,
    trend,
    volatility,
    confidence,
    model_name: modelName,
    features: {
      data_points: sorted.length,
      ma7,
      ma30,
      ema_short: emaShort,
      ema_long: emaLong,
      linear_slope_per_period: slope,
      volatility_std: volatilityStd,
      stale_data: Boolean(stale),
      demo_mode: Boolean(options.demo)
    },
    explanation
  };
}

async function insertGoldPrediction(prediction = {}) {
  const result = await pool.query(
    `INSERT INTO gold_price_predictions (
      metal, currency, prediction_horizon,
      current_price_per_gram, predicted_price_per_gram,
      predicted_low_per_gram, predicted_high_per_gram,
      trend, volatility, confidence, model_name, features, explanation
    ) VALUES (
      $1::text,$2::text,$3::text,$4::numeric,$5::numeric,$6::numeric,$7::numeric,
      $8::text,$9::text,$10::text,$11::text,$12::jsonb,$13::text
    )
    RETURNING *`,
    [
      normalizePredictionMetal(prediction.metal),
      normalizePredictionCurrency(prediction.currency),
      normalizePredictionHorizon(prediction.prediction_horizon || prediction.horizon),
      prediction.current_price_per_gram,
      prediction.predicted_price_per_gram,
      prediction.predicted_low_per_gram,
      prediction.predicted_high_per_gram,
      prediction.trend,
      prediction.volatility,
      prediction.confidence,
      prediction.model_name || "ensemble",
      sanitizeForPostgres(prediction.features || {}),
      prediction.explanation || ""
    ]
  );
  return publicGoldPrediction(result.rows[0]);
}

async function latestGoldPredictions({ metal = "gold", currency = "EUR", limit = 9 } = {}) {
  const result = await pool.query(
    `SELECT DISTINCT ON (prediction_horizon) *
       FROM gold_price_predictions
      WHERE metal = $1::text
        AND currency = $2::text
      ORDER BY prediction_horizon, created_at DESC
      LIMIT $3::int`,
    [normalizePredictionMetal(metal), normalizePredictionCurrency(currency), Math.min(Math.max(Number(limit || 9), 1), 12)]
  );
  const order = { "24h": 1, "7d": 2, "30d": 3 };
  return result.rows.map(publicGoldPrediction).sort((a, b) => (order[a.horizon] || 9) - (order[b.horizon] || 9));
}

async function insertMetalPrediction(prediction = {}) {
  const result = await pool.query(
    `INSERT INTO metal_price_predictions (
      metal, currency, prediction_horizon,
      current_price_per_gram, predicted_price_per_gram,
      predicted_low_per_gram, predicted_high_per_gram,
      trend, volatility, confidence, model_name, features, explanation
    ) VALUES (
      $1::text,$2::text,$3::text,$4::numeric,$5::numeric,$6::numeric,$7::numeric,
      $8::text,$9::text,$10::text,$11::text,$12::jsonb,$13::text
    )
    RETURNING *`,
    [
      normalizePredictionMetal(prediction.metal),
      normalizePredictionCurrency(prediction.currency),
      normalizePredictionHorizon(prediction.prediction_horizon || prediction.horizon),
      prediction.current_price_per_gram,
      prediction.predicted_price_per_gram,
      prediction.predicted_low_per_gram,
      prediction.predicted_high_per_gram,
      prediction.trend,
      prediction.volatility,
      prediction.confidence,
      prediction.model_name || "ensemble",
      sanitizeForPostgres(prediction.features || {}),
      prediction.explanation || ""
    ]
  );
  return publicGoldPrediction(result.rows[0]);
}

async function latestMetalPredictions({ metal = "gold", currency = "EUR", limit = 12 } = {}) {
  const result = await pool.query(
    `SELECT DISTINCT ON (prediction_horizon) *
       FROM metal_price_predictions
      WHERE metal = $1::text
        AND currency = $2::text
      ORDER BY prediction_horizon, created_at DESC
      LIMIT $3::int`,
    [normalizePredictionMetal(metal), normalizePredictionCurrency(currency), Math.min(Math.max(Number(limit || 12), 1), 12)]
  );
  const order = { today: 0, "24h": 1, "7d": 2, "30d": 3 };
  return result.rows.map(publicGoldPrediction).sort((a, b) => (order[a.horizon] ?? 9) - (order[b.horizon] ?? 9));
}

async function predictionHistoryForRequest({ metal = "gold", currency = "EUR", days = 90 } = {}) {
  const settings = await loadGoldPredictionSettings();
  let history = await queryMetalPriceHistory({ metal, currency, days, limit: 365 });
  if (!history.length) {
    const latest = await latestMetalPriceHistory(metal, currency);
    if (latest) history = [latest];
  }
  if (history.length >= 10) return { history, demo: false, warning: "" };
  if (history.length > 0) {
    return {
      history,
      demo: false,
      warning: `Storico insufficiente: servono almeno 10 rilevazioni per calcolare una previsione base. Rilevazioni disponibili: ${history.length}.`
    };
  }
  if (settings.demo_mode) {
    return {
      history: demoMetalHistory(metal, days, currency),
      demo: true,
      warning: "Modalità demo attiva: dati dimostrativi, non usare come prezzo operativo."
    };
  }
  return {
    history: [],
    demo: false,
    warning: "Storico non disponibile: configurare fonte dati o sincronizzare manualmente."
  };
}

async function runGoldPredictions(input = {}, user = {}, req = null) {
  const settings = await loadGoldPredictionSettings();
  const metal = normalizePredictionMetal(input.metal || "gold");
  const currency = normalizePredictionCurrency(input.currency || settings.currency || goldPriceBaseCurrency);
  const horizons = (Array.isArray(input.horizons) && input.horizons.length ? input.horizons : settings.horizons || ["24h", "7d", "30d"])
    .map(normalizePredictionHorizon)
    .filter((value, index, array) => array.indexOf(value) === index);
  const days = Math.min(Math.max(Number(settings.history_days || 90), 10), 365);
  const historyBundle = await predictionHistoryForRequest({ metal, currency, days });
  const predictions = [];
  if (historyBundle.history.length) {
    for (const horizon of horizons) {
      const prediction = calculateGoldPrediction(historyBundle.history, {
        metal,
        currency,
        horizon,
        model: settings.model || "ensemble",
        demo: historyBundle.demo || settings.demo_mode
      });
      predictions.push(await insertGoldPrediction(prediction));
    }
  }
  void writeAuditLog({
    req,
    user,
    action: "gold_prediction_run",
    entityType: "gold_prediction",
    entityLabel: "Analisi di mercato oro",
    afterData: { horizons, predictions },
    metadata: { metal, currency, demo: historyBundle.demo, model: settings.model || "ensemble" }
  });
  return {
    ok: true,
    metal,
    currency,
    warning: historyBundle.warning,
    disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer,
    predictions
  };
}

async function runMetalPredictions(input = {}, user = {}, req = null) {
  const settings = await loadGoldPredictionSettings();
  const metals = (Array.isArray(input.metals) && input.metals.length ? input.metals : [input.metal || "gold", "silver"])
    .map(normalizePredictionMetal)
    .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
  const currency = normalizePredictionCurrency(input.currency || settings.currency || goldPriceBaseCurrency);
  const horizons = (Array.isArray(input.horizons) && input.horizons.length ? input.horizons : settings.horizons || ["today", "24h", "7d", "30d"])
    .map(normalizePredictionHorizon)
    .filter((value, index, array) => array.indexOf(value) === index);
  const days = Math.min(Math.max(Number(settings.history_days || 90), 10), 365);
  const predictions = [];
  const warnings = [];
  for (const metal of metals) {
    const historyBundle = await predictionHistoryForRequest({ metal, currency, days });
    if (historyBundle.warning) warnings.push(`${metal}: ${historyBundle.warning}`);
    if (!historyBundle.history.length) continue;
    for (const horizon of horizons) {
      const prediction = calculateGoldPrediction(historyBundle.history, {
        metal,
        currency,
        horizon,
        model: settings.model || "ensemble",
        demo: historyBundle.demo || settings.demo_mode
      });
      predictions.push(await insertMetalPrediction(prediction));
    }
  }
  void writeAuditLog({
    req,
    user,
    action: "gold_prediction_run",
    entityType: "metal_prediction",
    entityLabel: "Analisi di mercato",
    afterData: { metals, horizons, predictions },
    metadata: { metals, currency, model: settings.model || "ensemble" }
  });
  return {
    ok: true,
    metals,
    currency,
    warning: warnings.filter(Boolean).join(" "),
    disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer,
    predictions
  };
}

function canSyncGoldPriceHistory(user = {}) {
  return ["founder", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function normalizeBuybackScenario(value = "standard") {
  const scenario = String(value || "standard").toLowerCase();
  if (["prudente", "prudent", "safe"].includes(scenario)) return "prudente";
  if (["aggressivo", "aggressive"].includes(scenario)) return "aggressivo";
  return "standard";
}

function buybackPurityCatalog() {
  return [
    { metal: "gold", purity_code: "24kt", label: "Oro 24kt", purity_value: 24 / 24, margin_target_pct: 0.12, refinery_spread_pct: 0.012, melting_loss_pct: 0.006, operating_cost_per_gram: 0.35, melting_cost_per_gram: 0.18, risk_buffer_pct: 0.006, negotiation_buffer_pct: 0.012 },
    { metal: "gold", purity_code: "22kt", label: "Oro 22kt", purity_value: 22 / 24, margin_target_pct: 0.13, refinery_spread_pct: 0.012, melting_loss_pct: 0.007, operating_cost_per_gram: 0.36, melting_cost_per_gram: 0.18, risk_buffer_pct: 0.007, negotiation_buffer_pct: 0.012 },
    { metal: "gold", purity_code: "21kt", label: "Oro 21kt", purity_value: 21 / 24, margin_target_pct: 0.14, refinery_spread_pct: 0.013, melting_loss_pct: 0.008, operating_cost_per_gram: 0.38, melting_cost_per_gram: 0.19, risk_buffer_pct: 0.008, negotiation_buffer_pct: 0.014 },
    { metal: "gold", purity_code: "18kt", label: "Oro 18kt", purity_value: 18 / 24, margin_target_pct: 0.15, refinery_spread_pct: 0.014, melting_loss_pct: 0.009, operating_cost_per_gram: 0.40, melting_cost_per_gram: 0.20, risk_buffer_pct: 0.009, negotiation_buffer_pct: 0.015 },
    { metal: "gold", purity_code: "14kt", label: "Oro 14kt", purity_value: 14 / 24, margin_target_pct: 0.17, refinery_spread_pct: 0.016, melting_loss_pct: 0.012, operating_cost_per_gram: 0.44, melting_cost_per_gram: 0.22, risk_buffer_pct: 0.011, negotiation_buffer_pct: 0.018 },
    { metal: "gold", purity_code: "12kt", label: "Oro 12kt", purity_value: 12 / 24, margin_target_pct: 0.18, refinery_spread_pct: 0.017, melting_loss_pct: 0.014, operating_cost_per_gram: 0.46, melting_cost_per_gram: 0.23, risk_buffer_pct: 0.012, negotiation_buffer_pct: 0.020 },
    { metal: "gold", purity_code: "9kt", label: "Oro 9kt", purity_value: 9 / 24, margin_target_pct: 0.21, refinery_spread_pct: 0.020, melting_loss_pct: 0.018, operating_cost_per_gram: 0.50, melting_cost_per_gram: 0.26, risk_buffer_pct: 0.014, negotiation_buffer_pct: 0.024 },
    { metal: "gold", purity_code: "6kt", label: "Oro 6kt", purity_value: 6 / 24, margin_target_pct: 0.25, refinery_spread_pct: 0.024, melting_loss_pct: 0.024, operating_cost_per_gram: 0.56, melting_cost_per_gram: 0.30, risk_buffer_pct: 0.018, negotiation_buffer_pct: 0.030 },
    { metal: "silver", purity_code: "999", label: "Argento 999", purity_value: 0.999, margin_target_pct: 0.18, refinery_spread_pct: 0.025, melting_loss_pct: 0.010, operating_cost_per_gram: 0.035, melting_cost_per_gram: 0.025, risk_buffer_pct: 0.012, negotiation_buffer_pct: 0.020 },
    { metal: "silver", purity_code: "925", label: "Argento 925", purity_value: 0.925, margin_target_pct: 0.22, refinery_spread_pct: 0.030, melting_loss_pct: 0.014, operating_cost_per_gram: 0.040, melting_cost_per_gram: 0.030, risk_buffer_pct: 0.014, negotiation_buffer_pct: 0.025 },
    { metal: "silver", purity_code: "800", label: "Argento 800", purity_value: 0.800, margin_target_pct: 0.25, refinery_spread_pct: 0.035, melting_loss_pct: 0.018, operating_cost_per_gram: 0.045, melting_cost_per_gram: 0.035, risk_buffer_pct: 0.016, negotiation_buffer_pct: 0.030 }
  ];
}

function defaultBuybackPolicySettings() {
  return {
    default_scenario: "standard",
    fixed_practice_cost_per_gram: 0,
    volatility_buffers: { bassa: 0.004, media: 0.010, alta: 0.020 },
    policies: buybackPurityCatalog()
  };
}

function percentageValue(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, number > 1 ? number / 100 : number);
}

function publicBuybackPolicyRow(row = {}) {
  const fallback = buybackPurityCatalog().find((item) => item.metal === row.metal && item.purity_code === row.purity_code) || {};
  return {
    metal: normalizePredictionMetal(row.metal || fallback.metal || "gold"),
    purity_code: String(row.purity_code || fallback.purity_code || "18kt"),
    label: row.label || fallback.label || row.purity_code || "",
    purity_value: Number(row.purity_value ?? fallback.purity_value ?? 1),
    margin_target_pct: percentageValue(row.margin_target_pct, Number(fallback.margin_target_pct || 0.15)),
    refinery_spread_pct: percentageValue(row.refinery_spread_pct, Number(fallback.refinery_spread_pct || 0)),
    melting_loss_pct: percentageValue(row.melting_loss_pct, Number(fallback.melting_loss_pct || 0)),
    operating_cost_per_gram: Math.max(0, Number(row.operating_cost_per_gram ?? fallback.operating_cost_per_gram ?? 0)),
    melting_cost_per_gram: Math.max(0, Number(row.melting_cost_per_gram ?? fallback.melting_cost_per_gram ?? 0)),
    risk_buffer_pct: percentageValue(row.risk_buffer_pct, Number(fallback.risk_buffer_pct || 0)),
    negotiation_buffer_pct: percentageValue(row.negotiation_buffer_pct, Number(fallback.negotiation_buffer_pct || 0)),
    active: row.active !== false
  };
}

async function loadBuybackPolicySettings() {
  const defaults = defaultBuybackPolicySettings();
  try {
    const result = await pool.query("SELECT * FROM metal_buyback_policy_settings WHERE active = true ORDER BY metal, purity_code");
    const saved = new Map(result.rows.map((row) => [`${row.metal}:${row.purity_code}`, row]));
    return {
      ...defaults,
      policies: defaults.policies.map((policy) => publicBuybackPolicyRow({ ...policy, ...(saved.get(`${policy.metal}:${policy.purity_code}`) || {}) }))
    };
  } catch {
    return defaults;
  }
}

async function updateBuybackPolicySettings(input = {}, user = {}, req = null) {
  const current = await loadBuybackPolicySettings();
  const incomingRows = Array.isArray(input.policies) ? input.policies : [];
  const byKey = new Map(current.policies.map((row) => [`${row.metal}:${row.purity_code}`, row]));
  incomingRows.forEach((row) => {
    const normalized = publicBuybackPolicyRow(row);
    byKey.set(`${normalized.metal}:${normalized.purity_code}`, { ...(byKey.get(`${normalized.metal}:${normalized.purity_code}`) || {}), ...normalized });
  });
  const policies = [...byKey.values()].map(publicBuybackPolicyRow);
  for (const policy of policies) {
    await pool.query(
      `INSERT INTO metal_buyback_policy_settings (
        metal, purity_code, purity_value, margin_target_pct, refinery_spread_pct, melting_loss_pct,
        operating_cost_per_gram, melting_cost_per_gram, risk_buffer_pct, negotiation_buffer_pct,
        active, updated_by, updated_at
      ) VALUES (
        $1::text,$2::text,$3::numeric,$4::numeric,$5::numeric,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric,true,$11::bigint,NOW()
      )
      ON CONFLICT (metal, purity_code) DO UPDATE SET
        purity_value = EXCLUDED.purity_value,
        margin_target_pct = EXCLUDED.margin_target_pct,
        refinery_spread_pct = EXCLUDED.refinery_spread_pct,
        melting_loss_pct = EXCLUDED.melting_loss_pct,
        operating_cost_per_gram = EXCLUDED.operating_cost_per_gram,
        melting_cost_per_gram = EXCLUDED.melting_cost_per_gram,
        risk_buffer_pct = EXCLUDED.risk_buffer_pct,
        negotiation_buffer_pct = EXCLUDED.negotiation_buffer_pct,
        active = true,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()`,
      [
        policy.metal,
        policy.purity_code,
        policy.purity_value,
        policy.margin_target_pct,
        policy.refinery_spread_pct,
        policy.melting_loss_pct,
        policy.operating_cost_per_gram,
        policy.melting_cost_per_gram,
        policy.risk_buffer_pct,
        policy.negotiation_buffer_pct,
        user?.id || null
      ]
    );
  }
  const next = { ...current, policies };
  void writeAuditLog({
    req,
    user,
    action: "gold_prediction_settings_updated",
    entityType: "metal_buyback_policy",
    entityLabel: "Policy Prezzi Compro Oro",
    beforeData: current,
    afterData: next,
    metadata: { rows: policies.length }
  });
  return next;
}

function purityCatalogByKey() {
  return new Map(buybackPurityCatalog().map((item) => [`${item.metal}:${item.purity_code}`, item]));
}

function normalizePurityCode(input = "", metal = "gold") {
  const normalizedMetal = normalizePredictionMetal(metal);
  const raw = String(input || "").trim().toLowerCase();
  const value = raw.replace(/\s+/g, "");
  if (!value) return normalizedMetal === "silver" ? "925" : "18kt";
  if (normalizedMetal === "gold") {
    if (/oropuro|puro|24carati/.test(value)) return "24kt";
    const match = raw.match(/\b(24|22|21|20|18|14|12|9|6)\s*(?:kt|k|carati|carato)?\b/);
    return match ? `${match[1]}kt` : "18kt";
  }
  if (/sterling/.test(value)) return "925";
  if (/argentopuro|puro/.test(value)) return "999";
  if (/usedgeneric|generic|generico|argentousato|usato/.test(value)) return "used_generic";
  const match = value.match(/\b(999|925|800)\b/);
  if (match) return match[1];
  return value.replace(/[^0-9]/g, "") || "925";
}

function purityValueForCode(metal = "gold", purityCode = "") {
  const normalizedMetal = normalizePredictionMetal(metal);
  const normalizedCode = normalizePurityCode(purityCode, normalizedMetal);
  const catalog = purityCatalogByKey().get(`${normalizedMetal}:${normalizedCode}`);
  if (catalog) return Number(catalog.purity_value || 0);
  if (normalizedMetal === "gold") {
    const kt = Number(normalizedCode.replace("kt", ""));
    return Number.isFinite(kt) && kt > 0 ? Math.min(1, kt / 24) : 18 / 24;
  }
  if (normalizedCode === "used_generic") return 0;
  const title = Number(normalizedCode);
  return Number.isFinite(title) && title > 0 ? Math.min(1, title / 1000) : 0.925;
}

const HIDDEN_COMPETITOR_NAMES = new Set(["banco preziosi"]);

function competitorPolicyNameKey(name = "") {
  return String(name || "")
    .normalize("NFKC")
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("it-IT");
}

function isHiddenCompetitorName(name = "") {
  return HIDDEN_COMPETITOR_NAMES.has(competitorPolicyNameKey(name));
}

function hiddenCompetitorSql(column = "competitor_name") {
  return `LOWER(COALESCE(${column}, '')) <> LOWER('Banco Preziosi')`;
}

function defaultCompetitorExtractionConfig(url = "") {
  return {
    method: "html_regex",
    pages: [
      { url, metal: "gold" },
      { url, metal: "silver" }
    ],
    purityMapping: {
      "oro puro": "24kt",
      "24kt": "24kt",
      "24 carati": "24kt",
      "22kt": "22kt",
      "21kt": "21kt",
      "18kt": "18kt",
      "18 carati": "18kt",
      "14kt": "14kt",
      "12kt": "12kt",
      "9kt": "9kt",
      "6kt": "6kt",
      "argento puro": "999",
      "argento usato": "used_generic",
      "sterling": "925",
      "argento 925": "925",
      "argento 800": "800"
    },
    priceFormat: "it-IT",
    currency: "EUR"
  };
}

const DEFAULT_COMPETITOR_SOURCES = [
  {
    name: "Oro Express",
    website_url: oroExpressUrl,
    source_type: "oro_express_parser",
    sync_interval_minutes: oroExpressSyncIntervalMinutes,
    extraction_config: {
      method: "oro_express_parser",
      url: oroExpressUrl,
      silver_used_mapping: oroExpressSilverUsedMapping,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Oro D'Oro",
    website_url: oroDOroUrl,
    source_type: "oro_doro_parser",
    sync_interval_minutes: oroDOroSyncIntervalMinutes,
    extraction_config: {
      method: "oro_doro_parser",
      url: oroDOroUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Amico Oro",
    website_url: amicoOroUrl,
    source_type: "amico_oro_parser",
    sync_interval_minutes: amicoOroSyncIntervalMinutes,
    extraction_config: {
      method: "amico_oro_parser",
      url: amicoOroUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Pronto Gold",
    website_url: prontoGoldUrl,
    source_type: "pronto_gold_parser",
    sync_interval_minutes: prontoGoldSyncIntervalMinutes,
    extraction_config: {
      method: "pronto_gold_parser",
      url: prontoGoldUrl,
      quote_url: prontoGoldQuoteUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Bordin",
    website_url: bordinUrl,
    source_type: "bordin_parser",
    sync_interval_minutes: bordinSyncIntervalMinutes,
    extraction_config: {
      method: "bordin_parser",
      url: bordinUrl,
      currency: "EUR",
      min_quantity_grams: 35
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Gold Standard",
    website_url: goldStandardUrl,
    source_type: "gold_standard_parser",
    sync_interval_minutes: goldStandardSyncIntervalMinutes,
    extraction_config: {
      method: "gold_standard_parser",
      url: goldStandardUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Oro in Euro",
    website_url: oroInEuroUrl,
    source_type: "oro_in_euro_parser",
    sync_interval_minutes: oroInEuroSyncIntervalMinutes,
    extraction_config: {
      method: "oro_in_euro_parser",
      url: oroInEuroUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  },
  {
    name: "Gruppo Oro 24K",
    website_url: gruppoOro24kUrl,
    source_type: "gruppo_oro_24k_parser",
    sync_interval_minutes: gruppoOro24kSyncIntervalMinutes,
    extraction_config: {
      method: "gruppo_oro_24k_parser",
      url: gruppoOro24kUrl,
      currency: "EUR"
    },
    notes: "Competitor preconfigurato OroActive con parser automatico dedicato ogni ora"
  }
].map((source) => ({
  ...source,
  source_type: source.source_type || "configured_page",
  active: true,
  auto_sync_enabled: true,
  sync_interval_minutes: source.sync_interval_minutes || competitorAutoSyncIntervalMinutes,
  extraction_config: source.extraction_config || defaultCompetitorExtractionConfig(source.website_url),
  notes: source.notes || "Competitor preconfigurato OroActive con aggiornamento automatico prudente"
}));

function publicCompetitorSource(row = {}) {
  return {
    id: row.id || null,
    name: row.name || "",
    website_url: row.website_url || "",
    source_type: row.source_type || "manual",
    active: row.active !== false,
    auto_sync_enabled: row.auto_sync_enabled !== false,
    sync_interval_minutes: Number(row.sync_interval_minutes || competitorAutoSyncIntervalMinutes),
    notes: row.notes || "",
    selectors: row.selectors || {},
    extraction_config: row.extraction_config || row.extractionConfig || row.selectors || {},
    last_sync_at: row.last_sync_at || null,
    next_sync_at: row.next_sync_at || null,
    last_sync_status: row.last_sync_status || "not_synced",
    last_sync_error: row.last_sync_error || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function publicCompetitorQuote(row = {}) {
  const metal = normalizePredictionMetal(row.metal || "gold");
  const purityCode = normalizePurityCode(row.purity_code || row.purityCode, metal);
  const pricePerGram = Number(row.price_per_gram || row.pricePerGram || 0);
  return {
    id: row.id || null,
    source_id: row.source_id || row.sourceId || null,
    competitor_name: row.competitor_name || row.competitorName || "",
    metal,
    purity_code: purityCode,
    purity_value: Number(row.purity_value ?? row.purityValue ?? purityValueForCode(metal, purityCode)),
    price_per_gram: pricePerGram,
    price_per_kg: Number(row.price_per_kg || row.pricePerKg || (pricePerGram * 1000) || 0),
    currency: normalizePredictionCurrency(row.currency || "EUR"),
    quote_date: row.quote_date || row.quoteDate || row.created_at || null,
    extraction_method: row.extraction_method || row.extractionMethod || "manual",
    confidence: ["low", "medium", "high", "bassa", "media", "alta"].includes(String(row.confidence || "").toLowerCase())
      ? String(row.confidence).toLowerCase()
      : "medium",
    ai_extracted: Boolean(row.ai_extracted || row.aiExtracted),
    ai_confidence: row.ai_confidence || row.aiConfidence || row.confidence || "medium",
    evidence_text: row.evidence_text || row.evidenceText || "",
    quote_type: row.quote_type || row.quoteType || "customer_buyback",
    extraction_run_id: row.extraction_run_id || row.extractionRunId || null,
    url: row.url || "",
    source_url: row.source_url || row.sourceUrl || row.url || "",
    website_url: row.website_url || row.websiteUrl || "",
    raw_payload: row.raw_payload || row.rawPayload || {},
    created_at: row.created_at || null
  };
}

async function seedDefaultCompetitorSources() {
  for (const source of DEFAULT_COMPETITOR_SOURCES) {
    await pool.query(
      `INSERT INTO competitor_quote_sources (
        name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
        notes, selectors, extraction_config, last_sync_status, next_sync_at, created_by, created_at, updated_at
      )
      SELECT $1::text,$2::text,$3::text,$4::boolean,$5::boolean,$6::int,
             $7::text,'{}'::jsonb,$8::jsonb,'not_synced',NOW(),NULL,NOW(),NOW()
      WHERE NOT EXISTS (
        SELECT 1
          FROM competitor_quote_sources
         WHERE LOWER(name) = LOWER($1::text)
      )`,
      [
        source.name,
        source.website_url,
        source.source_type,
        source.active,
        source.auto_sync_enabled,
        source.sync_interval_minutes,
        source.notes,
        sanitizeForPostgres(source.extraction_config)
      ]
    );
    await pool.query(
      `UPDATE competitor_quote_sources
          SET website_url = COALESCE(NULLIF(website_url, ''), $2::text),
              source_type = CASE
                WHEN LOWER(name) = LOWER('Oro Express') THEN $6::text
                WHEN LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro')) THEN $6::text
                WHEN LOWER(name) = LOWER('Amico Oro') THEN $6::text
                WHEN LOWER(name) = LOWER('Pronto Gold') THEN $6::text
                WHEN LOWER(name) = LOWER('Banco Preziosi') THEN $6::text
                WHEN LOWER(name) = LOWER('Bordin') THEN $6::text
                WHEN LOWER(name) = LOWER('Gold Standard') THEN $6::text
                WHEN LOWER(name) = LOWER('Oro in Euro') THEN $6::text
                WHEN LOWER(name) = LOWER('Gruppo Oro 24K') THEN $6::text
                WHEN source_type IN ('manual', 'configured_page', 'oro_express_parser', 'oro_doro_parser', 'amico_oro_parser', 'pronto_gold_parser', 'banco_preziosi_parser', 'bordin_parser', 'gold_standard_parser', 'oro_in_euro_parser', 'gruppo_oro_24k_parser')
                 AND (notes IS NULL OR notes = '' OR notes ILIKE '%Competitor preconfigurato OroActive%') THEN $6::text
                ELSE source_type
              END,
              auto_sync_enabled = CASE
                WHEN LOWER(name) = LOWER('Oro Express') THEN true
                WHEN LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro')) THEN true
                WHEN LOWER(name) = LOWER('Amico Oro') THEN true
                WHEN LOWER(name) = LOWER('Pronto Gold') THEN true
                WHEN LOWER(name) = LOWER('Banco Preziosi') THEN true
                WHEN LOWER(name) = LOWER('Bordin') THEN true
                WHEN LOWER(name) = LOWER('Gold Standard') THEN true
                WHEN LOWER(name) = LOWER('Oro in Euro') THEN true
                WHEN LOWER(name) = LOWER('Gruppo Oro 24K') THEN true
                ELSE COALESCE(auto_sync_enabled, true)
              END,
              sync_interval_minutes = CASE
                WHEN LOWER(name) = LOWER('Oro Express') THEN $3::int
                WHEN LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro')) THEN $3::int
                WHEN LOWER(name) = LOWER('Amico Oro') THEN $3::int
                WHEN LOWER(name) = LOWER('Pronto Gold') THEN $3::int
                WHEN LOWER(name) = LOWER('Banco Preziosi') THEN $3::int
                WHEN LOWER(name) = LOWER('Bordin') THEN $3::int
                WHEN LOWER(name) = LOWER('Gold Standard') THEN $3::int
                WHEN LOWER(name) = LOWER('Oro in Euro') THEN $3::int
                WHEN LOWER(name) = LOWER('Gruppo Oro 24K') THEN $3::int
                ELSE COALESCE(sync_interval_minutes, $3::int)
              END,
              extraction_config = CASE
                WHEN LOWER(name) IN (LOWER('Bordin'), LOWER('Gold Standard'), LOWER('Oro in Euro'), LOWER('Pronto Gold'), LOWER('Gruppo Oro 24K')) THEN COALESCE(extraction_config, '{}'::jsonb) || $4::jsonb
                WHEN extraction_config IS NULL OR extraction_config = '{}'::jsonb THEN $4::jsonb
                ELSE extraction_config
              END,
              last_sync_status = CASE
                WHEN last_sync_status IS NULL OR last_sync_status IN ('', 'manual_required', 'not_synced') THEN 'not_synced'
                ELSE last_sync_status
              END,
              next_sync_at = COALESCE(next_sync_at, NOW()),
              notes = CASE
                WHEN notes IS NULL OR notes = '' OR notes ILIKE '%Competitor preconfigurato OroActive%' THEN $5::text
                ELSE notes
              END,
              updated_at = NOW()
        WHERE (
            LOWER(name) = LOWER($1::text)
            OR (LOWER($1::text) = LOWER('Oro D''Oro') AND LOWER(name) = LOWER('Oro D''oro'))
          )
          AND (
            notes IS NULL
            OR notes = ''
            OR notes ILIKE '%Competitor preconfigurato OroActive%'
            OR website_url = $2::text
            OR LOWER(name) IN (
              LOWER('Oro Express'),
              LOWER('Oro D''Oro'),
              LOWER('Oro D''oro'),
              LOWER('Amico Oro'),
              LOWER('Pronto Gold'),
              LOWER('Banco Preziosi'),
              LOWER('Bordin'),
              LOWER('Gold Standard'),
              LOWER('Oro in Euro'),
              LOWER('Gruppo Oro 24K')
            )
          )`,
      [
        source.name,
        source.website_url,
        source.sync_interval_minutes,
        sanitizeForPostgres(source.extraction_config),
        source.notes,
        source.source_type
      ]
    );
  }
  await pool.query(
    `UPDATE competitor_quote_sources
        SET active = false,
            auto_sync_enabled = false,
            last_sync_status = 'disabled',
            next_sync_at = NULL,
            last_sync_error = 'Competitor rimosso dal confronto OroActive',
            updated_at = NOW()
      WHERE LOWER(name) = LOWER('Banco Preziosi')`
  ).catch(() => {});
}

function defaultOroExpressExtractionRules(source = {}) {
  const pageUrl = source.website_url || oroExpressUrl;
  return [
    {
      field_key: "gold_24kt",
      label: "Oro puro",
      metal: "gold",
      purity_code: "24kt",
      purity_value: 1,
      anchor_text: "oro puro",
      regex_pattern: "oro\\s+puro[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"
    },
    {
      field_key: "gold_18kt",
      label: "Oro usato",
      metal: "gold",
      purity_code: "18kt",
      purity_value: 0.75,
      anchor_text: "oro usato",
      regex_pattern: "oro\\s+usato[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"
    },
    {
      field_key: "silver_999",
      label: "Argento puro",
      metal: "silver",
      purity_code: "999",
      purity_value: 0.999,
      anchor_text: "argento puro",
      regex_pattern: "argento\\s+puro[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"
    },
    {
      field_key: "silver_used_generic",
      label: "Argento usato",
      metal: "silver",
      purity_code: "used_generic",
      purity_value: null,
      anchor_text: "argento usato",
      regex_pattern: "argento\\s+usato[\\s\\S]{0,180}?([0-9]+[,.]?[0-9]*)\\s*€\\s*/\\s*gr"
    }
  ].map((rule) => ({
    ...rule,
    competitor_name: source.name || "Oro Express",
    source_id: source.id || null,
    page_url: pageUrl,
    unit: "EUR/g",
    extraction_method: "anchor_regex",
    required: true,
    active: true
  }));
}

function defaultOroDOroExtractionRules(source = {}) {
  const pageUrl = source.website_url || oroDOroUrl;
  const rows = [
    ["oro_doro_gold_24kt", "ORO 24kt", "gold", "24kt", 1, "ORO 24kt", "ORO\\s*(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)[\\s\\S]{0,40}?24\\s*(?:kt|k)"],
    ["oro_doro_gold_22kt", "ORO 22kt", "gold", "22kt", 22 / 24, "ORO 22KT", "ORO\\s*22\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_gold_21kt", "ORO 21kt", "gold", "21kt", 21 / 24, "ORO 21KT", "ORO\\s*21\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_gold_20kt", "ORO 20kt", "gold", "20kt", 20 / 24, "ORO 20KT", "ORO\\s*20\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_gold_18kt", "ORO 18kt", "gold", "18kt", 0.75, "ORO 18KT", "ORO\\s*18\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_gold_14kt", "ORO 14kt", "gold", "14kt", 14 / 24, "ORO 14KT", "ORO\\s*14\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_gold_9kt", "ORO 9kt", "gold", "9kt", 9 / 24, "ORO 9KT", "ORO\\s*9\\s*(?:kt|k)[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_silver_999", "ARGENTO 999", "silver", "999", 0.999, "ARGENTO 999", "ARGENTO\\s*(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)[\\s\\S]{0,40}?999"],
    ["oro_doro_silver_925", "ARGENTO 925", "silver", "925", 0.925, "ARGENTO 925", "ARGENTO\\s*925[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"],
    ["oro_doro_silver_800", "ARGENTO 800", "silver", "800", 0.8, "ARGENTO 800", "ARGENTO\\s*800[\\s\\S]{0,90}?(?:€\\s*)?([0-9]+[,.]?[0-9]*)\\s*(?:€\\s*)?\\/\\s*(?:g|gr)"]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Oro D'Oro",
    source_id: source.id || null,
    page_url: pageUrl,
    unit: "EUR/g",
    extraction_method: "anchor_regex",
    required: true,
    active: true
  }));
}

function defaultAmicoOroExtractionRules(source = {}) {
  const pageUrl = source.website_url || amicoOroUrl;
  return [
    {
      field_key: "amico_oro_gold_24kt",
      label: "24K al gr",
      metal: "gold",
      purity_code: "24kt",
      purity_value: 1,
      anchor_text: "24K al gr",
      regex_pattern: "24K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"
    },
    {
      field_key: "amico_oro_gold_18kt",
      label: "18K al gr",
      metal: "gold",
      purity_code: "18kt",
      purity_value: 0.75,
      anchor_text: "18K al gr",
      regex_pattern: "18K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"
    },
    {
      field_key: "amico_oro_gold_14kt",
      label: "14K al gr",
      metal: "gold",
      purity_code: "14kt",
      purity_value: 14 / 24,
      anchor_text: "14K al gr",
      regex_pattern: "14K\\s*al\\s*gr\\s*=\\s*([0-9]+[,.]?[0-9]*)\\s*€"
    }
  ].map((rule) => ({
    ...rule,
    competitor_name: source.name || "Amico Oro",
    source_id: source.id || null,
    page_url: pageUrl,
    unit: "EUR/g",
    extraction_method: "anchor_regex",
    required: true,
    active: true
  }));
}

function defaultProntoGoldExtractionRules(source = {}) {
  const pageUrl = source.extraction_config?.quote_url || source.extraction_config?.quoteUrl || prontoGoldQuoteUrl || source.website_url || prontoGoldUrl;
  const rows = [
    ["pronto_gold_reference_gold", "Valore dell'ORO sulle Borse internazionali", "gold", "24kt", 1, "Valore dell'ORO", "EUR/g", "Valore\\s+dell[’']ORO[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "reference_market_gold_price"],
    ["pronto_gold_gold_24kt_buy", "ORO PURO 24k Acquisto", "gold", "24kt", 1, "ORO PURO 24k", "EUR/g", "ORO\\s+PURO\\s*24k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"],
    ["pronto_gold_gold_24kt_sell", "ORO PURO 24k Vendita", "gold", "24kt", 1, "ORO PURO 24k", "EUR/g", "ORO\\s+PURO\\s*24k[\\s\\S]{0,220}?Vendita\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "sell_price"],
    ["pronto_gold_gold_18kt_range", "Compro ORO usato 18k da/a", "gold", "18kt", 0.75, "Compro ORO usato 18k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*18k[\\s\\S]{0,160}?da\\s*([0-9]+[,.]?[0-9]*)[\\s\\S]{0,120}?a\\s*([0-9]+[,.]?[0-9]*)", "customer_buyback"],
    ["pronto_gold_gold_14kt", "Compro ORO usato 14k", "gold", "14kt", 14 / 24, "Compro ORO usato 14k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*14k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"],
    ["pronto_gold_gold_9kt", "Compro ORO usato 9k", "gold", "9kt", 9 / 24, "Compro ORO usato 9k", "EUR/g", "Compro\\s+ORO\\s+usato\\s*9k[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"],
    ["pronto_gold_reference_silver", "Valore dell'ARGENTO sulle Borse internazionali", "silver", "999", 0.999, "Valore dell'ARGENTO", "EUR/g", "Valore\\s+dell[’']ARGENTO[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "reference_market_silver_price"],
    ["pronto_gold_silver_999_buy", "ARGENTO PURO Acquisto", "silver", "999", 0.999, "ARGENTO PURO", "EUR/g", "ARGENTO\\s+PURO[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"],
    ["pronto_gold_silver_999_sell", "ARGENTO PURO Vendita", "silver", "999", 0.999, "ARGENTO PURO", "EUR/g", "ARGENTO\\s+PURO[\\s\\S]{0,220}?Vendita\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "sell_price"],
    ["pronto_gold_silver_925", "Compro ARGENTO usato 925", "silver", "925", 0.925, "Compro ARGENTO usato 925", "EUR/g", "Compro\\s+ARGENTO\\s+usato\\s*925[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"],
    ["pronto_gold_silver_800", "Compro ARGENTO usato 800", "silver", "800", 0.8, "Compro ARGENTO usato 800", "EUR/g", "Compro\\s+ARGENTO\\s+usato\\s*800[\\s\\S]{0,160}?Acquisto\\s*([0-9]+[,.]?[0-9]*)\\s*(?:Euro|Eur|€)", "customer_buyback"]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, unit, regex_pattern, quote_type]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Pronto Gold",
    source_id: source.id || null,
    page_url: pageUrl,
    unit,
    extraction_method: "anchor_regex",
    quote_type,
    required: true,
    active: true
  }));
}

function defaultBancoPreziosiExtractionRules(source = {}) {
  const pageUrl = source.extraction_config?.quote_url || source.extraction_config?.quoteUrl || bancoPreziosiQuoteUrl || source.website_url || bancoPreziosiUrl;
  return [
    {
      field_key: "banco_preziosi_gold_24kt_reference",
      label: "Quotazione ufficiale oro",
      metal: "gold",
      purity_code: "24kt",
      purity_value: 1,
      anchor_text: "QUOTAZIONE UFFICIALE ORO",
      unit: "EUR/g",
      regex_pattern: "QUOTAZIONE\\s+UFFICIALE\\s+ORO[\\s\\S]{0,120}?euro\\s*([0-9]+[,.]?[0-9]*)\\s*al\\s*grammo"
    },
    {
      field_key: "banco_preziosi_gold_18kt",
      label: "Acquistiamo oro 18K",
      metal: "gold",
      purity_code: "18kt",
      purity_value: 0.75,
      anchor_text: "ACQUISTIAMO ORO 18K",
      unit: "EUR/g",
      regex_pattern: "ACQUISTIAMO\\s+ORO\\s+18K[\\s\\S]{0,120}?euro\\s*([0-9]+[,.]?[0-9]*)\\s*al\\s*grammo"
    },
    {
      field_key: "banco_preziosi_silver_925",
      label: "Argento 925",
      metal: "silver",
      purity_code: "925",
      purity_value: 0.925,
      anchor_text: "ARGENTO 925",
      unit: "EUR/kg",
      regex_pattern: "ARGENTO\\s*925[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)\\s*al\\s*KG"
    },
    {
      field_key: "banco_preziosi_silver_800",
      label: "Argento 800",
      metal: "silver",
      purity_code: "800",
      purity_value: 0.8,
      anchor_text: "ARGENTO 800",
      unit: "EUR/kg",
      regex_pattern: "ARGENTO\\s*800[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)\\s*al\\s*Kg"
    }
  ].map((rule) => ({
    ...rule,
    competitor_name: source.name || "Banco Preziosi",
    source_id: source.id || null,
    page_url: pageUrl,
    extraction_method: "anchor_regex",
    required: true,
    active: true
  }));
}

function defaultBordinExtractionRules(source = {}) {
  const pageUrl = source.website_url || bordinUrl;
  const rows = [
    [
      "bordin_gold_24kt",
      "Oro 24kt - 999,9‰",
      "gold",
      "24kt",
      0.9999,
      "Oro 24kt",
      "Oro\\s*24\\s*(?:kt|k)[\\s\\S]{0,120}?999[,.]9\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ],
    [
      "bordin_gold_18kt",
      "Oro 18kt - 750‰",
      "gold",
      "18kt",
      0.75,
      "Oro 18kt",
      "Oro\\s*18\\s*(?:kt|k)[\\s\\S]{0,120}?750\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ],
    [
      "bordin_gold_14kt",
      "Oro 14kt - 585‰",
      "gold",
      "14kt",
      0.585,
      "Oro 14kt",
      "Oro\\s*14\\s*(?:kt|k)[\\s\\S]{0,120}?585\\s*(?:‰|per\\s*mille|\\/\\s*1000)[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ],
    [
      "bordin_silver_999",
      "Argento 999‰",
      "silver",
      "999",
      0.999,
      "Argento 999",
      "Argento\\s*999\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ],
    [
      "bordin_silver_925",
      "Argento 925‰",
      "silver",
      "925",
      0.925,
      "Argento 925",
      "Argento\\s*925\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ],
    [
      "bordin_silver_800",
      "Argento 800‰",
      "silver",
      "800",
      0.8,
      "Argento 800",
      "Argento\\s*800\\s*(?:‰|per\\s*mille|\\/\\s*1000)?[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/\\s*(?:gr|g)"
    ]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Bordin",
    source_id: source.id || null,
    page_url: pageUrl,
    unit: "EUR/g",
    extraction_method: "anchor_regex",
    required: true,
    active: true
  }));
}

function defaultGoldStandardExtractionRules(source = {}) {
  const pageUrl = source.website_url || goldStandardUrl;
  const rows = [
    [
      "gold_standard_gold_24kt_reference",
      "Quotazione dell'oro in borsa",
      "gold",
      "24kt",
      1,
      "Quotazione dell'oro in borsa",
      "EUR/g",
      "Quotazione\\s+dell[’']oro\\s+in\\s+borsa[\\s\\S]{0,120}?€\\s*([0-9]+[,.]?[0-9]*)",
      "reference_market_gold_price"
    ],
    [
      "gold_standard_gold_18kt_buyback",
      "Acquistiamo ORO 18K prezzo MIN",
      "gold",
      "18kt",
      0.75,
      "Acquistiamo ORO 18K",
      "EUR/g",
      "Acquistiamo\\s+ORO\\s*18\\s*K[\\s\\S]{0,120}?prezzo\\s*MIN[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)",
      "customer_buyback"
    ],
    [
      "gold_standard_gold_24kt_buyback",
      "Acquistiamo ORO 24K al prezzo MIN",
      "gold",
      "24kt",
      1,
      "Acquistiamo ORO 24K",
      "EUR/g",
      "Acquistiamo\\s+ORO\\s*24\\s*K[\\s\\S]{0,120}?prezzo\\s*MIN[\\s\\S]{0,80}?€\\s*([0-9]+[,.]?[0-9]*)",
      "customer_buyback"
    ]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, unit, regex_pattern, quote_type]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Gold Standard",
    source_id: source.id || null,
    page_url: pageUrl,
    unit,
    extraction_method: "anchor_regex",
    quote_type,
    required: true,
    active: true
  }));
}

function defaultOroInEuroExtractionRules(source = {}) {
  const pageUrl = source.website_url || oroInEuroUrl;
  const rows = [
    [
      "oro_in_euro_gold_18kt",
      "Oro 750/1000",
      "gold",
      "18kt",
      0.75,
      "Oro 750/1000",
      "EUR/g",
      "Oro\\s*750\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"
    ],
    [
      "oro_in_euro_gold_24kt",
      "Oro 999/1000",
      "gold",
      "24kt",
      0.999,
      "Oro 999/1000",
      "EUR/g",
      "Oro\\s*999\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"
    ],
    [
      "oro_in_euro_silver_999",
      "Argento 999/1000",
      "silver",
      "999",
      0.999,
      "Argento 999/1000",
      "EUR/g",
      "Argento\\s*999\\s*\\/\\s*1000[\\s\\S]{0,120}?([0-9]+[,.]?[0-9]*)\\s*€\\s*\\/?\\s*(?:Grammo|grammo|g|gr)"
    ]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, unit, regex_pattern]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Oro in Euro",
    source_id: source.id || null,
    page_url: pageUrl,
    unit,
    extraction_method: "anchor_regex",
    quote_type: "customer_buyback",
    required: true,
    active: true
  }));
}

function defaultGruppoOro24kExtractionRules(source = {}) {
  const pageUrl = source.website_url || gruppoOro24kUrl;
  const rows = [
    [
      "gruppo_oro_24k_gold_24kt",
      "ORO 24 Carati",
      "gold",
      "24kt",
      1,
      "ORO 24 Carati",
      "ORO\\s*24\\s*Carati[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:€|eur|euro)?\\s*\\/?\\s*(?:gr\\.?|g|grammo|grammi)"
    ],
    [
      "gruppo_oro_24k_gold_18kt",
      "ORO 18 Carati",
      "gold",
      "18kt",
      0.75,
      "ORO 18 Carati",
      "ORO\\s*18\\s*Carati[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:€|eur|euro)?\\s*\\/?\\s*(?:gr\\.?|g|grammo|grammi)"
    ],
    [
      "gruppo_oro_24k_silver_999",
      "Argento 999",
      "silver",
      "999",
      0.999,
      "Argento 999",
      "Argento\\s*999[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:€|eur|euro)?\\s*\\/?\\s*(?:gr\\.?|g|grammo|grammi)"
    ],
    [
      "gruppo_oro_24k_silver_800",
      "Argento 800",
      "silver",
      "800",
      0.8,
      "Argento 800",
      "Argento\\s*800[\\s\\S]{0,160}?([0-9]+[,.]?[0-9]*)\\s*(?:€|eur|euro)?\\s*\\/?\\s*(?:gr\\.?|g|grammo|grammi)"
    ]
  ];
  return rows.map(([field_key, label, metal, purity_code, purity_value, anchor_text, regex_pattern]) => ({
    field_key,
    label,
    metal,
    purity_code,
    purity_value,
    anchor_text,
    regex_pattern,
    competitor_name: source.name || "Gruppo Oro 24K",
    source_id: source.id || null,
    page_url: pageUrl,
    unit: "EUR/g",
    extraction_method: "anchor_regex",
    quote_type: "customer_buyback",
    required: true,
    active: true
  }));
}

function publicCompetitorExtractionRule(row = {}) {
  const metal = normalizePredictionMetal(row.metal || "gold");
  const purityCode = normalizePurityCode(row.purity_code || row.purityCode, metal);
  return {
    id: row.id || null,
    source_id: row.source_id || row.sourceId || null,
    competitor_name: row.competitor_name || row.competitorName || "",
    page_url: row.page_url || row.pageUrl || "",
    field_key: row.field_key || row.fieldKey || "",
    label: row.label || "",
    metal,
    purity_code: purityCode,
    purity_value: row.purity_value === null || row.purity_value === undefined || row.purityValue === null
      ? null
      : Number(row.purity_value ?? row.purityValue),
    unit: row.unit || "EUR/g",
    anchor_text: row.anchor_text || row.anchorText || "",
    css_selector: row.css_selector || row.cssSelector || "",
    xpath_selector: row.xpath_selector || row.xpathSelector || "",
    regex_pattern: row.regex_pattern || row.regexPattern || "",
    extraction_method: row.extraction_method || row.extractionMethod || "anchor_regex",
    required: row.required !== false,
    active: row.active !== false,
    last_test_status: row.last_test_status || row.lastTestStatus || "not_tested",
    last_test_value: row.last_test_value === null || row.last_test_value === undefined ? null : Number(row.last_test_value),
    last_test_evidence: row.last_test_evidence || "",
    last_test_at: row.last_test_at || null,
    last_verified_by: row.last_verified_by || null,
    last_verified_at: row.last_verified_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function normalizeCompetitorExtractionRule(input = {}, source = {}) {
  const metal = normalizePredictionMetal(input.metal || "gold");
  const purityCode = normalizePurityCode(input.purity_code || input.purityCode || "", metal);
  const rawPurity = input.purity_value ?? input.purityValue;
  const purityValue = rawPurity === "" || rawPurity === null || rawPurity === undefined
    ? (purityCode === "used_generic" ? null : purityValueForCode(metal, purityCode))
    : Number(rawPurity);
  const fieldKey = String(input.field_key || input.fieldKey || `${metal}_${purityCode}`).trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, "_").slice(0, 80);
  return {
    id: input.id || null,
    source_id: source.id || input.source_id || input.sourceId || null,
    competitor_name: String(input.competitor_name || input.competitorName || source.name || "").trim().slice(0, 160),
    page_url: String(input.page_url || input.pageUrl || source.website_url || "").trim().slice(0, 800),
    field_key: fieldKey,
    label: String(input.label || fieldKey).trim().slice(0, 120),
    metal,
    purity_code: purityCode,
    purity_value: Number.isFinite(purityValue) ? purityValue : null,
    unit: String(input.unit || "EUR/g").trim().slice(0, 20) || "EUR/g",
    anchor_text: String(input.anchor_text || input.anchorText || "").trim().slice(0, 250),
    css_selector: String(input.css_selector || input.cssSelector || "").trim().slice(0, 300),
    xpath_selector: String(input.xpath_selector || input.xpathSelector || "").trim().slice(0, 500),
    regex_pattern: String(input.regex_pattern || input.regexPattern || "").trim().slice(0, 900),
    extraction_method: ["css_selector", "xpath_selector", "anchor_regex", "ai_guided_fallback"].includes(String(input.extraction_method || input.extractionMethod || "anchor_regex").toLowerCase())
      ? String(input.extraction_method || input.extractionMethod || "anchor_regex").toLowerCase()
      : "anchor_regex",
    required: input.required !== false,
    active: input.active !== false
  };
}

async function seedDefaultCompetitorExtractionRules() {
  const inserted = [];
  const ruleSets = [
    { source: await getOroExpressSource().catch(() => null), rulesFor: defaultOroExpressExtractionRules },
    { source: await getOroDOroSource().catch(() => null), rulesFor: defaultOroDOroExtractionRules },
    { source: await getAmicoOroSource().catch(() => null), rulesFor: defaultAmicoOroExtractionRules },
    { source: await getProntoGoldSource().catch(() => null), rulesFor: defaultProntoGoldExtractionRules },
    { source: await getBordinSource().catch(() => null), rulesFor: defaultBordinExtractionRules },
    { source: await getGoldStandardSource().catch(() => null), rulesFor: defaultGoldStandardExtractionRules },
    { source: await getOroInEuroSource().catch(() => null), rulesFor: defaultOroInEuroExtractionRules },
    { source: await getGruppoOro24kSource().catch(() => null), rulesFor: defaultGruppoOro24kExtractionRules }
  ];
  for (const { source, rulesFor } of ruleSets) {
    if (!source?.id) continue;
    for (const rule of rulesFor(source)) {
      const result = await pool.query(
        `INSERT INTO competitor_extraction_rules (
          source_id, competitor_name, page_url, field_key, label, metal, purity_code, purity_value,
          unit, anchor_text, css_selector, xpath_selector, regex_pattern, extraction_method,
          required, active, created_at, updated_at
        ) VALUES (
          $1::bigint,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::numeric,
          $9::text,$10::text,$11::text,$12::text,$13::text,$14::text,
          $15::boolean,$16::boolean,NOW(),NOW()
        )
        ON CONFLICT (source_id, field_key) DO NOTHING
        RETURNING *`,
        [
          rule.source_id,
          rule.competitor_name,
          rule.page_url,
          rule.field_key,
          rule.label,
          rule.metal,
          rule.purity_code,
          rule.purity_value,
          rule.unit,
          rule.anchor_text,
          rule.css_selector || "",
          rule.xpath_selector || "",
          rule.regex_pattern,
          rule.extraction_method,
          rule.required,
          rule.active
        ]
      );
      if (result.rows[0]) inserted.push(publicCompetitorExtractionRule(result.rows[0]));
    }
  }
  return inserted;
}

async function listCompetitorExtractionRules({ sourceId = null, competitorName = "", activeOnly = false } = {}) {
  const conditions = [];
  const params = [];
  if (sourceId) {
    params.push(sourceId);
    conditions.push(`source_id = $${params.length}::bigint`);
  }
  if (competitorName) {
    params.push(String(competitorName));
    conditions.push(`LOWER(competitor_name) = LOWER($${params.length}::text)`);
  }
  conditions.push(hiddenCompetitorSql("competitor_name"));
  if (activeOnly) conditions.push("active = true");
  const result = await pool.query(
    `SELECT *
       FROM competitor_extraction_rules
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY competitor_name ASC, source_id ASC, field_key ASC`,
    params
  );
  return result.rows.map(publicCompetitorExtractionRule);
}

async function saveCompetitorExtractionRules(sourceId, rules = [], user = {}, req = null) {
  const source = publicCompetitorSource((await pool.query("SELECT * FROM competitor_quote_sources WHERE id = $1::bigint LIMIT 1", [sourceId])).rows[0] || {});
  if (!source.id) throw new Error("Fonte competitor non trovata");
  if (isHiddenCompetitorName(source.name)) throw new Error("Banco Preziosi è stato rimosso dai competitor OroActive");
  const saved = [];
  for (const input of Array.isArray(rules) ? rules : []) {
    const rule = normalizeCompetitorExtractionRule(input, source);
    if (!rule.field_key || !rule.page_url) continue;
    const params = [
      rule.source_id,
      rule.competitor_name,
      rule.page_url,
      rule.field_key,
      rule.label,
      rule.metal,
      rule.purity_code,
      rule.purity_value,
      rule.unit,
      rule.anchor_text,
      rule.css_selector,
      rule.xpath_selector,
      rule.regex_pattern,
      rule.extraction_method,
      rule.required,
      rule.active,
      user?.id || null
    ];
    let result = null;
    if (rule.id) {
      result = await pool.query(
        `UPDATE competitor_extraction_rules
            SET competitor_name = $2::text,
                page_url = $3::text,
                field_key = $4::text,
                label = $5::text,
                metal = $6::text,
                purity_code = $7::text,
                purity_value = $8::numeric,
                unit = $9::text,
                anchor_text = $10::text,
                css_selector = $11::text,
                xpath_selector = $12::text,
                regex_pattern = $13::text,
                extraction_method = $14::text,
                required = $15::boolean,
                active = $16::boolean,
                last_verified_by = $17::bigint,
                last_verified_at = NOW(),
                updated_at = NOW()
          WHERE id = $18::bigint
            AND source_id = $1::bigint
          RETURNING *`,
        [...params, rule.id]
      );
    }
    if (!result?.rows[0]) {
      result = await pool.query(
        `INSERT INTO competitor_extraction_rules (
          source_id, competitor_name, page_url, field_key, label, metal, purity_code, purity_value,
          unit, anchor_text, css_selector, xpath_selector, regex_pattern, extraction_method,
          required, active, last_verified_by, last_verified_at, created_at, updated_at
        ) VALUES (
          $1::bigint,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::numeric,
          $9::text,$10::text,$11::text,$12::text,$13::text,$14::text,
          $15::boolean,$16::boolean,$17::bigint,NOW(),NOW(),NOW()
        )
        ON CONFLICT (source_id, field_key) DO UPDATE
          SET competitor_name = EXCLUDED.competitor_name,
              page_url = EXCLUDED.page_url,
              label = EXCLUDED.label,
              metal = EXCLUDED.metal,
              purity_code = EXCLUDED.purity_code,
              purity_value = EXCLUDED.purity_value,
              unit = EXCLUDED.unit,
              anchor_text = EXCLUDED.anchor_text,
              css_selector = EXCLUDED.css_selector,
              xpath_selector = EXCLUDED.xpath_selector,
              regex_pattern = EXCLUDED.regex_pattern,
              extraction_method = EXCLUDED.extraction_method,
              required = EXCLUDED.required,
              active = EXCLUDED.active,
              last_verified_by = EXCLUDED.last_verified_by,
              last_verified_at = NOW(),
              updated_at = NOW()
        RETURNING *`,
        params
      );
    }
    saved.push(publicCompetitorExtractionRule(result.rows[0]));
  }
  if (saved.length) {
    await pool.query(
      `UPDATE competitor_quote_sources
          SET source_type = CASE
                WHEN source_type IN ('manual', 'csv_import') THEN 'configured_page'
                ELSE source_type
              END,
              auto_sync_enabled = true,
              next_sync_at = COALESCE(next_sync_at, NOW()),
              updated_at = NOW()
        WHERE id = $1::bigint`,
      [source.id]
    );
  }
  void writeAuditLog({
    req,
    user,
    action: "competitor_extraction_rules_updated",
    entityType: "competitor_quote_source",
    entityId: source.id,
    entityLabel: source.name,
    afterData: { rules: saved.length }
  });
  return saved;
}

async function saveExtractionTestResult(rule = {}, result = {}) {
  if (!rule?.id) return null;
  const status = result.status || "not_found";
  const value = result.value === null || result.value === undefined ? null : Number(result.value);
  const update = await pool.query(
    `UPDATE competitor_extraction_rules
        SET last_test_status = $1::text,
            last_test_value = $2::numeric,
            last_test_evidence = $3::text,
            last_test_at = NOW(),
            updated_at = NOW()
      WHERE id = $4::bigint
      RETURNING *`,
    [
      String(status).slice(0, 80),
      Number.isFinite(value) ? value : null,
      String(result.evidence_text || result.error || "").slice(0, 1200),
      rule.id
    ]
  );
  return update.rows[0] ? publicCompetitorExtractionRule(update.rows[0]) : null;
}

function publicExtractionTestResult(result = {}) {
  return {
    rule: publicCompetitorExtractionRule(result.rule || {}),
    status: result.status || "not_found",
    value: result.value === null || result.value === undefined ? null : Number(result.value || 0),
    unit: result.unit || "EUR/g",
    evidence_text: result.evidence_text || "",
    method: result.method || "",
    confidence: result.confidence || "low",
    error: result.error || ""
  };
}

async function testCompetitorExtractionForSource(sourceId, user = {}, req = null, options = {}) {
  const source = publicCompetitorSource((await pool.query("SELECT * FROM competitor_quote_sources WHERE id = $1::bigint LIMIT 1", [sourceId])).rows[0] || {});
  if (!source.id) throw new Error("Fonte competitor non trovata");
  if (isHiddenCompetitorName(source.name)) throw new Error("Banco Preziosi è stato rimosso dai competitor OroActive");
  const rules = await listCompetitorExtractionRules({ sourceId: source.id, activeOnly: true });
  const result = await competitorExtractionTrainer.testCompetitorExtraction(source, rules, {
    forceAi: Boolean(options.forceAi)
  });
  for (const item of result.results || []) {
    await saveExtractionTestResult(item.rule, item).catch(() => null);
  }
  const saveResult = options.saveQuotes === false
    ? { saved: [], errors: [] }
    : await saveCompetitorQuotes(result.quotes || [], user);
  const status = saveResult.saved.length
    ? (result.status === "failed" ? "partial" : result.status)
    : result.status;
  const errorMessage = [result.error, ...saveResult.errors].filter(Boolean).join(" | ").slice(0, 1200);
  await updateCompetitorSourceSyncStatus(
    source.id,
    status === "not_configured" ? "manual_required" : status,
    new Date().toISOString(),
    errorMessage,
    nextCompetitorSyncDate(source)
  ).catch(() => {});
  void writeAuditLog({
    req,
    user,
    action: options.forceAi ? "competitor_extraction_ai_assisted_test" : "competitor_extraction_test",
    entityType: "competitor_quote_source",
    entityId: source.id,
    entityLabel: source.name,
    afterData: { status, quotes_saved: saveResult.saved.length, rules_tested: result.results?.length || 0 }
  });
  return {
    ok: true,
    source: { ...source, last_sync_status: status, last_sync_error: errorMessage },
    status,
    results: (result.results || []).map(publicExtractionTestResult),
    quotes_found: result.quotes?.length || 0,
    quotes_saved: saveResult.saved.length,
    saved_quotes: saveResult.saved,
    errors: saveResult.errors,
    message: saveResult.saved.length
      ? `Estrazione completata. Quotazioni salvate: ${saveResult.saved.length}.`
      : "Dato non rilevato: controlla anchor, selettore o regex."
  };
}

async function listCompetitorSources() {
  const result = await pool.query(`SELECT * FROM competitor_quote_sources WHERE ${hiddenCompetitorSql("name")} ORDER BY active DESC, name ASC`);
  return result.rows.map(publicCompetitorSource);
}

async function saveCompetitorSource(input = {}, user = {}, id = null) {
  const payload = {
    name: String(input.name || "").trim().slice(0, 120),
    website_url: String(input.website_url || input.websiteUrl || "").trim().slice(0, 500),
    source_type: ["manual", "csv_import", "api", "configured_page", "oro_express_parser", "oro_doro_parser", "amico_oro_parser", "pronto_gold_parser", "bordin_parser", "gold_standard_parser", "oro_in_euro_parser", "gruppo_oro_24k_parser"].includes(String(input.source_type || input.sourceType || "manual").toLowerCase())
      ? String(input.source_type || input.sourceType || "manual").toLowerCase()
      : "manual",
    active: input.active !== false,
    auto_sync_enabled: input.auto_sync_enabled ?? input.autoSyncEnabled ?? !["manual", "csv_import"].includes(String(input.source_type || input.sourceType || "manual").toLowerCase()),
    sync_interval_minutes: Math.min(Math.max(Number(input.sync_interval_minutes || input.syncIntervalMinutes || competitorAutoSyncIntervalMinutes), 15), 10080),
    notes: String(input.notes || "").trim().slice(0, 600),
    selectors: sanitizeForPostgres(input.selectors || {}),
    extraction_config: sanitizeForPostgres(input.extraction_config || input.extractionConfig || input.selectors || {})
  };
  if (!payload.name) throw new Error("Nome competitor obbligatorio");
  if (isHiddenCompetitorName(payload.name)) throw new Error("Banco Preziosi è stato rimosso dai competitor OroActive");
  if (!id) {
    const existing = await pool.query(
      "SELECT id FROM competitor_quote_sources WHERE LOWER(name) = LOWER($1::text) LIMIT 1",
      [payload.name]
    );
    if (existing.rows[0]?.id) id = existing.rows[0].id;
  }
  if (id) {
    const result = await pool.query(
      `UPDATE competitor_quote_sources
          SET name = $1::text,
              website_url = $2::text,
              source_type = $3::text,
              active = $4::boolean,
              auto_sync_enabled = $5::boolean,
              sync_interval_minutes = $6::int,
              notes = $7::text,
              selectors = $8::jsonb,
              extraction_config = $9::jsonb,
              next_sync_at = CASE
                WHEN $5::boolean THEN COALESCE(next_sync_at, NOW())
                ELSE NULL
              END,
              updated_at = NOW()
        WHERE id = $10::bigint
        RETURNING *`,
      [
        payload.name,
        payload.website_url,
        payload.source_type,
        payload.active,
        payload.auto_sync_enabled !== false,
        payload.sync_interval_minutes,
        payload.notes,
        payload.selectors,
        payload.extraction_config,
        id
      ]
    );
    if (!result.rows[0]) throw new Error("Fonte competitor non trovata");
    return publicCompetitorSource(result.rows[0]);
  }
  const result = await pool.query(
    `INSERT INTO competitor_quote_sources (
      name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
      notes, selectors, extraction_config, last_sync_status, next_sync_at, created_by, created_at, updated_at
    ) VALUES (
      $1::text,$2::text,$3::text,$4::boolean,$5::boolean,$6::int,
      $7::text,$8::jsonb,$9::jsonb,$10::text,NOW(),$11::bigint,NOW(),NOW()
    )
    RETURNING *`,
    [
      payload.name,
      payload.website_url,
      payload.source_type,
      payload.active,
      payload.auto_sync_enabled !== false,
      payload.sync_interval_minutes,
      payload.notes,
      payload.selectors,
      payload.extraction_config,
      payload.source_type === "manual" || payload.source_type === "csv_import" ? "manual_required" : "not_synced",
      user?.id || null
    ]
  );
  return publicCompetitorSource(result.rows[0]);
}

async function findCompetitorSourceByName(name = "") {
  const normalized = String(name || "").trim();
  if (!normalized) return null;
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER($1::text) LIMIT 1",
    [normalized]
  );
  return result.rows[0] || null;
}

async function ensureCompetitorSourceForQuote(input = {}, user = {}) {
  const competitorName = String(input.competitor_name || input.competitorName || "").trim().slice(0, 160);
  if (!competitorName) return null;
  if (isHiddenCompetitorName(competitorName)) throw new Error("Banco Preziosi è stato rimosso dai competitor OroActive");
  const existing = await findCompetitorSourceByName(competitorName);
  if (existing) return existing;
  const websiteUrl = String(input.website_url || input.websiteUrl || input.url || "").trim().slice(0, 500);
  if (!websiteUrl) return null;
  const result = await pool.query(
    `INSERT INTO competitor_quote_sources (
      name, website_url, source_type, active, auto_sync_enabled, sync_interval_minutes,
      notes, selectors, extraction_config, last_sync_status, created_by, created_at, updated_at
    ) VALUES (
      $1::text,$2::text,'manual',true,false,$3::int,
      'Fonte creata da quotazione competitor','{}'::jsonb,'{}'::jsonb,'manual_required',$4::bigint,NOW(),NOW()
    )
    RETURNING *`,
    [competitorName, websiteUrl, competitorAutoSyncIntervalMinutes, user?.id || null]
  );
  return result.rows[0] || null;
}

async function updateCompetitorSourceSyncStatus(id, status = "not_synced", syncAt = new Date().toISOString(), errorMessage = "", nextSyncAt = null) {
  if (!id) return;
  await pool.query(
    `UPDATE competitor_quote_sources
        SET last_sync_status = $1::text,
            last_sync_at = $2::timestamptz,
            last_sync_error = $3::text,
            next_sync_at = COALESCE($4::timestamptz, next_sync_at),
            updated_at = NOW()
      WHERE id = $5::bigint`,
    [String(status || "not_synced").slice(0, 80), syncAt, String(errorMessage || "").slice(0, 1200), nextSyncAt, id]
  );
}

async function deleteCompetitorSource(id) {
  const result = await pool.query(
    `UPDATE competitor_quote_sources
        SET active = false,
            updated_at = NOW()
      WHERE id = $1::bigint
      RETURNING *`,
    [id]
  );
  if (!result.rows[0]) throw new Error("Fonte competitor non trovata");
  return publicCompetitorSource(result.rows[0]);
}

async function insertCompetitorQuote(input = {}, user = {}) {
  const metal = normalizePredictionMetal(input.metal || "gold");
  const purityCode = normalizePurityCode(input.purity_code || input.purityCode, metal);
  const pricePerGram = Number(input.price_per_gram || input.pricePerGram || 0);
  const competitorName = String(input.competitor_name || input.competitorName || "").trim().slice(0, 160);
  if (!competitorName) throw new Error("Nome competitor obbligatorio");
  if (isHiddenCompetitorName(competitorName)) throw new Error("Banco Preziosi è stato rimosso dai competitor OroActive");
  if (!Number.isFinite(pricePerGram) || pricePerGram <= 0) throw new Error("Prezzo competitor non valido");
  const quoteType = ["customer_buyback", "reference_official_gold_price", "reference_market_gold_price", "reference_market_silver_price", "sell_price", "spot_price", "theoretical_price", "unknown"].includes(String(input.quote_type || input.quoteType || "customer_buyback").toLowerCase())
    ? String(input.quote_type || input.quoteType || "customer_buyback").toLowerCase()
    : "unknown";
  const source = input.source_id || input.sourceId
    ? { id: input.source_id || input.sourceId }
    : await ensureCompetitorSourceForQuote(input, user);
  const quoteDate = input.quote_date || input.quoteDate || new Date().toISOString();
  const aiConfidence = String(input.ai_confidence || input.aiConfidence || input.confidence || "medium").toLowerCase().slice(0, 20);
  const sourceUrl = String(input.source_url || input.sourceUrl || input.url || "").trim().slice(0, 500);
  const result = await pool.query(
    `INSERT INTO competitor_buyback_quotes (
      source_id, competitor_name, metal, purity_code, purity_value,
      price_per_gram, price_per_kg, currency, quote_date,
      extraction_method, confidence, url, source_url, raw_payload,
      ai_extracted, ai_confidence, evidence_text, quote_type, extraction_run_id,
      created_at
    ) VALUES (
      $1::bigint,$2::text,$3::text,$4::text,$5::numeric,$6::numeric,$7::numeric,$8::text,$9::timestamptz,
      $10::text,$11::text,$12::text,$13::text,$14::jsonb,
      $15::boolean,$16::text,$17::text,$18::text,$19::bigint,
      NOW()
    )
    RETURNING *`,
    [
      source?.id || null,
      competitorName,
      metal,
      purityCode,
      Number(input.purity_value ?? input.purityValue ?? purityValueForCode(metal, purityCode)),
      pricePerGram,
      Number(input.price_per_kg || input.pricePerKg || (pricePerGram * 1000)),
      normalizePredictionCurrency(input.currency || "EUR"),
      quoteDate,
      String(input.extraction_method || input.extractionMethod || "manual").slice(0, 40),
      String(input.confidence || "medium").toLowerCase().slice(0, 20),
      sourceUrl,
      sourceUrl,
      sanitizeForPostgres(input.raw_payload || input.rawPayload || { inserted_by: user?.id || null }),
      Boolean(input.ai_extracted || input.aiExtracted),
      aiConfidence,
      String(input.evidence_text || input.evidenceText || "").trim().slice(0, 1200),
      quoteType,
      input.extraction_run_id || input.extractionRunId || null
    ]
  );
  await updateCompetitorSourceSyncStatus(source?.id, "updated", quoteDate).catch(() => {});
  return publicCompetitorQuote(result.rows[0]);
}

async function listCompetitorQuotes({ metal = "", purityCode = "", competitorName = "", quoteType = "customer_buyback", currency = "EUR", days = 30, limit = 200 } = {}) {
  const conditions = ["currency = $1::text", "quote_date >= NOW() - ($2::int * INTERVAL '1 day')"];
  const params = [normalizePredictionCurrency(currency), Math.min(Math.max(Number(days || 30), 1), 365)];
  conditions.push(hiddenCompetitorSql("competitor_name"));
  const normalizedQuoteType = String(quoteType || "customer_buyback").toLowerCase();
  if (normalizedQuoteType && normalizedQuoteType !== "all") {
    params.push(normalizedQuoteType);
    conditions.push(`COALESCE(quote_type, 'customer_buyback') = $${params.length}::text`);
  }
  if (competitorName) {
    params.push(String(competitorName).trim());
    conditions.push(`LOWER(competitor_name) = LOWER($${params.length}::text)`);
  }
  if (metal) {
    params.push(normalizePredictionMetal(metal));
    conditions.push(`metal = $${params.length}::text`);
  }
  if (purityCode) {
    params.push(normalizePurityCode(purityCode, metal || "gold"));
    conditions.push(`purity_code = $${params.length}::text`);
  }
  params.push(Math.min(Math.max(Number(limit || 200), 1), 500));
  const result = await pool.query(
    `SELECT *
       FROM competitor_buyback_quotes
      WHERE ${conditions.join(" AND ")}
      ORDER BY quote_date DESC, created_at DESC
      LIMIT $${params.length}::int`,
    params
  );
  return result.rows.map(publicCompetitorQuote);
}

async function listAiCompetitorQuotes({ currency = "EUR", days = 30, limit = 200, validOnly = false } = {}) {
  const conditions = [
    "ai_extracted = true",
    "currency = $1::text",
    "quote_date >= NOW() - ($2::int * INTERVAL '1 day')",
    hiddenCompetitorSql("competitor_name")
  ];
  const params = [normalizePredictionCurrency(currency), Math.min(Math.max(Number(days || 30), 1), 365)];
  if (validOnly) {
    conditions.push("COALESCE(quote_type, 'customer_buyback') = 'customer_buyback'");
    conditions.push("LOWER(COALESCE(ai_confidence, confidence, 'medium')) IN ('medium', 'high', 'media', 'alta')");
  }
  params.push(Math.min(Math.max(Number(limit || 200), 1), 500));
  const result = await pool.query(
    `SELECT *
       FROM competitor_buyback_quotes
      WHERE ${conditions.join(" AND ")}
      ORDER BY quote_date DESC, created_at DESC
      LIMIT $${params.length}::int`,
    params
  );
  return result.rows.map(publicCompetitorQuote);
}

async function competitorQuoteStats({ metals = ["gold", "silver"], currency = "EUR", days = 30, hours = null } = {}) {
  const normalizedMetals = metals.map(normalizePredictionMetal).filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
  const lookbackHours = hours ? Math.min(Math.max(Number(hours || 24), 1), 24 * 365) : Math.min(Math.max(Number(days || 30), 1), 365) * 24;
  const result = await pool.query(
    `WITH filtered AS (
       SELECT *
         FROM competitor_buyback_quotes
        WHERE currency = $1::text
          AND metal = ANY($2::text[])
          AND quote_date >= NOW() - ($3::int * INTERVAL '1 hour')
          AND price_per_gram IS NOT NULL
          AND COALESCE(quote_type, 'customer_buyback') = 'customer_buyback'
          AND LOWER(COALESCE(ai_confidence, confidence, 'medium')) IN ('medium', 'high', 'media', 'alta')
          AND ${hiddenCompetitorSql("competitor_name")}
     ),
     ranked AS (
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY metal, purity_code
                ORDER BY price_per_gram DESC, quote_date DESC, created_at DESC
              ) AS competitor_rank
         FROM filtered
     )
     SELECT metal,
            purity_code,
            AVG(price_per_gram)::numeric AS competitor_avg_price,
            MIN(price_per_gram)::numeric AS competitor_min_price,
            MAX(price_per_gram)::numeric AS competitor_max_price,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_gram)::numeric AS competitor_median_price,
            COUNT(*)::int AS competitor_count,
            MAX(quote_date) AS competitor_last_update,
            MAX(CASE WHEN competitor_rank = 1 THEN competitor_name END) AS best_competitor_name,
            MAX(CASE WHEN competitor_rank = 1 THEN price_per_gram END)::numeric AS best_competitor_price
       FROM ranked
      GROUP BY metal, purity_code`,
    [normalizePredictionCurrency(currency), normalizedMetals, lookbackHours]
  );
  return Object.fromEntries(result.rows.map((row) => {
    const avg = Number(row.competitor_avg_price || 0);
    const max = Number(row.competitor_max_price || 0);
    return [`${row.metal}:${row.purity_code}`, {
      competitor_avg_price: avg,
      competitor_min_price: Number(row.competitor_min_price || 0),
      competitor_max_price: max,
      competitor_median_price: Number(row.competitor_median_price || 0),
      competitor_count: Number(row.competitor_count || 0),
      competitor_last_update: row.competitor_last_update || null,
      best_competitor_name: row.best_competitor_name || "",
      best_competitor_price: Number(row.best_competitor_price || max || 0)
    }];
  }));
}

function parseCompetitorCsv(csv = "") {
  const lines = String(csv || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

async function importCompetitorQuotesCsv(csv = "", user = {}) {
  const rows = parseCompetitorCsv(csv);
  const inserted = [];
  const errors = [];
  for (const [index, row] of rows.entries()) {
    try {
      inserted.push(await insertCompetitorQuote({
        competitor_name: row.competitor_name,
        website_url: row.website_url || row.url || "",
        metal: row.metal,
        purity_code: row.purity_code,
        price_per_gram: row.price_per_gram,
        currency: row.currency || "EUR",
        quote_date: row.quote_date || new Date().toISOString(),
        url: row.url || row.website_url || "",
        extraction_method: "csv_import",
        confidence: row.confidence || "medium",
        raw_payload: row
      }, user));
    } catch (error) {
      errors.push(`Riga ${index + 2}: ${error.message || "non valida"}`);
    }
  }
  return { inserted, errors };
}

function parseItalianPriceToNumber(value = "") {
  const raw = String(value || "").replace(/\u00a0/g, " ").replace(/[^\d,.\s]/g, "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/\s+/g, "");
  if (compact.includes(",")) {
    return Number(compact.replace(/\./g, "").replace(",", "."));
  }
  const dotParts = compact.split(".");
  if (dotParts.length > 2) return Number(compact.replace(/\./g, ""));
  if (dotParts.length === 2 && dotParts[1].length === 3 && dotParts[0].length <= 3) {
    return Number(compact.replace(/\./g, ""));
  }
  return Number(compact);
}

function normalizeUnit(value = "") {
  const text = String(value || "").toLowerCase();
  if (/kg|chilo|kilo|chilogram/.test(text)) return "kg";
  if (/g|gr|gramm/.test(text)) return "g";
  return "";
}

function getPurityValue(metal = "gold", purityCode = "") {
  return purityValueForCode(metal, purityCode);
}

function isReasonableCompetitorPrice(metal = "gold", pricePerGram = 0) {
  const price = Number(pricePerGram || 0);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (normalizePredictionMetal(metal) === "silver") return price >= 0.01 && price <= 20;
  return price >= 1 && price <= 250;
}

function stripHtmlForPriceExtraction(html = "") {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function competitorPurityPatterns(metal = "gold") {
  const normalizedMetal = normalizePredictionMetal(metal);
  if (normalizedMetal === "silver") {
    return [
      { code: "999", labels: ["argento\\s*puro", "\\b999\\b"] },
      { code: "925", labels: ["argento\\s*925", "\\b925\\b", "sterling"] },
      { code: "800", labels: ["argento\\s*800", "\\b800\\b"] }
    ].map((item) => ({ ...item, metal: "silver" }));
  }
  return [
    { code: "24kt", labels: ["oro\\s*puro", "\\b24\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "22kt", labels: ["\\b22\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "21kt", labels: ["\\b21\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "20kt", labels: ["\\b20\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "18kt", labels: ["\\b18\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "14kt", labels: ["\\b14\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "12kt", labels: ["\\b12\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "9kt", labels: ["\\b9\\s*(?:kt|k|carati|carato)\\b"] },
    { code: "6kt", labels: ["\\b6\\s*(?:kt|k|carati|carato)\\b"] }
  ].map((item) => ({ ...item, metal: "gold" }));
}

function extractPriceNearLabel(text = "", labelIndex = 0) {
  const start = Math.max(0, labelIndex - 160);
  const snippet = String(text || "").slice(start, labelIndex + 320);
  const priceRegex = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:€|eur|euro)?\s*(?:\/?\s*(kg|g|gr|grammo|grammi|chilogrammo|chilo|kilo)|euro\s+al\s+(grammo|chilogrammo|chilo|kilo))/gi;
  const matches = [...snippet.matchAll(priceRegex)];
  for (const match of matches) {
    const rawPrice = match[1];
    const unit = normalizeUnit(match[2] || match[3] || "");
    const number = parseItalianPriceToNumber(rawPrice);
    if (!number || !unit) continue;
    return {
      value: unit === "kg" ? number / 1000 : number,
      unit,
      raw: match[0]
    };
  }
  return null;
}

function extractQuotesFromText(text = "", source = {}, page = {}) {
  const normalizedText = stripHtmlForPriceExtraction(text);
  const metals = page.metal ? [normalizePredictionMetal(page.metal)] : ["gold", "silver"];
  const quotes = [];
  const seen = new Set();
  for (const metal of metals.filter((item) => ["gold", "silver"].includes(item))) {
    for (const pattern of competitorPurityPatterns(metal)) {
      for (const label of pattern.labels) {
        const labelRegex = new RegExp(label, "ig");
        const labelMatches = [...normalizedText.matchAll(labelRegex)].slice(0, 8);
        for (const match of labelMatches) {
          const price = extractPriceNearLabel(normalizedText, match.index || 0);
          if (!price || !isReasonableCompetitorPrice(metal, price.value)) continue;
          const key = `${metal}:${pattern.code}:${price.value.toFixed(4)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          quotes.push({
            source_id: source.id,
            competitor_name: source.name,
            metal,
            purity_code: pattern.code,
            purity_value: getPurityValue(metal, pattern.code),
            price_per_gram: price.value,
            price_per_kg: price.value * 1000,
            currency: normalizePredictionCurrency(page.currency || source.extraction_config?.currency || "EUR"),
            quote_date: new Date().toISOString(),
            extraction_method: "auto_html_regex",
            confidence: "medium",
            url: page.url || source.website_url,
            raw_payload: {
              label: match[0],
              price: price.raw,
              source_method: source.extraction_config?.method || "html_regex"
            }
          });
        }
      }
    }
  }
  return quotes;
}

function normalizeCompetitorQuote(rawQuote = {}, source = {}) {
  const metal = normalizePredictionMetal(rawQuote.metal || "gold");
  const purityCode = normalizePurityCode(rawQuote.purity_code || rawQuote.purityCode || rawQuote.label || "", metal);
  const unit = normalizeUnit(rawQuote.unit || rawQuote.price_unit || rawQuote.priceUnit || "");
  const rawPrice = rawQuote.price_per_gram || rawQuote.pricePerGram || rawQuote.price || rawQuote.value;
  const parsedPrice = Number(rawQuote.price_per_gram || rawQuote.pricePerGram || 0) || parseItalianPriceToNumber(rawPrice);
  const pricePerGram = unit === "kg"
    ? parsedPrice / 1000
    : Number(rawQuote.price_per_kg || rawQuote.pricePerKg || 0)
      ? Number(rawQuote.price_per_kg || rawQuote.pricePerKg) / 1000
      : parsedPrice;
  if (!isReasonableCompetitorPrice(metal, pricePerGram)) return null;
  return {
    source_id: rawQuote.source_id || rawQuote.sourceId || source.id || null,
    competitor_name: rawQuote.competitor_name || rawQuote.competitorName || source.name || "",
    metal,
    purity_code: purityCode,
    purity_value: Number(rawQuote.purity_value ?? rawQuote.purityValue ?? getPurityValue(metal, purityCode)),
    price_per_gram: pricePerGram,
    price_per_kg: pricePerGram * 1000,
    currency: normalizePredictionCurrency(rawQuote.currency || source.extraction_config?.currency || "EUR"),
    quote_date: rawQuote.quote_date || rawQuote.quoteDate || new Date().toISOString(),
    extraction_method: rawQuote.extraction_method || rawQuote.extractionMethod || "auto",
    confidence: rawQuote.confidence || "medium",
    url: rawQuote.url || source.website_url || "",
    source_url: rawQuote.source_url || rawQuote.sourceUrl || rawQuote.url || source.website_url || "",
    quote_type: rawQuote.quote_type || rawQuote.quoteType || "customer_buyback",
    ai_extracted: Boolean(rawQuote.ai_extracted || rawQuote.aiExtracted),
    ai_confidence: rawQuote.ai_confidence || rawQuote.aiConfidence || rawQuote.confidence || "medium",
    evidence_text: rawQuote.evidence_text || rawQuote.evidenceText || "",
    raw_payload: rawQuote.raw_payload || rawQuote.rawPayload || rawQuote
  };
}

async function fetchCompetitorPage(url = "") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), competitorAutoSyncTimeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": competitorAutoSyncUserAgent
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {
      contentType: response.headers.get("content-type") || "",
      body: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function extractCompetitorQuotes(source = {}) {
  if (isHiddenCompetitorName(source.name)) {
    return { quotes: [], status: "disabled", error: "Competitor rimosso dal confronto OroActive" };
  }
  const config = source.extraction_config || source.extractionConfig || {};
  const method = String(config.method || source.source_type || "manual_fallback").toLowerCase();
  if (!source.auto_sync_enabled || method === "manual_fallback" || source.source_type === "manual" || source.source_type === "csv_import") {
    return { quotes: [], status: "disabled", error: "Fonte non configurata per aggiornamento automatico." };
  }
  if (method === "pronto_gold_parser" || source.source_type === "pronto_gold_parser" || source.name?.toLowerCase() === "pronto gold") {
    return prontoGoldExtractor.extractProntoGoldQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || prontoGoldUrl,
      quoteUrl: config.quote_url || config.quoteUrl || prontoGoldQuoteUrl,
      sourceUrl: config.quote_url || config.quoteUrl || prontoGoldQuoteUrl,
      timeoutMs: prontoGoldTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: prontoGoldUsePlaywright,
      useAiFallback: prontoGoldUseAiFallback
    });
  }
  if (method === "gruppo_oro_24k_parser" || source.source_type === "gruppo_oro_24k_parser" || source.name?.toLowerCase() === "gruppo oro 24k") {
    return gruppoOro24kExtractor.extractGruppoOro24kQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || gruppoOro24kUrl,
      sourceUrl: config.url || source.website_url || gruppoOro24kUrl,
      timeoutMs: gruppoOro24kTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: gruppoOro24kUsePlaywright,
      useAiFallback: gruppoOro24kUseAiFallback
    });
  }
  const guidedRules = await listCompetitorExtractionRules({ sourceId: source.id, activeOnly: true }).catch(() => []);
  if (guidedRules.length) {
    const trained = await competitorExtractionTrainer.testCompetitorExtraction(source, guidedRules);
    for (const result of trained.results || []) {
      await saveExtractionTestResult(result.rule, result).catch(() => null);
    }
    return {
      quotes: trained.quotes || [],
      status: trained.status === "success" ? "success" : (trained.quotes?.length ? "partial" : "failed"),
      error: trained.error || (trained.quotes?.length ? "" : "Dato non rilevato. Configura anchor, selettore o regex."),
      extraction_method: "guided_extraction_rules",
      rule_results: (trained.results || []).map(publicExtractionTestResult)
    };
  }
  if (method === "oro_express_parser" || source.source_type === "oro_express_parser" || source.name?.toLowerCase() === "oro express") {
    return oroExpressExtractor.extractOroExpressQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || oroExpressUrl,
      sourceUrl: config.url || source.website_url || oroExpressUrl,
      silverUsedMapping: config.silver_used_mapping || config.silverUsedMapping || oroExpressSilverUsedMapping,
      timeoutMs: oroExpressTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: oroExpressUsePlaywright
    });
  }

  if (method === "oro_doro_parser" || source.source_type === "oro_doro_parser" || source.name?.toLowerCase() === "oro d'oro") {
    return oroDOroExtractor.extractOroDOroQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || oroDOroUrl,
      sourceUrl: config.url || source.website_url || oroDOroUrl,
      timeoutMs: oroDOroTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: oroDOroUsePlaywright,
      useAiFallback: oroDOroUseAiFallback
    });
  }

  if (method === "amico_oro_parser" || source.source_type === "amico_oro_parser" || source.name?.toLowerCase() === "amico oro") {
    return amicoOroExtractor.extractAmicoOroQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || amicoOroUrl,
      sourceUrl: config.url || source.website_url || amicoOroUrl,
      timeoutMs: amicoOroTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: amicoOroUsePlaywright,
      useAiVisionFallback: amicoOroUseAiVisionFallback
    });
  }

  if (method === "banco_preziosi_parser" || source.source_type === "banco_preziosi_parser" || source.name?.toLowerCase() === "banco preziosi") {
    return bancoPreziosiExtractor.extractBancoPreziosiQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || bancoPreziosiUrl,
      quoteUrl: config.quote_url || config.quoteUrl || bancoPreziosiQuoteUrl,
      sourceUrl: config.url || source.website_url || bancoPreziosiUrl,
      timeoutMs: bancoPreziosiTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: bancoPreziosiUsePlaywright,
      useAiFallback: bancoPreziosiUseAiFallback
    });
  }

  if (method === "bordin_parser" || source.source_type === "bordin_parser" || source.name?.toLowerCase() === "bordin") {
    return bordinExtractor.extractBordinQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || bordinUrl,
      sourceUrl: config.url || source.website_url || bordinUrl,
      timeoutMs: bordinTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: bordinUsePlaywright,
      useAiFallback: bordinUseAiFallback
    });
  }

  if (method === "gold_standard_parser" || source.source_type === "gold_standard_parser" || source.name?.toLowerCase() === "gold standard") {
    return goldStandardExtractor.extractGoldStandardQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || goldStandardUrl,
      sourceUrl: config.url || source.website_url || goldStandardUrl,
      timeoutMs: goldStandardTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: goldStandardUsePlaywright,
      useAiFallback: goldStandardUseAiFallback
    });
  }

  if (method === "oro_in_euro_parser" || source.source_type === "oro_in_euro_parser" || source.name?.toLowerCase() === "oro in euro") {
    return oroInEuroExtractor.extractOroInEuroQuotes({
      source_id: source.id,
      sourceId: source.id,
      url: config.url || source.website_url || oroInEuroUrl,
      sourceUrl: config.url || source.website_url || oroInEuroUrl,
      timeoutMs: oroInEuroTimeoutMs,
      userAgent: competitorAutoSyncUserAgent,
      usePlaywright: oroInEuroUsePlaywright,
      useAiFallback: oroInEuroUseAiFallback
    });
  }

  if (method === "api" || source.source_type === "api") {
    const { body } = await fetchCompetitorPage(source.website_url);
    const data = JSON.parse(body);
    const rawQuotes = Array.isArray(data) ? data : Array.isArray(data.quotes) ? data.quotes : [];
    const quotes = rawQuotes.slice(0, 80)
      .map((quote) => normalizeCompetitorQuote({ ...quote, extraction_method: "auto_api" }, source))
      .filter(Boolean);
    return { quotes, status: quotes.length ? "success" : "partial", error: quotes.length ? "" : "API leggibile ma senza quotazioni normalizzabili." };
  }

  const pages = Array.isArray(config.pages) && config.pages.length
    ? config.pages
    : [{ url: source.website_url, metal: "gold" }, { url: source.website_url, metal: "silver" }];
  const quotes = [];
  const errors = [];
  for (const page of pages.slice(0, 4)) {
    const url = page.url || source.website_url;
    if (!url) continue;
    try {
      const { body } = await fetchCompetitorPage(url);
      const pageQuotes = extractQuotesFromText(body, source, page)
        .map((quote) => normalizeCompetitorQuote(quote, source))
        .filter(Boolean);
      quotes.push(...pageQuotes);
      if (!pageQuotes.length) errors.push(`${url}: nessuna quotazione riconosciuta`);
    } catch (error) {
      errors.push(`${url}: ${error.message || "lettura non riuscita"}`);
    }
  }
  return {
    quotes,
    status: quotes.length ? (errors.length ? "partial" : "success") : "failed",
    error: errors.join(" | ").slice(0, 1200)
  };
}

async function saveCompetitorQuotes(quotes = [], user = {}) {
  const saved = [];
  const errors = [];
  for (const quote of quotes) {
    try {
      saved.push(await insertCompetitorQuote(quote, user));
    } catch (error) {
      errors.push(error.message || "quotazione non salvata");
    }
  }
  return { saved, errors };
}

function publicCompetitorSyncLog(row = {}) {
  return {
    id: row.id || null,
    source_id: row.source_id || null,
    competitor_name: row.competitor_name || "",
    status: row.status || "not_synced",
    quotes_found: Number(row.quotes_found || 0),
    quotes_saved: Number(row.quotes_saved || 0),
    error_message: row.error_message || "",
    started_at: row.started_at || null,
    completed_at: row.completed_at || null,
    metadata: row.metadata || {}
  };
}

async function createCompetitorSyncLog(source = {}) {
  const result = await pool.query(
    `INSERT INTO competitor_quote_sync_logs (
      source_id, competitor_name, status, quotes_found, quotes_saved, started_at, metadata
    ) VALUES (
      $1::bigint,$2::text,'running',0,0,NOW(),$3::jsonb
    )
    RETURNING *`,
    [source.id || null, source.name || "", sanitizeForPostgres({ url: source.website_url || "", source_type: source.source_type || "" })]
  );
  return result.rows[0];
}

async function finishCompetitorSyncLog(logId, updates = {}) {
  if (!logId) return null;
  const result = await pool.query(
    `UPDATE competitor_quote_sync_logs
        SET status = $1::text,
            quotes_found = $2::int,
            quotes_saved = $3::int,
            error_message = $4::text,
            completed_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb
      WHERE id = $6::bigint
      RETURNING *`,
    [
      updates.status || "failed",
      Number(updates.quotes_found || 0),
      Number(updates.quotes_saved || 0),
      String(updates.error_message || "").slice(0, 1200),
      sanitizeForPostgres(updates.metadata || {}),
      logId
    ]
  );
  return result.rows[0] || null;
}

function nextCompetitorSyncDate(source = {}, from = new Date()) {
  const minutes = Math.min(Math.max(Number(source.sync_interval_minutes || competitorAutoSyncIntervalMinutes), 15), 10080);
  return new Date(from.getTime() + minutes * 60 * 1000).toISOString();
}

async function syncSingleCompetitorSource(sourceIdOrSource, user = {}, req = null, options = {}) {
  const source = typeof sourceIdOrSource === "object" && sourceIdOrSource?.id
    ? publicCompetitorSource(sourceIdOrSource)
    : publicCompetitorSource((await pool.query("SELECT * FROM competitor_quote_sources WHERE id = $1::bigint LIMIT 1", [sourceIdOrSource])).rows[0] || {});
  if (!source.id) throw new Error("Fonte competitor non trovata");
  if (isHiddenCompetitorName(source.name)) {
    await updateCompetitorSourceSyncStatus(source.id, "disabled", new Date().toISOString(), "Competitor rimosso dal confronto OroActive", null).catch(() => {});
    return {
      source: { ...source, active: false, auto_sync_enabled: false, last_sync_status: "disabled" },
      status: "disabled",
      quotes_found: 0,
      quotes_saved: 0,
      error: "Competitor rimosso dal confronto OroActive"
    };
  }
  const log = await createCompetitorSyncLog(source);
  const completedAt = new Date();
  const nextSyncAt = nextCompetitorSyncDate(source, completedAt);
  if (!source.active || !source.auto_sync_enabled) {
    await updateCompetitorSourceSyncStatus(source.id, "disabled", completedAt.toISOString(), "", nextSyncAt);
    const finished = await finishCompetitorSyncLog(log.id, { status: "disabled", metadata: { forced: Boolean(options.force) } });
    return { source, status: "disabled", quotes_found: 0, quotes_saved: 0, log: publicCompetitorSyncLog(finished) };
  }

  try {
    const extracted = await extractCompetitorQuotes(source);
    const saveResult = await saveCompetitorQuotes(extracted.quotes || [], user);
    const status = saveResult.saved.length
      ? extracted.status === "failed" ? "partial" : extracted.status
      : extracted.status === "success" ? "partial" : extracted.status;
    const errorMessage = [extracted.error, ...saveResult.errors].filter(Boolean).join(" | ");
    await updateCompetitorSourceSyncStatus(source.id, status, completedAt.toISOString(), errorMessage, nextSyncAt);
    const finished = await finishCompetitorSyncLog(log.id, {
      status,
      quotes_found: extracted.quotes?.length || 0,
      quotes_saved: saveResult.saved.length,
      error_message: errorMessage,
      metadata: {
        forced: Boolean(options.force),
        next_sync_at: nextSyncAt,
        extraction_method: extracted.extraction_method || source.source_type || "",
        extraction_warnings: extracted.warnings || [],
        rules_tested: extracted.rule_results?.length || 0,
        rule_statuses: (extracted.rule_results || []).map((item) => ({
          field_key: item.rule?.field_key || "",
          status: item.status,
          value: item.value || null
        }))
      }
    });
    void writeAuditLog({
      req,
      user,
      action: "competitor_auto_sync_source",
      entityType: "competitor_quote_source",
      entityId: source.id,
      entityLabel: source.name,
      afterData: { status, quotes_saved: saveResult.saved.length, error: errorMessage },
      metadata: { forced: Boolean(options.force) }
    });
    return {
      source: { ...source, last_sync_status: status, last_sync_at: completedAt.toISOString(), next_sync_at: nextSyncAt, last_sync_error: errorMessage },
      status,
      quotes_found: extracted.quotes?.length || 0,
      quotes_saved: saveResult.saved.length,
      error: errorMessage,
      log: publicCompetitorSyncLog(finished)
    };
  } catch (error) {
    const errorMessage = error.message || "Sync competitor non riuscita";
    await updateCompetitorSourceSyncStatus(source.id, "failed", completedAt.toISOString(), errorMessage, nextSyncAt);
    const finished = await finishCompetitorSyncLog(log.id, {
      status: "failed",
      error_message: errorMessage,
      metadata: { forced: Boolean(options.force), next_sync_at: nextSyncAt }
    });
    return { source, status: "failed", quotes_found: 0, quotes_saved: 0, error: errorMessage, log: publicCompetitorSyncLog(finished) };
  }
}

async function calculateCompetitorMarketSummary({ currency = goldPriceBaseCurrency } = {}) {
  const settings = await loadGoldPredictionSettings();
  const hours = Number(settings.competitor_data_max_age_hours || 24);
  const stats = await competitorQuoteStats({ metals: ["gold", "silver"], currency, hours });
  return {
    currency: normalizePredictionCurrency(currency),
    hours,
    generated_at: new Date().toISOString(),
    stats
  };
}

async function listCompetitorSyncLogs({ limit = 80 } = {}) {
  const result = await pool.query(
    `SELECT *
       FROM competitor_quote_sync_logs
      WHERE ${hiddenCompetitorSql("competitor_name")}
      ORDER BY started_at DESC
      LIMIT $1::int`,
    [Math.min(Math.max(Number(limit || 80), 1), 300)]
  );
  return result.rows.map(publicCompetitorSyncLog);
}

async function runCompetitorAutoSyncNow({ force = false, user = {}, req = null, maxSources = competitorAutoSyncMaxSourcesPerRun } = {}) {
  if (competitorAutoSyncState.running) {
    return { ok: true, skipped: true, message: "Sync competitor gia in corso.", state: competitorAutoSyncPublicStatus() };
  }
  competitorAutoSyncState.running = true;
  competitorAutoSyncState.lastRunAt = new Date().toISOString();
  competitorAutoSyncState.lastStatus = "running";
  competitorAutoSyncState.lastError = "";
  try {
    const params = [Math.min(Math.max(Number(maxSources || competitorAutoSyncMaxSourcesPerRun), 1), 20)];
    const dueClause = force ? "" : "AND (next_sync_at IS NULL OR next_sync_at <= NOW())";
    const result = await pool.query(
      `SELECT *
         FROM competitor_quote_sources
       WHERE active = true
          AND auto_sync_enabled = true
          AND ${hiddenCompetitorSql("name")}
          ${dueClause}
        ORDER BY COALESCE(next_sync_at, '1970-01-01'::timestamptz) ASC, id ASC
        LIMIT $1::int`,
      params
    );
    const results = [];
    for (const source of result.rows) {
      results.push(await syncSingleCompetitorSource(source, user, req, { force }).catch((error) => ({
        source: publicCompetitorSource(source),
        status: "failed",
        quotes_found: 0,
        quotes_saved: 0,
        error: error.message || "Sync fonte fallita"
      })));
    }
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    competitorAutoSyncState.lastSummary = summary;
    competitorAutoSyncState.lastStatus = results.some((item) => item.status === "failed") ? "partial" : "success";
    competitorAutoSyncState.nextRunAt = new Date(Date.now() + competitorAutoSyncIntervalMinutes * 60 * 1000).toISOString();
    void writeAuditLog({
      req,
      user,
      action: "competitor_auto_sync_run",
      entityType: "competitor_quotes",
      entityLabel: "Auto sync competitor",
      afterData: {
        sources: results.length,
        quotes_saved: results.reduce((sum, item) => sum + Number(item.quotes_saved || 0), 0),
        failed: results.filter((item) => item.status === "failed").length
      },
      metadata: { force }
    });
    return {
      ok: true,
      force,
      sources_checked: results.length,
      quotes_saved: results.reduce((sum, item) => sum + Number(item.quotes_saved || 0), 0),
      results,
      summary,
      state: competitorAutoSyncPublicStatus()
    };
  } catch (error) {
    competitorAutoSyncState.lastStatus = "failed";
    competitorAutoSyncState.lastError = error.message || "Auto sync competitor non riuscita";
    throw error;
  } finally {
    competitorAutoSyncState.running = false;
  }
}

function competitorAutoSyncPublicStatus() {
  return {
    enabled: competitorAutoSyncEnabled,
    running: competitorAutoSyncState.running,
    interval_minutes: competitorAutoSyncIntervalMinutes,
    on_startup: competitorAutoSyncOnStartup,
    max_sources_per_run: competitorAutoSyncMaxSourcesPerRun,
    timeout_ms: competitorAutoSyncTimeoutMs,
    last_run_at: competitorAutoSyncState.lastRunAt,
    next_run_at: competitorAutoSyncState.nextRunAt,
    last_status: competitorAutoSyncState.lastStatus,
    last_error: competitorAutoSyncState.lastError,
    last_summary: competitorAutoSyncState.lastSummary
  };
}

function startCompetitorAutoSync() {
  if (!competitorAutoSyncEnabled || competitorAutoSyncState.timer) return competitorAutoSyncPublicStatus();
  competitorAutoSyncState.nextRunAt = new Date(Date.now() + competitorAutoSyncIntervalMinutes * 60 * 1000).toISOString();
  if (competitorAutoSyncOnStartup) {
    setTimeout(() => {
      runCompetitorAutoSyncNow({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        competitorAutoSyncState.lastStatus = "failed";
        competitorAutoSyncState.lastError = error.message || "Auto sync startup fallita";
        console.error("Errore auto sync competitor", error);
      });
    }, 3000).unref?.();
  }
  competitorAutoSyncState.timer = setInterval(() => {
    runCompetitorAutoSyncNow({ user: { id: null, ruolo: "system" } }).catch((error) => {
      competitorAutoSyncState.lastStatus = "failed";
      competitorAutoSyncState.lastError = error.message || "Auto sync competitor fallita";
      console.error("Errore auto sync competitor", error);
    });
  }, competitorAutoSyncIntervalMinutes * 60 * 1000);
  competitorAutoSyncState.timer.unref?.();
  return competitorAutoSyncPublicStatus();
}

function stopCompetitorAutoSync() {
  if (competitorAutoSyncState.timer) clearInterval(competitorAutoSyncState.timer);
  competitorAutoSyncState.timer = null;
  competitorAutoSyncState.nextRunAt = null;
  return competitorAutoSyncPublicStatus();
}

function oroExpressSyncPublicStatus() {
  return {
    enabled: oroExpressAutoSyncEnabled,
    running: oroExpressSyncState.running,
    interval_minutes: oroExpressSyncIntervalMinutes,
    on_startup: oroExpressAutoSyncOnStartup,
    url: oroExpressUrl,
    use_playwright: oroExpressUsePlaywright,
    timeout_ms: oroExpressTimeoutMs,
    silver_used_mapping: oroExpressSilverUsedMapping,
    last_run_at: oroExpressSyncState.lastRunAt,
    next_run_at: oroExpressSyncState.nextRunAt,
    last_status: oroExpressSyncState.lastStatus,
    last_error: oroExpressSyncState.lastError
  };
}

async function getOroExpressSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Oro Express') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getOroDOroSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) IN (LOWER('Oro D''Oro'), LOWER('Oro D''oro')) LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getAmicoOroSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Amico Oro') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getProntoGoldSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Pronto Gold') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getBancoPreziosiSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Banco Preziosi') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getBordinSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Bordin') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getGoldStandardSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Gold Standard') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getOroInEuroSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Oro in Euro') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function getGruppoOro24kSource() {
  const result = await pool.query(
    "SELECT * FROM competitor_quote_sources WHERE LOWER(name) = LOWER('Gruppo Oro 24K') LIMIT 1"
  );
  return result.rows[0] ? publicCompetitorSource(result.rows[0]) : null;
}

async function runOroExpressHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!oroExpressAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Oro Express disattivato.", state: oroExpressSyncPublicStatus() };
  }
  if (oroExpressSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Oro Express gia in corso.", state: oroExpressSyncPublicStatus() };
  }
  oroExpressSyncState.running = true;
  oroExpressSyncState.lastRunAt = new Date().toISOString();
  oroExpressSyncState.lastStatus = "running";
  oroExpressSyncState.lastError = "";
  try {
    const source = await getOroExpressSource();
    if (!source?.id) throw new Error("Fonte Oro Express non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    oroExpressSyncState.lastStatus = result.status || "success";
    oroExpressSyncState.lastError = result.error || result.log?.error_message || "";
    oroExpressSyncState.nextRunAt = new Date(Date.now() + oroExpressSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: oroExpressSyncPublicStatus()
    };
  } catch (error) {
    oroExpressSyncState.lastStatus = "failed";
    oroExpressSyncState.lastError = error.message || "Sync Oro Express non riuscito";
    const source = await getOroExpressSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        oroExpressSyncState.lastError,
        new Date(Date.now() + oroExpressSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    oroExpressSyncState.running = false;
  }
}

function startOroExpressHourlySync() {
  if (!oroExpressAutoSyncEnabled || oroExpressSyncState.timer) return oroExpressSyncPublicStatus();
  oroExpressSyncState.nextRunAt = new Date(Date.now() + oroExpressSyncIntervalMinutes * 60 * 1000).toISOString();
  if (oroExpressAutoSyncOnStartup) {
    setTimeout(() => {
      runOroExpressHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        oroExpressSyncState.lastStatus = "failed";
        oroExpressSyncState.lastError = error.message || "Sync startup Oro Express fallito";
        console.error("Errore sync Oro Express", error);
      });
    }, 6000).unref?.();
  }
  oroExpressSyncState.timer = setInterval(() => {
    runOroExpressHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      oroExpressSyncState.lastStatus = "failed";
      oroExpressSyncState.lastError = error.message || "Sync Oro Express fallito";
      console.error("Errore sync Oro Express", error);
    });
  }, oroExpressSyncIntervalMinutes * 60 * 1000);
  oroExpressSyncState.timer.unref?.();
  return oroExpressSyncPublicStatus();
}

function oroDOroSyncPublicStatus() {
  return {
    enabled: oroDOroAutoSyncEnabled,
    running: oroDOroSyncState.running,
    interval_minutes: oroDOroSyncIntervalMinutes,
    on_startup: oroDOroAutoSyncOnStartup,
    url: oroDOroUrl,
    use_playwright: oroDOroUsePlaywright,
    use_ai_fallback: oroDOroUseAiFallback,
    timeout_ms: oroDOroTimeoutMs,
    last_run_at: oroDOroSyncState.lastRunAt,
    next_run_at: oroDOroSyncState.nextRunAt,
    last_status: oroDOroSyncState.lastStatus,
    last_error: oroDOroSyncState.lastError
  };
}

async function runOroDOroHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!oroDOroAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Oro D'Oro disattivato.", state: oroDOroSyncPublicStatus() };
  }
  if (oroDOroSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Oro D'Oro gia in corso.", state: oroDOroSyncPublicStatus() };
  }
  oroDOroSyncState.running = true;
  oroDOroSyncState.lastRunAt = new Date().toISOString();
  oroDOroSyncState.lastStatus = "running";
  oroDOroSyncState.lastError = "";
  try {
    const source = await getOroDOroSource();
    if (!source?.id) throw new Error("Fonte Oro D'Oro non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    oroDOroSyncState.lastStatus = result.status || "success";
    oroDOroSyncState.lastError = result.error || result.log?.error_message || "";
    oroDOroSyncState.nextRunAt = new Date(Date.now() + oroDOroSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: oroDOroSyncPublicStatus()
    };
  } catch (error) {
    oroDOroSyncState.lastStatus = "failed";
    oroDOroSyncState.lastError = error.message || "Sync Oro D'Oro non riuscito";
    const source = await getOroDOroSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        oroDOroSyncState.lastError,
        new Date(Date.now() + oroDOroSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    oroDOroSyncState.running = false;
  }
}

function startOroDOroHourlySync() {
  if (!oroDOroAutoSyncEnabled || oroDOroSyncState.timer) return oroDOroSyncPublicStatus();
  oroDOroSyncState.nextRunAt = new Date(Date.now() + oroDOroSyncIntervalMinutes * 60 * 1000).toISOString();
  if (oroDOroAutoSyncOnStartup) {
    setTimeout(() => {
      runOroDOroHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        oroDOroSyncState.lastStatus = "failed";
        oroDOroSyncState.lastError = error.message || "Sync startup Oro D'Oro fallito";
        console.error("Errore sync Oro D'Oro", error);
      });
    }, 6500).unref?.();
  }
  oroDOroSyncState.timer = setInterval(() => {
    runOroDOroHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      oroDOroSyncState.lastStatus = "failed";
      oroDOroSyncState.lastError = error.message || "Sync Oro D'Oro fallito";
      console.error("Errore sync Oro D'Oro", error);
    });
  }, oroDOroSyncIntervalMinutes * 60 * 1000);
  oroDOroSyncState.timer.unref?.();
  return oroDOroSyncPublicStatus();
}

function amicoOroSyncPublicStatus() {
  return {
    enabled: amicoOroAutoSyncEnabled,
    running: amicoOroSyncState.running,
    interval_minutes: amicoOroSyncIntervalMinutes,
    on_startup: amicoOroAutoSyncOnStartup,
    url: amicoOroUrl,
    use_playwright: amicoOroUsePlaywright,
    use_ai_vision_fallback: amicoOroUseAiVisionFallback,
    timeout_ms: amicoOroTimeoutMs,
    last_run_at: amicoOroSyncState.lastRunAt,
    next_run_at: amicoOroSyncState.nextRunAt,
    last_status: amicoOroSyncState.lastStatus,
    last_error: amicoOroSyncState.lastError
  };
}

async function runAmicoOroHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!amicoOroAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Amico Oro disattivato.", state: amicoOroSyncPublicStatus() };
  }
  if (amicoOroSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Amico Oro gia in corso.", state: amicoOroSyncPublicStatus() };
  }
  amicoOroSyncState.running = true;
  amicoOroSyncState.lastRunAt = new Date().toISOString();
  amicoOroSyncState.lastStatus = "running";
  amicoOroSyncState.lastError = "";
  try {
    const source = await getAmicoOroSource();
    if (!source?.id) throw new Error("Fonte Amico Oro non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    amicoOroSyncState.lastStatus = result.status || "success";
    amicoOroSyncState.lastError = result.error || result.log?.error_message || "";
    amicoOroSyncState.nextRunAt = new Date(Date.now() + amicoOroSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: amicoOroSyncPublicStatus()
    };
  } catch (error) {
    amicoOroSyncState.lastStatus = "failed";
    amicoOroSyncState.lastError = error.message || "Sync Amico Oro non riuscito";
    const source = await getAmicoOroSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        amicoOroSyncState.lastError,
        new Date(Date.now() + amicoOroSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    amicoOroSyncState.running = false;
  }
}

function startAmicoOroHourlySync() {
  if (!amicoOroAutoSyncEnabled || amicoOroSyncState.timer) return amicoOroSyncPublicStatus();
  amicoOroSyncState.nextRunAt = new Date(Date.now() + amicoOroSyncIntervalMinutes * 60 * 1000).toISOString();
  if (amicoOroAutoSyncOnStartup) {
    setTimeout(() => {
      runAmicoOroHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        amicoOroSyncState.lastStatus = "failed";
        amicoOroSyncState.lastError = error.message || "Sync startup Amico Oro fallito";
        console.error("Errore sync Amico Oro", error);
      });
    }, 7000).unref?.();
  }
  amicoOroSyncState.timer = setInterval(() => {
    runAmicoOroHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      amicoOroSyncState.lastStatus = "failed";
      amicoOroSyncState.lastError = error.message || "Sync Amico Oro fallito";
      console.error("Errore sync Amico Oro", error);
    });
  }, amicoOroSyncIntervalMinutes * 60 * 1000);
  amicoOroSyncState.timer.unref?.();
  return amicoOroSyncPublicStatus();
}

function prontoGoldSyncPublicStatus() {
  return {
    enabled: prontoGoldAutoSyncEnabled,
    running: prontoGoldSyncState.running,
    interval_minutes: prontoGoldSyncIntervalMinutes,
    on_startup: prontoGoldAutoSyncOnStartup,
    url: prontoGoldUrl,
    quote_url: prontoGoldQuoteUrl,
    use_playwright: prontoGoldUsePlaywright,
    use_ai_fallback: prontoGoldUseAiFallback,
    timeout_ms: prontoGoldTimeoutMs,
    last_run_at: prontoGoldSyncState.lastRunAt,
    next_run_at: prontoGoldSyncState.nextRunAt,
    last_status: prontoGoldSyncState.lastStatus,
    last_error: prontoGoldSyncState.lastError
  };
}

async function runProntoGoldHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!prontoGoldAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Pronto Gold disattivato.", state: prontoGoldSyncPublicStatus() };
  }
  if (prontoGoldSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Pronto Gold gia in corso.", state: prontoGoldSyncPublicStatus() };
  }
  prontoGoldSyncState.running = true;
  prontoGoldSyncState.lastRunAt = new Date().toISOString();
  prontoGoldSyncState.lastStatus = "running";
  prontoGoldSyncState.lastError = "";
  try {
    const source = await getProntoGoldSource();
    if (!source?.id) throw new Error("Fonte Pronto Gold non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    prontoGoldSyncState.lastStatus = result.status || "success";
    prontoGoldSyncState.lastError = result.error || result.log?.error_message || "";
    prontoGoldSyncState.nextRunAt = new Date(Date.now() + prontoGoldSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: prontoGoldSyncPublicStatus()
    };
  } catch (error) {
    prontoGoldSyncState.lastStatus = "failed";
    prontoGoldSyncState.lastError = error.message || "Sync Pronto Gold non riuscito";
    const source = await getProntoGoldSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        prontoGoldSyncState.lastError,
        new Date(Date.now() + prontoGoldSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    prontoGoldSyncState.running = false;
  }
}

function startProntoGoldHourlySync() {
  if (!prontoGoldAutoSyncEnabled || prontoGoldSyncState.timer) return prontoGoldSyncPublicStatus();
  prontoGoldSyncState.nextRunAt = new Date(Date.now() + prontoGoldSyncIntervalMinutes * 60 * 1000).toISOString();
  if (prontoGoldAutoSyncOnStartup) {
    setTimeout(() => {
      runProntoGoldHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        prontoGoldSyncState.lastStatus = "failed";
        prontoGoldSyncState.lastError = error.message || "Sync startup Pronto Gold fallito";
        console.error("Errore sync Pronto Gold", error);
      });
    }, 7500).unref?.();
  }
  prontoGoldSyncState.timer = setInterval(() => {
    runProntoGoldHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      prontoGoldSyncState.lastStatus = "failed";
      prontoGoldSyncState.lastError = error.message || "Sync Pronto Gold fallito";
      console.error("Errore sync Pronto Gold", error);
    });
  }, prontoGoldSyncIntervalMinutes * 60 * 1000);
  prontoGoldSyncState.timer.unref?.();
  return prontoGoldSyncPublicStatus();
}

function bancoPreziosiSyncPublicStatus() {
  return {
    enabled: bancoPreziosiAutoSyncEnabled,
    running: bancoPreziosiSyncState.running,
    interval_minutes: bancoPreziosiSyncIntervalMinutes,
    on_startup: bancoPreziosiAutoSyncOnStartup,
    url: bancoPreziosiUrl,
    quote_url: bancoPreziosiQuoteUrl,
    use_playwright: bancoPreziosiUsePlaywright,
    use_ai_fallback: bancoPreziosiUseAiFallback,
    timeout_ms: bancoPreziosiTimeoutMs,
    last_run_at: bancoPreziosiSyncState.lastRunAt,
    next_run_at: bancoPreziosiSyncState.nextRunAt,
    last_status: bancoPreziosiSyncState.lastStatus,
    last_error: bancoPreziosiSyncState.lastError
  };
}

async function runBancoPreziosiHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!bancoPreziosiAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Banco Preziosi disattivato.", state: bancoPreziosiSyncPublicStatus() };
  }
  if (bancoPreziosiSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Banco Preziosi gia in corso.", state: bancoPreziosiSyncPublicStatus() };
  }
  bancoPreziosiSyncState.running = true;
  bancoPreziosiSyncState.lastRunAt = new Date().toISOString();
  bancoPreziosiSyncState.lastStatus = "running";
  bancoPreziosiSyncState.lastError = "";
  try {
    const source = await getBancoPreziosiSource();
    if (!source?.id) throw new Error("Fonte Banco Preziosi non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    bancoPreziosiSyncState.lastStatus = result.status || "success";
    bancoPreziosiSyncState.lastError = result.error || result.log?.error_message || "";
    bancoPreziosiSyncState.nextRunAt = new Date(Date.now() + bancoPreziosiSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: bancoPreziosiSyncPublicStatus()
    };
  } catch (error) {
    bancoPreziosiSyncState.lastStatus = "failed";
    bancoPreziosiSyncState.lastError = error.message || "Sync Banco Preziosi non riuscito";
    const source = await getBancoPreziosiSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        bancoPreziosiSyncState.lastError,
        new Date(Date.now() + bancoPreziosiSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    bancoPreziosiSyncState.running = false;
  }
}

function startBancoPreziosiHourlySync() {
  if (!bancoPreziosiAutoSyncEnabled || bancoPreziosiSyncState.timer) return bancoPreziosiSyncPublicStatus();
  bancoPreziosiSyncState.nextRunAt = new Date(Date.now() + bancoPreziosiSyncIntervalMinutes * 60 * 1000).toISOString();
  if (bancoPreziosiAutoSyncOnStartup) {
    setTimeout(() => {
      runBancoPreziosiHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        bancoPreziosiSyncState.lastStatus = "failed";
        bancoPreziosiSyncState.lastError = error.message || "Sync startup Banco Preziosi fallito";
        console.error("Errore sync Banco Preziosi", error);
      });
    }, 8000).unref?.();
  }
  bancoPreziosiSyncState.timer = setInterval(() => {
    runBancoPreziosiHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      bancoPreziosiSyncState.lastStatus = "failed";
      bancoPreziosiSyncState.lastError = error.message || "Sync Banco Preziosi fallito";
      console.error("Errore sync Banco Preziosi", error);
    });
  }, bancoPreziosiSyncIntervalMinutes * 60 * 1000);
  bancoPreziosiSyncState.timer.unref?.();
  return bancoPreziosiSyncPublicStatus();
}

function bordinSyncPublicStatus() {
  return {
    enabled: bordinAutoSyncEnabled,
    running: bordinSyncState.running,
    interval_minutes: bordinSyncIntervalMinutes,
    on_startup: bordinAutoSyncOnStartup,
    url: bordinUrl,
    use_playwright: bordinUsePlaywright,
    use_ai_fallback: bordinUseAiFallback,
    timeout_ms: bordinTimeoutMs,
    last_run_at: bordinSyncState.lastRunAt,
    next_run_at: bordinSyncState.nextRunAt,
    last_status: bordinSyncState.lastStatus,
    last_error: bordinSyncState.lastError
  };
}

async function runBordinHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!bordinAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Bordin disattivato.", state: bordinSyncPublicStatus() };
  }
  if (bordinSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Bordin gia in corso.", state: bordinSyncPublicStatus() };
  }
  bordinSyncState.running = true;
  bordinSyncState.lastRunAt = new Date().toISOString();
  bordinSyncState.lastStatus = "running";
  bordinSyncState.lastError = "";
  try {
    const source = await getBordinSource();
    if (!source?.id) throw new Error("Fonte Bordin non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    bordinSyncState.lastStatus = result.status || "success";
    bordinSyncState.lastError = result.error || result.log?.error_message || "";
    bordinSyncState.nextRunAt = new Date(Date.now() + bordinSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: bordinSyncPublicStatus()
    };
  } catch (error) {
    bordinSyncState.lastStatus = "failed";
    bordinSyncState.lastError = error.message || "Sync Bordin non riuscito";
    const source = await getBordinSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        bordinSyncState.lastError,
        new Date(Date.now() + bordinSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    bordinSyncState.running = false;
  }
}

function startBordinHourlySync() {
  if (!bordinAutoSyncEnabled || bordinSyncState.timer) return bordinSyncPublicStatus();
  bordinSyncState.nextRunAt = new Date(Date.now() + bordinSyncIntervalMinutes * 60 * 1000).toISOString();
  if (bordinAutoSyncOnStartup) {
    setTimeout(() => {
      runBordinHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        bordinSyncState.lastStatus = "failed";
        bordinSyncState.lastError = error.message || "Sync startup Bordin fallito";
        console.error("Errore sync Bordin", error);
      });
    }, 8500).unref?.();
  }
  bordinSyncState.timer = setInterval(() => {
    runBordinHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      bordinSyncState.lastStatus = "failed";
      bordinSyncState.lastError = error.message || "Sync Bordin fallito";
      console.error("Errore sync Bordin", error);
    });
  }, bordinSyncIntervalMinutes * 60 * 1000);
  bordinSyncState.timer.unref?.();
  return bordinSyncPublicStatus();
}

function goldStandardSyncPublicStatus() {
  return {
    enabled: goldStandardAutoSyncEnabled,
    running: goldStandardSyncState.running,
    interval_minutes: goldStandardSyncIntervalMinutes,
    on_startup: goldStandardAutoSyncOnStartup,
    url: goldStandardUrl,
    use_playwright: goldStandardUsePlaywright,
    use_ai_fallback: goldStandardUseAiFallback,
    timeout_ms: goldStandardTimeoutMs,
    last_run_at: goldStandardSyncState.lastRunAt,
    next_run_at: goldStandardSyncState.nextRunAt,
    last_status: goldStandardSyncState.lastStatus,
    last_error: goldStandardSyncState.lastError
  };
}

async function runGoldStandardHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!goldStandardAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Gold Standard disattivato.", state: goldStandardSyncPublicStatus() };
  }
  if (goldStandardSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Gold Standard gia in corso.", state: goldStandardSyncPublicStatus() };
  }
  goldStandardSyncState.running = true;
  goldStandardSyncState.lastRunAt = new Date().toISOString();
  goldStandardSyncState.lastStatus = "running";
  goldStandardSyncState.lastError = "";
  try {
    const source = await getGoldStandardSource();
    if (!source?.id) throw new Error("Fonte Gold Standard non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    goldStandardSyncState.lastStatus = result.status || "success";
    goldStandardSyncState.lastError = result.error || result.log?.error_message || "";
    goldStandardSyncState.nextRunAt = new Date(Date.now() + goldStandardSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: goldStandardSyncPublicStatus()
    };
  } catch (error) {
    goldStandardSyncState.lastStatus = "failed";
    goldStandardSyncState.lastError = error.message || "Sync Gold Standard non riuscito";
    const source = await getGoldStandardSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        goldStandardSyncState.lastError,
        new Date(Date.now() + goldStandardSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    goldStandardSyncState.running = false;
  }
}

function startGoldStandardHourlySync() {
  if (!goldStandardAutoSyncEnabled || goldStandardSyncState.timer) return goldStandardSyncPublicStatus();
  goldStandardSyncState.nextRunAt = new Date(Date.now() + goldStandardSyncIntervalMinutes * 60 * 1000).toISOString();
  if (goldStandardAutoSyncOnStartup) {
    setTimeout(() => {
      runGoldStandardHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        goldStandardSyncState.lastStatus = "failed";
        goldStandardSyncState.lastError = error.message || "Sync startup Gold Standard fallito";
        console.error("Errore sync Gold Standard", error);
      });
    }, 9000).unref?.();
  }
  goldStandardSyncState.timer = setInterval(() => {
    runGoldStandardHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      goldStandardSyncState.lastStatus = "failed";
      goldStandardSyncState.lastError = error.message || "Sync Gold Standard fallito";
      console.error("Errore sync Gold Standard", error);
    });
  }, goldStandardSyncIntervalMinutes * 60 * 1000);
  goldStandardSyncState.timer.unref?.();
  return goldStandardSyncPublicStatus();
}

function oroInEuroSyncPublicStatus() {
  return {
    enabled: oroInEuroAutoSyncEnabled,
    running: oroInEuroSyncState.running,
    interval_minutes: oroInEuroSyncIntervalMinutes,
    on_startup: oroInEuroAutoSyncOnStartup,
    url: oroInEuroUrl,
    use_playwright: oroInEuroUsePlaywright,
    use_ai_fallback: oroInEuroUseAiFallback,
    timeout_ms: oroInEuroTimeoutMs,
    last_run_at: oroInEuroSyncState.lastRunAt,
    next_run_at: oroInEuroSyncState.nextRunAt,
    last_status: oroInEuroSyncState.lastStatus,
    last_error: oroInEuroSyncState.lastError
  };
}

async function runOroInEuroHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!oroInEuroAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Oro in Euro disattivato.", state: oroInEuroSyncPublicStatus() };
  }
  if (oroInEuroSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Oro in Euro gia in corso.", state: oroInEuroSyncPublicStatus() };
  }
  oroInEuroSyncState.running = true;
  oroInEuroSyncState.lastRunAt = new Date().toISOString();
  oroInEuroSyncState.lastStatus = "running";
  oroInEuroSyncState.lastError = "";
  try {
    const source = await getOroInEuroSource();
    if (!source?.id) throw new Error("Fonte Oro in Euro non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    oroInEuroSyncState.lastStatus = result.status || "success";
    oroInEuroSyncState.lastError = result.error || result.log?.error_message || "";
    oroInEuroSyncState.nextRunAt = new Date(Date.now() + oroInEuroSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: oroInEuroSyncPublicStatus()
    };
  } catch (error) {
    oroInEuroSyncState.lastStatus = "failed";
    oroInEuroSyncState.lastError = error.message || "Sync Oro in Euro non riuscito";
    const source = await getOroInEuroSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        oroInEuroSyncState.lastError,
        new Date(Date.now() + oroInEuroSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    oroInEuroSyncState.running = false;
  }
}

function startOroInEuroHourlySync() {
  if (!oroInEuroAutoSyncEnabled || oroInEuroSyncState.timer) return oroInEuroSyncPublicStatus();
  oroInEuroSyncState.nextRunAt = new Date(Date.now() + oroInEuroSyncIntervalMinutes * 60 * 1000).toISOString();
  if (oroInEuroAutoSyncOnStartup) {
    setTimeout(() => {
      runOroInEuroHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        oroInEuroSyncState.lastStatus = "failed";
        oroInEuroSyncState.lastError = error.message || "Sync startup Oro in Euro fallito";
        console.error("Errore sync Oro in Euro", error);
      });
    }, 10000).unref?.();
  }
  oroInEuroSyncState.timer = setInterval(() => {
    runOroInEuroHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      oroInEuroSyncState.lastStatus = "failed";
      oroInEuroSyncState.lastError = error.message || "Sync Oro in Euro fallito";
      console.error("Errore sync Oro in Euro", error);
    });
  }, oroInEuroSyncIntervalMinutes * 60 * 1000);
  oroInEuroSyncState.timer.unref?.();
  return oroInEuroSyncPublicStatus();
}

function gruppoOro24kSyncPublicStatus() {
  return {
    enabled: gruppoOro24kAutoSyncEnabled,
    running: gruppoOro24kSyncState.running,
    interval_minutes: gruppoOro24kSyncIntervalMinutes,
    on_startup: gruppoOro24kAutoSyncOnStartup,
    url: gruppoOro24kUrl,
    use_playwright: gruppoOro24kUsePlaywright,
    use_ai_fallback: gruppoOro24kUseAiFallback,
    timeout_ms: gruppoOro24kTimeoutMs,
    last_run_at: gruppoOro24kSyncState.lastRunAt,
    next_run_at: gruppoOro24kSyncState.nextRunAt,
    last_status: gruppoOro24kSyncState.lastStatus,
    last_error: gruppoOro24kSyncState.lastError
  };
}

async function runGruppoOro24kHourlySync({ force = false, user = {}, req = null } = {}) {
  if (!gruppoOro24kAutoSyncEnabled && !force) {
    return { ok: false, skipped: true, message: "Sync Gruppo Oro 24K disattivato.", state: gruppoOro24kSyncPublicStatus() };
  }
  if (gruppoOro24kSyncState.running) {
    return { ok: true, skipped: true, message: "Sync Gruppo Oro 24K gia in corso.", state: gruppoOro24kSyncPublicStatus() };
  }
  gruppoOro24kSyncState.running = true;
  gruppoOro24kSyncState.lastRunAt = new Date().toISOString();
  gruppoOro24kSyncState.lastStatus = "running";
  gruppoOro24kSyncState.lastError = "";
  try {
    const source = await getGruppoOro24kSource();
    if (!source?.id) throw new Error("Fonte Gruppo Oro 24K non configurata");
    const result = await syncSingleCompetitorSource(source, user, req, { force });
    const summary = await calculateCompetitorMarketSummary().catch(() => null);
    gruppoOro24kSyncState.lastStatus = result.status || "success";
    gruppoOro24kSyncState.lastError = result.error || result.log?.error_message || "";
    gruppoOro24kSyncState.nextRunAt = new Date(Date.now() + gruppoOro24kSyncIntervalMinutes * 60 * 1000).toISOString();
    return {
      ok: true,
      result,
      summary,
      state: gruppoOro24kSyncPublicStatus()
    };
  } catch (error) {
    gruppoOro24kSyncState.lastStatus = "failed";
    gruppoOro24kSyncState.lastError = error.message || "Sync Gruppo Oro 24K non riuscito";
    const source = await getGruppoOro24kSource().catch(() => null);
    if (source?.id) {
      await updateCompetitorSourceSyncStatus(
        source.id,
        "failed",
        new Date().toISOString(),
        gruppoOro24kSyncState.lastError,
        new Date(Date.now() + gruppoOro24kSyncIntervalMinutes * 60 * 1000).toISOString()
      ).catch(() => {});
    }
    throw error;
  } finally {
    gruppoOro24kSyncState.running = false;
  }
}

function startGruppoOro24kHourlySync() {
  if (!gruppoOro24kAutoSyncEnabled || gruppoOro24kSyncState.timer) return gruppoOro24kSyncPublicStatus();
  gruppoOro24kSyncState.nextRunAt = new Date(Date.now() + gruppoOro24kSyncIntervalMinutes * 60 * 1000).toISOString();
  if (gruppoOro24kAutoSyncOnStartup) {
    setTimeout(() => {
      runGruppoOro24kHourlySync({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        gruppoOro24kSyncState.lastStatus = "failed";
        gruppoOro24kSyncState.lastError = error.message || "Sync startup Gruppo Oro 24K fallito";
        console.error("Errore sync Gruppo Oro 24K", error);
      });
    }, 10500).unref?.();
  }
  gruppoOro24kSyncState.timer = setInterval(() => {
    runGruppoOro24kHourlySync({ user: { id: null, ruolo: "system" } }).catch((error) => {
      gruppoOro24kSyncState.lastStatus = "failed";
      gruppoOro24kSyncState.lastError = error.message || "Sync Gruppo Oro 24K fallito";
      console.error("Errore sync Gruppo Oro 24K", error);
    });
  }, gruppoOro24kSyncIntervalMinutes * 60 * 1000);
  gruppoOro24kSyncState.timer.unref?.();
  return gruppoOro24kSyncPublicStatus();
}

async function updateCompetitorSourceAutoSync(id, input = {}, user = {}, req = null) {
  const current = await pool.query("SELECT * FROM competitor_quote_sources WHERE id = $1::bigint LIMIT 1", [id]);
  if (!current.rows[0]) throw new Error("Fonte competitor non trovata");
  const active = input.active ?? current.rows[0].active;
  const autoSyncEnabled = input.auto_sync_enabled ?? input.autoSyncEnabled ?? current.rows[0].auto_sync_enabled;
  const interval = Math.min(Math.max(Number(input.sync_interval_minutes || input.syncIntervalMinutes || current.rows[0].sync_interval_minutes || competitorAutoSyncIntervalMinutes), 15), 10080);
  const extractionConfig = sanitizeForPostgres(input.extraction_config || input.extractionConfig || current.rows[0].extraction_config || {});
  const result = await pool.query(
    `UPDATE competitor_quote_sources
        SET active = $1::boolean,
            auto_sync_enabled = $2::boolean,
            sync_interval_minutes = $3::int,
            extraction_config = $4::jsonb,
            source_type = COALESCE($5::text, source_type),
            last_sync_status = CASE WHEN $2::boolean THEN last_sync_status ELSE 'disabled' END,
            next_sync_at = CASE WHEN $2::boolean THEN COALESCE(next_sync_at, NOW()) ELSE NULL END,
            updated_at = NOW()
      WHERE id = $6::bigint
      RETURNING *`,
    [
      active !== false,
      autoSyncEnabled !== false,
      interval,
      extractionConfig,
      input.source_type || input.sourceType || null,
      id
    ]
  );
  void writeAuditLog({
    req,
    user,
    action: "competitor_auto_sync_source_updated",
    entityType: "competitor_quote_source",
    entityId: id,
    entityLabel: result.rows[0]?.name || "Fonte competitor",
    beforeData: current.rows[0],
    afterData: result.rows[0]
  });
  return publicCompetitorSource(result.rows[0]);
}

async function syncConfiguredCompetitorQuotes(user = {}, req = null) {
  return runCompetitorAutoSyncNow({ force: true, user, req });
}

function publicAiExtractionRun(row = {}) {
  return {
    id: row.id || null,
    status: row.status || "running",
    started_at: row.started_at || null,
    completed_at: row.completed_at || null,
    sources_total: Number(row.sources_total || 0),
    sources_success: Number(row.sources_success || 0),
    sources_failed: Number(row.sources_failed || 0),
    pages_analyzed: Number(row.pages_analyzed || 0),
    quotes_extracted: Number(row.quotes_extracted || 0),
    quotes_saved: Number(row.quotes_saved || 0),
    error_message: row.error_message || "",
    metadata: row.metadata || {}
  };
}

function publicAiExtractionPageLog(row = {}) {
  return {
    id: row.id || null,
    run_id: row.run_id || null,
    source_id: row.source_id || null,
    competitor_name: row.competitor_name || "",
    page_url: row.page_url || "",
    status: row.status || "",
    quotes_found: Number(row.quotes_found || 0),
    error_message: row.error_message || "",
    ai_response: row.ai_response || {},
    created_at: row.created_at || null
  };
}

async function createAiExtractionRun({ sourcesTotal = 0, metadata = {} } = {}) {
  const result = await pool.query(
    `INSERT INTO competitor_ai_extraction_runs (
      status, started_at, sources_total, metadata
    ) VALUES (
      'running', NOW(), $1::int, $2::jsonb
    )
    RETURNING *`,
    [Number(sourcesTotal || 0), sanitizeForPostgres(metadata)]
  );
  return result.rows[0];
}

async function finishAiExtractionRun(runId, updates = {}) {
  const result = await pool.query(
    `UPDATE competitor_ai_extraction_runs
        SET status = $1::text,
            completed_at = NOW(),
            sources_success = $2::int,
            sources_failed = $3::int,
            pages_analyzed = $4::int,
            quotes_extracted = $5::int,
            quotes_saved = $6::int,
            error_message = $7::text,
            metadata = COALESCE(metadata, '{}'::jsonb) || $8::jsonb
      WHERE id = $9::bigint
      RETURNING *`,
    [
      updates.status || "failed",
      Number(updates.sources_success || 0),
      Number(updates.sources_failed || 0),
      Number(updates.pages_analyzed || 0),
      Number(updates.quotes_extracted || 0),
      Number(updates.quotes_saved || 0),
      String(updates.error_message || "").slice(0, 1200),
      sanitizeForPostgres(updates.metadata || {}),
      runId
    ]
  );
  return result.rows[0] || null;
}

async function insertAiExtractionPageLog(runId, source = {}, page = {}) {
  const result = await pool.query(
    `INSERT INTO competitor_ai_extraction_page_logs (
      run_id, source_id, competitor_name, page_url, status, quotes_found, error_message, ai_response, created_at
    ) VALUES (
      $1::bigint,$2::bigint,$3::text,$4::text,$5::text,$6::int,$7::text,$8::jsonb,NOW()
    )
    RETURNING *`,
    [
      runId || null,
      source.id || null,
      source.name || "",
      String(page.page_url || page.url || source.website_url || "").slice(0, 600),
      String(page.status || "failed").slice(0, 80),
      Number(page.quotes_found || 0),
      String(page.error_message || "").slice(0, 1200),
      sanitizeForPostgres(page.ai_response || {})
    ]
  );
  return publicAiExtractionPageLog(result.rows[0]);
}

async function listAiExtractionRuns({ limit = 40 } = {}) {
  const result = await pool.query(
    `SELECT *
       FROM competitor_ai_extraction_runs
      ORDER BY started_at DESC
      LIMIT $1::int`,
    [Math.min(Math.max(Number(limit || 40), 1), 200)]
  );
  return result.rows.map(publicAiExtractionRun);
}

async function getAiExtractionRun(id) {
  const [runResult, pagesResult] = await Promise.all([
    pool.query("SELECT * FROM competitor_ai_extraction_runs WHERE id = $1::bigint LIMIT 1", [id]),
    pool.query(
      `SELECT *
         FROM competitor_ai_extraction_page_logs
        WHERE run_id = $1::bigint
          AND ${hiddenCompetitorSql("competitor_name")}
        ORDER BY created_at ASC, id ASC`,
      [id]
    )
  ]);
  if (!runResult.rows[0]) return null;
  return {
    run: publicAiExtractionRun(runResult.rows[0]),
    pages: pagesResult.rows.map(publicAiExtractionPageLog)
  };
}

async function latestAiExtractionPageSummary() {
  const result = await pool.query(
    `WITH latest AS (
       SELECT DISTINCT ON (source_id) *
         FROM competitor_ai_extraction_page_logs
        WHERE source_id IS NOT NULL
          AND ${hiddenCompetitorSql("competitor_name")}
        ORDER BY source_id, created_at DESC
     )
     SELECT * FROM latest`
  ).catch(() => ({ rows: [] }));
  return result.rows.map(publicAiExtractionPageLog);
}

async function validateAiQuoteAgainstSpot(quote = {}, spotMap = {}) {
  const normalized = { ...quote };
  const spot = spotMap[normalized.metal];
  if (!spot || normalized.quote_type !== "customer_buyback") return { ok: true, quote: normalized, reason: "" };
  const theoretical = Number(spot.price_per_gram || 0) * Number(normalized.purity_value || 0);
  if (theoretical > 0 && Number(normalized.price_per_gram || 0) > theoretical * 1.05) {
    return {
      ok: false,
      quote: normalized,
      reason: "Prezzo AI superiore al valore teorico spot della purezza: non salvo come prezzo cliente."
    };
  }
  return { ok: true, quote: normalized, reason: "" };
}

function rejectInconsistentAiPurityOrder(quotes = []) {
  const rejected = [];
  const valid = [...quotes];
  const bySourceMetal = new Map();
  valid.forEach((quote) => {
    const key = `${quote.source_id || quote.competitor_name}:${quote.metal}:${quote.quote_type}`;
    bySourceMetal.set(key, (bySourceMetal.get(key) || []).concat(quote));
  });
  for (const group of bySourceMetal.values()) {
    if (group[0]?.metal !== "gold" || group[0]?.quote_type !== "customer_buyback") continue;
    const priceByCode = Object.fromEntries(group.map((quote) => [quote.purity_code, Number(quote.price_per_gram || 0)]));
    if (priceByCode["9kt"] && priceByCode["18kt"] && priceByCode["9kt"] > priceByCode["18kt"]) {
      const index = valid.findIndex((quote) => quote.metal === "gold" && quote.purity_code === "9kt" && Number(quote.price_per_gram || 0) === priceByCode["9kt"]);
      if (index >= 0) rejected.push({ quote: valid.splice(index, 1)[0], reason: "Oro 9kt maggiore di oro 18kt nella stessa fonte." });
    }
  }
  return { valid, rejected };
}

async function saveAiExtractedCompetitorQuotes(quotes = [], { runId = null, user = {}, spotMap = {} } = {}) {
  const saved = [];
  const rejected = [];
  const ordered = rejectInconsistentAiPurityOrder(quotes);
  rejected.push(...ordered.rejected);
  for (const quote of ordered.valid) {
    const checked = await validateAiQuoteAgainstSpot(quote, spotMap);
    if (!checked.ok) {
      rejected.push({ quote, reason: checked.reason });
      continue;
    }
    try {
      saved.push(await insertCompetitorQuote({
        ...checked.quote,
        extraction_run_id: runId,
        ai_extracted: true,
        extraction_method: "ai_extraction",
        confidence: checked.quote.ai_confidence || checked.quote.confidence || "medium",
        source_url: checked.quote.source_url || checked.quote.url || "",
        raw_payload: {
          ...(checked.quote.raw_payload || {}),
          extraction_run_id: runId,
          saved_by: "ai_competitor_quote_extractor"
        }
      }, user));
    } catch (error) {
      rejected.push({ quote, reason: error.message || "quotazione AI non salvata" });
    }
  }
  return { saved, rejected };
}

async function runAiCompetitorQuoteExtraction(options = {}) {
  const force = Boolean(options.force);
  if (!competitorAiExtractionEnabled && !force) {
    return { ok: false, skipped: true, message: "Analisi AI competitor disattivata.", status: competitorAiExtractionPublicStatus() };
  }
  if (competitorAiExtractionState.running) {
    return { ok: true, skipped: true, message: "Analisi AI competitor gia in corso.", status: competitorAiExtractionPublicStatus() };
  }
  competitorAiExtractionState.running = true;
  competitorAiExtractionState.lastRunAt = new Date().toISOString();
  competitorAiExtractionState.lastStatus = "running";
  competitorAiExtractionState.lastError = "";
  let run = null;
  try {
    const sourceParams = [];
    const where = ["active = true"];
    if (options.sourceId || options.source_id) {
      sourceParams.push(options.sourceId || options.source_id);
      where.push(`id = $${sourceParams.length}::bigint`);
    }
    const sourcesResult = await pool.query(
      `SELECT *
         FROM competitor_quote_sources
        WHERE ${where.join(" AND ")}
          AND ${hiddenCompetitorSql("name")}
        ORDER BY name ASC`,
      sourceParams
    );
    const sources = sourcesResult.rows.map(publicCompetitorSource);
    run = await createAiExtractionRun({
      sourcesTotal: sources.length,
      metadata: {
        force,
        model: competitorAiExtractionModel,
        max_pages_per_source: competitorAiMaxPagesPerSource,
        max_text_chars: competitorAiMaxTextChars,
        playwright_requested: competitorAiUsePlaywright,
        openai_configured: Boolean(openai)
      }
    });
    competitorAiExtractionState.lastRunId = run.id;
    const spotMap = {
      gold: await latestMetalPriceHistory("gold", goldPriceBaseCurrency).catch(() => null),
      silver: await latestMetalPriceHistory("silver", goldPriceBaseCurrency).catch(() => null)
    };
    const results = [];
    let pagesAnalyzed = 0;
    let quotesExtracted = 0;
    let quotesSaved = 0;
    let sourcesSuccess = 0;
    let sourcesFailed = 0;
    for (const source of sources) {
      const extracted = await aiCompetitorQuoteExtractor.extractQuotesFromCompetitor(source);
      pagesAnalyzed += Number(extracted.pages_analyzed || extracted.pages?.length || 0);
      quotesExtracted += Number(extracted.quotes_found || extracted.quotes?.length || 0);
      for (const page of extracted.pages || []) {
        await insertAiExtractionPageLog(run.id, source, page);
      }
      const saved = await saveAiExtractedCompetitorQuotes(extracted.quotes || [], { runId: run.id, user: options.user || {}, spotMap });
      quotesSaved += saved.saved.length;
      const status = saved.saved.length
        ? extracted.status === "failed" ? "partial" : extracted.status
        : extracted.status;
      if (saved.saved.length) sourcesSuccess += 1;
      if (!saved.saved.length || status === "failed") sourcesFailed += 1;
      const errorMessage = [
        ...(extracted.warnings || []),
        ...(extracted.pages || []).map((page) => page.error_message).filter(Boolean),
        ...saved.rejected.map((item) => item.reason || item.reasons?.join(", ") || "").filter(Boolean)
      ].join(" | ").slice(0, 1200);
      await updateCompetitorSourceSyncStatus(source.id, status || "no_quotes", new Date().toISOString(), errorMessage, nextCompetitorSyncDate(source));
      results.push({
        source,
        status: status || "no_quotes",
        pages_analyzed: extracted.pages?.length || 0,
        quotes_found: extracted.quotes?.length || 0,
        quotes_saved: saved.saved.length,
        rejected: saved.rejected.length,
        error: errorMessage
      });
    }
    const finalStatus = sourcesFailed && sourcesSuccess ? "partial" : sourcesFailed && !sourcesSuccess ? "failed" : "success";
    const finished = await finishAiExtractionRun(run.id, {
      status: finalStatus,
      sources_success: sourcesSuccess,
      sources_failed: sourcesFailed,
      pages_analyzed: pagesAnalyzed,
      quotes_extracted: quotesExtracted,
      quotes_saved: quotesSaved,
      error_message: results.map((item) => item.error).filter(Boolean).join(" | ").slice(0, 1200),
      metadata: { results: results.slice(0, 20) }
    });
    const summary = await calculateCompetitorMarketSummary({ currency: goldPriceBaseCurrency }).catch(() => null);
    competitorAiExtractionState.lastStatus = finalStatus;
    competitorAiExtractionState.lastSummary = summary;
    competitorAiExtractionState.nextRunAt = new Date(Date.now() + competitorAiExtractionIntervalMinutes * 60 * 1000).toISOString();
    void writeAuditLog({
      req: options.req,
      user: options.user,
      action: "competitor_ai_extraction_run",
      entityType: "competitor_quotes",
      entityId: run.id,
      entityLabel: "Analisi AI competitor",
      afterData: publicAiExtractionRun(finished),
      metadata: { force }
    });
    return {
      ok: true,
      run: publicAiExtractionRun(finished),
      results,
      summary,
      status: competitorAiExtractionPublicStatus()
    };
  } catch (error) {
    competitorAiExtractionState.lastStatus = "failed";
    competitorAiExtractionState.lastError = error.message || "Analisi AI competitor non riuscita";
    if (run?.id) {
      await finishAiExtractionRun(run.id, {
        status: "failed",
        error_message: competitorAiExtractionState.lastError
      }).catch(() => {});
    }
    throw error;
  } finally {
    competitorAiExtractionState.running = false;
  }
}

function competitorAiExtractionPublicStatus() {
  return {
    enabled: competitorAiExtractionEnabled,
    auto_enabled: competitorAiAutoExtractionEnabled,
    running: competitorAiExtractionState.running,
    interval_minutes: competitorAiExtractionIntervalMinutes,
    on_startup: competitorAiExtractionOnStartup,
    max_pages_per_source: competitorAiMaxPagesPerSource,
    timeout_ms: competitorAiExtractionTimeoutMs,
    use_playwright: competitorAiUsePlaywright,
    max_text_chars: competitorAiMaxTextChars,
    model: competitorAiExtractionModel,
    openai_configured: Boolean(openai),
    last_run_at: competitorAiExtractionState.lastRunAt,
    next_run_at: competitorAiExtractionState.nextRunAt,
    last_status: competitorAiExtractionState.lastStatus,
    last_error: competitorAiExtractionState.lastError,
    last_run_id: competitorAiExtractionState.lastRunId,
    last_summary: competitorAiExtractionState.lastSummary
  };
}

function startCompetitorAiAutoExtraction() {
  if (!competitorAiExtractionEnabled || !competitorAiAutoExtractionEnabled || competitorAiExtractionState.timer) {
    return competitorAiExtractionPublicStatus();
  }
  competitorAiExtractionState.nextRunAt = new Date(Date.now() + competitorAiExtractionIntervalMinutes * 60 * 1000).toISOString();
  if (competitorAiExtractionOnStartup) {
    setTimeout(() => {
      runAiCompetitorQuoteExtraction({ force: true, user: { id: null, ruolo: "system" } }).catch((error) => {
        competitorAiExtractionState.lastStatus = "failed";
        competitorAiExtractionState.lastError = error.message || "Analisi AI startup fallita";
        console.error("Errore analisi AI competitor", error);
      });
    }, 5000).unref?.();
  }
  competitorAiExtractionState.timer = setInterval(() => {
    runAiCompetitorQuoteExtraction({ user: { id: null, ruolo: "system" } }).catch((error) => {
      competitorAiExtractionState.lastStatus = "failed";
      competitorAiExtractionState.lastError = error.message || "Analisi AI competitor fallita";
      console.error("Errore analisi AI competitor", error);
    });
  }, competitorAiExtractionIntervalMinutes * 60 * 1000);
  competitorAiExtractionState.timer.unref?.();
  return competitorAiExtractionPublicStatus();
}

function stopCompetitorAiAutoExtraction() {
  if (competitorAiExtractionState.timer) clearInterval(competitorAiExtractionState.timer);
  competitorAiExtractionState.timer = null;
  competitorAiExtractionState.nextRunAt = null;
  return competitorAiExtractionPublicStatus();
}

function scenarioPredictionPrice(prediction = {}, scenario = "standard") {
  const normalized = normalizeBuybackScenario(scenario);
  if (normalized === "prudente") return Number(prediction.predicted_low_per_gram || prediction.current_price_per_gram || 0);
  if (normalized === "aggressivo") return Number(prediction.predicted_high_per_gram || prediction.predicted_price_per_gram || prediction.current_price_per_gram || 0);
  if ((prediction.horizon || prediction.prediction_horizon) === "today") return Number(prediction.current_price_per_gram || prediction.predicted_price_per_gram || 0);
  return Number(prediction.predicted_price_per_gram || prediction.current_price_per_gram || 0);
}

function buybackScenarioModifiers(scenario = "standard") {
  const normalized = normalizeBuybackScenario(scenario);
  if (normalized === "prudente") return { marginMultiplier: 1.08, bufferMultiplier: 1.35, negotiationMultiplier: 1.2 };
  if (normalized === "aggressivo") return { marginMultiplier: 0.72, bufferMultiplier: 0.55, negotiationMultiplier: 0.65 };
  return { marginMultiplier: 1, bufferMultiplier: 1, negotiationMultiplier: 1 };
}

function calculateBestMarketClientPrice({
  metal = "gold",
  purity_code = "",
  max_payable_per_gram = 0,
  recommended_payable_per_gram = 0,
  competitor_avg_price_per_gram = 0,
  competitor_max_price_per_gram = 0,
  competitor_min_price_per_gram = 0,
  competitor_count = 0,
  best_competitor_name = "",
  best_competitor_price = 0,
  scenario = "standard",
  founderPolicy = {}
} = {}) {
  const maxPayable = Math.max(0, Number(max_payable_per_gram || 0));
  const recommended = Math.max(0, Number(recommended_payable_per_gram || 0));
  const competitorAvg = Math.max(0, Number(competitor_avg_price_per_gram || 0));
  const competitorMax = Math.max(0, Number(competitor_max_price_per_gram || best_competitor_price || 0));
  const competitorMin = Math.max(0, Number(competitor_min_price_per_gram || 0));
  const count = Number(competitor_count || 0);
  const normalizedScenario = normalizeBuybackScenario(scenario);
  const marketMatchDelta = Math.max(0, Number(founderPolicy.market_match_delta_per_gram || 0));
  const requireApproval = founderPolicy.require_founder_approval_if_competitor_above_max !== false;
  const allowAggressive = founderPolicy.allow_aggressive_market_match === true;
  const reference = best_competitor_name
    ? { competitor_name: best_competitor_name, price_per_gram: Number(best_competitor_price || competitorMax || 0) }
    : competitorMax
      ? { competitor_name: "Miglior competitor rilevato", price_per_gram: competitorMax }
      : null;

  const statusFromAverage = (price) => {
    if (!competitorAvg) return "no_competitor_data";
    const delta = price - competitorAvg;
    if (Math.abs(delta) <= Math.max(0.15, competitorAvg * 0.02)) return "aligned_market";
    return delta < 0 ? "below_market" : "above_market";
  };

  if (!count) {
    return {
      best_market_client_price_per_gram: recommended,
      comparison_status: "no_competitor_data",
      reason: "Nessun competitor configurato. Uso prezzo consigliato OroActive.",
      competitor_reference: null,
      safe_to_offer: recommended <= maxPayable,
      requires_founder_approval: false,
      competitor_min_price_per_gram: 0,
      competitor_avg_price_per_gram: 0,
      competitor_max_price_per_gram: 0
    };
  }

  if (normalizedScenario === "prudente") {
    return {
      best_market_client_price_per_gram: recommended,
      comparison_status: statusFromAverage(recommended),
      reason: "Scenario prudente: non inseguo competitor e mantengo il prezzo consigliato OroActive.",
      competitor_reference: reference,
      safe_to_offer: recommended <= maxPayable,
      requires_founder_approval: false,
      competitor_min_price_per_gram: competitorMin,
      competitor_avg_price_per_gram: competitorAvg,
      competitor_max_price_per_gram: competitorMax
    };
  }

  if (competitorMax > maxPayable) {
    return {
      best_market_client_price_per_gram: maxPayable,
      comparison_status: "competitor_too_high",
      reason: "Il competitor massimo supera il massimo pagabile OroActive. Per mantenere il margine target non è consigliato superarlo.",
      competitor_reference: reference,
      safe_to_offer: true,
      requires_founder_approval: requireApproval,
      competitor_min_price_per_gram: competitorMin,
      competitor_avg_price_per_gram: competitorAvg,
      competitor_max_price_per_gram: competitorMax
    };
  }

  if (competitorAvg && competitorAvg < recommended) {
    return {
      best_market_client_price_per_gram: recommended,
      comparison_status: "above_market",
      reason: "OroActive risulta già competitivo rispetto alla media competitor.",
      competitor_reference: reference,
      safe_to_offer: recommended <= maxPayable,
      requires_founder_approval: false,
      competitor_min_price_per_gram: competitorMin,
      competitor_avg_price_per_gram: competitorAvg,
      competitor_max_price_per_gram: competitorMax
    };
  }

  const target = normalizedScenario === "aggressivo"
    ? competitorMax + marketMatchDelta
    : Math.max(competitorAvg || recommended, Math.min(competitorMax + marketMatchDelta, maxPayable));
  const bestMarket = Math.min(maxPayable, Math.max(recommended, target));
  return {
    best_market_client_price_per_gram: bestMarket,
    comparison_status: statusFromAverage(bestMarket),
    reason: normalizedScenario === "aggressivo"
      ? "Scenario aggressivo: il prezzo si avvicina al miglior competitor senza superare il massimo pagabile."
      : "Scenario standard: il prezzo si avvicina al mercato rilevato senza superare il massimo pagabile.",
    competitor_reference: reference,
    safe_to_offer: bestMarket <= maxPayable,
    requires_founder_approval: normalizedScenario === "aggressivo" && !allowAggressive,
    competitor_min_price_per_gram: competitorMin,
    competitor_avg_price_per_gram: competitorAvg,
    competitor_max_price_per_gram: competitorMax
  };
}

function calculateBuybackRow(policy = {}, prediction = {}, scenario = "standard", settings = {}) {
  const normalizedPolicy = publicBuybackPolicyRow(policy);
  const normalizedScenario = normalizeBuybackScenario(scenario || settings.default_scenario);
  const modifiers = buybackScenarioModifiers(normalizedScenario);
  const volatility = prediction.volatility || "media";
  const volatilityBuffer = Number(settings.volatility_buffers?.[volatility] ?? defaultBuybackPolicySettings().volatility_buffers[volatility] ?? 0.01);
  const spotPrice = scenarioPredictionPrice(prediction, normalizedScenario);
  const theoretical = spotPrice * normalizedPolicy.purity_value;
  const recoverable = theoretical * (1 - normalizedPolicy.melting_loss_pct) * (1 - normalizedPolicy.refinery_spread_pct);
  const costs = normalizedPolicy.melting_cost_per_gram
    + normalizedPolicy.operating_cost_per_gram
    + Number(settings.fixed_practice_cost_per_gram || 0);
  const riskBuffer = (normalizedPolicy.risk_buffer_pct + volatilityBuffer) * modifiers.bufferMultiplier;
  const netRecoverable = Math.max(0, recoverable - costs);
  const marginTarget = Math.min(0.95, normalizedPolicy.margin_target_pct * modifiers.marginMultiplier);
  const maxPayable = Math.max(0, netRecoverable * (1 - marginTarget));
  const negotiationBuffer = normalizedPolicy.negotiation_buffer_pct * modifiers.negotiationMultiplier;
  const recommended = Math.max(0, maxPayable * (1 - negotiationBuffer - riskBuffer));
  const marginEstimated = Math.max(0, netRecoverable - maxPayable);
  const competitor = settings.competitorStats?.[`${normalizedPolicy.metal}:${normalizedPolicy.purity_code}`] || null;
  const competitorAvg = Number(competitor?.competitor_avg_price || 0);
  const competitorMax = Number(competitor?.competitor_max_price || 0);
  const competitorBest = Number(competitor?.best_competitor_price || competitorMax || 0);
  const bestMarket = calculateBestMarketClientPrice({
    metal: normalizedPolicy.metal,
    purity_code: normalizedPolicy.purity_code,
    max_payable_per_gram: maxPayable,
    recommended_payable_per_gram: recommended,
    competitor_avg_price_per_gram: competitorAvg,
    competitor_max_price_per_gram: competitorMax,
    competitor_min_price_per_gram: Number(competitor?.competitor_min_price || 0),
    competitor_count: Number(competitor?.competitor_count || 0),
    best_competitor_name: competitor?.best_competitor_name || "",
    best_competitor_price: competitorBest,
    scenario: normalizedScenario,
    founderPolicy: settings
  });
  return {
    metal: normalizedPolicy.metal,
    purity_code: normalizedPolicy.purity_code,
    label: normalizedPolicy.label,
    purity_value: normalizedPolicy.purity_value,
    currency: prediction.currency || "EUR",
    spot_price_per_gram: spotPrice,
    spot_price_per_kg: spotPrice * 1000,
    theoretical_value_per_gram: theoretical,
    recoverable_value_per_gram: netRecoverable,
    max_payable_per_gram: maxPayable,
    max_payable_per_kg: maxPayable * 1000,
    recommended_payable_per_gram: recommended,
    recommended_payable_per_kg: recommended * 1000,
    margin_estimated_per_gram: marginEstimated,
    margin_estimated_pct: marginTarget,
    competitor_avg_price: competitorAvg,
    competitor_min_price: Number(competitor?.competitor_min_price || 0),
    competitor_max_price: competitorMax,
    competitor_median_price: Number(competitor?.competitor_median_price || 0),
    competitor_count: Number(competitor?.competitor_count || 0),
    competitor_last_update: competitor?.competitor_last_update || null,
    best_competitor_name: competitor?.best_competitor_name || "",
    best_competitor_price: competitorBest,
    best_market_client_price_per_gram: Number(bestMarket.best_market_client_price_per_gram || recommended),
    best_market_client_price_per_kg: Number(bestMarket.best_market_client_price_per_gram || recommended) * 1000,
    market_comparison_status: bestMarket.comparison_status,
    market_price_reason: bestMarket.reason,
    competitor_reference: bestMarket.competitor_reference,
    safe_to_offer: bestMarket.safe_to_offer,
    requires_founder_approval: bestMarket.requires_founder_approval,
    difference_vs_avg: competitorAvg ? recommended - competitorAvg : null,
    difference_vs_max: competitorMax ? recommended - competitorMax : null,
    difference_vs_market_best: competitorBest ? Number(bestMarket.best_market_client_price_per_gram || recommended) - competitorBest : null,
    scenario: normalizedScenario,
    horizon: prediction.horizon || prediction.prediction_horizon || "today",
    prediction_horizon: prediction.horizon || prediction.prediction_horizon || "today",
    trend: prediction.trend || "laterale",
    volatility,
    costs_per_gram: costs,
    safety_spread_pct: riskBuffer,
    refinery_spread_pct: normalizedPolicy.refinery_spread_pct,
    melting_loss_pct: normalizedPolicy.melting_loss_pct,
    inputs: {
      margin_target_pct: marginTarget,
      negotiation_buffer_pct: negotiationBuffer,
      volatility_buffer_pct: volatilityBuffer,
      risk_buffer_pct: normalizedPolicy.risk_buffer_pct,
      competitor,
      best_market: bestMarket,
      model_name: prediction.model_name || "ensemble"
    }
  };
}

async function insertBuybackCalculation(row = {}) {
  const result = await pool.query(
    `INSERT INTO metal_buyback_calculations (
      metal, purity_code, currency, spot_price_per_gram, theoretical_value_per_gram,
      recoverable_value_per_gram, max_payable_per_gram, recommended_payable_per_gram,
      margin_estimated_per_gram, margin_estimated_pct, scenario, prediction_horizon, inputs
    ) VALUES (
      $1::text,$2::text,$3::text,$4::numeric,$5::numeric,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric,$11::text,$12::text,$13::jsonb
    )
    RETURNING *`,
    [
      row.metal,
      row.purity_code,
      row.currency,
      row.spot_price_per_gram,
      row.theoretical_value_per_gram,
      row.recoverable_value_per_gram,
      row.max_payable_per_gram,
      row.recommended_payable_per_gram,
      row.margin_estimated_per_gram,
      row.margin_estimated_pct,
      row.scenario,
      row.prediction_horizon,
      sanitizeForPostgres(row.inputs || {})
    ]
  );
  return { ...row, id: result.rows[0]?.id || null, created_at: result.rows[0]?.created_at || null };
}

async function calculateMetalBuyback(input = {}, user = {}, req = null) {
  const settings = await loadBuybackPolicySettings();
  const predictionSettings = await loadGoldPredictionSettings();
  const metals = (Array.isArray(input.metals) && input.metals.length ? input.metals : ["gold", "silver"])
    .map(normalizePredictionMetal)
    .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
  const currency = normalizePredictionCurrency(input.currency || goldPriceBaseCurrency);
  const horizons = (Array.isArray(input.horizons) && input.horizons.length ? input.horizons : ["today", "24h", "7d", "30d"])
    .map(normalizePredictionHorizon)
    .filter((value, index, array) => array.indexOf(value) === index);
  const scenario = normalizeBuybackScenario(input.scenario || settings.default_scenario);
  const predictionBundle = await runMetalPredictions({ metals, currency, horizons }, user, req);
  const predictionsByKey = new Map((predictionBundle.predictions || []).map((prediction) => [`${prediction.metal}:${prediction.horizon}`, prediction]));
  const competitorStats = await competitorQuoteStats({
    metals,
    currency,
    hours: predictionSettings.competitor_data_max_age_hours || 24
  }).catch(() => ({}));
  const enrichedSettings = { ...settings, ...predictionSettings, competitorStats };
  const calculations = [];
  for (const policy of settings.policies.filter((row) => metals.includes(row.metal) && row.active !== false)) {
    for (const horizon of horizons) {
      const prediction = predictionsByKey.get(`${policy.metal}:${horizon}`);
      if (!prediction) continue;
      const row = calculateBuybackRow(policy, prediction, scenario, enrichedSettings);
      try {
        calculations.push(await insertBuybackCalculation(row));
      } catch {
        calculations.push(row);
      }
    }
  }
  return {
    ok: true,
    metals,
    currency,
    scenario,
    warning: predictionBundle.warning || "",
    disclaimer: "Le previsioni sono stime statistiche indicative e non rappresentano garanzia di prezzo. Il prezzo massimo pagabile è calcolato secondo le policy OroActive configurate dal Founder. Il prezzo finale applicato al cliente resta responsabilità dell'operatore autorizzato e delle policy aziendali.",
    competitor_stats: competitorStats,
    predictions: predictionBundle.predictions || [],
    calculations
  };
}

async function latestBuybackCalculations({ currency = "EUR", limit = 220 } = {}) {
  const result = await pool.query(
    `SELECT *
       FROM metal_buyback_calculations
      WHERE currency = $1::text
      ORDER BY created_at DESC
      LIMIT $2::int`,
    [normalizePredictionCurrency(currency), Math.min(Math.max(Number(limit || 220), 1), 500)]
  );
  return result.rows.map((row) => ({
    ...(row.inputs?.best_market ? {
      best_market_client_price_per_gram: Number(row.inputs.best_market.best_market_client_price_per_gram || 0),
      best_market_client_price_per_kg: Number(row.inputs.best_market.best_market_client_price_per_gram || 0) * 1000,
      market_comparison_status: row.inputs.best_market.comparison_status || "",
      market_price_reason: row.inputs.best_market.reason || "",
      competitor_reference: row.inputs.best_market.competitor_reference || null,
      safe_to_offer: row.inputs.best_market.safe_to_offer,
      requires_founder_approval: row.inputs.best_market.requires_founder_approval
    } : {}),
    id: row.id,
    metal: row.metal,
    purity_code: row.purity_code,
    currency: row.currency,
    spot_price_per_gram: Number(row.spot_price_per_gram || 0),
    theoretical_value_per_gram: Number(row.theoretical_value_per_gram || 0),
    recoverable_value_per_gram: Number(row.recoverable_value_per_gram || 0),
    max_payable_per_gram: Number(row.max_payable_per_gram || 0),
    recommended_payable_per_gram: Number(row.recommended_payable_per_gram || 0),
    margin_estimated_per_gram: Number(row.margin_estimated_per_gram || 0),
    margin_estimated_pct: Number(row.margin_estimated_pct || 0),
    scenario: row.scenario,
    horizon: row.prediction_horizon,
    prediction_horizon: row.prediction_horizon,
    inputs: row.inputs || {},
    created_at: row.created_at
  }));
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
  if (["archived_completed", "archived", "archiviato", "archiviata", "archiviato completato", "archiviata completata"].includes(normalized)) return "archived_completed";
  if (["pending_approval", "in_attesa_autorizzazione", "in attesa autorizzazione", "attesa autorizzazione"].includes(normalized)) return "pending_approval";
  if (["approval_approved", "autorizzazione_approvata", "autorizzazione approvata"].includes(normalized)) return "approval_approved";
  if (["approval_rejected", "autorizzazione_rifiutata", "autorizzazione rifiutata"].includes(normalized)) return "approval_rejected";
  if (["suspended", "sospesa", "sospeso", "pratica sospesa", "pratiche sospese"].includes(normalized)) return "suspended";
  if (["draft", "bozza", "in bozza"].includes(normalized)) return "draft";
  if (["archived_incomplete", "archiviato incompleto", "archiviata incompleta"].includes(normalized)) return "archived_incomplete";
  if (["deleted", "eliminato", "eliminata", "cancellato", "cancellata"].includes(normalized)) return "deleted";
  if (["abandoned", "abbandonato", "abbandonata"].includes(normalized)) return "abandoned";
  return "archived_incomplete";
}

function normalizeSaleDeedStatus(status = "archived_incomplete") {
  return normalizeWorkflowStatus(status);
}

function realCompletedStatusSql(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `(COALESCE(${prefix}status, '') ILIKE 'completed'
      OR COALESCE(${prefix}status, '') ILIKE 'complete'
      OR COALESCE(${prefix}status, '') ILIKE 'Completato'
      OR COALESCE(${prefix}status, '') ILIKE 'Completata'
      OR COALESCE(${prefix}status, '') ILIKE 'archived_completed'
      OR COALESCE(${prefix}status, '') ILIKE 'archiviato completato'
      OR COALESCE(${prefix}status, '') ILIKE 'archiviata completata'
      OR ((COALESCE(${prefix}status, '') ILIKE 'archived'
          OR COALESCE(${prefix}status, '') ILIKE 'Archiviato'
          OR COALESCE(${prefix}status, '') ILIKE 'Archiviata')
        AND ${prefix}completed_at IS NOT NULL))
    AND ${prefix}deleted_at IS NULL`;
}

function visibleRealActStatusSql(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `${realCompletedStatusSql(alias)}
    AND NOT (${prefix}suspended_at IS NOT NULL AND ${prefix}resumed_at IS NULL)`;
}

function reservedActNumberStatusSql(alias = "") {
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
      OR ((COALESCE(${prefix}status, '') ILIKE 'archived'
          OR COALESCE(${prefix}status, '') ILIKE 'Archiviato'
          OR COALESCE(${prefix}status, '') ILIKE 'Archiviata')
        AND ${prefix}completed_at IS NULL)
      OR COALESCE(${prefix}status, '') ILIKE 'pending_approval'
      OR COALESCE(${prefix}status, '') ILIKE 'in_attesa_autorizzazione'
      OR COALESCE(${prefix}status, '') ILIKE 'approval_approved'
      OR COALESCE(${prefix}status, '') ILIKE 'autorizzazione_approvata'
      OR COALESCE(${prefix}status, '') ILIKE 'approval_rejected'
      OR COALESCE(${prefix}status, '') ILIKE 'autorizzazione_rifiutata'
      OR COALESCE(${prefix}status, '') ILIKE 'suspended'
      OR COALESCE(${prefix}status, '') ILIKE 'sospesa'
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

const GOLD_COIN_AI_CATALOG = [
  { id: "sterlina-oro-sovrana", name: "Sterlina d'oro", country: "Regno Unito", purity: "22 kt / 916,7 per mille", obverse: "ritratto sovrano britannico", reverse: "San Giorgio e drago o stemma", hints: ["sovereign", "sovrana", "san giorgio", "drago"] },
  { id: "marengo-20-lire-italia", name: "Marengo italiano 20 Lire", country: "Italia", purity: "900 per mille", obverse: "Re d'Italia", reverse: "stemma sabaudo e 20 Lire", hints: ["20 lire", "vittorio emanuele", "umberto", "regno d'italia"] },
  { id: "marengo-francese-20-franchi", name: "Marengo francese 20 Franchi", country: "Francia", purity: "900 per mille", obverse: "Napoleone, Marianne o Gallo", reverse: "20 Francs", hints: ["20 francs", "napoleon", "marianne", "gallo"] },
  { id: "napoleone-20-franchi-gallo-marianne", name: "Napoleone d'oro 20 Franchi Francesi", country: "Francia", purity: "900 per mille", obverse: "Marianne della Repubblica francese di J.C. Chaplain", reverse: "gallo gallico e 20 Francs", hints: ["napoleone d'oro", "20 francs", "marianne", "gallo", "coq", "chaplain", "liberte egalite fraternite"] },
  { id: "marengo-svizzero-vreneli", name: "Vreneli 20 Franchi", country: "Svizzera", purity: "900 per mille", obverse: "Helvetia / Vreneli", reverse: "stemma svizzero 20 FR", hints: ["helvetia", "vreneli", "20 fr", "croce"] },
  { id: "krugerrand-1-oz", name: "Krugerrand", country: "Sud Africa", purity: "22 kt / 916,7 per mille", obverse: "Paul Kruger", reverse: "springbok", hints: ["krugerrand", "kruger", "springbok"] },
  { id: "american-eagle-1-oz", name: "American Gold Eagle", country: "Stati Uniti", purity: "22 kt / 916,7 per mille", obverse: "Liberty", reverse: "aquila", hints: ["american eagle", "liberty", "50 dollars"] },
  { id: "american-buffalo-1-oz", name: "American Buffalo", country: "Stati Uniti", purity: "999,9 per mille", obverse: "profilo nativo americano", reverse: "bisonte", hints: ["buffalo", "bison", "indian head"] },
  { id: "maple-leaf-1-oz", name: "Maple Leaf", country: "Canada", purity: "999,9 per mille", obverse: "ritratto reale", reverse: "foglia d'acero", hints: ["maple leaf", "canada", "or pur", "fine gold"] },
  { id: "filarmonica-vienna-2026-1-oz", name: "Filarmonica di Vienna 2026", country: "Austria", purity: "999,9 per mille", obverse: "organo della Musikverein con 2026 e 100 Euro", reverse: "strumenti orchestrali Wiener Philharmoniker", hints: ["filarmonica vienna 2026", "wiener philharmoniker", "republik osterreich", "1 unze gold 999.9", "100 euro", "organo", "arpa", "violini"] },
  { id: "somalia-elephant-2023-1-oz", name: "Somalia Elephant 2023", country: "Somalia", purity: "999,9 per mille", obverse: "stemma Somali Republic e 1.000 Shillings", reverse: "elefante African Wildlife 1 oz Au 999.9", hints: ["somalia elephant 2023", "african wildlife", "elephant", "somali republic", "1000 shillings", "1 oz au 999.9"] },
  { id: "arca-noe-armenia-2025-1-oz", name: "Arca di Noe Armenia 2025", country: "Armenia", purity: "999,9 per mille", obverse: "stemma Repubblica d'Armenia 50.000 Dram 2025", reverse: "Arca di Noe Monte Ararat e colomba", hints: ["arca di noe", "noah's ark", "armenia 2025", "50000 dram", "republic of armenia", "ararat", "colomba", "geiger edelmetalle"] },
  { id: "britannia-1-oz", name: "Britannia", country: "Regno Unito", purity: "999,9 per mille dal 2013", obverse: "sovrano britannico", reverse: "Britannia con tridente", hints: ["britannia", "tridente", "100 pounds"] },
  { id: "kangaroo-nugget-1-oz", name: "Australian Kangaroo", country: "Australia", purity: "999,9 per mille", obverse: "ritratto reale", reverse: "canguro", hints: ["kangaroo", "nugget", "australia"] },
  { id: "libertad-1-oz", name: "Libertad", country: "Messico", purity: "999 per mille", obverse: "stemma messicano", reverse: "Vittoria alata", hints: ["libertad", "onza", "mexico"] },
  { id: "panda-cinese-30g", name: "Panda cinese 30 g", country: "Cina", purity: "999 per mille", obverse: "Tempio del Cielo", reverse: "panda", hints: ["panda", "china", "500 yuan"] },
  { id: "centenario-50-pesos", name: "50 Pesos Centenario", country: "Messico", purity: "900 per mille", obverse: "Vittoria alata", reverse: "aquila messicana", hints: ["50 pesos", "centenario", "37.5"] },
  { id: "ducato-austriaco", name: "Ducato austriaco", country: "Austria", purity: "986 per mille", obverse: "Francesco Giuseppe", reverse: "aquila bicipite", hints: ["ducat", "ducato", "1915", "franz joseph"] },
  { id: "20-dollari-double-eagle", name: "20 Dollars Double Eagle", country: "Stati Uniti", purity: "900 per mille", obverse: "Liberty o Saint-Gaudens", reverse: "aquila americana", hints: ["double eagle", "twenty dollars", "20 dollars"] },
  { id: "20-mark-germania", name: "20 Mark oro", country: "Germania", purity: "900 per mille", obverse: "sovrano o stemma", reverse: "aquila imperiale", hints: ["20 mark", "deutsches reich", "kaiser"] }
];

GOLD_COIN_AI_CATALOG.push(
  { id: "marengo-belga-20-franchi", name: "Marengo belga 20 Franchi", country: "Belgio", purity: "900 per mille", obverse: "regnante belga", reverse: "stemma o figura allegorica 20 Francs", hints: ["belgio", "belgique", "20 francs", "leopold"] },
  { id: "marengo-austriaco-20-franchi", name: "Marengo austriaco", country: "Austria", purity: "900 per mille", obverse: "Francesco Giuseppe", reverse: "aquila imperiale o valore", hints: ["austria", "franz joseph", "8 florins", "20 francs"] },
  { id: "sterlina-vecchio-conio", name: "Sterlina vecchio conio", country: "Regno Unito", purity: "22 kt / 916,7 per mille", obverse: "sovrano britannico storico", reverse: "San Giorgio e drago", hints: ["sterlina", "sovereign", "georgius", "victoria", "san giorgio"] },
  { id: "sudafrica-2-rand", name: "Sudafrica 2 Rand", country: "Sud Africa", purity: "22 kt / 916,7 per mille", obverse: "Jan van Riebeeck", reverse: "springbok e 2 Rand", hints: ["2 rand", "south africa", "jan van riebeeck", "springbok"] },
  { id: "cile-100-pesos", name: "Cile 100 Pesos", country: "Cile", purity: "900 per mille", obverse: "testa laureata della Repubblica", reverse: "stemma con stella, condor e cervo", hints: ["100 pesos", "cile", "chile", "condor"] },
  { id: "20-dollari-liberty", name: "20 Dollars Liberty Head", country: "Stati Uniti", purity: "900 per mille", obverse: "Liberty Head", reverse: "aquila con scudo", hints: ["20 dollars liberty", "liberty head", "double eagle"] },
  { id: "austria-100-corone", name: "Austria 100 Corone", country: "Austria", purity: "900 per mille", obverse: "Francesco Giuseppe", reverse: "aquila bicipite e 100 Corone", hints: ["100 corone", "100 corona", "austria", "1915"] },
  { id: "4-ducati-austriaci", name: "4 Ducati austriaci 1915", country: "Austria", purity: "986 per mille", obverse: "Francesco Giuseppe", reverse: "aquila bicipite", hints: ["4 ducati", "4 ducat", "1915", "franz joseph"] },
  { id: "10-dollari-indiano", name: "10 Dollars Indian Head", country: "Stati Uniti", purity: "900 per mille", obverse: "Liberty con copricapo indiano", reverse: "aquila americana", hints: ["10 dollars indian", "indian head", "ten dollars"] },
  { id: "10-dollari-liberty", name: "10 Dollars Liberty Head", country: "Stati Uniti", purity: "900 per mille", obverse: "Liberty Head", reverse: "aquila con scudo", hints: ["10 dollars liberty", "liberty head", "ten dollars"] },
  { id: "messico-20-pesos", name: "Messico 20 Pesos", country: "Messico", purity: "900 per mille", obverse: "calendario azteco", reverse: "aquila e serpente", hints: ["20 pesos", "mexico", "messico", "calendario azteco"] },
  { id: "austria-1000-scellini", name: "Austria 1000 Scellini", country: "Austria", purity: "900 per mille", obverse: "motivo commemorativo", reverse: "valore 1000 Schilling", hints: ["1000 scellini", "1000 schilling", "austria", "1976"] },
  { id: "ungheria-20-corone", name: "Ungheria 20 Corone", country: "Ungheria", purity: "900 per mille", obverse: "Francesco Giuseppe", reverse: "stemma ungherese con angeli", hints: ["20 corone", "20 korona", "ungheria", "hungary"] }
);

const goldCoinIdentificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    found: { type: "boolean" },
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
          visual_evidence: { type: "string" }
        },
        required: ["id", "confidence", "reason", "visual_evidence"]
      }
    },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["found", "matches", "warnings"]
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

function normalizeCoinCatalogForAi(inputCatalog = []) {
  const allowedIds = new Set(GOLD_COIN_AI_CATALOG.map((coin) => coin.id));
  const fromClient = Array.isArray(inputCatalog)
    ? inputCatalog
      .filter((coin) => allowedIds.has(String(coin.id || "")))
      .map((coin) => ({
        id: String(coin.id || ""),
        name: String(coin.name || "").slice(0, 120),
        country: String(coin.country || "").slice(0, 80),
        purity: String(coin.purityLabel || coin.purity || "").slice(0, 80),
        grossWeight: Number(coin.grossWeight || 0) || null,
        diameter: Number(coin.diameter || 0) || null,
        obverse: String(coin.obverse || "").slice(0, 220),
        reverse: String(coin.reverse || "").slice(0, 220),
        hints: Array.isArray(coin.recognitionHints) ? coin.recognitionHints.slice(0, 8) : []
      }))
    : [];
  return fromClient.length ? fromClient : GOLD_COIN_AI_CATALOG;
}

async function identifyGoldCoinWithOpenAi({ image = "", catalog = [] } = {}) {
  const imageDataUrl = validImageDataUrl(image);
  if (!imageDataUrl) {
    const error = new Error("Foto moneta non valida.");
    error.status = 400;
    throw error;
  }
  if (!openai) {
    return {
      ok: false,
      ai_configured: false,
      matches: [],
      message: "AI non configurata sul backend. Usa ricerca manuale per nome, paese, peso o titolo.",
      warnings: ["OPENAI_API_KEY non configurata"]
    };
  }
  const referenceCatalog = normalizeCoinCatalogForAi(catalog);
  const allowedIds = new Set(referenceCatalog.map((coin) => coin.id));
  const result = await openai.responses.create({
    model: openaiModel,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Sei un assistente di riconoscimento numismatico OroActive.
Analizza solo la foto pubblica di una moneta d'oro e confrontala con il catalogo fornito.
Non inventare monete fuori catalogo. Se non hai elementi sufficienti, found=false e matches vuoto.
Usa indizi visivi: legenda, sovrano, stemma, animale, valore, anno, bordo e composizione generale.
Non usare questa analisi come autenticazione definitiva: e solo supporto formativo.
Restituisci solo JSON valido secondo schema.

CATALOGO AMMESSO:
${JSON.stringify(referenceCatalog).slice(0, 14000)}`
        },
        { type: "input_image", image_url: imageDataUrl, detail: "high" }
      ]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "oroactive_gold_coin_identification",
        strict: true,
        schema: goldCoinIdentificationSchema
      }
    }
  });
  const parsed = parseOpenAiJson(result);
  const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
    .filter((match) => allowedIds.has(String(match.id || "")))
    .map((match) => ({
      id: String(match.id || ""),
      confidence: Math.max(0, Math.min(1, Number(match.confidence || 0))),
      reason: String(match.reason || "").slice(0, 260),
      visual_evidence: String(match.visual_evidence || "").slice(0, 260)
    }))
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, 3);
  return {
    ok: true,
    ai_configured: true,
    found: Boolean(parsed.found && matches.length),
    matches,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 5).map((item) => String(item).slice(0, 180)) : []
  };
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

async function extractBookTextFromBuffer({ filename = "", mimeType = "", buffer }) {
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

async function extractBookText({ filename = "", dataUrl = "" }) {
  const { mimeType, buffer } = uploadedDataUrlToBuffer(dataUrl);
  return extractBookTextFromBuffer({ filename, mimeType, buffer });
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

async function indexAiDocument({ titolo, autore, filename, extractedText, uploadedBy = null, metadata = {} }) {
  const normalizedText = normalizeBookText(extractedText);
  const bookHash = textHash(normalizedText);
  const chunks = chunkBookText(normalizedText);
  if (!chunks.length) {
    const error = new Error("Il libro non contiene testo estraibile sufficiente.");
    error.status = 400;
    throw error;
  }
  console.log("Chunks loaded:", chunks.length);

  const duplicate = await pool.query(
    `SELECT id, titolo, autore, filename, uploaded_by, created_at, (metadata->>'chunks')::int AS chunks
     FROM ai_documents
     WHERE (($1::text <> '' AND metadata->>'sourceKey' = $1::text) OR metadata->>'bookHash' = $2::text)
     ORDER BY created_at DESC
     LIMIT 1`,
    [metadata.sourceKey || "", bookHash]
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
        uploadedBy,
        {
          chunks: chunks.length,
          bookHash,
          sourceType: "book",
          searchMode: aiRuntime.pgvector ? "pgvector" : "full-text",
          embeddingModel: aiRuntime.pgvector ? openaiEmbeddingModel : null,
          ...metadata
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

async function uploadAiBook({ titolo, autore, filename, dataUrl }, user) {
  const extractedText = await extractBookText({ filename, dataUrl });
  return indexAiDocument({
    titolo: titolo || "La bilancia d'oro",
    autore: autore || "Christian Dinato",
    filename: filename || "libro-ai",
    extractedText,
    uploadedBy: user?.id || null,
    metadata: { sourceType: "book" }
  });
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

async function seedAurumBundledKnowledgeDocuments() {
  if (String(process.env.AURUM_BUNDLED_KNOWLEDGE_ENABLED || "true").toLowerCase() === "false") return [];
  const results = [];
  for (const source of aurumBundledKnowledgeDocuments) {
    const filePath = path.join(aurumBundledKnowledgeRoot, source.filename);
    try {
      const buffer = await fs.readFile(filePath);
      const extractedText = await extractBookTextFromBuffer({
        filename: source.filename,
        mimeType: "application/pdf",
        buffer
      });
      const indexed = await indexAiDocument({
        titolo: source.titolo,
        autore: source.autore,
        filename: source.filename,
        extractedText,
        uploadedBy: null,
        metadata: {
          sourceType: "book",
          documentKind: "normativa",
          sourceKey: `aurum-bundled-knowledge:${source.filename}`,
          category: source.category,
          bundled: true,
          originalFilename: source.filename
        }
      });
      results.push({ filename: source.filename, ok: true, duplicate: Boolean(indexed.duplicate), chunks: indexed.chunks || 0 });
    } catch (error) {
      console.warn(`Aurum knowledge document non indicizzato (${source.filename}):`, error.message || error);
      results.push({ filename: source.filename, ok: false, error: error.message || "Documento non indicizzato" });
    }
  }
  const indexedCount = results.filter((item) => item.ok && !item.duplicate).length;
  const duplicateCount = results.filter((item) => item.ok && item.duplicate).length;
  if (indexedCount || duplicateCount) {
    console.log(`Aurum knowledge normativa pronta: ${indexedCount} nuovi documenti, ${duplicateCount} gia presenti.`);
  }
  return results;
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

function publicAurumMemory(row = {}) {
  return {
    id: row.id,
    memory_text: row.memory_text || "",
    memory_type: row.memory_type || "work_preference",
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    user_name: [row.nome, row.cognome].filter(Boolean).join(" ") || row.username || row.email || "Utente OroActive",
    store: row.negozio || ""
  };
}

function normalizeAurumMemoryType(value = "") {
  const type = String(value || "").trim().toLowerCase();
  return [
    "work_preference",
    "training_preference",
    "operational_note",
    "communication_preference",
    "user_question",
    "user_feedback",
    "quiz_answer",
    "support_message"
  ].includes(type)
    ? type
    : "work_preference";
}

function sanitizeAurumMemoryText(text = "") {
  return String(text || "")
    .replace(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi, "[codice fiscale rimosso]")
    .replace(/\bIT\d{2}[A-Z0-9]{1,30}\b/gi, "[iban rimosso]")
    .replace(/(password\s*[:=]?\s*)\S+/gi, "$1[rimossa]")
    .replace(/\b\d{9,}\b/g, "[numero rimosso]")
    .trim();
}

function assertAurumMemoryIsAllowed(text = "") {
  const value = String(text || "").toLowerCase();
  if (/(diagnosi|malattia|salute|terapia|dato sanitario|cartella clinica)/i.test(value)) {
    const error = new Error("Memoria non salvata: contiene dati personali o sensibili.");
    error.status = 400;
    throw error;
  }
}

async function listAurumMemories(user = {}) {
  const result = await pool.query(
    `SELECT id, user_id, memory_text, memory_type, created_at, updated_at
     FROM aurum_user_memories
     WHERE user_id = $1::bigint
       AND deleted_at IS NULL
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 100`,
    [user.id]
  );
  return result.rows.map(publicAurumMemory);
}

async function listAllAurumMemories() {
  const result = await pool.query(
    `SELECT m.id, m.user_id, m.memory_text, m.memory_type, m.created_at, m.updated_at,
            u.nome, u.cognome, u.username, u.email, u.negozio
     FROM aurum_user_memories m
     LEFT JOIN utenti u ON u.id = m.user_id
     WHERE m.deleted_at IS NULL
     ORDER BY u.nome NULLS LAST, u.cognome NULLS LAST, m.updated_at DESC, m.created_at DESC
     LIMIT 500`,
    []
  );
  return result.rows.map(publicAurumMemory);
}

async function createAurumMemory(input = {}, user = {}) {
  const text = sanitizeAurumMemoryText(input.memory_text || input.text || "").slice(0, 1000);
  if (!text) {
    const error = new Error("Memoria Aurum vuota.");
    error.status = 400;
    throw error;
  }
  assertAurumMemoryIsAllowed(text);
  const result = await pool.query(
    `INSERT INTO aurum_user_memories (user_id, memory_text, memory_type)
     VALUES ($1::bigint, $2::text, $3::text)
     RETURNING id, memory_text, memory_type, created_at, updated_at`,
    [user.id, text, normalizeAurumMemoryType(input.memory_type)]
  );
  logUserActivity({
    userId: user.id,
    actorId: user.id,
    activityType: "aurum_memory_saved",
    entityType: "aurum_memory",
    entityId: result.rows[0]?.id,
    description: "Memoria Aurum salvata con consenso esplicito"
  });
  void writeAuditLog({
    user,
    action: "aurum_memory_created",
    entityType: "aurum_memory",
    entityId: result.rows[0]?.id,
    entityLabel: "Memoria Aurum",
    afterData: publicAurumMemory(result.rows[0]),
    metadata: { memory_type: normalizeAurumMemoryType(input.memory_type) }
  });
  return publicAurumMemory(result.rows[0]);
}

async function deleteAurumMemory(id, user = {}) {
  const result = await pool.query(
    `UPDATE aurum_user_memories
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid
       AND user_id = $2::bigint
       AND deleted_at IS NULL
     RETURNING id`,
    [id, user.id]
  );
  return result.rowCount > 0;
}

function publicAurumSupportRequest(row = {}, viewer = {}) {
  const viewerId = String(viewer?.id || "");
  const senderId = String(row.user_id || "");
  const recipientId = String(row.recipient_user_id || "");
  const isSender = Boolean(viewerId && senderId === viewerId);
  const isRecipient = Boolean(viewerId && recipientId === viewerId);
  const founderObserver = normalizeRole(viewer?.ruolo) === "founder" && !isSender && !isRecipient;
  return {
    id: row.id,
    requested_role: row.requested_role,
    recipient_user_id: row.recipient_user_id,
    message: row.message || "",
    response_message: row.response_message || "",
    status: row.status || "open",
    created_at: row.created_at,
    responded_at: row.responded_at,
    responded_by: row.responded_by,
    resolved_at: row.resolved_at,
    user_id: row.user_id,
    user_name: [row.sender_nome, row.sender_cognome].filter(Boolean).join(" ") || row.sender_username || row.sender_email || "Utente OroActive",
    recipient_name: [row.recipient_nome, row.recipient_cognome].filter(Boolean).join(" ") || row.recipient_username || row.recipient_email || "",
    respondent_name: [row.responder_nome, row.responder_cognome].filter(Boolean).join(" ") || row.responder_username || row.responder_email || "",
    store: row.sender_negozio || "",
    is_sender: isSender,
    is_recipient: isRecipient,
    founder_observer: founderObserver,
    can_reply: isRecipient,
    can_delete: isSender || isRecipient
  };
}

async function listAurumSupportRequests(user = {}) {
  const role = normalizeRole(user.ruolo);
  const params = role === "founder" ? [] : [user.id];
  const visibility = role === "founder"
    ? ""
    : "AND (r.user_id = $1::bigint OR r.recipient_user_id = $1::bigint)";
  const result = await pool.query(
    `SELECT r.*,
            sender.nome AS sender_nome,
            sender.cognome AS sender_cognome,
            sender.username AS sender_username,
            sender.email AS sender_email,
            sender.negozio AS sender_negozio,
            recipient.nome AS recipient_nome,
            recipient.cognome AS recipient_cognome,
            recipient.username AS recipient_username,
            recipient.email AS recipient_email,
            responder.nome AS responder_nome,
            responder.cognome AS responder_cognome,
            responder.username AS responder_username,
            responder.email AS responder_email
     FROM aurum_support_requests r
     LEFT JOIN utenti sender ON sender.id = r.user_id
     LEFT JOIN utenti recipient ON recipient.id = r.recipient_user_id
     LEFT JOIN utenti responder ON responder.id = r.responded_by
     WHERE r.status IN ('open', 'in_progress')
       AND r.deleted_at IS NULL
       ${visibility}
     ORDER BY r.created_at DESC
     LIMIT 200`,
    params
  );
  return result.rows.map((row) => publicAurumSupportRequest(row, user));
}

async function replyAurumSupportRequest(id, input = {}, user = {}) {
  const reply = String(input.response_message || input.reply || input.message || "").trim().slice(0, 2000);
  if (!reply) {
    const error = new Error("Risposta messaggio obbligatoria.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE aurum_support_requests r
     SET response_message = $2::text,
         responded_by = $3::bigint,
         responded_at = NOW(),
         status = 'in_progress'
     WHERE r.id = $1::uuid
       AND r.recipient_user_id = $3::bigint
       AND r.deleted_at IS NULL
     RETURNING r.*,
       (SELECT nome FROM utenti WHERE id = r.user_id) AS sender_nome,
       (SELECT cognome FROM utenti WHERE id = r.user_id) AS sender_cognome,
       (SELECT username FROM utenti WHERE id = r.user_id) AS sender_username,
       (SELECT email FROM utenti WHERE id = r.user_id) AS sender_email,
       (SELECT negozio FROM utenti WHERE id = r.user_id) AS sender_negozio,
       (SELECT nome FROM utenti WHERE id = r.recipient_user_id) AS recipient_nome,
       (SELECT cognome FROM utenti WHERE id = r.recipient_user_id) AS recipient_cognome,
       (SELECT username FROM utenti WHERE id = r.recipient_user_id) AS recipient_username,
       (SELECT email FROM utenti WHERE id = r.recipient_user_id) AS recipient_email,
       (SELECT nome FROM utenti WHERE id = r.responded_by) AS responder_nome,
       (SELECT cognome FROM utenti WHERE id = r.responded_by) AS responder_cognome,
       (SELECT username FROM utenti WHERE id = r.responded_by) AS responder_username,
       (SELECT email FROM utenti WHERE id = r.responded_by) AS responder_email`,
    [id, reply, user.id]
  );
  if (!result.rows[0]) return null;
  logUserActivity({
    userId: result.rows[0].user_id,
    actorId: user.id,
    activityType: "aurum_message_replied",
    entityType: "aurum_support_request",
    entityId: result.rows[0].id,
    description: "Risposta a messaggio riservato Aurum"
  });
  return publicAurumSupportRequest(result.rows[0], user);
}

async function deleteAurumSupportRequest(id, user = {}) {
  const result = await pool.query(
    `UPDATE aurum_support_requests r
     SET status = 'dismissed',
         deleted_at = NOW(),
         resolved_by = $2::bigint,
         resolved_at = NOW()
     WHERE r.id = $1::uuid
       AND r.deleted_at IS NULL
       AND (r.user_id = $2::bigint OR r.recipient_user_id = $2::bigint)
     RETURNING id`,
    [id, user.id]
  );
  return result.rowCount > 0;
}

async function createAurumSupportRequest(input = {}, user = {}) {
  const recipientUserId = Number(input.recipient_user_id || input.recipientUserId || input.to_user_id || input.toUserId || 0);
  if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
    const error = new Error("Destinatario messaggio obbligatorio.");
    error.status = 400;
    throw error;
  }
  if (String(recipientUserId) === String(user.id)) {
    const error = new Error("Seleziona un destinatario diverso dal tuo utente.");
    error.status = 400;
    throw error;
  }
  const recipientResult = await pool.query(
    `SELECT id, ruolo, nome, cognome, username, email
     FROM utenti
     WHERE id = $1::bigint
       AND COALESCE(attivo, true) = true`,
    [recipientUserId]
  );
  const recipient = recipientResult.rows[0];
  if (!recipient) {
    const error = new Error("Destinatario messaggio non valido.");
    error.status = 400;
    throw error;
  }
  const message = String(input.message || "Messaggio Aurum").trim().slice(0, 2000);
  if (!message) {
    const error = new Error("Messaggio obbligatorio.");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO aurum_support_requests (user_id, recipient_user_id, requested_role, message, status)
     VALUES ($1::bigint, $2::bigint, $3::text, $4::text, 'open')
     RETURNING *`,
    [user.id, recipientUserId, normalizeRole(recipient.ruolo), message]
  );
  logUserActivity({
    userId: user.id,
    actorId: user.id,
    activityType: "aurum_support_request",
    entityType: "aurum_support_request",
    entityId: result.rows[0]?.id,
    description: `Messaggio Aurum inviato a utente ${recipientUserId}`
  });
  void createNotification({
    userId: recipientUserId,
    title: "Richiesta supporto Aurum",
    message: "L'utente ha richiesto supporto tramite Aurum.",
    type: "aurum_support_request",
    severity: "warning",
    entityType: "aurum_support_request",
    entityId: result.rows[0]?.id,
    actionUrl: "#users",
    metadata: {
      request_id: result.rows[0]?.id,
      sender_id: user.id
    },
    createdBy: user.id,
    actor: user
  });
  return publicAurumSupportRequest({
    ...result.rows[0],
    sender_nome: user.nome,
    sender_cognome: user.cognome,
    sender_username: user.username,
    sender_email: user.email,
    sender_negozio: user.negozio,
    recipient_nome: recipient.nome,
    recipient_cognome: recipient.cognome,
    recipient_username: recipient.username,
    recipient_email: recipient.email
  }, user);
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

function aiChunkSourceLabel(chunk = {}) {
  const sourceType = chunk.metadata?.sourceType || "";
  if (sourceType === "note") return "Procedura OroActive approvata";
  if (sourceType === "academy") return "Materiale OroActive Academy";
  if (chunk.metadata?.documentKind === "normativa") return "Normativa e documentazione OroActive";
  return "La bilancia d'oro";
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
            COALESCE(m.external_url, m.file_url, '') AS material_url,
            COALESCE(m.metadata::text, '') AS material_metadata
     FROM courses c
     LEFT JOIN academy_lessons l ON l.course_id = c.id
     LEFT JOIN academy_materials m ON m.course_id = c.id
     WHERE c.active = TRUE
       AND EXISTS (
         SELECT 1 FROM unnest($1::text[]) term
         WHERE LOWER(COALESCE(c.title, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(l.title, '') || ' ' || COALESCE(l.description, '') || ' ' || COALESCE(m.title, '') || ' ' || COALESCE(m.metadata::text, '')) LIKE '%' || term || '%'
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
      row.material_url,
      row.material_metadata
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
  const mode = options.mode === "quiz"
    ? "quiz"
    : options.mode === "tutorial_operativo"
      ? "tutorial_operativo"
      : options.mode === "price_explanation"
        ? "price_explanation"
        : "chat";
  const aurumContext = sanitizeForPostgres(options.context || {});
  const priceExplanationContext = aurumContext.priceExplanationContext && typeof aurumContext.priceExplanationContext === "object"
    ? aurumContext.priceExplanationContext
    : {};
  const aurumMemories = Array.isArray(aurumContext.availableMemories)
    ? aurumContext.availableMemories.map((item) => String(item || "").slice(0, 240)).filter(Boolean).slice(0, 8)
    : [];
  const aurumGuide = aurumContext.appGuide && typeof aurumContext.appGuide === "object" ? aurumContext.appGuide : {};
  const aurumFields = Array.isArray(aurumContext.visibleFields) ? aurumContext.visibleFields.slice(0, 24).join(", ") : "";
  const aurumActions = Array.isArray(aurumContext.availableActions) ? aurumContext.availableActions.slice(0, 24).join(", ") : "";
  const aurumGuideText = [
    aurumGuide.title ? `Guida sezione: ${String(aurumGuide.title).slice(0, 120)}` : "",
    aurumGuide.description ? `Descrizione: ${String(aurumGuide.description).slice(0, 500)}` : "",
    Array.isArray(aurumGuide.fields) ? `Campi noti: ${aurumGuide.fields.slice(0, 30).join(", ")}` : "",
    Array.isArray(aurumGuide.actions) ? `Azioni note: ${aurumGuide.actions.slice(0, 30).join(", ")}` : "",
    Array.isArray(aurumGuide.steps) ? `Procedura: ${aurumGuide.steps.slice(0, 12).map((step, index) => `${index + 1}. ${step}`).join(" ")}` : "",
    Array.isArray(aurumGuide.commonErrors) ? `Errori comuni: ${aurumGuide.commonErrors.slice(0, 12).join(", ")}` : ""
  ].filter(Boolean).join("\n");
  const aurumSectionContext = [
    options.section || aurumContext.currentSection ? `Sezione app: ${String(options.section || aurumContext.currentSection).slice(0, 80)}` : "",
    aurumContext.currentSubSection ? `Sottosezione: ${String(aurumContext.currentSubSection).slice(0, 120)}` : "",
    aurumContext.userRole || aurumContext.role ? `Ruolo utente: ${String(aurumContext.userRole || aurumContext.role).slice(0, 80)}` : "",
    aurumContext.storeName || aurumContext.store ? `Negozio: ${String(aurumContext.storeName || aurumContext.store).slice(0, 120)}` : "",
    aurumFields ? `Campi visibili: ${aurumFields}` : "",
    aurumActions ? `Azioni visibili: ${aurumActions}` : "",
    aurumGuideText,
    aurumMemories.length ? `Memorie consensuali utente: ${aurumMemories.join(" | ")}` : ""
  ].filter(Boolean).join("\n");
  const priceExplanationText = mode === "price_explanation"
    ? `Modalita prezzo: spiega il prezzo in modo operativo da compro oro. Contesto prezzo JSON senza dati cliente:\n${JSON.stringify(priceExplanationContext).slice(0, 8000)}`
    : "";
  const context = chunks.map((chunk, index) => (
    `[Fonte ${index + 1}: ${aiChunkSourceLabel(chunk)} - ${chunk.titolo || "Knowledge base"}, chunk ${chunk.chunk_index}]\n${chunk.content}`
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
      input: `${String(options.interface || "").includes("aurum") ? `Sei Aurum, assistente operativo intelligente di OroActive. Aiuti gli utenti a usare l'app in modo preciso, pratico e sicuro. Devi comprendere la sezione in cui si trova l'utente, spiegare campi, pulsanti e procedure con passaggi chiari. Quando serve, genera tutorial passo-passo con titolo attività, obiettivo, prerequisiti, passaggi numerati, controlli, errori da evitare e cosa fare alla fine. Non dare risposte generiche. Non inventare funzioni o pulsanti non presenti nel contesto. Se non conosci una funzione, dillo e suggerisci di chiedere al founder. Se la richiesta riguarda dati sensibili dei clienti, mantieni privacy e limita il contesto. Adatta il livello della risposta al ruolo dell'utente.${mode === "price_explanation" ? " Quando spieghi un prezzo nella sezione Quotazione devi essere preciso, pratico e comprensibile. Devi spiegare il calcolo partendo dal prezzo puro di borsa, convertendolo in €/g, applicando la purezza della caratura o del titolo, poi sottraendo costi, fonderia, spread, buffer e margine target. Devi distinguere valore teorico, massimo pagabile, prezzo consigliato e miglior prezzo di mercato sostenibile. Devi spiegare anche perché la previsione indica rialzo, ribasso o lateralità, citando trend, medie mobili, volatilità e storico dati se disponibili. Se ci sono competitor, cita media, miglior competitor, fonte, evidence text disponibile, stato delle regole di estrazione guidata e motivo per cui non superare il massimo pagabile. Se una fonte non viene letta, spiega in modo operativo se mancano regole, URL leggibile, anchor, selettore, regex o prova testuale. Non promettere prezzi certi e non dare consulenza finanziaria." : ""}` : `Sei l'Assistente IA OroActive, esperto di compro oro, oro, argento, platino, diamanti, gemme, gestione negozio, procedure operative e formazione operatori.`}
Rispondi sempre in italiano, in modo chiaro, pratico, professionale.
Usa prima il libro "La bilancia d'oro" di Christian Dinato, poi le procedure/conoscenze OroActive approvate.
Le conoscenze OroActive approvate possono essere piu recenti e operative del libro: se sono piu dettagliate, integrale alla risposta senza ignorarle.
Se il contesto della knowledge base e sufficiente, rispondi usando solo i passaggi forniti.
Se il contesto interno e parziale o assente e sono presenti risultati web, integra con la sezione "Risposta integrata con ricerca web" citando solo i risultati web forniti.
Se il contesto non contiene abbastanza informazioni e non sono presenti risultati web, devi scrivere esattamente: "Non ho trovato una risposta sufficiente nelle fonti interne e la ricerca Internet non è disponibile."
Non inventare fonti web aggiornate: usa soltanto i risultati web forniti nel contesto.
Non attribuire al libro contenuti non presenti nei passaggi forniti.
Non citare leggi o norme come certe se non sono presenti nel contesto: in quel caso suggerisci verifica professionale.
Modalita richiesta: ${mode === "quiz" ? "Quiz Operatore. Genera un quiz formativo pratico con domande e risposte, basato sui passaggi trovati." : mode === "tutorial_operativo" ? "Tutorial operativo. Rispondi con guida concreta, passo-passo, senza vaghezza." : mode === "price_explanation" ? "Spiegazione prezzo Quotazione. Rispondi con questa struttura: titolo, punto di partenza, calcolo purezza, valore teorico, costi e rientro compro oro, massimo pagabile, prezzo consigliato, fluttuazione prevista, confronto competitor se disponibile, avviso finale. Usa solo i dati nel contesto prezzo; se un dato manca, dichiaralo." : "Assistente operativo."}

CONTESTO APP AURUM:
${aurumSectionContext || "Nessun contesto app fornito."}

CONTESTO PREZZO AURUM:
${priceExplanationText || "Nessun contesto prezzo specifico."}

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
  return ["draft", "suspended", "pending_approval", "approval_approved", "approval_rejected", "annullata", "deleted", "abandoned"].includes(normalized);
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

async function enforceCashAntiMoneyLaundering(act, user, existing = null, options = {}) {
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
  if (!isDraftLikeStatus(act.status) && !check.ok && !options.allowApproved) {
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
  const shieldScore = row.shield_score ?? row.aurum_shield_score ?? null;
  const shieldRiskLevel = row.shield_risk_level || row.aurum_shield_risk_level || "";
  const shieldFactors = row.shield_factors || row.aurum_shield_factors || [];
  const rawStatus = row.status || payload.status || "archived_incomplete";
  const normalizedStatus = normalizeWorkflowStatus(rawStatus);
  const effectiveStatus = normalizedStatus === "archived_completed"
    && !row.completed_at
    && /^(archived|archiviato|archiviata)$/i.test(String(rawStatus || "").trim())
      ? "suspended"
      : normalizedStatus;
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
    status: effectiveStatus,
    createdAt: row.created_at || payload.createdAt || null,
    completedAt: row.completed_at || payload.completedAt || null,
    archivedAt: row.archived_at || payload.archivedAt || null,
    deletedAt: row.deleted_at || payload.deletedAt || null,
    deletedBy: row.deleted_by || payload.deletedBy || null,
    suspendedReason: row.suspended_reason || payload.suspendedReason || "",
    suspendedReasons: Array.isArray(row.suspended_reasons) ? row.suspended_reasons : payload.suspendedReasons || [],
    suspendedAt: row.suspended_at || payload.suspendedAt || null,
    suspendedBy: row.suspended_by || payload.suspendedBy || null,
    resumedAt: row.resumed_at || payload.resumedAt || null,
    resumedBy: row.resumed_by || payload.resumedBy || null,
    approvalStatus: row.approval_status || payload.approvalStatus || "",
    approvalRequestId: row.approval_request_id || payload.approvalRequestId || null,
    approvalRequiredAt: row.approval_required_at || payload.approvalRequiredAt || null,
    operatorId: row.operatore_id || payload.operatorId || payload.operatore_id || null,
    operatorUsername: row.operator_username || payload.operatorUsername || "",
    operatorName: [row.operator_nome, row.operator_cognome].filter(Boolean).join(" ") || payload.operatorName || "",
    aurumShield: shieldScore !== null && shieldScore !== undefined
      ? {
        score: Number(shieldScore || 0),
        risk_level: shieldRiskLevel || "basso",
        summary: row.shield_summary || row.aurum_shield_summary || "",
        factors: Array.isArray(shieldFactors) ? shieldFactors : [],
        updated_at: row.shield_updated_at || row.aurum_shield_updated_at || null
      }
      : payload.aurumShield || null,
    qualityCheck: row.quality_check_status
      ? {
        status: row.quality_check_status,
        score: Number(row.quality_check_score || 0),
        summary: row.quality_check_summary || "",
        updated_at: row.quality_check_updated_at || null
      }
      : payload.qualityCheck || null
  };
}

function publicPrivacyPolicy(row = {}) {
  const content = row.content && Object.keys(row.content || {}).length ? row.content : defaultPrivacyPolicyContent;
  return {
    ...defaultPrivacyPolicyContent,
    ...content,
    version: row.version || content.version || privacyPolicyVersion,
    title: row.title || content.title || defaultPrivacyPolicyContent.title,
    updated_at: content.updated_at || privacyPolicyUpdatedAt,
    created_at: row.created_at || null,
    is_active: row.is_active !== false
  };
}

function publicPrivacyAcceptance(row = {}) {
  if (!row?.id) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    policy_version: row.policy_version,
    accepted_at: row.accepted_at,
    user_name: row.user_name || "",
    user_role: row.user_role || "",
    username: row.username || ""
  };
}

async function bootstrapPrivacyPolicy() {
  await pool.query(
    `INSERT INTO privacy_policy_versions (version, title, content, is_active, created_at)
     VALUES ($1::text, $2::text, $3::jsonb, TRUE, NOW())
     ON CONFLICT (version) DO UPDATE
     SET title = EXCLUDED.title,
         content = EXCLUDED.content`,
    [privacyPolicyVersion, defaultPrivacyPolicyContent.title, sanitizeForPostgres(defaultPrivacyPolicyContent)]
  );
  const active = await pool.query("SELECT id FROM privacy_policy_versions WHERE is_active = TRUE LIMIT 1");
  if (!active.rowCount) {
    await pool.query("UPDATE privacy_policy_versions SET is_active = TRUE WHERE version = $1::text", [privacyPolicyVersion]);
  }
}

async function currentPrivacyPolicy() {
  const result = await pool.query(
    "SELECT * FROM privacy_policy_versions WHERE is_active = TRUE ORDER BY created_at DESC, id DESC LIMIT 1"
  );
  if (result.rowCount) return publicPrivacyPolicy(result.rows[0]);
  return publicPrivacyPolicy({ version: privacyPolicyVersion, title: defaultPrivacyPolicyContent.title, content: defaultPrivacyPolicyContent, is_active: true });
}

async function listPrivacyPolicyVersions() {
  const result = await pool.query(
    `SELECT id, version, title, is_active, created_by, created_at
     FROM privacy_policy_versions
     ORDER BY is_active DESC, created_at DESC, id DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    is_active: row.is_active !== false,
    created_by: row.created_by || null,
    created_at: row.created_at
  }));
}

async function getPrivacyAcceptance(user = {}, version = "") {
  if (!user?.id) return null;
  const policyVersion = version || (await currentPrivacyPolicy()).version;
  const result = await pool.query(
    `SELECT ppa.*
     FROM privacy_policy_acceptances ppa
     WHERE ppa.user_id = $1::bigint
       AND ppa.policy_version = $2::text
     ORDER BY ppa.accepted_at DESC
     LIMIT 1`,
    [user.id, policyVersion]
  );
  return publicPrivacyAcceptance(result.rows[0] || null);
}

async function acceptPrivacyPolicy(input = {}, user = {}, req = null) {
  const policy = await currentPrivacyPolicy();
  const version = String(input.version || policy.version || privacyPolicyVersion).trim();
  if (!version) {
    const error = new Error("Versione privacy non valida");
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO privacy_policy_acceptances (user_id, policy_version, accepted_at, ip_address, user_agent)
     VALUES ($1::bigint, $2::text, NOW(), $3::text, $4::text)
     ON CONFLICT (user_id, policy_version) DO UPDATE
     SET accepted_at = NOW(),
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent
     RETURNING *`,
    [user.id, version, auditRequestIp(req), req?.headers?.["user-agent"] || ""]
  );
  void writeAuditLog({
    req,
    user,
    action: "privacy_policy_accepted",
    entityType: "privacy_policy",
    entityId: version,
    entityLabel: `Privacy Policy ${version}`,
    metadata: { policy_version: version }
  });
  return {
    ok: true,
    message: "Presa visione registrata correttamente",
    acceptance: publicPrivacyAcceptance(result.rows[0])
  };
}

async function listPrivacyPolicyAcceptances(user = {}) {
  if (normalizeRole(user?.ruolo) !== "founder") {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `SELECT ppa.*,
            CONCAT_WS(' ', u.nome, u.cognome) AS user_name,
            u.ruolo AS user_role,
            COALESCE(u.username, u.email) AS username
     FROM privacy_policy_acceptances ppa
     LEFT JOIN utenti u ON u.id = ppa.user_id
     ORDER BY ppa.accepted_at DESC
     LIMIT 200`
  );
  return result.rows.map(publicPrivacyAcceptance);
}

function writePrivacyPolicyPdf(response, policy) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="privacy-policy-oroactive-${policy.version || privacyPolicyVersion}.pdf"`);
  doc.pipe(response);
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(18).text("Centro Privacy OroActive", { align: "center" });
  doc.moveDown(0.4);
  doc.fillColor("#ff6a00").fontSize(13).text(policy.title || defaultPrivacyPolicyContent.title, { align: "center" });
  doc.moveDown(0.4);
  doc.fillColor("#555").font("Helvetica").fontSize(9).text(`Versione ${policy.version || privacyPolicyVersion} - Aggiornamento ${policy.updated_at || privacyPolicyUpdatedAt}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#333").text(policy.note || defaultPrivacyPolicyContent.note, { lineGap: 2 });
  (policy.sections || []).forEach((section) => {
    doc.moveDown(0.8);
    if (doc.y > 710) doc.addPage();
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(12).text(section.title || section.tab || "Sezione privacy");
    (section.paragraphs || []).forEach((paragraph) => {
      doc.fillColor("#444").font("Helvetica").fontSize(9).text(paragraph, { lineGap: 2 });
    });
    (section.items || []).slice(0, 18).forEach((item) => {
      doc.fillColor("#444").font("Helvetica").fontSize(8.5).text(`• ${item}`, { indent: 10, lineGap: 1 });
    });
    (section.groups || []).forEach((group) => {
      doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text(group.title || "");
      (group.items || []).slice(0, 16).forEach((item) => {
        doc.fillColor("#444").font("Helvetica").fontSize(8.2).text(`• ${item}`, { indent: 10, lineGap: 1 });
      });
    });
    if (section.closing) doc.fillColor("#555").font("Helvetica-Oblique").fontSize(8.5).text(section.closing, { lineGap: 2 });
  });
  doc.moveDown();
  doc.fillColor("#777").fontSize(8).text("Documento generato digitalmente dal gestionale OroActive. Bozza da far revisionare al consulente privacy.", { align: "center" });
  doc.end();
}

async function initDatabase() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await setupAiVectorStorage();
  await seedAurumBundledKnowledgeDocuments();
  await bootstrapStores();
  await bootstrapAdminUser();
  await bootstrapPrivacyPolicy();
  await seedDefaultCompetitorSources();
  await seedDefaultCompetitorExtractionRules();
  try {
    await ensureGoldMasterCourseInCatalog();
  } catch (error) {
    console.warn("Seed Oro Master non completato:", error.message);
  }
}

function backupTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}_${pad(date.getMonth() + 1)}_${pad(date.getDate())}_${pad(date.getHours())}_${pad(date.getMinutes())}_${pad(date.getSeconds())}`;
}

function backupCode(date = new Date()) {
  const stamp = backupTimestamp(date).replace(/_/g, "");
  return `OA-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function backupStatusLabel(status = "") {
  return {
    pending: "pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    deleted: "deleted"
  }[String(status || "").toLowerCase()] || "pending";
}

function isMissingExecutable(error) {
  return error?.code === "ENOENT" || /not found|no such file/i.test(String(error?.message || ""));
}

function backupToolUnavailableMessage(tool) {
  return `${tool} non disponibile nel container. Installare PostgreSQL client tools o usare immagine con ${tool}.`;
}

function databaseInfoFromUrl(databaseUrl = process.env.DATABASE_URL, overrideDatabase = null) {
  if (!databaseUrl) return null;
  const parsed = new URL(databaseUrl);
  const databaseName = overrideDatabase || decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: databaseName,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    sslmode: parsed.searchParams.get("sslmode") || (process.env.DATABASE_SSL === "true" ? "require" : ""),
    originalDatabase: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    masked: `${parsed.protocol}//${parsed.username ? `${parsed.username}:***@` : ""}${parsed.host}/${databaseName || ""}`
  };
}

function postgresToolEnv(databaseName = null) {
  const info = databaseInfoFromUrl(process.env.DATABASE_URL, databaseName);
  if (!info) return null;
  return {
    ...process.env,
    PGHOST: info.host,
    PGPORT: info.port,
    PGDATABASE: info.database,
    PGUSER: info.user,
    PGPASSWORD: info.password,
    ...(info.sslmode ? { PGSSLMODE: info.sslmode } : {})
  };
}

function quoteIdentifier(value = "") {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function directoryStats(root) {
  const stats = { files: 0, bytes: 0 };
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const fileStats = await fs.stat(fullPath);
        stats.files += 1;
        stats.bytes += fileStats.size;
      }
    }
  }
  await walk(root);
  return stats;
}

async function addBackupLog(backupId, level, message, metadata = {}) {
  await pool.query(
    `INSERT INTO backup_logs (backup_id, level, message, metadata)
     VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)`,
    [backupId, level, message, sanitizeForPostgres(metadata)]
  ).catch((error) => console.error("BACKUP LOG ERROR", error.message || error));
}

async function createPostgresBackup(outputPath, backupId = null) {
  if (!process.env.DATABASE_URL) {
    throw new Error("Backup fallito: configurazione database non disponibile.");
  }
  const env = postgresToolEnv();
  try {
    await execFileAsync(pgDumpPath, ["-Fc", "-f", outputPath, "--no-owner", "--no-privileges"], {
      env,
      timeout: 20 * 60 * 1000,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    if (isMissingExecutable(error)) throw new Error(backupToolUnavailableMessage("pg_dump"));
    throw new Error(`Backup fallito: ${String(error?.stderr || error?.message || "pg_dump non riuscito").slice(0, 500)}`);
  }
  const stats = await fs.stat(outputPath);
  if (!stats.size) throw new Error("Backup fallito: database.dump vuoto.");
  if (backupId) await addBackupLog(backupId, "info", "database.dump creato con pg_dump -Fc", { size: stats.size });
  return { path: outputPath, size: stats.size };
}

async function copyBackupFileSources(targetDir, backupId) {
  const skipped = [];
  for (const item of backupFileSources) {
    const sourcePath = path.join(__dirname, item.source);
    const targetPath = path.join(targetDir, item.target);
    const resolvedSource = path.resolve(sourcePath);
    if (path.resolve(backupDirectory) && resolvedSource.startsWith(path.resolve(backupDirectory))) continue;
    try {
      await fs.access(sourcePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.cp(sourcePath, targetPath, { recursive: true, force: true, errorOnExist: false });
      await addBackupLog(backupId, "info", `Cartella inclusa: ${item.source}`, { section: item.section });
    } catch (error) {
      if (error?.code === "ENOENT") {
        skipped.push(item.source);
        await addBackupLog(backupId, "warning", `Cartella non presente, saltata: ${item.source}`, { section: item.section });
      } else {
        throw error;
      }
    }
  }
  return skipped;
}

async function writeVerifiableManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

async function createTarGz(sourceDir, archivePath) {
  await execFileAsync("tar", ["-czf", archivePath, "-C", path.dirname(sourceDir), path.basename(sourceDir)], {
    timeout: 15 * 60 * 1000,
    maxBuffer: 1024 * 1024
  });
  const stats = await fs.stat(archivePath);
  if (!stats.size) throw new Error("Backup fallito: archivio tar.gz vuoto.");
  return stats;
}

async function getAppVersion() {
  const pkg = await fs.readFile(path.join(__dirname, "package.json"), "utf8").then(JSON.parse).catch(() => ({}));
  return pkg.version || "unknown";
}

function publicBackup(row = {}) {
  return {
    ...row,
    status: backupStatusLabel(row.status),
    file_size: Number(row.file_size || 0),
    download_disponibile: row.status === "completed" && Boolean(row.file_path) && Number(row.file_size || 0) > 0,
    manifest: row.metadata?.manifest || null
  };
}

async function listBackups(user = {}) {
  const values = [];
  const where = ["deleted_at IS NULL"];
  if (normalizeRole(user?.ruolo) === "responsabile") {
    values.push(user.id || null, user.negozio_id || null);
    where.push(`(created_by = $${values.length - 1}::bigint OR store_id = $${values.length}::bigint)`);
  }
  const result = await pool.query(
    `SELECT b.*, u.nome AS created_by_nome, u.cognome AS created_by_cognome, u.username AS created_by_username
     FROM backups b
     LEFT JOIN utenti u ON u.id = b.created_by
     WHERE ${where.join(" AND ")}
     ORDER BY b.created_at DESC
     LIMIT 80`,
    values
  );
  return result.rows.map((row) => publicBackup({
    ...row,
    created_by_name: [row.created_by_nome, row.created_by_cognome].filter(Boolean).join(" ") || row.created_by_username || ""
  }));
}

async function backupDetail(id, user = {}) {
  const values = [id];
  const where = ["b.id = $1::uuid", "b.deleted_at IS NULL"];
  if (normalizeRole(user?.ruolo) === "responsabile") {
    values.push(user.id || null, user.negozio_id || null);
    where.push(`(b.created_by = $${values.length - 1}::bigint OR b.store_id = $${values.length}::bigint)`);
  }
  const result = await pool.query(
    `SELECT b.*, u.nome AS created_by_nome, u.cognome AS created_by_cognome, u.username AS created_by_username
     FROM backups b
     LEFT JOIN utenti u ON u.id = b.created_by
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    values
  );
  const backup = result.rows[0];
  if (!backup) return null;
  const logs = await pool.query(
    `SELECT level, message, metadata, created_at
     FROM backup_logs
     WHERE backup_id = $1::uuid
     ORDER BY created_at ASC
     LIMIT 300`,
    [id]
  );
  return publicBackup({
    ...backup,
    created_by_name: [backup.created_by_nome, backup.created_by_cognome].filter(Boolean).join(" ") || backup.created_by_username || "",
    logs: logs.rows
  });
}

async function createManualBackup(user = {}) {
  const now = new Date();
  const code = backupCode(now);
  const backupDirName = `backup_${backupTimestamp(now)}_${code}`;
  const backupDir = path.join(backupDirectory, backupDirName);
  const archivePath = path.join(backupDirectory, `backup_${code}.tar.gz`);
  await fs.mkdir(backupDir, { recursive: true });
  const dbInfo = databaseInfoFromUrl();
  const created = await pool.query(
    `INSERT INTO backups
      (backup_code, backup_type, status, created_by, created_by_role, store_id, metadata)
     VALUES ($1::text, 'manual_full', 'running', $2::bigint, $3::text, $4::bigint, $5::jsonb)
     RETURNING *`,
    [
      code,
      user.id || null,
      normalizeRole(user.ruolo),
      user.negozio_id || null,
      sanitizeForPostgres({ backup_dir: backupDir, archive_path: archivePath, database: dbInfo ? { host: dbInfo.host, database: dbInfo.database } : null })
    ]
  );
  const backupId = created.rows[0].id;
  await addBackupLog(backupId, "info", "Backup manuale avviato", { backup_code: code });

  try {
    const databaseDumpPath = path.join(backupDir, "database.dump");
    await createPostgresBackup(databaseDumpPath, backupId);
    const skippedFolders = await copyBackupFileSources(backupDir, backupId);
    await fs.mkdir(path.join(backupDir, "logs"), { recursive: true });
    const contentStats = await directoryStats(backupDir);
    const payloadChecksum = crypto
      .createHash("sha256")
      .update(JSON.stringify({ code, files: contentStats.files, bytes: contentStats.bytes }))
      .digest("hex");
    const manifest = {
      backup_code: code,
      created_at: now.toISOString(),
      created_by: user.id || null,
      created_by_role: normalizeRole(user.ruolo),
      database_dump_file: "database.dump",
      included_sections: [
        "database PostgreSQL",
        "atti di vendita",
        "clienti",
        "documenti identita",
        "codici fiscali/tessera sanitaria",
        "firme",
        "PDF",
        "foto preziosi",
        "contabili",
        "CRM",
        "Academy",
        "AI knowledge base",
        "utenti",
        "audit log",
        "giacenza",
        "fusioni"
      ],
      skipped_folders: skippedFolders,
      number_of_files: contentStats.files,
      total_size: contentStats.bytes,
      checksum_sha256: payloadChecksum,
      app_version: await getAppVersion(),
      database_name: dbInfo?.database || "",
      restore_instructions: "Usare pg_restore su un database vuoto o staging: pg_restore --no-owner --no-privileges --dbname=<database_staging> database.dump"
    };
    const manifestPath = await writeVerifiableManifest(backupDir, manifest);
    const archiveStats = await createTarGz(backupDir, archivePath);
    const archiveChecksum = await sha256File(archivePath);
    const updatedManifest = { ...manifest, archive_file: path.basename(archivePath), archive_checksum_sha256: archiveChecksum };
    await writeVerifiableManifest(backupDir, updatedManifest);
    await addBackupLog(backupId, "info", "Archivio compresso creato", { archive: path.basename(archivePath), size: archiveStats.size });
    const updated = await pool.query(
      `UPDATE backups
       SET status = 'completed',
           file_path = $2::text,
           file_size = $3::bigint,
           checksum_sha256 = $4::text,
           metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
           error_message = NULL
       WHERE id = $1::uuid
       RETURNING *`,
      [
        backupId,
        archivePath,
        archiveStats.size,
        archiveChecksum,
        sanitizeForPostgres({
          backup_dir: backupDir,
          archive_path: archivePath,
          manifest_path: manifestPath,
          database_dump_path: databaseDumpPath,
          manifest: updatedManifest
        })
      ]
    );
    await addBackupLog(backupId, "info", "Backup creato correttamente", { checksum_sha256: archiveChecksum });
    return publicBackup(updated.rows[0]);
  } catch (error) {
    const message = error.message || "Backup non riuscito";
    await addBackupLog(backupId, "error", message);
    const failed = await pool.query(
      `UPDATE backups
       SET status = 'failed',
           error_message = $2::text,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
       WHERE id = $1::uuid
       RETURNING *`,
      [backupId, message, sanitizeForPostgres({ backup_dir: backupDir, archive_path: archivePath })]
    );
    return publicBackup(failed.rows[0]);
  }
}

async function archiveEntries(archivePath) {
  const { stdout } = await execFileAsync("tar", ["-tzf", archivePath], {
    timeout: 2 * 60 * 1000,
    maxBuffer: 5 * 1024 * 1024
  });
  return stdout.split(/\r?\n/).filter(Boolean);
}

async function loadBackupManifest(backup) {
  const manifestPath = backup.metadata?.manifest_path;
  if (manifestPath) {
    const resolved = path.resolve(manifestPath);
    const relative = path.relative(path.resolve(backupDirectory), resolved);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      return JSON.parse(await fs.readFile(resolved, "utf8"));
    }
  }
  return backup.metadata?.manifest || null;
}

async function verifyBackup(id, user = {}) {
  const backup = await backupDetail(id, user);
  if (!backup) return null;
  try {
    if (backup.status !== "completed") throw new Error("Backup non completato.");
    if (!backup.file_path) throw new Error("File backup non disponibile.");
    const resolved = path.resolve(backup.file_path);
    const relative = path.relative(path.resolve(backupDirectory), resolved);
    if (!resolved || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Percorso backup non autorizzato.");
    const stats = await fs.stat(resolved);
    if (!stats.size) throw new Error("Archivio backup vuoto.");
    const checksum = await sha256File(resolved);
    if (checksum !== backup.checksum_sha256) throw new Error("Checksum non corrispondente");
    const manifest = await loadBackupManifest(backup);
    if (!manifest?.backup_code) throw new Error("manifest.json non valido o mancante.");
    const entries = await archiveEntries(resolved);
    if (!entries.some((entry) => entry.endsWith("/database.dump"))) throw new Error("database.dump mancante nell'archivio.");
    if (!entries.some((entry) => entry.endsWith("/manifest.json"))) throw new Error("manifest.json mancante nell'archivio.");
    const dumpPath = backup.metadata?.database_dump_path;
    if (dumpPath) {
      const resolvedDump = path.resolve(dumpPath);
      const dumpRelative = path.relative(path.resolve(backupDirectory), resolvedDump);
      if (dumpRelative.startsWith("..") || path.isAbsolute(dumpRelative)) throw new Error("Percorso database.dump non autorizzato.");
      const dumpStats = await fs.stat(resolvedDump);
      if (!dumpStats.size) throw new Error("database.dump vuoto.");
    }
    await pool.query(
      `UPDATE backups
       SET verification_status = 'verified',
           verified_at = NOW(),
           error_message = NULL
       WHERE id = $1::uuid`,
      [id]
    );
    await addBackupLog(id, "info", "Verifica integrita completata", { checksum_sha256: checksum });
    return backupDetail(id, user);
  } catch (error) {
    const message = error.message || "Verifica backup non riuscita.";
    await pool.query(
      `UPDATE backups
       SET verification_status = 'failed',
           error_message = $2::text
       WHERE id = $1::uuid`,
      [id, message]
    );
    await addBackupLog(id, "error", message);
    return backupDetail(id, user);
  }
}

async function createMaintenanceClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL non configurato.");
  const parsed = new URL(process.env.DATABASE_URL);
  parsed.pathname = "/postgres";
  const client = new Client({
    connectionString: parsed.toString(),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  return client;
}

async function testRestoreBackup(id, user = {}) {
  const backup = await backupDetail(id, user);
  if (!backup) return null;
  const codePart = String(backup.backup_code || id).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 34);
  const testDatabaseName = `restore_test_${codePart}_${crypto.randomBytes(2).toString("hex")}`.slice(0, 60);
  let maintenanceClient = null;
  let status = "failed";
  let resultMessage = "";
  try {
    if (backup.status !== "completed") throw new Error("Backup non completato.");
    if (!backup.metadata?.database_dump_path) throw new Error("database.dump non disponibile per il test restore.");
    await fs.access(backup.metadata.database_dump_path);
    const env = postgresToolEnv(testDatabaseName);
    if (!env) throw new Error("DATABASE_URL non configurato.");
    maintenanceClient = await createMaintenanceClient();
    const productionDb = databaseInfoFromUrl()?.originalDatabase;
    if (!testDatabaseName || testDatabaseName === productionDb) throw new Error("Database di test non sicuro.");
    await maintenanceClient.query(`CREATE DATABASE ${quoteIdentifier(testDatabaseName)}`);
    try {
      await execFileAsync(pgRestorePath, ["--no-owner", "--no-privileges", "--dbname", testDatabaseName, backup.metadata.database_dump_path], {
        env,
        timeout: 20 * 60 * 1000,
        maxBuffer: 1024 * 1024
      });
    } catch (error) {
      if (isMissingExecutable(error)) throw new Error(backupToolUnavailableMessage("pg_restore"));
      throw new Error(`Test restore fallito: ${String(error?.stderr || error?.message || "pg_restore non riuscito").slice(0, 500)}`);
    }
    const restoredClient = new Client({
      connectionString: (() => {
        const parsed = new URL(process.env.DATABASE_URL);
        parsed.pathname = `/${testDatabaseName}`;
        return parsed.toString();
      })(),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
    await restoredClient.connect();
    const tables = ["utenti", "atti_vendita", "clienti", "audit_logs", "academy_courses", "ai_knowledge_notes", "giacenza_movimenti", "fusioni"];
    const tableResult = await restoredClient.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [tables]
    );
    await restoredClient.end();
    status = tableResult.rowCount >= 3 ? "passed" : "failed";
    resultMessage = status === "passed"
      ? "Test restore completato con successo"
      : "Test restore fallito: tabelle essenziali non trovate";
  } catch (error) {
    status = "failed";
    resultMessage = error.message || "Test restore fallito: controllare log";
  } finally {
    if (maintenanceClient) {
      await maintenanceClient.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [testDatabaseName]
      ).catch(() => {});
      await maintenanceClient.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(testDatabaseName)}`).catch(() => {});
      await maintenanceClient.end().catch(() => {});
    }
  }
  await pool.query(
    `INSERT INTO backup_restore_tests (backup_id, status, tested_by, test_database_name, result_message, metadata)
     VALUES ($1::uuid, $2::text, $3::bigint, $4::text, $5::text, $6::jsonb)`,
    [id, status, user.id || null, testDatabaseName, resultMessage, sanitizeForPostgres({ protected: true })]
  );
  await pool.query(
    `UPDATE backups
     SET restore_test_status = $2::text,
         restore_tested_at = NOW(),
         error_message = CASE WHEN $2::text = 'failed' THEN $3::text ELSE NULL END
     WHERE id = $1::uuid`,
    [id, status, resultMessage]
  );
  await addBackupLog(id, status === "passed" ? "info" : "error", resultMessage, { test_database_name: testDatabaseName });
  return backupDetail(id, user);
}

async function deleteBackup(id, user = {}) {
  const backup = await backupDetail(id, user);
  if (!backup) return false;
  const result = await pool.query(
    `UPDATE backups
     SET status = 'deleted',
         deleted_at = NOW()
     WHERE id = $1::uuid
     RETURNING id`,
    [id]
  );
  if (result.rowCount) await addBackupLog(id, "info", "Backup eliminato logicamente", { deleted_by: user.id || null });
  return result.rowCount > 0;
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

function buildActsQuery({ store, field, q, fusionEligible, includeDrafts, includeSuspended } = {}, user = null) {
  const where = [];
  const values = [];
  const shouldIncludeDrafts = includeDrafts === true || includeDrafts === "true";
  const shouldIncludeSuspended = includeSuspended === true || includeSuspended === "true";

  if (shouldIncludeDrafts) {
    where.push("deleted_at IS NULL AND COALESCE(status, '') NOT ILIKE 'deleted' AND COALESCE(status, '') NOT ILIKE 'Deleted' AND COALESCE(status, '') NOT ILIKE 'abandoned' AND COALESCE(status, '') NOT ILIKE 'Abandoned'");
  } else if (shouldIncludeSuspended) {
    where.push(`(${visibleRealActStatusSql()} OR ${suspendedStatusWhere("")})`);
  } else {
    where.push(visibleRealActStatusSql());
  }
  if (!shouldIncludeSuspended) {
    where.push(`COALESCE(status, '') NOT ILIKE 'suspended'
      AND COALESCE(status, '') NOT ILIKE 'sospesa'
      AND COALESCE(status, '') NOT ILIKE 'sospeso'
      AND COALESCE(status, '') NOT ILIKE 'pending_approval'
      AND COALESCE(status, '') NOT ILIKE 'in_attesa_autorizzazione'
      AND COALESCE(status, '') NOT ILIKE 'approval_approved'
      AND COALESCE(status, '') NOT ILIKE 'autorizzazione_approvata'
      AND COALESCE(status, '') NOT ILIKE 'approval_rejected'
      AND COALESCE(status, '') NOT ILIKE 'autorizzazione_rifiutata'
      AND NOT (suspended_at IS NOT NULL AND resumed_at IS NULL)`);
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
    `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome,
            shield.score AS shield_score,
            shield.risk_level AS shield_risk_level,
            shield.summary AS shield_summary,
            shield.factors AS shield_factors,
            shield.updated_at AS shield_updated_at
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     LEFT JOIN LATERAL (
       SELECT score, risk_level, summary, factors, updated_at
       FROM aurum_shield_scores
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) shield ON TRUE
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
         AND ${reservedActNumberStatusSql()}
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
  const aurumShield = await dashboardAurumShieldStats(user).catch(() => ({
    high_today: 0,
    critical_open: 0,
    open_alerts: 0,
    average_score: 0,
    top_store: null,
    top_operator: null
  }));
  const auditSummary = await dashboardAuditSummary(user).catch((error) => {
    console.error("AUDIT SUMMARY ERROR", error);
    return {
      logins_today: 0,
      acts_created_today: 0,
      acts_updated_today: 0,
      acts_deleted_today: 0,
      customer_prints_today: 0,
      shield_alerts_today: 0,
      top_users: [],
      latest: []
    };
  });
  const approvalSummary = await dashboardApprovalStats(user).catch((error) => {
    console.error("APPROVAL SUMMARY ERROR", error);
    return { pending: 0, risky_pending: 0, latest: [] };
  });
  const suspendedSummary = await dashboardSuspendedPracticeStats(user).catch((error) => {
    console.error("SUSPENDED PRACTICES SUMMARY ERROR", error);
    return { total: 0, today: 0, latest: [], top_reasons: [] };
  });
  const storeHealth = await storeHealthNetworkSummary(user).catch((error) => {
    console.error("STORE HEALTH SUMMARY ERROR", error);
    return { average_score: 0, best_store: null, critical_store: null, alert_count: 0, stores: [] };
  });
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
    ranking_operatori: Object.values(byOperator).sort((a, b) => b.fatturato - a.fatturato),
    aurum_shield: aurumShield,
    approval_summary: approvalSummary,
    suspended_practices: suspendedSummary,
    audit_summary: auditSummary,
    store_health: storeHealth
  };
}

function canViewStoreHealth(user = {}) {
  return ["founder", "supervisore", "responsabile"].includes(normalizeRole(user?.ruolo));
}

function dateInputString(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return new Date().toISOString().slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function addDaysToDateString(dateTextValue, days) {
  const date = new Date(`${dateTextValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function storeHealthDateRange(input = {}) {
  const period = String(input.period || input.range || "last_7").trim();
  const today = dateInputString();
  if (input.date_from || input.date_to) {
    const dateFrom = founderReportDate(input.date_from || today);
    const dateTo = founderReportDate(input.date_to || today);
    return dateFrom <= dateTo ? { date_from: dateFrom, date_to: dateTo, period: "custom" } : { date_from: dateTo, date_to: dateFrom, period: "custom" };
  }
  if (period === "today") return { date_from: today, date_to: today, period };
  if (period === "last_30") return { date_from: addDaysToDateString(today, -29), date_to: today, period };
  if (period === "month") return { date_from: `${today.slice(0, 7)}-01`, date_to: today, period };
  return { date_from: addDaysToDateString(today, -6), date_to: today, period: "last_7" };
}

function storeHealthStatus(score = 0) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  if (value >= 85) return { status: "ottimo", label: "Ottimo", color: "green" };
  if (value >= 70) return { status: "buono", label: "Buono", color: "lime" };
  if (value >= 50) return { status: "da_controllare", label: "Da controllare", color: "orange" };
  return { status: "critico", label: "Critico", color: "red" };
}

function storeHealthStoreCondition(alias = "a", values = [], store = {}) {
  values.push(store.id, store.nome);
  return `(${alias}.negozio_id = $${values.length - 1}::bigint OR ${alias}.store = $${values.length}::text)`;
}

function storeHealthStoreIdCondition(alias = "x", values = [], store = {}) {
  values.push(store.id);
  return `${alias}.store_id = $${values.length}::bigint`;
}

async function visibleStoreHealthStores(user = {}, requestedStoreId = null) {
  if (!canViewStoreHealth(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const stores = await listStores(user);
  const activeStores = stores.filter((store) => store && store.attivo !== false);
  if (!requestedStoreId) return activeStores;
  const selected = activeStores.find((store) => String(store.id) === String(requestedStoreId));
  if (!selected) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  return [selected];
}

function activityCountByAction(rows = []) {
  return Object.fromEntries(rows.map((row) => [row.action, Number(row.total || 0)]));
}

function generateStoreHealthRecommendations(data = {}) {
  const recommendations = [];
  if (data.operational?.suspended_open > 0) recommendations.push("Risolvi le pratiche sospese prima della chiusura giornata.");
  if (data.operational?.suspended_over_48h > 0) recommendations.push(`Verificare ${data.operational.suspended_over_48h} pratiche sospese da oltre 48 ore.`);
  if (data.risk?.critical_alerts > 0) recommendations.push("Controlla subito le pratiche con rischio critico.");
  if (data.quality?.failed_checks > 0) recommendations.push("Rivedere i controlli qualità non superati e correggere i dati mancanti.");
  if (data.academy?.average_progress < 70 && data.operators?.active_operators > 0) recommendations.push("Programma formazione per operatori con corsi non completati.");
  if (!data.backup?.latest_verified) recommendations.push("Verifica il backup più recente.");
  if (data.commercial?.average_margin < 8 && data.commercial?.completed_acts > 0) recommendations.push("Analizza gli atti dell'operatore con margine medio più basso.");
  if (data.operators?.too_many_updates > 0) recommendations.push("Controlla gli operatori con molte modifiche agli atti.");
  if (!recommendations.length) recommendations.push("Mantenere ritmo operativo, formazione e verifica backup attuali.");
  return recommendations.slice(0, 8);
}

function storeHealthMainAlerts(factors = {}) {
  const alerts = [];
  if (factors.risk?.critical_alerts) alerts.push(`${factors.risk.critical_alerts} alert critici Aurum Shield`);
  if (factors.operational?.suspended_open) alerts.push(`${factors.operational.suspended_open} pratiche sospese`);
  if (factors.operational?.pending_approvals) alerts.push(`${factors.operational.pending_approvals} autorizzazioni in attesa`);
  if (factors.quality?.failed_checks) alerts.push(`${factors.quality.failed_checks} controlli qualità non superati`);
  if (factors.backup && !factors.backup.latest_verified) alerts.push("Backup più recente non verificato");
  return alerts.slice(0, 5);
}

function scorePenalty(penalties, label, points, count = 1) {
  const value = Math.max(0, Number(points || 0)) * Math.max(0, Number(count || 0));
  if (value > 0) penalties.push({ label, points: value, count: Number(count || 0) });
  return value;
}

function scoreBonus(bonuses, label, points) {
  const value = Math.max(0, Number(points || 0));
  if (value > 0) bonuses.push({ label, points: value });
  return value;
}

async function calculateStoreHealthScore(storeId, dateRange = {}, options = {}) {
  const stores = options.store ? [options.store] : await visibleStoreHealthStores(options.user || { ruolo: "founder" }, storeId);
  const store = stores[0];
  if (!store) {
    const error = new Error("Negozio non trovato");
    error.status = 404;
    throw error;
  }
  const range = storeHealthDateRange(dateRange);
  const values = [];
  const storeCondition = storeHealthStoreCondition("a", values, store);
  values.push(range.date_from, range.date_to);
  const fromIndex = values.length - 1;
  const toIndex = values.length;
  const completedRows = await reportQuery(
    `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     WHERE ${realCompletedStatusSql("a")}
       AND ${storeCondition}
       AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) >= $${fromIndex}::date
       AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) < ($${toIndex}::date + INTERVAL '1 day')
     ORDER BY COALESCE(a.completed_at, a.archived_at, a.created_at) DESC
     LIMIT 1000`,
    values
  );
  const completedActs = completedRows.map((row) => rowToAct(row));
  const materialSummary = founderReportMaterials(completedActs);
  const payments = founderReportPayments(completedActs);
  const avgCompletionHours = completedActs.length
    ? completedActs.reduce((sum, act) => {
      const start = new Date(act.createdAt || act.date || Date.now()).getTime();
      const end = new Date(act.completedAt || act.archivedAt || act.date || Date.now()).getTime();
      return sum + Math.max(0, end - start) / 36e5;
    }, 0) / completedActs.length
    : 0;
  const distinctClients = new Set(completedActs.map((act) => normalizeFiscalCode(act.fiscalCode)).filter(Boolean));
  const clientFrequency = completedActs.reduce((items, act) => {
    const key = normalizeFiscalCode(act.fiscalCode);
    if (key) items[key] = (items[key] || 0) + 1;
    return items;
  }, {});

  const [suspendedRows, deletedRows, qualityRows, riskRows, shieldAlertRows, approvalRows, fusionRows, operatorRows, auditRows, backupRows, academyRows] = await Promise.all([
    reportQuery(
      `SELECT COUNT(*)::int AS suspended_open,
              COUNT(*) FILTER (WHERE a.suspended_at < NOW() - INTERVAL '48 hours')::int AS suspended_over_48h,
              COUNT(*) FILTER (WHERE COALESCE(a.status, '') ILIKE 'pending_approval' OR COALESCE(a.status, '') ILIKE 'in_attesa_autorizzazione')::int AS pending_authorization
       FROM ${actsTable} a
       WHERE ${suspendedStatusWhere("a")}
         AND ${storeHealthStoreCondition("a", [], store).replace(/\$1/g, "$1").replace(/\$2/g, "$2")}`,
      [store.id, store.nome]
    ),
    reportQuery(
      `SELECT COUNT(*)::int AS deleted_acts
       FROM ${actsTable} a
       WHERE a.deleted_at >= $3::date
         AND a.deleted_at < ($4::date + INTERVAL '1 day')
         AND ${storeHealthStoreCondition("a", [], store).replace(/\$1/g, "$1").replace(/\$2/g, "$2")}`,
      [store.id, store.nome, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT
         COUNT(*) FILTER (WHERE LOWER(COALESCE(qc.status, '')) IN ('non_completabile','failed','error'))::int AS failed_checks,
         COUNT(*) FILTER (WHERE LOWER(COALESCE(qc.status, '')) IN ('attenzione','warning'))::int AS warning_checks,
         COUNT(*)::int AS total_checks
       FROM quality_checks qc
       JOIN ${actsTable} a ON a.id = qc.sale_deed_id
       WHERE qc.created_at >= $3::date
         AND qc.created_at < ($4::date + INTERVAL '1 day')
         AND ${storeHealthStoreCondition("a", [], store).replace(/\$1/g, "$1").replace(/\$2/g, "$2")}`,
      [store.id, store.nome, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT
         COALESCE(ROUND(AVG(s.score), 1), 0) AS average_score,
         COUNT(*) FILTER (WHERE LOWER(s.risk_level) IN ('alto','high'))::int AS high_alerts,
         COUNT(*) FILTER (WHERE LOWER(s.risk_level) IN ('critico','critical'))::int AS critical_alerts
       FROM aurum_shield_scores s
       JOIN ${actsTable} a ON a.id = s.sale_deed_id
       WHERE s.updated_at >= $3::date
         AND s.updated_at < ($4::date + INTERVAL '1 day')
         AND ${storeHealthStoreCondition("a", [], store).replace(/\$1/g, "$1").replace(/\$2/g, "$2")}`,
      [store.id, store.nome, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT COUNT(*)::int AS open_alerts,
              COUNT(*) FILTER (WHERE severity IN ('danger','critical') OR severity ILIKE 'alto' OR severity ILIKE 'critico')::int AS severe_alerts
       FROM aurum_shield_alerts asa
       WHERE asa.created_at >= $2::date
         AND asa.created_at < ($3::date + INTERVAL '1 day')
         AND asa.store_id = $1::bigint
         AND COALESCE(asa.status, 'open') <> 'resolved'`,
      [store.id, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT
         COUNT(*) FILTER (WHERE ar.created_at >= $2::date AND ar.created_at < ($3::date + INTERVAL '1 day'))::int AS requested,
         COUNT(*) FILTER (WHERE ar.status = 'rejected' AND ar.reviewed_at >= $2::date AND ar.reviewed_at < ($3::date + INTERVAL '1 day'))::int AS rejected,
         COUNT(*) FILTER (WHERE ar.status = 'pending')::int AS pending
       FROM approval_requests ar
       WHERE ar.store_id = $1::bigint`,
      [store.id, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT COUNT(*)::int AS lots_total,
              COUNT(*) FILTER (WHERE COALESCE(stato, '') ILIKE 'conclus%' OR COALESCE(stato, '') ILIKE 'completed')::int AS lots_completed,
              COUNT(*) FILTER (WHERE NOT (COALESCE(stato, '') ILIKE 'conclus%' OR COALESCE(stato, '') ILIKE 'completed'))::int AS lots_open,
              COUNT(*) FILTER (WHERE data_invio IS NOT NULL AND data_invio < CURRENT_DATE - INTERVAL '14 days' AND NOT (COALESCE(stato, '') ILIKE 'conclus%' OR COALESCE(stato, '') ILIKE 'completed'))::int AS lots_late
       FROM fusion_lots
       WHERE created_at >= $3::date
         AND created_at < ($4::date + INTERVAL '1 day')
         AND (negozio_id = $1::bigint OR negozio = $2::text)`,
      [store.id, store.nome, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT COUNT(*)::int AS active_operators
       FROM utenti
       WHERE COALESCE(attivo, TRUE) = TRUE
         AND (negozio_id = $1::bigint OR negozio = $2::text)`,
      [store.id, store.nome]
    ),
    reportQuery(
      `SELECT action, COUNT(*)::int AS total
       FROM audit_logs
       WHERE created_at >= $3::date
         AND created_at < ($4::date + INTERVAL '1 day')
         AND (store_id = $1::bigint OR store_name = $2::text)
       GROUP BY action`,
      [store.id, store.nome, range.date_from, range.date_to]
    ),
    reportQuery(
      `SELECT *
       FROM backups
       WHERE (store_id IS NULL OR store_id = $1::bigint)
       ORDER BY created_at DESC
       LIMIT 5`,
      [store.id]
    ),
    reportQuery(
      `SELECT
         COALESCE(ROUND(AVG(COALESCE(p.percentuale, 0)), 1), 0) AS average_progress,
         COUNT(DISTINCT u.id) FILTER (WHERE COALESCE(p.percentuale, 0) < 60)::int AS operators_below_60,
         COUNT(DISTINCT cert.id)::int AS certificates,
         COUNT(DISTINCT badge.id)::int AS badges
       FROM utenti u
       LEFT JOIN academy_user_progress p ON p.user_id = u.id
       LEFT JOIN academy_certificates cert ON cert.user_id = u.id
       LEFT JOIN academy_badges badge ON badge.user_id = u.id
       WHERE COALESCE(u.attivo, TRUE) = TRUE
         AND (u.negozio_id = $1::bigint OR u.negozio = $2::text)`,
      [store.id, store.nome]
    )
  ]);

  const auditActions = activityCountByAction(auditRows);
  const latestBackup = backupRows[0] || null;
  const backupFailed = backupRows.some((backup) => backup.status === "failed");
  const backupVerified = latestBackup?.verification_status === "verified";
  const totalRevenue = completedActs.reduce((sum, act) => sum + reportNumber(act.amount), 0);
  const estimatedProfit = totalRevenue * 0.08;
  const averageMargin = totalRevenue > 0 ? 8 : 0;
  const expiredDocuments = completedActs.filter((act) => act.documentExpiry && new Date(act.documentExpiry) < new Date()).length;
  const factors = {
    store: { id: store.id, name: store.nome, code: store.codice || "" },
    date_range: range,
    operational: {
      completed_acts: completedActs.length,
      suspended_open: Number(suspendedRows[0]?.suspended_open || 0),
      pending_approvals: Number(approvalRows[0]?.pending || suspendedRows[0]?.pending_authorization || 0),
      deleted_acts: Number(deletedRows[0]?.deleted_acts || 0),
      average_completion_hours: Number(avgCompletionHours.toFixed(1)),
      incomplete_practices: Number(suspendedRows[0]?.suspended_open || 0),
      suspended_over_48h: Number(suspendedRows[0]?.suspended_over_48h || 0)
    },
    quality: {
      failed_checks: Number(qualityRows[0]?.failed_checks || 0),
      warning_checks: Number(qualityRows[0]?.warning_checks || 0),
      total_checks: Number(qualityRows[0]?.total_checks || 0),
      expired_documents: expiredDocuments,
      missing_receipts: payments.missing_receipts
    },
    risk: {
      average_shield_score: Number(riskRows[0]?.average_score || 0),
      high_alerts: Number(riskRows[0]?.high_alerts || 0),
      critical_alerts: Number(riskRows[0]?.critical_alerts || 0),
      open_alerts: Number(shieldAlertRows[0]?.open_alerts || 0),
      severe_alerts: Number(shieldAlertRows[0]?.severe_alerts || 0),
      approvals_requested: Number(approvalRows[0]?.requested || 0),
      approvals_rejected: Number(approvalRows[0]?.rejected || 0)
    },
    commercial: {
      gold_grams: materialSummary.totals.Oro,
      silver_grams: materialSummary.totals.Argento,
      platinum_grams: materialSummary.totals.Platino,
      estimated_profit: estimatedProfit,
      average_margin: averageMargin,
      customers: distinctClients.size,
      recurring_customers: Object.values(clientFrequency).filter((count) => count > 1).length,
      payment_volume: totalRevenue,
      completed_acts: completedActs.length
    },
    payments: {
      cash: payments.contanti_amount,
      bank_transfers: payments.bonifico_amount,
      checks: payments.assegno_amount,
      missing_receipts: payments.missing_receipts,
      suspicious_payments: Number(shieldAlertRows[0]?.severe_alerts || 0)
    },
    stock_and_fusion: {
      stock_by_metal: materialSummary.totals,
      gold_by_title: materialSummary.oro_by_title,
      silver_by_title: materialSummary.argento_by_title,
      platinum_by_title: materialSummary.platino_by_title,
      fusion_lots_open: Number(fusionRows[0]?.lots_open || 0),
      fusion_lots_completed: Number(fusionRows[0]?.lots_completed || 0),
      fusion_lots_late: Number(fusionRows[0]?.lots_late || 0)
    },
    operators: {
      active_operators: Number(operatorRows[0]?.active_operators || 0),
      logins: Number(auditActions.login || 0),
      total_activity: auditRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
      too_many_errors: Number(auditActions.api_request_error || 0) + Number(auditActions.quality_check_failed || 0),
      too_many_updates: Number(auditActions.update_act || 0)
    },
    academy: {
      average_progress: Number(academyRows[0]?.average_progress || 0),
      operators_below_60: Number(academyRows[0]?.operators_below_60 || 0),
      certificates: Number(academyRows[0]?.certificates || 0),
      badges: Number(academyRows[0]?.badges || 0)
    },
    backup: {
      latest_backup_code: latestBackup?.backup_code || "",
      latest_status: latestBackup?.status || "not_available",
      latest_verified: backupVerified,
      failed_recently: backupFailed
    },
    security: {
      audit_critical: Number(auditActions.delete_act || 0) + Number(auditActions.change_user_role || 0) + Number(auditActions.approval_unauthorized_attempt || 0),
      unauthorized_attempts: Number(auditActions.approval_unauthorized_attempt || 0)
    }
  };
  const penalties = [];
  const bonuses = [];
  let score = 100;
  score -= scorePenalty(penalties, "Pratiche sospese aperte", 4, factors.operational.suspended_open);
  score -= scorePenalty(penalties, "Pratiche in attesa autorizzazione", 3, factors.operational.pending_approvals);
  score -= scorePenalty(penalties, "Alert Aurum Shield alto rischio", 6, factors.risk.high_alerts);
  score -= scorePenalty(penalties, "Alert Aurum Shield critici", 10, factors.risk.critical_alerts);
  score -= scorePenalty(penalties, "Controlli qualità falliti", 5, factors.quality.failed_checks);
  score -= scorePenalty(penalties, "Documenti scaduti", 8, factors.quality.expired_documents);
  score -= scorePenalty(penalties, "Atti eliminati", 6, factors.operational.deleted_acts);
  if (factors.backup.failed_recently) score -= scorePenalty(penalties, "Backup fallito recente", 10, 1);
  if (factors.academy.average_progress < 60 && factors.operators.active_operators > 0) score -= scorePenalty(penalties, "Formazione media sotto 60%", 10, 1);
  if (factors.operational.average_completion_hours > 24) score -= scorePenalty(penalties, "Tempo medio completamento alto", 5, 1);
  if (factors.commercial.completed_acts > 0 && factors.commercial.average_margin < 8) score -= scorePenalty(penalties, "Margine medio sotto soglia", 8, 1);
  if (backupVerified) score += scoreBonus(bonuses, "Backup verificato", 3);
  if (factors.academy.average_progress > 85) score += scoreBonus(bonuses, "Formazione media sopra 85%", 5);
  if (!factors.risk.critical_alerts) score += scoreBonus(bonuses, "Nessun alert critico", 5);
  if (!factors.operational.suspended_over_48h) score += scoreBonus(bonuses, "Nessuna sospesa oltre 48 ore", 5);
  if (factors.commercial.completed_acts > 0 && factors.commercial.average_margin >= 8) score += scoreBonus(bonuses, "Margine medio sopra soglia", 5);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = storeHealthStatus(score);
  const recommendations = generateStoreHealthRecommendations(factors);
  const saved = await pool.query(
    `INSERT INTO store_health_scores (
       store_id, score, status, date_from, date_to, factors, penalties, bonuses, recommendations, updated_at
     ) VALUES (
       $1::bigint,$2::integer,$3::text,$4::date,$5::date,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,NOW()
     )
     ON CONFLICT (store_id, date_from, date_to) DO UPDATE SET
       score = EXCLUDED.score,
       status = EXCLUDED.status,
       factors = EXCLUDED.factors,
       penalties = EXCLUDED.penalties,
       bonuses = EXCLUDED.bonuses,
       recommendations = EXCLUDED.recommendations,
       updated_at = NOW()
     RETURNING *`,
    [
      store.id,
      score,
      status.status,
      range.date_from,
      range.date_to,
      sanitizeForPostgres(factors),
      sanitizeForPostgres(penalties),
      sanitizeForPostgres(bonuses),
      sanitizeForPostgres(recommendations)
    ]
  );
  return publicStoreHealthScore(saved.rows[0], store);
}

async function storeHealthTrend(storeId, dateFrom) {
  const result = await pool.query(
    `SELECT score
     FROM store_health_scores
     WHERE store_id = $1::bigint
       AND date_to < $2::date
     ORDER BY date_to DESC, updated_at DESC
     LIMIT 1`,
    [storeId, dateFrom]
  ).catch(() => ({ rows: [] }));
  return result.rows[0]?.score ?? null;
}

function publicStoreHealthScore(row = {}, store = {}) {
  const score = Number(row.score || 0);
  const status = storeHealthStatus(score);
  const factors = row.factors || {};
  return {
    id: row.id,
    store_id: row.store_id || store.id || null,
    store_name: store.nome || factors.store?.name || "Negozio",
    store_code: store.codice || factors.store?.code || "",
    score,
    status: row.status || status.status,
    status_label: status.label,
    status_color: status.color,
    date_from: row.date_from ? dateInputString(row.date_from) : null,
    date_to: row.date_to ? dateInputString(row.date_to) : null,
    factors,
    penalties: reportArray(row.penalties),
    bonuses: reportArray(row.bonuses),
    recommendations: reportArray(row.recommendations),
    main_alerts: storeHealthMainAlerts(factors),
    trend: row.trend ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function listStoreHealthScores(query = {}, user = {}, options = {}) {
  const range = storeHealthDateRange(query);
  const stores = await visibleStoreHealthStores(user, query.store_id || query.storeId || null);
  const scores = [];
  for (const store of stores) {
    let row = null;
    if (!options.force) {
      const saved = await pool.query(
        `SELECT * FROM store_health_scores
         WHERE store_id = $1::bigint
           AND date_from = $2::date
           AND date_to = $3::date
         LIMIT 1`,
        [store.id, range.date_from, range.date_to]
      ).catch(() => ({ rows: [] }));
      row = saved.rows[0] || null;
    }
    const score = row ? publicStoreHealthScore(row, store) : await calculateStoreHealthScore(store.id, range, { store, user });
    const previous = await storeHealthTrend(store.id, range.date_from);
    score.trend = previous === null ? null : score.score - Number(previous || 0);
    scores.push(score);
  }
  return scores.sort((a, b) => b.score - a.score || a.store_name.localeCompare(b.store_name));
}

async function getStoreHealthDetail(storeId, query = {}, user = {}) {
  const scores = await listStoreHealthScores({ ...query, store_id: storeId }, user);
  return scores[0] || null;
}

async function storeHealthHistory(storeId, user = {}, limit = 30) {
  const stores = await visibleStoreHealthStores(user, storeId);
  const store = stores[0];
  const result = await pool.query(
    `SELECT *
     FROM store_health_scores
     WHERE store_id = $1::bigint
     ORDER BY date_to DESC, updated_at DESC
     LIMIT $2::integer`,
    [store.id, Math.min(100, Math.max(1, Number(limit || 30)))]
  );
  return result.rows.map((row) => publicStoreHealthScore(row, store));
}

async function storeHealthNetworkSummary(user = {}) {
  if (!canViewStoreHealth(user)) return { average_score: 0, best_store: null, critical_store: null, alert_count: 0, stores: [] };
  const stores = await listStoreHealthScores({ period: "last_7" }, user).catch(() => []);
  if (!stores.length) return { average_score: 0, best_store: null, critical_store: null, alert_count: 0, stores: [] };
  const average = stores.reduce((sum, row) => sum + Number(row.score || 0), 0) / stores.length;
  const critical = [...stores].sort((a, b) => a.score - b.score)[0] || null;
  const best = stores[0] || null;
  return {
    average_score: Math.round(average),
    best_store: best ? { store_name: best.store_name, score: best.score, status: best.status_label } : null,
    critical_store: critical ? { store_name: critical.store_name, score: critical.score, status: critical.status_label } : null,
    alert_count: stores.reduce((sum, row) => sum + reportArray(row.main_alerts).length, 0),
    stores: stores.map((row) => ({
      store_id: row.store_id,
      store_name: row.store_name,
      score: row.score,
      status: row.status,
      status_label: row.status_label,
      trend: row.trend,
      main_alerts: row.main_alerts,
      recommendations: row.recommendations
    }))
  };
}

function founderReportDate(value = new Date()) {
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const error = new Error("Data report non valida.");
    error.status = 400;
    throw error;
  }
  return raw;
}

function reportNumber(value = 0) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function reportArray(value) {
  return Array.isArray(value) ? value : [];
}

async function reportQuery(sql, values = [], fallback = []) {
  try {
    const result = await pool.query(sql, values);
    return result.rows;
  } catch (error) {
    console.error("FOUNDER DAILY REPORT QUERY ERROR", error.message || error);
    return fallback;
  }
}

function normalizeReportMetal(value = "") {
  const text = String(value || "").toLowerCase();
  if (text.includes("argento")) return "Argento";
  if (text.includes("platino")) return "Platino";
  return "Oro";
}

function normalizeReportTitle(metal = "Oro", title = "") {
  const text = String(title || "").toLowerCase().replace(/\s+/g, "");
  const numeric = text.match(/\d+/)?.[0] || "";
  if (metal === "Oro") {
    const allowed = ["6", "9", "12", "14", "18", "21", "22", "24"];
    return allowed.includes(numeric) ? `${numeric}kt` : "Altro";
  }
  if (metal === "Argento") {
    return ["800", "925", "999"].includes(numeric) ? numeric : "Altro";
  }
  if (metal === "Platino") {
    return ["850", "900", "950"].includes(numeric) ? numeric : "Altro";
  }
  return "Altro";
}

function founderReportMaterials(acts = []) {
  const initial = {
    totals: { Oro: 0, Argento: 0, Platino: 0 },
    oro_by_title: { "6kt": 0, "9kt": 0, "12kt": 0, "14kt": 0, "18kt": 0, "21kt": 0, "22kt": 0, "24kt": 0, Altro: 0 },
    argento_by_title: { 800: 0, 925: 0, 999: 0, Altro: 0 },
    platino_by_title: { 850: 0, 900: 0, 950: 0, Altro: 0 }
  };
  acts.flatMap(materialLotsFromAct).forEach((lot) => {
    const metal = normalizeReportMetal(lot.metal);
    const grams = reportNumber(lot.weight);
    const title = normalizeReportTitle(metal, lot.title);
    initial.totals[metal] = reportNumber(initial.totals[metal]) + grams;
    if (metal === "Oro") initial.oro_by_title[title] = reportNumber(initial.oro_by_title[title]) + grams;
    if (metal === "Argento") initial.argento_by_title[title] = reportNumber(initial.argento_by_title[title]) + grams;
    if (metal === "Platino") initial.platino_by_title[title] = reportNumber(initial.platino_by_title[title]) + grams;
  });
  return initial;
}

function normalizeReportPayment(method = "") {
  const text = String(method || "").toLowerCase();
  if (text.includes("bonifico")) return "bonifico";
  if (text.includes("assegno")) return "assegno";
  if (text.includes("contant")) return "contanti";
  return "altro";
}

function hasPaymentReceipt(act = {}) {
  const attachmentGroups = [
    act.captureAttachments,
    act.fiscalDocumentAttachments,
    act.paymentAttachments,
    act.attachments
  ].filter(Array.isArray).flat();
  return attachmentGroups.some((attachment) => /contabile|bonifico|assegno|ricevuta/i.test(String(attachment?.key || attachment?.name || attachment?.label || "")));
}

function founderReportPayments(acts = []) {
  return acts.reduce((summary, act) => {
    const key = normalizeReportPayment(act.paymentMethod);
    const amount = reportNumber(act.amount);
    summary[`${key}_amount`] = reportNumber(summary[`${key}_amount`]) + amount;
    summary[`${key}_count`] = reportNumber(summary[`${key}_count`]) + 1;
    if (key === "bonifico" && !hasPaymentReceipt(act)) {
      summary.missing_receipts += 1;
    }
    return summary;
  }, {
    contanti_amount: 0,
    bonifico_amount: 0,
    assegno_amount: 0,
    altro_amount: 0,
    contanti_count: 0,
    bonifico_count: 0,
    assegno_count: 0,
    altro_count: 0,
    missing_receipts: 0,
    cash_limit_alerts: 0
  });
}

function groupReportActsByStore(acts = [], suspendedRows = [], shieldAlerts = []) {
  const groups = new Map();
  const ensure = (key, extra = {}) => {
    const label = key || "Negozio non indicato";
    if (!groups.has(label)) {
      groups.set(label, {
        negozio: label,
        store_id: extra.store_id || null,
        atti_completati: 0,
        atti_sospesi: 0,
        oro_acquistato: 0,
        argento_acquistato: 0,
        platino_acquistato: 0,
        contanti_erogati: 0,
        bonifici: 0,
        aurum_shield_alerts: 0,
        operatore_piu_attivo: "Dato non disponibile",
        stato_operativo: "Regolare"
      });
    }
    return groups.get(label);
  };
  const operatorsByStore = new Map();
  acts.forEach((act) => {
    const row = ensure(act.store, { store_id: act.storeId });
    row.atti_completati += 1;
    const payment = normalizeReportPayment(act.paymentMethod);
    if (payment === "contanti") row.contanti_erogati += reportNumber(act.amount);
    if (payment === "bonifico") row.bonifici += reportNumber(act.amount);
    materialLotsFromAct(act).forEach((lot) => {
      const metal = normalizeReportMetal(lot.metal);
      const grams = reportNumber(lot.weight);
      if (metal === "Oro") row.oro_acquistato += grams;
      if (metal === "Argento") row.argento_acquistato += grams;
      if (metal === "Platino") row.platino_acquistato += grams;
    });
    const operator = act.operatorName || act.operatorUsername || "Operatore non indicato";
    const opKey = `${row.negozio}|${operator}`;
    operatorsByStore.set(opKey, reportNumber(operatorsByStore.get(opKey)) + 1);
  });
  suspendedRows.forEach((item) => {
    ensure(item.store || item.negozio || item.store_name, { store_id: item.negozio_id || item.store_id }).atti_sospesi += 1;
  });
  shieldAlerts.forEach((item) => {
    const row = ensure(item.store_name || item.store || item.negozio || "Negozio non indicato", { store_id: item.store_id });
    row.aurum_shield_alerts += 1;
  });
  for (const row of groups.values()) {
    let best = { name: "Dato non disponibile", total: 0 };
    for (const [key, total] of operatorsByStore.entries()) {
      const [store, operator] = key.split("|");
      if (store === row.negozio && total > best.total) best = { name: operator, total };
    }
    row.operatore_piu_attivo = best.name;
    if (row.aurum_shield_alerts || row.atti_sospesi) row.stato_operativo = "Da verificare";
  }
  return [...groups.values()].sort((a, b) => b.atti_completati - a.atti_completati || a.negozio.localeCompare(b.negozio));
}

function reportActionSuggestions(report = {}) {
  const suggestions = [];
  const suspended = report.suspended_data?.current_total || 0;
  const critical = report.risks_data?.critical_count || 0;
  const failedBackups = report.backup_data?.failed_today || 0;
  const qualityFailed = report.quality_data?.failed_today || 0;
  if (suspended) suggestions.push("Verificare le pratiche sospese e assegnare priorità a quelle più vecchie.");
  if (critical) suggestions.push("Controllare gli alert Aurum Shield critici prima della chiusura giornata.");
  if (failedBackups) suggestions.push("Ripetere o verificare il backup fallito.");
  if (qualityFailed) suggestions.push("Analizzare i motivi ricorrenti dei controlli qualità non superati.");
  if (!suggestions.length) suggestions.push("Nessuna criticità rilevante: mantenere il controllo standard su atti, backup e giacenza.");
  return suggestions;
}

function publicFounderDailyReport(row = {}) {
  if (!row) return null;
  const summary = row.summary || {};
  return {
    id: row.id,
    report_date: row.report_date ? new Date(row.report_date).toISOString().slice(0, 10) : null,
    status: row.status || "generated",
    generated_by: row.generated_by || null,
    summary,
    stores_data: reportArray(row.stores_data),
    operators_data: reportArray(row.operators_data),
    risks_data: row.risks_data || {},
    quality_data: row.quality_data || {},
    suspended_data: row.suspended_data || {},
    approvals_data: row.approvals_data || {},
    notifications_data: row.notifications_data || {},
    audit_data: row.audit_data || {},
    backup_data: row.backup_data || {},
    store_health_data: row.store_health_data || {},
    academy_data: row.academy_data || {},
    ai_data: row.ai_data || {},
    pdf_path: row.pdf_path || null,
    error_message: row.error_message || "",
    actions_recommended: summary.actions_recommended || [],
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function listFounderDailyReports(limit = 30) {
  const rows = await reportQuery(
    `SELECT *
     FROM founder_daily_reports
     ORDER BY report_date DESC
     LIMIT $1::integer`,
    [Math.min(100, Math.max(1, Number(limit || 30)))]
  );
  return rows.map(publicFounderDailyReport);
}

async function getFounderDailyReport(date) {
  const reportDate = founderReportDate(date);
  const rows = await reportQuery(
    `SELECT * FROM founder_daily_reports WHERE report_date = $1::date LIMIT 1`,
    [reportDate]
  );
  return rows[0] ? publicFounderDailyReport(rows[0]) : null;
}

async function generateFounderDailyReport(date = new Date(), generatedBy = null, req = null) {
  const reportDate = founderReportDate(date);
  try {
    const [createdRows, completedRows, archivedRows, deletedRows, suspendedRows, suspendedTodayRows, shieldAlertRows, cashAlertRows] = await Promise.all([
      reportQuery(
        `SELECT COUNT(*)::int AS total
         FROM ${actsTable} a
         WHERE a.created_at >= $1::date
           AND a.created_at < ($1::date + INTERVAL '1 day')
           AND a.deleted_at IS NULL`,
        [reportDate]
      ),
      reportQuery(
        `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome
         FROM ${actsTable} a
         LEFT JOIN utenti u ON u.id = a.operatore_id
         WHERE ${realCompletedStatusSql("a")}
           AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) >= $1::date
           AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) < ($1::date + INTERVAL '1 day')
         ORDER BY COALESCE(a.completed_at, a.archived_at, a.created_at) DESC`,
        [reportDate]
      ),
      reportQuery(
        `SELECT COUNT(*)::int AS total
         FROM ${actsTable} a
         WHERE ${realCompletedStatusSql("a")}
           AND a.archived_at >= $1::date
           AND a.archived_at < ($1::date + INTERVAL '1 day')`,
        [reportDate]
      ),
      reportQuery(
        `SELECT COUNT(*)::int AS total
         FROM ${actsTable} a
         WHERE a.deleted_at >= $1::date
           AND a.deleted_at < ($1::date + INTERVAL '1 day')`,
        [reportDate]
      ),
      reportQuery(
        `SELECT a.*, u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome,
                shield.score AS risk_score, shield.risk_level
         FROM ${actsTable} a
         LEFT JOIN utenti u ON u.id = a.operatore_id
         LEFT JOIN aurum_shield_scores shield ON shield.sale_deed_id = a.id
         WHERE ${suspendedStatusWhere("a")}
         ORDER BY a.suspended_at DESC NULLS LAST, a.updated_at DESC
         LIMIT 100`,
        []
      ),
      reportQuery(
        `SELECT COUNT(*)::int AS total
         FROM ${actsTable} a
         WHERE ${suspendedStatusWhere("a")}
           AND a.suspended_at >= $1::date
           AND a.suspended_at < ($1::date + INTERVAL '1 day')`,
        [reportDate]
      ),
      reportQuery(
        `SELECT asa.*, n.nome AS store_name, a.practice_number
         FROM aurum_shield_alerts asa
         LEFT JOIN negozi n ON n.id = asa.store_id
         LEFT JOIN ${actsTable} a ON a.id = asa.sale_deed_id
         WHERE asa.created_at >= $1::date
           AND asa.created_at < ($1::date + INTERVAL '1 day')
         ORDER BY asa.created_at DESC
         LIMIT 100`,
        [reportDate]
      ),
      reportQuery(
        `SELECT COUNT(*)::int AS total
         FROM aurum_shield_alerts
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
           AND (alert_type ILIKE '%cash%' OR alert_type ILIKE '%contanti%' OR description ILIKE '%contanti%')`,
        [reportDate]
      )
    ]);

    const completedActs = completedRows.map((row) => ({
      ...rowToAct(row),
      storeId: row.negozio_id || null
    }));
    const previousCompletedRows = await reportQuery(
      `SELECT a.*
       FROM ${actsTable} a
       WHERE ${realCompletedStatusSql("a")}
         AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) >= ($1::date - INTERVAL '1 day')
         AND COALESCE(a.completed_at, a.archived_at, a.data_atto::timestamptz, a.updated_at, a.created_at) < $1::date`,
      [reportDate]
    );
    const metals = founderReportMaterials(completedActs);
    const previousMetals = founderReportMaterials(previousCompletedRows.map((row) => rowToAct(row)));
    const payments = founderReportPayments(completedActs);
    payments.cash_limit_alerts = Number(cashAlertRows[0]?.total || 0);

    const [riskCounts, riskTopRows, qualityCounts, qualityRows, approvalsRows, approvalStats, notificationsRows, auditActionRows, criticalAuditRows, operatorRows, backupsRows, academyRows, aiRows, fusionRows] = await Promise.all([
      reportQuery(
        `SELECT LOWER(COALESCE(risk_level, 'basso')) AS risk_level, COUNT(*)::int AS total
         FROM aurum_shield_scores
         WHERE updated_at >= $1::date
           AND updated_at < ($1::date + INTERVAL '1 day')
         GROUP BY LOWER(COALESCE(risk_level, 'basso'))`,
        [reportDate]
      ),
      reportQuery(
        `SELECT s.score, s.risk_level, s.summary, s.factors, a.practice_number, a.store
         FROM aurum_shield_scores s
         LEFT JOIN ${actsTable} a ON a.id = s.sale_deed_id
         WHERE s.updated_at >= $1::date
           AND s.updated_at < ($1::date + INTERVAL '1 day')
         ORDER BY s.score DESC, s.updated_at DESC
         LIMIT 10`,
        [reportDate]
      ),
      reportQuery(
        `SELECT LOWER(COALESCE(status, '')) AS status, COUNT(*)::int AS total
         FROM quality_checks
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
         GROUP BY LOWER(COALESCE(status, ''))`,
        [reportDate]
      ),
      reportQuery(
        `SELECT status, blocking_errors, warnings, required_actions, created_at
         FROM quality_checks
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
         ORDER BY created_at DESC
         LIMIT 50`,
        [reportDate]
      ),
      reportQuery(
        `SELECT ar.*, a.practice_number, a.store, u.username, u.nome, u.cognome
         FROM approval_requests ar
         LEFT JOIN ${actsTable} a ON a.id = ar.sale_deed_id
         LEFT JOIN utenti u ON u.id = ar.requested_by
         WHERE ar.created_at >= $1::date
           AND ar.created_at < ($1::date + INTERVAL '1 day')
         ORDER BY ar.created_at DESC
         LIMIT 50`,
        [reportDate]
      ),
      reportQuery(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day'))::int AS created_today,
           COUNT(*) FILTER (WHERE status = 'approved' AND reviewed_at >= $1::date AND reviewed_at < ($1::date + INTERVAL '1 day'))::int AS approved_today,
           COUNT(*) FILTER (WHERE status = 'rejected' AND reviewed_at >= $1::date AND reviewed_at < ($1::date + INTERVAL '1 day'))::int AS rejected_today,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
           ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60) FILTER (WHERE reviewed_at IS NOT NULL), 1) AS average_minutes
         FROM approval_requests`,
        [reportDate]
      ),
      reportQuery(
        `SELECT type, severity, read_at, COUNT(*)::int AS total
         FROM notifications
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
         GROUP BY type, severity, read_at`,
        [reportDate]
      ),
      reportQuery(
        `SELECT action, COUNT(*)::int AS total
         FROM audit_logs
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
         GROUP BY action`,
        [reportDate]
      ),
      reportQuery(
        `SELECT *
         FROM audit_logs
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
           AND (
             COALESCE(metadata->>'critical', '') = 'true'
             OR action IN ('delete_act','download_backup','change_user_role','delete_user','approval_required_blocked_completion','backup_failed','founder_daily_report_failed')
           )
         ORDER BY created_at DESC
         LIMIT 10`,
        [reportDate]
      ),
      reportQuery(
        `SELECT
           COALESCE(user_id, 0) AS user_id,
           COALESCE(user_name, 'Utente') AS user_name,
           COALESCE(user_role, '') AS user_role,
           COALESCE(store_name, '') AS store_name,
           COUNT(*) FILTER (WHERE action = 'login')::int AS logins,
           COUNT(*) FILTER (WHERE action IN ('create_act','save_draft'))::int AS acts_created,
           COUNT(*) FILTER (WHERE action = 'complete_act')::int AS acts_completed,
           COUNT(*) FILTER (WHERE action = 'update_act')::int AS acts_updated,
           COUNT(*) FILTER (WHERE action = 'delete_act')::int AS acts_deleted,
           COUNT(*) FILTER (WHERE action = 'print_customer_copy')::int AS customer_prints,
           COUNT(*) FILTER (WHERE action = 'sale_deed_suspended')::int AS suspended_created,
           COUNT(*) FILTER (WHERE action = 'approval_requested')::int AS approvals_requested,
           COUNT(*) FILTER (WHERE action IN ('api_request_error','quality_check_failed','aurum_shield_alert_created'))::int AS relevant_alerts,
           COUNT(*)::int AS total_activity
         FROM audit_logs
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
           AND user_id IS NOT NULL
         GROUP BY user_id, user_name, user_role, store_name
         ORDER BY total_activity DESC
         LIMIT 30`,
        [reportDate]
      ),
      reportQuery(
        `SELECT *
         FROM backups
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')
         ORDER BY created_at DESC`,
        [reportDate]
      ),
      reportQuery(
        `SELECT
           (SELECT COUNT(*)::int FROM academy_user_progress WHERE completed_at >= $1::date AND completed_at < ($1::date + INTERVAL '1 day')) AS courses_completed,
           (SELECT COUNT(*)::int FROM academy_certificates WHERE issued_at >= $1::date AND issued_at < ($1::date + INTERVAL '1 day')) AS certificates_issued,
           (SELECT COUNT(*)::int FROM academy_badges WHERE assigned_at >= $1::date AND assigned_at < ($1::date + INTERVAL '1 day')) AS badges_assigned,
           (SELECT COUNT(*)::int FROM academy_user_progress WHERE COALESCE(status, '') NOT ILIKE 'completato') AS pending_courses,
           (SELECT ROUND(AVG(COALESCE(percentuale, 0)), 1) FROM academy_user_progress) AS average_progress`,
        [reportDate]
      ),
      reportQuery(
        `SELECT
           (SELECT COUNT(*)::int FROM audit_logs WHERE action = 'ask_aurum' AND created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day')) AS aurum_questions,
           (SELECT COUNT(*)::int FROM aurum_support_requests WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day')) AS support_requests`,
        [reportDate]
      ),
      reportQuery(
        `SELECT COUNT(*)::int AS lots_created, COALESCE(SUM(peso_totale), 0)::numeric AS total_weight
         FROM fusion_lots
         WHERE created_at >= $1::date
           AND created_at < ($1::date + INTERVAL '1 day')`,
        [reportDate]
      )
    ]);

    const byRisk = Object.fromEntries(riskCounts.map((row) => [String(row.risk_level || "basso").toLowerCase(), Number(row.total || 0)]));
    const byQuality = Object.fromEntries(qualityCounts.map((row) => [String(row.status || "").toLowerCase(), Number(row.total || 0)]));
    const qualityReasons = {};
    qualityRows.forEach((row) => {
      [...reportArray(row.blocking_errors), ...reportArray(row.warnings), ...reportArray(row.required_actions)].forEach((item) => {
        const label = String(item?.label || item?.message || item || "").slice(0, 120);
        if (label) qualityReasons[label] = reportNumber(qualityReasons[label]) + 1;
      });
    });
    const factorFrequency = {};
    riskTopRows.forEach((row) => {
      reportArray(row.factors).forEach((factor) => {
        const label = String(factor?.type || factor?.message || factor || "fattore_rischio").slice(0, 120);
        factorFrequency[label] = reportNumber(factorFrequency[label]) + 1;
      });
    });
    const notificationTotal = notificationsRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const notificationCritical = notificationsRows
      .filter((row) => ["danger", "critical"].includes(String(row.severity || "").toLowerCase()))
      .reduce((sum, row) => sum + Number(row.total || 0), 0);
    const notificationUnread = notificationsRows
      .filter((row) => !row.read_at)
      .reduce((sum, row) => sum + Number(row.total || 0), 0);
    const auditByAction = Object.fromEntries(auditActionRows.map((row) => [row.action, Number(row.total || 0)]));
    const latestBackupRows = await reportQuery(
      `SELECT *
       FROM backups
       WHERE status <> 'deleted'
       ORDER BY created_at DESC
       LIMIT 1`
    );
    const storeHealthRows = await listStoreHealthScores({ date_from: reportDate, date_to: reportDate }, generatedBy || { ruolo: "founder" }).catch((error) => {
      console.error("FOUNDER DAILY REPORT STORE HEALTH ERROR", error.message || error);
      return [];
    });
    const storeHealthAverage = storeHealthRows.length
      ? Math.round(storeHealthRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / storeHealthRows.length)
      : 0;
    const summary = {
      report_date: reportDate,
      generated_at: new Date().toISOString(),
      acts_created_today: Number(createdRows[0]?.total || 0),
      acts_completed_today: completedActs.length,
      acts_archived_today: Number(archivedRows[0]?.total || 0),
      acts_deleted_today: Number(deletedRows[0]?.total || 0),
      suspended_total: suspendedRows.length,
      suspended_today: Number(suspendedTodayRows[0]?.total || 0),
      approvals_approved_today: Number(approvalStats[0]?.approved_today || 0),
      approvals_rejected_today: Number(approvalStats[0]?.rejected_today || 0),
      fusions_today: Number(fusionRows[0]?.lots_created || 0),
      metals,
      metals_variation_vs_previous_day: {
        Oro: reportNumber(metals.totals.Oro) - reportNumber(previousMetals.totals.Oro),
        Argento: reportNumber(metals.totals.Argento) - reportNumber(previousMetals.totals.Argento),
        Platino: reportNumber(metals.totals.Platino) - reportNumber(previousMetals.totals.Platino)
      },
      payments,
      actions_recommended: []
    };

    const reportPayload = {
      summary,
      stores_data: groupReportActsByStore(completedActs, suspendedRows, shieldAlertRows),
      operators_data: operatorRows,
      risks_data: {
        low_count: byRisk.basso || byRisk.low || 0,
        medium_count: byRisk.medio || byRisk.medium || 0,
        high_count: byRisk.alto || byRisk.high || 0,
        critical_count: byRisk.critico || byRisk.critical || 0,
        alerts_today: shieldAlertRows.length,
        top_risky_practices: riskTopRows,
        recurring_reasons: Object.entries(factorFrequency).map(([reason, total]) => ({ reason, total })).sort((a, b) => b.total - a.total).slice(0, 10),
        main_alerts: shieldAlertRows.slice(0, 10)
      },
      quality_data: {
        passed_today: byQuality.completabile || byQuality.ok || byQuality.passed || 0,
        failed_today: byQuality.non_completabile || byQuality.failed || 0,
        warning_today: byQuality.attenzione || byQuality.warning || 0,
        recurring_missing_data: Object.entries(qualityReasons).map(([reason, total]) => ({ reason, total })).sort((a, b) => b.total - a.total).slice(0, 10)
      },
      suspended_data: {
        created_today: Number(suspendedTodayRows[0]?.total || 0),
        current_total: suspendedRows.length,
        older_than_24h: suspendedRows.filter((row) => row.suspended_at && Date.now() - new Date(row.suspended_at).getTime() > 24 * 60 * 60 * 1000).length,
        older_than_48h: suspendedRows.filter((row) => row.suspended_at && Date.now() - new Date(row.suspended_at).getTime() > 48 * 60 * 60 * 1000).length,
        open_practices: suspendedRows.slice(0, 15).map((row) => ({
          id: row.id,
          practice_number: row.practice_number,
          cliente: [row.cliente_nome, row.cliente_cognome].filter(Boolean).join(" "),
          negozio: row.store,
          operatore: [row.operator_nome, row.operator_cognome].filter(Boolean).join(" ") || row.operator_username,
          motivi: reportArray(row.suspended_reasons),
          risk_score: Number(row.risk_score || 0),
          risk_level: row.risk_level || "",
          suspended_at: row.suspended_at
        }))
      },
      approvals_data: {
        created_today: Number(approvalStats[0]?.created_today || 0),
        approved_today: Number(approvalStats[0]?.approved_today || 0),
        rejected_today: Number(approvalStats[0]?.rejected_today || 0),
        pending: Number(approvalStats[0]?.pending || 0),
        average_approval_minutes: Number(approvalStats[0]?.average_minutes || 0),
        latest: approvalsRows.slice(0, 10)
      },
      notifications_data: {
        created_today: notificationTotal,
        critical_today: notificationCritical,
        unread_today: notificationUnread,
        approval_notifications: notificationsRows.filter((row) => String(row.type || "").startsWith("approval")).reduce((sum, row) => sum + Number(row.total || 0), 0),
        backup_notifications: notificationsRows.filter((row) => String(row.type || "").includes("backup")).reduce((sum, row) => sum + Number(row.total || 0), 0),
        risk_notifications: notificationsRows.filter((row) => String(row.type || "").includes("shield")).reduce((sum, row) => sum + Number(row.total || 0), 0)
      },
      audit_data: {
        actions_today: auditActionRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
        critical_actions: criticalAuditRows.map(publicAuditLog),
        deleted_acts: auditByAction.delete_act || 0,
        updated_users: auditByAction.update_user || 0,
        backup_downloads: auditByAction.download_backup || 0,
        role_changes: auditByAction.change_user_role || 0,
        unauthorized_accesses: auditByAction.approval_unauthorized_attempt || 0,
        latest_critical_events: criticalAuditRows.map(publicAuditLog)
      },
      backup_data: {
        created_today: backupsRows.length,
        verified_today: backupsRows.filter((row) => row.verification_status === "verified").length,
        failed_today: backupsRows.filter((row) => row.status === "failed").length,
        latest_backup: latestBackupRows[0] || null,
        latest_restore_test_status: latestBackupRows[0]?.restore_test_status || "not_tested"
      },
      store_health_data: {
        average_score: storeHealthAverage,
        best_store: storeHealthRows[0] || null,
        critical_store: [...storeHealthRows].sort((a, b) => a.score - b.score)[0] || null,
        stores: storeHealthRows.map((row) => ({
          store_id: row.store_id,
          store_name: row.store_name,
          score: row.score,
          status: row.status,
          status_label: row.status_label,
          trend: row.trend,
          main_alerts: row.main_alerts,
          recommendations: row.recommendations
        }))
      },
      academy_data: {
        courses_completed_today: Number(academyRows[0]?.courses_completed || 0),
        certificates_issued_today: Number(academyRows[0]?.certificates_issued || 0),
        badges_assigned_today: Number(academyRows[0]?.badges_assigned || 0),
        pending_courses: Number(academyRows[0]?.pending_courses || 0),
        average_progress: Number(academyRows[0]?.average_progress || 0)
      },
      ai_data: {
        aurum_questions_today: Number(aiRows[0]?.aurum_questions || 0),
        support_requests_today: Number(aiRows[0]?.support_requests || 0),
        main_topics: criticalAuditRows
          .filter((row) => row.action === "ask_aurum")
          .map((row) => row.entity_label || row.metadata?.question || "Domanda Aurum")
          .slice(0, 8)
      }
    };
    reportPayload.summary.actions_recommended = reportActionSuggestions(reportPayload);

    const result = await pool.query(
      `INSERT INTO founder_daily_reports (
        report_date, status, generated_by, summary, stores_data, operators_data, risks_data,
        quality_data, suspended_data, approvals_data, notifications_data, audit_data,
        backup_data, store_health_data, academy_data, ai_data, error_message, updated_at
      ) VALUES (
        $1::date,'generated',$2::bigint,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,
        $7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
        $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,NULL,NOW()
      )
      ON CONFLICT (report_date) DO UPDATE SET
        status = 'generated',
        generated_by = EXCLUDED.generated_by,
        summary = EXCLUDED.summary,
        stores_data = EXCLUDED.stores_data,
        operators_data = EXCLUDED.operators_data,
        risks_data = EXCLUDED.risks_data,
        quality_data = EXCLUDED.quality_data,
        suspended_data = EXCLUDED.suspended_data,
        approvals_data = EXCLUDED.approvals_data,
        notifications_data = EXCLUDED.notifications_data,
        audit_data = EXCLUDED.audit_data,
        backup_data = EXCLUDED.backup_data,
        store_health_data = EXCLUDED.store_health_data,
        academy_data = EXCLUDED.academy_data,
        ai_data = EXCLUDED.ai_data,
        error_message = NULL,
        updated_at = NOW()
      RETURNING *`,
      [
        reportDate,
        generatedBy?.id || generatedBy || null,
        sanitizeForPostgres(reportPayload.summary),
        sanitizeForPostgres(reportPayload.stores_data),
        sanitizeForPostgres(reportPayload.operators_data),
        sanitizeForPostgres(reportPayload.risks_data),
        sanitizeForPostgres(reportPayload.quality_data),
        sanitizeForPostgres(reportPayload.suspended_data),
        sanitizeForPostgres(reportPayload.approvals_data),
        sanitizeForPostgres(reportPayload.notifications_data),
        sanitizeForPostgres(reportPayload.audit_data),
        sanitizeForPostgres(reportPayload.backup_data),
        sanitizeForPostgres(reportPayload.store_health_data),
        sanitizeForPostgres(reportPayload.academy_data),
        sanitizeForPostgres(reportPayload.ai_data)
      ]
    );
    const report = publicFounderDailyReport(result.rows[0]);
    void writeAuditLog({
      req,
      user: generatedBy,
      action: "founder_daily_report_generated",
      entityType: "founder_daily_report",
      entityId: report.id,
      entityLabel: report.report_date,
      afterData: { report_date: report.report_date, summary: report.summary },
      metadata: { critical_alerts: report.risks_data?.critical_count || 0 }
    });
    void createNotification({
      targetRole: "founder",
      title: "Founder Daily Report generato",
      message: `Il report operativo del ${report.report_date} è disponibile.`,
      type: "system",
      severity: report.risks_data?.critical_count || report.backup_data?.failed_today ? "warning" : "success",
      entityType: "founder_daily_report",
      entityId: report.id,
      actionUrl: "#founderDailyReport",
      metadata: { report_date: report.report_date, critical_alerts: report.risks_data?.critical_count || 0 },
      createdBy: generatedBy?.id || null,
      actor: generatedBy,
      req
    });
    return report;
  } catch (error) {
    await pool.query(
      `INSERT INTO founder_daily_reports (report_date, status, generated_by, error_message, updated_at)
       VALUES ($1::date,'error',$2::bigint,$3::text,NOW())
       ON CONFLICT (report_date) DO UPDATE SET
         status = 'error',
         generated_by = EXCLUDED.generated_by,
         error_message = EXCLUDED.error_message,
         updated_at = NOW()`,
      [reportDate, generatedBy?.id || generatedBy || null, String(error.message || "Errore generazione report").slice(0, 500)]
    ).catch(() => {});
    void writeAuditLog({
      req,
      user: generatedBy,
      action: "founder_daily_report_failed",
      entityType: "founder_daily_report",
      entityLabel: reportDate,
      metadata: { error: error.message, critical: true }
    });
    throw error;
  }
}

function pdfLine(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(String(value ?? "Dato non disponibile"));
}

function pdfSection(doc, title) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#c86a17").text(title);
  doc.fillColor("#151515").font("Helvetica").fontSize(10);
}

function writeFounderDailyReportPdf(response, report) {
  const doc = new PDFDocument({ margin: 42, size: "A4" });
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="founder-daily-report-${report.report_date}.pdf"`);
  doc.pipe(response);
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#151515").text("Founder Daily Report");
  doc.font("Helvetica").fontSize(11).fillColor("#c86a17").text("OroActive");
  doc.moveDown(0.4).fillColor("#151515");
  pdfLine(doc, "Data report", report.report_date);
  pdfLine(doc, "Stato", report.status);

  const summary = report.summary || {};
  pdfSection(doc, "Riepilogo generale");
  [
    ["Atti creati oggi", summary.acts_created_today],
    ["Atti completati oggi", summary.acts_completed_today],
    ["Atti archiviati oggi", summary.acts_archived_today],
    ["Atti eliminati oggi", summary.acts_deleted_today],
    ["Pratiche sospese", summary.suspended_total],
    ["Autorizzazioni approvate", summary.approvals_approved_today],
    ["Autorizzazioni rifiutate", summary.approvals_rejected_today]
  ].forEach(([label, value]) => pdfLine(doc, label, value));

  pdfSection(doc, "Metalli e pagamenti");
  pdfLine(doc, "Oro acquistato", `${reportNumber(summary.metals?.totals?.Oro).toFixed(2)} gr`);
  pdfLine(doc, "Argento acquistato", `${reportNumber(summary.metals?.totals?.Argento).toFixed(2)} gr`);
  pdfLine(doc, "Platino acquistato", `${reportNumber(summary.metals?.totals?.Platino).toFixed(2)} gr`);
  pdfLine(doc, "Contanti erogati", `${reportNumber(summary.payments?.contanti_amount).toFixed(2)} EUR`);
  pdfLine(doc, "Bonifici", `${reportNumber(summary.payments?.bonifico_amount).toFixed(2)} EUR`);
  pdfLine(doc, "Assegni", `${reportNumber(summary.payments?.assegno_amount).toFixed(2)} EUR`);

  pdfSection(doc, "Negozi");
  reportArray(report.stores_data).slice(0, 12).forEach((store) => {
    doc.text(`${store.negozio}: ${store.atti_completati} atti, ${reportNumber(store.oro_acquistato).toFixed(2)} gr oro, ${store.atti_sospesi} sospese, ${store.aurum_shield_alerts} alert`);
  });
  if (!reportArray(report.stores_data).length) doc.text("Nessun dato negozio disponibile.");

  pdfSection(doc, "Operatori");
  reportArray(report.operators_data).slice(0, 12).forEach((operator) => {
    doc.text(`${operator.user_name}: ${operator.total_activity} attività, ${operator.acts_created} atti creati, ${operator.acts_completed} completati`);
  });
  if (!reportArray(report.operators_data).length) doc.text("Nessuna attività operatore disponibile.");

  pdfSection(doc, "Aurum Shield, qualità e sospese");
  pdfLine(doc, "Rischio alto", report.risks_data?.high_count || 0);
  pdfLine(doc, "Rischio critico", report.risks_data?.critical_count || 0);
  pdfLine(doc, "Controlli qualità non superati", report.quality_data?.failed_today || 0);
  pdfLine(doc, "Pratiche sospese aperte", report.suspended_data?.current_total || 0);

  pdfSection(doc, "Backup, Academy, Audit");
  pdfLine(doc, "Backup creati", report.backup_data?.created_today || 0);
  pdfLine(doc, "Backup falliti", report.backup_data?.failed_today || 0);
  pdfLine(doc, "Health Score medio rete", report.store_health_data?.average_score || 0);
  reportArray(report.store_health_data?.stores).slice(0, 6).forEach((store) => {
    doc.text(`${store.store_name}: ${store.score}/100 · ${store.status_label || store.status || "stato"}`);
  });
  pdfLine(doc, "Corsi completati", report.academy_data?.courses_completed_today || 0);
  pdfLine(doc, "Azioni audit", report.audit_data?.actions_today || 0);

  pdfSection(doc, "Azioni consigliate");
  reportArray(report.actions_recommended).forEach((item, index) => {
    doc.text(`${index + 1}. ${item}`);
  });

  doc.moveDown(1.2).fontSize(9).fillColor("#777").text("Report generato automaticamente da OroActive.");
  doc.end();
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

function aurumShieldRiskLevel(score = 0) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  if (value <= 30) return "basso";
  if (value <= 60) return "medio";
  if (value <= 80) return "alto";
  return "critico";
}

function aurumShieldRiskSummary(level = "basso") {
  return {
    basso: "Pratica sicura",
    medio: "Pratica da controllare",
    alto: "Attenzione operativa",
    critico: "Alto rischio — richiede verifica"
  }[level] || "Pratica da controllare";
}

function normalizeAurumShieldSettingValue(key, value) {
  if (key === "factor_weights") {
    const parsed = typeof value === "string" ? JSON.parse(value || "{}") : value;
    return {
      ...defaultAurumShieldSettings.factor_weights,
      ...(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {})
    };
  }
  if (["block_critical_practices", "dashboard_alerts_enabled", "ai_explanation_enabled"].includes(key)) {
    return value === true || value === "true" || value === 1 || value === "1";
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultAurumShieldSettings[key];
}

async function getAurumShieldSettings() {
  const result = await pool.query("SELECT key, value FROM aurum_shield_settings");
  const settings = { ...defaultAurumShieldSettings, factor_weights: { ...defaultAurumShieldSettings.factor_weights } };
  result.rows.forEach((row) => {
    if (!(row.key in settings)) return;
    settings[row.key] = normalizeAurumShieldSettingValue(row.key, row.value);
  });
  settings.factor_weights = {
    ...defaultAurumShieldSettings.factor_weights,
    ...(settings.factor_weights || {})
  };
  return settings;
}

async function updateAurumShieldSettings(input = {}, user = {}) {
  if (normalizeRole(user.ruolo) !== "founder") {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const merged = {
    ...(await getAurumShieldSettings()),
    ...Object.fromEntries(Object.entries(input).filter(([key]) => key in defaultAurumShieldSettings))
  };
  for (const key of Object.keys(defaultAurumShieldSettings)) {
    const value = normalizeAurumShieldSettingValue(key, merged[key]);
    await pool.query(
      `INSERT INTO aurum_shield_settings (key, value, updated_by, updated_at)
       VALUES ($1::text, $2::jsonb, $3::bigint, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [key, JSON.stringify(value), user.id || null]
    );
  }
  return getAurumShieldSettings();
}

function isValidItalianFiscalCode(value = "") {
  return /^[A-Z0-9]{16}$/.test(normalizeFiscalCode(value));
}

function cleanComparableName(value = "") {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function aurumShieldCaptureKeys(act = {}) {
  const keys = new Set();
  (Array.isArray(act.captures) ? act.captures : []).forEach((key) => keys.add(String(key || "")));
  (Array.isArray(act.captureAttachments) ? act.captureAttachments : []).forEach((attachment) => keys.add(String(attachment.key || "")));
  (Array.isArray(act.payload?.captureAttachments) ? act.payload.captureAttachments : []).forEach((attachment) => keys.add(String(attachment.key || "")));
  return keys;
}

function aurumShieldHasCapture(act, pattern) {
  return [...aurumShieldCaptureKeys(act)].some((key) => pattern.test(key));
}

function normalizeAurumShieldAct(input = {}, saleDeedRow = null) {
  const base = saleDeedRow ? rowToAct(saleDeedRow) : {};
  const payload = input.payload || base.payload || {};
  return {
    ...base,
    ...payload,
    ...input,
    id: input.id || input.sale_deed_id || input.saleDeedId || base.id || null,
    fiscalCode: normalizeFiscalCode(input.fiscalCode || input.codice_fiscale || input.codiceFiscale || base.fiscalCode || ""),
    documentNumber: String(input.documentNumber || input.numeroDocumento || payload.documentNumber || base.documentNumber || "").trim(),
    documentExpiry: dateOrNull(input.documentExpiry || input.scadenzaDocumento || payload.documentExpiry || base.documentExpiry || ""),
    paymentMethod: input.paymentMethod || input.metodo_pagamento || base.paymentMethod || "",
    amount: numberFrom(input.amount ?? input.totale ?? base.amount),
    iban: String(input.iban || base.iban || "").replace(/\s+/g, "").toUpperCase(),
    accountHolder: input.accountHolder || input.intestatario_conto || payload.accountHolder || base.accountHolder || "",
    name: input.name || input.cliente_nome || base.name || "",
    surname: input.surname || input.cliente_cognome || base.surname || "",
    birthDate: dateOrNull(input.birthDate || input.nascita || payload.birthDate || base.birthDate || ""),
    birthPlace: input.birthPlace || input.luogo || payload.birthPlace || base.birthPlace || "",
    birthProvince: input.birthProvince || input.provinciaNascita || payload.birthProvince || base.birthProvince || "",
    phone: input.phone || input.telefono || payload.phone || base.phone || "",
    email: input.email || payload.email || base.email || "",
    address: input.address || input.indirizzo || payload.address || base.address || "",
    residenceProvince: input.residenceProvince || input.provinciaResidenza || payload.residenceProvince || base.residenceProvince || "",
    documentType: input.documentType || input.tipoDocumento || payload.documentType || base.documentType || "",
    profession: input.profession || input.professione || payload.profession || base.profession || "",
    date: dateOrNull(input.date || input.data_atto || base.date) || new Date().toISOString().slice(0, 10),
    store: input.store || base.store || "",
    storeCode: input.storeCode || input.codice_negozio || base.storeCode || "",
    operatorId: input.operatorId || input.operatore_id || base.operatorId || null,
    signatures: Array.isArray(input.signatures) ? input.signatures : Array.isArray(base.signatures) ? base.signatures : [],
    signatureImages: Array.isArray(input.signatureImages) ? input.signatureImages : Array.isArray(base.signatureImages) ? base.signatureImages : [],
    captureAttachments: Array.isArray(input.captureAttachments) ? input.captureAttachments : Array.isArray(base.captureAttachments) ? base.captureAttachments : [],
    captures: Array.isArray(input.captures) ? input.captures : Array.isArray(base.captures) ? base.captures : [],
    items: Array.isArray(input.items) ? input.items : Array.isArray(base.items) ? base.items : [],
    materials: Array.isArray(input.materials) ? input.materials : Array.isArray(base.materials) ? base.materials : [],
    qualityReview: input.qualityReview || base.qualityReview || null,
    createdAt: input.createdAt || base.createdAt || null,
    completedAt: input.completedAt || base.completedAt || null,
    status: normalizeWorkflowStatus(input.status || base.status || "draft")
  };
}

async function aurumShieldContext(act = {}, settings = {}) {
  const fiscalCode = normalizeFiscalCode(act.fiscalCode || "");
  const context = {
    client_id: act.client_id || act.cliente_id || null,
    client_history_count: 0,
    frequent_sales_count: 0,
    multi_store_count: 0,
    cash_window_total: 0,
    previous_alerts: 0,
    duplicate_document_clients: 0,
    shared_iban_clients: 0,
    frequent_updates: 0,
    operator_deleted_count: 0,
    store_alert_count: 0
  };
  const actId = act.id || act.sale_deed_id || null;
  const date = dateOrNull(act.date) || new Date().toISOString().slice(0, 10);
  const windowDays = Number(settings.cash_window_days || 7);

  if (fiscalCode) {
    const client = await pool.query("SELECT id FROM clienti WHERE UPPER(codice_fiscale) = $1::text LIMIT 1", [fiscalCode]);
    if (client.rows[0]?.id) context.client_id = client.rows[0].id;
    const history = await pool.query(
      `SELECT COUNT(*)::int AS count,
              COUNT(*) FILTER (
                WHERE data_atto BETWEEN ($2::date - ($3::integer * INTERVAL '1 day')) AND $2::date
              )::int AS recent_count,
              COUNT(DISTINCT store)::int FILTER (
                WHERE data_atto BETWEEN ($2::date - ($3::integer * INTERVAL '1 day')) AND $2::date
              ) AS stores,
              COALESCE(SUM(totale) FILTER (
                WHERE LOWER(COALESCE(payment_method, '')) LIKE '%contanti%'
                  AND data_atto BETWEEN ($2::date - ($3::integer * INTERVAL '1 day')) AND $2::date
              ), 0)::numeric AS cash_total
       FROM ${actsTable}
       WHERE UPPER(COALESCE(codice_fiscale, '')) = $1::text
         AND deleted_at IS NULL
         AND COALESCE(status, '') NOT ILIKE 'deleted'
         AND ($4::text = '' OR id::text <> $4::text)`,
      [fiscalCode, date, windowDays, actId ? String(actId) : ""]
    );
    const row = history.rows[0] || {};
    context.client_history_count = Number(row.count || 0);
    context.frequent_sales_count = Number(row.recent_count || 0);
    context.multi_store_count = Number(row.stores || 0);
    context.cash_window_total = Number(row.cash_total || 0);

    const previousAlerts = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM antifrode_alerts af
       LEFT JOIN ${actsTable} a ON a.id = af.atto_id
       WHERE af.stato IN ('nuovo', 'in verifica')
         AND (
           af.cliente_id = $1::bigint
           OR UPPER(COALESCE(a.codice_fiscale, '')) = $2::text
         )`,
      [context.client_id || null, fiscalCode]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    context.previous_alerts = Number(previousAlerts.rows[0]?.count || 0);
  }

  if (act.documentNumber) {
    const duplicateDocs = await pool.query(
      `SELECT COUNT(DISTINCT UPPER(COALESCE(codice_fiscale, '')))::int AS clients
       FROM ${actsTable}
       WHERE COALESCE(payload->>'documentNumber', '') = $1::text
         AND deleted_at IS NULL
         AND ($2::text = '' OR UPPER(COALESCE(codice_fiscale, '')) <> $2::text)`,
      [act.documentNumber, fiscalCode]
    );
    context.duplicate_document_clients = Number(duplicateDocs.rows[0]?.clients || 0);
  }

  if (act.iban) {
    const duplicateIbans = await pool.query(
      `SELECT COUNT(DISTINCT UPPER(COALESCE(codice_fiscale, '')))::int AS clients
       FROM ${actsTable}
       WHERE iban = $1::text
         AND deleted_at IS NULL
         AND ($2::text = '' OR UPPER(COALESCE(codice_fiscale, '')) <> $2::text)`,
      [act.iban, fiscalCode]
    );
    context.shared_iban_clients = Number(duplicateIbans.rows[0]?.clients || 0);
  }

  if (actId) {
    const updates = await pool.query(
      `SELECT COUNT(*)::int AS updates
       FROM audit_logs
       WHERE method IN ('PUT', 'PATCH')
         AND (route = $1::text OR route = $2::text OR route = $3::text OR route = $4::text)
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [`/api/atti/${actId}`, `/api/acts/${actId}`, `/api/atti/${encodeURIComponent(String(actId))}`, `/api/acts/${encodeURIComponent(String(actId))}`]
    ).catch(() => ({ rows: [{ updates: 0 }] }));
    context.frequent_updates = Number(updates.rows[0]?.updates || 0);
  }

  if (act.operatorId) {
    const deleted = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM ${actsTable}
       WHERE operatore_id = $1::bigint
         AND deleted_at >= NOW() - INTERVAL '30 days'`,
      [act.operatorId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    context.operator_deleted_count = Number(deleted.rows[0]?.count || 0);
  }

  if (act.store) {
    const storeAlerts = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM antifrode_alerts af
       JOIN ${actsTable} a ON a.id = af.atto_id
       WHERE a.store = $1::text
         AND af.stato IN ('nuovo', 'in verifica')
         AND af.created_at >= NOW() - INTERVAL '30 days'`,
      [act.store]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    context.store_alert_count = Number(storeAlerts.rows[0]?.count || 0);
  }
  return context;
}

async function calculateAurumShieldRisk(input = {}, user = {}) {
  const settings = await getAurumShieldSettings();
  const saleDeedId = input.sale_deed_id || input.saleDeedId || input.id || "";
  let saleDeedRow = null;
  if (saleDeedId) {
    saleDeedRow = await findExisting(saleDeedId);
    if (saleDeedRow && !canAccessAct(saleDeedRow, user)) {
      const error = new Error("Non autorizzato");
      error.status = 403;
      throw error;
    }
  }
  const act = normalizeAurumShieldAct(input.draft_data || input.draftData || input, saleDeedRow);
  if (saleDeedRow) {
    act.id = saleDeedRow.id;
    act.client_id = saleDeedRow.cliente_id || null;
    act.negozio_id = saleDeedRow.negozio_id || null;
  }
  const context = await aurumShieldContext(act, settings);
  const factors = [];
  const recommendations = new Set();
  const weight = (type) => Number(settings.factor_weights?.[type] ?? defaultAurumShieldSettings.factor_weights[type] ?? 0);
  const addFactor = (type, severity, message, recommendation, options = {}) => {
    const points = Number(options.points ?? weight(type));
    factors.push({ type, severity, points, message });
    if (recommendation) recommendations.add(recommendation);
  };

  if (!isValidItalianFiscalCode(act.fiscalCode)) {
    addFactor("missing_fiscal_code", "high", "Codice fiscale mancante o non valido.", "Verifica anagrafica e codice fiscale prima di completare.");
  }
  if (context.client_history_count === 0 && isValidItalianFiscalCode(act.fiscalCode)) {
    addFactor("new_client", "low", "Cliente nuovo senza storico OroActive.", "Controlla con attenzione documento e dati cliente.");
  }
  if (context.previous_alerts > 0) {
    addFactor("previous_alerts", "high", "Cliente con alert precedenti aperti.", "Consulta lo storico alert prima di procedere.");
  }
  if (context.frequent_sales_count >= Number(settings.frequent_sales_limit || 3)) {
    addFactor("frequent_sales", "high", `Cliente con ${context.frequent_sales_count} operazioni negli ultimi ${settings.cash_window_days} giorni.`, "Verifica possibile frazionamento e storico cliente.");
  }
  if (context.multi_store_count > 1) {
    addFactor("multi_store_sales", "high", "Cliente presente in più negozi in poco tempo.", "Confronta lo storico cliente tra negozi.");
  }

  const today = new Date();
  const documentExpiry = act.documentExpiry ? new Date(act.documentExpiry) : null;
  if (documentExpiry && !Number.isNaN(documentExpiry.getTime())) {
    const daysToExpiry = Math.ceil((documentExpiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (daysToExpiry < 0) {
      addFactor("expired_document", "critical", "Documento scaduto.", "Richiedi documento valido prima del completamento.");
    } else if (daysToExpiry <= Number(settings.document_expiry_warning_days || 30)) {
      addFactor("document_expiring", "medium", "Documento vicino alla scadenza.", "Verifica validità del documento.");
    }
  }
  if (act.documentNumber && context.duplicate_document_clients > 0) {
    addFactor("duplicate_document", "high", "Numero documento già usato da altro cliente.", "Controlla documento e identità cliente.");
  }
  if (!aurumShieldHasCapture(act, /^documento-fronte/) || !aurumShieldHasCapture(act, /^documento-retro/)) {
    addFactor("missing_payment_receipt", "medium", "Foto fronte/retro documento non complete.", "Completa gli allegati documento.");
  }

  const cashLimit = Number(settings.cash_limit_amount || 500);
  const amount = numberFrom(act.amount);
  const predictedCash = context.cash_window_total + (isCashPaymentMethod(act.paymentMethod) ? amount : 0);
  if (isCashPaymentMethod(act.paymentMethod) && predictedCash > cashLimit) {
    addFactor("cash_over_limit", "critical", "Pagamento contanti superiore alla soglia configurata.", "Usa pagamento tracciabile o chiedi verifica responsabile.");
  } else if (isCashPaymentMethod(act.paymentMethod) && predictedCash >= cashLimit * 0.8) {
    addFactor("cash_near_limit", "high", "Pagamento contanti vicino alla soglia configurata.", "Verifica limite contanti negli ultimi giorni.");
  }
  if (act.iban && context.shared_iban_clients > 0) {
    addFactor("shared_iban", "high", "Stesso IBAN usato da clienti diversi.", "Verifica intestatario conto e storico pagamenti.");
  }
  const holder = cleanComparableName(act.accountHolder);
  const clientName = cleanComparableName(`${act.name}${act.surname}`);
  if (act.iban && holder && clientName && holder !== clientName && !holder.includes(clientName) && !clientName.includes(holder)) {
    addFactor("iban_holder_mismatch", "medium", "IBAN intestato a persona diversa dal cliente.", "Controlla intestatario conto prima del pagamento.");
  }
  if (!isCashPaymentMethod(act.paymentMethod) && amount > 0 && !aurumShieldHasCapture(act, /^pagamento-/)) {
    addFactor("missing_payment_receipt", "medium", "Contabile mancante per pagamento tracciabile.", "Carica la contabile del pagamento.");
  }

  if (!aurumShieldHasCapture(act, /preziosi/i)) {
    addFactor("missing_precious_photos", "medium", "Foto preziosi mancanti.", "Carica foto chiare degli oggetti ceduti.");
  }
  const signatureBooleans = Array.isArray(act.signatures) ? act.signatures : [];
  const signatureImages = Array.isArray(act.signatureImages) ? act.signatureImages : [];
  const signedCount = Math.max(signatureBooleans.filter(Boolean).length, signatureImages.filter(Boolean).length);
  if (signedCount < 4 && ["completed", "archived_completed"].includes(normalizeWorkflowStatus(act.status))) {
    addFactor("missing_signature", "high", "Firme mancanti per una pratica in completamento.", "Completa tutte le firme obbligatorie.");
  }
  const lots = materialLotsFromAct(act);
  const hasMissingMaterial = !lots.length || lots.some((lot) => !lot.title || Number(lot.weight || 0) <= 0);
  if (hasMissingMaterial) {
    addFactor("missing_weight_or_title", "medium", "Peso o titolo/caratura mancante sugli oggetti preziosi.", "Completa peso, metallo e titolo degli oggetti.");
  }
  const totalWeight = lots.reduce((sum, lot) => sum + Number(lot.weight || 0), 0) || numberFrom(act.weight);
  if (amount > 0 && totalWeight > 0) {
    const euroPerGram = amount / totalWeight;
    if (euroPerGram > 150 || euroPerGram < 5) {
      addFactor("anomalous_amount_weight", "medium", "Importo anomalo rispetto al peso inserito.", "Ricontrolla pesi, titolo e quotazione applicata.");
    }
  }
  if (context.frequent_updates > 3) {
    addFactor("frequent_updates", "medium", "Atto modificato più volte recentemente.", "Verifica che le modifiche siano tracciate e corrette.");
  }
  const qualityStatus = String(act.qualityReview?.status || "").toLowerCase();
  if (qualityStatus === "negative") {
    addFactor("negative_quality", "high", "Controllo qualità negativo.", "Gestisci feedback qualità prima di chiudere la pratica.");
  } else if (!qualityStatus && ["completed", "archived_completed"].includes(normalizeWorkflowStatus(act.status))) {
    addFactor("missing_quality", "medium", "Controllo qualità mancante.", "Completa il controllo qualità prima dell'archiviazione finale.");
  }
  if (act.createdAt && act.completedAt && daysBetween(act.createdAt, act.completedAt) === 0) {
    const elapsedMs = new Date(act.completedAt).getTime() - new Date(act.createdAt).getTime();
    if (Number.isFinite(elapsedMs) && elapsedMs > 0 && elapsedMs < 3 * 60 * 1000) {
      addFactor("fast_completion", "medium", "Pratica completata molto velocemente.", "Assicurati che documento, firme e pagamento siano stati verificati.");
    }
  }
  if (context.operator_deleted_count >= 3) {
    addFactor("operator_anomalies", "medium", "Operatore con molte pratiche eliminate nel periodo.", "Responsabile: controllare andamento operativo dell'operatore.");
  }
  if (context.store_alert_count >= 5) {
    addFactor("store_anomalies", "medium", "Negozio con anomalie ricorrenti aperte.", "Responsabile: verificare gli alert del negozio.");
  }

  let score = factors.reduce((sum, factor) => sum + Number(factor.points || 0), 0);
  if (factors.some((factor) => factor.type === "cash_over_limit")) score = Math.max(score, 85);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = aurumShieldRiskLevel(score);
  const summary = aurumShieldRiskSummary(riskLevel);
  const orderedFactors = factors.sort((first, second) => Number(second.points || 0) - Number(first.points || 0));
  return {
    ok: true,
    score,
    risk_level: riskLevel,
    summary,
    factors: orderedFactors,
    recommendations: [...recommendations].slice(0, 8),
    block_critical_practices: Boolean(settings.block_critical_practices),
    ai_explanation_enabled: Boolean(settings.ai_explanation_enabled)
  };
}

async function syncAurumShieldAlert({ saleDeedRow, shield, user = {} }) {
  const score = Number(shield?.score || 0);
  const shouldAlert = score >= 31;
  if (!saleDeedRow?.id) return null;
  if (!shouldAlert) {
    await pool.query(
      `UPDATE aurum_shield_alerts
       SET status = 'resolved', reviewed_by = COALESCE($2::bigint, reviewed_by), reviewed_at = COALESCE(reviewed_at, NOW())
       WHERE sale_deed_id = $1::bigint
         AND alert_type = 'aurum_shield_risk'
         AND status IN ('open', 'in_review', 'in verifica')`,
      [saleDeedRow.id, user?.id || null]
    );
    return null;
  }
  const title = `Aurum Shield: rischio ${shield.risk_level}`;
  const description = `${shield.summary}. ${(shield.factors || []).slice(0, 4).map((factor) => factor.message).join(" ")}`.trim();
  const existing = await pool.query(
    `SELECT id FROM aurum_shield_alerts
     WHERE sale_deed_id = $1::bigint
       AND alert_type = 'aurum_shield_risk'
       AND status IN ('open', 'in_review', 'in verifica')
     LIMIT 1`,
    [saleDeedRow.id]
  );
  if (existing.rowCount) {
    const result = await pool.query(
      `UPDATE aurum_shield_alerts
       SET severity = $2::text,
           title = $3::text,
           description = $4::text
       WHERE id = $1::bigint
       RETURNING *`,
      [existing.rows[0].id, shield.risk_level, title, description]
    );
    return result.rows[0] || null;
  }
  const result = await pool.query(
    `INSERT INTO aurum_shield_alerts
      (sale_deed_id, client_id, user_id, store_id, alert_type, severity, title, description, status)
     VALUES ($1::bigint,$2::bigint,$3::bigint,$4::bigint,'aurum_shield_risk',$5::text,$6::text,$7::text,'open')
     RETURNING *`,
    [
      saleDeedRow.id,
      saleDeedRow.cliente_id || null,
      saleDeedRow.operatore_id || user?.id || null,
      saleDeedRow.negozio_id || null,
      shield.risk_level,
      title,
      description
    ]
  );
  if (result.rows[0]) {
    void writeAuditLog({
      user,
      action: "aurum_shield_alert_created",
      entityType: "aurum_shield_alert",
      entityId: result.rows[0].id,
      entityLabel: title,
      afterData: result.rows[0],
      metadata: {
        sale_deed_id: saleDeedRow.id,
        client_id: saleDeedRow.cliente_id || null,
        store_id: saleDeedRow.negozio_id || null,
        severity: shield.risk_level
      }
    });
    if (["alto", "critico"].includes(String(shield.risk_level || "").toLowerCase())) {
      const notificationSeverity = String(shield.risk_level).toLowerCase() === "critico" ? "critical" : "danger";
      const notificationInput = {
        title: "Aurum Shield: pratica ad alto rischio",
        message: `La pratica ${saleDeedRow.practice_number || saleDeedRow.id} richiede verifica.`,
        type: "aurum_shield_alert",
        severity: notificationSeverity,
        entityType: "aurum_shield_alert",
        entityId: result.rows[0].id,
        actionUrl: "#antifraud",
        metadata: { sale_deed_id: saleDeedRow.id, practice_number: saleDeedRow.practice_number || "", risk_score: shield.score, risk_level: shield.risk_level },
        createdBy: user?.id || null,
        actor: user
      };
      void createNotification({ ...notificationInput, targetRole: "founder" });
      void createNotification({ ...notificationInput, targetRole: "responsabile", storeId: saleDeedRow.negozio_id || null });
    }
  }
  return result.rows[0] || null;
}

async function persistAurumShieldForAct(saleDeedRow, user = {}) {
  if (!saleDeedRow?.id || saleDeedRow.deleted_at || normalizeWorkflowStatus(saleDeedRow.status) === "deleted") return null;
  const shield = await calculateAurumShieldRisk({ sale_deed_id: saleDeedRow.id, draft_data: rowToAct(saleDeedRow) }, user);
  const result = await pool.query(
    `INSERT INTO aurum_shield_scores
      (sale_deed_id, client_id, score, risk_level, summary, factors, recommendations, updated_at)
     VALUES ($1::bigint,$2::bigint,$3::integer,$4::text,$5::text,$6::jsonb,$7::jsonb,NOW())
     ON CONFLICT (sale_deed_id)
     DO UPDATE SET client_id = EXCLUDED.client_id,
                   score = EXCLUDED.score,
                   risk_level = EXCLUDED.risk_level,
                   summary = EXCLUDED.summary,
                   factors = EXCLUDED.factors,
                   recommendations = EXCLUDED.recommendations,
                   updated_at = NOW()
     RETURNING *`,
    [
      saleDeedRow.id,
      saleDeedRow.cliente_id || null,
      shield.score,
      shield.risk_level,
      shield.summary,
      sanitizeForPostgres(shield.factors || []),
      sanitizeForPostgres(shield.recommendations || [])
    ]
  );
  await pool.query(
    `UPDATE ${actsTable}
     SET aurum_shield_score = $2::integer,
         aurum_shield_risk_level = $3::text,
         aurum_shield_summary = $4::text,
         aurum_shield_factors = $5::jsonb,
         aurum_shield_updated_at = NOW()
     WHERE id = $1::bigint`,
    [saleDeedRow.id, shield.score, shield.risk_level, shield.summary, sanitizeForPostgres(shield.factors || [])]
  );
  await syncAurumShieldAlert({ saleDeedRow, shield, user });
  void writeAuditLog({
    user,
    action: "risk_score_calculated",
    entityType: "atto",
    entityId: saleDeedRow.id,
    entityLabel: saleDeedRow.practice_number || "",
    afterData: { score: shield.score, risk_level: shield.risk_level, summary: shield.summary, factors: shield.factors },
    metadata: { store_id: saleDeedRow.negozio_id || null, store_name: saleDeedRow.store || null }
  });
  return {
    ...shield,
    id: result.rows[0]?.id || null,
    updated_at: result.rows[0]?.updated_at || null
  };
}

function qualityStatusSummary(status = "non_completabile") {
  return {
    completabile: "Pratica pronta per il completamento.",
    attenzione: "Pratica completabile, ma sono presenti elementi da verificare.",
    non_completabile: "Pratica non completabile. Correggi i punti indicati."
  }[status] || "Pratica non completabile. Correggi i punti indicati.";
}

function qualityCheckFromLists(checks = []) {
  const blockingErrors = checks
    .filter((check) => check.status === "error")
    .map((check) => check.message || check.label)
    .filter(Boolean);
  const warnings = checks
    .filter((check) => check.status === "warning")
    .map((check) => check.message || check.label)
    .filter(Boolean);
  const requiredActions = checks
    .filter((check) => check.status === "error")
    .map((check) => check.action || check.message || check.label)
    .filter(Boolean);
  const status = blockingErrors.length ? "non_completabile" : warnings.length ? "attenzione" : "completabile";
  const okCount = checks.filter((check) => check.status === "ok").length;
  const score = checks.length ? Math.round((okCount / checks.length) * 100) : 0;
  return { status, score, blockingErrors, warnings, requiredActions };
}

function qualitySignedCount(act = {}) {
  const signatures = Array.isArray(act.signatures) ? act.signatures : [];
  const signatureImages = Array.isArray(act.signatureImages) ? act.signatureImages : [];
  return Math.max(signatures.filter(Boolean).length, signatureImages.filter(Boolean).length);
}

function qualityHasCapture(act = {}, pattern) {
  return aurumShieldHasCapture(act, pattern);
}

async function validateQualityChecklist(input = {}, user = {}) {
  const saleDeedId = input.atto_id || input.sale_deed_id || input.saleDeedId || input.id || "";
  let saleDeedRow = null;
  if (saleDeedId) {
    saleDeedRow = await findExisting(saleDeedId);
    if (saleDeedRow && !canAccessAct(saleDeedRow, user)) {
      const error = new Error("Non autorizzato");
      error.status = 403;
      throw error;
    }
  }

  const draft = input.draft_data || input.draftData || input.atto || input;
  const act = normalizeAurumShieldAct(draft, saleDeedRow);
  const approvalOverride = Boolean(
    input.allow_approved
    || input.allowApproved
    || ["approved", "approval_approved", "autorizzazione_approvata"].includes(String(act.approvalStatus || act.approval_status || "").toLowerCase())
  );
  const checks = [];
  const addCheck = (id, label, status, message, action, target = "") => {
    checks.push({ id, label, status, message: message || label, action: action || message || label, target });
  };
  const addRequired = (id, label, value, target = "") => {
    const ok = String(value ?? "").trim().length > 0;
    addCheck(id, label, ok ? "ok" : "error", ok ? `${label}: presente.` : `${label}: dato obbligatorio mancante.`, ok ? "" : `Completa ${label.toLowerCase()}.`, target);
  };

  addRequired("cliente_nome", "Nome cliente", act.name, '[name="nome"]');
  addRequired("cliente_cognome", "Cognome cliente", act.surname, '[name="cognome"]');
  addRequired("cliente_data_nascita", "Data nascita", act.birthDate, '[name="nascita"]');
  addRequired("cliente_luogo_nascita", "Luogo nascita", act.birthPlace, '[name="luogo"]');
  addRequired("cliente_provincia_nascita", "Provincia nascita", act.birthProvince, '[name="provinciaNascita"]');
  addRequired("cliente_residenza", "Indirizzo residenza", act.address, '[name="indirizzo"]');
  addRequired("cliente_provincia_residenza", "Provincia residenza", act.residenceProvince, '[name="provinciaResidenza"]');
  if (!act.fiscalCode) {
    addCheck("cliente_codice_fiscale", "Codice fiscale presente", "error", "Codice fiscale obbligatorio.", "Inserisci il codice fiscale del cliente.", '[name="cf"]');
  } else if (!isValidItalianFiscalCode(act.fiscalCode)) {
    addCheck("cliente_codice_fiscale", "Codice fiscale valido", "error", "Codice fiscale non valido.", "Controlla e correggi il codice fiscale.", '[name="cf"]');
  } else {
    addCheck("cliente_codice_fiscale", "Codice fiscale presente", "ok", "Codice fiscale presente e valido.", "", '[name="cf"]');
  }

  addRequired("documento_tipo", "Tipo documento", act.documentType, '[name="tipoDocumento"]');
  addRequired("documento_numero", "Numero documento", act.documentNumber, '[name="numeroDocumento"]');
  if (!act.documentExpiry) {
    addCheck("documento_scadenza", "Scadenza documento", "error", "Scadenza documento obbligatoria.", "Inserisci la data di scadenza del documento.", '[name="scadenzaDocumento"]');
  } else {
    const expiry = new Date(act.documentExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(expiry.getTime()) && expiry < today) {
      addCheck("documento_non_scaduto", "Documento valido", "error", "Documento scaduto.", "Richiedi e registra un documento valido.", '[name="scadenzaDocumento"]');
    } else if (!Number.isNaN(expiry.getTime()) && daysBetween(today, expiry) <= 30) {
      addCheck("documento_non_scaduto", "Documento valido", "warning", "Documento vicino alla scadenza.", "Verifica attentamente la validità del documento.", '[name="scadenzaDocumento"]');
    } else {
      addCheck("documento_non_scaduto", "Documento valido", "ok", "Documento non scaduto.", "", '[name="scadenzaDocumento"]');
    }
  }
  addCheck(
    "documento_foto",
    "Foto documento fronte/retro",
    qualityHasCapture(act, /^documento-fronte/) && qualityHasCapture(act, /^documento-retro/) ? "ok" : "error",
    qualityHasCapture(act, /^documento-fronte/) && qualityHasCapture(act, /^documento-retro/)
      ? "Foto documento complete."
      : "Foto fronte/retro documento mancanti.",
    "Carica fronte e retro del documento.",
    ".capture-grid"
  );
  addCheck(
    "tessera_sanitaria_foto",
    "Foto codice fiscale/tessera sanitaria",
    qualityHasCapture(act, /^codice-fiscale-fronte/) && qualityHasCapture(act, /^codice-fiscale-retro/) ? "ok" : "error",
    qualityHasCapture(act, /^codice-fiscale-fronte/) && qualityHasCapture(act, /^codice-fiscale-retro/)
      ? "Foto tessera sanitaria complete."
      : "Foto fronte/retro codice fiscale o tessera sanitaria mancanti.",
    "Carica fronte e retro della tessera sanitaria.",
    ".capture-grid"
  );

  const items = Array.isArray(act.items) ? act.items : [];
  if (!items.length) {
    addCheck("preziosi_presenti", "Oggetti preziosi inseriti", "error", "Nessun oggetto prezioso inserito.", "Inserisci almeno un oggetto prezioso.", "#cededItemsTable");
  } else {
    addCheck("preziosi_presenti", "Oggetti preziosi inseriti", "ok", "Oggetti preziosi presenti.", "", "#cededItemsTable");
    items.forEach((item, index) => {
      const rowNumber = index + 1;
      addCheck(
        `prezioso_descrizione_${rowNumber}`,
        `Descrizione oggetto riga ${rowNumber}`,
        item.description ? "ok" : "error",
        item.description ? "Descrizione oggetto presente." : `Descrizione oggetto mancante alla riga ${rowNumber}.`,
        `Completa descrizione oggetto alla riga ${rowNumber}.`,
        "#cededItemsTable"
      );
      addCheck(
        `prezioso_metallo_${rowNumber}`,
        `Metallo riga ${rowNumber}`,
        item.metal ? "ok" : "error",
        item.metal ? "Metallo indicato." : `Metallo mancante alla riga ${rowNumber}.`,
        `Seleziona il metallo alla riga ${rowNumber}.`,
        "#cededItemsTable"
      );
      addCheck(
        `prezioso_titolo_${rowNumber}`,
        `Titolo/caratura riga ${rowNumber}`,
        item.title || item.titolo || item.caratura ? "ok" : "error",
        item.title || item.titolo || item.caratura ? "Titolo/caratura indicato." : `Titolo/caratura mancante alla riga ${rowNumber}.`,
        `Seleziona titolo o caratura alla riga ${rowNumber}.`,
        "#cededItemsTable"
      );
    });
  }
  const lots = materialLotsFromAct(act);
  const totalWeight = lots.reduce((sum, lot) => sum + Number(lot.weight || 0), 0) || numberFrom(act.weight);
  addCheck(
    "preziosi_peso",
    "Peso preziosi maggiore di zero",
    totalWeight > 0 ? "ok" : "error",
    totalWeight > 0 ? "Peso preziosi registrato." : "Peso preziosi mancante o pari a zero.",
    "Inserisci il peso dei preziosi.",
    "#totalWeightFields"
  );
  addCheck(
    "preziosi_foto",
    "Foto preziosi",
    qualityHasCapture(act, /^preziosi-/) ? "ok" : "error",
    qualityHasCapture(act, /^preziosi-/) ? "Foto preziosi presenti." : "Foto preziosi mancanti.",
    "Carica le foto dei preziosi.",
    ".capture-grid"
  );

  const amount = numberFrom(act.amount);
  const paymentMethod = String(act.paymentMethod || "").trim();
  addRequired("pagamento_metodo", "Metodo pagamento", paymentMethod, "#paymentMethod");
  addCheck(
    "pagamento_importo",
    "Importo pagamento",
    amount > 0 ? "ok" : "error",
    amount > 0 ? "Importo pagamento presente." : "Importo pagamento mancante o pari a zero.",
    "Inserisci il totale corrisposto.",
    "#saleTotal"
  );
  if (paymentMethod.toLowerCase().includes("bonifico")) {
    if (!act.iban) {
      addCheck("pagamento_iban", "IBAN bonifico", "error", "IBAN obbligatorio per bonifico.", "Inserisci IBAN valido.", "#paymentIban");
    } else if (!isValidIban(act.iban)) {
      addCheck("pagamento_iban", "IBAN bonifico", "error", "IBAN non valido.", "Correggi il formato IBAN.", "#paymentIban");
    } else {
      addCheck("pagamento_iban", "IBAN bonifico", "ok", "IBAN presente e valido.", "", "#paymentIban");
    }
    addCheck(
      "pagamento_contabile_bonifico",
      "Contabile bonifico",
      qualityHasCapture(act, /^pagamento-bonifico/) ? "ok" : "error",
      qualityHasCapture(act, /^pagamento-bonifico/) ? "Contabile bonifico presente." : "Contabile bonifico mancante.",
      "Carica la contabile del bonifico.",
      "#paymentCaptureSection"
    );
  }
  if (paymentMethod.toLowerCase().includes("assegno")) {
    addCheck(
      "pagamento_contabile_assegno",
      "Foto/contabile assegno",
      qualityHasCapture(act, /^pagamento-assegno/) ? "ok" : "error",
      qualityHasCapture(act, /^pagamento-assegno/) ? "Foto/contabile assegno presente." : "Foto o contabile assegno mancante.",
      "Carica foto o contabile dell'assegno.",
      "#paymentCaptureSection"
    );
  }
  if (isCashPaymentMethod(paymentMethod) && amount > 0) {
    const cashCheck = await cashAntiMoneyLaunderingCheck({
      fiscalCode: act.fiscalCode,
      amount,
      date: act.date,
      id: act.id || saleDeedId
    });
    if (cashCheck.ok === false) {
      addCheck("pagamento_contanti_limite", "Limite contanti ultimi 7 giorni", "error", cashCheck.messaggio || "Limite contanti superato.", "Usa un metodo tracciabile o chiedi verifica responsabile.", "#paymentMethod");
    } else if (Number(cashCheck.totale_previsto || 0) >= Number(cashCheck.limite || 500) * 0.8) {
      addCheck("pagamento_contanti_limite", "Limite contanti ultimi 7 giorni", "warning", "Contanti vicino al limite degli ultimi 7 giorni.", "Verifica storico contanti del cliente.", "#paymentMethod");
    } else {
      addCheck("pagamento_contanti_limite", "Limite contanti ultimi 7 giorni", "ok", "Controllo contanti entro limite.", "", "#paymentMethod");
    }
  }

  const signedCount = qualitySignedCount(act);
  addCheck(
    "firme_complete",
    "Firme complete",
    signedCount >= 4 ? "ok" : "error",
    signedCount >= 4 ? "Firme complete." : "Mancano firma vendita, dichiarazioni, privacy o firma operatore.",
    "Completa tutte le firme obbligatorie.",
    ".signature-grid"
  );

  const shield = await calculateAurumShieldRisk({ sale_deed_id: saleDeedId, draft_data: { ...act, status: "completed" } }, user).catch(() => null);
  if (shield) {
    if (shield.risk_level === "critico" && shield.block_critical_practices && !approvalOverride && !["founder", "responsabile"].includes(normalizeRole(user.ruolo))) {
      addCheck("aurum_shield", "Aurum Shield", "error", "Aurum Shield rileva rischio critico.", "Richiedi autorizzazione a Responsabile o Founder.", "#aurumShieldCard");
    } else if (["alto", "critico"].includes(shield.risk_level)) {
      addCheck("aurum_shield", "Aurum Shield", "warning", `${shield.summary}.`, "Verifica i fattori rischio prima di completare.", "#aurumShieldCard");
    } else if (shield.risk_level === "medio") {
      addCheck("aurum_shield", "Aurum Shield", "warning", "Risk score medio: pratica da controllare.", "Controlla i suggerimenti Aurum Shield.", "#aurumShieldCard");
    } else {
      addCheck("aurum_shield", "Aurum Shield", "ok", "Risk score basso.", "", "#aurumShieldCard");
    }
  } else {
    addCheck("aurum_shield", "Aurum Shield", "warning", "Risk score non disponibile al momento.", "Riprova il controllo prima del completamento.", "#aurumShieldCard");
  }

  const reviewStatus = String(act.qualityReview?.status || "").toLowerCase();
  if (reviewStatus === "negative") {
    addCheck(
      "controllo_qualita_operatore",
      "Controllo qualità operatore",
      act.qualityReview?.feedback ? "error" : "error",
      act.qualityReview?.feedback
        ? "Controllo qualità negativo: pratica da risolvere o autorizzare."
        : "Controllo qualità negativo senza feedback.",
      act.qualityReview?.feedback
        ? "Risolvi il controllo qualità negativo prima di completare."
        : "Inserisci feedback e risolvi il controllo qualità negativo.",
      "#qualityReviewPanel"
    );
  } else if (reviewStatus === "positive") {
    addCheck("controllo_qualita_operatore", "Controllo qualità operatore", "ok", "Controllo qualità positivo.", "", "#qualityReviewPanel");
  } else {
    addCheck("controllo_qualita_operatore", "Controllo qualità operatore", "warning", "Controllo qualità interno non ancora registrato.", "Se previsto dal ruolo, registra controllo positivo prima dell'archiviazione finale.", "#qualityReviewPanel");
  }

  const result = qualityCheckFromLists(checks);
  return {
    ok: true,
    quality_status: result.status,
    status: result.status,
    summary: qualityStatusSummary(result.status),
    score: result.score,
    checks,
    blocking_errors: result.blockingErrors,
    warnings: result.warnings,
    required_actions: result.requiredActions,
    aurum_shield: shield
  };
}

async function assertQualityAllowsFinalSave(input = {}, user = {}, options = {}) {
  const quality = await validateQualityChecklist({ ...input, allow_approved: Boolean(options.allowApproved) }, user);
  if (quality.quality_status === "non_completabile") {
    const error = new Error(`Pratica non completabile: ${(quality.blocking_errors || []).slice(0, 3).join("; ") || "controlli obbligatori mancanti"}`);
    error.status = 400;
    error.quality = quality;
    throw error;
  }
  return quality;
}

async function saveQualityCheckResult(input = {}, user = {}) {
  const saleDeedId = input.atto_id || input.sale_deed_id || input.saleDeedId || input.id || "";
  const row = saleDeedId ? await findExisting(saleDeedId) : null;
  if (!row) {
    const error = new Error("Atto non trovato");
    error.status = 404;
    throw error;
  }
  if (!canAccessAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const quality = await validateQualityChecklist({ sale_deed_id: row.id, draft_data: input.draft_data || input.draftData || rowToAct(row) }, user);
  const result = await pool.query(
    `INSERT INTO quality_checks
      (sale_deed_id, checked_by, status, score, checks, blocking_errors, warnings, required_actions, feedback, updated_at)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::integer,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::text,NOW())
     RETURNING *`,
    [
      row.id,
      user?.id || null,
      quality.quality_status,
      quality.score,
      sanitizeForPostgres(quality.checks || []),
      sanitizeForPostgres(quality.blocking_errors || []),
      sanitizeForPostgres(quality.warnings || []),
      sanitizeForPostgres(quality.required_actions || []),
      input.feedback || ""
    ]
  );
  await pool.query(
    `UPDATE ${actsTable}
     SET quality_check_status = $2::text,
         quality_check_score = $3::integer,
         quality_check_summary = $4::text,
         quality_check_updated_at = NOW()
     WHERE id = $1::bigint`,
    [row.id, quality.quality_status, quality.score, quality.summary]
  );
  return { ...quality, quality_check: result.rows[0] || null };
}

async function persistQualityCheckForAct(saleDeedRow, user = {}) {
  if (!saleDeedRow?.id || saleDeedRow.deleted_at || normalizeWorkflowStatus(saleDeedRow.status) === "deleted") return null;
  return saveQualityCheckResult({ sale_deed_id: saleDeedRow.id, draft_data: rowToAct(saleDeedRow) }, user);
}

function suspensionReasonText(reason = {}) {
  if (typeof reason === "string") return reason.trim();
  return String(reason.message || reason.action || reason.label || reason.title || reason.description || "").trim();
}

function normalizeSuspensionReasons(...sources) {
  const reasons = [];
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === "object") {
      if (Array.isArray(value.blocking_errors)) add(value.blocking_errors);
      if (Array.isArray(value.required_actions)) add(value.required_actions);
      if (Array.isArray(value.warnings)) add(value.warnings);
      if (Array.isArray(value.factors)) add(value.factors);
    }
    const text = suspensionReasonText(value);
    if (text && !reasons.includes(text)) reasons.push(text);
  };
  sources.forEach(add);
  return reasons.slice(0, 20);
}

function suspendedPracticeSummary(reasons = []) {
  return reasons[0] || "Pratica sospesa: controlli operativi da completare.";
}

function suspensionDataFromInput(input = {}, quality = null, shield = null) {
  const reasons = normalizeSuspensionReasons(
    input.suspendedReasons,
    input.suspended_reasons,
    input.reasons,
    input.reason,
    input.motivi,
    input.quality_check || input.qualityCheck || quality,
    input.aurum_shield || input.aurumShield || shield
  );
  return {
    reason: String(input.suspendedReason || input.suspended_reason || suspendedPracticeSummary(reasons)).trim(),
    reasons
  };
}

function suspensionDataFromAct(act = {}) {
  return suspensionDataFromInput(act, act.qualityCheck, act.aurumShield);
}

async function writeSuspendedPracticeLog({ saleDeedId, user = {}, action, reason = "", reasons = [], metadata = {} } = {}) {
  try {
    if (!saleDeedId || !action) return null;
    const result = await pool.query(
      `INSERT INTO suspended_practice_logs
        (sale_deed_id, user_id, action, reason, reasons, metadata)
       VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::jsonb,$6::jsonb)
       RETURNING *`,
      [
        saleDeedId,
        user?.id || null,
        action,
        reason || suspendedPracticeSummary(reasons),
        sanitizeForPostgres(reasons || []),
        sanitizeForPostgres(metadata || {})
      ]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("SUSPENDED PRACTICE LOG ERROR", error.message || error);
    return null;
  }
}

function suspendedStatusWhere(alias = "a") {
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}deleted_at IS NULL AND (
    COALESCE(${prefix}status, '') ILIKE 'suspended'
    OR COALESCE(${prefix}status, '') ILIKE 'sospesa'
    OR COALESCE(${prefix}status, '') ILIKE 'sospeso'
    OR COALESCE(${prefix}status, '') ILIKE 'archived_incomplete'
    OR COALESCE(${prefix}status, '') ILIKE 'archiviato incompleto'
    OR COALESCE(${prefix}status, '') ILIKE 'archiviata incompleta'
    OR ((COALESCE(${prefix}status, '') ILIKE 'archived'
        OR COALESCE(${prefix}status, '') ILIKE 'Archiviato'
        OR COALESCE(${prefix}status, '') ILIKE 'Archiviata')
      AND ${prefix}completed_at IS NULL)
    OR COALESCE(${prefix}status, '') ILIKE 'pending_approval'
    OR COALESCE(${prefix}status, '') ILIKE 'in_attesa_autorizzazione'
    OR (${prefix}suspended_at IS NOT NULL AND ${prefix}resumed_at IS NULL)
  )`;
}

async function addSuspendedPracticeVisibilityWhere(user = {}, where = [], values = []) {
  const role = normalizeRole(user.ruolo);
  if (role === "founder") return;
  if (role === "supervisore") {
    where.push("LOWER(COALESCE(u.ruolo, '')) <> 'founder'");
    return;
  }
  if (role === "responsabile" || role === "commesso") {
    const store = await storeForUser(user);
    if (!store) {
      where.push("1 = 0");
      return;
    }
    values.push(store.id, store.nome);
    const storeIdParam = `$${values.length - 1}::bigint`;
    const storeNameParam = `$${values.length}::text`;
    if (role === "responsabile") {
      where.push(`(a.negozio_id = ${storeIdParam} OR a.store = ${storeNameParam})`);
      return;
    }
    values.push(user.id || null);
    where.push(`((a.negozio_id = ${storeIdParam} OR a.store = ${storeNameParam}) OR a.operatore_id = $${values.length}::bigint)`);
    return;
  }
  values.push(user.id || null);
  where.push(`a.operatore_id = $${values.length}::bigint`);
}

function suspendedPracticeSelectSql() {
  return `a.*,
          u.username AS operator_username,
          u.nome AS operator_nome,
          u.cognome AS operator_cognome,
          u.ruolo AS operator_role,
          shield.score AS shield_score,
          shield.risk_level AS shield_risk_level,
          shield.summary AS shield_summary,
          shield.factors AS shield_factors,
          shield.updated_at AS shield_updated_at,
          approval.id AS latest_approval_id,
          approval.status AS latest_approval_status,
          approval.risk_score AS latest_approval_risk_score,
          approval.risk_level AS latest_approval_risk_level,
          approval.reasons AS latest_approval_reasons,
          qc.status AS latest_quality_status,
          qc.score AS latest_quality_score,
          qc.blocking_errors AS latest_quality_blocking_errors,
          qc.warnings AS latest_quality_warnings,
          qc.required_actions AS latest_quality_required_actions`;
}

function suspendedPracticeFromRow(row = {}) {
  const act = rowToAct(row, { full: false });
  const reasons = normalizeSuspensionReasons(
    row.suspended_reasons,
    row.latest_quality_blocking_errors,
    row.latest_quality_required_actions,
    row.latest_approval_reasons,
    row.shield_factors
  );
  const approvalStatus = row.latest_approval_status || act.approvalStatus || "";
  return {
    ...act,
    numero_atto: act.practiceNumber,
    cliente: [act.name, act.surname].filter(Boolean).join(" ") || "Cliente non indicato",
    negozio: act.store || "",
    operatore: act.operatorName || act.operatorUsername || "",
    stato: normalizeWorkflowStatus(row.status || act.status || "suspended"),
    motivi: reasons.length ? reasons : normalizeSuspensionReasons(row.suspended_reason || act.suspendedReason),
    risk_score: Number(row.shield_score ?? row.latest_approval_risk_score ?? act.aurumShield?.score ?? 0),
    risk_level: row.shield_risk_level || row.latest_approval_risk_level || act.aurumShield?.risk_level || "",
    approval_status: approvalStatus,
    approvalStatusLabel: approvalStatusLabel(approvalStatus),
    quality_status: row.latest_quality_status || act.qualityCheck?.status || "",
    quality_score: Number(row.latest_quality_score ?? act.qualityCheck?.score ?? 0),
    created_at: row.created_at || act.createdAt || null,
    suspended_at: row.suspended_at || act.suspendedAt || row.updated_at || null
  };
}

async function listSuspendedPractices(query = {}, user = {}) {
  const values = [];
  const where = ["a.deleted_at IS NULL", suspendedStatusWhere("a")];
  await addSuspendedPracticeVisibilityWhere(user, where, values);

  const store = String(query.store || query.negozio || "").trim();
  if (store && store !== "Tutti") {
    values.push(store);
    where.push(`a.store = $${values.length}::text`);
  }
  const operatorId = query.operator_id || query.operatore_id || "";
  if (operatorId) {
    values.push(operatorId);
    where.push(`a.operatore_id::text = $${values.length}::text`);
  }
  const reason = String(query.reason || query.motivo || "").trim().toLowerCase();
  if (reason) {
    values.push(`%${reason}%`);
    where.push(`LOWER(COALESCE(a.suspended_reason, '') || ' ' || COALESCE(a.suspended_reasons::text, '') || ' ' || COALESCE(qc.blocking_errors::text, '')) LIKE $${values.length}::text`);
  }
  const minRiskScore = Number(query.risk_score_min || query.risk_score || 0);
  if (Number.isFinite(minRiskScore) && minRiskScore > 0) {
    values.push(minRiskScore);
    where.push(`COALESCE(shield.score, approval.risk_score, 0) >= $${values.length}::integer`);
  }
  const approvalStatus = String(query.approval_status || "").trim();
  if (approvalStatus) {
    values.push(approvalStatus);
    where.push(`COALESCE(approval.status, '') = $${values.length}::text`);
  }
  if (query.date_from) {
    values.push(query.date_from);
    where.push(`COALESCE(a.suspended_at, a.updated_at, a.created_at) >= $${values.length}::timestamptz`);
  }
  if (query.date_to) {
    values.push(query.date_to);
    where.push(`COALESCE(a.suspended_at, a.updated_at, a.created_at) <= ($${values.length}::date + INTERVAL '1 day')`);
  }
  const search = String(query.q || query.search || "").trim().toLowerCase();
  if (search) {
    values.push(`%${search}%`);
    const parameter = `$${values.length}::text`;
    where.push(`(
      LOWER(COALESCE(a.practice_number, '')) LIKE ${parameter}
      OR LOWER(COALESCE(a.cliente_nome, '') || ' ' || COALESCE(a.cliente_cognome, '')) LIKE ${parameter}
      OR LOWER(COALESCE(a.store, '')) LIKE ${parameter}
      OR LOWER(COALESCE(u.username, '') || ' ' || COALESCE(u.nome, '') || ' ' || COALESCE(u.cognome, '')) LIKE ${parameter}
    )`);
  }

  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit || "50", 10) || 50));
  const offset = (page - 1) * limit;
  const fromSql = `FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     LEFT JOIN LATERAL (
       SELECT score, risk_level, summary, factors, updated_at
       FROM aurum_shield_scores
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) shield ON TRUE
     LEFT JOIN LATERAL (
       SELECT id, status, risk_score, risk_level, reasons
       FROM approval_requests
       WHERE sale_deed_id = a.id
       ORDER BY created_at DESC
       LIMIT 1
     ) approval ON TRUE
     LEFT JOIN LATERAL (
       SELECT status, score, blocking_errors, warnings, required_actions
       FROM quality_checks
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1
     ) qc ON TRUE`;
  const whereSql = where.join(" AND ");
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total ${fromSql} WHERE ${whereSql}`, values);
  const listValues = [...values, limit, offset];
  const result = await pool.query(
    `SELECT ${suspendedPracticeSelectSql()}
     ${fromSql}
     WHERE ${whereSql}
     ORDER BY COALESCE(a.suspended_at, a.updated_at, a.created_at) DESC
     LIMIT $${listValues.length - 1}::integer OFFSET $${listValues.length}::integer`,
    listValues
  );
  return {
    ok: true,
    practices: result.rows.map(suspendedPracticeFromRow),
    pagination: { page, limit, total: Number(totalResult.rows[0]?.total || 0) }
  };
}

async function getSuspendedPractice(id, user = {}) {
  const values = [String(id || "")];
  const where = ["a.deleted_at IS NULL", "(a.id::text = $1::text OR a.practice_number = $1::text)"];
  await addSuspendedPracticeVisibilityWhere(user, where, values);
  const result = await pool.query(
    `SELECT ${suspendedPracticeSelectSql()}
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     LEFT JOIN LATERAL (
       SELECT score, risk_level, summary, factors, updated_at
       FROM aurum_shield_scores
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) shield ON TRUE
     LEFT JOIN LATERAL (
       SELECT id, status, risk_score, risk_level, reasons
       FROM approval_requests
       WHERE sale_deed_id = a.id
       ORDER BY created_at DESC
       LIMIT 1
     ) approval ON TRUE
     LEFT JOIN LATERAL (
       SELECT status, score, blocking_errors, warnings, required_actions
       FROM quality_checks
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1
     ) qc ON TRUE
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    values
  );
  const row = result.rows[0];
  if (!row) return null;
  const logs = await pool.query(
    `SELECT spl.*, u.username, u.nome, u.cognome
     FROM suspended_practice_logs spl
     LEFT JOIN utenti u ON u.id = spl.user_id
     WHERE spl.sale_deed_id = $1::bigint
     ORDER BY spl.created_at DESC
     LIMIT 100`,
    [row.id]
  );
  return {
    practice: suspendedPracticeFromRow(row),
    act: rowToAct(row),
    logs: logs.rows.map((log) => ({
      ...log,
      userName: [log.nome, log.cognome].filter(Boolean).join(" ") || log.username || ""
    }))
  };
}

async function notifySuspendedPractice(row = {}, user = {}, action = "created", reasons = [], req = null) {
  const practiceNumber = row.practice_number || row.practiceNumber || row.id;
  const map = {
    created: {
      title: "Pratica sospesa",
      message: `La pratica ${practiceNumber} è stata spostata tra le pratiche sospese.`,
      type: "suspended_practice_created",
      severity: "warning"
    },
    resolved: {
      title: "Pratica sospesa risolta",
      message: `La pratica ${practiceNumber} può tornare al flusso operativo.`,
      type: "suspended_practice_resolved",
      severity: "success"
    },
    deleted: {
      title: "Pratica sospesa eliminata",
      message: `La pratica sospesa ${practiceNumber} è stata eliminata dai flussi operativi.`,
      type: "suspended_practice_deleted",
      severity: "danger"
    }
  };
  const notification = map[action] || map.created;
  const input = {
    ...notification,
    entityType: "atto",
    entityId: row.id,
    actionUrl: "#suspendedPractices",
    metadata: { practice_number: practiceNumber, reasons: reasons.slice(0, 6), store_id: row.negozio_id || null },
    createdBy: user?.id || null,
    actor: user,
    req
  };
  void createNotification({ ...input, targetRole: "founder" });
  if (row.negozio_id) void createNotification({ ...input, targetRole: "responsabile", storeId: row.negozio_id });
}

async function suspendPractice(id, input = {}, user = {}, req = null) {
  const row = await findExisting(id);
  if (!row) return null;
  if (!canAccessAct(row, user) || !canEditAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const quality = input.quality_check || input.qualityCheck || await validateQualityChecklist({
    sale_deed_id: row.id,
    draft_data: input.draft_data || input.draftData || rowToAct(row)
  }, user).catch(() => null);
  const shield = input.aurum_shield || input.aurumShield || quality?.aurum_shield || await calculateAurumShieldRisk({
    sale_deed_id: row.id,
    draft_data: input.draft_data || input.draftData || rowToAct(row)
  }, user).catch(() => null);
  const suspension = suspensionDataFromInput(input, quality, shield);
  const beforeAct = rowToAct(row, { full: false });
  const result = await pool.query(
    `UPDATE ${actsTable}
     SET status = 'suspended',
         suspended_reason = $2::text,
         suspended_reasons = $3::jsonb,
         suspended_at = COALESCE(suspended_at, NOW()),
         suspended_by = COALESCE(suspended_by, $4::bigint),
         resumed_at = NULL,
         resumed_by = NULL,
         payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      row.id,
      suspension.reason,
      sanitizeForPostgres(suspension.reasons),
      user?.id || null,
      sanitizeForPostgres({
        suspendedReason: suspension.reason,
        suspendedReasons: suspension.reasons,
        suspendedAt: new Date().toISOString(),
        suspendedBy: user?.id || null,
        qualityCheck: quality || undefined,
        aurumShield: shield || undefined
      })
    ]
  );
  const updated = result.rows[0];
  const finalAct = rowToAct(updated, { full: false });
  await writeSuspendedPracticeLog({
    saleDeedId: updated.id,
    user,
    action: normalizeWorkflowStatus(row.status) === "suspended" ? "updated" : "suspended",
    reason: suspension.reason,
    reasons: suspension.reasons,
    metadata: { quality_status: quality?.quality_status || quality?.status || "", risk_score: shield?.score || 0, risk_level: shield?.risk_level || "" }
  });
  void writeAuditLog({
    req,
    user,
    action: "sale_deed_suspended",
    entityType: "atto",
    entityId: updated.id,
    entityLabel: updated.practice_number || "",
    beforeData: beforeAct,
    afterData: finalAct,
    metadata: { reasons: suspension.reasons, critical: true, store_id: updated.negozio_id || null }
  });
  notifySuspendedPractice(updated, user, "created", suspension.reasons, req);
  return suspendedPracticeFromRow({
    ...updated,
    shield_score: shield?.score ?? updated.aurum_shield_score,
    shield_risk_level: shield?.risk_level ?? updated.aurum_shield_risk_level,
    shield_summary: shield?.summary ?? updated.aurum_shield_summary,
    shield_factors: shield?.factors ?? updated.aurum_shield_factors,
    latest_quality_status: quality?.quality_status || quality?.status || updated.quality_check_status,
    latest_quality_score: quality?.score || updated.quality_check_score
  });
}

async function resumeSuspendedPractice(id, input = {}, user = {}, req = null) {
  const row = await findExisting(id);
  if (!row) return null;
  if (!canAccessAct(row, user) || !canEditAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const beforeAct = rowToAct(row, { full: false });
  const nextStatus = normalizeWorkflowStatus(input.status || "draft");
  const safeStatus = ["completed", "archived_completed", "deleted"].includes(nextStatus) ? "draft" : nextStatus;
  const result = await pool.query(
    `UPDATE ${actsTable}
     SET status = $2::text,
         resumed_at = COALESCE(resumed_at, NOW()),
         resumed_by = COALESCE(resumed_by, $3::bigint),
         payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [
      row.id,
      safeStatus,
      user?.id || null,
      sanitizeForPostgres({ resumedAt: new Date().toISOString(), resumedBy: user?.id || null, status: safeStatus })
    ]
  );
  const updated = result.rows[0];
  const finalAct = rowToAct(updated, { full: false });
  await writeSuspendedPracticeLog({
    saleDeedId: updated.id,
    user,
    action: "resumed",
    reason: input.reason || "Pratica riaperta dopo controllo.",
    reasons: normalizeSuspensionReasons(input.reasons || input.reason),
    metadata: { status: safeStatus }
  });
  void writeAuditLog({
    req,
    user,
    action: "suspended_practice_resolved",
    entityType: "atto",
    entityId: updated.id,
    entityLabel: updated.practice_number || "",
    beforeData: beforeAct,
    afterData: finalAct,
    metadata: { status: safeStatus, store_id: updated.negozio_id || null }
  });
  notifySuspendedPractice(updated, user, "resolved", [], req);
  return suspendedPracticeFromRow(updated);
}

async function resolveSuspendedPractice(id, input = {}, user = {}, req = null) {
  const row = await findExisting(id);
  if (!row) return null;
  if (!canAccessAct(row, user) || !canEditAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const draftData = input.draft_data || input.draftData || rowToAct(row);
  const quality = await validateQualityChecklist({ sale_deed_id: row.id, draft_data: draftData }, user);
  const shield = quality.aurum_shield || await calculateAurumShieldRisk({ sale_deed_id: row.id, draft_data: draftData }, user).catch(() => null);
  const riskScore = Number(shield?.score || 0);
  const riskLevel = String(shield?.risk_level || "").toLowerCase();
  const stillBlocked = (quality.quality_status || quality.status) === "non_completabile"
    || riskScore >= 61
    || ["alto", "critico"].includes(riskLevel);
  if (stillBlocked) {
    const practice = await suspendPractice(row.id, { ...input, quality_check: quality, aurum_shield: shield }, user, req);
    return {
      ok: true,
      resolved: false,
      message: "La pratica resta sospesa. Mancano ancora controlli da risolvere.",
      practice,
      quality_check: quality,
      aurum_shield: shield
    };
  }
  const approvedRequest = await findApprovedApprovalForAct(row.id);
  const practice = await resumeSuspendedPractice(row.id, { status: approvedRequest ? "approval_approved" : "draft", reason: "Controlli risolti." }, user, req);
  await writeSuspendedPracticeLog({
    saleDeedId: row.id,
    user,
    action: "completed_after_resolution",
    reason: "Controlli risolti: pratica completabile.",
    reasons: [],
    metadata: { quality_status: quality.quality_status || quality.status, risk_score: riskScore, risk_level: riskLevel }
  });
  return {
    ok: true,
    resolved: true,
    message: "La pratica ora può essere completata.",
    practice,
    quality_check: quality,
    aurum_shield: shield
  };
}

async function deleteSuspendedPractice(id, user = {}, req = null) {
  const row = await findExisting(id);
  if (!row) return false;
  const role = normalizeRole(user.ruolo);
  const sameStore = row.store === user.negozio;
  if (!(role === "founder" || (role === "responsabile" && sameStore))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const deleted = await deleteAct(row.id, user, req);
  if (deleted) {
    const reasons = normalizeSuspensionReasons(row.suspended_reasons, row.suspended_reason);
    await writeSuspendedPracticeLog({
      saleDeedId: row.id,
      user,
      action: "deleted",
      reason: "Pratica sospesa eliminata.",
      reasons,
      metadata: { practice_number: row.practice_number || "" }
    });
    void writeAuditLog({
      req,
      user,
      action: "suspended_practice_deleted",
      entityType: "atto",
      entityId: row.id,
      entityLabel: row.practice_number || "",
      beforeData: rowToAct(row, { full: false }),
      afterData: { status: "deleted" },
      metadata: { reasons, critical: true, store_id: row.negozio_id || null }
    });
    notifySuspendedPractice(row, user, "deleted", reasons, req);
  }
  return deleted;
}

function approvalStatusLabel(status = "pending") {
  return {
    pending: "In attesa",
    approved: "Approvata",
    rejected: "Rifiutata",
    cancelled: "Annullata"
  }[String(status || "pending").toLowerCase()] || "In attesa";
}

function approvalRequestRowToPublic(row = {}) {
  return {
    id: row.id,
    sale_deed_id: row.sale_deed_id,
    saleDeedId: row.sale_deed_id,
    practiceNumber: row.practice_number || "",
    clientName: [row.cliente_nome, row.cliente_cognome].filter(Boolean).join(" ") || "",
    store: row.store || row.store_name || "",
    store_id: row.store_id || row.negozio_id || null,
    requested_by: row.requested_by,
    requestedByName: [row.requester_nome, row.requester_cognome].filter(Boolean).join(" ") || row.requester_username || "",
    requested_by_role: row.requested_by_role || "",
    requested_to_role: row.requested_to_role || "",
    status: row.status || "pending",
    statusLabel: approvalStatusLabel(row.status),
    risk_score: Number(row.risk_score || 0),
    risk_level: row.risk_level || "",
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    quality_check: row.quality_check || {},
    aurum_shield: row.aurum_shield || {},
    requester_note: row.requester_note || "",
    reviewer_note: row.reviewer_note || "",
    reviewed_by: row.reviewed_by || null,
    reviewedByName: [row.reviewer_nome, row.reviewer_cognome].filter(Boolean).join(" ") || row.reviewer_username || "",
    reviewed_at: row.reviewed_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function approvalRequestSelectSql() {
  return `ar.*, a.practice_number, a.cliente_nome, a.cliente_cognome, a.store, a.negozio_id,
          requester.username AS requester_username, requester.nome AS requester_nome, requester.cognome AS requester_cognome,
          reviewer.username AS reviewer_username, reviewer.nome AS reviewer_nome, reviewer.cognome AS reviewer_cognome`;
}

function approvalRequestJoinSql() {
  return `FROM approval_requests ar
          LEFT JOIN ${actsTable} a ON a.id = ar.sale_deed_id
          LEFT JOIN utenti requester ON requester.id = ar.requested_by
          LEFT JOIN utenti reviewer ON reviewer.id = ar.reviewed_by`;
}

async function addApprovalVisibilityWhere(user = {}, where = [], values = [], alias = "ar") {
  const role = normalizeRole(user.ruolo);
  if (role === "founder") return;
  if (role === "supervisore") {
    where.push("LOWER(COALESCE(requester.ruolo, '')) <> 'founder'");
    return;
  }
  if (role === "responsabile") {
    const store = await storeForUser(user);
    if (!store) {
      where.push("1 = 0");
      return;
    }
    values.push(store.id, store.nome);
    where.push(`(${alias}.store_id = $${values.length - 1}::bigint OR a.negozio_id = $${values.length - 1}::bigint OR a.store = $${values.length}::text)`);
    where.push("LOWER(COALESCE(requester.ruolo, '')) IN ('commesso', 'aiuto_commesso')");
    return;
  }
  values.push(user.id || null);
  where.push(`${alias}.requested_by = $${values.length}::bigint`);
}

async function canApproveApprovalRequest(row = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const requesterRole = normalizeRole(row.requested_by_role || row.requester_role || "");
  if (role === "founder") return true;
  if (role === "supervisore") return requesterRole !== "founder";
  if (role !== "responsabile") return false;
  if (!["commesso", "aiuto_commesso"].includes(requesterRole)) return false;
  const store = await storeForUser(user);
  if (!store) return false;
  return String(row.store_id || row.negozio_id || "") === String(store.id)
    || String(row.store || "") === String(store.nome);
}

function notificationRoles(targetRole = "") {
  if (Array.isArray(targetRole)) return targetRole.map(normalizeRole).filter(Boolean);
  return String(targetRole || "")
    .split(/[,\s|/]+/)
    .map(normalizeRole)
    .filter(Boolean);
}

function cleanNotificationText(value = "", fallback = "") {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 600);
}

function normalizeNotificationType(type = "system") {
  const normalized = String(type || "system").trim().toLowerCase();
  return [
    "approval_request",
    "approval_approved",
    "approval_rejected",
    "aurum_shield_alert",
    "quality_check_failed",
    "document_expired",
    "backup_created",
    "backup_failed",
    "deed_deleted",
    "deed_completed",
    "user_updated",
    "audit_critical",
    "academy_course_assigned",
    "academy_course_completed",
    "training_completed",
    "training_passed",
    "training_failed",
    "aurum_support_request",
    "suspended_practice_created",
    "suspended_practice_resolved",
    "suspended_practice_deleted",
    "suspended_practice_pending_too_long",
    "system"
  ].includes(normalized) ? normalized : "system";
}

function normalizeNotificationSeverity(severity = "info") {
  const normalized = String(severity || "info").trim().toLowerCase();
  return ["info", "success", "warning", "danger", "critical"].includes(normalized) ? normalized : "info";
}

async function notificationRecipientIds({ userId = null, targetRole = null, storeId = null } = {}) {
  if (userId) return [Number(userId)].filter(Number.isFinite);
  const roles = notificationRoles(targetRole);
  const finalRoles = roles.length ? roles : ["founder"];
  const values = [finalRoles];
  const where = ["COALESCE(attivo, TRUE) = TRUE", `LOWER(COALESCE(ruolo, '')) = ANY($1::text[])`];
  if (storeId && !finalRoles.includes("founder")) {
    values.push(storeId);
    where.push(`(negozio_id = $${values.length}::bigint OR negozio = (SELECT nome FROM negozi WHERE id = $${values.length}::bigint LIMIT 1))`);
  }
  const result = await pool.query(
    `SELECT id FROM utenti WHERE ${where.join(" AND ")} ORDER BY id ASC LIMIT 200`,
    values
  );
  return [...new Set(result.rows.map((row) => Number(row.id)).filter(Number.isFinite))];
}

function publicNotification(row = {}) {
  return {
    id: row.id,
    user_id: row.user_id || null,
    target_role: row.target_role || "",
    store_id: row.store_id || null,
    title: row.title || "Notifica OroActive",
    message: row.message || "",
    type: row.type || "system",
    severity: row.severity || "info",
    entity_type: row.entity_type || "",
    entity_id: row.entity_id || "",
    action_url: row.action_url || "",
    metadata: row.metadata || {},
    read_at: row.read_at || null,
    read: Boolean(row.read_at),
    created_by: row.created_by || null,
    created_at: row.created_at || null,
    expires_at: row.expires_at || null
  };
}

async function createNotification(input = {}) {
  try {
    const type = normalizeNotificationType(input.type);
    const severity = normalizeNotificationSeverity(input.severity);
    const title = cleanNotificationText(input.title, "Notifica OroActive");
    const message = cleanNotificationText(input.message, "Hai una nuova notifica OroActive.");
    const storeId = input.storeId || input.store_id || null;
    const targetRole = input.targetRole || input.target_role || null;
    const recipients = await notificationRecipientIds({
      userId: input.userId || input.user_id || null,
      targetRole,
      storeId
    });
    if (!recipients.length) return [];
    const created = [];
    for (const recipientId of recipients) {
      const result = await pool.query(
        `INSERT INTO notifications (
          user_id, target_role, store_id, title, message, type, severity,
          entity_type, entity_id, action_url, metadata, created_by, expires_at
        ) VALUES (
          $1::bigint,$2::text,$3::bigint,$4::text,$5::text,$6::text,$7::text,
          $8::text,$9::text,$10::text,$11::jsonb,$12::bigint,$13::timestamptz
        )
        RETURNING *`,
        [
          recipientId,
          targetRole ? normalizeRole(targetRole) : null,
          storeId || null,
          title,
          message,
          type,
          severity,
          input.entityType || input.entity_type || null,
          input.entityId ?? input.entity_id ?? null,
          input.actionUrl || input.action_url || null,
          sanitizeForPostgres(compactAuditPayload(input.metadata || input.payload || {})),
          input.createdBy || input.created_by || input.actor?.id || null,
          input.expiresAt || input.expires_at || null
        ]
      );
      created.push(publicNotification(result.rows[0]));
    }
    if (input.audit !== false && (["warning", "danger", "critical"].includes(severity) || input.metadata?.critical)) {
      void writeAuditLog({
        req: input.req || null,
        user: input.actor || null,
        action: "notification_created",
        entityType: "notification",
        entityId: created[0]?.id || null,
        entityLabel: title,
        afterData: { title, message, type, severity, recipients: created.length },
        metadata: { type, severity, recipient_count: created.length, entity_type: input.entityType || input.entity_type || "" }
      });
    }
    return created;
  } catch (error) {
    console.error("NOTIFICATION ERROR", error.message || error);
    return [];
  }
}

async function createInternalNotification(input = {}) {
  return createNotification(input);
}

function addNotificationVisibilityWhere(user = {}, where = [], values = [], alias = "n") {
  const role = normalizeRole(user?.ruolo);
  const clauses = [];
  values.push(user?.id || null);
  clauses.push(`${alias}.user_id = $${values.length}::bigint`);
  values.push(role);
  clauses.push(`(${alias}.user_id IS NULL AND LOWER(COALESCE(${alias}.target_role, '')) = $${values.length}::text)`);
  if (role === "founder") {
    clauses.push(`LOWER(COALESCE(${alias}.target_role, '')) = 'founder'`);
    clauses.push(`${alias}.severity = 'critical'`);
  }
  if (role === "responsabile" && user?.negozio_id) {
    values.push(user.negozio_id);
    clauses.push(`(${alias}.user_id IS NULL AND LOWER(COALESCE(${alias}.target_role, '')) = 'responsabile' AND ${alias}.store_id = $${values.length}::bigint)`);
  }
  where.push(`(${clauses.join(" OR ")})`);
  where.push(`(${alias}.expires_at IS NULL OR ${alias}.expires_at > NOW())`);
}

async function notificationUnreadCount(user = {}) {
  const values = [];
  const where = ["n.read_at IS NULL"];
  addNotificationVisibilityWhere(user, where, values, "n");
  const result = await pool.query(`SELECT COUNT(*)::int AS total FROM notifications n WHERE ${where.join(" AND ")}`, values);
  return Number(result.rows[0]?.total || 0);
}

async function listNotifications(query = {}, user = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const offset = (page - 1) * limit;
  const values = [];
  const where = [];
  addNotificationVisibilityWhere(user, where, values, "n");
  if (String(query.unread || "").toLowerCase() === "true") where.push("n.read_at IS NULL");
  if (query.type) {
    values.push(normalizeNotificationType(query.type));
    where.push(`n.type = $${values.length}::text`);
  }
  if (query.severity) {
    values.push(normalizeNotificationSeverity(query.severity));
    where.push(`n.severity = $${values.length}::text`);
  }
  if (query.search) {
    values.push(`%${String(query.search).trim()}%`);
    where.push(`(n.title ILIKE $${values.length} OR n.message ILIKE $${values.length} OR n.type ILIKE $${values.length})`);
  }
  const whereSql = where.join(" AND ");
  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM notifications n WHERE ${whereSql}`, values);
  const result = await pool.query(
    `SELECT n.*
     FROM notifications n
     WHERE ${whereSql}
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT $${values.push(limit)}::integer OFFSET $${values.push(offset)}::integer`,
    values
  );
  return {
    ok: true,
    notifications: result.rows.map(publicNotification),
    unread_count: await notificationUnreadCount(user),
    pagination: { page, limit, total: Number(total.rows[0]?.total || 0) }
  };
}

async function markNotificationRead(id, user = {}, req = null, opened = false) {
  const values = [id];
  const where = ["n.id = $1::bigint"];
  addNotificationVisibilityWhere(user, where, values, "n");
  const result = await pool.query(
    `UPDATE notifications n
     SET read_at = COALESCE(read_at, NOW())
     WHERE ${where.join(" AND ")}
     RETURNING n.*`,
    values
  );
  const notification = result.rows[0] ? publicNotification(result.rows[0]) : null;
  if (notification) {
    void writeAuditLog({
      req,
      user,
      action: opened ? "notification_action_opened" : "notification_read",
      entityType: "notification",
      entityId: notification.id,
      entityLabel: notification.title,
      metadata: { type: notification.type, severity: notification.severity }
    });
  }
  return notification;
}

async function markAllNotificationsRead(user = {}, req = null) {
  const values = [];
  const where = ["n.read_at IS NULL"];
  addNotificationVisibilityWhere(user, where, values, "n");
  const result = await pool.query(
    `UPDATE notifications n
     SET read_at = NOW()
     WHERE ${where.join(" AND ")}
     RETURNING n.id`,
    values
  );
  void writeAuditLog({
    req,
    user,
    action: "notification_read",
    entityType: "notification",
    entityLabel: "Segna tutte come lette",
    metadata: { count: result.rowCount }
  });
  return result.rowCount;
}

async function deleteNotification(id, user = {}) {
  const values = [id];
  const where = ["n.id = $1::bigint"];
  addNotificationVisibilityWhere(user, where, values, "n");
  const result = await pool.query(`DELETE FROM notifications n WHERE ${where.join(" AND ")} RETURNING n.id`, values);
  return result.rowCount > 0;
}

function reasonFromText(type, severity, message) {
  return { type, severity, message };
}

function approvalReasonsFromQualityShield({ quality = null, shield = null, amlCheck = null } = {}) {
  const reasons = [];
  if (shield && ["alto", "critico"].includes(String(shield.risk_level || "").toLowerCase())) {
    reasons.push(reasonFromText("aurum_shield", shield.risk_level, `${shield.summary || "Aurum Shield richiede verifica"} (${Number(shield.score || 0)}/100)`));
  }
  (shield?.factors || []).forEach((factor) => {
    const severity = String(factor.severity || "").toLowerCase();
    if (["high", "critical", "alto", "critico"].includes(severity) || Number(factor.points || 0) >= 20) {
      reasons.push(reasonFromText(factor.type || "risk_factor", severity || "warning", factor.message || "Fattore rischio da verificare"));
    }
  });
  const qualityStatus = String(quality?.quality_status || quality?.status || "").toLowerCase();
  if (qualityStatus === "non_completabile") {
    (quality.blocking_errors || []).slice(0, 8).forEach((message) => reasons.push(reasonFromText("quality_error", "error", message)));
  } else if (qualityStatus === "attenzione") {
    (quality.warnings || []).slice(0, 6).forEach((message) => reasons.push(reasonFromText("quality_warning", "warning", message)));
  }
  if (amlCheck?.ok === false) {
    reasons.push(reasonFromText("cash_limit", "critical", amlCheck.messaggio || "Limite contanti superato."));
  } else if (amlCheck && Number(amlCheck.totale_previsto || 0) >= Number(amlCheck.limite || 500) * 0.8) {
    reasons.push(reasonFromText("cash_limit", "high", "Contanti vicino alla soglia configurata."));
  }
  const seen = new Set();
  return reasons.filter((reason) => {
    const key = `${reason.type}:${reason.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findApprovedApprovalForAct(saleDeedId) {
  if (!saleDeedId) return null;
  const result = await pool.query(
    `SELECT ${approvalRequestSelectSql()}
     ${approvalRequestJoinSql()}
     WHERE ar.sale_deed_id = $1::bigint
       AND ar.status = 'approved'
     ORDER BY ar.reviewed_at DESC NULLS LAST, ar.updated_at DESC
     LIMIT 1`,
    [saleDeedId]
  );
  return result.rows[0] || null;
}

async function assertApprovalAllowsFinalSave({ saleDeedId = null, draftData = {}, user = {}, req = null } = {}) {
  const role = normalizeRole(user.ruolo);
  const quality = await validateQualityChecklist({ sale_deed_id: saleDeedId || "", draft_data: draftData }, user);
  const shield = quality.aurum_shield || await calculateAurumShieldRisk({ sale_deed_id: saleDeedId || "", draft_data: draftData }, user).catch(() => null);
  const amlCheck = isCashPaymentMethod(draftData.paymentMethod || draftData.metodo_pagamento)
    ? await cashAntiMoneyLaunderingCheck({
      codice_fiscale: draftData.fiscalCode || draftData.codice_fiscale,
      cliente_id: draftData.cliente_id || draftData.clienteId,
      data_atto: draftData.date || draftData.data_atto,
      importo_corrente: draftData.amount || draftData.totale,
      atto_id: saleDeedId || draftData.id || null
    }).catch(() => null)
    : null;
  const reasons = approvalReasonsFromQualityShield({ quality, shield, amlCheck });
  const needsApproval = reasons.length > 0;
  if (!needsApproval) return { approved: false, request: null, quality, shield, amlCheck, reasons: [] };
  const approvedRequest = await findApprovedApprovalForAct(saleDeedId);
  if (approvedRequest) return { approved: true, request: approvedRequest, quality, shield, amlCheck, reasons };
  if (["commesso", "aiuto_commesso"].includes(role)) {
    void writeAuditLog({
      req,
      user,
      action: "approval_required_blocked_completion",
      entityType: "atto",
      entityId: saleDeedId || draftData.practiceNumber || null,
      entityLabel: draftData.practiceNumber || "",
      afterData: { reasons, quality, aurum_shield: shield },
      metadata: { critical: true, risk_score: shield?.score || 0, risk_level: shield?.risk_level || "" }
    });
    const error = new Error("Questa pratica richiede autorizzazione di un responsabile o founder prima di essere completata.");
    error.status = 409;
    error.code = "APPROVAL_REQUIRED";
    error.approval_required = true;
    error.reasons = reasons;
    error.quality_check = quality;
    error.aurum_shield = shield;
    throw error;
  }
  return { approved: false, request: null, quality, shield, amlCheck, reasons };
}

async function listApprovalRequests(query = {}, user = {}) {
  const values = [];
  const where = ["COALESCE(ar.status, '') <> 'deleted'"];
  await addApprovalVisibilityWhere(user, where, values);
  if (query.status) {
    values.push(String(query.status));
    where.push(`ar.status = $${values.length}::text`);
  }
  const result = await pool.query(
    `SELECT ${approvalRequestSelectSql()}
     ${approvalRequestJoinSql()}
     WHERE ${where.join(" AND ")}
     ORDER BY ar.created_at DESC
     LIMIT 200`,
    values
  );
  return result.rows.map(approvalRequestRowToPublic);
}

async function dashboardApprovalStats(user = {}) {
  const values = [];
  const where = ["ar.status = 'pending'"];
  await addApprovalVisibilityWhere(user, where, values);
  const result = await pool.query(
    `SELECT COUNT(*)::int AS pending,
            COUNT(*) FILTER (WHERE ar.risk_level IN ('alto', 'critico') OR ar.risk_score >= 61)::int AS risky_pending
     ${approvalRequestJoinSql()}
     WHERE ${where.join(" AND ")}`,
    values
  ).catch(() => ({ rows: [{ pending: 0, risky_pending: 0 }] }));
  const latest = await listApprovalRequests({ status: "pending" }, user).catch(() => []);
  return {
    pending: Number(result.rows[0]?.pending || 0),
    risky_pending: Number(result.rows[0]?.risky_pending || 0),
    latest: latest.slice(0, 10)
  };
}

async function dashboardSuspendedPracticeStats(user = {}) {
  const data = await listSuspendedPractices({ page: 1, limit: 10 }, user).catch(() => ({
    practices: [],
    pagination: { total: 0 }
  }));
  const today = new Date().toISOString().slice(0, 10);
  const latest = data.practices || [];
  const todayCount = latest.filter((practice) => String(practice.suspended_at || practice.suspendedAt || "").slice(0, 10) === today).length;
  const reasonCounts = new Map();
  latest.forEach((practice) => {
    (practice.motivi || practice.suspendedReasons || []).forEach((reason) => {
      const key = String(reason || "").trim();
      if (key) reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
    });
  });
  return {
    total: Number(data.pagination?.total || latest.length || 0),
    today: todayCount,
    latest,
    top_reasons: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  };
}

async function getApprovalRequest(id, user = {}) {
  const values = [id];
  const where = ["ar.id = $1::bigint"];
  await addApprovalVisibilityWhere(user, where, values);
  const result = await pool.query(
    `SELECT ${approvalRequestSelectSql()}
     ${approvalRequestJoinSql()}
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    values
  );
  return result.rows[0] ? approvalRequestRowToPublic(result.rows[0]) : null;
}

async function createApprovalRequest(input = {}, user = {}, req = null) {
  const saleDeedId = input.sale_deed_id || input.saleDeedId || input.atto_id || input.id || "";
  const row = saleDeedId ? await findExisting(saleDeedId) : null;
  if (!row) {
    const error = new Error("Atto non trovato");
    error.status = 404;
    throw error;
  }
  if (!canAccessAct(row, user) || !canEditAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const existing = await pool.query(
    `SELECT ${approvalRequestSelectSql()}
     ${approvalRequestJoinSql()}
     WHERE ar.sale_deed_id = $1::bigint
       AND ar.status = 'pending'
     ORDER BY ar.created_at DESC
     LIMIT 1`,
    [row.id]
  );
  if (existing.rows[0]) return approvalRequestRowToPublic(existing.rows[0]);
  const reasons = Array.isArray(input.reasons) ? input.reasons : [];
  const shield = input.aurum_shield || input.aurumShield || {};
  const quality = input.quality_check || input.qualityCheck || {};
  const riskScore = Number(input.risk_score ?? shield.score ?? 0);
  const riskLevel = String(input.risk_level || shield.risk_level || "").toLowerCase();
  const store = row.negozio_id ? null : await storeByCodeOrName(row.store);
  const result = await pool.query(
    `INSERT INTO approval_requests
      (sale_deed_id, requested_by, requested_by_role, requested_to_role, store_id, status,
       risk_score, risk_level, reasons, quality_check, aurum_shield, requester_note, updated_at)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::bigint,'pending',
       $6::integer,$7::text,$8::jsonb,$9::jsonb,$10::jsonb,$11::text,NOW())
     RETURNING *`,
    [
      row.id,
      user.id,
      normalizeRole(user.ruolo),
      "responsabile_founder",
      row.negozio_id || store?.id || null,
      riskScore,
      riskLevel,
      sanitizeForPostgres(reasons),
      sanitizeForPostgres(quality),
      sanitizeForPostgres(shield),
      input.requester_note || input.requesterNote || ""
    ]
  );
  const approval = result.rows[0];
  await pool.query(
    `UPDATE ${actsTable}
     SET status = 'pending_approval',
         approval_status = 'pending',
         approval_request_id = $2::bigint,
         approval_required_at = COALESCE(approval_required_at, NOW()),
         payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint`,
    [
      row.id,
      approval.id,
      sanitizeForPostgres({
        approvalStatus: "pending",
        approvalRequestId: approval.id,
        approvalRequestedAt: new Date().toISOString(),
        approvalReasons: reasons
      })
    ]
  );
  void createNotification({
    targetRole: "responsabile",
    storeId: row.negozio_id || store?.id || null,
    title: "Nuova richiesta autorizzazione",
    message: "Un operatore ha richiesto autorizzazione per una pratica ad alto rischio.",
    type: "approval_request",
    severity: "warning",
    entityType: "approval_request",
    entityId: approval.id,
    actionUrl: "#approvals",
    metadata: { approval_request_id: approval.id, sale_deed_id: row.id, practice_number: row.practice_number || "", risk_score: riskScore, risk_level: riskLevel },
    createdBy: user.id,
    actor: user,
    req
  });
  void createNotification({
    targetRole: "founder",
    title: "Nuova richiesta autorizzazione",
    message: "Un operatore ha richiesto autorizzazione per una pratica ad alto rischio.",
    type: "approval_request",
    severity: "warning",
    entityType: "approval_request",
    entityId: approval.id,
    actionUrl: "#approvals",
    metadata: { approval_request_id: approval.id, sale_deed_id: row.id, practice_number: row.practice_number || "", risk_score: riskScore, risk_level: riskLevel },
    createdBy: user.id,
    actor: user,
    req
  });
  void writeAuditLog({
    req,
    user,
    action: "approval_requested",
    entityType: "approval_request",
    entityId: approval.id,
    entityLabel: row.practice_number || "",
    afterData: approvalRequestRowToPublic({ ...approval, practice_number: row.practice_number, cliente_nome: row.cliente_nome, cliente_cognome: row.cliente_cognome, store: row.store }),
    metadata: { sale_deed_id: row.id, risk_score: riskScore, risk_level: riskLevel, critical: true }
  });
  return approvalRequestRowToPublic({ ...approval, practice_number: row.practice_number, cliente_nome: row.cliente_nome, cliente_cognome: row.cliente_cognome, store: row.store });
}

async function reviewApprovalRequest(id, input = {}, user = {}, req = null, targetStatus = "approved") {
  const result = await pool.query(
    `SELECT ${approvalRequestSelectSql()}, requester.ruolo AS requester_role
     ${approvalRequestJoinSql()}
     WHERE ar.id = $1::bigint
     LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  const isCancel = targetStatus === "cancelled";
  const canCancel = isCancel && (String(row.requested_by) === String(user.id) || await canApproveApprovalRequest(row, user));
  if (!canCancel && !(await canApproveApprovalRequest(row, user))) {
    void writeAuditLog({
      req,
      user,
      action: "approval_unauthorized_attempt",
      entityType: "approval_request",
      entityId: id,
      entityLabel: row.practice_number || "",
      metadata: { attempted_status: targetStatus, critical: true }
    });
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const note = String(input.reviewer_note || input.reviewerNote || input.note || "").trim();
  if (targetStatus === "rejected" && !note) {
    const error = new Error("Nota obbligatoria per rifiutare l'autorizzazione.");
    error.status = 400;
    throw error;
  }
  const reviewed = await pool.query(
    `UPDATE approval_requests
     SET status = $2::text,
         reviewer_note = $3::text,
         reviewed_by = CASE WHEN $2::text = 'cancelled' THEN reviewed_by ELSE $4::bigint END,
         reviewed_at = CASE WHEN $2::text = 'cancelled' THEN reviewed_at ELSE NOW() END,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [id, targetStatus, note, user.id || null]
  );
  const statusForAct = {
    approved: "suspended",
    rejected: "suspended",
    cancelled: "draft"
  }[targetStatus] || "pending_approval";
  await pool.query(
    `UPDATE ${actsTable}
     SET status = $2::text,
         approval_status = $3::text,
         suspended_reason = CASE
           WHEN $2::text = 'suspended' THEN COALESCE(suspended_reason, $5::text)
           ELSE suspended_reason
         END,
         suspended_reasons = CASE
           WHEN $2::text = 'suspended' THEN COALESCE(NULLIF($6::jsonb, '[]'::jsonb), suspended_reasons, '[]'::jsonb)
           ELSE suspended_reasons
         END,
         suspended_at = CASE
           WHEN $2::text = 'suspended' THEN COALESCE(suspended_at, NOW())
           ELSE suspended_at
         END,
         suspended_by = CASE
           WHEN $2::text = 'suspended' THEN COALESCE(suspended_by, $7::bigint)
           ELSE suspended_by
         END,
         resumed_at = CASE
           WHEN $2::text = 'draft' AND suspended_at IS NOT NULL THEN COALESCE(resumed_at, NOW())
           ELSE resumed_at
         END,
         resumed_by = CASE
           WHEN $2::text = 'draft' AND suspended_at IS NOT NULL THEN COALESCE(resumed_by, $7::bigint)
           ELSE resumed_by
         END,
         payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint`,
    [
      row.sale_deed_id,
      statusForAct,
      targetStatus,
      sanitizeForPostgres({
        approvalStatus: targetStatus,
        approvalRequestId: row.id,
        approvalReviewedAt: targetStatus === "cancelled" ? null : new Date().toISOString(),
        approvalReviewerNote: note
      }),
      targetStatus === "approved"
        ? "Autorizzazione approvata: pratica da completare."
        : targetStatus === "rejected"
          ? "Autorizzazione rifiutata: pratica da correggere."
          : "",
      sanitizeForPostgres(row.reasons || []),
      user.id || null
    ]
  );
  void createNotification({
    user_id: row.requested_by,
    title: targetStatus === "approved" ? "Autorizzazione approvata" : targetStatus === "rejected" ? "Autorizzazione rifiutata" : "Autorizzazione annullata",
    message: targetStatus === "approved"
      ? "Autorizzazione approvata. La pratica può essere completata."
      : targetStatus === "rejected"
        ? "Autorizzazione rifiutata. Correggere la pratica prima di procedere."
        : "Richiesta autorizzazione annullata.",
    type: targetStatus === "approved" ? "approval_approved" : targetStatus === "rejected" ? "approval_rejected" : "system",
    severity: targetStatus === "approved" ? "success" : targetStatus === "rejected" ? "danger" : "info",
    entityType: "approval_request",
    entityId: row.id,
    actionUrl: "#approvals",
    metadata: { approval_request_id: row.id, sale_deed_id: row.sale_deed_id, practice_number: row.practice_number || "" },
    createdBy: user.id,
    actor: user,
    req
  });
  const auditAction = targetStatus === "approved" ? "approval_approved" : targetStatus === "rejected" ? "approval_rejected" : "approval_cancelled";
  void writeAuditLog({
    req,
    user,
    action: auditAction,
    entityType: "approval_request",
    entityId: id,
    entityLabel: row.practice_number || "",
    beforeData: approvalRequestRowToPublic(row),
    afterData: approvalRequestRowToPublic({ ...row, ...reviewed.rows[0], reviewed_by: user.id }),
    metadata: { sale_deed_id: row.sale_deed_id, status: targetStatus, critical: true }
  });
  return approvalRequestRowToPublic({ ...row, ...reviewed.rows[0], reviewed_by: user.id });
}

async function rowWithAurumShield(id) {
  const result = await pool.query(
    `SELECT a.*, s.score AS shield_score, s.risk_level AS shield_risk_level,
            s.summary AS shield_summary, s.factors AS shield_factors,
            s.updated_at AS shield_updated_at,
            u.username AS operator_username, u.nome AS operator_nome, u.cognome AS operator_cognome
     FROM ${actsTable} a
     LEFT JOIN utenti u ON u.id = a.operatore_id
     LEFT JOIN LATERAL (
       SELECT score, risk_level, summary, factors, updated_at
       FROM aurum_shield_scores
       WHERE sale_deed_id = a.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) s ON TRUE
     WHERE a.id = $1::bigint
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAurumShieldForSaleDeed(identifier, user = {}) {
  const row = await findExisting(identifier);
  if (!row) return null;
  if (!canAccessAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const withShield = await rowWithAurumShield(row.id);
  let act = rowToAct(withShield || row);
  if (!act.aurumShield) {
    const shield = await persistAurumShieldForAct(row, user).catch(() => null);
    act = { ...act, aurumShield: shield };
  }
  return { act, shield: act.aurumShield };
}

async function getAurumShieldForClient(id, user = {}) {
  const clientResult = await pool.query("SELECT * FROM clienti WHERE id = $1::bigint", [id]);
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
  const values = [id];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const scores = await pool.query(
    `SELECT s.*, a.practice_number, a.data_atto, a.store
     FROM aurum_shield_scores s
     JOIN ${actsTable} a ON a.id = s.sale_deed_id
     WHERE s.client_id = $1::bigint
       AND a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
       ${storeWhere}
     ORDER BY s.updated_at DESC
     LIMIT 100`,
    values
  );
  const alerts = await pool.query(
    `SELECT al.*, a.practice_number, a.store
     FROM aurum_shield_alerts al
     LEFT JOIN ${actsTable} a ON a.id = al.sale_deed_id
     WHERE al.client_id = $1::bigint
       AND al.status IN ('open', 'in_review', 'in verifica')
       AND (a.id IS NULL OR (a.deleted_at IS NULL AND COALESCE(a.status, '') NOT ILIKE 'deleted'))
       ${storeWhere}
     ORDER BY al.created_at DESC
     LIMIT 50`,
    values
  ).catch(() => ({ rows: [] }));
  const scoreValues = scores.rows.map((row) => Number(row.score || 0));
  return {
    average_score: scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : 0,
    latest_score: scores.rows[0] || null,
    open_alerts: alerts.rows,
    history: scores.rows
  };
}

async function listAurumShieldAlerts(user = {}, query = {}) {
  if (!canViewControlSections(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const where = [
    "(a.id IS NULL OR (a.deleted_at IS NULL AND COALESCE(a.status, '') NOT ILIKE 'deleted'))",
    "al.status <> 'deleted'"
  ];
  if (query.status) {
    values.push(query.status);
    where.push(`al.status = $${values.length}::text`);
  }
  if (query.severity) {
    values.push(query.severity);
    where.push(`al.severity = $${values.length}::text`);
  }
  const result = await pool.query(
    `SELECT al.*, a.practice_number, a.store, a.cliente_nome, a.cliente_cognome,
            s.score, s.risk_level, s.factors
     FROM aurum_shield_alerts al
     LEFT JOIN ${actsTable} a ON a.id = al.sale_deed_id
     LEFT JOIN aurum_shield_scores s ON s.sale_deed_id = al.sale_deed_id
     WHERE ${where.join(" AND ")}
       ${storeWhere}
     ORDER BY al.created_at DESC
     LIMIT 200`,
    values
  );
  return result.rows;
}

async function reviewAurumShieldAlert(id, input = {}, user = {}) {
  if (!canViewControlSections(user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const statusMap = {
    "in verifica": "in_review",
    "in_review": "in_review",
    "risolto": "resolved",
    "resolved": "resolved",
    "falso positivo": "false_positive",
    "false_positive": "false_positive"
  };
  const status = statusMap[String(input.status || input.stato || "in_review").toLowerCase()] || "in_review";
  const result = await pool.query(
    `UPDATE aurum_shield_alerts
     SET status = $2::text,
         reviewed_by = $3::bigint,
         reviewed_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [id, status, user.id || null]
  );
  return result.rows[0] || null;
}

async function dashboardAurumShieldStats(user = {}) {
  const values = [];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT s.sale_deed_id) FILTER (WHERE s.risk_level IN ('alto', 'critico') AND a.data_atto = CURRENT_DATE)::int AS high_today,
       COUNT(DISTINCT s.sale_deed_id) FILTER (WHERE s.risk_level = 'critico')::int AS critical_open,
       COUNT(DISTINCT al.id) FILTER (WHERE al.status IN ('open', 'in_review', 'in verifica'))::int AS open_alerts,
       ROUND(COALESCE(AVG(s.score), 0))::int AS average_score
     FROM aurum_shield_scores s
     JOIN ${actsTable} a ON a.id = s.sale_deed_id
     LEFT JOIN aurum_shield_alerts al ON al.sale_deed_id = a.id AND al.status IN ('open', 'in_review', 'in verifica')
     WHERE a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
       ${storeWhere}`,
    values
  );
  const stores = await pool.query(
    `SELECT COALESCE(a.store, 'Dato non inserito') AS store, COUNT(*)::int AS alerts
     FROM aurum_shield_alerts al
     JOIN ${actsTable} a ON a.id = al.sale_deed_id
     WHERE al.status IN ('open', 'in_review', 'in verifica')
       AND a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
       ${storeWhere}
     GROUP BY COALESCE(a.store, 'Dato non inserito')
     ORDER BY alerts DESC
     LIMIT 1`,
    values
  ).catch(() => ({ rows: [] }));
  const operators = await pool.query(
    `SELECT COALESCE(u.username, a.payload->>'operatorUsername', 'Dato non inserito') AS operator, COUNT(*)::int AS alerts
     FROM aurum_shield_alerts al
     JOIN ${actsTable} a ON a.id = al.sale_deed_id
     LEFT JOIN utenti u ON u.id = a.operatore_id
     WHERE al.status IN ('open', 'in_review', 'in verifica')
       AND a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
       ${storeWhere}
     GROUP BY COALESCE(u.username, a.payload->>'operatorUsername', 'Dato non inserito')
     ORDER BY alerts DESC
     LIMIT 1`,
    values
  ).catch(() => ({ rows: [] }));
  return {
    high_today: Number(result.rows[0]?.high_today || 0),
    critical_open: Number(result.rows[0]?.critical_open || 0),
    open_alerts: Number(result.rows[0]?.open_alerts || 0),
    average_score: Number(result.rows[0]?.average_score || 0),
    top_store: stores.rows[0] || null,
    top_operator: operators.rows[0] || null
  };
}

function canManageCourses(user = {}) {
  return normalizeRole(user.ruolo) === "founder";
}

function canEvaluateCourses(user = {}) {
  return ["founder", "responsabile"].includes(normalizeRole(user.ruolo));
}

const aurumBlocksDefaultQuestions = [
  {
    question: "Il 18kt contiene circa quale percentuale di oro puro?",
    options: ["75%", "50%", "90%"],
    correct_answer: "75%",
    explanation: "18kt corrisponde a circa 75% di oro puro.",
    category: "carature",
    difficulty: "base"
  },
  {
    question: "Quale titolo argento è comunemente indicato come sterling?",
    options: ["925", "800", "999"],
    correct_answer: "925",
    explanation: "L'argento sterling è comunemente indicato come 925.",
    category: "argento",
    difficulty: "base"
  },
  {
    question: "Il 24kt indica oro praticamente puro?",
    options: ["Sì", "No"],
    correct_answer: "Sì",
    explanation: "24kt indica oro praticamente puro.",
    category: "carature",
    difficulty: "base"
  },
  {
    question: "Prima di archiviare un atto cosa va controllato?",
    options: ["Documento, firme, pagamento", "Solo il peso", "Solo il nome cliente"],
    correct_answer: "Documento, firme, pagamento",
    explanation: "Documento, firme e pagamento sono controlli essenziali.",
    category: "procedure",
    difficulty: "intermedio"
  },
  {
    question: "Se un documento è scaduto, cosa deve fare l'operatore?",
    options: ["Fermarsi/verificare procedura", "Completare comunque", "Ignorare"],
    correct_answer: "Fermarsi/verificare procedura",
    explanation: "Un documento scaduto richiede verifica prima di procedere.",
    category: "procedure",
    difficulty: "intermedio"
  }
];

const aurumBlocksDefaultBadges = [
  { code: "primo_lingotto", name: "Primo Lingotto", description: "Prima partita Aurum Blocks completata.", condition: { first_game: true } },
  { code: "linea_pulita", name: "Linea Pulita", description: "10 righe completate in una partita.", condition: { lines_cleared: 10 } },
  { code: "maestro_18kt", name: "Maestro 18kt", description: "5 risposte corrette in Training Carature.", condition: { training_correct_answers: 5 } },
  { code: "combo_oroactive", name: "Combo OroActive", description: "Combo 3+ in una partita.", condition: { best_combo: 3 } },
  { code: "operatore_preciso", name: "Operatore Preciso", description: "Training Carature con almeno 80% di risposte corrette.", condition: { training_accuracy: 80 } },
  { code: "aurum_arcade_pro", name: "Aurum Arcade Pro", description: "Aurum Score superiore a 10.000.", condition: { score: 10000 } }
];

function normalizeAurumBlocksMode(mode = "arcade") {
  const value = String(mode || "arcade").trim().toLowerCase();
  return ["arcade", "daily", "training"].includes(value) ? value : "arcade";
}

function aurumBlocksDailySeed(date = new Date()) {
  return `AB-${date.toISOString().slice(0, 10)}`;
}

function publicAurumBlocksQuestion(row = {}) {
  return {
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    correct_answer: row.correct_answer,
    explanation: row.explanation || "",
    category: row.category || "carature",
    difficulty: row.difficulty || "base"
  };
}

async function ensureAurumBlocksDefaults() {
  for (const question of aurumBlocksDefaultQuestions) {
    await pool.query(
      `INSERT INTO aurum_blocks_training_questions
        (question, options, correct_answer, explanation, category, difficulty, active)
       SELECT $1::text, $2::jsonb, $3::text, $4::text, $5::text, $6::text, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM aurum_blocks_training_questions WHERE question = $1::text
       )`,
      [
        question.question,
        JSON.stringify(question.options),
        question.correct_answer,
        question.explanation,
        question.category,
        question.difficulty
      ]
    );
  }
  for (const badge of aurumBlocksDefaultBadges) {
    await pool.query(
      `INSERT INTO aurum_blocks_badges (code, name, description, condition, active)
       VALUES ($1::text, $2::text, $3::text, $4::jsonb, TRUE)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           condition = EXCLUDED.condition,
           active = TRUE`,
      [badge.code, badge.name, badge.description, sanitizeForPostgres(badge.condition)]
    );
  }
}

function aurumBlocksScoreIsSuspicious(input = {}) {
  const score = Number(input.score || 0);
  const duration = Math.max(1, Number(input.duration_seconds || 1));
  const level = Number(input.level || 1);
  if (score < 0 || duration < 0 || level < 1 || level > 20) return true;
  return score > Math.max(50000, duration * 1800 + level * 6000);
}

async function startAurumBlocksSession(input = {}, user = {}, req = null) {
  await ensureAurumBlocksDefaults();
  const mode = normalizeAurumBlocksMode(input.mode);
  const dailySeed = mode === "daily" ? aurumBlocksDailySeed() : "";
  const result = await pool.query(
    `INSERT INTO aurum_blocks_sessions
      (user_id, store_id, mode, status, metadata)
     VALUES ($1::bigint, $2::bigint, $3::text, 'started', $4::jsonb)
     RETURNING *`,
    [
      user.id,
      user.negozio_id || null,
      mode,
      sanitizeForPostgres({ daily_seed: dailySeed, user_role: normalizeRole(user.ruolo) })
    ]
  );
  const session = { ...result.rows[0], daily_seed: dailySeed };
  void writeAuditLog({
    req,
    user,
    action: "aurum_blocks_started",
    entityType: "aurum_blocks_session",
    entityId: session.id,
    entityLabel: `Aurum Blocks ${mode}`,
    afterData: { mode, status: "started" },
    metadata: { store_id: user.negozio_id || null, mode }
  });
  return session;
}

async function awardAurumBlocksBadges(session = {}, user = {}, req = null) {
  await ensureAurumBlocksDefaults();
  const score = Number(session.score || 0);
  const lines = Number(session.lines_cleared || 0);
  const combo = Number(session.best_combo || 0);
  const correct = Number(session.training_correct_answers || 0);
  const wrong = Number(session.training_wrong_answers || 0);
  const answers = correct + wrong;
  const accuracy = answers ? Math.round((correct / answers) * 100) : 0;
  const totalScores = await pool.query(
    "SELECT COUNT(*)::int AS total FROM aurum_blocks_scores WHERE user_id = $1::bigint",
    [user.id]
  );
  const earnedCodes = [];
  if (Number(totalScores.rows[0]?.total || 0) <= 1) earnedCodes.push("primo_lingotto");
  if (lines >= 10) earnedCodes.push("linea_pulita");
  if (correct >= 5) earnedCodes.push("maestro_18kt");
  if (combo >= 3) earnedCodes.push("combo_oroactive");
  if (session.mode === "training" && answers >= 3 && accuracy >= 80) earnedCodes.push("operatore_preciso");
  if (score > 10000) earnedCodes.push("aurum_arcade_pro");
  const awarded = [];
  for (const code of earnedCodes) {
    const badge = (await pool.query("SELECT * FROM aurum_blocks_badges WHERE code = $1::text AND active = TRUE", [code])).rows[0];
    if (!badge) continue;
    const result = await pool.query(
      `INSERT INTO aurum_blocks_user_badges (user_id, badge_id, session_id)
       VALUES ($1::bigint, $2::bigint, $3::bigint)
       ON CONFLICT (user_id, badge_id) DO NOTHING
       RETURNING *`,
      [user.id, badge.id, session.id]
    );
    if (result.rowCount) {
      const row = { ...badge, awarded_at: result.rows[0].awarded_at };
      awarded.push(row);
      void writeAuditLog({
        req,
        user,
        action: "aurum_blocks_badge_awarded",
        entityType: "aurum_blocks_badge",
        entityId: badge.id,
        entityLabel: badge.name,
        afterData: { code: badge.code, name: badge.name },
        metadata: { session_id: session.id, score, lines_cleared: lines }
      });
    }
  }
  if (awarded.length) {
    void createNotification({
      userId: user.id,
      title: "Badge Aurum Blocks ottenuto",
      message: `Hai ottenuto ${awarded.length} badge Aurum Blocks.`,
      type: "academy_badge",
      severity: "success",
      entityType: "aurum_blocks_badge",
      entityId: awarded[0]?.id || null,
      actionUrl: "#aurumBlocks",
      createdBy: user.id,
      actor: user,
      audit: false
    });
  }
  return awarded;
}

async function finishAurumBlocksSession(id, input = {}, user = {}, req = null) {
  const session = (await pool.query(
    "SELECT * FROM aurum_blocks_sessions WHERE id = $1::bigint AND user_id = $2::bigint LIMIT 1",
    [id, user.id]
  )).rows[0];
  if (!session) {
    const error = new Error("Partita Aurum Blocks non trovata.");
    error.status = 404;
    throw error;
  }
  const score = Math.max(0, Math.round(Number(input.score || 0)));
  const level = Math.max(1, Math.min(20, Math.round(Number(input.level || 1))));
  const linesCleared = Math.max(0, Math.round(Number(input.lines_cleared || input.linesCleared || 0)));
  const bestCombo = Math.max(0, Math.round(Number(input.best_combo || input.bestCombo || 0)));
  const duration = Math.max(0, Math.round(Number(input.duration_seconds || input.durationSeconds || 0)));
  const trainingCorrect = Math.max(0, Math.round(Number(input.training_correct_answers || 0)));
  const trainingWrong = Math.max(0, Math.round(Number(input.training_wrong_answers || 0)));
  const suspicious = aurumBlocksScoreIsSuspicious({ score, level, duration_seconds: duration });
  const metadata = sanitizeForPostgres({
    ...(input.metadata || {}),
    suspicious,
    validation: suspicious ? "score fuori soglia base" : "ok"
  });
  const previousBest = (await pool.query(
    `SELECT score, level, lines_cleared, best_combo, duration_seconds, created_at
     FROM aurum_blocks_scores
     WHERE user_id = $1::bigint
       AND mode = $2::text
     ORDER BY score DESC, level DESC, lines_cleared DESC, duration_seconds ASC, created_at ASC
     LIMIT 1`,
    [user.id, session.mode]
  )).rows[0] || null;
  const updated = (await pool.query(
    `UPDATE aurum_blocks_sessions
     SET status = 'completed',
         score = $2::integer,
         level = $3::integer,
         lines_cleared = $4::integer,
         best_combo = $5::integer,
         duration_seconds = $6::integer,
         training_correct_answers = $7::integer,
         training_wrong_answers = $8::integer,
         ended_at = NOW(),
         metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb
     WHERE id = $1::bigint
     RETURNING *`,
    [id, score, level, linesCleared, bestCombo, duration, trainingCorrect, trainingWrong, metadata]
  )).rows[0];
  const scoreRow = (await pool.query(
    `INSERT INTO aurum_blocks_scores
      (session_id, user_id, store_id, mode, score, level, lines_cleared, best_combo, duration_seconds)
     VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text, $5::integer, $6::integer, $7::integer, $8::integer, $9::integer)
     RETURNING *`,
    [updated.id, user.id, user.negozio_id || null, updated.mode, score, level, linesCleared, bestCombo, duration]
  )).rows[0];
  const badges = await awardAurumBlocksBadges(updated, user, req);
  const previousScore = Number(previousBest?.score || 0);
  const isNewPersonalRecord = Boolean(previousBest) && score > previousScore;
  let personalRecord = {
    is_new_personal_record: isNewPersonalRecord,
    previous_score: previousScore,
    new_score: score,
    difference: isNewPersonalRecord ? score - previousScore : 0,
    position: null,
    mode: updated.mode
  };
  if (isNewPersonalRecord) {
    const leaderboard = await listAurumBlocksLeaderboard({ mode: updated.mode, period: "all", limit: 50 }, user);
    const ownRow = leaderboard.find((row) => String(row.user_id) === String(user.id));
    personalRecord = { ...personalRecord, position: ownRow?.position || null };
  }
  void writeAuditLog({
    req,
    user,
    action: "aurum_blocks_finished",
    entityType: "aurum_blocks_session",
    entityId: updated.id,
    entityLabel: `Aurum Blocks ${updated.mode}`,
    afterData: { score, level, lines_cleared: linesCleared, best_combo: bestCombo, suspicious },
    metadata: { store_id: user.negozio_id || null, mode: updated.mode, suspicious, personal_record: personalRecord }
  });
  return { session: updated, score: scoreRow, badges, suspicious, personal_record: personalRecord };
}

function aurumBlocksPeriodWhere(period = "", values = [], alias = "s") {
  const normalized = String(period || "all").toLowerCase();
  if (normalized === "today") return `${alias}.created_at >= CURRENT_DATE`;
  if (normalized === "month") return `${alias}.created_at >= date_trunc('month', NOW())`;
  if (normalized === "all") return "TRUE";
  return `${alias}.created_at >= NOW() - INTERVAL '7 days'`;
}

async function listAurumBlocksScores(query = {}, user = {}) {
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const mode = normalizeAurumBlocksMode(query.mode || "");
  const values = [user.id];
  const where = [`s.user_id = $1::bigint`];
  if (query.mode) {
    values.push(mode);
    where.push(`s.mode = $${values.length}::text`);
  }
  where.push(aurumBlocksPeriodWhere(query.period, values, "s"));
  const scores = (await pool.query(
    `SELECT s.*, u.username, u.nome, u.cognome, u.negozio AS store_name
     FROM aurum_blocks_scores s
     LEFT JOIN utenti u ON u.id = s.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY s.created_at DESC, s.score DESC
     LIMIT $${values.push(limit)}::integer`,
    values
  )).rows;
  const bestValues = values.slice(0, -1);
  const best = (await pool.query(
    `SELECT s.*, u.username, u.nome, u.cognome, u.negozio AS store_name
     FROM aurum_blocks_scores s
     LEFT JOIN utenti u ON u.id = s.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY s.score DESC, s.level DESC, s.lines_cleared DESC, s.duration_seconds ASC, s.created_at ASC
     LIMIT 1`,
    bestValues
  )).rows[0] || null;
  return { best_score: Number(best?.score || 0), best, scores };
}

async function listAurumBlocksLeaderboard(query = {}, user = {}) {
  const role = normalizeRole(user.ruolo);
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const values = [];
  const where = [aurumBlocksPeriodWhere(query.period, values, "s")];
  if (query.mode) {
    values.push(normalizeAurumBlocksMode(query.mode));
    where.push(`s.mode = $${values.length}::text`);
  }
  if (role === "responsabile" || role === "commesso" || role === "aiuto_commesso") {
    if (user.negozio_id) {
      values.push(user.negozio_id);
      const storeIdParam = values.length;
      where.push(`COALESCE(s.store_id, u.negozio_id) = $${storeIdParam}::bigint`);
    } else {
      values.push(user.negozio || "");
      where.push(`COALESCE(u.negozio, '') = $${values.length}::text`);
    }
  } else if (query.store_id) {
    values.push(query.store_id);
    where.push(`COALESCE(s.store_id, u.negozio_id) = $${values.length}::bigint`);
  }
  const limitParam = values.push(limit);
  const result = await pool.query(
    `WITH ranked_scores AS (
       SELECT
         s.*,
         u.username,
         u.ruolo AS role,
         CONCAT_WS(' ', u.nome, u.cognome) AS user_name,
         u.negozio AS store_name,
         ROW_NUMBER() OVER (
           PARTITION BY s.user_id
           ORDER BY s.score DESC, s.level DESC, s.lines_cleared DESC, s.duration_seconds ASC, s.created_at ASC
         ) AS user_score_rank
       FROM aurum_blocks_scores s
       LEFT JOIN utenti u ON u.id = s.user_id
       WHERE ${where.join(" AND ")}
     ),
     best_scores AS (
       SELECT *
       FROM ranked_scores
       WHERE user_score_rank = 1
     )
     SELECT
       ROW_NUMBER() OVER (
         ORDER BY score DESC, level DESC, lines_cleared DESC, duration_seconds ASC, created_at ASC
       ) AS position,
       *
     FROM best_scores
     ORDER BY score DESC, level DESC, lines_cleared DESC, duration_seconds ASC, created_at ASC
     LIMIT $${limitParam}::integer`,
    values
  );
  return result.rows;
}

async function listAurumBlocksBadges(user = {}) {
  const result = await pool.query(
    `SELECT b.*, ub.awarded_at
     FROM aurum_blocks_user_badges ub
     JOIN aurum_blocks_badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1::bigint
     ORDER BY ub.awarded_at DESC`,
    [user.id]
  );
  return result.rows;
}

async function gamingOverview(user = {}) {
  const aurumBlocksBest = (await pool.query(
    `SELECT score
     FROM aurum_blocks_scores
     WHERE user_id = $1::bigint
     ORDER BY score DESC, level DESC, lines_cleared DESC, created_at ASC
     LIMIT 1`,
    [user.id]
  )).rows[0] || null;
  return {
    games: [
      { id: "aurum_blocks", title: "Aurum Blocks", section: "aurumBlocks", best_score: Number(aurumBlocksBest?.score || 0) }
    ],
    aurum_blocks: { best_score: Number(aurumBlocksBest?.score || 0) }
  };
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
  await ensureGoldMasterCourseInCatalog();
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

async function findGoldMasterCourse() {
  const result = await pool.query(
    `SELECT *
     FROM courses
     WHERE COALESCE(metadata->>'courseCode', '') = $1::text
        OR title = $2::text
     ORDER BY id ASC
     LIMIT 1`,
    [GOLD_MASTER_COURSE_CODE, GOLD_MASTER_COURSE_TITLE]
  );
  return result.rows[0] || null;
}

async function findGoldMasterSourceInKnowledgeBase() {
  const result = await pool.query(
    `SELECT d.id, d.titolo, d.filename, d.metadata,
            STRING_AGG(c.content, E'\n\n' ORDER BY c.chunk_index ASC) AS extracted_text
     FROM ai_documents d
     LEFT JOIN ai_document_chunks c ON c.document_id = d.id
     WHERE LOWER(COALESCE(d.titolo, '')) LIKE '%bilancia%'
       AND LOWER(COALESCE(d.titolo, '')) LIKE '%oro%'
     GROUP BY d.id
     ORDER BY d.created_at DESC
     LIMIT 1`
  );
  const row = result.rows[0];
  if (!row?.extracted_text) return null;
  return {
    found: true,
    title: row.titolo || "La Bilancia d'Oro",
    filePath: row.filename || "",
    source_type: "knowledge_base",
    size: String(row.extracted_text || "").length,
    updated_at: null,
    extractedText: row.extracted_text,
    metadata: row.metadata || {}
  };
}

async function loadGoldMasterSource() {
  const localSource = await findBilanciaDOroSource({ fs, path, rootDir: __dirname });
  if (localSource.found && localSource.filePath) {
    const buffer = await fs.readFile(localSource.filePath);
    const extractedText = await extractBookTextFromBuffer({
      filename: localSource.filePath,
      mimeType: "",
      buffer
    });
    return {
      ...localSource,
      extractedText: normalizeBookText(extractedText)
    };
  }
  const knowledgeSource = await findGoldMasterSourceInKnowledgeBase();
  if (knowledgeSource?.found) {
    return {
      ...knowledgeSource,
      extractedText: normalizeBookText(knowledgeSource.extractedText)
    };
  }
  return {
    ...localSource,
    extractedText: ""
  };
}

async function upsertGoldMasterSourceDocument(source = {}, user = {}) {
  const extractedText = String(source.extractedText || "");
  if (!extractedText.trim()) return null;
  const hash = textHash(normalizeBookText(extractedText));
  const metadata = sanitizeForPostgres({
    sourceKey: "gold-master-bilancia-oro",
    found: Boolean(source.found),
    size: source.size || extractedText.length,
    updated_at: source.updated_at || null
  });
  const result = await pool.query(
    `INSERT INTO academy_source_documents
      (title, source_type, file_path, content_hash, metadata, created_by)
     VALUES ($1::text, $2::text, $3::text, $4::text, $5::jsonb, $6::bigint)
     ON CONFLICT (content_hash)
     DO UPDATE SET title = EXCLUDED.title,
                   source_type = EXCLUDED.source_type,
                   file_path = EXCLUDED.file_path,
                   metadata = academy_source_documents.metadata || EXCLUDED.metadata
     RETURNING *`,
    [
      source.title || "La Bilancia d'Oro",
      source.source_type || "file",
      source.filePath || source.file_path || "",
      hash,
      metadata,
      user.id || null
    ]
  );
  return result.rows[0];
}

function drawGoldMasterSlide(doc, slide = {}, index = 0, total = 1) {
  doc.rect(0, 0, 960, 540).fill("#0e0c0a");
  doc.rect(0, 0, 960, 88).fill("#1a1008");
  doc.rect(0, 88, 960, 2).fill("#f97316");
  doc.fillColor("#f97316").font("Helvetica-Bold").fontSize(16).text("OROACTIVE ACADEMY", 48, 32);
  doc.fillColor("#f7d27a").font("Helvetica-Bold").fontSize(13).text(GOLD_MASTER_COURSE_TITLE, 720, 34, { width: 190, align: "right" });
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(34).text(String(slide.title || "Lezione"), 54, 126, { width: 830, lineGap: 4 });
  if (slide.subtitle) {
    doc.fillColor("#f7d27a").font("Helvetica").fontSize(18).text(String(slide.subtitle), 56, 192, { width: 820 });
  }
  const bullets = Array.isArray(slide.bullets) ? slide.bullets.slice(0, 6) : [];
  let y = slide.subtitle ? 245 : 210;
  bullets.forEach((bullet) => {
    const text = String(bullet || "").trim();
    if (!text) return;
    doc.circle(68, y + 8, 4).fill("#f97316");
    doc.fillColor("#f5f2ed").font("Helvetica").fontSize(20).text(text, 88, y, { width: 790, lineGap: 6 });
    y += 52;
  });
  doc.rect(48, 484, 864, 1).fill("#3b2c1f");
  doc.fillColor("#a8a29e").font("Helvetica").fontSize(11).text(`Slide ${index + 1}/${total} - Certificazione interna OroActive Academy`, 56, 500, { width: 830, align: "right" });
}

async function writeGoldMasterLessonPdf(module = {}, lesson = {}) {
  await fs.mkdir(goldMasterSlideDirectory, { recursive: true });
  const filename = `oro-master-${slugifyGoldMaster(lesson.key || lesson.title)}.pdf`;
  const fullPath = path.join(goldMasterSlideDirectory, filename);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [960, 540], margin: 0 });
    const output = createWriteStream(fullPath);
    output.on("finish", resolve);
    output.on("error", reject);
    doc.on("error", reject);
    doc.pipe(output);
    const slides = lesson.slides || [];
    slides.forEach((slide, index) => {
      if (index > 0) doc.addPage();
      drawGoldMasterSlide(doc, slide, index, slides.length);
    });
    doc.end();
  });
  const stats = await fs.stat(fullPath);
  return {
    filename,
    fileUrl: `/api/academy/materials/file/${filename}`,
    size: stats.size,
    mimeType: "application/pdf"
  };
}

async function upsertGoldMasterCourse(payload = {}, user = {}) {
  const faculty = await ensureAcademyFaculty(payload.faculty || "OroActive Academy");
  const category = await ensureCourseCategory(payload.category || "Formazione Compro Oro");
  const section = await ensureCourseSection(category.id, payload.section || "Oro Master");
  let course = await findGoldMasterCourse();
  const previousPublicationStatus = course?.metadata?.publicationStatus || "";
  const publicationStatus = previousPublicationStatus === "published"
    ? "published"
    : payload.status || previousPublicationStatus || "draft_review";
  const metadata = sanitizeForPostgres({
    courseCode: GOLD_MASTER_COURSE_CODE,
    goldMaster: true,
    sourceFound: Boolean(payload.source_found),
    sourceWarning: payload.warning || "",
    generationStatus: payload.status || "draft_review",
    publicationStatus,
    modulesCount: payload.modules?.length || 0,
    lessonsCount: (payload.modules || []).reduce((sum, item) => sum + (item.lessons?.length || 0), 0),
    certificationName: GOLD_MASTER_CERTIFICATION_NAME,
    badgeName: GOLD_MASTER_BADGE_NAME,
    generatedAt: new Date().toISOString()
  });
  if (course) {
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
           thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), $11::text),
           final_certification = TRUE,
           module_title = $12::text,
           lesson_title = $13::text,
           active = CASE WHEN active = TRUE THEN TRUE ELSE $14::boolean END,
           order_index = 1,
           metadata = COALESCE(metadata, '{}'::jsonb) || $15::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [
        course.id,
        category.id,
        section.id,
        faculty.id,
        payload.title,
        "Corso avanzato interno OroActive Academy basato sul libro La Bilancia d'Oro, con moduli, lezioni, quiz, slide e certificazione interna.",
        payload.level,
        payload.duration_minutes,
        payload.duration_label,
        payload.teacher,
        "",
        payload.modules?.[0]?.title || "Fondamenti dell'oro",
        payload.modules?.[0]?.lessons?.[0]?.title || "Introduzione",
        payload.active !== false,
        metadata
      ]
    );
    course = result.rows[0];
  } else {
    const result = await pool.query(
      `INSERT INTO courses
        (category_id, section_id, faculty_id, title, description, level, duration_minutes,
         duration_label, teacher, thumbnail_url, final_certification, module_title, lesson_title,
         active, order_index, created_by, metadata)
       VALUES ($1::bigint,$2::bigint,$3::bigint,$4::text,$5::text,$6::text,$7::integer,
         $8::text,$9::text,$10::text,TRUE,$11::text,$12::text,$13::boolean,1,$14::bigint,$15::jsonb)
       RETURNING *`,
      [
        category.id,
        section.id,
        faculty.id,
        payload.title,
        "Corso avanzato interno OroActive Academy basato sul libro La Bilancia d'Oro, con moduli, lezioni, quiz, slide e certificazione interna.",
        payload.level,
        payload.duration_minutes,
        payload.duration_label,
        payload.teacher,
        "",
        payload.modules?.[0]?.title || "Fondamenti dell'oro",
        payload.modules?.[0]?.lessons?.[0]?.title || "Introduzione",
        payload.active !== false,
        user.id || null,
        metadata
      ]
    );
    course = result.rows[0];
  }
  await pool.query(
    `INSERT INTO academy_courses
      (course_id, faculty_id, title, description, level, duration_minutes, teacher,
       thumbnail_url, final_certification, active, metadata, created_by)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,$6::integer,$7::text,$8::text,TRUE,$9::boolean,$10::jsonb,$11::bigint)
     ON CONFLICT (course_id)
     DO UPDATE SET faculty_id = EXCLUDED.faculty_id,
                   title = EXCLUDED.title,
                   description = EXCLUDED.description,
                   level = EXCLUDED.level,
                   duration_minutes = EXCLUDED.duration_minutes,
                   teacher = EXCLUDED.teacher,
                   active = EXCLUDED.active,
                   metadata = COALESCE(academy_courses.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                   updated_at = NOW()
     RETURNING *`,
    [
      course.id,
      faculty.id,
      course.title,
      course.description,
      course.level,
      course.duration_minutes,
      course.teacher,
      course.thumbnail_url || "",
      course.active !== false,
      metadata,
      user.id || null
    ]
  );
  return course;
}

async function upsertGoldMasterModule(course = {}, module = {}) {
  const metadata = sanitizeForPostgres({
    goldMaster: true,
    goldMasterKey: module.key,
    moduleNumber: module.number,
    objective: module.objective,
    prerequisites: module.prerequisites,
    materials: module.materials || []
  });
  const existing = (await pool.query(
    `SELECT *
     FROM academy_modules
     WHERE course_id = $1::bigint
       AND COALESCE(metadata->>'goldMasterKey', '') = $2::text
     LIMIT 1`,
    [course.id, module.key]
  )).rows[0];
  if (existing) {
    const updated = await pool.query(
      `UPDATE academy_modules
       SET title = $2::text,
           description = $3::text,
           sort_order = $4::integer,
           active = TRUE,
           metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [existing.id, module.title, module.objective, module.number, metadata]
    );
    return updated.rows[0];
  }
  const academyCourse = (await pool.query("SELECT id FROM academy_courses WHERE course_id = $1::bigint LIMIT 1", [course.id])).rows[0];
  const inserted = await pool.query(
    `INSERT INTO academy_modules
      (academy_course_id, course_id, title, description, sort_order, active, metadata)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::integer,TRUE,$6::jsonb)
     RETURNING *`,
    [academyCourse?.id || null, course.id, module.title, module.objective, module.number, metadata]
  );
  return inserted.rows[0];
}

async function upsertGoldMasterLesson(course = {}, moduleRow = {}, module = {}, lesson = {}, sourceDocument = null) {
  const metadata = sanitizeForPostgres({
    goldMaster: true,
    goldMasterKey: lesson.key,
    moduleKey: module.key,
    moduleNumber: module.number,
    objective: lesson.objective,
    keywords: lesson.keywords || [],
    sourceStatus: lesson.source_ref?.status || "needs_review",
    contentBlocks: lesson.content_blocks || [],
    quizCount: lesson.quiz?.length || 0
  });
  const pdf = await writeGoldMasterLessonPdf(module, lesson);
  const existing = (await pool.query(
    `SELECT *
     FROM academy_lessons
     WHERE course_id = $1::bigint
       AND COALESCE(metadata->>'goldMasterKey', '') = $2::text
     LIMIT 1`,
    [course.id, lesson.key]
  )).rows[0];
  let lessonRow;
  if (existing) {
    lessonRow = (await pool.query(
      `UPDATE academy_lessons
       SET academy_module_id = $2::bigint,
           title = $3::text,
           description = $4::text,
           pdf_url = $5::text,
           duration_minutes = $6::integer,
           sort_order = $7::integer,
           active = TRUE,
           metadata = COALESCE(metadata, '{}'::jsonb) || $8::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [
        existing.id,
        moduleRow.id,
        lesson.title,
        lesson.summary,
        pdf.fileUrl,
        lesson.duration_minutes,
        lesson.order,
        metadata
      ]
    )).rows[0];
  } else {
    lessonRow = (await pool.query(
      `INSERT INTO academy_lessons
        (academy_module_id, course_id, title, description, pdf_url, duration_minutes, sort_order, active, metadata)
       VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,$6::integer,$7::integer,TRUE,$8::jsonb)
       RETURNING *`,
      [
        moduleRow.id,
        course.id,
        lesson.title,
        lesson.summary,
        pdf.fileUrl,
        lesson.duration_minutes,
        lesson.order,
        metadata
      ]
    )).rows[0];
  }
  await upsertGoldMasterMaterial(lessonRow, course, {
    key: `${lesson.key}:slides`,
    title: `Slide PDF - ${lesson.title}`,
    material_type: "pdf",
    file_url: pdf.fileUrl,
    mime_type: pdf.mimeType,
    size_bytes: pdf.size,
    sort_order: 1,
    metadata: {
      goldMaster: true,
      kind: "lesson_slides",
      slides: lesson.slides || [],
      sourceStatus: lesson.source_ref?.status || ""
    }
  });
  await upsertGoldMasterMaterial(lessonRow, course, {
    key: `${lesson.key}:source`,
    title: `Scheda lezione - ${lesson.title}`,
    material_type: "testo",
    file_url: "",
    mime_type: "application/json",
    size_bytes: 0,
    sort_order: 2,
    metadata: {
      goldMaster: true,
      kind: "lesson_content",
      objective: lesson.objective,
      contentBlocks: lesson.content_blocks || [],
      sourceRef: lesson.source_ref || null
    }
  });
  await upsertGoldMasterMaterial(lessonRow, course, {
    key: `${lesson.key}:quiz`,
    title: `Quiz intermedio - ${lesson.title}`,
    material_type: "testo",
    file_url: "",
    mime_type: "application/json",
    size_bytes: 0,
    sort_order: 3,
    metadata: {
      goldMaster: true,
      kind: "lesson_quiz",
      questions: lesson.quiz || []
    }
  });
  if (sourceDocument?.id && lesson.source_ref?.excerpt) {
    await pool.query(
      "DELETE FROM academy_lesson_source_refs WHERE lesson_id = $1::bigint",
      [lessonRow.id]
    );
    await pool.query(
      `INSERT INTO academy_lesson_source_refs
        (lesson_id, source_document_id, chapter, excerpt, confidence, metadata)
       VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::numeric,$6::jsonb)`,
      [
        lessonRow.id,
        sourceDocument.id,
        lesson.source_ref.chapter || "",
        lesson.source_ref.excerpt || "",
        Number(lesson.source_ref.confidence || 0),
        sanitizeForPostgres({ status: lesson.source_ref.status || "", lessonKey: lesson.key })
      ]
    );
  }
  return lessonRow;
}

async function upsertGoldMasterMaterial(lessonRow = {}, course = {}, material = {}) {
  const metadata = sanitizeForPostgres({
    ...(material.metadata || {}),
    goldMasterKey: material.key
  });
  const existing = (await pool.query(
    `SELECT *
     FROM academy_materials
     WHERE academy_lesson_id = $1::bigint
       AND COALESCE(metadata->>'goldMasterKey', '') = $2::text
     LIMIT 1`,
    [lessonRow.id, material.key]
  )).rows[0];
  if (existing) {
    const updated = await pool.query(
      `UPDATE academy_materials
       SET title = $2::text,
           material_type = $3::text,
           file_url = $4::text,
           external_url = '',
           mime_type = $5::text,
           size_bytes = $6::bigint,
           allow_download = TRUE,
           sort_order = $7::integer,
           metadata = COALESCE(metadata, '{}'::jsonb) || $8::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [
        existing.id,
        material.title,
        material.material_type,
        material.file_url || "",
        material.mime_type || "",
        material.size_bytes || 0,
        material.sort_order || 0,
        metadata
      ]
    );
    return updated.rows[0];
  }
  const inserted = await pool.query(
    `INSERT INTO academy_materials
      (academy_lesson_id, course_id, title, material_type, file_url, external_url,
       mime_type, size_bytes, allow_download, sort_order, metadata)
     VALUES ($1::bigint,$2::bigint,$3::text,$4::text,$5::text,'',$6::text,$7::bigint,TRUE,$8::integer,$9::jsonb)
     RETURNING *`,
    [
      lessonRow.id,
      course.id,
      material.title,
      material.material_type,
      material.file_url || "",
      material.mime_type || "",
      material.size_bytes || 0,
      material.sort_order || 0,
      metadata
    ]
  );
  return inserted.rows[0];
}

async function upsertGoldMasterCourseMaterial(course = {}, material = {}) {
  const metadata = sanitizeForPostgres({
    ...(material.metadata || {}),
    goldMaster: true,
    goldMasterKey: material.key
  });
  const existing = (await pool.query(
    `SELECT *
     FROM course_materials
     WHERE course_id = $1::bigint
       AND COALESCE(metadata->>'goldMasterKey', '') = $2::text
     LIMIT 1`,
    [course.id, material.key]
  )).rows[0];
  if (existing) {
    return (await pool.query(
      `UPDATE course_materials
       SET title = $2::text,
           material_type = $3::text,
           file_url = $4::text,
           allow_download = TRUE,
           sort_order = $5::integer,
           metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb
       WHERE id = $1::bigint
       RETURNING *`,
      [existing.id, material.title, material.material_type, material.file_url || "", material.sort_order || 0, metadata]
    )).rows[0];
  }
  return (await pool.query(
    `INSERT INTO course_materials
      (course_id, title, material_type, file_url, allow_download, sort_order, metadata)
     VALUES ($1::bigint,$2::text,$3::text,$4::text,TRUE,$5::integer,$6::jsonb)
     RETURNING *`,
    [course.id, material.title, material.material_type, material.file_url || "", material.sort_order || 0, metadata]
  )).rows[0];
}

async function upsertGoldMasterQuizzes(course = {}, modules = []) {
  let sort = 1;
  for (const module of modules) {
    const moduleQuestions = [];
    for (const lesson of module.lessons || []) {
      moduleQuestions.push(...(lesson.quiz || []).slice(0, 2));
    }
    for (const question of moduleQuestions.slice(0, 12)) {
      await pool.query(
        `INSERT INTO course_quizzes
          (course_id, question, options, correct_answer, sort_order, active)
         SELECT $1::bigint,$2::text,$3::jsonb,$4::text,$5::integer,TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM course_quizzes
           WHERE course_id = $1::bigint AND question = $2::text
         )`,
        [
          course.id,
          question.question,
          sanitizeForPostgres(question.options || []),
          question.correct_answer,
          sort
        ]
      );
      sort += 1;
    }
  }
}

async function upsertGoldMasterBadgeDefinition(course = {}, user = {}) {
  await pool.query(
    `INSERT INTO course_badges
      (course_id, user_id, badge_name, badge_code, assigned_by, status)
     VALUES ($1::bigint,NULL,$2::text,'GOLD-MASTER-SPECIALISTA',$3::bigint,'catalogo')
     ON CONFLICT (badge_code)
     DO UPDATE SET badge_name = EXCLUDED.badge_name,
                   course_id = EXCLUDED.course_id,
                   status = EXCLUDED.status`,
    [course.id, GOLD_MASTER_BADGE_NAME, user.id || null]
  );
  await pool.query(
    `INSERT INTO academy_badges
      (course_id, user_id, badge_name, badge_code, assigned_by, status)
     VALUES ($1::bigint,NULL,$2::text,'GOLD-MASTER-SPECIALISTA-ACADEMY',$3::bigint,'catalogo')
     ON CONFLICT (badge_code)
     DO UPDATE SET badge_name = EXCLUDED.badge_name,
                   course_id = EXCLUDED.course_id,
                   status = EXCLUDED.status`,
    [course.id, GOLD_MASTER_BADGE_NAME, user.id || null]
  );
}

async function saveGoldMasterCourseToAcademy(payload = {}, user = {}) {
  const sourceDocument = await upsertGoldMasterSourceDocument(payload.source_document || {}, user);
  const course = await upsertGoldMasterCourse(payload, user);
  let firstLessonPdf = "";
  const saved = { modules: 0, lessons: 0, materials: 0 };
  for (const module of payload.modules || []) {
    const moduleRow = await upsertGoldMasterModule(course, module);
    saved.modules += 1;
    for (const lesson of module.lessons || []) {
      const lessonRow = await upsertGoldMasterLesson(course, moduleRow, module, lesson, sourceDocument);
      firstLessonPdf ||= lessonRow.pdf_url || "";
      saved.lessons += 1;
      saved.materials += 3;
    }
  }
  if (firstLessonPdf) {
    await pool.query(
      `UPDATE courses
       SET pdf_url = $2::text,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint`,
      [
        course.id,
        firstLessonPdf,
        sanitizeForPostgres({ firstLessonPdf, goldMasterUpdatedAt: new Date().toISOString() })
      ]
    );
  }
  for (const scheme of payload.schemes || []) {
    await upsertGoldMasterCourseMaterial(course, {
      key: `scheme:${slugifyGoldMaster(scheme.title)}`,
      title: `Schema - ${scheme.title}`,
      material_type: "testo",
      file_url: "",
      sort_order: 100 + Number(scheme.moduleNumber || 0),
      metadata: { kind: "summary_scheme", scheme }
    });
  }
  await upsertGoldMasterCourseMaterial(course, {
    key: "media-prompts",
    title: "Prompt immagini realistiche Oro Master",
    material_type: "testo",
    file_url: "",
    sort_order: 180,
    metadata: { kind: "media_prompts", prompts: payload.media_prompts || [] }
  });
  await upsertGoldMasterCourseMaterial(course, {
    key: "final-exam",
    title: "Esame finale e certificazione interna",
    material_type: "testo",
    file_url: "",
    sort_order: 200,
    metadata: { kind: "final_exam", exam: payload.final_exam || {} }
  });
  await upsertGoldMasterQuizzes(course, payload.modules || []);
  await upsertGoldMasterBadgeDefinition(course, user);
  return {
    course_id: course.id,
    title: course.title,
    active: course.active,
    source_found: Boolean(payload.source_found),
    warning: payload.warning || "",
    saved,
    status: payload.status || "draft_review"
  };
}

async function ensureGoldMasterCourseInCatalog() {
  const existing = await findGoldMasterCourse();
  if (!existing) {
    return generateGoldMasterCourseFromBilancia({ id: null, ruolo: "founder" }, { force: true });
  }
  const metadata = existing.metadata || {};
  if (existing.active === false && metadata.publicationStatus !== "hidden_by_founder") {
    const nextMetadata = sanitizeForPostgres({
      publicationStatus: metadata.publicationStatus || "draft_review",
      visibleInAcademyCatalog: true,
      catalogVisibilityFixedAt: new Date().toISOString()
    });
    const updated = await pool.query(
      `UPDATE courses
       SET active = TRUE,
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1::bigint
       RETURNING *`,
      [existing.id, nextMetadata]
    );
    await pool.query(
      `UPDATE academy_courses
       SET active = TRUE,
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE course_id = $1::bigint`,
      [existing.id, nextMetadata]
    );
    return {
      ok: true,
      course_id: updated.rows[0]?.id || existing.id,
      active: true,
      message: "Oro Master reso visibile nel catalogo Academy."
    };
  }
  return {
    ok: true,
    skipped: true,
    course_id: existing.id,
    active: existing.active,
    message: "Oro Master gia disponibile."
  };
}

async function generateGoldMasterCourseFromBilancia(user = {}, options = {}) {
  if (options.requireFounder && !canManageCourses(user)) {
    const error = new Error("Solo il Founder puo generare Oro Master.");
    error.status = 403;
    throw error;
  }
  const existing = await findGoldMasterCourse();
  if (existing && !options.force) {
    return {
      ok: true,
      skipped: true,
      course_id: existing.id,
      title: existing.title,
      active: existing.active,
      message: "Corso Oro Master gia presente.",
      metadata: existing.metadata || {}
    };
  }
  const source = await loadGoldMasterSource();
  const payload = buildGoldMasterCoursePayload({
    sourceText: source.extractedText || "",
    sourceDocument: {
      title: source.title || "La Bilancia d'Oro",
      filePath: source.filePath || "",
      source_type: source.source_type || "missing",
      found: source.found
    }
  });
  const sourceDocument = {
    ...source,
    title: source.title || "La Bilancia d'Oro",
    file_path: source.filePath || ""
  };
  payload.source_document = sourceDocument;
  const result = await saveGoldMasterCourseToAcademy(payload, user);
  return {
    ok: true,
    ...result,
    source: {
      found: Boolean(source.found && source.extractedText),
      title: source.title || "La Bilancia d'Oro",
      file_path: source.filePath || "",
      source_type: source.source_type || "missing",
      chars: String(source.extractedText || "").length
    }
  };
}

async function goldMasterStatus(user = {}) {
  const course = await findGoldMasterCourse();
  const source = await loadGoldMasterSource().catch((error) => ({
    found: false,
    filePath: "",
    source_type: "error",
    extractedText: "",
    error: error.message
  }));
  if (!course) {
    return {
      ok: true,
      exists: false,
      source_found: Boolean(source.found && source.extractedText),
      source_path: source.filePath || "",
      warning: source.extractedText ? "" : "File La Bilancia d'Oro non trovato. Caricare il libro per generare il corso completo."
    };
  }
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM academy_modules WHERE course_id = $1::bigint AND active = TRUE) AS modules,
       (SELECT COUNT(*)::int FROM academy_lessons WHERE course_id = $1::bigint AND active = TRUE) AS lessons,
       (SELECT COUNT(*)::int FROM academy_materials WHERE course_id = $1::bigint) AS materials,
       (SELECT COUNT(*)::int FROM course_quizzes WHERE course_id = $1::bigint AND active = TRUE) AS quizzes`,
    [course.id]
  );
  return {
    ok: true,
    exists: true,
    course,
    counts: counts.rows[0] || {},
    source_found: Boolean(source.found && source.extractedText),
    source_path: source.filePath || "",
    warning: course.metadata?.sourceWarning || ""
  };
}

async function publishGoldMasterCourse(user = {}, publish = true) {
  if (!canManageCourses(user)) {
    const error = new Error("Solo il Founder puo pubblicare Oro Master.");
    error.status = 403;
    throw error;
  }
  const course = await findGoldMasterCourse();
  if (!course) {
    const error = new Error("Corso Oro Master non trovato.");
    error.status = 404;
    throw error;
  }
  const metadata = sanitizeForPostgres({
    publicationStatus: publish ? "published" : "hidden_by_founder",
    publishedAt: publish ? new Date().toISOString() : null,
    unpublishedAt: publish ? null : new Date().toISOString()
  });
  const updated = await pool.query(
    `UPDATE courses
     SET active = $2::boolean,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING *`,
    [course.id, publish, metadata]
  );
  await pool.query(
    `UPDATE academy_courses
     SET active = $2::boolean,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE course_id = $1::bigint`,
    [course.id, publish, metadata]
  );
  return updated.rows[0];
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

function trainingDatePlus(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

const operatorTrainingScenarioBlueprints = {
  cliente_standard: {
    title: "Cliente standard — atto semplice",
    description: "Cliente demo completo, documento valido, bonifico e rischio basso.",
    difficulty: "base",
    duration: "12 min",
    objective: "Esercitarsi su una pratica lineare senza errori bloccanti.",
    aurumTip: "Scenario semplice: controlla comunque documento, contabile e firme prima di completare.",
    demoData: {
      name: "Mario Demo",
      surname: "Rossi Training",
      fiscalCode: "RSSMRA80A01H501U",
      birthDate: "1980-01-01",
      birthPlace: "Roma",
      birthProvince: "RM",
      address: "Via Formazione 1",
      residenceProvince: "VA",
      phone: "3330000000",
      documentType: "Carta identità demo",
      documentNumber: "DEMO123456",
      documentExpiry: trainingDatePlus(365),
      paymentMethod: "Bonifico",
      amount: 320,
      receiptUploaded: true,
      preciousDescription: "Anello demo",
      metal: "Oro",
      title: "18kt",
      weight: 5.2,
      signaturesComplete: true,
      qualityCheckDone: false,
      riskAcknowledged: false,
      authorizationRequested: false,
      trustPackDemoPrepared: false
    }
  },
  documento_scaduto: {
    title: "Documento scaduto",
    description: "Documento demo con scadenza passata: l’operatore deve correggerlo prima di completare.",
    difficulty: "intermedio",
    duration: "10 min",
    objective: "Riconoscere un documento scaduto e bloccare o correggere la pratica.",
    aurumTip: "Il rischio nascosto è nella scadenza documento: non completare finché non è valida.",
    demoData: { documentExpiry: trainingDatePlus(-45), paymentMethod: "Bonifico", amount: 280, receiptUploaded: true, signaturesComplete: true }
  },
  contabile_mancante: {
    title: "Contabile mancante",
    description: "Pagamento bonifico senza contabile: il controllo qualità deve bloccare finché non viene caricata.",
    difficulty: "intermedio",
    duration: "10 min",
    objective: "Gestire correttamente la prova di pagamento tracciabile.",
    aurumTip: "Bonifico senza contabile non è completabile: carica una contabile demo prima di chiudere.",
    demoData: { paymentMethod: "Bonifico", amount: 450, receiptUploaded: false, signaturesComplete: true }
  },
  limite_contanti: {
    title: "Limite contanti",
    description: "Pagamento contanti vicino o sopra soglia con warning Aurum Shield demo.",
    difficulty: "avanzato",
    duration: "15 min",
    objective: "Riconoscere limiti contanti e warning compliance.",
    aurumTip: "Controlla il limite contanti configurato: se sei vicino o sopra soglia serve attenzione superiore.",
    demoData: { paymentMethod: "Contanti", amount: 520, receiptUploaded: false, signaturesComplete: true, riskAcknowledged: false }
  },
  alto_rischio: {
    title: "Pratica ad alto rischio",
    description: "Cliente demo con operazioni ravvicinate simulate e richiesta autorizzazione formativa.",
    difficulty: "avanzato",
    duration: "18 min",
    objective: "Gestire Aurum Shield alto rischio e autorizzazione simulata.",
    aurumTip: "Questo scenario richiede autorizzazione simulata: non trattarlo come una pratica normale.",
    demoData: { paymentMethod: "Contanti", amount: 490, receiptUploaded: false, signaturesComplete: true, riskAcknowledged: false, authorizationRequested: false }
  },
  firme_mancanti: {
    title: "Firme mancanti",
    description: "Atto quasi completo con firme cliente mancanti.",
    difficulty: "base",
    duration: "8 min",
    objective: "Controllare tutte le firme prima del completamento.",
    aurumTip: "Le firme sono il punto centrale di questo caso: completa firma vendita, dichiarazioni e privacy.",
    demoData: { paymentMethod: "Bonifico", amount: 260, receiptUploaded: true, signaturesComplete: false }
  },
  preziosi_incompleti: {
    title: "Preziosi incompleti",
    description: "Oggetto prezioso demo senza peso o caratura.",
    difficulty: "intermedio",
    duration: "10 min",
    objective: "Completare descrizione, metallo, titolo e peso degli oggetti.",
    aurumTip: "Un prezioso senza peso o titolo non alimenta correttamente la pratica, nemmeno in training.",
    demoData: { paymentMethod: "Bonifico", amount: 350, receiptUploaded: true, title: "", weight: 0, signaturesComplete: true }
  },
  training_completo: {
    title: "Training completo",
    description: "Percorso end-to-end con cliente, documenti, preziosi, pagamento, firme, qualità e Trust Pack demo.",
    difficulty: "master",
    duration: "25 min",
    objective: "Simulare una pratica completa senza effetti reali.",
    aurumTip: "Completa tutto e prepara solo il Trust Pack demo: nessun PDF o invio reale viene creato.",
    demoData: { paymentMethod: "Bonifico", amount: 680, receiptUploaded: false, signaturesComplete: false, trustPackDemoPrepared: false }
  }
};

function operatorTrainingBaseDemoData() {
  return {
    trainingMode: true,
    practiceNumber: "TRAINING-DEMO-NON-REALE",
    store: "Negozio Training",
    name: "Mario Demo",
    surname: "Rossi Training",
    fiscalCode: "RSSMRA80A01H501U",
    birthDate: "1980-01-01",
    birthPlace: "Roma",
    birthProvince: "RM",
    address: "Via Formazione 1",
    residenceProvince: "VA",
    phone: "3330000000",
    documentType: "Carta identità demo",
    documentNumber: "DEMO123456",
    documentExpiry: trainingDatePlus(365),
    paymentMethod: "Bonifico",
    amount: 300,
    receiptUploaded: true,
    preciousDescription: "Bracciale demo",
    metal: "Oro",
    title: "18kt",
    weight: 6,
    signaturesComplete: true,
    qualityCheckDone: false,
    riskAcknowledged: false,
    authorizationRequested: false,
    trustPackDemoPrepared: false
  };
}

function operatorTrainingScenario(id = "") {
  const scenario = operatorTrainingScenarioBlueprints[id] || operatorTrainingScenarioBlueprints.cliente_standard;
  return {
    id: Object.keys(operatorTrainingScenarioBlueprints).includes(id) ? id : "cliente_standard",
    ...scenario,
    demoData: { ...operatorTrainingBaseDemoData(), ...(scenario.demoData || {}) }
  };
}

function publicTrainingSession(row = {}) {
  return {
    id: row.id,
    user_id: row.user_id,
    store_id: row.store_id || null,
    scenario_id: row.scenario_id,
    scenario_title: row.scenario_title,
    status: row.status || "started",
    score: Number(row.score || 0),
    max_score: Number(row.max_score || 100),
    passed: Boolean(row.passed),
    started_at: row.started_at || null,
    completed_at: row.completed_at || null,
    duration_seconds: Number(row.duration_seconds || 0),
    feedback: row.feedback || {},
    mistakes: row.mistakes || [],
    completed_steps: row.completed_steps || [],
    metadata: row.metadata || {},
    user_name: [row.user_nome, row.user_cognome].filter(Boolean).join(" ") || row.username || "",
    store_name: row.store_name || row.negozio || ""
  };
}

async function listOperatorTrainingScenarios() {
  const result = await pool.query(
    "SELECT * FROM training_scenarios WHERE active = TRUE ORDER BY CASE difficulty WHEN 'base' THEN 1 WHEN 'intermedio' THEN 2 WHEN 'avanzato' THEN 3 WHEN 'master' THEN 4 ELSE 5 END, title ASC"
  );
  if (result.rowCount) {
    return result.rows.map((row) => {
      const blueprint = operatorTrainingScenario(row.id);
      return {
        id: row.id,
        title: row.title,
        description: row.description || blueprint.description,
        difficulty: row.difficulty || blueprint.difficulty,
        expected_steps: row.expected_steps || [],
        duration: blueprint.duration,
        objective: blueprint.objective,
        aurum_tip: blueprint.aurumTip
      };
    });
  }
  return Object.entries(operatorTrainingScenarioBlueprints).map(([id, scenario]) => ({
    id,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    expected_steps: [],
    duration: scenario.duration,
    objective: scenario.objective,
    aurum_tip: scenario.aurumTip
  }));
}

async function startOperatorTrainingSession(input = {}, user = {}, req = null) {
  const scenario = operatorTrainingScenario(input.scenario_id || input.scenarioId);
  const store = await storeForUser(user).catch(() => null);
  const result = await pool.query(
    `INSERT INTO training_sessions (
      user_id, store_id, scenario_id, scenario_title, status, metadata
    ) VALUES (
      $1::bigint,$2::bigint,$3::text,$4::text,'started',$5::jsonb
    )
    RETURNING *`,
    [
      user.id,
      store?.id || null,
      scenario.id,
      scenario.title,
      sanitizeForPostgres({
        training_mode: true,
        demo_only: true,
        no_real_sale_deed: true,
        no_crm_update: true,
        no_stock_update: true,
        no_real_trust_pack: true,
        scenario_objective: scenario.objective,
        aurum_tip: scenario.aurumTip,
        draft_data: scenario.demoData
      })
    ]
  );
  void writeAuditLog({
    req,
    user,
    action: "training_started",
    entityType: "training_session",
    entityId: result.rows[0].id,
    entityLabel: scenario.title,
    metadata: { scenario_id: scenario.id, store_id: store?.id || null }
  });
  return { training_session: publicTrainingSession(result.rows[0]), demo_data: scenario.demoData };
}

function addTrainingMistake(mistakes, type, message, severity, points) {
  mistakes.push({ type, message, severity, points });
  return Number(points || 0);
}

function evaluateTrainingSession(session = {}, demoAttoData = {}) {
  const data = { ...(session.metadata?.draft_data || {}), ...(demoAttoData || {}) };
  const mistakes = [];
  const strengths = [];
  const improvements = [];
  let penalty = 0;
  let bonus = 0;
  const missingClient = ["name", "surname", "fiscalCode", "birthDate", "birthPlace", "address"].filter((key) => !String(data[key] || "").trim());
  if (missingClient.length) {
    penalty += addTrainingMistake(mistakes, "missing_client_data", "Dati cliente demo incompleti.", "medium", 10);
    improvements.push("Completa sempre anagrafica, nascita e residenza prima di procedere.");
  } else {
    strengths.push("Scheda cliente demo completa.");
  }
  if (!isValidItalianFiscalCode(data.fiscalCode || "")) {
    penalty += addTrainingMistake(mistakes, "invalid_fiscal_code", "Codice fiscale demo mancante o non valido.", "medium", 10);
  }
  const expiry = data.documentExpiry ? new Date(data.documentExpiry) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) {
    penalty += addTrainingMistake(mistakes, "missing_document_expiry", "Scadenza documento non inserita.", "high", 15);
  } else if (expiry < new Date(new Date().toISOString().slice(0, 10))) {
    penalty += addTrainingMistake(mistakes, "expired_document_not_fixed", "Documento scaduto non corretto prima del completamento.", "high", 25);
    improvements.push("Blocca la pratica o aggiorna il documento quando la scadenza è passata.");
  } else {
    strengths.push("Documento demo valido.");
  }
  const paymentMethod = String(data.paymentMethod || "").toLowerCase();
  const amount = numberFrom(data.amount);
  if (!paymentMethod || amount <= 0) {
    penalty += addTrainingMistake(mistakes, "invalid_payment", "Pagamento demo mancante o importo non valido.", "medium", 15);
  }
  if (paymentMethod.includes("bonifico") && !data.receiptUploaded) {
    penalty += addTrainingMistake(mistakes, "missing_receipt", "Hai dimenticato la contabile del bonifico.", "medium", 15);
    improvements.push("Quando il pagamento è bonifico, carica sempre la contabile prima di completare.");
  }
  if (paymentMethod.includes("contanti") && amount >= CASH_PAYMENT_LIMIT && !data.riskAcknowledged && !data.authorizationRequested) {
    penalty += addTrainingMistake(mistakes, "cash_limit_ignored", "Limite contanti o warning compliance non gestito.", "high", 20);
    improvements.push("Davanti a un warning contanti, riconosci il rischio o richiedi verifica superiore.");
  }
  if (!String(data.preciousDescription || "").trim() || !String(data.metal || "").trim() || !String(data.title || "").trim() || numberFrom(data.weight) <= 0) {
    penalty += addTrainingMistake(mistakes, "incomplete_precious_item", "Oggetto prezioso demo incompleto: descrizione, metallo, titolo o peso mancanti.", "medium", 15);
  } else {
    strengths.push("Oggetto prezioso demo completo.");
  }
  if (!data.signaturesComplete) {
    penalty += addTrainingMistake(mistakes, "missing_signature", "Firme demo mancanti.", "high", 20);
  } else {
    strengths.push("Firme demo complete.");
  }
  if (["alto_rischio", "limite_contanti"].includes(session.scenario_id) && !data.riskAcknowledged) {
    penalty += addTrainingMistake(mistakes, "aurum_risk_ignored", "Aurum Shield demo non è stato considerato.", "high", 20);
  }
  if (session.scenario_id === "alto_rischio" && !data.authorizationRequested) {
    penalty += addTrainingMistake(mistakes, "missing_training_approval", "Richiesta autorizzazione simulata non inviata per pratica ad alto rischio.", "high", 20);
  }
  if (data.qualityCheckDone) {
    bonus += 5;
    strengths.push("Controllo qualità demo eseguito correttamente.");
  } else {
    improvements.push("Esegui sempre il controllo qualità prima del completamento.");
  }
  if (!mistakes.some((mistake) => mistake.severity === "high")) bonus += 5;
  if (data.aurumHelpUsed) bonus += 5;
  if (session.scenario_id === "training_completo" && data.trustPackDemoPrepared) {
    bonus += 3;
    strengths.push("Trust Pack demo preparato senza generare documenti reali.");
  }
  const score = Math.max(0, Math.min(100, 100 - penalty + bonus));
  const passed = score >= 75;
  return {
    score,
    passed,
    mistakes,
    completed_steps: [
      data.qualityCheckDone ? "controllo_qualita_demo" : null,
      data.riskAcknowledged ? "aurum_shield_demo" : null,
      data.authorizationRequested ? "autorizzazione_simulata" : null,
      data.trustPackDemoPrepared ? "trust_pack_demo" : null
    ].filter(Boolean),
    feedback: {
      summary: passed
        ? `Training superato con ${score}/100.`
        : `Training non superato: punteggio ${score}/100. Ripeti lo scenario dopo le correzioni.`,
      strengths,
      improvements: improvements.length ? improvements : ["Mantieni lo stesso livello di attenzione anche nelle pratiche reali."],
      aurum: passed
        ? `Training completato. Hai ottenuto ${score}/100: buona gestione della pratica demo.`
        : `Training completato con ${score}/100. Rivedi gli errori indicati prima di riprovare.`
    },
    sanitized_demo_data: sanitizeForPostgres({
      training_mode: true,
      scenario_id: session.scenario_id,
      fields_checked: Object.keys(data).filter((key) => !/fiscal|documentNumber|phone/i.test(key)),
      demo_only: true
    })
  };
}

async function trainingSessionById(id, user = {}) {
  const result = await pool.query(
    `SELECT ts.*, u.nome AS user_nome, u.cognome AS user_cognome, u.username, u.negozio, n.nome AS store_name
     FROM training_sessions ts
     LEFT JOIN utenti u ON u.id = ts.user_id
     LEFT JOIN negozi n ON n.id = ts.store_id
     WHERE ts.id::text = $1::text
     LIMIT 1`,
    [String(id || "")]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (!(await canViewAcademyUser(row.user_id, user))) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  return row;
}

async function saveOperatorTrainingProgress(id, input = {}, user = {}) {
  const row = await trainingSessionById(id, user);
  if (!row) return null;
  if (String(row.user_id) !== String(user.id)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const metadata = {
    ...(row.metadata || {}),
    draft_data: sanitizeForPostgres(input.demo_data || input.demoData || {}),
    last_progress_at: new Date().toISOString(),
    demo_only: true,
    no_real_sale_deed: true
  };
  const result = await pool.query(
    `UPDATE training_sessions
     SET status = 'in_progress',
         completed_steps = $2::jsonb,
         metadata = $3::jsonb
     WHERE id = $1::uuid
     RETURNING *`,
    [row.id, sanitizeForPostgres(input.completed_steps || input.completedSteps || []), sanitizeForPostgres(metadata)]
  );
  return publicTrainingSession(result.rows[0]);
}

async function completeOperatorTrainingSession(id, input = {}, user = {}, req = null) {
  const row = await trainingSessionById(id, user);
  if (!row) return null;
  if (String(row.user_id) !== String(user.id)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const evaluation = evaluateTrainingSession(row, input.demo_data || input.demoData || {});
  const completedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - new Date(row.started_at).getTime()) / 1000));
  const result = await pool.query(
    `UPDATE training_sessions
     SET status = $2::text,
         score = $3::integer,
         passed = $4::boolean,
         completed_at = NOW(),
         duration_seconds = $5::integer,
         feedback = $6::jsonb,
         mistakes = $7::jsonb,
         completed_steps = $8::jsonb,
         metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb
     WHERE id = $1::uuid
     RETURNING *`,
    [
      row.id,
      evaluation.passed ? "completed" : "failed",
      evaluation.score,
      evaluation.passed,
      durationSeconds,
      sanitizeForPostgres(evaluation.feedback),
      sanitizeForPostgres(evaluation.mistakes),
      sanitizeForPostgres(evaluation.completed_steps),
      sanitizeForPostgres({ evaluation: evaluation.sanitized_demo_data, academy_practical_training: true })
    ]
  );
  await pool.query(
    `INSERT INTO training_results (user_id, course_id, score, completed, completed_at, payload)
     VALUES ($1::bigint,NULL,$2::numeric,$3::boolean,NOW(),$4::jsonb)`,
    [
      user.id,
      evaluation.score,
      evaluation.passed,
      sanitizeForPostgres({
        operator_training_session_id: row.id,
        scenario_id: row.scenario_id,
        scenario_title: row.scenario_title,
        academy_practical_training: true,
        demo_only: true
      })
    ]
  ).catch(() => null);
  void writeAuditLog({
    req,
    user,
    action: "training_completed",
    entityType: "training_session",
    entityId: row.id,
    entityLabel: row.scenario_title,
    metadata: { scenario_id: row.scenario_id, score: evaluation.score, passed: evaluation.passed }
  });
  void writeAuditLog({
    req,
    user,
    action: evaluation.passed ? "training_passed" : "training_failed",
    entityType: "training_session",
    entityId: row.id,
    entityLabel: row.scenario_title,
    metadata: { scenario_id: row.scenario_id, score: evaluation.score, passed: evaluation.passed }
  });
  void createNotification({
    userId: user.id,
    title: evaluation.passed ? "Training superato" : "Training da ripetere",
    message: `${row.scenario_title}: ${evaluation.score}/100.`,
    type: evaluation.passed ? "training_passed" : "training_failed",
    severity: evaluation.passed ? "success" : "warning",
    entityType: "training_session",
    entityId: row.id,
    actionUrl: "#training",
    createdBy: user.id,
    actor: user,
    req,
    metadata: { scenario_id: row.scenario_id, score: evaluation.score, passed: evaluation.passed }
  });
  if (!evaluation.passed && row.store_id) {
    void createNotification({
      targetRole: "responsabile",
      storeId: row.store_id,
      title: "Training operatore non superato",
      message: `${auditUserName(user)} ha completato ${row.scenario_title} con ${evaluation.score}/100.`,
      type: "training_failed",
      severity: "warning",
      entityType: "training_session",
      entityId: row.id,
      actionUrl: "#training",
      createdBy: user.id,
      actor: user,
      req,
      metadata: { scenario_id: row.scenario_id, score: evaluation.score, passed: false }
    });
  }
  return publicTrainingSession({ ...result.rows[0], user_nome: user.nome, user_cognome: user.cognome, username: user.username });
}

async function listOperatorTrainingResults(user = {}, query = {}) {
  const values = [];
  const where = [];
  const role = normalizeRole(user.ruolo);
  if (query.mine === true || query.mine === "true" || !["founder", "supervisore", "responsabile"].includes(role)) {
    values.push(user.id);
    where.push(`ts.user_id = $${values.length}::bigint`);
  } else if (role === "responsabile") {
    const store = await storeForUser(user);
    if (!store) return [];
    values.push(store.id);
    where.push(`ts.store_id = $${values.length}::bigint`);
  }
  const result = await pool.query(
    `SELECT ts.*, u.nome AS user_nome, u.cognome AS user_cognome, u.username, u.negozio, n.nome AS store_name
     FROM training_sessions ts
     LEFT JOIN utenti u ON u.id = ts.user_id
     LEFT JOIN negozi n ON n.id = ts.store_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ts.started_at DESC
     LIMIT 100`,
    values
  );
  return result.rows.map(publicTrainingSession);
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
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(a.store, n.nome)), NULL) AS negozi_visitati,
            ROUND(COALESCE(AVG(s.score), 0))::int AS aurum_shield_average_score,
            MAX(s.score) AS aurum_shield_max_score
     FROM clienti c
     LEFT JOIN ${actsTable} a ON UPPER(a.codice_fiscale) = UPPER(c.codice_fiscale)
       AND a.deleted_at IS NULL
       AND COALESCE(a.status, '') NOT ILIKE 'deleted'
     LEFT JOIN aurum_shield_scores s ON s.sale_deed_id = a.id
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
      prossima_azione: row.prossima_azione || "",
      aurum_shield_average_score: Number(row.aurum_shield_average_score || 0),
      aurum_shield_max_score: Number(row.aurum_shield_max_score || 0)
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
  const shield = await getAurumShieldForClient(id, user).catch(() => ({
    average_score: 0,
    latest_score: null,
    open_alerts: [],
    history: []
  }));
  const trustPacks = await listCustomerTrustPacksForClient(id, user).catch(() => []);
  return {
    client: publicClient(client),
    acts: acts.rows.map((row) => rowToAct(row, { full: false })),
    notes: notes.rows,
    aurum_shield: shield,
    trust_packs: trustPacks
  };
}

async function addClientNote(id, input = {}, user = {}, req = null) {
  const result = await pool.query(
    `INSERT INTO client_notes (cliente_id, user_id, note)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [id, user.id, input.note || ""]
  );
  void writeAuditLog({
    req,
    user,
    action: "add_crm_note",
    entityType: "cliente",
    entityId: id,
    entityLabel: `Cliente ${id}`,
    afterData: { note: input.note || "" },
    metadata: { client_id: id }
  });
  return result.rows[0];
}

async function updateCrmClient(id, input = {}, user = {}, req = null) {
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
  const updated = publicClient(result.rows[0]);
  void writeAuditLog({
    req,
    user,
    action: "update_crm_client",
    entityType: "cliente",
    entityId: id,
    entityLabel: [updated.name, updated.surname].filter(Boolean).join(" ") || `Cliente ${id}`,
    beforeData: detail.client,
    afterData: updated,
    metadata: { client_id: id, changed_fields: auditChangedFields(detail.client || {}, updated || {}) }
  });
  if ((detail.client?.iban || "") !== (updated.iban || "") || (detail.client?.accountHolder || "") !== (updated.accountHolder || "")) {
    void writeAuditLog({
      req,
      user,
      action: "update_client_bank_data",
      entityType: "cliente",
      entityId: id,
      entityLabel: [updated.name, updated.surname].filter(Boolean).join(" ") || `Cliente ${id}`,
      beforeData: { iban: detail.client?.iban || "", accountHolder: detail.client?.accountHolder || "" },
      afterData: { iban: updated.iban || "", accountHolder: updated.accountHolder || "" },
      metadata: { client_id: id, critical: true }
    });
  }
  return updated;
}

async function archiveCrmClient(id, user = {}, req = null) {
  const detail = await crmClientDetail(id, user);
  if (!detail) return false;
  const result = await pool.query(
    "UPDATE clienti SET archiviato = TRUE, updated_at = NOW() WHERE id = $1::bigint RETURNING id",
    [id]
  );
  if (result.rowCount) {
    void writeAuditLog({
      req,
      user,
      action: "delete_crm_client",
      entityType: "cliente",
      entityId: id,
      entityLabel: [detail.client?.name, detail.client?.surname].filter(Boolean).join(" ") || `Cliente ${id}`,
      beforeData: detail.client,
      afterData: { archiviato: true },
      metadata: { client_id: id, critical: true }
    });
  }
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

async function saveAct(input, user, req = null) {
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
  if (existing) return updateAct(existing.id, protectedInput, user, req);
  const act = await enrichActStore(normalizeAct(protectedInput, existing), user);
  const nowIso = new Date().toISOString();
  const statusCode = normalizeWorkflowStatus(act.status);
  const suspension = statusCode === "suspended" ? suspensionDataFromAct(act) : { reason: "", reasons: [] };
  if (statusCode === "suspended") {
    act.payload = {
      ...(act.payload || {}),
      suspendedReason: suspension.reason,
      suspendedReasons: suspension.reasons,
      suspendedAt: nowIso,
      suspendedBy: user?.id || null
    };
  }
  const approvalCheck = ["completed", "archived_completed"].includes(statusCode)
    ? await assertApprovalAllowsFinalSave({ saleDeedId: null, draftData: { ...act.payload, status: statusCode }, user, req })
    : { approved: false };
  const amlCheck = await enforceCashAntiMoneyLaundering(act, user, existing, { allowApproved: Boolean(approvalCheck.approved) });
  if (["completed", "archived_completed"].includes(statusCode)) {
    await assertQualityAllowsFinalSave({ draft_data: { ...act.payload, status: statusCode } }, user, { allowApproved: Boolean(approvalCheck.approved) });
  }
  const completedAt = ["completed", "archived_completed"].includes(statusCode) ? nowIso : null;
  const archivedAt = ["archived_incomplete", "archived_completed"].includes(statusCode) ? nowIso : null;
  const suspendedAt = statusCode === "suspended" ? nowIso : null;
  const suspendedBy = statusCode === "suspended" ? user?.id || null : null;
  const result = await pool.query(
    `INSERT INTO ${actsTable} (
      cliente_nome, cliente_cognome, codice_fiscale, telefono,
      peso_oro, quotazione, totale, data_atto,
      practice_number, store, store_code, act_year, act_number,
      payment_method, status, iban, payload,
      negozio_id, codice_negozio, numero_atto_negozio, operatore_id,
      completed_at, archived_at,
      suspended_reason, suspended_reasons, suspended_at, suspended_by, resumed_at, resumed_by
    ) VALUES (
      $1::text,$2::text,$3::text,$4::text,
      $5::numeric,$6::numeric,$7::numeric,$8::date,
      $9::text,$10::text,$11::text,$12::integer,$13::integer,
      $14::text,$15::text,$16::text,$17::jsonb,
      $18::bigint,$19::text,$20::integer,$21::bigint,
      $22::timestamptz,$23::timestamptz,
      $24::text,$25::jsonb,$26::timestamptz,$27::bigint,$28::timestamptz,$29::bigint
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
      archivedAt,
      nullIfEmpty(suspension.reason),
      sanitizeForPostgres(suspension.reasons),
      suspendedAt,
      suspendedBy,
      null,
      null
    ]
  );
  void logUserActivity({
    userId: user?.id,
    actorId: user?.id,
    activityType: ["completed", "archived_completed"].includes(statusCode)
      ? "complete_act"
      : statusCode === "archived_incomplete"
        ? "archive_act"
        : statusCode === "suspended"
          ? "sale_deed_suspended"
          : "create_act",
    entityType: "atto",
    entityId: result.rows[0].id,
    description: `Atto ${act.practiceNumber} salvato`,
    metadata: { practiceNumber: act.practiceNumber, status: statusCode, store: act.store }
  });
  await saveDocumentIntegrityLog(act, result.rows[0].id, user);
  if (!isDraftLikeStatus(act.status)) await saveAmlAlert({ check: amlCheck, act, user, attoId: result.rows[0].id });
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  let finalRow = result.rows[0];
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable}
       SET cliente_id = $2::bigint,
           iban = COALESCE(NULLIF($3::text, ''), iban)
       WHERE id = $1::bigint
       RETURNING *`,
      [result.rows[0].id, client.id, client.iban || act.iban || ""]
    );
    finalRow = withClient.rows[0] || finalRow;
  }
  const finalAct = rowToAct(finalRow, { full: false });
  const shield = await persistAurumShieldForAct(finalRow, user).catch((error) => {
    console.error("AURUM SHIELD SAVE ERROR", error);
    return null;
  });
  const quality = ["completed", "archived_completed"].includes(normalizeWorkflowStatus(finalRow.status))
    ? await persistQualityCheckForAct(finalRow, user).catch((error) => {
      console.error("QUALITY CHECK SAVE ERROR", error);
      return null;
    })
    : null;
  void writeAuditLog({
    req,
    user,
    action: ["completed", "archived_completed"].includes(statusCode)
      ? "complete_act"
      : statusCode === "archived_incomplete"
        ? "archive_act"
        : statusCode === "suspended"
          ? "sale_deed_suspended"
        : isDraftLikeStatus(statusCode)
          ? "save_draft"
          : "create_act",
    entityType: "atto",
    entityId: finalRow.id,
    entityLabel: finalAct.practiceNumber || finalRow.practice_number || "",
    afterData: finalAct,
    metadata: {
      description: `Atto ${finalAct.practiceNumber || finalRow.id} salvato`,
      practiceNumber: finalAct.practiceNumber,
      status: statusCode,
      store: finalAct.store,
      store_id: finalRow.negozio_id || null,
      store_name: finalRow.store || null
    }
  });
  if (statusCode === "suspended") {
    await writeSuspendedPracticeLog({
      saleDeedId: finalRow.id,
      user,
      action: "suspended",
      reason: suspension.reason,
      reasons: suspension.reasons,
      metadata: {
        practice_number: finalAct.practiceNumber || "",
        store_id: finalRow.negozio_id || null
      }
    });
    notifySuspendedPractice(finalRow, user, "created", suspension.reasons, req);
  }
  if (approvalCheck.approved) {
    void writeAuditLog({
      req,
      user,
      action: "sale_deed_completed_after_approval",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || finalRow.practice_number || "",
      afterData: finalAct,
      metadata: {
        approval_request_id: approvalCheck.request?.id || null,
        status: statusCode,
        store_id: finalRow.negozio_id || null,
        critical: true
      }
    });
  }
  if (["completed", "archived_completed"].includes(statusCode) && Number(shield?.score || 0) > 60) {
    void createNotification({
      targetRole: "responsabile",
      storeId: finalRow.negozio_id || null,
      title: "Pratica completata con rischio elevato",
      message: `La pratica ${finalAct.practiceNumber || finalRow.id} è stata completata dopo verifica rischio.`,
      type: "deed_completed",
      severity: "warning",
      entityType: "atto",
      entityId: finalRow.id,
      actionUrl: "#archive",
      metadata: { practice_number: finalAct.practiceNumber || "", risk_score: shield?.score || 0, risk_level: shield?.risk_level || "" },
      createdBy: user?.id || null,
      actor: user,
      req
    });
  }
  return { ...finalAct, aurumShield: shield || finalAct.aurumShield, qualityCheck: quality || finalAct.qualityCheck };
}

async function updateAct(identifier, input, user, req = null) {
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
  const beforeAct = rowToAct(existing, { full: false });
  const act = await enrichActStore(normalizeAct(enforceActStore(input, user), existing), user);
  const normalizedStatus = normalizeWorkflowStatus(act.status);
  const suspension = normalizedStatus === "suspended" ? suspensionDataFromAct(act) : { reason: "", reasons: [] };
  if (normalizedStatus === "suspended") {
    act.payload = {
      ...(act.payload || {}),
      suspendedReason: suspension.reason,
      suspendedReasons: suspension.reasons,
      suspendedAt: beforeAct.suspendedAt || new Date().toISOString(),
      suspendedBy: beforeAct.suspendedBy || user?.id || null
    };
  }
  const approvalCheck = ["completed", "archived_completed"].includes(normalizedStatus)
    ? await assertApprovalAllowsFinalSave({ saleDeedId: existing.id, draftData: { ...act.payload, status: normalizedStatus }, user, req })
    : { approved: false };
  if (["completed", "archived_completed"].includes(normalizedStatus)) {
    await assertQualityAllowsFinalSave({ sale_deed_id: existing.id, draft_data: { ...act.payload, status: normalizedStatus } }, user, { allowApproved: Boolean(approvalCheck.approved) });
  }
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
    normalizedStatus,
    user?.id || null,
    nullIfEmpty(suspension.reason),
    sanitizeForPostgres(suspension.reasons)
  ];
  await enforceCashAntiMoneyLaundering(act, user, existing, { allowApproved: Boolean(approvalCheck.approved) });
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
          WHEN $23::text IN ('completed', 'archived_completed', 'suspended', 'pending_approval') THEN NULL
          ELSE deleted_at
        END,
        abandoned_at = CASE
          WHEN $23::text = 'abandoned' THEN COALESCE(abandoned_at, NOW())
          ELSE abandoned_at
        END,
        suspended_reason = CASE
          WHEN $23::text = 'suspended' THEN $25::text
          WHEN $23::text IN ('completed', 'archived_completed') THEN NULL
          ELSE suspended_reason
        END,
        suspended_reasons = CASE
          WHEN $23::text = 'suspended' THEN $26::jsonb
          WHEN $23::text IN ('completed', 'archived_completed') THEN '[]'::jsonb
          ELSE suspended_reasons
        END,
        suspended_at = CASE
          WHEN $23::text = 'suspended' THEN COALESCE(suspended_at, NOW())
          WHEN $23::text IN ('completed', 'archived_completed') THEN NULL
          ELSE suspended_at
        END,
        suspended_by = CASE
          WHEN $23::text = 'suspended' THEN COALESCE(suspended_by, $24::bigint)
          WHEN $23::text IN ('completed', 'archived_completed') THEN NULL
          ELSE suspended_by
        END,
        resumed_at = CASE
          WHEN $23::text IN ('completed', 'archived_completed') AND suspended_at IS NOT NULL THEN COALESCE(resumed_at, NOW())
          WHEN $23::text <> 'suspended' AND suspended_at IS NOT NULL AND resumed_at IS NULL THEN NOW()
          ELSE resumed_at
        END,
        resumed_by = CASE
          WHEN $23::text IN ('completed', 'archived_completed') AND suspended_at IS NOT NULL THEN COALESCE(resumed_by, $24::bigint)
          WHEN $23::text <> 'suspended' AND suspended_at IS NOT NULL AND resumed_by IS NULL THEN $24::bigint
          ELSE resumed_by
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
        : normalizedStatus === "suspended"
          ? "sale_deed_suspended"
          : "update_act",
    entityType: "atto",
    entityId: result.rows[0].id,
    description: `Atto ${act.practiceNumber} aggiornato`,
    metadata: { practiceNumber: act.practiceNumber, status: normalizedStatus, store: act.store }
  });
  await saveDocumentIntegrityLog(act, result.rows[0].id, user);
  const client = await upsertClientFromAct({ ...act, payload: act.payload });
  let finalRow = result.rows[0];
  if (client?.id) {
    const withClient = await pool.query(
      `UPDATE ${actsTable}
       SET cliente_id = $2::bigint,
           iban = COALESCE(NULLIF($3::text, ''), iban)
       WHERE id = $1::bigint
       RETURNING *`,
      [result.rows[0].id, client.id, client.iban || act.iban || ""]
    );
    finalRow = withClient.rows[0] || finalRow;
  }
  const finalAct = rowToAct(finalRow, { full: false });
  const shield = await persistAurumShieldForAct(finalRow, user).catch((error) => {
    console.error("AURUM SHIELD UPDATE ERROR", error);
    return null;
  });
  const quality = ["completed", "archived_completed"].includes(normalizeWorkflowStatus(finalRow.status))
    ? await persistQualityCheckForAct(finalRow, user).catch((error) => {
      console.error("QUALITY CHECK UPDATE ERROR", error);
      return null;
    })
    : null;
  const changedFields = auditChangedFields(beforeAct, finalAct);
  const action = ["completed", "archived_completed"].includes(normalizedStatus)
    ? "complete_act"
    : normalizedStatus === "archived_incomplete"
      ? "archive_act"
      : normalizedStatus === "suspended"
        ? "sale_deed_suspended"
      : "update_act";
  void writeAuditLog({
    req,
    user,
    action,
    entityType: "atto",
    entityId: finalRow.id,
    entityLabel: finalAct.practiceNumber || finalRow.practice_number || "",
    beforeData: beforeAct,
    afterData: finalAct,
    metadata: {
      description: `Atto ${finalAct.practiceNumber || finalRow.id} aggiornato`,
      practiceNumber: finalAct.practiceNumber,
      status: normalizedStatus,
      store: finalAct.store,
      store_id: finalRow.negozio_id || null,
      store_name: finalRow.store || null,
      changed_fields: changedFields
    }
  });
  if (approvalCheck.approved) {
    void writeAuditLog({
      req,
      user,
      action: "sale_deed_completed_after_approval",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || finalRow.practice_number || "",
      afterData: finalAct,
      metadata: {
        approval_request_id: approvalCheck.request?.id || null,
        status: normalizedStatus,
        store_id: finalRow.negozio_id || null,
        critical: true
      }
    });
  }
  if (normalizedStatus === "suspended") {
    await writeSuspendedPracticeLog({
      saleDeedId: finalRow.id,
      user,
      action: normalizeWorkflowStatus(existing.status) === "suspended" ? "updated" : "suspended",
      reason: suspension.reason,
      reasons: suspension.reasons,
      metadata: {
        practice_number: finalAct.practiceNumber || "",
        store_id: finalRow.negozio_id || null
      }
    });
    notifySuspendedPractice(finalRow, user, "created", suspension.reasons, req);
  }
  if (normalizeWorkflowStatus(existing.status) === "suspended" && ["completed", "archived_completed"].includes(normalizedStatus)) {
    await writeSuspendedPracticeLog({
      saleDeedId: finalRow.id,
      user,
      action: "completed_after_resolution",
      reason: "Pratica completata dopo sospensione.",
      reasons: [],
      metadata: { practice_number: finalAct.practiceNumber || "", status: normalizedStatus }
    });
    void writeAuditLog({
      req,
      user,
      action: "sale_deed_completed_after_suspension",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || "",
      beforeData: beforeAct,
      afterData: finalAct,
      metadata: { status: normalizedStatus, store_id: finalRow.negozio_id || null, critical: true }
    });
    notifySuspendedPractice(finalRow, user, "resolved", [], req);
  } else if (normalizeWorkflowStatus(existing.status) === "suspended" && normalizedStatus !== "suspended") {
    await writeSuspendedPracticeLog({
      saleDeedId: finalRow.id,
      user,
      action: "resumed",
      reason: "Pratica riaperta per correzione.",
      reasons: [],
      metadata: { practice_number: finalAct.practiceNumber || "", status: normalizedStatus }
    });
    void writeAuditLog({
      req,
      user,
      action: "suspended_practice_reopened",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || "",
      beforeData: beforeAct,
      afterData: finalAct,
      metadata: { status: normalizedStatus, store_id: finalRow.negozio_id || null }
    });
  }
  if (["completed", "archived_completed"].includes(normalizedStatus) && Number(shield?.score || 0) > 60) {
    void createNotification({
      targetRole: "responsabile",
      storeId: finalRow.negozio_id || null,
      title: "Pratica completata con rischio elevato",
      message: `La pratica ${finalAct.practiceNumber || finalRow.id} è stata completata dopo verifica rischio.`,
      type: "deed_completed",
      severity: "warning",
      entityType: "atto",
      entityId: finalRow.id,
      actionUrl: "#archive",
      metadata: { practice_number: finalAct.practiceNumber || "", risk_score: shield?.score || 0, risk_level: shield?.risk_level || "" },
      createdBy: user?.id || null,
      actor: user,
      req
    });
  }
  if (["pending_approval", "approval_approved", "approval_rejected"].includes(normalizeWorkflowStatus(existing.status)) && !["completed", "archived_completed"].includes(normalizedStatus)) {
    void writeAuditLog({
      req,
      user,
      action: "sale_deed_modified_after_approval_request",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || "",
      beforeData: beforeAct,
      afterData: finalAct,
      metadata: { status: normalizedStatus, approval_status: finalAct.approvalStatus || "", store_id: finalRow.negozio_id || null }
    });
  }
  if (beforeAct.paymentMethod !== finalAct.paymentMethod || Number(beforeAct.amount || 0) !== Number(finalAct.amount || 0) || beforeAct.iban !== finalAct.iban) {
    void writeAuditLog({
      req,
      user,
      action: "modify_payment",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || "",
      beforeData: { paymentMethod: beforeAct.paymentMethod, amount: beforeAct.amount, iban: beforeAct.iban },
      afterData: { paymentMethod: finalAct.paymentMethod, amount: finalAct.amount, iban: finalAct.iban },
      metadata: { practiceNumber: finalAct.practiceNumber, store_id: finalRow.negozio_id || null, store_name: finalRow.store || null }
    });
  }
  if (["name", "surname", "fiscalCode", "phone"].some((key) => beforeAct[key] !== finalAct[key])) {
    void writeAuditLog({
      req,
      user,
      action: "modify_deed_client_data",
      entityType: "atto",
      entityId: finalRow.id,
      entityLabel: finalAct.practiceNumber || "",
      beforeData: { name: beforeAct.name, surname: beforeAct.surname, fiscalCode: beforeAct.fiscalCode, phone: beforeAct.phone },
      afterData: { name: finalAct.name, surname: finalAct.surname, fiscalCode: finalAct.fiscalCode, phone: finalAct.phone },
      metadata: { practiceNumber: finalAct.practiceNumber, store_id: finalRow.negozio_id || null, store_name: finalRow.store || null }
    });
  }
  return { ...finalAct, aurumShield: shield || finalAct.aurumShield, qualityCheck: quality || finalAct.qualityCheck };
}

async function deleteAct(identifier, user, req = null) {
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
    await pool.query(
      `UPDATE aurum_shield_alerts
       SET status = 'atto_eliminato',
           reviewed_by = $2::bigint,
           reviewed_at = NOW()
       WHERE sale_deed_id = $1::bigint
         AND status IN ('open', 'in_review', 'in verifica')`,
      [existing.id, user?.id || null]
    ).catch((error) => {
      console.error("AURUM SHIELD DELETE SYNC ERROR", error);
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
    void writeAuditLog({
      req,
      user,
      action: "delete_act",
      entityType: "atto",
      entityId: existing.id,
      entityLabel: existing.practice_number || "",
      beforeData: rowToAct(existing, { full: false }),
      afterData: { status: "deleted", deleted_by: user?.id || null },
      metadata: {
        description: `Atto ${existing.practice_number || existing.id} eliminato`,
        practiceNumber: existing.practice_number,
        store: existing.store,
        store_id: existing.negozio_id || null,
        store_name: existing.store || null,
        critical: true
      }
    });
    const notificationInput = {
      title: "Atto eliminato",
      message: `La pratica ${existing.practice_number || existing.id} è stata eliminata dai flussi operativi.`,
      type: "deed_deleted",
      severity: "danger",
      entityType: "atto",
      entityId: existing.id,
      actionUrl: "#archive",
      metadata: { practice_number: existing.practice_number || "", store_id: existing.negozio_id || null },
      createdBy: user?.id || null,
      actor: user,
      req
    };
    void createNotification({ ...notificationInput, targetRole: "founder" });
    void createNotification({ ...notificationInput, targetRole: "responsabile", storeId: existing.negozio_id || null });
  }
  return result.rowCount > 0;
}

async function createUser(input, actor, req = null) {
  const firstName = String(input.nome || input.name || "").trim();
  const surname = String(input.cognome || input.surname || "").trim();
  const role = normalizeRole(input.ruolo || input.role || "");
  const rawEmail = String(input.email || "").trim();
  const username = String(input.username || (role === "founder" ? rawEmail : "")).trim();
  const email = role === "founder" ? rawEmail : "";
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
  if (role !== "founder" && !username) {
    const error = new Error("Nome utente obbligatorio");
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
    void writeAuditLog({
      req,
      user: actor,
      action: "unauthorized_user_create_attempt",
      entityType: "utente",
      entityLabel: "Tentativo creazione utente",
      metadata: {
        attempted_role: role,
        actor_role: actorRole,
        critical: true
      }
    });
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
  const createdUser = publicUser(result.rows[0]);
  void logUserActivity({
    userId: result.rows[0].id,
    actorId: actor?.id,
    activityType: "create_user",
    entityType: "utente",
    entityId: result.rows[0].id,
    description: "Utente creato",
    metadata: { role: finalRole, store: finalStore }
  });
  void writeAuditLog({
    req,
    user: actor,
    action: "create_user",
    entityType: "utente",
    entityId: result.rows[0].id,
    entityLabel: auditUserName(createdUser),
    afterData: createdUser,
    metadata: { target_user_id: result.rows[0].id, role: finalRole, store: finalStore, store_id: store?.id || null, store_name: finalStore }
  });
  void createNotification({
    targetRole: "founder",
    title: "Utente creato",
    message: `Creato nuovo utente con ruolo ${finalRole}.`,
    type: "user_updated",
    severity: "info",
    entityType: "utente",
    entityId: result.rows[0].id,
    actionUrl: "#users",
    metadata: { target_user_id: result.rows[0].id, role: finalRole, store: finalStore },
    createdBy: actor?.id || null,
    actor,
    req
  });
  return createdUser;
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

async function updateUser(id, input, actor, req = null) {
  const target = await findUserRawById(id);
  if (!target) return null;
  const beforeUser = publicUser(target);
  const targetIsFounder = normalizeRole(target.ruolo) === "founder";
  if (!targetIsFounder) {
    delete input.email;
  }
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
    const updatedUser = publicUser(result.rows[0]);
    const changedFields = fields.map((field) => field.split(" = ")[0]).filter((field) => field !== "updated_at");
    void logUserActivity({
      userId: result.rows[0].id,
      actorId: actor?.id,
      activityType: "update_user",
      entityType: "utente",
      entityId: result.rows[0].id,
      description: "Utente aggiornato",
      metadata: { changedFields }
    });
    void writeAuditLog({
      req,
      user: actor,
      action: "update_user",
      entityType: "utente",
      entityId: result.rows[0].id,
      entityLabel: auditUserName(updatedUser),
      beforeData: beforeUser,
      afterData: updatedUser,
      metadata: { target_user_id: result.rows[0].id, changed_fields: changedFields, store_id: updatedUser.negozio_id || null, store_name: updatedUser.negozio || null }
    });
    if (normalizeRole(beforeUser.ruolo) !== normalizeRole(updatedUser.ruolo)) {
      void writeAuditLog({
        req,
        user: actor,
        action: "change_user_role",
        entityType: "utente",
        entityId: result.rows[0].id,
        entityLabel: auditUserName(updatedUser),
        beforeData: { ruolo: beforeUser.ruolo },
        afterData: { ruolo: updatedUser.ruolo },
        metadata: { target_user_id: result.rows[0].id, critical: true }
      });
      void createNotification({
        targetRole: "founder",
        title: "Ruolo utente modificato",
        message: "Un ruolo utente è stato modificato in OroActive.",
        type: "user_updated",
        severity: "warning",
        entityType: "utente",
        entityId: result.rows[0].id,
        actionUrl: "#users",
        metadata: { target_user_id: result.rows[0].id, before_role: beforeUser.ruolo, after_role: updatedUser.ruolo, critical: true },
        createdBy: actor?.id || null,
        actor,
        req
      });
    }
    if (String(beforeUser.negozio_id || beforeUser.negozio || "") !== String(updatedUser.negozio_id || updatedUser.negozio || "")) {
      void writeAuditLog({
        req,
        user: actor,
        action: "change_user_store",
        entityType: "utente",
        entityId: result.rows[0].id,
        entityLabel: auditUserName(updatedUser),
        beforeData: { negozio_id: beforeUser.negozio_id, negozio: beforeUser.negozio },
        afterData: { negozio_id: updatedUser.negozio_id, negozio: updatedUser.negozio },
        metadata: { target_user_id: result.rows[0].id }
      });
    }
    void createNotification({
      targetRole: "founder",
      title: "Utente aggiornato",
      message: "Dati utente aggiornati in OroActive.",
      type: "user_updated",
      severity: "info",
      entityType: "utente",
      entityId: result.rows[0].id,
      actionUrl: "#users",
      metadata: { target_user_id: result.rows[0].id, changed_fields: changedFields },
      createdBy: actor?.id || null,
      actor,
      req,
      audit: false
    });
  }
  return result.rowCount ? publicUser(result.rows[0]) : null;
}

async function listUsers(options = {}) {
  const where = options.includeFounder
    ? "WHERE COALESCE(attivo, TRUE) = TRUE"
    : "WHERE COALESCE(attivo, TRUE) = TRUE AND ruolo <> 'founder'";
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti ${where} ORDER BY data_creazione DESC`
  );
  return result.rows.map(publicUser);
}

async function listUsersForActor(actor) {
  const actorRole = normalizeRole(actor?.ruolo);
  if (actorRole === "founder") {
    const result = await pool.query(
      "SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti WHERE COALESCE(attivo, TRUE) = TRUE ORDER BY data_creazione DESC"
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  if (actorRole === "supervisore") {
    const result = await pool.query(
      "SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen FROM utenti WHERE COALESCE(attivo, TRUE) = TRUE AND ruolo <> 'founder' ORDER BY data_creazione DESC"
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  if (actorRole === "responsabile") {
    const result = await pool.query(
      `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen
       FROM utenti
       WHERE COALESCE(attivo, TRUE) = TRUE
         AND ruolo = ANY($1::text[])
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
       WHERE COALESCE(attivo, TRUE) = TRUE
         AND (
          id = $1::bigint
          OR (
            ruolo = ANY($2::text[])
            AND (negozio_id = $3::bigint OR negozio = $4::text)
            AND last_seen >= NOW() - INTERVAL '2 minutes'
          )
         )
       ORDER BY (id = $1::bigint) DESC, last_seen DESC NULLS LAST, data_creazione DESC`,
      [actor.id, ["commesso", "aiuto_commesso"], actor.negozio_id || null, actor.negozio || ""]
    );
    return result.rows.map((row) => publicUserForActor(row, actor));
  }
  const result = await pool.query(
    `SELECT id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen
     FROM utenti
     WHERE COALESCE(attivo, TRUE) = TRUE
       AND id = $1::bigint
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
    `SELECT al.*
     FROM audit_logs al
     WHERE al.user_id = $1::bigint
        OR (al.entity_type = 'utente' AND al.entity_id = $2::text)
        OR (al.metadata->>'target_user_id') = $2::text
     ORDER BY al.created_at DESC, al.id DESC
     LIMIT 100`,
    [id, String(id)]
  );
  return result.rows.map(publicAuditLog);
}

async function deleteUser(id, actor, req = null) {
  const actorRole = normalizeRole(actor?.ruolo);
  if (actorRole !== "founder") {
    void writeAuditLog({
      req,
      user: actor,
      action: "unauthorized_user_delete_attempt",
      entityType: "utente",
      entityId: id,
      entityLabel: "Tentativo eliminazione utente",
      metadata: { target_user_id: id, actor_role: actorRole, critical: true }
    });
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  if (String(actor.id) === String(id)) {
    const error = new Error("Non puoi eliminare il tuo stesso utente.");
    error.status = 400;
    throw error;
  }
  const target = await findUserRawById(id);
  if (!target || target.attivo === false) return false;
  if (normalizeRole(target.ruolo) === "founder") {
    const activeFounders = await pool.query(
      "SELECT COUNT(*)::int AS total FROM utenti WHERE LOWER(COALESCE(ruolo, '')) = 'founder' AND COALESCE(attivo, TRUE) = TRUE"
    );
    if (Number(activeFounders.rows[0]?.total || 0) <= 1) {
      const error = new Error("Non puoi eliminare l'unico Founder attivo.");
      error.status = 400;
      throw error;
    }
  }
  const result = await pool.query(
    `UPDATE utenti
     SET attivo = FALSE,
         updated_at = NOW()
     WHERE id = $1::bigint
     RETURNING id, nome, cognome, username, email, telefono, note, attivo, ruolo, negozio, negozio_id, face_id_credential, data_creazione, updated_at, last_seen`,
    [id]
  );
  if (result.rowCount) {
    const updatedUser = publicUser(result.rows[0]);
    void logUserActivity({
      userId: id,
      actorId: actor?.id,
      activityType: "deactivate_user",
      entityType: "utente",
      entityId: id,
      description: "Utente disattivato"
    });
    void writeAuditLog({
      req,
      user: actor,
      action: "user_deleted",
      entityType: "utente",
      entityId: id,
      entityLabel: auditUserName(target),
      beforeData: publicUser(target),
      afterData: updatedUser,
      metadata: { target_user_id: id, soft_delete: true, critical: true }
    });
    void writeAuditLog({
      req,
      user: actor,
      action: "user_deactivated",
      entityType: "utente",
      entityId: id,
      entityLabel: auditUserName(target),
      beforeData: { attivo: target.attivo !== false },
      afterData: { attivo: false },
      metadata: { target_user_id: id, soft_delete: true, critical: true }
    });
    void createNotification({
      targetRole: "founder",
      title: "Utente eliminato",
      message: "Un utente è stato eliminato dalla lista operativa OroActive.",
      type: "user_updated",
      severity: "warning",
      entityType: "utente",
      entityId: id,
      actionUrl: "#users",
      metadata: { target_user_id: id, target_role: normalizeRole(target.ruolo), soft_delete: true },
      createdBy: actor?.id || null,
      actor,
      req
    });
  }
  return result.rowCount > 0;
}

async function loginUser(identifier, password, req = null) {
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
  void writeAuditLog({
    req,
    user,
    action: "login",
    entityType: "sessione",
    entityId: user.id,
    entityLabel: auditUserName(user),
    afterData: safeUser,
    metadata: { login_method: "password" }
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

async function loginWithFaceId(identifier, credentialId, req = null) {
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
    description: "Login Face ID effettuato"
  });
  void writeAuditLog({
    req,
    user,
    action: "login",
    entityType: "sessione",
    entityId: user.id,
    entityLabel: auditUserName(user),
    afterData: safeUser,
    metadata: { login_method: "face_id" }
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
    response.json(await loginUser(request.body.username, request.body.password, request));
  } catch (error) {
    void writeAuditLog({
      req: request,
      action: "login_failed",
      entityType: "sessione",
      entityLabel: request.body?.username || "",
      metadata: { reason: error.message, status: error.status || 500 }
    });
    next(error);
  }
});

app.post("/api/login", async (request, response, next) => {
  try {
    response.json(await loginUser(request.body.username, request.body.password, request));
  } catch (error) {
    void writeAuditLog({
      req: request,
      action: "login_failed",
      entityType: "sessione",
      entityLabel: request.body?.username || "",
      metadata: { reason: error.message, status: error.status || 500 }
    });
    next(error);
  }
});

app.post("/api/auth/faceid/login", async (request, response, next) => {
  try {
    response.json(await loginWithFaceId(request.body.username, request.body.credentialId, request));
  } catch (error) {
    void writeAuditLog({
      req: request,
      action: "login_failed",
      entityType: "sessione",
      entityLabel: request.body?.username || "",
      metadata: { reason: error.message, status: error.status || 500, login_method: "face_id" }
    });
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
      void writeAuditLog({
        req: request,
        user,
        action: "logout",
        entityType: "sessione",
        entityId: user.id,
        entityLabel: auditUserName(user)
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
    if (normalizeRole(request.user?.ruolo) !== "founder") return response.status(403).json({ error: "Non autorizzato" });
    response.json(await dashboardKpis(request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/store-health", async (request, response, next) => {
  try {
    if (!canViewStoreHealth(request.user)) return response.status(403).json({ error: "Non autorizzato" });
    const stores = await listStoreHealthScores(request.query, request.user);
    const average = stores.length ? Math.round(stores.reduce((sum, row) => sum + Number(row.score || 0), 0) / stores.length) : 0;
    response.json({
      ok: true,
      date_range: storeHealthDateRange(request.query),
      average_score: average,
      stores
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/store-health/calculate", async (request, response, next) => {
  try {
    if (!canViewStoreHealth(request.user)) return response.status(403).json({ error: "Non autorizzato" });
    const stores = await listStoreHealthScores({
      period: request.body?.period,
      date_from: request.body?.date_from,
      date_to: request.body?.date_to,
      store_id: request.body?.store_id
    }, request.user, { force: true });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "store_health_score_calculated",
      entityType: "store_health",
      entityLabel: "Salute Negozio",
      afterData: { stores: stores.map((store) => ({ store_id: store.store_id, score: store.score, status: store.status })) },
      metadata: { store_count: stores.length, period: request.body?.period || "custom" }
    });
    response.json({ ok: true, message: "Store Health Score ricalcolato", stores });
  } catch (error) {
    next(error);
  }
});

app.get("/api/store-health/:storeId/history", async (request, response, next) => {
  try {
    if (!canViewStoreHealth(request.user)) return response.status(403).json({ error: "Non autorizzato" });
    response.json({ ok: true, history: await storeHealthHistory(request.params.storeId, request.user, request.query.limit || 30) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/store-health/:storeId", async (request, response, next) => {
  try {
    if (!canViewStoreHealth(request.user)) return response.status(403).json({ error: "Non autorizzato" });
    const store = await getStoreHealthDetail(request.params.storeId, request.query, request.user);
    if (!store) return response.status(404).json({ error: "Negozio non trovato" });
    response.json({ ok: true, store });
  } catch (error) {
    next(error);
  }
});

app.get("/api/founder-daily-report", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, reports: await listFounderDailyReports(request.query.limit || 30) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/founder-daily-report/:date", requireFounder, async (request, response, next) => {
  try {
    const report = await getFounderDailyReport(request.params.date);
    if (!report) return response.status(404).json({ error: "Report non generato per la data selezionata." });
    response.json({ ok: true, report });
  } catch (error) {
    next(error);
  }
});

app.post("/api/founder-daily-report/generate", requireFounder, async (request, response, next) => {
  try {
    const report = await generateFounderDailyReport(request.body?.date || new Date(), request.user, request);
    response.status(201).json({ ok: true, message: "Founder Daily Report generato", report });
  } catch (error) {
    next(error);
  }
});

app.get("/api/founder-daily-report/:date/pdf", requireFounder, async (request, response, next) => {
  try {
    const report = await getFounderDailyReport(request.params.date);
    if (!report) return response.status(404).json({ error: "Report non generato per la data selezionata." });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "founder_daily_report_downloaded",
      entityType: "founder_daily_report",
      entityId: report.id,
      entityLabel: report.report_date,
      metadata: { report_date: report.report_date, critical: false }
    });
    writeFounderDailyReportPdf(response, report);
  } catch (error) {
    next(error);
  }
});

app.post("/api/founder-daily-report/:date/send", requireFounder, async (request, response, next) => {
  try {
    const report = await getFounderDailyReport(request.params.date);
    if (!report) return response.status(404).json({ error: "Report non generato per la data selezionata." });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "founder_daily_report_sent",
      entityType: "founder_daily_report",
      entityId: report.id,
      entityLabel: report.report_date,
      metadata: { report_date: report.report_date, email_configured: false }
    });
    response.json({ ok: false, message: "Invio email non configurato." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/audit-logs", async (request, response, next) => {
  try {
    response.json(await listAuditLogs(request.query, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/audit-logs/:id", async (request, response, next) => {
  try {
    const log = await getAuditLogDetail(request.params.id, request.user);
    if (!log) return response.status(404).json({ error: "Audit log non trovato" });
    response.json({ ok: true, log });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-policy/current", async (request, response, next) => {
  try {
    const policy = await currentPrivacyPolicy();
    if (request.query.audit === "true") {
      void writeAuditLog({
        req: request,
        user: request.user,
        action: "privacy_policy_viewed",
        entityType: "privacy_policy",
        entityId: policy.version,
        entityLabel: policy.title,
        metadata: { policy_version: policy.version }
      });
    }
    response.json({ ok: true, policy, acceptance: await getPrivacyAcceptance(request.user, policy.version) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-policy/current/pdf", async (request, response, next) => {
  try {
    const policy = await currentPrivacyPolicy();
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "privacy_policy_viewed",
      entityType: "privacy_policy",
      entityId: policy.version,
      entityLabel: `${policy.title} PDF`,
      metadata: { policy_version: policy.version, format: "pdf" }
    });
    writePrivacyPolicyPdf(response, policy);
  } catch (error) {
    next(error);
  }
});

app.post("/api/privacy-policy/customer-notice/viewed", async (request, response, next) => {
  try {
    const policy = await currentPrivacyPolicy();
    const practiceNumber = String(request.body?.practice_number || request.body?.practiceNumber || "").trim();
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "customer_privacy_notice_viewed",
      entityType: "privacy_policy",
      entityId: policy.version,
      entityLabel: practiceNumber ? `Informativa cliente ${practiceNumber}` : "Informativa privacy cliente",
      metadata: { policy_version: policy.version, practice_number: practiceNumber || null }
    });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-policy/versions", async (_request, response, next) => {
  try {
    response.json({ ok: true, versions: await listPrivacyPolicyVersions() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-policy/my-acceptance", async (request, response, next) => {
  try {
    const policy = await currentPrivacyPolicy();
    response.json({ ok: true, acceptance: await getPrivacyAcceptance(request.user, policy.version), policy_version: policy.version });
  } catch (error) {
    next(error);
  }
});

app.get("/api/privacy-policy/acceptances", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, acceptances: await listPrivacyPolicyAcceptances(request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/privacy-policy/accept", async (request, response, next) => {
  try {
    response.json(await acceptPrivacyPolicy(request.body, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.get("/api/notifications", async (request, response, next) => {
  try {
    response.json(await listNotifications(request.query, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/notifications/unread-count", async (request, response, next) => {
  try {
    response.json({ ok: true, unread_count: await notificationUnreadCount(request.user) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/notifications/read-all", async (request, response, next) => {
  try {
    const updated = await markAllNotificationsRead(request.user, request);
    response.json({ ok: true, updated, unread_count: await notificationUnreadCount(request.user) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/notifications/:id/read", async (request, response, next) => {
  try {
    const notification = await markNotificationRead(request.params.id, request.user, request, Boolean(request.body?.opened));
    if (!notification) return response.status(404).json({ error: "Notifica non trovata" });
    response.json({ ok: true, notification, unread_count: await notificationUnreadCount(request.user) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/notifications/:id", async (request, response, next) => {
  try {
    const deleted = await deleteNotification(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Notifica non trovata" });
    response.json({ ok: true, unread_count: await notificationUnreadCount(request.user) });
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

app.get("/api/backups", requireBackupManager, async (request, response, next) => {
  try {
    response.json({ backups: await listBackups(request.user), n8n_ready: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/backups/create", requireBackupManager, async (request, response, next) => {
  try {
    const backup = await createManualBackup(request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "create_backup",
      entityType: "backup",
      entityId: backup?.id,
      entityLabel: backup?.backup_code || backup?.backupCode || "",
      afterData: backup,
      metadata: { backup_code: backup?.backup_code || backup?.backupCode || "", status: backup?.status }
    });
    void createNotification({
      targetRole: "founder",
      title: backup?.status === "failed" ? "Backup fallito" : "Backup creato",
      message: backup?.status === "failed"
        ? "Un backup OroActive non è stato completato correttamente."
        : "Backup OroActive creato correttamente.",
      type: backup?.status === "failed" ? "backup_failed" : "backup_created",
      severity: backup?.status === "failed" ? "danger" : "success",
      entityType: "backup",
      entityId: backup?.id,
      actionUrl: "#backups",
      metadata: { backup_code: backup?.backup_code || backup?.backupCode || "", status: backup?.status },
      createdBy: request.user?.id,
      actor: request.user,
      req: request
    });
    response.status(201).json({ backup });
  } catch (error) {
    next(error);
  }
});

app.post("/api/backups/run", requireBackupManager, async (request, response, next) => {
  try {
    const backup = await createManualBackup(request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "create_backup",
      entityType: "backup",
      entityId: backup?.id,
      entityLabel: backup?.backup_code || backup?.backupCode || "",
      afterData: backup,
      metadata: { backup_code: backup?.backup_code || backup?.backupCode || "", status: backup?.status }
    });
    void createNotification({
      targetRole: "founder",
      title: backup?.status === "failed" ? "Backup fallito" : "Backup creato",
      message: backup?.status === "failed"
        ? "Un backup OroActive non è stato completato correttamente."
        : "Backup OroActive creato correttamente.",
      type: backup?.status === "failed" ? "backup_failed" : "backup_created",
      severity: backup?.status === "failed" ? "danger" : "success",
      entityType: "backup",
      entityId: backup?.id,
      actionUrl: "#backups",
      metadata: { backup_code: backup?.backup_code || backup?.backupCode || "", status: backup?.status },
      createdBy: request.user?.id,
      actor: request.user,
      req: request
    });
    response.status(201).json({ backup });
  } catch (error) {
    next(error);
  }
});

app.get("/api/backups/:id", requireBackupManager, async (request, response, next) => {
  try {
    const detail = await backupDetail(request.params.id, request.user);
    if (!detail) return response.status(404).json({ error: "Backup non trovato" });
    response.json({ backup: detail });
  } catch (error) {
    next(error);
  }
});

app.post("/api/backups/:id/verify", requireBackupManager, async (request, response, next) => {
  try {
    const backup = await verifyBackup(request.params.id, request.user);
    if (!backup) return response.status(404).json({ error: "Backup non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "verify_backup",
      entityType: "backup",
      entityId: backup.id || request.params.id,
      entityLabel: backup.backup_code || backup.backupCode || "",
      afterData: { verification_status: backup.verification_status || backup.verificationStatus, checksum_sha256: backup.checksum_sha256 || backup.checksumSha256 },
      metadata: { backup_code: backup.backup_code || backup.backupCode || "", status: backup.status }
    });
    if ((backup.verification_status || backup.verificationStatus) === "verified") {
      void createNotification({
        targetRole: "founder",
        title: "Backup verificato",
        message: "Verifica integrità backup completata correttamente.",
        type: "system",
        severity: "success",
        entityType: "backup",
        entityId: backup.id || request.params.id,
        actionUrl: "#backups",
        metadata: { backup_code: backup.backup_code || backup.backupCode || "" },
        createdBy: request.user?.id,
        actor: request.user,
        req: request
      });
    }
    response.json({ backup });
  } catch (error) {
    next(error);
  }
});

app.post("/api/backups/:id/test-restore", requireFounder, async (request, response, next) => {
  try {
    const backup = await testRestoreBackup(request.params.id, request.user);
    if (!backup) return response.status(404).json({ error: "Backup non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "test_restore_backup",
      entityType: "backup",
      entityId: backup.id || request.params.id,
      entityLabel: backup.backup_code || backup.backupCode || "",
      afterData: { restore_test_status: backup.restore_test_status || backup.restoreTestStatus },
      metadata: { backup_code: backup.backup_code || backup.backupCode || "", status: backup.status, critical: true }
    });
    response.json({ backup });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/backups/:id", requireFounder, async (request, response, next) => {
  try {
    const deleted = await deleteBackup(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Backup non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "delete_backup",
      entityType: "backup",
      entityId: request.params.id,
      entityLabel: `Backup ${request.params.id}`,
      afterData: { status: "deleted" },
      metadata: { critical: true }
    });
    response.json({ ok: true, id: request.params.id });
  } catch (error) {
    next(error);
  }
});

app.get("/api/backups/:id/download", requireFounder, async (request, response, next) => {
  try {
    const backup = await backupDetail(request.params.id, request.user);
    if (!backup || backup.status !== "completed" || !backup.file_path) {
      return response.status(404).json({ error: "Backup non disponibile" });
    }
    const resolved = path.resolve(backup.file_path);
    const allowedRoot = path.resolve(backupDirectory);
    const relative = path.relative(allowedRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return response.status(403).json({ error: "Non autorizzato" });
    }
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "download_backup",
      entityType: "backup",
      entityId: backup.id || request.params.id,
      entityLabel: backup.backup_code || backup.backupCode || "",
      metadata: { backup_code: backup.backup_code || backup.backupCode || "", file_size: backup.file_size || backup.fileSize || 0, critical: true }
    });
    response.download(resolved, path.basename(resolved));
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

app.get("/api/suspended-practices", async (request, response, next) => {
  try {
    response.json(await listSuspendedPractices(request.query, request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/suspended-practices/:id", async (request, response, next) => {
  try {
    const detail = await getSuspendedPractice(request.params.id, request.user);
    if (!detail) return response.status(404).json({ error: "Pratica sospesa non trovata" });
    response.json({ ok: true, ...detail });
  } catch (error) {
    next(error);
  }
});

app.post("/api/suspended-practices/:id/suspend", async (request, response, next) => {
  try {
    const practice = await suspendPractice(request.params.id, request.body || {}, request.user, request);
    if (!practice) return response.status(404).json({ error: "Atto non trovato" });
    response.json({ ok: true, message: "Pratica spostata tra le pratiche sospese.", practice });
  } catch (error) {
    next(error);
  }
});

app.post("/api/suspended-practices/:id/resume", async (request, response, next) => {
  try {
    const practice = await resumeSuspendedPractice(request.params.id, request.body || {}, request.user, request);
    if (!practice) return response.status(404).json({ error: "Pratica sospesa non trovata" });
    response.json({ ok: true, message: "Pratica riaperta per correzione.", practice });
  } catch (error) {
    next(error);
  }
});

app.post("/api/suspended-practices/:id/resolve-check", async (request, response, next) => {
  try {
    const result = await resolveSuspendedPractice(request.params.id, request.body || {}, request.user, request);
    if (!result) return response.status(404).json({ error: "Pratica sospesa non trovata" });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/suspended-practices/:id", async (request, response, next) => {
  try {
    const deleted = await deleteSuspendedPractice(request.params.id, request.user, request);
    if (!deleted) return response.status(404).json({ error: "Pratica sospesa non trovata" });
    response.json({ ok: true, message: "Pratica sospesa eliminata." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/approvals", async (request, response, next) => {
  try {
    response.json({ approvals: await listApprovalRequests(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/approvals/:id", async (request, response, next) => {
  try {
    const approval = await getApprovalRequest(request.params.id, request.user);
    if (!approval) return response.status(404).json({ error: "Richiesta autorizzazione non trovata" });
    response.json({ approval_request: approval });
  } catch (error) {
    next(error);
  }
});

app.post("/api/approvals/request", async (request, response, next) => {
  try {
    const approval = await createApprovalRequest(request.body || {}, request.user, request);
    response.status(201).json({
      ok: true,
      message: "Richiesta autorizzazione inviata",
      approval_request: approval
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/approvals/:id/approve", async (request, response, next) => {
  try {
    const approval = await reviewApprovalRequest(request.params.id, request.body || {}, request.user, request, "approved");
    if (!approval) return response.status(404).json({ error: "Richiesta autorizzazione non trovata" });
    response.json({
      ok: true,
      message: "Autorizzazione approvata. La pratica può essere completata.",
      approval_request: approval
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/approvals/:id/reject", async (request, response, next) => {
  try {
    const approval = await reviewApprovalRequest(request.params.id, request.body || {}, request.user, request, "rejected");
    if (!approval) return response.status(404).json({ error: "Richiesta autorizzazione non trovata" });
    response.json({
      ok: true,
      message: "Autorizzazione rifiutata. Correggere la pratica prima di procedere.",
      approval_request: approval
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/approvals/:id/cancel", async (request, response, next) => {
  try {
    const approval = await reviewApprovalRequest(request.params.id, request.body || {}, request.user, request, "cancelled");
    if (!approval) return response.status(404).json({ error: "Richiesta autorizzazione non trovata" });
    response.json({ ok: true, message: "Richiesta autorizzazione annullata.", approval_request: approval });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-shield/settings", async (_request, response, next) => {
  try {
    response.json({ settings: await getAurumShieldSettings() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/aurum-shield/settings", requireFounder, async (request, response, next) => {
  try {
    const settings = await updateAurumShieldSettings(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "update_aurum_shield_settings",
      entityType: "aurum_shield_settings",
      entityLabel: "Configurazione Aurum Shield",
      afterData: settings,
      metadata: { critical: true }
    });
    response.json({ settings });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aurum-shield/evaluate", async (request, response, next) => {
  try {
    const shield = await calculateAurumShieldRisk(request.body || {}, request.user);
    response.json(shield);
  } catch (error) {
    next(error);
  }
});

app.post("/api/quality-check/validate", async (request, response, next) => {
  try {
    response.json(await validateQualityChecklist(request.body || {}, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quality-check/save", async (request, response, next) => {
  try {
    const quality = await saveQualityCheckResult(request.body || {}, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: quality.quality_status === "non_completabile" || quality.status === "non_completabile" ? "quality_check_failed" : "quality_check_executed",
      entityType: "quality_check",
      entityId: quality.id || request.body?.sale_deed_id || request.body?.atto_id || null,
      entityLabel: "Controllo qualità pratica",
      afterData: quality,
      metadata: { sale_deed_id: request.body?.sale_deed_id || request.body?.atto_id || null }
    });
    if (quality.quality_status === "non_completabile" || quality.status === "non_completabile") {
      const saleDeedId = request.body?.sale_deed_id || request.body?.atto_id || null;
      void createNotification({
        userId: request.user?.id,
        title: "Controllo qualità non superato",
        message: "Controllo qualità non superato: mancano dati o documenti obbligatori.",
        type: "quality_check_failed",
        severity: "warning",
        entityType: "quality_check",
        entityId: quality.id || saleDeedId,
        actionUrl: "#practice",
        metadata: { sale_deed_id: saleDeedId, quality_status: quality.quality_status || quality.status },
        createdBy: request.user?.id,
        actor: request.user,
        req: request
      });
      void createNotification({
        targetRole: "responsabile",
        storeId: request.user?.negozio_id || null,
        title: "Controllo qualità non superato",
        message: "Una pratica richiede verifica qualità prima del completamento.",
        type: "quality_check_failed",
        severity: "danger",
        entityType: "quality_check",
        entityId: quality.id || saleDeedId,
        actionUrl: "#approvals",
        metadata: { sale_deed_id: saleDeedId, quality_status: quality.quality_status || quality.status },
        createdBy: request.user?.id,
        actor: request.user,
        req: request
      });
    }
    response.status(201).json(quality);
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-shield/sale-deed/:id", async (request, response, next) => {
  try {
    const detail = await getAurumShieldForSaleDeed(request.params.id, request.user);
    if (!detail) return response.status(404).json({ error: "Atto non trovato" });
    response.json(detail);
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-shield/client/:id", async (request, response, next) => {
  try {
    const detail = await getAurumShieldForClient(request.params.id, request.user);
    if (!detail) return response.status(404).json({ error: "Cliente non trovato" });
    response.json({ aurum_shield: detail });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-shield/alerts", async (request, response, next) => {
  try {
    response.json({ alerts: await listAurumShieldAlerts(request.user, request.query) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/aurum-shield/alerts/:id/review", async (request, response, next) => {
  try {
    const alert = await reviewAurumShieldAlert(request.params.id, request.body, request.user);
    if (!alert) return response.status(404).json({ error: "Alert Aurum Shield non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: alert.status === "resolved" ? "aurum_shield_alert_resolved" : "aurum_shield_alert_reviewed",
      entityType: "aurum_shield_alert",
      entityId: alert.id,
      entityLabel: alert.title || "",
      afterData: alert,
      metadata: { sale_deed_id: alert.sale_deed_id || null, severity: alert.severity || "" }
    });
    response.json(alert);
  } catch (error) {
    next(error);
  }
});

app.put("/api/aurum-shield/alerts/:id/resolve", async (request, response, next) => {
  try {
    const alert = await reviewAurumShieldAlert(request.params.id, { status: "resolved" }, request.user);
    if (!alert) return response.status(404).json({ error: "Alert Aurum Shield non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "aurum_shield_alert_resolved",
      entityType: "aurum_shield_alert",
      entityId: alert.id,
      entityLabel: alert.title || "",
      afterData: alert,
      metadata: { sale_deed_id: alert.sale_deed_id || null, severity: alert.severity || "" }
    });
    response.json(alert);
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/config", async (request, response, next) => {
  try {
    await ensureAurumBlocksDefaults();
    response.json({
      ok: true,
      config: {
        width: 10,
        height: 20,
        modes: ["arcade", "daily", "training"],
        scoring: { one_line: 100, two_lines: 300, three_lines: 500, four_lines: 800, combo: 50, clean_board: 500 },
        daily_seed: aurumBlocksDailySeed(),
        permissions: {
          global_leaderboard: ["founder", "supervisore"].includes(normalizeRole(request.user.ruolo)),
          store_leaderboard: ["founder", "supervisore", "responsabile"].includes(normalizeRole(request.user.ruolo))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/questions", async (_request, response, next) => {
  try {
    await ensureAurumBlocksDefaults();
    const result = await pool.query(
      `SELECT *
       FROM aurum_blocks_training_questions
       WHERE active = TRUE
       ORDER BY difficulty ASC, category ASC, created_at ASC
       LIMIT 50`
    );
    response.json({ ok: true, questions: result.rows.map(publicAurumBlocksQuestion) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aurum-blocks/session/start", async (request, response, next) => {
  try {
    const session = await startAurumBlocksSession(request.body || {}, request.user, request);
    response.status(201).json({ ok: true, session, daily_seed: session.daily_seed || "" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aurum-blocks/session/:id/finish", async (request, response, next) => {
  try {
    const result = await finishAurumBlocksSession(request.params.id, request.body || {}, request.user, request);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/my-scores", async (request, response, next) => {
  try {
    const result = await listAurumBlocksScores(request.query, request.user);
    response.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/leaderboard", async (request, response, next) => {
  try {
    response.json({ ok: true, leaderboard: await listAurumBlocksLeaderboard(request.query, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/store-leaderboard", async (request, response, next) => {
  try {
    response.json({ ok: true, leaderboard: await listAurumBlocksLeaderboard({ ...request.query, store_id: request.user.negozio_id || request.query.store_id }, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum-blocks/my-badges", async (request, response, next) => {
  try {
    await ensureAurumBlocksDefaults();
    response.json({ ok: true, badges: await listAurumBlocksBadges(request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/gaming/overview", async (request, response, next) => {
  try {
    response.json({ ok: true, overview: await gamingOverview(request.user) });
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

app.get("/api/academy/gold-master/source-check", requireFounder, async (_request, response, next) => {
  try {
    const source = await loadGoldMasterSource();
    response.json({
      ok: true,
      found: Boolean(source.found && source.extractedText),
      title: source.title || "La Bilancia d'Oro",
      source_type: source.source_type || "missing",
      file_path: source.filePath || "",
      characters: String(source.extractedText || "").length,
      warning: source.extractedText ? "" : "File La Bilancia d'Oro non trovato. Caricare il libro per generare il corso completo."
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/gold-master/status", async (request, response, next) => {
  try {
    response.json(await goldMasterStatus(request.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/academy/gold-master/course", async (request, response, next) => {
  try {
    const course = await findGoldMasterCourse();
    if (!course) return response.status(404).json({ error: "Corso Oro Master non trovato" });
    response.json(await getAcademyCourse(course.id, request.user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/gold-master/generate-from-bilancia", requireFounder, async (request, response, next) => {
  try {
    const result = await generateGoldMasterCourseFromBilancia(request.user, {
      force: request.body?.force !== false,
      requireFounder: true
    });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "generate_gold_master_course",
      entityType: "academy_course",
      entityId: result.course_id || null,
      entityLabel: GOLD_MASTER_COURSE_TITLE,
      afterData: result
    });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/gold-master/regenerate-slides", requireFounder, async (request, response, next) => {
  try {
    const result = await generateGoldMasterCourseFromBilancia(request.user, {
      force: true,
      requireFounder: true,
      regenerateSlides: true
    });
    response.status(201).json({ ok: true, message: "Slide Oro Master rigenerate.", ...result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/gold-master/generate-media-prompts", requireFounder, async (_request, response, next) => {
  try {
    const result = await generateGoldMasterCourseFromBilancia({ id: null, ruolo: "founder" }, { force: false });
    response.status(201).json({
      ok: true,
      prompts: GOLD_MASTER_MEDIA_PROMPTS,
      course_id: result.course_id || null,
      message: "Prompt immagini Oro Master disponibili nei materiali del corso."
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/gold-master/publish", requireFounder, async (request, response, next) => {
  try {
    const course = await publishGoldMasterCourse(request.user, true);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "publish_gold_master_course",
      entityType: "academy_course",
      entityId: course.id,
      entityLabel: course.title,
      afterData: course
    });
    response.json({ ok: true, course });
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/gold-master/unpublish", requireFounder, async (request, response, next) => {
  try {
    const course = await publishGoldMasterCourse(request.user, false);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "unpublish_gold_master_course",
      entityType: "academy_course",
      entityId: course.id,
      entityLabel: course.title,
      afterData: course
    });
    response.json({ ok: true, course });
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
    const course = await createAcademyCourse(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "create_academy_course",
      entityType: "academy_course",
      entityId: course?.id,
      entityLabel: course?.title || "",
      afterData: course
    });
    response.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/courses/:id", async (request, response, next) => {
  try {
    const course = await updateAcademyCourse(request.params.id, request.body, request.user);
    if (!course) return response.status(404).json({ error: "Corso non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "update_academy_course",
      entityType: "academy_course",
      entityId: course.id || request.params.id,
      entityLabel: course.title || "",
      afterData: course
    });
    response.json(course);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/academy/courses/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourse(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Corso non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "delete_academy_course",
      entityType: "academy_course",
      entityId: request.params.id,
      entityLabel: `Corso ${request.params.id}`,
      afterData: { deleted: true },
      metadata: { critical: true }
    });
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
    const progress = await startAcademyCourse(request.body.course_id || request.body.courseId, request.user);
    void createNotification({
      userId: request.user.id,
      title: "Corso Academy assegnato",
      message: "Un corso OroActive Academy è disponibile nel tuo percorso formazione.",
      type: "academy_course_assigned",
      severity: "info",
      entityType: "academy_course",
      entityId: progress?.course_id || request.body.course_id || request.body.courseId || null,
      actionUrl: "#training",
      metadata: { course_id: progress?.course_id || request.body.course_id || request.body.courseId || null },
      createdBy: request.user.id,
      actor: request.user,
      audit: false
    });
    response.status(201).json(progress);
  } catch (error) {
    next(error);
  }
});

app.post("/api/academy/progress/complete-lesson", async (request, response, next) => {
  try {
    const progress = await completeAcademyLesson(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "complete_academy_lesson",
      entityType: "academy_lesson",
      entityId: request.body.lesson_id || request.body.lessonId || progress?.lesson_id || null,
      entityLabel: "Lezione Academy",
      afterData: progress,
      metadata: { course_id: request.body.course_id || request.body.courseId || progress?.course_id || null }
    });
    if (Number(progress?.percentuale || 0) >= 100 || String(progress?.status || "").toLowerCase() === "completed") {
      void createNotification({
        userId: request.user.id,
        title: "Corso Academy completato",
        message: "Hai completato un corso OroActive Academy.",
        type: "academy_course_completed",
        severity: "success",
        entityType: "academy_course",
        entityId: progress?.course_id || request.body.course_id || request.body.courseId || null,
        actionUrl: "#training",
        metadata: { course_id: progress?.course_id || request.body.course_id || request.body.courseId || null },
        createdBy: request.user.id,
        actor: request.user
      });
      if (request.user?.negozio_id) {
        void createNotification({
          targetRole: "responsabile",
          storeId: request.user.negozio_id,
          title: "Corso Academy completato",
          message: "Un operatore del negozio ha completato un corso Academy.",
          type: "academy_course_completed",
          severity: "success",
          entityType: "academy_course",
          entityId: progress?.course_id || request.body.course_id || request.body.courseId || null,
          actionUrl: "#training",
          metadata: { user_id: request.user.id, course_id: progress?.course_id || request.body.course_id || request.body.courseId || null },
          createdBy: request.user.id,
          actor: request.user,
          audit: false
        });
      }
    }
    response.status(201).json(progress);
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
    const certificate = await generateAcademyCertificate(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "assign_certificate",
      entityType: "academy_certificate",
      entityId: certificate?.id,
      entityLabel: certificate?.certificate_code || "Certificazione Academy",
      afterData: certificate
    });
    void createNotification({
      userId: certificate?.user_id,
      title: "Certificazione Academy assegnata",
      message: "Hai ricevuto una certificazione OroActive Academy.",
      type: "academy_course_completed",
      severity: "success",
      entityType: "academy_certificate",
      entityId: certificate?.id,
      actionUrl: "#training",
      metadata: { course_id: certificate?.course_id, certificate_code: certificate?.certificate_code },
      createdBy: request.user.id,
      actor: request.user
    });
    response.status(201).json(certificate);
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
    const badge = await assignAcademyBadge(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "assign_badge",
      entityType: "academy_badge",
      entityId: badge?.id,
      entityLabel: badge?.badge_name || badge?.name || "Badge Academy",
      afterData: badge
    });
    void createNotification({
      userId: badge?.user_id,
      title: "Badge Academy assegnato",
      message: "Hai ricevuto un nuovo badge OroActive Academy.",
      type: "academy_course_completed",
      severity: "success",
      entityType: "academy_badge",
      entityId: badge?.id,
      actionUrl: "#training",
      metadata: { course_id: badge?.course_id, badge_name: badge?.badge_name },
      createdBy: request.user.id,
      actor: request.user
    });
    response.status(201).json(badge);
  } catch (error) {
    next(error);
  }
});

app.put("/api/academy/badges/:id/revoke", async (request, response, next) => {
  try {
    const badge = await revokeAcademyBadge(request.params.id, request.user);
    if (!badge) return response.status(404).json({ error: "Badge non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "revoke_badge",
      entityType: "academy_badge",
      entityId: badge.id || request.params.id,
      entityLabel: badge.badge_name || badge.name || "Badge Academy",
      afterData: badge,
      metadata: { critical: true }
    });
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
    const course = await createCourse(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "create_academy_course",
      entityType: "academy_course",
      entityId: course?.id,
      entityLabel: course?.title || "",
      afterData: course
    });
    response.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

app.put("/api/corsi/:id", async (request, response, next) => {
  try {
    const course = await updateCourse(request.params.id, request.body, request.user);
    if (!course) return response.status(404).json({ error: "Corso non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "update_academy_course",
      entityType: "academy_course",
      entityId: course.id || request.params.id,
      entityLabel: course.title || "",
      afterData: course
    });
    response.json(course);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/corsi/:id", async (request, response, next) => {
  try {
    const deleted = await deleteCourse(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Corso non trovato" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "delete_academy_course",
      entityType: "academy_course",
      entityId: request.params.id,
      entityLabel: `Corso ${request.params.id}`,
      afterData: { deleted: true },
      metadata: { critical: true }
    });
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

app.get("/api/training/scenarios", async (_request, response, next) => {
  try {
    response.json({ ok: true, scenarios: await listOperatorTrainingScenarios() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/training/start", async (request, response, next) => {
  try {
    const training = await startOperatorTrainingSession(request.body || {}, request.user, request);
    response.status(201).json({ ok: true, ...training });
  } catch (error) {
    next(error);
  }
});

app.get("/api/training/session/:id", async (request, response, next) => {
  try {
    const row = await trainingSessionById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Training non trovato" });
    response.json({ ok: true, training_session: publicTrainingSession(row), demo_data: row.metadata?.draft_data || null });
  } catch (error) {
    next(error);
  }
});

app.post("/api/training/session/:id/save-progress", async (request, response, next) => {
  try {
    const session = await saveOperatorTrainingProgress(request.params.id, request.body || {}, request.user);
    if (!session) return response.status(404).json({ error: "Training non trovato" });
    response.json({ ok: true, training_session: session });
  } catch (error) {
    next(error);
  }
});

app.post("/api/training/session/:id/complete", async (request, response, next) => {
  try {
    const session = await completeOperatorTrainingSession(request.params.id, request.body || {}, request.user, request);
    if (!session) return response.status(404).json({ error: "Training non trovato" });
    response.json({ ok: true, training_session: session, feedback: session.feedback, mistakes: session.mistakes });
  } catch (error) {
    next(error);
  }
});

app.get("/api/training/my-results", async (request, response, next) => {
  try {
    response.json({ ok: true, results: await listOperatorTrainingResults(request.user, { mine: true }) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/training/team-results", async (request, response, next) => {
  try {
    response.json({ ok: true, results: await listOperatorTrainingResults(request.user, { team: true }) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/training/results/:id", async (request, response, next) => {
  try {
    const row = await trainingSessionById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Training non trovato" });
    response.json({ ok: true, result: publicTrainingSession(row) });
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
    const client = await updateCrmClient(request.params.id, request.body, request.user, request);
    if (!client) return response.status(404).json({ error: "Cliente non trovato" });
    response.json(client);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/crm/clienti/:id", async (request, response, next) => {
  try {
    const deleted = await archiveCrmClient(request.params.id, request.user, request);
    if (!deleted) return response.status(404).json({ error: "Cliente non trovato" });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/crm/clienti/:id/note", async (request, response, next) => {
  try {
    response.status(201).json(await addClientNote(request.params.id, request.body, request.user, request));
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
    if (!error.message) error.message = "Aurum Shield e Controllo Qualità non disponibili.";
    next(error);
  }
});

app.post("/api/ai/assistente", async (request, response, next) => {
  try {
    const question = request.body.domanda || request.body.message || request.body.question || "";
    const answer = await askOroActiveAssistant(question, {
      mode: request.body.mode,
      section: request.body.section || "",
      context: sanitizeForPostgres(request.body.context || {}),
      interface: request.body.interface || ""
    });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "ask_aurum",
      entityType: "aurum",
      entityLabel: String(request.body.interface || "").includes("aurum") ? "Aurum" : "Assistente IA OroActive",
      metadata: {
        section: request.body.section || "",
        mode: request.body.mode || "",
        interface: request.body.interface || "",
        question_preview: sanitizeAurumMemoryText(question).slice(0, 180)
      }
    });
    response.json(answer);
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

app.post("/api/training/gold-coins/identify", async (request, response, next) => {
  try {
    const result = await identifyGoldCoinWithOpenAi({
      image: request.body.image || request.body.photo || request.body.dataUrl || "",
      catalog: request.body.catalog || []
    });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "gold_coin_identify",
      entityType: "training",
      entityLabel: "Elenco Monete",
      metadata: {
        ai_configured: Boolean(result.ai_configured),
        matches_count: Array.isArray(result.matches) ? result.matches.length : 0,
        best_match: result.matches?.[0]?.id || ""
      }
    });
    response.json(result);
  } catch (error) {
    if (!error.status) error.status = 502;
    if (!error.message) error.message = "Riconoscimento moneta non disponibile.";
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

app.get("/api/aurum/memories", async (request, response, next) => {
  try {
    response.json({ memories: await listAurumMemories(request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum/memories/all", requireFounder, async (_request, response, next) => {
  try {
    response.json({ memories: await listAllAurumMemories() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aurum/memories", async (request, response, next) => {
  try {
    response.status(201).json({ memory: await createAurumMemory(request.body, request.user) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/aurum/memories/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAurumMemory(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Memoria Aurum non trovata" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "aurum_memory_deleted",
      entityType: "aurum_memory",
      entityId: request.params.id,
      entityLabel: "Memoria Aurum",
      metadata: { critical: false }
    });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/aurum/support-requests", async (request, response, next) => {
  try {
    response.json({ requests: await listAurumSupportRequests(request.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aurum/support-requests", async (request, response, next) => {
  try {
    const supportRequest = await createAurumSupportRequest(request.body, request.user);
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "aurum_support_request",
      entityType: "aurum_support_request",
      entityId: supportRequest?.id,
      entityLabel: supportRequest?.subject || "Richiesta supporto Aurum",
      afterData: supportRequest,
      metadata: { requested_role: request.body?.requested_role || request.body?.role || "" }
    });
    response.status(201).json({ request: supportRequest });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/aurum/support-requests/:id/reply", async (request, response, next) => {
  try {
    const message = await replyAurumSupportRequest(request.params.id, request.body, request.user);
    if (!message) return response.status(404).json({ error: "Messaggio non trovato" });
    response.json({ request: message });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/aurum/support-requests/:id", async (request, response, next) => {
  try {
    const deleted = await deleteAurumSupportRequest(request.params.id, request.user);
    if (!deleted) return response.status(404).json({ error: "Messaggio non trovato" });
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
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "view_user_activity",
      entityType: "utente",
      entityId: request.params.id,
      entityLabel: `Utente ${request.params.id}`,
      metadata: { target_user_id: request.params.id }
    });
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
    response.status(201).json(await createUser(request.body, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.put(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body, request.user, request);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.patch(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
  try {
    const user = await updateUser(request.params.id, request.body, request.user, request);
    if (!user) return response.status(404).json({ error: "Utente non trovato" });
    response.json(user);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/utenti/:id", "/api/users/:id"], requireAdmin, async (request, response, next) => {
  try {
    const deleted = await deleteUser(request.params.id, request.user, request);
    if (!deleted) return response.status(404).json({ error: "Utente non trovato" });
    response.json({ ok: true, id: request.params.id, message: "Utente eliminato correttamente" });
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

app.get("/api/quotazioni/gold-prediction/status", async (_request, response, next) => {
  try {
    const settings = await loadGoldPredictionSettings();
    const currency = normalizePredictionCurrency(settings.currency || goldPriceBaseCurrency);
    const latestPrice = await latestMetalPriceHistory("gold", currency);
    const latestPredictions = await latestGoldPredictions({ metal: "gold", currency });
    response.json({
      ok: true,
      status: providerStatus(settings.provider),
      settings: {
        currency,
        history_days: settings.history_days,
        horizons: settings.horizons || ["24h", "7d", "30d"],
        model: settings.model || "ensemble",
        market_match_delta_per_gram: Number(settings.market_match_delta_per_gram || 0),
        allow_aggressive_market_match: Boolean(settings.allow_aggressive_market_match),
        competitor_data_max_age_hours: Number(settings.competitor_data_max_age_hours || 24),
        show_competitor_to_commesso: Boolean(settings.show_competitor_to_commesso),
        require_founder_approval_if_competitor_above_max: settings.require_founder_approval_if_competitor_above_max !== false,
        disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer
      },
      latest_price: latestPrice,
      latest_predictions: latestPredictions
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/gold-history", async (request, response, next) => {
  try {
    const metal = normalizePredictionMetal(request.query.metal || "gold");
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    const days = Math.min(Math.max(Number(request.query.days || 30), 1), 365);
    let history = await queryMetalPriceHistory({ metal, currency, days, limit: 365 });
    let demo = false;
    let warning = "";
    if (!history.length) {
      history = demoGoldHistory(days, currency);
      demo = true;
      warning = "Fonte dati non configurata. Modalità demo attiva.";
    }
    response.json({ ok: true, metal, currency, days, demo, warning, history });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/gold-history/sync", async (request, response, next) => {
  try {
    if (!canSyncGoldPriceHistory(request.user)) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    response.json(await syncGoldPriceHistory(request.user, request));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/gold-prediction/run", async (request, response, next) => {
  try {
    response.json(await runGoldPredictions(request.body || {}, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/gold-prediction/latest", async (request, response, next) => {
  try {
    const settings = await loadGoldPredictionSettings();
    const metal = normalizePredictionMetal(request.query.metal || "gold");
    const currency = normalizePredictionCurrency(request.query.currency || settings.currency || goldPriceBaseCurrency);
    const predictions = await latestGoldPredictions({ metal, currency });
    response.json({
      ok: true,
      metal,
      currency,
      predictions,
      disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/gold-prediction/settings", requireFounder, async (_request, response, next) => {
  try {
    const settings = await loadGoldPredictionSettings();
    response.json({ ok: true, settings, status: providerStatus(settings.provider, settings) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/quotazioni/gold-prediction/settings", requireFounder, async (request, response, next) => {
  try {
    const settings = await updateGoldPredictionSettings(request.body || {}, request.user, request);
    response.json({
      ok: true,
      settings,
      status: providerStatus(settings.provider, settings),
      message: "Impostazioni Analisi di mercato aggiornate."
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/metals/status", async (_request, response, next) => {
  try {
    const settings = await loadGoldPredictionSettings();
    const currency = normalizePredictionCurrency(settings.currency || goldPriceBaseCurrency);
    const metals = ["gold", "silver"];
    const latest_prices = {};
    const latest_predictions = {};
    const history_points = {};
    for (const metal of metals) {
      latest_prices[metal] = await latestMetalPriceHistory(metal, currency);
      latest_predictions[metal] = await latestMetalPredictions({ metal, currency });
      history_points[metal] = (await queryMetalPriceHistory({ metal, currency, days: settings.history_days || metalPriceSyncDays, limit: 365 })).length;
    }
    const competitorStats = await competitorQuoteStats({
      metals,
      currency,
      hours: settings.competitor_data_max_age_hours || 24
    }).catch(() => ({}));
    response.json({
      ok: true,
      metals,
      status: providerStatus(settings.provider, settings),
      settings: {
        provider: settings.provider,
        fallback_provider: settings.fallback_provider,
        currency,
        history_days: settings.history_days,
        horizons: settings.horizons || ["today", "24h", "7d", "30d"],
        model: settings.model || "ensemble",
        demo_mode: Boolean(settings.demo_mode),
        market_match_delta_per_gram: Number(settings.market_match_delta_per_gram || 0),
        allow_aggressive_market_match: Boolean(settings.allow_aggressive_market_match),
        competitor_data_max_age_hours: Number(settings.competitor_data_max_age_hours || 24),
        show_competitor_to_commesso: Boolean(settings.show_competitor_to_commesso),
        require_founder_approval_if_competitor_above_max: settings.require_founder_approval_if_competitor_above_max !== false,
        disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer
      },
      latest_prices,
      latest_predictions,
      history_points,
      competitor_stats: competitorStats
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/metals/history", async (request, response, next) => {
  try {
    const metals = String(request.query.metals || request.query.metal || "gold,silver")
      .split(",")
      .map(normalizePredictionMetal)
      .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    const days = Math.min(Math.max(Number(request.query.days || 30), 1), 365);
    const history = {};
    const warnings = [];
    const settings = await loadGoldPredictionSettings();
    for (const metal of metals) {
      let rows = await queryMetalPriceHistory({ metal, currency, days, limit: 365 });
      if (!rows.length) {
        const latest = await latestMetalPriceHistory(metal, currency);
        if (latest) {
          rows = [latest];
          warnings.push(`${metal}: nessuna rilevazione nel periodo, uso ultimo dato salvato.`);
        } else if (settings.demo_mode) {
          rows = demoMetalHistory(metal, days, currency);
          warnings.push(`${metal}: modalità demo attiva.`);
        } else {
          warnings.push(`${metal}: storico non disponibile. Configura fonte dati o sincronizza BullionVault.`);
        }
      } else if (rows.length < 10) {
        warnings.push(`${metal}: storico insufficiente: servono almeno 10 rilevazioni, disponibili ${rows.length}.`);
      }
      history[metal] = rows;
    }
    response.json({ ok: true, metals, currency, days, demo: Boolean(settings.demo_mode), warning: warnings.join(" "), history });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/metals/sync", async (request, response, next) => {
  try {
    if (!canSyncGoldPriceHistory(request.user)) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    const metals = (Array.isArray(request.body?.metals) && request.body.metals.length ? request.body.metals : ["gold", "silver"])
      .map(normalizePredictionMetal)
      .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
    const results = [];
    for (const metal of metals) results.push({ metal, ...(await syncMetalPriceHistory(metal, request.user, request)) });
    response.json({ ok: true, results, warning: results.map((result) => result.warning).filter(Boolean).join(" ") });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/metals/sync-bullionvault", async (request, response, next) => {
  try {
    if (!canSyncGoldPriceHistory(request.user)) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    response.json(await syncBullionVaultMetalHistory(request.user, request, request.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/metals/predict", async (request, response, next) => {
  try {
    response.json(await runMetalPredictions(request.body || {}, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/metals/predictions/latest", async (request, response, next) => {
  try {
    const settings = await loadGoldPredictionSettings();
    const metals = String(request.query.metals || request.query.metal || "gold,silver")
      .split(",")
      .map(normalizePredictionMetal)
      .filter((metal, index, array) => ["gold", "silver"].includes(metal) && array.indexOf(metal) === index);
    const currency = normalizePredictionCurrency(request.query.currency || settings.currency || goldPriceBaseCurrency);
    const predictions = {};
    for (const metal of metals) predictions[metal] = await latestMetalPredictions({ metal, currency });
    response.json({ ok: true, metals, currency, predictions, disclaimer: settings.disclaimer || goldPredictionDefaultSettings().disclaimer });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/buyback-policy", async (_request, response, next) => {
  try {
    response.json({ ok: true, policy: await loadBuybackPolicySettings() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/quotazioni/buyback-policy", requireFounder, async (request, response, next) => {
  try {
    const policy = await updateBuybackPolicySettings(request.body || {}, request.user, request);
    response.json({ ok: true, policy, message: "Policy Prezzi Compro Oro aggiornata." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/buyback-calculate", async (request, response, next) => {
  try {
    response.json(await calculateMetalBuyback(request.body || {}, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/buyback-latest", async (request, response, next) => {
  try {
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    response.json({ ok: true, currency, calculations: await latestBuybackCalculations({ currency }) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/sources", async (_request, response, next) => {
  try {
    response.json({ ok: true, sources: await listCompetitorSources() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/extraction-rules", requireFounder, async (request, response, next) => {
  try {
    response.json({
      ok: true,
      rules: await listCompetitorExtractionRules({
        sourceId: request.query.source_id || request.query.sourceId || null,
        competitorName: request.query.competitor_name || request.query.competitorName || "",
        activeOnly: request.query.active_only === "true" || request.query.activeOnly === "true"
      })
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/extraction-rules/:id/test", requireFounder, async (request, response, next) => {
  try {
    const rule = publicCompetitorExtractionRule((await pool.query(
      "SELECT * FROM competitor_extraction_rules WHERE id = $1::bigint LIMIT 1",
      [request.params.id]
    )).rows[0] || {});
    if (!rule.id) return response.status(404).json({ ok: false, error: "Regola estrazione non trovata" });
    const source = publicCompetitorSource((await pool.query(
      "SELECT * FROM competitor_quote_sources WHERE id = $1::bigint LIMIT 1",
      [rule.source_id]
    )).rows[0] || {});
    if (!source.id) return response.status(404).json({ ok: false, error: "Fonte competitor non trovata" });
    const result = await competitorExtractionTrainer.testCompetitorExtraction(source, [rule], {
      forceAi: request.body?.force_ai === true || request.body?.forceAi === true
    });
    for (const item of result.results || []) await saveExtractionTestResult(item.rule, item).catch(() => null);
    const saveResult = request.body?.save_quotes === false || request.body?.saveQuotes === false
      ? { saved: [], errors: [] }
      : await saveCompetitorQuotes(result.quotes || [], request.user);
    response.json({
      ok: true,
      status: result.status,
      result: publicExtractionTestResult(result.results?.[0] || {}),
      quotes_saved: saveResult.saved.length,
      errors: saveResult.errors || []
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/sources", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, source: await saveCompetitorSource(request.body || {}, request.user), message: "Fonte competitor salvata." });
  } catch (error) {
    next(error);
  }
});

app.put("/api/quotazioni/competitors/sources/:id/extraction-rules", requireFounder, async (request, response, next) => {
  try {
    response.json({
      ok: true,
      rules: await saveCompetitorExtractionRules(request.params.id, request.body?.rules || [], request.user, request),
      message: "Regole di estrazione salvate."
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/sources/:id/extraction-test", requireFounder, async (request, response, next) => {
  try {
    response.json(await testCompetitorExtractionForSource(request.params.id, request.user, request, {
      saveQuotes: request.body?.save_quotes !== false && request.body?.saveQuotes !== false,
      forceAi: false
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/sources/:id/extraction-ai-assisted", requireFounder, async (request, response, next) => {
  try {
    response.json(await testCompetitorExtractionForSource(request.params.id, request.user, request, {
      saveQuotes: request.body?.save_quotes !== false && request.body?.saveQuotes !== false,
      forceAi: true
    }));
  } catch (error) {
    next(error);
  }
});

app.put("/api/quotazioni/competitors/sources/:id", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, source: await saveCompetitorSource(request.body || {}, request.user, request.params.id), message: "Fonte competitor aggiornata." });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/quotazioni/competitors/sources/:id", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, source: await deleteCompetitorSource(request.params.id), message: "Fonte competitor disattivata." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/quotes", async (request, response, next) => {
  try {
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    const quotes = await listCompetitorQuotes({
      metal: request.query.metal || "",
      purityCode: request.query.purity_code || request.query.purityCode || "",
      competitorName: request.query.competitor_name || request.query.competitorName || "",
      quoteType: request.query.quote_type || request.query.quoteType || "customer_buyback",
      currency,
      days: request.query.days || 30,
      limit: request.query.limit || 200
    });
    const settings = await loadGoldPredictionSettings();
    const stats = await competitorQuoteStats({
      metals: ["gold", "silver"],
      currency,
      hours: request.query.hours || settings.competitor_data_max_age_hours || 24
    });
    response.json({ ok: true, currency, quotes, stats });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/sync-status", async (request, response, next) => {
  try {
    if (!["founder", "responsabile"].includes(normalizeRole(request.user?.ruolo))) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    const sources = await listCompetitorSources();
    const logs = await listCompetitorSyncLogs({ limit: 12 }).catch(() => []);
    const updatedSources = sources.filter((source) => ["success", "updated", "partial"].includes(String(source.last_sync_status || "").toLowerCase())).length;
    const failedSources = sources.filter((source) => String(source.last_sync_status || "").toLowerCase() === "failed").length;
    const validQuotes = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM competitor_buyback_quotes
       WHERE quote_date >= NOW() - INTERVAL '24 hours'
          AND COALESCE(quote_type, 'customer_buyback') = 'customer_buyback'
          AND LOWER(COALESCE(ai_confidence, confidence, 'medium')) IN ('medium', 'high', 'media', 'alta')
          AND ${hiddenCompetitorSql("competitor_name")}`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    response.json({
      ok: true,
      status: competitorAutoSyncPublicStatus(),
      sources_total: sources.length,
      sources_updated: updatedSources,
      sources_failed: failedSources,
      valid_quotes_24h: Number(validQuotes.rows[0]?.count || 0),
      oro_express_status: oroExpressSyncPublicStatus(),
      oro_doro_status: oroDOroSyncPublicStatus(),
      amico_oro_status: amicoOroSyncPublicStatus(),
      pronto_gold_status: prontoGoldSyncPublicStatus(),
      bordin_status: bordinSyncPublicStatus(),
      gold_standard_status: goldStandardSyncPublicStatus(),
      oro_in_euro_status: oroInEuroSyncPublicStatus(),
      gruppo_oro_24k_status: gruppoOro24kSyncPublicStatus(),
      sources,
      recent_logs: logs
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/ai-extract/run", requireFounder, async (request, response, next) => {
  try {
    response.json(await runAiCompetitorQuoteExtraction({
      force: true,
      sourceId: request.body?.source_id || request.body?.sourceId || null,
      user: request.user,
      req: request
    }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/ai-extract/status", async (request, response, next) => {
  try {
    if (!["founder", "responsabile"].includes(normalizeRole(request.user?.ruolo))) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    const [runs, pageSummary, aiQuotes] = await Promise.all([
      listAiExtractionRuns({ limit: 5 }).catch(() => []),
      latestAiExtractionPageSummary().catch(() => []),
      listAiCompetitorQuotes({ days: 1, limit: 500, validOnly: true }).catch(() => [])
    ]);
    const sources = await listCompetitorSources();
    response.json({
      ok: true,
      status: competitorAiExtractionPublicStatus(),
      sources_total: sources.length,
      sources_success: pageSummary.filter((page) => ["success", "partial"].includes(String(page.status || "").toLowerCase())).length,
      sources_failed: pageSummary.filter((page) => String(page.status || "").toLowerCase() === "failed").length,
      pages_analyzed: pageSummary.length,
      quotes_24h: aiQuotes.length,
      latest_run: runs[0] || null,
      recent_runs: runs,
      page_summary: pageSummary,
      sources
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/ai-extract/runs", async (request, response, next) => {
  try {
    if (!["founder", "responsabile"].includes(normalizeRole(request.user?.ruolo))) {
      return response.status(403).json({ ok: false, error: "Non autorizzato" });
    }
    response.json({ ok: true, runs: await listAiExtractionRuns({ limit: request.query.limit || 40 }) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/ai-extract/runs/:id", requireFounder, async (request, response, next) => {
  try {
    const detail = await getAiExtractionRun(request.params.id);
    if (!detail) return response.status(404).json({ ok: false, error: "Run AI competitor non trovata" });
    response.json({ ok: true, ...detail });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/quotes/ai", async (request, response, next) => {
  try {
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    response.json({
      ok: true,
      currency,
      quotes: await listAiCompetitorQuotes({
        currency,
        days: request.query.days || 30,
        limit: request.query.limit || 200,
        validOnly: request.query.valid_only !== "false" && request.query.validOnly !== "false"
      })
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/oro-express/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runOroExpressHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/oro-doro/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runOroDOroHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/amico-oro/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runAmicoOroHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/pronto-gold/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runProntoGoldHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/banco-preziosi/sync", requireFounder, async (request, response, next) => {
  try {
    response.status(410).json({
      ok: false,
      error: "Banco Preziosi è stato rimosso dai competitor OroActive."
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/bordin/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runBordinHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/gold-standard/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runGoldStandardHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/oro-in-euro/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runOroInEuroHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/gruppo-oro-24k/sync", requireFounder, async (request, response, next) => {
  try {
    response.json(await runGruppoOro24kHourlySync({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/auto-sync/run", requireFounder, async (request, response, next) => {
  try {
    if (request.body?.source_id || request.body?.sourceId) {
      const result = await syncSingleCompetitorSource(request.body.source_id || request.body.sourceId, request.user, request, { force: true });
      return response.json({ ok: true, result, state: competitorAutoSyncPublicStatus() });
    }
    response.json(await runCompetitorAutoSyncNow({ force: true, user: request.user, req: request }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/auto-sync/logs", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, logs: await listCompetitorSyncLogs({ limit: request.query.limit || 80 }) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/quotazioni/competitors/sources/:id/auto-sync", requireFounder, async (request, response, next) => {
  try {
    response.json({
      ok: true,
      source: await updateCompetitorSourceAutoSync(request.params.id, request.body || {}, request.user, request),
      message: "Auto sync fonte competitor aggiornato."
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/quotazioni/competitors/market-summary", async (request, response, next) => {
  try {
    const currency = normalizePredictionCurrency(request.query.currency || goldPriceBaseCurrency);
    response.json({ ok: true, summary: await calculateCompetitorMarketSummary({ currency }) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/quotes/manual", requireFounder, async (request, response, next) => {
  try {
    response.json({ ok: true, quote: await insertCompetitorQuote(request.body || {}, request.user), message: "Quotazione competitor salvata." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/quotes/import-csv", requireFounder, async (request, response, next) => {
  try {
    const result = await importCompetitorQuotesCsv(request.body?.csv || "", request.user);
    response.json({
      ok: true,
      inserted: result.inserted,
      errors: result.errors,
      message: result.errors.length
        ? `Import completato con ${result.errors.length} righe non valide.`
        : "Import competitor completato."
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quotazioni/competitors/sync-configured", requireFounder, async (request, response, next) => {
  try {
    response.json(await syncConfiguredCompetitorQuotes(request.user, request));
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
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "create_fusion_lot",
      entityType: "lotto_fusione",
      entityId: result.rows[0]?.id,
      entityLabel: result.rows[0]?.lotto_code || lottoCode,
      afterData: result.rows[0],
      metadata: { store_id: storeRow?.id || null, store_name: store, acts_count: acts.length }
    });
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
    void writeAuditLog({
      req: request,
      user: request.user,
      action: scope === "customer" ? "print_customer_copy" : "print_company_copy",
      entityType: "atto",
      entityId: act.id || act.practiceNumber || null,
      entityLabel: act.practiceNumber || "",
      metadata: { practiceNumber: act.practiceNumber || "", scope }
    });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "generate_pdf",
      entityType: "pdf",
      entityId: act.id || act.practiceNumber || null,
      entityLabel: request.body.title || "Atto di vendita OroActive",
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

function customerTrustPackFilename(code = "") {
  const safeCode = String(code || "trust-pack").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 120);
  return `${safeCode || "trust-pack"}.pdf`;
}

function customerTrustPackPath(code = "") {
  return path.join(trustPackDirectory, customerTrustPackFilename(code));
}

function customerTrustPackCodeForAct(act = {}, row = {}) {
  const parsed = parsePracticeNumber(act.practiceNumber || row.practice_number || "");
  const year = parsed?.year
    || new Date(row.completed_at || row.archived_at || row.data_atto || Date.now()).getFullYear();
  const storeCode = String(parsed?.storeCode || row.store_code || row.codice_negozio || storeCodeFromName(row.store || act.store || ""))
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase()
    .slice(0, 16) || "STORE";
  const number = parsed?.number
    ? String(parsed.number).padStart(6, "0")
    : String(row.act_number || row.numero_atto_negozio || row.id || Date.now()).padStart(6, "0");
  return `TP-OA-${year}-${storeCode}-${number}`;
}

function publicCustomerTrustPack(row = {}) {
  return {
    id: row.id,
    trust_pack_code: row.trust_pack_code,
    sale_deed_id: row.sale_deed_id,
    client_id: row.client_id || null,
    store_id: row.store_id || null,
    practice_number: row.practice_number || row.entity_label || "",
    customer_name: [row.cliente_nome, row.cliente_cognome].filter(Boolean).join(" "),
    store_name: row.store_name || row.store || "",
    delivery_status: row.delivery_status || "generated",
    delivered_via: row.delivered_via || "",
    delivered_to: row.delivered_to || "",
    generated_at: row.generated_at || null,
    delivered_at: row.delivered_at || null,
    metadata: row.metadata || {},
    pdf_url: row.id ? `/api/customer-trust-pack/${row.id}/download` : ""
  };
}

async function customerTrustPackStoreForAct(row = {}) {
  if (row.negozio_id) {
    const result = await pool.query("SELECT * FROM negozi WHERE id = $1::bigint LIMIT 1", [row.negozio_id]);
    if (result.rows[0]) return result.rows[0];
  }
  return storeByCodeOrName(row.store_code || row.codice_negozio || row.store);
}

async function customerTrustPackClientForAct(row = {}, act = {}) {
  const result = await pool.query(
    `SELECT *
     FROM clienti
     WHERE ($1::bigint IS NOT NULL AND id = $1::bigint)
        OR ($2::text <> '' AND UPPER(codice_fiscale) = UPPER($2::text))
     ORDER BY id ASC
     LIMIT 1`,
    [row.cliente_id || null, row.codice_fiscale || act.fiscalCode || ""]
  );
  return result.rows[0] || null;
}

function customerTrustPackEligibilityError() {
  const error = new Error("Il Customer Trust Pack può essere generato solo per pratiche completate o archiviate.");
  error.status = 400;
  return error;
}

async function assertCustomerTrustPackEligible(saleDeedId, user = {}) {
  const row = await findExisting(saleDeedId);
  if (!row) {
    const error = new Error("Atto non trovato");
    error.status = 404;
    throw error;
  }
  if (!canAccessAct(row, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const status = normalizeWorkflowStatus(row.status);
  const archivedCompleted = /archiviata|archiviato|archived/i.test(String(row.status || "")) && row.completed_at;
  const completedOrArchived = ["completed", "archived_completed"].includes(status) || archivedCompleted;
  if (row.deleted_at || status === "deleted" || !completedOrArchived || !row.completed_at) {
    throw customerTrustPackEligibilityError();
  }
  return row;
}

async function customerTrustPackRowById(id, user = {}) {
  const result = await pool.query(
    `SELECT ctp.*,
            a.practice_number,
            a.store,
            a.negozio_id AS act_store_id,
            a.deleted_at AS act_deleted_at,
            a.status AS act_status,
            a.cliente_nome,
            a.cliente_cognome,
            a.telefono AS act_phone,
            c.telefono AS client_phone,
            n.nome AS store_name
     FROM customer_trust_packs ctp
     JOIN ${actsTable} a ON a.id = ctp.sale_deed_id
     LEFT JOIN clienti c ON c.id = ctp.client_id
     LEFT JOIN negozi n ON n.id = ctp.store_id
     WHERE ctp.id::text = $1::text
       AND ctp.deleted_at IS NULL
     LIMIT 1`,
    [String(id || "")]
  );
  const row = result.rows[0];
  if (!row || row.act_deleted_at) return null;
  if (!canAccessAct({ store: row.store }, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  return row;
}

async function listCustomerTrustPacksForSaleDeed(saleDeedId, user = {}) {
  const act = await findExisting(saleDeedId);
  if (!act) {
    const error = new Error("Atto non trovato");
    error.status = 404;
    throw error;
  }
  if (!canAccessAct(act, user)) {
    const error = new Error("Non autorizzato");
    error.status = 403;
    throw error;
  }
  const result = await pool.query(
    `SELECT ctp.*, a.practice_number, a.cliente_nome, a.cliente_cognome, n.nome AS store_name
     FROM customer_trust_packs ctp
     JOIN ${actsTable} a ON a.id = ctp.sale_deed_id
     LEFT JOIN negozi n ON n.id = ctp.store_id
     WHERE ctp.sale_deed_id = $1::bigint
       AND ctp.deleted_at IS NULL
     ORDER BY ctp.generated_at DESC`,
    [act.id]
  );
  return result.rows.map(publicCustomerTrustPack);
}

async function listCustomerTrustPacksForClient(clientId, user = {}) {
  const values = [clientId];
  const storeWhere = await visibleStoreWhere(user, values, "a");
  const result = await pool.query(
    `SELECT ctp.*, a.practice_number, a.cliente_nome, a.cliente_cognome, a.store, n.nome AS store_name
     FROM customer_trust_packs ctp
     JOIN ${actsTable} a ON a.id = ctp.sale_deed_id
     LEFT JOIN negozi n ON n.id = ctp.store_id
     WHERE ctp.client_id = $1::bigint
       AND ctp.deleted_at IS NULL
       AND a.deleted_at IS NULL
       ${storeWhere}
     ORDER BY ctp.generated_at DESC
     LIMIT 50`,
    values
  );
  return result.rows.map(publicCustomerTrustPack);
}

function drawTrustPackText(doc, text, y, options = {}) {
  const x = options.x || 42;
  const width = options.width || 511;
  doc.fillColor(options.color || "#333")
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size || 9)
    .text(text, x, y, { width, lineGap: options.lineGap ?? 2 });
  return doc.y + (options.marginBottom ?? 8);
}

function trustPackPaymentStatus(act = {}) {
  const method = String(act.paymentMethod || "").trim();
  if (!method) return "Metodo pagamento non inserito";
  if (/bonifico/i.test(method)) return "Pagamento tracciabile indicato in pratica";
  if (/assegno/i.test(method)) return "Pagamento con assegno indicato in pratica";
  if (/contanti/i.test(method)) return "Pagamento in contanti indicato in pratica";
  return "Pagamento registrato secondo metodo indicato";
}

async function writeCustomerTrustPackPdf({ act, row, store, client, trustPackCode, outputPath }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const doc = new PDFDocument({ size: "A4", autoFirstPage: false, margin: 42, bufferPages: true });
  const stream = createWriteStream(outputPath);
  const completed = new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);
  });
  doc.pipe(stream);
  doc.addPage();
  drawPdfHeader(doc, { ...act, operatorUsername: "", operatorName: "" }, "Customer Trust Pack OroActive", { centerLogo: true });
  doc.fillColor("#555").font("Helvetica").fontSize(11).text("Riepilogo trasparente della tua vendita", 42, 190, { width: 511, align: "center" });

  let y = 225;
  y = drawPdfSectionTitle(doc, "Dati negozio", y);
  y = drawPdfFields(doc, [
    { label: "Negozio", value: store?.nome || act.store || row.store || "OroActive" },
    { label: "Indirizzo", value: [store?.indirizzo, store?.citta, store?.provincia].filter(Boolean).join(", ") },
    { label: "Telefono", value: store?.telefono || "Contatta il negozio OroActive" },
    { label: "Email", value: store?.email || "Dato non configurato" },
    { label: "Data operazione", value: `${act.date || dateText(row.data_atto)} ${act.time || ""}`.trim() },
    { label: "Sito OroActive", value: oroactiveSiteUrl }
  ], y, 2);

  y = ensurePdfSpace(doc, y, 120);
  y = drawPdfSectionTitle(doc, "Dati cliente essenziali", y);
  y = drawPdfFields(doc, [
    { label: "Nome", value: act.name || client?.nome },
    { label: "Cognome", value: act.surname || client?.cognome },
    { label: "Numero atto", value: act.practiceNumber || row.practice_number },
    { label: "Data atto", value: act.date || dateText(row.data_atto) },
    { label: "Tipo documento", value: act.documentType || client?.documento_tipo || "Dato non inserito" },
    { label: "Codice Trust Pack", value: trustPackCode }
  ], y, 2);

  y = ensurePdfSpace(doc, y, 150);
  y = drawPdfSectionTitle(doc, "Riepilogo vendita", y);
  const items = Array.isArray(act.items) && act.items.length
    ? act.items
    : [{ description: "Oggetto prezioso", metal: "Oro", title: "", weight: act.weight }];
  items.slice(0, 12).forEach((item, index) => {
    y = ensurePdfSpace(doc, y, 42);
    const weightText = act.printWeightCustomer && item.weight ? ` · ${item.weight} g` : "";
    doc.roundedRect(42, y, 511, 34, 4).strokeColor("#e6d6c8").stroke();
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text(`${index + 1}. ${item.description || "Oggetto prezioso"}`, 50, y + 7, { width: 292, height: 18, ellipsis: true });
    doc.fillColor("#555").font("Helvetica").fontSize(9).text(`${item.metal || "Metallo"} ${item.title || ""}${weightText}`.trim(), 360, y + 7, { width: 180, height: 18, ellipsis: true });
    y += 40;
  });
  y = ensurePdfSpace(doc, y, 92);
  y = drawPdfFields(doc, [
    { label: "Metodo pagamento", value: act.paymentMethod || row.payment_method || "Dato non inserito" },
    { label: "Importo corrisposto", value: pdfFormatEuro(act.amount ?? row.totale) },
    { label: "Stato pagamento", value: trustPackPaymentStatus(act) },
    { label: "Conferma documenti", value: "Documenti e firme gestiti nella pratica digitale OroActive" }
  ], y, 2);

  y = ensurePdfSpace(doc, y, 130);
  y = drawPdfSectionTitle(doc, "Trasparenza OroActive", y);
  y = drawTrustPackText(doc, "OroActive opera con un metodo basato su identificazione, tracciabilità, trasparenza e controllo documentale. Ogni pratica viene registrata, verificata e conservata secondo le procedure interne previste.", y);
  y = drawPdfSectionTitle(doc, "Cosa succede dopo", y);
  y = drawTrustPackText(doc, "La pratica viene conservata digitalmente. Per qualsiasi richiesta indica sempre il numero atto riportato in questo documento. Il pagamento segue il metodo indicato nella pratica.", y);

  y = ensurePdfSpace(doc, y, 190);
  y = drawPdfSectionTitle(doc, "FAQ post-vendita", y);
  [
    ["A cosa serve il numero atto?", "Serve a identificare rapidamente la pratica e recuperare il riepilogo della vendita."],
    ["Posso richiedere una copia della pratica?", "Sì, puoi contattare il negozio indicando il numero atto."],
    ["Come posso contattare il negozio?", "Usa telefono, email o WhatsApp se configurati per il punto vendita."],
    ["Come viene tutelata la mia privacy?", "Il documento evita dati interni e riporta solo informazioni utili al cliente."],
    ["Cosa devo fare se ho bisogno di chiarimenti?", "Contatta il negozio OroActive e comunica il codice Trust Pack."]
  ].forEach(([question, answer]) => {
    y = ensurePdfSpace(doc, y, 42);
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(9).text(question, 42, y, { width: 511 });
    doc.fillColor("#555").font("Helvetica").fontSize(8.5).text(answer, 42, y + 13, { width: 511, lineGap: 1 });
    y += 38;
  });

  y = ensurePdfSpace(doc, y, 110);
  y = drawPdfSectionTitle(doc, "Contatti", y);
  y = drawPdfFields(doc, [
    { label: "Telefono negozio", value: store?.telefono || "Dato non configurato" },
    { label: "Email negozio", value: store?.email || "Dato non configurato" },
    { label: "Sito ufficiale", value: oroactiveSiteUrl },
    { label: "Codice univoco", value: trustPackCode }
  ], y, 2);

  doc.fillColor("#777").font("Helvetica").fontSize(8)
    .text(`Documento generato digitalmente dal gestionale OroActive · ${trustPackCode} · ${new Date().toLocaleString("it-IT")}`, 42, 768, { width: 511, align: "center" });
  doc.fillColor("#777").fontSize(7).text("© OroActive - Customer Trust Pack", 42, 782, { width: 511, align: "center" });
  doc.end();
  await completed;
}

async function generateCustomerTrustPack(input = {}, user = {}, req = null) {
  const saleDeedId = input.sale_deed_id || input.saleDeedId || input.id;
  const row = await assertCustomerTrustPackEligible(saleDeedId, user);
  const act = rowToAct(row);
  const store = await customerTrustPackStoreForAct(row);
  const client = await customerTrustPackClientForAct(row, act);
  const trustPackCode = customerTrustPackCodeForAct(act, row);
  const existing = await pool.query(
    "SELECT * FROM customer_trust_packs WHERE trust_pack_code = $1::text AND deleted_at IS NULL LIMIT 1",
    [trustPackCode]
  );
  const regenerate = input.regenerate === true;
  if (existing.rowCount && !regenerate) {
    return publicCustomerTrustPack({ ...existing.rows[0], practice_number: act.practiceNumber, cliente_nome: act.name, cliente_cognome: act.surname, store_name: store?.nome || act.store });
  }

  const outputPath = customerTrustPackPath(trustPackCode);
  await writeCustomerTrustPackPdf({ act, row, store, client, trustPackCode, outputPath });
  const metadata = sanitizeForPostgres({
    included_sections: ["copia_cliente_pdf", "riepilogo_vendita", "dati_negozio", "faq_post_vendita", "contatti"],
    privacy: "Dati interni, risk score, audit trail, margini e note operative esclusi dal Customer Trust Pack.",
    items_count: Array.isArray(act.items) ? act.items.length : 0,
    oroactive_site_url: oroactiveSiteUrl
  });
  const values = [
    trustPackCode,
    row.id,
    row.cliente_id || client?.id || null,
    row.negozio_id || store?.id || null,
    user.id || null,
    outputPath,
    metadata
  ];
  const result = existing.rowCount
    ? await pool.query(
      `UPDATE customer_trust_packs
       SET pdf_path = $1::text,
           delivery_status = 'generated',
           delivered_via = NULL,
           delivered_to = NULL,
           delivered_at = NULL,
           generated_by = $2::bigint,
           generated_at = NOW(),
           metadata = $3::jsonb
       WHERE id = $4::uuid
       RETURNING *`,
      [outputPath, user.id || null, metadata, existing.rows[0].id]
    )
    : await pool.query(
      `INSERT INTO customer_trust_packs (
        trust_pack_code, sale_deed_id, client_id, store_id, generated_by,
        pdf_path, delivery_status, metadata
      ) VALUES (
        $1::text,$2::bigint,$3::bigint,$4::bigint,$5::bigint,
        $6::text,'generated',$7::jsonb
      )
      RETURNING *`,
      values
    );
  const trustPack = publicCustomerTrustPack({
    ...result.rows[0],
    practice_number: act.practiceNumber,
    cliente_nome: act.name,
    cliente_cognome: act.surname,
    store_name: store?.nome || act.store
  });
  const auditAction = existing.rowCount ? "customer_trust_pack_regenerated" : "customer_trust_pack_generated";
  void writeAuditLog({
    req,
    user,
    action: auditAction,
    entityType: "customer_trust_pack",
    entityId: trustPack.id,
    entityLabel: trustPack.trust_pack_code,
    afterData: { trust_pack_code: trustPack.trust_pack_code, sale_deed_id: row.id, practice_number: act.practiceNumber },
    metadata: { sale_deed_id: row.id, practice_number: act.practiceNumber, store_id: row.negozio_id || store?.id || null }
  });
  void createNotification({
    targetRole: "founder",
    title: "Customer Trust Pack generato",
    message: `Trust Pack ${trustPack.trust_pack_code} generato per la pratica ${act.practiceNumber}.`,
    type: "system",
    severity: "success",
    entityType: "customer_trust_pack",
    entityId: trustPack.id,
    actionUrl: `customer-trust-pack:${trustPack.id}`,
    createdBy: user.id || null,
    actor: user,
    req,
    metadata: { sale_deed_id: row.id, practice_number: act.practiceNumber }
  });
  return trustPack;
}

app.post("/api/customer-trust-pack/generate", async (request, response, next) => {
  try {
    const trustPack = await generateCustomerTrustPack(request.body || {}, request.user, request);
    response.json({ ok: true, message: "Customer Trust Pack generato correttamente", trust_pack: trustPack });
  } catch (error) {
    next(error);
  }
});

app.get("/api/customer-trust-pack/sale-deed/:saleDeedId", async (request, response, next) => {
  try {
    const trustPacks = await listCustomerTrustPacksForSaleDeed(request.params.saleDeedId, request.user);
    response.json({ ok: true, trust_packs: trustPacks, trust_pack: trustPacks[0] || null });
  } catch (error) {
    next(error);
  }
});

app.get("/api/customer-trust-pack/client/:clientId", async (request, response, next) => {
  try {
    response.json({ ok: true, trust_packs: await listCustomerTrustPacksForClient(request.params.clientId, request.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/customer-trust-pack/:id/download", async (request, response, next) => {
  try {
    const row = await customerTrustPackRowById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Customer Trust Pack non trovato" });
    const stats = await fs.stat(row.pdf_path).catch(() => null);
    if (!stats?.isFile()) return response.status(404).json({ error: "PDF Customer Trust Pack non disponibile" });
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "customer_trust_pack_downloaded",
      entityType: "customer_trust_pack",
      entityId: row.id,
      entityLabel: row.trust_pack_code,
      metadata: { sale_deed_id: row.sale_deed_id, practice_number: row.practice_number }
    });
    await pool.query(
      "UPDATE customer_trust_packs SET delivery_status = 'downloaded', delivered_via = 'download', delivered_at = NOW() WHERE id = $1::uuid",
      [row.id]
    );
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Length", String(stats.size));
    response.setHeader("Content-Disposition", `attachment; filename="${customerTrustPackFilename(row.trust_pack_code)}"`);
    createReadStream(row.pdf_path).pipe(response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/customer-trust-pack/:id/send-email", async (request, response, next) => {
  try {
    const row = await customerTrustPackRowById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Customer Trust Pack non trovato" });
    response.json({
      ok: false,
      message: "Invio email non configurato. Puoi scaricare il PDF manualmente.",
      trust_pack: publicCustomerTrustPack(row)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/customer-trust-pack/:id/mark-whatsapp", async (request, response, next) => {
  try {
    const row = await customerTrustPackRowById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Customer Trust Pack non trovato" });
    const phone = String(request.body?.phone || row.client_phone || row.act_phone || "").replace(/[^\d+]/g, "");
    const message = `Buongiorno, le inviamo il Customer Trust Pack OroActive relativo alla sua pratica n. ${row.practice_number}. Per qualsiasi chiarimento puo contattarci.`;
    await pool.query(
      `UPDATE customer_trust_packs
       SET delivery_status = 'sent_whatsapp',
           delivered_via = 'whatsapp',
           delivered_to = NULLIF($2::text, ''),
           delivered_at = NOW()
       WHERE id = $1::uuid`,
      [row.id, phone]
    );
    void writeAuditLog({
      req: request,
      user: request.user,
      action: "customer_trust_pack_sent_whatsapp",
      entityType: "customer_trust_pack",
      entityId: row.id,
      entityLabel: row.trust_pack_code,
      metadata: { sale_deed_id: row.sale_deed_id, practice_number: row.practice_number }
    });
    response.json({
      ok: true,
      message: "Invio WhatsApp preparato. Scarica il PDF e allegalo manualmente se necessario.",
      whatsapp_url: phone ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(message)}` : "",
      trust_pack: publicCustomerTrustPack({ ...row, delivery_status: "sent_whatsapp", delivered_via: "whatsapp", delivered_to: phone, delivered_at: new Date().toISOString() })
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/customer-trust-pack/:id", async (request, response, next) => {
  try {
    const row = await customerTrustPackRowById(request.params.id, request.user);
    if (!row) return response.status(404).json({ error: "Customer Trust Pack non trovato" });
    response.json({ ok: true, trust_pack: publicCustomerTrustPack(row) });
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
    const withShield = row ? await rowWithAurumShield(row.id) : null;
    const act = row ? rowToAct(withShield || row) : null;
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.post(["/api/atti", "/api/acts"], async (request, response, next) => {
  try {
    response.status(201).json(await saveAct(request.body, request.user, request));
  } catch (error) {
    next(error);
  }
});

app.put(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const act = await updateAct(request.params.id, request.body, request.user, request);
    if (!act) return response.status(404).json({ error: "Atto non trovato" });
    response.json(act);
  } catch (error) {
    next(error);
  }
});

app.delete(["/api/atti/:id", "/api/acts/:id"], async (request, response, next) => {
  try {
    const deleted = await deleteAct(request.params.id, request.user, request);
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
    if (url.includes("/api/customer-trust-pack") || /customer_trust_packs/i.test(constraint)) {
      return "Customer Trust Pack già presente per questa pratica.";
    }
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
  if (url.includes("/api/aurum-blocks")) return "Errore database durante Aurum Blocks.";
  if (url.includes("/api/gaming")) return "Errore database durante Gaming OroActive.";
  if (url.includes("/api/aurum")) return "Errore database durante il salvataggio Aurum.";
  if (url.includes("/api/atti") || url.includes("/api/acts")) return "Errore database durante il salvataggio dell'atto. Verifica negozio, data, pagamento e allegati.";
  if (url.includes("/api/training")) return "Errore database durante il Training Operatore.";
  if (url.includes("/api/academy") || url.includes("/api/corsi")) return "Errore database durante il salvataggio Academy.";
  if (url.includes("/api/crm")) return "Errore database durante il salvataggio CRM.";
  if (url.includes("/api/customer-trust-pack")) return "Errore database durante il Customer Trust Pack.";
  if (url.includes("/api/privacy-policy")) return "Errore database durante il Centro Privacy.";
  if (url.includes("/api/store-health")) return "Errore database durante il calcolo Salute Negozio.";
  if (url.includes("/api/founder-daily-report")) return "Errore database durante il Founder Daily Report.";
  if (url.includes("/api/backups")) return "Errore database durante il backup.";
  if (url.includes("/api/quotes") || url.includes("/api/quotazioni")) return "Errore database durante il salvataggio quotazioni.";
  return "Errore database: operazione non completata.";
}

function looksTechnicalErrorMessage(message = "") {
  return /TypeError|ReferenceError|SyntaxError|Cannot read|is not defined|Unexpected token|duplicate key|violates .*constraint|invalid input syntax|SQLSTATE|PostgreSQL|DATABASE_URL|SELECT |INSERT |UPDATE |DELETE |at .+:\d+:\d+/i.test(String(message || ""));
}

function safeRouteErrorMessage(request) {
  const url = request?.originalUrl || "";
  if (url.includes("/api/utenti") || url.includes("/api/users")) return "Operazione utenti non completata.";
  if (url.includes("/api/atti") || url.includes("/api/acts")) return "Operazione atto non completata.";
  if (url.includes("/api/suspended-practices")) return "Operazione pratica sospesa non completata.";
  if (url.includes("/api/approvals")) return "Operazione autorizzazione non completata.";
  if (url.includes("/api/notifications")) return "Operazione notifiche non completata.";
  if (url.includes("/api/customer-trust-pack")) return "Customer Trust Pack non completato.";
  if (url.includes("/api/privacy-policy")) return "Centro Privacy non caricato.";
  if (url.includes("/api/founder-daily-report")) return "Founder Daily Report non completato.";
  if (url.includes("/api/backups")) return "Operazione backup non completata.";
  if (url.includes("/api/training")) return "Training Operatore non completato.";
  if (url.includes("/api/store-health")) return "Salute Negozio non caricata.";
  if (url.includes("/api/academy") || url.includes("/api/corsi")) return "Operazione Academy non completata.";
  if (url.includes("/api/crm") || url.includes("/api/clienti")) return "Operazione CRM non completata.";
  if (url.includes("/api/aurum-shield") || url.includes("/api/quality-check")) return "Controllo pratica non completato.";
  if (url.includes("/api/aurum-blocks")) return "Aurum Blocks non completato.";
  if (url.includes("/api/gaming")) return "Gaming OroActive non completato.";
  if (url.includes("/api/quotazioni")) return "Analisi quotazioni non completata.";
  if (url.includes("/api/ai") || url.includes("/api/aurum")) return "Operazione Aurum non completata.";
  return "Operazione non completata. Riprova tra qualche secondo.";
}

function publicErrorMessage(error, request) {
  const isDatabaseError = Boolean(error.code || error.severity || error.routine);
  if (isDatabaseError) return friendlyDatabaseError(error, request);
  const message = String(error.message || "").trim();
  if (!message || looksTechnicalErrorMessage(message)) return safeRouteErrorMessage(request);
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

app.use((error, request, response, _next) => {
  console.error(error);
  const message = publicErrorMessage(error, request);
  const payload = { ok: false, error: message };
  if (error.approval_required) {
    payload.approval_required = true;
    payload.reasons = error.reasons || [];
    payload.quality_check = error.quality_check || null;
    payload.aurum_shield = error.aurum_shield || null;
  }
  response.status(error.status || 500).json(payload);
});

app.listen(port, () => {
  console.log(`OroActive gestionale in ascolto sulla porta ${port}`);
});

initDatabase()
  .then(() => {
    runtimeStatus.databaseReady = true;
    runtimeStatus.databaseError = "";
    scheduleBackups();
    startCompetitorAutoSync();
    startOroExpressHourlySync();
    startOroDOroHourlySync();
    startAmicoOroHourlySync();
    startProntoGoldHourlySync();
    startBordinHourlySync();
    startGoldStandardHourlySync();
    startOroInEuroHourlySync();
    startGruppoOro24kHourlySync();
    startCompetitorAiAutoExtraction();
  })
  .catch((error) => {
    runtimeStatus.databaseReady = false;
    runtimeStatus.databaseError = error?.message || "Errore inizializzazione database";
    console.error("Errore inizializzazione database", error);
    if (process.env.REQUIRE_DATABASE_ON_START === "true") {
      process.exit(1);
    }
  });
