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
