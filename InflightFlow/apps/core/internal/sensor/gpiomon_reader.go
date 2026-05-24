package sensor

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"
)

type GPIOReaderConfig struct {
	Chip      string
	Line      int
	ActiveLow bool
}

// StartGPIOReader bridges libgpiod gpiomon events into sensor runtime samples.
func StartGPIOReader(ctx context.Context, rt *Runtime, cfg GPIOReaderConfig) *GPIOWatchdog {
	wd := NewGPIOWatchdog()
	go func() {
		for {
			wd.MarkStart()
			if err := runGPIOReader(ctx, rt, cfg, wd); err != nil {
				wd.MarkStop(err)
				log.Printf("sensor gpio reader stopped: %v", err)
			} else {
				wd.MarkStop(nil)
			}
			select {
			case <-ctx.Done():
				return
			case <-time.After(2 * time.Second):
			}
		}
	}()
	return wd
}

func runGPIOReader(ctx context.Context, rt *Runtime, cfg GPIOReaderConfig, wd *GPIOWatchdog) error {
	args := []string{
		"--chip", cfg.Chip,
		"--edges", "both",
		"--format", "%E",
		fmt.Sprintf("%d", cfg.Line),
	}
	if cfg.ActiveLow {
		args = append([]string{"--active-low"}, args...)
	}

	cmd := exec.CommandContext(ctx, "gpiomon", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("gpiomon stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("gpiomon stderr pipe: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start gpiomon: %w", err)
	}

	go func() {
		sc := bufio.NewScanner(stderr)
		for sc.Scan() {
			log.Printf("gpiomon: %s", sc.Text())
		}
	}()

	sc := bufio.NewScanner(stdout)
	for sc.Scan() {
		line := strings.TrimSpace(strings.ToLower(sc.Text()))
		now := time.Now().UTC()
		switch line {
		case "rising":
			rt.Ingest(Sample{At: now, Level: true})
			wd.MarkEvent(now)
		case "falling":
			rt.Ingest(Sample{At: now, Level: false})
			wd.MarkEvent(now)
		default:
			// Ignore unknown lines, but keep running.
		}
	}
	if err := sc.Err(); err != nil {
		_ = cmd.Wait()
		return fmt.Errorf("read gpiomon output: %w", err)
	}
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("gpiomon exited: %w", err)
	}
	return nil
}
