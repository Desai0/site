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
