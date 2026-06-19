import masterDb from './src/config/database.js';
import router from './src/config/companyDatabaseRouter.js';

async function run() {
  try {
    // 1. Check master database
    const masterRes = await masterDb.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'export_invoice_items')"
    );
    console.log('Master DB has export_invoice_items:', masterRes.rows[0].exists);

    // 2. Check company database
    const companyId = '6e17ac7e-5d0f-43e3-93c0-34222ac4a701';
    const companyPool = await router.getCompanyDatabase(companyId);
    const companyRes = await companyPool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'export_invoice_items')"
    );
    console.log('Company DB has export_invoice_items:', companyRes.rows[0].exists);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
