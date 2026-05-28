# Прогресс M1 - Core Engine

## Что уже реализовано
- Модель доменных команд (`internal/domain/commands`)
- Модель доменных событий (`internal/domain/events`)
- State machine раунда (`internal/domain/engine`) с контролем переходов:
  - create tournament
  - prepare round
  - start round
  - accept crossing
  - finish round (требует >= 2 пересечений)
  - cancel round
- Журнал событий append/replay (`internal/journal`)
- Domain runtime с:
  - восстановлением состояния из журнала при старте
  - обработкой команд с сохранением событий
- API endpoints:
  - `GET /v1/domain/state`
  - `POST /v1/domain/command`
  - `POST /v1/domain/bootstrap`
  - `GET /v1/domain/bootstrap/profiles`
- Интеграция с датчиком:
  - каждое принятое пересечение отправляется как `accept_crossing`
- Идемпотентность API-команд:
  - поддержан `idempotencyKey` в `POST /v1/domain/command`
  - повтор с тем же ключом возвращает кешированный результат без повторного применения

## Добавленные тесты
- Позитивный тест жизненного цикла engine
- Негативный тест finish при <2 пересечениях
- Тест целостности journal append/replay
- Тест восстановления после перезапуска (journal -> state)
- Тест идемпотентности bootstrap
- Тесты резолвера bootstrap-профилей

## Выполнено на этом шаге (2026-05-24)
1. Детерминированный модуль таймера/скоринга
- Добавлен `ComputeRoundResultMs(State)` в `internal/domain/engine/scoring.go`.
- `finish_round` теперь использует отдельный scoring-модуль.
- Правило зафиксировано и покрыто тестами: `result = lastCrossAt - firstCrossAt`, минимум 2 пересечения.

2. Полный headless-тест жизненного цикла
- Добавлен `TestHeadlessTournamentLifecycle`.
- Покрывает `create -> prepare -> start -> crossing -> crossing -> finish`.
- Проверяет конечное состояние `completed` и детерминированный результат.

3. Crash/restart drill-тест
- Добавлен `TestCrashRestartDrillContinueAndFinish`.
- Имитирует сбой после первого пересечения, восстановление из журнала, продолжение и корректное завершение.

## Следующие задачи M1
- Нет открытых задач. M1 закрыт.

## Закрытый долг (2026-05-24)
- Идемпотентность команд теперь сохраняется после перезапуска процесса.
- Реализация:
  - ключи и кешированные результаты idempotency записываются в отдельный dedup-журнал рядом с domain journal;
  - при `Restore()` dedup-индекс восстанавливается вместе с состоянием домена.
- Добавлен тест `TestRuntime_IdempotencyPersistsAfterRestart`.

## Ops drill (one-command)
- Добавлен скрипт: `infra/scripts/m1_ops_drill.ps1`
- Запуск:
  - `powershell -ExecutionPolicy Bypass -File .\infra\scripts\m1_ops_drill.ps1`
- Скрипт выполняет:
  - health check
  - prepare/start нового раунда
  - crossing/crossing/finish
  - restart сервиса на Pi
  - проверку восстановления состояния после restart
- Отчет сохраняется в `docs/reports/m1_ops_drill_*.md`
