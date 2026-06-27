-- Add onboarding tracking to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
