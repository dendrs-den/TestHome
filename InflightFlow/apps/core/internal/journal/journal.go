package journal

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"inflightflow/apps/core/internal/domain/events"
)

func EnsurePath(filePath string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create journal dir: %w", err)
	}
	f, err := os.OpenFile(filePath, os.O_CREATE, 0o644)
	if err != nil {
		return fmt.Errorf("open journal file: %w", err)
	}
	return f.Close()
}

func Append(filePath string, ev events.Event) error {
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o644)
	if err != nil {
		return fmt.Errorf("open journal append: %w", err)
	}
	defer f.Close()

	b, err := json.Marshal(ev)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	if _, err := f.Write(append(b, '\n')); err != nil {
		return fmt.Errorf("write event: %w", err)
	}
	return nil
}

func Replay(filePath string) ([]events.Event, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("open journal replay: %w", err)
	}
	defer f.Close()

	out := make([]events.Event, 0)
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var ev events.Event
		if err := json.Unmarshal(line, &ev); err != nil {
			return nil, fmt.Errorf("unmarshal journal line: %w", err)
		}
		out = append(out, ev)
	}
	if err := sc.Err(); err != nil {
		return nil, fmt.Errorf("scan journal: %w", err)
	}
	return out, nil
}
