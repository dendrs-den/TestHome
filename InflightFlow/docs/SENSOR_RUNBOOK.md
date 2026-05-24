# InflightFlow Sensor Runbook

## Known-good hardware mapping
- Sensor signal input: `gpiochip0` line `17`
- Sensor power/enable: `gpiochip0` line `27` set to active (`1`)

## Core env (real mode)
Use these values in `apps/core/.env`:

```env
CORE_PORT=18080
HARDWARE_MODE=real
JOURNAL_PATH=./data/journal.log
SENSOR_SOURCE=gpio
SENSOR_GPIO_CHIP=gpiochip0
SENSOR_GPIO_LINE=17
SENSOR_ACTIVE_LOW=false
SENSOR_DEBOUNCE_MS=15
SENSOR_REFRACTORY_MS=120
SENSOR_HISTORY_LIMIT=200
SENSOR_POWER_ENABLED=true
SENSOR_POWER_CHIP=gpiochip0
SENSOR_POWER_LINE=27
SENSOR_POWER_ACTIVE=true
```

## Manual start
From `apps/core`:

```bash
set -a; source .env; set +a
go run ./cmd/core
```

Open live debug page:
- `http://<pi-ip>:18080/debug/sensor`

## Service install (systemd)
1. Copy unit file:
```bash
sudo cp infra/systemd/inflightflow-core.service /etc/systemd/system/
```
2. Reload and enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable inflightflow-core.service
sudo systemctl restart inflightflow-core.service
```
3. Check status/logs:
```bash
sudo systemctl status inflightflow-core.service --no-pager
journalctl -u inflightflow-core.service -n 200 --no-pager
```

## Fast diagnostics
Check if sensor signal events exist on raw GPIO:

```bash
timeout 20s gpiomon --chip gpiochip0 --edges both --format 'line=%o edge=%E ts=%U' 17
```

If no events:
- verify sensor wiring and shared GND
- verify sensor is powered
- verify `SENSOR_POWER_ENABLED=true` and line `27`
