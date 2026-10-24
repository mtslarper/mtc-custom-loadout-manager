// Human-readable descriptions derived from the game's published module differences.
const unique = values => [...new Set(values)];

function nameExplanation(name, tr) {
  const rules = [
    [/cosmetic/i, tr('Косметический вариант внешнего вида. Название помечает его как декоративный; изменение боевых характеристик не заявлено.', 'A cosmetic appearance variant. The name identifies it as decorative; no combat stat changes are specified.')],
    [/^airdrop$/i, tr('Вариант для воздушного десантирования машины. Способ доставки и его параметры в выгрузке не описаны.', 'An airdrop variant of the vehicle. The delivery method and its parameters are not described in the published data.')],
    [/^floaters$/i, tr('Комплект поплавков для машины. Влияние на плавучесть, массу и скорость в выгрузке не указано.', 'A flotation kit for the vehicle. Effects on buoyancy, mass and speed are not specified in the published data.')],
    [/^no trunk$/i, tr('Вариант без багажного отделения. Числовое влияние на машину в выгрузке не указано.', 'A variant without the trunk. Numeric effects on the vehicle are not specified in the published data.')],
    [/camo|camouflage|barracuda/i, tr('Маскировочный комплект для машины. Изменения заметности и других характеристик в выгрузке не указаны.', 'A camouflage kit for the vehicle. Changes to visibility and other stats are not specified in the published data.')],
    [/mine plow/i, tr('Установка минного трала. Условия разминирования и изменения подвижности в выгрузке не описаны.', 'Adds a mine plow. Mine clearance conditions and mobility changes are not described in the published data.')],
    [/bulldozer/i, tr('Установка бульдозерного отвала. Его влияние на машину в выгрузке не описано.', 'Adds a bulldozer blade. Its effects on the vehicle are not described in the published data.')],
    [/exhaust cooler/i, tr('Охладитель выхлопа. Влияние на инфракрасную заметность в выгрузке не указано.', 'An exhaust cooler. Its effects on the infrared signature are not specified in the published data.')],
    [/ir jammer|an\/alq-144|an\/vlq/i, tr('Комплект инфракрасного противодействия. Поддерживаемые угрозы и эффективность в выгрузке не указаны.', 'An infrared countermeasure kit. Supported threats and effectiveness are not specified in the published data.')],
    [/\baps\b|\barena\b|zaslon|\bgl6\b/i, tr('Комплект активной защиты. Параметры перехвата этой модификации в выгрузке не указаны.', 'An active protection kit. Interception parameters for this modification are not specified in the published data.')],
    [/\bera\b/i, tr('Комплект динамической защиты. Толщина, покрытие и защитные эквиваленты этой модификации в выгрузке не указаны.', 'An explosive reactive armor kit. Thickness, coverage and protection equivalents are not specified in the published data.')],
    [/armou?r|protection|composite|sideskirt|slat|cage|dorchester|tusk|^tes$|\bbrat\b|busk|warkit|urban kit|crew shields|k1 hull|k1 package|k1 \+ cage/i, tr('Дополнительный защитный комплект. Точный состав, покрытие и влияние на массу в выгрузке не указаны.', 'An additional protection kit. Exact components, coverage and effects on mass are not specified in the published data.')],
    [/windshield|armoured glass/i, tr('Вариант остекления машины. Его защитные свойства в выгрузке не указаны.', 'A vehicle glazing variant. Its protective properties are not specified in the published data.')],
    [/tent/i, tr('Вариант машины с тентом. Дополнительное влияние на характеристики в выгрузке не описано.', 'A vehicle variant with a tent cover. Additional stat effects are not described in the published data.')],
    [/flat bed|wooden bed|cargo crates|supplies/i, tr('Изменение грузового оснащения машины. Вместимость и влияние на характеристики в выгрузке не описаны.', 'Changes the cargo equipment. Capacity and stat effects are not described in the published data.')],
    [/road markers/i, tr('Установка дорожных габаритных указателей. Другие изменения в выгрузке не описаны.', 'Adds road markers. Other changes are not described in the published data.')],
    [/vismod/i, tr('Вариант визуального оформления машины. Подробный состав изменений в выгрузке отсутствует.', 'A visual vehicle variant. Detailed changes are not available in the published data.')],
    [/model (20\d\d)/i, tr('Модернизация машины до версии указанного года. Подробный состав этой версии в выгрузке отсутствует.', 'Updates the vehicle to the named model year. Detailed changes for this version are not available in the published data.')],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1]
    || tr(`Вариант оснащения «${name}». Подробный состав и влияние на характеристики в опубликованных данных не раскрыты.`, `Equipment variant "${name}". Detailed components and stat effects are not disclosed in the published data.`);
}

function describeChange(vehicle, name, change, kind, language = 'ru') {
  const tr = (ru, en) => language === 'en' ? en : ru;
  const fmt = value => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 2 }).format(value);
  const featureLabels = { stabilizer: tr('стабилизатор', 'stabilizer'), lws: tr('лазерное оповещение', 'laser warning system'), maws: tr('оповещение о ракетах', 'missile warning system') };
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
    push(tr(`Добавляет вооружение: ${newNames.join(', ')}.`, `Adds armament: ${newNames.join(', ')}.`));
    highlights.push(oldNames.length === 1 && newNames.length === 1 ? tr(`заменяет ${oldNames[0]} на ${newNames[0]}`, `replaces ${oldNames[0]} with ${newNames[0]}`) : tr(`добавляет ${newNames.join(', ')}`, `adds ${newNames.join(', ')}`));
  }
  if (oldNames.length) { push(tr(`Убирает вооружение: ${oldNames.join(', ')}.`, `Removes armament: ${oldNames.join(', ')}.`)); if (!newNames.length) highlights.push(tr(`снимает ${oldNames.join(', ')}`, `removes ${oldNames.join(', ')}`)); }
  for (const weapon of addedWeapons) {
    const previous = removedWeapons.find(w => w.name === weapon.name);
    if (typeof weapon.reloadSpeed === 'number' && previous?.reloadSpeed !== weapon.reloadSpeed) {
      push(tr(`${weapon.name}: перезарядка ${typeof previous?.reloadSpeed === 'number' ? fmt(previous.reloadSpeed) + ' → ' : ''}${fmt(weapon.reloadSpeed)} с.`, `${weapon.name}: reload ${typeof previous?.reloadSpeed === 'number' ? fmt(previous.reloadSpeed) + ' → ' : ''}${fmt(weapon.reloadSpeed)} s.`));
    }
    const capacity = (weapon.magazine || []).map(ref => modules[ref]?.data?.size).filter(Number.isFinite);
    if (capacity.length) push(tr(`${weapon.name}: ёмкость магазина — ${capacity.map(fmt).join(' / ')}.`, `${weapon.name}: magazine capacity — ${capacity.map(fmt).join(' / ')}.`));
  }

  const ammoNames = list => unique(ofType(list, 'AmmoSelection').flatMap(selection => Object.entries(selection).filter(([, enabled]) => enabled).map(([name]) => name)));
  const addedAmmo = ammoNames(added).filter(n => !ammoNames(removed).includes(n));
  const removedAmmo = ammoNames(removed).filter(n => !ammoNames(added).includes(n));
  if (addedAmmo.length) { push(tr(`Добавляет боеприпасы: ${addedAmmo.join(', ')}.`, `Adds ammunition: ${addedAmmo.join(', ')}.`)); highlights.push(tr(`меняет боекомплект: ${addedAmmo.join(', ')}`, `changes ammunition: ${addedAmmo.join(', ')}`)); }
  if (removedAmmo.length) push(tr(`Убирает боеприпасы: ${removedAmmo.join(', ')}.`, `Removes ammunition: ${removedAmmo.join(', ')}.`));

  const alternativeRefs = new Set([...Object.values(vehicle.alterations?.addons || {}), ...Object.values(vehicle.alterations?.loadouts || {})].flatMap(a => a.changes?.add || []));
  const baseDrive = Object.entries(modules).find(([ref, m]) => m.type === 'DriveData' && !alternativeRefs.has(ref))?.[1]?.data;
  const newDrive = ofType(added, 'DriveData').at(-1);
  const oldDrive = ofType(removed, 'DriveData').at(-1) || baseDrive;
  if (newDrive) {
    const metrics = [
      ['Масса', oldDrive?.mass, newDrive.mass, tr('т', 't')],
      ['Скорость вперёд', oldDrive?.engine?.forwardSpeed, newDrive.engine?.forwardSpeed, tr('км/ч', 'km/h')],
      ['Задний ход', oldDrive?.engine?.reverseSpeed, newDrive.engine?.reverseSpeed, tr('км/ч', 'km/h')],
      ['Мощность двигателя', oldDrive?.engine?.horsepower, newDrive.engine?.horsepower, tr('л.с.', 'hp')],
    ];
    for (const [label, before, after, unit] of metrics) if (Number.isFinite(after) && after !== before) {
      push(`${tr(label, { 'Масса': 'Mass', 'Скорость вперёд': 'Forward speed', 'Задний ход': 'Reverse speed', 'Мощность двигателя': 'Engine power' }[label])}: ${Number.isFinite(before) ? fmt(before) + ' → ' : ''}${fmt(after)} ${unit}.`);
      highlights.push({ 'Масса': tr('изменяет массу машины', 'changes vehicle mass'), 'Скорость вперёд': tr('изменяет скорость вперёд', 'changes forward speed'), 'Задний ход': tr('изменяет скорость заднего хода', 'changes reverse speed'), 'Мощность двигателя': tr('изменяет мощность двигателя', 'changes engine power') }[label]);
    }
    if (newDrive.engine?.name && oldDrive?.engine?.name !== newDrive.engine.name) push(tr(`Двигатель: ${oldDrive?.engine?.name ? oldDrive.engine.name + ' → ' : ''}${newDrive.engine.name}.`, `Engine: ${oldDrive?.engine?.name ? oldDrive.engine.name + ' → ' : ''}${newDrive.engine.name}.`));
  }
  for (const aps of ofType(added, 'APS')) {
    push(tr(`Активная защита: ${aps.name || 'без названия'}${Number.isFinite(aps.reactionTime) ? `; время реакции ${fmt(aps.reactionTime)} с` : ''}${Number.isFinite(aps.ammo) ? `; боезапас ${fmt(aps.ammo)}` : ''}.`, `Active protection: ${aps.name || 'unnamed'}${Number.isFinite(aps.reactionTime) ? `; reaction time ${fmt(aps.reactionTime)} s` : ''}${Number.isFinite(aps.ammo) ? `; ammunition ${fmt(aps.ammo)}` : ''}.`));
    highlights.push(tr(`устанавливает активную защиту ${aps.name || ''}`, `installs active protection ${aps.name || ''}`).trim());
  }
  for (const ew of ofType(added, 'EW')) {
    const targets = [ew.drone && tr('дроны', 'drones'), ew.ied && tr('самодельные взрывные устройства', 'improvised explosive devices')].filter(Boolean);
    if (targets.length) { push(tr(`Радиоэлектронное противодействие: ${targets.join(', ')}.`, `Electronic countermeasures: ${targets.join(', ')}.`)); highlights.push(tr('добавляет радиоэлектронное противодействие', 'adds electronic countermeasures')); }
  }
  for (const turret of ofType(added, 'Turret')) {
    for (const [key, label] of Object.entries(featureLabels)) if (turret[key] && !ofType(removed, 'Turret').some(t => t[key])) push(tr(`Добавляет ${label}.`, `Adds ${label}.`));
    const sights = turret.sights || [];
    const oldSights = ofType(removed, 'Turret').flatMap(t => t.sights || []);
    if (sights.some(s => s.thermal || s.zoom?.thermal) && !oldSights.some(s => s.thermal || s.zoom?.thermal)) { push(tr('Добавляет тепловизионный прицел.', 'Adds a thermal sight.')); highlights.push(tr('добавляет тепловизионный прицел', 'adds a thermal sight')); }
    if (sights.some(s => s.fcs) && !oldSights.some(s => s.fcs)) push(tr('Добавляет систему управления огнём.', 'Adds a fire control system.'));
    if (sights.some(s => s.rangefinder === 'Laser') && !oldSights.some(s => s.rangefinder === 'Laser')) push(tr('Добавляет лазерный дальномер.', 'Adds a laser rangefinder.'));
  }
  for (const sight of ofType(added, 'TurretSightAddon')) if (sight.name) push(tr(`Дополнение прицела: ${sight.name}.`, `Sight add-on: ${sight.name}.`));
  const seatDelta = ofType(added, 'Seat').length - ofType(removed, 'Seat').length;
  if (seatDelta) push(tr(`Число мест: ${seatDelta > 0 ? '+' : ''}${seatDelta}.`, `Seat count: ${seatDelta > 0 ? '+' : ''}${seatDelta}.`));
  const newStorage = ofType(added, 'AmmoModel');
  const oldStorage = ofType(removed, 'AmmoModel');
  for (const storage of newStorage) if (Number.isFinite(storage.size)) {
    const old = oldStorage.find(s => s.name === storage.name);
    if (old?.size !== storage.size) push(tr(`Укладка «${storage.name}»: ${Number.isFinite(old?.size) ? fmt(old.size) + ' → ' : ''}${fmt(storage.size)}.`, `Ammo rack "${storage.name}": ${Number.isFinite(old?.size) ? fmt(old.size) + ' → ' : ''}${fmt(storage.size)}.`));
  }
  for (const storage of oldStorage) if (!newStorage.some(s => s.name === storage.name)) push(tr(`Убирает укладку «${storage.name}»${Number.isFinite(storage.size) ? ` (${fmt(storage.size)})` : ''}.`, `Removes ammo rack "${storage.name}"${Number.isFinite(storage.size) ? ` (${fmt(storage.size)})` : ''}.`));
  const originalDescription = typeof change.description === 'string' && change.description.trim() ? change.description.trim() : null;
  const actualChanges = unique(changes);
  const summary = unique(highlights).slice(0, 3).join('; ');
  const derived = summary ? summary.charAt(0).toUpperCase() + summary.slice(1) + '.'
    : actualChanges.length ? tr('Изменяет оснащение машины. Подтверждённые изменения перечислены ниже.', 'Changes the vehicle equipment. Confirmed changes are listed below.') : nameExplanation(name, tr);
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
  const describe = (name, data, kind) => {
    const original = describeChange(vehicle, name, data, kind, 'ru');
    const english = describeChange(vehicle, name, data, kind, 'en');
    return { ...original, translations: { en: { description: english.description, changes: english.changes } } };
  };
  return {
    modifications: Object.entries(vehicle.alterations?.addons || {}).map(([name, data]) => describe(name, data, 'addon')),
    eraModifications: Object.entries(vehicle.alterations?.loadouts || {}).map(([name, data]) => describe(name, data, 'era')),
  };
}
