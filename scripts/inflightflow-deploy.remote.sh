#!/usr/bin/env bash
set -euo pipefail

STAGE_DIR="${1:-/home/flow/inflightflow-upload}"
SERVICE_NAME="inflightflow-core.service"
APP_USER="inflightflow"
APP_GROUP="inflightflow"

install -d /opt/inflightflow/bin /opt/inflightflow/core /opt/inflightflow/releases
install -d /var/lib/inflightflow /var/log/inflightflow /etc/inflightflow

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home /opt/inflightflow --shell /usr/sbin/nologin "$APP_USER"
fi

for group in gpio dialout i2c spi video render input plugdev; do
  if getent group "$group" >/dev/null 2>&1; then
    usermod -a -G "$group" "$APP_USER"
  fi
done

if [[ -f /home/flow/InflightFlow/apps/core/data/journal.log ]] && [[ ! -f /var/lib/inflightflow/journal.log ]]; then
  cp /home/flow/InflightFlow/apps/core/data/journal.log /var/lib/inflightflow/journal.log
fi

for suffix in "" "-wal" "-shm"; do
  src="/home/flow/InflightFlow/apps/core/data/tournaments.db${suffix}"
  dst="/var/lib/inflightflow/tournaments.db${suffix}"
  if [[ -f "$src" ]] && [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
  fi
done

if [[ -f /home/flow/InflightFlow/apps/core/data/journal.log.dedup.log ]] && [[ ! -f /var/lib/inflightflow/journal.log.dedup.log ]]; then
  cp /home/flow/InflightFlow/apps/core/data/journal.log.dedup.log /var/lib/inflightflow/journal.log.dedup.log
fi

install -m 0755 "$STAGE_DIR/inflightflow-core" /opt/inflightflow/bin/inflightflow-core

if [[ -f "$STAGE_DIR/inflightflow-core.service" ]]; then
  install -m 0644 "$STAGE_DIR/inflightflow-core.service" "/etc/systemd/system/$SERVICE_NAME"
fi

if [[ ! -f /etc/inflightflow/inflightflow-core.env ]]; then
  if [[ -f "$STAGE_DIR/inflightflow-core.env" ]]; then
    install -m 0640 "$STAGE_DIR/inflightflow-core.env" /etc/inflightflow/inflightflow-core.env
  elif [[ -f "$STAGE_DIR/inflightflow-core.env.example" ]]; then
    install -m 0640 "$STAGE_DIR/inflightflow-core.env.example" /etc/inflightflow/inflightflow-core.env
  fi
fi

chown -R "$APP_USER:$APP_GROUP" /opt/inflightflow/core /var/lib/inflightflow /var/log/inflightflow

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" -n 20 || true
