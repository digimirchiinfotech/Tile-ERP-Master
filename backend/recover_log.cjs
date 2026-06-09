const fs = require('fs');
const path = require('path');
const brainDir = 'C:/Users/Geeta/.gemini/antigravity/brain';

const dirs = fs.readdirSync(brainDir);
for (const dir of dirs) {
  const logPath = path.join(brainDir, dir, '.system_generated/logs/overview.txt');
  if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    const updateIndex = log.indexOf('export const updateMasterData = async');
    if (updateIndex !== -1 && log.includes('TABLE_MAPPING')) {
      const startIndex = log.lastIndexOf('const TABLE_MAPPING = {', updateIndex);
      if (startIndex !== -1) {
        // Find end of file
        const endIndex = log.indexOf('};', log.indexOf('export default {', updateIndex));
        if (endIndex !== -1) {
          let content = log.substring(startIndex, endIndex + 2);
          
          content = content.split('\n').map(l => l.replace(/^\d{1,4}:\s/, '')).join('\n');
          
          const imports = `import AppError from '../utils/appError.js';\nimport { debugLogger } from '../utils/logger.js';\n\n`;
          
          fs.writeFileSync('F:/Tile erp/143/backend/src/controllers/masterDataController_recovered.js', imports + content, 'utf8');
          console.log('RECOVERED from', dir);
          break;
        }
      }
    }
  }
}
