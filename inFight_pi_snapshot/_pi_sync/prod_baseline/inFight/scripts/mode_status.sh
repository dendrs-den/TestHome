#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/home/pi/inFight/src_frontend/server/.env"

echo "== inFight mode status =="
if [[ -f "$ENV_FILE" ]]; then
  grep -E 'CORE_API_URL|SERVICE_MODE' "$ENV_FILE" || true
else
  echo ".env not found: $ENV_FILE"
fi

echo "--- active services ---"
for svc in infight-core-mock infight-web inflight-core inflight-server inflight-crossfront nginx; do
  load_state="$(systemctl show -p LoadState --value "${svc}.service" 2>/dev/null || echo not-found)"
  if [[ "$load_state" == "not-found" ]]; then
    printf "%-24s %s\n" "$svc" "missing"
  else
    active_state="$(systemctl is-active "${svc}.service" 2>/dev/null || true)"
    printf "%-24s %s\n" "$svc" "$active_state"
  fi
done
