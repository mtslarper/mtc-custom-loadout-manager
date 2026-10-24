/* Bounded, schema-checked local file/share imports. No remote requests. */
(() => {
  'use strict';
  const MAX_BYTES = 4 * 1024 * 1024, MAX_ITEMS = 20000, MAX_COLUMNS = 64;
  const classes = ['Infantry', 'Crewman', 'Engineer'];
  const categories = ['Primary', 'Secondary', 'Tertiary', 'PassiveTools'];
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
  const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  const fail = message => { throw new Error(message); };
  const text = (s, field) => typeof s === 'string' && s.length > 0 && s.length <= 160 && !/[\x00-\x1f]/.test(s) && !forbidden.has(s) ? s : fail(`Invalid ${field}`);
  const numeric = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
  function inspect(value, depth = 0, counter = { n: 0 }) {
    if (++counter.n > 250000 || depth > 32) fail('JSON is too complex');
    if (typeof value === 'number' && !Number.isFinite(value)) fail('Non-finite number');
    if (value && typeof value === 'object') for (const key of Object.keys(value)) {
      if (forbidden.has(key)) fail('Unsafe object key');
      inspect(value[key], depth + 1, counter);
    }
  }
  function tier(v) { if (v !== undefined && (!Number.isInteger(v) || v < 1 || v > 7)) fail('Tier must be 1–7'); return v; }
  function validateEditor(raw) {
    inspect(raw);
    if (!object(raw) || !Array.isArray(raw.columns) || !raw.columns.length || raw.columns.length > MAX_COLUMNS || !object(raw.items)) fail('Invalid editor preset');
    const teams = new Set();
    const columns = raw.columns.map((column, index) => {
      if (!object(column)) fail('Invalid column');
      if (index === 0) return { name: 'Shared', undeletable: true, unconfigurable: true };
      const result = {};
      if (column.team !== undefined) {
        const team = text(column.team, 'team');
        if (classes.includes(team) || teams.has(team)) fail('Duplicate or reserved team name');
        teams.add(team); result.team = team;
      }
      if (column.name !== undefined) result.name = text(column.name, 'column name');
      return result;
    });
    const entries = Object.entries(raw.items);
    if (entries.length > MAX_ITEMS) fail('Too many items');
    const items = {};
    for (const [key, item] of entries) {
      text(key, 'item key');
      if (!object(item) || item.id !== key || !['vehicle', 'weapon'].includes(item.type) || !object(item.properties)) fail('Invalid item');
      if (!Number.isInteger(item.columnIndex) || item.columnIndex < 0 || item.columnIndex >= columns.length) fail('Invalid item column');
      const properties = {};
      if (Object.keys(item.properties).length > 64) fail('Too many item properties');
      for (const [key, property] of Object.entries(item.properties)) {
        text(key, 'property key');
        if (!object(property)) fail('Invalid property');
        if (key === 'category' && item.type === 'weapon') {
          if (!categories.includes(property.value)) fail('Invalid weapon category');
          properties.category = { name: 'Category', type: 'select', options: [...categories], value: property.value };
        } else {
          if (property.type !== 'number' || property.value !== undefined && !numeric(property.value)) fail('Invalid numeric property');
          const output = { name: text(property.name || key, 'property name'), type: 'number' };
          if (property.exportKey !== undefined) {
            if (['NameID', 'Tier'].includes(property.exportKey)) fail('Reserved export key');
            output.exportKey = text(property.exportKey, 'export key');
          }
          if (property.value !== undefined) output.value = property.value;
          properties[key] = output;
        }
      }
      if (item.type === 'weapon' && (!classes.includes(item.className) || !own(properties, 'category'))) fail('Invalid weapon class');
      const output = { id: key, name: text(item.name, 'item name'), type: item.type, columnIndex: item.columnIndex, properties };
      if (item.type === 'weapon') output.className = item.className;
      if (item.tier !== undefined) output.tier = tier(item.tier);
      items[key] = output;
    }
    return { columns, items, selected: null };
  }
  function fromGame(raw) {
    inspect(raw);
    if (!object(raw.WeaponClasses) || !object(raw.Vehicles)) fail('Invalid game export');
    const columns = [{ name: 'Shared', undeletable: true, unconfigurable: true }], items = {}, teams = new Map();
    const column = team => {
      text(team, 'team'); if (classes.includes(team)) fail('Reserved team name');
      if (!teams.has(team)) { if (columns.length >= MAX_COLUMNS) fail('Too many teams'); teams.set(team, columns.length); columns.push({ team }); }
      return teams.get(team);
    };
    const array = value => value === undefined ? [] : Array.isArray(value) && value.length <= MAX_ITEMS ? value : fail('Invalid equipment list');
    let count = 0;
    function add(entry, col, type, className, category) {
      if (++count > MAX_ITEMS || !object(entry)) fail('Too many or invalid items');
      const id = crypto.randomUUID(), properties = {};
      if (type === 'weapon') properties.category = { name: 'Category', type: 'select', options: [...categories], value: category };
      if (type === 'vehicle') for (const [key, field] of Object.entries({ LimitPerTeam: 'teamLimit', LimitPerMatch: 'matchLimit', LimitPerMatchTeam: 'teamMatchLimit' })) properties[field] = { name: key, exportKey: key, type: 'number', ...(entry[key] !== undefined ? { value: entry[key] } : {}) };
      for (const [key, value] of Object.entries(entry)) {
        if (['NameID', 'Tier'].includes(key) || type === 'vehicle' && ['LimitPerTeam', 'LimitPerMatch', 'LimitPerMatchTeam'].includes(key)) continue;
        if (!numeric(value)) fail('Unsupported equipment property');
        properties[text(key, 'export key')] = { name: key, exportKey: key, type: 'number', value };
      }
      items[id] = { id, name: entry.NameID, columnIndex: col, type, properties, ...(className ? { className } : {}), ...(entry.Tier !== undefined ? { tier: entry.Tier } : {}) };
    }
    const weapons = (value, col) => {
      if (!object(value)) fail('Invalid weapon classes');
      for (const name of classes) {
        if (value[name] !== undefined && !object(value[name])) fail('Invalid class');
        for (const cat of categories) for (const entry of array(value[name]?.[cat])) add(entry, col, 'weapon', name, cat);
      }
    };
    const teamVehicles = raw.Vehicles.TeamSpecificLoadout || {};
    if (!object(teamVehicles)) fail('Invalid team vehicle list');
    weapons(raw.WeaponClasses, 0);
    for (const [name, value] of Object.entries(raw.WeaponClasses)) if (!classes.includes(name)) weapons(value, column(name));
    for (const entry of array(raw.Vehicles.GeneralLoadout)) add(entry, 0, 'vehicle');
    for (const [name, value] of Object.entries(teamVehicles)) { const index = column(name); for (const entry of array(value)) add(entry, index, 'vehicle'); }
    return validateEditor({ columns, items });
  }
  async function readFile(file) {
    if (!Number.isFinite(file.size) || file.size > MAX_BYTES) fail('File exceeds 4 MiB');
    let raw;
    try { raw = JSON.parse(await file.text()); } catch { fail('Invalid JSON file'); }
    inspect(raw);
    const name = typeof raw?.name === 'string' ? raw.name : file.name.replace(/\.editor\.json$|\.json$/i, '');
    if (raw?.save && !raw.columns) raw = raw.save;
    const save = raw?.WeaponClasses && raw?.Vehicles ? fromGame(raw) : validateEditor(raw);
    return { name, save };
  }
  async function decodeShare(encoded, unpack) {
    if (typeof encoded !== 'string' || encoded.length > 131072 || !/^[A-Za-z0-9_-]+$/.test(encoded)) fail('Invalid or oversized share link');
    const compressed = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = []; let size = 0;
    try { while (true) { const result = await reader.read(); if (result.done) break; size += result.value.length; if (size > MAX_BYTES) { await reader.cancel(); fail('Share data exceeds 4 MiB'); } chunks.push(result.value); } }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const raw = unpack(bytes); inspect(raw);
    if (!object(raw) || !Array.isArray(raw.columns) || !object(raw.items)) fail('Invalid shared preset');
    const columns = raw.columns.map(c => ({ ...(c.n ? { name: c.n } : {}), ...(c.t ? { team: c.t } : {}) }));
    const items = {};
    for (const [id, item] of Object.entries(raw.items)) {
      if (!object(item) || !object(item.p)) fail('Invalid shared item');
      const properties = item.t === 'vehicle' ? {
        teamLimit: { name: 'Team Limit', type: 'number', exportKey: 'LimitPerTeam' },
        matchLimit: { name: 'Match Limit', type: 'number', exportKey: 'LimitPerMatch' },
        teamMatchLimit: { name: 'Team Match Limit', type: 'number', exportKey: 'LimitPerMatchTeam' },
      } : {};
      for (const [key, property] of Object.entries(item.p)) {
        if (!object(property)) fail('Invalid shared property');
        properties[key] = key === 'category' ? { name: 'Category', type: 'select', value: property.v }
          : { name: key, type: 'number', exportKey: ({ teamLimit: 'LimitPerTeam', matchLimit: 'LimitPerMatch', teamMatchLimit: 'LimitPerMatchTeam' })[key] || key, value: property.v };
      }
      items[id] = { id, name: item.n, type: item.t, properties, columnIndex: item.c, className: item.cl, tier: item.ti };
    }
    return validateEditor({ columns, items });
  }
  window.LoadoutIO = Object.freeze({ validateEditor, fromGame, readFile, decodeShare, limits: Object.freeze({ maxBytes: MAX_BYTES, maxItems: MAX_ITEMS, maxColumns: MAX_COLUMNS }) });
})();
