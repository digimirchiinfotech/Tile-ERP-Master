-- Migration: 20260626_encrypt_client_sensitive_fields
-- Adds encrypted financial identifier columns to clients table.
-- Changes credit_limit from NUMERIC to TEXT to store AES-256-GCM ciphertext.
-- DPDP Act 2023 compliance: bank_account_number, bank_ifsc, gst_number, iec_code, credit_limit.

-- 1. Add new sensitive columns (nullable — existing rows get NULL, no data loss)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_ifsc           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gst_number          TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS iec_code            TEXT DEFAULT NULL;

-- 2. Convert credit_limit from NUMERIC to TEXT to hold encrypted ciphertext.
--    Existing numeric values (e.g. 0, 50000) are cast to string first.
--    The application layer will decrypt -> parseFloat() transparently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'credit_limit'
      AND data_type IN ('numeric', 'integer', 'double precision', 'real')
  ) THEN
    ALTER TABLE clients ALTER COLUMN credit_limit TYPE TEXT USING credit_limit::TEXT;
  END IF;
END $$;
