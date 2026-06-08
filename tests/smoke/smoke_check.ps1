$ErrorActionPreference = "Stop"

$response = Invoke-WebRequest -Uri "https://desaichk.com" -UseBasicParsing
if ($response.StatusCode -ne 200) {
    throw "Main page returned $($response.StatusCode)"
}

Write-Host "PASS: main page returned HTTP 200"
