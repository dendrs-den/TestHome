param(
  [string]$ProjectRoot = "D:\\TestHome\\TestHome\\inFight_pi_snapshot",
  [string]$ArchivePath = "D:\\inFight_release.tar.gz",
  [string]$PiHost = "192.168.0.177",
  [string]$PiUser = "pi",
  [string]$SshKey = "C:\\Users\\Dendr\\.ssh\\codex_pi",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $ProjectRoot)) {
  throw "ProjectRoot not found: $ProjectRoot"
}

Write-Host "[1/5] Build archive: $ArchivePath"
if (Test-Path $ArchivePath) {
  Remove-Item $ArchivePath -Force
}

tar -czf $ArchivePath -C $ProjectRoot .
if (!(Test-Path $ArchivePath)) {
  throw "Failed to create archive: $ArchivePath"
}

$archiveName = Split-Path $ArchivePath -Leaf

Write-Host "[2/5] Upload archive to ${PiUser}@${PiHost}:/home/pi/$archiveName"
scp -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $ArchivePath "${PiUser}@${PiHost}:/home/pi/$archiveName"

Write-Host "[3/5] Replace /home/pi/inFight with archive contents"
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${PiUser}@${PiHost}" "set -e; rm -rf /home/pi/inFight; mkdir -p /home/pi/inFight; tar -xzf /home/pi/$archiveName -C /home/pi/inFight; chmod +x /home/pi/inFight/scripts/*.sh"

if ($SkipInstall) {
  Write-Host "[4/5] Skip install requested"
  Write-Host 'Done. To install manually: ssh -i <key> pi@<host> "cd /home/pi/inFight && ./scripts/install_clean_pi.sh"'
  exit 0
}

Write-Host "[4/5] Run install_clean_pi.sh"
ssh -t -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${PiUser}@${PiHost}" "cd /home/pi/inFight && ./scripts/install_clean_pi.sh"

Write-Host "[5/5] Done"