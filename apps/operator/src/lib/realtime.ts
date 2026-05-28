import { toRealtimeUrl } from "../../../../packages/lan-client/src/runtime";
import type { Snapshot } from "./types";

export type RealtimeMessage = Snapshot & {
  serverAt: string;
};

export function toWebSocketUrl(baseUrl: string, password = ""): string {
  return toRealtimeUrl(baseUrl, password);
}
