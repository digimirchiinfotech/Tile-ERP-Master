import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const execAsync = promisify(exec);

// Railway database URL format: postgresql://postgres:password@host:port/railway
const dbUrl = process.env.DATABASE_URL;

const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY;

if (!dbUrl) {
  console.error('DATABASE_URL is not set. Cannot run restore.');
  process.exit(1);
}

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('BACKUP_ENCRYPTION_KEY or DB_ENCRYPTION_KEY is required and must be at least 32 characters.');
  process.exit(1);
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY).slice(0, 32);

async function runRestore() {
  const encFile = process.argv[2];
  
  if (!encFile) {
    console.error('Usage: node restore.js <path-to-encrypted-backup.sql.enc>');
    process.exit(1);
  }

  const resolvedEncFile = path.resolve(process.cwd(), encFile);
  const dumpFile = resolvedEncFile.replace('.enc', '.decrypted.sql');

  try {
    console.log(`Starting restore from: ${resolvedEncFile}`);
    
    // 1. Read encrypted file
    const encryptedData = await fs.readFile(resolvedEncFile);
    
    // Extract IV (first 16 bytes)
    const iv = encryptedData.slice(0, 16);
    const ciphertext = encryptedData.slice(16);

    // 2. Decrypt
    console.log('Decrypting backup...');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    
    await fs.writeFile(dumpFile, decrypted);
    console.log(`Decrypted backup temporarily saved to: ${dumpFile}`);

    // 3. psql restore
    console.log('Restoring to database using psql...');
    // Note: psql must be installed on the machine running this
    await execAsync(`psql "${dbUrl}" -f "${dumpFile}"`);
    console.log('Database restore completed successfully.');

    // 4. Cleanup
    await fs.unlink(dumpFile);
    console.log('Decrypted dump removed.');

    console.log('✅ Restore process completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    
    // Try to cleanup on failure
    try {
      await fs.unlink(dumpFile);
    } catch(e) {}
    
    process.exit(1);
  }
}

runRestore();
