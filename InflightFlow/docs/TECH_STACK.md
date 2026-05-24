# Tech Stack Decision - InflightFlow

## 1) Engineering goals
- Maximum stability during live competitions
- Fault tolerance and safe recovery after crashes/restarts
- Deterministic scoring/timing behavior with auditable history
- Tight hardware compatibility with Raspberry Pi 5, DMX LED, and sensor drivers
- Minimal external attack surface in venue environments

## 2) Selected architecture

### Core runtime
- Go (single binary service)
- Clear module boundaries: tournament, rounds, timing, actions, hardware adapters
- Command processing with idempotency keys and strict validation

Why:
- Predictable runtime profile and strong reliability for long-running processes
- Easy service management on Linux/systemd
- Good fit for hardware-facing control loops

### Operator client
- Tauri + React + TypeScript
- Kiosk mode on Pi display or trusted operator workstation

Why:
- Keeps familiar UI development model
- Avoids browser-first deployment risks as the primary control surface
- Lower resource footprint than Electron

### Data layer
- SQLite with WAL as primary local store
- Event journal + snapshots for recovery
- Optional PostgreSQL for external analytics/sync

Why:
- Local durability and robust behavior under intermittent network
- Fast restore and replay capabilities

### Hardware integration
- Dedicated Go adapters for:
  - DMX LED control
  - Sensor driver input pipeline
- Real/mock hardware modes with same contracts

Why:
- Clean isolation of unstable I/O edges
- Reproducible tests without physical devices

### Communication and interfaces
- gRPC between operator client and core
- Internal event bus for state updates and telemetry
- Optional gateway for controlled LAN access and remote diagnostics

### Operations
- systemd units with restart policies and dependency ordering
- Structured logs + rotation
- Health/readiness endpoints
- Backup/export jobs

## 3) Security baseline
- v1: no user roles
- v1: page/service access protected by shared password gate
- network restrictions by default (local subnet or allowlist)
- phase 2: per-user auth and audit trails

## 4) Non-goals for v1
- No microservices split
- No Kubernetes
- No cloud dependency for core functionality
- No browser-only operator control path as primary mode

## 5) Decision checkpoints
Re-check after:
- M2 (core + hardware adapters stable)
- M3 (operator flows complete)
