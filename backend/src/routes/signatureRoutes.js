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

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as signatureController from '../controllers/signatureController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply authentication and company filtering to ALL signature routes
router.use(authenticate, filterByCompany);

// ─── Multer for signature image uploads ──────────────────────────────────────

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.companyFilter || req.user?.companyId || 'unknown';
    const dir = path.join(__dirname, '../../uploads/signatures', companyId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z.]/g, '') || '.png';
    const name = `sig-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const signatureUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB hard limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, JPEG, WEBP are allowed for signatures.'));
    }
  }
});

// ─── Role guards ─────────────────────────────────────────────────────────────

// Only super_admin and company_admin can manage signatures
const adminOnly = requireRole('company_admin', 'super_admin');

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET active signature — all authenticated users (for display in documents)
router.get('/active', signatureController.getActiveSignature);

// GET all signatures for this company — admin only
router.get('/', adminOnly, signatureController.getAllSignatures);

// POST upload image signature — admin only
router.post(
  '/upload',
  adminOnly,
  signatureUpload.single('signature'),
  signatureController.uploadSignature
);

// POST save drawn (canvas) signature — admin only
router.post('/draw', adminOnly, signatureController.saveDrawnSignature);

// DELETE (deactivate) a signature — admin only
router.delete('/:id', adminOnly, signatureController.deleteSignature);

// PATCH activate a specific signature — admin only
router.patch('/:id/activate', adminOnly, signatureController.activateSignature);

export default router;
