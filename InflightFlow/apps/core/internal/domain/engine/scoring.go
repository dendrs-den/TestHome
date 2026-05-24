package engine

import "errors"

var ErrInsufficientCrossings = errors.New("cannot finish round with less than 2 crossings")

// ComputeRoundResultMs is deterministic: same state snapshot -> same output.
func ComputeRoundResultMs(st State) (int64, error) {
	if st.Crossings < 2 {
		return 0, ErrInsufficientCrossings
	}
	result := st.LastCrossAt - st.FirstCrossAt
	if result < 0 {
		result = 0
	}
	return result, nil
}
