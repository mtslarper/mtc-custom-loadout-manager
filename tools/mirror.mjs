import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const origin = 'https://loadout-editor.multicrew.dev';
const cdn = 'https://cdn.astrid.ovh/c50318192d91';
const seen = new Set();
const manifest = [];
async function download(url, local) {
  if (seen.has(local)) return;
  seen.add(local);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const target = path.join(root, local);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  manifest.push({ url, file: local, bytes: bytes.length });
  console.log(`${local} (${bytes.length})`);
  if (/\.(js|css)$/.test(local)) {
    const content = bytes.toString();
    for (const match of content.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) {
      if (match[1].startsWith('data:')) continue;
      const dependency = new URL(match[1], match[1].startsWith('/') ? origin : url);
      if (dependency.origin === new URL(origin).origin) {
        await download(dependency.href, dependency.pathname.slice(1));
      } else if (dependency.origin === new URL(cdn).origin) {
        await download(dependency.href, dependency.pathname.replace('/c50318192d91/', ''));
      }
    }
  }
}
const pageResponse = await fetch(origin);
if (!pageResponse.ok) throw new Error(`Page HTTP ${pageResponse.status}`);
let html = await pageResponse.text();
await writeFile(path.join(root, '../verification/original.html'), html);
for (const match of html.matchAll(/(?:src|href)="(https:\/\/cdn\.astrid\.ovh\/c50318192d91\/[^"<>]+)"/g)) {
  await download(match[1], match[1].slice(cdn.length + 1));
}
html = html.replaceAll(cdn, '');
await download(`${origin}/favicon.ico`, 'favicon.ico');
await download(`${origin}/assets/image.png`, 'assets/image.png');
const appPath = path.join(root, '_next/static/chunks/pages/_app-bed855ee4bf389c8.js');
const app = await readFile(appPath, 'utf8');
await writeFile(appPath, app.replace('let e="https://analytics.astrid.exposed"', 'let e=""'));
for (const entry of manifest) {
  if (!/\.(js|css)$/.test(entry.file)) continue;
  const filename = path.join(root, entry.file);
  await writeFile(filename, (await readFile(filename, 'utf8')).replaceAll(cdn, ''));
}
await writeFile(path.join(root, 'index.html'), html);
await writeFile(path.join(root, '../verification/assets.json'), JSON.stringify(manifest, null, 2));
console.log(`Saved ${manifest.length} assets from ${origin}`);
