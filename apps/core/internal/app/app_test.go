package app

import (
	"testing"

	"inflightflow/apps/core/internal/tournaments"
)

func TestComputeFinalTimeMs(t *testing.T) {
	current := tournaments.Tournament{
		BustValue: 5,
		SkipValue: 20,
	}

	round := map[string]any{
		"faults": []any{
			map[string]any{"type": "bust", "valid": true},
			map[string]any{"type": "bust", "valid": true},
			map[string]any{"type": "skip", "valid": true},
			map[string]any{"type": "skip", "valid": false},
			map[string]any{"type": "other", "valid": true},
		},
	}

	got := computeFinalTimeMs(1000, round, current)
	want := int64(1030)
	if got != want {
		t.Fatalf("expected final time %d, got %d", want, got)
	}
}

func TestComputeFinalTimeMsHandlesStringPenaltyValues(t *testing.T) {
	current := tournaments.Tournament{
		BustValue: "15",
		SkipValue: "40",
	}

	round := map[string]any{
		"faults": []any{
			map[string]any{"type": "bust"},
			map[string]any{"type": "skip"},
		},
	}

	got := computeFinalTimeMs(2500, round, current)
	want := int64(2555)
	if got != want {
		t.Fatalf("expected final time %d, got %d", want, got)
	}
}
