#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/pi/inFight"
ARTIFACTS_DIR="$ROOT/artifacts"

need=(
  "$ARTIFACTS_DIR/bins/jsm.crossing-detector-front"
  "$ARTIFACTS_DIR/core/main"
)

missing=0
echo "== check real-hardware artifacts =="
for f in "${need[@]}"; do
  if [[ -f "$f" ]]; then
    echo "[OK] $f"
  else
    echo "[MISS] $f"
    missing=1
  fi
done

if [[ -f "$ARTIFACTS_DIR/bins/jsm.bluetooth" ]]; then
  echo "[OK] optional $ARTIFACTS_DIR/bins/jsm.bluetooth"
else
  echo "[WARN] optional $ARTIFACTS_DIR/bins/jsm.bluetooth not found"
fi

if [[ $missing -ne 0 ]]; then
  echo "Real mode binaries are incomplete."
  exit 1
fi

echo "Real mode binaries are present."
if [[ -f "$ARTIFACTS_DIR/core/config.json" ]]; then
  echo "[OK] optional $ARTIFACTS_DIR/core/config.json"
else
  echo "[WARN] optional $ARTIFACTS_DIR/core/config.json not found (will fallback to deploy_core/cmd/app/config.json)"
fi

echo "== ldd checks =="
for b in "$ARTIFACTS_DIR/bins/jsm.crossing-detector-front" "$ARTIFACTS_DIR/bins/jsm.bluetooth" "$ARTIFACTS_DIR/core/main"; do
  if [[ -f "$b" ]]; then
    echo "-- $b --"
    ldd "$b" 2>/dev/null | grep -E "not found|libjsoncpp|libssl|libcrypto|libSDL2" || true
  fi
done
