# Hardware Baseline - InflightFlow

## Fixed target
- Device: Raspberry Pi 5
- Runtime: Linux + systemd
- Operation mode: offline-first local control

Field test note (2026-05-24):
- Validation was performed on Raspberry Pi 4 (`Revision c03115`).
- Sensor logic and GPIO findings below are validated on this device.

## Mandatory behavior
- LED control through DMX pipeline
- Sensor input pipeline with driver-level reliability
- Deterministic startup ordering for all dependent services

## Sensor wiring and runtime facts (validated)
- Sensor signal line: `GPIO17` (BCM numbering).
- Sensor power/enable control: `GPIO27` must be held HIGH in current bench setup.
- Without `GPIO27=1`, no crossing events are observed on `GPIO17`.
- With `GPIO27=1`, stable `rising/falling` events are observed from physical crossings.

Quick command used to hold sensor power/enable:
```bash
gpioset -z --chip gpiochip0 27=1
```

Quick command used to validate raw GPIO events:
```bash
gpiomon --chip gpiochip0 --edges both --format 'line=%o edge=%E ts=%U' 17
```

Watchdog diagnostic endpoint (core in `real+gpio` mode):
```bash
curl http://<pi-ip>:18080/debug/sensor/watchdog
```
Expected fields:
- `running`: current reader state
- `restartCount`: auto-restart counter after reader failures
- `lastError`: last reader error text
- `lastEventAt`: timestamp of last GPIO edge seen by reader

Instructor panel health endpoint:
```bash
curl http://<pi-ip>:18080/v1/instructor/sensor-health
```
Behavior:
- returns `OK | WARNING | CRITICAL` with reasons
- when health is `CRITICAL`, `start_round` is blocked by core with `sensor_health_critical`

## Core integration model
- Hardware adapters are part of `apps/core`
- Runtime modes:
  - `real`: Pi + actual DMX/sensor stack
  - `mock`: deterministic simulation for development and CI

## Reliability requirements
- Watchdog for sensor data path
- Retry/backoff for DMX channel writes
- Timeout and degraded-mode behavior for hardware failures
- No data corruption when hardware becomes unavailable

## Validation gates
- Gate H1: clean boot and adapter handshake on Pi 5
- Gate H2: DMX output parity with expected command semantics
- Gate H3: sensor event integrity under reconnect/restart
- Gate H4: recovery drill passes without manual DB repair

## Security note
- v1: no roles
- v1: password gate required for service/page access
- venue network restrictions required by default
