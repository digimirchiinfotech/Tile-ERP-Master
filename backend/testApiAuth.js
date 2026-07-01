import jwt from 'jsonwebtoken';
import http from 'http';

// Generate a mock token for super_admin
const token = jwt.sign(
  { id: '62e97170-a5f2-4c55-984b-f6087b074af7', type: 'access' },
  process.env.JWT_SECRET || 'tile_exporter_secret_key_2026_secure',
  { expiresIn: '1h' }
);

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/gstin/validate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify({ gstin: '24CJOPP4304H1Z6' }));
req.end();
