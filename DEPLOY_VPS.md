# VPS Deploy

Текущая схема:

- фронтенд хостится на вашем VPS как обычная статика из `dist/`
- realtime backend уже живет в SpaceTimeDB Maincloud
- production env для фронтенда лежит в `.env.production`

## 1. Локальная сборка

```bash
npm install
npm run build
```

После этого готовая статика будет в `dist/`.

## 2. Подготовка VPS

Ниже пример для Ubuntu + Nginx.

```bash
sudo apt update
sudo apt install -y nginx

sudo mkdir -p /var/www/site/current
sudo chown -R $USER:$USER /var/www/site
```

## 3. Копирование файлов на сервер

С локальной машины:

```bash
scp -r dist/* user@YOUR_SERVER_IP:/var/www/site/current/
scp deploy/nginx-site.conf user@YOUR_SERVER_IP:/tmp/nginx-site.conf
```

Если у вас уже есть домен и SSH-ключи, лучше `rsync`:

```bash
rsync -avz --delete dist/ user@example.com:/var/www/site/current/
scp deploy/nginx-site.conf user@example.com:/tmp/nginx-site.conf
```

## 4. Nginx

На сервере:

```bash
sudo cp /tmp/nginx-site.conf /etc/nginx/sites-available/site
```

Отредактируйте `server_name`:

```nginx
server_name example.com www.example.com;
```

Проверьте, что `root` совпадает:

```nginx
root /var/www/site/current;
```

Включите сайт:

```bash
sudo ln -s /etc/nginx/sites-available/site /etc/nginx/sites-enabled/site
sudo nginx -t
sudo systemctl reload nginx
```

## 5. HTTPS

Если домен уже указывает на VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## 6. Проверка

Откройте сайт по вашему домену.

Курсоры будут подключаться к:

- `https://maincloud.spacetimedb.com`
- database: `site-cursors`

## 7. Повторный деплой после изменений

Каждый раз после правок фронта:

```bash
npm run build
rsync -avz --delete dist/ user@example.com:/var/www/site/current/
```

Если меняли серверную схему SpaceTimeDB:

```bash
spacetime publish site-cursors --server maincloud --module-path spacetimedb/spacetimedb
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb/spacetimedb
npm run build
```
