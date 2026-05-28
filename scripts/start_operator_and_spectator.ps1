param(
  [switch]$Hidden
)

$root = Split-Path -Parent $PSScriptRoot
$operatorDir = Join-Path $root "apps\operator"
$spectatorDir = Join-Path $root "apps\spectator"

function Start-TauriApp {
  param(
    [string]$Name,
    [string]$WorkDir
  )

  if (-not (Test-Path $WorkDir)) {
    throw "[$Name] folder not found: $WorkDir"
  }

  $cmd = @"
`$env:Path += ';`$env:USERPROFILE\.cargo\bin'
Set-Location -LiteralPath '$WorkDir'
cargo tauri dev
"@

  if ($Hidden) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Hidden | Out-Null
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null
  }
}

Start-TauriApp -Name "operator" -WorkDir $operatorDir
Start-TauriApp -Name "spectator" -WorkDir $spectatorDir

Write-Host "Started operator + spectator in separate windows."
