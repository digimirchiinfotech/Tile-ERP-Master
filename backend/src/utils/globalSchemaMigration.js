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

        -- Module Access Table
        CREATE TABLE IF NOT EXISTS public.module_access (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL,
            module_name VARCHAR(100) NOT NULL,
            is_enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (company_id, module_name)
        );
        CREATE INDEX IF NOT EXISTS idx_module_access_company ON public.module_access (company_id);

        -- Users Table: Ensure username column exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'username'
        ) THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
        END IF;

        -- Subscription Plans Table: Ensure table and newly added columns exist
        CREATE TABLE IF NOT EXISTS public.subscription_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(50) UNIQUE,
          price NUMERIC(10,2) DEFAULT 0,
          price_monthly NUMERIC(10,2),
          max_users INTEGER,
          max_companies INTEGER DEFAULT 1,
          duration INTEGER DEFAULT 30,
          duration_type VARCHAR(20) DEFAULT 'days',
          features JSONB,
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'code') THEN
          ALTER TABLE subscription_plans ADD COLUMN code VARCHAR(50) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_monthly') THEN
          ALTER TABLE subscription_plans ADD COLUMN price_monthly NUMERIC(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_companies') THEN
          ALTER TABLE subscription_plans ADD COLUMN max_companies INTEGER DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration') THEN
          ALTER TABLE subscription_plans ADD COLUMN duration INTEGER DEFAULT 30;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_type') THEN
          ALTER TABLE subscription_plans ADD COLUMN duration_type VARCHAR(20) DEFAULT 'days';
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
    return { success: true };
  } catch (err) {
    // Non-fatal: log and continue startup. The columns may already exist.
    debugLogger.warn(CONTEXT, `[GlobalSchema] Self-heal warning (non-fatal): ${err.message}`);
    return { success: false, error: err.message };
  }
};
