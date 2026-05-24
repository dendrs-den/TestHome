#!/usr/bin/env bash
set -euo pipefail

# Full offline install for clean Pi in isolated network.
# Run as user pi from /home/pi/inFight repository root.

ROOT="/home/pi/inFight"
MODULE_ARTIFACT_REL="artifacts/crossing_stack_runtime/lib_modules/kernel/drivers/misc/crossing_detector.ko"
KVER="$(uname -r)"
MODULE_DST_DIR="/lib/modules/${KVER}/extra"
MODULE_DST="${MODULE_DST_DIR}/crossing_detector.ko"

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*"; exit 1; }

if [[ "$(pwd)" != "$ROOT" ]]; then
  warn "Current dir is $(pwd), switching to $ROOT"
fi
cd "$ROOT"

[[ -x "$ROOT/scripts/bootstrap_fresh_pi.sh" ]] || fail "Missing script: scripts/bootstrap_fresh_pi.sh"
[[ -x "$ROOT/scripts/check_real_artifacts.sh" ]] || fail "Missing script: scripts/check_real_artifacts.sh"

echo "== STEP 1: artifact validation =="
"$ROOT/scripts/check_real_artifacts.sh"

echo "== STEP 2: offline bootstrap =="
"$ROOT/scripts/bootstrap_fresh_pi.sh" --offline

echo "== STEP 3: crossing module install =="
if [[ -f "$ROOT/$MODULE_ARTIFACT_REL" ]]; then
  sudo mkdir -p "$MODULE_DST_DIR"
  sudo install -m 644 "$ROOT/$MODULE_ARTIFACT_REL" "$MODULE_DST"
  sudo depmod -a "$KVER"
  if sudo modprobe crossing_detector 2>/dev/null; then
    ok "crossing_detector loaded via modprobe"
  elif sudo insmod "$MODULE_DST" 2>/dev/null; then
    ok "crossing_detector loaded via insmod"
  else
    warn "Module load failed, continuing to diagnostics"
  fi
else
  warn "Module artifact not found: $ROOT/$MODULE_ARTIFACT_REL"
  warn "Skipping module install"
fi

echo "== STEP 4: switch mode REAL =="
echo 'MODE=REAL' | sudo tee /etc/default/infight-mode >/dev/null
sudo systemctl daemon-reload
sudo systemctl restart infight-mode.service

echo "== STEP 5: smoke checks =="
"$ROOT/scripts/mode_status.sh" || true

if [[ -e /dev/crossing_detector ]]; then
  ok "/dev/crossing_detector exists"
else
  warn "/dev/crossing_detector is missing"
fi

echo "-- services --"
for svc in inflight-core inflight-server inflight-crossfront; do
  systemctl is-active "$svc" 2>/dev/null || true
done

echo "-- recent crossfront logs --"
sudo journalctl -u inflight-crossfront -n 40 --no-pager || true

echo "-- API check --"
HTTP_CODE="$(curl -sS -m 10 -o /tmp/inflight_api_body.txt -w '%{http_code}' http://127.0.0.1:3001/tournaments/getall || true)"
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "API /tournaments/getall HTTP 200"
else
  warn "API returned HTTP ${HTTP_CODE}"
  head -c 500 /tmp/inflight_api_body.txt || true
  echo
fi

echo "== DONE =="
echo "If sensor still does not react, run: sudo dmesg | tail -n 120"
