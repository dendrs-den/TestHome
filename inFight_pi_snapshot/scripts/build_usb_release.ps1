$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$releaseRoot = Join-Path $repoRoot "release_usb"
$distRoot = Join-Path $releaseRoot "inflight_usb_release"
$clientDir = Join-Path $repoRoot "src_frontend\client"
$serverDir = Join-Path $repoRoot "src_frontend\server"
$configsDir = Join-Path $repoRoot "configs"

Write-Host "[1/7] Cleaning previous release folder"
if (Test-Path $releaseRoot) {
  Remove-Item -Recurse -Force $releaseRoot
}
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null

Write-Host "[2/7] Building client production bundle"
Push-Location $clientDir
$env:REACT_APP_SERVICE_MODE = "0"
cmd /c "npm.cmd run build"
Pop-Location

Write-Host "[3/7] Copying server + client build"
New-Item -ItemType Directory -Force -Path (Join-Path $distRoot "frontend") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $distRoot "frontend\server") | Out-Null
Copy-Item -Recurse -Force (Join-Path $serverDir "*") (Join-Path $distRoot "frontend\server\")
New-Item -ItemType Directory -Force -Path (Join-Path $distRoot "frontend\client") | Out-Null
Copy-Item -Recurse -Force (Join-Path $clientDir "build") (Join-Path $distRoot "frontend\client\")

Write-Host "[4/7] Writing production env (service mode OFF)"
$serverEnv = @"
CORE_API_URL=http://127.0.0.1:15000
SERVICE_MODE=0
NODE_ENV=production
WEBSERVER_PORT=3001
WEBSERVER_URL=http://127.0.0.1
"@
$serverEnvPath = Join-Path $distRoot "frontend\server\.env"
Set-Content -Path $serverEnvPath -Value $serverEnv -Encoding UTF8

$clientEnv = @"
REACT_APP_SERVICE_MODE=0
"@
$clientEnvPath = Join-Path $distRoot "frontend\client\.env.production"
Set-Content -Path $clientEnvPath -Value $clientEnv -Encoding UTF8

Write-Host "[5/7] Copying service/nginx configs"
New-Item -ItemType Directory -Force -Path (Join-Path $distRoot "configs") | Out-Null
Copy-Item -Force (Join-Path $configsDir "inflight-server.service") (Join-Path $distRoot "configs\inflight-server.service")
Copy-Item -Force (Join-Path $configsDir "inflight-client.service") (Join-Path $distRoot "configs\inflight-client.service")
Copy-Item -Force (Join-Path $configsDir "inflight-core.service") (Join-Path $distRoot "configs\inflight-core.service")
Copy-Item -Force (Join-Path $configsDir "inflight-crossfront.service") (Join-Path $distRoot "configs\inflight-crossfront.service")
Copy-Item -Force (Join-Path $configsDir "nginx_default.conf") (Join-Path $distRoot "configs\nginx_default.conf")

Write-Host "[6/7] Creating install script"
$installScript = @'
#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Create target dirs"
sudo mkdir -p /opt/inflight/frontend
sudo mkdir -p /opt/inflight/frontend/client
sudo mkdir -p /opt/inflight/frontend/server

echo "[2/6] Sync frontend files"
sudo rsync -a --delete ./frontend/client/build/ /opt/inflight/frontend/client/build/
sudo rsync -a --delete ./frontend/server/ /opt/inflight/frontend/server/

echo "[3/6] Install server deps (prod only)"
cd /opt/inflight/frontend/server
sudo npm ci --omit=dev

echo "[4/6] Install systemd services"
sudo cp ./../../inflight_usb_release/configs/inflight-server.service /etc/systemd/system/inflight-server.service || true
sudo cp ./../../inflight_usb_release/configs/inflight-client.service /etc/systemd/system/inflight-client.service || true

echo "[5/6] Reload + restart services"
sudo systemctl daemon-reload
sudo systemctl enable inflight-server.service
sudo systemctl restart inflight-server.service

echo "[6/6] Done"
echo "Check status:"
echo "  systemctl status inflight-server.service --no-pager"
'@
$installPath = Join-Path $distRoot "install_on_pi.sh"
Set-Content -Path $installPath -Value $installScript -Encoding UTF8

Write-Host "[7/7] Creating ZIP archive"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipPath = Join-Path $releaseRoot "inflight_usb_release_$stamp.zip"
Compress-Archive -Path (Join-Path $distRoot "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Release package created:"
Write-Host "  $zipPath"
Write-Host ""
Write-Host "Service mode defaults:"
Write-Host "  SERVICE_MODE=0"
Write-Host "  REACT_APP_SERVICE_MODE=0"
