@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Format project
echo ========================================

npx prettier --write "**/*.{html,css,js,ts,md,json}"
