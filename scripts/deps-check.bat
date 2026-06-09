@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
npm audit
npm outdated
