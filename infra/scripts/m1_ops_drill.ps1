param(
  [string]$BaseUrl = "http://192.168.0.177:18080",
  [string]$SshHost = "flow@192.168.0.177",
  [string]$SshKeyPath = "C:\Users\Dendr\.ssh\codex_pi_new",
  [string]$ServiceName = "inflightflow-core.service"
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param([string]$Url, [object]$Body)
  $json = $Body | ConvertTo-Json -Compress -Depth 10
  return Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $json
}

function New-StepResult {
  param([string]$Name, [bool]$Pass, [string]$Message)
  return [pscustomobject]@{
    Name = $Name
    Pass = $Pass
    Message = $Message
  }
}

$steps = New-Object System.Collections.Generic.List[object]
$startedAt = [DateTime]::UtcNow
$roundId = "ops-m1-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$tournamentId = "ops-m1-tournament"
$overallPass = $true

try {
  $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
  $steps.Add((New-StepResult -Name "health" -Pass ($health.status -eq "ok") -Message "status=$($health.status)"))
  if ($health.status -ne "ok") { $overallPass = $false }

  $state = Invoke-RestMethod -Uri "$BaseUrl/v1/domain/state" -Method Get
  if ([string]::IsNullOrWhiteSpace($state.TournamentID)) {
    $create = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
      type = "create_tournament"
      data = @{ tournamentId = $tournamentId }
      idempotencyKey = "ops-create-tournament"
    }
    $steps.Add((New-StepResult -Name "create_tournament" -Pass $true -Message "created tournamentId=$($create.state.TournamentID)"))
  } else {
    $tournamentId = [string]$state.TournamentID
    $steps.Add((New-StepResult -Name "reuse_tournament" -Pass $true -Message "tournamentId=$tournamentId"))
  }

  if ($state.RoundState -eq "running") {
    $null = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
      type = "cancel_round"
      data = @{}
      idempotencyKey = "ops-cancel-running-$roundId"
    }
  }

  $prep = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
    type = "prepare_round"
    data = @{ roundId = $roundId }
    idempotencyKey = "ops-prepare-$roundId"
  }
  $start = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
    type = "start_round"
    data = @{}
    idempotencyKey = "ops-start-$roundId"
  }
  $running = $start.state.RoundState -eq "running"
  $steps.Add((New-StepResult -Name "prepare_start_round" -Pass $running -Message "roundState=$($start.state.RoundState), roundId=$roundId"))
  if (-not $running) { $overallPass = $false }

  $null = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
    type = "accept_crossing"
    data = @{ at = 1000 }
  }
  $null = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
    type = "accept_crossing"
    data = @{ at = 1475 }
  }

  $finish = Invoke-JsonPost -Url "$BaseUrl/v1/domain/command" -Body @{
    type = "finish_round"
    data = @{}
  }
  $completed = $finish.state.RoundState -eq "completed"
  $resultOk = [int64]$finish.state.RoundResultMs -eq 475
  $steps.Add((New-StepResult -Name "finish_result" -Pass ($completed -and $resultOk) -Message "state=$($finish.state.RoundState), resultMs=$($finish.state.RoundResultMs)"))
  if (-not ($completed -and $resultOk)) { $overallPass = $false }

  ssh -i $SshKeyPath $SshHost "sudo -n systemctl restart $ServiceName" | Out-Null
  Start-Sleep -Seconds 1

  $restored = Invoke-RestMethod -Uri "$BaseUrl/v1/domain/state" -Method Get
  $restoreOk = ($restored.RoundState -eq "completed" -and [int64]$restored.RoundResultMs -eq 475 -and [int]$restored.Crossings -eq 2)
  $steps.Add((New-StepResult -Name "restore_after_restart" -Pass $restoreOk -Message "state=$($restored.RoundState), crossings=$($restored.Crossings), resultMs=$($restored.RoundResultMs)"))
  if (-not $restoreOk) { $overallPass = $false }
}
catch {
  $overallPass = $false
  $steps.Add((New-StepResult -Name "exception" -Pass $false -Message $_.Exception.Message))
}

$finishedAt = [DateTime]::UtcNow
$overall = if ($overallPass) { "PASS" } else { "FAIL" }

$reportPath = Join-Path $PSScriptRoot "..\..\docs\reports\m1_ops_drill_$($finishedAt.ToString('yyyyMMdd_HHmmss')).md"
$reportPath = [System.IO.Path]::GetFullPath($reportPath)

$lines = @()
$lines += "# M1 OPS Drill Report"
$lines += ""
$lines += "- Status: **$overall**"
$lines += "- Start (UTC): $($startedAt.ToString('o'))"
$lines += "- Finish (UTC): $($finishedAt.ToString('o'))"
$lines += "- Base URL: ``$BaseUrl``"
$lines += "- Round ID: ``$roundId``"
$lines += ""
$lines += "## Steps"
foreach ($s in $steps) {
  $icon = if ($s.Pass) { "OK" } else { "FAIL" }
  $lines += "- [$icon] $($s.Name): $($s.Message)"
}
$lines += ""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($reportPath, $lines, $utf8NoBom)

Write-Host "M1 drill: $overall"
Write-Host "Report: $reportPath"
if (-not $overallPass) {
  exit 1
}
