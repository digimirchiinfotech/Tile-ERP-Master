const fs = require('fs');
const file = 'd:/Tile ERP/backend/src/controllers/exportInvoiceController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Export invoice not found or unauthorized', 404));
    }`;

const replacement = `    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Export invoice not found or unauthorized', 404));
    }

    // Auto-update IGST invoice declarations if they were updated here
    if (req.body.supply_declaration !== undefined || req.body.ftp_incentive_declaration !== undefined) {
      let igstUpdates = [];
      let igstValues = [];
      let igstParamCount = 1;
      
      if (req.body.supply_declaration !== undefined) {
        igstUpdates.push(\`supply_declaration = $\${igstParamCount++}\`);
        igstValues.push(req.body.supply_declaration);
      }
      if (req.body.ftp_incentive_declaration !== undefined) {
        igstUpdates.push(\`ftp_incentive_declaration = $\${igstParamCount++}\`);
        igstValues.push(req.body.ftp_incentive_declaration);
      }
      
      if (igstUpdates.length > 0) {
        igstValues.push(id);
        let igstWhere = \`WHERE export_invoice_id = $\${igstParamCount++}\`;
        if (companyId) {
          igstValues.push(companyId);
          igstWhere += \` AND company_id = $\${igstParamCount}\`;
        }
        await client.query(\`UPDATE igst_invoices SET \${igstUpdates.join(', ')} \${igstWhere}\`, igstValues);
      }
    }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(file, content);
  console.log('Successfully patched exportInvoiceController.js');
} else {
  console.log('Target string not found!');
}
