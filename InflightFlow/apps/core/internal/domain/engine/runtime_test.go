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

func TestRuntime_RestoreAfterRestart(t *testing.T) {
	dir := t.TempDir()
	jpath := filepath.Join(dir, "journal.log")
	if err := journal.EnsurePath(jpath); err != nil {
		t.Fatalf("ensure path: %v", err)
	}

	rt1 := NewRuntime(jpath)
	_, _ = rt1.Handle(commands.Command{
		Type: commands.CmdCreateTournament,
		Data: map[string]any{"tournamentId": "t-rst"},
	})
	_, _ = rt1.Handle(commands.Command{
		Type: commands.CmdPrepareRound,
		Data: map[string]any{"roundId": "r-rst"},
	})
	_, _ = rt1.Handle(commands.Command{Type: commands.CmdStartRound, Data: map[string]any{}})
	_, _ = rt1.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1000)}})
	_, _ = rt1.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1300)}})
	_, _ = rt1.Handle(commands.Command{Type: commands.CmdFinishRound, Data: map[string]any{}})

	rt2 := NewRuntime(jpath)
	if err := rt2.Restore(); err != nil {
		t.Fatalf("restore: %v", err)
	}
	st := rt2.State()
	if st.TournamentID != "t-rst" {
		t.Fatalf("unexpected tournament id: %s", st.TournamentID)
	}
	if st.RoundID != "r-rst" {
		t.Fatalf("unexpected round id: %s", st.RoundID)
	}
	if st.RoundState != RoundCompleted {
		t.Fatalf("expected completed, got %s", st.RoundState)
	}
	if st.Crossings != 2 {
		t.Fatalf("expected 2 crossings, got %d", st.Crossings)
	}
	if st.RoundResultMs != 300 {
		t.Fatalf("expected result 300ms, got %d", st.RoundResultMs)
	}
}

func TestRuntime_BootstrapIdempotent(t *testing.T) {
	dir := t.TempDir()
	jpath := filepath.Join(dir, "journal.log")
	if err := journal.EnsurePath(jpath); err != nil {
		t.Fatalf("ensure path: %v", err)
	}
	rt := NewRuntime(jpath)

	st1, evs1, err := rt.Bootstrap("t-bs", "r-bs", "k-bs")
	if err != nil {
		t.Fatalf("bootstrap #1: %v", err)
	}
	if st1.RoundState != RoundRunning {
		t.Fatalf("expected running, got %s", st1.RoundState)
	}
	if len(evs1) != 3 {
		t.Fatalf("expected 3 events, got %d", len(evs1))
	}

	st2, evs2, err := rt.Bootstrap("t-bs", "r-bs", "k-bs")
	if err != nil {
		t.Fatalf("bootstrap #2: %v", err)
	}
	if st2.RoundState != RoundRunning {
		t.Fatalf("expected running after second bootstrap, got %s", st2.RoundState)
	}
	if len(evs2) != 3 {
		t.Fatalf("expected 3 cached events on second call, got %d", len(evs2))
	}

	replayed, err := journal.Replay(jpath)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	// Exactly one create, one prepare, one start should be persisted.
	if len(replayed) != 3 {
		t.Fatalf("expected 3 persisted events, got %d", len(replayed))
	}
}
