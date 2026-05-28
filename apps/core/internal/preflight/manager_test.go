package preflight

import (
	"testing"
	"time"
)

func TestManagerStartAndStatus(t *testing.T) {
	m := NewManager()
	err := m.Start(func() []StepResult {
		return []StepResult{
			{Name: "a", Pass: true},
			{Name: "b", Pass: true},
		}
	})
	if err != nil {
		t.Fatalf("start failed: %v", err)
	}
	time.Sleep(50 * time.Millisecond)
	st := m.Status()
	if st.Running {
		t.Fatalf("expected not running")
	}
	if st.Overall != "pass" {
		t.Fatalf("expected pass, got %s", st.Overall)
	}
}

func TestManagerAlreadyRunning(t *testing.T) {
	m := NewManager()
	err := m.Start(func() []StepResult {
		time.Sleep(100 * time.Millisecond)
		return []StepResult{{Name: "a", Pass: true}}
	})
	if err != nil {
		t.Fatalf("start failed: %v", err)
	}
	if err := m.Start(func() []StepResult { return nil }); err == nil {
		t.Fatalf("expected already running error")
	}
}
