const fs = require('fs');
let content = fs.readFileSync('src/controllers/masterDataController.js', 'utf8');

// 1. Remove the DEBUG SNIPPET
content = content.replace(/\/\/ DEBUG SNIPPET\s*require\('fs'\)\.appendFileSync\('F:\/Tile erp\/143\/backend\/payload_debug\.log', JSON\.stringify\(\{ type, id, body \}\) \+ '\\n'\);\s*/g, '');

// 2. Fix lines 65 to 85 where it was broken
const parts = content.split('let createQuery = `');
if (parts.length > 1) {
  const afterBroken = parts[1].split('} else if (config.global) {')[1];
  
  const createTableFix = `
        CREATE TABLE IF NOT EXISTS public.\${config.table} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          \${config.column} TEXT NOT NULL,
          \${config.table === 'box_types' ? 'image_url TEXT NULL,' : ''}
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
      
  content = parts[0] + 'let createQuery = `' + createTableFix + afterBroken;
}

// 3. Fix the end of updateMasterData
const updateEndSearch = `if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }`;

const brokenEndIndex = content.indexOf(updateEndSearch);
if (brokenEndIndex !== -1) {
  const nextSection = content.indexOf('export const deleteMasterData =');
  const brokenEndContent = content.substring(brokenEndIndex, nextSection);
  
  const fixedEndContent = `if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }

      updates.push(\`updated_at = CURRENT_TIMESTAMP\`);
      values.push(id);

      let updateQuery;
      if (config.global) {
        updateQuery = \`UPDATE \${config.table} SET \${updates.join(', ')} WHERE id = $\${paramCount++} RETURNING id, \${config.column} as value, status\${config.table === 'box_types' ? ', image_url' : ''}\`;
      } else {
        values.push(companyId);
        updateQuery = \`UPDATE \${config.table} SET \${updates.join(', ')} WHERE id = $\${paramCount++} AND company_id = $\${paramCount} RETURNING id, \${config.column} as value, status\${config.table === 'box_types' ? ', image_url' : ''}\`;
      }

      const { rows } = await client.query(updateQuery, values);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Updated successfully', data: rows[0] });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

`;
  
  content = content.substring(0, brokenEndIndex) + fixedEndContent + content.substring(nextSection);
}

fs.writeFileSync('src/controllers/masterDataController.js', content, 'utf8');
console.log('Fixed masterDataController.js');
