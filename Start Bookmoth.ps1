$ErrorActionPreference = "Stop"

$appRoot = $PSScriptRoot
$runtime = Join-Path $appRoot ".runtime"
$pidFile = Join-Path $runtime "bookmoth.pid"
$stdout = Join-Path $runtime "bookmoth.stdout.log"
$stderr = Join-Path $runtime "bookmoth.stderr.log"
$ollamaStdout = Join-Path $runtime "ollama.stdout.log"
$ollamaStderr = Join-Path $runtime "ollama.stderr.log"
$url = "http://127.0.0.1:4342"
$ollamaUrl = "http://127.0.0.1:11434"

function Test-Bookmoth {
    try {
        return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-LocalSetting([string]$Name) {
    $envFile = Join-Path $appRoot ".env.local"
    if (-not (Test-Path -LiteralPath $envFile)) { return $null }
    $match = Get-Content -LiteralPath $envFile -Encoding UTF8 |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -Last 1
    if (-not $match) { return $null }
    return (($match -split "=", 2)[1]).Trim().Trim('"').Trim("'")
}

function Test-Ollama {
    try {
        return [bool](Invoke-RestMethod -Uri "$ollamaUrl/api/version" -Method Get -TimeoutSec 2)
    } catch {
        return $false
    }
}

New-Item -ItemType Directory -Force -Path $runtime | Out-Null

$provider = Get-LocalSetting "BOOKMOTH_PROVIDER"
if (-not $provider) {
    $provider = if (Get-LocalSetting "OPENAI_API_KEY") { "openai" } else { "ollama" }
}
$configuredOllamaUrl = Get-LocalSetting "OLLAMA_URL"
if ($configuredOllamaUrl) { $ollamaUrl = $configuredOllamaUrl.TrimEnd('/') }

if ($provider -eq "ollama") {
    $ollamaCommand = Get-Command "ollama.exe" -ErrorAction SilentlyContinue
    if (-not $ollamaCommand) {
        throw "Ollama is not installed or is not available in PATH. Install Ollama before using free local mode."
    }
    if (-not (Test-Ollama)) {
        Start-Process -FilePath $ollamaCommand.Source -ArgumentList @("serve") -WindowStyle Hidden -RedirectStandardOutput $ollamaStdout -RedirectStandardError $ollamaStderr | Out-Null
        foreach ($attempt in 1..30) {
            if (Test-Ollama) { break }
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not (Test-Ollama)) {
        throw "Ollama did not become ready. Open Ollama, then try Start Bookmoth again."
    }

    $model = Get-LocalSetting "OLLAMA_MODEL"
    if (-not $model) { $model = "qwen2.5vl:7b" }
    $tags = Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -Method Get -TimeoutSec 5
    if ($model -notin @($tags.models.name)) {
        throw "The local vision model '$model' is not installed. Run: ollama pull $model"
    }
}

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
