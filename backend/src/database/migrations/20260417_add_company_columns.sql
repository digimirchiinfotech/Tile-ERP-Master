-- Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_user VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS db_password VARCHAR(255);
