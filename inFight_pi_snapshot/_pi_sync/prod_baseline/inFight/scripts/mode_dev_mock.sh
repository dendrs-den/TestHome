#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/pi/inFight"
ENV_FILE="$ROOT/src_frontend/server/.env"

echo "[mode] DEV MOCK"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/src_frontend/server/.env.example" "$ENV_FILE"
fi

sed -i 's#^CORE_API_URL=.*#CORE_API_URL=http://127.0.0.1:15000#' "$ENV_FILE"
grep -q '^SERVICE_MODE=' "$ENV_FILE" \
  && sed -i 's#^SERVICE_MODE=.*#SERVICE_MODE=1#' "$ENV_FILE" \
  || echo "SERVICE_MODE=1" >> "$ENV_FILE"

echo "[mode] updated $ENV_FILE"
grep -E 'CORE_API_URL|SERVICE_MODE' "$ENV_FILE"

sudo systemctl disable --now inflight-core inflight-server inflight-crossfront inflight-client nginx 2>/dev/null || true
sudo systemctl enable --now infight-core-mock infight-web
sudo systemctl restart infight-core-mock infight-web

echo "[mode] done"
systemctl is-active infight-core-mock infight-web | cat
