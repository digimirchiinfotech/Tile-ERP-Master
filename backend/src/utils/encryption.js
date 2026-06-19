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
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('\n❌ CRITICAL ERROR: DB_ENCRYPTION_KEY environment variable is not defined!');
    console.error('Please configure DB_ENCRYPTION_KEY in your .env file.\n');
    process.exit(1);
}

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
    console.error('\n❌ CRITICAL ERROR: DB_ENCRYPTION_KEY must be exactly 32 bytes (characters) long!');
    console.error(`Current key length: ${Buffer.from(ENCRYPTION_KEY).length} bytes.\n`);
    process.exit(1);
}

const IV_LENGTH = 16;

/**
 * Encrypts a string using AES-256-CBC
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
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
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null;
    }
};
