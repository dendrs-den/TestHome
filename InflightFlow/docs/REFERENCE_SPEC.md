# Reference Specification - inFight -> InflightFlow

`inFight_pi_snapshot` is a behavior reference source for InflightFlow.

## What we reuse as reference
- Tournament domain rules and state transitions
- Timing/scoring behavior
- Operator workflows and screen sequence
- Hardware command semantics for DMX and sensor pipeline

## What we do not reuse directly
- Legacy server/runtime structure
- Legacy transport choices (for example, longpoll)
- Legacy packaging and deployment scripts as-is

## Reference extraction tracks

### R0 - Domain behavior reference
Source:
- `src_frontend/server/routes/tournaments.js`
- `src_frontend/server/routes/stages.js`
- `src_frontend/server/routes/rounds.js`
- `src_frontend/server/routes/teams.js`
- `src_frontend/server/routes/disciplines.js`
- `src_frontend/server/routes/actions.js`

Target:
- Formal command and state-machine specification in `apps/core`

### R1 - Operator UX reference
Source:
- `src_frontend/client/src/Components/*`
- `src_frontend/client/src/Sections/*`

Target:
- Equivalent operator flows in `apps/operator` (Tauri + React)

### R2 - Hardware behavior reference
Source:
- Existing bluetooth/sensor/DMX-related routes and runtime artifacts

Target:
- Stable adapters in `apps/core` with real/mock modes and reliability guards

## Acceptance criteria for reference parity
- Tournament lifecycle behavior matches reference scenarios
- Timing/scoring outputs match expected outcomes
- Hardware command sequences preserve required semantics
- Operator can execute event procedures with equivalent UX flow
