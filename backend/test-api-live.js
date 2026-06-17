import axios from 'axios';

// Bypass process.env restrictions by running this as a standalone script
const testApi = async () => {
  try {
    // Assuming backend is running on port 5000 (standard for this project)
    console.log('Testing /api/subscriptions...');
    
    // We need a valid token. Let's get one by logging in as super admin.
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@tileexporter.com', // Assuming default admin email
      password: 'admin' // Assuming default admin password
    });
    
    const token = loginRes.data.data.token;
    console.log('Got token:', token ? 'Yes' : 'No');
    
    const headers = {
      Authorization: `Bearer ${token}`
    };
    
    const subRes = await axios.get('http://localhost:5000/api/subscriptions', { headers });
    console.log('Subscriptions status:', subRes.status);
    console.log('Subscriptions data length:', subRes.data.data?.data?.length || subRes.data.data?.length);
    
    const txnRes = await axios.get('http://localhost:5000/api/subscriptions/transactions', { headers });
    console.log('Transactions status:', txnRes.status);
    console.log('Transactions data length:', txnRes.data.data?.length);
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
};

testApi();
