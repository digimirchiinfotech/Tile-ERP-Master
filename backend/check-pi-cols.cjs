const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });

async function run() {
  try {
    // Check what columns exist in proforma_invoices
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'proforma_invoices'
      ORDER BY ordinal_position;
    `);
    console.log('PROFORMA_INVOICES COLUMNS:');
    res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    // Check specific columns that the controller tries to use
    const checkCols = ['lc_number', 'lc_date', 'epcg_no', 'boxes_marking', 'box_type', 'fumigation', 'legalisation', 'other_instructions', 'pallet_type', 'tiles_back', 'tariff_code', 'supplier_details', 'pre_carriage_by', 'place_of_receipt', 'bl_no', 'bl_date', 'vessel_flight_no', 'sb_no', 'sb_date', 'exchange_rate'];
    console.log('\nMISSING COLUMNS CHECK:');
    for (const col of checkCols) {
      const found = res.rows.find(r => r.column_name === col);
      if (!found) console.log(`  MISSING: ${col}`);
      else console.log(`  OK: ${col}`);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
