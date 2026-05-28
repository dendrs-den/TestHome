package preflight

import (
	"errors"
	"sync"
	"time"
)

var ErrAlreadyRunning = errors.New("preflight_already_running")

type StepResult struct {
	Name    string `json:"name"`
	Pass    bool   `json:"pass"`
	Message string `json:"message"`
}

type Report struct {
	Running    bool         `json:"running"`
	LastRunAt  time.Time    `json:"lastRunAt"`
	FinishedAt time.Time    `json:"finishedAt"`
	Overall    string       `json:"overall"` // pending|pass|fail
	Steps      []StepResult `json:"steps"`
}

type Manager struct {
	mu     sync.RWMutex
	report Report
}

func NewManager() *Manager {
	return &Manager{
		report: Report{Overall: "pending"},
	}
}

func (m *Manager) Start(run func() []StepResult) error {
	m.mu.Lock()
	if m.report.Running {
		m.mu.Unlock()
		return ErrAlreadyRunning
	}
	m.report.Running = true
	m.report.LastRunAt = time.Now().UTC()
	m.report.FinishedAt = time.Time{}
	m.report.Overall = "pending"
	m.report.Steps = nil
	m.mu.Unlock()

	go func() {
		steps := run()
		overall := "pass"
		for _, s := range steps {
			if !s.Pass {
				overall = "fail"
				break
			}
		}
		m.mu.Lock()
		m.report.Running = false
		m.report.FinishedAt = time.Now().UTC()
		m.report.Overall = overall
		m.report.Steps = steps
		m.mu.Unlock()
	}()

	return nil
}

func (m *Manager) Status() Report {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cp := m.report
	cp.Steps = append([]StepResult(nil), m.report.Steps...)
	return cp
}
