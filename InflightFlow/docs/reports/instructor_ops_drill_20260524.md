# Instructor Ops Drill Report

Generated: 2026-05-24
Target: `InflightFlow core on Pi`
Pi: `192.168.0.177:18080`

## Scope
Validate instructor-facing failure handling loop:
1. normal operation
2. sensor reader failure
3. automatic recovery
4. permission to start new round

## Endpoints Used
- `GET /v1/instructor/sensor-health`
- `GET /v1/instructor/readiness`
- `POST /v1/domain/command` (`start_round` guard behavior)
- `GET /debug/sensor/watchdog`

## Drill Steps and Observed Results
1. Baseline check (normal state)
- `sensor-health`: `level=OK`, `action=NONE`
- `readiness`: `canStartRound=true`

2. Simulate sensor reader failure
- Action: terminate `gpiomon` process on Pi.
- Immediate result:
  - `sensor-health`: `level=CRITICAL`, `action=HOLD_START`
  - `readiness`: `canStartRound=false`

3. Start guard verification under CRITICAL
- Action: send `start_round` command.
- Result: rejected with `error=sensor_health_critical`.

4. Auto-recovery verification
- Watchdog restarts `gpiomon` automatically.
- During recent restart window:
  - `sensor-health`: `level=WARNING`, `action=RESTART_SENSOR`
- After stable window:
  - `sensor-health`: `level=OK`, `action=NONE`
  - `readiness`: `canStartRound=true`

## Instructor Checklist
- If `CRITICAL/HOLD_START`:
  - do not start round;
  - inspect wiring/power and sensor line;
  - wait for status to recover.
- If `WARNING/RESTART_SENSOR`:
  - verify sensor process recovered;
  - confirm state returns to `OK` before critical runs.
- Start new round only when readiness reports `canStartRound=true`.

## Acceptance
- Health signaling works.
- Start-round hard guard works.
- Auto-recovery path returns system to start-ready state.
