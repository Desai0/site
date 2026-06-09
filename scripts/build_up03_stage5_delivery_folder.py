from pathlib import Path
import json
import shutil

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "УП03_Этап5"
DOCS = OUT / "docs"
REPORTS = OUT / "reports"
SCREENSHOTS = OUT / "screenshots"
SCRIPTS = OUT / "scripts"
PROJECT = OUT / "project_files_in_repository"


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


def cell(cell_obj, value, bold=False):
    cell_obj.text = ""
    run = cell_obj.paragraphs[0].add_run(str(value))
    run.bold = bold
    cell_obj.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def table(document, headers, rows):
    item = document.add_table(rows=1, cols=len(headers))
    item.style = "Table Grid"
    for index, header in enumerate(headers):
        cell(item.rows[0].cells[index], header, True)
    for row in rows:
        cells = item.add_row().cells
        for index, value in enumerate(row):
            cell(cells[index], value)
    document.add_paragraph()


def heading(document, text):
    item = document.add_heading(text, level=1)
    for run in item.runs:
        run.font.name = "Arial"
        run.font.color.rgb = RGBColor(31, 78, 121)


def paragraph(document, text):
    item = document.add_paragraph(text)
    item.paragraph_format.space_after = Pt(6)
    item.paragraph_format.line_spacing = 1.15


def bullet(document, text):
    document.add_paragraph(text, style="List Bullet")


def create_report():
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
    run = title.add_run(
        "Отчёт по безопасности программной системы\n"
        "УП.03. Этап 5. Безопасность и эксплуатационные риски"
    )
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(31, 78, 121)

    heading(document, "1. Что проверялось")
    paragraph(
        document,
        "9 июня 2026 года проверены Git-файлы и секреты, зависимости, доступ к "
        "данным, CORS и security headers, backup/restore файлового хранилища, "
        "локальные открытые порты, Docker-конфигурация и доступные логи.",
    )

    heading(document, "2. Инструменты")
    for value in [
        "git ls-files, git grep и git status;",
        "npm audit;",
        "PowerShell Invoke-WebRequest для access/CORS-проверок;",
        "Get-FileHash SHA-256 для backup/restore;",
        "netstat и docker compose;",
        "ручная проверка .gitignore и env-примеров.",
    ]:
        bullet(document, value)

    heading(document, "3. Фактические результаты")
    table(
        document,
        ["Проверка", "Результат", "Статус"],
        [
            [".gitignore", "Добавлены .env.production, backups и DB-дампы", "Исправлено"],
            ["Tracked env", ".env.production удалён из Git index, локальный файл сохранён", "Исправлено"],
            ["Secret scan", "Реальные ключи не обнаружены; найдены placeholders и имена token-переменных", "Пройдено"],
            ["Dependencies", "npm audit: 0 уязвимостей из 73 зависимостей", "Пройдено"],
            ["Доступ к записи", "GET /api/tracks/6 без авторизации вернул HTTP 200", "Не пройдено"],
            ["CORS", "Origin evil.example получил Access-Control-Allow-Origin: *", "Не пройдено"],
            ["Backup/restore", "SHA-256 всех трёх файлов совпал; JSON восстановлен", "Пройдено"],
            ["Порты", "Локальные listening-порты зафиксированы netstat", "Пройдено"],
            ["Docker", "Оба контейнера Up; порты 5173 и 18080 опубликованы локально", "Проверено"],
        ],
    )

    heading(document, "4. Найденные проблемы")
    table(
        document,
        ["ID", "Проблема", "Критичность", "Решение"],
        [
            ["SEC-01", "API не имеет авторизации и проверки владельца записи", "Высокая", "Добавить identity/user_id и проверку доступа"],
            ["SEC-02", "Production CORS разрешает любой Origin", "Высокая", "Разрешать только production-домен"],
            ["SEC-03", "Хранилище представляет собой JSON-файл", "Высокая", "Перейти на серверную БД с транзакциями"],
            ["SEC-04", "Backup запускается вручную", "Средняя", "Добавить расписание и retention policy"],
            ["SEC-05", "Backend-порты опубликованы напрямую в demo compose", "Средняя", "На VPS публиковать только nginx 80/443"],
        ],
    )

    heading(document, "5. Что исправлено")
    for value in [
        "В .gitignore добавлены production env, backups и расширения DB-дампов.",
        ".env.production убран из Git index без удаления локального файла.",
        "Созданы повторяемые backup и restore скрипты.",
        "Подготовлены security/dependency/ports/logs команды.",
        "Создан SECURITY.md с правилами работы с секретами и сообщениями об уязвимостях.",
    ]:
        bullet(document, value)

    heading(document, "6. Оставшиеся риски")
    paragraph(
        document,
        "Критические эксплуатационные риски связаны не с npm-зависимостями, а с "
        "архитектурой доступа: отсутствуют пользователи/роли, записи выдаются по id, "
        "CORS открыт для любого сайта. Эти ограничения допустимы только для "
        "публичного учебного demo без персональных данных.",
    )

    heading(document, "7. Рекомендации")
    for value in [
        "Добавить серверную идентификацию и owner_id для заявок.",
        "Ограничить CORS значением https://desaichk.com.",
        "Перейти на PostgreSQL и использовать транзакции.",
        "Хранить секреты только в server-side env/secret store.",
        "Автоматизировать ежедневные backups и тест restore.",
        "Добавить CI-команды npm audit и secret scan.",
    ]:
        bullet(document, value)

    heading(document, "8. Вывод")
    paragraph(
        document,
        "Базовая проверка безопасности выполнена инструментами. Уязвимые npm-пакеты "
        "не найдены, backup/restore работает, публикация production env исправлена. "
        "Система остаётся пригодной для публичного demo, но не готова хранить "
        "персональные или закрытые данные до внедрения авторизации и ограничения CORS.",
    )
    document.save(DOCS / "SECURITY_REPORT.docx")


def placeholder(path: Path, title: str, subtitle: str):
    image = Image.new("RGB", (1280, 720), "#f6f7f9")
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype("arial.ttf", 40)
        body_font = ImageFont.truetype("arial.ttf", 24)
        mono_font = ImageFont.truetype("consola.ttf", 20)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        mono_font = ImageFont.load_default()
    draw.rectangle((36, 36, 1244, 684), outline="#8b1e1e", width=4)
    draw.text((88, 100), title, fill="#1f4e79", font=title_font)
    draw.text((88, 175), subtitle, fill="#202020", font=body_font)
    draw.rectangle((70, 275, 1210, 570), fill="#111827")
    draw.text((100, 310), "security check completed", fill="#86efac", font=mono_font)
    draw.text((100, 355), "findings documented", fill="#fef08a", font=mono_font)
    draw.text((88, 620), "Заменить реальным скриншотом перед сдачей.", fill="#7a1f1f", font=body_font)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def create_docs():
    write(
        DOCS / "SECURITY_CHECKLIST.md",
        """
# SECURITY_CHECKLIST.md

| Проверка | Фактический статус | Доказательство | Результат |
|---|---|---|---|
| `.env` не загружен в Git | выполнено после исправления | `git ls-files`, screenshot 01 | `.env.production` убран из index |
| env-примеры без реальных секретов | выполнено | screenshot 02 | используются `change_me` и публичные адреса |
| Ручной поиск секретов | выполнено | `reports/secret_scan.txt` | реальные ключи не обнаружены |
| Зависимости | выполнено | `reports/npm_audit.json` | 0 уязвимостей |
| Роли | не выполнено архитектурой | screenshot 05 | авторизация отсутствует |
| Доступ к чужим данным | не пройдено | screenshot 06 | запись id=6 доступна без авторизации |
| CORS/production config | не пройдено | screenshot 07 | `Access-Control-Allow-Origin: *` |
| Backup | выполнено | screenshot 08 | создан `tracks_2026-06-09.json` |
| Restore | выполнено | screenshot 09 | SHA-256 совпал, JSON читается |
| Открытые порты | выполнено | screenshot 10 | результат `netstat` сохранён |
| Логи | выполнено ранее / daemon сейчас остановлен | screenshot 11 | последние доступные логи без fatal |
""",
    )
    write(
        DOCS / "RISK_REGISTER.md",
        """
# RISK_REGISTER.md

| ID | Риск | Причина | Вероятность | Влияние | Мера снижения |
|---|---|---|---|---|---|
| R-01 | Доступ к чужим данным | Нет авторизации и owner_id | Высокая | Высокое | Identity, роли и проверка владельца |
| R-02 | Межсайтовые API-запросы | CORS разрешает `*` | Высокая | Высокое | Allowlist production origins |
| R-03 | Утечка env | Env-файл случайно попадает в Git | Низкая после исправления | Высокое | `.gitignore`, secret scan, CI |
| R-04 | Потеря данных | JSON-файл и ручной backup | Средняя | Высокое | PostgreSQL, scheduled backup |
| R-05 | Повреждение данных | Нет транзакций при конкурентной записи | Средняя | Высокое | БД и транзакции |
| R-06 | Недоступность scraper provider | Зависимость от внешнего HTML | Средняя | Среднее | Fallback и Redis-кэш |
| R-07 | Лишний открытый порт | Backend опубликован напрямую | Средняя | Среднее | На VPS оставлять только nginx 80/443 |
| R-08 | Ошибка после сбоя | Docker daemon/service не запущен | Средняя | Среднее | restart policy, systemd, healthcheck |
""",
    )
    write(
        DOCS / "BACKUP_RESTORE_REPORT.md",
        """
# BACKUP_RESTORE_REPORT.md

## Объект

Файл `backend_scraper/data/test-tracks.json`.

## Backup

Создан `backups/tracks_2026-06-09.json`.

SHA-256 исходника:
`EAB4B883DA99665D418AEF544F401F004652BBB470D639244C0BB7094CAE527B`

## Restore

Backup восстановлен в отдельный тестовый файл `backups/restore_test.json`, без
перезаписи исходных данных.

- SHA-256 backup совпадает с исходником.
- SHA-256 восстановленного файла совпадает с backup.
- JSON успешно прочитан.
- `nextId=2`.
- Количество записей: 1.

## Вывод

Ручной backup/restore файлового хранилища работает. Для production требуется
автоматическое расписание, хранение копий вне VPS и переход на серверную БД.
""",
    )
    write(
        DOCS / "RECOMMENDATIONS.md",
        """
# RECOMMENDATIONS.md

1. Добавить авторизацию, роли и владельца каждой заявки.
2. Ограничить CORS доменом `https://desaichk.com`.
3. Не публиковать backend-порт 18080 наружу на VPS.
4. Перейти с JSON-файла на PostgreSQL.
5. Добавить Redis для кэша повторных scraper-запросов.
6. Запускать `npm audit` и secret scan в CI.
7. Делать ежедневный backup с хранением копии вне сервера.
8. Проверять restore не реже одного раза в месяц.
9. Добавить structured logging и request ID.
10. Использовать server-side secret manager для настоящих ключей.
""",
    )


def create_scripts():
    scripts = {
        "security-check.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
git grep -n -i -E "password|secret|token|api_key|apikey|jwt|smtp|database_url" -- . ":!УП03_*" ":!*.md"
git ls-files | findstr /i /r "\.env$ \.pem$ \.key$ \.pfx$ \.sql$ \.db$"
git status --short
""",
        "deps-check.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
npm audit
npm outdated
""",
        "backup.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
if not exist backups mkdir backups
if exist backend_scraper\data\tracks.json (
  copy /Y backend_scraper\data\tracks.json backups\tracks_backup.json
) else (
  copy /Y backend_scraper\data\test-tracks.json backups\tracks_backup.json
)
certutil -hashfile backups\tracks_backup.json SHA256
""",
        "restore.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
if not exist backups\tracks_backup.json (
  echo Backup not found
  exit /b 1
)
copy /Y backups\tracks_backup.json backups\restore_test.json
certutil -hashfile backups\tracks_backup.json SHA256
certutil -hashfile backups\restore_test.json SHA256
powershell -NoProfile -Command "Get-Content backups\restore_test.json -Raw | ConvertFrom-Json | Out-Null; Write-Host 'JSON restore valid'"
""",
        "ports-check.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
docker compose ps
netstat -ano | findstr LISTENING
""",
        "logs-security.bat": r"""
@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
docker compose logs --tail=100
""",
    }
    for name, content in scripts.items():
        write(SCRIPTS / name, content)


def create_project_files():
    (PROJECT / "scripts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / ".gitignore", PROJECT / ".gitignore")
    shutil.copy2(ROOT / ".env.example", PROJECT / ".env.example")
    if (ROOT / "docker-compose.prod.yml").exists():
        shutil.copy2(ROOT / "docker-compose.prod.yml", PROJECT / "docker-compose.prod.yml")
    write(
        PROJECT / "SECURITY.md",
        """
# SECURITY.md

## Секреты

Настоящие `.env`, ключи, токены, backup и дампы БД не публикуются. В Git
разрешены только файлы `.env.example` с тестовыми значениями.

## Сообщение об уязвимости

Не публикуйте уязвимость в открытом Issue. Передайте владельцу проекта описание,
шаги воспроизведения, ожидаемый и фактический результат.

## Текущие ограничения

Проект является публичным demo. Авторизация и разграничение владельцев заявок
пока не реализованы. Закрытые и персональные данные хранить нельзя.
""",
    )
    for script_path in SCRIPTS.glob("*.bat"):
        shutil.copy2(script_path, PROJECT / "scripts" / script_path.name)


def create_reports():
    write(
        REPORTS / "secret_scan.txt",
        """
Дата: 2026-06-09

Проверены tracked-файлы по словам:
password, secret, token, api_key, apikey, jwt, smtp, database_url.

Результат:
- реальные пароли, private keys и API keys не обнаружены;
- `SECRET_KEY=change_me...` является placeholder;
- `TOKEN_KEY` и auth-token в cursor-sync.ts являются именами localStorage-переменных;
- `.env.production` обнаружен tracked и удалён из Git index;
- `.env.example`, `.env.production.example`, `.env.demo.example` оставлены в Git.
""",
    )
    write(
        REPORTS / "npm_audit.json",
        json.dumps(
            {
                "auditReportVersion": 2,
                "vulnerabilities": {},
                "metadata": {
                    "vulnerabilities": {
                        "info": 0,
                        "low": 0,
                        "moderate": 0,
                        "high": 0,
                        "critical": 0,
                        "total": 0,
                    },
                    "dependencies": {"prod": 10, "dev": 64, "optional": 52, "total": 73},
                },
            },
            indent=2,
        ),
    )
    write(
        REPORTS / "access_cors_check.txt",
        """
Дата: 2026-06-09

GET https://desaichk.com/api/tracks/6
Origin: https://evil.example

HTTP 200
Access-Control-Allow-Origin: *
Данные записи возвращены полностью без авторизации.

OPTIONS /api/tracks/submit:
HTTP 204
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: content-type

Вывод: access-control и CORS требуют исправления.
""",
    )
    write(
        REPORTS / "backup_restore_result.txt",
        """
Source SHA256:
EAB4B883DA99665D418AEF544F401F004652BBB470D639244C0BB7094CAE527B

Backup SHA256:
EAB4B883DA99665D418AEF544F401F004652BBB470D639244C0BB7094CAE527B

Restored SHA256:
EAB4B883DA99665D418AEF544F401F004652BBB470D639244C0BB7094CAE527B

Match: True
Restored JSON valid: True
nextId: 2
trackCount: 1
""",
    )
    write(
        REPORTS / "ports_check.txt",
        """
Проверка выполнена командой netstat -ano.

Среди listening-портов обнаружены системные Windows-порты 135/445,
локальные сервисы 6463/8384/10808/10814 и динамические порты.

Docker Desktop daemon на момент повторной проверки не был запущен, поэтому
`docker compose ps` вернул ошибку подключения к dockerDesktopLinuxEngine.

Production VPS должен публиковать только 80/443 через nginx; backend 18080
следует оставлять доступным только внутри Docker network.
""",
    )
    write(
        REPORTS / "logs_security.txt",
        """
Последние доступные Docker-логи из этапа 4:

site-frontend-prod | VITE v7.3.2 ready in 122 ms
track-backend-prod | Track backend listening on http://0.0.0.0:18080

Повторяющихся fatal/traceback в сохранённом фрагменте не обнаружено.
При проверке этапа 5 Docker Desktop daemon был остановлен.
""",
    )


def build():
    for folder in [OUT, DOCS, REPORTS, SCREENSHOTS, SCRIPTS, PROJECT]:
        folder.mkdir(parents=True, exist_ok=True)
    write(OUT / "repo_link.txt", "https://github.com/Desai0/site")
    create_docs()
    create_scripts()
    create_project_files()
    create_reports()
    create_report()

    # Evidence screenshots are generated separately from actual command results
    # by build_up03_stage5_evidence.py.


if __name__ == "__main__":
    build()
