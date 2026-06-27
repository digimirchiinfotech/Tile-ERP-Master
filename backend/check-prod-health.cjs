const axios = require('axios');

async function run() {
  // Test 1: Health check
  try {
    const health = await axios.get('https://tile-erp-master-production.up.railway.app/health', { timeout: 5000 });
    console.log('Health:', health.status, JSON.stringify(health.data).substring(0, 200));
  } catch (e) {
    console.log('Health error:', e.response?.status, e.message);
  }
  process.exit(0);
}
run();
