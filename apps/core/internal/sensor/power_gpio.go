package sensor

import (
	"fmt"
	"os/exec"
)

type PowerConfig struct {
	Chip   string
	Line   int
	Active bool
}

// EnablePowerLine keeps configured GPIO line in required output state.
// It uses "gpioset -z", so state is held by detached process.
func EnablePowerLine(cfg PowerConfig) error {
	value := "0"
	if cfg.Active {
		value = "1"
	}

	// Stop previous holder for same line if exists.
	_ = exec.Command("pkill", "-f", fmt.Sprintf("gpioset -z --chip %s %d", cfg.Chip, cfg.Line)).Run()

	cmd := exec.Command("gpioset", "-z", "--chip", cfg.Chip, fmt.Sprintf("%d=%s", cfg.Line, value))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("gpioset power line: %w", err)
	}
	return nil
}
