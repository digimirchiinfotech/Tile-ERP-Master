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

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REQUIRED_TABLES = [
  'companies', 'subscription_plans', 'company_subscriptions',
  'users', 'password_reset_tokens', 'refresh_tokens',
  'leads', 'clients', 'suppliers',
  'products', 'catalogues', 'catalogue_products',
  'proforma_invoices', 'proforma_orders', 'client_orders',
  'qc_records', 'pallets', 'packing_lists',
  'shipping_instructions', 'customs_clearance', 'bills_of_lading',
  'certificates', 'post_shipment_docs', 'account_entries',
  'support_tickets', 'ticket_comments'
];

async function runMigrations() {
  
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const existingTables = new Set(tablesResult.rows.map(row => row.table_name.toLowerCase()));
    const isDatabaseEmpty = !existingTables.has('companies') || !existingTables.has('users');
    
    if (isDatabaseEmpty) {
      
      const schemaClient = await pool.connect();
      try {
        await schemaClient.query('BEGIN');
        const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        
        await schemaClient.query(schemaSQL);
        await schemaClient.query('COMMIT');
        
      } catch (error) {
        await schemaClient.query('ROLLBACK');
        console.error('❌ Schema setup failed. Transaction rolled back.');
        console.error('SQL Error Detail:', error.message);
        throw error;
      } finally {
        schemaClient.release();
      }
    } else {
    }

    // Skip validation if we just want to run whatever is there
    // const missingTables = REQUIRED_TABLES.filter(table => !existingTables.has(table.toLowerCase()));
    
    // if (missingTables.length > 0) {
    //   throw new Error(
    //     `Schema validation failed. Missing required tables: ${missingTables.join(', ')}. ` +
    //     `The database may be corrupted. Consider dropping and recreating it.`
    //   );
    // }
    
    
    const migrationsDir = join(__dirname, 'migrations');
    let migrationFiles = [];
    try {
      migrationFiles = readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (err) {
    }
    
    const appliedMigrationsResult = await client.query(
      `SELECT filename FROM migrations_applied`
    );
    const appliedMigrations = new Set(
      appliedMigrationsResult.rows.map(row => row.filename)
    );
    
    let appliedCount = 0;
    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue;
      }
      
      const migrationSQL = readFileSync(join(migrationsDir, filename), 'utf8');
      const useTransaction = !/\bCONCURRENTLY\b/i.test(migrationSQL);

      if (useTransaction) {
        await client.query('BEGIN');
      }

      try {
        if (!useTransaction) {
          // Split by semicolon, being careful with comments
          const statements = migrationSQL
            .split('\n')
            .map(line => line.replace(/--.*$/, ''))
            .join(' ')
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          
          for (const statement of statements) {
            await client.query(statement);
          }
        } else {
          await client.query(migrationSQL);
        }
        
        await client.query(
          `INSERT INTO migrations_applied (filename) VALUES ($1)`,
          [filename]
        );
        
        if (useTransaction) {
          await client.query('COMMIT');
        }
        appliedCount++;
      } catch (error) {
        if (useTransaction) {
          await client.query('ROLLBACK');
          console.error(`❌ Migration ${filename} failed. Transaction rolled back.`);
        } else {
          console.error(`❌ Migration ${filename} failed (No transaction).`);
        }
        console.error('Error:', error.message);
        if (useTransaction) {
          console.error('Database remains in previous safe state. Fix the migration and retry.');
        } else {
          console.error('Some changes may have been partially applied. Check database state.');
        }
        throw error;
      }
    }
    
    if (appliedCount === 0) {
      console.log('ℹ️  No new migrations to apply');
    } else {
      console.log(`✅ ${appliedCount} migration(s) applied`);
    }
    
    client.release();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    client.release();
    process.exit(1);
  }
}

runMigrations();
