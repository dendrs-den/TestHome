import React from "react";
import { authHeaders, buildCoreBaseUrl, checkCoreHealth, DEFAULT_CORE_PORT, isIPv4 } from "../../../packages/lan-client/src/runtime";
import { useOperatorState } from "./hooks/useOperatorState";

type Team = {
  id?: string;
  name?: string;
  number?: string | number;
};

type Stage = {
  id?: string;
  name?: string;
  battle?: boolean;
};

type Discipline = {
  id?: string;
  name?: string;
};

type RoundItem = {
  id?: string;
  team?: Team;
  stage?: Stage;
  order?: string | number;
  faults?: unknown[];
  crossings?: unknown[];
  time_real?: number | null;
  time_result?: number | null;
  stage_rank?: number | null;
  tournament_rank?: number | null;
  round_start?: number | null;
};

type Tournament = {
  id: string;
  name: string;
  teams?: Team[];
  disciplines?: Discipline[];
  stages?: Stage[];
  round?: RoundItem[];
  rounds?: RoundItem[];
  bust_value?: number;
  skip_value?: number;
};

type TournamentDraft = {
  id: string;
  name: string;
  disciplineName: string;
  bustValue: string;
  skipValue: string;
  teamsText: string;
  stagesText: string;
};

const SERVER_IP_KEY = "inflightflow.core.ip.operator";
const SERVER_PASSWORD_KEY = "inflightflow.core.password.operator";

const emptyDraft: TournamentDraft = {
  id: "",
  name: "",
  disciplineName: "",
  bustValue: "5",
  skipValue: "20",
  teamsText: "",
  stagesText: "",
};

function localId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(value: string): string {
  return value.trim();
}

function parseTeams(text: string): Team[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/[|,;]/).map((part) => part.trim()).filter(Boolean);
      return {
        id: localId(`team-${index + 1}`),
        name: parts[0] || `Team ${index + 1}`,
        number: parts[1] || `${index + 1}`,
      };
    });
}

function parseStages(text: string): Stage[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/[|,;]/).map((part) => part.trim()).filter(Boolean);
      const flag = (parts[1] || "").toLowerCase();
      return {
        id: localId(`stage-${index + 1}`),
        name: parts[0] || `Stage ${index + 1}`,
        battle: flag === "battle" || flag === "yes" || flag === "true" || flag === "1",
      };
    });
}

function buildRounds(teams: Team[], stages: Stage[]): RoundItem[] {
  const rounds: RoundItem[] = [];
  stages.forEach((stage, stageIndex) => {
    teams.forEach((team, teamIndex) => {
      rounds.push({
        id: `round-${stage.id || stageIndex + 1}-${team.id || teamIndex + 1}`,
        team,
        stage,
        order: `${stageIndex}-${teamIndex}`,
        faults: [],
        crossings: [],
        time_real: null,
        time_result: null,
        stage_rank: 0,
        tournament_rank: 0,
        round_start: null,
      });
    });
  });
  return rounds;
}

function deriveRoundId(round: RoundItem, index: number): string {
  if (round.id) return String(round.id);
  const stageId = round.stage?.id || round.stage?.name || `stage-${index + 1}`;
  const teamId = round.team?.id || round.team?.name || `team-${index + 1}`;
  return `round-${stageId}-${teamId}-${index + 1}`;
}

function roundLabel(round: RoundItem, index: number): string {
  const stage = round.stage?.name || `Stage ${index + 1}`;
  const teamName = round.team?.name || "Unknown team";
  const teamNumber = round.team?.number ? ` #${round.team.number}` : "";
  return `${stage} - ${teamName}${teamNumber}`;
}

function tournamentToDraft(item: Tournament | null): TournamentDraft {
  if (!item) return emptyDraft;
  const teams = Array.isArray(item.teams) ? item.teams : [];
  const stages = Array.isArray(item.stages) ? item.stages : [];
  return {
    id: item.id || "",
    name: item.name || "",
    disciplineName: Array.isArray(item.disciplines) && item.disciplines[0]?.name ? String(item.disciplines[0].name) : "",
    bustValue: String(item.bust_value ?? 5),
    skipValue: String(item.skip_value ?? 20),
    teamsText: teams.map((team) => `${team.name || ""}|${team.number ?? ""}`).join("\n"),
    stagesText: stages.map((stage) => `${stage.name || ""}${stage.battle ? "|battle" : ""}`).join("\n"),
  };
}

function draftToTournament(draft: TournamentDraft): Tournament {
  const teams = parseTeams(draft.teamsText);
  const stages = parseStages(draft.stagesText);
  const disciplines = draft.disciplineName.trim()
    ? [{ id: localId("discipline"), name: draft.disciplineName.trim() }]
    : [];

  return {
    id: draft.id || localId("tour"),
    name: normalizeName(draft.name),
    teams,
    disciplines,
    stages,
    round: buildRounds(teams, stages),
    bust_value: Number(draft.bustValue || 5),
    skip_value: Number(draft.skipValue || 20),
  };
}

async function readJSON<T>(url: string, password: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(password),
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(body || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export default function App() {
  const defaultIp = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
  const [serverIp, setServerIp] = React.useState(() => localStorage.getItem(SERVER_IP_KEY) || defaultIp);
  const [serverPassword, setServerPassword] = React.useState(() => localStorage.getItem(SERVER_PASSWORD_KEY) || "");
  const [inputIp, setInputIp] = React.useState(serverIp);
  const [inputPassword, setInputPassword] = React.useState(serverPassword);
  const [checkingServer, setCheckingServer] = React.useState(true);
  const [showServerDialog, setShowServerDialog] = React.useState(false);
  const [serverDialogError, setServerDialogError] = React.useState("");

  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = React.useState<Tournament | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = React.useState("");
  const [selectedRoundId, setSelectedRoundId] = React.useState("");
  const [loadingTournaments, setLoadingTournaments] = React.useState(false);
  const [dataError, setDataError] = React.useState("");
  const [draft, setDraft] = React.useState<TournamentDraft>(emptyDraft);
  const [editorMode, setEditorMode] = React.useState<"create" | "edit">("create");
  const [savingTournament, setSavingTournament] = React.useState(false);
  const [editorMessage, setEditorMessage] = React.useState("");

  const baseUrl = React.useMemo(() => buildCoreBaseUrl(serverIp, DEFAULT_CORE_PORT), [serverIp]);
  const operator = useOperatorState(baseUrl, serverPassword);

  const availableRounds = React.useMemo(() => {
    const rounds = currentTournament?.round || currentTournament?.rounds || [];
    return Array.isArray(rounds) ? rounds : [];
  }, [currentTournament]);

  React.useEffect(() => {
    let active = true;
    setCheckingServer(true);
    checkCoreHealth(baseUrl, serverPassword).then((ok) => {
      if (!active) return;
      setShowServerDialog(!ok);
      setServerDialogError(ok ? "" : "Core недоступен. Укажи IP Raspberry и пароль, если он включен.");
      setCheckingServer(false);
      if (ok) {
        localStorage.setItem(SERVER_IP_KEY, serverIp);
        localStorage.setItem(SERVER_PASSWORD_KEY, serverPassword);
      }
    });
    return () => {
      active = false;
    };
  }, [baseUrl, serverIp, serverPassword]);

  const loadTournamentState = React.useCallback(async () => {
    setLoadingTournaments(true);
    setDataError("");
    try {
      const [list, current] = await Promise.all([
        readJSON<Tournament[]>(`${baseUrl}/tournaments/getall`, serverPassword),
        readJSON<Tournament>(`${baseUrl}/tournaments/getcurrent`, serverPassword),
      ]);
      setTournaments(list);
      const resolvedCurrent = current?.id ? current : null;
      setCurrentTournament(resolvedCurrent);
      if (resolvedCurrent?.id) {
        setSelectedTournamentId(resolvedCurrent.id);
        const firstRoundId = Array.isArray(resolvedCurrent.round) && resolvedCurrent.round.length > 0 ? deriveRoundId(resolvedCurrent.round[0], 0) : "";
        setSelectedRoundId((prev) => prev || firstRoundId);
      } else if (list.length > 0) {
        setSelectedTournamentId((prev) => prev || list[0].id);
      } else {
        setSelectedTournamentId("");
        setSelectedRoundId("");
      }
    } catch (error) {
      setDataError((error as Error).message);
    } finally {
      setLoadingTournaments(false);
    }
  }, [baseUrl, serverPassword]);

  React.useEffect(() => {
    if (showServerDialog || checkingServer) return;
    loadTournamentState();
  }, [showServerDialog, checkingServer, loadTournamentState]);

  React.useEffect(() => {
    if (!selectedTournamentId) {
      setCurrentTournament(null);
      setDraft((prev) => (prev.id ? prev : emptyDraft));
      return;
    }
    const found = tournaments.find((item) => item.id === selectedTournamentId) || null;
    setCurrentTournament(found);
    if (editorMode === "edit") {
      setDraft(tournamentToDraft(found));
    }
    if (!found) return;
    const rounds = Array.isArray(found.round) ? found.round : [];
    if (rounds.length > 0) {
      const preferred = rounds.find((round, index) => deriveRoundId(round, index) === selectedRoundId);
      if (!preferred) {
        setSelectedRoundId(deriveRoundId(rounds[0], 0));
      }
    } else {
      setSelectedRoundId("");
    }
  }, [selectedTournamentId, tournaments, selectedRoundId, editorMode]);

  async function submitServerSettings() {
    const candidateIp = inputIp.trim();
    const candidatePassword = inputPassword.trim();
    if (!isIPv4(candidateIp)) {
      setServerDialogError("Введите корректный IP в формате 192.168.0.177");
      return;
    }
    setCheckingServer(true);
    const nextBaseUrl = buildCoreBaseUrl(candidateIp, DEFAULT_CORE_PORT);
    const ok = await checkCoreHealth(nextBaseUrl, candidatePassword);
    setCheckingServer(false);
    if (!ok) {
      setServerDialogError("По этому адресу core недоступен или отклонил пароль.");
      return;
    }
    setServerDialogError("");
    setServerIp(candidateIp);
    setServerPassword(candidatePassword);
    localStorage.setItem(SERVER_IP_KEY, candidateIp);
    localStorage.setItem(SERVER_PASSWORD_KEY, candidatePassword);
    setShowServerDialog(false);
  }

  async function activateTournament() {
    if (!selectedTournamentId) return;
    await readJSON(`${baseUrl}/tournaments/current`, serverPassword, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedTournamentId }),
    });
    await loadTournamentState();
  }

  function startCreateTournament() {
    setEditorMode("create");
    setDraft(emptyDraft);
    setEditorMessage("Создание нового турнира");
  }

  function startEditTournament() {
    if (!currentTournament) return;
    setEditorMode("edit");
    setDraft(tournamentToDraft(currentTournament));
    setEditorMessage(`Редактирование: ${currentTournament.name || currentTournament.id}`);
  }

  async function saveTournament() {
    const normalizedName = normalizeName(draft.name);
    if (!normalizedName) {
      setEditorMessage("Укажи название турнира.");
      return;
    }
    const teams = parseTeams(draft.teamsText);
    const stages = parseStages(draft.stagesText);
    if (teams.length === 0) {
      setEditorMessage("Добавь хотя бы одну команду.");
      return;
    }
    if (stages.length === 0) {
      setEditorMessage("Добавь хотя бы один этап.");
      return;
    }

    setSavingTournament(true);
    setEditorMessage("");
    try {
      const payload = draftToTournament({ ...draft, name: normalizedName });
      const endpoint = editorMode === "edit" ? "/tournaments/update" : "/tournaments/add";
      const saved = await readJSON<Tournament>(`${baseUrl}${endpoint}`, serverPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSelectedTournamentId(saved.id);
      setEditorMode("edit");
      setDraft(tournamentToDraft(saved));
      setEditorMessage(editorMode === "edit" ? "Турнир обновлен." : "Турнир создан.");
      await loadTournamentState();
    } catch (error) {
      setEditorMessage(`Не удалось сохранить турнир: ${(error as Error).message}`);
    } finally {
      setSavingTournament(false);
    }
  }

  async function deleteTournament() {
    if (!selectedTournamentId) return;
    const name = currentTournament?.name || selectedTournamentId;
    const confirmed = typeof window === "undefined" ? true : window.confirm(`Удалить турнир "${name}"?`);
    if (!confirmed) return;

    setSavingTournament(true);
    setEditorMessage("");
    try {
      await readJSON(`${baseUrl}/tournaments/delete`, serverPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTournamentId }),
      });
      setEditorMode("create");
      setDraft(emptyDraft);
      setSelectedTournamentId("");
      setCurrentTournament(null);
      setSelectedRoundId("");
      setEditorMessage("Турнир удален.");
      await loadTournamentState();
    } catch (error) {
      setEditorMessage(`Не удалось удалить турнир: ${(error as Error).message}`);
    } finally {
      setSavingTournament(false);
    }
  }

  const selectedRound = React.useMemo(() => {
    return availableRounds.find((round, index) => deriveRoundId(round, index) === selectedRoundId) || null;
  }, [availableRounds, selectedRoundId]);

  const draftTeamsCount = React.useMemo(() => parseTeams(draft.teamsText).length, [draft.teamsText]);
  const draftStagesCount = React.useMemo(() => parseStages(draft.stagesText).length, [draft.stagesText]);
  const currentRoundsCount = Array.isArray(currentTournament?.round) ? currentTournament.round.length : 0;

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0b1220 0%, #13233c 45%, #18304d 100%)", color: "#eef4ff", fontFamily: "Segoe UI, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 1420, margin: "0 auto", display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.72 }}>InflightFlow Operator</div>
            <h1 style={{ margin: "8px 0 4px", fontSize: 34 }}>Raspberry-Centric Control</h1>
            <div style={{ opacity: 0.8 }}>{serverIp}:{DEFAULT_CORE_PORT}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setShowServerDialog(true)} style={buttonGhost}>Сервер</button>
            <button onClick={loadTournamentState} style={buttonGhost} disabled={loadingTournaments}>Обновить турниры</button>
            <button onClick={operator.refresh} style={buttonGhost} disabled={operator.refreshing}>Обновить состояние</button>
            <button onClick={startCreateTournament} style={buttonPrimary}>Новый турнир</button>
            <button onClick={startEditTournament} style={buttonGhost} disabled={!currentTournament}>Редактировать</button>
            <button onClick={deleteTournament} style={buttonDangerCompact} disabled={!selectedTournamentId || savingTournament}>Удалить</button>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={cardStyle}>
            <div style={cardHeaderRow}>
              <h2 style={sectionTitle}>Турниры на Raspberry</h2>
              <div style={metaBadge}>{tournaments.length} шт.</div>
            </div>
            {dataError ? <div style={errorStyle}>Ошибка данных: {dataError}</div> : null}
            {tournaments.length === 0 ? (
              <div style={{ opacity: 0.75 }}>Турниры пока не найдены в локальном хранилище Raspberry.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 340, overflow: "auto" }}>
                {tournaments.map((item) => {
                  const active = item.id === selectedTournamentId;
                  const isCurrent = currentTournament?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedTournamentId(item.id)}
                      style={{
                        ...listButton,
                        borderColor: active ? "#7dd3fc" : "rgba(125, 211, 252, 0.18)",
                        background: active ? "rgba(34, 197, 94, 0.14)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{item.name || item.id}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{item.id}</div>
                        </div>
                        {isCurrent ? <span style={currentChipStyle}>current</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={activateTournament} style={buttonPrimary} disabled={!selectedTournamentId}>Сделать текущим</button>
              <div style={{ alignSelf: "center", opacity: 0.78 }}>Текущий: {currentTournament?.name || currentTournament?.id || "-"}</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderRow}>
              <h2 style={sectionTitle}>{editorMode === "edit" ? "Редактирование турнира" : "Создание турнира"}</h2>
              <div style={metaBadge}>{draftTeamsCount} команд / {draftStagesCount} этапов</div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={grid2}>
                <label style={fieldLabel}>
                  <span>Название турнира</span>
                  <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Например, Moscow Cup" style={inputStyle} />
                </label>
                <label style={fieldLabel}>
                  <span>Дисциплина</span>
                  <input value={draft.disciplineName} onChange={(e) => setDraft((prev) => ({ ...prev, disciplineName: e.target.value }))} placeholder="Например, Drone race" style={inputStyle} />
                </label>
              </div>
              <div style={grid3}>
                <label style={fieldLabel}>
                  <span>Bust value</span>
                  <input value={draft.bustValue} onChange={(e) => setDraft((prev) => ({ ...prev, bustValue: e.target.value }))} inputMode="numeric" style={inputStyle} />
                </label>
                <label style={fieldLabel}>
                  <span>Skip value</span>
                  <input value={draft.skipValue} onChange={(e) => setDraft((prev) => ({ ...prev, skipValue: e.target.value }))} inputMode="numeric" style={inputStyle} />
                </label>
                <div style={miniSummaryStyle}>
                  <div>Раундов будет создано:</div>
                  <b>{draftTeamsCount * draftStagesCount}</b>
                </div>
              </div>
              <div style={grid2}>
                <label style={fieldLabel}>
                  <span>Команды</span>
                  <textarea
                    value={draft.teamsText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, teamsText: e.target.value }))}
                    placeholder={"По одной строке: Имя|Номер\nAlpha|101\nBravo|102"}
                    style={textareaStyle}
                  />
                </label>
                <label style={fieldLabel}>
                  <span>Этапы</span>
                  <textarea
                    value={draft.stagesText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, stagesText: e.target.value }))}
                    placeholder={"По одной строке: Название или Название|battle\nQualification\nFinal|battle"}
                    style={textareaStyle}
                  />
                </label>
              </div>
              {editorMessage ? <div style={editorMessage.includes("Не удалось") || editorMessage.includes("Укажи") || editorMessage.includes("Добавь") ? errorStyle : successStyle}>{editorMessage}</div> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={saveTournament} style={buttonPrimary} disabled={savingTournament}>{savingTournament ? "Сохранение..." : editorMode === "edit" ? "Сохранить изменения" : "Создать турнир"}</button>
                <button onClick={startCreateTournament} style={buttonGhost} disabled={savingTournament}>Очистить форму</button>
                {currentTournament ? <button onClick={() => setDraft(tournamentToDraft(currentTournament))} style={buttonGhost} disabled={savingTournament}>Сбросить к выбранному</button> : null}
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
          <div style={cardStyle}>
            <div style={cardHeaderRow}>
              <h2 style={sectionTitle}>Раунды текущего турнира</h2>
              <div style={metaBadge}>{currentRoundsCount} шт.</div>
            </div>
            {!currentTournament ? (
              <div style={{ opacity: 0.75 }}>Сначала выбери турнир.</div>
            ) : availableRounds.length === 0 ? (
              <div style={{ opacity: 0.75 }}>У текущего турнира нет раундов.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto" }}>
                {availableRounds.map((round, index) => {
                  const roundId = deriveRoundId(round, index);
                  const active = roundId === selectedRoundId;
                  return (
                    <button
                      key={roundId}
                      onClick={() => setSelectedRoundId(roundId)}
                      style={{
                        ...listButton,
                        borderColor: active ? "#facc15" : "rgba(250, 204, 21, 0.18)",
                        background: active ? "rgba(250, 204, 21, 0.12)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{roundLabel(round, index)}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{roundId}</div>
                        </div>
                        <span style={subtleBadge}>{round.stage?.battle ? "battle" : "standard"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Выбранный раунд</h2>
            <div>Турнир: <b>{currentTournament?.name || currentTournament?.id || "-"}</b></div>
            <div>Раунд: <b>{selectedRoundId || "-"}</b></div>
            <div>Команда: <b>{selectedRound?.team?.name || "-"}</b></div>
            <div>Номер: <b>{selectedRound?.team?.number || "-"}</b></div>
            <div>Этап: <b>{selectedRound?.stage?.name || "-"}</b></div>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <button
                onClick={() => operator.bootstrap(selectedTournamentId, selectedRoundId)}
                style={buttonGhost}
                disabled={operator.busy || !selectedTournamentId || !selectedRoundId}
              >
                Bootstrap
              </button>
              <button
                onClick={() => operator.prepareRound(selectedTournamentId, selectedRoundId)}
                style={buttonPrimary}
                disabled={operator.busy || !selectedTournamentId || !selectedRoundId}
              >
                Prepare
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => operator.sendCommand("finish_round")} style={buttonWarn} disabled={operator.busy}>Finish</button>
                <button onClick={() => operator.sendCommand("cancel_round")} style={buttonDanger} disabled={operator.busy}>Cancel</button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Readiness</h2>
            <div>Core: <b>{operator.core?.status ?? "-"}</b> / {operator.core?.hardwareMode ?? "-"}</div>
            <div>Sensor: <b>{operator.sensor?.enabled ? "enabled" : "disabled"}</b></div>
            <div>Health: <b>{operator.readiness?.health.level ?? "-"}</b></div>
            <div>Action: <b>{operator.readiness?.health.action ?? "-"}</b></div>
            <div>Can start: <b>{String(operator.readiness?.canStartRound ?? false)}</b></div>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button onClick={operator.runPreflight} style={buttonPrimary} disabled={operator.busy}>Preflight</button>
              <button onClick={operator.refresh} style={buttonGhost} disabled={operator.refreshing}>Refresh</button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Domain State</h2>
            <div>Tournament: <b>{operator.domain?.TournamentID || "-"}</b></div>
            <div>Round: <b>{operator.domain?.RoundID || "-"}</b></div>
            <div>State: <b>{operator.domain?.RoundState || "-"}</b></div>
            <div>Crossings: <b>{operator.domain?.Crossings ?? 0}</b></div>
            <div>Result: <b>{operator.domain?.RoundResultMs ?? 0} ms</b></div>
            <div>Last sync: <b>{operator.lastOkAt || "-"}</b></div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Preflight</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {(operator.preflight?.steps ?? []).map((step) => (
                <div key={step.name} style={{ padding: "10px 12px", borderRadius: 12, background: step.pass ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
                  <b>{step.name}</b>: {step.message}
                </div>
              ))}
              {operator.preflight?.steps?.length ? null : <div style={{ opacity: 0.75 }}>Preflight еще не запускался.</div>}
            </div>
          </div>
        </section>

        {operator.error ? <div style={errorStyle}>Ошибка operator runtime: {operator.error}</div> : null}
      </div>

      {(showServerDialog || checkingServer) && (
        <div style={dialogBackdrop}>
          <div style={dialogCard}>
            <h3 style={{ marginTop: 0 }}>Подключение к Raspberry</h3>
            <p style={{ opacity: 0.75 }}>Укажи IP Raspberry в LAN. Порт подставляется автоматически: {DEFAULT_CORE_PORT}.</p>
            <input value={inputIp} onChange={(e) => setInputIp(e.target.value)} placeholder="192.168.0.177" style={inputStyle} disabled={checkingServer} />
            <input value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder="Пароль оператора, если включен" style={inputStyle} disabled={checkingServer} />
            {serverDialogError ? <div style={errorStyle}>{serverDialogError}</div> : null}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submitServerSettings} style={buttonPrimary} disabled={checkingServer}>{checkingServer ? "Проверка..." : "Сохранить"}</button>
              {!checkingServer ? <button onClick={() => setShowServerDialog(false)} style={buttonGhost}>Закрыть</button> : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(8, 15, 30, 0.78)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 20,
  padding: 18,
  backdropFilter: "blur(16px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
};

const cardHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const metaBadge: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(125, 211, 252, 0.12)",
  border: "1px solid rgba(125, 211, 252, 0.22)",
  color: "#c8ecff",
};

const subtleBadge: React.CSSProperties = {
  fontSize: 11,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  color: "#cfd8ea",
};

const currentChipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(34,197,94,0.16)",
  color: "#c2ffd7",
  border: "1px solid rgba(34,197,94,0.3)",
};

const buttonBase: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid transparent",
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
};

const buttonPrimary: React.CSSProperties = {
  ...buttonBase,
  background: "#22c55e",
  color: "#07130b",
};

const buttonGhost: React.CSSProperties = {
  ...buttonBase,
  background: "rgba(255,255,255,0.06)",
  color: "#eef4ff",
  borderColor: "rgba(148, 163, 184, 0.22)",
};

const buttonWarn: React.CSSProperties = {
  ...buttonBase,
  background: "#facc15",
  color: "#2b1f00",
  flex: 1,
};

const buttonDanger: React.CSSProperties = {
  ...buttonBase,
  background: "#ef4444",
  color: "#fff7f7",
  flex: 1,
};

const buttonDangerCompact: React.CSSProperties = {
  ...buttonBase,
  background: "rgba(239, 68, 68, 0.14)",
  color: "#fecaca",
  borderColor: "rgba(248, 113, 113, 0.3)",
};

const listButton: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#eef4ff",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  color: "#fecaca",
  background: "rgba(127, 29, 29, 0.45)",
  border: "1px solid rgba(248, 113, 113, 0.32)",
  borderRadius: 12,
  padding: "10px 12px",
};

const successStyle: React.CSSProperties = {
  color: "#d1fae5",
  background: "rgba(6, 78, 59, 0.45)",
  border: "1px solid rgba(52, 211, 153, 0.28)",
  borderRadius: 12,
  padding: "10px 12px",
};

const dialogBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(5, 10, 20, 0.7)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const dialogCard: React.CSSProperties = {
  width: "min(520px, 100%)",
  background: "#0f172a",
  color: "#eef4ff",
  borderRadius: 20,
  padding: 22,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  display: "grid",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.3)",
  background: "rgba(255,255,255,0.04)",
  color: "#eef4ff",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 220,
  resize: "vertical",
  fontFamily: "Consolas, monospace",
  lineHeight: 1.5,
};

const fieldLabel: React.CSSProperties = {
  display: "grid",
  gap: 8,
  fontSize: 13,
  color: "#dbe5ff",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const miniSummaryStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(255,255,255,0.04)",
  padding: "12px 14px",
  display: "grid",
  alignContent: "center",
  color: "#dbe5ff",
};
