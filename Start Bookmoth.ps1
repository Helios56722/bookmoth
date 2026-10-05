$ErrorActionPreference = "Stop"

$appRoot = $PSScriptRoot
$runtime = Join-Path $appRoot ".runtime"
$pidFile = Join-Path $runtime "bookmoth.pid"
$stdout = Join-Path $runtime "bookmoth.stdout.log"
$stderr = Join-Path $runtime "bookmoth.stderr.log"
$url = "http://127.0.0.1:4342"

function Test-Bookmoth {
    try {
        return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
    } catch {
        return $false
    }
}

New-Item -ItemType Directory -Force -Path $runtime | Out-Null

if (-not (Test-Bookmoth)) {
    if (-not (Test-Path -LiteralPath (Join-Path $appRoot "node_modules"))) {
        throw "Dependencies are missing. Run npm install once in $appRoot."
    }
    $process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii
    foreach ($attempt in 1..40) {
        if (Test-Bookmoth) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-Bookmoth)) {
        throw "Bookmoth did not become ready. Review $stdout and $stderr."
    }
}

Start-Process $url
