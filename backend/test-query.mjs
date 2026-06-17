import('./src/config/database.js').then(async db => {
  const result = await db.query("SELECT * FROM companies");
  const { getCompanyDatabase } = await import('./src/config/companyDatabaseRouter.js');
  
  for (const company of result.rows) {
    try {
      const pool = await getCompanyDatabase(company.id);
      const invoices = await pool.query("SELECT invoice_no, client_name, party_name FROM proforma_invoices WHERE client_name ILIKE '%NORD%' OR party_name ILIKE '%NORD%'");
      if (invoices.rows.length > 0) {
        console.log('Proforma Invoices for NORD in', company.name, invoices.rows);
      }
      
      const exports = await pool.query("SELECT invoice_no, client_name, party_name FROM export_invoices WHERE client_name ILIKE '%NORD%' OR party_name ILIKE '%NORD%'");
      if (exports.rows.length > 0) {
        console.log('Export Invoices for NORD in', company.name, exports.rows);
      }
    } catch (err) {}
  }
});
