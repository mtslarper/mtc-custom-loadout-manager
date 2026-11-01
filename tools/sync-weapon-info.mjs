// Downloads the weapon and placeable pictures of multicrew.wiki and links them to the item names used by the editor.
// Usage: node tools/sync-weapon-info.mjs        (needs internet; rewrites public/data/weapon-info.json and the pictures)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wiki = 'https://multicrew.wiki';
const imageHost = 'https://img.astrid.ovh';
const kinds = [['weapons', 'weapons'], ['placeables', 'placeables']];
// Names the wiki spells differently from the editor (checked by hand).
const aliases = { 'M134 Tripod': ['placeables', 'm134'], 'Cope Cage var1': ['placeables', 'cope-cage'] };

const decode = text => text.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const normalise = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
async function get(url, binary) {
  const response = await fetch(url, { headers: { 'user-agent': 'mtc-custom-loadout-manager sync' } });
  if (!response.ok) throw Object.assign(new Error(`${response.status} ${url}`), { status: response.status });
  return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
}

// Item names known to the editor: the built-in list, the catalog and every item of the built-in presets.
const chunk = await readFile(path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js'), 'utf8');
const names = new Set(JSON.parse(chunk.match(/JSON\.parse\('(\["TP".*?\])'\)/)[1].replace(/\\'/g, "'")));
const page = JSON.parse(await readFile(path.join(root, 'verification/page-data.json'), 'utf8'));
for (const weapon of page.weapons) names.add(weapon.name);
for (const preset of page.presets) for (const item of Object.values(preset.items)) if (item.type === 'weapon') names.add(item.name);

// Wiki entries: kind/slug and the displayed name.
const entries = [];
for (const [kind] of kinds) {
  const html = await get(`${wiki}/mtc/${kind}`);
  const seen = new Set();
  for (const match of html.matchAll(new RegExp(`<a[^>]*href="/mtc/${kind}/([a-z0-9-]+)"[^>]*>(.*?)</a>`, 'gs'))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    const label = decode(match[2].replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(s => s && !s.startsWith('.css-'))[0] || '');
    if (label) entries.push({ kind, slug: match[1], name: label });
  }
}
const byName = new Map();
for (const entry of entries) { const key = normalise(entry.name); if (!byName.has(key)) byName.set(key, entry); }

const items = {};
const unmatched = [];
for (const name of [...names].sort()) {
  const alias = aliases[name];
  const entry = alias ? entries.find(e => e.kind === alias[0] && e.slug === alias[1]) : byName.get(normalise(name));
  if (!entry) { unmatched.push(name); continue; }
  const local = `/assets/${entry.kind}/${entry.slug}.webp`;
  const remote = `${imageHost}/6dd3edc31492/assets/${entry.kind}/${entry.slug}.png?w=640&q=75`;
  const bytes = await get(remote, true);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.length < 500) throw new Error(`Invalid image: ${remote}`);
  await mkdir(path.join(root, 'public/assets', entry.kind), { recursive: true });
  await writeFile(path.join(root, 'public', local), bytes);
  items[name] = { displayName: entry.name, kind: entry.kind, slug: entry.slug, source: `${wiki}/mtc/${entry.kind}/${entry.slug}`, image: local, imageSource: remote };
}
await writeFile(path.join(root, 'public/data/weapon-info.json'), JSON.stringify({ schemaVersion: 1, items }));
await writeFile(path.join(root, 'verification/weapon-info-report.json'), JSON.stringify({ editorNames: names.size, wikiEntries: entries.length, withImages: Object.keys(items).length, unmatched }, null, 2) + '\n');
console.log(JSON.stringify({ editorNames: names.size, wikiEntries: entries.length, withImages: Object.keys(items).length, unmatched: unmatched.length }));
