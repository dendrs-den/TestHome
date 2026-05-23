param(
  [string]$PiHost = "192.168.0.177",
  [string]$PiUser = "pi",
  [string]$SshKey = "C:\\Users\\Dendr\\.ssh\\codex_pi",
  [string]$ArchivePath = "D:\\TestHome\\TestHome\\inFight_pi_snapshot\\artifacts\\runtime_from_old_pi\\inflight_runtime_export.tar.gz"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $ArchivePath)) {
  throw "Archive not found: $ArchivePath"
}

Write-Host "[1/5] Uploading runtime archive to Pi $PiUser@$PiHost ..."
scp -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $ArchivePath "$PiUser@${PiHost}:/tmp/inflight_runtime_export.tar.gz"

Write-Host "[2/5] Stopping inFlight services ..."
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$PiUser@$PiHost" "sudo systemctl stop inflight-server inflight-core inflight-crossfront inflight-bluetooth || true"

Write-Host "[3/5] Restoring runtime files ..."
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$PiUser@$PiHost" "sudo tar -xzf /tmp/inflight_runtime_export.tar.gz -C /"

Write-Host "[4/5] Reloading systemd and enabling services ..."
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$PiUser@$PiHost" "sudo systemctl daemon-reload; sudo systemctl enable inflight-core inflight-server inflight-crossfront inflight-bluetooth"

Write-Host "[5/5] Starting services and showing status ..."
ssh -i $SshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$PiUser@$PiHost" "sudo systemctl restart inflight-core inflight-crossfront inflight-bluetooth inflight-server; sleep 2; systemctl --no-pager --full status inflight-core inflight-server inflight-crossfront inflight-bluetooth | sed -n '1,120p'; echo '--- API check ---'; curl -sS http://127.0.0.1:3001/tournaments/getall | head -c 300; echo"

Write-Host "Done."
