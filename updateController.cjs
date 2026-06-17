const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/igstInvoiceController.js', 'utf8');

// Inside `createOrUpdate` map igst_percentage
content = content.replace(
  'const igstPercent = parseFloat(l.igst_rate || l.igst_percent || 18.00);',
  'const igstPercent = parseFloat(l.igst_percentage || l.igst_percent || l.igst_rate || 18.00);'
);

content = content.replace(
  'igst_rate: igstPercent,',
  `igst_percentage: igstPercent,
        igst_rate: igstPercent,`
);

fs.writeFileSync('backend/src/controllers/igstInvoiceController.js', content);
console.log('igstInvoiceController.js updated!');
