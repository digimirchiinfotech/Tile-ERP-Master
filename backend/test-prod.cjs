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
      const res = await axios.post('https://tile-erp-master-production.up.railway.app/api/clients', {
        client_name: "DEMOOO DA",
        consignee_details: "DA DDD",
        buyer_details: "DEO",
        credit_limit: "0",
        credit_days: "0",
        notes: "Additional notes about the client",
        port_of_loading: "MUNDRA",
        port_of_discharge: "DAKAR",
        final_destination: "SENEGAL",
        currency: "USD",
        country: "Senegal",
        status: "Active"
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-company-id': companyId
        }
      });
      console.log('Success:', res.data);
    } catch (e) {
      console.error('Client Error Status:', e.response?.status);
      console.error('Client Error Data:', JSON.stringify(e.response?.data, null, 2));
    }
  } catch (e) {
    console.error('Login Error:', e.response?.data || e.message);
  }
}

run();
