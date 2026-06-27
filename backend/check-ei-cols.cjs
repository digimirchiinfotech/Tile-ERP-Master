const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'export_invoices'
      ORDER BY ordinal_position;
    `);
    console.log('EXPORT_INVOICES COLUMNS:');
    res.rows.forEach(r => console.log(`  ${r.column_name}`));

    // Check specific fields the frontend needs
    const checkCols = ['lc_number','lc_date','epcg_no','fumigation','legalisation','other_instructions',
      'pallet_type','tiles_back','boxes_marking','box_type','pre_carriage_by','place_of_receipt',
      'vessel_flight_no','sb_no','sb_date','exchange_rate','supply_declaration','ftp_declaration',
      'updated_by','deleted_at'];
    console.log('\nMISSING COLUMNS CHECK:');
    for (const col of checkCols) {
      const found = res.rows.find(r => r.column_name === col);
      if (!found) console.log(`  MISSING: ${col}`);
      else console.log(`  OK: ${col}`);
    }
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
}
run();
