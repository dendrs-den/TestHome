# Architecture

## Purpose
`draw_generators_app` generates Dive Pool rounds for D2W/D4W.

## Modules
- `main.py`: Qt entrypoint.
- `config.py`: configurable text, animation parameters, and element pools.
- `core/generator.py`: generation algorithm (repeat, shuffle, round assembly).
- `core/models.py`: `Element` and `Round` models.
- `core/validators.py`: input checks.
- `ui/main_window.py`: main window, rendering, animation flow, settings panel.
- `ui/widgets.py`: reusable checkbox groups.
- `ui/styles.py`: visual style.
- `utils/session_settings.py`: persistent settings storage across sessions.
- `tests/`: unit tests.

## Runtime flow
1. App starts and loads saved session settings.
2. User picks rounds and elements.
3. `Generate` runs core algorithm.
4. UI shows shuffle pulse animation.
5. Final rounds are rendered and settings are persisted.
