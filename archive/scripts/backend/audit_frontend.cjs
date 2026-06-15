const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.json');
const frontendPath = path.join(__dirname, '..', 'frontend', 'src');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Flatten all schema columns into a Set for fast lookup
const allSchemaColumns = new Set();
for (const table of Object.keys(schema)) {
    for (const col of schema[table]) {
        allSchemaColumns.add(col);
    }
}

const issues = [];
const uiOnlyIgnoreList = ['password', 'confirm_password', 'search', 'terms', 'remember', 'query', 'dateRange'];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match name="fieldname" or name={'fieldname'} or accessorKey: 'fieldname'
        const matches = [...line.matchAll(/(?:name=|accessorKey:\s*|dataIndex:\s*)['"]([a-zA-Z0-9_]+)['"]/g)];
        
        for (const match of matches) {
            const fieldName = match[1];
            
            if (!allSchemaColumns.has(fieldName) && !uiOnlyIgnoreList.includes(fieldName)) {
                 issues.push(`[${path.basename(filePath)}:${i+1}] Frontend field '${fieldName}' not found in any database table schema.`);
            }
        }
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            scanFile(fullPath);
        }
    }
}

walkDir(frontendPath);

fs.writeFileSync(path.join(__dirname, 'audit_frontend_issues.json'), JSON.stringify(issues, null, 2));
console.log(`Found ${issues.length} potential frontend mapping issues.`);
