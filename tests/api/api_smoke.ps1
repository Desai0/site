$ErrorActionPreference = "Stop"

$invalidBody = "{}"
try {
    Invoke-WebRequest -Uri "https://desaichk.com/api/tracks/submit" -Method POST -ContentType "application/json" -Body $invalidBody -UseBasicParsing
    throw "Expected HTTP 400"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 400) {
        throw
    }
}

Write-Host "PASS: invalid submit returned HTTP 400"
