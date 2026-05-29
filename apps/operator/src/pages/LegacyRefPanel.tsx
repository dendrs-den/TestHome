import { useCallback, useEffect, useMemo, useState } from "react";
import coreBaseUrl from "../Api_requests/coreBaseUrl";
import { operatorJsonHeaders } from "../Api_requests/coreBaseUrl";
import { useOperatorState } from "../hooks/useOperatorState";
import CustomizedSnackbar from "./CustomizedSnackbar";
import "./LegacyRefPanel.css";

type LegacyRefContext = {
  tournamentId?: string;
  tournamentName?: string;
  stageName?: string;
  teamName?: string;
  roundId?: string | number;
  returnFocus?: {
    teamId?: string | number;
    stageId?: string | number;
  };
};

type TournamentRound = {
  id?: string | number;
  stage?: {
    id?: string | number;
    name?: string;
  };
  team?: {
    id?: string | number;
    name?: string;
  };
  time_result?: number | null;
  time_real?: number | null;
};

type TournamentPayload = {
  id?: string;
  name?: string;
  round?: TournamentRound[];
};

function statusClass(level?: string) {
  if (level === "OK") return "ok";
  if (level === "WARNING") return "warn";
  if (level === "CRITICAL") return "bad";
  return "neutral";
}

function hasSavedResult(round?: TournamentRound) {
  return round?.time_result !== null && typeof round?.time_result !== "undefined"
    ? true
    : round?.time_real !== null && typeof round?.time_real !== "undefined";
}

export default function LegacyRefPanel() {
  const trimmedBase = useMemo(() => coreBaseUrl.replace(/\/+$/, ""), []);
  const [currentTournament, setCurrentTournament] = useState<TournamentPayload | null>(null);
  const [notice, setNotice] = useState<{ severity: "info" | "success" | "warning" | "error"; message: string } | null>(null);
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

  const fetchCurrentTournament = useCallback(async () => {
    try {
      const response = await fetch(`${trimmedBase}/tournaments/getcurrent`, {
        headers: operatorJsonHeaders(),
      });

      if (!response.ok) {
        throw new Error(`failed to load current tournament: ${response.status}`);
      }

      const data = (await response.json()) as TournamentPayload;
      setCurrentTournament(data && typeof data === "object" ? data : null);
    } catch (fetchError) {
      console.log("failed to load current tournament in legacy ref", fetchError);
    }
  }, [trimmedBase]);

  useEffect(() => {
    fetchCurrentTournament();
  }, [fetchCurrentTournament]);

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

  const startNextRound = async () => {
    const rounds = Array.isArray(currentTournament?.round) ? currentTournament.round : [];
    if (!rounds.length) {
      setNotice({ severity: "warning", message: "Нет данных текущего раунда" });
      return;
    }

    const currentRoundId = String(legacyContext.roundId || domain?.RoundID || "");
    const currentStageId =
      legacyContext.returnFocus?.stageId != null
        ? String(legacyContext.returnFocus.stageId)
        : null;

    const currentIndex = rounds.findIndex((round) => String(round?.id || "") === currentRoundId);
    const fallbackStageId =
      currentIndex >= 0 && rounds[currentIndex]?.stage?.id != null
        ? String(rounds[currentIndex]?.stage?.id)
        : currentStageId;

    const stageId = currentStageId || fallbackStageId;
    const nextRound =
      currentIndex >= 0
        ? rounds.slice(currentIndex + 1).find((round) => {
            if (hasSavedResult(round)) return false;
            if (!stageId) return true;
            return String(round?.stage?.id ?? "") === stageId;
          })
        : undefined;

    if (!nextRound?.id) {
      setNotice({ severity: "info", message: "Раунд завершен" });
      return;
    }

    const nextContext: LegacyRefContext = {
      tournamentId: currentTournament?.id || commandTournamentId,
      tournamentName: currentTournament?.name || legacyContext.tournamentName || "",
      stageName: nextRound.stage?.name || legacyContext.stageName || "",
      teamName: nextRound.team?.name || "",
      roundId: String(nextRound.id),
      returnFocus: {
        teamId: nextRound.team?.id,
        stageId: nextRound.stage?.id,
      },
    };

    sessionStorage.setItem("legacyRefContext", JSON.stringify(nextContext));

    try {
      await bootstrap(nextContext.tournamentId || commandTournamentId, String(nextRound.id));
      await prepareRound(nextContext.tournamentId || commandTournamentId, String(nextRound.id));
      await fetchCurrentTournament();
      window.location.reload();
    } catch (nextError) {
      console.log("failed to move to next round", nextError);
      setNotice({ severity: "error", message: "Не удалось переключить на следующего участника" });
    }
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
            <button className="next-round" disabled={busy} onClick={startNextRound}>
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

      {notice ? <CustomizedSnackbar severity={notice.severity} message={notice.message} autoHide={3500} /> : null}
    </main>
  );
}
