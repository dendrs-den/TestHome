#!/usr/bin/env bash
set -euo pipefail

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*"; exit 1; }

echo "== inFlight Stage1 Smoke Check =="
echo "host: $(hostname)"
echo "kernel: $(uname -r)"

required_services=(
  inflight-core
  inflight-server
  inflight-crossfront
)

for svc in "${required_services[@]}"; do
  if systemctl is-enabled "$svc" >/dev/null 2>&1; then
    ok "$svc enabled"
  else
    warn "$svc not enabled"
  fi

  if systemctl is-active "$svc" >/dev/null 2>&1; then
    ok "$svc active"
  else
    warn "$svc not active"
  fi
done

if lsmod | grep -q '^crossing_detector'; then
  ok "kernel module crossing_detector loaded"
else
  warn "kernel module crossing_detector not loaded"
fi

if [[ -c /dev/crossing_detector ]]; then
  ok "/dev/crossing_detector exists"
else
  warn "/dev/crossing_detector missing"
fi

if journalctl -u inflight-crossfront -n 80 --no-pager | grep -q "Success installed reader"; then
  ok "crossfront reader initialized"
else
  warn "crossfront reader init line not found in recent logs"
fi

HTTP_CODE="$(curl --max-time 10 -sS -o /tmp/inflight_api_body.txt -w "%{http_code}" http://127.0.0.1:3001/tournaments/getall || true)"
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "API /tournaments/getall is reachable (200)"
else
  warn "API /tournaments/getall returned HTTP $HTTP_CODE"
fi

if systemctl is-active mongod >/dev/null 2>&1; then
  ok "mongod active"
else
  warn "mongod inactive/failed"
fi

echo "== quick status =="
systemctl --no-pager --full status inflight-core inflight-server inflight-crossfront mongod 2>/dev/null | sed -n '1,120p' || true
echo "== done =="
