package sensor

import (
	"sync"
	"time"
)

type GPIOWatchdogSnapshot struct {
	Running      bool      `json:"running"`
	RestartCount int       `json:"restartCount"`
	LastError    string    `json:"lastError"`
	LastEventAt  time.Time `json:"lastEventAt"`
	LastStartAt  time.Time `json:"lastStartAt"`
}

type GPIOWatchdog struct {
	mu           sync.RWMutex
	running      bool
	restartCount int
	lastError    string
	lastEventAt  time.Time
	lastStartAt  time.Time
}

func NewGPIOWatchdog() *GPIOWatchdog {
	return &GPIOWatchdog{}
}

func (w *GPIOWatchdog) MarkStart() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.running = true
	w.lastStartAt = time.Now().UTC()
}

func (w *GPIOWatchdog) MarkStop(err error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.running = false
	if err != nil {
		w.lastError = err.Error()
		w.restartCount++
	}
}

func (w *GPIOWatchdog) MarkEvent(at time.Time) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.lastEventAt = at
}

func (w *GPIOWatchdog) Snapshot() GPIOWatchdogSnapshot {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return GPIOWatchdogSnapshot{
		Running:      w.running,
		RestartCount: w.restartCount,
		LastError:    w.lastError,
		LastEventAt:  w.lastEventAt,
		LastStartAt:  w.lastStartAt,
	}
}
