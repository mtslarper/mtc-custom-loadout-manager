import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile, stat, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { buildPages, defaultBasePath, validateBasePath } from '../tools/build-pages.mjs';
import { createPagesPreview } from '../tools/preview-pages.mjs';

const root = path.resolve(import.meta.dirname, '..');
test('Pages base paths reject traversal, URLs and script delimiters', () => {
  assert.equal(validateBasePath(defaultBasePath + '/'), defaultBasePath);
  assert.equal(validateBasePath('/'), '');
  for (const bad of ['/../other', '/repo/./other', '//host', 'https://host/repo', '/repo?x=1', '/repo"', '/repo%2fother']) assert.throws(() => validateBasePath(bad), /Invalid Pages/);
});

test('Pages artifact serves prefixed assets without changing local files or exporting backups', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'mtc-pages-'));
  t.after(async () => {
    assert(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(temporary, { recursive: true, force: true });
  });
  await cp(path.join(root, 'public'), path.join(temporary, 'public'), { recursive: true });
  for (const name of ['public/private.orig', 'public/.env', 'server.mjs']) await writeFile(path.join(temporary, name), 'PRIVATE_SENTINEL');
  const original = await readFile(path.join(temporary, 'public/index.html'), 'utf8');
  const build = await buildPages({ projectRoot: temporary });
  assert.equal(await readFile(path.join(temporary, 'public/index.html'), 'utf8'), original);
  const read = name => readFile(path.join(build.directory, name), 'utf8');
  for (const name of ['private.orig', '.env', 'server.mjs', '_next/static/chunks/pages/index-211ecad247b1f53d.js.orig']) await assert.rejects(stat(path.join(build.directory, name)), { code: 'ENOENT' });
  const html = await read('index.html');
  const data = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.assetPrefix, defaultBasePath);
  const urls = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]);
  assert(urls.length > 15 && urls.every(url => url.startsWith(defaultBasePath + '/')));
  const css = await read('_next/static/css/6cbba9e26198f0b9.css');
  const fonts = [...css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(m => m[1]);
  assert(fonts.every(url => url.startsWith(defaultBasePath + '/')));
  const catalog = JSON.parse(await read('data/vehicle-info.json'));
  const images = Object.values(catalog.vehicles).flatMap(v => Object.values(v.places).map(p => p.image).filter(Boolean));
  assert(images.length > 370 && images.every(url => url.startsWith(defaultBasePath + '/assets/vehicles/')));
  for (const url of [...urls, ...fonts, ...new Set(images)]) assert((await stat(path.join(build.directory, url.slice(defaultBasePath.length + 1) || 'index.html'))).isFile(), url);
  assert((await read('vehicle-hover.js')).includes(`fetch('${defaultBasePath}/data/vehicle-info.json')`));
  assert((await read('_next/static/chunks/webpack-b4c0f9608a7d0640.js')).includes(`r.p="${defaultBasePath}/_next/"`));
  assert.equal(await read('.nojekyll'), '');
  // Execute the actual patched Next.js URL helpers, rather than testing a copy of them.
  const chunks = [];
  new vm.Script(await read('_next/static/chunks/main-d6a78ce3f358332f.js')).runInNewContext({ self: { webpackChunk_N_E: chunks } });
  const modules = chunks[0][1], cache = new Map();
  const require = id => {
    if (cache.has(id)) return cache.get(id).exports;
    assert.equal(typeof modules[id], 'function', `Missing router dependency ${id}`);
    const module = { exports: {} }; cache.set(id, module);
    modules[id](module, module.exports, require);
    return module.exports;
  };
  assert.equal(require(2150).addBasePath('/?x=1#test'), defaultBasePath + '?x=1#test');
  assert.equal(require(7205).hasBasePath(defaultBasePath + '/'), true);
  assert.equal(require(7205).hasBasePath(defaultBasePath + '-other/'), false);
  assert.equal(require(6731).removeBasePath(defaultBasePath + '/?x=1#test'), '/?x=1#test');
  assert.equal(require(6731).removeBasePath('/other/'), '/other/');
  const server = createPagesPreview({ directory: build.directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const url of urls) assert.equal((await fetch(origin + url)).status, 200, url);
    assert.equal((await fetch(origin + '/data/vehicle-info.json')).status, 404);
    const response = await fetch(origin + defaultBasePath + '?check=1', { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), defaultBasePath + '/?check=1');
    const pageData = await fetch(origin + defaultBasePath + '/_next/data/' + data.buildId + '/index.json').then(r => r.json());
    assert.deepEqual(pageData, data.props);
  } finally { await new Promise(resolve => server.close(resolve)); }
  await writeFile(path.join(build.directory, 'stale.txt'), 'STALE');
  await buildPages({ projectRoot: temporary, basePath: '' });
  await assert.rejects(stat(path.join(build.directory, 'stale.txt')), { code: 'ENOENT' });
  assert((await read('vehicle-hover.js')).includes("fetch('/data/vehicle-info.json')"));
});
