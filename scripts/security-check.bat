@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
git grep -n -i -E "password|secret|token|api_key|apikey|jwt|smtp|database_url" -- . ":!УП03_*" ":!*.md"
git ls-files | findstr /i /r "\.env$ \.pem$ \.key$ \.pfx$ \.sql$ \.db$"
git status --short
