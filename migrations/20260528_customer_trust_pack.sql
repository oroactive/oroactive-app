CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customer_trust_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_pack_code TEXT UNIQUE NOT NULL,
  sale_deed_id BIGINT NOT NULL,
  client_id BIGINT NULL,
  store_id BIGINT NULL,
  generated_by BIGINT NULL,
  pdf_path TEXT NULL,
  delivery_status TEXT DEFAULT 'generated',
  delivered_via TEXT NULL,
  delivered_to TEXT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS trust_pack_code TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS sale_deed_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS client_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS generated_by BIGINT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'generated';
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_via TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_to TEXT;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE customer_trust_packs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS customer_trust_packs_code_unique
  ON customer_trust_packs (trust_pack_code);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_sale_deed_id
  ON customer_trust_packs (sale_deed_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_client_id
  ON customer_trust_packs (client_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_store_id
  ON customer_trust_packs (store_id);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_generated_at
  ON customer_trust_packs (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_trust_packs_active
  ON customer_trust_packs (sale_deed_id, deleted_at);
