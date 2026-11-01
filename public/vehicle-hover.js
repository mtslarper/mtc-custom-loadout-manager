/* Local, framework-independent vehicle cards. Game/editor state is never modified. */
(() => {
  'use strict';
  if (window.__vehicleHoverInstalled) return;
  window.__vehicleHoverInstalled = true;
  const tr = (key, values) => window.LoadoutI18n.t(key, values);
  const card = document.createElement('aside');
  card.id = 'vehicle-hover-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', tr("Vehicle information"));
  document.body.append(card);

  const features = { amphibious: 'Amphibious', stabilizer: 'Stabilizer', thermal: 'Thermal sight', fcs: 'Fire control system', lws: 'Laser warning system', maws: 'Missile warning system', aps: 'Active protection', ess: 'Smoke screen' };
  const locomotions = { tracked: 'Tracked', wheeled: 'Wheeled', aerial: 'Aircraft' };
  let catalog, loadingError = false, anchor = null, showTimer, hideTimer, branch = 'mtc', era = '', view = 'overview';
  try { branch = localStorage.getItem('vehicle-info-branch') || 'mtc'; } catch {}
  const ready = fetch('/data/vehicle-info.json').then(response => {
    if (!response.ok) throw new Error('Vehicle catalog unavailable');
    return response.json();
  }).then(value => { catalog = value; }).catch(() => { loadingError = true; });

  // Weapon and placeable pictures from the wiki, keyed by the item name used in the editor.
  let weaponCatalog;
  const weaponsReady = fetch('/data/weapon-info.json').then(response => (response.ok ? response.json() : null)).then(value => { weaponCatalog = value; }).catch(() => {});

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function externalLink(text, url) {
    const a = el('a', '', text);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function number(value, suffix = '') {
    return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(window.LoadoutI18n.getLanguage() === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }).format(value) + suffix : null;
  }
  function position() {
    if (!anchor?.isConnected || card.hidden) return;
    const rect = anchor.getBoundingClientRect(), bounds = card.getBoundingClientRect();
    const gap = 12, margin = 12, width = window.innerWidth, height = window.innerHeight;
    let left = rect.right + gap;
    if (left + bounds.width > width - margin) left = rect.left - bounds.width - gap;
    if (left < margin) left = Math.min(Math.max(margin, rect.left), width - bounds.width - margin);
    let top = rect.top;
    if (left < rect.right && left + bounds.width > rect.left) top = rect.bottom + gap;
    top = Math.max(margin, Math.min(top, height - bounds.height - margin));
    card.style.left = `${Math.max(margin, left)}px`;
    card.style.top = `${top}px`;
  }
  function hide() {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    if (anchor) {
      const ids = (anchor.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== card.id);
      if (ids.length) anchor.setAttribute('aria-describedby', ids.join(' ')); else anchor.removeAttribute('aria-describedby');
    }
    card.hidden = true;
    anchor = null;
  }
  function scheduleHide() {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 180);
  }
  function modificationList(data) {
    const section = el('section', 'vh-modifications');
    section.append(el('p', 'vh-note', tr("Viewing modifications does not change the loadout. Costs use the selected game version.")));
    const groups = [
      [tr("Additional equipment"), data.modifications || []],
      [tr("Era variants"), data.eraModifications || []],
    ];
    if (!groups.some(([, list]) => list.length)) {
      section.append(el('p', 'vh-empty', tr("No published modifications are available for this vehicle.")));
    }
    for (const [label, items] of groups) {
      if (!items.length) continue;
      section.append(el('div', 'vh-subtitle', label));
      for (const item of items) {
        const localized = item.translations?.[window.LoadoutI18n.getLanguage()] || item;
        const details = el('details', 'vh-modification');
        const summary = el('summary', 'vh-mod-summary');
        const heading = el('span', 'vh-mod-heading');
        heading.append(el('span', 'vh-mod-name', item.name));
        heading.append(el('span', 'vh-mod-cost', item.kind === 'era' ? tr("Era variant")
          : item.cost === null ? tr("Cost unavailable") : tr('Cost: {cost}', { cost: number(item.cost) })));
        summary.append(heading);
        const content = el('div', 'vh-mod-content');
        if (item.era && item.kind !== 'era') content.append(el('span', 'vh-chip', tr('Era: {era}', { era: item.era })));
        content.append(el('p', 'vh-description', localized.description));
        if (localized.changes?.length) {
          const list = el('ul', 'vh-mod-changes');
          for (const change of localized.changes) list.append(el('li', '', change));
          content.append(list);
        }
        content.append(el('p', 'vh-mod-origin', item.descriptionSource === 'game' ? tr("In-game description")
          : item.descriptionSource === 'changes' ? tr("Description derived from published module changes")
          : tr("Explanation inferred from the name; detailed changes are not published")));
        details.append(summary, content);
        details.addEventListener('toggle', position);
        section.append(details);
      }
    }
    return section;
  }
  function render() {
    card.setAttribute('aria-label', tr('Vehicle information'));
    if (!anchor) return;
    const id = anchor.dataset.vehicleId;
    const record = catalog?.vehicles?.[id];
    const places = Object.keys(record?.places || {});
    const activeBranch = places.includes(branch) ? branch : places[0];
    const base = record?.places[activeBranch];
    const data = base?.eras?.[era] || base;
    card.replaceChildren();
    const picture = el('div', 'vh-image-wrap');
    const body = el('div', 'vh-body');
    body.append(el('h2', 'vh-heading', record?.displayName || id));
    if (data) body.append(el('div', 'vh-role', tr(data.role || 'Vehicle')));
    if (base?.image) {
      const img = el('img', 'vh-image');
      img.alt = data.name || id;
      img.src = base.image;
      img.addEventListener('error', () => picture.replaceChildren(el('div', 'vh-image-message', tr("Image unavailable"))), { once: true });
      picture.append(img);
    } else picture.append(el('div', 'vh-image-message', tr("Image not yet available")));
    if (places.length) {
      const controls = el('div', 'vh-controls');
      for (const key of places) {
        const button = el('button', '', key.toUpperCase());
        button.type = 'button'; button.setAttribute('aria-pressed', String(key === activeBranch));
        button.title = catalog.sources[key].name;
        button.addEventListener('click', () => {
          branch = key; era = '';
          try { localStorage.setItem('vehicle-info-branch', key); } catch {}
          render();
        });
        controls.append(button);
      }
      if (Object.keys(base?.eras || {}).length) {
        const select = el('select');
        select.setAttribute('aria-label', tr("Vehicle era"));
        const option = el('option', '', tr("Base version")); option.value = ''; select.append(option);
        for (const name of Object.keys(base.eras)) { const option = el('option', '', name); option.value = name; select.append(option); }
        select.value = era;
        select.addEventListener('change', () => { era = select.value; render(); });
        controls.append(select);
      }
      body.append(controls);
      const context = el('div', 'vh-context');
      if (anchor.dataset.vehicleTier !== undefined) context.append(el('span', 'vh-chip vh-chip-tier', tr('Tier {tier}', { tier: anchor.dataset.vehicleTier })));
      if (data.team) context.append(el('span', 'vh-chip', data.team));
      if (data.locomotion) context.append(el('span', 'vh-chip', tr(locomotions[data.locomotion] || data.locomotion)));
      for (const value of data.classes || []) context.append(el('span', 'vh-chip', tr(value)));
      body.append(context);
      const tabs = el('div', 'vh-tabs');
      tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', tr("Vehicle card sections"));
      const modificationCount = (base.modifications?.length || 0) + (base.eraModifications?.length || 0);
      for (const [key, label] of [['overview', tr("Overview")], ['modifications', tr('Modifications ({count})', { count: modificationCount })]]) {
        const tab = el('button', '', label); tab.type = 'button';
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(view === key));
        tab.addEventListener('click', () => { view = key; render(); });
        tabs.append(tab);
      }
      body.append(tabs);
      if (view === 'overview') {
        body.append(el('div', 'vh-subtitle', tr("In-game stats · base configuration")));
        const stats = el('dl', 'vh-stats');
        const values = [
          [tr("Forward speed"), number(data.speed, tr(" km/h"))],
          [tr("Reverse speed"), number(data.reverseSpeed, tr(" km/h"))],
          [tr("Mass"), number(data.mass, tr(" t"))],
          [tr("Seats"), number(data.seats)],
          [tr("Power"), number(data.horsepower, tr(" hp"))],
          [tr("Power-to-weight ratio"), data.mass > 0 ? number(data.horsepower / data.mass, tr(" hp/t")) : null],
        ];
        for (const [label, value] of values) {
          if (value === null) continue;
          const cell = el('div', 'vh-stat'); cell.append(el('dt', '', label), el('dd', '', value)); stats.append(cell);
        }
        if (stats.childElementCount) body.append(stats);
        else body.append(el('p', 'vh-note', tr("Numeric stats have not been published for this vehicle.")));
        if (data.engine) body.append(el('p', 'vh-note', tr('Engine: {engine}', { engine: data.engine })));
        if (data.weapons?.length) {
          body.append(el('div', 'vh-subtitle', tr("Armament")));
          const list = el('ul', 'vh-weapons');
          for (const weapon of data.weapons) {
            const row = el('li'); row.append(el('span', '', weapon.name));
            const reload = number(weapon.reload, tr(" s"));
            if (reload) row.append(el('small', '', tr('reload {time}', { time: reload })));
            list.append(row);
          }
          body.append(list);
        }
        if (data.features?.length) {
          const list = el('div', 'vh-features');
          for (const feature of data.features) list.append(el('span', 'vh-chip', tr(features[feature] || feature)));
          body.append(list);
        }
        if (data.description) {
          body.append(el('div', 'vh-subtitle', tr("In-game description")), el('p', 'vh-description', data.description));
        }
        if (data.article) {
          body.append(el('div', 'vh-subtitle', tr("Wiki description")), el('p', 'vh-description', data.article));
        }
      } else body.append(modificationList(base));
      const source = el('div', 'vh-source');
      source.append(externalLink('MTC Wiki ↗', data.source), externalLink('CC BY-NC 4.0', catalog.attribution.licenseUrl));
      if (base.imageSourceKind === 'roblox-spawner') source.append(el('span', '', tr("Image: MTC Dev Tank Spawner")));
      body.append(source);
    } else {
      body.append(el('p', 'vh-note', loadingError
        ? tr("Could not load the local vehicle catalog. Check data/vehicle-info.json.")
        : tr("The official catalog has no image or stats for this ID yet. Data from other variants is not substituted.")));
    }
    card.append(picture, body);
    clearTimeout(hideTimer);
    position();
  }
  async function show(target) {
    if (!target.isConnected) return;
    const previous = anchor;
    hide(); anchor = target;
    if (previous !== target) { era = ''; view = 'overview'; }
    const current = anchor;
    await ready;
    if (anchor !== current || !current.isConnected) return;
    const ids = new Set((target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(card.id); target.setAttribute('aria-describedby', [...ids].join(' '));
    card.hidden = false;
    render();
  }
  function scheduleShow(target) {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    if (target === anchor && !card.hidden) return;
    if (anchor && target !== anchor) hide();
    showTimer = setTimeout(() => show(target), 320);
  }
  const targetOf = event => event.target instanceof Element ? event.target.closest('[data-vehicle-id]') : null;
  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || event.buttons) return;
    if (card.contains(event.target)) { clearTimeout(hideTimer); return; }
    const target = targetOf(event);
    if (target && !target.contains(event.relatedTarget)) scheduleShow(target);
  });
  document.addEventListener('pointerout', event => {
    const target = targetOf(event);
    if (target && !target.contains(event.relatedTarget) || card.contains(event.target) && !card.contains(event.relatedTarget)) scheduleHide();
  });
  document.addEventListener('focusin', event => {
    if (card.contains(event.target)) { clearTimeout(hideTimer); return; }
    const target = targetOf(event); if (target) scheduleShow(target);
  });
  document.addEventListener('focusout', event => {
    if (!card.contains(event.relatedTarget) && event.relatedTarget !== anchor) scheduleHide();
  });
  document.addEventListener('pointerdown', event => { if (!card.contains(event.target)) hide(); }, true);
  document.addEventListener('dragstart', hide, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' || (event.key === ' ' || event.key === 'Enter') && targetOf(event)) hide();
  });
  // Focusing an off-screen item scrolls it into view before the opening delay ends.
  document.addEventListener('scroll', event => { if (!card.hidden && !card.contains(event.target)) hide(); }, true);
  window.addEventListener('loadout-language-change', render);
  window.addEventListener('resize', hide);
  window.addEventListener('blur', hide);
  new MutationObserver(() => { if (anchor && !anchor.isConnected) hide(); }).observe(document.body, { childList: true, subtree: true });

  // Picture under the name of every vehicle placed in a team column, a large view of it, and collapsible tiers.
  // Pure DOM decoration: editor state is never modified.
  const thumbsBy = { vehicle: true, weapon: true };
  try {
    thumbsBy.vehicle = localStorage.getItem('vehicle-thumbs') !== 'off';
    thumbsBy.weapon = localStorage.getItem('weapon-thumbs') !== 'off';
  } catch {}
  const kindOf = node => (node.dataset.weaponId !== undefined ? 'weapon' : 'vehicle');
  const idOf = node => node.dataset.weaponId ?? node.dataset.vehicleId;
  let activeKind = 'vehicle';
  function thumbSource(kind, id) {
    if (kind === 'weapon') return weaponCatalog?.items?.[id]?.image || null;
    const places = catalog?.vehicles?.[id]?.places || {};
    return (places[branch]?.image ? places[branch] : Object.values(places).find(place => place.image))?.image || null;
  }
  let lightbox;
  function closeLightbox() { if (lightbox) lightbox.hidden = true; }
  function openLightbox(kind, id, src) {
    if (!lightbox) {
      lightbox = el('div', 'vh-lightbox');
      lightbox.hidden = true;
      lightbox.setAttribute('role', 'dialog');
      lightbox.append(el('img', 'vh-lightbox-image'), el('div', 'vh-lightbox-caption'));
      lightbox.addEventListener('click', closeLightbox);
      document.body.append(lightbox);
    }
    const image = lightbox.querySelector('img');
    image.alt = '';
    image.src = src;
    lightbox.querySelector('.vh-lightbox-caption').textContent = (kind === 'weapon' ? weaponCatalog?.items?.[id]?.displayName : catalog?.vehicles?.[id]?.displayName) || id;
    lightbox.setAttribute('aria-label', tr(kind === 'weapon' ? 'Weapon image' : 'Vehicle image'));
    lightbox.hidden = false;
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLightbox(); });
  // Each vehicle or weapon can fold its own picture; the choice is kept per column, tier and item.
  // The "Vehicle images" / "Weapon images" button folds or unfolds every picture of its tab; an item's own chevron overrides it.
  const pictureOverrides = new Map();
  try {
    const stored = JSON.parse(localStorage.getItem('vehicle-pictures-folded') || '{}');
    if (Array.isArray(stored)) for (const key of stored) pictureOverrides.set(String(key), true);
    else for (const [key, folded] of Object.entries(stored)) pictureOverrides.set(key, Boolean(folded));
  } catch {}
  const pictureKey = node => (kindOf(node) === 'weapon'
    ? ['w', node.dataset.vehicleColumn, node.dataset.weaponClass || '', node.dataset.vehicleTier, node.dataset.weaponId]
    : [node.dataset.vehicleColumn, node.dataset.vehicleTier, node.dataset.vehicleId]).join('|');
  const isFolded = node => pictureOverrides.has(pictureKey(node)) ? pictureOverrides.get(pictureKey(node)) : !thumbsBy[kindOf(node)];
  function savePictures() { try { localStorage.setItem('vehicle-pictures-folded', JSON.stringify(Object.fromEntries(pictureOverrides))); } catch {} }
  function toggleButton(node) {
    let button = node.querySelector(':scope > .vh-pic-toggle');
    if (button) return button;
    button = el('span', 'vh-pic-toggle');
    button.setAttribute('role', 'button');
    let pressed = null;
    button.addEventListener('mousedown', event => { pressed = [event.clientX, event.clientY]; });
    button.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      if (pressed && Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]) > 5) return; // the end of a drag, not a click
      const key = pictureKey(node), next = !isFolded(node);
      if (next === !thumbsBy[kindOf(node)]) pictureOverrides.delete(key); else pictureOverrides.set(key, next);
      savePictures();
      hide();
      scheduleDecorate();
    });
    node.append(button);
    return button;
  }
  function decorate(node) {
    let wrap = node.querySelector(':scope > .vh-thumb-wrap');
    const kind = kindOf(node);
    const src = node.dataset.vehicleColumn !== '-1' ? thumbSource(kind, idOf(node)) : null;
    if (!src) { wrap?.remove(); node.querySelector(':scope > .vh-pic-toggle')?.remove(); node.classList.remove('vh-pic-folded'); return; }
    if (!wrap) {
      wrap = el('span', 'vh-thumb-wrap');
      const image = el('img', 'vh-thumb');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.draggable = false;
      image.addEventListener('error', () => wrap.remove());
      wrap.append(image, el('span', 'vh-thumb-zoom', '⤢'));
      // A plain click enlarges the picture instead of selecting the item; dragging still moves the item.
      let pressed = null;
      wrap.addEventListener('mousedown', event => { pressed = [event.clientX, event.clientY]; });
      wrap.addEventListener('click', event => {
        event.stopPropagation();
        if (pressed && Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]) > 5) return; // the end of a drag, not a click
        event.preventDefault();
        hide();
        openLightbox(kind, idOf(node), wrap.firstChild.getAttribute('src'));
      });
      node.append(wrap);
    }
    wrap.title = tr('Enlarge image');
    const folded = isFolded(node);
    node.classList.toggle('vh-pic-folded', folded);
    const toggle = toggleButton(node);
    toggle.setAttribute('aria-expanded', String(!folded));
    toggle.title = tr(folded ? 'Show picture' : 'Hide picture');
    const image = wrap.firstChild;
    if (image.getAttribute('src') !== src) image.src = src;
  }

  // Tiers of the Vehicles and Weapons tabs can be folded; a folded cell keeps its drop area.
  // The "Collapse tiers" button sets the default of the tab that is on screen; a tier's own heading overrides it.
  const tierOverrides = new Map();
  const tierDefaults = { vehicle: false, weapon: false };
  try {
    const stored = JSON.parse(localStorage.getItem('vehicle-tiers-collapsed') || '[]');
    if (Array.isArray(stored)) for (const key of stored) tierOverrides.set(String(key), true);
    else {
      tierDefaults.vehicle = Boolean(stored.vehicle?.folded);
      tierDefaults.weapon = Boolean(stored.weapon?.folded);
      for (const [key, folded] of Object.entries(stored.overrides || {})) tierOverrides.set(key, Boolean(folded));
    }
  } catch {}
  function saveTiers() {
    try { localStorage.setItem('vehicle-tiers-collapsed', JSON.stringify({ vehicle: { folded: tierDefaults.vehicle }, weapon: { folded: tierDefaults.weapon }, overrides: Object.fromEntries(tierOverrides) })); } catch {}
  }
  const tierKind = key => (key.startsWith('w-') ? 'weapon' : 'vehicle');
  const isTierCollapsed = key => (tierOverrides.has(key) ? tierOverrides.get(key) : tierDefaults[tierKind(key)]);
  const tierPattern = /^(?:Tier|Тир)\s*(\d+)$/;
  function tierHeaders() {
    const headers = [];
    const editor = document.querySelector('.loadout-editor');
    if (!editor) return headers;
    for (const label of editor.querySelectorAll('p')) {
      const text = label.textContent.trim();
      const head = label.parentElement;
      if (label.children.length || !tierPattern.test(text) || !head?.nextElementSibling || head.children.length !== 1) continue;
      let column = head;
      while (column.parentElement && column.parentElement.parentElement !== editor) column = column.parentElement;
      const columnIndex = Array.prototype.indexOf.call(column.parentElement?.children || [], column);
      const tier = text.match(tierPattern)[1];
      const section = head.closest('.MuiAccordion-root');
      // Weapon tiers live inside the class sections (Infantry, Crewman, Engineer) of a column.
      const key = section
        ? 'w-' + columnIndex + '-' + Array.prototype.indexOf.call(section.parentElement?.children || [], section) + '-' + tier
        : columnIndex + '-' + tier;
      headers.push({ head, body: head.nextElementSibling, key, kind: section ? 'weapon' : 'vehicle' });
    }
    return headers;
  }
  function toggleTier(key) {
    const next = !isTierCollapsed(key);
    if (next === tierDefaults[tierKind(key)]) tierOverrides.delete(key); else tierOverrides.set(key, next);
    saveTiers();
    syncTiers();
  }
  function syncTiers() {
    const all = tierHeaders();
    for (const { head, body, key } of all) {
      const collapsed = isTierCollapsed(key);
      if (!head.classList.contains('vh-tier-head')) {
        head.classList.add('vh-tier-head');
        head.setAttribute('role', 'button');
        head.tabIndex = 0;
        head.addEventListener('click', () => toggleTier(head.dataset.tierKey));
        head.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleTier(head.dataset.tierKey); } });
      }
      head.dataset.tierKey = key;
      head.setAttribute('aria-expanded', String(!collapsed));
      head.title = tr(collapsed ? 'Expand tier' : 'Collapse tier');
      body.classList.add('vh-tier-body');
      body.classList.toggle('vh-collapsed', collapsed);
    }
    const headers = all.filter(header => header.kind === activeKind);
    let button = document.getElementById('vehicle-tiers-toggle');
    const anchorButton = document.getElementById('vehicle-thumbs-toggle');
    if (!headers.length || !anchorButton) { button?.remove(); return; }
    if (!button) {
      button = document.createElement('button');
      button.id = 'vehicle-tiers-toggle';
      button.type = 'button';
      button.className = anchorButton.className;
      button.addEventListener('click', () => {
        const current = tierHeaders().filter(header => header.kind === activeKind);
        const anyOpen = current.some(({ key }) => !isTierCollapsed(key));
        tierDefaults[activeKind] = anyOpen;
        for (const key of [...tierOverrides.keys()]) if (tierKind(key) === activeKind) tierOverrides.delete(key);
        saveTiers();
        syncTiers();
      });
      anchorButton.after(button);
    }
    const anyOpen = headers.some(({ key }) => !isTierCollapsed(key));
    button.textContent = tr(anyOpen ? 'Collapse tiers' : 'Expand tiers');
    button.title = tr(activeKind === 'weapon' ? (anyOpen ? 'Fold all weapon tiers' : 'Unfold all weapon tiers') : (anyOpen ? 'Fold all vehicle tiers' : 'Unfold all vehicle tiers'));
  }

  function syncToggle() {
    const language = document.getElementById('loadout-language-toggle');
    if (!language) return;
    let button = document.getElementById('vehicle-thumbs-toggle');
    if (!button) {
      button = document.createElement('button');
      button.id = 'vehicle-thumbs-toggle';
      button.type = 'button';
      button.className = language.className;
      button.addEventListener('click', () => {
        thumbsBy[activeKind] = !thumbsBy[activeKind];
        for (const key of [...pictureOverrides.keys()]) if ((key.startsWith('w|') ? 'weapon' : 'vehicle') === activeKind) pictureOverrides.delete(key);
        savePictures();
        try { localStorage.setItem(activeKind + '-thumbs', thumbsBy[activeKind] ? 'on' : 'off'); } catch {}
        decorateAll();
      });
      language.after(button);
    }
    activeKind = document.querySelector('[data-weapon-id]') ? 'weapon' : 'vehicle';
    button.textContent = tr(activeKind === 'weapon' ? 'Weapon images' : 'Vehicle images');
    button.setAttribute('aria-pressed', String(thumbsBy[activeKind]));
    button.title = tr(thumbsBy[activeKind] ? 'Fold all pictures' : 'Unfold all pictures');
    button.style.opacity = thumbsBy[activeKind] ? '1' : '0.55';
  }
  let thumbFrame = 0;
  function decorateAll() {
    thumbFrame = 0;
    syncToggle();
    for (const node of document.querySelectorAll('[data-vehicle-id], [data-weapon-id]')) decorate(node);
    syncTiers();
  }
  function scheduleDecorate() { if (!thumbFrame) thumbFrame = requestAnimationFrame(decorateAll); }
  new MutationObserver(scheduleDecorate).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-vehicle-id', 'data-weapon-id', 'data-vehicle-column'] });
  ready.then(scheduleDecorate);
  weaponsReady.then(scheduleDecorate);
  window.addEventListener('loadout-language-change', scheduleDecorate);
  scheduleDecorate();
})();
