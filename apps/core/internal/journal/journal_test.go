package journal

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
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

func TestAppendRotatesBySize(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "journal.log")
	if err := EnsurePath(path); err != nil {
		t.Fatalf("ensure path: %v", err)
	}

	prevBytes := journalRotateMaxBytes
	prevBackups := journalRotateMaxBackups
	journalRotateMaxBackups = 3
	defer func() {
		journalRotateMaxBytes = prevBytes
		journalRotateMaxBackups = prevBackups
	}()

	makeEvent := func(id string) events.Event {
		return events.Event{
			ID:        id,
			Type:      events.TypeRoundPrepared,
			At:        time.Now().UTC(),
			Aggregate: "t-1",
			Data:      map[string]any{"payload": strings.Repeat(id, 60)},
		}
	}
	ev1 := makeEvent("e1")
	ev2 := makeEvent("e2")
	ev3 := makeEvent("e3")
	b1, err := json.Marshal(ev1)
	if err != nil {
		t.Fatalf("marshal e1: %v", err)
	}
	b2, err := json.Marshal(ev2)
	if err != nil {
		t.Fatalf("marshal e2: %v", err)
	}
	journalRotateMaxBytes = int64(len(b1) + len(b2) + 2)

	if err := Append(path, ev1); err != nil {
		t.Fatalf("append e1: %v", err)
	}
	if err := Append(path, ev2); err != nil {
		t.Fatalf("append e2: %v", err)
	}
	if err := Append(path, ev3); err != nil {
		t.Fatalf("append e3: %v", err)
	}

	if _, err := os.Stat(path + ".1"); err != nil {
		t.Fatalf("expected rotated journal .1: %v", err)
	}

	current, err := Replay(path)
	if err != nil {
		t.Fatalf("replay current: %v", err)
	}
	rotated, err := Replay(path + ".1")
	if err != nil {
		t.Fatalf("replay rotated: %v", err)
	}
	if len(current) == 0 {
		t.Fatalf("expected current journal to contain latest event")
	}
	if len(rotated) == 0 {
		t.Fatalf("expected rotated journal to contain previous events")
	}
	if current[len(current)-1].ID != "e3" {
		t.Fatalf("expected latest event in current journal, got %+v", current)
	}
	if rotated[0].ID != "e1" || rotated[1].ID != "e2" {
		t.Fatalf("expected rotated journal to contain e1 and e2, got %+v", rotated)
	}
}
