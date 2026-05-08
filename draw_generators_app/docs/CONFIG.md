# Config Reference

All runtime-tunable values are in `config.py`.

## Competition model
- `DEFAULT_COMPETITION` (str): active discipline key by default (`D2W_D4W` or `DS`).
- `COMPETITIONS` (dict): competition definitions and their pools.
- `get_competition_labels()` -> `dict[str, str]`: labels for UI selector.
- `get_competition_pools(key)` -> pools tuple: `snakes`, `verticals`, `mixers` for selected discipline.
- `get_competition_title(key)` -> `str`: title for selected discipline.

## UI
- `APP_TITLE_TEXT` (str): title in top bar for active discipline.

## Animation
- `ANIMATION_STEP_DELAY_MS` (int): delay per animation step in milliseconds.
- `ANIMATION_STEP_COUNT` (int): count of pulse steps before final render.

## Element pools
Element pools are now stored inside `COMPETITIONS`.

Legacy flat variables are still supported for backward compatibility:
- `SNAKES` (list[tuple[str, str]])
- `VERTICALS` (list[tuple[str, str]])
- `MIXERS` (list[tuple[str, str]])

If legacy variables are provided in external config, they are applied to `D2W_D4W`.

## External config file
Runtime override file is `DrawGenerators.cfg` in current working directory.

Behavior:
1. On startup, if `DrawGenerators.cfg` is missing, app creates it with defaults.
2. If present, uppercase variables from it override bundled defaults.
3. If file has errors, app falls back to bundled defaults.

## Notes
- Keep animation values positive.
- Keep element codes unique inside each pool.
- In UI, `Competition` selector switches pools for generation.
