import {
  GEM_CATALOG_SEED,
  GEM_CATALOG_SEED_VALIDATION,
  GEM_TOOL_SEED,
  evaluateGemPublicationReadiness
} from "./gemologicalCatalog.js";

const generatedMediaNotice = "Immagine didattica generata internamente: non sostituisce l'osservazione del campione reale o un referto gemmologico.";

function academyGemMedia(slug, title, whatToObserve) {
  return [{
    type: "main_hd",
    url: `/assets/academy/gems/${slug}.png`,
    title,
    description: generatedMediaNotice,
    what_to_observe: whatToObserve,
    source: "OroActive Internal Gem Library",
    license: "Uso interno OroActive",
    author: "OroActive AI Studio",
    resolution: "1254 x 1254 px",
    uploaded_at: "2026-07-25",
    generated: true
  }];
}

const LEGACY_ACADEMY_GEM_TOOLS = [
  {
    name: "Lente 10x",
    description: "Lente acromatica e aplanatica per il primo esame di superficie e inclusioni.",
    usage: "Pulire il campione, avvicinare la lente all'occhio e portare la pietra a fuoco con luce diffusa.",
    limitations: "Non identifica da sola origine naturale, sintesi o trattamento."
  },
  {
    name: "Microscopio",
    description: "Osservazione ingrandita in campo chiaro, scuro e luce obliqua.",
    usage: "Esaminare inclusioni, giunzioni di faccetta, cintura, linee di crescita e tracce di trattamento.",
    limitations: "La lettura delle inclusioni richiede esperienza e non sempre produce una conclusione univoca."
  },
  {
    name: "Tester diamanti",
    description: "Tester di conducibilita termica per separare molti simulanti dal diamante.",
    usage: "Verificare taratura, temperatura del campione e contatto perpendicolare su una faccetta pulita.",
    limitations: "La moissanite puo dare risposta simile al diamante sui tester solo termici."
  },
  {
    name: "Tester moissanite",
    description: "Tester elettrico o combinato per distinguere moissanite e diamante.",
    usage: "Usare dopo il test termico, evitando montature metalliche e faccette contaminate.",
    limitations: "Non distingue in modo affidabile diamante naturale e diamante sintetico."
  },
  {
    name: "UV lunga onda",
    description: "Lampada UV intorno a 365 nm per osservare fluorescenza e fosforescenza.",
    usage: "Osservare in ambiente oscurato confrontando intensita, colore e distribuzione della reazione.",
    limitations: "Una risposta assente o presente non e da sola diagnostica."
  },
  {
    name: "UV corta onda",
    description: "Lampada UV intorno a 254 nm per reazioni diagnostiche complementari.",
    usage: "Proteggere occhi e pelle, usare una camera chiusa e confrontare la risposta con la lunga onda.",
    limitations: "Richiede procedure di sicurezza e la risposta varia tra campioni della stessa specie."
  },
  {
    name: "Polariscopio",
    description: "Strumento per separare materiali isotropi, anisotropi e aggregati.",
    usage: "Ruotare il campione tra polarizzatori incrociati e osservare estinzione o anomalie.",
    limitations: "Tensioni interne e taglio possono generare reazioni anomale."
  },
  {
    name: "Dicroscopio",
    description: "Strumento per confrontare due colori pleocroici in materiali anisotropi colorati.",
    usage: "Osservare lungo piu direzioni cristallografiche con luce bianca neutra.",
    limitations: "Poco utile su pietre incolori, molto piccole o debolmente pleocroiche."
  },
  {
    name: "Rifrattometro",
    description: "Misura l'indice di rifrazione e, quando possibile, la birifrangenza.",
    usage: "Usare liquido di contatto idoneo e una faccetta piana pulita, ruotando il campione.",
    limitations: "Gli indici oltre il limite dello strumento richiedono metodi alternativi."
  },
  {
    name: "Spettroscopio",
    description: "Osserva bande e linee di assorbimento nello spettro visibile.",
    usage: "Illuminare correttamente il campione e confrontare le bande con riferimenti affidabili.",
    limitations: "Spettri deboli, pietre piccole o luce insufficiente possono impedire la lettura."
  },
  {
    name: "Bilancia idrostatica",
    description: "Determina il peso specifico confrontando il peso in aria e in acqua.",
    usage: "Eliminare bolle, usare acqua a temperatura nota e ripetere la misura.",
    limitations: "Non adatta a pietre porose, assemblate, molto piccole o montate."
  }
];

const diamondComparison = {
  columns: [
    "Materiale",
    "Aspetto",
    "Durezza",
    "Peso specifico",
    "Indice di rifrazione",
    "Birifrangenza",
    "Fluorescenza",
    "Inclusioni o segnali",
    "Strumento decisivo"
  ],
  rows: [
    ["Diamante naturale", "Lucentezza adamantina e spigoli netti", "10", "3,52", "2,417", "Assente", "Variabile, spesso blu", "Cristalli, piume, nuvole o graining", "Microscopio e analisi avanzata per l'origine"],
    ["Diamante sintetico", "Come il diamante naturale", "10", "3,52", "2,417", "Assente", "Pattern e fosforescenza variabili", "Metallo HPHT, striature o crescita CVD", "Imaging UV e laboratorio qualificato"],
    ["Moissanite", "Fuoco molto intenso", "9,25", "3,22", "2,648-2,691", "0,043", "Spesso arancio o variabile", "Raddoppio delle faccette e aghi", "Tester moissanite con verifica ottica"],
    ["Zirconia cubica", "Brillantezza vetrosa e spigoli meno netti", "8-8,5", "5,65-5,95", "2,15-2,18", "Assente", "Variabile, spesso debole", "Peso elevato, abrasioni e bolle occasionali", "Tester termico e bilancia idrostatica"]
  ]
};

const LEGACY_ACADEMY_GEM_MATERIALS = [
  {
    slug: "diamante-naturale",
    commercial_name: "Diamante naturale",
    mineralogical_name: "Diamante",
    family: "Carbonio nativo",
    gem_group: "Diamanti",
    chemical_formula: "C",
    crystal_system: "Cubico",
    origin: "Naturale, formazione nel mantello terrestre",
    classification: "Naturale",
    theory: "Il diamante naturale e carbonio cristallizzato ad altissima pressione. L'identificazione professionale combina osservazione, risposta termica, studio delle inclusioni e, per l'origine, strumentazione avanzata di laboratorio.",
    mohs_hardness: "10",
    density: "3,50-3,53 g/cm3",
    specific_gravity: "3,52",
    tenacity: "Fragile; buona resistenza all'usura ma sensibile agli urti lungo i piani di sfaldatura",
    cleavage: "Perfetta ottaedrica in quattro direzioni",
    fracture: "Concoide o irregolare",
    luster: "Adamantino",
    transparency: "Da trasparente a opaco",
    color: "Incolore fino a giallo/bruno; possibili colori fancy",
    pleochroism: "Assente",
    refractive_index: "2,417",
    birefringence: "Assente; possibili anomalie da tensione",
    dispersion: "0,044",
    double_refraction: "Assente",
    fluorescence: "Variabile, spesso blu in UV lunga; non diagnostica da sola",
    spectral_features: "Possibili linee e bande legate a centri N3, H3 o altri difetti; richiede interpretazione specialistica.",
    optical_properties: [
      { name: "Indice di rifrazione", value: "2,417", explanation: "Valore molto alto, oltre il limite dei comuni rifrattometri.", bench: "Confermare con riflettometro o metodi strumentali indiretti." },
      { name: "Dispersione", value: "0,044", explanation: "Produce il caratteristico fuoco spettrale.", bench: "Valutare insieme a taglio e brillantezza, senza usarla come prova unica." },
      { name: "Birifrangenza", value: "Assente", explanation: "Il sistema cubico e otticamente isotropo.", bench: "Al polariscopio puo mostrare birifrangenza anomala da tensione." }
    ],
    inclusions: {
      typical: ["Cristalli minerali", "Piume", "Nuvole", "Graining interno"],
      rare: ["Inclusioni mantelliche diagnostiche", "Cristalli con tensioni colorate"],
      treatment_signs: ["Fratture riempite con flash effect", "Canali laser", "Concentrazioni di colore"],
      synthesis_signs: ["Crescita settoriale non naturale", "Inclusioni metalliche in alcuni HPHT", "Striature specifiche CVD"],
      imitation_signs: ["Raddoppio delle faccette", "Abrasioni marcate", "Bolle gassose", "Peso specifico incompatibile"]
    },
    gallery: academyGemMedia("diamante-naturale", "Diamante naturale, vista macro didattica", "Nitidezza degli spigoli, brillantezza adamantina e piccola inclusione interna."),
    recommended_tools: [
      { priority: 1, name: "Lente 10x", utility: "Prima ispezione", look_for: "Inclusioni, cintura, abrasioni e giunzioni", expected_result: "Caratteri compatibili con diamante naturale", limitations: "Non determina da sola l'origine" },
      { priority: 2, name: "Tester diamanti", utility: "Separazione termica", look_for: "Conducibilita elevata", expected_result: "Risposta positiva", limitations: "Possibile risposta simile della moissanite" },
      { priority: 3, name: "Tester moissanite", utility: "Esclusione moissanite", look_for: "Conducibilita elettrica", expected_result: "Risposta diamante", limitations: "Non separa naturale e sintetico" },
      { priority: 4, name: "Microscopio", utility: "Studio dell'origine", look_for: "Morfologia delle inclusioni e crescita", expected_result: "Indizi naturali coerenti", limitations: "Nei campioni molto puri serve laboratorio avanzato" },
      { priority: 5, name: "UV lunga onda", utility: "Risposta complementare", look_for: "Colore e distribuzione della fluorescenza", expected_result: "Reazione variabile", limitations: "Non conclusiva" }
    ],
    operator_protocol: {
      title: "Protocollo OroActive - Diamante naturale",
      steps: [
        "Pulire la pietra e registrare peso, misure, stato di montatura e provenienza dichiarata.",
        "Osservare a occhio nudo e con lente 10x: cintura, spigoli, inclusioni, eventuali trattamenti.",
        "Eseguire il tester diamanti su una faccetta asciutta evitando il metallo.",
        "Eseguire il tester moissanite come controllo incrociato.",
        "Esaminare al microscopio in campo scuro e luce obliqua le strutture interne.",
        "Confrontare UV lunga e corta solo come dato complementare.",
        "Se l'origine naturale non e dimostrabile, classificare come non conclusivo e inviare a laboratorio qualificato.",
        "Documentare risultati, limiti e fotografie senza formulare conclusioni oltre l'evidenza."
      ]
    },
    common_mistakes: [
      "Confondere una risposta termica positiva con prova di origine naturale.",
      "Testare su metallo o su una faccetta sporca.",
      "Usare fluorescenza o assenza di inclusioni come criterio unico.",
      "Omettere il rinvio al laboratorio quando naturale e sintetico restano indistinguibili."
    ],
    comparison_table: diamondComparison,
    identification_difficulty: 4,
    quiz: {
      questions: [
        { id: "dn-1", type: "material", prompt: "Quale materiale corrisponde al campione mostrato?", options: ["Diamante naturale", "Diamante sintetico", "Moissanite", "Zirconia cubica"], correct_answer: "Diamante naturale" },
        { id: "dn-2", type: "tool", prompt: "Quale controllo deve seguire il tester termico?", options: ["Tester moissanite", "Solo lente 2x", "Magnete"], correct_answer: "Tester moissanite" },
        { id: "dn-3", type: "procedure", prompt: "Se naturale e sintetico non sono separabili al banco, cosa fai?", options: ["Invio a laboratorio qualificato", "Dichiaro naturale", "Dichiaro imitazione"], correct_answer: "Invio a laboratorio qualificato" }
      ]
    }
  },
  {
    slug: "diamante-sintetico",
    commercial_name: "Diamante sintetico",
    mineralogical_name: "Diamante prodotto in laboratorio",
    family: "Carbonio nativo sintetico",
    gem_group: "Diamanti",
    chemical_formula: "C",
    crystal_system: "Cubico",
    origin: "Sintesi HPHT o CVD",
    classification: "Sintetica",
    theory: "Il diamante sintetico ha composizione e molte proprieta del diamante naturale. La separazione affidabile richiede studio dei modelli di crescita, fluorescenza/fosforescenza e spesso strumentazione spettroscopica o imaging specialistico.",
    mohs_hardness: "10",
    density: "Circa 3,52 g/cm3",
    specific_gravity: "3,52",
    tenacity: "Fragile con elevata resistenza all'usura",
    cleavage: "Perfetta ottaedrica",
    fracture: "Concoide o irregolare",
    luster: "Adamantino",
    transparency: "Da trasparente a opaco",
    color: "Incolore o colorato",
    pleochroism: "Assente",
    refractive_index: "2,417",
    birefringence: "Assente; possibili tensioni anomale",
    dispersion: "0,044",
    double_refraction: "Assente",
    fluorescence: "Pattern e fosforescenza variabili secondo HPHT/CVD; osservazione complementare",
    spectral_features: "Difetti NV, SiV, nichel o azoto possono supportare la diagnosi con spettroscopia e fotoluminescenza.",
    optical_properties: [
      { name: "Indice di rifrazione", value: "2,417", explanation: "Identico al diamante naturale.", bench: "Non separa l'origine." },
      { name: "Dispersione", value: "0,044", explanation: "Fuoco equivalente al diamante naturale.", bench: "Non usare la brillantezza per decidere l'origine." },
      { name: "Fluorescenza", value: "Variabile", explanation: "Pattern di crescita e fosforescenza possono essere informativi.", bench: "Confrontare UV lunga/corta e registrare durata della fosforescenza." }
    ],
    inclusions: {
      typical: ["Inclusioni metalliche in alcuni HPHT", "Puntiformi", "Striature o piani di crescita CVD"],
      rare: ["Flussi residui", "Grafite localizzata"],
      treatment_signs: ["Colore modificato HPHT o irraggiamento", "Zone di colore"],
      synthesis_signs: ["Crescita cubo-ottaedrica", "Pattern a settori", "Fluorescenza disomogenea", "Segnale SiV in alcuni CVD"],
      imitation_signs: ["Proprieta termiche o ottiche non compatibili con diamante"]
    },
    gallery: academyGemMedia("diamante-sintetico", "Diamante sintetico, vista macro didattica", "Regolarita del taglio e sottili caratteristiche di crescita; la foto da sola non separa l'origine."),
    recommended_tools: [
      { priority: 1, name: "Lente 10x", utility: "Controllo preliminare", look_for: "Cintura, incisioni e inclusioni", expected_result: "Possibili indizi, mai conclusione unica", limitations: "Molti sintetici sono eye-clean" },
      { priority: 2, name: "Tester diamanti", utility: "Conferma della famiglia", look_for: "Conducibilita termica elevata", expected_result: "Risposta positiva", limitations: "Non distingue l'origine" },
      { priority: 3, name: "Tester moissanite", utility: "Esclusione simulante", look_for: "Risposta elettrica", expected_result: "Risposta diamante", limitations: "Non distingue naturale/sintetico" },
      { priority: 4, name: "Microscopio", utility: "Ricerca segni di sintesi", look_for: "Metallo, grafite, pattern di crescita", expected_result: "Indizi HPHT o CVD", limitations: "Possibile esito non conclusivo" },
      { priority: 5, name: "UV corta onda", utility: "Imaging complementare", look_for: "Pattern settoriali e fosforescenza", expected_result: "Reazione da interpretare", limitations: "Serve esperienza e spesso strumentazione avanzata" }
    ],
    operator_protocol: {
      title: "Protocollo OroActive - Diamante sintetico",
      steps: [
        "Registrare dichiarazioni, eventuale iscrizione laser e documenti allegati.",
        "Confermare che il campione appartenga alla famiglia diamante con test termico ed elettrico combinato.",
        "Esaminare cintura, inclusioni e pattern di crescita con lente 10x e microscopio.",
        "Confrontare risposta UV lunga, UV corta e fosforescenza in ambiente controllato.",
        "Non attribuire metodo HPHT o CVD senza evidenze strumentali coerenti.",
        "In assenza di separazione certa, usare esito non conclusivo e inviare a laboratorio qualificato.",
        "Registrare tutti i limiti dello strumento e non usare la parola naturale."
      ]
    },
    common_mistakes: [
      "Dichiarare naturale perche il tester diamanti e positivo.",
      "Considerare l'assenza di inclusioni prova di sintesi.",
      "Attribuire HPHT o CVD dalla sola fluorescenza.",
      "Ignorare incisioni laser o documenti incoerenti."
    ],
    comparison_table: diamondComparison,
    identification_difficulty: 5,
    quiz: {
      questions: [
        { id: "ds-1", type: "material", prompt: "Quale materiale corrisponde al campione mostrato?", options: ["Diamante naturale", "Diamante sintetico", "Moissanite", "Zirconia cubica"], correct_answer: "Diamante sintetico" },
        { id: "ds-2", type: "tool", prompt: "Quale strumento puo mostrare inclusioni metalliche o crescita?", options: ["Microscopio", "Calibro soltanto", "Magnete da banco"], correct_answer: "Microscopio" },
        { id: "ds-3", type: "procedure", prompt: "Il tester termico positivo prova l'origine naturale?", options: ["No", "Si, sempre", "Solo su pietre montate"], correct_answer: "No" }
      ]
    }
  },
  {
    slug: "moissanite",
    commercial_name: "Moissanite",
    mineralogical_name: "Carburo di silicio sintetico",
    family: "Carburi",
    gem_group: "Simulanti del diamante",
    chemical_formula: "SiC",
    crystal_system: "Esagonale (polimorfi gemmologici comuni)",
    origin: "Produzione sintetica; la moissanite naturale e estremamente rara",
    classification: "Sintetica",
    theory: "La moissanite gemmologica e un simulante sintetico del diamante. Elevata conducibilita termica, forte dispersione e birifrangenza impongono un controllo combinato con tester elettrico e osservazione del raddoppio delle faccette.",
    mohs_hardness: "9,25",
    density: "Circa 3,21-3,22 g/cm3",
    specific_gravity: "3,22",
    tenacity: "Buona, ma puo scheggiarsi",
    cleavage: "Indistinta",
    fracture: "Concoide",
    luster: "Adamantino",
    transparency: "Trasparente",
    color: "Incolore fino a lievi tonalita gialle, verdi o grigie",
    pleochroism: "Debole, spesso non evidente nelle qualita incolori",
    refractive_index: "2,648-2,691 (oltre limite rifrattometro standard)",
    birefringence: "0,043",
    dispersion: "0,104",
    double_refraction: "Presente e diagnostica se osservabile",
    fluorescence: "Variabile; possibile reazione arancio o verde",
    spectral_features: "Assorbimenti dipendenti da politipo e impurita; non normalmente risolutivi al solo banco.",
    optical_properties: [
      { name: "Birifrangenza", value: "0,043", explanation: "Produce raddoppio delle immagini interne.", bench: "Osservare le giunzioni delle faccette attraverso il padiglione." },
      { name: "Dispersione", value: "0,104", explanation: "Fuoco spettrale molto superiore al diamante.", bench: "Valutare con luce neutra e senza sovrastimare il taglio." },
      { name: "Indice di rifrazione", value: "2,648-2,691", explanation: "Molto alto e oltre il limite comune.", bench: "Usare metodi di riflettanza o combinazione di test." }
    ],
    inclusions: {
      typical: ["Aghi bianchi", "Canali o tubi paralleli", "Piccoli puntiformi"],
      rare: ["Cavita di crescita", "Zone cromatiche"],
      treatment_signs: ["Possibili modifiche di colore; segni non sempre osservabili al banco"],
      synthesis_signs: ["Tubi di crescita", "Aspetto interno molto pulito", "Pattern compatibili con crescita sintetica"],
      imitation_signs: ["Raddoppio delle faccette", "Dispersione molto forte", "Tester termico positivo ma elettrico compatibile con moissanite"]
    },
    gallery: academyGemMedia("moissanite", "Moissanite, vista macro didattica", "Fuoco spettrale intenso e possibile raddoppio delle giunzioni di faccetta."),
    recommended_tools: [
      { priority: 1, name: "Lente 10x", utility: "Ricerca del raddoppio", look_for: "Giunzioni duplicate attraverso il padiglione", expected_result: "Doppia rifrazione osservabile", limitations: "Direzione di osservazione e taglio possono mascherarla" },
      { priority: 2, name: "Tester diamanti", utility: "Test termico iniziale", look_for: "Conducibilita elevata", expected_result: "Possibile risposta positiva", limitations: "Non separa il diamante" },
      { priority: 3, name: "Tester moissanite", utility: "Separazione elettrica", look_for: "Risposta compatibile con moissanite", expected_result: "Indicazione moissanite", limitations: "Faccetta sporca o montatura causano errori" },
      { priority: 4, name: "Microscopio", utility: "Conferma ottica", look_for: "Raddoppio, tubi e aghi", expected_result: "Caratteri coerenti", limitations: "Pietre piccole o tagli particolari sono difficili" },
      { priority: 5, name: "Polariscopio", utility: "Anisotropia", look_for: "Reazione anisotropa", expected_result: "Doppia rifrazione", limitations: "Tensioni e montatura complicano la lettura" }
    ],
    operator_protocol: {
      title: "Protocollo OroActive - Moissanite",
      steps: [
        "Pulire la pietra e osservare abrasioni, cintura e brillantezza senza concludere dal solo aspetto.",
        "Eseguire il tester termico e annotare l'eventuale risposta positiva.",
        "Eseguire subito il tester moissanite/elettrico su faccetta pulita e lontana dal metallo.",
        "Cercare il raddoppio delle faccette con lente 10x e microscopio da piu direzioni.",
        "Verificare l'anisotropia al polariscopio se la pietra e smontata o ben accessibile.",
        "Confrontare tutti i risultati e registrare eventuali conflitti.",
        "Se il risultato resta ambiguo, non forzare l'identificazione e richiedere analisi avanzata."
      ]
    },
    common_mistakes: [
      "Fermarsi al tester termico positivo.",
      "Confondere forte fuoco con prova certa.",
      "Appoggiare la sonda sulla montatura.",
      "Cercare il raddoppio da una sola direzione."
    ],
    comparison_table: diamondComparison,
    identification_difficulty: 3,
    quiz: {
      questions: [
        { id: "mo-1", type: "material", prompt: "Quale materiale corrisponde al campione mostrato?", options: ["Diamante naturale", "Diamante sintetico", "Moissanite", "Zirconia cubica"], correct_answer: "Moissanite" },
        { id: "mo-2", type: "tool", prompt: "Dopo il tester termico positivo quale strumento usi?", options: ["Tester moissanite", "Spessimetro", "Solo UV"], correct_answer: "Tester moissanite" },
        { id: "mo-3", type: "procedure", prompt: "Cosa osservi attraverso il padiglione?", options: ["Raddoppio delle faccette", "Magnetismo", "Porosita"], correct_answer: "Raddoppio delle faccette" }
      ]
    }
  },
  {
    slug: "zirconia-cubica",
    commercial_name: "Zirconia cubica",
    mineralogical_name: "Ossido di zirconio stabilizzato",
    family: "Ossidi sintetici",
    gem_group: "Simulanti del diamante",
    chemical_formula: "ZrO2 stabilizzato (spesso con Y2O3 o CaO)",
    crystal_system: "Cubico",
    origin: "Produzione sintetica",
    classification: "Imitazione",
    theory: "La zirconia cubica e un simulante sintetico del diamante. Il peso specifico elevato, la durezza inferiore, gli spigoli piu facilmente abrasi e la bassa conducibilita termica consentono una separazione generalmente rapida.",
    mohs_hardness: "8-8,5",
    density: "5,65-5,95 g/cm3",
    specific_gravity: "5,65-5,95",
    tenacity: "Fragile",
    cleavage: "Assente",
    fracture: "Concoide",
    luster: "Adamantino a subadamantino",
    transparency: "Trasparente",
    color: "Incolore o in numerosi colori",
    pleochroism: "Assente",
    refractive_index: "2,15-2,18",
    birefringence: "Assente",
    dispersion: "0,058-0,066",
    double_refraction: "Assente",
    fluorescence: "Variabile, spesso debole o assente",
    spectral_features: "Generalmente priva delle caratteristiche spettrali del diamante; eventuali bande dipendono dai coloranti.",
    optical_properties: [
      { name: "Peso specifico", value: "5,65-5,95", explanation: "E sensibilmente piu pesante del diamante a pari volume.", bench: "Usare bilancia idrostatica su pietra smontata." },
      { name: "Indice di rifrazione", value: "2,15-2,18", explanation: "Alto ma inferiore al diamante.", bench: "Oltre il limite di molti rifrattometri standard." },
      { name: "Conducibilita termica", value: "Bassa rispetto al diamante", explanation: "Il tester diamanti normalmente non segnala diamante.", bench: "Ripetere su faccetta pulita e a temperatura ambiente." }
    ],
    inclusions: {
      typical: ["Puntiformi", "Bolle occasionali", "Aspetto molto pulito"],
      rare: ["Residui di crescita", "Zone di colore"],
      treatment_signs: ["Rivestimenti superficiali colorati o iridescenti"],
      synthesis_signs: ["Assenza di inclusioni naturali", "Caratteristiche di fusione sintetica"],
      imitation_signs: ["Spigoli abrasi", "Faccette arrotondate", "Peso elevato", "Tester termico negativo"]
    },
    gallery: academyGemMedia("zirconia-cubica", "Zirconia cubica, vista macro didattica", "Faccette piu ampie, brillantezza vetrosa e spigoli meno netti rispetto al diamante."),
    recommended_tools: [
      { priority: 1, name: "Lente 10x", utility: "Controllo superficie", look_for: "Spigoli abrasi e faccette arrotondate", expected_result: "Indizi da simulante", limitations: "Una pietra nuova puo apparire molto netta" },
      { priority: 2, name: "Tester diamanti", utility: "Separazione termica", look_for: "Bassa conducibilita", expected_result: "Risposta negativa", limitations: "Contatto errato produce falsi negativi" },
      { priority: 3, name: "Bilancia idrostatica", utility: "Misura del peso specifico", look_for: "Valore molto elevato", expected_result: "Circa 5,65-5,95", limitations: "Richiede pietra smontata e misura accurata" },
      { priority: 4, name: "Microscopio", utility: "Conferma morfologica", look_for: "Abrasione, bolle e assenza di caratteri naturali", expected_result: "Quadro coerente con CZ", limitations: "Non usare una sola inclusione come prova" },
      { priority: 5, name: "Polariscopio", utility: "Verifica isotropia", look_for: "Estinzione isotropa", expected_result: "Materiale cubico", limitations: "Non separa da altri materiali cubici" }
    ],
    operator_protocol: {
      title: "Protocollo OroActive - Zirconia cubica",
      steps: [
        "Pulire e pesare la pietra, registrando misure e stato della montatura.",
        "Osservare con lente 10x spigoli, cintura, abrasioni e bolle.",
        "Eseguire il tester diamanti su una faccetta asciutta.",
        "Se smontata, calcolare il peso specifico con bilancia idrostatica.",
        "Confermare isotropia al polariscopio e morfologia al microscopio.",
        "Confrontare i dati con diamante e moissanite prima di classificare.",
        "Registrare come imitazione solo quando i risultati sono coerenti e ripetibili."
      ]
    },
    common_mistakes: [
      "Valutare il materiale dal solo fuoco.",
      "Ignorare il peso anormalmente elevato.",
      "Testare una pietra fredda o sporca una sola volta.",
      "Confondere zirconia cubica con zircon naturale."
    ],
    comparison_table: diamondComparison,
    identification_difficulty: 1,
    quiz: {
      questions: [
        { id: "zc-1", type: "material", prompt: "Quale materiale corrisponde al campione mostrato?", options: ["Diamante naturale", "Diamante sintetico", "Moissanite", "Zirconia cubica"], correct_answer: "Zirconia cubica" },
        { id: "zc-2", type: "tool", prompt: "Quale strumento conferma il peso specifico?", options: ["Bilancia idrostatica", "Dicroscopio", "UV corta"], correct_answer: "Bilancia idrostatica" },
        { id: "zc-3", type: "procedure", prompt: "Quale segno superficiale e frequente?", options: ["Spigoli abrasi", "Sfaldatura micacea", "Seta di rutilo"], correct_answer: "Spigoli abrasi" }
      ]
    }
  }
].map((material) => ({
  ...material,
  published: false,
  active: true,
  review_status: "draft",
  media_status: "needs_media",
  founder_review_status: "pending",
  review_note: "Contenuto didattico precedente da validare con fonti, media HD autorizzati e revisione Founder."
}));

const LEGACY_GEM_BY_SLUG = new Map(LEGACY_ACADEMY_GEM_MATERIALS.map((material) => [
  material.slug === "diamante-sintetico" ? "diamante-sintetico-hpht" : material.slug,
  material
]));

export const ACADEMY_GEM_TOOLS = GEM_TOOL_SEED.map((tool) => {
  const legacy = LEGACY_ACADEMY_GEM_TOOLS.find((item) => item.name === tool.name);
  return legacy ? { ...tool, ...legacy } : tool;
});

export const ACADEMY_GEM_MATERIALS = GEM_CATALOG_SEED.map((seed) => {
  return { ...seed };
});

export function academyGemSeedValidation(materials = ACADEMY_GEM_MATERIALS) {
  return materials.map((material) => {
    const publication = evaluateGemPublicationReadiness(material, {
      authorizedHdMedia: 4,
      inclusions: Array.isArray(material.inclusions?.typical) ? material.inclusions.typical.length : 0,
      linkedTools: Array.isArray(material.recommended_tools) ? material.recommended_tools.length : 0,
      protocols: Array.isArray(material.operator_protocol?.steps) && material.operator_protocol.steps.length ? 1 : 0,
      comparisons: Array.isArray(material.comparison_table?.rows) && material.comparison_table.rows.length ? 1 : 0,
      sources: Array.isArray(material.sources) ? material.sources.length : 0
    });
    return {
      slug: material.slug,
      valid: Boolean(
        material.slug
        && (material.name || material.commercial_name)
        && Number(material.identification_difficulty) >= 1
        && Number(material.identification_difficulty) <= 5
        && (!material.published || publication.ready)
      ),
      publication
    };
  });
}

export const academyGemCatalogValidation = Object.freeze({
  ...GEM_CATALOG_SEED_VALIDATION,
  valid: GEM_CATALOG_SEED_VALIDATION.count === GEM_CATALOG_SEED_VALIDATION.expectedCount
    && GEM_CATALOG_SEED_VALIDATION.uniqueSlugs === GEM_CATALOG_SEED_VALIDATION.expectedCount
});
