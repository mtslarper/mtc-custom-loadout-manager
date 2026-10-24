import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { scanSecrets } from './scan-secrets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, '../github-upload'));
if (target === root || root.startsWith(target + path.sep)) throw new Error('Release must not replace the source directory or its parent');
if (await stat(target).catch(() => null)) throw new Error('Release directory already exists; choose a new destination');
const fixed = ['package.json', 'server.mjs', 'Start.cmd', 'README.md', 'README.ru.md', 'SECURITY.md', 'NOTICE.md', '.gitignore', '.gitattributes'];
const trees = ['public', 'tools', 'tests', '.github', 'config'];
const files = [...fixed];
async function collect(relative) {
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink excluded: ${next}`);
    if (entry.isDirectory()) await collect(next);
    else if (entry.isFile() && !/\.(orig|bak|tmp|log|zip|rar)$/i.test(entry.name)) files.push(next);
  }
}
for (const tree of trees) await collect(tree);
for (const name of ['page-data.json', 'assets.json', 'vehicle-source-data.json', 'vehicle-image-sources.json', 'vehicle-info-report.json', 'missing-vehicle-images.txt', 'VEHICLE-CARDS-CHECKS.md']) {
  if (await stat(path.join(root, 'verification', name)).catch(() => null)) files.push(path.join('verification', name));
}
// Validate content before creating the distributable.
const html = await readFile(path.join(root, 'public/index.html'), 'utf8');
const data = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
if (data.props.pageProps.presets.length !== 6 || data.props.pageProps.presets.some(p => !p.id.startsWith('preset-'))) throw new Error('Unexpected public presets');
const sourceScan = await scanSecrets(root);
if (sourceScan.findings.length) throw new Error('Secret scan must pass before packaging');
await mkdir(target);
const manifest = [];
for (const relative of files.sort()) {
  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, relative), destination);
  const bytes = await readFile(destination);
  manifest.push({ file: relative.split(path.sep).join('/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
const result = await scanSecrets(target);
if (result.findings.length) throw new Error('Secret found in release; do not publish');
await writeFile(path.join(target, 'release-manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), files: manifest, secretScan: { scanned: result.scanned, findings: 0 } }, null, 2) + '\n');
console.log(JSON.stringify({ directory: target, files: manifest.length, bytes: manifest.reduce((n, f) => n + f.bytes, 0), secretFindings: 0 }, null, 2));
