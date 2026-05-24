#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/pi/inFight"
ENV_FILE="$ROOT/src_frontend/server/.env"
ARTIFACTS_DIR="$ROOT/artifacts"
CORE_BIN="$ARTIFACTS_DIR/core/main"
CROSS_BIN="$ARTIFACTS_DIR/bins/jsm.crossing-detector-front"

echo "[mode] REAL HARDWARE"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/src_frontend/server/.env.example" "$ENV_FILE"
fi

sed -i 's#^CORE_API_URL=.*#CORE_API_URL=http://127.0.0.1:15000#' "$ENV_FILE"
grep -q '^SERVICE_MODE=' "$ENV_FILE" \
  && sed -i 's#^SERVICE_MODE=.*#SERVICE_MODE=0#' "$ENV_FILE" \
  || echo "SERVICE_MODE=0" >> "$ENV_FILE"

echo "[mode] updated $ENV_FILE"
grep -E 'CORE_API_URL|SERVICE_MODE' "$ENV_FILE"

if [[ ! -f "$CORE_BIN" ]]; then
  echo "[mode] missing required core binary: $CORE_BIN"
  echo "[mode] abort REAL switch"
  exit 1
fi
if [[ ! -f "$CROSS_BIN" ]]; then
  echo "[mode] missing required crossing binary: $CROSS_BIN"
  echo "[mode] abort REAL switch"
  exit 1
fi

# Archives created on Windows can lose executable bits.
chmod +x "$CORE_BIN" "$CROSS_BIN" || true

"$ROOT/scripts/install_real_runtime_deps.sh" || true

sudo systemctl disable --now infight-core-mock infight-web 2>/dev/null || true

# Start real stack if units are present on this Pi image.
for svc in inflight-core inflight-server inflight-crossfront nginx; do
  if [[ "$(systemctl show -p LoadState --value "${svc}.service" 2>/dev/null || echo not-found)" != "not-found" ]]; then
    sudo systemctl enable --now "${svc}.service"
    echo "[mode] started $svc"
  else
    echo "[mode] $svc not found on this OS image"
  fi
done

echo "[mode] done"
