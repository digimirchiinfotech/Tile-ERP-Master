-- Migration: 20260625_refresh_token_rotation.sql
-- Upgrades refresh_tokens table to support:
--   * SHA-256 hashed token storage (never store raw tokens)
--   * Token families for reuse-detection / theft invalidation
--   * revoked flag + reason for audit trail
--   * Cleanup of legacy raw-token column

BEGIN;

-- 1. Add new columns (all nullable initially to allow back-compat during migration)
ALTER TABLE public.refresh_tokens
  ADD COLUMN IF NOT EXISTS token_hash  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS family      UUID,
  ADD COLUMN IF NOT EXISTS revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(50);

-- 2. Back-fill family for existing rows so the NOT NULL below can be applied
UPDATE public.refresh_tokens SET family = gen_random_uuid() WHERE family IS NULL;

-- 3. Set NOT NULL on family now that all rows have a value
ALTER TABLE public.refresh_tokens ALTER COLUMN family SET NOT NULL;

-- 4. Back-fill token_hash from existing raw token column using md5 as a placeholder
--    (existing tokens will be unusable after this migration — users must re-login once)
UPDATE public.refresh_tokens
  SET token_hash = encode(sha256(token::bytea), 'hex')
  WHERE token_hash IS NULL AND token IS NOT NULL;

-- 5. Make token_hash NOT NULL and UNIQUE now that all rows are populated
ALTER TABLE public.refresh_tokens ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE public.refresh_tokens ADD CONSTRAINT IF NOT EXISTS refresh_tokens_token_hash_key UNIQUE (token_hash);

-- 6. Drop the old raw-token column — never store plaintext tokens
ALTER TABLE public.refresh_tokens DROP COLUMN IF EXISTS token;
ALTER TABLE public.refresh_tokens DROP COLUMN IF EXISTS revoked_at;

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family     ON public.refresh_tokens (family);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens (expires_at);

COMMIT;
