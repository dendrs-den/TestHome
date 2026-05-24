param(
  [int]$Repeat = 1
)

$ErrorActionPreference = "Stop"

if ($Repeat -lt 1) {
  throw "Repeat must be >= 1"
}

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$mockDir = Join-Path $repoRoot "local_core_mock"
$serverDir = Join-Path $repoRoot "src_frontend\server"
$smokeScript = Join-Path $repoRoot "scripts\smoke-tests-local.js"
$sessionScript = Join-Path $repoRoot "scripts\session-timer-consistency-test.js"

$mockProcess = $null
$serverProcess = $null

try {
  Write-Host "[1/4] Starting local core mock on :15010"
  $mockProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c set CORE_MOCK_PORT=15010&& node server.js" `
    -WorkingDirectory $mockDir `
    -WindowStyle Hidden `
    -PassThru

  Write-Host "[2/4] Starting frontend server on :3001"
  $serverProcess = Start-Process -FilePath "node" `
    -ArgumentList "server.js" `
    -WorkingDirectory $serverDir `
    -WindowStyle Hidden `
    -PassThru

  Start-Sleep -Seconds 4

  for ($i = 1; $i -le $Repeat; $i++) {
    Write-Host "[3/4] Iteration $($i)/$Repeat - Running smoke tests"
    node $smokeScript
    if ($LASTEXITCODE -ne 0) {
      throw "Smoke tests failed on iteration $i"
    }

    Write-Host "[4/4] Iteration $($i)/$Repeat - Running session timer consistency test"
    node $sessionScript
    if ($LASTEXITCODE -ne 0) {
      throw "Session consistency test failed on iteration $i"
    }
  }

  Write-Host "All local tests passed for $Repeat iteration(s)."
} finally {
  if ($mockProcess) {
    Stop-Process -Id $mockProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($serverProcess) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
