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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as auditService from '../services/auditService.js';
import { ensureSignatureTable } from '../services/signatureSnapshotService.js';
import { debugLogger } from '../utils/debugLogger.js';
import notificationService from '../services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const getSignatureDir = (companyId) => {
  const safeCompanyId = companyId || 'unknown';
  const dir = path.join(__dirname, '../../uploads/signatures', safeCompanyId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ─── GET ACTIVE SIGNATURE ─────────────────────────────────────────────────────

export const getActiveSignature = async (req, res) => {
  try {
    const safeCompanyId = req.companyFilter || req.user?.companyId || null;
    await ensureSignatureTable(req.db);

    const result = await req.db.query(
      `SELECT id, company_id, signature_type, signature_path, signatory_name,
              is_active, created_by, updated_by, created_at, updated_at
       FROM company_signatures
       WHERE company_id = $1 AND is_active = TRUE
       ORDER BY updated_at DESC LIMIT 1`,
      [safeCompanyId]
    );

    if (!result.rows.length) {
      return res.json({ success: true, data: null, message: 'No active signature found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    debugLogger.error('getActiveSignature error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch signature' });
  }
};

// ─── GET ALL SIGNATURES ───────────────────────────────────────────────────────

export const getAllSignatures = async (req, res) => {
  try {
    const safeCompanyId = req.companyFilter || req.user?.companyId || null;
    await ensureSignatureTable(req.db);

    const result = await req.db.query(
      `SELECT id, company_id, signature_type, signature_path, signatory_name,
              is_active, created_by, updated_by, created_at, updated_at
       FROM company_signatures
       WHERE company_id = $1
       ORDER BY updated_at DESC`,
      [safeCompanyId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    debugLogger.error('getAllSignatures error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch signatures' });
  }
};

// ─── UPLOAD SIGNATURE (image file) ───────────────────────────────────────────

export const uploadSignature = async (req, res) => {
  try {
    await ensureSignatureTable(req.db);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate MIME type
    if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PNG, JPG, JPEG, WEBP allowed.'
      });
    }

    // Validate size (also enforced by multer, but double-check)
    if (req.file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 2 MB.'
      });
    }

    const signatoryName = (req.body.signatory_name || 'AUTHORIZED SIGNATORY').toUpperCase();
    const safeCompanyId = req.companyFilter || req.user?.companyId || null;

    if (!safeCompanyId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Please select a company context first.' });
    }

    const signaturePath = req.file.location || `/uploads/signatures/${safeCompanyId}/${req.file.filename}`;

    await req.db.query('BEGIN');

    // Deactivate any existing active signature
    await req.db.query(
      `UPDATE company_signatures SET is_active = FALSE, updated_at = NOW()
       WHERE company_id = $1 AND is_active = TRUE`,
      [safeCompanyId]
    );

    // Insert new active signature
    const result = await req.db.query(
      `INSERT INTO company_signatures
         (company_id, signature_type, signature_path, signatory_name, is_active, created_by, updated_by)
       VALUES ($1, 'upload', $2, $3, TRUE, $4, $4)
       RETURNING *`,
      [safeCompanyId, signaturePath, signatoryName, req.user?.id || null]
    );

    await req.db.query('COMMIT');

    // Audit log
    await auditService.logAction({
      userId: req.user.id,
      companyId: req.companyFilter,
      action: 'SIGNATURE_UPLOADED',
      entityType: 'COMPANY_SIGNATURE',
      entityId: result.rows[0].id,
      details: { signatory_name: signatoryName, signature_type: 'upload' },
      ipAddress: req.ip
    }, req.db);

    // Notify company admin + export team
    await _sendSignatureNotification(req.db, req.companyFilter, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Signature uploaded and activated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    debugLogger.error('uploadSignature error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload signature' });
  }
};

// ─── SAVE DRAWN SIGNATURE (canvas base64) ────────────────────────────────────

export const saveDrawnSignature = async (req, res) => {
  try {
    const safeCompanyId = req.companyFilter || req.user?.companyId || null;
    if (!safeCompanyId) {
      return res.status(400).json({ success: false, message: 'Please select a company context first.' });
    }

    await ensureSignatureTable(req.db);

    const { signature_data, signatory_name } = req.body;

    if (!signature_data || !signature_data.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature data. Expected base64 image string.'
      });
    }

    // Extract base64 content
    const base64Match = signature_data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ success: false, message: 'Malformed base64 image data' });
    }

    const imageBuffer = Buffer.from(base64Match[2], 'base64');

    // Validate drawn signature is not empty (all white/transparent)
    // A completely empty 600x200 PNG is about 82 bytes. A small dot is > 150 bytes.
    if (imageBuffer.length < 150) {
      return res.status(400).json({
        success: false,
        message: 'Signature canvas appears to be empty. Please draw a signature first.'
      });
    }

    // Save to disk
    const sigDir = getSignatureDir(safeCompanyId);
    const filename = `drawn-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(sigDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    const signatoryName = (signatory_name || 'AUTHORIZED SIGNATORY').toUpperCase();
    const signaturePath = `/uploads/signatures/${safeCompanyId || 'unknown'}/${filename}`;

    await req.db.query('BEGIN');

    if (safeCompanyId) {
      // Deactivate previous
      await req.db.query(
        `UPDATE company_signatures SET is_active = FALSE, updated_at = NOW()
         WHERE company_id = $1 AND is_active = TRUE`,
        [safeCompanyId]
      );
    }

    // Insert new
    const result = await req.db.query(
      `INSERT INTO company_signatures
         (company_id, signature_type, signature_path, signatory_name, is_active, created_by, updated_by)
       VALUES ($1, 'draw', $2, $3, TRUE, $4, $4)
       RETURNING *`,
      [safeCompanyId, signaturePath, signatoryName, req.user?.id || null]
    );

    await req.db.query('COMMIT');

    // Audit log
    await auditService.logAction({
      userId: req.user.id,
      companyId: safeCompanyId,
      action: 'SIGNATURE_DRAWN',
      entityType: 'COMPANY_SIGNATURE',
      entityId: result.rows[0].id,
      details: { signatory_name: signatoryName, signature_type: 'draw' },
      ipAddress: req.ip
    }, req.db);

    await _sendSignatureNotification(req.db, safeCompanyId, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Drawn signature saved and activated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    debugLogger.error('saveDrawnSignature error:', error);
    try {
      fs.writeFileSync(path.join(__dirname, '../../error_sig.txt'), error.stack || error.message);
    } catch(e) {}
    res.status(500).json({ success: false, message: 'Failed to save drawn signature', details: error.message });
  }
};

// ─── DELETE SIGNATURE ─────────────────────────────────────────────────────────

export const deleteSignature = async (req, res) => {
  try {
    await ensureSignatureTable(req.db);
    const { id } = req.params;

    const existing = await req.db.query(
      `SELECT * FROM company_signatures WHERE id = $1 AND company_id = $2`,
      [id, req.companyFilter]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Signature not found' });
    }

    // Soft delete: set is_active = FALSE
    await req.db.query(
      `UPDATE company_signatures SET is_active = FALSE, updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [req.user.id, id, req.companyFilter]
    );

    await auditService.logAction({
      userId: req.user.id,
      companyId: req.companyFilter,
      action: 'SIGNATURE_DELETED',
      entityType: 'COMPANY_SIGNATURE',
      entityId: id,
      details: { old_path: existing.rows[0].signature_path },
      ipAddress: req.ip
    }, req.db);

    res.json({ success: true, message: 'Signature deactivated successfully' });
  } catch (error) {
    debugLogger.error('deleteSignature error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete signature' });
  }
};

// ─── ACTIVATE SIGNATURE ───────────────────────────────────────────────────────

export const activateSignature = async (req, res) => {
  try {
    await ensureSignatureTable(req.db);
    const { id } = req.params;

    const existing = await req.db.query(
      `SELECT * FROM company_signatures WHERE id = $1 AND company_id = $2`,
      [id, req.companyFilter]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Signature not found' });
    }

    await req.db.query('BEGIN');

    // Deactivate all others
    await req.db.query(
      `UPDATE company_signatures SET is_active = FALSE, updated_at = NOW()
       WHERE company_id = $1`,
      [req.companyFilter]
    );

    // Activate selected
    const result = await req.db.query(
      `UPDATE company_signatures
       SET is_active = TRUE, updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [req.user.id, id, req.companyFilter]
    );

    await req.db.query('COMMIT');

    await auditService.logAction({
      userId: req.user.id,
      companyId: req.companyFilter,
      action: 'SIGNATURE_ACTIVATED',
      entityType: 'COMPANY_SIGNATURE',
      entityId: id,
      details: {},
      ipAddress: req.ip
    }, req.db);

    res.json({
      success: true,
      message: 'Signature activated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await req.db.query('ROLLBACK');
    debugLogger.error('activateSignature error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate signature' });
  }
};

// ─── Internal: send notification ─────────────────────────────────────────────

const _sendSignatureNotification = async (db, companyId, userId) => {
  try {
    await notificationService.createSystemNotification(db, {
      companyId,
      userId,
      title: 'Digital Signature Updated',
      message: 'Digital Signature Updated Successfully. All new export documents will use the updated signature. Previously locked documents remain unchanged.',
      type: 'info',
      targetRoles: ['company_admin', 'export_documents', 'administration']
    });
  } catch (err) {
    // Non-fatal
    debugLogger.warn('Signature notification failed:', err.message);
  }
};
