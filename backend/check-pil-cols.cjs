const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });

async function run() {
  try {
    // Check proforma_invoice_lines columns
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'proforma_invoice_lines'
      ORDER BY ordinal_position;
    `);
    console.log('PROFORMA_INVOICE_LINES COLUMNS:');
    res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    // Check specific columns that the controller tries to use
    const checkCols = ['product_type', 'sanitaryware_product_id', 'model_no', 'category', 'color', 'pieces', 'cartons', 'cbm', 'is_foc'];
    console.log('\nMISSING COLUMNS CHECK:');
    for (const col of checkCols) {
      const found = res.rows.find(r => r.column_name === col);
      if (!found) console.log(`  MISSING: ${col}`);
      else console.log(`  OK: ${col}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
run();
