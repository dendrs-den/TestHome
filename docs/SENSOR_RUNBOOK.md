# Runbook датчика InflightFlow

## Подтвержденная рабочая распиновка
- Сигнал датчика: `gpiochip0` линия `17`
- Питание/enable датчика: `gpiochip0` линия `27` в активном состоянии (`1`)

## Целевая полевая топология
- Raspberry Pi запускает только `core`
- На Raspberry локально живут:
  - `/var/lib/inflightflow/tournaments.db`
  - `/var/lib/inflightflow/journal.log`
  - `/etc/inflightflow/inflightflow-core.env`
  - `/var/log/inflightflow/core.log`
- `Operator` и `Spectator` работают на других машинах в LAN и подключаются к `http://<pi-ip>:18080`

## Подтвержденный runtime на стенде
- Raspberry: `192.168.0.177`
- systemd service: `inflightflow-core.service`
- binary path: `/opt/inflightflow/bin/inflightflow-core`
- hardware mode: `real`
- sensor source: `gpio`
- sensor line: `gpiochip0:17`
- sensor power line: `gpiochip0:27`

На текущем стенде подтверждено:
- `health` отвечает штатно
- `sensor-health` и `readiness` работают
- физические crossing-события доходят до `core`
- `Operator` и `Spectator` получают realtime-обновления от Raspberry
- `STOP` сохраняет результат заезда в SQLite

## Core env (режим real)
Используй эти значения в `/etc/inflightflow/inflightflow-core.env`:

```env
CORE_PORT=18080
HARDWARE_MODE=real
JOURNAL_PATH=/var/lib/inflightflow/journal.log
TOURNAMENTS_DB_PATH=/var/lib/inflightflow/tournaments.db
OPERATOR_PASSWORD_REQUIRED=true
OPERATOR_PASSWORD=<set-me>
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

## Установка сервиса (systemd)
1. Подготовить release bundle с рабочей машины:
```powershell
.\scripts\deploy_core_to_pi.ps1 -Upload
```
2. На Raspberry выполнить под `sudo`:
```bash
sudo useradd --system --home /opt/inflightflow --shell /usr/sbin/nologin inflightflow || true
sudo install -d -o inflightflow -g inflightflow /opt/inflightflow/bin /opt/inflightflow/core
sudo install -d -o inflightflow -g inflightflow /var/lib/inflightflow /var/log/inflightflow
sudo install -d /etc/inflightflow
sudo cp ~/inflightflow-core.service /etc/systemd/system/inflightflow-core.service
sudo cp ~/inflightflow-core.env.example /etc/inflightflow/inflightflow-core.env
sudo chown -R inflightflow:inflightflow /opt/inflightflow /var/lib/inflightflow /var/log/inflightflow
sudo systemctl daemon-reload
sudo systemctl enable --now inflightflow-core.service
```
3. Проверить статус и логи:
```bash
sudo systemctl status inflightflow-core.service --no-pager
journalctl -u inflightflow-core.service -n 200 --no-pager
```

Примечание по текущей автоматизации:
- обновление `core` со стороны рабочей машины можно выполнять через:

```powershell
.\scripts\deploy_core_to_pi.ps1 -Upload -Install
```

- на Raspberry для этого настроен helper deploy-сценарий, поэтому ручной `go run` больше не используется

## Быстрая диагностика
Проверка сырых событий датчика в GPIO:

```bash
timeout 20s gpiomon --chip gpiochip0 --edges both --format 'line=%o edge=%E ts=%U' 17
```

Проверка health и readiness:

```bash
curl -H "X-Operator-Password: <pass>" http://<pi-ip>:18080/health
curl -H "X-Operator-Password: <pass>" http://<pi-ip>:18080/v1/instructor/sensor-health
curl -H "X-Operator-Password: <pass>" http://<pi-ip>:18080/v1/instructor/readiness
curl -X POST -H "X-Operator-Password: <pass>" http://<pi-ip>:18080/v1/instructor/preflight/run
curl -H "X-Operator-Password: <pass>" http://<pi-ip>:18080/v1/instructor/preflight/status
```

Если событий нет:
- проверить проводку датчика и общий GND
- проверить, что датчик получает питание
- проверить `SENSOR_POWER_ENABLED=true` и линию `27`
- проверить, что сервис стартовал именно из бинарника, а не из старого `go run`

## Операторский сценарий, подтвержденный на 2026-05-29
1. Открыть `Operator` и выбрать турнир/заезд.
2. `ACTIVATE` переводит заезд в подготовленное состояние и ожидает crossing.
3. Первый физический crossing переводит заезд в `running`.
4. `STOP` завершает заезд и сохраняет результат в SQLite.
5. `NEXT ROUND`:
   - берёт следующего участника в текущем этапе
   - пропускает заезды, где уже сохранён `time_result` или `time_real`
   - если участников больше нет, показывает `Раунд завершен`
6. Повторный запуск уже завершённого заезда допускается только через `Replay` в таблице управления турниром.
