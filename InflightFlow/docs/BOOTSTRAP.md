# M0 Bootstrap Guide

## Core (Go)
From `apps/core`:

```bash
go run ./cmd/core
```

Check:
- `GET http://localhost:8080/health`

Optional password protection:
- set `OPERATOR_PASSWORD` env
- call protected endpoints with header `X-Operator-Password`

## Operator (Tauri + React)
From `apps/operator`:

```bash
npm install
npm run dev
```

Tauri desktop (requires Rust + Tauri prerequisites):

```bash
npm run build
cargo tauri dev
```

## Docker (dev core + postgres)
From repository root:

```bash
docker compose -f infra/docker-compose.yml up
```

## Next technical step
- Introduce command/event model in `apps/core` for tournament state machine.

## Sensor debug (live)
Run core and open:
- `http://<pi-ip>:8080/debug/sensor`

Available debug APIs:
- `GET /debug/sensor/state` - counters and recent samples
- `GET /debug/sensor/stream` - SSE live stream
- `POST /debug/sensor/sample` - inject sample manually (`{ "level": true|false }`)

What you can see in real time:
- raw level transitions (HIGH/LOW)
- accepted crossings
- rejected samples with reason (`debounced`, `refractory`, etc.)

## Real sensor setup (validated on bench)
For real hardware stream from GPIO:

```bash
export CORE_PORT=18080
export HARDWARE_MODE=real
export SENSOR_SOURCE=gpio
export SENSOR_GPIO_CHIP=gpiochip0
export SENSOR_GPIO_LINE=17
export SENSOR_ACTIVE_LOW=false
export SENSOR_DEBOUNCE_MS=15
export SENSOR_REFRACTORY_MS=120
go run ./cmd/core
```

Important:
- In current bench wiring, sensor power/enable must be held via GPIO27:

```bash
gpioset -z --chip gpiochip0 27=1
```

- Then open:
  - `http://<pi-ip>:18080/debug/sensor`

See also: [SENSOR_RUNBOOK.md](./SENSOR_RUNBOOK.md) for real hardware startup and diagnostics.
