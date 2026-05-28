package tournaments

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestStoreMigratesLegacyJSONOnce(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "tournaments.db")
	legacyPath := filepath.Join(dir, "tournaments.json")

	legacy := []Tournament{
		{ID: "t-1", Name: "Cup One"},
		{ID: "t-2", Name: "Cup Two"},
	}
	raw, err := json.Marshal(legacy)
	if err != nil {
		t.Fatalf("marshal legacy: %v", err)
	}
	if err := os.WriteFile(legacyPath, raw, 0o644); err != nil {
		t.Fatalf("write legacy: %v", err)
	}

	store, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer store.Close()

	if err := store.MigrateLegacyJSON(legacyPath); err != nil {
		t.Fatalf("migrate legacy: %v", err)
	}
	if _, err := store.Add(Tournament{ID: "t-3", Name: "Cup Three"}); err != nil {
		t.Fatalf("add explicit tournament: %v", err)
	}
	if err := store.MigrateLegacyJSON(legacyPath); err != nil {
		t.Fatalf("repeat migrate legacy: %v", err)
	}

	items, err := store.List()
	if err != nil {
		t.Fatalf("list tournaments: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 tournaments after single migration, got %d", len(items))
	}
}

func TestStorePersistsCurrentTournament(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "tournaments.db")

	store, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer store.Close()

	if _, err := store.Add(Tournament{ID: "t-1", Name: "Cup One"}); err != nil {
		t.Fatalf("add t-1: %v", err)
	}
	if _, err := store.Add(Tournament{ID: "t-2", Name: "Cup Two"}); err != nil {
		t.Fatalf("add t-2: %v", err)
	}
	if err := store.SetCurrent("t-2"); err != nil {
		t.Fatalf("set current: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close store: %v", err)
	}

	store, err = Open(dbPath)
	if err != nil {
		t.Fatalf("re-open store: %v", err)
	}
	defer store.Close()

	current, ok, err := store.Current()
	if err != nil {
		t.Fatalf("read current: %v", err)
	}
	if !ok {
		t.Fatalf("expected current tournament to exist")
	}
	if current.ID != "t-2" {
		t.Fatalf("expected current tournament t-2, got %s", current.ID)
	}
}
