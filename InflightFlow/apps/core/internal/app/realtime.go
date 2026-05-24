package app

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type realtimePayload struct {
	Core      any    `json:"core"`
	Domain    any    `json:"domain"`
	Sensor    any    `json:"sensor"`
	Readiness any    `json:"readiness"`
	Preflight any    `json:"preflight"`
	ServerAt  string `json:"serverAt"`
}

type realtimeHub struct {
	mu       sync.Mutex
	conns    map[*websocket.Conn]struct{}
	upgrader websocket.Upgrader
}

func newRealtimeHub() *realtimeHub {
	return &realtimeHub{
		conns: make(map[*websocket.Conn]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *realtimeHub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	h.mu.Lock()
	h.conns[conn] = struct{}{}
	h.mu.Unlock()

	go func() {
		defer h.remove(conn)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
}

func (h *realtimeHub) Broadcast(v any) {
	payload, err := json.Marshal(v)
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for conn := range h.conns {
		_ = conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			_ = conn.Close()
			delete(h.conns, conn)
		}
	}
}

func (h *realtimeHub) remove(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.conns[conn]; ok {
		_ = conn.Close()
		delete(h.conns, conn)
	}
}
