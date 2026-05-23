CREATE TABLE IF NOT EXISTS ai_documents (
  id BIGSERIAL PRIMARY KEY,
  titolo TEXT NOT NULL,
  autore TEXT,
  filename TEXT,
  uploaded_by BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS titolo TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS autore TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS ai_document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_tsv TSVECTOR,
  embedding_json JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS document_id BIGINT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS embedding_json JSONB;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE ai_document_chunks
SET content_tsv = to_tsvector('italian', COALESCE(content, ''))
WHERE content_tsv IS NULL;

CREATE INDEX IF NOT EXISTS ai_document_chunks_document_idx
  ON ai_document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS ai_document_chunks_content_fts_idx
  ON ai_document_chunks USING GIN (content_tsv);
