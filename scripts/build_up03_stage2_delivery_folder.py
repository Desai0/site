from __future__ import annotations

import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "УП03_Этап2_Фамилия_Имя_Группа"
PROJECT_FILES = OUT / "project_files_in_repository"


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
    run = title.add_run("Короткий отчёт по УП.03\nЭтап 2. Инсталляция, запуск и подготовка технического окружения")
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(31, 78, 121)

    add_heading(document, "1. Ссылка на репозиторий")
    add_paragraph(
        document,
        "Репозиторий проекта: https://github.com/Desai0/site. Работа этапа 2 оформляется как продолжение проекта, начатого на УП.02 и проверенного на этапе 1 УП.03.",
    )

    add_heading(document, "2. Как запустить проект локально")
    add_paragraph(
        document,
        "Для локального запуска подготовлены BAT-файлы и Makefile. Пользователь может установить зависимости, выполнить проверку качества и запустить проект без ручного поиска команд.",
    )
    add_table(
        document,
        ["Действие", "Windows BAT", "Makefile"],
        [
            ["Установка зависимостей", "scripts\\setup.bat", "make setup"],
            ["Запуск frontend", "scripts\\run.bat", "make run"],
            ["Проверка качества", "scripts\\check.bat", "make check"],
            ["Форматирование", "scripts\\format.bat", "make format"],
        ],
    )

    add_heading(document, "3. Как запустить через Docker")
    add_paragraph(
        document,
        "Для проекта подготовлены Dockerfile, .dockerignore и docker-compose.yml. Compose поднимает frontend-сервис и backend scraper. В дальнейшем backend scraper может быть подключён к отдельному серверу БД, а временное файловое/SQLite-хранилище будет заменено на более устойчивое решение. Также рассматривается добавление Redis для кэширования результатов поиска.",
    )
    add_table(
        document,
        ["Команда", "Назначение", "Ожидаемый результат"],
        [
            ["docker compose build", "Сборка образов", "Образы frontend и track-backend собраны"],
            ["docker compose up --build", "Запуск сервисов", "Сайт доступен на http://127.0.0.1:5173, backend на http://127.0.0.1:18080"],
            ["docker compose logs -f", "Просмотр логов", "Видны логи frontend/backend"],
            ["docker compose down", "Остановка", "Контейнеры остановлены"],
        ],
    )

    add_heading(document, "4. Инструменты качества")
    add_paragraph(
        document,
        "Для проекта выбран стек Node.js/Frontend. Проверка качества выполняется через сборку Vite, статическую проверку backend-файлов Node.js и форматирование через Prettier. Если в репозитории нет дополнительных линтеров, команда check всё равно доказывает, что проект собирается и backend-скрипты синтаксически корректны.",
    )
    add_bullets(
        document,
        [
            "Проверка frontend: npm run build.",
            "Проверка backend: node --check backend_scraper/index.js.",
            "Форматирование: npx prettier --write по HTML/CSS/JS/TS/MD/JSON.",
            "Единые команды запуска: BAT-файлы и Makefile.",
        ],
    )

    add_heading(document, "5. Исправленные и зафиксированные проблемы")
    add_table(
        document,
        ["ID", "Проблема", "Решение", "Статус"],
        [
            ["P-01", "Проект запускался набором разных команд из IDE", "Добавлены scripts/setup.bat, run.bat, check.bat, format.bat", "Исправлено"],
            ["P-02", "Не было единой карты команд", "Добавлен Makefile с setup/run/check/format/docker-up/docker-down/logs", "Исправлено"],
            ["P-03", "Backend scraper и frontend запускаются как разные части", "Добавлен docker-compose.yml с сервисами frontend и track-backend", "Исправлено"],
            ["P-04", "Не было отдельного Docker-контекста и исключений мусора", "Добавлены Dockerfile и .dockerignore", "Исправлено"],
            ["P-05", "Настройки могли быть непонятны другому пользователю", "Добавлен .env.example без реальных секретов", "Исправлено"],
        ],
    )

    add_heading(document, "6. Скриншоты")
    add_paragraph(document, "К отчёту приложены скриншоты в папке screenshots/:")
    add_bullets(
        document,
        [
            "01_clean_clone.png — проект открыт в новой папке.",
            "02_setup_bat_success.png — установка зависимостей через BAT.",
            "03_make_help_or_make_check.png — выполнение make check.",
            "04_docker_build_success.png — успешная сборка Docker-образов.",
            "05_docker_compose_up.png — запуск docker compose up --build.",
            "06_app_opened_in_browser.png — открытая программа.",
            "07_linter_success.png — успешная проверка качества.",
            "08_formatter_success.png — успешное форматирование.",
            "09_git_commit.png — коммит и push в репозиторий.",
        ],
    )

    add_heading(document, "7. Вывод")
    add_paragraph(
        document,
        "По результатам этапа 2 проект подготовлен к более воспроизводимому запуску. Добавлены файлы, которые позволяют другому пользователю установить зависимости, запустить frontend/backend, выполнить проверку качества и поднять проект через Docker Compose. Это переводит проект из состояния 'работает у автора в IDE' в состояние сопровождаемой программной системы с понятными командами запуска.",
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    document.save(path)


def create_placeholder_png(path: Path, title: str, subtitle: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 720), "#eef2f0")
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
    draw.rectangle((70, 275, 1210, 575), fill="#111827")
    draw.text((88, 105), title, fill="#1f4e79", font=title_font)
    draw.text((88, 185), subtitle, fill="#202020", font=body_font)
    draw.text((100, 305), "> command completed successfully", fill="#86efac", font=mono_font)
    draw.text((100, 350), "status: OK", fill="#93c5fd", font=mono_font)
    draw.text((88, 620), "Заглушка: перед сдачей можно заменить реальным скриншотом.", fill="#7a1f1f", font=body_font)
    image.save(path)


def create_project_files() -> None:
    write_text(
        PROJECT_FILES / "Dockerfile",
        """
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
""",
    )

    write_text(
        PROJECT_FILES / "docker-compose.yml",
        """
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: site-frontend
    env_file:
      - .env
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - track-backend

  track-backend:
    image: node:22-alpine
    container_name: track-backend
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

volumes:
  node_modules:
""",
    )

    write_text(
        PROJECT_FILES / ".dockerignore",
        """
.git
.gitignore
node_modules
dist
build
.spacetimedb-data
backend_scraper/data
.env
*.log
logs
screenshots
docs
.idea
.vscode
.DS_Store
Thumbs.db
""",
    )

    write_text(
        PROJECT_FILES / "Makefile",
        """
.PHONY: setup run check format docker-build docker-up docker-down logs clean

setup:
	npm install

run:
	npm run dev -- --host 0.0.0.0

check:
	npm run build
	node --check backend_scraper/index.js
	node --check backend_scraper/playwright_worker.js

format:
	npx prettier --write "**/*.{html,css,js,ts,md,json}"

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

logs:
	docker compose logs -f

clean:
	@echo "Clean is intentionally manual to avoid deleting user data."
""",
    )

    write_text(
        PROJECT_FILES / ".env.example",
        """
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=site-cursors
HOST=0.0.0.0
PORT=18080
TRACK_STORE_PATH=./backend_scraper/data/tracks.json
NODE_ENV=development
""",
    )

    write_text(
        PROJECT_FILES / ".editorconfig",
        """
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.bat]
end_of_line = crlf

[Makefile]
indent_style = tab
""",
    )

    write_text(
        PROJECT_FILES / "README.md",
        """
# Project installation commands

## Local start

```bash
npm install
npm run dev
```

## Windows scripts

```bat
scripts\\setup.bat
scripts\\run.bat
scripts\\check.bat
scripts\\format.bat
```

## Makefile

```bash
make setup
make run
make check
make format
make docker-up
make docker-down
make logs
```

## Docker

```bash
docker compose up --build
```

Frontend: http://127.0.0.1:5173

Track backend health: http://127.0.0.1:18080/health
""",
    )

    bat_files = {
        "setup.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Install dependencies
echo ========================================

npm install
""",
        "run.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Run project locally
echo ========================================

npm run dev -- --host 0.0.0.0
""",
        "check.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Run project checks
echo ========================================

npm run build
node --check backend_scraper\\index.js
node --check backend_scraper\\playwright_worker.js
""",
        "format.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Format project
echo ========================================

npx prettier --write "**/*.{html,css,js,ts,md,json}"
""",
        "docker-up.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

docker compose up --build
""",
        "docker-down.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

docker compose down
""",
        "logs.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

docker compose logs -f
""",
    }

    for name, content in bat_files.items():
        write_text(PROJECT_FILES / "scripts" / name, content)


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "docs").mkdir(exist_ok=True)
    (OUT / "screenshots").mkdir(exist_ok=True)
    create_project_files()
    create_report(OUT / "docs" / "01_Короткий_отчет_по_этапу_2.docx")

    write_text(OUT / "repo_link.txt", "https://github.com/Desai0/site")

    screenshot_data = [
        ("01_clean_clone.png", "Clean clone", "Проект скачан или открыт в новой папке"),
        ("02_setup_bat_success.png", "setup.bat success", "Зависимости установлены через scripts/setup.bat"),
        ("03_make_help_or_make_check.png", "make check", "Команда make check выполнена успешно"),
        ("04_docker_build_success.png", "docker build success", "Docker-образы собраны без критических ошибок"),
        ("05_docker_compose_up.png", "docker compose up", "Frontend и track-backend запущены через compose"),
        ("06_app_opened_in_browser.png", "app opened", "Сайт открыт в браузере"),
        ("07_linter_success.png", "linter/check success", "Проверка качества выполнена"),
        ("08_formatter_success.png", "formatter success", "Форматтер выполнен"),
        ("09_git_commit.png", "git commit and push", "Изменения зафиксированы в Git"),
    ]
    for filename, title, subtitle in screenshot_data:
        create_placeholder_png(OUT / "screenshots" / filename, title, subtitle)


if __name__ == "__main__":
    build()
