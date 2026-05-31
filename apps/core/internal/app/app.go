package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"inflightflow/apps/core/internal/config"
	"inflightflow/apps/core/internal/domain/commands"
	"inflightflow/apps/core/internal/domain/engine"
	"inflightflow/apps/core/internal/hardware/mock"
	"inflightflow/apps/core/internal/hardware/real"
	"inflightflow/apps/core/internal/health"
	"inflightflow/apps/core/internal/journal"
	"inflightflow/apps/core/internal/preflight"
	"inflightflow/apps/core/internal/sensor"
	"inflightflow/apps/core/internal/tournaments"
)

func Run() error {
	cfg := config.Load()
	if cfg.RequireOperatorPassword && cfg.SensorStreamPassword == "" {
		return fmt.Errorf("OPERATOR_PASSWORD is required when OPERATOR_PASSWORD_REQUIRED=true")
	}

	if err := journal.EnsurePath(cfg.JournalPath); err != nil {
		return err
	}
	domainRuntime := engine.NewRuntime(cfg.JournalPath)
	if err := domainRuntime.Restore(); err != nil {
		return err
	}
	dataDir := filepath.Dir(cfg.JournalPath)
	tournamentsDBPath := cfg.TournamentsDBPath
	if tournamentsDBPath == "" {
		tournamentsDBPath = filepath.Join(dataDir, "tournaments.db")
	}
	legacyTournamentsPath := filepath.Join(dataDir, "tournaments.json")
	tourStore, err := tournaments.Open(tournamentsDBPath)
	if err != nil {
		return err
	}
	defer func() {
		_ = tourStore.Close()
	}()
	if err := tourStore.MigrateLegacyJSON(legacyTournamentsPath); err != nil {
		return err
	}

	hardware := resolveHardwareMode(cfg.HardwareMode)
	sensorRuntime := sensor.NewRuntime(sensor.Config{
		DebounceWindow:   cfg.SensorDebounce,
		RefractoryWindow: cfg.SensorRefractory,
	}, cfg.SensorHistoryLimit)
	sensorHealthPolicy := sensor.DefaultHealthPolicy()
	preflightMgr := preflight.NewManager()
	var sensorWatchdog *sensor.GPIOWatchdog
	if cfg.HardwareMode == real.Name() && cfg.SensorSource == "gpio" {
		if cfg.SensorPowerEnabled {
			if err := sensor.EnablePowerLine(sensor.PowerConfig{
				Chip:   cfg.SensorPowerChip,
				Line:   cfg.SensorPowerLine,
				Active: cfg.SensorPowerActive,
			}); err != nil {
				return fmt.Errorf("enable sensor power line: %w", err)
			}
			log.Printf("sensor power enabled chip=%s line=%d active=%t", cfg.SensorPowerChip, cfg.SensorPowerLine, cfg.SensorPowerActive)
		}
		sensorWatchdog = sensor.StartGPIOReader(context.Background(), sensorRuntime, sensor.GPIOReaderConfig{
			Chip:      cfg.SensorGPIOChip,
			Line:      cfg.SensorGPIOLine,
			ActiveLow: cfg.SensorActiveLow,
		})
		log.Printf("sensor source=gpio chip=%s line=%d activeLow=%t", cfg.SensorGPIOChip, cfg.SensorGPIOLine, cfg.SensorActiveLow)
	}
	sensorSub := sensorRuntime.Subscribe()
	go func() {
		for item := range sensorSub {
			if !item.Accepted {
				continue
			}
			st := domainRuntime.State()
			if st.RoundState == engine.RoundPrepared {
				_, err := domainRuntime.Handle(commands.Command{
					Type: commands.CmdStartRound,
					Data: map[string]any{},
				})
				if err != nil {
					log.Printf("domain auto-start skipped: %v", err)
				}
			}
			_, err := domainRuntime.Handle(commands.Command{
				Type: commands.CmdAcceptCrossing,
				Data: map[string]any{"at": item.At.UnixMilli()},
			})
			if err != nil {
				log.Printf("domain accept_crossing skipped: %v", err)
			}
		}
	}()

	mux := http.NewServeMux()
	gate := passwordGate(cfg.RequireOperatorPassword, cfg.SensorStreamPassword)
	computeHealth := func() sensor.HealthStatus {
		snap := sensor.GPIOWatchdogSnapshot{}
		if sensorWatchdog != nil {
			snap = sensorWatchdog.Snapshot()
		}
		return sensor.EvaluateHealth(time.Now().UTC(), snap, sensorHealthPolicy, cfg.HardwareMode, cfg.SensorSource)
	}
	realtime := newRealtimeHub()
	buildRealtimePayload := func() realtimePayload {
		healthStatus := computeHealth()
		return realtimePayload{
			Core:      health.Response{Status: "ok", Service: "inflightflow-core", HardwareMode: hardware},
			Domain:    buildDomainPayload(tourStore, domainRuntime.State()),
			Sensor:    map[string]any{"enabled": sensorWatchdog != nil, "health": healthStatus},
			Readiness: map[string]any{"canStartRound": healthStatus.Level != sensor.HealthCritical, "health": healthStatus},
			Preflight: preflightMgr.Status(),
			ServerAt:  time.Now().UTC().Format(time.RFC3339Nano),
		}
	}
	go func() {
		t := time.NewTicker(120 * time.Millisecond)
		defer t.Stop()
		last := ""
		for range t.C {
			payload := buildRealtimePayload()
			raw, _ := json.Marshal(payload)
			if string(raw) == last {
				continue
			}
			last = string(raw)
			realtime.Broadcast(payload)
		}
	}()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, health.Response{
			Status:       "ok",
			Service:      "inflightflow-core",
			HardwareMode: hardware,
		})
	})
	mux.HandleFunc("/tournaments/getall", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		items, err := tourStore.List()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
			return
		}
		writeJSON(w, http.StatusOK, items)
	}))
	mux.HandleFunc("/tournaments/add", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body tournaments.Tournament
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.Name == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_required"})
			return
		}
		created, err := tourStore.Add(body)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_create_failed"})
			return
		}
		writeJSON(w, http.StatusOK, created)
	}))
	mux.HandleFunc("/tournaments/delete", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.ID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id_required"})
			return
		}
		if err := tourStore.Delete(body.ID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_delete_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": true,
			"id": body.ID,
		})
	}))
	mux.HandleFunc("/tournaments/current", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.ID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id_required"})
			return
		}
		if err := tourStore.SetCurrent(body.ID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "tournament_not_found"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_current_set_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": body.ID})
	}))
	mux.HandleFunc("/tournaments/getcurrent", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		items, err := tourStore.List()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
			return
		}
		if len(items) == 0 {
			writeJSON(w, http.StatusOK, map[string]any{
				"id":          "",
				"name":        "",
				"teams":       []any{},
				"disciplines": []any{},
				"stages":      []any{},
				"round":       []any{},
				"bust_value":  5,
				"skip_value":  20,
			})
			return
		}
		current, ok, err := tourStore.Current()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
			return
		}
		if !ok {
			current = items[0]
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"id":          current.ID,
			"name":        current.Name,
			"teams":       current.Teams,
			"disciplines": current.Disciplines,
			"stages":      current.Stages,
			"round":       current.Round,
			"bust_value":  current.BustValue,
			"skip_value":  current.SkipValue,
		})
	}))
	mux.HandleFunc("/tournaments/update", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body tournaments.Tournament
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.ID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id_required"})
			return
		}
		updated, err := tourStore.Update(body)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_update_failed"})
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}))
	mux.HandleFunc("/tournaments/current/update", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body tournaments.Tournament
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.ID == "" {
			current, ok, err := tourStore.Current()
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
				return
			}
			if !ok {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id_required"})
				return
			}
			body.ID = current.ID
		}
		updated, err := tourStore.Update(body)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_update_failed"})
			return
		}
		if err := tourStore.SetCurrent(updated.ID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_current_set_failed"})
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}))
	mux.HandleFunc("/actions/getstate", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"state": "administration",
		})
	})
	setAdministrationHandler := func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    true,
			"state": "administration",
		})
	}
	mux.HandleFunc("/actions/setadministration", setAdministrationHandler)
	mux.HandleFunc("/actions/setAdministration", setAdministrationHandler)
	appendFaultHandler := func(faultType string) http.HandlerFunc {
		return gate(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
				return
			}

			state := domainRuntime.State()
			if state.RoundID == "" {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "round_not_selected"})
				return
			}
			if state.RoundState != engine.RoundRunning {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "round_not_running"})
				return
			}

			body := map[string]any{}
			if r.Body != nil {
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
					writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
					return
				}
			}
			if body["device_type"] == nil || fmt.Sprint(body["device_type"]) == "" {
				body["device_type"] = "terminal"
			}

			current, ok, err := tourStore.Current()
			if err != nil || !ok {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
				return
			}

			updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
				appendRoundFault(round, faultType, state, body)
			})
			if err != nil || !changed {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "round_fault_update_failed"})
				return
			}
			if _, err := tourStore.Update(updated); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_update_failed"})
				return
			}

			payload := buildDomainPayload(tourStore, state)
			writeJSON(w, http.StatusOK, map[string]any{
				"ok":    true,
				"type":  faultType,
				"state": payload,
			})
		})
	}
	mux.HandleFunc("/actions/sendbust", appendFaultHandler("bust"))
	mux.HandleFunc("/actions/sendskip", appendFaultHandler("skip"))
	mux.HandleFunc("/actions/getallfaults", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		state := domainRuntime.State()
		if state.RoundID == "" {
			writeJSON(w, http.StatusOK, []any{})
			return
		}
		payload := buildDomainPayload(tourStore, state)
		if domain, ok := payload.(map[string]any); ok {
			if faults, exists := domain["RoundFaults"]; exists {
				writeJSON(w, http.StatusOK, faults)
				return
			}
		}
		writeJSON(w, http.StatusOK, []any{})
	}))
	mux.HandleFunc("/actions/editfaults", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		state := domainRuntime.State()
		if state.RoundID == "" {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "round_not_selected"})
			return
		}

		var faults []map[string]any
		if err := json.NewDecoder(r.Body).Decode(&faults); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}

		current, ok, err := tourStore.Current()
		if err != nil || !ok {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournaments_read_failed"})
			return
		}

		updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
			round["faults"] = faultListToAny(faults)
			realTime := numericInt64(round["time_real"])
			if realTime > 0 {
				round["time_result"] = computeFinalTimeMs(realTime, round, current)
			}
		})
		if err != nil || !changed {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "round_fault_update_failed"})
			return
		}
		if _, err := tourStore.Update(updated); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_update_failed"})
			return
		}

		payload := buildDomainPayload(tourStore, state)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    true,
			"state": payload,
		})
	}))

	// Placeholder protected route for operator control APIs.
	mux.HandleFunc("/v1/control/ping", gate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"message": "control channel alive"})
	}))
	mux.HandleFunc("/v1/realtime/ws", func(w http.ResponseWriter, r *http.Request) {
		if !authorized(r, cfg.RequireOperatorPassword, cfg.SensorStreamPassword) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		realtime.HandleWS(w, r)
	})
	mux.HandleFunc("/v1/domain/state", gate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, buildDomainPayload(tourStore, domainRuntime.State()))
	}))
	mux.HandleFunc("/v1/domain/command", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body struct {
			Type           string         `json:"type"`
			Data           map[string]any `json:"data"`
			IdempotencyKey string         `json:"idempotencyKey"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if err := validateCommandPayload(body.Type, body.Data); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if commands.Type(body.Type) == commands.CmdStartRound {
			health := computeHealth()
			if health.Level == sensor.HealthCritical {
				writeJSON(w, http.StatusConflict, map[string]any{
					"error":        "sensor_health_critical",
					"sensorHealth": health,
				})
				return
			}
		}
		evs, err := domainRuntime.Handle(commands.Command{
			Type:           commands.Type(body.Type),
			Data:           body.Data,
			IdempotencyKey: body.IdempotencyKey,
		})
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if err := syncTournamentRoundAfterCommand(tourStore, domainRuntime.State(), commands.Type(body.Type)); err != nil {
			log.Printf("tournament round sync failed after %s: %v", body.Type, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tournament_round_sync_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"state":  buildDomainPayload(tourStore, domainRuntime.State()),
			"events": evs,
		})
	}))
	mux.HandleFunc("/v1/domain/bootstrap", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body struct {
			TournamentID string `json:"tournamentId"`
			RoundID      string `json:"roundId"`
			KeyPrefix    string `json:"keyPrefix"`
			Profile      string `json:"profile"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if body.Profile != "" {
			profile, err := engine.ResolveProfile(body.Profile)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			if body.TournamentID == "" {
				body.TournamentID = profile.TournamentID
			}
			if body.RoundID == "" {
				body.RoundID = fmt.Sprintf("%s-%s", profile.RoundIDPrefix, time.Now().UTC().Format("150405"))
			}
			if body.KeyPrefix == "" {
				body.KeyPrefix = fmt.Sprintf("%s:%s", profile.IdempotencyPrefix, body.RoundID)
			}
		}
		if body.TournamentID == "" || body.RoundID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tournamentId and roundId are required"})
			return
		}
		if body.KeyPrefix == "" {
			body.KeyPrefix = fmt.Sprintf("bootstrap:%s:%s", body.TournamentID, body.RoundID)
		}

		state, events, err := domainRuntime.Bootstrap(body.TournamentID, body.RoundID, body.KeyPrefix)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"state":  state,
			"events": events,
		})
	}))
	mux.HandleFunc("/v1/domain/bootstrap/profiles", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"profiles": engine.DefaultProfiles()})
	}))

	// Live sensor debug endpoints for real hardware bring-up and noise analysis.
	mux.HandleFunc("/debug/sensor", gate(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, sensorDebugHTML)
	}))
	mux.HandleFunc("/debug/sensor/state", gate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, sensorRuntime.Snapshot())
	}))
	mux.HandleFunc("/debug/sensor/watchdog", gate(func(w http.ResponseWriter, _ *http.Request) {
		if sensorWatchdog == nil {
			writeJSON(w, http.StatusOK, map[string]any{"enabled": false})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"enabled":  true,
			"watchdog": sensorWatchdog.Snapshot(),
		})
	}))
	mux.HandleFunc("/v1/instructor/sensor-health", gate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"enabled": sensorWatchdog != nil,
			"health":  computeHealth(),
		})
	}))
	mux.HandleFunc("/v1/instructor/readiness", gate(func(w http.ResponseWriter, _ *http.Request) {
		health := computeHealth()
		canStartRound := health.Level != sensor.HealthCritical
		writeJSON(w, http.StatusOK, map[string]any{
			"canStartRound": canStartRound,
			"health":        health,
		})
	}))
	mux.HandleFunc("/v1/instructor/preflight/run", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		err := preflightMgr.Start(func() []preflight.StepResult {
			health := computeHealth()
			canStartRound := health.Level != sensor.HealthCritical
			steps := []preflight.StepResult{
				{Name: "core_health", Pass: true, Message: "core service reachable"},
				{Name: "sensor_health_endpoint", Pass: true, Message: "sensor health evaluated"},
				{
					Name:    "start_readiness_guard",
					Pass:    !(health.Level == sensor.HealthCritical && canStartRound),
					Message: "critical health must block start_round",
				},
				{
					Name:    "start_readiness",
					Pass:    canStartRound,
					Message: "ready to start round",
				},
			}
			if !canStartRound {
				steps[3].Message = "cannot start round until sensor health recovers"
			}
			return steps
		})
		if err != nil {
			if err == preflight.ErrAlreadyRunning {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "preflight_already_running"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "preflight_start_failed"})
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{
			"message": "preflight_started",
			"status":  preflightMgr.Status(),
		})
	}))
	mux.HandleFunc("/v1/instructor/preflight/status", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, preflightMgr.Status())
	}))
	mux.HandleFunc("/debug/sensor/sample", gate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var body struct {
			Level bool   `json:"level"`
			At    string `json:"at"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		at := time.Now().UTC()
		if body.At != "" {
			parsed, err := time.Parse(time.RFC3339Nano, body.At)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_at"})
				return
			}
			at = parsed
		}
		out, _ := sensorRuntime.Ingest(sensor.Sample{At: at, Level: body.Level})
		writeJSON(w, http.StatusOK, out)
	}))
	mux.HandleFunc("/debug/sensor/stream", gate(func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "stream_unsupported"})
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		sub := sensorRuntime.Subscribe()
		defer sensorRuntime.Unsubscribe(sub)

		for {
			select {
			case <-r.Context().Done():
				return
			case item := <-sub:
				payload, _ := json.Marshal(item)
				_, _ = fmt.Fprintf(w, "event: sample\ndata: %s\n\n", payload)
				flusher.Flush()
			}
		}
	}))

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("core listening on %s (hardware=%s)", addr, hardware)
	return http.ListenAndServe(addr, withCORS(mux))
}

func numericInt64(value any) int64 {
	switch v := value.(type) {
	case int:
		return int64(v)
	case int8:
		return int64(v)
	case int16:
		return int64(v)
	case int32:
		return int64(v)
	case int64:
		return v
	case uint:
		return int64(v)
	case uint8:
		return int64(v)
	case uint16:
		return int64(v)
	case uint32:
		return int64(v)
	case uint64:
		return int64(v)
	case float32:
		return int64(v)
	case float64:
		return int64(v)
	case json.Number:
		if parsed, err := v.Int64(); err == nil {
			return parsed
		}
		if parsed, err := v.Float64(); err == nil {
			return int64(parsed)
		}
	case string:
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			return parsed
		}
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			return int64(parsed)
		}
	}

	return 0
}

func numericFloat64(value any) float64 {
	switch v := value.(type) {
	case int:
		return float64(v)
	case int8:
		return float64(v)
	case int16:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	case uint:
		return float64(v)
	case uint8:
		return float64(v)
	case uint16:
		return float64(v)
	case uint32:
		return float64(v)
	case uint64:
		return float64(v)
	case float32:
		return float64(v)
	case float64:
		return v
	case json.Number:
		if parsed, err := v.Float64(); err == nil {
			return parsed
		}
	case string:
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			return parsed
		}
	}

	return 0
}

func nullableInt64(value any) any {
	switch value.(type) {
	case nil:
		return nil
	default:
		return numericInt64(value)
	}
}

func countValidFaultsByType(rawFaults any, faultType string) int64 {
	faults, ok := rawFaults.([]any)
	if !ok {
		return 0
	}

	var count int64
	for _, item := range faults {
		fault, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if fmt.Sprint(fault["type"]) != faultType {
			continue
		}
		if valid, exists := fault["valid"]; exists && valid == false {
			continue
		}
		count++
	}

	return count
}

func normalizeFaultList(rawFaults any) []map[string]any {
	faults, ok := rawFaults.([]any)
	if !ok {
		return []map[string]any{}
	}

	normalized := make([]map[string]any, 0, len(faults))
	for _, item := range faults {
		fault, ok := item.(map[string]any)
		if !ok {
			continue
		}
		normalized = append(normalized, fault)
	}

	return normalized
}

func faultListToAny(faults []map[string]any) []any {
	items := make([]any, 0, len(faults))
	for _, fault := range faults {
		items = append(items, fault)
	}
	return items
}

func appendRoundFault(round map[string]any, faultType string, state engine.State, payload map[string]any) {
	faultTime := numericInt64(payload["time"])
	if faultTime <= 0 && state.RoundStartedAt > 0 {
		faultTime = time.Now().UnixMilli() - state.RoundStartedAt
	}
	if faultTime < 0 {
		faultTime = 0
	}

	faults := normalizeFaultList(round["faults"])
	faults = append(faults, map[string]any{
		"id":          fmt.Sprintf("fault-%d", time.Now().UnixNano()),
		"type":        faultType,
		"time":        faultTime,
		"device_type": fmt.Sprint(payload["device_type"]),
		"device_id":   numericInt64(payload["device_id"]),
		"valid":       true,
	})
	round["faults"] = faultListToAny(faults)
}

func computeFinalTimeMs(realTimeMs int64, round map[string]any, current tournaments.Tournament) int64 {
	if realTimeMs <= 0 {
		return 0
	}

	bustCount := countValidFaultsByType(round["faults"], "bust")
	skipCount := countValidFaultsByType(round["faults"], "skip")
	bustValueMs := int64(numericFloat64(current.BustValue) * 1000)
	skipValueMs := int64(numericFloat64(current.SkipValue) * 1000)

	return realTimeMs + bustValueMs*bustCount + skipValueMs*skipCount
}

func buildDomainPayload(store *tournaments.Store, state engine.State) any {
	payload := map[string]any{
		"TournamentID":      state.TournamentID,
		"RoundID":           state.RoundID,
		"RoundState":        state.RoundState,
		"Crossings":         state.Crossings,
		"FirstCrossAt":      state.FirstCrossAt,
		"LastCrossAt":       state.LastCrossAt,
		"RoundStartedAt":    state.RoundStartedAt,
		"RoundEndedAt":      state.RoundEndedAt,
		"RoundResultMs":     state.RoundResultMs,
		"RoundFaults":       []any{},
		"BustCount":         0,
		"SkipCount":         0,
		"RoundTimeRealMs":   nil,
		"RoundTimeResultMs": nil,
	}

	if state.RoundID == "" {
		return payload
	}

	current, ok, err := store.Current()
	if err != nil || !ok {
		return payload
	}

	updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
		faults := faultListToAny(normalizeFaultList(round["faults"]))
		payload["RoundFaults"] = faults
		payload["BustCount"] = countValidFaultsByType(faults, "bust")
		payload["SkipCount"] = countValidFaultsByType(faults, "skip")
		payload["RoundTimeRealMs"] = nullableInt64(round["time_real"])
		payload["RoundTimeResultMs"] = nullableInt64(round["time_result"])
		if stage, ok := round["stage"].(map[string]any); ok {
			payload["StageName"] = fmt.Sprint(stage["name"])
		}
		if team, ok := round["team"].(map[string]any); ok {
			payload["TeamName"] = fmt.Sprint(team["name"])
		}
	})
	if err != nil || !changed {
		_ = updated
		return payload
	}

	return payload
}

func resolveHardwareMode(mode string) string {
	if mode == real.Name() {
		return real.Name()
	}
	return mock.Name()
}

func passwordGate(required bool, expected string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !authorized(r, required, expected) {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
				return
			}

			next(w, r)
		}
	}
}

func authorized(r *http.Request, required bool, expected string) bool {
	if expected == "" && !required {
		return true
	}
	if expected == "" && required {
		return false
	}
	provided := r.Header.Get("X-Operator-Password")
	if provided == "" {
		provided = r.URL.Query().Get("password")
	}
	return provided == expected
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Operator-Password")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func validateCommandPayload(cmdType string, data map[string]any) error {
	switch commands.Type(cmdType) {
	case commands.CmdCreateTournament:
		v, ok := data["tournamentId"].(string)
		if !ok || v == "" {
			return fmt.Errorf("tournamentId is required and must be string")
		}
	case commands.CmdPrepareRound:
		v, ok := data["roundId"].(string)
		if !ok || v == "" {
			return fmt.Errorf("roundId is required and must be string")
		}
	case commands.CmdAcceptCrossing:
		if _, okInt := data["at"].(int64); okInt {
			return nil
		}
		if _, okF := data["at"].(float64); okF {
			return nil
		}
		return fmt.Errorf("at is required and must be number")
	case commands.CmdStartRound, commands.CmdFinishRound, commands.CmdCancelRound:
		return nil
	default:
		return fmt.Errorf("unsupported command type: %s", cmdType)
	}
	return nil
}

func syncTournamentRoundAfterCommand(store *tournaments.Store, state engine.State, cmdType commands.Type) error {
	if store == nil {
		return nil
	}

	switch cmdType {
	case commands.CmdPrepareRound:
		if state.RoundID == "" {
			return nil
		}
		current, ok, err := store.Current()
		if err != nil || !ok {
			return err
		}
		updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
			round["faults"] = []any{}
			round["crossings"] = []any{}
			round["time_real"] = nil
			round["time_result"] = nil
			round["round_start"] = nil
			round["stage_rank"] = nil
			round["tournament_rank"] = nil
		})
		if err != nil || !changed {
			return err
		}
		_, err = store.Update(updated)
		return err
	case commands.CmdAcceptCrossing:
		if state.RoundID == "" || state.LastCrossAt <= 0 {
			return nil
		}
		current, ok, err := store.Current()
		if err != nil || !ok {
			return err
		}
		updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
			crossings := normalizeCrossings(round["crossings"])
			entry := map[string]any{
				"id":       fmt.Sprintf("crossing-%d-%d", state.Crossings, state.LastCrossAt),
				"at":       state.LastCrossAt,
				"accepted": true,
			}
			if crossingExists(crossings, entry["id"], state.LastCrossAt) {
				round["crossings"] = crossings
				return
			}
			round["crossings"] = append(crossings, entry)
		})
		if err != nil || !changed {
			return err
		}
		_, err = store.Update(updated)
		return err
	case commands.CmdFinishRound:
		if state.RoundID == "" {
			return nil
		}
		current, ok, err := store.Current()
		if err != nil || !ok {
			return err
		}
		updated, changed, err := current.UpdateRound(state.RoundID, func(round map[string]any) {
			round["time_result"] = computeFinalTimeMs(state.RoundResultMs, round, current)
			if _, exists := round["time_real"]; exists {
				round["time_real"] = state.RoundResultMs
			}
			if state.RoundStartedAt > 0 {
				round["round_start"] = state.RoundStartedAt
			}
		})
		if err != nil || !changed {
			return err
		}
		_, err = store.Update(updated)
		return err
	default:
		return nil
	}
}

func normalizeCrossings(raw any) []any {
	switch value := raw.(type) {
	case nil:
		return []any{}
	case []any:
		return append([]any{}, value...)
	case []map[string]any:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, item)
		}
		return out
	default:
		return []any{}
	}
}

func crossingExists(crossings []any, targetID any, targetAt int64) bool {
	id, _ := targetID.(string)
	for _, raw := range crossings {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if id != "" {
			if existingID, _ := item["id"].(string); existingID == id {
				return true
			}
		}
		switch at := item["at"].(type) {
		case int64:
			if at == targetAt {
				return true
			}
		case float64:
			if int64(at) == targetAt {
				return true
			}
		}
	}
	return false
}

const sensorDebugHTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>InflightFlow Sensor Debug</title>
    <style>
      body { font-family: Segoe UI, sans-serif; margin: 20px; }
      .row { display: flex; gap: 8px; margin-bottom: 12px; }
      button { padding: 8px 12px; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      .ok { color: #0a7f2e; font-weight: 600; }
      .bad { color: #b00020; font-weight: 600; }
      pre { background: #f5f5f5; padding: 12px; }
    </style>
  </head>
  <body>
    <h1>Sensor Live Debug</h1>
    <div class="row">
      <button onclick="sendSample(true)">Emit HIGH</button>
      <button onclick="sendSample(false)">Emit LOW</button>
      <button onclick="loadState()">Refresh State</button>
    </div>
    <pre id="stats">loading...</pre>
    <table>
      <thead><tr><th>At</th><th>Level</th><th>Accepted</th><th>Reason</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <script>
      const statsEl = document.getElementById("stats");
      const rows = document.getElementById("rows");
      function addRow(s) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + s.at + "</td><td>" + (s.level ? "HIGH" : "LOW") + "</td><td class='" + (s.accepted ? "ok" : "bad") + "'>" + s.accepted + "</td><td>" + s.reason + "</td>";
        rows.prepend(tr);
        while (rows.children.length > 200) rows.removeChild(rows.lastChild);
      }
      const q = new URLSearchParams(window.location.search);
      const pass = q.get("password") || "";
      const withPass = (path) => pass ? (path + (path.includes("?") ? "&" : "?") + "password=" + encodeURIComponent(pass)) : path;
      async function sendSample(level) {
        await fetch(withPass("/debug/sensor/sample"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level })
        });
      }
      async function loadState() {
        const r = await fetch(withPass("/debug/sensor/state"));
        const s = await r.json();
        statsEl.textContent = JSON.stringify(s, null, 2);
      }
      const ev = new EventSource(withPass("/debug/sensor/stream"));
      ev.addEventListener("sample", (e) => {
        const item = JSON.parse(e.data);
        addRow(item);
        loadState();
      });
      loadState();
    </script>
  </body>
</html>`
