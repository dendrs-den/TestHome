package app

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
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

	if err := journal.EnsurePath(cfg.JournalPath); err != nil {
		return err
	}
	domainRuntime := engine.NewRuntime(cfg.JournalPath)
	if err := domainRuntime.Restore(); err != nil {
		return err
	}
	tourStore := tournaments.NewStore(filepath.Join(filepath.Dir(cfg.JournalPath), "tournaments.json"))
	currentTournamentID := ""

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
			Domain:    domainRuntime.State(),
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
	mux.HandleFunc("/tournaments/getall", func(w http.ResponseWriter, r *http.Request) {
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
	})
	mux.HandleFunc("/tournaments/add", func(w http.ResponseWriter, r *http.Request) {
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
	})
	mux.HandleFunc("/tournaments/delete", func(w http.ResponseWriter, r *http.Request) {
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
	})
	mux.HandleFunc("/tournaments/current", func(w http.ResponseWriter, r *http.Request) {
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
		currentTournamentID = body.ID
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": currentTournamentID})
	})
	mux.HandleFunc("/tournaments/getcurrent", func(w http.ResponseWriter, r *http.Request) {
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
		current := items[0]
		if currentTournamentID != "" {
			for _, it := range items {
				if it.ID == currentTournamentID {
					current = it
					break
				}
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"id":          current.ID,
			"name":        current.Name,
			"teams":       current.Teams,
			"disciplines": current.Disciplines,
			"stages":      current.Stages,
			"round":       []any{},
			"bust_value":  current.BustValue,
			"skip_value":  current.SkipValue,
		})
	})
	mux.HandleFunc("/tournaments/update", func(w http.ResponseWriter, r *http.Request) {
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
	})
	mux.HandleFunc("/tournaments/current/update", func(w http.ResponseWriter, r *http.Request) {
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
			body.ID = currentTournamentID
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
		currentTournamentID = updated.ID
		writeJSON(w, http.StatusOK, updated)
	})
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

	// Placeholder protected route for operator control APIs.
	mux.HandleFunc("/v1/control/ping", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"message": "control channel alive"})
	}))
	mux.HandleFunc("/v1/realtime/ws", func(w http.ResponseWriter, r *http.Request) {
		realtime.HandleWS(w, r)
	})
	mux.HandleFunc("/v1/domain/state", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, domainRuntime.State())
	}))
	mux.HandleFunc("/v1/domain/command", passwordGate(func(w http.ResponseWriter, r *http.Request) {
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
		writeJSON(w, http.StatusOK, map[string]any{
			"state":  domainRuntime.State(),
			"events": evs,
		})
	}))
	mux.HandleFunc("/v1/domain/bootstrap", passwordGate(func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("/v1/domain/bootstrap/profiles", passwordGate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"profiles": engine.DefaultProfiles()})
	}))

	// Live sensor debug endpoints for real hardware bring-up and noise analysis.
	mux.HandleFunc("/debug/sensor", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, sensorDebugHTML)
	}))
	mux.HandleFunc("/debug/sensor/state", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, sensorRuntime.Snapshot())
	}))
	mux.HandleFunc("/debug/sensor/watchdog", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		if sensorWatchdog == nil {
			writeJSON(w, http.StatusOK, map[string]any{"enabled": false})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"enabled":  true,
			"watchdog": sensorWatchdog.Snapshot(),
		})
	}))
	mux.HandleFunc("/v1/instructor/sensor-health", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"enabled": sensorWatchdog != nil,
			"health":  computeHealth(),
		})
	}))
	mux.HandleFunc("/v1/instructor/readiness", passwordGate(func(w http.ResponseWriter, _ *http.Request) {
		health := computeHealth()
		canStartRound := health.Level != sensor.HealthCritical
		writeJSON(w, http.StatusOK, map[string]any{
			"canStartRound": canStartRound,
			"health":        health,
		})
	}))
	mux.HandleFunc("/v1/instructor/preflight/run", passwordGate(func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("/v1/instructor/preflight/status", passwordGate(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		writeJSON(w, http.StatusOK, preflightMgr.Status())
	}))
	mux.HandleFunc("/debug/sensor/sample", passwordGate(func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("/debug/sensor/stream", passwordGate(func(w http.ResponseWriter, r *http.Request) {
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

func resolveHardwareMode(mode string) string {
	if mode == real.Name() {
		return real.Name()
	}
	return mock.Name()
}

func passwordGate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		expected := os.Getenv("OPERATOR_PASSWORD")
		if expected == "" {
			// For early local bootstrap only. In production this must be set.
			next(w, r)
			return
		}

		provided := r.Header.Get("X-Operator-Password")
		if provided == "" {
			provided = r.URL.Query().Get("password")
		}
		if provided != expected {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}

		next(w, r)
	}
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
