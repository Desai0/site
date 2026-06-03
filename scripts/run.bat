@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Run project locally
echo ========================================

npm run dev -- --host 0.0.0.0
