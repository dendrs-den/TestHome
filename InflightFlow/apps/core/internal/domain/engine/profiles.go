package engine

import (
	"fmt"
)

type BootstrapProfile struct {
	Name              string `json:"name"`
	TournamentID      string `json:"tournamentId"`
	RoundIDPrefix     string `json:"roundIdPrefix"`
	IdempotencyPrefix string `json:"idempotencyPrefix"`
}

func DefaultProfiles() map[string]BootstrapProfile {
	return map[string]BootstrapProfile{
		"lab": {
			Name:              "lab",
			TournamentID:      "lab-session",
			RoundIDPrefix:     "lab-round",
			IdempotencyPrefix: "lab-bootstrap",
		},
		"tournament": {
			Name:              "tournament",
			TournamentID:      "event-main",
			RoundIDPrefix:     "event-round",
			IdempotencyPrefix: "event-bootstrap",
		},
	}
}

func ResolveProfile(name string) (BootstrapProfile, error) {
	p, ok := DefaultProfiles()[name]
	if !ok {
		return BootstrapProfile{}, fmt.Errorf("unknown bootstrap profile: %s", name)
	}
	return p, nil
}
