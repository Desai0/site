@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Final release check
echo ========================================

npm run release:check
