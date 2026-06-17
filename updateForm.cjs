const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/account-finance-management/AccountEntryForm.jsx', 'utf8');

const targetStr = `      const newEntryNo = \`ACC/\${String(new Date().getMonth() + 1).padStart(
        2,
        '0'
      )}/\${String(new Date().getFullYear()).slice(-2)}/\${String(
        Math.floor(Math.random() * 1000) + 1
      ).padStart(3, '0')}\`;`;

const replacement = "      const newEntryNo = `ACC/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}/Auto`;";

content = content.replace(targetStr, replacement);
fs.writeFileSync('frontend/src/components/account-finance-management/AccountEntryForm.jsx', content);
console.log('Replaced');
