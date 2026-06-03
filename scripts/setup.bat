@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Install dependencies
echo ========================================

npm install
