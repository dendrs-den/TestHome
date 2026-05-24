# inFlight DB Migration - 2-Stage Plan (Isolated Network)

## Stage 1: Stabilize Production (No Big Refactor)
Goal: restore predictable work on current stack with minimal risk.

### 1. Runtime baseline
- Lock working runtime artifacts (`core`, `server`, `crossfront`, driver module).
- Store checksums for critical binaries and configs.
- Keep single source of deploy artifacts in repository (`artifacts/` + manifest).

### 2. Hardware baseline
- Keep `crossing_detector` module build script for current kernel.
- Ensure `/dev/crossing_detector` appears after reboot.
- Ensure `inflight-crossfront` is `active` and logs `Success installed reader`.

### 3. Core/API baseline
- Bring up `inflight-core` with currently supported storage path.
- Confirm API health:
- `GET /tournaments/getall`
- round start/stop flow from UI without infinite preloader.

### 4. Operational baseline
- Add one-command smoke test script:
- services status
- device presence
- API response
- last critical logs
- Add rollback checklist (known-good image + runtime restore steps).

### Stage 1 exit criteria
- Sensor works after reboot.
- Core + Server + Crossfront start automatically.
- UI opens without permanent preloader.
- Smoke test passes on demand.

---

## Stage 2: Migrate From Mongo to Embedded SQLite
Goal: remove Mongo runtime fragility and guarantee offline startup on clean Pi without external services.

### 1. DB abstraction in core
- Identify all Mongo access points in `core`.
- Introduce repository interfaces (Tournament, Round, History, DeviceBinding).
- Keep business logic in service layer, not in DB adapters.

### 2. Parallel storage adapters
- Keep `mongo` adapter temporarily (read-only migration window).
- Implement `sqlite` adapter with identical presenter/repository contract.
- Add storage switch via env:
- `STORAGE_BACKEND=mongo|sqlite`

### 3. Migration tooling
- Build export from Mongo to neutral JSON snapshot.
- Build import from snapshot to SQLite.
- Validate record counts and key entities after import.

### 4. Readiness tests
- Command idempotency tests.
- Round timing consistency tests.
- Fault/penalty calculations regression tests.
- Replay tests on real event sequences.

### 5. Cutover
- Dry-run on staging Pi.
- Freeze writes window.
- Final export/import.
- Switch `STORAGE_BACKEND=sqlite`.
- Run smoke + functional tests.

### Stage 2 exit criteria
- Full parity with Mongo behavior on critical flows.
- Stable startup on clean Pi without Mongo-specific runtime issues.
- Documented backup/restore for SQLite (`sqlite3 .backup` + file snapshots).

---

## Offline Constraints (Mandatory)
- No dependency on internet during runtime.
- No dependency on external DB host.
- Install media (USB) must include:
- Core binary
- Frontend server/client build
- Crossing binaries
- Kernel module source/patch + build script
- SQLite DB schema/bootstrap
- Systemd units and mode scripts

---

## Suggested Execution Order
1. Finish Stage 1 and freeze a known-good release tag.
2. Implement SQLite behind feature flag, no immediate production cutover.
3. Cutover only after replay + soak tests pass.
