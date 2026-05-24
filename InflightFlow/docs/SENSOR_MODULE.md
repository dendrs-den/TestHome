# Sensor Module (M1 Gate)

`apps/core/internal/sensor` is the first quality gate for InflightFlow hardware reliability.

Current behavior:
- input: timestamped digital level samples (`true/false`)
- output: stable `crossing` events
- filters:
  - debounce window for contact/noise bounce
  - refractory window for duplicate crossing suppression
  - rising-edge only event generation

Why this matters:
- prevents false crossings during noisy GPIO/driver conditions
- gives deterministic behavior for timing/scoring core
- keeps hardware instability isolated from domain logic

Next steps:
1. Wire this processor to real input adapter (`/dev/crossing_detector` reader).
2. Add soak tests with recorded real traces from Pi.
3. Add fault metrics (`debounced`, `refractory`, `invalid_timestamp`) for observability.
