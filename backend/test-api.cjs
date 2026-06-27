const http = require('http');

async function run() {
  const loginData = JSON.stringify({ email: 'admin@admin.com', password: 'Tx!BAXYFKUWB-FyKa7Z9' });
  const loginReq = http.request('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const auth = JSON.parse(body);
      const token = auth.data.accessToken;
      const companyId = '66e68258-a6fc-4ad2-b014-22e086e1cff2';

      const clientData = JSON.stringify({
        client_name: 'Test Client HTTP',
        country: 'India',
        city: 'Mumbai',
        email_id: 'test@client.com',
        contact_number: '9999999999',
        business_type: 'Distributor',
        address: '123 Test St',
        contact_person_name: 'John Doe',
        status: 'Active'
      });

      const createReq = http.request('http://localhost:8000/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(clientData),
          'Authorization': `Bearer ${token}`,
          'X-Company-Id': companyId
        }
      }, (cRes) => {
        let cBody = '';
        cRes.on('data', chunk => cBody += chunk);
        cRes.on('end', () => {
          console.log('CREATE CLIENT RESPONSE:', cRes.statusCode, cBody);
        });
      });
      createReq.on('error', console.error);
      createReq.write(clientData);
      createReq.end();
    });
  });
  loginReq.on('error', console.error);
  loginReq.write(loginData);
  loginReq.end();
}
run();
