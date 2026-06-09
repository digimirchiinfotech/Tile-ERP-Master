const fs = require('fs');
let content = fs.readFileSync('src/controllers/masterDataController.js', 'utf8');

const replacement = `
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID
        );
      \`;
      await queryFn(createQuery);
      debugLogger.info(\`[MasterData Self-Healing] Table \${config.table} created successfully!\`);
    }
  } catch (err) {
    debugLogger.error(\`[MasterData Self-Healing] Error ensuring table \${config.table} exists:\`, err.message);
  }
};

export const getAllMasterData = async (req, res, next) => {
  try {
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const results = {};

    for (const [key, config] of Object.entries(TABLE_MAPPING)) {
      let query;
      let params;

      if (key === 'catalogueNames') {
        if (companyId) {
          query = \`SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id = $1 AND status = 'Active' ORDER BY name ASC\`;
          params = [companyId];
        } else {
          query = \`SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id IS NULL AND status = 'Active' ORDER BY name ASC\`;
          params = [];
        }
      } else if (config.global) {`;

const parts = content.split('let createQuery = `');
if (parts.length > 1) {
  let afterBroken = parts[1].substring(parts[1].indexOf('      } else if (config.global) {') + '      } else if (config.global) {'.length);
  
  const createTableFix = `
        CREATE TABLE IF NOT EXISTS public.\${config.table} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          \${config.column} TEXT NOT NULL,
          \${config.table === 'box_types' ? 'image_url TEXT NULL,' : ''}` + replacement;
          
  content = parts[0] + 'let createQuery = `' + createTableFix + afterBroken;
}

fs.writeFileSync('src/controllers/masterDataController.js', content, 'utf8');
console.log('Fixed syntax error');
