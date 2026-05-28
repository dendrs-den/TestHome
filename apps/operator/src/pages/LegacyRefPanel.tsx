import { useMemo } from "react";
import coreBaseUrl from "../Api_requests/coreBaseUrl";
import { useOperatorState } from "../hooks/useOperatorState";
import "./LegacyRefPanel.css";

type LegacyRefContext = {
  tournamentId?: string;
  tournamentName?: string;
  stageName?: string;
  teamName?: string;
  roundId?: string | number;
};

function statusClass(level?: string) {
  if (level === "OK") return "ok";
  if (level === "WARNING") return "warn";
  if (level === "CRITICAL") return "bad";
  return "neutral";
}

export default function LegacyRefPanel() {
  const trimmedBase = useMemo(() => coreBaseUrl.replace(/\/+$/, ""), []);
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

  const legacyContext = useMemo<LegacyRefContext>(() => {
    try {
      const raw = sessionStorage.getItem("legacyRefContext");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const commandTournamentId = legacyContext.tournamentId || domain?.TournamentID || "event-main";
  const commandRoundId = useMemo(() => {
    if (legacyContext.roundId) return String(legacyContext.roundId);
    if (domain?.RoundID) return domain.RoundID;
    return `legacy-ref-${String(legacyContext.roundId ?? "round")}`;
  }, [domain?.RoundID, legacyContext.roundId]);
  const matchesCurrentContext =
    (legacyContext.tournamentId ? domain?.TournamentID === legacyContext.tournamentId : true) &&
    (legacyContext.roundId ? domain?.RoundID === String(legacyContext.roundId) : true);
  const effectiveState = matchesCurrentContext ? state : "idle";

  const isStage1 =
    effectiveState === "idle" || effectiveState === "completed" || effectiveState === "cancelled";
  const isStage2 = effectiveState === "prepared";
  const isStage3 = effectiveState === "running" && crossings > 0;
  const canActivate = isStage1;
  const canStop = isStage2 || isStage3;
  const canExit = true;
  const supportsFaultCommands = false;
  const canBustSkip = false;

  const stageLabel = legacyContext.stageName || domain?.RoundState || "-";
  const teamLabel = legacyContext.teamName || legacyContext.tournamentName || domain?.TournamentID || commandTournamentId;
  const roundLabel = legacyContext.roundId || domain?.RoundID || commandRoundId;

  const exitToRounds = () => {
    sessionStorage.setItem("legacyRefReturn", "1");
    window.location.assign("/terminal");
  };

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
              <b>{stageLabel}</b>
            </div>
            <div className="grid-row">
              <span>Team:</span>
              <b>{teamLabel}</b>
            </div>
            <div className="grid-row">
              <span>Round:</span>
              <b>{roundLabel}</b>
            </div>
            <div className="grid-row">
              <span>Result:</span>
              <b>{domain?.RoundResultMs ?? 0} ms</b>
            </div>
          </div>

          <div className="right-panel">
            <button className="next-round" disabled={busy} onClick={() => bootstrap(commandTournamentId, commandRoundId)}>
              NEXT ROUND
            </button>
          </div>
        </section>

        <section className="actions card">
          <button
            className="btn-primary"
            disabled={busy || !canActivate}
            onClick={() => prepareRound(commandTournamentId, commandRoundId)}
          >
            ACTIVATE
          </button>
          <button
            className={isStage2 || isStage3 ? "btn-danger-outline" : "btn-secondary"}
            disabled={busy || !canStop}
            onClick={() => sendCommand(isStage2 ? "cancel_round" : "finish_round")}
          >
            STOP
          </button>
          <button className={supportsFaultCommands && isStage3 ? "btn-danger-solid" : "btn-muted"} disabled={busy || !canBustSkip}>
            BUST
          </button>
          <button className={supportsFaultCommands && isStage3 ? "btn-danger-solid" : "btn-muted"} disabled={busy || !canBustSkip}>
            SKIP
          </button>
        </section>

        <section className="footer-actions">
          <button className="btn-danger" disabled={busy || !canExit} onClick={exitToRounds}>
            EXIT
          </button>
          <button className="btn-muted" disabled>
            EDIT RESULTS
          </button>
        </section>
      </div>

      <section className="health card">
        <div className="health-left">
          <div className={`badge ${statusClass(readiness?.health.level)}`}>health: {readiness?.health.level ?? "-"}</div>
          <div>action: {readiness?.health.action ?? "-"}</div>
          <div>sensor: {sensor?.enabled ? "enabled" : "disabled"}</div>
          <div>core: {core?.status ?? "-"} / {core?.service ?? "-"}</div>
          {error ? <div className="error">Error: {error}</div> : null}
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
