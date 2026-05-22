# inflight Local Workspace

Локальный снимок проекта с Raspberry Pi хранится в этой папке.

## Что перенесено
- `src_frontend/` — исходники из `~/src/frontend` (основная dev-ветка)
- `deploy_frontend/` — прод-копия из `/opt/inflight/frontend`
- `deploy_core/` — core из `/opt/inflight/core`
- `configs/` — nginx + systemd unit-файлы + снимок окружения Pi
- `manifest.json` — метаданные переноса

## Быстрый старт (Windows)
1. Установить Node.js (проверено на v24.15.0 и v16.x).
2. Выполнить bootstrap:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap_local.ps1
```
3. Запуск backend:
```powershell
cd .\src_frontend\server
npm start
```
4. В новом окне запуск frontend:
```powershell
cd .\src_frontend\client
npm start
```
5. Открыть `http://localhost:3000`.

## Запуск Одной Командой
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_all.ps1
```

Остановка:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop_all.ps1
```

## Автотесты Локальной Логики
- Полный локальный прогон (поднимет mock core + backend, выполнит тесты и остановит процессы):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_tests_local.ps1
```

- Несколько прогонов подряд:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_tests_local.ps1 -Repeat 10
```

- Что запускается внутри:
- `scripts/smoke-tests-local.js` — smoke-проверка ключевых API-сценариев.
- `scripts/session-timer-consistency-test.js` — сессия с рандомными `cross/bust/skip` и сверкой системного времени с `fact_time`.

- Настройка допуска по времени:
- По умолчанию `tolerance_ms = 10`.
- Переопределение:
```powershell
$env:SESSION_TEST_TOLERANCE_MS=20
powershell -ExecutionPolicy Bypass -File .\scripts\run_tests_local.ps1
```

## Проверка API
- Frontend проксирует запросы на `http://127.0.0.1:3001`.
- Убедись, что backend поднят на 3001 до запуска клиента.

## Важно
- Проект на Pi называется `inflight`.
- Для реального прод-развертывания смотри `configs/` и `configs/environment_snapshot.txt`.
- В локальной среде используется `sass` вместо устаревшего `node-sass` для совместимости с современными версиями Node.js.

