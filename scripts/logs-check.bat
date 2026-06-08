@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Logs check
echo ========================================

docker compose -f docker-compose.prod.yml logs --tail=100
docker compose -f docker-compose.prod.yml logs --tail=100 > reports\logs_tail.txt
