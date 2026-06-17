const fs = require('fs');
let content = fs.readFileSync('src/controllers/accountEntryController.js', 'utf8');

content = content.replace(
  'conditions.push(`(TRIM(c.name) ILIKE $${paramCount} OR TRIM(inv.client_name) ILIKE $${paramCount})`);',
  'conditions.push(`(TRIM(c.name) ILIKE $${paramCount} OR TRIM(inv.client_name) ILIKE $${paramCount} OR TRIM(inv.party_name) ILIKE $${paramCount})`);'
);

content = content.replace(
  /\$\{whereClause\} AND inv\.invoice_no NOT IN \(SELECT invoice_ref FROM account_entries WHERE invoice_ref IS NOT NULL AND invoice_ref != ''\)/g,
  '${whereClause}'
);

fs.writeFileSync('src/controllers/accountEntryController.js', content);
console.log("Updated accountEntryController.js");
