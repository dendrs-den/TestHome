# Roadmap - InflightFlow

## M0 (Week 1): Foundation
- Initialize repository structure for `core`, `operator`, `contracts`
- Define domain model and invariant list (timers, scores, round state transitions)
- Define hardware contracts (DMX, sensor) and failure semantics
- Set coding standards, CI, and release conventions

Done when:
- Core service starts with health checks
- Operator shell connects locally to core
- Architecture docs and operational assumptions are signed off

## M1 (Week 2-4): Core engine first
- Implement competition state machine in Go
- Implement durable event journal + snapshot restore
- Implement command validation and idempotency
- Build deterministic timer and scoring services

Done when:
- Full tournament lifecycle runs headless without UI
- Crash/restart restores exact prior state

## M2 (Week 4-6): Hardware reliability layer
- Implement DMX adapter with retry/backoff and fault isolation
- Implement sensor adapter with watchdog and input debouncing rules
- Add real/mock adapter switch with identical contracts
- Validate on Raspberry Pi 5 under stress scenarios

Done when:
- Hardware I/O remains stable under reconnects and restarts
- Error states are recoverable without corrupting competition state

## M3 (Week 6-8): Operator client
- Build Tauri operator app with React UI
- Recreate proven inFight user flows and layouts as functional reference parity
- Integrate realtime state updates from core
- Add password gate for client/service access

Done when:
- Operator can execute full event flow without browser dependency
- UI behavior matches required competition procedures

## M4 (Week 8-9): Hardening and release
- End-to-end reliability tests (including failure injection)
- Operational runbooks (backup/restore, restart, degraded mode)
- Packaging and one-command deployment for Pi 5
- Release candidate and rollback plan

Done when:
- System passes live simulation and recovery drills
- Team can operate event day with documented procedures
