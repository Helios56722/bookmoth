$ErrorActionPreference = "Stop"

$pidFile = Join-Path $PSScriptRoot ".runtime\bookmoth.pid"
if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host "No launcher-started Bookmoth process is recorded."
    exit 0
}

$savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if ($savedPid -notmatch "^\d+$") {
    Remove-Item -LiteralPath $pidFile -Force
    throw "The saved process ID was invalid and has been cleared."
}

$process = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
if ($process) { Stop-Process -Id $process.Id -Force }
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Bookmoth has been stopped."
