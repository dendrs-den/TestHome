#!/usr/bin/env bash
set -euo pipefail

MODE_FILE="/etc/default/infight-mode"
ROOT="/home/pi/inFight"

if [[ ! -f "$MODE_FILE" ]]; then
  echo "MODE=MOCK" | sudo tee "$MODE_FILE" >/dev/null
fi

MODE="$(grep -E '^MODE=' "$MODE_FILE" | tail -n1 | cut -d= -f2 | tr -d '[:space:]' || true)"
MODE="${MODE:-MOCK}"

case "$MODE" in
  MOCK|mock)
    echo "[apply_mode] MODE=MOCK"
    bash "$ROOT/scripts/mode_dev_mock.sh"
    ;;
  REAL|real)
    echo "[apply_mode] MODE=REAL"
    bash "$ROOT/scripts/mode_real_hw.sh"
    ;;
  *)
    echo "[apply_mode] Unknown MODE='$MODE'. Expected MOCK or REAL."
    exit 1
    ;;
esac
