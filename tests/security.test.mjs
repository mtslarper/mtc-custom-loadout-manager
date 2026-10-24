import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import http from 'node:http';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createStaticServer, contentSecurityPolicy } from '../server.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ioCode = await readFile(path.join(root, 'public/loadout-io.js'), 'utf8');
const context = { window: {}, crypto, Blob, DecompressionStream, atob, Uint8Array, console };
vm.runInNewContext(ioCode, context);
const io = context.window.LoadoutIO;
const page = JSON.parse(await readFile(path.join(root, 'verification/page-data.json'), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));

test('all six original presets survive schema validation', () => {
  for (const preset of page.presets) {
    const actual = plain(io.validateEditor(preset));
    assert.deepEqual(actual.columns, preset.columns);
    assert.equal(Object.keys(actual.items).length, Object.keys(preset.items).length);
    for (const [id, item] of Object.entries(preset.items)) {
      assert.equal(actual.items[id].name, item.name);
      assert.equal(actual.items[id].tier, item.tier);
      for (const [key, prop] of Object.entries(item.properties)) assert.equal(actual.items[id].properties[key].value, prop.value);
    }
  }
});
test('malformed/prototype-bearing imports are rejected without global pollution', () => {
  const bad = [null, { columns: [], items: {} }, { columns: [{}], items: [] }, JSON.parse('{"columns":[{}],"items":{},"__proto__":{"polluted":true}}')];
  for (const value of bad) assert.throws(() => io.validateEditor(value));
  const item = structuredClone(page.presets[0]);
  Object.values(item.items)[0].tier = 9;
  assert.throws(() => io.validateEditor(item), /Tier/);
  assert.equal({}.polluted, undefined);
  assert.throws(() => io.validateEditor({ columns: Array(65).fill({}), items: {} }), /Invalid editor/);
});
test('game import keeps numeric properties, shared lists and empty teams', () => {
  const game = { WeaponClasses: { Infantry: { Tertiary: [{ NameID: 'C4', Tier: 1, LevelRequirement: 0 }] } }, Vehicles: { GeneralLoadout: [{ NameID: 'IS-3', LimitPerTeam: 2 }], TeamSpecificLoadout: { Empty: [] } } };
  const result = plain(io.fromGame(game));
  assert.equal(result.columns[1].team, 'Empty');
  const items = Object.values(result.items);
  assert.equal(items.find(i => i.name === 'C4').properties.LevelRequirement.value, 0);
  assert.equal(items.find(i => i.name === 'IS-3').properties.teamLimit.value, 2);
});
test('file size and malformed JSON are rejected', async () => {
  await assert.rejects(io.readFile({ size: 5 * 1024 * 1024, name: 'large.json', text: async () => '{}' }), /4 MiB/);
  await assert.rejects(io.readFile({ size: 1, name: 'invalid.json', text: async () => '{' }));
});
test('share decoding bounds decompression and retains editable limit controls', async () => {
  const compact = { columns: [{ n: 'Shared' }], items: { test: { n: 'IS-3', t: 'vehicle', p: {}, c: 0 } } };
  const encoded = gzipSync(JSON.stringify(compact)).toString('base64url');
  const result = plain(await io.decodeShare(encoded, bytes => JSON.parse(new TextDecoder().decode(bytes))));
  assert.equal(result.items.test.properties.teamLimit.exportKey, 'LimitPerTeam');
  const bomb = gzipSync(Buffer.alloc(4 * 1024 * 1024 + 1)).toString('base64url');
  await assert.rejects(io.decodeShare(bomb, () => { throw Error('Unpack must not run'); }), /4 MiB/);
  await assert.rejects(io.decodeShare('!invalid', () => ({})), /Invalid/);
});
test('multi-copy keeps matching vehicles in other teams', async () => {
  const code = await readFile(path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js'), 'utf8');
  const start = code.indexOf('if(__ms.has(t.id)){'), end = code.indexOf('let l={...t.data.current.item};', start);
  const n = { source: { id: 'source', name: 'IS-3', type: 'vehicle', properties: {}, columnIndex: 1, tier: 1 }, other: { id: 'other', name: 'IS-3', type: 'vehicle', properties: {}, columnIndex: 2, tier: 1 } };
  const selection = new Set(['source']);
  vm.runInNewContext('(()=>{' + code.slice(start, end) + '})()', { t: { id: 'source' }, r: { data: { current: { columnIndex: 0, tier: 2 } } }, n, __ms: selection, __msset: fn => fn(selection), structuredClone, el: { A: () => 'copy' }, a: (id, item) => { n[id] = item; }, i: id => { delete n[id]; } });
  assert(n.source && n.other && n.copy);
  assert.equal(n.copy.columnIndex, 0);
});
test('static server rejects rebinding, cross-origin, hidden paths, traversal and symlinks', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'mts-security-'));
  const publicDir = path.join(temp, 'public'); await mkdir(publicDir);
  await writeFile(path.join(publicDir, 'index.html'), '<!doctype html>');
  await writeFile(path.join(temp, 'outside.json'), '{}');
  const server = createStaticServer(publicDir);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const request = (url, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: url, method, headers: { Host: `localhost:${port}`, ...headers } }, res => { res.resume(); res.on('end', () => resolve(res)); });
    req.on('error', reject); req.end();
  });
  try {
    const ok = await request('/'); assert.equal(ok.statusCode, 200); assert.equal(ok.headers['x-content-type-options'], 'nosniff');
    assert.equal((await request('/', { Host: 'attacker.invalid' })).statusCode, 403);
    assert.equal((await request('/', { Origin: 'https://attacker.invalid' })).statusCode, 403);
    assert.equal((await request('/', { 'Sec-Fetch-Site': 'cross-site' })).statusCode, 403);
    assert.equal((await request('/.env')).statusCode, 403);
    assert.equal((await request('/%ZZ')).statusCode, 400);
    assert.equal((await request('/file.js:stream')).statusCode, 400);
    assert.equal((await request('/index.html.orig')).statusCode, 404);
    assert.notEqual((await request('/..%5coutside.json')).statusCode, 200);
    assert.equal((await request('/', {}, 'POST')).statusCode, 405);
    assert.equal((await request('/', {}, 'HEAD')).statusCode, 200);
    try { await symlink(temp, path.join(publicDir, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); assert.equal((await request('/escape/outside.json')).statusCode, 403); }
    catch (error) { if (!['EPERM', 'EACCES'].includes(error.code)) throw error; }
    assert(!contentSecurityPolicy.includes('unsafe-eval'));
    assert(!contentSecurityPolicy.includes("script-src 'self' 'unsafe-inline'"));
  } finally {
    await new Promise(resolve => server.close(resolve));
    const relative = path.relative(os.tmpdir(), temp);
    if (!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(temp).startsWith('mts-security-')) await rm(temp, { recursive: true, force: true });
  }
});
