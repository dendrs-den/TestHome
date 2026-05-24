import type { Snapshot } from "./types";

export type RealtimeMessage = Snapshot & {
  serverAt: string;
};

export function toWebSocketUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}/v1/realtime/ws`;
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}/v1/realtime/ws`;
  }
  return `ws://${trimmed}/v1/realtime/ws`;
}

