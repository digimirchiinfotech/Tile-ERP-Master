const jwt = require('jsonwebtoken');
const secret = '9a9ca4445bcffe2f2bd8c5ce2a9a14951ad5749db7dbe45ced6c37a3d8bc90e951fe1a17f990679f7b3c7c44b1b6ba1107fbe6ced1a35444ffff02485f47093f';
const token = jwt.sign({ id: '62e97170-a5f2-4c55-984b-f6087b074af7', role: 'super_admin', type: 'access' }, secret, { expiresIn: '1h' });

fetch('http://localhost:8000/api/inventory/warehouses', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.text())
.then(t => console.log('Response:', t))
.catch(e => console.error(e));
