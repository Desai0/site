@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Deploy production/demo stand
echo ========================================

if not exist .env.production (
  copy .env.production.example .env.production
)

docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
