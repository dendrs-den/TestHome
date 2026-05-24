# Runbook датчика InflightFlow

## Подтвержденная рабочая распиновка
- Сигнал датчика: `gpiochip0` линия `17`
- Питание/enable датчика: `gpiochip0` линия `27` в активном состоянии (`1`)

## Core env (режим real)
Используй эти значения в `apps/core/.env`:

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

## Ручной запуск
Из `apps/core`:

```bash
set -a; source .env; set +a
go run ./cmd/core
```

Открой live debug страницу:
- `http://<pi-ip>:18080/debug/sensor`

## Установка сервиса (systemd)
1. Скопировать unit-файл:
```bash
sudo cp infra/systemd/inflightflow-core.service /etc/systemd/system/
```
2. Перезагрузить конфиг и включить сервис:
```bash
sudo systemctl daemon-reload
sudo systemctl enable inflightflow-core.service
sudo systemctl restart inflightflow-core.service
```
3. Проверить статус/логи:
```bash
sudo systemctl status inflightflow-core.service --no-pager
journalctl -u inflightflow-core.service -n 200 --no-pager
```

## Быстрая диагностика
Проверка сырых событий датчика в GPIO:

```bash
timeout 20s gpiomon --chip gpiochip0 --edges both --format 'line=%o edge=%E ts=%U' 17
```

Если событий нет:
- проверить проводку датчика и общий GND
- проверить, что датчик получает питание
- проверить `SENSOR_POWER_ENABLED=true` и линию `27`
