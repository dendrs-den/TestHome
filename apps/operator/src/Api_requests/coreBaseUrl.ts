import {
  authHeaders,
  buildCoreBaseUrl,
  checkCoreHealth,
  DEFAULT_CORE_PORT,
} from "../../../../packages/lan-client/src/runtime";

export const OPERATOR_SERVER_IP_KEY = "inflightflow.core.ip.operator";
export const OPERATOR_SERVER_PASSWORD_KEY = "inflightflow.core.password.operator";

function runtimeDefaultIp(): string {
  if (typeof window === "undefined") {
    return "127.0.0.1";
  }
  return window.location.hostname || "127.0.0.1";
}

export function getOperatorServerIp(): string {
  if (typeof window === "undefined") {
    return runtimeDefaultIp();
  }
  const stored = window.localStorage.getItem(OPERATOR_SERVER_IP_KEY)?.trim();
  return stored || runtimeDefaultIp();
}

export function getOperatorServerPassword(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(OPERATOR_SERVER_PASSWORD_KEY) || "";
}

export function operatorJsonHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    ...authHeaders(getOperatorServerPassword()),
    ...extraHeaders,
  };
}

export async function verifyOperatorCoreConnection(
  ip = getOperatorServerIp(),
  password = getOperatorServerPassword()
) {
  return checkCoreHealth(buildCoreBaseUrl(ip, DEFAULT_CORE_PORT), password);
}

const coreBaseUrl = buildCoreBaseUrl(getOperatorServerIp(), DEFAULT_CORE_PORT);

export default coreBaseUrl;
