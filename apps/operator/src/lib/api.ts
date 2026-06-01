import { authHeaders } from "../../../../packages/lan-client/src/runtime";
import type { Snapshot } from "./types";

async function readBody(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

async function getJSON<T>(url: string, password = ""): Promise<T> {
  const resp = await fetch(url, {
    headers: authHeaders(password),
  });
  if (!resp.ok) {
    const body = await readBody(resp);
    throw new Error(body || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: unknown, password = ""): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(password) },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await readBody(resp);
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export function createOperatorApi(baseUrl: string, password = "") {
  const base = baseUrl.replace(/\/+$/, "");

  return {
    snapshot: () =>
      Promise.all([
        getJSON(`${base}/health`, password),
        getJSON(`${base}/v1/domain/state`, password),
        getJSON(`${base}/v1/instructor/sensor-health`, password),
        getJSON(`${base}/v1/instructor/readiness`, password),
        getJSON(`${base}/v1/instructor/preflight/status`, password),
      ]).then(([core, domain, sensor, readiness, preflight]) => ({
        core,
        domain,
        sensor,
        readiness,
        preflight,
      } as Snapshot)),

    runPreflight: () => fetch(`${base}/v1/instructor/preflight/run`, { method: "POST", headers: authHeaders(password) }),

    bootstrap: (tournamentId: string, roundId: string, keyPrefix: string) =>
      postJSON(`${base}/v1/domain/bootstrap`, { tournamentId, roundId, keyPrefix }, password),

    selectRound: (tournamentId: string, roundId: string) =>
      postJSON(`${base}/v1/domain/select-round`, { tournamentId, roundId }, password),

    command: (type: string, data: Record<string, unknown>, idempotencyKey: string) =>
      postJSON(`${base}/v1/domain/command`, { type, data, idempotencyKey }, password),
  };
}
