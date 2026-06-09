-- Migration: Add permission_no and permission_year to companies table
-- Date: 2026-05-09

ALTER TABLE companies ADD COLUMN IF NOT EXISTS permission_no VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS permission_year VARCHAR(20) DEFAULT '2025-26';
