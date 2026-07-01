import http from 'http';

const options = {
  hostname: 'localhost',
  port: 8000, // or the port your server uses locally
  path: '/api/gstin/validate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify({ gstin: '24CJOPP4304H1Z6' }));
req.end();
