package journal

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"inflightflow/apps/core/internal/domain/events"
)

var (
	journalRotateMaxBytes   int64 = 10 * 1024 * 1024
	journalRotateMaxBackups       = 3
)

type IdempotencyRecord struct {
	Key    string         `json:"key"`
	Events []events.Event `json:"events"`
}

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

func DedupPath(journalPath string) string {
	return journalPath + ".dedup.log"
}

func Append(filePath string, ev events.Event) error {
	b, err := json.Marshal(ev)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	if err := rotateIfNeeded(filePath, int64(len(b)+1)); err != nil {
		return fmt.Errorf("rotate journal: %w", err)
	}
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o644)
	if err != nil {
		return fmt.Errorf("open journal append: %w", err)
	}
	defer f.Close()
	if _, err := f.Write(append(b, '\n')); err != nil {
		return fmt.Errorf("write event: %w", err)
	}
	return nil
}

func AppendIdempotency(filePath string, rec IdempotencyRecord) error {
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o644)
	if err != nil {
		return fmt.Errorf("open dedup append: %w", err)
	}
	defer f.Close()

	b, err := json.Marshal(rec)
	if err != nil {
		return fmt.Errorf("marshal dedup record: %w", err)
	}
	if _, err := f.Write(append(b, '\n')); err != nil {
		return fmt.Errorf("write dedup record: %w", err)
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

func ReplayIdempotency(filePath string) (map[string][]events.Event, error) {
	f, err := os.OpenFile(filePath, os.O_RDONLY|os.O_CREATE, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open dedup replay: %w", err)
	}
	defer f.Close()

	out := make(map[string][]events.Event)
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var rec IdempotencyRecord
		if err := json.Unmarshal(line, &rec); err != nil {
			return nil, fmt.Errorf("unmarshal dedup line: %w", err)
		}
		if rec.Key == "" {
			continue
		}
		out[rec.Key] = rec.Events
	}
	if err := sc.Err(); err != nil {
		return nil, fmt.Errorf("scan dedup: %w", err)
	}
	return out, nil
}

func rotateIfNeeded(filePath string, incomingBytes int64) error {
	if journalRotateMaxBytes <= 0 || journalRotateMaxBackups <= 0 {
		return nil
	}
	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if info.Size()+incomingBytes <= journalRotateMaxBytes {
		return nil
	}

	oldest := fmt.Sprintf("%s.%d", filePath, journalRotateMaxBackups)
	if err := os.Remove(oldest); err != nil && !os.IsNotExist(err) {
		return err
	}
	for i := journalRotateMaxBackups - 1; i >= 1; i-- {
		src := fmt.Sprintf("%s.%d", filePath, i)
		dst := fmt.Sprintf("%s.%d", filePath, i+1)
		if err := os.Rename(src, dst); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	if err := os.Rename(filePath, filePath+".1"); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
