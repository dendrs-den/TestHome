# Config Reference

All runtime-tunable values are in `config.py`.

## UI
- `APP_TITLE_TEXT` (str): title in top bar.

## Animation
- `ANIMATION_STEP_DELAY_MS` (int): delay per animation step in milliseconds.
- `ANIMATION_STEP_COUNT` (int): count of pulse steps before final render.

## Element pools
- `SNAKES` (list[tuple[str, str]])
- `VERTICALS` (list[tuple[str, str]])
- `MIXERS` (list[tuple[str, str]])

## Notes
- Keep animation values positive.
- Keep element codes unique inside each pool.
