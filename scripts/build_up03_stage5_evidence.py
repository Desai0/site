from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "УП03_Этап5" / "reports"
OUT = ROOT / "УП03_Этап5" / "screenshots"


def load_font(name, size):
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()


TITLE = load_font("arialbd.ttf", 31)
MONO = load_font("consola.ttf", 17)


def render(filename, title, report_files, start=0, limit=29):
    lines = []
    for report_file in report_files:
        path = REPORTS / report_file
        if path.suffix == ".json":
            text = path.read_text(encoding="utf-8-sig")
        else:
            text = path.read_text(encoding="utf-8")
        lines.extend(text.splitlines())

    lines = lines[start:start + limit]
    image = Image.new("RGB", (1440, 900), "#e9edf3")
    draw = ImageDraw.Draw(image)
    draw.rectangle((25, 25, 1415, 875), outline="#203864", width=4)
    draw.text((58, 52), title, fill="#203864", font=TITLE)
    draw.rectangle((52, 112, 1388, 835), fill="#0e131b")

    y = 137
    for line in lines:
        visible = line.expandtabs(4)
        if len(visible) > 132:
            visible = visible[:129] + "..."
        draw.text((72, y), visible, fill="#d1fae5", font=MONO)
        y += 23

    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / filename)


render("01_gitignore_no_env.png", "git ls-files / git status", ["git_security_status.txt"])
render("02_env_example_without_secrets.png", "Environment example output", ["env_examples_check.txt"])
render("03_secret_scan_result.png", "git grep secret scan", ["secret_scan.txt"])
render("04_dependency_check_result.png", "npm audit / npm outdated", ["npm_audit.json", "npm_outdated.json"])
render("05_roles_access_check.png", "Anonymous access request", ["roles_access_check.txt"])
render("06_foreign_data_access_denied.png", "Returned record without authorization", ["roles_access_check.txt"], start=13)
render("07_cors_or_security_config.png", "CORS preflight output", ["cors_check.txt"])
render("08_backup_created.png", "Backup file hashes", ["backup_restore_result.txt"], limit=18)
render("09_restore_success.png", "Restore JSON and hashes", ["backup_restore_result.txt"], start=8)
render("10_open_ports_check.png", "docker compose ps / netstat", ["ports_check.txt"])
render("11_logs_no_critical_errors.png", "docker compose logs", ["logs_security.txt"])
render("12_security_commit.png", "Current Git status before commit", ["git_security_status.txt"])
