import { useEffect, useMemo, useRef, useState } from "react";
import { createOperatorApi } from "../lib/api";
import { toWebSocketUrl, type RealtimeMessage } from "../lib/realtime";
import type { CoreHealth, DomainState, PreflightStatus, ReadinessPayload, SensorHealthPayload } from "../lib/types";

function tsKey(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function useOperatorState(baseUrl: string, password = "") {
  const api = useMemo(() => createOperatorApi(baseUrl, password), [baseUrl, password]);

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

  async function refresh() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      const s = await api.snapshot();
      setCore(s.core);
      setDomain(s.domain);
      setSensor(s.sensor);
      setReadiness(s.readiness);
      setPreflight(s.preflight);
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
      await api.runPreflight();
      await new Promise((resolve) => setTimeout(resolve, 400));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function bootstrap(tournamentId: string, roundId: string) {
    setBusy(true);
    try {
      await api.bootstrap(tournamentId, roundId, tsKey("operator-bootstrap"));
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
      await api.command(type, data, tsKey(`operator-${type}`));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function prepareRound(tournamentId: string, roundId: string) {
    setBusy(true);
    try {
      if (domain?.RoundState === "running") {
        await api.command("cancel_round", {}, tsKey("operator-cancel-before-prepare"));
      }
      await api.command("prepare_round", { tournamentId, roundId }, tsKey("operator-prepare_round"));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function selectRound(tournamentId: string, roundId: string) {
    try {
      const response = await api.selectRound(tournamentId, roundId);
      const selectedDomain = (response as { state?: DomainState }).state;
      if (selectedDomain) {
        setDomain(selectedDomain);
      } else {
        await refresh();
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    let stopped = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    const scheduleReconnect = () => {
      if (stopped || reconnectTimer != null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1000);
    };

    const connect = () => {
      try {
        ws = new WebSocket(toWebSocketUrl(baseUrl, password));
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        setError("");
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data)) as RealtimeMessage;
          setCore(msg.core);
          setDomain(msg.domain);
          setSensor(msg.sensor);
          setReadiness(msg.readiness);
          setPreflight(msg.preflight);
          setLastOkAt(new Date().toLocaleTimeString());
          setError("");
        } catch {
          // Ignore malformed payload and wait the next frame.
        }
      };
      ws.onerror = () => {
        setError("realtime unavailable");
      };
      ws.onclose = () => {
        setError("realtime disconnected");
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [api, baseUrl, password]);

  return {
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
    selectRound,
  };
}
