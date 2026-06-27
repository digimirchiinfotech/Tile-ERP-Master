const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('https://tile-erp-master-production.up.railway.app/api/auth/login', {
      email_id: 'grow@digimirchiinfotech.com',
      password: 'Admin@123'
    });
    
    const token = loginRes.data.data.accessToken;
    const companyId = loginRes.data.data.user.company_id;
    
    try {
      const res = await axios.put('https://tile-erp-master-production.up.railway.app/api/proforma-invoices/2366c16c-2007-4423-af14-6f6fc3291443', {
        status: "Draft",
        notes: "test notes"
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-company-id': companyId
        }
      });
      console.log('Success:', res.data);
    } catch (e) {
      console.error('PI Error Status:', e.response?.status);
      console.error('PI Error Data:', JSON.stringify(e.response?.data, null, 2));
    }
  } catch (e) {
    console.error('Login Error:', e.response?.data || e.message);
  }
}

run();
