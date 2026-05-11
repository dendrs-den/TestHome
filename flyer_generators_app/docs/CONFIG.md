# Config Reference

All runtime-tunable values are in `config.py`.

## Core settings
- `APP_TITLE_TEXT` (str): title displayed in app header.
- `DEFAULT_ROUND_COUNT` (int): default rounds count in settings.
- `MAX_ROUND_COUNT` (int): maximum rounds count.
- `DEFAULT_TEAM_SIZE` (int): default team size.
- `MIN_TEAM_SIZE` (int): minimum team size.
- `MAX_TEAM_SIZE` (int): maximum team size.

## Animation
- `ANIMATION_STEP_DELAY_MS` (int): delay per animation step in milliseconds.
- `ANIMATION_STEP_COUNT` (int): animation steps before final render.

## External config file
Runtime override file is `FlyerGenerators.cfg` in current working directory.

Behavior:
1. On startup, if `FlyerGenerators.cfg` is missing, app creates it with defaults.
2. If present, uppercase variables from it override bundled defaults.
3. If file has errors, app falls back to bundled defaults.

## Session data in config
App also stores session data in `FlyerGenerators.cfg` under auto-generated block `session_settings_json`.

Stored session fields:
- `round_count`
- `team_size`
- `captain_mode`
- `participants` (with `number`, `full_name`, `is_captain`)
- `last_generated`
- animation runtime fields

## Notes
- Keep numeric values in valid ranges.
- Participant number must be 3 digits and unique.
- In Captain mode, captains count must match teams count.
