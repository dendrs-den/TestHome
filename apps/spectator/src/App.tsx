import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import logo from "./assets/infoscreen_logo3.png";
import {
  authHeaders,
  buildCoreBaseUrl,
  checkCoreHealth,
  DEFAULT_CORE_PORT,
  isIPv4,
  toRealtimeUrl,
} from "../../../packages/lan-client/src/runtime";

type RoundState = "idle" | "prepared" | "running" | "completed" | "cancelled";

type DomainState = {
  TournamentID: string;
  RoundID: string;
  RoundState: RoundState;
  Crossings: number;
  RoundResultMs: number;
};

type TournamentRound = {
  id?: string;
  team?: { id?: string; name?: string; number?: string | number };
  stage?: { id?: string; name?: string };
  faults?: Array<{ type?: string; valid?: boolean }>;
};

type Tournament = {
  id: string;
  name: string;
  round?: TournamentRound[];
};

const STORAGE_KEY = "inflightflow.core.ip.spectator";
const PASSWORD_KEY = "inflightflow.core.password.spectator";

function fmt(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const sec = Math.floor(safe / 1000);
  const milli = safe % 1000;
  return `${String(sec).padStart(4, "0")}:${String(milli).padStart(3, "0")}`;
}

function findCurrentRound(roundId: string, tournament: Tournament | null): TournamentRound | null {
  const rounds = Array.isArray(tournament?.round) ? tournament.round : [];
  return rounds.find((round) => String(round.id || "") === roundId) || null;
}

function deriveRoundLabel(roundId: string, tournament: Tournament | null): string {
  const matched = findCurrentRound(roundId, tournament);
  if (!matched) return roundId?.replace(/^round-?/i, "Round ") || "Round -";
  return matched.stage?.name || "Round";
}

function derivePilotLabel(roundId: string, tournament: Tournament | null): string {
  const matched = findCurrentRound(roundId, tournament);
  if (!matched) return tournament?.name || "-";
  return matched.team?.name || tournament?.name || "-";
}

export default function App() {
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
  const defaultIp = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
  const [serverIp, setServerIp] = React.useState<string>(() => localStorage.getItem(STORAGE_KEY) || defaultIp);
  const [serverPassword, setServerPassword] = React.useState<string>(() => localStorage.getItem(PASSWORD_KEY) || "");
  const [inputIp, setInputIp] = React.useState<string>(serverIp);
  const [inputPassword, setInputPassword] = React.useState<string>(serverPassword);
  const [checkingServer, setCheckingServer] = React.useState(true);
  const [showServerDialog, setShowServerDialog] = React.useState(false);
  const [serverDialogError, setServerDialogError] = React.useState("");

  const [domain, setDomain] = React.useState<DomainState | null>(null);
  const [currentTournament, setCurrentTournament] = React.useState<Tournament | null>(null);
  const [error, setError] = React.useState("");
  const [closingApp, setClosingApp] = React.useState(false);
  const [runningSince, setRunningSince] = React.useState<number | null>(null);
  const [tickMs, setTickMs] = React.useState(0);
  const receivedInitialRealtimeRef = React.useRef(false);

  const coreBase = React.useMemo(() => buildCoreBaseUrl(serverIp, DEFAULT_CORE_PORT), [serverIp]);

  React.useEffect(() => {
    let active = true;
    setCheckingServer(true);
    checkCoreHealth(coreBase, serverPassword).then((ok) => {
      if (!active) return;
      setShowServerDialog(!ok);
      if (ok) {
        setServerDialogError("");
        localStorage.setItem(STORAGE_KEY, serverIp);
        localStorage.setItem(PASSWORD_KEY, serverPassword);
      } else {
        setServerDialogError("Сервер не найден или отклонил пароль. Укажи Raspberry в этой сети.");
      }
      setCheckingServer(false);
    });
    return () => {
      active = false;
    };
  }, [coreBase, serverIp, serverPassword]);

  async function submitServerIp() {
    const candidate = inputIp.trim();
    const password = inputPassword.trim();
    if (!isIPv4(candidate)) {
      setServerDialogError("Введите корректный IP в формате 192.168.0.177");
      return;
    }

    setServerDialogError("");
    setCheckingServer(true);
    const ok = await checkCoreHealth(buildCoreBaseUrl(candidate, DEFAULT_CORE_PORT), password);
    setCheckingServer(false);

    if (!ok) {
      setServerDialogError("По этому IP core недоступен или отклонил пароль.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, candidate);
    localStorage.setItem(PASSWORD_KEY, password);
    setServerIp(candidate);
    setServerPassword(password);
    setShowServerDialog(false);
  }

  async function handleExit() {
    setCtxMenu(null);
    setClosingApp(true);

    try {
      await invoke("exit_app");
      return;
    } catch {
      try {
        await getCurrentWindow().destroy();
        return;
      } catch {
        window.open("", "_self");
        window.close();
      }
    }

    window.setTimeout(() => {
      if (!document.hidden) {
        setError("???????????? ??????????. ?????? ???? ???????.");
        setClosingApp(false);
      }
    }, 160);
  }

  React.useEffect(() => {
    if (showServerDialog || checkingServer) return;

    let active = true;
    let allowRealtimeError = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const refreshTournament = async () => {
      try {
        const resp = await fetch(`${coreBase}/tournaments/getcurrent`, {
          headers: authHeaders(serverPassword),
        });
        if (!resp.ok) return;
        const data = (await resp.json()) as Tournament;
        if (active) {
          setCurrentTournament(data?.id ? data : null);
        }
      } catch {
        // Tournament labels are optional for realtime loop.
      }
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimer != null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1000);
    };

    const connect = () => {
      try {
        ws = new WebSocket(toRealtimeUrl(coreBase, serverPassword));
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        setError("");
        void refreshTournament();
      };

      ws.onmessage = (evt) => {
        if (!active) return;
        try {
          const msg = JSON.parse(String(evt.data)) as { domain?: DomainState };
          const next = msg.domain;
          if (!next) return;

          setDomain((prev) => {
            const isInitialRealtimeFrame = !receivedInitialRealtimeRef.current;
            receivedInitialRealtimeRef.current = true;

            if (next.RoundState === "running") {
              const becameRunning = !!prev && (prev.RoundState !== "running" || prev.RoundID !== next.RoundID);
              if (becameRunning && !isInitialRealtimeFrame) {
                setRunningSince(Date.now());
                setTickMs(0);
              }
            } else {
              setRunningSince(null);
              setTickMs(0);
            }
            return next;
          });

          if (next.TournamentID !== currentTournament?.id) {
            void refreshTournament();
          }
          setError("");
        } catch {
          // Ignore malformed frame.
        }
      };

      ws.onclose = () => {
        if (!allowRealtimeError) return;
        setError("realtime disconnected");
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!allowRealtimeError) return;
        setError("realtime unavailable");
      };
    };

    connect();

    return () => {
      active = false;
      allowRealtimeError = false;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [coreBase, currentTournament?.id, serverPassword, showServerDialog, checkingServer]);

  React.useEffect(() => {
    if (!runningSince) return;
    const t = setInterval(() => {
      setTickMs(Date.now() - runningSince);
    }, 33);
    return () => clearInterval(t);
  }, [runningSince]);

  const state = domain?.RoundState ?? "idle";
  const currentRound = React.useMemo(
    () => findCurrentRound(domain?.RoundID || "", currentTournament),
    [currentTournament, domain?.RoundID]
  );
  const validFaults = React.useMemo(
    () => (Array.isArray(currentRound?.faults) ? currentRound.faults.filter((fault) => fault?.valid === true) : []),
    [currentRound]
  );
  const bustCount = React.useMemo(
    () => validFaults.filter((fault) => String(fault?.type || "").toLowerCase() === "bust").length,
    [validFaults]
  );
  const skipCount = React.useMemo(
    () => validFaults.filter((fault) => String(fault?.type || "").toLowerCase() === "skip").length,
    [validFaults]
  );
  const liveMs = state === "running" ? tickMs : (domain?.RoundResultMs ?? 0);
  const roundLabel = deriveRoundLabel(domain?.RoundID || "", currentTournament);
  const pilotLabel = derivePilotLabel(domain?.RoundID || "", currentTournament);
  const tournamentLabel = currentTournament?.name || "Flow CUP";

  React.useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const menuWidth = 180;
      const menuHeight = 120;
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

  return (
    <main className="spectator-screen">
      <img className="flow-logo-image" src={logo} alt="Flow Moscow" />
      <div className="brand-mark">{tournamentLabel}</div>

      <section className="spectator-content">
        <section className="left-panel">
          <div className="round-label">{roundLabel}</div>
          <div className="pilot-label">{pilotLabel}</div>
          <div className={`timer-main state-${state}`}>{fmt(liveMs)}</div>
        </section>

        <section className="right-panel" aria-label="Штрафы">
          <div className="stats-line">
            <span>Busts: {bustCount}</span>
            <span>Skips: {skipCount}</span>
          </div>
          <div className="dots-line">
            {Array.from({ length: Math.min(validFaults.length, 8) }).map((_, index) => (
              <span className="dot" key={index} />
            ))}
          </div>
        </section>
      </section>

      {error ? <div className="error-banner">core unavailable: {error}</div> : null}
      {closingApp ? <div className="error-banner">Закрытие окна...</div> : null}

      {(showServerDialog || checkingServer) && (
        <div className="server-dialog-backdrop">
          <div className="server-dialog">
            <h3>Подключение к серверу</h3>
            <p>Введите IP Raspberry без порта. Порт используется автоматически: {DEFAULT_CORE_PORT}.</p>
            <input
              className="server-dialog-input"
              type="text"
              inputMode="numeric"
              placeholder="192.168.0.177"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              disabled={checkingServer}
            />
            <input
              className="server-dialog-input"
              type="password"
              placeholder="Пароль оператора, если включен"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
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
              setInputIp(serverIp);
              setInputPassword(serverPassword);
              setError("");
              setServerDialogError("");
              setShowServerDialog(true);
            }}
          >
            Сервер
          </button>
          <button
            type="button"
            className="app-context-menu__item"
            onClick={() => {
              void handleExit();
            }}
          >
            Выход
          </button>
        </div>
      )}
    </main>
  );
}
