package sensor

import (
	"errors"
	"testing"
	"time"
)

func TestGPIOWatchdogLifecycle(t *testing.T) {
	wd := NewGPIOWatchdog()
	st := wd.Snapshot()
	if st.Running || st.RestartCount != 0 {
		t.Fatalf("unexpected initial snapshot: %+v", st)
	}

	wd.MarkStart()
	wd.MarkEvent(time.Unix(100, 0).UTC())
	wd.MarkStop(errors.New("boom"))

	st = wd.Snapshot()
	if st.Running {
		t.Fatalf("expected not running after stop")
	}
	if st.RestartCount != 1 {
		t.Fatalf("expected restartCount=1, got %d", st.RestartCount)
	}
	if st.LastError == "" {
		t.Fatalf("expected last error to be set")
	}
	if st.LastEventAt.IsZero() {
		t.Fatalf("expected last event timestamp")
	}
	if st.LastStartAt.IsZero() {
		t.Fatalf("expected last start timestamp")
	}
}
