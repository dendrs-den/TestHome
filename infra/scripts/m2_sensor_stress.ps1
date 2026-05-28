param(
  [string]$BaseUrl = "http://192.168.0.177:18080",
  [string]$SshHost = "flow@192.168.0.177",
  [string]$SshKeyPath = "C:\Users\Dendr\.ssh\codex_pi_new",
  [string]$ServiceName = "inflightflow-core.service",
  [int]$Cycles = 5
)

$ErrorActionPreference = "Stop"

function New-Step {
  param([int]$Cycle, [bool]$Pass, [string]$Message)
  [pscustomobject]@{
    Cycle = $Cycle
    Pass = $Pass
    Message = $Message
  }
}

$startedAt = [DateTime]::UtcNow
$steps = New-Object System.Collections.Generic.List[object]
$overallPass = $true

for ($i = 1; $i -le $Cycles; $i++) {
  try {
    $r1 = Invoke-RestMethod -Uri "$BaseUrl/v1/instructor/readiness" -Method Get
    if (-not $r1.canStartRound) {
      $overallPass = $false
      $steps.Add((New-Step -Cycle $i -Pass $false -Message "before restart canStartRound=false"))
      continue
    }
    ssh -i $SshKeyPath $SshHost "sudo -n systemctl restart $ServiceName" | Out-Null
    Start-Sleep -Seconds 1
    $r2 = Invoke-RestMethod -Uri "$BaseUrl/v1/instructor/readiness" -Method Get
    $ok = $r2.canStartRound -eq $true
    $steps.Add((New-Step -Cycle $i -Pass $ok -Message "after restart canStartRound=$($r2.canStartRound), level=$($r2.health.level), action=$($r2.health.action)"))
    if (-not $ok) { $overallPass = $false }
  } catch {
    $overallPass = $false
    $steps.Add((New-Step -Cycle $i -Pass $false -Message $_.Exception.Message))
  }
}

$finishedAt = [DateTime]::UtcNow
$overall = if ($overallPass) { "PASS" } else { "FAIL" }
$reportPath = Join-Path $PSScriptRoot "..\..\docs\reports\m2_sensor_stress_$($finishedAt.ToString('yyyyMMdd_HHmmss')).md"
$reportPath = [System.IO.Path]::GetFullPath($reportPath)

$lines = @()
$lines += "# M2 Sensor Stress Report"
$lines += ""
$lines += "- Status: **$overall**"
$lines += "- Cycles: $Cycles"
$lines += "- Start (UTC): $($startedAt.ToString('o'))"
$lines += "- Finish (UTC): $($finishedAt.ToString('o'))"
$lines += "- Base URL: ``$BaseUrl``"
$lines += ""
$lines += "## Steps"
foreach ($s in $steps) {
  $icon = if ($s.Pass) { "OK" } else { "FAIL" }
  $lines += "- [${icon}] cycle=$($s.Cycle): $($s.Message)"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($reportPath, $lines, $utf8NoBom)

Write-Host "M2 sensor stress: $overall"
Write-Host "Report: $reportPath"
if (-not $overallPass) { exit 1 }

