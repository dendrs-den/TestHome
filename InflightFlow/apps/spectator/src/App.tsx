import React from "react";
import logo from "./assets/infoscreen_logo3.png";

type RoundState = "idle" | "prepared" | "running" | "completed" | "cancelled";

type DomainState = {
  TournamentID: string;
  RoundID: string;
  RoundState: RoundState;
  Crossings: number;
  RoundResultMs: number;
  Busts?: number;
  Skips?: number;
};

const CORE_BASE = "http://192.168.0.177:18080";

function toWebSocketUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.startsWith("https://")) return `wss://${trimmed.slice("https://".length)}/v1/realtime/ws`;
  if (trimmed.startsWith("http://")) return `ws://${trimmed.slice("http://".length)}/v1/realtime/ws`;
  return `ws://${trimmed}/v1/realtime/ws`;
}

function fmt(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const sec = Math.floor(safe / 1000);
  const milli = safe % 1000;
  return `${String(sec).padStart(4, "0")}:${String(milli).padStart(3, "0")}`;
}

function stateTitle(state: RoundState): string {
  if (state === "prepared") return "PREPARE";
  if (state === "running") return "PERFORMANCE";
  if (state === "completed") return "RESULT";
  if (state === "cancelled") return "CANCELLED";
  return "WAITING";
}

export default function App() {
  const [domain, setDomain] = React.useState<DomainState | null>(null);
  const [error, setError] = React.useState("");
  const [runningSince, setRunningSince] = React.useState<number | null>(null);
  const [tickMs, setTickMs] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const scheduleReconnect = () => {
      if (!active || reconnectTimer != null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1000);
    };

    const connect = () => {
      try {
        ws = new WebSocket(toWebSocketUrl(CORE_BASE));
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => setError("");
      ws.onmessage = (evt) => {
        if (!active) return;
        try {
          const msg = JSON.parse(String(evt.data)) as { domain: DomainState };
          const next = msg.domain;
          if (!next) return;
          setDomain((prev) => {
            if (next.RoundState === "running") {
              if (!prev || prev.RoundState !== "running" || prev.RoundID !== next.RoundID) {
                setRunningSince(Date.now());
                setTickMs(0);
              }
            } else {
              setRunningSince(null);
              setTickMs(0);
            }
            return next;
          });
          setError("");
        } catch {
          // Ignore malformed frame.
        }
      };
      ws.onclose = scheduleReconnect;
      ws.onerror = () => {
        setError("realtime unavailable");
      };
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  React.useEffect(() => {
    if (!runningSince) return;
    const t = setInterval(() => {
      setTickMs(Date.now() - runningSince);
    }, 33);
    return () => clearInterval(t);
  }, [runningSince]);

  const state = domain?.RoundState ?? "idle";
  const liveMs = state === "running" ? tickMs : (domain?.RoundResultMs ?? 0);
  const roundLabel = domain?.RoundID?.replace(/^round-?/i, "Round ") || "Round -";
  const pilotLabel = domain?.TournamentID || "-";
  const busts = domain?.Busts ?? 1;
  const skips = domain?.Skips ?? 1;

  return (
    <main className="spectator-screen">
      <section className="left-panel">
        <img className="flow-logo-image" src={logo} alt="Flow Moscow" />
        <div className="round-label">{roundLabel}</div>
        <div className="pilot-label">{pilotLabel}</div>
        <div className={`timer-main state-${state}`}>{fmt(liveMs)}</div>
      </section>

      <section className="right-panel">
        <div className="stats-line">
          <span>Busts: {busts}</span>
          <span>Skips: {skips}</span>
        </div>
        <div className="dots-line">
          <span className="dot" />
          <span className="dot" />
        </div>
      </section>

      {error ? <div className="error-banner">core unavailable: {error}</div> : null}
    </main>
  );
}
