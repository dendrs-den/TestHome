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
	if h.Action != ActionHoldStart {
		t.Fatalf("expected HOLD_START, got %s", h.Action)
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
	if h.Action != ActionRestartSensor {
		t.Fatalf("expected RESTART_SENSOR, got %s", h.Action)
	}
}

func TestEvaluateHealthNoEventDoesNotTriggerWarningOrCritical(t *testing.T) {
	now := time.Now().UTC()
	p := DefaultHealthPolicy()
	w := GPIOWatchdogSnapshot{
		Running:     true,
		LastEventAt: now.Add(-2 * time.Minute),
	}
	h := EvaluateHealth(now, w, p, "real", "gpio")
	if h.Level != HealthOK {
		t.Fatalf("expected OK, got %s", h.Level)
	}
	if h.Action != ActionNone {
		t.Fatalf("expected NONE, got %s", h.Action)
	}
}

func TestEvaluateHealthReturnsToOKAfterRestartWindow(t *testing.T) {
	now := time.Now().UTC()
	p := DefaultHealthPolicy()
	w := GPIOWatchdogSnapshot{
		Running:      true,
		RestartCount: 1,
		LastError:    "gpiomon exited",
		LastStartAt:  now.Add(-(p.RecentRestartWindow + 5*time.Second)),
		LastEventAt:  now.Add(-5 * time.Second),
	}
	h := EvaluateHealth(now, w, p, "real", "gpio")
	if h.Level != HealthOK {
		t.Fatalf("expected OK, got %s", h.Level)
	}
	if h.Action != ActionNone {
		t.Fatalf("expected NONE, got %s", h.Action)
	}
}
