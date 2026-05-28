export const DEFAULT_CORE_PORT = 18080;

export function isIPv4(value: string): boolean {
  const trimmed = value.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function buildCoreBaseUrl(ip: string, port = DEFAULT_CORE_PORT): string {
  return `http://${ip.trim()}:${port}`;
}

export function toRealtimeUrl(baseUrl: string, password = ""): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const prefix = trimmed.startsWith("https://")
    ? `wss://${trimmed.slice("https://".length)}`
    : trimmed.startsWith("http://")
      ? `ws://${trimmed.slice("http://".length)}`
      : `ws://${trimmed}`;
  const query = password ? `?password=${encodeURIComponent(password)}` : "";
  return `${prefix}/v1/realtime/ws${query}`;
}

export function authHeaders(password: string): Record<string, string> {
  return password ? { "X-Operator-Password": password } : {};
}

export async function checkCoreHealth(baseUrl: string, password = "", timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: controller.signal,
      headers: authHeaders(password),
    });
    if (!resp.ok) return false;
    const json = (await resp.json()) as { status?: string };
    return json.status === "ok";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
