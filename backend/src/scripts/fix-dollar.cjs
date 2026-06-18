const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/accountEntryController.js', 'utf8');

content = content.replace(
  'conditions.push(`(TRIM(c.name) ILIKE ${paramCount} OR TRIM(inv.client_name) ILIKE ${paramCount} OR TRIM(inv.party_name) ILIKE ${paramCount})`);',
  () => 'conditions.push(`(TRIM(c.name) ILIKE $${paramCount} OR TRIM(inv.client_name) ILIKE $${paramCount} OR TRIM(inv.party_name) ILIKE $${paramCount})`);'
);

fs.writeFileSync('backend/src/controllers/accountEntryController.js', content);
console.log('Fixed syntax error');
