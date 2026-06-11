const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:16183/railway',
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  const companyId = '10d7f367-faaf-4553-8c59-165caf150814'; // example
  const queries = [
    { name: 'companies', sql: "SELECT COUNT(*) as count FROM companies WHERE status IN ('Active', 'active')" },
    { name: 'users', sql: "SELECT COUNT(*) as count FROM users WHERE status IN ('Active', 'active') AND company_id IS NULL" },
    { name: 'invoices', sql: "SELECT COUNT(*) as count FROM proforma_invoices WHERE company_id IS NULL" },
    { name: 'revenue', sql: "SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices WHERE company_id IS NULL" },
    { name: 'openOrders', sql: "SELECT COUNT(*) as count FROM proforma_orders WHERE status NOT IN ('Completed', 'Locked', 'Deleted') AND company_id IS NULL" },
    { name: 'pendingQC', sql: "SELECT COUNT(*) as count FROM qc_records WHERE qc_status != 'Passed' AND company_id IS NULL" },
    { name: 'shipments', sql: "SELECT COUNT(*) as count FROM export_invoices WHERE status IN ('In Transit', 'Shipped', 'Active') AND company_id IS NULL" },
    { name: 'outstandingPayments', sql: "SELECT COUNT(*) as count FROM account_entries WHERE status IN ('Pending', 'Overdue') AND company_id IS NULL" },
    { name: 'pendingPI', sql: "SELECT COUNT(*) as count FROM proforma_invoices WHERE status IN ('Draft', 'Pending') AND company_id IS NULL" },
    { name: 'confirmedPI', sql: "SELECT COUNT(*) as count FROM proforma_invoices WHERE status = 'Approved' AND company_id IS NULL" },
    { name: 'pendingPO', sql: "SELECT COUNT(*) as count FROM proforma_orders WHERE status IN ('Draft', 'Pending') AND company_id IS NULL" },
    { name: 'confirmedPO', sql: "SELECT COUNT(*) as count FROM proforma_orders WHERE status = 'Approved' AND company_id IS NULL" },
    { name: 'readyPO', sql: "SELECT COUNT(*) as count FROM proforma_orders WHERE qc_status = 'Approved' AND company_id IS NULL" }
  ];

  for (const q of queries) {
    try {
      await pool.query(q.sql);
      console.log(`✅ ${q.name} passed`);
    } catch (e) {
      console.error(`❌ ${q.name} FAILED: ${e.message}`);
    }
  }
  
  // Test sales roles queries
  const salesQueries = [
    { name: 's_invoices', sql: "SELECT COUNT(*) as count FROM proforma_invoices WHERE status NOT IN ('Revised') AND company_id = $1", vals: [companyId] },
    { name: 's_leads', sql: 'SELECT COUNT(*) as count FROM leads WHERE company_id = $1', vals: [companyId] },
    { name: 's_clients', sql: 'SELECT COUNT(*) as count FROM clients WHERE company_id = $1', vals: [companyId] },
    { name: 's_revenue', sql: "SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices WHERE status != 'Revised' AND company_id = $1", vals: [companyId] },
    { name: 's_openOrders', sql: "SELECT COUNT(*) as count FROM proforma_orders WHERE status NOT IN ('Revised') AND company_id = $1", vals: [companyId] },
    { name: 's_pendingQC', sql: "SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1", vals: [companyId] },
    { name: 's_shipments', sql: "SELECT COUNT(*) as count FROM export_invoices WHERE status IN ('In Transit', 'Shipped', 'Active') AND company_id = $1", vals: [companyId] },
    { name: 's_outstanding', sql: "SELECT COUNT(*) as count FROM account_entries WHERE status IN ('Pending', 'Overdue') AND company_id = $1", vals: [companyId] },
    { name: 's_users', sql: "SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND status = 'Active'", vals: [companyId] },
    { name: 's_monthlyRev', sql: "SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM proforma_invoices WHERE status != 'Revised' AND company_id = $1 AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP)", vals: [companyId] }
  ];

  for (const q of salesQueries) {
    try {
      await pool.query(q.sql, q.vals);
      console.log(`✅ ${q.name} passed`);
    } catch (e) {
      console.error(`❌ ${q.name} FAILED: ${e.message}`);
    }
  }

  pool.end();
}

runTest();
