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
})();
