package sensor

import "time"

// Config controls noise filtering for raw sensor samples.
type Config struct {
	// DebounceWindow drops edge flips that happen too quickly (contact bounce/noise).
	DebounceWindow time.Duration
	// RefractoryWindow drops repeated crossing events too close to each other.
	RefractoryWindow time.Duration
}

type Sample struct {
	At    time.Time
	Level bool // false=idle, true=beam crossed (or sensor active)
}

type Event struct {
	At   time.Time
	Type string // currently: "crossing"
}

// Processor converts raw digital sensor levels into stable crossing events.
// Rules:
// - Only rising edges can produce events.
// - Bounces are filtered by DebounceWindow.
// - Duplicate events are filtered by RefractoryWindow.
type Processor struct {
	cfg Config

	initialized    bool
	lastLevel      bool
	lastEdgeAt     time.Time
	lastAcceptedAt time.Time
}

func NewProcessor(cfg Config) *Processor {
	if cfg.DebounceWindow < 0 {
		cfg.DebounceWindow = 0
	}
	if cfg.RefractoryWindow < 0 {
		cfg.RefractoryWindow = 0
	}
	return &Processor{cfg: cfg}
}

func (p *Processor) Ingest(s Sample) (Event, bool, string) {
	if s.At.IsZero() {
		return Event{}, false, "invalid_timestamp"
	}

	if !p.initialized {
		p.initialized = true
		p.lastLevel = s.Level
		p.lastEdgeAt = s.At
		if s.Level {
			p.lastAcceptedAt = s.At
			return Event{At: s.At, Type: "crossing"}, true, "accepted_initial_high"
		}
		return Event{}, false, "initialized_idle"
	}

	if s.Level == p.lastLevel {
		return Event{}, false, "same_level"
	}

	if s.At.Sub(p.lastEdgeAt) < p.cfg.DebounceWindow {
		return Event{}, false, "debounced"
	}

	// Accept level transition.
	prev := p.lastLevel
	p.lastLevel = s.Level
	p.lastEdgeAt = s.At

	// Only rising edges can produce a crossing event.
	if prev || !s.Level {
		return Event{}, false, "non_rising_edge"
	}

	if !p.lastAcceptedAt.IsZero() && s.At.Sub(p.lastAcceptedAt) < p.cfg.RefractoryWindow {
		return Event{}, false, "refractory"
	}

	p.lastAcceptedAt = s.At
	return Event{At: s.At, Type: "crossing"}, true, "accepted"
}
