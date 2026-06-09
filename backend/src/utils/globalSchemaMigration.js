/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

/**
 * Global Schema Self-Heal Migration
 * 
 * Adds missing columns to the master (global) companies table at startup.
 * This is idempotent — safe to run on every server start.
 * 
 * Fixes the root cause of LUT ARN, LUT Date, IEC, and banking fields
 * being null/empty in all export documents.
 */

import { masterQuery } from '../config/masterDatabase.js';
import debugLogger from './debugLogger.js';

const CONTEXT = 'GlobalSchemaMigration';

export const runGlobalSchemaMigration = async () => {
  try {
    debugLogger.info(CONTEXT, '[GlobalSchema] Running global companies schema self-heal...');

    await masterQuery(`
      DO $$
      BEGIN
        -- LUT / Regulatory fields (critical for export documents)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'lut_arn_no'
        ) THEN
          ALTER TABLE companies ADD COLUMN lut_arn_no VARCHAR(100);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'lut_date'
        ) THEN
          ALTER TABLE companies ADD COLUMN lut_date DATE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'permission_no'
        ) THEN
          ALTER TABLE companies ADD COLUMN permission_no VARCHAR(100);
        END IF;

        -- Banking fields
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'bank_name'
        ) THEN
          ALTER TABLE companies ADD COLUMN bank_name VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'account_holder_name'
        ) THEN
          ALTER TABLE companies ADD COLUMN account_holder_name VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'account_number'
        ) THEN
          ALTER TABLE companies ADD COLUMN account_number VARCHAR(100);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'ifsc_code'
        ) THEN
          ALTER TABLE companies ADD COLUMN ifsc_code VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'swift_code'
        ) THEN
          ALTER TABLE companies ADD COLUMN swift_code VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'branch_name'
        ) THEN
          ALTER TABLE companies ADD COLUMN branch_name VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'bank_address'
        ) THEN
          ALTER TABLE companies ADD COLUMN bank_address TEXT;
        END IF;

        -- Module access unique constraint (prevents insert conflicts)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'module_access'
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%company_id%module_name%'
        ) THEN
          BEGIN
            ALTER TABLE module_access ADD CONSTRAINT module_access_company_module_unique UNIQUE (company_id, module_name);
          EXCEPTION WHEN duplicate_table THEN
            -- Already exists, ignore
          END;
        END IF;

        -- Session Tracking Table
        CREATE TABLE IF NOT EXISTS active_user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          refresh_token VARCHAR(500),
          ip_address VARCHAR(45),
          user_agent TEXT,
          device VARCHAR(100),
          browser VARCHAR(100),
          location VARCHAR(255),
          last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'Active'
        );

        -- Size Packing Master Table
        CREATE TABLE IF NOT EXISTS public.size_packing_master (
            id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
            company_id uuid NOT NULL,
            size character varying(100) NOT NULL,
            box_pcs integer DEFAULT 0,
            sqm_per_box numeric(10,4) DEFAULT 0,
            boxes_per_pallet integer DEFAULT 0,
            boxes_per_kathli integer DEFAULT 0,
            per_box_weight numeric(10,4) DEFAULT 0,
            per_pallet_weight numeric(10,4) DEFAULT 0,
            status character varying(20) DEFAULT 'Active',
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            created_by uuid,
            UNIQUE(company_id, size)
        );

      END $$;
    `);

    debugLogger.info(CONTEXT, '[GlobalSchema] ✅ Global companies schema self-heal complete.');
  } catch (err) {
    // Non-fatal: log and continue startup. The columns may already exist.
    debugLogger.warn(CONTEXT, `[GlobalSchema] Self-heal warning (non-fatal): ${err.message}`);
  }
};
