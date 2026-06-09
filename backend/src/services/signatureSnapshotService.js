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
 * signatureSnapshotService.js
 *
 * Called at document creation time (lock moment) to freeze the company's
 * active digital signature into the document record.
 *
 * This follows the exact same architecture as documentSnapshotService.js:
 * - Once captured, the snapshot is immutable in the document's JSONB field
 * - Even if the company updates its signature later, old locked documents
 *   continue showing the signature that was active at the time of creation
 */

/**
 * Capture the active signature for a company at document lock time.
 *
 * @param {object} db  - Tenant database connection (req.db)
 * @param {string} companyId - The tenant company UUID
 * @returns {object|null} Snapshot object or null if no active signature exists
 */
export const captureSignatureSnapshot = async (db, companyId) => {
  try {
    // Ensure the table exists before querying (self-healing)
    await ensureSignatureTable(db);

    const result = await db.query(
      `SELECT id, signature_path, signature_type, signatory_name, updated_at
       FROM company_signatures
       WHERE company_id = $1 AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [companyId]
    );

    if (!result.rows.length) return null;

    const row = result.rows[0];
    return {
      signature_id:   row.id,
      signature_url:  row.signature_path,
      signature_type: row.signature_type,   // 'upload' | 'draw'
      signatory_name: row.signatory_name || 'AUTHORIZED SIGNATORY',
      captured_at:    new Date().toISOString(),
    };
  } catch (err) {
    // Non-fatal: signature snapshot failure must NOT block document creation
    console.warn('[SignatureSnapshot] Could not capture signature snapshot:', err.message);
    return null;
  }
};

/**
 * Ensure the company_signatures table exists in the tenant DB.
 * This is a lightweight self-healing guard — runs only if the column is missing.
 */
export const ensureSignatureTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_signatures (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id       UUID NOT NULL,
      signature_type   VARCHAR(10) NOT NULL DEFAULT 'upload'
                         CHECK (signature_type IN ('upload', 'draw')),
      signature_path   TEXT NOT NULL,
      signatory_name   VARCHAR(255) DEFAULT 'AUTHORIZED SIGNATORY',
      is_active        BOOLEAN DEFAULT TRUE,
      created_by       UUID,
      updated_by       UUID,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_company_signatures_company_active
    ON company_signatures(company_id, is_active)
  `);
};
