// Human-readable descriptions derived from the game's published module differences.
const fmt = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
const unique = values => [...new Set(values)];
const featureLabels = { stabilizer: 'стабилизатор', lws: 'лазерное оповещение', maws: 'оповещение о ракетах' };

function nameExplanation(name) {
  const rules = [
    [/cosmetic/i, 'Косметический вариант внешнего вида. Название помечает его как декоративный; изменение боевых характеристик не заявлено.'],
    [/^airdrop$/i, 'Вариант для воздушного десантирования машины. Способ доставки и его параметры в выгрузке не описаны.'],
    [/^floaters$/i, 'Комплект поплавков для машины. Влияние на плавучесть, массу и скорость в выгрузке не указано.'],
    [/^no trunk$/i, 'Вариант без багажного отделения. Числовое влияние на машину в выгрузке не указано.'],
    [/camo|camouflage|barracuda/i, 'Маскировочный комплект для машины. Изменения заметности и других характеристик в выгрузке не указаны.'],
    [/mine plow/i, 'Установка минного трала. Условия разминирования и изменения подвижности в выгрузке не описаны.'],
    [/bulldozer/i, 'Установка бульдозерного отвала. Его влияние на машину в выгрузке не описано.'],
    [/exhaust cooler/i, 'Охладитель выхлопа. Влияние на инфракрасную заметность в выгрузке не указано.'],
    [/ir jammer|an\/alq-144|an\/vlq/i, 'Комплект инфракрасного противодействия. Поддерживаемые угрозы и эффективность в выгрузке не указаны.'],
    [/\baps\b|\barena\b|zaslon|\bgl6\b/i, 'Комплект активной защиты. Параметры перехвата этой модификации в выгрузке не указаны.'],
    [/\bera\b/i, 'Комплект динамической защиты. Толщина, покрытие и защитные эквиваленты этой модификации в выгрузке не указаны.'],
    [/armou?r|protection|composite|sideskirt|slat|cage|dorchester|tusk|^tes$|\bbrat\b|busk|warkit|urban kit|crew shields|k1 hull|k1 package|k1 \+ cage/i, 'Дополнительный защитный комплект. Точный состав, покрытие и влияние на массу в выгрузке не указаны.'],
    [/windshield|armoured glass/i, 'Вариант остекления машины. Его защитные свойства в выгрузке не указаны.'],
    [/tent/i, 'Вариант машины с тентом. Дополнительное влияние на характеристики в выгрузке не описано.'],
    [/flat bed|wooden bed|cargo crates|supplies/i, 'Изменение грузового оснащения машины. Вместимость и влияние на характеристики в выгрузке не описаны.'],
    [/road markers/i, 'Установка дорожных габаритных указателей. Другие изменения в выгрузке не описаны.'],
    [/vismod/i, 'Вариант визуального оформления машины. Подробный состав изменений в выгрузке отсутствует.'],
    [/model (20\d\d)/i, 'Модернизация машины до версии указанного года. Подробный состав этой версии в выгрузке отсутствует.'],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1]
    || `Вариант оснащения «${name}». Подробный состав и влияние на характеристики в опубликованных данных не раскрыты.`;
}

function describeChange(vehicle, name, change, kind) {
  const modules = vehicle.modules || {};
  const added = (change.changes?.add || []).map(ref => modules[ref]).filter(Boolean);
  const removed = (change.changes?.remove || []).map(ref => modules[ref]).filter(Boolean);
  const ofType = (list, type) => list.filter(m => m.type === type).map(m => m.data);
  const changes = [];
  const highlights = [];
  const push = text => changes.push(text);

  const addedWeapons = ofType(added, 'Weapon');
  const removedWeapons = ofType(removed, 'Weapon');
  const newNames = unique(addedWeapons.map(w => w.name)).filter(n => !removedWeapons.some(w => w.name === n));
  const oldNames = unique(removedWeapons.map(w => w.name)).filter(n => !addedWeapons.some(w => w.name === n));
  if (newNames.length) {
    push(`Добавляет вооружение: ${newNames.join(', ')}.`);
    highlights.push(oldNames.length === 1 && newNames.length === 1 ? `заменяет ${oldNames[0]} на ${newNames[0]}` : `добавляет ${newNames.join(', ')}`);
  }
  if (oldNames.length) { push(`Убирает вооружение: ${oldNames.join(', ')}.`); if (!newNames.length) highlights.push(`снимает ${oldNames.join(', ')}`); }
  for (const weapon of addedWeapons) {
    const previous = removedWeapons.find(w => w.name === weapon.name);
    if (typeof weapon.reloadSpeed === 'number' && previous?.reloadSpeed !== weapon.reloadSpeed) {
      push(`${weapon.name}: перезарядка ${typeof previous?.reloadSpeed === 'number' ? fmt(previous.reloadSpeed) + ' → ' : ''}${fmt(weapon.reloadSpeed)} с.`);
    }
    const capacity = (weapon.magazine || []).map(ref => modules[ref]?.data?.size).filter(Number.isFinite);
    if (capacity.length) push(`${weapon.name}: ёмкость магазина — ${capacity.map(fmt).join(' / ')}.`);
  }

  const ammoNames = list => unique(ofType(list, 'AmmoSelection').flatMap(selection => Object.entries(selection).filter(([, enabled]) => enabled).map(([name]) => name)));
  const addedAmmo = ammoNames(added).filter(n => !ammoNames(removed).includes(n));
  const removedAmmo = ammoNames(removed).filter(n => !ammoNames(added).includes(n));
  if (addedAmmo.length) { push(`Добавляет боеприпасы: ${addedAmmo.join(', ')}.`); highlights.push(`меняет боекомплект: ${addedAmmo.join(', ')}`); }
  if (removedAmmo.length) push(`Убирает боеприпасы: ${removedAmmo.join(', ')}.`);

  const alternativeRefs = new Set([...Object.values(vehicle.alterations?.addons || {}), ...Object.values(vehicle.alterations?.loadouts || {})].flatMap(a => a.changes?.add || []));
  const baseDrive = Object.entries(modules).find(([ref, m]) => m.type === 'DriveData' && !alternativeRefs.has(ref))?.[1]?.data;
  const newDrive = ofType(added, 'DriveData').at(-1);
  const oldDrive = ofType(removed, 'DriveData').at(-1) || baseDrive;
  if (newDrive) {
    const metrics = [
      ['Масса', oldDrive?.mass, newDrive.mass, 'т'],
      ['Скорость вперёд', oldDrive?.engine?.forwardSpeed, newDrive.engine?.forwardSpeed, 'км/ч'],
      ['Задний ход', oldDrive?.engine?.reverseSpeed, newDrive.engine?.reverseSpeed, 'км/ч'],
      ['Мощность двигателя', oldDrive?.engine?.horsepower, newDrive.engine?.horsepower, 'л.с.'],
    ];
    for (const [label, before, after, unit] of metrics) if (Number.isFinite(after) && after !== before) {
      push(`${label}: ${Number.isFinite(before) ? fmt(before) + ' → ' : ''}${fmt(after)} ${unit}.`);
      highlights.push({ 'Масса': 'изменяет массу машины', 'Скорость вперёд': 'изменяет скорость вперёд', 'Задний ход': 'изменяет скорость заднего хода', 'Мощность двигателя': 'изменяет мощность двигателя' }[label]);
    }
    if (newDrive.engine?.name && oldDrive?.engine?.name !== newDrive.engine.name) push(`Двигатель: ${oldDrive?.engine?.name ? oldDrive.engine.name + ' → ' : ''}${newDrive.engine.name}.`);
  }
  for (const aps of ofType(added, 'APS')) {
    push(`Активная защита: ${aps.name || 'без названия'}${Number.isFinite(aps.reactionTime) ? `; время реакции ${fmt(aps.reactionTime)} с` : ''}${Number.isFinite(aps.ammo) ? `; боезапас ${fmt(aps.ammo)}` : ''}.`);
    highlights.push(`устанавливает активную защиту ${aps.name || ''}`.trim());
  }
  for (const ew of ofType(added, 'EW')) {
    const targets = [ew.drone && 'дроны', ew.ied && 'самодельные взрывные устройства'].filter(Boolean);
    if (targets.length) { push(`Радиоэлектронное противодействие: ${targets.join(', ')}.`); highlights.push('добавляет радиоэлектронное противодействие'); }
  }
  for (const turret of ofType(added, 'Turret')) {
    for (const [key, label] of Object.entries(featureLabels)) if (turret[key] && !ofType(removed, 'Turret').some(t => t[key])) push(`Добавляет ${label}.`);
    const sights = turret.sights || [];
    const oldSights = ofType(removed, 'Turret').flatMap(t => t.sights || []);
    if (sights.some(s => s.thermal || s.zoom?.thermal) && !oldSights.some(s => s.thermal || s.zoom?.thermal)) { push('Добавляет тепловизионный прицел.'); highlights.push('добавляет тепловизионный прицел'); }
    if (sights.some(s => s.fcs) && !oldSights.some(s => s.fcs)) push('Добавляет систему управления огнём.');
    if (sights.some(s => s.rangefinder === 'Laser') && !oldSights.some(s => s.rangefinder === 'Laser')) push('Добавляет лазерный дальномер.');
  }
  for (const sight of ofType(added, 'TurretSightAddon')) if (sight.name) push(`Дополнение прицела: ${sight.name}.`);
  const seatDelta = ofType(added, 'Seat').length - ofType(removed, 'Seat').length;
  if (seatDelta) push(`Число мест: ${seatDelta > 0 ? '+' : ''}${seatDelta}.`);
  const newStorage = ofType(added, 'AmmoModel');
  const oldStorage = ofType(removed, 'AmmoModel');
  for (const storage of newStorage) if (Number.isFinite(storage.size)) {
    const old = oldStorage.find(s => s.name === storage.name);
    if (old?.size !== storage.size) push(`Укладка «${storage.name}»: ${Number.isFinite(old?.size) ? fmt(old.size) + ' → ' : ''}${fmt(storage.size)}.`);
  }
  for (const storage of oldStorage) if (!newStorage.some(s => s.name === storage.name)) push(`Убирает укладку «${storage.name}»${Number.isFinite(storage.size) ? ` (${fmt(storage.size)})` : ''}.`);
  const originalDescription = typeof change.description === 'string' && change.description.trim() ? change.description.trim() : null;
  const actualChanges = unique(changes);
  const summary = unique(highlights).slice(0, 3).join('; ');
  const derived = summary ? summary.charAt(0).toUpperCase() + summary.slice(1) + '.'
    : actualChanges.length ? 'Изменяет оснащение машины. Подтверждённые изменения перечислены ниже.' : nameExplanation(name);
  return {
    name,
    kind,
    cost: Number.isFinite(change.cost) ? change.cost : null,
    era: change.loadout || (kind === 'era' ? name : null),
    description: originalDescription || derived,
    descriptionSource: originalDescription ? 'game' : actualChanges.length ? 'changes' : 'name',
    changes: actualChanges,
    moduleChangesPublished: added.length > 0 || removed.length > 0,
  };
}

export function buildVehicleModifications(vehicle) {
  return {
    modifications: Object.entries(vehicle.alterations?.addons || {}).map(([name, data]) => describeChange(vehicle, name, data, 'addon')),
    eraModifications: Object.entries(vehicle.alterations?.loadouts || {}).map(([name, data]) => describeChange(vehicle, name, data, 'era')),
  };
}
