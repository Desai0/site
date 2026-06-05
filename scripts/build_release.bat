@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Build release archive
echo ========================================

npm install
npm run build
powershell -NoProfile -Command "Compress-Archive -Force -Path dist,docs,project_files_in_repository -DestinationPath release\project_release.zip"
