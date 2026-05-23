param(
  [string]$PiHost = "192.168.0.177",
  [string]$PiUser = "pi",
  [string]$SshKey = "C:\\Users\\Dendr\\.ssh\\codex_pi"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/3] Upload offline installer script..."
scp -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null `
  "D:\\TestHome\\TestHome\\inFight_pi_snapshot\\scripts\\offline_real_install.sh" `
  "$PiUser@${PiHost}:/home/pi/inFight/scripts/offline_real_install.sh"

Write-Host "[2/3] Make executable..."
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null `
  "$PiUser@$PiHost" "chmod +x /home/pi/inFight/scripts/offline_real_install.sh"

Write-Host "[3/3] Run installer on Pi..."
ssh -t -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null `
  "$PiUser@$PiHost" "cd /home/pi/inFight && ./scripts/offline_real_install.sh"

Write-Host "Done."
