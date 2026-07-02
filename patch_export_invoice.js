const fs = require('fs');
const file = 'd:/Tile ERP/frontend/src/components/export-management/Invoice/ExportInvoiceForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// LC Number
content = content.replace(
  /value=\{formData\.lcNumber \|\| ''\}\s+disabled=\{true\}/g,
  `value={formData.lcNumber || ''}
                      onChange={(e) => handleInputChange('lcNumber', e.target.value)}`
);

// LC Date
content = content.replace(
  /value=\{formData\.lcDate \|\| ''\}\s+disabled=\{true\}/g,
  `value={formData.lcDate || ''}
                      onChange={(e) => handleInputChange('lcDate', e.target.value)}`
);

// EPCG No
content = content.replace(
  /value=\{formData\.epcgNo \|\| ''\}\s+disabled=\{true\}/g,
  `value={formData.epcgNo || ''}
                      onChange={(e) => handleInputChange('epcgNo', e.target.value)}`
);

fs.writeFileSync(file, content);
console.log('Done!');
