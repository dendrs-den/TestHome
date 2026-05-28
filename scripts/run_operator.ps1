param(
  [switch]$Tauri,
  [switch]$Hidden
)

$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $root "apps\operator"
$url = "http://127.0.0.1:5173/terminal"

if (-not (Test-Path $appDir)) {
  throw "[operator] folder not found: $appDir"
}

function Wait-HttpReady {
  param(
    [string]$TargetUrl,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  return $false
}

if ($Tauri) {
  $command = "set PATH=%PATH%;%USERPROFILE%\.cargo\bin && cd /d `"$appDir`" && cargo tauri dev"
  if ($Hidden) {
    Start-Process cmd.exe -ArgumentList "/k", $command -WindowStyle Hidden | Out-Null
  } else {
    Start-Process cmd.exe -ArgumentList "/k", $command | Out-Null
  }
  Write-Host "Operator started (tauri)."
  exit 0
}

$command = "cd /d `"$appDir`" && npm run dev"
if ($Hidden) {
  Start-Process cmd.exe -ArgumentList "/k", $command -WindowStyle Hidden | Out-Null
} else {
  Start-Process cmd.exe -ArgumentList "/k", $command | Out-Null
}

if (Wait-HttpReady -TargetUrl $url) {
  Start-Process $url | Out-Null
  Write-Host "Operator started (dev) and opened in browser: $url"
} else {
  Write-Warning "Operator dev server started, but browser was not opened automatically: $url"
}
