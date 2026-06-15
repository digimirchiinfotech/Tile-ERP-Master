const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.json');
const controllersPath = path.join(__dirname, 'src', 'controllers');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Find all tenant tables (tables with company_id)
const tenantTables = Object.keys(schema).filter(table => schema[table].includes('company_id'));

const issues = [];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // We look for SELECT, UPDATE, DELETE queries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Very basic matching for SQL queries
        const queryMatch = line.match(/(?:SELECT|UPDATE|DELETE\s+FROM)\s+(?:.*?FROM\s+)?([a-zA-Z0-9_]+)/i);
        if (queryMatch) {
            const table = queryMatch[1].toLowerCase();
            
            if (tenantTables.includes(table)) {
                // If it's a tenant table, check if the next few lines or this line contains company_id
                // Since queries can span multiple lines, we'll extract the block around it
                const blockStart = Math.max(0, i - 2);
                const blockEnd = Math.min(lines.length, i + 5);
                const block = lines.slice(blockStart, blockEnd).join('\n').toLowerCase();
                
                // If the block doesn't contain 'company_id', it's highly suspicious
                if (!block.includes('company_id') && !block.includes('user.companyid')) {
                     issues.push(`[${path.basename(filePath)}:${i+1}] Missing company_id in query for tenant table '${table}':\n    ${line.trim()}`);
                }
            }
        }
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            scanFile(fullPath);
        }
    }
}

walkDir(controllersPath);

fs.writeFileSync(path.join(__dirname, 'audit_multitenant_issues.json'), JSON.stringify(issues, null, 2));
console.log(`Found ${issues.length} potential multi-tenant issues in controllers.`);
