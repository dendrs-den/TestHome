# Руководство по Bootstrap M0

## Core (Go)
Из `apps/core`:

```bash
go run ./cmd/core
```

Проверка:
- `GET http://localhost:8080/health`

Необязательная защита паролем:
- задать env `OPERATOR_PASSWORD`
- вызывать защищенные endpoint с заголовком `X-Operator-Password`

## Operator (Tauri + React)
Из `apps/operator`:

```bash
npm install
npm run dev
```

Proxy к Core для `operator`:
- По умолчанию auto-режим:
  - локальная машина -> `http://127.0.0.1:8080`
  - Raspberry Pi (linux arm64) -> `http://127.0.0.1:18080`
- Можно принудительно задать через `apps/operator/.env`:

```env
VITE_CORE_PROXY_TARGET=http://127.0.0.1:8080
```

Tauri desktop (нужны Rust + зависимости Tauri):

```bash
npm run build
cargo tauri dev
```

## Docker (dev core + postgres)
Из корня репозитория:

```bash
docker compose -f infra/docker-compose.yml up
```

## Следующий технический шаг
- Ввести command/event model в `apps/core` для state machine турнира.

## Отладка датчика (live)
Запусти core и открой:
- `http://<pi-ip>:8080/debug/sensor`

Доступные debug API:
- `GET /debug/sensor/state` - счетчики и последние sample
- `GET /debug/sensor/stream` - live SSE-поток
- `POST /debug/sensor/sample` - ручная инъекция sample (`{ "level": true|false }`)

Что видно в реальном времени:
- сырые переходы уровня (HIGH/LOW)
- принятые пересечения
- отклоненные sample с причиной (`debounced`, `refractory` и т.д.)

## Настройка реального датчика (подтверждено на стенде)
Для чтения с реального GPIO:

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

Важно:
- В текущей схеме стенда питание/enable датчика нужно удерживать через `GPIO27`:

```bash
gpioset -z --chip gpiochip0 27=1
```

- После этого открой:
  - `http://<pi-ip>:18080/debug/sensor`

См. также: [SENSOR_RUNBOOK.md](./SENSOR_RUNBOOK.md) для запуска и диагностики на реальном железе.
