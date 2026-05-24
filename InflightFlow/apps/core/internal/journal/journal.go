package journal

import (
	"fmt"
	"os"
	"path/filepath"
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
