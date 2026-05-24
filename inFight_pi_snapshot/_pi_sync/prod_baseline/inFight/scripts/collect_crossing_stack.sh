#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-$HOME/crossing_stack_$(date +%Y%m%d_%H%M%S)}"
mkdir -p "$OUT_DIR"

echo "[collect] output: $OUT_DIR"

{
  echo "date: $(date -Is)"
  echo "hostname: $(hostname)"
  echo "uname: $(uname -a)"
} > "$OUT_DIR/system.txt"

{
  echo "== /dev/crossing_detector =="
  ls -la /dev/crossing_detector 2>&1 || true
  echo
  echo "== udevadm =="
  udevadm info -a -n /dev/crossing_detector 2>&1 || true
} > "$OUT_DIR/device_info.txt"

lsmod > "$OUT_DIR/lsmod.txt" || true
systemctl list-unit-files > "$OUT_DIR/systemd_unit_files.txt" || true
systemctl list-units --type=service --all > "$OUT_DIR/systemd_services.txt" || true
dmesg > "$OUT_DIR/dmesg_full.txt" || true
dmesg | grep -Ei "cross|gpio|driver|module|rp1|bluetooth" > "$OUT_DIR/dmesg_filtered.txt" || true

mkdir -p "$OUT_DIR/etc_systemd" "$OUT_DIR/etc_modules" "$OUT_DIR/etc_udev" "$OUT_DIR/opt_inflight_bins" "$OUT_DIR/lib_modules"

cp -a /etc/systemd/system "$OUT_DIR/etc_systemd/" 2>/dev/null || true
cp -a /etc/modules "$OUT_DIR/etc_modules/" 2>/dev/null || true
cp -a /etc/modules-load.d "$OUT_DIR/etc_modules/" 2>/dev/null || true
cp -a /etc/udev/rules.d "$OUT_DIR/etc_udev/" 2>/dev/null || true
cp -a /lib/udev/rules.d "$OUT_DIR/etc_udev/" 2>/dev/null || true

cp -a /opt/inflight/bins "$OUT_DIR/opt_inflight_bins/" 2>/dev/null || true

KVER="$(uname -r)"
find "/lib/modules/$KVER" -type f | grep -Ei "cross|gpio|rp1|bluetooth|detector" > "$OUT_DIR/module_candidates.txt" || true
while IFS= read -r mod; do
  dst="$OUT_DIR/lib_modules/${mod#/lib/modules/$KVER/}"
  mkdir -p "$(dirname "$dst")"
  cp -a "$mod" "$dst" 2>/dev/null || true
done < "$OUT_DIR/module_candidates.txt"

tar -czf "${OUT_DIR}.tar.gz" -C "$(dirname "$OUT_DIR")" "$(basename "$OUT_DIR")"
echo "[collect] created: ${OUT_DIR}.tar.gz"
