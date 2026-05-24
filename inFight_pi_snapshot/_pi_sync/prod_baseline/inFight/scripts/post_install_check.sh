#!/usr/bin/env bash
set -euo pipefail

SERVER_ROOT="/home/pi/inFight/src_frontend/server"
SERVER_ENV="$SERVER_ROOT/.env"

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*"; exit 1; }

echo "== inFight post-install check =="

if [[ ! -d "$SERVER_ROOT" ]]; then
  fail "Server root not found: $SERVER_ROOT"
fi
ok "Server root exists: $SERVER_ROOT"

if [[ -f "$SERVER_ENV" ]]; then
  CORE_API_URL_LINE="$(grep -E '^CORE_API_URL=' "$SERVER_ENV" || true)"
  if [[ -z "$CORE_API_URL_LINE" ]]; then
    fail "CORE_API_URL is missing in $SERVER_ENV"
  fi
  echo "CORE_API_URL: ${CORE_API_URL_LINE#CORE_API_URL=}"
else
  fail ".env not found: $SERVER_ENV"
fi

if grep -RIn "http://127.0.0.1:15010\|http://localhost:15010\|http://192.168.*:15010" "$SERVER_ROOT/routes" >/dev/null 2>&1; then
  grep -RIn "http://127.0.0.1:15010\|http://localhost:15010\|http://192.168.*:15010" "$SERVER_ROOT/routes" || true
  fail "Found stale API endpoint references to port 15010 in server routes"
fi
ok "No stale 15010 references in routes"

for svc in infight-core-mock infight-web; do
  if systemctl is-enabled "$svc" >/dev/null 2>&1; then
    ok "$svc is enabled"
  else
    warn "$svc is not enabled"
  fi

  if systemctl is-active "$svc" >/dev/null 2>&1; then
    ok "$svc is active"
  else
    warn "$svc is not active"
  fi
done

HTTP_CODE="$(curl -sS -o /tmp/infight_health_body.txt -w "%{http_code}" http://127.0.0.1:3001/tournaments/getall || true)"
if [[ "$HTTP_CODE" != "200" ]]; then
  cat /tmp/infight_health_body.txt || true
  fail "API health check failed: GET /tournaments/getall returned HTTP $HTTP_CODE"
fi
ok "API health check passed: /tournaments/getall"

echo "== summary =="
echo "System looks healthy for inFight dev startup."
