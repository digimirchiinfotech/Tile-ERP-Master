/**
 * seed_master_data.js
 * Seeds all master data tables in every tenant database with real-world
 * industry-standard data for a Tile / Ceramic Exporter ERP.
 * 
 * - Clears ONLY dummy/test data (rows added by users with "DEMO" in the value)
 * - Inserts industry-standard defaults if table is empty
 * - Skips if real data already exists
 * - Run: node seed_master_data.js
 */

import pg from 'pg';
const { Pool } = pg;
import { Country, City } from 'country-state-city';

const ROOT_POOL = new Pool({ host: 'localhost', port: 5432, database: 'postgres', user: 'postgres', password: '442277' });

// ────────────────────────────────────────────────────────────
// REAL INDUSTRY DATA
// ────────────────────────────────────────────────────────────

const SEED_DATA = {
  tariff_codes: {
    column: 'code',
    rows: [

    ]
  },
  pallet_types: {
    column: 'type',
    rows: [
      'Normal Wooden Pallet',
      'Euro Pallet (EPAL)',
      'Heat Treated Pallet (HT)',
      'Fumigated Wooden Pallet',
      'Plastic Pallet',
      'Without Pallet',
      'Custom Pallet',
    ]
  },
  tiles_back_marking: {
    column: 'marking',
    rows: [
      'WITH MADE IN INDIA',
      'WITHOUT MADE IN INDIA',
      'MADE IN INDIA',
    ]
  },
  boxes_marking: {
    column: 'marking',
    rows: [
      'WITH',
      'WITHOUT',
      'CUSTOM',
    ]
  },
  box_types: {
    column: 'type',
    rows: [
      'NON BRANDED BOXES',
      'BRANDED BOXES',
      'Brown Kraft Box',
      'Corrugated Box',
      'Custom Printed Box',
    ]
  },
  payment_terms: {
    column: 'term',
    rows: [
      '100% Advance',
      '50% Advance & 50% Against BL Copy',
      '30% Advance & 70% Against BL Copy',
      '25% Advance & 75% Against BL Copy',
      '100% LC at Sight',
    ]
  },
  delivery_terms: {
    column: 'term',
    rows: [
      'FOB',
      'CIF',
      'CFR',

    ]
  },
  ports_of_loading: {
    column: 'name',
    rows: [
      'MUNDRA PORT',
      'KANDLA PORT',
    ]
  },
  ports_of_discharge: {
    column: 'name',
    rows: [

    ]
  },
  final_destinations: {
    column: 'destination',
    rows: [

    ]
  },
  shipping_lines: {
    column: 'name',
    rows: [

    ]
  },
  product_categories: {
    column: 'category',
    rows: [
      'Porcelain',
      'Ceramic',
      'Vitrified',
      'Glazed',
      'Full Body',
      'Double Charge',
      'Matt Finish',
      'Polished',
    ]
  },
  product_sizes: {
    column: 'size',
    rows: [

    ]
  },
  product_surfaces: {
    column: 'surface',
    rows: [

    ]
  },
  product_thickness: {
    column: 'thickness',
    rows: [

    ]
  },
  product_applications: {
    column: 'application',
    rows: [
      'Floor',
      'Wall',
      'Floor & Wall',
      'Outdoor',
      'Indoor',
      'Swimming Pool',
      'Kitchen',
      'Bathroom',
      'Living Room',
      'Staircase',
      'Facade',
      'Commercial',
    ]
  },
};

// ────────────────────────────────────────────────────────────

function isDummyValue(val) {
  const v = String(val || '').toUpperCase();
  const dummyKeywords = ['DEMO', 'TEST', 'SAMPLE', 'DUMMY', 'TEMP', 'PLACEHOLDER', 'XXX'];
  return dummyKeywords.some(k => v.includes(k));
}

async function seedCountriesAndCities(pool, dbName, companyId) {
  try {
    // Check if tables exist
    const existsRes = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='master_countries') as has_countries,
              EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='master_cities') as has_cities`
    );
    if (!existsRes.rows[0].has_countries || !existsRes.rows[0].has_cities) {
      console.log(`  [SKIP] master_countries/cities - tables do not exist`);
      return;
    }

    // Seed Countries if empty
    const cCountRes = await pool.query(`SELECT COUNT(*) FROM master_countries`);
    if (parseInt(cCountRes.rows[0].count) === 0) {
      console.log(`  [SEED] Seeding master_countries...`);
      const countries = Country.getAllCountries();
      let values = [];
      let params = [];
      let i = 1;
      let insertedCount = 0;
      for (const c of countries) {
        values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
        params.push(c.isoCode, c.name, c.region || '', c.isoCode, '');
        if (values.length >= 100) {
          await pool.query(`INSERT INTO master_countries (country_code, country_name, region, iso_alpha_2, iso_alpha_3) VALUES ${values.join(',')} ON CONFLICT (country_code) DO NOTHING`, params);
          insertedCount += values.length;
          values = [];
          params = [];
          i = 1;
        }
      }
      if (values.length > 0) {
        await pool.query(`INSERT INTO master_countries (country_code, country_name, region, iso_alpha_2, iso_alpha_3) VALUES ${values.join(',')} ON CONFLICT (country_code) DO NOTHING`, params);
        insertedCount += values.length;
      }
      console.log(`  [OK] master_countries: +${insertedCount} new rows`);
    }

    // Seed Cities if empty
    const ciCountRes = await pool.query(`SELECT COUNT(*) FROM master_cities`);
    if (parseInt(ciCountRes.rows[0].count) === 0) {
      console.log(`  [SEED] Seeding master_cities (this may take a moment)...`);
      
      const countriesRes = await pool.query(`SELECT id, country_code FROM master_countries`);
      const countryMap = {};
      countriesRes.rows.forEach(r => { countryMap[r.country_code] = r.id; });

      const cities = City.getAllCities();
      let values = [];
      let params = [];
      let i = 1;
      let insertedCount = 0;
      for (const c of cities) {
        const countryId = countryMap[c.countryCode];
        if (!countryId) continue;
        
        values.push(`($${i++}, $${i++}, $${i++})`);
        params.push(c.name, countryId, c.stateCode || '');
        if (values.length >= 2000) {
          await pool.query(`INSERT INTO master_cities (city_name, country_id, state_province) VALUES ${values.join(',')}`, params);
          insertedCount += values.length;
          values = [];
          params = [];
          i = 1;
        }
      }
      if (values.length > 0) {
        await pool.query(`INSERT INTO master_cities (city_name, country_id, state_province) VALUES ${values.join(',')}`, params);
        insertedCount += values.length;
      }
      console.log(`  [OK] master_cities: +${insertedCount} new rows`);
    }
  } catch (err) {
    console.log(`  [ERR] master_countries/cities: ${err.message}`);
  }
}

async function seedCurrencies(pool, dbName, companyId) {
  try {
    const existsRes = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='currencies') as has_currencies`
    );
    if (!existsRes.rows[0].has_currencies) {
      console.log(`  [SKIP] currencies - table does not exist`);
      return;
    }

    const cCountRes = await pool.query(`SELECT COUNT(*) FROM currencies`);
    if (parseInt(cCountRes.rows[0].count) === 0) {
      console.log(`  [SEED] Seeding currencies...`);
      const currencies = [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
        { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
        { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
        { code: 'SGD', symbol: '$', name: 'Singapore Dollar' }
      ];
      let insertedCount = 0;
      for (const c of currencies) {
        await pool.query(
          `INSERT INTO currencies (code, symbol, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
          [c.code, c.symbol, c.name]
        );
        insertedCount++;
      }
      console.log(`  [OK] currencies: +${insertedCount} new rows`);
    }
  } catch (err) {
    console.log(`  [ERR] currencies: ${err.message}`);
  }
}

async function seedDatabase(dbName, companyId) {
  const pool = new Pool({ host: 'localhost', port: 5432, database: dbName, user: 'postgres', password: '442277' });
  console.log(`\n=== Seeding: ${dbName} (company: ${companyId || 'null'}) ===`);

  for (const [table, { column, rows }] of Object.entries(SEED_DATA)) {
    try {
      // 1. Check if table exists
      const existsRes = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
        [table]
      );
      if (!existsRes.rows[0].exists) {
        console.log(`  [SKIP] ${table} - table does not exist`);
        continue;
      }

      // 2. Remove clear dummy data
      const dummyDeleteRes = await pool.query(
        `DELETE FROM ${table} WHERE company_id = $1 AND UPPER(${column}) LIKE ANY(ARRAY['%DEMO%','%TEST%','%SAMPLE%','%DUMMY%','%TEMP%','%PLACEHOLDER%'])`,
        [companyId]
      );
      if (dummyDeleteRes.rowCount > 0) {
        console.log(`  [CLEAN] ${table}: removed ${dummyDeleteRes.rowCount} dummy rows`);
      }

      // 3. Get existing real values
      const existingRes = await pool.query(
        `SELECT LOWER(${column}) as val FROM ${table} WHERE company_id = $1`,
        [companyId]
      );
      const existingVals = new Set(existingRes.rows.map(r => r.val));

      // 4. Insert missing real values
      let inserted = 0;
      for (const value of rows) {
        if (!existingVals.has(value.toLowerCase())) {
          try {
            await pool.query(
              `INSERT INTO ${table} (company_id, ${column}, status) VALUES ($1, $2, 'Active') ON CONFLICT DO NOTHING`,
              [companyId, value]
            );
            inserted++;
          } catch (e) {
            // Skip duplicates silently
          }
        }
      }

      const totalRes = await pool.query(`SELECT COUNT(*) FROM ${table} WHERE company_id = $1`, [companyId]);
      console.log(`  [OK] ${table}: +${inserted} new rows (total: ${totalRes.rows[0].count})`);
    } catch (e) {
      console.log(`  [ERR] ${table}: ${e.message}`);
    }
  }

  await seedCountriesAndCities(pool, dbName, companyId);
  await seedCurrencies(pool, dbName, companyId);

  await pool.end();
}

async function main() {
  console.log('=== Master Data Seeder: Industry-Standard Tile Exporter Data ===\n');

  // Get all tenant databases
  const rootPool = new Pool({ host: 'localhost', port: 5432, database: 'postgres', user: 'postgres', password: '442277' });
  const dbRes = await rootPool.query(`SELECT datname FROM pg_database WHERE datistemplate = false AND datname LIKE 'tile_%' ORDER BY datname`);
  await rootPool.end();

  for (const { datname } of dbRes.rows) {
    try {
      const tmpPool = new Pool({ host: 'localhost', port: 5432, database: datname, user: 'postgres', password: '442277' });
      // Get the company_id for this tenant DB
      let companyId = null;
      try {
        const compRes = await tmpPool.query(`SELECT id FROM companies LIMIT 1`);
        companyId = compRes.rows[0]?.id || null;
      } catch (e) { /* companies table might not exist here */ }
      await tmpPool.end();

      await seedDatabase(datname, companyId);
    } catch (e) {
      console.log(`\n[ERROR] Skipping ${datname}: ${e.message}`);
    }
  }

  console.log('\n=== Seeding Complete! ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
