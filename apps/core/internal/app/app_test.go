package app

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/domain/engine"
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
	want := int64(31000)
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
	want := int64(57500)
	if got != want {
		t.Fatalf("expected final time %d, got %d", want, got)
	}
}

func TestComputeFinalTimeMsHandlesFractionalPenaltyValues(t *testing.T) {
	current := tournaments.Tournament{
		BustValue: 0.5,
		SkipValue: 1.25,
	}

	round := map[string]any{
		"faults": []any{
			map[string]any{"type": "bust", "valid": true},
			map[string]any{"type": "skip", "valid": true},
		},
	}

	got := computeFinalTimeMs(10000, round, current)
	want := int64(11750)
	if got != want {
		t.Fatalf("expected final time %d, got %d", want, got)
	}
}

func TestSyncTournamentRoundAfterPrepareClearsReplayData(t *testing.T) {
	dir := t.TempDir()
	store, err := tournaments.Open(filepath.Join(dir, "tournaments.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer store.Close()

	current := tournaments.Tournament{
		ID:   "t-1",
		Name: "Cup One",
		Round: []map[string]any{
			{
				"id":              "r-1",
				"faults":          []any{map[string]any{"type": "bust", "valid": true}},
				"crossings":       []any{map[string]any{"at": 1000}},
				"time_real":       int64(22893),
				"time_result":     int64(57893),
				"round_start":     int64(1710000000000),
				"stage_rank":      1,
				"tournament_rank": 2,
			},
		},
	}

	if _, err := store.Add(current); err != nil {
		t.Fatalf("add tournament: %v", err)
	}
	if err := store.SetCurrent(current.ID); err != nil {
		t.Fatalf("set current: %v", err)
	}

	err = syncTournamentRoundAfterCommand(store, engine.State{RoundID: "r-1"}, commands.CmdPrepareRound)
	if err != nil {
		t.Fatalf("sync after prepare: %v", err)
	}

	updated, ok, err := store.Current()
	if err != nil || !ok {
		t.Fatalf("read current: ok=%v err=%v", ok, err)
	}

	raw, err := json.Marshal(updated.Round)
	if err != nil {
		t.Fatalf("marshal rounds: %v", err)
	}
	var rounds []map[string]any
	if err := json.Unmarshal(raw, &rounds); err != nil {
		t.Fatalf("unmarshal rounds: %v", err)
	}
	round := rounds[0]

	if faults, ok := round["faults"].([]any); !ok || len(faults) != 0 {
		t.Fatalf("expected empty faults after replay prepare, got %#v", round["faults"])
	}
	if crossings, ok := round["crossings"].([]any); !ok || len(crossings) != 0 {
		t.Fatalf("expected empty crossings after replay prepare, got %#v", round["crossings"])
	}
	for _, field := range []string{"time_real", "time_result", "round_start", "stage_rank", "tournament_rank"} {
		if value, exists := round[field]; !exists || value != nil {
			t.Fatalf("expected %s to be nil after replay prepare, got %#v", field, round[field])
		}
	}
}
