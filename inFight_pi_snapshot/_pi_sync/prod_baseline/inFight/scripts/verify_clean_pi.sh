#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/pi/inFight"
CORE_CFG="/opt/inflight/core/cmd/app/config.json"
DB_FILE="/opt/inflight/core/cmd/app/data/inflight.db"

pass=0
fail=0

ok(){ echo "[OK] $*"; pass=$((pass+1)); }
ko(){ echo "[FAIL] $*"; fail=$((fail+1)); }

echo "== inFlight verify clean Pi =="
echo "date: $(date -Iseconds)"
echo "host: $(hostname)"

for svc in inflight-core inflight-server inflight-crossfront; do
  if systemctl is-active "$svc" >/dev/null 2>&1; then ok "$svc active"; else ko "$svc not active"; fi
  if systemctl is-enabled "$svc" >/dev/null 2>&1; then ok "$svc enabled"; else ko "$svc not enabled"; fi
done

if [[ -c /dev/crossing_detector ]]; then ok "/dev/crossing_detector exists"; else ko "/dev/crossing_detector missing"; fi
if lsmod | grep -q '^crossing_detector'; then ok "crossing_detector module loaded"; else ko "crossing_detector module not loaded"; fi

if [[ -f "$CORE_CFG" ]]; then
  if grep -q '"storageBackend"[[:space:]]*:[[:space:]]*"sqlite"' "$CORE_CFG"; then ok "storageBackend=sqlite"; else ko "storageBackend is not sqlite"; fi
  if grep -q '"sqlitePath"' "$CORE_CFG"; then ok "sqlitePath present"; else ko "sqlitePath missing"; fi
else
  ko "missing core config: $CORE_CFG"
fi

if [[ -f "$DB_FILE" ]]; then ok "sqlite db file exists"; else ko "sqlite db file missing"; fi

if journalctl -u inflight-core --since "-30 min" --no-pager | grep -Eq "Storage backend sqlite initialized|Storage backend: sqlite"; then
  ok "core logs confirm sqlite init"
elif ss -ltn '( sport = :15000 )' | grep -q ':15000'; then
  ok "core listens on :15000 (sqlite check via config)"
else
  ko "core logs have no sqlite init line"
fi

if journalctl -u inflight-crossfront --since "-30 min" --no-pager | grep -Eq "Success installed reader|Relay init via sysfs"; then
  ok "crossfront reader initialized"
elif systemctl is-active inflight-crossfront >/dev/null 2>&1 && [[ -c /dev/crossing_detector ]]; then
  ok "crossfront active with crossing device"
else
  ko "crossfront init line not found"
fi

HTTP_CODE="$(curl -sS -m 8 -o /tmp/inflight_verify_api.txt -w '%{http_code}' http://127.0.0.1:3001/tournaments/getall || true)"
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "API /tournaments/getall = 200"
else
  ko "API /tournaments/getall HTTP ${HTTP_CODE}"
fi

echo "== summary =="
echo "PASS: $pass"
echo "FAIL: $fail"

if [[ $fail -gt 0 ]]; then
  echo "Result: FAIL"
  exit 1
fi

echo "Result: PASS"
