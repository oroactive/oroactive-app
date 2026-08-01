export function buildCitations(items = [], options = {}) {
  const max = Math.max(1, Math.min(4, Number(options.max || 4)));
  const seen = new Set();
  return items.filter((item) => item.review_status === "approved" && item.is_current === true).map((item) => {
    const source = item.source || item;
    return {
      source_key: source.source_key || item.source_key || null,
      organization: source.organization || null,
      title: source.title || item.title || null,
      version: item.version_label || item.source_version_label || null,
      article: item.article_number || null,
      section: item.section_path || null,
      effective_from: item.effective_from || item.valid_from || null,
      effective_to: item.effective_to || item.valid_to || null,
      retrieved_at: item.retrieved_at || null,
      url: source.official_url || item.official_url || null,
      authority_level: Number(item.authority_level || source.authority_level || 0)
    };
  }).filter((citation) => {
    const key = `${citation.source_key}|${citation.version}|${citation.article}|${citation.section}`;
    if (!citation.source_key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.authority_level - a.authority_level).slice(0, max);
}
