# RELEASE_NOTES.md

## Версия

Demo release: 0.3.0

Дата: 2026-06-05

## Что вошло

- production/demo-конфигурация для развертывания;
- docker-compose.prod.yml;
- deploy/restart/check_deploy/build_release BAT-скрипты;
- DEPLOYMENT.md и DEMO_GUIDE.md;
- release-архив для демонстрации;
- описание публичного URL и основного сценария проверки.

## Как запускать

```bat
scripts\deploy.bat
scripts\check_deploy.bat
```

## Известные ограничения

- backend scraper использует временное JSON-хранилище;
- внешние сайты для поиска треков могут менять HTML или блокировать запросы;
- в дальнейшем планируется перенос хранения на полноценную БД и добавление Redis-кэша.
