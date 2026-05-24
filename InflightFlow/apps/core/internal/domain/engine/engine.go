package engine

import (
	"errors"
	"fmt"
	"time"

	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/domain/events"
)

type RoundState string

const (
	RoundIdle      RoundState = "idle"
	RoundPrepared  RoundState = "prepared"
	RoundRunning   RoundState = "running"
	RoundCompleted RoundState = "completed"
	RoundCancelled RoundState = "cancelled"
)

type State struct {
	TournamentID string
	RoundID      string
	RoundState   RoundState
	Crossings    int
	LastCrossAt  int64
}

type Engine struct {
	state State
}

func New() *Engine {
	return &Engine{
		state: State{
			RoundState: RoundIdle,
		},
	}
}

func (e *Engine) State() State {
	return e.state
}

func (e *Engine) Handle(cmd commands.Command) ([]events.Event, error) {
	switch cmd.Type {
	case commands.CmdCreateTournament:
		return e.createTournament(cmd)
	case commands.CmdPrepareRound:
		return e.prepareRound(cmd)
	case commands.CmdStartRound:
		return e.startRound(cmd)
	case commands.CmdAcceptCrossing:
		return e.acceptCrossing(cmd)
	case commands.CmdFinishRound:
		return e.finishRound(cmd)
	case commands.CmdCancelRound:
		return e.cancelRound(cmd)
	default:
		return nil, fmt.Errorf("unsupported command: %s", cmd.Type)
	}
}

func (e *Engine) Apply(ev events.Event) error {
	switch ev.Type {
	case events.TypeTournamentCreated:
		e.state.TournamentID = str(ev.Data["tournamentId"])
		e.state.RoundState = RoundIdle
	case events.TypeRoundPrepared:
		e.state.RoundID = str(ev.Data["roundId"])
		e.state.RoundState = RoundPrepared
		e.state.Crossings = 0
		e.state.LastCrossAt = 0
	case events.TypeRoundStarted:
		e.state.RoundState = RoundRunning
	case events.TypeCrossingAccepted:
		e.state.Crossings++
		e.state.LastCrossAt = int64Num(ev.Data["at"])
	case events.TypeRoundFinished:
		e.state.RoundState = RoundCompleted
	case events.TypeRoundCancelled:
		e.state.RoundState = RoundCancelled
	default:
		return fmt.Errorf("unsupported event type: %s", ev.Type)
	}
	return nil
}

func (e *Engine) createTournament(cmd commands.Command) ([]events.Event, error) {
	id := str(cmd.Data["tournamentId"])
	if id == "" {
		return nil, errors.New("tournamentId is required")
	}
	if e.state.TournamentID != "" {
		return nil, errors.New("tournament already created")
	}
	return e.newEvents(events.TypeTournamentCreated, map[string]any{
		"tournamentId": id,
	}), nil
}

func (e *Engine) prepareRound(cmd commands.Command) ([]events.Event, error) {
	if e.state.TournamentID == "" {
		return nil, errors.New("tournament is not created")
	}
	if e.state.RoundState == RoundRunning {
		return nil, errors.New("cannot prepare while round is running")
	}
	roundID := str(cmd.Data["roundId"])
	if roundID == "" {
		return nil, errors.New("roundId is required")
	}
	return e.newEvents(events.TypeRoundPrepared, map[string]any{
		"roundId": roundID,
	}), nil
}

func (e *Engine) startRound(_ commands.Command) ([]events.Event, error) {
	if e.state.RoundState != RoundPrepared {
		return nil, fmt.Errorf("round must be prepared, got=%s", e.state.RoundState)
	}
	return e.newEvents(events.TypeRoundStarted, map[string]any{}), nil
}

func (e *Engine) acceptCrossing(cmd commands.Command) ([]events.Event, error) {
	if e.state.RoundState != RoundRunning {
		return nil, fmt.Errorf("round must be running, got=%s", e.state.RoundState)
	}
	at, ok := cmd.Data["at"].(int64)
	if !ok {
		if f, okf := cmd.Data["at"].(float64); okf {
			at = int64(f)
		} else {
			at = time.Now().UnixMilli()
		}
	}
	return e.newEvents(events.TypeCrossingAccepted, map[string]any{
		"at": at,
	}), nil
}

func (e *Engine) finishRound(_ commands.Command) ([]events.Event, error) {
	if e.state.RoundState != RoundRunning {
		return nil, fmt.Errorf("round must be running, got=%s", e.state.RoundState)
	}
	if e.state.Crossings < 2 {
		return nil, errors.New("cannot finish round with less than 2 crossings")
	}
	return e.newEvents(events.TypeRoundFinished, map[string]any{
		"crossings": e.state.Crossings,
	}), nil
}

func (e *Engine) cancelRound(_ commands.Command) ([]events.Event, error) {
	if e.state.RoundState == RoundIdle {
		return nil, errors.New("no active round to cancel")
	}
	return e.newEvents(events.TypeRoundCancelled, map[string]any{}), nil
}

func (e *Engine) newEvents(t events.Type, data map[string]any) []events.Event {
	ev := events.Event{
		ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), t),
		Type:      t,
		At:        time.Now().UTC(),
		Aggregate: e.state.TournamentID,
		Data:      data,
	}
	_ = e.Apply(ev)
	return []events.Event{ev}
}

func str(v any) string {
	s, _ := v.(string)
	return s
}

func int64Num(v any) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int:
		return int64(t)
	case float64:
		return int64(t)
	default:
		return 0
	}
}
