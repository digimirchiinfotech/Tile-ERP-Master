import { Country, City } from 'country-state-city';
import pool from '../config/database.js';

async function seed() {
  console.log('Starting seed process for countries and cities...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const countries = Country.getAllCountries();
    console.log(`Found ${countries.length} countries.`);
    
    let totalCitiesInserted = 0;
    
    for (const country of countries) {
      // Insert country if not exists (global country, company_id is null)
      let countryRes = await client.query(
        `SELECT id FROM public.master_countries WHERE country_code = $1 AND company_id IS NULL LIMIT 1`,
        [country.isoCode]
      );
      
      if (countryRes.rows.length === 0) {
        countryRes = await client.query(
          `INSERT INTO public.master_countries 
           (country_code, country_name, region, iso_alpha_2, status) 
           VALUES ($1, $2, $3, $4, 'Active') RETURNING id`,
          [country.isoCode, country.name, country.region || null, country.isoCode]
        );
      }
      
      const cities = City.getCitiesOfCountry(country.isoCode);
      if (!cities) continue;
      
      // Get top 100 cities based on whatever default sort the package has
      const topCities = cities.slice(0, 100);
      
      for (const city of topCities) {
        // Use a conflict handling mechanism, but we don't have unique constraint.
        // Let's check first to avoid huge duplicates
        const cityRes = await client.query(
          `SELECT id FROM public.master_cities WHERE city_name = $1 AND country_code = $2 AND company_id IS NULL LIMIT 1`,
          [city.name, country.isoCode]
        );
        
        if (cityRes.rows.length === 0) {
          await client.query(
            `INSERT INTO public.master_cities 
             (city_name, country_code, state_province, latitude, longitude, status) 
             VALUES ($1, $2, $3, $4, $5, 'Active')`,
            [
              city.name, 
              country.isoCode, 
              city.stateCode || null, 
              city.latitude ? parseFloat(city.latitude) : null, 
              city.longitude ? parseFloat(city.longitude) : null
            ]
          );
          totalCitiesInserted++;
        }
      }
      
      console.log(`Processed ${country.name}: Inserted ${topCities.length} cities. (Total: ${totalCitiesInserted})`);
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Seeding complete! Successfully inserted ${totalCitiesInserted} cities.`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
