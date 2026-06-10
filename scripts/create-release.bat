@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Create release archive
echo ========================================

call scripts\release-check.bat
if errorlevel 1 exit /b 1

if not exist release mkdir release
powershell -NoProfile -Command "Compress-Archive -Force -Path dist,backend_scraper,.github,CHANGELOG.md,RELEASE_NOTES.md,RELEASE_CHECKLIST.md,DEPLOYMENT.md -DestinationPath release\site-0.3.1.zip"

echo Release archive: release\site-0.3.1.zip
