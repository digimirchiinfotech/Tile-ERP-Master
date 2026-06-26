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

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change-this-in-production') {
    if (process.env.NODE_ENV === 'production') {
      // Log critical error but don't exit — crashing causes 502 with no useful error in Railway
      const generated = 'prod-fallback-' + crypto.randomBytes(32).toString('hex');
      console.error('⛔ CRITICAL: JWT_SECRET env var is not set in production!');
      console.error('⛔ A temporary secret has been generated but WILL CHANGE on every restart,');
      console.error('⛔ invalidating all existing sessions. Set JWT_SECRET in Railway env vars NOW.');
      return generated;
    }
    console.warn('⚠️  Using default JWT secret - set JWT_SECRET in production');
    return 'dev-jwt-secret-' + crypto.randomBytes(16).toString('hex');
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    return getJWTSecret() + '-refresh';
  }
  return secret;
};

export default {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tile_exporter_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  jwt: {
    secret: getJWTSecret(),
    refreshSecret: getRefreshSecret(),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '360m',  // 6 hours
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',  // 7 days (DB-enforced; JWT expiry not used for refresh tokens)
  },
  
  resetToken: {
    expiry: process.env.RESET_TOKEN_EXPIRY || '1h',
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },
  
  frontend_url: process.env.FRONTEND_URL || 'https://' + (process.env.REPL_SLUG || 'tile-exporter') + '.' + (process.env.REPL_OWNER || 'user') + '.repl.co',
  
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    dir: process.env.UPLOAD_DIR || 'uploads',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxFiles: 10,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '1', 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15', 10) * 60 * 1000,
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },
  
  logLevel: process.env.LOG_LEVEL || 'info',
};
