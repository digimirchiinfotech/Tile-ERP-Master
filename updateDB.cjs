const fs = require('fs');
let content = fs.readFileSync('backend/src/utils/databaseProvisioning.js', 'utf8');

// Inside `igst_invoices` schema
content = content.replace(
  'igst_rate NUMERIC(5,2) DEFAULT 18.00,',
  `igst_percentage DECIMAL(5,2) DEFAULT 18.00,
        igst_rate NUMERIC(5,2) DEFAULT 18.00,`
);

content = content.replace(
  'igst_rate NUMERIC(5,2) DEFAULT 18.00,',
  `igst_percentage DECIMAL(5,2) DEFAULT 18.00,
          igst_rate NUMERIC(5,2) DEFAULT 18.00,`
);

fs.writeFileSync('backend/src/utils/databaseProvisioning.js', content);
console.log('databaseProvisioning.js updated!');
