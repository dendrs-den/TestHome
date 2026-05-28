package tournaments

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

const (
	currentTournamentKey = "current_tournament_id"
	legacyMigratedKey    = "legacy_tournaments_imported_at"
)

type Tournament struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Teams       any    `json:"teams,omitempty"`
	Disciplines any    `json:"disciplines,omitempty"`
	Stages      any    `json:"stages,omitempty"`
	Round       any    `json:"round,omitempty"`
	BustValue   any    `json:"bust_value,omitempty"`
	SkipValue   any    `json:"skip_value,omitempty"`
}

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	store := &Store{db: db}
	if err := store.init(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) init() error {
	stmts := []string{
		`PRAGMA journal_mode = WAL;`,
		`PRAGMA synchronous = NORMAL;`,
		`CREATE TABLE IF NOT EXISTS tournaments (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			payload TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);`,
	}
	for _, stmt := range stmts {
		if _, err := s.db.Exec(stmt); err != nil {
			return fmt.Errorf("init tournaments store: %w", err)
		}
	}
	return nil
}

func (s *Store) List() ([]Tournament, error) {
	rows, err := s.db.Query(`SELECT payload FROM tournaments ORDER BY updated_at ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Tournament{}
	for rows.Next() {
		var payload string
		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}
		var item Tournament
		if err := json.Unmarshal([]byte(payload), &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) Add(t Tournament) (Tournament, error) {
	if t.ID == "" {
		t.ID = fmt.Sprintf("tour-%d", time.Now().UnixNano())
	}
	return s.Upsert(t)
}

func (s *Store) Update(t Tournament) (Tournament, error) {
	if t.ID == "" {
		return Tournament{}, errors.New("id is required")
	}
	return s.Upsert(t)
}

func (s *Store) Upsert(t Tournament) (Tournament, error) {
	if t.Name == "" {
		return Tournament{}, errors.New("name is required")
	}
	payload, err := json.Marshal(t)
	if err != nil {
		return Tournament{}, err
	}
	_, err = s.db.Exec(
		`INSERT INTO tournaments (id, name, payload, updated_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   name = excluded.name,
		   payload = excluded.payload,
		   updated_at = excluded.updated_at`,
		t.ID,
		t.Name,
		string(payload),
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil {
		return Tournament{}, err
	}
	return t, nil
}

func (s *Store) Delete(id string) error {
	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.Exec(`DELETE FROM tournaments WHERE id = ?`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM metadata WHERE key = ? AND value = ?`, currentTournamentKey, id); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) SetCurrent(id string) error {
	if id == "" {
		return errors.New("id is required")
	}
	exists, err := s.exists(id)
	if err != nil {
		return err
	}
	if !exists {
		return sql.ErrNoRows
	}
	return s.setMetadata(currentTournamentKey, id)
}

func (s *Store) Current() (Tournament, bool, error) {
	id, ok, err := s.metadata(currentTournamentKey)
	if err != nil {
		return Tournament{}, false, err
	}
	if ok {
		item, found, err := s.byID(id)
		if err != nil {
			return Tournament{}, false, err
		}
		if found {
			return item, true, nil
		}
	}

	items, err := s.List()
	if err != nil {
		return Tournament{}, false, err
	}
	if len(items) == 0 {
		return Tournament{}, false, nil
	}
	return items[0], true, nil
}

func (s *Store) MigrateLegacyJSON(path string) error {
	items, err := s.List()
	if err != nil {
		return err
	}
	if len(items) > 0 {
		return nil
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	if len(raw) == 0 {
		return nil
	}

	var legacy []Tournament
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return fmt.Errorf("decode legacy tournaments json: %w", err)
	}
	for _, item := range legacy {
		if _, err := s.Upsert(item); err != nil {
			return err
		}
	}
	if len(legacy) > 0 {
		if err := s.setMetadata(legacyMigratedKey, time.Now().UTC().Format(time.RFC3339Nano)); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) byID(id string) (Tournament, bool, error) {
	var payload string
	err := s.db.QueryRow(`SELECT payload FROM tournaments WHERE id = ?`, id).Scan(&payload)
	if errors.Is(err, sql.ErrNoRows) {
		return Tournament{}, false, nil
	}
	if err != nil {
		return Tournament{}, false, err
	}
	var item Tournament
	if err := json.Unmarshal([]byte(payload), &item); err != nil {
		return Tournament{}, false, err
	}
	return item, true, nil
}

func (s *Store) exists(id string) (bool, error) {
	var exists int
	err := s.db.QueryRow(`SELECT 1 FROM tournaments WHERE id = ?`, id).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (s *Store) metadata(key string) (string, bool, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM metadata WHERE key = ?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return value, true, nil
}

func (s *Store) setMetadata(key, value string) error {
	_, err := s.db.Exec(
		`INSERT INTO metadata (key, value)
		 VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key,
		value,
	)
	return err
}
