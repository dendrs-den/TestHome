#!/usr/bin/env bash
set -euo pipefail

echo "== install real runtime deps =="
OFFLINE_MODE="${OFFLINE_MODE:-0}"
if [[ "${1:-}" == "--offline" ]]; then
  OFFLINE_MODE=1
fi

LDCONFIG_BIN="$(command -v ldconfig || true)"
if [[ -z "$LDCONFIG_BIN" && -x /sbin/ldconfig ]]; then
  LDCONFIG_BIN="/sbin/ldconfig"
fi
if [[ -z "$LDCONFIG_BIN" ]]; then
  echo "[deps] ldconfig not found, fallback to package install without cache checks"
fi

need_install=()

if [[ -z "$LDCONFIG_BIN" ]] || ! "$LDCONFIG_BIN" -p | grep -q 'libSDL2-2.0.so.0'; then
  need_install+=("libsdl2-2.0-0")
fi

if [[ -z "$LDCONFIG_BIN" ]] || ! "$LDCONFIG_BIN" -p | grep -q 'libjsoncpp.so.24'; then
  if [[ -z "$LDCONFIG_BIN" ]] || ! "$LDCONFIG_BIN" -p | grep -q 'libjsoncpp.so.26'; then
    need_install+=("libjsoncpp26")
  fi
fi

if [[ ${#need_install[@]} -gt 0 ]]; then
  if [[ "$OFFLINE_MODE" -eq 1 ]]; then
    echo "[deps] OFFLINE mode: missing libs: ${need_install[*]}"
    echo "[deps] install them in base image or local apt mirror before REAL mode."
  else
    echo "[deps] apt install: ${need_install[*]}"
    sudo apt-get update -y
    sudo apt-get install -y "${need_install[@]}"
  fi
fi

# Compatibility symlink for binaries linked against libjsoncpp.so.24.
if [[ -n "$LDCONFIG_BIN" ]] && ! "$LDCONFIG_BIN" -p | grep -q 'libjsoncpp.so.24' && "$LDCONFIG_BIN" -p | grep -q 'libjsoncpp.so.26'; then
  JSONCPP26="$("$LDCONFIG_BIN" -p | awk '/libjsoncpp.so.26/{print $NF; exit}')"
  if [[ -n "${JSONCPP26:-}" ]]; then
    sudo ln -sf "$JSONCPP26" /usr/lib/aarch64-linux-gnu/libjsoncpp.so.24
    echo "[deps] created compat symlink libjsoncpp.so.24 -> $JSONCPP26"
  fi
fi

# OpenSSL 1.1 compat (for legacy jsm.bluetooth binary).
if [[ -z "$LDCONFIG_BIN" ]] || ! "$LDCONFIG_BIN" -p | grep -q 'libssl.so.1.1'; then
  if [[ "$OFFLINE_MODE" -eq 1 ]]; then
    echo "[deps] OFFLINE mode: libssl.so.1.1 missing, cannot fetch from internet."
  else
    echo "[deps] libssl.so.1.1 missing, trying bullseye compat repo"
    echo "deb http://deb.debian.org/debian bullseye main" | sudo tee /etc/apt/sources.list.d/inflight-bullseye-compat.list >/dev/null
    sudo apt-get update -y || true
    sudo apt-get install -y -t bullseye libssl1.1 || true
  fi
fi

if [[ -n "$LDCONFIG_BIN" ]]; then
  sudo "$LDCONFIG_BIN"
fi

echo "== runtime deps status =="
if [[ -n "$LDCONFIG_BIN" ]]; then
  "$LDCONFIG_BIN" -p | grep -E 'libSDL2-2.0.so.0|libjsoncpp.so.24|libjsoncpp.so.26|libssl.so.1.1|libcrypto.so.1.1' || true
fi
