package engine

import (
	"fmt"
	"sync"

	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/domain/events"
	"inflightflow/apps/core/internal/journal"
)

type Runtime struct {
	mu          sync.Mutex
	engine      *Engine
	journalPath string
	dedupPath   string
	dedup       map[string][]events.Event
}

func NewRuntime(journalPath string) *Runtime {
	return &Runtime{
		engine:      New(),
		journalPath: journalPath,
		dedupPath:   journal.DedupPath(journalPath),
		dedup:       make(map[string][]events.Event),
	}
}

func (r *Runtime) Restore() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	evs, err := journal.Replay(r.journalPath)
	if err != nil {
		return fmt.Errorf("replay journal: %w", err)
	}
	dedup, err := journal.ReplayIdempotency(r.dedupPath)
	if err != nil {
		return fmt.Errorf("replay dedup: %w", err)
	}
	for _, ev := range evs {
		if err := r.engine.Apply(ev); err != nil {
			return fmt.Errorf("apply replay event %s: %w", ev.Type, err)
		}
	}
	r.dedup = dedup
	return nil
}

func (r *Runtime) Handle(cmd commands.Command) ([]events.Event, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if cmd.IdempotencyKey != "" {
		if cached, ok := r.dedup[cmd.IdempotencyKey]; ok {
			return cached, nil
		}
	}

	evs, err := r.engine.Handle(cmd)
	if err != nil {
		return nil, err
	}
	for _, ev := range evs {
		if err := journal.Append(r.journalPath, ev); err != nil {
			return nil, fmt.Errorf("append event: %w", err)
		}
	}
	if cmd.IdempotencyKey != "" {
		r.dedup[cmd.IdempotencyKey] = evs
		if err := journal.AppendIdempotency(r.dedupPath, journal.IdempotencyRecord{
			Key:    cmd.IdempotencyKey,
			Events: evs,
		}); err != nil {
			return nil, fmt.Errorf("append dedup record: %w", err)
		}
	}
	return evs, nil
}

func (r *Runtime) State() State {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.engine.State()
}

func (r *Runtime) Bootstrap(tournamentID, roundID, keyPrefix string) (State, []events.Event, error) {
	all := make([]events.Event, 0, 3)

	evs, err := r.Handle(commands.Command{
		Type:           commands.CmdCreateTournament,
		Data:           map[string]any{"tournamentId": tournamentID},
		IdempotencyKey: keyPrefix + ":create",
	})
	if err != nil {
		return r.State(), all, err
	}
	all = append(all, evs...)

	evs, err = r.Handle(commands.Command{
		Type:           commands.CmdPrepareRound,
		Data:           map[string]any{"roundId": roundID},
		IdempotencyKey: keyPrefix + ":prepare",
	})
	if err != nil {
		return r.State(), all, err
	}
	all = append(all, evs...)

	evs, err = r.Handle(commands.Command{
		Type:           commands.CmdStartRound,
		Data:           map[string]any{},
		IdempotencyKey: keyPrefix + ":start",
	})
	if err != nil {
		return r.State(), all, err
	}
	all = append(all, evs...)

	return r.State(), all, nil
}
