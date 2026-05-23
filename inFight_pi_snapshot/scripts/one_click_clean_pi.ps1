param(
  [string]$ProjectRoot = "D:\\TestHome\\TestHome\\inFight_pi_snapshot",
  [string]$PiHost = "192.168.0.177",
  [string]$PiUser = "pi",
  [string]$SshKey = "C:\\Users\\Dendr\\.ssh\\codex_pi",
  [ValidateSet("auto", "online", "offline")]
  [string]$InstallMode = "online",
  [string]$RemoteRoot = "/home/pi/inFight",
  [string]$ArchivePath = "D:\\inFight_release.tar.gz"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Invoke-Native([string]$Name, [string[]]$CommandArgs) {
  & $Name @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

function Run-Step([string]$Title, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "== $Title =="
  & $Action
}

Require-Command "tar"
Require-Command "ssh"
Require-Command "scp"

if (!(Test-Path $ProjectRoot)) {
  throw "Project root not found: $ProjectRoot"
}
if (!(Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logDir = Join-Path $ProjectRoot "reports"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$localLog = Join-Path $logDir "one_click_clean_pi_$stamp.log"

$archiveName = Split-Path -Leaf $ArchivePath
$remoteArchive = "/home/pi/$archiveName"

$sshOpts = @(
  "-i", $SshKey,
  "-o", "StrictHostKeyChecking=no",
  "-o", "UserKnownHostsFile=/dev/null"
)

Run-Step "1/6 Build release archive" {
  if (Test-Path $ArchivePath) {
    Remove-Item -Path $ArchivePath -Force
  }

  Push-Location $ProjectRoot
  try {
    Invoke-Native "tar" @(
      "-czf", $ArchivePath,
      "--exclude=.git",
      "--exclude=node_modules",
      "--exclude=reports",
      "--exclude=*.log",
      "--exclude=inFight_release.tar.gz",
      "."
    )
  }
  finally {
    Pop-Location
  }

  if (!(Test-Path $ArchivePath)) {
    throw "Archive was not created: $ArchivePath"
  }
  $sizeMb = [math]::Round((Get-Item $ArchivePath).Length / 1MB, 2)
  Write-Host "Archive created: $ArchivePath ($sizeMb MB)"
}

Run-Step "2/6 Upload archive to Pi" {
  Invoke-Native "scp" ($sshOpts + @($ArchivePath, "${PiUser}@${PiHost}:${remoteArchive}"))
}

Run-Step "3/6 Extract release on Pi" {
  $remoteCmd = @'
set -e
rm -rf '__REMOTE_ROOT__'
mkdir -p '__REMOTE_ROOT__'
tar -xzf '__REMOTE_ARCHIVE__' -C '__REMOTE_ROOT__'
chmod +x '__REMOTE_ROOT__'/scripts/*.sh || true
'@
  $remoteCmd = $remoteCmd.Replace("__REMOTE_ROOT__", $RemoteRoot).Replace("__REMOTE_ARCHIVE__", $remoteArchive)
  Invoke-Native "ssh" ($sshOpts + @("${PiUser}@${PiHost}", $remoteCmd))
}

Run-Step "4/6 Run installer on Pi (INSTALL_MODE=$InstallMode)" {
  $remoteCmd = "set -e; cd '$RemoteRoot'; INSTALL_MODE=$InstallMode ./scripts/install_clean_pi.sh"
  Invoke-Native "ssh" (@("-t") + $sshOpts + @("${PiUser}@${PiHost}", $remoteCmd))
}

Run-Step "5/6 Fetch verify + install reports" {
  $remoteCmd = @'
set -e
LATEST_INSTALL=$(ls -1t '__REMOTE_ROOT__'/reports/install_clean_pi_*.log 2>/dev/null | head -n 1)
if [ -n "$LATEST_INSTALL" ]; then
  echo "$LATEST_INSTALL"
fi
'@
  $remoteCmd = $remoteCmd.Replace("__REMOTE_ROOT__", $RemoteRoot)
  $latestInstall = (& ssh @sshOpts "${PiUser}@${PiHost}" $remoteCmd).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "ssh failed while querying install report (exit code $LASTEXITCODE)"
  }

  if ($latestInstall) {
    $localInstall = Join-Path $logDir ("pi_install_" + $stamp + ".log")
    Invoke-Native "scp" ($sshOpts + @("${PiUser}@${PiHost}:$latestInstall", $localInstall))
    Write-Host "Saved install log: $localInstall"
  } else {
    Write-Host "Install log file not found on Pi."
  }

  $remoteVerifyOut = & ssh @sshOpts "${PiUser}@${PiHost}" "'$RemoteRoot'/scripts/verify_clean_pi.sh"
  if ($LASTEXITCODE -ne 0) {
    throw "verify_clean_pi.sh returned non-zero status (exit code $LASTEXITCODE)"
  }
  $remoteVerifyOut | Out-File -FilePath $localLog -Encoding utf8
  Write-Host "Saved verify output: $localLog"
}

Run-Step "6/6 Final quick status" {
  $remoteCmd = @'
set -e
echo '--- services ---'
systemctl is-active inflight-core inflight-server inflight-crossfront || true
echo '--- api ---'
curl -sS -m 8 -o /tmp/inflight_api_check.txt -w '%{http_code}\n' http://127.0.0.1:3001/tournaments/getall || true
echo '--- device ---'
ls -l /dev/crossing_detector 2>/dev/null || true
'@
  Invoke-Native "ssh" ($sshOpts + @("${PiUser}@${PiHost}", $remoteCmd))
}

Write-Host ""
Write-Host "DONE"
Write-Host "Local verify log: $localLog"
