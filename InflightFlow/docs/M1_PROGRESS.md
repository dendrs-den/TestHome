# M1 Progress - Core Engine

## Implemented now
- Domain command model (`internal/domain/commands`)
- Domain event model (`internal/domain/events`)
- Round state machine (`internal/domain/engine`) with guarded transitions:
  - create tournament
  - prepare round
  - start round
  - accept crossing
  - finish round (requires >= 2 crossings)
  - cancel round
- Event journal append/replay (`internal/journal`)
- Domain runtime with:
  - restore state from journal on startup
  - command handling with event persistence
- API endpoints:
  - `GET /v1/domain/state`
  - `POST /v1/domain/command`
  - `POST /v1/domain/bootstrap`
  - `GET /v1/domain/bootstrap/profiles`
- Sensor integration:
  - every accepted sensor crossing is forwarded to domain command `accept_crossing`
- Idempotency for API commands:
  - `idempotencyKey` supported in `POST /v1/domain/command`
  - duplicate key returns cached result without re-applying command

## Tests added
- Engine happy-path lifecycle test
- Engine invalid finish (<2 crossings) test
- Journal append/replay integrity test
- Restore-after-restart replay test (journal -> state)
- Bootstrap idempotency test
- Bootstrap profile resolver tests

## Completed in this step (2026-05-24)
1. Deterministic timer/scoring module
- Added `ComputeRoundResultMs(State)` in `internal/domain/engine/scoring.go`.
- `finish_round` now uses scoring module, not inline math.
- Rule fixed and test-covered: result is `lastCrossAt - firstCrossAt`, min 2 crossings.

2. Full headless lifecycle test
- Added `TestHeadlessTournamentLifecycle`.
- Covers `create -> prepare -> start -> crossing -> crossing -> finish`.
- Verifies terminal state is `completed` and result is deterministic.

3. Crash/restart drill test
- Added `TestCrashRestartDrillContinueAndFinish`.
- Simulates crash after first crossing, restores from journal, continues round, finishes, and verifies final result.

## Next M1 tasks
1. Persist idempotency records beyond process restart
2. Add one-command local drill script for ops runbook
