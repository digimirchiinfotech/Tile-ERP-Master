const pg = require('pg');

const localConfig = { host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' };
const prodConfig = { connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } };

const createSql = `
  CREATE TABLE IF NOT EXISTS export_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_invoice_id UUID NOT NULL REFERENCES export_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    size VARCHAR(100),
    surface VARCHAR(100),
    thickness VARCHAR(50),
    total_pallets INTEGER,
    total_boxes INTEGER,
    box_weight NUMERIC(10, 2),
    sqm_auto NUMERIC(10, 2),
    rate NUMERIC(15, 2),
    amount NUMERIC(15, 2),
    net_weight NUMERIC(10, 2),
    gross_weight NUMERIC(10, 2),
    is_foc BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
  );
`;

async function fixDB(config, name) {
  const pool = new pg.Pool(config);
  try {
    console.log(`Connecting to ${name}...`);
    await pool.query(createSql);
    console.log(`Successfully ensured export_invoice_lines exists on ${name}.`);
  } catch (err) {
    console.error(`Error on ${name}:`, err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  await fixDB(localConfig, 'LOCAL');
  await fixDB(prodConfig, 'PROD (Railway)');
}

run();
