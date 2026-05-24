# Отчет по drill инструктора

Сформировано: 2026-05-24
Цель: `InflightFlow core на Pi`
Pi: `192.168.0.177:18080`

## Область проверки
Проверка цикла обработки отказа с точки зрения инструктора:
1. нормальная работа
2. отказ reader датчика
3. автоматическое восстановление
4. разрешение запуска нового раунда

## Использованные endpoints
- `GET /v1/instructor/sensor-health`
- `GET /v1/instructor/readiness`
- `POST /v1/domain/command` (guard для `start_round`)
- `GET /debug/sensor/watchdog`

## Шаги и наблюдаемые результаты
1. Базовая проверка (нормальное состояние)
- `sensor-health`: `level=OK`, `action=NONE`
- `readiness`: `canStartRound=true`

2. Имитация отказа reader датчика
- Действие: завершить процесс `gpiomon` на Pi.
- Немедленный результат:
  - `sensor-health`: `level=CRITICAL`, `action=HOLD_START`
  - `readiness`: `canStartRound=false`

3. Проверка guard при CRITICAL
- Действие: отправить команду `start_round`.
- Результат: отклонено с `error=sensor_health_critical`.

4. Проверка авто-восстановления
- Watchdog автоматически перезапускает `gpiomon`.
- В окне недавнего рестарта:
  - `sensor-health`: `level=WARNING`, `action=RESTART_SENSOR`
- После окна стабилизации:
  - `sensor-health`: `level=OK`, `action=NONE`
  - `readiness`: `canStartRound=true`

## Чеклист для инструктора
- Если `CRITICAL/HOLD_START`:
  - не запускать раунд;
  - проверить проводку/питание и линию датчика;
  - дождаться восстановления статуса.
- Если `WARNING/RESTART_SENSOR`:
  - проверить, что процесс датчика восстановился;
  - убедиться, что статус вернулся в `OK` перед критичными заездами.
- Новый раунд запускать только при `canStartRound=true`.

## Критерии приемки
- Сигнализация health работает.
- Жесткий guard на `start_round` работает.
- Путь авто-восстановления возвращает систему в состояние готовности к старту.
