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
const backupDir = path.resolve(process.cwd(), 'backups');

const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY;

if (!dbUrl) {
  console.error('DATABASE_URL is not set. Cannot run backup.');
  process.exit(1);
}

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('BACKUP_ENCRYPTION_KEY or DB_ENCRYPTION_KEY is required and must be at least 32 characters.');
  process.exit(1);
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY).slice(0, 32);

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch (err) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpFile = path.join(backupDir, `db-backup-${timestamp}.sql`);
  const encFile = `${dumpFile}.enc`;

  try {
    console.log(`Starting database backup: ${timestamp}`);
    await ensureDir(backupDir);

    // 1. pg_dump
    console.log('Running pg_dump...');
    await execAsync(`pg_dump "${dbUrl}" -F p -f "${dumpFile}"`);
    console.log('pg_dump completed.');

    // 2. Encrypt the backup
    console.log('Encrypting backup...');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    
    const inputData = await fs.readFile(dumpFile);
    const encrypted = Buffer.concat([iv, cipher.update(inputData), cipher.final()]);
    
    await fs.writeFile(encFile, encrypted);
    console.log(`Encrypted backup saved to: ${encFile}`);

    // 3. Cleanup unencrypted SQL file
    await fs.unlink(dumpFile);
    console.log('Unencrypted dump removed.');

    // 4. (Optional) Upload to S3 if credentials exist
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      console.log('Uploading to S3...');
      // Minimal S3 implementation using AWS CLI if installed, or recommend SDK usage
      try {
        await execAsync(`aws s3 cp "${encFile}" "s3://${process.env.AWS_S3_BUCKET}/backups/${path.basename(encFile)}"`);
        console.log('Upload to S3 successful.');
      } catch (awsError) {
        console.warn('AWS CLI S3 upload failed (is AWS CLI installed?):', awsError.message);
        console.log('Alternatively, you can implement AWS SDK upload here.');
      }
    } else {
      console.log('AWS S3 credentials not found. Skipping S3 upload.');
    }

    console.log('✅ Backup process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

runBackup();
