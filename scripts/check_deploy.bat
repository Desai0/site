@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Check production/demo deploy
echo ========================================

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=80
curl http://127.0.0.1:18080/health
