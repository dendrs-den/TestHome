param(
  [switch]$Hidden
)

$root = Split-Path -Parent $PSScriptRoot
$coreDir = Join-Path $root "apps\core"
$operatorDir = Join-Path $root "apps\operator"

function Stop-ProcessOnPort {
  param(
    [int]$Port
  )

  $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($procId in $pids) {
    if ($procId -and $procId -ne $PID) {
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Stopped process on port $Port (PID: $procId)"
      } catch {
        Write-Warning ("Failed to stop PID {0} on port {1}: {2}" -f $procId, $Port, $_.Exception.Message)
      }
    }
  }
}

function Stop-ProcessByCommandLineMatch {
  param(
    [string[]]$Patterns
  )

  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
  foreach ($proc in $processes) {
    $cmd = [string]$proc.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }

    $isMatch = $true
    foreach ($pattern in $Patterns) {
      if ($cmd -notlike "*$pattern*") {
        $isMatch = $false
        break
      }
    }

    if ($isMatch -and $proc.ProcessId -and $proc.ProcessId -ne $PID) {
      try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
        Write-Host "Stopped process by pattern (PID: $($proc.ProcessId))"
      } catch {
        Write-Warning ("Failed to stop PID {0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
      }
    }
  }
}

function Start-App {
  param(
    [string]$Name,
    [string]$WorkDir,
    [string]$Command
  )

  if (-not (Test-Path $WorkDir)) {
    throw "[$Name] folder not found: $WorkDir"
  }

  $cmd = @"
Set-Location -LiteralPath '$WorkDir'
$Command
"@

  if ($Hidden) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Hidden | Out-Null
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null
  }
}

# Force-close previously opened core/operator windows and dev servers.
Stop-ProcessByCommandLineMatch -Patterns @("apps\core", "cmd\core")
Stop-ProcessByCommandLineMatch -Patterns @("apps\operator", "cargo tauri dev")
Stop-ProcessByCommandLineMatch -Patterns @("apps\operator", "vite")

Stop-ProcessOnPort -Port 8080
Stop-ProcessOnPort -Port 5173
Stop-ProcessOnPort -Port 5188
Start-Sleep -Milliseconds 300

Start-App -Name "core" -WorkDir $coreDir -Command "`$env:HARDWARE_MODE='real'; `$env:SENSOR_SOURCE='manual'; go run .\cmd\core"
Start-App -Name "operator" -WorkDir $operatorDir -Command "`$env:Path += ';`$env:USERPROFILE\.cargo\bin'; `$env:VITE_CORE_PROXY_TARGET='http://127.0.0.1:8080'; cargo tauri dev"

Write-Host "Started core(real+manual) + operator in separate windows."
