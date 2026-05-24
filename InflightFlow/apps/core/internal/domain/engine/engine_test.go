package engine

import (
	"testing"

	"inflightflow/apps/core/internal/domain/commands"
)

func TestRoundLifecycleHappyPath(t *testing.T) {
	e := New()

	_, err := e.Handle(commands.Command{Type: commands.CmdCreateTournament, Data: map[string]any{"tournamentId": "t-1"}})
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}
	_, err = e.Handle(commands.Command{Type: commands.CmdPrepareRound, Data: map[string]any{"roundId": "r-1"}})
	if err != nil {
		t.Fatalf("prepare round: %v", err)
	}
	_, err = e.Handle(commands.Command{Type: commands.CmdStartRound, Data: map[string]any{}})
	if err != nil {
		t.Fatalf("start round: %v", err)
	}
	_, err = e.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1000)}})
	if err != nil {
		t.Fatalf("crossing1: %v", err)
	}
	_, err = e.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1200)}})
	if err != nil {
		t.Fatalf("crossing2: %v", err)
	}
	_, err = e.Handle(commands.Command{Type: commands.CmdFinishRound, Data: map[string]any{}})
	if err != nil {
		t.Fatalf("finish round: %v", err)
	}

	st := e.State()
	if st.RoundState != RoundCompleted {
		t.Fatalf("expected completed, got %s", st.RoundState)
	}
	if st.Crossings != 2 {
		t.Fatalf("expected 2 crossings, got %d", st.Crossings)
	}
}

func TestFinishWithLessThanTwoCrossingsFails(t *testing.T) {
	e := New()
	_, _ = e.Handle(commands.Command{Type: commands.CmdCreateTournament, Data: map[string]any{"tournamentId": "t-1"}})
	_, _ = e.Handle(commands.Command{Type: commands.CmdPrepareRound, Data: map[string]any{"roundId": "r-1"}})
	_, _ = e.Handle(commands.Command{Type: commands.CmdStartRound, Data: map[string]any{}})
	_, _ = e.Handle(commands.Command{Type: commands.CmdAcceptCrossing, Data: map[string]any{"at": int64(1000)}})

	_, err := e.Handle(commands.Command{Type: commands.CmdFinishRound, Data: map[string]any{}})
	if err == nil {
		t.Fatal("expected finish error with <2 crossings")
	}
}
