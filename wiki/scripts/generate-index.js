import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '..', 'public', 'raw');
const pagesOut = path.join(__dirname, '..', 'public', 'pages.json');
const indexOut = path.join(__dirname, '..', 'public', 'wiki-index.json');

// Minimal frontmatter parser — handles key: "value" and key: plain value
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val) fm[key] = val;
  }
  return fm;
}

// Derive a category from tags or filename
function categorize(fm, filename) {
  const tags = (fm.tags || '').toLowerCase();
  const name = filename.toLowerCase();

  if (name.includes('bibliography')) return 'References';
  if (name.includes('tech stack') || name.includes('architecture')) return 'Architecture';
  if (name.includes('torchcrepe') || name.includes('crepe')) return 'Libraries — Pitch Estimation';
  if (name.includes('librosa')) return 'Libraries — Audio Analysis';
  if (name.includes('essentia')) return 'Libraries — Audio Analysis';
  if (name.includes('mir libraries') || name.includes('mir libraries')) return 'Libraries — MIR General';
  if (name.includes('music information retrieval')) return 'Research & Conversations';
  if (name.includes('building an ai') || name.includes('coaching')) return 'Project Planning';
  if (name.includes('2026')) return 'Research & Conversations';
  if (tags.includes('clippings')) return 'Research & Conversations';
  return 'Other';
}

// Count external links in a file
function countLinks(content) {
  return (content.match(/https?:\/\//g) || []).length;
}

function generateIndex() {
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.md'));

  // Write simple pages list
  fs.writeFileSync(pagesOut, JSON.stringify(files, null, 2));

  // Build rich index metadata
  const index = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(rawDir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const category = categorize(fm, file);
    const linkCount = countLinks(content);
    const wordCount = content.replace(/---[\s\S]*?---/, '').trim().split(/\s+/).length;

    index.push({
      filename: file,
      title: fm.title || file.replace('.md', ''),
      description: fm.description || '',
      source: fm.source || '',
      created: fm.created || '',
      category,
      linkCount,
      wordCount,
    });
  }

  // Sort by category then title
  index.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  fs.writeFileSync(indexOut, JSON.stringify(index, null, 2));
  console.log(`Generated pages.json with ${files.length} pages.`);
  console.log(`Generated wiki-index.json with ${index.length} entries across categories.`);
}

generateIndex();
