import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@tileexporter.com',
      password: 'password123'
    });
    const token = login.data.data.accessToken;

    const subs = await axios.get('http://localhost:5000/api/subscriptions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Subscriptions:', JSON.stringify(subs.data, null, 2));

    const txns = await axios.get('http://localhost:5000/api/subscriptions/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Transactions:', JSON.stringify(txns.data, null, 2));

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();
