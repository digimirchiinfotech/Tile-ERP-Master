const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');
const filesToPatch = [
  'exportInvoiceController.js',
  'packingListController.js',
  'proformaInvoiceController.js',
  'accountEntryController.js',
  'purchaseOrderController.js'
];

for (const file of filesToPatch) {
  const filePath = path.join(controllersDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add import if missing
  if (!content.includes('import { logAction } from')) {
    content = content.replace(/(import .*;\n)/, `$1import { logAction } from '../services/auditService.js';\n`);
    modified = true;
  }

  // We need to inject logAction at the end of create/update/delete.
  // Because it's hard to parse AST reliably via simple script, I will just log the manual locations.
  // Actually, wait, some controllers ALREADY have logAction for update/delete. Let's just find where to insert.
  
  fs.writeFileSync(filePath, content, 'utf8');
  if (modified) {
    console.log(`Updated imports in ${file}`);
  }
}
