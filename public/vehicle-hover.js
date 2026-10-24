/* Local, framework-independent vehicle cards. Game/editor state is never modified. */
(() => {
  'use strict';
  if (window.__vehicleHoverInstalled) return;
  window.__vehicleHoverInstalled = true;
  const card = document.createElement('aside');
  card.id = 'vehicle-hover-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Информация о технике');
  document.body.append(card);

  const roles = {
    'Main Battle Tank': 'Основной боевой танк', 'Prototype Main Battle Tank': 'Опытный основной танк',
    'Heavy Tank': 'Тяжёлый танк', 'Super Heavy Tank': 'Сверхтяжёлый танк',
    'Medium Tank': 'Средний танк', 'Light Tank': 'Лёгкий танк', 'Tankette': 'Танкетка',
    'Tank Destroyer': 'Истребитель танков', 'Assault Gun': 'Штурмовое орудие',
    'Infantry Fighting Vehicle': 'Боевая машина пехоты', 'Armoured Personnel Carrier': 'Бронетранспортёр',
    'Self Propelled Howitzer': 'Самоходная гаубица', 'Self Propelled Anti Aircraft': 'Зенитная самоходная установка',
    'Rocket Artillery': 'Реактивная артиллерия', 'Anti Tank Missile Carrier': 'Самоходный ПТРК',
    'Attack Helicopter': 'Ударный вертолёт', 'Helicopter Gunship': 'Боевой вертолёт',
    'Utility Helicopter': 'Многоцелевой вертолёт', 'Transport Vehicle': 'Транспорт',
    'Supply Truck': 'Машина снабжения', 'Reconnaissance Vehicle': 'Разведывательная машина',
    'Support Vehicle': 'Машина поддержки', 'Amphibious Vehicle': 'Машина-амфибия',
    'Flamethrower Tank': 'Огнемётный танк', 'Fire Support Vehicle': 'Машина огневой поддержки',
    'Pickup Truck': 'Пикап', 'Flatbed Truck': 'Грузовик',
  };
  const features = { amphibious: 'Амфибия', stabilizer: 'Стабилизатор', thermal: 'Тепловизор', fcs: 'СУО', lws: 'Лазерное оповещение', maws: 'Оповещение о ракетах', aps: 'Активная защита', ess: 'Дымовая завеса' };
  const locomotions = { tracked: 'Гусеничная', wheeled: 'Колёсная', aerial: 'Авиация' };
  const classes = { Crewman: 'Танкист', Infantry: 'Пехотинец', Engineer: 'Инженер' };
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
    return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value) + suffix : null;
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
    section.append(el('p', 'vh-note', 'Просмотр модификаций не изменяет пресет. Стоимость указана по данным выбранной версии игры.'));
    const groups = [
      ['Дополнительное оснащение', data.modifications || []],
      ['Версии по эпохам', data.eraModifications || []],
    ];
    if (!groups.some(([, list]) => list.length)) {
      section.append(el('p', 'vh-empty', 'В каталоге нет опубликованных модификаций для этой машины.'));
    }
    for (const [label, items] of groups) {
      if (!items.length) continue;
      section.append(el('div', 'vh-subtitle', label));
      for (const item of items) {
        const details = el('details', 'vh-modification');
        const summary = el('summary', 'vh-mod-summary');
        const heading = el('span', 'vh-mod-heading');
        heading.append(el('span', 'vh-mod-name', item.name));
        heading.append(el('span', 'vh-mod-cost', item.kind === 'era' ? 'Версия по эпохе'
          : item.cost === null ? 'Стоимость не указана' : `Стоимость: ${number(item.cost)}`));
        summary.append(heading);
        const content = el('div', 'vh-mod-content');
        if (item.era && item.kind !== 'era') content.append(el('span', 'vh-chip', `Эпоха: ${item.era}`));
        content.append(el('p', 'vh-description', item.description));
        if (item.changes?.length) {
          const list = el('ul', 'vh-mod-changes');
          for (const change of item.changes) list.append(el('li', '', change));
          content.append(list);
        }
        content.append(el('p', 'vh-mod-origin', item.descriptionSource === 'game' ? 'Описание из игры'
          : item.descriptionSource === 'changes' ? 'Описание составлено по изменениям модулей игры'
          : 'Пояснение составлено по названию; подробные изменения в выгрузке не описаны'));
        details.append(summary, content);
        details.addEventListener('toggle', position);
        section.append(details);
      }
    }
    return section;
  }
  function render() {
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
    if (data) body.append(el('div', 'vh-role', roles[data.role] || data.role || 'Техника'));
    if (base?.image) {
      const img = el('img', 'vh-image');
      img.alt = data.name || id;
      img.src = base.image;
      img.addEventListener('error', () => picture.replaceChildren(el('div', 'vh-image-message', 'Изображение недоступно')), { once: true });
      picture.append(img);
    } else picture.append(el('div', 'vh-image-message', 'Изображение пока отсутствует'));
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
        select.setAttribute('aria-label', 'Версия техники по эпохе');
        const option = el('option', '', 'Базовая версия'); option.value = ''; select.append(option);
        for (const name of Object.keys(base.eras)) { const option = el('option', '', name); option.value = name; select.append(option); }
        select.value = era;
        select.addEventListener('change', () => { era = select.value; render(); });
        controls.append(select);
      }
      body.append(controls);
      const context = el('div', 'vh-context');
      if (anchor.dataset.vehicleTier !== undefined) context.append(el('span', 'vh-chip vh-chip-tier', `Тир ${anchor.dataset.vehicleTier}`));
      if (data.team) context.append(el('span', 'vh-chip', data.team));
      if (data.locomotion) context.append(el('span', 'vh-chip', locomotions[data.locomotion] || data.locomotion));
      for (const value of data.classes || []) context.append(el('span', 'vh-chip', classes[value] || value));
      body.append(context);
      const tabs = el('div', 'vh-tabs');
      tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Разделы карточки техники');
      const modificationCount = (base.modifications?.length || 0) + (base.eraModifications?.length || 0);
      for (const [key, label] of [['overview', 'Обзор'], ['modifications', `Модификации (${modificationCount})`]]) {
        const tab = el('button', '', label); tab.type = 'button';
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(view === key));
        tab.addEventListener('click', () => { view = key; render(); });
        tabs.append(tab);
      }
      body.append(tabs);
      if (view === 'overview') {
        body.append(el('div', 'vh-subtitle', 'Игровые ТТХ · без дополнительных модулей'));
        const stats = el('dl', 'vh-stats');
        const values = [
          ['Скорость вперёд', number(data.speed, ' км/ч')],
          ['Задний ход', number(data.reverseSpeed, ' км/ч')],
          ['Масса', number(data.mass, ' т')],
          ['Мест в машине', number(data.seats)],
          ['Мощность', number(data.horsepower, ' л.с.')],
          ['Удельная мощность', data.mass > 0 ? number(data.horsepower / data.mass, ' л.с./т') : null],
        ];
        for (const [label, value] of values) {
          if (value === null) continue;
          const cell = el('div', 'vh-stat'); cell.append(el('dt', '', label), el('dd', '', value)); stats.append(cell);
        }
        if (stats.childElementCount) body.append(stats);
        else body.append(el('p', 'vh-note', 'Числовые характеристики для этой машины не опубликованы.'));
        if (data.engine) body.append(el('p', 'vh-note', `Двигатель: ${data.engine}`));
        if (data.weapons?.length) {
          body.append(el('div', 'vh-subtitle', 'Вооружение'));
          const list = el('ul', 'vh-weapons');
          for (const weapon of data.weapons) {
            const row = el('li'); row.append(el('span', '', weapon.name));
            const reload = number(weapon.reload, ' с');
            if (reload) row.append(el('small', '', `перезар. ${reload}`));
            list.append(row);
          }
          body.append(list);
        }
        if (data.features?.length) {
          const list = el('div', 'vh-features');
          for (const feature of data.features) list.append(el('span', 'vh-chip', features[feature] || feature));
          body.append(list);
        }
        if (data.description) {
          body.append(el('div', 'vh-subtitle', 'Описание из игры'), el('p', 'vh-description', data.description));
        }
        if (data.article) {
          body.append(el('div', 'vh-subtitle', 'Описание из вики'), el('p', 'vh-description', data.article));
        }
      } else body.append(modificationList(base));
      const source = el('div', 'vh-source');
      source.append(externalLink('MTC Wiki ↗', data.source), externalLink('CC BY-NC 4.0', catalog.attribution.licenseUrl));
      if (base.imageSourceKind === 'roblox-spawner') source.append(el('span', '', 'Изображение: MTC Dev Tank Spawner'));
      body.append(source);
    } else {
      body.append(el('p', 'vh-note', loadingError
        ? 'Не удалось загрузить локальный каталог техники. Проверьте наличие data/vehicle-info.json.'
        : 'В официальном каталоге пока нет изображения и ТТХ для этого ID. Данные другой модификации не подставляются.'));
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
  window.addEventListener('resize', hide);
  window.addEventListener('blur', hide);
  new MutationObserver(() => { if (anchor && !anchor.isConnected) hide(); }).observe(document.body, { childList: true, subtree: true });
})();
