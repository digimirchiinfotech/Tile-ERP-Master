import http from 'http';

http.get('http://localhost:8000/uploads/1780643442398-7ccceb1bc21d7f8bcd07655558397b2e.jpeg', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on('data', (chunk) => {
    // console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
