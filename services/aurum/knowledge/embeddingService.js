function normalizeVector(vector) {
  if (!Array.isArray(vector) || !vector.length || vector.some((item) => !Number.isFinite(Number(item)))) {
    throw new Error("Embedding non valido.");
  }
  return vector.map(Number);
}

export function cosineSimilarity(left = [], right = []) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

export function createEmbeddingService(options = {}) {
  const callback = options.embedMany || (options.client?.embeddings?.create
    ? async (texts) => {
      const response = await options.client.embeddings.create({
        model: options.model || "text-embedding-3-small",
        input: texts,
        ...(options.dimensions ? { dimensions: options.dimensions } : {})
      });
      return response.data.map((item) => item.embedding);
    }
    : null);
  if (typeof callback !== "function") throw new Error("Fornire embedMany o un client embeddings esistente.");
  return Object.freeze({
    async embedMany(texts = []) {
      const normalized = texts.map((text) => String(text || "").trim());
      if (!normalized.length || normalized.some((text) => !text)) return [];
      const vectors = await callback(normalized);
      if (!Array.isArray(vectors) || vectors.length !== normalized.length) throw new Error("Numero di embedding inatteso.");
      return vectors.map(normalizeVector);
    },
    async embed(text) {
      return (await this.embedMany([text]))[0];
    },
    similarity: cosineSimilarity
  });
}
