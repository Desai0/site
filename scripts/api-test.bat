@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  API tests
echo ========================================

curl -i https://desaichk.com
curl -i -X POST https://desaichk.com/api/tracks/submit -H "Content-Type: application/json" -d "{\"title\":\"Around The World\",\"artist\":\"Daft Punk\",\"sourceLink\":\"https://example.com\"}"
curl -i https://desaichk.com/api/tracks/999999
curl -i -X POST https://desaichk.com/api/tracks/submit -H "Content-Type: application/json" -d "{}"
