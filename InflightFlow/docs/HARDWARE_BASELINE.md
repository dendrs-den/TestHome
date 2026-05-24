# Базовая спецификация железа - InflightFlow

## Фиксированная целевая платформа
- Устройство: Raspberry Pi 5
- Runtime: Linux + systemd
- Режим эксплуатации: offline-first, локальное управление

Примечание по полевому тесту (2026-05-24):
- Валидация выполнена на Raspberry Pi 4 (`Revision c03115`).
- Логика датчика и GPIO-факты ниже подтверждены на этом устройстве.

## Обязательное поведение
- Управление LED через DMX-пайплайн
- Пайплайн входа датчика с надежностью на уровне драйвера
- Детерминированный порядок старта зависимых сервисов

## Подключение датчика и факты runtime (проверено)
- Сигнал датчика: `GPIO17` (нумерация BCM).
- Питание/enable датчика: `GPIO27` должен быть в HIGH в текущем стенде.
- Без `GPIO27=1` события пересечения на `GPIO17` не наблюдаются.
- С `GPIO27=1` фиксируются стабильные `rising/falling` при реальных пересечениях.

Быстрая команда удержания питания/enable:
```bash
gpioset -z --chip gpiochip0 27=1
```

Быстрая проверка сырых GPIO-событий:
```bash
gpiomon --chip gpiochip0 --edges both --format 'line=%o edge=%E ts=%U' 17
```

Диагностический endpoint watchdog (режим `real+gpio`):
```bash
curl http://<pi-ip>:18080/debug/sensor/watchdog
```
Ожидаемые поля:
- `running`: текущее состояние reader
- `restartCount`: счетчик автоперезапусков после сбоев
- `lastError`: текст последней ошибки reader
- `lastEventAt`: время последнего зафиксированного GPIO-события

Endpoint здоровья для панели инструктора:
```bash
curl http://<pi-ip>:18080/v1/instructor/sensor-health
```
Поведение:
- возвращает `OK | WARNING | CRITICAL` с причинами
- возвращает `action` для панели инструктора:
  - `NONE`
  - `CHECK_WIRING`
  - `RESTART_SENSOR`
  - `HOLD_START`
- при `CRITICAL` команда `start_round` блокируется core с ошибкой `sensor_health_critical`

Краткая процедура для инструктора:
- `WARNING + RESTART_SENSOR`: перезапустить процесс/сервис датчика и повторно проверить статус
- `WARNING + CHECK_WIRING`: проверить питание/сигнал/GND и линию питания `GPIO27`
- `CRITICAL + HOLD_START`: не запускать новый раунд до возврата в `OK` или приемлемый `WARNING`

Endpoint готовности для UI инструктора:
```bash
curl http://<pi-ip>:18080/v1/instructor/readiness
```
Возвращает:
- `canStartRound` (`true/false`)
- `health` (тот же payload, что `/v1/instructor/sensor-health`)

Preflight-проверка готовности с судейской консоли:
```bash
curl -X POST http://<pi-ip>:18080/v1/instructor/preflight/run
curl http://<pi-ip>:18080/v1/instructor/preflight/status
```
Поведение:
- `run` запускает асинхронную проверку и защищен от параллельного запуска
- `status` возвращает `running`, `overall` (`pending|pass|fail`) и список шагов

## Модель интеграции core
- Hardware adapters находятся в `apps/core`
- Режимы runtime:
  - `real`: Pi + реальный стек DMX/датчика
  - `mock`: детерминированная симуляция для разработки и CI

## Требования по надежности
- Watchdog для канала данных датчика
- Retry/backoff для записи в DMX-канал
- Timeout и degraded-mode при сбоях железа
- Отсутствие порчи данных при недоступности железа

## Валидационные ворота
- Gate H1: чистый старт и handshake адаптеров на Pi 5
- Gate H2: паритет DMX-выхода с ожидаемой семантикой команд
- Gate H3: целостность событий датчика при reconnect/restart
- Gate H4: recovery drill проходит без ручного ремонта БД

## Примечание по безопасности
- v1: без ролевой модели
- v1: парольная защита доступа к сервису/страницам обязательна
- по умолчанию должны действовать сетевые ограничения площадки
