#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/pi/inFight"
REPORT_DIR="${ROOT}/reports"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="${REPORT_DIR}/install_clean_pi_${STAMP}.log"
INSTALL_MODE="${INSTALL_MODE:-auto}" # auto|online|offline

mkdir -p "$REPORT_DIR"

log() { echo "$*" | tee -a "$REPORT_FILE"; }
fail() { log "[FAIL] $*"; exit 1; }

log "== inFlight clean Pi install =="
log "date: $(date -Iseconds)"
log "host: $(hostname)"
log "kernel: $(uname -r)"
log "install_mode: ${INSTALL_MODE}"

cd "$ROOT" || fail "missing project dir: $ROOT"
chmod +x scripts/*.sh || true

BOOTSTRAP_ARG=""
case "$INSTALL_MODE" in
  offline)
    BOOTSTRAP_ARG="--offline"
    ;;
  online)
    BOOTSTRAP_ARG=""
    ;;
  auto)
    if command -v node >/dev/null 2>&1; then
      BOOTSTRAP_ARG="--offline"
      log "[info] node already present -> offline bootstrap"
    else
      BOOTSTRAP_ARG=""
      log "[info] node missing -> online bootstrap"
    fi
    ;;
  *)
    fail "unknown INSTALL_MODE='$INSTALL_MODE' (use auto|online|offline)"
    ;;
esac

log "[1/4] bootstrap ${BOOTSTRAP_ARG:-online}"
./scripts/bootstrap_fresh_pi.sh ${BOOTSTRAP_ARG} 2>&1 | tee -a "$REPORT_FILE"

log "[2/4] install + switch REAL"
./scripts/offline_real_install.sh 2>&1 | tee -a "$REPORT_FILE"

log "[3/4] verify"
./scripts/verify_clean_pi.sh 2>&1 | tee -a "$REPORT_FILE"

log "[4/4] done"
log "report: $REPORT_FILE"