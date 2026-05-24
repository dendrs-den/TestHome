package sensor

import "time"

type HealthLevel string
type HealthAction string

const (
	HealthOK       HealthLevel = "OK"
	HealthWarning  HealthLevel = "WARNING"
	HealthCritical HealthLevel = "CRITICAL"

	ActionNone          HealthAction = "NONE"
	ActionCheckWiring   HealthAction = "CHECK_WIRING"
	ActionRestartSensor HealthAction = "RESTART_SENSOR"
	ActionHoldStart     HealthAction = "HOLD_START"
)

type HealthStatus struct {
	Level       HealthLevel          `json:"level"`
	Action      HealthAction         `json:"action"`
	Reasons     []string             `json:"reasons"`
	Watchdog    GPIOWatchdogSnapshot `json:"watchdog"`
	CheckedAt   time.Time            `json:"checkedAt"`
	Source      string               `json:"source"`
	Hardware    string               `json:"hardware"`
	SensorInput string               `json:"sensorInput"`
}

type HealthPolicy struct {
	RecentRestartWindow time.Duration
}

func DefaultHealthPolicy() HealthPolicy {
	return HealthPolicy{
		RecentRestartWindow: 30 * time.Second,
	}
}

func EvaluateHealth(now time.Time, watchdog GPIOWatchdogSnapshot, policy HealthPolicy, hardwareMode, sensorSource string) HealthStatus {
	st := HealthStatus{
		Level:       HealthOK,
		Action:      ActionNone,
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
		st.Action = ActionHoldStart
		st.Reasons = append(st.Reasons, "gpio reader is not running")
	}

	if watchdog.RestartCount > 0 && !watchdog.LastStartAt.IsZero() && now.Sub(watchdog.LastStartAt) <= policy.RecentRestartWindow {
		if st.Level != HealthCritical {
			st.Level = HealthWarning
			st.Action = ActionRestartSensor
		}
		st.Reasons = append(st.Reasons, "gpio reader was recently restarted")
	}

	if watchdog.LastError != "" &&
		st.Level == HealthOK &&
		!watchdog.LastStartAt.IsZero() &&
		now.Sub(watchdog.LastStartAt) <= policy.RecentRestartWindow {
		st.Level = HealthWarning
		st.Action = ActionRestartSensor
		st.Reasons = append(st.Reasons, "last reader error is present")
	}

	return st
}
