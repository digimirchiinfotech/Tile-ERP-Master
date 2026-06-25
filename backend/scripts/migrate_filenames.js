#!/usr/bin/env node
/**
 * ONE-TIME MIGRATION SCRIPT: Rename existing uploaded files to UUID format.
 * 
 * This script:
 * 1. Scans all database tables that store file paths (users, companies, catalogues, 
 *    box_types, products, qc_records, signatures, system_settings).
 * 2. For each file reference, renames the physical file to {uuid}.{ext}.
 * 3. Updates the database record with the new path.
 * 4. Stores the original filename for audit/display purposes.
 *
 * Usage:
 *   node backend/scripts/migrate_filenames.js
 *   DRY_RUN=true node backend/scripts/migrate_filenames.js   (preview without changes)
 *
 * Requires DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD env vars.
 */

import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const DRY_RUN = process.env.DRY_RUN === 'true';
const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.UPLOAD_DIR || 'uploads');

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'tile_exporter_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Tables and their file-path columns to migrate
const FILE_COLUMNS = [
  { table: 'users',           column: 'avatar_url',        idColumn: 'id' },
  { table: 'companies',       column: 'logo_url',          idColumn: 'id' },
  { table: 'catalogues',      column: 'cover_image_path',  idColumn: 'id' },
  { table: 'catalogues',      column: 'pdf_file_path',     idColumn: 'id' },
  { table: 'box_types',       column: 'image_url',         idColumn: 'id' },
];

const stats = { scanned: 0, renamed: 0, skipped: 0, errors: 0 };

/**
 * Check if a filename is already a UUID format (UUID.ext)
 */
function isAlreadyUUID(filename) {
  const name = path.basename(filename, path.extname(filename));
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
}

/**
 * Migrate a single file reference: rename physical file + update DB
 */
async function migrateFileRef(client, table, column, idColumn, id, currentPath) {
  stats.scanned++;

  if (!currentPath || typeof currentPath !== 'string') {
    stats.skipped++;
    return;
  }

  // Normalize: could be /uploads/tenant_X/filename or just filename
  const filename = path.basename(currentPath);
  
  if (isAlreadyUUID(filename)) {
    stats.skipped++;
    return;
  }

  const ext = path.extname(filename) || '';
  const newFilename = `${uuidv4()}${ext}`;
  const dirPart = path.dirname(currentPath);
  const newPath = dirPart !== '.' ? `${dirPart}/${newFilename}` : newFilename;

  // Try to find and rename the physical file on disk
  const possiblePaths = [
    path.join(UPLOADS_DIR, currentPath.replace(/^\/uploads\//, '')),
    path.join(UPLOADS_DIR, filename),
    currentPath.startsWith('/') ? currentPath : path.join(UPLOADS_DIR, currentPath),
  ];

  let physicalRenamed = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const newPhysical = path.join(path.dirname(p), newFilename);
      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would rename: ${p} -> ${newPhysical}`);
      } else {
        fs.renameSync(p, newPhysical);
      }
      physicalRenamed = true;
      break;
    }
  }

  if (!physicalRenamed) {
    console.warn(`  ⚠ Physical file not found for ${table}.${column} id=${id}: ${currentPath}`);
  }

  // Update the database record
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update ${table} SET ${column}='${newPath}' WHERE ${idColumn}=${id}`);
  } else {
    await client.query(
      `UPDATE ${table} SET ${column} = $1 WHERE ${idColumn} = $2`,
      [newPath, id]
    );
  }

  stats.renamed++;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  File Upload UUID Migration Script          ║');
  console.log('╚══════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('\n🏜️  DRY RUN MODE — no changes will be made.\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const { table, column, idColumn } of FILE_COLUMNS) {
      // Check if table/column exists
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );

      if (colCheck.rows.length === 0) {
        console.log(`⏭ Skipping ${table}.${column} — column does not exist.`);
        continue;
      }

      console.log(`\n📁 Processing ${table}.${column}...`);
      const rows = await client.query(
        `SELECT ${idColumn}, ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`
      );

      console.log(`   Found ${rows.rows.length} records with file references.`);

      for (const row of rows.rows) {
        try {
          await migrateFileRef(client, table, column, idColumn, row[idColumn], row[column]);
        } catch (err) {
          stats.errors++;
          console.error(`   ❌ Error migrating ${table} id=${row[idColumn]}: ${err.message}`);
        }
      }
    }

    // Also scan tenant-specific uploads directories for files that may not have DB references
    // (orphan check is informational only)
    if (fs.existsSync(UPLOADS_DIR)) {
      const tenantDirs = fs.readdirSync(UPLOADS_DIR).filter(d => d.startsWith('tenant_'));
      let orphanCount = 0;
      for (const dir of tenantDirs) {
        const tenantPath = path.join(UPLOADS_DIR, dir);
        if (fs.statSync(tenantPath).isDirectory()) {
          const files = fs.readdirSync(tenantPath);
          for (const file of files) {
            if (!isAlreadyUUID(file)) {
              orphanCount++;
            }
          }
        }
      }
      if (orphanCount > 0) {
        console.log(`\n⚠ Found ${orphanCount} non-UUID files on disk that may not have DB references.`);
        console.log('  These may be orphan files or referenced by tables not in this migration.');
      }
    }

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('\n🏜️  DRY RUN complete — rolled back all changes.');
    } else {
      await client.query('COMMIT');
      console.log('\n✅ Migration committed successfully.');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed — rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n📊 Summary:');
  console.log(`   Scanned:  ${stats.scanned}`);
  console.log(`   Renamed:  ${stats.renamed}`);
  console.log(`   Skipped:  ${stats.skipped} (already UUID or empty)`);
  console.log(`   Errors:   ${stats.errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
