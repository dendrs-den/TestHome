# Handoff 2026-06-02 - Spectator, Referee Panel, Core

## Summary
- Branch: `task/raspberry-old-operator-ui/restore-legacy-operator`
- Task: `202605282202-VENKX1`
- End-of-day focus: live Spectator UI polish, referee fault flow, replay reset behavior, Core persistence, and Raspberry deployment.
- Raspberry Core deployment completed and smoke-checked on `http://192.168.0.177:18080`.

## Completed
- Reworked `apps/spectator` into the new full-screen scoreboard layout:
  - black background;
  - Flow Moscow logo at top-left;
  - `Round NN` at top-right;
  - large `DSEG7 Classic Bold` timer in `000:000` format;
  - participant name centered in the lower screen area;
  - `Final time` label appears only after the timer stops and no longer shifts the timer;
  - `Skip` row appears only when skip count is greater than `0`;
  - `Bust` dots are capped at `10`; higher counts fall back to a numeric value.
- Added release-only WebView2 rendering flags for Spectator `.exe` to remove thin DSEG7 artifacts seen only in the packaged app.
- Kept Spectator's right-click server menu readable.
- Fixed Referee Panel fault flow:
  - `Bust` and `Skip` update Core and Spectator in realtime while the round is running;
  - final time is calculated only after `STOP`;
  - replay/activate clears the selected flight before the new run starts.
- Added Core-side selected display round support:
  - Referee Panel now selects the current flight on open;
  - Spectator receives participant/stage context before `ACTIVATE`;
  - selecting a flight does not prepare/reset/start the round;
  - stale result/crossing values from a previous flight are not exposed as the selected display state.
- Removed the internal `round-*` identifier from the Referee Panel UI.
- Deployed Core to Raspberry using:
  - `.\scripts\deploy_core_to_pi.ps1 -Upload -Install`

## Verified
- `apps/core`: `go test ./...`
- `apps/operator`: `npm exec tsc -- --noEmit`
- `apps/operator`: `npm run build`
- `apps/spectator`: `npm exec tsc -- --noEmit`
- `apps/spectator`: `npm run build`
- `apps/spectator/src-tauri`: `cargo tauri build`
- Raspberry smoke checks:
  - `systemctl is-active inflightflow-core.service` -> `active`
  - `curl http://127.0.0.1:18080/health` -> `{"status":"ok","service":"inflightflow-core","hardwareMode":"real"}`
  - `/v1/domain/state` returns current tournament/round data.

## Start Here Tomorrow
1. Use branch `task/raspberry-old-operator-ui/restore-legacy-operator`.
2. Core is already deployed to Raspberry at `192.168.0.177:18080`.
3. For a quick field check, open Operator and Spectator against `http://192.168.0.177:18080`.
4. If changing Core again, deploy with `.\scripts\deploy_core_to_pi.ps1 -Upload -Install`.
5. If changing Spectator packaged output again, rebuild from `apps/spectator/src-tauri` with `cargo tauri build`.

## Notes
- Do not commit local SQLite files from `apps/core/data`.
- Do not commit `.agentplane`, `AGENTS.md`, or `CONTRIBUTING.md` unless the workflow explicitly asks for agent policy updates.
- Visual screenshots in the repository root are local checkpoints and are not required for runtime.
