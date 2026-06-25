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

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const ALGORITHM_LEGACY = 'aes-256-cbc';
const IV_LENGTH = 16;

// ─── Resolve Encryption Key ────────────────────────────────────────────────────
let ENCRYPTION_KEY;

const rawKey = process.env.DB_ENCRYPTION_KEY;

if (!rawKey) {
    console.error('\n⛔ CRITICAL: DB_ENCRYPTION_KEY is not set in environment variables!');
    console.error('⛔ A deterministic fallback key is being used — this is NOT secure for production.');
    console.error('⛔ Set DB_ENCRYPTION_KEY to a random 32-character string in Railway → Variables.\n');
    ENCRYPTION_KEY = crypto.createHash('sha256').update('tile-erp-fallback-key-not-secret').digest();
} else {
    const keyBytes = Buffer.from(rawKey);
    if (keyBytes.length !== 32) {
        console.warn(`\n⚠️  DB_ENCRYPTION_KEY is ${keyBytes.length} bytes — expected 32 bytes.`);
        console.warn('⚠️  The key will be padded/truncated to 32 bytes. Set a proper 32-byte key in production.\n');
        const fixedKey = Buffer.alloc(32);
        keyBytes.copy(fixedKey);
        ENCRYPTION_KEY = fixedKey;
    } else {
        ENCRYPTION_KEY = keyBytes;
    }
}

/**
 * Encrypts a string using AES-256-GCM
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(String(text), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    return `gcm:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
};

/**
 * Decrypts a string using AES-256-GCM (with fallback to legacy AES-256-CBC)
 */
export const decrypt = (text) => {
    if (!text) return null;
    try {
        if (text.startsWith('gcm:')) {
            const parts = text.split(':');
            const iv = Buffer.from(parts[1], 'base64');
            const authTag = Buffer.from(parts[2], 'base64');
            const content = parts[3];
            
            const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(content, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } else {
            // Legacy CBC decryption
            const textParts = text.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encryptedText = Buffer.from(textParts.join(':'), 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM_LEGACY, ENCRYPTION_KEY, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        }
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null;
    }
};

/**
 * Convenience method to encrypt object properties
 */
export const encryptObjectFields = (obj, fields) => {
  if (!obj) return obj;
  
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
};

/**
 * Convenience method to decrypt object properties
 */
export const decryptObjectFields = (obj, fields) => {
  if (!obj) return obj;
  
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null && typeof result[field] === 'string') {
      const decrypted = decrypt(result[field]);
      if (decrypted !== null) {
        result[field] = decrypted;
      }
    }
  }
  return result;
};
