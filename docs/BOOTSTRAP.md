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

Подтвержденный production layout на стенде:
- бинарник: `/opt/inflightflow/bin/inflightflow-core`
- unit: `/etc/systemd/system/inflightflow-core.service`
- env: `/etc/inflightflow/inflightflow-core.env`
- БД турниров: `/var/lib/inflightflow/tournaments.db`
- journal: `/var/lib/inflightflow/journal.log`
- лог сервиса: `/var/log/inflightflow/core.log`

Текущий рабочий deploy flow:

```powershell
.\scripts\deploy_core_to_pi.ps1 -Upload -Install
```

Этот сценарий:
- собирает свежий бинарник `core`
- выгружает bundle на Raspberry
- выполняет обновление сервиса через helper на Pi
- перезапускает `inflightflow-core.service`

### Клиенты в LAN
Собрать клиентские приложения:

```powershell
.\scripts\build_lan_clients.ps1
```

При первом запуске `Operator` и `Spectator` просят:
- IP Raspberry
- пароль оператора, если на core включен `OPERATOR_PASSWORD`

Локальные launcher-скрипты для разработки:

```powershell
.\scripts\run_operator.ps1
.\scripts\run_spectator.ps1
.\scripts\run_operator_and_spectator.ps1
```

Для запуска Tauri-окон:

```powershell
.\scripts\run_operator.ps1 -Tauri
.\scripts\run_spectator.ps1 -Tauri
.\scripts\run_operator_and_spectator.ps1 -Tauri
```

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

## Подтверждено на 2026-05-29
- `Operator` и `Spectator` подключаются напрямую к Raspberry `core` по LAN.
- `Operator` tournament-flow переведен на новый shell в стиле `Concept A`:
  - локальные шрифты `Sora`, `Manrope`, `IBM Plex Mono`
  - единый центральный shell для `Tournament list` и `Tournament management`
  - правая drawer-панель для `Create / Edit tournament`
- `Tournament management` переведен в `single-round view`:
  - в центре показывается только один выбранный раунд/этап
  - левое меню на этом экране временно заменяется stage-tabs из `currentTour.stages`
  - возврат к `Tournament list` остается через `Back`
- Для локального старта текущей точки разработки `Operator` используются launcher-скрипты:
  - `.\scripts\run_operator.ps1`
  - `.\scripts\run_operator.ps1 -Tauri`
- `Spectator` собран как Tauri desktop app и штатно закрывается через пункт `Выход`.
- `STOP` на судейской панели теперь сохраняет результат заезда в SQLite (`time_result`, `time_real`, `round_start`).
- `NEXT ROUND` в судейской панели:
  - переводит на следующего участника в пределах текущего этапа
  - пропускает уже завершенные заезды с сохраненным результатом
  - показывает сообщение `Раунд завершен`, если участников больше нет
- В списке заездов `Replay` показывается по факту сохраненного результата, а не по `crossings`.
