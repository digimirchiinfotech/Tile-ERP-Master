import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  
  for (const file of files) {
    try {
      // Need to suppress React/DOM errors if it tries to execute DOM code, 
      // but ESM evaluation TDZ happens BEFORE DOM execution
      // We will just catch the error and see if it's a ReferenceError: Cannot access
      await import('file://' + path.join(assetsDir, file));
    } catch (e) {
      if (e.name === 'ReferenceError' && e.message.includes('Cannot access')) {
        console.error('TDZ ERROR FOUND IN:', file);
        console.error(e);
      }
    }
  }
  console.log('Finished checking chunks for TDZ.');
}

run();
