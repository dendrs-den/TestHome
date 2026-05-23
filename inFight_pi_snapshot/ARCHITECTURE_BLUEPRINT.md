# inflight Architecture Blueprint (Pi-first)

## 1. Goals
- Stable timing and deterministic round results.
- Single source of truth for state, time, faults, and crossings.
- Safe work without hardware (service/simulator mode) with same business logic.
- Predictable recovery after restart/reboot.

## 2. High-Level Architecture

### 2.1 Runtime components on Raspberry Pi
- `inflight-core` (Go): state machine + command handling + event journal + read model.
- `inflight-adapter-sensor` (Go): sensor/controller input -> normalized domain events.
- `inflight-adapter-bluetooth` (Go): remote commands/fault signals -> normalized events.
- `inflight-adapter-led` (Go): DMX output based on core state stream.
- `inflight-ui-server` (Node static server or nginx): serves Terminal/Infoboard/Scoreboard.
- `inflight-sync` (optional): export/import snapshots and backups.

### 2.2 Data flow
1. UI sends command to `core` (`Activate`, `AddBust`, `StopRound`, `NextRound`).
2. Core validates command using strict state machine.
3. Core appends accepted command result as domain event in SQLite journal.
4. Core updates read model (current state, round view, history).
5. Core broadcasts state update to all UIs via WebSocket/SSE.
6. Adapters subscribe to state updates and perform I/O (LED, hardware).

## 3. Domain Model

### 3.1 Aggregate roots
- `Tournament`
- `RoundSession` (active run)
- `DeviceBinding`

### 3.2 Main events (append-only)
- `TournamentSetCurrent`
- `RoundSelected`
- `RoundActivated`
- `FirstCrossDetected`
- `CrossDetected`
- `FaultAdded` (`bust`/`skip`)
- `RoundStopped`
- `RoundSaved`
- `RoundMovedNext`
- `StateChanged`

Each event contains:
- `event_id` (UUID)
- `aggregate_id`
- `event_type`
- `payload` (JSON)
- `created_at_utc`
- `monotonic_offset_ms`
- `causation_id` / `correlation_id`

### 3.3 Commands (idempotent)
- `command_id` is mandatory.
- Repeated `command_id` must return previously computed result, not re-apply side effects.

## 4. Timing Rules
- Core uses monotonic clock (`CLOCK_MONOTONIC`) for all round calculations.
- `fact_time` is derived only in core.
- `result_time` is derived only in core from `fact_time + penalties`.
- UI timer is display-only and syncs from core checkpoints.
- Stop action uses core timestamp at command receive moment, not UI frame time.

## 5. Storage
- SQLite (WAL mode).
- Tables:
  - `events`
  - `read_current_state`
  - `read_current_round`
  - `read_tournament`
  - `read_history`
  - `device_registry`
- Startup:
  1. Load last snapshot/read model.
  2. Replay unapplied events.
  3. Publish current state to stream.

## 6. API Contract

### 6.1 Command API (REST)
- `POST /api/v1/commands/activate`
- `POST /api/v1/commands/cross`
- `POST /api/v1/commands/fault`
- `POST /api/v1/commands/stop`
- `POST /api/v1/commands/next`
- `POST /api/v1/commands/set-round`

Response:
- `accepted: true|false`
- `reason` when rejected
- `state_version`

### 6.2 Query API
- `GET /api/v1/state` (single snapshot)
- `GET /api/v1/tournament/current`
- `GET /api/v1/round/current`
- `GET /api/v1/history`

### 6.3 Stream API
- `GET /api/v1/stream` (SSE) or `WS /api/v1/ws`
- Emits compact state patches and domain events.

## 7. UI Principles
- Terminal and Infoboard are thin clients.
- No business logic calculation in UI.
- No direct DB semantics in UI.
- Any temporary network/API failure should show stale state + reconnect, never crash.

## 8. Service Mode (No Hardware)
- Service mode is an adapter profile, not separate business flow.
- `sensor adapter` replaced by `simulator adapter`.
- Same commands/events/state transitions as production.
- Feature toggle:
  - `SERVICE_MODE=1` enables simulator adapter startup.
  - UI shows service badge but behavior is otherwise identical.

## 9. Reliability & Operations
- `systemd` units:
  - `inflight-core.service`
  - `inflight-adapter-sensor.service`
  - `inflight-adapter-led.service`
  - `inflight-ui.service`
- `Restart=always`, `RestartSec=1`, watchdog heartbeat.
- Health:
  - `/health/live`
  - `/health/ready`
- Backups:
  - nightly SQLite backup + event export.

## 10. Test Strategy
- Unit: state transitions and penalty calculations.
- Property tests: ordering/idempotency invariants.
- Integration: command -> event -> read model -> stream.
- Replay tests: known problematic logs (`bust spam`, stop jitter, race cases).
- Soak tests on Pi with simulator for multi-hour runs.

## 11. Incremental Migration Plan

### Phase 0: Stabilize current code (1-2 days)
- Keep current frontend.
- Add defensive fetch wrappers and socket subscription cleanup (already started).
- Lock service mode behavior to first-cross start.

### Phase 1: Core façade (3-5 days)
- Introduce `core-gateway` API layer with stable contracts (`/api/v1/...`).
- Existing Node routes call gateway instead of mixed direct flows.

### Phase 2: Event journal + read model (5-8 days)
- Implement append-only event table in SQLite.
- Compute round results only inside core.
- Move previous-result battle logic to server read model.

### Phase 3: Adapter split (4-7 days)
- Separate sensor/bluetooth/LED into adapters.
- Add simulator adapter with same event API.

### Phase 4: UI simplification (4-6 days)
- Replace ad-hoc UI recomputations with state stream rendering.
- Remove duplicate API calls in hot loops.

### Phase 5: Hardening (3-5 days)
- Replay regression suite.
- Soak tests on Pi.
- Backup/restore verification.

## 12. Repository Structure (target)
```text
inflight/
  core/
    cmd/core
    internal/domain
    internal/state
    internal/storage/sqlite
    internal/api
  adapters/
    sensor/
    bluetooth/
    led_dmx/
    simulator/
  ui/
    terminal/
    infoboard/
    shared/
  deploy/
    systemd/
    nginx/
    scripts/
  docs/
    ARCHITECTURE_BLUEPRINT.md
    EVENT_SCHEMA.md
    API_CONTRACT.md
```

## 13. Non-Negotiable Rules
- Core is the only place where time/result are finalized.
- All command handlers are idempotent.
- UI never mutates state directly.
- Every critical action is event-logged.
- Service mode and production mode share the same state machine.
