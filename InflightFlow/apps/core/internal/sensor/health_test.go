package sensor

import (
	"testing"
	"time"
)

func TestEvaluateHealthCriticalWhenReaderDown(t *testing.T) {
	now := time.Now().UTC()
	p := DefaultHealthPolicy()
	w := GPIOWatchdogSnapshot{Running: false}
	h := EvaluateHealth(now, w, p, "real", "gpio")
	if h.Level != HealthCritical {
		t.Fatalf("expected CRITICAL, got %s", h.Level)
	}
}

func TestEvaluateHealthWarningOnRecentRestart(t *testing.T) {
	now := time.Now().UTC()
	p := DefaultHealthPolicy()
	w := GPIOWatchdogSnapshot{
		Running:      true,
		RestartCount: 1,
		LastStartAt:  now.Add(-5 * time.Second),
	}
	h := EvaluateHealth(now, w, p, "real", "gpio")
	if h.Level != HealthWarning {
		t.Fatalf("expected WARNING, got %s", h.Level)
	}
}

func TestEvaluateHealthCriticalNoEvents(t *testing.T) {
	now := time.Now().UTC()
	p := DefaultHealthPolicy()
	w := GPIOWatchdogSnapshot{
		Running:     true,
		LastEventAt: now.Add(-2 * time.Minute),
	}
	h := EvaluateHealth(now, w, p, "real", "gpio")
	if h.Level != HealthCritical {
		t.Fatalf("expected CRITICAL, got %s", h.Level)
	}
}
