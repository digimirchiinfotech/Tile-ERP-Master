const fs = require('fs');
let content = fs.readFileSync('src/utils/productExportUtils.js', 'utf8');

content = content.replace(
  "setCell(r, 8, `${p.igstRate || p.igst_rate || '18.00'}%`, { align: { horizontal: 'center', vertical: 'top' } });",
  "setCell(r, 8, `${parseFloat(p.igst_percentage || p.igst_rate || p.igstRate || '18.00').toFixed(2)}%`, { align: { horizontal: 'center', vertical: 'top' } });"
);

fs.writeFileSync('src/utils/productExportUtils.js', content);
console.log('productExportUtils.js updated!');
