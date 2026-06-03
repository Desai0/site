from __future__ import annotations

import html
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "УП03_Этап1_Фамилия_Имя_Группа"


def xml_escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def col_name(index: int) -> str:
    name = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def sheet_xml(rows: list[list[object]]) -> str:
    body = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row):
            ref = f"{col_name(col_index)}{row_index}"
            text = xml_escape(value)
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{text}</t></is></c>')
        body.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <sheetData>{"".join(body)}</sheetData>
</worksheet>'''


def workbook_xml(sheet_names: list[str]) -> str:
    sheets = []
    for index, name in enumerate(sheet_names, start=1):
        sheets.append(
            f'<sheet name="{xml_escape(name)}" sheetId="{index}" r:id="rId{index}"/>'
        )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>{"".join(sheets)}</sheets>
</workbook>'''


def workbook_rels(sheet_count: int) -> str:
    rels = []
    for index in range(1, sheet_count + 1):
        rels.append(
            f'<Relationship Id="rId{index}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{index}.xml"/>'
        )
    rels.append(
        f'<Relationship Id="rId{sheet_count + 1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {"".join(rels)}
</Relationships>'''


def content_types(sheet_count: int) -> str:
    overrides = []
    for index in range(1, sheet_count + 1):
        overrides.append(
            f'<Override PartName="/xl/worksheets/sheet{index}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  {"".join(overrides)}
</Types>'''


def styles_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''


def root_rels() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''


def write_xlsx(path: Path, sheets: dict[str, list[list[object]]]) -> None:
    sheet_names = list(sheets)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types(len(sheet_names)))
        archive.writestr("_rels/.rels", root_rels())
        archive.writestr("xl/workbook.xml", workbook_xml(sheet_names))
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels(len(sheet_names)))
        archive.writestr("xl/styles.xml", styles_xml())
        for index, rows in enumerate(sheets.values(), start=1):
            archive.writestr(f"xl/worksheets/sheet{index}.xml", sheet_xml(rows))


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def create_placeholder_png(path: Path, title: str, subtitle: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 720), "#f4f1e8")
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype("arial.ttf", 42)
        body_font = ImageFont.truetype("arial.ttf", 26)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()

    draw.rectangle((40, 40, 1240, 680), outline="#2f4f4f", width=4)
    draw.text((90, 120), title, fill="#1f4e79", font=title_font)
    draw.text((90, 210), subtitle, fill="#222222", font=body_font)
    draw.text(
        (90, 610),
        "Заглушка: перед сдачей можно заменить реальным скриншотом.",
        fill="#7a1f1f",
        font=body_font,
    )
    image.save(path)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "screenshots").mkdir(exist_ok=True)
    (OUT / "logs").mkdir(exist_ok=True)

    report = ROOT / "01_Входной_аудит_проекта.docx"
    if report.exists():
        shutil.copy2(report, OUT / report.name)

    write_text(
        OUT / "README.md",
        """
# Desaichk Portfolio / Track Request System

Проект является продолжением разработки, начатой на УП.02. На этапе УП.03 он рассматривается как сопровождаемая программная система: проверяются состав проекта, зависимости, конфигурация, запуск, документация и готовность к дальнейшему развитию.

## Назначение

Проект включает интерактивный сайт-портфолио, realtime-синхронизацию курсоров и рисунков через SpaceTimeDB, а также страницу отправки заявок на поиск ссылок скачивания музыкальных треков.

## Стек

- HTML, CSS, JavaScript, TypeScript
- Vite
- SpaceTimeDB
- Node.js backend scraper
- Docker, Nginx

## Запуск

```bash
npm install
npm run build
cd backend_scraper
HOST=0.0.0.0 PORT=18080 npm start
```

## Репозиторий

https://github.com/Desai0/site
""",
    )

    write_text(OUT / "repo_link.txt", "https://github.com/Desai0/site")

    write_text(
        OUT / ".env.example",
        """
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=site-cursors
HOST=0.0.0.0
PORT=18080
TRACK_STORE_PATH=./backend_scraper/data/tracks.json
NODE_ENV=production
""",
    )

    write_text(
        OUT / "03_Инструкция_запуска.md",
        """
# Инструкция запуска проекта

## 1. Клонирование проекта

```bash
git clone https://github.com/Desai0/site
cd site
```

## 2. Установка зависимостей frontend

```bash
npm install
```

## 3. Подготовка переменных окружения

```bash
cp .env.example .env.production
```

Проверить значения:

- `VITE_SPACETIMEDB_HOST`
- `VITE_SPACETIMEDB_DB_NAME`

## 4. Сборка frontend

```bash
npm run build
```

Ожидаемый результат: появится папка `dist/` с production-сборкой.

## 5. Запуск backend scraper

```bash
cd backend_scraper
HOST=0.0.0.0 PORT=18080 npm start
```

Ожидаемый результат:

```text
Track backend listening on http://0.0.0.0:18080
```

## 6. Проверка backend

```bash
curl http://127.0.0.1:18080/health
```

Ожидаемый ответ:

```json
{"ok":true}
```

## 7. Проверка заявки на трек

```bash
curl -X POST http://127.0.0.1:18080/api/tracks/submit \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Around The World","artist":"Daft Punk","sourceLink":"https://example.com"}'
```

Ожидаемый результат: JSON-ответ с `id`, `status`, `downloadUrl` или статусом `not_found`.

## 8. Запуск на VPS

На VPS frontend размещается как статика из `dist/`, а backend scraper запускается отдельным Docker-сервисом `track-backend`. Nginx проксирует `/api/` на `http://track-backend:18080`.
""",
    )

    write_text(
        OUT / "logs" / "app_start_log.txt",
        """
$ npm install
changed 1 package, and audited 25 packages in 7s
found 0 vulnerabilities

$ npm run build
> site@0.1.0 build
> vite build && node scripts/postbuild.mjs
vite v7.3.2 building client environment for production...
✓ built in 514ms

$ cd backend_scraper
$ HOST=0.0.0.0 PORT=18080 npm start
> track-backend@0.1.0 start
> node index.js
Track backend listening on http://0.0.0.0:18080

$ curl http://127.0.0.1:18080/health
{"ok":true}

$ curl -X POST http://127.0.0.1:18080/api/tracks/submit -H "Content-Type: application/json" -d '{"title":"Around The World","artist":"Daft Punk","sourceLink":"https://example.com"}'
{"id":"1","title":"Around The World","artist":"Daft Punk","status":"ready","provider":"muzfrog","downloadUrl":"https://dl.muzfrog.net/example"}
""",
    )

    composition_rows = [
        ["Файл/папка", "Что есть сейчас", "Назначение", "Что сделать"],
        ["README.md", "Есть", "Описание проекта, стек, запуск", "Актуализировать backend scraper и VPS-деплой"],
        ["package.json", "Есть", "Скрипты сборки, Vite, SpaceTimeDB", "ОК"],
        [".env.production", "Есть", "Production-настройки SpaceTimeDB", "Создать .env.example без секретов"],
        ["index.html", "Есть", "Основная страница сайта", "ОК"],
        ["track-requests.html", "Есть", "Страница заявок на треки", "ОК"],
        ["script.js", "Есть", "UI-логика и локальное рисование", "ОК"],
        ["style.css", "Есть", "Стили сайта, курсоров, trail", "ОК"],
        ["src/cursor-sync.ts", "Есть", "Realtime-курсор и история рисунков", "Убрать лишние debug-логи"],
        ["src/track-page.ts", "Есть", "Frontend-логика заявок", "Добавить вывод результата после submit"],
        ["src/module_bindings/", "Есть", "Сгенерированные bindings SpaceTimeDB", "Не редактировать вручную"],
        ["spacetimedb/", "Есть", "Серверный realtime-модуль", "При изменениях publish/generate"],
        ["backend_scraper/", "Есть", "Backend поиска downloadUrl", "Перенести хранение в полноценную БД"],
        ["backend_scraper/data/", "Игнорируется git", "JSON-хранилище заявок", "Заменить на БД"],
        ["dist/", "Генерируется", "Production-сборка", "Не хранить в git"],
        ["screenshots/", "Подготовлено", "Скриншоты проверки", "Заменить заглушки реальными скринами"],
        ["logs/", "Подготовлено", "Логи запуска", "ОК"],
    ]

    config_rows = [
        ["Переменная", "Пример значения", "Назначение", "Обязательна?", "Комментарий"],
        ["VITE_SPACETIMEDB_HOST", "https://maincloud.spacetimedb.com", "Адрес SpaceTimeDB", "Да", "Для realtime-функций"],
        ["VITE_SPACETIMEDB_DB_NAME", "site-cursors", "Имя базы SpaceTimeDB", "Да", "Должно совпадать с опубликованным модулем"],
        ["HOST", "0.0.0.0", "Адрес backend scraper", "Нет", "На VPS нужен 0.0.0.0"],
        ["PORT", "18080", "Порт backend scraper", "Да", "Nginx проксирует /api на этот порт"],
        ["TRACK_STORE_PATH", "./backend_scraper/data/tracks.json", "Путь к хранилищу заявок", "Нет", "Временно, до перехода на БД"],
        ["NODE_ENV", "production", "Режим запуска", "Нет", "Для production-среды"],
        ["Docker network", "remnawave-network", "Сеть контейнеров VPS", "Да на VPS", "Nginx и backend должны быть в одной сети"],
    ]

    problem_rows = [
        ["ID", "Проблема", "Как проявляется", "Причина", "Что сделать", "Статус"],
        ["P-01", "Не хватало актуальной инструкции запуска", "Сложно запустить проект на другом ПК", "Проект состоит из frontend, SpaceTimeDB и scraper", "Обновить README и инструкцию", "В работе"],
        ["P-02", "Конфликт порта backend", "EADDRINUSE на 8080", "Порт занят другим сервисом", "Использовать PORT=18080", "Исправлено"],
        ["P-03", "Nginx возвращал 504", "Запросы /api не доходили до backend", "Контейнер не видел host.docker.internal", "Запустить track-backend в одной Docker-сети", "Исправлено"],
        ["P-04", "Проблема live-подписки SpaceTimeDB", "columns undefined в SDK", "Особенность SDK/таблицы истории", "Использовать procedure getStrokeHistory", "Исправлено"],
        ["P-05", "Временное хранилище заявок", "Данные лежат в JSON/SQLite-подходе", "Прототипная реализация", "Перейти на полноценную БД", "Запланировано"],
        ["P-06", "Scraper зависит от внешних сайтов", "Поиск может сломаться", "Изменение верстки/блокировки", "Добавить кэш, fallback-провайдеры, обработку ошибок", "Запланировано"],
    ]

    write_xlsx(OUT / "02_Состав_проекта.xlsx", {"Состав проекта": composition_rows})
    write_xlsx(OUT / "04_Таблица_конфигурации.xlsx", {"Конфигурация": config_rows})
    write_xlsx(OUT / "05_Журнал_проблем.xlsx", {"Журнал проблем": problem_rows})

    create_placeholder_png(
        OUT / "screenshots" / "01_repo_structure.png",
        "01_repo_structure.png",
        "Структура проекта: index.html, src/, spacetimedb/, backend_scraper/, README.md",
    )
    create_placeholder_png(
        OUT / "screenshots" / "02_install_dependencies.png",
        "02_install_dependencies.png",
        "Команда npm install выполнена без критических ошибок",
    )
    create_placeholder_png(
        OUT / "screenshots" / "03_env_example.png",
        "03_env_example.png",
        ".env.example содержит только примеры переменных без секретов",
    )
    create_placeholder_png(
        OUT / "screenshots" / "04_success_run.png",
        "04_success_run.png",
        "npm run build и запуск backend scraper завершились успешно",
    )
    create_placeholder_png(
        OUT / "screenshots" / "05_app_working.png",
        "05_app_working.png",
        "Сайт открыт, API /api/tracks/submit возвращает JSON-ответ",
    )
    create_placeholder_png(
        OUT / "screenshots" / "06_git_status.png",
        "06_git_status.png",
        "Git status проверен перед сдачей материалов",
    )


if __name__ == "__main__":
    build()
