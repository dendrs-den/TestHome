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
- Sensor integration:
  - every accepted sensor crossing is forwarded to domain command `accept_crossing`

## Tests added
- Engine happy-path lifecycle test
- Engine invalid finish (<2 crossings) test
- Journal append/replay integrity test

## Next M1 tasks
1. Add idempotency keys for write commands
2. Add command validation schema (strict payload validation)
3. Extend state model with round timing/result fields
4. Add startup bootstrap command flow (create tournament + prepare/start round) profile

- Validated full finish flow on Pi: unning -> completed and repeat finish rejection.
