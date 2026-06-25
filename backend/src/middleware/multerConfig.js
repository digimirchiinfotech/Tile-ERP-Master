import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import env from '../config/env.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
const uploadsDir = join(__dirname, '../../', env.upload?.dir || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration Profiles for strict validation
const UPLOAD_PROFILES = {
  PRODUCT_IMAGE: {
    maxSize: 5 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp']
  },
  QC_PHOTO: {
    maxSize: 10 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png']
  },
  DOCUMENT: {
    maxSize: 20 * 1024 * 1024,
    allowedMimes: ['application/pdf', 'image/jpeg', 'image/png']
  },
  AVATAR_LOGO: {
    maxSize: 2 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
  },
  BACKUP: {
    maxSize: 500 * 1024 * 1024,
    allowedMimes: ['application/zip', 'application/x-zip-compressed', 'application/x-gzip']
  },
  DEFAULT: {
    maxSize: 10 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
  }
};

/**
 * Creates a configured multer instance based on the upload profile type
 * @param {'PRODUCT_IMAGE' | 'QC_PHOTO' | 'DOCUMENT' | 'AVATAR_LOGO' | 'BACKUP' | 'DEFAULT'} type
 */
export const createUpload = (type = 'DEFAULT') => {
  const profile = UPLOAD_PROFILES[type] || UPLOAD_PROFILES.DEFAULT;

  const storage = s3Config ? multerS3({
    s3: s3Config,
    bucket: process.env.AWS_S3_BUCKET_NAME || 'tile-exporter-assets',
    acl: 'private',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname, originalName: file.originalname });
    },
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
      const safeName = `${uuidv4()}${ext}`;
      const companyId = req.headers['x-company-id'] || req.headers['x-selected-company-id'] || 'system';
      cb(null, `tenant_${companyId}/${safeName}`);
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
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
      const safeName = `${uuidv4()}${ext}`;
      cb(null, safeName);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (profile.allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${type}. Allowed types: ${profile.allowedMimes.join(', ')}`));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: profile.maxSize,
      files: 5
    }
  });
};
