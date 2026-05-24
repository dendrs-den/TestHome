import { useEffect, useMemo, useRef, useState } from "react";

type CoreHealth = {
  status: string;
  service: string;
  hardwareMode: string;
};

type DomainState = {
  TournamentID: string;
  RoundID: string;
  RoundState: "idle" | "prepared" | "running" | "completed" | "cancelled";
  Crossings: number;
  RoundResultMs: number;
};

type SensorHealthPayload = {
  enabled: boolean;
  health: {
    level: "OK" | "WARNING" | "CRITICAL";
    action: "NONE" | "CHECK_WIRING" | "RESTART_SENSOR" | "HOLD_START";
    reasons: string[];
  };
};

type ReadinessPayload = {
  canStartRound: boolean;
  health: SensorHealthPayload["health"];
};

type PreflightStep = {
  name: string;
  pass: boolean;
  message: string;
};

type PreflightStatus = {
  running: boolean;
  overall: "pending" | "pass" | "fail";
  steps: PreflightStep[];
};

async function getJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(body || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

function tsKey(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://192.168.0.177:18080");
  const [tournamentId, setTournamentId] = useState("event-main");
  const [roundId, setRoundId] = useState(`round-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}`);

  const [core, setCore] = useState<CoreHealth | null>(null);
  const [domain, setDomain] = useState<DomainState | null>(null);
  const [sensor, setSensor] = useState<SensorHealthPayload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [preflight, setPreflight] = useState<PreflightStatus | null>(null);

  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastOkAt, setLastOkAt] = useState("");

  const inFlightRef = useRef(false);
  const trimmedBase = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);

  async function refresh() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      const [h, d, s, r, p] = await Promise.all([
        getJSON<CoreHealth>(`${trimmedBase}/health`),
        getJSON<DomainState>(`${trimmedBase}/v1/domain/state`),
        getJSON<SensorHealthPayload>(`${trimmedBase}/v1/instructor/sensor-health`),
        getJSON<ReadinessPayload>(`${trimmedBase}/v1/instructor/readiness`),
        getJSON<PreflightStatus>(`${trimmedBase}/v1/instructor/preflight/status`),
      ]);
      setCore(h);
      setDomain(d);
      setSensor(s);
      setReadiness(r);
      setPreflight(p);
      setError("");
      setLastOkAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlightRef.current = false;
      setRefreshing(false);
    }
  }

  async function runPreflight() {
    setBusy(true);
    try {
      await fetch(`${trimmedBase}/v1/instructor/preflight/run`, { method: "POST" });
      await new Promise((resolve) => setTimeout(resolve, 400));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function bootstrap() {
    setBusy(true);
    try {
      await postJSON(`${trimmedBase}/v1/domain/bootstrap`, {
        tournamentId,
        roundId,
        keyPrefix: tsKey("operator-bootstrap"),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCommand(type: string, data: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await postJSON(`${trimmedBase}/v1/domain/command`, {
        type,
        data,
        idempotencyKey: tsKey(`operator-${type}`),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [trimmedBase]);

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
          <button disabled={busy} onClick={bootstrap}>Bootstrap</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={busy} onClick={() => sendCommand("prepare_round", { roundId })}>Prepare</button>
          <button disabled={busy} onClick={() => sendCommand("start_round")}>Start</button>
          <button disabled={busy} onClick={() => sendCommand("finish_round")}>Finish</button>
          <button disabled={busy} onClick={() => sendCommand("cancel_round")}>Cancel</button>
        </div>
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
