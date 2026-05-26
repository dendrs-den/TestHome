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

const CORE_PORT = 18080;
const STORAGE_KEY = "inflightflow.core.ip.spectator";

function isIPv4(value: string): boolean {
  const trimmed = value.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

async function checkCoreHealth(ip: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`http://${ip}:${CORE_PORT}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const json = (await res.json()) as { status?: string };
    return json.status === "ok";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

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

export default function App() {
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
  const defaultIp = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
  const [serverIp, setServerIp] = React.useState<string>(() => localStorage.getItem(STORAGE_KEY) || defaultIp);
  const [inputIp, setInputIp] = React.useState<string>(serverIp);
  const [checkingServer, setCheckingServer] = React.useState(true);
  const [showServerDialog, setShowServerDialog] = React.useState(false);
  const [serverDialogError, setServerDialogError] = React.useState("");

  const [domain, setDomain] = React.useState<DomainState | null>(null);
  const [error, setError] = React.useState("");
  const [runningSince, setRunningSince] = React.useState<number | null>(null);
  const [tickMs, setTickMs] = React.useState(0);

  const coreBase = `http://${serverIp}:${CORE_PORT}`;

  React.useEffect(() => {
    let active = true;
    setCheckingServer(true);
    checkCoreHealth(serverIp).then((ok) => {
      if (!active) return;
      setShowServerDialog(!ok);
      if (ok) {
        setServerDialogError("");
        localStorage.setItem(STORAGE_KEY, serverIp);
      } else {
        setServerDialogError("Сервер не найден. Укажи IP Raspberry в этой сети.");
      }
      setCheckingServer(false);
    });
    return () => {
      active = false;
    };
  }, [serverIp]);

  async function submitServerIp() {
    const candidate = inputIp.trim();
    if (!isIPv4(candidate)) {
      setServerDialogError("Введите корректный IP в формате 192.168.0.177");
      return;
    }
    setServerDialogError("");
    setCheckingServer(true);
    const ok = await checkCoreHealth(candidate);
    setCheckingServer(false);
    if (!ok) {
      setServerDialogError("По этому IP core недоступен.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, candidate);
    setServerIp(candidate);
    setShowServerDialog(false);
  }

  React.useEffect(() => {
    if (showServerDialog || checkingServer) return;

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
        ws = new WebSocket(toWebSocketUrl(coreBase));
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
  }, [coreBase, showServerDialog, checkingServer]);

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

  React.useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const menuWidth = 180;
      const menuHeight = 84;
      const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
      const maxY = Math.max(8, window.innerHeight - menuHeight - 8);
      setCtxMenu({
        x: Math.min(event.clientX, maxX),
        y: Math.min(event.clientY, maxY),
      });
    };
    const onCloseMenu = () => setCtxMenu(null);
    document.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("click", onCloseMenu);
    window.addEventListener("blur", onCloseMenu);
    window.addEventListener("resize", onCloseMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("click", onCloseMenu);
      window.removeEventListener("blur", onCloseMenu);
      window.removeEventListener("resize", onCloseMenu);
    };
  }, []);

  const closeApp = async () => {
    window.close();
  };

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

      {(showServerDialog || checkingServer) && (
        <div className="server-dialog-backdrop">
          <div className="server-dialog">
            <h3>Подключение к серверу</h3>
            <p>Введите IP Raspberry (без порта). Порт используется автоматически: 18080.</p>
            <input
              className="server-dialog-input"
              type="text"
              inputMode="numeric"
              placeholder="192.168.0.177"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              disabled={checkingServer}
            />
            {serverDialogError ? <div className="server-dialog-error">{serverDialogError}</div> : null}
            <button className="server-dialog-btn" onClick={submitServerIp} disabled={checkingServer}>
              {checkingServer ? "Проверка..." : "Сохранить"}
            </button>
          </div>
        </div>
      )}

      {ctxMenu && (
        <div
          className="app-context-menu"
          style={{ top: `${ctxMenu.y}px`, left: `${ctxMenu.x}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="app-context-menu__item"
            onClick={() => {
              setCtxMenu(null);
              window.location.reload();
            }}
          >
            Обновить
          </button>
          <button
            type="button"
            className="app-context-menu__item"
            onClick={() => {
              setCtxMenu(null);
              closeApp();
            }}
          >
            Выход
          </button>
        </div>
      )}
    </main>
  );
}
