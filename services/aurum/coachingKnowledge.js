import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgePath = path.resolve(
  __dirname,
  "../../assets/aurum-knowledge/coaching/professional-coaching-knowledge.json"
);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function loadCoachingKnowledge() {
  const parsed = JSON.parse(readFileSync(knowledgePath, "utf8"));
  if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length !== 9) {
    throw new Error("Base coaching Aurum non valida: sono richiesti i nove corsi.");
  }
  const sourceIds = new Set((parsed.sources || []).map((source) => source.id));
  const topicIds = new Set();
  for (const topic of parsed.topics) {
    if (!topic.id || topicIds.has(topic.id)) throw new Error(`Topic coaching duplicato: ${topic.id || "senza id"}`);
    topicIds.add(topic.id);
    if (!topic.course?.filename || !topic.course?.sha256 || !topic.summary) {
      throw new Error(`Provenienza incompleta per il topic coaching ${topic.id}`);
    }
    if ((topic.questions || []).length < 6 || (topic.exercises || []).length < 5 || (topic.cautions || []).length < 3) {
      throw new Error(`Contenuto coaching insufficiente per ${topic.id}`);
    }
    for (const sourceRef of topic.sourceRefs || []) {
      if (!sourceIds.has(sourceRef)) throw new Error(`Fonte coaching non risolta: ${sourceRef}`);
    }
  }
  for (const source of parsed.sources || []) {
    if (!source.id || !source.title || !/^https:\/\//i.test(source.url || "") || !source.authority) {
      throw new Error(`Fonte coaching pubblica non valida: ${source.id || "senza id"}`);
    }
  }
  return deepFreeze(parsed);
}

export const AURUM_COACHING_KNOWLEDGE = loadCoachingKnowledge();

export const AURUM_COACHING_STATS = Object.freeze({
  courseCount: AURUM_COACHING_KNOWLEDGE.topics.length,
  topicCount: AURUM_COACHING_KNOWLEDGE.topics.length,
  questionCount: AURUM_COACHING_KNOWLEDGE.topics.reduce((total, topic) => total + topic.questions.length, 0),
  exerciseCount: AURUM_COACHING_KNOWLEDGE.topics.reduce((total, topic) => total + topic.exercises.length, 0),
  verifiedAt: AURUM_COACHING_KNOWLEDGE.verifiedAt,
  professionalStandard: AURUM_COACHING_KNOWLEDGE.professionalStandard
});

const stopWords = new Set([
  "agli", "alla", "alle", "allo", "anche", "avere", "come", "cosa", "dai", "dal", "dalla", "delle",
  "degli", "dei", "del", "dello", "fare", "gli", "mio", "mia", "nel", "nella", "nelle", "non", "per",
  "posso", "quale", "quando", "questa", "questo", "sono", "sul", "sulla", "una", "uno", "voglio"
]);

export function normalizeCoachingText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value = "") {
  return new Set(normalizeCoachingText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !stopWords.has(token)));
}

const coachingIntentPattern = /\b(?:coach(?:ing)?|obiettiv|autosabot|impostor|procrastin|perfezion|leadership|leader|manager|deleg|team|feedback|empati|ascolt|assertiv|aggressiv|dire di no|resilien|confini|flow|creativ|brainstorm|scamper|apprend|metacogn|kolb|mezirow|etica|riservatezz|contratto|supervision|work life balance|equilibrio vita lavoro|stress|sovraccaric|priorit|motivazion|abitudin|fiducia|conflitt|comunicazion|gestire meglio il tempo|organizzarmi|capacita emotiv|crescere professional|crescita professional|mi sento bloccat|non so da dove iniziare)\w*/i;

const topicBoosts = [
  { pattern: /\b(?:impostor|autosabot|non valgo|non sono abbastanza|perfezion|procrastin|mi sento bloccat|non so da dove iniziare)\w*/, id: "coaching_self_sabotage", boost: 100 },
  { pattern: /\b(?:leader o manager|stile di leadership|vision|deleg|stakeholder|inner driver)\w*/, id: "coaching_leadership", boost: 90 },
  { pattern: /\b(?:empati|ascolto attivo|assertiv|passivo aggressivo|resilien|dire di no|sviluppare (?:le mie )?capacita emotiv|sviluppo emotivo)\w*/, id: "coaching_relational_skills", boost: 100 },
  { pattern: /\b(?:flow|nella zona|sfida e abilita|clutch|concentrazione totale)\w*/, id: "coaching_flow", boost: 120 },
  { pattern: /\b(?:blocco creativo|brainstorm|scamper|sei cappelli|reverse thinking|pensiero laterale)\w*/, id: "coaching_creativity", boost: 110 },
  { pattern: /\b(?:apprend|metacogn|kolb|mezirow|70 20 10|insight|consolidare|crescere professional|crescita professional)\w*/, id: "coaching_learning", boost: 105 },
  { pattern: /\b(?:etica|riservatezz|contratto di coaching|conflitto di interessi|supervision|terapia o coaching)\w*/, id: "coaching_ethics", boost: 110 },
  { pattern: /\b(?:leadership emotiva|leader risonante|clima del team|contagio emotivo|autoregolazione|leader coach)\w*/, id: "coaching_emotional_leadership", boost: 130 },
  { pattern: /\b(?:work life balance|equilibrio vita lavoro|stress da lavoro|non riesco a staccare|sempre reperibile|time blocking|eisenhower|sovraccaric|gestire meglio il tempo|organizzarmi)\w*/, id: "coaching_work_life_balance", boost: 120 }
];

const coachingIndex = AURUM_COACHING_KNOWLEDGE.topics.map((topic) => {
  const title = normalizeCoachingText(topic.title);
  const aliases = topic.aliases.map(normalizeCoachingText);
  return {
    topic,
    title,
    aliases,
    titleTokens: tokenSet(title),
    aliasTokens: tokenSet(aliases.join(" ")),
    bodyTokens: tokenSet([
      topic.summary,
      ...(topic.concepts || []),
      ...(topic.questions || []),
      ...(topic.exercises || [])
    ].join(" "))
  };
});

function scoreTopic(entry, normalized, queryTokens) {
  let score = 0;
  const matchedTerms = [];
  if (normalized === entry.title || ` ${entry.title} `.includes(` ${normalized} `)) score += 80;
  for (const alias of entry.aliases) {
    if (!alias) continue;
    if (` ${normalized} `.includes(` ${alias} `)) {
      score += 45 + Math.min(25, alias.split(" ").length * 4);
      matchedTerms.push(alias);
    }
  }
  for (const token of queryTokens) {
    if (entry.titleTokens.has(token)) {
      score += 9;
      matchedTerms.push(token);
    }
    if (entry.aliasTokens.has(token)) {
      score += 7;
      matchedTerms.push(token);
    }
    if (entry.bodyTokens.has(token)) score += 1.5;
  }
  for (const boost of topicBoosts) {
    if (boost.id === entry.topic.id && boost.pattern.test(normalized)) score += boost.boost;
  }
  return { score: Math.round(score * 100) / 100, matchedTerms: [...new Set(matchedTerms)] };
}

export function searchCoachingKnowledge(query = "", options = {}) {
  const normalized = normalizeCoachingText(query);
  const queryTokens = tokenSet(normalized);
  const explicitIntent = coachingIntentPattern.test(normalized);
  if (!normalized || !explicitIntent) {
    return Object.freeze({ normalized, matches: Object.freeze([]), coachingIntent: false });
  }
  const limit = Math.max(1, Math.min(4, Number(options.limit || 3)));
  const ranked = coachingIndex
    .map((entry) => ({ topic: entry.topic, ...scoreTopic(entry, normalized, queryTokens) }))
    .filter((match) => match.score >= 12)
    .sort((left, right) => right.score - left.score || left.topic.title.localeCompare(right.topic.title, "it"));
  const floor = Math.max(12, Number(ranked[0]?.score || 0) * 0.42);
  const matches = ranked.filter((match) => match.score >= floor).slice(0, limit);
  return Object.freeze({
    normalized,
    matches: Object.freeze(matches),
    coachingIntent: matches.length > 0
  });
}

export function hasCoachingIntent(result = {}) {
  return result.coachingIntent === true && Array.isArray(result.matches) && result.matches.length > 0;
}

export function coachingKnowledgeSources(result = {}, limit = 8) {
  const sourceById = new Map(AURUM_COACHING_KNOWLEDGE.sources.map((source) => [source.id, source]));
  const unique = new Map();
  for (const match of result.matches || []) {
    for (const sourceRef of match.topic?.sourceRefs || []) {
      const source = sourceById.get(sourceRef);
      if (source && !unique.has(source.url)) unique.set(source.url, source);
    }
  }
  return [...unique.values()].slice(0, Math.max(1, Math.min(12, Number(limit || 8))));
}

export function formatCoachingKnowledgeContext(result = {}, options = {}) {
  const limit = Math.max(1, Math.min(2, Number(options.limit || 1)));
  return (result.matches || []).slice(0, limit).map(({ topic, score }, index) => [
    `[Coaching ${index + 1}; id=${topic.id}; punteggio=${score}]`,
    `Tema: ${topic.title}`,
    `Sintesi: ${topic.summary}`,
    `Concetti: ${topic.concepts.join(" | ")}`,
    `Domande possibili: ${topic.questions.join(" | ")}`,
    `Processi ed esercizi: ${topic.exercises.join(" | ")}`,
    `Cautele: ${topic.cautions.join(" | ")}`,
    `Materiale formativo fornito dal Founder: ${topic.course.title}; ${topic.course.authors.join(", ")}; ${topic.course.pages} pagine; impronta ${topic.course.sha256}.`,
    `Standard professionale: ${AURUM_COACHING_KNOWLEDGE.professionalStandard}.`
  ].join("\n")).join("\n\n---\n\n");
}

function profileLine(profile = {}) {
  const goals = Array.isArray(profile.goals) ? profile.goals.filter(Boolean).slice(0, 2) : [];
  if (!goals.length) return "";
  return `Terrò presente il tuo obiettivo già confermato: ${goals.join("; ")}.`;
}

function withoutQuestionMarks(value = "") {
  return String(value || "").replace(/[?？]/g, "").trim();
}

export function buildCoachingKnowledgeAnswer(question = "", result = searchCoachingKnowledge(question), options = {}) {
  if (!hasCoachingIntent(result)) {
    return {
      risposta: "Non ho identificato un tema di coaching abbastanza preciso. Dimmi quale risultato professionale o personale vuoi esplorare e se preferisci ascolto, domande di riflessione oppure un piano d'azione.",
      sources: []
    };
  }
  const topic = result.matches[0].topic;
  const profile = options.profile || {};
  const preferredName = withoutQuestionMarks(profile.preferredName);
  const openQuestion = withoutQuestionMarks(topic.questions[0])
    || "Quale risultato concreto renderebbe utile questa conversazione";
  const sources = coachingKnowledgeSources({ ...result, matches: result.matches.slice(0, 1) });
  const lines = [
    `${preferredName ? `${preferredName}, ` : ""}possiamo lavorare su questo tema con un approccio di coaching.`,
    "",
    withoutQuestionMarks(topic.summary),
    "",
    "Possiamo partire dall'ascolto, dall'esplorazione o da un piano d'azione, orientandoci al risultato concreto che vuoi ottenere.",
    "",
    withoutQuestionMarks(profileLine(profile)),
    "",
    `Una domanda alla volta: ${openQuestion}?`,
    "",
    `Se vuoi passare alla pratica, possiamo usare “${topic.exercises[0]}” e arrivare a una micro-azione scelta da te.`,
    "",
    "Limiti professionali:",
    "• Aurum è un sistema IA di supporto al coaching: non è un coach umano certificato, non formula diagnosi e non sostituisce psicologo, psicoterapeuta, medico, consulente HR o legale.",
    ...topic.cautions.slice(0, 3).map((caution) => `• ${withoutQuestionMarks(caution)}`),
    "",
    `Materiale A.Co.I. rielaborato: “${withoutQuestionMarks(topic.course.title)}” - ${topic.course.authors.join(", ")}. Il PDF originale non è pubblicato.`,
    `Allineamento professionale verificato il ${AURUM_COACHING_KNOWLEDGE.verifiedAt}:`,
    ...sources.map((source, index) => `${index + 1}. ${withoutQuestionMarks(source.title)} - ${source.url}`)
  ].filter((line) => line !== "");
  return {
    risposta: lines.join("\n"),
    sources,
    topicId: topic.id,
    course: {
      title: topic.course.title,
      authors: topic.course.authors,
      filename: topic.course.filename,
      sha256: topic.course.sha256
    }
  };
}
