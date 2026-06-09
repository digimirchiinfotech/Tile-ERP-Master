-- Migration: Make country_code optional in master_countries
-- Country Code (ISO Alpha-2) is no longer mandatory when adding a country

DO $$
BEGIN
  -- Drop the NOT NULL constraint on country_code if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_countries'
      AND column_name = 'country_code'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.master_countries ALTER COLUMN country_code DROP NOT NULL;
    RAISE NOTICE 'master_countries.country_code is now nullable (optional)';
  ELSE
    RAISE NOTICE 'master_countries.country_code already nullable, skipping';
  END IF;
END $$;
