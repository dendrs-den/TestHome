package engine

import "testing"

func TestComputeRoundResultMs(t *testing.T) {
	st := State{Crossings: 2, FirstCrossAt: 1000, LastCrossAt: 1450}
	got, err := ComputeRoundResultMs(st)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 450 {
		t.Fatalf("expected 450, got %d", got)
	}
}

func TestComputeRoundResultMsInsufficientCrossings(t *testing.T) {
	st := State{Crossings: 1, FirstCrossAt: 1000, LastCrossAt: 1100}
	_, err := ComputeRoundResultMs(st)
	if err == nil {
		t.Fatal("expected error")
	}
}
