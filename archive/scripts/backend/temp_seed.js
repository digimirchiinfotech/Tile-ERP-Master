import pg from 'pg';
import { Country, City } from 'country-state-city';
const { Pool } = pg;

async function seedRemote() {
  const rootPool = new Pool({ connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/postgres?sslmode=disable' });
  const dbRes = await rootPool.query(`SELECT datname FROM pg_database WHERE datistemplate = false AND datname LIKE 'tile_%' OR datname = 'railway' ORDER BY datname`);
  await rootPool.end();

  for (const { datname } of dbRes.rows) {
    try {
      console.log('Seeding', datname);
      const pool = new Pool({ connectionString: `postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:54336/${datname}?sslmode=disable` });
      
      const existsRes = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='master_countries') as has_countries`);
      if (!existsRes.rows[0].has_countries) {
        await pool.end();
        continue;
      }
      
      const cCountRes = await pool.query(`SELECT COUNT(*) FROM master_countries`);
      if (parseInt(cCountRes.rows[0].count) === 0) {
        console.log('  Seeding master_countries...');
        const countries = Country.getAllCountries();
        let values = [], params = [], i = 1, insertedCount = 0;
        for (const c of countries) {
          values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
          params.push(c.isoCode, c.name, c.region || '', c.isoCode, '');
          if (values.length >= 100) {
            await pool.query(`INSERT INTO master_countries (country_code, country_name, region, iso_alpha_2, iso_alpha_3) VALUES ${values.join(',')} ON CONFLICT (country_code) DO NOTHING`, params);
            insertedCount += values.length; values = []; params = []; i = 1;
          }
        }
        if (values.length > 0) await pool.query(`INSERT INTO master_countries (country_code, country_name, region, iso_alpha_2, iso_alpha_3) VALUES ${values.join(',')} ON CONFLICT (country_code) DO NOTHING`, params);
      }

      const ciCountRes = await pool.query(`SELECT COUNT(*) FROM master_cities`);
      if (parseInt(ciCountRes.rows[0].count) === 0) {
        console.log('  Seeding master_cities...');
        const countriesRes = await pool.query(`SELECT country_code FROM master_countries`);
        const countryMap = {};
        countriesRes.rows.forEach(r => { countryMap[r.country_code] = r.country_code; });

        const cities = City.getAllCities();
        let values = [], params = [], i = 1, insertedCount = 0;
        for (const c of cities) {
          const countryCode = countryMap[c.countryCode];
          if (!countryCode) continue;
          values.push(`($${i++}, $${i++}, $${i++})`);
          params.push(c.name, countryCode, c.stateCode || '');
          if (values.length >= 2000) {
            await pool.query(`INSERT INTO master_cities (city_name, country_code, state_province) VALUES ${values.join(',')}`, params);
            insertedCount += values.length; values = []; params = []; i = 1;
          }
        }
        if (values.length > 0) await pool.query(`INSERT INTO master_cities (city_name, country_code, state_province) VALUES ${values.join(',')}`, params);
        console.log('  Cities seeded!');
      } else {
        console.log('  Cities already seeded!');
      }
      
      await pool.end();
    } catch(e) {
      console.log('Error', datname, e.message);
    }
  }
}
seedRemote().then(() => console.log('Done')).catch(e => console.error(e));
