# Руководство по Bootstrap M0

## Целевая полевая схема
- Raspberry Pi запускает только `apps/core`.
- На Raspberry хранятся:
  - `journal.log`
  - `tournaments.db`
  - конфиг `.env`
  - логи сервиса
- Машины в LAN запускают только клиентские приложения:
  - `apps/operator`
  - `apps/spectator`
- Клиенты подключаются к Raspberry по IP `http://<pi-ip>:18080` и `ws://<pi-ip>:18080/v1/realtime/ws`.

## Local Dev

### Core (Go)
Из `apps/core`:

```bash
go run ./cmd/core
```

Проверка:
- `GET http://localhost:8080/health`

### Operator (dev)
Из `apps/operator`:

```bash
npm install
npm run dev
```

### Spectator (dev)
Из `apps/spectator`:

```bash
npm install
npm run dev
```

## Field Runtime

### Core на Raspberry
Используй бинарный деплой, а не `go run`.

Подготовить release bundle с рабочей машины:

```powershell
.\scripts\deploy_core_to_pi.ps1
```

Подготовить bundle и сразу выгрузить на Raspberry:

```powershell
.\scripts\deploy_core_to_pi.ps1 -Upload
```

Сервис на Raspberry должен публиковаться на `18080` и читать env из `/etc/inflightflow/inflightflow-core.env`.

### Клиенты в LAN
Собрать клиентские приложения:

```powershell
.\scripts\build_lan_clients.ps1
```

При первом запуске `Operator` и `Spectator` просят:
- IP Raspberry
- пароль оператора, если на core включен `OPERATOR_PASSWORD`

## Хранилище Core
- Основной каталог турниров хранится в SQLite:
  - `TOURNAMENTS_DB_PATH=./data/tournaments.db`
- Event journal остается отдельным:
  - `JOURNAL_PATH=./data/journal.log`
- При первом старте новый `core` автоматически импортирует legacy-данные из `tournaments.json`, если БД еще пуста.

## Настройка реального датчика
Для чтения с реального GPIO:

```bash
export CORE_PORT=18080
export HARDWARE_MODE=real
export JOURNAL_PATH=/var/lib/inflightflow/journal.log
export TOURNAMENTS_DB_PATH=/var/lib/inflightflow/tournaments.db
export OPERATOR_PASSWORD_REQUIRED=true
export OPERATOR_PASSWORD=<set-me>
export SENSOR_SOURCE=gpio
export SENSOR_GPIO_CHIP=gpiochip0
export SENSOR_GPIO_LINE=17
export SENSOR_ACTIVE_LOW=false
export SENSOR_DEBOUNCE_MS=15
export SENSOR_REFRACTORY_MS=120
export SENSOR_POWER_ENABLED=true
export SENSOR_POWER_CHIP=gpiochip0
export SENSOR_POWER_LINE=27
export SENSOR_POWER_ACTIVE=true
```

Операционные детали и systemd-путь см. в [SENSOR_RUNBOOK.md](./SENSOR_RUNBOOK.md).
