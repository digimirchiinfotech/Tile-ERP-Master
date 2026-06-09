-- Add country and city columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city VARCHAR(255);
