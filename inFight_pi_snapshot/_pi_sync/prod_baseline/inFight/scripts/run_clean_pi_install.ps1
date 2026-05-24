param(
  [string]$PiHost = "192.168.0.177",
  [string]$PiUser = "pi",
  [string]$SshKey = "C:\\Users\\Dendr\\.ssh\\codex_pi",
  [ValidateSet("auto","online","offline")]
  [string]$InstallMode = "auto"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/2] Upload scripts..."
scp -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null `
  "D:\\TestHome\\TestHome\\inFight_pi_snapshot\\scripts\\install_clean_pi.sh" `
  "D:\\TestHome\\TestHome\\inFight_pi_snapshot\\scripts\\verify_clean_pi.sh" `
  "$PiUser@${PiHost}:/home/pi/inFight/scripts/"

Write-Host "[2/2] Run clean installer (INSTALL_MODE=$InstallMode)..."
ssh -t -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null `
  "$PiUser@$PiHost" "chmod +x /home/pi/inFight/scripts/install_clean_pi.sh /home/pi/inFight/scripts/verify_clean_pi.sh; cd /home/pi/inFight; INSTALL_MODE=$InstallMode ./scripts/install_clean_pi.sh"

Write-Host "Done"