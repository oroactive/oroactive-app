function normalizeIntentText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasStrongComproOroSectorIntent(question = "", sectorMatches = [], coachingKnowledge = {}) {
  const normalized = normalizeIntentText(question);
  const sectorScore = Number(sectorMatches[0]?.score || 0);
  const coachingScore = Number(coachingKnowledge.matches?.[0]?.score || 0);
  const hasUnambiguousRegulatedMarker = /\b(?:oam|uif|sos|opo|operatore professionale in oro|operazione sospetta|dichiarazione oro|infostat|legge 7(?:\/2000)?|antiriciclaggio|registro (?:oam|opo|degli operatori compro oro|operatori compro oro)|d ?lgs ?92(?:\/2017)?|d ?lgs ?211(?:\/2024)?|d ?m ?14 maggio 2018)\b/.test(normalized);
  if (hasUnambiguousRegulatedMarker && sectorScore >= 20) return true;
  const hasAuthoritiesSuapOpeningMarker = /\b(?:guardia di finanza|gdf|carabinieri|polizia di stato|questura|questore|suap|sportello unico attivita produttive|scia|silenzio assenso|silenzio-assenso|articolo 127|art 127|nspv|nucleo speciale polizia valutaria|accesso ispettivo|ispezione|processo verbale di constatazione|pvc)\b/.test(normalized)
    || /\bpolizia\b.*\b(?:compro oro|prezios[a-z]*|tulps|licenza|controll[a-z]*|verific[a-z]*)\b/.test(normalized)
    || /\bautorit[a-z]*\b.*\b(?:compro oro|controll[a-z]*|competenz[a-z]*)\b/.test(normalized)
    || /\b(?:apr[a-z]*|apertura|avvi[a-z]*|inizi[a-z]*)\b.*\b(?:compro oro|oro usato|negozio\b.{0,40}\b(?:compr[a-z]*|acquist[a-z]*)\b.{0,20}\boro)\b/.test(normalized)
    || /\b(?:nuova sede|filiale|trasferimento|preposto|cessazione)\b.*\b(?:compro oro|oam|questura|suap)\b/.test(normalized);
  if (hasAuthoritiesSuapOpeningMarker && sectorScore >= 20) return true;
  const hasSpecialistAccountingMarker = /\b(?:prima nota|partita doppia|regime iva|trattamento iva|natura iva|regime (?:iva )?del margine|reverse charge|inversione contabile|registri? iva|lipe|f24|sdi|rimanenze|cespiti|ammortamento|cash flow|controllo di gestione)\b/.test(normalized)
    || /\b(?:commercialista|contabilita|contabile|fiscalista)\b.*\b(?:compro oro|negozio|oro|preziosi|iva|bilancio|adempimenti|lavoro|svolge|funziona)\b/.test(normalized)
    || /\b(?:compro oro|negozio|oro|preziosi)\b.*\b(?:commercialista|contabilita|contabile|fiscalista)\b/.test(normalized);
  if (hasSpecialistAccountingMarker && sectorScore >= 24) return true;
  const hasBullionSpecialistMarker = /\b(?:good delivery|buona consegna|lingott[a-z]*|bullion|caveau|allocated|unallocated|riserve auree|banca d italia|quadro rw|monitoraggio fiscale|frontiera|dogana|adm)\b/.test(normalized);
  if (hasBullionSpecialistMarker && sectorScore >= 24) return true;
  const requestsAppTutorial = /\b(?:tutorial|guida|passo passo|sezione fusioni|nell app|dell app)\b/.test(normalized);
  const hasFoundrySpecialistMarker = /\b(?:fonderia|fonderie|raffineria|raffinerie|conto metallo|conto lavorazione|campione testimone|fire assay|coppellazione)\b/.test(normalized)
    || /\b(?:fusione|affinazione|saggio|campionamento|trattenuta|resa|separ[a-z]*|purific[a-z]*)\b.*\b(?:oro|argento|metall[a-z]*|lega|leghe|lotto|compro oro|lombardia)\b/.test(normalized)
    || /\b(?:oro|argento|metall[a-z]*|lega|leghe|lotto|compro oro|lombardia)\b.*\b(?:fusione|affinazione|saggio|campionamento|trattenuta|resa|separ[a-z]*|purific[a-z]*)\b/.test(normalized);
  if (!requestsAppTutorial && hasFoundrySpecialistMarker && sectorScore >= 24) return true;
  const hasExtractionSpecialistMarker = /\b(?:estr[a-z]*|miniera|miniere|beneficiament[a-z]*|recuper[a-z]*|concentrat[a-z]*|flottazion[a-z]*|bilancio di massa|metal accounting|assay|qaqc|tailings|sterili|gistm|asm|asgm|perlicoltura|origine mineraria)\b/.test(normalized)
    || /\b(?:raccogl[a-z]*|raccol[a-z]*|coltiv[a-z]*|allev[a-z]*|pesca)\b.*\b(?:perla|perle|corallo|ambra)\b/.test(normalized)
    || /\b(?:perla|perle|corallo|ambra)\b.*\b(?:raccogl[a-z]*|raccol[a-z]*|coltiv[a-z]*|allev[a-z]*|pesca)\b/.test(normalized)
    || /\b(?:approvvigion[a-z]*|filiera|provenienza|proviene|origine|ottien[a-z]*|ottenere|produc[a-z]*|prodott[a-z]*|fabbric[a-z]*)\b.*\b(?:oro|argento|platino|palladio|diamant[a-z]*|gemm[a-z]*|pietr[a-z]*|perla|perle|corallo|ambra)\b/.test(normalized)
    || /\b(?:oro|argento|platino|palladio|diamant[a-z]*|gemm[a-z]*|pietr[a-z]*|perla|perle|corallo|ambra)\b.*\b(?:approvvigion[a-z]*|filiera|provenienza|proviene|origine|ottien[a-z]*|ottenere|produc[a-z]*|prodott[a-z]*|fabbric[a-z]*)\b/.test(normalized)
    || /\b(?:lisciviazion[a-z]*|cianurazion[a-z]*|cianuro|mercurio|amalgam[a-z]*|brillament[a-z]*|esplosiv[a-z]*)\b/.test(normalized);
  if (hasExtractionSpecialistMarker && sectorScore >= 24) return true;
  const hasGeologyOrNumismaticMarker = /\b(?:geologia|geologico|giaciment[a-z]*|mineralizz[a-z]*|placer|alluvional[a-z]*|orogenic[a-z]*|epitermal[a-z]*|vms|sedex|kimberlit[a-z]*|lamproit[a-z]*|mantello|pge|bushveld|cromitite|numismatic[a-z]*|monet[a-z]* aure[a-z]*|ritrovament[a-z]* di monet[a-z]*|tesor[a-z]* monetal[a-z]*|ripostigli[a-z]*|hoard|dinasti[a-z]* tudor)\b/.test(normalized);
  if (hasGeologyOrNumismaticMarker && sectorScore >= 24) return true;
  const hasConsultativeSalesMarker = /\b(?:vendita consulenziale|persuasion[a-z]*|obiezion[a-z]*|gestisc[a-z]*.{0,30}obiezion[a-z]*|negoziazion[a-z]*|closing|chiusura consensuale|prova sociale|falsa urgenza|dark pattern|client[a-z]* vulnerabil[a-z]*|role ?play.{0,30}vendit[a-z]*|formazione avanzata.{0,30}vendit[a-z]*)\b/.test(normalized)
    || /\b(?:convinc[a-z]*|chiud[a-z]*|present[a-z]* l offerta|spieg[a-z]* la valutazione)\b.*\b(?:client[a-z]*|compro oro|gioielleria|oro)\b/.test(normalized)
    || /\b(?:client[a-z]*|compro oro|gioielleria)\b.*\b(?:obiezion[a-z]*|offerta senza pressione|scelta informata|decisione libera|vendere solo alcuni|pensarci)\b/.test(normalized);
  if (hasConsultativeSalesMarker && sectorScore >= 24) return true;
  const hasSectorMarker = /(compro oro|atto di vendita|contante|pagamento|quotazione|valutazione (?:dell |di )?oro|prezzo (?:dell |di )?oro|carat|titolo dell oro|bilancia|xrf|pietra di paragone|acido nitrico)/.test(normalized);
  return hasSectorMarker && sectorScore >= Math.max(40, coachingScore * 1.25);
}

function isSaleDeedSection(section = "") {
  return ["practice", "nuovo atto vendita"].includes(normalizeIntentText(section));
}

function hasExplicitSaleDeedFormIntent(question = "") {
  const normalized = normalizeIntentText(question);
  if (!normalized) return false;
  return /\b(?:atto di vendita|pratica di vendita|modulo(?: dell atto| di vendita)?|compil\w*|campo|voce (?:del|dell|nel) modulo|inserir\w* (?:nel|nella|sul|sulla)|scriver\w* (?:nel|nella|sul|sulla)|selezionar\w* (?:nel|nella|sul|sulla)|firma (?:del|dell|sull)|allegat\w* (?:al|all)|numero atto|note operatore|controllo qualita)\b/.test(normalized);
}

export function hasSaleDeedIntent(question = "", matches = [], options = {}) {
  if (!matches.length) return false;
  if (String(options.requestedFieldId || "").trim()) return true;
  const topScore = Number(matches[0]?.score || 0);
  if (topScore < 24) return false;
  return isSaleDeedSection(options.section) || hasExplicitSaleDeedFormIntent(question);
}

export function resolveAurumKnowledgeRoute({
  question = "",
  requestedFieldId = "",
  section = "",
  gemIntent = false,
  coinIntent = false,
  saleMatches = [],
  sectorMatches = [],
  coachingKnowledge = {},
  isNormativeQuestion = false
} = {}) {
  const strongSectorPriority = Boolean(isNormativeQuestion)
    || Boolean(coinIntent)
    || hasStrongComproOroSectorIntent(question, sectorMatches, coachingKnowledge);
  const saleIntent = hasSaleDeedIntent(question, saleMatches, { requestedFieldId, section });
  const hasExplicitSaleDeedPriority = Boolean(String(requestedFieldId || "").trim())
    || hasExplicitSaleDeedFormIntent(question);
  const hasSaleDeedContext = saleIntent
    && (Boolean(String(requestedFieldId || "").trim()) || !gemIntent)
    && (!strongSectorPriority || hasExplicitSaleDeedPriority);
  const hasGoldCoinContext = Boolean(coinIntent) && !hasSaleDeedContext;
  const hasGemologicalContext = Boolean(gemIntent) && !hasSaleDeedContext && !hasGoldCoinContext && !strongSectorPriority;
  return Object.freeze({
    saleIntent,
    hasSaleDeedContext,
    hasGoldCoinContext,
    hasGemologicalContext,
    strongSectorPriority
  });
}
