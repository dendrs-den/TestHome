package events

import "time"

type Type string

const (
	TypeTournamentCreated Type = "tournament.created"
	TypeRoundPrepared     Type = "round.prepared"
	TypeRoundStarted      Type = "round.started"
	TypeCrossingAccepted  Type = "crossing.accepted"
	TypeRoundFinished     Type = "round.finished"
	TypeRoundCancelled    Type = "round.cancelled"
)

type Event struct {
	ID        string         `json:"id"`
	Type      Type           `json:"type"`
	At        time.Time      `json:"at"`
	Aggregate string         `json:"aggregate"`
	Data      map[string]any `json:"data"`
}
