# Changelog

Все заметные изменения проекта фиксируются в этом файле.

## [0.3.1] - 2026-06-10

### Fixed

- CORS backend больше не разрешает произвольные внешние origin через `*`.
- Разрешённые origin задаются переменной `CORS_ORIGINS`.

### Added

- Интеграционный тест разрешённого и запрещённого origin.
- GitHub Actions workflow для проверки backend, теста CORS и production-сборки.
- Команды `npm run check`, `npm run test:security` и `npm run release:check`.
- BAT-скрипты проверки, сборки и создания release-архива.

### Verified

- `npm run check:backend`
- `npm run test:security`
- `npm run build`

## [0.3.0] - 2026-06-05

### Added

- Production/demo Docker-конфигурация.
- Скрипты развертывания и диагностики.
- Документация по запуску на VPS.
