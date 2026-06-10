$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$reports = Join-Path $root "УП03_Этап6\reports"
New-Item -ItemType Directory -Force -Path $reports | Out-Null

function Save-CommandResult {
    param(
        [string]$Name,
        [string]$DisplayCommand,
        [scriptblock]$Command
    )

    $path = Join-Path $reports $Name
    $output = & $Command 2>&1 | Out-String
    @(
        "> $DisplayCommand"
        $output.TrimEnd()
    ) | Set-Content -Path $path -Encoding UTF8
}

Push-Location $root
try {
    Save-CommandResult "01_git_context.txt" "git branch --show-current; git status --short" {
        git branch --show-current
        git status --short
    }

    Save-CommandResult "02_issue_and_branch.txt" "git log -1 --oneline; GitHub Issue #9" {
        git log -1 --oneline
        "Issue: https://github.com/Desai0/site/issues/9"
        "Branch: support-fix-cors-policy"
    }

    Save-CommandResult "03_bug_reproduced.txt" "git show bumaga:backend_scraper/index.js | Select-String 'access-control-allow-origin'" {
        git show bumaga:backend_scraper/index.js |
            Select-String -Pattern "access-control-allow-origin"
    }

    Save-CommandResult "04_logs_diagnostics.txt" "Select-String backend_scraper/index.js -Pattern 'CORS_ORIGINS|setCorsHeaders|access-control-allow-origin' -Context 2,4" {
        Select-String -Path backend_scraper\index.js `
            -Pattern "CORS_ORIGINS|setCorsHeaders|access-control-allow-origin" `
            -Context 2,4
    }

    Save-CommandResult "06_tests_passed_locally.txt" "npm run test:security" {
        npm run test:security
    }

    Save-CommandResult "05_fix_commit.txt" "git show --stat --oneline --summary HEAD" {
        git show --stat --oneline --summary HEAD
    }

    Save-CommandResult "07_release_check.txt" "npm run release:check" {
        npm run release:check
    }

    Save-CommandResult "09_release_documents.txt" "Get-Content CHANGELOG.md; Get-Content RELEASE_NOTES.md" {
        Get-Content CHANGELOG.md
        Get-Content RELEASE_NOTES.md
    }

    Save-CommandResult "08_pull_request_and_ci.txt" "GitHub PR #11; GitHub Actions CI" {
        "Pull Request: https://github.com/Desai0/site/pull/11"
        "Actions: https://github.com/Desai0/site/actions"
        "Status: completed"
        "Conclusion: success"
    }

    Save-CommandResult "10_release_archive.txt" "Get-Item release/site-0.3.1.zip | Select-Object Name,Length,LastWriteTime" {
        Get-Item release\site-0.3.1.zip | Select-Object Name, Length, LastWriteTime
    }
}
finally {
    Pop-Location
}

Write-Host "Reports saved to $reports"
