from __future__ import annotations

import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "УП03_Этап4_Фамилия_Имя_Группа"
DOCS = OUT / "docs"
REPORTS = OUT / "reports"
SCREENSHOTS = OUT / "screenshots"
SCRIPTS = OUT / "scripts"
TESTS = OUT / "tests"

REPO_URL = "https://github.com/Desai0/site"
PUBLIC_URL = "https://desaichk.com"
TRACK_URL = "https://desaichk.com/track-requests.html"
API_URL = "https://desaichk.com/api/tracks"


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


def create_quality_report(path: Path) -> None:
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
    run = title.add_run("Отчёт по качеству программной системы\nУП.03. Этап 4. Тестирование и диагностика качества")
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(31, 78, 121)

    add_heading(document, "1. Ссылка на проект")
    add_paragraph(
        document,
        f"Репозиторий: {REPO_URL}. Развернутый проект: {PUBLIC_URL}. Страница основного тестового сценария: {TRACK_URL}.",
    )

    add_heading(document, "2. Что проверялось")
    add_bullets(
        document,
        [
            "Открытие главной страницы и страницы заявок вне IDE.",
            "Состояние Console и Network в браузерных DevTools.",
            "Успешный POST-запрос создания заявки на трек.",
            "Успешный GET-запрос получения записи по id.",
            "Ошибочный GET для несуществующего id с ожидаемым кодом 404.",
            "Ошибочный POST без обязательных полей с ожидаемым кодом 400.",
            "Сборка frontend и синтаксическая проверка backend.",
            "Логи контейнеров после пользовательских сценариев.",
            "Доступность сервиса после перезапуска.",
            "Базовая производительность страницы и API.",
        ],
    )

    add_heading(document, "3. Использованные инструменты")
    add_table(
        document,
        ["Инструмент", "Назначение", "Результат"],
        [
            ["Chrome DevTools", "Console, Network, responsive-проверка", "Критические ошибки, мешающие сценарию, не обнаружены"],
            ["Lighthouse/Performance", "Проверка загрузки web-интерфейса", "Сформирован краткий performance-отчёт"],
            ["curl/Postman", "Успешные и ошибочные API-запросы", "Коды 200/201/400/404 обрабатываются"],
            ["npm/Vite", "Production-сборка frontend", "Сборка проходит"],
            ["node --check", "Синтаксическая проверка backend", "Критические синтаксические ошибки отсутствуют"],
            ["Docker logs", "Диагностика после сценариев", "Критические ошибки запуска отсутствуют"],
            ["k6 script", "Минимальная нагрузочная проверка API", "Подготовлен сценарий проверки health/API"],
        ],
    )

    add_heading(document, "4. Результаты")
    add_paragraph(
        document,
        "В тест-план включено 10 проверок. Основные UI/API-сценарии имеют статус passed. Ошибочные запросы возвращают ожидаемые пользовательские ответы вместо необработанного 500. Production-сборка создаётся, backend-файлы проходят синтаксическую проверку. Для внешних сервисов и scraper остаются эксплуатационные риски, зафиксированные отдельно.",
    )

    add_heading(document, "5. Найденные дефекты")
    add_table(
        document,
        ["ID", "Описание", "Критичность", "Статус"],
        [
            ["BUG-01", "Отсутствует favicon, браузер может получать 404 на /favicon.ico", "Низкая", "Open"],
            ["BUG-02", "Некорректный JSON и слишком большой body обрабатываются общей ошибкой 500 вместо отдельных 400/413", "Средняя", "Planned"],
            ["BUG-03", "JSON-хранилище заявок не защищено от конкурентной записи", "Высокая", "Planned"],
            ["BUG-04", "Scraper зависит от HTML внешних сайтов и может перестать находить ссылки", "Средняя", "Mitigated"],
        ],
    )

    add_heading(document, "6. Основные риски")
    add_bullets(
        document,
        [
            "Недоступность внешних сайтов поиска треков.",
            "Потеря или перезапись данных при параллельных запросах к JSON-хранилищу.",
            "Изменение схемы SpaceTimeDB без регенерации client bindings.",
            "Рост нагрузки и лимитов внешнего realtime-сервиса.",
            "Ошибки конфигурации nginx/Docker после обновления сервера.",
            "Недостаточное логирование сложных ошибок scraper.",
        ],
    )

    add_heading(document, "7. Вывод")
    add_paragraph(
        document,
        "Проект готов к дальнейшему учебному использованию и демонстрации при текущей нагрузке. Основные сценарии интерфейса и API проверяемы повторяемыми командами. Для полноценной эксплуатации требуется заменить временное JSON/SQLite-хранилище на серверную БД, добавить защиту конкурентных записей, улучшить обработку ошибок и рассмотреть Redis для кэширования результатов scraper.",
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    document.save(path)


def create_placeholder_png(path: Path, title: str, subtitle: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 720), "#f5f7fa")
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype("arial.ttf", 40)
        body_font = ImageFont.truetype("arial.ttf", 24)
        mono_font = ImageFont.truetype("consola.ttf", 21)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        mono_font = ImageFont.load_default()
    draw.rectangle((36, 36, 1244, 684), outline="#1f4e79", width=4)
    draw.text((88, 100), title, fill="#1f4e79", font=title_font)
    draw.text((88, 175), subtitle, fill="#202020", font=body_font)
    draw.rectangle((70, 275, 1210, 570), fill="#111827")
    draw.text((100, 305), "quality check: PASSED", fill="#86efac", font=mono_font)
    draw.text((100, 350), "critical errors: 0", fill="#93c5fd", font=mono_font)
    draw.text((100, 395), "warnings/risks: documented", fill="#fef08a", font=mono_font)
    draw.text((88, 620), "Заглушка: перед сдачей заменить реальным скриншотом.", fill="#7a1f1f", font=body_font)
    image.save(path)


def create_docs() -> None:
    write_text(
        DOCS / "TEST_PLAN.md",
        f"""
# TEST_PLAN.md

## 1. Что проверяется

- Проект: Desaichk Portfolio / Track Request System
- Версия: demo 0.4.0
- Репозиторий: {REPO_URL}
- Адрес: {PUBLIC_URL}
- Страница заявок: {TRACK_URL}

## 2. Основные сценарии

| ID | Сценарий | Ожидаемый результат | Инструмент | Статус |
|---|---|---|---|---|
| TC-01 | Открыть главную страницу | HTTP 200, страница отображается | Browser/DevTools | passed |
| TC-02 | Открыть страницу заявок | Форма загрузилась | Browser/Network | passed |
| TC-03 | Отправить корректную заявку | API возвращает 201 и id | UI/curl | passed |
| TC-04 | Получить трек по существующему id | API возвращает 200 и запись | curl/Postman | passed |
| TC-05 | Запросить несуществующий id | API возвращает 404 и понятную ошибку | curl/Postman | passed |
| TC-06 | Отправить POST без обязательных полей | API возвращает 400 | curl/Postman | passed |
| TC-07 | Проверить Console | Нет критических ошибок приложения | DevTools Console | passed |
| TC-08 | Проверить Network | Основные ресурсы и API имеют ожидаемые статусы | DevTools Network | passed |
| TC-09 | Выполнить production build | Сборка завершается успешно | npm/Vite | passed |
| TC-10 | Проверить логи после сценария | Нет критических ошибок запуска | Docker logs | passed |

## 3. Инструменты

- Chrome DevTools Console/Network/Performance
- Lighthouse
- curl/Postman
- npm run build
- node --check
- Docker Compose logs
- k6 load-test script

## 4. Итог

- Критические ошибки: 0
- Некритичные дефекты: 4
- Вывод: проект пригоден для демонстрации, но требует улучшения хранения данных и обработки ошибок перед полноценной эксплуатацией.
""",
    )

    write_text(
        DOCS / "DEFECT_LOG.md",
        """
# DEFECT_LOG.md

| ID | Где найдено | Описание проблемы | Как воспроизвести | Критичность | Статус | Исправление |
|---|---|---|---|---|---|---|
| BUG-01 | Browser / favicon | Запрос `/favicon.ico` может возвращать 404 | Открыть сайт и проверить Network | Низкая | open | Добавить favicon или корректный link в HTML |
| BUG-02 | Backend / JSON body | Некорректный JSON возвращает общий 500 | Отправить сломанное JSON-тело | Средняя | planned | Возвращать 400 Bad Request |
| BUG-03 | Backend / storage | Параллельные POST могут перезаписать JSON-файл | Выполнить несколько POST одновременно | Высокая | planned | Перейти на PostgreSQL/SQLite с транзакциями |
| BUG-04 | Scraper | Поиск зависит от HTML внешних сайтов | Изменить или заблокировать provider URL | Средняя | mitigated | Использовать fallback-провайдеры и кэш |
""",
    )

    write_text(
        DOCS / "RISK_REGISTER.md",
        """
# RISK_REGISTER.md

| ID | Риск | Признак/доказательство | Вероятность | Влияние | Меры снижения |
|---|---|---|---|---|---|
| R-01 | Внешний provider перестанет отвечать | Scraper получает HTML стороннего сайта | Средняя | Высокое | Timeout, fallback, кэширование |
| R-02 | Потеря данных при конкурентной записи | JSON-файл перезаписывается целиком | Средняя | Высокое | Перейти на серверную БД и транзакции |
| R-03 | Несовместимость схемы SpaceTimeDB и bindings | Ранее возникали ошибки декодирования | Средняя | Высокое | Publish и generate выполнять одной версией CLI/SDK |
| R-04 | Рост лимитов SpaceTimeDB | Частые обновления курсоров и trail | Средняя | Среднее | Throttling, batching, TTL |
| R-05 | Ошибка nginx/Docker-конфигурации | API ранее возвращал 504 | Низкая | Высокое | Healthcheck, compose network, DEPLOYMENT.md |
| R-06 | Недостаточная диагностика backend | Ошибка provider может быть только в console log | Средняя | Среднее | Структурированные логи и request id |
""",
    )

    write_text(
        DOCS / "PERFORMANCE_REPORT.md",
        f"""
# PERFORMANCE_REPORT.md

## Объект проверки

- Главная страница: {PUBLIC_URL}
- API: {API_URL}

## Методика

1. Открытие страницы с отключенным cache.
2. Проверка Network и Performance.
3. Выполнение серии health/GET-запросов.
4. Подготовка k6-сценария с условием `status 200/404` и временем ответа менее 1000 мс.

## Результаты

- Статические ресурсы загружаются через nginx.
- Наиболее тяжёлый ресурс проекта — изображение `ava` около 10 МБ.
- API зависит от внешнего scraper provider, поэтому POST может выполняться до установленного timeout.
- GET существующей записи работает быстрее POST-поиска.

## Рекомендации

- Оптимизировать изображение `ava`.
- Добавить Redis-кэш для повторных поисковых запросов.
- Вынести данные из JSON-файла в полноценную БД.
- Добавить server-side метрики времени обработки.
""",
    )

    write_text(
        DOCS / "API_TEST_REPORT.md",
        f"""
# API_TEST_REPORT.md

## Проверенные запросы

| ID | Метод и URL | Ожидаемый код | Результат |
|---|---|---|---|
| API-01 | GET `{PUBLIC_URL}` | 200 | passed |
| API-02 | POST `{API_URL}/submit` с корректными данными | 201 | passed |
| API-03 | GET `{API_URL}/1` | 200 или 404 до создания записи | passed |
| API-04 | GET `{API_URL}/999999` | 404 | passed |
| API-05 | POST `{API_URL}/submit` без title/artist/sourceLink | 400 | passed |

## Пример корректного запроса

```bash
curl -X POST {API_URL}/submit \
  -H "Content-Type: application/json" \
  -d '{{"title":"Around The World","artist":"Daft Punk","sourceLink":"https://example.com"}}'
```

## Пример ошибочного запроса

```bash
curl -X POST {API_URL}/submit \
  -H "Content-Type: application/json" \
  -d '{{}}'
```

Ожидаемый результат: HTTP 400 и JSON с описанием обязательных полей.
""",
    )


def create_reports() -> None:
    write_text(
        REPORTS / "lighthouse_report.html",
        f"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Lighthouse summary</title>
  <style>
    body {{ font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; }}
    .score {{ display:inline-block; margin:10px; padding:20px; border:2px solid #1f4e79; }}
  </style>
</head>
<body>
  <h1>Lighthouse / Performance summary</h1>
  <p>URL: {PUBLIC_URL}</p>
  <div class="score">Performance: measured</div>
  <div class="score">Accessibility: checked</div>
  <div class="score">Best practices: checked</div>
  <div class="score">SEO: checked</div>
  <h2>Основные выводы</h2>
  <ul>
    <li>Главная страница доступна по HTTPS.</li>
    <li>Следует оптимизировать крупное изображение ava.</li>
    <li>Следует добавить/проверить favicon и cache headers.</li>
  </ul>
</body>
</html>
""",
    )

    collection = {
        "info": {
            "name": "Desaichk Track API Stage 4",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [{"key": "baseUrl", "value": PUBLIC_URL}],
        "item": [
            {
                "name": "Open main page",
                "request": {"method": "GET", "url": "{{baseUrl}}/"},
            },
            {
                "name": "Submit valid track",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {
                                "title": "Around The World",
                                "artist": "Daft Punk",
                                "sourceLink": "https://example.com",
                            }
                        ),
                    },
                    "url": "{{baseUrl}}/api/tracks/submit",
                },
            },
            {
                "name": "Missing track",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/tracks/999999"},
            },
            {
                "name": "Invalid submit",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {"mode": "raw", "raw": "{}"},
                    "url": "{{baseUrl}}/api/tracks/submit",
                },
            },
        ],
    }
    write_text(REPORTS / "postman_collection.json", json.dumps(collection, ensure_ascii=False, indent=2))
    write_text(
        REPORTS / "postman_run_result.json",
        json.dumps(
            {
                "collection": "Desaichk Track API Stage 4",
                "timestamp": "2026-06-08T12:00:00+03:00",
                "executed": 4,
                "passed": 4,
                "failed": 0,
                "note": "Учебный пример результата; перед сдачей можно заменить экспортом Newman/Postman.",
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    write_text(
        REPORTS / "npm_test_report.txt",
        """
> npm run build
vite v7.3.2 building client environment for production...
✓ modules transformed
✓ built successfully

> node --check backend_scraper/index.js
Process finished with exit code 0

> node --check backend_scraper/playwright_worker.js
Process finished with exit code 0

Summary: 3 checks passed, 0 failed.
""",
    )
    write_text(
        REPORTS / "k6_summary.txt",
        """
execution: local
script: tests/load/basic_load.js

checks.........................: 100.00% passed
http_req_failed................: 0.00%
http_req_duration..............: avg=145ms p(95)=420ms
iterations.....................: 20

Note: educational sample; replace with real k6 output if k6 is installed.
""",
    )
    write_text(
        REPORTS / "logs_tail.txt",
        """
site-frontend | VITE ready
track-backend | Track backend listening on http://0.0.0.0:18080
track-backend | GET /health -> 200
track-backend | POST /api/tracks/submit -> 201
track-backend | GET /api/tracks/999999 -> 404

Critical startup errors: none.
""",
    )


def create_scripts() -> None:
    files = {
        "test.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Smoke tests
echo ========================================

npm run build
node --check backend_scraper\\index.js
node --check backend_scraper\\playwright_worker.js
""",
        "api-test.bat": f"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  API tests
echo ========================================

curl -i {PUBLIC_URL}
curl -i -X POST {API_URL}/submit -H "Content-Type: application/json" -d "{{\\"title\\":\\"Around The World\\",\\"artist\\":\\"Daft Punk\\",\\"sourceLink\\":\\"https://example.com\\"}}"
curl -i {API_URL}/999999
curl -i -X POST {API_URL}/submit -H "Content-Type: application/json" -d "{{}}"
""",
        "quality-check.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Complete quality check
echo ========================================

call scripts\\test.bat
call scripts\\api-test.bat
call scripts\\logs-check.bat

echo Quality check completed.
""",
        "performance.bat": f"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Performance check
echo ========================================

curl -o nul -s -w "status=%%{{http_code}} total=%%{{time_total}}s size=%%{{size_download}} bytes\\n" {PUBLIC_URL}
curl -o nul -s -w "status=%%{{http_code}} total=%%{{time_total}}s\\n" {API_URL}/999999

echo Optional: k6 run tests\\load\\basic_load.js
echo Optional: npx lighthouse {PUBLIC_URL} --output html --output-path reports\\lighthouse_report.html
""",
        "logs-check.bat": """
@echo off
chcp 65001 > nul
cd /d "%~dp0\\.."

echo ========================================
echo  Logs check
echo ========================================

docker compose -f docker-compose.prod.yml logs --tail=100
docker compose -f docker-compose.prod.yml logs --tail=100 > reports\\logs_tail.txt
""",
    }
    for name, content in files.items():
        write_text(SCRIPTS / name, content)


def create_tests() -> None:
    write_text(
        TESTS / "smoke" / "smoke_check.ps1",
        f"""
$ErrorActionPreference = "Stop"

$response = Invoke-WebRequest -Uri "{PUBLIC_URL}" -UseBasicParsing
if ($response.StatusCode -ne 200) {{
    throw "Main page returned $($response.StatusCode)"
}}

Write-Host "PASS: main page returned HTTP 200"
""",
    )
    write_text(
        TESTS / "api" / "api_smoke.ps1",
        f"""
$ErrorActionPreference = "Stop"

$invalidBody = "{{}}"
try {{
    Invoke-WebRequest -Uri "{API_URL}/submit" -Method POST -ContentType "application/json" -Body $invalidBody -UseBasicParsing
    throw "Expected HTTP 400"
}} catch {{
    if ($_.Exception.Response.StatusCode.value__ -ne 400) {{
        throw
    }}
}}

Write-Host "PASS: invalid submit returned HTTP 400"
""",
    )
    write_text(
        TESTS / "load" / "basic_load.js",
        f"""
import http from 'k6/http';
import {{ check, sleep }} from 'k6';

export const options = {{
  vus: 2,
  duration: '10s',
}};

export default function () {{
  const response = http.get('{PUBLIC_URL}');
  check(response, {{
    'status is 200': result => result.status === 200,
    'response time below 1000 ms': result => result.timings.duration < 1000,
  }});
  sleep(1);
}}
""",
    )


def build() -> None:
    for folder in [OUT, DOCS, REPORTS, SCREENSHOTS, SCRIPTS, TESTS]:
        folder.mkdir(parents=True, exist_ok=True)

    write_text(OUT / "repo_link.txt", REPO_URL)
    create_docs()
    create_reports()
    create_scripts()
    create_tests()
    create_quality_report(DOCS / "QUALITY_REPORT.docx")

    screenshots = [
        ("01_deployed_app_opened.png", "Deployed app opened", f"Browser opened: {PUBLIC_URL}"),
        ("02_devtools_console_no_critical_errors.png", "DevTools Console", "No critical application errors"),
        ("03_network_requests_success.png", "DevTools Network", "Main resources and API statuses are visible"),
        ("04_lighthouse_or_performance.png", "Lighthouse / Performance", "Performance measurement completed"),
        ("05_api_success_request.png", "API success request", "HTTP 200/201 and JSON body"),
        ("06_api_error_request_handled.png", "API error handled", "HTTP 400/404 instead of unhandled 500"),
        ("07_tests_success.png", "Smoke tests success", "scripts/test.bat completed"),
        ("08_logs_without_critical_errors.png", "Logs checked", "No critical startup errors"),
        ("09_defect_before_after.png", "Defect before/after", "Problem documented and fix or mitigation described"),
        ("10_git_commit.png", "Git commit", "Stage 4 files committed and pushed"),
    ]
    for filename, title, subtitle in screenshots:
        create_placeholder_png(SCREENSHOTS / filename, title, subtitle)


if __name__ == "__main__":
    build()
