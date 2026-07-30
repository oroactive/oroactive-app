ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS memory_key TEXT;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS memory_label TEXT;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS memory_value_encrypted TEXT;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'personal';
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT 'legacy';
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'legacy';
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS use_in_chat BOOLEAN DEFAULT FALSE;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS share_with_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE aurum_user_memories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE aurum_user_memories
SET source = COALESCE(source, 'legacy'),
    consent_version = COALESCE(consent_version, 'legacy'),
    use_in_chat = COALESCE(use_in_chat, FALSE),
    share_with_ai = COALESCE(share_with_ai, FALSE)
WHERE source IS NULL
   OR consent_version IS NULL
   OR use_in_chat IS NULL
   OR share_with_ai IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS aurum_user_memories_active_key_unique
  ON aurum_user_memories (user_id, memory_key)
  WHERE deleted_at IS NULL AND memory_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS aurum_user_memories_chat_idx
  ON aurum_user_memories (user_id, use_in_chat, updated_at DESC)
  WHERE deleted_at IS NULL;
