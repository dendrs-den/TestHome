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
}

func NewRuntime(journalPath string) *Runtime {
	return &Runtime{
		engine:      New(),
		journalPath: journalPath,
	}
}

func (r *Runtime) Restore() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	evs, err := journal.Replay(r.journalPath)
	if err != nil {
		return fmt.Errorf("replay journal: %w", err)
	}
	for _, ev := range evs {
		if err := r.engine.Apply(ev); err != nil {
			return fmt.Errorf("apply replay event %s: %w", ev.Type, err)
		}
	}
	return nil
}

func (r *Runtime) Handle(cmd commands.Command) ([]events.Event, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	evs, err := r.engine.Handle(cmd)
	if err != nil {
		return nil, err
	}
	for _, ev := range evs {
		if err := journal.Append(r.journalPath, ev); err != nil {
			return nil, fmt.Errorf("append event: %w", err)
		}
	}
	return evs, nil
}

func (r *Runtime) State() State {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.engine.State()
}
