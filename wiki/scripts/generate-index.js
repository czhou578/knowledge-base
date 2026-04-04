import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '..', 'public', 'raw');
const outPath = path.join(__dirname, '..', 'public', 'pages.json');

function generateIndex() {
  if (!fs.existsSync(rawDir)) {
    console.error(`raw directory not found: ${rawDir}`);
    // Create it just in case
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const files = fs.readdirSync(rawDir)
    .filter(file => file.endsWith('.md'));

  fs.writeFileSync(outPath, JSON.stringify(files, null, 2));
  console.log(`Generated pages.json with ${files.length} pages.`);
}

generateIndex();
