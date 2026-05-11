# Architecture

## Purpose
`flyer_generators_app` generates team assignments for participants across multiple rounds.

## Modules
- `main.py`: Qt entrypoint.
- `config.py`: runtime defaults and external config integration.
- `core/generator.py`: generation algorithms (standard mode and Captain mode).
- `core/models.py`: `Participant` and `TeamRound` models.
- `core/validators.py`: input validation.
- `ui/main_window.py`: main window, settings popup, participant editing, rendering, PDF export.
- `ui/styles.py`: visual style.
- `utils/session_settings.py`: session persistence in `FlyerGenerators.cfg`.
- `tests/`: unit tests.

## Runtime flow
1. App starts and loads defaults from `config.py`.
2. External `FlyerGenerators.cfg` overrides uppercase runtime settings.
3. Session state is restored from embedded `session_settings_json`.
4. User edits participants, rounds, team size, and optional Captain mode.
5. Generation runs and produces `TeamRound` list.
6. UI renders rounds and persists current session data.

## Generation modes
- Standard mode: all participants are shuffled and split into teams by team size.
- Captain mode:
  - user selects captains in settings;
  - captains are assigned by ascending participant number to teams;
  - captains are always first in team;
  - only non-captains are shuffled.

## PDF export
- Exports last generated result to PDF.
- Layout uses portrait orientation and transposed table (teams as rows, rounds as columns).
