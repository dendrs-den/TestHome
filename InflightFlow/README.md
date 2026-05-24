# InflightFlow

InflightFlow is a new tournament control platform built from scratch for maximum stability and fault tolerance on real competition hardware.

`inFight_pi_snapshot` is used as a verified behavior reference (business rules, UI flows, hardware command semantics), not as a migration target.

## Product Direction
- Offline-first local operation on Raspberry Pi 5
- Deterministic core logic with durable event history
- Hardware-safe execution for DMX LED and sensor pipelines
- Operator UX parity with proven inFight flows, improved reliability

## Selected Stack
- Core runtime: Go
- Operator client: Tauri + React + TypeScript
- Local database: SQLite (WAL)
- Optional sync/reporting database: PostgreSQL
- IPC/realtime: gRPC (core APIs) + internal event bus
- Infra: systemd services, Docker for dev tools, GitHub Actions for CI

## Repository Layout
- `apps/core` - Go competition core and domain services
- `apps/operator` - Tauri desktop/kiosk operator client
- `apps/gateway` - optional LAN/API gateway and password gate
- `packages/contracts` - shared API contracts and schemas
- `docs` - architecture, roadmap, operations, decisions
- `infra` - local/devops/runtime configs

## Delivery Stages
1. Foundation and architecture baseline
2. Core engine and hardware adapters
3. Operator client and flow parity
4. Hardening, recovery drills, and release

See [docs/ROADMAP.md](./docs/ROADMAP.md) and [docs/TECH_STACK.md](./docs/TECH_STACK.md).
