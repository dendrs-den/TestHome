package tournaments

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Tournament struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Teams       any    `json:"teams,omitempty"`
	Disciplines any    `json:"disciplines,omitempty"`
	Stages      any    `json:"stages,omitempty"`
	BustValue   any    `json:"bust_value,omitempty"`
	SkipValue   any    `json:"skip_value,omitempty"`
}

type Store struct {
	mu   sync.Mutex
	path string
}

func NewStore(path string) *Store {
	return &Store{path: path}
}

func (s *Store) List() ([]Tournament, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readUnsafe()
}

func (s *Store) Add(t Tournament) (Tournament, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	items, err := s.readUnsafe()
	if err != nil {
		return Tournament{}, err
	}
	if t.ID == "" {
		t.ID = fmt.Sprintf("tour-%d", time.Now().UnixNano())
	}
	items = append(items, t)
	if err := s.writeUnsafe(items); err != nil {
		return Tournament{}, err
	}
	return t, nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	items, err := s.readUnsafe()
	if err != nil {
		return err
	}

	filtered := make([]Tournament, 0, len(items))
	for _, it := range items {
		if it.ID != id {
			filtered = append(filtered, it)
		}
	}

	return s.writeUnsafe(filtered)
}

func (s *Store) Update(t Tournament) (Tournament, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	items, err := s.readUnsafe()
	if err != nil {
		return Tournament{}, err
	}

	updated := false
	for i := range items {
		if items[i].ID == t.ID {
			items[i] = t
			updated = true
			break
		}
	}
	if !updated {
		items = append(items, t)
	}

	if err := s.writeUnsafe(items); err != nil {
		return Tournament{}, err
	}
	return t, nil
}

func (s *Store) readUnsafe() ([]Tournament, error) {
	raw, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Tournament{}, nil
		}
		return nil, err
	}
	if len(raw) == 0 {
		return []Tournament{}, nil
	}
	var items []Tournament
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil, err
	}
	if items == nil {
		return []Tournament{}, nil
	}
	return items, nil
}

func (s *Store) writeUnsafe(items []Tournament) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}
