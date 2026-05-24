package engine

import "testing"

func TestResolveProfile(t *testing.T) {
	p, err := ResolveProfile("lab")
	if err != nil {
		t.Fatalf("resolve lab profile: %v", err)
	}
	if p.TournamentID == "" || p.RoundIDPrefix == "" || p.IdempotencyPrefix == "" {
		t.Fatalf("profile fields must be non-empty: %#v", p)
	}
}

func TestResolveProfileUnknown(t *testing.T) {
	_, err := ResolveProfile("unknown")
	if err == nil {
		t.Fatal("expected error for unknown profile")
	}
}
