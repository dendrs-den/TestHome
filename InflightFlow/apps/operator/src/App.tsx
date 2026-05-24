import { useMemo, useState } from "react";
import { useOperatorState } from "./hooks/useOperatorState";

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://192.168.0.177:18080");
  const [tournamentId, setTournamentId] = useState("event-main");
  const [roundId, setRoundId] = useState(`round-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}`);

  const trimmedBase = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
  const {
    core,
    domain,
    sensor,
    readiness,
    preflight,
    busy,
    refreshing,
    error,
    lastOkAt,
    refresh,
    runPreflight,
    bootstrap,
    sendCommand,
    prepareRound,
  } = useOperatorState(trimmedBase);

  return (
    <main style={{ fontFamily: "Segoe UI, sans-serif", padding: 20, maxWidth: 960 }}>
      <h1>InflightFlow Operator</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ flex: 1, padding: 8 }}
          placeholder="http://192.168.0.177:18080"
        />
        <button onClick={refresh}>Обновить</button>
        <button disabled={busy} onClick={runPreflight}>Preflight</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ border: "1px solid #ddd", padding: 10 }}>
          <h3>Готовность</h3>
          <p>canStartRound: <b>{String(readiness?.canStartRound ?? false)}</b></p>
          <p>health: <b>{readiness?.health.level ?? "-"}</b></p>
          <p>action: <b>{readiness?.health.action ?? "-"}</b></p>
          <p>last refresh: {lastOkAt || "-"} {refreshing ? "(обновление...)" : ""}</p>
        </div>
        <div style={{ border: "1px solid #ddd", padding: 10 }}>
          <h3>Раунд</h3>
          <p>state: <b>{domain?.RoundState ?? "-"}</b></p>
          <p>tournament: <b>{domain?.TournamentID || "-"}</b></p>
          <p>round: <b>{domain?.RoundID || "-"}</b></p>
          <p>crossings: <b>{domain?.Crossings ?? 0}</b></p>
          <p>result: <b>{domain?.RoundResultMs ?? 0} ms</b></p>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 10, marginBottom: 12 }}>
        <h3>Управление раундом</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} style={{ flex: 1, padding: 8 }} placeholder="tournamentId" />
          <input value={roundId} onChange={(e) => setRoundId(e.target.value)} style={{ flex: 1, padding: 8 }} placeholder="roundId" />
          <button disabled={busy} onClick={() => bootstrap(tournamentId, roundId)}>Bootstrap</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={busy} onClick={() => prepareRound(roundId)}>Prepare</button>
          <button
            disabled={busy || domain?.RoundState !== "running"}
            onClick={() => sendCommand("finish_round")}
          >
            Finish
          </button>
          <button
            disabled={busy || (domain?.RoundState !== "running" && domain?.RoundState !== "prepared")}
            onClick={() => sendCommand("cancel_round")}
          >
            Cancel
          </button>
        </div>
        <p style={{ color: "#555", marginTop: 8 }}>
          Старт вручную не требуется: после <b>Prepare</b> раунд запускается автоматически по первому пересечению датчика.
        </p>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 10 }}>
        <h3>Preflight</h3>
        <p>overall: <b>{preflight?.overall ?? "pending"}</b></p>
        <ul>
          {(preflight?.steps ?? []).map((s) => (
            <li key={s.name}>
              [{s.pass ? "OK" : "FAIL"}] {s.name}: {s.message}
            </li>
          ))}
        </ul>
      </div>

      {error && <p style={{ color: "#b00020", marginTop: 12 }}>Ошибка: {error}</p>}
      <p style={{ color: "#555", marginTop: 12 }}>
        Core: {core?.service ?? "-"} ({core?.hardwareMode ?? "-"}), status={core?.status ?? "-"}
      </p>
      <p style={{ color: "#555" }}>
        Sensor reasons: {(sensor?.health.reasons ?? []).join("; ") || "-"}
      </p>
    </main>
  );
}
