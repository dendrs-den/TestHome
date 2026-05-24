package engine

import (
	"path/filepath"
	"testing"

	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/journal"
)

func TestHeadlessTournamentLifecycle(t *testing.T) {
	dir := t.TempDir()
	jpath := filepath.Join(dir, "journal.log")
	if err := journal.EnsurePath(jpath); err != nil {
		t.Fatalf("ensure path: %v", err)
	}
	rt := NewRuntime(jpath)

	steps := []commands.Command{
		{Type: commands.CmdCreateTournament, Data: map[string]any{"tournamentId": "t-headless"}},
		{Type: commands.CmdPrepareRound, Data: map[string]any{"roundId": "r-1"}},
		{Type: commands.CmdStartRound, Data: map[string]any{}},
		{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1000)}},
		{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1325)}},
		{Type: commands.CmdFinishRound, Data: map[string]any{}},
	}
	for i, step := range steps {
		if _, err := rt.Handle(step); err != nil {
			t.Fatalf("step %d failed (%s): %v", i, step.Type, err)
		}
	}

	st := rt.State()
	if st.RoundState != RoundCompleted {
		t.Fatalf("expected completed, got %s", st.RoundState)
	}
	if st.Crossings != 2 {
		t.Fatalf("expected crossings=2, got %d", st.Crossings)
	}
	if st.RoundResultMs != 325 {
		t.Fatalf("expected result=325ms, got %d", st.RoundResultMs)
	}
}

func TestCrashRestartDrillContinueAndFinish(t *testing.T) {
	dir := t.TempDir()
	jpath := filepath.Join(dir, "journal.log")
	if err := journal.EnsurePath(jpath); err != nil {
		t.Fatalf("ensure path: %v", err)
	}

	rt1 := NewRuntime(jpath)
	preCrash := []commands.Command{
		{Type: commands.CmdCreateTournament, Data: map[string]any{"tournamentId": "t-drill"}},
		{Type: commands.CmdPrepareRound, Data: map[string]any{"roundId": "r-drill"}},
		{Type: commands.CmdStartRound, Data: map[string]any{}},
		{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(2000)}},
	}
	for _, c := range preCrash {
		if _, err := rt1.Handle(c); err != nil {
			t.Fatalf("pre-crash command failed (%s): %v", c.Type, err)
		}
	}

	rt2 := NewRuntime(jpath)
	if err := rt2.Restore(); err != nil {
		t.Fatalf("restore: %v", err)
	}
	stRestored := rt2.State()
	if stRestored.RoundState != RoundRunning {
		t.Fatalf("expected running after restore, got %s", stRestored.RoundState)
	}
	if stRestored.Crossings != 1 {
		t.Fatalf("expected crossings=1 after restore, got %d", stRestored.Crossings)
	}

	if _, err := rt2.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(2475)}}); err != nil {
		t.Fatalf("second crossing after restore: %v", err)
	}
	if _, err := rt2.Handle(commands.Command{Type: commands.CmdFinishRound, Data: map[string]any{}}); err != nil {
		t.Fatalf("finish after restore: %v", err)
	}

	stDone := rt2.State()
	if stDone.RoundState != RoundCompleted {
		t.Fatalf("expected completed after restore flow, got %s", stDone.RoundState)
	}
	if stDone.RoundResultMs != 475 {
		t.Fatalf("expected result=475ms, got %d", stDone.RoundResultMs)
	}
}
