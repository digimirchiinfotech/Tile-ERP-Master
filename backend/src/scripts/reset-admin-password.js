/**
 * Resets the super-admin password to a cryptographically strong value.
 * Run: npm run security:reset-admin-password
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;

const generateStrongPassword = () => {
  const base = crypto.randomBytes(12).toString('base64url');
  return `Tx!${base}9`;
};

const run = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tile_exporter_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  const email = process.argv[2] || 'admin@admin.com';
  const newPassword = process.argv[3] || generateStrongPassword();
  const hash = await bcrypt.hash(newPassword, 12);

  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE
    `);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
       WHERE email_id = $2 AND role = 'super_admin'
       RETURNING email_id, role`,
      [hash, email]
    );

    if (result.rows.length === 0) {
      console.error(`No super_admin user found with email: ${email}`);
      process.exit(1);
    }

    console.log('\n✅ Super admin password reset successfully');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  Store this password securely. It will not be shown again.\n');
  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Password reset failed:', err.message);
  process.exit(1);
});
