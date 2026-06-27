import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const { Pool } = pg;

// Master database connection
const masterPool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'tile_exporter_crm'}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function applyIndexes() {
    const sqlFilePath = path.join(__dirname, 'migrations', '20260628_add_performance_indexes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    let masterClient;
    try {
        masterClient = await masterPool.connect();
        
        console.log('Fetching active companies from master database...');
        const res = await masterClient.query("SELECT id, db_name, db_user, db_password FROM companies WHERE status = 'active'");
        const companies = res.rows;
        
        console.log(`Found ${companies.length} active companies. Applying indexes...`);

        for (const company of companies) {
            console.log(`Processing company: ${company.id}...`);
            let tenantPool;
            
            try {
                // Determine if they use separate databases per tenant or schemas/Rls in the same DB.
                // Assuming it's multi-database setup based on typical implementations, but if db_name is empty, fallback to master with RLS or single DB approach if needed.
                // Looking at standard configs, some multi-tenant just sets search_path or uses company_id filtering. 
                // Wait, if it's "connects to their tenant database using company credentials", it might be a different DB URL.
                // We will construct the DB URL.
                
                const tenantConfig = {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5432', 10),
                    database: company.db_name || process.env.DB_NAME || 'tile_exporter_crm', // Assuming single DB if db_name not present, or distinct
                    user: company.db_user || process.env.DB_USER || 'postgres',
                    password: company.db_password || process.env.DB_PASSWORD || '',
                    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
                };

                tenantPool = new Pool(tenantConfig);
                const tenantClient = await tenantPool.connect();
                
                try {
                    await tenantClient.query('BEGIN');
                    await tenantClient.query(sqlContent);
                    await tenantClient.query('COMMIT');
                    console.log(`✅ Successfully applied indexes for company ${company.id}`);
                } catch (err) {
                    await tenantClient.query('ROLLBACK');
                    console.error(`❌ Error applying indexes for company ${company.id}:`, err.message);
                } finally {
                    tenantClient.release();
                }

            } catch (err) {
                console.error(`❌ Could not connect to tenant database for company ${company.id}:`, err.message);
            } finally {
                if (tenantPool) await tenantPool.end();
            }
        }
        console.log('All done.');

    } catch (err) {
        console.error('Error fetching companies:', err);
    } finally {
        if (masterClient) masterClient.release();
        await masterPool.end();
    }
}

applyIndexes();
