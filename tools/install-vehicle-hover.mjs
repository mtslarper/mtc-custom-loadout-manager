// Add stable vehicle IDs to the mirrored React item component and load the standalone card.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js');
const marker = '"data-vehicle-id":"vehicle"===t.type?t.name:void 0';
let chunk = readFileSync(filename, 'utf8');
if (!chunk.includes(marker)) {
  const anchor = 'return(0,r.jsxs)(W.A,{ref:c,onClick:';
  if (chunk.split(anchor).length !== 2) throw new Error('Vehicle item anchor changed; refusing to patch a different component.');
  chunk = chunk.replace(anchor, 'return(0,r.jsxs)(W.A,{ref:c,' + marker + ',"data-vehicle-tier":t.tier,"data-vehicle-column":t.columnIndex,onClick:');
  writeFileSync(filename, chunk);
}
const htmlPath = path.join(root, 'public/index.html');
let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('href="/vehicle-hover.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="/vehicle-hover.css"/></head>');
if (!html.includes('src="/vehicle-hover.js"')) html = html.replace('</body>', '<script src="/vehicle-hover.js" defer></script></body>');
writeFileSync(htmlPath, html);
console.log('Vehicle hover cards installed.');
