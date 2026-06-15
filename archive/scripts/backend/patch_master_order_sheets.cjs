const pg = require('pg');

// Choose which database to connect to. We'll patch both just to be safe.
const livePool = new pg.Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/railway', ssl: { rejectUnauthorized: false } });
const localPool = new pg.Pool({ host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' });

const alterQuery = `
  ALTER TABLE master_order_sheet_lines
  ADD COLUMN IF NOT EXISTS qc_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS shade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS caliber VARCHAR(100),
  ADD COLUMN IF NOT EXISTS grade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS boxes_required INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boxes_produced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pallets_required INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pallets_produced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_production_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factory_allocated_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_completed_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qc_approved_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ready_for_packing_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packed_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loaded_boxes NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_progress_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS factory_notes TEXT,
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS tile_category VARCHAR(100);
`;

async function patchPool(pool, name) {
  try {
    console.log(`Patching ${name}...`);
    await pool.query(alterQuery);
    console.log(`${name} patched successfully!`);
  } catch(e) {
    console.error(`Error patching ${name}:`, e.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  await patchPool(livePool, 'LIVE DB');
  await patchPool(localPool, 'LOCAL DB');
}
run();
