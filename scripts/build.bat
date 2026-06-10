@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Build release version
echo ========================================

npm run build
