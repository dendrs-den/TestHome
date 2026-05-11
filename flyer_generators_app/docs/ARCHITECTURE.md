# Architecture

## Purpose
`flyer_generators_app` generates Dive Pool rounds for `D2W & D4W` and `DS` disciplines.

## Modules
- `main.py`: Qt entrypoint.
- `config.py`: configurable competition model, animation parameters, and element pools.
- `core/generator.py`: generation algorithm (repeat, shuffle, round assembly).
- `core/models.py`: `Element` and `Round` models.
- `core/validators.py`: input checks.
- `ui/main_window.py`: main window, competition selector, rendering, animation flow, settings panel.
- `ui/widgets.py`: reusable checkbox groups with dynamic pool replacement.
- `ui/styles.py`: visual style.
- `utils/session_settings.py`: persistent settings storage across sessions.
- `tests/`: unit tests.

## Runtime flow
1. App starts, loads external config, and restores saved session settings.
2. User selects competition (`D2W & D4W` or `DS`), round count, and enabled elements.
3. `Generate` runs core algorithm with selected pools.
4. UI shows shuffle pulse animation.
5. Final rounds are rendered and settings are persisted.

## Config flow
1. `config.py` defines `COMPETITIONS` and `DEFAULT_COMPETITION`.
2. External `FlyerGenerators.cfg` can override uppercase values.
3. Backward compatibility maps legacy `SNAKES`/`VERTICALS`/`MIXERS` to `D2W_D4W` when present.

