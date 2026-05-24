ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding_json JSONB;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;

UPDATE ai_document_chunks
SET content_tsv = to_tsvector('italian', COALESCE(content, ''))
WHERE content_tsv IS NULL;

CREATE INDEX IF NOT EXISTS ai_document_chunks_content_fts_idx
  ON ai_document_chunks USING GIN (content_tsv);

-- Il supporto pgvector viene attivato automaticamente dal backend:
-- 1. SELECT * FROM pg_extension WHERE extname = 'vector'
-- 2. CREATE EXTENSION IF NOT EXISTS vector
-- 3. ALTER TABLE ai_document_chunks ADD COLUMN embedding vector(1536) oppure embedding_vector vector(1536)
-- 4. CREATE INDEX ivfflat se l'estensione e disponibile.
-- Se pgvector non e disponibile, OroActive usa il fallback full-text PostgreSQL.
