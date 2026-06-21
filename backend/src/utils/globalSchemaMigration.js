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
import { getCompanyDatabase } from '../config/companyDatabaseRouter.js';

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

        -- Users Table: Ensure username and sales tracking columns exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'username'
        ) THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employee_id') THEN
          ALTER TABLE users ADD COLUMN employee_id VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'territory') THEN
          ALTER TABLE users ADD COLUMN territory VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sales_target') THEN
          ALTER TABLE users ADD COLUMN sales_target NUMERIC(15,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'commission') THEN
          ALTER TABLE users ADD COLUMN commission NUMERIC(5,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'country') THEN
          ALTER TABLE users ADD COLUMN country VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'city') THEN
          ALTER TABLE users ADD COLUMN city VARCHAR(100);
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

        -- Packing Lists missing columns fix
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'packing_lists' AND column_name = 'deleted_at'
        ) THEN
          ALTER TABLE packing_lists ADD COLUMN deleted_at timestamp without time zone;
        END IF;

        -- Restore missing column that breaks pg_dump if stale views reference it
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'default_sqm_per_box'
        ) THEN
          ALTER TABLE products ADD COLUMN default_sqm_per_box NUMERIC(10,4);
        END IF;

        -- Account Entries missing column fix
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'account_entries' AND column_name = 'reference_no'
        ) THEN
          ALTER TABLE account_entries ADD COLUMN reference_no VARCHAR(255);
        END IF;

        -- Packing Lists missing LC fields fix
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'packing_lists' AND column_name = 'lc_number'
        ) THEN
          ALTER TABLE packing_lists ADD COLUMN lc_number VARCHAR(255);
          ALTER TABLE packing_lists ADD COLUMN lc_date DATE;
          ALTER TABLE packing_lists ADD COLUMN epcg_no VARCHAR(255);
        END IF;

        -- Export Invoice Document Locking audit table
        CREATE TABLE IF NOT EXISTS public.export_document_lock (
            id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
            company_id uuid NOT NULL,
            exp_no character varying(100) NOT NULL,
            document_type character varying(100) NOT NULL,
            document_id uuid NOT NULL,
            lock_status character varying(50) DEFAULT 'LOCKED'::character varying,
            locked_by uuid,
            locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            unlocked_by uuid,
            unlocked_at timestamp without time zone,
            unlock_reason text,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_export_document_lock_company_id ON public.export_document_lock(company_id);
        CREATE INDEX IF NOT EXISTS idx_export_document_lock_exp_no ON public.export_document_lock(exp_no);
        CREATE INDEX IF NOT EXISTS idx_export_document_lock_document_id ON public.export_document_lock(document_id);

      END $$;
    `);

    debugLogger.info(CONTEXT, '[GlobalSchema] ✅ Global companies schema self-heal complete.');

    // ─── Phase 2: Tenant Schema Self-Heal ──────────────────────────────
    debugLogger.info(CONTEXT, '[TenantSchema] Running schema self-heal for isolated tenant databases...');
    const companies = await masterQuery("SELECT id, db_name FROM companies WHERE status = 'Active' AND db_name IS NOT NULL");
    
    for (const company of companies.rows) {
      try {
        const tenantPool = await getCompanyDatabase(company.id);
        await tenantPool.query(`
          DO $$
          BEGIN
            -- Packing Lists missing LC fields fix
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'packing_lists' AND column_name = 'lc_number'
            ) THEN
              ALTER TABLE packing_lists ADD COLUMN lc_number VARCHAR(255);
              ALTER TABLE packing_lists ADD COLUMN lc_date DATE;
              ALTER TABLE packing_lists ADD COLUMN epcg_no VARCHAR(255);
            END IF;

            -- ── 2026-06-20: QC Schema Hardening ────────────────────────────
            ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS box_type VARCHAR(255);
            ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS order_sheet_id UUID;
            ALTER TABLE qc_records DROP CONSTRAINT IF EXISTS qc_records_order_id_fkey;
            ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
            ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
            ALTER TABLE qc_records ADD COLUMN IF NOT EXISTS manufacturing_date DATE;

            -- ── 2026-06-20: Soft-Delete Columns ─────────────────────────────
            ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
            ALTER TABLE export_invoices ADD COLUMN IF NOT EXISTS deleted_by UUID;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by UUID;
            -- ── 2026-06-21: Add client_id column to leads
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'leads' AND column_name = 'client_id'
            ) THEN
              ALTER TABLE leads ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
            END IF;
            ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
            ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS deleted_by UUID;
            ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
            ALTER TABLE shipping_instructions ADD COLUMN IF NOT EXISTS deleted_by UUID;
            ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
            ALTER TABLE vgm_documents ADD COLUMN IF NOT EXISTS deleted_by UUID;

            -- ── 2026-06-20: Composite Performance Indexes ──────────────────
            CREATE INDEX IF NOT EXISTS idx_qc_records_company_created ON qc_records (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_qc_records_company_status ON qc_records (company_id, qc_status);
            CREATE INDEX IF NOT EXISTS idx_export_invoices_company_created ON export_invoices (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_export_invoices_company_status ON export_invoices (company_id, status);
            CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_created ON proforma_invoices (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_status ON proforma_invoices (company_id, status);
            CREATE INDEX IF NOT EXISTS idx_proforma_orders_company_created ON proforma_orders (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_account_entries_company_created ON account_entries (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_packing_lists_company_created ON packing_lists (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_leads_company_created ON leads (company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_clients_company_created ON clients (company_id, created_at DESC);

          END $$;
        `);
        debugLogger.info(CONTEXT, `[TenantSchema] ✅ Schema self-heal complete for company ${company.id}`);
      } catch (err) {
        debugLogger.warn(CONTEXT, `[TenantSchema] Warning for company ${company.id}: ${err.message}`);
      }
    }

    return { success: true };
  } catch (err) {
    // Non-fatal: log and continue startup. The columns may already exist.
    debugLogger.warn(CONTEXT, `[GlobalSchema] Self-heal warning (non-fatal): ${err.message}`);
    return { success: false, error: err.message };
  }
};
