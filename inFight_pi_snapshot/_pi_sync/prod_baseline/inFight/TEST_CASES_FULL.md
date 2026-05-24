# InFlight Test Cases (Local)

## Scope
- Frontend terminal (`/terminal`)
- Frontend infoboard (`/infoboard`)
- Frontend scoreboard (`/scoreboard`)
- Node API gateway (`src_frontend/server`)
- Core integration (local core/mock)
- Service mode (no hardware controller)

## Important Note
- True 100% automated coverage for this project requires:
  - unit tests for all business functions,
  - integration tests for all API routes,
  - e2e tests for all UI flows,
  - hardware-in-the-loop tests for controller/sensor paths.
- This checklist gives full functional coverage matrix for the project. Automated smoke suite covers critical path.

## A. App Availability
1. `GET /terminal` returns app shell.
2. `GET /infoboard` returns app shell.
3. `GET /scoreboard` returns app shell.
4. Unknown route returns 404 fallback page.

## B. Tournament Management
1. Create tournament with valid fields.
2. Create tournament with empty name (validation error).
3. Create tournament with duplicate team numbers.
4. Edit tournament name.
5. Edit stage names and battle flags.
6. Delete tournament.
7. Set current tournament.
8. Verify history reflects DB state after delete.

## C. Round Navigation
1. Open rounds list for selected tournament.
2. Switch current round by index.
3. Next round moves pointer.
4. Replay round resets current attempt state.
5. Last round guard returns expected message.

## D. Terminal Round Lifecycle (Standard)
1. Activate enables waiting state.
2. First crossing moves to active state.
3. Stopwatch starts only after first crossing.
4. Stop closes round and enables edit.
5. Bust increments bust counters.
6. Skip increments skip counters.
7. Edit results updates penalties list.
8. Edit results updates crosses list.
9. Save edited results persists to DB.

## E. Terminal Round Lifecycle (Service Mode)
1. Service activate does not auto-start timer.
2. Sensor cross starts timer on first click.
3. Additional sensor cross increments crosses.
4. Stop finalizes service round.
5. Edit results remains consistent after service stop.
6. Stop/save failure returns explicit system error status.
7. Terminal shows error popup for save failure status.

## F. Infoboard Behavior
1. Loads without white screen.
2. Updates current team and stage on round change.
3. Shows running timer during performance.
4. Shows bust/skip counters live.
5. Shows previous result in battle mode for participants >=2.
6. Hides previous result for participant #1 in battle stage.
7. Displays stop result (fact/result time) after round end.
8. No layout overlap on wide screens.

## G. Data Integrity
1. Crossings list monotonic by time.
2. Fault time never exceeds result time in persisted data.
3. `time_result = time_real + penalties`.
4. Deleting fault recalculates final result.
5. Deleting crossing recalculates final result.
6. Round duration in edit popup equals persisted `time_real`.
7. History values equal current DB (not stale cache).

## H. Error Handling
1. Core unavailable: API returns controlled error.
2. Failed fetch in terminal shows meaningful UI feedback.
3. Failed fetch in infoboard does not crash app.
4. Save failure after stop shows terminal popup.
5. Remote stop error maps to correct status handling.

## I. Hardware/Controller Integration
1. Device list endpoint works with available manager.
2. Remote activate event starts terminal expectation mode.
3. Remote crossing starts timer.
4. Remote stop ends round and persists.
5. Noise/debounce spikes do not corrupt final result.

## J. Non-Functional
1. Client production build succeeds.
2. Server route files pass syntax check.
3. Local startup script opens required URLs.
4. No blocking runtime error in console during core flows.

## Automated Smoke Subset
- Implemented in `scripts/smoke-tests-local.js`:
  - get state
  - service activate/cross/stop
  - normal rounds start/end
  - info fetch after stop
