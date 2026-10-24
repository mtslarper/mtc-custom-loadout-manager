import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(path.join(root, name), 'utf8');
const catalog = JSON.parse(await read('public/data/vehicle-info.json'));
const page = JSON.parse(await read('verification/page-data.json'));
const cache = JSON.parse(await read('verification/vehicle-source-data.json'));
const report = JSON.parse(await read('verification/vehicle-info-report.json'));
const captures = JSON.parse(await read('config/vehicle-images.json'));
assert.equal(catalog.schemaVersion, 1);
let covered = 0, withImages = 0;
const images = new Set();
for (const row of page.vehicles) {
  const record = catalog.vehicles[row.id];
  assert(record, `Missing editor vehicle: ${row.id}`);
  assert.equal(record.displayName, row.displayName);
  if (Object.keys(record.places).length) covered++;
  if (Object.values(record.places).some(p => p.image)) withImages++;
}
for (const [id, record] of Object.entries(catalog.vehicles)) {
  for (const [branch, data] of Object.entries(record.places)) {
    const slug = data.source.split('/').at(-1);
    const source = cache[`${branch}/${slug}`];
    assert(source, `Source unavailable: ${branch}/${slug}`);
    assert(source.info.gameId === id || source.info.name === record.displayName, `Unrelated vehicle matched to ${id}`);
    assert.equal(data.description, source.info.description || null);
    for (const [field, sourceField] of [['modifications', 'addons'], ['eraModifications', 'loadouts']]) {
      const original = source.alterations?.[sourceField] || {};
      assert.deepEqual(data[field].map(m => m.name), Object.keys(original), `${id}: missing modifications`);
      for (const modification of data[field]) {
        assert.equal(modification.cost, Number.isFinite(original[modification.name].cost) ? original[modification.name].cost : null);
        assert(modification.description.length > 10);
        assert(['game', 'changes', 'name'].includes(modification.descriptionSource));
        assert(!JSON.stringify(modification).includes('#/modules/'), `${id}: internal references leaked into descriptions`);
        assert(Array.isArray(modification.changes));
      }
    }
    for (const variant of [data, ...Object.values(data.eras || {})]) {
      for (const key of ['mass', 'speed', 'reverseSpeed', 'horsepower', 'seats']) {
        if (variant[key] !== undefined) assert(Number.isFinite(variant[key]) && variant[key] >= 0, `${id}: invalid ${key}`);
      }
      assert(Array.isArray(variant.weapons));
    }
    if (data.image) {
      assert(data.image.startsWith('/assets/vehicles/') && !data.image.includes('..'));
      if (data.imageSourceKind === 'roblox-spawner') {
        const capture = captures.find(c => c.gameId === id);
        assert(capture && capture.image === data.image && capture.capturedAt === data.imageCapturedAt, `Unverified capture: ${id}`);
        assert.equal(data.imageSource, 'https://www.roblox.com/games/95721658376580/');
      } else assert(data.imageSource.startsWith('https://img.astrid.ovh/public-stats-images/'));
      images.add(data.image);
    }
  }
}
for (const image of images) {
  const bytes = await readFile(path.join(root, 'public', image));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `Invalid WebP: ${image}`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `Invalid WebP: ${image}`);
}
assert.equal(covered, report.covered);
assert.equal(withImages, report.withImages);
assert.equal(report.errors.length, 0);
const is3 = catalog.vehicles['IS-3'].places.mtc;
assert.equal(is3.speed, 40);
assert.equal(is3.mass, 48);
assert.equal(is3.seats, 4);
assert.equal(is3.weapons[0].name, '122mm D-25T');
assert.equal(catalog.vehicles['M1A2 SEP V3'].places.mtc.mass, 66.8, 'TUSK add-on must not replace base mass');
const abramsMods = catalog.vehicles['M1A2 SEP V3'].places.mtc.modifications;
const trophy = abramsMods.find(m => m.name === 'Trophy APS + TUSK');
assert.equal(trophy.cost, 750);
assert(trophy.changes.some(c => c.includes('66,8 → 72,7 т')));
assert(trophy.changes.some(c => c.includes('Активная защита: Trophy')));
const ammoUpgrade = abramsMods.find(m => m.name === 'M829A4');
assert.deepEqual(ammoUpgrade.changes, ['Добавляет боеприпасы: M829A4.', 'Убирает боеприпасы: M829A3.']);
const floaters = catalog.vehicles['BMP-3 2017'].places.mtc.modifications.find(m => m.name === 'Floaters');
assert.equal(floaters.descriptionSource, 'name');
assert.equal(floaters.moduleChangesPublished, false);
assert.deepEqual(floaters.changes, []);
assert(catalog.vehicles['IS-3'].places.mtc.eraModifications[0].changes.some(c => c.includes('BR-471D')));
const html = await read('public/index.html');
assert.equal(html.split('src="/vehicle-hover.js"').length, 2);
assert.equal(html.split('href="/vehicle-hover.css"').length, 2);
const chunk = await read('public/_next/static/chunks/pages/index-211ecad247b1f53d.js');
assert.equal(chunk.split('"data-vehicle-id":"vehicle"===t.type?t.name:void 0').length, 2);
assert(chunk.includes('Import from file') && chunk.includes('function __msuse'));
for (const file of ['public/vehicle-hover.js', 'public/vehicle-hover.css']) assert((await stat(path.join(root, file))).size > 0);
console.log(`OK: ${page.vehicles.length} editor IDs; ${covered} with stats; ${withImages} with images; ${images.size} valid local WebP files; base stats and patches checked.`);
