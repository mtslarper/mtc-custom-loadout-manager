/* Shared UI language only. Game IDs, saved loadouts and exports are never translated. */
(() => {
  'use strict';
  if (window.LoadoutI18n) return;
  const dictionary = {
    'Vehicles': 'Техника', 'Weapons': 'Оружие', 'Manage': 'Управление',
    'Language': 'Язык', 'Switch to Russian': 'Переключить на русский', 'Switch to English': 'Switch to English',
    'Shared': 'Общее', 'Tier ': 'Тир ', 'Team ': 'Команда ', 'Add team': 'Добавить команду',
    'Infantry': 'Пехотинец', 'Crewman': 'Танкист', 'Engineer': 'Инженер',
    'Primary': 'Основное', 'Secondary': 'Вторичное', 'Tertiary': 'Дополнительное', 'PassiveTools': 'Пассивные инструменты',
    'Team Limit': 'Лимит на команду', 'LimitPerTeam': 'Лимит на команду', 'teamLimit': 'Лимит на команду',
    'Match Limit': 'Лимит на матч', 'LimitPerMatch': 'Лимит на матч', 'matchLimit': 'Лимит на матч',
    'Team Match Limit': 'Лимит на команду за матч', 'LimitPerMatchTeam': 'Лимит на команду за матч', 'teamMatchLimit': 'Лимит на команду за матч',
    'Category': 'Категория', 'Search...': 'Поиск...', 'None': 'Не задано',
    'Select a vehicle to edit': 'Выберите технику для редактирования', 'Select a weapon to edit': 'Выберите оружие для редактирования',
    'No properties found': 'Нет доступных параметров', 'A problem has occurred': 'Произошла ошибка',
    'Import': 'Импорт', 'Export': 'Экспорт', 'Import a loadout from storage.': 'Загрузите набор из сохранений.',
    'Export the current loadout. Save it to storage, download a JSON file, or share it via a link.': 'Сохраните текущий набор в браузере, скачайте JSON или поделитесь ссылкой.',
    'Download loadout JSON': 'Скачать JSON набора', 'Copy loadout JSON': 'Копировать JSON набора', 'Copy share link': 'Копировать ссылку',
    'Loadout name': 'Название набора', 'Save as': 'Сохранить как', 'Select': 'Выбрать', 'Deselect': 'Снять выбор',
    'Delete': 'Удалить', 'Confirm deletion': 'Подтвердить удаление', 'Nevermind': 'Отмена',
    'Import loadout': 'Загрузить набор', 'Import from file': 'Импорт из файла', 'No saves found': 'Нет сохранений',
    'Danger zone': 'Опасная зона', 'Reset loadout': 'Сбросить набор', 'Confirm reset': 'Подтвердить сброс',
    'Successfully reset loadout': 'Набор сброшен', 'Successfully downloaded loadout': 'JSON набора скачан',
    'Successfully copied loadout JSON': 'JSON набора скопирован', 'Share link copied to clipboard': 'Ссылка скопирована',
    'Successfully saved loadout': 'Набор сохранён', 'Successfully imported loadout': 'Набор загружен',
    'There was an error': 'Произошла ошибка', 'There was an error creating share link': 'Не удалось создать ссылку',
    'A loadout with this name already exists': 'Набор с таким названием уже существует', 'Please enter a name': 'Введите название',
    'Could not find save': 'Сохранение не найдено', 'Select at most 20 files': 'Выберите не больше 20 файлов',
    'Import failed - {errors}': 'Ошибка импорта — {errors}', 'Imported {count} preset(s) from file': 'Импортировано наборов из файлов: {count}',
    'Invalid {field}': 'Некорректное поле: {field}', 'Invalid JSON file': 'Некорректный JSON-файл',
    'team': 'команда', 'column name': 'название колонки', 'item key': 'ключ элемента', 'property key': 'ключ параметра',
    'property name': 'название параметра', 'export key': 'ключ экспорта', 'item name': 'название элемента',
    'JSON is too complex': 'Слишком сложная структура JSON', 'Non-finite number': 'Недопустимое числовое значение',
    'Unsafe object key': 'Небезопасный ключ объекта', 'Tier must be 1–7': 'Тир должен быть от 1 до 7',
    'Invalid editor preset': 'Некорректный набор редактора', 'Invalid column': 'Некорректная колонка',
    'Duplicate or reserved team name': 'Повторяющееся или зарезервированное название команды',
    'Too many items': 'Слишком много элементов', 'Invalid item': 'Некорректный элемент', 'Invalid item column': 'Некорректная колонка элемента',
    'Too many item properties': 'Слишком много параметров элемента', 'Invalid property': 'Некорректный параметр',
    'Invalid weapon category': 'Некорректная категория оружия', 'Invalid numeric property': 'Некорректный числовой параметр',
    'Reserved export key': 'Зарезервированный ключ экспорта', 'Invalid weapon class': 'Некорректный класс оружия',
    'Invalid game export': 'Некорректный игровой JSON', 'Reserved team name': 'Зарезервированное название команды',
    'Too many teams': 'Слишком много команд', 'Invalid equipment list': 'Некорректный список оснащения',
    'Too many or invalid items': 'Слишком много элементов или некорректный элемент', 'Unsupported equipment property': 'Неподдерживаемый параметр оснащения',
    'Invalid weapon classes': 'Некорректные классы оружия', 'Invalid class': 'Некорректный класс',
    'Invalid team vehicle list': 'Некорректный список техники команды', 'File exceeds 4 MiB': 'Размер файла превышает 4 МиБ',
    'Invalid or oversized share link': 'Некорректная или слишком длинная ссылка', 'Share data exceeds 4 MiB': 'Данные ссылки превышают 4 МиБ',
    'Invalid shared preset': 'Некорректный набор по ссылке', 'Invalid shared item': 'Некорректный элемент по ссылке',
    'Invalid shared property': 'Некорректный параметр по ссылке',
    'Vehicle information': 'Информация о технике', 'Vehicle': 'Техника',
    'Main Battle Tank': 'Основной боевой танк', 'Prototype Main Battle Tank': 'Опытный основной танк',
    'Heavy Tank': 'Тяжёлый танк', 'Super Heavy Tank': 'Сверхтяжёлый танк', 'Medium Tank': 'Средний танк',
    'Light Tank': 'Лёгкий танк', 'Tankette': 'Танкетка', 'Tank Destroyer': 'Истребитель танков', 'Assault Gun': 'Штурмовое орудие',
    'Infantry Fighting Vehicle': 'Боевая машина пехоты', 'Armoured Personnel Carrier': 'Бронетранспортёр',
    'Self Propelled Howitzer': 'Самоходная гаубица', 'Self Propelled Anti Aircraft': 'Зенитная самоходная установка',
    'Rocket Artillery': 'Реактивная артиллерия', 'Anti Tank Missile Carrier': 'Самоходный ПТРК',
    'Attack Helicopter': 'Ударный вертолёт', 'Helicopter Gunship': 'Боевой вертолёт', 'Utility Helicopter': 'Многоцелевой вертолёт',
    'Transport Vehicle': 'Транспорт', 'Supply Truck': 'Машина снабжения', 'Reconnaissance Vehicle': 'Разведывательная машина',
    'Support Vehicle': 'Машина поддержки', 'Amphibious Vehicle': 'Машина-амфибия', 'Flamethrower Tank': 'Огнемётный танк',
    'Fire Support Vehicle': 'Машина огневой поддержки', 'Pickup Truck': 'Пикап', 'Flatbed Truck': 'Грузовик',
    'Amphibious': 'Амфибия', 'Stabilizer': 'Стабилизатор', 'Thermal sight': 'Тепловизор', 'Fire control system': 'СУО',
    'Laser warning system': 'Лазерное оповещение', 'Missile warning system': 'Оповещение о ракетах',
    'Active protection': 'Активная защита', 'Smoke screen': 'Дымовая завеса',
    'Tracked': 'Гусеничная', 'Wheeled': 'Колёсная', 'Aircraft': 'Авиация',
    'Viewing modifications does not change the loadout. Costs use the selected game version.': 'Просмотр модификаций не изменяет пресет. Стоимость указана по данным выбранной версии игры.',
    'Additional equipment': 'Дополнительное оснащение', 'Era variants': 'Версии по эпохам',
    'No published modifications are available for this vehicle.': 'В каталоге нет опубликованных модификаций для этой машины.',
    'Era variant': 'Версия по эпохе', 'Cost unavailable': 'Стоимость не указана', 'Cost: {cost}': 'Стоимость: {cost}', 'Era: {era}': 'Эпоха: {era}',
    'In-game description': 'Описание из игры', 'Description derived from published module changes': 'Описание составлено по изменениям модулей игры',
    'Explanation inferred from the name; detailed changes are not published': 'Пояснение составлено по названию; подробные изменения в выгрузке не описаны',
    'Image unavailable': 'Изображение недоступно', 'Image not yet available': 'Изображение пока отсутствует',
    'Vehicle era': 'Версия техники по эпохе', 'Base version': 'Базовая версия', 'Tier {tier}': 'Тир {tier}',
    'Vehicle card sections': 'Разделы карточки техники', 'Overview': 'Обзор', 'Modifications ({count})': 'Модификации ({count})',
    'In-game stats · base configuration': 'Игровые ТТХ · без дополнительных модулей',
    'Forward speed': 'Скорость вперёд', 'Reverse speed': 'Задний ход', 'Mass': 'Масса', 'Seats': 'Мест в машине',
    'Power': 'Мощность', 'Power-to-weight ratio': 'Удельная мощность', ' km/h': ' км/ч', ' t': ' т', ' hp': ' л.с.', ' hp/t': ' л.с./т', ' s': ' с',
    'Numeric stats have not been published for this vehicle.': 'Числовые характеристики для этой машины не опубликованы.',
    'Engine: {engine}': 'Двигатель: {engine}', 'Armament': 'Вооружение', 'reload {time}': 'перезар. {time}',
    'Wiki description': 'Описание из вики', 'Image: MTC Dev Tank Spawner': 'Изображение: MTC Dev Tank Spawner',
    'Could not load the local vehicle catalog. Check data/vehicle-info.json.': 'Не удалось загрузить локальный каталог техники. Проверьте наличие data/vehicle-info.json.',
    'The official catalog has no image or stats for this ID yet. Data from other variants is not substituted.': 'В официальном каталоге пока нет изображения и ТТХ для этого ID. Данные другой модификации не подставляются.',
  };
  const propertyNames = { LimitPerTeam: 'Team Limit', teamLimit: 'Team Limit', LimitPerMatch: 'Match Limit', matchLimit: 'Match Limit', LimitPerMatchTeam: 'Team Match Limit', teamMatchLimit: 'Team Match Limit' };
  const listeners = new Set();
  let language = 'en', savedLanguage = 'en';
  try { if (localStorage.getItem('loadout-language') === 'ru') savedLanguage = 'ru'; } catch {}
  function t(key, values = {}) {
    const text = language === 'ru' && Object.hasOwn(dictionary, key) ? dictionary[key] : Object.hasOwn(propertyNames, key) ? propertyNames[key] : key;
    return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function setLanguage(value) {
    if (!['en', 'ru'].includes(value) || value === language) return;
    language = value;
    try { localStorage.setItem('loadout-language', value); } catch {}
    document.documentElement.lang = value;
    for (const listener of listeners) listener();
    window.dispatchEvent(new Event('loadout-language-change'));
  }
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  function message(value) {
    const text = String(value);
    if (Object.hasOwn(dictionary, text)) return t(text);
    const imported = text.match(/^Imported (\d+) preset\(s\) from file$/);
    if (imported) return t('Imported {count} preset(s) from file', { count: imported[1] });
    if (text.startsWith('Import failed - ')) return t('Import failed - {errors}', {
      errors: text.slice(16).split('; ').map(error => {
        const separator = error.indexOf(': ');
        return separator < 0 ? message(error) : error.slice(0, separator + 2) + message(error.slice(separator + 2));
      }).join('; '),
    });
    const invalid = text.match(/^Invalid (.+)$/);
    if (invalid) return t('Invalid {field}', { field: t(invalid[1]) });
    return text;
  }
  // Delay the saved language until React hydration, whose static markup is English.
  window.LoadoutI18n = Object.freeze({ t, message, setLanguage, getLanguage: () => language, subscribe, restoreLanguage: () => setLanguage(savedLanguage) });
})();
