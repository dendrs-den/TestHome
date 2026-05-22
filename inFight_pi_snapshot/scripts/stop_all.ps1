$ErrorActionPreference = "Stop"

$statePath = Join-Path $PSScriptRoot "run_state.json"
if (-not (Test-Path $statePath)) {
  Write-Host "No run_state.json found. Nothing to stop."
  exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$pids = @($state.core_pid, $state.server_pid, $state.client_pid) | Where-Object { $_ }

foreach ($procId in $pids) {
  try {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "taskkill /PID $procId /T /F" -WindowStyle Hidden -Wait
    Write-Host "Stopped PID $procId"
  } catch {
    Write-Host "PID $procId is not running"
  }
}

Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
Write-Host "inFight local stack stopped."
