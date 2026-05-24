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

## Tests added
- Engine happy-path lifecycle test
- Engine invalid finish (<2 crossings) test
- Journal append/replay integrity test

## Next M1 tasks
1. Wire sensor accepted events into engine command `accept_crossing`
2. Persist all domain events to journal in runtime
3. Build restore path from journal on startup
4. Add API endpoints for command submission and current state
