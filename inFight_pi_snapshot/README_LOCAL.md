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

## Быстрый Старт На Чистой Pi
После копирования папки `inFight` в `/home/pi/inFight`:

```bash
chmod +x /home/pi/inFight/scripts/bootstrap_fresh_pi.sh
/home/pi/inFight/scripts/bootstrap_fresh_pi.sh
```

Что делает скрипт:
- ставит системные зависимости и Node.js (если нужно),
- ставит npm-зависимости `local_core_mock`, `server`, `client`,
- собирает frontend,
- создает `systemd` сервисы,
- при наличии real-бинарников автоматически ставит runtime-библиотеки для железа (`SDL2`, `jsoncpp`, OpenSSL-compat),
- включает режимный автозапуск через `infight-mode.service`.

## Режимы После Ребута (Единый Флаг)
Источник режима: `/etc/default/infight-mode`

- `MODE=MOCK`:
- запускает mock-контур (`infight-core-mock` + `infight-web`),
- отключает legacy-прод сервисы.

- `MODE=REAL`:
- отключает mock-контур,
- пытается включить боевые сервисы (`inflight-core`, `inflight-server`, `inflight-crossfront`, `nginx`) если они есть в системе.

Переключить режим:
```bash
echo 'MODE=MOCK' | sudo tee /etc/default/infight-mode
sudo systemctl restart infight-mode.service
```

```bash
echo 'MODE=REAL' | sudo tee /etc/default/infight-mode
sudo systemctl restart infight-mode.service
```

Проверить активный режим и сервисы:
```bash
/home/pi/inFight/scripts/mode_status.sh
```

## Real-Mode Бинарники (обязательно для датчика/железа)
Для `MODE=REAL` в чистой системе нужны бинарники, которых нет в обычном snapshot-коде.

Положи их в:
```text
/home/pi/inFight/artifacts/bins/jsm.crossing-detector-front
/home/pi/inFight/artifacts/bins/jsm.bluetooth              (опционально)
/home/pi/inFight/artifacts/core/main
```

Проверка:
```bash
/home/pi/inFight/scripts/check_real_artifacts.sh
```

Принудительно доустановить runtime-библиотеки для real-режима:
```bash
/home/pi/inFight/scripts/install_real_runtime_deps.sh
```

Если бинарники есть, `bootstrap_fresh_pi.sh` автоматически создаст/подготовит hardware unit-файлы (`inflight-core`, `inflight-crossfront`, `inflight-server`).

## Статус Проверки (2026-05-23)
Проверено на чистой Raspberry Pi OS (Pi 5):
- `inflight-core` active/enabled
- `inflight-server` active/enabled
- `inflight-crossfront` active/enabled
- `/dev/crossing_detector` существует, модуль `crossing_detector` загружен
- API `http://127.0.0.1:3001/tournaments/getall` отвечает `200`
- backend работает на SQLite (`/opt/inflight/core/cmd/app/data/inflight.db`)

Итоговая проверка:
```bash
/home/pi/inFight/scripts/verify_clean_pi.sh
```
Ожидаемый результат: `Result: PASS`.

## Установка В Одну Команду (Windows -> Чистая Pi)
Полный цикл без ручных шагов:
- упаковать проект,
- загрузить на Pi,
- развернуть в `/home/pi/inFight`,
- запустить установку,
- прогнать verify,
- сохранить логи локально в `reports/`.

Команда:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\one_click_clean_pi.ps1
```

Если нужно явно задать режим установки:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\one_click_clean_pi.ps1 -InstallMode online
```

Полезные параметры:
- `-PiHost 192.168.0.177`
- `-PiUser pi`
- `-SshKey C:\Users\Dendr\.ssh\codex_pi`
- `-ProjectRoot D:\TestHome\TestHome\inFight_pi_snapshot`

## Важно Для Следующих Чистых Установок
- Для backend роутов используется единый адрес core:
`CORE_API_URL=http://127.0.0.1:15000`
- В `src_frontend/server/routes/*` не должно оставаться ссылок на `127.0.0.1:15010`.
- Рабочий бинарник датчика сохранен в локальных артефактах:
`artifacts/bins/jsm.crossing-detector-front`

