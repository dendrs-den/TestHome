$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$coreDir = Join-Path $root "local_core_mock"
$serverDir = Join-Path $root "src_frontend\server"
$clientDir = Join-Path $root "src_frontend\client"

function Stop-PortProcess {
  param([int]$Port)
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    try {
      Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "taskkill /PID $procId /T /F" -WindowStyle Hidden -Wait
    } catch {}
  }
}

function Get-FreePort {
  param(
    [int[]]$Candidates = @(3003, 3004, 3100, 3200, 3300, 3400, 3500, 3600)
  )
  $used = @{}
  Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $used[$_.LocalPort] = $true
  }
  foreach ($p in $Candidates) {
    if (-not $used.ContainsKey($p)) {
      return $p
    }
  }
  throw "No free port found in candidate list: $($Candidates -join ', ')"
}

Write-Host "Starting inFight local stack..."

# Stop previously started stack (if any) to avoid duplicate windows/processes.
$statePath = Join-Path $PSScriptRoot "run_state.json"
if (Test-Path $statePath) {
  try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    @($state.core_pid, $state.server_pid, $state.client_pid) | Where-Object { $_ } | ForEach-Object {
      try {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "taskkill /PID $_ /T /F" -WindowStyle Hidden -Wait
      } catch {}
    }
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  } catch {}
}

# Ensure critical ports are clean from stale processes not tracked in run_state.
Stop-PortProcess -Port 15010
Stop-PortProcess -Port 3001
Stop-PortProcess -Port 3002

$coreCmd = "cd /d `"$coreDir`" && set CORE_MOCK_PORT=15010 && npm.cmd start"
$core = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $coreCmd -PassThru
Start-Sleep -Seconds 1

$serverCmd = "cd /d `"$serverDir`" && set CORE_API_URL=http://127.0.0.1:15010 && set CORE_MOCK_PORT=15010 && set SERVICE_MODE=1 && npm.cmd start"
$server = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $serverCmd -PassThru
Start-Sleep -Seconds 2
$clientPort = Get-FreePort
$clientCmd = "cd /d `"$clientDir`" && set PORT=$clientPort && set CORE_MOCK_PORT=15010 && set REACT_APP_SERVICE_MODE=1 && set BROWSER=none && npm.cmd start"
$client = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $clientCmd -PassThru

$state = @{
  started_at = (Get-Date).ToString("s")
  core_pid = $core.Id
  server_pid = $server.Id
  client_pid = $client.Id
  client_port = $clientPort
}
$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

Write-Host "Core PID: $($core.Id)"
Write-Host "Server PID: $($server.Id)"
Write-Host "Client PID: $($client.Id)"
Write-Host "Client port: $clientPort"
Write-Host "State saved: $statePath"
$terminalUrl = "http://localhost:3001/terminal"
$infoBoardUrl = "http://localhost:3001/infoboard"

# Open both pages in the default browser; the second one should appear as a new tab.
Start-Process $terminalUrl | Out-Null
Start-Sleep -Milliseconds 350
Start-Process $infoBoardUrl | Out-Null

Write-Host "Open: $terminalUrl"
Write-Host "Open: $infoBoardUrl"
