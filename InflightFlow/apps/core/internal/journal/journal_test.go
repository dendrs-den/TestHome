package journal

import (
	"path/filepath"
	"testing"
	"time"

	"inflightflow/apps/core/internal/domain/events"
)

func TestAppendReplay(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "journal.log")
	if err := EnsurePath(path); err != nil {
		t.Fatalf("ensure path: %v", err)
	}

	ev1 := events.Event{
		ID:        "e1",
		Type:      events.TypeTournamentCreated,
		At:        time.Now().UTC(),
		Aggregate: "t-1",
		Data:      map[string]any{"tournamentId": "t-1"},
	}
	ev2 := events.Event{
		ID:        "e2",
		Type:      events.TypeRoundPrepared,
		At:        time.Now().UTC(),
		Aggregate: "t-1",
		Data:      map[string]any{"roundId": "r-1"},
	}

	if err := Append(path, ev1); err != nil {
		t.Fatalf("append ev1: %v", err)
	}
	if err := Append(path, ev2); err != nil {
		t.Fatalf("append ev2: %v", err)
	}

	got, err := Replay(path)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 events, got %d", len(got))
	}
	if got[0].ID != "e1" || got[1].ID != "e2" {
		t.Fatalf("unexpected event order: %+v", got)
	}
}
