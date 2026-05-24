import { useEffect, useMemo, useState } from "react";

type CoreHealth = {
  status: string;
  service: string;
  hardwareMode: string;
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
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json() as Promise<T>;
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://192.168.0.177:18080");
  const [core, setCore] = useState<CoreHealth | null>(null);
  const [sensor, setSensor] = useState<SensorHealthPayload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [preflight, setPreflight] = useState<PreflightStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const trimmedBase = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);

  async function refresh() {
    try {
      setError("");
      const [h, s, r, p] = await Promise.all([
        getJSON<CoreHealth>(`${trimmedBase}/health`),
        getJSON<SensorHealthPayload>(`${trimmedBase}/v1/instructor/sensor-health`),
        getJSON<ReadinessPayload>(`${trimmedBase}/v1/instructor/readiness`),
        getJSON<PreflightStatus>(`${trimmedBase}/v1/instructor/preflight/status`),
      ]);
      setCore(h);
      setSensor(s);
      setReadiness(r);
      setPreflight(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runPreflight() {
    setBusy(true);
    setError("");
    try {
      const resp = await fetch(`${trimmedBase}/v1/instructor/preflight/run`, { method: "POST" });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(body || `HTTP ${resp.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [trimmedBase]);

  return (
    <main style={{ fontFamily: "Segoe UI, sans-serif", padding: 20, maxWidth: 900 }}>
      <h1>InflightFlow: Готовность системы</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ flex: 1, padding: 8 }}
          placeholder="http://192.168.0.177:18080"
        />
        <button onClick={refresh}>Обновить</button>
        <button disabled={busy} onClick={runPreflight}>
          {busy ? "Проверка..." : "Запустить preflight"}
        </button>
      </div>
      {error && <p style={{ color: "#b00020" }}>Ошибка: {error}</p>}
      <pre>{JSON.stringify({ core, sensor, readiness, preflight }, null, 2)}</pre>
    </main>
  );
}
