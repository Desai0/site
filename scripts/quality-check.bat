@echo off
chcp 65001 > nul
cd /d "%~dp0\.."

echo ========================================
echo  Complete quality check
echo ========================================

call scripts\test.bat
call scripts\api-test.bat
call scripts\logs-check.bat

echo Quality check completed.
