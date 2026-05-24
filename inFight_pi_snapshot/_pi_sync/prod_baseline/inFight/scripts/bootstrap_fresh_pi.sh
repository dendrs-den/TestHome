#!/usr/bin/env bash
set -euo pipefail

# Run as user pi on a clean Raspberry Pi OS.
# This script installs runtime deps, prepares services, and enables mode-based autostart.
#
# Usage:
#   ./scripts/bootstrap_fresh_pi.sh            # online-friendly mode
#   ./scripts/bootstrap_fresh_pi.sh --offline  # isolated-network mode (no apt/node fetch)

ROOT="/home/pi/inFight"
SERVER_DIR="$ROOT/src_frontend/server"
CLIENT_DIR="$ROOT/src_frontend/client"
MOCK_DIR="$ROOT/local_core_mock"
ARTIFACTS_DIR="$ROOT/artifacts"
REAL_BINS_DIR="$ARTIFACTS_DIR/bins"
REAL_CORE_MAIN="$ARTIFACTS_DIR/core/main"
REAL_CORE_CONFIG="$ARTIFACTS_DIR/core/config.json"
OFFLINE_MODE=0

if [[ "${1:-}" == "--offline" ]]; then
  OFFLINE_MODE=1
fi

if [[ ! -d "$ROOT" ]]; then
  echo "[bootstrap] Missing $ROOT. Copy inFight project first."
  exit 1
fi

if [[ "$OFFLINE_MODE" -eq 0 ]]; then
  echo "[bootstrap] installing base packages"
  sudo apt-get update -y
  sudo apt-get install -y curl git build-essential ca-certificates
else
  echo "[bootstrap] OFFLINE mode: skip apt package installation"
fi
chmod +x "$ROOT/scripts/"*.sh || true

if ! command -v node >/dev/null 2>&1; then
  if [[ "$OFFLINE_MODE" -eq 1 ]]; then
    echo "[bootstrap] ERROR: node is not installed and OFFLINE mode is enabled."
    echo "[bootstrap] Install Node.js beforehand in your base Pi image or provide local .deb packages."
    exit 1
  fi
  echo "[bootstrap] installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "[bootstrap] node: $(node -v), npm: $(npm -v)"

echo "[bootstrap] installing npm dependencies"
cd "$MOCK_DIR" && npm install --no-audit --no-fund
cd "$SERVER_DIR" && npm install --legacy-peer-deps --no-audit --no-fund
cd "$CLIENT_DIR" && npm install --legacy-peer-deps --no-audit --no-fund

echo "[bootstrap] ensuring server env"
if [[ ! -f "$SERVER_DIR/.env" ]]; then
  cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
fi
sed -i 's#^CORE_API_URL=.*#CORE_API_URL=http://127.0.0.1:15000#' "$SERVER_DIR/.env"
grep -q '^SERVICE_MODE=' "$SERVER_DIR/.env" || echo "SERVICE_MODE=1" >> "$SERVER_DIR/.env"

echo "[bootstrap] building frontend"
cd "$CLIENT_DIR" && npm run build

echo "[bootstrap] writing systemd units"
cat <<'UNIT' | sudo tee /etc/systemd/system/infight-core-mock.service >/dev/null
[Unit]
Description=inFight Local Core Mock
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/inFight/local_core_mock
Environment=CORE_MOCK_PORT=15000
Environment=MOCK_AUTO_REMOTE_CROSS=0
Environment=MOCK_AUTO_REMOTE_FAULT=0
ExecStart=/usr/bin/node /home/pi/inFight/local_core_mock/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat <<'UNIT' | sudo tee /etc/systemd/system/infight-web.service >/dev/null
[Unit]
Description=inFight Web Server
After=network.target infight-core-mock.service
Requires=infight-core-mock.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/inFight/src_frontend/server
ExecStart=/usr/bin/node /home/pi/inFight/src_frontend/server/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat <<'UNIT' | sudo tee /etc/systemd/system/infight-mode.service >/dev/null
[Unit]
Description=inFight Mode Selector (MOCK/REAL)
After=network.target
Wants=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash /home/pi/inFight/scripts/apply_mode.sh

[Install]
WantedBy=multi-user.target
UNIT

# Optional: install real-hardware artifacts if provided.
# Expected structure:
# /home/pi/inFight/artifacts/bins/jsm.crossing-detector-front
# /home/pi/inFight/artifacts/bins/jsm.bluetooth
# /home/pi/inFight/artifacts/core/main
if [[ -x "$REAL_BINS_DIR/jsm.crossing-detector-front" && -x "$REAL_CORE_MAIN" ]]; then
  echo "[bootstrap] real-hardware artifacts found, installing to /opt/inflight"
  "$ROOT/scripts/install_real_runtime_deps.sh" || true
  sudo mkdir -p /opt/inflight/bins /opt/inflight/core/cmd/app
  sudo install -m 755 "$REAL_BINS_DIR/jsm.crossing-detector-front" /opt/inflight/bins/jsm.crossing-detector-front
  if [[ -x "$REAL_BINS_DIR/jsm.bluetooth" ]]; then
    sudo install -m 755 "$REAL_BINS_DIR/jsm.bluetooth" /opt/inflight/bins/jsm.bluetooth
  fi
  sudo install -m 755 "$REAL_CORE_MAIN" /opt/inflight/core/cmd/app/main
  if [[ -f "$REAL_CORE_CONFIG" ]]; then
    sudo install -m 644 "$REAL_CORE_CONFIG" /opt/inflight/core/cmd/app/config.json
  elif [[ -f "$ROOT/deploy_core/cmd/app/config.json" ]]; then
    sudo install -m 644 "$ROOT/deploy_core/cmd/app/config.json" /opt/inflight/core/cmd/app/config.json
  fi

  cat <<'UNIT' | sudo tee /etc/systemd/system/inflight-core.service >/dev/null
[Unit]
Description=inFlight Core service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/inflight/core/cmd/app
ExecStart=/opt/inflight/core/cmd/app/main
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

  cat <<'UNIT' | sudo tee /etc/systemd/system/inflight-crossfront.service >/dev/null
[Unit]
Description=inFlight Crossing Frontend service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/inflight/bins
ExecStart=/opt/inflight/bins/jsm.crossing-detector-front
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

  cat <<'UNIT' | sudo tee /etc/systemd/system/inflight-server.service >/dev/null
[Unit]
Description=inFlight Server service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/inFight/src_frontend/server
ExecStart=/usr/bin/node /home/pi/inFight/src_frontend/server/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
else
  echo "[bootstrap] real-hardware artifacts are NOT present."
  echo "[bootstrap] REAL mode will not start hardware services until artifacts are added."
fi

echo "[bootstrap] default mode file"
echo "MODE=MOCK" | sudo tee /etc/default/infight-mode >/dev/null

echo "[bootstrap] disable legacy production services if present"
sudo systemctl disable --now inflight-server inflight-core inflight-crossfront inflight-client nginx 2>/dev/null || true

echo "[bootstrap] enabling mode selector"
sudo systemctl daemon-reload
sudo systemctl enable --now infight-mode.service

echo "[bootstrap] done"
echo "Run status:"
echo "  /home/pi/inFight/scripts/mode_status.sh"
