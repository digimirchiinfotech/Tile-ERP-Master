import dotenv from 'dotenv';
dotenv.config();
import pool, { query } from './src/config/database.js';

async function run() {
  const companyId = 'd142b795-74e5-469e-bc1e-84f8e85ceb7b';
  const client = await pool.connect();

  try {
    console.log('--- REPRODUCING DUPLICATE IMPORT BUG ---');

    // 1. Clear existing temp test products
    await client.query("DELETE FROM products WHERE product_code = 'PROD-TEST-BUG'");

    // 2. Insert test product with Name = 'Dev test' and company_product_name = 'Dev test'
    await client.query(
      `INSERT INTO products (company_id, product_code, name, company_product_name, factory_name, factory_product_name, category, status)
       VALUES ($1, 'PROD-TEST-BUG', 'Dev test', 'Dev test', 'Simpolo', 'Demo dev', 'Tiles', 'Active')`,
      [companyId]
    );
    console.log('Inserted test product into database.');

    // 3. Fetch from DB (same as validateImport)
    const dbResult = await client.query(
      `SELECT id, product_code, item_ref, sku, name, company_product_name, factory_name, factory_product_name 
       FROM products 
       WHERE company_id = $1 AND status != 'Deleted'`,
      [companyId]
    );
    const dbProducts = dbResult.rows;
    console.log(`Fetched ${dbProducts.length} active products from database.`);

    // 4. Normalize function
    const normalizeVal = (val) => String(val || '').trim().replace(/\s+/g, ' ').toUpperCase();

    // 5. Build lookup maps
    const dbProductCodeMap = new Map();
    const dbComboMap = new Map();

    dbProducts.forEach(p => {
      const code = normalizeVal(p.product_code);
      const itemRef = normalizeVal(p.item_ref);
      const sku = normalizeVal(p.sku);
      const fName = normalizeVal(p.factory_name);
      const fpName = normalizeVal(p.factory_product_name);
      const pName = normalizeVal(p.name);
      const cpName = normalizeVal(p.company_product_name);

      if (code) dbProductCodeMap.set(code, p);
      if (itemRef) dbProductCodeMap.set(itemRef, p);
      if (sku) dbProductCodeMap.set(sku, p);

      if (pName) {
        const comboKey = `${fName}|||${fpName}|||${pName}`;
        dbComboMap.set(comboKey, p);
      }
      if (cpName) {
        const comboKey = `${fName}|||${fpName}|||${cpName}`;
        dbComboMap.set(comboKey, p);
      }
    });

    console.log('Lookup Map Keys:', Array.from(dbComboMap.keys()));

    // 6. Test incoming row
    const testProducts = [
      {
        "Factory Name": "Simpolo",
        "Factory Product Name": "Demo dev",
        "Product Name": "Dev test",
        "Category": "Tiles"
      }
    ];

    testProducts.forEach((prod, index) => {
      const rawProductCode = prod.productCode || prod['Product Code'] || prod.product_code || prod.itemRef || prod.item_ref || '';
      const rawSku = prod.sku || prod.SKU || '';
      const rawName = prod.name || prod['Product Name'] || prod.companyProductName || prod['Company Product Name'] || '';
      const rawFactoryName = prod.factoryName || prod['Factory Name'] || prod.factory_name || '';
      const rawFactoryProductName = prod.factoryProductName || prod['Factory Product Name'] || prod.factory_product_name || '';
      const rawCategory = prod.category || prod['Category'] || '';

      const productCode = normalizeVal(rawProductCode);
      const sku = normalizeVal(rawSku);
      const name = normalizeVal(rawName);
      const factoryName = normalizeVal(rawFactoryName);
      const factoryProductName = normalizeVal(rawFactoryProductName);

      const comboKey = `${factoryName}|||${factoryProductName}|||${name}`;
      console.log(`Incoming row normalized name: "${name}", factoryName: "${factoryName}", factoryProductName: "${factoryProductName}"`);
      console.log(`Incoming comboKey: "${comboKey}"`);
      
      const existsInMap = dbComboMap.has(comboKey);
      console.log(`Exists in combo map? ${existsInMap}`);

      // Let's print out exact string matches to see if there is any mismatch
      dbComboMap.forEach((v, k) => {
        console.log(`Comparing against key: "${k}"`);
        console.log(`  Length key: ${k.length}, length comboKey: ${comboKey.length}`);
        console.log(`  Exact equal? ${k === comboKey}`);
      });
    });

    // Cleanup
    await client.query("DELETE FROM products WHERE product_code = 'PROD-TEST-BUG'");
    console.log('Cleanup completed.');

  } catch (e) {
    console.error('Error running simulation:', e);
  } finally {
    client.release();
    process.exit(0);
  }
}

run().catch(console.error);
