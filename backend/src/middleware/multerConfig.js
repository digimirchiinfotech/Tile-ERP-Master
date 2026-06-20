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

import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import env from '../config/env.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// S3 Client configuration
const s3Config = process.env.AWS_ACCESS_KEY_ID ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
}) : null;

// Local fallback setup
const uploadsDir = join(__dirname, '../../', env.upload.dir || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage Configuration (S3 preferred, fallback to Disk)
const storage = s3Config ? multerS3({
  s3: s3Config,
  bucket: process.env.AWS_S3_BUCKET_NAME || 'tile-exporter-assets',
  acl: 'private', // Enforce private bucket objects for enterprise security
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
    const companyId = req.headers['x-company-id'] || req.headers['x-selected-company-id'] || 'system';
    cb(null, `tenant_${companyId}/${Date.now()}-${randomHex}${ext}`);
  }
}) : multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.headers['x-company-id'] || req.headers['x-selected-company-id'] || 'system';
    const tenantDir = join(uploadsDir, `tenant_${companyId}`);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
    const safeName = `${Date.now()}-${randomHex}${ext}`;
    cb(null, safeName);
  }
});

// SECURITY: Strict MIME-type whitelist for all uploaded files.
// Prevents executable/script upload disguised as allowed types.
const ALLOWED_MIMES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
};

const ALLOWED_ALL_MIMES = [
  ...ALLOWED_MIMES.image,
  ...ALLOWED_MIMES.document,
  ...ALLOWED_MIMES.spreadsheet
];

const fileFilter = (req, file, cb) => {
  // Image-only fields
  if (file.fieldname === 'coverImage' || file.fieldname === 'avatar') {
    if (ALLOWED_MIMES.image.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
  // PDF-only fields
  else if (file.fieldname === 'pdfFile') {
    if (ALLOWED_MIMES.document.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF is allowed.'));
    }
  }
  // Generic attachment fields — allow images, PDFs, and spreadsheets only
  else {
    if (ALLOWED_ALL_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(
        'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, XLS, XLSX, CSV.'
      ));
    }
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxSize || 10 * 1024 * 1024, // Default 10MB, configurable via MAX_FILE_SIZE
    files: 5 // SECURITY: Limit number of files per request to prevent DoS
  }
});

export default upload;
