package sensor

import "time"

type HealthLevel string

const (
	HealthOK       HealthLevel = "OK"
	HealthWarning  HealthLevel = "WARNING"
	HealthCritical HealthLevel = "CRITICAL"
)

type HealthStatus struct {
	Level       HealthLevel          `json:"level"`
	Reasons     []string             `json:"reasons"`
	Watchdog    GPIOWatchdogSnapshot `json:"watchdog"`
	CheckedAt   time.Time            `json:"checkedAt"`
	Source      string               `json:"source"`
	Hardware    string               `json:"hardware"`
	SensorInput string               `json:"sensorInput"`
}

type HealthPolicy struct {
	NoEventWarningAfter  time.Duration
	NoEventCriticalAfter time.Duration
	RecentRestartWindow  time.Duration
}

func DefaultHealthPolicy() HealthPolicy {
	return HealthPolicy{
		NoEventWarningAfter:  30 * time.Second,
		NoEventCriticalAfter: 90 * time.Second,
		RecentRestartWindow:  30 * time.Second,
	}
}

func EvaluateHealth(now time.Time, watchdog GPIOWatchdogSnapshot, policy HealthPolicy, hardwareMode, sensorSource string) HealthStatus {
	st := HealthStatus{
		Level:       HealthOK,
		Reasons:     []string{},
		Watchdog:    watchdog,
		CheckedAt:   now.UTC(),
		Source:      "sensor_watchdog",
		Hardware:    hardwareMode,
		SensorInput: sensorSource,
	}

	// In mock/manual modes sensor watchdog is informational only.
	if hardwareMode != "real" || sensorSource != "gpio" {
		return st
	}

	if !watchdog.Running {
		st.Level = HealthCritical
		st.Reasons = append(st.Reasons, "gpio reader is not running")
	}

	if watchdog.RestartCount > 0 && !watchdog.LastStartAt.IsZero() && now.Sub(watchdog.LastStartAt) <= policy.RecentRestartWindow {
		if st.Level != HealthCritical {
			st.Level = HealthWarning
		}
		st.Reasons = append(st.Reasons, "gpio reader was recently restarted")
	}

	if !watchdog.LastEventAt.IsZero() {
		idle := now.Sub(watchdog.LastEventAt)
		if idle >= policy.NoEventCriticalAfter {
			st.Level = HealthCritical
			st.Reasons = append(st.Reasons, "no gpio events for too long")
		} else if idle >= policy.NoEventWarningAfter && st.Level == HealthOK {
			st.Level = HealthWarning
			st.Reasons = append(st.Reasons, "no recent gpio events")
		}
	}

	if watchdog.LastError != "" && st.Level == HealthOK {
		st.Level = HealthWarning
		st.Reasons = append(st.Reasons, "last reader error is present")
	}

	return st
}
