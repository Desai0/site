@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Performance check
echo ========================================

curl -o nul -s -w "status=%%{http_code} total=%%{time_total}s size=%%{size_download} bytes\n" https://desaichk.com
curl -o nul -s -w "status=%%{http_code} total=%%{time_total}s\n" https://desaichk.com/api/tracks/999999

echo Optional: k6 run tests\load\basic_load.js
echo Optional: npx lighthouse https://desaichk.com --output html --output-path reports\lighthouse_report.html
