param(
  [switch]$Tauri,
  [switch]$Hidden
)

$operatorScript = Join-Path $PSScriptRoot "run_operator.ps1"
$spectatorScript = Join-Path $PSScriptRoot "run_spectator.ps1"

if (-not (Test-Path $operatorScript)) {
  throw "Operator launcher not found: $operatorScript"
}

if (-not (Test-Path $spectatorScript)) {
  throw "Spectator launcher not found: $spectatorScript"
}

$operatorArgs = @("-ExecutionPolicy", "Bypass", "-File", $operatorScript)
$spectatorArgs = @("-ExecutionPolicy", "Bypass", "-File", $spectatorScript)

if ($Tauri) {
  $operatorArgs += "-Tauri"
  $spectatorArgs += "-Tauri"
}

if ($Hidden) {
  $operatorArgs += "-Hidden"
  $spectatorArgs += "-Hidden"
}

Start-Process powershell -ArgumentList $operatorArgs | Out-Null
Start-Sleep -Milliseconds 500
Start-Process powershell -ArgumentList $spectatorArgs | Out-Null

Write-Host ("Operator + Spectator started ({0})." -f ($(if ($Tauri) { "tauri" } else { "dev" })))
