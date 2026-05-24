# Domain Round Finish Validation

Generated: 2026-05-24T15:50:42.2017345Z
Target: http://192.168.0.177:18080/v1/domain/*

## Steps
1. Round was in unning with accumulated crossings.
2. Sent command inish_round.
3. Verified state transition.
4. Sent second inish_round (negative case).

## Results
- First inish_round: success
- State after first finish:
  - RoundState=completed
  - Crossings=18
- Second inish_round: rejected with error
  - ound must be running, got=completed

## Conclusion
Domain state machine correctly enforces one-way transition unning -> completed and rejects repeated finish.
