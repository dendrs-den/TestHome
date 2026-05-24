#!/usr/bin/env bash
set -euo pipefail

# inFlight production smoke/stress test for Raspberry Pi
# Usage examples:
#   /home/pi/inFight/scripts/run_tests_prod_pi.sh --repeat 10 --mode safe
#   /home/pi/inFight/scripts/run_tests_prod_pi.sh --repeat 3 --mode full --cross-timeout 25

REPEAT=1
MODE="safe"
CROSS_TIMEOUT=20
BASE_URL="http://127.0.0.1:3001"
EXPECT_REAL_MODE=1
START_MODE="auto_or_manual"
MIN_PASS_RATE=100
ITER_PASS=0
ITER_FAIL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repeat)
      REPEAT="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --cross-timeout)
      CROSS_TIMEOUT="${2:-}"
      shift 2
      ;;
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --start-mode)
      START_MODE="${2:-}"
      shift 2
      ;;
    --allow-mock)
      EXPECT_REAL_MODE=0
      shift
      ;;
    --min-pass-rate)
      MIN_PASS_RATE="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
run_tests_prod_pi.sh

Options:
  --repeat N          Number of iterations (default: 1)
  --mode safe|full    safe = read-only checks; full = start/wait-cross/stop cycle (default: safe)
  --cross-timeout S   Seconds to wait for real crossing in full mode (default: 20)
  --base-url URL      API base URL (default: http://127.0.0.1:3001)
  --start-mode MODE   auto | manual | auto_or_manual (default: auto_or_manual)
  --min-pass-rate N   Accept run if successful iterations rate >= N (default: 100)
  --allow-mock        Do not fail when SERVICE_MODE=1
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 2
      ;;
  esac
done

if ! [[ "$REPEAT" =~ ^[0-9]+$ ]] || [[ "$REPEAT" -lt 1 ]]; then
  echo "Invalid --repeat: $REPEAT (must be >= 1)"
  exit 2
fi

if [[ "$MODE" != "safe" && "$MODE" != "full" ]]; then
  echo "Invalid --mode: $MODE (use safe|full)"
  exit 2
fi

if [[ "$START_MODE" != "auto" && "$START_MODE" != "manual" && "$START_MODE" != "auto_or_manual" ]]; then
  echo "Invalid --start-mode: $START_MODE (use auto|manual|auto_or_manual)"
  exit 2
fi

if ! [[ "$MIN_PASS_RATE" =~ ^[0-9]+$ ]] || [[ "$MIN_PASS_RATE" -lt 0 ]] || [[ "$MIN_PASS_RATE" -gt 100 ]]; then
  echo "Invalid --min-pass-rate: $MIN_PASS_RATE (must be 0..100)"
  exit 2
fi

ROOT="/home/pi/inFight"
REPORT_DIR="$ROOT/reports"
mkdir -p "$REPORT_DIR"
STAMP="$(date +%F_%H-%M-%S)"
REPORT_FILE="$REPORT_DIR/prod_test_${MODE}_${STAMP}.log"

pass=0
fail=0

ok(){ echo "[OK] $*" | tee -a "$REPORT_FILE"; pass=$((pass+1)); }
ko(){ echo "[FAIL] $*" | tee -a "$REPORT_FILE"; fail=$((fail+1)); }
step(){ echo -e "\n== $* ==" | tee -a "$REPORT_FILE"; }

api_get() {
  local path="$1"
  curl -fsS --max-time 8 "$BASE_URL$path"
}

api_post() {
  local path="$1"
  curl -fsS --max-time 12 -X POST -H "Content-Type: application/json" "$BASE_URL$path"
}

api_post_with_status() {
  local path="$1"
  local body_file
  body_file="$(mktemp)"
  local code
  code="$(curl -sS --max-time 15 -X POST -H "Content-Type: application/json" \
    -o "$body_file" -w '%{http_code}' "$BASE_URL$path" || true)"
  if [[ -z "$code" || ! "$code" =~ ^[0-9]{3}$ ]]; then
    code="000"
  fi
  local body
  body="$(cat "$body_file" 2>/dev/null || true)"
  rm -f "$body_file"
  printf "%s\n%s" "$code" "$body"
}

json_field() {
  local path="$1"
  node -e '
const fs=require("fs");
const path=process.argv[1];
const src=fs.readFileSync(0,"utf8");
const obj=JSON.parse(src);
const val=path.split(".").reduce((acc,k)=>acc==null?undefined:acc[k],obj);
if (val===undefined || val===null) process.stdout.write("");
else if (typeof val==="object") process.stdout.write(JSON.stringify(val));
else process.stdout.write(String(val));
' "$path"
}

json_cross_count() {
  node -e '
const fs=require("fs");
const obj=JSON.parse(fs.readFileSync(0,"utf8"));
const arr=obj?.round?.crossings;
process.stdout.write(String(Array.isArray(arr)?arr.length:0));
'
}

wait_for_cross_increment() {
  local baseline="$1"
  local timeout="$2"
  local start_ts
  start_ts="$(date +%s)"
  while true; do
    local info cross_count now
    info="$(api_get "/actions/getinfo" || true)"
    cross_count="$(printf "%s" "$info" | json_cross_count 2>/dev/null || echo 0)"
    if [[ "$cross_count" -gt "$baseline" ]]; then
      echo "$cross_count"
      return 0
    fi
    now="$(date +%s)"
    if (( now - start_ts >= timeout )); then
      return 1
    fi
    sleep 1
  done
}

wait_for_state() {
  local target="$1"
  local timeout="$2"
  local start_ts
  start_ts="$(date +%s)"
  while true; do
    local info cur now
    info="$(api_get "/actions/getinfo" || true)"
    cur="$(printf "%s" "$info" | json_field "state" 2>/dev/null || true)"
    if [[ "$cur" == "$target" ]]; then
      return 0
    fi
    now="$(date +%s)"
    if (( now - start_ts >= timeout )); then
      echo "$cur"
      return 1
    fi
    sleep 1
  done
}

step "inFlight prod test start"
{
  echo "date: $(date -Iseconds)"
  echo "host: $(hostname)"
  echo "mode: $MODE"
  echo "repeat: $REPEAT"
  echo "base_url: $BASE_URL"
  echo "min_pass_rate: $MIN_PASS_RATE"
  echo "report: $REPORT_FILE"
} | tee -a "$REPORT_FILE"

step "precheck"
for svc in inflight-core inflight-server inflight-crossfront; do
  if systemctl is-active "$svc" >/dev/null 2>&1; then ok "$svc active"; else ko "$svc not active"; fi
done

if [[ -c /dev/crossing_detector ]]; then ok "/dev/crossing_detector exists"; else ko "/dev/crossing_detector missing"; fi
if lsmod | grep -q '^crossing_detector'; then ok "crossing_detector module loaded"; else ko "crossing_detector module not loaded"; fi

HTTP_CODE="$(curl -sS -m 8 -o /tmp/inflight_prod_test_api.txt -w '%{http_code}' "$BASE_URL/tournaments/getall" || true)"
if [[ "$HTTP_CODE" == "200" ]]; then ok "GET /tournaments/getall = 200"; else ko "GET /tournaments/getall = $HTTP_CODE"; fi

MODE_STATUS="$("$ROOT/scripts/mode_status.sh" 2>/dev/null || true)"
echo "$MODE_STATUS" >> "$REPORT_FILE"
if [[ $EXPECT_REAL_MODE -eq 1 ]]; then
  if echo "$MODE_STATUS" | grep -q "SERVICE_MODE=0"; then ok "SERVICE_MODE=0 (REAL)"; else ko "SERVICE_MODE is not REAL"; fi
fi

for i in $(seq 1 "$REPEAT"); do
  step "iteration $i/$REPEAT"
  ITERATION_FAILED=0

  INFO="$(api_get "/actions/getinfo" || true)"
  if [[ -z "$INFO" ]]; then
    ko "getinfo empty response"
    ITERATION_FAILED=1
    continue
  fi

  STATE="$(printf "%s" "$INFO" | json_field "state" 2>/dev/null || true)"
  TEAM_NAME="$(printf "%s" "$INFO" | json_field "round.team.name" 2>/dev/null || true)"
  CROSS_COUNT="$(printf "%s" "$INFO" | json_cross_count 2>/dev/null || echo 0)"
  ok "state=$STATE crossings=$CROSS_COUNT team=${TEAM_NAME:-<empty>}"

  if [[ "$MODE" == "safe" ]]; then
    CROSS_LOGS="$(journalctl -u inflight-crossfront --since "-2 min" --no-pager || true)"
    # Treat only hard-failure signatures as critical.
    if printf "%s\n" "$CROSS_LOGS" | grep -qiE "panic|segmentation fault|core dumped|fatal|device open fail|cannot open.*crossing_detector|no such file.*crossing_detector"; then
      ko "crossfront recent logs contain critical error signatures"
      ITERATION_FAILED=1
    elif printf "%s\n" "$CROSS_LOGS" | grep -qiE "error|failed"; then
      # Known noisy line: "ERROR Sending more than 1 response for request..."
      if printf "%s\n" "$CROSS_LOGS" | grep -qiE "sending more than 1 response for request"; then
        ok "crossfront logs contain known non-critical duplicate-response warnings"
      else
        ko "crossfront recent logs contain non-whitelisted error keywords"
        ITERATION_FAILED=1
      fi
    else
      ok "crossfront recent logs have no critical keywords"
    fi
    if [[ "$ITERATION_FAILED" -eq 0 ]]; then
      ITER_PASS=$((ITER_PASS+1))
    else
      ITER_FAIL=$((ITER_FAIL+1))
    fi
    sleep 1
    continue
  fi

  # FULL MODE (changes runtime state). Use only on test tournament/stand.
  STATE_BEFORE="$(printf "%s" "$INFO" | json_field "state" 2>/dev/null || true)"
  if [[ "$STATE_BEFORE" != "Administration" ]]; then
    ADMIN_RESULT="$(api_post_with_status "/actions/setAdministration" || true)"
    ADMIN_CODE="$(printf "%s" "$ADMIN_RESULT" | head -n 1)"
    if [[ "$ADMIN_CODE" =~ ^2 ]]; then
      ok "state set to administration"
      sleep 1
    else
      ko "POST /actions/setAdministration failed (HTTP $ADMIN_CODE)"
      echo "details: $(printf "%s" "$ADMIN_RESULT" | tail -n +2)" | tee -a "$REPORT_FILE"
      ITERATION_FAILED=1
      ITER_FAIL=$((ITER_FAIL+1))
      continue
    fi
  fi

  PREP_RESULT="$(api_post_with_status "/actions/setPrepare" || true)"
  PREP_CODE="$(printf "%s" "$PREP_RESULT" | head -n 1)"
  if [[ "$PREP_CODE" =~ ^2 ]]; then
    ok "state prepare requested"
  else
    ko "POST /actions/setPrepare failed (HTTP $PREP_CODE)"
    echo "details: $(printf "%s" "$PREP_RESULT" | tail -n +2)" | tee -a "$REPORT_FILE"
    ITERATION_FAILED=1
    ITER_FAIL=$((ITER_FAIL+1))
    continue
  fi

  if wait_for_state "Preparation" 8 >/dev/null 2>&1; then
    ok "state reached Preparation"
  else
    CUR_STATE="$(wait_for_state "Preparation" 1 2>/dev/null || true)"
    ko "state did not reach Preparation in time (current=${CUR_STATE:-unknown})"
    ITERATION_FAILED=1
    ITER_FAIL=$((ITER_FAIL+1))
    continue
  fi

  START_RESULT="$(api_post_with_status "/rounds/start" || true)"
  START_CODE="$(printf "%s\n" "$START_RESULT" | head -n 1)"
  START_DETAILS="$(printf "%s\n" "$START_RESULT" | tail -n +2)"
  auto_start_ok=false

  if [[ "$START_MODE" == "manual" ]]; then
    ok "manual start mode: waiting for physical start/cross"
  elif [[ "$START_CODE" =~ ^2 ]]; then
    ok "round start requested (auto)"
    auto_start_ok=true
  else
    if [[ "$START_MODE" == "auto" ]]; then
      ko "POST /rounds/start failed (HTTP $START_CODE)"
      echo "details: ${START_DETAILS}" | tee -a "$REPORT_FILE"
      ITERATION_FAILED=1
      ITER_FAIL=$((ITER_FAIL+1))
      continue
    fi
    ok "auto start unavailable (HTTP $START_CODE), fallback to manual start/cross"
    if [[ -n "$START_DETAILS" ]]; then
      echo "details: ${START_DETAILS}" | tee -a "$REPORT_FILE"
    fi
  fi

  if NEW_CROSS_COUNT="$(wait_for_cross_increment "$CROSS_COUNT" "$CROSS_TIMEOUT")"; then
    ok "cross detected: count $CROSS_COUNT -> $NEW_CROSS_COUNT"
  else
    ko "cross not detected within ${CROSS_TIMEOUT}s (auto_start=$auto_start_ok)"
    ITERATION_FAILED=1
    if [[ "$START_MODE" != "auto" ]]; then
      echo "hint: trigger start/cross physically during timeout window" | tee -a "$REPORT_FILE"
    fi
  fi

  if ! api_post "/rounds/end" >/dev/null 2>&1; then
    ko "POST /rounds/end failed"
    ITERATION_FAILED=1
    ITER_FAIL=$((ITER_FAIL+1))
    continue
  fi
  ok "round end requested"

  sleep 2
  INFO_AFTER="$(api_get "/actions/getinfo" || true)"
  NAME_AFTER="$(printf "%s" "$INFO_AFTER" | json_field "round.team.name" 2>/dev/null || true)"
  RESULT_AFTER="$(printf "%s" "$INFO_AFTER" | json_field "round.time_result" 2>/dev/null || true)"
  if [[ -n "$RESULT_AFTER" && -z "$NAME_AFTER" ]]; then
    ko "result exists but team name is empty"
    ITERATION_FAILED=1
  else
    ok "result/team consistency check passed"
  fi

  if [[ "$ITERATION_FAILED" -eq 0 ]]; then
    ITER_PASS=$((ITER_PASS+1))
  else
    ITER_FAIL=$((ITER_FAIL+1))
  fi
done

step "summary"
ITER_RATE=0
if [[ "$REPEAT" -gt 0 ]]; then
  ITER_RATE=$(( ITER_PASS * 100 / REPEAT ))
fi
ITER_RESULT="FAIL"
if [[ "$ITER_RATE" -ge "$MIN_PASS_RATE" ]]; then
  ITER_RESULT="PASS"
fi
{
  echo "PASS: $pass"
  echo "FAIL: $fail"
  echo "ITER_PASS: $ITER_PASS"
  echo "ITER_FAIL: $ITER_FAIL"
  echo "ITER_PASS_RATE: ${ITER_RATE}%"
  echo "ITER_RESULT(min=${MIN_PASS_RATE}%): $ITER_RESULT"
  if [[ "$ITER_RESULT" == "PASS" ]]; then
    echo "Result: PASS"
  else
    echo "Result: FAIL"
  fi
} | tee -a "$REPORT_FILE"

echo "Saved report: $REPORT_FILE"

if [[ "$ITER_RESULT" != "PASS" ]]; then
  exit 1
fi
