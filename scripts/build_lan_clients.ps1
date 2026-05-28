param(
  [switch]$Tauri
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$operatorDir = Join-Path $root "apps\operator"
$spectatorDir = Join-Path $root "apps\spectator"

function Build-WebClient {
  param(
    [string]$Name,
    [string]$Dir
  )

  Push-Location $Dir
  try {
    npm exec tsc -- --noEmit
    npm run build
    if ($Tauri) {
      $env:Path += ";$env:USERPROFILE\.cargo\bin"
      cargo tauri build
    }
  } finally {
    Pop-Location
  }

  Write-Host "Built $Name client in $Dir"
}

Build-WebClient -Name "operator" -Dir $operatorDir
Build-WebClient -Name "spectator" -Dir $spectatorDir
