const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/accountEntryController.js', 'utf8');

const targetStr = `    conditions.push(\`(TRIM(c.name) ILIKE $${'\\$'}{paramCount} OR TRIM(inv.client_name) ILIKE $${'\\$'}{paramCount} OR TRIM(inv.party_name) ILIKE $${'\\$'}{paramCount})\`);
    values.push(\`%\${partyName.trim()}%\`);
    paramCount++;`;

const replacement = targetStr + `\n\n    // Only fetch locked invoices\n    conditions.push('inv.is_locked = true');`;

content = content.replace(
  /conditions\.push\(\`\(TRIM\(c\.name\) ILIKE \$\$\{paramCount\} OR TRIM\(inv\.client_name\) ILIKE \$\$\{paramCount\} OR TRIM\(inv\.party_name\) ILIKE \$\$\{paramCount\}\)\`\);\s*values\.push\(\`%\$\{partyName\.trim\(\)\}%\`\);\s*paramCount\+\+;/,
  `conditions.push(\`(TRIM(c.name) ILIKE $${'\\$'}{paramCount} OR TRIM(inv.client_name) ILIKE $${'\\$'}{paramCount} OR TRIM(inv.party_name) ILIKE $${'\\$'}{paramCount})\`);
    values.push(\`%\${partyName.trim()}%\`);
    paramCount++;
    
    // Only fetch finalized/locked invoices
    conditions.push('inv.is_locked = true');`
);

fs.writeFileSync('backend/src/controllers/accountEntryController.js', content);
console.log('Added is_locked = true condition');
