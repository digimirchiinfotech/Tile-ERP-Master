#!/bin/bash
# backup.sh - Disaster Recovery Backup Script
# Automatically detects all tenant databases and uploads to S3
# Requirements: pg_dump, aws-cli, node (for decrypting connection strings)

set -e

# Change to the directory where the script is located
cd "$(dirname "$0")"

# Load environment variables from .env
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="./temp_backups_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo "Starting backup process at $TIMESTAMP..."

# 1. Use Node.js to fetch all database connection strings securely, including decrypted passwords.
cat << 'EOF' > get_dbs.js
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

dotenv.config({ path: '../.env' });

// Simple decrypt function mimicking src/utils/encryption.js
const algorithm = 'aes-256-cbc';
const key = process.env.DB_ENCRYPTION_KEY || 'v6yB&E)H@McQfTjWnZr4u7x!A%C*F-Ja';
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text; // Return raw if decryption fails
  }
}

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tile_exporter_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function run() {
  try {
    // Master DB
    const mHost = process.env.DB_HOST || 'localhost';
    const mPort = process.env.DB_PORT || 5432;
    const mDb = process.env.DB_NAME || 'tile_exporter_crm';
    const mUser = process.env.DB_USER || 'postgres';
    const mPass = process.env.DB_PASSWORD || '';
    console.log(`${mDb}|postgresql://${mUser}:${mPass}@${mHost}:${mPort}/${mDb}`);

    // Tenant DBs
    const { rows } = await pool.query("SELECT db_name, db_host, db_port, db_user, db_password FROM companies WHERE status IN ('Active', 'active') AND db_name IS NOT NULL");
    
    for (const row of rows) {
      let pwd = decrypt(row.db_password);
      let host = row.db_host || mHost;
      let port = row.db_port || mPort;
      console.log(`${row.db_name}|postgresql://${row.db_user}:${pwd}@${host}:${port}/${row.db_name}`);
    }
  } catch (err) {
    console.error("Error fetching databases:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
EOF

echo "Fetching databases..."
DB_LIST=$(node get_dbs.js)
rm get_dbs.js

if [ -z "$DB_LIST" ]; then
  echo "Failed to fetch database list!"
  exit 1
fi

UPLOAD_COUNT=0
S3_BUCKET="${BACKUP_S3_BUCKET:-my-backup-bucket}"

# 2. Loop through each database, dump, compress, and upload
while IFS= read -r line; do
  # Format: db_name|connection_string
  DB_NAME=$(echo "$line" | cut -d'|' -f1)
  CONN_STR=$(echo "$line" | cut -d'|' -f2)
  
  FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
  FILEPATH="${BACKUP_DIR}/${FILENAME}"
  
  echo "Backing up ${DB_NAME}..."
  
  # Dump and compress
  pg_dump "$CONN_STR" | gzip > "$FILEPATH"
  
  # 3. Upload to S3
  echo "Uploading ${FILENAME} to S3..."
  aws s3 cp "$FILEPATH" "s3://${S3_BUCKET}/${FILENAME}"
  
  # Verify upload success
  if [ $? -eq 0 ]; then
    echo "Successfully uploaded ${FILENAME}."
    rm "$FILEPATH" # Delete local file after success
    UPLOAD_COUNT=$((UPLOAD_COUNT + 1))
  else
    echo "Error uploading ${FILENAME}!"
    # Handle failure (could trigger error email here)
  fi
  
done <<< "$DB_LIST"

# Clean up temp directory
rmdir "$BACKUP_DIR"

# 4. Send success email
echo "Sending notification email..."
cat << 'EOF' > send_email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  }
});

async function send() {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@tileexporter.com',
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `✅ Database Backup Successful - ${process.argv[2]}`,
      text: `Successfully backed up ${process.argv[3]} databases to S3 bucket ${process.argv[4]}.`
    });
    console.log('Email sent.');
  } catch (err) {
    console.error('Failed to send email:', err.message);
  }
}
send();
EOF

node send_email.js "$TIMESTAMP" "$UPLOAD_COUNT" "$S3_BUCKET"
rm send_email.js

echo "Backup process completed successfully."
