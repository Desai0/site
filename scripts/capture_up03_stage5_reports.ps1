$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$reports = Join-Path $root "УП03_Этап5\reports"
New-Item -ItemType Directory -Force $reports | Out-Null

function Write-CommandReport {
    param(
        [string]$Path,
        [string]$Command,
        [scriptblock]$Action
    )

    Set-Content -LiteralPath $Path -Value "> $Command" -Encoding utf8
    & $Action 2>&1 | Out-String -Width 240 | Add-Content -LiteralPath $Path -Encoding utf8
}

Push-Location $root
try {
    Write-CommandReport `
        (Join-Path $reports "git_security_status.txt") `
        "git ls-files .env .env.production .env.example .env.production.example .env.demo.example; git status --short" `
        {
            git ls-files .env .env.production .env.example .env.production.example .env.demo.example
            git status --short
        }

    Write-CommandReport `
        (Join-Path $reports "env_examples_check.txt") `
        "Get-Content .env.example; Get-Content .env.production.example" `
        {
            Get-Content .env.example
            Get-Content .env.production.example
        }

    Write-CommandReport `
        (Join-Path $reports "secret_scan.txt") `
        'git grep -n -i -E "password|secret|token|api_key|apikey|jwt|smtp|database_url" -- . ":!УП03_*" ":!*.md"' `
        {
            git grep -n -i -E "password|secret|token|api_key|apikey|jwt|smtp|database_url" -- . ":!УП03_*" ":!*.md"
        }

    npm audit --json 2>&1 |
        Set-Content -LiteralPath (Join-Path $reports "npm_audit.json") -Encoding utf8

    npm outdated --json 2>&1 |
        Set-Content -LiteralPath (Join-Path $reports "npm_outdated.json") -Encoding utf8

    Write-CommandReport `
        (Join-Path $reports "roles_access_check.txt") `
        'curl.exe -i https://desaichk.com/api/tracks/6' `
        {
            curl.exe -sS -i https://desaichk.com/api/tracks/6
        }

    Write-CommandReport `
        (Join-Path $reports "cors_check.txt") `
        '$r = Invoke-WebRequest -Uri "https://desaichk.com/api/tracks/submit" -Method Options -Headers @{ Origin="https://evil.example"; "Access-Control-Request-Method"="POST"; "Access-Control-Request-Headers"="content-type" }; $r.StatusCode; $r.Headers' `
        {
            $response = Invoke-WebRequest `
                -Uri "https://desaichk.com/api/tracks/submit" `
                -Method Options `
                -Headers @{
                    Origin = "https://evil.example"
                    "Access-Control-Request-Method" = "POST"
                    "Access-Control-Request-Headers" = "content-type"
                } `
                -UseBasicParsing
            $response.StatusCode
            $response.Headers | Format-List
        }

    Write-CommandReport `
        (Join-Path $reports "backup_restore_result.txt") `
        "Get-FileHash backend_scraper\data\test-tracks.json -Algorithm SHA256; Get-FileHash backups\tracks_2026-06-09.json -Algorithm SHA256; Get-FileHash backups\restore_test.json -Algorithm SHA256; Get-Content backups\restore_test.json -Raw | ConvertFrom-Json | Format-List" `
        {
            Get-FileHash backend_scraper\data\test-tracks.json -Algorithm SHA256 | Format-List
            Get-FileHash backups\tracks_2026-06-09.json -Algorithm SHA256 | Format-List
            Get-FileHash backups\restore_test.json -Algorithm SHA256 | Format-List
            Get-Content backups\restore_test.json -Raw | ConvertFrom-Json | Format-List
        }

    Write-CommandReport `
        (Join-Path $reports "ports_check.txt") `
        "docker compose ps; netstat -ano | findstr LISTENING" `
        {
            docker compose ps
            netstat -ano | findstr LISTENING
        }

    Write-CommandReport `
        (Join-Path $reports "logs_security.txt") `
        "docker compose logs --tail=100" `
        {
            docker compose logs --tail=100
        }
}
finally {
    Pop-Location
}
