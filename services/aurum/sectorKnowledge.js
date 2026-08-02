import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgeFilePaths = [
  path.resolve(__dirname, "../../assets/aurum-knowledge/sector/compro-oro-knowledge.json"),
  path.resolve(__dirname, "../../assets/aurum-knowledge/sector/geology-numismatics-knowledge.json"),
  path.resolve(__dirname, "../../assets/aurum-knowledge/sector/sales-communication-knowledge.json")
];

function loadKnowledge() {
  const documents = knowledgeFilePaths.map((filePath) => JSON.parse(readFileSync(filePath, "utf8")));
  const latest = documents.at(-1);
  const parsed = {
    ...documents[0],
    knowledgeVersion: latest.knowledgeVersion,
    verifiedAt: latest.verifiedAt,
    topics: documents.flatMap((document) => document.topics || [])
  };
  if (!parsed || !Array.isArray(parsed.topics) || !parsed.topics.length) {
    throw new Error("Knowledge base settoriale Aurum non valida.");
  }
  const ids = new Set();
  for (const topic of parsed.topics) {
    if (!topic?.id || ids.has(topic.id)) throw new Error(`Topic Aurum duplicato o privo di id: ${topic?.id || "senza-id"}`);
    ids.add(topic.id);
    if (!topic.title || !topic.category || !topic.summary) throw new Error(`Topic Aurum incompleto: ${topic.id}`);
    if (!Array.isArray(topic.sources) || !topic.sources.length) throw new Error(`Topic Aurum senza fonti: ${topic.id}`);
    for (const source of topic.sources) {
      if (!source?.title || !source?.url || !/^https:\/\//i.test(source.url)) {
        throw new Error(`Fonte Aurum non valida nel topic ${topic.id}`);
      }
    }
  }
  return Object.freeze({
    ...parsed,
    topics: Object.freeze(parsed.topics.map((topic) => Object.freeze(topic)))
  });
}

export const AURUM_SECTOR_KNOWLEDGE = loadKnowledge();

const stopWords = new Set([
  "agli", "alla", "alle", "allo", "anche", "avere", "come", "cosa", "dai", "dal", "dalla", "dalle",
  "degli", "dei", "del", "della", "delle", "dello", "dopo", "essere", "fare", "fatto", "gli", "nella",
  "nelle", "ogni", "oggi", "perche", "posso", "prima", "quale", "quali", "quando", "quanto", "questa",
  "queste", "questi", "questo", "sono", "sulla", "sulle", "tutto", "tutte", "tutti", "una", "uno",
  "usare", "viene", "devo", "deve", "dovrei"
]);

const queryAliases = new Map([
  ["caratura", ["carati", "titolo", "millesimi", "finezza"]],
  ["carato", ["carati", "titolo", "millesimi", "finezza"]],
  ["contanti", ["pagamento", "500", "tracciabile", "frazionata"]],
  ["documenti", ["identificazione", "cliente", "conservazione"]],
  ["foto", ["fotografie", "scheda", "operazione"]],
  ["falso", ["contraffazione", "screening", "inconcludente"]],
  ["sintetico", ["sintetica", "sintetici", "sintetiche", "laboratory-grown"]],
  ["termico", ["tester termico", "screening", "pass", "refer"]],
  ["tester", ["tester termico", "screening", "pass", "refer"]],
  ["laboratorio", ["analisi", "saggio", "gemmologico"]],
  ["prezzo", ["quotazione", "valore", "grammi fini", "spread"]],
  ["vale", ["valore", "prezzo", "quotazione", "offerta"]],
  ["valore", ["prezzo", "quotazione", "offerta", "stima"]],
  ["valuto", ["valutazione", "prezzo", "peso netto", "titolo", "smontaggio"]],
  ["valutare", ["valutazione", "prezzo", "peso netto", "titolo", "smontaggio"]],
  ["collana", ["gioiello", "oggetto", "pietre", "peso netto", "smontaggio"]],
  ["strumenti", ["attrezzatura", "bilancia", "xrf", "tester"]],
  ["legge", ["normativa", "decreto", "obblighi"]],
  ["licenza", ["tulps", "questura", "oam", "registro"]],
  ["privacy", ["gdpr", "dati personali", "sicurezza"]],
  ["acido", ["pietra di paragone", "corrosivo", "sds"]],
  ["bilancia", ["metrologia", "pesatura", "verificazione"]],
  ["lingotto", ["bullion", "good delivery", "seriale", "titolo", "custodia"]],
  ["lingotti", ["bullion", "good delivery", "seriali", "titolo", "custodia"]],
  ["opo", ["operatore professionale in oro", "registro oam", "legge 7 2000", "dichiarazione oro"]],
  ["infostat", ["uif", "dichiarazione oro", "data entry", "xml", "codice oam"]],
  ["bullion", ["lingotto", "good delivery", "custodia", "riserva aurea"]],
  ["caveau", ["custodia", "stoccaggio", "allocated", "inventario", "assicurazione"]],
  ["allocated", ["segregato", "custodia", "seriale", "proprieta", "inventario"]],
  ["riserve", ["banca d italia", "oro", "custodia", "good delivery"]],
  ["frontiera", ["dogana", "adm", "uif", "trasferimento estero", "dichiarazione"]],
  ["rw", ["monitoraggio fiscale", "attivita estere", "caveau estero", "lingotti"]],
  ["antiriciclaggio", ["sos", "uif", "anomalia", "d.lgs. 231/2007"]],
  ["iva", ["fiscale", "oro da investimento", "reverse charge", "regime del margine"]],
  ["commercialista", ["contabilità", "fiscalità", "bilancio", "adempimenti", "piano dei conti"]],
  ["contabilita", ["commercialista", "prima nota", "partita doppia", "bilancio", "registri"]],
  ["contabile", ["commercialista", "contabilità", "prima nota", "partita doppia"]],
  ["nota", ["prima nota", "scrittura contabile", "documento acquisto"]],
  ["fonderia", ["fusione", "affinazione", "raffineria", "saggio", "campionamento", "conto lavorazione"]],
  ["fonderie", ["fusione", "affinazione", "raffinerie", "impianti", "recupero preziosi"]],
  ["raffineria", ["fonderia", "affinazione", "saggio", "campionamento", "metalli pagabili"]],
  ["raffinerie", ["fonderie", "affinazione", "impianti", "recupero preziosi"]],
  ["fondere", ["fusione", "forno", "crogiolo", "omogeneizzazione", "campionamento"]],
  ["fusione", ["fonderia", "omogeneizzazione", "campionamento", "peso fuso", "scorie"]],
  ["affinazione", ["raffinazione", "separazione", "saggio", "pirometallurgia", "idrometallurgia", "elettrolisi"]],
  ["trattenuta", ["percentuale pagabile", "resa", "costi", "commissione", "spread fixing"]],
  ["trattenute", ["percentuale pagabile", "resa", "costi", "commissioni", "spread fixing"]],
  ["trattiene", ["trattenuta", "percentuale pagabile", "resa", "costi", "commissione", "spread fixing"]],
  ["liquidazione", ["pagamento", "bonifico", "fixing", "conto metallo", "conguaglio"]],
  ["lombardia", ["fonderie lombardia", "raffinerie lombardia", "milano", "bergamo", "brescia", "monza brianza"]],
  ["margine", ["regime del margine", "beni usati", "iva incorporata"]],
  ["magazzino", ["inventario", "rimanenze", "lotto", "giacenza", "cali"]],
  ["rimanenze", ["inventario", "magazzino", "lotto", "costo specifico"]],
  ["cespite", ["cespiti", "ammortamento", "immobilizzazioni materiali"]],
  ["ammortamento", ["cespiti", "strumentazione", "vita utile", "registro beni ammortizzabili"]],
  ["fattura", ["fatturazione elettronica", "sdi", "registri iva", "conservazione"]],
  ["bilancio", ["chiusura", "imposte", "scadenziario", "rimanenze", "cespiti"]],
  ["f24", ["imposte", "versamento", "scadenziario", "commercialista"]],
  ["cash", ["cash flow", "flusso di cassa", "capitale circolante", "controllo di gestione"]],
  ["geologia", ["formazione geologica", "genesi", "giacimento", "mineralizzazione"]],
  ["geologico", ["geologia", "formazione", "giacimento", "mineralizzazione"]],
  ["giacimento", ["geologia", "mineralizzazione", "risorsa", "riserva"]],
  ["placer", ["alluvionale", "secondario", "erosione", "trasporto", "densita"]],
  ["alluvionale", ["placer", "secondario", "erosione", "trasporto"]],
  ["kimberlite", ["diamante", "mantello", "trasporto", "cratone"]],
  ["pge", ["platino", "palladio", "intrusione mafica", "bushveld"]],
  ["bushveld", ["platino", "pge", "intrusione stratificata", "reef"]],
  ["numismatica", ["monete auree", "storia", "specifiche tecniche", "varianti"]],
  ["numismatico", ["monete auree", "storia", "rarita", "conservazione"]],
  ["moneta", ["monete auree", "peso", "titolo", "diametro", "storia"]],
  ["monete", ["monete auree", "peso", "titolo", "diametro", "storia"]],
  ["ritrovamento", ["tesoro", "ripostiglio", "hoard", "archeologia"]],
  ["ritrovamenti", ["tesori", "ripostigli", "hoard", "archeologia"]],
  ["dinastia", ["sovrani", "monete", "storia", "tesoro"]],
  ["sovrano", ["re", "regina", "monete", "storia"]],
  ["vendita", ["vendita consulenziale", "cliente", "offerta", "chiusura", "autonomia"]],
  ["vendere", ["vendita consulenziale", "cliente", "offerta", "decisione libera"]],
  ["persuasione", ["vendita consulenziale", "fiducia", "trasparenza", "autonomia cliente"]],
  ["convincere", ["persuasione etica", "scelta informata", "chiusura consensuale", "autonomia"]],
  ["obiezione", ["gestione obiezioni", "ascolto", "chiarimento", "senza pressione"]],
  ["obiezioni", ["gestione obiezioni", "ascolto", "chiarimento", "senza pressione"]],
  ["negoziare", ["negoziazione", "ancoraggio etico", "benchmark", "concessione"]],
  ["recensioni", ["prova sociale", "fiducia", "autenticità", "claim verificabili"]],
  ["urgenza", ["scarsità", "timestamp", "falsa urgenza", "dark pattern"]],
  ["vulnerabile", ["vulnerabilità", "indebito condizionamento", "sospendere", "persona di fiducia"]],
  ["anziano", ["vulnerabilità", "comprensione", "tempo", "persona di fiducia"]],
  ["gioielleria", ["vendita consulenziale", "storytelling", "disclosure", "trattamenti"]],
  ["profilazione", ["privacy", "consenso", "personalizzazione", "memorie"]],
  ["conversione", ["KPI vendita etica", "qualità", "reclami", "compliance"]],
  ["role", ["role play", "script vendita", "simulazione", "debrief"]]
]);

export function normalizeSectorKnowledgeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTerms(query = "") {
  const normalized = normalizeSectorKnowledgeText(query);
  const rawTerms = [...new Set(normalized
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term)))];
  const originalTerms = [...new Set(rawTerms.map(canonicalSectorToken))];
  const aliasTerms = new Set();
  for (const term of rawTerms) {
    for (const alias of queryAliases.get(term) || []) {
      normalizeSectorKnowledgeText(alias)
        .split(" ")
        .filter((item) => item.length >= 3 && !stopWords.has(item))
        .map(canonicalSectorToken)
        .forEach((item) => aliasTerms.add(item));
    }
  }
  originalTerms.forEach((term) => aliasTerms.delete(term));
  return { normalized, originalTerms, aliasTerms: [...aliasTerms] };
}

function canonicalSectorToken(value = "") {
  const token = String(value || "");
  if (token.length >= 5 && /[aeiou]$/.test(token)) return token.slice(0, -1);
  return token;
}

function sectorTokenSet(value = "") {
  return new Set(normalizeSectorKnowledgeText(value)
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .map(canonicalSectorToken));
}

const topicSearchIndex = AURUM_SECTOR_KNOWLEDGE.topics.map((topic) => {
  const title = normalizeSectorKnowledgeText(topic.title);
  const category = normalizeSectorKnowledgeText(topic.category);
  const keywordPhrases = (topic.keywords || []).map(normalizeSectorKnowledgeText).filter(Boolean);
  const keywords = keywordPhrases.join(" ");
  const body = normalizeSectorKnowledgeText([
    topic.summary,
    ...(topic.facts || []),
    ...(topic.checklist || []),
    ...(topic.warnings || [])
  ].join(" "));
  return {
    topic,
    title,
    category,
    keywordPhrases,
    titleTokens: sectorTokenSet(title),
    categoryTokens: sectorTokenSet(category),
    keywordTokens: sectorTokenSet(keywords),
    bodyTokens: sectorTokenSet(body),
    allTokens: sectorTokenSet(`${title} ${category} ${keywords} ${body}`)
  };
});

const topicTokenFrequency = new Map();
for (const entry of topicSearchIndex) {
  for (const token of entry.allTokens) {
    topicTokenFrequency.set(token, Number(topicTokenFrequency.get(token) || 0) + 1);
  }
}

function tokenRarity(token) {
  const documentFrequency = Number(topicTokenFrequency.get(token) || 0);
  return 1 + Math.log((AURUM_SECTOR_KNOWLEDGE.topics.length + 1) / (documentFrequency + 1));
}

function wholePhraseIncludes(text = "", phrase = "") {
  return Boolean(phrase) && ` ${text} `.includes(` ${phrase} `);
}

const topicIntentBoosts = [
  {
    pattern: /\b(?:accogli[a-z]*|ascolt[a-z]*|domand[a-z]* apert[a-z]*|diagnosi del bisogno|capire il cliente)\b.*\b(?:client[a-z]*|oro|valutazion[a-z]*|vendit[a-z]*)\b|\b(?:client[a-z]*|compro oro)\b.*\b(?:accogli[a-z]*|ascolt[a-z]*|domand[a-z]* apert[a-z]*|diagnosi del bisogno)\b/,
    boosts: { "vendita-ascolto-diagnosi-consulenziale": 420 }
  },
  {
    pattern: /\b(?:spieg[a-z]*|mostr[a-z]*|trasparen[a-z]*)\b.*\b(?:peso|titolo|quotazione|offerta|deduzion[a-z]*|spread)\b|\b(?:peso|titolo|quotazione|deduzion[a-z]*|spread)\b.*\b(?:offerta|spieg[a-z]*|client[a-z]*)\b/,
    boosts: { "vendita-valutazione-trasparente-offerta": 430 }
  },
  {
    pattern: /\b(?:obiezion[a-z]*|ci devo pensare|cliente indecis[a-z]*|altra valutazione)\b/,
    boosts: { "vendita-obiezioni-autonomia-cliente": 440 }
  },
  {
    pattern: /\b(?:negozi(?:o|are|amo|ate|ano|azione|azioni)|ancoraggio|ancora di prezzo|svalutare il cliente|concession[a-z]*)\b.{0,60}\b(?:prezzo|offerta)\b|\b(?:prezzo|offerta)\b.*\b(?:negozi(?:o|are|amo|ate|ano|azione|azioni)|ancoraggio|concession[a-z]*)\b/,
    boosts: { "vendita-negoziazione-ancoraggio-etico": 430 }
  },
  {
    pattern: /\b(?:chiud[a-z]*|closing|procedere|follow up|convinc[a-z]* ogni cliente)\b.*\b(?:vendit[a-z]*|oro|offerta|client[a-z]*)\b|\b(?:vendit[a-z]*|client[a-z]*)\b.*\b(?:chiusura|closing|pensarci|vendere solo|convinc[a-z]* ogni)\b/,
    boosts: { "vendita-chiusura-consensuale-follow-up": 450 }
  },
  {
    pattern: /\b(?:prova sociale|recension[a-z]*|credenzial[a-z]*|certificazion[a-z]*|autorita)\b.*\b(?:fiducia|client[a-z]*|strument[a-z]*|vendit[a-z]*)\b|\b(?:fiducia|client[a-z]*)\b.*\b(?:recension[a-z]*|credenzial[a-z]*|strument[a-z]*|prova sociale)\b/,
    boosts: { "vendita-prova-sociale-autorita-vere": 440 }
  },
  {
    pattern: /\b(?:scarsit[a-z]*|urgenza|countdown|solo oggi|dark pattern|offerta scade)\b/,
    boosts: { "vendita-urgenza-reale-no-dark-pattern": 450 }
  },
  {
    pattern: /\b(?:vulnerabil[a-z]*|anzian[a-z]* confus[a-z]*|lutto|vedov[a-z]*|debit[a-z]*|difficolt[a-z]* economic[a-z]*|persona di fiducia|indebito condizionamento)\b/,
    boosts: { "vendita-limiti-coercizione-vulnerabilita": 750 }
  },
  {
    pattern: /\b(?:vend[a-z]*|present[a-z]*|storytelling|consigli[a-z]*)\b.*\b(?:gioiell[a-z]*|diamant[a-z]*|gemm[a-z]*)\b.*\b(?:trattament[a-z]*|origine|sintetic[a-z]*|disclosure|rapport[a-z]*)\b|\b(?:gioielleria|gioiell[a-z]*|diamant[a-z]*)\b.*\b(?:vend[a-z]*|storytelling|dichiar[a-z]*|trattament[a-z]*|origine)\b/,
    boosts: { "gioielleria-storytelling-disclosure-consulenziale": 460 }
  },
  {
    pattern: /\b(?:compleanno|lutto|confidenz[a-z]*|memori[a-z]*|profilazion[a-z]*|dat[a-z]* sensibil[a-z]*)\b.*\b(?:convinc[a-z]*|vendit[a-z]*|client[a-z]*|pressione|prezzo)\b|\b(?:personalizz[a-z]*|crm|marketing)\b.*\b(?:privacy|consenso|profilazion[a-z]*)\b/,
    boosts: { "vendita-privacy-personalizzazione-consentita": 900 }
  },
  {
    pattern: /\b(?:kpi|metric[a-z]*|misur[a-z]*|scorecard|incentiv[a-z]*)\b.*\b(?:vendit[a-z]*|conversione|qualita|operator[a-z]*)\b|\b(?:conversione|qualita della vendita)\b.*\b(?:kpi|metric[a-z]*|misur[a-z]*)\b/,
    boosts: { "vendita-kpi-qualita-formazione": 450 }
  },
  {
    pattern: /\b(?:role ?play|simulazion[a-z]*|copione|script.{0,30}(?:completo|dialogo|role ?play))\b.*\b(?:compro oro|vendit[a-z]*|client[a-z]*|obiezion[a-z]*)\b|\b(?:formazione avanzata|allenamento)\b.*\b(?:vendit[a-z]*|compro oro|gioielleria)\b/,
    boosts: { "vendita-script-roleplay-compro-oro": 470 }
  },
  {
    pattern: /\b(?:formazione|formarsi|forma|genesi|geologia|geologico|giaciment[a-z]*|mineralizz[a-z]*|placer|alluvional[a-z]*|orogenic[a-z]*|epitermal[a-z]*)\b.*\boro\b|\boro\b.*\b(?:formazione|formarsi|forma|genesi|geologia|geologico|giaciment[a-z]*|mineralizz[a-z]*|placer|alluvional[a-z]*|orogenic[a-z]*|epitermal[a-z]*)\b/,
    boosts: { "geologia-oro-primario-placer": 340 }
  },
  {
    pattern: /\b(?:formazione|formarsi|forma|genesi|geologia|geologico|giaciment[a-z]*|mineralizz[a-z]*|vms|sedex|supergenic[a-z]*)\b.*\bargento\b|\bargento\b.*\b(?:formazione|formarsi|forma|genesi|geologia|geologico|giaciment[a-z]*|mineralizz[a-z]*|vms|sedex|supergenic[a-z]*)\b/,
    boosts: { "geologia-argento-giacimenti": 350 }
  },
  {
    pattern: /\b(?:diamant[a-z]*|kimberlit[a-z]*|lamproit[a-z]*)\b.*\b(?:formazione|formarsi|forma|genesi|geologia|mantello|profondita|trasport[a-z]*|alluvional[a-z]*)\b|\b(?:formazione|formarsi|forma|genesi|geologia|mantello|profondita|trasport[a-z]*|alluvional[a-z]*)\b.*\b(?:diamant[a-z]*|kimberlit[a-z]*|lamproit[a-z]*)\b/,
    boosts: { "geologia-diamante-mantello-kimberlite": 360 }
  },
  {
    pattern: /\b(?:platino|pge|palladio|rodio|bushveld|stillwater|great dyke|norilsk|cromite|cromitite)\b.*\b(?:formazione|formarsi|forma|genesi|geologia|giaciment[a-z]*|intrusion[a-z]*|reef|prova|dimostra)\b|\b(?:formazione|formarsi|forma|genesi|geologia|giaciment[a-z]*|intrusion[a-z]*|reef|prova|dimostra)\b.*\b(?:platino|pge|palladio|rodio|bushveld|stillwater|great dyke|norilsk|cromite|cromitite)\b/,
    boosts: { "geologia-platino-pge": 360 }
  },
  {
    pattern: /\b(?:presenza|mineralizzazione|risorsa|riserva|tenore|tonnellaggio)\b.*\b(?:geologia|giacimento|oro|argento|platino|diamante|preziosi)\b|\b(?:geologia|giacimento|preziosi)\b.*\b(?:presenza|mineralizzazione|risorsa|riserva|tenore|tonnellaggio)\b/,
    boosts: { "geologia-preziosi-processi-risorse": 310 }
  },
  {
    pattern: /\b(?:bullion|numismatic[a-z]*|specifiche tecniche|peso|titolo|diametro|bordo|dritto|rovescio|anno|zecca|variante|autentic[a-z]*)\b.*\b(?:monet[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|american eagle)\b|\b(?:monet[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|american eagle)\b.*\b(?:bullion|numismatic[a-z]*|specifiche tecniche|peso|titolo|diametro|bordo|dritto|rovescio|anno|zecca|variante|autentic[a-z]*)\b/,
    boosts: { "monete-auree-metodo-storico-tecnico": 320 }
  },
  {
    pattern: /\b(?:monet[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|american eagle)\b.*\b(?:storia|paes[a-z]*|sovran[a-z]*|dinasti[a-z]*|re|regina|imperator[a-z]*|identita nazionale)\b|\b(?:storia|paes[a-z]*|sovran[a-z]*|dinasti[a-z]*|re|regina|imperator[a-z]*|identita nazionale)\b.*\b(?:monet[a-z]*|sterlina|sovereign|marengo|krugerrand|libertad|panda|maple leaf|american eagle)\b/,
    boosts: { "monete-auree-paesi-sovrani-dinastie": 330 }
  },
  {
    pattern: /\b(?:ritrovament[a-z]*|tesor[a-z]*|ripostigli[a-z]*|hoard|scopert[a-z]*|archeolog[a-z]*)\b.*\b(?:monet[a-z]*|oro|aure[a-z]*|sovran[a-z]*|dinasti[a-z]*|re|regina)\b|\b(?:monet[a-z]*|oro|aure[a-z]*|sovran[a-z]*|dinasti[a-z]*)\b.*\b(?:ritrovament[a-z]*|tesor[a-z]*|ripostigli[a-z]*|hoard|scopert[a-z]*|archeolog[a-z]*)\b/,
    boosts: { "ritrovamenti-monete-oro-sovrani-dinastie": 370 }
  },
  {
    pattern: /\b(?:vale|valore|valut[a-z]*|prezzo|quotazione|offerta|stima)\b.*\b(?:oro|argento|platino|palladio|metallo|usato)\b|\b(?:oro|argento|platino|palladio|metallo|usato)\b.*\b(?:vale|valore|valut[a-z]*|prezzo|quotazione|offerta|stima)\b/,
    boosts: { "prezzo-quotazione-spread": 90 }
  },
  {
    pattern: /\b(?:collana|anello|bracciale|gioiello|oggetto)\b.*\b(?:pietra|pietre|gemma|gemme)\b|\b(?:pietra|pietre|gemma|gemme)\b.*\b(?:collana|anello|bracciale|gioiello|oggetto)\b/,
    boosts: { "flusso-accettazione-tecnica": 100, "calo-fusione-campionamento": 65 }
  },
  {
    pattern: /\b(?:tester|termico|pass|refer|screening)\b.*\b(?:diamante|diamanti|sintetico|laboratory grown)\b|\b(?:diamante|diamanti|sintetico|laboratory grown)\b.*\b(?:tester|termico|pass|refer|screening)\b/,
    boosts: { "screening-diamanti-pass-refer": 90 }
  },
  {
    pattern: /\bxrf\b.*\b(?:placcato|rivestito|rodiato|superficie)\b|\b(?:placcato|rivestito|rodiato|superficie)\b.*\bxrf\b/,
    boosts: { "xrf-fluorescenza-raggi-x": 60 }
  },
  {
    pattern: /\b(?:smeraldo|rubino|zaffiro|ametista|acquamarina|tanzanite|topazio|opale|granato)\b.*\b(?:riconosc[a-z]*|identific[a-z]*|sintetic[a-z]*|natural[a-z]*|trattat[a-z]*)\b|\b(?:riconosc[a-z]*|identific[a-z]*|sintetic[a-z]*|natural[a-z]*|trattat[a-z]*)\b.*\b(?:smeraldo|rubino|zaffiro|ametista|acquamarina|tanzanite|topazio|opale|granato)\b/,
    boosts: { "gemme-identificazione-prudente": 120 }
  },
  {
    pattern: /\b(?:requisit[a-z]*|iscri[a-z]*|registro|capitale|forma societaria|onorabilita)\b.*\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b|\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b.*\b(?:requisit[a-z]*|iscri[a-z]*|registro|capitale|forma societaria|onorabilita)\b/,
    boosts: { "opo-requisiti-iscrizione-oam": 190 }
  },
  {
    pattern: /\b(?:differenza|perimetro|operativita|oro industriale|materiale da fusione|conto lavorazione|operazioni finanziarie)\b.*\b(?:opo|oco|operator[a-z]* professional[a-z]* in oro)\b|\b(?:opo|oco|operator[a-z]* professional[a-z]* in oro)\b.*\b(?:differenza|perimetro|operativita|oro industriale|materiale da fusione|conto lavorazione)\b/,
    boosts: { "opo-perimetro-operativita-oro": 185 }
  },
  {
    pattern: /\b(?:adeguata verifica|titolare effettivo|antiriciclaggio|sos|profilo di rischio|filiera|conservazione)\b.*\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b|\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b.*\b(?:adeguata verifica|titolare effettivo|antiriciclaggio|sos|profilo di rischio|filiera|conservazione)\b/,
    boosts: { "opo-antiriciclaggio-controlli": 195 }
  },
  {
    pattern: /\b(?:infostat|data entry|upload xml|codice oam|orodp|ricevuta)\b.*\b(?:oro|opo|uif|dichiarazione)\b|\b(?:dichiarazione oro|opo|uif)\b.*\b(?:infostat|data entry|upload xml|codice oam|orodp|ricevuta)\b/,
    boosts: { "opo-dichiarazioni-oro-uif-infostat": 205 }
  },
  {
    pattern: /\b(?:fiscalita|iva|contabilita|fattur[a-z]*|reverse charge|imposte|registri iva)\b.*\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b|\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b.*\b(?:fiscalita|iva|contabilita|fattur[a-z]*|reverse charge|imposte|registri iva)\b/,
    boosts: { "opo-fiscalita-iva-contabilita": 205 }
  },
  {
    pattern: /\b(?:controll[a-z]*|autorita|ispezion[a-z]*|sanzion[a-z]*|guardia di finanza|conservazione|registrazion[a-z]*)\b.*\b(?:opo|operator[a-z]* professional[a-z]* in oro|oam|uif|banca d italia)\b|\b(?:opo|operator[a-z]* professional[a-z]* in oro)\b.*\b(?:controll[a-z]*|autorita|ispezion[a-z]*|sanzion[a-z]*|guardia di finanza|conservazione|registrazion[a-z]*)\b/,
    boosts: { "opo-controlli-autorita-sanzioni": 215 }
  },
  {
    pattern: /\b(?:10 000|10000|2 500|2500|aggregazione|soglia)\b.*\b(?:dichiarazione oro|opo|uif)\b|\b(?:dichiarazione oro|opo|uif)\b.*\b(?:10 000|10000|2 500|2500|aggregazione|soglia)\b/,
    boosts: { "operatori-professionali-oro-dichiarazioni": 165 }
  },
  {
    pattern: /\b(?:privat[a-z]*|persona fisica|possesso|detenzione|cassaforte|tenere|tiene)\b.*\b(?:lingott[a-z]*|oro)\b.*\b(?:dichiar[a-z]*|obblig[a-z]*|uif)\b|\b(?:dichiar[a-z]*|obblig[a-z]*|uif)\b.*\b(?:privat[a-z]*|persona fisica|possesso|detenzione|cassaforte)\b.*\b(?:lingott[a-z]*|oro)\b/,
    boosts: { "privati-possesso-trasferimenti-oro": 210 }
  },
  {
    pattern: /\b(?:frontiera|dogana|adm|transfrontalier[a-z]*|estero|esport[a-z]*|import[a-z]*)\b.*\b(?:lingott[a-z]*|oro)\b|\b(?:lingott[a-z]*|oro)\b.*\b(?:frontiera|dogana|adm|transfrontalier[a-z]*|estero|esport[a-z]*|import[a-z]*)\b/,
    boosts: { "oro-transfrontaliero-dogane-uif": 190 }
  },
  {
    pattern: /\b(?:good delivery|buona consegna|400 once|400 oz|12 4 kg|12 5 kg|raffineria lbma|standard)\b.*\b(?:lingott[a-z]*|oro|storia)\b|\b(?:lingott[a-z]*|oro|storia)\b.*\b(?:good delivery|buona consegna|400 once|400 oz|raffineria lbma)\b/,
    boosts: { "lingotti-good-delivery-storia": 210 }
  },
  {
    pattern: /\b(?:xrf|ultrasuoni|densita|certific[a-z]*|autentic[a-z]*|fals[a-z]*|tungsteno)\b.*\blingott[a-z]*\b|\blingott[a-z]*\b.*\b(?:xrf|ultrasuoni|densita|certific[a-z]*|autentic[a-z]*|fals[a-z]*|tungsteno)\b/,
    boosts: { "lingotti-contraffazioni": 225 }
  },
  {
    pattern: /\b(?:custod[a-z]*|stocc[a-z]*|allocated|segregat[a-z]*|unallocated|caveau|inventario|audit|assicur[a-z]*)\b.*\b(?:lingott[a-z]*|bullion|oro fisico)\b|\b(?:lingott[a-z]*|bullion|oro fisico)\b.*\b(?:custod[a-z]*|stocc[a-z]*|allocated|segregat[a-z]*|unallocated|caveau|inventario|audit|assicur[a-z]*)\b/,
    boosts: { "lingotti-stoccaggio-custodia-audit": 205 }
  },
  {
    pattern: /\b(?:banca d italia|bankitalia)\b.*\b(?:oro|riserve|lingott[a-z]*|storia|custodia|good delivery)\b|\b(?:riserve auree|storia delle riserve)\b/,
    boosts: { "banca-italia-riserve-oro-storia": 210 }
  },
  {
    pattern: /\b(?:plusvalenza|reddito diverso|costo non documentato|costo documentato|26 per cento|tassazione|fiscalita)\b.*\b(?:privat[a-z]*|lingott[a-z]*|monet[a-z]*|oro)\b|\b(?:privat[a-z]*|lingott[a-z]*|monet[a-z]*|oro)\b.*\b(?:plusvalenza|reddito diverso|costo non documentato|26 per cento|tassazione)\b/,
    boosts: { "privati-fiscalita-lingotti-plusvalenze": 205 }
  },
  {
    pattern: /\b(?:quadro rw|monitoraggio fiscale|attivita estere|caveau estero|deposito estero|ivafe)\b.*\b(?:lingott[a-z]*|oro|privat[a-z]*)\b|\b(?:lingott[a-z]*|oro|privat[a-z]*)\b.*\b(?:quadro rw|monitoraggio fiscale|attivita estere|caveau estero|deposito estero|ivafe)\b/,
    boosts: { "privati-stoccaggio-estero-monitoraggio-rw": 215 }
  },
  {
    pattern: /\b(?:commercialista|contabilita|contabile|fiscalista)\b.*\b(?:compro oro|negozio|oro|preziosi|attivita|lavoro|gestione)\b|\b(?:compro oro|negozio|oro|preziosi|attivita)\b.*\b(?:commercialista|contabilita|contabile|fiscalista)\b/,
    boosts: { "commercialista-compro-oro-mandato-flusso": 130 }
  },
  {
    pattern: /\bprima nota\b|\b(?:registr[a-z]*|contabilizz[a-z]*|scrittur[a-z]*)\b.*\b(?:acquisto|privato|lotto|pagamento)\b/,
    boosts: { "prima-nota-acquisti-privati-partita-doppia": 130 }
  },
  {
    pattern: /\b(?:classific[a-z]*|trattamento|regime)\b.*\b(?:lotto|gioiello|oro usato|rottame|fusione|investimento)\b/,
    boosts: { "classificazione-fiscale-lotti-preziosi": 105 }
  },
  {
    pattern: /\bregime (?:iva )?del margine\b|\b(?:margine)\b.*\b(?:gioiello|bene usato|privato|iva)\b/,
    boosts: { "iva-margine-gioielli-usati": 145 }
  },
  {
    pattern: /\b(?:reverse charge|inversione contabile|n6 2|td16)\b|\b(?:fonderia|affinazione|fusione)\b.*\b(?:iva|fattur[a-z]*|reverse charge|inversione contabile|n6 2|td16)\b|\b(?:iva|fattur[a-z]*|reverse charge|inversione contabile|n6 2|td16)\b.*\b(?:fonderia|affinazione|fusione)\b/,
    boosts: { "reverse-charge-oro-industriale-fonderia": 150 }
  },
  {
    pattern: /\b(?:rapporto|filiera|conferiment[a-z]*|contratt[a-z]*|destinatar[a-z]*|catena di custodia|conto lavorazione)\b.*\b(?:fonderia|raffineria|compro oro|oco)\b|\b(?:fonderia|raffineria)\b.*\b(?:compro oro|oco|negozio)\b.*\b(?:rapporto|filiera|conferiment[a-z]*|contratt[a-z]*|destinatar[a-z]*)\b/,
    boosts: { "fonderia-filiera-compro-oro": 260 }
  },
  {
    pattern: /\b(?:come funziona|procedura|processo|fasi|pesat[a-z]*|forno|crogiol[a-z]*|omogeneizz[a-z]*|campion[a-z]*|dip sample)\b.*\b(?:fusione|fondere|fonderia|lotto)\b|\b(?:fusione|fondere|fonderia|lotto)\b.*\b(?:come funziona|procedura|processo|fasi|pesat[a-z]*|forno|crogiol[a-z]*|omogeneizz[a-z]*|campion[a-z]*)\b/,
    boosts: { "fonderia-fusione-omogeneizzazione-campionamento": 270 }
  },
  {
    pattern: /\b(?:separ[a-z]*|purific[a-z]*|affin[a-z]*|raffin[a-z]*|saggio|fire assay|coppellazione|pirometallurg[a-z]*|idrometallurg[a-z]*|elettrolit[a-z]*)\b.*\b(?:oro|argento|rame|lega|leghe|pgm|metall[a-z]*)\b|\b(?:oro|argento|rame|lega|leghe|pgm)\b.*\b(?:separ[a-z]*|purific[a-z]*|affin[a-z]*|raffin[a-z]*|saggio|coppellazione)\b/,
    boosts: { "fonderia-saggio-affinazione-separazione-leghe": 280 }
  },
  {
    pattern: /\b(?:percentuale|margine|trattenut[a-z]*|trattien[a-z]*|costo|costi|commission[a-z]*|spread)\b.*\b(?:fonderia|raffineria|fusione|affinazione|lotto)\b|\b(?:fonderia|raffineria)\b.*\b(?:percentuale|margine|trattenut[a-z]*|trattien[a-z]*|costo|costi|commission[a-z]*|resa|calo|spread)\b/,
    boosts: { "fonderia-costi-trattenute-margine": 290 }
  },
  {
    pattern: /\b(?:pag[a-z]*|pagamento|liquidazion[a-z]*|bonifico|anticipo|saldo|conguaglio|conto metallo|ritiro fisico|fixing)\b.*\b(?:fonderia|raffineria|lotto|saggio|compro oro)\b|\b(?:fonderia|raffineria)\b.*\b(?:pag[a-z]*|liquidazion[a-z]*|bonifico|anticipo|saldo|conguaglio|conto metallo|fixing)\b/,
    boosts: { "fonderia-pagamenti-conto-metallo": 300 }
  },
  {
    pattern: /\b(?:fonderie|raffinerie|fonderia|raffineria)\b.*\b(?:lombardia|milano|bergamo|brescia|monza|brianza|bussero|burago|pero|gussago|albino)\b|\b(?:lombardia|milano|bergamo|brescia|monza|brianza)\b.*\b(?:fonderie|raffinerie|fonderia|raffineria|fond[a-z]*|affin[a-z]*)\b/,
    boosts: { "fonderie-lombardia-verificate": 320 }
  },
  {
    pattern: /\b(?:fattura elettronica|sdi|scarto sdi|registri? iva|conservazione digitale|bollo)\b/,
    boosts: { "fatturazione-elettronica-registri-iva-conservazione": 130 }
  },
  {
    pattern: /\b(?:inventario|rimanenze|magazzino|giacenze|cut off|costo specifico)\b.*\b(?:lotto|oro|preziosi|compro oro|fine anno|chiusura|calo|fusione)\b|\b(?:lotto|oro|preziosi|compro oro)\b.*\b(?:inventario|rimanenze|magazzino|giacenze|cut off)\b/,
    boosts: { "inventario-rimanenze-lotti-cali": 145 }
  },
  {
    pattern: /\b(?:cespite|cespiti|ammortamento|immobilizzazione)\b.*\b(?:xrf|bilancia|strumento|strumentazione|cassaforte|microscopio)\b|\b(?:xrf|bilancia|strumento|strumentazione|cassaforte|microscopio)\b.*\b(?:cespite|cespiti|ammortamento|immobilizzazione)\b/,
    boosts: { "cespiti-ammortamenti-strumentazione": 150 }
  },
  {
    pattern: /\b(?:f24|lipe|dichiarazione iva|dichiarazione redditi|scadenziario|chiusura mensile|chiusura annuale|bilancio)\b/,
    boosts: { "chiusure-bilancio-imposte-scadenziario": 125 }
  },
  {
    pattern: /\b(?:cash flow|flusso di cassa|break even|capitale circolante|controllo di gestione|giorni di magazzino|kpi)\b|\b(?:margine|redditivita)\b.*\b(?:lotto|negozio|sede|gestione)\b/,
    boosts: { "controllo-gestione-margini-cash-flow": 140 }
  }
];

function topicScore(entry, normalizedQuery, originalTerms, aliasTerms) {
  let score = 0;
  let anchored = false;
  let originalCoverage = 0;
  if (entry.title === normalizedQuery) {
    score += 500;
    anchored = true;
  } else if (wholePhraseIncludes(entry.title, normalizedQuery)) {
    score += 40;
    anchored = true;
  }
  for (const phrase of entry.keywordPhrases) {
    const phraseWords = phrase.split(" ").filter(Boolean);
    if (phraseWords.length >= 2 && wholePhraseIncludes(normalizedQuery, phrase)) {
      score += 18 + Math.min(12, phraseWords.length * 3);
      anchored = true;
    }
  }
  for (const term of originalTerms) {
    const rarity = tokenRarity(term);
    const matches = entry.allTokens.has(term);
    if (matches) originalCoverage += 1;
    if (entry.titleTokens.has(term)) {
      score += 7 * rarity;
      anchored = true;
    }
    if (entry.categoryTokens.has(term)) {
      score += 2 * rarity;
      anchored = true;
    }
    if (entry.keywordTokens.has(term)) {
      score += 6 * rarity;
      anchored = true;
    }
    if (entry.bodyTokens.has(term)) score += 1 * rarity;
  }
  for (const term of aliasTerms) {
    const rarity = tokenRarity(term);
    if (entry.titleTokens.has(term)) score += 1.75 * rarity;
    if (entry.keywordTokens.has(term)) score += 1.5 * rarity;
    if (entry.bodyTokens.has(term)) score += 0.25 * rarity;
  }
  if (originalCoverage) score += (originalCoverage / Math.max(1, originalTerms.length)) * 8;
  for (const intent of topicIntentBoosts) {
    if (intent.pattern.test(normalizedQuery)) {
      const boost = Number(intent.boosts[entry.topic.id] || 0);
      score += boost;
      if (boost > 0) anchored = true;
    }
  }
  return { score: Math.round(score * 100) / 100, anchored };
}

export function searchSectorKnowledge(query = "", options = {}) {
  const limit = Math.max(1, Math.min(8, Number(options.limit || 4)));
  const minimumScore = Number(options.minScore || 5);
  const { normalized, originalTerms, aliasTerms } = queryTerms(query);
  if (!normalized || !originalTerms.length) return [];
  const ranked = topicSearchIndex
    .map((entry) => ({ topic: entry.topic, ...topicScore(entry, normalized, originalTerms, aliasTerms) }))
    .filter((item) => item.anchored && item.score >= minimumScore)
    .sort((left, right) => right.score - left.score || left.topic.title.localeCompare(right.topic.title, "it"));
  const relevanceFloor = Math.max(minimumScore, Number(ranked[0]?.score || 0) * 0.45);
  return ranked
    .filter((item) => item.score >= relevanceFloor)
    .slice(0, limit)
    .map(({ topic, score }) => ({ topic, score }));
}

export function sectorKnowledgeSources(matches = [], limit = 8) {
  const unique = new Map();
  for (const match of matches) {
    for (const source of match.topic?.sources || []) {
      if (!unique.has(source.url)) {
        unique.set(source.url, {
          title: source.title,
          url: source.url,
          authority: source.authority || "",
          verifiedAt: source.verifiedAt || AURUM_SECTOR_KNOWLEDGE.verifiedAt,
          status: source.status || "vigente/verificata"
        });
      }
    }
  }
  return [...unique.values()].slice(0, Math.max(1, Math.min(12, Number(limit || 8))));
}

export function formatSectorKnowledgeContext(matches = []) {
  return matches.map(({ topic, score }, index) => {
    const sources = (topic.sources || []).map((source) => `${source.title} — ${source.url}`).join(" | ");
    return [
      `[Conoscenza settoriale ${index + 1}; id=${topic.id}; categoria=${topic.category}; punteggio=${score}]`,
      `Titolo: ${topic.title}`,
      `Sintesi: ${topic.summary}`,
      `Dati verificati: ${(topic.facts || []).join(" | ")}`,
      `Procedura: ${(topic.checklist || []).join(" | ")}`,
      `Limiti e avvertenze: ${(topic.warnings || []).join(" | ")}`,
      `Fonti: ${sources}`,
      `Verificato il: ${AURUM_SECTOR_KNOWLEDGE.verifiedAt}`
    ].filter(Boolean).join("\n");
  }).join("\n\n---\n\n");
}

export function buildSectorKnowledgeAnswer(question = "", matches = searchSectorKnowledge(question)) {
  if (!matches.length) {
    return {
      risposta: "Non ho trovato una risposta sufficientemente specifica nella base settoriale verificata di Aurum. Formula la domanda indicando materiale, prova, strumento o adempimento; per decisioni legali, fiscali o diagnostiche usa anche il professionista competente.",
      sources: []
    };
  }
  const primaryMatch = matches[0];
  const primary = primaryMatch.topic;
  const facts = (primary.facts || []).slice(0, 8);
  const checklist = (primary.checklist || []).slice(0, 6);
  const warnings = (primary.warnings || []).slice(0, 4);
  const sources = sectorKnowledgeSources([primaryMatch], 8);
  const lines = [
    primary.title,
    "",
    primary.summary
  ];
  if (facts.length) lines.push("", "Dati verificati:", ...facts.map((fact) => `• ${fact}`));
  if (checklist.length) lines.push("", "Come operare:", ...checklist.map((step, index) => `${index + 1}. ${step}`));
  if (warnings.length) lines.push("", "Attenzione:", ...warnings.map((warning) => `• ${warning}`));
  lines.push(
    "",
    `Fonti verificate il ${AURUM_SECTOR_KNOWLEDGE.verifiedAt}:`,
    ...sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`),
    "",
    primary.category === "Normativa e compliance"
      ? "Informazione operativa generale: per il caso concreto verifica il testo vigente e il professionista competente."
      : ["Fiscalità", "Contabilità e controllo"].includes(primary.category)
        ? "Informazione teorica specialistica: il trattamento reale dipende da forma giuridica, regime contabile, documenti e fatti dell’operazione e deve essere validato dal commercialista incaricato."
        : primary.category === "Lingotti e riserve"
          ? "Informazione specialistica generale: per custodia, assicurazione, fiscalità o trasferimenti verifica contratto, giurisdizione e caso concreto con il professionista competente."
          : primary.category === "Fonderia e raffinazione"
            ? "Informazione professionale generale: fusione, saggio e affinazione richiedono impianto idoneo, personale formato e condizioni contrattuali verificate; non eseguire lavorazioni industriali in negozio."
            : primary.category === "Geologia dei preziosi"
              ? "Informazione geologica generale: presenza, mineralizzazione, risorsa e riserva non sono sinonimi. Provenienza, tenore e valore richiedono campionamento rappresentativo, analisi professionali e interpretazione di un geologo o laboratorio qualificato."
              : primary.category === "Numismatica e storia"
                ? "Informazione storico-numismatica generale: verifica sempre anno, zecca, variante, autenticità e stato di conservazione del singolo esemplare; il racconto storico non costituisce una stima economica."
                : primary.category === "Vendita consulenziale e comunicazione"
                  ? "Vendita consulenziale professionale: nessuna tecnica può garantire la conversione di ogni cliente. Usa queste indicazioni solo per aumentare chiarezza, fiducia e qualità della decisione; autonomia, decisione libera e scelta informata vengono prima della chiusura. Il cliente deve restare libero di vendere tutto, vendere solo alcuni oggetti, confrontare, pensarci o non vendere."
                : "Le prove di banco sono screening: una conclusione definitiva può richiedere un laboratorio qualificato."
  );
  return { risposta: lines.join("\n"), sources };
}
