import { useMemo } from "react";
import { useOperatorState } from "./hooks/useOperatorState";

function statusClass(level?: string) {
  if (level === "OK") return "ok";
  if (level === "WARNING") return "warn";
  if (level === "CRITICAL") return "bad";
  return "neutral";
}

export default function App() {
  const baseUrl = "http://192.168.0.177:18080";
  const tournamentId = "event-main";
  const roundId = "round-201621";

  const trimmedBase = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
  const {
    core,
    domain,
    sensor,
    readiness,
    busy,
    error,
    bootstrap,
    sendCommand,
    prepareRound,
  } = useOperatorState(trimmedBase);

  const state = domain?.RoundState ?? "idle";
  const crossings = domain?.Crossings ?? 0;

  const isStage1 = state === "idle" || state === "completed" || state === "cancelled";
  const isStage2 = state === "prepared";
  const isStage3 = state === "running" && crossings > 0;

  const canActivate = isStage1;
  const canStop = isStage2 || isStage3;
  const canBustSkip = isStage3;
  const canExit = isStage1;

  return (
    <main className="operator-root">
      <div className="control-shell">
        <header className="topbar">
          <div className="brand">FlowCUP</div>
        </header>

        <section className="content">
          <div className="left-panel card">
            <h2>Referee Panel</h2>

            <div className="grid-row">
              <span>Stage:</span>
              <b>{domain?.RoundState ?? "-"}</b>
            </div>
            <div className="grid-row">
              <span>Team:</span>
              <b>{domain?.TournamentID || tournamentId}</b>
            </div>
            <div className="grid-row">
              <span>Round:</span>
              <b>{domain?.RoundID || roundId}</b>
            </div>
            <div className="grid-row">
              <span>Result:</span>
              <b>{domain?.RoundResultMs ?? 0} ms</b>
            </div>
          </div>

          <div className="right-panel">
            <button className="next-round" disabled={busy} onClick={() => bootstrap(tournamentId, roundId)}>
              NEXT ROUND
            </button>
          </div>
        </section>

        <section className="actions card">
          <button className="btn-primary" disabled={busy || !canActivate} onClick={() => prepareRound(roundId)}>ACTIVATE</button>
          <button
            className={isStage2 || isStage3 ? "btn-danger-outline" : "btn-secondary"}
            disabled={busy || !canStop}
            onClick={() => sendCommand(isStage2 ? "cancel_round" : "finish_round")}
          >
            STOP
          </button>
          <button className={isStage3 ? "btn-danger-solid" : "btn-muted"} disabled={busy || !canBustSkip} onClick={() => sendCommand("cancel_round")}>BUST</button>
          <button className={isStage3 ? "btn-danger-solid" : "btn-muted"} disabled={busy || !canBustSkip} onClick={() => sendCommand("cancel_round")}>SKIP</button>
        </section>

        <section className="footer-actions">
          <button className="btn-danger" disabled={busy || !canExit} onClick={() => sendCommand("cancel_round")}>EXIT</button>
          <button className="btn-muted" disabled>EDIT RESULTS</button>
        </section>
      </div>

      <section className="health card">
        <div className="health-left">
          <div className={`badge ${statusClass(readiness?.health.level)}`}>health: {readiness?.health.level ?? "-"}</div>
          <div>action: {readiness?.health.action ?? "-"}</div>
          <div>sensor: {sensor?.enabled ? "enabled" : "disabled"}</div>
          <div>core: {core?.status ?? "-"} / {core?.service ?? "-"}</div>
          {error ? <div className="error">Ошибка: {error}</div> : null}
        </div>
        <div className="health-right">
          <button className="pill health-pill" disabled>
            SENSOR CROSS: {domain?.Crossings ?? 0}
          </button>
        </div>
      </section>
    </main>
  );
}

