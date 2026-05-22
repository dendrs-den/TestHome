param(
  [int]$ClientPort = 3000,
  [int]$ServerPort = 3001,
  [int]$Retries = 12,
  [int]$RetryDelaySec = 2
)

$ErrorActionPreference = "Stop"

function Test-Url {
  param(
    [string]$Url
  )
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    $ok = $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400
    [PSCustomObject]@{
      Url = $Url
      Status = $resp.StatusCode
      Ok = $ok
    }
  } catch {
    [PSCustomObject]@{
      Url = $Url
      Status = "ERR"
      Ok = $false
    }
  }
}

$requiredUrls = @(
  "http://localhost:$ServerPort/terminal",
  "http://localhost:$ServerPort/infoboard",
  "http://localhost:$ServerPort/scoreboard"
)

$optionalUrls = @(
  "http://localhost:$ClientPort"
)

$attempt = 0
do {
  $attempt += 1
  $requiredResults = $requiredUrls | ForEach-Object { Test-Url -Url $_ }
  $allRequiredOk = ($requiredResults.Where({ -not $_.Ok }).Count -eq 0)
  if (-not $allRequiredOk -and $attempt -lt $Retries) {
    Start-Sleep -Seconds $RetryDelaySec
  }
} while (-not $allRequiredOk -and $attempt -lt $Retries)

$optionalResults = $optionalUrls | ForEach-Object { Test-Url -Url $_ }
$results = @($requiredResults + $optionalResults)
$results | Format-Table -AutoSize

if (-not $allRequiredOk) {
  Write-Error "Route smoke test failed (required server routes are not ready)."
}

Write-Host "Route smoke test passed."
