import {
  GEM_CATALOG_SEED,
  GEM_TOOL_SEED
} from "../academy/gemologicalCatalog.js";

// Il catalogo Academy resta la fonte canonica: Aurum indicizza i record senza duplicarli.
const DEFAULT_CONTEXT_MAX_CHARS = 12_000;
const DEFAULT_ANSWER_MAX_CHARS = 16_000;
const MAX_QUERY_CHARS = 800;

const SEARCH_STOP_WORDS = new Set([
  "a",
  "ai",
  "al",
  "alla",
  "alle",
  "aurum",
  "che",
  "come",
  "con",
  "cosa",
  "da",
  "della",
  "delle",
  "del",
  "dei",
  "di",
  "e",
  "gemma",
  "gemme",
  "gemmologica",
  "gemmologico",
  "il",
  "in",
  "la",
  "le",
  "lo",
  "materiale",
  "materiali",
  "mi",
  "mostra",
  "nel",
  "nella",
  "pietra",
  "pietre",
  "per",
  "proprieta",
  "quale",
  "quali",
  "scheda",
  "spiega",
  "sulla",
  "sulle",
  "un",
  "una"
]);

const SUSPICIOUS_INSTRUCTION_PATTERNS = [
  /\b(?:ignora|ignorare|ignore|disregard|bypassa|override)\b.*\b(?:istruzion|instruction|regol|rules|prompt|sistema|system)\b/i,
  /\b(?:system|developer|assistant)\s+(?:message|prompt)\b/i,
  /\b(?:rivela|reveal|stampa|print)\b.*\b(?:prompt|segreto|secret|token|chiave|key)\b/i,
  /\b(?:esegui|execute|run)\b.*\b(?:comando|command|codice|code|script)\b/i
];

const COMPARISON_PATTERN = /\b(?:confronta|confronto|differenza|differenze|distinguere|distinzione|versus|vs)\b/;
const TOOL_INTENT_PATTERN = /\b(?:strument|misur|test|esame|analisi|usa|usare|utilizz|funziona|procedura|taratura|calibr|osserva|rileva)\w*\b/;
const ALL_TOOLS_PATTERN = /\b(?:tutti|elenco|lista|quali)\b.*\bstrument\w*\b|\bstrument\w*\b.*\b(?:tutti|completi)\b/;

const COMMON_TOOL_REFERENCE_SOURCES = Object.freeze([
  Object.freeze({
    title: "Gem Identification",
    organization: "Gemological Institute of America (GIA)",
    url: "https://www.gia.edu/gem-education/course-gem-ident",
    note: "Riferimento formativo generale per metodi, strumenti e limiti dell'identificazione gemmologica.",
    source_scope: "Riferimento generale: non certifica il singolo campione e non sostituisce il manuale dello strumento."
  }),
  Object.freeze({
    title: "Analysis of Gemstones at the GIA Laboratory",
    organization: "Gemological Institute of America (GIA)",
    url: "https://www.gia.edu/gems-gemology/winter-2024-gemstone-analysis",
    note: "Panoramica generale sull'integrazione di osservazioni e tecniche analitiche in laboratorio.",
    source_scope: "Riferimento generale: applicabilità e conclusioni dipendono da materiale, metodo e campione."
  }),
  Object.freeze({
    title: "CIBJO Gemmological Laboratories Blue Book 2024",
    organization: "CIBJO – The World Jewellery Confederation",
    url: "https://cibjo.org/wp-content/uploads/2024/11/CIBJO-Gemmological-Laboratories-Blue-Book-2024-02-11.pdf",
    note: "Principi generali per terminologia, esame, descrizione e comunicazione dei risultati gemmologici.",
    source_scope: "Riferimento generale: non costituisce rapporto sul singolo campione e non rende diagnostico un test isolato."
  }),
  Object.freeze({
    title: "CIBJO Diamond Blue Book 2024",
    organization: "CIBJO – The World Jewellery Confederation",
    url: "https://cibjo.org/wp-content/uploads/2024/11/CIBJO-Diamond-Blue-Book-2024-1.pdf",
    note: "Nomenclatura e principi generali di dichiarazione per diamanti naturali, trattati e prodotti in laboratorio.",
    source_scope: "Riferimento generale: pertinente ai diamanti e non estendibile automaticamente a ogni gemma o strumento."
  })
]);

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function truncateText(value = "", maxChars = 800) {
  const text = String(value ?? "").trim();
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function sanitizeKnowledgeText(value = "", maxChars = 1_600) {
  const text = String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  const safeLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !SUSPICIOUS_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(line)));
  return truncateText(safeLines.join(" ").replace(/\s+/g, " ").trim(), maxChars);
}

function asTextArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeKnowledgeText(
        item && typeof item === "object"
          ? item.name || item.title || item.description || JSON.stringify(item)
          : item,
        600
      ))
      .filter(Boolean);
  }
  const text = sanitizeKnowledgeText(value, 1_200);
  return text ? [text] : [];
}

function uniqueNormalized(values = []) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function phraseIncluded(haystack = "", needle = "") {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function tokenList(value = "") {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function significantQueryTokens(normalizedQuery = "") {
  return normalizedQuery
    .split(" ")
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
}

function tokenOverlapScore(queryTokens = [], targetTokens = []) {
  if (!queryTokens.length || !targetTokens.length) return 0;
  const target = new Set(targetTokens);
  const common = [...new Set(queryTokens)].filter((token) => target.has(token)).length;
  return common / Math.max(1, new Set(targetTokens).size);
}

function appendBoundedSections(sections = [], maxChars = DEFAULT_CONTEXT_MAX_CHARS) {
  const limit = boundedInteger(maxChars, DEFAULT_CONTEXT_MAX_CHARS, 300, 60_000);
  let output = "";
  for (const section of sections.filter(Boolean)) {
    const separator = output ? "\n\n---\n\n" : "";
    const remaining = limit - output.length - separator.length;
    if (remaining <= 0) break;
    if (section.length <= remaining) {
      output += `${separator}${section}`;
      continue;
    }
    const marker = "\n[Contesto abbreviato per rispettare il limite.]";
    output += `${separator}${truncateText(section, Math.max(1, remaining - marker.length))}${marker}`.slice(0, remaining + separator.length);
    break;
  }
  return output.slice(0, limit);
}

const TOOL_GUIDANCE_DETAILS = Object.freeze({
  "Lente 10x": {
    aliases: ["lente", "lente gemmologica", "loupe", "lente dieci ingrandimenti"],
    purpose: "Primo esame non distruttivo di superficie, spigoli, cintura, inclusioni, fratture e segni di assemblaggio o trattamento.",
    preparation: [
      "Pulire lente e campione con metodo compatibile e predisporre luce bianca diffusa.",
      "Annotare se la pietra è sciolta o montata e quali zone non sono accessibili."
    ],
    procedure: [
      "Tenere la lente vicino all'occhio e portare il campione a fuoco, senza appoggiare il vetro alla pietra.",
      "Ruotare lentamente il campione osservandolo in luce riflessa e trasmessa.",
      "Controllare cintura, giunzioni di faccetta, cavità, inclusioni, abrasioni, riempimenti e linee di giunzione."
    ],
    observations: ["Morfologia e distribuzione delle inclusioni.", "Usura, rivestimenti, fratture, bolle o strutture composite."],
    limitations: ["Non misura indice di rifrazione, densità o composizione.", "Una caratteristica visiva isolata non prova origine naturale, sintesi o trattamento."],
    safety: ["Bloccare il campione con pinzette idonee senza esercitare pressione su fratture o sfaldature."],
    next_step: "Scegliere almeno un test fisico o ottico indipendente coerente con il materiale osservato."
  },
  "Microscopio gemmologico": {
    aliases: ["microscopio", "microscopio ottico", "campo scuro", "darkfield"],
    purpose: "Esame ingrandito di inclusioni, crescita, giunzioni, superfici, riempimenti e caratteristiche diagnostiche con illuminazioni controllate.",
    preparation: [
      "Pulire il campione e verificare stabilità di pietra, pinzetta e montatura.",
      "Impostare basso ingrandimento e illuminazione in campo scuro prima di aumentare il dettaglio."
    ],
    procedure: [
      "Esaminare l'intero volume a basso ingrandimento per non perdere la distribuzione generale.",
      "Alternare campo scuro, campo chiaro, luce obliqua e fibra ottica quando disponibili.",
      "Ruotare il campione, mettere a fuoco piani diversi e documentare posizione e orientamento dei caratteri."
    ],
    observations: ["Cristalli, tubi, piume, zoning, linee di crescita, bolle e residui di flusso.", "Flash effect, canali laser, superfici di giunzione e rivestimenti."],
    limitations: ["Molti campioni puliti restano non conclusivi.", "L'interpretazione richiede esperienza e confronto con altre proprietà o analisi avanzate."],
    safety: ["Evitare calore eccessivo da sorgenti luminose concentrate su materiali sensibili."],
    next_step: "Correlare le osservazioni con RI, comportamento ottico, densità, spettro o referral di laboratorio."
  },
  "Microscopio digitale": {
    aliases: ["video microscopio", "microscopio usb", "digital microscope"],
    purpose: "Documentazione macro ripetibile di superficie e caratteristiche visibili, utile per confronto, formazione e tracciabilità.",
    preparation: [
      "Calibrare scala e bilanciamento del bianco con riferimento noto.",
      "Pulire piano, ottica e campione; registrare illuminazione e ingrandimento."
    ],
    procedure: [
      "Acquisire prima una vista generale e poi dettagli con scala visibile.",
      "Mantenere illuminazione, distanza e orientamento coerenti tra immagini di confronto.",
      "Salvare file con identificativo anonimo del campione, vista e data."
    ],
    observations: ["Usura, cavità, tessiture, giunzioni e particolari superficiali.", "Variazioni apparenti al cambiare dell'illuminazione."],
    limitations: ["L'ingrandimento dichiarato dal software può non essere metrologico.", "Una fotografia non certifica identità, origine, trattamento o valore."],
    safety: ["Non includere dati personali o documenti del cliente nell'inquadratura."],
    next_step: "Confermare ogni ipotesi con strumenti gemmologici appropriati e osservazione diretta."
  },
  "Bilancia di precisione": {
    aliases: ["bilancia carati", "bilancia ct", "bilancia gemmologica di precisione"],
    purpose: "Misura ripetibile della massa della pietra o dell'oggetto, espressa in carati o grammi.",
    preparation: [
      "Livellare, azzerare e verificare la bilancia con massa certificata idonea.",
      "Proteggere il piano da vibrazioni, correnti d'aria e contaminazioni."
    ],
    procedure: [
      "Selezionare l'unità corretta e tarare l'eventuale contenitore.",
      "Posare il campione asciutto e stabile senza toccarlo durante la lettura.",
      "Ripetere almeno due misure e registrare risoluzione e incertezza dello strumento."
    ],
    observations: ["Massa stabile e ripetibile.", "Scostamenti che possono indicare errore di taratura, sporco o instabilità."],
    limitations: ["La massa da sola non identifica un materiale.", "Pietre montate includono la massa del metallo e non permettono stime dirette affidabili."],
    safety: ["Usare un vassoio che impedisca la caduta di campioni piccoli."],
    next_step: "Associare massa e misure dimensionali; usare il metodo idrostatico solo su campioni idonei."
  },
  "Calibro gemmologico": {
    aliases: ["calibro", "calibro per pietre", "gem gauge"],
    purpose: "Misura di diametro, lunghezza, larghezza e profondità accessibili per descrizione, controllo e stime dimensionali.",
    preparation: [
      "Verificare zero, pulizia delle punte e unità di misura.",
      "Controllare che il campione sia stabile e che la montatura non venga deformata."
    ],
    procedure: [
      "Chiudere le punte con pressione minima sui punti realmente accessibili.",
      "Misurare assi principali e profondità quando possibile.",
      "Ripetere la lettura e registrare se la misura è diretta, stimata o limitata dalla montatura."
    ],
    observations: ["Dimensioni utili alla descrizione e al confronto con la massa.", "Asimmetrie, cintura irregolare o profondità non coerente."],
    limitations: ["Non determina specie o autenticità.", "Una pressione eccessiva può scheggiare bordi fragili o falsare la misura."],
    safety: ["Non serrare su sfaldature, cavità, perle, opali o materiali organici delicati."],
    next_step: "Confrontare dimensioni, massa e densità attesa senza usare formule di peso come identificazione definitiva."
  },
  "Rifrattometro": {
    aliases: ["rifrattometro gemmologico", "indice di rifrazione", "misura ri", "ri gemmologico"],
    purpose: "Misura dell'indice di rifrazione e, quando osservabile, della birifrangenza di una faccetta piana accessibile.",
    preparation: [
      "Controllare calibrazione con standard e pulire prisma, faccetta e illuminatore.",
      "Usare solo liquido di contatto compatibile, in quantità minima, verificandone indice e stato."
    ],
    procedure: [
      "Deporre una microgoccia sul prisma e appoggiare delicatamente la faccetta più ampia.",
      "Leggere il limite luce-ombra, ruotando il campione per cercare valori massimo e minimo.",
      "Ripetere la misura, rimuovere subito il campione e pulire prisma e pietra."
    ],
    observations: ["Uno o due limiti, intervallo RI e possibile birifrangenza.", "Comportamento anomalo dovuto a superficie curva, aggregato, tensioni o contatto insufficiente."],
    limitations: ["Non misura oltre il limite ottico dello strumento.", "Montature, cabochon, superfici rovinate e materiali porosi possono impedire o falsare la lettura."],
    safety: ["Il liquido di contatto può essere tossico o corrosivo: seguire SDS, ventilazione e DPI previsti."],
    next_step: "Confrontare il valore con carattere ottico, densità, spettro e osservazioni microscopiche."
  },
  "Liquido di contatto": {
    aliases: ["liquido rifrattometro", "contact liquid", "liquido ad alto indice"],
    purpose: "Crea l'accoppiamento ottico controllato fra prisma del rifrattometro e faccetta del campione.",
    preparation: [
      "Verificare etichetta, indice nominale, scadenza, SDS e compatibilità con campione e prisma.",
      "Lavorare su superficie protetta e ventilata con applicatore dedicato."
    ],
    procedure: [
      "Applicare una microgoccia, evitando eccessi e contatto con montatura o zone porose.",
      "Eseguire la lettura senza trascinare la pietra sul prisma.",
      "Rimuovere e pulire immediatamente ogni residuo secondo istruzioni del produttore."
    ],
    observations: ["Linea luce-ombra più netta quando il contatto è corretto.", "Cristallizzazione, contaminazione o bolle che rendono instabile la lettura."],
    limitations: ["Non è uno strumento identificativo autonomo.", "Può danneggiare materiali porosi, trattati, organici o superfici rivestite."],
    safety: ["Evitare pelle, occhi e inalazione; non usare senza SDS e procedure del laboratorio."],
    next_step: "Se il liquido non è compatibile, scegliere metodi ottici alternativi non a contatto."
  },
  "Polariscopio": {
    aliases: ["polariscopio gemmologico", "polarizzatori incrociati", "crossed polars"],
    purpose: "Distingue comportamento isotropo, anisotropo, aggregato o anomalo mediante rotazione fra polarizzatori incrociati.",
    preparation: [
      "Verificare estinzione dei polarizzatori senza campione.",
      "Pulire il campione e scegliere una direzione trasparente non schermata dalla montatura."
    ],
    procedure: [
      "Inserire il campione tra i polarizzatori e ruotarlo di 360 gradi.",
      "Osservare alternanza chiaro-scuro, reazione costante, lampeggi o bande anomale.",
      "Ripetere lungo più direzioni e annotare condizioni di osservazione."
    ],
    observations: ["Estinzione periodica nei materiali anisotropi.", "Reazione sempre scura, aggregata o birifrangenza anomala da tensione."],
    limitations: ["Opacità, montatura, inclusioni e tensioni possono mascherare la risposta.", "Non identifica da solo specie, origine o trattamento."],
    safety: ["Fissare i piccoli campioni per evitarne la caduta durante la rotazione."],
    next_step: "Usare conoscopio, RI o altre proprietà per precisare il carattere ottico."
  },
  "Conoscopio": {
    aliases: ["lente conoscopica", "figura di interferenza", "conoscope"],
    purpose: "Osservazione della figura d'interferenza per supportare la determinazione del segno e del carattere ottico.",
    preparation: [
      "Usare polariscopio correttamente incrociato e una sorgente convergente.",
      "Individuare una direzione ottica favorevole su campione trasparente."
    ],
    procedure: [
      "Posizionare il campione nel polariscopio e cercare una figura stabile.",
      "Inserire il conoscopio senza cambiare orientamento.",
      "Osservare forma, movimento e separazione delle isogire durante una piccola rotazione."
    ],
    observations: ["Figure uniassiche o biassiche quando orientamento e qualità lo consentono.", "Figure distorte da tensioni, taglio, inclusioni o orientamento sfavorevole."],
    limitations: ["Spesso non conclusivo su pietre piccole, montate, torbide o mal orientate.", "Richiede interpretazione esperta e non sostituisce RI o analisi strumentale."],
    safety: ["Evitare pressioni sul campione mentre si regola l'ottica."],
    next_step: "Registrare esito anche se non osservabile e confrontarlo con RI, sistema cristallino e polariscopio."
  },
  "Dicroscopio": {
    aliases: ["dicroiscopio", "pleocroismo", "dichroscope"],
    purpose: "Confronta simultaneamente componenti cromatiche pleocroiche in materiali anisotropi colorati.",
    preparation: [
      "Usare luce daylight diffusa e campione pulito.",
      "Scegliere zone trasparenti evitando riflessi della montatura."
    ],
    procedure: [
      "Osservare il campione attraverso il dicroscopio e mettere a fuoco le due finestre.",
      "Ruotare campione e strumento lungo più direzioni.",
      "Annotare colori, intensità e orientamento della differenza osservata."
    ],
    observations: ["Due colori o intensità differenti compatibili con pleocroismo.", "Assenza apparente su materiali isotropi o debolmente colorati."],
    limitations: ["Pietre piccole, pallide, aggregate o montate possono dare risposta debole.", "Il colore osservato non identifica da solo la specie."],
    safety: ["Non esporre materiali fotosensibili a luce intensa più del necessario."],
    next_step: "Correlare il pleocroismo con RI, carattere ottico, spettro e colore daylight."
  },
  "Spettroscopio": {
    aliases: ["spettroscopio gemmologico", "spettro di assorbimento", "spectroscope"],
    purpose: "Osservazione qualitativa di linee e bande di assorbimento nel visibile per supportare identificazione e origine del colore.",
    preparation: [
      "Verificare messa a fuoco e scala con sorgente o riferimento noto.",
      "Usare sorgente continua adeguata e schermare la luce parassita."
    ],
    procedure: [
      "Illuminare il campione in trasmissione o riflessione secondo trasparenza e taglio.",
      "Regolare fenditura e orientamento fino a ottenere uno spettro leggibile.",
      "Ripetere da direzioni diverse e registrare solo bande realmente osservate."
    ],
    observations: ["Posizione, larghezza e intensità relativa di linee e bande.", "Spettro debole o continuo senza caratteri utili."],
    limitations: ["La lettura manuale è qualitativa e sensibile a illuminazione, concentrazione e occhio dell'operatore.", "Spettri simili possono appartenere a materiali diversi o trattati."],
    safety: ["Non guardare sorgenti UV o laser attraverso lo strumento."],
    next_step: "Confrontare lo spettro con riferimenti validati e altre proprietà; usare UV-Vis o Raman quando necessario."
  },
  "Lampada UV lunga onda": {
    aliases: ["uv lunga", "uv long wave", "365 nm", "lampada uv 365"],
    purpose: "Osserva fluorescenza e fosforescenza indicativa sotto radiazione UV intorno a 365 nm.",
    preparation: [
      "Oscurare l'ambiente e verificare la lampada con riferimento noto.",
      "Pulire il campione, schermare riflessi e predisporre protezione UV."
    ],
    procedure: [
      "Esporre per intervallo controllato mantenendo distanza costante.",
      "Annotare colore, intensità, distribuzione e uniformità della fluorescenza.",
      "Spegnere la sorgente e osservare eventuale fosforescenza e durata."
    ],
    observations: ["Reazione uniforme, zonata, superficiale o assente.", "Persistenza dopo spegnimento e differenze fra parti o strati."],
    limitations: ["Una risposta presente o assente non è diagnostica da sola.", "Detergenti, colle, oli e rivestimenti possono fluorescere."],
    safety: ["Usare occhiali/barriere certificati e limitare esposizione di occhi e pelle."],
    next_step: "Confrontare con UV corta, microscopia e proprietà fisiche senza attribuire origine dalla sola fluorescenza."
  },
  "Lampada UV corta onda": {
    aliases: ["uv corta", "uv short wave", "254 nm", "lampada uv 254"],
    purpose: "Osserva fluorescenza, distribuzione di crescita e fosforescenza sotto UV intorno a 254 nm in camera protetta.",
    preparation: [
      "Usare esclusivamente una camera chiusa o schermatura certificata.",
      "Verificare lampada, timer, riferimento e assenza di persone esposte."
    ],
    procedure: [
      "Posizionare il campione nella camera, chiuderla e avviare un'esposizione breve e controllata.",
      "Registrare colore, intensità, pattern e confronto con UV lunga.",
      "Osservare la fosforescenza solo dopo spegnimento della sorgente."
    ],
    observations: ["Pattern settoriali o zonati e differenze rispetto alla lunga onda.", "Fosforescenza variabile che può orientare ulteriori analisi."],
    limitations: ["Non separa sempre naturale, sintetico e trattato.", "Interpretazione affidabile può richiedere imaging e spettroscopia avanzata."],
    safety: ["UV-C può danneggiare occhi e pelle: mai usare a sorgente aperta; seguire interlock e DPI."],
    next_step: "Se l'origine resta dubbia, classificare non conclusivo e inviare a laboratorio qualificato."
  },
  "Tester termico per diamanti": {
    aliases: ["tester diamanti", "diamond tester", "tester termico", "penna diamante"],
    purpose: "Pre-screening della conducibilità termica per separare molti simulanti dalla famiglia diamante/moissanite.",
    preparation: [
      "Verificare batteria, taratura, temperatura del campione e pulizia della punta.",
      "Pulire una faccetta accessibile e stabilizzare pietra e montatura."
    ],
    procedure: [
      "Impostare lo strumento secondo dimensione e temperatura previste dal produttore.",
      "Appoggiare la punta perpendicolarmente su una faccetta, evitando metallo e giunzioni.",
      "Ripetere su una seconda faccetta e registrare risposta e condizioni."
    ],
    observations: ["Risposta compatibile o non compatibile con alta conducibilità termica.", "Letture instabili dovute a contatto, pietre piccole, temperatura o montatura."],
    limitations: ["Molti tester termici non distinguono diamante e moissanite.", "Non distingue diamante naturale, sintetico o trattato."],
    safety: ["Non forzare la punta e non testare su superfici instabili o materiali molto fragili."],
    next_step: "Eseguire tester elettrico/moissanite e verifica ottica; per l'origine usare strumentazione avanzata."
  },
  "Tester elettrico/moissanite": {
    aliases: ["tester moissanite", "moissanite tester", "tester elettrico", "tester combinato diamante"],
    purpose: "Controllo complementare della conducibilità elettrica per separare molte moissaniti dal diamante dopo il test termico.",
    preparation: [
      "Verificare taratura, batteria e modalità corretta dello strumento.",
      "Pulire una faccetta e isolare il punto di prova dal metallo della montatura."
    ],
    procedure: [
      "Usare il tester termico come primo screening quando previsto.",
      "Appoggiare la sonda perpendicolarmente e attendere la lettura stabile.",
      "Ripetere in altro punto e confrontare con osservazione del raddoppio e inclusioni."
    ],
    observations: ["Risposta elettrica compatibile con moissanite o diamante secondo il modello.", "Falsi segnali per contatto metallico, umidità o pietre molto piccole."],
    limitations: ["Non distingue diamante naturale da HPHT o CVD.", "Alcuni materiali o modelli di tester richiedono controlli aggiuntivi."],
    safety: ["Seguire istruzioni del produttore e non usare su superfici bagnate."],
    next_step: "Se la famiglia diamante è confermata, non attribuire l'origine senza screening avanzato o laboratorio."
  },
  "Bilancia idrostatica": {
    aliases: ["peso specifico", "densita idrostatica", "specific gravity", "sg gemmologico"],
    purpose: "Stima del peso specifico confrontando massa in aria e massa apparente in liquido.",
    preparation: [
      "Calibrare la bilancia, controllare temperatura e densità del liquido e azzerare cestello o filo.",
      "Usare solo campioni sciolti, puliti, non porosi, non assemblati e compatibili con l'immersione."
    ],
    procedure: [
      "Misurare la massa asciutta in aria con lettura stabile.",
      "Immergere completamente il campione eliminando bolle senza toccare pareti o fondo.",
      "Misurare la massa apparente e calcolare SG documentando formula, temperatura e ripetizioni."
    ],
    observations: ["Valore ripetibile confrontabile con intervalli di riferimento.", "Bolle, capillarità o instabilità che alterano il risultato."],
    limitations: ["Inaffidabile su pietre montate, porose, cave, trattate, molto piccole o assemblate.", "Intervalli di specie diverse possono sovrapporsi."],
    safety: ["Usare liquido sicuro e pinzette; asciugare subito materiali sensibili."],
    next_step: "Correlare SG con RI, proprietà ottiche e microscopia; non identificare dal solo valore."
  },
  "Filtro Chelsea": {
    aliases: ["chelsea filter", "filtro smeraldi", "filtro colore"],
    purpose: "Osservazione complementare della trasmissione rosso/verde in alcuni materiali colorati e coloranti.",
    preparation: [
      "Usare luce bianca intensa e neutra con ambiente moderatamente oscurato.",
      "Confrontare con campione o riferimento noto e verificare la pulizia del filtro."
    ],
    procedure: [
      "Illuminare il campione dalla direzione più efficace senza abbagliamento.",
      "Osservare attraverso il filtro a breve distanza.",
      "Registrare la reazione come colore apparente, non come identificazione."
    ],
    observations: ["Reazione rossastra, verdastra o neutra sotto condizioni definite.", "Differenze tra zone che possono indicare composizione, tintura o assemblaggio."],
    limitations: ["Molti materiali naturali, sintetici e imitazioni condividono la stessa reazione.", "La risposta dipende da sorgente, spessore e concentrazione cromofora."],
    safety: ["Non usare con sorgenti laser o UV non schermate."],
    next_step: "Confermare con spettroscopio, RI, microscopia e altre proprietà indipendenti."
  },
  "Luce daylight": {
    aliases: ["lampada daylight", "luce diurna standard", "d65", "luce neutra"],
    purpose: "Valutazione ripetibile di colore, pleocroismo, trasparenza ed effetti ottici sotto illuminazione neutra controllata.",
    preparation: [
      "Usare sorgente con specifica nota, temperatura colore stabile e indice di resa cromatica adeguato.",
      "Neutralizzare sfondo e colori ambientali e lasciare stabilizzare la lampada."
    ],
    procedure: [
      "Osservare il campione su sfondo neutro da più direzioni.",
      "Confrontare, quando rilevante, con luce calda standard per cambiamento di colore.",
      "Registrare sorgente, distanza e descrizione cromatica senza correzioni automatiche."
    ],
    observations: ["Tonalità, saturazione, chiarezza e distribuzione del colore.", "Adularescenza, gatteggiamento, labradorescenza o cambiamento di colore."],
    limitations: ["Percezione umana, ambiente e fotocamera possono alterare il colore.", "Il colore non identifica da solo materiale, trattamento o provenienza."],
    safety: ["Limitare calore e tempo di esposizione su materiali fotosensibili."],
    next_step: "Integrare con dicroscopio, spettroscopio e proprietà fisiche."
  },
  "Fotocamera macro": {
    aliases: ["camera macro", "fotografia macro", "macro camera", "fotocamera gemme"],
    purpose: "Documentazione controllata di aspetto, orientamento, inclusioni visibili e stato del campione.",
    preparation: [
      "Impostare bilanciamento del bianco, scala, sfondo neutro e identificativo anonimo.",
      "Pulire campione, ottica e supporto; evitare riflessi di persone o documenti."
    ],
    procedure: [
      "Acquisire vista generale, profilo, retro e dettagli con scala.",
      "Usare illuminazione diffusa e, se necessario, una seconda configurazione documentata.",
      "Conservare originale e metadati senza filtri che alterino caratteristiche diagnostiche."
    ],
    observations: ["Forma, taglio, colore apparente, stato superficiale e dettagli visibili.", "Differenze fra illuminazioni che devono essere dichiarate."],
    limitations: ["Foto, compressione e schermo non riproducono fedelmente tutte le proprietà.", "L'immagine non sostituisce campione, test o certificato."],
    safety: ["Escludere volto, dati cliente, numeri documento e altri dati personali."],
    next_step: "Collegare le immagini al verbale degli strumenti realmente usati e ai relativi limiti."
  },
  "Magneti gemmologici": {
    aliases: ["magnete gemmologico", "magnetismo gemme", "magnetic wand"],
    purpose: "Test complementare della risposta magnetica apparente in materiali selezionati e in condizioni controllate.",
    preparation: [
      "Usare magnete di forza nota, supporto non magnetico e campione sciolto quando possibile.",
      "Rimuovere oggetti metallici e verificare che la risposta non provenga dalla montatura."
    ],
    procedure: [
      "Sospendere o appoggiare il campione su supporto a basso attrito.",
      "Avvicinare il magnete senza contatto e osservare movimento ripetibile.",
      "Ripetere invertendo direzione e confrontare con campione di controllo."
    ],
    observations: ["Attrazione apparente assente, debole o evidente.", "Risposte spurie da metallo, inclusioni, supporto o elettricità statica."],
    limitations: ["Non è diagnostico per la maggior parte delle gemme.", "Forza del magnete, massa e geometria rendono difficile confrontare prove non standardizzate."],
    safety: ["Tenere lontano da dispositivi medici, carte magnetiche, strumenti e persone sensibili ai magneti."],
    next_step: "Usare il dato solo come supporto e confermare con RI, SG, spettro e microscopia."
  },
  "Strumenti avanzati di laboratorio": {
    aliases: ["laboratorio gemmologico", "ftir", "raman", "fotoluminescenza", "uv vis", "imaging diamanti", "xrf"],
    purpose: "Analisi specialistica per composizione, difetti, crescita, trattamenti e separazione naturale/sintetico quando il banco non è conclusivo.",
    preparation: [
      "Definire quesito analitico, catena di custodia, stato del campione e autorizzazioni.",
      "Selezionare laboratorio competente e metodo validato per materiale e problema."
    ],
    procedure: [
      "Documentare campione, peso, misure, fotografie e risultati preliminari senza pregiudicare l'esito.",
      "Richiedere esplicitamente identificazione, origine naturale/sintetica, trattamento o altro quesito necessario.",
      "Valutare il rapporto con limiti, incertezza, riferimenti e firma del laboratorio."
    ],
    observations: ["Spettri, immagini di crescita, composizione e segnali strumentali interpretati da specialisti.", "Esito conclusivo, compatibile o non conclusivo secondo capacità del metodo."],
    limitations: ["Nessuna singola tecnica risolve ogni quesito.", "Costi, accessibilità, montatura e qualità del campione possono limitare l'analisi."],
    safety: ["Solo personale formato deve usare laser, raggi X, UV intensi, criogenia o reagenti."],
    next_step: "Riportare fedelmente l'esito del laboratorio senza estenderlo oltre quesito, campione e data analizzati."
  }
});

const materialEntries = GEM_CATALOG_SEED.map((material, index) => {
  const canonicalName = material.name || material.commercial_name || material.slug;
  const aliases = Array.isArray(material.aliases) ? material.aliases : [];
  const canonicalPhrase = normalizeSearchText(canonicalName);
  const aliasPhrases = uniqueNormalized(aliases);
  const slugPhrase = normalizeSearchText(String(material.slug || "").replace(/-/g, " "));
  const taxonomyPhrases = uniqueNormalized([
    material.mineral_name,
    material.mineralogical_name,
    material.family,
    material.group_name,
    material.gem_group,
    material.category,
    material.classification
  ]);
  const genericPhrases = uniqueNormalized([
    canonicalName,
    ...aliases,
    slugPhrase,
    material.mineral_name,
    material.mineralogical_name,
    material.family,
    material.group_name,
    material.gem_group
  ]);
  return Object.freeze({
    id: `gem:${material.slug}`,
    kind: "material",
    index,
    slug: material.slug,
    material,
    canonicalPhrase,
    aliasPhrases: Object.freeze(aliasPhrases),
    strongPhrases: Object.freeze(uniqueNormalized([canonicalName, ...aliases, slugPhrase])),
    genericPhrases: Object.freeze(genericPhrases),
    taxonomyPhrases: Object.freeze(taxonomyPhrases),
    nameTokens: Object.freeze(tokenList(canonicalName)),
    taxonomyTokens: Object.freeze(tokenList(taxonomyPhrases.join(" ")))
  });
});

const materialBySlug = new Map(materialEntries.map((entry) => [entry.slug, entry]));

export const AURUM_GEM_TOOL_INDEX = Object.freeze(GEM_TOOL_SEED.map((tool, index) => {
  const guidance = TOOL_GUIDANCE_DETAILS[tool.name];
  if (!guidance) {
    throw new Error(`Guida Aurum mancante per lo strumento: ${tool.name}`);
  }
  return Object.freeze({
    id: `gem-tool:${normalizeSearchText(tool.name).replace(/\s+/g, "-")}`,
    kind: "tool",
    index,
    name: tool.name,
    tool,
    aliases: Object.freeze([...guidance.aliases]),
    searchPhrases: Object.freeze(uniqueNormalized([tool.name, ...guidance.aliases])),
    purpose: guidance.purpose,
    preparation: Object.freeze([...guidance.preparation]),
    procedure: Object.freeze([...guidance.procedure]),
    observations: Object.freeze([...guidance.observations]),
    limitations: Object.freeze([...guidance.limitations]),
    safety: Object.freeze([...guidance.safety]),
    next_step: guidance.next_step
  });
}));

const toolByNormalizedName = new Map(
  AURUM_GEM_TOOL_INDEX.map((entry) => [normalizeSearchText(entry.name), entry])
);

export const AURUM_GEM_MATERIAL_INDEX = Object.freeze(materialEntries);

export const AURUM_GEM_KNOWLEDGE_STATS = Object.freeze({
  materialCount: AURUM_GEM_MATERIAL_INDEX.length,
  uniqueMaterialSlugs: materialBySlug.size,
  toolCount: AURUM_GEM_TOOL_INDEX.length,
  uniqueToolNames: toolByNormalizedName.size
});

function classificationSignals(normalizedQuery = "") {
  const classSignals = new Set();
  const processSignals = new Set();
  if (/\bhpht\b/.test(normalizedQuery)) processSignals.add("hpht");
  if (/\bcvd\b/.test(normalizedQuery)) processSignals.add("cvd");
  if (/\bsintetic\w*\b|\blaborator\w*\b/.test(normalizedQuery)) classSignals.add("sintetica");
  if (/\bnatural\w*\b/.test(normalizedQuery)) classSignals.add("naturale");
  if (/\btrattat\w*\b/.test(normalizedQuery)) classSignals.add("trattata");
  if (/\bimitazion\w*\b|\bsimulant\w*\b/.test(normalizedQuery)) classSignals.add("imitazione");
  if (/\bcoltivat\w*\b/.test(normalizedQuery)) classSignals.add("coltivata");
  if (/\bassemblat\w*\b|\bdoppiett\w*\b|\btriplett\w*\b/.test(normalizedQuery)) classSignals.add("assemblata");
  return { classSignals, processSignals };
}

function materialSignalText(entry) {
  const material = entry.material;
  return normalizeSearchText([
    material.name,
    material.slug,
    material.classification,
    ...(Array.isArray(material.aliases) ? material.aliases : [])
  ].filter(Boolean).join(" "));
}

function matchesClassSignal(signalText, signal) {
  if (signal === "sintetica") return /\bsintetic\w*\b|\bhpht\b|\bcvd\b|\blaborator\w*\b/.test(signalText);
  if (signal === "naturale") return /\bnatural\w*\b/.test(signalText);
  if (signal === "trattata") return /\btrattat\w*\b/.test(signalText);
  if (signal === "imitazione") return /\bimitazion\w*\b|\bsimulant\w*\b/.test(signalText);
  if (signal === "coltivata") return /\bcoltivat\w*\b/.test(signalText);
  if (signal === "assemblata") return /\bassemblat\w*\b|\bdoppiett\w*\b|\btriplett\w*\b/.test(signalText);
  return false;
}

function scoreMaterial(entry, normalizedQuery, queryTokens, signals) {
  let score = 0;
  const reasons = [];
  let exactTokenCount = 0;
  let exactKind = "";

  if (normalizedQuery === entry.canonicalPhrase) {
    score += 2_100;
    exactTokenCount = entry.nameTokens.length;
    exactKind = "canonical_exact";
    reasons.push("nome canonico esatto");
  } else if (phraseIncluded(normalizedQuery, entry.canonicalPhrase)) {
    exactTokenCount = entry.nameTokens.length;
    exactKind = "canonical_phrase";
    score += 1_500 + exactTokenCount * 25;
    reasons.push("nome canonico nella domanda");
  }

  for (const alias of entry.aliasPhrases) {
    const aliasTokens = tokenList(alias).length;
    if (normalizedQuery === alias) {
      if (1_950 + aliasTokens * 20 > score) {
        score = 1_950 + aliasTokens * 20;
        exactTokenCount = aliasTokens;
        exactKind = "alias_exact";
      }
      reasons.push(`alias esatto: ${alias}`);
    } else if (phraseIncluded(normalizedQuery, alias) && aliasTokens >= exactTokenCount) {
      const aliasScore = 1_400 + aliasTokens * 20;
      if (aliasScore > score) {
        score = aliasScore;
        exactTokenCount = aliasTokens;
        exactKind = "alias_phrase";
      }
      reasons.push(`alias nella domanda: ${alias}`);
    }
  }

  const nameOverlap = tokenOverlapScore(queryTokens, entry.nameTokens);
  if (nameOverlap > 0) {
    score += Math.round(nameOverlap * 360);
    reasons.push("termini del nome");
  }
  const taxonomyOverlap = tokenOverlapScore(queryTokens, entry.taxonomyTokens);
  if (taxonomyOverlap > 0) {
    score += Math.round(taxonomyOverlap * 180);
    reasons.push("famiglia o categoria");
  }
  entry.taxonomyPhrases.forEach((phrase) => {
    if (phraseIncluded(normalizedQuery, phrase)) score += 90;
  });

  const signalText = materialSignalText(entry);
  let hardMismatch = false;
  if (signals.processSignals.size) {
    const processMatches = [...signals.processSignals].filter((signal) => phraseIncluded(signalText, signal));
    if (signals.processSignals.size === 1 && !processMatches.length) {
      hardMismatch = true;
      score -= 1_400;
    } else if (processMatches.length) {
      score += 420;
      reasons.push(`processo ${processMatches.join("/")}`);
    }
  }
  if (signals.classSignals.size) {
    const classMatches = [...signals.classSignals].filter((signal) => matchesClassSignal(signalText, signal));
    if (signals.classSignals.size === 1 && !classMatches.length) {
      hardMismatch = true;
      score -= 1_100;
    } else if (classMatches.length) {
      score += 300;
      reasons.push(`classificazione ${classMatches.join("/")}`);
    }
  }

  return {
    entry,
    score,
    exactTokenCount,
    exactKind,
    hardMismatch,
    reasons
  };
}

function publicMaterialMatch(match) {
  return Object.freeze({
    id: match.entry.id,
    kind: "material",
    slug: match.entry.slug,
    name: match.entry.material.name || match.entry.material.commercial_name,
    score: match.score,
    confidence: match.exactTokenCount > 0 ? "alta" : match.score >= 500 ? "media" : "bassa",
    matchType: match.exactKind || "semantic_tokens",
    reasons: Object.freeze([...match.reasons]),
    material: match.entry.material
  });
}

function scoreTool(entry, normalizedQuery, queryTokens) {
  let score = 0;
  let exactTokenCount = 0;
  const reasons = [];
  entry.searchPhrases.forEach((phrase, phraseIndex) => {
    const count = tokenList(phrase).length;
    if (normalizedQuery === phrase) {
      const candidate = (phraseIndex === 0 ? 2_000 : 1_850) + count * 20;
      if (candidate > score) {
        score = candidate;
        exactTokenCount = count;
      }
      reasons.push(phraseIndex === 0 ? "strumento esatto" : `alias esatto: ${phrase}`);
    } else if (phraseIncluded(normalizedQuery, phrase)) {
      const candidate = (phraseIndex === 0 ? 1_400 : 1_300) + count * 20;
      if (candidate > score) {
        score = candidate;
        exactTokenCount = count;
      }
      reasons.push(phraseIndex === 0 ? "nome strumento nella domanda" : `alias nella domanda: ${phrase}`);
    }
  });
  const overlap = tokenOverlapScore(queryTokens, tokenList([entry.name, ...entry.aliases].join(" ")));
  score += Math.round(overlap * 300);
  if (TOOL_INTENT_PATTERN.test(normalizedQuery)) score += 60;
  return { entry, score, exactTokenCount, reasons };
}

function publicToolMatch(match, source = "query") {
  return Object.freeze({
    id: match.entry.id,
    kind: "tool",
    name: match.entry.name,
    score: match.score,
    confidence: match.exactTokenCount > 0 ? "alta" : "media",
    source,
    reasons: Object.freeze([...match.reasons]),
    guidance: match.entry
  });
}

function comparisonRequested(normalizedQuery, explicitMatches) {
  if (COMPARISON_PATTERN.test(normalizedQuery)) return true;
  return explicitMatches.length > 1 && phraseIncluded(normalizedQuery, "e");
}

function genericTokenStem(value = "") {
  const token = normalizeSearchText(value);
  return token.length > 4 ? token.replace(/[aeiou]$/, "") : token;
}

function entryMatchesGenericToken(entry, token) {
  const expected = genericTokenStem(token);
  const candidates = uniqueNormalized(entry.genericPhrases.flatMap((phrase) => tokenList(phrase)));
  return candidates.some((candidate) => (
    candidate === token
    || (expected.length >= 4 && genericTokenStem(candidate) === expected)
  ));
}

function materialMatchesForQuery(normalizedQuery, limit) {
  const queryTokens = significantQueryTokens(normalizedQuery);
  if (!queryTokens.length) {
    return { selected: [], primary: null, ambiguous: false, comparison: false };
  }
  const signals = classificationSignals(normalizedQuery);
  if (!signals.classSignals.size && !signals.processSignals.size && queryTokens.length === 1) {
    const genericMatches = materialEntries
      .filter((entry) => entryMatchesGenericToken(entry, queryTokens[0]))
      .map((entry) => scoreMaterial(entry, normalizedQuery, queryTokens, signals))
      .sort((left, right) => right.score - left.score || left.entry.index - right.entry.index);
    if (genericMatches.length > 1) {
      return {
        selected: genericMatches.slice(0, limit),
        primary: null,
        ambiguous: true,
        comparison: false
      };
    }
  }
  const topicalAnchorTokens = queryTokens.filter((token) => (
    !/^(?:sintetic|natural|trattat|imitazion|simulant|coltivat|assemblat|laborator)/.test(token)
    && token !== "hpht"
    && token !== "cvd"
  ));
  const scored = materialEntries
    .map((entry) => scoreMaterial(entry, normalizedQuery, queryTokens, signals))
    .filter((match) => {
      if (match.hardMismatch || match.score < 170) return false;
      if (!(signals.classSignals.size || signals.processSignals.size) || !topicalAnchorTokens.length) return true;
      const anchorText = normalizeSearchText([
        ...match.entry.strongPhrases,
        ...match.entry.taxonomyPhrases
      ].join(" "));
      return topicalAnchorTokens.some((token) => phraseIncluded(anchorText, token));
    })
    .sort((left, right) => right.score - left.score || left.entry.index - right.entry.index);

  const explicitMatches = scored.filter((match) => match.exactTokenCount > 0);
  if (explicitMatches.length) {
    const longest = Math.max(...explicitMatches.map((match) => match.exactTokenCount));
    const mostSpecific = explicitMatches.filter((match) => match.exactTokenCount === longest);
    const comparison = comparisonRequested(normalizedQuery, mostSpecific);
    if (mostSpecific.length === 1) {
      const selected = [mostSpecific[0]];
      return { selected, primary: selected[0], ambiguous: false, comparison: false };
    }
    const selected = mostSpecific.slice(0, limit);
    return {
      selected,
      primary: comparison ? selected[0] : null,
      ambiguous: !comparison,
      comparison
    };
  }

  const coreTokens = significantQueryTokens(normalizedQuery);
  if (coreTokens.length === 1) {
    const token = coreTokens[0];
    const generic = scored.filter((match) => (
      match.entry.nameTokens.includes(token)
      || match.entry.taxonomyTokens.includes(token)
    ));
    if (generic.length > 1) {
      return {
        selected: generic.slice(0, limit),
        primary: null,
        ambiguous: true,
        comparison: false
      };
    }
  }

  if (!scored.length) {
    return { selected: [], primary: null, ambiguous: false, comparison: false };
  }
  const top = scored[0];
  const close = scored.filter((match) => top.score - match.score <= 90);
  const classificationSpecific = signals.classSignals.size > 0 || signals.processSignals.size > 0;
  if (close.length > 1 || (classificationSpecific && scored[1] && top.score - scored[1].score <= 180)) {
    return {
      selected: (classificationSpecific ? scored.filter((match) => top.score - match.score <= 180) : close).slice(0, limit),
      primary: null,
      ambiguous: true,
      comparison: false
    };
  }
  return { selected: [top], primary: top, ambiguous: false, comparison: false };
}

function toolMatchesForQuery(normalizedQuery, queryTokens, materialMatches, maxTools) {
  const allTools = ALL_TOOLS_PATTERN.test(normalizedQuery);
  if (allTools) {
    return {
      selected: AURUM_GEM_TOOL_INDEX.map((entry) => publicToolMatch({
        entry,
        score: 500,
        exactTokenCount: 0,
        reasons: ["richiesto elenco completo"]
      }, "catalog")),
      primary: null,
      ambiguous: false,
      allTools: true
    };
  }

  const explicitScored = AURUM_GEM_TOOL_INDEX
    .map((entry) => scoreTool(entry, normalizedQuery, queryTokens))
    .filter((match) => match.score >= 180)
    .sort((left, right) => right.score - left.score || left.entry.index - right.entry.index);
  const explicitStrong = explicitScored.filter((match) => match.exactTokenCount > 0);
  let explicitSelected = [];
  let primary = null;
  let ambiguous = false;
  if (explicitStrong.length) {
    const longest = Math.max(...explicitStrong.map((match) => match.exactTokenCount));
    explicitSelected = explicitStrong.filter((match) => match.exactTokenCount === longest);
    if (explicitSelected.length === 1) primary = explicitSelected[0];
    else ambiguous = true;
  } else if (explicitScored[0]?.score >= 300) {
    const top = explicitScored[0];
    const close = explicitScored.filter((match) => top.score - match.score <= 70);
    explicitSelected = close;
    if (close.length === 1) primary = top;
    else ambiguous = true;
  }

  const merged = new Map();
  explicitSelected.forEach((match) => {
    merged.set(match.entry.id, publicToolMatch(match, "query"));
  });
  materialMatches.forEach((materialMatch) => {
    const recommended = Array.isArray(materialMatch.entry.material.recommended_tools)
      ? materialMatch.entry.material.recommended_tools
      : [];
    recommended.forEach((recommendedTool, index) => {
      const name = recommendedTool?.name || recommendedTool;
      const entry = toolByNormalizedName.get(normalizeSearchText(name));
      if (!entry || merged.has(entry.id)) return;
      merged.set(entry.id, publicToolMatch({
        entry,
        score: 600 - index,
        exactTokenCount: 0,
        reasons: [`consigliato per ${materialMatch.entry.material.name}`]
      }, "material"));
    });
  });

  return {
    selected: [...merged.values()].slice(0, maxTools),
    primary: primary ? merged.get(primary.entry.id) || publicToolMatch(primary, "query") : null,
    ambiguous,
    allTools: false
  };
}

export function findGemologicalMaterialBySlug(slug = "") {
  return materialBySlug.get(String(slug || "").trim())?.material || null;
}

export function getGemologicalToolGuidance(name = "") {
  const normalized = normalizeSearchText(name);
  if (!normalized) return null;
  const direct = toolByNormalizedName.get(normalized);
  if (direct) return direct;
  return AURUM_GEM_TOOL_INDEX.find((entry) => entry.searchPhrases.includes(normalized)) || null;
}

export function searchGemologicalKnowledge(question = "", options = {}) {
  const normalizedQuery = normalizeSearchText(String(question || "").slice(0, MAX_QUERY_CHARS));
  const maxMaterials = boundedInteger(options.maxMaterials, 6, 1, 12);
  const maxTools = boundedInteger(options.maxTools, 8, 1, 21);
  if (!normalizedQuery) {
    return Object.freeze({
      query: "",
      normalizedQuery: "",
      primary: null,
      primaryTool: null,
      materials: Object.freeze([]),
      tools: Object.freeze([]),
      ambiguous: false,
      ambiguousTools: false,
      comparison: false,
      allTools: false,
      found: false
    });
  }

  const materialResult = materialMatchesForQuery(normalizedQuery, maxMaterials);
  const toolsResult = toolMatchesForQuery(
    normalizedQuery,
    significantQueryTokens(normalizedQuery),
    materialResult.selected,
    maxTools
  );
  const materials = materialResult.selected.map(publicMaterialMatch);
  const primary = materialResult.primary
    ? materials.find((match) => match.slug === materialResult.primary.entry.slug) || null
    : null;

  return Object.freeze({
    query: String(question || "").slice(0, MAX_QUERY_CHARS),
    normalizedQuery,
    primary,
    primaryTool: toolsResult.primary,
    materials: Object.freeze(materials),
    tools: Object.freeze(toolsResult.selected),
    ambiguous: materialResult.ambiguous,
    ambiguousTools: toolsResult.ambiguous,
    comparison: materialResult.comparison,
    allTools: toolsResult.allTools,
    found: materials.length > 0 || toolsResult.selected.length > 0
  });
}

export function hasGemologicalKnowledgeIntent(value = null) {
  const result = value && typeof value === "object"
    ? value
    : searchGemologicalKnowledge(value || "");
  return Boolean(result.found && (
    result.materials?.length
    || result.tools?.some((match) => match.source === "query")
    || result.allTools
  ));
}

function scientificPropertyLines(material) {
  const range = (explicit, min, max, unit = "") => {
    const safeExplicit = sanitizeKnowledgeText(explicit, 160);
    if (safeExplicit) return safeExplicit;
    if (min === null || min === undefined || min === "") return "";
    const end = max === null || max === undefined || max === "" || String(max) === String(min)
      ? ""
      : `–${max}`;
    return `${min}${end}${unit}`;
  };
  return [
    ["Formula", material.chemical_formula],
    ["Sistema cristallino", material.crystal_system],
    ["Durezza Mohs", range(material.mohs_hardness, material.mohs_min, material.mohs_max)],
    ["Densità / peso specifico", range(material.density || material.specific_gravity, material.density_min, material.density_max, " g/cm³")],
    ["Indice di rifrazione", range(material.refractive_index, material.refractive_index_min, material.refractive_index_max)],
    ["Carattere ottico", material.optical_character || material.double_refraction],
    ["Birifrangenza", material.birefringence],
    ["Dispersione", material.dispersion],
    ["Pleocroismo", material.pleochroism],
    ["Fluorescenza UV lunga", material.fluorescence_long_wave || material.fluorescence],
    ["Fluorescenza UV corta", material.fluorescence_short_wave],
    ["Tenacità", material.tenacity],
    ["Sfaldatura", material.cleavage],
    ["Frattura", material.fracture]
  ]
    .map(([label, value]) => [label, sanitizeKnowledgeText(value, 280)])
    .filter(([, value]) => value);
}

function materialSourceList(material) {
  return (Array.isArray(material.sources) ? material.sources : [])
    .map((source) => ({
      title: sanitizeKnowledgeText(source?.title || "Fonte gemmologica", 240),
      organization: sanitizeKnowledgeText(source?.organization || "", 180),
      url: String(source?.url || "").trim(),
      note: sanitizeKnowledgeText(source?.note || "", 500),
      accessedOn: sanitizeKnowledgeText(source?.accessed_on || "", 40),
      scope: "Riferimento generale: verificare la pertinenza della singola proprietà.",
      source_scope: "Riferimento generale: verificare la pertinenza della singola proprietà."
    }))
    .filter((source) => /^https:\/\//i.test(source.url));
}

function materialContextBlock(match) {
  const material = match.material;
  const name = sanitizeKnowledgeText(material.name || material.commercial_name, 200);
  const properties = scientificPropertyLines(material)
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");
  const inclusions = [
    ...asTextArray(material.inclusions?.typical),
    ...asTextArray(material.inclusions?.treatment_signs),
    ...asTextArray(material.inclusions?.synthesis_or_imitation_signs)
  ].slice(0, 8);
  const tools = (Array.isArray(material.recommended_tools) ? material.recommended_tools : [])
    .slice(0, 6)
    .map((tool) => {
      const nameValue = sanitizeKnowledgeText(tool?.name || tool, 120);
      const utility = sanitizeKnowledgeText(tool?.utility || "", 220);
      const limitation = sanitizeKnowledgeText(tool?.limitations || "", 240);
      return `- ${nameValue}${utility ? ` — ${utility}` : ""}${limitation ? `; limite: ${limitation}` : ""}`;
    });
  const protocol = (Array.isArray(material.operator_protocol?.steps) ? material.operator_protocol.steps : [])
    .slice(0, 9)
    .map((step, index) => `${index + 1}. ${sanitizeKnowledgeText(step, 500)}`);
  const sources = materialSourceList(material)
    .slice(0, 5)
    .map((source) => `- ${source.organization ? `${source.organization}: ` : ""}${source.title} — ${source.url} (${source.scope})`);
  return [
    `[Materiale gemmologico ${match.id}]`,
    `Nome: ${name}`,
    `Minerale/famiglia: ${sanitizeKnowledgeText(material.mineral_name || material.mineralogical_name, 180)} / ${sanitizeKnowledgeText(material.family, 180)}`,
    `Categoria e classificazione: ${sanitizeKnowledgeText(material.category, 160)} / ${sanitizeKnowledgeText(material.classification, 120)}`,
    `Sintesi: ${sanitizeKnowledgeText(material.summary || material.description || material.theory, 1_000)}`,
    properties ? `Proprietà scientifiche:\n${properties}` : "",
    inclusions.length ? `Caratteri osservabili e inclusioni:\n- ${inclusions.join("\n- ")}` : "",
    asTextArray(material.common_treatments).length
      ? `Trattamenti comuni dichiarabili:\n- ${asTextArray(material.common_treatments).slice(0, 7).join("\n- ")}`
      : "",
    asTextArray(material.common_simulants).length
      ? `Simulanti/confronti:\n- ${asTextArray(material.common_simulants).slice(0, 7).join("\n- ")}`
      : "",
    `Pulizia e cautela: ${sanitizeKnowledgeText(material.cleaning_precautions, 700)}`,
    tools.length ? `Strumenti consigliati:\n${tools.join("\n")}` : "",
    protocol.length ? `Protocollo operativo:\n${protocol.join("\n")}` : "",
    `Limite diagnostico: ${sanitizeKnowledgeText(material.inclusions?.diagnostic_limit, 700) || "Confrontare almeno due proprietà indipendenti; una fotografia o un singolo test non certificano identità, origine o trattamento."}`,
    sources.length ? `Fonti di riferimento generale:\n${sources.join("\n")}` : ""
  ].filter(Boolean).join("\n");
}

function toolContextBlock(match) {
  const guidance = match.guidance;
  return [
    `[Guida strumento ${guidance.id}]`,
    `Nome: ${sanitizeKnowledgeText(guidance.name, 160)}`,
    `Descrizione catalogo: ${sanitizeKnowledgeText(guidance.tool.description, 500)}`,
    `Scopo: ${sanitizeKnowledgeText(guidance.purpose, 700)}`,
    `Preparazione:\n- ${guidance.preparation.map((item) => sanitizeKnowledgeText(item, 500)).join("\n- ")}`,
    `Procedura:\n${guidance.procedure.map((item, index) => `${index + 1}. ${sanitizeKnowledgeText(item, 600)}`).join("\n")}`,
    `Osservazioni:\n- ${guidance.observations.map((item) => sanitizeKnowledgeText(item, 500)).join("\n- ")}`,
    `Limiti:\n- ${guidance.limitations.map((item) => sanitizeKnowledgeText(item, 500)).join("\n- ")}`,
    `Sicurezza:\n- ${guidance.safety.map((item) => sanitizeKnowledgeText(item, 500)).join("\n- ")}`,
    `Passo successivo: ${sanitizeKnowledgeText(guidance.next_step, 700)}`
  ].join("\n");
}

function ensureSearchResult(value, options = {}) {
  if (typeof value === "string") return searchGemologicalKnowledge(value, options);
  if (value && typeof value === "object" && Array.isArray(value.materials) && Array.isArray(value.tools)) return value;
  return searchGemologicalKnowledge("", options);
}

export function formatGemologicalKnowledgeContext(value, options = {}) {
  const result = ensureSearchResult(value, options);
  const maxChars = boundedInteger(options.maxChars, DEFAULT_CONTEXT_MAX_CHARS, 300, 60_000);
  const maxMaterials = boundedInteger(options.maxMaterials, result.comparison ? 2 : 1, 1, 4);
  const maxTools = boundedInteger(options.maxTools, 4, 0, 8);
  if (result.ambiguous) {
    return appendBoundedSections([
      [
        "[Disambiguazione gemmologica richiesta]",
        "La domanda corrisponde a più schede. Non combinare le proprietà.",
        ...result.materials.map((match) => `- ${match.name} (${match.slug}; ${sanitizeKnowledgeText(match.material.classification, 80)})`),
        "Chiedere all'utente di specificare varietà, origine naturale/sintetica, trattamento o processo HPHT/CVD."
      ].join("\n")
    ], maxChars);
  }
  const materialSections = result.materials
    .slice(0, maxMaterials)
    .map(materialContextBlock);
  const toolSections = result.tools
    .slice(0, maxTools)
    .map(toolContextBlock);
  if (!materialSections.length && !toolSections.length) return "";
  return appendBoundedSections([...materialSections, ...toolSections], maxChars);
}

export function gemologicalKnowledgeSources(value, limit = 8) {
  const result = ensureSearchResult(value);
  const maxSources = boundedInteger(limit, 8, 0, 20);
  const unique = new Map();
  result.materials.forEach((match) => {
    materialSourceList(match.material).forEach((source) => {
      if (!unique.has(source.url)) unique.set(source.url, source);
    });
  });
  if (result.tools.length) {
    COMMON_TOOL_REFERENCE_SOURCES.forEach((source) => {
      if (!unique.has(source.url)) unique.set(source.url, source);
    });
  }
  return [...unique.values()].slice(0, maxSources);
}

function renderToolAnswer(match) {
  const guide = match.guidance;
  return [
    `Strumento — ${sanitizeKnowledgeText(guide.name, 180)}`,
    "",
    `Scopo: ${sanitizeKnowledgeText(guide.purpose, 700)}`,
    "",
    "Preparazione:",
    ...guide.preparation.map((item) => `- ${sanitizeKnowledgeText(item, 500)}`),
    "",
    "Procedura:",
    ...guide.procedure.map((item, index) => `${index + 1}. ${sanitizeKnowledgeText(item, 600)}`),
    "",
    "Cosa osservare:",
    ...guide.observations.map((item) => `- ${sanitizeKnowledgeText(item, 500)}`),
    "",
    "Limiti:",
    ...guide.limitations.map((item) => `- ${sanitizeKnowledgeText(item, 500)}`),
    "",
    "Sicurezza:",
    ...guide.safety.map((item) => `- ${sanitizeKnowledgeText(item, 500)}`),
    "",
    `Passo successivo: ${sanitizeKnowledgeText(guide.next_step, 700)}`
  ].join("\n");
}

function renderMaterialAnswer(match, tools) {
  const material = match.material;
  const name = sanitizeKnowledgeText(material.name || material.commercial_name, 180);
  const properties = scientificPropertyLines(material);
  const typicalInclusions = asTextArray(material.inclusions?.typical);
  const treatments = asTextArray(material.common_treatments);
  const simulants = asTextArray(material.common_simulants);
  const protocol = (Array.isArray(material.operator_protocol?.steps) ? material.operator_protocol.steps : []).slice(0, 9);
  const mistakes = asTextArray(material.common_mistakes).slice(0, 5);
  const materialToolNames = new Set(
    (Array.isArray(material.recommended_tools) ? material.recommended_tools : [])
      .map((tool) => normalizeSearchText(tool?.name || tool))
  );
  const materialTools = tools
    .filter((tool) => materialToolNames.has(normalizeSearchText(tool.name)))
    .slice(0, 6);
  const sources = materialSourceList(material).slice(0, 5);
  return [
    `Scheda gemmologica — ${name}`,
    "",
    `Classificazione: ${sanitizeKnowledgeText(material.classification, 140)}.`,
    `Minerale/famiglia: ${sanitizeKnowledgeText(material.mineral_name || material.mineralogical_name, 180)} / ${sanitizeKnowledgeText(material.family, 180)}.`,
    `Sintesi professionale: ${sanitizeKnowledgeText(material.summary || material.description || material.theory, 1_000)}`,
    "",
    "Proprietà scientifiche:",
    ...properties.map(([label, value]) => `- ${label}: ${value}`),
    "",
    "Osservazioni, trattamenti e confronti:",
    ...(typicalInclusions.length ? typicalInclusions.slice(0, 5).map((item) => `- Inclusioni/caratteri: ${item}`) : ["- Inclusioni/caratteri: dato non disponibile."]),
    ...(treatments.length ? treatments.slice(0, 5).map((item) => `- Trattamento comune: ${item}`) : ["- Trattamenti: nessuno indicato nella scheda."]),
    ...(simulants.length ? simulants.slice(0, 5).map((item) => `- Simulante o confronto: ${item}`) : []),
    `- Pulizia: ${sanitizeKnowledgeText(material.cleaning_precautions, 700)}`,
    "",
    "Strumenti consigliati:",
    ...(materialTools.length
      ? materialTools.map((tool) => `- ${tool.name}: ${sanitizeKnowledgeText(tool.guidance.purpose, 360)} Limite: ${sanitizeKnowledgeText(tool.guidance.limitations[0], 260)}`)
      : (Array.isArray(material.recommended_tools) ? material.recommended_tools : []).slice(0, 6).map((tool) => (
        `- ${sanitizeKnowledgeText(tool?.name || tool, 140)}: ${sanitizeKnowledgeText(tool?.utility || "controllo complementare", 220)}`
      ))),
    "",
    "Protocollo operativo:",
    ...(protocol.length
      ? protocol.map((step, index) => `${index + 1}. ${sanitizeKnowledgeText(step, 600)}`)
      : ["1. Registrare campione e limiti.", "2. Confrontare almeno due proprietà indipendenti.", "3. In caso di dubbio inviare a laboratorio."]),
    "",
    "Limiti e cautele:",
    `- ${sanitizeKnowledgeText(material.inclusions?.diagnostic_limit, 700) || "Nessuna singola osservazione è conclusiva."}`,
    ...mistakes.map((item) => `- Evitare: ${item}`),
    "- L'esame al banco è pre-screening: non certifica da solo identità, origine naturale/sintetica, trattamento, provenienza geografica o valore.",
    "- Se i dati sono discordanti o insufficienti, usare l'esito “non conclusivo” e richiedere un laboratorio qualificato.",
    "",
    "Fonti di riferimento generale:",
    ...(sources.length
      ? sources.map((source, index) => `${index + 1}. ${source.organization ? `${source.organization} — ` : ""}${source.title}: ${source.url}`)
      : ["Nessuna fonte URL presente nella scheda."])
  ].join("\n");
}

export function buildGemologicalKnowledgeAnswer(question = "", value = null, options = {}) {
  const result = value
    ? ensureSearchResult(value, options)
    : searchGemologicalKnowledge(question, options);
  const maxChars = boundedInteger(options.maxChars, DEFAULT_ANSWER_MAX_CHARS, 500, 60_000);
  const sources = gemologicalKnowledgeSources(result, options.maxSources ?? 8);

  if (result.ambiguous) {
    const answer = [
      "La richiesta è gemmologicamente ambigua: più schede sono compatibili e non è sicuro combinarne le proprietà.",
      "",
      ...result.materials.map((match) => `- ${match.name} — ${sanitizeKnowledgeText(match.material.classification, 100)} (${match.slug})`),
      "",
      "Specifica la varietà e, quando rilevante, se il campione è naturale, sintetico, trattato, imitazione oppure il processo HPHT/CVD. Fino ad allora l'esito resta non conclusivo."
    ].join("\n");
    return {
      risposta: truncateText(answer, maxChars),
      fonte: "Catalogo Gemmologico OroActive",
      fonti: sources,
      materiali: result.materials.map((match) => match.slug),
      strumenti: result.tools.map((match) => match.name),
      ambiguous: true,
      comparison: false,
      deterministic: true
    };
  }

  if (!result.materials.length && result.ambiguousTools) {
    const answer = [
      "La richiesta indica più strumenti possibili. Specifica quale vuoi usare:",
      ...result.tools.map((match) => `- ${match.name}`),
      "",
      "Non applicare una procedura finché strumento, campione e finalità non sono definiti."
    ].join("\n");
    return {
      risposta: truncateText(answer, maxChars),
      fonte: "Guida strumentale OroActive",
      fonti: sources,
      materiali: [],
      strumenti: result.tools.map((match) => match.name),
      ambiguous: true,
      comparison: false,
      deterministic: true
    };
  }

  if (!result.materials.length && result.tools.length) {
    const selectedTools = result.allTools ? result.tools : result.tools.slice(0, 3);
    const answer = selectedTools.map(renderToolAnswer).join("\n\n---\n\n");
    return {
      risposta: truncateText(answer, maxChars),
      fonte: "Guida strumentale OroActive derivata dal catalogo strumenti",
      fonti: sources,
      materiali: [],
      strumenti: selectedTools.map((match) => match.name),
      ambiguous: false,
      comparison: false,
      deterministic: true
    };
  }

  if (!result.materials.length) {
    return {
      risposta: "Non ho identificato con sufficiente sicurezza una pietra o uno strumento del Laboratorio Gemmologico OroActive. Indica il nome preciso del materiale o dello strumento; non userò proprietà di pietre simili per colmare il dato mancante.",
      fonte: "Catalogo Gemmologico OroActive",
      fonti: [],
      materiali: [],
      strumenti: [],
      ambiguous: false,
      comparison: false,
      deterministic: true
    };
  }

  const selectedMaterials = result.comparison ? result.materials.slice(0, 2) : result.materials.slice(0, 1);
  const answerSections = selectedMaterials.map((match) => renderMaterialAnswer(match, result.tools));
  if (result.comparison && selectedMaterials.length > 1) {
    answerSections.unshift("Confronto gemmologico: le schede restano separate per evitare contaminazioni fra proprietà.");
  }
  return {
    risposta: truncateText(answerSections.join("\n\n---\n\n"), maxChars),
    fonte: "Catalogo Gemmologico OroActive con riferimenti generali CIBJO, GIA e Gem-A",
    fonti: sources,
    materiali: selectedMaterials.map((match) => match.slug),
    strumenti: result.tools.map((match) => match.name),
    ambiguous: false,
    comparison: result.comparison,
    deterministic: true
  };
}
