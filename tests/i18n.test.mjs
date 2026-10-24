import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildVehicleModifications } from '../tools/lib/vehicle-modifications.mjs';

const root = new URL('../', import.meta.url);
const script = await readFile(new URL('public/i18n.js', root), 'utf8');
function runtime(saved = {}, unavailable = false) {
  const storage = new Map(Object.entries(saved)), events = [];
  const window = { dispatchEvent: event => events.push(event.type) };
  const document = { documentElement: { lang: 'en' } };
  vm.runInNewContext(script, { window, document, Event, localStorage: {
    getItem: key => { if (unavailable) throw Error('Storage blocked'); return storage.get(key); },
    setItem: (key, value) => { if (unavailable) throw Error('Storage blocked'); storage.set(key, value); },
  } });
  return { i18n: window.LoadoutI18n, document, storage, events };
}

test('locale changes labels and messages without touching stored game data', () => {
  const saved = { data: '{"state":{"items":{"IS-3":{"name":"IS-3"}}}}', saves: '["My custom loadout"]' };
  const { i18n, document, storage, events } = runtime(saved);
  let updates = 0;
  const unsubscribe = i18n.subscribe(() => updates++);
  assert.equal(i18n.getLanguage(), 'en');
  assert.equal(i18n.t('Modifications ({count})', { count: 4 }), 'Modifications (4)');
  i18n.setLanguage('ru');
  assert.equal(i18n.t('Manage'), 'Управление');
  assert.equal(i18n.t('Modifications ({count})', { count: 4 }), 'Модификации (4)');
  assert.equal(i18n.message('Import failed - test.json: File exceeds 4 MiB'), 'Ошибка импорта — test.json: Размер файла превышает 4 МиБ');
  assert.equal(i18n.message('Imported 2 preset(s) from file'), 'Импортировано наборов из файлов: 2');
  assert.equal(i18n.message('Invalid item key'), 'Некорректное поле: ключ элемента');
  assert.equal(i18n.t('IS-3'), 'IS-3');
  assert.equal(i18n.t('constructor'), 'constructor');
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(storage.get('data'), saved.data);
  assert.equal(storage.get('saves'), saved.saves);
  assert.equal(storage.get('loadout-language'), 'ru');
  assert.equal(updates, 1);
  assert.deepEqual(events, ['loadout-language-change']);
  i18n.setLanguage('bad');
  assert.equal(updates, 1);
  unsubscribe();
  i18n.setLanguage('en');
  assert.equal(i18n.t('LimitPerTeam'), 'Team Limit');
  assert.equal(i18n.message('Successfully imported loadout'), 'Successfully imported loadout');
  assert.equal(updates, 1);
});

test('saved language restores after English hydration and works with blocked storage', () => {
  const restored = runtime({ 'loadout-language': 'ru' });
  assert.equal(restored.i18n.getLanguage(), 'en');
  restored.i18n.restoreLanguage();
  assert.equal(restored.i18n.getLanguage(), 'ru');
  assert.equal(restored.document.documentElement.lang, 'ru');
  const blocked = runtime({}, true);
  blocked.i18n.restoreLanguage();
  blocked.i18n.setLanguage('ru');
  assert.equal(blocked.i18n.t('Vehicles'), 'Техника');
});

test('English modification descriptions retain source costs, weapons and numeric changes', async () => {
  const cache = JSON.parse(await readFile(new URL('verification/vehicle-source-data.json', root), 'utf8'));
  const vehicle = Object.values(cache).find(v => v.info.gameId === 'M1A2 SEP V3');
  const { modifications } = buildVehicleModifications(vehicle);
  const trophy = modifications.find(m => m.name === 'Trophy APS + TUSK');
  assert.equal(trophy.cost, 750);
  assert(trophy.changes.some(c => c.includes('66,8 → 72,7 т')));
  assert(trophy.translations.en.changes.some(c => c.includes('66.8 → 72.7 t')));
  assert(trophy.translations.en.changes.some(c => c.includes('Active protection: Trophy')));
  const ammo = modifications.find(m => m.name === 'M829A4');
  assert.deepEqual(ammo.translations.en.changes, ['Adds ammunition: M829A4.', 'Removes ammunition: M829A3.']);
  for (const original of Object.values(cache)) {
    const generated = buildVehicleModifications(original);
    for (const mod of [...generated.modifications, ...generated.eraModifications]) {
      assert(mod.translations.en.description.length > 0);
      assert.equal(mod.translations.en.changes.length, mod.changes.length);
    }
  }
});
