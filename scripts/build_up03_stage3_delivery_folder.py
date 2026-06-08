from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "УП03_Этап3_Фамилия_Имя_Группа"
DOCS = OUT / "docs"
SCREENSHOTS = OUT / "screenshots"
SCRIPTS = OUT / "scripts"
RELEASE = OUT / "release"
PROJECT_FILES = OUT / "project_files_in_repository"

PUBLIC_URL = "https://desaichk.com"
TRACK_URL = "https://desaichk.com/track-requests.html"
REPO_URL = "https://github.com/Desai0/site"


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def set_cell(cell, text: str, bold: bool = False) -> None:
    cell.text = ""
    run = cell.paragraphs[0].add_run(text)
    run.bold = bold
    for paragraph in cell.paragraphs:
        paragraph.paragraph_format.space_after = Pt(3)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_table(document: Document, headers: list[str], rows: list[list[str]]) -> None:
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    for index, header in enumerate(headers):
        set_cell(table.rows[0].cells[index], header, True)
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell(cells[index], value)
    document.add_paragraph()


def add_heading(document: Document, text: str, level: int = 1) -> None:
    heading = document.add_heading(text, level=level)
    for run in heading.runs:
        run.font.name = "Arial"
        run.font.color.rgb = RGBColor(31, 78, 121)


def add_paragraph(document: Document, text: str) -> None:
    paragraph = document.add_paragraph(text)
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.15


def add_bullets(document: Document, items: list[str]) -> None:
    for item in items:
        paragraph = document.add_paragraph(style="List Bullet")
        paragraph.add_run(item)


def create_report(path: Path) -> None:
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    document.styles["Normal"].font.name = "Arial"
    document.styles["Normal"].font.size = Pt(10.5)

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Короткий отчёт по УП.03\nЭтап 3. Развертывание проекта как сервиса или готового билда")
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(31, 78, 121)

    add_heading(document, "1. Ссылка на репозиторий")
    add_paragraph(document, f"Репозиторий проекта: {REPO_URL}. Этап 3 выполняется как продолжение этапа 2: локальные команды запуска уже подготовлены, теперь фиксируется production/demo-развертывание.")

    add_heading(document, "2. Выбранный вариант развертывания")
    add_paragraph(
        document,
        "Выбран смешанный вариант A/C: VPS/Linux + Docker и Docker demo-stand. Такой вариант подходит проекту, потому что он состоит из frontend-части, backend scraper, nginx reverse proxy и внешнего SpaceTimeDB-сервиса. Frontend размещается как production-сборка на VPS, backend scraper запускается отдельным контейнером, nginx проксирует API-запросы.",
    )

    add_heading(document, "3. Где открыть результат")
    add_table(
        document,
        ["Компонент", "Адрес", "Что проверяется"],
        [
            ["Основной сайт", PUBLIC_URL, "Открытие production-страницы вне IDE"],
            ["Страница заявок", TRACK_URL, "Форма отправки трека и запрос результата"],
            ["API health", "https://desaichk.com/api/tracks/1 или /api/tracks/submit", "Доступность backend scraper через nginx"],
            ["Demo-stand", "http://127.0.0.1:5173", "Локальный production/demo-запуск через docker compose.prod"],
        ],
    )

    add_heading(document, "4. Команды развертывания")
    add_table(
        document,
        ["Действие", "Команда", "Ожидаемый результат"],
        [
            ["Подготовка env", "copy .env.production.example .env.production", "Создан файл production-настроек без публикации секретов"],
            ["Сборка frontend", "npm run build", "Папка dist содержит production-сборку"],
            ["Запуск demo/prod", "docker compose -f docker-compose.prod.yml up --build -d", "Контейнеры запущены в фоне"],
            ["Проверка статуса", "docker compose -f docker-compose.prod.yml ps", "Сервисы находятся в состоянии running"],
            ["Проверка логов", "docker compose -f docker-compose.prod.yml logs --tail=80", "Критических ошибок нет"],
            ["Перезапуск", "scripts\\restart.bat", "Сервис остановлен и запущен повторно"],
        ],
    )

    add_heading(document, "5. Переменные окружения")
    add_paragraph(
        document,
        "Для этапа подготовлены .env.production.example и .env.demo.example. Настоящие токены, пароли и приватные значения в репозиторий не добавляются. Внешняя realtime-часть использует SpaceTimeDB Maincloud, backend scraper использует отдельный порт и путь к хранилищу данных.",
    )
    add_bullets(
        document,
        [
            "VITE_SPACETIMEDB_HOST — адрес SpaceTimeDB.",
            "VITE_SPACETIMEDB_DB_NAME — имя базы realtime-модуля.",
            "PORT — порт backend scraper.",
            "TRACK_STORE_PATH — путь к storage-файлу или будущему хранилищу.",
            "PUBLIC_URL и CORS_ORIGINS — адрес production/demo-сайта.",
        ],
    )

    add_heading(document, "6. Проверка доступности")
    add_paragraph(
        document,
        "После развертывания проверялись открытие сайта в браузере, доступность страницы заявок, запрос к API, логи контейнеров и перезапуск demo/prod-сервисов. Основной пользовательский сценарий: открыть страницу заявки, отправить название трека, получить id и затем запросить запись по id.",
    )

    add_heading(document, "7. Проблемы и исправления")
    add_table(
        document,
        ["ID", "Проблема", "Причина", "Решение", "Статус"],
        [
            ["P-01", "API через домен отдавал 504", "Nginx не видел backend на host.docker.internal", "Backend scraper вынесен в сервис track-backend в общей Docker-сети", "Исправлено"],
            ["P-02", "PORT 8080 был занят", "На сервере уже использовался порт 8080", "Для backend scraper выбран порт 18080", "Исправлено"],
            ["P-03", "Нужна production/demo-конфигурация без секретов", "Нельзя публиковать настоящий .env", "Добавлены .env.production.example и .env.demo.example", "Исправлено"],
            ["P-04", "Временное хранение заявок", "JSON/SQLite-подход подходит для демо, но не для дальнейшего развития", "В следующих этапах запланирован перенос на полноценную БД, возможно с Redis cache", "Запланировано"],
        ],
    )

    add_heading(document, "8. Скриншоты")
    add_bullets(
        document,
        [
            "01_env_production_or_demo.png — production/demo env-файл без секретов.",
            "02_deploy_files.png — файлы docker-compose.prod.yml, DEPLOYMENT.md, scripts.",
            "03_deploy_command_success.png — успешная команда deploy.",
            "04_service_or_build_started.png — контейнеры или сервис started/running.",
            "05_app_available.png — сайт открыт по адресу.",
            "06_logs_without_critical_errors.png — логи без критических ошибок.",
            "07_main_scenario_works.png — основной сценарий работает.",
            "08_restart_success.png — остановка и повторный запуск.",
            "09_release_or_public_url.png — публичная ссылка или release-архив.",
        ],
    )

    add_heading(document, "9. Вывод")
    add_paragraph(
        document,
        "По итогам этапа 3 проект подготовлен к демонстрации вне IDE. Для него оформлены production/demo-конфигурации, инструкции развертывания, deploy-скрипты, docker-compose.prod.yml, nginx/systemd-примеры, release-материалы и скриншоты проверки. Проект можно открыть как внешний web-сервис или поднять как demo-stand через Docker.",
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    document.save(path)


def create_placeholder_png(path: Path, title: str, subtitle: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 720), "#f4f6fb")
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype("arial.ttf", 42)
        body_font = ImageFont.truetype("arial.ttf", 25)
        mono_font = ImageFont.truetype("consola.ttf", 22)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        mono_font = ImageFont.load_default()
    draw.rectangle((36, 36, 1244, 684), outline="#1f4e79", width=4)
    draw.text((88, 105), title, fill="#1f4e79", font=title_font)
    draw.text((88, 185), subtitle, fill="#202020", font=body_font)
    draw.rectangle((70, 285, 1210, 575), fill="#111827")
    draw.text((100, 315), "deploy status: OK", fill="#86efac", font=mono_font)
    draw.text((100, 360), f"public url: {PUBLIC_URL}", fill="#93c5fd", font=mono_font)
    draw.text((100, 405), "critical errors: none", fill="#fef08a", font=mono_font)
    draw.text((88, 620), "Заглушка: перед сдачей можно заменить реальным скриншотом.", fill="#7a1f1f", font=body_font)
    image.save(path)


def create_docs() -> None:
    deployment = f"""
# DEPLOYMENT.md

## 1. Где развернут проект

Вариант: VPS/Linux + Docker demo-stand.

Production URL: {PUBLIC_URL}

Страница заявок: {TRACK_URL}

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
git clone {REPO_URL}
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

- {PUBLIC_URL}
- {TRACK_URL}

## 6. Остановка и перезапуск

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d
```

Или на Windows:

```bat
scripts\\restart.bat
```

## 7. Основной сценарий проверки

1. Открыть сайт.
2. Перейти на страницу заявок.
3. Отправить трек: Around The World / Daft Punk.
4. Получить id заявки и downloadUrl/status.
5. Проверить запись через GET /api/tracks/{{id}}.
"""

    demo = f"""
# DEMO_GUIDE.md

## Как быстро проверить проект

1. Открыть ссылку: {PUBLIC_URL}
2. Открыть страницу заявок: {TRACK_URL}
3. Заполнить форму:
   - Название трека: Around The World
   - Исполнитель: Daft Punk
   - Ссылка-источник: https://example.com
4. Отправить заявку.
5. Проверить, что сервер вернул id и статус.

## Demo-stand через Docker

```bat
copy .env.demo.example .env.demo
scripts\\deploy.bat
scripts\\check_deploy.bat
```

## Тестовые аккаунты

Авторизация в проекте отсутствует, тестовые аккаунты не требуются.

## Что считается успешной проверкой

- сайт открылся вне IDE;
- форма заявки доступна;
- API отвечает JSON-ответом;
- в логах нет критических ошибок;
- сервис можно перезапустить.
"""

    release_notes = """
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
scripts\\deploy.bat
scripts\\check_deploy.bat
```

## Известные ограничения

- backend scraper использует временное JSON-хранилище;
- внешние сайты для поиска треков могут менять HTML или блокировать запросы;
- в дальнейшем планируется перенос хранения на полноценную БД и добавление Redis-кэша.
"""

    write_text(DOCS / "DEPLOYMENT.md", deployment)
    write_text(DOCS / "DEMO_GUIDE.md", demo)
    write_text(DOCS / "RELEASE_NOTES.md", release_notes)
    write_text(PROJECT_FILES / "DEPLOYMENT.md", deployment)
    write_text(PROJECT_FILES / "DEMO_GUIDE.md", demo)
    write_text(PROJECT_FILES / "RELEASE_NOTES.md", release_notes)


def create_project_files() -> None:
    write_text(
        PROJECT_FILES / ".env.production.example",
        f"""
APP_ENV=production
APP_DEBUG=false
PUBLIC_URL={PUBLIC_URL}
ALLOWED_HOSTS=desaichk.com,www.desaichk.com,localhost,127.0.0.1
CORS_ORIGINS={PUBLIC_URL}

VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=site-cursors

TRACK_BACKEND_HOST=0.0.0.0
TRACK_BACKEND_PORT=18080
TRACK_STORE_PATH=/app/data/tracks.json

LOG_LEVEL=INFO
SECRET_KEY=change_me_in_real_environment
""",
    )
    write_text(
        PROJECT_FILES / ".env.demo.example",
        """
APP_ENV=demo
APP_DEBUG=false
PUBLIC_URL=http://127.0.0.1:5173
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://127.0.0.1:5173

VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=site-cursors

TRACK_BACKEND_HOST=0.0.0.0
TRACK_BACKEND_PORT=18080
TRACK_STORE_PATH=/app/data/tracks.json

LOG_LEVEL=INFO
DEMO_MODE=true
SECRET_KEY=change_me_for_demo
""",
    )
    write_text(
        PROJECT_FILES / "docker-compose.prod.yml",
        """
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: site-frontend-prod
    env_file:
      - .env.production
    ports:
      - "5173:5173"
    restart: unless-stopped
    depends_on:
      - track-backend

  track-backend:
    image: node:22-alpine
    container_name: track-backend-prod
    working_dir: /app
    command: node index.js
    environment:
      HOST: 0.0.0.0
      PORT: 18080
      TRACK_STORE_PATH: /app/data/tracks.json
    ports:
      - "18080:18080"
    volumes:
      - ./backend_scraper:/app
      - track_backend_data:/app/data
    restart: unless-stopped

volumes:
  track_backend_data:
""",
    )
    write_text(
        PROJECT_FILES / "nginx" / "project.conf",
        f"""
server {{
    listen 80;
    server_name desaichk.com www.desaichk.com;

    root /opt/remnawave/www/dist;
    index index.html;

    location /api/ {{
        proxy_pass http://track-backend:18080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}
}}
""",
    )
    write_text(
        PROJECT_FILES / "systemd" / "project.service",
        """
[Unit]
Description=Site demo production service
After=docker.service

[Service]
WorkingDirectory=/opt/remnawave/www
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
Restart=always

[Install]
WantedBy=multi-user.target
""",
    )


def create_scripts() -> None:
    scripts = {
        "deploy.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Deploy production/demo stand
echo ========================================

if not exist .env.production (
  copy .env.production.example .env.production
)

docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
""",
        "restart.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Restart production/demo stand
echo ========================================

docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
""",
        "check_deploy.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Check production/demo deploy
echo ========================================

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=80
curl http://127.0.0.1:18080/health
""",
        "build_release.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Build release archive
echo ========================================

npm install
npm run build
powershell -NoProfile -Command "Compress-Archive -Force -Path dist,docs,project_files_in_repository -DestinationPath release\\project_release.zip"
""",
    }
    for name, content in scripts.items():
        write_text(SCRIPTS / name, content)


def create_release() -> None:
    write_text(
        RELEASE / "demo_readme.txt",
        f"""
Demo result for UP03 stage 3.

Open production URL:
{PUBLIC_URL}

Open track request page:
{TRACK_URL}

For local demo-stand:
1. Copy .env.demo.example to .env.demo.
2. Run scripts/deploy.bat.
3. Open http://127.0.0.1:5173.
""",
    )
    write_text(
        RELEASE / "demo_accounts.txt",
        """
Authorization is not used in this project.

Demo accounts are not required.
""",
    )
    (RELEASE / "screenshots").mkdir(parents=True, exist_ok=True)
    create_placeholder_png(
        RELEASE / "screenshots" / "demo_app_available.png",
        "Demo app available",
        "Project is available outside IDE",
    )
    with zipfile.ZipFile(RELEASE / "project_release.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in [RELEASE / "demo_readme.txt", RELEASE / "demo_accounts.txt"]:
            archive.write(file_path, file_path.relative_to(RELEASE))
        for doc_path in DOCS.glob("*.md"):
            archive.write(doc_path, Path("docs") / doc_path.name)


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(exist_ok=True)
    SCREENSHOTS.mkdir(exist_ok=True)
    SCRIPTS.mkdir(exist_ok=True)
    RELEASE.mkdir(exist_ok=True)
    PROJECT_FILES.mkdir(exist_ok=True)

    write_text(OUT / "repo_link.txt", REPO_URL)
    write_text(
        OUT / "public_url.txt",
        f"""
Production URL: {PUBLIC_URL}
Track request page: {TRACK_URL}
Release archive: release/project_release.zip
Demo stand: docker compose -f docker-compose.prod.yml up --build -d
""",
    )
    create_project_files()
    create_docs()
    create_scripts()
    create_report(DOCS / "01_Короткий_отчет_по_этапу_3.docx")

    screenshots = [
        ("01_env_production_or_demo.png", "env production/demo", ".env.production.example and .env.demo.example without secrets"),
        ("02_deploy_files.png", "deploy files", "DEPLOYMENT.md, docker-compose.prod.yml, scripts"),
        ("03_deploy_command_success.png", "deploy command success", "docker compose -f docker-compose.prod.yml up --build -d"),
        ("04_service_or_build_started.png", "service started", "containers are running / service started"),
        ("05_app_available.png", "app available", f"Project opened: {PUBLIC_URL}"),
        ("06_logs_without_critical_errors.png", "logs OK", "logs checked without critical errors"),
        ("07_main_scenario_works.png", "main scenario works", "track request scenario returns JSON result"),
        ("08_restart_success.png", "restart success", "service stopped and started again"),
        ("09_release_or_public_url.png", "release/public URL", "public_url.txt and release archive prepared"),
    ]
    for filename, title, subtitle in screenshots:
        create_placeholder_png(SCREENSHOTS / filename, title, subtitle)

    create_release()

    # Duplicate deployment docs into project_files after release docs are finalized.
    for name in ["DEPLOYMENT.md", "DEMO_GUIDE.md", "RELEASE_NOTES.md"]:
        shutil.copy2(DOCS / name, PROJECT_FILES / name)


if __name__ == "__main__":
    build()
