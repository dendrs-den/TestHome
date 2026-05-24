# M1 Step Report - Validation, State, Restore

Date: 2026-05-24

## Scope completed
1. Strict command payload validation at API layer
2. Expanded round state model with timing/result fields
3. Restore-after-restart test through journal replay

## Changes
- API validation added for:
  - `create_tournament` requires string `tournamentId`
  - `prepare_round` requires string `roundId`
  - `accept_crossing` requires numeric `at`
  - unsupported command types are rejected
- State model expanded with:
  - `FirstCrossAt`
  - `RoundStartedAt`
  - `RoundEndedAt`
  - `RoundResultMs`
- Finish event now stores:
  - `resultMs` (lastCross - firstCross)
  - `finishedAt`
- Restart restore test validates full cycle replay and resulting state consistency.

## Test status
- `go test ./...` in `apps/core`: PASS
- New restore test expectation:
  - finished round restored as `completed`
  - crossings restored correctly
  - calculated result restored correctly

## Notes
- Idempotency remains in-memory by design (as agreed) for current stage.
