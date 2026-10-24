// Download public in-game renders and statistics published by the official MTC wiki.
// No Roblox credentials or access to private place files are needed.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVehicleModifications } from './lib/vehicle-modifications.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wiki = 'https://multicrew.wiki';
const refresh = process.argv.includes('--refresh');
const offline = process.argv.includes('--offline');
if (offline && refresh) throw new Error('--offline and --refresh cannot be used together');
const cachePath = path.join(root, 'verification/vehicle-source-data.json');
const imageManifestPath = path.join(root, 'verification/vehicle-image-sources.json');
const sources = {
  mtc: { name: 'Multicrew Tank Combat', placeId: '95721658376580' },
  rv: { name: 'Rainy Valley', placeId: '116683624874765' },
};
const cache = !refresh ? await readFile(cachePath, 'utf8').then(JSON.parse).catch(() => ({})) : {};
const previousImages = await readFile(imageManifestPath, 'utf8').then(JSON.parse).catch(() => ({}));
const errors = [];
const page = JSON.parse(await readFile(path.join(root, 'verification/page-data.json'), 'utf8'));

async function get(url, binary = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${url}`);
        error.status = response.status;
        throw error;
      }
      if (binary) return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') };
      return await response.json();
    } catch (error) {
      if (attempt === 2 || error.status === 404) throw error;
      await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
}
async function query(method, input) {
  const result = await get(`${wiki}/api/trpc/${method}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`);
  if (result.error) throw new Error(result.error.json?.message || `Wiki query failed: ${method}`);
  return result.result?.data?.json;
}
async function pool(values, action, concurrency = 4) {
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < values.length) await action(values[next++]);
  }));
}

function summarize(vehicle, branch, era) {
  const { info, modules = {}, alterations = {} } = vehicle;
  // Add-on and era-specific modules are alternatives, not part of the base vehicle.
  const inactive = new Set();
  for (const change of [...Object.values(alterations.addons || {}), ...Object.values(alterations.loadouts || {})]) {
    for (const ref of change.changes?.add || []) inactive.add(ref);
  }
  const eraChanges = alterations.loadouts?.[era]?.changes;
  for (const ref of eraChanges?.remove || []) inactive.add(ref);
  for (const ref of eraChanges?.add || []) inactive.delete(ref);
  const active = Object.entries(modules).filter(([ref]) => !inactive.has(ref)).map(([, module]) => module);
  const drive = active.find(m => m.type === 'DriveData')?.data;
  const turrets = active.filter(m => m.type === 'Turret').map(m => m.data);
  const sights = turrets.flatMap(t => t.sights || []);
  const isGunnerTurret = turret => (turret.control || []).some(ref => /gunner/i.test(modules[ref]?.data?.name || ''));
  const weaponRefs = [...turrets].sort((a, b) => Number(isGunnerTurret(b)) - Number(isGunnerTurret(a)))
    .flatMap(t => [...(t.weapons || [])].sort((a, b) => (modules[a]?.data?.orderIndex || 0) - (modules[b]?.data?.orderIndex || 0)));
  const orderedWeapons = [...new Set(weaponRefs)].filter(ref => !inactive.has(ref)).map(ref => modules[ref]).filter(m => m?.type === 'Weapon');
  const weapons = orderedWeapons.map(m => ({
    name: m.data.name,
    reload: m.data.reloadSpeed,
  })).filter(m => m.name);
  const uniqueWeapons = [...new Map(weapons.map(w => [w.name, w])).values()];
  return {
    name: info.name,
    gameId: info.gameId,
    source: `${wiki}/${branch}/vehicles/${info.slug}`,
    retrievedAt: info.lastRetrieved,
    role: info.role,
    team: info.team,
    description: info.description || null,
    article: vehicle.content?.Description || null,
    locomotion: info.locomotion,
    classes: info.supportedClasses || [],
    mass: drive?.mass,
    speed: drive?.engine?.forwardSpeed,
    reverseSpeed: drive?.engine?.reverseSpeed,
    horsepower: drive?.engine?.horsepower,
    engine: drive?.engine?.name,
    seats: active.filter(m => m.type === 'Seat').length || undefined,
    weapons: uniqueWeapons,
    features: [
      info.amphibious && 'amphibious',
      turrets.some(t => t.stabilizer) && 'stabilizer',
      sights.some(s => s.zoom?.thermal || s.thermal) && 'thermal',
      sights.some(s => s.fcs) && 'fcs',
      turrets.some(t => t.lws) && 'lws',
      turrets.some(t => t.maws) && 'maws',
      active.some(m => m.type === 'APS') && 'aps',
      active.some(m => m.type === 'ESS') && 'ess',
    ].filter(Boolean),
    availability: info.availability,
  };
}

const all = [];
for (const [branch, source] of Object.entries(sources)) {
  const listed = offline
    ? Object.entries(cache).filter(([key]) => key.startsWith(branch + '/')).map(([, v]) => ({ slug: v.info.slug }))
    : await query('vehicles.list', { placeId: source.placeId });
  if (!Array.isArray(listed) || !listed.length) throw new Error(`Empty vehicle list: ${branch}`);
  let done = 0;
  await pool(listed, async row => {
    const key = `${branch}/${row.slug}`;
    try {
      const vehicle = cache[key] || await query('vehicles.bySlug', { placeId: source.placeId, slug: row.slug });
      if (!vehicle?.info?.gameId) throw new Error(`Vehicle data missing: ${key}`);
      cache[key] = vehicle;
      all.push({ branch, vehicle });
    } catch (error) { errors.push({ key, error: error.message }); }
    if (++done % 50 === 0 || done === listed.length) console.log(`${branch}: ${done}/${listed.length} vehicle records`);
  });
  // The editor also contains unlisted/event vehicles omitted from the wiki's navigation.
  // Read their public pages by slug, accepting a result only when its game ID matches.
  const existing = all.filter(v => v.branch === branch).map(v => v.vehicle.info);
  const unlisted = page.vehicles.filter(row => row.places.includes(branch) && !existing.some(info => info.gameId === row.id || info.name === row.displayName));
  await pool(offline ? [] : unlisted, async row => {
    const candidates = [...new Set([row.displayName, row.id].flatMap(name => [
      name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'),
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ]))];
    for (const slug of candidates) {
      const key = `${branch}/${slug}`;
      try {
        const vehicle = cache[key] || await query('vehicles.bySlug', { placeId: source.placeId, slug });
        if (vehicle?.info?.gameId !== row.id) continue;
        cache[key] = vehicle;
        all.push({ branch, vehicle });
        break;
      } catch { /* A candidate slug may legitimately not exist. */ }
    }
  });
  console.log(`${branch}: ${all.filter(v => v.branch === branch).length} records including unlisted vehicles`);
}
await writeFile(cachePath, JSON.stringify(cache));

const byId = new Map();
for (const { branch, vehicle } of all) {
  const { info } = vehicle;
  const entry = byId.get(info.gameId) || { id: info.gameId, displayName: info.name, places: {} };
  const base = summarize(vehicle, branch);
  const eras = Object.fromEntries(Object.keys(vehicle.alterations?.loadouts || {}).map(era => [era, summarize(vehicle, branch, era)]));
  entry.places[branch] = { ...base, ...buildVehicleModifications(vehicle), ...(Object.keys(eras).length ? { eras } : {}) };
  byId.set(info.gameId, entry);
}
// IDs are authoritative; display-name matching is allowed only when it is exact and unambiguous.
const entries = {};
const missing = [];
for (const row of page.vehicles) {
  const candidates = [...byId.values()].filter(v => v.displayName === row.displayName);
  const entry = byId.get(row.id) || (candidates.length === 1 ? candidates[0] : null);
  if (entry) entries[row.id] = { ...entry, id: row.id, displayName: row.displayName };
  else { entries[row.id] = { id: row.id, displayName: row.displayName, places: {} }; missing.push(row); }
}
// Also resolve custom/imported vehicles by current game ID.
for (const [id, entry] of byId) if (!entries[id]) entries[id] = entry;

const imageDir = path.join(root, 'public/assets/vehicles');
await mkdir(imageDir, { recursive: true });
const slugs = [...new Set(all.map(({ vehicle }) => vehicle.info.slug))];
const images = new Map();
const missingImages = [];
let done = 0;
await pool(slugs, async slug => {
  const local = `/assets/vehicles/${slug}.webp`;
  const filename = path.join(root, 'public', local);
  const records = all.filter(({ vehicle }) => vehicle.info.slug === slug);
  // Renamed wiki pages can still have their renders stored under the stable game ID.
  const legacySlugs = records.map(({ vehicle }) => vehicle.info.gameId.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'));
  const candidates = [...new Set([slug, ...legacySlugs])];
  let remote = previousImages[slug]?.source || `https://img.astrid.ovh/public-stats-images/${slug}/perspective.png?w=640&q=80`;
  try {
    if (refresh || !previousImages[slug] || !(await stat(filename).catch(() => null))?.size) {
      if (offline) { missingImages.push(slug); return; }
      let image;
      for (const candidate of candidates) {
        remote = `https://img.astrid.ovh/public-stats-images/${candidate}/perspective.png?w=640&q=80`;
        try { image = await get(remote, true); break; } catch (error) { if (error.status !== 404) throw error; }
      }
      if (!image) { missingImages.push(slug); return; }
      if (!image.type?.startsWith('image/') || image.bytes.length < 100) throw new Error(`Invalid image: ${slug}`);
      await writeFile(filename, image.bytes);
    }
    images.set(slug, { local, source: remote });
  } catch (error) { errors.push({ key: `image/${slug}`, error: error.message }); }
  if (++done % 50 === 0 || done === slugs.length) console.log(`Images: ${done}/${slugs.length}`);
});
await writeFile(imageManifestPath, JSON.stringify(Object.fromEntries(images), null, 2) + '\n');
for (const entry of Object.values(entries)) for (const data of Object.values(entry.places)) {
  const slug = data.source.split('/').at(-1);
  const image = images.get(slug);
  data.image = image?.local || null;
  data.imageSource = image?.source || null;
}
// MTC and RV use the same asset bank. Reuse a render for an identical game ID
// when only the renamed page's image path is missing.
for (const entry of Object.values(entries)) {
  const image = Object.values(entry.places).find(data => data.image);
  if (!image) continue;
  for (const data of Object.values(entry.places)) if (!data.image) {
    data.image = image.image;
    data.imageSource = image.imageSource;
  }
}
// Verified crops from the in-game admin spawner take priority over missing wiki renders.
const captures = JSON.parse(await readFile(path.join(root, 'config/vehicle-images.json'), 'utf8'));
for (const capture of captures) {
  if (!entries[capture.gameId]) throw new Error(`Unknown capture ID: ${capture.gameId}`);
  if (capture.sourceKind !== 'roblox-spawner' || !/^\/assets\/vehicles\/roblox-[a-z0-9-]+\.webp$/.test(capture.image)) throw new Error('Invalid capture provenance');
  if (!(await stat(path.join(root, 'public', capture.image))).size) throw new Error(`Empty capture: ${capture.gameId}`);
  for (const data of Object.values(entries[capture.gameId].places)) {
    data.image = capture.image;
    data.imageSource = 'https://www.roblox.com/games/95721658376580/';
    data.imageSourceKind = capture.sourceKind;
    data.imageCapturedAt = capture.capturedAt;
  }
}
const covered = page.vehicles.filter(v => Object.keys(entries[v.id].places).length).length;
const catalog = {
  schemaVersion: 1,
  syncedAt: new Date().toISOString(),
  attribution: { name: 'Official Multicrew Tank Combat Wiki', url: wiki, license: 'CC BY-NC 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  sources,
  vehicles: entries,
};
await mkdir(path.join(root, 'public/data'), { recursive: true });
await writeFile(path.join(root, 'public/data/vehicle-info.json'), JSON.stringify(catalog));
const withImages = page.vehicles.filter(v => Object.values(entries[v.id].places).some(p => p.image)).length;
const withoutImages = page.vehicles.filter(v => !Object.values(entries[v.id].places).some(p => p.image)).map(v => v.id);
const report = { covered, withImages, total: page.vehicles.length, downloadedImages: images.size, records: all.length, missing, withoutImages, missingImageSlugs: missingImages, errors };
await writeFile(path.join(root, 'verification/vehicle-info-report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(path.join(root, 'verification/missing-vehicle-images.txt'), withoutImages.map(id => `${entries[id].displayName} [${id}]`).join('\n') + '\n');
console.log(JSON.stringify({ covered, withImages, total: report.total, downloadedImages: images.size, missing, errors }, null, 2));
if (errors.length) process.exitCode = 1;
