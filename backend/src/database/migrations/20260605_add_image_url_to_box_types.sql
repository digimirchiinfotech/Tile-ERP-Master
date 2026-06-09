-- Add image_url column to box_types table
ALTER TABLE box_types ADD COLUMN IF NOT EXISTS image_url TEXT NULL;
