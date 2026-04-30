# Desaichk Portfolio

Одностраничное портфолио с кастомной “бумажной” версткой, декоративной SVG-графикой и realtime-синхронизацией курсоров через SpaceTimeDB.

## Стек

- `HTML`, `CSS`, `Vanilla JS`
- `TypeScript` для client-side realtime слоя
- `Vite` для сборки фронтенда
- `SpaceTimeDB` для синхронизации курсоров

## Структура проекта

```text
site/
├── index.html                    # Основная страница
├── style.css                     # Основные стили
├── script.js                     # Декоративная и UI-логика страницы
├── src/
│   ├── cursor-sync.ts            # Realtime-синхронизация курсоров
│   └── module_bindings/          # Сгенерированные SpaceTimeDB bindings
├── spacetimedb/
│   ├── spacetime.json            # Конфиг SpaceTimeDB
│   ├── spacetime.local.json      # Локальная база SpaceTimeDB
│   └── spacetimedb/
│       └── src/index.ts          # Серверный модуль курсоров
├── images/                       # Изображения
├── deploy/
│   └── nginx-site.conf           # Пример nginx-конфига
├── DEPLOY_VPS.md                 # Заметки по деплою на VPS
└── package.json
```

## Возможности

- скетч-стилизация страницы под лист блокнота;
- SVG-фильтры, декоративные штрихи и рукописные элементы;
- контактная форма через `mailto:`;
- синхронизация курсоров пользователей между клиентами;
- production-сборка фронтенда через Vite.

## Установка

```bash
npm install
```

## Локальная разработка

### 1. Поднять SpaceTimeDB локально

Если CLI уже установлен:

```bash
spacetime start --listen-addr 127.0.0.1:3000
```

### 2. Опубликовать локальный модуль

```bash
spacetime publish site-cursors --server local --module-path spacetimedb/spacetimedb
```

### 3. Перегенерировать bindings при изменении схемы

```bash
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb/spacetimedb
```

### 4. Запустить фронтенд

```bash
npm run dev
```

По умолчанию:

- фронтенд: `http://127.0.0.1:5173`
- локальный SpaceTimeDB: `ws://127.0.0.1:3000`

## Production build

```bash
npm run build
```

Готовая статика будет в `dist/`.

## SpaceTimeDB Maincloud

Публикация модуля в Maincloud:

```bash
spacetime login
spacetime publish site-cursors --server maincloud --module-path spacetimedb/spacetimedb
```

Текущие production env-переменные:

```env
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=site-cursors
```

Они лежат в `.env.production`.

## Деплой на VPS

Для VPS используется только собранная статика из `dist/`. Realtime backend живет в SpaceTimeDB Maincloud.

Базовый порядок:

```bash
npm run build
```

После этого:

- загрузить `dist/` на сервер;
- настроить `root` в nginx на каталог со статикой;
- перезагрузить nginx.

Подробности: [DEPLOY_VPS.md](DEPLOY_VPS.md)

## Важно

- `src/module_bindings/` — сгенерированные файлы, вручную их не редактировать;
- при изменении `spacetimedb/spacetimedb/src/index.ts` нужно заново делать `publish` и `generate`;
- локальная папка `.spacetimedb-data/` в git не хранится.
