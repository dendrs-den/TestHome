package sensor

import (
	"sync"
	"time"
)

type ProcessedSample struct {
	At       time.Time `json:"at"`
	Level    bool      `json:"level"`
	Accepted bool      `json:"accepted"`
	Reason   string    `json:"reason"`
}

type Snapshot struct {
	RawCount      int               `json:"rawCount"`
	AcceptedCount int               `json:"acceptedCount"`
	Debounced     int               `json:"debounced"`
	Refractory    int               `json:"refractory"`
	LastSamples   []ProcessedSample `json:"lastSamples"`
}

type Runtime struct {
	mu      sync.RWMutex
	proc    *Processor
	limit   int
	raw     int
	acc     int
	deb     int
	refr    int
	samples []ProcessedSample
	subs    map[chan ProcessedSample]struct{}
}

func NewRuntime(cfg Config, historyLimit int) *Runtime {
	if historyLimit <= 0 {
		historyLimit = 200
	}
	return &Runtime{
		proc:  NewProcessor(cfg),
		limit: historyLimit,
		subs:  make(map[chan ProcessedSample]struct{}),
	}
}

func (r *Runtime) Ingest(s Sample) (ProcessedSample, bool) {
	ev, ok, reason := r.proc.Ingest(s)
	ps := ProcessedSample{
		At:       s.At,
		Level:    s.Level,
		Accepted: ok,
		Reason:   reason,
	}
	if ok && !ev.At.IsZero() {
		ps.At = ev.At
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.raw++
	if ok {
		r.acc++
	}
	if reason == "debounced" {
		r.deb++
	}
	if reason == "refractory" {
		r.refr++
	}
	r.samples = append(r.samples, ps)
	if len(r.samples) > r.limit {
		r.samples = r.samples[len(r.samples)-r.limit:]
	}
	for ch := range r.subs {
		select {
		case ch <- ps:
		default:
		}
	}
	return ps, ok
}

func (r *Runtime) Snapshot() Snapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := make([]ProcessedSample, len(r.samples))
	copy(cp, r.samples)
	return Snapshot{
		RawCount:      r.raw,
		AcceptedCount: r.acc,
		Debounced:     r.deb,
		Refractory:    r.refr,
		LastSamples:   cp,
	}
}

func (r *Runtime) Subscribe() chan ProcessedSample {
	r.mu.Lock()
	defer r.mu.Unlock()
	ch := make(chan ProcessedSample, 64)
	r.subs[ch] = struct{}{}
	return ch
}

func (r *Runtime) Unsubscribe(ch chan ProcessedSample) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.subs, ch)
	close(ch)
}
