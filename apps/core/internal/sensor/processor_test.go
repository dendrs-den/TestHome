package sensor

import (
	"testing"
	"time"
)

func TestProcessor_AcceptsRisingEdge(t *testing.T) {
	p := NewProcessor(Config{
		DebounceWindow:   15 * time.Millisecond,
		RefractoryWindow: 120 * time.Millisecond,
	})

	t0 := time.Unix(100, 0)
	_, ok, reason := p.Ingest(Sample{At: t0, Level: false})
	if ok || reason != "initialized_idle" {
		t.Fatalf("expected idle init, got ok=%v reason=%s", ok, reason)
	}

	ev, ok, reason := p.Ingest(Sample{At: t0.Add(20 * time.Millisecond), Level: true})
	if !ok || reason != "accepted" {
		t.Fatalf("expected accepted event, got ok=%v reason=%s", ok, reason)
	}
	if ev.Type != "crossing" {
		t.Fatalf("unexpected event type: %s", ev.Type)
	}
}

func TestProcessor_DebounceBlocksFastToggle(t *testing.T) {
	p := NewProcessor(Config{
		DebounceWindow:   20 * time.Millisecond,
		RefractoryWindow: 0,
	})
	t0 := time.Unix(200, 0)

	p.Ingest(Sample{At: t0, Level: false})
	p.Ingest(Sample{At: t0.Add(30 * time.Millisecond), Level: true}) // accepted edge

	_, ok, reason := p.Ingest(Sample{At: t0.Add(35 * time.Millisecond), Level: false})
	if ok || reason != "debounced" {
		t.Fatalf("expected debounced, got ok=%v reason=%s", ok, reason)
	}
}

func TestProcessor_RefractoryBlocksDuplicateCrossings(t *testing.T) {
	p := NewProcessor(Config{
		DebounceWindow:   5 * time.Millisecond,
		RefractoryWindow: 150 * time.Millisecond,
	})
	t0 := time.Unix(300, 0)

	p.Ingest(Sample{At: t0, Level: false})
	p.Ingest(Sample{At: t0.Add(20 * time.Millisecond), Level: true})  // accepted
	p.Ingest(Sample{At: t0.Add(40 * time.Millisecond), Level: false}) // accepted edge, no event

	_, ok, reason := p.Ingest(Sample{At: t0.Add(70 * time.Millisecond), Level: true})
	if ok || reason != "refractory" {
		t.Fatalf("expected refractory, got ok=%v reason=%s", ok, reason)
	}
}

func TestProcessor_SecondCrossingAcceptedAfterRefractory(t *testing.T) {
	p := NewProcessor(Config{
		DebounceWindow:   5 * time.Millisecond,
		RefractoryWindow: 100 * time.Millisecond,
	})
	t0 := time.Unix(400, 0)

	p.Ingest(Sample{At: t0, Level: false})
	p.Ingest(Sample{At: t0.Add(20 * time.Millisecond), Level: true})  // first accepted
	p.Ingest(Sample{At: t0.Add(40 * time.Millisecond), Level: false}) // reset

	_, ok, reason := p.Ingest(Sample{At: t0.Add(160 * time.Millisecond), Level: true})
	if !ok || reason != "accepted" {
		t.Fatalf("expected accepted second crossing, got ok=%v reason=%s", ok, reason)
	}
}

func TestProcessor_RejectsZeroTimestamp(t *testing.T) {
	p := NewProcessor(Config{})
	_, ok, reason := p.Ingest(Sample{At: time.Time{}, Level: true})
	if ok || reason != "invalid_timestamp" {
		t.Fatalf("expected invalid_timestamp, got ok=%v reason=%s", ok, reason)
	}
}
