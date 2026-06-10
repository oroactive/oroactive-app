export const GOLD_MASTER_COURSE_CODE = "ORO-MASTER-001";
export const GOLD_MASTER_COURSE_TITLE = "Oro Master — Dalla Bilancia d’Oro";
export const GOLD_MASTER_BADGE_NAME = "Specialista OroActive Oro";
export const GOLD_MASTER_CERTIFICATION_NAME = "Oro Master — Dalla Bilancia d’Oro";

export const GOLD_MASTER_SOURCE_CANDIDATES = [
  "assets/academy/gold-master/source/la-bilancia-d-oro.docx",
  "public/uploads/La Bilancia d'Oro.pdf",
  "public/uploads/La Bilancia d'Oro.docx",
  "storage/knowledge/La Bilancia d'Oro.pdf",
  "storage/knowledge/La Bilancia d'Oro.docx",
  "La Bilancia d'Oro.pdf",
  "La Bilancia d'Oro.docx",
  "/Volumes/Elite/La Bilancia d'Oro/Opera/La Bilancia d'Oro-Il manuale completo per compro oro.docx",
  "/Volumes/Elite/La Bilancia d'Oro/Opera/La Bilancia d'Oro-Il manuale completo per aprire e far crescere un compro oro di successo.docx"
];

const goldPurityRows = [
  ["24kt", "24/24", "100,00%"],
  ["22kt", "22/24", "91,67%"],
  ["21kt", "21/24", "87,50%"],
  ["18kt", "18/24", "75,00%"],
  ["14kt", "14/24", "58,33%"],
  ["12kt", "12/24", "50,00%"],
  ["9kt", "9/24", "37,50%"],
  ["6kt", "6/24", "25,00%"]
];

const silverPurityRows = [
  ["999", "999/1000", "99,90%"],
  ["925", "925/1000", "92,50%"],
  ["800", "800/1000", "80,00%"]
];

export const GOLD_MASTER_MODULES = [
  {
    number: 1,
    title: "Fondamenti dell'oro",
    objective: "Capire cos'e l'oro, perche ha valore e quali sono le sue caratteristiche fisiche, chimiche e commerciali.",
    prerequisites: "Nessun prerequisito tecnico: modulo introduttivo del percorso avanzato.",
    keywords: ["oro", "valore", "bene rifugio", "commercio", "storia"],
    lessons: [
      "Introduzione al valore dell'oro",
      "Proprieta fisiche e chimiche dell'oro",
      "Oro nella storia e nel commercio",
      "Oro come bene rifugio",
      "Differenza tra valore reale, valore commerciale e valore percepito"
    ],
    materials: ["Slide PDF", "Schema Perche l'oro ha valore", "Immagini realistiche oro grezzo, lingotti e monete"]
  },
  {
    number: 2,
    title: "Carature, purezza e titoli",
    objective: "Comprendere carati, millesimi, purezza e conversioni operative.",
    prerequisites: "Conoscenza base del concetto di oro puro.",
    keywords: ["caratura", "carati", "millesimi", "purezza", "lega", "18kt"],
    lessons: [
      "Cosa significa caratura",
      "Oro 24kt, 22kt, 21kt, 18kt, 14kt, 12kt, 9kt, 6kt",
      "Conversione carati/millesimi",
      "Leghe dell'oro",
      "Colore dell'oro: giallo, bianco, rosa",
      "Errori comuni nella valutazione della caratura"
    ],
    materials: ["Tabella carature", "Schema kt -> millesimi -> purezza", "Mini quiz carature"]
  },
  {
    number: 3,
    title: "Gioielli e oggetti preziosi",
    objective: "Riconoscere e descrivere le principali tipologie di gioielli e oggetti ceduti in compro oro.",
    prerequisites: "Conoscenza delle carature principali.",
    keywords: ["gioielli", "anelli", "collane", "bracciali", "oggetti preziosi", "atto"],
    lessons: [
      "Anelli",
      "Collane",
      "Bracciali",
      "Orecchini",
      "Ciondoli",
      "Orologi e componenti preziose",
      "Oggetti rotti, usati, incompleti",
      "Come descrivere correttamente un oggetto nell'atto"
    ],
    materials: ["Foto realistiche gioielli", "Schede descrizione oggetto", "Esempi compilazione atto"]
  },
  {
    number: 4,
    title: "Monete, lingotti e oro da investimento",
    objective: "Distinguere oro da fusione, oro da gioielleria e oro da investimento.",
    prerequisites: "Conoscenza di peso, purezza e valore teorico.",
    keywords: ["monete", "lingotti", "sterline", "marenghi", "numismatica", "investimento"],
    lessons: [
      "Lingotti",
      "Monete d'oro",
      "Sterline, marenghi e monete storiche",
      "Differenza tra valore metallo e valore numismatico",
      "Certificazioni e blister",
      "Quando un oggetto non va trattato solo a peso"
    ],
    materials: ["Foto realistiche monete", "Foto lingotti", "Schema valore metallo vs valore collezionistico"]
  },
  {
    number: 5,
    title: "Test dell'oro",
    objective: "Imparare i principali metodi di verifica e i loro limiti operativi.",
    prerequisites: "Conoscenza delle principali carature.",
    keywords: ["test oro", "punzonatura", "calamita", "acido", "densita", "XRF", "bilancia"],
    lessons: [
      "Controllo visivo",
      "Punzonature",
      "Test calamita",
      "Test pietra di paragone",
      "Test acido",
      "Bilancia di precisione",
      "Test densita",
      "XRF e strumenti professionali",
      "Limiti dei test",
      "Errori da evitare durante il test"
    ],
    materials: ["Immagini kit acidi", "Schema test rapido vs test professionale", "Quiz pratico"]
  },
  {
    number: 6,
    title: "Peso, prezzo e valutazione economica",
    objective: "Capire come dal peso si arriva al valore economico e al prezzo pagabile.",
    prerequisites: "Conoscenza di carature, titoli e pesatura.",
    keywords: ["peso", "prezzo", "valore teorico", "massimo pagabile", "margine", "fonderia"],
    lessons: [
      "Peso lordo e peso netto",
      "Peso metallo e componenti non preziose",
      "Calcolo valore teorico",
      "Prezzo oro puro",
      "Calcolo oro 18kt",
      "Calcolo argento 925",
      "Spread, margine, fonderia",
      "Prezzo massimo pagabile",
      "Prezzo consigliato al cliente",
      "Esempi numerici"
    ],
    materials: ["Formule", "Simulazioni", "Tabelle prezzo", "Esercizi pratici"]
  },
  {
    number: 7,
    title: "Quotazioni e mercato",
    objective: "Comprendere quotazioni, trend, volatilita e confronto competitor.",
    prerequisites: "Conoscenza di prezzo puro e conversione al grammo.",
    keywords: ["quotazione", "spot", "BullionVault", "competitor", "mercato", "trend", "volatilita"],
    lessons: [
      "Prezzo spot",
      "Quotazione EUR/kg e EUR/g",
      "BullionVault e fonti prezzo",
      "Differenza tra prezzo di borsa e prezzo compro oro",
      "Competitor e mercato locale",
      "Come leggere una quotazione",
      "Come usare l'Analisi di mercato OroActive",
      "Come evitare errori di prezzo"
    ],
    materials: ["Grafici", "Schema prezzo borsa -> caratura -> massimo pagabile", "Quiz quotazioni"]
  },
  {
    number: 8,
    title: "Procedura compro oro",
    objective: "Collegare teoria e gestione reale dell'atto di vendita.",
    prerequisites: "Conoscenza del flusso operativo OroActive.",
    keywords: ["atto di vendita", "cliente", "documenti", "pagamento", "firme", "controllo qualita"],
    lessons: [
      "Accoglienza cliente",
      "Identificazione cliente",
      "Documenti",
      "Scheda cliente",
      "Descrizione oggetti",
      "Foto preziosi",
      "Pagamento",
      "Firme",
      "Controllo qualita",
      "Archiviazione pratica"
    ],
    materials: ["Flowchart atto vendita", "Checklist operatore", "Simulazione pratica"]
  },
  {
    number: 9,
    title: "Sicurezza, rischio e anomalie",
    objective: "Riconoscere situazioni da approfondire e attivare le protezioni interne.",
    prerequisites: "Conoscenza base dell'atto di vendita e del controllo qualita.",
    keywords: ["rischio", "anomalia", "documenti", "Aurum Shield", "pratiche sospese", "autorizzazioni"],
    lessons: [
      "Documenti scaduti",
      "Cliente ricorrente",
      "Operazioni frazionate",
      "Pagamenti sospetti",
      "Oggetti anomali",
      "Aurum Shield",
      "Pratiche sospese",
      "Autorizzazioni"
    ],
    materials: ["Casi studio", "Checklist rischio", "Simulazioni operative"]
  },
  {
    number: 10,
    title: "Fonderia, fusione e rientro economico",
    objective: "Capire cosa succede dopo l'acquisto e come si misura il rientro economico.",
    prerequisites: "Conoscenza di valore teorico, margine e costi.",
    keywords: ["giacenza", "fusione", "raffineria", "lotto", "margine", "rientro"],
    lessons: [
      "Giacenza",
      "Selezione per caratura",
      "Preparazione lotto",
      "Fusione",
      "Raffineria",
      "Differenza teorico/reale",
      "Margine finale",
      "Errori che riducono il rientro"
    ],
    materials: ["Schema ciclo acquisto -> fusione -> rientro", "Esempi di lotto", "Simulatore margine"]
  },
  {
    number: 11,
    title: "Etica, trasparenza e fiducia",
    objective: "Formare operatori credibili, chiari e coerenti con il metodo OroActive.",
    prerequisites: "Conoscenza delle procedure di acquisto e comunicazione cliente.",
    keywords: ["etica", "trasparenza", "fiducia", "cliente", "Trust Pack", "reputazione"],
    lessons: [
      "Trasparenza con il cliente",
      "Spiegare il prezzo",
      "Gestire obiezioni",
      "Evitare pressioni scorrette",
      "Customer Trust Pack",
      "Reputazione del negozio",
      "Linguaggio professionale"
    ],
    materials: ["Script conversazionali", "Esempi cliente", "Schede comportamento"]
  },
  {
    number: 12,
    title: "Esame finale e certificazione",
    objective: "Valutare competenza teorica e operativa prima della certificazione interna.",
    prerequisites: "Completamento dei moduli precedenti.",
    keywords: ["esame", "certificazione", "badge", "simulazione", "valutazione"],
    lessons: [
      "Ripasso generale",
      "Test teorico",
      "Simulazione atto",
      "Valutazione oggetto",
      "Calcolo prezzo",
      "Esame finale in presenza/live",
      "Certificazione interna",
      "Badge Specialista OroActive Oro"
    ],
    materials: ["Griglia esame", "Checklist valutazione", "Certificazione interna OroActive Academy"]
  }
];

export const GOLD_MASTER_SCHEMES = [
  {
    title: "Carature oro",
    moduleNumber: 2,
    rows: goldPurityRows,
    summary: "Conversione rapida tra carati, frazione e purezza percentuale."
  },
  {
    title: "Titoli argento",
    moduleNumber: 2,
    rows: silverPurityRows,
    summary: "Conversione rapida dei titoli argento piu usati nel compro oro."
  },
  {
    title: "Formula valore teorico",
    moduleNumber: 6,
    steps: [
      "Prezzo puro al grammo = prezzo puro al kg / 1000",
      "Valore teorico = prezzo puro al grammo x purezza",
      "Oro 18kt = prezzo oro puro al grammo x 18 / 24",
      "Argento 925 = prezzo argento puro al grammo x 925 / 1000"
    ]
  },
  {
    title: "Formula massimo pagabile",
    moduleNumber: 6,
    steps: [
      "Valore recuperabile = valore teorico x (1 - perdita fusione) x (1 - spread raffineria)",
      "Valore netto recuperabile = valore recuperabile - costi al grammo",
      "Massimo pagabile = valore netto recuperabile x (1 - margine target)",
      "Prezzo consigliato = massimo pagabile x (1 - buffer rischio - buffer trattativa)"
    ]
  },
  {
    title: "Percorso atto vendita",
    moduleNumber: 8,
    steps: ["Accoglienza", "Identificazione", "Descrizione oggetti", "Foto", "Pagamento", "Firme", "Controllo qualita", "Archiviazione"]
  },
  {
    title: "Controllo qualita",
    moduleNumber: 8,
    steps: ["Dati cliente", "Documento", "Oggetti", "Prezzo", "Pagamento", "Firme", "Allegati", "Aurum Shield"]
  },
  {
    title: "Test oro",
    moduleNumber: 5,
    steps: ["Controllo visivo", "Punzonatura", "Calamita", "Pietra/acido", "Peso", "Densita", "XRF se disponibile"]
  },
  {
    title: "Procedura fonderia",
    moduleNumber: 10,
    steps: ["Giacenza", "Separazione carature", "Preparazione lotto", "Invio/fusione", "Raffineria", "Rientro", "Controllo margine"]
  },
  {
    title: "Prezzo borsa e prezzo cliente",
    moduleNumber: 7,
    steps: ["Prezzo puro", "Conversione al grammo", "Purezza", "Costi", "Spread", "Margine", "Buffer", "Prezzo cliente"]
  },
  {
    title: "Gestione rischio",
    moduleNumber: 9,
    steps: ["Anomalia", "Verifica", "Aurum Shield", "Sospensione se necessario", "Autorizzazione", "Decisione documentata"]
  }
];

export const GOLD_MASTER_MEDIA_PROMPTS = [
  {
    category: "Gioielli",
    prompt: "Foto realistica macro di gioielli in oro giallo 18kt su banco valutazione professionale, luce calda, stile premium, nessun marchio visibile.",
    alt: "Gioielli in oro giallo su banco valutazione"
  },
  {
    category: "Gioielli",
    prompt: "Foto realistica di gioielli usati misti, alcuni rotti, su vassoio tecnico nero, illuminazione da negozio compro oro, nessun logo.",
    alt: "Gioielli usati e rotti su vassoio tecnico"
  },
  {
    category: "Metalli",
    prompt: "Foto realistica di lingotti d'oro 24kt generici su superficie scura, riflessi metallici, stile luxury, nessun logo reale.",
    alt: "Lingotti d'oro generici"
  },
  {
    category: "Metalli",
    prompt: "Foto realistica di lingotto argento 999 e graniglia metallica su banco tecnico, luce morbida, nessun marchio.",
    alt: "Lingotto argento e graniglia"
  },
  {
    category: "Monete",
    prompt: "Foto realistica di monete d'oro generiche e lingotti senza incisioni riconoscibili reali, fondo scuro, stile premium.",
    alt: "Monete d'oro generiche"
  },
  {
    category: "Test",
    prompt: "Foto realistica di test oro con pietra di paragone e acidi, banco tecnico ordinato, guanti neri, stile professionale.",
    alt: "Kit test oro con pietra e acidi"
  },
  {
    category: "Test",
    prompt: "Foto realistica di bilancia di precisione con piccolo gioiello oro, lente e pinzette, nessun marchio, luce controllata.",
    alt: "Bilancia di precisione per oro"
  },
  {
    category: "Negozio",
    prompt: "Foto realistica di banco valutazione compro oro con operatore, iPad, vassoio oggetti e ambiente elegante OroActive, nessun volto riconoscibile.",
    alt: "Banco valutazione professionale"
  }
];

const lessonKeywordsByTitle = {
  "Introduzione al valore dell'oro": ["valore dell'oro", "oro", "valore"],
  "Proprieta fisiche e chimiche dell'oro": ["proprieta", "fisiche", "chimiche", "oro"],
  "Oro nella storia e nel commercio": ["storia", "commercio", "oro"],
  "Oro come bene rifugio": ["bene rifugio", "oro"],
  "Cosa significa caratura": ["caratura", "carati"],
  "Conversione carati/millesimi": ["millesimi", "carati", "conversione"],
  "Leghe dell'oro": ["leghe", "oro"],
  "Colore dell'oro: giallo, bianco, rosa": ["oro giallo", "oro bianco", "oro rosa"],
  "Punzonature": ["punzonatura", "punzone"],
  "Test pietra di paragone": ["pietra di paragone"],
  "Test acido": ["acido", "test"],
  "Bilancia di precisione": ["bilancia", "precisione"],
  "XRF e strumenti professionali": ["XRF", "strumenti"],
  "Calcolo valore teorico": ["valore teorico", "calcolo"],
  "Prezzo massimo pagabile": ["massimo pagabile", "prezzo massimo"],
  "Prezzo consigliato al cliente": ["prezzo consigliato", "cliente"],
  "BullionVault e fonti prezzo": ["BullionVault", "quotazione"],
  "Differenza tra prezzo di borsa e prezzo compro oro": ["prezzo di borsa", "compro oro"],
  "Aurum Shield": ["Aurum Shield", "rischio"],
  "Customer Trust Pack": ["Customer Trust Pack", "fiducia"]
};

function stripAccents(value = "") {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeGoldMasterText(value = "") {
  return stripAccents(value)
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function slugifyGoldMaster(value = "") {
  return normalizeGoldMasterText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function goldMasterModuleKey(module = {}) {
  return `gold-master-module-${String(module.number).padStart(2, "0")}`;
}

export function goldMasterLessonKey(module = {}, lessonIndex = 0) {
  return `${goldMasterModuleKey(module)}-lesson-${String(lessonIndex + 1).padStart(2, "0")}`;
}

function compactExcerpt(text = "", start = 0, length = 900) {
  const safeStart = Math.max(0, start);
  return String(text || "")
    .slice(safeStart, safeStart + length)
    .replace(/\s+/g, " ")
    .trim();
}

export function splitBookIntoChapters(text = "") {
  const source = String(text || "").replace(/\r/g, "\n");
  const headings = [];
  const headingRegex = /(?:^|\n)\s*((?:capitolo|parte|sezione)\s+[0-9ivxlcdm]+[^\n]{0,120})/gi;
  let match;
  while ((match = headingRegex.exec(source))) {
    headings.push({ title: match[1].trim(), index: match.index });
  }
  if (headings.length < 2) {
    const chunks = [];
    const size = 12000;
    for (let index = 0; index < source.length; index += size) {
      chunks.push({
        title: `Estratto ${Math.floor(index / size) + 1}`,
        start: index,
        end: Math.min(source.length, index + size),
        text: compactExcerpt(source, index, size)
      });
    }
    return chunks;
  }
  return headings.map((heading, index) => {
    const next = headings[index + 1]?.index || source.length;
    return {
      title: heading.title,
      start: heading.index,
      end: next,
      text: compactExcerpt(source, heading.index, next - heading.index)
    };
  });
}

export function findLessonSourceReference(sourceText = "", chapters = [], lesson = {}, module = {}) {
  if (!sourceText) {
    return {
      found: false,
      chapter: "",
      excerpt: "",
      confidence: 0,
      status: "source_missing"
    };
  }
  const normalized = normalizeGoldMasterText(sourceText);
  const keywords = [
    ...(lessonKeywordsByTitle[lesson.title] || []),
    ...(lesson.keywords || []),
    ...(module.keywords || []),
    lesson.title,
    module.title
  ].map(normalizeGoldMasterText).filter((value) => value.length > 2);
  let best = { keyword: "", index: -1 };
  for (const keyword of keywords) {
    const index = normalized.indexOf(keyword);
    if (index >= 0 && (best.index < 0 || index < best.index)) best = { keyword, index };
  }
  if (best.index < 0) {
    return {
      found: false,
      chapter: chapters[0]?.title || "Fonte non agganciata automaticamente",
      excerpt: "",
      confidence: 0.15,
      status: "needs_review"
    };
  }
  const chapter = chapters.find((item) => best.index >= item.start && best.index < item.end) || chapters[0] || {};
  const excerpt = compactExcerpt(sourceText, Math.max(0, best.index - 240), 900);
  return {
    found: true,
    chapter: chapter.title || "Estratto da La Bilancia d'Oro",
    excerpt,
    confidence: best.keyword.length > 8 ? 0.74 : 0.55,
    status: "source_matched"
  };
}

function lessonObjective(title = "", module = {}) {
  return `Comprendere "${title}" e applicarlo in modo operativo nel contesto OroActive, distinguendo contenuto fonte, procedura interna e casi da revisionare.`;
}

function lessonSummary(title = "", module = {}) {
  return [
    `Questa lezione affronta ${title.toLowerCase()} all'interno del modulo ${module.number}: ${module.title}.`,
    "La parte direttamente collegata al libro viene mostrata come riferimento fonte; gli esempi pratici sono marcati come approfondimenti OroActive.",
    "L'obiettivo operativo e aiutare l'utente a passare dal concetto alla decisione corretta in negozio."
  ].join(" ");
}

function buildQuizQuestion(module = {}, lessonTitle = "", index = 0) {
  const base = [
    {
      question: "Che purezza ha l'oro 18kt?",
      options: ["75%", "58,33%", "91,67%", "37,50%"],
      correct_answer: "75%",
      explanation: "18kt significa 18 parti di oro su 24: 18/24 = 0,75.",
      difficulty: "base"
    },
    {
      question: "Perche il prezzo pagato al cliente non coincide con il prezzo puro di borsa?",
      options: ["Perche vanno considerati purezza, costi, spread, rischi e margine", "Perche il prezzo di borsa non esiste", "Perche il peso non conta", "Perche il cliente decide il prezzo"],
      correct_answer: "Perche vanno considerati purezza, costi, spread, rischi e margine",
      explanation: "Il compro oro parte dal valore teorico ma deve considerare costi e margini sostenibili.",
      difficulty: "intermedio"
    },
    {
      question: "Quale test, da solo, non garantisce in modo assoluto l'autenticita dell'oro?",
      options: ["Un singolo controllo visivo", "Una procedura combinata", "XRF professionale", "Verifica documentata"],
      correct_answer: "Un singolo controllo visivo",
      explanation: "Il controllo visivo e utile ma va integrato con altri test quando necessario.",
      difficulty: "base"
    },
    {
      question: "Cosa significa massimo pagabile?",
      options: ["Il limite oltre cui il margine target non sarebbe rispettato", "Il prezzo di borsa", "Il valore numismatico", "Il prezzo piu alto del competitor"],
      correct_answer: "Il limite oltre cui il margine target non sarebbe rispettato",
      explanation: "Il massimo pagabile e una soglia operativa, non una garanzia di prezzo.",
      difficulty: "intermedio"
    }
  ];
  const selected = base[index % base.length];
  return {
    ...selected,
    question: `${selected.question} (${module.title} - ${lessonTitle})`,
    category: module.title,
    module_number: module.number,
    lesson_title: lessonTitle,
    source_type: "Approfondimento OroActive"
  };
}

export function buildGoldMasterCoursePayload({ sourceText = "", sourceDocument = null } = {}) {
  const chapters = splitBookIntoChapters(sourceText);
  const sourceFound = Boolean(sourceText && sourceText.trim().length > 1000);
  const modules = GOLD_MASTER_MODULES.map((module) => {
    const lessons = module.lessons.map((lessonTitle, lessonIndex) => {
      const lesson = {
        key: goldMasterLessonKey(module, lessonIndex),
        title: `${module.number}.${lessonIndex + 1} ${lessonTitle}`,
        rawTitle: lessonTitle,
        objective: lessonObjective(lessonTitle, module),
        keywords: [...module.keywords, lessonTitle],
        summary: lessonSummary(lessonTitle, module),
        duration_minutes: Math.max(20, Math.round(2400 / GOLD_MASTER_MODULES.reduce((sum, item) => sum + item.lessons.length, 0))),
        order: lessonIndex + 1
      };
      const sourceRef = findLessonSourceReference(sourceText, chapters, { ...lesson, title: lessonTitle }, module);
      return {
        ...lesson,
        source_ref: {
          ...sourceRef,
          document_title: sourceDocument?.title || "La Bilancia d'Oro",
          document_path: sourceDocument?.filePath || sourceDocument?.file_path || ""
        },
        content_blocks: [
          {
            type: sourceRef.found ? "source_extracted" : "source_review_needed",
            title: sourceRef.found ? "Riferimento La Bilancia d'Oro" : "Fonte da revisionare",
            text: sourceRef.found
              ? sourceRef.excerpt
              : sourceRef.status === "source_missing"
                ? "File La Bilancia d'Oro non trovato. Caricare il libro per generare il contenuto completo della lezione."
                : "Il libro e disponibile, ma questa lezione richiede revisione manuale del Founder per agganciare il passaggio corretto.",
            attribution: "La Bilancia d'Oro",
            confidence: sourceRef.confidence
          },
          {
            type: "oroactive_application",
            title: "Applicazione OroActive",
            text: lesson.summary,
            attribution: "Approfondimento OroActive"
          }
        ],
        slides: buildLessonSlides(module, lesson, sourceRef),
        quiz: Array.from({ length: 4 }, (_, index) => buildQuizQuestion(module, lessonTitle, index))
      };
    });
    return {
      ...module,
      key: goldMasterModuleKey(module),
      lessons
    };
  });
  return {
    code: GOLD_MASTER_COURSE_CODE,
    title: GOLD_MASTER_COURSE_TITLE,
    category: "Formazione Compro Oro",
    faculty: "OroActive Academy",
    section: "Oro Master",
    level: "Avanzato",
    duration_label: "40 ore",
    duration_minutes: 2400,
    teacher: "OroActive Academy",
    final_certification: true,
    active: true,
    status: sourceFound ? "draft_review" : "draft_missing_source",
    warning: sourceFound ? "" : "File La Bilancia d'Oro non trovato. Caricare il libro per generare il corso completo.",
    source_found: sourceFound,
    source_document: sourceDocument,
    modules,
    schemes: GOLD_MASTER_SCHEMES,
    media_prompts: GOLD_MASTER_MEDIA_PROMPTS,
    final_exam: buildGoldMasterFinalExam(modules),
    badge: {
      name: GOLD_MASTER_BADGE_NAME,
      description: "Assegnato a chi completa il corso Oro Master e supera l'esame finale interno OroActive Academy.",
      certification: GOLD_MASTER_CERTIFICATION_NAME
    }
  };
}

export function buildLessonSlides(module = {}, lesson = {}, sourceRef = {}) {
  const sourceLabel = sourceRef.found
    ? `${sourceRef.chapter} - riferimento da revisionare`
    : "Riferimento libro da completare";
  return [
    {
      title: lesson.title,
      subtitle: `Modulo ${module.number} - ${module.title}`,
      bullets: [lesson.objective, "Corso interno OroActive Academy", sourceLabel]
    },
    {
      title: "Concetti chiave",
      bullets: (lesson.keywords || module.keywords || []).slice(0, 6)
    },
    {
      title: "Contenuto fonte",
      bullets: [
        sourceRef.found ? "Passaggio agganciato automaticamente al libro." : "Passaggio non agganciato automaticamente.",
        "Il Founder deve revisionare i riferimenti prima della pubblicazione.",
        "Gli esempi pratici sono separati dal contenuto fonte."
      ]
    },
    {
      title: "Applicazione operativa",
      bullets: [
        "Usa il concetto nella compilazione dell'atto o nella valutazione.",
        "Distingui valore teorico, dato verificato e procedura interna.",
        "Documenta sempre dubbi, controlli e anomalie."
      ]
    },
    {
      title: "Errori da evitare",
      bullets: [
        "Attribuire al libro contenuti non presenti.",
        "Saltare controlli quando il dato non e certo.",
        "Confondere prezzo di borsa, valore teorico e prezzo cliente."
      ]
    },
    {
      title: "Riepilogo e verifica",
      bullets: [
        "Ripeti il concetto con parole tue.",
        "Applica la formula o la procedura in un caso pratico.",
        "Completa il quiz intermedio."
      ]
    }
  ];
}

export function buildGoldMasterFinalExam(modules = []) {
  const theoreticalQuestions = [];
  modules.forEach((module) => {
    module.lessons.slice(0, 5).forEach((lesson, index) => {
      theoreticalQuestions.push(buildQuizQuestion(module, lesson.rawTitle || lesson.title, index));
    });
  });
  while (theoreticalQuestions.length < 60) {
    const module = modules[theoreticalQuestions.length % modules.length] || GOLD_MASTER_MODULES[0];
    const lesson = module.lessons?.[0] || { rawTitle: module.title };
    theoreticalQuestions.push(buildQuizQuestion(module, lesson.rawTitle || module.title, theoreticalQuestions.length));
  }
  return {
    title: "Esame finale Oro Master",
    certification: GOLD_MASTER_CERTIFICATION_NAME,
    badge: GOLD_MASTER_BADGE_NAME,
    threshold_online: 80,
    requires_live_approval: true,
    practical_cases: 10,
    simulations: [
      "Simulazione atto di vendita",
      "Valutazione oggetto prezioso",
      "Calcolo prezzo massimo pagabile",
      "Riconoscimento rischio operativo"
    ],
    questions: theoreticalQuestions.slice(0, 60),
    disclaimer: "La certificazione e interna OroActive Academy e non costituisce certificazione universitaria o esterna."
  };
}

export async function findBilanciaDOroSource({ fs, path, rootDir = process.cwd(), candidates = GOLD_MASTER_SOURCE_CANDIDATES } = {}) {
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate) ? candidate : path.join(rootDir, candidate);
    try {
      const stats = await fs.stat(resolved);
      if (stats.isFile() && stats.size > 1024 && !path.basename(resolved).startsWith("~$") && !path.basename(resolved).startsWith("._")) {
        return {
          found: true,
          title: "La Bilancia d'Oro",
          filePath: resolved,
          source_type: path.extname(resolved).replace(".", "").toLowerCase() || "file",
          size: stats.size,
          updated_at: stats.mtime?.toISOString?.() || null
        };
      }
    } catch {
      // Candidate not available in this environment.
    }
  }
  return {
    found: false,
    title: "La Bilancia d'Oro",
    filePath: "",
    source_type: "missing",
    size: 0,
    updated_at: null
  };
}
