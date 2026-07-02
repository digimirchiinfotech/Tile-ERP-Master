const jwt = require('jsonwebtoken');
const secret = '9a9ca4445bcffe2f2bd8c5ce2a9a14951ad5749db7dbe45ced6c37a3d8bc90e951fe1a17f990679f7b3c7c44b1b6ba1107fbe6ced1a35444ffff02485f47093f';

async function testEndpoints(userId, role, companyId) {
  const token = jwt.sign({ id: userId, role, type: 'access', companyId }, secret, { expiresIn: '1h' });
  
  const endpoints = [
    { name: 'Packing Lists',        url: 'http://localhost:8000/api/packing-lists' },
    { name: 'Export Invoices',      url: 'http://localhost:8000/api/export-invoices' },
    { name: 'Master Data (ports)',  url: 'http://localhost:8000/api/master-data/ports' },
    { name: 'Inventory Warehouses', url: 'http://localhost:8000/api/inventory/warehouses' },
    { name: 'Inventory Stock',      url: 'http://localhost:8000/api/inventory/stock-balance' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-company-id': companyId
        }
      });
      const text = await res.text();
      const parsed = JSON.parse(text);
      console.log(`[${res.status}] ${ep.name}:`, parsed.success ? '✅ OK' : `❌ ${parsed.message}`);
    } catch (e) {
      console.log(`[ERR] ${ep.name}:`, e.message);
    }
  }
}

// Test with super_admin (no companyId)
testEndpoints('3ace99f5-9ec5-4a30-8728-f325adb551d5', 'super_admin', '28b71bfe-06ef-443b-a73c-8690fca3ac70');
