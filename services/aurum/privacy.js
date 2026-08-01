const fiscalCodePattern = /[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]/i;
const ibanPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const internationalPhonePattern = /\+\d{1,3}(?:[\s().-]*\d){7,12}\b/;
const localPhonePattern = /\b(?:3\d{2}|0\d{1,3})(?:[\s.\/-]*\d){6,9}\b/;
const vatPattern = /\b(?:P\.?\s*IVA|partita\s+IVA)\s*[:#-]?\s*(?:IT\s*)?\d{11}\b/i;
const addressPattern = /\b(?:via|viale|piazza|corso|largo|vicolo)\s+[\p{L}'’ .-]{2,80}\s+\d{1,5}(?:\s*[A-Z])?\b/iu;
const birthDatePattern = /\b(?:nato|nata|data\s+di\s+nascita)\b.{0,60}\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\b/iu;
const documentPattern = /\b(?:passaporto|patente|carta\s+d['’]?identit[aà]|documento)(?:\s+(?:n|numero))?\s*[:#-]?\s*(?=[A-Z0-9-]{5,24}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]{5,24}\b/i;
const vehiclePlatePattern = /\b(?:targa)\s*[:#-]?\s*[A-Z]{2}\s*\d{3}\s*[A-Z]{2}\b/i;
const labelledNamePattern = /\b(?:cliente|sig(?:nor[ae])?|nome|cognome)\s*[:=-]\s*[\p{L}'’ -]{2,80}/iu;
const spokenNamePattern = /\b(?:il\s+)?cliente\s+(?:e|è|si\s+chiama)\s+[\p{Lu}][\p{Ll}'’-]+(?:\s+[\p{Lu}][\p{Ll}'’-]+){1,2}\b/u;
const preferredNamePattern = /\b(?:mi\s+chiamo|chiamami|puoi\s+chiamarmi|vorrei\s+che\s+mi\s+chiamassi)\s+[\p{L}][\p{L}'’-]{1,40}(?:\s+[\p{L}][\p{L}'’-]{1,40}){0,2}(?=[,.;!?]|\s+(?:e|ma|perch[eé]|quando|oggi|sono|preferisco)\b|$)/iu;
const birthdayPattern = /\b(?:il\s+mio\s+)?compleanno\s+(?:[eè]\s+(?:il\s+)?|cade\s+il\s+)?(?:\d{1,2}[\/.-]\d{1,2}(?:[\/.-](?:19|20)?\d{2})?|\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/iu;
const sensitiveContextKeyPattern = /^(?:availableMemories|userName|cliente|customer|nome|cognome|indirizzo|residenza|domicilio|documento|documentNumber|passaporto|patente|email|telefono|phone|iban|codiceFiscale|codice_fiscale|fiscalCode|taxCode|partitaIva|partita_iva|dataNascita|data_nascita|birthDate|dateOfBirth|signatureImage|signatureImages|signatureData|capture|captures|captureAttachments|attachments|identityAttachments|paymentProof)$/i;
const sensitiveJsonValuePattern = /("(?:cliente|customer|nome|cognome|indirizzo|residenza|domicilio|documento|documentNumber|passaporto|patente|email|telefono|phone|iban|codiceFiscale|codice_fiscale|partitaIva|partita_iva|dataNascita|data_nascita)"\s*:\s*)"[^"]*"/gi;
const aurumCaseMixedIdentifierPattern = /\b(?=[A-Z0-9-]{5,24}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9-]{5,24}\b/i;
const aurumCaseDatePattern = /\b\d{1,2}[\/. -]\d{1,2}[\/. -](?:19|20)\d{2}\b/;
const aurumCaseLongNumericIdentifierPattern = /(?<![\d.,])\d{9,16}(?![\d.,])/;

function normalizeAurumCaseWord(value = "") {
  return String(value || "").toLocaleLowerCase("it").normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeChemicalFormula(value = "") {
  const subscripts = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  return String(value || "")
    .replace(/[₀-₉]/gu, (digit) => subscripts[digit])
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("it");
}

const aurumCaseAllowedChemicalFormulas = new Set([
  "(Mg,Fe)₂SiO₄",
  "Al₂O₃",
  "Al₂SiO₄(F,OH)₂",
  "BeAl₂O₄",
  "Be₃Al₂Si₆O₁₈",
  "C",
  "CaCO₃ (aragonite) e conchiolina",
  "CaCO₃ con componente organica",
  "Ca₂(Mg,Fe)₅Si₈O₂₂(OH)₂",
  "Ca₂Al₃(SiO₄)(Si₂O₇)O(OH)",
  "Ca₂Al₃Si₃O₁₂",
  "Ca₃Al₂(SiO₄)₃ con Cr/V",
  "Ca₃Fe₂(SiO₄)₃",
  "Composizione Na-K-Ca-Al-Si variabile",
  "Composizione silicea variabile",
  "CuAl₆(PO₄)₄(OH)₈·4H₂O",
  "Cu₂CO₃(OH)₂",
  "Fe₃Al₂(SiO₄)₃",
  "Formula complessa a borosilicati",
  "MgAl₂O₄",
  "Mg₃Al₂(SiO₄)₃",
  "Miscela mineralogica, componente principale lazurite",
  "Miscela organica complessa",
  "NaAlSi₂O₆",
  "SiC",
  "SiO₂",
  "SiO₂·nH₂O",
  "Soluzione solida piropo-almandino",
  "Variabile secondo gli strati",
  "Vetro, plastica o nucleo rivestito",
  "ZrO₂ stabilizzato",
  "ZrSiO₄"
].map(normalizeChemicalFormula));

const aurumCaseAllowedWords = new Set(`
  a ad al alla alle allo anche archiviata archiviato associata associato compatibile con conforme contro
  da dal dall dalla dalle dei del dell della delle dello di dopo durante e ed è era essere gli ha hanno
  i il in la le libero lo ma nel nella nelle nello non o oppure per più prima può possono quando senza
  sono stata stati stato su sul sulla tra un una uno
  acqua acido acquisto acquisti ai allarme alia alias alcalino ametista analisi analizzato anello anomalia
  anonima anonimo anonimizzata anonimizzato approvata approvato appresa argento aria assemblata assemblato
  assay aurum autorità avvertenza bilancia bianco bloccante bracciale bullion buyback
  calibrato calibrazione calo campione carati caso catena categoria ceduto cliente_anonimo codificato collana
  colorato colore comparazione conclusivo conforme conformità confermare controllo corallo corretta corretto
  danneggiato decisione densità descrizione description diamante dichiarazione differenza documento_omesso doppietta durezza
  escalation eseguito esito errore falso fancy fatti fatto final finale fino fonderia fonte ftir fusione
  gemma gemmologico gia gioiello grado grezza grezzo hpht idrostatico imitazione imperiale incerto inclusione
  incolore indicatore indice iniziale interno irraggiamento laboratorio lega lezione lingotto lotto
  manuale margine materiale media metallo millesimi mohs moissanite moneta naturale netto non_conclusivo
  nota note oggetto opaco operazione oreficeria organico origine oro oam oco opo ottico
  palladio parametro passaggio perla peso pietra platino positivo pratica preliminare pressione procedura
  protocollo prova pseudonimizzata pseudonimizzato punzone purezza quarzo reagente reale recupero reperto resa
  responsabile ri riconciliazione riferimento riscaldata riscaldato risultato rischio rubino scheda score
  screening sicurezza simulante sintesi sintetica sintetico smeraldo soggetto soglia spettro spettrometro
  strumento struttura tanzanite tecnica tecnico temperatura tester test tests performed titolo topazio
  traccia trattamento trattata trattato tripletta uif unità uv valore vendita verifica verificata verificato
  volume xrf zaffiro
  acquamarina agata alessandrite almandino ambra avanzati blu calcedonio calibro chelsea citrino coltivata
  conoscopio contatto corta crisoberillo cubica cz daylight demantoide diamanti dicroscopio digitale doppiette elettrico eliodoro
  filtro fotocamera fume fumé fuoco gatto gemmologici giadeite goshenite granato ialino idrostatica indicolite
  labradorite lampada lapislazzuli lente liquido luce luna lunga macro magneti malachite microscopio morganite
  nefrite occhio onda onice opale paraiba paraíba pasta peridoto piropo polariscopio prasiolite precisione prezioso
  rifrattometro rodocrosite rodolite rosa rubellite spettroscopio spinello strumenti termico tormalina triplette
  tsavorite turchese uv vetro vitrea x zaffiri zircone zirconia
  assorbimento birifrangenza caratteristica caratteristiche chemical chimica conducibilità cristallo diagnosi dicromismo
  dispersione fluorescenza formula frattura indice interferenza ir riflessione rifrazione osservazione
  osservazioni pleocroismo spettroscopia strumentazione trasparenza trattamento ottica ottiche ottico cm densita
  aragonite borosilicati componente composizione conchiolina complessa lazurite miscela mineralogica nucleo
  organica plastica principale rivestito secondo silicea solida soluzione stabilizzato strati variabile
  aml ccm cibjo cvd gdpr ia iso iva kyc lbma pep pii pwa sos
  bar ct g kg mg mm nm oz ppm percento percentuale
`.trim().split(/\s+/u).map(normalizeAurumCaseWord));

function aurumCaseTokens(value = "") {
  return String(value || "").match(/[\p{L}]+|\d+(?:[.,]\d+)?/gu) || [];
}

export function redactAssistantPersonalData(value = "", maxLength = 4000) {
  const safeMaxLength = Math.max(1, Math.min(20000, Number(maxLength || 4000)));
  return String(value || "")
    .replace(sensitiveJsonValuePattern, '$1"[dato personale omesso]"')
    .replace(new RegExp(spokenNamePattern.source, "gu"), "[nome omesso]")
    .replace(new RegExp(preferredNamePattern.source, "giu"), "[nome preferito omesso]")
    .replace(new RegExp(birthdayPattern.source, "giu"), "[compleanno omesso]")
    .replace(/(^|[.;]\s*)([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,2})(?=\s*,\s*(?:via|viale|piazza|corso|largo|vicolo)\b)/gu, "$1[nome omesso]")
    .replace(new RegExp(labelledNamePattern.source, "giu"), "[nome omesso]")
    .replace(new RegExp(addressPattern.source, "giu"), "[indirizzo omesso]")
    .replace(/\b(?:nato|nata|data\s+di\s+nascita)\s*(?:a|il|:|-)?\s*[\p{L}'’ .-]{0,50}\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\b/giu, "[data di nascita omessa]")
    .replace(new RegExp(documentPattern.source, "gi"), "[documento omesso]")
    .replace(new RegExp(vehiclePlatePattern.source, "gi"), "[targa omessa]")
    .replace(new RegExp(fiscalCodePattern.source, "gi"), "[codice fiscale omesso]")
    .replace(/\bIT\s*\d{2}\s*[A-Z]\s*(?:\d\s*){10,27}\b/gi, "[IBAN omesso]")
    .replace(new RegExp(ibanPattern.source, "gi"), "[IBAN omesso]")
    .replace(new RegExp(vatPattern.source, "gi"), "[partita IVA omessa]")
    .replace(new RegExp(emailPattern.source, "gi"), "[email omessa]")
    .replace(new RegExp(internationalPhonePattern.source, "g"), "[telefono omesso]")
    .replace(new RegExp(localPhonePattern.source, "g"), "[telefono omesso]")
    .slice(0, safeMaxLength);
}

export function containsAssistantPersonalData(value = "") {
  const text = String(value || "");
  return [
    fiscalCodePattern,
    ibanPattern,
    emailPattern,
    internationalPhonePattern,
    localPhonePattern,
    vatPattern,
    addressPattern,
    birthDatePattern,
    documentPattern,
    vehiclePlatePattern,
    labelledNamePattern,
    spokenNamePattern,
    preferredNamePattern,
    birthdayPattern,
    new RegExp(sensitiveJsonValuePattern.source, "i")
  ].some((pattern) => pattern.test(text));
}

export function containsAurumCaseRestrictedData(value = "", { allowChemicalFormula = false } = {}) {
  const text = String(value || "");
  if (containsAssistantPersonalData(text)
    || aurumCaseDatePattern.test(text)
    || aurumCaseLongNumericIdentifierPattern.test(text)) return true;
  if (allowChemicalFormula && aurumCaseAllowedChemicalFormulas.has(normalizeChemicalFormula(text))) return false;
  if (aurumCaseMixedIdentifierPattern.test(text)) return true;
  const tokens = aurumCaseTokens(text);
  return tokens.some((token) => {
    if (/^\d+(?:[.,]\d+)?$/.test(token)) return false;
    return !aurumCaseAllowedWords.has(normalizeAurumCaseWord(token));
  });
}

export function isAurumCaseFieldNameAllowed(value = "") {
  const text = String(value || "");
  if (!/^\p{L}[\p{L}\p{N}_]{1,79}$/iu.test(text) || sensitiveContextKeyPattern.test(text)) return false;
  const tokens = text.split(/_+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => (
    /^\d+$/.test(token) || aurumCaseAllowedWords.has(normalizeAurumCaseWord(token))
  ));
}

export function sanitizeAssistantContextObject(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return null;
  if (typeof value === "string") return redactAssistantPersonalData(value, 4000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 60).map((item) => sanitizeAssistantContextObject(item, depth + 1));
  }
  if (typeof value !== "object") return null;
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 120)) {
    if (sensitiveContextKeyPattern.test(key)) continue;
    output[key] = sanitizeAssistantContextObject(item, depth + 1);
  }
  return output;
}

export function sanitizeAssistantUntrustedContext(value = "", maxLength = 4000) {
  return redactAssistantPersonalData(value, maxLength)
    .split(/\r?\n/)
    .filter((line) => !/(ignora|disattendi|sostituisci).{0,40}(istruzioni|prompt|regole)|system\s*prompt|developer\s*message|agisci\s+come|rivela.{0,30}(segreti|credenziali|token)/i.test(line))
    .join("\n")
    .trim();
}
