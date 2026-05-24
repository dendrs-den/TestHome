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
