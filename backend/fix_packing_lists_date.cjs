const pg = require('pg');

const localConfig = { host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' };
const prodConfig = { connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } };

const fixSql = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'packing_lists' AND column_name = 'date'
    ) THEN
      ALTER TABLE packing_lists ALTER COLUMN date DROP NOT NULL;
    END IF;
  END $$;
`;

async function fixDB(config, name) {
  const pool = new pg.Pool(config);
  try {
    console.log(`Connecting to ${name}...`);
    await pool.query(fixSql);
    console.log(`Successfully removed NOT NULL from packing_lists.date on ${name}.`);
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
