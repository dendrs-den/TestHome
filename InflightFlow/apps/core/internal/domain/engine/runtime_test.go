package engine

import (
	"path/filepath"
	"testing"

	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/journal"
)

func TestRuntime_IdempotencyKeyPreventsDuplicateApply(t *testing.T) {
	dir := t.TempDir()
	jpath := filepath.Join(dir, "journal.log")
	if err := journal.EnsurePath(jpath); err != nil {
		t.Fatalf("ensure path: %v", err)
	}
	rt := NewRuntime(jpath)

	_, err := rt.Handle(commands.Command{
		Type: commands.CmdCreateTournament,
		Data: map[string]any{"tournamentId": "t-1"},
	})
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	key := "cmd-prepare-1"
	_, err = rt.Handle(commands.Command{
		Type:           commands.CmdPrepareRound,
		Data:           map[string]any{"roundId": "r-1"},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("prepare #1: %v", err)
	}
	_, err = rt.Handle(commands.Command{
		Type:           commands.CmdPrepareRound,
		Data:           map[string]any{"roundId": "r-1"},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("prepare #2 duplicate key should not fail: %v", err)
	}

	evs, err := journal.Replay(jpath)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	// created + prepared once
	if len(evs) != 2 {
		t.Fatalf("expected 2 journaled events, got %d", len(evs))
	}
}
