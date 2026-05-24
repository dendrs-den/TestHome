package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port                 string
	HardwareMode         string
	JournalPath          string
	SensorDebounce       time.Duration
	SensorRefractory     time.Duration
	SensorHistoryLimit   int
	SensorStreamPassword string
	SensorSource         string
	SensorGPIOChip       string
	SensorGPIOLine       int
	SensorActiveLow      bool
	SensorPowerEnabled   bool
	SensorPowerChip      string
	SensorPowerLine      int
	SensorPowerActive    bool
}

func Load() Config {
	port := getEnv("CORE_PORT", "8080")
	mode := getEnv("HARDWARE_MODE", "mock")
	journal := getEnv("JOURNAL_PATH", "./data/journal.log")
	debounceMs := getEnvInt("SENSOR_DEBOUNCE_MS", 15)
	refractoryMs := getEnvInt("SENSOR_REFRACTORY_MS", 120)
	historyLimit := getEnvInt("SENSOR_HISTORY_LIMIT", 200)

	return Config{
		Port:                 port,
		HardwareMode:         mode,
		JournalPath:          journal,
		SensorDebounce:       time.Duration(debounceMs) * time.Millisecond,
		SensorRefractory:     time.Duration(refractoryMs) * time.Millisecond,
		SensorHistoryLimit:   historyLimit,
		SensorStreamPassword: getEnv("OPERATOR_PASSWORD", ""),
		SensorSource:         getEnv("SENSOR_SOURCE", "manual"),
		SensorGPIOChip:       getEnv("SENSOR_GPIO_CHIP", "gpiochip0"),
		SensorGPIOLine:       getEnvInt("SENSOR_GPIO_LINE", 17),
		SensorActiveLow:      getEnvBool("SENSOR_ACTIVE_LOW", false),
		SensorPowerEnabled:   getEnvBool("SENSOR_POWER_ENABLED", false),
		SensorPowerChip:      getEnv("SENSOR_POWER_CHIP", "gpiochip0"),
		SensorPowerLine:      getEnvInt("SENSOR_POWER_LINE", 27),
		SensorPowerActive:    getEnvBool("SENSOR_POWER_ACTIVE", true),
	}
}

func getEnv(k, d string) string {
	v := os.Getenv(k)
	if v == "" {
		return d
	}
	return v
}

func getEnvInt(k string, d int) int {
	v := os.Getenv(k)
	if v == "" {
		return d
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		return d
	}
	return parsed
}

func getEnvBool(k string, d bool) bool {
	v := os.Getenv(k)
	if v == "" {
		return d
	}
	switch v {
	case "1", "true", "TRUE", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "no", "NO", "off", "OFF":
		return false
	default:
		return d
	}
}
