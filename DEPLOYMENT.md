# DEPLOYMENT.md

## 1. Где развернут проект

Вариант: VPS/Linux + Docker demo-stand.

Production URL: https://desaichk.com

Страница заявок: https://desaichk.com/track-requests.html

## 2. Требования

- ОС: Debian 12 / Windows для локального demo-stand.
- Docker и Docker Compose.
- Node.js 20+ для локальной сборки без контейнера.
- Порты: 5173 для demo frontend, 18080 для track-backend, 80/443 на VPS через nginx.
- Внешний realtime-сервис: SpaceTimeDB Maincloud.

## 3. Переменные окружения

Создать production-файл:

```bash
cp .env.production.example .env.production
```

Для demo-stand:

```bash
cp .env.demo.example .env.demo
```

Настоящие секреты и production-токены не публикуются.

## 4. Команды развертывания

```bash
git clone https://github.com/Desai0/site
cd site
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml up --build -d
```

## 5. Проверка

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=80
curl http://127.0.0.1:18080/health
```

Открыть:

- https://desaichk.com
- https://desaichk.com/track-requests.html

## 6. Остановка и перезапуск

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d
```

Или на Windows:

```bat
scripts\restart.bat
```

## 7. Основной сценарий проверки

1. Открыть сайт.
2. Перейти на страницу заявок.
3. Отправить трек: Around The World / Daft Punk.
4. Получить id заявки и downloadUrl/status.
5. Проверить запись через GET /api/tracks/{id}.
