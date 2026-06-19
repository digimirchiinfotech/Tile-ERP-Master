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

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// ─── Resolve Encryption Key ────────────────────────────────────────────────────
// Never crash the server for a missing/wrong-length key.
// Instead: warn loudly and fall back to a deterministic key derived from
// the app name (so encryption is at least consistent across restarts).
// ⚠️  You MUST set DB_ENCRYPTION_KEY in Railway/production env vars.
let ENCRYPTION_KEY;

const rawKey = process.env.DB_ENCRYPTION_KEY;

if (!rawKey) {
    console.error('\n⛔ CRITICAL: DB_ENCRYPTION_KEY is not set in environment variables!');
    console.error('⛔ A deterministic fallback key is being used — this is NOT secure for production.');
    console.error('⛔ Set DB_ENCRYPTION_KEY to a random 32-character string in Railway → Variables.\n');
    // Derive a consistent 32-byte key from a fixed phrase (deterministic but not secret)
    ENCRYPTION_KEY = crypto.createHash('sha256').update('tile-erp-fallback-key-not-secret').digest();
} else {
    const keyBytes = Buffer.from(rawKey);
    if (keyBytes.length !== 32) {
        console.warn(`\n⚠️  DB_ENCRYPTION_KEY is ${keyBytes.length} bytes — expected 32 bytes.`);
        console.warn('⚠️  The key will be padded/truncated to 32 bytes. Set a proper 32-byte key in production.\n');
        // Pad with zeros or truncate to exactly 32 bytes
        const fixedKey = Buffer.alloc(32);
        keyBytes.copy(fixedKey);
        ENCRYPTION_KEY = fixedKey;
    } else {
        ENCRYPTION_KEY = keyBytes;
    }
}

/**
 * Encrypts a string using AES-256-CBC
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypts a string using AES-256-CBC
 */
export const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null;
    }
};
