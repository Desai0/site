@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Smoke tests
echo ========================================

npm run build
node --check backend_scraper\index.js
node --check backend_scraper\playwright_worker.js
